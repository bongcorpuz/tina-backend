// FILE: rag-answer-handler.js
"use strict";

/**
 * TINA RAG Answer Handler
 * Version: 9.0.0
 *
 * Role:
 * - Consume retrieved/validated sources from retrieval-engine.js / ask-handler.js.
 * - Pass compact sources to context-orchestration-engine.js.
 * - Preserve source grounding, issue classification, tax-engine metadata, and authority packets.
 * - Apply final compliance only when the route requires standard legal/tax answer format.
 *
 * Boundary:
 * - Does not retrieve.
 * - Does not perform vector search.
 * - Does not call OpenAI directly.
 * - Does not inject raw full documents.
 * - Does not fabricate authorities.
 * - Does not force A–F format for quiz/reviewer modes.
 */

import {
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

import {
  renderTinaJsonPayload
} from "./answer-renderer.js";

import {
  buildFinalCompliantAnswer
} from "./final-answer-compliance.js";

import {
  sanitizeAnswerForDisplay,
  finalizeSourcesForResponse,
  buildCompactConversationHistory
} from "./ask-helpers.js";

const ENGINE_VERSION = "9.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const HARD_MAX_SOURCES = 8;
const HARD_MAX_SOURCE_CHARS = 1400;
const HARD_MAX_HISTORY_ITEMS = 6;
const HARD_MAX_AUTHORITY_ITEMS = 6;

const STANDARD_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const REVIEWER_SECTIONS = Object.freeze([
  "Concept",
  "Rule",
  "Memory Aid",
  "Common Trap",
  "Example",
  "Quick Check"
]);

const QUIZ_SECTIONS = Object.freeze([
  "Question",
  "Choices",
  "Answer Key",
  "Explanation"
]);

const CASE_SECTIONS = Object.freeze([
  "Case Identified",
  "Issue",
  "Ruling / Holding",
  "Doctrine",
  "Application",
  "Status / Limits"
]);

const SOURCE_SECTIONS = Object.freeze([
  "Sources Found",
  "Controlling Authorities",
  "Supporting Authorities",
  "Notes"
]);

const SUPPORTED_TAX_DOMAINS = Object.freeze([
  "VAT",
  "CIT",
  "IIT",
  "WHT",
  "EST",
  "PCT",
  "EXC",
  "PRE",
  "DIS",
  "LGT",
  "CUS",
  "SPC",
  "CON"
]);

const AUTHORITY_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,
  TAX_TREATY: 3,
  TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,
  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,
  RR: 8,
  REVENUE_REGULATION: 8,
  RMC: 9,
  RMO: 9,
  RAMO: 9,
  BIR_RULING: 10,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,
  LGU: 11,
  PFRS: 12,
  PAS: 12,
  PSA: 12,
  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,
  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  UNKNOWN: 99
});

const PRIMARY_AUTHORITY_TYPES = new Set([
  "CONSTITUTION",
  "STATUTE",
  "NIRC",
  "TAX_CODE",
  "CMTA",
  "LGC",
  "REPUBLIC_ACT",
  "RA",
  "TAX_TREATY"
]);

const JURISPRUDENCE_TYPES = new Set([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "COURT_OF_APPEALS"
]);

const ADMIN_AUTHORITY_TYPES = new Set([
  "RR",
  "REVENUE_REGULATION",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING",
  "BOC_ISSUANCE",
  "FIRB_ISSUANCE",
  "PEZA_MEMO",
  "SEC_GUIDANCE",
  "LGU"
]);

const ACCOUNTING_AUTHORITY_TYPES = new Set([
  "PFRS",
  "PAS",
  "PSA"
]);

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

function trimText(value = "", max = 1200) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function serializeError(error = null) {
  if (!error) {
    return {
      exists: false,
      name: null,
      message: null,
      code: null,
      status: null,
      type: null
    };
  }

  return {
    exists: true,
    name: error.name || "Error",
    message: trimText(error.message || String(error), 900),
    code: error.code || error.error?.code || null,
    status: error.status || error.response?.status || null,
    type: error.type || error.error?.type || null
  };
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "UNKNOWN").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",
    STATUTES: "STATUTE",
    STATUTE: "STATUTE",
    LAW: "STATUTE",
    LAWS: "STATUTE",
    NIRC: "NIRC",
    TAX_CODE: "TAX_CODE",
    NATIONAL_INTERNAL_REVENUE_CODE: "NIRC",
    CMTA: "CMTA",
    CUSTOMS_MODERNIZATION_AND_TARIFF_ACT: "CMTA",
    LGC: "LGC",
    LOCAL_GOVERNMENT_CODE: "LGC",
    REPUBLIC_ACT: "REPUBLIC_ACT",
    RA: "REPUBLIC_ACT",
    TAX_TREATY: "TAX_TREATY",
    TREATY: "TAX_TREATY",
    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",
    CA: "COURT_OF_APPEALS",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",
    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",
    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    FIRB: "FIRB_ISSUANCE",
    FIRB_ISSUANCE: "FIRB_ISSUANCE",
    PEZA: "PEZA_MEMO",
    PEZA_MEMO: "PEZA_MEMO",
    SEC: "SEC_GUIDANCE",
    SEC_GUIDANCE: "SEC_GUIDANCE",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",
    LGU: "LGU",
    LGU_ISSUANCE: "LGU",
    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN: "FOREIGN_AUTHORITY",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",
    CPA_NOTES: "CPA_NOTES",
    REVIEW_MATERIALS: "REVIEW_MATERIALS",
    SECONDARY: "SECONDARY",
    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function getAuthorityPrecedence(source = {}) {
  const explicit = Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.authorityPrecedence ??
      source.authority_precedence ??
      source.authorityLevel ??
      source.authority_level ??
      source.metadata?.controllingPrecedence ??
      source.metadata?.authorityLevel ??
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) return explicit;

  const authorityType = normalizeAuthorityType(
    source.authorityType ||
      source.authority_type ||
      source.metadata?.authorityType ||
      source.metadata?.authority_type ||
      source.metadata?.sourceType ||
      "UNKNOWN"
  );

  return AUTHORITY_PRECEDENCE[authorityType] || 99;
}

function pickText(source = {}) {
  return (
    source.text ||
    source.content ||
    source.excerpt ||
    source.preview ||
    source.summary ||
    source.chunkText ||
    source.chunk_text ||
    source.pageContent ||
    source.page_content ||
    ""
  );
}

function pickTitle(source = {}, index = 0) {
  return trimText(
    source.title ||
      source.sourceTitle ||
      source.source_title ||
      source.documentTitle ||
      source.document_title ||
      source.source ||
      source.sourcePath ||
      source.source_path ||
      source.path ||
      source.metadata?.documentTitle ||
      source.metadata?.originalFileName ||
      `Source ${index + 1}`,
    220
  );
}

