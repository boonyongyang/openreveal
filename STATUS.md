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
- A background cleanup scheduler (`CLEANUP_INTERVAL_MINUTES`, default 30) prunes expired sessions and aged rows so a long-running instance does not grow SQLite without bound; it reuses the same logic as `pnpm maintenance:cleanup` and is skipped under test.
- `Strict-Transport-Security` is emitted on both API and web responses when the deployment base URL is https.
- `pnpm smoke:deploy` asserts the HSTS header. `pnpm security:probe <base-url>` is an intrusive abuse probe (WS message-flood limit, per-IP socket cap, login rate limit, HSTS) for local/staging; all six defenses were runtime-verified one-by-one against a live instance on 2026-06-17.
- Maintenance cleanup command is available through `pnpm maintenance:cleanup` and `make maintenance-cleanup`.
- Hosted-instance report page is implemented at `/report` and links to the upstream GitHub safety issue form by default.
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
- Cloud Run deployment helper is available through `pnpm cloudrun:deploy` and `make cloudrun-deploy`; it stores `SESSION_SECRET` and `PERFORMER_PASSPHRASE` in Secret Manager and deploys them with `--set-secrets`.
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
- Cloud Run test deployment is live in the dedicated `openreveal` project, region `asia-southeast1`, at `https://openreveal-tcug7qrd2a-as.a.run.app`.
- The live Cloud Run service reports Ready=True, routes 100% traffic to revision `openreveal-00012-wcb`, and is configured for the v1 single-instance shape with `autoscaling.knative.dev/maxScale=1`, 1 vCPU, 512Mi memory, and 3600s request timeout.
- `pnpm cloudrun:preflight openreveal` now passes: billing is enabled and Cloud Run, Cloud Build, and Artifact Registry APIs are enabled.
- Firebase Hosting is reachable at `https://openreveal.web.app` and is configured as a same-path redirector to the Cloud Run origin. The real API/WebSocket endpoint remains the Cloud Run URL.
- Playwright now defaults to local `http://localhost:5173`/`http://localhost:4000` test URLs even when `.env` is temporarily pointed at a LAN IP or tunnel for phone testing.
- Codex in-app browser navigation to `localhost:5173` and `127.0.0.1:5173` was blocked by the browser client during the latest sanity pass; Playwright successfully exercised the same local app.

Latest hosted verification pass on 2026-06-21:

- `gcloud run services describe openreveal --region asia-southeast1 --project openreveal`: passed; service Ready=True.
- `pnpm cloudrun:preflight openreveal`: passed.
- `pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app`: passed, including `/api/health`, HSTS, frontend fallbacks, CSP, anti-frame headers, and `/ws` upgrade.
- Direct live checks returned HTTP 200 for Cloud Run root, Cloud Run `/api/health`, Firebase Hosting root, and Firebase Hosting `/console` fallback at that time.
- Firebase CLI verification was blocked under the system Node 26 path by the known global Firebase CLI `SlowBuffer.prototype` crash; use the Node 22/Herd Firebase CLI path or the hosted HTTP checks until the global CLI is updated.
- Trick mechanics now have dedicated e2e coverage (`apps/web/e2e/decoy-fidelity.pw.ts`, `maps-redirect.pw.ts`, `back-trap.pw.ts`) running on the real WebKit engine at an iPhone 13 profile (`mobile-safari` Playwright project; CI installs webkit). Full suite green: 26/26 across chromium + webkit.
- `node scripts/verify-live-safari.mjs` drove the live deployment with WebKit/iPhone end to end (standby decoy → arm/send → real Google Maps redirect with the place prefilled → pageshow back-trap held, no app/URL leak). Screenshots captured.
- Spectator standby decoy refined into a simpler original search-style surface: abstract mark, inert search pill, no fake shortcut chips, no mic/lens controls, no visible receiver diagnostics, and no Google wordmark/assets. The only remaining gap is the physical iPhone back-swipe gesture + Maps-app handoff, which no headless engine reproduces.

Latest deployment-closure verification pass on 2026-07-04:

