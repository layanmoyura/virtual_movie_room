# Virtual Movie Room --- API & WebSocket Protocol Specification

This document defines the WebSocket message formats, event names, payload schemas, error codes, and HTTP endpoints for the **Virtual Movie Room** platform.

---

## 1. Transport & Wire Format

All WebSocket communications use text frames encoded with JSON. Every event adheres to the standard envelope:

```ts
interface EventEnvelope<T = any> {
  type: string;
  payload: T;
  timestamp?: number;
}
```

---

## 2. Client-to-Server Events (`C -> S`)

### `room:create`
Sent when a user clicks **Create Room**.
```json
{
  "type": "room:create",
  "payload": {
    "displayName": "VelvetFox" // Optional, default generated if omitted
  }
}
```

### `room:join`
Sent when a participant joins a room using a room ID or 6-char code.
```json
{
  "type": "room:join",
  "payload": {
    "roomIdOrCode": "MV-7K2X",
    "displayName": "CyberPanda" // Optional
  }
}
```

### `participant:update-name`
Sent when a participant changes their display name.
```json
{
  "type": "participant:update-name",
  "payload": {
    "displayName": "MovieBuff99"
  }
}
```

### `room:update-settings`
Sent by the host to change room settings.
```json
{
  "type": "room:update-settings",
  "payload": {
    "allowGuestControl": false, // If false, only host can play/pause/seek
    "locked": false             // If true, new guests cannot join
  }
}
```

### `media:set-source`
Sent when a user submits a validated media URL.
```json
{
  "type": "media:set-source",
  "payload": {
    "sourceUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "mode": "direct-video" // "direct-video" | "official-embed" | "manual-sync"
  }
}
```

### `playback:play`
Instructs playback to start or resume from a specific timestamp.
```json
{
  "type": "playback:play",
  "payload": {
    "positionSeconds": 42.5
  }
}
```

### `playback:pause`
Instructs playback to pause at a specific timestamp.
```json
{
  "type": "playback:pause",
  "payload": {
    "positionSeconds": 42.5
  }
}
```

### `playback:seek`
Instructs players to seek to a new timestamp.
```json
{
  "type": "playback:seek",
  "payload": {
    "positionSeconds": 120.0
  }
}
```

### `playback:heartbeat`
Sent periodically (every 2–3s) by the host while playing to keep participants aligned.
```json
{
  "type": "playback:heartbeat",
  "payload": {
    "positionSeconds": 45.2
  }
}
```

### `chat:message`
Sends a room chat message.
```json
{
  "type": "chat:message",
  "payload": {
    "text": "Check out that scene!"
  }
}
```

### `sharing:start` & `sharing:stop`
Announces the start or end of browser tab / screen sharing.
```json
{ "type": "sharing:start", "payload": {} }
{ "type": "sharing:stop", "payload": {} }
```

### `webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate`
P2P signaling relay for WebRTC media streams.
```json
{
  "type": "webrtc:offer",
  "payload": {
    "targetParticipantId": "p-guest-456",
    "sdp": { "type": "offer", "sdp": "..." }
  }
}
```

### `room:end`
Sent by the host to terminate the room for all participants.
```json
{ "type": "room:end", "payload": {} }
```

---

## 3. Server-to-Client Events (`S -> C`)

### `room:joined`
Emitted immediately to the connecting client upon successful room join/creation.
```json
{
  "type": "room:joined",
  "payload": {
    "selfParticipantId": "p-user-123",
    "room": {
      "roomId": "k9z1m8w2px",
      "roomCode": "MV-7K2X",
      "hostParticipantId": "p-user-123",
      "allowGuestControl": false,
      "locked": false,
      "participants": [
        {
          "participantId": "p-user-123",
          "displayName": "VelvetFox",
          "role": "host"
        }
      ],
      "playbackState": {
        "mode": "direct-video",
        "sourceUrl": null,
        "status": "paused",
        "positionSeconds": 0,
        "updatedAt": 1792948000000,
        "revision": 1
      },
      "chatHistory": []
    }
  }
}
```

### `participant:joined`
Broadcast to all room members when a new participant connects.
```json
{
  "type": "participant:joined",
  "payload": {
    "participant": {
      "participantId": "p-guest-456",
      "displayName": "CyberPanda",
      "role": "guest"
    }
  }
}
```

### `participant:left`
Broadcast when a participant leaves.
```json
{
  "type": "participant:left",
  "payload": {
    "participantId": "p-guest-456",
    "newHostParticipantId": "p-user-789" // Present if host transferred
  }
}
```

### `playback:state`
Broadcast whenever playback status, position, or revision changes.
```json
{
  "type": "playback:state",
  "payload": {
    "mode": "direct-video",
    "sourceUrl": "https://example.com/movie.mp4",
    "status": "playing",
    "positionSeconds": 45.2,
    "updatedAt": 1792948005000,
    "revision": 3
  }
}
```

### `chat:message`
Broadcast when a valid chat message is accepted.
```json
{
  "type": "chat:message",
  "payload": {
    "id": "msg-99",
    "participantId": "p-user-123",
    "displayName": "VelvetFox",
    "text": "Check out that scene!",
    "timestamp": 1792948005500
  }
}
```

### `error`
Sent when an action is rejected.
```json
{
  "type": "error",
  "payload": {
    "code": "AUTH_FORBIDDEN",
    "message": "Only the host can adjust playback controls."
  }
}
```

---

## 4. Standard Error Codes

| Error Code | HTTP/WS Context | Meaning |
| :--- | :--- | :--- |
| `ROOM_NOT_FOUND` | 404 | Room ID or 6-char code does not exist or has expired. |
| `ROOM_LOCKED` | 403 | The host has locked the room to new participants. |
| `ROOM_FULL` | 403 | Room has reached maximum participant capacity (default: 20). |
| `AUTH_FORBIDDEN` | 403 | Non-host attempted a host-only command. |
| `RATE_LIMITED` | 429 | Action throttled due to exceeding rate limit. |
| `INVALID_URL` | 400 | URL scheme is invalid, insecure, or exceeds maximum length. |
| `PAYLOAD_TOO_LARGE` | 413 | Message exceeds 500 characters or frame exceeds 64 KB. |
| `ROOM_EXPIRED` | 4010 | The room expired after 2 hours of inactivity. |

---

## 5. HTTP Endpoints

### `GET /health`
Returns health status and active room count.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "uptimeSeconds": 1420,
  "activeRooms": 3,
  "timestamp": 1792948000000
}
```

### `GET /api/rooms/:roomIdOrCode/info`
Checks if a room exists before establishing WebSocket connection.
- **Response**: `200 OK`
```json
{
  "exists": true,
  "locked": false,
  "participantCount": 4
}
```
- **Error**: `404 Not Found` if room does not exist.
