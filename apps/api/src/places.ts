import type { PlaceDetailsResponse, PlacePrediction } from "@openreveal/shared";

import { config } from "./config.js";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";

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
  return (body.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId && prediction.text?.text))
    .map((prediction) => ({
      placeId: prediction.placeId!,
      text: prediction.text!.text!,
      mainText: prediction.structuredFormat?.mainText?.text,
      secondaryText: prediction.structuredFormat?.secondaryText?.text
    }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse["place"]> {
  assertPlacesConfigured();

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

  return {
    placeId: body.id,
    name,
    formattedAddress: body.formattedAddress,
    lat: body.location?.latitude,
    lng: body.location?.longitude
  };
}

function assertPlacesConfigured() {
  if (!placesConfigured()) {
    throw new Error("places_unavailable");
  }
}
