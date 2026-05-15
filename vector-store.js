// FILE: vector-store.js
"use strict";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  rerankByHierarchy,
  buildAuthorityMetadata
} = require("./authority-engine.js");

/* =========================================================
   CONFIG
========================================================= */

const OPENAI_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ||
  "text-embedding-3-small";

const EMBEDDING_DIMENSIONS = 1536;

const MAX_CHUNK_SIZE =
  Number(process.env.MAX_CHUNK_SIZE || 2200);

const CHUNK_OVERLAP =
  Number(process.env.CHUNK_OVERLAP || 350);

const SEARCH_MATCH_COUNT =
  Number(process.env.SEARCH_MATCH_COUNT || 12);

const VECTOR_SIMILARITY_THRESHOLD =
  Number(process.env.VECTOR_SIMILARITY_THRESHOLD || 0.72);

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

/* =========================================================
   CLIENTS
========================================================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function compactSpaces(value = "") {
  return normalizeText(value);
}

function lower(value = "") {
  return compactSpaces(value).toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripFileExtension(value = "") {
  return String(value || "")
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "");
}

function basename(value = "") {
  const parts = String(value || "")
    .split(/[\\/]/)
    .filter(Boolean);

  return parts.length
    ? parts[parts.length - 1]
    : String(value || "");
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

/* =========================================================
   LEGAL REFERENCE EXTRACTION
========================================================= */

function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

function normalizeIssuanceYear(year = "") {
  const raw = String(year || "").trim();

  if (!raw) return "";

  if (/^\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY =
      new Date().getFullYear() % 100;

    return yy <= currentYY + 1
      ? `20${raw}`
      : `19${raw}`;
  }

  return raw;
}

export function extractIssuanceReference(text = "") {
  const value = compactSpaces(text);

  const patterns = [
    {
      type: "RR",
      regex:
        /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i
    },

    {
      type: "RMC",
      regex:
        /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i
    },

    {
      type: "RMO",
      regex:
        /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i
    },

    {
      type: "RAMO",
      regex:
        /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i
    },

    {
      type: "RA",
      regex:
        /\b(?:ra|r\.a\.|republic act(?:\s+no\.?)?)\s*0*(\d{4,6})\b/i
    },

    {
      type: "GR",
      regex:
        /\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i
    }
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern.regex);

    if (!match) continue;

    if (
      ["RR", "RMC", "RMO", "RAMO"].includes(
        pattern.type
      )
    ) {
      const num =
        normalizeIssuanceNumber(match[1]);

      const year =
        normalizeIssuanceYear(match[2]);

      return {
        type: pattern.type,
        number: num,
        year,
        normalized:
          `${pattern.type}_${num}_${year}`,
        aliases: [
          `${pattern.type} ${num}-${year}`,
          `${pattern.type} No. ${num}-${year}`
        ]
      };
    }

    if (pattern.type === "RA") {
      const num = String(match[1]).replace(
        /^0+/,
        ""
      );

      return {
        type: "RA",
        number: num,
        normalized: `RA_${num}`,
        aliases: [
          `RA ${num}`,
          `Republic Act ${num}`
        ]
      };
    }

    if (pattern.type === "GR") {
      const ref = String(
        match[1]
      ).toUpperCase();

      return {
        type: "GR",
        number: ref,
        normalized:
          `GR_${ref.replace(/[^A-Z0-9]+/g, "_")}`,
        aliases: [
          `G.R. No. ${ref}`,
          `GR No. ${ref}`
        ]
      };
    }
  }

  return null;
}

/* =========================================================
   ISSUE DETECTION
========================================================= */

export function detectIssueTypes(text = "") {
  const l = lower(text);

  const issues = [];

  const rules = [
    ["VAT", /\bvat\b/],
    ["VAT_REFUND", /\brefund\b/],
    ["WITHHOLDING", /\bwithholding|ewt|cwt\b/],
    ["INCOME_TAX", /\bincome tax|mcit|rcit|nolco\b/],
    ["ASSESSMENT", /\bassessment|pan|fan|loa\b/],
    ["PRESCRIPTION", /\bprescription\b/],
    ["SUBSTANTIATION", /\bsubstantiation|invoice|receipt\b/],
    ["CONTRACT", /\bcontract|agreement|lease\b/],
    ["PRINCIPAL_AGENT", /\bprincipal|agent\b/],
    ["ECONOMIC_SUBSTANCE", /\beconomic substance\b/],
    ["PFRS", /\bpfrs|pas\b/],
    ["AUDIT", /\baudit|working paper\b/]
  ];

  for (const [name, regex] of rules) {
    if (regex.test(l)) {
      issues.push(name);
    }
  }

  return [...new Set(issues)];
}

