#!/usr/bin/env bash
# One-command Cloud Run deploy for the single-host OpenReveal service.
# Prerequisite: billing must be linked to the project (see
# docs/cloud-run-deployment.md). Run from the repo root:
#
#   PERFORMER_PASSPHRASE='your-private-passphrase' ./scripts/cloud-run-deploy.sh
#
# Optional env: PROJECT_ID (default openreveal-mvp), REGION (default
# asia-southeast1), SERVICE (default openreveal).
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-openreveal-mvp}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-openreveal}"

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
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

SESSION_SECRET="$(openssl rand -hex 32)"

echo "==> Deploying (build from Dockerfile, first pass with placeholder base URL)"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances 1 \
  --timeout 3600 \
  --set-env-vars "NODE_ENV=production,APP_BASE_URL=https://placeholder.invalid,API_BASE_URL=https://placeholder.invalid,DATABASE_URL=file:/data/openreveal.sqlite,SESSION_SECRET=${SESSION_SECRET},SESSION_TTL_MINUTES=30,PERFORMER_PASSPHRASE=${PERFORMER_PASSPHRASE},GOOGLE_PLACES_ENABLED=false,WEB_DIST_DIR=/app/apps/web/dist,VITE_ABUSE_REPORT_URL="

SERVICE_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo "==> Service URL: $SERVICE_URL"

echo "==> Re-pointing base URLs at the real service URL"
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --update-env-vars "APP_BASE_URL=${SERVICE_URL},API_BASE_URL=${SERVICE_URL}"

echo "==> Smoke test"
pnpm smoke:deploy "$SERVICE_URL"

echo ""
echo "============================================================"
echo " OpenReveal is live:"
echo "   Console (you):     ${SERVICE_URL}/console"
echo "   Spectator types:   ${SERVICE_URL#https://}/<3-digit-code>"
echo "   Passphrase:        ${PERFORMER_PASSPHRASE}"
echo "============================================================"
echo "Note: container-local SQLite resets on redeploy/cold start (fine for a test)."
