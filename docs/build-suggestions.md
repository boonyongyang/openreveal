# Build Suggestions

This is the recommended build order after the first deployment-readiness pass. Keep Phase 7 deployment closure ahead of new product scope.

## Required Before Public Deployment

- Complete `requirements/owner-inputs.md`.
- Run `requirements/mobile-qa.md` on iPhone Safari and Android Chrome.
- Set production values from `.env.example`.
- Run `make docker-build` if Docker is the chosen deployment path.
- Run `pnpm smoke:deploy https://your-openreveal-url` after the hosted URL exists.
- Push the baseline commit or create a release tag from a clean repository.

## Recommended Immediately After First Deployment

1. Add hosted-instance operations notes:
   - backup restore drill for SQLite
   - cleanup job schedule
   - reverse-proxy WebSocket example
   - log-retention expectations
2. Add mobile QA result snapshots:
   - device/browser versions
   - same-Wi-Fi timing notes
   - mobile-data or throttled-network notes
   - lock/resume notes
3. Expand browser-level receiver replacement coverage if needed:
   - same-device replacement beyond the existing API/WebSocket coverage
   - mobile-specific reload behavior discovered during physical QA

## Good Next Product Work

1. Performer rehearsal tools:
   - replay last reveal
   - quick reset-and-rearm
   - routine notes visible only in the console
2. Accessibility pass:
   - keyboard-only console flow
   - reduced-motion behavior
   - contrast and mobile text fit review
3. Preset ergonomics:
   - local preset folders or labels
   - import validation preview before applying
   - optional hosted preset registry only after moderation and takedown rules exist
4. Routine effects that do not add licensing risk:
   - word reveal
   - playing card reveal with CSS-only card rendering
   - city/country reveal without external APIs

## Defer Until The Base Deployment Is Proven

- Embedded Google Maps UI, because v1 uses official Maps URLs and does not clone or embed third-party map surfaces.
- Image reveals, because they require upload/storage rules, asset licensing metadata, file validation, moderation, and takedown handling.
- Multi-instance scaling, because v1 WebSocket fanout is in memory.
- Account systems, because v1 auth is intentionally a single passphrase.
- Native apps, because the current product value is a no-install PWA.
