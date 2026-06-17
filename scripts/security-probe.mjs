#!/usr/bin/env node
// Active abuse probe for the OpenReveal API security defenses. INTRUSIVE by
// design: it floods a WebSocket, opens many concurrent sockets, and exhausts
// the login rate budget for the runner's IP for up to a minute. Run it against
// local or staging, NOT casually against a busy production instance.
//
//   pnpm security:probe [base-url]
//   PROBE_PASSPHRASE=... pnpm security:probe https://staging.example
//
// Defaults: base http://localhost:4000, passphrase from PROBE_PASSPHRASE or the
// local dev fallback. Exits non-zero if any defense check fails.
import { WebSocket } from "ws";

const base = new URL(process.argv[2] ?? process.env.PROBE_BASE ?? "http://localhost:4000");
const PASS = process.env.PROBE_PASSPHRASE ?? "openreveal-dev";
const httpBase = base.origin;
const wsBase = `${base.protocol === "https:" ? "wss:" : "ws:"}//${base.host}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const checks = [];
function record(name, ok, detail = "") {
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

let cookie = "";
async function login(pass) {
  const res = await fetch(`${httpBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passphrase: pass })
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  return res.status;
}
async function createSession() {
  const res = await fetch(`${httpBase}/api/sessions`, { method: "POST", headers: { cookie } });
  if (!res.ok) throw new Error(`session create ${res.status}`);
  return (await res.json()).sessionCode;
}

async function probeHsts() {
  const res = await fetch(`${httpBase}/api/health`);
  const hsts = res.headers.get("strict-transport-security") ?? "";
  if (base.protocol === "https:") {
    record("S6 HSTS present (https)", hsts.includes("max-age="), hsts || "missing");
  } else {
    record("S6 HSTS absent (http)", hsts === "", hsts ? `unexpected: ${hsts}` : "absent");
  }
}

async function probeFlood() {
  const code = await createSession();
  const sock = new WebSocket(`${wsBase}/ws?code=${code}&role=receiver&deviceId=probe-flood`);
  const res = await new Promise((resolve) => {
    let done = false;
    sock.on("open", () => {
      for (let i = 0; i < 60; i += 1) {
        sock.send(JSON.stringify({ type: "receiver.heartbeat", data: { visibility: "visible" } }));
      }
    });
    sock.on("close", (c, r) => { if (!done) { done = true; resolve({ c, r: r.toString() }); } });
    sock.on("error", () => { if (!done) { done = true; resolve(null); } });
    setTimeout(() => { if (!done) { done = true; resolve(null); } }, 5000);
  });
  try { sock.terminate(); } catch {}
  record("S1 WS message-flood closed", res?.c === 1008, res ? `close=${res.c} "${res.r}"` : "socket not closed after 60 msgs");
}

async function probeSocketCap() {
  const code = await createSession();
  const N = 25;
  const states = Array.from({ length: N }, () => ({ closeCode: null }));
  const socks = [];
  for (let i = 0; i < N; i += 1) {
    const s = new WebSocket(`${wsBase}/ws?code=${code}&role=performer`, { headers: { Cookie: cookie } });
    socks.push(s);
    s.on("close", (c) => { states[i].closeCode = c; });
    s.on("error", () => { states[i].closeCode = states[i].closeCode ?? "err"; });
  }
  await sleep(3000);
  const open = socks.filter((s) => s.readyState === WebSocket.OPEN).length;
  const c1013 = states.filter((st) => st.closeCode === 1013).length;
  for (const s of socks) { try { s.terminate(); } catch {} }
  record("S2 per-IP socket cap", open <= 20 && c1013 >= 1, `open=${open} closed1013=${c1013} attempted=${N}`);
}

async function probeLoginLimit() {
  // Burns the login budget: run LAST.
  const codes = [];
  let first429 = -1;
  for (let i = 1; i <= 16; i += 1) {
    const st = await login("definitely-wrong-passphrase");
    codes.push(st);
    if (st === 429 && first429 === -1) first429 = i;
  }
  record("S3 login rate limit", first429 !== -1, first429 !== -1 ? `first 429 @ attempt ${first429}` : `no 429 in 16 attempts: [${codes.join(",")}]`);
}

async function main() {
  console.log(`Security probe against ${httpBase} (intrusive)\n`);

  await probeHsts();

  const status = await login(PASS);
  const authed = status === 200;
  record("auth precondition", authed, `login -> ${status}${authed ? "" : " (set PROBE_PASSPHRASE)"}`);

  if (authed) {
    await probeFlood();
    await probeSocketCap();
  } else {
    console.log("SKIP S1/S2 - cannot authenticate; pass the instance passphrase via PROBE_PASSPHRASE");
  }

  await probeLoginLimit();

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    console.error(`Security probe failed: ${failed.map((c) => c.name).join(", ")}`);
    process.exit(1);
  }
  console.log(`Security probe passed for ${httpBase}`);
}

main().catch((e) => { console.error("PROBE ERROR", e); process.exit(2); });