function pickCitation(source = {}) {
  return trimText(
    source.citation ||
      source.reference ||
      source.normalizedReference ||
      source.normalized_reference ||
      source.issuanceNumber ||
      source.issuance_number ||
      source.grNumber ||
      source.gr_number ||
      source.caseNumber ||
      source.case_number ||
      source.metadata?.citation ||
      source.metadata?.reference ||
      source.metadata?.normalizedReference ||
      "",
    260
  );
}

function pickUrl(source = {}) {
  return (
    source.url ||
    source.driveViewUrl ||
    source.drive_view_url ||
    source.sourceUrl ||
    source.source_url ||
    source.metadata?.url ||
    source.metadata?.sourceUrl ||
    source.metadata?.driveViewUrl ||
    ""
  );
}

function compactSource(source = {}, index = 0) {
  const authorityType = normalizeAuthorityType(
    source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      source.authority_label ||
      source.metadata?.authorityType ||
      source.metadata?.sourceType ||
      "UNKNOWN"
  );

  const text = trimText(pickText(source), HARD_MAX_SOURCE_CHARS);
  const precedence = getAuthorityPrecedence({
    ...source,
    authorityType
  });

  return {
    id:
      source.id ||
      source.fileId ||
      source.file_id ||
      source.metadata?.fileId ||
      source.metadata?.file_id ||
      null,

    title: pickTitle(source, index),
    authorityType,
    citation: pickCitation(source),
    url: pickUrl(source),

    text,
    content: text,

    score:
      Number(
        source.finalScore ??
          source.final_score ??
          source.rerankScore ??
          source.rerank_score ??
          source.retrievalScore ??
          source.retrieval_score ??
          source.score ??
          source.similarity ??
          0
      ) || 0,

    controllingPrecedence: precedence,
    authorityLevel:
      Number(
        source.authorityLevel ??
          source.authority_level ??
          source.metadata?.authorityLevel ??
          precedence
      ) || precedence,

    targetAuthorityMatch:
      source.targetAuthorityMatch === true ||
      source.issueClassificationMatch?.targetAuthorityMatch === true,

    exactAuthorityMatch:
      source.exactAuthorityMatch === true ||
      source.issueClassificationMatch?.exactAuthorityMatch === true ||
      source.metadata?.exactCitationMatched === true,

    issueClassificationMatch: source.issueClassificationMatch || null,

    issueMismatch:
      source.issueMismatch === true ||
      source.issueClassificationMatch?.issueMismatch === true,

    superseded:
      source.superseded === true ||
      source.isSuperseded === true ||
      source.is_superseded === true ||
      source.metadata?.superseded === true ||
      source.metadata?.isSuperseded === true,

    retrievalPhase:
      source.retrievalPhase ||
      source.retrievalLayer ||
      source.metadata?.retrievalPhase ||
      source.metadata?.retrievalLayer ||
      null,

    metadata: {
      ...(source.metadata || {}),
      sourceType: authorityType,
      controllingPrecedence: precedence,
      compactedBy: "rag-answer-handler.js",
      ragAnswerHandlerVersion: ENGINE_VERSION,
      issueClassificationMatchPreserved: Boolean(source.issueClassificationMatch),
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      rawFullDocumentInjectionPrevented: true
    }
  };
}

