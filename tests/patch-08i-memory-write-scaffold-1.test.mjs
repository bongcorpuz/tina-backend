// PATCH-08I-MEMORY-WRITE-SCAFFOLD-1 - memory write scaffold tests.
// Contract-only validation using in-memory mock write candidates exclusively.
// No durable write, persistent read, DB/Supabase access, runtime consent handling,
// pipeline wiring, or runtime change is tested or implemented.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import * as boundaries from "../memory-boundaries/index.js";
import {
  getMemoryWriteScaffoldContract,
  isMemoryWriteFlagEnabled,
  evaluateMemoryWriteEligibility,
  buildNonPersistentWritePlan,
  rejectProhibitedMemoryCandidate,
  validateWriteCandidateContract,
  explainMemoryWriteDecision,
  assertWriteScaffoldNoRuntimeSideEffects
} from "../memory-boundaries/memory-write-scaffold.js";

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

const FLAG_ON = { flagState: { TINA_ENABLE_MEMORY_WRITES: true } };
const WRITE_SCAFFOLD_EXPORTS = [
  "getMemoryWriteScaffoldContract", "isMemoryWriteFlagEnabled", "evaluateMemoryWriteEligibility",
  "buildNonPersistentWritePlan", "rejectProhibitedMemoryCandidate", "validateWriteCandidateContract",
  "explainMemoryWriteDecision", "assertWriteScaffoldNoRuntimeSideEffects"
];

const approveResponse = (overrides = {}) => ({
  userResponse: "approve",
  approved: true,
  consentEventId: "consent-evt-1",
  ...overrides
});
const clientCandidate = (overrides = {}) => ({
  memoryClass: "client_entity",
  permissionLevel: "client_scoped",
  primary_scope_type: "client",
  primary_scope_id: "client-a",
  scopeLabel: "Client A",
  contentSummary: "Client A is VAT-registered per user-confirmed statement",
  sensitivityLabel: "normal",
  confidenceState: "user_confirmed",
  authorityUseProhibited: true,
  legalConclusionProhibited: true,
  sourceRefs: [],
  ...overrides
});
const matterCandidate = (overrides = {}) => ({
  memoryClass: "matter",
  permissionLevel: "matter_scoped",
  primary_scope_type: "matter",
  primary_scope_id: "matter-x",
  scopeLabel: "BIR LOA Matter",
  contentSummary: "The LOA for this matter covers taxable year 2023",
  sensitivityLabel: "normal",
  confidenceState: "user_confirmed",
  authorityUseProhibited: true,
  legalConclusionProhibited: true,
  sourceRefs: [],
  ...overrides
});
const confirmedContext = { visibleScopeConfirmed: true };
const approvedOpts = (extra = {}) => ({ ...FLAG_ON, consentResponse: approveResponse(), ...extra });

await test("memory-write-scaffold imports successfully and index exports the write scaffold functions", () => {
  for (const name of WRITE_SCAFFOLD_EXPORTS) {
    equal(typeof boundaries[name], "function", `index exports ${name}`);
  }
  equal(typeof getMemoryWriteScaffoldContract, "function", "direct module import works");
});

await test("write scaffold contract is scaffold-only with all runtime capabilities disabled", () => {
  const contract = getMemoryWriteScaffoldContract();
  equal(contract.id, "PATCH-08I-MEMORY-WRITE-SCAFFOLD-1", "contract id");
  equal(contract.type, "memory_write_scaffold_only", "contract type");
  equal(contract.persistentWriteAllowed, false, "persistentWriteAllowed false");
  equal(contract.persistentReadAllowed, false, "persistentReadAllowed false");
  equal(contract.durableWriteAllowed, false, "durableWriteAllowed false");
  equal(contract.databaseAccessAllowed, false, "databaseAccessAllowed false");
  equal(contract.pipelineIntegrationAllowed, false, "pipelineIntegrationAllowed false");
  equal(contract.runtimeBehaviorChangeAllowed, false, "runtimeBehaviorChangeAllowed false");
  equal(contract.sourceAuthorityMutationAllowed, false, "sourceAuthorityMutationAllowed false");
  equal(contract.requiresFeatureFlag, "TINA_ENABLE_MEMORY_WRITES", "required feature flag");
  equal(contract.defaultEnabled, false, "defaultEnabled false");
  equal(contract.productionEnabled, false, "productionEnabled false");
  check(phase8f.featureFlags.some((flag) => flag.id === contract.requiresFeatureFlag), "flag is a Phase 8F governed flag");
});

