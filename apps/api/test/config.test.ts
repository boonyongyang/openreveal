import { describe, expect, it } from "vitest";

import type { RuntimeConfig } from "../src/config.js";
import { validateRuntimeConfig } from "../src/config.js";

const validConfig: RuntimeConfig = {
  appBaseUrl: "https://openreveal.example",
  apiBaseUrl: "https://openreveal.example",
  databaseUrl: "file:/var/lib/openreveal/openreveal.sqlite",
  performerPassphrase: "change-this-passphrase",
  port: 4000,
  sessionSecret: "a-production-secret-with-at-least-32-chars",
  sessionTtlMinutes: 30,
  webDistDir: "/srv/openreveal/web"
};

describe("runtime configuration validation", () => {
  it("accepts a complete production configuration", () => {
    expect(() => validateRuntimeConfig(validConfig, "production")).not.toThrow();
  });

  it("rejects unsafe production defaults", () => {
    expect(() =>
      validateRuntimeConfig({
        ...validConfig,
        appBaseUrl: "http://localhost:5173",
        apiBaseUrl: "http://localhost:4000",
        databaseUrl: "file:./data/dev.sqlite",
        performerPassphrase: "openreveal-dev",
        sessionSecret: "openreveal-dev-secret-change-me",
        webDistDir: undefined
      }, "production")
    ).toThrow(/APP_BASE_URL must use https/);
  });

  it("rejects invalid numeric settings", () => {
    expect(() =>
      validateRuntimeConfig({
        ...validConfig,
        port: 0,
        sessionTtlMinutes: -1
      }, "development")
    ).toThrow(/PORT must be a positive integer/);
  });
});
