import type { CelebrityPayload } from "@openreveal/shared";

import { registerServerEffect } from "./contracts.js";
import { asRecord, cleanHttpsUrl, cleanText } from "./validation.js";

function buildSearchUrl(name: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
}

export function registerCelebrityEffect() {
  registerServerEffect({
    kind: "celebrity",
    validate(input: unknown): CelebrityPayload {
      const record = asRecord(input);
      const name = cleanText(record.name, "name", true)!;
      return {
        kind: "celebrity",
        name,
        subtitle: cleanText(record.subtitle, "subtitle"),
        sourceUrl: cleanHttpsUrl(record.sourceUrl, "sourceUrl"),
        searchUrl: buildSearchUrl(name),
        autoOpenSearch: record.autoOpenSearch !== false
      };
    }
  });
}
