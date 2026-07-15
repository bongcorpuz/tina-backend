// FILE: services/trust-contract.js
// PHASE-10A1-CANONICAL-TRUST-CONTRACT-AND-API-FORWARDING-REMEDIATION-1
// Corrected by PHASE-10A1-R1-CONFLICT-TRUST-CONTRACT-CORRECTION-1
//
// Pure, deterministic helper that derives one canonical, categorical,
// frontend-facing trust object from an already-computed pipeline/response
// result. It does not call retrieval, does not call a model, does not
// perform side effects, does not mutate its input, and does not decide
// anything new about authority, conflict, or legal safety -- it only
// summarizes existing, already-trusted runtime signals (sourceStatus/
// saeStatus, conflict/conflictAnalysis, controlledLoaAnswer, responseType,
// domainBoundary) into one stable shape. Every derived value maps to
// existing authoritative evidence; UNKNOWN/NOT_APPLICABLE is used whenever
// the runtime cannot prove a stronger categorical state. No numeric
// confidence is introduced.
//
// PHASE-10A1-R1 correction: trust.hasConflict previously forwarded the raw
// ctx.conflictAnalysis.hasConflict boolean directly, which could be true even
// when the renderer/compliance path's own completeness standard
// (conflictMetadataIsComplete in answer-renderer.js) would never disclose
// that conflict in the rendered answer -- a public contract/answer
// contradiction (independent-review P1). trust.hasConflict is now strictly
// true only when conflictClassification.classifyConflictState() (which
// reuses answer-renderer.js's own conflictMetadataIsComplete(), not a
// reimplementation) determines the conflict is verified/displayable.
// trust.conflictState is a new, additive categorical field distinguishing
// VERIFIED_CONFLICT / POTENTIAL_CONFLICT / NO_CONFLICT / UNKNOWN /
// NOT_APPLICABLE, so incomplete upstream conflict evidence is never silently
// discarded, only never overstated as verified.

import { classifyConflictState, CONFLICT_STATE_VALUES } from "./conflict-trust-classifier.js";

export const TRUST_CONTRACT_VERSION = "1.0";

export { CONFLICT_STATE_VALUES };

export const AUTHORITY_SUPPORT_VALUES = Object.freeze([
  "VERIFIED_CONTROLLING",
  "VERIFIED_SUPPORTING",
  "RELATED_AUTHORITY_ONLY",
  "NO_VERIFIED_AUTHORITY",
  "CONFLICTING_AUTHORITY",
  "NOT_APPLICABLE",
  "UNKNOWN"
]);

export const SOURCE_STATE_VALUES = Object.freeze([
  "AUTHORITY_FOUND",
  "RELATED_AUTHORITY_ONLY",
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "NO_INDEXED_SOURCE",
  "NOT_APPLICABLE",
  "UNKNOWN"
]);

export const LEGAL_CONCLUSION_VALUES = Object.freeze(["ALLOWED", "RESTRICTED", "NOT_APPLICABLE", "UNKNOWN"]);

export const RESPONSE_KIND_VALUES = Object.freeze([
  "CONTROLLED_PROCEDURAL",
  "RESTRICTED_LEGAL_CONCLUSION",
  "GENERAL_TAX",
  "DOMAIN_BOUNDARY",
  "FALLBACK",
  "UNKNOWN"
]);

const UNSAFE_SOURCE_STATES = new Set([
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "NO_INDEXED_SOURCE",
  "PIPELINE_ERROR"
]);

function safeBool(value) {
  return value === true;
}

function deriveResponseKind(result) {
  if (result.responseType === "controlled_loa_answer") return "CONTROLLED_PROCEDURAL";
  if (result.responseType === "controlled_loa_legal_conclusion_restricted") return "RESTRICTED_LEGAL_CONCLUSION";
  if (safeBool(result.domainBoundary)) return "DOMAIN_BOUNDARY";
  if (safeBool(result.internalError) || safeBool(result.retrievalTimedOut)) return "FALLBACK";
  const rawSourceState = normalizeRawSourceState(result);
  if (rawSourceState === "UNKNOWN") return "UNKNOWN";
  if (UNSAFE_SOURCE_STATES.has(rawSourceState)) return "FALLBACK";
  return "GENERAL_TAX";
}

