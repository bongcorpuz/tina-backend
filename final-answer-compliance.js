// FILE: final-answer-compliance.js
"use strict";

/**
 * TINA Final Answer Compliance Engine
 * Version: 6.1.0
 *
 * Final compliance gate only:
 * - no OpenAI calls
 * - no prompt assembly
 * - no retrieval
 * - no reranking
 * - no new legal analysis generation
 *
 * Owns:
 * - final answer structure validation
 * - source-grounding validation
 * - citation consistency checks
 * - authority hierarchy display sanity checks
 * - conflict-label compliance
 * - hidden/review-source leakage checks
 * - raw/debug payload cleanup
 * - compact final-output safeguards
 */

import {
  runSupersessionPreflight,
  filterVisibleSources,
  buildLegalBasisEntry,
  buildSourcesEntry,
  uniqueDocs,
  dedupe,
  normalizeText,
  normalizeLooseText,
  MAX_VISIBLE_SOURCES
} from "./source-visibility-engine.js";

import { enforceProhibitedPhrases, redactProhibitedPhrases } from "./adaptive-tina-master-prompt.js";

import { expandLegalCitationMentions } from "./legal-citation-range-utils.js";

const ENGINE_VERSION = "6.1.0";

const SAE_STATUS = Object.freeze({
  AUTHORITY_FOUND: "AUTHORITY_FOUND",
  RELATED_AUTHORITY_ONLY: "RELATED_AUTHORITY_ONLY",
  RETRIEVAL_TIMEOUT: "RETRIEVAL_TIMEOUT",
  SOURCE_LOOKUP_EMPTY: "SOURCE_LOOKUP_EMPTY",
  SOURCE_PARSE_ERROR: "SOURCE_PARSE_ERROR",
  NO_INDEXED_SOURCE: "NO_INDEXED_SOURCE"
});

const SAE_SOURCE_CARD_SUPPRESSED_STATUSES = new Set([
  SAE_STATUS.RETRIEVAL_TIMEOUT,
  SAE_STATUS.SOURCE_LOOKUP_EMPTY,
  SAE_STATUS.SOURCE_PARSE_ERROR,
  SAE_STATUS.NO_INDEXED_SOURCE
]);

const RESPONSE_MODE = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM",
  DEFAULT_AF: "DEFAULT_AF",
  AUDIT_FACT_PATTERN: "AUDIT_FACT_PATTERN",
  SENIOR_COUNSEL_MEMO: "SENIOR_COUNSEL_MEMO",
  LITIGATION_MEMO: "SENIOR_COUNSEL_MEMO",
  CASE_ANALYSIS: "CASE_ANALYSIS",
  SOURCE_LOOKUP: "SOURCE_LOOKUP"
});

const DEFAULT_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const SIMPLE_DEFINITION_HEADINGS = Object.freeze([
  "### Direct Answer",
  "### Legal Basis",
  "### Practical Explanation",
  "### Practical Note"
]);

const AUDIT_FACT_PATTERN_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. FACTS / ASSUMPTIONS",
  "C. CONTROLLING LEGAL BASIS",
  "D. ANALYSIS",
  "E. AUDIT / TAX RISK",
  "F. DOCUMENTARY GAPS",
  "G. PRACTICAL POSITION"
]);

const LEGACY_TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const TINA_AF_HEADINGS = DEFAULT_AF_HEADINGS;

const SENIOR_COUNSEL_MEMO_HEADINGS = Object.freeze([
  "RULING",
  "LEGAL BASIS",
  "ANALYSIS",
  "QUALIFICATIONS",
  "OPEN ISSUES",
  "RECOMMENDED ACTION",
  "POSITION STRENGTH"
]);

/**
 * Master Prompt hierarchy:
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
 * 12. PFRS / PAS / PSA when accounting applies
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */
const AUTHORITY_HIERARCHY = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  REPUBLIC_ACT: 2,
  RA: 2,
  CMTA: 2,
  LGC: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,
  JURISPRUDENCE: 5,

  CTA_EN_BANC: 6,

  CTA_DIVISION: 7,
  CTA: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  ADMINISTRATIVE_GUIDANCE: 11,
  TECHNICAL_GUIDANCE: 11,
  BOC_ISSUANCE: 11,
  LGU: 11,
  LGU_ORDINANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD: 13,
  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
});

const COURT_AUTHORITY_TYPES = new Set([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "SC",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "COURT_OF_APPEALS"
]);

const BIR_ISSUANCE_TYPES = new Set([
  "RR",
  "REVENUE_REGULATION",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

const REVIEW_SOURCE_FOLDER_PATTERNS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS",
  "CPA_NOTES",
  "REVIEW_MATERIALS",
  "review materials",
  "reviewer",
  "cpa notes"
]);

const RAW_DEBUG_PATTERNS = Object.freeze([
  /```json[\s\S]*?```/gi,
  /\braw retrieval payload\b[\s\S]*$/gi,
  /\bretrieval payload\b[\s\S]*$/gi,
  /\braw context\b[\s\S]*$/gi,
  /\bdebug\b[\s\S]*$/gi,
  /\bjson dump\b[\s\S]*$/gi,
  /\bembeddings?\b[\s\S]*$/gi,
  /\bquery_embedding\b[\s\S]*$/gi,
  /\bmetadata\s*:\s*\{[\s\S]*?\}\s*$/gi,
  /\bsupabase row\b[\s\S]*$/gi,
  /\bgoogle service account\b[\s\S]*$/gi,
  /\bapi[_-]?key\b[\s\S]*$/gi,
  /\bsecret\b[\s\S]*$/gi,
  /\baccess_token\b[\s\S]*$/gi,
  /\brefresh_token\b[\s\S]*$/gi,
  /\bsystem prompt\b[\s\S]*$/gi,
  /\bdeveloper message\b[\s\S]*$/gi,
  /\bCLASSIFICATION CONTROL\b[\s\S]*$/gi,
  /\bSUPERCESSION AUDIT\b[\s\S]*$/gi,
  /\bSUPERSESSION AUDIT\b[\s\S]*$/gi,
  /\bSUPERCESSION\b[\s\S]*$/gi,
  /\bSUPERSESSION\b[\s\S]*$/gi
]);

