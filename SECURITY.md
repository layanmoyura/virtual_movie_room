# Virtual Movie Room --- Security & Privacy Architecture

This document specifies the threat model, defensive principles, input validation standards, and security controls enforced throughout **Virtual Movie Room**.

---

## 1. Core Security Principles

1. **Zero Trust for Client URLs**: The backend server **never** fetches, downloads, scrapes, or proxies arbitrary user-submitted URLs.
2. **Zero Storage of Personal Data**: No account credentials, emails, passwords, browser history, cookies, or DRM keys are ever requested or stored.
3. **Explicit Consent for Media Capture**: Tab and screen sharing can **only** be triggered by an intentional user gesture via the browser's native permission modal (`getDisplayMedia()`). Silent or background screen capture is impossible.
4. **Strict Ephemerality**: All rooms, participant sessions, and chat logs reside purely in volatile server memory and are wiped immediately upon room termination or after 2 hours of inactivity.

---

## 2. Threat Model & Mitigations

### 2.1 Server-Side Request Forgery (SSRF)
- **Risk**: An attacker submits internal IP addresses (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `::1`) hoping the backend server fetches internal metadata or cloud credentials.
- **Defense**: 
  - The backend server does **not** make HTTP requests to user-provided URLs.
  - Media loading, streaming, and iframe rendering happen **exclusively client-side** inside the user's browser sandbox.
  - URL validation is performed client-side using native `URL` constructors.

### 2.2 Cross-Site Scripting (XSS)
- **Risk**: Malicious actors inject HTML, `<script>` tags, or `javascript:` pseudoprotocols into display names or room chat.
- **Defenses**:
  - **Input Sanitization**: All chat messages and display names pass through an HTML entity encoder (converting `&`, `<`, `>`, `"`, `'`, `/` to safe entities) before broadcast.
  - **React Automatic Escaping**: React JSX safely renders text as DOM text nodes rather than `innerHTML`.
  - **URL Protocol Whitelist**: Any URL submitted to the player must strictly match `https:` (or `http://localhost` for local development). Any URL containing `javascript:`, `data:`, `vbscript:`, or `file:` is rejected with a validation error.

### 2.3 Iframe Framing & Clickjacking Defenses
- **Risk**: Embedding malicious or restricted third-party sites in iframes could violate origin policies or expose users to clickjacking.
- **Defenses**:
  - Respect `X-Frame-Options: DENY / SAMEORIGIN` and CSP `frame-ancestors`. The application **never** strips, rewrites, or proxies headers to bypass origin restrictions.
  - If a site blocks embedding, the application renders a secure fallback card offering "Open in New Tab", manual synchronization, or permission-based tab sharing.
  - Embed iframes are equipped with restrictive sandboxing:
    ```html
    <iframe
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerpolicy="no-referrer"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
    ```

### 2.4 Brute-Force & Guessable Room IDs
- **Risk**: Malicious actors guess or crawl sequential room IDs to eavesdrop on private sessions.
- **Defenses**:
  - Room URLs use cryptographic 10-character unguessable nanoid strings (over $10^{16}$ combinations).
  - Short join codes (e.g. `MV-7K2X`) use 6 uppercase alphanumeric characters excluding ambiguous glyphs (`0`, `O`, `1`, `I`), yielding over 1 billion combinations.
  - Join attempts are rate-limited to 5 attempts per IP per 10 seconds. Exceeding the threshold triggers temporary lockouts.

### 2.5 Denial of Service & Spam (Rate Limiting)
- **Defenses**:
  - **Chat Throttling**: Max 5 chat messages per 3 seconds per participant.
  - **Message Length Limit**: Hard cap of 500 characters per chat message. Server rejects any oversized payloads.
  - **WebSocket Payload Cap**: Incoming WebSocket frames exceeding 64 KB are automatically terminated.
  - **Room Capacity**: Max 20 participants per room by default to protect in-memory capacity and network fan-out.

---

## 3. URL Validation & Classification Standard

All submitted URLs must pass through `shared/url-validator.ts`:

```ts
export function validateAndClassifyUrl(rawUrl: string): {
  valid: boolean;
  mode?: "direct-video" | "official-embed" | "manual-sync";
  error?: string;
  normalizedUrl?: string;
} {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Please enter a valid URL." };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL exceeds maximum length of 2048 characters." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format. Include http:// or https://" };
  }

  // Enforce protocol whitelist
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    return { valid: false, error: "Only secure HTTPS URLs are permitted." };
  }

  const pathname = parsed.pathname.toLowerCase();
  const directVideoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m4v", ".mp3"];
  if (directVideoExtensions.some(ext => pathname.endsWith(ext))) {
    return { valid: true, mode: "direct-video", normalizedUrl: parsed.href };
  }

  // Sites permitting embed
  const embeddableDomains = ["youtube.com", "youtu.be", "vimeo.com", "dailymotion.com", "twitch.tv", "soundcloud.com"];
  if (embeddableDomains.some(d => parsed.hostname.endsWith(d))) {
    return { valid: true, mode: "official-embed", normalizedUrl: parsed.href };
  }

  // General website (may block framing or require manual sync)
  return { valid: true, mode: "manual-sync", normalizedUrl: parsed.href };
}
```

---

## 4. WebRTC Privacy & Permissions

1. **User Activation**: Capture is never initiated automatically. A physical click on "Share Tab/Screen" is mandatory.
2. **In-Session Indicators**:
   - The UI displays a persistent glowing banner: **"● You are sharing your screen"**.
   - A prominent red **"Stop Sharing"** button is always accessible.
3. **Stream Teardown**:
   - When capture ends (via browser banner or application button), `MediaStreamTrack.stop()` is invoked immediately on all video and audio tracks to release device handles.
   - The WebSocket server broadcasts `sharing:stopped`, resetting all viewers.

---

## 5. Security Checklist for Development & Auditing

- [x] No server-side HTTP proxying of user URLs.
- [x] Only HTTPS and localhost HTTP allowed.
- [x] `javascript:` and other unsafe schemes blocked before evaluation.
- [x] Chat messages and display names sanitized against HTML injection.
- [x] Host-only controls enforced server-side against participant role spoofing.
- [x] Short code brute-force protection with IP rate limiting.
- [x] Stale playback revisions rejected to prevent replay attacks.
- [x] 2-hour inactivity cleanup wipes in-memory state.
- [x] WebRTC media tracks closed immediately when sharing stops.
