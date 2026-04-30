import { createClient } from "@supabase/supabase-js";

import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  saveMessage
} from "./conversation-memory.js";

import {
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";

import {
  loginUser,
  registerUser,
  authenticate,
  requireAdmin
} from "./auth.js";

import {
  clearVectorStore,
  addDocumentToVectorStore,
  searchSimilar,
  smartSearch,
  getVectorStoreStats
} from "./vector-store.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

/* ================= INIT ================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ================= BASIC HELPERS ================= */

function getUserId(req) {
  return req.user?.id || req.user?.user_id || req.user?.sub || req.user?.username;
}

function normalizeSourceName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\bno\.?\b/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getDocPath(doc = {}) {
  return String(
    doc.metadata?.path ||
      doc.path ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source ||
      ""
  );
}

function getDocOriginalName(doc = {}) {
  return String(
    doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source ||
      ""
  );
}

/* ================= TINA V2 AUTHORITY ENGINE ================= */

function getSourceTier(doc = {}) {
  const value = `${getDocPath(doc)} ${getDocOriginalName(doc)} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) {
    return {
      tier: 1,
      label: "Tax Code / NIRC",
      weight: 1.0
    };
  }

  if (value.includes("02_revenue_regulations")) {
    return {
      tier: 2,
      label: "Revenue Regulations",
      weight: 0.95
    };
  }

  if (value.includes("03_rmc")) {
    return {
      tier: 3,
      label: "Revenue Memorandum Circulars",
      weight: 0.9
    };
  }

  if (value.includes("04_rmo")) {
    return {
      tier: 4,
      label: "Revenue Memorandum Orders",
      weight: 0.85
    };
  }

  if (value.includes("05_bir_rulings")) {
    return {
      tier: 5,
      label: "BIR Rulings",
      weight: 0.75
    };
  }

  if (value.includes("06_court_cases")) {
    return {
      tier: 6,
      label: "Court Cases",
      weight: 0.6
    };
  }

  if (value.includes("07_cpa_notes")) {
    return {
      tier: 7,
      label: "CPA Notes / Internal Notes",
      weight: 0.4
    };
  }

  return {
    tier: 99,
    label: "Unclassified Source",
    weight: 0.5
  };
}

function classifyQuestion(question = "") {
  const q = String(question || "").toLowerCase();

  if (
    /\b(rr|rmc|rmo)\s*(no\.?)?\s*\d+/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order")
  ) {
    return "issuance";
  }

  if (
    q.includes("bir ruling") ||
    q.includes("da(") ||
    q.includes("ot-") ||
    q.includes("ruling no")
  ) {
    return "ruling";
  }

  if (
    q.includes("case") ||
    q.includes(" v. ") ||
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes("cta") ||
    q.includes("supreme court") ||
    q.includes("g.r. no")
  ) {
    return "case";
  }

  if (
    q.startsWith("what is") ||
    q.startsWith("what are") ||
    q.startsWith("define") ||
    q.includes("meaning of") ||
    q.includes("definition of") ||
    q.includes("explain")
  ) {
    return "concept";
  }

  if (
    q.includes("deadline") ||
    q.includes("due date") ||
    q.includes("filing") ||
    q.includes("form") ||
    q.includes("rate") ||
    q.includes("threshold") ||
    q.includes("penalty")
  ) {
    return "compliance";
  }

  return "general";
}

function isPreferredForQuestion(doc, questionType) {
  const { tier } = getSourceTier(doc);

  if (questionType === "concept") {
    return tier === 1 || tier === 2 || tier === 3;
  }

  if (questionType === "compliance") {
    return tier === 1 || tier === 2 || tier === 3 || tier === 4;
  }

  if (questionType === "ruling") {
    return tier === 5 || tier === 1 || tier === 2 || tier === 3;
  }

  if (questionType === "case") {
    return tier === 6;
  }

  if (questionType === "issuance") {
    return tier === 2 || tier === 3 || tier === 4;
  }

  return true;
}

function rankDocsByAuthority(docs = []) {
  return docs
    .map((doc) => {
      const sourceTier = getSourceTier(doc);
      const rawScore = Number(doc.score || 0);

      return {
        ...doc,
        sourceTier,
        rawScore,
        adjustedScore: rawScore * sourceTier.weight
      };
    })
    .sort((a, b) => {
      if (b.adjustedScore !== a.adjustedScore) {
        return b.adjustedScore - a.adjustedScore;
      }

      return a.sourceTier.tier - b.sourceTier.tier;
    });
}

function filterDocsByQuestionType(docs = [], questionType = "general") {
  const preferredDocs = docs.filter((doc) =>
    isPreferredForQuestion(doc, questionType)
  );

  return preferredDocs.length > 0 ? preferredDocs : docs;
}

/* ================= ISSUANCE DETECTION ================= */

function detectIssuanceQuery(question = "") {
  const q = String(question || "");

  const rr = q.match(
    /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rr) {
    return {
      type: "RR",
      number: rr[1],
      year: rr[2],
      normalized: `rr-${rr[1]}-${rr[2]}`
    };
  }

  const rmc = q.match(
    /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmc) {
    return {
      type: "RMC",
      number: rmc[1],
      year: rmc[2],
      normalized: `rmc-${rmc[1]}-${rmc[2]}`
    };
  }

  const rmo = q.match(
    /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ ]?\s*(\d{2,4})\b/i
  );

  if (rmo) {
    return {
      type: "RMO",
      number: rmo[1],
      year: rmo[2],
      normalized: `rmo-${rmo[1]}-${rmo[2]}`
    };
  }

  return null;
}

function isExactIssuanceMatch(doc, issuance) {
  if (!doc || !issuance) return false;

  const target = normalizeForMatch(issuance.normalized);

  const candidates = [
    doc.source,
    doc.originalSource,
    doc.metadata?.originalSource,
    doc.metadata?.originalFileName,
    doc.metadata?.normalizedSource,
    doc.metadata?.path,
    doc.path
  ]
    .filter(Boolean)
    .map(normalizeForMatch);

  return candidates.some((candidate) => candidate.includes(target));
}

function uniqueSources(docs = []) {
  const seen = new Set();

  return docs
    .filter((doc) => {
      const key = doc.source || getDocOriginalName(doc);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((doc) => ({
      source: doc.source,
      originalSource: getDocOriginalName(doc),
      path: getDocPath(doc),
      score: doc.score,
      adjustedScore: doc.adjustedScore,
      authorityTier: doc.sourceTier?.tier || getSourceTier(doc).tier,
      authorityLabel: doc.sourceTier?.label || getSourceTier(doc).label,
      preview: doc.text ? doc.text.substring(0, 200) : ""
    }));
}

/* ================= MEMORY ================= */

function buildMemoryContext(messages = []) {
  if (!messages.length) return "No prior conversation.";

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
    .join("\n");
}

async function saveConversationTurn({
  conversationId,
  userId,
  question,
  answerText
}) {
  if (!conversationId || !userId) return;

  await saveMessage(supabase, {
    conversationId,
    userId,
    role: "user",
    content: question
  });

  await saveMessage(supabase, {
    conversationId,
    userId,
    role: "assistant",
    content: answerText
  });

  const hooks = extractMemoryHooks(question);
  await saveMemoryHooks(supabase, userId, hooks);
}

/* ================= ADMIN SECRET ================= */

function allowAuthenticatedOrIndexSecret(req, res, next) {
  const providedSecret =
    req.query.secret ||
    req.headers["x-index-secret"] ||
    req.headers["x-admin-secret"];

  if (
    process.env.INDEX_SECRET &&
    providedSecret &&
    providedSecret === process.env.INDEX_SECRET
  ) {
    req.user = {
      id: "index-secret-admin",
      username: "index-secret-admin",
      role: "admin"
    };
    return next();
  }

  return authenticate(req, res, next);
}

/* ================= HEALTH ================= */

app.get("/", (req, res) => {
  res.send("TINA backend is running.");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    engine: "TINA v2 Big 4 Tax Intelligence Engine",
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL),
    googleDriveFolder: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
    googleServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    oldGoogleKeyFile: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
    indexSecretEnabled: Boolean(process.env.INDEX_SECRET),
    vectorStore: getVectorStoreStats(),
    time: new Date().toISOString()
  });
});

/* ================= AUTH ================= */

app.post("/register", async (req, res) => {
  try {
    const { username, password, email, mobile, company } = req.body;

    const user = await registerUser(
      username,
      password,
      "user",
      email,
      mobile,
      company
    );

    res.status(201).json({
      message: "Registration successful.",
      user
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(400).json({
      error: error.message || "Registration failed"
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await loginUser(username, password);

    if (!result) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed"
    });
  }
});

/* ================= CONVERSATIONS ================= */

app.post("/conversations", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in token." });
    }

    const conversation = await createConversation(supabase, {
      userId,
      title: title || "New Conversation"
    });

    res.status(201).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create conversation"
    });
  }
});

app.get("/conversations", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in token." });
    }

    const conversations = await getUserConversations(supabase, userId);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load conversations"
    });
  }
});

app.get("/conversations/:conversationId/messages", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User ID not found in token." });
    }

    const messages = await getConversationMessages(supabase, {
      conversationId,
      userId
    });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to load messages"
    });
  }
});

/* ================= GOOGLE DRIVE ROUTES ================= */

app.get("/list", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "GOOGLE_DRIVE_FOLDER_ID not set"
      });
    }

    const files = await listDriveFiles(folderId);

    res.json({
      success: true,
      totalFiles: files.length,
      files
    });
  } catch (error) {
    console.error("List error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list files"
    });
  }
});

app.get("/read-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "GOOGLE_DRIVE_FOLDER_ID not set"
      });
    }

    const files = await listDriveFiles(folderId);
    const results = [];

    for (const file of files) {
      try {
        let text = await extractTextFromFile(file);
        text = (text || "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

        results.push({
          fileName: file.name,
          normalizedSource: normalizeSourceName(file.name),
          path: file.path || file.name,
          authorityTier: getSourceTier({
            source: file.name,
            metadata: { path: file.path || file.name }
          }),
          mimeType: file.mimeType,
          textLength: text.length,
          textPreview: text.substring(0, 1000)
        });
      } catch (fileError) {
        results.push({
          fileName: file.name,
          normalizedSource: normalizeSourceName(file.name),
          path: file.path || file.name,
          mimeType: file.mimeType,
          textLength: 0,
          error: fileError.message || "Failed to read file"
        });
      }
    }

    res.json({
      success: true,
      message: "Drive read completed.",
      filesRead: results.length,
      files: results
    });
  } catch (error) {
    console.error("Read-drive error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Drive read failed"
    });
  }
});

app.get("/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "GOOGLE_DRIVE_FOLDER_ID not set"
      });
    }

    console.log("Starting TINA v2 Google Drive indexing...");
    await clearVectorStore();

    const files = await listDriveFiles(folderId);
    const indexed = [];
    const failed = [];

    for (const file of files) {
      try {
        let text = await extractTextFromFile(file);
        text = (text || "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

        const path = file.path || file.name;
        const normalizedSource = normalizeSourceName(file.name);

        const tierInfo = getSourceTier({
          source: file.name,
          metadata: {
            path,
            originalFileName: file.name
          }
        });

        if (!text) {
          failed.push({
            fileName: file.name,
            normalizedSource,
            path,
            authorityTier: tierInfo,
            mimeType: file.mimeType,
            reason: "No readable text"
          });
          continue;
        }

        const result = await addDocumentToVectorStore(text, normalizedSource, {
          fileId: file.id,
          originalFileName: file.name,
          originalSource: file.name,
          normalizedSource,
          mimeType: file.mimeType,
          path,
          modifiedTime: file.modifiedTime || null,
          authorityTier: tierInfo.tier,
          authorityLabel: tierInfo.label,
          authorityWeight: tierInfo.weight
        });

        indexed.push({
          fileName: file.name,
          normalizedSource,
          path,
          authorityTier: tierInfo,
          mimeType: file.mimeType,
          textLength: text.length,
          chunksAdded: result?.chunksAdded ?? 0,
          status: "Indexed",
          preview: text.substring(0, 200)
        });
      } catch (fileError) {
        failed.push({
          fileName: file.name,
          normalizedSource: normalizeSourceName(file.name),
          path: file.path || file.name,
          mimeType: file.mimeType,
          reason: fileError.message || "File indexing failed"
        });
      }
    }

    const stats = getVectorStoreStats();

    console.log("TINA v2 Google Drive indexing completed:", {
      totalFilesChecked: files.length,
      filesIndexed: indexed.length,
      filesFailed: failed.length,
      vectorStore: stats
    });

    res.json({
      success: true,
      engine: "TINA v2 Big 4 Tax Intelligence Engine",
      message: "Drive indexing completed.",
      totalFilesChecked: files.length,
      filesIndexed: indexed.length,
      filesFailed: failed.length,
      vectorStore: stats,
      indexed,
      failed
    });
  } catch (error) {
    console.error("Index-drive error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Drive indexing failed"
    });
  }
});

app.get("/vector-stats", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    res.json({
      success: true,
      engine: "TINA v2 Big 4 Tax Intelligence Engine",
      vectorStore: getVectorStoreStats()
    });
  } catch (error) {
    console.error("Vector stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to read vector stats"
    });
  }
});

/* ================= FALLBACK ANSWER ================= */

async function generateGeneralFallbackAnswer(cleanQuestion, memoryContext, reason = "No sufficient indexed source was found.") {
  const fallbackSystemPrompt = `
You are TINA, Tax Information Navigation Assistant for Bong Corpuz & Co. CPAs.

You are allowed to answer using general tax knowledge only when indexed Google Drive sources are absent or weak.

Rules:
1. Clearly state that the answer is a general fallback answer.
2. Do not pretend the answer came from the indexed knowledge base.
3. Keep the answer concise, professional, and Philippine-tax oriented.
4. If the matter requires legal/tax verification, advise checking the NIRC, BIR issuances, or official BIR source.
5. Do not invent specific RR, RMC, RMO, deadlines, rates, thresholds, or citations if uncertain.
6. For exact issuance questions, do not provide speculative content.
`.trim();

  const fallbackUserPrompt = `
Reason for fallback:
${reason}

Conversation Memory:
${memoryContext}

Question:
${cleanQuestion}
`.trim();

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: fallbackSystemPrompt },
      { role: "user", content: fallbackUserPrompt }
    ]
  });

  const text = response.choices?.[0]?.message?.content?.trim();

  return (
    "General TINA Fallback Answer\n\n" +
    `Source Status: ${reason}\n\n` +
    "Important Note: This answer is not based on an indexed Google Drive source and should be verified against official BIR/NIRC sources.\n\n" +
    (text || "No fallback answer generated.")
  );
}

/* ================= ASK WITH TINA V2 ENGINE ================= */

app.post("/ask", authenticate, async (req, res) => {
  try {
    const { question, conversationId } = req.body;
    const userId = getUserId(req);

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question required"
      });
    }

    const cleanQuestion = question.trim();
    const issuance = detectIssuanceQuery(cleanQuestion);
    const questionType = classifyQuestion(cleanQuestion);

    let conversationHistory = [];
    if (conversationId && userId) {
      conversationHistory = await getConversationMessages(supabase, {
        conversationId,
        userId
      });
    }

    const memoryContext = buildMemoryContext(conversationHistory);

    let relevantDocs = [];

    try {
      relevantDocs = await smartSearch(cleanQuestion, 16);
    } catch (error) {
      console.error("Smart search failed:", error.message);

      try {
        relevantDocs = await searchSimilar(cleanQuestion, 16);
      } catch (fallbackError) {
        console.error("Fallback search failed:", fallbackError.message);
      }
    }

    relevantDocs = rankDocsByAuthority(relevantDocs || []);
    relevantDocs = filterDocsByQuestionType(relevantDocs, questionType);

    if (!relevantDocs || relevantDocs.length === 0) {
      let answerText;

      if (issuance || questionType === "issuance") {
        answerText = `No indexed document found for the requested issuance. TINA will not generate a speculative answer. Please upload or re-index the exact RR/RMC/RMO.`;
      } else {
        answerText = await generateGeneralFallbackAnswer(
          cleanQuestion,
          memoryContext,
          "No indexed Google Drive source matched the question."
        );
      }

      await saveConversationTurn({
        conversationId,
        userId,
        question: cleanQuestion,
        answerText
      });

      return res.json({
        success: true,
        engine: "TINA v2",
        answer: answerText,
        answerMode: issuance ? "no_exact_issuance_match" : "general_fallback_no_context",
        confidence: issuance ? "LOW" : "GENERAL",
        sourceStatus: "NO_INDEXED_SOURCE",
        questionType,
        sourcesUsed: [],
        vectorMatches: 0,
        detectedIssuance: issuance || null
      });
    }

    if (issuance) {
      const exactDocs = relevantDocs.filter((doc) =>
        isExactIssuanceMatch(doc, issuance)
      );

      if (exactDocs.length === 0) {
        const answerText = `No indexed document found for ${issuance.type} No. ${issuance.number}-${issuance.year}. TINA will not generate a speculative answer. Please upload or re-index the exact issuance.`;

        await saveConversationTurn({
          conversationId,
          userId,
          question: cleanQuestion,
          answerText
        });

        return res.json({
          success: true,
          engine: "TINA v2",
          answer: answerText,
          answerMode: "no_exact_issuance_match",
          confidence: "LOW",
          sourceStatus: "NO_EXACT_ISSUANCE_MATCH",
          questionType,
          sourcesUsed: [],
          vectorMatches: relevantDocs.length,
          detectedIssuance: issuance
        });
      }

      relevantDocs = rankDocsByAuthority(exactDocs);
    }

    const MIN_SCORE = issuance ? 0 : 0.45;

    let highConfidenceDocs = relevantDocs.filter((doc) => {
      const score = Number(doc.score);
      if (issuance) return true;
      return !Number.isNaN(score) && score >= MIN_SCORE;
    });

    highConfidenceDocs = rankDocsByAuthority(highConfidenceDocs).slice(0, 8);

    if (highConfidenceDocs.length === 0) {
      let answerText;

      if (issuance || questionType === "issuance") {
        answerText =
          "Insufficient supporting data found in indexed sources. TINA will not generate an answer to avoid incorrect interpretation.";
      } else {
        answerText = await generateGeneralFallbackAnswer(
          cleanQuestion,
          memoryContext,
          "Indexed sources were found but the similarity confidence was low."
        );
      }

      await saveConversationTurn({
        conversationId,
        userId,
        question: cleanQuestion,
        answerText
      });

      return res.json({
        success: true,
        engine: "TINA v2",
        answer: answerText,
        answerMode: issuance ? "low_confidence" : "general_fallback_low_confidence",
        confidence: issuance ? "LOW" : "GENERAL",
        sourceStatus: issuance ? "LOW_CONFIDENCE_EXACT_QUERY" : "LOW_CONFIDENCE_GENERAL_QUERY",
        questionType,
        sourcesUsed: [],
        vectorMatches: relevantDocs.length,
        detectedIssuance: issuance || null
      });
    }

    const sourcesUsed = uniqueSources(highConfidenceDocs);

    const topTier = Math.min(...sourcesUsed.map((s) => s.authorityTier || 99));

    let confidence = "MEDIUM";
    if (issuance) confidence = "HIGH";
    else if (topTier <= 2) confidence = "HIGH";
    else if (topTier <= 4) confidence = "MEDIUM";
    else confidence = "LIMITED";

    const context = highConfidenceDocs
      .map((doc, index) => {
        const tier = getSourceTier(doc);

        return `
SOURCE ${index + 1}: ${doc.source}
ORIGINAL SOURCE: ${getDocOriginalName(doc)}
PATH: ${getDocPath(doc)}
AUTHORITY TIER: ${tier.tier} - ${tier.label}
VECTOR SCORE: ${doc.score ?? "Not shown"}
ADJUSTED SCORE: ${doc.adjustedScore ?? "Not shown"}
TEXT:
${doc.text}
        `.trim();
      })
      .join("\n\n---\n\n");

    const systemPrompt = `
You are TINA v2, Big 4-level Tax Intelligence and Navigation Assistant for Bong Corpuz & Co. CPAs.

You are a Philippine tax, BIR compliance, and tax research assistant.

SOURCE AUTHORITY HIERARCHY:
Tier 1: NIRC / Tax Code
Tier 2: Revenue Regulations
Tier 3: Revenue Memorandum Circulars
Tier 4: Revenue Memorandum Orders
Tier 5: BIR Rulings
Tier 6: Court Cases
Tier 7: CPA Notes / Internal Notes

STRICT RULES:
1. Answer ONLY from the provided CONTEXT.
2. Do NOT use general knowledge, prior knowledge, assumptions, or memory when indexed context is provided.
3. Do NOT invent RR, RMC, RMO, BIR rulings, dates, sections, forms, deadlines, rates, thresholds, case doctrines, or legal citations.
4. If the answer is not explicitly supported by the CONTEXT, say: "No verified answer found in the indexed source."
5. If a specific issuance is asked and the exact issuance is not in the CONTEXT, say: "No indexed document found for the requested issuance."
6. Prefer higher authority sources over lower authority sources.
7. Use court cases only as interpretative support unless the question specifically asks about a case.
8. Use CPA notes only as internal guidance, not primary legal authority.
9. Always cite source filename/path shown in the CONTEXT.
10. Do not mention ChatGPT.

REQUIRED FORMAT:

Direct Answer:
[Concise answer based only on context.]

Primary Legal / Tax Basis:
[Specific NIRC/RR/RMC/RMO/BIR ruling/case basis shown in context, or "Not shown in retrieved context."]

Key Provisions / Findings:
- [Only provisions shown in context.]
- [If not shown, say "Not shown in retrieved context."]

Practical Compliance Notes:
- [Practical tax/compliance implication based only on context.]
- [If not shown, say "Not shown in retrieved context."]

Limitations / Verification Note:
[State if amendment status, supersession, effective date, or completeness is not shown in context.]

Confidence:
[HIGH, MEDIUM, LIMITED, or LOW based on the supplied source authority and context.]

Sources Used:
[List exact filename/path from CONTEXT.]
    `.trim();

    const userPrompt = `
Conversation Memory:
${memoryContext}

Question Type:
${questionType}

Detected Issuance:
${issuance ? JSON.stringify(issuance) : "None"}

CONTEXT:
${context}

USER QUESTION:
${cleanQuestion}

Instruction:
Answer strictly using only the CONTEXT. Apply the authority hierarchy. If context is insufficient, say so.
    `.trim();

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    let answerText = response.choices?.[0]?.message?.content?.trim() || "";

    const sourceNames = sourcesUsed
      .map((s) => s.path || s.originalSource || s.source)
      .filter(Boolean);

    if (!answerText) {
      answerText = "No verified answer found in the indexed source.";
    }

    if (!answerText.toLowerCase().includes("sources used:")) {
      answerText += `\n\nSources Used:\n${sourceNames.map((s) => `- ${s}`).join("\n")}`;
    }

    if (!answerText.toLowerCase().includes("confidence:")) {
      answerText += `\n\nConfidence:\n${confidence}`;
    }

    await saveConversationTurn({
      conversationId,
      userId,
      question: cleanQuestion,
      answerText
    });

    return res.json({
      success: true,
      engine: "TINA v2",
      answer: answerText,
      answerMode: issuance ? "exact_issuance_strict_rag" : "authority_ranked_rag",
      confidence,
      sourceStatus: "INDEXED_SOURCE_USED",
      questionType,
      sourcesUsed,
      vectorMatches: highConfidenceDocs.length,
      detectedIssuance: issuance || null
    });
  } catch (error) {
    console.error("Ask error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Ask failed"
    });
  }
});

/* ================= START ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 TINA v2 Backend running on port ${PORT}`);
});
