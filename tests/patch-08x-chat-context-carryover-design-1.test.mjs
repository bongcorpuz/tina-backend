// PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1 - design gate test.
// Static, JSON-based validation only. Performs NO HTTP, does NOT start the
// server, imports no server.js/runtime modules, requires no env vars, and prints
// no env values. It validates the design fixture and its alignment with the 08X
// diagnostic fixture.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DESIGN_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-design-1.fixture.json";
const DIAG_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-diagnostic-1.fixture.json";

const VALID_DECISIONS = [
  "CHAT CONTEXT CARRYOVER DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "CHAT CONTEXT CARRYOVER DESIGN INCONCLUSIVE",
  "CHAT CONTEXT CARRYOVER DESIGN BLOCKED"
];

let passed = 0;
let failed = 0;
let assertions = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}
function check(condition, message) {
  assertions += 1;
  assert(condition, message);
}

let fx, diag;

await test("design fixture exists and both fixtures are valid JSON", () => {
  check(existsSync(resolve(DESIGN_PATH)), `${DESIGN_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(DESIGN_PATH), "utf8"));
  check(existsSync(resolve(DIAG_PATH)), `${DIAG_PATH} must exist`);
  diag = JSON.parse(readFileSync(resolve(DIAG_PATH), "utf8"));
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "designVersion", "nonRuntimePatch", "phaseStatus",
    "diagnosticIntegration", "problemStatement", "designGoals", "nonGoals", "shortTermContextModel",
    "inputContractDesign", "standaloneQueryDesign", "followUpDetectionDesign", "issueInheritanceDesign",
    "pipelinePlacementDesign", "classificationIntegrationDesign", "retrievalIntegrationDesign",
    "promptIntegrationDesign", "sourceAuthorityDiscipline", "fallbackBehavior", "falsePositiveControls",
    "securityPrivacyControls", "loggingEgressControls", "tenantIsolationBoundary", "frontendBackendContract",
    "modeCompatibility", "testPlan", "futurePatchSequence", "risks", "prohibitedClaims", "validationMatrix", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
});

await test("patch id and decision are correct", () => {
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("patch is marked non-runtime", () => {
  check(fx.nonRuntimePatch === true, "nonRuntimePatch true");
  const d = fx.nonRuntimeDeclaration;
  for (const f of ["noRuntimeChange", "noDeployment", "noPackageChange", "noEnvChange", "noDbSupabaseChange", "noMemoryEnablement", "noPhase9Implementation"]) {
    check(d[f] === true, `${f} must be true`);
  }
});

await test("phase status: Phase 8 closed, Phase 8S closed, 08X diagnostic complete, Phase 9 not started, memory inactive", () => {
  const p = fx.phaseStatus;
  check(p.phase8Closed === true, "Phase 8 closed");
  check(p.phase8SClosed === true, "Phase 8S closed");
  check(p.phase08XDiagnosticComplete === true, "08X diagnostic complete");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.phase8MemoryInactive === true, "memory inactive");
});

await test("diagnostic integration references the diagnostic patch and commit 38d5b9e", () => {
  const di = fx.diagnosticIntegration;
  check(di.diagnosticPatchId === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "diagnostic patch id");
  check(di.diagnosticCommit === "38d5b9e", "diagnostic commit");
  check(di.rootCausePrimary.includes("CLASSIFICATION_CONTEXT_GAP"), "root cause classification gap");
  check(di.rootCausePrimary.includes("RETRIEVAL_REWRITE_GAP"), "root cause retrieval gap");
  check(di.notRootCause.includes("PROMPT_CONTEXT_GAP"), "not-root-cause prompt gap");
  // Alignment with the actual diagnostic fixture.
  check(diag.rootCauseClassification.includes("CLASSIFICATION_CONTEXT_GAP"), "diagnostic fixture has classification gap");
  check(diag.rootCauseClassification.includes("RETRIEVAL_REWRITE_GAP"), "diagnostic fixture has retrieval gap");
});

await test("problem statement includes tobacco VAT and fresh frozen seafood follow-up", () => {
  const ps = fx.problemStatement;
  check(/tobacco/i.test(ps.turn1) && /VAT/i.test(ps.turn1), "turn1 tobacco VAT");
  check(/fresh frozen seafood/i.test(ps.turn2Followup), "turn2 fresh frozen seafood");
  check(/fresh frozen seafood/i.test(ps.expectedStandaloneQuery) && /VAT/i.test(ps.expectedStandaloneQuery), "expected standalone query");
});

await test("design goals include standaloneQuery before classification and retrieval", () => {
  const g = fx.designGoals.join(" | ").toLowerCase();
  check(g.includes("standalonequery before issue classification"), "goal: before classification");
  check(g.includes("before retrieval"), "goal: before retrieval");
  const ng = fx.nonGoals.join(" | ").toLowerCase();
  check(ng.includes("no persistent memory"), "non-goal: no persistent memory");
  check(ng.includes("no phase 9 implementation"), "non-goal: no Phase 9 implementation");
});

await test("short-term context model includes all required fields", () => {
  const m = fx.shortTermContextModel;
  for (const key of ["currentQuery", "recentTurns", "activeConversationId", "shortTermContext", "standaloneQuery", "contextCarryoverDecision"]) {
    check(Object.prototype.hasOwnProperty.call(m, key), `context model must include ${key}`);
  }
  check(Array.isArray(m.contextCarryoverDecision.fields) && m.contextCarryoverDecision.fields.includes("standaloneQuery"), "decision fields include standaloneQuery");
});

await test("input contract prefers conversationId/sessionId/x-conversation-id and server-side history", () => {
  const ic = fx.inputContractDesign;
  check(ic.backendSupportsToday.includes("conversationId") && ic.backendSupportsToday.includes("sessionId"), "supports conversationId/sessionId");
  check(ic.backendSupportsToday.some((x) => /x-conversation-id/i.test(x)), "supports x-conversation-id");
  check(ic.serverSideHistoryPreferred === true, "server-side history preferred");
});

await test("standalone query design preserves currentQuery and is used before classification/retrieval", () => {
  const s = fx.standaloneQueryDesign;
  check(s.builtBeforeClassificationAndRetrieval === true, "built before classification/retrieval");
  check(s.currentQueryPreserved === true, "currentQuery preserved");
  check(s.usedForClassification === true && s.usedForRetrieval === true, "used for classification and retrieval");
  check(s.doesNotAlterLegalAuthorityRequirements === true, "does not alter authority requirements");
});

await test("follow-up detection includes required positive and negative examples", () => {
  const pos = fx.followUpDetectionDesign.positiveExamples.join(" | ").toLowerCase();
  const neg = fx.followUpDetectionDesign.negativeExamples.join(" | ").toLowerCase();
  check(pos.includes("how about fresh frozen seafood?"), "positive: fresh frozen seafood");
  check(pos.includes("what about lease payments?"), "positive: lease payments");
  check(neg.includes("new question"), "negative: new question");
  check(neg.includes("in the us"), "negative: jurisdiction switch");
});

await test("issue inheritance excludes citations, legal conclusions, and authority currentness", () => {
  const ni = fx.issueInheritanceDesign.notInherited.join(" | ").toLowerCase();
  check(ni.includes("citations"), "not inherited: citations");
  check(ni.includes("legal conclusions"), "not inherited: legal conclusions");
  check(ni.includes("authority currentness"), "not inherited: authority currentness");
});

await test("pipeline placement order places standaloneQuery before classification and retrieval", () => {
  const order = fx.pipelinePlacementDesign.order.map((s) => s.toLowerCase());
  const idxStandalone = order.findIndex((s) => s.includes("build standalonequery"));
  const idxClass = order.findIndex((s) => s.includes("issue classification"));
  const idxRetr = order.findIndex((s) => s.includes("retrieval"));
  check(idxStandalone >= 0 && idxClass >= 0 && idxRetr >= 0, "order contains standalone/classification/retrieval");
  check(idxStandalone < idxClass, "standaloneQuery before classification");
  check(idxStandalone < idxRetr, "standaloneQuery before retrieval");
});

await test("classification and retrieval integration use standaloneQuery", () => {
  check(fx.classificationIntegrationDesign.classifierReceivesStandaloneQuery === true, "classifier receives standaloneQuery");
  check(fx.retrievalIntegrationDesign.retrievalUsesStandaloneQuery === true, "retrieval uses standaloneQuery");
  check(fx.retrievalIntegrationDesign.retrievalMustNotInferAuthorityFromConversationAlone === true, "no authority from conversation alone");
});

await test("prompt integration states prompt was not the root cause", () => {
  check(fx.promptIntegrationDesign.promptWasNotRootCause === true, "prompt not root cause");
  check(fx.promptIntegrationDesign.promptMustAnswerCurrentQueryNotOnlyRewrittenQuery === true, "answers current query");
});

await test("source authority discipline prohibits citations from memory/history alone", () => {
  const s = fx.sourceAuthorityDiscipline;
  check(s.noCitationsFromMemoryOrHistoryAlone === true, "no citations from memory/history alone");
  check(s.sourceCardsRemainControlling === true, "source cards controlling");
  check(s.ifNoAuthorityFoundTinaSaysSo === true, "says so if no authority");
});

await test("fallback behavior includes no history, low confidence, jurisdiction switch, new topic", () => {
  const f = fx.fallbackBehavior;
  check(typeof f.noConversationIdOrHistory === "string", "no history fallback");
  check(typeof f.lowConfidenceRewrite === "string", "low confidence fallback");
  check(typeof f.jurisdictionSwitch === "string", "jurisdiction switch fallback");
  check(typeof f.newTopicDetected === "string", "new topic fallback");
});

await test("false-positive controls include confidence, topic-change, jurisdiction-change, reset phrases", () => {
  const c = fx.falsePositiveControls;
  check(c.confidenceThreshold === true, "confidence threshold");
  check(c.topicChangeDetector === true, "topic-change detector");
  check(c.jurisdictionChangeDetector === true, "jurisdiction-change detector");
  check(Array.isArray(c.explicitResetPhrases) && c.explicitResetPhrases.length > 0, "explicit reset phrases");
});

await test("security/privacy controls include bounded recentTurns, no raw logs, no P1/P2 egress, no memory flags", () => {
  const s = fx.securityPrivacyControls;
  check(s.boundRecentTurns === true, "bounded recentTurns");
  check(s.avoidLoggingRawRecentTurns === true, "no raw logs");
  check(s.avoidThirdPartyEgressOfP1P2 === true, "no P1/P2 third-party egress");
  check(s.noMemoryFlags === true, "no memory flags");
  check(s.noPersistenceExpansion === true, "no persistence expansion");
});

await test("frontend/backend contract states the frontend is not verified in the backend repo", () => {
  const fb = fx.frontendBackendContract;
  check(fb.frontendNotVerifiedInBackendRepo === true, "frontend not verified");
  check(fb.frontendMustConsistentlySendActiveConversationIdOrSessionId === true, "frontend must send conversationId/sessionId");
});

await test("mode compatibility covers POST /ask and the 11 mode routes via askHandler", () => {
  const m = fx.modeCompatibility;
  check(m.appliesToPostAsk === true, "applies to POST /ask");
  check(m.appliesTo12ModeRoutesViaAskHandler === true, "applies to 12 mode routes");
  check(m.centralPlacementInAskHandlerOrPipeline === true, "central placement");
});

await test("test plan includes required positive and negative cases", () => {
  const pos = fx.testPlan.positiveCases;
  const neg = fx.testPlan.negativeCases;
  check(Array.isArray(pos) && pos.length >= 6, ">=6 positive cases");
  check(pos.some((c) => /fresh frozen seafood/i.test(c.followUp)), "positive: fresh frozen seafood");
  check(pos.some((c) => c.expectInheritedIssue === "VAT"), "positive: VAT inheritance");
  check(Array.isArray(neg) && neg.length >= 5, ">=5 negative cases");
  check(neg.some((c) => c.expectApplied === false), "negative: not applied");
});

await test("future patch sequence includes scaffold, pipeline wiring, and staging smoke", () => {
  const ids = fx.futurePatchSequence.map((p) => p.id);
  check(ids.some((x) => x.includes("SCAFFOLD-1")), "scaffold patch");
  check(ids.some((x) => x.includes("PIPELINE-WIRING-1")), "pipeline wiring patch");
  check(ids.some((x) => x.includes("STAGING-SMOKE-1")), "staging smoke patch");
});

await test("risks include wrong inheritance, stale context, privacy exposure, frontend gap, retrieval drift", () => {
  const r = fx.risks.join(" | ").toLowerCase();
  check(r.includes("wrong issue inheritance"), "risk: wrong inheritance");
  check(r.includes("stale context"), "risk: stale context");
  check(r.includes("privacy/logging exposure"), "risk: privacy exposure");
  check(r.includes("frontend not sending conversationid"), "risk: frontend gap");
  check(r.includes("retrieval drift"), "risk: retrieval drift");
});

await test("prohibited claims block runtime-fixed, memory-active, Phase 9 started, frontend confirmed, tenant isolation implemented", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["the runtime issue is fixed", "persistent memory is active", "phase 9 started", "frontend behavior is confirmed", "tenant isolation is implemented", "production-ready context carryover exists"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("this test performs no HTTP, imports no runtime modules, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-design-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../ask-handler.js", "../pipeline.js", "../routes", "supabase", "openai", "langfuse", "node:http", "node:https", "undici", "node-fetch"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/\bfetch\s*\(|https?\.request\s*\(|https?\.get\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
