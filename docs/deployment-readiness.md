# Deployment Readiness Checklist

Use this as the final gate before publishing an OpenReveal instance. Follow [testing-plan.md](testing-plan.md) for the full performer, audience-phone, Playwright, mobile QA, and production-smoke procedure.

## Automated Checks

- [x] `pnpm check` (passed 2026-05-31)
- [x] `pnpm test:e2e` (19 passed, 2026-05-31)
- [x] `pnpm test:latency` (20 samples, p95 8ms, max 8ms, 2026-05-31)
- [x] `pnpm audit --audit-level moderate` (no known vulnerabilities, 2026-05-31)
- [x] Production-mode smoke with Docker, `/api/health`, `/console`, frontend fallback, security headers, and `/ws` upgrade (passed 2026-05-27)
- [x] `make docker-build` when deploying with Docker (passed 2026-05-27)
- [x] Cloud Run preflight command added.
- [ ] `pnpm smoke:deploy https://your-openreveal-url` after the hosted URL exists.

## Owner Inputs

- [ ] Final public domain.
- [ ] Hosting target.
- [ ] HTTPS or reverse-proxy choice.
- [ ] Abuse-report destination for `VITE_ABUSE_REPORT_URL`.
- [ ] Production performer passphrase storage.
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
- [x] AGPL-3.0 source license.
- [x] No Inject branding or third-party UI clone.
- [x] No hidden device control.
- [x] Single-node SQLite deployment path.
- [x] Deployment smoke command for hosted URLs.
- [x] Minimal PWA metadata and manifest.
- [x] Text-only celebrity presets with source/license metadata.
- [x] Baseline git commit created on `main`.
- [ ] Physical mobile QA recorded.
- [ ] Production environment variables set from `.env.example`.
