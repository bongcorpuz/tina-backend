// PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1 - final Phase 8 closure tests.
// Closure-only validation: no runtime memory, consent endpoint, DB/Supabase,
// pipeline, retrieval, source-card, sourceAvailability, frontend, deployment, or roadmap rewrite.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as boundaries from "../memory-boundaries/index.js";

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

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

const READ_ON = { flagState: { TINA_ENABLE_MEMORY_READS: true } };
const WRITE_ON = { flagState: { TINA_ENABLE_MEMORY_WRITES: true } };
const requestContext = { clientId: "client-a", visibleScopeConfirmed: true };

const clientMemory = (overrides = {}) => ({
  memoryId: "closure-client-memory",
  memoryClass: "client_entity",
  permissionLevel: "client_scoped",
  primary_scope_type: "client",
  primary_scope_id: "client-a",
  scopeLabel: "Client A",
  consentState: "granted",
  confidenceState: "user_confirmed",
  contentSummary: "Client A is VAT-registered per user-confirmed statement",
  authorityUseProhibited: true,
  legalConclusionProhibited: true,
  sourceRefs: [],
  ...overrides
});

const matterMemory = (overrides = {}) => clientMemory({
  memoryId: "closure-matter-memory",
  memoryClass: "matter",
  permissionLevel: "matter_scoped",
  primary_scope_type: "matter",
  primary_scope_id: "matter-a",
  scopeLabel: "Matter A",
  ...overrides
});

const approvedConsent = (overrides = {}) => ({
  userResponse: "approve",
  approved: true,
  consentEventId: "consent-evt-8l",
  ...overrides
});

await test("Phase 8 read/write contracts remain non-persistent", () => {
  const read = boundaries.getMemoryReadScaffoldContract();
  const write = boundaries.getMemoryWriteScaffoldContract();
  equal(read.persistentReadAllowed, false, "read persistentReadAllowed false");
  equal(read.durableWriteAllowed, false, "read durableWriteAllowed false");
  equal(read.databaseAccessAllowed, false, "read databaseAccessAllowed false");
  equal(write.persistentReadAllowed, false, "write persistentReadAllowed false");
  equal(write.persistentWriteAllowed, false, "write persistentWriteAllowed false");
  equal(write.durableWriteAllowed, false, "write durableWriteAllowed false");
  equal(write.databaseAccessAllowed, false, "write databaseAccessAllowed false");
});

await test("memory flags remain default OFF and production OFF", () => {
  const flags = boundaries.getMemoryFeatureFlags();
  for (const id of [
    "TINA_ENABLE_MEMORY_READS",
    "TINA_ENABLE_MEMORY_WRITES",
    "TINA_ENABLE_MATTER_MEMORY",
    "TINA_ENABLE_MEMORY_SUGGESTIONS",
    "TINA_ENABLE_MEMORY_DEBUG_TRACE"
  ]) {
    const flag = flags.find((entry) => entry.id === id);
    check(flag, `${id} exists`);
    equal(flag.defaultEnabled, false, `${id} default OFF`);
    equal(flag.productionEnabled, false, `${id} production OFF`);
    equal(flag.requiresGateBeforeProduction, true, `${id} requires production gate`);
  }
  equal(boundaries.assertAllMemoryFlagsDefaultOff().allowed, true, "all memory flags OFF");
});

await test("read/write helper enablement requires strict boolean true from caller-provided flag object", () => {
  for (const value of [undefined, {}, { TINA_ENABLE_MEMORY_READS: false }, { TINA_ENABLE_MEMORY_READS: "true" }, { TINA_ENABLE_MEMORY_READS: 1 }]) {
    equal(boundaries.isMemoryReadFlagEnabled(value).allowed, false, "read rejects missing/non-boolean true");
  }
  for (const value of [undefined, {}, { TINA_ENABLE_MEMORY_WRITES: false }, { TINA_ENABLE_MEMORY_WRITES: "true" }, { TINA_ENABLE_MEMORY_WRITES: 1 }]) {
    equal(boundaries.isMemoryWriteFlagEnabled(value).allowed, false, "write rejects missing/non-boolean true");
  }
  equal(boundaries.isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: true }).allowed, true, "read strict true accepted");
  equal(boundaries.isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: true }).allowed, true, "write strict true accepted");
});

await test("flag OFF disables read selection and write planning", () => {
  const read = boundaries.selectEligibleMemoryForContext([clientMemory()], requestContext, {});
  equal(read.selectedMemoryItems.length, 0, "flag OFF selects no memory");
  equal(read.decisions[0].decision, "READ_FLAG_OFF", "flag OFF read decision");

  const write = boundaries.evaluateMemoryWriteEligibility(clientMemory(), requestContext, {});
  equal(write.eligible, false, "flag OFF write ineligible");
  equal(write.decision, "WRITE_FLAG_OFF", "flag OFF write decision");
  equal(write.proposedWritePlan, null, "flag OFF creates no write plan");
});

