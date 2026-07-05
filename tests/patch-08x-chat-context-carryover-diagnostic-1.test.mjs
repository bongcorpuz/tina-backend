// PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1 - diagnostic evidence test.
// Static, JSON- and source-text-based validation only. Performs NO HTTP, does
// NOT start the server, imports no server.js/runtime modules, requires no env
// vars, and prints no env values. It validates the diagnostic fixture and
// statically cross-checks the key code facts it asserts.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-diagnostic-1.fixture.json";

const VALID_DECISIONS = [
  "CHAT CONTEXT CARRYOVER DIAGNOSTIC PASS WITH FINDINGS",
  "CHAT CONTEXT CARRYOVER DIAGNOSTIC INCONCLUSIVE",
  "CHAT CONTEXT CARRYOVER DIAGNOSTIC BLOCKED"
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

let fx;

await test("diagnostic fixture exists and is valid JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("required top-level sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "diagnosticVersion", "nonRuntimePatch", "phaseStatus",
    "sourceFilesInspected", "routeInventory", "requestSchemaFindings", "conversationPersistenceFindings",
    "frontendContractFindings", "issueClassificationFindings", "retrievalQueryFindings",
    "promptAssemblyFindings", "observedBehaviorCase", "expectedBehaviorCase", "rootCauseClassification",
    "evidenceStrength", "risks", "nonMemoryBoundary", "phase8SBoundary", "phase9Implications",
    "futureFixOptions", "recommendedNextPatch", "prohibitedClaims", "validationMatrix", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
});

