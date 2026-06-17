# Requirement Gathering

This folder captures the product, technical, setup, and safety requirements for the open-source mentalism PWA.

Start here:

- [Starter guide](../STARTER-GUIDE.md): first run, console walkthrough, and using the location/celebrity reveals.
- [Command reference](../COMMANDS.md): exact local commands, URLs, environment defaults, and verification flow.
- [Local testing setup](../docs/local-testing-setup.md): desktop rehearsal and same-Wi-Fi audience-phone setup before deployment.
- [Contributor guide](../CONTRIBUTING.md): local workflow, PR expectations, effect boundaries, and safety review.
- [Phased task list](../PHASED-TASKS.md): remaining considerations and implementation phases.
- [Architecture guide](../docs/architecture.md): performer, receiver, API, WebSocket, database, and effect-registry flow.
- [Effect authoring guide](../docs/effect-authoring.md): split shared/API/web contract for future reveal effects.
- [Local preset format](../docs/preset-format.md): versioned JSON import/export shape.
- [Routine pack licensing](../docs/routine-pack-licensing.md): source/license rules for presets, text, and assets.
- [Product requirements](product-requirements.md): roles, workflows, v1 effects, and feature backlog.
- [Technical requirements](technical-requirements.md): architecture, realtime protocol, data model, security, and testing.
- [Setup requirements](setup-requirements.md): local development prerequisites, environment variables, service dependencies, and deployment assumptions.
- [Mobile QA checklist](mobile-qa.md): real-device checks for iPhone Safari and Android Chrome.
- [Latency report](latency-report.md): repeatable local prepared-foreground reveal latency measurement and latest p95 result.
- [Owner input checklist](owner-inputs.md): domain, hosting, mobile QA, and product decisions needed from the project owner.
- [End-to-end testing plan](../docs/testing-plan.md): automated, manual performer, audience-phone, mobile reliability, and production-smoke test procedure.
- [Deployment readiness checklist](../docs/deployment-readiness.md): final automated, owner, and device gates before a public deploy.
- [Cloud Run deployment guide](../docs/cloud-run-deployment.md): first hosted deployment path after a billed GCP project exists.
- [Build suggestions](../docs/build-suggestions.md): recommended post-deployment product, operations, and scale work.
- [Safety and legal requirements](safety-and-legal.md): consent-first boundaries, privacy, branding, licensing, and prohibited behavior.
- [Production deployment guide](../docs/production-deployment.md): single-node deployment, Docker, SQLite data path, cleanup, and release checks.

## Current Decisions

- Build web/PWA first.
- Product identity is OpenReveal.
- License is AGPL-3.0.
- Launch with location and celebrity reveals.
- Use original spectator-facing pages.
- Spectator pre-reveal view is neutral and original, without fake portal links, copied page chrome, or third-party impersonation.
- Reveal payloads are pre-fetched on `reveal_prepared` so `reveal_sent` is a local state flip; prepared foreground/local p95 target is 250ms, while real mobile 4G is best-effort under one second.
- V1 backend is single-process, SQLite-backed. Multi-instance and Postgres are post-v1.
- V1 auth is a single env-configured performer passphrase that mints a signed token.
- V1 ships text-only celebrity reveals; images are deferred pending licensing review.
- Bundled celebrity presets are factual name-only labels with original category text and explicit source/license metadata.
- Locked v1 stack: Node 22.12+, pnpm workspaces, Vite + React + TypeScript, Fastify, `@fastify/websocket`, SQLite via Drizzle + libsql, TypeBox/Ajv schemas, Vitest, and Playwright.
- Allow official third-party deep links only where appropriate.
- Do not clone branded UIs or implement covert device control.

## Requirement Status

- Product requirements: drafted.
- Technical requirements: drafted.
- Setup requirements: drafted.
- Safety and legal requirements: drafted.
- Final domain: undecided.
- Implementation stack: scaffolded for v1.
- Milestone 1 shell: implemented.
- Location, celebrity, and custom text effects: implemented.
- Mobile QA checklist: drafted.
- Latency report: recorded with local desktop Chromium p95 result.
- Production deployment guide: drafted.
- Owner input checklist: drafted.
- Contributor surface: drafted.
- Milestone 4 hardening: mostly complete except physical-device QA.
- Next implementation step: physical-device QA and owner deployment decisions.
