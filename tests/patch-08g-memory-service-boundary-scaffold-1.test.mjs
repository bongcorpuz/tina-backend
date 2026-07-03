// PATCH-08G-MEMORY-SERVICE-BOUNDARY-SCAFFOLD-1 - memory service boundary scaffold tests.
// Contract-only validation. No runtime memory read/write service is imported or implemented.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import * as boundaries from "../memory-boundaries/index.js";
import {
  getMemoryClasses,
  getPermissionLevels,
  getConfidenceStates,
  getScopeTypes,
  isValidMemoryClass,
  isValidPermissionLevel
} from "../memory-boundaries/memory-taxonomy-registry.js";
import {
  validatePrimaryScopeContract,
  validateScopeReferenceContract,
  isScopeReadEligible,
  isScopeWriteEligible
} from "../memory-boundaries/memory-scope-policy.js";
import {
  isConsentRequired,
  validateConsentRequestContract,
  canCreateDurableMemory,
  applyConsentDecision
} from "../memory-boundaries/memory-consent-policy.js";
import {
  validateMemoryAuthoritySeparation,
  buildNonAuthorityMemoryContext
} from "../memory-boundaries/memory-authority-separation-policy.js";
import {
  getServiceBoundaryContracts,
  getMemoryFeatureFlags,
  getDeferredBoundaries
} from "../memory-boundaries/memory-service-boundary-contract.js";

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

const ids = (items) => items.map((item) => item.id).sort();
const modulePaths = [
  "memory-boundaries/memory-taxonomy-registry.js",
  "memory-boundaries/memory-scope-policy.js",
  "memory-boundaries/memory-consent-policy.js",
  "memory-boundaries/memory-authority-separation-policy.js",
  "memory-boundaries/memory-service-boundary-contract.js",
  "memory-boundaries/index.js"
];

await test("all scaffold modules import successfully and index exports only contract/policy functions", () => {
  const expectedExports = [
    "getMemoryClasses", "getPermissionLevels", "getConfidenceStates", "getScopeTypes",
    "isValidMemoryClass", "isValidPermissionLevel", "isValidConfidenceState", "isValidScopeType",
    "validatePrimaryScopeContract", "validateScopeReferenceContract", "isScopeReadEligible",
    "isScopeWriteEligible", "explainScopeDecision", "isConsentRequired",
    "validateConsentRequestContract", "validateConsentResponseContract", "canCreateDurableMemory",
    "applyConsentDecision", "explainConsentDecision", "validateMemoryAuthoritySeparation",
    "assertMemoryDoesNotMutateAuthorityState", "buildNonAuthorityMemoryContext",
    "explainAuthoritySeparationDecision", "getServiceBoundaryContracts",
    "getMemoryFeatureFlags", "assertAllMemoryFlagsDefaultOff", "getDeferredBoundaries",
    "explainBoundaryContract"
  ].sort();
  deepEqual(Object.keys(boundaries).sort(), expectedExports, "index exports exact functions");
  for (const name of Object.keys(boundaries)) {
    equal(typeof boundaries[name], "function", `${name} is a function`);
  }
});

await test("scaffold modules do not import runtime, DB, Supabase, OpenAI, retrieval, source-card, or sourceAvailability modules", () => {
  const forbidden = [
    "pipeline", "ask-handler", "routes", "supabase", "openai", "retrieval",
    "source-card", "sourceAvailability", "source-availability", "db", "database",
    "server.js", "express", "process.env"
  ];
  for (const path of modulePaths) {
    const raw = readFileSync(resolve(path), "utf8");
    const imports = raw.split(/\r?\n/).filter((line) => /^\s*import\s/.test(line)).join("\n");
    for (const token of forbidden) {
      check(!imports.includes(token), `${path} must not import ${token}`);
    }
  }
});

await test("taxonomy registry matches Phase 8B/8D fixtures and rejects invalid ids", () => {
  deepEqual(getMemoryClasses().sort(), ids(phase8b.memoryClasses), "memory classes match Phase 8B");
  deepEqual(getPermissionLevels().sort(), ids(phase8b.permissionLevels), "permission levels match Phase 8B");
  deepEqual(getConfidenceStates().sort(), ids(phase8b.confidenceStates), "confidence states match Phase 8B");
  deepEqual(getScopeTypes().sort(), ids(phase8b.scopeTypes), "scope types match Phase 8B");
  deepEqual(getScopeTypes().sort(), phase8d.baseContracts.scopeTypes.slice().sort(), "scope types match Phase 8D");
  equal(isValidMemoryClass("not_a_memory_class"), false, "invalid memory class rejected");
  equal(isValidPermissionLevel("super_admin_memory"), false, "invalid permission level rejected");
});

await test("primary scope validation requires exactly one type and id and blocks source_document primary use", () => {
  equal(validatePrimaryScopeContract({ primary_scope_id: "m1" }).code, "PRIMARY_SCOPE_TYPE_REQUIRED_EXACTLY_ONCE");
  equal(validatePrimaryScopeContract({ primary_scope_type: "matter" }).code, "PRIMARY_SCOPE_ID_REQUIRED_EXACTLY_ONCE");
  equal(validatePrimaryScopeContract({ primary_scope_type: "source_document", primary_scope_id: "s1" }).code, "SOURCE_DOCUMENT_REFERENCE_ONLY");
  equal(validatePrimaryScopeContract({ primary_scope_type: "matter", primary_scope_id: "m1" }).allowed, true);
});

