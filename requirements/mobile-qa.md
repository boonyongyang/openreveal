# Mobile QA Checklist

Use this checklist before any public deployment or real performance rehearsal.

## Target Browsers

Run the v1 spectator flow on:

- iPhone Safari, current major.
- iPhone Safari, previous major when available.
- Android Chrome, current major.
- Android Chrome, previous major when available.

Desktop Chrome remains the automated Playwright baseline, but it does not replace real mobile QA.

## Network Setup

For same-Wi-Fi phone testing:

1. Find the computer LAN IP address.
2. Set `.env` URLs before starting the app:

```sh
APP_BASE_URL=http://<LAN_IP>:5173
API_BASE_URL=http://<LAN_IP>:4000
```

3. Start the app:

```sh
pnpm dev
```

4. Open `http://<LAN_IP>:5173/console` on the performer machine.
5. Scan the generated QR code or open the receiver URL on the phone.

## Session Flow Checks

- [ ] Console login succeeds with `PERFORMER_PASSPHRASE`.
- [ ] Session creation returns a receiver URL and QR code.
- [ ] Phone opens `/r/<SESSION_CODE>` without installing anything.
- [ ] Console changes to `Foregrounded` within one second of the phone joining.
- [ ] Phone shows the neutral waiting page before any reveal.
- [ ] Waiting and armed states look visually identical on the phone.
- [ ] Reset returns the phone to the neutral waiting page.
- [ ] Ended or expired sessions show the inactive page.

## Location Reveal Checks

- [ ] Arm a location reveal while the phone is foregrounded.
- [ ] Console reaches `Ready`.
- [ ] Tap `Send`.
- [ ] Phone shows the location result in-place.
- [ ] `Open in Maps` opens the expected Google Maps search.
- [ ] Console reaches `Delivered`.
- [ ] Console shows last reveal latency.
- [ ] Reset clears the result.

## Celebrity Reveal Checks

- [ ] Arm a preset celebrity reveal.
- [ ] Arm a custom celebrity reveal.
- [ ] Phone shows the text-only result in-place.
- [ ] Optional `Read more` links open only `https:` URLs.
- [ ] Console reaches `Delivered`.
- [ ] Console shows last reveal latency.
- [ ] Reset clears the result.

## Custom Text Reveal Checks

- [ ] Arm a custom text reveal with title, message, and footer.
- [ ] Console reaches `Ready`.
- [ ] Tap `Send`.
- [ ] Phone shows the title and message in-place.
- [ ] Multiline text preserves readable line breaks.
- [ ] Console reaches `Delivered`.
- [ ] Console shows last reveal latency.
- [ ] Reset clears the result.

## Background And Resume Checks

- [ ] Open the receiver page, then background the browser before arming.
- [ ] Console changes to `Backgrounded` or otherwise indicates degraded receiver state.
- [ ] Toggle network or reload the receiver page and confirm the same phone does not get stuck on `Session unavailable`.
- [ ] During a short network/API interruption, confirm the phone shows a restoring/reconnecting state instead of the inactive page.
- [ ] Send a prepared reveal while the phone is locked/backgrounded.
- [ ] Unlock or foreground the browser.
- [ ] Phone restores the latest reveal state without requiring a manual refresh.
- [ ] Reload the receiver page after a reveal was sent and confirm the result restores.
- [ ] Reset while backgrounded, then foreground the phone and confirm the neutral page is restored.

## Latency Notes

Record rough observations:

| Device | Browser | Network | Location reveal | Celebrity reveal | Notes |
| --- | --- | --- | --- | --- | --- |
| | | Wi-Fi | | | |
| | | 4G/5G | | | |

Acceptance target:

- Prepared foreground/local reveal p95 under 250ms.
- Real mobile 4G/5G best effort under one second.
- Locked/backgrounded devices restore the latest state on resume.

## Failure Notes

Capture:

- Device and OS version.
- Browser version.
- Session code.
- Whether the phone was foregrounded, backgrounded, or locked.
- Whether the console showed `Ready`, `Sent`, or `Delivered`.
- Any visible browser console/network errors if remote debugging is available.
