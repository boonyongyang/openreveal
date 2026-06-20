# Local Testing Setup

Use this guide when you want to run OpenReveal locally with one performer machine and one real audience phone on the same Wi-Fi. This phase does not require Firebase, Vercel, Cloud Run, Docker, billing, or production deployment.

## 1. Prepare The Repo

From the repo root:

```sh
nvm use # optional; uses the repository's Node 22.12 CI baseline
npm install --global pnpm@10.10.0 # only when pnpm 10 is not already installed
pnpm install --frozen-lockfile
```

Create `.env` from `.env.example` if it does not already exist:

```sh
cp .env.example .env
```

For desktop-only testing, use this local shape:

```sh
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
DATABASE_URL=file:./data/dev.sqlite
SESSION_SECRET=replace-this-with-a-long-random-local-secret
SESSION_TTL_MINUTES=30
PERFORMER_PASSPHRASE=openreveal-dev-local
PORT=4000
API_RATE_LIMIT_MAX=100
VITE_ABUSE_REPORT_URL=
WEB_DIST_DIR=
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACES_ENABLED=false
```

`SESSION_SECRET` should be any long local-only value. You can generate one with:

```sh
openssl rand -hex 32
```

## 2. Desktop Rehearsal

Start the dev servers:

```sh
pnpm dev
```

Open:

```text
http://localhost:5173/console
```

Log in with `PERFORMER_PASSPHRASE`, create a session, switch to `Advanced`, and use `Demo mode` first. Confirm that location, celebrity, and custom text reveals can be armed, sent, reset, and ended without a physical phone.

## 3. Same-Wi-Fi Phone Test

Find the Mac LAN IP:

```sh
ipconfig getifaddr en0
```

Update `.env` before starting the app:

```sh
APP_BASE_URL=http://<LAN_IP>:5173
API_BASE_URL=http://<LAN_IP>:4000
```

Restart:

```sh
pnpm dev
```

Open the performer console on the Mac:

```text
http://<LAN_IP>:5173/console
```

Open the site root or `/j` on the audience phone and enter the session code, or scan the QR code. Keep the phone and Mac on the same Wi-Fi, and allow incoming Node connections if macOS prompts.

## 4. Manual Acceptance Checks

Performer console:

- Login succeeds with the local passphrase.
- `Create session` shows a grouped session code and QR code in Quick Session.
- Receiver state changes to `Foregrounded` when the phone joins.
- `Arm`, `Send`, `Reset`, and `End` update both performer and receiver state.
- Latest reveal latency appears after delivery.

Audience phone:

- Site root and `/j` session-code join open the receiver page without installing anything.
- Direct receiver URL from Advanced opens the same receiver page when needed for diagnostics.
- Waiting and armed states look neutral and do not reveal the prepared answer early.
- Location reveal renders and `Open in Maps` works.
- If `GOOGLE_PLACES_API_KEY` is configured, Places search can prefill the location form and selected places can auto-open Maps on send.
- Celebrity reveal renders for preset and custom names.
- Custom text reveal preserves readable multiline content.
- `Reset` returns the phone to the neutral waiting page.
- `End` or expiry shows the inactive page.

Reliability:

- Reload the receiver page and confirm it restores the current state.
- Background and foreground the browser.
- Lock and unlock the phone.
- Briefly interrupt Wi-Fi and confirm reconnect behavior.
- Reconnect after a reveal has already been sent and confirm the latest reveal is restored.

Record physical-device results and failures in [requirements/mobile-qa.md](../requirements/mobile-qa.md).

## 5. Automated Checks

Run these before treating local setup as clean:

```sh
pnpm check
pnpm test:e2e
pnpm test:latency
pnpm audit --audit-level moderate
```

If Playwright browsers are missing:

```sh
pnpm exec playwright install
```

## 6. Done Criteria

Local setup is complete when:

- Automated checks pass.
- Desktop Demo mode in Advanced works for location, celebrity, and custom text.
- A real phone can join by QR over LAN.
- No reveal content appears on the audience phone before `Send`.
- `Reset` and `End` behave correctly on both performer and audience sides.
- Phone-specific findings are recorded in `requirements/mobile-qa.md`.

After this passes, move to the deployment path in [docs/production-deployment.md](production-deployment.md) and the release gate in [docs/deployment-readiness.md](deployment-readiness.md).