await test("reference scopes do not expand read eligibility and scope denials are structured", () => {
  const denied = validateScopeReferenceContract({ referenceScopes: [{ scopeType: "source_document", expandsReadEligibility: true }] });
  equal(denied.allowed, false);
  equal(denied.code, "REFERENCE_SCOPE_NO_READ_EXPANSION");
  check(typeof denied.reason === "string" && denied.reason.length > 0, "structured denial reason");
});

await test("client and matter scope read eligibility prevents unrelated reads without confirmation", () => {
  equal(isScopeReadEligible({ memoryClass: "client_entity", primary_scope_id: "client-a" }, { clientId: "client-b" }).code, "CLIENT_SCOPE_MISMATCH");
  equal(isScopeReadEligible({ memoryClass: "matter", primary_scope_id: "matter-a" }, { matterId: "matter-b" }).code, "MATTER_SCOPE_MISMATCH");
  equal(isScopeReadEligible({ memoryClass: "matter", primary_scope_id: "matter-a" }, { matterId: "matter-b", explicitMatterTransferConfirmed: true }).allowed, true);
});

await test("ambiguous scope defaults to session-only and session attachment requires confirmation", () => {
  const ambiguous = isScopeWriteEligible({ primary_scope_type: "ambiguous", primary_scope_id: "x" }, {});
  equal(ambiguous.allowed, false);
  equal(ambiguous.defaultScopeType, "session");
  equal(isScopeWriteEligible({ primary_scope_type: "session", primary_scope_id: "s1", attachToMatterId: "m1" }, {}).code, "SESSION_ATTACHMENT_REQUIRES_CONFIRMATION");
});

await test("consent policy detects sensitive client/matter facts and validates default responses", () => {
  equal(isConsentRequired({ memoryClass: "client_entity", sensitiveDataPresent: true }).allowed, true);
  equal(isConsentRequired({ memoryClass: "matter", sensitivityLabel: "sensitive" }).code, "SENSITIVE_CLIENT_MATTER_REQUIRES_EXPLICIT_CONSENT");
  equal(validateConsentRequestContract({ defaultResponse: "deny", memoryClass: "client_entity", scopeLabel: "Client A", sensitiveDataPresent: true, allowedUserResponses: ["approve", "deny"] }).allowed, true);
  equal(validateConsentRequestContract({ defaultResponse: "session_only", memoryClass: "matter", scopeLabel: "Matter A", allowedUserResponses: ["approve"] }).allowed, true);
  equal(validateConsentRequestContract({ defaultResponse: "approve" }).allowed, false);
});

await test("deny, session_only, ask_later, revoked, expired, and approve_with_edits consent outcomes are enforced", () => {
  for (const userResponse of ["deny", "session_only", "ask_later"]) {
    const result = applyConsentDecision({ suggestionId: "s1" }, { userResponse });
    equal(result.allowed, false, `${userResponse} no durable memory`);
  }
  equal(canCreateDurableMemory({ authorityUseProhibited: true, legalConclusionProhibited: true }, "revoked").code, "REVOKED_MEMORY_UNREADABLE");
  equal(canCreateDurableMemory({ authorityUseProhibited: true, legalConclusionProhibited: true }, "expired").code, "EXPIRED_CONSENT_BLOCKS_DURABLE_USE");
  equal(applyConsentDecision({ contentSummary: "old" }, { userResponse: "approve_with_edits" }).supersedesOriginalCandidate, true);
});

await test("source-derived memory remains provenance-only and consent is not authority", () => {
  equal(canCreateDurableMemory({ memoryClass: "source_derived", authorityUseProhibited: true, legalConclusionProhibited: true }, "granted").code, "SOURCE_DERIVED_PROVENANCE_ONLY");
  equal(canCreateDurableMemory({ memoryClass: "matter", authorityUseProhibited: false, legalConclusionProhibited: true }, "granted").code, "CONSENT_NOT_AUTHORITY");
});

await test("authority separation blocks authority state, retrieval, source-card, citation, currentness, case-status, and Phase 10 mutation", () => {
  equal(validateMemoryAuthoritySeparation({ mutateSAE: true }).code, "MEMORY_CANNOT_MUTATE_SAE_OR_SOURCE_AVAILABILITY");
  equal(validateMemoryAuthoritySeparation({ mutateSourceAvailability: true }).code, "MEMORY_CANNOT_MUTATE_SAE_OR_SOURCE_AVAILABILITY");
  equal(validateMemoryAuthoritySeparation({ mutateRetrieval: true }).code, "MEMORY_CANNOT_MUTATE_RETRIEVAL");
  equal(validateMemoryAuthoritySeparation({ mutateSourceCards: true }).code, "MEMORY_CANNOT_MUTATE_SOURCE_CARDS");
  equal(validateMemoryAuthoritySeparation({ createCitation: true }).code, "MEMORY_CANNOT_CREATE_CITATIONS");
  equal(validateMemoryAuthoritySeparation({ claimsLegalCurrentness: true }).code, "MEMORY_CANNOT_CLAIM_LEGAL_CURRENTNESS");
  equal(validateMemoryAuthoritySeparation({ claimsCaseStatus: true }).code, "MEMORY_CANNOT_CLAIM_CASE_STATUS");
  equal(validateMemoryAuthoritySeparation({ bypassPhase10Deferral: true }).code, "MEMORY_CANNOT_BYPASS_PHASE10_DEFERRAL");
});

