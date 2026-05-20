// FILE: context-orchestration-engine.js
"use strict";

/**
 * TINA Context Orchestration Engine
 * Version: 5.0.0
 *
 * FINAL ORCHESTRATION SOURCE
 *
 * This is the only file allowed to:
 * - estimate tokens
 * - classify complexity
 * - determine orchestration mode
 * - assign token budget
 * - trim retrieval
 * - compress sources
 * - assemble OpenAI messages
 * - final-trim OpenAI messages
 * - call OpenAI
 *
 * Boundary rules:
 * - does not retrieve
 * - does not rerank by calling reranker
 * - does not generate final answer outside OpenAI orchestration
 * - does not bypass tax-engine metadata
 * - preserves QUIZ_MODE and REVIEWER_MODE
 * - does not force A-F legal answer structure for quiz/reviewer routes
 */

import OpenAI from "openai";

const ENGINE_VERSION = "5.0.0";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  process.env.DEFAULT_OPENAI_MODEL ||
  "gpt-4o-mini";

const MODEL_CONTEXT_LIMITS = Object.freeze({
  "gpt-4o-mini": 128000,
  "gpt-4o": 128000,
  "gpt-4.1-mini": 1000000,
  "gpt-4.1": 1000000,
  "gpt-4.1-nano": 1000000,
  "gpt-5": 400000,
  "gpt-5-mini": 400000,
  "gpt-5-nano": 400000
});

const HARD_SAFETY_RATIO = 0.6;

const MODE_CONFIG = Object.freeze({
  QUIZ_MODE: {
    maxInputTokens: 12000,
    maxOutputTokens: 1400,
    maxSources: 5,
    maxCharsPerSource: 1000,
    maxHistoryItems: 4,
    temperature: 0.2
  },

  REVIEWER_MODE: {
    maxInputTokens: 18000,
    maxOutputTokens: 1800,
    maxSources: 6,
    maxCharsPerSource: 1200,
    maxHistoryItems: 20,
    temperature: 0.2
  },

  SOURCE_LOOKUP: {
    maxInputTokens: 14000,
    maxOutputTokens: 1200,
    maxSources: 8,
    maxCharsPerSource: 1100,
    maxHistoryItems: 3,
    temperature: 0.1
  },

  CASE_ANALYSIS: {
    maxInputTokens: 26000,
    maxOutputTokens: 2200,
    maxSources: 8,
    maxCharsPerSource: 1600,
    maxHistoryItems: 20,
    temperature: 0.1
  },

  FAST_DEFINITION: {
    maxInputTokens: 9000,
    maxOutputTokens: 900,
    maxSources: 4,
    maxCharsPerSource: 950,
    maxHistoryItems: 3,
    temperature: 0.1
  },

  STANDARD_TAX: {
    maxInputTokens: 18000,
    maxOutputTokens: 1600,
    maxSources: 6,
    maxCharsPerSource: 1350,
    maxHistoryItems: 20,
    temperature: 0.1
  },

  LEGAL_ANALYSIS: {
    maxInputTokens: 28000,
    maxOutputTokens: 2200,
    maxSources: 8,
    maxCharsPerSource: 1600,
    maxHistoryItems: 20,
    temperature: 0.1
  },

  COMPLEX_ADVISORY: {
    maxInputTokens: 36000,
    maxOutputTokens: 2600,
    maxSources: 10,
    maxCharsPerSource: 1650,
    maxHistoryItems: 20,
    temperature: 0.1
  },

  CODE_PATCH_MODE: {
    maxInputTokens: 20000,
    maxOutputTokens: 2000,
    maxSources: 6,
    maxCharsPerSource: 1200,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  DEBUG_MODE: {
    maxInputTokens: 20000,
    maxOutputTokens: 2000,
    maxSources: 6,
    maxCharsPerSource: 1200,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  EMERGENCY_TRIM: {
    maxInputTokens: 7000,
    maxOutputTokens: 700,
    maxSources: 3,
    maxCharsPerSource: 650,
    maxHistoryItems: 2,
    temperature: 0.1
  }
});

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

  ADMINISTRATIVE_GUIDANCE: 11,
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

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
});

const GOOGLE_DRIVE_AUTHORITY_FOLDER_PRIORITY = Object.freeze({
  "01_tax_code": 2,
  "02_revenue_regulations": 8,
  "03_rmc": 9,
  "04_rmo": 9,
  "05_bir_rulings": 10,
  "06_court_cases": 5,
  "07_cpa_notes": 14,
  "08_review_materials": 14
});

const EXCLUDED_NON_REVIEW_FOLDERS = Object.freeze([
  "07_cpa_notes",
  "08_review_materials"
]);

const REVIEW_MODE_MARKERS = Object.freeze([
  "TAX_REVIEWER",
  "REVIEWER",
  "REVIEW",
  "REVIEWER_MODE"
]);

const QUIZ_MODE_MARKERS = Object.freeze([
  "QUIZ",
  "QUIZ_MODE",
  "ASSESSMENT",
  "DIAGNOSTIC"
]);

const SOURCE_MODE_MARKERS = Object.freeze([
  "SOURCE",
  "SOURCE_LOOKUP",
  "SOURCE_FINDER"
]);

const CASE_MODE_MARKERS = Object.freeze([
  "CASE",
  "CASE_ANALYSIS",
  "JURISPRUDENCE"
]);

const AUDIT_MODE_MARKERS = Object.freeze([
  "AUDIT",
  "AUDIT_MODE",
  "COMPLEX_ADVISORY",
  "AUDIT_FACT_PATTERN"
]);

const CODE_PATCH_MODE_MARKERS = Object.freeze([
  "PATCH",
  "CODE_PATCH",
  "CODE_PATCH_MODE"
]);

const DEBUG_MODE_MARKERS = Object.freeze([
  "DEBUG",
  "DEBUG_MODE",
  "DIAGNOSTIC_DEEP"
]);

