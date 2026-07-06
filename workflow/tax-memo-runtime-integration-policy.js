// FILE: workflow/tax-memo-runtime-integration-policy.js
// PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1
//
// Pure, dependency-free controlled INTEGRATION POLICY for later wiring the
// existing tax_memo runtime scaffold (Phase 9R scaffold) into TINA's `/ask`
// flow. This module defines — but does not implement — the feature-flag
// policy, caller/pipeline-output contract, required governance gates,
// forbidden runtime changes, and staged rollout plan that will govern any
// future integration. It has NO I/O, NO network calls, NO Supabase/OpenAI/
// Google Drive/n8n/Firecrawl/Crawlee dependency, NO filesystem access, NO
// process.env dependency, NO Date.now/randomness, and NO side effects. It
// does not wire tax_memo into `/ask` and is not imported by ask-handler.js,
// pipeline.js, server.js, routes, or the frontend.

"use strict";

import { validateWorkflowRuntimeWiringPolicy } from "./workflow-runtime-wiring-policy.js";
import { validateTaxMemoRuntimeScaffold } from "./tax-memo-runtime-orchestrator.js";
import { validateTaxMemoRuntimeRenderer } from "./tax-memo-runtime-renderer.js";
import { validateWorkflowGovernanceGate } from "./workflow-output-governance-gate.js";

export const PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION = "1.0.0";

export const TAX_MEMO_INTEGRATION_TARGET_ROUTE = "/ask";
export const TAX_MEMO_INTEGRATION_ALLOWED_MODE = "tax_memo";

export const TAX_MEMO_INTEGRATION_BLOCKED_MODES = Object.freeze([
  "bir_reply_protest_draft",
  "audit_defense_matrix",
  "client_advisory",
  "compliance_checklist",
  "requirements_request_letter"
]);

export const TAX_MEMO_INTEGRATION_FEATURE_FLAGS = Object.freeze({
  primaryFlag: "TINA_ENABLE_PROFESSIONAL_WORKFLOWS",
  modeFlag: "TINA_ENABLE_WORKFLOW_TAX_MEMO",
  primary: Object.freeze({
    name: "TINA_ENABLE_PROFESSIONAL_WORKFLOWS",
    defaultState: "off",
    productionDefault: "off",
    stagingDefault: "off",
    localDefault: "off",
    requiresExplicitEnvEnablement: true,
    mustNotBeEnabledByDefault: true
  }),
  mode: Object.freeze({
    name: "TINA_ENABLE_WORKFLOW_TAX_MEMO",
    defaultState: "off",
    productionDefault: "off",
    stagingDefault: "off",
    localDefault: "off",
    requiresExplicitEnvEnablement: true,
    mustNotBeEnabledByDefault: true
  })
});

export const TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS = Object.freeze([
  "modeId",
  "runtimeOptions",
  "userExplicitApprovalForRuntimeWiring",
  "featureFlagEnabled",
  "governanceGatePassed",
  "prohibitedClaimDetectionPassed"
]);

export const TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS = Object.freeze([
  "facts",
  "issues",
  "taxpayerType",
  "taxPeriod",
  "intendedAudience",
  "sourceCards",
  "missingFacts",
  "assumptions",
  "humanReviewNotice"
]);

export const TAX_MEMO_INTEGRATION_OPTIONAL_FUTURE_PIPELINE_FIELDS = Object.freeze([
  "analysisNotes",
  "applicableAuthorities",
  "conclusion",
  "risksLimitations",
  "documentsNeeded"
]);

export const TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES = Object.freeze([
  "phase_09h_runtime_policy_pass",
  "phase_09g_output_governance_gate_pass",
  "phase_09r_orchestrator_validation_pass",
  "phase_09r_renderer_validation_pass",
  "selected_mode_tax_memo_only",
  "source_cards_nonempty",
  "missing_facts_present",
  "assumptions_present",
  "human_review_notice_present",
  "no_prohibited_claims",
  "no_final_filing_claim",
  "no_automatic_submission",
  "no_persistence",
  "no_memory",
  "no_external_search",
  "no_third_party_egress",
  "no_production_enablement"
]);

