// FILE: context-orchestration-engine.js
"use strict";

/**
 * TINA Context Orchestration Engine
 * Version: 4.2.0
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
 * - preserves controlling authorities before weak sources
 */

import OpenAI from "openai";

const ENGINE_VERSION = "4.2.0";

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
    maxHistoryItems: 4,
    temperature: 0.1
  },

  LEGAL_ANALYSIS: {
    maxInputTokens: 28000,
    maxOutputTokens: 2200,
    maxSources: 8,
    maxCharsPerSource: 1600,
    maxHistoryItems: 4,
    temperature: 0.1
  },

  COMPLEX_ADVISORY: {
    maxInputTokens: 36000,
    maxOutputTokens: 2600,
    maxSources: 10,
    maxCharsPerSource: 1650,
    maxHistoryItems: 5,
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

/**
 * Master Prompt authority hierarchy:
 * 1. Constitution
 * 2. NIRC / CMTA / LGC / primary statutes
 * 3. Tax Treaties
 * 4. Supreme Court En Banc
 * 5. Supreme Court Division
 * 6. CTA En Banc
 * 7. CTA Division
 * 8. Revenue Regulations
 * 9. RMC / RMO / RAMO
 * 10. BIR Rulings
 * 11. LGU / BOC issuances
 * 12. PFRS / PAS / PSA, when accounting issues apply
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */
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
  "QUIZ",
  "ASSESSMENT"
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

    adaptiveContext:
      args.adaptiveContext ||
      {},

    responsePlan:
      args.responsePlan ||
      args.adaptiveContext?.responsePlan ||
      {},

    model:
      args.model ||
      DEFAULT_MODEL,

    temperature:
      args.temperature
  };
}