const CONTROLLING_TYPES = new Set([
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

const ADMIN_TYPES = new Set([
  "RR",
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

const ACCOUNTING_TYPES = new Set([
  "PFRS",
  "PAS",
  "PSA"
]);

function safeString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function unique(values = []) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

function normalizeWhitespace(value = "") {
  return safeString(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function lower(value = "") {
  return normalizeWhitespace(value).toLowerCase();
}

function upper(value = "") {
  return normalizeWhitespace(value).toUpperCase();
}

function truncateByChars(value = "", maxChars = 1200) {
  const text = safeString(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}\n\n[Trimmed by context orchestration.]`;
}

function truncateByTokens(value = "", maxTokens = 1000) {
  return truncateByChars(value, Math.max(0, Math.floor(maxTokens * 3.6)));
}

export function estimateTokens(text = "") {
  const value = safeString(text);
  if (!value) return 0;
  return Math.ceil(value.length / 3.6);
}

export function estimatePromptTokens(text = "") {
  return estimateTokens(text);
}

export function estimateMessagesTokens(messages = []) {
  return safeArray(messages).reduce((sum, msg) => {
    return (
      sum +
      estimateTokens(msg.role || "") +
      estimateTokens(msg.content || "") +
      6
    );
  }, 0);
}

function normalizeIssue(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeAuthority(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

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

function normalizeBuildArgs(args = {}) {
  const adaptiveContext = args.adaptiveContext || {};
  const responsePlan = args.responsePlan || adaptiveContext?.responsePlan || {};

  return {
    userQuery:
      args.userQuery ||
      args.question ||
      args.query ||
      "",

    systemPrompt:
      args.systemPrompt ||
      "",

    masterPrompt:
      args.masterPrompt ||
      "",

    retrievedSources:
      args.retrievedSources ||
      args.sources ||
      [],

    classification:
      args.classification?.orchestrationClassification ||
      args.classification ||
      args.issueClassification?.orchestrationClassification ||
      args.issueClassification ||
      {},

    intent:
      args.intent?.orchestrationIntent ||
      args.intent?.intentFlags ||
      args.intent ||
      args.orchestrationIntent ||
      {},

    sourceGroundingInstructions:
      args.sourceGroundingInstructions ||
      {},

    authorityPacket:
      args.authorityPacket ||
      {},

    conversationHistory:
      args.conversationHistory ||
      args.messages ||
      [],

    adaptiveContext,

    responsePlan,

    explicitResponseMode:
      args.responseMode ||
      responsePlan.responseMode ||
      adaptiveContext.responseMode ||
      adaptiveContext.responsePlan?.responseMode ||
      null,

    explicitOrchestrationMode:
      args.orchestrationMode ||
      responsePlan.orchestrationMode ||
      responsePlan.contextMode ||
      adaptiveContext.orchestrationMode ||
      adaptiveContext.responsePlan?.orchestrationMode ||
      null,

    forceStandardAFStructure:
      args.forceStandardAFStructure === true ||
      responsePlan.forceStandardAFStructure === true,

    reviewerMode:
      args.reviewerMode === true ||
      responsePlan.reviewerMode === true ||
      adaptiveContext.reviewerMode === true,

    quizMode:
      args.quizMode === true ||
      responsePlan.quizMode === true ||
      adaptiveContext.quizMode === true,

    sourceMode:
      args.sourceMode === true ||
      responsePlan.sourceMode === true ||
      adaptiveContext.sourceMode === true,

    model:
      args.model ||
      DEFAULT_MODEL,

    temperature:
      args.temperature
  };
}

function collectModeValues({ adaptiveContext = {}, classification = {}, intent = {}, responsePlan = {}, args = {} } = {}) {
  return [
    args.explicitResponseMode,
    args.explicitOrchestrationMode,
    args.reviewerMode ? "REVIEWER_MODE" : null,
    args.quizMode ? "QUIZ_MODE" : null,
    args.sourceMode ? "SOURCE_LOOKUP" : null,

    adaptiveContext?.activeMode,
    adaptiveContext?.mode,
    adaptiveContext?.hookConfig?.mode,
    adaptiveContext?.activeHook,
    adaptiveContext?.hookConfig?.hook_code,
    adaptiveContext?.responseMode,
    adaptiveContext?.orchestrationMode,
    adaptiveContext?.responsePlan?.responseMode,
    adaptiveContext?.responsePlan?.orchestrationMode,

    responsePlan?.responseMode,
    responsePlan?.orchestrationMode,
    responsePlan?.contextMode,

    classification?.responseMode,
    classification?.orchestrationMode,
    classification?.mode,

    intent?.mode,
    intent?.intent,
    intent?.responseMode,
    intent?.orchestrationMode,
    intent?.commandMode,
    intent?.primaryCommand,
    intent?.routeHook
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
}

function markerIncluded(values = [], markers = []) {
  return values.some((value) =>
    markers.some((marker) => value.includes(marker))
  );
}

function detectModeFlags({ adaptiveContext = {}, classification = {}, intent = {}, responsePlan = {}, args = {} } = {}) {
  const values = collectModeValues({
    adaptiveContext,
    classification,
    intent,
    responsePlan,
    args
  });

  const hook = lower(
    adaptiveContext?.activeHook ||
      adaptiveContext?.hookConfig?.hook_code ||
      intent?.routeHook ||
      intent?.primaryCommand ||
      ""
  );

  const isQuiz =
    args.quizMode === true ||
    adaptiveContext?.assessmentMode === true ||
    adaptiveContext?.adaptiveQuizMode === true ||
    intent?.assessmentMode === true ||
    intent?.adaptiveQuizMode === true ||
    intent?.requiresQuizMode === true ||
    hook === "/quiz" ||
    markerIncluded(values, QUIZ_MODE_MARKERS);

  const isReviewer =
    args.reviewerMode === true ||
    intent?.requiresReviewMode === true ||
    intent?.explicitlyRequestedReviewMaterials === true ||
    hook === "/review" ||
    markerIncluded(values, REVIEW_MODE_MARKERS);

  const isSource =
    args.sourceMode === true ||
    intent?.requiresSourceVisibility === true ||
    hook === "/source" ||
    markerIncluded(values, SOURCE_MODE_MARKERS);

  const isCase =
    intent?.requiresCaseMode === true ||
    hook === "/case" ||
    markerIncluded(values, CASE_MODE_MARKERS);

  const isAudit =
    args.auditMode === true ||
    hook === "/audit" ||
    markerIncluded(values, AUDIT_MODE_MARKERS);

  const isPatch =
    hook === "/patch" ||
    markerIncluded(values, CODE_PATCH_MODE_MARKERS);

  const isDebug =
    hook === "/debug" ||
    markerIncluded(values, DEBUG_MODE_MARKERS);

  const isNonAFMode = isQuiz || isReviewer || isSource || isAudit || isPatch || isDebug;

  return {
    isQuiz,
    isReviewer,
    isReview: isReviewer,
    isSource,
    isCase,
    isAudit,
    isPatch,
    isDebug,
    isNonAFMode,
    isStandardLegal: !isNonAFMode,
    shouldForceAFStructure:
      !isNonAFMode &&
      args.forceStandardAFStructure === true,

    modeValues: values
  };
}

function isReviewMode({ adaptiveContext = {}, classification = {}, intent = {}, responsePlan = {}, args = {} } = {}) {
  return detectModeFlags({
    adaptiveContext,
    classification,
    intent,
    responsePlan,
    args
  }).isReviewer || detectModeFlags({
    adaptiveContext,
    classification,
    intent,
    responsePlan,
    args
  }).isQuiz;
}

function resolveExplicitMode({ adaptiveContext = {}, classification = {}, intent = {}, responsePlan = {}, args = {} } = {}) {
  const flags = detectModeFlags({
    adaptiveContext,
    classification,
    intent,
    responsePlan,
    args
  });

  if (flags.isQuiz) return "QUIZ_MODE";
  if (flags.isReviewer) return "REVIEWER_MODE";
  if (flags.isSource) return "SOURCE_LOOKUP";
  if (flags.isCase) return "CASE_ANALYSIS";

  const explicit =
    args.explicitOrchestrationMode ||
    args.explicitResponseMode ||
    responsePlan?.contextMode ||
    responsePlan?.orchestrationMode ||
    responsePlan?.responseMode ||
    adaptiveContext?.orchestrationMode ||
    adaptiveContext?.responsePlan?.orchestrationMode ||
    adaptiveContext?.responseMode ||
    classification?.orchestrationMode ||
    classification?.responseMode ||
    intent?.orchestrationMode ||
    intent?.responseMode ||
    null;

  if (!explicit) return null;

  const raw = String(explicit).trim().toUpperCase();

  const aliases = {
    QUIZ: "QUIZ_MODE",
    ASSESSMENT: "QUIZ_MODE",
    DIAGNOSTIC: "QUIZ_MODE",
    REVIEW: "REVIEWER_MODE",
    REVIEWER: "REVIEWER_MODE",
    TAX_REVIEWER: "REVIEWER_MODE",
    SOURCE: "SOURCE_LOOKUP",
    SOURCE_FINDER: "SOURCE_LOOKUP",
    CASE: "CASE_ANALYSIS",
    JURISPRUDENCE: "CASE_ANALYSIS",
    FAST_DEFINITION: "FAST_DEFINITION",
    STANDARD: "STANDARD_TAX",
    STANDARD_TAX: "STANDARD_TAX",
    LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
    COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
    AUDIT: "COMPLEX_ADVISORY",
    DEBUGGING: "DEBUG_MODE",
    DEBUG: "DEBUG_MODE",
    CODE: "CODE_PATCH_MODE",
    CODE_PATCH: "CODE_PATCH_MODE",
    PATCH: "CODE_PATCH_MODE"
  };

  return aliases[raw] || (MODE_CONFIG[raw] ? raw : null);
}

function sourceHaystack(source = {}) {
  return lower(
    [
      source.title,
      source.citation,
      source.url,
      source.sourcePath,
      source.source_path,
      source.path,
      source.folder,
      source.folderName,
      source.folder_name,
      source.originalSource,
      source.original_source,
      source.metadata?.path,
      source.metadata?.folder,
      source.metadata?.folderName,
      source.metadata?.documentTitle,
      source.metadata?.originalFileName,
      source.authorityType,
      source.authority_type,
      source.text,
      source.content
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getGoogleDriveFolderPriority(source = {}) {
  const haystack = sourceHaystack(source);

  for (const [folder, priority] of Object.entries(GOOGLE_DRIVE_AUTHORITY_FOLDER_PRIORITY)) {
    if (haystack.includes(folder)) return priority;
  }

  return null;
}

function isExcludedReviewSource(source = {}) {
  const haystack = sourceHaystack(source);
  return EXCLUDED_NON_REVIEW_FOLDERS.some((folder) => haystack.includes(folder));
}

function isPreferredIndexedGoogleDriveSource(source = {}) {
  const folderPriority = getGoogleDriveFolderPriority(source);
  if (!folderPriority) return false;
  return folderPriority <= 11;
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

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  const authorityType = normalizeAuthority(
    source.authorityType ||
      source.authority_type ||
      source.type ||
      source.category ||
      source.sourceType ||
      source.metadata?.authorityType ||
      "UNKNOWN"
  );

  const folderPriority = getGoogleDriveFolderPriority(source);
  const authorityPriority = AUTHORITY_PRECEDENCE[authorityType] || 99;

  if (folderPriority && folderPriority < authorityPriority) {
    return folderPriority;
  }

  return authorityPriority;
}

function extractText(source = {}) {
  return normalizeWhitespace(
    source.text ||
      source.content ||
      source.chunkText ||
      source.chunk_text ||
      source.excerpt ||
      source.preview ||
      source.pageContent ||
      source.page_content ||
      source.summary ||
      source.doctrineSummary ||
      ""
  );
}

function normalizeSource(source = {}, index = 0) {
  const title =
    source.title ||
    source.sourceTitle ||
    source.source_title ||
    source.name ||
    source.fileName ||
    source.filename ||
    source.documentTitle ||
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    `Source ${index + 1}`;

  const authorityType = normalizeAuthority(
    source.authorityType ||
      source.authority_type ||
      source.type ||
      source.category ||
      source.sourceType ||
      source.metadata?.authorityType ||
      "UNKNOWN"
  );

  const citation =
    source.citation ||
    source.reference ||
    source.normalizedReference ||
    source.normalized_reference ||
    source.metadata?.citation ||
    source.metadata?.reference ||
    source.metadata?.normalizedReference ||
    source.url ||
    source.driveViewUrl ||
    source.drive_view_url ||
    source.sourceUrl ||
    source.source_url ||
    source.fileId ||
    source.id ||
    "";

  const text = extractText(source);

  const score =
    Number(
      source.finalScore ??
        source.final_score ??
        source.rerankScore ??
        source.rerank_score ??
        source.retrievalScore ??
        source.retrieval_score ??
        source.score ??
        source.similarity ??
        source.relevance ??
        source.rankScore ??
        0
    ) || 0;

  const controllingPrecedence = getAuthorityPrecedence({
    ...source,
    authorityType
  });

  const issueClassificationMatch =
    source.issueClassificationMatch ||
    source.issue_classification_match ||
    null;

  const targetAuthorityMatch =
    source.targetAuthorityMatch === true ||
    source.target_authority_match === true ||
    issueClassificationMatch?.targetAuthorityMatch === true;

  const exactAuthorityMatch =
    source.exactAuthorityMatch === true ||
    source.exact_authority_match === true ||
    source.metadata?.exactCitationMatched === true ||
    issueClassificationMatch?.exactAuthorityMatch === true;

  const issueMatched =
    issueClassificationMatch?.matched === true ||
    issueClassificationMatch?.issueOverlap === true ||
    source.issueMatched === true ||
    source.issue_matched === true;

  const superseded =
    source.superseded === true ||
    source.isSuperseded === true ||
    source.is_superseded === true ||
    source.metadata?.superseded === true ||
    source.metadata?.isSuperseded === true;

  const sourceVisible =
    source.visible !== false &&
    source.sourceVisible !== false &&
    source.source_visible !== false &&
    source.metadata?.visible !== false &&
    source.metadata?.sourceVisible !== false;

  const doctrinallyImportant =
    source.doctrinallyImportant === true ||
    source.doctrinally_important === true ||
    source.doctrineRelevant === true ||
    source.doctrine_relevant === true ||
    source.conflictRelevant === true ||
    source.conflict_relevant === true ||
    JURISPRUDENCE_TYPES.has(authorityType);

  return {
    id:
      source.id ||
      source.fileId ||
      source.file_id ||
      source.metadata?.fileId ||
      source.metadata?.file_id ||
      null,

    title: truncateByChars(title, 220),
    authorityType,
    citation: truncateByChars(citation, 260),
    url:
      source.url ||
      source.driveViewUrl ||
      source.drive_view_url ||
      source.sourceUrl ||
      source.source_url ||
      "",

    text,
    content: text,

    score,
    controllingPrecedence,

    issueClassificationMatch,
    targetAuthorityMatch,
    exactAuthorityMatch,
    issueMatched,

    issueMismatch:
      source.issueMismatch === true ||
      source.issue_mismatch === true ||
      issueClassificationMatch?.issueMismatch === true,

    superseded,
    sourceVisible,
    doctrinallyImportant,

    retrievalPhase:
      source.retrievalPhase ||
      source.retrieval_phase ||
      source.retrievalLayer ||
      source.retrieval_layer ||
      source.metadata?.retrievalPhase ||
      source.metadata?.retrievalLayer ||
      null,

    sourcePriority:
      source.sourcePriority ||
      source.source_priority ||
      source.metadata?.sourcePriority ||
      null,

    googleDriveFolderPriority: getGoogleDriveFolderPriority(source),
    indexedGoogleDriveAuthority: isPreferredIndexedGoogleDriveSource(source),
    excludedReviewSource: isExcludedReviewSource(source),

    metadata: {
      ...(source.metadata || {}),
      authorityType,
      controllingPrecedence,
      sourceVisible,
      superseded,
      targetAuthorityMatch,
      exactAuthorityMatch,
      issueMatched,
      doctrinallyImportant,
      indexedGoogleDriveAuthority: isPreferredIndexedGoogleDriveSource(source),
      retrievalPhase:
        source.retrievalPhase ||
        source.retrieval_phase ||
        source.retrievalLayer ||
        source.retrieval_layer ||
        source.metadata?.retrievalPhase ||
        source.metadata?.retrievalLayer ||
        null,
      contextOrchestrationEngineVersion: ENGINE_VERSION,
      issueClassificationMatchPreserved: Boolean(issueClassificationMatch),
      masterPromptAuthorityHierarchyApplied: true
    }
  };
}

function sourceIdentity(source = {}) {
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
    const key = sourceIdentity(source) || `${source.title}|${source.text}`.slice(0, 240);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function sourceAuthorityBucket(source = {}) {
  const type = normalizeAuthority(source.authorityType);
  const precedence = Number(source.controllingPrecedence || 99);

  if (CONTROLLING_TYPES.has(type) || precedence <= 3) return "CONTROLLING";
  if (JURISPRUDENCE_TYPES.has(type) || (precedence >= 4 && precedence <= 7)) return "JURISPRUDENCE";
  if (ADMIN_TYPES.has(type) || (precedence >= 8 && precedence <= 11)) return "ADMIN";
  if (ACCOUNTING_TYPES.has(type) || precedence === 12) return "ACCOUNTING";
  if (type === "CPA_NOTES" || type === "REVIEW_MATERIALS" || type === "SECONDARY") return "SECONDARY";

  return "OTHER";
}

function authorityPriority(source = {}) {
  const type = normalizeAuthority(source.authorityType);
  const precedence = Number(source.controllingPrecedence || AUTHORITY_PRECEDENCE[type] || 99);

  if (precedence <= 14) return 150 - precedence * 7;

  const authority = `${source.title} ${source.authorityType} ${source.citation}`.toLowerCase();

  if (authority.includes("constitution")) return 145;
  if (authority.includes("nirc") || authority.includes("tax code") || authority.includes("statute")) return 136;
  if (authority.includes("treaty")) return 129;
  if (authority.includes("supreme court") || authority.includes("g.r.") || authority.includes("gr no")) return 122;
  if (authority.includes("cta en banc")) return 108;
  if (authority.includes("cta")) return 101;
  if (authority.includes("revenue regulation") || /\brr\b/.test(authority)) return 94;
  if (authority.includes("revenue memorandum circular") || /\brmc\b/.test(authority)) return 87;
  if (authority.includes("revenue memorandum order") || /\brmo\b/.test(authority)) return 87;
  if (authority.includes("ramo")) return 87;
  if (authority.includes("bir ruling")) return 80;
  if (authority.includes("pfrs") || authority.includes("pas ")) return 66;

  return 35;
}

function matchesTargetAuthority(source = {}, classification = {}) {
  const targetAuthorities = unique([
    ...safeArray(classification.targetAuthorities),
    ...safeArray(classification.target_authorities)
  ])
    .map(normalizeAuthority)
    .filter(Boolean);

  if (!targetAuthorities.length) return false;

  return targetAuthorities.includes(normalizeAuthority(source.authorityType));
}

function sourceSortScore(source = {}, classification = {}) {
  const issueBonus =
    source.issueClassificationMatch?.matched ||
    source.issueClassificationMatch?.issueOverlap ||
    source.issueMatched
      ? 120
      : 0;

  const targetBonus =
    source.targetAuthorityMatch ||
    matchesTargetAuthority(source, classification)
      ? 160
      : 0;

  const exactBonus = source.exactAuthorityMatch ? 140 : 0;
  const driveBonus = source.indexedGoogleDriveAuthority ? 55 : 0;
  const doctrineBonus = source.doctrinallyImportant ? 35 : 0;

  const retrievalPhaseBonus =
    source.retrievalPhase === "EXACT_AUTHORITY"
      ? 80
      : source.retrievalPhase === "NORMALIZED_AUTHORITY"
        ? 45
        : 0;

  const supersessionPenalty = source.superseded ? -5000 : 0;
  const visibilityPenalty = source.sourceVisible === false ? -5000 : 0;
  const mismatchPenalty = source.issueMismatch ? -4000 : 0;
  const reviewPenalty = source.excludedReviewSource ? -750 : 0;

  const precedence = Number(source.controllingPrecedence || 99);
  const score = Number(source.score || 0);

  return (
    authorityPriority(source) +
    targetBonus +
    exactBonus +
    issueBonus +
    driveBonus +
    doctrineBonus +
    retrievalPhaseBonus +
    score -
    precedence * 2 +
    supersessionPenalty +
    visibilityPenalty +
    mismatchPenalty +
    reviewPenalty
  );
}

export function assignBudget(model = DEFAULT_MODEL, mode = "STANDARD_TAX") {
  const modelLimit =
    MODEL_CONTEXT_LIMITS[model] ||
    Number(process.env.OPENAI_CONTEXT_LIMIT || 128000);

  const hardInputLimit = Math.floor(modelLimit * HARD_SAFETY_RATIO);
  const config = MODE_CONFIG[mode] || MODE_CONFIG.STANDARD_TAX;

  return {
    model,
    modelLimit,
    mode,
    maxInputTokens: Math.min(config.maxInputTokens, hardInputLimit),
    maxOutputTokens: config.maxOutputTokens,
    maxSources: config.maxSources,
    maxCharsPerSource: config.maxCharsPerSource,
    maxHistoryItems: config.maxHistoryItems,
    temperature: config.temperature
  };
}

function preserveAuthorityCriticalSources(sources = [], budget = assignBudget(), classification = {}) {
  const normalized = dedupeSources(sources);

  const sorted = [...normalized].sort((a, b) => {
    return sourceSortScore(b, classification) - sourceSortScore(a, classification);
  });

  const critical = [];
  const ordinary = [];

  for (const source of sorted) {
    const bucket = sourceAuthorityBucket(source);

    const isCritical =
      source.targetAuthorityMatch ||
      source.exactAuthorityMatch ||
      source.issueMatched ||
      source.indexedGoogleDriveAuthority ||
      source.doctrinallyImportant ||
      bucket === "CONTROLLING" ||
      bucket === "JURISPRUDENCE" ||
      bucket === "ADMIN" ||
      bucket === "ACCOUNTING";

    if (isCritical) critical.push(source);
    else ordinary.push(source);
  }

  const output = [];

  const pushIfRoom = (source) => {
    if (output.length >= budget.maxSources) return;
    const key = sourceIdentity(source);
    if (output.some((existing) => sourceIdentity(existing) === key)) return;
    output.push(source);
  };

  const targetMatched = critical.filter((source) => source.targetAuthorityMatch || matchesTargetAuthority(source, classification));
  const controlling = critical.filter((source) => sourceAuthorityBucket(source) === "CONTROLLING");
  const jurisprudence = critical.filter((source) => sourceAuthorityBucket(source) === "JURISPRUDENCE");
  const admin = critical.filter((source) => sourceAuthorityBucket(source) === "ADMIN");
  const accounting = critical.filter((source) => sourceAuthorityBucket(source) === "ACCOUNTING");
  const issueMatched = critical.filter((source) => source.issueMatched || source.issueClassificationMatch?.matched);
  const doctrinal = critical.filter((source) => source.doctrinallyImportant);

  [
    ...targetMatched,
    ...controlling,
    ...jurisprudence,
    ...admin,
    ...accounting,
    ...issueMatched,
    ...doctrinal,
    ...critical,
    ...ordinary
  ].forEach(pushIfRoom);

  return output;
}

function filterSourcesForMode(sources = [], { adaptiveContext = {}, classification = {}, intent = {}, modeFlags = {} } = {}) {
  const allowReviewSources =
    modeFlags.isReviewer ||
    modeFlags.isQuiz ||
    isReviewMode({
      adaptiveContext,
      classification,
      intent
    });

  return safeArray(sources).filter((source) => {
    if (!source.text) return false;
    if (source.issueMismatch) return false;
    if (source.superseded) return false;
    if (source.sourceVisible === false) return false;
    if (!allowReviewSources && source.excludedReviewSource) return false;
    return true;
  });
}

export function detectComplexity(userQuery = "", classification = {}, intent = {}) {
  const q = safeString(userQuery).toLowerCase();

  if (intent?.requiresQuizMode || intent?.requiresReviewMode) return "review";
  if (classification?.complexity) return String(classification.complexity).toLowerCase();
  if (intent?.complexity) return String(intent.complexity).toLowerCase();

  const simple =
    q.length <= 140 &&
    /^(what is|define|meaning of|ano ang)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|legal consequence|assessment|substance|evidence|compare|reconcile)\b/i.test(q);

  if (simple || intent?.requiresSimpleDefinition) return "simple";

  if (
    intent?.requiresFactPatternAnalysis ||
    intent?.requiresEvidenceEvaluation ||
    intent?.requiresContractInterpretation ||
    intent?.requiresTransactionCharacterization ||
    intent?.requiresEconomicSubstance ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile|legal consequence|fact pattern|principal|agent)\b/i.test(q)
  ) {
    return "complex";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    /\b(jurisprudence|doctrine|conflict|legal basis|supreme court|cta|g\.?\s*r\.?\s*no|case law)\b/i.test(q)
  ) {
    return "moderate";
  }

  return "standard";
}

export function determineMode(userQuery = "", classification = {}, intent = {}, extra = {}) {
  const adaptiveContext = extra.adaptiveContext || {};
  const responsePlan = extra.responsePlan || adaptiveContext.responsePlan || {};
  const explicitArgs = {
    explicitResponseMode: extra.responseMode || null,
    explicitOrchestrationMode: extra.orchestrationMode || null,
    reviewerMode: extra.reviewerMode === true,
    quizMode: extra.quizMode === true,
    sourceMode: extra.sourceMode === true,
    forceStandardAFStructure: extra.forceStandardAFStructure === true
  };

  const explicitMode = resolveExplicitMode({
    adaptiveContext,
    classification,
    intent,
    responsePlan,
    args: explicitArgs
  });

  if (explicitMode === "QUIZ_MODE") return "QUIZ_MODE";
  if (explicitMode === "REVIEWER_MODE") return "REVIEWER_MODE";
  if (explicitMode === "SOURCE_LOOKUP") return "SOURCE_LOOKUP";
  if (explicitMode === "CASE_ANALYSIS") return "CASE_ANALYSIS";

  const q = safeString(userQuery).toLowerCase();
  const complexity = detectComplexity(userQuery, classification, intent);
  const primaryIssue = normalizeIssue(classification?.primaryIssue || "");

  if (
    complexity === "simple" ||
    intent?.requiresSimpleDefinition ||
    (q.length <= 140 && /\b(what is|define|meaning)\b/i.test(q))
  ) {
    return "FAST_DEFINITION";
  }

  if (
    intent?.requiresFactPatternAnalysis ||
    intent?.requiresEvidenceEvaluation ||
    intent?.requiresContractInterpretation ||
    intent?.requiresTransactionCharacterization ||
    intent?.requiresEconomicSubstance ||
    ["TRANSACTION", "CONTRACT", "ECONOMIC_SUBSTANCE", "AUDIT", "ACCOUNTING"].includes(primaryIssue) ||
    /\b(audit|risk|contract|transaction|economic substance|substance over form|evidence|reconcile)\b/i.test(q)
  ) {
    return "COMPLEX_ADVISORY";
  }

  if (
    intent?.requiresLegalAnalysis ||
    intent?.requiresJurisprudence ||
    ["CASE_LAW", "DOCTRINE", "ASSESSMENT", "LITIGATION"].includes(primaryIssue) ||
    /\b(jurisprudence|doctrine|conflict|legal basis|case law|supreme court|cta)\b/i.test(q)
  ) {
    return "LEGAL_ANALYSIS";
  }

  return "STANDARD_TAX";
}

export function trimRetrieval(sources = [], budget = assignBudget(), options = {}) {
  const classification = options.classification || {};
  const intent = options.intent || {};
  const adaptiveContext = options.adaptiveContext || {};
  const modeFlags = options.modeFlags || {};

  const normalizedSources = safeArray(sources)
    .map((source, index) => normalizeSource(source, index));

  const filtered = filterSourcesForMode(normalizedSources, {
    adaptiveContext,
    classification,
    intent,
    modeFlags
  });

  return preserveAuthorityCriticalSources(filtered, budget, classification);
}

function getCompactExcerpt(source = {}, budget = assignBudget()) {
  const bucket = sourceAuthorityBucket(source);

  const maxChars =
    bucket === "SECONDARY"
      ? Math.floor(budget.maxCharsPerSource * 0.45)
      : budget.maxCharsPerSource;

  return truncateByChars(source.text, maxChars);
}

function compressOneSource(source = {}, budget = assignBudget(), index = 0) {
  const text = getCompactExcerpt(source, budget);

  return [
    `SOURCE ${index + 1}`,
    `Title: ${source.title}`,
    `Authority Type: ${source.authorityType}`,
    `Master Prompt Authority Precedence: ${source.controllingPrecedence}`,
    source.citation ? `Citation/Link: ${source.citation}` : null,
    source.url && source.url !== source.citation ? `URL: ${source.url}` : null,
    `Score: ${source.score}`,
    source.targetAuthorityMatch ? "Target Authority Match: YES" : null,
    source.exactAuthorityMatch ? "Exact Authority Match: YES" : null,
    source.issueClassificationMatch || source.issueMatched ? "Issue Classification Match: YES" : null,
    source.doctrinallyImportant ? "Doctrinally Important: YES" : null,
    source.indexedGoogleDriveAuthority ? "Indexed Google Drive Authority: YES" : null,
    source.retrievalPhase ? `Retrieval Phase: ${source.retrievalPhase}` : null,
    "Relevant Extract:",
    text
  ]
    .filter(Boolean)
    .join("\n");
}

export function compressSources(sources = [], budget = assignBudget(), options = {}) {
  return trimRetrieval(sources, budget, options)
    .map((source, index) => compressOneSource(source, budget, index))
    .join("\n\n---\n\n");
}

export function compressRetrievedSources(sources = [], maxChars = 1200) {
  return safeArray(sources)
    .map((source, index) => normalizeSource(source, index))
    .filter((source) => source.text && !source.issueMismatch && !source.superseded && source.sourceVisible !== false)
    .sort((a, b) => sourceSortScore(b) - sourceSortScore(a))
    .map((source) => ({
      id: source.id,
      title: source.title,
      authorityType: source.authorityType,
      citation: source.citation,
      url: source.url,
      score: source.score,
      controllingPrecedence: source.controllingPrecedence,
      targetAuthorityMatch: source.targetAuthorityMatch,
      exactAuthorityMatch: source.exactAuthorityMatch,
      issueClassificationMatch: source.issueClassificationMatch,
      issueMatched: source.issueMatched,
      doctrinallyImportant: source.doctrinallyImportant,
      indexedGoogleDriveAuthority: source.indexedGoogleDriveAuthority,
      retrievalPhase: source.retrievalPhase,
      text: truncateByChars(source.text, maxChars),
      content: truncateByChars(source.text, maxChars)
    }));
}

function buildAuthorityPreservationSummary(sources = []) {
  const buckets = {
    controlling: 0,
    jurisprudence: 0,
    administrative: 0,
    accounting: 0,
    secondary: 0,
    targetAuthorityMatches: 0,
    issueMatches: 0,
    exactAuthorityMatches: 0,
    indexedGoogleDriveAuthorities: 0
  };

  for (const source of safeArray(sources)) {
    const bucket = sourceAuthorityBucket(source);

    if (bucket === "CONTROLLING") buckets.controlling += 1;
    if (bucket === "JURISPRUDENCE") buckets.jurisprudence += 1;
    if (bucket === "ADMIN") buckets.administrative += 1;
    if (bucket === "ACCOUNTING") buckets.accounting += 1;
    if (bucket === "SECONDARY") buckets.secondary += 1;

    if (source.targetAuthorityMatch) buckets.targetAuthorityMatches += 1;
    if (source.issueMatched || source.issueClassificationMatch?.matched) buckets.issueMatches += 1;
    if (source.exactAuthorityMatch) buckets.exactAuthorityMatches += 1;
    if (source.indexedGoogleDriveAuthority) buckets.indexedGoogleDriveAuthorities += 1;
  }

  return buckets;
}

function validateConflictMetadata(conflict = null) {
  const obj = safeObject(conflict);

  return Boolean(
    obj.sameExactIssue === true &&
      obj.sameLegalDimension === true &&
      obj.oppositeHoldingOrRule === true &&
      obj.hierarchyAnalysis &&
      obj.conflictResolutionBasis
  );
}

function sanitizeConflictMetadata(value = null) {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value.filter(validateConflictMetadata).slice(0, 3);
  }

  return validateConflictMetadata(value) ? value : null;
}

function buildCompactTaxEngineContext({ classification = {}, sourceGroundingInstructions = {}, authorityPacket = {} } = {}) {
  const taxEngineMetadata =
    classification.taxEngineMetadata ||
    classification.tax_engine_metadata ||
    classification.taxEngine ||
    classification.tax_engine ||
    {};

  const domainCode =
    classification.domainCode ||
    classification.domain_code ||
    classification.primaryDomain ||
    taxEngineMetadata.domainCode ||
    taxEngineMetadata.domain_code ||
    null;

  return {
    domainCode,
    domainName:
      classification.domainName ||
      classification.domain_name ||
      taxEngineMetadata.domainName ||
      taxEngineMetadata.domain_name ||
      null,

    supportedDomain: domainCode
      ? SUPPORTED_TAX_DOMAINS.includes(String(domainCode).toUpperCase())
      : false,

    primaryIssue:
      classification.primaryIssue ||
      null,

    subIssue:
      classification.subIssue ||
      null,

    retrievalStrategy:
      classification.retrievalStrategy ||
      classification.retrieval_strategy ||
      taxEngineMetadata.retrievalStrategy ||
      taxEngineMetadata.retrieval_strategy ||
      null,

    targetAuthorities: unique([
      ...safeArray(classification.targetAuthorities),
      ...safeArray(classification.target_authorities),
      ...safeArray(taxEngineMetadata.targetAuthorities),
      ...safeArray(taxEngineMetadata.target_authorities),
      ...safeArray(sourceGroundingInstructions?.authorityPacket?.taxEngineDeclaredAuthorities?.targetAuthorities),
      ...safeArray(authorityPacket?.taxEngineDeclaredAuthorities?.targetAuthorities)
    ]).slice(0, 12),

    controllingAuthorities: unique([
      ...safeArray(classification.controllingAuthorities),
      ...safeArray(classification.controlling_authorities),
      ...safeArray(taxEngineMetadata.controllingAuthorities),
      ...safeArray(taxEngineMetadata.controlling_authorities)
    ]).slice(0, 8),

    supportingAuthorities: unique([
      ...safeArray(classification.supportingAuthorities),
      ...safeArray(classification.supporting_authorities),
      ...safeArray(taxEngineMetadata.supportingAuthorities),
      ...safeArray(taxEngineMetadata.supporting_authorities)
    ]).slice(0, 8),

    supportingJurisprudence: unique([
      ...safeArray(classification.supportingJurisprudence),
      ...safeArray(classification.supporting_jurisprudence),
      ...safeArray(taxEngineMetadata.supportingJurisprudence),
      ...safeArray(taxEngineMetadata.supporting_jurisprudence)
    ]).slice(0, 8),

    requiredAnswerSections: unique([
      ...safeArray(classification.requiredAnswerSections),
      ...safeArray(classification.required_answer_sections),
      ...safeArray(taxEngineMetadata.requiredAnswerSections),
      ...safeArray(taxEngineMetadata.required_answer_sections)
    ]),

    doctrinalRules:
      classification.doctrinalRules ||
      classification.doctrinal_rules ||
      taxEngineMetadata.doctrinalRules ||
      taxEngineMetadata.doctrinal_rules ||
      null,

    conflictRules:
      classification.conflictRules ||
      classification.conflict_rules ||
      taxEngineMetadata.conflictRules ||
      taxEngineMetadata.conflict_rules ||
      null
  };
}

function buildSystemInstruction({
  systemPrompt = "",
  masterPrompt = "",
  mode = "STANDARD_TAX",
  taxEngineContext = {},
  modeFlags = {}
}) {
  const baseAuthorityRules = `
You are TINA, a Philippine tax, legal, audit, and compliance reasoning assistant.

Operating Mode: ${mode}

Authority and source-grounding rules:
1. Answer from retrieved indexed sources first. Do not use general model knowledge as the primary legal basis when retrieved authorities exist.
2. Follow this binding hierarchy: Constitution; NIRC/CMTA/LGC/primary statutes; Tax Treaties; Supreme Court En Banc; Supreme Court Division; CTA En Banc; CTA Division; Revenue Regulations; RMC/RMO/RAMO; BIR Rulings; LGU/BOC issuances; PFRS/PAS/PSA when accounting applies; OECD/foreign persuasive authorities; CPA reviewer notes/secondary materials only when allowed.
3. Never elevate RMCs over statutes, BIR rulings over Supreme Court, reviewer notes over statutes, or persuasive materials over controlling authorities.
4. Administrative issuances cannot override statutes, tax treaties, the Constitution, Supreme Court decisions, or CTA decisions within their proper doctrinal scope.
5. Do not invent citations, provisions, cases, RRs, RMCs, RMOs, rulings, or doctrinal conflicts.
6. If no indexed authority is available for a requested section, answer from your Philippine tax law training knowledge — NIRC provisions, implementing regulations (RR/RMC/RMO), and Supreme Court/CTA jurisprudence. Label every section that relies on training knowledge with: "(Framework knowledge — pending index verification)". Do not say "Indexed source not found." Do not fabricate specific GR numbers, docket references, or citation details you are uncertain of.
7. Do not say "No legal basis was rendered" or "No supporting rules were rendered."
8. Do not dump unrelated jurisprudence.
9. Do not include raw source text, full debug objects, retrieval payloads, embeddings, hidden metadata, or full engine outputs.
10. Do not state "Conflict Detected: YES" unless the same exact issue, same legal dimension, opposite holding/rule, hierarchy analysis, and conflict-resolution basis are all present.
11. MCIT GUARD: When addressing MCIT (Sec. 27(E) NIRC), do not import NOLCO or net operating loss carry-forward rules into the analysis. MCIT and NOLCO are legally distinct mechanisms operating on different tax bases; mixing them is a fatal accuracy error. When explaining MCIT, always distinguish it from RCIT (Sec. 27(A) NIRC): MCIT applies when it exceeds the RCIT for the taxable year, starting from the 4th taxable year following the year of commencement of business operations; RCIT applies whenever RCIT exceeds MCIT. State which applies and when. The primary implementing regulation for MCIT is Revenue Regulations No. 9-1998 — cite this in Section C, not RR 15-2010 or any other regulation. MCIT CASE GUARD: CIR v. San Roque Power Corporation addresses VAT refund jurisdiction under Sec. 112(C) NIRC — it is a VAT refund case, NOT an MCIT case. Never cite San Roque under MCIT or Sec. 27(E). For MCIT jurisprudence, cite only cases that directly rule on Sec. 27(E) NIRC or MCIT computation, imposition, or exemption.
12. PRESCRIPTION HIERARCHY: For tax assessment prescription, state Sec. 203 NIRC (3-year general rule) as the primary rule first in Section B. State Sec. 222(a) NIRC (10-year rule) as a named exception ALSO in Section B — Sec. 222(a) is a primary NIRC statute, NOT an administrative issuance; never place it in Section C. The 10-year period requires the BIR to affirmatively prove fraudulent intent — the BIR bears this burden and cannot invoke it by mere allegation. Never present both periods as co-equal alternatives.
13. OECD LABELING: OECD Guidelines and all foreign tax authority materials are persuasive only, never controlling in Philippine tax law. Explicitly label them as "persuasive authority" when cited. Any transfer pricing or OECD-cited analysis must first anchor on the applicable domestic provision (e.g., Sec. 50 NIRC, RR 2-2013) before OECD materials are referenced or applied. For transfer pricing and arm's length queries, always cite OECD Guidelines as persuasive — do not omit them.
14. SECTION A ANCHOR: The Direct Answer section (Section A) must open with the controlling NIRC provision before any other citation, case, or regulation. The statute is always named first in the answer. Do not open Section A with a case name, RMC, or secondary authority. For VAT definition queries, Section A must specifically cite "Sections 105 to 108, NIRC" — not just "NIRC" generically. For MCIT queries, Section A must specifically cite "Section 27(E), NIRC." For arm's length/transfer pricing queries, Section B must state that Section 50 of the NIRC EXPLICITLY (not "implicitly") empowers the BIR to reallocate income between controlled entities to clearly reflect income.
15. NON-DEFINITIONAL CASE EXCLUSION: For definition-type queries ("What is VAT?", "What is MCIT?", "What is withholding tax?"), do not cite transactional or fact-specific cases (e.g., CIR v. McDonald's Realty, Dizon Farms v. CIR) as the primary or lead authority. Definitional cases must directly address the definition, scope, or essential elements of the tax. Cite transactional cases only in Section D (Supporting Jurisprudence) and only when directly on point.
16. ISSUE-SPECIFIC CASE GUARD: Every case cited in Section D must be directly on point for the ISSUE being analyzed. Strict case-to-issue binding:
  (a) CIR v. San Roque Power Corp. (GR 187485, Oct 8 2013 En Banc) — ONLY for VAT refund Sec. 112(C) 120-day mandatory/jurisdictional rule. Never cite for MCIT, prescription, or arm's length. FOR THE 120-DAY RULE: San Roque is MANDATORY — always cite it and always state that the 120-day period is mandatory and jurisdictional.
  (b) CIR v. Seagate Technology (GR 153866) — ONLY for VAT zero-rating of PEZA-registered entities. Never cite as authority for the 120-day mandatory/jurisdictional rule.
  (c) CIR v. Aichi Forging Company of Asia (GR 184823) — ONLY for the 120-day + 30-day VAT refund procedure and the strict filing period. Never cite for MCIT, arm's length, transfer pricing, or prescription.
  (d) CIR v. Metro Star Superama (GR 185371, 2010) — ONLY for assessment due process: mandatory pre-assessment notice (PAN); void assessment when PAN is absent. Never cite for prescription periods.
  (e) Any case cited for a purpose other than its actual holding is a P0 accuracy error and must not appear in any TINA output.
17. 120-DAY RULE MANDATORY ELEMENTS: For any query on the Sec. 112(C) VAT refund 120-day period, Section A MUST state: (1) the period is MANDATORY AND JURISDICTIONAL; (2) filing before the 120-day period lapses (premature filing) deprives the CTA of jurisdiction, EXCEPT for claims filed between December 10, 2003 and October 6, 2010 under BIR DA-489-03; (3) upon inaction or denial, the taxpayer has 30 days to appeal to the CTA — not open-ended; (4) cite CIR v. San Roque Power Corp. (GR 187485) as the controlling En Banc authority.
`.trim();

  let modeInstruction = "";

  if (modeFlags.isQuiz || mode === "QUIZ_MODE") {
    modeInstruction = `
QUIZ MODE FORMAT:
Do not use A-F legal answer format.
Generate assessment-style output only.
Use this structure unless the user asked otherwise:
Question
Choices
Answer Key
Explanation
Reviewer Trap
Source Anchor
Source Anchor is MANDATORY. Always end with "Source Anchor: [cite the controlling NIRC provision, RR, or case]". If no source was retrieved, state: "Source Anchor: Indexed source not found. Answer based on [applicable NIRC provision] per Philippine tax law framework." Never omit the Source Anchor.
`.trim();
  } else if (modeFlags.isReviewer || mode === "REVIEWER_MODE") {
    modeInstruction = `
REVIEWER MODE FORMAT:
Do not use A-F legal answer format.
Use CPA/bar reviewer teaching style.
Use this structure unless the user asked otherwise:
Concept
Legal Basis
Rule
Memory Aid
Common Trap
Example
Quick Check
Legal Basis is MANDATORY. Always state "Legal Basis: [cite the controlling NIRC provision, RR, or case]". If no source was retrieved, state: "Legal Basis: [applicable NIRC provision] per Philippine tax law framework." Never omit the Legal Basis.
Prioritize learning clarity while preserving legal hierarchy.
Reviewer materials may support learning, but they must never override controlling law, regulations, or jurisprudence.
`.trim();
  } else if (modeFlags.isSource || mode === "SOURCE_LOOKUP") {
    modeInstruction = `
SOURCE LOOKUP MODE FORMAT:
Do not use A-F legal answer format.
List retrieved authorities by hierarchy.
Use this structure:
Sources Found
Controlling Authorities
Supporting Rules / Issuances
Supporting Jurisprudence
Notes
Do not generate substantive analysis. Source identification only.
If no indexed sources were retrieved, state: "No indexed sources found for this query. Applicable Philippine tax framework: [cite the controlling NIRC provision or statute if known]." Never fabricate a source citation.
`.trim();
  } else if (modeFlags.isCase || mode === "CASE_ANALYSIS") {
    modeInstruction = `
CASE ANALYSIS MODE FORMAT:
Use jurisprudence-focused structure:
Case Identified
Facts / Context
Issue
Ruling / Holding
Doctrine
Application
Status / Limits
Do not force generic A-F tax format unless the user asks for full tax application.
If no case was retrieved from the indexed sources, state: "No indexed case found for this query. Based on Philippine tax jurisprudence: [cite the applicable Supreme Court or CTA ruling if known]." Never fabricate a GR number, case name, date, or holding.
`.trim();
  } else if (modeFlags.isPatch || mode === "CODE_PATCH_MODE") {
    modeInstruction = `
CODE PATCH MODE FORMAT:
Do not use standard legal/tax A-F format.
This is a code patch request for TINA's backend system.
Structure your response as:
A. ISSUE — What is broken or needs changing
B. ROOT CAUSE — Why it is broken
C. PATCH — Exact code change (file path, function, what to add/modify/remove)
D. VERIFICATION — How to confirm the patch works
E. RISKS — What else might break
Be precise. Reference file paths and function names exactly. Never fabricate method signatures or parameter names.
`.trim();
  } else if (modeFlags.isDebug || mode === "DEBUG_MODE") {
    modeInstruction = `
DEBUG MODE FORMAT:
Do not use standard legal/tax A-F format.
This is a diagnostic request for TINA's backend system.
Structure your response as:
A. SYMPTOM — What behavior is observed
B. PROBABLE CAUSE — Most likely root cause
C. DIAGNOSIS STEPS — How to confirm the cause
D. FIX — Recommended resolution
E. PREVENTION — How to prevent recurrence
Be precise. Reference file paths and function names exactly.
`.trim();
  } else if (mode === "SENIOR_COUNSEL_MEMO" || mode === "LITIGATION_MEMO") {
    modeInstruction = `
SENIOR COUNSEL MEMO FORMAT:
Do not use standard A-F legal/tax format.
Use this 7-section litigation-grade memo structure:
RULING
LEGAL BASIS
ANALYSIS
QUALIFICATIONS
OPEN ISSUES
RECOMMENDED ACTION
POSITION STRENGTH
All seven sections are mandatory.
RULING: State the definitive legal position in one to three sentences.
LEGAL BASIS: Cite the controlling NIRC provision first, then implementing regulation (RR), then directly applicable Supreme Court or CTA decision.
ANALYSIS: Apply the controlling authority to the specific facts or scenario presented.
QUALIFICATIONS: State material factual or evidentiary assumptions that affect the conclusion.
OPEN ISSUES: Identify unresolved legal or factual questions. If none, state "None identified on presented facts."
RECOMMENDED ACTION: State the defensible tax position and the concrete next step.
POSITION STRENGTH: Rate STRONG / MODERATE / WEAK / INDEFENSIBLE with a one-sentence justification.
`.trim();
  } else if (modeFlags.isAudit || mode === "COMPLEX_ADVISORY" || mode === "AUDIT_FACT_PATTERN") {
    modeInstruction = `
AUDIT MODE FORMAT:
Do not use standard A-F legal answer format.
Use this 7-section audit and evidence evaluation structure:
A. DIRECT ANSWER
B. FACTS / ASSUMPTIONS
C. CONTROLLING LEGAL BASIS
D. ANALYSIS
E. AUDIT / TAX RISK
F. DOCUMENTARY GAPS
G. PRACTICAL POSITION
All seven sections are mandatory.
B: State key facts presented and flag any factual gaps affecting the conclusion.
C: Cite the specific NIRC provision, RR, RMC, or case controlling this transaction or position.
D: Apply the controlling authority to the stated facts.
E: Assess the actual audit exposure specific to this position — BIR risk level, prescription, documentary defects.
F: List the specific documents required to support this position (contracts, invoices, BIR filings, entries).
G: State the recommended tax position and any caveats.
Never omit E. AUDIT / TAX RISK or F. DOCUMENTARY GAPS. Never use generic boilerplate for E, F, or G.
`.trim();
  } else {
    modeInstruction = `
STANDARD LEGAL/TAX FORMAT:
Apply the mandatory cross-reference sequence for every tax issue: anchor on the specific statute/NIRC provision; identify implementing RR; check RMC/RMO/RAMO for BIR position and overreach; check BIR rulings for analogous facts; check Supreme Court/CTA jurisprudence for override or doctrine; map any true conflict; conclude with ranked citations.

Expected answer structure unless a tax-engine template overrides it:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES
D. SUPPORTING JURISPRUDENCE
E. DOCTRINAL STATUS / CONFLICT ANALYSIS
F. PRACTICAL NOTE / APPLICATION
`.trim();
  }

  return normalizeWhitespace(
    [
      baseAuthorityRules,
      modeInstruction,
      `Tax-engine context:\n${JSON.stringify(taxEngineContext, null, 2)}`,
      systemPrompt,
      masterPrompt
    ]
      .filter(Boolean)
      .join("\n\n")
  );
}

function buildUserPrompt({
  userQuery = "",
  classification = {},
  intent = {},
  compressedSources = "",
  adaptiveContext = {},
  responsePlan = {},
  mode = "STANDARD_TAX",
  authoritySummary = {},
  taxEngineContext = {},
  sourceGroundingInstructions = {},
  authorityPacket = {},
  modeFlags = {}
}) {
  const compactClassification = {
    primaryIssue: classification?.primaryIssue || classification?.domain || null,
    subIssue: classification?.subIssue || null,
    domainCode: taxEngineContext.domainCode || null,
    domainName: taxEngineContext.domainName || null,
    retrievalStrategy: classification?.retrievalStrategy || taxEngineContext.retrievalStrategy || null,
    targetAuthorities: safeArray(taxEngineContext.targetAuthorities || classification?.targetAuthorities).slice(0, 12),
    factSensitivity: classification?.factSensitivity || null,
    requiredAnswerSections: safeArray(taxEngineContext.requiredAnswerSections).slice(0, 8)
  };

  const compactIntent = {
    intent: intent?.intent || intent?.type || null,
    responseMode: intent?.responseMode || null,
    orchestrationMode: intent?.orchestrationMode || null,
    requiresQuizMode: Boolean(intent?.requiresQuizMode),
    requiresReviewMode: Boolean(intent?.requiresReviewMode),
    requiresLegalAnalysis: Boolean(intent?.requiresLegalAnalysis),
    requiresJurisprudence: Boolean(intent?.requiresJurisprudence),
    requiresRiskAnalysis: Boolean(intent?.requiresRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(intent?.requiresFactPatternAnalysis),
    requiresEvidenceEvaluation: Boolean(intent?.requiresEvidenceEvaluation),
    requiresContractInterpretation: Boolean(intent?.requiresContractInterpretation),
    requiresTransactionCharacterization: Boolean(intent?.requiresTransactionCharacterization),
    requiresEconomicSubstance: Boolean(intent?.requiresEconomicSubstance),
    requiresSimpleDefinition: Boolean(intent?.requiresSimpleDefinition)
  };

  const compactAdaptiveContext = {
    activeHook: adaptiveContext?.activeHook || adaptiveContext?.hookConfig?.hook_code || null,
    activeMode: adaptiveContext?.activeMode || adaptiveContext?.hookConfig?.mode || null,
    responseMode:
      adaptiveContext?.responseMode ||
      adaptiveContext?.responsePlan?.responseMode ||
      responsePlan?.responseMode ||
      null,
    orchestrationMode:
      adaptiveContext?.orchestrationMode ||
      adaptiveContext?.responsePlan?.orchestrationMode ||
      responsePlan?.orchestrationMode ||
      null
  };

  const compactGrounding = {
    mustUseRetrievedSourcesFirst:
      sourceGroundingInstructions?.mustUseRetrievedSourcesFirst !== false,
    mustNotInventAuthorities: true,
    mustSayIndexedSourceNotFoundWhenNoAuthority:
      sourceGroundingInstructions?.mustSayIndexedSourceNotFoundWhenNoAuthority !== false,
    doNotSayIndexedSourceNotFoundWhenSourcesExist:
      sourceGroundingInstructions?.doNotSayIndexedSourceNotFoundWhenSourcesExist === true,
    requiredReplacementWhenEmpty:
      sourceGroundingInstructions?.requiredReplacementWhenEmpty ||
      "Indexed source not found.",
    authoritySummary,
    authorityPacketSummary: {
      hasIndexedAuthority: authorityPacket?.hasIndexedAuthority ?? authoritySummary.indexedGoogleDriveAuthorities > 0,
      hasControllingAuthority: authorityPacket?.hasControllingAuthority ?? authoritySummary.controlling > 0,
      hasSupportingRules: authorityPacket?.hasSupportingRules ?? authoritySummary.administrative > 0,
      hasSupportingJurisprudence: authorityPacket?.hasSupportingJurisprudence ?? authoritySummary.jurisprudence > 0
    }
  };

  let responseInstruction = "";

  if (modeFlags.isQuiz || mode === "QUIZ_MODE") {
    responseInstruction = "Use QUIZ_MODE. Do not use A-F legal answer format. Produce Question, Choices, Answer Key, Explanation, Reviewer Trap, and Source Anchor.";
  } else if (modeFlags.isReviewer || mode === "REVIEWER_MODE") {
    responseInstruction = "Use REVIEWER_MODE. Do not use A-F legal answer format. Produce Concept, Rule, Memory Aid, Common Trap, Example, and Quick Check.";
  } else if (modeFlags.isSource || mode === "SOURCE_LOOKUP") {
    responseInstruction = "Use SOURCE_LOOKUP. Do not use A-F legal answer format. List sources by authority hierarchy. If no indexed sources were retrieved, state: 'No indexed sources found. Cite the applicable Philippine tax statute only.' Never fabricate a source citation.";
  } else if (modeFlags.isCase || mode === "CASE_ANALYSIS") {
    responseInstruction = "Use CASE_ANALYSIS. Focus on case, issue, ruling, doctrine, application, and status/limits. If no case was retrieved, state: 'No indexed case found. Cite the applicable Philippine Supreme Court or CTA ruling only if known.' Never fabricate a GR number, case name, or holding.";
  } else if (modeFlags.isPatch || mode === "CODE_PATCH_MODE") {
    responseInstruction = "Use CODE_PATCH_MODE. Do not use A-F legal format. Produce: A. ISSUE, B. ROOT CAUSE, C. PATCH (exact file path, function, change), D. VERIFICATION, E. RISKS. Never fabricate method signatures or parameter names.";
  } else if (modeFlags.isDebug || mode === "DEBUG_MODE") {
    responseInstruction = "Use DEBUG_MODE. Do not use A-F legal format. Produce: A. SYMPTOM, B. PROBABLE CAUSE, C. DIAGNOSIS STEPS, D. FIX, E. PREVENTION. Reference file paths and function names exactly.";
  } else if (modeFlags.isAudit || mode === "COMPLEX_ADVISORY" || mode === "AUDIT_FACT_PATTERN") {
    responseInstruction = "Use AUDIT_FACT_PATTERN. Produce all 7 mandatory sections: A. DIRECT ANSWER, B. FACTS / ASSUMPTIONS, C. CONTROLLING LEGAL BASIS, D. ANALYSIS, E. AUDIT / TAX RISK, F. DOCUMENTARY GAPS, G. PRACTICAL POSITION. Sections E, F, and G must be specific to this query — do not use generic boilerplate.";
  } else {
    responseInstruction = 'Use standard A-F legal/tax format: A. DIRECT ANSWER, B. CONTROLLING LEGAL BASIS, C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES, D. SUPPORTING JURISPRUDENCE, E. DOCTRINAL STATUS / CONFLICT ANALYSIS, F. PRACTICAL NOTE / APPLICATION. When no indexed source was retrieved, answer each section from Philippine tax law framework knowledge and label every such section "(Framework knowledge — pending index verification)". Do not output "Indexed source not found." Do not fabricate GR numbers or citation details you are uncertain of.';
  }

  return normalizeWhitespace(`
USER QUERY:
${truncateByChars(userQuery, 5000)}

CLASSIFICATION:
${JSON.stringify(compactClassification, null, 2)}

INTENT:
${JSON.stringify(compactIntent, null, 2)}

ADAPTIVE CONTEXT:
${JSON.stringify(compactAdaptiveContext, null, 2)}

SOURCE GROUNDING / AUTHORITY PRESERVATION:
${JSON.stringify(compactGrounding, null, 2)}

RETRIEVED RELEVANT AUTHORITIES / EXTRACTS:
${compressedSources || "[No retrieved source extracts supplied. Answer using your Philippine tax law training knowledge: cite NIRC provisions, implementing regulations (RR/RMC/RMO), and Supreme Court/CTA jurisprudence directly relevant to the query. Label every section that relies on training knowledge as '(Framework knowledge — pending index verification)'. Do not output 'Indexed source not found.' Do not fabricate GR numbers, docket numbers, or RR/RMC numbers you are not certain of.]"}

RESPONSE INSTRUCTION:
${responseInstruction}
Use retrieved sources first. Preserve controlling authorities. Apply the Master Prompt hierarchy. Do not include irrelevant cases, irrelevant regulations, debug data, hidden metadata, raw context, or internal engine objects.
`);
}

export function trimMessagesToBudget(messages = [], maxTokens = 12000) {
  const output = [];
  let running = 0;

  for (const msg of [...safeArray(messages)].reverse()) {
    const cost = estimateMessagesTokens([msg]);
    if (running + cost > maxTokens) break;

    running += cost;
    output.unshift({
      role: msg.role === "system" || msg.role === "assistant" ? msg.role : "user",
      content: safeString(msg.content || "")
    });
  }

  return output;
}

export function finalTrimMessages(messages = [], budget = assignBudget()) {
  let currentTokens = estimateMessagesTokens(messages);

  if (currentTokens <= budget.maxInputTokens) {
    return {
      messages,
      estimatedInputTokens: currentTokens,
      wasTrimmed: false
    };
  }

  let trimmedMessages = messages.map((m) => ({ ...m }));

  if (trimmedMessages[0]) {
    trimmedMessages[0].content = truncateByTokens(
      trimmedMessages[0].content,
      Math.floor(budget.maxInputTokens * 0.22)
    );
  }

  if (trimmedMessages[trimmedMessages.length - 1]) {
    trimmedMessages[trimmedMessages.length - 1].content = truncateByTokens(
      trimmedMessages[trimmedMessages.length - 1].content,
      Math.floor(budget.maxInputTokens * 0.72)
    );
  }

  currentTokens = estimateMessagesTokens(trimmedMessages);

  if (currentTokens > budget.maxInputTokens) {
    const emergencyBudget = assignBudget(budget.model, "EMERGENCY_TRIM");

    trimmedMessages = trimmedMessages.map((m, idx) => ({
      ...m,
      content: truncateByTokens(
        m.content,
        idx === 0
          ? Math.floor(emergencyBudget.maxInputTokens * 0.22)
          : Math.floor(emergencyBudget.maxInputTokens * 0.72)
      )
    }));

    currentTokens = estimateMessagesTokens(trimmedMessages);
  }

  return {
    messages: trimmedMessages,
    estimatedInputTokens: currentTokens,
    wasTrimmed: true
  };
}

export function buildOpenAIContext(args = {}) {
  const normalized = normalizeBuildArgs(args);

  const modeFlags = detectModeFlags({
    adaptiveContext: normalized.adaptiveContext,
    classification: normalized.classification,
    intent: normalized.intent,
    responsePlan: normalized.responsePlan,
    args: normalized
  });

  const complexity = detectComplexity(
    normalized.userQuery,
    normalized.classification,
    normalized.intent
  );

  const mode =
    resolveExplicitMode({
      adaptiveContext: normalized.adaptiveContext,
      classification: normalized.classification,
      intent: normalized.intent,
      responsePlan: normalized.responsePlan,
      args: normalized
    }) ||
    determineMode(
      normalized.userQuery,
      normalized.classification,
      normalized.intent,
      {
        adaptiveContext: normalized.adaptiveContext,
        responsePlan: normalized.responsePlan,
        responseMode: normalized.explicitResponseMode,
        orchestrationMode: normalized.explicitOrchestrationMode,
        reviewerMode: normalized.reviewerMode,
        quizMode: normalized.quizMode,
        sourceMode: normalized.sourceMode,
        forceStandardAFStructure: normalized.forceStandardAFStructure
      }
    );

  const budget = assignBudget(normalized.model, mode);

  const taxEngineContext = buildCompactTaxEngineContext({
    classification: normalized.classification,
    sourceGroundingInstructions: normalized.sourceGroundingInstructions,
    authorityPacket: normalized.authorityPacket
  });

  const trimmedSources = trimRetrieval(
    normalized.retrievedSources,
    budget,
    {
      classification: normalized.classification,
      intent: normalized.intent,
      adaptiveContext: normalized.adaptiveContext,
      modeFlags
    }
  );

  const compressedSources = compressSources(
    trimmedSources,
    budget,
    {
      classification: normalized.classification,
      intent: normalized.intent,
      adaptiveContext: normalized.adaptiveContext,
      modeFlags
    }
  );

  const authoritySummary = buildAuthorityPreservationSummary(trimmedSources);

  const history = safeArray(normalized.conversationHistory)
    .slice(-budget.maxHistoryItems)
    .map((msg) => ({
      role:
        msg.role === "assistant"
          ? "assistant"
          : msg.role === "system"
            ? "system"
            : "user",

      content: truncateByChars(
        normalizeWhitespace(msg.content || ""),
        1200
      )
    }));

  const systemMessage = {
    role: "system",
    content: buildSystemInstruction({
      systemPrompt: normalized.systemPrompt,
      masterPrompt: normalized.masterPrompt,
      mode,
      taxEngineContext,
      modeFlags
    })
  };

  const userMessage = {
    role: "user",
    content: buildUserPrompt({
      userQuery: normalized.userQuery,
      classification: normalized.classification,
      intent: normalized.intent,
      compressedSources,
      adaptiveContext: normalized.adaptiveContext,
      responsePlan: normalized.responsePlan,
      mode,
      authoritySummary,
      taxEngineContext,
      sourceGroundingInstructions: normalized.sourceGroundingInstructions,
      authorityPacket: normalized.authorityPacket,
      modeFlags
    })
  };

  const rawMessages = [
    systemMessage,
    ...history,
    userMessage
  ];

  const trimmed = finalTrimMessages(rawMessages, budget);

  const sanitizedConflicts = sanitizeConflictMetadata(
    normalized.classification?.conflicts ||
      normalized.classification?.hierarchyConflict ||
      normalized.authorityPacket?.conflicts ||
      null
  );

  return {
    engine: "TINA_CONTEXT_ORCHESTRATION_ENGINE",
    version: ENGINE_VERSION,
    complexity,
    mode,
    modeFlags,
    model: normalized.model,
    budget,
    retrievedSources: trimmedSources,
    compressedSources,
    authoritySummary,
    taxEngineContext,
    sanitizedConflicts,
    messages: trimmed.messages,
    estimatedInputTokens: trimmed.estimatedInputTokens,
    maxCompletionTokens: budget.maxOutputTokens,
    temperature: normalized.temperature ?? budget.temperature,
    diagnostics: {
      orchestrationFinalSource: true,
      noPromptAssemblyOutsideThisFile: true,
      noDirectOpenAICallOutsideThisFile: true,
      noDuplicateRetrieval: true,
      noDuplicateReranking: true,
      authorityPreservationEnabled: true,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      mandatoryCrossReferenceSequenceEnabled: !modeFlags.isQuiz && !modeFlags.isReviewer,
      interpretationRulesEnabled: true,
      googleDriveHierarchyAware: true,
      reviewMaterialsExcludedUnlessReviewMode: !modeFlags.isQuiz && !modeFlags.isReviewer,
      targetAuthorityMatchPreserved: true,
      issueClassificationMatchPreserved: true,
      controllingAuthoritiesPreservedFirst: true,
      doctrinalSourcesPreserved: true,
      retrievalTrimmed: true,
      retrievalCompressed: true,
      rawRetrievalPayloadInjectionPrevented: true,
      rawEngineObjectInjectionPrevented: true,
      fullDebugObjectInjectionPrevented: true,
      fullEngineOutputInjectionPrevented: true,
      finalTrimApplied: trimmed.wasTrimmed,
      sourceCount: trimmedSources.length,
      authoritySummary,
      model: normalized.model,
      estimatedInputTokens: trimmed.estimatedInputTokens,
      maxCompletionTokens: budget.maxOutputTokens,
      complexity,
      mode,
      quizModePreserved: mode === "QUIZ_MODE",
      reviewerModePreserved: mode === "REVIEWER_MODE",
      reviewOrQuizNotConvertedToFastDefinition:
        !(modeFlags.isQuiz || modeFlags.isReviewer) || !["FAST_DEFINITION"].includes(mode),
      afInstructionsSuppressedForReviewQuiz:
        modeFlags.isQuiz || modeFlags.isReviewer
    }
  };
}

export async function callOpenAIWithOrchestration(args = {}) {
  const orchestration = buildOpenAIContext(args);

  const openai =
    args.openai ||
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

  if (!process.env.OPENAI_API_KEY && !args.openai) {
    throw new Error("OPENAI_API_KEY is missing and no OpenAI client was supplied.");
  }

  const completion = await openai.chat.completions.create({
    model: orchestration.model,
    messages: orchestration.messages,
    max_tokens: orchestration.maxCompletionTokens,
    temperature: orchestration.temperature
  });

  const answer =
    completion?.choices?.[0]?.message?.content ||
    "";

  return {
    answer,
    orchestration: {
      engine: orchestration.engine,
      version: orchestration.version,
      complexity: orchestration.complexity,
      mode: orchestration.mode,
      modeFlags: orchestration.modeFlags,
      estimatedInputTokens: orchestration.estimatedInputTokens,
      maxCompletionTokens: orchestration.maxCompletionTokens,
      sourceCount: orchestration.retrievedSources.length,
      wasTrimmed: orchestration.diagnostics.finalTrimApplied,
      authoritySummary: orchestration.authoritySummary,
      taxEngineContext: orchestration.taxEngineContext,
      sanitizedConflicts: orchestration.sanitizedConflicts,
      diagnostics: orchestration.diagnostics
    },
    usage: completion?.usage || null,
    raw: completion
  };
}

export function contextOrchestrationHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONTEXT_ORCHESTRATION_ENGINE",
    version: ENGINE_VERSION,

    orchestrationFinalSource: true,
    onlyFileAllowedToBuildMessages: true,
    onlyFileAllowedToEstimateTokens: true,
    onlyFileAllowedToTrimContext: true,
    onlyFileAllowedToCompressSources: true,
    onlyFileAllowedToCallOpenAI: true,

    preserveQuizMode: true,
    preserveReviewerMode: true,
    reviewQuizNeverConvertedToFastDefinition: true,
    afInstructionsSuppressedForQuiz: true,
    afInstructionsSuppressedForReviewer: true,

    noPromptAssemblyOutsideThisFile: true,
    noDirectOpenAICallOutsideThisFile: true,
    noDuplicateRetrieval: true,
    noDuplicateReranking: true,

    authorityPreservationEnabled: true,
    authorityHierarchyAware: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    mandatoryCrossReferenceSequenceEnabledForLegalModes: true,
    interpretationRulesEnabled: true,
    googleDriveHierarchyAware: true,

    targetAuthorityMatchPreserved: true,
    issueClassificationMatchPreserved: true,
    controllingAuthoritiesPreservedFirst: true,
    doctrinalSourcesPreserved: true,
    reviewMaterialsExcludedUnlessReviewMode: true,

    taxEngineCompatible: true,
    supportedTaxDomains: SUPPORTED_TAX_DOMAINS,

    rawRetrievalPayloadInjectionPrevented: true,
    rawEngineObjectInjectionPrevented: true,
    fullDebugObjectInjectionPrevented: true,
    fullEngineOutputInjectionPrevented: true,

    supportsComplexityClassification: true,
    supportsModeDetection: true,
    supportsTokenBudgeting: true,
    supportsRetrievalCompression: true,
    supportsFinalTrim: true,

    supportedModes: Object.keys(MODE_CONFIG),
    supportedModels: Object.keys(MODEL_CONTEXT_LIMITS)
  };
}

export default {
  buildOpenAIContext,
  callOpenAIWithOrchestration,
  detectComplexity,
  determineMode,
  assignBudget,
  trimRetrieval,
  compressSources,
  compressRetrievedSources,
  estimateTokens,
  estimatePromptTokens,
  estimateMessagesTokens,
  trimMessagesToBudget,
  finalTrimMessages,
  contextOrchestrationHealthCheck
};
