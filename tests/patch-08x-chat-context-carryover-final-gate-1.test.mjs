// PATCH-08X-CHAT-CONTEXT-CARRYOVER-FINAL-GATE-1 - closure gate test.
// Static, JSON-based validation only. Performs NO HTTP, imports no runtime
// modules, requires no env vars, prints no env values. Validates the closure
// fixture only.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-final-gate-1.fixture.json";
const REQUIRED_COMMITS = ["38d5b9e", "dae4128", "ff07be7", "16b35fe", "56b20f3", "d77e811"];
const VALID_DECISIONS = [
  "CHAT CONTEXT CARRYOVER FINAL GATE PASS WITH STRICT RECOMMENDATIONS",
  "CHAT CONTEXT CARRYOVER FINAL GATE WARNING WITH STRICT RECOMMENDATIONS",
  "CHAT CONTEXT CARRYOVER FINAL GATE BLOCKED"
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

await test("closure fixture exists and is valid JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

await test("required top-level sections exist; patch id and decision are valid", () => {
  const required = [
    "patch", "decision", "baseCommit", "closureVersion", "nonRuntimePatch", "phaseStatus",
    "featureFlag", "evidenceLedger", "problemHistory", "implementedFixes", "finalRuntimeState",
    "stagingObservation", "limitations", "sourceAuthorityDiscipline", "securityPrivacyControls",
    "nonPhilippineTaxBoundary", "memoryBoundary", "phaseBoundaries", "productionReadiness",
    "closureCriteria", "strictRecommendations", "prohibitedClaims", "validationMatrix", "testCases", "nextTask"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-FINAL-GATE-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

await test("non-runtime declaration and feature flag posture", () => {
  const d = fx.nonRuntimeDeclaration;
  check(d.noRuntimeFilesChanged === true && d.noEnvFilesChanged === true && d.noDeploymentPerformed === true && d.noMemoryEnablement === true && d.noPhase9Implementation === true, "non-runtime declaration");
  const f = fx.featureFlag;
  check(f.name === "TINA_ENABLE_CHAT_CONTEXT_CARRYOVER", "flag name");
  check(f.default === false, "flag default false");
  check(f.productionEnabled === false, "production not enabled");
});

await test("evidence ledger includes all six 08X commits", () => {
  const commits = fx.evidenceLedger.map((e) => e.commit);
  for (const c of REQUIRED_COMMITS) check(commits.includes(c), `evidence ledger must include ${c}`);
});

await test("problem history includes all four root causes", () => {
  const rc = fx.problemHistory.discoveredRootCauses;
  for (const cause of ["CLASSIFICATION_CONTEXT_GAP", "RETRIEVAL_REWRITE_GAP", "DOMAIN_BOUNDARY_CONTEXT_GAP", "PIPELINE_DOMAIN_BOUNDARY_CONTEXT_GAP"]) {
    check(rc.includes(cause), `root cause ${cause} recorded`);
  }
  check(/tobacco/i.test(fx.problemHistory.originalSymptom.turn1) && /fresh frozen seafood/i.test(fx.problemHistory.originalSymptom.turn2Followup), "original symptom recorded");
});

await test("implemented fixes include route boundary, pipeline boundary, classification, and retrieval effectiveQuery", () => {
  const im = fx.implementedFixes;
  check(im.routeLevelDomainBoundaryUsesEffectiveQuery === true, "route boundary effectiveQuery");
  check(im.pipelineBoundaryUsesEffectiveQuery === true, "pipeline boundary effectiveQuery");
  check(im.classificationUsesEffectiveQuery === true, "classification effectiveQuery");
  check(im.retrievalUsesEffectiveQuery === true, "retrieval effectiveQuery");
  check(im.finalAnswerPreservesOriginalQuery === true, "original query preserved");
  check(im.nonTaxControlsRemainFailClosed === true, "non-tax controls fail-closed");
});

await test("final runtime state flags are all set correctly", () => {
  const s = fx.finalRuntimeState;
  check(s.routeBoundaryUsesCarryover === true, "routeBoundaryUsesCarryover");
  check(s.pipelineBoundaryUsesEffectiveQuery === true, "pipelineBoundaryUsesEffectiveQuery");
  check(s.classificationUsesEffectiveQuery === true, "classificationUsesEffectiveQuery");
  check(s.retrievalUsesEffectiveQuery === true, "retrievalUsesEffectiveQuery");
  check(s.finalAnswerPreservesOriginalQuery === true, "finalAnswerPreservesOriginalQuery");
  check(s.sourceAuthorityUnchanged === true, "sourceAuthorityUnchanged");
  check(s.memoryUsed === false && s.persistentMemoryEnabled === false, "memory not used");
  check(s.phase9Started === false, "phase9 not started");
});

await test("staging observation records user-observed success, not a full log artifact", () => {
  const o = fx.stagingObservation;
  check(o.userObservedStagingSuccess === true, "user-observed success");
  check(o.formalLogBackedRerunCommitted === false, "formal log rerun not committed");
  check(o.classification === "user_observed_success_not_full_log_artifact", "classified as user-observed");
});

await test("limitations include production flag OFF and formal logs not separately committed", () => {
  const lim = fx.limitations.join(" | ").toLowerCase();
  check(lim.includes("formal staging smoke rerun logs were not committed"), "logs not committed limitation");
  check(lim.includes("production flag remains off"), "production flag off limitation");
});

await test("source authority, security/privacy, memory, and non-PH-tax boundary sections are intact", () => {
  const a = fx.sourceAuthorityDiscipline;
  check(a.noCitationsFromHistory === true && a.retrievalSourceAvailabilityStillRequired === true && a.saeSourceCardsUnchanged === true, "authority discipline");
  const s = fx.securityPrivacyControls;
  check(s.noPersistentMemory === true && s.noMemoryFlags === true && s.boundedRecentTurnsOnly === true, "security controls");
  check(fx.memoryBoundary.memoryInactive === true && fx.memoryBoundary.persistentMemoryEnabled === false, "memory inactive");
  const n = fx.nonPhilippineTaxBoundary;
  check(n.tinaRemainsConstrainedToPhilippineTax === true && n.unrelatedNonTaxQuestionsRemainRejected === true && n.carryoverDoesNotOverrideResetOrJurisdictionSwitchControls === true, "non-PH-tax boundary");
});

await test("production readiness says not ready and not enabled", () => {
  check(fx.productionReadiness.productionReady === false, "productionReady false");
  check(fx.productionReadiness.productionFlagEnabled === false, "productionFlagEnabled false");
  check(Array.isArray(fx.productionReadiness.productionRequires) && fx.productionReadiness.productionRequires.length > 0, "production requirements listed");
});

await test("closure criteria include all required items", () => {
  const c = fx.closureCriteria;
  for (const key of ["diagnosticCompleted", "designCompleted", "scaffoldCompleted", "pipelineWiringCompleted", "routeBoundaryWiringCompleted", "pipelineBoundaryRemediationCompleted", "validationsPassed", "userObservedStagingSuccess", "memoryInactive", "sourceAuthorityPreserved", "phase9NotStarted", "productionNotEnabled"]) {
    check(Object.prototype.hasOwnProperty.call(c, key), `closure criteria must include ${key}`);
  }
});

await test("strict recommendations include keep production flag OFF", () => {
  const sr = fx.strictRecommendations.join(" | ").toLowerCase();
  check(sr.includes("keep the production flag off"), "keep production flag off");
  check(sr.includes("do not enable persistent memory"), "no persistent memory");
});

await test("prohibited claims block production fixed/enabled, persistent memory active, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production is fixed", "production is enabled", "persistent memory is active", "tenant isolation is implemented", "phase 9 started", "source correctness is guaranteed"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("next task recorded", () => {
  check(fx.nextTask.if08XClosed === "08X CLOSED", "08X closed marker");
  check(Array.isArray(fx.nextTask.recommendedNextOptions) && fx.nextTask.recommendedNextOptions.length >= 2, "next options recorded");
});

await test("PASS decision consistency: user-observed success, prior patches complete, production not ready, Phase 9 not started", () => {
  if (fx.decision.includes("PASS")) {
    check(fx.stagingObservation.userObservedStagingSuccess === true, "PASS requires user-observed success");
    check(fx.evidenceLedger.length >= 6, "PASS requires all prior patches");
    check(fx.productionReadiness.productionReady === false, "PASS requires production not ready");
    check(fx.productionReadiness.productionFlagEnabled === false, "PASS requires production flag off");
    check(fx.finalRuntimeState.phase9Started === false, "PASS requires Phase 9 not started");
    check(fx.memoryBoundary.memoryInactive === true, "PASS requires memory inactive");
    check(Array.isArray(fx.strictRecommendations) && fx.strictRecommendations.length > 0, "PASS requires strict recommendations");
  }
});

await test("this test imports no runtime modules, performs no HTTP, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-final-gate-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../pipeline.js", "../ask-handler.js", "../server.js", "../routes", "supabase", "openai", "langfuse", "node:http", "node:https"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/[^"'`.\w]fetch\s*\(|[^"'`.\w]https?\.(request|get)\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-FINAL-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
