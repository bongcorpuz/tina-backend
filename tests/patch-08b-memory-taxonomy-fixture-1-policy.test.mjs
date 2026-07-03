// PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1 - memory taxonomy fixture and policy tests.
// Fixture-contract validation only. No runtime memory modules exist and none are imported.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve("evaluation/fixtures/phase-8b-memory-taxonomy-fixture-1-policy.fixture.json");
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));

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
const classes = byId(fixture.memoryClasses);
const permissions = byId(fixture.permissionLevels);
const confidence = byId(fixture.confidenceStates);
const scopes = byId(fixture.scopeTypes);
const prohibited = byId(fixture.prohibitedMemoryRules);
const authorityRules = byId(fixture.authoritySafetyRules);
const consentRules = byId(fixture.consentRules);
const flags = byId(fixture.featureFlags);
const boundaries = byId(fixture.deferredBoundaries);
const testCases = byId(fixture.testCases);

await test("patch id, phase, and task type are correct", () => {
  assert.equal(fixture.patch.id, "PATCH-08B-MEMORY-TAXONOMY-FIXTURE-1");
  assert.equal(fixture.patch.phase, "Phase 8B");
  assert.equal(fixture.patch.taskType, "fixture_policy_tests_only");
});

await test("runtime implementation, durable writes, and pipeline integration are disallowed", () => {
  assert.equal(fixture.patch.runtimeImplementationAllowed, false);
  assert.equal(fixture.patch.durableWritesAllowed, false);
  assert.equal(fixture.patch.pipelineIntegrationAllowed, false);
});

await test("memory class set is exactly the seven approved classes", () => {
  const expected = [
    "user_profile", "user_preference", "matter", "client_entity",
    "temporary_session", "source_derived", "prohibited_sensitive"
  ];
  assert.deepEqual([...classes.keys()].sort(), [...expected].sort());
  assert.equal(fixture.memoryClasses.length, 7);
});

await test("permission level set is exactly the eight approved levels", () => {
  const expected = [
    "no_store", "session_only", "matter_scoped", "client_scoped",
    "user_profile", "system_governance", "explicit_consent", "prohibited"
  ];
  assert.deepEqual([...permissions.keys()].sort(), [...expected].sort());
  assert.equal(fixture.permissionLevels.length, 8);
});

await test("each memory class has exactly one defaultPermissionLevel that exists in permissionLevels", () => {
  for (const cls of fixture.memoryClasses) {
    assert.equal(typeof cls.defaultPermissionLevel, "string", `${cls.id} defaultPermissionLevel must be a single string`);
    assert(permissions.has(cls.defaultPermissionLevel), `${cls.id} default '${cls.defaultPermissionLevel}' must exist in permissionLevels`);
  }
});

await test("default permission mapping matches the approved taxonomy", () => {
  assert.equal(classes.get("user_profile").defaultPermissionLevel, "user_profile");
  assert.equal(classes.get("user_preference").defaultPermissionLevel, "user_profile");
  assert.equal(classes.get("matter").defaultPermissionLevel, "matter_scoped");
  assert.equal(classes.get("client_entity").defaultPermissionLevel, "client_scoped");
  assert.equal(classes.get("temporary_session").defaultPermissionLevel, "session_only");
  assert.equal(classes.get("source_derived").defaultPermissionLevel, "no_store");
  assert.equal(classes.get("prohibited_sensitive").defaultPermissionLevel, "prohibited");
});

await test("every memory class sets mustNotAffectAuthority true", () => {
  for (const cls of fixture.memoryClasses) {
    assert.equal(cls.mustNotAffectAuthority, true, `${cls.id} must set mustNotAffectAuthority true`);
  }
});

await test("prohibited/sensitive memory class defaults to prohibited with no allowed scopes or uses", () => {
  const cls = classes.get("prohibited_sensitive");
  assert.equal(cls.defaultPermissionLevel, "prohibited");
  assert.deepEqual(cls.allowedScopes, []);
  assert.deepEqual(cls.allowedUses, []);
});

await test("every permission level defines consent behavior and retention", () => {
  for (const level of fixture.permissionLevels) {
    assert.equal(typeof level.requiresExplicitConsent, "boolean", `${level.id} must define requiresExplicitConsent`);
    assert(level.retentionConcept && level.allowedUse && level.prohibitedUse, `${level.id} must define retention/allowed/prohibited`);
  }
  assert.equal(permissions.get("explicit_consent").requiresExplicitConsent, true);
});

