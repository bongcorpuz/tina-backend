// FILE: vector-store.js
"use strict";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import "dotenv/config";

const require = createRequire(import.meta.url);

const {
  buildAuthorityMetadata
} = require("./authority-engine.js");

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY for vector-store.js");
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables for vector-store.js");
}

const ENGINE_VERSION = "2.3.0";

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
const VECTOR_TABLE = "tina_vector_store";
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_TOP_K = 8;

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

const WEAK_SOURCE_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "working_papers",
  "drafts",
  "reviewer",
  "handout",
  "lecture notes"
];

/* ================= TEXT / EMBEDDINGS ================= */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function lower(value = "") {
  return compactSpaces(value).toLowerCase();
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
    input: input.slice(0, 24000)
  });

  const embedding = response.data?.[0]?.embedding || [];

  if (!embedding.length) {
    throw new Error("OpenAI returned an empty embedding.");
  }

  return embedding;
}

/* ================= ARGUMENT NORMALIZATION ================= */

function resolveSupabaseClient(client) {
  return client && typeof client.from === "function" ? client : defaultSupabase;
}

function parseSearchArgs(arg1, arg2, defaults = {}) {
  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    return {
      supabaseClient: resolveSupabaseClient(arg1.supabase || arg1.supabaseClient),
      query: String(arg1.query || arg1.keyword || ""),
      keyword: String(arg1.keyword || arg1.query || ""),
      topK: Math.max(1, Number(arg1.topK || arg1.limit || defaults.topK || DEFAULT_TOP_K)),
      includeWeakSources: Boolean(arg1.includeWeakSources || false),
      issueAware: arg1.issueAware !== false
    };
  }

  return {
    supabaseClient: defaultSupabase,
    query: String(arg1 || ""),
    keyword: String(arg1 || ""),
    topK: Math.max(1, Number(arg2 || defaults.topK || DEFAULT_TOP_K)),
    includeWeakSources: false,
    issueAware: true
  };
}

/* ================= NORMALIZATION ================= */

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

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[\\/]/g, "-")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
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
    return [...new Set([normalized, alternate, y])];
  }

  return [...new Set([y, y.slice(-2)])];
}

/* ================= ISSUE / AUTHORITY SIGNALS ================= */

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

  return [...new Set(issues)];
}

