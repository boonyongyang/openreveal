# OpenReveal Starter Guide

This guide walks through running OpenReveal locally and rehearsing the current built-in effects.

For a focused checklist that covers desktop rehearsal plus a same-Wi-Fi audience phone, see [docs/local-testing-setup.md](docs/local-testing-setup.md).

## 1. Prepare The Repo

Install Node.js 22.12+ and pnpm 10.10.0. The repository includes an `.nvmrc`
matching the Node version used by CI. Then run:

```sh
nvm use # when using nvm
npm install --global pnpm@10.10.0 # only when pnpm 10 is not already installed
cp .env.example .env
pnpm install --frozen-lockfile
```

Open `.env` and set a local passphrase:

```sh
PERFORMER_PASSPHRASE=openreveal-dev
SESSION_SECRET=replace-this-with-a-long-random-local-secret
```

The passphrase is only for the performer console. Spectators do not log in.

## 2. Start The App

```sh
pnpm dev
```

This starts:

- Web app: `http://localhost:5173`
- API/WebSocket server: `http://localhost:4000`
- Local SQLite database: `data/dev.sqlite`

Open the performer console:

```sh
http://localhost:5173/console
```

Log in with the value of `PERFORMER_PASSPHRASE`.

## 3. Create A Session

In the performer console:

1. Click `Create session`.
2. Confirm the grouped session code and QR code appear in Quick Session.
3. Ask the spectator to open the site root or `/j` and enter the 8-character session code. Use `Advanced` for Demo mode, direct receiver URL, logs, and diagnostics.
4. Wait until the connection panel shows `Foregrounded`.

The console opens in `Quick session` mode by default. Use this mode for a fast trick setup: create the session, read the code, choose one reveal, then `Arm` and `Send`. Switch to `Advanced` when you need direct receiver URL, Demo mode, preset import/export, receiver history, latency details, or the full activity log.

The receiver URL has this shape:

```text
http://localhost:5173/r/<SESSION_CODE>
```

For phone testing on the same Wi-Fi network, replace `localhost` with your computer's LAN IP address and set matching `APP_BASE_URL` / `API_BASE_URL` values before starting the app.

The exact LAN setup and acceptance checks live in [docs/local-testing-setup.md](docs/local-testing-setup.md).

## 4. Run A Location Reveal

1. Select the `Location` tab.
2. Fill `Location name`, or use `Place search` if `GOOGLE_PLACES_API_KEY` is configured and the console shows Places as connected.
3. Optionally fill or adjust `Region`, `Country`, `Latitude`, and `Longitude`.
4. Click `Arm`.
5. Wait for the console to show `Ready`.
6. Click `Send`.
7. Confirm the receiver page shows the location result, or opens Google Maps if `Open Maps automatically when sent` is enabled.
8. Use `Reset` to return the receiver page to its neutral waiting state.

The API computes `mapsUrl` on the server using:

```text
https://www.google.com/maps/search/?api=1&query=<encoded-location>
```

No Google API key is needed for this v1 flow.

Optional Places autocomplete needs a Google Places API key:

```sh
GOOGLE_PLACES_API_KEY=<your-key>
GOOGLE_PLACES_ENABLED=true
```

When a Places result is selected, the API adds `query_place_id` to the official Maps URL so Google Maps can target the selected marker.

## 5. Run A Celebrity Reveal

1. Select the `Celebrity` tab.
2. Choose a preset or type a custom celebrity name.
3. Optionally fill `Subtitle` and `Source URL`.
4. Click `Arm`.
5. Wait for `Ready`.
6. Click `Send`.
7. Confirm the receiver page shows the celebrity result.
8. Use `Reset` before rehearsing another reveal.

V1 celebrity reveals are text-only. Images are intentionally deferred until licensing and source rules are defined.

## 6. Verify Before Continuing Work

Run the normal checks:

```sh
pnpm check
pnpm test:e2e
```

`pnpm check` covers lint, TypeScript, unit/API tests, and build.

`pnpm test:e2e` covers the browser flows for login/session creation, location reveal, Places prefill, Maps auto-open, celebrity reveal, Google Search auto-open, centered custom text reveal, reconnect, and duplicate receiver behavior.

## 7. Current Safety Rules

- Only control OpenReveal pages that the spectator intentionally opened.
- Do not clone Google, Inject, Apple, or other protected third-party interfaces.
- Do not add hidden device control, background scraping, or native-device access.
- Keep spectator data minimal and short-lived.
- Keep v1 single-instance and SQLite-backed until the realtime fanout layer is redesigned.
- Public privacy and safety notes are available at `http://localhost:5173/privacy`.
- Hosted-instance report guidance is available at `http://localhost:5173/report`.

## 8. What To Build Next

The current tracked next step is Phase 7 deployment closure:

- Fill the owner input checklist for domain, hosting, HTTPS, passphrase storage, SQLite backups, cleanup, and abuse-report destination.
- Set production environment variables from `.env.example`.
- Run the mobile QA checklist on iPhone Safari and Android Chrome.
- Record same-Wi-Fi, mobile-data, lock/resume, and background/foreground notes.
- Confirm short network interruptions show restoring/reconnecting instead of an inactive page.
- Use `docs/deployment-readiness.md` to close the final automated, owner, and physical-device deployment gates.
- Run `make docker-build` if Docker is the deployment path and the Docker daemon is available.

Use [STATUS.md](STATUS.md) for the current project state and [COMMANDS.md](COMMANDS.md) for the command reference.