await test("every feature flag defaults OFF, production OFF, gate required, not allowed before Phase 8I", () => {
  const expectedFlags = [
    "TINA_ENABLE_MEMORY_READS", "TINA_ENABLE_MEMORY_WRITES", "TINA_ENABLE_MATTER_MEMORY",
    "TINA_ENABLE_MEMORY_SUGGESTIONS", "TINA_ENABLE_MEMORY_DEBUG_TRACE"
  ];
  assert.deepEqual([...flags.keys()].sort(), [...expectedFlags].sort());
  for (const flag of fixture.featureFlags) {
    assert.equal(flag.defaultEnabled, false, `${flag.id} must default OFF`);
    assert.equal(flag.productionEnabled, false, `${flag.id} must be production OFF`);
    assert.equal(flag.requiresGateBeforeProduction, true, `${flag.id} must require a production gate`);
    assert.equal(flag.allowedBeforePhase8I, false, `${flag.id} must not be allowed before Phase 8I`);
  }
});

await test("authority safety rules include memory-is-context-not-authority and all required protections", () => {
  const required = [
    "memory_is_context_not_authority",
    "memory_must_not_change_sae_status",
    "memory_must_not_change_retrieval",
    "memory_must_not_change_source_cards",
    "memory_must_not_override_authority_gate",
    "memory_must_not_create_fake_citations",
    "memory_must_not_assert_legal_currentness",
    "memory_must_not_replace_source_availability",
    "live_facts_override_memory",
    "conflicting_memory_triggers_clarification"
  ];
  for (const id of required) {
    assert(authorityRules.has(id), `authoritySafetyRules must include ${id}`);
  }
});

await test("consent rules require explicit consent for sensitive client facts and no unlabeled durable writes", () => {
  const required = [
    "explicit_save_command_allowed",
    "sensitive_client_facts_require_explicit_consent",
    "matter_memory_requires_scope_confirmation",
    "inferred_memory_requires_confirmation_before_durable_write",
    "user_correction_can_update_memory_with_scope",
    "forget_request_must_be_honored",
    "no_automatic_confidential_document_storage",
    "no_durable_write_without_permission_level"
  ];
  for (const id of required) {
    assert(consentRules.has(id), `consentRules must include ${id}`);
  }
});

await test("prohibited rules cover credentials, unsupported conclusions, and pre-Phase-10 claims", () => {
  const required = [
    "no_passwords",
    "no_api_keys",
    "no_private_credentials",
    "no_unsupported_legal_conclusions",
    "no_unsupported_tax_conclusions",
    "no_unsupported_accusations",
    "no_raw_confidential_contents_without_approval",
    "no_unnecessary_sensitive_personal_data",
    "no_court_case_currentness_claims",
    "no_gr_case_name_lookup_conclusions_before_phase10",
    "no_source_supersession_or_currentness_claims_before_phase10",
    "no_cross_client_factual_assumptions",
    "no_matter_facts_as_general_tax_law"
  ];
  for (const id of required) {
    assert(prohibited.has(id), `prohibitedMemoryRules must include ${id}`);
  }
});

await test("scope rules prohibit cross-client and matter leakage", () => {
  const expectedScopes = [
    "global_user", "firm_workspace_future", "client", "matter", "session", "source_document"
  ];
  assert.deepEqual([...scopes.keys()].sort(), [...expectedScopes].sort());
  assert(scopes.get("client").leakageProhibitedTo.includes("other_clients"));
  assert(scopes.get("client").leakageProhibitedTo.includes("general_tax_law"));
  assert(scopes.get("matter").leakageProhibitedTo.includes("unrelated_clients"));
  assert(scopes.get("matter").leakageProhibitedTo.includes("general_tax_opinions"));
});

await test("confidence states include contradicted and revoked with clarification triggers", () => {
  const expected = [
    "user_confirmed", "inferred", "source_derived", "stale", "contradicted", "unverified", "revoked"
  ];
  for (const id of expected) {
    assert(confidence.has(id), `confidenceStates must include ${id}`);
  }
  assert.equal(confidence.get("contradicted").mustTriggerClarificationWhenConflicting, true);
  assert.equal(confidence.get("revoked").mayReduceClarificationQuestions, false);
  assert.equal(confidence.get("user_confirmed").mayReduceClarificationQuestions, true);
  assert.equal(confidence.get("inferred").mayReduceClarificationQuestions, false);
});

await test("live facts override memory and conflicts trigger clarification", () => {
  assert(authorityRules.has("live_facts_override_memory"));
  assert(authorityRules.has("conflicting_memory_triggers_clarification"));
  assert(testCases.has("LIVE_FACTS_OVERRIDE_MEMORY"));
});

await test("Phase 10 boundaries are excluded from Phase 8B implementation", () => {
  for (const id of ["phase10_source_governance", "phase10_court_metadata", "phase10_hallucination_traps"]) {
    const boundary = boundaries.get(id);
    assert(boundary, `deferredBoundaries must include ${id}`);
    assert.equal(boundary.excludedFromPhase8B, true);
    assert.equal(boundary.implementationAllowedHere, false);
  }
});