- `CI=true pnpm install --frozen-lockfile`: passed after moving pnpm overrides into `pnpm-workspace.yaml` and explicitly approving the Vite/esbuild build dependency.
- `CI=true pnpm check`: passed with elevated local-network permission for API/WebSocket tests.
- `CI=true pnpm test:e2e`: passed, 26/26 across Chromium and the mobile Safari Playwright profile.
- `CI=true pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app`: passed, including `/api/health`, HSTS, frontend fallbacks, CSP, anti-frame headers, and `/ws` upgrade.
- `CI=true pnpm cloudrun:preflight openreveal`: passed after enabling `secretmanager.googleapis.com`.
- `PROJECT_ID=openreveal PERFORMER_PASSPHRASE=<generated> CI=true pnpm cloudrun:deploy`: passed and deployed revision `openreveal-00010-cw5`, serving 100% traffic.
- The live Cloud Run service now reads `SESSION_SECRET` from Secret Manager secret `openreveal-session-secret` and `PERFORMER_PASSPHRASE` from Secret Manager secret `openreveal-performer-passphrase`.
- `LIVE_PASSPHRASE=<from Secret Manager> LIVE_BASE_URL=https://openreveal-tcug7qrd2a-as.a.run.app OUT_DIR=/tmp/openreveal-live-2026-07-04 CI=true node scripts/verify-live-safari.mjs`: passed. It created a real session, rendered the receiver on the iPhone WebKit profile, sent a location reveal, redirected to Google Maps, and verified the back-trap behavior. Screenshots are in `/tmp/openreveal-live-2026-07-04`.
- Firebase Hosting is live at `https://openreveal.web.app` as a same-path redirector to the Cloud Run origin. This keeps Firebase out of the WebSocket path.
- Cloud Run `APP_BASE_URL` is now `https://openreveal.web.app`, so new sessions and QR codes use the short Firebase front door. `API_BASE_URL` remains the Cloud Run origin.
- `LIVE_PASSPHRASE=<from Secret Manager> LIVE_BASE_URL=https://openreveal-tcug7qrd2a-as.a.run.app OUT_DIR=/tmp/openreveal-live-frontdoor-2026-07-04 CI=true node scripts/verify-live-safari.mjs`: passed with a generated spectator URL on `https://openreveal.web.app/<code>`. Screenshots are in `/tmp/openreveal-live-frontdoor-2026-07-04`.

Latest spectator standby simplification pass on 2026-07-07:

- Removed the fake interactive receiver standby elements: shortcut chips, mic/lens controls, focusable search input, and spectator-visible receiver diagnostics.
- Replaced the four-color dot mark with an original abstract two-orb mark.
- Regenerated committed README screenshots with `CI=true pnpm screenshots`.
- `CI=true pnpm check`: passed with elevated local-network permission for API/WebSocket tests.
- `CI=true pnpm test:e2e`: passed, 26/26 across Chromium and the mobile Safari Playwright profile.
- Deployed Cloud Run revision `openreveal-00012-wcb`, serving 100% traffic.
- `CI=true pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app`: passed, including `/api/health`, HSTS, frontend fallbacks, CSP, anti-frame headers, and `/ws` upgrade.

Latest repo-side deployment-readiness pass on 2026-07-09:

- Added `pnpm release:scan` / `make release-scan` for tracked and unignored secret/private artifact checks before public pushes.
- `CI=true pnpm release:scan`: passed, 140 tracked/unignored files checked.
- `CI=true pnpm check`: passed after granting local API/WebSocket test binding permission; lint, typecheck, unit/API/web tests, and build were green.
- Playwright browser binaries were refreshed locally after the first E2E attempt found missing Chromium/WebKit executables. The E2E rerun still needs to be run when elevated local-server execution is available again; latest completed full suite remains the 26/26 pass from 2026-07-07.

Latest UI and landing revamp pass on 2026-07-11:

- Added `PRODUCT.md` and `DESIGN.md` as the source of truth for the renewed visual system and route intent.
- Rebuilt `/about` as a complete public landing page with real product captures, an explained three-step routine, safety principles, source links, and performer CTA.
- Refreshed the spectator code-entry surface, performer console shell, policy pages, receiver surface, and responsive styles under one shared palette and motion system.
- Added current visual captures at `docs/screenshots/revamp-landing-desktop.png`, `docs/screenshots/revamp-landing-mobile.png`, `docs/screenshots/revamp-console-access-desktop.png`, and `docs/screenshots/revamp-join-mobile.png`; the README Visual Tour now uses those current surfaces.
- Visual QA passed for `/about` at desktop and phone dimensions, `/` at phone dimensions, and the public `/console` access screen. The join form also showed the expected invalid-code recovery message.
- Passed: `CI=true pnpm lint`, `CI=true pnpm typecheck`, `CI=true pnpm --filter @openreveal/web test`, `CI=true pnpm --filter @openreveal/web build`, `CI=true pnpm release:scan`, and `git diff --check`.
- GitHub Actions passed the full verification workflow for `edd2b51` after the landing-page browser assertions were updated. It covered workspace checks, Chromium and mobile-Safari browser flows, and the production Docker image.

