// FILE: ask-helpers.js
"use strict";

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

export const MAX_VISIBLE_SOURCES = 5;

const ENGINE_VERSION = "4.0.0";
const CURRENT_YEAR = new Date().getFullYear();

const HIDDEN_FOLDER_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers",
  "reviewer",
  "handout",
  "lecture notes"
];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function lower(value = "") {
  return compactSpaces(value).toLowerCase();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function stripFileExtension(value = "") {
  return String(value || "").replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "");
}

function basename(value = "") {
  const text = String(value || "");
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

function cleanFilename(value = "") {
  return compactSpaces(
    stripFileExtension(basename(value))
      .replace(/[_]+/g, " ")
      .replace(/\(\d+\)/g, " ")
      .replace(/\s+/g, " ")
  );
}

function truncateText(value = "", maxChars = 900) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}...[truncated]` : text;
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    VAT_DEFINITION: "VAT_LIABILITY",
    DEFINITION: "VAT_LIABILITY",
    REFUND: "VAT_REFUND",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    CHARACTERIZATION: "TRANSACTION",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    ACCOUNTING_TAX: "ACCOUNTING"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULINGS: "BIR_RULING",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || null;
}

export function getUserId(req = {}) {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.user?.sub ||
    req.auth?.userId ||
    req.auth?.user_id ||
    null
  );
}

export function normalizeSourceName(name = "") {
  return String(name || "")
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
    .replace(/\brev\.?\s*audit\.?\s*memo\.?\s*order\b/g, "ramo")
    .replace(/\brepublic act\b/g, "ra")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/[\\/]+/g, "/")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

export function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[\\/]/g, "-")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getDocPath(doc = {}) {
  return String(
    doc.metadata?.path ||
      doc.path ||
      doc.source_path ||
      doc.sourcePath ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.title ||
      ""
  );
}

export function getDocOriginalName(doc = {}) {
  return String(
    doc.metadata?.documentTitle ||
      doc.document_title ||
      doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.title ||
      getDocPath(doc) ||
      ""
  );
}

export function getDocText(doc = {}) {
  return compactSpaces(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.summary,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function cleanDisplayTitle(doc = {}) {
  const raw =
    doc.title ||
    doc.source_title ||
    doc.sourceTitle ||
    doc.document_title ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    getDocOriginalName(doc) ||
    getDocPath(doc) ||
    "Untitled Source";

  return cleanFilename(raw) || "Untitled Source";
}

export function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

export function normalizeIssuanceYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = CURRENT_YEAR % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

export function extractIssuanceReference(text = "") {
  const value = compactSpaces(text);

  const patterns = [
    {
      type: "CONSTITUTION",
      regex: /\b(?:1987\s+constitution|1987\s+philippine\s+constitution|philippine\s+constitution|constitution)\b/i
    },
    {
      type: "RR",
      regex: /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-_ /–]\s*(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-_ /–]\s*(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-_ /–]\s*(\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex: /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-_ /–]\s*(\d{2,4})\b/i
    },
    {
      type: "RA",
      regex: /\b(?:ra|r\.a\.|republic act(?:\s+no\.?)?)\s*0*(\d{4,6})\b/i
    },
    {
      type: "CASE",
      regex: /\bg\.?\s*r\.?\s*no\.?\s*([\w.-]+)\b/i
    },
    {
      type: "CTA",
      regex: /\bcta\s+(?:case|eb)\s+no\.?\s*([\w.-]+)\b/i
    }
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern.regex);
    if (!match) continue;

    if (["RR", "RMC", "RMO", "RAMO"].includes(pattern.type)) {
      return {
        type: pattern.type,
        number: normalizeIssuanceNumber(match[1]),
        year: normalizeIssuanceYear(match[2]),
        normalized: `${pattern.type} ${normalizeIssuanceNumber(match[1])}-${normalizeIssuanceYear(match[2])}`
      };
    }

    if (pattern.type === "RA") {
      const number = String(match[1]).replace(/^0+/, "");
      return {
        type: "RA",
        number,
        normalized: `RA ${number}`
      };
    }

    return {
      type: pattern.type,
      normalized: match[0]
    };
  }

  return null;
}

export function detectIssuanceQuery(question = "") {
  return extractIssuanceReference(question);
}

export function classifyQuestion(question = "") {
  const text = lower(question);

  if (/\b(?:rr|rmc|rmo|ramo|revenue regulation|revenue memorandum|bir ruling|ra|republic act|nirc|tax code|g\.?\s*r\.?\s*no|cta)\b/i.test(text)) {
    return "issuance";
  }

  if (/\b(?:vat|output vat|input vat|withholding|ewt|cwt|income tax|mcit|rcit|nolco|dst|percentage tax|excise)\b/i.test(text)) {
    return "tax";
  }

  if (/\b(?:audit|afs|pfrs|pas|working paper|misstatement|qualified opinion|materiality|evidence|supporting document)\b/i.test(text)) {
    return "audit";
  }

  if (/\b(?:case|litigation|court|jurisprudence|doctrine|cta|supreme court|protest|assessment|loa|pan|fan|fld)\b/i.test(text)) {
    return "legal";
  }

  if (/\b(?:contract|agreement|lease|concession|principal|agent|economic substance|transaction|pass-through|reimbursement|bundled)\b/i.test(text)) {
    return "transaction";
  }

  if (/\b(?:quiz|reviewer|cpale|exam|bar)\b/i.test(text)) {
    return "reviewer";
  }

  return "general";
}

export function detectQuestionMode(question = "") {
  const text = lower(question);

  const rules = [
    { regex: /\b(?:audit|afs|pfrs|pas|working paper|misstatement|qualified opinion)\b/i, mode: "AUDIT" },
    { regex: /\b(?:tax|vat|bir|income tax|withholding|mcit|rcit|nolco)\b/i, mode: "TAX" },
    { regex: /\b(?:case|litigation|court|jurisprudence|doctrine|g\.?\s*r\.?\s*no)\b/i, mode: "LITIGATION" },
    { regex: /\b(?:reviewer|quiz|exam|cpale|bar exam|recall)\b/i, mode: "REVIEWER" },
    { regex: /\b(?:contract|agreement|transaction|economic substance|evidence|principal|agent|reimbursement|pass-through)\b/i, mode: "TRANSACTION" },
    { regex: /\b(?:business|strategy|financial model|valuation|irr|pricing)\b/i, mode: "BUSINESS" }
  ];

  for (const rule of rules) {
    if (rule.regex.test(text)) return rule.mode;
  }

  return "GENERAL";
}

export function getAuthorityType(doc = {}) {
  return String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      ""
  ).toUpperCase() || inferAuthorityType(doc);
}

function inferAuthorityType(doc = {}) {
  const blob = lower(
    [
      doc.source,
      doc.title,
      doc.path,
      doc.source_path,
      doc.originalSource,
      doc.original_source,
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.authorityType,
      doc.text,
      doc.content
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (blob.includes("constitution")) return "CONSTITUTION";
  if (blob.includes("national internal revenue code") || blob.includes("tax code") || blob.includes("republic act") || /\bnirc\b/i.test(blob) || /\bra\s*\d{4,6}\b/i.test(blob)) return "STATUTE";
  if (blob.includes("revenue regulation") || /\brr\s*\d+[-/]\d{2,4}\b/i.test(blob)) return "RR";
  if (blob.includes("supreme court") || /\bg\.?\s*r\.?\s*no\.?/i.test(blob)) return "SUPREME_COURT";
  if (blob.includes("tax treaty")) return "TREATY";
  if (blob.includes("revenue memorandum circular") || /\brmc\s*\d+[-/]\d{2,4}\b/i.test(blob)) return "RMC";
  if (blob.includes("revenue memorandum order") || /\brmo\s*\d+[-/]\d{2,4}\b/i.test(blob)) return "RMO";
  if (blob.includes("revenue audit memorandum order") || /\bramo\s*\d+[-/]\d{2,4}\b/i.test(blob)) return "RAMO";
  if (blob.includes("bir ruling")) return "BIR_RULING";
  if (blob.includes("cta en banc")) return "CTA_EN_BANC";
  if (blob.includes("court of appeals")) return "COURT_OF_APPEALS";
  if (blob.includes("cta")) return "CTA_DIVISION";
  if (blob.includes("local tax") || blob.includes("ordinance")) return "LGU";
  if (blob.includes("pfrs")) return "PFRS";
  if (blob.includes("pas ")) return "PAS";
  if (blob.includes("psa ")) return "PSA";

  return "UNKNOWN";
}

export function getSourceTier(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  const type = getAuthorityType(doc);

  const typeMap = {
    CONSTITUTION: 1,
    STATUTE: 2,
    SUPREME_COURT: 3,
    RR: 4,
    TREATY: 5,
    RMC: 6,
    RMO: 7,
    RAMO: 8,
    BIR_RULING: 9,
    CTA_EN_BANC: 10,
    COURT_OF_APPEALS: 11,
    CTA_DIVISION: 12,
    LGU: 13,
    PFRS: 14,
    PAS: 14,
    PSA: 15,
    SECONDARY: 99,
    UNKNOWN: 99
  };

  return typeMap[type] || 99;
}

export function getControllingPrecedence(doc = {}) {
  const explicit =
    doc.controllingPrecedence ??
    doc.controlling_precedence ??
    doc.metadata?.controllingPrecedence ??
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);
  return getSourceTier(doc);
}

export function isTargetAuthorityMatched(doc = {}, issueClassification = null) {
  if (doc.targetAuthorityMatch === true) return true;
  if (doc.issueClassificationMatch?.targetAuthorityMatch === true) return true;

  const targetAuthorities = unique([
    ...safeArray(issueClassification?.targetAuthorities).map(normalizeAuthority),
    ...safeArray(issueClassification?.target_authorities).map(normalizeAuthority)
  ]).filter(Boolean);

  if (!targetAuthorities.length) return false;

  return targetAuthorities.includes(getAuthorityType(doc));
}

export function isIssueMatched(doc = {}) {
  if (doc.issueMismatch === true || doc.issueClassificationMatch?.issueMismatch === true) return false;
  if (doc.issueClassificationMatch?.matched === true) return true;
  if (doc.issueClassificationMatch?.compatible === true) return true;
  if (doc.issueClassificationMatch?.issueOverlap === true) return true;
  if (doc.issueClassificationMatch?.targetAuthorityMatch === true) return true;
  return null;
}

export function isIssueMismatched(doc = {}) {
  return doc.issueMismatch === true || doc.issueClassificationMatch?.issueMismatch === true;
}

export function getFinalScore(doc = {}) {
  const score =
    doc.finalScore ??
    doc.final_score ??
    doc.rerankScore ??
    doc.rerank_score ??
    doc.retrievalScore ??
    doc.retrieval_score ??
    doc.combined_score ??
    doc.score ??
    doc.similarity ??
    0;

  return Number.isFinite(Number(score)) ? Number(score) : 0;
}

export function buildMemoryContext(messages = [], maxItems = 8) {
  const items = safeArray(messages)
    .slice(-Math.max(1, Number(maxItems) || 8))
    .map((message) => {
      const role = message.role || message.message_role || "unknown";
      const content =
        message.content ||
        message.message ||
        message.text ||
        message.body ||
        "";

      if (!content) return null;

      return `${String(role).toUpperCase()}: ${truncateText(content, 900)}`;
    })
    .filter(Boolean);

  return items.length ? items.join("\n\n") : "No prior conversation.";
}

export function toSafeDbNumeric(value, max = 999999.9999, decimals = 4) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  const capped = Math.max(
    Math.min(number, Number(max) || 999999.9999),
    -Math.abs(Number(max) || 999999.9999)
  );

  return Number(capped.toFixed(Number(decimals) || 4));
}

export function isHiddenSource(doc = {}) {
  const blob = lower(
    [
      getDocPath(doc),
      getDocOriginalName(doc),
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName
    ]
      .filter(Boolean)
      .join(" ")
  );

  return HIDDEN_FOLDER_PATTERNS.some((pattern) => blob.includes(pattern));
}

export function shouldHideSourceFromUser(doc = {}) {
  if (isHiddenSource(doc)) return true;
  if (isIssueMismatched(doc)) return true;
  return false;
}

export function filterVisibleSources(docs = []) {
  return safeArray(docs).filter((doc) => !shouldHideSourceFromUser(doc));
}

export function deduplicateSources(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of safeArray(docs)) {
    const key =
      normalizeForMatch(getDocPath(doc)) ||
      normalizeForMatch(getDocOriginalName(doc)) ||
      String(doc.id || "");

    if (!key || seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

export function sortSourcesByScore(docs = [], options = {}) {
  const issueClassification = options.issueClassification || null;

  return [...safeArray(docs)].sort((a, b) => {
    const targetDiff =
      Number(isTargetAuthorityMatched(b, issueClassification)) -
      Number(isTargetAuthorityMatched(a, issueClassification));

    if (targetDiff !== 0) return targetDiff;

    const aIssue = isIssueMatched(a);
    const bIssue = isIssueMatched(b);

    if (aIssue !== bIssue) {
      return Number(bIssue === true) - Number(aIssue === true);
    }

    const aPrecedence = getControllingPrecedence(a);
    const bPrecedence = getControllingPrecedence(b);

    if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

    const aTier = getSourceTier(a);
    const bTier = getSourceTier(b);

    if (aTier !== bTier) return aTier - bTier;

    return getFinalScore(b) - getFinalScore(a);
  });
}

export function processSources(docs = [], options = {}) {
  let supersession = options.supersessionResult || {};

  try {
    if (!supersession?.activeDocs && typeof applySupersessionFilter === "function") {
      supersession = applySupersessionFilter(docs || [], new Date()) || {};
    }
  } catch {
    supersession = {};
  }

  const activeDocs =
    supersession.activeDocs?.length > 0 ? supersession.activeDocs : docs;

  return sortSourcesByScore(
    deduplicateSources(filterVisibleSources(activeDocs)),
    options
  );
}

export function buildVisibleSources(docs = [], options = {}) {
  const issueClassification = options.issueClassification || null;

  return processSources(docs, options)
    .slice(0, Number(options.maxItems || MAX_VISIBLE_SOURCES))
    .map((doc) => ({
      title: cleanDisplayTitle(doc),
      source: getDocPath(doc),
      sourcePath: getDocPath(doc),
      sourceTitle: cleanDisplayTitle(doc),
      excerpt: getDocText(doc).slice(0, 500),
      authorityType: getAuthorityType(doc),
      authorityLevel: getSourceTier(doc),
      controllingPrecedence: getControllingPrecedence(doc),
      score: getFinalScore(doc),
      issueClassificationMatch: doc.issueClassificationMatch || null,
      targetAuthorityMatch: isTargetAuthorityMatched(doc, issueClassification),
      issueMismatch: isIssueMismatched(doc),
      driveViewUrl:
        doc.driveViewUrl ||
        doc.drive_view_url ||
        doc.metadata?.driveViewUrl ||
        doc.metadata?.drive_view_url ||
        null
    }));
}

export function finalizeSourcesForResponse(docs = [], options = {}) {
  const maxItems = Number(options.maxItems || MAX_VISIBLE_SOURCES);
  return buildVisibleSources(docs, {
    ...options,
    maxItems: Math.max(1, maxItems)
  });
}

export function stripTrailingSourceSection(answer = "") {
  const text = String(answer || "").trim();

  if (!text) return "";

  const patterns = [
    /\n+\s*(?:sources|source list|references|validated indexed sources)\s*:?\s*\n[\s\S]*$/i,
    /\n+\s*#{1,6}\s*(?:sources|references|validated indexed sources)\s*\n[\s\S]*$/i
  ];

  let output = text;

  for (const pattern of patterns) {
    output = output.replace(pattern, "").trim();
  }

  return output;
}

export function extractQuizAnswer(text = "") {
  const value = String(text || "").trim();

  if (!value) return null;

  const direct = value.match(/^[A-D]$/i);
  if (direct) return direct[0].toUpperCase();

  const patterns = [
    /\banswer\s*(?:is|:)?\s*([A-D])\b/i,
    /\bmy\s*answer\s*(?:is|:)?\s*([A-D])\b/i,
    /\boption\s*([A-D])\b/i,
    /\bchoice\s*([A-D])\b/i,
    /\b([A-D])\s*[\).:-]/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }

  return null;
}

export function formatQuestionBlock({ quiz = {}, storedQuiz = null, teachingText = "" } = {}) {
  const choices = quiz.choices || {};

  const questionText = [
    teachingText ? String(teachingText).trim() : null,
    teachingText ? "" : null,
    `Topic: ${quiz.topic || "Philippine Taxation"}`,
    `Difficulty: ${quiz.difficulty || 1}`,
    "",
    quiz.question || "Question unavailable.",
    "",
    `A. ${choices.A || ""}`,
    `B. ${choices.B || ""}`,
    `C. ${choices.C || ""}`,
    `D. ${choices.D || ""}`,
    "",
    "Reply with A, B, C, or D only.",
    storedQuiz?.id ? `Quiz ID: ${storedQuiz.id}` : null
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  return questionText.trim();
}

export async function resolveReplacementSource(source, supersessionData = null) {
  try {
    return await findReplacementForDocument(source, supersessionData);
  } catch {
    return null;
  }
}

export function askHelpersHealthCheck() {
  return {
    ok: true,
    module: "ask-helpers",
    version: ENGINE_VERSION,
    esmCompatible: true,
    supersessionCompatible: true,
    adaptiveCompatible: true,
    ragAnswerHandlerCompatible: true,
    serverCompatible: true,
    vectorStoreCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    controllingPrecedenceAware: true,
    hidesIssueMismatchedSources: true
  };
}

export default {
  MAX_VISIBLE_SOURCES,
  getUserId,
  getSourceTier,
  getAuthorityType,
  getControllingPrecedence,
  getFinalScore,
  normalizeSourceName,
  normalizeForMatch,
  getDocPath,
  getDocOriginalName,
  getDocText,
  cleanDisplayTitle,
  normalizeIssuanceNumber,
  normalizeIssuanceYear,
  extractIssuanceReference,
  detectIssuanceQuery,
  classifyQuestion,
  detectQuestionMode,
  buildMemoryContext,
  toSafeDbNumeric,
  isIssueMatched,
  isIssueMismatched,
  isTargetAuthorityMatched,
  shouldHideSourceFromUser,
  stripTrailingSourceSection,
  extractQuizAnswer,
  formatQuestionBlock,
  isHiddenSource,
  filterVisibleSources,
  deduplicateSources,
  sortSourcesByScore,
  processSources,
  buildVisibleSources,
  finalizeSourcesForResponse,
  resolveReplacementSource,
  askHelpersHealthCheck
};