function normalizeRawSourceState(result) {
  const raw = String(result.sourceStatus || result.sourceAvailability || result.saeStatus || "").toUpperCase();
  return SOURCE_STATE_VALUES.includes(raw) ? raw : "UNKNOWN";
}

function deriveSourceState(result, responseKind) {
  if (responseKind === "DOMAIN_BOUNDARY") return "NOT_APPLICABLE";
  if (responseKind === "CONTROLLED_PROCEDURAL" || responseKind === "RESTRICTED_LEGAL_CONCLUSION") {
    // These paths are deterministic and do not depend on general RAG
    // authority state; leftover ctx.saeStatus values from earlier pipeline
    // steps are not meaningful here and must not be surfaced as if they were.
    return "NOT_APPLICABLE";
  }
  return normalizeRawSourceState(result);
}

// PHASE-10A4C-TRUST-CALIBRATION-CONFLICT-STATE-ACCESSIBILITY-KEYBOARD-AND-DETERMINISTIC-FIXTURE-REMEDIATION-1
//
// Root cause of the Case C trust-calibration finding: AUTHORITY_FOUND +
// displayedCount > 0 was unconditionally mapped to VERIFIED_CONTROLLING, with
// no distinction between "the specific document/issuance the user asked
// about was verified" and "some governing authority (possibly only general)
// was retrieved and displayed." When the answer's own generated prose
// explicitly states that no specific requested issuance/ruling/regulation/
// circular exists, VERIFIED_CONTROLLING overstates what was actually
// verified for THIS question, even though the general authorities cited are
// themselves genuinely verified. This detector generalizes the pattern (not
// tied to any single test query) and, when it fires, maps the state to the
// existing RELATED_AUTHORITY_ONLY canonical state -- which already
// accurately describes "sources shown are relevant but may not directly
// control this issue" -- rather than inventing a new trust state.
const SPECIFIC_AUTHORITY_DISCLAIMER_RE =
  /\bno\s+specific\b[^.\n]{0,140}?\b(issuance|ruling|regulation|circular|memorandum|revenue\s+regulation|revenue\s+memorandum|bir\s+issuance)\b|\b(issuance|ruling|regulation|circular)\b[^.\n]{0,60}?\bdoes\s+not\s+(exist|appear\s+to\s+exist)\b/i;

/**
 * Detects whether the model's own generated answer text disclaims the
 * existence of a specific requested issuance/ruling/regulation/circular,
 * even though general authority was cited. Pure string match -- no I/O.
 *
 * @param {unknown} answerText
 * @returns {boolean}
 */
export function answerDisclaimsSpecificAuthority(answerText) {
  return typeof answerText === "string" && SPECIFIC_AUTHORITY_DISCLAIMER_RE.test(answerText);
}

// PHASE-10A6-R1-SOURCE-PRESENCE-OVERCLAIM-REMEDIATION-1
//
// Structural marker for a "bare source-listing" response: the SOURCE-mode
// deterministic renderer in answer-renderer.js discards the model's analytical
// answer and emits a canned "Indexed sources found:" list of retrieved sources
// (see answer-renderer.js: `appendDisclosureBeforeSources("Indexed sources
// found:", ...)`). This canned prefix is app-generated and deterministic (not
// model prose), so keying off it is a structured signal with near-zero false
// positives -- a genuine analytical VERIFIED_CONTROLLING answer never contains
// it. A source LISTING is not proposition-level support: it does not establish
// that the listed authorities control the precise issue, support the answer, or
// resolve any conflict, and it cannot disclose that a specifically requested
// issuance was missing. Confirmed root cause of the PHASE-10A6 Q9 P1 overclaim:
// a bare "Indexed sources found:" response was classified VERIFIED_CONTROLLING.
const BARE_SOURCE_LISTING_RE = /(^|\n)\s*indexed sources found\s*:/i;

/**
 * Detects whether the answer is a bare source-listing (SOURCE-mode deterministic
 * output) rather than a proposition-level analytical answer. Pure string match.
 *
 * @param {unknown} answerText
 * @returns {boolean}
 */
