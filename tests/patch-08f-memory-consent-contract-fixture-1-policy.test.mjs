// PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1 - consent contract fixture and policy tests.
// Fixture-contract validation only. No runtime memory or consent modules exist and none are imported.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve("evaluation/fixtures/phase-8f-memory-consent-contract-fixture-1-policy.fixture.json");
const PHASE8B_PATH = resolve("evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json");
const PHASE8D_PATH = resolve("evaluation/fixtures/phase-8d-memory-scope-schema-fixture-1-invariants.fixture.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const phase8b = JSON.parse(readFileSync(PHASE8B_PATH, "utf8"));
const phase8d = JSON.parse(readFileSync(PHASE8D_PATH, "utf8"));

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
function includes(arr, value, message) {
  assertions += 1;
  assert(arr.includes(value), message ?? `expected ${value}`);
}
function notIncludes(arr, value, message) {
  assertions += 1;
  assert(!arr.includes(value), message ?? `did not expect ${value}`);
}

const byId = (arr) => new Map(arr.map((item) => [item.id, item]));
const philosophy = byId(fixture.consentPhilosophyRules);
const matrix = new Map(fixture.consentRequirementMatrix.map((item) => [item.memoryClass, item]));
const states = byId(fixture.consentStates);
const events = byId(fixture.consentEventTypes);
const prompts = byId(fixture.promptWordingLibrary);
const scopeRules = byId(fixture.consentScopeRules);
const sensitiveRules = byId(fixture.sensitiveDataRules);
const denialRules = byId(fixture.denialSessionOnlyRules);
const revocationRules = byId(fixture.revocationForgetRules);
const conflictRules = byId(fixture.conflictConsentRules);
const freshnessRules = byId(fixture.freshnessExpiryRules);
const sourceRules = byId(fixture.sourceAuthorityConsentRules);
const services = byId(fixture.futureServiceBoundaries);
const flags = byId(fixture.featureFlags);
const boundaries = byId(fixture.deferredBoundaries);
const cases = byId(fixture.fixtureTestCases);

await test("patch metadata disallows runtime consent, database, durable writes, services, pipeline, and frontend", () => {
  equal(fixture.patch.id, "PATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1", "patch id");
  equal(fixture.patch.runtimeImplementationAllowed, false, "runtime implementation");
  equal(fixture.patch.runtimeConsentHandlingAllowed, false, "runtime consent handling");
  equal(fixture.patch.databaseMigrationAllowed, false, "database migrations");
  equal(fixture.patch.databaseTablesAllowed, false, "database tables");
  equal(fixture.patch.durableWritesAllowed, false, "durable writes");
  equal(fixture.patch.readServiceAllowed, false, "read service");
  equal(fixture.patch.writeServiceAllowed, false, "write service");
  equal(fixture.patch.consentServiceAllowed, false, "consent service");
  equal(fixture.patch.pipelineIntegrationAllowed, false, "pipeline integration");
  equal(fixture.patch.frontendImplementationAllowed, false, "frontend implementation");
});

await test("base contracts match Phase 8B memory classes, permission levels, and Phase 8B/8D scope types", () => {
  deepEqual([...fixture.baseContracts.memoryClasses].sort(), phase8b.memoryClasses.map((c) => c.id).sort(), "memory classes match Phase 8B");
  deepEqual([...fixture.baseContracts.permissionLevels].sort(), phase8b.permissionLevels.map((p) => p.id).sort(), "permission levels match Phase 8B");
  deepEqual([...fixture.baseContracts.scopeTypes].sort(), phase8b.scopeTypes.map((s) => s.id).sort(), "scope types match Phase 8B");
  deepEqual([...fixture.baseContracts.scopeTypes].sort(), phase8d.baseContracts.scopeTypes.slice().sort(), "scope types match Phase 8D");
});

await test("consent philosophy includes storage-not-authority, refusal respected, and memory context not authority", () => {
  check(philosophy.has("CONSENT_AUTHORIZES_STORAGE_NOT_AUTHORITY"), "storage not authority");
  check(philosophy.has("REFUSAL_MUST_BE_RESPECTED"), "refusal respected");
  check(philosophy.has("MEMORY_CONTEXT_NOT_AUTHORITY"), "memory context not authority");
  for (const item of fixture.consentPhilosophyRules) {
    check(item.requiredBehavior && item.prohibitedBehavior && item.example, `${item.id} fields`);
  }
});

await test("consent matrix covers all memory classes and enforces class-specific outcomes", () => {
  const expected = ["user_profile", "user_preference", "matter", "client_entity", "temporary_session", "source_derived", "prohibited_sensitive"];
  deepEqual([...matrix.keys()].sort(), expected.sort(), "matrix covers all classes");
  check(matrix.get("matter").explicitConsentMandatory || matrix.get("matter").scopeConfirmationMandatory, "matter requires consent or scope confirmation");
  check(/matter scope required/i.test(matrix.get("matter").defaultScopeBehavior), "matter scope required");
  check(matrix.get("client_entity").explicitConsentMandatory || matrix.get("client_entity").scopeConfirmationMandatory, "client requires consent or scope confirmation");
  check(/client scope required/i.test(matrix.get("client_entity").defaultScopeBehavior), "client scope required");
  check(/sensitive client facts require explicit consent/i.test(matrix.get("client_entity").sensitiveVariantBehavior), "sensitive client explicit consent");
  equal(matrix.get("prohibited_sensitive").durableWriteAllowed, false, "prohibited sensitive no durable write");
  equal(matrix.get("temporary_session").sessionOnlyAllowedWithoutDurableConsent, true, "temporary session allowed session-only");
  equal(matrix.get("temporary_session").durableWriteAllowed, false, "temporary session no durable write");
  check(/provenance.*cannot assert currentness/i.test(matrix.get("source_derived").defaultScopeBehavior), "source derived provenance only and no currentness");
  check(/inferred durable profile requires confirmation/i.test(matrix.get("user_profile").defaultScopeBehavior), "inferred profile confirmation");
  check(/clear approval/i.test(matrix.get("user_preference").defaultScopeBehavior), "preference clear approval");
});

await test("consent states are exact and enforce denied, revoked, expired, invalid, granted, and not_required rules", () => {
  const expected = ["not_required", "required_pending", "requested", "granted", "denied", "revoked", "expired", "superseded", "invalid"];
  deepEqual([...states.keys()].sort(), expected.sort(), "exact consent states");
  check(/prohibits durable write/i.test(states.get("denied").allowedWriteBehavior), "denied prohibits durable write");
  check(/prohibits read immediately/i.test(states.get("revoked").allowedReadBehavior), "revoked prohibits read");
  check(/blocks durable use until refreshed/i.test(states.get("expired").allowedReadBehavior), "expired blocks durable use");
  check(/blocks write/i.test(states.get("invalid").allowedWriteBehavior), "invalid blocks write");
  check(/durable write allowed/i.test(states.get("granted").allowedWriteBehavior), "granted required for explicit durable memory");
  check(/cannot apply to sensitive client facts/i.test(states.get("not_required").allowedReadBehavior), "not_required cannot apply to sensitive client facts");
});

await test("consent event types are exact, append-only, and secret-safe", () => {
  const expected = ["candidate_detected", "consent_prompted", "consent_granted", "consent_denied", "consent_revoked", "consent_expired", "consent_superseded", "memory_written_after_consent", "memory_not_written_no_consent", "memory_deleted_after_revocation", "consent_scope_changed"];
  deepEqual([...events.keys()].sort(), expected.sort(), "exact event types");
  for (const event of fixture.consentEventTypes) {
    equal(event.appendOnly, true, `${event.id} appendOnly`);
    equal(event.mustNotContainSecretValues, true, `${event.id} no secrets`);
    check(event.requiredFields.length > 0 && event.auditRequirement, `${event.id} fields`);
  }
});

await test("memorySuggestion contract fields, suggestion types, actions, and non-authority rules are complete", () => {
  const c = fixture.memorySuggestionContract;
  const fields = ["suggestionId", "suggestionType", "memoryClass", "proposedPermissionLevel", "proposedScopeType", "proposedScopeId", "proposedScopeLabel", "contentSummary", "structuredCandidate", "sensitivityLabel", "confidenceState", "consentRequired", "consentReason", "userPrompt", "allowedActions", "prohibitedUses", "authorityUseProhibited", "legalConclusionProhibited", "sourceRefs", "expiresAt", "createdAt"];
  deepEqual(c.requiredFields.slice().sort(), fields.sort(), "memorySuggestion fields");
  deepEqual(c.allowedSuggestionTypes.slice().sort(), ["remember_user_preference", "remember_user_profile", "remember_client_fact", "remember_matter_fact", "remember_source_provenance", "update_existing_memory", "forget_existing_memory", "keep_session_only"].sort(), "suggestion types");
  deepEqual(c.allowedActions.slice().sort(), ["approve", "deny", "session_only", "choose_scope", "edit_summary", "forget", "ask_later"].sort(), "allowed actions");
  includes(c.rules, "suggestion_is_not_durable_memory");
  includes(c.rules, "suggestion_does_not_create_memory");
  includes(c.rules, "suggestion_does_not_create_authority");
  includes(c.rules, "no_raw_confidential_document_text");
  includes(c.rules, "no_credentials_or_secrets");
  equal(c.authorityUseProhibited, true, "authority use prohibited");
  equal(c.legalConclusionProhibited, true, "legal conclusion prohibited");
  includes(c.rules, "scope_must_be_visible");
  includes(c.rules, "default_persistence_not_assumed");
});

await test("memoryConsentRequest contract fields and default-response consent protections are complete", () => {
  const c = fixture.memoryConsentRequestContract;
  const fields = ["consentRequestId", "suggestionId", "userId", "requestedAction", "memoryClass", "permissionLevel", "scopeType", "scopeId", "scopeLabel", "consentText", "consentReason", "riskLevel", "sensitiveDataPresent", "allowedUserResponses", "defaultResponse", "expiresAt", "createdAt"];
  deepEqual(c.requiredFields.slice().sort(), fields.sort(), "request fields");
  deepEqual(c.defaultResponseAllowedValues.slice().sort(), ["deny", "session_only"].sort(), "default response allowed");
  includes(c.rules, "defaultResponse_must_never_be_approve");
  includes(c.rules, "sensitiveDataPresent_requires_explicit_approve");
  includes(c.rules, "client_matter_scope_visible_to_user");
  includes(c.rules, "no_bundled_unrelated_scopes");
  includes(c.rules, "no_multi_client_consent_without_future_design");
  notIncludes(c.defaultResponseAllowedValues, "approve", "default response never approve");
});

await test("memoryConsentResponse contract fields, user responses, and no-write outcomes are complete", () => {
  const c = fixture.memoryConsentResponseContract;
  const fields = ["consentRequestId", "userResponse", "approved", "selectedScopeType", "selectedScopeId", "editedContentSummary", "permissionLevel", "retentionPreference", "userNotes", "respondedAt"];
  deepEqual(c.requiredFields.slice().sort(), fields.sort(), "response fields");
  deepEqual(c.allowedUserResponses.slice().sort(), ["approve", "deny", "session_only", "approve_with_edits", "choose_different_scope", "forget", "ask_later"].sort(), "allowed user responses");
  includes(c.rules, "deny_creates_no_durable_memory");
  includes(c.rules, "session_only_creates_no_durable_memory");
  includes(c.rules, "ask_later_creates_no_durable_memory");
  includes(c.rules, "approve_with_edits_supersedes_original_candidate");
  includes(c.rules, "choose_different_scope_requires_scope_validation");
  includes(c.rules, "forget_triggers_revocation_or_deletion_flow_only_for_existing_memory");
  includes(c.rules, "approved_true_requires_userResponse_approve_or_approve_with_edits");
  deepEqual(c.approvedTrueRequires.slice().sort(), ["approve", "approve_with_edits"].sort(), "approved true requires approve responses");
});

await test("prompt library includes nine templates and blocks prohibited wording", () => {
  const expected = ["user_preference", "user_profile", "client_fact", "matter_fact", "sensitive_client_fact", "source_provenance", "correction_update", "forget_request", "session_only"];
  deepEqual([...prompts.keys()].sort(), expected.sort(), "prompt ids");
  for (const prompt of fixture.promptWordingLibrary) {
    for (const phrase of ["I will remember this automatically", "This becomes legal authority", "This confirms the law", "This proves the source is current", "Approved by default"]) {
      includes(prompt.prohibitedWording, phrase, `${prompt.id} prohibits ${phrase}`);
    }
  }
});

await test("scope rules default ambiguous scope to session-only and prohibit silent/cross-client durable scope inference", () => {
  check(scopeRules.has("AMBIGUOUS_SCOPE_DEFAULTS_SESSION_ONLY"), "ambiguous scope session-only");
  check(scopeRules.has("SCOPE_CANNOT_BE_INFERRED_SILENTLY_FOR_DURABLE_MEMORY"), "no silent durable scope inference");
  check(scopeRules.has("CROSS_CLIENT_SCOPE_PROHIBITED_WITHOUT_FUTURE_MULTI_CLIENT_DESIGN"), "cross-client prohibited");
  check(scopeRules.has("CLIENT_SCOPE_MUST_BE_VISIBLE"), "client visible");
  check(scopeRules.has("MATTER_SCOPE_MUST_BE_VISIBLE"), "matter visible");
  check(scopeRules.has("SOURCE_DOCUMENT_PROVENANCE_SCOPE_NOT_AUTHORITY"), "source provenance not authority");
});

await test("sensitive data rules include all categories and enforce secret/confidential/smallest-scope outcomes", () => {
  const expected = ["client_tax_registration_details", "bir_audit_facts", "financial_exposure_amounts", "legal_dispute_facts", "personal_identifiers", "health_or_personal_sensitive_data", "confidential_documents", "credentials_or_secrets"];
  deepEqual([...sensitiveRules.keys()].sort(), expected.sort(), "sensitive categories");
  equal(sensitiveRules.get("credentials_or_secrets").durableStorageAllowed, false, "credentials no durable storage");
  equal(sensitiveRules.get("confidential_documents").rawStorageProhibited, true, "confidential raw storage prohibited");
  equal(sensitiveRules.get("client_tax_registration_details").preferredScope, "matter", "sensitive client facts prefer matter scope");
  equal(sensitiveRules.get("health_or_personal_sensitive_data").durableStorageAllowed, false, "health/personal sensitive no-store absent necessity");
});

await test("denial/session-only and revocation/forget rules prevent durable writes and make revoked memory unreadable", () => {
  check(denialRules.has("DENIAL_NO_DURABLE_WRITE"), "denial no durable write");
  check(denialRules.has("SESSION_ONLY_EXPIRES_AFTER_SESSION"), "session-only expires");
  check(denialRules.has("SESSION_ONLY_NOT_PERSISTED"), "session-only not persisted");
  check(revocationRules.has("REVOKED_MEMORY_UNREADABLE_IMMEDIATELY"), "revoked unreadable");
  check(revocationRules.has("FORGET_REQUEST_MUST_BE_HONORED"), "forget honored");
});

await test("conflict and freshness rules require live facts, consent for updates, no clarification reduction, and expiry confirmation", () => {
  check(conflictRules.has("LIVE_FACTS_WIN_CURRENT_ANSWER"), "live facts win");
  check(conflictRules.has("NO_AUTO_CLARIFICATION_REDUCTION_FROM_CONTRADICTED_MEMORY"), "no auto clarification reduction");
  check(conflictRules.has("CONSENT_REQUIRED_FOR_UPDATE"), "consent required for update");
  check(freshnessRules.has("CONSENT_CAN_EXPIRE"), "consent can expire");
  check(freshnessRules.has("TAX_PERIOD_FACTS_REQUIRE_PERIOD_CONFIRMATION"), "tax-period confirmation");
  check(freshnessRules.has("STALE_MEMORY_REQUIRES_CONFIRMATION_HIGH_RISK"), "stale memory confirmation");
});

await test("source-authority consent rules block authority, currentness, tax conclusions, sourceAvailability bypass, and citation authority", () => {
  check(sourceRules.has("CONSENT_DOES_NOT_AUTHORIZE_LEGAL_AUTHORITY_USE"), "no legal authority use");
  check(sourceRules.has("CONSENT_DOES_NOT_MAKE_SOURCE_CURRENT"), "no source currentness");
  check(sourceRules.has("CONSENT_DOES_NOT_VALIDATE_TAX_CONCLUSION"), "no tax conclusion validation");
  check(sourceRules.has("CONSENT_DOES_NOT_BYPASS_SOURCE_AVAILABILITY"), "no sourceAvailability bypass");
  check(sourceRules.has("CONSENT_DOES_NOT_CREATE_CITATION_AUTHORITY"), "no citation authority");
  check(sourceRules.has("TAX_LEGAL_ANSWERS_STILL_REQUIRE_RETRIEVAL_SOURCE_CARDS"), "tax/legal answers require retrieval/source cards");
  check(sourceRules.has("SOURCE_DERIVED_MEMORY_PROVENANCE_ONLY"), "source-derived provenance only");
});

await test("future service boundaries are listed but implementation is disallowed", () => {
  const expected = ["memory-consent-contract.js", "memory-consent-policy.js", "memory-suggestion-builder.js", "memory-consent-request-builder.js", "memory-consent-response-validator.js", "memory-consent-audit-policy.js", "memory-revocation-policy.js", "memory-sensitive-data-policy.js"];
  deepEqual([...services.keys()].sort(), expected.sort(), "future service boundaries");
  for (const service of fixture.futureServiceBoundaries) {
    equal(service.implementationHereAllowed, false, `${service.id} implementationHereAllowed`);
    check(service.prohibitedResponsibilities.length > 0, `${service.id} prohibited responsibilities`);
  }
});

await test("all memory flags default OFF, production OFF, and require a production gate", () => {
  const expected = ["TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY", "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"];
  deepEqual([...flags.keys()].sort(), expected.sort(), "memory flags");
  for (const flag of fixture.featureFlags) {
    equal(flag.defaultEnabled, false, `${flag.id} default off`);
    equal(flag.productionEnabled, false, `${flag.id} prod off`);
    equal(flag.requiresGateBeforeProduction, true, `${flag.id} gate required`);
    equal(flag.allowedBeforePhase8I, false, `${flag.id} not allowed before Phase 8I`);
  }
});

await test("deferred Phase 7B, Phase 10, Phase 11, Phase 12, and Phase 14 boundaries are excluded", () => {
  const expected = ["phase7b_boundary_tuning_followup", "phase10_source_governance", "phase10_court_metadata", "phase10_hallucination_traps", "phase11_observability_performance", "phase12_document_advisory", "phase14_mobile_after_phase13"];
  deepEqual([...boundaries.keys()].sort(), expected.sort(), "deferred boundaries");
  for (const boundary of fixture.deferredBoundaries) {
    equal(boundary.implementationAllowedHere, false, `${boundary.id} implementation false`);
    equal(boundary.mayBeReferencedAsBoundary, true, `${boundary.id} boundary reference true`);
  }
  check(/Phase 7B pre-production-ON follow-up/i.test(boundaries.get("phase7b_boundary_tuning_followup").description), "Phase 7B tuning excluded from 8F");
});

await test("all required fixture test case ids are present", () => {
  const required = ["CONSENT_PHILOSOPHY_REQUIRED", "CONSENT_MATRIX_ALL_CLASSES", "CONSENT_STATES_EXACT", "CONSENT_EVENT_TYPES_EXACT", "MEMORY_SUGGESTION_CONTRACT", "CONSENT_REQUEST_CONTRACT", "CONSENT_RESPONSE_CONTRACT", "DEFAULT_RESPONSE_NOT_APPROVE", "SENSITIVE_DATA_EXPLICIT_APPROVE", "DENY_SESSION_ASK_LATER_NO_DURABLE_WRITE", "REVOKED_MEMORY_UNREADABLE", "FORGET_REQUEST_HONORED", "AMBIGUOUS_SCOPE_SESSION_ONLY", "CLIENT_MATTER_SCOPE_VISIBLE", "NO_BUNDLED_MULTI_CLIENT_CONSENT", "SOURCE_DERIVED_PROVENANCE_ONLY", "CONSENT_NOT_AUTHORITY", "CONSENT_NOT_SOURCE_CURRENTNESS", "CONSENT_NOT_CITATION_AUTHORITY", "CONFLICT_UPDATE_REQUIRES_CONSENT", "LIVE_FACTS_WIN", "STALE_MEMORY_REQUIRES_CONFIRMATION", "PROMPT_LIBRARY_REQUIRED", "PROHIBITED_PROMPT_WORDING_BLOCKED", "CREDENTIALS_SECRETS_NEVER_STORED", "CONFIDENTIAL_DOCUMENT_RAW_STORAGE_PROHIBITED", "FEATURE_FLAGS_DEFAULT_OFF", "DEFERRED_BOUNDARIES_EXCLUDED", "NO_RUNTIME_CONSENT_IMPLEMENTATION", "NO_DATABASE_IMPLEMENTATION", "NO_PIPELINE_INTEGRATION", "NO_FRONTEND_IMPLEMENTATION"];
  for (const id of required) check(cases.has(id), `fixture test case ${id}`);
  equal(fixture.fixtureTestCases.length, required.length, "fixture test case count");
});

await test("fixture lists no implementation outputs for runtime, database, pipeline, or frontend files", () => {
  deepEqual(fixture.patch.implementationOutputs, [], "no implementation outputs");
  const outputs = fixture.patch.implementationOutputs.join(" ");
  for (const name of ["memory-read-service.js", "memory-write-service.js", "consent-service.js", "migration", ".sql", "pipeline.js", "ask-handler.js", "frontend", "src/App"]) {
    check(!outputs.includes(name), `no implementation output ${name}`);
  }
});

console.log(`\nPATCH-08F-MEMORY-CONSENT-CONTRACT-FIXTURE-1 policy tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
