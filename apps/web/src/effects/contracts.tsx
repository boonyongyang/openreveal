import type { ComponentType } from "react";

import type { EffectKind, RevealPayload } from "@openreveal/shared";

export type EffectFormValue = Record<string, unknown>;

export interface WebEffect {
  kind: EffectKind;
  label: string;
  sample: RevealPayload;
  PerformerForm: ComponentType<{
    value: EffectFormValue;
    onChange: (next: EffectFormValue) => void;
  }>;
  SpectatorReveal: ComponentType<{ payload: RevealPayload }>;
}

export const webEffects = new Map<EffectKind, WebEffect>();

export function registerWebEffect(effect: WebEffect) {
  if (webEffects.has(effect.kind)) {
    return;
  }
  webEffects.set(effect.kind, effect);
}