function isReviewMode({ adaptiveContext = {}, classification = {}, intent = {} } = {}) {
  const values = [
    adaptiveContext?.activeMode,
    adaptiveContext?.mode,
    adaptiveContext?.hookConfig?.mode,
    adaptiveContext?.activeHook,
    adaptiveContext?.hookConfig?.hook_code,
    adaptiveContext?.responseMode,
    adaptiveContext?.responsePlan?.responseMode,
    classification?.responseMode,
    classification?.orchestrationMode,
    intent?.mode,
    intent?.intent
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  if (
    adaptiveContext?.assessmentMode === true ||
    adaptiveContext?.adaptiveQuizMode === true ||
    intent?.assessmentMode === true ||
    intent?.adaptiveQuizMode === true ||
    intent?.explicitlyRequestedReviewMaterials === true
  ) {
    return true;
  }

  return values.some((value) =>
    REVIEW_MODE_MARKERS.some((marker) => value.includes(marker))
  );
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
      source.metadata?.retrievalPhase ||
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
        source.metadata?.retrievalPhase ||
        null,
      contextOrchestrationEngineVersion: ENGINE_VERSION,
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

  if (CONTROLLING_TYPES.has(type) || precedence <= 3) {
    return "CONTROLLING";
  }

  if (JURISPRUDENCE_TYPES.has(type) || (precedence >= 4 && precedence <= 7)) {
    return "JURISPRUDENCE";
  }

  if (ADMIN_TYPES.has(type) || (precedence >= 8 && precedence <= 11)) {
    return "ADMIN";
  }

  if (ACCOUNTING_TYPES.has(type) || precedence === 12) {
    return "ACCOUNTING";
  }

  if (type === "CPA_NOTES" || type === "REVIEW_MATERIALS" || type === "SECONDARY") {
    return "SECONDARY";
  }

  return "OTHER";
}

function authorityPriority(source = {}) {
  const type = normalizeAuthority(source.authorityType);
  const precedence = Number(source.controllingPrecedence || AUTHORITY_PRECEDENCE[type] || 99);

  if (precedence <= 14) {
    return 150 - precedence * 7;
  }

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

function filterSourcesForMode(sources = [], { adaptiveContext = {}, classification = {}, intent = {} } = {}) {
  const allowReviewSources = isReviewMode({
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

export function determineMode(userQuery = "", classification = {}, intent = {}) {
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

export function trimRetrieval(sources = [], budget = assignBudget(), options = {}) {
  const classification = options.classification || {};
  const intent = options.intent || {};
  const adaptiveContext = options.adaptiveContext || {};

  const normalizedSources = safeArray(sources)
    .map((source, index) => normalizeSource(source, index));

  const filtered = filterSourcesForMode(normalizedSources, {
    adaptiveContext,
    classification,
    intent
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
  taxEngineContext = {}
}) {
  const base = `
You are TINA, a Philippine tax, legal, audit, and compliance reasoning assistant.

Operating Mode: ${mode}

Authority and source-grounding rules:
1. Answer from retrieved indexed sources first. Do not use general model knowledge as the primary legal basis when retrieved authorities exist.
2. Follow this binding hierarchy: Constitution; NIRC/CMTA/LGC/primary statutes; Tax Treaties; Supreme Court En Banc; Supreme Court Division; CTA En Banc; CTA Division; Revenue Regulations; RMC/RMO/RAMO; BIR Rulings; LGU/BOC issuances; PFRS/PAS/PSA when accounting applies; OECD/foreign persuasive authorities; CPA reviewer notes/secondary materials only when allowed.
3. Never elevate RMCs over statutes, BIR rulings over Supreme Court, reviewer notes over statutes, or persuasive materials over controlling authorities.
4. Administrative issuances cannot override statutes, tax treaties, the Constitution, Supreme Court decisions, or CTA decisions within their proper doctrinal scope.
5. Apply the mandatory cross-reference sequence for every tax issue: anchor on the specific statute/NIRC provision; identify implementing RR; check RMC/RMO/RAMO for BIR position and overreach; check BIR rulings for analogous facts; check Supreme Court/CTA jurisprudence for override or doctrine; map any true conflict; conclude with ranked citations.
6. Apply interpretation rules: tax impositions are strictly construed against the government; tax exemptions are strictly construed against the taxpayer; ambiguity on imposition favors the taxpayer; ambiguity on exemption favors the BIR; BIR interpretations carry weight but are subject to judicial review; stare decisis applies.
7. Do not invent citations, provisions, cases, RRs, RMCs, RMOs, rulings, or doctrinal conflicts.
8. If no indexed authority is available for a requested section, say exactly: "Indexed source not found."
9. Do not say "No legal basis was rendered" or "No supporting rules were rendered."
10. Do not dump unrelated jurisprudence.
11. Do not include raw source text, full debug objects, retrieval payloads, embeddings, hidden metadata, or full engine outputs.
12. Do not state "Conflict Detected: YES" unless the same exact issue, same legal dimension, opposite holding/rule, hierarchy analysis, and conflict-resolution basis are all present.
13. Keep the answer proportionate to the query and follow the tax-engine answer structure when supplied.

Expected answer structure unless a tax-engine template overrides it:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES
D. SUPPORTING JURISPRUDENCE
E. DOCTRINAL STATUS / CONFLICT ANALYSIS
F. PRACTICAL NOTE / APPLICATION

Tax-engine context:
${JSON.stringify(taxEngineContext, null, 2)}
`.trim();

  return normalizeWhitespace(
    [
      base,
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
  authorityPacket = {}
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
      null
  };

  const compactGrounding = {
    mustUseRetrievedSourcesFirst:
      sourceGroundingInstructions?.mustUseRetrievedSourcesFirst !== false,
    mustNotInventAuthorities: true,
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
${compressedSources || "[No retrieved source extracts supplied. Use exactly: Indexed source not found. Do not invent authority.]"}

RESPONSE INSTRUCTION:
Use ${mode}. Use retrieved sources first. Preserve controlling authorities in the answer. Apply the Master Prompt hierarchy. If an expected authority section has no indexed support, state "Indexed source not found." Do not include irrelevant cases, irrelevant regulations, debug data, hidden metadata, raw context, or internal engine objects.
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

  const complexity = detectComplexity(
    normalized.userQuery,
    normalized.classification,
    normalized.intent
  );

  const mode =
    normalized.responsePlan?.contextMode ||
    normalized.responsePlan?.orchestrationMode ||
    determineMode(
      normalized.userQuery,
      normalized.classification,
      normalized.intent
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
      adaptiveContext: normalized.adaptiveContext
    }
  );

  const compressedSources = compressSources(
    trimmedSources,
    budget,
    {
      classification: normalized.classification,
      intent: normalized.intent,
      adaptiveContext: normalized.adaptiveContext
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
      taxEngineContext
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
      authorityPacket: normalized.authorityPacket
    })
  };

  const rawMessages = [
    systemMessage,
    ...history,
    userMessage
  ];

  const trimmed = finalTrimMessages(
    rawMessages,
    budget
  );

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
      mandatoryCrossReferenceSequenceEnabled: true,
      interpretationRulesEnabled: true,
      googleDriveHierarchyAware: true,
      reviewMaterialsExcludedUnlessReviewMode: true,
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
      mode
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
    noPromptAssemblyOutsideThisFile: true,
    noDirectOpenAICallOutsideThisFile: true,
    noDuplicateRetrieval: true,
    noDuplicateReranking: true,
    authorityPreservationEnabled: true,
    authorityHierarchyAware: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    mandatoryCrossReferenceSequenceEnabled: true,
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
