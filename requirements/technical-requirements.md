# Technical Requirements

## Architecture Requirements

The system should be built as a web-first PWA with a backend API and realtime transport.

Locked v1 stack:

- Runtime/package manager: Node 22.12+ and pnpm workspaces.
- Frontend: Vite + React + TypeScript.
- Backend: Node.js + TypeScript + Fastify.
- Realtime: `@fastify/websocket` on top of standard WebSockets.
- Database: SQLite via Drizzle + libsql for v1. Postgres is post-v1.
- Validation: TypeBox schemas with Fastify/Ajv validation.
- Testing: Vitest for unit/API tests and Playwright for browser flows. `tsc --noEmit` remains a separate typecheck.

## Applications

### Spectator PWA

Required behavior:

- Serve receiver routes such as `/r/:sessionCode`.
- Load quickly on mobile browsers.
- Join the realtime session after page load.
- Render waiting, armed, revealed, reset, expired, and reconnecting states.
- Acknowledge reveal delivery to the backend.
- Avoid third-party UI cloning.

### Performer PWA

Required behavior:

- Create sessions.
- Show receiver URL and QR code.
- Show live receiver status.
- Select active effect.
- Prepare reveal payload.
- Send reveal payload.
- Reset session.
- See delivery acknowledgement.

### Backend API

Required behavior:

- Create session.
- Fetch session status.
- Prepare reveal.
- Send reveal.
- Reset session.
- Expire session.
- Serve health/version endpoint.
- Enforce authorization on performer actions.

#### HTTP API surface (v1)

All endpoints are JSON. Performer endpoints require the signed HttpOnly same-origin cookie minted by `/api/auth/login`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | none | Exchange `PERFORMER_PASSPHRASE` for a signed token. |
| `POST` | `/api/auth/logout` | performer | Clear the token cookie. |
| `POST` | `/api/sessions` | performer | Create session. Returns `{ sessionCode, receiverUrl, qrSvg, expiresAt }`. |
| `GET` | `/api/sessions/:code` | performer | Fetch full session state for the console. |
| `POST` | `/api/sessions/:code/reveal/prepare` | performer | Validate and stage a reveal payload; emits `reveal_prepared`. |
| `POST` | `/api/sessions/:code/reveal/send` | performer | Trigger the staged reveal; emits `reveal_sent`. |
| `POST` | `/api/sessions/:code/reset` | performer | Clear active reveal; emits `session_reset`. |
| `POST` | `/api/sessions/:code/end` | performer | Terminate session; emits `session_expired`. |
| `GET` | `/api/receiver/:code` | none, rate-limited | Lightweight check used by the spectator page before opening the WebSocket. The v1 limit is bounded but mobile-friendly for reconnect flows. Returns `{ status: "live" | "expired" | "in_use" }`. |
| `GET` | `/api/health` | none | Liveness + version. |

WebSocket:

- `GET /ws?code=<sessionCode>&role=performer` for performers. Auth uses the same-origin HttpOnly cookie, not a token query parameter.
- `GET /ws?code=<sessionCode>&role=receiver` for spectators (no token; bound to the session code only).

#### Security headers

V1 sets baseline browser safety headers on both frontend and API responses:

