// FILE: adversarial-content-safety-policy.js
"use strict";

/**
 * PATCH-07B-013R centralized adversarial content-safety and risk-language policy.
 *
 * Boundary:
 * - Provides deterministic sanitization, prohibited-conclusion construction, and
 *   safety inspection for future adversarial framing helpers.
 * - Does not generate BIR/taxpayer positions, audit-risk scores, settlement or
 *   protest strategy, hierarchy/conflict resolution, supersession, effective-date
 *   conclusions, source acquisition, prompt wiring, or route integration.
 */

export const ADVERSARIAL_CONTENT_SAFETY_POLICY_VERSION = "07B-013R.1";
export const ADVERSARIAL_CONTENT_SAFETY_IMPLEMENTATION_SCOPE = "ADVERSARIAL_CONTENT_SAFETY_POLICY_ONLY";

const MODES = new Set(["/ask", "/tax", "/audit"]);
const AUTHORITY_STATES = new Set(["AUTHORITY_FOUND", "RELATED_AUTHORITY_ONLY", "NO_INDEXED_SOURCE", "GENERAL_TAX"]);
const PHASE10_FLAGS = new Set([
  "EFFECTIVE_DATE_REVIEW_NEEDED",
  "SUPERSESSION_OR_AMENDMENT_REVIEW_NEEDED",
  "HIERARCHY_CONFLICT_REVIEW_NEEDED",
  "SOURCE_CURRENTNESS_REVIEW_NEEDED",
  "RULING_OR_CASE_STATUS_REVIEW_NEEDED",
  "OFFICIAL_SOURCE_METADATA_REVIEW_NEEDED"
]);

const BASE_PROHIBITED_FIELDS = Object.freeze([
  "riskScore",
  "riskLevel",
  "settlementRecommendation",
  "protestStrategy",
  "legalConclusion",
  "authorityConflictResolution",
  "supersessionConclusion",
  "effectiveDateConclusion",
  "finalTaxOpinion",
  "controllingAuthorityConclusion",
  "ctaStrategy",
  "auditDefenseConclusion",
  "guaranteedOutcome",
  "winProbability",
  "exposureComputation",
  "compromiseAmount",
  "finalAssessmentConclusion",
  "litigationStrategy"
]);

const BASE_PROHIBITED_PATTERNS = Object.freeze([
  { label: "will win", pattern: /\bwill\s+win\b/i },
  { label: "guaranteed", pattern: /\bguaranteed\b/i },
  { label: "percentage chance", pattern: /\b\d+(?:\.\d+)?\s*%\s*(?:chance|probability|odds|likelihood)?\b/i },
  { label: "risk score", pattern: /\brisk\s+score\b/i },
  { label: "risk level", pattern: /\brisk\s+level\b/i },
  { label: "settle now", pattern: /\bsettle\s+now\b/i },
  { label: "ignore BIR", pattern: /\bignore\s+BIR\b/i },
  { label: "this supersedes", pattern: /\bthis\s+supersedes\b/i },
  { label: "currently effective", pattern: /\bcurrently\s+effective\b/i },
  { label: "final legal conclusion", pattern: /\bfinal\s+legal\s+conclusion\b/i },
  { label: "final tax opinion", pattern: /\bfinal\s+tax\s+opinion\b/i },
  { label: "BIR has no case", pattern: /\bBIR\s+has\s+no\s+case\b/i },
  { label: "taxpayer will win", pattern: /\btaxpayer\s+will\s+win\b/i },
  { label: "BIR will win", pattern: /\bBIR\s+will\s+win\b/i },
  { label: "assessment is void", pattern: /\bassessment\s+is\s+void\b/i },
  { label: "controlling authority", pattern: /\bcontrolling\s+authority\b/i, conditional: "controllingAuthority" },
  { label: "binding on the BIR", pattern: /\bbinding\s+on\s+the\s+BIR\b/i, conditional: "bindingBir" },
  { label: "low risk conclusion", pattern: /\b(?:no|low)\s+risk\b/i },
  { label: "exact exposure", pattern: /\bexact\s+exposure\b|\bexposure\s+(?:is|=)\s*\d/i },
  { label: "compromise amount", pattern: /\bcompromise\s+amount\b/i },
  { label: "CTA strategy", pattern: /\bCTA\s+strategy\b/i }
]);

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function normalizeMode(mode) {
  return MODES.has(mode) ? mode : "/ask";
}

