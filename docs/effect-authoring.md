# Effect Authoring Guide

This guide explains how to add reveal effects without weakening the session, realtime, or safety model.

## Current V1 Effects

- `location`: manual text fields plus server-generated official Google Maps URL.
- `celebrity`: text-only name, optional subtitle, optional source URL, and bundled factual-name-only preset metadata.
- `custom_text`: performer-provided title, message body, and optional footer.

Phase 6 proved the split contract with `custom_text`, local preset import/export, and auditable celebrity preset metadata. Continue adding future effects through the split contract below.

## Contract Shape

Every effect has three slices.

### Shared

Location:

```sh
packages/shared/src/effects.ts
```

Responsibilities:

- Add the effect kind.
- Add the TypeBox payload schema.
- Export the TypeScript payload type.
- Add the effect definition and sample payload.

Rules:

- No React imports.
- No backend-only imports.
- No database code.
- Keep payloads serializable JSON.

### API

Location:

```sh
apps/api/src/effects/
```

Responsibilities:

- Validate performer input against the shared schema or a stricter input schema.
- Enrich payloads if needed.
- Keep third-party URL/API generation server-side.
- Register the effect in `apps/api/src/effects/index.ts`.

Rules:

- Never trust client payload shape.
- Do not store raw private spectator data.
- Do not call third-party APIs unless setup, keys, rate limits, and terms are documented.
- Keep Maps/Places integrations official; do not scrape or clone.

### Web

Location:

```sh
apps/web/src/effects/
```

Responsibilities:

- Add the performer form.
- Add the spectator reveal component.
- Register the web effect in `apps/web/src/effects/index.ts`.

Rules:

- Keep spectator pages original.
- Do not use third-party logos or copied layouts.
- Do not reveal prepared state before `reveal_sent`.
- Keep waiting and armed spectator states visually identical.

## Implementation Checklist

- [ ] Add shared TypeBox payload schema.
- [ ] Add shared payload type.
- [ ] Add effect definition and sample.
- [ ] Add API validator/enricher.
- [ ] Register API effect.
- [ ] Add performer form.
- [ ] Add spectator reveal component.
- [ ] Register web effect.
- [ ] Add shared schema tests if the schema has new constraints.
- [ ] Add API validation/enrichment tests.
- [ ] Add Playwright flow test for arm/send/reset.
- [ ] Update requirements docs.
- [ ] Update routine-pack licensing notes if presets/assets are included.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm test:e2e`.
- [ ] Run `pnpm test:latency` if reveal timing could be affected.

## Core Boundary

Do not add effect-specific branches to:

- auth
- session creation
- session expiry
- reset/end behavior
- WebSocket join/reconnect
- generic reveal persistence
- generic performer controls

If a new effect appears to require core branching, first document the generic capability it needs. Add a reusable hook or extension point only when it reduces real duplication and is safe for all effect kinds.

## Presets

Presets must include:

- effect kind
- display label
- payload or draft fields
- source, when derived from third-party data
- license or permission notes, when applicable

Bundled celebrity presets live in `packages/shared/src/celebrity-presets.ts` so metadata can be audited without loading the performer UI.

Do not include celebrity images, venue images, or other copyrighted media without a documented license.

## Third-Party APIs

Official deep links are allowed where appropriate. API integrations require:

- setup documentation
- environment variables
- domain/key restrictions
- error behavior
- rate-limit behavior
- privacy review

For v1, Google Maps API keys are not required because location reveals use official Maps URLs only.
