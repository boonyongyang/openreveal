# AGENTS

## Project

OpenReveal is a consent-based spectator-phone mentalism PWA. Keep product-facing copy and implementation boundaries original; do not use Inject, Google, or other protected branding except in planning/legal notes.

## Source Of Truth

- `plan.md`: roadmap and milestone order.
- `requirements/`: product, technical, setup, and safety requirements.
- `README.md`: public setup and project overview.
- `STARTER-GUIDE.md`: first-run and performer walkthrough.
- `COMMANDS.md`: local command reference.
- `PHASED-TASKS.md`: remaining phased implementation checklist.
- `STATUS.md`: current implementation state and next steps.
- `.env.example`: local configuration contract.

## Implementation Rules

- V1 stack is fixed: Node 22.12+, pnpm, Vite React, Fastify, `@fastify/websocket`, Drizzle + libsql, TypeBox/Ajv, Vitest, Playwright.
- Keep v1 single-instance and SQLite-backed.
- Use HttpOnly same-origin cookie auth for performer HTTP and WebSocket routes.
- Keep backend shared contracts free of React imports.
- Location and celebrity effects exist behind the split effect contract.
- Do not add native mobile apps, account systems, Postgres, Redis, image reveals, or expanded effects during Milestone 4 hardening.

## Verification

Run `pnpm check` and `pnpm test:e2e` after code changes that affect app behavior. Use `make help` or `COMMANDS.md` for the local command surface.
