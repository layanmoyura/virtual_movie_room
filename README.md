# Virtual Movie Room 🎬🍿

[![GitHub Repo](https://img.shields.io/badge/GitHub-layanmoyura%2Fvirtual__movie__room-blue?logo=github)](https://github.com/layanmoyura/virtual_movie_room)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/layanmoyura/virtual_movie_room)

A lightweight, no-login, ephemeral watch-party web application. Users can create temporary rooms, share invite links or short codes, paste media URLs, and watch together using synchronized playback modes, room chat, and browser-tab sharing.

---

## 🌟 Key Highlights

- **Zero Authentication**: No email, passwords, phone numbers, or social accounts. Instant temporary guest identity.
- **Unguessable Rooms & Short Codes**: Secure URL paths (`/room/:roomId`) combined with easy-to-read 6-character room codes (`MV-XXXX`).
- **Honest Playback Modes**:
  - `direct-video`: Synchronized native HTML5 `<video>` player for direct media files (.mp4, .webm, .ogg, etc.) with custom dark cinema controls.
  - `official-embed`: Permitted iframe-based embedded web players with graceful fallback.
  - `manual-sync`: Synchronized countdown timers and cues for DRM or frame-protected sites (e.g., Netflix, general web pages) with "Open in New Tab" and sync guides.
  - `shared-tab`: WebRTC peer-to-peer screen or browser-tab capture with explicit user permissions and a persistent sharing indicator.
- **Host-Authoritative Synchronization**:
  - Host controls playback by default (play, pause, seek, media URL).
  - In-room toggle allows the host to switch between **Host-only control** and **Anyone can control**.
  - Clock synchronization with versioned revisions, subtle drift correction (0.5s–2.0s drift corrected via smooth playback rate adjustments), and manual resync button.
- **Ephemeral Room Chat**: Real-time room chat with guest tags, timestamps, sanitization, length limits, and client-side mute.
- **Privacy & Security First**: Zero server-side proxying of arbitrary URLs (SSRF prevention), XSS sanitization, 2-hour inactivity cleanup, and explicit WebRTC capture consent.

---

## 📁 Repository Structure

```
virtual_movie_room/
├── client/                      # Frontend Application (React + Vite + Tailwind CSS)
│   ├── public/                  # Static assets & icons
│   ├── src/
│   │   ├── components/          # UI components (Theater Stage, Controls, Chat, Modals)
│   │   ├── hooks/               # useWebSocket, usePlaybackSync, useScreenShare
│   │   ├── services/            # WebRTC signaling, audio/video handling
│   │   ├── styles/              # Dark cinema theme styles & Tailwind config
│   │   ├── App.tsx              # Root component & view routing
│   │   └── main.tsx             # Entry point
│   └── package.json
│
├── server/                      # Backend WebSocket & HTTP Service (Node.js + TypeScript)
│   ├── src/
│   │   ├── managers/            # RoomManager, PlaybackSyncManager, ChatManager
│   │   ├── signaling/           # WebRTC P2P signaling broker
│   │   ├── ws/                  # WebSocket connection handler & event dispatcher
│   │   └── index.ts             # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                      # Shared Code & Types (Universal)
│   ├── types.ts                 # Room, Participant, PlaybackState, WS event definitions
│   ├── constants.ts             # Default settings, limits, timeouts
│   └── url-validator.ts         # Safe URL classifier & sanitization
│
├── README.md                    # Project overview & guide
├── ARCHITECTURE.md              # Technical design, data models & sync protocol
├── SECURITY.md                  # SSRF, XSS, rate limiting & privacy specifications
├── API_SPEC.md                  # WebSocket event catalog & REST schemas
├── DEVELOPMENT_ROADMAP.md       # Task breakdown & progress tracker
└── virtual_movie_room_requirements_updated.md # Upstream product requirements
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ or v24+)
- npm or pnpm

### Installation & Setup

1. Install root & workspace dependencies:
   ```bash
   npm install
   ```

2. Start development servers (Frontend + Backend concurrently):
   ```bash
   npm run dev
   ```

3. Open your browser:
   - Frontend UI: `http://localhost:5173`
   - WebSocket / Backend API: `http://localhost:3001`

---

## 🎭 Playback Modes & Platform Support

| Playback Mode | Supported Media | Capabilities |
| :--- | :--- | :--- |
| **Direct Media** (`direct-video`) | Direct `.mp4`, `.webm`, `.ogg`, `.mov` URLs | Fully synchronized play, pause, seek, volume, drift auto-adjustment. |
| **Permitted Embed** (`official-embed`) | Sites permitting iframe embedding | Iframe display with synchronized play/pause. |
| **Manual Sync** (`manual-sync`) | Sites blocking embedding (`X-Frame-Options` / CSP) | Countdown cue ("Ready? Playing in 3, 2, 1..."), open-in-new-tab, timestamp sync. |
| **Screen / Tab Share** (`shared-tab`) | Any tab, application, or desktop screen | Low-latency WebRTC P2P video stream with system audio capture. |

---

## 🔒 Security Summary

- **SSRF Immunity**: The backend server does not fetch or proxy user-submitted URLs. All classification and playback happen strictly client-side.
- **XSS Prevention**: Display names and chat messages are sanitized against HTML tags and script injection.
- **Zero Account Data**: Rooms and participant sessions are purely ephemeral and stored in-memory with automatic 2-hour inactivity cleanup.
- **Explicit Permission**: Screen sharing requires an active user gesture and native browser permission (`getDisplayMedia()`).

For more details, see [SECURITY.md](file:///c:/Users/acer/Downloads/virtual_movie_room/SECURITY.md).

---

## 📖 Further Documentation

- [TECH_PROCESS_EXPLAINED.md](file:///c:/Users/acer/Downloads/virtual_movie_room/TECH_PROCESS_EXPLAINED.md) - Complete end-to-end technical architecture & sync mathematics guide.
- [NO_CARD_HOSTING_GUIDE.md](file:///c:/Users/acer/Downloads/virtual_movie_room/NO_CARD_HOSTING_GUIDE.md) - 100% Free hosting on Back4App Containers & Zeabur.
- [FREE_HOSTING_GUIDE.md](file:///c:/Users/acer/Downloads/virtual_movie_room/FREE_HOSTING_GUIDE.md) - Step-by-step guide to hosting on Render.
- [ARCHITECTURE.md](file:///c:/Users/acer/Downloads/virtual_movie_room/ARCHITECTURE.md) - System architecture, state machine, and sync algorithm.
- [API_SPEC.md](file:///c:/Users/acer/Downloads/virtual_movie_room/API_SPEC.md) - Complete WebSocket message protocol and payload specifications.
- [SECURITY.md](file:///c:/Users/acer/Downloads/virtual_movie_room/SECURITY.md) - Threat model, rate limiting, and defensive measures.
- [DEVELOPMENT_ROADMAP.md](file:///c:/Users/acer/Downloads/virtual_movie_room/DEVELOPMENT_ROADMAP.md) - Milestone progress and task tracking.
