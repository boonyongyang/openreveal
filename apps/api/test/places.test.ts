import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACES_ENABLED;
  vi.resetModules();
});

describe("Places proxy helpers", () => {
  it("normalizes autocomplete predictions", async () => {
    process.env.NODE_ENV = "test";
    process.env.GOOGLE_PLACES_API_KEY = "test-google-key";
    process.env.GOOGLE_PLACES_ENABLED = "true";
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      suggestions: [
        {
          placePrediction: {
            placeId: "place-1",
            text: { text: "Petronas Twin Towers, Kuala Lumpur, Malaysia" },
            structuredFormat: {
              mainText: { text: "Petronas Twin Towers" },
              secondaryText: { text: "Kuala Lumpur, Malaysia" }
            }
          }
        }
      ]
    }))) as typeof fetch;

    const { autocompletePlaces } = await import("../src/places.js");
    const predictions = await autocompletePlaces("petronas", "session-token");

    expect(predictions).toEqual([
      {
        placeId: "place-1",
        text: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
        mainText: "Petronas Twin Towers",
        secondaryText: "Kuala Lumpur, Malaysia"
      }
    ]);
  });

  it("normalizes place details", async () => {
    process.env.NODE_ENV = "test";
    process.env.GOOGLE_PLACES_API_KEY = "test-google-key";
    process.env.GOOGLE_PLACES_ENABLED = "true";
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      id: "place-1",
      displayName: { text: "Petronas Twin Towers" },
      formattedAddress: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
      location: {
        latitude: 3.1579,
        longitude: 101.7116
      }
    }))) as typeof fetch;

    const { getPlaceDetails } = await import("../src/places.js");
    const details = await getPlaceDetails("place-1");

    expect(details).toEqual({
      placeId: "place-1",
      name: "Petronas Twin Towers",
      formattedAddress: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
      lat: 3.1579,
      lng: 101.7116
    });
  });
});