function sourceKey(source = {}) {
  return [
    source.id,
    source.title,
    source.citation,
    source.url,
    source.authorityType
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

function dedupeSources(sources = []) {
  const seen = new Set();
  const output = [];

  for (const source of safeArray(sources)) {
    const key = sourceKey(source) || JSON.stringify(source).slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function sortSourcesByAuthority(sources = []) {
  return [...safeArray(sources)].sort((a, b) => {
    const aExact = Number(a.exactAuthorityMatch === true);
    const bExact = Number(b.exactAuthorityMatch === true);
    if (bExact !== aExact) return bExact - aExact;

    const aTarget = Number(a.targetAuthorityMatch === true);
    const bTarget = Number(b.targetAuthorityMatch === true);
    if (bTarget !== aTarget) return bTarget - aTarget;

    const aPrecedence = Number(a.controllingPrecedence || 99);
    const bPrecedence = Number(b.controllingPrecedence || 99);
    if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

    return Number(b.score || 0) - Number(a.score || 0);
  });
}

function normalizeIssueClassification({
  issueClassification = null,
  queryIntent = null,
  retrievalResult = null,
  adaptiveContext = null
} = {}) {
  return (
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    retrievalResult?.issueClassification?.orchestrationClassification ||
    retrievalResult?.issueClassification ||
    queryIntent?.issueClassification?.orchestrationClassification ||
    queryIntent?.issueClassification ||
    adaptiveContext?.issueClassification?.orchestrationClassification ||
    adaptiveContext?.issueClassification ||
    {}
  );
}

function normalizeIntent({
  queryIntent = null,
  orchestrationIntent = null,
  adaptiveContext = null
} = {}) {
  return (
    orchestrationIntent ||
    queryIntent?.orchestrationIntent ||
    queryIntent?.intentFlags ||
    queryIntent ||
    adaptiveContext?.orchestrationIntent ||
    {}
  );
}

function deriveModeFlags({
  intent = {},
  issueClassification = {},
  adaptiveContext = {},
  metadata = {}
} = {}) {
  const hook = lower(
    intent.routeHook ||
      intent.primaryCommand ||
      adaptiveContext.activeHook ||
      adaptiveContext.responsePlan?.hookCode ||
      metadata.hook ||
      ""
  );

  const responseMode = String(
    intent.responseMode ||
      adaptiveContext.responseMode ||
      adaptiveContext.responsePlan?.responseMode ||
      issueClassification.responseMode ||
      metadata.responseMode ||
      ""
  ).toUpperCase();

  const orchestrationMode = String(
    intent.orchestrationMode ||
      adaptiveContext.orchestrationMode ||
      adaptiveContext.responsePlan?.orchestrationMode ||
      issueClassification.orchestrationMode ||
      metadata.orchestrationMode ||
      ""
  ).toUpperCase();

  const commandMode = String(intent.commandMode || "").toUpperCase();

  const isQuiz =
    hook === "/quiz" ||
    responseMode === "QUIZ" ||
    orchestrationMode === "QUIZ" ||
    commandMode === "QUIZ" ||
    intent.requiresQuizMode === true;

  const isReview =
    hook === "/review" ||
    responseMode === "REVIEWER" ||
    orchestrationMode === "REVIEWER" ||
    commandMode === "REVIEW" ||
    intent.requiresReviewMode === true;

  const isCase =
    hook === "/case" ||
    responseMode === "CASE_ANALYSIS" ||
    orchestrationMode === "CASE_ANALYSIS" ||
    commandMode === "CASE" ||
    intent.requiresCaseMode === true;

  const isSource =
    hook === "/source" ||
    responseMode === "SOURCE" ||
    orchestrationMode === "SOURCE_LOOKUP" ||
    commandMode === "SOURCE" ||
    intent.requiresSourceVisibility === true;

  const isStandardLegal = !isQuiz && !isReview && !isSource;

  return {
    hook,
    responseMode,
    orchestrationMode,
    commandMode,
    isQuiz,
    isReview,
    isCase,
    isSource,
    isStandardLegal,
    shouldApplyFinalCompliance: isStandardLegal,
    shouldRequireAFStructure: isStandardLegal && !isCase,
    shouldUseReviewerFormat: isReview,
    shouldUseQuizFormat: isQuiz,
    shouldUseSourceFormat: isSource
  };
}

function safeFinalizeSourcesForResponse(rawSources = [], options = {}) {
  try {
    const finalized = finalizeSourcesForResponse(rawSources, options);
    return Array.isArray(finalized) ? finalized : rawSources;
  } catch {
    return rawSources;
  }
}

function normalizeRetrievedSources({
  retrievedSources = [],
  retrievalResult = null,
  issueClassification = {}
} = {}) {
  const rawSources =
    safeArray(retrievedSources).length
      ? safeArray(retrievedSources)
      : safeArray(
          retrievalResult?.retrievedSources ||
            retrievalResult?.sources ||
            retrievalResult?.results ||
            retrievalResult?.matches ||
            []
        );

  const visibleSources = safeFinalizeSourcesForResponse(
    rawSources.slice(0, HARD_MAX_SOURCES * 2),
    {
      issueClassification,
      maxItems: HARD_MAX_SOURCES * 2
    }
  );

  return sortSourcesByAuthority(
    dedupeSources(
      safeArray(visibleSources)
        .map(compactSource)
        .filter((source) => !source.issueMismatch)
        .filter((source) => !source.superseded)
        .filter((source) => source.text || source.citation || source.title)
    )
  ).slice(0, HARD_MAX_SOURCES);
}

function normalizeConversationHistory(history = []) {
  try {
    return buildCompactConversationHistory(
      safeArray(history).slice(-HARD_MAX_HISTORY_ITEMS),
      HARD_MAX_HISTORY_ITEMS
    ).map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: trimText(item.content || "", 700)
    }));
  } catch {
    return safeArray(history)
      .slice(-HARD_MAX_HISTORY_ITEMS)
      .map((item) => ({
        role: item?.role === "assistant" ? "assistant" : "user",
        content: trimText(item?.content || "", 700)
      }));
  }
}

function normalizeTaxEngineMetadata({
  issueClassification = {},
  adaptiveContext = {},
  contextOrchestration = null,
  metadata = {}
} = {}) {
  const taxEngine =
    issueClassification.taxEngine ||
    issueClassification.tax_engine ||
    issueClassification.taxEngineMetadata ||
    issueClassification.tax_engine_metadata ||
    adaptiveContext.taxEngine ||
    adaptiveContext.tax_engine ||
    adaptiveContext.taxEngineMetadata ||
    adaptiveContext.tax_engine_metadata ||
    metadata.taxEngine ||
    metadata.tax_engine ||
    metadata.taxEngineMetadata ||
    metadata.tax_engine_metadata ||
    {};

  const domainCode =
    issueClassification.domainCode ||
    issueClassification.domain_code ||
    issueClassification.primaryDomain ||
    taxEngine.domainCode ||
    taxEngine.domain_code ||
    taxEngine.code ||
    null;

  const domainName =
    issueClassification.domainName ||
    issueClassification.domain_name ||
    taxEngine.domainName ||
    taxEngine.domain_name ||
    taxEngine.name ||
    null;

  return {
    domainCode,
    domainName,
    supportedDomain: domainCode ? SUPPORTED_TAX_DOMAINS.includes(String(domainCode).toUpperCase()) : false,

    retrievalStrategy:
      issueClassification.retrievalStrategy ||
      issueClassification.retrieval_strategy ||
      taxEngine.retrievalStrategy ||
      taxEngine.retrieval_strategy ||
      null,

    targetAuthorities: unique([
      ...safeArray(issueClassification.targetAuthorities),
      ...safeArray(issueClassification.target_authorities),
      ...safeArray(taxEngine.targetAuthorities),
      ...safeArray(taxEngine.target_authorities)
    ]).slice(0, 12),

    controllingAuthorities: safeArray(
      issueClassification.controllingAuthorities ||
        issueClassification.controlling_authorities ||
        taxEngine.controllingAuthorities ||
        taxEngine.controlling_authorities
    ).slice(0, HARD_MAX_AUTHORITY_ITEMS),

    supportingAuthorities: safeArray(
      issueClassification.supportingAuthorities ||
        issueClassification.supporting_authorities ||
        taxEngine.supportingAuthorities ||
        taxEngine.supporting_authorities
    ).slice(0, HARD_MAX_AUTHORITY_ITEMS),

    supportingJurisprudence: safeArray(
      issueClassification.supportingJurisprudence ||
        issueClassification.supporting_jurisprudence ||
        taxEngine.supportingJurisprudence ||
        taxEngine.supporting_jurisprudence
    ).slice(0, HARD_MAX_AUTHORITY_ITEMS),

    requiredAnswerSections: safeArray(
      issueClassification.requiredAnswerSections ||
        issueClassification.required_answer_sections ||
        taxEngine.requiredAnswerSections ||
        taxEngine.required_answer_sections
    ),

    answerTemplate:
      issueClassification.answerTemplate ||
      issueClassification.answer_template ||
      taxEngine.answerTemplate ||
      taxEngine.answer_template ||
      null,

    doctrinalRules:
      issueClassification.doctrinalRules ||
      issueClassification.doctrinal_rules ||
      taxEngine.doctrinalRules ||
      taxEngine.doctrinal_rules ||
      null,

    conflictRules:
      issueClassification.conflictRules ||
      issueClassification.conflict_rules ||
      taxEngine.conflictRules ||
      taxEngine.conflict_rules ||
      null,

    legalValidationRules:
      issueClassification.legalValidationRules ||
      issueClassification.legal_validation_rules ||
      taxEngine.legalValidationRules ||
      taxEngine.legal_validation_rules ||
      null,

    contextOrchestrationAware: Boolean(contextOrchestration)
  };
}

function classifyAuthorityBuckets(sources = []) {
  const controlling = [];
  const jurisprudence = [];
  const supportingRules = [];
  const accountingAuthorities = [];
  const persuasive = [];

  for (const source of safeArray(sources)) {
    const type = normalizeAuthorityType(source.authorityType);
    const precedence = Number(source.controllingPrecedence || getAuthorityPrecedence(source));

    if (PRIMARY_AUTHORITY_TYPES.has(type) || precedence <= 3) {
      controlling.push(source);
      continue;
    }

    if (JURISPRUDENCE_TYPES.has(type) || (precedence >= 4 && precedence <= 7)) {
      jurisprudence.push(source);
      continue;
    }

    if (ADMIN_AUTHORITY_TYPES.has(type) || (precedence >= 8 && precedence <= 11)) {
      supportingRules.push(source);
      continue;
    }

    if (ACCOUNTING_AUTHORITY_TYPES.has(type) || precedence === 12) {
      accountingAuthorities.push(source);
      continue;
    }

    persuasive.push(source);
  }

  return {
    controlling: sortSourcesByAuthority(controlling).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    jurisprudence: sortSourcesByAuthority(jurisprudence).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    supportingRules: sortSourcesByAuthority(supportingRules).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    accountingAuthorities: sortSourcesByAuthority(accountingAuthorities).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    persuasive: sortSourcesByAuthority(persuasive).slice(0, HARD_MAX_AUTHORITY_ITEMS)
  };
}

function formatSourceLine(source = {}, index = 0) {
  const citation = source.citation ? ` — ${source.citation}` : "";
  const title = source.title || `Source ${index + 1}`;
  const excerpt = source.text ? `: ${trimText(source.text, 280)}` : "";
  return `- ${title}${citation}${excerpt}`;
}

function buildAuthorityPacket({
  sources = [],
  issueClassification = {},
  taxEngineMetadata = {}
} = {}) {
  const buckets = classifyAuthorityBuckets(sources);

  return {
    sourceCount: sources.length,
    hasIndexedAuthority: sources.length > 0,
    hasControllingAuthority: buckets.controlling.length > 0,
    hasSupportingRules: buckets.supportingRules.length > 0,
    hasSupportingJurisprudence: buckets.jurisprudence.length > 0,

    controllingAuthorities: buckets.controlling,
    supportingJurisprudence: buckets.jurisprudence,
    supportingRules: buckets.supportingRules,
    accountingAuthorities: buckets.accountingAuthorities,
    persuasiveAuthorities: buckets.persuasive,

    taxEngineDeclaredAuthorities: {
      targetAuthorities: safeArray(taxEngineMetadata.targetAuthorities),
      controllingAuthorities: safeArray(taxEngineMetadata.controllingAuthorities),
      supportingAuthorities: safeArray(taxEngineMetadata.supportingAuthorities),
      supportingJurisprudence: safeArray(taxEngineMetadata.supportingJurisprudence)
    },

    primaryIssue: issueClassification.primaryIssue || null,
    subIssue: issueClassification.subIssue || null,
    retrievalStrategy:
      issueClassification.retrievalStrategy ||
      taxEngineMetadata.retrievalStrategy ||
      null,

    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    noFabricatedAuthorities: true
  };
}

function buildRequiredAnswerSections(taxEngineMetadata = {}, modeFlags = {}) {
  if (modeFlags.shouldUseReviewerFormat) return [...REVIEWER_SECTIONS];
  if (modeFlags.shouldUseQuizFormat) return [...QUIZ_SECTIONS];
  if (modeFlags.shouldUseSourceFormat) return [...SOURCE_SECTIONS];
  if (modeFlags.isCase) return [...CASE_SECTIONS];

  const fromTaxEngine = safeArray(taxEngineMetadata.requiredAnswerSections)
    .map(normalizeText)
    .filter(Boolean);

  if (fromTaxEngine.length) return fromTaxEngine;

  return [...STANDARD_SECTIONS];
}

function buildCompactClassification(issueClassification = {}, taxEngineMetadata = {}, modeFlags = {}) {
  return {
    primaryIssue: issueClassification.primaryIssue || null,
    subIssue: issueClassification.subIssue || null,
    domainCode: taxEngineMetadata.domainCode || issueClassification.domainCode || null,
    domainName: taxEngineMetadata.domainName || issueClassification.domainName || null,

    retrievalStrategy:
      issueClassification.retrievalStrategy ||
      taxEngineMetadata.retrievalStrategy ||
      null,

    targetAuthorities: safeArray(
      issueClassification.targetAuthorities ||
        taxEngineMetadata.targetAuthorities
    ).slice(0, 12),

    controllingAuthorities: safeArray(taxEngineMetadata.controllingAuthorities).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    supportingAuthorities: safeArray(taxEngineMetadata.supportingAuthorities).slice(0, HARD_MAX_AUTHORITY_ITEMS),
    supportingJurisprudence: safeArray(taxEngineMetadata.supportingJurisprudence).slice(0, HARD_MAX_AUTHORITY_ITEMS),

    requiredAnswerSections: buildRequiredAnswerSections(taxEngineMetadata, modeFlags),

    responseMode: issueClassification.responseMode || modeFlags.responseMode || null,
    orchestrationMode: issueClassification.orchestrationMode || modeFlags.orchestrationMode || null,
    factSensitivity: issueClassification.factSensitivity || null,

    answerTemplate: taxEngineMetadata.answerTemplate,
    doctrinalRules: taxEngineMetadata.doctrinalRules,
    conflictRules: taxEngineMetadata.conflictRules,
    legalValidationRules: taxEngineMetadata.legalValidationRules,

    forceStandardAFStructure: modeFlags.shouldRequireAFStructure === true,
    reviewerMode: modeFlags.isReview === true,
    quizMode: modeFlags.isQuiz === true,
    sourceMode: modeFlags.isSource === true,

    masterPromptAuthorityHierarchyApplied: true
  };
}

function buildCompactIntent(intent = {}) {
  return {
    intent: intent.intent || intent.type || null,
    responseMode: intent.responseMode || null,
    orchestrationMode: intent.orchestrationMode || null,

    requiresQuizMode: Boolean(intent.requiresQuizMode),
    requiresReviewMode: Boolean(intent.requiresReviewMode),
    requiresSourceVisibility: Boolean(intent.requiresSourceVisibility),
    requiresSimpleDefinition: Boolean(intent.requiresSimpleDefinition),
    requiresLegalAnalysis: Boolean(intent.requiresLegalAnalysis),
    requiresJurisprudence: Boolean(intent.requiresJurisprudence),
    requiresRiskAnalysis: Boolean(intent.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent.requiresFactPatternAnalysis),
    requiresEvidenceEvaluation: Boolean(intent.requiresEvidenceEvaluation),
    requiresContractInterpretation: Boolean(intent.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(intent.requiresTransactionCharacterization),
    requiresEconomicSubstance: Boolean(intent.requiresEconomicSubstance)
  };
}

function buildCompactAdaptiveContext(adaptiveContext = {}, modeFlags = {}) {
  return {
    activeMode:
      adaptiveContext.activeMode ||
      adaptiveContext.mode ||
      adaptiveContext.hookConfig?.mode ||
      null,

    activeHook:
      adaptiveContext.activeHook ||
      adaptiveContext.hookConfig?.hook_code ||
      null,

    responseMode:
      adaptiveContext.responseMode ||
      adaptiveContext.responsePlan?.responseMode ||
      modeFlags.responseMode ||
      null,

    orchestrationMode:
      adaptiveContext.orchestrationMode ||
      adaptiveContext.responsePlan?.orchestrationMode ||
      modeFlags.orchestrationMode ||
      null,

    taxEngineMetadata: adaptiveContext.taxEngineMetadata || adaptiveContext.tax_engine_metadata || null,

    reviewerMode: modeFlags.isReview === true,
    quizMode: modeFlags.isQuiz === true,
    sourceMode: modeFlags.isSource === true,
    standardLegalMode: modeFlags.isStandardLegal === true
  };
}

function buildSourceGroundingInstructions({
  authorityPacket = {},
  taxEngineMetadata = {},
  modeFlags = {}
} = {}) {
  return {
    mustUseRetrievedSourcesFirst: true,
    mustNotUseGeneralKnowledgeAsPrimaryBasis: true,
    mustNotInventAuthorities: true,

    mustSayIndexedSourceNotFoundWhenNoAuthority:
      authorityPacket.sourceCount === 0,

    doNotSayIndexedSourceNotFoundWhenSourcesExist:
      authorityPacket.sourceCount > 0,

    prohibitedPhrasesWhenSourcesExist: [
      "Indexed source not found.",
      "No legal basis was rendered",
      "No supporting rules were rendered",
      "No legal basis exists",
      "No legal basis is available"
    ],

    requiredReplacementWhenEmpty: "Indexed source not found.",

    requiredAnswerSections: buildRequiredAnswerSections(taxEngineMetadata, modeFlags),

    forceStandardAFStructure: modeFlags.shouldRequireAFStructure === true,

    reviewerFormat:
      modeFlags.isReview
        ? REVIEWER_SECTIONS
        : null,

    quizFormat:
      modeFlags.isQuiz
        ? QUIZ_SECTIONS
        : null,

    sourceFinderFormat:
      modeFlags.isSource
        ? SOURCE_SECTIONS
        : null,

    conflictDisplayRule:
      "Do not state 'Conflict Detected: YES' unless the same exact issue, same legal dimension, opposite holding/rule, hierarchy analysis, and conflict-resolution basis are all present.",

    authorityPacket
  };
}

function extractAnswerFromOpenAIResult(result = {}) {
  if (typeof result === "string") return result;

  return (
    result.answer ||
    result.text ||
    result.output_text ||
    result.completion?.choices?.[0]?.message?.content ||
    result.raw?.choices?.[0]?.message?.content ||
    result.response?.choices?.[0]?.message?.content ||
    ""
  );
}

function extractOrchestrationMetadata(result = {}) {
  return (
    result.orchestration ||
    result.orchestrationContext ||
    result.context ||
    result.metadata?.orchestration ||
    {}
  );
}

function answerContainsFalseNoSourceClaim(answer = "", sources = []) {
  const text = lower(answer);
  if (!sources.length) return false;

  return (
    text.includes("indexed source not found") ||
    text.includes("no legal basis was rendered") ||
    text.includes("no supporting rules were rendered") ||
    text.includes("no legal basis exists") ||
    text.includes("no legal basis is available")
  );
}

function answerLooksWeakOrUngrounded(answer = "", sources = [], modeFlags = {}) {
  const text = lower(answer);

  if (!normalizeText(answer)) return true;

  if (answerContainsFalseNoSourceClaim(answer, sources)) return true;

  if (sources.length === 0) {
    return !text.includes("indexed source not found");
  }

  if (!modeFlags.shouldRequireAFStructure) {
    return false;
  }

  const hasRequiredStructure =
    text.includes("direct answer") &&
    text.includes("controlling legal basis");

  return sources.length > 0 && !hasRequiredStructure;
}

function conflictCanBeDisplayed({
  hierarchyConflict = null,
  conflicts = []
} = {}) {
  const candidates = [
    hierarchyConflict,
    ...safeArray(conflicts)
  ].filter(Boolean);

  if (!candidates.length) return false;

  return candidates.some((item) => {
    const obj = safeObject(item);
    return Boolean(
      obj.sameExactIssue === true &&
        obj.sameLegalDimension === true &&
        obj.oppositeHoldingOrRule === true &&
        obj.hierarchyAnalysis &&
        obj.conflictResolutionBasis
    );
  });
}

function sanitizeConflictLanguage(answer = "", { hierarchyConflict = null, conflicts = [] } = {}) {
  if (conflictCanBeDisplayed({ hierarchyConflict, conflicts })) return answer;

  return String(answer || "")
    .replace(/Conflict Detected:\s*YES/gi, "Conflict Status: No direct conflict established from indexed sources")
    .replace(/Conflict detected:\s*YES/gi, "Conflict status: No direct conflict established from indexed sources");
}

function removeFalseNoSourceClaims(answer = "", sources = []) {
  if (!sources.length) return answer;

  return String(answer || "")
    .replace(/Indexed source not found\.?/gi, "")
    .replace(/No legal basis was rendered\.?/gi, "")
    .replace(/No supporting rules were rendered\.?/gi, "")
    .replace(/No legal basis exists\.?/gi, "")
    .replace(/No legal basis is available\.?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildReviewerFallbackAnswer({
  sources = [],
  issueClassification = {},
  authorityPacket = {}
} = {}) {
  const controlling = safeArray(authorityPacket.controllingAuthorities);
  const supporting = safeArray(authorityPacket.supportingRules);

  return [
    "Concept",
    issueClassification.subIssue || issueClassification.primaryIssue || "Tax concept identified from retrieved indexed sources.",
    "",
    "Rule",
    controlling.length
      ? controlling.map(formatSourceLine).join("\n")
      : sources.length
        ? sources.slice(0, 3).map(formatSourceLine).join("\n")
        : "Indexed source not found.",
    "",
    "Memory Aid",
    "Start with the controlling statute, then confirm with regulations, then check jurisprudence only when doctrine or conflict is relevant.",
    "",
    "Common Trap",
    "Do not rely on reviewer notes or general explanations over the NIRC, primary statute, Revenue Regulations, or controlling jurisprudence.",
    "",
    "Example",
    supporting.length
      ? supporting.slice(0, 2).map(formatSourceLine).join("\n")
      : "Use the retrieved authority above as the example anchor.",
    "",
    "Quick Check",
    "Can you identify the controlling authority, supporting rule, and whether jurisprudence is actually needed?"
  ].join("\n");
}

function buildQuizFallbackAnswer({
  sources = [],
  issueClassification = {}
} = {}) {
  const topic = issueClassification.subIssue || issueClassification.primaryIssue || "Philippine taxation";

  return [
    "Question",
    `Which authority should be checked first when answering a question on ${topic}?`,
    "",
    "Choices",
    "A. Reviewer notes",
    "B. General internet explanation",
    "C. Controlling statute or primary authority",
    "D. Unverified summary",
    "",
    "Answer Key",
    "C. Controlling statute or primary authority",
    "",
    "Explanation",
    sources.length
      ? "The retrieved indexed sources must be prioritized according to TINA's authority hierarchy."
      : "Indexed source not found."
  ].join("\n");
}

function buildSourceFinderFallbackAnswer({
  sources = [],
  authorityPacket = {}
} = {}) {
  if (!sources.length) return "Indexed source not found.";

  const controlling = safeArray(authorityPacket.controllingAuthorities);
  const rules = safeArray(authorityPacket.supportingRules);
  const cases = safeArray(authorityPacket.supportingJurisprudence);

  return [
    "Sources Found",
    sources.map(formatSourceLine).join("\n"),
    "",
    "Controlling Authorities",
    controlling.length ? controlling.map(formatSourceLine).join("\n") : "No controlling authority separately identified from retrieved sources.",
    "",
    "Supporting Authorities",
    [...rules, ...cases].length ? [...rules, ...cases].map(formatSourceLine).join("\n") : "No separate supporting authority identified from retrieved sources.",
    "",
    "Notes",
    "Sources are listed according to retrieved metadata and TINA's authority hierarchy."
  ].join("\n");
}

function buildStandardFallbackAnswer({
  sources = [],
  issueClassification = {},
  authorityPacket = {},
  taxEngineMetadata = {},
  error = null
} = {}) {
  const safeError = serializeError(error);
  const sections = buildRequiredAnswerSections(taxEngineMetadata, {
    shouldRequireAFStructure: true
  });

  const controlling = safeArray(authorityPacket.controllingAuthorities);
  const jurisprudence = safeArray(authorityPacket.supportingJurisprudence);
  const supportingRules = safeArray(authorityPacket.supportingRules);

  const directAnswer =
    sources.length > 0
      ? "Based on the indexed authorities retrieved by TINA, the answer must be anchored only on the validated sources listed below."
      : "Indexed source not found.";

  const controllingText =
    controlling.length > 0
      ? controlling.map(formatSourceLine).join("\n")
      : sources.length > 0
        ? "No separate controlling statute was identified from the retrieved sources."
        : "Indexed source not found.";

  const supportingRulesText =
    supportingRules.length > 0
      ? supportingRules.map(formatSourceLine).join("\n")
      : sources.length > 0
        ? "No separate administrative issuance was identified from the retrieved sources."
        : "Indexed source not found.";

  const jurisprudenceText =
    jurisprudence.length > 0
      ? jurisprudence.map(formatSourceLine).join("\n")
      : sources.length > 0
        ? "No separate jurisprudence was identified from the retrieved sources."
        : "Indexed source not found.";

  const doctrinalText =
    sources.length > 0
      ? "No direct doctrinal conflict is established from the indexed sources unless the same exact issue, same legal dimension, opposite holding or rule, hierarchy analysis, and conflict-resolution basis are all present."
      : "Indexed source not found.";

  const practicalText =
    sources.length > 0
      ? `Apply the retrieved authorities according to the Master Prompt hierarchy. Primary issue: ${issueClassification.primaryIssue || "Not classified"}. Sub-issue: ${issueClassification.subIssue || "Not classified"}.`
      : "Re-run retrieval or verify that the relevant Google Drive authority has been indexed.";

  const bodyBySection = new Map([
    ["A. DIRECT ANSWER", directAnswer],
    ["B. CONTROLLING LEGAL BASIS", controllingText],
    ["C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES", supportingRulesText],
    ["D. SUPPORTING JURISPRUDENCE", jurisprudenceText],
    ["E. DOCTRINAL STATUS / CONFLICT ANALYSIS", doctrinalText],
    ["F. PRACTICAL NOTE / APPLICATION", practicalText]
  ]);

  const answer = sections
    .map((section) => {
      const normalized = STANDARD_SECTIONS.find((item) =>
        lower(section).includes(lower(item.replace(/^[A-F]\.\s*/, "")))
      );

      const heading = normalized || section;
      const body = bodyBySection.get(normalized || section) || (sources.length ? "No separate item identified from retrieved sources." : "Indexed source not found.");

      return `${heading}\n${body}`;
    })
    .join("\n\n");

  if (!safeError.exists) return answer;

  return [
    answer,
    "",
    "SYSTEM NOTE",
    `A processing limitation occurred inside the RAG orchestration layer: ${safeError.message}`
  ].join("\n");
}

function buildSourceGroundedFallbackAnswer({
  sources = [],
  issueClassification = {},
  authorityPacket = {},
  taxEngineMetadata = {},
  modeFlags = {},
  error = null
} = {}) {
  if (modeFlags.isReview) {
    return buildReviewerFallbackAnswer({ sources, issueClassification, authorityPacket });
  }

  if (modeFlags.isQuiz) {
    return buildQuizFallbackAnswer({ sources, issueClassification });
  }

  if (modeFlags.isSource) {
    return buildSourceFinderFallbackAnswer({ sources, authorityPacket });
  }

  return buildStandardFallbackAnswer({
    sources,
    issueClassification,
    authorityPacket,
    taxEngineMetadata,
    error
  });
}

async function callOrchestrationOnly({
  openai = null,
  contextOrchestration = null,
  question = "",
  sources = [],
  conversationHistory = [],
  issueClassification = {},
  intent = {},
  adaptiveContext = {},
  authorityPacket = {},
  taxEngineMetadata = {},
  modeFlags = {},
  model = DEFAULT_MODEL,
  temperature = null
} = {}) {
  const caller =
    contextOrchestration?.callOpenAIWithOrchestration ||
    defaultCallOpenAIWithOrchestration;

  if (typeof caller !== "function") {
    throw new TypeError("callOpenAIWithOrchestration is not available.");
  }

  return await caller({
    openai,
    userQuery: question,
    question,

    retrievedSources: sources,
    sources,

    classification: buildCompactClassification(issueClassification, taxEngineMetadata, modeFlags),
    issueClassification: buildCompactClassification(issueClassification, taxEngineMetadata, modeFlags),

    intent: buildCompactIntent(intent),
    conversationHistory,

    adaptiveContext: buildCompactAdaptiveContext(adaptiveContext, modeFlags),

    authorityPacket,

    sourceGroundingInstructions: buildSourceGroundingInstructions({
      authorityPacket,
      taxEngineMetadata,
      modeFlags
    }),

    responseMode: modeFlags.responseMode || intent.responseMode || issueClassification.responseMode || null,
    orchestrationMode: modeFlags.orchestrationMode || intent.orchestrationMode || issueClassification.orchestrationMode || null,

    forceStandardAFStructure: modeFlags.shouldRequireAFStructure === true,
    reviewerMode: modeFlags.isReview === true,
    quizMode: modeFlags.isQuiz === true,
    sourceMode: modeFlags.isSource === true,

    model,
    temperature
  });
}

function buildSafeMetadata({
  metadata = {},
  sources = [],
  issueClassification = {},
  intent = {},
  orchestration = {},
  error = null,
  authorityPacket = {},
  taxEngineMetadata = {},
  modeFlags = {}
} = {}) {
  const safeError = serializeError(error);

  return {
    ...safeObject(metadata),

    ragAnswerHandlerVersion: ENGINE_VERSION,
    usesOrchestrationOnly: true,
    directOpenAICallDisabled: true,

    receivesSourcesFromRetrieval: true,
    passesSourcesToContextOrchestration: true,
    retrievedSourcesPreserved: true,

    noDuplicateRetrieval: true,
    noGiantPromptAssembly: true,
    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,
    compactSourcesOnly: true,

    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,

    primaryIssue: issueClassification?.primaryIssue || null,
    subIssue: issueClassification?.subIssue || null,
    domainCode: taxEngineMetadata.domainCode || null,
    domainName: taxEngineMetadata.domainName || null,
    supportedTaxDomain: taxEngineMetadata.supportedDomain === true,

    targetAuthorities: safeArray(
      issueClassification?.targetAuthorities ||
        taxEngineMetadata.targetAuthorities
    ),

    sourceCount: safeArray(sources).length,
    hasIndexedAuthority: authorityPacket.hasIndexedAuthority === true,
    hasControllingAuthority: authorityPacket.hasControllingAuthority === true,
    hasSupportingRules: authorityPacket.hasSupportingRules === true,
    hasSupportingJurisprudence: authorityPacket.hasSupportingJurisprudence === true,

    indexedSourceNotFound: safeArray(sources).length === 0,
    doNotGenerateIndexedSourceNotFoundWhenSourcesExist: safeArray(sources).length > 0,

    intent: intent?.intent || intent?.type || null,

    responseMode: modeFlags.responseMode || null,
    orchestrationMode:
      modeFlags.orchestrationMode ||
      orchestration?.mode ||
      orchestration?.orchestrationMode ||
      orchestration?.contextMode ||
      null,

    reviewerMode: modeFlags.isReview === true,
    quizMode: modeFlags.isQuiz === true,
    sourceMode: modeFlags.isSource === true,
    standardLegalMode: modeFlags.isStandardLegal === true,
    finalComplianceApplied: modeFlags.shouldApplyFinalCompliance === true,

    estimatedInputTokens:
      orchestration?.estimatedInputTokens ||
      orchestration?.diagnostics?.estimatedInputTokens ||
      null,

    maxCompletionTokens:
      orchestration?.maxCompletionTokens ||
      orchestration?.diagnostics?.maxCompletionTokens ||
      null,

    wasTrimmed:
      orchestration?.wasTrimmed ||
      orchestration?.diagnostics?.finalTrimApplied ||
      false,

    orchestrationError: safeError.exists ? safeError : null,
    orchestrationErrorMessage: safeError.exists ? safeError.message : null,
    failedInsideRagHandler: safeError.exists,

    debugHint:
      safeError.exists
        ? "This error came from callOpenAIWithOrchestration() or its downstream OpenAI call."
        : null
  };
}

function applyFinalGateAndRender({
  answer = "",
  fallbackAnswer = "",
  sources = [],
  issueClassification = {},
  adaptiveContext = {},
  question = "",
  jurisprudencePayload = null,
  hierarchyConflict = null,
  conflicts = [],
  orchestration = {},
  metadata = {},
  authorityPacket = {},
  taxEngineMetadata = {},
  modeFlags = {}
} = {}) {
  const guardedAnswer = sanitizeConflictLanguage(
    removeFalseNoSourceClaims(answer, sources),
    { hierarchyConflict, conflicts }
  );

  let finalAnswer = guardedAnswer;

  if (modeFlags.shouldApplyFinalCompliance) {
    try {
      finalAnswer = buildFinalCompliantAnswer({
        draftAnswer: guardedAnswer,
        answer: guardedAnswer,
        fallbackAnswer,
        legalBasisDocs: sources,
        sourcesUsed: sources,
        retrievedSources: sources,
        hierarchyConflict,
        conflicts,
        jurisprudencePayload,
        query: question,
        question,
        issueClassification,
        authorityPacket,
        taxEngineMetadata,
        orchestrationMode:
          orchestration?.mode ||
          orchestration?.orchestrationMode ||
          orchestration?.contextMode ||
          issueClassification?.orchestrationMode ||
          null,
        responseMode:
          issueClassification?.responseMode ||
          modeFlags.responseMode ||
          null,
        contextMode:
          orchestration?.contextMode ||
          orchestration?.mode ||
          null
      });
    } catch {
      finalAnswer = fallbackAnswer || guardedAnswer || (sources.length ? "" : "Indexed source not found.");
    }
  } else {
    finalAnswer = guardedAnswer || fallbackAnswer || (sources.length ? "" : "Indexed source not found.");
  }

  if (sources.length > 0) {
    finalAnswer = removeFalseNoSourceClaims(finalAnswer, sources);
  }

  const cleanAnswer = sanitizeAnswerForDisplay(
    sanitizeConflictLanguage(finalAnswer, {
      hierarchyConflict,
      conflicts
    })
  );

  // Quiz and reviewer modes must never go through renderTinaJsonPayload's A-F structure repair.
  // Return the clean answer directly with metadata — the assessment handler controls the format.
  if (modeFlags.isQuiz || modeFlags.isReview) {
    return {
      success: true,
      answer: cleanAnswer,
      sources: sources.slice(0, 5),
      metadata: {
        ...metadata,
        authorityPacket,
        taxEngineMetadata,
        modeFlags,
        finalGateApplied: false,
        finalAnswerComplianceEngine: "bypassed_for_quiz_review_mode",
        rendererEngine: "raw_passthrough",
        ragAnswerHandlerVersion: ENGINE_VERSION
      }
    };
  }

  return renderTinaJsonPayload({
    answer: cleanAnswer,
    sources,
    retrievedSources: sources,
    includeSourcesInAnswer: false,
    adaptiveContext,
    issueClassification,
    jurisprudencePayload,
    hierarchyConflict,
    orchestrationMode:
      modeFlags.orchestrationMode ||
      orchestration?.mode ||
      orchestration?.orchestrationMode ||
      orchestration?.contextMode ||
      null,
    contextMode:
      orchestration?.contextMode ||
      orchestration?.mode ||
      null,
    metadata: {
      ...metadata,
      authorityPacket,
      taxEngineMetadata,
      modeFlags,
      finalGateApplied: true,
      finalAnswerComplianceEngine:
        modeFlags.shouldApplyFinalCompliance
          ? "final-answer-compliance.js"
          : "bypassed_for_non_AF_mode",
      rendererEngine: "answer-renderer.js",
      ragAnswerHandlerVersion: ENGINE_VERSION
    }
  });
}

export async function generateRagAnswer({
  question = "",
  retrievedSources = [],
  retrievalResult = null,
  queryIntent = null,
  conversationHistory = [],
  issueClassification = {},
  orchestrationIntent = {},
  adaptiveContext = {},
  contextOrchestration = null,
  model = DEFAULT_MODEL,
  temperature = null,
  metadata = {},
  openai = null,
  jurisprudencePayload = null,
  hierarchyConflict = null,
  conflicts = []
} = {}) {
  const finalIssueClassification = normalizeIssueClassification({
    issueClassification,
    queryIntent,
    retrievalResult,
    adaptiveContext
  });

  const finalIntent = normalizeIntent({
    queryIntent,
    orchestrationIntent,
    adaptiveContext
  });

  const modeFlags = deriveModeFlags({
    intent: finalIntent,
    issueClassification: finalIssueClassification,
    adaptiveContext,
    metadata
  });

  const taxEngineMetadata = normalizeTaxEngineMetadata({
    issueClassification: finalIssueClassification,
    adaptiveContext,
    contextOrchestration,
    metadata
  });

  const sources = normalizeRetrievedSources({
    retrievedSources,
    retrievalResult,
    issueClassification: finalIssueClassification
  });

  const authorityPacket = buildAuthorityPacket({
    sources,
    issueClassification: finalIssueClassification,
    taxEngineMetadata
  });

  const history = normalizeConversationHistory(conversationHistory);

  let answer = "";
  let orchestration = {};
  let error = null;

  const fallbackAnswer = buildSourceGroundedFallbackAnswer({
    sources,
    issueClassification: finalIssueClassification,
    authorityPacket,
    taxEngineMetadata,
    modeFlags
  });

  try {
    const result = await callOrchestrationOnly({
      openai,
      contextOrchestration,
      question,
      sources,
      conversationHistory: history,
      issueClassification: finalIssueClassification,
      intent: finalIntent,
      adaptiveContext,
      authorityPacket,
      taxEngineMetadata,
      modeFlags,
      model,
      temperature
    });

    answer = extractAnswerFromOpenAIResult(result);
    orchestration = extractOrchestrationMetadata(result);

    if (answerLooksWeakOrUngrounded(answer, sources, modeFlags)) {
      answer = fallbackAnswer;
    }

    if (sources.length > 0) {
      answer = removeFalseNoSourceClaims(answer, sources);
    }
  } catch (err) {
    error = err;

    orchestration = {
      mode: "EMERGENCY_TRIM",
      contextMode: "EMERGENCY_TRIM",
      orchestrationMode: "EMERGENCY_TRIM",
      errorMessage: err?.message || "Unknown orchestration error",
      wasTrimmed: true,
      diagnostics: {
        ragHandlerCaughtError: true,
        errorMessage: err?.message || "Unknown orchestration error",
        sourceCount: sources.length,
        hasIndexedAuthority: authorityPacket.hasIndexedAuthority === true,
        primaryIssue: finalIssueClassification?.primaryIssue || null,
        subIssue: finalIssueClassification?.subIssue || null,
        masterPromptAuthorityHierarchyApplied: true
      }
    };

    answer = buildSourceGroundedFallbackAnswer({
      sources,
      issueClassification: finalIssueClassification,
      authorityPacket,
      taxEngineMetadata,
      modeFlags,
      error: err
    });

    if (sources.length > 0) {
      answer = removeFalseNoSourceClaims(answer, sources);
    }

    console.error("RAG orchestration error:", {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      status: err?.status,
      type: err?.type,
      sourceCount: sources.length,
      hasIndexedAuthority: authorityPacket.hasIndexedAuthority === true,
      primaryIssue: finalIssueClassification?.primaryIssue || null,
      subIssue: finalIssueClassification?.subIssue || null
    });
  }

  const safeMetadata = buildSafeMetadata({
    metadata,
    sources,
    issueClassification: finalIssueClassification,
    intent: finalIntent,
    orchestration,
    error,
    authorityPacket,
    taxEngineMetadata,
    modeFlags
  });

  return applyFinalGateAndRender({
    answer,
    fallbackAnswer,
    sources,
    issueClassification: finalIssueClassification,
    adaptiveContext,
    question,
    jurisprudencePayload,
    hierarchyConflict,
    conflicts,
    orchestration,
    metadata: safeMetadata,
    authorityPacket,
    taxEngineMetadata,
    modeFlags
  });
}

export async function generateRagAnswerWithContextOrchestration(args = {}) {
  return generateRagAnswer({
    ...args,
    metadata: {
      ...safeObject(args.metadata),
      usedContextOrchestrationEngine: true
    }
  });
}

export async function generateSimpleRagAnswer({
  question = "",
  retrievedSources = [],
  openai = null,
  contextOrchestration = null,
  model = DEFAULT_MODEL
} = {}) {
  return generateRagAnswer({
    question,
    retrievedSources,
    openai,
    contextOrchestration,
    model,
    issueClassification: {
      primaryIssue: "GENERAL_TAX",
      subIssue: "GENERAL_DEFINITION",
      responseMode: "FAST_DEFINITION",
      orchestrationMode: "FAST_DEFINITION"
    },
    orchestrationIntent: {
      requiresSimpleDefinition: true
    },
    metadata: {
      simpleMode: true
    }
  });
}

export function ragAnswerHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_RAG_ANSWER_HANDLER",
    version: ENGINE_VERSION,

    receivesSourcesFromRetrieval: true,
    passesSourcesToContextOrchestration: true,
    retrievedSourcesPreserved: true,

    orchestrationOnly: true,
    directOpenAICallDisabled: true,
    duplicateRetrievalDisabled: true,

    sourceGroundingFirst: true,
    indexedAuthorityAware: true,
    noIndexedSourceNotFoundWhenSourcesExist: true,

    authorityHierarchyAware: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,

    taxEngineCompatible: true,
    supportedTaxDomains: SUPPORTED_TAX_DOMAINS,

    afFormatBypassedForReview: true,
    afFormatBypassedForQuiz: true,
    reviewerFormatSupported: REVIEWER_SECTIONS,
    quizFormatSupported: QUIZ_SECTIONS,

    weakUngroundedAnswerGuardEnabled: true,
    prohibitedNoLegalBasisRenderedGuardEnabled: true,
    conflictDisplayGuardEnabled: true,

    noGiantPromptAssembly: true,
    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,

    compactSourcesOnly: true,
    compactMetadataOnly: true,

    contextOrchestrationCompatible: true,
    finalAnswerComplianceCompatible: true,
    answerRendererCompatible: true,

    esmCompatible: true
  };
}

export default {
  generateRagAnswer,
  generateRagAnswerWithContextOrchestration,
  generateSimpleRagAnswer,
  ragAnswerHandlerHealthCheck
};
