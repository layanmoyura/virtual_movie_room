# Virtual Movie Room --- Updated Product Requirements

## 1. Overview

**Virtual Movie Room** is a no-login watch-party web app. Users can
create temporary rooms, share a room link, paste a browser/media URL,
and watch together using a supported playback mode.

The product should make it easy to try a link and play media, while
being honest about browser and streaming-service restrictions.

**Authentication:** None. No accounts, emails, passwords, or social
login.

## 2. Main User Experience

1.  Open the app.
2.  Select **Create Room** or **Join Room**.
3.  A host creates a temporary room and copies its invite link.
4.  Participants join as guests with a generated name or a chosen
    display name.
5.  The host pastes a media or website URL into **Browser Link & Play**.
6.  The app detects the supported playback mode and explains any
    restrictions.
7.  Participants watch using the same supported player, an approved
    embedded player, manual synchronization, or explicit browser-tab
    sharing.
8.  The room expires after inactivity or the host ends it.

## 3. Core Requirements

### FR-01: No-login guest rooms

-   Do not require registration or sign-in.
-   Generate a temporary participant ID and a random guest display name.
-   Allow users to edit their display name.
-   Generate an unguessable room ID and a short join code.
-   Provide a shareable room URL.
-   Expire rooms after 2 hours of inactivity by default.
-   Rate-limit room creation and joining to prevent abuse.

### FR-02: Paste URL and play

-   Provide a prominent URL input labeled **Paste a media or website
    link**.
-   Include a **Play** button and validate the URL before loading it.
-   Accept HTTPS URLs by default.
-   Identify the URL as one of these modes:
    1.  Direct media file.
    2.  Supported embedded player.
    3.  Website that may block embedding.
    4.  Unsupported or unrecognized source.
-   Display the selected mode and a clear error or fallback if playback
    cannot start.
-   Never claim playback is successful until the player confirms it.
-   Do not fetch arbitrary URLs on the backend without SSRF protections.
    Prefer client-side loading and strict URL validation.

### FR-03: Direct video playback

-   Support direct media URLs that return browser-compatible video
    formats such as MP4 or WebM.
-   Use the HTML `<video>` element with native controls.
-   Support play, pause, seek, volume, captions when provided by the
    source, and fullscreen where available.
-   Handle loading, buffering, autoplay restrictions, invalid formats,
    CORS issues, and unavailable URLs.
-   Do not download or permanently store the media by default.
-   Cross-origin hosting may prevent some advanced operations even if
    the video itself plays.

Example UI implementation:

``` html
<video id="player" controls playsinline preload="metadata">
  Your browser does not support HTML video.
</video>

<script>
  const player = document.getElementById("player");

  function playDirectMedia(rawUrl) {
    const url = new URL(rawUrl);

    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("Use an HTTPS media URL.");
    }

    player.src = url.href;
    player.load();
    player.play().catch(() => {
      // Autoplay may require a user gesture. Keep native controls visible.
    });
  }
</script>
```

This is a minimal example, not a complete production URL-security
validator. A production app must also prevent unsafe schemes, validate
input lengths, and handle errors.

### FR-04: Website embedding

-   Attempt to embed a website only when its owner and browser security
    policy permit it.
-   Use official embed URLs or player SDKs where available.
-   Some sites send `X-Frame-Options` or Content Security Policy
    `frame-ancestors` headers that block embedding.
-   Do not proxy or rewrite a site's headers to bypass its restrictions.
-   When embedding fails, show **This site cannot be embedded here**
    with options to:
    -   Open the source in a new tab.
    -   Use manual synchronization.
    -   Share a browser tab or screen with explicit browser permission.
-   Do not represent an ordinary iframe as capable of controlling every
    third-party media player.

### FR-05: Supported streaming platforms

-   Use official embed/player APIs where available and allowed by the
    provider.
-   Do not scrape authentication cookies, session tokens, or private
    browser storage.
