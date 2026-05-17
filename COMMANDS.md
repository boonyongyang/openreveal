# OpenReveal Commands

Use this file as the day-to-day command reference for local development.

## First-Time Setup

```sh
cp .env.example .env
pnpm install
pnpm dev
```

Open the performer console at http://localhost:5173/console.

Set `PERFORMER_PASSPHRASE` in `.env`, then use that value on the console login screen.

## Common Commands

| Command | Purpose | When to run |
| --- | --- | --- |
| `make help` | Show the Makefile command surface. | When you forget the local workflow. |
| `make install` | Install workspace dependencies. | First setup or after dependency changes. |
| `make dev` | Run the API and web dev servers. | Normal local development. |
| `make lint` | Run package lint scripts. | Before committing TypeScript/config changes. |
| `make typecheck` | Run TypeScript checks. | After changing shared contracts, API, or web code. |
| `make test` | Run unit and API tests. | After backend/shared behavior changes. |
| `make test-e2e` | Run Playwright browser flow tests. | After changing console, receiver, auth, realtime, or effect UI. |
| `make test-latency` | Measure local prepared foreground reveal render-ack p95. | After realtime, receiver, or console latency changes. |
| `make build` | Build all packages. | Before deployment or after build/config changes. |
| `make check` | Run lint, typecheck, unit/API tests, and build. | Main pre-commit verification. |
| `make audit` | Run a pnpm dependency vulnerability audit. | Before release and after dependency updates. |
| `make docker-build` | Build the reference production Docker image. | Before testing container deployment. |
| `make maintenance-cleanup` | Expire stale live sessions and prune old expired data. | Local/staging maintenance, or before checking retention behavior. |

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

## Recommended Verification

For docs-only changes:

```sh
git diff --check
```

For normal code changes:

```sh
pnpm check
pnpm test:e2e
```

For release-readiness checks:

```sh
pnpm check
pnpm test:e2e
pnpm audit
```

For local reveal latency checks:

```sh
pnpm test:latency
```

The latency runner uses desktop Chromium, demo mode, and a foreground receiver. Override sample count when needed:

```sh
OPENREVEAL_LATENCY_SAMPLES=50 pnpm test:latency
```

For frontend-only visual changes, also open:

```sh
http://localhost:5173/console
```

## Local URLs

| URL | Purpose |
| --- | --- |
| `http://localhost:5173/console` | Performer console. |
| `http://localhost:5173/r/<SESSION_CODE>` | Spectator receiver page for a live session. |
| `http://localhost:4000/api/health` | Backend health check. |

## Environment

The default local `.env` shape is:

```sh
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
DATABASE_URL=file:./data/dev.sqlite
SESSION_SECRET=replace-with-a-long-local-secret
SESSION_TTL_MINUTES=30
PERFORMER_PASSPHRASE=replace-with-local-passphrase
PORT=4000
VITE_ABUSE_REPORT_URL=
WEB_DIST_DIR=
```

`GOOGLE_MAPS_API_KEY` is not required for v1. Location reveals use official Google Maps search URLs generated server-side.

`VITE_ABUSE_REPORT_URL` is optional for local development. Hosted public instances should set it to a report form, issue tracker, or monitored contact page.

`WEB_DIST_DIR` is optional in local development. Set it in production to the built web app directory. Prefer an absolute path because `pnpm --filter @openreveal/api start` runs from `apps/api`.

## Maintenance

Run cleanup against the configured `DATABASE_URL`:

```sh
pnpm maintenance:cleanup
```

Optional retention override:

```sh
pnpm maintenance:cleanup -- --retention-hours=24
```

Cleanup does three things:

- Expires live sessions whose `expiresAt` is in the past.
- Marks their active reveal payload as `reset`.
- Deletes expired sessions and related receiver devices, reveal payloads, and session events once they are older than the retention window.
