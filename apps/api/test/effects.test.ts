import { describe, expect, it } from "vitest";

import { registerBuiltInServerEffects, serverEffects } from "../src/effects/index.js";

describe("server effects", () => {
  it("enriches location payloads with official Google Maps URLs", async () => {
    registerBuiltInServerEffects();
    const effect = serverEffects.get("location");
    expect(effect).toBeDefined();

    const payload = effect!.validate({
      name: "Kuala Lumpur",
      country: "Malaysia"
    });
    const enriched = effect!.enrich ? await effect!.enrich(payload) : payload;

    expect(enriched.kind).toBe("location");
    expect(enriched.mapsUrl).toBe(
      "https://www.google.com/maps/search/?api=1&query=Kuala%20Lumpur%2C%20Malaysia"
    );
  });

  it("keeps celebrity payloads text-only", () => {
    registerBuiltInServerEffects();
    const effect = serverEffects.get("celebrity");
    expect(effect).toBeDefined();

    const payload = effect!.validate({
      name: "Michelle Yeoh",
      subtitle: "Actor"
    });

    expect(payload).toEqual({
      kind: "celebrity",
      name: "Michelle Yeoh",
      subtitle: "Actor",
      sourceUrl: undefined,
      searchUrl: "https://www.google.com/search?q=Michelle%20Yeoh",
      autoOpenSearch: true
    });
  });

  it("validates custom text payloads without third-party enrichment", () => {
    registerBuiltInServerEffects();
    const effect = serverEffects.get("custom_text");
    expect(effect).toBeDefined();

    const payload = effect!.validate({
      body: "Impossible"
    });

    expect(payload).toEqual({
      kind: "custom_text",
      body: "Impossible"
    });
  });

  it("rejects empty custom text bodies", () => {
    registerBuiltInServerEffects();
    const effect = serverEffects.get("custom_text");
    expect(effect).toBeDefined();

    expect(() => effect!.validate({ body: "   " })).toThrow("body_required");
  });
});