export const TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES = Object.freeze([
  "enabling_feature_flag_by_default",
  "adding_new_route",
  "modifying_server_in_this_patch",
  "modifying_ask_handler_in_this_patch",
  "modifying_pipeline_in_this_patch",
  "modifying_frontend_in_this_patch",
  "enabling_memory",
  "adding_persistence",
  "adding_client_matter_storage",
  "adding_generated_work_product_storage",
  "calling_openai_from_integration_policy",
  "calling_supabase_from_integration_policy",
  "calling_google_drive_from_integration_policy",
  "calling_external_search",
  "calling_n8n",
  "calling_firecrawl",
  "calling_crawlee",
  "implementing_phase_10",
  "implementing_phase_11",
  "production_enablement"
]);

export const TAX_MEMO_INTEGRATION_LATER_ALLOWED_FILES = Object.freeze([
  Object.freeze({ path: "ask-handler.js", laterOnly: true }),
  Object.freeze({ path: "pipeline.js", laterOnly: true }),
  Object.freeze({ path: "workflow/tax-memo-runtime-orchestrator.js", laterOnly: true }),
  Object.freeze({ path: "workflow/tax-memo-runtime-renderer.js", laterOnly: true }),
  Object.freeze({ path: "tests/future-tax-memo-runtime-integration-test-file", laterOnly: true })
]);

export const TAX_MEMO_INTEGRATION_LATER_FORBIDDEN_FILES = Object.freeze([
  Object.freeze({ path: "server.js", condition: "unless new route is separately approved" }),
  Object.freeze({ path: "DB/migration files", condition: "unless persistence is separately approved" }),
  Object.freeze({ path: "env files", condition: "never in a design patch" }),
  Object.freeze({ path: "frontend files", condition: "unless UI wiring is separately approved" }),
  Object.freeze({ path: "n8n files", condition: "never without separate n8n approval" }),
  Object.freeze({ path: "Firecrawl/Crawlee files", condition: "never without separate crawling approval" })
]);

export const TAX_MEMO_INTEGRATION_ROLLOUT_STAGES = Object.freeze([
  "design_only_current_patch",
  "local_unit_integration_with_no_route_change",
  "ask_handler_guarded_integration_feature_flag_off",
  "staging_flag_on_tax_memo_only",
  "staging_smoke_evidence",
  "closure_gate",
  "production_consideration_only_after_explicit_approval"
]);

export const TAX_MEMO_INTEGRATION_CURRENT_STAGE = "design_only_current_patch";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = deepClone(value[key]);
    return out;
  }
  return value;
}

/**
 * Returns a fresh integration-policy result scaffold. Every call returns
 * new arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createTaxMemoIntegrationPolicyResult() {
  return {
    valid: true,
    blocked: false,
    errors: [],
    warnings: [],
    mode: TAX_MEMO_INTEGRATION_ALLOWED_MODE,
    checks: []
  };
}

/**
 * Returns a defensive deep-cloned copy of the full tax-memo runtime
 * integration policy.
 *
 * @returns {object}
 */
export function getTaxMemoRuntimeIntegrationPolicy() {
  return {
    version: PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION,
    targetRoute: TAX_MEMO_INTEGRATION_TARGET_ROUTE,
    allowedMode: TAX_MEMO_INTEGRATION_ALLOWED_MODE,
    blockedModes: [...TAX_MEMO_INTEGRATION_BLOCKED_MODES],
    featureFlags: deepClone(TAX_MEMO_INTEGRATION_FEATURE_FLAGS),
    requiredCallerFields: [...TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS],
    requiredPipelineOutputFields: [...TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS],
    requiredGovernanceGates: [...TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES],
    forbiddenRuntimeChanges: [...TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES],
    laterAllowedFiles: deepClone(TAX_MEMO_INTEGRATION_LATER_ALLOWED_FILES),
    laterForbiddenFiles: deepClone(TAX_MEMO_INTEGRATION_LATER_FORBIDDEN_FILES),
    rolloutStages: [...TAX_MEMO_INTEGRATION_ROLLOUT_STAGES],
    currentStage: TAX_MEMO_INTEGRATION_CURRENT_STAGE
  };
}

