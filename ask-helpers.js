// FILE: ask-helpers.js
"use strict";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  applySupersessionFilter,
  findReplacementForDocument
} = require("./supersession-engine.js");

export const MAX_VISIBLE_SOURCES = 5;

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
  return Array.isArray(value) ? value : [];
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
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}...[truncated]`
    : text;
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
    [doc.text, doc.content, doc.excerpt, doc.preview, doc.summary]
      .filter(Boolean)
      .join(" ")
  );
}

export function cleanDisplayTitle(doc = {}) {
  const raw =
    doc.title ||
    doc.source_title ||
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
      return {
        type: "RA",
        number: String(match[1]).replace(/^0+/, ""),
        normalized: `RA ${String(match[1]).replace(/^0+/, "")}`
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

  if (
    /\b(?:rr|rmc|rmo|ramo|revenue regulation|revenue memorandum|bir ruling|ra|republic act|nirc|tax code|g\.?\s*r\.?\s*no|cta)\b/i.test(text)
  ) {
    return "issuance";
  }

  if (
    /\b(?:vat|output vat|input vat|withholding|ewt|cwt|income tax|mcit|rcit|nolco|dst|percentage tax|excise)\b/i.test(text)
  ) {
    return "tax";
  }

  if (
    /\b(?:audit|afs|pfrs|pas|working paper|misstatement|qualified opinion|materiality|evidence|supporting document)\b/i.test(text)
  ) {
    return "audit";
  }

  if (
    /\b(?:case|litigation|court|jurisprudence|doctrine|cta|supreme court|protest|assessment|loa|pan|fan|fld)\b/i.test(text)
  ) {
    return "legal";
  }

  if (
    /\b(?:contract|agreement|lease|concession|principal|agent|economic substance|transaction|pass-through|reimbursement|bundled)\b/i.test(text)
  ) {
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
    {
      regex: /\b(?:audit|afs|pfrs|pas|working paper|misstatement|qualified opinion)\b/i,
      mode: "AUDIT"
    },
    {
      regex: /\b(?:tax|vat|bir|income tax|withholding|mcit|rcit|nolco)\b/i,
      mode: "TAX"
    },
    {
      regex: /\b(?:case|litigation|court|jurisprudence|doctrine|g\.?\s*r\.?\s*no)\b/i,
      mode: "LITIGATION"
    },
    {
      regex: /\b(?:reviewer|quiz|exam|cpale|bar exam|recall)\b/i,
      mode: "REVIEWER"
    },
    {
      regex: /\b(?:contract|agreement|transaction|economic substance|evidence|principal|agent|reimbursement|pass-through)\b/i,
      mode: "TRANSACTION"
    },
    {
      regex: /\b(?:business|strategy|financial model|valuation|irr|pricing)\b/i,
      mode: "BUSINESS"
    }
  ];

  for (const rule of rules) {
    if (rule.regex.test(text)) return rule.mode;
  }

  return "GENERAL";
}

export function getSourceTier(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  const type = String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      ""
  ).toUpperCase();

  const typeMap = {
    CONSTITUTION: 1,
    STATUTE: 2,
    RR: 3,
    RMC: 4,
    RMO: 5,
    RAMO: 6,
    BIR_RULING: 7,
    SUPREME_COURT: 8,
    CTA_EN_BANC: 9,
    COURT_OF_APPEALS: 10,
    CTA_DIVISION: 11,
    TREATY: 12,
    LGU: 13,
    SECONDARY: 99,
    UNKNOWN: 99
  };

  if (typeMap[type]) return typeMap[type];

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

  if (blob.includes("constitution")) return 1;

  if (
    blob.includes("national internal revenue code") ||
    blob.includes("tax code") ||
    blob.includes("republic act") ||
    /\bnirc\b/i.test(blob) ||
    /\bra\s*\d{4,6}\b/i.test(blob)
  ) {
    return 2;
  }

  if (
    blob.includes("revenue regulation") ||
    /\brr\s*\d+[-/]\d{2,4}\b/i.test(blob)
  ) {
    return 3;
  }

  if (
    blob.includes("revenue memorandum circular") ||
    /\brmc\s*\d+[-/]\d{2,4}\b/i.test(blob)
  ) {
    return 4;
  }

  if (
    blob.includes("revenue memorandum order") ||
    /\brmo\s*\d+[-/]\d{2,4}\b/i.test(blob)
  ) {
    return 5;
  }

  if (
    blob.includes("revenue audit memorandum order") ||
    /\bramo\s*\d+[-/]\d{2,4}\b/i.test(blob)
  ) {
    return 6;
  }

  if (blob.includes("bir ruling")) return 7;

  if (
    blob.includes("supreme court") ||
    /\bg\.?\s*r\.?\s*no\.?/i.test(blob)
  ) {
    return 8;
  }

  if (blob.includes("cta en banc")) return 9;
  if (blob.includes("court of appeals")) return 10;
  if (blob.includes("cta")) return 11;
  if (blob.includes("tax treaty")) return 12;
  if (blob.includes("local tax") || blob.includes("ordinance")) return 13;

  return 99;
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
  return isHiddenSource(doc);
}

export function filterVisibleSources(docs = []) {
  return safeArray(docs).filter((doc) => !isHiddenSource(doc));
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

export function sortSourcesByScore(docs = []) {
  return [...safeArray(docs)].sort((a, b) => {
    const aTier = getSourceTier(a);
    const bTier = getSourceTier(b);

    if (aTier !== bTier) return aTier - bTier;

    const aScore = Number(
      a.finalScore ??
        a.final_score ??
        a.retrievalScore ??
        a.retrieval_score ??
        a.score ??
        0
    );

    const bScore = Number(
      b.finalScore ??
        b.final_score ??
        b.retrievalScore ??
        b.retrieval_score ??
        b.score ??
        0
    );

    return bScore - aScore;
  });
}

export function processSources(docs = []) {
  let supersession = {};

  try {
    supersession =
      typeof applySupersessionFilter === "function"
        ? applySupersessionFilter(docs || [], new Date())
        : {};
  } catch {
    supersession = {};
  }

  const activeDocs =
    supersession.activeDocs?.length > 0 ? supersession.activeDocs : docs;

  return sortSourcesByScore(deduplicateSources(filterVisibleSources(activeDocs)));
}

export function buildVisibleSources(docs = []) {
  return processSources(docs)
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((doc) => ({
      title: cleanDisplayTitle(doc),
      source: getDocPath(doc),
      sourcePath: getDocPath(doc),
      sourceTitle: cleanDisplayTitle(doc),
      excerpt: getDocText(doc).slice(0, 500),
      authorityType:
        doc.authorityType ||
        doc.authority_type ||
        doc.metadata?.authorityType ||
        "UNKNOWN",
      authorityLevel:
        doc.authorityLevel ??
        doc.authority_level ??
        doc.metadata?.authorityLevel ??
        getSourceTier(doc),
      score:
        doc.finalScore ??
        doc.final_score ??
        doc.retrievalScore ??
        doc.retrieval_score ??
        doc.score ??
        0,
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
  return buildVisibleSources(docs).slice(0, Math.max(1, maxItems));
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
    version: "3.3.0",
    alignedWithVectorStoreVersion: "2.3.0",
    exports: {
      MAX_VISIBLE_SOURCES: true,
      getUserId: true,
      getSourceTier: true,
      normalizeSourceName: true,
      normalizeForMatch: true,
      toSafeDbNumeric: true,
      buildMemoryContext: true,
      classifyQuestion: true,
      detectIssuanceQuery: true,
      shouldHideSourceFromUser: true,
      stripTrailingSourceSection: true
    },
    supersessionCompatible: true,
    adaptiveCompatible: true,
    rendererCompatible: true,
    plannerCompatible: true,
    quizCompatible: true,
    assessmentHandlerCompatible: true,
    ragAnswerHandlerCompatible: true,
    serverCompatible: true,
    vectorStoreCompatible: true
  };
}

export default {
  MAX_VISIBLE_SOURCES,
  getUserId,
  getSourceTier,
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
