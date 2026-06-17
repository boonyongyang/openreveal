import { createHmac, timingSafeEqual } from "node:crypto";

export const PERFORMER_COOKIE = "or_performer";

/**
 * Length-safe constant-time string comparison. timingSafeEqual throws on
 * differing buffer lengths and short-circuits would leak length via timing, so
 * compare fixed-length HMACs of the inputs instead of the raw bytes.
 */
export function safeEqual(a: string, b: string): boolean {
  const key = "openreveal-compare";
  const left = createHmac("sha256", key).update(a).digest();
  const right = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(left, right);
}

interface PerformerTokenPayload {
  role: "performer";
  iat: number;
  exp: number;
}

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createPerformerToken(secret: string, ttlSeconds = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const payload: PerformerTokenPayload = {
    role: "performer",
    iat: now,
    exp: now + ttlSeconds
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyPerformerToken(token: string | undefined, secret: string) {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = sign(encoded, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as PerformerTokenPayload;
    return payload.role === "performer" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
