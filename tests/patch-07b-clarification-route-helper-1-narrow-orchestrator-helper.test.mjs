/**
 * PATCH-07B-CLARIFICATION-ROUTE-HELPER-1 - narrow route orchestrator helper tests
 *
 * Run: node tests/patch-07b-clarification-route-helper-1-narrow-orchestrator-helper.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildClarificationRouteDecision,
  normalizeClarificationResponseType,
  shouldBlockFullAnswerGeneration
} from "../clarification-route-orchestrator-helper.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json");
const RESPONSE_TYPES = new Set([
  "clarification",
  "answer_with_followup",
  "document_request_with_cautious_answer",
  "source_limited_orientation",
  "phase10_deferred_orientation",
  "answer"
]);
const STRUCTURED_FIELDS = [
  "mode",
  "decision",
  "responseType",
  "answerAllowed",
  "canReachFinalConclusion",
  "allowedAnswerPosture",
  "prohibitedConclusions",
  "sourceCoverageLimitations",
  "phase10Deferrals",
  "questions",
  "documentRequests",
  "sourceAvailabilityState",
  "authorityState",
  "sourceCoverageNeeds",
  "sourceCards",
  "retrievalContext",
  "knownFacts",
  "helperOutputsSummary"
];
const RAW_FIELDS = ["body", "content", "text", "rawText", "fullText", "excerpt", "pageText", "chunkText"];
const PROHIBITION_PATTERNS = [
  /final legal or tax conclusion/i,
  /assessment is void/i,
  /BIR has no case/i,
  /taxpayer will win/i,
  /BIR will win/i,
  /guaranteed outcome/i,
  /settlement recommendation/i,
  /protest strategy/i,
  /CTA strategy/i,
  /litigation strategy/i,
  /fake citation/i,
  /unsupported authority conclusion/i
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

function baseClarificationResult(overrides = {}) {
  return {
    clarificationDecision: "ASK_BEFORE_ANSWERING",
    answerAllowed: false,
    allowedAnswerPosture: "NO_ANSWER_UNTIL_CLARIFIED",
    canReachFinalConclusion: false,
    prohibitedConclusions: ["Do not provide a full answer until the blocking fact is supplied."],
    sourceCoverageLimitations: [],
    phase10Deferrals: [],
    questions: ["What taxpayer type is involved?"],
    documentRequests: [],
    ...overrides
  };
}

function buildInput(overrides = {}) {
  return {
    mode: "/ask",
    featureFlagEnabled: true,
    clarificationResult: baseClarificationResult(),
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityState: "AUTHORITY_FOUND",
    sourceCoverageNeeds: [],
    sourceCards: [],
    retrievalContext: {},
    knownFacts: {},
    helperOutputs: {},
    ...overrides
  };
}

function serialize(value) {
  return JSON.stringify(value);
}

function assertImplementationFlags(output) {
  assert.equal(output.liveRouteImplemented, false);
  assert.equal(output.promptIntegrationImplemented, false);
  assert.equal(output.responseGenerationImplemented, false);
  assert.equal(output.productionOrchestratorImplemented, false);
  assert.equal(output.frontendImplemented, false);
}

function assertStructuredFields(object) {
  for (const field of STRUCTURED_FIELDS) assert(Object.hasOwn(object, field), `missing ${field}`);
}

function assertNoRawFields(value) {
  const text = serialize(value);
  for (const field of RAW_FIELDS) {
    assert(!new RegExp(`"${field}"\\s*:`).test(text), `raw field leaked: ${field}`);
  }
}

function assertNoForbiddenDirectiveOutsideProhibitions(output) {
  const clone = structuredClone(output);
  if (clone.structuredClarificationObject) clone.structuredClarificationObject.prohibitedConclusions = [];
  const text = serialize(clone);
  for (const phrase of [
    "assessment is void",
    "BIR has no case",
    "taxpayer will win",
    "BIR will win",
    "guaranteed",
    "settlement recommendation",
    "protest strategy",
    "CTA strategy",
    "litigation strategy",
    "what law applies",
    "please find the regulation",
    "search the BIR website",
    "determine the governing authority"
  ]) {
    assert(!text.toLowerCase().includes(phrase.toLowerCase()), `unsafe phrase outside prohibitions: ${phrase}`);
  }
}

await test("helper exports are narrow", () => {
  assert.equal(typeof buildClarificationRouteDecision, "function");
  assert.equal(typeof normalizeClarificationResponseType, "function");
  assert.equal(typeof shouldBlockFullAnswerGeneration, "function");
});

await test("feature flag OFF encodes byte-identical future contract without structured object", () => {
  const output = buildClarificationRouteDecision(buildInput({ featureFlagEnabled: false }));
  assert.equal(output.enabled, false);
  assert.equal(output.routeBranchActive, false);
  assert.equal(output.responseType, "answer");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert.equal(output.structuredClarificationObject, null);
  assert.equal(output.featureFlagOffBehavior, "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED");
  assertImplementationFlags(output);
});

await test("feature flag ON with answerAllowed false blocks full answer generation", () => {
  const output = buildClarificationRouteDecision(buildInput());
  assert.equal(output.enabled, true);
  assert.equal(output.routeBranchActive, true);
  assert.equal(output.responseType, "clarification");
  assert.equal(output.shouldBuildFullAnswerPrompt, false);
  assert.equal(output.shouldCallOpenAIForFullAnswer, false);
  assert.equal(output.blockingTrigger, "answerAllowed === false");
  assert.equal(output.routeAction, "RETURN_CLARIFICATION_ONLY");
  assert.equal(output.answerAllowed, false);
  assert.equal(output.canReachFinalConclusion, false);
  assertImplementationFlags(output);
});

await test("shouldBlockFullAnswerGeneration only blocks flag ON and answerAllowed false", () => {
  assert.equal(shouldBlockFullAnswerGeneration(buildInput()), true);
  assert.equal(shouldBlockFullAnswerGeneration(buildInput({ featureFlagEnabled: false })), false);
  assert.equal(shouldBlockFullAnswerGeneration(buildInput({
    clarificationResult: baseClarificationResult({ answerAllowed: true })
  })), false);
});

await test("decision values map to scaffold response types", () => {
  const cases = [
    ["ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP", true, "answer_with_followup"],
    ["REQUEST_DOCUMENTS", true, "document_request_with_cautious_answer"],
    ["DISCLOSE_SOURCE_LIMITATION", true, "source_limited_orientation"],
    ["DISCLOSE_PHASE10_DEFERRAL", true, "phase10_deferred_orientation"],
    ["ANSWER_NOW_NO_CLARIFICATION_NEEDED", true, "answer"],
    ["UNKNOWN_DECISION", true, "answer_with_followup"],
    ["UNKNOWN_DECISION", false, "clarification"]
  ];
  for (const [decision, answerAllowed, expected] of cases) {
    assert.equal(normalizeClarificationResponseType({
      clarificationResult: { clarificationDecision: decision, answerAllowed }
    }), expected);
  }
});

await test("structured object contains required fields", () => {
  const output = buildClarificationRouteDecision(buildInput());
  assertStructuredFields(output.structuredClarificationObject);
});

await test("questions cap at 3, remove blanks and non-strings, and preserve order", () => {
  const output = buildClarificationRouteDecision(buildInput({
    clarificationResult: baseClarificationResult({
      answerAllowed: true,
      clarificationDecision: "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
      questions: ["First?", "", 42, "Second?", "Third?", "Fourth?"]
    })
  }));
  assert.deepEqual(output.structuredClarificationObject.questions, ["First?", "Second?", "Third?"]);
});

await test("document requests remove blanks and non-strings without inventing requests", () => {
  const output = buildClarificationRouteDecision(buildInput({
    clarificationResult: baseClarificationResult({
      answerAllowed: true,
      clarificationDecision: "REQUEST_DOCUMENTS",
      documentRequests: ["Form 2307", "", {}, "Invoice"]
    })
  }));
  assert.deepEqual(output.structuredClarificationObject.documentRequests, ["Form 2307", "Invoice"]);
});

await test("sourceCards are compact metadata only", () => {
  const output = buildClarificationRouteDecision(buildInput({
    sourceCards: [{
      id: "c1",
      title: "NIRC Sec. 57",
      sourceTitle: "NIRC",
      authorityType: "NIRC",
      normalizedReference: "NIRC Sec. 57",
      section: "57",
      url: "https://example.test",
      citation: "NIRC Sec. 57",
      authorityMatchTier: "exact",
      sourceState: "AUTHORITY_FOUND",
      body: "raw body",
      content: "raw content",
      text: "raw text",
      rawText: "raw text",
      fullText: "full text",
      excerpt: "excerpt",
      pageText: "page text",
      chunkText: "chunk text"
    }]
  }));
  const card = output.structuredClarificationObject.sourceCards[0];
  assert.equal(card.normalizedReference, "NIRC Sec. 57");
  assertNoRawFields(card);
});

await test("retrievalContext strips raw full text fields and preserves compact metadata", () => {
  const output = buildClarificationRouteDecision(buildInput({
    retrievalContext: {
      queryId: "q1",
      retrievedCount: 2,
      topAuthorityRefs: ["NIRC Sec. 57"],
      body: "raw body",
      nested: {
        content: "raw content",
        sourceState: "AUTHORITY_FOUND"
      }
    }
  }));
  assert.equal(output.structuredClarificationObject.retrievalContext.queryId, "q1");
  assert.equal(output.structuredClarificationObject.retrievalContext.nested.sourceState, "AUTHORITY_FOUND");
  assertNoRawFields(output.structuredClarificationObject.retrievalContext);
});

await test("helperOutputsSummary keeps compact labels and omits raw helper bodies", () => {
  const output = buildClarificationRouteDecision(buildInput({
    helperOutputs: {
      clarificationResult: {
        present: true,
        clarificationDecision: "REQUEST_DOCUMENTS",
        body: "long body",
        questions: ["raw question list"]
      },
      qualitativeAuditRiskResult: {
        qualitativeAuditRiskLabel: "INDETERMINATE_DUE_TO_MISSING_DOCUMENTS",
        fullText: "long text"
      }
    }
  }));
  assert.equal(output.structuredClarificationObject.helperOutputsSummary.clarificationResult.present, true);
  assert.equal(output.structuredClarificationObject.helperOutputsSummary.clarificationResult.clarificationDecision, "REQUEST_DOCUMENTS");
  assert.equal(output.structuredClarificationObject.helperOutputsSummary.qualitativeAuditRiskResult.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_MISSING_DOCUMENTS");
  assertNoRawFields(output.structuredClarificationObject.helperOutputsSummary);
  assert(!serialize(output.structuredClarificationObject.helperOutputsSummary).includes("raw question list"));
});

await test("prohibited conclusions include all required prohibitions and route action does not permit strategy", () => {
  const output = buildClarificationRouteDecision(buildInput());
  const prohibitions = output.structuredClarificationObject.prohibitedConclusions.join(" ");
  for (const pattern of PROHIBITION_PATTERNS) assert.match(prohibitions, pattern);
  assert.doesNotMatch(output.routeAction, /protest|settlement|CTA|litigation/i);
});

await test("source limitation is non-blocking unless answerAllowed is false", () => {
  const output = buildClarificationRouteDecision(buildInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "DISCLOSE_SOURCE_LIMITATION",
      answerAllowed: true,
      allowedAnswerPosture: "GENERAL_ORIENTATION_ONLY",
      sourceCoverageLimitations: ["Indexed source support is unavailable for this request."]
    })
  }));
  assert.equal(output.responseType, "source_limited_orientation");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert(output.structuredClarificationObject.sourceCoverageLimitations.includes("Indexed source support is unavailable for this request."));
  assertNoForbiddenDirectiveOutsideProhibitions(output);
});

await test("Phase 10 deferral is non-blocking unless answerAllowed is false", () => {
  const output = buildClarificationRouteDecision(buildInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "DISCLOSE_PHASE10_DEFERRAL",
      answerAllowed: true,
      phase10Deferrals: ["Source currentness review remains deferred.", "Authority hierarchy review remains deferred."]
    })
  }));
  assert.equal(output.responseType, "phase10_deferred_orientation");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert(output.structuredClarificationObject.phase10Deferrals.includes("Source currentness review remains deferred."));
  assertNoForbiddenDirectiveOutsideProhibitions(output);
});

await test("mode hints are compact and mode specific", () => {
  const ask = buildClarificationRouteDecision(buildInput({ mode: "/ask" })).structuredClarificationObject.renderingHints;
  const tax = buildClarificationRouteDecision(buildInput({ mode: "/tax" })).structuredClarificationObject.renderingHints;
  const audit = buildClarificationRouteDecision(buildInput({ mode: "/audit" })).structuredClarificationObject.renderingHints;
  assert.equal(ask.format, "conversational");
  assert.equal(ask.maxQuestions, 3);
  assert.equal(tax.format, "senior_memo");
  assert.equal(tax.noFinalOpinionWhenClarificationRequired, true);
  assert.equal(audit.format, "procedural_first");
  assert.equal(audit.noProtestSettlementCTAWhenClarificationRequired, true);
});

await test("fixture compatibility preserves response taxonomy and insertion point contract", () => {
  const fixture = loadFixture();
  for (const responseType of fixture.responseTypes) assert(RESPONSE_TYPES.has(responseType), `unsupported fixture responseType ${responseType}`);
  assert.equal(fixture.futureInsertionPoint.location, "runPipeline");
  for (const item of fixture.cases) {
    const output = buildClarificationRouteDecision(buildInput({
      mode: item.mode,
      featureFlagEnabled: item.featureFlagState !== "OFF",
      clarificationResult: baseClarificationResult({
        clarificationDecision: item.clarificationDecision,
        answerAllowed: item.answerAllowed,
        allowedAnswerPosture: item.expectedPromptConstraints?.allowedAnswerPosture || "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
        questions: item.expectedIntegration?.clarificationQuestions || item.expectedPromptConstraints?.questions || [],
        documentRequests: item.expectedIntegration?.documentRequests || item.expectedPromptConstraints?.documentRequests || [],
        sourceCoverageLimitations: item.expectedPromptConstraints?.sourceCoverageLimitations || [],
        phase10Deferrals: item.expectedPromptConstraints?.phase10Deferrals || []
      }),
      sourceAvailabilityState: item.sourceAvailabilityState,
      authorityState: item.sourceAvailabilityState
    }));
    assertImplementationFlags(output);
    if (item.featureFlagState === "OFF") {
      assert.equal(output.enabled, false);
      assert.equal(output.featureFlagOffBehavior, fixture.featureFlagOffBehavior);
      continue;
    }
    assert.equal(output.insertionPoint, "RUNPIPELINE_AFTER_STEP_6_5_BEFORE_STEP_13_14");
    assert(RESPONSE_TYPES.has(output.responseType), `${item.caseId} unsupported responseType`);
    assertStructuredFields(output.structuredClarificationObject);
    if (item.answerAllowed === false) assert.equal(output.shouldCallOpenAIForFullAnswer, false, item.caseId);
  }
});

await test("helper source imports no live route, prompt, pipeline, or response module", () => {
  const source = readFileSync(resolve("clarification-route-orchestrator-helper.js"), "utf8");
  assert.doesNotMatch(source, /from\s+["']\.\/(?:routes|pipeline|ask-handler|answer-renderer|context-orchestration-engine|adaptive-tina-master-prompt)/i);
  assert.doesNotMatch(source, /express\.Router|router\.|app\.|req\.|res\.|chat\.completions|new\s+OpenAI|from\s+["']openai["']/i);
});

console.log(`\nPATCH-07B-CLARIFICATION-ROUTE-HELPER-1 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
