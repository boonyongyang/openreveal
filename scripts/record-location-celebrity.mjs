#!/usr/bin/env node
import { chromium, expect } from "@playwright/test";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const execFileAsync = promisify(execFile);

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = join(root, "test-results", "location-celebrity");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const apiBaseURL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:4000";
const passphrase = process.env.PERFORMER_PASSPHRASE ?? "openreveal-dev";
const runStartedAt = new Date().toISOString();

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await rm(join(root, "data", "location-celebrity.sqlite"), { force: true });

const server = spawn("pnpm", ["dev"], {
  cwd: root,
  detached: true,
  env: {
    ...process.env,
    API_BASE_URL: apiBaseURL,
    API_RATE_LIMIT_MAX: process.env.PLAYWRIGHT_API_RATE_LIMIT_MAX ?? "1000",
    APP_BASE_URL: baseURL,
    DATABASE_URL: `file:${join(root, "data", "location-celebrity.sqlite")}`,
    GOOGLE_PLACES_ENABLED: "false",
    PERFORMER_PASSPHRASE: passphrase,
    SESSION_SECRET: "openreveal-location-celebrity-local-secret",
    SESSION_TTL_MINUTES: "30",
    WEB_DIST_DIR: ""
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

let browser;
let performerContext;
let receiverContext;

try {
  await waitForHealthyServer();

  browser = await chromium.launch();
  performerContext = await browser.newContext({
    viewport: { height: 900, width: 1440 },
    recordVideo: {
      dir: outputDir,
      size: { height: 900, width: 1440 }
    }
  });
  receiverContext = await browser.newContext({
    viewport: { height: 844, width: 390 },
    recordVideo: {
      dir: outputDir,
      size: { height: 844, width: 390 }
    }
  });

  const performerPage = await performerContext.newPage();
  const receiverPage = await receiverContext.newPage();
  const performerVideo = performerPage.video();
  const receiverVideo = receiverPage.video();

  await runLocationCelebrityFlow(performerPage, receiverPage);

  await performerPage.close();
  await receiverPage.close();
  await performerContext.close();
  await receiverContext.close();
  performerContext = undefined;
  receiverContext = undefined;

  const performerWebm = join(outputDir, "openreveal-location-celebrity-performer.webm");
  const receiverWebm = join(outputDir, "openreveal-location-celebrity-audience-phone.webm");
  await copyFile(await performerVideo.path(), performerWebm);
  await copyFile(await receiverVideo.path(), receiverWebm);

  const outputs = [performerWebm, receiverWebm];
  const ffmpeg = await findExecutable("ffmpeg");
  let combinedMp4 = "";

  if (ffmpeg) {
    const performerMp4 = join(outputDir, "openreveal-location-celebrity-performer.mp4");
    const receiverMp4 = join(outputDir, "openreveal-location-celebrity-audience-phone.mp4");
    combinedMp4 = join(outputDir, "openreveal-location-celebrity-combined.mp4");

    await convertToMp4(ffmpeg, performerWebm, performerMp4);
    await convertToMp4(ffmpeg, receiverWebm, receiverMp4);
    await combineVideos(ffmpeg, performerWebm, receiverWebm, combinedMp4);
    outputs.push(performerMp4, receiverMp4, combinedMp4);
  }

  await writeQaSummary({ combinedMp4, outputs, passed: true });

  console.log("Location and celebrity QA recording passed.");
  for (const output of outputs) console.log(output);
} catch (error) {
  await writeFile(join(outputDir, "server.log"), serverLog);
  await writeQaSummary({
    combinedMp4: "",
    error: error instanceof Error ? error.message : String(error),
    outputs: [],
    passed: false
  });
  throw error;
} finally {
  if (performerContext) await performerContext.close().catch(() => null);
  if (receiverContext) await receiverContext.close().catch(() => null);
  if (browser) await browser.close().catch(() => null);
  if (server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
}

async function runLocationCelebrityFlow(performerPage, receiverPage) {
  await performerPage.goto(`${baseURL}/console`);
  await performerPage.getByLabel("Passphrase").fill(passphrase);
  await performerPage.getByRole("button", { name: "Continue" }).click();
  await expect(performerPage.getByRole("heading", { name: "Performer console" })).toBeVisible();

  await performerPage.getByRole("button", { name: "Create session" }).click();
  const receiverUrl = await performerPage.getByLabel("Receiver URL").inputValue();
  await expect(performerPage.locator(".qr-box svg")).toBeVisible();

  await receiverPage.goto(receiverUrl);
  await expect(receiverPage.locator(".search-line")).toBeVisible();
  await expect(performerPage.getByRole("heading", { name: "Foregrounded" })).toBeVisible();
  await settle();

  await performerPage.getByLabel("Location name").fill("Kuala Lumpur");
  await performerPage.getByLabel("Country").fill("Malaysia");
  await performerPage.getByLabel("Open Maps automatically when sent").uncheck();
  await performerPage.getByRole("button", { name: "Arm" }).click();
  await expect(performerPage.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).not.toBeVisible();
  await settle();

  await performerPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(performerPage.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(receiverPage.getByRole("heading", { name: "Kuala Lumpur" })).toBeVisible();
  await expect(receiverPage.locator(".reveal-result").getByText("Malaysia")).toBeVisible();
  await expect(receiverPage.getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
    "href",
    /google\.com\/maps\/search/
  );
  await settle(2000);

  await performerPage.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(receiverPage.locator(".search-line")).toBeVisible();
  await expect(receiverPage.locator(".result-space")).toBeHidden();
  await settle();

  await performerPage.getByRole("tab", { name: "Celebrity" }).click();
  await performerPage.getByLabel("Celebrity name").fill("Taylor Swift");
  await performerPage.getByLabel("Open Google Search automatically when sent").uncheck();
  await performerPage.getByRole("button", { name: "Arm" }).click();
  await expect(performerPage.locator(".status-pill--prepared")).toHaveText("Ready");
  await expect(receiverPage.getByRole("heading", { name: "Taylor Swift" })).not.toBeVisible();
  await settle();

  await performerPage.getByRole("button", { name: "Send", exact: true }).click();
  await expect(performerPage.locator(".status-pill--delivered")).toHaveText("Delivered");
  await expect(receiverPage.getByRole("heading", { name: "Taylor Swift" })).toBeVisible();
  await expect(receiverPage.getByRole("link", { name: "Search" })).toHaveAttribute(
    "href",
    /google\.com\/search/
  );
  await settle(2000);

  await performerPage.getByRole("button", { name: "End", exact: true }).click();
  await expect(receiverPage.getByText("This page is no longer active")).toBeVisible();
  await settle(1200);
}

async function waitForHealthyServer() {
  const deadline = Date.now() + 120_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const [web, api] = await Promise.all([
        fetch(baseURL),
        fetch(`${apiBaseURL}/api/health`)
      ]);
      if (web.ok && api.ok) return;
      lastError = `web=${web.status} api=${api.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await settle(500);
  }

  throw new Error(`Timed out waiting for local OpenReveal server. Last error: ${lastError}`);
}

async function findExecutable(command) {
  try {
    const { stdout } = await execFileAsync("command", ["-v", command], { shell: true });
    return stdout.trim() || "";
  } catch {
    return "";
  }
}

async function convertToMp4(ffmpeg, input, output) {
  await execFileAsync(ffmpeg, [
    "-y",
    "-i",
    input,
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    output
  ]);
}

async function combineVideos(ffmpeg, performerWebm, receiverWebm, output) {
  await execFileAsync(ffmpeg, [
    "-y",
    "-i",
    performerWebm,
    "-i",
    receiverWebm,
    "-filter_complex",
    "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black[left];[1:v]scale=405:720:force_original_aspect_ratio=decrease,pad=405:720:(ow-iw)/2:(oh-ih)/2:color=black[right];[left][right]hstack=inputs=2[v]",
    "-map",
    "[v]",
    "-shortest",
    "-r",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output
  ]);
}

async function writeQaSummary({ combinedMp4, error, outputs, passed }) {
  const lines = [
    "# OpenReveal Location And Celebrity Recording",
    "",
    `Run started: ${runStartedAt}`,
    `Result: ${passed ? "passed" : "failed"}`,
    "",
    "## Covered Flow",
    "",
    "- Performer login and session creation.",
    "- Audience phone receiver opens from the generated receiver URL.",
    "- Location reveal arms without showing early, then sends to the receiver.",
    "- Location reveal includes a Google Maps handoff link.",
    "- Reset returns the receiver to standby.",
    "- Celebrity reveal arms without showing early, then sends to the receiver.",
    "- Celebrity reveal includes a Google Search handoff link.",
    "- End session disables the receiver page.",
    "",
    "## Output Files",
    "",
    ...outputs.map((output) => `- ${output}`),
    ...(combinedMp4 ? ["", `Primary MP4: ${combinedMp4}`] : []),
    ...(error ? ["", "## Error", "", error] : [])
  ];

  await writeFile(join(outputDir, "QA-SUMMARY.md"), `${lines.join("\n")}\n`);
}

function settle(ms = 900) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