await test("memory write flag defaults OFF and only an explicit boolean true enables it", () => {
  equal(isMemoryWriteFlagEnabled(undefined).allowed, false, "undefined flag state OFF");
  equal(isMemoryWriteFlagEnabled({}).allowed, false, "missing flag OFF");
  equal(isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: false }).allowed, false, "false OFF");
  equal(isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: "true" }).allowed, false, "string true OFF");
  equal(isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: 1 }).allowed, false, "truthy non-boolean OFF");
  equal(isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: true }).allowed, true, "boolean true ON");
  const off = isMemoryWriteFlagEnabled(undefined);
  equal(off.flagName, "TINA_ENABLE_MEMORY_WRITES", "flagName reported");
  equal(off.defaultOff, true, "defaultOff reported");
  check(typeof off.reason === "string" && off.reason.length > 0, "structured reason present");
});

await test("flag OFF returns WRITE_FLAG_OFF and produces no write plan", () => {
  for (const options of [undefined, {}, { flagState: {} }, { flagState: { TINA_ENABLE_MEMORY_WRITES: "true" } }]) {
    const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, options);
    equal(result.decision, "WRITE_FLAG_OFF", "flag OFF decision code");
    equal(result.eligible, false, "flag OFF not eligible");
    equal(result.proposedWritePlan, null, "flag OFF produces no write plan");
    equal(result.persistentWritePerformed, false, "no persistent write performed");
  }
});

await test("no_store is never persistable and session_only creates no durable memory", () => {
  const noStore = evaluateMemoryWriteEligibility(clientCandidate({ permissionLevel: "no_store" }), confirmedContext, approvedOpts());
  equal(noStore.eligible, false, "no_store not persistable");
  check(noStore.reasons.includes("NO_STORE_MEMORY_NEVER_PERSISTABLE"), "no_store reason");
  const sessionOnly = evaluateMemoryWriteEligibility(clientCandidate({ permissionLevel: "session_only" }), confirmedContext, approvedOpts());
  equal(sessionOnly.eligible, false, "session_only creates no durable memory");
  check(sessionOnly.reasons.includes("SESSION_ONLY_CREATES_NO_DURABLE_MEMORY"), "session_only reason");
  equal(sessionOnly.proposedWritePlan, null, "session_only produces no plan");
  const temp = evaluateMemoryWriteEligibility({ memoryClass: "temporary_session", permissionLevel: "matter_scoped", primary_scope_type: "session", primary_scope_id: "s1", contentSummary: "draft assumption", authorityUseProhibited: true, legalConclusionProhibited: true }, confirmedContext, approvedOpts());
  equal(temp.eligible, false, "temporary_session class creates no durable memory");
});

await test("prohibited_sensitive, credentials/secrets, raw confidential documents, and unsupported conclusions are never writable", () => {
  const prohibitedClass = evaluateMemoryWriteEligibility(clientCandidate({ memoryClass: "prohibited_sensitive" }), confirmedContext, approvedOpts());
  equal(prohibitedClass.decision, "WRITE_PROHIBITED", "prohibited_sensitive never writable");
  const password = rejectProhibitedMemoryCandidate({ contentSummary: "the password is hunter2" });
  equal(password.rejected, true, "password content rejected");
  const apiKey = rejectProhibitedMemoryCandidate({ contentSummary: "store this api_key sk-12345" });
  equal(apiKey.rejected, true, "api_key content rejected");
  const secret = rejectProhibitedMemoryCandidate({ contentSummary: "client secret value abc" });
  equal(secret.rejected, true, "secret content rejected");
  const credentialFlag = rejectProhibitedMemoryCandidate({ containsCredentials: true, contentSummary: "x" });
  equal(credentialFlag.rejected, true, "private credential flag rejected");
  const rawDoc = rejectProhibitedMemoryCandidate({ rawConfidentialDocumentText: "full contract text..." });
  equal(rawDoc.rejected, true, "raw confidential document text rejected");
  check(rawDoc.prohibitedCategories.includes("raw_confidential_document_text"), "raw document category recorded");
  const legalConclusion = rejectProhibitedMemoryCandidate({ unsupportedLegalConclusionAsAuthority: true });
  equal(legalConclusion.rejected, true, "unsupported legal conclusion as authority rejected");
  const taxConclusion = rejectProhibitedMemoryCandidate({ unsupportedTaxConclusionAsAuthority: true });
  equal(taxConclusion.rejected, true, "unsupported tax conclusion as authority rejected");
  const viaEvaluate = evaluateMemoryWriteEligibility(clientCandidate({ contentSummary: "remember my password hunter2" }), confirmedContext, approvedOpts());
  equal(viaEvaluate.decision, "WRITE_PROHIBITED", "evaluate routes prohibited content to WRITE_PROHIBITED");
  const clean = rejectProhibitedMemoryCandidate(clientCandidate());
  equal(clean.rejected, false, "clean candidate not rejected");
  equal(clean.code, "NO_PROHIBITED_CONTENT_DETECTED", "clean candidate structured non-rejection");
});

