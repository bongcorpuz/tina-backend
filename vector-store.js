// FILE: vector-store.js
"use strict";

import { randomBytes } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

import { buildAuthorityMetadata, normalizeLegalReference } from "./authority-engine.js";
import { buildTaxConceptRetrievalAliases } from "./services/tax-concept-aliases.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY for vector-store.js");
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables for vector-store.js");
}

const ENGINE_VERSION = "3.0.0";

// Stable per-process identity for cross-instance lock attribution and log correlation.
// Prefers Render's injected instance ID, falls back to service ID, then a random hex token
// generated once at startup (survives within a single process lifetime).
// Named export — reindex-service.js and server.js import this directly.
export const INSTANCE_ID =
  process.env.RENDER_INSTANCE_ID ||
  process.env.RENDER_SERVICE_ID ||
  randomBytes(8).toString("hex");

// DB-backed lock table. Must be created manually in Supabase SQL editor (see SQL migration).
// Named export — reindex-service.js imports this for DB identity logs.
export const LOCK_TABLE = "tina_reindex_locks";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const defaultSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const CHUNK_SIZE = Number(process.env.VECTOR_CHUNK_SIZE || 1200);
const CHUNK_OVERLAP = Number(process.env.VECTOR_CHUNK_OVERLAP || 200);
const VECTOR_TABLE = process.env.VECTOR_TABLE || "tina_vector_store";
const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_TOP_K = Number(process.env.VECTOR_DEFAULT_TOP_K || 8);
const MAX_TOP_K = Number(process.env.VECTOR_MAX_TOP_K || 12);
const MAX_MATCH_COUNT = Number(process.env.VECTOR_MAX_MATCH_COUNT || 36);
const MAX_RETURN_TEXT_CHARS = Number(
  process.env.VECTOR_MAX_RETURN_TEXT_CHARS || 2200
);
const MAX_EMBED_INPUT_CHARS = Number(
  process.env.VECTOR_MAX_EMBED_INPUT_CHARS || 24000
);

// Supabase free-tier statement_timeout fires on large vector batches (50 rows × 1536-dim
// exceeds ~25–30 s with HNSW index updates). Smaller batches + inter-batch delay keep
// each INSERT well under the limit. Both values are env-overridable on Render.
const VECTOR_INSERT_BATCH_SIZE = Math.max(1, Math.min(50, Number(process.env.VECTOR_INSERT_BATCH_SIZE || 20)));
const VECTOR_INSERT_BATCH_DELAY_MS = Math.max(0, Number(process.env.VECTOR_INSERT_BATCH_DELAY_MS || 150));

console.info("[VECTOR INSERT CONFIG]", {
  batchSize: VECTOR_INSERT_BATCH_SIZE,
  batchDelayMs: VECTOR_INSERT_BATCH_DELAY_MS,
});

// One-time startup log: proves DB identity, table name, and instance/process details.
// Use this to diagnose mismatched Supabase projects, stale Render instances, and
// VECTOR_TABLE mis-configuration. Never logs secrets.
{
  const _supabaseUrl = process.env.SUPABASE_URL || "";
  const _supabaseHost = _supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const _supabaseProjectRef = _supabaseHost.split(".")[0] || null;
  console.info("[DB IDENTITY]", {
    supabaseUrlHost: _supabaseHost || null,
    supabaseProjectRef: _supabaseProjectRef || null,
    VECTOR_TABLE,
    LOCK_TABLE,
    vectorTableFromEnv: process.env.VECTOR_TABLE || null,
    vectorTableUsingDefault: !process.env.VECTOR_TABLE,
    vectorTableMatchExpected: VECTOR_TABLE === "tina_vector_store",
    NODE_ENV: process.env.NODE_ENV || null,
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || null,
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT || null,
    RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID || null,
    INSTANCE_ID,
    pid: process.pid,
    engineVersion: ENGINE_VERSION,
  });
}

const GOOGLE_DRIVE_PRIORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

const REVIEW_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

const ALL_INDEXED_FOLDERS = Object.freeze([
  ...GOOGLE_DRIVE_PRIORITY_FOLDERS,
  ...REVIEW_FOLDERS
]);

const WEAK_SOURCE_PATTERNS = Object.freeze([
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "working_papers",
  "drafts",
  "reviewer",
  "review_materials",
  "handout",
  "lecture notes"
]);

const ISSUE_TYPES = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  EVIDENTIARY: "EVIDENTIARY",
  PROCEDURAL: "PROCEDURAL",
  WITHHOLDING: "WITHHOLDING",
  INCOME_TAX: "INCOME_TAX",
  NAMED_LAW: "NAMED_LAW",
  CASE_LAW: "CASE_LAW",
  ISSUANCE: "ISSUANCE",
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  AUDIT: "AUDIT"
});

const AUTHORITY_FOLDER_MAP = Object.freeze({
  "01_TAX_CODE": {
    authorityType: "STATUTE",
    aliases: ["NIRC", "TAX_CODE", "STATUTE"]
  },
  "02_REVENUE_REGULATIONS": {
    authorityType: "RR",
    aliases: ["RR", "REVENUE_REGULATIONS"]
  },
  "03_RMC": {
    authorityType: "RMC",
    aliases: ["RMC", "REVENUE_MEMORANDUM_CIRCULAR"]
  },
  "04_RMO": {
    authorityType: "RMO",
    aliases: ["RMO", "REVENUE_MEMORANDUM_ORDER"]
  },
  "05_BIR_RULINGS": {
    authorityType: "BIR_RULING",
    aliases: ["BIR_RULING", "RULING"]
  },
  "06_COURT_CASES": {
    authorityType: "JURISPRUDENCE",
    aliases: ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "CASE_LAW"]
  },
  "07_CPA_NOTES": {
    authorityType: "CPA_NOTES",
    aliases: ["CPA_NOTES", "SECONDARY"]
  },
  "08_REVIEW_MATERIALS": {
    authorityType: "REVIEW_MATERIALS",
    aliases: ["REVIEW_MATERIALS", "SECONDARY"]
  }
});

const AUTHORITY_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  REPUBLIC_ACT: 2,
  CMTA: 2,
  LGC: 2,
  TAX_TREATY: 3,
  TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  JURISPRUDENCE: 5,
  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  RR: 8,
  RMC: 9,
  RMO: 9,
  RAMO: 9,
  BIR_RULING: 10,
  ADMINISTRATIVE_GUIDANCE: 11,
  BOC_ISSUANCE: 11,
  LGU_ORDINANCE: 11,
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

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function clampTopK(value = DEFAULT_TOP_K) {
  const parsed = Number(value || DEFAULT_TOP_K);
  if (!Number.isFinite(parsed)) return DEFAULT_TOP_K;
  return Math.max(1, Math.min(parsed, MAX_TOP_K));
}

function clampMatchCount(value = DEFAULT_TOP_K) {
  const parsed = Number(value || DEFAULT_TOP_K);
  if (!Number.isFinite(parsed)) return DEFAULT_TOP_K;
  return Math.max(1, Math.min(parsed, MAX_MATCH_COUNT));
}

