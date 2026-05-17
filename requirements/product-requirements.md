# Product Requirements

## Product Goal

Create OpenReveal, an open-source mentalism PWA that lets performers run consent-based spectator-phone routines. The performer creates a live session, guides a spectator to open a URL, and reveals a chosen location or celebrity on the spectator's phone through an original page controlled from the performer's console.

The system should feel simple in performance and transparent in implementation. It must be usable by hobbyists, maintainable by open-source contributors, and safe to deploy publicly.

## Audience

- Close-up magicians and mentalists who want web-based phone routines.
- Developers who want to inspect, self-host, or extend the method.
- Performers who prefer a no-native-install spectator flow.

## Roles

### Performer

Needs:

- Create a session quickly.
- Share a QR code or short URL.
- See whether the spectator phone is connected and foregrounded.
- Choose or type a reveal.
- Send, reset, or change the reveal discreetly.
- Rehearse without a real spectator.

### Spectator

Needs:

- Open a link easily.
- See a clean, neutral page that does not betray a remote performance is in progress.
- Avoid installing anything.
- See a working result on iPhone Safari and Android Chrome.

### Maintainer

Needs:

- Run the project locally.
- Configure third-party services safely.
- Add new effects without rewriting the realtime/session system.
- Verify that the project stays consent-based and legally clean.

## V1 Scope Boundary

V1 ships exactly:

- A two-device live-session system (one performer console, one spectator phone).
- Two reveal effects: location and celebrity (text-only).
- Single-process backend, SQLite, single-instance deployment.
- Performer authentication via a single env-configured passphrase.
- Reset, expire, demo mode, basic abuse controls.

Everything else is deferred to a later phase below. Scope creep into the future phases during v1 is the single biggest risk to shipping.

## V1 Feature Set

### F1. Session management

User stories:

- As a performer, I can create a session in one click and get a short URL plus QR code immediately.
- As a performer, I can see the spectator's connection state in real time.
- As a performer, I can reset (clear current reveal) or end (terminate session) at any time.
- As a spectator, I open the URL once and never need to refresh.

Behavior detail:

- Session creation returns `{ sessionCode, receiverUrl, qrSvg, performerToken, expiresAt }`.
- Session code: 8 characters from the unambiguous 32-symbol alphabet defined in technical-requirements.
- Session TTL: configurable via `SESSION_TTL_MINUTES`, default 30 minutes.
- A performer can hold at most 3 concurrent sessions to bound state. Creating a 4th forces them to end one.
- Reset: clears active reveal, spectator returns to neutral page, session stays live.
- End: terminates session, spectator transitions to expired state.
- Expiry: automatic at TTL; same spectator behavior as End.

Edge cases v1 must handle:

- Spectator joins after session expired → expired page.
- Spectator joins with a valid code while session is still warming up (<1s after creation) → waiting page.
- Spectator opens the URL on a second device for the same session → second device shows neutral "session in use elsewhere" message; first device retains primary.
- Performer closes the console tab → session remains live for the TTL; reopening with a valid token resumes control.
- Two performer tabs with the same token → both see live state and can both mutate. No exclusive lock in v1.
- Network drop on either side → silent reconnect; latest state pushed on resume (see F5 reconnect behavior).

Acceptance:

- Performer can create a session and copy the URL or scan the QR in under 5 seconds from console open.
- Spectator joining the URL is reflected in performer console within 1 second.

### F2. Location reveal

User stories:

- As a performer, I type a location name, arm it, and send the reveal at the right moment.
- As a spectator, when the reveal lands I see a result for that location on the same page I had open.
- As a spectator, I can tap "Open in Maps" to open Google Maps via an official URL.

Behavior detail:

- Performer input: free text. V1 has no autocomplete, geocoding, or Places API integration.
- Optional fields the performer can fill manually: region/country, latitude, longitude.
- Reveal payload schema: `{ kind: "location", name, region?, country?, lat?, lng?, mapsUrl }`.
- `mapsUrl` is computed server-side using Google Maps' official query URL (`https://www.google.com/maps/search/?api=1&query=<encoded>`). No API key required.
- Spectator render: a result card on the neutral search-style page showing name, optional region/country subtitle, and an "Open in Maps" link. No embedded map tiles in v1.
- Reset removes the result card and returns the spectator to the neutral page.

