// FILE: services/controlled-loa-legal-conclusion-safety.js
// PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1
// Extended by PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1
//
// Pure, deterministic legal-safety guard for excluded controlled-LOA
// intents (validity, invalidity, voidness, finality, appealability,
// enforceability, CTA strategy, outcome prediction, definitive-conclusion,
// guaranteed-strategy, filing-ready protest, automatic BIR submission, and
// legal-opinion requests). Reuses the exclusion signal already produced by
// classifyControlledLoaIntent() in workflow/controlled-loa-answer-runtime-scaffold.js
// -- no new keyword list, no query re-parsing. This module never determines
// validity, invalidity, voidness, finality, appealability, or
// enforceability; never predicts an outcome; never generates a filing-ready
// document; never claims an automatic BIR submission; and never asserts a
// verified legal citation. No I/O, no network calls, no external dependency.
//
// PHASE-10A2 addition: evaluateUpstreamRestrictedLegalConclusionGate() lets
// ask-handler.js call this SAME classifier (not a duplicate) before
// retrieval/generation/the route-level timeout race begins, so a restricted
// query is never lost to a generic timeout fallback. Step 12.66 inside
// pipeline.js (evaluateControlledLoaLegalConclusionSafetyGate) is untouched
// and remains defense in depth if this upstream call is ever bypassed.

import {
  classifyControlledLoaIntent,
  normalizeControlledLoaAnswerInput,
  createControlledLoaAnswerRuntimeScaffoldResult
} from "../workflow/controlled-loa-answer-runtime-scaffold.js";

export function isControlledLoaLegalConclusionRestrictedIntent(intentClassification) {
  return intentClassification?.excluded === true;
}

function buildLimitationAnswerText(scaffoldResult) {
  const controlledAnswer = scaffoldResult?.controlledAnswer || {};
  const humanReviewNotice = controlledAnswer.humanReviewNotice ||
    "Validity, prescription, finality, appealability, protest strategy, CTA strategy, and legal conclusions require official-source verification and human tax/legal review.";
  const authorityVerificationNotice = controlledAnswer.authorityVerificationNotice ||
    "Official-source verification is required before relying on any authority referenced in this guidance; no source has been live-verified.";

  return [
    "A conclusive determination of validity, invalidity, voidness, finality, or appealability cannot be made from the limited information in this question.",
    "The actual document, its issuance and service details, the assessment or dispute stage, the dates received, applicable protest or appeal deadlines, and any prior notices or taxpayer actions must be reviewed before any conclusion.",
    "Protest and appeal periods may be time-sensitive, so prompt review is recommended.",
    humanReviewNotice,
    authorityVerificationNotice,
    "This is procedural guidance only, not a final legal opinion."
  ].join(" ");
}

export function buildControlledLoaLegalConclusionLimitationResponse(ctx = {}, intentClassification = {}, scaffoldResult = {}) {
  return {
    answer: buildLimitationAnswerText(scaffoldResult),
    sources: [],
    sourcesUsed: [],
    sourceCards: [],
    retrievedSourceCount: 0,
    displayedSourceCount: 0,
    saeStatus: ctx.saeStatus,
    sourceAvailabilityMetadata: ctx.sourceAvailability,
    eligibleCandidates: [],
    suppressedCandidates: [],
    limitationRequired: true,
    disclosureType: ctx.disclosureType,
    statusReason: ctx.statusReason,
    sourceAvailability: ctx.saeStatus,
    sourceStatus: ctx.saeStatus,
    sourceAvailabilityReason: ctx.statusReason,
    retrievalTimedOut: Boolean(ctx.retrievalDiagnostics?.timedOut),
    relatedSourceCount: 0,
    issueClassification: ctx.issueClassification,
    conflictAnalysis: ctx.conflictAnalysis,
    riskScore: ctx.riskScore,
    mode: ctx.mode,
    orchestrationMode: ctx.mode,
    responseMode: ctx.mode,
    responseType: "controlled_loa_legal_conclusion_restricted",
    answerAllowed: true,
    questions: [],
    documentRequests: [],
    sourceCoverageLimitations: [],
    phase10Deferrals: [],
    controlledLoaAnswer: {
      controlledLoaAnswer: false,
      phase: "09ZI",
      category: "legal_conclusion_restricted",
      intent: intentClassification.intent || null,
      responseMode: intentClassification.responseMode || null,
      legalConclusionAllowed: false,
      sourceCardVerification: "not_performed",
      filingReadyDocumentGenerated: false,
      automaticSubmission: false,
      requiresHumanReview: true
    },
    trace: {
      steps: [{ step: "12.66", name: "controlledLoaLegalConclusionSafetyGate", done: true, earlyExit: true }]
    },
    openaiCalls: []
  };
}

/**
 * PHASE-10A2: upstream, pre-retrieval evaluation of the exact same
 * restricted-legal-conclusion classifier Step 12.66 uses downstream. Callable
 * with only the raw query text and an already-established Philippine-tax
 * context signal (e.g. from services/philippine-tax-domain-boundary.js) --
 * no retrieval, no issue classification, no model call required. Returns
 * `matched:false` (never throws) unless both:
 *   1. `isPhilippineTax` is true (sufficient tax/BIR context already
 *      established by the caller); and
 *   2. the shared classifier determines the query is an excluded
 *      (restricted) legal-conclusion intent.
 * On a match, returns the identical deterministic response shape Step 12.66
 * would have produced (via buildControlledLoaLegalConclusionLimitationResponse),
 * so upstream and downstream restricted responses are indistinguishable to
 * a client. Fails open (matched:false) on any internal error so a defect in
 * this gate can never block a legitimate query -- Step 12.66 remains
 * defense in depth regardless.
 *
 * @param {object} params
 * @param {string} params.query - raw user question text.
 * @param {boolean} params.isPhilippineTax - already-established tax-context signal.
 * @param {object} [params.ctx] - optional partial ctx (e.g. { mode }) forwarded
 *   into the response builder; pipeline-computed fields (saeStatus, riskScore,
 *   conflictAnalysis, etc.) do not exist yet at this pre-retrieval point and
 *   are safely omitted (the builder defaults them).
 * @returns {{matched: boolean, intentClassification: object|null, earlyExitResponse: object|null, failOpen?: boolean, warning?: string}}
 */
export function evaluateUpstreamRestrictedLegalConclusionGate({
  query = "",
  isPhilippineTax = false,
  ctx = {},
  intentClassifier = classifyControlledLoaIntent,
  inputNormalizer = normalizeControlledLoaAnswerInput,
  resultBuilder = createControlledLoaAnswerRuntimeScaffoldResult
} = {}) {
  if (isPhilippineTax !== true) {
    return { matched: false, intentClassification: null, earlyExitResponse: null };
  }
  try {
    const normalizedInput = inputNormalizer({ userQuery: query });
    const intentClassification = intentClassifier(normalizedInput);
    if (!isControlledLoaLegalConclusionRestrictedIntent(intentClassification)) {
      return { matched: false, intentClassification, earlyExitResponse: null };
    }
    const scaffoldResult = resultBuilder({ userQuery: query });
    return {
      matched: true,
      intentClassification,
      earlyExitResponse: buildControlledLoaLegalConclusionLimitationResponse(ctx, intentClassification, scaffoldResult)
    };
  } catch (e) {
    return {
      matched: false,
      intentClassification: null,
      failOpen: true,
      warning: `evaluateUpstreamRestrictedLegalConclusionGate fail-open: ${e?.message || e}`,
      earlyExitResponse: null
    };
  }
}
