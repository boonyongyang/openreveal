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
        Title
        <input
          maxLength={120}
          value={draft.title ?? ""}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="Prediction"
        />
      </label>
      <label>
        Message
        <textarea
          maxLength={600}
          rows={5}
          value={draft.body ?? ""}
          onChange={(event) => onChange({ ...draft, body: event.target.value })}
          placeholder="The word you named was horizon."
        />
      </label>
      <label>
        Footer
        <input
          maxLength={160}
          value={draft.footer ?? ""}
          onChange={(event) => onChange({ ...draft, footer: event.target.value })}
          placeholder="Optional"
        />
      </label>
    </div>
  );
}

function CustomTextReveal({ payload }: { payload: CustomTextPayload | { kind: string } }) {
  if (payload.kind !== "custom_text") return null;
  const text = payload as CustomTextPayload;
  return (
    <article className="reveal-result reveal-result--text">
      <p className="reveal-result__kind">Text result</p>
      {text.title ? <h2>{text.title}</h2> : null}
      <p className="reveal-result__body">{text.body}</p>
      {text.footer ? <p className="reveal-result__footer">{text.footer}</p> : null}
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