await test("sensitive client and matter facts require explicit consent", () => {
  const sensitiveClient = evaluateMemoryWriteEligibility(clientCandidate({ sensitiveDataPresent: true, sensitivityLabel: "sensitive" }), confirmedContext, FLAG_ON);
  equal(sensitiveClient.decision, "WRITE_REQUIRES_CONSENT", "sensitive client fact requires explicit consent");
  check(sensitiveClient.reasons.includes("SENSITIVE_CLIENT_MATTER_REQUIRES_EXPLICIT_CONSENT"), "sensitive client reason");
  const sensitiveMatter = evaluateMemoryWriteEligibility(matterCandidate({ sensitiveDataPresent: true, sensitivityLabel: "sensitive" }), confirmedContext, FLAG_ON);
  equal(sensitiveMatter.decision, "WRITE_REQUIRES_CONSENT", "sensitive matter fact requires explicit consent");
  const sensitiveApproved = evaluateMemoryWriteEligibility(clientCandidate({ sensitiveDataPresent: true, sensitivityLabel: "sensitive" }), confirmedContext, approvedOpts());
  equal(sensitiveApproved.eligible, true, "explicit approve satisfies sensitive consent requirement");
});

await test("client_entity and matter memory require visible scope confirmation", () => {
  const clientNoScope = evaluateMemoryWriteEligibility(clientCandidate(), {}, approvedOpts());
  equal(clientNoScope.decision, "WRITE_REQUIRES_SCOPE_CONFIRMATION", "client requires visible scope confirmation");
  check(clientNoScope.reasons.includes("CLIENT_ENTITY_REQUIRES_VISIBLE_CLIENT_SCOPE_CONFIRMATION"), "client scope reason");
  const clientNoLabel = evaluateMemoryWriteEligibility(clientCandidate({ scopeLabel: undefined }), confirmedContext, approvedOpts());
  equal(clientNoLabel.decision, "WRITE_REQUIRES_SCOPE_CONFIRMATION", "client scope label must be visible");
  const matterNoScope = evaluateMemoryWriteEligibility(matterCandidate(), {}, approvedOpts());
  equal(matterNoScope.decision, "WRITE_REQUIRES_SCOPE_CONFIRMATION", "matter requires visible scope confirmation");
  check(matterNoScope.reasons.includes("MATTER_MEMORY_REQUIRES_VISIBLE_MATTER_SCOPE_CONFIRMATION"), "matter scope reason");
  equal(evaluateMemoryWriteEligibility(matterCandidate(), confirmedContext, approvedOpts()).eligible, true, "confirmed matter scope is eligible");
});

await test("ambiguous scope defaults to session-only and no durable write", () => {
  const ambiguous = evaluateMemoryWriteEligibility(clientCandidate({ primary_scope_type: "ambiguous" }), confirmedContext, approvedOpts());
  equal(ambiguous.eligible, false, "ambiguous scope no durable write");
  check(ambiguous.reasons.includes("AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY_NO_DURABLE_WRITE"), "ambiguous defaults session-only");
  const missing = evaluateMemoryWriteEligibility(clientCandidate({ primary_scope_type: undefined }), confirmedContext, approvedOpts());
  equal(missing.eligible, false, "missing scope no durable write");
  check(phase8f.consentScopeRules.some((rule) => rule.id === "AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY"), "Phase 8F fixture confirms ambiguous-scope rule");
});

