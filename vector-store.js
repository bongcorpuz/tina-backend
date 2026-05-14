// FILE: vector-store.js
"use strict";

import { createRequire } from "module";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const require = createRequire(import.meta.url);

const { buildAuthorityMetadata } = require("./authority-engine.js");

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

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
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
  CONTRACT: "CONTRACT",
  TRANSACTION: "TRANSACTION",
  AUDIT: "AUDIT",
  CASE_LAW: "CASE_LAW",
  ISSUANCE: "ISSUANCE"
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

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function lower(value = "") {
  return compactSpaces(value).toLowerCase();
}

function isSupabaseClient(value) {
  return Boolean(value) && typeof value.from === "function";
}

function resolveSupabaseClient(client) {
  return isSupabaseClient(client) ? client : defaultSupabase;
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

  if (!input) throw new Error("Text for embedding is required.");

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

function parseSearchArgs(arg1, arg2, defaults = {}) {
  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    return {
      supabaseClient: resolveSupabaseClient(arg1.supabase),
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
  push(/\b(income tax|rcit|mcit|nolco|deduct