export function answerIsBareSourceListing(answerText) {
  return typeof answerText === "string" && BARE_SOURCE_LISTING_RE.test(answerText);
}

function deriveAuthoritySupport(result, sourceState, responseKind, hasConflict) {
  if (responseKind === "DOMAIN_BOUNDARY" || responseKind === "CONTROLLED_PROCEDURAL" || responseKind === "RESTRICTED_LEGAL_CONCLUSION") {
    return "NOT_APPLICABLE";
  }
  if (hasConflict) return "CONFLICTING_AUTHORITY";
  if (sourceState === "UNKNOWN") return "UNKNOWN";
  if (UNSAFE_SOURCE_STATES.has(sourceState)) return "NO_VERIFIED_AUTHORITY";
  if (sourceState === "RELATED_AUTHORITY_ONLY") return "RELATED_AUTHORITY_ONLY";
  if (sourceState === "AUTHORITY_FOUND") {
    const displayedCount = Number(result.displayedSourceCount ?? 0);
    // Invariant 1: VERIFIED_CONTROLLING requires displayed source cards.
    // AUTHORITY_FOUND is itself only reachable when governing-authority
    // source cards survived every filter (see pipeline.js's
    // computeSourceAvailability/classifySourceAvailability invariant:
    // "AUTHORITY_FOUND requires displayedCount > 0" and its eligibility
    // filter requires authorityRole === "GOVERNING"). There is currently no
    // separate runtime field distinguishing "supporting-but-verified"
    // authority within AUTHORITY_FOUND, so VERIFIED_SUPPORTING is not
    // derived here -- it remains a defined-but-currently-unreachable value
    // in the enum until the runtime exposes that distinction. This is a
    // documented limitation, not an invented semantic.
    if (displayedCount === 0) return "NO_VERIFIED_AUTHORITY";
    // PHASE-10A6-R1: source presence alone is NOT proposition support. A bare
    // source-listing response (SOURCE-mode deterministic output that discards
    // analysis and just lists retrieved sources) must never be classified
    // VERIFIED_CONTROLLING -- it cannot establish that the listed authorities
    // control the precise issue, and it cannot disclose that a specifically
    // requested issuance was missing. Fail closed to RELATED_AUTHORITY_ONLY
    // (the retrieved authorities may still be displayed as related). This is
    // the structured gate for the confirmed PHASE-10A6 Q9 P1 overclaim.
    if (answerIsBareSourceListing(result.answer)) return "RELATED_AUTHORITY_ONLY";
    // Case C calibration: general authority was found and displayed, but the
    // answer's own prose says the specific requested issuance was not found.
    // Downgrade to RELATED_AUTHORITY_ONLY rather than overstate as
    // VERIFIED_CONTROLLING -- the cited authorities support the general
    // explanation, not the existence of the specific requested document.
    if (answerDisclaimsSpecificAuthority(result.answer)) return "RELATED_AUTHORITY_ONLY";
    return "VERIFIED_CONTROLLING";
  }
  return "UNKNOWN";
}

function deriveLegalConclusion(responseKind) {
  if (responseKind === "RESTRICTED_LEGAL_CONCLUSION") return "RESTRICTED";
  if (responseKind === "GENERAL_TAX") return "ALLOWED";
  if (responseKind === "CONTROLLED_PROCEDURAL" || responseKind === "DOMAIN_BOUNDARY") return "NOT_APPLICABLE";
  return "UNKNOWN";
}

function deriveHumanReviewRequired(result, responseKind) {
  if (result.controlledLoaAnswer && result.controlledLoaAnswer.requiresHumanReview === true) return true;
  if (responseKind === "RESTRICTED_LEGAL_CONCLUSION" || responseKind === "CONTROLLED_PROCEDURAL") return true;
  return false;
}

function deriveFilingReadyDocumentGenerated(result) {
  if (result.controlledLoaAnswer && typeof result.controlledLoaAnswer.filingReadyDocumentGenerated === "boolean") {
    return result.controlledLoaAnswer.filingReadyDocumentGenerated;
  }
  return false;
}