function buildRowSearchBlob(row = {}) {
  return compactSpaces(
    [
      row.text,
      row.source,
      row.original_source,
      row.document_title,
      row.normalized_reference,
      row.metadata?.path,
      row.metadata?.documentTitle,
      row.metadata?.originalSource,
      row.metadata?.originalFileName,
      ...(Array.isArray(row.normalized_aliases) ? row.normalized_aliases : []),
      ...(Array.isArray(row.metadata?.normalizedAliases)
        ? row.metadata.normalizedAliases
        : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isWeakSourceRow(row = {}) {
  const blob = lower(buildRowSearchBlob(row));
  return WEAK_SOURCE_PATTERNS.some((pattern) => blob.includes(pattern));
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    queryIssues.includes(ISSUE_TYPES.VAT_LIABILITY) &&
    docIssues.includes(ISSUE_TYPES.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPES.VAT_REFUND)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPES.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPES.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPES.VAT_LIABILITY)
  ) {
    return true;
  }

  return false;
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function getAuthorityPriority(authorityType = "SECONDARY") {
  const map = {
    CONSTITUTION: 100,
    STATUTE: 98,
    SUPREME_COURT: 96,
    RR: 94,
    TREATY: 86,
    RMC: 82,
    RMO: 78,
    RAMO: 76,
    BIR_RULING: 68,
    CTA_EN_BANC: 66,
    COURT_OF_APPEALS: 62,
    CTA_DIVISION: 58,
    LGU: 45,
    SECONDARY: 5,
    UNKNOWN: 0
  };

  return map[authorityType] ?? 0;
}

function enrichRowScore(row = {}, query = "", baseScore = 1) {
  const queryIssues = detectIssueTypes(query);
  const rowIssues = detectIssueTypes(buildRowSearchBlob(row));
  const authorityType = row.authority_type || row.metadata?.authorityType || "SECONDARY";
  const authorityLevel = Number(row.authority_level || row.metadata?.authorityLevel || 99);

  let issueScore = 0;

  if (hasIssueMismatch(queryIssues, rowIssues)) issueScore -= 60;
  else if (hasIssueOverlap(queryIssues, rowIssues)) issueScore += 28;

  const authorityScore = getAuthorityPriority(authorityType);
  const weakPenalty = isWeakSourceRow(row) ? -55 : 0;
  const levelBonus = authorityLevel <= 3 ? 35 : authorityLevel <= 8 ? 20 : authorityLevel <= 11 ? 8 : 0;
  const exactBonus = Number(row.citationMatchBonus || row.citation_match_bonus || 0) * 80;

  return Number(
    (
      Number(baseScore || 0) * 0.34 +
      authorityScore * 0.36 +
      issueScore +
      levelBonus +
      exactBonus +
      weakPenalty
    ).toFixed(4)
  );
}

function shouldSuppressRow(row = {}, query = "", includeWeakSources = false) {
  if (!includeWeakSources && isWeakSourceRow(row)) return true;

  const queryIssues = detectIssueTypes(query);
  const rowIssues = detectIssueTypes(buildRowSearchBlob(row));

  if (hasIssueMismatch(queryIssues, rowIssues)) return true;

  return false;
}

/* ================= ISSUANCE / COURT / STATUTE MATCHING ================= */

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

function buildPossibleSourceKeywords(query = "") {
  const q = String(query || "");
  const keywords = [];

  if (/\b(1987\s+constitution|1987\s+philippine\s+constitution|philippine\s+constitution)\b/i.test(q)) {
    keywords.push("1987 constitution");
    keywords.push("1987 philippine constitution");
    keywords.push("constitution of the philippines");
  }

  const raMatch = q.match(
    /\b(?:RA|R\.A\.|Republic\s+Act(?:\s+No\.?)?)\s*0*(\d{4,6})\b/i
  );

  if (raMatch) {
    keywords.push(...buildRepublicActKeywords(raMatch[1]));
  }

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

    if (match) {
      keywords.push(
        ...buildIssuanceKeywords(item.prefix, match[1], match[2], item.longName)
      );
    }
  }

  const rulingMatch = q.match(
    /\b(?:BIR\s*)?Ruling\s*(?:No\.?)?\s*([A-Z0-9()/. -]+)\s*[-_ ]?\s*(\d{4})\b/i
  );

  if (rulingMatch) {
    const ref = String(rulingMatch[1]).trim();
    const year = String(rulingMatch[2]).trim();

    keywords.push(`ruling-${ref}-${year}`);
    keywords.push(`bir ruling ${ref}-${year}`);
    keywords.push(`bir-ruling-${ref}-${year}`);
    keywords.push(`bir ruling no. ${ref}-${year}`);
  }

  const grMatch = q.match(/\bg\.?\s*r\.?\s*no\.?\s*([A-Z0-9.-]+)\b/i);
  if (grMatch) {
    keywords.push(...buildCourtKeywords("SC", grMatch[1]));
  }

  const ctaMatch =
    q.match(/\bcta\s+case\s+no\.?\s*([A-Z0-9.-]+)\b/i) ||
    q.match(/\bcta\s+eb\s+no\.?\s*([A-Z0-9.-]+)\b/i);

  if (ctaMatch) {
    keywords.push(...buildCourtKeywords("CTA", ctaMatch[1]));
  }

  const caMatch = q.match(
    /\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([A-Z0-9.-]+)\b/i
  );

  if (caMatch) {
    keywords.push(...buildCourtKeywords("CA", caMatch[1]));
  }

  return [...new Set(keywords.map(normalizeForMatch).filter(Boolean))];
}

/* ================= QUIZ TOPIC FILTERING ================= */

function getTopicKeywords(topic = "") {
  const q = String(topic || "").toLowerCase();

  if (q.includes("vat") || q.includes("value-added") || q.includes("value added")) {
    return [
      "vat",
      "value-added tax",
      "value added tax",
      "output vat",
      "input vat",
      "zero-rated",
      "zero rated",
      "vat-exempt",
      "vat exempt",
      "exempt transaction",
      "vatable",
      "2550",
      "2550q",
      "12%"
    ];
  }

  if (q.includes("withholding") || q.includes("ewt") || q.includes("cwt")) {
    return [
      "withholding tax",
      "expanded withholding",
      "creditable withholding",
      "ewt",
      "cwt",
      "withholding agent",
      "bir form 2307",
      "2307",
      "1601"
    ];
  }

  if (q.includes("income") || q.includes("rcit") || q.includes("mcit") || q.includes("nolco")) {
    return [
      "income tax",
      "rcit",
      "mcit",
      "nolco",
      "regular corporate income tax",
      "minimum corporate income tax",
      "taxable income",
      "gross income",
      "deductions"
    ];
  }

  if (q.includes("percentage")) return ["percentage tax", "2551", "non-vat", "non vat", "gross receipts", "3%"];
  if (q.includes("final")) return ["final tax", "final withholding", "passive income", "interest income", "royalties", "dividends"];
  if (q.includes("capital") || q.includes("cgt")) return ["capital gains tax", "cgt", "capital asset", "sale of shares", "real property", "6%"];
  if (q.includes("donor")) return ["donor", "donor's tax", "donors tax", "gift", "donation"];
  if (q.includes("estate")) return ["estate tax", "estate", "decedent", "gross estate", "net estate"];
  if (q.includes("dst") || q.includes("documentary")) return ["documentary stamp tax", "dst", "documentary stamp", "stamp tax"];

  if (q.includes("remed") || q.includes("assessment" ) || q.includes("protest")) {
    return [
      "tax remedies",
      "assessment",
      "protest",
      "fan",
      "final assessment notice",
      "prescription",
      "refund",
      "claim for refund",
      "cta"
    ];
  }

  if (q.includes("admin") || q.includes("filing") || q.includes("registration")) {
    return [
      "tax administration",
      "registration",
      "filing",
      "return",
      "deadline",
      "penalty",
      "surcharge",
      "interest",
      "compromise"
    ];
  }

  if (q.includes("local") || q.includes("lgu")) {
    return [
      "local taxation",
      "local tax",
      "business tax",
      "lgu",
      "mayor's permit",
      "local business tax"
    ];
  }

  return [String(topic || "").trim()].filter(Boolean);
}

function getTopicNegativeKeywords(topic = "") {
  const q = String(topic || "").toLowerCase();

  if (q.includes("vat") || q.includes("value-added") || q.includes("value added")) {
    return [
      "estate tax",
      "donor",
      "donor's tax",
      "documentary stamp",
      "dst",
      "capital gains",
      "local business tax",
      "expanded withholding",
      "withholding tax",
      "ewt",
      "cwt"
    ];
  }

  if (q.includes("withholding") || q.includes("ewt") || q.includes("cwt")) {
    return [
      "estate tax",
      "donor",
      "documentary stamp",
      "capital gains",
      "local business tax"
    ];
  }

  if (q.includes("income") || q.includes("rcit") || q.includes("mcit") || q.includes("nolco")) {
    return [
      "estate tax",
      "donor's tax",
      "documentary stamp tax",
      "local business tax"
    ];
  }

  return [];
}

function scoreQuizRowForTopic(row, topic = "") {
  const text = `${row.text || ""} ${row.source || ""} ${
    row.original_source || ""
  } ${JSON.stringify(row.metadata || {})}`.toLowerCase();

  const path = String(
    row.metadata?.path || row.original_source || row.source || ""
  ).toLowerCase();

  const keywords = getTopicKeywords(topic);
  const negatives = getTopicNegativeKeywords(topic);

  let score = 0;

  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (!k) continue;

    if (text.includes(k)) score += 2;
    if (path.includes(k)) score += 4;
  }

  for (const bad of negatives) {
    const b = bad.toLowerCase();
    if (!b) continue;

    if (text.includes(b)) score -= 2;
    if (path.includes(b)) score -= 5;
  }

  if (path.includes("00_constitution")) score += 2;
  if (path.includes("01_tax_code")) score += 4;
  if (path.includes("02_revenue_regulations")) score += 4;
  if (path.includes("03_rmc")) score += 3;
  if (path.includes("04_rmo")) score += 2;
  if (path.includes("04b_ramo")) score += 2;
  if (path.includes("05_bir_rulings")) score += 1;
  if (path.includes("05b_tax_treaties")) score += 2;
  if (path.includes("06_court_cases")) score += 2;
  if (path.includes("07_cpa_notes")) score -= 3;

  return score;
}

/* ================= AUTHORITY + SUPERSESSION HELPERS ================= */

function buildAuthorityFields(text, source, metadata = {}) {
  const authority = buildAuthorityMetadata({
    fileName:
      metadata.fileName ||
      metadata.originalFileName ||
      metadata.originalSource ||
      source,
    path: metadata.path || source,
    text,
    modifiedTime: metadata.modifiedTime || metadata.recencyDate || null
  });

  return {
    authority_type: authority.authorityType,
    authority_level: authority.authorityLevel,
    authority_score: authority.authorityScore,
    authority_label: authority.authorityLabel,
    normalized_reference: authority.normalizedReference,
    normalized_aliases: authority.normalizedAliases,
    recency_date: authority.recencyDate || authority.modifiedTime || null,
    jurisdiction: metadata.jurisdiction || "PH",
    source_category: metadata.sourceCategory || null,
    document_title:
      metadata.documentTitle ||
      metadata.originalFileName ||
      metadata.originalSource ||
      source,
    effective_from: metadata.effectiveFrom || null,
    effective_to: metadata.effectiveTo || null,
    is_superseded: Boolean(metadata.isSuperseded || false),
    superseded_by_reference: metadata.supersededByReference || null,
    repealed_by_reference: metadata.repealedByReference || null,
    amended_by_reference: metadata.amendedByReference || null
  };
}

function buildStoredMetadata(source, metadata, authorityFields) {
  return {
    ...metadata,
    originalSource: metadata.originalSource || source,
    originalFileName:
      metadata.originalFileName ||
      metadata.fileName ||
      metadata.originalSource ||
      source,
    normalizedSource: metadata.normalizedSource || normalizeSourceName(source),
    storage: "supabase",
    authorityType: authorityFields.authority_type,
    authorityLevel: authorityFields.authority_level,
    authorityScore: authorityFields.authority_score,
    authorityLabel: authorityFields.authority_label,
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
    tinaVectorStoreVersion: ENGINE_VERSION
  };
}

/* ================= ROW MAPPING ================= */

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

function mapRowToResult(row, score = 1, query = "") {
  const metadata = row.metadata || {};
  const authorityType = row.authority_type || metadata.authorityType || "SECONDARY";
  const authorityLevel = Number(row.authority_level || metadata.authorityLevel || 99);
  const authorityScore = Number(row.authority_score || metadata.authorityScore || 25);
  const authorityLabel =
    row.authority_label || metadata.authorityLabel || "Secondary / Commentary";

  const issueTypes = detectIssueTypes(buildRowSearchBlob(row));
  const citationMatchBonus = Number(row.citationMatchBonus || row.citation_match_bonus || 0);
  const enrichedScore = enrichRowScore(
    {
      ...row,
      citationMatchBonus
    },
    query,
    row.score ?? row.similarity ?? score
  );

  return {
    id: row.id,
    source: row.source,
    originalSource: row.original_source || metadata.originalSource || row.source,
    original_source: row.original_source || metadata.originalSource || row.source,
    text: row.text,
    content: row.text,
    excerpt: row.text,
    chunkIndex: row.chunk_index,
    chunk_index: row.chunk_index,
    metadata: {
      ...metadata,
      authorityType,
      authorityLevel,
      authorityScore,
      authorityLabel,
      normalizedReference:
        row.normalized_reference || metadata.normalizedReference || null,
      normalizedAliases: Array.isArray(row.normalized_aliases)
        ? row.normalized_aliases
        : Array.isArray(metadata.normalizedAliases)
          ? metadata.normalizedAliases
          : [],
      recencyDate: row.recency_date || metadata.recencyDate || null,
      jurisdiction: row.jurisdiction || metadata.jurisdiction || "PH",
      sourceCategory: row.source_category || metadata.sourceCategory || null,
      documentTitle:
        row.document_title ||
        metadata.documentTitle ||
        metadata.originalFileName ||
        row.source,
      effectiveFrom: row.effective_from || metadata.effectiveFrom || null,
      effectiveTo: row.effective_to || metadata.effectiveTo || null,
      isSuperseded:
        typeof row.is_superseded === "boolean"
          ? row.is_superseded
          : Boolean(metadata.isSuperseded || false),
      supersededByReference:
        row.superseded_by_reference || metadata.supersededByReference || null,
      repealedByReference:
        row.repealed_by_reference || metadata.repealedByReference || null,
      amendedByReference:
        row.amended_by_reference || metadata.amendedByReference || null,
      issueTypes,
      retrievalScore: enrichedScore,
      citationMatchBonus,
      tinaVectorStoreVersion: ENGINE_VERSION
    },
    authorityType,
    authority_type: authorityType,
    authorityLevel,
    authority_level: authorityLevel,
    authorityScore,
    authority_score: authorityScore,
    authorityLabel,
    authority_label: authorityLabel,
    normalizedReference:
      row.normalized_reference || metadata.normalizedReference || null,
    normalized_reference:
      row.normalized_reference || metadata.normalizedReference || null,
    normalizedAliases: Array.isArray(row.normalized_aliases)
      ? row.normalized_aliases
      : Array.isArray(metadata.normalizedAliases)
        ? metadata.normalizedAliases
        : [],
    normalized_aliases: Array.isArray(row.normalized_aliases)
      ? row.normalized_aliases
      : Array.isArray(metadata.normalizedAliases)
        ? metadata.normalizedAliases
        : [],
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
    supersededByReference:
      row.superseded_by_reference || metadata.supersededByReference || null,
    superseded_by_reference:
      row.superseded_by_reference || metadata.supersededByReference || null,
    repealedByReference:
      row.repealed_by_reference || metadata.repealedByReference || null,
    repealed_by_reference:
      row.repealed_by_reference || metadata.repealedByReference || null,
    amendedByReference:
      row.amended_by_reference || metadata.amendedByReference || null,
    amended_by_reference:
      row.amended_by_reference || metadata.amendedByReference || null,
    issueTypes,
    issue_types: issueTypes,
    citationMatchBonus,
    citation_match_bonus: citationMatchBonus,
    score: row.score ?? row.similarity ?? score,
    similarity: row.similarity ?? row.score ?? score,
    retrievalScore: enrichedScore,
    retrieval_score: enrichedScore,
    finalScore: Math.max(Number(row.final_score ?? row.score ?? row.similarity ?? score), enrichedScore),
    final_score: Math.max(Number(row.final_score ?? row.score ?? row.similarity ?? score), enrichedScore)
  };
}

function buildSourceIlikeFilters(keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);
  const looseKeyword = String(keyword || "").replace(/-/g, "_");

  const terms = [...new Set([normalizedKeyword, looseKeyword].filter(Boolean))];

  return terms
    .flatMap((term) => [
      `source.ilike.%${term}%`,
      `original_source.ilike.%${term}%`,
      `metadata->>originalSource.ilike.%${term}%`,
      `metadata->>originalFileName.ilike.%${term}%`,
      `metadata->>normalizedSource.ilike.%${term}%`,
      `metadata->>path.ilike.%${term}%`,
      `metadata->>normalizedReference.ilike.%${term}%`,
      `normalized_reference.ilike.%${term}%`,
      `superseded_by_reference.ilike.%${term}%`,
      `repealed_by_reference.ilike.%${term}%`,
      `amended_by_reference.ilike.%${term}%`
    ])
    .join(",");
}

