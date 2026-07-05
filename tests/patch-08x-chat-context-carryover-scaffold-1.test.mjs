// PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1 - pure helper scaffold test.
// Imports the pure helper directly. Performs NO HTTP, does NOT import
// server.js/ask-handler/pipeline/classification/retrieval, calls no external
// service, requires no env vars, and prints no env values.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  normalizeText,
  boundRecentTurns,
  detectFollowUp,
  extractPriorTaxContext,
  buildStandaloneQuery,
  buildShortTermContextCarryover,
  buildContextCarryoverDecision
} from "../helpers/chat-context-carryover.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-08x-chat-context-carryover-scaffold-1.fixture.json";
const HELPER_PATH = "helpers/chat-context-carryover.js";

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

await test("scaffold fixture exists and is valid JSON; helper functions import", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
  for (const fn of [normalizeText, boundRecentTurns, detectFollowUp, extractPriorTaxContext, buildStandaloneQuery, buildShortTermContextCarryover, buildContextCarryoverDecision]) {
    check(typeof fn === "function", "helper export is a function");
  }
});

await test("required fixture sections exist", () => {
  const required = [
    "patch", "decision", "baseCommit", "scaffoldVersion", "nonRuntimePatch", "phaseStatus",
    "designIntegration", "diagnosticIntegration", "helperApi", "helperFile", "behaviorContract",
    "positiveCases", "negativeCases", "falsePositiveControls", "securityPrivacyControls",
    "sourceAuthorityDiscipline", "runtimeWiringStatus", "featureFlagStatus", "phase9Boundary",
    "risks", "prohibitedClaims", "validationMatrix", "testCases"
  ];
  for (const key of required) check(Object.prototype.hasOwnProperty.call(fx, key), `missing section: ${key}`);
  check(fx.patch.id === "PATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1", "patch id");
  check(/SCAFFOLD PASS WITH STRICT RECOMMENDATIONS|INCONCLUSIVE|BLOCKED/.test(fx.decision), "valid decision");
});

await test("non-runtime declaration and runtime wiring status are all false", () => {
  const d = fx.nonRuntimeDeclaration;
  for (const f of ["noRouteWiring", "noPipelineWiring", "noIssueClassificationWiring", "noRetrievalWiring", "noServerJsChange", "noMemoryEnablement", "noPhase9Implementation"]) {
    check(d[f] === true, `${f} must be true`);
  }
  const w = fx.runtimeWiringStatus;
  for (const f of ["runtimeWired", "classificationUsesHelper", "retrievalUsesHelper", "askHandlerUsesHelper", "liveBehaviorChanged", "featureFlagAdded"]) {
    check(w[f] === false, `${f} must be false`);
  }
});

await test("phase status and integrations reference the diagnostic and design commits", () => {
  const p = fx.phaseStatus;
  check(p.phase8Closed === true && p.phase8SClosed === true && p.phase9NotStarted === true && p.phase8MemoryInactive === true, "phase status");
  check(fx.designIntegration.designCommit === "dae4128", "design commit");
  check(fx.diagnosticIntegration.diagnosticCommit === "38d5b9e", "diagnostic commit");
});

