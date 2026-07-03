/**
 * PATCH-07B-CLARIFICATION-FINAL-GATE-1 - clarification track final gate
 *
 * Run: node tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import * as clarificationPolicy from "../clarification-boundary-policy.js";

const REQUIRED_ARTIFACTS = [
  "evaluation/fixtures/phase-7b-clarification-scaffold-1-decision-policy.fixture.json",
  "tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs",
  "PATCH-07B-CLARIFICATION-SCAFFOLD-1_CLARIFICATION_DECISION_FIXTURE_AND_TESTS.md",
  "clarification-boundary-policy.js",
  "tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs",
  "PATCH-07B-CLARIFICATION-HELPER-1_NARROW_CLARIFICATION_BOUNDARY_POLICY_HELPER.md",
  "tests/patch-07b-clarification-gate-2-composition-safety-gate.test.mjs",
  "PATCH-07B-CLARIFICATION-GATE-2_CLARIFICATION_HELPER_COMPOSITION_AND_SAFETY_GATE.md"
];

const FINAL_REPORT = "PATCH-07B-CLARIFICATION-FINAL-GATE-1_CLARIFICATION_TRACK_FINAL_GATE.md";

const APPROVED_DECISIONS = [
  "ASK_BEFORE_ANSWERING",
  "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
  "REQUEST_DOCUMENTS",
  "DISCLOSE_SOURCE_LIMITATION",
  "DISCLOSE_PHASE10_DEFERRAL",
  "ANSWER_NOW_NO_CLARIFICATION_NEEDED"
];

const APPROVED_POSTURES = [
  "GENERAL_ORIENTATION_ONLY",
  "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
  "NO_ANSWER_UNTIL_CLARIFIED"
];

const HELPER_CHAIN = [
  "issue-framing-engine.js",
  "reasoning-safety-policy.js",
  "fact-gap-helper.js",
  "client-fact-checklist-output.js",
  "authority-applicability-helper.js",
  "adversarial-content-safety-policy.js",
  "bir-vs-taxpayer-position-helper.js",
  "audit-risk-language-helper.js",
  "clarification-boundary-policy.js"
];

const PATCH_SEQUENCE_MARKERS = [
  /design complete/i,
  /Gemini Review 10.*complete/i,
  /scaffold complete/i,
  /helper complete/i,
  /Gemini Review 11.*complete/i,
  /composition gate complete/i,
  /Gemini Review 12.*complete/i
];

const SUSPICIOUS_LIVE_MARKERS = [
  "buildClarificationPrompt",
  "liveClarificationHandler",
  "clarificationPrompt",
  "routeClarification",
  "promptClarification",
  "responseGenerationClarification"
];

const PROTECTED_DIFF_PATTERNS = [
  /^routes\//,
  /(?:^|\/)(?:route|controller).*\.js$/i,
  /^ask-handler\.js$/,
  /^assessment-handler\.js$/,
  /^server\.js$/,
  /^prompts\//,
  /^adaptive-tina-master-prompt\.js$/,
  /^answer-renderer\.js$/,
  /^context-orchestration-engine\.js$/,
  /^retrieval-engine\.js$/,
  /^reranker-engine\.js$/,
  /^reranker-/,
  /^source-card-engine\.js$/,
  /^source-visibility-engine\.js$/,
  /^sourceAvailability/i,
  /^package(?:-lock)?\.json$/,
  /^\.env/,
  /^vector-store\.js$/,
  /^reindex-service\.js$/,
  /^drive-reader\.js$/,
  /^evaluation\/factcheck\//,
  /^tests\/TINA_Adversarial_Test_Set_PH_Tax\.md$/,
  /^tests\/TINA_Tax_FactCheck_Answer_Key_v2\.md$/
];

const ALLOWED_DIFF_FILES = new Set([
  "tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs",
  FINAL_REPORT,
  "pipeline.js",
  "tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs",
  "tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs",
  "tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs",
  "tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs",
  "tests/patch-07b-final-gate-1-analytical-adversarial-final-gate.test.mjs",
  "PATCH-07B-CLARIFICATION-LIVE-WIRING-1_NARROW_LIVE_CLARIFICATION_ROUTE_WIRING.md",
  "knowledge/CURRENT_STATE.md"
]);

const REQUIRED_DEFERRALS = [
  /live route integration/i,
  /prompt integration/i,
  /response generation changes/i,
  /production orchestrator/i,
  /frontend\/streaming/i,
  /settlement\/protest runtime/i,
  /CTA strategy runtime/i,
  /authority conflict\/hierarchy\/supersession runtime/i,
  /Phase 8 memory/i,
  /Phase 9 workflows/i,
  /Phase 10 source governance\/acquisition/i,
  /Phase 11 observability/i,
  /Phase 12 document advisory/i
];

const PROHIBITED_OUTPUT_PATTERNS = [
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\btaxpayer will win\b/i,
  /\bBIR will win\b/i,
  /\bguaranteed\b/i,
  /\bsettlement recommendation\b/i,
  /\bprotest strategy\b/i,
  /\bCTA strategy\b/i,
  /\blitigation strategy\b/i
];

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

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

function git(args) {
  const result = spawnSync("git", args, { cwd: resolve("."), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function gitDiffNames() {
  return git(["diff", "--name-only"]).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function gitTrackedFiles() {
  return git(["ls-files"]).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function productionFiles() {
  return gitTrackedFiles().filter((file) => {
    if (file.startsWith("tests/")) return false;
    if (file.startsWith("evaluation/")) return false;
    if (file.startsWith("reviews/")) return false;
    if (extname(file).toLowerCase() === ".md") return false;
    if (!existsSync(resolve(file))) return false;
    return [".js", ".mjs", ".cjs"].includes(extname(file).toLowerCase());
  });
}

function assertAuthorizedLiveWiringPipeline() {
  const source = read("pipeline.js");
  assert(source.includes("TINA_ENABLE_CLARIFICATION_ROUTE_GATE"));
  assert(source.includes("Step 12.6: Live clarification route gate"));
  assert(source.includes("evaluateClarificationRouteGate"));
  assert(source.includes("buildClarificationRouteDecision"));
  assert.match(source, /if \(!isClarificationRouteGateEnabled\(env\)\)[\s\S]*enabled:\s*false/);
  assert.match(source, /responseType:\s*"clarification"/);
  assert.match(source, /structuredClarificationObject:\s*null/);
  assert.match(source, /CLARIFICATION_ROUTE_GATE_FAIL_OPEN/);
  assert.doesNotMatch(source, /routes\/|routes\\/i);
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

await test("required clarification artifacts exist", () => {
  for (const artifact of REQUIRED_ARTIFACTS) assertExists(artifact);
});

await test("required exports exist and prohibited exports are absent", () => {
  assert.equal(typeof clarificationPolicy.assessClarificationNeed, "function");
  assert.equal(typeof clarificationPolicy.buildClarificationChecklist, "function");
  assert.equal(Object.hasOwn(clarificationPolicy, "buildClarificationPrompt"), false);
  assert.equal(Object.hasOwn(clarificationPolicy, "createClarificationPrompt"), false);
  assert.equal(Object.hasOwn(clarificationPolicy, "liveClarificationHandler"), false);
});

await test("helper output remains non-conclusive with approved decisions and postures", () => {
  const fixture = JSON.parse(read("evaluation/fixtures/phase-7b-clarification-scaffold-1-decision-policy.fixture.json"));
  for (const testCase of fixture.cases) {
    const output = clarificationPolicy.assessClarificationNeed({
      mode: testCase.mode,
      scenario: testCase.scenario,
      ...testCase.inputSignals
    });
    assert.equal(output.canReachFinalConclusion, false, `${testCase.caseId} canReachFinalConclusion`);
    assert.equal(output.implementationScope, "CLARIFICATION_BOUNDARY_POLICY_ONLY", `${testCase.caseId} implementationScope`);
    assert(APPROVED_DECISIONS.includes(output.clarificationDecision), `${testCase.caseId} unsupported decision`);
    assert(APPROVED_POSTURES.includes(output.allowedAnswerPosture), `${testCase.caseId} unsupported posture`);
    const text = collectStrings(output).join("\n");
    for (const pattern of PROHIBITED_OUTPUT_PATTERNS) {
      assert(!pattern.test(text), `${testCase.caseId} contains prohibited output ${pattern}`);
    }
  }
});

await test("final gate report confirms patch sequence and nine-helper chain", () => {
  assertExists(FINAL_REPORT);
  const report = read(FINAL_REPORT);
  for (const pattern of PATCH_SEQUENCE_MARKERS) assert.match(report, pattern);
  for (const helper of HELPER_CHAIN) assert.match(report, new RegExp(helper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

await test("no unauthorized live prompt or response-generation marker exists in production files", () => {
  const offenders = [];
  for (const file of productionFiles()) {
    const source = read(file);
    for (const marker of SUSPICIOUS_LIVE_MARKERS) {
      if (source.includes(marker)) offenders.push(`${file}: ${marker}`);
    }
  }
  assert.deepEqual(offenders, []);
  assertAuthorizedLiveWiringPipeline();
});

await test("current patch diff allows only authorized flagged live wiring and protected surfaces remain blocked", () => {
  const changed = gitDiffNames();
  for (const name of changed) {
    assert(ALLOWED_DIFF_FILES.has(name), `unexpected changed file: ${name}`);
    assert(!PROTECTED_DIFF_PATTERNS.some((pattern) => pattern.test(name)), `protected file changed: ${name}`);
  }
  if (changed.includes("pipeline.js")) assertAuthorizedLiveWiringPipeline();
});

await test("final gate report explicitly defers live integration and later phase work", () => {
  const report = read(FINAL_REPORT);
  for (const pattern of REQUIRED_DEFERRALS) assert.match(report, pattern);
  assert.match(report, /PATCH-07B-CLARIFICATION-ROUTE-DESIGN-1|PATCH-07B-LIVE-INTEGRATION-DESIGN-1/);
  assert.match(report, /Gemini Review 13.*required/i);
  assert.match(report, /PASS WITH RECOMMENDATIONS/i);
});

await test("CURRENT_STATE marks closure, no live integration, and design-only next task", () => {
  const state = read("knowledge/CURRENT_STATE.md");
  assert.match(state, /PATCH-07B-CLARIFICATION-FINAL-GATE-1.*COMPLETE/i);
  assert.match(state, /clarification track.*CLOSED \/ COMPLETE \/ PASS WITH RECOMMENDATIONS/i);
  assert.match(state, /nine-helper Phase 7B reasoning chain/i);
  assert.match(state, /no live route\/prompt integration/i);
  assert.match(state, /no production orchestrator/i);
  assert.match(state, /no response-generation changes/i);
  assert.match(state, /route\/prompt\/live integration remains deferred/i);
  assert.match(state, /PATCH-07B-CLARIFICATION-ROUTE-DESIGN-1|PATCH-07B-LIVE-INTEGRATION-DESIGN-1/i);
  assert.match(state, /Claude Code/i);
  assert.match(state, /Gemini Review 13.*required/i);
});

console.log(`\nPATCH-07B-CLARIFICATION-FINAL-GATE-1 track closure tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
