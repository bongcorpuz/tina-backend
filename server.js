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

/* ================= HELPERS ================= */

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
    doc.metadata?.path
  ]
    .filter(Boolean)
    .map(normalizeForMatch);

  return candidates.some((candidate) => candidate.includes(target));
}

function uniqueSources(docs = []) {
  const seen = new Set();

  return docs
    .filter((doc) => {
      if (!doc.source || seen.has(doc.source)) return false;
      seen.add(doc.source);
      return true;
    })
    .map((doc) => ({
      source: doc.source,
      originalSource:
        doc.originalSource ||
        doc.metadata?.originalSource ||
        doc.metadata?.originalFileName ||
        doc.source,
      score: doc.score,
      preview: doc.text ? doc.text.substring(0, 200) : ""
    }));
}

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

/*
  Allows protected admin/index routes using either:
  1. normal JWT authentication, or
  2. INDEX_SECRET for quick Render/browser testing.

  Example:
  /index-drive?secret=YOUR_INDEX_SECRET
*/
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
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL),
    googleDriveFolder: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
    googleServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    oldGoogleKeyFile: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
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

    console.log("Starting Google Drive indexing...");
    await clearVectorStore();

    const files = await listDriveFiles(folderId);
    const indexed = [];
    const failed = [];

    for (const file of files) {
      try {
        let text = await extractTextFromFile(file);
        text = (text || "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

        if (!text) {
          failed.push({
            fileName: file.name,
            normalizedSource: normalizeSourceName(file.name),
            path: file.path || file.name,
            mimeType: file.mimeType,
            reason: "No readable text"
          });
          continue;
        }

        const normalizedSource = normalizeSourceName(file.name);

        const result = await addDocumentToVectorStore(text, normalizedSource, {
          fileId: file.id,
          originalFileName: file.name,
          originalSource: file.name,
          normalizedSource,
          mimeType: file.mimeType,
          path: file.path || file.name,
          modifiedTime: file.modifiedTime || null
        });

        indexed.push({
          fileName: file.name,
          normalizedSource,
          path: file.path || file.name,
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

    console.log("Google Drive indexing completed:", {
      totalFilesChecked: files.length,
      filesIndexed: indexed.length,
      filesFailed: failed.length,
      vectorStore: stats
    });

    res.json({
      success: true,
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

async function generateGeneralFallbackAnswer(cleanQuestion, memoryContext) {
  const fallbackSystemPrompt = `
You are TINA, Tax Information Navigation Assistant for Bong Corpuz & Co. CPAs.

You are allowed to answer using general tax knowledge only when no indexed Google Drive source is available.

Rules:
1. Clearly state that no indexed source was found.
2. Do not pretend the answer came from the indexed knowledge base.
3. Keep the answer concise, professional, and Philippine-tax oriented.
4. If the matter requires legal/tax verification, advise checking the NIRC, BIR issuances, or official BIR source.
5. Do not invent specific RR, RMC, RMO, deadlines, rates, or citations if uncertain.
`.trim();

  const fallbackUserPrompt = `
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
    "No sufficient indexed Google Drive source was found. The following is a general TINA fallback answer and should be verified against official BIR/NIRC sources:\n\n" +
    (text || "No fallback answer generated.")
  );
}

/* ================= ASK WITH EXPERT TINA FLOW ================= */

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
      relevantDocs = await smartSearch(cleanQuestion, 12);
    } catch (error) {
      console.error("Smart search failed:", error.message);

      try {
        relevantDocs = await searchSimilar(cleanQuestion, 12);
      } catch (fallbackError) {
        console.error("Fallback search failed:", fallbackError.message);
      }
    }

    /*
      If no indexed docs are found:
      - For specific RR/RMC/RMO: do not fallback, to avoid fake issuance answers.
      - For general questions: use general fallback.
    */
    if (!relevantDocs || relevantDocs.length === 0) {
      let answerText;

      if (issuance) {
        answerText = `No indexed document found for ${issuance.type} No. ${issuance.number}-${issuance.year}. TINA will not generate a speculative answer. Please upload or re-index the exact issuance.`;
      } else {
        answerText = await generateGeneralFallbackAnswer(cleanQuestion, memoryContext);
      }

      await saveConversationTurn({
        conversationId,
        userId,
        question: cleanQuestion,
        answerText
      });

      return res.json({
        success: true,
        answer: answerText,
        answerMode: issuance ? "no_exact_issuance_match" : "general_fallback_no_context",
        confidence: issuance ? "LOW" : "GENERAL",
        sourcesUsed: [],
        vectorMatches: 0,
        detectedIssuance: issuance || null
      });
    }

    /*
      Exact issuance protection:
      If user asks RR 01-2026, TINA must use the exact indexed document only.
    */
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
          answer: answerText,
          answerMode: "no_exact_issuance_match",
          confidence: "LOW",
          sourcesUsed: [],
          vectorMatches: relevantDocs.length,
          detectedIssuance: issuance
        });
      }

      relevantDocs = exactDocs;
    }

    const MIN_SCORE = issuance ? 0 : 0.45;

    const highConfidenceDocs = relevantDocs.filter((doc) => {
      const score = Number(doc.score);
      if (issuance) return true;
      return !Number.isNaN(score) && score >= MIN_SCORE;
    });

    /*
      Low score:
      - For specific issuance: already protected above.
      - For general question: allow general fallback instead of dead-end.
    */
    if (highConfidenceDocs.length === 0) {
      let answerText;

      if (issuance) {
        answerText =
          "Insufficient supporting data found in indexed sources. TINA will not generate an answer to avoid incorrect interpretation.";
      } else {
        answerText = await generateGeneralFallbackAnswer(cleanQuestion, memoryContext);
      }

      await saveConversationTurn({
        conversationId,
        userId,
        question: cleanQuestion,
        answerText
      });

      return res.json({
        success: true,
        answer: answerText,
        answerMode: issuance ? "low_confidence" : "general_fallback_low_confidence",
        confidence: issuance ? "LOW" : "GENERAL",
        sourcesUsed: [],
        vectorMatches: relevantDocs.length,
        detectedIssuance: issuance || null
      });
    }

    const sourcesUsed = uniqueSources(highConfidenceDocs);

    const context = highConfidenceDocs
      .map((doc, index) => {
        return `
SOURCE ${index + 1}: ${doc.source}
ORIGINAL SOURCE: ${
          doc.originalSource ||
          doc.metadata?.originalSource ||
          doc.metadata?.originalFileName ||
          doc.source
        }
TEXT:
${doc.text}
        `.trim();
      })
      .join("\n\n---\n\n");

    const systemPrompt = `
You are TINA, Tax Intelligence and Navigation Assistant for Bong Corpuz & Co. CPAs.

You are a Philippine tax and BIR compliance assistant.

ABSOLUTE RULES:
1. Answer ONLY from the provided CONTEXT.
2. Do NOT use general knowledge, prior knowledge, assumptions, or memory to answer.
3. Do NOT invent RR, RMC, RMO, BIR rulings, dates, sections, forms, deadlines, tax rates, thresholds, titles, or legal citations.
4. If the answer is not explicitly supported by the CONTEXT, say:
   "No verified answer found in the indexed source."
5. If a specific issuance is asked and the exact issuance is not in the CONTEXT, say:
   "No indexed document found for the requested issuance."
6. Never describe what an RR/RMC/RMO is about unless the retrieved source text supports it.
7. Always cite the source filename shown in the CONTEXT.
8. If the source does not show date issued, title, section, tax form, deadline, or amendment status, write "Not shown in retrieved context."
9. Be concise, professional, and Philippine-tax oriented.
10. Do not mention ChatGPT.

REQUIRED FORMAT:

[Regulation / Topic Name]

Direct Answer:
[Answer based only on context.]

Legal Basis:
[Specific RR/RMC/RMO/NIRC section shown in context, or "Not shown in retrieved context."]

Key Provisions:
- [Only provisions shown in context.]
- [If not shown, say "Not shown in retrieved context."]

Applicable Tax Forms:
- [Only forms shown in context, or "Not shown in retrieved context."]

Important Deadlines:
- [Only deadlines shown in context, or "Not shown in retrieved context."]

Related Issuances:
- [Only related issuances shown in context, or "Not shown in retrieved context."]

Limitation / Verification Note:
[State if amendment/supersession status is not shown.]

Source:
[Exact source filename/s from CONTEXT.]
    `.trim();

    const userPrompt = `
Conversation Memory:
${memoryContext}

Detected Issuance:
${issuance ? JSON.stringify(issuance) : "None"}

CONTEXT:
${context}

USER QUESTION:
${cleanQuestion}

Instruction:
Answer strictly using only the CONTEXT. If the CONTEXT does not clearly support the answer, refuse using the required wording.
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

    const sourceNames = sourcesUsed.map((s) => s.source).filter(Boolean);
    const hasSourceMention =
      sourceNames.length > 0 &&
      sourceNames.some((src) =>
        answerText.toLowerCase().includes(String(src).toLowerCase())
      );

    if (!answerText || !answerText.toLowerCase().includes("source:")) {
      answerText = "Answer blocked: No verifiable source citation was generated.";
    } else if (!hasSourceMention) {
      answerText += `\n\nSource: ${sourceNames.join(", ")}`;
    }

    await saveConversationTurn({
      conversationId,
      userId,
      question: cleanQuestion,
      answerText
    });

    return res.json({
      success: true,
      answer: answerText,
      answerMode: issuance ? "exact_issuance_strict_rag" : "strict_rag",
      confidence: issuance ? "HIGH" : "MEDIUM",
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
  console.log(`🚀 TINA Backend running on port ${PORT}`);
});
