# Safety And Legal Requirements

## Project Boundary

This project must be a consent-based performance tool. It should create the effect of impossible knowledge or remote revelation only through a spectator intentionally opening a performance URL and a performer controlling that session.

The project must not implement covert device control, credential capture, malware-like behavior, phishing flows, or hidden data extraction.

## Required Safety Principles

- Spectators intentionally open a performance URL.
- The app only controls pages served by this project.
- The app does not access private phone data.
- The app does not pretend to be Google, Inject, Apple, YouTube, Instagram, or another third-party product.
- The app uses original UI, copy, names, icons, and assets.
- Public deployments include privacy and acceptable-use notices.
- Dangerous or deceptive abuse patterns are rejected in docs and code review.

## Prohibited Features

Do not build:

- Credential collection or fake login pages.
- Cloned third-party search, map, app store, banking, social, or email interfaces.
- Hidden tracking beyond minimal session telemetry.
- Browser exploit behavior.
- Attempts to bypass browser permissions.
- Access to contacts, photos, microphone, camera, clipboard, or location unless a future routine has an explicit user-facing permission reason and safety review.
- Remote control of any page not owned by this app.
- Persistence on the spectator device beyond normal browser storage needed for the active session.

## Branding Requirements

- Use an original project name.
- Do not use Inject, Inject 2, Rostami, Google, Apple, or other protected names in product branding.
- Do not copy competitor copy, routine names, manuals, images, UI layouts, or assets.
- References to other products should stay limited to comparative planning notes, not product-facing copy.

## Maps And Search Requirements

Allowed:

- Link to Google Maps using official URL formats.
- Use Google Maps Platform APIs if terms are followed and keys are configured correctly.
- Render original map/search-inspired layouts that are clearly this project's own UI.
- Ship a neutral, original spectator pre-reveal view. It may use generic waiting/search-inspired patterns, but it must avoid fake portal links, footer navigation, copied page chrome, or anything a reasonable observer could mistake for Google, Bing, or any other branded service.

Not allowed:

- Fake Google search result pages.
- Fake Google Maps pages.
- Copied logos, icons, type treatment, color palettes, or page structure intended to impersonate a third-party service.
- Any page where a reasonable spectator would conclude they are looking at Google, Bing, Apple, Inject, or another named product. The test is impersonation, not aesthetic similarity: a clean centered search box is fine; a Google logo, Google's exact wordmark colors, or `google.com`-style chrome is not.
- Spoofed domain bars, fake URL displays, or chrome that mimics another browser or product.

## Privacy Requirements

Default privacy policy:

- Collect only session data needed to perform the routine.
- Avoid storing spectator identifiers.
- Store receiver user agent only as a short diagnostic summary if needed.
- Keep retention short.
- Provide cleanup tooling.
- Do not sell, share, or monetize spectator data.

Data that should not be collected:

- Contacts.
- Photos.
- Precise location from the spectator device.
- Phone number.
- Email address.
- Clipboard contents.
- Microphone or camera data.
- Credentials.

## Open-Source License Considerations

Chosen license:

- AGPL-3.0 for the source code, so hosted-service forks are required to publish source changes.

License notes:

- Routine packs should use explicit metadata if their license differs from the code.
- Third-party asset licenses remain separate from the source code license.

## Abuse Prevention Requirements

Public deployments should include:

- Rate limits.
- Session expiry.
- Admin controls.
- Logs for performer-side actions.
- Report/disable path for hosted public instances.
- Clear docs that the tool is for performances with consent.

## Implemented V1 Safety Surface

- `/privacy` provides a public privacy and safety notice.
- Frontend dev/preview responses set CSP, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
- API responses set CSP, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
- Global API rate limiting is enabled; receiver-status lookup has a bounded mobile-friendly limit for reconnect and QA flows.
- State-changing API requests with untrusted browser `Origin` or `Referer` headers are rejected.
- `/report` provides hosted-instance abuse-report guidance and can link to a configured `VITE_ABUSE_REPORT_URL`.
- Playwright covers the privacy page, report page, and anti-framing headers.

## Review Checklist

Before merging any new effect:

- [ ] Does it require the spectator to open this app's URL intentionally?
- [ ] Does it avoid cloning third-party UI?
- [ ] Does it avoid collecting private device data?
- [ ] Does it keep performer controls scoped to the active session?
- [ ] Does it have a reset/expire path?
- [ ] Does it document any third-party API or asset requirement?
- [ ] Does it fit the consent-based project boundary?
