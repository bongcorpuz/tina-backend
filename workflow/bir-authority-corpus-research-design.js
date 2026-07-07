// FILE: workflow/bir-authority-corpus-research-design.js
// PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1
//
// Pure, dependency-free, standalone design scaffold defining how TINA will
// later research, verify, classify, ingest, and cite official Philippine
// tax/audit authorities needed for BIR audit defense workflows (LOA/eLA,
// 2026 audit baseline, PAN/FAN/FLD/protest, document compliance, VAT,
// withholding, prescription, CTA appeal-watch, termination). This module
// has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee/MCP dependency, NO web search, NO browser automation,
// NO OCR, NO filesystem access, NO process.env dependency, NO
// Date.now/randomness, and NO side effects. It imports nothing from any
// other module in this repository. It performs no live search, scraping,
// browsing, downloading, OCR, authority ingestion, embeddings, vector
// storage, or database writes, never submits or stores anything, mutates
// no global state, and is not wired into ask-handler.js, pipeline.js,
// server.js, routes, authentication, or the frontend. It designs the
// authority corpus research layer; it does not build the live authority
// corpus and never claims any authority has been live-verified, downloaded,
// scraped, ingested, indexed, or embedded by this patch.

"use strict";

export const PHASE_09Q_BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_VERSION = "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1";

export const BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_MODE_ID = "bir_authority_corpus_research_design";

export const SUPPORTED_AUTHORITY_SOURCE_TYPES = Object.freeze([
  "BIR_REVENUE_REGULATION",
  "BIR_REVENUE_MEMORANDUM_CIRCULAR",
  "BIR_REVENUE_MEMORANDUM_ORDER",
  "BIR_REVENUE_AUDIT_MEMORANDUM_ORDER",
  "BIR_RULING",
  "BIR_FORM_OR_ANNEX",
  "NIRC_PROVISION",
  "TRAIN_OR_CREATE_OR_EOPT_STATUTE",
  "SUPREME_COURT_DECISION",
  "CTA_DECISION",
  "CTA_EN_BANC_DECISION",
  "DOF_ISSUANCE",
  "PEZA_ISSUANCE",
  "SEC_ISSUANCE",
  "BOI_ISSUANCE",
  "OFFICIAL_GAZETTE_RECORD",
  "IMPLEMENTING_RULES",
  "PRIVATE_REFERENCE_PATTERN",
  "SECONDARY_RESEARCH_LEAD",
  "UNKNOWN_SOURCE_TYPE"
]);

export const SUPPORTED_AUTHORITY_TIERS = Object.freeze([
  "controlling_primary_authority",
  "persuasive_primary_authority",
  "official_administrative_guidance",
  "official_procedural_guidance",
  "jurisprudential_authority",
  "official_form_or_annex",
  "private_uploaded_pattern",
  "secondary_lead_only",
  "future_verification_required",
  "unknown_tier"
]);

export const SUPPORTED_AUTHORITY_TOPICS = Object.freeze([
  "LOA_AUTHORITY",
  "ELA_AUTHENTICITY",
  "RMC_5_2026_LOA_VERIFIER",
  "RMO_1_2026_SINGLE_INSTANCE_AUDIT",
  "RMO_6_2026_CONSOLIDATION_SAFEGUARDS",
  "RMC_14_2026_REPLACEMENT_ELA_CLARIFICATION",
  "RMC_107_2025_AUDIT_SUSPENSION",
  "RMC_8_2026_AUDIT_RESUMPTION",
  "REPLACEMENT_ELA",
  "CONSOLIDATED_ELA",
  "VAT_NON_CONSOLIDATION",
  "VATAS_LTVAU_TRANSITION",
  "TAX_VERIFICATION_NOTICE_SCOPE",
  "STANDARDIZED_CHECKLIST",
  "ADDITIONAL_DOCUMENT_REQUEST_LIMITS",
  "VOLUMINOUS_RECORDS_ON_PREMISE_EXAMINATION",
  "CERTIFIED_COPY_SUBMISSION",
  "SUBPOENA_DUCES_TECUM",
  "NOD_DOD",
  "PAN_REPLY",
  "FAN_FLD_PROTEST",
  "REQUEST_FOR_RECONSIDERATION",
  "REQUEST_FOR_REINVESTIGATION",
  "FDDA",
  "CTA_APPEAL_PERIOD",
  "CTA_INACTION_APPEAL",
  "ASSESSMENT_PRESCRIPTION",
  "COLLECTION_PRESCRIPTION",
  "WAIVER_OF_PRESCRIPTION",
  "DUE_PROCESS_FACTS_AND_LAW",
  "PROPER_SERVICE",
  "NO_REGRESSION_RULE",
  "TERMINATION_LETTER_SCOPE",
  "VAT_EXEMPT_VS_ZERO_RATED",
  "PEZA_ZERO_RATING",
  "INPUT_VAT_SUBSTANTIATION",
  "CWT_SUBSTANTIATION",
  "WITHHOLDING_TAX_DEDUCTIBILITY",
  "DIVIDEND_FWT",
  "COMPROMISE_PENALTY",
  "SURCHARGE_AND_INTEREST",
  "RELATED_PARTY_OR_INTERCOMPANY",
  "UNKNOWN_TOPIC"
]);

