/**
 * TINA regression gate runner.
 *
 * Run: npm test  (alias: node scripts/run-regressions.mjs)
 *
 * 1. Syntax-checks (node --check) the authority-critical engine files.
 * 2. Discovers and runs every regression suite in tests/*.test.mjs and every
 *    stage test matching _stage*_test.mjs in the repo root, sequentially.
 * 3. Prints a per-suite summary and exits non-zero if anything fails.
 *
 * Discovery is dynamic so future patch suites are picked up automatically.
 * This script only RUNS existing tests — it contains no pipeline, authority,
 * retrieval, generation, or rendering logic.
 */

"use strict";

import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ─── 1. Syntax checks ─────────────────────────────────────────────────────────

const SYNTAX_CHECK_FILES = [
  "server.js",
  "pipeline.js",
  "issue-classification-engine.js",
  "answer-renderer.js",
  "ask-handler.js",
  "retrieval-engine.js",
  "reranker-engine.js",
  "conflict-engine.js",
  "conversation-memory.js",
  "adaptive-tina-master-prompt.js"
];

// ─── 2. Test discovery ────────────────────────────────────────────────────────

function discoverTests() {
  const patchSuites = existsSync(join(ROOT, "tests"))
    ? readdirSync(join(ROOT, "tests"))
        .filter((f) => f.endsWith(".test.mjs"))
        .sort()
        .map((f) => join("tests", f))
    : [];

  const stageSuites = readdirSync(ROOT)
    .filter((f) => /^_stage.*_test\.mjs$/.test(f))
    .sort();

  return [...patchSuites, ...stageSuites];
}

// ─── 3. Runner ────────────────────────────────────────────────────────────────

function run(label, args) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000
  });
  const ms = Date.now() - startedAt;
  const ok = result.status === 0;
  return { label, ok, ms, status: result.status, output: `${result.stdout || ""}${result.stderr || ""}` };
}

const results = [];
let syntaxFailures = 0;

console.log("══ TINA REGRESSION GATE ═════════════════════════════════════");

console.log("\n── Syntax checks (node --check)");
const missingSyntaxTargets = [];
for (const file of SYNTAX_CHECK_FILES) {
  if (!existsSync(join(ROOT, file))) {
    missingSyntaxTargets.push(file);
    console.warn(`  SKIP  ${file} (not found)`);
    continue;
  }
  const r = run(file, ["--check", file]);
  results.push({ ...r, kind: "syntax" });
  if (!r.ok) syntaxFailures++;
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${file}`);
  if (!r.ok) console.error(r.output.trim());
}

console.log("\n── Regression / stage suites");
const tests = discoverTests();
if (tests.length === 0) {
  console.error("  No test files discovered — failing the gate.");
  process.exit(1);
}
let testFailures = 0;
for (const file of tests) {
  const r = run(file, [file]);
  results.push({ ...r, kind: "test" });
  if (!r.ok) testFailures++;
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${file}  (${r.ms} ms)`);
  if (!r.ok) {
    console.error(`  ── output of failing suite ${file} ──`);
    console.error(r.output.trim().split("\n").slice(-30).join("\n"));
  }
}

// ─── 4. Summary ───────────────────────────────────────────────────────────────

const failed = syntaxFailures + testFailures;
console.log(`\n${"═".repeat(62)}`);
console.log(`Syntax checks: ${SYNTAX_CHECK_FILES.length - missingSyntaxTargets.length} run, ${syntaxFailures} failed${missingSyntaxTargets.length ? `, ${missingSyntaxTargets.length} skipped (missing: ${missingSyntaxTargets.join(", ")})` : ""}`);
console.log(`Test suites:   ${tests.length} run, ${testFailures} failed`);
console.log(failed === 0 ? "GATE PASSED" : "GATE FAILED");
process.exit(failed === 0 ? 0 : 1);
