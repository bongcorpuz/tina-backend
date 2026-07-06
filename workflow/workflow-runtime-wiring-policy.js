// FILE: workflow/workflow-runtime-wiring-policy.js
// PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1
//
// Pure, dependency-free controlled runtime-wiring POLICY for the Phase 9
// Professional Workflow Co-Pilot. This module defines — but does not
// implement — how Phase 9 workflow modes will later be safely wired into
// TINA runtime behind a feature flag. It has NO I/O, NO network calls, NO
// Supabase/OpenAI/Google Drive/n8n/Firecrawl/Crawlee dependency, NO
// filesystem access, NO process.env dependency, NO Date.now/randomness, and
// NO side effects. It activates no runtime workflow generation and is not
// wired into ask-handler.js, pipeline.js, server.js, routes, or the
// frontend.

"use strict";

import { normalizeWorkflowModeId } from "./workflow-mode-registry.js";

export const PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION = "1.0.0";

const OPTIONAL_PER_MODE_FLAGS = Object.freeze([
  "TINA_ENABLE_WORKFLOW_TAX_MEMO",
  "TINA_ENABLE_WORKFLOW_BIR_REPLY",
  "TINA_ENABLE_WORKFLOW_AUDIT_DEFENSE_MATRIX",
  "TINA_ENABLE_WORKFLOW_CLIENT_ADVISORY",
  "TINA_ENABLE_WORKFLOW_COMPLIANCE_CHECKLIST",
  "TINA_ENABLE_WORKFLOW_REQUIREMENTS_REQUEST_LETTER"
]);

export const WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS = Object.freeze({
  primaryFlag: "TINA_ENABLE_PROFESSIONAL_WORKFLOWS",
  primary: Object.freeze({
    name: "TINA_ENABLE_PROFESSIONAL_WORKFLOWS",
    defaultState: "off",
    productionDefault: "off",
    stagingDefault: "off",
    localDefault: "off",
    requiresExplicitEnvEnablement: true,
    requiresGovernanceGate: true,
    requiresSourceCards: true,
    requiresHumanReviewNotice: true,
    requiresMissingFactsDisclosure: true,
    requiresAssumptionsDisclosure: true,
    noMemoryActivation: true,
    noGeneratedWorkProductPersistence: true,
    noClientMatterPersistence: true,
    noThirdPartyEgress: true,
    noExternalSearch: true,
    noN8nFirecrawlCrawlee: true
  }),
  optionalPerModeFlags: Object.freeze(
    OPTIONAL_PER_MODE_FLAGS.map((name) =>
      Object.freeze({
        name,
        defaultState: "off",
        designOnly: true
      })
    )
  )
});

export const WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES = Object.freeze(["tax_memo"]);

export const WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES = Object.freeze([
  "bir_reply_protest_draft",
  "audit_defense_matrix",
  "client_advisory",
  "compliance_checklist",
  "requirements_request_letter"
]);

const BLOCKED_MODE_REASONS = Object.freeze({
  bir_reply_protest_draft: "higher-risk BIR/protest controversy content; should not be the first runtime target",
  audit_defense_matrix: "higher-risk audit-defense content; should not be the first runtime target",
  client_advisory: "should follow after tax_memo runtime wiring is proven safe",
  compliance_checklist: "should follow after tax_memo runtime wiring is proven safe",
  requirements_request_letter: "no dedicated schema exists yet (registry-only/pending); blocked until a dedicated schema exists or an explicit registry-only exception is approved"
});

export const WORKFLOW_RUNTIME_WIRING_BOUNDARIES = Object.freeze([
  "feature_flag_required",
  "default_off",
  "no_runtime_change_in_phase_09h",
  "no_route_added",
  "no_ask_handler_change",
  "no_pipeline_change",
  "no_server_change",
  "no_frontend_change",
  "existing_retrieval_only",
  "no_live_web_search",
  "no_new_authority_ingestion",
  "no_n8n",
  "no_firecrawl",
  "no_crawlee",
  "no_memory_activation",
  "no_client_matter_persistence",
  "no_generated_work_product_persistence",
  "no_third_party_egress",
  "source_cards_required",
  "missing_facts_required",
  "assumptions_required",
  "human_review_notice_required",
  "governance_gate_required",
  "no_final_filing_claim",
  "no_automatic_submission",
  "production_unchanged"
]);

export const WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES = Object.freeze([
  "phase_09a_design_pass",
  "phase_09b_registry_pass",
  "phase_09c_tax_memo_schema_pass",
  "phase_09g_governance_gate_pass",
  "selected_mode_has_dedicated_schema",
  "governance_output_validation_pass",
  "source_cards_present",
  "missing_facts_present",
  "assumptions_present",
  "human_review_notice_present",
  "prohibited_claim_detection_pass",
  "no_runtime_persistence",
  "feature_flag_default_off",
  "regression_tests_pass",
  "user_explicit_approval_for_runtime_wiring"
]);

