import test from "node:test";
import assert from "node:assert";
import { validateAndClassifyUrl, sanitizeText } from "../dist/index.js";

test("URL Classifier - Direct Video formats", () => {
  const mp4Res = validateAndClassifyUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  assert.strictEqual(mp4Res.valid, true);
  assert.strictEqual(mp4Res.mode, "direct-video");

  const webmRes = validateAndClassifyUrl("https://example.com/media/clip.webm");
  assert.strictEqual(webmRes.valid, true);
  assert.strictEqual(webmRes.mode, "direct-video");
});

test("URL Classifier - Embeddable Platforms", () => {
  const ytRes = validateAndClassifyUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.strictEqual(ytRes.valid, true);
  assert.strictEqual(ytRes.mode, "official-embed");

  const ytShortRes = validateAndClassifyUrl("https://youtu.be/dQw4w9WgXcQ");
  assert.strictEqual(ytShortRes.valid, true);
  assert.strictEqual(ytShortRes.mode, "official-embed");

  const vimeoRes = validateAndClassifyUrl("https://vimeo.com/76979871");
  assert.strictEqual(vimeoRes.valid, true);
  assert.strictEqual(vimeoRes.mode, "official-embed");
});

test("URL Classifier - Manual Sync Fallback for General / Blocked Sites", () => {
  const netflixRes = validateAndClassifyUrl("https://www.netflix.com/title/80057281");
  assert.strictEqual(netflixRes.valid, true);
  assert.strictEqual(netflixRes.mode, "manual-sync");
});

test("Security - Reject Insecure Schemes & Malicious Vectors", () => {
  const jsRes = validateAndClassifyUrl("javascript:alert(1)");
  assert.strictEqual(jsRes.valid, false);

  const dataRes = validateAndClassifyUrl("data:text/html,<script>alert(1)</script>");
  assert.strictEqual(dataRes.valid, false);

  const fileRes = validateAndClassifyUrl("file:///C:/Windows/System32/cmd.exe");
  assert.strictEqual(fileRes.valid, false);

  const httpRes = validateAndClassifyUrl("http://unencrypted-site.com/movie.mp4");
  assert.strictEqual(httpRes.valid, false);
});

test("Security - HTML Entity Sanitization", () => {
  const dirty = '<script>alert("XSS")</script>&foo=bar';
  const clean = sanitizeText(dirty);
  assert.strictEqual(clean.includes("<script>"), false);
  assert.strictEqual(clean.includes("&lt;script&gt;"), true);
  assert.strictEqual(clean.includes("&quot;XSS&quot;"), true);
});
