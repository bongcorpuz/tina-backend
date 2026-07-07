// FILE: workflow/authority-safe-procedural-fallback.js
// PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1
//
// Pure, dependency-free, standalone scaffold providing authority-safe
// procedural triage for practical Philippine BIR audit workflow questions
// (LOA/checklist/PAN/FAN-FLD/protest/termination) when controlling authority
// is incomplete, unavailable, insufficiently retrieved, or not yet wired.
// This module has NO I/O, NO network calls, NO Supabase/OpenAI/Google
// Drive/n8n/Firecrawl/Crawlee/MCP dependency, NO web search, NO browser
// automation, NO filesystem access, NO process.env dependency, NO
// Date.now/randomness, and NO side effects. It imports nothing from any
// other module in this repository. It performs no live authority retrieval,
// stores nothing, mutates no global state, and is not wired into
// ask-handler.js, pipeline.js, server.js, routes, authentication, or the
// frontend. It never produces a final legal conclusion and never claims a
// notice, LOA, PAN, FAN, FLD, assessment, or BIR action is void, invalid,
// cancelled, final, or legally conclusive.

"use strict";

export const PHASE_09L_AUTHORITY_SAFE_PROCEDURAL_FALLBACK_VERSION = "PHASE-09L-AUTHORITY-SAFE-PROCEDURAL-FALLBACK-SCAFFOLD-1";

export const AUTHORITY_SAFE_PROCEDURAL_FALLBACK_MODE_ID = "authority_safe_procedural_fallback";

export const SUPPORTED_PROCEDURAL_FALLBACK_TYPES = Object.freeze([
  "LOA_RECEIVED_WHAT_TO_DO",
  "BIR_DOCUMENT_CHECKLIST_RECEIVED",
  "BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE",
  "PRE_SUBPOENA_REMINDER_RECEIVED",
  "PAN_RECEIVED_WHAT_TO_DO",
  "FAN_FLD_RECEIVED_WHAT_TO_DO",
  "ACTION_ON_PROTEST_RECEIVED",
  "TERMINATION_LETTER_RECEIVED",
  "REPLACEMENT_LOA_RECEIVED",
  "ADDITIONAL_DOCUMENT_REQUEST_RECEIVED",
  "FDDA_RECEIVED",
  "REQUEST_FOR_RECONSIDERATION_OR_REINVESTIGATION"
]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze([
  "official_reference_required",
  "uploaded_reference_pattern",
  "future_authority_corpus_required",
  "procedural_design_reference"
]);

const STANDARD_HUMAN_REVIEW_NOTICE =
  "This scaffold provides procedural-safe guidance only. The available facts are insufficient for a final legal conclusion; the taxpayer should have this matter reviewed against the applicable BIR issuance and jurisprudence by a qualified tax professional before any filing deadline.";

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "BIR LOA authenticity verification reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Use RMC No. 5-2026 / REVIE LOA verification workflow when authority corpus is wired."
  }),
  Object.freeze({
    label: "BIR assessment and protest procedure reference",
    sourceType: "BIR regulation / NIRC / jurisprudence",
    authorityTier: "official_reference_required",
    note: "Verify PAN/FAN/FLD protest periods against current BIR rules and applicable jurisprudence before final legal advice."
  }),
  Object.freeze({
    label: "Uploaded professional BIR audit workflow reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "uploaded_reference_pattern",
    note: "Use only as private development pattern; fixtures must be sanitized and must not expose real taxpayer data."
  })
]);

// Conservative, deterministic, lowercased-substring prohibited-claim phrases.
// No AI model, no network, no mutation.
const PROHIBITED_CLAIM_PHRASES = Object.freeze([
  "this assessment is void",
  "this loa is invalid",
  "this fan is invalid",
  "this pan is invalid",
  "the bir cannot assess you",
  "the case is fully cancelled",
  "the assessment is cancelled",
  "you are permanently cleared",
  "no need to consult a professional",
  "submit everything without review",
  "ignore the notice",
  "you will win",
  "guaranteed cancellation",
  "final legal opinion",
  "official legal advice",
  "court-tested defense",
  "foolproof defense",
  "the case is won",
  "no further action is needed",
  "the bir can never reopen anything",
  "this is full immunity",
  "final authority verification is complete",
  "official verification complete"
]);

