# OpenReveal Phased Task List

This file tracks the remaining work beyond the current v1 reveal prototype. It is intentionally implementation-oriented: each phase should leave the app more deployable, safer, or easier to rehearse.

## What Else Should Be Considered

- Consent and safety: public privacy notice, acceptable-use language, no cloned third-party UI, no hidden device control, and clear limits on what the spectator page can access.
- Mobile reliability: Safari and Chrome background behavior, screen lock, reconnect, slow 4G/5G, duplicate receiver handling, and stale WebSocket recovery.
- Session lifecycle: expiry, cleanup, reset, end-session semantics, stale reveal cleanup, event retention, and active receiver replacement.
- Security: HttpOnly cookie auth, rate limits, CSRF posture for same-origin performer actions, CSP, anti-framing, dependency audit, and safe production secrets.
- Performance: prepared reveal latency, first load time on mobile, QR-to-waiting-page time, and payload size.
- Operations: production hosting shape, HTTPS, persistent SQLite/libsql location, backup/cleanup jobs, logs, and health checks.
- Open-source readiness: AGPL compliance, contributor guide, issue templates, effect-plugin docs, and clear boundaries for routine packs/assets.
- Accessibility and usability: keyboard flow in the performer console, clear disabled reasons, mobile viewport fit, readable contrast, and non-alarming receiver states.
- Testing: API edge cases, Playwright browser flows, mobile QA checklist, reconnect simulations, and cross-session isolation.
- Future extensibility: effect registry docs, source/license metadata for presets, local preset import/export, and eventual multi-instance fanout plan.

## Phase 4A: Safety And Lifecycle Hardening

Goal: make the current local app harder to misuse and less brittle during short rehearsals.

- [x] Add public `/privacy` page.
- [x] Add frontend CSP and anti-framing headers.
- [x] Add API CSP and anti-framing headers.
- [x] Add baseline API rate limiting.
- [x] Add real-device mobile QA checklist.
- [x] Add expiry edge-case coverage that clears active reveals and blocks performer mutations.
- [x] Add CSRF protection or an explicit same-origin CSRF decision note for performer mutation endpoints.
- [x] Add cleanup job or maintenance command for expired sessions, reveal payloads, receiver devices, and old event logs.
- [x] Add hosted-instance abuse/report path placeholder.

## Phase 4B: Mobile Reliability And Latency

Goal: prove the effect survives real phone behavior, not just desktop automation.

- [ ] Run `requirements/mobile-qa.md` on iPhone Safari.
- [ ] Run `requirements/mobile-qa.md` on Android Chrome.
- [x] Add reconnect/resume handling for the receiver after socket drop.
- [x] Keep transient receiver preflight/network failures in reconnecting mode instead of showing inactive/expired.
- [x] Add latest-state restoration when a receiver reconnects after a reveal was sent.
- [x] Add automated latency measurement around performer send to receiver render ack.
- [x] Record prepared foreground/local p95 latency in docs.
- [x] Add tests for duplicate receiver behavior and receiver replacement/rejection.

## Phase 4C: Performer Console Polish

Goal: make rehearsal and performance controls predictable under pressure.

- [x] Add explicit disabled-reason text near `Arm` and `Send`, not only button titles.
- [x] Show active reveal kind/name in the control panel after arming.
- [x] Add expiry countdown instead of only expiry clock time.
- [x] Add visible receiver background/foreground history.
- [x] Add session-ended state that disables all mutation controls.
- [x] Add clearer "new session will abandon current session" behavior.

## Phase 4D: Production Readiness

Goal: make the reference deployment self-hostable without guessing.

- [x] Add production deployment guide for a single Node instance.
- [x] Add Dockerfile or documented non-Docker deployment path.
- [x] Document where SQLite/libsql data lives in production.
- [x] Add environment validation on API startup.
- [x] Add dependency/security audit command to `COMMANDS.md`.
- [x] Add GitHub Actions CI for `pnpm check` and `pnpm test:e2e` if CI browser support is available.

## Phase 5: Open-Source Contributor Surface

Goal: let other developers safely extend the project.

- [x] Add `CONTRIBUTING.md`.
- [x] Add effect-plugin authoring guide.
- [x] Add issue templates for bug, effect request, and safety concern.
- [x] Add pull-request checklist with safety/legal checks.
- [x] Add routine-pack licensing guidance.
- [x] Add architecture diagram for performer, receiver, API, WebSocket, and database flow.

## Phase 6: Effect Expansion After V1 Is Stable

Goal: add new routines only after the core session/realtime system is hardened.

- [x] Add custom text reveal using the same split effect contract.
- [x] Add local preset import/export.
- [x] Add source/license metadata for celebrity presets.
- [x] Evaluate optional Places autocomplete. Decision: defer until after first public deployment because v1 works with official Maps URLs and no API key.
- [x] Evaluate image reveals. Decision: defer until asset licensing, upload/storage, moderation, and takedown rules are implemented.
- [x] Keep native mobile apps, account systems, Postgres, Redis, and multi-instance fanout out of scope until v1 is public-deployable.

## Phase 7: Deployment Closure

Goal: close the final public-deployment gates without adding product scope.

- [x] Add deployment readiness checklist.
- [x] Run local automated release checks: `pnpm check`, `pnpm test:e2e`, `pnpm test:latency`, and `pnpm audit --audit-level moderate`.
- [x] Run production-mode API/static-serving smoke with `WEB_DIST_DIR`.
- [ ] Run `make docker-build` after Docker daemon is running, if Docker deployment is the chosen path.
- [ ] Fill `requirements/owner-inputs.md`.
- [ ] Run `requirements/mobile-qa.md` on iPhone Safari.
- [ ] Run `requirements/mobile-qa.md` on Android Chrome.
- [ ] Set production environment variables from `.env.example`.
- [x] Create a baseline git commit before deploying from a public repository.
