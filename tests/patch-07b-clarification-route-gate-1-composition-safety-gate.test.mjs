/**
 * PATCH-07B-CLARIFICATION-ROUTE-GATE-1 - route clarification composition gate
 *
 * Run: node tests/patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { frameTaxIssue } from "../issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "../reasoning-safety-policy.js";
import { identifyFactGaps } from "../fact-gap-helper.js";
import { buildClientFactChecklistOutput } from "../client-fact-checklist-output.js";
import { assessAuthorityApplicability } from "../authority-applicability-helper.js";
import { applyAdversarialContentSafetyPolicy } from "../adversarial-content-safety-policy.js";
import { assessBirTaxpayerPositions } from "../bir-vs-taxpayer-position-helper.js";
import { assessQualitativeAuditRisk } from "../audit-risk-language-helper.js";
import { assessClarificationNeed } from "../clarification-boundary-policy.js";
import {
  buildClarificationRouteDecision,
  normalizeClarificationResponseType,
  shouldBlockFullAnswerGeneration
} from "../clarification-route-orchestrator-helper.js";

const FIXTURE_PATH = resolve("evaluation", "fixtures", "phase-7b-clarification-route-scaffold-1-integration-policy.fixture.json");
const REPORT_PATH = resolve("PATCH-07B-CLARIFICATION-ROUTE-GATE-1_ROUTE_CLARIFICATION_HELPER_COMPOSITION_AND_SAFETY_GATE.md");

const RAW_FIELDS = [
  "body",
  "content",
  "text",
  "rawText",
  "fullText",
  "excerpt",
  "pageText",
  "chunkText",
  "fullDocument",
  "rawBody"
];

const RESPONSE_TYPES = new Set([
  "clarification",
  "answer_with_followup",
  "document_request_with_cautious_answer",
  "source_limited_orientation",
  "phase10_deferred_orientation",
  "answer"
]);

const REQUIRED_TOP_LEVEL_FIELDS = [
  "enabled",
  "routeBranchActive",
  "mode",
  "responseType",
  "shouldBuildFullAnswerPrompt",
  "shouldCallOpenAIForFullAnswer",
  "structuredClarificationObject",
  "liveRouteImplemented",
  "promptIntegrationImplemented",
  "responseGenerationImplemented",
  "productionOrchestratorImplemented",
  "frontendImplemented"
];

const REQUIRED_STRUCTURED_FIELDS = [
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
  "helperOutputsSummary",
  "renderingHints",
  "implementationScope"
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

function serialize(value) {
  return JSON.stringify(value);
}

function assertHasFields(object, fields) {
  for (const field of fields) {
    assert(Object.hasOwn(object, field), `missing field ${field}`);
  }
}

function assertImplementationFlags(output) {
  assert.equal(output.liveRouteImplemented, false);
  assert.equal(output.promptIntegrationImplemented, false);
  assert.equal(output.responseGenerationImplemented, false);
  assert.equal(output.productionOrchestratorImplemented, false);
  assert.equal(output.frontendImplemented, false);
}

function assertNoRawFields(value, label) {
  const text = serialize(value);
  for (const field of RAW_FIELDS) {
    assert(!new RegExp(`"${field}"\\s*:`).test(text), `${label} leaked raw field ${field}`);
  }
}

function assertNoAffirmativeProhibitedConclusion(output) {
  const clone = structuredClone(output);
  if (clone.structuredClarificationObject) {
    clone.structuredClarificationObject.prohibitedConclusions = [];
  }
  const text = serialize(clone).toLowerCase();
  for (const phrase of [
    "assessment is void",
    "bir has no case",
    "taxpayer will win",
    "bir will win",
    "guaranteed",
    "settlement recommendation",
    "protest strategy",
    "cta strategy",
    "litigation strategy",
    "fake citation",
    "unsupported authority conclusion"
  ]) {
    assert(!text.includes(phrase), `affirmative prohibited phrase leaked outside prohibitions: ${phrase}`);
  }
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

function baseRouteInput(overrides = {}) {
  return {
    mode: "/ask",
    userQuery: "Can we claim input VAT if invoice support is incomplete?",
    featureFlagEnabled: true,
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityState: "AUTHORITY_FOUND",
    sourceCoverageNeeds: ["indexed input VAT substantiation authority"],
    sourceCards: [{
      id: "sc-1",
      title: "NIRC Sec. 110",
      sourceTitle: "National Internal Revenue Code",
      authorityType: "NIRC",
      normalizedReference: "NIRC Sec. 110",
      section: "110",
      url: "https://example.test/nirc-110",
      citation: "NIRC Sec. 110",
      authorityMatchTier: "exact",
      sourceState: "AUTHORITY_FOUND",
      body: "raw body",
      content: "raw content",
      text: "raw text",
      rawText: "raw text",
      fullText: "full text",
      excerpt: "raw excerpt",
      pageText: "page text",
      chunkText: "chunk text",
      fullDocument: "full document",
      rawBody: "raw body"
    }],
    retrievalContext: {
      queryId: "rq-1",
      retrievedCount: 1,
      topAuthorityRefs: ["NIRC Sec. 110"],
      body: "raw body",
      content: "raw content",
      text: "raw text",
      rawText: "raw text",
      fullText: "full text",
      excerpt: "raw excerpt",
      pageText: "page text",
      chunkText: "chunk text",
      fullDocument: "full document",
      rawBody: "raw body",
      nested: {
        sourceState: "AUTHORITY_FOUND",
        rawBody: "nested raw body"
      }
    },
    knownFacts: {
      taxpayerStatus: "VAT-registered domestic corporation",
      taxablePeriod: "2024"
    },
    helperOutputs: {},
    clarificationResult: baseClarificationResult(),
    ...overrides
  };
}

function buildPhase7BHelperChain(overrides = {}) {
  const input = {
    mode: "/ask",
    query: "Can we claim input VAT if invoice support is incomplete?",
    userQuery: "Can we claim input VAT if invoice support is incomplete?",
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityState: "AUTHORITY_FOUND",
    knownFacts: ["taxpayer is VAT-registered"],
    missingUserFacts: ["taxable period"],
    providedDocuments: [],
    sourceCoverageNeeds: ["indexed input VAT substantiation authority"],
    sourceCards: [{
      authorityType: "NIRC",
      normalizedReference: "NIRC Sec. 110",
      sourceState: "AUTHORITY_FOUND"
    }],
    authorityType: "NIRC",
    authorityReference: "NIRC Sec. 110",
    ...overrides
  };

  const issueFrameResult = frameTaxIssue(input);
  const safetyPolicyResult = applyReasoningSafetyPolicy({ ...input, ...issueFrameResult });
  const factGapResult = identifyFactGaps({ ...input, issueFrameResult, safetyPolicyResult });
  const clientFactChecklistResult = buildClientFactChecklistOutput({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult
  });
  const authorityApplicabilityResult = assessAuthorityApplicability({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult
  });
  const adversarialContentSafetyResult = applyAdversarialContentSafetyPolicy({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult
  });
  const birTaxpayerPositionResult = assessBirTaxpayerPositions({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult
  });
  const qualitativeAuditRiskResult = assessQualitativeAuditRisk({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult,
    birTaxpayerPositionResult
  });
  const clarificationResult = assessClarificationNeed({
    ...input,
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult,
    birTaxpayerPositionResult,
    qualitativeAuditRiskResult
  });

  return {
    issueFrameResult,
    safetyPolicyResult,
    factGapResult,
    clientFactChecklistResult,
    authorityApplicabilityResult,
    adversarialContentSafetyResult,
    birTaxpayerPositionResult,
    qualitativeAuditRiskResult,
    clarificationResult
  };
}

function buildComposedRouteInput(overrides = {}) {
  const helperOutputs = buildPhase7BHelperChain(overrides.chainInput || {});
  return baseRouteInput({
    helperOutputs,
    clarificationResult: helperOutputs.clarificationResult,
    ...overrides
  });
}

function assertStructuredContract(output) {
  assertHasFields(output, REQUIRED_TOP_LEVEL_FIELDS);
  assertImplementationFlags(output);
  assertHasFields(output.structuredClarificationObject, REQUIRED_STRUCTURED_FIELDS);
}

await test("imports and route helper exports are available", () => {
  assert.equal(typeof frameTaxIssue, "function");
  assert.equal(typeof applyReasoningSafetyPolicy, "function");
  assert.equal(typeof identifyFactGaps, "function");
  assert.equal(typeof buildClientFactChecklistOutput, "function");
  assert.equal(typeof assessAuthorityApplicability, "function");
  assert.equal(typeof applyAdversarialContentSafetyPolicy, "function");
  assert.equal(typeof assessBirTaxpayerPositions, "function");
  assert.equal(typeof assessQualitativeAuditRisk, "function");
  assert.equal(typeof assessClarificationNeed, "function");
  assert.equal(typeof buildClarificationRouteDecision, "function");
  assert.equal(typeof normalizeClarificationResponseType, "function");
  assert.equal(typeof shouldBlockFullAnswerGeneration, "function");
});

await test("composition object contract accepts Phase 7B helper-chain outputs", () => {
  const input = buildComposedRouteInput();
  const output = buildClarificationRouteDecision(input);
  assertStructuredContract(output);
  assert.equal(output.mode, "ask");
  assert.equal(output.responseType, "clarification");
  assert.equal(output.structuredClarificationObject.helperOutputsSummary.qualitativeAuditRiskResult.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS");
  assert.equal(output.structuredClarificationObject.helperOutputsSummary.clarificationResult.clarificationDecision, "ASK_BEFORE_ANSWERING");
});

await test("feature flag OFF composition preserves byte-identical future behavior contract", () => {
  const output = buildClarificationRouteDecision(buildComposedRouteInput({ featureFlagEnabled: false }));
  assert.equal(output.enabled, false);
  assert.equal(output.routeBranchActive, false);
  assert.equal(output.responseType, "answer");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert.equal(output.structuredClarificationObject, null);
  assert.equal(output.featureFlagOffBehavior, "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED");
  assertImplementationFlags(output);
});

await test("ASK_BEFORE_ANSWERING blocks full answer generation when answerAllowed is false", () => {
  const clarificationResult = baseClarificationResult({
    clarificationDecision: "ASK_BEFORE_ANSWERING",
    answerAllowed: false,
    canReachFinalConclusion: false,
    questions: ["What taxpayer type is involved?"]
  });
  const output = buildClarificationRouteDecision(baseRouteInput({ clarificationResult }));
  assert.equal(output.responseType, "clarification");
  assert.equal(output.routeAction, "RETURN_CLARIFICATION_ONLY");
  assert.equal(output.shouldBuildFullAnswerPrompt, false);
  assert.equal(output.shouldCallOpenAIForFullAnswer, false);
  assert.equal(output.blockingTrigger, "answerAllowed === false");
  assert.equal(output.canReachFinalConclusion, false);
  assert.equal(shouldBlockFullAnswerGeneration({ featureFlagEnabled: true, clarificationResult }), true);
});

await test("ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP remains non-blocking and caps questions at 3", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP",
      answerAllowed: true,
      allowedAnswerPosture: "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
      questions: ["What amount is involved?", "Is the transaction recurring?", "What taxable period applies?", "Fourth question is capped."]
    })
  }));
  assert.equal(output.responseType, "answer_with_followup");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert(output.structuredClarificationObject);
  assert.deepEqual(output.structuredClarificationObject.questions, [
    "What amount is involved?",
    "Is the transaction recurring?",
    "What taxable period applies?"
  ]);
});

await test("REQUEST_DOCUMENTS preserves cleaned document requests without final conclusion", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    mode: "/tax",
    clarificationResult: baseClarificationResult({
      clarificationDecision: "REQUEST_DOCUMENTS",
      answerAllowed: true,
      documentRequests: ["Please provide the Form 2307.", "", {}, "Please provide the service invoice."],
      canReachFinalConclusion: true
    })
  }));
  assert.equal(output.responseType, "document_request_with_cautious_answer");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert.deepEqual(output.structuredClarificationObject.documentRequests, [
    "Please provide the Form 2307.",
    "Please provide the service invoice."
  ]);
  assert.equal(output.structuredClarificationObject.canReachFinalConclusion, true);
  assert.match(output.structuredClarificationObject.prohibitedConclusions.join(" "), /final legal or tax conclusion/i);
});

await test("DISCLOSE_SOURCE_LIMITATION preserves limitations and does not outsource legal research", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    sourceAvailabilityState: "NO_INDEXED_SOURCE",
    authorityState: "NO_INDEXED_SOURCE",
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
  assert.doesNotMatch(serialize(output), /find the law|search the law|search BIR|find\/search/i);
  assert.equal(output.blockingTrigger, null);
});

await test("DISCLOSE_PHASE10_DEFERRAL preserves deferrals without executing Phase 10 work", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "DISCLOSE_PHASE10_DEFERRAL",
      answerAllowed: true,
      phase10Deferrals: ["Source currentness review remains deferred.", "Authority hierarchy review remains deferred."]
    })
  }));
  assert.equal(output.responseType, "phase10_deferred_orientation");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assert.deepEqual(output.structuredClarificationObject.phase10Deferrals, [
    "Source currentness review remains deferred.",
    "Authority hierarchy review remains deferred."
  ]);
  assert.doesNotMatch(serialize(output), /determine currentness|determine supersession|determine hierarchy|determine source metadata/i);
  assert.doesNotMatch(serialize(output), /source governance executed|tax accuracy qa executed|hallucination test execution/i);
  assert.equal(output.blockingTrigger, null);
});

await test("ANSWER_NOW_NO_CLARIFICATION_NEEDED allows answer while keeping non-live flags false", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "ANSWER_NOW_NO_CLARIFICATION_NEEDED",
      answerAllowed: true,
      questions: []
    })
  }));
  assert.equal(output.responseType, "answer");
  assert.equal(output.shouldBuildFullAnswerPrompt, true);
  assert.equal(output.shouldCallOpenAIForFullAnswer, true);
  assertImplementationFlags(output);
});

await test("mode-specific composition returns ask tax and audit rendering hints", () => {
  const ask = buildClarificationRouteDecision(baseRouteInput({ mode: "/ask" })).structuredClarificationObject.renderingHints;
  const tax = buildClarificationRouteDecision(baseRouteInput({ mode: "/tax" })).structuredClarificationObject.renderingHints;
  const audit = buildClarificationRouteDecision(baseRouteInput({ mode: "/audit" })).structuredClarificationObject.renderingHints;
  assert.equal(ask.format, "conversational");
  assert.equal(ask.maxQuestions, 3);
  assert.equal(tax.format, "senior_memo");
  assert.equal(tax.noFinalOpinionWhenClarificationRequired, true);
  assert.equal(audit.format, "procedural_first");
  assert.equal(audit.noProtestSettlementCTAWhenClarificationRequired, true);
});

await test("compact metadata composition strips raw fields from sourceCards and retrievalContext", () => {
  const output = buildClarificationRouteDecision(baseRouteInput({
    clarificationResult: baseClarificationResult({
      clarificationDecision: "ANSWER_NOW_NO_CLARIFICATION_NEEDED",
      answerAllowed: true
    })
  }));
  assert.equal(output.structuredClarificationObject.sourceCards[0].normalizedReference, "NIRC Sec. 110");
  assert.equal(output.structuredClarificationObject.retrievalContext.queryId, "rq-1");
  assert.equal(output.structuredClarificationObject.retrievalContext.nested.sourceState, "AUTHORITY_FOUND");
  assertNoRawFields(output.structuredClarificationObject.sourceCards, "sourceCards");
  assertNoRawFields(output.structuredClarificationObject.retrievalContext, "retrievalContext");
});

await test("helperOutputsSummary preserves compact labels and omits raw helper bodies", () => {
  const helperOutputs = buildPhase7BHelperChain();
  helperOutputs.qualitativeAuditRiskResult.body = "raw helper body";
  helperOutputs.clarificationResult.fullText = "raw helper text";
  const output = buildClarificationRouteDecision(baseRouteInput({
    helperOutputs,
    clarificationResult: helperOutputs.clarificationResult
  }));
  const summary = output.structuredClarificationObject.helperOutputsSummary;
  assert.equal(summary.issueFrameResult.present, true);
  assert.equal(summary.qualitativeAuditRiskResult.qualitativeAuditRiskLabel, "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS");
  assert.equal(summary.clarificationResult.clarificationDecision, "ASK_BEFORE_ANSWERING");
  assertNoRawFields(summary, "helperOutputsSummary");
  assert(!serialize(summary).includes("raw helper body"));
  assert(!serialize(summary).includes("raw helper text"));
});

await test("prohibited conclusion safety keeps unsafe phrases only as prohibitions", () => {
  const output = buildClarificationRouteDecision(baseRouteInput());
  const prohibitions = output.structuredClarificationObject.prohibitedConclusions.join(" ");
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
    "fake citation",
    "unsupported authority conclusion"
  ]) {
    assert(prohibitions.toLowerCase().includes(phrase.toLowerCase()), `missing prohibition ${phrase}`);
  }
  assertNoAffirmativeProhibitedConclusion(output);
});

await test("source limitation and Phase 10 deferral boundaries do not hard-block unless answerAllowed is false", () => {
  for (const clarificationDecision of ["DISCLOSE_SOURCE_LIMITATION", "DISCLOSE_PHASE10_DEFERRAL"]) {
    const allowed = buildClarificationRouteDecision(baseRouteInput({
      clarificationResult: baseClarificationResult({ clarificationDecision, answerAllowed: true })
    }));
    assert.equal(allowed.shouldCallOpenAIForFullAnswer, true, clarificationDecision);
    assert.equal(allowed.blockingTrigger, null, clarificationDecision);

    const blocked = buildClarificationRouteDecision(baseRouteInput({
      clarificationResult: baseClarificationResult({ clarificationDecision, answerAllowed: false })
    }));
    assert.equal(blocked.responseType, "clarification", clarificationDecision);
    assert.equal(blocked.shouldCallOpenAIForFullAnswer, false, clarificationDecision);
    assert.equal(blocked.blockingTrigger, "answerAllowed === false", clarificationDecision);
  }
});

await test("fixture compatibility preserves route taxonomy and future insertion contracts", () => {
  const fixture = loadFixture();
  assert.equal(fixture.featureFlagOffBehavior, "BYTE_IDENTICAL_CURRENT_BEHAVIOR_REQUIRED");
  assert.equal(fixture.futureInsertionPoint.location, "runPipeline");
  assert.equal(fixture.futureInsertionPoint.mustNotRunAfterGeneration, true);
  assert.equal(fixture.answerBlockingRule.hardBlockingTrigger, "answerAllowed === false");
  for (const responseType of fixture.responseTypes) assert(RESPONSE_TYPES.has(responseType), responseType);

  for (const item of fixture.cases) {
    const featureFlagEnabled = item.featureFlagState !== "OFF";
    const mode = item.mode === "mixed" ? "/ask" : item.mode;
    const output = buildClarificationRouteDecision(baseRouteInput({
      mode,
      featureFlagEnabled,
      sourceAvailabilityState: item.sourceAvailabilityState,
      authorityState: item.sourceAvailabilityState,
      clarificationResult: baseClarificationResult({
        clarificationDecision: item.clarificationDecision,
        answerAllowed: item.answerAllowed,
        allowedAnswerPosture: item.expectedPromptConstraints?.allowedAnswerPosture || "CAUTIOUS_ANSWER_WITH_OPEN_ITEMS",
        questions: item.expectedIntegration?.clarificationQuestions || item.expectedPromptConstraints?.questions || [],
        documentRequests: item.expectedIntegration?.documentRequests || item.expectedPromptConstraints?.documentRequests || [],
        sourceCoverageLimitations: item.expectedPromptConstraints?.sourceCoverageLimitations || [],
        phase10Deferrals: item.expectedPromptConstraints?.phase10Deferrals || []
      })
    }));
    assertImplementationFlags(output);
    if (!featureFlagEnabled) {
      assert.equal(output.routeBranchActive, false, item.caseId);
      assert.equal(output.structuredClarificationObject, null, item.caseId);
      continue;
    }
    assert.equal(output.insertionPoint, "RUNPIPELINE_AFTER_STEP_6_5_BEFORE_STEP_13_14", item.caseId);
    assert(RESPONSE_TYPES.has(output.responseType), item.caseId);
    assertHasFields(output.structuredClarificationObject, REQUIRED_STRUCTURED_FIELDS);
    if (item.answerAllowed === false) {
      assert.equal(output.shouldBuildFullAnswerPrompt, false, item.caseId);
      assert.equal(output.shouldCallOpenAIForFullAnswer, false, item.caseId);
    }
  }
});

await test("no live integration static guard imports route prompt pipeline or renderer files", () => {
  const routeHelperSource = readFileSync(resolve("clarification-route-orchestrator-helper.js"), "utf8");
  const gateSource = readFileSync(resolve("tests", "patch-07b-clarification-route-gate-1-composition-safety-gate.test.mjs"), "utf8");
  const importStatements = [routeHelperSource, gateSource]
    .flatMap((source) => source.match(/^\s*import\s+.+$/gm) || []);
  const importText = importStatements.join("\n");
  assert.doesNotMatch(importText, /routes\/ask-route|routes\\ask-route|routes\/tax-route|routes\\tax-route|routes\/audit-route|routes\\audit-route/i);
  assert.doesNotMatch(importText, /ask-handler|pipeline\.js|context-orchestration-engine|tax-mode-prompt|audit-mode-prompt|adaptive-tina-master-prompt|answer-renderer/i);
  assert.doesNotMatch(importText, /openai|retrieval-engine|vector-store|supabase/i);
  assert.doesNotMatch(routeHelperSource, /new\s+OpenAI|chat\.completions|retrieval-engine|vector-store|supabase/i);
});

await test("no prohibited phase expansion appears as implemented runtime behavior", () => {
  const texts = [
    readFileSync(resolve("clarification-route-orchestrator-helper.js"), "utf8")
  ];
  if (existsSync(REPORT_PATH)) texts.push(readFileSync(REPORT_PATH, "utf8"));
  const combined = texts
    .join("\n")
    .split(/\r?\n/)
    .filter((line) => !/\b(?:no|not|without|defer|deferred|remain deferred|prohibited)\b/i.test(line))
    .join("\n")
    .toLowerCase();
  for (const pattern of [
    new RegExp("phase 8 memory " + "(?:implemented|enabled|executed|wired)", "i"),
    new RegExp("phase 9 workflow " + "(?:implemented|enabled|executed|wired)", "i"),
    new RegExp("phase " + "10 .*" + "(?:test execution|implemented|enabled|executed|wired)", "i"),
    new RegExp("phase 11 observability " + "(?:implemented|enabled|executed|wired)", "i"),
    new RegExp("phase 12 document advisory " + "(?:implemented|enabled|executed|wired)", "i"),
    new RegExp("settlement/protest/cta runtime " + "(?:implemented|enabled|executed|wired)", "i"),
    new RegExp("authority conflict/hierarchy/supersession runtime " + "(?:implemented|enabled|executed|wired)", "i")
  ]) {
    assert.doesNotMatch(combined, pattern);
  }
});

console.log(`\nPATCH-07B-CLARIFICATION-ROUTE-GATE-1 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