await test("deny, session_only, and ask_later consent responses create no durable write per the Phase 8F fixture", () => {
  for (const userResponse of ["deny", "session_only", "ask_later"]) {
    const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, { ...FLAG_ON, consentResponse: { userResponse } });
    equal(result.eligible, false, `${userResponse} creates no durable write`);
    equal(result.decision, "WRITE_DENIED", `${userResponse} denied`);
    equal(result.proposedWritePlan, null, `${userResponse} produces no plan`);
    check(result.reasons.includes(`${userResponse.toUpperCase()}_CREATES_NO_DURABLE_WRITE`), `${userResponse} no-write reason`);
    check(phase8f.memoryConsentResponseContract.rules.includes(`${userResponse}_creates_no_durable_memory`), `${userResponse} rule exists in Phase 8F fixture`);
  }
});

await test("revoked, expired, and invalid consent states block writes", () => {
  for (const state of ["revoked", "expired", "invalid"]) {
    const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, approvedOpts({ consentState: state }));
    equal(result.eligible, false, `${state} consent blocks write`);
    equal(result.decision, "WRITE_DENIED", `${state} consent denied`);
    check(phase8f.consentStates.some((entry) => entry.id === state), `${state} is a Phase 8F consent state`);
  }
});

await test("approve_with_edits supersedes the original candidate summary", () => {
  const response = approveResponse({ userResponse: "approve_with_edits", editedContentSummary: "Client A is VAT-registered effective 2024 per user edit" });
  const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, { ...FLAG_ON, consentResponse: response });
  equal(result.eligible, true, "approve_with_edits eligible");
  check(result.reasons.includes("APPROVE_WITH_EDITS_SUPERSEDES_ORIGINAL_CANDIDATE"), "supersession reason");
  equal(result.proposedWritePlan.contentSummary, "Client A is VAT-registered effective 2024 per user edit", "plan uses edited summary");
  equal(result.proposedWritePlan.originalCandidateSuperseded, true, "original candidate marked superseded");
});

await test("choose_different_scope requires scope validation", () => {
  const missingScope = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, { ...FLAG_ON, consentResponse: { userResponse: "choose_different_scope" } });
  equal(missingScope.decision, "WRITE_REQUIRES_SCOPE_CONFIRMATION", "missing selected scope requires confirmation");
  check(missingScope.reasons.includes("DIFFERENT_SCOPE_REQUIRES_SCOPE_VALIDATION"), "scope validation reason");
  check(phase8f.memoryConsentResponseContract.rules.includes("choose_different_scope_requires_scope_validation"), "Phase 8F fixture confirms scope-validation rule");
});

await test("source_derived memory is provenance-only and cannot assert currentness", () => {
  const provenance = evaluateMemoryWriteEligibility({ memoryClass: "source_derived", permissionLevel: "explicit_consent", primary_scope_type: "source_document", primary_scope_id: "doc-1", contentSummary: "RR 16-2005 provenance note", authorityUseProhibited: true, legalConclusionProhibited: true }, confirmedContext, approvedOpts());
  equal(provenance.eligible, false, "source_derived has no durable write in Phase 8");
  check(provenance.reasons.includes("SOURCE_DERIVED_PROVENANCE_ONLY_NO_DURABLE_WRITE"), "provenance-only reason");
  const currentness = rejectProhibitedMemoryCandidate({ memoryClass: "source_derived", claimsLegalCurrentness: true });
  equal(currentness.rejected, true, "source_derived currentness claim rejected");
  const fixtureSourceDerived = phase8f.consentRequirementMatrix.find((row) => row.memoryClass === "source_derived");
  equal(fixtureSourceDerived.durableWriteAllowed, false, "Phase 8F fixture: source_derived durable write not allowed");
});

await test("global_user memory cannot contain client confidential facts", () => {
  const leaking = evaluateMemoryWriteEligibility({ memoryClass: "user_profile", permissionLevel: "user_profile", primary_scope_type: "global_user", primary_scope_id: "user-1", contentSummary: "client audit exposure detail", containsClientConfidentialFact: true, authorityUseProhibited: true, legalConclusionProhibited: true }, {}, approvedOpts());
  equal(leaking.eligible, false, "client confidential fact in global_user rejected");
  check(leaking.reasons.includes("GLOBAL_USER_MEMORY_CANNOT_CONTAIN_CLIENT_CONFIDENTIAL_FACTS"), "leakage reason recorded");
  const clean = evaluateMemoryWriteEligibility({ memoryClass: "user_profile", permissionLevel: "user_profile", primary_scope_type: "global_user", primary_scope_id: "user-1", contentSummary: "user is a CPA", authorityUseProhibited: true, legalConclusionProhibited: true }, {}, approvedOpts());
  equal(clean.eligible, true, "clean global_user profile memory writable as plan only");
});

