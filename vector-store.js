// FILE: vector-store.js

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { buildAuthorityMetadata } from "./authority-engine.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const CHUNK_SIZE = Number(process.env.VECTOR_CHUNK_SIZE || 1200);
const CHUNK_OVERLAP = Number(process.env.VECTOR_CHUNK_OVERLAP || 200);

const VECTOR_TABLE = "tina_vector_store";

/* ================= TEXT / EMBEDDINGS ================= */

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();

    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;

    start = Math.max(0, end - overlap);
    if (start >= end) break;
  }

  return chunks;
}

async function embedText(text) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: String(text || "").slice(0, 24000)
  });

  return response.data?.[0]?.embedding || [];
}

/* ================= NORMALIZATION ================= */

export function normalizeSourceName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
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
    .replace(/[_\s]/g, "-")
    .replace(/[\\/]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/* ================= ISSUANCE MATCHING ================= */

function padNumber(num = "") {
  const n = String(num || "").replace(/^0+/, "");
  return {
    raw: n,
    two: n.padStart(2, "0"),
    three: n.padStart(3, "0")
  };
}

function expandYear(year = "") {
  const y = String(year || "");
  if (y.length === 2) return [`20${y}`, `19${y}`, y];
  return [y, y.slice(-2)];
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

function buildPossibleSourceKeywords(query = "") {
  const q = String(query || "");
  const keywords = [];

  const rrMatch = q.match(
    /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rrMatch) {
    keywords.push(
      ...buildIssuanceKeywords("rr", rrMatch[1], rrMatch[2], "revenue regulation")
    );
  }

  const rmcMatch = q.match(
    /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmcMatch) {
    keywords.push(
      ...buildIssuanceKeywords("rmc", rmcMatch[1], rmcMatch[2], "revenue memorandum circular")
    );
  }

  const rmoMatch = q.match(
    /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmoMatch) {
    keywords.push(
      ...buildIssuanceKeywords("rmo", rmoMatch[1], rmoMatch[2], "revenue memorandum order")
    );
  }

  const rulingMatch = q.match(
    /\b(?:BIR\s*)?Ruling\s*(?:No\.?)?\s*([A-Z0-9()\-]+)\s*[-_ ]?\s*(\d{4})\b/i
  );

  if (rulingMatch) {
    keywords.push(`ruling-${rulingMatch[1]}-${rulingMatch[2]}`);
    keywords.push(`bir ruling ${rulingMatch[1]}-${rulingMatch[2]}`);
    keywords.push(`bir-ruling-${rulingMatch[1]}-${rulingMatch[2]}`);
  }

  return [...new Set(keywords.map(normalizeForMatch).filter(Boolean))];
}

/* ================= STRICT QUIZ TOPIC FILTERING ================= */

function getTopicKeywords(topic = "") {
  const q = String(topic || "").toLowerCase();

  if (q.includes("vat") || q.includes("value-added")) {
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

  if (q.includes("percentage")) {
    return ["percentage tax", "2551", "non-vat", "non vat", "gross receipts", "3%"];
  }

  if (q.includes("final")) {
    return ["final tax", "final withholding", "passive income", "interest income", "royalties", "dividends"];
  }

  if (q.includes("capital") || q.includes("cgt")) {
    return ["capital gains tax", "cgt", "capital asset", "sale of shares", "real property", "6%"];
  }

  if (q.includes("donor")) {
    return ["donor", "donor's tax", "donors tax", "gift", "donation"];
  }

  if (q.includes("estate")) {
    return ["estate tax", "estate", "decedent", "gross estate", "net estate"];
  }

  if (q.includes("dst") || q.includes("documentary")) {
    return ["documentary stamp tax", "dst", "documentary stamp", "stamp tax"];
  }

  if (q.includes("remed") || q.includes("assessment") || q.includes("protest")) {
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
    return ["local taxation", "local tax", "business tax", "lgu", "mayor's permit", "local business tax"];
  }

  return [String(topic || "").trim()].filter(Boolean);
}

function getTopicNegativeKeywords(topic = "") {
  const q = String(topic || "").toLowerCase();

  if (q.includes("vat") || q.includes("value-added")) {
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
  const text = `${row.text || ""} ${row.source || ""} ${row.original_source || ""} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
  const path = String(row.metadata?.path || row.original_source || row.source || "").toLowerCase();

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

  if (path.includes("01_tax_code")) score += 3;
  if (path.includes("02_revenue_regulations")) score += 4;
  if (path.includes("03_rmc")) score += 3;
  if (path.includes("04_rmo")) score += 2;
  if (path.includes("05_bir_rulings")) score += 1;
  if (path.includes("07_cpa_notes")) score += 1;

  return score;
}

/* ================= AUTHORITY HELPERS ================= */

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
    recency_date: authority.recencyDate,
    jurisdiction: metadata.jurisdiction || "PH",
    source_category: metadata.sourceCategory || null,
    document_title:
      metadata.documentTitle ||
      metadata.originalFileName ||
      metadata.originalSource ||
      source,
    effective_from: metadata.effectiveFrom || null,
    effective_to: metadata.effectiveTo || null
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
    effectiveTo: authorityFields.effective_to
  };
}

/* ================= HELPERS ================= */

function mapRowToResult(row, score = 1) {
  const metadata = row.metadata || {};

  return {
    id: row.id,
    source: row.source,
    originalSource:
      row.original_source || metadata.originalSource || row.source,
    text: row.text,
    chunkIndex: row.chunk_index,
    metadata: {
      ...metadata,
      authorityType: row.authority_type || metadata.authorityType || "SECONDARY",
      authorityLevel: Number(row.authority_level || metadata.authorityLevel || 9),
      authorityScore: Number(row.authority_score || metadata.authorityScore || 40),
      authorityLabel:
        row.authority_label || metadata.authorityLabel || "Secondary / Commentary",
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
        row.document_title || metadata.documentTitle || metadata.originalFileName || row.source,
      effectiveFrom: row.effective_from || metadata.effectiveFrom || null,
      effectiveTo: row.effective_to || metadata.effectiveTo || null
    },
    authorityType: row.authority_type || metadata.authorityType || "SECONDARY",
    authorityLevel: Number(row.authority_level || metadata.authorityLevel || 9),
    authorityScore: Number(row.authority_score || metadata.authorityScore || 40),
    authorityLabel:
      row.authority_label || metadata.authorityLabel || "Secondary / Commentary",
    normalizedReference:
      row.normalized_reference || metadata.normalizedReference || null,
    normalizedAliases: Array.isArray(row.normalized_aliases)
      ? row.normalized_aliases
      : Array.isArray(metadata.normalizedAliases)
        ? metadata.normalizedAliases
        : [],
    recencyDate: row.recency_date || metadata.recencyDate || null,
    score: row.score ?? score
  };
}

function buildSourceIlikeFilters(keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);

  return [
    `source.ilike.%${normalizedKeyword}%`,
    `original_source.ilike.%${normalizedKeyword}%`,
    `metadata->>originalSource.ilike.%${normalizedKeyword}%`,
    `metadata->>originalFileName.ilike.%${normalizedKeyword}%`,
    `metadata->>normalizedSource.ilike.%${normalizedKeyword}%`,
    `metadata->>path.ilike.%${normalizedKeyword}%`,
    `normalized_reference.ilike.%${normalizedKeyword}%`
  ].join(",");
}

/* ================= PUBLIC API ================= */

export async function clearVectorStore() {
  const { error } = await supabase
    .from(VECTOR_TABLE)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;

  console.log("🧹 Supabase vector store cleared.");
  return true;
}

export async function removeSourceFromVectorStore(source) {
  const normalizedSource = normalizeSourceName(source);

  const { data, error } = await supabase
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

export async function addDocumentToVectorStore(text, source, metadata = {}) {
  const chunks = chunkText(text);
  const normalizedSource = normalizeSourceName(
    metadata.normalizedSource || source
  );

  if (!chunks.length) {
    return {
      source: normalizedSource,
      originalSource: source,
      chunksAdded: 0,
      reason: "No readable text chunks"
    };
  }

  await removeSourceFromVectorStore(normalizedSource);

  const rows = [];

  for (let i = 0; i < chunks.length; i++) {
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
      effective_to: authorityFields.effective_to
    });
  }

  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase.from(VECTOR_TABLE).insert(batch);

    if (error) {
      console.error("Supabase vector insert error:", error);
      throw error;
    }

    inserted += batch.length;
  }

  console.log(`✅ Supabase vectors saved: ${source} | chunks added: ${inserted}`);

  return {
    source: normalizedSource,
    originalSource: source,
    chunksAdded: inserted,
    storage: "supabase"
  };
}

export async function searchSimilar(query, topK = 5) {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_tina_vectors", {
    query_embedding: queryEmbedding,
    match_count: topK
  });

  if (error) {
    console.error("Supabase vector search error:", error);
    throw error;
  }

  return (data || []).map((row) => mapRowToResult(row, row.score));
}

export async function searchBySourceName(keyword, topK = 8) {
  if (!keyword) return [];

  const normalizedKeyword = normalizeForMatch(keyword);

  const { data, error } = await supabase
    .from(VECTOR_TABLE)
    .select(
      [
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
        "effective_to"
      ].join(",")
    )
    .or(buildSourceIlikeFilters(normalizedKeyword))
    .order("chunk_index", { ascending: true })
    .limit(topK);

  if (error) {
    console.error("Supabase source-name search error:", error);
    throw error;
  }

  return (data || []).map((row) => mapRowToResult(row, 1));
}

export async function smartSearch(query, topK = 8) {
  const keywords = buildPossibleSourceKeywords(query);

  for (const keyword of keywords) {
    const exactMatches = await searchBySourceName(keyword, topK);

    if (exactMatches.length > 0) {
      console.log(`🎯 Exact source match found in Supabase: ${keyword}`);
      return exactMatches;
    }
  }

  return await searchSimilar(query, topK);
}

/* ================= STRICT QUIZ SOURCE RETRIEVAL ================= */

export async function getQuizSourceChunks({
  topic = "",
  excludeSourcePaths = [],
  excludeChunkIds = [],
  limit = 5
} = {}) {
  const cleanTopic = String(topic || "").trim();
  const normalizedTopic = normalizeForMatch(cleanTopic);
  const topicKeywords = getTopicKeywords(cleanTopic);

  let query = supabase
    .from(VECTOR_TABLE)
    .select(
      [
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
        "effective_to"
      ].join(",")
    )
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

    return String(row.text || "").trim().length >= 300;
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
      return Math.random() - 0.5;
    })
    .slice(0, limit);

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    originalSource:
      row.original_source || row.metadata?.originalSource || row.source,
    sourceTitle:
      row.document_title ||
      row.metadata?.documentTitle ||
      row.metadata?.originalFileName ||
      row.original_source ||
      row.source,
    sourcePath: row.metadata?.path || row.original_source || row.source,
    fileId: row.metadata?.fileId || null,
    chunkIndex: row.chunk_index,
    text: row.text,
    metadata: {
      ...(row.metadata || {}),
      authorityType: row.authority_type || row.metadata?.authorityType || "SECONDARY",
      authorityLevel: Number(row.authority_level || row.metadata?.authorityLevel || 9),
      authorityScore: Number(row.authority_score || row.metadata?.authorityScore || 40),
      authorityLabel:
        row.authority_label || row.metadata?.authorityLabel || "Secondary / Commentary",
      normalizedReference:
        row.normalized_reference || row.metadata?.normalizedReference || null,
      normalizedAliases: Array.isArray(row.normalized_aliases)
        ? row.normalized_aliases
        : Array.isArray(row.metadata?.normalizedAliases)
          ? row.metadata.normalizedAliases
          : [],
      recencyDate: row.recency_date || row.metadata?.recencyDate || null,
      quizTopic: cleanTopic,
      quizTopicScore: row.quizTopicScore
    },
    authorityType: row.authority_type || row.metadata?.authorityType || "SECONDARY",
    authorityLevel: Number(row.authority_level || row.metadata?.authorityLevel || 9),
    authorityScore: Number(row.authority_score || row.metadata?.authorityScore || 40),
    authorityLabel:
      row.authority_label || row.metadata?.authorityLabel || "Secondary / Commentary",
    normalizedReference:
      row.normalized_reference || row.metadata?.normalizedReference || null,
    normalizedAliases: Array.isArray(row.normalized_aliases)
      ? row.normalized_aliases
      : Array.isArray(row.metadata?.normalizedAliases)
        ? row.metadata.normalizedAliases
        : [],
    recencyDate: row.recency_date || row.metadata?.recencyDate || null,
    score: row.quizTopicScore
  }));
}

/* ================= VECTOR STORE STATS ================= */

export async function getVectorStoreStats() {
  const { count, error } = await supabase
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

  const { data: sourceRows, error: sourceError } = await supabase
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
    chunkOverlap: CHUNK_OVERLAP
  };
}