/**
 * Returns a defensive deep-cloned copy of the feature-flag policy.
 *
 * @returns {object}
 */
export function getTaxMemoIntegrationFeatureFlags() {
  return deepClone(TAX_MEMO_INTEGRATION_FEATURE_FLAGS);
}

/**
 * Returns a defensive copy of the required caller-field list.
 *
 * @returns {string[]}
 */
export function getTaxMemoIntegrationRequiredCallerFields() {
  return [...TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS];
}

/**
 * Returns a defensive copy of the required pipeline-output-field list.
 *
 * @returns {string[]}
 */
export function getTaxMemoIntegrationRequiredPipelineOutputFields() {
  return [...TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS];
}

/**
 * Returns a defensive copy of the required governance-gates list.
 *
 * @returns {string[]}
 */
export function getTaxMemoIntegrationRequiredGovernanceGates() {
  return [...TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES];
}

/**
 * Returns a defensive copy of the rollout-stages list.
 *
 * @returns {string[]}
 */
export function getTaxMemoIntegrationRolloutStages() {
  return [...TAX_MEMO_INTEGRATION_ROLLOUT_STAGES];
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasArray(value) {
  return Array.isArray(value);
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates a candidate future tax_memo `/ask` integration against this
 * policy. Never throws. This function evaluates policy compliance only — it
 * does not perform, trigger, or simulate any actual integration, and this
 * patch does not call it against any live request.
 *
 * @param {*} candidate
 * @returns {{valid: boolean, blocked: boolean, errors: string[], warnings: string[], mode: string, checks: string[]}}
 */
export function validateTaxMemoIntegrationCandidate(candidate) {
  const result = createTaxMemoIntegrationPolicyResult();

  if (!isPlainObject(candidate)) {
    result.valid = false;
    result.blocked = true;
    result.errors.push("candidate must be a plain object");
    return result;
  }

  if (candidate.modeId !== TAX_MEMO_INTEGRATION_ALLOWED_MODE) {
    result.valid = false;
    result.blocked = true;
    if (TAX_MEMO_INTEGRATION_BLOCKED_MODES.includes(candidate.modeId)) {
      result.errors.push(`mode is blocked for tax_memo integration: ${candidate.modeId}`);
    } else {
      result.errors.push(`modeId must be "tax_memo" (found: ${JSON.stringify(candidate.modeId)})`);
    }
    return result;
  }
  result.checks.push("mode_is_tax_memo");

  if (candidate.targetRoute !== TAX_MEMO_INTEGRATION_TARGET_ROUTE) {
    result.valid = false;
    result.blocked = true;
    result.errors.push(`targetRoute must be "${TAX_MEMO_INTEGRATION_TARGET_ROUTE}" (found: ${JSON.stringify(candidate.targetRoute)})`);
    return result;
  }
  result.checks.push("target_route_is_ask");

  const flags = isPlainObject(candidate.featureFlags) ? candidate.featureFlags : {};
  const primaryOn = flags[TAX_MEMO_INTEGRATION_FEATURE_FLAGS.primaryFlag] === true;
  const modeOn = flags[TAX_MEMO_INTEGRATION_FEATURE_FLAGS.modeFlag] === true;
  result.checks.push("feature_flags_checked");
  if (primaryOn || modeOn) {
    result.warnings.push("feature flags are enabled on this candidate; this design patch does not enable them by default and does not execute live integration");
  } else {
    result.warnings.push("feature flags are off; candidate is valid as a design candidate but blocked for live execution");
  }

  if (TAX_MEMO_INTEGRATION_CURRENT_STAGE === "design_only_current_patch") {
    result.warnings.push("rollout stage is design_only_current_patch; candidate is valid as design but blocked for live execution");
  }

  const pipelineOutput = isPlainObject(candidate.pipelineOutput) ? candidate.pipelineOutput : {};
  result.checks.push("pipeline_output_checked");
  for (const field of TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(pipelineOutput, field)) {
      result.valid = false;
      result.errors.push(`pipelineOutput missing required field: ${field}`);
    }
  }
  if (!hasNonEmptyArray(pipelineOutput.sourceCards)) {
    result.valid = false;
    result.errors.push("pipelineOutput.sourceCards must be a nonempty array");
  }
  if (!hasArray(pipelineOutput.missingFacts)) {
    result.valid = false;
    result.errors.push("pipelineOutput.missingFacts must be an array");
  }
  if (!hasArray(pipelineOutput.assumptions)) {
    result.valid = false;
    result.errors.push("pipelineOutput.assumptions must be an array");
  }
  if (!isNonBlankString(pipelineOutput.humanReviewNotice)) {
    result.valid = false;
    result.errors.push("pipelineOutput.humanReviewNotice must be a nonblank string");
  }

  const governance = isPlainObject(candidate.governance) ? candidate.governance : {};
  result.checks.push("governance_checked");
  for (const field of ["phase09gPassed", "phase09hPolicyPassed", "orchestratorValidated", "rendererValidated", "prohibitedClaimDetectionPassed"]) {
    if (governance[field] !== true) {
      result.valid = false;
      result.errors.push(`governance.${field} must be true`);
    }
  }

  const changeScope = isPlainObject(candidate.changeScope) ? candidate.changeScope : {};
  result.checks.push("change_scope_checked");
  for (const field of [
    "askHandlerModified",
    "pipelineModified",
    "serverModified",
    "routeAdded",
    "frontendModified",
    "envModified",
    "dbModified",
    "memoryEnabled",
    "persistenceAdded",
    "externalSearchAdded",
    "thirdPartyEgressAdded",
    "productionEnabled"
  ]) {
    if (changeScope[field] === true) {
      result.valid = false;
      result.errors.push(`changeScope.${field} must be false`);
    }
  }

  result.blocked = !result.valid || primaryOn === false || modeOn === false || TAX_MEMO_INTEGRATION_CURRENT_STAGE === "design_only_current_patch";

  return result;
}

/**
 * Validates the internal integration policy's own shape and invariants
 * without throwing. Always returns a structured result object.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], featureFlagCount: number, blockedModeCount: number, requiredCallerFieldCount: number, requiredPipelineOutputFieldCount: number, requiredGovernanceGateCount: number, forbiddenRuntimeChangeCount: number, rolloutStageCount: number}}
 */
export function validateTaxMemoIntegrationPolicy() {
  const errors = [];
  const warnings = [];

  if (TAX_MEMO_INTEGRATION_TARGET_ROUTE !== "/ask") errors.push('targetRoute must be "/ask"');
  if (TAX_MEMO_INTEGRATION_ALLOWED_MODE !== "tax_memo") errors.push('allowedMode must be "tax_memo"');

  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    if (!TAX_MEMO_INTEGRATION_BLOCKED_MODES.includes(modeId)) errors.push(`blockedModes must include: ${modeId}`);
  }

  const primary = TAX_MEMO_INTEGRATION_FEATURE_FLAGS.primary;
  const mode = TAX_MEMO_INTEGRATION_FEATURE_FLAGS.mode;
  if (!primary || primary.name !== "TINA_ENABLE_PROFESSIONAL_WORKFLOWS" || primary.defaultState !== "off") {
    errors.push("primary feature flag must exist and default off");
  }
  if (!mode || mode.name !== "TINA_ENABLE_WORKFLOW_TAX_MEMO" || mode.defaultState !== "off") {
    errors.push("mode feature flag must exist and default off");
  }

  for (const field of ["modeId", "runtimeOptions", "userExplicitApprovalForRuntimeWiring", "featureFlagEnabled", "governanceGatePassed", "prohibitedClaimDetectionPassed"]) {
    if (!TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS.includes(field)) errors.push(`required caller fields must include: ${field}`);
  }

  for (const field of ["facts", "issues", "taxpayerType", "taxPeriod", "intendedAudience", "sourceCards", "missingFacts", "assumptions", "humanReviewNotice"]) {
    if (!TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS.includes(field)) errors.push(`required pipeline output fields must include: ${field}`);
  }

  for (const gate of [
    "phase_09h_runtime_policy_pass",
    "phase_09g_output_governance_gate_pass",
    "phase_09r_orchestrator_validation_pass",
    "phase_09r_renderer_validation_pass",
    "selected_mode_tax_memo_only",
    "source_cards_nonempty",
    "missing_facts_present",
    "assumptions_present",
    "human_review_notice_present",
    "no_prohibited_claims"
  ]) {
    if (!TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES.includes(gate)) errors.push(`required governance gates must include: ${gate}`);
  }

  for (const change of [
    "enabling_feature_flag_by_default",
    "adding_new_route",
    "modifying_server_in_this_patch",
    "modifying_ask_handler_in_this_patch",
    "modifying_pipeline_in_this_patch",
    "enabling_memory",
    "adding_persistence",
    "implementing_phase_10",
    "implementing_phase_11",
    "production_enablement"
  ]) {
    if (!TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES.includes(change)) errors.push(`forbidden runtime changes must include: ${change}`);
  }

  for (const stage of [
    "design_only_current_patch",
    "local_unit_integration_with_no_route_change",
    "ask_handler_guarded_integration_feature_flag_off",
    "staging_flag_on_tax_memo_only",
    "staging_smoke_evidence",
    "closure_gate",
    "production_consideration_only_after_explicit_approval"
  ]) {
    if (!TAX_MEMO_INTEGRATION_ROLLOUT_STAGES.includes(stage)) errors.push(`rollout stages must include: ${stage}`);
  }

  if (TAX_MEMO_INTEGRATION_CURRENT_STAGE !== "design_only_current_patch") {
    errors.push("current stage must be design_only_current_patch");
  }

  const runtimePolicySelfCheck = validateWorkflowRuntimeWiringPolicy();
  if (!runtimePolicySelfCheck.valid) errors.push(...runtimePolicySelfCheck.errors.map((e) => `runtime policy: ${e}`));

  const orchestratorSelfCheck = validateTaxMemoRuntimeScaffold();
  if (!orchestratorSelfCheck.valid) errors.push(...orchestratorSelfCheck.errors.map((e) => `orchestrator: ${e}`));

  const rendererSelfCheck = validateTaxMemoRuntimeRenderer();
  if (!rendererSelfCheck.valid) errors.push(...rendererSelfCheck.errors.map((e) => `renderer: ${e}`));

  const gateSelfCheck = validateWorkflowGovernanceGate();
  if (!gateSelfCheck.valid) errors.push(...gateSelfCheck.errors.map((e) => `gate: ${e}`));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    featureFlagCount: 2,
    blockedModeCount: TAX_MEMO_INTEGRATION_BLOCKED_MODES.length,
    requiredCallerFieldCount: TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS.length,
    requiredPipelineOutputFieldCount: TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS.length,
    requiredGovernanceGateCount: TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES.length,
    forbiddenRuntimeChangeCount: TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES.length,
    rolloutStageCount: TAX_MEMO_INTEGRATION_ROLLOUT_STAGES.length
  };
}