- `Content-Security-Policy` with `frame-ancestors 'none'`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: no-referrer`.
- `X-Content-Type-Options: nosniff`.

Production hosting must preserve equivalent headers when the built frontend is served outside Vite preview.

#### CSRF posture

Performer authentication uses an HttpOnly `SameSite=Lax` cookie. V1 also rejects state-changing `/api` requests when a browser supplies an `Origin` or `Referer` outside the configured `APP_BASE_URL` or `API_BASE_URL` origins. Requests without browser origin headers remain allowed so local CLI tests, health checks, and same-process API tests can run without inventing browser headers.

This is a v1 same-origin guard, not a replacement for future multi-user CSRF tokens if account-based auth is added.

## Realtime Requirements

Use WebSockets for v1. Server-sent events can be evaluated later if the app only needs one-way updates, but WebSocket better supports receiver acknowledgements and performer status updates.

### Message envelope

Every WebSocket frame uses a common JSON envelope. The shared package owns this type.

```ts
interface WsEnvelope<T extends WsEvent = WsEvent> {
  v: 1;                    // protocol version
  seq: number;             // monotonic per session, assigned by server
  ts: number;              // server epoch ms when emitted
  sessionCode: string;
  type: T["type"];
  data: T["data"];
}
```

- The server assigns `seq` for every outbound frame in a session. Clients ignore frames whose `seq` is not greater than the last applied `seq` for that session.
- Clients send their own envelopes for `receiver.heartbeat`, `receiver.prepared_ack`, and `receiver.reveal_ack` only. Server validates `seq` is not used as a trust signal on inbound frames.
- On reconnect or receiver join, the server replies with the latest authoritative state. If an active reveal exists, the server replays `reveal_prepared`; if the reveal was already sent or acknowledged, it also replays `reveal_sent`. Full event-log replay is not required in v1.

### Event catalog

Each event has a stable string `type` and a typed `data` payload. Direction `S→R` = server to receiver, `S→P` = server to performer, `S→*` = both.

| Type | Direction | Data | Notes |
| --- | --- | --- | --- |
| `receiver.joined` | S→P | `{ deviceId, ua }` | UA is a sanitized summary string only. |
| `receiver.left` | S→P | `{ deviceId, reason }` | `reason` ∈ `closed` \| `timeout` \| `replaced`. |
| `performer.joined` | S→P | `{}` | Echoed to other performer tabs. |
| `connection_state_changed` | S→P | `{ state }` | `state` ∈ `disconnected` \| `connecting` \| `foregrounded` \| `backgrounded`. |
| `effect_armed` | S→* | `{ effectKind }` | Receiver uses this to clear any cached prior payload. |
| `reveal_prepared` | S→R | `{ revealId, kind, payload }` | Full payload, kept in memory only. |
| `reveal_prepared` | S→P | `{ revealId, kind }` | Performer console gets metadata only, never the payload. |
| `receiver.prepared_ack` | R→S | `{ revealId }` | Spectator confirms cache. |
| `reveal_sent` | S→R | `{ revealId }` | Trigger only; receiver renders cached payload. |
| `receiver.reveal_ack` | R→S | `{ revealId, renderedAtMs, latencyMs? }` | For latency measurement. |
| `session_reset` | S→* | `{}` | Clears any active or cached reveal. |
| `session_expired` | S→* | `{ reason }` | `reason` ∈ `ttl` \| `ended_by_performer` \| `admin`. |
| `session_state` | S→* | `{ status, connectionState, activeRevealId? }` | Latest authoritative state on join/resume. |
| `receiver.heartbeat` | R→S | `{}` | Sent every 15s; missing 2 in a row marks `backgrounded`. |

Event requirements:

- Events must be scoped to one session; the server rejects any frame whose `sessionCode` does not match the connection.
- Performer-only mutating events (`prepare`, `send`, `reset`, `end`) are HTTP, not WebSocket. The WebSocket carries notifications only.
- Receiver clients must not be able to mutate the session except for join, heartbeat, and acknowledgement events.
- Reveal messages include `revealId` (UUID) and the envelope `seq`. Clients ignore stale `revealId`s if a newer arm has occurred.
- Clients reconnect automatically and request the latest session state on resume.
- Receiver joins after a sent reveal must restore the latest active reveal from SQLite, not only from the in-memory WebSocket hub.
- Receiver clients persist a browser-local device id per session. A reconnect with the same device id may replace its stale receiver socket; a different device remains `in_use` while the original receiver is active.

### Connection state vocabulary

The performer console connection panel uses a single canonical vocabulary; backend and frontend share these constants from the shared package.

- `disconnected`: no live WebSocket; no heartbeats received in the last 30s.
- `connecting`: WebSocket open initiated, no `receiver.joined` yet.
- `foregrounded`: spectator socket open and Page Visibility API reports `visible`.
- `backgrounded`: socket open but Page Visibility reports `hidden`, OR two heartbeats missed.

Spectator client must call `document.visibilityState` and emit a small `state` field on its heartbeat so the server can derive foreground/background without hitting flaky mobile JS lifecycle events.

Event requirements:

- Events must be scoped to one session.
- Performer-only actions must require a performer token or authenticated user.
- Receiver clients must not be able to mutate the session except for join, heartbeat, and acknowledgement events.
- Reveal messages should include a monotonic sequence number to ignore stale updates.
- Clients should reconnect automatically and request the latest session state after reconnect.

### Reveal latency and pre-fetch

The perceived-instant reveal is core to the effect. The `reveal_prepared` event must deliver the full reveal payload to the spectator client ahead of time, so that `reveal_sent` is a local state flip rather than a network round-trip.

- `reveal_prepared`: full payload sent to spectator, kept in memory only, not rendered.
- `reveal_sent`: small trigger message; spectator client renders the already-cached payload.
- `receiver.reveal_ack`: receiver reports `latencyMs` from the `reveal_sent` envelope timestamp to local render acknowledgement; performer console shows the latest measured latency.
- Latency target: p95 < 250ms from performer trigger to spectator render for prepared foreground/local browser tests. Real mobile 4G is best-effort under one second. Locked/backgrounded devices must restore the latest state on resume without a revealing animation.
- If `reveal_prepared` has not been acknowledged by the spectator, the performer console must surface that the spectator is not yet armed and block `reveal_sent` until prepared-ack lands or the performer overrides.

### Single-instance constraint for v1

V1 backend runs as a single Node process. WebSocket fanout uses in-memory pub/sub. Multi-instance deployment requires a Redis (or equivalent) pub/sub layer and is explicitly out of scope for v1. Setup and deployment docs must reflect this.

Production serving:

- The supported v1 production process can serve the built web app and API from one Node process.
- `WEB_DIST_DIR` points the API at `apps/web/dist` or the equivalent deployment path.
- Unknown non-API GET/HEAD routes fall back to the web `index.html` for PWA routing.
- `/api/*` and `/ws` remain API/WebSocket routes and do not fall through to the SPA.
- Production startup validation rejects unsafe defaults before the server starts.

## Effect Contract

Every reveal effect (location, celebrity, and all future effects in Phase 3+) ships through a split contract. Shared code owns schemas and discriminators, API code owns validation/enrichment/persistence, and web code owns performer/spectator React components. Backend code must never import React components.

### Shared effect shape

```ts
type EffectKind = "location" | "celebrity";

interface EffectDefinition<TPayload> {
  kind: EffectKind;
  label: string;
  payloadSchema: TSchema;
  sample: TPayload;
}
```

### API effect shape

```ts
interface ServerEffect<TPayload> {
  kind: EffectKind;
  validate: (input: unknown) => TPayload;
  enrich?: (payload: TPayload) => Promise<TPayload>;
}
```

### Web effect shape

```ts
interface WebEffect<TPayload> {
  kind: EffectKind;
  label: string;
  sample: TPayload;

  PerformerForm: React.ComponentType<{
    value: Partial<TPayload>;
    onChange: (next: Partial<TPayload>) => void;
  }>;

  SpectatorReveal: React.ComponentType<{ payload: TPayload }>;
}
```

### Registration

The current built-in effect kinds are `location`, `celebrity`, and `custom_text`. `packages/shared` exports the definitions and TypeBox schemas. `apps/api` registers server effects. `apps/web` registers UI effects.

### Core boundary rules

- Core code (session, auth, realtime, persistence) must be free of any `if (kind === "location")`-style branching. Differences between effects live in the split effect registries.
- The reveal payload stored in the database is `{ kind, payload, revealId, seq }`; the database does not know about effect-specific columns.
- The shared package exports payload schemas and event types only. It does not import React or backend-only modules.
- Adding a new effect (Phase 3) consists of: add a shared schema/definition, add an API effect validator/enricher, add web performer/spectator components, add unit tests, add a Playwright flow test, and update docs. No core session/realtime/auth changes.

### Built-in effect payloads (v1)

```ts
type LocationPayload = {
  kind: "location";
  name: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
  mapsUrl: string; // computed by enrich()
};

type CelebrityPayload = {
  kind: "celebrity";
  name: string;
  subtitle?: string;
  sourceUrl?: string;
};

type CustomTextPayload = {
  kind: "custom_text";
  title?: string;
  body: string;
  footer?: string;
};
```

All string fields are validated for length, stripped of control characters, and HTML-escaped at render time. Most short text fields are capped at 200 chars; custom text caps title at 120 chars, body at 600 chars, and footer at 160 chars. URL fields must parse to `https:` URLs only.

## Data Requirements

Minimum entities:

- `User`: performer/admin identity. V1 has a single implicit user derived from `PERFORMER_PASSPHRASE`; the table exists for the post-v1 multi-user phase.
- `Session`: `id`, `code`, `ownerId`, `status` (`live` \| `expired`), `activeRevealId?`, `createdAt`, `expiresAt`.
- `ReceiverDevice`: `id`, `sessionId`, `connectionId`, `uaSummary`, `joinedAt`, `lastSeenAt`, `state` (foreground/background).
- `EffectPreset`: `id`, `kind`, `label`, `payloadJson`. Persistent/shared preset storage is post-v1; Phase 6 currently supports local browser import/export with the `openreveal.effect-preset.v1` JSON format.
- `CelebrityPreset`: repo-bundled text preset metadata in `packages/shared`; includes `id`, `name`, `subtitle`, `sourceLabel`, `license`, and `licenseNote`. These are factual name-only labels with original category text, not biographies or image assets.
- `RevealPayload`: `id` (revealId), `sessionId`, `kind`, `payloadJson`, `seq`, `status` (`prepared` \| `sent` \| `acked` \| `reset`), `createdAt`, `sentAt?`, `ackedAt?`.
- `SessionEvent` (audit log): `id`, `sessionId`, `eventType`, `actor` (`performer` \| `receiver` \| `system`), `timestamp`, `metaJson` (sanitized: no payload contents, only kind + revealId + outcome).

Default retention:

- Live sessions expire automatically at TTL (default 30 minutes).
- `SessionEvent` rows are deleted 24 hours after session expiry by the maintenance cleanup command.
- `RevealPayload` rows are reset on session expiry; the maintenance cleanup command deletes old rows after retention.
- `ReceiverDevice` rows are deleted by the maintenance cleanup command after session retention.

Maintenance command:

```sh
pnpm maintenance:cleanup
pnpm maintenance:cleanup -- --retention-hours=24
```

### Audit log

The `SessionEvent` table is the only persisted record of session activity. Its purpose is debugging and abuse investigation, not analytics.

- Logged event types: `session_created`, `session_ended`, `session_expired`, `receiver_joined`, `receiver_left`, `effect_armed`, `reveal_prepared`, `reveal_sent`, `reveal_acked`, `session_reset`, `auth_failed`.
- `metaJson` must never contain reveal payload contents. It may contain `kind`, `revealId`, latency-ms, and outcome flags.
- IP addresses are hashed (HMAC with `SESSION_SECRET`) before storage; raw IPs are never written.
- Performer console can view its own session's audit log. There is no global admin log viewer in v1.

## Location Requirements

V1 can start with text-based location input. Places autocomplete can be added later.

Required fields:

- Display name.
- Optional region/country.
- Optional latitude/longitude.
- Optional Google Maps URL.

Google Maps handoff:

- Use official Google Maps URL patterns.
- Do not embed or imitate Google Maps unless using approved Google Maps Platform APIs and complying with their terms.
- If using Google Places or Maps JavaScript APIs later, require an API key with domain restrictions.

## Celebrity Requirements

V1 starts with manual text input and a simple text-only preset list.

Required fields:

- Display name.
- Optional subtitle/category.
- Optional source URL.
- Optional image URL only if licensing is clear.

Bundled preset requirements:

- Presets live in shared code so tests and future tooling can audit them without importing React.
- Each preset includes source/license metadata.
- V1 preset metadata uses `factual-name-only` licensing notes, original category text, and no external images, biographies, or copied snippets.

Image requirements:

- Do not hotlink random images.
- Prefer no image in v1 unless a safe asset source is configured.
- If image uploads are added later, validate file type and size.

## Custom Text Requirements

Phase 6 ships custom text as the first post-v1 effect.

Required fields:

- Message body.
- Optional title.
- Optional footer.

Render requirements:

- Preserve readable line breaks.
- Do not render Markdown or HTML supplied by the performer.
- Do not call third-party APIs or load external assets.

## Security Requirements

- Use HTTPS in deployed environments.
- Generate unguessable session codes. V1 spec: 8 characters from a 32-symbol unambiguous alphabet (no `0`, `O`, `1`, `l`, `I`), giving roughly 40 bits of entropy.
- Expire session codes. Default TTL is configurable via `SESSION_TTL_MINUTES`; absolute upper bound is 24 hours.
- Rate limit session creation and reveal actions.
- Rate limit receiver session-status lookup with a bounded mobile-friendly limit. Current v1 default is 60 attempts per IP per minute so reconnect and QA flows do not self-throttle.
- Require performer authorization for session mutation. V1 uses a single env-configured admin passphrase that mints a signed HttpOnly cookie sent with same-origin HTTP and WebSocket requests. Multi-user accounts are post-v1.
- Prevent receiver clients from controlling performer-only actions.
- Validate all payloads on the server.
- Escape all user-provided text in rendered pages.
- Do not store spectator phone numbers, contacts, location, photos, clipboard, or other private device data.
- Send a Content-Security-Policy that disallows framing of the spectator receiver page (`frame-ancestors 'none'`) to prevent clickjacking and embedding in third-party contexts.
- Spectator pages must not be embeddable via `<iframe>` from other origins.

Production env validation:

- `NODE_ENV=production` requires `APP_BASE_URL` and `API_BASE_URL` to use `https://`.
- `SESSION_SECRET` must be changed from the local default and be at least 32 characters.
- `PERFORMER_PASSPHRASE` must be changed from the local default and be at least 12 characters.
- `DATABASE_URL` must point at a persistent production data path.
- `WEB_DIST_DIR` must point at the built web app.

## Privacy Requirements

- Collect the minimum data needed for the routine.
- Avoid storing raw IP addresses unless required for abuse prevention.
- Provide a privacy notice before public deployment.
- Let maintainers configure retention windows.
- Keep logs sanitized.

## Testing Requirements

Required test categories:

- Event schema validation tests.
- API permission tests.
- Session expiry tests.
- Realtime reveal and acknowledgement tests.
- Reconnect tests.
- Browser flow tests for performer and spectator.
- Manual mobile tests for iOS Safari and Android Chrome.
- Latency measurement test asserting prepared foreground/local p95 reveal trigger-to-render under the 250ms target.
- Spectator visual-contract test: waiting and armed states must render identical DOM/visual output.
- Locked-screen reveal test: trigger reveal while spectator phone is locked, then unlock, and verify the latest state is restored without animation that betrays the mechanism.

Minimum manual QA scenarios:

- Create session and open receiver URL.
- Send location reveal.
- Open official Google Maps link from reveal page.
- Reset session.
- Send celebrity reveal.
- Let session expire and verify controls are blocked.
- Disconnect/reconnect spectator phone and verify the same device replaces stale sockets instead of showing `in_use`, and latest state is recovered.
