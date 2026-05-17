import type { EffectKind, RevealPayload } from "@openreveal/shared";

export interface ServerEffect<TPayload extends RevealPayload = RevealPayload> {
  kind: EffectKind;
  validate: (input: unknown) => TPayload;
  enrich?: (payload: TPayload) => Promise<TPayload>;
}

export const serverEffects = new Map<EffectKind, ServerEffect>();

export function registerServerEffect<TPayload extends RevealPayload>(effect: ServerEffect<TPayload>) {
  if (serverEffects.has(effect.kind)) {
    return;
  }
  serverEffects.set(effect.kind, effect as unknown as ServerEffect);
}
