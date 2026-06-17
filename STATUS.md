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
  - grouped session code and QR code
  - site root plus `/j` session-code join fallback
  - spectator waiting/receiver page
  - performer connection status panel
- WebSocket join, heartbeat, reconnect, foreground/background state, prepared ack, reveal ack, and reset notifications are wired.
- Demo-mode receiver pane is available in Advanced mode.
- Split effect contract is implemented across shared schemas, API effect validators/enrichers, and web performer/spectator components.
- Location reveal is implemented with server-computed official Google Maps search URL handoff.
- Optional Google Places autocomplete is implemented behind `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_ENABLED=true`, and an authenticated capabilities check; manual location mode remains the fallback without a key.
- Places-selected location reveals can auto-open Google Maps on the receiver after `Send` using history replacement so OpenReveal is not the immediate back-button destination.
- Celebrity reveal is implemented as text-only with presets/manual input and optional source URL.
- Celebrity reveals can auto-open Google Search on the receiver after `Send` using history replacement, with an in-page search link fallback in demo or if auto-open is disabled.
- Bundled celebrity presets now include shared source/license metadata as factual name-only labels with original category text and no images or biographies.
- Phase 6 custom text reveal is implemented as one quick reveal text field using the same split effect contract, and the receiver switches to a centered full-screen text reveal instead of the neutral search page.
- The receiver standby page is a neutral dark waiting surface with no fake portal links, footer navigation, third-party logos, spoofed browser chrome, or fake search results.
- Phase 6 local preset import/export is implemented as browser-local versioned JSON files.
- Privacy page is implemented at `/privacy`.
- Frontend and API responses set baseline CSP, anti-framing, referrer, and content-type hardening headers.
- State-changing API routes reject untrusted browser `Origin`/`Referer` headers.
- WebSocket abuse hardening is in place: per-IP concurrent-connection cap, per-socket message-rate limiter that drops flooding receivers before they amplify into broadcasts or reveal-ack DB writes, and a ping/pong liveness reaper that terminates zombie sockets. `trustProxy` is enabled so per-IP limits use the real client behind the Cloud Run front end.
- Performer login is brute-force hardened: a dedicated `AUTH_RATE_LIMIT_MAX` per-IP limit (default 10/min) separate from the general API limit, and a constant-time passphrase comparison.
- The Google Places proxy is cost-hardened: in-memory TTL caches for autocomplete (120s) and place details (1h) avoid re-billing identical lookups, and an optional `GOOGLE_PLACES_DAILY_BUDGET` caps total upstream calls per day.
- Maintenance cleanup command is available through `pnpm maintenance:cleanup` and `make maintenance-cleanup`.
- Hosted-instance report placeholder is implemented at `/report`.
- Receivers that join after a reveal was sent are replayed the active reveal from SQLite.
- Receiver reconnects use a stable browser device id so the same phone can replace its stale socket instead of being blocked as `in_use`.
- Receiver preflight and WebSocket transport failures now stay in reconnecting mode with capped backoff; inactive/expired UI is reserved for explicit backend expiry or `in_use` state.
- Performer console records the latest reveal render latency from receiver acknowledgement.
- Local latency report is recorded in `requirements/latency-report.md`; latest desktop Chromium demo-mode run on 2026-05-31 is 20 samples, p95 8ms, max 8ms.
- Performer console Phase 4C polish is implemented:
  - Quick Session mode is the default performance workflow
  - Advanced mode keeps diagnostics, preset import/export, history, and logs
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
  - GitHub Actions CI for `pnpm check`, `pnpm test:e2e`, and Docker image build
- Open-source contributor surface Phase 5 is implemented:
  - contributor guide
  - effect authoring guide
  - bug/effect/safety issue templates
  - pull-request checklist with safety/legal checks
  - routine-pack licensing guidance
  - architecture diagram
- Owner input checklist is drafted in `requirements/owner-inputs.md`.
- Mobile QA checklist is drafted in `requirements/mobile-qa.md`.
- Local desktop and same-Wi-Fi phone setup guide is available at `docs/local-testing-setup.md`.
- Deployment readiness checklist is drafted in `docs/deployment-readiness.md`.
- Cloud Run deployment guide is available at `docs/cloud-run-deployment.md`.
- `.gcloudignore` is in place so Cloud Run source deploys do not upload local env files, databases, build outputs, or Playwright artifacts.
- Cloud Run preflight is available through `pnpm cloudrun:preflight <project-id>` and `make cloudrun-preflight PROJECT_ID=<project-id>`.
- Hosted-URL smoke script is available through `pnpm smoke:deploy <url>` and `make smoke-deploy BASE_URL=<url>`.
- Local QA showcase recording is available through `pnpm record:showcase` and `make record-showcase`; MP4 outputs are written to `test-results/showcase/`.
- Focused location/celebrity QA recording is available through `pnpm record:location-celebrity` and `make record-location-celebrity`; MP4 outputs are written to `test-results/location-celebrity/`.
- Latest showcase artifacts:
  - `test-results/showcase/openreveal-showcase-combined.mp4`
  - `test-results/location-celebrity/openreveal-location-celebrity-combined.mp4`
  - `test-results/responsive-search/receiver-phone.png`
  - `test-results/responsive-search/receiver-tablet.png`
  - `test-results/responsive-search/receiver-desktop.png`
