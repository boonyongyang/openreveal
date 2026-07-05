# Owner Input Checklist

These are the remaining decisions or real-world checks that require project-owner input. Everything else should stay tracked in `PHASED-TASKS.md`.

## Required Before Public Deployment

- [x] Final public front door for current reference instance: `https://openreveal.web.app` redirects to the Cloud Run origin. A custom Cloud Run domain remains the preferred future polished URL.
- [x] Hosting target for first live test: dedicated Google Cloud Run project with `max instances = 1`.
- [x] GCP project ID with billing enabled: `openreveal` in `asia-southeast1`.
- [x] HTTPS choice for first live smoke: Cloud Run direct URL.
- [x] Production abuse-report destination for `VITE_ABUSE_REPORT_URL`: upstream GitHub safety issue form by default.
- [x] Production performer passphrase and session secret storage path: Secret Manager.
- [ ] Optional owner-managed passphrase rotation before public launch. The current live Cloud Run deployment uses generated Secret Manager-backed values.
- [x] Production SQLite policy for current reference instance: demo-grade Cloud Run container SQLite is accepted; session history is not durable across redeploys/restarts.
- [x] Cleanup schedule and retention window: default background cleanup every 30 minutes with default session TTL/retention behavior.
- [x] Public reference instance access: reachable by anyone.

## Device QA Needed From You

- [ ] iPhone model and iOS/Safari version used for QA.
- [ ] Android model and Chrome version used for QA.
- [ ] Same-Wi-Fi local test result.
- [ ] Real mobile data or throttled-network test result.
- [ ] Screen-lock/resume behavior notes.
- [ ] Background/foreground behavior notes.
- [ ] Any visual fit issues on the spectator receiver page.

## Product Decisions During Phase 6

- [ ] Whether preset import/export should be local JSON only or include a hosted preset library later.
- [x] Celebrity preset metadata is manually curated, factual-name-only, and image-free for v1.
- [ ] Optional Places autocomplete API key. Leave unset to keep manual location mode.
- [x] Image reveals remain out of scope until licensing, upload/storage, moderation, and takedown rules are finished.

## Current Recommendation

Finish Phase 7 deployment closure before adding more product scope. The current v1 should stay focused on owner deployment configuration, real-device proof, and a clean public baseline.
