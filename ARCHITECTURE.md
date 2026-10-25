# Virtual Movie Room --- Architecture & System Design

This document details the software architecture, state models, synchronization protocols, and component breakdown for the **Virtual Movie Room** watch-party platform.

---

## 1. System Overview

Virtual Movie Room uses a hybrid client-server and peer-to-peer architecture:
- **WebSocket Central Hub**: Provides real-time synchronization of room state, presence, chat, and playback controls.
- **WebRTC P2P Mesh**: Delivers low-latency screen and browser-tab streaming directly between participants, using the WebSocket server only as a signaling relay.
- **Client-Side Media Execution**: URL parsing, validation, and media rendering occur entirely in the client's browser, preventing backend SSRF vulnerabilities.

```
                           +---------------------------+
                           |     WebSocket Server      |
                           |  (Node.js + TypeScript)   |
                           +-------------+-------------+
                                         ^
                 WebSocket JSON Events   |   Heartbeat & Presence
                                         v
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+------------------+         WebRTC P2P Video/Audio Stream       +------------------+
|   Client 1       |<===========================================>|   Client 2       |
|  (Host / Viewer) |                                             |  (Guest Viewer)  |
+------------------+                                             +------------------+
         |                                                               |
         v                                                               v
   Direct HTML5 /                                                  Direct HTML5 /
  Embed / WebRTC                                                  Embed / WebRTC
```

---

## 2. Core Data Models

### 2.1 Room Model
```ts
export interface Room {
  roomId: string;                 // Unguessable 10-char alphanumeric string (nanoid)
  roomCode: string;               // Human-friendly 6-char code (e.g. "MV-7K2X")
  hostParticipantId: string;      // ID of current room host
  createdAt: number;              // Timestamp (epoch ms)
  lastActivityAt: number;         // Timestamp of latest interaction (epoch ms)
  expiresAt: number;              // Absolute expiry timestamp (2 hours of inactivity)
  locked: boolean;                // Prevent new guests from joining when true
  allowGuestControl: boolean;     // False = host-only control; True = anyone can control
  maxParticipants: number;        // Room capacity limit (default: 20)
  participants: Map<string, Participant>;
  playbackState: PlaybackState;
  activeSharingParticipantId?: string; // ID of participant currently sharing screen
}
```

### 2.2 Participant Model
```ts
export type ParticipantRole = "host" | "guest";

export interface Participant {
  participantId: string;          // Ephemeral UUID generated on connection
  displayName: string;            // Default randomized guest name or user-customized
  role: ParticipantRole;          // "host" or "guest"
  joinedAt: number;               // Timestamp (epoch ms)
  connectionState: "connected" | "reconnecting" | "disconnected";
  mutedByLocalUsers: boolean;     // Client-side mute flag
}
```

### 2.3 PlaybackState Model
```ts
export type PlaybackMode = "direct-video" | "official-embed" | "manual-sync" | "shared-tab";
export type PlaybackStatus = "playing" | "paused" | "loading" | "error";

export interface PlaybackState {
  mode: PlaybackMode;
  sourceUrl?: string;             // Validated media or page URL
  status: PlaybackStatus;
  positionSeconds: number;        // Media position in seconds
  updatedAt: number;              // Epoch timestamp when position was recorded
  revision: number;               // Monotonically increasing version counter
}
```

### 2.4 ChatMessage Model
```ts
export interface ChatMessage {
  id: string;                     // Unique message ID
  participantId: string;
  displayName: string;
  text: string;                   // Sanitized text string (max 500 chars)
  timestamp: number;              // Epoch ms
  isSystem?: boolean;             // True for join/leave notifications
}
```

---

## 3. Playback Synchronization Protocol

### 3.1 Host-Authoritative Clock
- The **Host** maintains authority over room playback by default.
- If `allowGuestControl` is set to `false`, non-host playback commands (`playback:play`, `playback:pause`, `playback:seek`, `media:set-source`) are rejected by the server with `AUTH_FORBIDDEN`.
- Every playback state mutation increments `revision`. Stale events with `revision <= currentRevision` are rejected to avoid race conditions.

### 3.2 Drift Calculation & Compensation
When a participant receives a `playback:state` update, the client calculates estimated playback drift relative to the host:

$$\Delta = \text{guestCurrentTime} - \left( \text{state.positionSeconds} + \frac{\text{Date.now()} - \text{state.updatedAt}}{1000} \times \text{playbackRate} \right)$$

