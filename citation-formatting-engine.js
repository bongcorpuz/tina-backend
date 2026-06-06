// FILE: citation-formatting-engine.js
"use strict";

/**
 * TINA Enterprise Citation Formatting Engine
 * Version: 5.0.0
 *
 * Role:
 * - Philippine legal/tax citation normalization
 * - compact answer citation formatting
 * - authority label formatting
 * - hierarchy-aware citation display
 * - controlling/supporting/persuasive/secondary grouping
 * - source deduplication
 *
 * Boundary:
 * - No OpenAI calls
 * - No retrieval
 * - No reranking
 * - No legal reasoning
 * - No final-answer generation
 * - No replacement for authority-engine.js
 * - No replacement for provision-citation-engine.js
 */

const ENGINE_VERSION = "5.0.0";

const MAX_CITATIONS = 5;
const MAX_GROUPED_CITATIONS = 8;
const MAX_EXCERPT_CHARS = 280;
const MAX_TITLE_CHARS = 260;

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

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  ADMINISTRATIVE_GUIDANCE: 11,
  TECHNICAL_GUIDANCE: 11,
  BOC_ISSUANCE: 11,
  LGU_ORDINANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_ISSUANCE: 11,
  SEC_GUIDANCE: 11,

  OECD: 12,
  FOREIGN_AUTHORITY: 12,

  PFRS: 13,
  PAS: 13,
  PSA: 13,

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
});

const AUTHORITY_LABELS = Object.freeze({
  CONSTITUTION: "Constitution",
  STATUTE: "Statute / Tax Code / Republic Act",
  NIRC: "NIRC / Tax Code",
  TAX_CODE: "NIRC / Tax Code",
  REPUBLIC_ACT: "Republic Act",
  RA: "Republic Act",
  CMTA: "CMTA",
  LGC: "Local Government Code",

  TAX_TREATY: "Tax Treaty",
  TREATY: "Tax Treaty",

  SUPREME_COURT_EN_BANC: "Supreme Court En Banc Decision",
  SUPREME_COURT: "Supreme Court Decision",
  SC: "Supreme Court Decision",
  JURISPRUDENCE: "Jurisprudence",

  CTA_EN_BANC: "CTA En Banc Decision",
  CTA_DIVISION: "CTA Division Decision",
  CTA: "CTA Decision",

  RR: "Revenue Regulation",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",

  BIR_RULING: "BIR Ruling",

  ADMINISTRATIVE_GUIDANCE: "Administrative / Technical Guidance",
  TECHNICAL_GUIDANCE: "Administrative / Technical Guidance",
  BOC_ISSUANCE: "BOC Issuance",
  LGU_ORDINANCE: "LGU Ordinance",
  FIRB_ISSUANCE: "FIRB Issuance",
  PEZA_ISSUANCE: "PEZA Issuance",
  SEC_GUIDANCE: "SEC Guidance",

  OECD: "OECD / Foreign Persuasive Authority",
  FOREIGN_AUTHORITY: "Foreign Persuasive Authority",

  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",

  CPA_NOTES: "CPA Notes",
  REVIEW_MATERIALS: "Review Material",
  SECONDARY: "Secondary Material",

  UNKNOWN: "Unknown Authority"
});

const GROUP_LABELS = Object.freeze({
  CONTROLLING: "CONTROLLING LEGAL BASIS",
  STATUTES: "STATUTES / TAX CODE / REPUBLIC ACTS",
  TREATIES: "TAX TREATIES",
  JURISPRUDENCE: "SUPPORTING JURISPRUDENCE",
  REGULATIONS: "REVENUE REGULATIONS",
  ADMINISTRATIVE: "ADMINISTRATIVE ISSUANCES",
  BIR_RULINGS: "BIR RULINGS",
  TECHNICAL: "TECHNICAL / PERSUASIVE AUTHORITIES",
  SECONDARY: "SECONDARY / REVIEW MATERIALS",
  OTHER: "OTHER SOURCES"
});

const SECONDARY_AUTHORITY_TYPES = Object.freeze([
  "CPA_NOTES",
  "REVIEW_MATERIALS",
  "SECONDARY"
]);

const PERSUASIVE_AUTHORITY_TYPES = Object.freeze([
  "OECD",
  "FOREIGN_AUTHORITY",
  "PFRS",
  "PAS",
  "PSA",
  "TECHNICAL_GUIDANCE",
  "ADMINISTRATIVE_GUIDANCE"
]);

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function trimText(value = "", max = 500) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
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

function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

function normalizeAuthorityCode(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    NATIONAL_INTERNAL_REVENUE_CODE: "STATUTE",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",
    DOUBLE_TAX_AGREEMENT: "TREATY",

    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    COURT_CASES: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_CASE: "CTA_DIVISION",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",

    RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    BOC: "BOC_ISSUANCE",
    LGU: "LGU_ORDINANCE",
    FIRB: "FIRB_ISSUANCE",
    PEZA: "PEZA_ISSUANCE",
    SEC: "SEC_GUIDANCE",

    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS",
    REVIEWER: "REVIEW_MATERIALS",
    SECONDARY_SOURCE: "SECONDARY"
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

  if (!raw) return null;

  return normalizeAuthorityCode(raw);
}