await test("validateWriteCandidateContract enforces exactly one class, permission level, scope type, and scope id", () => {
  equal(validateWriteCandidateContract(clientCandidate({ memoryClass: undefined })).code, "MEMORY_CLASS_REQUIRED_EXACTLY_ONCE", "missing memory_class rejected");
  equal(validateWriteCandidateContract(clientCandidate({ memory_class: "matter" })).code, "MEMORY_CLASS_REQUIRED_EXACTLY_ONCE", "duplicate memory_class rejected");
  equal(validateWriteCandidateContract(clientCandidate({ permissionLevel: undefined })).code, "PERMISSION_LEVEL_REQUIRED_EXACTLY_ONCE", "missing permission_level rejected");
  equal(validateWriteCandidateContract(clientCandidate({ permission_level: "matter_scoped" })).code, "PERMISSION_LEVEL_REQUIRED_EXACTLY_ONCE", "duplicate permission_level rejected");
  equal(validateWriteCandidateContract(clientCandidate({ primary_scope_type: undefined })).code, "PRIMARY_SCOPE_TYPE_REQUIRED_EXACTLY_ONCE", "missing primary_scope_type rejected");
  equal(validateWriteCandidateContract(clientCandidate({ primaryScopeType: "matter" })).code, "PRIMARY_SCOPE_TYPE_REQUIRED_EXACTLY_ONCE", "duplicate primary_scope_type rejected");
  equal(validateWriteCandidateContract(clientCandidate({ primary_scope_id: undefined })).code, "PRIMARY_SCOPE_ID_REQUIRED_EXACTLY_ONCE", "missing primary_scope_id rejected");
  equal(validateWriteCandidateContract(clientCandidate({ primaryScopeId: "client-b" })).code, "PRIMARY_SCOPE_ID_REQUIRED_EXACTLY_ONCE", "duplicate primary_scope_id rejected");
  equal(validateWriteCandidateContract(clientCandidate()).allowed, true, "valid candidate passes");
});

await test("invalid taxonomy values and missing authority-separation flags are rejected", () => {
  equal(validateWriteCandidateContract(clientCandidate({ memoryClass: "not_a_memory_class" })).code, "INVALID_MEMORY_CLASS", "invalid memory_class rejected");
  equal(validateWriteCandidateContract(clientCandidate({ permissionLevel: "super_admin_memory" })).code, "INVALID_PERMISSION_LEVEL", "invalid permission_level rejected");
  equal(validateWriteCandidateContract(clientCandidate({ primary_scope_type: "kingdom" })).code, "INVALID_PRIMARY_SCOPE_TYPE", "invalid scope type rejected");
  equal(validateWriteCandidateContract(clientCandidate({ authorityUseProhibited: false })).code, "AUTHORITY_USE_PROHIBITED_MUST_BE_TRUE", "authorityUseProhibited false rejected");
  equal(validateWriteCandidateContract(clientCandidate({ authorityUseProhibited: undefined })).code, "AUTHORITY_USE_PROHIBITED_MUST_BE_TRUE", "authorityUseProhibited missing rejected");
  equal(validateWriteCandidateContract(clientCandidate({ legalConclusionProhibited: false })).code, "LEGAL_CONCLUSION_PROHIBITED_MUST_BE_TRUE", "legalConclusionProhibited false rejected");
  equal(validateWriteCandidateContract(clientCandidate({ legalConclusionProhibited: undefined })).code, "LEGAL_CONCLUSION_PROHIBITED_MUST_BE_TRUE", "legalConclusionProhibited missing rejected");
  check(phase8b.memoryClasses.some((cls) => cls.id === "client_entity"), "Phase 8B fixture contains classes used in tests");
  check(phase8d.baseContracts.scopeTypes.includes("client"), "Phase 8D fixture contains scope types used in tests");
});

