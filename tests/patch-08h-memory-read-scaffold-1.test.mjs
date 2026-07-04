// PATCH-08H-MEMORY-READ-SCAFFOLD-1 - memory read scaffold tests.
// Contract-only validation using in-memory mock memory items exclusively.
// No persistent memory read, DB/Supabase access, pipeline wiring, or runtime change is tested or implemented.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import * as boundaries from "../memory-boundaries/index.js";
import {
  getMemoryReadScaffoldContract,
  isMemoryReadFlagEnabled,
  evaluateMemoryReadEligibility,
  selectEligibleMemoryForContext,
  buildStructuredMemoryContext,
  explainMemoryReadDecision,
  assertReadScaffoldNoRuntimeSideEffects
} from "../memory-boundaries/memory-read-scaffold.js";

const phase8b = JSON.parse(readFileSync(resolve("evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json"), "utf8"));
const phase8d = JSON.parse(readFileSync(resolve("evaluation/fixtures/phase-8d-memory-scope-schema-fixture-1-invariants.fixture.json"), "utf8"));
const phase8f = JSON.parse(readFileSync(resolve("evaluation/fixtures/phase-8f-memory-consent-contract-fixture-1-policy.fixture.json"), "utf8"));

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

const FLAG_ON = { flagState: { TINA_ENABLE_MEMORY_READS: true } };
const READ_SCAFFOLD_EXPORTS = [
  "getMemoryReadScaffoldContract", "isMemoryReadFlagEnabled", "evaluateMemoryReadEligibility",
  "selectEligibleMemoryForContext", "buildStructuredMemoryContext", "explainMemoryReadDecision",
  "assertReadScaffoldNoRuntimeSideEffects"
];

const clientItem = (overrides = {}) => ({
  memoryId: "mem-client-1",
  memoryClass: "client_entity",
  primary_scope_type: "client",
  primary_scope_id: "client-a",
  consentState: "granted",
  confidenceState: "user_confirmed",
  contentSummary: "Client A is VAT-registered per user-confirmed statement",
  ...overrides
});
const matterItem = (overrides = {}) => ({
  memoryId: "mem-matter-1",
  memoryClass: "matter",
  primary_scope_type: "matter",
  primary_scope_id: "matter-x",
  consentState: "granted",
  confidenceState: "user_confirmed",
  contentSummary: "The LOA for this matter covers taxable year 2023",
  ...overrides
});
const clientContext = { clientId: "client-a" };

await test("memory-read-scaffold imports successfully and index exports the read scaffold functions", () => {
  for (const name of READ_SCAFFOLD_EXPORTS) {
    equal(typeof boundaries[name], "function", `index exports ${name}`);
  }
  equal(typeof getMemoryReadScaffoldContract, "function", "direct module import works");
});

await test("read scaffold contract is scaffold-only with all runtime capabilities disabled", () => {
  const contract = getMemoryReadScaffoldContract();
  equal(contract.id, "PATCH-08H-MEMORY-READ-SCAFFOLD-1", "contract id");
  equal(contract.type, "memory_read_scaffold_only", "contract type");
  equal(contract.persistentReadAllowed, false, "persistentReadAllowed false");
  equal(contract.durableWriteAllowed, false, "durableWriteAllowed false");
  equal(contract.databaseAccessAllowed, false, "databaseAccessAllowed false");
  equal(contract.pipelineIntegrationAllowed, false, "pipelineIntegrationAllowed false");
  equal(contract.runtimeBehaviorChangeAllowed, false, "runtimeBehaviorChangeAllowed false");
  equal(contract.sourceAuthorityMutationAllowed, false, "sourceAuthorityMutationAllowed false");
  equal(contract.requiresFeatureFlag, "TINA_ENABLE_MEMORY_READS", "required feature flag");
  equal(contract.defaultEnabled, false, "defaultEnabled false");
  equal(contract.productionEnabled, false, "productionEnabled false");
  check(phase8f.featureFlags.some((flag) => flag.id === contract.requiresFeatureFlag), "flag is a Phase 8F governed flag");
});

