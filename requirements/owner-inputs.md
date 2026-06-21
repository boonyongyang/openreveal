# Owner Input Checklist

These are the remaining decisions or real-world checks that require project-owner input. Everything else should stay tracked in `PHASED-TASKS.md`.

## Required Before Public Deployment

- [ ] Final public domain/front door. Current live app URL is `https://openreveal-tcug7qrd2a-as.a.run.app`; `https://openreveal.web.app` is live as static Firebase Hosting only.
- [x] Hosting target for first live test: dedicated Google Cloud Run project with `max instances = 1`.
- [x] GCP project ID with billing enabled: `openreveal` in `asia-southeast1`.
- [x] HTTPS choice for first live smoke: Cloud Run direct URL.
- [ ] Production abuse-report destination for `VITE_ABUSE_REPORT_URL`.
- [ ] Production performer passphrase and session secret rotation/storage approach. The current Cloud Run deployment is test-ready, not public-secret-ready.
- [ ] Production SQLite storage and backup location.
- [ ] Cleanup schedule and retention window.
- [ ] Whether the public reference instance is invite-only/private or reachable by anyone.

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