await test("positive cases apply with correct standaloneQuery and inherited tax type", () => {
  check(Array.isArray(fx.positiveCases) && fx.positiveCases.length >= 6, ">=6 positive cases");
  for (const c of fx.positiveCases) {
    const d = buildShortTermContextCarryover({ currentQuery: c.currentQuery, recentTurns: c.recentTurns });
    check(d.applied === true, `${c.id}: applied true`);
    check(d.standaloneQuery !== d.originalQuery, `${c.id}: standaloneQuery differs from original`);
    check(d.standaloneQuery.toLowerCase().includes(c.mustIncludeSubject.toLowerCase()), `${c.id}: standaloneQuery includes subject '${c.mustIncludeSubject}'`);
    check(d.standaloneQuery.includes(c.mustIncludeTaxToken), `${c.id}: standaloneQuery includes tax token '${c.mustIncludeTaxToken}'`);
    check(d.standaloneQuery.includes("Philippines"), `${c.id}: standaloneQuery includes Philippines`);
    check(d.inheritedTaxType === c.expectTaxType, `${c.id}: inheritedTaxType '${c.expectTaxType}'`);
    check(d.inheritedJurisdiction === "Philippines" || d.riskFlags.includes("jurisdiction_inferred"), `${c.id}: jurisdiction PH or inferred`);
    check(typeof d.confidence === "number" && d.confidence >= fx.behaviorContract.confidenceThreshold, `${c.id}: confidence >= threshold`);
    check(d.memoryBoundary.persistentMemoryUsed === false, `${c.id}: no persistent memory`);
    check(d.memoryBoundary.durableWriteRequired === false, `${c.id}: no durable write`);
    check(Array.isArray(d.sourceTurnIndexes) && d.sourceTurnIndexes.length >= 1, `${c.id}: sourceTurnIndexes present`);
  }
});

await test("negative cases do not apply; standaloneQuery equals originalQuery", () => {
  check(Array.isArray(fx.negativeCases) && fx.negativeCases.length >= 6, ">=6 negative cases");
  for (const c of fx.negativeCases) {
    const d = buildShortTermContextCarryover({ currentQuery: c.currentQuery, recentTurns: c.recentTurns });
    check(d.applied === false, `${c.id}: applied false`);
    check(d.standaloneQuery === d.originalQuery, `${c.id}: standaloneQuery equals originalQuery`);
    check(d.reason.includes(c.expectReasonIncludes) || d.riskFlags.some((f) => f.includes(c.expectReasonIncludes)), `${c.id}: reason/riskFlags explain '${c.expectReasonIncludes}'`);
    check(d.memoryBoundary.persistentMemoryUsed === false, `${c.id}: no persistent memory`);
    if (c.expectFallbackClarification) check(typeof d.fallbackClarification === "string" && d.fallbackClarification.length > 0, `${c.id}: fallback clarification present`);
  }
});

await test("bounded recentTurns caps history and tolerates multiple turn shapes", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ role: "user", content: `turn ${i}` }));
  const bounded = boundRecentTurns(many, 6);
  check(bounded.length === 6, "bounded to 6 by default max");
  check(boundRecentTurns(many, 100).length === 20, "hard max 20 enforced");
  // Tolerate {sender,message} and {type,text} shapes without throwing.
  const mixed = [{ sender: "user", message: "Is rent subject to EWT?" }, { type: "assistant", text: "Yes." }];
  const d = buildShortTermContextCarryover({ currentQuery: "How about condominium dues?", recentTurns: mixed });
  check(d.applied === true && d.inheritedTaxType === "EWT", "tolerates {sender,message}/{type,text} shapes");
});

await test("helper does not mutate the input recentTurns", () => {
  const turns = [{ role: "user", content: "Is tobacco subject to VAT?" }, { role: "assistant", content: "Yes, VAT applies." }];
  const snapshot = JSON.parse(JSON.stringify(turns));
  const frozen = turns.map((t) => Object.freeze({ ...t }));
  Object.freeze(frozen);
  buildShortTermContextCarryover({ currentQuery: "How about fresh frozen seafood?", recentTurns: frozen });
  assertions += 1;
  assert.deepEqual(turns, snapshot, "input recentTurns unchanged");
});

await test("output contains no citations, legal conclusions, or tax verdicts", () => {
  const d = buildShortTermContextCarryover({ currentQuery: "How about fresh frozen seafood?", recentTurns: [{ role: "user", content: "Is tobacco subject to VAT?" }] });
  const blob = JSON.stringify(d).toLowerCase();
  for (const forbidden of ["taxable", "exempt", "g.r. no", "nirc sec", "rr no", "rmc no", "is subject to vat: yes", "citation"]) {
    check(!blob.includes(forbidden), `output must not contain verdict/citation token: ${forbidden}`);
  }
  // standaloneQuery is a QUESTION, not a conclusion.
  check(d.standaloneQuery.trim().endsWith("?"), "standaloneQuery is a question");
});

