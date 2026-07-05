// PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1 - wiring test.
// Imports the PURE helper only. Does NOT import ask-handler.js/pipeline.js/server
// or the services boundary (all have module-load side effects / read env).
// Performs no HTTP, calls no external service, requires no env vars, prints no env.
// It validates the fixture, mirrors the boundary-query resolution using the pure
// helper, and statically verifies the ask-handler.js domain-boundary wiring.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { buildShortTermContextCarryover } from "../helpers/chat-context-carryover.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-domain-boundary-wiring-1.fixture.json";
const ASK_HANDLER_PATH = "ask-handler.js";

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

// Mirror of the ask-handler domain-boundary resolution: when enabled and applied,
// the boundary query becomes the standaloneQuery; otherwise the original query.
function boundaryQueryFor(enabled, currentQuery, recentTurns) {
  const original = String(currentQuery == null ? "" : currentQuery);
  if (!enabled) return { boundaryQuery: original, applied: false };
  const decision = buildShortTermContextCarryover({ currentQuery: original, recentTurns, maxRewriteTurns: 6, jurisdictionDefault: "Philippines" });
  return { boundaryQuery: decision.applied ? decision.standaloneQuery : original, applied: decision.applied, decision };
}

let fx;
let askSrc;

await test("fixture exists and is valid JSON; helper imports; ask-handler.js exists", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(typeof buildShortTermContextCarryover === "function", "helper import works");
  check(existsSync(resolve(ASK_HANDLER_PATH)), "ask-handler.js exists");
  askSrc = readFileSync(resolve(ASK_HANDLER_PATH), "utf8");
});