await test("memory read flag defaults OFF and only an explicit boolean true enables it", () => {
  equal(isMemoryReadFlagEnabled(undefined).allowed, false, "undefined flag state OFF");
  equal(isMemoryReadFlagEnabled({}).allowed, false, "missing flag OFF");
  equal(isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: false }).allowed, false, "false OFF");
  equal(isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: "true" }).allowed, false, "string true OFF");
  equal(isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: 1 }).allowed, false, "truthy non-boolean OFF");
  equal(isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: true }).allowed, true, "boolean true ON");
  const off = isMemoryReadFlagEnabled(undefined);
  equal(off.flagName, "TINA_ENABLE_MEMORY_READS", "flagName reported");
  equal(off.defaultOff, true, "defaultOff reported");
  check(typeof off.reason === "string" && off.reason.length > 0, "structured reason present");
});

await test("flag OFF produces empty selection and READ_FLAG_OFF decisions", () => {
  for (const options of [undefined, {}, { flagState: {} }, { flagState: { TINA_ENABLE_MEMORY_READS: "true" } }]) {
    const result = selectEligibleMemoryForContext([clientItem()], clientContext, options);
    equal(result.selectedMemoryItems.length, 0, "flag OFF selection empty");
    equal(result.rejectedMemoryItems.length, 1, "flag OFF rejects all items");
    equal(result.decisions[0].decision, "READ_FLAG_OFF", "flag OFF decision code");
    equal(result.decisions[0].eligible, false, "flag OFF not eligible");
    equal(result.flagState.allowed, false, "flag state reported OFF");
  }
});

await test("no_store, prohibited_sensitive, and revoked memory are never readable", () => {
  const noStore = evaluateMemoryReadEligibility(clientItem({ permissionLevel: "no_store" }), clientContext, FLAG_ON);
  equal(noStore.eligible, false, "no_store not eligible");
  equal(noStore.decision, "READ_DENIED", "no_store denied");
  const prohibited = evaluateMemoryReadEligibility({ memoryId: "mem-p1", memoryClass: "prohibited_sensitive", contentSummary: "an API key" }, clientContext, FLAG_ON);
  equal(prohibited.eligible, false, "prohibited_sensitive not eligible");
  equal(prohibited.decision, "READ_DENIED", "prohibited_sensitive denied");
  const revoked = evaluateMemoryReadEligibility(clientItem({ status: "revoked" }), clientContext, FLAG_ON);
  equal(revoked.eligible, false, "revoked status not eligible");
  equal(evaluateMemoryReadEligibility(clientItem({ confidenceState: "revoked" }), clientContext, FLAG_ON).eligible, false, "revoked confidence not eligible");
  const fixtureProhibited = phase8b.memoryClasses.find((cls) => cls.id === "prohibited_sensitive");
  deepEqual(fixtureProhibited.allowedScopes, [], "Phase 8B fixture confirms prohibited_sensitive has no allowed scopes");
});

await test("denied, revoked, expired, and invalid consent states block durable reads per the Phase 8F fixture", () => {
  for (const state of ["denied", "revoked", "expired", "invalid"]) {
    const result = evaluateMemoryReadEligibility(clientItem({ consentState: state }), clientContext, FLAG_ON);
    equal(result.eligible, false, `${state} consent blocks read`);
    equal(result.decision, "READ_DENIED", `${state} consent denied`);
    check(phase8f.consentStates.some((entry) => entry.id === state), `${state} is a Phase 8F consent state`);
  }
  check(explainMemoryReadDecision(evaluateMemoryReadEligibility(clientItem({ consentState: "expired" }), clientContext, FLAG_ON)).includes("UNTIL_REFRESHED"), "expired consent blocked until refreshed");
});

await test("stale memory in high-risk tax/legal context requires confirmation", () => {
  const highRisk = { ...clientContext, riskLevel: "high", domain: "tax" };
  const stale = evaluateMemoryReadEligibility(clientItem({ confidenceState: "stale" }), highRisk, FLAG_ON);
  equal(stale.decision, "READ_REQUIRES_CONFIRMATION", "stale high-risk requires confirmation");
  equal(stale.eligible, false, "stale high-risk not eligible without confirmation");
  const staleViaOptions = evaluateMemoryReadEligibility(clientItem({ confidenceState: "stale" }), clientContext, { ...FLAG_ON, riskContext: { riskLevel: "high", domain: "legal" } });
  equal(staleViaOptions.decision, "READ_REQUIRES_CONFIRMATION", "options risk context also triggers confirmation");
  const staleLowRisk = evaluateMemoryReadEligibility(clientItem({ confidenceState: "stale" }), clientContext, FLAG_ON);
  equal(staleLowRisk.eligible, true, "stale low-risk remains eligible as context with live facts winning");
});

