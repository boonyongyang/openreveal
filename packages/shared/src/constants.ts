export const APP_NAME = "OpenReveal";

// Numeric-only short codes: a performer types these fast on the spectator's
// phone using the numeric keypad. 3 digits = 1000 combos, which is plenty
// because only one session is live at a time and sessions time out.
export const SESSION_CODE_ALPHABET = "0123456789";
export const SESSION_CODE_LENGTH = 3;
export const DEFAULT_SESSION_TTL_MINUTES = 30;

export const CONNECTION_STATES = [
  "disconnected",
  "connecting",
  "foregrounded",
  "backgrounded"
] as const;

export const EFFECT_KINDS = ["location", "celebrity", "custom_text"] as const;
