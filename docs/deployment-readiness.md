# Deployment Readiness Checklist

Use this as the final gate before publishing an OpenReveal instance. Follow [testing-plan.md](testing-plan.md) for the full performer, audience-phone, Playwright, mobile QA, and production-smoke procedure.

## Automated Checks

- [x] `pnpm install --frozen-lockfile` (passed 2026-06-20)
- [x] `pnpm check` (passed 2026-06-20)
- [x] `pnpm test:e2e` (20 passed, 2026-06-20)
- [x] `pnpm test:latency` (20 samples, p95 8ms, max 8ms, 2026-05-31)
- [x] `pnpm audit --audit-level moderate` (passed 2026-06-20)
- [x] Production-mode smoke with Docker, `/api/health`, `/console`, frontend fallback, security headers, and `/ws` upgrade (passed 2026-05-27)
- [x] `make docker-build` when deploying with Docker (passed 2026-05-27)
- [x] Cloud Run preflight command added.
- [x] `pnpm cloudrun:preflight openreveal` (passed 2026-06-21).
- [x] `pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app` (passed 2026-06-21, including `/ws` upgrade).

## Owner Inputs

- [ ] Final public domain/front door. Current live app URL is `https://openreveal-tcug7qrd2a-as.a.run.app`; `https://openreveal.web.app` is static Firebase Hosting only.
- [x] Hosting target for first live test: Cloud Run service `openreveal` in project `openreveal`, region `asia-southeast1`.
- [x] HTTPS choice for first live test: Cloud Run direct HTTPS URL.
- [ ] Abuse-report destination for `VITE_ABUSE_REPORT_URL`.
- [ ] Production performer passphrase and session secret rotation/storage. The live deployment still uses temporary test values.
- [ ] SQLite data directory and backup path.
- [ ] Cleanup schedule and retention window.
- [ ] Public/private access decision for the hosted instance.

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
- [ ] GitHub repository visibility changed to public, if this is intended to be an open-source release.
- [ ] Version tag and GitHub Release created.
- [ ] Physical mobile QA recorded.
- [ ] Production environment variables set from `.env.example`.