await test("patch id and decision are correct", () => {
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("patch is marked non-runtime", () => {
  check(fx.nonRuntimePatch === true, "nonRuntimePatch true");
  const d = fx.nonRuntimeDeclaration;
  for (const f of ["noRuntimeChange", "noDeployment", "noPackageChange", "noEnvChange", "noDbSupabaseChange", "noMemoryEnablement", "noPhase9Implementation"]) {
    check(d[f] === true, `${f} must be true`);
  }
});

await test("phase status: Phase 8 closed, Phase 8S closed, Phase 9 not started, memory inactive", () => {
  const p = fx.phaseStatus;
  check(p.phase8Closed === true, "Phase 8 closed");
  check(p.phase8SClosed === true, "Phase 8S closed");
  check(p.phase9NotStarted === true, "Phase 9 not started");
  check(p.phase8MemoryInactive === true, "Phase 8 memory inactive");
});

await test("observed behavior case includes tobacco VAT and fresh frozen seafood follow-up", () => {
  const o = fx.observedBehaviorCase;
  check(/tobacco/i.test(o.turn1) && /VAT/i.test(o.turn1), "turn1 tobacco VAT");
  check(/fresh frozen seafood/i.test(o.turn2Followup), "turn2 fresh frozen seafood");
  check(o.expectedInheritedIssue === "VAT", "expected inherited issue VAT");
  check(/fresh frozen seafood/i.test(o.expectedStandaloneRewrite) && /VAT/i.test(o.expectedStandaloneRewrite), "standalone rewrite present");
});

await test("source files inspected are listed and exist", () => {
  check(Array.isArray(fx.sourceFilesInspected) && fx.sourceFilesInspected.length >= 5, "source files listed");
  for (const f of ["ask-handler.js", "pipeline.js", "issue-classification-engine.js", "retrieval-engine.js", "context-orchestration-engine.js", "conversation-memory.js"]) {
    check(fx.sourceFilesInspected.includes(f), `must list ${f}`);
    check(existsSync(resolve(f)), `${f} must exist`);
  }
});

await test("route inventory, request schema, and persistence findings exist", () => {
  check(Array.isArray(fx.routeInventory) && fx.routeInventory.length > 0, "route inventory present");
  check(fx.requestSchemaFindings.acceptsConversationId === true, "accepts conversationId");
  check(fx.requestSchemaFindings.acceptsMessagesArray === false, "does not accept messages[]");
  check(fx.conversationPersistenceFindings.messagesPersisted === true, "messages persisted");
  check(fx.conversationPersistenceFindings.connectedToClassificationOrRetrieval === false, "not connected to classification/retrieval");
});

await test("frontend contract findings record that the frontend is not in the backend repo", () => {
  check(fx.frontendContractFindings.frontend_not_in_backend_repo === true, "frontend not in backend repo");
  check(fx.frontendContractFindings.frontendInspected === false, "frontend not inspected");
});

await test("classification and retrieval findings are current-query-only; prompt is context-aware", () => {
  check(fx.issueClassificationFindings.receivesCurrentQueryOnly === true, "classification current-query-only");
  check(fx.issueClassificationFindings.classification === "current_query_only", "classification tag");
  check(fx.retrievalQueryFindings.basedOnCurrentMessageOnly === true, "retrieval current-query-only");
  check(fx.retrievalQueryFindings.usesCondensedStandaloneQuestion === false, "no standalone rewrite");
  check(fx.promptAssemblyFindings.includesPreviousTurns === true, "prompt includes previous turns");
});

await test("root cause classification and evidence strength are present and valid", () => {
  check(Array.isArray(fx.rootCauseClassification) && fx.rootCauseClassification.length >= 1, "root cause present");
  const allowed = ["FRONTEND_ONLY", "BACKEND_ONLY", "FRONTEND_AND_BACKEND", "BACKEND_DESIGN_GAP", "REQUEST_CONTRACT_GAP", "CLASSIFICATION_CONTEXT_GAP", "RETRIEVAL_REWRITE_GAP", "PROMPT_CONTEXT_GAP", "CONVERSATION_PERSISTENCE_DISCONNECTED", "INCONCLUSIVE"];
  for (const c of fx.rootCauseClassification) check(allowed.includes(c), `valid root cause: ${c}`);
  check(fx.rootCauseClassification.includes("CLASSIFICATION_CONTEXT_GAP"), "includes CLASSIFICATION_CONTEXT_GAP");
  check(fx.rootCauseClassification.includes("RETRIEVAL_REWRITE_GAP"), "includes RETRIEVAL_REWRITE_GAP");
  check(["strong", "moderate", "weak", "inconclusive"].includes(fx.evidenceStrength), "valid evidence strength");
});

await test("non-memory boundary states no persistent memory and all flags disabled", () => {
  const m = fx.nonMemoryBoundary;
  check(m.solveWithBoundedShortTermContextNotPersistentMemory === true, "bounded short-term, not persistent memory");
  check(m.noTinaEnableMemoryFlags === true, "no TINA_ENABLE_MEMORY_* flags");
  check(m.noMemoryDb === true, "no memory DB");
  for (const flag of ["TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY", "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"]) {
    check(m.memoryFlagsMustRemainDisabled.includes(flag), `flag ${flag} listed disabled`);
  }
});

await test("Phase 8S boundary states Phase 8S remains closed and not a security issue", () => {
  check(fx.phase8SBoundary.isSecurityClosureIssue === false, "not a security closure issue");
  check(fx.phase8SBoundary.phase8SRemainsClosed === true, "Phase 8S remains closed");
  check(fx.phase8SBoundary.phase8SFutureSecurityItemsRemainTracked === true, "future security items tracked");
});

await test("Phase 9 implications include professional workflow quality dependence", () => {
  check(fx.phase9Implications.phase9WorkflowQualityDependsOnFollowUpContext === true, "workflow quality dependence");
  check(fx.phase9Implications.doesNotPermitClientMatterPersistenceWithoutTenantIsolation === true, "no client/matter persistence without isolation");
});

await test("future fix options include the three required options", () => {
  const ids = fx.futureFixOptions.map((o) => o.id);
  check(ids.includes("OPTION_A_API_RECENT_TURNS"), "Option A API recentTurns/messages");
  check(ids.includes("OPTION_B_CONVERSATION_ID_SERVER_FETCH"), "Option B conversationId server fetch");
  check(ids.includes("OPTION_C_FOLLOWUP_REWRITE_HELPER"), "Option C follow-up rewrite helper");
  for (const o of fx.futureFixOptions) {
    check(typeof o.description === "string" && Array.isArray(o.benefits) && Array.isArray(o.risks), `${o.id} has description/benefits/risks`);
  }
});

await test("recommended next patch exists and begins with PATCH-08X-CHAT-CONTEXT-CARRYOVER", () => {
  check(typeof fx.recommendedNextPatch === "string" && fx.recommendedNextPatch.startsWith("PATCH-08X-CHAT-CONTEXT-CARRYOVER"), "recommended next patch prefix");
});

await test("prohibited claims block persistent-memory-required, memory-active, Phase 9 started, runtime fixed", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["persistent memory is required", "memory is active", "phase 9 started", "the runtime issue is fixed"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

// ── Static source cross-checks confirming the diagnostic's key code facts ──────
await test("static: issue-classification and retrieval engines contain no conversationHistory references", () => {
  const cls = readFileSync(resolve("issue-classification-engine.js"), "utf8");
  const ret = readFileSync(resolve("retrieval-engine.js"), "utf8");
  check(!/conversationHistory|priorMessages/.test(cls), "classifier has no conversationHistory/priorMessages");
  check(!/conversationHistory|priorMessages/.test(ret), "retrieval has no conversationHistory/priorMessages");
});

await test("static: ask-handler fetches history gated on conversationId; prompt engine uses conversationHistory", () => {
  const ah = readFileSync(resolve("ask-handler.js"), "utf8");
  check(/getHistory\(/.test(ah), "ask-handler calls getHistory");
  check(/conversationId\s*\?\s*await getHistory/.test(ah) || /conversationId[\s\S]{0,80}getHistory/.test(ah), "getHistory gated on conversationId");
  check(/conversationHistory\s*:\s*priorMessages/.test(ah), "priorMessages passed as conversationHistory");
  const coe = readFileSync(resolve("context-orchestration-engine.js"), "utf8");
  check(/conversationHistory/.test(coe), "context-orchestration-engine uses conversationHistory");
});

await test("this test performs no HTTP, imports no runtime modules, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-diagnostic-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../ask-handler.js", "../pipeline.js", "../routes", "supabase", "openai", "langfuse", "node:http", "node:https", "undici", "node-fetch"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/\bfetch\s*\(|https?\.request\s*\(|https?\.get\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-DIAGNOSTIC-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