function normalizeAuthorityState(input = {}) {
  const sourceState = safeString(input.sourceAvailabilityState);
  const authorityState = safeString(input.authorityState);
  if (AUTHORITY_STATES.has(sourceState)) return sourceState;
  if (AUTHORITY_STATES.has(authorityState)) return authorityState;
  return "GENERAL_TAX";
}

function hasPhase10Flags(input = {}) {
  return safeArray(input.phase10DependencyFlags).some((flag) => PHASE10_FLAGS.has(flag));
}

function addIfMissing(target, value) {
  if (!target.includes(value)) target.push(value);
}

function materialDocumentsMissing(input = {}) {
  if (input.documentsComplete === true || input.requiredDocumentsSatisfied === true) return false;
  return safeArray(input.missingDocuments).length > 0 || safeArray(input.requiredDocuments).length > 0;
}

function materialFactsMissing(input = {}) {
  return safeArray(input.missingCriticalFacts || input.missingUserFacts).length > 0 || materialDocumentsMissing(input);
}

function phase10PolicyText(input = {}) {
  const flags = safeArray(input.phase10DependencyFlags).filter((flag) => PHASE10_FLAGS.has(flag));
  if (flags.length === 0) {
    return "Phase 10 dependency checks are not resolved by this helper; if later flagged, they remain flags only.";
  }
  return `Phase 10 dependency flags are flags only and cannot be resolved here: ${flags.join(", ")}.`;
}

function postureFor(input = {}) {
  const authorityState = normalizeAuthorityState(input);
  if (authorityState === "NO_INDEXED_SOURCE") return "NO_INDEXED_SOURCE_NO_ADVERSARIAL_FRAMING";
  if (authorityState === "GENERAL_TAX") return "GENERAL_ORIENTATION_ONLY_NO_ADVERSARIAL_FRAMING";
  if (authorityState === "RELATED_AUTHORITY_ONLY") return "RELATED_AUTHORITY_ONLY_LIMITED_ADVERSARIAL_FRAMING";
  if (hasPhase10Flags(input)) return "PHASE10_REVIEW_REQUIRED_BEFORE_ADVERSARIAL_FRAMING";
  if (materialFactsMissing(input)) return "FACTS_OR_DOCUMENTS_INSUFFICIENT_FOR_ADVERSARIAL_FRAMING";
  if (/\bsettlement|protest|CTA strategy|compromise\b/i.test(safeString(input.requestedOutput))) return "SETTLEMENT_PROTEST_DEFERRED";
  if (/\brisk|score|probability|odds|chance\b/i.test(safeString(input.requestedOutput))) return "RISK_LANGUAGE_POLICY_ONLY";
  return "ADVERSARIAL_FRAMING_ALLOWED_WITH_CAUTION";
}

export function getAdversarialProhibitedFields(input = {}) {
  const authorityState = normalizeAuthorityState(input);
  const fields = [...BASE_PROHIBITED_FIELDS];
  if (authorityState === "NO_INDEXED_SOURCE" || authorityState === "GENERAL_TAX") {
    fields.push("birPositionFraming", "taxpayerPositionFraming");
  }
  return unique(fields);
}

export function getAdversarialProhibitedPatterns() {
  return BASE_PROHIBITED_PATTERNS.map(({ label }) => label);
}

