// FILE: workflow/tax-memo-runtime-orchestrator.js
// PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1
//
// Pure, dependency-free controlled runtime scaffold for the tax_memo
// workflow mode ONLY. This module shows how a future runtime execution would
// assemble a structured tax memo draft from already-retrieved content,
// existing source cards, missing facts, assumptions, and a human-review
// notice, then pass it through the Phase 9G workflow output governance gate.
// It has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee dependency, NO filesystem access, NO process.env
// dependency, NO Date.now/randomness, and NO side effects. It calls no AI
// model, performs no retrieval, and persists nothing. It is not wired into
// ask-handler.js, pipeline.js, server.js, routes, or the frontend, and it
// never executes unless the caller explicitly supplies safe runtime options
// (see validateTaxMemoRuntimeOptions) — by default, every scaffold request is
// blocked.
//
// Design note on featureFlagEnabled: the Phase 9H policy module's
// validateWorkflowRuntimeWiringRequest() treats `featureFlagEnabled: true` as
// an error, because that field there asserts "the environment default for
// TINA_ENABLE_PROFESSIONAL_WORKFLOWS is on" — which must never be true. This
// module's own `runtimeOptions.featureFlagEnabled` is a distinct, orchestrator
// -level concept: "has the caller explicitly enabled execution for THIS
// call." The two are validated separately (see validateTaxMemoRuntimeOptions)
// and are not in conflict; workflow-runtime-wiring-policy.js is not modified.

"use strict";

import {
  createEmptyTaxMemoOutput,
  normalizeTaxMemoIssueList,
  validateTaxMemoSchema
} from "./tax-memo-schema.js";
import { validateWorkflowOutputGovernance, validateWorkflowGovernanceGate } from "./workflow-output-governance-gate.js";
import {
  normalizeRuntimeWiringModeId,
  validateWorkflowRuntimeWiringRequest,
  validateWorkflowRuntimeWiringPolicy,
  WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES
} from "./workflow-runtime-wiring-policy.js";

export const PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION = "1.0.0";

export const TAX_MEMO_RUNTIME_MODE_ID = "tax_memo";
export const TAX_MEMO_RUNTIME_SCHEMA_KEY = "taxMemoOutput";