function trimReturnText(value = "", maxChars = MAX_RETURN_TEXT_CHARS) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()} ...[trimmed for context budget]`;
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = compactSpaces(text);
  if (!clean) return [];

  const safeChunkSize = Math.max(300, Number(chunkSize) || CHUNK_SIZE);
  const safeOverlap = Math.max(
    0,
    Math.min(Number(overlap) || CHUNK_OVERLAP, safeChunkSize - 100)
  );

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + safeChunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();

    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;

    const nextStart = Math.max(0, end - safeOverlap);
    if (nextStart <= start) break;

    start = nextStart;
  }

  return chunks;
}

async function embedText(text) {
  const input = normalizeText(text);

  if (!input) {
    throw new Error("Text for embedding is required.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: input.slice(0, MAX_EMBED_INPUT_CHARS)
  });

  const embedding = response.data?.[0]?.embedding || [];

  if (!embedding.length) {
    throw new Error("OpenAI returned an empty embedding.");
  }

  // ── TEMP TRACE: [QUERY EMBEDDING] ────────────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[QUERY EMBEDDING] vector-store embedText", {
    inputLength:     input.length,
    embeddingLength: embedding.length,
    first5dims:      embedding.slice(0, 5)
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  return embedding;
}

function resolveSupabaseClient(client) {
  return client && typeof client.from === "function" ? client : defaultSupabase;
}

function isReviewMode(options = {}) {
  const mode = String(
    options.mode ||
      options.responseMode ||
      options.orchestrationMode ||
      options.queryIntent?.intent ||
      options.intent ||
      ""
  ).toUpperCase();

  return (
    options.reviewMode === true ||
    options.includeWeakSources === true ||
    options.includeReviewSources === true ||
    options.requiresReviewMode === true ||
    options.requiresQuizMode === true ||
    options.queryIntent?.requiresReviewMode === true ||
    options.queryIntent?.requiresQuizMode === true ||
    ["REVIEW_MODE", "TAX_REVIEWER", "QUIZ_MODE", "LEARNING_MODE", "ASSESSMENT"].includes(mode) ||
    String(options.query || options.originalQuery || "").toLowerCase().includes("/review")
  );
}

function parseSearchArgs(arg1, arg2, defaults = {}) {
  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    const reviewMode = isReviewMode(arg1);

    return {
      supabaseClient: resolveSupabaseClient(arg1.supabase || arg1.supabaseClient),
      query: String(arg1.query || arg1.keyword || ""),
      keyword: String(arg1.keyword || arg1.query || ""),
      topK: clampTopK(arg1.topK || arg1.limit || defaults.topK || DEFAULT_TOP_K),
      includeWeakSources: Boolean(arg1.includeWeakSources || reviewMode),
      includeReviewSources: Boolean(arg1.includeReviewSources || reviewMode),
      priorityFolders: safeArray(arg1.priorityFolders),
      excludedFolders: safeArray(arg1.excludedFolders),
      authorityTypes: safeArray(arg1.authorityTypes || arg1.expectedSourceTypes),
      domainCode: arg1.domainCode || arg1.primaryDomain || "",
      subIssue: arg1.subIssue || arg1.primarySubIssue || "",
      retrievalStrategy: arg1.retrievalStrategy || "",
      targetAuthorities: safeArray(arg1.targetAuthorities),
      controllingAuthorities: safeArray(arg1.controllingAuthorities),
      supportingAuthorities: safeArray(arg1.supportingAuthorities),
      supportingJurisprudence: safeArray(arg1.supportingJurisprudence),
      issueClassification: arg1.issueClassification || {},
      tpmProfile: arg1.tpmProfile || "",
      searchMode: arg1.searchMode || ""
    };
  }

  return {
    supabaseClient: defaultSupabase,
    query: String(arg1 || ""),
    keyword: String(arg1 || ""),
    topK: clampTopK(arg2 || defaults.topK || DEFAULT_TOP_K),
    includeWeakSources: false,
    includeReviewSources: false,
    priorityFolders: [],
    excludedFolders: [],
    authorityTypes: [],
    domainCode: "",
    subIssue: "",
    retrievalStrategy: "",
    targetAuthorities: [],
    controllingAuthorities: [],
    supportingAuthorities: [],
    supportingJurisprudence: [],
    issueClassification: {},
    tpmProfile: "",
    searchMode: ""
  };
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
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/[\\/]+/g, "/")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[\\/]/g, "-")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function normalizeAuthorityReference(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  return normalizeForMatch(raw)
    .replace(/\bnirc-sec(?:tion)?-?/g, "nirc-sec-")
    .replace(/\bsec(?:tion)?-?/g, "sec-")
    .replace(/\brevenue-regulation[s]?\b/g, "rr")
    .replace(/\brevenue-memorandum-circular[s]?\b/g, "rmc")
    .replace(/\brevenue-memorandum-order[s]?\b/g, "rmo")
    .replace(/\brr-0+(\d+)/g, "rr-$1")
    .replace(/\brmc-0+(\d+)/g, "rmc-$1")
    .replace(/\brmo-0+(\d+)/g, "rmo-$1")
    .replace(/\bramo-0+(\d+)/g, "ramo-$1")
    .replace(/-+/g, "-");
}

function normalizeYear(year = "") {
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

function expandYear(year = "") {
  const y = String(year || "").trim();
  if (!y) return [];

  if (y.length === 2) {
    const normalized = normalizeYear(y);
    const alternate = normalized.startsWith("20") ? `19${y}` : `20${y}`;
    return unique([normalized, alternate, y]);
  }

  return unique([y, y.slice(-2)]);
}

function padNumber(num = "") {
  const n = String(num || "").replace(/^0+/, "") || "0";
  return {
    raw: n,
    two: n.padStart(2, "0"),
    three: n.padStart(3, "0")
  };
}

function buildIssuanceKeywords(prefix, num, year, longName) {
  const n = padNumber(num);
  const years = expandYear(year);
  const keywords = [];

  for (const y of years) {
    for (const no of [n.raw, n.two, n.three]) {
      keywords.push(`${prefix}-${no}-${y}`);
      keywords.push(`${prefix}_${no}-${y}`);
      keywords.push(`${prefix}_${no}_${y}`);
      keywords.push(`${prefix} ${no}-${y}`);
      keywords.push(`${prefix} no ${no}-${y}`);
      keywords.push(`${prefix} no. ${no}-${y}`);
      keywords.push(`${longName} no. ${no}-${y}`);
      keywords.push(`${longName} ${no}-${y}`);
    }
  }

  return keywords;
}

function buildRepublicActKeywords(raNumber = "") {
  const clean = String(raNumber || "").replace(/\D/g, "");
  if (!clean) return [];

  return [
    `ra-${clean}`,
    `ra ${clean}`,
    `ra no ${clean}`,
    `ra no. ${clean}`,
    `republic act ${clean}`,
    `republic act no ${clean}`,
    `republic act no. ${clean}`
  ];
}

function buildCourtKeywords(kind = "", ref = "") {
  const cleanRef = String(ref || "").trim();
  if (!cleanRef) return [];

  if (kind === "SC") {
    return [
      `g.r. no. ${cleanRef}`,
      `gr no ${cleanRef}`,
      `gr-${cleanRef}`,
      `supreme court ${cleanRef}`
    ];
  }

  if (kind === "CTA") {
    return [
      `cta case no. ${cleanRef}`,
      `cta eb no. ${cleanRef}`,
      `cta-${cleanRef}`
    ];
  }

  if (kind === "CA") {
    return [
      `ca-g.r. ${cleanRef}`,
      `ca gr ${cleanRef}`,
      `court of appeals ${cleanRef}`
    ];
  }

  return [];
}

function buildNircSectionKeywords(section = "") {
  const clean = String(section || "").trim().replace(/\s+/g, "");
  if (!clean) return [];

  return unique([
    `nirc sec. ${clean}`,
    `nirc sec ${clean}`,
    `nirc section ${clean}`,
    `section ${clean} nirc`,
    `sec. ${clean} nirc`,
    `sec ${clean} nirc`,
    `nirc-${clean}`,
    `nirc-sec-${clean}`,
    `section-${clean}`,
    `sec-${clean}`
  ]);
}

// Returns raw (non-normalized) NIRC section strings that ILIKE-match the
// stored normalized_reference format "NIRC Sec. N" written by detectNircSectionHeading.
// Strips subsection qualifiers (e.g. "27(a)" → "27") because the heading detector
// captures only the base section number.
function buildNircSectionRawForms(section = "") {
  const base = String(section || "").trim().match(/^([0-9]{1,3}[A-Z]?)/)?.[1];
  if (!base) return [];
  return [
    `nirc sec. ${base}`,
    `nirc sec ${base}`,
    `nirc section ${base}`
  ];
}

// For a given lowercased topic string, returns an extra comma-prefixed OR-clause
// fragment that expands NIRC section queries to match stored "NIRC Sec. N" values.
// Returns an empty string when the topic is not a recognisable NIRC section reference.
function buildNircLightExpansion(topic = "") {
  const t = String(topic || "").trim();
  const m = t.match(/(?:^|(?:nirc[\s_-]+)?)sec(?:tion)?\.?\s+([0-9]{1,3}[A-Z]?)(?:\b|$)/i);
  if (!m) return "";
  const rawForms = buildNircSectionRawForms(m[1]);
  if (!rawForms.length) return "";
  return "," + rawForms.map(f => sanitizeMetadataSearchTerm(f)).filter(Boolean).map(f => `normalized_reference.ilike.%${f}%`).join(",");
}

// Returns a comma-prefixed OR-clause fragment for concept-based aliases.
// Searches normalized_reference, document_title, and source columns (indexed only).
// Input is the already-resolved alias array from buildTaxConceptRetrievalAliases.
function buildConceptAliasExpansion(aliases = []) {
  if (!aliases.length) return "";
  const fragments = [];
  for (const alias of aliases.slice(0, 8)) {
    const safeAlias = sanitizeMetadataSearchTerm(alias);
    if (!safeAlias) continue;
    fragments.push(
      `normalized_reference.ilike.%${safeAlias}%`,
      `document_title.ilike.%${safeAlias}%`,
      `source.ilike.%${safeAlias}%`
    );
  }
  if (!fragments.length) return "";
  return "," + fragments.join(",");
}

function buildPossibleSourceKeywords(query = "") {
  const q = String(query || "");
  const keywords = [];

  if (/\b(1987\s+constitution|1987\s+philippine\s+constitution|philippine\s+constitution)\b/i.test(q)) {
    keywords.push(
      "1987 constitution",
      "1987 philippine constitution",
      "constitution of the philippines"
    );
  }

  // Collect raw NIRC section forms (space+period format) separately so they survive
  // the normalizeForMatch step below and produce correct ILIKE patterns downstream.
  const nircRaw = [];
  const nircMatches = [...q.matchAll(/\b(?:NIRC\s*)?(?:Sec\.?|Section)\s*([0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?)\b/gi)];
  for (const match of nircMatches) {
    keywords.push(...buildNircSectionKeywords(match[1]));
    nircRaw.push(...buildNircSectionRawForms(match[1]));
  }

  const raMatch = q.match(/\b(?:RA|R\.A\.|Republic\s+Act(?:\s+No\.?)?)\s*0*(\d{4,6})\b/i);
  if (raMatch) keywords.push(...buildRepublicActKeywords(raMatch[1]));

  const issuancePatterns = [
    {
      prefix: "rr",
      longName: "revenue regulation",
      regex: /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "rmc",
      longName: "revenue memorandum circular",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "rmo",
      longName: "revenue memorandum order",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "ramo",
      longName: "revenue audit memorandum order",
      regex: /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    }
  ];

  for (const item of issuancePatterns) {
    const match = q.match(item.regex);
    if (match) keywords.push(...buildIssuanceKeywords(item.prefix, match[1], match[2], item.longName));
  }

  const grMatch = q.match(/\bg\.?\s*r\.?\s*no\.?\s*([A-Z0-9.-]+)\b/i);
  if (grMatch) keywords.push(...buildCourtKeywords("SC", grMatch[1]));

  const ctaMatch = q.match(/\bcta\s+(?:case|eb)?\s*(?:no\.?)?\s*([A-Z0-9.-]+)\b/i);
  if (ctaMatch) keywords.push(...buildCourtKeywords("CTA", ctaMatch[1]));

  // nircRaw entries are pre-normalized (space+period format) and must come first so
  // buildSourceIlikeFilters includes them as the original keyword → %nirc sec. N% ILIKE.
  return unique([...nircRaw, ...keywords.map(normalizeForMatch)].filter(Boolean));
}

function getFolderNameFromRow(row = {}) {
  const metadata = row.metadata || {};
  const path = String(
    metadata.folderName ||
      metadata.folder ||
      metadata.path ||
      metadata.originalSource ||
      row.original_source ||
      row.source ||
      ""
  );

  const normalized = path.toUpperCase();

  for (const folder of ALL_INDEXED_FOLDERS) {
    if (normalized.includes(folder)) return folder;
  }

  return metadata.folderName || metadata.folder || null;
}

function normalizeAuthorityType(value = "", row = {}) {
  const raw = String(value || "").trim().toUpperCase();

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    TAX_TREATY: "TREATY",
    TREATY: "TREATY",
    SC: "SUPREME_COURT",
    SUPREME_COURT_DIVISION: "SUPREME_COURT",
    CASE_LAW: "JURISPRUDENCE",
    COURT_CASES: "JURISPRUDENCE",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RULING: "BIR_RULING",
    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS"
  };

  if (raw && aliases[raw]) return aliases[raw];
  if (raw && AUTHORITY_PRECEDENCE[raw]) return raw;

  const folder = getFolderNameFromRow(row);
  if (folder && AUTHORITY_FOLDER_MAP[folder]) {
    return AUTHORITY_FOLDER_MAP[folder].authorityType;
  }

  return raw || "UNKNOWN";
}

function getAuthorityPrecedence(authorityType = "UNKNOWN") {
  return Number(
    AUTHORITY_PRECEDENCE[normalizeAuthorityType(authorityType)] ??
      AUTHORITY_PRECEDENCE.UNKNOWN
  );
}

function getAuthorityPriority(authorityType = "SECONDARY") {
  const precedence = getAuthorityPrecedence(authorityType);
  if (precedence === 99) return 0;
  return Math.max(1, 110 - precedence * 7);
}

function normalizeFolderList(values = []) {
  return unique(
    safeArray(values)
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean)
  );
}

function folderAllowed(row = {}, options = {}) {
  const includeReviewSources = Boolean(options.includeReviewSources || options.includeWeakSources);
  const folderName = getFolderNameFromRow(row);
  const priorityFolders = normalizeFolderList(options.priorityFolders || []);
  const excludedFolders = normalizeFolderList(options.excludedFolders || []);

  if (!includeReviewSources && folderName && REVIEW_FOLDERS.includes(folderName)) {
    return false;
  }

  if (excludedFolders.length && folderName && excludedFolders.includes(folderName)) {
    return false;
  }

  if (priorityFolders.length && folderName && !priorityFolders.includes(folderName)) {
    return false;
  }

  return true;
}

function authorityTypeAllowed(row = {}, options = {}) {
  const expected = normalizeFolderList(options.authorityTypes || []);
  if (!expected.length) return true;

  const authorityType = normalizeAuthorityType(
    row.authority_type || row.metadata?.authorityType,
    row
  );

  if (expected.includes(authorityType)) return true;

  const folder = getFolderNameFromRow(row);
  const aliases = folder ? AUTHORITY_FOLDER_MAP[folder]?.aliases || [] : [];

  return aliases.some((alias) => expected.includes(alias));
}

function detectTaxDomain(rowOrText = "") {
  const text =
    typeof rowOrText === "string"
      ? lower(rowOrText)
      : lower(buildRowSearchBlob(rowOrText));

  const domains = [];

  if (/\bvat|value[- ]added tax|input vat|output vat|zero[- ]rated|2550q|2550m\b/i.test(text)) domains.push("VAT");
  if (/\bcit|corporate income tax|rcit|mcit|nolco|regular corporate income tax\b/i.test(text)) domains.push("CIT");
  if (/\biit|individual income tax|compensation income|self-employed|professional income\b/i.test(text)) domains.push("IIT");
  if (/\bwht|withholding tax|ewt|cwt|fwt|expanded withholding|creditable withholding\b/i.test(text)) domains.push("WHT");
  if (/\bestate tax|estate\b/i.test(text)) domains.push("EST");
  if (/\bpercentage tax|pct\b/i.test(text)) domains.push("PCT");
  if (/\bexcise tax|excise\b/i.test(text)) domains.push("EXC");
  if (/\bassessment|loa|pan|fan|flda|preliminary assessment|final assessment\b/i.test(text)) domains.push("PRE");
  if (/\bprotest|appeal|cta|dispute|refund litigation\b/i.test(text)) domains.push("DIS");
  if (/\blocal business tax|real property tax|lgu|local tax\b/i.test(text)) domains.push("LGT");
  if (/\bcustoms|tariff|import duties|boc\b/i.test(text)) domains.push("CUS");
  if (/\bstamp tax|documentary stamp|dst\b/i.test(text)) domains.push("SPC");
  if (/\bcontract|lease|agreement|concession\b/i.test(text)) domains.push("CON");

  return unique(domains);
}

function detectPossibleSubIssues(rowOrText = "") {
  const text =
    typeof rowOrText === "string"
      ? lower(rowOrText)
      : lower(buildRowSearchBlob(rowOrText));

  const subIssues = [];

  if (/\bdefine vat|what is vat|nature of vat|scope of vat|sec\.?\s*105\b/i.test(text)) subIssues.push("DEFINITION");
  if (/\brefund|tax credit|tcc|sec\.?\s*112|120-day|30-day|administrative claim|judicial claim\b/i.test(text)) subIssues.push("REFUND_CREDIT");
  if (/\bzero[- ]rated|export sales|cross-border|destination principle|peza|create\b/i.test(text)) subIssues.push("ZERO_RATING");
  if (/\binput tax|input vat|creditable input|substantiation|sec\.?\s*110\b/i.test(text)) subIssues.push("INPUT_TAX");
  if (/\bexempt|sec\.?\s*109|vat exempt|non-vat\b/i.test(text)) subIssues.push("EXEMPTION");
  if (/\boutput vat|output tax|gross receipts|gross selling price|sec\.?\s*106|sec\.?\s*108\b/i.test(text)) subIssues.push("OUTPUT_TAX");
  if (/\bregistration|threshold|cor|sec\.?\s*236\b/i.test(text)) subIssues.push("REGISTRATION");
  if (/\b2550m|2550q|vat return|slsp|filing|deadline\b/i.test(text)) subIssues.push("COMPLIANCE");
  if (/\bwithholding vat|wvat|sec\.?\s*114\(c\)|government money payment\b/i.test(text)) subIssues.push("WITHHOLDING_VAT");
  if (/\btransitional input|beginning inventory|sec\.?\s*111\b/i.test(text)) subIssues.push("TRANSITIONAL_INPUT_TAX");
  if (/\bdeemed sale|sec\.?\s*106\(b\)|retirement|cessation\b/i.test(text)) subIssues.push("DEEMED_SALE");

  return unique(subIssues);
}

function buildRowSearchBlob(row = {}) {
  return compactSpaces(
    [
      row.text,
      row.content,
      row.source,
      row.original_source,
      row.document_title,
      row.normalized_reference,
      row.metadata?.path,
      row.metadata?.folder,
      row.metadata?.folderName,
      row.metadata?.documentTitle,
      row.metadata?.originalSource,
      row.metadata?.originalFileName,
      row.metadata?.title,
      row.metadata?.normalizedReference,
      ...(Array.isArray(row.normalized_aliases) ? row.normalized_aliases : []),
      ...(Array.isArray(row.metadata?.normalizedAliases) ? row.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isWeakSourceRow(row = {}) {
  const blob = lower(buildRowSearchBlob(row));
  return WEAK_SOURCE_PATTERNS.some((pattern) => blob.includes(pattern));
}

function detectIssueTypes(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(q), ISSUE_TYPES.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts|define vat|what is vat)\b/i.test(q), ISSUE_TYPES.VAT_LIABILITY);
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|support|invoicing)\b/i.test(q), ISSUE_TYPES.EVIDENTIARY);
  push(/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld|administrative claim|judicial claim)\b/i.test(q), ISSUE_TYPES.PROCEDURAL);
  push(/\b(withholding|ewt|expanded withholding|final withholding|fwt|creditable withholding)\b/i.test(q), ISSUE_TYPES.WITHHOLDING);
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction|gross income|taxable income)\b/i.test(q), ISSUE_TYPES.INCOME_TAX);
  push(/\b(create|train|eopt|ease of paying taxes|create more|republic act|ra no)\b/i.test(q), ISSUE_TYPES.NAMED_LAW);
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals|jurisprudence|case)\b/i.test(q), ISSUE_TYPES.CASE_LAW);
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(q), ISSUE_TYPES.ISSUANCE);
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), ISSUE_TYPES.CONTRACT);
  push(/\b(principal|agent|pass-through|reimbursement|bundled|economic substance|substance over form)\b/i.test(q), ISSUE_TYPES.TRANSACTION);
  push(/\b(audit|afs|pfrs|pas|misstatement|working paper)\b/i.test(q), ISSUE_TYPES.AUDIT);

  return unique(issues);
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    queryIssues.includes(ISSUE_TYPES.VAT_LIABILITY) &&
    docIssues.includes(ISSUE_TYPES.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPES.VAT_REFUND)
  ) return true;

  if (
    queryIssues.includes(ISSUE_TYPES.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPES.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPES.VAT_LIABILITY)
  ) return true;

  return false;
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function rowMatchesTargetAuthorities(row = {}, targetAuthorities = []) {
  if (!safeArray(targetAuthorities).length) return false;

  const blob = normalizeAuthorityReference(buildRowSearchBlob(row));

  return targetAuthorities.some((authority) => {
    const normalized = normalizeAuthorityReference(authority);
    return normalized && blob.includes(normalized);
  });
}

function rowMatchesIssueClassification(row = {}, options = {}) {
  const domainCode = String(options.domainCode || "").toUpperCase();
  const subIssue = String(options.subIssue || "").toUpperCase();

  const rowDomains = detectTaxDomain(row);
  const rowSubIssues = detectPossibleSubIssues(row);

  const domainOk = !domainCode || rowDomains.length === 0 || rowDomains.includes(domainCode);
  const subIssueOk = !subIssue || rowSubIssues.length === 0 || rowSubIssues.includes(subIssue);

  return domainOk && subIssueOk;
}

function enrichRowScore(row = {}, query = "", baseScore = 1, options = {}) {
  const queryIssues = detectIssueTypes(query);
  const rowIssues = detectIssueTypes(buildRowSearchBlob(row));
  const authorityType = normalizeAuthorityType(
    row.authority_type || row.metadata?.authorityType,
    row
  );
  const authorityLevel = Number(
    row.authority_level ||
      row.metadata?.authorityLevel ||
      getAuthorityPrecedence(authorityType)
  );
  const controllingPrecedence = Number(
    row.controlling_precedence ||
      row.metadata?.controllingPrecedence ||
      authorityLevel
  );

  let issueScore = 0;

  if (hasIssueMismatch(queryIssues, rowIssues)) issueScore -= 120;
  else if (hasIssueOverlap(queryIssues, rowIssues)) issueScore += 34;

  const authorityScore = getAuthorityPriority(authorityType);
  const weakPenalty = isWeakSourceRow(row) ? -75 : 0;
  const exactBonus = Number(row.citationMatchBonus || row.citation_match_bonus || 0) * 140;
  const targetBonus = rowMatchesTargetAuthorities(row, options.targetAuthorities) ? 80 : 0;
  const issueClassificationBonus = rowMatchesIssueClassification(row, options) ? 30 : 0;
  const precedenceBonus = controllingPrecedence <= 4 ? 42 : controllingPrecedence <= 8 ? 18 : 0;
  const folderBonus = folderAllowed(row, options) ? 12 : -80;
  const typeBonus = authorityTypeAllowed(row, options) ? 12 : -60;

  return Number(
    (
      Number(baseScore || 0) * 0.2 +
      authorityScore * 0.42 +
      issueScore +
      exactBonus +
      targetBonus +
      issueClassificationBonus +
      precedenceBonus +
      folderBonus +
      typeBonus +
      weakPenalty
    ).toFixed(4)
  );
}

function shouldSuppressRow(row = {}, query = "", options = {}) {
  if (!folderAllowed(row, options)) return true;
  if (!authorityTypeAllowed(row, options)) return true;
  if (!options.includeWeakSources && isWeakSourceRow(row)) return true;

  const queryIssues = detectIssueTypes(query);
  const rowIssues = detectIssueTypes(buildRowSearchBlob(row));

  return hasIssueMismatch(queryIssues, rowIssues);
}

function buildAuthorityFields(text, source, metadata = {}) {
  const authority = buildAuthorityMetadata({
    fileName: metadata.fileName || metadata.originalFileName || metadata.originalSource || source,
    path: metadata.path || source,
    text,
    modifiedTime: metadata.modifiedTime || metadata.recencyDate || null
  });

  const folderName = metadata.folderName || metadata.folder || getFolderNameFromRow({
    source,
    original_source: source,
    metadata
  });

  const folderAuthorityType = folderName
    ? AUTHORITY_FOLDER_MAP[folderName]?.authorityType
    : null;

  const authorityType = normalizeAuthorityType(
    metadata.authorityType || authority.authorityType || folderAuthorityType,
    { source, original_source: source, metadata }
  );

  const authorityLevel =
    Number(metadata.authorityLevel || authority.authorityLevel) ||
    getAuthorityPrecedence(authorityType);

  return {
    authority_type: authorityType,
    authority_level: authorityLevel,
    authority_score: authority.authorityScore,
    authority_label: authority.authorityLabel,
    controlling_precedence:
      Number(metadata.controllingPrecedence || authority.controllingPrecedence) ||
      getAuthorityPrecedence(authorityType),
    normalized_reference:
      metadata.normalizedReference ||
      authority.normalizedReference ||
      normalizeAuthorityReference(source),
    normalized_aliases: unique([
      ...(authority.normalizedAliases || []),
      ...buildPossibleSourceKeywords(source),
      ...buildPossibleSourceKeywords(text)
    ]),
    recency_date: authority.recencyDate || authority.modifiedTime || null,
    jurisdiction: metadata.jurisdiction || "PH",
    source_category: metadata.sourceCategory || null,
    document_title: metadata.documentTitle || metadata.originalFileName || metadata.originalSource || source,
    effective_from: metadata.effectiveFrom || null,
    effective_to: metadata.effectiveTo || null,
    is_superseded: Boolean(metadata.isSuperseded || false),
    superseded_by_reference: metadata.supersededByReference || null,
    repealed_by_reference: metadata.repealedByReference || null,
    amended_by_reference: metadata.amendedByReference || null,
    folder_name: folderName,
    tax_domain: metadata.taxDomain || metadata.domainCode || detectTaxDomain(text)[0] || null,
    possible_sub_issues: metadata.possibleSubIssues || detectPossibleSubIssues(text)
  };
}

function buildStoredMetadata(source, metadata, authorityFields) {
  return {
    ...metadata,
    originalSource: metadata.originalSource || source,
    originalFileName: metadata.originalFileName || metadata.fileName || metadata.originalSource || source,
    normalizedSource: metadata.normalizedSource || normalizeSourceName(source),
    storage: "supabase",
    authorityType: authorityFields.authority_type,
    authorityLevel: authorityFields.authority_level,
    authorityScore: authorityFields.authority_score,
    authorityLabel: authorityFields.authority_label,
    controllingPrecedence: authorityFields.controlling_precedence,
    normalizedReference: authorityFields.normalized_reference,
    normalizedAliases: authorityFields.normalized_aliases,
    recencyDate: authorityFields.recency_date,
    jurisdiction: authorityFields.jurisdiction,
    sourceCategory: authorityFields.source_category,
    documentTitle: authorityFields.document_title,
    effectiveFrom: authorityFields.effective_from,
    effectiveTo: authorityFields.effective_to,
    isSuperseded: authorityFields.is_superseded,
    supersededByReference: authorityFields.superseded_by_reference,
    repealedByReference: authorityFields.repealed_by_reference,
    amendedByReference: authorityFields.amended_by_reference,
    folderName: authorityFields.folder_name,
    taxDomain: authorityFields.tax_domain,
    possibleSubIssues: authorityFields.possible_sub_issues,
    tinaVectorStoreVersion: ENGINE_VERSION
  };
}

function buildSelectColumns() {
  return [
    "id",
    "source",
    "original_source",
    "chunk_index",
    "text",
    "metadata",
    "authority_type",
    "authority_level",
    "authority_score",
    "authority_label",
    "controlling_precedence",
    "normalized_reference",
    "normalized_aliases",
    "recency_date",
    "jurisdiction",
    "source_category",
    "document_title",
    "effective_from",
    "effective_to",
    "is_superseded",
    "superseded_by_reference",
    "repealed_by_reference",
    "amended_by_reference"
  ].join(",");
}

function buildResultKey(item = {}) {
  return [
    item.fileId,
    item.metadata?.fileId,
    item.normalizedReference,
    item.normalized_reference,
    item.title,
    item.documentTitle,
    item.source,
    item.originalSource,
    item.id,
    item.chunkIndex,
    item.chunk_index
  ]
    .filter(Boolean)
    .join("|");
}

function mapRowToResult(row, score = 1, query = "", options = {}) {
  const metadata = row.metadata || {};
  const folderName = getFolderNameFromRow(row);
  const authorityType = normalizeAuthorityType(
    row.authority_type || metadata.authorityType,
    row
  );

  const authorityLevel = Number(
    row.authority_level ||
      metadata.authorityLevel ||
      getAuthorityPrecedence(authorityType)
  );

  const authorityScore = Number(row.authority_score || metadata.authorityScore || 25);
  const authorityLabel = row.authority_label || metadata.authorityLabel || authorityType;
  const controllingPrecedence = Number(
    row.controlling_precedence ||
      metadata.controllingPrecedence ||
      authorityLevel ||
      getAuthorityPrecedence(authorityType)
  );

  const rawText = row.text || row.content || "";
  const trimmedText = trimReturnText(rawText);

  const issueTypes = detectIssueTypes(buildRowSearchBlob(row));
  const taxDomain = metadata.taxDomain || metadata.domainCode || detectTaxDomain(row)[0] || null;
  const possibleSubIssues = safeArray(metadata.possibleSubIssues).length
    ? safeArray(metadata.possibleSubIssues)
    : detectPossibleSubIssues(row);

  const normalizedReference =
    row.normalized_reference ||
    metadata.normalizedReference ||
    normalizeAuthorityReference(row.document_title || row.source || row.original_source || "");

  const normalizedAliases = unique([
    ...(Array.isArray(row.normalized_aliases) ? row.normalized_aliases : []),
    ...(Array.isArray(metadata.normalizedAliases) ? metadata.normalizedAliases : []),
    ...buildPossibleSourceKeywords(row.document_title || ""),
    ...buildPossibleSourceKeywords(row.source || ""),
    ...buildPossibleSourceKeywords(row.original_source || "")
  ]);

  const citationMatchBonus = Number(row.citationMatchBonus || row.citation_match_bonus || 0);
  const targetAuthorityMatch = rowMatchesTargetAuthorities(
    {
      ...row,
      normalized_reference: normalizedReference,
      normalized_aliases: normalizedAliases
    },
    options.targetAuthorities
  );

  const issueClassificationMatch = rowMatchesIssueClassification(
    {
      ...row,
      metadata: {
        ...metadata,
        taxDomain,
        possibleSubIssues
      }
    },
    options
  );

  const enrichedScore = enrichRowScore(
    {
      ...row,
      citationMatchBonus,
      normalized_reference: normalizedReference,
      normalized_aliases: normalizedAliases,
      metadata: {
        ...metadata,
        taxDomain,
        possibleSubIssues,
        authorityType
      }
    },
    query,
    row.score ?? row.similarity ?? score,
    options
  );

  const title =
    row.document_title ||
    metadata.documentTitle ||
    metadata.title ||
    metadata.originalFileName ||
    row.original_source ||
    row.source;

  const fileId = metadata.fileId || metadata.file_id || row.file_id || null;
  const driveViewUrl =
    metadata.driveViewUrl ||
    metadata.drive_view_url ||
    metadata.url ||
    row.drive_view_url ||
    null;

  return {
    id: row.id,
    fileId,
    file_id: fileId,

    title,
    documentTitle: title,
    document_title: title,

    source: row.source,
    originalSource: row.original_source || metadata.originalSource || row.source,
    original_source: row.original_source || metadata.originalSource || row.source,

    text: trimmedText,
    content: trimmedText,
    excerpt: trimmedText,

    citation: metadata.citation || normalizedReference || title,
    normalizedReference,
    normalized_reference: normalizedReference,

    url: metadata.url || driveViewUrl || null,
    driveViewUrl,
    drive_view_url: driveViewUrl,

    folderPath:
      metadata.folderPath ||
      metadata.path ||
      row.original_source ||
      row.source ||
      null,
    folder_path:
      metadata.folderPath ||
      metadata.path ||
      row.original_source ||
      row.source ||
      null,
    folderName,
    folder_name: folderName,

    authorityType,
    authority_type: authorityType,
    authorityLevel,
    authority_level: authorityLevel,
    authorityScore,
    authority_score: authorityScore,
    authorityLabel,
    authority_label: authorityLabel,
    controllingPrecedence,
    controlling_precedence: controllingPrecedence,

    taxDomain,
    tax_domain: taxDomain,
    possibleSubIssues,
    possible_sub_issues: possibleSubIssues,

    chunkIndex: row.chunk_index,
    chunk_index: row.chunk_index,

    issueTypes,
    issue_types: issueTypes,

    normalizedAliases,
    normalized_aliases: normalizedAliases,

    targetAuthorityMatch,
    target_authority_match: targetAuthorityMatch,
    issueClassificationMatch,
    issue_classification_match: issueClassificationMatch,

    searchMode: options.searchMode || row.searchMode || row.search_mode || "UNKNOWN",
    search_mode: options.searchMode || row.searchMode || row.search_mode || "UNKNOWN",

    score: row.score ?? row.similarity ?? score,
    similarity: row.similarity ?? row.score ?? score,
    retrievalScore: enrichedScore,
    retrieval_score: enrichedScore,
    finalScore: Math.max(Number(row.final_score ?? row.score ?? row.similarity ?? score), enrichedScore),
    final_score: Math.max(Number(row.final_score ?? row.score ?? row.similarity ?? score), enrichedScore),

    recencyDate: row.recency_date || metadata.recencyDate || null,
    recency_date: row.recency_date || metadata.recencyDate || null,
    effectiveFrom: row.effective_from || metadata.effectiveFrom || null,
    effective_from: row.effective_from || metadata.effectiveFrom || null,
    effectiveTo: row.effective_to || metadata.effectiveTo || null,
    effective_to: row.effective_to || metadata.effectiveTo || null,

    isSuperseded:
      typeof row.is_superseded === "boolean"
        ? row.is_superseded
        : Boolean(metadata.isSuperseded || false),
    is_superseded:
      typeof row.is_superseded === "boolean"
        ? row.is_superseded
        : Boolean(metadata.isSuperseded || false),
    supersededByReference: row.superseded_by_reference || metadata.supersededByReference || null,
    superseded_by_reference: row.superseded_by_reference || metadata.supersededByReference || null,
    repealedByReference: row.repealed_by_reference || metadata.repealedByReference || null,
    repealed_by_reference: row.repealed_by_reference || metadata.repealedByReference || null,
    amendedByReference: row.amended_by_reference || metadata.amendedByReference || null,
    amended_by_reference: row.amended_by_reference || metadata.amendedByReference || null,

    citationMatchBonus,
    citation_match_bonus: citationMatchBonus,

    metadata: {
      ...metadata,
      originalSource: metadata.originalSource || row.original_source || row.source,
      originalFileName: metadata.originalFileName || metadata.fileName || title,
      normalizedSource: metadata.normalizedSource || normalizeSourceName(row.source),
      path: metadata.path || row.original_source || row.source,
      fileId,
      driveViewUrl,
      folderName,
      folderPath: metadata.folderPath || metadata.path || row.original_source || row.source || null,
      authorityType,
      authorityLevel,
      authorityScore,
      authorityLabel,
      controllingPrecedence,
      normalizedReference,
      normalizedAliases,
      taxDomain,
      possibleSubIssues,
      issueTypes,
      retrievalScore: enrichedScore,
      targetAuthorityMatch,
      issueClassificationMatch,
      citationMatchBonus,
      tinaVectorStoreVersion: ENGINE_VERSION,
      compactOutput: true,
      originalTextLength: String(rawText || "").length,
      returnedTextLength: trimmedText.length,
      maxReturnTextChars: MAX_RETURN_TEXT_CHARS
    },

    compactOutput: true
  };
}

function sanitizeMetadataSearchTerm(value = "") {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/[,%()?!'"{}[\]\\:;]/g, " ")
    .replace(/[^a-z0-9.\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);

  if (clean.length < 2) return "";
  if (!/[a-z0-9]/.test(clean)) return "";
  return clean;
}

function buildSafeMetadataSearchTerms(keyword = "") {
  const normalizedKeyword = normalizeForMatch(keyword);
  const normalizedAuthority = normalizeAuthorityReference(keyword);
  const looseKeyword = String(keyword || "").replace(/-/g, "_");
  const rawTokens = String(keyword || "")
    .toLowerCase()
    .match(/\b[a-z0-9][a-z0-9._-]{2,}\b/g) || [];

  return unique([
    normalizedAuthority,
    normalizedKeyword,
    looseKeyword,
    ...rawTokens
  ].map(sanitizeMetadataSearchTerm).filter(Boolean))
    .filter((term) => term.length <= 64)
    .slice(0, 6);
}

function buildSourceIlikeFilters(keyword) {
  const terms = buildSafeMetadataSearchTerms(keyword);
  if (!terms.length) return "";

  return terms
    .flatMap((term) => [
      `source.ilike.%${term}%`,
      `original_source.ilike.%${term}%`,
      `document_title.ilike.%${term}%`,
      `normalized_reference.ilike.%${term}%`,
      `superseded_by_reference.ilike.%${term}%`,
      `repealed_by_reference.ilike.%${term}%`,
      `amended_by_reference.ilike.%${term}%`
    ])
    .join(",");
}

function sortResultsForTina(results = [], query = "", options = {}) {
  const queryIssues = detectIssueTypes(query);

  return [...results]
    .filter((row) => !shouldSuppressRow(row, query, options))
    .map((row) => ({
      ...row,
      retrievalScore:
        row.retrievalScore ??
        row.retrieval_score ??
        enrichRowScore(row, query, row.score, options),
      finalScore:
        row.finalScore ??
        row.final_score ??
        Math.max(Number(row.score || 0), enrichRowScore(row, query, row.score, options))
    }))
    .sort((a, b) => {
      const aTarget = a.targetAuthorityMatch || a.target_authority_match ? 1 : 0;
      const bTarget = b.targetAuthorityMatch || b.target_authority_match ? 1 : 0;
      if (bTarget !== aTarget) return bTarget - aTarget;

      const aIssue = a.issueClassificationMatch || a.issue_classification_match ? 1 : 0;
      const bIssue = b.issueClassificationMatch || b.issue_classification_match ? 1 : 0;
      if (bIssue !== aIssue) return bIssue - aIssue;

      const aExact = Number(a.citationMatchBonus || a.citation_match_bonus || 0);
      const bExact = Number(b.citationMatchBonus || b.citation_match_bonus || 0);
      if (bExact !== aExact) return bExact - aExact;

      const aMismatch = hasIssueMismatch(queryIssues, a.issueTypes || a.issue_types || []) ? 1 : 0;
      const bMismatch = hasIssueMismatch(queryIssues, b.issueTypes || b.issue_types || []) ? 1 : 0;
      if (aMismatch !== bMismatch) return aMismatch - bMismatch;

      const aPrecedence = Number(a.controllingPrecedence || a.controlling_precedence || 99);
      const bPrecedence = Number(b.controllingPrecedence || b.controlling_precedence || 99);
      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      const aLevel = Number(a.authorityLevel || a.authority_level || a.metadata?.authorityLevel || 99);
      const bLevel = Number(b.authorityLevel || b.authority_level || b.metadata?.authorityLevel || 99);
      if (aLevel !== bLevel) return aLevel - bLevel;

      const aScore = Number(a.retrievalScore || a.retrieval_score || a.finalScore || a.score || 0);
      const bScore = Number(b.retrievalScore || b.retrieval_score || b.finalScore || b.score || 0);

      return bScore - aScore;
    });
}

function uniqueResults(results = []) {
  const seen = new Set();
  const output = [];

  for (const item of results) {
    const key = buildResultKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

async function metadataSearch({
  supabaseClient,
  keyword,
  topK = DEFAULT_TOP_K,
  options = {},
  searchMode = "METADATA_SEARCH"
} = {}) {
  const safeTopK = clampTopK(topK);
  const limit = clampMatchCount(Math.max(safeTopK * 3, safeTopK));
  if (!keyword) return [];
  const orFilters = buildSourceIlikeFilters(keyword);
  if (!orFilters) {
    console.warn("[METADATA SEARCH SKIPPED]", {
      keyword: String(keyword || "").slice(0, 80),
      reason:  "no_safe_terms"
    });
    return [];
  }

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(buildSelectColumns())
    .or(orFilters)
    .order("authority_level", { ascending: true, nullsFirst: false })
    .order("chunk_index", { ascending: true })
    .limit(limit);

  if (error) {
    // Supabase error 57014 = statement_timeout.
    // The broad 14-condition ILIKE query (buildSourceIlikeFilters) with
    // JSON-extracted metadata columns causes full table scans when no
    // pg_trgm GIN indexes exist.  Catching here lets callers accumulate
    // whatever results arrived from earlier sub-term calls instead of
    // losing them all when the last call times out.
    if (error.code === "57014") {
      console.warn("[METADATA SEARCH TIMEOUT FALLBACK]", {
        keyword:  String(keyword || "").slice(0, 80),
        code:     error.code,
        note:     "statement_timeout — returning [] to preserve accumulated results"
      });
      return [];
    }
    console.error("Supabase metadata search error:", error);
    throw error;
  }

  return (data || [])
    .map((row) =>
      mapRowToResult(
        {
          ...row,
          citationMatchBonus: 1,
          searchMode
        },
        1,
        keyword,
        {
          ...options,
          searchMode
        }
      )
    )
    .filter((row) => !shouldSuppressRow(row, keyword, options));
}

export async function clearVectorStore(client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);

  const { error } = await supabaseClient
    .from(VECTOR_TABLE)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;

  return true;
}

// ── DB-backed reindex lock ────────────────────────────────────────────────────
//
// acquireReindexLock tries to INSERT a row into tina_reindex_locks with
// lock_name='global_reindex'. If the INSERT succeeds (HTTP 201) the lock is held
// by this job. If a unique-constraint violation (code 23505) is returned, another
// job holds the lock. Expired locks (expires_at < now()) are swept before the
// INSERT attempt so a crashed process does not block reindex permanently.
//
// The caller MUST call releaseReindexLock(jobId) in a finally block.
// If the tina_reindex_locks table does not exist the error is logged and the
// function returns { acquired: false, reason: "lock_error" } — the caller should
// proceed anyway (degraded mode) rather than blocking the entire reindex.

export async function acquireReindexLock(
  jobId,
  mode = "targeted",
  instanceId = INSTANCE_ID,
  client = defaultSupabase
) {
  const supabaseClient = resolveSupabaseClient(client);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30-minute TTL

  // Sweep any expired locks first so a crashed process doesn't block forever.
  // Fetch the stale row before deleting so we can log the takeover details.
  try {
    const now = new Date().toISOString();
    const { data: staleRows } = await supabaseClient
      .from(LOCK_TABLE)
      .select("job_id, mode, instance_id, expires_at")
      .eq("lock_name", "global_reindex")
      .lt("expires_at", now);

    if (staleRows?.length) {
      const stale = staleRows[0];
      console.warn("[REINDEX LOCK STALE TAKEOVER]", {
        newJobId: jobId,
        newInstanceId: instanceId,
        oldJobId: stale.job_id || null,
        oldMode: stale.mode || null,
        oldInstanceId: stale.instance_id || null,
        oldExpiresAt: stale.expires_at || null,
        note: "Stale lock swept — prior job likely crashed or lost heartbeat connectivity",
      });

      await supabaseClient
        .from(LOCK_TABLE)
        .delete()
        .eq("lock_name", "global_reindex")
        .lt("expires_at", now);
    }
  } catch (_sweepErr) {
    // Non-fatal: sweep failure should not block the acquire attempt.
  }

  const { error } = await supabaseClient
    .from(LOCK_TABLE)
    .insert({
      lock_name: "global_reindex",
      job_id: jobId,
      mode,
      instance_id: instanceId,
      expires_at: expiresAt,
      metadata: { pid: process.pid }
    });

  if (!error) {
    console.info("[REINDEX LOCK ACQUIRED]", {
      jobId,
      mode,
      instanceId,
      expiresAt,
      pid: process.pid
    });
    return { acquired: true, jobId };
  }

  if (error.code === "23505") {
    // Unique-constraint violation — another job holds the lock.
    const { data: existing } = await supabaseClient
      .from(LOCK_TABLE)
      .select("job_id, mode, instance_id, started_at, expires_at")
      .eq("lock_name", "global_reindex")
      .maybeSingle();

    console.warn("[REINDEX LOCK DENIED]", {
      jobId,
      mode,
      instanceId,
      existingJobId: existing?.job_id || null,
      existingMode: existing?.mode || null,
      existingInstance: existing?.instance_id || null,
      existingStartedAt: existing?.started_at || null,
      existingExpiresAt: existing?.expires_at || null,
    });
    return { acquired: false, reason: "lock_held", existingJobId: existing?.job_id || null };
  }

  // Table missing, RLS error, or other unexpected error.
  // Reindex will be rejected — caller must NOT proceed without a confirmed lock.
  console.error("[REINDEX LOCK ERROR]", {
    jobId,
    mode,
    instanceId,
    error: { message: error.message, code: error.code, details: error.details },
    note: "Reindex rejected — create tina_reindex_locks table and verify RLS policy"
  });
  return { acquired: false, reason: "lock_error", error: error.message };
}

export async function releaseReindexLock(jobId, client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);

  const { error } = await supabaseClient
    .from(LOCK_TABLE)
    .delete()
    .eq("lock_name", "global_reindex")
    .eq("job_id", jobId);

  if (error) {
    console.error("[REINDEX LOCK RELEASE ERROR]", {
      jobId,
      error: { message: error.message, code: error.code }
    });
    return false;
  }

  console.info("[REINDEX LOCK RELEASED]", { jobId });
  return true;
}

// Extends the lock's expires_at and updates heartbeat_at.
// Called on an interval while a reindex is running to prevent the 30-minute TTL from
// expiring on long jobs. The expired-lock sweep in acquireReindexLock checks expires_at,
// so as long as the heartbeat fires before expires_at passes, the lock remains valid
// and cannot be claimed by another instance.
// Returns { renewed: boolean, rowsUpdated: number, lostOwnership: boolean, reason: string|null }.
//
// lostOwnership:true signals the caller must abort the reindex immediately.
// Three outcomes that produce lostOwnership:true:
//   'heartbeat_error'  — Supabase returned an error on the UPDATE query.
//                        Treated identically to ownership loss (fail-closed):
//                        we cannot confirm the lock is still ours, so we abort.
//   'ownership_lost'   — UPDATE succeeded but matched 0 rows. The lock row is
//                        gone; another instance swept and claimed it.
//   null               — Success. renewed:true, lostOwnership:false.
export async function heartbeatReindexLock(jobId, client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);
  const now = new Date().toISOString();
  const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // +30 min

  // .select("lock_name") causes PostgREST to return the updated rows.
  // If data is an empty array, 0 rows matched → we lost lock ownership.
  const { data, error } = await supabaseClient
    .from(LOCK_TABLE)
    .update({ heartbeat_at: now, expires_at: newExpiresAt })
    .eq("lock_name", "global_reindex")
    .eq("job_id", jobId)
    .select("lock_name");

  if (error) {
    // Supabase error — cannot confirm lock is still ours. Treat as lost (fail-closed).
    // A transient network blip is unfortunate but acceptable: safety over availability.
    console.error("[REINDEX LOCK HEARTBEAT FAILED]", {
      jobId,
      reason: "heartbeat_error",
      error: { message: error.message, code: error.code },
      note: "Supabase heartbeat error — treating as lock lost (fail-closed)",
    });
    return { renewed: false, rowsUpdated: 0, lostOwnership: true, reason: "heartbeat_error" };
  }

  const rowsUpdated = Array.isArray(data) ? data.length : 0;
  const lostOwnership = rowsUpdated === 0;

  if (lostOwnership) {
    // Lock row is gone — another instance swept it after TTL expired.
    console.error("[REINDEX LOCK HEARTBEAT FAILED]", {
      jobId,
      reason: "ownership_lost",
      rowsUpdated,
      note: "UPDATE matched 0 rows — lock swept and claimed by another instance",
    });
    return { renewed: false, rowsUpdated: 0, lostOwnership: true, reason: "ownership_lost" };
  }

  console.info("[REINDEX LOCK HEARTBEAT]", { jobId, newExpiresAt, rowsUpdated });
  return { renewed: true, rowsUpdated, lostOwnership: false, reason: null };
}

export async function removeSourceFromVectorStore(source, client = defaultSupabase, jobId = null) {
  const supabaseClient = resolveSupabaseClient(client);
  const normalizedSource = normalizeSourceName(source);

  const response = await supabaseClient
    .from(VECTOR_TABLE)
    .delete()
    .eq("source", normalizedSource)
    .select("id");

  const { data, error, status, statusText } = response;

  // Log full Supabase response — dataIsNull:true means delete ran but RETURNING was skipped.
  console.info("[DELETE SOURCE]", {
    source: normalizedSource,
    table: VECTOR_TABLE,
    status,
    statusText,
    removedChunks: data?.length ?? null,
    dataIsNull: data === null,
    jobId: jobId || null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
  });

  if (error) throw error;

  return {
    source: normalizedSource,
    removedChunks: data?.length || 0
  };
}

// Deletes all rows whose source column matches the given SQL ILIKE pattern.
// Used during repair reindexes to purge historical source-name variants (underscores
// vs hyphens, parentheses variations) that would not be caught by the exact-match
// delete inside removeSourceFromVectorStore / addDocumentToVectorStore.
// NOT called during ordinary incremental indexing.
export async function removeSourceByPatternFromVectorStore(pattern, client = defaultSupabase, jobId = null) {
  const supabaseClient = resolveSupabaseClient(client);

  const response = await supabaseClient
    .from(VECTOR_TABLE)
    .delete()
    .ilike("source", pattern)
    .select("id");

  const { data, error, status, statusText } = response;

  // Log full Supabase response — dataIsNull:true means delete ran but RETURNING was skipped.
  console.info("[REMOVE BY PATTERN]", {
    pattern,
    table: VECTOR_TABLE,
    status,
    statusText,
    removedChunks: data?.length ?? null,
    dataIsNull: data === null,
    jobId: jobId || null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
  });

  if (error) throw error;

  return { pattern, removedChunks: data?.length || 0 };
}

// Returns the exact row count in the vector store for a given source value (eq match).
//
// Implementation note: deliberately avoids { count: "exact", head: true }.
// That approach depends on PostgREST returning a Content-Range header which the
// Supabase JS client then parses into `count`. If the header is absent or the
// client silently fails to parse it, `count` is null — null || 0 = 0 — and the
// abort gate never fires regardless of actual row count.
//
// Instead: fetch actual row IDs with select("id") and count data.length in JS.
// A 500-row NIRC table returns ~20 KB of UUIDs — small, fast, unambiguous.
export async function countSourceRows(source, client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);
  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select("id")
    .eq("source", source);
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

// Returns true when the document's identifiers (source name, file name, folder path)
// indicate this is the NIRC itself — not an RR or ruling that merely cites NIRC sections.
function isNircSourceDocument(source = "", metadata = {}) {
  const blob = lower([
    source,
    metadata.documentTitle,
    metadata.originalFileName,
    metadata.fileName,
    metadata.folderPath,
    metadata.path
  ].filter(Boolean).join(" "));
  return /nirc|national.internal.revenue.code/.test(blob);
}

// Detects a section heading in NIRC chunk text.
// Fires at start-of-string, after any line ending, after sentence-ending
// punctuation + 1-3 spaces, or after 2+ whitespace chars (e.g. paragraph indent).
// Matches:  "SEC. 109. Exempt Transactions."
//           "SEC. 111. Transitional/Presumptive Input Tax Credits"
//           "SEC. 84. Rates of Estate Tax."
//           "Section 109. Exempt Transactions."
//           "Sec. 109. Exempt Transactions."
//           "...previous text. SEC. 84. Rates of Estate Tax."
// Does NOT match inline citations like "pursuant to Sec. 109 of the Code"
// or "under Section 112" because those lack a period immediately after the
// section number — the trailing dot is the reliable heading discriminator.
function detectNircSectionHeading(chunkText = "") {
  const match = chunkText.match(
    /(?:^|[\r\n]|\.\s*|\s{2,})\s*(?:SEC(?:TION)?\.?)\s+([0-9]+[A-Z]?)\./i
  );
  if (!match) return null;
  return `NIRC Sec. ${match[1]}`;
}

// Extracts ALL NIRC section references found anywhere in chunk text —
// both headings (SEC. 109.) and inline citations (pursuant to Sec. 109).
// Used to populate metadata.mentionedReferences (citation index, not ownership).
// Returns a deduplicated array like ["NIRC Sec. 109", "NIRC Sec. 112"].
function extractMentionedNircRefs(chunkText = "") {
  const rx = /\b(?:SEC(?:TION)?\.?)\s+([0-9]+[A-Z]?)\b/gi;
  const seen = new Set();
  const refs = [];
  let m;
  while ((m = rx.exec(chunkText)) !== null) {
    const label = `NIRC Sec. ${m[1].toUpperCase()}`;
    if (!seen.has(label)) { seen.add(label); refs.push(label); }
  }
  return refs;
}

// Detects NIRC structural scope markers (TITLE, CHAPTER, SUBTITLE) in chunk text.
// Fires only on standalone headings (start-of-line / after newline / after sentence end).
// Returns an object with title_scope, chapter_scope, subtitle_scope (each null if absent).
function detectNircStructuralScope(chunkText = "") {
  const titleM    = chunkText.match(/(?:^|[\r\n]|\.\s{1,3}|\s{2,})\s*TITLE\s+([IVXLC]+|[0-9]+)\b/i);
  const chapterM  = chunkText.match(/(?:^|[\r\n]|\.\s{1,3}|\s{2,})\s*CHAPTER\s+([IVXLC]+|[0-9]+)\b/i);
  const subtitleM = chunkText.match(/(?:^|[\r\n]|\.\s{1,3}|\s{2,})\s*SUBTITLE\s+([A-Z]|[IVXLC]+|[0-9]+)\b/i);
  return {
    title_scope:    titleM    ? `NIRC Title ${titleM[1].toUpperCase()}`       : null,
    chapter_scope:  chapterM  ? `NIRC Chapter ${chapterM[1].toUpperCase()}`   : null,
    subtitle_scope: subtitleM ? `NIRC Subtitle ${subtitleM[1].toUpperCase()}` : null,
  };
}

export async function addDocumentToVectorStore(text, source, metadata = {}, client = defaultSupabase, { skipDelete = false, jobId = null, shouldAbort = null } = {}) {
  const supabaseClient = resolveSupabaseClient(client);
  const chunks = chunkText(text);
  const normalizedSource = normalizeSourceName(metadata.normalizedSource || source);

  // Confirm the same canonical key is used for both the pre-insert delete and the insert rows.
  console.log("[SOURCE CANONICAL]", {
    rawSource: source,
    metadataNormalizedSource: metadata.normalizedSource || null,
    canonicalSource: normalizedSource,
    jobId: jobId || null,
    note: "delete and insert both use canonicalSource",
  });

  if (!chunks.length) {
    return {
      source: normalizedSource,
      originalSource: source,
      chunksAdded: 0,
      reason: "No readable text chunks"
    };
  }

  if (!skipDelete) {
    await removeSourceFromVectorStore(normalizedSource, supabaseClient, jobId);
  }

  const rows = [];
  const isNirc = isNircSourceDocument(source, metadata);
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    // Per-chunk normalized_reference: detect NIRC section heading IN THIS CHUNK ONLY.
    // NO carry-forward — each chunk is independently scoped to prevent false metadata
    // pollution when a lastNircSection leaks into unrelated continuation text.
    // Non-NIRC documents (RR, RMC, court cases, etc.) are unaffected — isNirc stays false.
    let chunkNormalizedRef   = isNirc ? null : (metadata.normalizedReference || null);
    let chunkSectionScope    = null;
    let chunkSectionHeading  = null;
    let chunkTitleScope      = null;
    let chunkChapterScope    = null;
    let chunkSubtitleScope   = null;
    let chunkMentionedRefs   = [];

    if (isNirc) {
      const detectedSection = detectNircSectionHeading(chunk);
      if (detectedSection) {
        chunkNormalizedRef  = detectedSection;
        chunkSectionScope   = detectedSection;
        chunkSectionHeading = detectedSection;
        console.log("[SECTION SCOPE]", { chunkIndex: i, sectionScope: chunkSectionScope, source: normalizedSource });
      }
      const structural = detectNircStructuralScope(chunk);
      chunkTitleScope    = structural.title_scope;
      chunkChapterScope  = structural.chapter_scope;
      chunkSubtitleScope = structural.subtitle_scope;
      chunkMentionedRefs = extractMentionedNircRefs(chunk);
      if (!chunkSectionScope) {
        if (chunkMentionedRefs.length) {
          console.log("[MENTIONED REFS]", { chunkIndex: i, refs: chunkMentionedRefs, source: normalizedSource });
        } else {
          console.log("[REF NULL — UNKNOWN SCOPE]", {
            chunkIndex: i,
            source: normalizedSource,
            rowNormalizedReference: null,
            metadataNormalizedReference: null,
          });
        }
      }
    }

    const embedding = await embedText(chunk);

    const authorityFields = buildAuthorityFields(chunk, source, {
      ...metadata,
      normalizedSource,
      normalizedReference: chunkNormalizedRef
    });

    // Single source of truth for the normalized reference that goes into BOTH:
    //   1. the DB column  (row.normalized_reference)
    //   2. the JSON blob  (metadata.normalizedReference via buildStoredMetadata)
    //
    // NIRC rule:  heading detected in this chunk → chunkSectionScope (same as detectedSection)
    //             no heading detected            → null, unconditionally.
    //             document-level fallbacks (authority.normalizedReference,
    //             normalizeAuthorityReference(source)) are suppressed — they would
    //             assign "nirc-1997-ra-10963" to every continuation chunk.
    // Non-NIRC:   authorityFields fallback chain is correct and unchanged.
    const effectiveNormalizedReference = isNirc
      ? (chunkSectionScope || null)
      : authorityFields.normalized_reference;

    // Shallow-clone authorityFields with the effective reference so that
    // buildStoredMetadata writes metadata.normalizedReference = effectiveNormalizedReference,
    // not the unconstrained fallback value. All other authority fields are unchanged.
    const sanitizedAuthorityFields = {
      ...authorityFields,
      normalized_reference: effectiveNormalizedReference,
    };

    rows.push({
      source: normalizedSource,
      original_source: source,
      chunk_index: i,
      text: chunk,
      embedding,
      metadata: buildStoredMetadata(source, {
        ...metadata,
        normalizedSource,
        sectionScope:        chunkSectionScope,
        sectionHeading:      chunkSectionHeading,
        titleScope:          chunkTitleScope,
        chapterScope:        chunkChapterScope,
        subtitleScope:       chunkSubtitleScope,
        mentionedReferences: chunkMentionedRefs.length ? chunkMentionedRefs : undefined,
      }, sanitizedAuthorityFields),
      authority_type: authorityFields.authority_type,
      authority_level: authorityFields.authority_level,
      authority_score: authorityFields.authority_score,
      authority_label: authorityFields.authority_label,
      controlling_precedence: authorityFields.controlling_precedence,
      normalized_reference: effectiveNormalizedReference,
      normalized_aliases: authorityFields.normalized_aliases,
      recency_date: authorityFields.recency_date,
      jurisdiction: authorityFields.jurisdiction,
      source_category: authorityFields.source_category,
      document_title: authorityFields.document_title,
      effective_from: authorityFields.effective_from,
      effective_to: authorityFields.effective_to,
      is_superseded: authorityFields.is_superseded,
      superseded_by_reference: authorityFields.superseded_by_reference,
      repealed_by_reference: authorityFields.repealed_by_reference,
      amended_by_reference: authorityFields.amended_by_reference
    });
  }

  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / VECTOR_INSERT_BATCH_SIZE);

  for (let i = 0; i < rows.length; i += VECTOR_INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + VECTOR_INSERT_BATCH_SIZE);
    const batchNum = Math.floor(i / VECTOR_INSERT_BATCH_SIZE) + 1;

    // Lock-loss check before each batch insert.
    // shouldAbort is injected as () => lockState.lost from runDriveReindex / runTargetedReindex.
    // If the heartbeat confirmed ownership lost between batches, stop immediately.
    // No further rows are inserted after lock loss — the error propagates to the for-loop
    // catch in the caller, which records the failure and continues to finally/release.
    if (shouldAbort && shouldAbort()) {
      console.error("[BATCH INSERT ABORTED — LOCK LOST]", {
        source: normalizedSource,
        batch: batchNum,
        of: totalBatches,
        jobId: jobId || null,
        instanceId: INSTANCE_ID,
        note: "lockState.lost=true — heartbeat confirmed lock ownership lost; aborting batch insertion",
      });
      throw new Error(
        `[LOCK LOST] batch insert aborted — jobId=${jobId || "unknown"} ` +
        `source=${normalizedSource} batch=${batchNum}/${totalBatches}`
      );
    }

    console.info("[BATCH INSERT START]", {
      source: normalizedSource,
      batch: batchNum,
      of: totalBatches,
      size: batch.length,
      jobId: jobId || null
    });

    const { error } = await supabaseClient.from(VECTOR_TABLE).insert(batch);

    if (error) {
      console.error("[BATCH INSERT FAIL]", {
        source: normalizedSource,
        batch: batchNum,
        error: error.message,
        code: error.code,
        jobId: jobId || null
      });
      throw error;
    }

    inserted += batch.length;

    console.info("[BATCH INSERT SUCCESS]", {
      source: normalizedSource,
      batch: batchNum,
      of: totalBatches,
      inserted,
      remaining: rows.length - inserted,
      jobId: jobId || null
    });

    if (i + VECTOR_INSERT_BATCH_SIZE < rows.length && VECTOR_INSERT_BATCH_DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, VECTOR_INSERT_BATCH_DELAY_MS));
    }
  }

  return {
    source: normalizedSource,
    originalSource: source,
    chunksAdded: inserted,
    storage: "supabase",
    engineVersion: ENGINE_VERSION
  };
}

// ── Phase 3 exact-authority fast-path helpers ─────────────────────────────
//
// The old metadataSearch() path generates 14+ OR ILIKE patterns per term —
// including JSON-extracted metadata columns — and is called 12-16 times
// sequentially, causing Supabase timeouts on cold starts.
//
// These two helpers replace the first query with a single indexed
// .in("normalized_reference", refs) equality lookup.  Only if that lookup
// returns fewer than topK usable results does the code fall back to the
// original ILIKE metadataSearch path.
//
// buildNormalizedRefVariants() expands a list of human-readable authority
// strings into every format that may be stored in the normalized_reference
// column:
//   "NIRC Sec. 105"  → original + "NIRC_SEC_105" + aliases from normalizeLegalReference
//   "RR 16-2005"     → original + "RR_16_2005"   + aliases
// This handles both the per-chunk NIRC format stored by detectNircSectionHeading
// ("NIRC Sec. 105") and the normalized format produced by normalizeLegalReference
// ("NIRC_SEC_105"), covering whichever format was written during indexing.

function buildNormalizedRefVariants(terms = []) {
  const variants = [];
  for (const term of terms) {
    if (!term) continue;
    variants.push(term);                          // original form
    try {
      const nr = normalizeLegalReference(term);
      if (nr.normalized) variants.push(nr.normalized);  // e.g. "NIRC_SEC_105"
      for (const alias of (nr.aliases || [])) {
        if (alias) variants.push(alias);          // e.g. "NIRC Sec. 105", "Section 105"
      }
    } catch {
      // normalizeLegalReference is best-effort; failures are safe to ignore
    }
  }
  return unique(variants).filter(Boolean);
}

// fastRefLookup() executes the single indexed .in() query and maps rows
// through the same mapRowToResult + shouldSuppressRow pipeline as metadataSearch.
async function fastRefLookup({
  supabaseClient,
  refs = [],
  poolLimit,
  parsed = {},
  searchMode = "EXACT_AUTHORITY"
} = {}) {
  if (!refs.length) return [];
  // Cap at 64 values — well within Supabase's limit and avoids query bloat.
  const cleanRefs = unique(refs).filter(Boolean).slice(0, 64);
  if (!cleanRefs.length) return [];

  try {
    const { data, error } = await supabaseClient
      .from(VECTOR_TABLE)
      .select(buildSelectColumns())
      .in("normalized_reference", cleanRefs)
      .order("authority_level", { ascending: true, nullsFirst: false })
      .order("chunk_index",     { ascending: true })
      .limit(poolLimit);

    if (error) {
      console.warn("[FAST_REF_LOOKUP] Supabase error:", { message: error.message, code: error.code });
      return [];
    }

    const queryStr = parsed.query || parsed.keyword || "";
    return (data || [])
      .map((row) =>
        mapRowToResult(
          { ...row, citationMatchBonus: 1, searchMode },
          1,
          queryStr,
          { ...parsed, searchMode }
        )
      )
      .filter((row) => !shouldSuppressRow(row, queryStr, parsed));
  } catch (err) {
    console.warn("[FAST_REF_LOOKUP] exception:", err?.message || String(err));
    return [];
  }
}

// fastAuthorityReferenceLookup — supplemental indexed-column ILIKE lookup.
//
// Called by titleMetadataSearch when fastRefLookup (normalized_reference.in())
// returns 0 rows for a recognizable authority reference (RR, RMC, RMO, RAMO,
// NIRC section, RA, G.R. No., CTA case).  This can happen when the document was
// indexed without a populated normalized_reference value but is still findable
// via its source path or document_title.
//
// Queries ONLY four top-level columns that carry pg_trgm GIN indexes:
//   normalized_reference, source, original_source, document_title.
// Never touches metadata->>field JSON extractions — those are not GIN-indexed
// and are the source of the 57014 statement_timeout.
//
// Returns results through the same mapRowToResult + shouldSuppressRow pipeline
// as every other search helper.  Never throws.
async function fastAuthorityReferenceLookup({
  supabaseClient,
  keyword = "",
  poolLimit,
  parsed  = {},
  searchMode = "FAST_AUTHORITY_COLUMN"
} = {}) {
  if (!keyword || !supabaseClient) return [];

  // Build a narrow set of ILIKE terms.
  // normalizeForMatch produces the slug stored in source/original_source paths
  //   ("RR 16-2005" → "rr-16-2005" matches "02-revenue-regulations/.../rr-16-2005.pdf").
  // normalizeAuthorityReference adds any NIRC-specific transformations.
  // The raw keyword catches normalized_reference values written in the original
  //   citation format ("NIRC Sec. 105" stored literally by detectNircSectionHeading).
  const terms = unique([
    normalizeForMatch(keyword),
    normalizeAuthorityReference(keyword),
    keyword.trim()
  ]).filter(Boolean).slice(0, 4);

  if (!terms.length) return [];

  const orClauses = terms
    .flatMap(term => [
      `normalized_reference.ilike.%${term}%`,
      `source.ilike.%${term}%`,
      `original_source.ilike.%${term}%`,
      `document_title.ilike.%${term}%`
    ])
    .join(",");

  try {
    const { data, error } = await supabaseClient
      .from(VECTOR_TABLE)
      .select(buildSelectColumns())
      .or(orClauses)
      .order("authority_level", { ascending: true, nullsFirst: false })
      .order("chunk_index",     { ascending: true })
      .limit(poolLimit);

    if (error) {
      console.warn("[FAST_AUTHORITY_COLUMN_LOOKUP] Supabase error:", {
        message: error.message,
        code:    error.code
      });
      return [];
    }

    const queryStr = parsed.query || parsed.keyword || keyword;
    return (data || [])
      .map(row =>
        mapRowToResult(
          { ...row, citationMatchBonus: 1, searchMode },
          1,
          queryStr,
          { ...parsed, searchMode }
        )
      )
      .filter(row => !shouldSuppressRow(row, queryStr, parsed));
  } catch (err) {
    console.warn("[FAST_AUTHORITY_COLUMN_LOOKUP] exception:", err?.message || String(err));
    return [];
  }
}
// ── End Phase 3 helpers ───────────────────────────────────────────────────

// ── exactProvisionSearch ──────────────────────────────────────────────────
//
// Thin exported wrapper around fastRefLookup + buildNormalizedRefVariants.
// Called explicitly by pipeline.js Layer 3/4 dispatch for NIRC section and
// issuance-ref queries BEFORE the broad 14-condition ILIKE scan that causes
// Supabase 57014 statement_timeout errors.
//
// Design principles:
//   • Uses only the query/keyword supplied — does NOT expand to full issue-
//     classification targetAuthorities (that is exactAuthoritySearch's job).
//   • Never throws; fastRefLookup already swallows its own errors.
//   • Emits [EXACT PROVISION LOOKUP] / [HIT] / [MISS] for every call so
//     retrieval audits can confirm whether provision chunks were found.
export async function exactProvisionSearch(arg1, arg2) {
  const parsed   = parseSearchArgs(arg1, arg2, { topK: 8 });
  const { supabaseClient, query, keyword, topK } = parsed;

  const refs     = buildNormalizedRefVariants([keyword, query].filter(Boolean));
  const safeTopK = clampTopK(topK);
  const poolLimit = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  console.log("[EXACT PROVISION LOOKUP]", {
    query:     String(keyword || query || "").slice(0, 80),
    refsCount: refs.length,
    refs:      refs.slice(0, 8)
  });

  if (!refs.length) {
    console.log("[EXACT PROVISION LOOKUP MISS]", {
      query: String(keyword || query || "").slice(0, 80),
      note:  "buildNormalizedRefVariants returned no refs for this query"
    });
    return [];
  }

  const results = await fastRefLookup({
    supabaseClient,
    refs,
    poolLimit,
    parsed,
    searchMode: "EXACT_PROVISION"
  });

  if (results.length > 0) {
    console.log("[EXACT PROVISION LOOKUP HIT]", {
      query: String(keyword || query || "").slice(0, 80),
      found: results.length
    });
  } else {
    console.log("[EXACT PROVISION LOOKUP MISS]", {
      query:       String(keyword || query || "").slice(0, 80),
      refsQueried: refs.length,
      note:        "normalized_reference.in() returned no rows — re-index may be needed"
    });
  }

  return results;
}
// ── End exactProvisionSearch ──────────────────────────────────────────────

export async function exactAuthoritySearch(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const {
    supabaseClient,
    query,
    keyword,
    topK,
    targetAuthorities
  } = parsed;

  const safeTopK  = clampTopK(topK);
  const poolLimit = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  // ── Equality-only path: single indexed .in("normalized_reference", ...) ──
  //
  // Layer 1 MUST NOT fall back to broad metadataSearch / ILIKE.
  //
  // The ILIKE fallback over source + 14 JSON-extracted metadata fields generates
  // up to 60 OR conditions per keyword, all leading-wildcard (%term%), with no
  // pg_trgm GIN indexes.  Each call forces a full sequential scan of
  // tina_vector_store.  Called up to 12 times sequentially, this reliably
  // triggers Supabase error 57014 (statement_timeout).
  //
  // Resolution: accept fewer than topK results here.  The authority sufficiency
  // gate in collectCandidateDocs, plus Layer 2 (citation variant) and Layers
  // 3-5, will supplement if the exact equality scan returns fewer results than
  // needed.  Precision over recall is correct for Layer 1 exact authority lookup.
  const fastRefs = buildNormalizedRefVariants([
    keyword,
    query,
    ...targetAuthorities
  ]);

  const fastResults = await fastRefLookup({
    supabaseClient,
    refs:       fastRefs,
    poolLimit,
    parsed,
    searchMode: "EXACT_AUTHORITY"
  });

  const sorted = uniqueResults(
    sortResultsForTina(fastResults, query || keyword, parsed)
  ).slice(0, safeTopK);

  if (sorted.length >= safeTopK) {
    console.log("[EXACT AUTHORITY FAST RETURN]", {
      refsQueried: fastRefs.length,
      found:       sorted.length,
    });
  } else {
    console.log("[EXACT AUTHORITY NO BROAD FALLBACK]", {
      refsQueried: fastRefs.length,
      found:       sorted.length,
      needed:      safeTopK,
      note:        "returning equality results only — ILIKE fallback removed to prevent 57014 timeout",
    });
  }

  return sorted;
}

export async function normalizedCitationSearch(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const {
    supabaseClient,
    query,
    keyword,
    topK,
    targetAuthorities,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence
  } = parsed;

  const safeTopK  = clampTopK(topK);
  const poolLimit = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  // ── Equality-only path: single indexed .in("normalized_reference", ...) ──
  //
  // Layer 2 MUST NOT fall back to broad metadataSearch / ILIKE for the same
  // reason as Layer 1 — up to 16 sequential full-scan queries caused 57014.
  //
  // Compensation: the ref set is expanded to include ALL authority lists
  // (controlling + supporting + jurisprudence), not just target + controlling.
  // buildNormalizedRefVariants deduplicates and normalizes each term, so this
  // remains a single indexed .in() call — O(1) query cost regardless of how
  // many authority references are in the classification.
  //
  // Accept fewer than topK results here.  Layers 3-5 and semantic fallback
  // will supplement for broad topic queries where authority references are
  // indirect (e.g. "explain VAT like I am a business owner").
  const fastRefs = buildNormalizedRefVariants([
    keyword,
    query,
    ...targetAuthorities,
    ...controllingAuthorities,
    ...supportingAuthorities,
    ...supportingJurisprudence
  ]);

  const fastResults = await fastRefLookup({
    supabaseClient,
    refs:       fastRefs,
    poolLimit,
    parsed,
    searchMode: "NORMALIZED_CITATION"
  });

  const sorted = uniqueResults(
    sortResultsForTina(fastResults, query || keyword, parsed)
  ).slice(0, safeTopK);

  if (sorted.length >= safeTopK) {
    console.log("[CITATION VARIANT FAST RETURN]", {
      refsQueried: fastRefs.length,
      found:       sorted.length,
    });
  } else {
    console.log("[CITATION VARIANT NO BROAD FALLBACK]", {
      refsQueried: fastRefs.length,
      found:       sorted.length,
      needed:      safeTopK,
      note:        "returning equality results only — ILIKE fallback removed to prevent 57014 timeout",
    });
  }

  return sorted;
}

// Returns true when the input string is a recognizable numbered authority reference —
// an RR, RMC, RMO, RAMO, NIRC section, Republic Act, G.R. No., or CTA case number.
// Used by titleMetadataSearch to skip the slow metadataSearch ILIKE fallback when
// fastRefLookup already found at least one matching row for that reference.
// Deliberately narrow: broad topic words like "VAT" or "withholding tax" return false.
function isRecognizableAuthorityReference(input = "") {
  const s = String(input || "");
  return (
    // RR: "RR 16-2005", "Revenue Regulation No. 16-2005", "Revenue Regulations 16-2005"
    /\b(?:RR|Revenue\s+Regulations?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    // RMC: "RMC 65-2012", "Revenue Memorandum Circular No. 65-2012"
    /\b(?:RMC|Revenue\s+Memorandum\s+Circulars?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    // RMO: "RMO 23-2010", "Revenue Memorandum Order No. 23-2010"
    /\b(?:RMO|Revenue\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    // RAMO: "RAMO 1-95", "Revenue Audit Memorandum Order No. 1-95"
    /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    // NIRC/Tax Code section: "NIRC Sec. 105", "NIRC Section 105", "Tax Code Sec. 105"
    /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)\s+sec(?:tion)?\.?\s*\d{1,3}[A-Z]?\b/i.test(s) ||
    // Flipped form: "Sec. 105 of the NIRC", "Section 105 NIRC"
    /\bsec(?:tion)?\.?\s*\d{1,3}[A-Z]?\s+(?:of\s+(?:the\s+)?)?(?:nirc|tax\s+code)\b/i.test(s) ||
    // G.R. No.: "G.R. No. 199422"
    /\bg\.?\s*r\.?\s*no\.?\s*\d/i.test(s) ||
    // CTA cases: "CTA Case No. 123", "CTA EB No. 456"
    /\bcta\s+(?:eb\s+)?(?:case\s+)?no\.?\s*\d/i.test(s) ||
    // Republic Act: "RA 9337", "R.A. 9337", "Republic Act No. 9337"
    /\b(?:RA|R\.A\.|Republic\s+Act)\s*(?:No\.?)?\s*\d{4,6}\b/i.test(s)
  );
}

export async function titleMetadataSearch(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const { supabaseClient, query, keyword, topK } = parsed;
  const safeTopK  = clampTopK(topK);
  const poolLimit = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  // ── Exact provision fast-path ──────────────────────────────────────────────
  // For NIRC sections, RR/RMC/RMO issuance refs, and other recognizable authority
  // strings, buildNormalizedRefVariants produces 3–6 canonical forms that map
  // directly to the normalized_reference column via indexed .in() equality lookup.
  //
  // If the exact lookup returns ≥ topK/2 results the broad ILIKE loop below is
  // skipped entirely — this prevents the 14+ OR-condition full-table scans in
  // buildSourceIlikeFilters (which include non-indexable metadata->>field JSON
  // extractions) from triggering Supabase error 57014 (statement_timeout).
  //
  // For broad non-provision queries ("VAT refund prescriptive period",
  // "withholding tax on professional fees", etc.) buildNormalizedRefVariants
  // returns only the raw string, fastRefLookup returns 0 rows immediately
  // (O(1) indexed miss), and execution falls through to the slow path unchanged.
  const exactRefs    = buildNormalizedRefVariants([keyword, query].filter(Boolean));
  const exactResults = exactRefs.length
    ? await fastRefLookup({
        supabaseClient,
        refs:      exactRefs,
        poolLimit,
        parsed,
        searchMode: "TITLE_METADATA_EXACT"
      })
    : [];

  if (exactResults.length > 0 && isRecognizableAuthorityReference(keyword || query)) {
    console.log("[TITLE METADATA EXACT AUTHORITY RETURN]", {
      query:      String(keyword || query || "").slice(0, 80),
      exactFound: exactResults.length,
      topK:       safeTopK,
    });
    return uniqueResults(
      sortResultsForTina(exactResults, query || keyword, parsed)
    ).slice(0, safeTopK);
  }
  if (exactResults.length >= Math.max(1, Math.floor(safeTopK / 2))) {
    console.log("[METADATA SEARCH SKIPPED FOR EXACT PROVISION]", {
      query:        String(keyword || query || "").slice(0, 80),
      exactFound:   exactResults.length,
      topK:         safeTopK,
      skippedIlike: true
    });
    return uniqueResults(
      sortResultsForTina(exactResults, query || keyword, parsed)
    ).slice(0, safeTopK);
  }
  // ── End exact provision fast-path ─────────────────────────────────────────

  // ── Supplemental column lookup for recognized authority references ──────────
  // Fires only when fastRefLookup (normalized_reference.in()) found nothing AND
  // the keyword is a recognizable numbered authority citation.  Queries four
  // GIN-indexed top-level columns via ILIKE — no metadata JSON extraction —
  // so it avoids 57014 timeouts regardless of table size.
  if (exactResults.length === 0 && isRecognizableAuthorityReference(keyword || query)) {
    const columnResults = await fastAuthorityReferenceLookup({
      supabaseClient,
      keyword:    keyword || query,
      poolLimit,
      parsed,
      searchMode: "FAST_AUTHORITY_COLUMN"
    });
    if (columnResults.length > 0) {
      console.log("[FAST AUTHORITY COLUMN LOOKUP HIT]", {
        query:       String(keyword || query || "").slice(0, 80),
        columnFound: columnResults.length,
        topK:        safeTopK,
      });
      return uniqueResults(
        sortResultsForTina(columnResults, query || keyword, parsed)
      ).slice(0, safeTopK);
    }
    console.log("[FAST AUTHORITY COLUMN LOOKUP MISS]", {
      query: String(keyword || query || "").slice(0, 80),
      note:  "no rows in top-level columns — falling through to metadataSearch",
    });
  }
  // ── End supplemental column lookup ─────────────────────────────────────────

  const terms = unique([
    keyword,
    query,
    ...buildPossibleSourceKeywords(query),
    ...buildPossibleSourceKeywords(keyword)
  ]).filter(Boolean);

  // Start with any partial exact results (0 to topK/2 - 1) already collected.
  const results = [...exactResults];

  for (const term of terms.slice(0, 10)) {
    // metadataSearch catches Supabase error 57014 (statement_timeout) internally
    // and returns [] rather than throwing.  Earlier accumulated results are
    // preserved even if a later term times out.
    const matches = await metadataSearch({
      supabaseClient,
      keyword: term,
      topK,
      options: parsed,
      searchMode: "TITLE_METADATA"
    });

    results.push(...matches);
  }

  return uniqueResults(sortResultsForTina(results, query || keyword, parsed)).slice(0, safeTopK);
}

export async function searchSimilar(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 5 });
  const { supabaseClient, query, topK } = parsed;

  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return [];

  const safeTopK = clampTopK(topK);
  const matchCount = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  const queryEmbedding = await embedText(cleanQuery);

  // ── TEMP TRACE: [RPC PARAMS] vector-store searchSimilar ──────────────────
  // Remove after retrieval audit is complete.
  console.log("[RPC PARAMS] vector-store searchSimilar", {
    rpcName:         "match_tina_vectors",
    matchCount,
    matchThreshold:  0.0,
    embeddingLength: Array.isArray(queryEmbedding) ? queryEmbedding.length : "n/a",
    filter_metadata: {}
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  const { data, error } = await supabaseClient.rpc("match_tina_vectors", {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: matchCount,
    filter_metadata: {}
  });

  // ── TEMP TRACE: [RPC RESULTS] vector-store searchSimilar ─────────────────
  // Remove after retrieval audit is complete.
  console.log("[RPC RESULTS] vector-store searchSimilar", {
    error:    error ? { message: error.message, code: error.code } : null,
    rowCount: (data || []).length,
    sample:   (data || []).slice(0, 2).map(r => ({
      id:                   r.id,
      score:                r.similarity ?? r.score ?? null,
      authority_type:       r.authority_type ?? null,
      normalized_reference: String(r.normalized_reference || "").slice(0, 60)
    }))
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  if (error) {
    console.error("Supabase vector search error:", error);
    throw error;
  }

  const mapped = (data || [])
    .map((row) =>
      mapRowToResult(row, row.score, cleanQuery, {
        ...parsed,
        searchMode: parsed.searchMode || "SEMANTIC_VECTOR"
      })
    )
    .filter((row) => !shouldSuppressRow(row, cleanQuery, parsed));

  return uniqueResults(sortResultsForTina(mapped, cleanQuery, parsed)).slice(0, safeTopK);
}

export async function semanticVectorSearch(arg1, arg2) {
  return searchSimilar(arg1, arg2);
}

export async function searchBySourceName(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const { supabaseClient, keyword, topK } = parsed;

  if (!keyword) return [];

  const mapped = await metadataSearch({
    supabaseClient,
    keyword,
    topK,
    options: parsed,
    searchMode: "SOURCE_NAME"
  });

  return uniqueResults(sortResultsForTina(mapped, keyword, parsed)).slice(0, clampTopK(topK));
}

export async function searchIndexedSources(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const { query, keyword, topK } = parsed;
  const cleanQuery = normalizeText(query || keyword);
  if (!cleanQuery) return [];

  const exact = await exactAuthoritySearch({
    ...parsed,
    query: cleanQuery,
    topK
  });

  const normalized = exact.length >= clampTopK(topK)
    ? []
    : await normalizedCitationSearch({
        ...parsed,
        query: cleanQuery,
        topK
      });

  const title = exact.length + normalized.length >= clampTopK(topK)
    ? []
    : await titleMetadataSearch({
        ...parsed,
        query: cleanQuery,
        topK
      });

  const semantic = exact.length + normalized.length + title.length >= clampTopK(topK)
    ? []
    : await semanticVectorSearch({
        ...parsed,
        query: cleanQuery,
        topK
      });

  const merged = uniqueResults(
    sortResultsForTina(
      [
        ...exact,
        ...normalized,
        ...title,
        ...semantic
      ],
      cleanQuery,
      parsed
    )
  );

  return merged.slice(0, clampTopK(topK));
}

export async function smartSearch(arg1, arg2) {
  return searchIndexedSources(arg1, arg2);
}

// Lightweight quiz source query — uses only indexed columns, no metadata JSON extraction.
// Avoids the metadata->>field ilike pattern that causes Postgres statement timeouts (code 57014).
export async function getQuizSourceChunksLight({
  topic = "",
  limit = 3,
  supabase: suppliedSupabase = defaultSupabase
} = {}) {
  const supabaseClient = resolveSupabaseClient(suppliedSupabase);
  const cleanTopic = String(topic || "").trim().toLowerCase();
  if (!cleanTopic) return [];

  const EXCLUDED_AUTHORITY_TYPES = new Set(["CPA_NOTES", "REVIEW_MATERIALS", "UNKNOWN"]);
  const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 3)), 5);
  const safeTopic = sanitizeMetadataSearchTerm(cleanTopic);
  if (!safeTopic) return [];
  const pattern = `%${safeTopic}%`;
  const nircExpansion = buildNircLightExpansion(cleanTopic);
  const conceptAliases = buildTaxConceptRetrievalAliases(cleanTopic);
  const conceptExpansion = buildConceptAliasExpansion(conceptAliases);

  if (conceptAliases.length) {
    console.info("[RETRIEVAL ALIASES]", { mode: "QUIZ", topic: cleanTopic, aliases: conceptAliases });
  }

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(
      "id,source,original_source,document_title,authority_type,authority_level,normalized_reference,chunk_index,text,metadata"
    )
    .or(`source.ilike.${pattern},document_title.ilike.${pattern},normalized_reference.ilike.${pattern}${nircExpansion}${conceptExpansion}`)
    .order("authority_level", { ascending: true, nullsFirst: false })
    .limit(safeLimit * 3);

  if (error) {
    console.error("[QUIZ LIGHT SEARCH] Supabase error:", { message: error.message, code: error.code });
    return [];
  }

  const authorityFiltered = (data || []).filter(
    (row) => !EXCLUDED_AUTHORITY_TYPES.has(row.authority_type)
  );

  if (conceptAliases.length) {
    if (authorityFiltered.length > 0) {
      console.info("[LIGHT RETRIEVAL HIT]", { mode: "QUIZ", topic: cleanTopic, aliasCount: conceptAliases.length, resultCount: authorityFiltered.length });
    } else {
      console.info("[LIGHT RETRIEVAL MISS]", { mode: "QUIZ", topic: cleanTopic, aliasCount: conceptAliases.length });
    }
  }

  return authorityFiltered.slice(0, safeLimit).map((row) => {
    const meta = row.metadata || {};
    const driveViewUrl = meta.driveViewUrl || meta.drive_view_url || meta.url || null;
    return {
      id: row.id,
      source: row.source,
      original_source: row.original_source,
      title: row.document_title || row.original_source || row.source || "Quiz Source",
      document_title: row.document_title,
      authorityType: row.authority_type || "UNKNOWN",
      authority_type: row.authority_type,
      authority_level: row.authority_level,
      citation: row.normalized_reference || "",
      normalized_reference: row.normalized_reference,
      chunk_index: row.chunk_index,
      url: driveViewUrl || "",
      driveViewUrl: driveViewUrl || "",
      drive_view_url: driveViewUrl || "",
      text: trimReturnText(row.text || ""),
      content: trimReturnText(row.text || ""),
      excerpt: trimReturnText(row.text || ""),
      metadata: meta,
      score: 0.7,
      sourceTitle: row.document_title || row.original_source || row.source,
      sourcePath: meta.path || row.original_source || row.source,
      fileId: meta.fileId || meta.file_id || null,
      compactOutput: true
    };
  });
}

export async function getQuizSourceChunks({
  topic = "",
  excludeSourcePaths = [],
  excludeChunkIds = [],
  limit = 5,
  supabase: suppliedSupabase = defaultSupabase
} = {}) {
  const supabaseClient = resolveSupabaseClient(suppliedSupabase);
  const cleanTopic = String(topic || "").trim();
  const safeLimit = clampTopK(limit);

  // Fast path: simple indexed-column query — avoids metadata JSON scan timeout
  const lightResults = await getQuizSourceChunksLight({
    topic: cleanTopic,
    limit: safeLimit,
    supabase: supabaseClient
  });

  const applyExclusions = (rows) =>
    rows.filter((row) => {
      const path = row.sourcePath || row.metadata?.path || row.original_source || row.source || "";
      const chunkId = String(row.id || "");
      if (excludeSourcePaths.includes(path)) return false;
      if (excludeChunkIds.includes(chunkId)) return false;
      return (row.text || "").trim().length >= 50;
    });

  const filtered = applyExclusions(lightResults).slice(0, safeLimit);

  // If light query returned enough, use it directly
  if (filtered.length >= Math.min(safeLimit, 2)) {
    return filtered;
  }

  // Fall back to smartSearch only when light query returns too little.
  // Internal 3000ms budget prevents smartSearch from consuming the outer 5000ms timeout.
  try {
    const rows = await Promise.race([
      smartSearch({
        supabase: supabaseClient,
        query: cleanTopic || "Philippine taxation",
        topK: Math.max(safeLimit * 2, 6),
        includeWeakSources: false,
        includeReviewSources: false,
        reviewMode: false
      }),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("smartSearch budget exceeded")), 3000)
      )
    ]);

    const fallbackFiltered = applyExclusions(rows).slice(0, safeLimit);

    return fallbackFiltered.map((row) => ({
      ...row,
      text: trimReturnText(row.text),
      content: trimReturnText(row.content || row.text),
      excerpt: trimReturnText(row.excerpt || row.text),
      sourceTitle:
        row.documentTitle ||
        row.document_title ||
        row.metadata?.documentTitle ||
        row.metadata?.originalFileName ||
        row.original_source ||
        row.source,
      sourcePath: row.metadata?.path || row.original_source || row.source,
      fileId: row.metadata?.fileId || row.metadata?.file_id || null,
      compactOutput: true
    }));
  } catch (fallbackError) {
    console.error("[QUIZ SOURCE CHUNKS] smartSearch fallback failed:", fallbackError?.message);
    return filtered;
  }
}

// Lightweight review source query — mirrors getQuizSourceChunksLight but allows
// CPA_NOTES and REVIEW_MATERIALS as secondary sources. UNKNOWN is always excluded.
// Do NOT use this for /quiz — quiz exclusion policy is enforced by getQuizSourceChunks().
export async function getReviewSourceChunks({
  topic = "",
  excludeSourcePaths = [],
  excludeChunkIds = [],
  limit = 4,
  supabase: suppliedSupabase = defaultSupabase
} = {}) {
  const supabaseClient = resolveSupabaseClient(suppliedSupabase);
  const cleanTopic = String(topic || "").trim();
  const cleanTopicLower = cleanTopic.toLowerCase();
  if (!cleanTopicLower) return [];

  const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 4)), 6);
  const safeTopic = sanitizeMetadataSearchTerm(cleanTopicLower);
  if (!safeTopic) return [];
  const pattern = `%${safeTopic}%`;
  const nircExpansion = buildNircLightExpansion(cleanTopicLower);
  const conceptAliases = buildTaxConceptRetrievalAliases(cleanTopicLower);
  const conceptExpansion = buildConceptAliasExpansion(conceptAliases);

  if (conceptAliases.length) {
    console.info("[RETRIEVAL ALIASES]", { mode: "REVIEW", topic: cleanTopicLower, aliases: conceptAliases });
  }

  // Reviewer source types allowed as secondary (authority_level 14).
  // Primary sources are everything else that is not UNKNOWN.
  const REVIEWER_TYPES = new Set(["CPA_NOTES", "REVIEW_MATERIALS", "SECONDARY"]);

  // Light retrieval — same indexed columns as /quiz, but only UNKNOWN is excluded.
  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(
      "id,source,original_source,document_title,authority_type,authority_level,normalized_reference,chunk_index,text,metadata"
    )
    .or(`source.ilike.${pattern},document_title.ilike.${pattern},normalized_reference.ilike.${pattern}${nircExpansion}${conceptExpansion}`)
    .neq("authority_type", "UNKNOWN")
    .order("authority_level", { ascending: true, nullsFirst: false })
    .limit(safeLimit * 3);

  if (error) {
    console.error("[REVIEW LIGHT SEARCH] Supabase error:", { message: error.message, code: error.code });
  }

  function shapeRow(row) {
    const meta = row.metadata || {};
    const driveViewUrl = meta.driveViewUrl || meta.drive_view_url || meta.url || null;
    return {
      id: row.id,
      source: row.source,
      original_source: row.original_source,
      title: row.document_title || row.original_source || row.source || "Review Source",
      document_title: row.document_title,
      authorityType: row.authority_type || "UNKNOWN",
      authority_type: row.authority_type,
      authority_level: row.authority_level,
      citation: row.normalized_reference || "",
      normalized_reference: row.normalized_reference,
      chunk_index: row.chunk_index,
      url: driveViewUrl || "",
      driveViewUrl: driveViewUrl || "",
      drive_view_url: driveViewUrl || "",
      text: trimReturnText(row.text || ""),
      content: trimReturnText(row.text || ""),
      excerpt: trimReturnText(row.text || ""),
      metadata: meta,
      score: 0.7,
      sourceTitle: row.document_title || row.original_source || row.source,
      sourcePath: meta.path || row.original_source || row.source,
      fileId: meta.fileId || meta.file_id || null,
      compactOutput: true
    };
  }

  const applyExclusions = (rows) =>
    rows.filter((row) => {
      const path = row.sourcePath || row.metadata?.path || row.original_source || row.source || "";
      const chunkId = String(row.id || "");
      if (excludeSourcePaths.includes(path)) return false;
      if (excludeChunkIds.includes(chunkId)) return false;
      return (row.text || "").trim().length >= 50;
    });

  const shaped = (data || []).map(shapeRow);
  const primaryFiltered = applyExclusions(shaped.filter((r) => !REVIEWER_TYPES.has(r.authority_type)));
  const secondaryFiltered = applyExclusions(shaped.filter((r) => REVIEWER_TYPES.has(r.authority_type)));

  // Primary fills first; secondary supplements only when primary is insufficient.
  let results;
  if (primaryFiltered.length >= safeLimit) {
    results = primaryFiltered.slice(0, safeLimit);
  } else {
    const remaining = safeLimit - primaryFiltered.length;
    results = [...primaryFiltered, ...secondaryFiltered.slice(0, remaining)];
  }

  if (results.length > 0) {
    const primaryCount = results.filter((r) => !REVIEWER_TYPES.has(r.authority_type)).length;
    const secondaryCount = results.filter((r) => REVIEWER_TYPES.has(r.authority_type)).length;
    if (conceptAliases.length) {
      console.info("[LIGHT RETRIEVAL HIT]", { mode: "REVIEW", topic: cleanTopic, aliasCount: conceptAliases.length, resultCount: results.length });
    }
    console.info("[REVIEW SOURCE CHUNKS] Grounded retrieval", {
      topic: cleanTopic,
      primaryCount,
      secondaryCount,
      totalCount: results.length
    });
    return results;
  }

  if (conceptAliases.length) {
    console.info("[LIGHT RETRIEVAL MISS]", { mode: "REVIEW", topic: cleanTopic, aliasCount: conceptAliases.length });
  }

  // Fallback: smartSearch with reviewer sources included. 3000ms internal budget.
  console.warn("[REVIEW SOURCE CHUNKS] Fallback retrieval", {
    topic: cleanTopic,
    reason: "light query returned no usable results"
  });

  try {
    const fallbackRows = await Promise.race([
      smartSearch({
        supabase: supabaseClient,
        query: cleanTopic || "Philippine taxation",
        topK: Math.max(safeLimit * 2, 6),
        includeWeakSources: true,
        includeReviewSources: true,
        reviewMode: true
      }),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("review smartSearch budget exceeded")), 3000)
      )
    ]);

    const fallbackShaped = applyExclusions(
      (fallbackRows || [])
        .filter((r) => (r.authority_type || "UNKNOWN") !== "UNKNOWN")
        .map((row) => ({
          ...row,
          text: trimReturnText(row.text),
          content: trimReturnText(row.content || row.text),
          excerpt: trimReturnText(row.excerpt || row.text),
          sourceTitle:
            row.documentTitle ||
            row.document_title ||
            row.metadata?.documentTitle ||
            row.metadata?.originalFileName ||
            row.original_source ||
            row.source,
          sourcePath: row.metadata?.path || row.original_source || row.source,
          fileId: row.metadata?.fileId || row.metadata?.file_id || null,
          compactOutput: true
        }))
    );

    const fallbackPrimary = fallbackShaped.filter((r) => !REVIEWER_TYPES.has(r.authority_type));
    const fallbackSecondary = fallbackShaped.filter((r) => REVIEWER_TYPES.has(r.authority_type));

    let fallbackResults;
    if (fallbackPrimary.length >= safeLimit) {
      fallbackResults = fallbackPrimary.slice(0, safeLimit);
    } else {
      const remaining = safeLimit - fallbackPrimary.length;
      fallbackResults = [...fallbackPrimary, ...fallbackSecondary.slice(0, remaining)];
    }

    return fallbackResults;
  } catch (fallbackError) {
    console.error("[REVIEW SOURCE CHUNKS] smartSearch fallback failed:", fallbackError?.message);
    return [];
  }
}

export async function getVectorStoreStats(client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);

  const { count, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      storage: "supabase",
      error: error.message,
      chunks: 0,
      sources: 0,
      sourceNames: []
    };
  }

  const sourceRows = [];
  const pageSize = 1000;
  for (let from = 0; from < Math.max(count || 0, 1); from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error: sourceError } = await supabaseClient
      .from(VECTOR_TABLE)
      .select("source")
      .range(from, to);

    if (sourceError) {
      return {
        storage: "supabase",
        chunks: count || 0,
        sources: 0,
        sourceNames: [],
        error: sourceError.message
      };
    }

    sourceRows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const sourceNames = [
    ...new Set((sourceRows || []).map((row) => row.source).filter(Boolean))
  ];

  return {
    storage: "supabase",
    chunks: count || 0,
    sources: sourceNames.length,
    sourceNames,
    embeddingModel: EMBEDDING_MODEL,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    maxTopK: MAX_TOP_K,
    maxMatchCount: MAX_MATCH_COUNT,
    maxReturnTextChars: MAX_RETURN_TEXT_CHARS,
    vectorTable: VECTOR_TABLE,
    engineVersion: ENGINE_VERSION,
    googleDrivePriorityFolders: GOOGLE_DRIVE_PRIORITY_FOLDERS,
    reviewFolders: REVIEW_FOLDERS
  };
}

export function vectorStoreHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VECTOR_STORE",
    version: ENGINE_VERSION,
    embeddingModel: EMBEDDING_MODEL,
    vectorTable: VECTOR_TABLE,

    supportsExactAuthoritySearch: true,
    supportsNormalizedCitationSearch: true,
    supportsTitleMetadataSearch: true,
    supportsSemanticVectorSearch: true,
    supportsFolderAwareSearch: true,
    supportsAuthorityTypeAwareSearch: true,
    supportsTaxDomainMetadata: true,
    supportsSubIssueMetadata: true,

    googleDriveFolderPriorityAware: true,
    authorityHierarchyMetadataAware: true,
    exactCitationPriority: true,
    issueMismatchSuppression: true,
    controllingPrecedenceAware: true,

    supabaseCompatible: true,
    adaptiveRetrievalCompatible: true,
    retrievalEngineCompatible: true,
    rerankerCompatible: true,
    contextOrchestrationCompatible: true,

    retrievalLimitsEnabled: true,
    oversizedChunkReturnPrevented: true,
    compactOutput: true,

    noOpenAIAnswerCalls: true,
    noAnswerGeneration: true,
    noRetrievalPolicyDuplication: true,

    maxTopK: MAX_TOP_K,
    maxMatchCount: MAX_MATCH_COUNT,
    maxReturnTextChars: MAX_RETURN_TEXT_CHARS
  };
}

export default {
  clearVectorStore,
  acquireReindexLock,
  releaseReindexLock,
  heartbeatReindexLock,
  INSTANCE_ID,
  LOCK_TABLE,
  removeSourceFromVectorStore,
  removeSourceByPatternFromVectorStore,
  countSourceRows,
  addDocumentToVectorStore,

  exactAuthoritySearch,
  normalizedCitationSearch,
  titleMetadataSearch,
  semanticVectorSearch,
  searchIndexedSources,

  searchSimilar,
  searchBySourceName,
  smartSearch,

  getQuizSourceChunks,
  getQuizSourceChunksLight,
  getReviewSourceChunks,
  getVectorStoreStats,

  normalizeSourceName,
  normalizeAuthorityReference,
  vectorStoreHealthCheck
};
