import { mkdir } from "node:fs/promises";

import { request } from "@playwright/test";

const baseURL = process.env.HOSTED_API_BASE_URL?.trim() || process.env.HOSTED_BASE_URL?.trim();
const passphrase = process.env.PERFORMER_PASSPHRASE;
const authStatePath = "test-results/hosted/performer-auth.json";

export default async function hostedGlobalSetup() {
  if (!baseURL || !passphrase) {
    throw new Error("Hosted auth setup requires the staging URL and performer passphrase.");
  }

  await mkdir("test-results/hosted", { recursive: true });
  const context = await request.newContext({ baseURL });

  try {
    const response = await context.post("/api/auth/login", {
      data: { passphrase },
      headers: { origin: new URL(baseURL).origin }
    });

    if (!response.ok()) {
      throw new Error(`Hosted auth setup failed with HTTP ${response.status()}.`);
    }

    await context.storageState({ path: authStatePath });
  } finally {
    await context.dispose();
  }
}