export function hasIssueOverlap(
  a = [],
  b = []
) {
  const setA = new Set(a);

  return b.some((x) => setA.has(x));
}

export function hasIssueMismatch(
  queryIssues = [],
  rowIssues = []
) {
  if (
    queryIssues.includes("VAT") &&
    queryIssues.includes("VAT_REFUND")
  ) {
    return false;
  }

  if (
    queryIssues.includes("VAT") &&
    rowIssues.includes("VAT_REFUND") &&
    !queryIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   WEAK SOURCE DETECTION
========================================================= */

function isWeakSourceRow(row = {}) {
  const blob = lower(
    [
      row.source,
      row.originalSource,
      row.original_source,
      row.path,
      row.source_path,
      row.title,
      row.text,
      row.content
    ]
      .filter(Boolean)
      .join(" ")
  );

  return (
    blob.includes("reviewer") ||
    blob.includes("handout") ||
    blob.includes("lecture notes") ||
    blob.includes("working paper") ||
    blob.includes("internal_notes") ||
    blob.includes("07_cpa_notes")
  );
}

/* =========================================================
   CHUNKING
========================================================= */

function splitTextIntoChunks(text = "") {
  const normalized = normalizeText(text);

  if (!normalized) return [];

  if (normalized.length <= MAX_CHUNK_SIZE) {
    return [normalized];
  }

  const chunks = [];

  let start = 0;

  while (start < normalized.length) {
    const end =
      start + MAX_CHUNK_SIZE;

    const chunk = normalized.slice(
      start,
      end
    );

    chunks.push(chunk);

    start +=
      MAX_CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks.filter(Boolean);
}

/* =========================================================
   EMBEDDINGS
========================================================= */

export async function createEmbedding(
  text = ""
) {
  const input = normalizeText(text);

  if (!input) {
    throw new Error(
      "Cannot embed empty text."
    );
  }

  const response =
    await openai.embeddings.create({
      model: OPENAI_MODEL,
      input
    });

  const embedding =
    response?.data?.[0]?.embedding;

  if (
    !embedding ||
    !Array.isArray(embedding)
  ) {
    throw new Error(
      "Embedding generation failed."
    );
  }

  return embedding;
}

/* =========================================================
   VECTOR STORE INSERT
========================================================= */

function buildChunkId({
  source = "",
  chunkIndex = 0,
  text = ""
}) {
  const hash =
    crypto
      .createHash("sha256")
      .update(
        `${source}_${chunkIndex}_${text}`
      )
      .digest("hex");

  return hash;
}

export async function addDocumentToVectorStore(
  text = "",
  source = "",
  metadata = {}
) {
  const normalizedText =
    normalizeText(text);

  if (!normalizedText) {
    throw new Error(
      "Document text is empty."
    );
  }

  const normalizedSource =
    normalizeSourceName(source);

  const chunks =
    splitTextIntoChunks(normalizedText);

  const authorityMetadata =
    buildAuthorityMetadata({
      fileName:
        metadata.originalFileName ||
        source,
      path:
        metadata.path || source,
      text: normalizedText,
      modifiedTime:
        metadata.modifiedTime ||
        null
    });

  let inserted = 0;

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk = chunks[i];

    const embedding =
      await createEmbedding(chunk);

    const chunkId =
      buildChunkId({
        source: normalizedSource,
        chunkIndex: i,
        text: chunk
      });

    const row = {
      id: chunkId,

      content: chunk,

      embedding,

      source: normalizedSource,

      original_source:
        metadata.originalSource ||
        source,

      source_path:
        metadata.path ||
        source,

      chunk_index: i,

      metadata: {
        ...metadata,
        ...authorityMetadata,

        source:
          normalizedSource,

        originalSource:
          metadata.originalSource ||
          source,

        chunkIndex: i,

        embeddingModel:
          OPENAI_MODEL,

        indexedAt:
          new Date().toISOString()
      },

      authority_type:
        authorityMetadata.authorityType,

      authority_level:
        authorityMetadata.authorityLevel,

      authority_score:
        authorityMetadata.authorityScore,

      controlling_precedence:
        authorityMetadata.controllingPrecedence,

      normalized_reference:
        authorityMetadata.normalizedReference,

      normalized_aliases:
        authorityMetadata.normalizedAliases,

      retrieval_score: 0,
      final_score: 0
    };

    const { error } =
      await supabase
        .from("documents")
        .upsert(row);

    if (error) {
      throw error;
    }

    inserted++;
  }

  return {
    success: true,
    chunksAdded: inserted,
    source: normalizedSource
  };
}

/* =========================================================
   DELETE / RESET
========================================================= */

export async function clearVectorStore() {
  const { error } =
    await supabase
      .from("documents")
      .delete()
      .neq("id", "__never__");

  if (error) {
    throw error;
  }

  return {
    success: true
  };
}

/* =========================================================
   SEARCH HELPERS
========================================================= */

function buildRowSearchBlob(
  row = {}
) {
  return compactSpaces(
    [
      row.content,
      row.source,
      row.original_source,
      row.source_path,
      row.authority_type,
      row.normalized_reference,
      ...(row.normalized_aliases || []),
      row.metadata?.documentTitle,
      row.metadata?.authorityLabel
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getAuthorityPriority(
  authorityType = "SECONDARY"
) {
  const map = {
    CONSTITUTION: 100,
    STATUTE: 98,
    SUPREME_COURT: 97,
    RR: 95,
    TREATY: 92,
    RMC: 86,
    RMO: 82,
    RAMO: 80,
    BIR_RULING: 72,
    CTA_EN_BANC: 70,
    COURT_OF_APPEALS: 68,
    CTA_DIVISION: 64,
    LGU: 58,
    SECONDARY: 5,
    UNKNOWN: 0
  };

  return Number(
    map[authorityType] ?? 0
  );
}

function mapRowToResult(
  row = {}
) {
  const authorityLabel =
    row.metadata?.authorityLabel ||
    row.authority_type ||
    "UNKNOWN";

  const controllingPrecedence =
    Number(
      row.controlling_precedence ||
        row.metadata
          ?.controllingPrecedence ||
        99
    );

  return {
    ...row,

    text:
      row.content || "",

    source:
      row.source || "",

    originalSource:
      row.original_source || "",

    sourcePath:
      row.source_path || "",

    authorityType:
      row.authority_type ||
      "UNKNOWN",

    authorityLevel:
      Number(
        row.authority_level || 99
      ),

    authorityScore:
      Number(
        row.authority_score || 0
      ),

    authorityLabel,

    normalizedReference:
      row.normalized_reference,

    normalizedAliases:
      row.normalized_aliases ||
      [],

    controllingPrecedence,

    controlling_precedence:
      controllingPrecedence,

    retrievalScore:
      Number(
        row.retrieval_score || 0
      ),

    finalScore:
      Number(
        row.final_score || 0
      ),

    issueTypes:
      detectIssueTypes(
        buildRowSearchBlob(row)
      )
  };
}

function shouldSuppressRow(
  row = {},
  query = "",
  allowWeak = false
) {
  if (
    !allowWeak &&
    isWeakSourceRow(row)
  ) {
    return true;
  }

  const queryIssues =
    detectIssueTypes(query);

  const rowIssues =
    detectIssueTypes(
      buildRowSearchBlob(row)
    );

  if (
    hasIssueMismatch(
      queryIssues,
      rowIssues
    )
  ) {
    return true;
  }

  return false;
}

function enrichRowScore(
  row = {},
  query = "",
  baseScore = 1
) {
  const queryIssues =
    detectIssueTypes(query);

  const rowIssues =
    detectIssueTypes(
      buildRowSearchBlob(row)
    );

  const authorityType =
    row.authority_type ||
    row.metadata?.authorityType ||
    "SECONDARY";

  const authorityLevel =
    Number(
      row.authority_level ||
        row.metadata
          ?.authorityLevel ||
        99
    );

  const controllingPrecedence =
    Number(
      row.controlling_precedence ||
        row.metadata
          ?.controllingPrecedence ||
        authorityLevel
    );

  let issueScore = 0;

  if (
    hasIssueMismatch(
      queryIssues,
      rowIssues
    )
  ) {
    issueScore -= 120;
  } else if (
    hasIssueOverlap(
      queryIssues,
      rowIssues
    )
  ) {
    issueScore += 34;
  }

  const authorityScore =
    getAuthorityPriority(
      authorityType
    );

  const weakPenalty =
    isWeakSourceRow(row)
      ? -75
      : 0;

  const exactBonus =
    Number(
      row.citationMatchBonus ||
        row.citation_match_bonus ||
        0
    ) * 140;

  const precedenceBonus =
    controllingPrecedence <= 4
      ? 42
      : controllingPrecedence <= 8
        ? 18
        : 0;

  const semanticComponent =
    Number(baseScore || 0) *
    0.20;

  return Number(
    (
      semanticComponent +
      authorityScore * 0.42 +
      issueScore +
      exactBonus +
      precedenceBonus +
      weakPenalty
    ).toFixed(4)
  );
}

/* =========================================================
   SOURCE KEYWORD SEARCH
========================================================= */

function buildPossibleSourceKeywords(query = "") {
  const ref = extractIssuanceReference(query);
  const keywords = [query];

  if (!ref) {
    return [...new Set(keywords.map(normalizeForMatch).filter(Boolean))];
  }

  for (const alias of ref.aliases || []) {
    keywords.push(alias);
  }

  keywords.push(ref.normalized);

  return [...new Set(keywords.map(normalizeForMatch).filter(Boolean))];
}

function sortResultsForTina(results = [], query = "") {
  const queryIssues = detectIssueTypes(query);

  return safeArray(results)
    .filter((row) => !shouldSuppressRow(row, query, false))
    .map((row) => {
      const retrievalScore =
        row.retrievalScore ??
        row.retrieval_score ??
        enrichRowScore(row, query, row.score || row.similarity || 1);

      const finalScore =
        row.finalScore ??
        row.final_score ??
        Math.max(Number(row.score || row.similarity || 0), retrievalScore);

      return {
        ...row,
        retrievalScore,
        retrieval_score: retrievalScore,
        finalScore,
        final_score: finalScore
      };
    })
    .sort((a, b) => {
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

      return Number(b.retrievalScore || b.finalScore || 0) - Number(a.retrievalScore || a.finalScore || 0);
    });
}

export async function searchBySourceName(arg1, arg2) {
  const query =
    typeof arg1 === "object" && arg1 !== null
      ? String(arg1.keyword || arg1.query || "")
      : String(arg1 || "");

  const topK =
    typeof arg1 === "object" && arg1 !== null
      ? Number(arg1.topK || arg1.limit || 8)
      : Number(arg2 || 8);

  const keywords = buildPossibleSourceKeywords(query);

  if (!keywords.length) return [];

  const filters = keywords.flatMap((keyword) => [
    `source.ilike.%${keyword}%`,
    `original_source.ilike.%${keyword}%`,
    `source_path.ilike.%${keyword}%`,
    `normalized_reference.ilike.%${keyword}%`
  ]);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .or(filters.join(","))
    .limit(Math.max(topK * 3, topK));

  if (error) throw error;

  const mapped = safeArray(data)
    .map((row) => ({
      ...mapRowToResult(row),
      citationMatchBonus: 1,
      citation_match_bonus: 1
    }))
    .map((row) => ({
      ...row,
      retrievalScore: enrichRowScore(row, query, 1),
      retrieval_score: enrichRowScore(row, query, 1)
    }));

  return sortResultsForTina(mapped, query).slice(0, topK);
}

export async function searchSimilar(arg1, arg2) {
  const query =
    typeof arg1 === "object" && arg1 !== null
      ? String(arg1.query || arg1.keyword || "")
      : String(arg1 || "");

  const topK =
    typeof arg1 === "object" && arg1 !== null
      ? Number(arg1.topK || arg1.limit || SEARCH_MATCH_COUNT)
      : Number(arg2 || SEARCH_MATCH_COUNT);

  const embedding = await createEmbedding(query);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: Math.max(topK * 3, topK),
    match_threshold: VECTOR_SIMILARITY_THRESHOLD
  });

  if (error) throw error;

  const mapped = safeArray(data)
    .map((row) => {
      const mappedRow = mapRowToResult(row);
      const score = Number(row.similarity || row.score || 1);

      return {
        ...mappedRow,
        score,
        similarity: score,
        retrievalScore: enrichRowScore(mappedRow, query, score),
        retrieval_score: enrichRowScore(mappedRow, query, score)
      };
    });

  return sortResultsForTina(mapped, query).slice(0, topK);
}

export async function smartSearch(arg1, arg2) {
  const query =
    typeof arg1 === "object" && arg1 !== null
      ? String(arg1.query || arg1.keyword || "")
      : String(arg1 || "");

  const topK =
    typeof arg1 === "object" && arg1 !== null
      ? Number(arg1.topK || arg1.limit || SEARCH_MATCH_COUNT)
      : Number(arg2 || SEARCH_MATCH_COUNT);

  const exactResults = await searchBySourceName({ query, topK });
  const semanticResults = await searchSimilar({ query, topK });

  const merged = [];
  const seen = new Set();

  const prioritized = exactResults.length
    ? [...exactResults, ...semanticResults]
    : [...semanticResults];

  for (const item of prioritized) {
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

  return sortResultsForTina(merged, query).slice(0, topK);
}

/* =========================================================
   QUIZ SOURCE RETRIEVAL
========================================================= */

export async function getQuizSourceChunks({
  topic = "",
  excludeSourcePaths = [],
  excludeChunkIds = [],
  limit = 5
} = {}) {
  const query = normalizeText(topic || "Philippine Taxation");

  const results = await smartSearch({
    query,
    topK: Math.max(limit * 3, 10)
  });

  return results
    .filter((row) => !excludeChunkIds.includes(String(row.id || "")))
    .filter((row) => !excludeSourcePaths.includes(row.sourcePath || row.source_path || row.source || ""))
    .slice(0, limit)
    .map((row) => ({
      ...row,
      sourceTitle:
        row.metadata?.documentTitle ||
        row.originalSource ||
        row.source,
      sourcePath:
        row.sourcePath ||
        row.source_path ||
        row.source,
      fileId:
        row.metadata?.fileId ||
        row.metadata?.file_id ||
        null
    }));
}

/* =========================================================
   STATS / HEALTH
========================================================= */

export async function getVectorStoreStats() {
  const { count, error } = await supabase
    .from("documents")
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

  const { data: rows } = await supabase
    .from("documents")
    .select("source")
    .limit(10000);

  const sourceNames = [
    ...new Set(safeArray(rows).map((row) => row.source).filter(Boolean))
  ];

  return {
    storage: "supabase",
    chunks: count || 0,
    sources: sourceNames.length,
    sourceNames,
    embeddingModel: OPENAI_MODEL,
    vectorTable: "documents",
    engineVersion: "2.4.0"
  };
}

export function vectorStoreHealthCheck() {
  return {
    ok: true,
    engine: "TINA_VECTOR_STORE",
    version: "2.4.0",
    embeddingModel: OPENAI_MODEL,
    vectorTable: "documents",
    authorityEngineCompatible: true,
    exactCitationPriority: true,
    issueMismatchSuppression: true,
    controllingPrecedenceAware: true,
    adaptiveRetrievalCompatible: true
  };
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  supabase,
  normalizeSourceName,
  normalizeForMatch,
  extractIssuanceReference,
  detectIssueTypes,
  hasIssueOverlap,
  hasIssueMismatch,
  createEmbedding,
  addDocumentToVectorStore,
  clearVectorStore,
  searchBySourceName,
  searchSimilar,
  smartSearch,
  getQuizSourceChunks,
  getVectorStoreStats,
  vectorStoreHealthCheck
};