await test("Phase 11 performance/cache/compression/observability is excluded", () => {
  const boundary = boundaries.get("phase11_observability_performance");
  assert(boundary);
  assert.equal(boundary.excludedFromPhase8B, true);
  assert.equal(boundary.implementationAllowedHere, false);
});

await test("boundary tuning is a Phase 7B follow-up, not Phase 8B", () => {
  const boundary = boundaries.get("phase7b_boundary_tuning_followup");
  assert(boundary);
  assert.match(boundary.description, /PATCH-07B-CLARIFICATION-BOUNDARY-TUNING-1/);
  assert.match(boundary.description, /Phase 7B/);
  assert.equal(boundary.implementationAllowedHere, false);
  assert(testCases.has("BOUNDARY_TUNING_NOT_PHASE8"));
});

await test("phase 12 document advisory and phase 14 mobile remain deferred boundaries", () => {
  for (const id of ["phase12_document_advisory", "phase14_mobile_after_phase13"]) {
    const boundary = boundaries.get(id);
    assert(boundary, `deferredBoundaries must include ${id}`);
    assert.equal(boundary.excludedFromPhase8B, true);
    assert.equal(boundary.mayBeReferencedAsBoundary, true);
  }
});

await test("session-only facts are not persisted", () => {
  assert.equal(classes.get("temporary_session").defaultPermissionLevel, "session_only");
  assert.match(permissions.get("session_only").prohibitedUse, /persistence|cross-session/i);
  assert(scopes.get("session").leakageProhibitedTo.includes("durable_memory_without_consent"));
  assert(testCases.has("SESSION_ONLY_NOT_PERSISTED"));
});

await test("source-derived memory cannot assert legal currentness, supersession, or case status", () => {
  const cls = classes.get("source_derived");
  const prohibitedUses = cls.prohibitedUses.join(" ");
  assert.match(prohibitedUses, /currentness/i);
  assert.match(prohibitedUses, /supersession/i);
  assert.match(prohibitedUses, /case status/i);
  assert(scopes.get("source_document").leakageProhibitedTo.includes("legal_currentness_claims"));
  assert(testCases.has("SOURCE_DERIVED_MEMORY_NOT_LEGAL_CURRENTNESS"));
});

await test("forget request requirement exists in consent rules and test cases", () => {
  assert(consentRules.has("forget_request_must_be_honored"));
  assert(testCases.has("FORGET_REQUEST_REQUIRED"));
});

await test("all required fixture testCases are present by id", () => {
  const required = [
    "CLASS_SET_EXACT", "PERMISSION_SET_EXACT", "DEFAULT_PERMISSION_MAPPING",
    "MEMORY_CONTEXT_NOT_AUTHORITY", "CROSS_CLIENT_LEAKAGE_PROHIBITED",
    "LIVE_FACTS_OVERRIDE_MEMORY", "CONSENT_REQUIRED_FOR_SENSITIVE_CLIENT_FACTS",
    "NO_DURABLE_WRITES_IN_PHASE8B", "MEMORY_FLAGS_DEFAULT_OFF",
    "PHASE10_DEFERRED", "PHASE11_DEFERRED", "BOUNDARY_TUNING_NOT_PHASE8",
    "PROHIBITED_ITEMS_REJECTED", "SESSION_ONLY_NOT_PERSISTED",
    "SOURCE_DERIVED_MEMORY_NOT_LEGAL_CURRENTNESS", "FORGET_REQUEST_REQUIRED"
  ];
  for (const id of required) {
    assert(testCases.has(id), `testCases must include ${id}`);
  }
  assert.equal(fixture.testCases.length, required.length);
});

await test("fixture defines contract only: no runtime memory module names appear in the fixture", () => {
  const raw = readFileSync(FIXTURE_PATH, "utf8");
  const runtimeModules = [
    "memory-read-service.js", "memory-write-service.js", "memory-scope-resolver.js",
    "memory-governance-policy.js", "matter-memory-registry.js", "pipeline.js",
    "ask-handler.js", "retrieval-engine.js", "source-card-engine.js"
  ];
  for (const name of runtimeModules) {
    assert(!raw.includes(name), `fixture must not reference runtime module ${name}`);
  }
});

await test("scope types restrict allowed memory classes to declared classes", () => {
  for (const scope of fixture.scopeTypes) {
    for (const clsId of scope.allowedMemoryClasses) {
      assert(classes.has(clsId), `scope ${scope.id} references unknown class ${clsId}`);
    }
  }
  assert.deepEqual(scopes.get("firm_workspace_future").allowedMemoryClasses, [], "firm workspace scope is future-only");
});

console.log(`\nPATCH-08B-MEMORY-TAXONOMY-FIXTURE-1 policy tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
