import { useEffect, useRef, useState } from "react";

import type { LocationPayload } from "@openreveal/shared";
import type { PlacePrediction } from "@openreveal/shared";
import { effectDefinitions } from "@openreveal/shared";

import { autocompletePlaces, getCapabilities, getPlaceDetails } from "../lib/api.js";
import { createBrowserId } from "../lib/id.js";
import type { EffectFormValue } from "./contracts.js";
import { registerWebEffect } from "./contracts.js";

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

function LocationForm({
  value,
  onChange
}: {
  value: EffectFormValue;
  onChange: (next: EffectFormValue) => void;
}) {
  const draft = value as Partial<LocationPayload>;
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState<"manual" | "connected" | "unavailable" | "searching">("manual");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [placesEnabled, setPlacesEnabled] = useState(false);
  const sessionToken = useRef(createBrowserId());

  useEffect(() => {
    let cancelled = false;
    getCapabilities()
      .then((capabilities) => {
        if (cancelled) return;
        setPlacesEnabled(capabilities.places.enabled);
        setPlaceStatus(capabilities.places.enabled ? "connected" : "manual");
      })
      .catch(() => {
        if (cancelled) return;
        setPlacesEnabled(false);
        setPlaceStatus("manual");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!placesEnabled) {
      setPredictions([]);
      setPlaceStatus(draft.placeId ? "connected" : "manual");
      return;
    }

    const query = placeQuery.trim();
    if (query.length < 3) {
      setPredictions([]);
      setPlaceStatus(draft.placeId ? "connected" : "manual");
      return;
    }

    const timeout = window.setTimeout(() => {
      setPlaceStatus("searching");
      autocompletePlaces(query, sessionToken.current)
        .then((response) => {
          setPredictions(response.predictions);
          setPlaceStatus("connected");
        })
        .catch(() => {
          setPredictions([]);
          setPlaceStatus("unavailable");
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draft.placeId, placeQuery, placesEnabled]);

  async function selectPrediction(prediction: PlacePrediction) {
    setPlaceQuery(prediction.text);
    setPredictions([]);
    setPlaceStatus("connected");

    try {
      const details = await getPlaceDetails(prediction.placeId);
      const { region, country } = splitAddress(details.place.formattedAddress);
      onChange({
        ...draft,
        name: details.place.name,
        formattedAddress: details.place.formattedAddress,
        region,
        country,
        placeId: details.place.placeId,
        lat: details.place.lat,
        lng: details.place.lng,
        autoOpenMaps: true
      });
    } catch {
      setPlaceStatus("unavailable");
    }
  }

  return (
    <div className="effect-form">
      <label>
        Place search
        <input
          disabled={!placesEnabled}
          value={placeQuery}
          onChange={(event) => setPlaceQuery(event.target.value)}
          placeholder={placesEnabled ? "Search a place" : "Manual mode"}
          autoComplete="off"
        />
      </label>
      <div className="places-meta">
        <span>{placesStatusLabel(placeStatus)}</span>
        {draft.placeId ? <span>Precise Maps marker selected</span> : <span>Manual fallback available</span>}
      </div>
      {predictions.length ? (
        <div className="places-results">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => void selectPrediction(prediction)}
            >
              <strong>{prediction.mainText ?? prediction.text}</strong>
              {prediction.secondaryText ? <span>{prediction.secondaryText}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <label>
        Location name
        <input
          value={draft.name ?? ""}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          placeholder="Kuala Lumpur"
        />
      </label>
      <div className="effect-form__row">
        <label>
          Region
          <input
            value={draft.region ?? ""}
            onChange={(event) => onChange({ ...draft, region: event.target.value })}
            placeholder="Federal Territory"
          />
        </label>
        <label>
          Country
          <input
            value={draft.country ?? ""}
            onChange={(event) => onChange({ ...draft, country: event.target.value })}
            placeholder="Malaysia"
          />
        </label>
      </div>
      <div className="effect-form__row">
        <label>
          Latitude
          <input
            inputMode="decimal"
            value={draft.lat ?? ""}
            onChange={(event) => onChange({ ...draft, lat: optionalNumber(event.target.value) })}
            placeholder="Optional"
          />
        </label>
        <label>
          Longitude
          <input
            inputMode="decimal"
            value={draft.lng ?? ""}
            onChange={(event) => onChange({ ...draft, lng: optionalNumber(event.target.value) })}
            placeholder="Optional"
          />
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={draft.autoOpenMaps !== false}
          onChange={(event) => onChange({ ...draft, autoOpenMaps: event.target.checked })}
        />
        Open Maps automatically when sent
      </label>
    </div>
  );
}

function placesStatusLabel(status: "manual" | "connected" | "unavailable" | "searching") {
  switch (status) {
    case "connected":
      return "Places connected";
    case "searching":
      return "Searching Places";
    case "unavailable":
      return "Places unavailable";
    case "manual":
      return "Manual mode";
  }
}

function splitAddress(formattedAddress: string | undefined) {
  if (!formattedAddress) return {};
  const parts = formattedAddress.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    region: parts.length > 2 ? parts.at(-2) : undefined,
    country: parts.at(-1)
  };
}

function LocationReveal({ payload }: { payload: LocationPayload | { kind: string } }) {
  if (payload.kind !== "location") return null;
  const location = payload as LocationPayload;
  const subtitle = [location.region, location.country].filter(Boolean).join(", ");
  return (
    <article className="reveal-result">
      <p className="reveal-result__kind">Location result</p>
      <h2>{location.name}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
      <a href={location.mapsUrl} target="_blank" rel="noreferrer">
        Open in Maps
      </a>
    </article>
  );
}

export function registerLocationWebEffect() {
  registerWebEffect({
    kind: "location",
    label: "Location",
    sample: effectDefinitions.location.sample,
    PerformerForm: LocationForm,
    SpectatorReveal: LocationReveal
  });
}
