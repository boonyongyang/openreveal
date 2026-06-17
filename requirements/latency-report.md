# Latency Report

This report records repeatable local latency checks for the prepared foreground reveal path.

## Measurement Command

```sh
pnpm test:latency
```

Optional larger sample run:

```sh
OPENREVEAL_LATENCY_SAMPLES=50 pnpm test:latency
```

## What Is Measured

- Environment: local desktop Chromium through Playwright.
- Flow: performer console creates a session, opens demo-mode receiver, arms a location reveal, sends it, waits for `receiver.reveal_ack`, then resets and repeats.
- Metric: receiver render acknowledgement latency from the `reveal_sent` WebSocket envelope timestamp to the receiver acknowledgement timestamp.
- Target: prepared foreground/local p95 under 250ms.

## Current Result

Last run: 2026-05-31, local desktop Chromium through Playwright.

```json
{
  "metric": "prepared_foreground_local_render_ack",
  "samples": 20,
  "p95Ms": 8,
  "maxMs": 8,
  "valuesMs": [5, 5, 7, 5, 5, 1, 5, 7, 7, 7, 7, 7, 8, 7, 6, 8, 7, 6, 7, 7]
}
```

Result: pass. The local prepared foreground p95 target is under 250ms.

## Notes

- This is not a replacement for physical-device QA. iPhone Safari and Android Chrome checks still live in [mobile-qa.md](mobile-qa.md).
- Real mobile 4G delivery remains best-effort under one second; locked or backgrounded devices should restore the latest reveal on resume.