-   Do not bypass DRM, paywalls, access controls, regional restrictions,
    or provider terms.
-   DRM-protected content may not be capturable or playable inside the
    app.
-   Clearly explain when the source is unsupported.

### FR-06: Browser-tab or screen sharing

-   Offer a **Share Browser Tab** or **Share Screen** button.
-   Use the browser's explicit screen-capture permission flow, such as
    `getDisplayMedia()` where supported.
-   Let the user select the tab or screen in the browser's own picker.
-   Show a persistent sharing indicator and a prominent **Stop Sharing**
    control.
-   Never attempt silent capture.
-   Some browsers, mobile devices, and protected video services may
    limit or block capture.
-   Use WebRTC to transmit a shared stream only after users explicitly
    grant the required permission.

### FR-07: Playback synchronization

-   Synchronize play, pause, seek, and playback position for compatible
    players.
-   Treat the host as the default playback authority.
-   Broadcast versioned playback events through WebSockets.
-   Detect stale events and reconnecting participants.
-   Provide a manual **Resync** action.
-   Correct small timing drift carefully to avoid disruptive seeking.
-   For unsupported third-party websites, use manual sync instructions
    instead of pretending remote controls will work.

Suggested playback state:

``` ts
type PlaybackState = {
  mode: "direct-video" | "official-embed" | "manual-sync" | "shared-tab";
  sourceUrl?: string;
  status: "playing" | "paused" | "loading" | "error";
  positionSeconds: number;
  updatedAt: number;
  revision: number;
};
```

### FR-08: Room chat

-   Provide optional temporary text chat.
-   Show guest display names and timestamps.
-   Apply message-length limits and spam throttling.
-   Allow participants to mute or report abusive users.
-   Delete room chat when the room expires unless a clearly disclosed
    retention policy applies.

### FR-09: Optional voice chat

-   Add WebRTC voice chat in a later milestone.
-   Microphone starts off and requires explicit permission.
-   Include mute, deafen, and disconnect controls.
-   Do not record voice by default.

## 4. Interface Requirements

### Home page

-   App name and short explanation.
-   **Create Room** button.
-   **Join Room** field for a room code or invite link.
-   Brief notice: supported sources only; no login required.

### Room page

-   Large media/player area.
-   URL input and **Play** button.
-   Mode/status label.
-   Playback controls when supported.
-   Participant list and room link-copy control.
-   Chat panel.
-   **Share Browser Tab** button.
-   Persistent sharing indicator and **Stop Sharing** control.
-   Clear fallback instructions for unsupported websites.

### Visual style

-   Dark cinema theme with restrained neon accents.
-   Large media canvas and simple controls.
-   Responsive layout for desktop and mobile.
-   Do not make mobile tab-sharing functionality a requirement because
    browser support varies.

## 5. Technical Architecture

### Frontend

-   TypeScript and React or Next.js.
-   Native HTML video player for direct media URLs.
-   Iframe-based embedding only for sources that permit it.
-   Official provider SDKs for compatible streaming players.
-   WebSocket client for room events.
-   WebRTC for optional tab/screen streaming and voice chat.

### Backend

-   Node.js and TypeScript.
-   WebSocket server for room presence, chat, and playback events.
-   Ephemeral in-memory room state for a prototype.
-   Optional Redis for multi-instance deployments.
-   STUN/TURN configuration for WebRTC where required.

### Deployment

-   HTTPS in production.
-   A host that supports persistent WebSocket connections.
-   Configure allowed origins, connection limits, request size limits,
    and rate limits.
-   Avoid server-side fetching of user-submitted URLs unless strict SSRF
    protections are implemented.

## 6. URL and Security Rules

-   Accept `https:` URLs by default.
-   Reject `javascript:`, `data:`, `file:`, and other unsupported
    schemes.
-   Validate URL length and parse URLs using a standard URL parser.
-   Do not put secrets, tokens, or private URLs in room links or logs.
-   Do not request browser history, cookies, passwords, or access to
    unrelated tabs.
