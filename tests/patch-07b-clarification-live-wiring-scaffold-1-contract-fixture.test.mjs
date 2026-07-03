/**
 * PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1 - live wiring scaffold contract tests
 *
 * Run: node tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-live-wiring-scaffold-1-contract.fixture.json");
const TEST_PATH = resolve("tests", "patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs");
const REPORT_PATH = resolve("PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1_LIVE_CLARIFICATION_WIRING_FIXTURE_AND_TESTS.md");
const CURRENT_STATE_PATH = resolve("knowledge", "CURRENT_STATE.md");

const REQUIRED_RESPONSE_TYPES = [
  "clarification",
  "answer_with_followup",
  "document_request_with_cautious_answer",
  "source_limited_orientation",
  "phase10_deferred_orientation",
  "answer"
];

const FLAG_OFF_CASES = [
  "FLAG_OFF_BASELINE_ASK",
  "FLAG_OFF_BASELINE_TAX",
  "FLAG_OFF_BASELINE_AUDIT"
];

const FLAG_ON_BLOCKING_CASES = [
  "FLAG_ON_BLOCKING_ASK",
  "FLAG_ON_BLOCKING_TAX",
  "FLAG_ON_BLOCKING_AUDIT"
];

const REPORT_SECTIONS = [
  "Objective",
  "Scope",
  "Gemini Review 16 Carry-Forward",
  "Naming Collision Correction",
  "Live Design Carry-Forward",
  "Files Added",
  "Fixture Summary",
  "Insertion Point Contract Coverage",
  "Feature Flag Contract Coverage",
  "OFF-State Contract Coverage",
  "ON-State Blocking Coverage",
  "ON-State Non-Blocking Coverage",
  "Helper Chain Error / Fail-Open Coverage",
  "Structured User-Fact Limitation Coverage",
  "Source Card / Authority Preservation Coverage",
  "Frontend Deferred Coverage",
  "Phase 10 Deferred Coverage",
  "ResponseType Taxonomy Coverage",
  "No-Live-Implementation Confirmation",
  "Test Coverage",
  "Validation Commands Run",
  "Validation Results",
  "Known Untracked / Deferred Files Status",
  "Gate Decision",
  "Residual Risks",
  "Recommended Next Task",
  "Gemini Review 17 Requirement",
  "Final Recommendation"
];

const PROHIBITED_IMPORT_PATTERNS = [
  /routes\/ask-route\.js|routes\\ask-route\.js/i,
  /routes\/tax-route\.js|routes\\tax-route\.js/i,
  /routes\/audit-route\.js|routes\\audit-route\.js/i,
  /ask-handler\.js/i,
  /pipeline\.js/i,
  /context-orchestration-engine\.js/i,
  /adaptive-tina-master-prompt\.js/i,
  /tax-mode-prompt\.js/i,
  /audit-mode-prompt\.js/i,
  /answer-renderer\.js/i
];

const PROTECTED_DIFF_PATTERNS = [
  /^ask-handler\.js$/,
  /^context-orchestration-engine\.js$/,
  /^answer-renderer\.js$/,
  /^routes\//,
  /^prompts\//,
  /^adaptive-tina-master-prompt\.js$/,
  /helper\.js$/,
  /^package(?:-lock)?\.json$/,
  /^retrieval/i,
  /^reranker/i,
  /^source-card/i,
  /^sourceAvailability/i,
  /^vector/i,
  /^reindex/i,
  /^drive-reader\.js$/,
  /^evaluation\/factcheck\//,
  /^tests\/TINA_Adversarial_Test_Set_PH_Tax\.md$/,
  /^tests\/TINA_Tax_FactCheck_Answer_Key_v2\.md$/,
  /^HAL-TEST\.xlsx$/i
];

const ALLOWED_DIFF_FILES = new Set([
  "evaluation/fixtures/phase-7b-clarification-live-wiring-scaffold-1-contract.fixture.json",
  "tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs",
  "PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1_LIVE_CLARIFICATION_WIRING_FIXTURE_AND_TESTS.md",
  "pipeline.js",
  "tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs",
  "tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs",
  "tests/patch-07b-clarification-final-gate-1-track-closure.test.mjs",
  "tests/patch-07b-audit-risk-final-gate-1-workstream-final-gate.test.mjs",
  "tests/patch-07b-final-gate-1-analytical-adversarial-final-gate.test.mjs",
  "PATCH-07B-CLARIFICATION-LIVE-WIRING-1_NARROW_LIVE_CLARIFICATION_ROUTE_WIRING.md",
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

function readText(path) {
  return readFileSync(path, "utf8");
}

function loadFixture() {
  return JSON.parse(readText(FIXTURE_PATH));
}

function caseById(fixture, caseId) {
  const item = fixture.cases.find((testCase) => testCase.caseId === caseId);
  assert(item, `missing fixture case ${caseId}`);
  return item;
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) assert(actual.includes(item), `${label} missing ${item}`);
}

function assertTextIncludesAll(text, expected, label) {
  for (const item of expected) assert(text.includes(item), `${label} missing ${item}`);
}

function affirmativeLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !/\b(?:no|not|without|defer|deferred|remain deferred|future|later|required after|before implementation|fixture-only|scaffold only|must not|do not|not implemented)\b/i.test(line))
    .join("\n");
}

function gitDiffNames() {
  const result = spawnSync("git", ["diff", "--name-only"], { cwd: resolve("."), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function assertAuthorizedLiveWiringPipeline() {
  const source = readText(resolve("pipeline.js"));
  assert(source.includes("TINA_ENABLE_CLARIFICATION_ROUTE_GATE"));
  assert(source.includes("Step 12.6: Live clarification route gate"));
  assert(source.includes("evaluateClarificationRouteGate"));
  assert(source.includes("buildClarificationRouteDecision"));
  assert(source.includes("isClarificationRouteGateEnabled"));
  assert.match(source, /if \(!isClarificationRouteGateEnabled\(env\)\)[\s\S]*enabled:\s*false/);
  assert.match(source, /responseType:\s*"clarification"/);
  assert.match(source, /structuredClarificationObject:\s*null/);
  assert.match(source, /CLARIFICATION_ROUTE_GATE_FAIL_OPEN/);
  assert.doesNotMatch(source, /routes\/|routes\\/i);
}

await test("fixture metadata correctness", () => {
  const fixture = loadFixture();
  assert.equal(fixture.patch, "PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1");
  assert.equal(fixture.implementationScope, "LIVE_WIRING_FIXTURE_ONLY");
  assert.equal(fixture.runtimeImplemented, false);
  assert.equal(fixture.pipelineImplemented, false);
  assert.equal(fixture.promptIntegrationImplemented, false);
  assert.equal(fixture.responseGenerationImplemented, false);
  assert.equal(fixture.frontendImplemented, false);
  assert.equal(fixture.productionOrchestratorImplemented, false);
  assert.equal(fixture.phase10Implemented, false);
  assert.equal(fixture.approvedDesignPatch, "PATCH-07B-CLARIFICATION-LIVE-DESIGN-1");
  assert.equal(fixture.approvedReview, "PATCH-07B-GEMINI-REVIEW-16");
  assert(fixture.correctedPatchNameReason);
});

await test("insertion point contract is exact", () => {
  const { insertionPoint } = loadFixture();
  assert.equal(insertionPoint.file, "pipeline.js");
  assert.equal(insertionPoint.function, "runPipeline");
  assert.equal(insertionPoint.newStep, "12.6");
  assert.equal(insertionPoint.after, "Step 12.5");
  assert.equal(insertionPoint.before, "Step 13 buildAdaptivePromptContract");
  assert.equal(insertionPoint.afterSourceAvailabilityStep, "Step 6.5");
  assert.equal(insertionPoint.beforeOpenAIGenerationStep, "Step 14");
  assert.equal(insertionPoint.mustRunBeforePromptConstruction, true);
  assert.equal(insertionPoint.mustRunBeforeOpenAIGeneration, true);
});

await test("feature flag contract is OFF by default and strict", () => {
  const { featureFlag } = loadFixture();
  assert.equal(featureFlag.name, "TINA_ENABLE_CLARIFICATION_ROUTE_GATE");
  assert.equal(featureFlag.default, "OFF");
  assert.equal(featureFlag.missingValue, "OFF");
  assert.equal(featureFlag.invalidValue, "OFF");
  assert.equal(featureFlag.offStateByteIdenticalRequired, true);
  assert.equal(featureFlag.offStateMustNotInvokeHelperChain, true);
  assert.equal(featureFlag.offStateMustNotAddResponseType, true);
  assert.equal(featureFlag.offStateMustNotAddStructuredClarificationObject, true);
  assertIncludesAll(featureFlag.truthyValuesAllowed, ["1", "true", "TRUE", "on", "ON", "yes", "YES"], "truthyValuesAllowed");
});

await test("OFF-state baseline cases do not invoke route chain or add response fields", () => {
  const fixture = loadFixture();
  for (const caseId of FLAG_OFF_CASES) {
    const expected = caseById(fixture, caseId).expected;
    assert.equal(expected.helperChainInvoked, false, caseId);
    assert.equal(expected.buildClarificationRouteDecisionInvoked, false, caseId);
    assert.equal(expected.responseTypeAdded, false, caseId);
    assert.equal(expected.structuredClarificationObjectAdded, false, caseId);
    assert.equal(expected.earlyExit, false, caseId);
    assert.equal(expected.promptConstructionProceeds, true, caseId);
    assert.equal(expected.openAIFullAnswerCallProceeds, true, caseId);
  }
});

await test("ON-state blocking cases require clarification-only early exit", () => {
  const fixture = loadFixture();
  for (const caseId of FLAG_ON_BLOCKING_CASES) {
    const expected = caseById(fixture, caseId).expected;
    assert.equal(expected.helperChainInvoked, true, caseId);
    assert.equal(expected.buildClarificationRouteDecisionInvoked, true, caseId);
    assert.equal(expected.answerAllowed, false, caseId);
    assert.equal(expected.responseType, "clarification", caseId);
    assert.equal(expected.skipPromptConstruction, true, caseId);
    assert.equal(expected.skipOpenAIFullAnswerCall, true, caseId);
    assert.equal(expected.returnClarificationOnly, true, caseId);
  }
});

await test("non-blocking source limitation preserves answer path and does not outsource law search", () => {
  const expected = caseById(loadFixture(), "FLAG_ON_NONBLOCKING_SOURCE_LIMITATION").expected;
  assert.equal(expected.answerAllowed, true);
  assert.equal(expected.responseType, "source_limited_orientation");
  assert.equal(expected.skipPromptConstruction, false);
  assert.equal(expected.skipOpenAIFullAnswerCall, false);
  assert.equal(expected.structuredClarificationObjectPassedToPromptConstraints, true);
  assert.equal(expected.sourceLimitationPreserved, true);
  assert.equal(expected.noUserInstructionToFindOrSearchLaw, true);
});

await test("non-blocking Phase 10 deferral preserves answer path without Phase 10 execution", () => {
  const fixture = loadFixture();
  const expected = caseById(fixture, "FLAG_ON_NONBLOCKING_PHASE10_DEFERRAL").expected;
  assert.equal(expected.answerAllowed, true);
  assert.equal(expected.responseType, "phase10_deferred_orientation");
  assert.equal(expected.skipPromptConstruction, false);
  assert.equal(expected.skipOpenAIFullAnswerCall, false);
  assert.equal(expected.structuredClarificationObjectPassedToPromptConstraints, true);
  assert.equal(expected.phase10DeferralPreserved, true);
  assert.equal(expected.phase10LogicExecuted, false);
  assert.equal(fixture.phase10Implemented, false);
});

await test("document request, cautious follow-up, and no-clarification cases continue generation", () => {
  const fixture = loadFixture();
  const documents = caseById(fixture, "FLAG_ON_REQUEST_DOCUMENTS").expected;
  assert.equal(documents.responseType, "document_request_with_cautious_answer");
  assert.equal(documents.promptConstructionProceeds, true);
  assert.equal(documents.openAIFullAnswerCallProceeds, true);
  assert.equal(documents.documentRequestsPreserved, true);
  assert.equal(documents.noLegalConclusionFromMissingDocuments, true);

  const followup = caseById(fixture, "FLAG_ON_CAUTIOUS_FOLLOWUP").expected;
  assert.equal(followup.responseType, "answer_with_followup");
  assert.equal(followup.promptConstructionProceeds, true);
  assert.equal(followup.openAIFullAnswerCallProceeds, true);
  assert.equal(followup.questionsCappedTo, 3);

  const answer = caseById(fixture, "FLAG_ON_NO_CLARIFICATION_NEEDED").expected;
  assert.equal(answer.responseType, "answer");
  assert.equal(answer.promptConstructionProceeds, true);
  assert.equal(answer.openAIFullAnswerCallProceeds, true);
  assert.equal(answer.normalAnswerPathConstrainedOnlyByExistingGates, true);
});

await test("helper-chain error contract is fail-open", () => {
  const expected = caseById(loadFixture(), "FLAG_ON_HELPER_CHAIN_ERROR_FAIL_OPEN").expected;
  assert.equal(expected.helperChainThrows, true);
  assert.equal(expected.failOpen, true);
  assert.equal(expected.promptConstructionProceeds, true);
  assert.equal(expected.openAIFullAnswerCallProceeds, true);
  assert.equal(expected.noStackTraceExposed, true);
  assert.equal(expected.noFabricatedClarificationResult, true);
});

await test("no structured fact extraction contract biases toward clarification", () => {
  const expected = caseById(loadFixture(), "NO_STRUCTURED_FACT_EXTRACTION").expected;
  assert.equal(expected.structuredUserFactExtractionAvailable, false);
  assert.equal(expected.helperChainMustNotInventFacts, true);
  assert.equal(expected.biasTowardClarificationWhenFactsMissing, true);
});

await test("source-card and authority preservation contract is explicit", () => {
  const expected = caseById(loadFixture(), "SOURCE_CARD_AUTHORITY_PRESERVATION").expected;
  assert.equal(expected.sourceCardsPreserved, true);
  assert.equal(expected.authorityGateNotBypassed, true);
  assert.equal(expected.sourceAvailabilityNotBypassed, true);
});

await test("frontend remains deferred", () => {
  const expected = caseById(loadFixture(), "FRONTEND_DEFERRED").expected;
  assert.equal(expected.frontendImplemented, false);
  assert.equal(expected.frontendChangeRequiredForFlagOff, false);
  assert.equal(expected.frontendImpactDeferred, true);
});

await test("Phase 10 remains deferred", () => {
  const expected = caseById(loadFixture(), "PHASE10_DEFERRED").expected;
  assert.equal(expected.phase10Implemented, false);
  assert.equal(expected.HALTrapQuestionsImplemented, false);
  assert.equal(expected.courtCaseMetadataImplemented, false);
  assert.equal(expected.noGRLookup, true);
});

await test("response type taxonomy contains all required values", () => {
  assertIncludesAll(loadFixture().responseTypes, REQUIRED_RESPONSE_TYPES, "responseTypes");
});

await test("report and CURRENT_STATE continuity markers are present when updated", () => {
  assert(existsSync(REPORT_PATH), "missing scaffold report");
  const report = readText(REPORT_PATH);
  for (const section of REPORT_SECTIONS) {
    assert(new RegExp(`##\\s+\\d+\\.\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(report), `missing report section ${section}`);
  }
  assertTextIncludesAll(report, [
    "PATCH-07B-GEMINI-REVIEW-16",
    "PASS WITH STRICT RECOMMENDATIONS",
    "PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1",
    "no live wiring implemented",
    "PATCH-07B-CLARIFICATION-LIVE-WIRING-1",
    "Gemini Review 17 required after live wiring"
  ], "report continuity");

  const currentState = readText(CURRENT_STATE_PATH);
  if (currentState.includes("PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1")) {
    assertTextIncludesAll(currentState, [
      "PATCH-07B-GEMINI-REVIEW-16",
      "PASS WITH STRICT RECOMMENDATIONS",
      "PATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1",
      "no live wiring implemented",
      "PATCH-07B-CLARIFICATION-LIVE-WIRING-1",
      "Gemini Review 17 required after live wiring"
    ], "CURRENT_STATE continuity");
  }
});

await test("static no-live-import guard for scaffold test source", () => {
  const source = readText(TEST_PATH);
  const importStatements = source.match(/^\s*import\s+.+$/gm) || [];
  const importText = importStatements.join("\n");
  for (const pattern of PROHIBITED_IMPORT_PATTERNS) assert.doesNotMatch(importText, pattern);
});

await test("no phase leakage is marked implemented in fixture report or current state", () => {
  const texts = [readText(FIXTURE_PATH)];
  if (existsSync(REPORT_PATH)) texts.push(readText(REPORT_PATH));
  if (existsSync(CURRENT_STATE_PATH)) texts.push(readText(CURRENT_STATE_PATH));
  const affirmative = affirmativeLines(texts.join("\n"));
  for (const pattern of [
    /Phase 8 memory .*implemented/i,
    /Phase 9 workflow.*implemented/i,
    /Phase 10 hallucination trap tests .*implemented/i,
    /Phase 10 court case metadata .*implemented/i,
    /court-case metadata .*implemented/i,
    /G\.R\. number lookup .*implemented/i,
    /Phase 11 observability .*implemented/i,
    /Phase 12 document advisory .*implemented/i
  ]) {
    assert.doesNotMatch(affirmative, pattern);
  }
});

await test("current patch diff allows only authorized flagged live wiring and deferred surfaces remain protected", () => {
  const changed = gitDiffNames();
  for (const name of changed) {
    assert(ALLOWED_DIFF_FILES.has(name), `unexpected changed file: ${name}`);
    assert(!PROTECTED_DIFF_PATTERNS.some((pattern) => pattern.test(name)), `protected file changed: ${name}`);
  }
  if (changed.includes("pipeline.js")) assertAuthorizedLiveWiringPipeline();
});

console.log(`\nPATCH-07B-CLARIFICATION-LIVE-WIRING-SCAFFOLD-1 contract fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
