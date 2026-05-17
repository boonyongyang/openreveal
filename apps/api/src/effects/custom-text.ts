import type { CustomTextPayload } from "@openreveal/shared";

import { registerServerEffect } from "./contracts.js";
import { asRecord, cleanText } from "./validation.js";

export function registerCustomTextEffect() {
  registerServerEffect({
    kind: "custom_text",
    validate(input: unknown): CustomTextPayload {
      const record = asRecord(input);
      return {
        kind: "custom_text",
        title: cleanText(record.title, "title", false, 120),
        body: cleanText(record.body, "body", true, 600)!,
        footer: cleanText(record.footer, "footer", false, 160)
      };
    }
  });
}
