// FILE: workflow/bir-2026-audit-baseline-integration.js
// PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1
//
// Pure, dependency-free, standalone design scaffold that integrates the
// 2026 BIR audit-procedure baseline (RMO No. 1-2026, RMO No. 6-2026, RMC
// No. 14-2026, RMC No. 8-2026, RMC No. 5-2026, RMC No. 107-2025, RR No.
// 18-2013, RR No. 12-99 as amended, NIRC Sec. 203/222/228/232, CTA rules,
// LOA/eLA jurisprudence, assessment due-process jurisprudence, and
// prescription jurisprudence) into TINA's Phase 9 BIR Audit Defense
// workflow layer as design-level review signals only. This module has NO
// I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/Firecrawl/
// Crawlee/MCP dependency, NO web search, NO browser automation, NO OCR,
// NO filesystem access, NO process.env dependency, NO Date.now/randomness,
// and NO side effects. It imports nothing from any other module in this
// repository. It performs no live search, scraping, browsing, downloading,
// OCR, authority ingestion, embeddings, vector storage, or database
// writes, never submits or stores anything, mutates no global state, and
// is not wired into ask-handler.js, pipeline.js, server.js, routes,
// authentication, or the frontend. It integrates 2026 audit-baseline
// concepts as review signals only; it never decides that any LOA, eLA,
// replacement eLA, consolidated eLA, PAN, FAN, FLD, FDDA, assessment,
// protest, document request, or BIR action is valid, invalid, void,
// cancelled, final, enforceable, appealable, or legally conclusive.

"use strict";

export const PHASE_09S_2026_BIR_AUDIT_BASELINE_INTEGRATION_VERSION = "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1";

export const BIR_2026_AUDIT_BASELINE_INTEGRATION_MODE_ID = "bir_2026_audit_baseline_integration";

export const SUPPORTED_2026_AUDIT_BASELINE_TOPICS = Object.freeze([
  "SINGLE_INSTANCE_AUDIT_FRAMEWORK",
  "ONE_ELA_PER_TAXABLE_YEAR",
  "ALL_TAX_TYPES_IN_ONE_ELA",
  "CONSOLIDATION_OF_PENDING_ELAS",
  "REPLACEMENT_ELA_FOR_CONSOLIDATION",
  "REPLACEMENT_ELA_FOR_CONTINUITY",
  "PRIOR_LOA_ELA_VALIDITY",
  "PROSPECTIVE_APPLICATION_OF_RMO_1_2026",
  "MULTIPLE_ELAS_SAME_TAXPAYER_YEAR",
  "VAT_NON_CONSOLIDATION_REQUEST",
  "VATAS_LTVAU_TRANSITION",
  "VAT_REFUND_TRANSITION",
  "MISSION_ORDER",
  "TAX_VERIFICATION_NOTICE",
  "TVN_LIMITED_SCOPE",
  "TVN_SCOPE_EXPANSION_RISK",
  "STANDARDIZED_CHECKLIST",
  "ADDITIONAL_DOCUMENT_REQUEST_LIMITS",
  "DOCUMENT_REQUEST_RELEVANCE_NECESSITY_SCOPE",
  "VOLUMINOUS_RECORDS",
  "ON_PREMISE_EXAMINATION",
  "CERTIFIED_COPY_SUBMISSION",
  "NOD_DOD_DOCUMENTATION",
  "PAN_CONSOLIDATION_SAFEGUARDS",
  "CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD",
  "FAN_CONSOLIDATION_SAFEGUARDS",
  "CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD",
  "FDDA_NO_CONSOLIDATION",
  "FINAL_EXECUTORY_FAN_NO_CONSOLIDATION",
  "PROPER_SERVICE",
  "WRITTEN_CONFORMITY_TO_CONSOLIDATION",
  "WAIVER_OF_PRESCRIPTION",
  "NO_REGRESSION_RULE",
  "PRIOR_NOTICES_CHECKLISTS_SUBPOENAS_UNDER_REPLACEMENT_ELA",
  "AUDIT_SAFEGUARDS",
  "UNKNOWN_2026_BASELINE_TOPIC"
]);

export const SUPPORTED_2026_AUDIT_BASELINE_AUTHORITY_REFERENCES = Object.freeze([
  "RMO_NO_1_2026",
  "RMO_NO_6_2026",
  "RMC_NO_14_2026",
  "RMC_NO_8_2026",
  "RMC_NO_5_2026",
  "RMC_NO_107_2025",
  "RR_NO_18_2013",
  "RR_NO_12_99_AS_AMENDED",
  "NIRC_SEC_203",
  "NIRC_SEC_222",
  "NIRC_SEC_228",
  "NIRC_SEC_232",
  "CTA_RULES",
  "LOA_ELA_JURISPRUDENCE",
  "ASSESSMENT_DUE_PROCESS_JURISPRUDENCE",
  "PRESCRIPTION_JURISPRUDENCE",
  "UNKNOWN_AUTHORITY_REFERENCE"
]);

export const SUPPORTED_2026_AUDIT_BASELINE_SIGNAL_TYPES = Object.freeze([
  "authority_timing_signal",
  "replacement_ela_signal",
  "consolidation_signal",
  "vat_transition_signal",
  "document_request_signal",
  "notice_stage_signal",
  "deadline_signal",
  "service_signal",
  "prescription_signal",
  "scope_signal",
  "safeguard_signal",
  "human_review_signal",
  "unknown_signal"
]);

export const SUPPORTED_2026_AUDIT_BASELINE_ROUTES = Object.freeze([
  "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
  "BIR_NOTICE_TRIAGE",
  "PAN_FAN_FLD_PROTEST_WORKFLOW",
  "BIR_AUDIT_DEFENSE_MATRIX",
  "DOCUMENT_COMPLIANCE_TRANSMITTAL",
  "AUTHORITY_CORPUS_RESEARCH",
  "HUMAN_TAX_LEGAL_REVIEW",
  "PHASE_09_GATE_CLOSURE_REVIEW"
]);

export const SUPPORTED_2026_AUDIT_BASELINE_RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical", "unknown"]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze(["official_reference_required", "uploaded_reference_pattern", "future_authority_corpus_required", "procedural_design_reference", "private_uploaded_pattern"]);

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "RMO No. 1-2026 single-instance audit baseline",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for one eLA per taxable year, consolidation, standardized checklist, document request safeguards, and audit safeguards. This scaffold performs no live verification."
  }),
  Object.freeze({
    label: "RMO No. 6-2026 consolidation safeguards",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for consolidation dates, FAN/FDDA/finality limits, fresh response/protest periods, proper service, written conformity, waiver, and no-regression rule. This scaffold performs no live verification."
  }),
  Object.freeze({
    label: "RMC No. 14-2026 replacement eLA and transition clarification",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for replacement eLA continuity, prior LOA/eLA validity, TVN scope, prior notices, VAT non-consolidation, and VATAS/LTVAU transition. This scaffold performs no live verification."
  }),
  Object.freeze({
    label: "RMC No. 5-2026 LOA/eLA verification reference",
    sourceType: "BIR issuance",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for BIR REVIE / LOA Verifier workflow. This scaffold performs no live verification."
  }),
  Object.freeze({
    label: "RR No. 18-2013 and NIRC Sec. 228 assessment procedure reference",
    sourceType: "BIR regulation / Tax Code",
    authorityTier: "official_reference_required",
    note: "Required checkpoint for PAN, FAN/FLD, protest, reinvestigation, inaction, FDDA, and due-process review. This scaffold performs no live verification."
  }),
  Object.freeze({
    label: "Private 2026 audit workflow reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "private_uploaded_pattern",
    note: "Private materials may guide workflow design only. They are not public authority and must never expose real taxpayer data."
  })
]);

