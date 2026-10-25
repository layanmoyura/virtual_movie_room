import { UrlValidationResult, PlaybackMode } from "./types.js";

const DIRECT_VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
  ".m4v",
  ".mp3",
  ".m3u8"
];

const OFFICIAL_EMBED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "soundcloud.com"
];

/**
 * Validates and classifies any user-submitted URL strictly client-side.
 * Rejects unsafe schemes (javascript:, data:, file:) and enforces HTTPS.
 */
export function validateAndClassifyUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Please provide a valid URL." };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "URL cannot be empty." };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: "URL is too long (maximum 2048 characters)." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format. Please include https://" };
  }

  // Scheme verification: Only HTTPS or local development HTTP
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    return {
      valid: false,
      error: "Only secure HTTPS URLs are permitted (or localhost for development)."
    };
  }

  // Path check for direct video extensions
  const pathname = parsed.pathname.toLowerCase();
  const isDirectVideo = DIRECT_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  if (isDirectVideo) {
    return {
      valid: true,
      mode: "direct-video",
      normalizedUrl: parsed.href
    };
  }

  // Domain check for official embeds
  const hostname = parsed.hostname.toLowerCase();
  const isOfficialEmbed = OFFICIAL_EMBED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (isOfficialEmbed) {
    return {
      valid: true,
      mode: "official-embed",
      normalizedUrl: parsed.href
    };
  }

  // Any other URL falls back to manual-sync (where iframe might be blocked by X-Frame-Options / CSP)
  return {
    valid: true,
    mode: "manual-sync",
    normalizedUrl: parsed.href
  };
}

/**
 * Sanitizes user-generated text for safe rendering (XSS prevention)
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
