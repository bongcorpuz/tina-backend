// FILE: services/controlled-loa-legal-conclusion-safety.js
// PHASE-09ZI-CONTROLLED-LOA-UNSAFE-LEGAL-WORDING-REMEDIATION-1
//
// Pure, deterministic legal-safety guard for excluded controlled-LOA
// intents (validity, invalidity, voidness, finality, appealability,
// enforceability, CTA strategy, outcome prediction, filing-ready protest,
// automatic BIR submission, and legal-opinion requests). Reuses the
// exclusion signal already produced by classifyControlledLoaIntent() in
// workflow/controlled-loa-answer-runtime-scaffold.js -- no new keyword
// list, no query re-parsing. This module never determines validity,
// invalidity, voidness, finality, appealability, or enforceability; never
// predicts an outcome; never generates a filing-ready document; never
// claims an automatic BIR submission; and never asserts a verified legal
// citation. No I/O, no network calls, no external dependency.

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
