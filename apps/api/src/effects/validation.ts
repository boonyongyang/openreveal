function rejectControls(value: string) {
  return /[\u0000-\u001F\u007F]/u.test(value);
}

export function cleanText(value: unknown, field: string, required = false, maxLength = 200) {
  if (value == null || value === "") {
    if (required) throw new Error(`${field}_required`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${field}_invalid`);
  const cleaned = value.trim();
  if (!cleaned && required) throw new Error(`${field}_required`);
  if (cleaned.length > maxLength) throw new Error(`${field}_too_long`);
  if (rejectControls(cleaned)) throw new Error(`${field}_invalid`);
  return cleaned || undefined;
}

export function cleanNumber(value: unknown, field: string, min: number, max: number) {
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field}_invalid`);
  }
  return parsed;
}

export function cleanHttpsUrl(value: unknown, field: string) {
  const cleaned = cleanText(value, field);
  if (!cleaned) return undefined;
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:") throw new Error(`${field}_invalid`);
    return url.toString();
  } catch {
    throw new Error(`${field}_invalid`);
  }
}

export function asRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("input_invalid");
  }
  return input as Record<string, unknown>;
}
