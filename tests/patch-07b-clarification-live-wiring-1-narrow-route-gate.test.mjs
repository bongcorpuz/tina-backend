/**
 * PATCH-07B-CLARIFICATION-LIVE-WIRING-1 - narrow live clarification route wiring tests
 *
 * Run: node tests/patch-07b-clarification-live-wiring-1-narrow-route-gate.test.mjs
 */

"use strict";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildClarificationFallback,
  evaluateClarificationRouteGate,
  isClarificationRouteGateEnabled
} from "../pipeline.js";
import { buildClarificationRouteDecision } from "../clarification-route-orchestrator-helper.js";

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

function baseCtx(overrides = {}) {
  return {
    mode: "STANDARD_TAX_MODE",
    saeStatus: "AUTHORITY_FOUND",
    sourceAvailability: {
      saeStatus: "AUTHORITY_FOUND",
      statusReason: "governing indexed authority found"
    },
    eligibleCandidates: [{
      title: "NIRC Sec. 110",
      sourceTitle: "National Internal Revenue Code",
      authorityType: "NIRC",
      normalizedReference: "NIRC Sec. 110",
      citation: "NIRC Sec. 110",
      sourceState: "AUTHORITY_FOUND",
      fullDocument: "raw text must not leak"
    }],
    rerankedChunks: [{
      title: "NIRC Sec. 110",
      authorityType: "NIRC",
      normalizedReference: "NIRC Sec. 110",
      citation: "NIRC Sec. 110"
    }],
    suppressedCandidates: [],
    limitationRequired: false,
    disclosureType: null,
    statusReason: "governing indexed authority found",
    issueClassification: {
      primaryIssue: "INPUT_VAT",
      exactAuthority: { reference: "NIRC Sec. 110" }
    },
    conflictAnalysis: null,
    riskScore: null,
    ...overrides
  };
}

function helperOutput(clarificationResult) {
  return {
    issueFrameResult: { implementationScope: "ISSUE_FRAMING_ONLY" },
    safetyPolicyResult: { safetyPosture: "ALLOW_ISSUE_FRAMING_WITH_CAUTION" },
    factGapResult: { implementationScope: "FACT_GAP_HELPER_ONLY" },
    clientFactChecklistResult: { implementationScope: "CLIENT_FACT_CHECKLIST_OUTPUT_ONLY" },
    authorityApplicabilityResult: { authorityState: "AUTHORITY_FOUND" },
    adversarialContentSafetyResult: { implementationScope: "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY" },
    birTaxpayerPositionResult: { implementationScope: "BIR_TAXPAYER_POSITION_HELPER_ONLY" },
    qualitativeAuditRiskResult: { qualitativeAuditRiskLabel: "INDETERMINATE_DUE_TO_MISSING_CRITICAL_FACTS" },
    clarificationResult
  };
}

const blockingClarification = {
  clarificationDecision: "ASK_BEFORE_ANSWERING",
  answerAllowed: false,
  allowedAnswerPosture: "NO_ANSWER_UNTIL_CLARIFIED",
  canReachFinalConclusion: false,
  questions: ["What taxable period applies?", "Is the taxpayer VAT-registered?", "What invoice support exists?", "Capped question."],
  documentRequests: ["Please provide the invoice."],
  sourceCoverageLimitations: ["Indexed source support depends on the missing facts."],
  phase10Deferrals: ["Source currentness review remains deferred."],
  prohibitedConclusions: ["Do not provide a final tax opinion."]
};

await test("feature flag parser defaults OFF and accepts only explicit true-like values", () => {
  assert.equal(isClarificationRouteGateEnabled({}), false);
  assert.equal(isClarificationRouteGateEnabled({ TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "false" }), false);
  assert.equal(isClarificationRouteGateEnabled({ TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "garbage" }), false);
  for (const value of ["1", "true", "TRUE", "on", "ON", "yes", "YES"]) {
    assert.equal(isClarificationRouteGateEnabled({ TINA_ENABLE_CLARIFICATION_ROUTE_GATE: value }), true, value);
  }
});

await test("flag OFF does not invoke helper chain or route decision and adds no response fields", () => {
  let helperCalls = 0;
  let decisionCalls = 0;
  const result = evaluateClarificationRouteGate({
    ctx: baseCtx(),
    query: "Can I claim input VAT?",
    hook: "/tax",
    env: {},
    helperChainRunner: () => {
      helperCalls++;
      return helperOutput(blockingClarification);
    },
    routeDecisionBuilder: () => {
      decisionCalls++;
      return {};
    }
  });
  assert.equal(result.enabled, false);
  assert.equal(result.helperChainInvoked, false);
  assert.equal(result.buildClarificationRouteDecisionInvoked, false);
  assert.equal(result.responseType, null);
  assert.equal(result.structuredClarificationObject, null);
  assert.equal(result.earlyExitResponse, null);
  assert.equal(helperCalls, 0);
  assert.equal(decisionCalls, 0);
});