export const SUPPORTED_RESEARCH_WORKFLOW_STAGES = Object.freeze([
  "SOURCE_DISCOVERY_DESIGN",
  "OFFICIAL_SOURCE_PRIORITY_DESIGN",
  "AUTHORITY_METADATA_DESIGN",
  "AUTHORITY_VERIFICATION_DESIGN",
  "AUTHORITY_TOPIC_MAPPING_DESIGN",
  "CITATION_POLICY_DESIGN",
  "INGESTION_PIPELINE_DESIGN",
  "DEDUPLICATION_AND_VERSIONING_DESIGN",
  "CONFLICT_RESOLUTION_DESIGN",
  "HUMAN_REVIEW_GATE_DESIGN",
  "FUTURE_RUNTIME_WIRING_DESIGN",
  "UNKNOWN_STAGE"
]);

export const SUPPORTED_AUTHORITY_VERIFICATION_STATUSES = Object.freeze([
  "not_verified_design_only",
  "official_source_required",
  "official_source_identified_design_only",
  "secondary_lead_requires_primary_verification",
  "conflict_requires_human_review",
  "stale_or_superseded_risk",
  "future_ingestion_required",
  "unknown_status"
]);

const ALLOWED_SOURCE_CARD_AUTHORITY_TIERS = Object.freeze([
  "official_reference_required",
  "uploaded_reference_pattern",
  "future_authority_corpus_required",
  "procedural_design_reference",
  "official_administrative_guidance",
  "official_procedural_guidance",
  "private_uploaded_pattern"
]);

const DEFAULT_BASELINE_TOPICS = Object.freeze([
  "LOA_AUTHORITY",
  "RMO_1_2026_SINGLE_INSTANCE_AUDIT",
  "PAN_REPLY",
  "FAN_FLD_PROTEST",
  "ASSESSMENT_PRESCRIPTION",
  "VAT_EXEMPT_VS_ZERO_RATED",
  "CWT_SUBSTANTIATION"
]);

const OFFICIAL_SOURCE_DOMAINS = Object.freeze([
  Object.freeze({ domainOrSource: "bir.gov.ph", priority: 1, allowedUse: "BIR issuances and forms", restrictions: Object.freeze(["must confirm current version before citation"]) }),
  Object.freeze({ domainOrSource: "bir-cdn.bir.gov.ph", priority: 2, allowedUse: "BIR issuances and forms (CDN-hosted copies)", restrictions: Object.freeze(["must confirm current version before citation"]) }),
  Object.freeze({ domainOrSource: "lawphil.net", priority: 3, allowedUse: "NIRC/statutory records and case-law mirror", restrictions: Object.freeze(["cross-check against official judicial source when available"]) }),
  Object.freeze({ domainOrSource: "sc.judiciary.gov.ph", priority: 4, allowedUse: "Supreme Court decisions", restrictions: Object.freeze(["confirm finality and any subsequent resolution"]) }),
  Object.freeze({ domainOrSource: "cta.judiciary.gov.ph", priority: 5, allowedUse: "CTA decisions (division and en banc)", restrictions: Object.freeze(["confirm finality and any appeal status"]) }),
  Object.freeze({ domainOrSource: "officialgazette.gov.ph", priority: 6, allowedUse: "official record verification and statute publication", restrictions: Object.freeze(["confirm effectivity date"]) }),
  Object.freeze({ domainOrSource: "dof.gov.ph", priority: 7, allowedUse: "DOF issuances", restrictions: Object.freeze(["confirm current version before citation"]) }),
  Object.freeze({ domainOrSource: "peza.gov.ph", priority: 8, allowedUse: "PEZA issuances", restrictions: Object.freeze(["confirm current version before citation"]) }),
  Object.freeze({ domainOrSource: "sec.gov.ph", priority: 9, allowedUse: "SEC issuances", restrictions: Object.freeze(["confirm current version before citation"]) }),
  Object.freeze({ domainOrSource: "boi.gov.ph", priority: 10, allowedUse: "BOI issuances", restrictions: Object.freeze(["confirm current version before citation"]) }),
  Object.freeze({
    domainOrSource: "secondary_research_sources_non_official",
    priority: 11,
    allowedUse: "research lead only; must verify against official source before use",
    restrictions: Object.freeze(["must not be cited as final authority", "requires primary official-source confirmation before any reliance"])
  })
]);

const PROHIBITED_LOW_TRUST_SOURCES = Object.freeze([
  "SEO blogs as final authority",
  "social media posts",
  "unverified summaries",
  "AI-generated summaries without source",
  "commercial articles without primary-source verification",
  "outdated reposted PDFs without official source confirmation"
]);