#### Drift Correction Algorithm:
```ts
function applyDriftCorrection(videoElement: HTMLVideoElement, hostState: PlaybackState) {
  if (hostState.status !== "playing") {
    if (!videoElement.paused) videoElement.pause();
    videoElement.currentTime = hostState.positionSeconds;
    return;
  }

  const elapsedSeconds = (Date.now() - hostState.updatedAt) / 1000;
  const targetTime = hostState.positionSeconds + elapsedSeconds;
  const drift = Math.abs(videoElement.currentTime - targetTime);

  if (drift < 0.5) {
    // Normal: Within acceptable jitter threshold, no action needed
    videoElement.playbackRate = 1.0;
  } else if (drift <= 2.0) {
    // Micro-Drift: Adjust playback speed smoothly without jarring seeks
    if (videoElement.currentTime < targetTime) {
      videoElement.playbackRate = 1.06; // Catch up subtly
    } else {
      videoElement.playbackRate = 0.94; // Slow down subtly
    }
  } else {
    // Macro-Drift (>2.0 seconds) or user seek: Perform instant seek
    videoElement.currentTime = targetTime;
    videoElement.playbackRate = 1.0;
  }

  if (videoElement.paused) {
    videoElement.play().catch(() => {
      // Autoplay blocked: trigger "Click to join audio" user gesture
    });
  }
}
```

---

## 4. WebRTC Screen & Tab Sharing Protocol

Screen sharing allows participants to stream any desktop application or browser tab when third-party video services forbid iframe embedding.

### 4.1 Signaling Flow
```
Sharer (Peer A)                  WebSocket Server               Viewer (Peer B)
      |                                 |                              |
      |--- 1. getDisplayMedia() ------->|                              |
      |--- 2. webrtc:offer ------------>|--- 3. webrtc:offer --------->|
      |                                 |<-- 4. webrtc:answer ---------|
      |<-- 5. webrtc:answer ------------|                              |
      |                                 |                              |
      |--- 6. webrtc:ice-candidate ---->|--- 7. webrtc:ice-candidate ->|
      |<-- 9. webrtc:ice-candidate -----|<-- 8. webrtc:ice-candidate --|
      |                                 |                              |
      |================= Direct P2P Media Stream =====================>|
      |                                 |                              |
      |--- 10. sharing:stopped -------->|--- 11. sharing:stopped ----->|
```

1. **User Gesture & Consent**: Sharer clicks "Share Tab/Screen", triggering browser's native `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`.
2. **Offer Creation**: Sharer creates WebRTC `RTCPeerConnection`, creates an SDP offer, and sends it to the server.
3. **Signaling Relay**: The server broadcasts `webrtc:offer` tagged with the target viewer's `participantId`.
4. **Answer Generation**: Viewers receive the offer, create a peer connection, set remote description, create an SDP answer, and return it.
5. **ICE Exchange**: ICE candidates are exchanged asynchronously.
6. **Direct P2P Stream**: Video and audio flow directly peer-to-peer.
7. **Clean Teardown**: When the user stops sharing in the UI or closes the browser tab, `track.onended` emits `sharing:stopped`, immediately returning all viewers to the normal room view.

---

## 5. Lifecycle & Room Garbage Collection

1. **Inactivity Timer**: Every room tracks `lastActivityAt`. Every interaction (chat message, play/pause, seek, participant join/leave) resets this timestamp.
2. **2-Hour Auto-Expiry**: A server-side sweep interval runs every 60 seconds. Any room where `now - lastActivityAt > 2 hours` is terminated:
   - All active WebSocket connections are sent a `room:expired` notification.
   - Sockets are cleanly closed with code `4001` (Room Expired).
   - In-memory room maps and chat buffers are released for garbage collection.
3. **Host Succession**:
   - If the host leaves or disconnects, the server automatically promotes the earliest-joined connected guest to the new host.
   - The room is notified via `participant:update`.
   - If all participants leave, the room enters a 10-minute grace period before early deletion.

---

## 6. Frontend Component Hierarchy

```
App
├── HomeView
│   ├── HeroSection
│   ├── CreateRoomCard
│   ├── JoinRoomCard
│   └── SupportedModesBadges
│
└── RoomView
    ├── RoomHeader
    │   ├── RoomCodeBadge (1-click copy)
    │   ├── ParticipantCounter
    │   ├── ExpiryCountdown
    │   └── HostBadge
    │
    ├── TheaterStage
    │   ├── DirectVideoPlayer (HTML5 + Dark Controls)
    │   ├── GenericEmbedPlayer (Safe Iframe)
    │   ├── BlockedSiteFallback (Manual sync cues & options)
    │   └── ScreenSharePlayer (WebRTC stream view)
    │
    ├── PlaybackControlBar
    │   ├── MediaUrlInput ("Paste media link")
    │   ├── ModeIndicatorBadge
    │   ├── PlayButton
    │   ├── ResyncButton
    │   └── ScreenShareButton
    │
    └── CollapsibleSidebar
        ├── ParticipantsTab (Guest list, Host indicator, Rename modal)
        ├── ChatTab (Message history, Input bar, Rate limiter)
        └── RoomSettingsTab (Host-only control toggle, Lock room, End room)
```