await test("contradicted memory requires clarification and is not eligible", () => {
  const result = evaluateMemoryReadEligibility(clientItem({ confidenceState: "contradicted" }), clientContext, FLAG_ON);
  equal(result.decision, "READ_REQUIRES_CONFIRMATION", "contradicted requires confirmation");
  equal(result.eligible, false, "contradicted not eligible");
  check(result.reasons.some((reason) => reason.includes("CLARIFICATION")), "contradicted reason requires clarification");
});

await test("client-scoped memory requires a matching client id", () => {
  const match = evaluateMemoryReadEligibility(clientItem(), clientContext, FLAG_ON);
  equal(match.eligible, true, "matching client memory eligible");
  equal(match.decision, "READ_ALLOWED", "matching client memory allowed");
  equal(match.scopeProof.scopeType, "client", "scope proof records client scope");
  equal(match.scopeProof.scopeId, "client-a", "scope proof records scope id");
  const mismatch = evaluateMemoryReadEligibility(clientItem(), { clientId: "client-b" }, FLAG_ON);
  equal(mismatch.eligible, false, "unrelated client memory rejected");
  check(mismatch.reasons.includes("CLIENT_SCOPE_MISMATCH"), "client mismatch reason");
});

await test("matter-scoped memory requires a matching matter id unless explicit transfer confirmation exists", () => {
  equal(evaluateMemoryReadEligibility(matterItem(), { matterId: "matter-x" }, FLAG_ON).eligible, true, "matching matter memory eligible");
  const mismatch = evaluateMemoryReadEligibility(matterItem(), { matterId: "matter-y" }, FLAG_ON);
  equal(mismatch.eligible, false, "unrelated matter memory rejected");
  check(mismatch.reasons.includes("MATTER_SCOPE_MISMATCH"), "matter mismatch reason");
  const transferred = evaluateMemoryReadEligibility(matterItem(), { matterId: "matter-y", explicitMatterTransferConfirmed: true }, FLAG_ON);
  equal(transferred.eligible, true, "explicit transfer confirmation allows scoped transfer");
  check(transferred.reasons.includes("EXPLICIT_MATTER_TRANSFER_CONFIRMATION_APPLIED"), "transfer reason recorded");
  const transferredViaOptions = evaluateMemoryReadEligibility(matterItem(), { matterId: "matter-y" }, { ...FLAG_ON, explicitMatterTransferConfirmed: true });
  equal(transferredViaOptions.eligible, true, "transfer confirmation may be represented in options");
});

await test("ambiguous scope defaults to session-only and is not durable read eligible", () => {
  const ambiguous = evaluateMemoryReadEligibility({ memoryId: "mem-a1", contentSummary: "unclear scope fact", consentState: "granted" }, clientContext, FLAG_ON);
  equal(ambiguous.eligible, false, "missing scope not durable read eligible");
  check(ambiguous.reasons.includes("AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY_NOT_DURABLE_READ"), "ambiguous defaults session-only");
  const explicitAmbiguous = evaluateMemoryReadEligibility(clientItem({ primary_scope_type: "ambiguous" }), clientContext, FLAG_ON);
  equal(explicitAmbiguous.eligible, false, "explicit ambiguous scope rejected");
  const sessionOnly = evaluateMemoryReadEligibility({ memoryId: "mem-s1", memoryClass: "temporary_session", contentSummary: "session assumption", consentState: "not_required" }, clientContext, FLAG_ON);
  equal(sessionOnly.eligible, false, "session-only memory is not durably readable");
});

