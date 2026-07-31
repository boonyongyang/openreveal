#!/usr/bin/env bash
# Provision environment-specific OpenReveal runtime secrets without deploying code.
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-}"
PROJECT_ID="${PROJECT_ID:-openreveal}"
REGION="${REGION:-asia-southeast1}"

case "$DEPLOY_ENV" in
  staging)
    SERVICE="${SERVICE:-openreveal-staging}"
    ;;
  production)
    SERVICE="${SERVICE:-openreveal}"
    if [[ "${ALLOW_PRODUCTION_PROVISION:-}" != "PROVISION_OPENREVEAL_PRODUCTION" ]]; then
      echo "ERROR: production provisioning requires ALLOW_PRODUCTION_PROVISION=PROVISION_OPENREVEAL_PRODUCTION." >&2
      exit 1
    fi
    ;;
  *)
    echo "ERROR: set DEPLOY_ENV=staging or DEPLOY_ENV=production." >&2
    exit 1
    ;;
esac

if [[ "$DEPLOY_ENV" == "staging" && "$SERVICE" == "openreveal" ]]; then
  echo "ERROR: staging cannot use the production service name." >&2
  exit 1
fi

SESSION_SECRET_SECRET="${SESSION_SECRET_SECRET:-${SERVICE}-session-secret}"
PERFORMER_PASSPHRASE_SECRET="${PERFORMER_PASSPHRASE_SECRET:-${SERVICE}-performer-passphrase}"

node scripts/cloud-run-preflight.mjs "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}"

create_secret_if_missing() {
  local secret_name="$1"
  local byte_count="$2"

  if gcloud secrets describe "$secret_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Existing secret preserved: ${secret_name}"
  else
    gcloud secrets create "$secret_name" \
      --project "$PROJECT_ID" \
      --replication-policy automatic >/dev/null
    openssl rand -hex "$byte_count" | tr -d '\n' | gcloud secrets versions add "$secret_name" \
      --project "$PROJECT_ID" \
      --data-file=- >/dev/null
    echo "Created secret: ${secret_name}"
  fi

  if ! gcloud secrets versions list "$secret_name" \
    --project "$PROJECT_ID" \
    --filter='state=ENABLED' \
    --limit=1 \
    --format='value(name)' | grep -q .; then
    echo "ERROR: secret ${secret_name} has no enabled version." >&2
    exit 1
  fi

  gcloud secrets add-iam-policy-binding "$secret_name" \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${SERVICE_ACCOUNT}" \
    --role roles/secretmanager.secretAccessor >/dev/null
}

create_secret_if_missing "$SESSION_SECRET_SECRET" 32
create_secret_if_missing "$PERFORMER_PASSPHRASE_SECRET" 24

echo "Provisioned ${DEPLOY_ENV} secrets for service ${SERVICE}."
echo "Secret values were written directly to Secret Manager and were not printed."
