#!/usr/bin/env bash
# Deploy an immutable OpenReveal image to an explicitly selected Cloud Run environment.
# Secret creation/rotation is intentionally handled by cloud-run-provision.sh.
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-}"
PROJECT_ID="${PROJECT_ID:-openreveal}"
REGION="${REGION:-asia-southeast1}"
IMAGE_URI="${IMAGE_URI:-}"
RELEASE_SHA="${RELEASE_SHA:-}"
FRONT_DOOR_URL="${FRONT_DOOR_URL:-}"
ABUSE_REPORT_URL="${ABUSE_REPORT_URL:-https://github.com/boonyongyang/openreveal/issues/new?template=safety_concern.md}"

case "$DEPLOY_ENV" in
  staging)
    SERVICE="${SERVICE:-openreveal-staging}"
    API_RATE_LIMIT_MAX_VALUE="${API_RATE_LIMIT_MAX:-1000}"
    ;;
  production)
    SERVICE="${SERVICE:-openreveal}"
    API_RATE_LIMIT_MAX_VALUE="${API_RATE_LIMIT_MAX:-100}"
    ;;
  *)
    echo "ERROR: set DEPLOY_ENV=staging or DEPLOY_ENV=production." >&2
    exit 1
    ;;
esac

SESSION_SECRET_SECRET="${SESSION_SECRET_SECRET:-${SERVICE}-session-secret}"
PERFORMER_PASSPHRASE_SECRET="${PERFORMER_PASSPHRASE_SECRET:-${SERVICE}-performer-passphrase}"

if [[ ! "$IMAGE_URI" =~ @sha256:[0-9a-f]{64}$ ]]; then
  echo "ERROR: IMAGE_URI must be an immutable Artifact Registry digest reference." >&2
  exit 1
fi
if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ERROR: RELEASE_SHA must be the full 40-character Git commit SHA." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: refuse to deploy from a dirty worktree." >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$RELEASE_SHA" ]]; then
  echo "ERROR: RELEASE_SHA does not match the checked-out commit." >&2
  exit 1
fi

if [[ "$DEPLOY_ENV" == "staging" && "$SERVICE" == "openreveal" ]]; then
  echo "ERROR: staging cannot target the production service." >&2
  exit 1
fi
if [[ "$DEPLOY_ENV" == "production" ]]; then
  if [[ "$SERVICE" != "openreveal" ]]; then
    echo "ERROR: production must target service openreveal." >&2
    exit 1
  fi
  if [[ "${ALLOW_PRODUCTION_DEPLOY:-}" != "DEPLOY_OPENREVEAL_PRODUCTION" ]]; then
    echo "ERROR: production requires ALLOW_PRODUCTION_DEPLOY=DEPLOY_OPENREVEAL_PRODUCTION." >&2
    exit 1
  fi
  if [[ "$(git branch --show-current)" != "main" ]]; then
    echo "ERROR: production deployment requires the reviewed main branch." >&2
    exit 1
  fi
  if [[ -z "$FRONT_DOOR_URL" ]]; then
    echo "ERROR: production requires FRONT_DOOR_URL." >&2
    exit 1
  fi
fi

echo "==> Preflight"
node scripts/cloud-run-preflight.mjs "$PROJECT_ID"

echo "==> Selecting project + region"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

for secret_name in "$SESSION_SECRET_SECRET" "$PERFORMER_PASSPHRASE_SECRET"; do
  if ! gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "ERROR: missing Secret Manager secret $secret_name; run cloud-run-provision.sh first." >&2
    exit 1
  fi
done

resolve_secret_version() {
  local secret_name="$1"
  local raw_version
  local version

  raw_version="$(gcloud secrets versions list "$secret_name" \
    --project "$PROJECT_ID" \
    --filter='state=ENABLED' \
    --sort-by='~createTime' \
    --limit=1 \
    --format='value(name)')"
  version="${raw_version##*/}"

  if [[ ! "$version" =~ ^[0-9]+$ ]]; then
    echo "ERROR: secret $secret_name has no enabled version." >&2
    exit 1
  fi

  printf '%s' "$version"
}

SESSION_SECRET_VERSION="$(resolve_secret_version "$SESSION_SECRET_SECRET")"
PERFORMER_PASSPHRASE_VERSION="$(resolve_secret_version "$PERFORMER_PASSPHRASE_SECRET")"

SERVICE_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)' 2>/dev/null || true)"
APP_BASE_URL="${FRONT_DOOR_URL:-${SERVICE_URL:-https://placeholder.invalid}}"
API_BASE_URL="${SERVICE_URL:-https://placeholder.invalid}"

echo "==> Deploying ${DEPLOY_ENV} image ${IMAGE_URI}"
gcloud run deploy "$SERVICE" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 3600 \
  --labels "environment=${DEPLOY_ENV},release-sha=${RELEASE_SHA}" \
  --set-env-vars "NODE_ENV=production,APP_BASE_URL=${APP_BASE_URL},API_BASE_URL=${API_BASE_URL},DATABASE_URL=file:/data/openreveal.sqlite,SESSION_TTL_MINUTES=30,API_RATE_LIMIT_MAX=${API_RATE_LIMIT_MAX_VALUE},AUTH_RATE_LIMIT_MAX=10,GOOGLE_PLACES_ENABLED=false,GOOGLE_PLACES_DAILY_BUDGET=0,WEB_DIST_DIR=/app/apps/web/dist,VITE_ABUSE_REPORT_URL=${ABUSE_REPORT_URL}" \
  --set-secrets "SESSION_SECRET=${SESSION_SECRET_SECRET}:${SESSION_SECRET_VERSION},PERFORMER_PASSPHRASE=${PERFORMER_PASSPHRASE_SECRET}:${PERFORMER_PASSPHRASE_VERSION}"

SERVICE_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
APP_BASE_URL="${FRONT_DOOR_URL:-$SERVICE_URL}"

if [[ "$API_BASE_URL" != "$SERVICE_URL" || "$APP_BASE_URL" == "https://placeholder.invalid" ]]; then
  echo "==> Applying final service URLs"
  gcloud run services update "$SERVICE" \
    --region "$REGION" \
    --update-env-vars "APP_BASE_URL=${APP_BASE_URL},API_BASE_URL=${SERVICE_URL}"
fi

REVISION="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.latestReadyRevisionName)')"

echo "==> Smoke test"
pnpm smoke:deploy "$SERVICE_URL"

echo "OPENREVEAL_DEPLOY_ENV=${DEPLOY_ENV}"
echo "OPENREVEAL_SERVICE=${SERVICE}"
echo "OPENREVEAL_SERVICE_URL=${SERVICE_URL}"
echo "OPENREVEAL_REVISION=${REVISION}"
echo "OPENREVEAL_RELEASE_SHA=${RELEASE_SHA}"
echo "OPENREVEAL_IMAGE=${IMAGE_URI}"
echo "OPENREVEAL_SESSION_SECRET_VERSION=${SESSION_SECRET_VERSION}"
echo "OPENREVEAL_PERFORMER_PASSPHRASE_VERSION=${PERFORMER_PASSPHRASE_VERSION}"
