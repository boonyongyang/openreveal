import type { CelebrityPayload } from "@openreveal/shared";

import { registerServerEffect } from "./contracts.js";
import { asRecord, cleanHttpsUrl, cleanText } from "./validation.js";

export function registerCelebrityEffect() {
  registerServerEffect({
    kind: "celebrity",
    validate(input: unknown): CelebrityPayload {
      const record = asRecord(input);
      return {
        kind: "celebrity",
        name: cleanText(record.name, "name", true)!,
        subtitle: cleanText(record.subtitle, "subtitle"),
        sourceUrl: cleanHttpsUrl(record.sourceUrl, "sourceUrl")
      };
    }
  });
}