export function sanitizeAdversarialText(text = "") {
  let result = safeString(text);
  if (!result) return "";

  const replacements = [
    [/\bBIR\s+will\s+win\b/gi, "BIR-side argument cannot be stated as a guaranteed outcome"],
    [/\btaxpayer\s+will\s+win\b/gi, "taxpayer-side argument cannot be stated as a guaranteed outcome"],
    [/\b(?:the\s+)?(?:BIR|taxpayer)\s+is\s+guaranteed\s+to\s+win\b/gi, "outcome cannot be guaranteed"],
    [/\bwill\s+win\b/gi, "cannot be stated as a guaranteed outcome"],
    [/\bguaranteed\b/gi, "not assured"],
    [/\brisk\s+score\s*(?:is|=|:)?\s*\d+(?:\.\d+)?\s*%?\b/gi, "numeric risk scoring is not available in this helper"],
    [/\b\d+(?:\.\d+)?\s*%\s*(?:chance|probability|odds|likelihood)?\b/gi, "numeric win probability is not available in this helper"],
    [/\bwin\s+probability\s*(?:is|=|:)?\s*\d+(?:\.\d+)?\s*%?\b/gi, "win probability is not available in this helper"],
    [/\bexact\s+exposure\s+(?:is|=|:)?\s*[\d,]+(?:\.\d+)?\b/gi, "exact exposure computation is outside this helper"],
    [/\bsettle\s+now\b/gi, "settlement recommendation is outside this helper"],
    [/\bignore\s+BIR\b/gi, "ignoring BIR is outside this helper and unsafe"],
    [/\bfile\s+(?:a\s+)?(?:CTA\s+)?(?:case|petition)\s+now\b/gi, "CTA strategy is outside this helper"],
    [/\bthis\s+supersedes\b/gi, "supersession requires Phase 10 review"],
    [/\bcurrently\s+effective\b/gi, "currentness requires source metadata review"],
    [/\bfinal\s+legal\s+conclusion\b/gi, "non-final issue framing only"],
    [/\bfinal\s+tax\s+opinion\b/gi, "non-final tax framing only"],
    [/\bassessment\s+is\s+void\b/gi, "assessment validity requires procedural facts and authority review"],
    [/\bBIR\s+has\s+no\s+case\b/gi, "BIR-side weakness cannot be stated as a guaranteed outcome"],
    [/\bcontrolling\s+authority\b/gi, "authority support must be verified before any controlling-support label"],
    [/\bbinding\s+on\s+the\s+BIR\b/gi, "binding effect must be verified and limited by authority status"]
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function sanitizeAdversarialObject(output) {
  if (typeof output === "string") return sanitizeAdversarialText(output);
  if (Array.isArray(output)) return output.map((item) => sanitizeAdversarialObject(item));
  if (output && typeof output === "object") {
    return Object.fromEntries(Object.entries(output).map(([key, value]) => [key, sanitizeAdversarialObject(value)]));
  }
  return output;
}

export function buildAdversarialProhibitedConclusions(input = {}) {
  const mode = normalizeMode(input.mode);
  const authorityState = normalizeAuthorityState(input);
  const prohibited = [
    "Do not provide a final legal conclusion.",
    "Do not guarantee BIR outcome.",
    "Do not guarantee taxpayer outcome.",
    "Do not hide weak facts, weak documents, or adverse authority.",
    "Do not fabricate authority.",
    "Do not provide numeric or percentage risk score.",
    "Do not provide exact exposure computation.",
    "Do not provide settlement recommendation.",
    "Do not provide protest strategy.",
    "Do not provide CTA strategy.",
    "Do not resolve authority conflict.",
    "Do not resolve authority hierarchy.",
    "Do not resolve supersession, effective-date, currentness, ruling status, or case finality.",
    "Do not claim live source acquisition, ingestion, or official-source verification occurred.",
    "Do not treat missing facts as known facts."
  ];

  if (authorityState === "NO_INDEXED_SOURCE") {
    prohibited.push("Do not provide BIR position framing under NO_INDEXED_SOURCE.");
    prohibited.push("Do not provide taxpayer position framing under NO_INDEXED_SOURCE.");
    prohibited.push("Do not claim direct authority support under NO_INDEXED_SOURCE.");
    prohibited.push("Do not form legal position from unavailable indexed sources.");
  }

  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    prohibited.push("Do not treat related authority as controlling.");
    prohibited.push("Do not present illustrative framing as legal conclusion.");
  }

  if (authorityState === "GENERAL_TAX") {
    prohibited.push("Do not claim exact authority for general orientation.");
    prohibited.push("Do not provide specific BIR/taxpayer legal position from GENERAL_TAX.");
  }

  if (authorityState === "AUTHORITY_FOUND") {
    prohibited.push("Do not let AUTHORITY_FOUND override missing facts, weak documents, or applicability gaps.");
  }

  if (mode === "/audit") {
    prohibited.push("Do not provide risk level.");
    prohibited.push("Do not provide settlement advice.");
    prohibited.push("Do not provide protest strategy.");
    prohibited.push("Do not provide CTA strategy.");
    prohibited.push("Do not say BIR has no case.");
    prohibited.push("Do not say taxpayer will win.");
    prohibited.push("Do not say assessment is void without required procedural facts and authority review.");
  }

  if (hasPhase10Flags(input)) {
    prohibited.push("Do not resolve Phase 10 dependency flags as currentness, hierarchy, supersession, effective-date, ruling-status, case-status, or source-metadata conclusions.");
  }

  return unique(prohibited);
}

function requiredCautionsFor(input = {}) {
  const authorityState = normalizeAuthorityState(input);
  const cautions = [];
  if (safeArray(input.strongestSupport || input.strongestTaxpayerSupport).length > 0 && safeArray(input.weakestFactsOrDocuments || input.weakestTaxpayerFactsOrDocuments).length === 0) {
    cautions.push("Strongest support cannot be presented without surfacing weaknesses.");
  }
  if (materialFactsMissing(input)) {
    cautions.push("Missing facts, required documents, and weak documents must remain visible before adversarial framing.");
  }
  if (safeArray(input.sourceCoverageNeeds || input.authorityOrSourceCoverageNeeds).length > 0) {
    cautions.push("Source coverage needs remain separate from user fact gaps.");
  }
  if (authorityState === "NO_INDEXED_SOURCE") {
    cautions.push("NO_INDEXED_SOURCE blocks BIR/taxpayer adversarial framing.");
  }
  if (authorityState === "RELATED_AUTHORITY_ONLY") {
    cautions.push("Related authority may support only limited illustrative framing and cannot become controlling.");
  }
  if (authorityState === "GENERAL_TAX") {
    cautions.push("GENERAL_TAX supports general orientation only.");
  }
  if (hasPhase10Flags(input)) {
    cautions.push("Phase 10 dependency flags remain flags only and require later metadata/currentness/hierarchy review.");
  }
  return unique(cautions);
}

export function applyAdversarialContentSafetyPolicy(input = {}) {
  const authorityState = normalizeAuthorityState(input);
  const safetyPosture = postureFor(input);
  const canGenerateBirTaxpayerFraming = (
    authorityState === "AUTHORITY_FOUND" &&
    !materialFactsMissing(input) &&
    !hasPhase10Flags(input)
  ) || authorityState === "RELATED_AUTHORITY_ONLY";

  return {
    safetyPosture,
    requiredCautions: requiredCautionsFor(input),
    prohibitedConclusions: buildAdversarialProhibitedConclusions(input),
    prohibitedFields: getAdversarialProhibitedFields(input),
    prohibitedPatterns: getAdversarialProhibitedPatterns(),
    sanitizedOutput: Object.hasOwn(input, "proposedOutput") ? sanitizeAdversarialObject(input.proposedOutput) : null,
    hiddenWeaknessPolicy: "Strongest support cannot be presented without weaknesses; BIR-side and taxpayer-side framing must surface associated weaknesses.",
    guaranteedOutcomePolicy: "Guaranteed BIR, taxpayer, settlement, protest, CTA, cancellation, allowance, or assessment outcomes are prohibited.",
    numericRiskPolicy: "Numeric risk scores, win probabilities, exact exposure computations, and compromise amounts are prohibited.",
    settlementProtestPolicy: "Settlement recommendations, protest strategy, CTA strategy, and letter drafting are outside this helper.",
    phase10DependencyPolicy: phase10PolicyText(input),
    canGenerateBirTaxpayerFraming,
    canScoreRisk: false,
    canRecommendSettlement: false,
    canReachFinalConclusion: false,
    implementationScope: ADVERSARIAL_CONTENT_SAFETY_IMPLEMENTATION_SCOPE
  };
}

function collectStrings(value, path = "$") {
  if (typeof value === "string") return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectStrings(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectStrings(child, `${path}.${key}`));
  }
  return [];
}

