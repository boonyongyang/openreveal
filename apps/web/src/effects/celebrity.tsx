import type { CelebrityPayload } from "@openreveal/shared";
import { celebrityPresets, effectDefinitions } from "@openreveal/shared";

import type { EffectFormValue } from "./contracts.js";
import { registerWebEffect } from "./contracts.js";

function CelebrityForm({
  value,
  onChange
}: {
  value: EffectFormValue;
  onChange: (next: EffectFormValue) => void;
}) {
  const draft = value as Partial<CelebrityPayload>;
  const updateName = (name: string) => {
    const preset = celebrityPresets.find((candidate) => candidate.name === name);
    const currentPreset = celebrityPresets.find((candidate) => candidate.name === draft.name);
    const shouldUsePresetSubtitle = Boolean(
      preset && (!draft.subtitle || draft.subtitle === currentPreset?.subtitle)
    );

    onChange({
      ...draft,
      name,
      subtitle: shouldUsePresetSubtitle ? preset?.subtitle : draft.subtitle
    });
  };

  return (
    <div className="effect-form">
      <label>
        Celebrity name
        <input
          list="celebrity-presets"
          value={draft.name ?? ""}
          onChange={(event) => updateName(event.target.value)}
          placeholder="Michelle Yeoh"
        />
      </label>
      <datalist id="celebrity-presets">
        {celebrityPresets.map((preset) => (
          <option key={preset.id} value={preset.name} label={preset.subtitle} />
        ))}
      </datalist>
      <label>
        Subtitle
        <input
          value={draft.subtitle ?? ""}
          onChange={(event) => onChange({ ...draft, subtitle: event.target.value })}
          placeholder="Actor"
        />
      </label>
      <label>
        Source URL
        <input
          value={draft.sourceUrl ?? ""}
          onChange={(event) => onChange({ ...draft, sourceUrl: event.target.value })}
          placeholder="Optional https:// source"
        />
      </label>
    </div>
  );
}

function CelebrityReveal({ payload }: { payload: CelebrityPayload | { kind: string } }) {
  if (payload.kind !== "celebrity") return null;
  const celebrity = payload as CelebrityPayload;
  return (
    <article className="reveal-result">
      <p className="reveal-result__kind">People result</p>
      <h2>{celebrity.name}</h2>
      {celebrity.subtitle ? <p>{celebrity.subtitle}</p> : null}
      {celebrity.sourceUrl ? (
        <a href={celebrity.sourceUrl} target="_blank" rel="noreferrer">
          Read more
        </a>
      ) : null}
    </article>
  );
}

export function registerCelebrityWebEffect() {
  registerWebEffect({
    kind: "celebrity",
    label: "Celebrity",
    sample: effectDefinitions.celebrity.sample,
    PerformerForm: CelebrityForm,
    SpectatorReveal: CelebrityReveal
  });
}
