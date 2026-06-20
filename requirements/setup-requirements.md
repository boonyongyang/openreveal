# Setup Requirements

## Local Development Prerequisites

Expected tools:

- Node.js 22.12 or newer.
- pnpm 10.10.0 (pinned by `packageManager`; newer pnpm 10 releases may also work).
- Git once the workspace is initialized as a repository.
- SQLite for v1 local development.
- A modern desktop browser.
- iPhone Safari and Android Chrome for mobile QA when available.

Recommended defaults:

- Package manager: pnpm.
- Backend port: `4000`.
- Frontend port: `5173` if using Vite.
- Local database: SQLite file under a local ignored data directory via Drizzle + libsql.
- Realtime transport: `@fastify/websocket` served by the backend.

## Environment Variables

Expected `.env` entries after scaffolding:

```sh
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
DATABASE_URL=file:./data/dev.sqlite
SESSION_SECRET=replace-with-local-secret
SESSION_TTL_MINUTES=30
PERFORMER_PASSPHRASE=replace-with-local-passphrase
PORT=4000
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
CLEANUP_INTERVAL_MINUTES=30
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACES_ENABLED=false
GOOGLE_PLACES_DAILY_BUDGET=0
VITE_ABUSE_REPORT_URL=
WEB_DIST_DIR=
```

Notes:

- `PERFORMER_PASSPHRASE` is required. It mints a signed performer token; without it, only the spectator receiver page is reachable.
- `API_RATE_LIMIT_MAX` controls the global API rate limit per minute. Keep the local/production default conservative; Playwright raises it only for automated test runs.
- `AUTH_RATE_LIMIT_MAX` controls the tighter per-IP limit on `/api/auth/login` (default 10/min) that blunts passphrase brute-force. Playwright raises it for automated runs.
- `CLEANUP_INTERVAL_MINUTES` sets how often expired sessions and aged rows are pruned (default 30). Set to `0` to disable the background scheduler.
- `GOOGLE_PLACES_API_KEY` is optional. When set with `GOOGLE_PLACES_ENABLED=true`, the performer location form enables Place search and autocompletes places through the backend proxy.
- `GOOGLE_PLACES_DAILY_BUDGET` is an optional hard daily ceiling on upstream Google Places calls (default `0` = unlimited). Cached lookups do not count toward it. Set a value when Places is enabled so a leaked passphrase cannot run an unbounded bill.
- Without a Places key, location reveal stays in manual mode and still creates official Google Maps URLs without an API key.
- `VITE_ABUSE_REPORT_URL` is optional. Hosted public instances should set it to a report form, issue tracker, or monitored contact page so `/report` has an outbound report destination.
- `WEB_DIST_DIR` is optional locally and required in production. It points the API server at the built Vite app so one Node process can serve `/console`, `/r/:sessionCode`, `/privacy`, `/report`, `/api/*`, and `/ws`. Prefer an absolute path because filtered pnpm package commands run from `apps/api`.
- Web Push keys should be optional until push alerts are implemented.
- Production secrets must never be committed.

## Third-Party Services

### Required for v1

None beyond hosting and a database if self-hosted. Location reveal can work with manual input and official Google Maps URLs.

### Optional integrations

- Google Maps Platform Places API for performer autocomplete. Requires billing, Places API enabled, and `GOOGLE_PLACES_API_KEY`.
- Maps JavaScript or Static Maps are still out of scope for v1 because the spectator side uses official Maps URLs instead of embedded Google UI.
- Web Push service through standard browser push APIs.
- Image storage for uploaded effect assets.
- Email service for account recovery if full authentication is added.

## Development Setup Tasks

Completed setup:

- Initialize a git repository.
- Use pnpm workspaces.
- Add license.
- Add `.gitignore`.
- Add root README.
- Add workspace structure for frontend, backend, and shared packages.
- Add environment example.
- Add local dev commands.
- Add basic CI commands.

Current command surface:

```sh
make help
make install
make dev
make lint
make typecheck
make test
make test-e2e
make test-latency
make build
make check
make audit
make docker-build
make maintenance-cleanup
```

Equivalent pnpm commands:

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:latency
pnpm build
pnpm check
pnpm audit
pnpm maintenance:cleanup
```

For a reproducible first install, use `nvm use` with the committed `.nvmrc` and
run `pnpm install --frozen-lockfile`. Install pnpm with
`npm install --global pnpm@10.10.0` only if pnpm 10 is not already available.

For a performer walkthrough, see [../STARTER-GUIDE.md](../STARTER-GUIDE.md). For the complete command reference, see [../COMMANDS.md](../COMMANDS.md).

Maintenance cleanup expires stale live sessions and prunes expired session data older than the retention window. Use `pnpm maintenance:cleanup -- --retention-hours=24` to override the default retention period.

## Deployment Requirements

Production deployment needs:

- HTTPS.
- Public frontend URL.
- Backend URL reachable by WebSocket.
- Persistent database.
- Secret management.
- Session cleanup job.
- Domain-restricted API keys if Maps APIs are used.
- Log retention controls.

Deployment options:

- Single Node server serving frontend and backend for simplest self-hosting. **V1 supported configuration.**
- Reference Dockerfile for single-node production. **V1 supported configuration.**
- Separate static frontend and backend service for scalable hosting. Requires multi-instance realtime support (see below).
- Docker Compose for local/staging orchestration can be added later if needed.

Constraint: V1 backend is single-process and uses in-memory WebSocket fanout. Running multiple backend instances requires adding a Redis (or equivalent) pub/sub layer and is out of scope for v1. SQLite via Drizzle + libsql is the supported v1 database; Postgres support is post-v1.

Production startup validation requires:

- `NODE_ENV=production`.
- `APP_BASE_URL` and `API_BASE_URL` using `https://`.
- `SESSION_SECRET` changed from the local default and at least 32 characters.
- `PERFORMER_PASSPHRASE` changed from the local default and at least 12 characters.
- `DATABASE_URL` pointing at a persistent production data path.
- `WEB_DIST_DIR` pointing at the built web app.

For the deployment walkthrough, see [../docs/production-deployment.md](../docs/production-deployment.md).

## Browser Support Requirements

V1 support target:

- iOS Safari current and recent versions.
- Android Chrome current and recent versions.
- Desktop Chrome, Safari, and Firefox for performer console.

Important constraints:

- Mobile browsers may pause background JavaScript.
- Screen lock can interrupt realtime connections.
- iOS Web Push has platform-specific requirements.
- The spectator flow should recover gracefully after reconnect.

## Repository Setup Checklist

- [x] Initialize git repository.
- [x] Add `README.md`.
- [x] Add `LICENSE`.
- [x] Add `.gitignore`.
- [x] Add package workspace.
- [x] Add frontend app.
- [x] Add backend app.
- [x] Add shared types package.
- [x] Add `.env.example`.
- [x] Add local database setup.
- [x] Add first session API.
- [x] Add first WebSocket connection.
- [x] Add first browser flow test.
- [x] Add split effect registries.
- [x] Add location reveal flow.
- [x] Add celebrity reveal flow.
- [x] Add mobile QA notes for iPhone Safari and Android Chrome.
- [x] Add production deployment guide.
- [x] Add API startup environment validation.
- [x] Add Dockerfile.
- [x] Add CI workflow for check and e2e.
- [ ] Run mobile QA on physical iPhone Safari and Android Chrome.