function deriveAutomaticSubmission(result) {
  if (result.controlledLoaAnswer && typeof result.controlledLoaAnswer.automaticSubmission === "boolean") {
    return result.controlledLoaAnswer.automaticSubmission;
  }
  return false;
}

function deriveLimitations(sourceState, hasConflict, responseKind, conflictState, specificAuthorityNotFound) {
  const limitations = [];
  if (hasConflict) limitations.push("CONFLICTING_AUTHORITY");
  // Potential (incomplete-evidence) conflicts are never discarded, only
  // never overstated as a verified, user-displayable conflict.
  if (conflictState === "POTENTIAL_CONFLICT") limitations.push("POTENTIAL_CONFLICT");
  if (UNSAFE_SOURCE_STATES.has(sourceState)) limitations.push(sourceState);
  if (sourceState === "RELATED_AUTHORITY_ONLY") limitations.push("RELATED_AUTHORITY_ONLY");
  if (specificAuthorityNotFound) limitations.push("SPECIFIC_AUTHORITY_NOT_FOUND");
  if (responseKind === "FALLBACK" && limitations.length === 0) limitations.push("FALLBACK");
  return limitations;
}

// Final defensive pass: re-assert every required invariant regardless of how
// the candidate values were derived above, so a future change to the
// derivation logic cannot silently violate a safety invariant.
function enforceInvariants(candidate) {
  const out = { ...candidate };

  // Invariant 3 / defensive Invariant 1: unsafe source states can never
  // co-occur with a verified-controlling claim.
  if (UNSAFE_SOURCE_STATES.has(out.sourceState) && out.authoritySupport === "VERIFIED_CONTROLLING") {
    out.authoritySupport = "NO_VERIFIED_AUTHORITY";
  }

  // Invariant 6: a genuine conflict can never be presented as fully settled
  // controlling authority.
  if (out.hasConflict === true && out.authoritySupport === "VERIFIED_CONTROLLING") {
    out.authoritySupport = "CONFLICTING_AUTHORITY";
  }

  // Invariant 4: restricted legal conclusions always require human review
  // and never permit filing-ready or automatic-submission output.
  if (out.legalConclusion === "RESTRICTED") {
    out.humanReviewRequired = true;
    out.filingReadyDocumentGenerated = false;
    out.automaticSubmission = false;
  }

  // Invariant 5: controlled procedural responses never permit filing-ready
  // or automatic-submission output, and never carry a restricted legal
  // conclusion label (procedural guidance makes no legal conclusion at all).
  if (out.responseKind === "CONTROLLED_PROCEDURAL") {
    out.filingReadyDocumentGenerated = false;
    out.automaticSubmission = false;
    if (out.legalConclusion === "RESTRICTED") out.legalConclusion = "NOT_APPLICABLE";
  }

  // Invariant 7: domain-boundary responses invent no tax-authority state.
  if (out.responseKind === "DOMAIN_BOUNDARY") {
    out.authoritySupport = "NOT_APPLICABLE";
    out.sourceState = "NOT_APPLICABLE";
    out.legalConclusion = "NOT_APPLICABLE";
    out.hasConflict = false;
    out.conflictState = "NOT_APPLICABLE";
    out.limitations = [];
  }

  // Controlled-procedural and restricted-legal-conclusion paths are
  // deterministic, dedicated response shapes that do not carry general RAG
  // conflict-analysis state; any leftover conflict signal from an earlier
  // pipeline stage is not meaningful here and must not be surfaced.
  if (out.responseKind === "CONTROLLED_PROCEDURAL" || out.responseKind === "RESTRICTED_LEGAL_CONCLUSION") {
    out.hasConflict = false;
    out.conflictState = "NOT_APPLICABLE";
    out.limitations = out.limitations.filter((l) => l !== "CONFLICTING_AUTHORITY" && l !== "POTENTIAL_CONFLICT");
  }

  // Invariant 1 (conflict): trust.hasConflict is true if and only if
  // conflictState is VERIFIED_CONFLICT -- never independently true/false.
  if (out.hasConflict === true && out.conflictState !== "VERIFIED_CONFLICT") {
    out.hasConflict = false;
  }
  if (out.conflictState === "VERIFIED_CONFLICT" && out.hasConflict !== true) {
    out.conflictState = "POTENTIAL_CONFLICT";
  }

  // Invariant 8 (Case C qualifier): specificAuthorityNotFound can never be
  // true unless authoritySupport is actually RELATED_AUTHORITY_ONLY -- the
  // qualifier must never survive a future derivation change that alters
  // authoritySupport without recomputing the qualifier.
  if (out.authoritySupport !== "RELATED_AUTHORITY_ONLY") {
    out.specificAuthorityNotFound = false;
  }

  return out;
}

