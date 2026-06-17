import type { CustomTextPayload } from "@openreveal/shared";
import { effectDefinitions } from "@openreveal/shared";

import type { EffectFormValue } from "./contracts.js";
import { registerWebEffect } from "./contracts.js";

function CustomTextForm({
  value,
  onChange
}: {
  value: EffectFormValue;
  onChange: (next: EffectFormValue) => void;
}) {
  const draft = value as Partial<CustomTextPayload>;
  return (
    <div className="effect-form">
      <label>
        Reveal text
        <textarea
          maxLength={600}
          rows={4}
          value={draft.body ?? ""}
          onChange={(event) => onChange({ ...draft, body: event.target.value })}
          placeholder="Type the reveal"
        />
      </label>
    </div>
  );
}

function CustomTextReveal({ payload }: { payload: CustomTextPayload | { kind: string } }) {
  if (payload.kind !== "custom_text") return null;
  const text = payload as CustomTextPayload;
  return (
    <article className="text-reveal">
      <p>{text.body}</p>
    </article>
  );
}

export function registerCustomTextWebEffect() {
  registerWebEffect({
    kind: "custom_text",
    label: "Custom text",
    sample: effectDefinitions.custom_text.sample,
    PerformerForm: CustomTextForm,
    SpectatorReveal: CustomTextReveal
  });
}
