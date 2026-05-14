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
  "working_papers"
];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
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
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()\/-]/g, "")
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
    { type: "CONSTITUTION", regex: /\b(?:1987\s+constitution|constitution)\b/i },
    {
      type: "RR",
      regex: /\b(?:rr|revenue regulation)\s*(?:no\.?)?\s*(\d+)[-–](\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:rmc|revenue memorandum circular)\s*(?:no\.?)?\s*(\d+)[-–](\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:rmo|revenue memorandum order)\s*(?:no\.?)?\s*(\d+)[-–](\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex: /\b(?:ramo|revenue audit memorandum order)\s*(?:no\.?)?\s*(\d+)[-–](\d{2,4})\b/i
    },
    { type: "RA", regex: /\b(?:ra|republic act)\s*(?:no\.?)?\s*(\d+)\b/i },
    { type: "CASE", regex: /\bg\.?\s*r\.?\s*no\.?\s*([\w-]+)\b/i }
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

    return {
      type: pattern.type,
      normalized: match[0]
    };
  }

  return null;
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

export function isHiddenSource(doc = {}) {
  const path = lower(getDocPath(doc));
  return HIDDEN_FOLDER_PATTERNS.some((pattern) => path.includes(pattern));
}

export function filterVisibleSources(docs = []) {
  return safeArray(docs).filter((doc) => !isHiddenSource(doc));
}

export function deduplicateSources(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
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
  return [...docs].sort((a, b) => {
    const aScore = Number(
      a.finalScore ?? a.final_score ?? a.retrievalScore ?? a.retrieval_score ?? a.score ?? 0
    );

    const bScore = Number(
      b.finalScore ?? b.final_score ?? b.retrievalScore ?? b.retrieval_score ?? b.score ?? 0
    );

    return bScore - aScore;
  });
}

export function processSources(docs = []) {
  const supersession = applySupersessionFilter?.(docs || []) || {};

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
        null,
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
      regex: /\b(?:contract|agreement|transaction|economic substance|evidence)\b/i,
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
    version: "3.0.0",
    supersessionCompatible: true,
    adaptiveCompatible: true,
    rendererCompatible: true,
    plannerCompatible: true,
    quizCompatible: true,
    assessmentHandlerCompatible: true
  };
}

export default {
  MAX_VISIBLE_SOURCES,
  normalizeSourceName,
  normalizeForMatch,
  getDocPath,
  getDocOriginalName,
  getDocText,
  cleanDisplayTitle,
  normalizeIssuanceNumber,
  normalizeIssuanceYear,
  extractIssuanceReference,
  extractQuizAnswer,
  formatQuestionBlock,
  isHiddenSource,
  filterVisibleSources,
  deduplicateSources,
  sortSourcesByScore,
  processSources,
  buildVisibleSources,
  finalizeSourcesForResponse,
  detectQuestionMode,
  resolveReplacementSource,
  askHelpersHealthCheck
};