await test("global_user memory cannot contain client confidential facts", () => {
  const leaking = evaluateMemoryReadEligibility({ memoryId: "mem-g1", memoryClass: "user_profile", primary_scope_type: "global_user", primary_scope_id: "user-1", consentState: "granted", containsClientConfidentialFact: true, contentSummary: "client audit exposure" }, {}, FLAG_ON);
  equal(leaking.eligible, false, "client confidential fact in global_user rejected");
  check(leaking.reasons.includes("GLOBAL_USER_MEMORY_CANNOT_CONTAIN_CLIENT_CONFIDENTIAL_FACTS"), "leakage reason recorded");
  const clean = evaluateMemoryReadEligibility({ memoryId: "mem-g2", memoryClass: "user_profile", primary_scope_type: "global_user", primary_scope_id: "user-1", consentState: "granted", contentSummary: "user is a CPA" }, {}, FLAG_ON);
  equal(clean.eligible, true, "clean global_user profile memory eligible");
  const fixtureGlobal = phase8d.scopeHierarchy.scopes.find((scope) => scope.id === "global_user");
  check(fixtureGlobal.leakageProhibitedTo.includes("client_confidential_facts"), "Phase 8D fixture prohibits client confidential leakage into global_user");
});

await test("source_derived memory is provenance-only and cannot assert currentness", () => {
  const provenance = evaluateMemoryReadEligibility({ memoryId: "mem-src-1", memoryClass: "source_derived", primary_scope_id: "doc-1", consentState: "not_required", contentSummary: "RR 16-2005 provenance note" }, clientContext, FLAG_ON);
  equal(provenance.eligible, true, "source_derived provenance read allowed");
  equal(provenance.scopeProof.provenanceOnly, true, "scope proof marks provenance-only");
  equal(provenance.scopeProof.currentnessAssertionAllowed, false, "currentness assertion not allowed");
  equal(provenance.scopeProof.readExpansionAllowed, false, "provenance read does not expand eligibility");
  equal(evaluateMemoryReadEligibility({ memoryClass: "source_derived", assertsCurrentness: true, contentSummary: "x" }, clientContext, FLAG_ON).eligible, false, "assertsCurrentness rejected");
  equal(evaluateMemoryReadEligibility({ memoryClass: "source_derived", claimsLegalCurrentness: true, contentSummary: "x" }, clientContext, FLAG_ON).eligible, false, "claimsLegalCurrentness rejected");
  equal(evaluateMemoryReadEligibility({ memoryClass: "source_derived", claimsCaseStatus: true, contentSummary: "x" }, clientContext, FLAG_ON).eligible, false, "case status claim rejected");
  const fixtureSourceDerived = phase8b.memoryClasses.find((cls) => cls.id === "source_derived");
  check(fixtureSourceDerived.prohibitedUses.includes("asserting legal currentness"), "Phase 8B fixture prohibits currentness assertion");
});

await test("source_document references do not expand read eligibility", () => {
  const expanding = evaluateMemoryReadEligibility(clientItem({ referenceScopes: [{ scopeType: "source_document", expandsReadEligibility: true }] }), clientContext, FLAG_ON);
  equal(expanding.eligible, false, "expanding reference scope rejected");
  check(expanding.reasons.includes("REFERENCE_SCOPE_NO_READ_EXPANSION"), "read-expansion denial reason");
  const nonExpanding = evaluateMemoryReadEligibility(clientItem({ referenceScopes: [{ scopeType: "source_document" }] }), clientContext, FLAG_ON);
  equal(nonExpanding.eligible, true, "non-expanding provenance reference allowed");
});

await test("authority-governed questions still require sources even when memory is eligible", () => {
  const result = evaluateMemoryReadEligibility(clientItem(), { ...clientContext, authorityGoverned: true }, FLAG_ON);
  equal(result.eligible, true, "memory may still be context");
  equal(result.sourcesStillRequired, true, "sources still required");
  check(result.reasons.includes("AUTHORITY_GOVERNED_QUESTION_STILL_REQUIRES_INDEXED_SOURCES"), "authority-governed reason recorded");
  equal(result.authorityUseProhibited, true, "authority use prohibited");
  const flagOff = evaluateMemoryReadEligibility(clientItem(), { ...clientContext, authorityGoverned: true }, {});
  equal(flagOff.sourcesStillRequired, true, "sources still required even when flag OFF");
});

