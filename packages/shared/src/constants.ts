export const APP_NAME = "OpenReveal";

// Eight unambiguous characters provide roughly 40 bits of entropy while still
// being easy to read aloud. I, L, O, 0, and 1 are excluded to avoid ambiguity.
export const SESSION_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const SESSION_CODE_LENGTH = 8;
export const DEFAULT_SESSION_TTL_MINUTES = 30;

export const CONNECTION_STATES = [
  "disconnected",
  "connecting",
  "foregrounded",
  "backgrounded"
] as const;

export const EFFECT_KINDS = ["location", "celebrity", "custom_text"] as const;
