.PHONY: help install dev lint typecheck test test-e2e test-latency build check audit docker-build maintenance-cleanup

help:
	@printf "OpenReveal commands\n"
	@printf "  make install    Install workspace dependencies\n"
	@printf "  make dev        Run API and web dev servers\n"
	@printf "  make lint       Run package lint scripts\n"
	@printf "  make typecheck  Run TypeScript checks\n"
	@printf "  make test       Run unit/API tests\n"
	@printf "  make test-e2e   Run Playwright browser flow tests\n"
	@printf "  make test-latency  Measure local prepared reveal render-ack p95\n"
	@printf "  make build      Build all packages\n"
	@printf "  make check      Run lint, typecheck, test, and build\n"
	@printf "  make audit      Run pnpm dependency audit\n"
	@printf "  make docker-build  Build the reference production image\n"
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

maintenance-cleanup:
	pnpm maintenance:cleanup
