import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { CONNECTION_STATES } from "./constants.js";
import { RevealPayloadSchema } from "./effects.js";

const ConnectionStateSchema = Type.Union([
  Type.Literal("disconnected"),
  Type.Literal("connecting"),
  Type.Literal("foregrounded"),
  Type.Literal("backgrounded")
]);

export const WsEnvelopeSchema = Type.Object({
  v: Type.Literal(1),
  seq: Type.Number(),
  ts: Type.Number(),
  sessionCode: Type.String(),
  type: Type.String(),
  data: Type.Unknown()
});

export const ReceiverHeartbeatSchema = Type.Object({
  visibility: Type.Union([Type.Literal("visible"), Type.Literal("hidden")])
});

export const WsServerEventSchema = Type.Union([
  Type.Object({
    type: Type.Literal("receiver.joined"),
    data: Type.Object({ deviceId: Type.String(), ua: Type.String() })
  }),
  Type.Object({
    type: Type.Literal("receiver.left"),
    data: Type.Object({
      deviceId: Type.String(),
      reason: Type.Union([
        Type.Literal("closed"),
        Type.Literal("timeout"),
        Type.Literal("replaced")
      ])
    })
  }),
  Type.Object({
    type: Type.Literal("performer.joined"),
    data: Type.Object({})
  }),
  Type.Object({
    type: Type.Literal("connection_state_changed"),
    data: Type.Object({ state: ConnectionStateSchema })
  }),
  Type.Object({
    type: Type.Literal("effect_armed"),
    data: Type.Object({ effectKind: Type.String() })
  }),
  Type.Object({
    type: Type.Literal("reveal_prepared"),
    data: Type.Object({
      revealId: Type.String(),
      kind: Type.String(),
      payload: Type.Optional(RevealPayloadSchema)
    })
  }),
  Type.Object({
    type: Type.Literal("reveal_sent"),
    data: Type.Object({ revealId: Type.String() })
  }),
  Type.Object({
    type: Type.Literal("receiver.prepared_ack"),
    data: Type.Object({ revealId: Type.String() })
  }),
  Type.Object({
    type: Type.Literal("receiver.reveal_ack"),
    data: Type.Object({
      revealId: Type.String(),
      renderedAtMs: Type.Number(),
      latencyMs: Type.Optional(Type.Number())
    })
  }),
  Type.Object({
    type: Type.Literal("session_reset"),
    data: Type.Object({})
  }),
  Type.Object({
    type: Type.Literal("session_expired"),
    data: Type.Object({
      reason: Type.Union([
        Type.Literal("ttl"),
        Type.Literal("ended_by_performer"),
        Type.Literal("admin")
      ])
    })
  }),
  Type.Object({
    type: Type.Literal("session_state"),
    data: Type.Object({
      status: Type.Union([
        Type.Literal("live"),
        Type.Literal("expired"),
        Type.Literal("in_use")
      ]),
      connectionState: ConnectionStateSchema,
      activeRevealId: Type.Optional(Type.String())
    })
  })
]);

export type ConnectionState = (typeof CONNECTION_STATES)[number];
export type WsEnvelope = Static<typeof WsEnvelopeSchema>;
export type ReceiverHeartbeat = Static<typeof ReceiverHeartbeatSchema>;
export type WsServerEvent = Static<typeof WsServerEventSchema>;

export type ClientEvent =
  | { type: "client.resume"; data: { lastSeq: number } }
  | { type: "receiver.heartbeat"; data: ReceiverHeartbeat }
  | { type: "receiver.prepared_ack"; data: { revealId: string } }
  | { type: "receiver.reveal_ack"; data: { revealId: string; renderedAtMs: number; latencyMs?: number } };
