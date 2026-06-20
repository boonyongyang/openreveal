import { SESSION_CODE_ALPHABET, SESSION_CODE_LENGTH } from "@openreveal/shared";

// Single source for the session-code contract on the web side. Everything is
// derived from SESSION_CODE_ALPHABET so a change to the code shape (length or
// alphabet) ripples from the shared constants alone.

export function normalizeSessionCode(value: string): string {
  return [...value]
    .filter((character) => SESSION_CODE_ALPHABET.includes(character))
    .join("")
    .slice(0, SESSION_CODE_LENGTH);
}

export function isValidSessionCode(code: string): boolean {
  return (
    code.length === SESSION_CODE_LENGTH &&
    [...code].every((character) => SESSION_CODE_ALPHABET.includes(character))
  );
}

// Extracts a receiver code from a pathname. Supports the QR/legacy "/r/<code>"
// and the bare typed "/<code>" form. Returns null when the path is not a code
// (named routes like /console, asset files, etc.).
export function sessionCodeFromPath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  const candidate = parts[0] === "r" ? parts[1] : parts[0];
  return candidate && isValidSessionCode(candidate) ? candidate : null;
}
