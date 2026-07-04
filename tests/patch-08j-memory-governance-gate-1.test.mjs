// PATCH-08J-MEMORY-GOVERNANCE-GATE-1 - memory governance gate tests.
// Governance-only validation across Phase 8 read/write scaffolds.
// No runtime memory, consent handling, persistence, DB/Supabase, pipeline, retrieval,
// source-card, sourceAvailability, frontend, or dependency work is implemented here.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

function deepEqual(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

const READ_ON = { flagState: { TINA_ENABLE_MEMORY_READS: true } };
const WRITE_ON = { flagState: { TINA_ENABLE_MEMORY_WRITES: true } };
const clientContext = { clientId: "client-a", visibleScopeConfirmed: true };

const clientMemory = (overrides = {}) => ({
  memoryId: "mem-client-a",
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

const approvedConsent = (overrides = {}) => ({
  userResponse: "approve",
  approved: true,
  consentEventId: "consent-evt-8j",
  ...overrides
});

await test("read and write contracts disallow persistence and runtime implementation", () => {
  const read = boundaries.getMemoryReadScaffoldContract();
  const write = boundaries.getMemoryWriteScaffoldContract();
  equal(read.persistentReadAllowed, false, "read contract disallows persistent reads");
  equal(read.durableWriteAllowed, false, "read contract disallows durable writes");
  equal(write.persistentReadAllowed, false, "write contract disallows persistent reads");
  equal(write.persistentWriteAllowed, false, "write contract disallows persistent writes");
  equal(write.durableWriteAllowed, false, "write contract disallows durable writes");
  for (const contract of [read, write]) {
    equal(contract.databaseAccessAllowed, false, "database access disabled");
    equal(contract.pipelineIntegrationAllowed, false, "pipeline integration disabled");
    equal(contract.runtimeBehaviorChangeAllowed, false, "runtime behavior change disabled");
    equal(contract.sourceAuthorityMutationAllowed, false, "source-authority mutation disabled");
  }
});

await test("read and write flags are default OFF, production OFF, and strict boolean true only", () => {
  const readContract = boundaries.getMemoryReadScaffoldContract();
  const writeContract = boundaries.getMemoryWriteScaffoldContract();
  equal(readContract.defaultEnabled, false, "read default OFF");
  equal(readContract.productionEnabled, false, "read production OFF");
  equal(writeContract.defaultEnabled, false, "write default OFF");
  equal(writeContract.productionEnabled, false, "write production OFF");

  for (const value of [undefined, {}, { TINA_ENABLE_MEMORY_READS: false }, { TINA_ENABLE_MEMORY_READS: "true" }, { TINA_ENABLE_MEMORY_READS: 1 }]) {
    equal(boundaries.isMemoryReadFlagEnabled(value).allowed, false, "read flag rejects missing/non-boolean true values");
  }
  for (const value of [undefined, {}, { TINA_ENABLE_MEMORY_WRITES: false }, { TINA_ENABLE_MEMORY_WRITES: "true" }, { TINA_ENABLE_MEMORY_WRITES: 1 }]) {
    equal(boundaries.isMemoryWriteFlagEnabled(value).allowed, false, "write flag rejects missing/non-boolean true values");
  }
  equal(boundaries.isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: true }).allowed, true, "read flag allows strict true");
  equal(boundaries.isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: true }).allowed, true, "write flag allows strict true");

  const registry = boundaries.assertAllMemoryFlagsDefaultOff();
  equal(registry.allowed, true, "flag registry remains default OFF and production OFF");
});

await test("runtime side-effect assurances stay false for DB, Supabase, pipeline, retrieval, and source-card paths", () => {
  const read = boundaries.assertReadScaffoldNoRuntimeSideEffects();
  const write = boundaries.assertWriteScaffoldNoRuntimeSideEffects();
  const expectedFalse = [
    "importsRuntimePipeline", "importsRoutes", "importsDatabase", "importsSupabase",
    "importsOpenAI", "importsRetrieval", "importsSourceCards", "importsSourceAvailability",
    "performsPersistentReads", "performsWrites", "mutatesAuthorityState"
  ];
  for (const assurance of [read, write]) {
    for (const key of expectedFalse) equal(assurance[key], false, `${key} is false`);
  }
  equal(write.performsPersistentWrites, false, "write scaffold performs no persistent writes");
});

