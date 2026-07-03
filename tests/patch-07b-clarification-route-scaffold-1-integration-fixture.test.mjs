/**
 * PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 - route/prompt integration fixture tests
 *
 * Run: node tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json");

const REQUIRED_RESPONSE_TYPES = [
  "clarification",
  "answer_with_followup",
  "document_request_with_cautious_answer",
  "source_limited_orientation",
  "phase10_deferred_orientation",
  "answer"
];

const REQUIRED_CONTRACT_FIELDS = [
  "mode",
  "userQuery",
  "sourceAvailabilityState",
  "authorityState",
  "sourceCoverageNeeds",
  "sourceCards",
  "retrievalContext",
  "knownFacts",
  "helperOutputs"
];

const REQUIRED_HELPER_OUTPUTS = [
  "issueFrameResult",
  "safetyPolicyResult",
  "factGapResult",
  "clientFactChecklistResult",
  "authorityApplicabilityResult",
  "adversarialContentSafetyResult",
  "birTaxpayerPositionResult",
  "qualitativeAuditRiskResult",
  "clarificationResult"
];

const REQUIRED_PROMPT_CONSTRAINT_FIELDS = [
  "prohibitedConclusions",
  "allowedAnswerPosture",
  "sourceCoverageLimitations",
  "phase10Deferrals",
  "questions",
  "documentRequests",
  "canReachFinalConclusion"
];

const REQUIRED_STOP_CONDITIONS = [
  "generation-blocking cannot be proven",
  "feature-flag OFF not byte-identical",
  "sourceAvailability unavailable",
  "source limitation wording lost",
  "Phase 7A formatting bypassed",
  "frontend cannot safely display clarification response"
];

const REQUIRED_DEFERRED_ITEMS = [
  "Phase 8 memory",
  "Phase 9 workflows",
  "Phase 10 source governance/acquisition",
  "Phase 10 Tax Accuracy QA execution",
  "Phase 11 observability",
  "Phase 12 document advisory",
  "settlement/protest runtime",
  "CTA strategy runtime",
  "authority conflict/hierarchy/supersession runtime"
];

const PROHIBITED_EXPECTED_PATTERNS = [
  /\bassessment is void\b/i,
  /\bBIR has no case\b/i,
  /\btaxpayer will win\b/i,
  /\bBIR will win\b/i,
  /\bguaranteed\b/i,
  /\bsettlement recommendation\b/i,
  /\bprotest strategy\b/i,
  /\bCTA strategy\b/i,
  /\blitigation strategy\b/i,
  /\bwhat law applies\b/i,
  /\bplease find the regulation\b/i,
  /\bsearch the BIR website\b/i,
  /\bdetermine the governing authority\b/i
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
  "evaluation/fixtures/phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json",
  "tests/patch-07b-clarification-route-scaffold-1-integration-fixture.test.mjs",
  "PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1_ROUTE_PROMPT_INTEGRATION_FIXTURE_AND_TESTS.md",
  "pipeline.js",
  "tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs",
  "tests/patch-07b-clarification-live-wiring-scaffold-1-contract-fixture.test.mjs",
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

function loadFixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) assert(actual.includes(item), `${label} missing ${item}`);
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

function casesByMode(fixture, mode) {
  return fixture.cases.filter((testCase) => testCase.mode === mode);
}

function expectedText(testCase) {
  return collectStrings({
    expectedIntegration: testCase.expectedIntegration,
    expectedPromptConstraints: testCase.expectedPromptConstraints
  }).join("\n");
}

function gitDiffNames() {
  const result = spawnSync("git", ["diff", "--name-only"], { cwd: resolve("."), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function assertAuthorizedLiveWiringPipeline() {
  const source = readFileSync(resolve("pipeline.js"), "utf8");
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

await test("fixture loads and has correct top-level metadata", () => {
  const fixture = loadFixture();
  assert.equal(fixture.patch, "PATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1");
  assert.equal(fixture.implementationScope, "CLARIFICATION_ROUTE_PROMPT_INTEGRATION_FIXTURE_ONLY");
  assert.equal(fixture.runtimeRouteIntegrationImplemented, false);
  assert.equal(fixture.promptIntegrationImplemented, false);
  assert.equal(fixture.responseGenerationImplemented, false);
  assert.equal(fixture.productionOrchestratorImplemented, false);
  assert.equal(fixture.frontendImplemented, false);
  assert.equal(fixture.featureFlagDefault, "OFF");
  assert.equal(fixture.featureFlagOffBehavior, "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED");
});

await test("future insertion point is encoded before prompt and generation", () => {
  const { futureInsertionPoint } = loadFixture();
  assert.equal(futureInsertionPoint.location, "runPipeline");
  assert.match(futureInsertionPoint.after, /Step 6\.5/);
  assert.match(futureInsertionPoint.before, /Step 13/);
  assert.match(futureInsertionPoint.before, /Step 14/);
  assert.equal(futureInsertionPoint.mustNotRunAfterGeneration, true);
  assert.equal(futureInsertionPoint.mustNotRunAfterPipelineReturns, true);
});

await test("future answer blocking rule is encoded", () => {
  const { answerBlockingRule } = loadFixture();
  assert.equal(answerBlockingRule.hardBlockingTrigger, "answerAllowed === false");
  assert.equal(answerBlockingRule.whenBlocked.buildFullAnswerPrompt, false);
  assert.equal(answerBlockingRule.whenBlocked.callOpenAIForFullAnswer, false);
  assert.equal(answerBlockingRule.whenBlocked.returnResponseType, "clarification");
  assertIncludesAll(answerBlockingRule.nonBlockingConstraintDecisions, [
    "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
    "REQUEST_DOCUMENTS",
    "DISCLOSE_SOURCE_LIMITATION",
    "DISCLOSE_PHASE10_DEFERRAL",
    "ANSWER_NOW_NO_CLARIFICATION_NEEDED"
  ], "non-blocking decisions");
});

await test("required response types exist", () => {
  const fixture = loadFixture();
  assertIncludesAll(fixture.responseTypes, REQUIRED_RESPONSE_TYPES, "responseTypes");
});

await test("future object contract includes required helper output slots and compact retrieval metadata", () => {
  const contract = loadFixture().futureObjectContract;
  assertIncludesAll(Object.keys(contract), REQUIRED_CONTRACT_FIELDS, "future object contract");
  assertIncludesAll(Object.keys(contract.helperOutputs), REQUIRED_HELPER_OUTPUTS, "helperOutputs");
  assert.equal(contract.retrievalContext.metadataOnly, true);
  assert.equal(contract.retrievalContext.rawFullDocumentInjectionAllowed, false);
  assert(Array.isArray(contract.sourceCards));
  assert(Array.isArray(contract.sourceCoverageNeeds));
});

await test("fixture includes at least 16 route/prompt integration cases", () => {
  assert(loadFixture().cases.length >= 16, "fixture must include at least 16 cases");
});

await test("answerAllowed false cases block full prompt construction and answer generation", () => {
  const blockingCases = loadFixture().cases.filter((testCase) => testCase.answerAllowed === false);
  assert(blockingCases.length >= 4, "must include multiple blocking cases");
  for (const testCase of blockingCases) {
    assert.equal(testCase.expectedIntegration.shouldBuildFullAnswerPrompt, false, `${testCase.caseId} prompt build`);
    assert.equal(testCase.expectedIntegration.shouldCallOpenAIForFullAnswer, false, `${testCase.caseId} OpenAI call`);
    assert.equal(testCase.expectedIntegration.responseType, "clarification", `${testCase.caseId} responseType`);
  }
});

await test("non-blocking cases allow full answer prompt and generation where appropriate", () => {
  const fixture = loadFixture();
  const generatedTypes = [
    "answer_with_followup",
    "document_request_with_cautious_answer",
    "source_limited_orientation",
    "phase10_deferred_orientation",
    "answer"
  ];
  for (const testCase of fixture.cases.filter((item) => item.answerAllowed === true && generatedTypes.includes(item.expectedIntegration.responseType))) {
    assert.equal(testCase.expectedIntegration.shouldBuildFullAnswerPrompt, true, `${testCase.caseId} prompt build`);
    assert.equal(testCase.expectedIntegration.shouldCallOpenAIForFullAnswer, true, `${testCase.caseId} OpenAI call`);
    assert(fixture.responseTypes.includes(testCase.expectedIntegration.responseType), `${testCase.caseId} response type`);
  }
});

await test("/ask cases preserve question caps and conversational clarification expectations", () => {
  const askCases = casesByMode(loadFixture(), "/ask");
  assert(askCases.length >= 3);
  for (const testCase of askCases) {
    const questions = testCase.expectedIntegration.clarificationQuestions || [];
    assert(questions.length <= 3, `${testCase.caseId} exceeds /ask cap`);
  }
  assert.match(expectedText(caseById(loadFixture(), "ask-blocking-clarification")), /conversational clarification/i);
});

await test("/tax cases expect senior memo clarification and no final tax opinion", () => {
  const fixture = loadFixture();
  assert(casesByMode(fixture, "/tax").length >= 5);
  assert.match(expectedText(caseById(fixture, "tax-blocking-clarification")), /senior-memo clarification structure/i);
  for (const testCase of casesByMode(fixture, "/tax")) {
    assert(!/\btaxpayer will win|BIR will win|guaranteed\b/i.test(expectedText(testCase)), testCase.caseId);
  }
});

await test("/audit cases expect procedural-first clarification and no strategy runtime", () => {
  const fixture = loadFixture();
  const blocking = caseById(fixture, "audit-blocking-procedural-clarification");
  assert.equal(blocking.expectedIntegration.proceduralFirstClarification, true);
  assert.match(blocking.expectedIntegration.clarificationQuestions[0], /assessment stage/i);
  for (const testCase of casesByMode(fixture, "/audit")) {
    assert(!/\bsettlement recommendation|protest strategy|CTA strategy\b/i.test(expectedText(testCase)), testCase.caseId);
  }
});

await test("source limitation cases preserve wording and do not outsource legal-source questions", () => {
  const fixture = loadFixture();
  for (const caseId of ["ask-source-limited-orientation", "audit-source-limited-orientation"]) {
    const testCase = caseById(fixture, caseId);
    assert.equal(testCase.expectedIntegration.sourceLimitationWordingPreserved, true);
    assert(!/\bwhat law applies|please find the regulation|search the BIR website|determine the governing authority\b/i.test(expectedText(testCase)));
  }
});

await test("Phase 10 deferral cases preserve deferral wording and do not outsource metadata review", () => {
  const testCase = caseById(loadFixture(), "tax-phase10-deferred-orientation");
  assert.equal(testCase.expectedIntegration.phase10DeferralWordingPreserved, true);
  assert.equal(testCase.expectedIntegration.noUserSourceStatusQuestion, true);
  assert(!/\bis this still current|has this been superseded|which authority controls|verify official source metadata\b/i.test(expectedText(testCase)));
});

await test("prompt constraint object case requires structured object and required fields", () => {
  const fixture = loadFixture();
  const testCase = caseById(fixture, "prompt-constraint-object");
  assert.equal(testCase.expectedIntegration.structuredClarificationObjectPassedToPrompt, true);
  assert.equal(testCase.expectedIntegration.rawStringOnlyPromptInjectionProhibited, true);
  assertIncludesAll(Object.keys(testCase.expectedPromptConstraints), REQUIRED_PROMPT_CONSTRAINT_FIELDS, "prompt constraint object");
  assertIncludesAll(fixture.requiredPromptConstraintFields, REQUIRED_PROMPT_CONSTRAINT_FIELDS, "top-level prompt fields");
});

await test("Phase 7A preservation case protects mode formatting, source cards, and terminal gate", () => {
  const fixture = loadFixture();
  const testCase = caseById(fixture, "phase7a-preservation");
  assert.equal(testCase.expectedIntegration.askConversationalFormattingPreserved, true);
  assert.equal(testCase.expectedIntegration.taxSeniorMemoFormattingPreserved, true);
  assert.equal(testCase.expectedIntegration.auditAdvisoryFormattingPreserved, true);
  assert.equal(testCase.expectedIntegration.sourceCardsPreserved, true);
  assert.equal(testCase.expectedIntegration.applyVerifiedAuthorityGateRemainsTerminalGate, true);
  assertIncludesAll(fixture.phase7aPreservationRequirements, [
    "/ask conversational formatting preserved",
    "/tax senior memo formatting preserved",
    "/audit advisory formatting preserved",
    "source cards preserved",
    "applyVerifiedAuthorityGate remains terminal gate"
  ], "Phase 7A preservation requirements");
});

await test("feature flag cases preserve OFF baseline and constrain future ON behavior", () => {
  const fixture = loadFixture();
  const off = caseById(fixture, "feature-flag-off-baseline");
  const on = caseById(fixture, "feature-flag-on-future-branch");
  assert.equal(off.featureFlagState, "OFF");
  assert.equal(off.expectedIntegration.featureFlagOffBehavior, "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED");
  assert.equal(off.expectedIntegration.routePromptResponseBehaviorUnchangedWhenOff, true);
  assert.equal(off.expectedIntegration.phase7bLiveClarificationBranchActive, false);
  assert.equal(on.featureFlagState, "ON");
  assert.equal(on.expectedIntegration.clarificationBranchMayRunOnlyWhenFlagOn, true);
  assert.match(on.expectedIntegration.insertionPoint, /Step 6\.5/);
  assert.match(on.expectedIntegration.insertionPoint, /Step 13\/14/);
});

await test("frontend contract case anticipates responseType but keeps frontend deferred", () => {
  const testCase = caseById(loadFixture(), "frontend-contract-anticipation");
  assert.equal(testCase.expectedIntegration.responseTypeAnticipated, true);
  assert.equal(testCase.expectedIntegration.responseType, "clarification");
  assert.equal(testCase.expectedIntegration.frontendImplemented, false);
  assert.equal(testCase.expectedIntegration.frontendImplicationsDeferredToLaterDesignGate, true);
});

await test("stop conditions and deferred items are explicitly listed", () => {
  const fixture = loadFixture();
  assertIncludesAll(fixture.stopConditions, REQUIRED_STOP_CONDITIONS, "stop conditions");
  assertIncludesAll(caseById(fixture, "stop-conditions").expectedIntegration.stopConditionsRequired, REQUIRED_STOP_CONDITIONS, "case stop conditions");
  assertIncludesAll(fixture.deferredItems, REQUIRED_DEFERRED_ITEMS, "deferred items");
});

await test("fixture confirms no route, prompt, response generation, pipeline, or orchestrator implementation", () => {
  const fixture = loadFixture();
  const testCase = caseById(fixture, "no-live-implementation");
  assert.equal(fixture.runtimeRouteIntegrationImplemented, false);
  assert.equal(fixture.promptIntegrationImplemented, false);
  assert.equal(fixture.responseGenerationImplemented, false);
  assert.equal(fixture.productionOrchestratorImplemented, false);
  assert.equal(testCase.expectedIntegration.routeControllerChanges, false);
  assert.equal(testCase.expectedIntegration.promptChanges, false);
  assert.equal(testCase.expectedIntegration.responseGenerationChanges, false);
  assert.equal(testCase.expectedIntegration.pipelineBehaviorChanges, false);
  assert.equal(testCase.expectedIntegration.productionOrchestratorChanges, false);
});

await test("expected integration outputs contain no prohibited conclusion, strategy, or source-outsourcing text", () => {
  const fixture = loadFixture();
  for (const testCase of fixture.cases) {
    const text = expectedText(testCase);
    for (const pattern of PROHIBITED_EXPECTED_PATTERNS) {
      assert(!pattern.test(text), `${testCase.caseId} contains prohibited expected text ${pattern}`);
    }
  }
});

await test("current patch diff allows only authorized flagged live wiring and deferred files remain protected", () => {
  const changed = gitDiffNames();
  for (const name of changed) {
    assert(ALLOWED_DIFF_FILES.has(name), `unexpected changed file: ${name}`);
    assert(!PROTECTED_DIFF_PATTERNS.some((pattern) => pattern.test(name)), `protected file changed: ${name}`);
  }
  if (changed.includes("pipeline.js")) assertAuthorizedLiveWiringPipeline();
});

console.log(`\nPATCH-07B-CLARIFICATION-ROUTE-SCAFFOLD-1 integration fixture tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
