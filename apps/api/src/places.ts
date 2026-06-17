import type { PlaceDetailsResponse, PlacePrediction } from "@openreveal/shared";

import { config } from "./config.js";
import { DailyBudget, TtlCache } from "./places-cache.js";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";

// Autocomplete is keystroke-driven and changes often: cache briefly. Place
// details are effectively immutable for our purposes: cache for an hour.
const autocompleteCache = new TtlCache<PlacePrediction[]>(120_000, 500);
const detailsCache = new TtlCache<PlaceDetailsResponse["place"]>(3_600_000, 500);
const budget = new DailyBudget(config.googlePlacesDailyBudget);

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

interface GooglePlaceDetailsResponse {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export function placesConfigured() {
  return Boolean(config.googlePlacesEnabled && config.googlePlacesApiKey);
}

export async function autocompletePlaces(input: string, sessionToken: string): Promise<PlacePrediction[]> {
  assertPlacesConfigured();

  const cacheKey = `${sessionToken.length}:${sessionToken}:${input}`;
  const cached = autocompleteCache.get(cacheKey);
  if (cached) return cached;

  assertBudget();
  const response = await fetch(`${PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.googlePlacesApiKey!,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat"
    },
    body: JSON.stringify({
      input,
      sessionToken
    })
  });

  if (!response.ok) {
    throw new Error("places_autocomplete_failed");
  }

  const body = await response.json() as GoogleAutocompleteResponse;
  const predictions = (body.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId && prediction.text?.text))
    .map((prediction) => ({
      placeId: prediction.placeId!,
      text: prediction.text!.text!,
      mainText: prediction.structuredFormat?.mainText?.text,
      secondaryText: prediction.structuredFormat?.secondaryText?.text
    }));
  autocompleteCache.set(cacheKey, predictions);
  return predictions;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse["place"]> {
  assertPlacesConfigured();

  const cached = detailsCache.get(placeId);
  if (cached) return cached;

  assertBudget();
  const response = await fetch(`${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": config.googlePlacesApiKey!,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location"
    }
  });

  if (!response.ok) {
    throw new Error("place_details_failed");
  }

  const body = await response.json() as GooglePlaceDetailsResponse;
  const name = body.displayName?.text?.trim() || body.formattedAddress?.trim();
  if (!body.id || !name) {
    throw new Error("place_details_invalid");
  }

  const place = {
    placeId: body.id,
    name,
    formattedAddress: body.formattedAddress,
    lat: body.location?.latitude,
    lng: body.location?.longitude
  };
  detailsCache.set(placeId, place);
  return place;
}

function assertPlacesConfigured() {
  if (!placesConfigured()) {
    throw new Error("places_unavailable");
  }
}

function assertBudget() {
  if (!budget.tryConsume()) {
    // Surface as unavailable (503) so callers back off without leaking the cap.
    throw new Error("places_unavailable");
  }
}

// Test-only hook to reset module caches between cases.
export function __resetPlacesCaches() {
  autocompleteCache.clear();
  detailsCache.clear();
}
