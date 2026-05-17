# Production Deployment

This guide covers the supported v1 production shape: one Node process serving the API, WebSocket endpoint, and built web app.

## Supported V1 Shape

- One Node 22.12+ process.
- One public HTTPS origin, for example `https://openreveal.example`.
- API routes under `/api/*`.
- WebSocket route at `/ws`.
- Frontend routes such as `/console`, `/privacy`, `/report`, and `/r/:sessionCode` served from the built Vite app.
- SQLite/libsql database stored on persistent disk.
- Scheduled cleanup using `pnpm maintenance:cleanup`.

Do not run multiple backend instances in v1. WebSocket fanout is in memory, so horizontal scaling requires a future Redis or pub/sub layer.

## Build

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

The built web app lives at:

```sh
apps/web/dist
```

The built API lives at:

```sh
apps/api/dist
```

## Required Production Environment

Use HTTPS URLs in production:

```sh
NODE_ENV=production
APP_BASE_URL=https://openreveal.example
API_BASE_URL=https://openreveal.example
DATABASE_URL=file:/var/lib/openreveal/openreveal.sqlite
SESSION_SECRET=replace-with-at-least-32-random-characters
PERFORMER_PASSPHRASE=replace-with-a-private-passphrase
SESSION_TTL_MINUTES=30
PORT=4000
WEB_DIST_DIR=/srv/openreveal/apps/web/dist
VITE_ABUSE_REPORT_URL=https://openreveal.example/report-form-or-issue-tracker
```

`WEB_DIST_DIR` must point at the built web app directory. Prefer an absolute path because `pnpm --filter @openreveal/api start` runs from `apps/api`. Startup validation fails in production if required secrets, HTTPS URLs, persistent database path, or `WEB_DIST_DIR` are missing.

## Start

From the repo root:

```sh
NODE_ENV=production \
APP_BASE_URL=https://openreveal.example \
API_BASE_URL=https://openreveal.example \
DATABASE_URL=file:/var/lib/openreveal/openreveal.sqlite \
SESSION_SECRET=replace-with-at-least-32-random-characters \
PERFORMER_PASSPHRASE=replace-with-a-private-passphrase \
WEB_DIST_DIR=/srv/openreveal/apps/web/dist \
pnpm --filter @openreveal/api start
```

Put a reverse proxy in front of the Node process for TLS termination. The proxy must pass WebSocket upgrades for `/ws`.

## Docker

Build the reference image:

```sh
make docker-build
```

Run it with a persistent data volume:

```sh
docker run --rm \
  -p 4000:4000 \
  -v openreveal-data:/data \
  -e APP_BASE_URL=https://openreveal.example \
  -e API_BASE_URL=https://openreveal.example \
  -e SESSION_SECRET=replace-with-at-least-32-random-characters \
  -e PERFORMER_PASSPHRASE=replace-with-a-private-passphrase \
  -e VITE_ABUSE_REPORT_URL=https://openreveal.example/report-form-or-issue-tracker \
  openreveal:local
```

The image defaults to:

```sh
DATABASE_URL=file:/data/openreveal.sqlite
WEB_DIST_DIR=/app/apps/web/dist
PORT=4000
NODE_ENV=production
```

## SQLite Data

Use a persistent filesystem path for `DATABASE_URL`. Recommended host path:

```sh
file:/var/lib/openreveal/openreveal.sqlite
```

Recommended container path:

```sh
file:/data/openreveal.sqlite
```

Back up the SQLite file and its related write-ahead-log files if present:

```sh
openreveal.sqlite
openreveal.sqlite-wal
openreveal.sqlite-shm
```

## Cleanup Job

Run cleanup periodically on the same deployment environment:

```sh
pnpm maintenance:cleanup
```

For daily cleanup with a 72-hour expired-session retention window:

```sh
pnpm maintenance:cleanup -- --retention-hours=72
```

## Release Checks

Before deploying:

```sh
pnpm check
pnpm test:e2e
pnpm test:latency
pnpm audit
```

Physical-device QA remains separate:

- Run `requirements/mobile-qa.md` on iPhone Safari.
- Run `requirements/mobile-qa.md` on Android Chrome.

## Reverse Proxy Notes

Required behavior:

- Terminate HTTPS.
- Forward `/api/*`, `/ws`, and all frontend paths to the Node process.
- Preserve `Host`, `X-Forwarded-Proto`, and WebSocket upgrade headers.
- Keep request body limits small; v1 does not upload files.

Do not expose a separate untrusted API origin unless `APP_BASE_URL` and `API_BASE_URL` are updated together and CSRF origin checks are reviewed.