Acceptance:

- Performer can arm and send a location reveal end-to-end.
- Spectator sees the result within the prepared foreground/local 250ms p95 latency target; real mobile 4G is best-effort under one second.
- "Open in Maps" opens Google Maps app or web with the correct query.
- Reset returns spectator to neutral page in under 200ms.

### F3. Celebrity reveal

User stories:

- As a performer, I pick a celebrity from a small built-in preset list or type a custom name, then arm and send.
- As a spectator, when the reveal lands I see a result for that celebrity.

Behavior detail:

- Built-in preset list: ~30 widely-known names shipped as JSON. Maintainer-editable in repo, not user-editable in v1.
- Performer can also type a custom name not in the preset.
- Optional fields: subtitle/category (e.g. "Actor", "Musician"), source URL.
- Reveal payload schema: `{ kind: "celebrity", name, subtitle?, sourceUrl? }`.
- Spectator render: a result card with name, optional subtitle, optional "Read more" link to the source URL.
- No images in v1 (licensing risk; see safety-and-legal.md).

Acceptance:

- Performer can arm and send a celebrity reveal end-to-end, both from preset and from custom input.
- Spectator sees the result within the prepared foreground/local latency target.
- Reset returns spectator to neutral page.

### F3A. Custom text reveal

User stories:

- As a performer, I type a short title and message, then arm and send it as a reveal.
- As a spectator, when the reveal lands I see the text on the same original receiver page.

Behavior detail:

- Performer input: optional title, required message body, optional footer.
- Reveal payload schema: `{ kind: "custom_text", title?, body, footer? }`.
- Spectator render: a text result card that preserves readable line breaks and does not render performer-provided HTML or Markdown.
- No third-party API, external asset, or image dependency.

Acceptance:

- Performer can arm and send a custom text reveal end-to-end.
- Spectator sees the result within the prepared foreground/local latency target.
- Reset returns spectator to neutral page.

### F4. Performer console

Layout sections (single-page, no routing inside the console):

- **Session header**: session code, receiver URL with copy button, QR code, expiry countdown, end-session button.
- **Connection panel**: spectator state (disconnected / connecting / foregrounded / backgrounded), last-seen timestamp, prepared-ack indicator, last reveal-ack indicator.
- **Effect tabs**: Location, Celebrity, and Custom text. Each tab has its own input form. Switching tabs disarms any pending reveal to prevent cross-effect mistakes.
- **Reveal control bar**: Arm, Send, Reset buttons with explicit inline disabled/readiness reasons.
- **Demo mode toggle**: opens a sidebar pane that runs a spectator instance against the same session.

Reveal-control state machine:

- No spectator connected → Arm and Send disabled. Inline reason: "Spectator not connected".
- Connected, no effect chosen → Arm enabled, Send disabled.
- Armed, prepared-ack pending → Send shows "Preparing…" with an override link.
- Armed, prepared-ack received → Send enabled, labelled "Send".
- Sent, awaiting reveal-ack → Send replaced by "Sent · awaiting ack".
- Sent, acked → Send replaced by "Delivered ✓"; remains until Reset or new arm.
- Reset is always available while a session is live.

Performer authentication:

- `/console` shows a passphrase prompt. Submitting the value of `PERFORMER_PASSPHRASE` mints a signed token cookie.
- The signed HttpOnly cookie is sent with same-origin WebSocket handshakes and required on all session mutation endpoints.
- Logout clears the cookie. No session-revocation list in v1.

Demo mode:

- Sidebar pane renders a spectator instance against the active session.
- Pane is visually labelled "DEMO" at all times so it cannot be mistaken for a live spectator.
- Used both for rehearsal and for first-run verification after `pnpm dev`.

