#!/usr/bin/env node
// Reads .env and pushes every variable to Railway via CLI.
// Run: node scripts/push-env-to-railway.mjs [--service <name>]
//
// Requires: railway CLI authenticated, project linked.

import { readFileSync } from "fs";
import { execSync } from "child_process";

const serviceFlag = (() => {
  const idx = process.argv.indexOf("--service");
  return idx !== -1 ? `--service ${process.argv[idx + 1]}` : "";
})();

const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const pairs = [];

for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  // Strip surrounding quotes from value.
  let value = trimmed.slice(eqIdx + 1);
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (key) pairs.push({ key, value });
}

console.log(`Pushing ${pairs.length} variables to Railway${serviceFlag ? ` (${serviceFlag})` : ""}...`);

// Set variables one at a time using: railway variable set --service <name> KEY=VALUE
for (const { key, value } of pairs) {
  const setArg = `${key}=${value}`;
  try {
    execSync(
      `/usr/local/bin/railway variable set ${serviceFlag} ${JSON.stringify(setArg)}`,
      { stdio: ["ignore", "pipe", "pipe"], env: process.env },
    );
    console.log(`  Set: ${key}`);
  } catch (e) {
    // Fallback: use legacy --set flag
    try {
      execSync(
        `/usr/local/bin/railway variables ${serviceFlag} --set ${JSON.stringify(setArg)} --skip-deploys`,
        { stdio: ["ignore", "pipe", "pipe"], env: process.env },
      );
      console.log(`  Set (legacy): ${key}`);
    } catch {
      console.error(`  Failed: ${key}`);
    }
  }
}

console.log("Done.");
