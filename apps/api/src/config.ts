import "dotenv/config";

import { DEFAULT_SESSION_TTL_MINUTES } from "@openreveal/shared";

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function devFallback(name: string, fallback: string) {
  return process.env[name] ?? (isTest ? fallback : fallback);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const config = {
  appBaseUrl: devFallback("APP_BASE_URL", "http://localhost:5173"),
  apiBaseUrl: devFallback("API_BASE_URL", "http://localhost:4000"),
  databaseUrl: devFallback("DATABASE_URL", isTest ? "file:./data/test.sqlite" : "file:./data/dev.sqlite"),
  performerPassphrase: devFallback("PERFORMER_PASSPHRASE", "openreveal-dev"),
  port: intEnv("PORT", 4000),
  sessionSecret: devFallback("SESSION_SECRET", "openreveal-dev-secret-change-me"),
  sessionTtlMinutes: intEnv("SESSION_TTL_MINUTES", DEFAULT_SESSION_TTL_MINUTES),
  webDistDir: process.env.WEB_DIST_DIR
};

export type RuntimeConfig = typeof config;

export function validateRuntimeConfig(runtimeConfig: RuntimeConfig, env = process.env.NODE_ENV) {
  const errors: string[] = [];

  if (!isHttpUrl(runtimeConfig.appBaseUrl)) {
    errors.push("APP_BASE_URL must be an http(s) URL.");
  }
  if (!isHttpUrl(runtimeConfig.apiBaseUrl)) {
    errors.push("API_BASE_URL must be an http(s) URL.");
  }
  if (!runtimeConfig.databaseUrl.trim()) {
    errors.push("DATABASE_URL is required.");
  }
  if (!Number.isInteger(runtimeConfig.port) || runtimeConfig.port <= 0) {
    errors.push("PORT must be a positive integer.");
  }
  if (!Number.isInteger(runtimeConfig.sessionTtlMinutes) || runtimeConfig.sessionTtlMinutes <= 0) {
    errors.push("SESSION_TTL_MINUTES must be a positive integer.");
  }

  if (env === "production" || isProduction) {
    if (!runtimeConfig.appBaseUrl.startsWith("https://")) {
      errors.push("APP_BASE_URL must use https:// in production.");
    }
    if (!runtimeConfig.apiBaseUrl.startsWith("https://")) {
      errors.push("API_BASE_URL must use https:// in production.");
    }
    if (runtimeConfig.sessionSecret === "openreveal-dev-secret-change-me" || runtimeConfig.sessionSecret.length < 32) {
      errors.push("SESSION_SECRET must be changed and at least 32 characters in production.");
    }
    if (runtimeConfig.performerPassphrase === "openreveal-dev" || runtimeConfig.performerPassphrase.length < 12) {
      errors.push("PERFORMER_PASSPHRASE must be changed and at least 12 characters in production.");
    }
    if (runtimeConfig.databaseUrl === "file:./data/dev.sqlite") {
      errors.push("DATABASE_URL must point at a production persistent data path.");
    }
    if (!runtimeConfig.webDistDir) {
      errors.push("WEB_DIST_DIR must point at the built web app for single-node production.");
    }
  }

  if (errors.length) {
    throw new Error(`Invalid OpenReveal configuration:\n- ${errors.join("\n- ")}`);
  }
}