await test("non-authority memory context uses only permitted phrasing", () => {
  const context = buildNonAuthorityMemoryContext([{ memoryId: "m1", contentSummary: "client said TY 2023" }]);
  equal(context.length, 1);
  check(context[0].phrasing.startsWith("user/matter context indicates:"), "permitted phrasing");
  equal(context[0].authorityUseProhibited, true);
  equal(context[0].sourceCardMutationAllowed, false);
});

await test("service boundary contracts list all future modules with implementation disabled", () => {
  const expected = [
    "memory-consent-contract.js", "memory-consent-policy.js", "memory-suggestion-builder.js",
    "memory-consent-request-builder.js", "memory-consent-response-validator.js",
    "memory-consent-audit-policy.js", "memory-revocation-policy.js",
    "memory-sensitive-data-policy.js", "memory-scope-resolver.js", "memory-read-policy.js",
    "memory-write-policy.js", "memory-conflict-resolver.js", "memory-retention-policy.js",
    "memory-audit-service.js"
  ].sort();
  const contracts = getServiceBoundaryContracts();
  deepEqual(ids(contracts), expected, "future service boundary ids");
  for (const contract of contracts) {
    equal(contract.implementationHereAllowed, false, `${contract.id} implementation disabled`);
  }
});

await test("feature flags are default OFF, production OFF, gate-required, and not allowed before Phase 8I", () => {
  const expected = phase8f.featureFlags.map((flag) => flag.id).sort();
  const flags = getMemoryFeatureFlags();
  deepEqual(ids(flags), expected, "flag ids match Phase 8F");
  for (const flag of flags) {
    equal(flag.defaultEnabled, false, `${flag.id} default off`);
    equal(flag.productionEnabled, false, `${flag.id} production off`);
    equal(flag.requiresGateBeforeProduction, true, `${flag.id} gate required`);
    equal(flag.allowedBeforePhase8I, false, `${flag.id} not before Phase 8I`);
  }
});

await test("deferred boundaries include Phase 7B, 10, 11, 12, and 14 with implementation disabled", () => {
  const expected = phase8f.deferredBoundaries.map((boundary) => boundary.id).sort();
  const deferred = getDeferredBoundaries();
  deepEqual(ids(deferred), expected, "deferred ids match Phase 8F");
  for (const boundary of deferred) {
    equal(boundary.implementationAllowedHere, false, `${boundary.id} implementation disabled`);
    equal(boundary.mayBeReferencedAsBoundary, true, `${boundary.id} may be referenced`);
  }
});

await test("scaffold functions do not mutate input objects", () => {
  const candidate = Object.freeze({ primary_scope_type: "matter", primary_scope_id: "m1" });
  const requestContext = Object.freeze({ matterId: "m2" });
  validatePrimaryScopeContract(candidate);
  isScopeReadEligible(Object.freeze({ memoryClass: "matter", primary_scope_id: "m1" }), requestContext);
  applyConsentDecision(Object.freeze({ suggestionId: "s1", contentSummary: "x" }), Object.freeze({ userResponse: "approve" }));
  validateMemoryAuthoritySeparation(Object.freeze({ mutateRetrieval: true }));
  deepEqual(candidate, { primary_scope_type: "matter", primary_scope_id: "m1" }, "candidate unchanged");
  deepEqual(requestContext, { matterId: "m2" }, "context unchanged");
});

await test("no runtime memory service, DB/migration/table, route/controller/pipeline, frontend, Phase 10, or Phase 11 implementation files are created", () => {
  const forbiddenFiles = [
    "memory-read-service.js", "memory-write-service.js", "memory-service.js",
    "migrations/phase-8g-memory.sql", "supabase/memory.sql", "routes/memory.js",
    "controllers/memory-controller.js", "src/App.jsx", "frontend/memory-ui.js",
    "phase10-court-metadata.js", "phase11-cache.js"
  ];
  for (const file of forbiddenFiles) {
    check(!existsSync(resolve(file)), `${file} must not exist`);
  }
});

await test("source-authority separation remains enforceable through scaffold functions", () => {
  equal(validateMemoryAuthoritySeparation({ authorityUseProhibited: true, legalConclusionProhibited: true }).allowed, true);
  equal(validateMemoryAuthoritySeparation({ legalConclusionProhibited: false }).code, "MEMORY_CONTEXT_NOT_AUTHORITY");
});

console.log(`\nPATCH-08G-MEMORY-SERVICE-BOUNDARY-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