const PROHIBITED_CLAIM_PHRASES = Object.freeze([
  "this authority was verified",
  "this source was downloaded",
  "this regulation was scraped",
  "the 2026 baseline is complete",
  "this is final legal authority",
  "this assessment is void",
  "this loa is invalid",
  "this ela is invalid",
  "this replacement ela is invalid",
  "this fan is invalid",
  "this fld is invalid",
  "this pan is invalid",
  "this fdda is invalid",
  "the bir cannot assess you",
  "the case is fully cancelled",
  "the assessment is cancelled",
  "you are permanently cleared",
  "all multiple elas are invalid",
  "all vatas audits are void",
  "replacement ela always restarts the audit",
  "replacement ela always requires new cir approval",
  "questioning the replacement ela suspends the audit",
  "prior notices are invalidated by replacement ela",
  "fdda cases can be consolidated",
  "final and executory fan can be consolidated",
  "records never need to be brought to bir",
  "all additional document requests are improper"
]);

const REAL_TAXPAYER_NAME_FRAGMENTS = Object.freeze(["TRUE FREIGHT GLOBAL LOGISTICS INC", "ALL ECARS INC", "SOCIAL HOMES INCORPORATED"]);
const REAL_OFFICER_NAME_FRAGMENTS = Object.freeze([
  "SUSAN F. SANTIAGO",
  "RENATO N. MOLINA",
  "PATRICIA ANN H. GUTIERREZ",
  "MARIA RUBIE AGANAN",
  "BRENNA ROSE VENERAYAN",
  "CECILLE ASILO",
  "MYRABEL DELA CRUZ",
  "AL-HELMEY F. ABDULRASHID",
  "ETHEL C. EVANGELISTA"
]);
const REAL_ELA_NUMBER_FRAGMENTS = Object.freeze(["eLA202400099140", "eLA202300040925", "eLA20240018917", "eLA202400055996"]);
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = Object.freeze(["AUDM16-00.8A-2025-016972", "AUDM29-048-2024-027259", "AUDM29-041-2026-150797"]);
const REAL_TIN_FRAGMENTS = Object.freeze(["008-826-456-000", "010-841-602-000", "005-055-069-00000"]);
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "15,000.00", "13,106,907.66", "13,545,329.75"]);

const PROHIBITED_CONCLUSION_LABELS = Object.freeze([
  "replacement_ela_validity_determination",
  "consolidation_requirement_determination",
  "consolidation_prohibition_determination",
  "final_legal_opinion",
  "live_authority_verification_claim",
  "assessment_validity_determination"
]);

