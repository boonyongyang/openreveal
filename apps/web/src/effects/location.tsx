import type { LocationPayload } from "@openreveal/shared";
import { effectDefinitions } from "@openreveal/shared";

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
  return (
    <div className="effect-form">
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
    </div>
  );
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
