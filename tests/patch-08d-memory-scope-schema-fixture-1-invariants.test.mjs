// PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1 - scope/schema fixture and invariant tests.
// Fixture-contract validation only. No runtime memory modules exist and none are imported.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve("evaluation/fixtures/phase-8d-memory-scope-schema-fixture-1-invariants.fixture.json");
const PHASE8B_PATH = resolve("evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const phase8b = JSON.parse(readFileSync(PHASE8B_PATH, "utf8"));

let passed = 0;
let failed = 0;

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

const byId = (arr) => new Map(arr.map((item) => [item.id, item]));
const scopes = byId(fixture.scopeHierarchy.scopes);
const entities = byId(fixture.conceptualEntities);
const invariants = byId(fixture.schemaInvariants);
const readRules = byId(fixture.readEligibilityRules);
const writeRules = byId(fixture.writeEligibilityRules);
const authorityRules = byId(fixture.authoritySeparationRules);
const flags = byId(fixture.featureFlags);
const boundaries = byId(fixture.deferredBoundaries);
const testCases = byId(fixture.fixtureTestCases);
const hierarchyRules = fixture.scopeHierarchy.hierarchyRules.join(" | ");

await test("patch id, phase, and task type are correct", () => {
  assert.equal(fixture.patch.id, "PATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1");
  assert.equal(fixture.patch.phase, "Phase 8D");
  assert.equal(fixture.patch.taskType, "scope_schema_fixture_invariant_tests_only");
});

await test("runtime, database, services, durable writes, and pipeline integration are all disallowed", () => {
  assert.equal(fixture.patch.runtimeImplementationAllowed, false);
  assert.equal(fixture.patch.databaseMigrationAllowed, false);
  assert.equal(fixture.patch.databaseTablesAllowed, false);
  assert.equal(fixture.patch.durableWritesAllowed, false);
  assert.equal(fixture.patch.readServiceAllowed, false);
  assert.equal(fixture.patch.writeServiceAllowed, false);
  assert.equal(fixture.patch.pipelineIntegrationAllowed, false);
});

await test("scope set is exact and matches Phase 8B scope types", () => {
  const expected = ["global_user", "firm_workspace_future", "client", "matter", "session", "source_document"];
  assert.deepEqual([...scopes.keys()].sort(), [...expected].sort());
  assert.deepEqual([...fixture.baseContracts.scopeTypes].sort(), [...expected].sort());
  const phase8bScopes = phase8b.scopeTypes.map((s) => s.id).sort();
  assert.deepEqual([...scopes.keys()].sort(), phase8bScopes);
});

await test("conceptual entity set is exactly the ten Phase 8C entities", () => {
  const expected = [
    "memory_items", "memory_scopes", "client_profiles", "matter_profiles",
    "memory_consent_events", "memory_audit_events", "memory_conflict_events",
    "memory_source_refs", "memory_retention_policies", "memory_access_policies"
  ];
  assert.deepEqual([...entities.keys()].sort(), [...expected].sort());
  assert.equal(fixture.conceptualEntities.length, 10);
});

await test("firm_workspace_future is future-only with no Phase 8 classes or primary use", () => {
  const scope = scopes.get("firm_workspace_future");
  assert.equal(scope.isFutureOnly, true);
  assert.equal(scope.isPrimaryScopeAllowed, false);
  assert.deepEqual(scope.allowedMemoryClasses, []);
});

await test("source_document is reference/provenance only and never expands read eligibility", () => {
  const scope = scopes.get("source_document");
  assert.equal(scope.isPrimaryScopeAllowed, false);
  assert.equal(scope.isReferenceScopeAllowed, true);
  assert.match(scope.readEligibilityRule, /never expands read eligibility/i);
  assert.match(hierarchyRules, /source_document must not expand read eligibility/i);
  assert(testCases.has("SOURCE_DOCUMENT_REFERENCE_ONLY"));
  assert(testCases.has("REFERENCE_SCOPE_NO_READ_EXPANSION"));
});

await test("every memory item requires exactly one primary scope and references never expand reads", () => {
  assert.match(hierarchyRules, /every memory item must have exactly one primary scope/i);
  assert.match(hierarchyRules, /reference scopes do not expand read eligibility/i);
  assert(testCases.has("ONE_PRIMARY_SCOPE_REQUIRED"));
});

await test("hierarchy rules: global_user root, firm future, client parents, matter-client, session confirmation", () => {
  assert.match(hierarchyRules, /global_user has no parent/i);
  assert.match(hierarchyRules, /firm_workspace_future parent is global_user and is future-only/i);
  assert.match(hierarchyRules, /client parent may be global_user or firm_workspace_future/i);
  assert.match(hierarchyRules, /matter parent must be client unless internal\/system exception/i);
  assert.match(hierarchyRules, /session may attach to matter or client only after user confirmation/i);
  assert.deepEqual(scopes.get("global_user").parentAllowed, []);
  assert(scopes.get("matter").parentAllowed.includes("client"));
  assert(scopes.get("session").parentAllowed.includes("matter"));
  assert(scopes.get("session").parentAllowed.includes("client"));
});

await test("every conceptual entity has requiredFields, optionalFields, prohibitedFields, invariants, and forbids implementation", () => {
  for (const entity of fixture.conceptualEntities) {
    assert(Array.isArray(entity.requiredFields) && entity.requiredFields.length > 0, `${entity.id} requiredFields`);
    assert(Array.isArray(entity.optionalFields), `${entity.id} optionalFields`);
    assert(Array.isArray(entity.prohibitedFields), `${entity.id} prohibitedFields`);
    assert(Array.isArray(entity.invariants) && entity.invariants.length > 0, `${entity.id} invariants`);
    assert.equal(entity.implementationHereAllowed, false, `${entity.id} implementationHereAllowed must be false`);
  }
});

await test("memory_items required fields include identity, class, level, primary scope, and authority prohibitions", () => {
  const required = entities.get("memory_items").requiredFields;
  for (const field of ["memory_id", "memory_class", "permission_level", "primary_scope_type", "primary_scope_id", "authority_use_prohibited", "legal_conclusion_prohibited"]) {
    assert(required.includes(field), `memory_items required must include ${field}`);
  }
});

await test("memory_items prohibited fields include legal-state and secret fields", () => {
  const prohibited = entities.get("memory_items").prohibitedFields;
  for (const field of ["legal_authority_status", "source_currentness_status", "case_status", "supersession_status", "password", "api_key", "secret"]) {
    assert(prohibited.includes(field), `memory_items prohibited must include ${field}`);
  }
});

await test("memory_source_refs require citation_prohibited_as_authority and forbid legal-state fields", () => {
  const entity = entities.get("memory_source_refs");
  assert(entity.requiredFields.includes("citation_prohibited_as_authority"));
  assert(entity.prohibitedFields.includes("source_currentness_status"));
  assert(entity.prohibitedFields.includes("case_status"));
});

await test("entity field contracts match the Phase 8C required field lists", () => {
  const requiredByEntity = {
    memory_scopes: ["scope_id", "scope_type", "display_name", "owner_user_id", "lifecycle_status", "created_at", "updated_at"],
    client_profiles: ["client_id", "display_name", "normalized_name", "entity_type", "jurisdiction", "created_at", "updated_at"],
    matter_profiles: ["matter_id", "client_id", "matter_name", "matter_type", "matter_status", "confidentiality_level", "created_at", "updated_at"],
    memory_consent_events: ["consent_event_id", "memory_id", "user_id", "consent_type", "consent_scope", "granted", "granted_at", "source_interaction_id"],
    memory_audit_events: ["audit_event_id", "memory_id", "event_type", "actor_type", "actor_id", "reason", "created_at"],
    memory_conflict_events: ["conflict_event_id", "memory_id", "conflicting_input_summary", "conflict_type", "resolution_status", "created_at"],
    memory_retention_policies: ["policy_id", "permission_level", "memory_class", "default_retention", "max_retention", "requires_review", "deletion_behavior", "created_at"],
    memory_access_policies: ["policy_id", "scope_type", "memory_class", "permission_level", "can_read_for_answer_context", "can_write_automatically", "requires_explicit_consent", "requires_scope_confirmation", "prohibited_in_general_queries", "created_at"]
  };
  for (const [entityId, fields] of Object.entries(requiredByEntity)) {
    const entity = entities.get(entityId);
    for (const field of fields) {
      assert(entity.requiredFields.includes(field), `${entityId} required must include ${field}`);
    }
  }
});

await test("all seventeen schema invariants are present", () => {
  const expected = [
    "EXACTLY_ONE_MEMORY_CLASS", "EXACTLY_ONE_PERMISSION_LEVEL",
    "EXACTLY_ONE_PRIMARY_SCOPE_TYPE", "EXACTLY_ONE_PRIMARY_SCOPE_ID",
    "DURABLE_NON_SYSTEM_REQUIRES_CONSENT", "PROHIBITED_MEMORY_REJECTED",
    "NO_STORE_NOT_PERSISTED", "SESSION_ONLY_NOT_DURABLE",
    "EXPLICIT_CONSENT_REQUIRES_CONSENT_EVENT", "REVOKED_NOT_READABLE",
    "CONTRADICTED_NOT_USED_FOR_CLARIFICATION_REDUCTION", "MEMORY_NOT_LEGAL_AUTHORITY",
    "SOURCE_DERIVED_NOT_CURRENTNESS", "CLIENT_SCOPE_ISOLATION",
    "MATTER_SCOPE_ISOLATION", "GLOBAL_USER_NO_CLIENT_CONFIDENTIAL_FACTS",
    "MEMORY_FLAGS_DEFAULT_OFF"
  ];
  assert.deepEqual([...invariants.keys()].sort(), [...expected].sort());
  assert.equal(fixture.schemaInvariants.length, 17);
  for (const invariant of fixture.schemaInvariants) {
    assert(invariant.description && invariant.appliesTo && invariant.requiredOutcome && invariant.violationOutcome && invariant.examplePass && invariant.exampleFail, `${invariant.id} must define all invariant fields`);
  }
});

await test("all eleven read eligibility rules are present with required shapes", () => {
  const expected = [
    "READ_SCOPE_MATCH_REQUIRED", "READ_EXPLICIT_USER_REFERENCE_ALLOWED_WITH_SCOPE_CONFIRMATION",
    "READ_UNRELATED_CLIENT_PROHIBITED", "READ_UNRELATED_MATTER_PROHIBITED",
    "READ_REVOKED_PROHIBITED", "READ_PROHIBITED_CLASS_PROHIBITED",
    "READ_NO_STORE_PROHIBITED", "READ_STALE_REQUIRES_CONFIRMATION",
    "READ_CONTRADICTED_TRIGGERS_CLARIFICATION", "READ_SOURCE_DERIVED_PROVENANCE_ONLY",
    "READ_AUTHORITY_GOVERNED_QUESTION_REQUIRES_SOURCES"
  ];
  assert.deepEqual([...readRules.keys()].sort(), [...expected].sort());
  for (const rule of fixture.readEligibilityRules) {
    assert(rule.description && rule.requiredInputs && rule.allowedOutcome && rule.prohibitedOutcome && rule.testExample, `${rule.id} must define all rule fields`);
  }
});

await test("all nine write eligibility rules are present with required shapes", () => {
  const expected = [
    "WRITE_NO_AUTOMATIC_DURABLE_WRITES_EARLY_PHASE8", "WRITE_PERMISSION_LEVEL_REQUIRED",
    "WRITE_SCOPE_CONFIRMATION_REQUIRED_FOR_CLIENT_MATTER",
    "WRITE_EXPLICIT_CONSENT_REQUIRED_FOR_SENSITIVE_CLIENT_FACTS",
    "WRITE_SESSION_ONLY_NOT_PERSISTED", "WRITE_PROHIBITED_REJECTED",
    "WRITE_SOURCE_DERIVED_REQUIRES_PROVENANCE",
    "WRITE_TAX_LEGAL_CONCLUSIONS_REJECTED_AS_AUTHORITY",
    "WRITE_SYSTEM_GOVERNANCE_ALLOWED_FOR_TINA_CONTINUITY_ONLY"
  ];
  assert.deepEqual([...writeRules.keys()].sort(), [...expected].sort());
  for (const rule of fixture.writeEligibilityRules) {
    assert(rule.description && rule.requiredInputs && rule.allowedOutcome && rule.prohibitedOutcome && rule.testExample, `${rule.id} must define all rule fields`);
  }
});

await test("conflict lifecycle includes live-fact override and clarification-reduction prevention", () => {
  const states = fixture.conflictLifecycle.states;
  for (const state of ["detected", "marked_contradicted", "user_prompted", "resolved_updated", "resolved_revoked", "resolved_archived", "retained_with_warning"]) {
    assert(states.includes(state), `conflict lifecycle must include ${state}`);
  }
  const rules = fixture.conflictLifecycle.rules.join(" | ");
  assert.match(rules, /live facts override stored memory/i);
  assert.match(rules, /conflict prevents automatic clarification reduction/i);
  assert.match(rules, /audit event required/i);
  assert.match(rules, /contradicted memory cannot be silently read/i);
});

await test("consent lifecycle blocks unconsented durable writes and makes revoked memory unreadable", () => {
  const states = fixture.consentLifecycle.states;
  for (const state of ["candidate_detected", "scope_proposed", "consent_requested", "consent_granted", "consent_rejected", "memory_written", "consent_revoked", "memory_not_readable_after_revocation"]) {
    assert(states.includes(state), `consent lifecycle must include ${state}`);
  }
  const rules = fixture.consentLifecycle.rules.join(" | ");
  assert.match(rules, /no durable write before consent when consent required/i);
  assert.match(rules, /consent event required/i);
  assert.match(rules, /revocation creates audit event/i);
  assert.match(rules, /revoked memory not readable/i);
});

await test("authority separation prohibits SAE/retrieval/source-card/authority-gate mutation", () => {
  for (const id of ["MEMORY_CONTEXT_NOT_AUTHORITY", "MEMORY_NO_SAE_MUTATION", "MEMORY_NO_RETRIEVAL_MUTATION", "MEMORY_NO_SOURCE_CARD_MUTATION", "MEMORY_NO_AUTHORITY_GATE_OVERRIDE"]) {
    assert(authorityRules.has(id), `authoritySeparationRules must include ${id}`);
  }
});

await test("authority separation prohibits fake citations, legal currentness, case status, and Phase 10 bypass", () => {
  for (const id of ["MEMORY_NO_FAKE_CITATIONS", "MEMORY_NO_LEGAL_CURRENTNESS", "MEMORY_NO_CASE_STATUS", "MEMORY_NO_PHASE10_BYPASS"]) {
    assert(authorityRules.has(id), `authoritySeparationRules must include ${id}`);
  }
  for (const rule of fixture.authoritySeparationRules) {
    assert(rule.requiredBehavior && rule.prohibitedBehavior && rule.example, `${rule.id} must define behavior fields`);
  }
});

await test("allowed memory phrasing is user/matter-context-indicates only", () => {
  const rule = authorityRules.get("MEMORY_ALLOWED_PHRASE_USER_CONTEXT_INDICATES_ONLY");
  assert(rule, "phrasing rule must exist");
  assert.match(rule.requiredBehavior, /user\/matter context indicates/i);
  assert.match(rule.prohibitedBehavior, /the law is/i);
});

await test("all memory flags default OFF, production OFF, and gate-required", () => {
  const expected = [
    "TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY",
    "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"
  ];
  assert.deepEqual([...flags.keys()].sort(), [...expected].sort());
  for (const flag of fixture.featureFlags) {
    assert.equal(flag.defaultEnabled, false, `${flag.id} defaultEnabled`);
    assert.equal(flag.productionEnabled, false, `${flag.id} productionEnabled`);
    assert.equal(flag.requiresGateBeforeProduction, true, `${flag.id} requiresGateBeforeProduction`);
    assert.equal(flag.allowedBeforePhase8I, false, `${flag.id} allowedBeforePhase8I`);
  }
});

await test("deferred Phase 7B/10/11/12/14 boundaries are excluded from Phase 8D implementation", () => {
  const expected = [
    "phase7b_boundary_tuning_followup", "phase10_source_governance", "phase10_court_metadata",
    "phase10_hallucination_traps", "phase11_observability_performance",
    "phase12_document_advisory", "phase14_mobile_after_phase13"
  ];
  assert.deepEqual([...boundaries.keys()].sort(), [...expected].sort());
  for (const boundary of fixture.deferredBoundaries) {
    assert.equal(boundary.implementationAllowedHere, false, `${boundary.id} implementationAllowedHere`);
    assert.equal(boundary.mayBeReferencedAsBoundary, true, `${boundary.id} mayBeReferencedAsBoundary`);
  }
  assert.match(boundaries.get("phase7b_boundary_tuning_followup").description, /Phase 7B pre-production-ON follow-up/i);
});

await test("all required fixture test case ids are present", () => {
  const required = [
    "SCOPE_SET_EXACT", "ENTITY_SET_EXACT", "MEMORY_ITEMS_FIELD_CONTRACT",
    "MEMORY_SCOPES_FIELD_CONTRACT", "CLIENT_PROFILE_FIELD_CONTRACT",
    "MATTER_PROFILE_FIELD_CONTRACT", "CONSENT_EVENT_FIELD_CONTRACT",
    "AUDIT_EVENT_FIELD_CONTRACT", "CONFLICT_EVENT_FIELD_CONTRACT",
    "SOURCE_REF_FIELD_CONTRACT", "RETENTION_POLICY_FIELD_CONTRACT",
    "ACCESS_POLICY_FIELD_CONTRACT", "INVARIANT_SET_REQUIRED",
    "READ_RULE_SET_REQUIRED", "WRITE_RULE_SET_REQUIRED",
    "CONFLICT_LIFECYCLE_REQUIRED", "CONSENT_LIFECYCLE_REQUIRED",
    "AUTHORITY_SEPARATION_REQUIRED", "FLAGS_DEFAULT_OFF",
    "DEFERRED_BOUNDARIES_EXCLUDED", "NO_RUNTIME_IMPLEMENTATION",
    "NO_DATABASE_IMPLEMENTATION", "NO_PIPELINE_INTEGRATION",
    "NO_PHASE10_IMPLEMENTATION", "CROSS_CLIENT_LEAKAGE_PROHIBITED",
    "MATTER_LEAKAGE_PROHIBITED", "SOURCE_DOCUMENT_REFERENCE_ONLY",
    "REFERENCE_SCOPE_NO_READ_EXPANSION", "ONE_PRIMARY_SCOPE_REQUIRED",
    "MEMORY_CONTEXT_NOT_AUTHORITY"
  ];
  for (const id of required) {
    assert(testCases.has(id), `fixtureTestCases must include ${id}`);
  }
  assert.equal(fixture.fixtureTestCases.length, required.length);
});

await test("Phase 8D base contracts reference Phase 8B taxonomy ids consistently", () => {
  assert.deepEqual([...fixture.baseContracts.memoryClasses].sort(), phase8b.memoryClasses.map((c) => c.id).sort());
  assert.deepEqual([...fixture.baseContracts.permissionLevels].sort(), phase8b.permissionLevels.map((p) => p.id).sort());
  assert.deepEqual([...fixture.baseContracts.confidenceStates].sort(), phase8b.confidenceStates.map((c) => c.id).sort());
  assert.equal(fixture.baseContracts.phase8BFixture, "evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json");
  for (const scope of fixture.scopeHierarchy.scopes) {
    for (const clsId of scope.allowedMemoryClasses) {
      assert(fixture.baseContracts.memoryClasses.includes(clsId), `scope ${scope.id} references unknown class ${clsId}`);
    }
  }
});

await test("no runtime, database, or pipeline files are listed as implementation outputs", () => {
  assert.deepEqual(fixture.patch.implementationOutputs, []);
  const raw = readFileSync(FIXTURE_PATH, "utf8");
  const runtimeNames = [
    "memory-read-service.js", "memory-write-service.js", "memory-scope-resolver.js",
    "memory-governance-policy.js", "matter-memory-registry.js", "client-memory-registry.js",
    "pipeline.js", "ask-handler.js", "retrieval-engine.js", "source-card-engine.js",
    "migration", ".sql"
  ];
  for (const name of runtimeNames) {
    assert(!raw.includes(name), `fixture must not reference implementation artifact ${name}`);
  }
});

await test("source_document cannot assert currentness and client facts cannot become general law", () => {
  assert(scopes.get("source_document").leakageProhibitedTo.includes("legal_currentness_claims"));
  assert(scopes.get("client").leakageProhibitedTo.includes("general_tax_law"));
  assert(invariants.has("SOURCE_DERIVED_NOT_CURRENTNESS"));
});

await test("matter facts cannot leak across clients and global_user cannot hold client confidential facts", () => {
  assert(scopes.get("matter").leakageProhibitedTo.includes("unrelated_clients"));
  assert(scopes.get("global_user").leakageProhibitedTo.includes("client_confidential_facts"));
  assert(scopes.get("global_user").prohibitedMemoryClasses.includes("client_entity"));
  assert(invariants.has("MATTER_SCOPE_ISOLATION"));
  assert(invariants.has("GLOBAL_USER_NO_CLIENT_CONFIDENTIAL_FACTS"));
});

await test("no_store not persisted, session_only not durable, revoked not readable", () => {
  assert(invariants.has("NO_STORE_NOT_PERSISTED"));
  assert(invariants.has("SESSION_ONLY_NOT_DURABLE"));
  assert(invariants.has("REVOKED_NOT_READABLE"));
  assert(readRules.has("READ_NO_STORE_PROHIBITED"));
  assert(readRules.has("READ_REVOKED_PROHIBITED"));
  assert(writeRules.has("WRITE_SESSION_ONLY_NOT_PERSISTED"));
});

console.log(`\nPATCH-08D-MEMORY-SCOPE-SCHEMA-FIXTURE-1 invariant tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
