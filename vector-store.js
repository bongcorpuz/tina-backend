import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  Render-safe vector file.

  Default:
  - Render/Linux: /tmp/vector-store.json
  - Local fallback: OS temp directory

  Optional override:
  - VECTOR_STORE_FILE=/tmp/vector-store.json
*/
const VECTOR_FILE =
  process.env.VECTOR_STORE_FILE ||
  path.join(os.tmpdir(), "vector-store.json");

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const CHUNK_SIZE = Number(process.env.VECTOR_CHUNK_SIZE || 1200);
const CHUNK_OVERLAP = Number(process.env.VECTOR_CHUNK_OVERLAP || 200);

/* ================= STORE ================= */

function ensureStoreDirectory() {
  const dir = path.dirname(VECTOR_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStore() {
  try {
    ensureStoreDirectory();

    if (!fs.existsSync(VECTOR_FILE)) {
      return [];
    }

    const raw = fs.readFileSync(VECTOR_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) {
      console.warn("Vector store is not an array. Resetting in memory.");
      return [];
    }

    return parsed;
  } catch (error) {
    console.error("Vector store load error:", error.message);
    return [];
  }
}

function saveStore(data) {
  try {
    ensureStoreDirectory();

    const safeData = Array.isArray(data) ? data : [];
    fs.writeFileSync(VECTOR_FILE, JSON.stringify(safeData, null, 2), "utf8");

    return true;
  } catch (error) {
    console.error("Vector store save error:", error.message);
    throw error;
  }
}

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

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
      ...buildIssuanceKeywords(
        "rr",
        rrMatch[1],
        rrMatch[2],
        "revenue regulation"
      )
    );
  }

  const rmcMatch = q.match(
    /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmcMatch) {
    keywords.push(
      ...buildIssuanceKeywords(
        "rmc",
        rmcMatch[1],
        rmcMatch[2],
        "revenue memorandum circular"
      )
    );
  }

  const rmoMatch = q.match(
    /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmoMatch) {
    keywords.push(
      ...buildIssuanceKeywords(
        "rmo",
        rmoMatch[1],
        rmoMatch[2],
        "revenue memorandum order"
      )
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

function itemMatchesKeyword(item, keyword) {
  const normalizedKeyword = normalizeForMatch(keyword);

  const candidates = [
    item.source,
    item.originalSource,
    item.metadata?.originalSource,
    item.metadata?.originalFileName,
    item.metadata?.normalizedSource,
    item.metadata?.path,
    item.metadata?.fileId
  ]
    .filter(Boolean)
    .map(normalizeForMatch);

  return candidates.some((candidate) => candidate.includes(normalizedKeyword));
}

function mapStoreItemToResult(item, score = 1) {
  return {
    source: item.source,
    originalSource:
      item.originalSource || item.metadata?.originalSource || item.source,
    text: item.text,
    chunkIndex: item.chunkIndex,
    metadata: item.metadata || {},
    score
  };
}

/* ================= PUBLIC API ================= */

export async function clearVectorStore() {
  saveStore([]);
  console.log(`🧹 Vector store cleared: ${VECTOR_FILE}`);
  return true;
}

export async function removeSourceFromVectorStore(source) {
  const store = loadStore();
  const normalizedSource = normalizeSourceName(source);

  const filtered = store.filter((item) => {
    return (
      item.source !== normalizedSource &&
      item.metadata?.normalizedSource !== normalizedSource
    );
  });

  saveStore(filtered);

  return {
    source: normalizedSource,
    removedChunks: store.length - filtered.length,
    remainingChunks: filtered.length
  };
}

export async function addDocumentToVectorStore(text, source, metadata = {}) {
  const chunks = chunkText(text);
  const store = loadStore();

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

  let chunksAdded = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);

    store.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      source: normalizedSource,
      originalSource: source,
      chunkIndex: i,
      text: chunk,
      embedding,
      metadata: {
        ...metadata,
        originalSource: metadata.originalSource || source,
        originalFileName: metadata.originalFileName || source,
        normalizedSource,
        vectorFile: VECTOR_FILE
      },
      createdAt: new Date().toISOString()
    });

    chunksAdded++;
  }

  saveStore(store);

  console.log(
    `✅ Vector saved: ${source} | chunks added: ${chunksAdded} | total chunks: ${store.length}`
  );

  return {
    source: normalizedSource,
    originalSource: source,
    chunksAdded,
    totalChunks: store.length,
    vectorFile: VECTOR_FILE
  };
}

export async function searchSimilar(query, topK = 5) {
  const store = loadStore();

  if (!store.length) {
    console.warn("Vector search skipped: store is empty.");
    return [];
  }

  const queryEmbedding = await embedText(query);

  return store
    .map((item) =>
      mapStoreItemToResult(
        item,
        cosineSimilarity(queryEmbedding, item.embedding)
      )
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function searchBySourceName(keyword, topK = 8) {
  const store = loadStore();

  if (!store.length || !keyword) return [];

  return store
    .filter((item) => itemMatchesKeyword(item, keyword))
    .slice(0, topK)
    .map((item) => mapStoreItemToResult(item, 1));
}

export async function smartSearch(query, topK = 8) {
  const keywords = buildPossibleSourceKeywords(query);

  for (const keyword of keywords) {
    const exactMatches = searchBySourceName(keyword, topK);

    if (exactMatches.length > 0) {
      console.log(`🎯 Exact source match found for keyword: ${keyword}`);
      return exactMatches;
    }
  }

  return await searchSimilar(query, topK);
}

export function getVectorStoreStats() {
  const store = loadStore();

  const sources = [...new Set(store.map((item) => item.source).filter(Boolean))];

  let fileSizeBytes = 0;

  try {
    if (fs.existsSync(VECTOR_FILE)) {
      fileSizeBytes = fs.statSync(VECTOR_FILE).size;
    }
  } catch {
    fileSizeBytes = 0;
  }

  return {
    chunks: store.length,
    sources: sources.length,
    sourceNames: sources,
    vectorFile: VECTOR_FILE,
    fileExists: fs.existsSync(VECTOR_FILE),
    fileSizeBytes,
    embeddingModel: EMBEDDING_MODEL,
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP
  };
}
