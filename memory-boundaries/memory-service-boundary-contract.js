// PATCH-08G scaffold: future service boundary contract registry.
// Data-only contract; no runtime feature flag reads and no implementation registration.

const FUTURE_MODULES = Object.freeze([
  ["memory-consent-contract.js", "Canonical consent states, event types, and object shapes."],
  ["memory-consent-policy.js", "Consent requirement and eligibility decisions."],
  ["memory-suggestion-builder.js", "Build redacted memorySuggestion objects."],
  ["memory-consent-request-builder.js", "Build plain-language memoryConsentRequest objects."],
  ["memory-consent-response-validator.js", "Validate memoryConsentResponse objects."],
  ["memory-consent-audit-policy.js", "Define append-only consent audit event shapes."],
  ["memory-revocation-policy.js", "Define revocation and forget lifecycle actions."],
  ["memory-sensitive-data-policy.js", "Classify sensitivity and reject prohibited data."],
  ["memory-scope-resolver.js", "Resolve candidate client/matter/session scopes."],
  ["memory-read-policy.js", "Decide read eligibility without retrieval mutation."],
  ["memory-write-policy.js", "Decide write eligibility without persistence."],
  ["memory-conflict-resolver.js", "Resolve live-fact versus stored-memory conflicts."],
  ["memory-retention-policy.js", "Define retention and expiry rules."],
  ["memory-audit-service.js", "Future audit append service boundary, no Phase 8G implementation."]
]);

const FLAGS = Object.freeze([
  "TINA_ENABLE_MEMORY_READS",
  "TINA_ENABLE_MEMORY_WRITES",
  "TINA_ENABLE_MATTER_MEMORY",
  "TINA_ENABLE_MEMORY_SUGGESTIONS",
  "TINA_ENABLE_MEMORY_DEBUG_TRACE"
]);

const DEFERRED = Object.freeze([
  ["phase7b_boundary_tuning_followup", "Clarification boundary tuning remains a Phase 7B pre-production-ON follow-up."],
  ["phase10_source_governance", "Official source repository governance, freshness, and legal-state validation remain Phase 10."],
  ["phase10_court_metadata", "Court metadata, G.R. lookup, case status, and supersession remain Phase 10."],
  ["phase10_hallucination_traps", "Hallucination trap validation remains Phase 10."],
  ["phase11_observability_performance", "Observability, performance, cache, and compression remain Phase 11."],
  ["phase12_document_advisory", "Document-aware advisory remains Phase 12."],
  ["phase14_mobile_after_phase13", "Mobile remains after Phase 13."]
]);

export function getServiceBoundaryContracts() {
  return FUTURE_MODULES.map(([id, purpose]) => ({
    id,
    purpose,
    allowedInputs: ["contract-shaped data from future gated patches"],
    outputs: ["structured contract decision or object"],
    prohibitedResponsibilities: ["runtime pipeline wiring", "database access", "Supabase queries", "OpenAI calls", "retrieval mutation", "source-card mutation", "frontend rendering", "persistent storage"],
    implementationHereAllowed: false
  }));
}

export function getMemoryFeatureFlags() {
  return FLAGS.map((id) => ({
    id,
    defaultEnabled: false,
    productionEnabled: false,
    requiresGateBeforeProduction: true,
    allowedBeforePhase8I: false
  }));
}

export function assertAllMemoryFlagsDefaultOff() {
  const flags = getMemoryFeatureFlags();
  return Object.freeze({
    allowed: flags.every((flag) => flag.defaultEnabled === false && flag.productionEnabled === false),
    code: "MEMORY_FLAGS_DEFAULT_OFF",
    flags
  });
}

export function getDeferredBoundaries() {
  return DEFERRED.map(([id, description]) => ({
    id,
    description,
    implementationAllowedHere: false,
    mayBeReferencedAsBoundary: true
  }));
}

export function explainBoundaryContract() {
  return "Phase 8G defines importable service-boundary contracts only; all memory flags remain default-OFF and production-OFF.";
}