Acceptance:

- A new performer can complete login → create session → arm → send → reset for both effects without leaving the console.
- All disabled buttons explain why in nearby inline text; button titles may duplicate the reason.
- Demo mode round-trips a reveal in the same browser.

### F5. Spectator receiver

States:

- **Waiting**: neutral search-style page. No remote-control hints. No spinner.
- **Armed**: visually identical to waiting. The reveal payload may already be cached client-side via `reveal_prepared` but is not yet rendered.
- **Revealed**: the result appears as a search result on the existing page (in-place transition, not a full takeover).
- **Reset**: result removed; back to the waiting visual.
- **Expired**: neutral "this page is no longer active" message. No mention of performances.
- **Disconnected/reconnecting**: silent reconnect for the first 5 seconds. After 5s, a faint non-alarming indicator (e.g. small dot in corner). Latest state is requested on reconnect and applied without animation.

Visual contract:

- Waiting and armed must render identical DOM.
- The pre-reveal page is a generic, finished-looking search-style landing page using this project's own name, color, and typography.
- The page must not impersonate Google, Apple, Inject, or any other third-party product. No third-party logos, no copied layouts, no spoofed URL bars. See safety-and-legal.md "Maps And Search Requirements".
- The reveal transition feels like a normal in-page interaction (e.g. a result appearing on the same search-style page).

Early-pickup behavior:

- If the spectator picks the phone up before the reveal, the page must continue to look neutral.
- The performer console must surface that the spectator is foregrounded so the performer can adapt the routine.

Acceptance:

- Waiting and armed render identical visible output (asserted in browser tests).
- Prepared foreground/local reveal renders within the 250ms p95 target.
- Locked screen → reveal sent → unlock restores the latest state without an animation that betrays the mechanism.
- Page is not framable from third-party origins (CSP `frame-ancestors 'none'`).

## V1 Build Order

Each phase below corresponds to a milestone in plan.md. A phase is not started until the previous phase passes its acceptance criteria.

### Phase 1.0 — Scaffolding

- Workspace structure, lint, types, env example, basic CI commands.
- No product features yet.
- Done when: `pnpm install && pnpm dev` boots an empty frontend and backend; `pnpm test` and `pnpm lint` pass on the empty repo.

### Phase 1.1 — Session foundation

- Create-session API.
- Performer login (passphrase → signed token).
- Session header with QR code and expiry.
- Spectator waiting page (neutral search-style layout, final visual).
- WebSocket join, leave, heartbeat, reconnect.
- Connection panel in performer console.
- Done when: performer creates session, spectator joins, both see live connection state. No reveals yet.

### Phase 1.2 — Location reveal

- Land the effect-plugin contract from `technical-requirements.md` "Effect Plugin Contract" before writing the location effect. The contract must exist before the first effect is built; otherwise the second effect (Phase 1.3) will require a refactor.
- Implement location as the first plugin: `validate`, `enrich` (Maps URL), `PerformerForm`, `SpectatorReveal`.
- `reveal_prepared` payload pre-fetch wired through the registry, not effect-specific code.
- `reveal_sent` local trigger and spectator result card.
- Reset behavior.
- Latency assertion for prepared foreground/local browser tests.
- Done when: full end-to-end illusion works for location on iPhone Safari and Android Chrome, and the core session/realtime code has zero references to the string `"location"`.

### Phase 1.3 — Celebrity reveal

- Celebrity form + preset list.
- Spectator result card (reusing the same effect-plugin shape as location).
- Done when: second effect ships without modifying core session/realtime code, proving the plugin shape.

### Phase 1.4 — Reliability and safety hardening

- Rate limits on session creation, code lookup, and reveal endpoints.
- Session expiry edge case coverage.
- Sanitized audit log.
- Privacy notice page.
- Mobile QA matrix run.
- CSP and anti-framing headers.
- Abuse-report path.
- Done when: project is ready for first public deployment.

## Future Phases

Phases below are sequenced. Each phase assumes prior phases are merged and stable.