-   Do not proxy arbitrary user URLs through the backend without an
    explicit allowlist and SSRF defenses.
-   Prevent cross-site scripting by escaping or sanitizing
    user-controlled display names and chat.
-   Validate room membership and host permissions for every WebSocket
    event.
-   Use unguessable room identifiers and rate limits.
-   Never bypass a site's frame policy, DRM, paywalls, or access
    controls.

## 7. Suggested Data Model

### Room

-   `roomId`
-   `roomCode`
-   `hostParticipantId`
-   `createdAt`
-   `lastActivityAt`
-   `expiresAt`
-   `locked`
-   `maxParticipants`

### Participant

-   `participantId`
-   `displayName`
-   `joinedAt`
-   `role`
-   `connectionState`

### PlaybackState

-   `mode`
-   `sourceUrl`
-   `status`
-   `positionSeconds`
-   `updatedAt`
-   `revision`

Avoid storing screen recordings, browser cookies, passwords, or
unrelated browsing data.

## 8. WebSocket Events

Suggested events: - `room:create` - `room:join` - `room:leave` -
`room:lock` - `participant:update` - `media:set-source` -
`playback:play` - `playback:pause` - `playback:seek` -
`playback:state` - `chat:message` - `sharing:started` -
`sharing:stopped` - `room:end`

Each event must validate room membership, authorization, data types, and
payload size. Only the host may control playback by default.

## 9. Acceptance Criteria

-   [ ] Users can create and join rooms without login.
-   [ ] Room links and codes work for guest participants.
-   [ ] A user can paste a valid direct MP4/WebM URL and play it if
    browser-compatible and reachable.
-   [ ] Invalid URLs produce a readable error.
-   [ ] Compatible players synchronize play, pause, and seek events.
-   [ ] Embedded websites are loaded only when allowed by provider and
    browser policy.
-   [ ] Blocked websites display a useful fallback.
-   [ ] Browser sharing always requires explicit user permission.
-   [ ] Users can stop sharing immediately.
-   [ ] No browser cookies, passwords, or unrelated-tab contents are
    collected.
-   [ ] Unsupported or DRM-protected sources are not falsely presented
    as supported.
-   [ ] Rooms and temporary chat expire automatically.
-   [ ] The app handles reconnects, buffering, autoplay restrictions,
    and participant departures.

## 10. Testing Plan

-   Unit tests for URL parsing, room creation, room expiry, permissions,
    and playback-event ordering.
-   Integration tests for WebSocket reconnects, stale events, chat
    validation, and host authorization.
-   Browser tests for direct media URLs, unsupported formats, autoplay
    restrictions, and network errors.
-   Test iframe sources that allow and block embedding.
-   Test screen-share permission denial, revocation, and stopping.
-   Cross-browser testing in Chromium-based browsers, Firefox, and
    Safari.
-   Verify that URL inputs cannot trigger unsafe server-side requests.

## 11. Development Milestones

1.  **MVP rooms:** Guest rooms, invite links, presence, temporary chat.
2.  **Paste-and-play:** Direct MP4/WebM URLs using the native HTML video
    player.
3.  **Embeds:** Official embeds for compatible providers and
    blocked-embed fallback.
4.  **Synchronization:** WebSocket playback events for supported
    players.
5.  **Browser sharing:** Explicit tab/screen selection and WebRTC
    streaming.
6.  **Optional extension:** Narrowly scoped permissions for compatible
    player integrations.
7.  **Hardening:** Rate limits, accessibility, cross-browser tests,
    deployment, and privacy documentation.
8.  **Optional voice chat:** WebRTC audio with explicit microphone
    permission.

## 12. Definition of Done

The MVP is complete when users can create or join a temporary room
without signing in, paste and play supported direct media URLs, use
permitted embedded players, see clear fallback behavior for unsupported
sources, and synchronize supported playback controls. Browser capture
must always be permission-based, and the product must not bypass DRM or
website security restrictions.