await test("confidence is deterministic and within [0,1] across repeated calls", () => {
  const input = { currentQuery: "How about fresh frozen seafood?", recentTurns: [{ role: "user", content: "Is tobacco subject to VAT?" }] };
  const a = buildShortTermContextCarryover(input);
  const b = buildContextCarryoverDecision(input);
  check(typeof a.confidence === "number" && a.confidence >= 0 && a.confidence <= 1, "confidence in [0,1]");
  check(a.confidence === b.confidence && a.standaloneQuery === b.standaloneQuery, "deterministic across calls");
});

await test("empty/undefined input is handled without throwing and preserves originalQuery", () => {
  const d = buildShortTermContextCarryover({});
  check(d.applied === false, "empty input not applied");
  check(d.originalQuery === "" && d.standaloneQuery === "", "empty originalQuery preserved");
  check(d.memoryBoundary.persistentMemoryUsed === false, "no persistent memory");
});

await test("security/privacy and source-authority discipline are declared", () => {
  const s = fx.securityPrivacyControls;
  check(s.boundedRecentTurns === true && s.noRawRecentTurnLogs === true && s.noThirdPartyEgress === true && s.noPersistentMemory === true && s.noMemoryFlags === true, "security controls");
  const a = fx.sourceAuthorityDiscipline;
  check(a.helperProducesNoCitations === true && a.helperProducesNoTaxConclusion === true && a.finalAnswerStillRequiresRetrievalSourceBackedAuthority === true, "authority discipline");
});

await test("prohibited claims block live-fixed / runtime-wired / Phase 9 started / persistent memory", () => {
  const pc = fx.prohibitedClaims.join(" | ").toLowerCase();
  for (const needle of ["the live issue is fixed", "the helper is wired into runtime", "phase 9 started", "persistent memory is active", "tenant isolation is implemented", "production-ready"]) {
    check(pc.includes(needle), `prohibited claims must include: ${needle}`);
  }
});

await test("helper source contains no forbidden runtime imports/calls/env/memory-flags", () => {
  const src = readFileSync(resolve(HELPER_PATH), "utf8");
  const forbidden = [
    "from './server'", 'from "./server"', "require('./server')", "require(\"./server\")",
    "supabase", "openai", "fetch(", "axios", "process.env", "fs.writeFile",
    "console.log(recentTurns", "TINA_ENABLE_MEMORY"
  ];
  for (const token of forbidden) {
    check(!src.toLowerCase().includes(token.toLowerCase()), `helper must not contain: ${token}`);
  }
  check(!/^\s*import\s+.*\bfrom\s+["']\.\.?\/(server|ask-handler|pipeline|routes|retrieval-engine|issue-classification-engine|context-orchestration-engine|conversation-memory)/m.test(src), "helper has no runtime module imports");
});

await test("this test imports no runtime modules, performs no HTTP, and reads no env vars", () => {
  const selfSrc = readFileSync(resolve("tests/patch-08x-chat-context-carryover-scaffold-1.test.mjs"), "utf8");
  const importLines = selfSrc.split(/\r?\n/).filter((l) => /^\s*import\s/.test(l));
  const forbidden = ["../server.js", "../ask-handler.js", "../pipeline.js", "../routes", "../issue-classification-engine.js", "../retrieval-engine.js", "supabase", "openai", "langfuse", "node:http", "node:https"];
  for (const line of importLines) {
    for (const token of forbidden) check(!line.includes(token), `test must not import ${token}`);
  }
  // Match actual calls, not the quoted "fetch(" token used in forbidden-token lists.
  check(!/[^"'`.\w]fetch\s*\(|[^"'`.\w]https?\.(request|get)\s*\(/.test(selfSrc), "test must not perform HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "test must not read process.env.<NAME>");
});

console.log(`\nPATCH-08X-CHAT-CONTEXT-CARRYOVER-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
