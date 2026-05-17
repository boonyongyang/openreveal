export const APP_NAME = "OpenReveal";

export const SESSION_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const SESSION_CODE_LENGTH = 8;
export const DEFAULT_SESSION_TTL_MINUTES = 30;

export const CONNECTION_STATES = [
  "disconnected",
  "connecting",
  "foregrounded",
  "backgrounded"
] as const;

export const EFFECT_KINDS = ["location", "celebrity", "custom_text"] as const;
