# End-To-End Testing Plan

Use this guide as the deployment test procedure for OpenReveal. It covers both sides of the routine: the performer console and the audience phone receiver page.

## 1. Automated Baseline

Run the automated gate from the repo root before manual QA:

```sh
pnpm install
pnpm check
pnpm test:e2e
pnpm test:latency
pnpm audit --audit-level moderate
```

Expected result:

- TypeScript, unit/API tests, and build pass through `pnpm check`.
- Playwright browser flows pass through `pnpm test:e2e`.
- Local prepared foreground latency p95 is under 250ms through `pnpm test:latency`.
- Dependency audit reports no moderate-or-higher known vulnerabilities.

## 2. Performer Console Manual Flow

Start the local app:

```sh
pnpm dev
```

Open the performer console:

```text
http://localhost:5173/console
```

Verify:

- Login succeeds with `PERFORMER_PASSPHRASE` from `.env`.
- `Create session` returns a receiver URL and QR code.
- `Demo mode` opens a local receiver pane.
- Receiver state changes to `Foregrounded`.
- `Arm` is disabled until required effect fields are valid.
- `Arm` changes the console to `Ready`.
- `Send` changes the console to `Delivered` and records latest reveal latency.
- `Reset` clears the receiver page and the armed state.
- `End` disables mutation controls and marks the session inactive.

## 3. Effect Coverage

Run these checks in demo mode first, then repeat the same reveal paths on a real audience phone.

### Location Reveal

- Enter a location name and optional country or region.
- Click `Arm`, confirm `Ready`.
- Click `Send`, confirm the audience sees the location result.
- Click `Open in Maps`, confirm the Google Maps search is correct.
- Click `Reset`, confirm the audience returns to the neutral waiting page.

### Celebrity Reveal

- Select a bundled preset and confirm subtitle metadata fills as expected.
- Enter a custom celebrity name and subtitle.
- Add an optional `https://` source URL and confirm `Read more` appears.
- Try a non-HTTPS source URL and confirm the app rejects it while arming.
- Send and reset the reveal.

### Custom Text Reveal

- Enter a title, multiline message body, and footer.
- Click `Arm`, confirm `Ready`.
- Click `Send`, confirm readable line breaks on the audience side.
- Click `Reset`, confirm the audience returns to the waiting page.

### Preset Import And Export

- Export a local JSON preset from an effect form.
- Change the form fields.
- Import the exported JSON preset.
- Confirm the form fields restore.
- Arm the imported preset and confirm it can be sent.

## 4. Audience Phone E2E

For same-Wi-Fi testing, find the computer LAN IP address, then set `.env` before starting the app:

```sh
APP_BASE_URL=http://<LAN_IP>:5173
API_BASE_URL=http://<LAN_IP>:4000
```

Start the app:

```sh
pnpm dev
```

Open the console on the performer computer:

```text
http://<LAN_IP>:5173/console
```

Verify on the audience phone:

- Scan the QR code or open the receiver URL manually.
- Phone opens `/r/<SESSION_CODE>` without installing anything.
- Performer console changes to `Foregrounded` within one second.
- Phone shows the neutral waiting page before any reveal.
- Waiting and armed states look identical before `Send`.
- Location, celebrity, and custom text reveals render in-place after `Send`.
- `Reset` returns the phone to the neutral waiting page.
- `End` or expiry shows the inactive page.

## 5. Mobile Reliability

Run the detailed checklist in [requirements/mobile-qa.md](../requirements/mobile-qa.md) on:

- iPhone Safari.
- Android Chrome.

Required reliability checks:

- Same-Wi-Fi phone test.
- Mobile-data or tunnel/staging URL test.
- Browser background and foreground behavior.
- Screen lock and unlock behavior.
- Receiver page reload.
- Short network interruption.
- Receiver reconnect after reveal sent.

Record device/browser versions, network type, rough latency, and failure notes in [requirements/mobile-qa.md](../requirements/mobile-qa.md).

## 6. Production Smoke

Build and run the production shape with `WEB_DIST_DIR` set to the built web app. Verify:

- `/api/health` returns the OpenReveal health payload.
- `/console` serves the built performer app.
- `/privacy` and `/report` are reachable.
- Invalid receiver routes show an inactive or unavailable state without crashing.
- Responses preserve CSP and anti-framing headers.

If Docker is the deployment path, also run:

```sh
make docker-build
```

## 7. Deployment Pass Criteria

The feature set is ready for deployment only when:

- Automated checks pass.
- Physical iPhone Safari and Android Chrome checks pass.
- Local prepared foreground p95 latency is under 250ms.
- Real mobile delivery is acceptable for rehearsal, with best effort under one second.
- Locked or backgrounded phones restore the latest state on resume.
- Production environment variables are set from `.env.example`.
- `VITE_ABUSE_REPORT_URL` points at a real monitored report destination.
- SQLite storage and backup paths are decided.
- Docker build passes if Docker deployment is used.

## Playwright Expansion Plan

The current Playwright suite remains the fast automated gate. Expand coverage in this order:

1. Keep `console-flow.pw.ts` as the demo-mode baseline.
2. Use `two-page-session.pw.ts` for one performer page and one audience receiver page.
3. Cover receiver join, foreground state, hidden prepared payload, send, delivered acknowledgement, reset, and end-session lockout.
4. Use `reconnect-flow.pw.ts` for receiver reload, receiver joins after reveal sent, and duplicate receiver rejection.
5. Add same-device replacement coverage if the browser layer needs more than the existing API/WebSocket test coverage.

Playwright is required for the automated release gate, but it does not replace physical phone QA for Safari/Chrome lifecycle, camera QR scanning, phone lock, native Maps handoff, or real mobile network behavior.
