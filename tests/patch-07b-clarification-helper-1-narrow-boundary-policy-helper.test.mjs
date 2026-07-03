/**
 * PATCH-07B-CLARIFICATION-HELPER-1 - narrow clarification boundary policy helper tests
 *
 * Run: node tests/patch-07b-clarification-helper-1-narrow-boundary-policy-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as clarificationPolicy from "../clarification-boundary-policy.js";
import { assertAdversarialSafety } from "../adversarial-content-safety-policy.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-scaffold-1-decision-policy.fixture.json");

const REQUIRED_FIELDS = [
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

const PROHIBITED_PATTERNS = [
  /\bfinal legal conclusion\b/i,
  /\bfinal tax opinion\b/i,
  /\bfinal audit-defense conclusion\b/i,
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\btaxpayer will win\b/i,
  /\bBIR will win\b/i,
  /\bguaranteed\b/i,
  /\bsettle now\b/i,
  /\bsettlement recommendation\b/i,
  /\bprotest strategy\b/i,
  /\bCTA strategy\b/i,
  /\bcompromise amount\b/i,
  /\blitigation strategy\b/i,
  /\bwhat law applies\b/i,
  /\bplease find the regulation\b/i,
  /\bsearch the BIR website\b/i,
  /\bdetermine the governing authority\b/i,
  /\bis this still current\b/i,
  /\bhas this been superseded\b/i,
  /\bwhich authority controls\b/i,
  /\bfind the newer regulation\b/i,
  /\bcheck case status\b/i,
  /\bverify official source metadata\b/i,
  /\bplease prove this qualifies as zero-rated\b/i,
  /\bplease confirm this is legally deductible\b/i,
  /\bplease confirm the assessment is void\b/i
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

function runCase(testCase) {
  return clarificationPolicy.assessClarificationNeed({
    mode: testCase.mode,
    scenario: testCase.scenario,
    ...testCase.inputSignals
  });
}

function assertOutputShape(output) {
  for (const field of REQUIRED_FIELDS) assert(Object.hasOwn(output, field), `missing ${field}`);
  assert(APPROVED_DECISIONS.includes(output.clarificationDecision), `unsupported decision ${output.clarificationDecision}`);
  assert(APPROVED_POSTURES.includes(output.allowedAnswerPosture), `unsupported posture ${output.allowedAnswerPosture}`);
  assert.equal(output.canReachFinalConclusion, false);
  assert.equal(output.implementationScope, "CLARIFICATION_BOUNDARY_POLICY_ONLY");
  assert(Array.isArray(output.questions), "questions must be array");
  assert(Array.isArray(output.documentRequests), "documentRequests must be array");
  assert(Array.isArray(output.sourceCoverageLimitations), "sourceCoverageLimitations must be array");
  assert(Array.isArray(output.phase10Deferrals), "phase10Deferrals must be array");
  assert(Array.isArray(output.prohibitedConclusions), "prohibitedConclusions must be array");
}

function serialized(output) {
  return JSON.stringify(output);
}

function proceduralIndex(question) {
  return /stage|notice|deadline|LOA|PAN|FAN|FDDA|date|period|year/i.test(question) ? 0 : 1;
}

await test("export shape is narrow and prompt builder is absent", () => {
  assert.equal(typeof clarificationPolicy.assessClarificationNeed, "function");
  assert.equal(typeof clarificationPolicy.buildClarificationChecklist, "function");
  assert.equal(Object.hasOwn(clarificationPolicy, "buildClarificationPrompt"), false);
  assert.equal(Object.hasOwn(clarificationPolicy, "createClarificationPrompt"), false);
});

await test("fixture activation matches decisions and core expected fields", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const output = runCase(testCase);
    const expected = testCase.expectedClarification;
    const phase10TakesPrecedence = (testCase.inputSignals.phase10DependencyFlags || []).length > 0;
    assertOutputShape(output);
    assert.equal(output.clarificationDecision, phase10TakesPrecedence ? "DISCLOSE_PHASE10_DEFERRAL" : expected.clarificationDecision, `${testCase.caseId} decision`);
    assert.equal(output.shouldAskBeforeAnswer, phase10TakesPrecedence ? false : expected.shouldAskBeforeAnswer, `${testCase.caseId} shouldAskBeforeAnswer`);
    assert.equal(output.answerAllowed, phase10TakesPrecedence ? true : expected.answerAllowed, `${testCase.caseId} answerAllowed`);
    assert.equal(output.allowedAnswerPosture, phase10TakesPrecedence ? "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS" : expected.allowedAnswerPosture, `${testCase.caseId} allowedAnswerPosture`);
    if (!phase10TakesPrecedence && expected.questions.length > 0) assert(output.questions.length > 0, `${testCase.caseId} expected questions`);
    if (!phase10TakesPrecedence && expected.documentRequests.length > 0) assert(output.documentRequests.length > 0, `${testCase.caseId} expected document requests`);
    if (!phase10TakesPrecedence && expected.sourceCoverageLimitations.length > 0) assert(output.sourceCoverageLimitations.length > 0, `${testCase.caseId} expected source limitations`);
    if (expected.phase10Deferrals.length > 0) assert(output.phase10Deferrals.length > 0, `${testCase.caseId} expected Phase 10 deferrals`);
  }
});

await test("mode-specific caps are enforced", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const output = runCase(testCase);
    if (testCase.mode === "/ask") assert(output.questions.length <= 3, `${testCase.caseId} exceeds /ask cap`);
    if (testCase.mode === "/tax" && output.groupedChecklist !== true) assert(output.questions.length <= 7, `${testCase.caseId} exceeds /tax cap`);
    if (testCase.mode === "/audit") assert(output.questions.length <= 10, `${testCase.caseId} exceeds /audit cap`);
  }
});

await test("/audit procedural questions are prioritized before substantive questions", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases.filter((item) => item.mode === "/audit")) {
    const output = runCase(testCase);
    let seenSubstantive = false;
    for (const question of output.questions) {
      if (proceduralIndex(question) === 1) seenSubstantive = true;
      if (seenSubstantive) continue;
      assert.equal(proceduralIndex(question), 0, `${testCase.caseId} should start with procedural questions`);
    }
  }
});

await test("NO_INDEXED_SOURCE discloses source limitation without outsourcing source coverage", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => testCase.inputSignals.authorityState === "NO_INDEXED_SOURCE");
  assert(cases.length > 0);
  for (const testCase of cases) {
    const output = runCase(testCase);
    assert.equal(output.clarificationDecision, "DISCLOSE_SOURCE_LIMITATION");
    assert(output.sourceCoverageLimitations.length > 0, `${testCase.caseId} must disclose source limitation`);
    assert(!/\bwhat law applies|please find the regulation|search the BIR website|determine the governing authority\b/i.test(serialized(output)));
  }
});

await test("Phase 10 flags disclose deferral without outsourcing status resolution", () => {
  const fixture = loadFixture();
  const cases = fixture.cases.filter((testCase) => (testCase.inputSignals.phase10DependencyFlags || []).length > 0);
  assert(cases.length > 0);
  for (const testCase of cases) {
    const output = runCase(testCase);
    assert(output.phase10Deferrals.length > 0, `${testCase.caseId} must disclose Phase 10 deferral`);
    if ((testCase.inputSignals.criticalMissingFacts || []).length === 0 && (testCase.inputSignals.missingApplicabilityFacts || []).length === 0) {
      assert.equal(output.clarificationDecision, "DISCLOSE_PHASE10_DEFERRAL", `${testCase.caseId} should use Phase 10 decision`);
    }
    assert(!/\bis this still current|has this been superseded|which authority controls|find the newer regulation|check case status|verify official source metadata\b/i.test(serialized(output)));
  }
});

await test("document requests stay factual and unsafe legal-judgment requests do not appear", () => {
  const output = clarificationPolicy.assessClarificationNeed({
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    documentGaps: [
      "Form 2307",
      "service invoice",
      "LOA/PAN/FAN/FDDA",
      "reconciliation schedule",
      "Please prove this qualifies as zero-rated.",
      "Please confirm this is legally deductible.",
      "Please confirm the assessment is void."
    ]
  });
  assert(output.documentRequests.includes("Please provide the Form 2307."));
  assert(output.documentRequests.includes("Please provide the service invoice."));
  assert(output.documentRequests.includes("Please provide the LOA/PAN/FAN/FDDA."));
  assert(output.documentRequests.includes("Please provide the reconciliation schedule."));
  assert(!/prove this qualifies as zero-rated|confirm this is legally deductible|confirm the assessment is void/i.test(serialized(output)));
});

await test("helper consumes provided upstream results without creating a new detector taxonomy", () => {
  const output = clarificationPolicy.assessClarificationNeed({
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    factGapResult: {
      implementationScope: "FACT_GAP_HELPER_ONLY",
      criticalMissingFacts: ["income type"],
      helpfulMissingFacts: [],
      documentGaps: [],
      timingOrPeriodGaps: [],
      taxpayerStatusGaps: [],
      transactionCharacterGaps: [],
      assessmentStageGaps: [],
      sourceCoverageNeeds: []
    },
    authorityApplicabilityResult: {
      implementationScope: "AUTHORITY_APPLICABILITY_HELPER_ONLY",
      missingApplicabilityFacts: ["applicability fact"],
      requiredApplicabilityFacts: ["required applicability fact"],
      sourceCoverageNeeds: [],
      phase10DependencyFlags: []
    }
  });
  assert.equal(output.clarificationDecision, "ASK_BEFORE_ANSWERING");
  assert(output.questions.some((question) => /income type|applicability/i.test(question)));
  assert(!/new detector taxonomy|detectorType|clarificationDetector/i.test(serialized(output)));
});

await test("privacy boundary excludes unnecessary sensitive identifiers", () => {
  const output = clarificationPolicy.assessClarificationNeed({
    mode: "/tax",
    authorityState: "AUTHORITY_FOUND",
    criticalMissingFacts: ["TIN", "full address", "bank account number", "taxable year", "tax type", "transaction character", "document status", "procedural stage"]
  });
  const text = serialized(output);
  assert(!/\bTIN\b/.test(text));
  assert(!/\bfull address\b/i.test(text));
  assert(!/\bbank account number\b/i.test(text));
  assert(!/\bunnecessary personal identifiers\b/i.test(text));
  assert.match(text, /taxable year|tax type|transaction character|document status|procedural stage/i);
});

await test("assessClarificationNeed and buildClarificationChecklist outputs pass adversarial safety", () => {
  const assessment = clarificationPolicy.assessClarificationNeed({
    mode: "/audit",
    authorityState: "AUTHORITY_FOUND",
    assessmentStageGaps: ["current stage", "notice date", "deadline facts"]
  });
  const checklist = clarificationPolicy.buildClarificationChecklist(assessment);
  assert.equal(assertAdversarialSafety(assessment, { mode: "/audit", authorityState: "AUTHORITY_FOUND" }).safe, true);
  assert.equal(assertAdversarialSafety(checklist, { mode: "/audit", authorityState: "AUTHORITY_FOUND" }).safe, true);
});

await test("serialized outputs contain no prohibited behavior phrases", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const output = runCase(testCase);
    const text = serialized(output);
    for (const pattern of PROHIBITED_PATTERNS) {
      assert(!pattern.test(text), `${testCase.caseId} contains prohibited phrase ${pattern}`);
    }
  }
});

await test("helper is not route, controller, or prompt integration", () => {
  const source = readFileSync(resolve("clarification-boundary-policy.js"), "utf8");
  assert(!/buildClarificationPrompt|createClarificationPrompt|liveClarificationHandler/i.test(source));
  assert(!/express\.Router|router\.|app\.|req\.|res\./i.test(source));
  assert(!/system prompt|user prompt|OpenAI|chat\.completions/i.test(source));
});

console.log(`\nPATCH-07B-CLARIFICATION-HELPER-1 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
