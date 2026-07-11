#!/usr/bin/env bash
# One-command Cloud Run deploy for the single-host OpenReveal service.
# Prerequisite: billing must be linked to the project (see
# docs/cloud-run-deployment.md). Run from the repo root:
#
#   PERFORMER_PASSPHRASE='your-private-passphrase' ./scripts/cloud-run-deploy.sh
#
# Optional env: PROJECT_ID (default openreveal), REGION (default
# asia-southeast1), SERVICE (default openreveal), FRONT_DOOR_URL,
# SERVICE_ACCOUNT, SESSION_SECRET_SECRET, PERFORMER_PASSPHRASE_SECRET.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-openreveal}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-openreveal}"
FRONT_DOOR_URL="${FRONT_DOOR_URL:-}"
SESSION_SECRET_SECRET="${SESSION_SECRET_SECRET:-${SERVICE}-session-secret}"
PERFORMER_PASSPHRASE_SECRET="${PERFORMER_PASSPHRASE_SECRET:-${SERVICE}-performer-passphrase}"
ABUSE_REPORT_URL="${ABUSE_REPORT_URL:-https://github.com/boonyongyang/openreveal/issues/new?template=safety_concern.md}"

if [[ -z "${PERFORMER_PASSPHRASE:-}" ]]; then
  echo "ERROR: set PERFORMER_PASSPHRASE (>=12 chars) before running." >&2
  exit 1
fi
if [[ "${#PERFORMER_PASSPHRASE}" -lt 12 ]]; then
  echo "ERROR: PERFORMER_PASSPHRASE must be at least 12 characters." >&2
  exit 1
fi

echo "==> Preflight"
node scripts/cloud-run-preflight.mjs "$PROJECT_ID" || {
  echo "Preflight failed. Link billing and re-run." >&2
  exit 1
}

echo "==> Selecting project + region"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

echo "==> Enabling services"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

SESSION_SECRET="$(openssl rand -hex 32)"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

put_secret_version() {
  local secret_name="$1"
  local secret_value="$2"

  if ! gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret_name" \
      --project "$PROJECT_ID" \
      --replication-policy automatic
  fi

  printf "%s" "$secret_value" | gcloud secrets versions add "$secret_name" \
    --project "$PROJECT_ID" \
    --data-file=- >/dev/null

  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${SERVICE_ACCOUNT}" \
    --role roles/secretmanager.secretAccessor >/dev/null
}

echo "==> Writing runtime secrets to Secret Manager"
put_secret_version "$SESSION_SECRET_SECRET" "$SESSION_SECRET"
put_secret_version "$PERFORMER_PASSPHRASE_SECRET" "$PERFORMER_PASSPHRASE"

echo "==> Deploying (build from Dockerfile, first pass with placeholder base URL)"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances 1 \
  --timeout 3600 \
  --set-env-vars "NODE_ENV=production,APP_BASE_URL=https://placeholder.invalid,API_BASE_URL=https://placeholder.invalid,DATABASE_URL=file:/data/openreveal.sqlite,SESSION_TTL_MINUTES=30,GOOGLE_PLACES_ENABLED=false,WEB_DIST_DIR=/app/apps/web/dist,VITE_ABUSE_REPORT_URL=${ABUSE_REPORT_URL}" \
  --set-secrets "SESSION_SECRET=${SESSION_SECRET_SECRET}:latest,PERFORMER_PASSPHRASE=${PERFORMER_PASSPHRASE_SECRET}:latest"

SERVICE_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
APP_BASE_URL="${FRONT_DOOR_URL:-$SERVICE_URL}"
echo "==> Service URL: $SERVICE_URL"

echo "==> Re-pointing base URLs"
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --update-env-vars "APP_BASE_URL=${APP_BASE_URL},API_BASE_URL=${SERVICE_URL}"

echo "==> Smoke test"
pnpm smoke:deploy "$SERVICE_URL"

echo ""
echo "============================================================"
echo " OpenReveal is live:"
echo "   Console (you):     ${SERVICE_URL}/console"
echo "   Spectator opens:   ${APP_BASE_URL#https://}/ then enters the 8-character code"
echo "   Passphrase:        stored in Secret Manager (${PERFORMER_PASSPHRASE_SECRET})"
echo "============================================================"
echo "Note: container-local SQLite resets on redeploy/cold start (fine for a test)."
