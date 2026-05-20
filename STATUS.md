# OpenReveal Status

## Current State

- Git repository initialized locally with a baseline commit on `main`.
- pnpm monorepo scaffolded with `apps/web`, `apps/api`, and `packages/shared`.
- Public setup docs, AGPL-3.0 license, command surface, and environment example are in place.
- Starter guide and command reference are in place:
  - `STARTER-GUIDE.md`
  - `COMMANDS.md`
- Phased task list is in place at `PHASED-TASKS.md`.
- Milestone 1 shell is implemented:
  - performer passphrase login
  - authenticated session creation
  - receiver URL and QR code
  - spectator waiting/receiver page
  - performer connection status panel
- WebSocket join, heartbeat, reconnect, foreground/background state, prepared ack, reveal ack, and reset notifications are wired.
- Demo-mode receiver pane is available in the console.
- Split effect contract is implemented across shared schemas, API effect validators/enrichers, and web performer/spectator components.
- Location reveal is implemented with server-computed official Google Maps search URL handoff.
- Celebrity reveal is implemented as text-only with presets/manual input and optional source URL.
- Bundled celebrity presets now include shared source/license metadata as factual name-only labels with original category text and no images or biographies.
- Phase 6 custom text reveal is implemented with title, message, and footer fields using the same split effect contract.
- Phase 6 local preset import/export is implemented as browser-local versioned JSON files.
- Privacy page is implemented at `/privacy`.
- Frontend and API responses set baseline CSP, anti-framing, referrer, and content-type hardening headers.
- State-changing API routes reject untrusted browser `Origin`/`Referer` headers.
- Maintenance cleanup command is available through `pnpm maintenance:cleanup` and `make maintenance-cleanup`.
- Hosted-instance report placeholder is implemented at `/report`.
- Receivers that join after a reveal was sent are replayed the active reveal from SQLite.
- Receiver reconnects use a stable browser device id so the same phone can replace its stale socket instead of being blocked as `in_use`.
- Receiver preflight and WebSocket transport failures now stay in reconnecting mode with capped backoff; inactive/expired UI is reserved for explicit backend expiry or `in_use` state.
- Performer console records the latest reveal render latency from receiver acknowledgement.
- Local latency report is recorded in `requirements/latency-report.md`; latest desktop Chromium demo-mode run is 20 samples, p95 7ms, max 8ms.
- Performer console Phase 4C polish is implemented:
  - explicit `Arm`/`Send` readiness or disabled reasons
  - armed reveal kind/name summary
  - expiry countdown beside the expiry clock
  - receiver foreground/background state history
  - ended sessions disable mutation controls
  - new-session copy explains that the current receiver link is abandoned
- Production readiness Phase 4D is implemented:
  - single-node deployment guide
  - Dockerfile and `.dockerignore`
  - API production startup validation
  - optional API static serving for the built web app through `WEB_DIST_DIR`
  - dependency audit command
  - GitHub Actions CI for `pnpm check` and `pnpm test:e2e`
- Open-source contributor surface Phase 5 is implemented:
  - contributor guide
  - effect authoring guide
  - bug/effect/safety issue templates
  - pull-request checklist with safety/legal checks
  - routine-pack licensing guidance
  - architecture diagram
- Owner input checklist is drafted in `requirements/owner-inputs.md`.
- Mobile QA checklist is drafted in `requirements/mobile-qa.md`.
- Deployment readiness checklist is drafted in `docs/deployment-readiness.md`.
- Playwright browser flows cover login/session creation, location reveal, celebrity reveal, custom text reveal, console readiness surfaces, ended-session lockout, a true performer-page plus receiver-page session flow, receiver reload restoration, receiver replacement after leave, and duplicate receiver rejection.
- Receiver retry delay unit coverage is in place for capped reconnect backoff.

## Verified

- `pnpm install`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm check`
- `pnpm test:e2e`
- `pnpm test:latency`
- `pnpm audit --audit-level moderate`
- `pnpm --filter @openreveal/api test`
- `make help`
- Production smoke: `NODE_ENV=production` API startup with `WEB_DIST_DIR`, `/api/health`, and `/console` static fallback.

## Verification Notes

- `make docker-build` could not be completed because Docker is installed but the local Docker daemon is not running.
- Codex in-app browser navigation to `localhost:5173` and `127.0.0.1:5173` was blocked by the browser client during the latest sanity pass; Playwright successfully exercised the same local app.

Latest release-readiness pass on 2026-05-17:

- `pnpm check`: passed.
- `pnpm test:e2e`: passed, 12 browser flows on 2026-05-21.
- `pnpm test:latency`: passed, 20 samples, p95 7ms, max 8ms.
- `pnpm audit --audit-level moderate`: passed with no known vulnerabilities.
- Production-mode smoke: passed for `/api/health` and `/console` built SPA fallback.
- `git diff --check`: passed.

## Next Steps

1. Complete Phase 7 deployment closure:
   - [ ] Fill `requirements/owner-inputs.md`
   - [ ] Set production environment variables from `.env.example`
   - [ ] Choose whether Docker is the deployment path
   - [ ] If Docker is used, start Docker and run `make docker-build`
2. Run physical-device QA when devices are available:
   - [ ] Run `requirements/mobile-qa.md` on iPhone Safari
   - [ ] Run `requirements/mobile-qa.md` on Android Chrome
   - [ ] Record notes and blockers in `requirements/mobile-qa.md`
3. Push the baseline commit or create a release tag before deploying from a public repository.
