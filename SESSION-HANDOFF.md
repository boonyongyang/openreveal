# OpenReveal Session Handoff

Last updated: 2026-07-12

## Current State

- OpenReveal is a consent-based spectator-phone performance PWA with a private performer console at `/console`.
- The public root and `/j` are intentionally minimal session-code entry pages. `/about` contains the public project landing page.
- Sessions use eight-character, case-insensitive, unambiguous codes. The console displays them in two groups of four.
- `.env` is local-only and intentionally git-ignored. Generated build output, SQLite data, screenshots, and test results are ignored as well.

## Hosted Topology

- `https://openreveal.web.app` is the short spectator front door through Firebase Hosting.
- Firebase Hosting redirects the requested path to Cloud Run. Cloud Run serves the application, API, and WebSocket endpoint, so WebSocket traffic never depends on Firebase Hosting.
- Cloud Run revision `openreveal-00014-g5n` is live and serves 100% of traffic as of 2026-07-12.
- The deployed Cloud Run service is single-instance by design. Its SQLite storage is suitable for demos and rehearsals, not durable session history.

## Current Verification

- `CI=true pnpm check`: passed on 2026-07-11.
- `CI=true pnpm test:e2e`: passed, 26 browser flows across Chromium and the mobile Safari profile, on 2026-07-11.
- `CI=true pnpm release:scan`: passed, with no tracked or unignored private deployment artifacts.
- Browser review covered `/about`, `/`, `/j`, `/r/<code>`, `/console`, `/privacy`, and `/report` at desktop and phone widths.
- Cloud Run preflight and hosted smoke both passed on 2026-07-12. Firebase Hosting was checked for both the root and receiver-path redirect.

## Deployment Checklist

1. Commit and push the reviewed revision, then wait for GitHub Actions to pass.
2. Deploy the built revision with `pnpm cloudrun:deploy` using the existing Secret Manager-backed configuration.
3. Run `pnpm smoke:deploy https://openreveal-tcug7qrd2a-as.a.run.app` after Cloud Run is ready.
4. Confirm `https://openreveal.web.app` redirects to the new Cloud Run revision and creates receiver URLs with the Firebase front door.

## Remaining Real-World Boundaries

- Run the checklist in `requirements/mobile-qa.md` on a physical iPhone Safari and Android Chrome device before a public performance.
- Keep the service at one instance unless the realtime hub, rate limiting, and storage move to shared infrastructure.
- Replace demo-grade SQLite only when durable storage becomes a product requirement.
