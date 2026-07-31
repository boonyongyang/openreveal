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

For the complete local desktop plus same-Wi-Fi phone setup path, see [docs/local-testing-setup.md](docs/local-testing-setup.md).

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
| `make test-hosted HOSTED_BASE_URL=... PERFORMER_PASSPHRASE=...` | Run the browser suite against an already-deployed staging service. | After staging smoke passes. |
| `make test-latency` | Measure local prepared foreground reveal render-ack p95. | After realtime, receiver, or console latency changes. |
| `make build` | Build all packages. | Before deployment or after build/config changes. |
| `make check` | Run lint, typecheck, unit/API tests, and build. | Main pre-commit verification. |
| `make audit` | Run a pnpm dependency vulnerability audit. | Before release and after dependency updates. |
| `make docker-build` | Build the reference production Docker image. | Before testing container deployment. |
| `make record-showcase` | Record a local performer/audience QA MP4. | When you need a demo or review artifact. |
| `make record-location-celebrity` | Record a focused location/celebrity performer/audience QA MP4. | When you want to review those two effects without custom text. |
| `make release-scan` | Check tracked and unignored files for common real secrets and private deployment artifacts. | Before public pushes, release tags, or deploy handoff. |
| `make cloudrun-build PROJECT_ID=...` | Build one clean-worktree container image and resolve its immutable digest. | After the release-candidate commit passes locally. |
| `make cloudrun-provision DEPLOY_ENV=staging PROJECT_ID=...` | Create environment-specific secrets if absent without rotating existing values. | Once per staging environment. |
| `make cloudrun-deploy DEPLOY_ENV=staging PROJECT_ID=... IMAGE_URI=... RELEASE_SHA=...` | Deploy an immutable image without creating or rotating secrets. | After image build and environment provisioning. |
| `make cloudrun-preflight PROJECT_ID=...` | Check Cloud Run auth, project, billing, and required services. | Before trying a Cloud Run deploy. |
| `make smoke-deploy BASE_URL=https://...` | Smoke test a deployed OpenReveal URL (health, HTML fallback, security headers incl. HSTS, `/ws` upgrade). | After Cloud Run, Firebase Hosting, or custom-domain deploys. |
| `pnpm security:probe [base-url]` | Active abuse probe: WS message-flood limit, per-IP socket cap, login rate limit, HSTS. **Intrusive:** run against local/staging. | After security changes, against a non-production target. |
| `make verify-hosted LIVE_BASE_URL=... LIVE_PASSPHRASE=...` | Run the hosted iPhone/WebKit trick proof and capture evidence. | After hosted browser flows pass. |
| `make maintenance-cleanup` | Expire stale live sessions and prune old expired data. | Local/staging maintenance, or before checking retention behavior. |

Equivalent pnpm commands:

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
HOSTED_BASE_URL=https://staging.example PERFORMER_PASSPHRASE='from-secret-manager' pnpm test:hosted
pnpm test:latency
pnpm build
pnpm check
pnpm audit
pnpm maintenance:cleanup
pnpm release:scan
pnpm record:showcase
pnpm record:location-celebrity
PROJECT_ID=openreveal pnpm cloudrun:build
DEPLOY_ENV=staging PROJECT_ID=openreveal pnpm cloudrun:provision
DEPLOY_ENV=staging PROJECT_ID=openreveal IMAGE_URI='asia-southeast1-docker.pkg.dev/...@sha256:...' RELEASE_SHA='<full-commit-sha>' pnpm cloudrun:deploy
pnpm cloudrun:preflight your-gcp-project-id
pnpm smoke:deploy https://your-openreveal-url
LIVE_BASE_URL=https://your-openreveal-url LIVE_PASSPHRASE='from-secret-manager' pnpm verify:hosted
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

Playwright uses `http://localhost:5173` and `http://localhost:4000` by default even if `.env` is temporarily pointed at a LAN IP or tunnel for phone testing. To run against a different test URL intentionally, set:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:5173 PLAYWRIGHT_API_BASE_URL=http://localhost:4000 pnpm test:e2e
```

For release-readiness checks:

```sh
pnpm check
pnpm test:e2e
pnpm audit
pnpm release:scan
pnpm smoke:deploy https://your-openreveal-url
```

The dependency audit submits dependency names, versions, and graph metadata to
the configured npm audit service. Run it only when that external security check
is approved for the repository.

Hosted verification does not start local servers. It requires an isolated
staging deployment and the staging performer passphrase:

```sh
HOSTED_BASE_URL=https://staging-service-url \
HOSTED_API_BASE_URL=https://staging-service-url \
PERFORMER_PASSPHRASE='from-secret-manager' \
pnpm test:hosted
```

For the full end-to-end deployment testing procedure, including performer-console and audience-phone checks, see [docs/testing-plan.md](docs/testing-plan.md).

For local-only setup and phone rehearsal before deployment, see [docs/local-testing-setup.md](docs/local-testing-setup.md).

For the recommended first hosted Cloud Run path, see [docs/cloud-run-deployment.md](docs/cloud-run-deployment.md).

For local reveal latency checks:

```sh
pnpm test:latency
```

The latency runner uses desktop Chromium, demo mode, and a foreground receiver. Override sample count when needed:

```sh
OPENREVEAL_LATENCY_SAMPLES=50 pnpm test:latency
```

For a recorded local QA showcase:

```sh
pnpm record:showcase
```

The recording command starts the local app, drives one performer browser and one audience-phone browser, and writes video plus a short QA summary to `test-results/showcase/`. If `ffmpeg` is installed, it also writes MP4 files, including `test-results/showcase/openreveal-showcase-combined.mp4`.

For a focused location/celebrity QA recording:

```sh
pnpm record:location-celebrity
```

This writes video plus a short QA summary to `test-results/location-celebrity/`. If `ffmpeg` is installed, the primary file is `test-results/location-celebrity/openreveal-location-celebrity-combined.mp4`.

For frontend-only visual changes, also open:

```sh
http://localhost:5173/console
```

## Local URLs

| URL | Purpose |
| --- | --- |
| `http://localhost:5173/` | Home page with spectator session-code join form. |
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
