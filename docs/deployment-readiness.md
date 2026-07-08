# Deployment Readiness Checklist

Use this as the final gate before publishing an OpenReveal instance. Follow [testing-plan.md](testing-plan.md) for the full performer, audience-phone, Playwright, mobile QA, and production-smoke procedure.

## Automated Checks

- [x] `pnpm install --frozen-lockfile` (passed 2026-07-04)
- [x] `pnpm check` (passed 2026-07-09)
- [x] `pnpm test:e2e` (26 passed, 2026-07-07)
- [x] `pnpm test:latency` (20 samples, p95 8ms, max 8ms, 2026-05-31)
- [x] `pnpm audit --audit-level moderate` (passed 2026-06-20)
- [x] Production-mode smoke with Docker, `/api/health`, `/console`, frontend fallback, security headers, and `/ws` upgrade (passed 2026-05-27)
- [x] `make docker-build` when deploying with Docker (passed 2026-05-27)
- [x] Cloud Run preflight command added.
- [x] `pnpm cloudrun:preflight openreveal` (passed 2026-07-04, including Secret Manager API).
- [x] `pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app` (passed 2026-07-04, including `/ws` upgrade).
- [x] Cloud Run deploy helper and guide now use Secret Manager for `SESSION_SECRET` and `PERFORMER_PASSPHRASE` instead of plain service env vars.
- [x] Cloud Run redeployed with generated Secret Manager-backed runtime secrets on 2026-07-04; latest ready revision `openreveal-00010-cw5`.
- [x] Live WebKit/iPhone-profile proof run passed on 2026-07-04; screenshots in `/tmp/openreveal-live-2026-07-04`.
- [x] Firebase Hosting deployed as same-path redirector at `https://openreveal.web.app` on 2026-07-04.
- [x] Cloud Run `APP_BASE_URL` updated to `https://openreveal.web.app`; latest ready revision `openreveal-00011-vrt`.
- [x] Live WebKit/iPhone-profile front-door proof run passed on 2026-07-04; screenshots in `/tmp/openreveal-live-frontdoor-2026-07-04`.
- [x] Latest standby UI deployment reached Cloud Run revision `openreveal-00012-wcb` on 2026-07-07 and passed `pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app`.
- [x] `pnpm release:scan` passed on 2026-07-09 for tracked/unignored secret and private artifact checks.

## Owner Inputs

- [x] Final public front door for current reference instance: `https://openreveal.web.app` redirects to the Cloud Run origin. A custom Cloud Run domain remains the preferred future polished URL.
- [x] Hosting target for first live test: Cloud Run service `openreveal` in project `openreveal`, region `asia-southeast1`.
- [x] HTTPS choice for first live test: Cloud Run direct HTTPS URL.
- [x] Abuse-report destination for `VITE_ABUSE_REPORT_URL`: upstream GitHub safety issue form by default.
- [x] Production performer passphrase and session secret storage path: Secret Manager.
- [ ] Optional owner-managed passphrase rotation before public launch. The current live service uses generated Secret Manager-backed values.
- [x] SQLite data policy for current reference instance: demo-grade Cloud Run container SQLite is accepted; session history is not durable across redeploys/restarts.
- [x] Cleanup schedule and retention window: default background cleanup every 30 minutes with default session TTL/retention behavior.
- [x] Public/private access decision for the hosted instance: public reference instance.

## Device QA

- [ ] iPhone Safari checklist in `requirements/mobile-qa.md`.
- [ ] Android Chrome checklist in `requirements/mobile-qa.md`.
- [ ] Same-Wi-Fi test.
- [ ] Mobile-data or throttled-network test.
- [ ] Screen-lock/resume test.
- [ ] Background/foreground test.

## Release Boundary

- [x] Original OpenReveal product identity.
- [x] Canonical full AGPL-3.0 source license text.
- [x] No Inject branding or third-party UI clone.
- [x] No hidden device control.
- [x] Single-node SQLite deployment path.
- [x] Deployment smoke command for hosted URLs.
- [x] Minimal PWA metadata and manifest.
- [x] Text-only celebrity presets with source/license metadata.
- [x] Baseline git commit created on `main`.
- [x] Private GitHub repository exists and latest `main` CI passed.
- [x] GitHub repository visibility changed to public, if this is intended to be an open-source release.
- [x] Version tag and GitHub Release created.
- [ ] Physical mobile QA recorded.
- [x] Production environment variables set from `.env.example`.
- [x] `pnpm release:scan` added to the release command surface.
- [ ] Re-run `pnpm release:scan` before each public push or release tag.