/**
 * Derives the canonical trust contract object from an existing pipeline/
 * response result. Pure -- never mutates `result`, never performs I/O.
 *
 * @param {object} result - the same object ask-handler.js already uses to
 *   build its response payload (pipeline.js's runPipeline() return value, or
 *   the ask-handler-level domain-boundary/timeout/error fallback object).
 * @returns {object} the canonical trust object.
 */
export function buildTrustContract(result = {}) {
  const safeResult = result && typeof result === "object" ? result : {};

  const responseKind = deriveResponseKind(safeResult);
  const sourceState = deriveSourceState(safeResult, responseKind);
  const { hasConflict, conflictState } = classifyConflictState(safeResult);
  const authoritySupport = deriveAuthoritySupport(safeResult, sourceState, responseKind, hasConflict);
  // Additive qualifier (not a new top-level trust state): true only when the
  // Case C downgrade path actually fired -- general authority was found and
  // displayed, but the answer's own prose disclaims the specific requested
  // issuance/ruling/regulation/circular. Frontend uses this to render more
  // specific wording than the generic RELATED_AUTHORITY_ONLY copy, without
  // affecting ordinary RELATED_AUTHORITY_ONLY cases (e.g. a broad "explain
  // EWT in general" query) where no specific document was ever requested.
  const specificAuthorityNotFound =
    sourceState === "AUTHORITY_FOUND" &&
    authoritySupport === "RELATED_AUTHORITY_ONLY" &&
    answerDisclaimsSpecificAuthority(safeResult.answer);
  const legalConclusion = deriveLegalConclusion(responseKind);
  const humanReviewRequired = deriveHumanReviewRequired(safeResult, responseKind);
  const filingReadyDocumentGenerated = deriveFilingReadyDocumentGenerated(safeResult);
  const automaticSubmission = deriveAutomaticSubmission(safeResult);
  const limitations = deriveLimitations(sourceState, hasConflict, responseKind, conflictState, specificAuthorityNotFound);

  const candidate = {
    version: TRUST_CONTRACT_VERSION,
    authoritySupport,
    sourceState,
    legalConclusion,
    humanReviewRequired,
    filingReadyDocumentGenerated,
    automaticSubmission,
    hasConflict,
    conflictState,
    limitations,
    responseKind,
    specificAuthorityNotFound
  };

  return enforceInvariants(candidate);
}

/**
 * PHASE-10A1-R1: extractable pure builder so tests can execute the exact
 * production trust-forwarding wiring directly (real behavioral coverage of
 * ask-handler.js's response construction), not merely confirm it via
 * source-text inspection. Both of ask-handler.js's response-construction
 * locations call this instead of buildTrustContract() directly, so this
 * function is the single source of truth for how a raw pipeline/response
 * result and its resolved displayedSourceCount/sourceStatus are normalized
 * into the trust input. Pure -- never mutates `result`, never performs I/O.
 *
 * @param {object} result - the raw pipeline/response object.
 * @param {number} displayedSourceCount - the already-resolved display count
 *   (matching whatever the response payload itself uses).
 * @param {string} sourceStatus - the already-resolved source status
 *   (matching whatever the response payload itself uses).
 * @returns {object} the canonical trust object.
 */
export function buildResponseTrust(result, displayedSourceCount, sourceStatus) {
  const safeResult = result && typeof result === "object" ? result : {};
  return buildTrustContract({
    ...safeResult,
    displayedSourceCount,
    sourceStatus
  });
}