await test("eligible approved candidate returns WRITE_ALLOWED_PLAN_ONLY with a fully non-persistent plan", () => {
  const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, approvedOpts());
  equal(result.decision, "WRITE_ALLOWED_PLAN_ONLY", "approved candidate returns plan-only decision");
  equal(result.eligible, true, "approved candidate eligible");
  equal(result.persistentWritePerformed, false, "decision performs no persistent write");
  check(result.consentProof !== null, "consent proof present");
  equal(result.consentProof.authorizesStorageOnly, true, "consent authorizes storage only");
  equal(result.consentProof.authorizesAuthorityUse, false, "consent never authorizes authority use");
  check(result.scopeProof !== null, "scope proof present");
  equal(result.scopeProof.visibleScopeConfirmed, true, "scope proof records visible confirmation");
  const plan = result.proposedWritePlan;
  equal(plan.persistentWritePerformed, false, "plan persistentWritePerformed false");
  equal(plan.databaseWritePerformed, false, "plan databaseWritePerformed false");
  equal(plan.durableMemoryCreated, false, "plan durableMemoryCreated false");
  equal(plan.authorityUseProhibited, true, "plan authorityUseProhibited true");
  equal(plan.legalConclusionProhibited, true, "plan legalConclusionProhibited true");
  equal(plan.citationAuthorityCreated, false, "plan creates no citation authority");
  equal(plan.sourceCurrentnessClaimed, false, "plan claims no source currentness");
  equal(plan.caseStatusClaimed, false, "plan claims no case status");
  equal(plan.proposedMemoryClass, "client_entity", "plan records memory class");
  equal(plan.proposedPermissionLevel, "client_scoped", "plan records permission level");
  equal(plan.proposedPrimaryScopeType, "client", "plan records scope type");
  equal(plan.proposedPrimaryScopeId, "client-a", "plan records scope id");
});

await test("approved write plan includes consent event and future audit event requirements", () => {
  const plan = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, approvedOpts()).proposedWritePlan;
  equal(plan.consentEventRequired, true, "plan includes consentEventRequired");
  equal(plan.consentEventId, "consent-evt-1", "plan includes consentEventId when required");
  check(Array.isArray(plan.auditEventsToCreateLater) && plan.auditEventsToCreateLater.length > 0, "plan includes auditEventsToCreateLater");
  for (const eventId of plan.auditEventsToCreateLater) {
    check(phase8f.consentEventTypes.some((entry) => entry.id === eventId), `${eventId} is a Phase 8F consent event type`);
  }
  check(Array.isArray(plan.sourceRefs), "plan includes sourceRefs");
  check(plan.prohibitedUses.length > 0, "plan enumerates prohibited uses");
  check(typeof plan.sensitivityLabel === "string", "plan includes sensitivityLabel");
  check(typeof plan.confidenceState === "string", "plan includes confidenceState");
});

await test("write plan construction does not mutate the candidate or the consent response", () => {
  const candidate = Object.freeze(clientCandidate());
  const response = Object.freeze(approveResponse({ userResponse: "approve_with_edits", editedContentSummary: "Edited summary" }));
  const context = Object.freeze({ visibleScopeConfirmed: true });
  evaluateMemoryWriteEligibility(candidate, context, Object.freeze({ ...FLAG_ON, consentResponse: response }));
  buildNonPersistentWritePlan(candidate, response, context, FLAG_ON);
  deepEqual(candidate, clientCandidate(), "candidate unchanged");
  deepEqual(response, approveResponse({ userResponse: "approve_with_edits", editedContentSummary: "Edited summary" }), "consent response unchanged");
  deepEqual(context, { visibleScopeConfirmed: true }, "request context unchanged");
});

await test("write scaffold does not mutate SAE, sourceAvailability, retrieval, or source-card states", () => {
  const saeState = Object.freeze({ classification: "AUTHORITY_FOUND", locked: true });
  const sourceAvailabilityState = Object.freeze({ status: "AVAILABLE_VERIFIED" });
  const retrievalState = Object.freeze({ chunks: Object.freeze(["chunk-1"]) });
  const sourceCards = Object.freeze([Object.freeze({ id: "card-1", title: "NIRC Section 106" })]);
  const requestContext = Object.freeze({ visibleScopeConfirmed: true, saeState, sourceAvailabilityState, retrievalState, sourceCards });
  const result = evaluateMemoryWriteEligibility(clientCandidate(), requestContext, approvedOpts());
  equal(result.eligible, true, "evaluation succeeds against frozen authority states");
  deepEqual(saeState, { classification: "AUTHORITY_FOUND", locked: true }, "SAE state unchanged");
  deepEqual(sourceAvailabilityState, { status: "AVAILABLE_VERIFIED" }, "sourceAvailability state unchanged");
  deepEqual(retrievalState, { chunks: ["chunk-1"] }, "retrieval state unchanged");
  deepEqual(sourceCards, [{ id: "card-1", title: "NIRC Section 106" }], "source cards unchanged");
  check(!("saeState" in result.proposedWritePlan), "plan carries no authority state");
  equal(boundaries.validateMemoryAuthoritySeparation({ authorityUseProhibited: true, legalConclusionProhibited: true }).allowed, true, "authority separation remains enforceable");
});

