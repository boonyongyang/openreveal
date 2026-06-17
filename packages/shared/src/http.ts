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

export const PlacesAutocompleteRequestSchema = Type.Object({
  input: Type.String({ minLength: 1, maxLength: 200 }),
  sessionToken: Type.String({ minLength: 8, maxLength: 120 })
});

export const PlacePredictionSchema = Type.Object({
  placeId: Type.String(),
  text: Type.String(),
  mainText: Type.Optional(Type.String()),
  secondaryText: Type.Optional(Type.String())
});

export const PlacesAutocompleteResponseSchema = Type.Object({
  ok: Type.Literal(true),
  predictions: Type.Array(PlacePredictionSchema)
});

export const PlaceDetailsResponseSchema = Type.Object({
  ok: Type.Literal(true),
  place: Type.Object({
    placeId: Type.String(),
    name: Type.String(),
    formattedAddress: Type.Optional(Type.String()),
    lat: Type.Optional(Type.Number()),
    lng: Type.Optional(Type.Number())
  })
});

export const AppCapabilitiesResponseSchema = Type.Object({
  places: Type.Object({
    enabled: Type.Boolean()
  })
});

export type LoginRequest = Static<typeof LoginRequestSchema>;
export type SessionCreateResponse = Static<typeof SessionCreateResponseSchema>;
export type PrepareRevealRequest = Static<typeof PrepareRevealRequestSchema>;
export type RevealActionResponse = Static<typeof RevealActionResponseSchema>;
export type PlacesAutocompleteRequest = Static<typeof PlacesAutocompleteRequestSchema>;
export type PlacePrediction = Static<typeof PlacePredictionSchema>;
export type PlacesAutocompleteResponse = Static<typeof PlacesAutocompleteResponseSchema>;
export type PlaceDetailsResponse = Static<typeof PlaceDetailsResponseSchema>;
export type AppCapabilitiesResponse = Static<typeof AppCapabilitiesResponseSchema>;

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