const TOPIC_REQUIRED_AUTHORITY_TYPES = Object.freeze({
  LOA_AUTHORITY: Object.freeze(["NIRC Sec. 6(A)", "BIR LOA issuances", "Supreme Court LOA jurisprudence"]),
  ELA_AUTHENTICITY: Object.freeze(["RMC No. 5-2026", "BIR REVIE / LOA Verifier workflow"]),
  RMO_1_2026_SINGLE_INSTANCE_AUDIT: Object.freeze(["RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026"]),
  REPLACEMENT_ELA: Object.freeze(["RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026", "LOA jurisprudence"]),
  CONSOLIDATED_ELA: Object.freeze(["RMO No. 1-2026", "RMO No. 6-2026", "RMC No. 14-2026"]),
  STANDARDIZED_CHECKLIST: Object.freeze(["RMO No. 1-2026"]),
  ADDITIONAL_DOCUMENT_REQUEST_LIMITS: Object.freeze(["RMO No. 1-2026"]),
  PAN_REPLY: Object.freeze(["NIRC Sec. 228", "RR No. 18-2013", "RR No. 12-99 as amended"]),
  FAN_FLD_PROTEST: Object.freeze(["NIRC Sec. 228", "RR No. 18-2013", "RR No. 12-99 as amended", "CTA rules"]),
  REQUEST_FOR_RECONSIDERATION: Object.freeze(["RR No. 18-2013", "CTA cases"]),
  REQUEST_FOR_REINVESTIGATION: Object.freeze(["RR No. 18-2013", "CTA cases"]),
  FDDA: Object.freeze(["NIRC Sec. 228", "RR No. 18-2013", "CTA appeal rules"]),
  CTA_APPEAL_PERIOD: Object.freeze(["CTA rules", "NIRC Sec. 228", "jurisprudence"]),
  ASSESSMENT_PRESCRIPTION: Object.freeze(["NIRC Sec. 203", "NIRC Sec. 222", "waiver issuances", "jurisprudence"]),
  WAIVER_OF_PRESCRIPTION: Object.freeze(["NIRC Sec. 222", "RMO No. 14-2016", "RMC No. 141-2019", "jurisprudence"]),
  VAT_EXEMPT_VS_ZERO_RATED: Object.freeze(["NIRC Sec. 106/108/109", "VAT regulations", "PEZA rules", "jurisprudence"]),
  PEZA_ZERO_RATING: Object.freeze(["NIRC VAT provisions", "PEZA law/issuances", "VAT regulations", "jurisprudence"]),
  INPUT_VAT_SUBSTANTIATION: Object.freeze(["NIRC Sec. 110", "VAT invoicing rules", "jurisprudence"]),
  CWT_SUBSTANTIATION: Object.freeze(["RR No. 2-98", "Form 2307/SAWT rules", "NIRC tax credit provisions", "jurisprudence"]),
  WITHHOLDING_TAX_DEDUCTIBILITY: Object.freeze(["NIRC Sec. 34(K)", "RR No. 2-98", "withholding regulations", "jurisprudence"]),
  DIVIDEND_FWT: Object.freeze(["NIRC final withholding tax provisions", "dividend tax rules", "withholding remittance rules"]),
  TERMINATION_LETTER_SCOPE: Object.freeze(["RMO No. 8-2023 if applicable", "termination letter forms/annexes", "BIR closure guidance"])
});

const DEFAULT_TOPIC_REQUIRED_AUTHORITY_TYPES = Object.freeze(["Applicable NIRC provisions", "Applicable BIR issuances", "Applicable jurisprudence"]);