function sortResultsForTina(results = [], query = "") {
  const queryIssues = detectIssueTypes(query);

  return [...results]
    .filter((row) => !shouldSuppressRow(row, query, false))
    .map((row) => ({
      ...row,
      retrievalScore:
        row.retrievalScore ?? row.retrieval_score ?? enrichRowScore(row, query, row.score),
      finalScore:
        row.finalScore ??
        row.final_score ??
        Math.max(Number(row.score || 0), enrichRowScore(row, query, row.score))
    }))
    .sort((a, b) => {
      const aExact = Number(a.citationMatchBonus || a.citation_match_bonus || 0);
      const bExact = Number(b.citationMatchBonus || b.citation_match_bonus || 0);
      if (bExact !== aExact) return bExact - aExact;

      const aMismatch = hasIssueMismatch(queryIssues, a.issueTypes || a.issue_types || []) ? 1 : 0;
      const bMismatch = hasIssueMismatch(queryIssues, b.issueTypes || b.issue_types || []) ? 1 : 0;
      if (aMismatch !== bMismatch) return aMismatch - bMismatch;

      const aLevel = Number(a.authorityLevel || a.authority_level || a.metadata?.authorityLevel || 99);
      const bLevel = Number(b.authorityLevel || b.authority_level || b.metadata?.authorityLevel || 99);
      if (aLevel !== bLevel) return aLevel - bLevel;

      const aScore = Number(a.retrievalScore || a.retrieval_score || a.finalScore || a.score || 0);
      const bScore = Number(b.retrievalScore || b.retrieval_score || b.finalScore || b.score || 0);

      return bScore - aScore;
    });
}