await test("selection does not mutate inputs and returns structured decision outputs", () => {
  const items = [
    Object.freeze(clientItem()),
    Object.freeze(clientItem({ memoryId: "mem-client-2", primary_scope_id: "client-b" })),
    Object.freeze({ memoryId: "mem-p2", memoryClass: "prohibited_sensitive", contentSummary: "secret" })
  ];
  const frozenInput = Object.freeze(items.slice());
  const context = Object.freeze({ clientId: "client-a" });
  const result = selectEligibleMemoryForContext(frozenInput, context, FLAG_ON);
  equal(result.selectedMemoryItems.length, 1, "one eligible item selected");
  equal(result.rejectedMemoryItems.length, 2, "two items rejected");
  equal(result.decisions.length, 3, "one decision per item");
  equal(result.authorityUseProhibited, true, "selection marks authorityUseProhibited");
  equal(result.legalConclusionProhibited, true, "selection marks legalConclusionProhibited");
  equal(result.flagState.allowed, true, "flag state included");
  deepEqual(items[0], clientItem(), "input item unchanged");
  deepEqual(context, { clientId: "client-a" }, "request context unchanged");
  check(result.decisions.every((entry) => typeof entry.memoryId === "string" && typeof entry.decision === "string"), "decisions are structured with memory ids");
});

await test("structured memory context uses only permitted non-authority phrasing", () => {
  const selected = [clientItem(), matterItem()];
  const context = buildStructuredMemoryContext(selected, clientContext, FLAG_ON);
  equal(context.memoryContextAllowed, true, "context allowed for eligible items");
  equal(context.phrasing, "user/matter context indicates:", "permitted phrasing only");
  equal(context.contextItems.length, 2, "context item per memory");
  for (const item of context.contextItems) {
    check(item.phrasing.startsWith("user/matter context indicates:"), "context item uses permitted phrasing");
    equal(item.authorityUseProhibited, true, "context item is not authority");
    equal(item.citationAuthorityAllowed, false, "context item creates no citation authority");
    equal(item.sourceCardMutationAllowed, false, "context item creates no source cards");
  }
  equal(context.citationAuthorityCreated, false, "no citations created");
  equal(context.sourceCurrentnessClaimed, false, "no source currentness claimed");
  equal(context.caseStatusClaimed, false, "no case status claimed");
  equal(context.authorityUseProhibited, true, "context marks authority use prohibited");
  equal(context.legalConclusionProhibited, true, "context marks legal conclusion prohibited");
  check(context.prohibitedUses.length > 0, "prohibited uses enumerated");
  check(!("citations" in context) && !("sourceCards" in context), "no citation or source-card payloads");
  const flagOff = buildStructuredMemoryContext(selected, clientContext, {});
  equal(flagOff.memoryContextAllowed, false, "flag OFF disables memory context");
  equal(flagOff.contextItems.length, 0, "flag OFF context is empty");
});

await test("structured memory context does not mutate SAE, sourceAvailability, retrieval, or source-card states", () => {
  const saeState = Object.freeze({ classification: "AUTHORITY_FOUND", locked: true });
  const sourceAvailabilityState = Object.freeze({ status: "AVAILABLE_VERIFIED" });
  const retrievalState = Object.freeze({ chunks: Object.freeze(["chunk-1"]) });
  const sourceCards = Object.freeze([Object.freeze({ id: "card-1", title: "NIRC Section 106" })]);
  const requestContext = Object.freeze({ clientId: "client-a", saeState, sourceAvailabilityState, retrievalState, sourceCards });
  const context = buildStructuredMemoryContext([clientItem()], requestContext, FLAG_ON);
  deepEqual(saeState, { classification: "AUTHORITY_FOUND", locked: true }, "SAE state unchanged");
  deepEqual(sourceAvailabilityState, { status: "AVAILABLE_VERIFIED" }, "sourceAvailability state unchanged");
  deepEqual(retrievalState, { chunks: ["chunk-1"] }, "retrieval state unchanged");
  deepEqual(sourceCards, [{ id: "card-1", title: "NIRC Section 106" }], "source cards unchanged");
  check(!("saeState" in context) && !("sourceAvailabilityState" in context), "context result carries no authority state");
  equal(boundaries.validateMemoryAuthoritySeparation({ authorityUseProhibited: context.authorityUseProhibited, legalConclusionProhibited: context.legalConclusionProhibited }).allowed, true, "context satisfies authority separation");
});