const FALLBACK_TYPE_DEFINITIONS = Object.freeze({
  LOA_RECEIVED_WHAT_TO_DO: Object.freeze({
    defaultNoticeType: "LOA",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice:
        "Authority corpus for live LOA verification is not yet wired; this guidance reflects design-only procedural patterns pending official authority confirmation.",
      controllingAuthorityNeeded: Object.freeze([
        "NIRC authority to examine",
        "BIR LOA/eLA rules",
        "RMC No. 5-2026 or current LOA verification issuance",
        "Applicable RMO/RR on audit procedures",
        "Relevant jurisprudence on LOA authority and due process"
      ])
    }),
    immediateSafeSteps: Object.freeze([
      "Verify LOA authenticity.",
      "Record date of receipt.",
      "Identify LOA number, audit case number, taxable period, tax types, RO, GS, office, and signatory.",
      "Confirm scope of audit.",
      "Calendar document submission deadline.",
      "Prepare document compliance matrix.",
      "Submit available documents with transmittal and receiving proof.",
      "Mark unavailable, non-applicable, or non-existent documents clearly.",
      "Avoid unnecessary admissions.",
      "Escalate to professional review for legal conclusions."
    ]),
    missingFacts: Object.freeze([
      "LOA number and audit case number",
      "taxable period covered by the LOA",
      "date of receipt of the LOA",
      "confirmed scope of examination (tax types covered)",
      "responsible revenue officer(s) and group supervisor names"
    ]),
    documentsNeeded: Object.freeze([
      "Certified true copy of the LOA",
      "Document compliance matrix",
      "List of requested documents with availability status",
      "Prior BIR correspondence, if any"
    ]),
    riskWarnings: Object.freeze([
      "Avoid unnecessary admissions when responding to the LOA or during any related discussion with the examining office.",
      "Failure to verify LOA authenticity or respond within the requested scope may weaken the taxpayer's procedural position."
    ]),
    workflowRecommendation: Object.freeze({
      nextStep: "Verify LOA authenticity and calendar the document submission deadline before responding.",
      recommendedWorkflow: Object.freeze(["BIR_DOCUMENT_CHECKLIST_RECEIVED", "BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE"]),
      prohibitedOverreach: Object.freeze([
        "Do not claim the LOA is invalid without authority verification.",
        "Do not provide a final legal conclusion.",
        "Do not guarantee any outcome."
      ])
    })
  }),
  BIR_DOCUMENT_CHECKLIST_RECEIVED: Object.freeze({
    defaultNoticeType: "Notice for Presentation/Submission of Documents",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice:
        "Authority corpus for live audit-scope verification is not yet wired; this guidance reflects design-only procedural patterns pending official authority confirmation.",
      controllingAuthorityNeeded: Object.freeze([
        "BIR LOA/eLA rules",
        "Applicable RMO/RR on audit procedures and document requests",
        "Relevant jurisprudence on audit scope and due process"
      ])
    }),
    immediateSafeSteps: Object.freeze([
      "Do not blindly submit everything informally.",
      "Match each requested document to available records.",
      "Classify each item as provided, to follow, not applicable, unavailable, or non-existent.",
      "Prepare a written transmittal.",
      "Preserve proof of receipt.",
      "Ask for clarification when additional requests are outside scope or unclear.",
      "Check whether additional requests are relevant, necessary, within audit scope, and documented."
    ]),
    missingFacts: Object.freeze(["taxable period and tax types covered by the checklist", "date the checklist was received", "underlying LOA/audit case number the checklist references"]),
    documentsNeeded: Object.freeze(["Document checklist matrix (requested vs. available)", "Draft written transmittal", "Proof-of-receipt record (stamp or acknowledgment)"]),
    riskWarnings: Object.freeze(["Uncontrolled submission may create unnecessary admissions, inconsistencies, or exposure beyond the authorized audit scope."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Classify each checklist item and prepare a controlled written transmittal before submission.",
      recommendedWorkflow: Object.freeze(["BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE", "PRE_SUBPOENA_REMINDER_RECEIVED"]),
      prohibitedOverreach: Object.freeze(["Do not submit documents without a controlled transmittal.", "Do not provide a final legal conclusion."])
    })
  }),
  BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE: Object.freeze({
    defaultNoticeType: "Notice for Presentation/Submission of Documents",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice:
        "Authority corpus for live evidentiary-sufficiency verification is not yet wired; this guidance reflects design-only procedural patterns pending official authority confirmation.",
      controllingAuthorityNeeded: Object.freeze(["Applicable RMO/RR on acceptable substitute proof", "Rules of evidence applicable to BIR administrative proceedings"])
    }),
    immediateSafeSteps: Object.freeze([
      "Do not fabricate documents.",
      "Explain why the document does not exist or is not applicable.",
      "Submit substitute proof when appropriate.",
      "Use affidavit, management certification, AFS note, tax return, official record, or other reliable support where applicable.",
      'Use "without prejudice" language where appropriate.',
      "Ask BIR to identify the specific document and legal/factual basis if requesting more.",
      "Preserve proof of submission and receipt."
    ]),
    missingFacts: Object.freeze(["specific document(s) claimed unavailable or not applicable", "factual basis for non-existence or inapplicability"]),
    documentsNeeded: Object.freeze(["Affidavit of non-existence / non-applicability", "Management certification", "AFS note or other substitute record"]),
    riskWarnings: Object.freeze(["Do not state that a document exists if it does not. False or careless statements may create audit, civil, or criminal exposure."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Prepare sanitized substitute proof and a without-prejudice explanatory statement.",
      recommendedWorkflow: Object.freeze(["BIR_DOCUMENT_CHECKLIST_RECEIVED", "PRE_SUBPOENA_REMINDER_RECEIVED"]),
      prohibitedOverreach: Object.freeze(["Do not fabricate or imply the existence of a document that does not exist.", "Do not provide a final legal conclusion."])
    })
  }),
  PRE_SUBPOENA_REMINDER_RECEIVED: Object.freeze({
    defaultNoticeType: "Reminder Before Issuance of Subpoena Duces Tecum",
    authorityStatus: Object.freeze({
      status: "authority_required",
      limitationNotice:
        "This is an escalation stage; authority corpus for live verification of subpoena procedure is not yet wired. Escalate to professional review promptly.",
      controllingAuthorityNeeded: Object.freeze(["NIRC subpoena duces tecum provisions", "Applicable RMO/RR on escalation procedure before subpoena issuance"])
    }),
    immediateSafeSteps: Object.freeze([
      "Treat the reminder as an escalation warning.",
      "Match each checked/unsubmitted item against prior submissions.",
      "Prepare itemized status response.",
      "Attach proof of prior submission where available.",
      "Identify not applicable/unavailable/non-existent items.",
      "Submit or file response promptly.",
      "Secure BIR receiving stamp or email acknowledgment.",
      "Escalate to professional review before subpoena stage."
    ]),
    missingFacts: Object.freeze(["items still marked unsubmitted on the reminder", "dates and proof of any prior submissions"]),
    documentsNeeded: Object.freeze(["Itemized status response document", "Proof of prior submission (transmittals, receiving stamps, email acknowledgments)"]),
    riskWarnings: Object.freeze(["Failure to respond may lead to formal subpoena duces tecum or worsening procedural posture."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Prepare an itemized status response with proof of prior submissions and escalate to professional review before the subpoena stage.",
      recommendedWorkflow: Object.freeze(["BIR_DOCUMENTS_UNAVAILABLE_OR_NOT_APPLICABLE"]),
      prohibitedOverreach: Object.freeze(["Do not ignore the reminder.", "Do not provide a final legal conclusion."])
    })
  }),
  PAN_RECEIVED_WHAT_TO_DO: Object.freeze({
    defaultNoticeType: "PAN",
    authorityStatus: Object.freeze({
      status: "authority_required",
      limitationNotice:
        "Authority corpus for live protest-period verification is not yet wired; confirm the current reply period against the applicable BIR issuance before relying on any specific number of days.",
      controllingAuthorityNeeded: Object.freeze([
        "RR No. 18-2013 or current protest/due-process rules",
        "RMO No. 56-2022 or current assessment notice format rules",
        "Relevant NIRC provisions",
        "Relevant due process jurisprudence"
      ])
    }),
    immediateSafeSteps: Object.freeze([
      "Record date of receipt.",
      "Calendar the 15-day reply period.",
      "Identify each tax type and issue.",
      "Build issue-by-issue defense matrix.",
      "Match each BIR finding to taxpayer facts and documents.",
      "Attach supporting documents.",
      "Preserve proof of filing.",
      "Do not ignore the PAN.",
      "Escalate to professional review."
    ]),
    missingFacts: Object.freeze(["date of receipt of the PAN", "tax types and taxable period covered", "each specific finding/issue raised in the PAN"]),
    documentsNeeded: Object.freeze(["Copy of the PAN", "Issue-by-issue defense matrix", "Supporting documents for each finding"]),
    riskWarnings: Object.freeze(["Failure to reply to PAN may cause the BIR to issue FAN/FLD and may weaken the taxpayer's procedural position."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Calendar the 15-day reply period and build an issue-by-issue defense matrix before replying.",
      recommendedWorkflow: Object.freeze(["FAN_FLD_RECEIVED_WHAT_TO_DO"]),
      prohibitedOverreach: Object.freeze(["Do not ignore the PAN.", "Do not provide a final legal conclusion.", "Do not guarantee any outcome."])
    })
  }),
  FAN_FLD_RECEIVED_WHAT_TO_DO: Object.freeze({
    defaultNoticeType: "FAN/FLD",
    authorityStatus: Object.freeze({
      status: "authority_required",
      limitationNotice:
        "Authority corpus for live protest-period verification is not yet wired; confirm the current protest period against the applicable BIR issuance before relying on any specific number of days.",
      controllingAuthorityNeeded: Object.freeze([
        "RR No. 18-2013 or current protest procedure rules",
        "NIRC assessment and protest provisions",
        "CTA appeal rules",
        "Relevant jurisprudence on assessment finality and due process"
      ])
    }),
    immediateSafeSteps: Object.freeze([
      "Record date of receipt.",
      "Calendar the 30-day protest period.",
      "Determine whether request for reconsideration or request for reinvestigation is appropriate.",
      "Identify procedural defenses.",
      "Identify substantive tax defenses.",
      "Prepare protest with supporting documents.",
      "Preserve proof of filing.",
      "Monitor FDDA, denial, or inaction.",
      "Escalate to professional legal/tax review."
    ]),
    missingFacts: Object.freeze(["date of receipt of the FAN/FLD", "whether reconsideration or reinvestigation is the intended remedy", "each specific finding/issue assessed"]),
    documentsNeeded: Object.freeze(["Copy of the FAN/FLD", "Draft protest letter with supporting documents", "Proof of filing"]),
    riskWarnings: Object.freeze(["Failure to file a valid protest within the required period may make the assessment final, executory, and demandable."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Calendar the 30-day protest period, choose reconsideration or reinvestigation, and prepare a supported protest before the deadline.",
      recommendedWorkflow: Object.freeze(["ACTION_ON_PROTEST_RECEIVED"]),
      prohibitedOverreach: Object.freeze(["Do not assume the assessment is invalid without authority verification.", "Do not provide a final legal conclusion.", "Do not guarantee any outcome."])
    })
  }),
  ACTION_ON_PROTEST_RECEIVED: Object.freeze({
    defaultNoticeType: "Action on Protest",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice:
        "Authority corpus for live verification of the scope of the action letter is not yet wired; confirm precisely what was granted before relying on this guidance.",
      controllingAuthorityNeeded: Object.freeze(["RR No. 18-2013 or current protest procedure rules", "NIRC assessment and protest provisions", "CTA appeal rules"])
    }),
    immediateSafeSteps: Object.freeze([
      "The BIR's grant of a request for reconsideration usually means the protest was accepted as valid/timely and forwarded for re-evaluation; it does not automatically mean the assessment was cancelled.",
      "Preserve the action letter.",
      "Confirm what was granted: procedural acceptance, reconsideration, reinvestigation, or substantive cancellation.",
      "Monitor for re-evaluation result, FDDA, denial, amended assessment, or inaction.",
      "Keep proof of protest filing and attachments.",
      "Calendar CTA appeal watch points if applicable."
    ]),
    missingFacts: Object.freeze(["exactly what the action letter granted", "whether re-evaluation, FDDA, or further notice is pending"]),
    documentsNeeded: Object.freeze(["Copy of the action-on-protest letter", "Proof of protest filing and attachments"]),
    riskWarnings: Object.freeze(["Acceptance of a protest for re-evaluation is a procedural step; it should not be treated as a final resolution until confirmed by a subsequent BIR action or authority review."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Confirm precisely what the action letter granted and calendar CTA appeal watch points while monitoring for further BIR action.",
      recommendedWorkflow: Object.freeze(["FAN_FLD_RECEIVED_WHAT_TO_DO"]),
      prohibitedOverreach: Object.freeze([
        "Do not treat the action letter as resolving the matter in the taxpayer's favor without further authority confirmation.",
        "Do not claim final victory in this matter.",
        "Do not claim that no further monitoring or follow-up action is required.",
        "Do not provide a final legal conclusion."
      ])
    })
  }),
  TERMINATION_LETTER_RECEIVED: Object.freeze({
    defaultNoticeType: "Termination Letter",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice:
        "Authority corpus for live verification of the scope of the termination letter is not yet wired; confirm the covered LOA, period, and tax types before relying on this guidance.",
      controllingAuthorityNeeded: Object.freeze(["Applicable RMO/RR on audit closure and reopening grounds", "NIRC provisions on fraud, false returns, and refund-related exceptions"])
    }),
    immediateSafeSteps: Object.freeze([
      "The audit case is closed for the covered LOA, tax period, and tax types, but the closure may be without prejudice to future action if fraud, false return, or refund-related issues later arise.",
      "Keep the termination letter permanently.",
      "Match it to the LOA, audit case number, taxable period, and tax types.",
      "Keep payment proof and BIR receipts.",
      "Preserve transmittals, notices, returns, AFS, schedules, and prior correspondence.",
      "Do not treat it as blanket immunity for unrelated periods, unrelated tax types, fraud, false returns, or refund issues."
    ]),
    missingFacts: Object.freeze(["exact LOA, audit case number, taxable period, and tax types covered by the termination letter"]),
    documentsNeeded: Object.freeze(["Copy of the termination letter", "Payment proof and BIR receipts", "Prior transmittals, notices, returns, AFS, and schedules"]),
    riskWarnings: Object.freeze(["This closure is scoped to the covered LOA, period, and tax types only; it is not blanket protection against unrelated periods, unrelated tax types, fraud, false returns, or refund issues."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Match the termination letter to its covered LOA, period, and tax types, and retain all related records permanently.",
      recommendedWorkflow: Object.freeze([]),
      prohibitedOverreach: Object.freeze([
        "Do not claim permanent, unconditional protection from every future BIR inquiry.",
        "Do not claim the Bureau is permanently barred from revisiting related matters.",
        "Do not provide a final legal conclusion."
      ])
    })
  }),
  REPLACEMENT_LOA_RECEIVED: Object.freeze({
    defaultNoticeType: "Replacement LOA",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice: "Authority corpus for live replacement-LOA verification is not yet wired; confirm the replacement is validly issued before relying on this guidance.",
      controllingAuthorityNeeded: Object.freeze(["BIR LOA/eLA reassignment and revalidation rules", "RMC No. 5-2026 or current LOA verification issuance"])
    }),
    immediateSafeSteps: Object.freeze([
      "Verify the replacement LOA's authenticity and its relationship to the original LOA.",
      "Record date of receipt of the replacement LOA.",
      "Confirm whether scope, RO, or GS assignment changed.",
      "Preserve both the original and replacement LOA.",
      "Escalate to professional review for legal conclusions."
    ]),
    missingFacts: Object.freeze(["reason for replacement", "whether scope or assigned officers changed"]),
    documentsNeeded: Object.freeze(["Copy of the original LOA", "Copy of the replacement LOA"]),
    riskWarnings: Object.freeze(["A replacement LOA may change the assigned examiner or scope; confirm before responding as if under the original LOA."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Verify the replacement LOA and confirm any change in scope or assigned officers.",
      recommendedWorkflow: Object.freeze(["LOA_RECEIVED_WHAT_TO_DO"]),
      prohibitedOverreach: Object.freeze(["Do not provide a final legal conclusion."])
    })
  }),
  ADDITIONAL_DOCUMENT_REQUEST_RECEIVED: Object.freeze({
    defaultNoticeType: "Additional Document Request",
    authorityStatus: Object.freeze({
      status: "authority_limited",
      limitationNotice: "Authority corpus for live scope verification of additional requests is not yet wired; confirm relevance and scope before responding.",
      controllingAuthorityNeeded: Object.freeze(["Applicable RMO/RR on audit scope and document requests"])
    }),
    immediateSafeSteps: Object.freeze([
      "Check whether the additional request is relevant, necessary, within audit scope, and documented.",
      "Classify each additional item as provided, to follow, not applicable, unavailable, or non-existent.",
      "Prepare a written transmittal for any response.",
      "Preserve proof of receipt."
    ]),
    missingFacts: Object.freeze(["stated basis for the additional request", "relationship of the additional items to the original LOA scope"]),
    documentsNeeded: Object.freeze(["Copy of the additional document request", "Updated document checklist matrix"]),
    riskWarnings: Object.freeze(["Responding to out-of-scope requests without clarification may expand audit exposure beyond the original LOA."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Confirm the scope basis for the additional request before responding.",
      recommendedWorkflow: Object.freeze(["BIR_DOCUMENT_CHECKLIST_RECEIVED"]),
      prohibitedOverreach: Object.freeze(["Do not provide a final legal conclusion."])
    })
  }),
  FDDA_RECEIVED: Object.freeze({
    defaultNoticeType: "FDDA",
    authorityStatus: Object.freeze({
      status: "authority_required",
      limitationNotice: "Authority corpus for live FDDA appeal-period verification is not yet wired; confirm the current CTA appeal period against applicable rules before relying on any specific number of days.",
      controllingAuthorityNeeded: Object.freeze(["RR No. 18-2013 or current protest procedure rules", "CTA appeal rules and applicable jurisprudence"])
    }),
    immediateSafeSteps: Object.freeze([
      "Record date of receipt of the FDDA.",
      "Calendar the CTA appeal period.",
      "Identify procedural and substantive grounds for appeal.",
      "Preserve proof of filing of any prior protest.",
      "Escalate to professional legal/tax review."
    ]),
    missingFacts: Object.freeze(["date of receipt of the FDDA", "grounds stated for denial or partial denial"]),
    documentsNeeded: Object.freeze(["Copy of the FDDA", "Prior protest filing and supporting documents"]),
    riskWarnings: Object.freeze(["Failure to appeal an FDDA to the CTA within the required period may render the assessment final, executory, and demandable."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Calendar the CTA appeal period and escalate to professional legal/tax review promptly.",
      recommendedWorkflow: Object.freeze([]),
      prohibitedOverreach: Object.freeze(["Do not provide a final legal conclusion.", "Do not guarantee any appeal outcome."])
    })
  }),
  REQUEST_FOR_RECONSIDERATION_OR_REINVESTIGATION: Object.freeze({
    defaultNoticeType: "Protest (Request for Reconsideration or Reinvestigation)",
    authorityStatus: Object.freeze({
      status: "authority_required",
      limitationNotice: "Authority corpus for live protest-remedy verification is not yet wired; confirm which remedy is appropriate against applicable rules before filing.",
      controllingAuthorityNeeded: Object.freeze(["RR No. 18-2013 or current protest procedure rules", "NIRC assessment and protest provisions"])
    }),
    immediateSafeSteps: Object.freeze([
      "Determine whether reconsideration (no new evidence) or reinvestigation (new evidence) is appropriate.",
      "Prepare supporting documents matched to the chosen remedy.",
      "Preserve proof of filing.",
      "Monitor for BIR action within the applicable period.",
      "Escalate to professional legal/tax review."
    ]),
    missingFacts: Object.freeze(["whether new evidence will be submitted", "specific grounds relied upon"]),
    documentsNeeded: Object.freeze(["Draft protest letter", "Supporting documents matched to the chosen remedy"]),
    riskWarnings: Object.freeze(["Choosing the wrong remedy or omitting required supporting documents may weaken the protest."]),
    workflowRecommendation: Object.freeze({
      nextStep: "Confirm whether reconsideration or reinvestigation is appropriate before filing.",
      recommendedWorkflow: Object.freeze(["ACTION_ON_PROTEST_RECEIVED"]),
      prohibitedOverreach: Object.freeze(["Do not provide a final legal conclusion.", "Do not guarantee any outcome."])
    })
  })
});

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

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSourceCard(card) {
  const src = isPlainObject(card) ? card : {};
  const authorityTier = ALLOWED_SOURCE_CARD_AUTHORITY_TIERS.includes(src.authorityTier) ? src.authorityTier : "procedural_design_reference";
  return {
    label: isNonBlankString(src.label) ? src.label.trim() : "Procedural design reference",
    sourceType: isNonBlankString(src.sourceType) ? src.sourceType.trim() : "procedural design reference",
    authorityTier,
    note: isNonBlankString(src.note) ? src.note.trim() : "Design/reference card only; no live authority verification performed."
  };
}