await test("runtime side-effect assurances remain false for DB, Supabase, pipeline, retrieval, and source-card paths", () => {
  const read = boundaries.assertReadScaffoldNoRuntimeSideEffects();
  const write = boundaries.assertWriteScaffoldNoRuntimeSideEffects();
  for (const assurance of [read, write]) {
    for (const key of [
      "importsRuntimePipeline", "importsRoutes", "importsDatabase", "importsSupabase",
      "importsOpenAI", "importsRetrieval", "importsSourceCards", "importsSourceAvailability",
      "performsPersistentReads", "performsWrites", "mutatesAuthorityState"
    ]) {
      equal(assurance[key], false, `${key} false`);
    }
  }
  equal(write.performsPersistentWrites, false, "write performs no persistent writes");
});

await test("deny, session_only, and ask_later block writes", () => {
  for (const userResponse of ["deny", "session_only", "ask_later"]) {
    const result = boundaries.evaluateMemoryWriteEligibility(clientMemory(), requestContext, {
      ...WRITE_ON,
      consentResponse: { userResponse }
    });
    equal(result.eligible, false, `${userResponse} ineligible`);
    equal(result.decision, "WRITE_DENIED", `${userResponse} denied`);
    equal(result.proposedWritePlan, null, `${userResponse} no plan`);
  }
});

await test("revoked, expired, and invalid consent block reads and writes", () => {
  for (const state of ["revoked", "expired", "invalid"]) {
    const read = boundaries.evaluateMemoryReadEligibility(clientMemory({ consentState: state }), requestContext, READ_ON);
    equal(read.eligible, false, `${state} blocks read`);
    equal(read.decision, "READ_DENIED", `${state} read denied`);
    const write = boundaries.evaluateMemoryWriteEligibility(clientMemory(), requestContext, {
      ...WRITE_ON,
      consentState: state,
      consentResponse: approvedConsent()
    });
    equal(write.eligible, false, `${state} blocks write`);
    equal(write.decision, "WRITE_DENIED", `${state} write denied`);
  }
});

await test("source_derived memory remains provenance-only", () => {
  const provenance = boundaries.evaluateMemoryReadEligibility({
    memoryId: "closure-source-derived",
    memoryClass: "source_derived",
    primary_scope_id: "source-doc-1",
    consentState: "not_required",
    contentSummary: "Indexed-source provenance note"
  }, requestContext, READ_ON);
  equal(provenance.eligible, true, "source_derived can be context only");
  equal(provenance.scopeProof.provenanceOnly, true, "provenance-only");
  equal(provenance.scopeProof.currentnessAssertionAllowed, false, "no currentness assertion");
  equal(provenance.scopeProof.readExpansionAllowed, false, "no read expansion");

  const write = boundaries.evaluateMemoryWriteEligibility(clientMemory({
    memoryClass: "source_derived",
    permissionLevel: "explicit_consent",
    primary_scope_type: "source_document",
    primary_scope_id: "source-doc-1"
  }), requestContext, { ...WRITE_ON, consentResponse: approvedConsent() });
  equal(write.eligible, false, "source_derived durable write denied");
});

await test("client/matter isolation rejects unrelated scope", () => {
  const clientMismatch = boundaries.evaluateMemoryReadEligibility(clientMemory(), { clientId: "client-b" }, READ_ON);
  equal(clientMismatch.eligible, false, "client mismatch rejected");
  check(clientMismatch.reasons.includes("CLIENT_SCOPE_MISMATCH"), "client mismatch reason");

  const matterMismatch = boundaries.evaluateMemoryReadEligibility(matterMemory(), { matterId: "matter-b" }, READ_ON);
  equal(matterMismatch.eligible, false, "matter mismatch rejected");
  check(matterMismatch.reasons.includes("MATTER_SCOPE_MISMATCH"), "matter mismatch reason");
});

await test("authority separation rejects currentness, case-status, citation, and Phase 10 bypass claims", () => {
  for (const item of [
    { createCitation: true, expected: "MEMORY_CANNOT_CREATE_CITATIONS" },
    { citationAuthority: true, expected: "MEMORY_CANNOT_CREATE_CITATIONS" },
    { claimsLegalCurrentness: true, expected: "MEMORY_CANNOT_CLAIM_LEGAL_CURRENTNESS" },
    { sourceCurrentnessStatus: "current", expected: "MEMORY_CANNOT_CLAIM_LEGAL_CURRENTNESS" },
    { claimsCaseStatus: true, expected: "MEMORY_CANNOT_CLAIM_CASE_STATUS" },
    { bypassPhase10Deferral: true, expected: "MEMORY_CANNOT_BYPASS_PHASE10_DEFERRAL" }
  ]) {
    equal(boundaries.validateMemoryAuthoritySeparation(item).code, item.expected, item.expected);
  }
});

