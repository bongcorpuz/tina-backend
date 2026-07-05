// PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-DOMAIN-BOUNDARY-REMEDIATION-1 - test.
// Imports the PURE helper only. Does NOT import pipeline.js/ask-handler/server or
// the services boundary (all have module-load side effects / read env). Performs
// no HTTP, calls no external service, requires no env vars, prints no env values.
// It validates the fixture, mirrors the effective-query resolution using the pure
// helper, and statically verifies the pipeline.js boundary remediation.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { buildShortTermContextCarryover } from "../helpers/chat-context-carryover.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-pipeline-domain-boundary-remediation-1.fixture.json";
const PIPELINE_PATH = "pipeline.js";

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

// Mirror of the pipeline effective-query resolution via the pure helper.
function effectiveQueryFor(enabled, currentQuery, recentTurns) {
  const original = String(currentQuery == null ? "" : currentQuery);
  if (!enabled) return { effectiveQuery: original, applied: false };
  const decision = buildShortTermContextCarryover({ currentQuery: original, recentTurns, maxRewriteTurns: 6, jurisdictionDefault: "Philippines" });
  return { effectiveQuery: decision.applied ? decision.standaloneQuery : original, applied: decision.applied };
}

let fx;
let pipelineSrc;

await test("fixture exists and is valid JSON; helper imports; pipeline.js exists", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(typeof buildShortTermContextCarryover === "function", "helper import works");
  check(existsSync(resolve(PIPELINE_PATH)), "pipeline.js exists");
  pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
});

