// PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1 - feature-flagged wiring test.
// Imports the PURE helper only. Does NOT import pipeline.js/server.js/ask-handler
// (pipeline.js has module-load side effects and reads env), performs no HTTP,
// calls no external service, requires no env vars, and prints no env values.
// It validates the wiring fixture, mirrors the resolver semantics using the pure
// helper, and statically verifies the pipeline.js wiring in source text.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { buildShortTermContextCarryover } from "../helpers/chat-context-carryover.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-pipeline-wiring-1.fixture.json";
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

// Mirror of resolveChatContextCarryoverForPipeline's effective-query semantics,
// computed via the pure helper (so this test needs no pipeline.js import).
function effectiveQueryFor(enabled, currentQuery, recentTurns) {
  const original = String(currentQuery == null ? "" : currentQuery);
  if (!enabled) return { effectiveQuery: original, applied: false, decision: null };
  const decision = buildShortTermContextCarryover({ currentQuery: original, recentTurns, maxRewriteTurns: 6, jurisdictionDefault: "Philippines" });
  return { effectiveQuery: decision.applied ? decision.standaloneQuery : original, applied: decision.applied, decision };
}

let fx;
let pipelineSrc;

await test("wiring fixture exists and is valid JSON; helper imports", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  check(typeof buildShortTermContextCarryover === "function", "helper import works");
  check(existsSync(resolve(PIPELINE_PATH)), "pipeline.js exists");
  pipelineSrc = readFileSync(resolve(PIPELINE_PATH), "utf8");
});