function authorityLabelOf(source = {}) {
  return (
    source.authorityLabel ||
    source.authority_label ||
    source.metadata?.authorityLabel ||
    source.metadata?.authority_label ||
    authorityTypeOf(source) ||
    "UNKNOWN"
  );
}

function normalizeAuthorityLabel(value = "") {
  const code = normalizeAuthorityCode(value);
  return AUTHORITY_LABELS[code] || compactSpaces(value) || "Unknown Authority";
}

function hierarchyLevelForAuthorityType(authorityType = "UNKNOWN") {
  const code = normalizeAuthorityCode(authorityType);
  return Number(AUTHORITY_HIERARCHY[code] || AUTHORITY_HIERARCHY.UNKNOWN);
}

function authorityLevelOf(source = {}) {
  const explicit = Number(
    source.authorityLevel ??
      source.authority_level ??
      source.metadata?.authorityLevel ??
      source.metadata?.authority_level
  );

  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  return hierarchyLevelForAuthorityType(authorityTypeOf(source) || "UNKNOWN");
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

function titleOf(source = {}) {
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

function pathOf(source = {}) {
  return (
    source.sourcePath ||
    source.source_path ||
    source.folderPath ||
    source.folder_path ||
    source.path ||
    source.url ||
    source.sourceUrl ||
    source.source_url ||
    source.metadata?.folderPath ||
    source.metadata?.folder_path ||
    source.metadata?.path ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    null
  );
}

function sectionOf(source = {}) {
  return (
    source.sectionLabel ||
    source.section_label ||
    source.section ||
    source.provision ||
    source.provisionCitation ||
    source.provision_citation ||
    source.sectionLabelText ||
    source.metadata?.sectionLabel ||
    source.metadata?.section_label ||
    source.metadata?.provision ||
    source.metadata?.provisionCitation ||
    null
  );
}

function driveViewUrlOf(source = {}) {
  return (
    source.driveViewUrl ||
    source.drive_view_url ||
    source.url ||
    source.sourceUrl ||
    source.source_url ||
    source.metadata?.driveViewUrl ||
    source.metadata?.drive_view_url ||
    source.metadata?.url ||
    null
  );
}

function fileIdOf(source = {}) {
  return (
    source.fileId ||
    source.file_id ||
    source.id ||
    source.metadata?.fileId ||
    source.metadata?.file_id ||
    null
  );
}

function excerptOf(source = {}, maxLength = MAX_EXCERPT_CHARS) {
  const raw =
    source.excerpt ||
    source.preview ||
    source.text ||
    source.content ||
    source.doctrineSummary ||
    source.caseApplicabilityExplanation ||
    source.metadata?.excerpt ||
    "";

  return trimText(raw, maxLength);
}

function cleanSourceTitle(value = "") {
  return trimText(
    compactSpaces(String(value || ""))
      .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    MAX_TITLE_CHARS
  );
}

function cleanSectionLabel(value = "") {
  return trimText(
    compactSpaces(value)
      .replace(/^provision:\s*/i, "")
      .replace(/^section:\s*/i, ""),
    160
  );
}

function rawCitationBlob(source = {}) {
  return compactSpaces(
    [
      source.issuanceNumber,
      source.issuance_number,
      source.displayTitle,
      source.reference,
      source.citation,
      source.normalizedReference,
      source.normalized_reference,
      source.metadata?.normalizedReference,
      source.metadata?.normalized_reference,
      source.metadata?.citation,
      source.title,
      source.sourceTitle,
      source.source_title,
      source.documentTitle,
      source.document_title,
      source.source,
      source.originalSource,
      source.original_source,
      source.path,
      source.metadata?.path,
      source.metadata?.documentTitle,
      source.metadata?.originalFileName
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function normalizeAuthorityReference(value = "") {
  const raw = compactSpaces(value);
  if (!raw) return "";

  const patterns = [
    {
      regex: /\b(?:Revenue\s+Regulation[s]?|RR)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i,
      formatter: (m) => `RR ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\b(?:Revenue\s+Memorandum\s+Circular[s]?|RMC)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMC ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\b(?:Revenue\s+Memorandum\s+Order[s]?|RMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMO ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\b(?:Revenue\s+Audit\s+Memorandum\s+Order[s]?|RAMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i,
      formatter: (m) => `RAMO ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\b(?:Republic\s+Act|RA|R\.A\.)\s*(?:No\.?)?\s*0*(\d{4,6})\b/i,
      formatter: (m) => `RA ${m[1]}`
    },
    {
      regex: /\b(?:NIRC|National\s+Internal\s+Revenue\s+Code)?\s*(?:Sec\.?|Section)\s*([0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:NIRC|Tax\s+Code)?\b/i,
      formatter: (m) => `NIRC Sec. ${m[1]}`
    },
    {
      regex: /\b(?:CMTA|Customs\s+Modernization\s+and\s+Tariff\s+Act)?\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:CMTA)?\b/i,
      formatter: (m) => `CMTA Sec. ${m[1]}`
    },
    {
      regex: /\b(?:LGC|Local\s+Government\s+Code)?\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\s*,?\s*(?:LGC)?\b/i,
      formatter: (m) => `LGC Sec. ${m[1]}`
    },
    {
      regex: /\bBIR\s+Ruling\s*(?:No\.?)?\s*([\w./()-]+)\b/i,
      formatter: (m) => `BIR Ruling ${m[1]}`
    },
    {
      regex: /\bG\.?\s*R\.?\s*No\.?\s*([\w.-]+)\b/i,
      formatter: (m) => `G.R. No. ${m[1]}`
    },
    {
      regex: /\bCTA\s*(?:EB|En\s+Banc)\s*(?:No\.?)?\s*([\w.-]+)\b/i,
      formatter: (m) => `CTA EB No. ${m[1]}`
    },
    {
      regex: /\bCTA\s*(?:Case)?\s*(?:No\.?)?\s*([\w.-]+)\b/i,
      formatter: (m) => `CTA Case No. ${m[1]}`
    }
  ];

  for (const item of patterns) {
    const match = raw.match(item.regex);
    if (match) return compactSpaces(item.formatter(match));
  }

  return cleanSourceTitle(raw);
}

export function normalizeCitation(value = "") {
  return normalizeAuthorityReference(value);
}

function inferIssuanceNumber(source = {}) {
  const raw = rawCitationBlob(source);
  const normalized = normalizeAuthorityReference(raw);

  if (
    /^(RR|RMC|RMO|RAMO)\s+\d+-\d{4}$/i.test(normalized) ||
    /^RA\s+\d{4,6}$/i.test(normalized) ||
    /^NIRC\s+Sec\./i.test(normalized) ||
    /^CMTA\s+Sec\./i.test(normalized) ||
    /^LGC\s+Sec\./i.test(normalized) ||
    /^BIR\s+Ruling/i.test(normalized) ||
    /^G\.R\.\s+No\./i.test(normalized) ||
    /^CTA\s+(EB\s+)?(?:Case\s+)?No\./i.test(normalized)
  ) {
    return normalized;
  }

  return "";
}

function inferCaseName(source = {}) {
  const raw = compactSpaces(
    [
      source.caseName,
      source.case_name,
      source.title,
      source.sourceTitle,
      source.source_title,
      source.documentTitle,
      source.document_title,
      source.metadata?.caseName,
      source.metadata?.case_name,
      source.metadata?.documentTitle,
      source.metadata?.originalFileName
    ]
      .filter(Boolean)
      .join(" ")
  );

  const cleaned = cleanSourceTitle(raw);

  if (/\bv\.?\s+/i.test(cleaned)) {
    return cleaned
      .replace(/\s+-\s+G\.R\..*$/i, "")
      .replace(/\s+G\.R\..*$/i, "")
      .trim();
  }

  if (/commissioner of internal revenue/i.test(cleaned)) {
    return cleaned
      .replace(/commissioner of internal revenue/i, "CIR")
      .replace(/\s+G\.R\..*$/i, "")
      .trim();
  }

  return "";
}

export function formatCaseCitation(source = {}) {
  const caseName = inferCaseName(source);
  const docket = inferIssuanceNumber(source);
  const authorityType = authorityTypeOf(source);
  const authority = normalizeAuthorityLabel(authorityType || authorityLabelOf(source));

  if (caseName && docket && !caseName.includes(docket)) {
    return `${caseName}, ${docket}`;
  }

  if (caseName) return caseName;
  if (docket) return docket;

  const title = cleanSourceTitle(titleOf(source));
  return title ? `${title}${authority ? ` [${authority}]` : ""}` : "Unknown case citation";
}

export function formatAuthorityCitation(source = {}, options = {}) {
  const authorityType = authorityTypeOf(source);
  const authorityLabel = normalizeAuthorityLabel(authorityType || authorityLabelOf(source));
  const normalizedReference =
    source.normalizedReference ||
    source.normalized_reference ||
    source.metadata?.normalizedReference ||
    source.metadata?.normalized_reference ||
    inferIssuanceNumber(source);

  const section = cleanSectionLabel(sectionOf(source) || "");
  const title = cleanSourceTitle(titleOf(source));
  const citation = normalizeAuthorityReference(normalizedReference || title);

  const isCase = [
    "SUPREME_COURT_EN_BANC",
    "SUPREME_COURT",
    "SC",
    "CTA_EN_BANC",
    "CTA_DIVISION",
    "CTA",
    "JURISPRUDENCE"
  ].includes(authorityType);

  const display = isCase
    ? formatCaseCitation(source)
    : citation && title && citation !== title && !title.includes(citation)
      ? `${citation} – ${title}`
      : citation || title;

  const parts = [display || title || "Unknown source"];

  if (section && !String(parts[0]).includes(section)) {
    parts.push(`Provision: ${section}`);
  }

  if (options.includeAuthorityLabel !== false && authorityLabel) {
    parts.push(`[${authorityLabel}]`);
  }

  if (options.includeHierarchy === true) {
    parts.push(`[Level ${authorityLevelOf(source)}; Precedence ${controllingPrecedenceOf(source)}]`);
  }

  return compactSpaces(parts.join(" "));
}

function citationDedupKey(source = {}) {
  const authorityType = authorityTypeOf(source) || "UNKNOWN";
  const normalizedReference =
    source.normalizedReference ||
    source.normalized_reference ||
    source.metadata?.normalizedReference ||
    source.metadata?.normalized_reference ||
    inferIssuanceNumber(source);

  const caseName = inferCaseName(source);
  const section = cleanSectionLabel(sectionOf(source) || "");
  const title = cleanSourceTitle(titleOf(source));
  const fileId = fileIdOf(source);

  const stableReference = normalizeAuthorityReference(
    normalizedReference || caseName || section || title || fileId || ""
  );

  return compactSpaces(
    [
      authorityType,
      stableReference,
      section,
      caseName || "",
      fileId || ""
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase()
  );
}

export function dedupeCitations(citations = []) {
  return uniqueBy(
    sortCitationAuthorities(safeArray(citations)),
    citationDedupKey
  );
}

export function isSecondaryAuthority(sourceOrType = {}) {
  const type =
    typeof sourceOrType === "string"
      ? normalizeAuthorityCode(sourceOrType)
      : authorityTypeOf(sourceOrType);

  return SECONDARY_AUTHORITY_TYPES.includes(type);
}

export function isPersuasiveAuthority(sourceOrType = {}) {
  const type =
    typeof sourceOrType === "string"
      ? normalizeAuthorityCode(sourceOrType)
      : authorityTypeOf(sourceOrType);

  return PERSUASIVE_AUTHORITY_TYPES.includes(type);
}

function isHiddenBySourceVisibility(source = {}) {
  return Boolean(
    source.hidden === true ||
      source.visible === false ||
      source.sourceVisible === false ||
      source.source_visible === false ||
      source.metadata?.hidden === true ||
      source.metadata?.visible === false ||
      source.visibility === "hidden"
  );
}

function isWeakAuthority(item = {}) {
  return (
    isSecondaryAuthority(item) ||
    ["UNKNOWN", null].includes(authorityTypeOf(item))
  );
}

function reviewModeAllowed(options = {}) {
  return Boolean(
    options.allowWeak ||
      options.includeWeak ||
      options.includeSecondary ||
      options.reviewMode ||
      options.requiresReviewMode ||
      options.mode === "TAX_REVIEWER" ||
      options.mode === "REVIEW_MODE"
  );
}

function sourceAllowedByVisibility(item = {}, options = {}) {
  if (isHiddenBySourceVisibility(item) && !options.includeHidden) return false;
  if (isWeakAuthority(item) && !reviewModeAllowed(options)) return false;
  if (item.issueMismatch === true) return false;
  if (item.issueClassificationMatch?.issueMismatch === true) return false;
  return true;
}

function targetAuthorityMatched(item = {}) {
  return Boolean(
    item.targetAuthorityMatch === true ||
      item.target_authority_match === true ||
      item.issueClassificationMatch?.targetAuthorityMatch === true ||
      item.metadata?.targetAuthorityMatch === true
  );
}

function issueClassificationMatched(item = {}) {
  if (item.issueMismatch === true) return false;
  if (item.issueClassificationMatch?.issueMismatch === true) return false;

  if (item.issueClassificationMatch === true) return true;
  if (item.issue_classification_match === true) return true;
  if (item.metadata?.issueClassificationMatch === true) return true;

  const match = item.issueClassificationMatch;

  if (!match || typeof match !== "object") return null;

  if (match.issueOverlap === true) return true;
  if (match.matched === true) return true;
  if (match.targetAuthorityMatch === true) return true;

  return null;
}

function citationScore(item = {}) {
  const base = Number(
    item.rerankScore ||
      item.rerank_score ||
      item.finalScore ||
      item.final_score ||
      item.retrievalScore ||
      item.retrieval_score ||
      item.score ||
      item.similarity ||
      0
  );

  const targetBonus = targetAuthorityMatched(item) ? 80 : 0;
  const issueMatch = issueClassificationMatched(item);
  const issueBonus = issueMatch === true ? 70 : issueMatch === false ? -150 : 0;
  const exactBonus = inferIssuanceNumber(item) ? 25 : 0;
  const sectionBonus = sectionOf(item) ? 20 : 0;
  const weakPenalty = isWeakAuthority(item) ? -100 : 0;
  const hiddenPenalty = isHiddenBySourceVisibility(item) ? -250 : 0;

  return (
    base +
    targetBonus +
    issueBonus +
    exactBonus +
    sectionBonus +
    weakPenalty +
    hiddenPenalty -
    controllingPrecedenceOf(item)
  );
}

function buildCitationKey(item = {}) {
  return citationDedupKey(item);
}

function sortCitationAuthorities(items = []) {
  return [...safeArray(items)]
    .filter(Boolean)
    .sort((a, b) => {
      const targetDiff = Number(targetAuthorityMatched(b)) - Number(targetAuthorityMatched(a));
      if (targetDiff !== 0) return targetDiff;

      const aIssue = issueClassificationMatched(a);
      const bIssue = issueClassificationMatched(b);

      if (aIssue !== bIssue) {
        return Number(bIssue === true) - Number(aIssue === true);
      }

      const precedenceDiff = controllingPrecedenceOf(a) - controllingPrecedenceOf(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      const levelDiff = authorityLevelOf(a) - authorityLevelOf(b);
      if (levelDiff !== 0) return levelDiff;

      const scoreDiff = citationScore(b) - citationScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      return cleanSourceTitle(titleOf(a)).localeCompare(cleanSourceTitle(titleOf(b)));
    });
}

function selectDisplayableCitations(items = [], options = {}) {
  const maxItems = Number(options.maxItems || MAX_CITATIONS);

  return dedupeCitations(
    safeArray(items).filter((item) => sourceAllowedByVisibility(item, options))
  ).slice(0, maxItems);
}

function authorityGroupOf(source = {}, role = "") {
  const type = authorityTypeOf(source);

  if (role === "CONTROLLING" || source.isControllingAuthority === true) {
    return "CONTROLLING";
  }

  if (["CONSTITUTION", "STATUTE", "NIRC", "TAX_CODE", "REPUBLIC_ACT", "RA", "CMTA", "LGC"].includes(type)) {
    return "STATUTES";
  }

  if (["TAX_TREATY", "TREATY"].includes(type)) return "TREATIES";

  if ([
    "SUPREME_COURT_EN_BANC",
    "SUPREME_COURT",
    "SC",
    "JURISPRUDENCE",
    "CTA_EN_BANC",
    "CTA_DIVISION",
    "CTA"
  ].includes(type)) {
    return "JURISPRUDENCE";
  }

  if (["RR"].includes(type)) return "REGULATIONS";
  if (["RMC", "RMO", "RAMO"].includes(type)) return "ADMINISTRATIVE";
  if (["BIR_RULING"].includes(type)) return "BIR_RULINGS";

  if (isPersuasiveAuthority(source)) return "TECHNICAL";
  if (isSecondaryAuthority(source)) return "SECONDARY";

  return "OTHER";
}

export function groupCitationsByAuthority(citations = [], options = {}) {
  const selected = selectDisplayableCitations(citations, {
    maxItems: options.maxItems || MAX_GROUPED_CITATIONS,
    ...options
  });

  const groups = {};

  for (const item of selected) {
    const role =
      item.citationRole ||
      item.citation_role ||
      item.authorityRole ||
      item.authority_role ||
      "";

    const group = authorityGroupOf(item, String(role).toUpperCase());

    if (!groups[group]) {
      groups[group] = {
        code: group,
        label: GROUP_LABELS[group] || group,
        items: []
      };
    }

    groups[group].items.push(item);
  }

  const order = [
    "CONTROLLING",
    "STATUTES",
    "TREATIES",
    "JURISPRUDENCE",
    "REGULATIONS",
    "ADMINISTRATIVE",
    "BIR_RULINGS",
    "TECHNICAL",
    "SECONDARY",
    "OTHER"
  ];

  return order
    .filter((code) => groups[code]?.items?.length)
    .map((code) => ({
      ...groups[code],
      items: dedupeCitations(groups[code].items)
    }));
}

export function compactCitationDisplay(citations = [], options = {}) {
  const grouped = Boolean(options.grouped || options.groupByAuthority);
  const maxItems = Number(options.maxItems || MAX_CITATIONS);

  if (grouped) {
    const groups = groupCitationsByAuthority(citations, {
      ...options,
      maxItems: options.maxItems || MAX_GROUPED_CITATIONS
    });

    if (!groups.length) return options.emptyText || "Indexed source not found.";

    return groups
      .map((group) => {
        const lines = [group.label];
        for (const item of group.items.slice(0, maxItems)) {
          lines.push(`- ${formatAuthorityCitation(item, {
            includeAuthorityLabel: false,
            includeHierarchy: options.includeHierarchy === true
          })}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
  }

  const selected = selectDisplayableCitations(citations, {
    ...options,
    maxItems
  });

  if (!selected.length) return options.emptyText || "Indexed source not found.";

  return selected
    .map((item) => `- ${formatAuthorityCitation(item, {
      includeAuthorityLabel: options.includeAuthorityLabel !== false,
      includeHierarchy: options.includeHierarchy === true
    })}`)
    .join("\n");
}

function buildLegalBasisLine(item = {}) {
  return formatAuthorityCitation(item, {
    includeAuthorityLabel: true,
    includeHierarchy: false
  });
}

function buildSourceLine(item = {}) {
  return formatAuthorityCitation(item, {
    includeAuthorityLabel: false,
    includeHierarchy: false
  });
}

export function extractCitedSourceKeys(answerText = "") {
  const text = String(answerText || "");
  const keys = [];

  const patterns = [
    /\b(?:RR|Revenue Regulations?)\s*(?:No\.?)?\s*0*\d+[-/]\d{2,4}\b/gi,
    /\b(?:RMC|Revenue Memorandum Circulars?)\s*(?:No\.?)?\s*0*\d+[-/]\d{2,4}\b/gi,
    /\b(?:RMO|Revenue Memorandum Orders?)\s*(?:No\.?)?\s*0*\d+[-/]\d{2,4}\b/gi,
    /\b(?:RAMO|Revenue Audit Memorandum Orders?)\s*(?:No\.?)?\s*0*\d+[-/]\d{2,4}\b/gi,
    /\b(?:RA|R\.A\.|Republic Act)\s*(?:No\.?)?\s*\d{4,6}\b/gi,
    /\b(?:NIRC|Tax Code)?\s*(?:Sec\.?|Section)\s*[0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?\s*,?\s*(?:NIRC|Tax Code)?\b/gi,
    /\b(?:CMTA)?\s*(?:Sec\.?|Section)\s*[0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?\s*,?\s*(?:CMTA)?\b/gi,
    /\b(?:LGC)?\s*(?:Sec\.?|Section)\s*[0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?\s*,?\s*(?:LGC)?\b/gi,
    /\bG\.?\s*R\.?\s*No\.?\s*[\w.-]+\b/gi,
    /\bCTA\s*(?:EB|En Banc|Case)?\s*(?:No\.?)?\s*[\w.-]+\b/gi,
    /\bBIR\s+Ruling\s*(?:No\.?)?\s*[\w./()-]+\b/gi
  ];

  for (const regex of patterns) {
    for (const match of text.matchAll(regex)) {
      keys.push(normalizeAuthorityReference(match[0]));
    }
  }

  return uniqueBy(keys.map(compactSpaces), (item) => item.toLowerCase());
}

export function formatSingleCitation(source = {}) {
  const citation = formatAuthorityCitation(source, {
    includeAuthorityLabel: false,
    includeHierarchy: false
  });

  const section = cleanSectionLabel(sectionOf(source) || "");
  const authority = normalizeAuthorityLabel(authorityTypeOf(source) || authorityLabelOf(source));
  const authorityLevel = authorityLevelOf(source);
  const precedence = controllingPrecedenceOf(source);
  const path = pathOf(source);
  const driveViewUrl = driveViewUrlOf(source);
  const fileId = fileIdOf(source);

  const lines = [citation];

  if (section) lines.push(`Provision: ${section}`);
  if (authority) lines.push(`Authority: ${authority}`);

  lines.push(`Authority Level: ${authorityLevel}`);
  lines.push(`Controlling Precedence: ${precedence}`);

  if (targetAuthorityMatched(source)) lines.push("Target Authority Match: YES");
  if (issueClassificationMatched(source) === true) lines.push("Issue Classification Match: YES");

  if (path) lines.push(`Source Path: ${trimText(path, 260)}`);
  if (driveViewUrl) lines.push(`Drive View URL: ${trimText(driveViewUrl, 260)}`);
  if (fileId) lines.push(`File ID: ${fileId}`);

  return lines.join("\n");
}

export function formatProvisionCitationBlock(citations = [], options = {}) {
  const selected = selectDisplayableCitations(citations, {
    maxItems: options.maxItems || MAX_CITATIONS,
    ...options
  });

  if (!selected.length) return "Indexed source not found.";

  return selected
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const section = cleanSectionLabel(sectionOf(item) || "");
      if (section) lines.push(`Provision: ${section}`);

      const authority = normalizeAuthorityLabel(authorityTypeOf(item) || authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      if (options.includeHierarchy !== false) {
        lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);
      }

      if (options.includeMatchMetadata) {
        if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
        if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");
      }

      const excerpt = excerptOf(item, options.excerptChars || 220);
      if (options.includeExcerpts !== false && excerpt) lines.push(`Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (options.includePaths && path) lines.push(`Source Path: ${trimText(path, 260)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatLegalBasisBlock(legalBases = [], options = {}) {
  const selected = selectDisplayableCitations(legalBases, {
    maxItems: options.maxItems || MAX_CITATIONS,
    ...options
  });

  if (!selected.length) return "Indexed source not found.";

  if (options.grouped || options.groupByAuthority) {
    return compactCitationDisplay(selected, {
      ...options,
      grouped: true,
      emptyText: "Indexed source not found."
    });
  }

  return selected
    .map((item) => `- ${buildLegalBasisLine(item)}`)
    .join("\n");
}

export function formatSourcesUsedBlock(sources = [], options = {}) {
  const maxItems = Number(options.maxItems || MAX_CITATIONS);
  const includePaths = Boolean(options.includePaths || false);
  const includeAuthorityLevels = Boolean(options.includeAuthorityLevels === true);
  const includeMatchMetadata = Boolean(options.includeMatchMetadata || false);
  const grouped = Boolean(options.grouped || options.groupByAuthority);

  const selected = selectDisplayableCitations(sources, {
    maxItems,
    ...options
  });

  if (!selected.length) {
    return "8. SOURCES\n- Indexed source not found.";
  }

  if (grouped) {
    return [
      "8. SOURCES",
      compactCitationDisplay(selected, {
        ...options,
        grouped: true,
        maxItems,
        emptyText: "- Indexed source not found."
      })
    ].join("\n");
  }

  const lines = ["8. SOURCES"];

  for (const item of selected) {
    const sourceLine = buildSourceLine(item);
    const authority = normalizeAuthorityLabel(authorityTypeOf(item) || authorityLabelOf(item));
    const authorityLevel = authorityLevelOf(item);
    const precedence = controllingPrecedenceOf(item);
    const driveViewUrl = driveViewUrlOf(item);

    lines.push(
      `- ${sourceLine}${authority ? ` [${authority}]` : ""}${
        includeAuthorityLevels ? ` [Level ${authorityLevel}; Precedence ${precedence}]` : ""
      }`
    );

    if (includeMatchMetadata) {
      if (targetAuthorityMatched(item)) lines.push("  Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("  Issue Classification Match: YES");
    }

    if (includePaths && pathOf(item)) lines.push(`  Path: ${trimText(pathOf(item), 260)}`);
    if (driveViewUrl && options.includeLinks) lines.push(`  Link: ${trimText(driveViewUrl, 260)}`);
  }

  return lines.join("\n");
}

export function formatCaseCitationBlock(caseSources = [], options = {}) {
  const selected = selectDisplayableCitations(caseSources, {
    maxItems: options.maxItems || MAX_CITATIONS,
    allowWeak: false,
    ...options
  });

  if (!selected.length) return "Indexed source not found.";

  return selected
    .map((item, index) => {
      const lines = [`${index + 1}. ${formatCaseCitation(item)}`];

      const authority = normalizeAuthorityLabel(authorityTypeOf(item) || authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      if (options.includeHierarchy !== false) {
        lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);
      }

      if (options.includeMatchMetadata) {
        if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
        if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");
      }

      if (item.caseRole) lines.push(`Case Role: ${trimText(item.caseRole, 120)}`);
      if (item.caseApplicability) lines.push(`Case Applicability: ${trimText(item.caseApplicability, 220)}`);

      const excerpt = excerptOf(item, options.excerptChars || 220);
      if (options.includeExcerpts !== false && excerpt) lines.push(`Case Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (options.includePaths && path) lines.push(`Source Path: ${trimText(path, 260)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

export function ensureStructuredAnswerSections({
  directAnswer = "",
  legalBasis = "",
  supportingRules = "",
  professionalInsight = "",
  conflictFlag = "",
  sourcesUsed = "",
  assumptions = "",
  evidentiaryGaps = ""
}) {
  return [
    "1. DIRECT ANSWER",
    directAnswer || "No direct answer available.",
    "",
    assumptions ? "2. ASSUMPTIONS / FACTUAL LIMITATIONS" : null,
    assumptions || null,
    "",
    evidentiaryGaps ? "3. EVIDENTIARY GAPS" : null,
    evidentiaryGaps || null,
    "",
    "4. LEGAL BASIS",
    legalBasis || "Indexed source not found.",
    "",
    "5. SUPPORTING RULES",
    supportingRules || "Indexed source not found.",
    "",
    "6. PROFESSIONAL INSIGHT",
    professionalInsight || "No additional professional insight.",
    "",
    "7. CONFLICT FLAG",
    conflictFlag || "Conflict Detected: NO",
    "",
    sourcesUsed || "8. SOURCES\n- Indexed source not found."
  ]
    .filter(Boolean)
    .join("\n");
}

export function ensureCaseAnswerSections({
  issue = "",
  applicableLaw = "",
  birPosition = "",
  courtPosition = "",
  conflictFlag = "",
  legallyDefensibleConclusion = "",
  taxpayerRiskAssessment = "",
  recommendedAction = "",
  assumptions = "",
  evidentiaryGaps = "",
  sourcesUsed = ""
}) {
  return [
    "### Issue",
    issue || "No clear issue identified from the indexed sources.",
    "",
    assumptions ? "### Assumptions / factual limitations" : null,
    assumptions || null,
    "",
    evidentiaryGaps ? "### Evidentiary gaps" : null,
    evidentiaryGaps || null,
    "",
    "### Applicable law (ranked by authority)",
    applicableLaw || "Indexed source not found.",
    "",
    "### BIR position",
    birPosition || "Indexed source not found.",
    "",
    "### Court position",
    courtPosition || "Indexed source not found.",
    "",
    "### Conflict flag",
    conflictFlag || "Conflict Detected: NO",
    "",
    "### Legally defensible conclusion",
    legallyDefensibleConclusion || "No legally defensible conclusion could be formed from the indexed sources.",
    "",
    "### Taxpayer risk assessment",
    taxpayerRiskAssessment || "MEDIUM — further source verification may be required.",
    "",
    "### Recommended action",
    recommendedAction || "Verify the latest controlling authority before acting.",
    "",
    sourcesUsed || "8. SOURCES\n- Indexed source not found."
  ]
    .filter(Boolean)
    .join("\n");
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);
  const hasExactIssue = Boolean(conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.length);
  const hasExactDimension = Boolean(
    conflict.exactLegalDimension ||
      conflict.sameIssueGate?.sameDimensions?.length ||
      conflict.legalDimension
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controllingSource
  );

  return (
    hasTrueConflict &&
    hasConflictType &&
    hasExactIssue &&
    hasExactDimension &&
    sameIssuePassed &&
    oppositeHoldingPassed &&
    hasResolution
  );
}

export function buildConflictFlagText(conflict = null) {
  if (!conflict || !conflict.conflict) {
    return "Conflict Detected: NO";
  }

  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "Conflict Detected: NO",
      "Note: A possible or apparent conflict was not elevated to doctrinal conflict because complete same-issue, same-dimension, opposite-holding, and hierarchy-resolution metadata was not provided."
    ].join("\n");
  }

  const lines = [
    "Conflict Detected: YES",
    `Conflict Type: ${trimText(conflict.conflictType || conflict.type, 120)}`,
    `Exact Issue: ${trimText(conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.join(", "), 220)}`,
    `Exact Legal Dimension: ${trimText(
      conflict.exactLegalDimension ||
        conflict.sameIssueGate?.sameDimensions?.join(", ") ||
        conflict.legalDimension,
      220
    )}`
  ];

  if (conflict.reason) lines.push(`Reason: ${trimText(conflict.reason, 700)}`);
  if (conflict.resolutionBasis) lines.push(`Resolution Basis: ${trimText(conflict.resolutionBasis, 700)}`);
  if (conflict.controllingAuthority) lines.push(`Controlling Authority: ${trimText(conflict.controllingAuthority, 160)}`);
  if (conflict.controllingSource) lines.push(`Recommended Action: Follow ${trimText(titleOf(conflict.controllingSource), 220)}`);
  if (conflict.distinctionType) lines.push(`Distinction Type: ${trimText(conflict.distinctionType, 220)}`);

  return lines.join("\n");
}

export function buildSupportingRulesText({
  topLegalBases = [],
  extraSources = []
}) {
  const blocks = [];

  const legalBasisLines = selectDisplayableCitations(topLegalBases, {
    maxItems: 3,
    allowWeak: false
  })
    .map((item) => {
      const excerpt = excerptOf(item, 220);
      return excerpt ? `- ${excerpt}` : null;
    })
    .filter(Boolean);

  if (legalBasisLines.length) blocks.push(legalBasisLines.join("\n"));

  const extra = selectDisplayableCitations(extraSources, {
    maxItems: 3,
    allowWeak: false
  });

  if (extra.length) {
    blocks.push(
      extra
        .map((item) => {
          const excerpt = excerptOf(item, 220);
          return excerpt ? `- ${excerpt}` : null;
        })
        .filter(Boolean)
        .join("\n")
    );
  }

  return blocks.filter(Boolean).join("\n\n") || "Indexed source not found.";
}

export function citationFormattingHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CITATION_FORMATTING_ENGINE",
    version: ENGINE_VERSION,

    adaptiveCompatible: true,
    rendererCompatible: true,
    litigationCompatible: true,
    auditCompatible: true,
    taxEngineCompatible: true,
    sourceVisibilityCompatible: true,
    authorityHierarchyMetadataAware: true,

    issueClassificationMatchAware: true,
    targetAuthorityMatchAware: true,
    controllingPrecedenceAware: true,
    conflictMetadataGated: true,
    contextOrchestrationCompatible: true,

    supportsPhilippineTaxCitationNormalization: true,
    supportsRrRmcRmoRamoFormatting: true,
    supportsBirRulingFormatting: true,
    supportsJurisprudenceFormatting: true,
    supportsNircRaCmtaLgcFormatting: true,
    supportsGroupedAuthorityDisplay: true,
    supportsControllingSupportingDisplay: true,
    supportsCitationDeduplication: true,

    nonDuplicatedSourcesReady: true,
    citedRelevantSourcesOnly: true,
    rawFullTextInjectionPrevented: true,
    rawMetadataExposurePrevented: true,
    compactCitationOutput: true,

    noOpenAICalls: true,
    noRetrieval: true,
    noReranking: true,
    noAnswerGeneration: true,
    noLegalReasoning: true
  };
}

export {
  AUTHORITY_HIERARCHY,
  AUTHORITY_LABELS,
  GROUP_LABELS,
  authorityTypeOf,
  authorityLevelOf,
  controllingPrecedenceOf,
  normalizeAuthorityLabel
};

export default {
  formatSingleCitation,
  formatProvisionCitationBlock,
  formatLegalBasisBlock,
  formatSourcesUsedBlock,
  formatCaseCitationBlock,
  ensureStructuredAnswerSections,
  ensureCaseAnswerSections,
  buildConflictFlagText,
  buildSupportingRulesText,
  extractCitedSourceKeys,
  citationFormattingHealthCheck,

  normalizeCitation,
  normalizeAuthorityReference,
  formatAuthorityCitation,
  formatCaseCitation,
  dedupeCitations,
  groupCitationsByAuthority,
  compactCitationDisplay,
  isPersuasiveAuthority,
  isSecondaryAuthority,

  AUTHORITY_HIERARCHY,
  AUTHORITY_LABELS,
  GROUP_LABELS
};
