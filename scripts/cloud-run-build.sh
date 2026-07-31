#!/usr/bin/env bash
# Build one immutable container artifact for staging verification and later promotion.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-openreveal}"
REGION="${REGION:-asia-southeast1}"
REPOSITORY="${REPOSITORY:-openreveal}"
IMAGE_NAME="${IMAGE_NAME:-openreveal}"
RELEASE_SHA="${RELEASE_SHA:-$(git rev-parse HEAD)}"

if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ERROR: RELEASE_SHA must be the full 40-character Git commit SHA." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: refuse to build a release image from a dirty worktree." >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$RELEASE_SHA" ]]; then
  echo "ERROR: RELEASE_SHA does not match the checked-out commit." >&2
  exit 1
fi

node scripts/cloud-run-preflight.mjs "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"

if ! gcloud artifacts repositories describe "$REPOSITORY" \
  --project "$PROJECT_ID" \
  --location "$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --repository-format docker \
    --description "Immutable OpenReveal release images"
fi

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${RELEASE_SHA}"
gcloud builds submit --project "$PROJECT_ID" --tag "$IMAGE_TAG" .

DIGEST="$(gcloud artifacts docker images describe "$IMAGE_TAG" \
  --project "$PROJECT_ID" \
  --format='value(image_summary.digest)')"

if [[ ! "$DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "ERROR: could not resolve immutable image digest for ${IMAGE_TAG}." >&2
  exit 1
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}@${DIGEST}"
echo "OPENREVEAL_RELEASE_SHA=${RELEASE_SHA}"
echo "OPENREVEAL_IMAGE=${IMAGE_URI}"
