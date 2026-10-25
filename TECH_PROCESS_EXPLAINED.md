# Virtual Movie Room --- Complete Technical Architecture Deep Dive 🧠

An in-depth explanation of how **Virtual Movie Room** works from user click to browser playback, covering real-time networking, synchronization mathematics, WebRTC peer-to-peer streaming, and security hardening.

---

## 1. System Overview & Monorepo Layout

Virtual Movie Room uses a hybrid client-server and peer-to-peer architecture:

- **Frontend (Client)**: React 19 + TypeScript + Vite + Tailwind CSS.
- **Backend (Server)**: Node.js + TypeScript + native WebSocket (`ws`).
- **Shared Core**: Shared domain models, contracts, and sanitizers (`@virtual-movie-room/shared`).
- **Media Delivery**: Browser-direct media fetching, sandboxed iframes, and WebRTC P2P streaming.

```
Internet (HTTPS & WSS)
         |
   Back4App Cloud (Docker Container)
  [Single Port 7860]
  ├── /health             -> HTTP Health Check Probe
  ├── /api/rooms/:id/info -> HTTP Room Metadata
  ├── /ws (Root)          -> Persistent WebSocket Hub
  └── /*                  -> Static React SPA with SPA Routing Fallback
         |
         +---------------------------------------+
         |                                       |
         v                                       v
   Host Browser                           Guest Browser
   (Authoritative Clock)                  (Drift Compensated)
         |                                       |
         +=========== WebRTC P2P Stream =========+
                    (Screen & Tab Share)
```

---

## 2. Real-Time Networking: WebSocket Wire Protocol

All real-time coordination (room creation, joins, chat messages, playback commands, and WebRTC signaling) flows through a persistent, low-overhead WebSocket connection using typed JSON envelopes:

```ts
interface EventEnvelope<T = any> {
  type: string;
  payload: T;
  timestamp?: number;
}
```

### Key Event Catalog:
- `room:create` / `room:join` / `room:joined`: Instant guest authentication and room hydration.
- `media:set-source`: Host loads a new media URL (MP4, WebM, or website).
- `playback:play` / `playback:pause` / `playback:seek`: Playback state changes broadcast to all peers.
- `playback:heartbeat`: Periodic pulse (every 2.5s) from the host containing `{ positionSeconds, updatedAt, status, revision }`.
- `chat:message`: Sanitized text messages stored in an ephemeral 50-message ring buffer.
- `webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate`: Point-to-point signaling messages routed directly between participants for screen sharing.

---

## 3. Sub-Second Synchronization & Drift Compensation

Rather than constantly seeking (which causes audible clicks and video stutter), Virtual Movie Room uses **Smooth Three-Tier Drift Compensation**:

### The Drift Formula:
When a guest receives a `playback:state` update or host heartbeat:
$$\text{elapsed} = \frac{\text{Date.now()} - \text{state.updatedAt}}{1000}$$
$$\text{targetTime} = \text{state.positionSeconds} + \text{elapsed}$$
$$\Delta = \text{videoElement.currentTime} - \text{targetTime}$$

### Three-Tier Correction Policy:
1. **$|\Delta| < 0.5\text{s}$ (Jitter Tolerance)**:
   - Within acceptable network latency variance.
   - `video.playbackRate = 1.0` (plays naturally, zero user interruption).
2. **$0.5\text{s} \le |\Delta| \le 2.0\text{s}$ (Micro-Drift Compensation)**:
   - If guest is slightly behind ($\Delta < 0$): `video.playbackRate = 1.06`.
   - If guest is slightly ahead ($\Delta > 0$): `video.playbackRate = 0.94`.
   - The video catches up or slows down smoothly over 2–4 seconds without buffering pauses or audio distortion.
3. **$|\Delta| > 2.0\text{s}$ (Macro-Drift or Explicit Seek)**:
   - Instant seek: `video.currentTime = targetTime`.
   - `video.playbackRate = 1.0`.

### Monotonic Revisions:
Every playback mutation increments an integer `revision` counter on the server. If a network packet is delayed and arrives out of order, the client compares `event.revision <= currentRevision` and drops stale events immediately.

---

## 4. WebRTC Peer-to-Peer Mesh (Screen & Tab Share)

When watching third-party content where direct embedding is blocked, participants can stream their browser tab or desktop application with zero media server cost:

```
Sharer                                WebSocket Relay                            Viewer
  |                                          |                                     |
  |--- 1. getDisplayMedia() ---------------->|                                     |
  |--- 2. webrtc:offer (SDP) --------------->|--- 3. webrtc:offer (SDP) ---------->|
  |                                          |<-- 4. webrtc:answer (SDP) ----------|
  |<-- 5. webrtc:answer (SDP) ---------------|                                     |
  |--- 6. webrtc:ice-candidate ------------->|--- 7. webrtc:ice-candidate -------->|
  |                                          |                                     |
  |======================= Direct P2P Media Stream (STUN) ========================>|
  |                                          |                                     |
  |--- 8. track.onended / sharing:stop ----->|--- 9. sharing:stopped -------------->|
```

- **Consent Enforcement**: Capture requires an active user gesture triggering `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`.
- **Zero Video Bandwidth on Backend**: The server transmits only the tiny SDP text descriptions. Video packets stream directly between user machines over UDP.
- **STUN Traversal**: Google STUN servers (`stun:stun.l.google.com:19302`) resolve NAT addresses for direct connections.

---

## 5. Security & SSRF Immunity

- **SSRF Immunity**: The backend server **never** downloads, fetches, or scrapes user-submitted URLs. Link validation and video rendering take place strictly inside the user's browser sandbox.
- **XSS Sanitization**: All display names and chat messages pass through an HTML entity encoder (converting `&`, `<`, `>`, `"`, `'`, `/` to safe entities) before broadcast.
- **Ephemeral Memory**: Room records and chat history reside in volatile server memory with an automatic 2-hour inactivity cleanup sweep. Zero user tracking or persistent logs.

---

## 6. Single-Port Unified Production Architecture

In production, Node.js serves both static client assets and WebSocket traffic over a single port (`7860`):
- Single SSL certificate.
- Zero CORS pre-flight bottlenecks.
- Packaged inside a secure, multi-stage Alpine Docker container running as a non-root `node` user.