await test("explainMemoryReadDecision returns readable text", () => {
  const allowed = explainMemoryReadDecision(evaluateMemoryReadEligibility(clientItem(), clientContext, FLAG_ON));
  check(typeof allowed === "string" && allowed.includes("READ_ALLOWED"), "allowed decision explained");
  const off = explainMemoryReadDecision(evaluateMemoryReadEligibility(clientItem(), clientContext, {}));
  check(off.includes("READ_FLAG_OFF"), "flag OFF decision explained");
  check(off.includes("Memory is context, never authority."), "explanation restates non-authority rule");
});

await test("assertReadScaffoldNoRuntimeSideEffects returns all runtime side-effect checks false", () => {
  const assurance = assertReadScaffoldNoRuntimeSideEffects();
  const expectedKeys = [
    "importsRuntimePipeline", "importsRoutes", "importsDatabase", "importsSupabase",
    "importsOpenAI", "importsRetrieval", "importsSourceCards", "importsSourceAvailability",
    "performsPersistentReads", "performsWrites", "mutatesAuthorityState"
  ];
  for (const key of expectedKeys) {
    equal(assurance[key], false, `${key} is false`);
  }
});

await test("scaffold source text does not import runtime, DB, Supabase, OpenAI, retrieval, source-card, or sourceAvailability modules", () => {
  const forbidden = [
    "pipeline", "ask-handler", "routes", "supabase", "openai", "retrieval",
    "source-card", "sourceAvailability", "source-availability", "db", "database",
    "server.js", "express"
  ];
  for (const path of ["memory-boundaries/memory-read-scaffold.js", "memory-boundaries/index.js"]) {
    const raw = readFileSync(resolve(path), "utf8");
    const imports = raw.split(/\r?\n/).filter((line) => /^\s*import\s|from\s+["']/.test(line)).join("\n");
    for (const token of forbidden) {
      check(!imports.includes(token), `${path} must not import ${token}`);
    }
    check(!raw.includes("process.env"), `${path} must not read process.env`);
  }
});

await test("no DB/migration/table, route/controller/pipeline, or frontend files are created and deferred boundaries remain excluded", () => {
  const forbiddenFiles = [
    "memory-read-service.js", "memory-boundaries/memory-read-service.js",
    "migrations/phase-8h-memory.sql", "supabase/memory-read.sql",
    "routes/memory.js", "routes/memory-read.js", "controllers/memory-read-controller.js",
    "frontend/memory-read-ui.js", "src/MemoryPanel.jsx",
    "phase10-court-metadata.js", "phase11-cache.js"
  ];
  for (const file of forbiddenFiles) {
    check(!existsSync(resolve(file)), `${file} must not exist`);
  }
  const deferred = boundaries.getDeferredBoundaries();
  for (const id of ["phase10_source_governance", "phase10_court_metadata", "phase10_hallucination_traps", "phase11_observability_performance"]) {
    const boundary = deferred.find((entry) => entry.id === id);
    equal(boundary.implementationAllowedHere, false, `${id} remains deferred`);
  }
});

await test("memory remains context, never authority, using in-memory mock items only", () => {
  const contract = getMemoryReadScaffoldContract();
  equal(contract.persistentReadAllowed, false, "no persistent read capability");
  const result = evaluateMemoryReadEligibility(clientItem(), clientContext, FLAG_ON);
  equal(result.authorityUseProhibited, true, "read decision prohibits authority use");
  equal(result.legalConclusionProhibited, true, "read decision prohibits legal conclusions");
  equal(result.sourceAuthorityMutationAllowed, false, "read decision prohibits source-authority mutation");
  check(phase8b.memoryClasses.every((cls) => cls.mustNotAffectAuthority === true), "Phase 8B fixture: memory must not affect authority");
  check(phase8d.baseContracts.scopeTypes.includes("client") && phase8d.baseContracts.scopeTypes.includes("matter"), "scopes used in tests are Phase 8D scope types");
  equal(isMemoryReadFlagEnabled({ TINA_ENABLE_MEMORY_READS: true }).allowed, true, "read scaffold enables only via explicit flag object");
  equal(isMemoryReadFlagEnabled().allowed, false, "read scaffold remains disabled by default");
});

console.log(`\nPATCH-08H-MEMORY-READ-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