const CITATION_PATTERNS = Object.freeze([
  {
    type: "RR",
    regex: /\b(?:RR|Revenue Regulations?)\s*(?:No\.?)?\s*0*(\d+)[-/_ ]+(\d{2,4})\b/gi,
    normalize: (m) => `RR ${stripLeadingZeros(m[1])}-${normalizeYear(m[2])}`
  },
  {
    type: "RMC",
    regex: /\b(?:RMC|Revenue Memorandum Circulars?)\s*(?:No\.?)?\s*0*(\d+)[-/_ ]+(\d{2,4})\b/gi,
    normalize: (m) => `RMC ${stripLeadingZeros(m[1])}-${normalizeYear(m[2])}`
  },
  {
    type: "RMO",
    regex: /\b(?:RMO|Revenue Memorandum Orders?)\s*(?:No\.?)?\s*0*(\d+)[-/_ ]+(\d{2,4})\b/gi,
    normalize: (m) => `RMO ${stripLeadingZeros(m[1])}-${normalizeYear(m[2])}`
  },
  {
    type: "RAMO",
    regex: /\b(?:RAMO|Revenue Audit Memorandum Orders?)\s*(?:No\.?)?\s*0*(\d+)[-/_ ]+(\d{2,4})\b/gi,
    normalize: (m) => `RAMO ${stripLeadingZeros(m[1])}-${normalizeYear(m[2])}`
  },
  {
    type: "RA",
    regex: /\b(?:RA|R\.A\.|Republic Act)\s*(?:No\.?)?\s*0*(\d{4,6})\b/gi,
    normalize: (m) => `RA ${m[1]}`
  },
  {
    type: "NIRC",
    regex: /\b(?:NIRC|Tax Code|National Internal Revenue Code)?\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:NIRC|Tax Code)?\b/gi,
    normalize: (m) => `NIRC Sec. ${m[1]}`
  },
  {
    type: "CMTA",
    regex: /\b(?:CMTA|Customs Modernization and Tariff Act)?\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:CMTA)?\b/gi,
    normalize: (m) => `CMTA Sec. ${m[1]}`
  },
  {
    type: "LGC",
    regex: /\b(?:LGC|Local Government Code)?\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:LGC)?\b/gi,
    normalize: (m) => `LGC Sec. ${m[1]}`
  },
  {
    type: "BIR_RULING",
    regex: /\bBIR\s+Ruling\s*(?:No\.?)?\s*([\w./()-]+)\b/gi,
    normalize: (m) => `BIR Ruling ${m[1]}`
  },
  {
    type: "SUPREME_COURT",
    regex: /\bG\.?\s*R\.?\s*No\.?\s*([\w.-]+)\b/gi,
    normalize: (m) => `G.R. No. ${m[1]}`
  },
  {
    type: "CTA_EN_BANC",
    regex: /\bCTA\s*(?:EB|En Banc)\s*(?:No\.?)?\s*([\w.-]+)\b/gi,
    normalize: (m) => `CTA EB No. ${m[1]}`
  },
  {
    type: "CTA_DIVISION",
    regex: /\bCTA\s*(?:Case)?\s*(?:No\.?)?\s*([\w.-]+)\b/gi,
    normalize: (m) => `CTA Case No. ${m[1]}`
  }
]);

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function compactText(value = "") {
  return normalizeText(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1200) {
  const text = compactText(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingZeros(value = "") {
  return String(value || "").replace(/^0+/, "") || "0";
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function uniqueBy(items = [], getKey = (item) => item) {
  const seen = new Set();
  const output = [];

  for (const item of safeArray(items)) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function normalizeAuthorityCode(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    TAX_CODE: "STATUTE",
    NIRC: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    NATIONAL_INTERNAL_REVENUE_CODE: "STATUTE",
    CMTA: "CMTA",
    LGC: "LGC",

    TREATY: "TREATY",
    TAX_TREATY: "TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SC: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    COURT_CASES: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",

    BIR_RULINGS: "BIR_RULING",
    RULING: "BIR_RULING",

    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    FIRB: "FIRB_ISSUANCE",
    PEZA: "PEZA_ISSUANCE",
    PEZA_MEMO: "PEZA_ISSUANCE",
    SEC: "SEC_GUIDANCE",

    OECD: "OECD_GUIDANCE",

    SECONDARY_SOURCE: "SECONDARY",
    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS",
    REVIEWER: "REVIEW_MATERIALS"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function authorityTypeOf(source = {}) {
  const raw =
    source.authorityType ||
    source.authority_type ||
    source.metadata?.authorityType ||
    source.metadata?.authority_type ||
    null;

  return raw ? normalizeAuthorityCode(raw) : "UNKNOWN";
}

function authorityLevelOf(source = {}) {
  const explicit = Number(
    source.authorityLevel ??
      source.authority_level ??
      source.metadata?.authorityLevel ??
      source.metadata?.authority_level
  );

  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const type = authorityTypeOf(source);
  return Number(AUTHORITY_HIERARCHY[type] || AUTHORITY_HIERARCHY.UNKNOWN);
}

function controllingPrecedenceOf(source = {}) {
  const explicit = Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.metadata?.controllingPrecedence ??
      source.metadata?.controlling_precedence
  );

  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  return authorityLevelOf(source);
}

function sourceTitleOf(source = {}) {
  return (
    source.title ||
    source.sourceTitle ||
    source.source_title ||
    source.documentTitle ||
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.document_title ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    source.path ||
    source.metadata?.path ||
    "Unknown source"
  );
}

function sourcePathOf(source = {}) {
  return (
    source.folderPath ||
    source.folder_path ||
    source.sourcePath ||
    source.source_path ||
    source.path ||
    source.metadata?.folderPath ||
    source.metadata?.folder_path ||
    source.metadata?.path ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    ""
  );
}

function sourceReferenceBlob(source = {}) {
  return compactText(
    [
      source.normalizedReference,
      source.normalized_reference,
      source.citation,
      source.reference,
      source.title,
      source.documentTitle,
      source.document_title,
      source.sourceTitle,
      source.source_title,
      source.originalSource,
      source.original_source,
      source.source,
      source.path,
      source.metadata?.normalizedReference,
      source.metadata?.normalized_reference,
      source.metadata?.citation,
      source.metadata?.documentTitle,
      source.metadata?.originalFileName,
      source.metadata?.path
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isReviewMode(context = {}) {
  const mode = String(
    context.mode ||
      context.responseMode ||
      context.orchestrationMode ||
      context.contextMode ||
      context.issueClassification?.responseMode ||
      context.issueClassification?.orchestrationMode ||
      context.issueClassification?.queryIntent?.intent ||
      ""
  ).toUpperCase();

  const query = String(context.query || context.originalQuery || "").toLowerCase();

  return Boolean(
    context.reviewMode === true ||
      context.requiresReviewMode === true ||
      context.requiresQuizMode === true ||
      context.issueClassification?.requiresReviewMode === true ||
      context.issueClassification?.queryIntent?.requiresReviewMode === true ||
      context.issueClassification?.queryIntent?.requiresQuizMode === true ||
      ["TAX_REVIEWER", "REVIEW_MODE", "QUIZ_MODE", "LEARNING_MODE", "ASSESSMENT", "REVIEWER"].includes(mode) ||
      query.includes("/review")
  );
}

function isSecondaryOrReviewSource(source = {}) {
  const type = authorityTypeOf(source);
  const path = sourcePathOf(source);
  const title = sourceTitleOf(source);

  if (["CPA_NOTES", "REVIEW_MATERIALS", "SECONDARY"].includes(type)) return true;

  const blob = `${path} ${title}`.toUpperCase();
  return REVIEW_SOURCE_FOLDER_PATTERNS.some((pattern) =>
    blob.includes(String(pattern).toUpperCase())
  );
}

function isHiddenSource(source = {}) {
  return Boolean(
    source.hidden === true ||
      source.visible === false ||
      source.sourceVisible === false ||
      source.source_visible === false ||
      source.visibility === "hidden" ||
      source.metadata?.hidden === true ||
      source.metadata?.visible === false ||
      source.metadata?.sourceVisible === false
  );
}

function sourceAllowed(source = {}, context = {}) {
  if (!source) return false;
  if (isHiddenSource(source) && !context.includeHiddenSources) return false;
  if (isSecondaryOrReviewSource(source) && !isReviewMode(context)) return false;
  if (source.issueMismatch === true) return false;
  if (source.issueClassificationMatch?.issueMismatch === true) return false;
  return true;
}

function normalizeAuthorityReference(value = "") {
  const raw = compactText(value);
  if (!raw) return "";

  for (const pattern of CITATION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(raw);
    if (match) return compactText(pattern.normalize(match));
  }

  return compactText(raw)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCitationsFromText(text = "") {
  const output = [];
  const value = String(text || "");

  for (const pattern of CITATION_PATTERNS) {
    pattern.regex.lastIndex = 0;

    for (const match of value.matchAll(pattern.regex)) {
      output.push({
        type: pattern.type,
        raw: match[0],
        normalized: compactText(pattern.normalize(match))
      });
    }
  }

  // Citation range/list expansion: "Sections 105 to 108 of the NIRC", "NIRC Secs. 84-97", etc.
  // Adds individual NIRC section entries for ranges/lists that single-section patterns miss.
  // These entries participate in citationSupportedBySources validation like any other citation.
  for (const ref of expandLegalCitationMentions(value)) {
    output.push({ type: "NIRC", raw: ref, normalized: compactText(ref) });
  }

  return uniqueBy(output, (item) => `${item.type}|${item.normalized}`.toLowerCase());
}

function extractSourceCitations(sources = []) {
  const output = [];

  for (const source of safeArray(sources)) {
    const normalizedReference =
      source.normalizedReference ||
      source.normalized_reference ||
      source.metadata?.normalizedReference ||
      source.metadata?.normalized_reference ||
      source.issuanceNumber ||
      source.issuance_number ||
      source.citation ||
      source.reference ||
      normalizeAuthorityReference(sourceReferenceBlob(source));

    const normalized = normalizeAuthorityReference(normalizedReference);

    if (normalized) {
      output.push({
        type: authorityTypeOf(source),
        raw: normalizedReference,
        normalized,
        source
      });
    }

    for (const citation of extractCitationsFromText(sourceReferenceBlob(source))) {
      output.push({
        ...citation,
        source
      });
    }
  }

  return uniqueBy(output, (item) => `${item.type}|${item.normalized}`.toLowerCase());
}

function citationSupportedBySources(citation = {}, sources = []) {
  const target = normalizeAuthorityReference(citation.normalized || citation.raw || "");
  if (!target) return false;

  const targetLoose = normalizeLooseText(target);

  return extractSourceCitations(sources).some((sourceCitation) => {
    const sourceNorm = normalizeAuthorityReference(sourceCitation.normalized || sourceCitation.raw || "");
    const sourceLoose = normalizeLooseText(sourceNorm);

    return (
      sourceLoose === targetLoose ||
      sourceLoose.includes(targetLoose) ||
      targetLoose.includes(sourceLoose)
    );
  });
}

function hasRetrievedSources(context = {}) {
  return Boolean(
    safeArray(context.legalBasisDocs).length ||
      safeArray(context.sourcesUsed).length ||
      safeArray(context.sources).length ||
      safeArray(context.retrievedSources).length ||
      safeArray(context.citations).length ||
      safeArray(context.legalBasis).length
  );
}

function allCandidateSources(context = {}) {
  return uniqueDocs([
    ...safeArray(context.legalBasisDocs),
    ...safeArray(context.sourcesUsed),
    ...safeArray(context.sources),
    ...safeArray(context.retrievedSources),
    ...safeArray(context.citations),
    ...safeArray(context.legalBasis)
  ]);
}

function visibleCandidateSources(context = {}) {
  return allCandidateSources(context).filter((source) => sourceAllowed(source, context));
}

function getSectionBody(text = "", headingPattern = "") {
  const value = normalizeText(text);
  const regex = new RegExp(
    `${headingPattern}\\s*([\\s\\S]*?)(?=\\n\\s*(?:[A-H]\\.\\s+[A-Z][A-Z /()&-]+\\b|\\d+\\.\\s*[A-Z][A-Z /()&-]+\\b|###\\s+[A-Za-z])|$)`,
    "i"
  );

  return value.match(regex)?.[1]?.trim() || "";
}

function getAFSectionBody(text = "", heading = "") {
  return getSectionBody(text, escapeRegex(heading));
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(
    normalizeText(text)
  );
}

function normalizeMode(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  if (!raw) return RESPONSE_MODE.DEFAULT_AF;

  const normalized = raw
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w]/g, "");

  return RESPONSE_MODE[normalized] || normalized || RESPONSE_MODE.DEFAULT_AF;
}

function requiredSectionsFromContext(context = {}) {
  const rawSections =
    context.requiredAnswerSections ||
    context.answerStructure ||
    context.issueClassification?.requiredAnswerSections ||
    context.issueClassification?.answerStructure ||
    context.issueClassification?.taxDomainClassification?.requiredAnswerSections ||
    context.issueClassification?.taxDomainClassification?.answerStructure ||
    null;

  if (Array.isArray(rawSections) && rawSections.length) {
    return rawSections.map((item) => String(item).trim()).filter(Boolean);
  }

  const mode = normalizeMode(
    context.mode ||
      context.orchestrationMode ||
      context.responseMode ||
      context.contextMode ||
      context.issueClassification?.responseMode ||
      context.issueClassification?.orchestrationMode
  );

  if (mode === RESPONSE_MODE.FAST_DEFINITION) return SIMPLE_DEFINITION_HEADINGS;
  if (mode === RESPONSE_MODE.COMPLEX_ADVISORY || mode === RESPONSE_MODE.AUDIT_FACT_PATTERN) {
    return AUDIT_FACT_PATTERN_HEADINGS;
  }
  if (mode === RESPONSE_MODE.SENIOR_COUNSEL_MEMO) return SENIOR_COUNSEL_MEMO_HEADINGS;

  return DEFAULT_AF_HEADINGS;
}

function hasRequiredStructure(text = "", sections = DEFAULT_AF_HEADINGS) {
  const answer = normalizeText(text);
  const required = safeArray(sections);

  if (!required.length) return true;

  return required.every((heading) => hasHeading(answer, heading));
}

function hasCompleteAFStructure(text = "") {
  return hasRequiredStructure(text, DEFAULT_AF_HEADINGS);
}

function hasAnyAFStructure(text = "") {
  const all = uniqueBy([
    ...DEFAULT_AF_HEADINGS,
    ...SIMPLE_DEFINITION_HEADINGS,
    ...AUDIT_FACT_PATTERN_HEADINGS,
    ...LEGACY_TINA_AF_HEADINGS,
    ...SENIOR_COUNSEL_MEMO_HEADINGS
  ]);

  return all.some((heading) => hasHeading(text, heading));
}

function splitNonEmptyLines(text = "") {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanBulletPrefix(line = "") {
  return String(line).replace(/^[\-\u2022*\d.)\s]+/, "").trim();
}

function ensureDashedBullets(lines = []) {
  return safeArray(lines)
    .filter(Boolean)
    .map((line) => `- ${cleanBulletPrefix(line)}`)
    .join("\n");
}

function takeSentences(text = "", maxSentences = 4) {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  return (cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned])
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxSentences)
    .join(" ");
}

function containsExplicitRuleLikeValue(text = "") {
  const value = normalizeLooseText(text);

  return (
    /\b\d+(\.\d+)?%\b/.test(value) ||
    /\b₱\s*\d[\d,]*(\.\d+)?\b/i.test(value) ||
    /\b(net taxable income|total assets|deadline|due date|rate|threshold|effective|shall|must|required|subject to|exempt|deductible)\b/i.test(value)
  );
}

function buildValidatedLegalBasis(docs = []) {
  return uniqueDocs(docs).slice(0, MAX_VISIBLE_SOURCES).map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs).slice(0, MAX_VISIBLE_SOURCES).map(buildSourcesEntry);
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  return Boolean(
    conflict.conflict === true &&
      (conflict.conflictType || conflict.type || conflict.conflictStatus) &&
      (conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.length || conflict.sameExactIssue === true) &&
      (conflict.exactLegalDimension ||
        conflict.sameIssueGate?.sameDimensions?.length ||
        conflict.legalDimension ||
        conflict.sameLegalDimension === true) &&
      (conflict.sameIssueGate?.passed === true || conflict.exactIssue || conflict.sameExactIssue === true) &&
      (conflict.oppositeHoldingGate?.passed === true ||
        conflict.oppositeHolding ||
        conflict.oppositeHoldings ||
        conflict.oppositeHoldingOrRule === true) &&
      (conflict.resolutionBasis ||
        conflict.resolution_basis ||
        conflict.reason ||
        conflict.hierarchyAnalysis ||
        conflict.conflictResolutionBasis ||
        conflict.winningAuthority ||
        conflict.controllingAuthority ||
        conflict.controllingSource)
  );
}

function hasConflictSignal(conflict = {}) {
  return Boolean(
    conflict?.conflict ||
      conflict?.doctrinalConflict ||
      conflict?.hierarchyConflict ||
      conflict?.apparentConflict ||
      conflict?.conflictType ||
      conflict?.conflictStatus ||
      conflict?.reason ||
      conflict?.resolutionBasis ||
      conflict?.conflictResolutionBasis ||
      conflict?.exactIssue ||
      conflict?.sameIssueGate ||
      conflict?.oppositeHoldingGate
  );
}

function normalizeConflictStatus(conflict = {}) {
  if (!conflictMetadataIsComplete(conflict)) {
    if (conflict?.apparentConflict || conflict?.distinctionType) {
      return "APPARENT_OR_DISTINGUISHABLE";
    }

    return "NO_CONFLICT";
  }

  const type = String(
    conflict.conflictType ||
      conflict.conflictStatus ||
      conflict.status ||
      ""
  ).toUpperCase();

  if (type.includes("DIRECT")) return "DIRECT_CONFLICT";
  if (type.includes("DOCTRINAL")) return "DOCTRINAL_CONFLICT";
  if (type.includes("HIERARCHY")) return "HIERARCHY_CONFLICT";
  if (type.includes("MIXED")) return "MIXED_CONFLICT";

  return conflict.conflict === true ? "CONFLICT" : "NO_CONFLICT";
}

function collectConflictCandidates({
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  authorityValidation = null,
  conflictValidation = null
} = {}) {
  const candidates = [];

  for (const item of [
    conflict,
    conflictReview,
    hierarchyConflict,
    conflictValidation,
    authorityValidation?.conflict,
    jurisprudencePayload?.conflictReview,
    jurisprudencePayload?.jurisprudenceConflict
  ]) {
    if (item && typeof item === "object" && hasConflictSignal(item)) {
      candidates.push(item);
    }
  }

  for (const item of safeArray(conflicts)) {
    if (item && typeof item === "object" && hasConflictSignal(item)) {
      candidates.push(item);
    }
  }

  return candidates;
}

function pickBestConflict({
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  authorityValidation = null,
  conflictValidation = null
} = {}) {
  const candidates = collectConflictCandidates({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    authorityValidation,
    conflictValidation
  });

  if (!candidates.length) return null;

  const complete = candidates.filter(conflictMetadataIsComplete);

  if (!complete.length) {
    return candidates.find((item) => item.apparentConflict || item.distinctionType) || null;
  }

  const priority = {
    MIXED_CONFLICT: 1,
    DIRECT_CONFLICT: 2,
    DOCTRINAL_CONFLICT: 3,
    HIERARCHY_CONFLICT: 4,
    CONFLICT: 5,
    APPARENT_OR_DISTINGUISHABLE: 50,
    NO_CONFLICT: 99
  };

  return complete.sort((a, b) => {
    const aStatus = normalizeConflictStatus(a);
    const bStatus = normalizeConflictStatus(b);
    return (priority[aStatus] || 50) - (priority[bStatus] || 50);
  })[0];
}

function sourceNameFromConflict(conflict = {}, side = "A") {
  if (side === "A") {
    return (
      conflict.sourceA ||
      conflict.source_a_path ||
      conflict.source_a_title ||
      conflict.controllingSource ||
      conflict.winningSource ||
      "Source A"
    );
  }

  return (
    conflict.sourceB ||
    conflict.source_b_path ||
    conflict.source_b_title ||
    conflict.overriddenSource ||
    conflict.weakerSource ||
    "Source B"
  );
}

function buildConflictExplanationFromMetadata(conflict = {}) {
  if (!conflictMetadataIsComplete(conflict)) {
    if (conflict?.apparentConflict || conflict?.distinctionType) {
      return [
        "Conflict Detected: NO",
        "The retrieved authorities may appear related, but the metadata does not establish the required same exact issue, same legal dimension, and opposite holding.",
        conflict.distinctionType
          ? `Distinction type: ${trimText(conflict.distinctionType, 300)}`
          : null,
        conflict.reason ? `Reason: ${trimText(conflict.reason, 700)}` : null,
        "Treat the authorities as distinguishable or complementary unless a complete same-issue opposite-holding conflict is established."
      ]
        .filter(Boolean)
        .join("\n");
    }

    return "Conflict Detected: NO\nNo direct doctrinal conflict is detected from the validated indexed sources.";
  }

  const status = normalizeConflictStatus(conflict);

  const exactIssue =
    conflict.exactIssue ||
    conflict.sameIssueGate?.sameIssues?.join(", ") ||
    "The exact legal issue must be determined from the retrieved authorities.";

  const exactLegalDimension =
    conflict.exactLegalDimension ||
    conflict.sameIssueGate?.sameDimensions?.join(", ") ||
    conflict.legalDimension ||
    "Not expressly classified";

  const controllingAuthority =
    conflict.controllingAuthority ||
    conflict.controlling_authority ||
    conflict.winningAuthority ||
    "the higher controlling authority under Philippine tax hierarchy";

  const overriddenAuthority =
    conflict.overriddenAuthority ||
    conflict.weakerAuthority ||
    conflict.overridden_authority ||
    null;

  const resolutionBasis =
    conflict.resolutionBasis ||
    conflict.resolution_basis ||
    conflict.conflictResolutionBasis ||
    conflict.reason ||
    "Apply the Constitution, statute, valid regulations, and controlling court doctrine in proper hierarchy.";

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${status}`,
    `Exact legal issue in conflict: ${trimText(exactIssue, 300)}`,
    `Exact legal dimension: ${trimText(exactLegalDimension, 300)}`,
    `Source A: ${trimText(sourceNameFromConflict(conflict, "A"), 260)}`,
    `Source B: ${trimText(sourceNameFromConflict(conflict, "B"), 260)}`,
    `Controlling doctrine/authority: ${trimText(controllingAuthority, 260)}`,
    overriddenAuthority
      ? `Overridden or limited authority: ${trimText(overriddenAuthority, 260)}`
      : null,
    `Why it controls: ${trimText(resolutionBasis, 900)}`
  ]
    .filter(Boolean)
    .join("\n");
}

function isVagueConflictYes(text = "") {
  const value = normalizeText(text);

  if (!/Conflict Detected:\s*YES/i.test(value)) return false;

  const hasSpecificConflict =
    /Source A:/i.test(value) &&
    /Source B:/i.test(value) &&
    /(Exact issue|Exact legal dimension|Controlling doctrine|Controlling authority|Resolution basis|Why it controls)\s*[:\s]/i.test(value);

  return !(hasSpecificConflict && value.length >= 300);
}

function validateConflictLabel({
  answer = "",
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  authorityValidation = null,
  conflictValidation = null
} = {}) {
  const bestConflict = pickBestConflict({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    authorityValidation,
    conflictValidation
  });

  const hasYes = /Conflict Detected:\s*YES/i.test(answer);
  const complete = conflictMetadataIsComplete(bestConflict);

  return {
    valid: !hasYes || complete,
    hasConflictYes: hasYes,
    completeConflictMetadata: complete,
    normalizedStatus: normalizeConflictStatus(bestConflict || {}),
    bestConflict,
    warning:
      hasYes && !complete
        ? "Conflict label downgraded because same-issue, same-dimension, opposite-holding, and hierarchy-resolution metadata was incomplete."
        : null
  };
}

function sanitizeConflictSection(text = "", conflictMetadata = null) {
  const value = normalizeText(text);
  if (!value) return value;

  const replacement = buildConflictExplanationFromMetadata(conflictMetadata || {});

  const legacyConflictBody =
    getSectionBody(value, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(value, String.raw`###\s*Conflict flag\b`);

  if (legacyConflictBody && isVagueConflictYes(legacyConflictBody)) {
    return value.replace(
      /(\b5\.\s*CONFLICT FLAG\b|###\s*Conflict flag\b)[\s\S]*?(?=\n\s*(?:[A-H]\.\s+[A-Z][A-Z /()&-]+\b|\d+\.\s*[A-Z][A-Z /()&-]+\b|###\s+[A-Za-z])|$)/i,
      `E. DOCTRINAL STATUS / CONFLICT ANALYSIS\n${replacement}`
    );
  }

  const modernConflictBody =
    getAFSectionBody(value, "E. DOCTRINAL STATUS / CONFLICT ANALYSIS") ||
    getAFSectionBody(value, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS");

  if (
    modernConflictBody &&
    (/Conflict Detected:\s*YES/i.test(modernConflictBody) ||
      isVagueConflictYes(modernConflictBody)) &&
    !conflictMetadataIsComplete(conflictMetadata)
  ) {
    return value.replace(
      /([D-E]\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS\b)[\s\S]*?(?=\n\s*(?:[F-G]\.\s*[A-Z][A-Z /()&-]+|E\.\s*HIERARCHY ANALYSIS\b|F\.\s*PRACTICAL|$))/i,
      `$1\n${replacement}\n`
    );
  }

  return value;
}

function normalizeLegacyHeadingsToAF(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1D. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL NOTE / APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Issue\b/gim, "A. DIRECT ANSWER")
    .replace(/^#+\s*Applicable law.*$/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*BIR position\b/gim, "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/^#+\s*Court position\b/gim, "D. SUPPORTING JURISPRUDENCE")
    .replace(/^#+\s*Conflict flag\b/gim, "E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Legally defensible conclusion\b/gim, "F. PRACTICAL NOTE / APPLICATION")
    .replace(/^#+\s*Taxpayer risk assessment\b/gim, "F. PRACTICAL NOTE / APPLICATION")
    .replace(/^#+\s*Recommended action\b/gim, "F. PRACTICAL NOTE / APPLICATION");
}

function stripInventedSourceSections(text = "") {
  return String(text || "")
    .replace(/\n+\s*6\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*6\.\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*8\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*SOURCES USED[\s\S]*$/i, "")
    // Bold/italic "Sources Used" variants: **Sources Used:**, **Sources Used**:, *Sources Used:*
    .replace(/\n+\*{0,2}Sources Used\*{0,2}:?\*{0,2}[\s\S]*$/i, "")
    // Bold/italic "Sources" — colon-present: **Sources:**, **Sources**:, *Sources:*
    // Colon distinguishes header from prose; no (?:\n|$) guard needed.
    .replace(/\n+\*{0,2}Sources\*{0,2}:\*{0,2}[\s\S]*$/i, "")
    // Bold/italic "Sources" — no-colon: **Sources**\nItems — explicit \n guard
    .replace(/\n+\*{0,2}Sources\*{0,2}\s*\n[\s\S]*$/i, "")
    // Bold/italic "References" variants: **References:**, *References:*
    .replace(/\n+\*{0,2}References\*{0,2}:?\*{0,2}[\s\S]*$/i, "")
    // Markdown heading variants: ## Sources, ### Sources:, ## References
    .replace(/\n+#{1,6}\s*\*{0,2}(?:Sources(?:\s+Used)?|References)\*{0,2}:?[\s\S]*$/i, "")
    .replace(/\n+\s*Source\(s\):\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Source:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*References:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*CLASSIFICATION CONTROL[\s\S]*$/i, "")
    .replace(/\n+\s*DEBUG[\s\S]*$/i, "")
    .replace(/\n+\s*RAW CONTEXT[\s\S]*$/i, "")
    .replace(/\n+\s*RETRIEVAL PAYLOAD[\s\S]*$/i, "")
    .replace(/\n+\s*JSON DUMP[\s\S]*$/i, "")
    .trim();
}

function sanitizeRawDebugLeakage(text = "") {
  let output = String(text || "");

  for (const pattern of RAW_DEBUG_PATTERNS) {
    output = output.replace(pattern, "");
  }

  return stripInventedSourceSections(output)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSystemFallbackAnswer(text = "") {
  const value = normalizeText(text);

  return Boolean(
    /\bTINA could not complete\b/i.test(value) ||
    /\bSYSTEM LIMITATION\b/i.test(value) ||
    /\bActual error:/i.test(value) ||
    /\borchestration-safe OpenAI call failed\b/i.test(value) ||
    /\bprocessing limitation\b/i.test(value) ||
    /\bRAG response due to a processing limitation\b/i.test(value)
  );
}

function appendValidatedSourceAppendix(answer = "", docs = []) {
  const sourceLines = buildValidatedSources(docs);

  if (!sourceLines.length) return answer;

  return [
    answer.trim(),
    "",
    "Validated Indexed Sources",
    ensureDashedBullets(sourceLines)
  ].join("\n");
}

function preserveSystemFallbackAnswer({
  draftAnswer = "",
  fallbackAnswer = "",
  sourcesUsed = [],
  legalBasisDocs = []
} = {}) {
  const preferred =
    normalizeText(draftAnswer) ||
    normalizeText(fallbackAnswer) ||
    "TINA could not complete the response due to a processing limitation.";

  const clean = sanitizeRawDebugLeakage(preferred);

  const sourceDocs = uniqueDocs([
    ...safeArray(sourcesUsed),
    ...safeArray(legalBasisDocs)
  ]).slice(0, MAX_VISIBLE_SOURCES);

  if (!sourceDocs.length) return clean;

  return appendValidatedSourceAppendix(clean, sourceDocs);
}

function buildDirectAnswer({ draftAnswer = "", fallbackAnswer = "" }) {
  const directBody =
    getAFSectionBody(draftAnswer, "A. DIRECT ANSWER") ||
    getSectionBody(draftAnswer, String.raw`\b1\.\s*DIRECT ANSWER\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Legally defensible conclusion\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Issue\b`);

  return takeSentences(directBody || fallbackAnswer || draftAnswer || "", 4);
}

function buildControllingLegalBasis({ draftAnswer = "", legalBasisDocs = [] }) {
  const body =
    getAFSectionBody(draftAnswer, "B. CONTROLLING LEGAL BASIS") ||
    getSectionBody(draftAnswer, String.raw`\b2\.\s*LEGAL BASIS\b`);

  if (body && !/No legal basis was rendered|No legal basis exists/i.test(body)) {
    return body;
  }

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  return legalBasisLines.length
    ? ensureDashedBullets(legalBasisLines)
    : "- Indexed source not found.";
}

function buildSupportingRules({ draftAnswer = "", legalBasisDocs = [] }) {
  const body =
    getAFSectionBody(draftAnswer, "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES") ||
    getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING RULES\b`);

  const lines = splitNonEmptyLines(body)
    .map(cleanBulletPrefix)
    .filter(Boolean)
    .filter((line) => !/No supporting rules were rendered|No supporting rule exists/i.test(line));

  if (lines.length) return lines;

  const inferred = [];

  for (const doc of legalBasisDocs.slice(0, 3)) {
    const snippet = normalizeText(
      doc.text ||
        doc.preview ||
        doc.excerpt ||
        doc.content ||
        ""
    );

    if (!snippet) continue;

    const sentences = snippet.match(/[^.!?]+[.!?]?/g) || [];

    for (const sentence of sentences) {
      const trimmed = normalizeText(sentence);

      if (trimmed && containsExplicitRuleLikeValue(trimmed)) {
        inferred.push(trimmed);
      }

      if (inferred.length >= 4) break;
    }

    if (inferred.length >= 4) break;
  }

  return dedupe(inferred).slice(0, 4);
}

function buildSupportingJurisprudence({
  draftAnswer = "",
  jurisprudencePayload = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "D. SUPPORTING JURISPRUDENCE") ||
    getAFSectionBody(draftAnswer, "C. SUPPORTING JURISPRUDENCE") ||
    getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING JURISPRUDENCE\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Jurisprudence\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Court position\b`);

  if (body && !/No supporting jurisprudence was rendered/i.test(body)) return body;

  const cases = safeArray(
    jurisprudencePayload?.directlyRelevantCases ||
      jurisprudencePayload?.cases ||
      []
  ).slice(0, 4);

  if (jurisprudencePayload?.noJurisprudence || !cases.length) {
    return "No directly issue-matched jurisprudence was retrieved from the indexed context.";
  }

  return ensureDashedBullets(
    cases.map((item) => {
      const title = item.title || item.caseReference || item.citation || "Relevant case";
      const role = item.caseRole || item.caseApplicability || "supporting jurisprudence";
      return `${title} — ${role}`;
    })
  );
}

function buildDoctrinalStatus({
  draftAnswer = "",
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  authorityValidation = null,
  conflictValidation = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "E. DOCTRINAL STATUS / CONFLICT ANALYSIS") ||
    getAFSectionBody(draftAnswer, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS") ||
    getSectionBody(draftAnswer, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Conflict flag\b`);

  const bestConflict = pickBestConflict({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    authorityValidation,
    conflictValidation
  });

  if (body && !isVagueConflictYes(body) && !/Conflict Detected:\s*YES/i.test(body)) {
    return body;
  }

  return buildConflictExplanationFromMetadata(bestConflict || {});
}

function buildPracticalApplication({
  draftAnswer = "",
  fallbackAnswer = "",
  professionalInsight = "",
  supersessionResult = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "F. PRACTICAL NOTE / APPLICATION") ||
    getAFSectionBody(draftAnswer, "F. PRACTICAL APPLICATION") ||
    getSectionBody(draftAnswer, String.raw`###\s*Recommended action\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Taxpayer risk assessment\b`);

  if (body) return body;

  if (supersessionResult?.superseded?.length) {
    return "One or more indexed sources appeared superseded, so only active controlling sources were retained. Verify the latest BIR issuance and maintain supporting documentation before implementation.";
  }

  return normalizeText(
    professionalInsight ||
      fallbackAnswer ||
      "Verify the latest indexed authority, controlling court doctrine, BIR issuance, and documentary requirements before implementation."
  );
}

function rebuildAFAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  professionalInsight = "",
  supersessionResult = null,
  authorityValidation = null,
  conflictValidation = null
}) {
  const finalDirectAnswer = normalizeText(
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      })
  );

  const supportingRules = buildSupportingRules({
    draftAnswer: sanitizedDraft,
    legalBasisDocs
  });

  return [
    "A. DIRECT ANSWER",
    finalDirectAnswer ||
      "This requires verification against the latest indexed BIR issuance, NIRC provision, or controlling court authority.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    Array.isArray(supportingRules) && supportingRules.length
      ? ensureDashedBullets(supportingRules)
      : "Indexed source not found.",
    "",
    "D. SUPPORTING JURISPRUDENCE",
    buildSupportingJurisprudence({
      draftAnswer: sanitizedDraft,
      jurisprudencePayload
    }),
    "",
    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    buildDoctrinalStatus({
      draftAnswer: sanitizedDraft,
      conflicts,
      hierarchyConflict,
      conflict,
      conflictReview,
      jurisprudencePayload,
      authorityValidation,
      conflictValidation
    }),
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    buildPracticalApplication({
      draftAnswer: sanitizedDraft,
      fallbackAnswer,
      professionalInsight,
      supersessionResult
    })
  ]
    .join("\n")
    .trim();
}

function repairMissingAFSections(args = {}) {
  if (hasCompleteAFStructure(args.answer)) return args.answer;
  return rebuildAFAnswer({ ...args, sanitizedDraft: args.answer });
}

function buildFastDefinitionAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = []
}) {
  console.log("[PATCH-017I]", { marker: "PATCH_017I_FAST_DEFINITION_RENDERER_APPLIED" });
  const stripMechanics = (text = "") => {
    const cleaned = text
      .replace(/\(Framework knowledge[^)]*\)/gi, "")
      .replace(/Indexed source not found\.?/gi, "")
      .trim();
    if (cleaned !== text.trim()) {
      console.log("[PATCH-017I]", { marker: "PATCH_017I_FALLBACK_LANGUAGE_BLOCKED", renderer: "FAST_DEFINITION" });
    }
    return cleaned;
  };

  const directBody =
    getAFSectionBody(sanitizedDraft, "### Direct Answer") ||
    getAFSectionBody(sanitizedDraft, "A. DIRECT ANSWER") ||
    directAnswer ||
    "";

  const answer = stripMechanics(
    takeSentences(directBody || buildDirectAnswer({ draftAnswer: sanitizedDraft, fallbackAnswer }), 4)
  );

  const indexedBasis = buildValidatedLegalBasis(legalBasisDocs).slice(0, 3);
  const modelLegalBasis = stripMechanics(
    getAFSectionBody(sanitizedDraft, "### Legal Basis") ||
    getAFSectionBody(sanitizedDraft, "B. CONTROLLING LEGAL BASIS") ||
    ""
  );

  const practicalExplanation = stripMechanics(
    getAFSectionBody(sanitizedDraft, "### Practical Explanation") ||
    getAFSectionBody(sanitizedDraft, "C. ADMINISTRATIVE ISSUANCE") ||
    getAFSectionBody(sanitizedDraft, "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES") ||
    ""
  );

  const practicalNote = stripMechanics(
    getAFSectionBody(sanitizedDraft, "### Practical Note") ||
    getAFSectionBody(sanitizedDraft, "D. PRACTICAL NOTE") ||
    getAFSectionBody(sanitizedDraft, "F. PRACTICAL NOTE / APPLICATION") ||
    getAFSectionBody(sanitizedDraft, "C. PRACTICAL NOTE") ||
    ""
  );

  return [
    "### Direct Answer",
    answer || "Please refer to the applicable NIRC provision for the statutory definition.",
    "",
    "### Legal Basis",
    indexedBasis.length
      ? ensureDashedBullets(indexedBasis)
      : modelLegalBasis || "Refer to the relevant provision of the NIRC as amended and its implementing regulations.",
    "",
    "### Practical Explanation",
    practicalExplanation || "The implementing regulation applies. Refer to the relevant Revenue Regulation for operational details.",
    "",
    "### Practical Note",
    practicalNote || "Consult the applicable provision and implementing regulation before relying on this answer for compliance purposes."
  ].join("\n");
}

function buildStandardTaxAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  jurisprudencePayload = null,
  professionalInsight = ""
}) {
  const supportingRules = buildSupportingRules({
    draftAnswer: sanitizedDraft,
    legalBasisDocs
  });

  return [
    "A. DIRECT ANSWER",
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }) ||
      "No direct answer could be formed from the indexed sources.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    Array.isArray(supportingRules) && supportingRules.length
      ? ensureDashedBullets(supportingRules)
      : "Indexed source not found.",
    "",
    "D. SUPPORTING JURISPRUDENCE",
    buildSupportingJurisprudence({
      draftAnswer: sanitizedDraft,
      jurisprudencePayload
    }),
    "",
    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "Conflict Detected: NO\nNo direct doctrinal conflict is detected from the validated indexed sources.",
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    professionalInsight ||
      buildPracticalApplication({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      })
  ].join("\n");
}

function buildComplexAdvisoryAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  professionalInsight = "",
  issueClassification = null,
  supersessionResult = null
}) {
  const factSensitivity =
    issueClassification?.factSensitivity ||
    issueClassification?.orchestrationClassification?.factSensitivity ||
    "moderate";

  return [
    "A. DIRECT ANSWER",
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }) ||
      "The conclusion depends on the final facts and supporting documents.",
    "",
    "B. FACTS / ASSUMPTIONS",
    `Fact sensitivity: ${factSensitivity}. The conclusion should be confirmed against the actual contracts, invoices, receipts, accounting entries, and transaction flow.`,
    "",
    "C. CONTROLLING LEGAL BASIS",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "D. ANALYSIS",
    buildPracticalApplication({
      draftAnswer: sanitizedDraft,
      fallbackAnswer,
      professionalInsight,
      supersessionResult
    }),
    "",
    "E. AUDIT / TAX RISK",
    "Tax risk depends on the strength of documents, consistency of accounting records, BIR filings, and transaction substance.",
    "",
    "F. DOCUMENTARY GAPS",
    ensureDashedBullets([
      "Executed contract or agreement",
      "Invoices, receipts, billing statements, and official BIR documents",
      "General ledger entries and reconciliations",
      "Proof of actual transaction flow and payment flow",
      "Management explanation supporting the tax position"
    ]),
    "",
    "G. PRACTICAL POSITION",
    "Finalize the position only after confirming the controlling authorities and documentary support."
  ].join("\n");
}

