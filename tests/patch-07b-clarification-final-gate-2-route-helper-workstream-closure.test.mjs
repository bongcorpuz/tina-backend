/**
 * PATCH-07B-CLARIFICATION-FINAL-GATE-2 - route/helper workstream final closure gate
 *
 * Run: node tests/patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildClarificationRouteDecision,
  normalizeClarificationResponseType,
  shouldBlockFullAnswerGeneration
} from "../clarification-route-orchestrator-helper.js";

const CURRENT_STATE_PATH = resolve("knowledge", "CURRENT_STATE.md");
const REPORT_PATH = resolve("PATCH-07B-CLARIFICATION-FINAL-GATE-2_CLARIFICATION_ROUTE_HELPER_WORKSTREAM_FINAL_CLOSURE.md");

const REQUIRED_ROUTE_ARTIFACTS = [
  "clarification-route-orchestrator-helper.js",
  "tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs",
  "PATCH-07B-CLARIFICATION-ROUTE-HELPER-1_NARROW_ROUTE_CLARIFICATION_ORCHESTRATOR_HELPER.md",
  "tests/patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs",
  "PATCH-07B-CLARIFICATION-ROUTE-GATE-1_ROUTE_CLARIFICATION_HELPER_COMPOSITION_AND_SAFETY_GATE.md",
  "evaluation/fixtures/phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json",
  "tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs",
  "PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1_ROUTE_PROMPT_INTEGRATION_FIXTURE_AND_TESTS.md"
];

const HELPER_FILES = [
  "issue-framing-engine.js",
  "reasoning-safety-policy.js",
  "fact-gap-helper.js",
  "client-fact-checklist-output.js",
  "authority-applicability-helper.js",
  "adversarial-content-safety-policy.js",
  "bir-vs-taxpayer-position-helper.js",
  "audit-risk-language-helper.js",
  "clarification-boundary-policy.js",
  "clarification-route-orchestrator-helper.js"
];

const REPORT_SECTIONS = [
  "Objective",
  "Scope",
  "Gemini Review 15 Carry-Forward",
  "Route Composition Gate Carry-Forward",
  "Files Added",
  "Workstream Closure Summary",
  "Ten-Helper Reasoning Block Closure",
  "Non-Live Boundary Confirmation",
  "Core Contract Preservation",
  "Future Insertion Point Carry-Forward",
  "Deferred Phase Boundaries",
  "Validation Commands Run",
  "Validation Results",
  "Gate Decision",
  "Recommended Next Task",
  "Gemini Review 16 Requirement",
  "Final Recommendation"
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

function readText(path) {
  return readFileSync(path, "utf8");
}

function currentStateText() {
  return readText(CURRENT_STATE_PATH);
}

function reportText() {
  return readText(REPORT_PATH);
}

function combinedClosureText() {
  return `${reportText()}\n${currentStateText()}`;
}

function assertIncludesAll(text, values, label) {
  for (const value of values) {
    assert(text.includes(value), `${label} missing: ${value}`);
  }
}

function affirmativeLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !/\b(?:no|not|without|defer|deferred|deferrals|remain deferred|future|later|required before|before implementation|design-only|prohibited|prohibit|forbid|must not|risk scoring|runtime|placeholder|placeholders)\b/i.test(line))
    .join("\n");
}

await test("required route/helper artifacts exist", () => {
  for (const file of REQUIRED_ROUTE_ARTIFACTS) assert(existsSync(resolve(file)), `missing artifact ${file}`);
});

await test("ten helper chain artifact files exist", () => {
  for (const file of HELPER_FILES) assert(existsSync(resolve(file)), `missing helper ${file}`);
});

await test("route helper exports remain available and narrow", () => {
  assert.equal(typeof buildClarificationRouteDecision, "function");
  assert.equal(typeof normalizeClarificationResponseType, "function");
  assert.equal(typeof shouldBlockFullAnswerGeneration, "function");
});

await test("CURRENT_STATE carries final closure markers and non-live boundaries", () => {
  const text = currentStateText().toLowerCase();
  assertIncludesAll(text, [
    "patch-07b-clarification-route-scaffold-1",
    "patch-07b-clarification-route-helper-1",
    "patch-07b-clarification-route-gate-1",
    "patch-07b-gemini-review-14",
    "patch-07b-gemini-review-15",
    "pass with strict recommendations",
    "patch-07b-clarification-final-gate-2",
    "no live route wiring",
    "no prompt integration",
    "no response-generation branching",
    "no frontend implementation"
  ], "CURRENT_STATE");
});

await test("Gemini Review 15 carry-forward is explicit", () => {
  const text = combinedClosureText();
  assertIncludesAll(text, [
    "PATCH-07B-GEMINI-REVIEW-15",
    "PASS WITH STRICT RECOMMENDATIONS",
    "Required fixes before next patch: None",
    "immediate next patch must be PATCH-07B-CLARIFICATION-FINAL-GATE-2",
    "live design is after final gate",
    "Gemini Review 16 required after live design and before implementation"
  ], "Gemini Review 15 carry-forward");
});

await test("final closure files do not import live integration surfaces", () => {
  const testSource = readText(resolve("tests", "patch-07b-clarification-final-gate-2-route-helper-workstream-closure.test.mjs"));
  const report = reportText();
  const importStatements = testSource.match(/^\s*import\s+.+$/gm) || [];
  const importText = importStatements.join("\n");
  assert.doesNotMatch(importText, /routes\/ask-route|routes\\ask-route|routes\/tax-route|routes\\tax-route|routes\/audit-route|routes\\audit-route/i);
  assert.doesNotMatch(importText, /ask-handler|pipeline\.js|context-orchestration-engine|tax-mode-prompt|audit-mode-prompt|adaptive-tina-master-prompt|answer-renderer/i);
  assert.doesNotMatch(importText, /openai|retrieval-engine|vector-store|supabase/i);
  assert.doesNotMatch(report, /from\s+["']\.\/routes|require\(["']\.\/routes|new\s+OpenAI|chat\.completions/i);
});

await test("ten-helper reasoning block closure is recognized", () => {
  const text = combinedClosureText().toLowerCase();
  for (const phrase of [
    "issue framing",
    "reasoning safety",
    "fact gap",
    "client fact checklist",
    "authority applicability",
    "adversarial content safety",
    "bir vs taxpayer position",
    "qualitative audit-risk",
    "clarification boundary",
    "route clarification orchestrator"
  ]) {
    assert(text.includes(phrase), `missing ten-helper phrase ${phrase}`);
  }
});

await test("core route/helper contracts are preserved", () => {
  const text = combinedClosureText();
  assertIncludesAll(text, [
    "feature flag OFF default",
    "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED",
    "answerAllowed false blocking contract",
    "shouldBuildFullAnswerPrompt false when blocked",
    "shouldCallOpenAIForFullAnswer false when blocked",
    "source limitation non-blocking unless answerAllowed false",
    "Phase 10 deferral non-blocking unless answerAllowed false",
    "structuredClarificationObject",
    "compact metadata sanitization",
    "retrievalContext strips fullDocument and rawBody"
  ], "core contract");
});

await test("future insertion point is preserved for later live design", () => {
  const text = combinedClosureText();
  assertIncludesAll(text, [
    "runPipeline insertion point",
    "after Step 6.5",
    "before Step 13",
    "before Step 14",
    "before prompt construction",
    "before OpenAI generation"
  ], "future insertion point");
});

await test("approved next step is design-only live integration review", () => {
  const text = combinedClosureText();
  assertIncludesAll(text, [
    "PATCH-07B-CLARIFICATION-LIVE-DESIGN-1",
    "Live Clarification Route/Prompt Integration Design",
    "Agent: Claude Code",
    "Design-only",
    "no live route wiring yet",
    "Gemini Review 16 required after live design and before live route implementation"
  ], "approved next step");
});

await test("deferred phase boundaries are not marked implemented", () => {
  const text = affirmativeLines(combinedClosureText());
  for (const pattern of [
    /Phase 8 memory .*implemented/i,
    /Phase 9 workflow .*implemented/i,
    /Phase 10 source governance .*implemented/i,
    /Phase 10 hallucination trap tests .*implemented/i,
    /(?:Phase 10 court case metadata|G\.R\. number lookup) .*implemented/i,
    /Phase 11 observability .*implemented/i,
    /Phase 12 document advisory .*implemented/i,
    /authority conflict resolver .*implemented/i,
    /hierarchy runtime .*implemented/i,
    /(?:supersession|currentness) runtime .*implemented/i,
    /(?:settlement|protest|CTA) runtime .*implemented/i
  ]) {
    assert.doesNotMatch(text, pattern);
  }
});

await test("prohibited live implementation claims are absent", () => {
  const text = affirmativeLines(combinedClosureText());
  for (const pattern of [
    /live \/ask route wiring .*implemented/i,
    /live \/tax route wiring .*implemented/i,
    /live \/audit route wiring .*implemented/i,
    /prompt integration .*implemented/i,
    /response-generation branching .*implemented/i,
    /frontend responseType rendering .*implemented/i,
    /production orchestrator .*implemented/i,
    /OpenAI generation skipping in runtime .*implemented/i,
    /byte-identical OFF-state runtime proof .*implemented/i
  ]) {
    assert.doesNotMatch(text, pattern);
  }
});

await test("final report has required closure sections", () => {
  const text = reportText();
  for (const section of REPORT_SECTIONS) {
    assert(new RegExp(`##\\s+\\d+\\.\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text), `missing report section ${section}`);
  }
});

await test("no prohibited output phrases appear as affirmative recommendations", () => {
  const text = affirmativeLines(combinedClosureText()).toLowerCase();
  for (const phrase of [
    "assessment is void",
    "bir has no case",
    "taxpayer will win",
    "bir will win",
    "guaranteed",
    "settlement recommendation",
    "protest strategy",
    "cta strategy",
    "litigation strategy"
  ]) {
    assert(!text.includes(phrase), `affirmative prohibited phrase found: ${phrase}`);
  }
});

await test("Phase 10 leakage is only deferred if mentioned", () => {
  for (const line of combinedClosureText().split(/\r?\n/)) {
    if (/\b(?:HAL|trap|tax hallucination|court-case metadata|court case metadata|G\.R\. number lookup)\b/i.test(line)) {
      assert(/defer|deferred|Phase 10|remain/i.test(line), `Phase 10 item not marked deferred: ${line}`);
    }
  }
});

console.log(`\nPATCH-07B-CLARIFICATION-FINAL-GATE-2 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
