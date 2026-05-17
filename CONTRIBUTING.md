# Contributing To OpenReveal

OpenReveal is a consent-based spectator-phone mentalism PWA. Contributions are welcome when they preserve the project's safety, originality, and small v1 scope.

## Ground Rules

- Keep product-facing copy, UI, assets, and routines original.
- Do not use Inject, Google, Apple, or other protected branding in product surfaces.
- Do not clone third-party search, map, social, browser, or device interfaces.
- Do not add hidden device control, covert data collection, native mobile apps, account systems, Redis, Postgres, or expanded effects during Milestone 4/5 hardening.
- Keep v1 single-instance and SQLite-backed.
- Keep performer auth on the HttpOnly same-origin cookie path.
- Keep backend shared contracts free of React imports.

## Local Setup

```sh
cp .env.example .env
pnpm install
pnpm dev
```

Open:

```sh
http://localhost:5173/console
```

The default local passphrase is `openreveal-dev` unless you change `PERFORMER_PASSPHRASE`.

## Before Opening A Pull Request

Run:

```sh
pnpm check
pnpm test:e2e
pnpm audit --audit-level moderate
git diff --check
```

If the change affects realtime, receiver rendering, or performance-sensitive code, also run:

```sh
pnpm test:latency
```

If the change affects production packaging, also run:

```sh
make docker-build
```

Docker image verification requires the local Docker daemon to be running.

## Expected Change Shape

- Keep changes scoped to the behavior being added or fixed.
- Update `PHASED-TASKS.md` and `STATUS.md` when the task state changes.
- Update `COMMANDS.md` when command behavior changes.
- Update `requirements/` docs when product, technical, setup, privacy, or safety assumptions change.
- Add tests proportionate to risk. Shared contracts, API behavior, realtime behavior, and browser-visible flows need test coverage.

## Adding Effects

Read [docs/effect-authoring.md](docs/effect-authoring.md) before adding a new reveal. New effects must use the split contract:

- `packages/shared`: schemas, effect kind, shared constants.
- `apps/api`: validation, enrichment, persistence behavior.
- `apps/web`: performer form and spectator reveal component.

Do not add effect-specific branching to core auth, session, realtime, or persistence code.

## Safety Review

Every meaningful change should answer:

- Does this preserve spectator consent?
- Does this avoid cloned third-party UI?
- Does this avoid collecting private spectator data?
- Does this keep v1 single-instance and SQLite-backed?
- Does this preserve session expiry, reset, and cleanup behavior?
- Does this keep hosted-instance reporting usable?

Use [requirements/safety-and-legal.md](requirements/safety-and-legal.md) as the safety checklist.

## Licensing

The source code is AGPL-3.0-only. Routine packs, presets, text, images, and other assets need explicit source and license metadata before they ship. See [docs/routine-pack-licensing.md](docs/routine-pack-licensing.md).
