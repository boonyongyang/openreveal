import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";

export const LocationPayloadSchema = Type.Object({
  kind: Type.Literal("location"),
  name: Type.String({ minLength: 1, maxLength: 200 }),
  region: Type.Optional(Type.String({ maxLength: 200 })),
  country: Type.Optional(Type.String({ maxLength: 200 })),
  lat: Type.Optional(Type.Number({ minimum: -90, maximum: 90 })),
  lng: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
  mapsUrl: Type.String({ format: "uri", maxLength: 1000 })
});

export const CelebrityPayloadSchema = Type.Object({
  kind: Type.Literal("celebrity"),
  name: Type.String({ minLength: 1, maxLength: 200 }),
  subtitle: Type.Optional(Type.String({ maxLength: 200 })),
  sourceUrl: Type.Optional(Type.String({ format: "uri", maxLength: 1000 }))
});

export const CustomTextPayloadSchema = Type.Object({
  kind: Type.Literal("custom_text"),
  title: Type.Optional(Type.String({ maxLength: 120 })),
  body: Type.String({ minLength: 1, maxLength: 600 }),
  footer: Type.Optional(Type.String({ maxLength: 160 }))
});

export const EffectKindSchema = Type.Union([
  Type.Literal("location"),
  Type.Literal("celebrity"),
  Type.Literal("custom_text")
]);

export const RevealPayloadSchema = Type.Union([
  LocationPayloadSchema,
  CelebrityPayloadSchema,
  CustomTextPayloadSchema
]);

export type LocationPayload = Static<typeof LocationPayloadSchema>;
export type CelebrityPayload = Static<typeof CelebrityPayloadSchema>;
export type CustomTextPayload = Static<typeof CustomTextPayloadSchema>;
export type RevealPayload = Static<typeof RevealPayloadSchema>;
export type EffectKind = RevealPayload["kind"];

export interface EffectDefinition<TPayload extends RevealPayload = RevealPayload> {
  kind: TPayload["kind"];
  label: string;
  payloadSchema: unknown;
  sample: TPayload;
}

export const effectDefinitions = {
  location: {
    kind: "location",
    label: "Location",
    payloadSchema: LocationPayloadSchema,
    sample: {
      kind: "location",
      name: "Kuala Lumpur",
      country: "Malaysia",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kuala%20Lumpur"
    }
  },
  celebrity: {
    kind: "celebrity",
    label: "Celebrity",
    payloadSchema: CelebrityPayloadSchema,
    sample: {
      kind: "celebrity",
      name: "Michelle Yeoh",
      subtitle: "Actor"
    }
  },
  custom_text: {
    kind: "custom_text",
    label: "Custom text",
    payloadSchema: CustomTextPayloadSchema,
    sample: {
      kind: "custom_text",
      title: "Tonight's word",
      body: "The thought you held onto was: impossible.",
      footer: "OpenReveal"
    }
  }
} satisfies Record<EffectKind, EffectDefinition>;