export const WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS = Object.freeze([
  "enabling_feature_flag_by_default",
  "production_enablement",
  "modifying_ask_handler_in_phase_09h",
  "modifying_pipeline_in_phase_09h",
  "modifying_server_in_phase_09h",
  "adding_routes_in_phase_09h",
  "memory_activation",
  "client_matter_persistence",
  "generated_work_product_persistence",
  "external_search",
  "authority_intake",
  "n8n_call",
  "firecrawl_call",
  "crawlee_call",
  "third_party_egress",
  "automatic_filing",
  "final_filing_claim",
  "bypassing_governance_gate",
  "bypassing_source_cards",
  "bypassing_missing_fact_disclosure",
  "bypassing_human_review_notice"
]);

export const WORKFLOW_RUNTIME_WIRING_LATER_ALLOWED_FILES = Object.freeze([
  Object.freeze({ path: "ask-handler.js", laterOnly: true }),
  Object.freeze({ path: "pipeline.js", laterOnly: true }),
  Object.freeze({ path: "workflow/workflow-runtime-orchestrator.js", laterOnly: true }),
  Object.freeze({ path: "workflow/workflow-output-renderer.js", laterOnly: true }),
  Object.freeze({ path: "tests/future-runtime-wiring-test-file", laterOnly: true })
]);

export const WORKFLOW_RUNTIME_WIRING_LATER_FORBIDDEN_FILES = Object.freeze([
  Object.freeze({ path: "server.js", condition: "unless new routes are separately approved" }),
  Object.freeze({ path: "DB/migration files", condition: "unless persistence is separately approved" }),
  Object.freeze({ path: "env files", condition: "never in a design/scaffold patch" }),
  Object.freeze({ path: "frontend files", condition: "unless UI wiring is separately approved" }),
  Object.freeze({ path: "n8n files", condition: "never without separate n8n approval" }),
  Object.freeze({ path: "Firecrawl/Crawlee files", condition: "never without separate crawling approval" })
]);

