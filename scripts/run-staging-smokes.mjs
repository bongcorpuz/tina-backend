/**
 * TINA staging-smoke gate (MANDATORY, network-dependent).
 *
 * Run: node scripts/run-staging-smokes.mjs
 *
 * PHASE-10A12-R5: the network-dependent staging-smoke suites are SEPARATED from
 * the deterministic local regression gate (scripts/run-regressions.mjs) so that
 * a transient staging outage cannot make the deterministic gate non-deterministic.
 * This separation does NOT remove, weaken, or make optional any staging coverage:
 * every staging-smoke suite runs here as a MANDATORY, BLOCKING check and this
 * script exits non-zero if any of them fails. R5 PASS requires BOTH this lane and
 * the deterministic gate to be green.
 *
 * Discovery is dynamic: every tests/*staging-smoke*.test.mjs is picked up, so no
 * staging suite can be silently dropped.
 */

"use strict";

import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function discoverStagingSmokes() {
  const dir = join(ROOT, "tests");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /staging-smoke.*\.test\.mjs$/.test(f))
    .sort()
    .map((f) => join("tests", f));
}

function run(file) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [file], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000
  });
  return {
    file,
    ok: result.status === 0,
    ms: Date.now() - startedAt,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

console.log("══ TINA STAGING-SMOKE GATE (mandatory, network-dependent) ════");
const suites = discoverStagingSmokes();
if (suites.length === 0) {
  console.error("  No staging-smoke suites discovered — failing the mandatory gate.");
  process.exit(1);
}

let failed = 0;
for (const file of suites) {
  const r = run(file);
  if (!r.ok) failed++;
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${file}  (${r.ms} ms)`);
  if (!r.ok) console.error(r.output.trim().split("\n").slice(-30).join("\n"));
}

console.log(`\n${"═".repeat(62)}`);
console.log(`Staging-smoke suites: ${suites.length} run, ${failed} failed`);
console.log(failed === 0 ? "STAGING GATE PASSED" : "STAGING GATE FAILED (staging must be reachable and conformant)");
process.exit(failed === 0 ? 0 : 1);