/* ================= PUBLIC API ================= */

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
      metadata: buildStoredMetadata(
        source,
        {
          ...metadata,
          normalizedSource
        },
        authorityFields
      ),
      authority_type: authorityFields.authority_type,
      authority_level: authorityFields.authority_level,
      authority_score: authorityFields.authority_score,
      authority_label: authorityFields.authority_label,
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

export async function searchSimilar(arg1, arg2) {
  const {
    supabaseClient,
    query,
    topK,
    includeWeakSources
  } = parseSearchArgs(arg1, arg2, { topK: 5 });

  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return [];

  const queryEmbedding = await embedText(cleanQuery);

  const { data, error } = await supabaseClient.rpc("match_tina_vectors", {
    query_embedding: queryEmbedding,
    match_count: Math.max(topK * 3, topK)
  });

  if (error) {
    console.error("Supabase vector search error:", error);
    throw error;
  }

  const mapped = (data || [])
    .map((row) => mapRowToResult(row, row.score, cleanQuery))
    .filter((row) => !shouldSuppressRow(row, cleanQuery, includeWeakSources));

  return sortResultsForTina(mapped, cleanQuery).slice(0, topK);
}

export async function searchBySourceName(arg1, arg2) {
  const {
    supabaseClient,
    keyword,
    topK,
    includeWeakSources
  } = parseSearchArgs(arg1, arg2, { topK: 8 });

  if (!keyword) return [];

  const { data, error } = await supabaseClient
    .from(VECTOR_TABLE)
    .select(buildSelectColumns())
    .or(buildSourceIlikeFilters(keyword))
    .order("authority_level", { ascending: true, nullsFirst: false })
    .order("chunk_index", { ascending: true })
    .limit(Math.max(topK * 3, topK));

  if (error) {
    console.error("Supabase source-name search error:", error);
    throw error;
  }

  const mapped = (data || [])
    .map((row) => mapRowToResult(row, 1, keyword))
    .filter((row) => !shouldSuppressRow(row, keyword, includeWeakSources))
    .map((row) => ({
      ...row,
      citationMatchBonus: 1,
      citation_match_bonus: 1,
      retrievalScore: enrichRowScore({ ...row, citationMatchBonus: 1 }, keyword, row.score),
      retrieval_score: enrichRowScore({ ...row, citationMatchBonus: 1 }, keyword, row.score)
    }));

  return sortResultsForTina(mapped, keyword).slice(0, topK);
}