await test("required fixture sections exist and patch id/decision are correct", () => {
  const required = [
    "patch", "decision", "baseCommit", "wiringVersion", "runtimePatch", "featureFlag", "phaseStatus",
    "scaffoldIntegration", "designIntegration", "diagnosticIntegration", "modifiedRuntimeFiles",
    "wiringContract", "flagOffBehavior", "flagOnBehavior", "queryFlow", "classificationIntegration",
    "retrievalIntegration", "promptIntegration", "sourceAuthorityDiscipline", "securityPrivacyControls",
    "runtimeWiringStatus", "liveBehaviorStatus", "stagingStatus", "productionStatus",
    "frontendContractStatus", "testPlan", "risks", "prohibitedClaims", "validationMatrix", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1", "patch id");
  check(/PIPELINE WIRING PASS WITH STRICT RECOMMENDATIONS|INCONCLUSIVE|BLOCKED/.test(fx.decision), "valid decision");
});

await test("feature flag is TINA_ENABLE_CHAT_CONTEXT_CARRYOVER, default false, values documented", () => {
  const f = fx.featureFlag;
  check(f.name === "TINA_ENABLE_CHAT_CONTEXT_CARRYOVER", "flag name");
  check(f.default === false, "default false");
  for (const v of ["1", "true", "on", "yes"]) check(f.enabledValues.includes(v), `enabled value ${v}`);
  for (const v of ["0", "false", "off", "no"]) check(f.disabledValues.includes(v), `disabled value ${v}`);
  check(f.productionEnabled === false && f.stagingEnabled === false && f.envChanged === false, "not enabled anywhere; env unchanged");
});

await test("runtime patch declaration says live behavior unchanged by default", () => {
  check(fx.runtimePatch.liveBehaviorUnchangedByDefault === true, "live behavior unchanged by default");
  check(fx.runtimePatch.noDeployment === true && fx.runtimePatch.noEnvChanges === true && fx.runtimePatch.noPersistentMemory === true, "no deploy/env/memory");
  check(fx.runtimeWiringStatus.runtimeWired === true, "runtimeWired true");
  check(fx.runtimeWiringStatus.liveBehaviorChangedByDefault === false, "liveBehaviorChangedByDefault false");
  check(fx.runtimeWiringStatus.featureFlagAdded === true && fx.runtimeWiringStatus.featureFlagDefaultEnabled === false, "flag added, default disabled");
  check(fx.runtimeWiringStatus.classificationUsesEffectiveQuery === true && fx.runtimeWiringStatus.retrievalUsesEffectiveQuery === true, "classification/retrieval use effective query");
});

await test("phase status and integrations reference scaffold/design/diagnostic commits", () => {
  const p = fx.phaseStatus;
  check(p.phase8Closed === true && p.phase8SClosed === true && p.phase9NotStarted === true && p.phase8MemoryInactive === true, "phase status");
  check(fx.scaffoldIntegration.scaffoldCommit === "ff07be7" && fx.scaffoldIntegration.helperFile === "helpers/chat-context-carryover.js", "scaffold integration");
  check(fx.designIntegration.designCommit === "dae4128", "design commit");
  check(fx.diagnosticIntegration.diagnosticCommit === "38d5b9e", "diagnostic commit");
});

await test("flag-OFF: effective query equals currentQuery (behavior preserved)", () => {
  const off = effectiveQueryFor(false, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(off.effectiveQuery === "How about fresh frozen seafood?", "OFF effective query equals currentQuery");
  check(off.applied === false, "OFF not applied");
  check(fx.flagOffBehavior.effectiveQueryEqualsCurrentQuery === true, "fixture records OFF passthrough");
});

await test("flag-ON: tobacco VAT -> fresh frozen seafood yields VAT + Philippines standalone", () => {
  const on = effectiveQueryFor(true, "How about fresh frozen seafood?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(on.applied === true, "ON applied");
  check(on.effectiveQuery !== "How about fresh frozen seafood?", "ON effective query rewritten");
  check(on.effectiveQuery.toLowerCase().includes("fresh frozen seafood"), "ON includes subject");
  check(on.effectiveQuery.includes("VAT"), "ON includes VAT");
  check(on.effectiveQuery.includes("Philippines"), "ON includes Philippines");
  check(on.decision.memoryBoundary.persistentMemoryUsed === false, "no persistent memory");
});

await test("flag-ON but no prior tax issue: passthrough (no false rewrite)", () => {
  const on = effectiveQueryFor(true, "What is the weather?", [{ role: "user", content: "Is tobacco subject to VAT?" }]);
  check(on.applied === false, "not applied for non-follow-up");
  check(on.effectiveQuery === "What is the weather?", "effective query equals currentQuery");
});

await test("query flow places standalone resolution before classification and retrieval", () => {
  const flow = fx.queryFlow.map((s) => s.toLowerCase());
  const idxResolve = flow.findIndex((s) => s.includes("resolve effective query"));
  const idxClass = flow.findIndex((s) => s.includes("classification uses effectivequery"));
  const idxRetr = flow.findIndex((s) => s.includes("retrieval uses effectivequery"));
  check(idxResolve >= 0 && idxClass >= 0 && idxRetr >= 0, "flow has resolve/classification/retrieval");
  check(idxResolve < idxClass && idxResolve < idxRetr, "resolve before classification and retrieval");
});

await test("frontend remains unverified; staging/production not enabled", () => {
  check(fx.frontendContractStatus.frontendVerifiedInThisPatch === false, "frontend not verified");
  check(fx.stagingStatus.stagingFlagEnabled === false && fx.stagingStatus.deployed === false, "staging not enabled/deployed");
  check(fx.productionStatus.productionFlagEnabled === false && fx.productionStatus.deployed === false, "production not enabled/deployed");
  check(fx.liveBehaviorStatus.liveIssueFixed === false, "live issue not fixed");
});

await test("source authority discipline and security/privacy controls preserved", () => {
  const a = fx.sourceAuthorityDiscipline;
  check(a.noCitationsFromHistory === true && a.saeSourceCardsUnchanged === true && a.retrievalStillFindsAuthorities === true, "authority discipline");
  const s = fx.securityPrivacyControls;
  check(s.noPersistentMemory === true && s.noMemoryFlags === true && s.noRawRecentTurnsLogging === true && s.noP1P2ThirdPartyEgressAdded === true, "security controls");
});

await test("prohibited claims block production/staging fixed, frontend verified, flag enabled, Phase 9 started", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["production is fixed", "staging is fixed", "frontend is verified", "phase 9 started", "persistent memory is active", "the feature flag is enabled", "live behavior changed by default"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("modified runtime files limited to pipeline.js", () => {
  check(Array.isArray(fx.modifiedRuntimeFiles) && fx.modifiedRuntimeFiles.length === 1 && fx.modifiedRuntimeFiles[0] === "pipeline.js", "only pipeline.js runtime-modified");
  for (const f of ["ask-handler.js", "server.js", "issue-classification-engine.js", "retrieval-engine.js"]) {
    check(fx.unmodifiedRuntimeFiles.includes(f), `${f} listed unmodified`);
  }
});

// ── Static source verification of pipeline.js wiring ─────────────────────────────
await test("pipeline.js imports the pure helper and defines the flag + resolver", () => {
  check(/import\s*\{\s*buildShortTermContextCarryover\s*\}\s*from\s*["']\.\/helpers\/chat-context-carryover\.js["']/.test(pipelineSrc), "imports buildShortTermContextCarryover from helper");
  check(pipelineSrc.includes("TINA_ENABLE_CHAT_CONTEXT_CARRYOVER"), "flag name present");
  check(/export function isChatContextCarryoverEnabled\s*\(/.test(pipelineSrc), "flag parser exported");
  check(/export function resolveChatContextCarryoverForPipeline\s*\(/.test(pipelineSrc), "resolver exported");
});

await test("pipeline.js resolver returns effectiveQuery = applied ? standaloneQuery : original, and disabled passthrough", () => {
  check(/effectiveQuery\s*=\s*decision\.applied\s*\?\s*decision\.standaloneQuery\s*:\s*originalQuery/.test(pipelineSrc), "effectiveQuery = applied ? standaloneQuery : originalQuery");
  check(/effectiveQuery:\s*originalQuery/.test(pipelineSrc), "disabled path returns effectiveQuery: originalQuery");
});

await test("pipeline.js computes effectiveQuery and feeds it to classification and retrieval", () => {
  check(/const\s+effectiveQuery\s*=\s*_chatContextCarryover\.effectiveQuery/.test(pipelineSrc), "effectiveQuery computed from resolver");
  check(/classify\(effectiveQuery\)/.test(pipelineSrc), "classification uses effectiveQuery");
  check(/retrieveRelevantSources\(\{\s*query:\s*effectiveQuery/.test(pipelineSrc), "retrieval uses effectiveQuery");
});

await test("pipeline.js generation still uses the original query (not the rewrite)", () => {
  // callOpenAIWithOrchestration must still receive the original `query`/`userQuery: query`.
  check(/userQuery:\s*query\b/.test(pipelineSrc), "generation userQuery is original query");
});

await test("pipeline.js does not log raw recent turns and introduces no memory flag", () => {
  check(!/console\.(log|error|warn|info)\([^)]*(conversationHistory|recentTurns|priorMessages)/.test(pipelineSrc), "no raw recent-turns logging");
  check(!pipelineSrc.includes("TINA_ENABLE_MEMORY"), "no TINA_ENABLE_MEMORY_* introduced");
  // The safe trace object must not embed raw turn content fields.
  const traceBlock = pipelineSrc.slice(pipelineSrc.indexOf("chatContextCarryoverEnabled"), pipelineSrc.indexOf("chatContextCarryoverEnabled") + 1200);
  check(!/\b(content|message|text)\s*:/.test(traceBlock) || !/recentTurns/.test(traceBlock), "trace carries no raw turn content");
});

await test("this test imports no runtime modules, performs no HTTP, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-pipeline-wiring-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../pipeline.js", "../server.js", "../ask-handler.js", "../routes", "supabase", "openai", "langfuse", "node:http", "node:https"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  check(!/[^"'`.\w]fetch\s*\(|[^"'`.\w]https?\.(request|get)\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-PIPELINE-WIRING-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