await test("flag ON blocking answerAllowed false returns clarification-only response and skips generation path", () => {
  const result = evaluateClarificationRouteGate({
    ctx: baseCtx(),
    query: "Can I claim input VAT without invoice support?",
    hook: "/tax",
    env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "true" },
    helperChainRunner: () => helperOutput(blockingClarification),
    routeDecisionBuilder: buildClarificationRouteDecision
  });
  assert.equal(result.enabled, true);
  assert.equal(result.helperChainInvoked, true);
  assert.equal(result.buildClarificationRouteDecisionInvoked, true);
  assert.equal(result.responseType, "clarification");
  assert.equal(result.routeDecision.answerAllowed, false);
  assert.equal(result.routeDecision.shouldBuildFullAnswerPrompt, false);
  assert.equal(result.routeDecision.shouldCallOpenAIForFullAnswer, false);
  assert.equal(result.earlyExitResponse.responseType, "clarification");
  assert.equal(result.earlyExitResponse.clarificationRouteGate.shouldBuildFullAnswerPrompt, false);
  assert.equal(result.earlyExitResponse.clarificationRouteGate.shouldCallOpenAIForFullAnswer, false);
  assert.equal(result.earlyExitResponse.openaiCalls.length, 0);
  assert(result.earlyExitResponse.questions.length <= 3);
  assert(result.earlyExitResponse.documentRequests.includes("Please provide the invoice."));
});

await test("clarification-only fallback contains no final conclusion or fake citation", () => {
  const routeDecision = buildClarificationRouteDecision({
    mode: "/audit",
    featureFlagEnabled: true,
    sourceAvailabilityState: "AUTHORITY_FOUND",
    authorityState: "AUTHORITY_FOUND",
    sourceCards: baseCtx().eligibleCandidates,
    clarificationResult: blockingClarification,
    helperOutputs: helperOutput(blockingClarification)
  });
  const fallback = buildClarificationFallback(baseCtx({ mode: "COMPLEX_ADVISORY" }), routeDecision, "Audit question", "/audit");
  assert.equal(fallback.responseType, "clarification");
  assert.doesNotMatch(fallback.answer, /\bassessment is void|taxpayer will win|BIR will win|G\.R\. No\.|NIRC Sec\.\s*\d+\b/i);
  assert.equal(fallback.structuredClarificationObject.questions.length, 3);
});

await test("flag ON non-blocking cases continue normal generation path with structured metadata", () => {
  for (const [decision, responseType] of [
    ["ANSWER_CAUTIOUSLY_AND_ASK_FOLLOWUP", "answer_with_followup"],
    ["REQUEST_DOCUMENTS", "document_request_with_cautious_answer"],
    ["DISCLOSE_SOURCE_LIMITATION", "source_limited_orientation"],
    ["DISCLOSE_PHASE10_DEFERRAL", "phase10_deferred_orientation"],
    ["ANSWER_NOW_NO_CLARIFICATION_NEEDED", "answer"]
  ]) {
    const clarificationResult = {
      clarificationDecision: decision,
      answerAllowed: true,
      questions: ["What amount is involved?"],
      documentRequests: decision === "REQUEST_DOCUMENTS" ? ["Please provide Form 2307."] : [],
      sourceCoverageLimitations: decision === "DISCLOSE_SOURCE_LIMITATION" ? ["Indexed source support is limited."] : [],
      phase10Deferrals: decision === "DISCLOSE_PHASE10_DEFERRAL" ? ["Source currentness review remains deferred."] : []
    };
    const result = evaluateClarificationRouteGate({
      ctx: baseCtx(),
      query: "Can I claim this?",
      hook: "/ask",
      env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "ON" },
      helperChainRunner: () => helperOutput(clarificationResult),
      routeDecisionBuilder: buildClarificationRouteDecision
    });
    assert.equal(result.responseType, responseType, decision);
    assert.equal(result.routeDecision.shouldBuildFullAnswerPrompt, true, decision);
    assert.equal(result.routeDecision.shouldCallOpenAIForFullAnswer, true, decision);
    assert.equal(result.earlyExitResponse, null, decision);
    assert(result.structuredClarificationObject, decision);
  }
});

