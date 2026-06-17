# Security Policy

OpenReveal is a consent-based performance tool. Security and the
[safety boundary](requirements/safety-and-legal.md) are core to the project, so
vulnerability reports are taken seriously.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately through GitHub's **"Report a vulnerability"** button under the
repository's **Security** tab (Security Advisories). This keeps the report
confidential until a fix is available.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a request, payload, or `pnpm security:probe` output).
- The affected component (API, web, WebSocket transport, an effect, etc.).
- Any suggested remediation.

You can expect an initial acknowledgement and a triage assessment. Coordinated
disclosure is preferred: please allow a reasonable window to ship a fix before
any public write-up.

## Scope

In scope:

- The Fastify API, WebSocket transport, and session/reveal logic.
- The performer console and spectator receiver pages.
- The built-in effects and the effect contract.
- Authentication, rate limiting, CSRF posture, and the abuse defenses.

Out of scope:

- Misconfigured self-hosted deployments (for example, a weak
  `PERFORMER_PASSPHRASE` or running multiple instances without a shared store —
  see [docs/cloud-run-deployment.md](docs/cloud-run-deployment.md)).
- Social-engineering or physical-access scenarios.
- Denial of service that requires privileged network position.

## Implemented Defenses

The current abuse/security surface is summarized in
[requirements/safety-and-legal.md](requirements/safety-and-legal.md) and
[requirements/technical-requirements.md](requirements/technical-requirements.md),
and includes per-IP and per-route rate limiting, a constant-time passphrase
check, anonymous-WebSocket abuse controls (per-IP connection cap, per-socket
message-rate limit, liveness reaping), CSP/anti-framing/HSTS headers, an
Origin/Referer CSRF guard, and server-side payload validation.

These defenses are exercised in CI on every push and pull request, and can be
run on demand against a local or staging instance:

```sh
pnpm smoke:deploy <base-url>     # headers, HSTS, /ws upgrade
pnpm security:probe <base-url>   # active abuse probe (intrusive; local/staging)
```

## Supported Versions

OpenReveal is pre-1.0. Only the latest `main` receives security fixes.
