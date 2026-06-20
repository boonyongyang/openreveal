import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  CELEBRITY_PRESET_LICENSE,
  CONNECTION_STATES,
  EFFECT_KINDS,
  celebrityPresets,
  effectDefinitions,
  SESSION_CODE_ALPHABET,
  SESSION_CODE_LENGTH
} from "../src/index.js";

describe("shared constants", () => {
  it("keeps the OpenReveal identity and session code contract stable", () => {
    expect(APP_NAME).toBe("OpenReveal");
    // Numeric short codes: fast to type on a phone numeric keypad.
    expect(SESSION_CODE_LENGTH).toBe(3);
    expect(SESSION_CODE_ALPHABET).toBe("0123456789");
    expect(CONNECTION_STATES).toEqual([
      "disconnected",
      "connecting",
      "foregrounded",
      "backgrounded"
    ]);
  });

  it("declares the v1 effect kinds", () => {
    expect(EFFECT_KINDS).toEqual(["location", "celebrity", "custom_text"]);
    expect(Object.keys(effectDefinitions)).toEqual(["location", "celebrity", "custom_text"]);
  });

  it("keeps bundled celebrity presets auditable and text-only", () => {
    expect(celebrityPresets.length).toBeGreaterThan(0);

    for (const preset of celebrityPresets) {
      expect(preset.id).toMatch(/^[a-z0-9-]+$/);
      expect(preset.name).toBeTruthy();
      expect(preset.subtitle).toBeTruthy();
      expect(preset.sourceLabel).toBe("OpenReveal manual curation");
      expect(preset.license).toBe(CELEBRITY_PRESET_LICENSE);
      expect(preset.licenseNote).toContain("no biography, image, or third-party copy bundled");
      expect("imageUrl" in preset).toBe(false);
    }
  });
});