function collectFields(value, path = "$") {
  if (Array.isArray(value)) return value.flatMap((item, index) => collectFields(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [
      { path: `${path}.${key}`, field: key, value: child },
      ...collectFields(child, `${path}.${key}`)
    ]);
  }
  return [];
}

function weaknessListFor(value, fieldNames) {
  for (const name of fieldNames) {
    const item = value?.[name];
    if (Array.isArray(item) && item.length > 0) return item;
    if (safeString(item)) return [safeString(item)];
  }
  return [];
}

function hiddenWeaknessViolations(value, path = "$") {
  const violations = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => violations.push(...hiddenWeaknessViolations(item, `${path}[${index}]`)));
    return violations;
  }
  if (!value || typeof value !== "object") return violations;

  const strongest = weaknessListFor(value, ["strongestSupport", "strongestTaxpayerSupport"]);
  const weakest = weaknessListFor(value, ["weakestFactsOrDocuments", "weakestTaxpayerFactsOrDocuments", "weaknesses", "weaknessesInPosition"]);
  if (strongest.length > 0 && weakest.length === 0) {
    violations.push(`${path}: strongest support is present without weakest facts/documents`);
  }

  if (Object.hasOwn(value, "birPositionFraming")) {
    const weaknesses = weaknessListFor(value, ["weaknessesInBirPosition", "birPositionWeaknesses", "weaknessesInPosition"]);
    if (weaknesses.length === 0) violations.push(`${path}.birPositionFraming: missing weaknessesInBirPosition`);
  }

  if (Object.hasOwn(value, "taxpayerPositionFraming")) {
    const weaknesses = weaknessListFor(value, ["weaknessesInTaxpayerPosition", "taxpayerPositionWeaknesses", "weaknessesInPosition"]);
    if (weaknesses.length === 0) violations.push(`${path}.taxpayerPositionFraming: missing weaknessesInTaxpayerPosition`);
  }

  for (const [key, child] of Object.entries(value)) {
    violations.push(...hiddenWeaknessViolations(child, `${path}.${key}`));
  }
  return violations;
}