/**
 * Recursively scans a value (string/array/object) for prohibited procedural
 * fallback claim phrases. Pure, synchronous, never mutates input, performs
 * no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedProceduralFallbackClaims(value) {
  const matches = [];

  function walk(node) {
    if (typeof node === "string") {
      const lower = node.toLowerCase();
      for (const phrase of PROHIBITED_CLAIM_PHRASES) {
        if (lower.includes(phrase)) matches.push(phrase);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item));
      return;
    }
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) walk(node[key]);
    }
  }

  walk(value);

  return { hasProhibitedClaims: matches.length > 0, matches };
}

/**
 * Normalizes candidate authority-safe procedural fallback input into a
 * defensive, fully-shaped object. Never mutates input; never throws. Always
 * forces the safe scaffold-only option values regardless of caller input --
 * validateAuthoritySafeProceduralFallbackInput() is the gate that flags an
 * attempt to request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeAuthoritySafeProceduralFallbackInput(input) {
  const src = isPlainObject(input) ? input : {};
  const fallbackType = typeof src.fallbackType === "string" && SUPPORTED_PROCEDURAL_FALLBACK_TYPES.includes(src.fallbackType) ? src.fallbackType : null;
  const noticeFactsSrc = isPlainObject(src.noticeFacts) ? src.noticeFacts : {};
  const sourceCardsSrc = Array.isArray(src.sourceCards) ? src.sourceCards : [];

  return {
    fallbackType,
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    noticeFacts: {
      noticeType: isNonBlankString(noticeFactsSrc.noticeType) ? noticeFactsSrc.noticeType.trim() : "",
      taxablePeriodKnown: noticeFactsSrc.taxablePeriodKnown === true,
      receiptDateKnown: noticeFactsSrc.receiptDateKnown === true,
      authorityDocumentKnown: noticeFactsSrc.authorityDocumentKnown === true
    },
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      allowLegalConclusion: false,
      allowLiveRetrieval: false
    },
    sourceCards: sourceCardsSrc.map((card) => normalizeSourceCard(card))
  };
}

/**
 * Validates candidate authority-safe procedural fallback input. Never
 * throws. Rejects missing/unsupported fallbackType, missing/empty
 * userQuery, any attempt to request unsafe runtime/legal-conclusion/
 * live-retrieval option values, and source cards claiming final authority
 * verification is complete.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateAuthoritySafeProceduralFallbackInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (typeof input.fallbackType !== "string" || input.fallbackType.length === 0) {
    errors.push("fallbackType is required");
  } else if (!SUPPORTED_PROCEDURAL_FALLBACK_TYPES.includes(input.fallbackType)) {
    errors.push(`unsupported fallbackType: ${JSON.stringify(input.fallbackType)}`);
  }

  if (typeof input.userQuery !== "string") {
    errors.push("userQuery is required");
  } else if (input.userQuery.trim().length === 0) {
    errors.push("userQuery must not be empty");
  }

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");

  const sourceCards = Array.isArray(input.sourceCards) ? input.sourceCards : [];
  const verificationClaimPattern = /final authority verification is complete|official verification complete|verification (?:is |has been )?complete|officially verified/i;
  sourceCards.forEach((card, index) => {
    if (isPlainObject(card)) {
      const combined = `${card.label || ""} ${card.note || ""}`;
      if (verificationClaimPattern.test(combined)) {
        errors.push(`sourceCards[${index}] must not claim final authority verification is complete`);
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Builds a full authority-safe procedural fallback result for the given
 * (raw or normalized) input. Never throws. Always returns the full result
 * shape regardless of input validity -- callers should call
 * validateAuthoritySafeProceduralFallbackInput() beforehand to gate whether
 * to proceed. Performs no I/O, no network calls, and no live retrieval.
 *
 * @param {*} input
 * @returns {object}
 */
