import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { EffectKindSchema, RevealPayloadSchema } from "./effects.js";

export const LoginRequestSchema = Type.Object({
  passphrase: Type.String({ minLength: 1 })
});

export const SessionCreateResponseSchema = Type.Object({
  sessionCode: Type.String(),
  receiverUrl: Type.String(),
  qrSvg: Type.String(),
  expiresAt: Type.String()
});

export const PrepareRevealRequestSchema = Type.Object({
  kind: EffectKindSchema,
  input: Type.Record(Type.String(), Type.Unknown())
});

export const RevealActionResponseSchema = Type.Object({
  ok: Type.Literal(true),
  revealId: Type.String(),
  kind: EffectKindSchema,
  payload: Type.Optional(RevealPayloadSchema)
});

export type LoginRequest = Static<typeof LoginRequestSchema>;
export type SessionCreateResponse = Static<typeof SessionCreateResponseSchema>;
export type PrepareRevealRequest = Static<typeof PrepareRevealRequestSchema>;
export type RevealActionResponse = Static<typeof RevealActionResponseSchema>;

export interface ConsoleSessionState {
  sessionCode: string;
  receiverUrl: string;
  expiresAt: string;
  status: "live" | "expired";
  connectionState: "disconnected" | "connecting" | "foregrounded" | "backgrounded";
  receiver?: {
    deviceId: string;
    ua: string;
    lastSeenAt: string;
  };
}