await test("deferred boundaries remain implementationAllowedHere false", () => {
  const deferred = boundaries.getDeferredBoundaries();
  for (const id of [
    "phase7b_boundary_tuning_followup",
    "phase10_source_governance",
    "phase10_court_metadata",
    "phase10_hallucination_traps",
    "phase11_observability_performance",
    "phase12_document_advisory",
    "phase14_mobile_after_phase13"
  ]) {
    const boundary = deferred.find((entry) => entry.id === id);
    check(boundary, `${id} exists`);
    equal(boundary.implementationAllowedHere, false, `${id} deferred`);
  }
});

await test("Phase 7B boundary tuning remains excluded and Phase 10/11 remain deferred", () => {
  const ids = boundaries.getDeferredBoundaries().map((entry) => entry.id);
  check(ids.includes("phase7b_boundary_tuning_followup"), "Phase 7B boundary tuning listed as deferred");
  check(ids.includes("phase10_source_governance"), "Phase 10 source governance deferred");
  check(ids.includes("phase10_court_metadata"), "Phase 10 court metadata deferred");
  check(ids.includes("phase11_observability_performance"), "Phase 11 deferred");
});

await test("Phase 9 roadmap remains Professional Workflow Co-Pilot", () => {
  const currentState = readFileSync(resolve("knowledge/CURRENT_STATE.md"), "utf8");
  const closureReport = readFileSync(resolve("PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1_PHASE_8_FINAL_CLOSURE_REPORT.md"), "utf8");
  const roadmapText = `${currentState}\n${closureReport}`;
  check(roadmapText.includes("Phase 9 professional workflow co-pilot") || roadmapText.includes("Professional Workflow Co-Pilot"), "Phase 9 professional workflow roadmap preserved");
  check(roadmapText.includes("tax memo generator") || roadmapText.includes("tax memo"), "Phase 9 tax memo generator preserved");
  check(roadmapText.includes("BIR reply") || roadmapText.includes("protest letter") || roadmapText.includes("audit defense"), "Phase 9 BIR reply/protest/audit defense work preserved");
});

await test("memory context remains non-authority and uses only permitted phrasing", () => {
  const context = boundaries.buildStructuredMemoryContext([clientMemory()], requestContext, READ_ON);
  equal(context.phrasing, "user/matter context indicates:", "permitted phrasing");
  equal(context.authorityUseProhibited, true, "authority use prohibited");
  equal(context.legalConclusionProhibited, true, "legal conclusion prohibited");
  equal(context.citationAuthorityCreated, false, "no citation authority");
  equal(context.sourceCurrentnessClaimed, false, "no source currentness claim");
  equal(context.caseStatusClaimed, false, "no case-status claim");
});

await test("no protected runtime files are changed or imported into memory scaffolds", () => {
  const allowedChanged = new Set([
    "PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1_PHASE_8_FINAL_CLOSURE_REPORT.md",
    "tests/patch-08l-phase-8-final-closure-gate-1.test.mjs",
    "knowledge/CURRENT_STATE.md"
  ]);
  const diffNames = execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const name of diffNames) {
    check(allowedChanged.has(name), `changed file is allowed by PATCH-08L scope: ${name}`);
  }
  for (const forbidden of [
    "package.json", "package-lock.json", "pipeline.js", "ask-handler.js",
    "retrieval-engine.js", "reranker-engine.js", "source-card-engine.js",
    "source-availability-engine.js", "memory-boundaries/memory-read-scaffold.js",
    "memory-boundaries/memory-write-scaffold.js", "memory-boundaries/index.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }

  for (const path of ["memory-boundaries/memory-read-scaffold.js", "memory-boundaries/memory-write-scaffold.js", "memory-boundaries/index.js"]) {
    const raw = readFileSync(resolve(path), "utf8");
    const imports = raw.split(/\r?\n/).filter((line) => /^\s*import\s|from\s+["']/.test(line)).join("\n");
    for (const token of ["pipeline", "ask-handler", "routes", "supabase", "openai", "retrieval", "source-card", "sourceAvailability", "source-availability", "db", "database", "server.js", "express"]) {
      check(!imports.includes(token), `${path} imports no ${token}`);
    }
    check(!raw.includes("process.env"), `${path} does not read process.env`);
  }
});

const summary = `PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`;
console.log(`\n${summary}`);
if (failed > 0) process.exit(1);
console.log("PATCH-08L-PHASE-8-FINAL-CLOSURE-GATE-1 PASS - Phase 8 closes as memory scaffold/governance complete, inactive, non-persistent, non-runtime, and non-authority.");
