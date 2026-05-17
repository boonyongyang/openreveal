# OpenReveal Plan

## Purpose

OpenReveal is an open-source, consent-based mentalism PWA inspired by the broad spectator-phone performance category. It is not a clone of Inject, Google, or any other branded product. The product should let a performer invite a spectator to open a link on their own phone, place the phone down, and later reveal a location, celebrity, or other chosen item through an original spectator-facing page controlled from the performer's console.

The first build should prove the core two-device illusion:

- A spectator opens a short receiver URL or QR code.
- The performer opens a private control console.
- Both devices join the same live session.
- The performer sends a reveal.
- The spectator page updates instantly and convincingly.

## Product Defaults

- Target platform: web PWA first.
- V1 effects: location reveal and celebrity reveal.
- Reveal model: original branded reveal pages, with optional official Google Maps deep links.
- Core architecture: Node 22.12+, pnpm workspaces, Vite + React + TypeScript, Fastify, `@fastify/websocket`, SQLite via Drizzle + libsql, TypeBox/Ajv schemas, Vitest, and Playwright.
- License: AGPL-3.0.
- Open-source posture: original name, copy, UI, assets, and routines; no Inject branding, no Google UI cloning, and no hidden device control.

## Core User Roles

- Performer: creates sessions, chooses effects, monitors receiver status, sends reveals, resets routines, and manages presets.
- Spectator: opens a receiver link on their own phone and sees the effect page update during performance.
- Maintainer: runs the project locally, configures deployment settings, audits safety boundaries, and extends effects.

## V1 Experience

### Session setup

1. Performer creates a new live session.
2. The app generates a short receiver URL and QR code.
3. Spectator opens the receiver URL on their phone.
4. Performer sees the receiver connection status.
5. Performer arms an effect.
6. Spectator places the phone face down or keeps it visible depending on the routine.

### Location reveal

1. Performer searches or selects a location from the performer console.
2. The app stores the intended reveal in the active session.
3. Performer triggers the reveal at the right moment.
4. Spectator page renders an original map/search-style reveal page.
5. Optional: spectator can open the result in Google Maps through an official Maps URL.

### Celebrity reveal

1. Performer searches or selects a celebrity from a preset list or manual input.
2. The app stores the intended reveal in the active session.
3. Performer triggers the reveal.
4. Spectator page renders an original media/search-style reveal page with the celebrity name and optional approved image/source metadata.

## System Architecture

### Spectator PWA

- Route shape: `/r/:sessionCode`.
- Mobile-first layout.
- Joins a realtime channel for the session.
- Shows neutral waiting, armed, revealing, revealed, reset, expired, and disconnected states.
- Does not collect unnecessary personal data.
- Does not impersonate third-party websites.

### Performer PWA

- Authenticated or passphrase-protected dashboard for early builds.
- Creates and manages live sessions.
- Shows connected receiver count, device state, and last event.
- Provides effect controls for location and celebrity reveals.
- Supports reset, session expiry, and demo mode.

### Backend API

- Creates sessions and receiver URLs.
- Stores routines, effects, reveal payloads, and event history.
- Validates performer permissions before mutating sessions.
- Exposes health and version endpoints.
- Keeps session data short-lived by default.

### Realtime Layer

- WebSocket-first transport.
- Session-scoped events only.
- Reconnect support for mobile network changes and screen lock/unlock.
- Acknowledge critical reveal events so the performer can see whether the spectator page received the update.

### Database

- Start with SQLite via Drizzle + libsql for v1.
- Store users, sessions, receiver devices, effect presets, reveal events, and minimal audit logs.
- Add Postgres and Redis later only if live session scale or multi-instance fanout requires it.

## Event Model

Minimum realtime events:

- `receiver.joined`
- `receiver.left`
- `performer.joined`
- `effect_armed`
- `reveal_prepared`
- `reveal_sent`
- `receiver.prepared_ack`
- `receiver.reveal_ack`
- `session_reset`
- `session_expired`
- `session_state`
- `connection_state_changed`

## Data Model

Minimum entities:

- `User`: performer account or local admin identity.
- `Session`: short-lived performance room with a code, status, expiry, and owner.
- `ReceiverDevice`: spectator browser instance connected to a session.
- `EffectPreset`: reusable effect configuration.
- `RevealPayload`: current reveal data for a session.
- `SessionEvent`: append-only event log for debugging and replay during development.

## Milestones

V1 milestones map 1:1 to the phases in `requirements/product-requirements.md` ("V1 Build Order"). Detailed acceptance criteria live there; this file tracks build sequence only.

### Milestone 0 (Phase 1.0): Project scaffold

- Use the locked v1 stack: Node 22.12+, pnpm, Vite React, Fastify, `@fastify/websocket`, Drizzle + libsql, TypeBox/Ajv, Vitest, and Playwright.
- Add README, license, environment example, and basic command surface.
- Scaffold frontend, backend, and shared types.
- Add local development setup for database and realtime server.

### Milestone 1 (Phase 1.1): Live session foundation

- Create session API.
- Performer login via passphrase → signed token.
- Generate receiver URL and QR code.
- Implement spectator waiting page in its final neutral search-style visual.
- Implement performer console session status panel.
- Add WebSocket join, leave, reconnect, and heartbeat behavior.

### Milestone 2 (Phase 1.2): Location reveal

- Add performer location input.
- Implement `reveal_prepared` payload pre-fetch.
- Render original spectator location reveal as a result card on the search-style page.
- Add Google Maps URL handoff (no API key required).
- Track reveal delivery acknowledgements.
- Add reset behavior.
- Browser-test the prepared foreground/local 250ms p95 latency target.