export function createAuthoritySafeProceduralFallbackResult(input) {
  const normalized = normalizeAuthoritySafeProceduralFallbackInput(input);
  const definition = FALLBACK_TYPE_DEFINITIONS[normalized.fallbackType];

  const safeDefinition =
    definition ||
    Object.freeze({
      defaultNoticeType: "Unknown",
      authorityStatus: Object.freeze({
        status: "authority_required",
        limitationNotice: "Fallback type is unsupported or not yet recognized by this scaffold; authority corpus and procedural pattern are both unavailable.",
        controllingAuthorityNeeded: Object.freeze(["Applicable BIR issuance and jurisprudence for this notice type"])
      }),
      immediateSafeSteps: Object.freeze(["Escalate to professional review before taking further action."]),
      missingFacts: Object.freeze(["notice type and procedural stage"]),
      documentsNeeded: Object.freeze(["Copy of the notice or letter received"]),
      riskWarnings: Object.freeze(["This fallback type is not yet supported by this scaffold; do not rely on this output for any procedural decision."]),
      workflowRecommendation: Object.freeze({
        nextStep: "Escalate to professional review.",
        recommendedWorkflow: Object.freeze([]),
        prohibitedOverreach: Object.freeze(["Do not provide a final legal conclusion."])
      })
    });

  const dynamicMissingFacts = [];
  if (!normalized.noticeFacts.taxablePeriodKnown) dynamicMissingFacts.push("taxable period covered by the notice");
  if (!normalized.noticeFacts.receiptDateKnown) dynamicMissingFacts.push("date of receipt of the notice");
  if (!normalized.noticeFacts.authorityDocumentKnown) dynamicMissingFacts.push("specific authority document number/reference");

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09L",
    mode: AUTHORITY_SAFE_PROCEDURAL_FALLBACK_MODE_ID,
    version: PHASE_09L_AUTHORITY_SAFE_PROCEDURAL_FALLBACK_VERSION,
    runtimeActive: false,
    authorityStatus: deepClone(safeDefinition.authorityStatus),
    proceduralContext: {
      noticeType: isNonBlankString(normalized.noticeFacts.noticeType) ? normalized.noticeFacts.noticeType : safeDefinition.defaultNoticeType,
      taxablePeriodKnown: normalized.noticeFacts.taxablePeriodKnown,
      receiptDateKnown: normalized.noticeFacts.receiptDateKnown,
      deadlineComputable: normalized.noticeFacts.taxablePeriodKnown && normalized.noticeFacts.receiptDateKnown,
      authorityDocumentKnown: normalized.noticeFacts.authorityDocumentKnown
    },
    immediateSafeSteps: [...safeDefinition.immediateSafeSteps],
    missingFacts: [...safeDefinition.missingFacts, ...dynamicMissingFacts],
    documentsNeeded: [...safeDefinition.documentsNeeded],
    riskWarnings: [...safeDefinition.riskWarnings],
    workflowRecommendation: deepClone(safeDefinition.workflowRecommendation),
    humanReviewNotice: STANDARD_HUMAN_REVIEW_NOTICE,
    sourceCards: combinedSourceCards,
    metadata: {
      scaffoldOnly: true,
      legalConclusionProvided: false,
      liveRetrievalPerformed: false,
      externalSearchPerformed: false,
      generatedFilingReadyDocument: false,
      automaticSubmission: false,
      finalOutcomeGuaranteed: false
    }
  };
}

