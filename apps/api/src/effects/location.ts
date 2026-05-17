import type { LocationPayload } from "@openreveal/shared";

import { registerServerEffect } from "./contracts.js";
import { asRecord, cleanNumber, cleanText } from "./validation.js";

function buildMapsUrl(payload: Omit<LocationPayload, "mapsUrl">) {
  const coordinateQuery =
    payload.lat != null && payload.lng != null ? `${payload.lat},${payload.lng}` : undefined;
  const textQuery = [payload.name, payload.region, payload.country].filter(Boolean).join(", ");
  const query = coordinateQuery ?? textQuery;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function registerLocationEffect() {
  registerServerEffect({
    kind: "location",
    validate(input: unknown): LocationPayload {
      const record = asRecord(input);
      const payload = {
        kind: "location" as const,
        name: cleanText(record.name, "name", true)!,
        region: cleanText(record.region, "region"),
        country: cleanText(record.country, "country"),
        lat: cleanNumber(record.lat, "lat", -90, 90),
        lng: cleanNumber(record.lng, "lng", -180, 180)
      };

      return {
        ...payload,
        mapsUrl: buildMapsUrl(payload)
      };
    },
    async enrich(payload) {
      return {
        ...payload,
        mapsUrl: buildMapsUrl(payload)
      };
    }
  });
}