await test("required fixture sections exist and patch id/decision are correct", () => {
  const required = [
    "patch", "decision", "baseCommit", "wiringVersion", "runtimePatch", "featureFlag", "phaseStatus",
    "logEvidence", "scaffoldIntegration", "pipelineWiringIntegration", "modifiedRuntimeFiles",
    "domainBoundaryProblem", "domainBoundaryWiringContract", "flagOffBehavior", "flagOnBehavior",
    "domainBoundaryQueryFlow", "allowRejectRules", "safeTraceContract", "sourceAuthorityDiscipline",
    "securityPrivacyControls", "runtimeWiringStatus", "liveBehaviorStatus", "stagingStatus",
    "productionStatus", "frontendContractStatus", "testPlan", "risks", "prohibitedClaims",
    "validationMatrix", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1", "patch id");
  check(/DOMAIN BOUNDARY WIRING PASS WITH STRICT RECOMMENDATIONS|INCONCLUSIVE|BLOCKED/.test(fx.decision), "valid decision");
});

await test("feature flag is TINA_ENABLE_CHAT_CONTEXT_CARRYOVER, default false, not enabled", () => {
  const f = fx.featureFlag;
  check(f.name === "TINA_ENABLE_CHAT_CONTEXT_CARRYOVER", "flag name");
  check(f.default === false, "default false");
  check(f.productionEnabled === false && f.stagingEnabled === false && f.envChanged === false, "not enabled anywhere");
});

await test("log evidence records fail_closed_no_tax_signal and pipelineReached false", () => {
  const e = fx.logEvidence;
  check(e.domainBoundaryCheck.reason === "fail_closed_no_tax_signal", "reason recorded");
  check(e.pipelineReached === false && e.retrievalReached === false && e.openAIReached === false, "nothing reached");
  check(e.rootCause === "DOMAIN_BOUNDARY_CONTEXT_GAP", "root cause");
  check(e.sessionIdPresentInRouteLog === true, "sessionId present in route log");
});

await test("runtime patch declaration says live behavior unchanged by default; only ask-handler.js modified", () => {
  check(fx.runtimePatch.liveBehaviorUnchangedByDefault === true, "live behavior unchanged by default");
  check(fx.runtimeWiringStatus.domainBoundaryWired === true, "domain boundary wired");
  check(fx.runtimeWiringStatus.pipelineWiredAlready === true, "pipeline wired already");
  check(fx.runtimeWiringStatus.featureFlagDefaultEnabled === false, "flag default disabled");
  check(fx.runtimeWiringStatus.liveBehaviorChangedByDefault === false, "live behavior unchanged");
  check(Array.isArray(fx.modifiedRuntimeFiles) && fx.modifiedRuntimeFiles.length === 1 && fx.modifiedRuntimeFiles[0] === "ask-handler.js", "only ask-handler.js modified");
  check(fx.unmodifiedRuntimeFiles.includes("pipeline.js") && fx.unmodifiedRuntimeFiles.includes("server.js"), "pipeline.js/server.js unmodified");
});

await test("integrations reference pipeline-wiring 16b35fe and scaffold ff07be7", () => {
  check(fx.pipelineWiringIntegration.pipelineWiringCommit === "16b35fe", "pipeline wiring commit");
  check(fx.scaffoldIntegration.scaffoldCommit === "ff07be7", "scaffold commit");
  check(fx.pipelineWiringIntegration.flagParserReusedFromPipeline === "isChatContextCarryoverEnabled", "flag parser reused");
});

await test("flag-OFF: boundary query equals original current query", () => {
  const off = boundaryQueryFor(false, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(off.boundaryQuery === "How about fresh frozen seafood?", "OFF boundary query equals original");
  check(off.applied === false, "OFF not applied");
  check(fx.flagOffBehavior.domainBoundaryEvaluatesOriginalCurrentQuery === true, "fixture records OFF passthrough");
});

await test("flag-ON eligible: VAT follow-up => standalone boundary query (VAT + Philippines)", () => {
  const on = boundaryQueryFor(true, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(on.applied === true, "ON applied");
  check(on.boundaryQuery !== "How about fresh frozen seafood?", "boundary query rewritten");
  check(on.boundaryQuery.toLowerCase().includes("fresh frozen seafood"), "includes subject");
  check(on.boundaryQuery.includes("VAT"), "includes VAT");
  check(on.boundaryQuery.includes("Philippines"), "includes Philippines");
});

await test("flag-ON ineligible: non-tax/reset/jurisdiction-switch not inherited (boundary query stays original)", () => {
  const weather = boundaryQueryFor(true, "What is the weather?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(weather.applied === false && weather.boundaryQuery === "What is the weather?", "non-tax not inherited");
  const reset = boundaryQueryFor(true, "Forget VAT, explain EWT.", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(reset.applied === false && reset.boundaryQuery === "Forget VAT, explain EWT.", "reset not inherited");
  const juris = boundaryQueryFor(true, "In the US, how is this taxed?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(juris.applied === false && juris.boundaryQuery === "In the US, how is this taxed?", "jurisdiction switch not inherited");
  const noCtx = boundaryQueryFor(true, "How about fresh frozen seafood?", []);
  check(noCtx.applied === false && noCtx.boundaryQuery === "How about fresh frozen seafood?", "no prior context not auto-allowed");
});

await test("query flow places carryover resolution before the boundary check", () => {
  const flow = fx.domainBoundaryQueryFlow.map((s) => s.toLowerCase());
  const idxResolve = flow.findIndex((s) => s.includes("resolve domainboundaryquery"));
  const idxCheck = flow.findIndex((s) => s.includes("run existing detectphilippinetaxboundary"));
  check(idxResolve >= 0 && idxCheck >= 0 && idxResolve < idxCheck, "carryover resolved before boundary check");
});

await test("allow/reject rules and source authority discipline preserved", () => {
  const r = fx.allowRejectRules;
  check(r.nonTaxRejected === true && r.resetNotInherited === true && r.jurisdictionSwitchNotInherited === true && r.standaloneMustItselfPassBoundary === true, "reject controls");
  const a = fx.sourceAuthorityDiscipline;
  check(a.noCitationsFromHistory === true && a.saeSourceCardsUnchanged === true && a.domainBoundaryCarryoverOnlyDeterminesReachability === true, "authority discipline");
});

await test("safe trace excludes raw recent turns; security/privacy preserved", () => {
  check(fx.safeTraceContract.noRawRecentTurns === true && fx.safeTraceContract.noPriorMessageContents === true, "safe trace");
  const s = fx.securityPrivacyControls;
  check(s.noPersistentMemory === true && s.noMemoryFlags === true && s.noRawRecentTurnsLogging === true && s.historyReadOnlyAndBounded === true, "security controls");
});

await test("frontend not fully verified; staging/production not enabled; live issue not fixed", () => {
  check(fx.frontendContractStatus.frontendFullyVerifiedInRepo === false, "frontend not verified");
  check(fx.stagingStatus.stagingFlagEnabled === false && fx.productionStatus.productionFlagEnabled === false, "not enabled");
  check(fx.liveBehaviorStatus.liveIssueFixed === false, "live issue not fixed");
});

await test("prohibited claims block production/staging fixed, bypass, live default change, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production is fixed", "staging is fixed", "live behavior changed by default", "the domain boundary is bypassed", "phase 9 started", "persistent memory is active"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

// ── Static source verification of ask-handler.js domain-boundary wiring ──────────
await test("ask-handler.js imports the helper + flag parser and resolves a flag-gated boundary query", () => {
  check(/import\s*\{[^}]*isChatContextCarryoverEnabled[^}]*\}\s*from\s*["']\.\/pipeline\.js["']/.test(askSrc), "imports isChatContextCarryoverEnabled from pipeline.js");
  check(/import\s*\{\s*buildShortTermContextCarryover\s*\}\s*from\s*["']\.\/helpers\/chat-context-carryover\.js["']/.test(askSrc), "imports buildShortTermContextCarryover from helper");
  check(askSrc.includes("isChatContextCarryoverEnabled()"), "flag parser invoked");
  check(/_boundaryQuery\s*=\s*_ccBoundaryDecision\.standaloneQuery/.test(askSrc), "boundary query set to standaloneQuery when applied");
});

await test("ask-handler.js still calls the real boundary (no unconditional bypass) and gates the fetch on flag + conversationId", () => {
  check(/detectPhilippineTaxBoundary\(_boundaryQuery,/.test(askSrc), "boundary still evaluated on effective query");
  check(/if\s*\(\s*isChatContextCarryoverEnabled\(\)\s*&&\s*conversationId\s*\)/.test(askSrc), "history fetch gated on flag ON + conversationId");
  check(/getHistory\(supabase,\s*conversationId,\s*20\)/.test(askSrc), "bounded read-only getHistory reuse");
  // Applied only conditionally — no unconditional rewrite.
  check(/if\s*\(\s*_ccBoundaryDecision\.applied\s*\)/.test(askSrc), "rewrite applied only when decision.applied");
});

await test("ask-handler.js does not log raw recent turns and introduces no memory flag", () => {
  check(!/console\.(log|error|warn|info)\([^)]*(_ccRecentTurns|recentTurns|conversationHistory|priorMessages)/.test(askSrc), "no raw recent-turns logging");
  check(!askSrc.includes("TINA_ENABLE_MEMORY"), "no TINA_ENABLE_MEMORY_* introduced");
});

await test("this test imports no runtime modules, performs no HTTP, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-domain-boundary-wiring-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../ask-handler.js", "../pipeline.js", "../server.js", "../routes", "../services/", "supabase", "openai", "langfuse", "node:http", "node:https"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/[^"'`.\w]fetch\s*\(|[^"'`.\w]https?\.(request|get)\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