await test("required fixture sections exist and patch id/decision are correct", () => {
  const required = [
    "patch", "decision", "baseCommit", "remediationVersion", "runtimePatch", "featureFlag", "phaseStatus",
    "logEvidence", "rootCause", "modifiedRuntimeFiles", "remediationContract", "beforeBehavior",
    "afterBehavior", "flagOffBehavior", "flagOnBehavior", "pipelineBoundaryQueryFlow", "safetyControls",
    "sourceAuthorityDiscipline", "securityPrivacyControls", "runtimeWiringStatus", "liveBehaviorStatus",
    "stagingStatus", "productionStatus", "testPlan", "risks", "prohibitedClaims", "validationMatrix",
    "testCases", "nextTask"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-DOMAIN-BOUNDARY-REMEDIATION-1", "patch id");
  check(/PIPELINE DOMAIN BOUNDARY REMEDIATION PASS WITH STRICT RECOMMENDATIONS|INCONCLUSIVE|BLOCKED/.test(fx.decision), "valid decision");
});

await test("log evidence records route boundary success and pipeline boundary failure", () => {
  const e = fx.logEvidence;
  check(e.routeBoundarySuccess === true && e.routeBoundaryDecision === "ALLOW", "route boundary allowed");
  check(e.routeBoundaryQuery.includes("VAT") && e.routeBoundaryQuery.includes("Philippines"), "route boundary standalone query");
  check(e.pipelineBoundaryFailure === true && e.pipelineBoundaryDecisionBefore === "REJECT", "pipeline boundary rejected");
  check(e.pipelineBoundaryReasonBefore === "fail_closed_no_tax_signal", "pipeline reject reason");
  check(e.rootCause === "PIPELINE_DOMAIN_BOUNDARY_CONTEXT_GAP" && fx.rootCause === "PIPELINE_DOMAIN_BOUNDARY_CONTEXT_GAP", "root cause");
});

await test("feature flag is TINA_ENABLE_CHAT_CONTEXT_CARRYOVER; runtime patch non-invasive", () => {
  check(fx.featureFlag.name === "TINA_ENABLE_CHAT_CONTEXT_CARRYOVER", "flag name");
  check(fx.featureFlag.default === false && fx.featureFlag.productionExpected === false && fx.featureFlag.envChanged === false, "flag default/prod/env");
  const r = fx.runtimePatch;
  check(r.noEnvChanges === true && r.noPackageChanges === true && r.noDbSupabaseChanges === true && r.noPersistentMemory === true && r.noPhase9 === true, "no env/package/DB/memory/Phase 9");
});

await test("modified runtime files limited to pipeline.js", () => {
  check(Array.isArray(fx.modifiedRuntimeFiles) && fx.modifiedRuntimeFiles.length === 1 && fx.modifiedRuntimeFiles[0] === "pipeline.js", "only pipeline.js");
  check(fx.unmodifiedRuntimeFiles.includes("ask-handler.js") && fx.unmodifiedRuntimeFiles.includes("server.js"), "ask-handler/server unmodified");
});

await test("before/after behavior and runtime wiring status recorded", () => {
  check(fx.beforeBehavior.pipelineBoundaryRejectedRawQuery === true, "before: raw query rejected");
  check(fx.afterBehavior.pipelineBoundaryEvaluatesEffectiveQueryWhenCarryoverApplies === true, "after: effective query evaluated");
  const w = fx.runtimeWiringStatus;
  check(w.pipelineDomainBoundaryUsesEffectiveQuery === true, "pipeline boundary uses effective query");
  check(w.pipelineBoundaryStillRuns === true, "pipeline boundary still runs");
  check(w.classificationUsesEffectiveQuery === true && w.retrievalUsesEffectiveQuery === true, "classification/retrieval aligned");
  check(w.liveBehaviorChangedByDefault === false && w.featureFlagDefaultEnabled === false, "no default change");
});

await test("flow places effectiveQuery resolution before the pipeline boundary", () => {
  const flow = fx.pipelineBoundaryQueryFlow.map((s) => s.toLowerCase());
  const idxResolve = flow.findIndex((s) => s.includes("effectivequery resolved"));
  const idxBoundary = flow.findIndex((s) => s.includes("pipeline domain boundary evaluates effectivequery"));
  check(idxResolve >= 0 && idxBoundary >= 0 && idxResolve < idxBoundary, "effectiveQuery resolved before boundary");
});

await test("flag-OFF: effective query equals raw query (boundary unchanged)", () => {
  const off = effectiveQueryFor(false, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(off.effectiveQuery === "How about fresh frozen seafood?", "OFF effective query equals raw");
  check(fx.flagOffBehavior.effectiveQueryEqualsRawQuery === true, "fixture records OFF passthrough");
});

await test("flag-ON: effective query is the standalone VAT query fed to the boundary", () => {
  const on = effectiveQueryFor(true, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(on.applied === true, "ON applied");
  check(on.effectiveQuery.toLowerCase().includes("fresh frozen seafood") && on.effectiveQuery.includes("VAT") && on.effectiveQuery.includes("Philippines"), "standalone VAT query");
});

await test("safety controls and source authority discipline preserved", () => {
  const s = fx.safetyControls;
  check(s.noBypass === true && s.boundaryStillRuns === true && s.nonTaxStillRejected === true && s.noContextFollowUpNotAutoAllowed === true && s.resetNotInherited === true && s.jurisdictionSwitchNotInherited === true, "safety controls");
  const a = fx.sourceAuthorityDiscipline;
  check(a.noCitationsFromHistory === true && a.retrievalStillFindsIndexedAuthorities === true && a.saeSourceCardsUnchanged === true, "authority discipline");
});

await test("security/privacy controls; staging smoke rerun required; production off", () => {
  const p = fx.securityPrivacyControls;
  check(p.noPersistentMemory === true && p.noMemoryFlags === true && p.noRawRecentTurnsLogging === true, "security controls");
  check(fx.stagingStatus.smokeRerunRequired === true, "staging smoke rerun required");
  check(fx.productionStatus.productionFlagEnabled === false, "production flag off");
});

await test("prohibited claims block production fixed and staging smoke passed", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production is fixed", "the staging smoke passed after this patch", "all follow-ups are guaranteed", "phase 9 started", "persistent memory is active"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

// ── Static source verification of pipeline.js remediation ────────────────────────
await test("pipeline.js still contains both pipeline boundary log markers", () => {
  check(pipelineSrc.includes("[PIPELINE DOMAIN BOUNDARY CHECK]"), "PIPELINE DOMAIN BOUNDARY CHECK present");
  check(pipelineSrc.includes("[PIPELINE DOMAIN BOUNDARY BLOCKED]"), "PIPELINE DOMAIN BOUNDARY BLOCKED present");
});

await test("pipeline.js boundary evaluates effectiveQuery (not the raw query) and still blocks", () => {
  check(/detectPhilippineTaxBoundary\(\s*effectiveQuery\s*\|\|\s*""\s*,/.test(pipelineSrc), "boundary uses effectiveQuery");
  check(!/detectPhilippineTaxBoundary\(\s*query\s*\|\|\s*""\s*,\s*hook\s*\|\|\s*"\/ask"\s*\)/.test(pipelineSrc), "boundary no longer uses raw query");
  // Boundary must still run and still block on REJECT/CLARIFY.
  check(/_pipelineBoundaryCheck\.decision\s*===\s*"REJECT"/.test(pipelineSrc), "boundary still rejects");
});

await test("pipeline.js does not log raw recent turns and introduces no memory flag", () => {
  check(!/console\.(log|error|warn|info)\([^)]*(conversationHistory|recentTurns|priorMessages|_ccRecentTurns)/.test(pipelineSrc), "no raw recent-turns logging");
  check(!pipelineSrc.includes("TINA_ENABLE_MEMORY"), "no TINA_ENABLE_MEMORY_* introduced");
});

await test("this test imports no runtime modules, performs no HTTP, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-pipeline-domain-boundary-remediation-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../pipeline.js", "../ask-handler.js", "../server.js", "../routes", "../services/", "supabase", "openai", "langfuse", "node:http", "node:https"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/[^"'`.\w]fetch\s*\(|[^"'`.\w]https?\.(request|get)\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-DOMAIN-BOUNDARY-REMEDIATION-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
