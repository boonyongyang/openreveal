# Cloud Run Deployment

Use this guide for the first hosted OpenReveal test. The supported v1 Cloud Run shape is one public service with `max instances = 1` because WebSocket fanout is currently in memory.

## Project Requirements

- Dedicated Google Cloud project, for example `openreveal-test`.
- Billing enabled on that project.
- Google Cloud CLI authenticated with an account that can enable APIs and deploy Cloud Run.
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
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## First Deploy

Generate secrets locally:

```sh
SESSION_SECRET=$(openssl rand -hex 32)
PERFORMER_PASSPHRASE='<choose-a-private-passphrase>'
```

Deploy the service. The first deploy can use a placeholder base URL; update it after Cloud Run returns the real URL.

```sh
gcloud run deploy openreveal \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --timeout 3600 \
  --set-env-vars NODE_ENV=production,APP_BASE_URL=https://placeholder.invalid,API_BASE_URL=https://placeholder.invalid,DATABASE_URL=file:/data/openreveal.sqlite,SESSION_SECRET="$SESSION_SECRET",SESSION_TTL_MINUTES=30,PERFORMER_PASSPHRASE="$PERFORMER_PASSPHRASE",GOOGLE_PLACES_ENABLED=false,WEB_DIST_DIR=/app/apps/web/dist,VITE_ABUSE_REPORT_URL=
```

After deploy, copy the service URL and update the base URLs:

```sh
SERVICE_URL=$(gcloud run services describe openreveal --region asia-southeast1 --format='value(status.url)')

gcloud run services update openreveal \
  --region asia-southeast1 \
  --set-env-vars APP_BASE_URL="$SERVICE_URL",API_BASE_URL="$SERVICE_URL"
```

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