// Static per-topic design metadata. Deliberately conservative: every
// safeInterpretation avoids validity/finality claims, and every
// prohibitedConclusion label names a determination this scaffold refuses
// to make.
const TOPIC_DEFINITIONS = Object.freeze({
  SINGLE_INSTANCE_AUDIT_FRAMEWORK: Object.freeze({
    signalType: "authority_timing_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["noticeType", "postRmo1Authority", "taxTypes"]),
    safeInterpretation: "This scenario may fall under the 2026 single-instance audit framework requiring one eLA per taxable year covering all applicable tax types. This scaffold does not decide validity.",
    prohibitedConclusion: Object.freeze(["single_instance_framework_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE", "AUTHORITY_CORPUS_RESEARCH"])
  }),
  ONE_ELA_PER_TAXABLE_YEAR: Object.freeze({
    signalType: "authority_timing_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["taxablePeriod", "multipleAuthoritiesSameYear"]),
    safeInterpretation: "This scenario may raise the one-eLA-per-taxable-year checkpoint. This scaffold does not decide whether the count of authorities is proper.",
    prohibitedConclusion: Object.freeze(["ela_count_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  ALL_TAX_TYPES_IN_ONE_ELA: Object.freeze({
    signalType: "scope_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["taxTypes"]),
    safeInterpretation: "This scenario may raise the all-applicable-tax-types-in-one-eLA checkpoint. This scaffold does not decide whether coverage is proper.",
    prohibitedConclusion: Object.freeze(["tax_type_coverage_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  CONSOLIDATION_OF_PENDING_ELAS: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["multipleAuthoritiesSameYear", "consolidatedPan", "consolidatedFan"]),
    safeInterpretation: "Consolidation treatment depends on stage, service, dates, finality, FDDA status, written conformity, waiver, and safeguards. This scaffold does not decide whether consolidation is required or prohibited.",
    prohibitedConclusion: Object.freeze(["consolidation_requirement_determination", "consolidation_prohibition_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  REPLACEMENT_ELA_FOR_CONSOLIDATION: Object.freeze({
    signalType: "replacement_ela_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026", "RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["replacementEla", "replacementReason"]),
    safeInterpretation: "A replacement eLA issued for consolidation may raise continuity, scope, service, and authority issues. This scaffold does not decide validity.",
    prohibitedConclusion: Object.freeze(["replacement_ela_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  REPLACEMENT_ELA_FOR_CONTINUITY: Object.freeze({
    signalType: "replacement_ela_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026", "RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["replacementEla", "replacementReason", "sameTaxpayer", "sameTaxablePeriod", "sameScope"]),
    safeInterpretation: "A replacement eLA may raise continuity, scope, service, and authority issues. This scaffold does not decide validity.",
    prohibitedConclusion: Object.freeze(["replacement_ela_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE"])
  }),
  PRIOR_LOA_ELA_VALIDITY: Object.freeze({
    signalType: "authority_timing_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026", "LOA_ELA_JURISPRUDENCE"]),
    factsConsidered: Object.freeze(["preRmo1Authority", "postRmo1Authority"]),
    safeInterpretation: "Whether a prior LOA/eLA remains a valid basis after RMO No. 1-2026 requires official-source verification. This scaffold does not decide validity.",
    prohibitedConclusion: Object.freeze(["prior_authority_validity_determination"]),
    recommendedRoute: Object.freeze(["AUTHORITY_CORPUS_RESEARCH"])
  }),
  PROSPECTIVE_APPLICATION_OF_RMO_1_2026: Object.freeze({
    signalType: "authority_timing_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["preRmo1Authority", "postRmo1Authority"]),
    safeInterpretation: "RMO No. 1-2026's prospective effect on prior authorities requires official-source verification. This scaffold does not decide validity.",
    prohibitedConclusion: Object.freeze(["rmo1_prospective_effect_determination"]),
    recommendedRoute: Object.freeze(["AUTHORITY_CORPUS_RESEARCH"])
  }),
  MULTIPLE_ELAS_SAME_TAXPAYER_YEAR: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["multipleAuthoritiesSameYear"]),
    safeInterpretation: "Multiple eLAs for the same taxpayer and taxable year raise a consolidation review point. This scaffold does not decide validity of any authority.",
    prohibitedConclusion: Object.freeze(["multiple_ela_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  VAT_NON_CONSOLIDATION_REQUEST: Object.freeze({
    signalType: "vat_transition_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026", "RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["vatAuditInvolved", "vatasOrLtvauInvolved", "multipleAuthoritiesSameYear"]),
    safeInterpretation: "VATAS/LTVAU transition depends on dates, pending audit status, VAT refund status, and consolidation rules.",
    prohibitedConclusion: Object.freeze(["vat_non_consolidation_outcome_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  VATAS_LTVAU_TRANSITION: Object.freeze({
    signalType: "vat_transition_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026", "RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["vatasOrLtvauInvolved", "vatAuditInvolved"]),
    safeInterpretation: "VATAS/LTVAU transition depends on dates, pending audit status, VAT refund status, and consolidation rules.",
    prohibitedConclusion: Object.freeze(["vatas_ltvau_transition_outcome_determination"]),
    recommendedRoute: Object.freeze(["AUTHORITY_CORPUS_RESEARCH"])
  }),
  VAT_REFUND_TRANSITION: Object.freeze({
    signalType: "vat_transition_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026"]),
    factsConsidered: Object.freeze(["vatRefundInvolved"]),
    safeInterpretation: "VAT refund transition depends on dates, pending audit status, and applicable transition rules. This scaffold does not decide refund eligibility.",
    prohibitedConclusion: Object.freeze(["vat_refund_eligibility_determination"]),
    recommendedRoute: Object.freeze(["AUTHORITY_CORPUS_RESEARCH"])
  }),
  MISSION_ORDER: Object.freeze({
    signalType: "notice_stage_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["noticeType"]),
    safeInterpretation: "A Mission Order raises a distinct notice-stage review point requiring official-source verification of scope and authority.",
    prohibitedConclusion: Object.freeze(["mission_order_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE"])
  }),
  TAX_VERIFICATION_NOTICE: Object.freeze({
    signalType: "notice_stage_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["tvnInvolved", "noticeType"]),
    safeInterpretation: "A Tax Verification Notice is limited to the transaction, declaration, or claim stated in the notice. Broader audit activity requires authority verification.",
    prohibitedConclusion: Object.freeze(["tvn_scope_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE"])
  }),
  TVN_LIMITED_SCOPE: Object.freeze({
    signalType: "scope_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["tvnInvolved"]),
    safeInterpretation: "A TVN is limited to the transaction, declaration, or claim stated in the notice. Broader audit activity requires authority verification.",
    prohibitedConclusion: Object.freeze(["tvn_scope_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE"])
  }),
  TVN_SCOPE_EXPANSION_RISK: Object.freeze({
    signalType: "scope_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["tvnScopeExpansion"]),
    safeInterpretation: "A separate eLA may be needed for a broader audit; this scaffold cannot conclude whether one is required. Official-source verification remains required.",
    prohibitedConclusion: Object.freeze(["tvn_scope_expansion_determination"]),
    recommendedRoute: Object.freeze(["BIR_NOTICE_TRIAGE", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  STANDARDIZED_CHECKLIST: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["checklistInvolved", "additionalDocumentRequest"]),
    safeInterpretation: "Document compliance should be controlled and itemized against the standardized checklist. Do not fabricate unavailable or non-existent documents.",
    prohibitedConclusion: Object.freeze(["checklist_completeness_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  ADDITIONAL_DOCUMENT_REQUEST_LIMITS: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["additionalDocumentRequest"]),
    safeInterpretation: "Additional document requests should be checked for relevance, necessity, scope, explanation, and documentation. This scaffold does not decide whether a request is proper.",
    prohibitedConclusion: Object.freeze(["additional_request_propriety_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  DOCUMENT_REQUEST_RELEVANCE_NECESSITY_SCOPE: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["additionalDocumentRequest"]),
    safeInterpretation: "Relevance, necessity, audit scope, explanation, and documentation should all be checked for any additional document request.",
    prohibitedConclusion: Object.freeze(["additional_request_propriety_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  VOLUMINOUS_RECORDS: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["voluminousRecords"]),
    safeInterpretation: "Voluminous records may support an on-premise examination or certified-copy submission arrangement. Records should be organized, not withheld.",
    prohibitedConclusion: Object.freeze(["voluminous_records_exemption_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  ON_PREMISE_EXAMINATION: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["voluminousRecords"]),
    safeInterpretation: "On-premise examination potential should be checked against the standardized checklist and document request scope.",
    prohibitedConclusion: Object.freeze(["on_premise_examination_requirement_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  CERTIFIED_COPY_SUBMISSION: Object.freeze({
    signalType: "document_request_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026"]),
    factsConsidered: Object.freeze(["voluminousRecords"]),
    safeInterpretation: "Certified-copy or photocopy submission potential should be tracked with receiving proof once confirmed applicable.",
    prohibitedConclusion: Object.freeze(["certified_copy_requirement_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  NOD_DOD_DOCUMENTATION: Object.freeze({
    signalType: "notice_stage_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["NIRC_SEC_228"]),
    factsConsidered: Object.freeze(["noticeType"]),
    safeInterpretation: "NOD/DOD documentation should be organized and preserved. This scaffold does not decide the outcome of any notice of discrepancy.",
    prohibitedConclusion: Object.freeze(["nod_dod_outcome_determination"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW"])
  }),
  PAN_CONSOLIDATION_SAFEGUARDS: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228", "RR_NO_18_2013"]),
    factsConsidered: Object.freeze(["consolidatedPan"]),
    safeInterpretation: "A consolidated PAN raises safeguard checkpoints for proper service, dates, and response-period treatment. This scaffold does not decide whether consolidation was proper.",
    prohibitedConclusion: Object.freeze(["pan_consolidation_propriety_determination"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW"])
  }),
  CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD: Object.freeze({
    signalType: "deadline_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228"]),
    factsConsidered: Object.freeze(["consolidatedPan"]),
    safeInterpretation: "A consolidated PAN may trigger a fresh response-period checkpoint. This scaffold flags the potential only and computes no deadline.",
    prohibitedConclusion: Object.freeze(["response_period_computation_claim"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW"])
  }),
  FAN_CONSOLIDATION_SAFEGUARDS: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228", "RR_NO_18_2013"]),
    factsConsidered: Object.freeze(["consolidatedFan"]),
    safeInterpretation: "A consolidated FAN raises safeguard checkpoints for proper service, dates, and protest-period treatment. This scaffold does not decide whether consolidation was proper.",
    prohibitedConclusion: Object.freeze(["fan_consolidation_propriety_determination"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW"])
  }),
  CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD: Object.freeze({
    signalType: "deadline_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228"]),
    factsConsidered: Object.freeze(["consolidatedFan"]),
    safeInterpretation: "A consolidated FAN may trigger a fresh protest-period checkpoint. This scaffold flags the potential only and computes no deadline.",
    prohibitedConclusion: Object.freeze(["protest_period_computation_claim"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW"])
  }),
  FDDA_NO_CONSOLIDATION: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228"]),
    factsConsidered: Object.freeze(["fddaStage"]),
    safeInterpretation: "FDDA-stage cases carry a no-consolidation safeguard. This issue requires official-source verification before relying on any consolidation approach.",
    prohibitedConclusion: Object.freeze(["fdda_consolidation_determination"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  FINAL_EXECUTORY_FAN_NO_CONSOLIDATION: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "critical",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026", "NIRC_SEC_228"]),
    factsConsidered: Object.freeze(["finalExecutoryFan"]),
    safeInterpretation: "A final and executory FAN carries a no-consolidation safeguard. This is a high-priority checkpoint requiring immediate human tax/legal review.",
    prohibitedConclusion: Object.freeze(["final_executory_fan_consolidation_determination"]),
    recommendedRoute: Object.freeze(["PAN_FAN_FLD_PROTEST_WORKFLOW", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  PROPER_SERVICE: Object.freeze({
    signalType: "service_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["NIRC_SEC_228", "RR_NO_18_2013"]),
    factsConsidered: Object.freeze(["noticeDate", "receiptDate"]),
    safeInterpretation: "Proper service should be checked against the notice/receipt dates and applicable service rules. This scaffold does not decide whether service was proper.",
    prohibitedConclusion: Object.freeze(["service_validity_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  WRITTEN_CONFORMITY_TO_CONSOLIDATION: Object.freeze({
    signalType: "consolidation_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["writtenConformityPresent"]),
    safeInterpretation: "Whether written conformity to consolidation was required and properly obtained requires official-source verification.",
    prohibitedConclusion: Object.freeze(["written_conformity_sufficiency_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  WAIVER_OF_PRESCRIPTION: Object.freeze({
    signalType: "prescription_signal",
    riskLevel: "high",
    authorityReferencesNeeded: Object.freeze(["NIRC_SEC_222", "PRESCRIPTION_JURISPRUDENCE"]),
    factsConsidered: Object.freeze(["waiverOfPrescriptionPresent"]),
    safeInterpretation: "A waiver of the statute of limitations raises prescription-period review points. This scaffold does not decide the validity or effect of any waiver.",
    prohibitedConclusion: Object.freeze(["waiver_validity_determination", "prescription_period_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  NO_REGRESSION_RULE: Object.freeze({
    signalType: "safeguard_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_6_2026"]),
    factsConsidered: Object.freeze(["consolidatedPan", "consolidatedFan", "fddaStage", "finalExecutoryFan"]),
    safeInterpretation: "The no-regression rule should be checked whenever consolidation or a replacement notice is involved. This scaffold does not decide whether the rule was honored.",
    prohibitedConclusion: Object.freeze(["no_regression_compliance_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX"])
  }),
  PRIOR_NOTICES_CHECKLISTS_SUBPOENAS_UNDER_REPLACEMENT_ELA: Object.freeze({
    signalType: "replacement_ela_signal",
    riskLevel: "medium",
    authorityReferencesNeeded: Object.freeze(["RMC_NO_14_2026"]),
    factsConsidered: Object.freeze(["replacementEla"]),
    safeInterpretation: "Whether prior notices, checklists, or subpoenas remain in effect under a replacement eLA requires official-source verification.",
    prohibitedConclusion: Object.freeze(["prior_notice_continuity_determination"]),
    recommendedRoute: Object.freeze(["DOCUMENT_COMPLIANCE_TRANSMITTAL"])
  }),
  AUDIT_SAFEGUARDS: Object.freeze({
    signalType: "safeguard_signal",
    riskLevel: "low",
    authorityReferencesNeeded: Object.freeze(["RMO_NO_1_2026", "RMO_NO_6_2026"]),
    factsConsidered: Object.freeze([]),
    safeInterpretation: "General 2026 audit safeguards apply as a baseline review checkpoint for this scenario. This scaffold provides procedural-safe baseline integration only.",
    prohibitedConclusion: Object.freeze(["general_audit_safeguard_compliance_determination"]),
    recommendedRoute: Object.freeze(["BIR_AUDIT_DEFENSE_MATRIX", "HUMAN_TAX_LEGAL_REVIEW"])
  }),
  UNKNOWN_2026_BASELINE_TOPIC: Object.freeze({
    signalType: "unknown_signal",
    riskLevel: "unknown",
    authorityReferencesNeeded: Object.freeze(["UNKNOWN_AUTHORITY_REFERENCE"]),
    factsConsidered: Object.freeze([]),
    safeInterpretation: "This topic could not be classified against the 2026 audit baseline. Human tax/legal review remains required.",
    prohibitedConclusion: Object.freeze(["unclassified_topic_determination"]),
    recommendedRoute: Object.freeze(["HUMAN_TAX_LEGAL_REVIEW"])
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

function dedupe(arr) {
  return [...new Set(arr)];
}

function triState(value) {
  if (value === true) return true;
  if (value === false) return false;
  return null;
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

function normalizeScenarioFacts(facts) {
  const src = isPlainObject(facts) ? facts : {};
  return {
    noticeType: isNonBlankString(src.noticeType) ? src.noticeType.trim() : "",
    noticeDate: isNonBlankString(src.noticeDate) ? src.noticeDate.trim() : "",
    receiptDate: isNonBlankString(src.receiptDate) ? src.receiptDate.trim() : "",
    taxablePeriod: isNonBlankString(src.taxablePeriod) ? src.taxablePeriod.trim() : "",
    taxTypes: normalizeStringArray(src.taxTypes),
    preRmo1Authority: src.preRmo1Authority === true,
    postRmo1Authority: src.postRmo1Authority === true,
    replacementEla: src.replacementEla === true,
    replacementReason: isNonBlankString(src.replacementReason) ? src.replacementReason.trim() : "",
    sameTaxpayer: triState(src.sameTaxpayer),
    sameTaxablePeriod: triState(src.sameTaxablePeriod),
    sameScope: triState(src.sameScope),
    multipleAuthoritiesSameYear: src.multipleAuthoritiesSameYear === true,
    vatAuditInvolved: src.vatAuditInvolved === true,
    vatasOrLtvauInvolved: src.vatasOrLtvauInvolved === true,
    vatRefundInvolved: src.vatRefundInvolved === true,
    fddaStage: src.fddaStage === true,
    finalExecutoryFan: src.finalExecutoryFan === true,
    consolidatedPan: src.consolidatedPan === true,
    consolidatedFan: src.consolidatedFan === true,
    waiverOfPrescriptionPresent: src.waiverOfPrescriptionPresent === true,
    writtenConformityPresent: src.writtenConformityPresent === true,
    voluminousRecords: src.voluminousRecords === true,
    additionalDocumentRequest: src.additionalDocumentRequest === true,
    checklistInvolved: src.checklistInvolved === true,
    tvnInvolved: src.tvnInvolved === true,
    tvnScopeExpansion: src.tvnScopeExpansion === true
  };
}

function categorizeReplacementReason(reason) {
  const r = (reason || "").toLowerCase();
  if (!r) return "unknown";
  if (/continu|reassign|restructur|substitut/i.test(r)) return "continuity";
  if (/consolidat/i.test(r)) return "consolidation";
  return "unknown";
}

/**
 * Derives the set of 2026 audit-baseline topics triggered by a normalized
 * scenarioFacts object. Pure, synchronous, never mutates input. Always
 * includes AUDIT_SAFEGUARDS as a baseline safety-net topic so the result
 * never has an empty topic set.
 *
 * @param {object} facts normalized scenario facts
 * @returns {string[]}
 */
function deriveAutoTopics(facts) {
  const topics = new Set();
  const reasonCategory = categorizeReplacementReason(facts.replacementReason);

  if (facts.replacementEla) {
    if (reasonCategory === "continuity") topics.add("REPLACEMENT_ELA_FOR_CONTINUITY");
    if (reasonCategory === "consolidation") topics.add("REPLACEMENT_ELA_FOR_CONSOLIDATION");
    if (facts.preRmo1Authority || facts.postRmo1Authority) topics.add("PRIOR_LOA_ELA_VALIDITY");
    topics.add("PROPER_SERVICE");
    topics.add("PRIOR_NOTICES_CHECKLISTS_SUBPOENAS_UNDER_REPLACEMENT_ELA");
  }

  if (facts.multipleAuthoritiesSameYear || facts.consolidatedPan || facts.consolidatedFan) {
    topics.add("CONSOLIDATION_OF_PENDING_ELAS");
    topics.add("MULTIPLE_ELAS_SAME_TAXPAYER_YEAR");
    topics.add("PROPER_SERVICE");
    topics.add("NO_REGRESSION_RULE");
  }
  if (facts.consolidatedPan) {
    topics.add("PAN_CONSOLIDATION_SAFEGUARDS");
    topics.add("CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD");
  }
  if (facts.consolidatedFan) {
    topics.add("FAN_CONSOLIDATION_SAFEGUARDS");
    topics.add("CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD");
  }
  if (facts.fddaStage) topics.add("FDDA_NO_CONSOLIDATION");
  if (facts.finalExecutoryFan) topics.add("FINAL_EXECUTORY_FAN_NO_CONSOLIDATION");

  if (facts.vatAuditInvolved || facts.vatasOrLtvauInvolved) {
    topics.add("VATAS_LTVAU_TRANSITION");
    if (facts.multipleAuthoritiesSameYear || facts.vatasOrLtvauInvolved) topics.add("VAT_NON_CONSOLIDATION_REQUEST");
  }
  if (facts.vatRefundInvolved) topics.add("VAT_REFUND_TRANSITION");

  if (facts.tvnInvolved) {
    topics.add("TAX_VERIFICATION_NOTICE");
    topics.add("TVN_LIMITED_SCOPE");
  }
  if (facts.tvnScopeExpansion) topics.add("TVN_SCOPE_EXPANSION_RISK");

  if (facts.checklistInvolved || facts.additionalDocumentRequest) topics.add("STANDARDIZED_CHECKLIST");
  if (facts.additionalDocumentRequest) {
    topics.add("ADDITIONAL_DOCUMENT_REQUEST_LIMITS");
    topics.add("DOCUMENT_REQUEST_RELEVANCE_NECESSITY_SCOPE");
  }
  if (facts.voluminousRecords) {
    topics.add("VOLUMINOUS_RECORDS");
    topics.add("ON_PREMISE_EXAMINATION");
    topics.add("CERTIFIED_COPY_SUBMISSION");
  }

  if (facts.waiverOfPrescriptionPresent) topics.add("WAIVER_OF_PRESCRIPTION");
  if (facts.writtenConformityPresent) topics.add("WRITTEN_CONFORMITY_TO_CONSOLIDATION");

  if (facts.noticeType && /PAN|FAN|FLD|FDDA|NOD|DOD/i.test(facts.noticeType)) {
    topics.add("PROPER_SERVICE");
    topics.add("NOD_DOD_DOCUMENTATION");
  }

  if (facts.noticeType && /LOA|ELA/i.test(facts.noticeType)) {
    topics.add("SINGLE_INSTANCE_AUDIT_FRAMEWORK");
    topics.add("ONE_ELA_PER_TAXABLE_YEAR");
    topics.add("ALL_TAX_TYPES_IN_ONE_ELA");
    topics.add("PROSPECTIVE_APPLICATION_OF_RMO_1_2026");
  }
  if (facts.noticeType && /MISSION/i.test(facts.noticeType)) topics.add("MISSION_ORDER");

  topics.add("AUDIT_SAFEGUARDS");

  return [...topics];
}

/**
 * Recursively scans a value (lowercased) for prohibited 2026-baseline
 * claim phrases. Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
function detectProhibited2026BaselineClaims(value) {
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

function detectRealDataLeak(value) {
  const raw = JSON.stringify(value);
  const upper = raw.toUpperCase();
  const matches = [];
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) matches.push(`taxpayer_name:${fragment}`);
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) matches.push(`officer_name:${fragment}`);
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if (raw.includes(fragment)) matches.push(`ela_number:${fragment}`);
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if (raw.includes(fragment)) matches.push(`audit_case_number:${fragment}`);
  for (const fragment of REAL_TIN_FRAGMENTS) if (raw.includes(fragment)) matches.push(`tin:${fragment}`);
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if (raw.includes(fragment)) matches.push(`assessment_amount:${fragment}`);
  return { hasRealDataLeak: matches.length > 0, matches };
}

function containsRealDataFragments(text) {
  const upper = (text || "").toUpperCase();
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "taxpayer name";
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "BIR officer name";
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "LOA/eLA number";
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "audit case number";
  for (const fragment of REAL_TIN_FRAGMENTS) if ((text || "").includes(fragment)) return "TIN";
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if ((text || "").includes(fragment)) return "assessment amount";
  return null;
}

/**
 * Normalizes candidate 2026 BIR audit baseline integration input into a
 * defensive, fully-shaped object. Never mutates input; never throws.
 * Always forces every runtime/legal/live/real-data/filing/submission
 * option flag to its safe value, never infers a final legal/validity
 * status, and defaults missing target topics from scenario facts where
 * safe (via deriveAutoTopics) so the normalized target-topic set is never
 * empty. validateBir2026AuditBaselineIntegrationInput() is the gate that
 * flags an attempt to request unsafe values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeBir2026AuditBaselineIntegrationInput(input) {
  const src = isPlainObject(input) ? input : {};
  const scenarioFacts = normalizeScenarioFacts(src.scenarioFacts);
  const requestedTopics = normalizeStringArray(src.targetTopics).filter((topic) => SUPPORTED_2026_AUDIT_BASELINE_TOPICS.includes(topic));

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    scenarioFacts,
    targetTopics: requestedTopics.length > 0 ? dedupe(requestedTopics) : deriveAutoTopics(scenarioFacts),
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      allowLegalConclusion: false,
      allowLiveRetrieval: false,
      allowRealTaxpayerData: false,
      generateFilingReadyDocument: false,
      automaticSubmission: false
    },
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).map((card) => normalizeSourceCard(card))
  };
}

const LIVE_ACTION_REQUEST_PATTERN =
  /\b(?:scrape|scraping|download|downloading|search the web|web search|ingest|ingesting|embed|embedding|ocr|optical character recognition)\b|\bstore\s+(?:it|this|these|that)?\s*in\s+(?:a\s+|the\s+)?database\b/i;

const ASK_WIRE_REQUEST_PATTERN =
  /wire\s+(?:this|it)\s+(?:to|into)\s+\/ask|connect\s+(?:this|it)\s+to\s+\/ask|expose\s+(?:this|it)\s+(?:via|through)\s+\/ask|hook\s+(?:this|it)\s+into\s+\/ask|integrate\s+(?:this|it)\s+(?:with|into)\s+\/ask/i;

const FINALITY_CLAIM_PATTERN = /\b(?:replacement\s+ela|consolidated\s+ela|loa|pan|fan|fld|fdda|assessment)\s+is\s+(?:valid|invalid|void|cancelled|final|enforceable)\b/i;

const VERIFICATION_CLAIM_PATTERN = /verification (?:is |has been )?complete|officially verified|final authority verification/i;

const LEGAL_CONCLUSION_CLAIM_PATTERN = /final legal conclusion|final legal opinion|official legal advice|legally conclusive/i;

/**
 * Validates candidate 2026 BIR audit baseline integration input. Never
 * throws. Rejects missing input, missing userQuery and targetTopics
 * together, unsupported target topics/authority references, unsafe
 * runtime/legal/live option values, source cards claiming completed
 * verification or a final legal conclusion, requests to wire to /ask or
 * to perform live search/scraping/download/ingestion/OCR, claims that any
 * LOA/eLA/PAN/FAN/FDDA is valid/invalid/void/cancelled/final/enforceable,
 * and any known real taxpayer/officer name, real TIN, real LOA/eLA/audit-
 * case number, or exact real assessment amount from the private reference
 * corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBir2026AuditBaselineIntegrationInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  const hasTargetTopics = Array.isArray(input.targetTopics) && input.targetTopics.length > 0;
  if (!userQuery && !hasTargetTopics) {
    errors.push("input must supply either userQuery or targetTopics");
  }

  if (LIVE_ACTION_REQUEST_PATTERN.test(userQuery)) {
    errors.push("input must not request live search, scraping, downloading, ingestion, embedding, OCR, or database storage");
  }
  if (ASK_WIRE_REQUEST_PATTERN.test(userQuery)) {
    errors.push("input must not request wiring this scaffold to /ask");
  }
  if (FINALITY_CLAIM_PATTERN.test(userQuery)) {
    errors.push("input must not claim that any LOA/eLA/PAN/FAN/FLD/FDDA/assessment is valid, invalid, void, cancelled, final, or enforceable");
  }

  const targetTopics = Array.isArray(input.targetTopics) ? input.targetTopics : [];
  targetTopics.forEach((topic, index) => {
    if (typeof topic === "string" && !SUPPORTED_2026_AUDIT_BASELINE_TOPICS.includes(topic)) {
      errors.push(`targetTopics[${index}] unsupported topic: ${JSON.stringify(topic)}`);
    }
  });

  const authorityReferences = Array.isArray(input.authorityReferences) ? input.authorityReferences : [];
  authorityReferences.forEach((ref, index) => {
    if (typeof ref === "string" && !SUPPORTED_2026_AUDIT_BASELINE_AUTHORITY_REFERENCES.includes(ref)) {
      errors.push(`authorityReferences[${index}] unsupported authority reference: ${JSON.stringify(ref)}`);
    }
  });

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");
  if (options.generateFilingReadyDocument === true) errors.push("generateFilingReadyDocument must not be true");
  if (options.automaticSubmission === true) errors.push("automaticSubmission must not be true");
  if (options.scaffoldOnly === false) errors.push("scaffoldOnly must not be false");

  const sourceCards = Array.isArray(input.sourceCards) ? input.sourceCards : [];
  sourceCards.forEach((card, index) => {
    if (isPlainObject(card)) {
      const combined = `${card.label || ""} ${card.note || ""}`;
      if (VERIFICATION_CLAIM_PATTERN.test(combined)) errors.push(`sourceCards[${index}] must not claim completed authority verification`);
      if (LEGAL_CONCLUSION_CLAIM_PATTERN.test(combined)) errors.push(`sourceCards[${index}] must not claim a final legal conclusion`);
      if (FINALITY_CLAIM_PATTERN.test(combined)) errors.push(`sourceCards[${index}] must not claim any authority/notice is valid/invalid/void/cancelled/final/enforceable`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.scenarioFacts || {})} ${JSON.stringify(input.sourceCards || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function buildBaselineSignal(topic, facts) {
  const definition = TOPIC_DEFINITIONS[topic] || TOPIC_DEFINITIONS.UNKNOWN_2026_BASELINE_TOPIC;
  return {
    topic,
    signalType: definition.signalType,
    riskLevel: definition.riskLevel,
    authorityReferencesNeeded: [...definition.authorityReferencesNeeded],
    factsConsidered: [...definition.factsConsidered],
    safeInterpretation: definition.safeInterpretation,
    prohibitedConclusion: [...definition.prohibitedConclusion],
    recommendedRoute: [...definition.recommendedRoute],
    humanReviewRequired: true
  };
}

/**
 * Builds a full 2026 BIR audit baseline integration result for the given
 * (raw or normalized) input. Never throws. Always returns the full result
 * shape regardless of input validity -- callers should call
 * validateBir2026AuditBaselineIntegrationInput() beforehand to gate
 * whether to proceed. Performs no I/O, no network calls, no live
 * retrieval, scraping, downloading, ingestion, embedding, or database
 * writes; integrates 2026 audit-baseline concepts as review signals only
 * and never decides validity, invalidity, voidness, cancellation,
 * finality, enforceability, or appealability of any authority or notice.
 *
 * @param {*} input
 * @returns {object}
 */
export function createBir2026AuditBaselineIntegrationResult(input) {
  const normalized = normalizeBir2026AuditBaselineIntegrationInput(input);
  const facts = normalized.scenarioFacts;
  const reasonCategory = categorizeReplacementReason(facts.replacementReason);

  const autoTopics = deriveAutoTopics(facts);
  const finalTopics = dedupe([...normalized.targetTopics, ...autoTopics]);

  const baselineSignals = finalTopics.map((topic) => buildBaselineSignal(topic, facts));

  const authorityReferencesNeeded = dedupe(baselineSignals.flatMap((signal) => signal.authorityReferencesNeeded));

  const confidence = facts.noticeType ? "high" : finalTopics.length > 1 ? "medium" : "low";

  const baselineSummary = {
    totalTopics: finalTopics.length,
    triggeredTopics: finalTopics,
    authorityReferencesNeeded,
    liveAuthorityVerificationPerformed: false,
    legalConclusionProvided: false,
    humanReviewRequired: true,
    confidence
  };

  const replacementElaSignal = facts.replacementEla;
  const scopeUnclearOrDifferent = facts.sameScope === false || facts.sameScope === null;
  const periodUnclearOrDifferent = facts.sameTaxablePeriod === false || facts.sameTaxablePeriod === null;

  const replacementElaReview = {
    replacementElaSignal,
    continuityReasonPresent: replacementElaSignal && reasonCategory === "continuity",
    sameTaxpayer: facts.sameTaxpayer,
    sameTaxablePeriod: facts.sameTaxablePeriod,
    sameScope: facts.sameScope,
    scopeExpansionRisk: replacementElaSignal && scopeUnclearOrDifferent,
    taxablePeriodExpansionRisk: replacementElaSignal && periodUnclearOrDifferent,
    properServiceCheckNeeded: replacementElaSignal,
    rmc14ReviewNeeded: replacementElaSignal,
    rmo1ReviewNeeded: replacementElaSignal,
    rmo6ReviewNeeded: replacementElaSignal,
    safeWarning: "A replacement eLA may raise continuity, scope, service, and authority issues. This scaffold does not decide validity."
  };

  const consolidationPotential = Boolean(facts.multipleAuthoritiesSameYear || facts.consolidatedPan || facts.consolidatedFan || (replacementElaSignal && reasonCategory === "consolidation"));

  const consolidationReview = {
    multipleAuthoritiesSameYear: facts.multipleAuthoritiesSameYear,
    consolidationPotential,
    consolidationRequiredCannotBeConcluded: true,
    consolidationProhibitedCannotBeConcluded: true,
    fddaStage: facts.fddaStage,
    finalExecutoryFan: facts.finalExecutoryFan,
    consolidatedPan: facts.consolidatedPan,
    consolidatedFan: facts.consolidatedFan,
    freshPanResponsePeriodPotential: facts.consolidatedPan,
    freshFanProtestPeriodPotential: facts.consolidatedFan,
    noRegressionRuleCheckNeeded: Boolean(consolidationPotential || facts.fddaStage || facts.finalExecutoryFan),
    properServiceCheckNeeded: consolidationPotential,
    writtenConformityCheckNeeded: Boolean(consolidationPotential || facts.writtenConformityPresent),
    waiverCheckNeeded: Boolean(facts.waiverOfPrescriptionPresent || consolidationPotential),
    safeWarning: "Consolidation treatment depends on stage, service, dates, finality, FDDA status, written conformity, waiver, and safeguards. This scaffold does not decide whether consolidation is required or prohibited."
  };

  const vatNonConsolidationPotential = Boolean(facts.vatAuditInvolved && (facts.multipleAuthoritiesSameYear || facts.vatasOrLtvauInvolved));

  const vatTransitionReview = {
    vatAuditInvolved: facts.vatAuditInvolved,
    vatasOrLtvauInvolved: facts.vatasOrLtvauInvolved,
    vatRefundTransitionPotential: facts.vatRefundInvolved,
    vatNonConsolidationPotential,
    vatNonConsolidationDeadlineRelevant: vatNonConsolidationPotential,
    safeWarning: "VATAS/LTVAU transition depends on dates, pending audit status, VAT refund status, and consolidation rules."
  };

  const documentRequestReview = {
    standardizedChecklistCheckNeeded: Boolean(facts.checklistInvolved || facts.additionalDocumentRequest),
    additionalRequestLimitCheckNeeded: facts.additionalDocumentRequest,
    relevanceCheckNeeded: facts.additionalDocumentRequest,
    necessityCheckNeeded: facts.additionalDocumentRequest,
    auditScopeCheckNeeded: facts.additionalDocumentRequest,
    explanationDocumentationCheckNeeded: facts.additionalDocumentRequest,
    voluminousRecordsCheckNeeded: facts.voluminousRecords,
    onPremiseExaminationPotential: facts.voluminousRecords,
    certifiedCopySubmissionPotential: facts.voluminousRecords,
    safeWarning: "Document compliance should be controlled and itemized. Additional requests should be checked for relevance, necessity, scope, explanation, and documentation. Do not fabricate unavailable or non-existent documents."
  };

  const tvnReview = {
    tvnInvolved: facts.tvnInvolved,
    tvnLimitedScopeCheckNeeded: facts.tvnInvolved,
    tvnScopeExpansionRisk: facts.tvnScopeExpansion,
    separateElaMayBeNeededForBroaderAuditCannotBeConcluded: true,
    safeWarning: "A TVN is limited to the transaction, declaration, or claim stated in the notice. Broader audit activity requires authority verification."
  };

  const proceduralSafeguards = {
    properServiceCheckNeeded: true,
    dueProcessCheckNeeded: true,
    statementOfFactsAndLawCheckNeeded: true,
    priorNoticeConsistencyCheckNeeded: Boolean(replacementElaSignal || consolidationPotential),
    noRegressionRuleCheckNeeded: Boolean(consolidationPotential || facts.fddaStage || facts.finalExecutoryFan || replacementElaSignal),
    prescriptionCheckNeeded: true,
    humanReviewRequired: true
  };

  const hasNoticeType = Boolean(facts.noticeType);
  const protestRelevant = Boolean(facts.consolidatedPan || facts.consolidatedFan || facts.fddaStage || facts.finalExecutoryFan || (hasNoticeType && /PAN|FAN|FLD|FDDA/i.test(facts.noticeType)));
  const documentComplianceRelevant = Boolean(facts.additionalDocumentRequest || facts.voluminousRecords || facts.checklistInvolved || hasNoticeType);

  const integrationRoutes = {
    authoritySafeFallback: true,
    noticeTriage: hasNoticeType,
    protestWorkflow: protestRelevant,
    auditDefenseMatrix: finalTopics.length > 0,
    documentComplianceTransmittal: documentComplianceRelevant,
    authorityCorpusResearch: true,
    humanReview: true,
    gateClosureReview: true
  };

  const combinedSourceCards = [...normalized.sourceCards, ...BASE_SOURCE_CARDS.map((card) => ({ ...card }))];

  const safeWarnings = dedupe([
    replacementElaReview.safeWarning,
    consolidationReview.safeWarning,
    vatTransitionReview.safeWarning,
    documentRequestReview.safeWarning,
    tvnReview.safeWarning,
    "The available facts are insufficient for a final legal conclusion.",
    "This scaffold provides procedural-safe 2026 baseline integration only.",
    "Human tax/legal review remains required."
  ]);

  const recommendedNextActions = [
    "Verify each applicable 2026 authority (RMO No. 1-2026, RMO No. 6-2026, RMC No. 14-2026, RMC No. 5-2026) against its official source before relying on it.",
    "Route this scenario to the appropriate Phase 9 workflow (notice triage, protest workflow, audit defense matrix, document compliance) for further structuring.",
    "Escalate replacement eLA, consolidation, FDDA, and final/executory FAN scenarios to human tax/legal review.",
    "Preserve procedural safeguards: proper service, due process, no-regression rule, and prescription checks."
  ];

  const prohibitedConclusions = dedupe([
    ...baselineSignals.flatMap((signal) => signal.prohibitedConclusion),
    ...PROHIBITED_CONCLUSION_LABELS
  ]);

  return {
    phase: "09S",
    mode: BIR_2026_AUDIT_BASELINE_INTEGRATION_MODE_ID,
    version: PHASE_09S_2026_BIR_AUDIT_BASELINE_INTEGRATION_VERSION,
    runtimeActive: false,
    baselineSummary,
    baselineSignals,
    replacementElaReview,
    consolidationReview,
    vatTransitionReview,
    documentRequestReview,
    tvnReview,
    proceduralSafeguards,
    integrationRoutes,
    sourceCards: combinedSourceCards,
    safeWarnings,
    recommendedNextActions,
    prohibitedConclusions,
    humanReviewNotice:
      "This scaffold integrates 2026 BIR audit-baseline concepts as design-level review signals only and does not constitute a final legal or tax conclusion. No authority referenced here has been live-verified, downloaded, scraped, ingested, or embedded by this patch, and no LOA/eLA/replacement eLA/consolidated notice/PAN/FAN/FLD/FDDA/assessment is determined to be valid, invalid, void, cancelled, final, or enforceable. Official-source verification remains required, and this matter should be reviewed by a qualified tax professional before any legal or tax conclusion.",
    metadata: {
      scaffoldOnly: true,
      legalConclusionProvided: false,
      liveRetrievalPerformed: false,
      externalSearchPerformed: false,
      scrapingPerformed: false,
      downloadPerformed: false,
      ingestionPerformed: false,
      embeddingPerformed: false,
      databaseWritePerformed: false,
      realTaxpayerDataUsed: false,
      filingReadyDocumentGenerated: false,
      automaticSubmission: false,
      finalOutcomeGuaranteed: false
    }
  };
}

/**
 * Validates a candidate 2026 BIR audit baseline integration result
 * object. Never throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBir2026AuditBaselineIntegrationResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.baselineSummary)) errors.push("baselineSummary is required");

  if (!Array.isArray(result.baselineSignals) || result.baselineSignals.length === 0) {
    errors.push("baselineSignals is required and must not be empty");
  } else {
    result.baselineSignals.forEach((signal, index) => {
      if (!isPlainObject(signal)) {
        errors.push(`baselineSignals[${index}] must be an object`);
        return;
      }
      if (!SUPPORTED_2026_AUDIT_BASELINE_TOPICS.includes(signal.topic)) errors.push(`baselineSignals[${index}] unsupported topic: ${signal.topic}`);
      if (!SUPPORTED_2026_AUDIT_BASELINE_SIGNAL_TYPES.includes(signal.signalType)) errors.push(`baselineSignals[${index}] unsupported signalType: ${signal.signalType}`);
      if (!SUPPORTED_2026_AUDIT_BASELINE_RISK_LEVELS.includes(signal.riskLevel)) errors.push(`baselineSignals[${index}] unsupported riskLevel: ${signal.riskLevel}`);
      if (signal.humanReviewRequired !== true) errors.push(`baselineSignals[${index}] humanReviewRequired must be true`);
    });
  }

  if (!isPlainObject(result.replacementElaReview)) errors.push("replacementElaReview is required");
  if (!isPlainObject(result.consolidationReview)) {
    errors.push("consolidationReview is required");
  } else {
    if (result.consolidationReview.consolidationRequiredCannotBeConcluded !== true) errors.push("consolidationReview.consolidationRequiredCannotBeConcluded must be true");
    if (result.consolidationReview.consolidationProhibitedCannotBeConcluded !== true) errors.push("consolidationReview.consolidationProhibitedCannotBeConcluded must be true");
  }
  if (!isPlainObject(result.vatTransitionReview)) errors.push("vatTransitionReview is required");
  if (!isPlainObject(result.documentRequestReview)) errors.push("documentRequestReview is required");
  if (!isPlainObject(result.tvnReview)) {
    errors.push("tvnReview is required");
  } else if (result.tvnReview.separateElaMayBeNeededForBroaderAuditCannotBeConcluded !== true) {
    errors.push("tvnReview.separateElaMayBeNeededForBroaderAuditCannotBeConcluded must be true");
  }
  if (!isPlainObject(result.proceduralSafeguards)) {
    errors.push("proceduralSafeguards is required");
  } else if (result.proceduralSafeguards.humanReviewRequired !== true) {
    errors.push("proceduralSafeguards.humanReviewRequired must be true");
  }
  if (!isPlainObject(result.integrationRoutes)) errors.push("integrationRoutes is required");

  if (!Array.isArray(result.safeWarnings)) errors.push("safeWarnings must be an array");
  if (!Array.isArray(result.recommendedNextActions)) errors.push("recommendedNextActions must be an array");
  if (!Array.isArray(result.prohibitedConclusions)) errors.push("prohibitedConclusions must be an array");

  if (!Array.isArray(result.sourceCards)) {
    errors.push("sourceCards is required");
  } else if (result.sourceCards.length === 0) {
    errors.push("sourceCards must not be empty");
  } else {
    result.sourceCards.forEach((card, index) => {
      if (isPlainObject(card)) {
        if (VERIFICATION_CLAIM_PATTERN.test(`${card.label || ""} ${card.note || ""}`)) errors.push(`sourceCards[${index}] must not claim completed authority verification`);
      }
    });
  }
  if (!isNonBlankString(result.humanReviewNotice)) errors.push("humanReviewNotice is required");

  const metadata = isPlainObject(result.metadata) ? result.metadata : {};
  if (metadata.scaffoldOnly !== true) errors.push("metadata.scaffoldOnly must be true");
  if (metadata.legalConclusionProvided !== false) errors.push("metadata.legalConclusionProvided must be false");
  if (metadata.liveRetrievalPerformed !== false) errors.push("metadata.liveRetrievalPerformed must be false");
  if (metadata.externalSearchPerformed !== false) errors.push("metadata.externalSearchPerformed must be false");
  if (metadata.scrapingPerformed !== false) errors.push("metadata.scrapingPerformed must be false");
  if (metadata.downloadPerformed !== false) errors.push("metadata.downloadPerformed must be false");
  if (metadata.ingestionPerformed !== false) errors.push("metadata.ingestionPerformed must be false");
  if (metadata.embeddingPerformed !== false) errors.push("metadata.embeddingPerformed must be false");
  if (metadata.databaseWritePerformed !== false) errors.push("metadata.databaseWritePerformed must be false");
  if (metadata.realTaxpayerDataUsed !== false) errors.push("metadata.realTaxpayerDataUsed must be false");
  if (metadata.filingReadyDocumentGenerated !== false) errors.push("metadata.filingReadyDocumentGenerated must be false");
  if (metadata.automaticSubmission !== false) errors.push("metadata.automaticSubmission must be false");
  if (metadata.finalOutcomeGuaranteed !== false) errors.push("metadata.finalOutcomeGuaranteed must be false");

  const claimCheck = detectProhibited2026BaselineClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
