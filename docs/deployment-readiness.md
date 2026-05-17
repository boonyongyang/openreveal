# Deployment Readiness Checklist

Use this as the final gate before publishing an OpenReveal instance.

## Automated Checks

- [x] `pnpm check` (passed 2026-05-17)
- [x] `pnpm test:e2e` (8 passed, 2026-05-17)
- [x] `pnpm test:latency` (20 samples, p95 7ms, max 8ms, 2026-05-17)
- [x] `pnpm audit --audit-level moderate` (no known vulnerabilities, 2026-05-17)
- [x] Production-mode smoke with `WEB_DIST_DIR`, `/api/health`, and `/console` static fallback (passed 2026-05-17)
- [ ] `make docker-build` when deploying with Docker. Local blocker on 2026-05-17: Docker daemon is not running.

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
- [x] Text-only celebrity presets with source/license metadata.
- [x] Baseline git commit created on `main`.
- [ ] Physical mobile QA recorded.
- [ ] Production environment variables set from `.env.example`.
