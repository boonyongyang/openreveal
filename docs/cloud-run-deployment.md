# Cloud Run Release Validation

OpenReveal uses two isolated Cloud Run services in the dedicated `openreveal`
project:

- `openreveal-staging` validates a candidate before release.
- `openreveal` is production and remains behind `https://openreveal.web.app`.

Both services remain single-instance because WebSocket fanout, rate limits,
Places budget state, and caches are process-local. Container SQLite is
disposable and is not a durable session-history store.

## Safety Contract

- Build only from a clean committed worktree.
- Build once, identify the image by digest, and deploy that same digest to both
  staging and production.
- Provisioning creates missing secrets but never rotates existing values.
- Deployment consumes existing secrets but never creates or rotates them. It
  pins the newest enabled version number into the Cloud Run revision instead
  of using the mutable `latest` alias.
- Staging cannot target the `openreveal` service.
- Production requires `main`, a clean worktree, a front-door URL, and the
  explicit `ALLOW_PRODUCTION_DEPLOY` acknowledgement.
- Do not run the intrusive security probe against production.

## 1. Preflight

Use Node 22.12+ and pnpm 10.34.5, then verify the selected project:

```sh
pnpm cloudrun:preflight openreveal
```

The command checks gcloud authentication, billing, the project allowlist, and
Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs.

## 2. Prepare The Candidate

The candidate must be committed and locally green:

```sh
CI=true pnpm install --frozen-lockfile
CI=true pnpm release:scan
CI=true pnpm check
CI=true pnpm test:e2e
CI=true pnpm test:latency
make docker-build
git diff --check
```

Do not deploy from an uncommitted worktree.

## 3. Build One Immutable Image

```sh
PROJECT_ID=openreveal pnpm cloudrun:build
```

The script creates the regional `openreveal` Artifact Registry repository if
needed, submits the Docker build, and prints:

```text
OPENREVEAL_RELEASE_SHA=<full Git SHA>
OPENREVEAL_IMAGE=<artifact path>@sha256:<digest>
```

Keep both values in the release evidence. The digest, not a mutable tag, is the
deployment input.

## 4. Provision Staging Secrets

Run once for staging:

```sh
DEPLOY_ENV=staging PROJECT_ID=openreveal pnpm cloudrun:provision
```

This creates these secrets only when absent:

- `openreveal-staging-session-secret`
- `openreveal-staging-performer-passphrase`

Random values are streamed directly to Secret Manager and are not printed.
Rerunning provisioning preserves existing secret versions.

## 5. Deploy Staging

Use the values printed by the immutable build:

```sh
DEPLOY_ENV=staging \
PROJECT_ID=openreveal \
IMAGE_URI='<artifact path>@sha256:<digest>' \
RELEASE_SHA='<full Git SHA>' \
pnpm cloudrun:deploy
```

The staging service uses its direct Cloud Run URL for both `APP_BASE_URL` and
`API_BASE_URL`. It does not use or modify Firebase Hosting. The deploy command
prints the service URL, ready revision, commit, image digest, and pinned secret
version numbers, then runs the hosted smoke test.

## 6. Verify Staging

Retrieve the staging passphrase into the current shell without printing it:

```sh
export STAGING_PASSPHRASE="$(gcloud secrets versions access latest \
  --project openreveal \
  --secret openreveal-staging-performer-passphrase)"
```

Run the gates in this order:

```sh
pnpm smoke:deploy '<staging-service-url>'

HOSTED_BASE_URL='<staging-service-url>' \
HOSTED_API_BASE_URL='<staging-service-url>' \
PERFORMER_PASSPHRASE="$STAGING_PASSPHRASE" \
HOSTED_EVIDENCE_DIR='test-results/staging-browser' \
pnpm test:hosted

LIVE_BASE_URL='<staging-service-url>' \
LIVE_PASSPHRASE="$STAGING_PASSPHRASE" \
EXPECTED_RECEIVER_ORIGIN='<staging-service-url>' \
OUT_DIR='test-results/staging-webkit' \
pnpm verify:hosted

PROBE_PASSPHRASE="$STAGING_PASSPHRASE" \
pnpm security:probe '<staging-service-url>'
```

Run the security probe last because it intentionally floods WebSockets and
consumes the login rate-limit budget.

Then complete `requirements/mobile-qa.md` on physical iPhone Safari and Android
Chrome. Record device versions, network type, lifecycle behavior, screenshots,
and rough delivery latency.

## 7. Promote The Same Image

Production promotion is a separate owner-approval gate. After the candidate PR
is merged, check out clean `main` at the approved SHA and reuse the exact staging
image digest:

```sh
DEPLOY_ENV=production \
PROJECT_ID=openreveal \
IMAGE_URI='<staging-tested artifact path>@sha256:<digest>' \
RELEASE_SHA='<approved full Git SHA>' \
FRONT_DOOR_URL='https://openreveal.web.app' \
ALLOW_PRODUCTION_DEPLOY='DEPLOY_OPENREVEAL_PRODUCTION' \
pnpm cloudrun:deploy
```

Ordinary promotion preserves the existing production Secret Manager values.
Production secret rotation is deliberately not part of deployment.

After promotion, smoke both the Cloud Run service URL and Firebase front door,
then run hosted WebKit verification with
`EXPECTED_RECEIVER_ORIGIN=https://openreveal.web.app`.

## 8. Rollback

Record the previous ready production revision before promotion. If any
production check fails, direct all traffic back to that revision with Cloud Run
traffic management, rerun the smoke test, and document the rollback. Firebase
Hosting continues to point at the stable production service URL and normally
does not need to change.

## Environment Defaults

- Project: `openreveal`
- Region: `asia-southeast1`
- Staging service: `openreveal-staging`
- Production service: `openreveal`
- Minimum instances: `0`
- Maximum instances: `1`
- Request timeout: `3600` seconds
- Places integration: disabled by default
- Session TTL: `30` minutes
- Database: `file:/data/openreveal.sqlite`

## Operational Caveats

- Cloud Run container SQLite can disappear after restart, replacement, or
  redeploy. Do not make durable-history claims.
- Active WebSockets may keep an instance billable while connected.
- A public staging URL is required for audience phones; performer mutations
  remain protected by the staging passphrase.
- Physical phone QA remains required for camera QR scanning, browser lock and
  resume, native Maps handoff, and mobile-network switching.
