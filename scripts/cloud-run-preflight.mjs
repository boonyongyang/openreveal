#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredServices = [
  "run.googleapis.com",
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com"
];
const blockedProjects = new Set(["spacebuns-kotlin"]);

const requestedProject = process.argv[2] ?? process.env.GOOGLE_CLOUD_PROJECT ?? "";
const gcloud = findGcloud();
const checks = [];

function findGcloud() {
  const candidates = [
    process.env.GCLOUD_BIN,
    "gcloud",
    "/opt/homebrew/share/google-cloud-sdk/bin/gcloud",
    "/usr/local/share/google-cloud-sdk/bin/gcloud"
  ].filter(Boolean);

  for (const candidate of candidates) {
    const probe = run(candidate, ["--version"], { quiet: true });
    if (probe.status === 0) return candidate;
    if (candidate.includes("/") && existsSync(candidate)) return candidate;
  }
  return "";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.quiet ? "pipe" : "pipe"
  });
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? result.error?.message ?? "").trim()
  };
}

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function parseJson(result) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

if (!gcloud) {
  record("gcloud available", false, "install Google Cloud CLI or set GCLOUD_BIN");
} else {
  record("gcloud available", true, gcloud);
}

if (gcloud) {
  const auth = run(gcloud, ["auth", "list", "--format=json"], { quiet: true });
  const accounts = parseJson(auth) ?? [];
  const active = Array.isArray(accounts) ? accounts.find((account) => account.status === "ACTIVE") : undefined;
  record("gcloud authenticated", Boolean(active), active?.account ?? "no active account");

  const config = run(gcloud, ["config", "list", "--format=json"], { quiet: true });
  const configJson = parseJson(config) ?? {};
  const activeProject = requestedProject || configJson.core?.project || "";
  record("project selected", Boolean(activeProject), activeProject || "pass project id as first argument");
  record("project allowed", Boolean(activeProject) && !blockedProjects.has(activeProject), activeProject || "no project");

  if (activeProject && !blockedProjects.has(activeProject)) {
    const billing = run(gcloud, ["billing", "projects", "describe", activeProject, "--format=json"], { quiet: true });
    const billingJson = parseJson(billing) ?? {};
    record(
      "billing enabled",
      billing.status === 0 && billingJson.billingEnabled === true,
      billing.status === 0 ? `billingEnabled=${billingJson.billingEnabled}` : billing.stderr.split("\n").at(-1) ?? "billing check failed"
    );

    const services = run(gcloud, ["services", "list", "--enabled", "--project", activeProject, "--format=value(config.name)"], { quiet: true });
    const enabled = new Set(services.stdout.split(/\s+/).filter(Boolean));
    for (const service of requiredServices) {
      record(`${service} enabled`, enabled.has(service));
    }
  }
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`Cloud Run preflight found ${failed.length} blocker(s).`);
  process.exit(1);
}

console.log("Cloud Run preflight passed.");
