/**
 * PATCH-07B-CLARIFICATION-SCAFFOLD-1 - clarification decision fixture tests
 *
 * Run: node tests/patch-07b-clarification-scaffold-1-decision-fixture.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-scaffold-1-decision-policy.fixture.json");

const REQUIRED_DECISIONS = [
  "ASK_BEFORE_ANSWERING",
  "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
  "REQUEST_DOCUMENTS",
  "DISCLOSE_SOURCE_LIMITATION",
  "DISCLOSE_PHASE10_DEFERRAL",
  "ANSWER_NOW_NO_CLARIFICATION_NEEDED"
];

const REQUIRED_POSTURES = [
  "GENERAL_ORIENTATION_ONLY",
  "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
  "NO_ANSWER_UNTIL_CLARIFIED"
];

const REQUIRED_CASE_FIELDS = [
  "caseId",
  "mode",
  "scenario",
  "inputSignals",
  "expectedClarification",
  "prohibitedBehavior",
  "rationale"
];

const REQUIRED_EXPECTED_FIELDS = [
  "clarificationDecision",
  "clarificationReason",
  "shouldAskBeforeAnswer",
  "questions",
  "documentRequests",
  "sourceCoverageLimitations",
  "phase10Deferrals",
  "answerAllowed",
  "allowedAnswerPosture",
  "prohibitedConclusions",
  "canReachFinalConclusion",
  "implementationScope"
];

const FINAL_CONCLUSION_PATTERNS = [
  /\bfinal legal conclusion\b/i,
  /\bfinal tax opinion\b/i,
  /\bfinal audit-defense conclusion\b/i,
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\btaxpayer will win\b/i,
  /\bBIR will win\b/i,
  /\bguaranteed\b/i
];

const STRATEGY_PATTERNS = [
  /\bsettle now\b/i,
  /\bsettlement recommendation\b/i,
  /\bprotest strategy\b/i,
  /\bCTA strategy\b/i,
  /\bcompromise amount\b/i,
  /\blitigation strategy\b/i
];

const PHASE10_OUTSOURCING_PATTERNS = [
  /\bis this still current\b/i,
  /\bhas this been superseded\b/i,
  /\bwhich authority controls\b/i,
  /\bfind the newer regulation\b/i,
  /\bcheck case status\b/i,
  /\bverify official source metadata\b/i
];

const SOURCE_OUTSOURCING_PATTERNS = [
  /\bwhat law applies\b/i,
  /\bplease find the regulation\b/i,
  /\bsearch the BIR website\b/i,
  /\bdetermine the governing authority\b/i
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

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert(actual.includes(item), `${label} missing ${item}`);
  }
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

function caseById(fixture, caseId) {
  const item = fixture.cases.find((testCase) => testCase.caseId === caseId);
  assert(item, `missing case ${caseId}`);
  return item;
}

function expectedText(testCase) {
  return collectStrings(testCase.expectedClarification).join("\n");
}

function prohibitedText(testCase) {
  return collectStrings(testCase.prohibitedBehavior).join("\n");
}

function proceduralIndex(question) {
  return /stage|notice|deadline|LOA|PAN|FAN|FDDA|date|period/i.test(question) ? 0 : 1;
}

await test("fixture loads and has required top-level metadata", () => {
  const fixture = loadFixture();
  assert.equal(fixture.patch, "PATCH-07B-CLARIFICATION-SCAFFOLD-1");
  assert.equal(fixture.purpose, "Clarification decision fixture and tests");
  assert.equal(fixture.implementationScope, "CLARIFICATION_DECISION_FIXTURE_ONLY");
  assert.equal(fixture.runtimeImplemented, false);
  assert.equal(fixture.routeIntegrationImplemented, false);
  assert.equal(fixture.promptIntegrationImplemented, false);
  assert.equal(fixture.productionOrchestratorImplemented, false);
  assert.equal(fixture.responseGenerationChanged, false);
});

await test("required enums exist", () => {
  const fixture = loadFixture();
  assertIncludesAll(fixture.clarificationDecisionEnum, REQUIRED_DECISIONS, "clarification decision enum");
  assertIncludesAll(fixture.allowedAnswerPostureEnum, REQUIRED_POSTURES, "answer posture enum");
  assertIncludesAll(fixture.implementationScopeEnum, ["CLARIFICATION_BOUNDARY_POLICY_ONLY"], "implementation scope enum");
});

await test("every case has required scaffold fields and expected output shape", () => {
  const fixture = loadFixture();
  assert(fixture.cases.length >= 18, "fixture must include at least 18 cases");
  for (const testCase of fixture.cases) {
    for (const field of REQUIRED_CASE_FIELDS) assert(Object.hasOwn(testCase, field), `${testCase.caseId || "case"} missing ${field}`);
    for (const field of REQUIRED_EXPECTED_FIELDS) assert(Object.hasOwn(testCase.expectedClarification, field), `${testCase.caseId} expectedClarification missing ${field}`);
    assert(REQUIRED_DECISIONS.includes(testCase.expectedClarification.clarificationDecision), `${testCase.caseId} has unsupported decision`);
    assert(REQUIRED_POSTURES.includes(testCase.expectedClarification.allowedAnswerPosture), `${testCase.caseId} has unsupported posture`);
    assert.equal(testCase.expectedClarification.canReachFinalConclusion, false, `${testCase.caseId} canReachFinalConclusion must be false`);
    assert.equal(testCase.expectedClarification.implementationScope, "CLARIFICATION_BOUNDARY_POLICY_ONLY");
    assert(Array.isArray(testCase.expectedClarification.questions), `${testCase.caseId} questions must be array`);
    assert(Array.isArray(testCase.expectedClarification.documentRequests), `${testCase.caseId} documentRequests must be array`);
    assert(Array.isArray(testCase.expectedClarification.sourceCoverageLimitations), `${testCase.caseId} sourceCoverageLimitations must be array`);
    assert(Array.isArray(testCase.expectedClarification.phase10Deferrals), `${testCase.caseId} phase10Deferrals must be array`);
  }
});

await test("expected outputs contain no final conclusions, strategy, Phase 10 outsourcing, or source outsourcing", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const text = expectedText(testCase);
    for (const pattern of [...FINAL_CONCLUSION_PATTERNS, ...STRATEGY_PATTERNS, ...PHASE10_OUTSOURCING_PATTERNS, ...SOURCE_OUTSOURCING_PATTERNS]) {
      assert(!pattern.test(text), `${testCase.caseId} expected output contains prohibited text ${pattern}`);
    }
  }
});

await test("safe document request examples pass and unsafe legal-judgment requests are prohibited", () => {
  const fixture = loadFixture();
  assertIncludesAll(fixture.safeDocumentRequestExamples, [
    "Please provide the Form 2307.",
    "Please provide the service invoice.",
    "Please provide the LOA/PAN/FAN/FDDA.",
    "Please provide the reconciliation schedule."
  ], "safe document examples");
  assertIncludesAll(fixture.unsafeLegalJudgmentRequestExamples, [
    "Please prove this qualifies as zero-rated.",
    "Please confirm this is legally deductible.",
    "Please confirm the assessment is void."
  ], "unsafe document examples");
  const contrast = caseById(fixture, "document-request-safe-unsafe-contrast");
  assertIncludesAll(contrast.expectedClarification.documentRequests, fixture.safeDocumentRequestExamples, "contrast safe requests");
  assertIncludesAll(contrast.prohibitedBehavior, fixture.unsafeLegalJudgmentRequestExamples, "contrast unsafe requests");
});

await test("mode-specific question caps are enforced", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const questionCount = testCase.expectedClarification.questions.length;
    if (testCase.mode === "/ask") assert(questionCount <= 3, `${testCase.caseId} exceeds /ask cap`);
    if (testCase.mode === "/tax" && testCase.expectedClarification.groupedChecklist !== true) assert(questionCount <= 7, `${testCase.caseId} exceeds /tax cap`);
    if (testCase.mode === "/audit") assert(questionCount <= 10, `${testCase.caseId} exceeds /audit cap`);
  }
});

await test("/audit cases put procedural or deadline questions before substantive questions", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases.filter((item) => item.mode === "/audit")) {
    const questions = testCase.expectedClarification.questions;
    let seenSubstantive = false;
    for (const question of questions) {
      if (proceduralIndex(question) === 1) seenSubstantive = true;
      if (seenSubstantive) continue;
      assert.equal(proceduralIndex(question), 0, `${testCase.caseId} first audit questions must be procedural/deadline first`);
    }
  }
});

await test("NO_INDEXED_SOURCE cases disclose source limitations", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.inputSignals.authorityState === "NO_INDEXED_SOURCE");
  assert(cases.length >= 2, "must include NO_INDEXED_SOURCE coverage");
  for (const testCase of cases) {
    assert(testCase.expectedClarification.sourceCoverageLimitations.length > 0, `${testCase.caseId} needs source limitation`);
    assert.equal(testCase.expectedClarification.clarificationDecision, "DISCLOSE_SOURCE_LIMITATION");
  }
});

await test("Phase 10 cases disclose deferrals and do not ask users to resolve them", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => (testCase.inputSignals.phase10DependencyFlags || []).length > 0);
  assert(cases.length >= 3, "must include Phase 10 coverage");
  for (const testCase of cases) {
    assert(testCase.expectedClarification.phase10Deferrals.length > 0, `${testCase.caseId} needs Phase 10 deferrals`);
    for (const pattern of PHASE10_OUTSOURCING_PATTERNS) {
      assert(!pattern.test(expectedText(testCase)), `${testCase.caseId} outsources Phase 10 in expected output`);
    }
  }
});

await test("privacy/security case prohibits unnecessary identifiers", () => {
  const fixture = loadFixture();
  const privacy = caseById(fixture, "privacy-security-boundary");
  const prohibited = prohibitedText(privacy);
  assert.match(prohibited, /\bTIN\b/);
  assert.match(prohibited, /\bfull address\b/i);
  assert.match(prohibited, /\bbank account number\b/i);
  assert.match(prohibited, /\bunnecessary personal identifiers\b/i);
  assert.match(expectedText(privacy), /\btaxable year\b/i);
  assert.match(expectedText(privacy), /\btax type\b/i);
  assert.match(expectedText(privacy), /\btransaction character\b/i);
  assert.match(expectedText(privacy), /\bdocument status\b/i);
  assert.match(expectedText(privacy), /\bprocedural stage\b/i);
});

await test("future helper naming is encoded without prompt-builder naming", () => {
  const fixture = loadFixture();
  assert.equal(fixture.futureHelper.fileName, "clarification-boundary-policy.js");
  assert.equal(fixture.futureHelper.primaryFunction, "assessClarificationNeed");
  assert.equal(fixture.futureHelper.checklistFunction, "buildClarificationChecklist");
  assert(fixture.futureHelper.prohibitedFunctionNames.includes("buildClarificationPrompt"));
  assert(!collectStrings(fixture.futureHelper).some((item) => item === "buildClarificationPrompt" && fixture.futureHelper.primaryFunction === item));
});

await test("future helper is aggregator-only and creates no new detector taxonomy", () => {
  const fixture = loadFixture();
  assert.equal(fixture.futureHelper.aggregatorOnly, true);
  assert.equal(fixture.futureHelper.doesNotCreateNewDetectorTaxonomy, true);
  assertIncludesAll(fixture.futureHelper.consumesExistingHelperOutputs, [
    "criticalMissingFacts",
    "helpfulMissingFacts",
    "documentGaps",
    "sourceCoverageNeeds",
    "missingApplicabilityFacts",
    "requiredApplicabilityFacts",
    "phase10DependencyFlags",
    "auditProceduralFactsMissing"
  ], "existing helper outputs");
  const preservation = caseById(fixture, "existing-helper-output-preservation");
  assert.match(prohibitedText(preservation), /new detector taxonomy/i);
});

await test("fixture confirms no route, prompt, or live integration", () => {
  const fixture = loadFixture();
  assert.equal(fixture.routeIntegrationImplemented, false);
  assert.equal(fixture.promptIntegrationImplemented, false);
  assert.equal(fixture.productionOrchestratorImplemented, false);
  assert.equal(fixture.futureHelper.routeIntegrationImplemented, false);
  assert.equal(fixture.futureHelper.promptIntegrationImplemented, false);
  assert.equal(fixture.futureHelper.liveIntegrationImplemented, false);
});

console.log(`\nPATCH-07B-CLARIFICATION-SCAFFOLD-1 decision fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
