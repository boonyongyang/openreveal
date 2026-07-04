# Cloud Run Deployment

Use this guide for the first hosted OpenReveal test. The supported v1 Cloud Run shape is one public service with `max instances = 1` because WebSocket fanout is currently in memory.

## Project Requirements

- Dedicated Google Cloud project, for example `openreveal-test`.
- Billing enabled on that project.
- Google Cloud CLI authenticated with an account that can enable APIs, create Secret Manager secrets, and deploy Cloud Run.
- Region: `asia-southeast1` unless there is a reason to choose another region.

Do not deploy to unrelated existing projects. `spacebuns-kotlin` is explicitly not a target.

## Enable Services

Check the project first:

```sh
pnpm cloudrun:preflight <PROJECT_ID>
```

If the preflight reports missing services after billing is enabled, enable them:

```sh
gcloud config set project <PROJECT_ID>
gcloud config set run/region asia-southeast1
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

## First Deploy

Generate secrets locally. Do not paste these values into chat, issues, docs, or commit history:

```sh
SESSION_SECRET=$(openssl rand -hex 32)
PERFORMER_PASSPHRASE='<choose-a-private-passphrase>'
```

Store runtime secrets in Secret Manager and grant the Cloud Run runtime service account access:

```sh
PROJECT_ID=<PROJECT_ID>
REGION=asia-southeast1
SERVICE=openreveal
FRONT_DOOR_URL=https://openreveal.web.app
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

printf "%s" "$SESSION_SECRET" | gcloud secrets create openreveal-session-secret \
  --project "$PROJECT_ID" \
  --replication-policy automatic \
  --data-file=-

printf "%s" "$PERFORMER_PASSPHRASE" | gcloud secrets create openreveal-performer-passphrase \
  --project "$PROJECT_ID" \
  --replication-policy automatic \
  --data-file=-

gcloud secrets add-iam-policy-binding openreveal-session-secret \
  --project "$PROJECT_ID" \
  --member "serviceAccount:${SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding openreveal-performer-passphrase \
  --project "$PROJECT_ID" \
  --member "serviceAccount:${SERVICE_ACCOUNT}" \
  --role roles/secretmanager.secretAccessor
```

For later rotations, add a new secret version instead of recreating the secret:

```sh
printf "%s" "$SESSION_SECRET" | gcloud secrets versions add openreveal-session-secret --project "$PROJECT_ID" --data-file=-
printf "%s" "$PERFORMER_PASSPHRASE" | gcloud secrets versions add openreveal-performer-passphrase --project "$PROJECT_ID" --data-file=-
```

Deploy the service. The first deploy can use a placeholder base URL; update it after Cloud Run returns the real URL.

```sh
gcloud run deploy openreveal \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production,APP_BASE_URL=https://placeholder.invalid,API_BASE_URL=https://placeholder.invalid,DATABASE_URL=file:/data/openreveal.sqlite,SESSION_TTL_MINUTES=30,GOOGLE_PLACES_ENABLED=false,WEB_DIST_DIR=/app/apps/web/dist,VITE_ABUSE_REPORT_URL= \
  --set-secrets SESSION_SECRET=openreveal-session-secret:latest,PERFORMER_PASSPHRASE=openreveal-performer-passphrase:latest
```

The helper script does the same Secret Manager setup and smoke test in one pass:

```sh
PROJECT_ID=<PROJECT_ID> FRONT_DOOR_URL=https://openreveal.web.app PERFORMER_PASSPHRASE='<choose-a-private-passphrase>' ./scripts/cloud-run-deploy.sh
```

After deploy, copy the service URL and update the base URLs:

```sh
SERVICE_URL=$(gcloud run services describe openreveal --region asia-southeast1 --format='value(status.url)')

gcloud run services update openreveal \
  --region asia-southeast1 \
  --set-env-vars APP_BASE_URL="${FRONT_DOOR_URL:-$SERVICE_URL}",API_BASE_URL="$SERVICE_URL"
```

## Security And Abuse Controls

These optional env vars tune the abuse/cost defenses. They all default to safe
values, so set them only to override:

- `API_RATE_LIMIT_MAX` (default 100): per-IP requests/minute across the API.
- `AUTH_RATE_LIMIT_MAX` (default 10): per-IP `/api/auth/login` attempts/minute, a
  tighter limit to blunt brute-force against the single shared passphrase.
- `CLEANUP_INTERVAL_MINUTES` (default 30): how often expired sessions and aged
  rows are pruned. `0` disables the background scheduler.
- `GOOGLE_PLACES_DAILY_BUDGET` (default 0 = unlimited): hard daily ceiling on
  upstream Google Places calls. Set this when Places is enabled so a leaked
  passphrase cannot run an unbounded Google bill. Cached lookups do not count.

Per-IP limits depend on `trustProxy`, which is enabled so `request.ip` reads the
real client from Cloud Run's `X-Forwarded-For` rather than the front-end proxy.

`pnpm smoke:deploy` asserts the HSTS header on https targets. To actively
exercise the abuse defenses (WS message-flood limit, per-IP socket cap, login
rate limit), run `pnpm security:probe <base-url>` against a **local or staging**
instance — it is intrusive (floods sockets and burns the login budget) and is
not meant for a live production URL.

> **Why a single instance is mandatory, not just a fanout concern:** the rate
> limiter, the per-IP WebSocket connection cap, the Places cache/budget, and the
> WebSocket hub are all **in-process**. With more than one instance each replica
> keeps its own counters, so per-IP limits and the daily Places budget multiply
> by the instance count and WebSocket peers can land on different replicas. Keep
> `--max-instances 1` until this state is moved to a shared store.

## Smoke Test

```sh
pnpm smoke:deploy "$SERVICE_URL"
```

Then manually open:

- `$SERVICE_URL/console`
- `$SERVICE_URL/privacy`
- `$SERVICE_URL/report`

Create a session, open the receiver URL on a real phone, and complete the checks in [requirements/mobile-qa.md](../requirements/mobile-qa.md).

## Important V1 Caveats

- Keep `max instances = 1` until realtime fanout moves out of memory.
- Container-local SQLite is acceptable for temporary testing only. It can be lost on redeploy, restart, or instance replacement.
- For real public use, choose a durable database/storage path before relying on session history.
- WebSocket requests can stay open for the Cloud Run request timeout and may keep the instance billable while connected.
- `SESSION_SECRET` and `PERFORMER_PASSPHRASE` should be deployed through Secret Manager, not plain Cloud Run environment variables.
