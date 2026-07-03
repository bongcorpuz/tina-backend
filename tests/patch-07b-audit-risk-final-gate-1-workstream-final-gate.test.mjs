/**
 * PATCH-07B-AUDIT-RISK-FINAL-GATE-1 - audit-risk workstream final gate
 *
 * Run: node tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_HELPERS = [
  "issue-framing-engine.js",
  "reasoning-safety-policy.js",
  "fact-gap-helper.js",
  "client-fact-checklist-output.js",
  "authority-applicability-helper.js",
  "adversarial-content-safety-policy.js",
  "bir-vs-taxpayer-position-helper.js",
  "audit-risk-language-helper.js"
];

const REQUIRED_AUDIT_RISK_REPORTS = [
  "PATCH-07B-AUDIT-RISK-HELPER-1_NARROW_QUALITATIVE_AUDIT_RISK_LANGUAGE_HELPER.md",
  "PATCH-07B-AUDIT-RISK-GATE-1_QUALITATIVE_AUDIT_RISK_COMPOSITION_AND_SAFETY_GATE.md",
  "PATCH-07B-AUDIT-RISK-FINAL-GATE-1_AUDIT_RISK_WORKSTREAM_FINAL_GATE.md"
];

const REQUIRED_CONTEXT_REPORTS = [
  "PATCH-07B-FINAL-GATE-1_PHASE_7B_ANALYTICAL_ADVERSARIAL_REASONING_FINAL_GATE.md",
  "PATCH-07B-015_BIR_TAXPAYER_COMPOSITION_GUARD_AND_GATE.md",
  "PATCH-07B-014_BIR_VS_TAXPAYER_POSITION_RUNTIME_HELPER.md",
  "PATCH-07B-013R_ADVERSARIAL_CONTENT_SAFETY_AND_RISK_LANGUAGE_POLICY.md"
];

const REQUIRED_AUDIT_RISK_TESTS = [
  "tests/patch-07b-audit-risk-helper-1-narrow-qualitative-audit-risk-language-helper.test.mjs",
  "tests/patch-07b-audit-risk-gate-1-qualitative-audit-risk-composition-safety-gate.test.mjs",
  "tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs"
];

const PROHIBITED_HELPERS = [
  "settlement-protest-helper.js",
  "cta-strategy-helper.js",
  "audit-protest-strategy-helper.js",
  "authority-conflict-resolver.js",
  "hierarchy-resolution-engine.js",
  "supersession-runtime-helper.js",
  "live-clarification-integration.js"
];

const PROTECTED_DIFF_PATTERNS = [
  /^server\.js$/,
  /^adaptive-tina-master-prompt\.js$/,
  /^prompts\//,
  /^retrieval-engine\.js$/,
  /^reranker-engine\.js$/,
  /^source-card-engine\.js$/,
  /^sourceAvailability/i,
  /^package(?:-lock)?\.json$/,
  /^\.env/
];

const ALLOWED_LIVE_WIRING_DIFF_FILES = new Set([
  "pipeline.js",
  "ask-handler.js",
  "clarification-boundary-policy.js",
  "tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs",
  "tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs",
  "tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs",
  "tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs",
  "tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs",
  "tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs",
  "tests/patch-07b-final-gate-1-analytical-adversarial-final-gate.test.mjs",
  "PATCH-07B-CLARIFICATION-LIVE-WIRING-1_NARROW_LIVE_CLARIFICATION_ROUTE_WIRING.md",
  "PATCH-07B-CLARIFICATION-LIVE-WIRING-STAGING-FOLLOWUP-1_DIAGNOSTIC_AND_NARROW_PATCH.md",
  "knowledge/CURRENT_STATE.md"
]);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    failed++;
  }
}

function assertExists(path) {
  assert(existsSync(resolve(path)), `${path} must exist`);
}

function gitDiffNames() {
  const result = spawnSync("git", ["diff", "--name-only"], {
    cwd: resolve("."),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

await test("required audit-risk helper and core Phase 7B helper files exist", () => {
  for (const helper of REQUIRED_HELPERS) assertExists(helper);
});

await test("required audit-risk and context reports exist", () => {
  for (const report of [...REQUIRED_AUDIT_RISK_REPORTS, ...REQUIRED_CONTEXT_REPORTS]) assertExists(report);
});

await test("required audit-risk focused tests exist", () => {
  for (const testFile of REQUIRED_AUDIT_RISK_TESTS) assertExists(testFile);
});

await test("prohibited future runtime helper files do not exist", () => {
  for (const helper of PROHIBITED_HELPERS) {
    assert(!existsSync(resolve(helper)), `${helper} must not exist`);
  }
});

await test("audit-risk helper chain remains route and prompt unwired", () => {
  const askHandler = readFileSync(resolve("ask-handler.js"), "utf8");
  const pipeline = readFileSync(resolve("pipeline.js"), "utf8");
  const prompt = readFileSync(resolve("adaptive-tina-master-prompt.js"), "utf8");
  const forbidden = /audit-risk-language-helper|assessQualitativeAuditRisk|buildAuditRiskLanguageChecklist/;
  assert.doesNotMatch(askHandler, forbidden);
  assert.match(pipeline, /TINA_ENABLE_CLARIFICATION_ROUTE_GATE/);
  assert.match(pipeline, /Step 12\.6: Live clarification route gate/);
  assert.match(pipeline, /assessQualitativeAuditRisk/);
  assert.doesNotMatch(prompt, forbidden);
});

await test("current patch diff allows only authorized clarification live wiring and protected production files remain blocked", () => {
  const changed = gitDiffNames();
  for (const name of changed) {
    assert(ALLOWED_LIVE_WIRING_DIFF_FILES.has(name), `unexpected changed file: ${name}`);
    assert(!PROTECTED_DIFF_PATTERNS.some((pattern) => pattern.test(name)), `protected file changed: ${name}`);
  }
});

await test("final gate metadata is local-only and requires no network, DB, secrets, or indexing", () => {
  const source = readFileSync(resolve("PATCH-07B-AUDIT-RISK-FINAL-GATE-1_AUDIT_RISK_WORKSTREAM_FINAL_GATE.md"), "utf8");
  assert.match(source, /no live route\/prompt integration/i);
  assert.match(source, /No DB\/indexing\/vector\/corpus\/ingestion changes/i);
  assert.match(source, /Deferred Phase 10 assets/i);
});

console.log(`\nPATCH-07B-AUDIT-RISK-FINAL-GATE-1 workstream final gate tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