### Milestone 3 (Phase 1.3): Celebrity reveal

- Add performer celebrity input and built-in preset list.
- Render original spectator celebrity reveal as a result card.
- Reuse the effect-plugin shape from Milestone 2 with no core changes.
- No images in v1.

### Milestone 4 (Phase 1.4): Reliability and safety hardening

- Session expiry edge cases and rate limits.
- Sanitized audit log.
- Privacy notice page.
- CSP and anti-framing headers.
- Abuse-report path.
- Mobile QA matrix run on the latest two majors of iPhone Safari and Android Chrome.

### Beyond v1

Future phases (Performance polish, Effect kit expansion, Performer power tools, Multi-receiver and scale, Distribution and ecosystem) are sequenced in `requirements/product-requirements.md` under "Future Phases". They are not started until v1 is publicly deployable.

## Testing Strategy

- Unit test shared event schemas and reveal payload validation.
- API test session creation, expiry, permission checks, and reset behavior.
- Realtime test join, reveal, acknowledgement, reconnect, and multi-receiver isolation.
- Browser test spectator and performer flows on desktop viewport.
- Manual mobile QA on iPhone Safari and Android Chrome.
- Security smoke test that one session cannot control another session.

## Acceptance Criteria

- A performer can create a session and share a receiver URL.
- A spectator can open the URL on a phone without installing a native app.
- The performer can see when the receiver is connected.
- The performer can send a location reveal and reset it.
- The performer can send a celebrity reveal and reset it.
- Prepared foreground/local reveals hit p95 under 250ms; real mobile 4G reveal delivery is best-effort under one second, and locked/backgrounded devices restore the latest state on resume.
- Expired sessions cannot be controlled.
- Spectator pages never clone Google, Inject, or other branded interfaces.
- The codebase documents setup, safety boundaries, and technical requirements clearly.
- The codebase includes a starter guide and command reference so a new contributor knows exactly how to run, verify, and rehearse the app.
- Local desktop Chromium demo-mode prepared foreground reveals currently measure p95 7ms across 20 samples; see `requirements/latency-report.md`.

## V1 Decisions

Resolved from previous open questions:

- Auth: single env-configured performer passphrase that mints a signed token. No multi-user accounts in v1.
- Database: SQLite, single-instance backend. Postgres and multi-instance fanout are post-v1.
- Package manager: pnpm.
- Celebrity images: excluded from v1 to avoid licensing risk. Text-only celebrity reveals.
- Spectator pre-reveal page: neutral original "search-style" page with this project's own branding. Not a Google clone.
- Product identity: OpenReveal.
- License: AGPL-3.0.
- WebSocket performer auth: same-origin HttpOnly cookie, not token-bearing query strings.

## Open Questions

- Final domain.
- Deployment host for the reference public instance.

## Current Implementation State

Milestone 0 and the Milestone 1 shell are implemented. The current app supports performer login, session creation, receiver URL/QR, spectator waiting page, WebSocket connection state, demo mode, reset, prepared reveal delivery, and reveal acknowledgements.

The core implementation for Milestones 2 and 3 is in place: shared effect definitions and payload schemas, API-side effect validation/enrichment, web-side performer forms, spectator reveal components, location reveal with official Google Maps search URL handoff, and text-only celebrity reveal with auditable preset metadata. Phase 6 includes a custom text reveal and local preset import/export using the same split effect contract. Remaining acceptance work is physical-device QA and owner deployment configuration.

Milestone 4 hardening is implemented except for physical-device QA. The current app includes a public `/privacy` page, baseline CSP/anti-framing headers for frontend and API responses, API security-header test coverage, a Playwright privacy/header flow, a repeatable local latency runner, a recorded local p95 result, and a real-device mobile QA checklist. Phase 4C performer-console polish is implemented with explicit control readiness text, armed reveal summary, expiry countdown, receiver state history, ended-session lockout, and clearer new-session abandonment copy. Phase 4D production readiness is implemented with a single-node deployment guide, Dockerfile, API production startup validation, optional API static serving for `WEB_DIST_DIR`, dependency audit command, and GitHub Actions CI. Phase 5 contributor surface is implemented with contributor docs, issue templates, PR checklist, effect authoring guide, routine-pack licensing guidance, and architecture diagram. Remaining Phase 4B work is physical iPhone Safari and Android Chrome verification.

The remaining work is tracked in `PHASED-TASKS.md`, with Phase 7 deployment closure as the active phase. Phase 4A now includes expiry cleanup behavior, same-origin CSRF guarding for state-changing API requests, a maintenance cleanup command for old session data, and hosted-instance report guidance.

Phase 4B has started with SQLite-backed restoration of the active reveal when a receiver joins or reconnects after the performer has already sent it. Receiver reconnects also use a stable browser-local device id so the same phone can replace its stale socket without being rejected as a second spectator. Transient receiver preflight and WebSocket transport failures now stay in reconnecting mode with capped backoff instead of showing the inactive page.

The performer console now records the latest receiver render latency from `receiver.reveal_ack`. Local desktop Chromium p95 has been recorded; the remaining latency work is physical-device observation on iPhone Safari and Android Chrome.

## Next Implementation Step

Celebrity preset source/license metadata is implemented as factual name-only shared preset metadata. Custom text reveal and local JSON preset import/export are complete. Optional Places autocomplete and image reveals have been evaluated and deferred until after the first public deployment.

The active next phase is Phase 7 deployment closure: complete owner deployment inputs, run physical-device QA, set production environment variables, verify Docker if it is the chosen deployment path, and push the baseline commit or create a release tag before deploying from a public repository.