const WORKFLOW_STAGE_DEFINITIONS = Object.freeze({
  SOURCE_DISCOVERY_DESIGN: Object.freeze({
    purpose: "Define how future patches will discover candidate authorities from official sources.",
    allowedActionsFutureOnly: Object.freeze(["Query official BIR/judicial/DOF/PEZA/SEC/BOI sites for issuance listings"]),
    prohibitedActionsThisPatch: Object.freeze(["No live search performed in this patch"]),
    outputExpectedInFuturePatch: "A discovery pipeline design producing candidate authority leads."
  }),
  OFFICIAL_SOURCE_PRIORITY_DESIGN: Object.freeze({
    purpose: "Define ranked trust priority among official domains.",
    allowedActionsFutureOnly: Object.freeze(["Assign priority weighting to discovered sources"]),
    prohibitedActionsThisPatch: Object.freeze(["No source ranking applied to live data"]),
    outputExpectedInFuturePatch: "A prioritized source list consumed by future ingestion."
  }),
  AUTHORITY_METADATA_DESIGN: Object.freeze({
    purpose: "Define required/recommended/prohibited metadata fields for each authority record.",
    allowedActionsFutureOnly: Object.freeze(["Populate metadata fields from verified official records"]),
    prohibitedActionsThisPatch: Object.freeze(["No metadata populated from live sources"]),
    outputExpectedInFuturePatch: "A structured metadata schema implementation."
  }),
  AUTHORITY_VERIFICATION_DESIGN: Object.freeze({
    purpose: "Define how future patches will verify authority authenticity, date, and version.",
    allowedActionsFutureOnly: Object.freeze(["Cross-check issuance date/version against official source"]),
    prohibitedActionsThisPatch: Object.freeze(["No verification performed in this patch"]),
    outputExpectedInFuturePatch: "A verification pipeline producing verified/unverified status."
  }),
  AUTHORITY_TOPIC_MAPPING_DESIGN: Object.freeze({
    purpose: "Define baseline mapping between BIR audit-defense workflow topics and required authority types.",
    allowedActionsFutureOnly: Object.freeze(["Expand topic map coverage as new authorities are verified"]),
    prohibitedActionsThisPatch: Object.freeze(["No topic-authority mapping is treated as complete or final"]),
    outputExpectedInFuturePatch: "A living topic-to-authority map with verified coverage."
  }),
  CITATION_POLICY_DESIGN: Object.freeze({
    purpose: "Define citation discipline for legal/tax claims and deadlines.",
    allowedActionsFutureOnly: Object.freeze(["Generate citations from verified authority metadata"]),
    prohibitedActionsThisPatch: Object.freeze(["No citations generated from unverified authorities"]),
    outputExpectedInFuturePatch: "A citation-formatting and sourcing policy implementation."
  }),
  INGESTION_PIPELINE_DESIGN: Object.freeze({
    purpose: "Define how future patches will ingest verified authorities into the corpus.",
    allowedActionsFutureOnly: Object.freeze(["Ingest verified official documents into a governed corpus store"]),
    prohibitedActionsThisPatch: Object.freeze(["No ingestion, download, or storage performed in this patch"]),
    outputExpectedInFuturePatch: "An approved ingestion pipeline with governance gates."
  }),
  DEDUPLICATION_AND_VERSIONING_DESIGN: Object.freeze({
    purpose: "Define how duplicate or superseded authorities are identified and tracked.",
    allowedActionsFutureOnly: Object.freeze(["Detect duplicate/superseded authority records"]),
    prohibitedActionsThisPatch: Object.freeze(["No deduplication run against live data"]),
    outputExpectedInFuturePatch: "A deduplication/versioning implementation."
  }),
  CONFLICT_RESOLUTION_DESIGN: Object.freeze({
    purpose: "Define how conflicting authorities are flagged and resolved.",
    allowedActionsFutureOnly: Object.freeze(["Flag conflicting authorities for human review"]),
    prohibitedActionsThisPatch: Object.freeze(["No conflict resolution performed on live data"]),
    outputExpectedInFuturePatch: "A conflict-detection and escalation implementation."
  }),
  HUMAN_REVIEW_GATE_DESIGN: Object.freeze({
    purpose: "Define mandatory human review checkpoints before authority reliance.",
    allowedActionsFutureOnly: Object.freeze(["Route flagged authorities to human tax/legal reviewers"]),
    prohibitedActionsThisPatch: Object.freeze(["No human review workflow activated in this patch"]),
    outputExpectedInFuturePatch: "A human review gate implementation."
  }),
  FUTURE_RUNTIME_WIRING_DESIGN: Object.freeze({
    purpose: "Define how the verified authority corpus will eventually be wired into runtime retrieval.",
    allowedActionsFutureOnly: Object.freeze(["Wire verified corpus into retrieval behind governance gates"]),
    prohibitedActionsThisPatch: Object.freeze(["No runtime wiring performed in this patch"]),
    outputExpectedInFuturePatch: "A controlled runtime integration patch, separately approved."
  }),
  UNKNOWN_STAGE: Object.freeze({
    purpose: "Placeholder for unclassified research workflow activity.",
    allowedActionsFutureOnly: Object.freeze([]),
    prohibitedActionsThisPatch: Object.freeze(["No action taken"]),
    outputExpectedInFuturePatch: "Reclassify into a known stage before proceeding."
  })
});

const BASE_SOURCE_CARDS = Object.freeze([
  Object.freeze({
    label: "BIR official authority corpus design",
    sourceType: "authority corpus design",
    authorityTier: "future_authority_corpus_required",
    note: "Future implementation must verify BIR issuances against bir.gov.ph or bir-cdn.bir.gov.ph. This patch performs no live retrieval."
  }),
  Object.freeze({
    label: "Judicial authority corpus design",
    sourceType: "authority corpus design",
    authorityTier: "future_authority_corpus_required",
    note: "Future implementation must verify Supreme Court and CTA authorities against official judicial sources. This patch performs no live retrieval."
  }),
  Object.freeze({
    label: "2026 BIR audit baseline authority design",
    sourceType: "authority corpus design",
    authorityTier: "official_reference_required",
    note: "RMO No. 1-2026, RMO No. 6-2026, RMC No. 14-2026, RMC No. 5-2026, RMC No. 8-2026, and RMC No. 107-2025 must be treated as priority audit-framework authorities in future corpus work."
  }),
  Object.freeze({
    label: "Private audit workflow reference pattern",
    sourceType: "private uploaded reference",
    authorityTier: "private_uploaded_pattern",
    note: "Private materials may guide workflow design only. They are not public authority and must never expose real taxpayer data."
  })
]);

// Conservative, deterministic, lowercased-substring prohibited-claim
// phrases. No AI model, no network, no mutation.
const PROHIBITED_CLAIM_PHRASES = Object.freeze([
  "this authority was verified",
  "this source was downloaded",
  "this case was ingested",
  "this regulation was scraped",
  "the corpus is complete",
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
  "no need to consult a professional",
  "you will win",
  "guaranteed cancellation",
  "final legal opinion",
  "official legal advice",
  "court-tested defense",
  "foolproof defense"
]);

// Real reference-corpus identifiers supplied only as a private do-not-leak
// list for this task; never emitted by this module and rejected on input.
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
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "13,106,907.66", "13,545,329.75"]);