Latest final deployment review on 2026-07-11:

- Restored the product-specified session-code contract: eight case-insensitive, unambiguous characters, grouped for display and accepted with or without the grouping space on entry.
- Removed em and en dashes from tracked project copy, source comments, and console fallback labels.
- Reviewed `/about`, `/`, `/j`, `/r/<code>`, `/console`, `/privacy`, and `/report` locally at desktop and phone sizes. The spectator path remains free of navigation, marketing, and external links.
- `CI=true pnpm check`: passed.
- `CI=true pnpm test:e2e`: passed, 26/26 across Chromium and the mobile Safari profile.
- `CI=true pnpm release:scan`: passed, 150 tracked/unignored files checked.

Latest automated verification pass on 2026-06-20:

- `pnpm install --frozen-lockfile`: passed with pnpm 10.10.0.
- `pnpm check`: passed.
- `pnpm test:e2e`: passed, 20 browser flows.
- `pnpm audit --audit-level moderate`: passed with no known vulnerabilities.
- Local verification used Node 26.3.0; `.nvmrc` now pins the Node 22.12 CI baseline for reproducible setup.

Still-current supporting evidence from 2026-05-31:

- `pnpm test:latency`: passed, 20 samples, p95 8ms, max 8ms.
- `pnpm record:showcase`: passed and generated combined/performer/audience MP4 artifacts in `test-results/showcase/`.
- `pnpm record:location-celebrity`: passed and generated combined/performer/audience MP4 artifacts in `test-results/location-celebrity/`.

Latest GitHub repository check on 2026-07-04:

- The deployment setup is committed on `main` at `cb3e43f` (`Finalize hosted OpenReveal deployment setup`).
- GitHub Actions checks passed for the release baseline.
- The first annotated version tag exists: `v0.1.0`.
- The first GitHub Release exists at `https://github.com/boonyongyang/openreveal/releases/tag/v0.1.0`.
- `LICENSE` uses the canonical full AGPL-3.0 text.

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

Project implementation is deployed to Cloud Run with a Firebase Hosting front door and is ready for portfolio/demo use. The remaining items are operational polish and physical-device QA, not core implementation blockers.

1. Complete Phase 7 deployment closure:
   - [x] Choose target GCP project ID and region: `openreveal`, `asia-southeast1`
   - [x] Enable billing on the chosen project
   - [ ] Fill remaining owner-specific fields in `requirements/owner-inputs.md`
   - [x] Rotate the live Cloud Run performer passphrase and session secret into Secret Manager-backed generated values
   - [ ] Replace the generated performer passphrase with an owner-managed long-term value before public launch, if desired
   - [x] Decide and deploy current front door: `openreveal.web.app` redirects to Cloud Run; a custom Cloud Run domain remains the best future polished URL
   - [x] Choose current storage policy: demo-grade Cloud Run SQLite is accepted for this reference instance; do not depend on session history across redeploys/restarts
   - [x] Deploy and run `pnpm smoke:deploy <hosted-url>`
2. Run physical-device QA when devices are available:
   - [ ] Run `requirements/mobile-qa.md` on iPhone Safari
   - [ ] Run `requirements/mobile-qa.md` on Android Chrome
   - [ ] Record notes and blockers in `requirements/mobile-qa.md`
3. Maintain the public release boundary:
   - [x] Create the first version tag and GitHub Release
   - [ ] Regenerate the authenticated session and reveal screenshots after the full local screenshot pipeline or CI is available
   - [x] Confirm public repository and first release baseline
   - [ ] Run `pnpm release:scan` before every public push to confirm no common secrets or private deployment artifacts are tracked or sitting unignored

## Final Readiness Summary

- Ready now: local desktop testing, LAN/tunnel rehearsal, automated browser coverage, Docker production smoke, Cloud Run preflight checks, hosted Cloud Run smoke, Firebase front door, GitHub release, and generated QA video/screenshots.
- GitHub status: v0.1.0 release baseline exists.
- Waiting on owner input: optional custom domain, optional owner-managed passphrase rotation, optional Google Places API key, and whether to upgrade storage beyond demo-grade SQLite.
- Waiting on real devices: iPhone Safari and Android Chrome runs from `requirements/mobile-qa.md`.
- Intentional boundary: the receiver standby page remains an original search-style surface. It should not be changed into an exact Google clone or use Google trademarks/assets unless the project is using an approved Google integration surface and complies with their terms.
