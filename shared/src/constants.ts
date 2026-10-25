export const ROOM_EXPIRATION_MS = 2 * 60 * 60 * 1000; // 2 hours
export const ROOM_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
export const MAX_CHAT_LENGTH = 500;
export const MAX_PARTICIPANTS_PER_ROOM = 20;
export const HEARTBEAT_INTERVAL_MS = 2500; // 2.5s host sync pulse
export const DRIFT_JITTER_THRESHOLD_S = 0.5; // Within 0.5s: no adjustment
export const DRIFT_SEEK_THRESHOLD_S = 2.0; // Between 0.5s-2.0s: rate adjust; >2.0s: seek
export const RATE_LIMIT_CHAT_PER_3S = 5;
export const RATE_LIMIT_ACTIONS_PER_10S = 10;

export const ADJECTIVES = [
  "Velvet", "Cosmic", "Neon", "Golden", "Midnight", "Electric", "Silent", "Shadow",
  "Solar", "Cyber", "Silver", "Retro", "Echo", "Lunar", "Amber", "Astral"
];

export const NOUNS = [
  "Fox", "Panda", "Otter", "Falcon", "Wolf", "Hawk", "Koala", "Panther",
  "Lynx", "Tiger", "Raven", "Dolphin", "Cheetah", "Owl", "Badger", "Spectator"
];

export function generateRandomGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}
