import { expect, type Page, test } from "@playwright/test";

const SAMPLE_COUNT = Number(process.env.OPENREVEAL_LATENCY_SAMPLES ?? "20");
const P95_TARGET_MS = 250;
const performerPassphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";

test("prepared foreground reveal render acknowledgement p95 stays under target", async ({ page }) => {
  test.setTimeout(Math.max(120_000, SAMPLE_COUNT * 10_000));

  await page.goto("/console");
  await waitForApi(page);
  await page.getByLabel("Passphrase").fill(performerPassphrase);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create session" }).click();
  await page.getByRole("button", { name: "Advanced" }).click();
  await page.getByRole("button", { name: "Demo mode" }).click();
  await expect(page.getByRole("heading", { name: "Foregrounded" })).toBeVisible();

  const latencies: number[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    await page.getByLabel("Location name").fill(`Kuala Lumpur ${index + 1}`);
    await page.getByLabel("Country").fill("Malaysia");
    await page.getByRole("button", { name: "Arm" }).click();
    await expect(page.locator(".status-pill--prepared")).toHaveText("Ready");

    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator(".status-pill--delivered")).toHaveText("Delivered");
    await expect(page.getByTestId("last-reveal-latency")).toHaveText(/\d+ ms/);

    latencies.push(parseLatency(await page.getByTestId("last-reveal-latency").innerText()));

    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByTestId("last-reveal-latency")).toHaveText("—");
    await expect(page.getByText("No reveal armed")).toBeVisible();
  }

  const sorted = [...latencies].sort((left, right) => left - right);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
  const max = sorted.at(-1) ?? 0;

  console.log(
    JSON.stringify({
      metric: "prepared_foreground_local_render_ack",
      samples: SAMPLE_COUNT,
      p95Ms: p95,
      maxMs: max,
      valuesMs: latencies
    })
  );

  expect(p95).toBeLessThan(P95_TARGET_MS);
});

function parseLatency(label: string) {
  const value = Number.parseInt(label, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`Could not parse latency from "${label}"`);
  }
  return value;
}

async function waitForApi(page: Page) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get("http://localhost:4000/api/health").catch(() => null);
        return response?.ok() ?? false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
}