### Phase 2 — Performance polish

Goal: make v1 effects feel professional and rehearsal-ready.

1. Demo/rehearsal mode improvements: timeline scrub, replay last reveal, save rehearsal sessions locally.
2. Built-in celebrity preset packs (multiple themed lists; maintainer-editable in repo). Any bundled preset must include source/license metadata.
3. Location autocomplete via Google Places API (optional, key-gated, off by default).
4. Performer keyboard shortcuts for arm / send / reset / tab-switch.
5. Reveal animation tuning, including reduced-motion support.
6. Theme packs: alternate color/typography for the spectator search page (still original, still non-impersonating).

### Phase 3 — Effect kit expansion

Goal: add more reveal types by reusing the v1 effect-plugin shape. Build order within the phase prioritizes simplest effect first to validate plugin extensibility.

1. **Custom text reveal**: arbitrary performer-provided text. Implemented as the first Phase 6 effect to prove the plugin shape.
2. **Word / dictionary reveal**: word + optional definition + part-of-speech subtitle.
3. **City / country reveal**: geographic but lighter than full location (no Maps handoff).
4. **Card reveal**: playing-card render. No images needed; pure CSS.
5. **Photo reveal**: requires uploaded-asset pipeline and a separate licensing/safety review.
6. **Media reveal (YouTube / music)**: requires an official-link policy analogous to Maps. No embedded players.

Each new effect must ship behind the same plugin contract (no special-casing in core), with browser flow tests and a mobile QA pass.

### Phase 4 — Performer power tools

Goal: enable longer and more complex routines.

- One-ahead routine tools.
- Remote/swipe input controls: spectator-driven gestures (with explicit consent UI) forwarded to the performer.
- Web Push performer alerts.
- Performance history and rehearsal analytics, stored locally on the performer's machine.
- Custom routine builder: chain reveals with conditionals.

### Phase 5 — Multi-receiver and scale

Goal: support real public deployments and group performances.

- Multi-receiver sessions (one performer, several spectator devices).
- Multi-instance backend with Redis pub/sub.
- Postgres support.
- Account-based performer auth (replacing the single passphrase).
- Optional hosted reference instance with abuse controls and report-and-disable path.

### Phase 6 — Distribution and ecosystem

Goal: let the community build on top.

- Preset import/export format (JSON, versioned) for local performer handoff files. Implemented for effect form inputs.
- Bundled preset metadata: source/license fields for text-only celebrity presets. Implemented for the v1 celebrity preset list.
- Curated preset/theme registry (no marketplace monetization).
- Performer-console PWA installability.
- Documented effect-plugin SDK for third-party contributors.

## Cross-Phase Non-Goals

These remain out of scope through every phase:

- Native iOS or Android apps.
- App store distribution.
- Payment handling.
- Public marketplace for routines (a free curated registry is the most we ship).
- Cloning Inject, Google, Apple, YouTube, Instagram, or other branded UI. A generic original search-style page is allowed and expected; impersonating a specific third-party product is not.
- Covert access to spectator phone data.
- Any feature that hides the fact that the spectator intentionally opened a performance URL.

## Success Criteria For V1

- A new performer can run a location reveal end-to-end after local setup in under 10 minutes including reading the README.
- A new performer can run a celebrity reveal after local setup.
- Spectator setup takes one URL or QR scan; no installs.
- Reveal works on the latest two majors of iPhone Safari and Android Chrome.
- Prepared foreground/local p95 reveal latency under 250ms; real mobile 4G best-effort under one second.
- The core method is understandable from the docs and code.
- Safety boundaries are documented and enforced via the review checklist in safety-and-legal.md.

## Phase Promotion Criteria

A phase is considered done only when:

- All listed features are implemented behind the same effect-plugin shape; no special-casing in core.
- Browser flow tests cover each new feature.
- Manual mobile QA on the two target browsers passes.
- Documentation is updated.
- No new privacy or licensing risks are introduced (review checklist in safety-and-legal.md).
- Latency targets still hold for the existing effects.
