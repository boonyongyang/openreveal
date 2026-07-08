#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const maxScanBytes = 2 * 1024 * 1024;

const candidateFiles = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean);

const filenameChecks = [
  {
    name: "env file",
    test: (file) => /(^|\/)\.env($|\.)/.test(file) && file !== ".env.example"
  },
  {
    name: "SQLite database",
    test: (file) => /\.(sqlite|sqlite-shm|sqlite-wal|db|db-shm|db-wal)$/i.test(file)
  },
  {
    name: "private key or certificate",
    test: (file) => /\.(pem|key|p12|pfx)$/i.test(file)
  },
  {
    name: "cloud credential file",
    test: (file) => /(^|\/)(service-account|credentials|firebase-admin).*\.(json|yaml|yml)$/i.test(file)
  }
];

const contentChecks = [
  {
    name: "private key block",
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/
  },
  {
    name: "Google API key",
    pattern: /AIza[0-9A-Za-z_-]{35}/
  },
  {
    name: "GitHub token",
    pattern: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[0-9A-Za-z_]{20,}/
  },
  {
    name: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/
  },
  {
    name: "Slack token",
    pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/
  }
];

const findings = [];

for (const file of candidateFiles) {
  for (const check of filenameChecks) {
    if (check.test(file)) {
      findings.push(`${file}: release candidate ${check.name}`);
    }
  }

  let content;
  try {
    const buffer = readFileSync(file);
    if (buffer.length > maxScanBytes || buffer.includes(0)) {
      continue;
    }
    content = buffer.toString("utf8");
  } catch {
    continue;
  }

  for (const check of contentChecks) {
    if (check.pattern.test(content)) {
      findings.push(`${file}: possible ${check.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Release artifact scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Release artifact scan passed (${candidateFiles.length} tracked/unignored files checked).`);