await test("source limitation and Phase 10 deferral are non-blocking unless answerAllowed is false", () => {
  for (const decision of ["DISCLOSE_SOURCE_LIMITATION", "DISCLOSE_PHASE10_DEFERRAL"]) {
    const allowed = evaluateClarificationRouteGate({
      ctx: baseCtx(),
      query: "Can I rely on this?",
      hook: "/ask",
      env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "yes" },
      helperChainRunner: () => helperOutput({ clarificationDecision: decision, answerAllowed: true }),
      routeDecisionBuilder: buildClarificationRouteDecision
    });
    assert.equal(allowed.earlyExitResponse, null, decision);
    assert.equal(allowed.routeDecision.shouldCallOpenAIForFullAnswer, true, decision);

    const blocked = evaluateClarificationRouteGate({
      ctx: baseCtx(),
      query: "Can I rely on this?",
      hook: "/ask",
      env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "yes" },
      helperChainRunner: () => helperOutput({ clarificationDecision: decision, answerAllowed: false }),
      routeDecisionBuilder: buildClarificationRouteDecision
    });
    assert.equal(blocked.responseType, "clarification", decision);
    assert.equal(blocked.routeDecision.shouldCallOpenAIForFullAnswer, false, decision);
  }
});

await test("helper-chain error fails open without fabricated clarification result", () => {
  const result = evaluateClarificationRouteGate({
    ctx: baseCtx(),
    query: "Can I claim input VAT?",
    hook: "/tax",
    env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "true" },
    helperChainRunner: () => {
      throw new Error("synthetic helper failure");
    },
    routeDecisionBuilder: buildClarificationRouteDecision
  });
  assert.equal(result.enabled, true);
  assert.equal(result.failOpen, true);
  assert.equal(result.earlyExitResponse, null);
  assert.equal(result.structuredClarificationObject, null);
  assert.equal(result.responseType, null);
  assert.match(result.warning, /fail-open/);
});

await test("non-answer SAE states bypass clarification so existing fallbacks remain responsible", () => {
  const result = evaluateClarificationRouteGate({
    ctx: baseCtx({ saeStatus: "RETRIEVAL_TIMEOUT", sourceAvailability: { saeStatus: "RETRIEVAL_TIMEOUT" } }),
    query: "Can I claim this?",
    hook: "/ask",
    env: { TINA_ENABLE_CLARIFICATION_ROUTE_GATE: "true" },
    helperChainRunner: () => {
      throw new Error("must not run");
    },
    routeDecisionBuilder: buildClarificationRouteDecision
  });
  assert.equal(result.enabled, true);
  assert.equal(result.bypassed, true);
  assert.equal(result.helperChainInvoked, false);
  assert.equal(result.buildClarificationRouteDecisionInvoked, false);
  assert.equal(result.earlyExitResponse, null);
});

await test("pipeline source wires Step 12.6 before prompt construction and OpenAI generation", () => {
  const source = readFileSync(resolve("pipeline.js"), "utf8");
  const step126 = source.indexOf("Step 12.6: Live clarification route gate");
  const step13 = source.indexOf("ctx.promptContract = buildAdaptivePromptContract");
  const step14 = source.indexOf("callOpenAIWithOrchestration({");
  assert(step126 > 0, "missing Step 12.6 marker");
  assert(step126 < step13, "Step 12.6 must precede Step 13");
  assert(step126 < step14, "Step 12.6 must precede Step 14");
  assert.match(source, /catch \(e\)[\s\S]*CLARIFICATION_ROUTE_GATE_FAIL_OPEN/);
});

await test("pipeline source introduces no structured fact extraction or frontend/dependency change", () => {
  const source = readFileSync(resolve("pipeline.js"), "utf8");
  const liveWiringStart = source.indexOf("CLARIFICATION_ROUTE_GATE_TRUE_VALUES");
  const liveWiringEnd = source.indexOf("function buildOpenAiFailureRetrievalAnswer");
  const liveWiringSource = source.slice(liveWiringStart, liveWiringEnd);
  assert.match(source, /knownFacts:\s*\{\}/);
  assert.doesNotMatch(liveWiringSource, /extractStructuredUserFacts|structuredFactExtraction|new\s+FactExtractor/i);
  assert.doesNotMatch(liveWiringSource, /frontend|package\.json|HAL-TEST/i);
});

console.log(`\nPATCH-07B-CLARIFICATION-LIVE-WIRING-1 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