await test("authority separation prohibits SAE, sourceAvailability, retrieval, source-card, citation, currentness, case-status, and Phase 10 mutation", () => {
  const denied = [
    { mutateSAE: true, expected: "MEMORY_CANNOT_MUTATE_SAE_OR_SOURCE_AVAILABILITY" },
    { mutateSourceAvailability: true, expected: "MEMORY_CANNOT_MUTATE_SAE_OR_SOURCE_AVAILABILITY" },
    { mutateRetrieval: true, expected: "MEMORY_CANNOT_MUTATE_RETRIEVAL" },
    { mutateSourceCards: true, expected: "MEMORY_CANNOT_MUTATE_SOURCE_CARDS" },
    { createCitation: true, expected: "MEMORY_CANNOT_CREATE_CITATIONS" },
    { citationAuthority: true, expected: "MEMORY_CANNOT_CREATE_CITATIONS" },
    { claimsLegalCurrentness: true, expected: "MEMORY_CANNOT_CLAIM_LEGAL_CURRENTNESS" },
    { claimsCaseStatus: true, expected: "MEMORY_CANNOT_CLAIM_CASE_STATUS" },
    { bypassPhase10Deferral: true, expected: "MEMORY_CANNOT_BYPASS_PHASE10_DEFERRAL" }
  ];
  for (const item of denied) {
    equal(boundaries.validateMemoryAuthoritySeparation(item).code, item.expected, item.expected);
  }
  equal(boundaries.validateMemoryAuthoritySeparation({ authorityUseProhibited: true, legalConclusionProhibited: true }).allowed, true, "valid non-authority memory allowed");
});

await test("deny, session_only, and ask_later consent responses remain hard no-write outcomes", () => {
  for (const userResponse of ["deny", "session_only", "ask_later"]) {
    const result = boundaries.evaluateMemoryWriteEligibility(clientMemory(), clientContext, {
      ...WRITE_ON,
      consentResponse: { userResponse }
    });
    equal(result.eligible, false, `${userResponse} is not writable`);
    equal(result.decision, "WRITE_DENIED", `${userResponse} denied`);
    equal(result.proposedWritePlan, null, `${userResponse} creates no write plan`);
    equal(result.persistentWritePerformed, false, `${userResponse} performs no persistent write`);
  }
});

await test("revoked, expired, and invalid consent block both reads and writes", () => {
  for (const state of ["revoked", "expired", "invalid"]) {
    const read = boundaries.evaluateMemoryReadEligibility(clientMemory({ consentState: state }), clientContext, READ_ON);
    equal(read.eligible, false, `${state} consent blocks read`);
    equal(read.decision, "READ_DENIED", `${state} read denied`);
    const write = boundaries.evaluateMemoryWriteEligibility(clientMemory(), clientContext, {
      ...WRITE_ON,
      consentState: state,
      consentResponse: approvedConsent()
    });
    equal(write.eligible, false, `${state} consent blocks write`);
    equal(write.decision, "WRITE_DENIED", `${state} write denied`);
  }
});

await test("source_derived memory remains provenance-only and cannot assert currentness, case status, or citation authority", () => {
  const read = boundaries.evaluateMemoryReadEligibility({
    memoryId: "mem-source",
    memoryClass: "source_derived",
    primary_scope_id: "doc-1",
    consentState: "not_required",
    contentSummary: "RR 16-2005 provenance note"
  }, clientContext, READ_ON);
  equal(read.eligible, true, "source_derived provenance read can be context only");
  equal(read.scopeProof.provenanceOnly, true, "source_derived read proof is provenance-only");
  equal(read.scopeProof.currentnessAssertionAllowed, false, "currentness assertion disallowed");
  equal(read.scopeProof.readExpansionAllowed, false, "read expansion disallowed");

  const write = boundaries.evaluateMemoryWriteEligibility(clientMemory({
    memoryClass: "source_derived",
    permissionLevel: "explicit_consent",
    primary_scope_type: "source_document",
    primary_scope_id: "doc-1"
  }), clientContext, { ...WRITE_ON, consentResponse: approvedConsent() });
  equal(write.eligible, false, "source_derived write denied");
  check(write.reasons.includes("SOURCE_DERIVED_PROVENANCE_ONLY_NO_DURABLE_WRITE"), "source_derived durable write reason present");
  equal(boundaries.evaluateMemoryReadEligibility({ memoryClass: "source_derived", assertsCurrentness: true }, clientContext, READ_ON).eligible, false, "currentness claim rejected");
  equal(boundaries.validateMemoryAuthoritySeparation({ createCitation: true }).allowed, false, "citation authority rejected");
});