await test("rejectProhibitedMemoryCandidate rejects case currentness, supersession, and Phase 10 bypass claims", () => {
  const caseClaim = rejectProhibitedMemoryCandidate({ claimsCaseStatus: true, contentSummary: "case is final" });
  equal(caseClaim.rejected, true, "court case currentness claim rejected");
  check(caseClaim.prohibitedCategories.includes("court_case_currentness_claim"), "case currentness category");
  const supersession = rejectProhibitedMemoryCandidate({ assertsSupersession: true });
  equal(supersession.rejected, true, "source supersession claim rejected");
  check(supersession.prohibitedCategories.includes("source_currentness_or_supersession_claim"), "supersession category");
  const currentness = rejectProhibitedMemoryCandidate({ sourceCurrentnessStatus: "current" });
  equal(currentness.rejected, true, "source currentness claim rejected");
  const bypass = rejectProhibitedMemoryCandidate({ bypassPhase10Deferral: true });
  equal(bypass.rejected, true, "Phase 10 bypass claim rejected");
  check(bypass.prohibitedCategories.includes("phase10_bypass_claim"), "Phase 10 bypass category");
});

await test("explainMemoryWriteDecision returns readable text", () => {
  const allowed = explainMemoryWriteDecision(evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, approvedOpts()));
  check(typeof allowed === "string" && allowed.includes("WRITE_ALLOWED_PLAN_ONLY"), "allowed decision explained");
  const off = explainMemoryWriteDecision(evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, {}));
  check(off.includes("WRITE_FLAG_OFF"), "flag OFF decision explained");
  check(off.includes("Memory is context, never authority."), "explanation restates non-authority rule");
});

await test("assertWriteScaffoldNoRuntimeSideEffects returns all runtime side-effect checks false", () => {
  const assurance = assertWriteScaffoldNoRuntimeSideEffects();
  const expectedKeys = [
    "importsRuntimePipeline", "importsRoutes", "importsDatabase", "importsSupabase",
    "importsOpenAI", "importsRetrieval", "importsSourceCards", "importsSourceAvailability",
    "performsPersistentReads", "performsPersistentWrites", "performsWrites", "mutatesAuthorityState"
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
  for (const path of ["memory-boundaries/memory-write-scaffold.js", "memory-boundaries/index.js"]) {
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
    "memory-write-service.js", "memory-boundaries/memory-write-service.js",
    "migrations/phase-8i-memory.sql", "supabase/memory-write.sql",
    "routes/memory.js", "routes/memory-write.js", "controllers/memory-write-controller.js",
    "frontend/memory-write-ui.js", "src/MemoryWritePanel.jsx",
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

await test("memory remains context, never authority, using in-memory mock candidates only", () => {
  const contract = getMemoryWriteScaffoldContract();
  equal(contract.persistentWriteAllowed, false, "no persistent write capability");
  equal(contract.persistentReadAllowed, false, "no persistent read capability");
  const result = evaluateMemoryWriteEligibility(clientCandidate(), confirmedContext, approvedOpts());
  equal(result.authorityUseProhibited, true, "write decision prohibits authority use");
  equal(result.legalConclusionProhibited, true, "write decision prohibits legal conclusions");
  equal(result.sourceAuthorityMutationAllowed, false, "write decision prohibits source-authority mutation");
  check(phase8b.memoryClasses.every((cls) => cls.mustNotAffectAuthority === true), "Phase 8B fixture: memory must not affect authority");
  check(phase8f.consentPhilosophyRules.some((rule) => rule.id === "CONSENT_AUTHORIZES_STORAGE_NOT_AUTHORITY"), "Phase 8F fixture: consent is storage-only");
  equal(isMemoryWriteFlagEnabled({ TINA_ENABLE_MEMORY_WRITES: true }).allowed, true, "write scaffold enables only via explicit flag object");
  equal(isMemoryWriteFlagEnabled().allowed, false, "write scaffold remains disabled by default");
});

console.log(`\nPATCH-08I-MEMORY-WRITE-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
