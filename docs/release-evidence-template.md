# OpenReveal Release Evidence

Copy this file for each release candidate and replace every `TBD`. Evidence is
complete only when the candidate image tested in staging is the same digest
promoted to production.

## Candidate Identity

- Release version: `TBD`
- Commit SHA: `TBD`
- Branch or PR: `TBD`
- Immutable image digest: `TBD`
- Reviewer/approval: `TBD`

## Local And CI Gates

- Frozen install: `TBD`
- Release artifact scan: `TBD`
- Lint/typecheck/unit/API/web/build: `TBD`
- Chromium and WebKit browser flows: `TBD`
- Prepared reveal latency: `TBD`
- Dependency security result: `TBD`
- Production Docker build: `TBD`
- Local security smoke/probe: `TBD`

## Staging Deployment

- GCP project: `TBD`
- Cloud Run service: `TBD`
- Service URL: `TBD`
- Ready revision: `TBD`
- Deployed commit label: `TBD`
- Deployed image digest: `TBD`
- Production unchanged check: `TBD`

## Hosted Evidence

- Deployment smoke: `TBD`
- Hosted Chromium/WebKit suite: `TBD`
- Hosted iPhone/WebKit proof: `TBD`
- Intrusive staging security probe: `TBD`
- Screenshot/trace directory: `TBD`
- Latest reveal acknowledgement latency: `TBD`

## Physical Devices

| Device | OS/browser | Network | QR | Reveal flows | Lock/resume | Result |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone | TBD | Wi-Fi + mobile | TBD | TBD | TBD | TBD |
| Android | TBD | Wi-Fi + mobile | TBD | TBD | TBD | TBD |

## Known Boundaries

- Container SQLite remains disposable: `TBD`
- Places integration state: `TBD`
- Custom domain state: `TBD`
- Open defects or accepted risks: `TBD`

## Promotion And Rollback

- Previous production revision: `TBD`
- Approved candidate revision: `TBD`
- Production Cloud Run smoke: `TBD`
- Firebase front-door smoke: `TBD`
- Production WebKit proof: `TBD`
- Rollback command/target verified: `TBD`
- Final verdict: `TBD`
