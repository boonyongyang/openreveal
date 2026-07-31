.PHONY: help install dev lint typecheck test test-e2e test-hosted test-latency build check audit docker-build record-showcase record-location-celebrity release-scan cloudrun-build cloudrun-deploy cloudrun-preflight cloudrun-provision smoke-deploy security-probe verify-hosted maintenance-cleanup

help:
	@printf "OpenReveal commands\n"
	@printf "  make install    Install workspace dependencies\n"
	@printf "  make dev        Run API and web dev servers\n"
	@printf "  make lint       Run package lint scripts\n"
	@printf "  make typecheck  Run TypeScript checks\n"
	@printf "  make test       Run unit/API tests\n"
	@printf "  make test-e2e   Run Playwright browser flow tests\n"
	@printf "  make test-hosted HOSTED_BASE_URL=... PERFORMER_PASSPHRASE=...  Run browser flows against a hosted service\n"
	@printf "  make test-latency  Measure local prepared reveal render-ack p95\n"
	@printf "  make build      Build all packages\n"
	@printf "  make check      Run lint, typecheck, test, and build\n"
	@printf "  make audit      Run pnpm dependency audit\n"
	@printf "  make docker-build  Build the reference production image\n"
	@printf "  make record-showcase  Record a local performer/audience QA MP4\n"
	@printf "  make record-location-celebrity  Record a focused location/celebrity QA MP4\n"
	@printf "  make release-scan  Check tracked/unignored files for secret/private deployment artifacts\n"
	@printf "  make cloudrun-build PROJECT_ID=...  Build an immutable Artifact Registry image\n"
	@printf "  make cloudrun-provision DEPLOY_ENV=staging PROJECT_ID=...  Provision isolated runtime secrets\n"
	@printf "  make cloudrun-deploy DEPLOY_ENV=staging IMAGE_URI=... RELEASE_SHA=...  Deploy an immutable image\n"
	@printf "  make cloudrun-preflight PROJECT_ID=...  Check Cloud Run project readiness\n"
	@printf "  make smoke-deploy BASE_URL=https://...  Smoke test a deployed instance\n"
	@printf "  make security-probe BASE_URL=http://localhost:4000  Intrusive abuse probe (local/staging)\n"
	@printf "  make verify-hosted LIVE_BASE_URL=... LIVE_PASSPHRASE=...  Capture hosted WebKit proof\n"
	@printf "  make maintenance-cleanup  Expire and prune old session data\n"

install:
	pnpm install

dev:
	pnpm dev

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

test-e2e:
	pnpm test:e2e

test-hosted:
	test -n "$(HOSTED_BASE_URL)"
	test -n "$(PERFORMER_PASSPHRASE)"
	HOSTED_BASE_URL="$(HOSTED_BASE_URL)" HOSTED_API_BASE_URL="$(HOSTED_API_BASE_URL)" PERFORMER_PASSPHRASE="$(PERFORMER_PASSPHRASE)" pnpm test:hosted

test-latency:
	pnpm test:latency

build:
	pnpm build

check:
	pnpm check

audit:
	pnpm audit --audit-level moderate

docker-build:
	docker build -t openreveal:local .

record-showcase:
	pnpm record:showcase

record-location-celebrity:
	pnpm record:location-celebrity

release-scan:
	pnpm release:scan

cloudrun-build:
	test -n "$(PROJECT_ID)"
	PROJECT_ID="$(PROJECT_ID)" pnpm cloudrun:build

cloudrun-provision:
	test -n "$(PROJECT_ID)"
	test -n "$(DEPLOY_ENV)"
	PROJECT_ID="$(PROJECT_ID)" DEPLOY_ENV="$(DEPLOY_ENV)" ALLOW_PRODUCTION_PROVISION="$(ALLOW_PRODUCTION_PROVISION)" pnpm cloudrun:provision

cloudrun-deploy:
	test -n "$(PROJECT_ID)"
	test -n "$(DEPLOY_ENV)"
	test -n "$(IMAGE_URI)"
	test -n "$(RELEASE_SHA)"
	PROJECT_ID="$(PROJECT_ID)" DEPLOY_ENV="$(DEPLOY_ENV)" IMAGE_URI="$(IMAGE_URI)" RELEASE_SHA="$(RELEASE_SHA)" FRONT_DOOR_URL="$(FRONT_DOOR_URL)" ALLOW_PRODUCTION_DEPLOY="$(ALLOW_PRODUCTION_DEPLOY)" pnpm cloudrun:deploy

cloudrun-preflight:
	test -n "$(PROJECT_ID)"
	pnpm cloudrun:preflight "$(PROJECT_ID)"

smoke-deploy:
	test -n "$(BASE_URL)"
	pnpm smoke:deploy "$(BASE_URL)"

security-probe:
	pnpm security:probe "$(BASE_URL)"

verify-hosted:
	test -n "$(LIVE_BASE_URL)"
	test -n "$(LIVE_PASSPHRASE)"
	LIVE_BASE_URL="$(LIVE_BASE_URL)" LIVE_PASSPHRASE="$(LIVE_PASSPHRASE)" EXPECTED_RECEIVER_ORIGIN="$(EXPECTED_RECEIVER_ORIGIN)" OUT_DIR="$(OUT_DIR)" pnpm verify:hosted

maintenance-cleanup:
	pnpm maintenance:cleanup