/**
 * Validates a candidate authority-safe procedural fallback result object.
 * Never throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateAuthoritySafeProceduralFallbackResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");
  if (!isPlainObject(result.authorityStatus)) errors.push("authorityStatus is required");
  if (!isPlainObject(result.proceduralContext)) errors.push("proceduralContext is required");
  if (!Array.isArray(result.immediateSafeSteps)) errors.push("immediateSafeSteps must be an array");
  if (!Array.isArray(result.missingFacts)) errors.push("missingFacts must be an array");
  if (!Array.isArray(result.documentsNeeded)) errors.push("documentsNeeded must be an array");
  if (!Array.isArray(result.riskWarnings)) errors.push("riskWarnings must be an array");
  if (!isPlainObject(result.workflowRecommendation)) errors.push("workflowRecommendation is required");
  if (!isNonBlankString(result.humanReviewNotice)) errors.push("humanReviewNotice is required");
  if (!Array.isArray(result.sourceCards)) {
    errors.push("sourceCards is required");
  } else if (result.sourceCards.length === 0) {
    errors.push("sourceCards must not be empty");
  }

  const metadata = isPlainObject(result.metadata) ? result.metadata : {};
  if (metadata.scaffoldOnly !== true) errors.push("metadata.scaffoldOnly must be true");
  if (metadata.legalConclusionProvided !== false) errors.push("metadata.legalConclusionProvided must be false");
  if (metadata.liveRetrievalPerformed !== false) errors.push("metadata.liveRetrievalPerformed must be false");
  if (metadata.externalSearchPerformed !== false) errors.push("metadata.externalSearchPerformed must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");

  const claimCheck = detectProhibitedProceduralFallbackClaims(result);
  if (claimCheck.hasProhibitedClaims) {
    errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