- Minimal PWA metadata, manifest, and app icon are in place for the web app.
- Playwright browser flows cover PWA metadata, login/session creation, root and `/j` session-code join, manual-mode Places gating, manual location reveal, Places autocomplete prefill, Maps auto-open with back-button replacement, celebrity reveal, Google Search auto-open with back-button replacement, centered custom text reveal, console readiness surfaces, ended-session lockout, a true performer-page plus receiver-page session flow, receiver reload restoration, receiver replacement after leave, and duplicate receiver rejection.
- Receiver retry delay unit coverage is in place for capped reconnect backoff.
- Local LAN browser verification produced screenshots in `test-results/manual-local-setup/`.

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
- `make docker-build`
- `pnpm record:showcase`
- `pnpm record:location-celebrity`
- `pnpm cloudrun:preflight`
- `pnpm smoke:deploy`
- Production smoke: `NODE_ENV=production` API startup with `WEB_DIST_DIR`, `/api/health`, and `/console` static fallback.

## Verification Notes

- Docker build now passes after pinning pnpm in the Docker image instead of relying on Node 22.12's bundled Corepack signature set.
- Cloud Run deployment is currently blocked on target project selection and billing. `boonyongyang` does not have billing enabled; `spacebuns-kotlin` was explicitly rejected by the project owner and was not deployed.
- `pnpm cloudrun:preflight boonyongyang` correctly reports the current blockers: billing disabled and Cloud Run/Cloud Build/Artifact Registry services not enabled.
- Playwright now defaults to local `http://localhost:5173`/`http://localhost:4000` test URLs even when `.env` is temporarily pointed at a LAN IP or tunnel for phone testing.
- Codex in-app browser navigation to `localhost:5173` and `127.0.0.1:5173` was blocked by the browser client during the latest sanity pass; Playwright successfully exercised the same local app.

Latest automated verification pass on 2026-05-31:

- `pnpm check`: passed.
- `pnpm test:e2e`: passed, 19 browser flows.
- `pnpm test:latency`: passed, 20 samples, p95 8ms, max 8ms.
- `pnpm audit --audit-level moderate`: passed with no known vulnerabilities.
- `pnpm record:showcase`: passed and generated combined/performer/audience MP4 artifacts in `test-results/showcase/`.
- `pnpm record:location-celebrity`: passed and generated combined/performer/audience MP4 artifacts in `test-results/location-celebrity/`.

Latest container and LAN verification:

- `make docker-build`: passed.
- Docker production smoke: passed for `/api/health`, `/console`, frontend fallback, security headers, and `/ws` upgrade on local container port `4010`.
- `pnpm smoke:deploy http://localhost:4010`: passed against the local production container.
- `git diff --check`: passed.
- Manual Playwright LAN flow: passed against `http://192.168.100.141:5173`, including console login, LAN receiver URL, waiting page, location reveal, reset, celebrity reveal, custom text reveal, and ended-session state.

Latest Android emulator verification on 2026-06-06:

- Android emulator: Pixel 9 Pro API 35 / Android 15, Chrome 138.0.7204.157.
- Local connection: `adb reverse` for `127.0.0.1:5173` and `127.0.0.1:4000`.
- Passed: performer login, Quick Session default, session creation, QR and receiver URL visibility, receiver join in a second Android Chrome tab, custom text arm/send, delivered state, receiver rendering, reset, and ended-session state.
- Observed foreground custom-text reveal latency: `0 ms`.
- Evidence screenshots: `test-results/android-emulator-performer-ended.png` and `test-results/android-emulator-receiver-ended.png`.
- This does not replace physical-device Android Chrome QA because it does not cover camera QR scanning, cellular/network switching, lock-screen behavior, or OEM browser differences.

## Next Steps

Project implementation is ready for local testing and hosted smoke testing. Public deployment is not fully unblocked until the owner-side configuration and physical-device QA items below are complete.

1. Complete Phase 7 deployment closure:
   - [ ] Choose target GCP project ID and region
   - [ ] Enable billing on the chosen project
   - [ ] Fill `requirements/owner-inputs.md`
   - [ ] Set production environment variables from `.env.example`
   - [ ] Deploy and run `pnpm smoke:deploy <hosted-url>`
2. Run physical-device QA when devices are available:
   - [ ] Run `requirements/mobile-qa.md` on iPhone Safari
   - [ ] Run `requirements/mobile-qa.md` on Android Chrome
   - [ ] Record notes and blockers in `requirements/mobile-qa.md`
3. Push the baseline commit or create a release tag before deploying from a public repository.

## Final Readiness Summary

- Ready now: local desktop testing, LAN/tunnel rehearsal, automated browser coverage, Docker production smoke, Cloud Run preflight checks, and generated QA video/screenshots.
- Waiting on owner input: billed Google Cloud project or alternative host, production secrets, optional Google Places API key, abuse report URL, and data retention/backup decision.
- Waiting on real devices: iPhone Safari and Android Chrome runs from `requirements/mobile-qa.md`.
- Intentional boundary: the receiver standby page remains an original search-style surface. It should not be changed into an exact Google clone or use Google trademarks/assets unless the project is using an approved Google integration surface and complies with their terms.