function deepClone(value) {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
    return out;
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Returns a fresh runtime-wiring-policy result scaffold. Every call returns
 * new arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createWorkflowRuntimeWiringPolicyResult() {
  return {
    valid: true,
    errors: [],
    warnings: [],
    mode: null,
    checks: []
  };
}

/**
 * Normalizes a candidate mode identifier via the workflow mode registry's
 * normalization. Returns null for unsupported input.
 *
 * @param {*} modeId
 * @returns {string|null}
 */
export function normalizeRuntimeWiringModeId(modeId) {
  return normalizeWorkflowModeId(modeId);
}

/**
 * Returns a defensive deep-cloned copy of the full runtime-wiring policy.
 *
 * @returns {object}
 */
export function getWorkflowRuntimeWiringPolicy() {
  return {
    version: PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION,
    featureFlags: deepClone(WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS),
    allowedModes: [...WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES],
    blockedModes: [...WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES],
    boundaries: [...WORKFLOW_RUNTIME_WIRING_BOUNDARIES],
    requiredGates: [...WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES],
    prohibitedActions: [...WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS],
    laterAllowedFiles: deepClone(WORKFLOW_RUNTIME_WIRING_LATER_ALLOWED_FILES),
    laterForbiddenFiles: deepClone(WORKFLOW_RUNTIME_WIRING_LATER_FORBIDDEN_FILES)
  };
}

/**
 * Returns a defensive deep-cloned copy of the feature-flag policy.
 *
 * @returns {object}
 */
export function getWorkflowRuntimeFeatureFlags() {
  return deepClone(WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS);
}

/**
 * Returns a defensive copy of the allowed-modes list.
 *
 * @returns {string[]}
 */
export function getWorkflowRuntimeAllowedModes() {
  return [...WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES];
}

/**
 * Returns a defensive copy of the blocked-modes list.
 *
 * @returns {string[]}
 */
export function getWorkflowRuntimeBlockedModes() {
  return [...WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES];
}

/**
 * Returns a defensive copy of the required-gates list.
 *
 * @returns {string[]}
 */
export function getWorkflowRuntimeRequiredGates() {
  return [...WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES];
}

/**
 * Returns a defensive copy of the runtime boundaries list.
 *
 * @returns {string[]}
 */
export function getWorkflowRuntimeBoundaries() {
  return [...WORKFLOW_RUNTIME_WIRING_BOUNDARIES];
}

/**
 * Validates a candidate future runtime-wiring request against this policy.
 * Never throws. This function evaluates policy compliance only — it does
 * not perform, trigger, or simulate any actual runtime wiring, and this
 * patch does not call it against any live request.
 *
 * @param {*} request
 * @returns {{valid: boolean, errors: string[], warnings: string[], mode: string|null, checks: string[]}}
 */
export function validateWorkflowRuntimeWiringRequest(request) {
  const errors = [];
  const warnings = [];
  const checks = [];

  if (!isPlainObject(request)) {
    return { valid: false, errors: ["request must be a plain object"], warnings, mode: null, checks };
  }

  const modeId = normalizeRuntimeWiringModeId(request.modeId);
  checks.push("mode_normalized");
  if (!modeId) {
    errors.push(`mode must normalize to a supported mode (found: ${JSON.stringify(request.modeId)})`);
    return { valid: false, errors, warnings, mode: null, checks };
  }

  if (!WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES.includes(modeId)) {
    errors.push(`mode is not in allowedModes: ${modeId}`);
  }
  if (WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES.includes(modeId)) {
    const reason = BLOCKED_MODE_REASONS[modeId] || "blocked pending later explicit approval";
    errors.push(`mode is blocked: ${modeId} (${reason})`);
  }
  checks.push("mode_allow_block_checked");

  if (request.featureFlagEnabled === true) {
    errors.push("feature flag must not be default-enabled for this request");
  }
  checks.push("feature_flag_checked");

  const requiredTrueFields = [
    "hasDedicatedSchema",
    "governanceGatePassed",
    "sourceCardsPresent",
    "missingFactsPresent",
    "assumptionsPresent",
    "humanReviewNoticePresent",
    "prohibitedClaimDetectionPassed"
  ];
  for (const field of requiredTrueFields) {
    if (request[field] !== true) errors.push(`${field} must be true`);
  }
  checks.push("required_true_fields_checked");

  const requiredFalseFields = [
    "persistenceRequested",
    "memoryRequested",
    "thirdPartyEgressRequested",
    "externalSearchRequested",
    "productionEnablementRequested"
  ];
  for (const field of requiredFalseFields) {
    if (request[field] !== false) errors.push(`${field} must be false`);
  }
  checks.push("required_false_fields_checked");

  if (request.userExplicitApprovalForRuntimeWiring !== true) {
    errors.push("userExplicitApprovalForRuntimeWiring must be true for any actual later runtime wiring request");
  }
  checks.push("explicit_approval_checked");

  return { valid: errors.length === 0, errors, warnings, mode: modeId, checks };
}

/**
 * Validates the internal runtime-wiring policy's own shape and invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], featureFlagCount: number, allowedModeCount: number, blockedModeCount: number, requiredGateCount: number, prohibitedActionCount: number}}
 */
export function validateWorkflowRuntimeWiringPolicy() {
  const errors = [];
  const warnings = [];

  const primary = WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS.primary;
  if (!primary || primary.name !== "TINA_ENABLE_PROFESSIONAL_WORKFLOWS") {
    errors.push("primary feature flag must be TINA_ENABLE_PROFESSIONAL_WORKFLOWS");
  } else {
    if (primary.defaultState !== "off") errors.push("primary flag defaultState must be off");
    if (primary.productionDefault !== "off") errors.push("primary flag productionDefault must be off");
    if (primary.stagingDefault !== "off") errors.push("primary flag stagingDefault must be off");
    if (primary.localDefault !== "off") errors.push("primary flag localDefault must be off");
  }

  const optionalFlags = WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS.optionalPerModeFlags || [];
  if (optionalFlags.length === 0) errors.push("optional per-mode flags must be non-empty");
  for (const flag of optionalFlags) {
    if (flag.defaultState !== "off") errors.push(`optional flag ${flag.name} must default off`);
  }

  if (!WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES.includes("tax_memo")) {
    errors.push("allowedModes must include tax_memo");
  }

  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    if (!WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES.includes(modeId)) {
      errors.push(`blockedModes must include: ${modeId}`);
    }
  }
  if (!/dedicated schema/i.test(BLOCKED_MODE_REASONS.requirements_request_letter || "")) {
    errors.push("requirements_request_letter must be blocked because dedicated schema pending");
  }

  for (const boundary of [
    "no_runtime_change_in_phase_09h",
    "no_ask_handler_change",
    "no_pipeline_change",
    "no_server_change",
    "no_route_added",
    "existing_retrieval_only",
    "no_live_web_search",
    "no_new_authority_ingestion",
    "no_memory_activation",
    "no_third_party_egress",
    "governance_gate_required"
  ]) {
    if (!WORKFLOW_RUNTIME_WIRING_BOUNDARIES.includes(boundary)) errors.push(`boundaries must include: ${boundary}`);
  }

  for (const gate of ["phase_09g_governance_gate_pass", "selected_mode_has_dedicated_schema", "user_explicit_approval_for_runtime_wiring"]) {
    if (!WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES.includes(gate)) errors.push(`required gates must include: ${gate}`);
  }

  for (const action of [
    "enabling_feature_flag_by_default",
    "production_enablement",
    "modifying_ask_handler_in_phase_09h",
    "modifying_pipeline_in_phase_09h",
    "modifying_server_in_phase_09h",
    "adding_routes_in_phase_09h",
    "memory_activation",
    "external_search",
    "n8n_call",
    "firecrawl_call",
    "crawlee_call",
    "bypassing_governance_gate"
  ]) {
    if (!WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS.includes(action)) errors.push(`prohibited actions must include: ${action}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    featureFlagCount: 1 + optionalFlags.length,
    allowedModeCount: WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES.length,
    blockedModeCount: WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES.length,
    requiredGateCount: WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES.length,
    prohibitedActionCount: WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS.length
  };
}