export async function smartSearch(arg1, arg2) {
  const {
    supabaseClient,
    query,
    topK,
    includeWeakSources
  } = parseSearchArgs(arg1, arg2, { topK: 8 });

  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return [];

  const keywords = buildPossibleSourceKeywords(cleanQuery);
  const exactResults = [];

  for (const keyword of keywords) {
    const exactMatches = await searchBySourceName({
      supabase: supabaseClient,
      keyword,
      topK,
      includeWeakSources
    });

    if (exactMatches.length > 0) {
      exactResults.push(...exactMatches);
    }
  }

  const semanticResults = await searchSimilar({
    supabase: supabaseClient,
    query: cleanQuery,
    topK: Math.max(topK, DEFAULT_TOP_K),
    includeWeakSources
  });

  const merged = [];
  const seen = new Set();

  for (const item of [...exactResults, ...semanticResults]) {
    const key =
      item.id ||
      item.normalizedReference ||
      item.normalized_reference ||
      item.source ||
      item.originalSource ||
      JSON.stringify(item);

    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(item);
  }

  return sortResultsForTina(merged, cleanQuery).slice(0, topK);
}

/* ================= STRICT QUIZ SOURCE RETRIEVAL ================= */

export async function getQuizSourceChunks({
  topic = "",
  excludeSourcePaths = [],
  excludeChunkIds = [],
  limit = 5,
  supabase: suppliedSupabase = defaultSupabase
} = {}) {
  const supabaseClient = resolveSupabaseClient(suppliedSupabase);
  const cleanTopic = String(topic || "").trim();
  const normalizedTopic = normalizeForMatch(cleanTopic);
  const topicKeywords = getTopicKeywords(cleanTopic);

  let query = supabaseClient
    .from(VECTOR_TABLE)
    .select(buildSelectColumns())
    .not("text", "is", null)
    .limit(Math.max(limit * 20, 80));

  if (cleanTopic) {
    const filters = [
      `text.ilike.%${cleanTopic}%`,
      `source.ilike.%${normalizedTopic}%`,
      `original_source.ilike.%${cleanTopic}%`,
      `metadata->>originalSource.ilike.%${cleanTopic}%`,
      `metadata->>originalFileName.ilike.%${cleanTopic}%`,
      `metadata->>path.ilike.%${cleanTopic}%`
    ];

    for (const kw of topicKeywords.slice(0, 8)) {
      const nk = normalizeForMatch(kw);
      filters.push(`text.ilike.%${kw}%`);
      filters.push(`source.ilike.%${nk}%`);
      filters.push(`original_source.ilike.%${kw}%`);
      filters.push(`metadata->>path.ilike.%${kw}%`);
    }

    query = query.or(filters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("getQuizSourceChunks error:", error.message);
    return [];
  }

  let rows = data || [];

  rows = rows.filter((row) => {
    const path = row.metadata?.path || row.original_source || row.source || "";
    const chunkId = String(row.id || "");

    if (excludeSourcePaths.includes(path)) return false;
    if (excludeChunkIds.includes(chunkId)) return false;

    return normalizeText(row.text).length >= 300;
  });

  rows = rows
    .map((row) => ({
      ...row,
      quizTopicScore: scoreQuizRowForTopic(row, cleanTopic)
    }))
    .filter((row) => {
      if (!cleanTopic) return true;
      return row.quizTopicScore >= 2;
    })
    .sort((a, b) => {
      if (b.quizTopicScore !== a.quizTopicScore) {
        return b.quizTopicScore - a.quizTopicScore;
      }

      const aLevel = Number(a.authority_level || a.metadata?.authorityLevel || 99);
      const bLevel = Number(b.authority_level || b.metadata?.authorityLevel || 99);

      if (aLevel !== bLevel) return aLevel - bLevel;

      return Math.random() - 0.5;
    })
    .slice(0, limit);

  return rows.map((row) => {
    const mapped = mapRowToResult(row, row.quizTopicScore, cleanTopic);

    return {
      ...mapped,
      sourceTitle:
        row.document_title ||
        row.metadata?.documentTitle ||
        row.metadata?.originalFileName ||
        row.original_source ||
        row.source,
      sourcePath: row.metadata?.path || row.original_source || row.source,
      fileId: row.metadata?.fileId || row.metadata?.file_id || null,
      metadata: {
        ...mapped.metadata,
        quizTopic: cleanTopic,
        quizTopicScore: row.quizTopicScore
      },
      score: row.quizTopicScore
    };
  });
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
    engineVersion: ENGINE_VERSION
  };
}

export function vectorStoreHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VECTOR_STORE",
    version: ENGINE_VERSION,
    embeddingModel: EMBEDDING_MODEL,
    vectorTable: VECTOR_TABLE,
    commonJsAuthorityBridge: true,
    adaptiveRetrievalCompatible: true
  };
}

export default {
  clearVectorStore,
  removeSourceFromVectorStore,
  addDocumentToVectorStore,
  searchSimilar,
  searchBySourceName,
  smartSearch,
  getQuizSourceChunks,
  getVectorStoreStats,
  normalizeSourceName,
  vectorStoreHealthCheck
};