function resolveVisibleSources({
  legalBasisDocs = [],
  sourcesUsed = [],
  sources = [],
  retrievedSources = [],
  citations = [],
  legalBasis = [],
  asOfDate = new Date(),
  query = "",
  issueClassification = null,
  context = {}
}) {
  const rawLegalBasisDocs = uniqueDocs([
    ...safeArray(legalBasisDocs),
    ...safeArray(legalBasis),
    ...safeArray(citations)
  ]);

  const rawSourcesUsed = uniqueDocs([
    ...safeArray(sourcesUsed),
    ...safeArray(sources),
    ...safeArray(retrievedSources)
  ]);

  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs: rawLegalBasisDocs,
    sourcesUsed: rawSourcesUsed,
    asOfDate,
    query,
    issueClassification
  });

  const visibleLegalBasisDocs = filterVisibleSources(resolvedLegalBasisDocs, {
    maxItems: MAX_VISIBLE_SOURCES,
    supersessionResult,
    query,
    issueClassification
  }).filter((source) => sourceAllowed(source, context));

  const visibleSourceDocs =
    resolvedSourcesUsed.length > 0
      ? filterVisibleSources(resolvedSourcesUsed, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult,
          query,
          issueClassification
        }).filter((source) => sourceAllowed(source, context))
      : visibleLegalBasisDocs;

  // ── TEMP TRACE: Stage 6 — visible sources after filterVisibleSources() ─────
  // Remove after retrieval audit is complete.
  console.log("[VISIBLE SOURCES]", {
    legalBasisIn:  resolvedLegalBasisDocs.length,
    legalBasisOut: visibleLegalBasisDocs.length,
    sourcesUsedIn: resolvedSourcesUsed.length,
    sourcesUsedOut: visibleSourceDocs.length
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  return {
    supersessionResult,
    resolvedLegalBasisDocs: visibleLegalBasisDocs,
    resolvedSourcesUsed: visibleSourceDocs,
    visibleSourceDocs
  };
}

function validateFinalAnswerStructure({
  answer = "",
  requiredSections = null,
  context = {}
} = {}) {
  const sections = requiredSections || requiredSectionsFromContext(context);
  const missingSections = safeArray(sections).filter(
    (heading) => !hasHeading(answer, heading)
  );

  return {
    valid: missingSections.length === 0,
    requiredSections: sections,
    missingSections,
    hasAnyKnownStructure: hasAnyAFStructure(answer),
    warning: missingSections.length
      ? `Missing required answer sections: ${missingSections.join(", ")}`
      : null
  };
}

function validateSourceGrounding({
  answer = "",
  sources = [],
  context = {}
} = {}) {
  const visibleSources = safeArray(sources).filter((source) =>
    sourceAllowed(source, context)
  );

  const cited = extractCitationsFromText(answer);
  const unsupportedCitations = cited.filter(
    (citation) => !citationSupportedBySources(citation, visibleSources)
  );

  const hasSources = visibleSources.length > 0;
  const saysNoLegalBasisRendered =
    /No legal basis was rendered|No supporting rules were rendered|No legal basis exists|No supporting rules exist/i.test(
      answer
    );

  return {
    valid:
      unsupportedCitations.length === 0 &&
      !(hasSources && saysNoLegalBasisRendered),
    hasSources,
    citationCount: cited.length,
    unsupportedCitations,
    saysNoLegalBasisRendered,
    warning:
      unsupportedCitations.length > 0
        ? `Unsupported citations detected: ${unsupportedCitations
            .map((item) => item.normalized)
            .join(", ")}`
        : hasSources && saysNoLegalBasisRendered
          ? "Answer contains no-legal-basis fallback language despite available indexed sources."
          : null
  };
}

function validateCitationSupport(args = {}) {
  return validateSourceGrounding(args);
}

function enforceAuthorityHierarchyDisplay({
  answer = "",
  sources = [],
  context = {}
} = {}) {
  const warnings = [];
  const visibleSources = safeArray(sources).filter((source) =>
    sourceAllowed(source, context)
  );

  const secondaryControlling = visibleSources.filter(
    (source) =>
      isSecondaryOrReviewSource(source) &&
      /controlling|legal basis|controlling basis/i.test(
        `${source.citationRole || ""} ${source.authorityRole || ""} ${source.section || ""}`
      )
  );

  if (secondaryControlling.length) {
    warnings.push("Secondary/review materials must not be presented as controlling legal basis.");
  }

  const answerText = normalizeLooseText(answer);

  if (
    /\b(rmc|rmo|ramo|bir ruling)\b/i.test(answerText) &&
    /\boverrides?\s+(the\s+)?(nirc|tax code|statute|supreme court|constitution|cta)\b/i.test(answerText)
  ) {
    warnings.push("Administrative issuances must not be presented as overriding statutes, the Constitution, or controlling court doctrine.");
  }

  if (/\bcta\b/i.test(answerText) && /\boverrides?\s+(the\s+)?supreme court\b/i.test(answerText)) {
    warnings.push("CTA decisions must not be presented as overriding Supreme Court decisions.");
  }

  return {
    valid: warnings.length === 0,
    warnings,
    checkedSources: visibleSources.length,
    masterPromptAuthorityHierarchyApplied: true
  };
}

function normalizeSaeStatus(value = "") {
  return String(value || "").trim().toUpperCase();
}

function resolveSaeMetadata(input = {}) {
  const sourceAvailability = safeObject(input.sourceAvailability);
  const sourceAvailabilityMetadata = safeObject(input.sourceAvailabilityMetadata);
  const metadata = safeObject(input.metadata);
  const metadataSourceAvailability = safeObject(metadata.sourceAvailability);
  const metadataSourceAvailabilityMetadata = safeObject(metadata.sourceAvailabilityMetadata);

  const saeStatus = normalizeSaeStatus(
    input.saeStatus ||
      sourceAvailability.saeStatus ||
      sourceAvailability.sourceAvailability ||
      sourceAvailability.sourceStatus ||
      sourceAvailability.status ||
      sourceAvailabilityMetadata.saeStatus ||
      sourceAvailabilityMetadata.sourceAvailability ||
      sourceAvailabilityMetadata.sourceStatus ||
      sourceAvailabilityMetadata.status ||
      metadata.saeStatus ||
      metadataSourceAvailability.saeStatus ||
      metadataSourceAvailability.sourceAvailability ||
      metadataSourceAvailability.sourceStatus ||
      metadataSourceAvailability.status ||
      metadataSourceAvailabilityMetadata.saeStatus ||
      metadataSourceAvailabilityMetadata.sourceAvailability ||
      metadataSourceAvailabilityMetadata.sourceStatus ||
      metadataSourceAvailabilityMetadata.status ||
      (typeof input.sourceAvailability === "string" ? input.sourceAvailability : "")
  );

  return {
    saeStatus,
    sourceAvailability: input.sourceAvailability ?? null,
    sourceAvailabilityMetadata: input.sourceAvailabilityMetadata ?? null,
    limitationRequired:
      input.limitationRequired ??
      sourceAvailability.limitationRequired ??
      sourceAvailabilityMetadata.limitationRequired ??
      metadata.limitationRequired ??
      metadataSourceAvailability.limitationRequired ??
      metadataSourceAvailabilityMetadata.limitationRequired ??
      null,
    disclosureType:
      input.disclosureType ||
      sourceAvailability.disclosureType ||
      sourceAvailabilityMetadata.disclosureType ||
      metadata.disclosureType ||
      metadataSourceAvailability.disclosureType ||
      metadataSourceAvailabilityMetadata.disclosureType ||
      null,
    statusReason:
      input.statusReason ||
      input.sourceAvailabilityReason ||
      sourceAvailability.statusReason ||
      sourceAvailability.sourceAvailabilityReason ||
      sourceAvailabilityMetadata.statusReason ||
      sourceAvailabilityMetadata.sourceAvailabilityReason ||
      metadata.statusReason ||
      metadata.sourceAvailabilityReason ||
      metadataSourceAvailability.statusReason ||
      metadataSourceAvailability.sourceAvailabilityReason ||
      metadataSourceAvailabilityMetadata.statusReason ||
      metadataSourceAvailabilityMetadata.sourceAvailabilityReason ||
      ""
  };
}

function hasRelatedAuthorityLimitationLanguage(text = "") {
  return /\b(related|supporting|secondary|persuasive|not\s+controlling|not\s+governing|does\s+not\s+(?:directly\s+)?govern|limitation|limited|no\s+controlling|no\s+governing|direct\s+governing\s+authority\s+(?:was\s+)?not\s+(?:found|identified))\b/i.test(
    text
  );
}

function claimsControllingAuthorityFound(text = "") {
  const unsafeText = stripSafeControllingAuthorityNegations(text);
  return /\b(controlling|governing|directly\s+applicable|direct)\s+(legal\s+)?(authority|law|basis|source|rule)\s+(?:was\s+|is\s+|has\s+been\s+)?(?:found|identified|available|retrieved|confirmed|established)\b/i.test(
    unsafeText
  ) ||
    /\b(?:found|identified|retrieved|confirmed|established)\s+(?:a\s+|the\s+)?(?:controlling|governing|directly\s+applicable|direct)\s+(legal\s+)?(?:authority|law|basis|source|rule)\b/i.test(
      unsafeText
    );
}

function presentsRelatedAsControlling(text = "") {
  return /\b(related|supporting|secondary|persuasive)\s+(authority|source|issuance|material|rule)s?\s+(?:is|are|was|were|serves?\s+as|constitutes?)\s+(?:the\s+)?(controlling|governing|direct)\b/i.test(
    text
  ) ||
    /\b(controlling|governing|direct)\s+(authority|source|basis|rule)\s+(?:is|are|was|were)\s+(?:the\s+)?(related|supporting|secondary|persuasive)\b/i.test(
      text
    );
}

function containsSourceCardDisplay(text = "") {
  return /(^|\n)\s*(?:Validated Indexed Sources|Sources Used|Sources|References|Source\(s\)|Source Cards?|Authority Used)\s*:?\s*(\n|$)/i.test(
    text
  );
}

function stripSafeControllingAuthorityNegations(text = "") {
  return String(text || "")
    .replace(/\bno\s+indexed\s+(?:governing|controlling)\s+source\s+was\s+available\b/gi, "")
    .replace(/\bno\s+(?:controlling|governing)\s+authority\s+was\s+(?:found|identified)\b/gi, "")
    .replace(/\bonly\s+(?:related|supporting|secondary|persuasive)\s+authority\s+was\s+found\b/gi, "")
    .replace(/\bi\s+cannot\s+(?:identify|present|confirm)\s+(?:it\s+as\s+)?(?:a\s+|the\s+)?(?:controlling|governing)\s+authority\b/gi, "")
    .replace(/\bthe\s+(?:governing|controlling)\s+authority\s+could\s+not\s+be\s+confirmed\b/gi, "")
    .replace(/\bi\s+cannot\s+confirm\s+(?:a\s+|the\s+)?(?:controlling|governing)\s+authority\s+from\s+the\s+available\s+sources\b/gi, "");
}

function usesControllingStyleForRelatedOnly(text = "") {
  const unsafeText = stripSafeControllingAuthorityNegations(text);
  return /(^|\n)\s*(?:#+\s*)?(?:[A-Z]\.\s*)?(?:Controlling Authorities|Governing Authorities|Controlling Law|Governing Law)\s*:?\s*(\n|$)/i.test(unsafeText) ||
    /\bthe\s+(?:controlling|governing)\s+authority\b/i.test(unsafeText) ||
    /\bunder\s+the\s+governing\s+rule\b/i.test(unsafeText) ||
    /\bthe\s+law\s+clearly\s+provides\b/i.test(unsafeText);
}

function stripSafeParseFailedNegations(text = "") {
  return String(text || "")
    .replace(/\bi\s+cannot\s+rely\s+on\s+parse[-\s]?failed\s+content\s+as\s+authority\b/gi, "")
    .replace(/\bthe\s+source\s+could\s+not\s+be\s+parsed\s+reliably\b/gi, "");
}

function stripSafeTimeoutNegations(text = "") {
  return String(text || "")
    .replace(/\b(?:this\s+)?does\s+not\s+mean\s+(?:that\s+)?no\s+[^.?!]*(?:law|authority|source|legal\s+basis)[^.?!]*(?:exists?|is\s+available)?/gi, "")
    .replace(/\bthe\s+retrieval\s+process\s+timed\s+out\s+before\s+confirmation\b/gi, "");
}

function reliesOnParseFailedAuthority(text = "") {
  const unsafeText = stripSafeParseFailedNegations(text);
  return /\b(parse[-\s]?failed|failed\s+to\s+parse|unparsed|parsing\s+error)\b[\s\S]{0,160}\b(authority|source|law|basis|controls?|governs?|applies)\b/i.test(
    unsafeText
  ) ||
    /\b(authority|source|law|basis|controls?|governs?|applies)\b[\s\S]{0,160}\b(parse[-\s]?failed|failed\s+to\s+parse|unparsed|parsing\s+error)\b/i.test(
      unsafeText
    );
}

function treatsTimeoutAsNoLaw(text = "") {
  const unsafeText = stripSafeTimeoutNegations(text);
  return /\b(no|none|not\s+any|does\s+not\s+exist|doesn'?t\s+exist)\b[\s\S]{0,80}\b(law|legal\s+basis|authority|source|rule|issuance)\b/i.test(
    unsafeText
  ) ||
    /\b(law|legal\s+basis|authority|source|rule|issuance)\b[\s\S]{0,80}\b(does\s+not\s+exist|doesn'?t\s+exist|is\s+absent|was\s+not\s+found)\b/i.test(
      unsafeText
    );
}

function stripSafeSourceLookupNegations(text = "") {
  return String(text || "").replace(
    /\b(?:this\s+)?does\s+not\s+mean\s+(?:that\s+)?no\s+[^.?!]*(?:law|authority|source|legal\s+basis)[^.?!]*(?:exists?|is\s+available)?/gi,
    ""
  );
}

function misframesSourceLookupEmpty(text = "") {
  const unsafeText = stripSafeSourceLookupNegations(text);
  return /\b(no\s+indexed\s+source|indexed\s+source\s+not\s+found|no\s+indexed\s+authority)\b/i.test(unsafeText) ||
    /\bno\s+(?:legal\s+)?(?:applicable\s+|governing\s+)?authority\s+exists\b/i.test(unsafeText) ||
    /\bno\s+(?:governing\s+)?source\s+exists\b/i.test(unsafeText) ||
    /\bno\s+(?:applicable\s+)?law\s+exists\b/i.test(unsafeText) ||
    /\bno\s+legal\s+basis\s+exists\b/i.test(unsafeText) ||
    /\bthere\s+is\s+no\s+(?:legal\s+)?(?:applicable\s+|governing\s+)?(?:authority|source|law|legal\s+basis)\b/i.test(unsafeText);
}

function buildSaeComplianceResult({
  answer = "",
  finalAnswer = "",
  renderedAnswer = "",
  sources = [],
  sourcesUsed = [],
  visibleSources = [],
  context = {},
  metadata = {}
} = {}) {
  const saeMetadata = resolveSaeMetadata({ ...metadata, ...context });
  const saeStatus = saeMetadata.saeStatus;
  const text = normalizeText([answer, finalAnswer, renderedAnswer].filter(Boolean).join("\n\n"));
  const violations = [];
  const warnings = [];

  if (!saeStatus) {
    return {
      checked: false,
      valid: true,
      saeStatus: "",
      hardFailCount: 0,
      warningCount: 0,
      consumedMetadata: saeMetadata,
      violations,
      warnings
    };
  }

  if (saeStatus === SAE_STATUS.RELATED_AUTHORITY_ONLY) {
    if (!hasRelatedAuthorityLimitationLanguage(text)) {
      violations.push({
        code: "SAE_C1_RELATED_AUTHORITY_LIMITATION_MISSING",
        severity: "hard_fail",
        message: "RELATED_AUTHORITY_ONLY final answer must include limitation language."
      });
    }

    if (presentsRelatedAsControlling(text)) {
      violations.push({
        code: "SAE_C1_RELATED_AUTHORITY_PRESENTED_AS_CONTROLLING",
        severity: "hard_fail",
        message: "RELATED_AUTHORITY_ONLY final answer must not present related/supporting/secondary authority as controlling."
      });
    }

    if (usesControllingStyleForRelatedOnly(text)) {
      violations.push({
        code: "SAE_C1_RELATED_AUTHORITY_CONTROLLING_STYLE",
        severity: "hard_fail",
        message: "RELATED_AUTHORITY_ONLY final answer must not use controlling-style headings or governing-law framing."
      });
    }
  }

  if (saeStatus !== SAE_STATUS.AUTHORITY_FOUND && claimsControllingAuthorityFound(text)) {
    warnings.push({
      code: "SAE_C2_FABRICATED_GOVERNING_AUTHORITY",
      severity: "monitoring",
      message: "Non-AUTHORITY_FOUND final answer appears to claim a controlling/governing authority was found."
    });
  }

  if (SAE_SOURCE_CARD_SUPPRESSED_STATUSES.has(saeStatus)) {
    const sourceCount = safeArray(sources).length + safeArray(sourcesUsed).length + safeArray(visibleSources).length;
    if (sourceCount > 0 || containsSourceCardDisplay(text)) {
      violations.push({
        code: "SAE_C3_SOURCE_CARD_UNDER_SUPPRESSED_STATUS",
        severity: "hard_fail",
        message: "Suppressed SAE status must not display source cards."
      });
    }
  }

  if (saeStatus === SAE_STATUS.SOURCE_PARSE_ERROR && reliesOnParseFailedAuthority(text)) {
    warnings.push({
      code: "SAE_C4_PARSE_FAILED_CONTENT_USED_AS_AUTHORITY",
      severity: "monitoring",
      message: "SOURCE_PARSE_ERROR final answer appears to rely on parse-failed content as authority."
    });
  }

  if (saeStatus === SAE_STATUS.RETRIEVAL_TIMEOUT && treatsTimeoutAsNoLaw(text)) {
    warnings.push({
      code: "SAE_C5_TIMEOUT_TREATED_AS_ABSENCE_OF_LAW",
      severity: "monitoring",
      message: "RETRIEVAL_TIMEOUT final answer appears to treat timeout as absence of law/source."
    });
  }

  if (saeStatus === SAE_STATUS.SOURCE_LOOKUP_EMPTY && misframesSourceLookupEmpty(text)) {
    violations.push({
      code: "SAE_C6_SOURCE_LOOKUP_EMPTY_MISFRAMED",
      severity: "hard_fail",
      message: "SOURCE_LOOKUP_EMPTY final answer must not be framed as NO_INDEXED_SOURCE or legal non-existence."
    });
  }

  return {
    checked: true,
    valid: violations.length === 0,
    saeStatus,
    hardFailCount: violations.length,
    warningCount: warnings.length,
    consumedMetadata: saeMetadata,
    violations,
    warnings
  };
}

function mergeSaeComplianceResults(finalCompliance = {}, draftCompliance = {}) {
  const byCode = new Map();
  const addItems = (items = []) => {
    safeArray(items).forEach((item) => {
      const key = String(item?.code || item?.id || JSON.stringify(item));
      if (!byCode.has(key)) byCode.set(key, item);
    });
  };

  addItems(finalCompliance.violations);
  addItems(draftCompliance.violations);

  const warningByCode = new Map();
  const addWarnings = (items = []) => {
    safeArray(items).forEach((item) => {
      const key = String(item?.code || item?.id || JSON.stringify(item));
      if (!warningByCode.has(key)) warningByCode.set(key, item);
    });
  };

  addWarnings(finalCompliance.warnings);
  addWarnings(draftCompliance.warnings);

  const violations = [...byCode.values()];
  const warnings = [...warningByCode.values()];

  return {
    ...finalCompliance,
    valid: violations.length === 0,
    hardFailCount: violations.length,
    warningCount: warnings.length,
    violations,
    warnings,
    draftChecked: draftCompliance.checked === true
  };
}

function ensureIndexedSourceLimitation({
  answer = "",
  sources = [],
  context = {}
} = {}) {
  // PATCH-017I/017J: when AUTHORITY_FOUND, suppress all limitation injection and strip all renderer placeholders
  const _sae017i = String(context?.saeStatus || "").trim().toUpperCase();
  if (_sae017i === "AUTHORITY_FOUND") {
    let _out = normalizeText(answer);

    // All placeholder patterns to strip — includes PATCH-017I neutral replacements (now themselves defects)
    // and all defaultBodyForHeading() sentinel strings from answer-renderer.js
    const _placeholderPatterns017j = [
      /Refer to the retrieved indexed authority\.?/gi,
      /See the retrieved indexed authority\.?/gi,
      /Refer to applicable implementing regulations\.?/gi,
      /Indexed source not found\.?/gi,
      /No legal basis was rendered\.?/gi,
      /No supporting rules were rendered\.?/gi,
      /No legal basis exists\.?/gi,
      /No supporting rules exist\.?/gi,
      /Consult the applicable provision and implementing regulation before relying on this answer\.?/gi,
      /Refer to the relevant provision of the NIRC as amended\.?/gi,
      /The implementing regulation applies\. Refer to the relevant Revenue Regulation for operational details\.?/gi,
      /Please refer to the applicable NIRC provision for the statutory definition\.?/gi,
      /Verify the latest indexed authority before relying on the answer\.?/gi,
      /Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position\.?/gi,
      /Implementing regulations applicable to this provision are pending index verification\.?/gi,
    ];

    let _blockedCount = 0;
    for (const _pat of _placeholderPatterns017j) {
      const _before = _out;
      _out = _out.replace(_pat, "");
      if (_out !== _before) _blockedCount++;
    }

    if (_blockedCount > 0) {
      console.log("[PATCH-017J]", {
        marker:  "PATCH_017J_AUTHORITY_FOUND_PLACEHOLDER_BLOCKED",
        saeStatus: _sae017i,
        patternsBlocked: _blockedCount
      });
    }

    // Collapse blank lines left by placeholder removal
    const _outRaw = _out;
    _out = _out.replace(/\n{3,}/g, "\n\n").trim();
    if (_out !== _outRaw.trim()) {
      console.log("[PATCH-017J]", { marker: "PATCH_017J_AUTHORITY_FOUND_BODY_SANITIZED", saeStatus: _sae017i });
    }

    return _out;
  }

  const hasSources = safeArray(sources).some((source) =>
    sourceAllowed(source, context)
  );

  let output = normalizeText(answer);

  const pendingLabel = "(Framework knowledge — pending index verification)";
  output = output
    .replace(/No legal basis was rendered\./gi, hasSources ? "Indexed source requires verification." : pendingLabel)
    .replace(/No supporting rules were rendered\./gi, hasSources ? "Indexed source requires verification." : pendingLabel)
    .replace(/No legal basis exists\./gi, pendingLabel)
    .replace(/No supporting rules exist\./gi, pendingLabel)
    .replace(/Indexed source not found\.?/gi, pendingLabel);

  // Do not append a fallback footer — framework-knowledge answers are substantive.

  return output.trim();
}

function buildComplianceWarnings({
  structureValidation = {},
  sourceGroundingValidation = {},
  conflictValidation = {},
  hierarchyValidation = {},
  hiddenSourceWarnings = []
} = {}) {
  return [
    structureValidation.warning,
    sourceGroundingValidation.warning,
    conflictValidation.warning,
    ...(hierarchyValidation.warnings || []),
    ...safeArray(hiddenSourceWarnings)
  ].filter(Boolean);
}

function sanitizeDraftAnswer(text = "", conflictMetadata = null) {
  return sanitizeConflictSection(
    sanitizeRawDebugLeakage(text),
    conflictMetadata
  );
}

/**
 * Narrow compliance path for /ask research profile answers.
 *
 * Runs all content-safety safeguards WITHOUT A-F structural repair:
 *   1. Debug/metadata leakage removal
 *   2. Framework-knowledge / source-limitation labels
 *   3. Prohibited phrase redaction
 *   4. Source grounding validation (unsupported citations → warnings)
 *   5. Authority hierarchy display validation
 *
 * Returns complianceStatus "ASK_PROFILE_COMPLIANT" (clean) or
 * "ASK_PROFILE_LIMITED_COMPLIANCE" (warnings present).
 * Does NOT return "BYPASS" — safeguards are always enforced.
 */
function enforceAskProfileCompliance(args = {}) {
  const draft      = args.draftAnswer || args.answer || "";
  const askProfile = args.responsePlan.askProfile;

  const context = {
    query:               args.query               || "",
    issueClassification: args.issueClassification || null,
    mode:                args.mode                || null,
    reviewMode:          false,
    includeHiddenSources: false,
    saeStatus:           args.saeStatus,
    sourceAvailability:  args.sourceAvailability,
    sourceAvailabilityMetadata: args.sourceAvailabilityMetadata,
    limitationRequired:  args.limitationRequired,
    disclosureType:      args.disclosureType,
    statusReason:        args.statusReason || args.sourceAvailabilityReason
  };

  const allSources = uniqueDocs([
    ...safeArray(args.sourcesUsed),
    ...safeArray(args.sources),
    ...safeArray(args.retrievedSources)
  ]);
  const visibleSources = allSources.filter(s => sourceAllowed(s, context));

  // Step 1: debug / metadata leakage removal
  let output = sanitizeRawDebugLeakage(draft);

  // Step 2: normalize framework-knowledge / pending-index labels
  output = ensureIndexedSourceLimitation({ answer: output, sources: visibleSources, context });

  // Step 3: prohibited phrase redaction
  output = redactProhibitedPhrases(output);
  const prohibitedCheck = enforceProhibitedPhrases(output);

  // Step 4: source grounding validation — unsupported citations become warnings
  const sourceGroundingValidation = validateSourceGrounding({ answer: output, sources: visibleSources, context });

  // Step 5: authority hierarchy display validation
  const hierarchyValidation = enforceAuthorityHierarchyDisplay({ answer: output, sources: visibleSources, context });

  const saeCompliance = buildSaeComplianceResult({
    answer: output,
    sources: visibleSources,
    sourcesUsed: visibleSources,
    visibleSources,
    context
  });

  const warnings = [
    sourceGroundingValidation.warning,
    ...(hierarchyValidation.warnings || []),
    ...saeCompliance.warnings.map((item) => `${item.code}: ${item.message}`)
  ].filter(Boolean);

  if (!prohibitedCheck.passed) {
    warnings.push(`PROHIBITED_PHRASES_DETECTED: ${prohibitedCheck.violations.join(", ")}`);
  }

  const complianceStatus = saeCompliance.valid
    ? warnings.length ? "ASK_PROFILE_LIMITED_COMPLIANCE" : "ASK_PROFILE_COMPLIANT"
    : "ASK_PROFILE_FAILED";

  return {
    success:          saeCompliance.valid,
    answer:           output,
    finalAnswer:      output,
    sources:          visibleSources,
    sourcesUsed:      visibleSources,
    citations:        [],
    legalBasis:       [],
    complianceStatus,
    warnings,
    metadata: {
      askProfile,
      bypassStructuralRepair:              true,
      finalAnswerComplianceVersion:        ENGINE_VERSION,
      finalGateOnly:                       true,
      noOpenAICalls:                       true,
      noRetrieval:                         true,
      sourceGroundingValidation,
      hierarchyValidation,
      saeCompliance,
      prohibitedPhraseCheck:               prohibitedCheck,
      masterPromptAuthorityHierarchyApplied:        true,
      courtAuthorityNotSubordinatedToBIRIssuances:  true
    },
    saeCompliance,
    saeViolations: saeCompliance.violations,
    saeWarnings:   saeCompliance.warnings,
    confidence:   saeCompliance.valid ? warnings.length ? "LIMITED" : "PASSED" : "FAILED",
    sourceStatus: {
      hasVisibleSources:      visibleSources.length > 0,
      visibleSourceCount:     visibleSources.length,
      indexedSourceLimitation: visibleSources.length === 0
        ? "Framework knowledge — pending index verification"
        : null
    },
    authorityValidation: null,
    conflictValidation:  null,
    version:          ENGINE_VERSION,
    finalGateOnly:    true,
    noOpenAICalls:    true,
    noPromptAssembly: true,
    noRetrieval:      true
  };
}

function finalizeCompliance({
  answer = "",
  visibleSources = [],
  context = {},
  conflictValidation = {},
  requiredSections = null
} = {}) {
  let output = sanitizeRawDebugLeakage(answer);
  output = sanitizeConflictSection(output, conflictValidation.bestConflict || null);
  output = ensureIndexedSourceLimitation({
    answer: output,
    sources: visibleSources,
    context
  });

  const structureValidation = validateFinalAnswerStructure({
    answer: output,
    requiredSections,
    context
  });

  const sourceGroundingValidation = validateSourceGrounding({
    answer: output,
    sources: visibleSources,
    context
  });

  const hierarchyValidation = enforceAuthorityHierarchyDisplay({
    answer: output,
    sources: visibleSources,
    context
  });

  // BUG-012: Redact before checking so violations are removed from the final answer.
  output = redactProhibitedPhrases(output);
  const prohibitedPhraseCheck = enforceProhibitedPhrases(output);

  const warnings = buildComplianceWarnings({
    structureValidation,
    sourceGroundingValidation,
    conflictValidation,
    hierarchyValidation
  });

  const saeCompliance = buildSaeComplianceResult({
    answer: output,
    sources: visibleSources,
    sourcesUsed: visibleSources,
    visibleSources,
    context
  });

  warnings.push(
    ...saeCompliance.warnings.map((item) => `${item.code}: ${item.message}`)
  );

  if (!prohibitedPhraseCheck.passed) {
    warnings.push(
      `PROHIBITED_PHRASES_DETECTED: ${prohibitedPhraseCheck.violations.join(", ")}`
    );
  }

  return {
    answer: output,
    finalAnswer: output,
    complianceStatus: saeCompliance.valid
      ? warnings.length ? "PASSED_WITH_WARNINGS" : "PASSED"
      : "FAILED",
    warnings,
    saeCompliance,
    saeViolations: saeCompliance.violations,
    saeWarnings: saeCompliance.warnings,
    metadata: {
      finalAnswerComplianceVersion: ENGINE_VERSION,
      finalGateOnly: true,
      noOpenAICalls: true,
      noRetrieval: true,
      structureValidation,
      sourceGroundingValidation,
      hierarchyValidation,
      conflictValidation,
      saeCompliance,
      prohibitedPhraseCheck,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true
    },
    sourceStatus: {
      hasVisibleSources: visibleSources.length > 0,
      visibleSourceCount: visibleSources.length,
      indexedSourceLimitation:
        visibleSources.length === 0 ? "Framework knowledge — pending index verification" : null
    }
  };
}

function buildFinalCompliantAnswer({
  draftAnswer = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  sources = [],
  retrievedSources = [],
  citations = [],
  legalBasis = [],
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  authorityValidation = null,
  conflictValidation = null,
  professionalInsight = "",
  asOfDate = new Date(),
  query = "",
  issueClassification = null,
  mode = null,
  orchestrationMode = null,
  responseMode = null,
  contextMode = null,
  requiredAnswerSections = null,
  answerStructure = null,
  returnObject = false,
  reviewMode = false,
  includeHiddenSources = false,
  suppressSourceAppendix = false,
  saeStatus = null,
  sourceAvailability = null,
  sourceAvailabilityMetadata = null,
  limitationRequired = null,
  disclosureType = null,
  statusReason = null,
  sourceAvailabilityReason = null
} = {}) {
  const context = {
    query,
    originalQuery: query,
    issueClassification,
    mode,
    orchestrationMode,
    responseMode,
    contextMode,
    requiredAnswerSections,
    answerStructure,
    reviewMode,
    includeHiddenSources,
    saeStatus,
    sourceAvailability,
    sourceAvailabilityMetadata,
    limitationRequired,
    disclosureType,
    statusReason: statusReason || sourceAvailabilityReason
  };

  if (
    isSystemFallbackAnswer(draftAnswer) ||
    isSystemFallbackAnswer(fallbackAnswer) ||
    normalizeMode(orchestrationMode || contextMode || mode) === RESPONSE_MODE.EMERGENCY_TRIM
  ) {
    const fallbackFinal = preserveSystemFallbackAnswer({
      draftAnswer,
      fallbackAnswer,
      sourcesUsed,
      legalBasisDocs
    }).trim();

    const result = finalizeCompliance({
      answer: fallbackFinal,
      visibleSources: visibleCandidateSources({
        ...context,
        legalBasisDocs,
        sourcesUsed,
        sources,
        retrievedSources,
        citations,
        legalBasis
      }),
      context,
      conflictValidation: validateConflictLabel({
        answer: fallbackFinal,
        conflicts,
        hierarchyConflict,
        conflict,
        conflictReview,
        jurisprudencePayload,
        authorityValidation,
        conflictValidation
      }),
      requiredSections: requiredAnswerSections || answerStructure || null
    });

    return returnObject ? result : result.answer;
  }

  const explicitMode =
    mode ||
    orchestrationMode ||
    responseMode ||
    contextMode ||
    issueClassification?.responseMode ||
    issueClassification?.orchestrationClassification?.mode;

  const subIssueGatedMode =
    !explicitMode &&
    (
      issueClassification?.subIssue === "VAT_DEFINITION" ||
      String(issueClassification?.retrievalStrategy || "").includes("FAST_DEFINITION") ||
      String(issueClassification?.retrievalStrategy || "").includes("VAT_DEFINITION")
    )
      ? RESPONSE_MODE.FAST_DEFINITION
      : null;

  const finalMode = normalizeMode(explicitMode || subIssueGatedMode || RESPONSE_MODE.DEFAULT_AF);

  const bestConflict = pickBestConflict({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    authorityValidation,
    conflictValidation
  });

  const rawSanitizedDraft = sanitizeDraftAnswer(draftAnswer, bestConflict);
  const sanitizedDraft = normalizeLegacyHeadingsToAF(rawSanitizedDraft);

  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    visibleSourceDocs
  } = resolveVisibleSources({
    legalBasisDocs,
    sourcesUsed,
    sources,
    retrievedSources,
    citations,
    legalBasis,
    asOfDate,
    query,
    issueClassification,
    context
  });
  const draftSaeCompliance = buildSaeComplianceResult({
    answer: rawSanitizedDraft || draftAnswer,
    sources: visibleSourceDocs,
    sourcesUsed: visibleSourceDocs,
    visibleSources: visibleSourceDocs,
    context
  });

  let finalAnswer;

  if (
    finalMode === RESPONSE_MODE.FAST_DEFINITION ||
    finalMode === RESPONSE_MODE.EMERGENCY_TRIM
  ) {
    finalAnswer = buildFastDefinitionAnswer({
      sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs
    });
  } else if (finalMode === RESPONSE_MODE.STANDARD_TAX) {
    finalAnswer = buildStandardTaxAnswer({
      sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs,
      jurisprudencePayload,
      professionalInsight
    });
  } else if (
    finalMode === RESPONSE_MODE.COMPLEX_ADVISORY ||
    finalMode === RESPONSE_MODE.AUDIT_FACT_PATTERN
  ) {
    // Audit/advisory mode is adaptive — pass through the sanitized draft without
    // enforcing a rigid section structure. The audit system prompt owns the format.
    finalAnswer = sanitizedDraft ||
      fallbackAnswer ||
      directAnswer ||
      "The conclusion depends on the final facts and supporting documents. Please provide the specific details of the audit scenario.";
  } else {
    if (hasRequiredStructure(sanitizedDraft, requiredSectionsFromContext(context))) {
      finalAnswer = sanitizeConflictSection(sanitizedDraft, bestConflict);
    } else if (hasAnyAFStructure(sanitizedDraft)) {
      finalAnswer = repairMissingAFSections({
        answer: sanitizedDraft,
        fallbackAnswer,
        directAnswer,
        legalBasisDocs: resolvedLegalBasisDocs,
        conflicts,
        hierarchyConflict,
        conflict,
        conflictReview,
        jurisprudencePayload,
        professionalInsight,
        supersessionResult,
        authorityValidation,
        conflictValidation
      });
    } else {
      finalAnswer = rebuildAFAnswer({
        sanitizedDraft,
        fallbackAnswer,
        directAnswer,
        legalBasisDocs: resolvedLegalBasisDocs,
        conflicts,
        hierarchyConflict,
        conflict,
        conflictReview,
        jurisprudencePayload,
        professionalInsight,
        supersessionResult,
        authorityValidation,
        conflictValidation
      });
    }
  }

  const conflictCheck = validateConflictLabel({
    answer: finalAnswer,
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    authorityValidation,
    conflictValidation
  });

  const compliant = finalizeCompliance({
    answer: finalAnswer,
    visibleSources: visibleSourceDocs,
    context,
    conflictValidation: conflictCheck,
    requiredSections: requiredAnswerSections || answerStructure || null
  });
  const mergedSaeCompliance = mergeSaeComplianceResults(
    compliant.saeCompliance,
    draftSaeCompliance
  );
  const mergedSaeWarningMessages = mergedSaeCompliance.warnings.map(
    (item) => `${item.code}: ${item.message}`
  );
  const compliantWithSae = {
    ...compliant,
    complianceStatus: mergedSaeCompliance.valid
      ? compliant.complianceStatus
      : "FAILED",
    warnings: [
      ...safeArray(compliant.warnings).filter((warning) => !String(warning).startsWith("SAE_")),
      ...mergedSaeWarningMessages
    ],
    saeCompliance: mergedSaeCompliance,
    saeViolations: mergedSaeCompliance.violations,
    saeWarnings: mergedSaeCompliance.warnings,
    metadata: {
      ...compliant.metadata,
      saeCompliance: mergedSaeCompliance
    }
  };

  // suppressSourceAppendix: skip text-block append when the caller renders
  // source chips/cards separately (pipeline Step 17 and rag-answer-handler).
  const finalWithSources = suppressSourceAppendix
    ? compliantWithSae.answer
    : appendValidatedSourceAppendix(compliantWithSae.answer, visibleSourceDocs);

  const finalResult = {
    ...compliantWithSae,
    answer: finalWithSources.trim(),
    finalAnswer: finalWithSources.trim(),
    sources: visibleSourceDocs,
    sourcesUsed: visibleSourceDocs,
    legalBasis: resolvedLegalBasisDocs,
    citations: extractCitationsFromText(finalWithSources),
    confidence:
      visibleSourceDocs.length > 0
        ? "SOURCE_GROUNDED"
        : "INDEXED_SOURCE_NOT_FOUND",
    saeCompliance: compliantWithSae.saeCompliance,
    saeViolations: compliantWithSae.saeViolations,
    saeWarnings: compliantWithSae.saeWarnings,
    authorityValidation: {
      hierarchyValidation: compliantWithSae.metadata.hierarchyValidation,
      sourceGroundingValidation: compliantWithSae.metadata.sourceGroundingValidation,
      saeCompliance: compliantWithSae.metadata.saeCompliance,
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true
    },
    conflictValidation: conflictCheck
  };

  return returnObject ? finalResult : finalResult.answer;
}

function enforceFinalAnswerCompliance(args = {}) {
  // /ask research profiles: run content-safety safeguards without A-F structural
  // repair.  enforceAskProfileCompliance validates citations, hierarchy, debug
  // leakage, and prohibited phrases while preserving the profile section headings.
  if (args.responsePlan?.askProfile) {
    return enforceAskProfileCompliance(args);
  }

  // Non-A-F modes must pass through without reformatting.
  // These modes own their own output structure; A-F enforcement must not touch them.
  const rawMode = String(args.mode || args.orchestrationMode || "").toUpperCase();
  if (
    rawMode === "QUIZ_MODE" ||
    rawMode === "QUIZ" ||
    rawMode === "DIAGNOSTIC_QUIZ_MODE" ||
    rawMode === "DIAGNOSTIC" ||
    rawMode === "REVIEWER_MODE" ||
    rawMode === "REVIEWER" ||
    rawMode === "CASE_ANALYSIS" ||
    rawMode === "CASE" ||
    rawMode === "SOURCE_LOOKUP" ||
    rawMode === "SOURCE" ||
    rawMode === "SOURCE_FINDER" ||
    rawMode === "DEBUG_MODE" ||
    rawMode === "DEBUG" ||
    rawMode === "DEBUGGING" ||
    rawMode === "CODE_PATCH_MODE" ||
    rawMode === "CODE_PATCH" ||
    rawMode === "LEARNING_PROGRESS_MODE" ||
    rawMode === "LEARNING_PROGRESS" ||
    rawMode === "FEEDBACK_CAPTURE_MODE" ||
    rawMode === "FEEDBACK_CAPTURE" ||
    rawMode === "FEEDBACK" ||
    rawMode === "COMPLEX_ADVISORY" ||
    rawMode === "AUDIT_FACT_PATTERN" ||
    rawMode === "AUDIT_MODE" ||
    rawMode === "AUDIT"
  ) {
    const passthrough = args.draftAnswer || args.answer || "";
    const saeCompliance = buildSaeComplianceResult({
      answer: passthrough,
      sources: args.sources || [],
      sourcesUsed: args.sourcesUsed || [],
      visibleSources: uniqueDocs([
        ...safeArray(args.sources),
        ...safeArray(args.sourcesUsed),
        ...safeArray(args.retrievedSources)
      ]),
      context: {
        mode: args.mode,
        orchestrationMode: args.orchestrationMode,
        saeStatus: args.saeStatus,
        sourceAvailability: args.sourceAvailability,
        sourceAvailabilityMetadata: args.sourceAvailabilityMetadata,
        limitationRequired: args.limitationRequired,
        disclosureType: args.disclosureType,
        statusReason: args.statusReason || args.sourceAvailabilityReason
      }
    });
    const saeWarningMessages = saeCompliance.warnings.map(
      (item) => `${item.code}: ${item.message}`
    );

    return {
      success: saeCompliance.valid,
      answer: passthrough,
      finalAnswer: passthrough,
      sources: args.sources || [],
      sourcesUsed: args.sourcesUsed || [],
      citations: [],
      legalBasis: [],
      complianceStatus: saeCompliance.valid ? "BYPASSED_NON_AF_MODE" : "FAILED",
      warnings: saeWarningMessages,
      metadata: {
        bypassReason: `${rawMode.toLowerCase()}_no_AF_enforcement`,
        saeCompliance
      },
      saeCompliance,
      saeViolations: saeCompliance.violations,
      saeWarnings: saeCompliance.warnings,
      confidence: saeCompliance.valid ? "BYPASS" : "FAILED",
      sourceStatus: "BYPASS",
      authorityValidation: null,
      conflictValidation: null,
      version: ENGINE_VERSION,
      finalGateOnly: true,
      noOpenAICalls: true,
      noPromptAssembly: true,
      noRetrieval: true
    };
  }

  const finalResult = buildFinalCompliantAnswer({
    draftAnswer: args.draftAnswer || args.answer,
    fallbackAnswer: args.fallbackAnswer,
    legalBasisDocs: args.legalBasisDocs,
    sourcesUsed: args.sourcesUsed,
    sources: args.sources,
    retrievedSources: args.retrievedSources,
    citations: args.citations,
    legalBasis: args.legalBasis,
    conflicts: args.conflicts,
    hierarchyConflict: args.hierarchyConflict,
    conflict: args.conflict,
    conflictReview: args.conflictReview,
    jurisprudencePayload: args.jurisprudencePayload,
    authorityValidation: args.authorityValidation,
    conflictValidation: args.conflictValidation,
    professionalInsight: args.professionalInsight,
    asOfDate: args.asOfDate || new Date(),
    query: args.query,
    issueClassification: args.issueClassification,
    mode: args.mode,
    orchestrationMode: args.orchestrationMode,
    responseMode: args.responseMode,
    contextMode: args.contextMode,
    requiredAnswerSections: args.requiredAnswerSections,
    answerStructure: args.answerStructure,
    returnObject: true,
    saeStatus: args.saeStatus,
    sourceAvailability: args.sourceAvailability,
    sourceAvailabilityMetadata: args.sourceAvailabilityMetadata,
    limitationRequired: args.limitationRequired,
    disclosureType: args.disclosureType,
    statusReason: args.statusReason,
    sourceAvailabilityReason: args.sourceAvailabilityReason,
    // Pipeline Step 17 renders source chips; text appendix is redundant and
    // gets stripped by the Step 17 regex anyway — suppress at the source.
    suppressSourceAppendix: true
  });

  return {
    success: finalResult.saeCompliance?.valid !== false,
    answer: finalResult.answer,
    finalAnswer: finalResult.finalAnswer,
    sources: finalResult.sources,
    sourcesUsed: finalResult.sourcesUsed,
    citations: finalResult.citations,
    legalBasis: finalResult.legalBasis,
    complianceStatus: finalResult.complianceStatus,
    warnings: finalResult.warnings,
    metadata: finalResult.metadata,
    confidence: finalResult.confidence,
    sourceStatus: finalResult.sourceStatus,
    saeCompliance: finalResult.saeCompliance,
    saeViolations: finalResult.saeViolations,
    saeWarnings: finalResult.saeWarnings,
    authorityValidation: finalResult.authorityValidation,
    conflictValidation: finalResult.conflictValidation,
    version: ENGINE_VERSION,
    finalGateOnly: true,
    fallbackPreservationEnabled: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noRetrieval: true
  };
}

function finalAnswerComplianceHealthCheck() {
  return {
    ok: true,
    engine: "TINA_FINAL_ANSWER_COMPLIANCE",
    version: ENGINE_VERSION,
    finalGateOnly: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noRetrieval: true,
    noReranking: true,
    noNewLegalAnalysisGeneration: true,
    fallbackPreservationEnabled: true,
    fallbackReformattingPrevented: true,
    defaultAFStructureCompatible: true,
    simpleDefinitionStructureCompatible: true,
    auditFactPatternStructureCompatible: true,
    taxEngineRequiredSectionsAware: true,
    sourceGroundingValidationEnabled: true,
    citationSupportValidationEnabled: true,
    saeComplianceValidationEnabled: true,
    saeHardFailStatusesEnabled: true,
    saeMonitoringWarningsEnabled: true,
    authorityHierarchyDisplayValidationEnabled: true,
    hiddenSourceLeakagePreventionEnabled: true,
    reviewSourceSuppressionEnabled: true,
    rawDebugLeakageSanitizerEnabled: true,
    conflictSanitizerCompatible: true,
    conflictMetadataCompleteGate: true,
    supersessionPreflightCompatible: true,
    issueClassificationCompatible: true,
    sourceVisibilityCompatible: true,
    jurisprudencePayloadCompatible: true,
    contextOrchestrationCompatible: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    compactFinalAnswerOutput: true
  };
}

export {
  ENGINE_VERSION,
  RESPONSE_MODE,
  TINA_AF_HEADINGS,
  DEFAULT_AF_HEADINGS,
  SIMPLE_DEFINITION_HEADINGS,
  AUDIT_FACT_PATTERN_HEADINGS,
  buildFinalCompliantAnswer,
  enforceFinalAnswerCompliance,
  finalAnswerComplianceHealthCheck,
  sanitizeDraftAnswer,
  hasCompleteAFStructure,
  hasAnyAFStructure,
  hasRequiredStructure,
  isSystemFallbackAnswer,
  preserveSystemFallbackAnswer,
  sanitizeConflictSection,
  sanitizeRawDebugLeakage,
  buildSupportingRules,
  conflictMetadataIsComplete,
  normalizeMode,
  validateFinalAnswerStructure,
  validateSourceGrounding,
  validateCitationSupport,
  validateConflictLabel,
  buildSaeComplianceResult,
  enforceAuthorityHierarchyDisplay,
  ensureIndexedSourceLimitation,
  buildComplianceWarnings
};

export default {
  sanitizeDraftAnswer,
  sanitizeConflictSection,
  sanitizeRawDebugLeakage,
  buildFinalCompliantAnswer,
  enforceFinalAnswerCompliance,
  finalAnswerComplianceHealthCheck,
  validateFinalAnswerStructure,
  validateSourceGrounding,
  buildSaeComplianceResult,
  validateCitationSupport,
  validateConflictLabel,
  enforceAuthorityHierarchyDisplay,
  ensureIndexedSourceLimitation,
  buildComplianceWarnings,
  isSystemFallbackAnswer,
  preserveSystemFallbackAnswer,
  normalizeMode
};