function phase10ResolutionViolations(strings, input = {}) {
  if (!hasPhase10Flags(input)) return [];
  return strings
    .filter(({ value }) => /\b(?:currently effective|this supersedes|hierarchy is resolved|controlling hierarchy|effective date is|official source metadata confirms|ruling remains valid|case is final)\b/i.test(value))
    .map(({ path, value }) => `${path}: Phase 10 flag resolved as conclusion (${value})`);
}

export function assertAdversarialSafety(output, options = {}) {
  const prohibitedFields = getAdversarialProhibitedFields(options);
  const fields = collectFields(output);
  const strings = collectStrings(output);
  const prohibitedFieldsFound = fields
    .filter(({ field }) => prohibitedFields.includes(field))
    .map(({ path }) => path);
  const prohibitedPatternsFound = [];

  for (const { path, value } of strings) {
    if (/^\s*Do not\b/i.test(value)) continue;
    for (const { label, pattern, conditional } of BASE_PROHIBITED_PATTERNS) {
      if (!pattern.test(value)) continue;
      if (conditional === "controllingAuthority" && options.allowControllingAuthority === true) continue;
      if (conditional === "bindingBir" && options.allowBindingBir === true) continue;
      prohibitedPatternsFound.push(`${path}: ${label}`);
    }
  }

  const hiddenWeaknessFound = hiddenWeaknessViolations(output);
  const phase10Found = phase10ResolutionViolations(strings, options);
  const violations = unique([
    ...prohibitedFieldsFound.map((field) => `Prohibited field found: ${field}`),
    ...prohibitedPatternsFound.map((pattern) => `Prohibited pattern found: ${pattern}`),
    ...hiddenWeaknessFound,
    ...phase10Found
  ]);
  const result = {
    safe: violations.length === 0,
    violations,
    prohibitedFieldsFound,
    prohibitedPatternsFound,
    implementationScope: ADVERSARIAL_CONTENT_SAFETY_IMPLEMENTATION_SCOPE
  };

  if (!result.safe && options.throwOnViolation === true) {
    throw new Error(`Adversarial safety violation: ${violations.join("; ")}`);
  }
  return result;
}

export default {
  applyAdversarialContentSafetyPolicy,
  sanitizeAdversarialText,
  buildAdversarialProhibitedConclusions,
  assertAdversarialSafety,
  getAdversarialProhibitedFields,
  getAdversarialProhibitedPatterns,
  sanitizeAdversarialObject
};