const PROHIBITED_CONCLUSION_LABELS = Object.freeze([
  "authority_verification_determination",
  "corpus_completeness_claim",
  "final_legal_opinion",
  "live_ingestion_claim",
  "live_retrieval_claim"
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

function normalizeCandidateAuthority(candidate) {
  const src = isPlainObject(candidate) ? candidate : {};
  return {
    title: isNonBlankString(src.title) ? src.title.trim() : "Unspecified candidate authority",
    sourceType: SUPPORTED_AUTHORITY_SOURCE_TYPES.includes(src.sourceType) ? src.sourceType : "UNKNOWN_SOURCE_TYPE",
    topicTags: normalizeStringArray(src.topicTags).filter((topic) => SUPPORTED_AUTHORITY_TOPICS.includes(topic)),
    authorityTier: SUPPORTED_AUTHORITY_TIERS.includes(src.authorityTier) ? src.authorityTier : "unknown_tier",
    sourceDomain: isNonBlankString(src.sourceDomain) ? src.sourceDomain.trim() : null,
    verificationStatus: SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.includes(src.verificationStatus) ? src.verificationStatus : "not_verified_design_only",
    liveVerified: false,
    note: isNonBlankString(src.note) ? src.note.trim() : "Design reference only; no live authority verification performed."
  };
}

/**
 * Recursively scans a value for prohibited authority-corpus claim phrases.
 * Pure, synchronous, never mutates input, performs no I/O.
 *
 * @param {*} value
 * @returns {{hasProhibitedClaims: boolean, matches: string[]}}
 */
export function detectProhibitedAuthorityCorpusClaims(value) {
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
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if (raw.includes(fragment)) matches.push(`assessment_amount:${fragment}`);
  return { hasRealDataLeak: matches.length > 0, matches };
}

function containsRealDataFragments(text) {
  const upper = (text || "").toUpperCase();
  for (const fragment of REAL_TAXPAYER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "taxpayer name";
  for (const fragment of REAL_OFFICER_NAME_FRAGMENTS) if (upper.includes(fragment)) return "BIR officer name";
  for (const fragment of REAL_ELA_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "LOA/eLA number";
  for (const fragment of REAL_AUDIT_CASE_NUMBER_FRAGMENTS) if ((text || "").includes(fragment)) return "audit case number";
  for (const fragment of REAL_ASSESSMENT_AMOUNT_FRAGMENTS) if ((text || "").includes(fragment)) return "assessment amount";
  return null;
}

/**
 * Normalizes candidate BIR authority corpus research design input into a
 * defensive, fully-shaped object. Never mutates input; never throws.
 * Always forces every live/runtime/write/ingestion flag to false and never
 * marks any authority as live-verified -- validateBirAuthorityCorpusResearchDesignInput()
 * is the gate that flags an attempt to request unsafe option values.
 *
 * @param {*} input
 * @returns {object}
 */
export function normalizeBirAuthorityCorpusResearchDesignInput(input) {
  const src = isPlainObject(input) ? input : {};
  const candidatesSrc = Array.isArray(src.candidateAuthorities) ? src.candidateAuthorities : [];
  const requestedTopics = normalizeStringArray(src.targetTopics).filter((topic) => SUPPORTED_AUTHORITY_TOPICS.includes(topic));

  return {
    userQuery: typeof src.userQuery === "string" ? src.userQuery.trim() : "",
    targetTopics: requestedTopics.length > 0 ? dedupe(requestedTopics) : [...DEFAULT_BASELINE_TOPICS],
    candidateAuthorities: candidatesSrc.map((candidate) => normalizeCandidateAuthority(candidate)),
    options: {
      scaffoldOnly: true,
      runtimeActive: false,
      allowLiveRetrieval: false,
      allowScraping: false,
      allowDownload: false,
      allowIngestion: false,
      allowEmbedding: false,
      allowDatabaseWrite: false,
      allowLegalConclusion: false,
      allowRealTaxpayerData: false,
      generateFilingReadyDocument: false
    },
    sourceCards: (Array.isArray(src.sourceCards) ? src.sourceCards : []).map((card) => normalizeSourceCard(card))
  };
}

const SCRAPE_DOWNLOAD_INGEST_REQUEST_PATTERN =
  /\b(?:scrape|scraping|download|downloading|search the web|web search|ingest|ingesting|embed|embedding)\b|\bstore\s+(?:it|this|these|that)?\s*in\s+(?:a\s+|the\s+)?database\b/i;

const RAW_URL_PATTERN = /^https?:\/\/|\//;

/**
 * Validates candidate BIR authority corpus research design input. Never
 * throws. Rejects missing input, unsupported source types/topics/tiers/
 * verification statuses, any attempt to request unsafe live/runtime/write/
 * ingestion option values, liveVerified true on any candidate authority,
 * claims of completed authority verification, raw (non-domain-only) source
 * URLs, requests to scrape/download/search/ingest/embed/store authorities,
 * and any known real taxpayer/officer name, real LOA/eLA/audit-case
 * number, or exact real assessment amount from the private reference
 * corpus.
 *
 * @param {*} input
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirAuthorityCorpusResearchDesignInput(input) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input)) {
    errors.push("input must be a plain object");
    return { valid: false, errors, warnings };
  }

  const userQuery = typeof input.userQuery === "string" ? input.userQuery.trim() : "";
  if (SCRAPE_DOWNLOAD_INGEST_REQUEST_PATTERN.test(userQuery)) {
    errors.push("input must not request live scraping, downloading, searching, ingesting, embedding, or database storage of authorities");
  }

  const targetTopics = Array.isArray(input.targetTopics) ? input.targetTopics : [];
  targetTopics.forEach((topic, index) => {
    if (typeof topic === "string" && !SUPPORTED_AUTHORITY_TOPICS.includes(topic)) {
      errors.push(`targetTopics[${index}] unsupported topic: ${JSON.stringify(topic)}`);
    }
  });

  const candidateAuthorities = Array.isArray(input.candidateAuthorities) ? input.candidateAuthorities : [];
  candidateAuthorities.forEach((candidate, index) => {
    if (!isPlainObject(candidate)) return;
    if (candidate.sourceType !== undefined && !SUPPORTED_AUTHORITY_SOURCE_TYPES.includes(candidate.sourceType)) {
      errors.push(`candidateAuthorities[${index}] unsupported sourceType: ${JSON.stringify(candidate.sourceType)}`);
    }
    if (candidate.authorityTier !== undefined && !SUPPORTED_AUTHORITY_TIERS.includes(candidate.authorityTier)) {
      errors.push(`candidateAuthorities[${index}] unsupported authorityTier: ${JSON.stringify(candidate.authorityTier)}`);
    }
    if (candidate.verificationStatus !== undefined && !SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.includes(candidate.verificationStatus)) {
      errors.push(`candidateAuthorities[${index}] unsupported verificationStatus: ${JSON.stringify(candidate.verificationStatus)}`);
    }
    if (Array.isArray(candidate.topicTags)) {
      candidate.topicTags.forEach((topic, topicIndex) => {
        if (typeof topic === "string" && !SUPPORTED_AUTHORITY_TOPICS.includes(topic)) {
          errors.push(`candidateAuthorities[${index}].topicTags[${topicIndex}] unsupported topic: ${JSON.stringify(topic)}`);
        }
      });
    }
    if (candidate.liveVerified === true) {
      errors.push(`candidateAuthorities[${index}] must not set liveVerified true`);
    }
    if (isNonBlankString(candidate.sourceDomain) && RAW_URL_PATTERN.test(candidate.sourceDomain.trim())) {
      errors.push(`candidateAuthorities[${index}].sourceDomain must be a domain-only placeholder, not a raw URL/path`);
    }
    const combinedNote = `${candidate.title || ""} ${candidate.note || ""}`;
    if (/verification (?:is |has been )?complete|officially verified|final authority verification/i.test(combinedNote)) {
      errors.push(`candidateAuthorities[${index}] must not claim completed authority verification`);
    }
  });

  const options = isPlainObject(input.options) ? input.options : {};
  if (options.runtimeActive === true) errors.push("runtimeActive must not be true");
  if (options.allowLiveRetrieval === true) errors.push("allowLiveRetrieval must not be true");
  if (options.allowScraping === true) errors.push("allowScraping must not be true");
  if (options.allowDownload === true) errors.push("allowDownload must not be true");
  if (options.allowIngestion === true) errors.push("allowIngestion must not be true");
  if (options.allowEmbedding === true) errors.push("allowEmbedding must not be true");
  if (options.allowDatabaseWrite === true) errors.push("allowDatabaseWrite must not be true");
  if (options.allowLegalConclusion === true) errors.push("allowLegalConclusion must not be true");
  if (options.allowRealTaxpayerData === true) errors.push("allowRealTaxpayerData must not be true");
  if (options.generateFilingReadyDocument === true) errors.push("generateFilingReadyDocument must not be true");

  const sourceCards = Array.isArray(input.sourceCards) ? input.sourceCards : [];
  const verificationClaimPattern = /final authority verification is complete|official verification complete|verification (?:is |has been )?complete|officially verified/i;
  const legalConclusionClaimPattern = /final legal conclusion|final legal opinion|official legal advice|legally conclusive/i;
  sourceCards.forEach((card, index) => {
    if (isPlainObject(card)) {
      const combined = `${card.label || ""} ${card.note || ""}`;
      if (verificationClaimPattern.test(combined)) errors.push(`sourceCards[${index}] must not claim final authority verification is complete`);
      if (legalConclusionClaimPattern.test(combined)) errors.push(`sourceCards[${index}] must not claim a final legal conclusion`);
    }
  });

  const combinedRaw = `${input.userQuery || ""} ${JSON.stringify(input.candidateAuthorities || [])}`;
  const realDataHit = containsRealDataFragments(combinedRaw);
  if (realDataHit) errors.push(`input must not contain a known real ${realDataHit} from uploaded materials`);

  return { valid: errors.length === 0, errors, warnings };
}

function buildAuthorityTopicMapEntry(topic, candidateAuthorities) {
  const requiredAuthorityTypes = TOPIC_REQUIRED_AUTHORITY_TYPES[topic] || DEFAULT_TOPIC_REQUIRED_AUTHORITY_TYPES;
  const matchingCandidates = candidateAuthorities.filter((candidate) => candidate.topicTags.includes(topic));
  const matchedTitlesLower = matchingCandidates.map((candidate) => candidate.title.toLowerCase());

  const missingAuthorityGaps = requiredAuthorityTypes.filter((requiredType) => {
    const requiredTypeLower = requiredType.toLowerCase();
    return !matchedTitlesLower.some((title) => title.includes(requiredTypeLower) || requiredTypeLower.includes(title));
  });

  const verificationStatus = matchingCandidates.length > 0 ? "official_source_identified_design_only" : "official_source_required";

  return {
    topic,
    requiredAuthorityTypes: [...requiredAuthorityTypes],
    candidateAuthorities: matchingCandidates.map((candidate) => candidate.title),
    missingAuthorityGaps,
    verificationStatus,
    humanReviewRequired: true
  };
}

/**
 * Builds a full BIR authority corpus research design result for the given
 * (raw or normalized) input. Never throws. Always returns the full result
 * shape regardless of input validity -- callers should call
 * validateBirAuthorityCorpusResearchDesignInput() beforehand to gate
 * whether to proceed. Performs no I/O, no network calls, no live
 * retrieval, scraping, downloading, ingestion, embedding, or database
 * writes; designs the authority corpus research layer only.
 *
 * @param {*} input
 * @returns {object}
 */
export function createBirAuthorityCorpusResearchDesignResult(input) {
  const normalized = normalizeBirAuthorityCorpusResearchDesignInput(input);

  const authorityTopicMap = normalized.targetTopics.map((topic) => buildAuthorityTopicMapEntry(topic, normalized.candidateAuthorities));

  const confidence = normalized.candidateAuthorities.length > 0 ? "medium" : normalized.targetTopics.length > 0 ? "medium" : "low";

  const corpusDesignSummary = {
    totalTopics: normalized.targetTopics.length,
    totalCandidateAuthorities: normalized.candidateAuthorities.length,
    officialSourcePriorityRequired: true,
    liveRetrievalPerformed: false,
    ingestionPerformed: false,
    databaseWritePerformed: false,
    legalConclusionProvided: false,
    humanReviewRequired: true,
    confidence
  };

  const officialSourcePriority = OFFICIAL_SOURCE_DOMAINS.map((entry) => deepClone(entry));

  const authorityMetadataSchema = {
    requiredFields: ["title", "sourceType", "authorityTier", "topicTags", "officialUrlOrDomain", "issuanceOrDecisionDate", "effectiveDate", "citationFormat"],
    recommendedFields: ["supersedesId", "supersededById", "summary", "relatedCaseNumbers", "jurisdiction"],
    prohibitedFields: ["realTaxpayerName", "realTin", "realLoaOrElaNumber", "realAuditCaseNumber", "realBirOfficerName", "exactAssessmentAmount"],
    versioningFields: ["versionNumber", "effectiveDate", "supersededDate", "supersedesId", "supersededById"],
    citationFields: ["citationFormat", "officialUrlOrDomain", "pinCiteOrSection", "retrievalDateForReview"]
  };

  const researchWorkflowDesign = SUPPORTED_RESEARCH_WORKFLOW_STAGES.map((stage) => {
    const definition = WORKFLOW_STAGE_DEFINITIONS[stage];
    return {
      stage,
      purpose: definition.purpose,
      allowedActionsFutureOnly: [...definition.allowedActionsFutureOnly],
      prohibitedActionsThisPatch: [...definition.prohibitedActionsThisPatch],
      outputExpectedInFuturePatch: definition.outputExpectedInFuturePatch
    };
  });

  const verificationRules = {
    officialPrimarySourceRequired: true,
    secondarySourcesLeadOnly: true,
    requireDateAndVersionCheck: true,
    requireSupersessionCheck: true,
    requireTopicMapping: true,
    requireQuoteAndCitationDiscipline: true,
    requireHumanReviewForConflict: true,
    noFinalLegalConclusionFromUnverifiedAuthority: true
  };

  const conflictResolutionPolicy = {
    newerIssuanceCheck: true,
    statuteVsRegulationHierarchyCheck: true,
    jurisprudenceVsAdministrativeGuidanceCheck: true,
    specialLawVsGeneralLawCheck: true,
    taxpayerFactSpecificityCheck: true,
    humanReviewRequiredForConflict: true
  };

  const futureIngestionPlan = {
    allowedOfficialDomains: OFFICIAL_SOURCE_DOMAINS.filter((entry) => entry.priority <= 10).map((entry) => entry.domainOrSource),
    prohibitedSources: [...PROHIBITED_LOW_TRUST_SOURCES],
    futurePipelineStages: SUPPORTED_RESEARCH_WORKFLOW_STAGES.filter((stage) => stage !== "UNKNOWN_STAGE"),
    futureMetadataChecks: ["date and version check", "supersession check", "topic mapping check", "citation format check"],
    futureQualityGates: ["human review gate", "conflict resolution gate", "official source confirmation gate"]
  };

  const citationPolicyDesign = {
    citationRequiredForLegalClaims: true,
    citationRequiredForDeadlines: true,
    citationRequiredForAuthorityStatus: true,
    rawUnsupportedCitationProhibited: true,
    sourceCardRequired: true,
    exactExcerptPolicy: "Exact excerpts must be sourced from verified official documents only; this design patch includes no live-sourced excerpts."
  };

  const riskWarnings = [
    "This is a design-only authority mapping; official-source verification is required before use.",
    "Future implementation must verify date, version, supersession, and official source for every candidate authority.",
    "The available design is insufficient for a final legal conclusion.",
    "Human tax/legal review remains required before relying on any topic for legal conclusions."
  ];

  const recommendedNextActions = [
    "Verify each candidate authority against its official source domain.",
    "Build the live ingestion pipeline in a separately approved patch.",
    "Expand topic coverage before relying on any topic for legal conclusions.",
    "Route conflicting authorities to human review."
  ];

  const combinedSourceCards = [...deepClone(normalized.sourceCards), ...deepClone(BASE_SOURCE_CARDS)];

  return {
    phase: "09Q",
    mode: BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_MODE_ID,
    version: PHASE_09Q_BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_VERSION,
    runtimeActive: false,
    corpusDesignSummary,
    officialSourcePriority,
    authorityTopicMap,
    authorityMetadataSchema,
    researchWorkflowDesign,
    verificationRules,
    conflictResolutionPolicy,
    futureIngestionPlan,
    citationPolicyDesign,
    sourceCards: combinedSourceCards,
    riskWarnings,
    recommendedNextActions,
    prohibitedConclusions: [...PROHIBITED_CONCLUSION_LABELS],
    humanReviewNotice:
      "This scaffold provides a design-only authority corpus research plan and does not constitute a final legal or tax conclusion. No authority referenced here has been live-verified, downloaded, scraped, ingested, or embedded by this patch; official-source verification remains required, and this matter should be reviewed by a qualified tax professional before any legal or tax conclusion.",
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
 * Validates a candidate BIR authority corpus research design result
 * object. Never throws.
 *
 * @param {*} result
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validateBirAuthorityCorpusResearchDesignResult(result) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(result)) {
    errors.push("result must be a plain object");
    return { valid: false, errors, warnings };
  }

  if (!isNonBlankString(result.phase)) errors.push("phase is required");
  if (!isNonBlankString(result.mode)) errors.push("mode is required");
  if (result.runtimeActive !== false) errors.push("runtimeActive must be false");

  if (!isPlainObject(result.corpusDesignSummary)) errors.push("corpusDesignSummary is required");
  if (!Array.isArray(result.officialSourcePriority) || result.officialSourcePriority.length === 0) errors.push("officialSourcePriority is required");

  if (!Array.isArray(result.authorityTopicMap)) {
    errors.push("authorityTopicMap is required");
  } else {
    result.authorityTopicMap.forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        errors.push(`authorityTopicMap[${index}] must be an object`);
        return;
      }
      if (!SUPPORTED_AUTHORITY_TOPICS.includes(entry.topic)) errors.push(`authorityTopicMap[${index}] unsupported topic: ${entry.topic}`);
      if (!SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.includes(entry.verificationStatus)) {
        errors.push(`authorityTopicMap[${index}] unsupported verificationStatus: ${entry.verificationStatus}`);
      }
      if (entry.humanReviewRequired !== true) errors.push(`authorityTopicMap[${index}] humanReviewRequired must be true`);
    });
  }

  if (!isPlainObject(result.authorityMetadataSchema)) errors.push("authorityMetadataSchema is required");
  if (!Array.isArray(result.researchWorkflowDesign)) errors.push("researchWorkflowDesign is required");
  if (!isPlainObject(result.verificationRules)) errors.push("verificationRules is required");
  if (!isPlainObject(result.conflictResolutionPolicy)) errors.push("conflictResolutionPolicy is required");
  if (!isPlainObject(result.futureIngestionPlan)) errors.push("futureIngestionPlan is required");
  if (!isPlainObject(result.citationPolicyDesign)) errors.push("citationPolicyDesign is required");

  if (!Array.isArray(result.riskWarnings)) errors.push("riskWarnings must be an array");
  if (!Array.isArray(result.recommendedNextActions)) errors.push("recommendedNextActions must be an array");
  if (!Array.isArray(result.prohibitedConclusions)) errors.push("prohibitedConclusions must be an array");
  if (!Array.isArray(result.sourceCards)) {
    errors.push("sourceCards is required");
  } else if (result.sourceCards.length === 0) {
    errors.push("sourceCards must not be empty");
  } else {
    const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
    result.sourceCards.forEach((card, index) => {
      if (isPlainObject(card)) {
        if (verificationClaimPattern.test(`${card.label || ""} ${card.note || ""}`)) errors.push(`sourceCards[${index}] must not claim completed authority verification`);
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

  const claimCheck = detectProhibitedAuthorityCorpusClaims(result);
  if (claimCheck.hasProhibitedClaims) errors.push(`prohibited claims detected in result: ${claimCheck.matches.join(", ")}`);

  const leakCheck = detectRealDataLeak(result);
  if (leakCheck.hasRealDataLeak) errors.push(`real data leak detected in result: ${leakCheck.matches.join(", ")}`);

  return { valid: errors.length === 0, errors, warnings };
}