await test("client and matter isolation reject unrelated scopes", () => {
  const clientMismatch = boundaries.evaluateMemoryReadEligibility(clientMemory(), { clientId: "client-b" }, READ_ON);
  equal(clientMismatch.eligible, false, "unrelated client scope rejected");
  check(clientMismatch.reasons.includes("CLIENT_SCOPE_MISMATCH"), "client mismatch reason");

  const matter = clientMemory({
    memoryClass: "matter",
    permissionLevel: "matter_scoped",
    primary_scope_type: "matter",
    primary_scope_id: "matter-a",
    scopeLabel: "Matter A"
  });
  const matterMismatch = boundaries.evaluateMemoryReadEligibility(matter, { matterId: "matter-b" }, READ_ON);
  equal(matterMismatch.eligible, false, "unrelated matter scope rejected");
  check(matterMismatch.reasons.includes("MATTER_SCOPE_MISMATCH"), "matter mismatch reason");
});

await test("deferred boundaries remain implementationAllowedHere false, including Phase 7B tuning and Phase 10/11 work", () => {
  const deferred = boundaries.getDeferredBoundaries();
  for (const id of [
    "phase7b_boundary_tuning_followup",
    "phase10_source_governance",
    "phase10_court_metadata",
    "phase10_hallucination_traps",
    "phase11_observability_performance"
  ]) {
    const boundary = deferred.find((entry) => entry.id === id);
    check(boundary, `${id} exists`);
    equal(boundary.implementationAllowedHere, false, `${id} remains deferred`);
  }
});

await test("structured memory context stays non-authority and uses only permitted phrasing", () => {
  const context = boundaries.buildStructuredMemoryContext([clientMemory()], clientContext, READ_ON);
  equal(context.phrasing, "user/matter context indicates:", "permitted phrasing");
  equal(context.authorityUseProhibited, true, "authority use prohibited");
  equal(context.legalConclusionProhibited, true, "legal conclusion prohibited");
  equal(context.citationAuthorityCreated, false, "no citation authority");
  equal(context.sourceCurrentnessClaimed, false, "no source currentness claim");
  equal(context.caseStatusClaimed, false, "no case-status claim");
  check(context.contextItems.every((item) => item.phrasing.startsWith("user/matter context indicates:")), "all context items use permitted phrasing");
});

await test("Phase 7B boundary tuning remains excluded from the memory gate", () => {
  const deferred = boundaries.getDeferredBoundaries().find((entry) => entry.id === "phase7b_boundary_tuning_followup");
  equal(deferred.implementationAllowedHere, false, "Phase 7B boundary tuning not implemented here");
  equal(existsSync(resolve("clarification-boundary-policy.js")), true, "existing Phase 7B runtime file remains outside this gate");
});

await test("no protected runtime, DB, migration, frontend, package, or dependency files are changed", () => {
  const allowedChanged = new Set([
    "PATCH-08J-MEMORY-GOVERNANCE-GATE-1_MEMORY_GOVERNANCE_GATE_REPORT.md",
    "tests/patch-08j-memory-governance-gate-1.test.mjs",
    "knowledge/CURRENT_STATE.md"
  ]);
  const diffNames = execSync("git diff --name-only", { encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const name of diffNames) {
    check(allowedChanged.has(name), `changed file is allowed by PATCH-08J scope: ${name}`);
  }
  for (const forbidden of ["package.json", "package-lock.json", "pipeline.js", "ask-handler.js", "retrieval-engine.js", "source-card-engine.js", "source-availability-engine.js"]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  for (const path of ["memory-boundaries/memory-read-scaffold.js", "memory-boundaries/memory-write-scaffold.js", "memory-boundaries/index.js"]) {
    const raw = readFileSync(resolve(path), "utf8");
    const imports = raw.split(/\r?\n/).filter((line) => /^\s*import\s|from\s+["']/.test(line)).join("\n");
    for (const token of ["pipeline", "ask-handler", "routes", "supabase", "openai", "retrieval", "source-card", "sourceAvailability", "source-availability", "db", "database", "server.js", "express"]) {
      check(!imports.includes(token), `${path} imports no ${token}`);
    }
    check(!raw.includes("process.env"), `${path} does not read runtime env`);
  }
});

const summary = `PATCH-08J-MEMORY-GOVERNANCE-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`;
console.log(`\n${summary}`);
if (failed > 0) process.exit(1);
console.log("PATCH-08J-MEMORY-GOVERNANCE-GATE-1 PASS - memory governance gate holds read/write scaffolds OFF, non-persistent, scoped, consent-blocked, and non-authority.");