export const TAX_MEMO_RUNTIME_REQUIRED_INPUTS = Object.freeze([
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

export const TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS = Object.freeze([
  "featureFlagEnabled",
  "userExplicitApprovalForRuntimeWiring",
  "governanceGatePassed",
  "sourceCardsPresent",
  "missingFactsPresent",
  "assumptionsPresent",
  "humanReviewNoticePresent",
  "prohibitedClaimDetectionPassed",
  "persistenceRequestedFalse",
  "memoryRequestedFalse",
  "thirdPartyEgressRequestedFalse",
  "externalSearchRequestedFalse",
  "productionEnablementRequestedFalse"
]);

export const TAX_MEMO_RUNTIME_PROHIBITED_MODES = Object.freeze([
  "bir_reply_protest_draft",
  "audit_defense_matrix",
  "client_advisory",
  "compliance_checklist",
  "requirements_request_letter"
]);

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

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function normalizeArray(value) {
  return Array.isArray(value) ? deepClone(value) : [];
}

/**
 * Returns a fresh runtime-scaffold result object. Every call returns new
 * arrays/objects; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createTaxMemoRuntimeResult() {
  return {
    valid: true,
    blocked: false,
    errors: [],
    warnings: [],
    mode: TAX_MEMO_RUNTIME_MODE_ID,
    schemaKey: TAX_MEMO_RUNTIME_SCHEMA_KEY,
    output: null,
    governance: null,
    runtimePolicy: null,
    checks: []
  };
}

/**
 * Normalizes candidate tax-memo runtime input into a defensive, fully-shaped
 * object. Never mutates the input; never throws.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeTaxMemoRuntimeInput(input) {
  const src = isPlainObject(input) ? input : {};
  return {
    facts: typeof src.facts === "string" ? src.facts.trim() : "",
    issues: normalizeTaxMemoIssueList(src.issues),
    taxpayerType: typeof src.taxpayerType === "string" ? src.taxpayerType.trim() : "",
    taxPeriod: typeof src.taxPeriod === "string" ? src.taxPeriod.trim() : "",
    intendedAudience: typeof src.intendedAudience === "string" ? src.intendedAudience.trim() : "",
    analysisNotes: normalizeArray(src.analysisNotes),
    applicableAuthorities: normalizeArray(src.applicableAuthorities),
    conclusion: typeof src.conclusion === "string" ? src.conclusion.trim() : "",
    risksLimitations: normalizeArray(src.risksLimitations),
    documentsNeeded: normalizeArray(src.documentsNeeded),
    sourceCards: normalizeArray(src.sourceCards),
    missingFacts: normalizeStringArray(src.missingFacts),
    assumptions: normalizeStringArray(src.assumptions),
    humanReviewNotice: typeof src.humanReviewNotice === "string" ? src.humanReviewNotice.trim() : ""
  };
}

/**
 * Validates candidate tax-memo runtime input. Never throws.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[], normalizedInput: object}}
 */
export function validateTaxMemoRuntimeInput(input) {
  const normalized = normalizeTaxMemoRuntimeInput(input);
  const errors = [];
  const warnings = [];

  if (normalized.facts.length === 0) errors.push("facts must be a nonblank string");
  if (normalized.issues.length === 0) errors.push("issues must be a nonempty array");
  if (normalized.taxpayerType.length === 0) errors.push("taxpayerType must be a nonblank string");
  if (normalized.taxPeriod.length === 0) errors.push("taxPeriod must be a nonblank string");
  if (normalized.intendedAudience.length === 0) errors.push("intendedAudience must be a nonblank string");
  if (normalized.sourceCards.length === 0) errors.push("sourceCards must be a nonempty array");
  if (normalized.humanReviewNotice.length === 0) errors.push("humanReviewNotice must be a nonblank string");

  if (normalized.missingFacts.length === 0) warnings.push("missingFacts is empty");
  if (normalized.assumptions.length === 0) warnings.push("assumptions is empty");
  if (normalized.applicableAuthorities.length === 0) warnings.push("applicableAuthorities is empty");
  if (normalized.documentsNeeded.length === 0) warnings.push("documentsNeeded is empty");
  if (normalized.risksLimitations.length === 0) warnings.push("risksLimitations is empty");

  return { valid: errors.length === 0, errors, warnings, normalizedInput: normalized };
}

/**
 * Validates candidate tax-memo runtime options against the Phase 9H
 * runtime-wiring policy, plus this orchestrator's own call-time
 * featureFlagEnabled check. Never throws. Default/missing options are
 * blocked.
 *
 * @param {*} runtimeOptions
 * @returns {{valid: boolean, blocked: boolean, errors: string[], warnings: string[], policyResult: object|null}}
 */
export function validateTaxMemoRuntimeOptions(runtimeOptions) {
  const opts = isPlainObject(runtimeOptions) ? runtimeOptions : {};
  const errors = [];
  const warnings = [];

  if (opts.featureFlagEnabled !== true) {
    errors.push("featureFlagEnabled must be true (explicit caller enablement required for this scaffold call)");
  }

  const policyRequest = {
    modeId: TAX_MEMO_RUNTIME_MODE_ID,
    // Always false: this orchestrator never asserts that the environment
    // default is on. Call-time enablement is validated independently above.
    featureFlagEnabled: false,
    runtimeWiringRequested: true,
    hasDedicatedSchema: true,
    governanceGatePassed: opts.governanceGatePassed,
    sourceCardsPresent: opts.sourceCardsPresent,
    missingFactsPresent: opts.missingFactsPresent,
    assumptionsPresent: opts.assumptionsPresent,
    humanReviewNoticePresent: opts.humanReviewNoticePresent,
    prohibitedClaimDetectionPassed: opts.prohibitedClaimDetectionPassed,
    persistenceRequested: opts.persistenceRequested,
    memoryRequested: opts.memoryRequested,
    thirdPartyEgressRequested: opts.thirdPartyEgressRequested,
    externalSearchRequested: opts.externalSearchRequested,
    productionEnablementRequested: opts.productionEnablementRequested,
    userExplicitApprovalForRuntimeWiring: opts.userExplicitApprovalForRuntimeWiring
  };

  const policyResult = validateWorkflowRuntimeWiringRequest(policyRequest);
  const combinedValid = errors.length === 0 && policyResult.valid === true;

  return {
    valid: combinedValid,
    blocked: !combinedValid,
    errors: [...errors, ...policyResult.errors],
    warnings: [...warnings, ...policyResult.warnings],
    policyResult
  };
}

/**
 * Builds a tax memo output draft from already-normalized (or raw, which will
 * be normalized defensively) runtime input. Uses only the provided input —
 * fabricates no authorities, performs no analysis beyond the caller-supplied
 * analysisNotes, calls no model, and performs no retrieval. Never mutates
 * input.
 *
 * @param {*} input
 * @returns {object} a taxMemoOutput-shaped draft object
 */
export function buildTaxMemoDraftFromRuntimeInput(input) {
  const normalized = normalizeTaxMemoRuntimeInput(input);
  const output = createEmptyTaxMemoOutput();

  output.factsProvided = normalized.facts.length > 0 ? [normalized.facts] : [];
  output.issues = [...normalized.issues];
  output.applicableAuthorities = deepClone(normalized.applicableAuthorities);
  output.analysis = deepClone(normalized.analysisNotes);
  output.conclusion = normalized.conclusion;
  output.risksLimitations = deepClone(normalized.risksLimitations);
  output.assumptions = [...normalized.assumptions];
  output.missingFacts = [...normalized.missingFacts];
  output.documentsNeeded = deepClone(normalized.documentsNeeded);
  output.sourceCards = deepClone(normalized.sourceCards);
  output.humanReviewNotice = normalized.humanReviewNotice;

  // Descriptive, non-schema-required marker distinguishing this draft as a
  // scaffold artifact. metadata.runtimeWiring remains the strict boolean
  // false required by the governance gate.
  output.metadata.runtimeExecutionContext = "scaffold_only";

  return output;
}

/**
 * Runs the Phase 9G workflow output governance gate against a tax-memo
 * output draft. Pure delegation — no additional I/O.
 *
 * @param {*} output
 * @param {object} [options]
 * @returns {object} the governance gate result
 */
export function runTaxMemoRuntimeGovernance(output, options = {}) {
  return validateWorkflowOutputGovernance(output, { modeId: TAX_MEMO_RUNTIME_MODE_ID, ...options });
}

/**
 * Runs the full controlled tax-memo runtime scaffold: validates the
 * requested mode, validates runtime options against policy, validates
 * input, builds a draft output from provided input only, and runs the
 * governance gate. Never throws on malformed input. Blocked by default.
 *
 * @param {*} request
 * @returns {object} createTaxMemoRuntimeResult()-shaped result
 */
export function runTaxMemoRuntimeScaffold(request) {
  const result = createTaxMemoRuntimeResult();

  if (!isPlainObject(request)) {
    result.valid = false;
    result.blocked = true;
    result.errors.push("request must be a plain object");
    return result;
  }

  const modeId = normalizeRuntimeWiringModeId(request.modeId);
  result.checks.push("mode_normalized");

  if (modeId !== TAX_MEMO_RUNTIME_MODE_ID) {
    result.valid = false;
    result.blocked = true;
    if (modeId && TAX_MEMO_RUNTIME_PROHIBITED_MODES.includes(modeId)) {
      result.errors.push(`mode is blocked for the tax_memo runtime scaffold: ${modeId}`);
    } else {
      result.errors.push(`unsupported mode for the tax_memo runtime scaffold: ${JSON.stringify(request.modeId)}`);
    }
    return result;
  }
  result.checks.push("mode_is_tax_memo");

  const optionsResult = validateTaxMemoRuntimeOptions(request.runtimeOptions);
  result.runtimePolicy = optionsResult.policyResult;
  result.checks.push("runtime_options_validated");
  if (!optionsResult.valid) {
    result.valid = false;
    result.blocked = true;
    result.errors.push(...optionsResult.errors.map((e) => `runtimeOptions: ${e}`));
    result.warnings.push(...optionsResult.warnings.map((w) => `runtimeOptions: ${w}`));
    return result;
  }

  const inputResult = validateTaxMemoRuntimeInput(request.input);
  result.checks.push("input_validated");
  result.warnings.push(...inputResult.warnings.map((w) => `input: ${w}`));
  if (!inputResult.valid) {
    result.valid = false;
    result.blocked = true;
    result.errors.push(...inputResult.errors.map((e) => `input: ${e}`));
    return result;
  }

  const output = buildTaxMemoDraftFromRuntimeInput(inputResult.normalizedInput);
  result.output = output;
  result.checks.push("output_built");

  const governanceResult = runTaxMemoRuntimeGovernance(output);
  result.governance = governanceResult;
  result.checks.push("governance_run");
  result.warnings.push(...governanceResult.warnings.map((w) => `governance: ${w}`));
  if (!governanceResult.valid) {
    result.valid = false;
    result.blocked = true;
    result.errors.push(...governanceResult.errors.map((e) => `governance: ${e}`));
    return result;
  }

  result.valid = true;
  result.blocked = false;
  return result;
}

function buildSelfCheckRuntimeOptions() {
  return {
    featureFlagEnabled: true,
    userExplicitApprovalForRuntimeWiring: true,
    governanceGatePassed: true,
    sourceCardsPresent: true,
    missingFactsPresent: true,
    assumptionsPresent: true,
    humanReviewNoticePresent: true,
    prohibitedClaimDetectionPassed: true,
    persistenceRequested: false,
    memoryRequested: false,
    thirdPartyEgressRequested: false,
    externalSearchRequested: false,
    productionEnablementRequested: false
  };
}

function buildSelfCheckInput() {
  return {
    facts: "Self-check facts for the tax memo runtime scaffold validator.",
    issues: ["Self-check issue"],
    taxpayerType: "corporation",
    taxPeriod: "self-check period",
    intendedAudience: "internal review",
    sourceCards: [{ sourceCardId: "self-check-1", title: "Self-check source" }],
    missingFacts: ["self-check missing fact"],
    assumptions: ["self-check assumption"],
    humanReviewNotice: "This is a self-check draft for internal validation only, not for professional use."
  };
}

/**
 * Validates the tax-memo runtime scaffold module itself: constant shapes,
 * cross-module policy/gate/schema self-checks, that default execution is
 * blocked, that a safe explicitly-approved request passes, and that every
 * prohibited mode is blocked. Never throws.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], requiredInputCount: number, requiredRuntimeFlagCount: number, prohibitedModeCount: number}}
 */
export function validateTaxMemoRuntimeScaffold() {
  const errors = [];
  const warnings = [];

  if (TAX_MEMO_RUNTIME_MODE_ID !== "tax_memo") errors.push("mode must be tax_memo");
  if (TAX_MEMO_RUNTIME_SCHEMA_KEY !== "taxMemoOutput") errors.push("schemaKey must be taxMemoOutput");

  for (const input of ["facts", "issues", "taxpayerType", "taxPeriod", "intendedAudience", "sourceCards", "missingFacts", "assumptions", "humanReviewNotice"]) {
    if (!TAX_MEMO_RUNTIME_REQUIRED_INPUTS.includes(input)) errors.push(`required inputs must include: ${input}`);
  }

  for (const flag of ["featureFlagEnabled", "userExplicitApprovalForRuntimeWiring", "governanceGatePassed", "sourceCardsPresent", "missingFactsPresent", "assumptionsPresent", "humanReviewNoticePresent", "prohibitedClaimDetectionPassed"]) {
    if (!TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS.includes(flag)) errors.push(`required runtime flags must include: ${flag}`);
  }

  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    if (!TAX_MEMO_RUNTIME_PROHIBITED_MODES.includes(modeId)) errors.push(`prohibited modes must include: ${modeId}`);
    if (!WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES.includes(modeId)) warnings.push(`Phase 9H policy blocked modes may not include: ${modeId}`);
  }

  const policySelfCheck = validateWorkflowRuntimeWiringPolicy();
  if (!policySelfCheck.valid) errors.push(...policySelfCheck.errors.map((e) => `policy: ${e}`));

  const gateSelfCheck = validateWorkflowGovernanceGate();
  if (!gateSelfCheck.valid) errors.push(...gateSelfCheck.errors.map((e) => `gate: ${e}`));

  const schemaSelfCheck = validateTaxMemoSchema();
  if (!schemaSelfCheck.valid) errors.push(...schemaSelfCheck.errors.map((e) => `schema: ${e}`));

  const defaultResult = runTaxMemoRuntimeScaffold({ modeId: "tax_memo" });
  if (defaultResult.valid !== false || defaultResult.blocked !== true) {
    errors.push("default execution must be blocked");
  }

  const safeResult = runTaxMemoRuntimeScaffold({
    modeId: "tax_memo",
    runtimeOptions: buildSelfCheckRuntimeOptions(),
    input: buildSelfCheckInput()
  });
  if (safeResult.valid !== true) {
    errors.push(`safe explicitly approved scaffold request must pass: ${JSON.stringify(safeResult.errors)}`);
  }

  for (const modeId of TAX_MEMO_RUNTIME_PROHIBITED_MODES) {
    const blockedResult = runTaxMemoRuntimeScaffold({
      modeId,
      runtimeOptions: buildSelfCheckRuntimeOptions(),
      input: buildSelfCheckInput()
    });
    if (blockedResult.valid !== false) errors.push(`mode ${modeId} must be blocked`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredInputCount: TAX_MEMO_RUNTIME_REQUIRED_INPUTS.length,
    requiredRuntimeFlagCount: TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS.length,
    prohibitedModeCount: TAX_MEMO_RUNTIME_PROHIBITED_MODES.length
  };
}
