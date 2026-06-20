import type { LocationPayload } from "@openreveal/shared";

import { registerServerEffect } from "./contracts.js";
import { asRecord, cleanNumber, cleanText } from "./validation.js";

function buildMapsUrl(payload: Omit<LocationPayload, "mapsUrl">) {
  const textQuery = payload.formattedAddress ?? [payload.name, payload.region, payload.country].filter(Boolean).join(", ");
  const coordinateQuery =
    payload.lat != null && payload.lng != null ? `${payload.lat},${payload.lng}` : undefined;
  const query = payload.placeId ? textQuery : coordinateQuery ?? textQuery;
  const params = [`api=1`, `query=${encodeURIComponent(query)}`];
  if (payload.placeId) {
    params.push(`query_place_id=${encodeURIComponent(payload.placeId)}`);
  }
  return `https://www.google.com/maps/search/?${params.join("&")}`;
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
        formattedAddress: cleanText(record.formattedAddress, "formattedAddress", false, 500),
        placeId: cleanText(record.placeId, "placeId", false, 300),
        lat: cleanNumber(record.lat, "lat", -90, 90),
        lng: cleanNumber(record.lng, "lng", -180, 180),
        autoOpenMaps: record.autoOpenMaps !== false
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
