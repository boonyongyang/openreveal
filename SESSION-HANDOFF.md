# OpenReveal Session Handoff

Last updated: 2026-06-17

## Current Repo State

- Working directory: `/Users/boonyongyang/Development/stuff/inject-magic`
- Current branch: `main`
- Latest committed change: `982366d Add reconnect Playwright coverage`
- Large uncommitted baseline: 51 modified tracked files plus untracked feature files
  (`apps/api/src/places.ts`, `apps/api/test/places.test.ts`, `apps/web/src/lib/id.ts`,
  `scripts/*`, `apps/web/public/`, `docs/cloud-run-deployment.md`, `docs/local-testing-setup.md`).
  Everything STATUS.md describes as done since `982366d` is still uncommitted.
- `.env` is local-only and intentionally git-ignored.
- Generated/build folders stay ignored: `node_modules/`, `apps/*/dist/`,
  `packages/shared/dist/`, `data/`, `*.sqlite`, and `test-results/`.

## Deployment Decision (2026-06-17)

- Target is **single-host Cloud Run**: the API serves the built web app via `WEB_DIST_DIR`,
  so web, API, and WebSocket share one origin. This needs no cross-origin code changes —
  the web uses relative `/api` and `/ws` paths and a same-origin `sameSite: "lax"` cookie.
- **Firebase was dropped.** A Firebase Hosting config (`firebase.json`, `.firebaserc`,
  `.firebase/`) had appeared but was removed. A Firebase + Cloud Run split was rejected
  because Firebase Hosting cannot proxy WebSocket and the split would force
  `VITE_API_ORIGIN`, `sameSite: "none"` cookies, and CORS changes.
- Cloud Run is still blocked on owner inputs: a billed GCP project ID and region.
  `pnpm cloudrun:preflight <project-id>` reports the blockers.

## Verification State

- `pnpm typecheck`: passed (2026-06-17).
- `pnpm test`: passed (2026-06-17).
- Per STATUS.md (2026-06-06): `pnpm check`, `pnpm test:e2e` (19 flows),
  `pnpm test:latency` (p95 8ms), `pnpm audit`, Docker production smoke,
  `pnpm smoke:deploy`, and Android emulator QA all passed.
- Re-run before committing the baseline:

  ```sh
  pnpm install --frozen-lockfile
  pnpm check
  pnpm test:e2e
  pnpm test:latency
  pnpm audit --audit-level moderate
  git diff --check
  ```

## What To Do Next

1. Re-run the full verification suite above and confirm green.
2. Commit the uncommitted baseline (modified docs + untracked Places/scripts/PWA features)
   as one coherent commit. Doc edits already match the implemented effect schemas.
3. Run physical-device QA and record results in `requirements/mobile-qa.md`:
   iPhone Safari and Android Chrome — same-Wi-Fi join, foreground/background,
   lock/unlock, receiver reload, short network interruption, reconnect after reveal.
4. Unblock deployment (owner): choose a billed GCP project ID and region, fill
   `requirements/owner-inputs.md`, set production env from `.env.example`, deploy,
   then run `pnpm smoke:deploy <hosted-url>`.

## Suggested First Prompt For Next Session

```text
Read AGENTS.md, SESSION-HANDOFF.md, STATUS.md, and git status. Continue OpenReveal.
Deploy target is single-host Cloud Run (Firebase dropped). First, re-run pnpm check +
test:e2e + audit, then help me commit the uncommitted baseline as one coherent commit.
```
