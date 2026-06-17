#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const baseUrl = process.argv[2] ?? process.env.OPENREVEAL_BASE_URL;

if (!baseUrl) {
  console.error("Usage: pnpm smoke:deploy <https://openreveal.example>");
  process.exit(1);
}

const base = new URL(baseUrl);
const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const marker = ok ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

async function request(path, method = "GET") {
  const url = new URL(path, base);
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body });
      });
    });
    req.setTimeout(12_000, () => {
      req.destroy(new Error(`Timed out requesting ${url.href}`));
    });
    req.on("error", reject);
    req.end();
  });
}

async function checkHttp() {
  const health = await request("/api/health");
  const healthBody = JSON.parse(health.body);
  record("/api/health", health.statusCode === 200 && healthBody.ok === true, `status ${health.statusCode}`);

  for (const path of ["/console", "/privacy", "/report", "/not-a-real-route"]) {
    const response = await request(path, "HEAD");
    const csp = String(response.headers["content-security-policy"] ?? "");
    const frame = String(response.headers["x-frame-options"] ?? "");
    const type = String(response.headers["content-type"] ?? "");
    record(`${path} HTML fallback`, response.statusCode === 200 && type.includes("text/html"), `status ${response.statusCode}`);
    record(`${path} CSP`, csp.includes("frame-ancestors 'none'"));
    record(`${path} anti-frame header`, frame === "DENY");
  }
}

async function checkWebSocketUpgrade() {
  const wsUrl = new URL("/ws?code=00000000&role=receiver", base);
  wsUrl.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const key = randomBytes(16).toString("base64");
  const port = Number(wsUrl.port || (wsUrl.protocol === "wss:" ? 443 : 80));
  const host = wsUrl.hostname;

  const socket = wsUrl.protocol === "wss:"
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
    socket.setTimeout(12_000, () => reject(new Error(`Timed out connecting to ${wsUrl.href}`)));
  });

  const path = `${wsUrl.pathname}${wsUrl.search}`;
  socket.write([
    `GET ${path} HTTP/1.1`,
    `Host: ${wsUrl.host}`,
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${key}`,
    "Sec-WebSocket-Version: 13",
    "",
    ""
  ].join("\r\n"));

  const response = await new Promise((resolve, reject) => {
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk.toString("utf8");
      if (data.includes("\r\n\r\n")) {
        resolve(data);
      }
    });
    socket.once("error", reject);
    socket.setTimeout(12_000, () => reject(new Error(`Timed out waiting for ${wsUrl.href}`)));
  });
  socket.destroy();

  const statusLine = String(response).split("\r\n")[0] ?? "";
  record("/ws upgrade", statusLine.includes(" 101 "), statusLine);
}

try {
  await checkHttp();
  await checkWebSocketUpgrade();
} catch (error) {
  record("smoke runner", false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`Deployment smoke failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`Deployment smoke passed for ${base.origin}`);
