// FILE: vector-store.js
"use strict";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

import { buildAuthorityMetadata } from "./authority-engine.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY for vector-store.js");
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables for vector-store.js");
}

const ENGINE_VERSION = "3.0.0";

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

  const nircMatches = [...q.matchAll(/\b(?:NIRC\s*)?(?:Sec\.?|Section)\s*([0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?)\b/gi)];
  for (const match of nircMatches) {
    keywords.push(...buildNircSectionKeywords(match[1]));
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

  return unique(keywords.map(normalizeForMatch).filter(Boolean));
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
    TREATY: "TAX_TREATY",
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

function buildSourceIlikeFilters(keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);
  const normalizedAuthority = normalizeAuthorityReference(keyword);
  const looseKeyword = String(keyword || "").replace(/-/g, "_");
  const terms = unique([normalizedKeyword, normalizedAuthority, looseKeyword, keyword].filter(Boolean));

  return terms
    .flatMap((term) => [
      `source.ilike.%${term}%`,
      `original_source.ilike.%${term}%`,
      `document_title.ilike.%${term}%`,
      `metadata->>originalSource.ilike.%${term}%`,
      `metadata->>originalFileName.ilike.%${term}%`,
      `metadata->>documentTitle.ilike.%${term}%`,
      `metadata->>title.ilike.%${term}%`,
      `metadata->>normalizedSource.ilike.%${term}%`,
      `metadata->>path.ilike.%${term}%`,
      `metadata->>folderPath.ilike.%${term}%`,
      `metadata->>normalizedReference.ilike.%${term}%`,
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

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(buildSelectColumns())
    .or(buildSourceIlikeFilters(keyword))
    .order("authority_level", { ascending: true, nullsFirst: false })
    .order("chunk_index", { ascending: true })
    .limit(limit);

  if (error) {
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

export async function removeSourceFromVectorStore(source, client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);
  const normalizedSource = normalizeSourceName(source);

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .delete()
    .eq("source", normalizedSource)
    .select("id");

  if (error) throw error;

  return {
    source: normalizedSource,
    removedChunks: data?.length || 0
  };
}

export async function addDocumentToVectorStore(text, source, metadata = {}, client = defaultSupabase) {
  const supabaseClient = resolveSupabaseClient(client);
  const chunks = chunkText(text);
  const normalizedSource = normalizeSourceName(metadata.normalizedSource || source);

  if (!chunks.length) {
    return {
      source: normalizedSource,
      originalSource: source,
      chunksAdded: 0,
      reason: "No readable text chunks"
    };
  }

  await removeSourceFromVectorStore(normalizedSource, supabaseClient);

  const rows = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);

    const authorityFields = buildAuthorityFields(chunk, source, {
      ...metadata,
      normalizedSource
    });

    rows.push({
      source: normalizedSource,
      original_source: source,
      chunk_index: i,
      text: chunk,
      embedding,
      metadata: buildStoredMetadata(source, { ...metadata, normalizedSource }, authorityFields),
      authority_type: authorityFields.authority_type,
      authority_level: authorityFields.authority_level,
      authority_score: authorityFields.authority_score,
      authority_label: authorityFields.authority_label,
      controlling_precedence: authorityFields.controlling_precedence,
      normalized_reference: authorityFields.normalized_reference,
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

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabaseClient.from(VECTOR_TABLE).insert(batch);

    if (error) {
      console.error("Supabase vector insert error:", error);
      throw error;
    }

    inserted += batch.length;
  }

  return {
    source: normalizedSource,
    originalSource: source,
    chunksAdded: inserted,
    storage: "supabase",
    engineVersion: ENGINE_VERSION
  };
}

export async function exactAuthoritySearch(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const {
    supabaseClient,
    query,
    keyword,
    topK,
    targetAuthorities
  } = parsed;

  const searchTerms = unique([
    keyword,
    query,
    ...targetAuthorities,
    ...buildPossibleSourceKeywords(query),
    ...buildPossibleSourceKeywords(keyword)
  ]).filter(Boolean);

  const results = [];

  for (const term of searchTerms.slice(0, 12)) {
    const matches = await metadataSearch({
      supabaseClient,
      keyword: term,
      topK,
      options: parsed,
      searchMode: "EXACT_AUTHORITY"
    });

    results.push(...matches);
  }

  return uniqueResults(sortResultsForTina(results, query || keyword, parsed)).slice(0, clampTopK(topK));
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

  const terms = unique([
    keyword,
    query,
    ...targetAuthorities,
    ...controllingAuthorities,
    ...supportingAuthorities,
    ...supportingJurisprudence
  ])
    .flatMap((term) => [
      term,
      normalizeAuthorityReference(term),
      normalizeForMatch(term),
      ...buildPossibleSourceKeywords(term)
    ])
    .filter(Boolean);

  const results = [];

  for (const term of unique(terms).slice(0, 16)) {
    const matches = await metadataSearch({
      supabaseClient,
      keyword: term,
      topK,
      options: parsed,
      searchMode: "NORMALIZED_CITATION"
    });

    results.push(...matches);
  }

  return uniqueResults(sortResultsForTina(results, query || keyword, parsed)).slice(0, clampTopK(topK));
}

export async function titleMetadataSearch(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 8 });
  const { supabaseClient, query, keyword, topK } = parsed;

  const terms = unique([
    keyword,
    query,
    ...buildPossibleSourceKeywords(query),
    ...buildPossibleSourceKeywords(keyword)
  ]).filter(Boolean);

  const results = [];

  for (const term of terms.slice(0, 10)) {
    const matches = await metadataSearch({
      supabaseClient,
      keyword: term,
      topK,
      options: parsed,
      searchMode: "TITLE_METADATA"
    });

    results.push(...matches);
  }

  return uniqueResults(sortResultsForTina(results, query || keyword, parsed)).slice(0, clampTopK(topK));
}

export async function searchSimilar(arg1, arg2) {
  const parsed = parseSearchArgs(arg1, arg2, { topK: 5 });
  const { supabaseClient, query, topK } = parsed;

  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return [];

  const safeTopK = clampTopK(topK);
  const matchCount = clampMatchCount(Math.max(safeTopK * 3, safeTopK));

  const queryEmbedding = await embedText(cleanQuery);

  const { data, error } = await supabaseClient.rpc("match_tina_vectors", {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: matchCount,
    filter_metadata: {}
  });

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
  const pattern = `%${cleanTopic}%`;

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(
      "id,source,original_source,document_title,authority_type,authority_level,normalized_reference,chunk_index,text,metadata"
    )
    .or(`source.ilike.${pattern},document_title.ilike.${pattern}`)
    .order("authority_level", { ascending: true, nullsFirst: false })
    .limit(safeLimit * 3);

  if (error) {
    console.error("[QUIZ LIGHT SEARCH] Supabase error:", { message: error.message, code: error.code });
    return [];
  }

  const authorityFiltered = (data || []).filter(
    (row) => !EXCLUDED_AUTHORITY_TYPES.has(row.authority_type)
  );

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

  const { data: sourceRows, error: sourceError } = await supabaseClient
    .from(VECTOR_TABLE)
    .select("source")
    .limit(10000);

  if (sourceError) {
    return {
      storage: "supabase",
      chunks: count || 0,
      sources: 0,
      sourceNames: [],
      error: sourceError.message
    };
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
  removeSourceFromVectorStore,
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
  getVectorStoreStats,

  normalizeSourceName,
  normalizeAuthorityReference,
  vectorStoreHealthCheck
};
