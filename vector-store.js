import fs from "fs";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const VECTOR_FILE = path.join(process.cwd(), "vector-store.json");
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

/* ================= STORE ================= */

function loadStore() {
  if (!fs.existsSync(VECTOR_FILE)) return [];

  try {
    const raw = fs.readFileSync(VECTOR_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    console.error("Vector store load error:", error.message);
    return [];
  }
}

function saveStore(data) {
  fs.writeFileSync(VECTOR_FILE, JSON.stringify(data, null, 2), "utf8");
}

/* ================= TEXT / EMBEDDINGS ================= */

function chunkText(text, chunkSize = 1200, overlap = 200) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end).trim();

    if (chunk) chunks.push(chunk);

    if (end >= clean.length) break;
    start = end - overlap;
  }

  return chunks;
}

async function embedText(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });

  return response.data[0].embedding;
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
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function buildPossibleSourceKeywords(query = "") {
  const q = String(query || "");
  const keywords = [];

  const rrMatch = q.match(
    /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rrMatch) {
    const num = rrMatch[1];
    const year = rrMatch[2];

    keywords.push(`rr-${num}-${year}`);
    keywords.push(`rr_${num}-${year}`);
    keywords.push(`rr_${num}_${year}`);
    keywords.push(`rr ${num}-${year}`);
    keywords.push(`revenue regulations no. ${num}-${year}`);
    keywords.push(`revenue regulation ${num}-${year}`);
  }

  const rmcMatch = q.match(
    /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmcMatch) {
    const num = rmcMatch[1];
    const year = rmcMatch[2];

    keywords.push(`rmc-${num}-${year}`);
    keywords.push(`rmc_${num}-${year}`);
    keywords.push(`rmc_${num}_${year}`);
    keywords.push(`rmc ${num}-${year}`);
    keywords.push(`revenue memorandum circular no. ${num}-${year}`);
  }

  const rmoMatch = q.match(
    /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmoMatch) {
    const num = rmoMatch[1];
    const year = rmoMatch[2];

    keywords.push(`rmo-${num}-${year}`);
    keywords.push(`rmo_${num}-${year}`);
    keywords.push(`rmo_${num}_${year}`);
    keywords.push(`rmo ${num}-${year}`);
    keywords.push(`revenue memorandum order no. ${num}-${year}`);
  }

  const rulingMatch = q.match(
    /\b(?:BIR\s*)?Ruling\s*(?:No\.?)?\s*([A-Z0-9()\-]+)\s*[-_ ]?\s*(\d{4})\b/i
  );

  if (rulingMatch) {
    keywords.push(`ruling-${rulingMatch[1]}-${rulingMatch[2]}`);
    keywords.push(`bir ruling ${rulingMatch[1]}-${rulingMatch[2]}`);
  }

  return [...new Set(keywords)];
}

/* ================= PUBLIC API ================= */

export async function clearVectorStore() {
  saveStore([]);
  return true;
}

export async function addDocumentToVectorStore(text, source, metadata = {}) {
  const chunks = chunkText(text);
  const store = loadStore();

  const normalizedSource = normalizeSourceName(source);

  let chunksAdded = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedText(chunk);

    store.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      source: normalizedSource,
      originalSource: source,
      chunkIndex: i,
      text: chunk,
      embedding,
      metadata: {
        ...metadata,
        originalSource: source,
        normalizedSource
      },
      createdAt: new Date().toISOString()
    });

    chunksAdded++;
  }

  saveStore(store);

  return {
    source: normalizedSource,
    originalSource: source,
    chunksAdded
  };
}

export async function searchSimilar(query, topK = 5) {
  const store = loadStore();

  if (!store.length) return [];

  const queryEmbedding = await embedText(query);

  return store
    .map((item) => ({
      source: item.source,
      originalSource: item.originalSource || item.metadata?.originalSource || item.source,
      text: item.text,
      chunkIndex: item.chunkIndex,
      metadata: item.metadata || {},
      score: cosineSimilarity(queryEmbedding, item.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function searchBySourceName(keyword, topK = 8) {
  const store = loadStore();

  if (!store.length || !keyword) return [];

  const normalizedKeyword = normalizeForMatch(keyword);

  return store
    .filter((item) => {
      const source = normalizeForMatch(item.source || "");
      const originalSource = normalizeForMatch(item.originalSource || "");
      const metadataOriginal = normalizeForMatch(item.metadata?.originalSource || "");
      const metadataNormalized = normalizeForMatch(item.metadata?.normalizedSource || "");
      const pathName = normalizeForMatch(item.metadata?.path || "");

      return (
        source.includes(normalizedKeyword) ||
        originalSource.includes(normalizedKeyword) ||
        metadataOriginal.includes(normalizedKeyword) ||
        metadataNormalized.includes(normalizedKeyword) ||
        pathName.includes(normalizedKeyword)
      );
    })
    .slice(0, topK)
    .map((item) => ({
      source: item.source,
      originalSource: item.originalSource || item.metadata?.originalSource || item.source,
      text: item.text,
      chunkIndex: item.chunkIndex,
      metadata: item.metadata || {},
      score: 1
    }));
}

export async function smartSearch(query, topK = 8) {
  const keywords = buildPossibleSourceKeywords(query);

  for (const keyword of keywords) {
    const exactMatches = searchBySourceName(keyword, topK);

    if (exactMatches.length > 0) {
      return exactMatches;
    }
  }

  return await searchSimilar(query, topK);
}

export function getVectorStoreStats() {
  const store = loadStore();

  const sources = [...new Set(store.map((item) => item.source))];

  return {
    chunks: store.length,
    sources: sources.length,
    sourceNames: sources
  };
}