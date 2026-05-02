import {
  getModeState,
  saveModeState,
  clearModeState,
  isExplicitModeHook
} from "./mode-state.js";
import { detectTopic } from "./topic-detector.js";
import { getLastTopicState, saveTopicState } from "./memory-hooks.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
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

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";

import {
  loginUser,
  registerUser,
  authenticate
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
app.use(express.json({ limit: "25mb" }));

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

/* ================= AUTHORITY ENGINE ================= */

function getSourceTier(doc = {}) {
  const value = `${getDocPath(doc)} ${getDocOriginalName(doc)} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) return { tier: 1, label: "Tax Code / NIRC", weight: 1.0 };
  if (value.includes("02_revenue_regulations")) return { tier: 2, label: "Revenue Regulations", weight: 0.95 };
  if (value.includes("03_rmc")) return { tier: 3, label: "Revenue Memorandum Circulars", weight: 0.9 };
  if (value.includes("04_rmo")) return { tier: 4, label: "Revenue Memorandum Orders", weight: 0.85 };
  if (value.includes("05_bir_rulings")) return { tier: 5, label: "BIR Rulings", weight: 0.75 };
  if (value.includes("06_court_cases")) return { tier: 6, label: "Court Cases", weight: 0.6 };
  if (value.includes("07_cpa_notes")) return { tier: 7, label: "CPA Notes / Internal Notes", weight: 0.4 };

  return { tier: 99, label: "Unclassified Source", weight: 0.5 };
}

function classifyQuestion(question = "") {
  const q = String(question || "").toLowerCase();

  if (
    /\b(rr|rmc|rmo)\s*(no\.?)?\s*\d+/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order")
  ) return "issuance";

  if (q.includes("bir ruling") || q.includes("da(") || q.includes("ot-") || q.includes("ruling no")) return "ruling";

  if (
    q.includes("case") ||
    q.includes(" v. ") ||
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes("cta") ||
    q.includes("supreme court") ||
    q.includes("g.r. no")
  ) return "case";

  if (
    q.includes("compute") ||
    q.includes("calculate") ||
    q.includes("tax due") ||
    q.includes("vat payable") ||
    q.includes("mcit") ||
    q.includes("rcit") ||
    q.includes("nolco") ||
    q.includes("withholding") ||
    q.includes("ewt")
  ) return "tax_computation";

  if (
    q.includes("risk") ||
    q.includes("audit") ||
    q.includes("exposure") ||
    q.includes("assessment") ||
    q.includes("deficiency")
  ) return "audit_risk";

  if (
    q.startsWith("what is") ||
    q.startsWith("what are") ||
    q.startsWith("define") ||
    q.includes("meaning of") ||
    q.includes("definition of") ||
    q.includes("explain")
  ) return "concept";

  if (
    q.includes("deadline") ||
    q.includes("due date") ||
    q.includes("filing") ||
    q.includes("form") ||
    q.includes("rate") ||
    q.includes("threshold") ||
    q.includes("penalty")
  ) return "compliance";

  return "general";
}

function isPreferredForQuestion(doc, questionType) {
  const { tier } = getSourceTier(doc);

  if (questionType === "concept") return tier === 1 || tier === 2 || tier === 3;
  if (questionType === "compliance") return tier === 1 || tier === 2 || tier === 3 || tier === 4;
  if (questionType === "tax_computation") return tier === 1 || tier === 2 || tier === 3;
  if (questionType === "audit_risk") return tier <= 7;
  if (questionType === "ruling") return tier === 5 || tier === 1 || tier === 2 || tier === 3;
  if (questionType === "case") return tier === 6;
  if (questionType === "issuance") return tier === 2 || tier === 3 || tier === 4;

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
      if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore;
      return a.sourceTier.tier - b.sourceTier.tier;
    });
}

function filterDocsByQuestionType(docs = [], questionType = "general") {
  const preferredDocs = docs.filter((doc) => isPreferredForQuestion(doc, questionType));
  return preferredDocs.length > 0 ? preferredDocs : docs;
}

/* ================= ISSUANCE DETECTION ================= */

function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

function normalizeIssuanceYear(year = "") {
  const y = String(year || "").trim();
  return y.length === 2 ? `20${y}` : y;
}

function detectIssuanceQuery(question = "") {
  const q = String(question || "");

  const patterns = [
    {
      type: "RR",
      regex: /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    }
  ];

  for (const item of patterns) {
    const match = q.match(item.regex);

    if (match) {
      const number = normalizeIssuanceNumber(match[1]);
      const year = normalizeIssuanceYear(match[2]);

      return {
        type: item.type,
        number,
        year,
        normalized: `${item.type.toLowerCase()}-${number}-${year}`
      };
    }
  }

  return null;
}

function isExactIssuanceMatch(doc, issuance) {
  if (!doc || !issuance) return false;

  const type = String(issuance.type || "").toLowerCase();
  const number = normalizeIssuanceNumber(issuance.number);
  const year = normalizeIssuanceYear(issuance.year);

  const number2 = number.padStart(2, "0");
  const number3 = number.padStart(3, "0");

  const rawCandidates = [
    doc.source,
    doc.originalSource,
    doc.metadata?.originalSource,
    doc.metadata?.originalFileName,
    doc.metadata?.normalizedSource,
    doc.metadata?.path,
    doc.path
  ].filter(Boolean);

  const normalizedCandidates = rawCandidates.map(normalizeForMatch);

  const fullName =
    type === "rr"
      ? "revenue-regulation"
      : type === "rmc"
      ? "revenue-memorandum-circular"
      : "revenue-memorandum-order";

  const pluralFullName =
    type === "rr"
      ? "revenue-regulations"
      : type === "rmc"
      ? "revenue-memorandum-circulars"
      : "revenue-memorandum-orders";

  const possibleTargets = [
    `${type}-${number}-${year}`,
    `${type}-${number2}-${year}`,
    `${type}-${number3}-${year}`,

    `${type}_${number}-${year}`,
    `${type}_${number2}-${year}`,
    `${type}_${number3}-${year}`,

    `${type}-${number}_${year}`,
    `${type}-${number2}_${year}`,
    `${type}-${number3}_${year}`,

    `${type}${number}-${year}`,
    `${type}${number2}-${year}`,
    `${type}${number3}-${year}`,

    `${type}${number}_${year}`,
    `${type}${number2}_${year}`,
    `${type}${number3}_${year}`,

    `${type}${number}${year}`,
    `${type}${number2}${year}`,
    `${type}${number3}${year}`,

    `${type}-no-${number}-${year}`,
    `${type}-no-${number2}-${year}`,
    `${type}-no-${number3}-${year}`,

    `${fullName}-${number}-${year}`,
    `${fullName}-${number2}-${year}`,
    `${fullName}-${number3}-${year}`,

    `${fullName}-no-${number}-${year}`,
    `${fullName}-no-${number2}-${year}`,
    `${fullName}-no-${number3}-${year}`,

    `${pluralFullName}-${number}-${year}`,
    `${pluralFullName}-${number2}-${year}`,
    `${pluralFullName}-${number3}-${year}`
  ].map(normalizeForMatch);

  return normalizedCandidates.some((candidate) =>
    possibleTargets.some((target) => candidate.includes(target))
  );
}
/* ================= SOURCE LINK HELPER ================= */

function buildGoogleDriveLinks(doc = {}) {
  const fileId =
    doc.metadata?.fileId ||
    doc.fileId ||
    doc.id ||
    null;

  if (!fileId) {
    return {
      fileId: null,
      driveViewUrl: null,
      driveDownloadUrl: null
    };
  }

  return {
    fileId,
    driveViewUrl: `https://drive.google.com/file/d/${fileId}/view`,
    driveDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
  };
}

/* ================= UNIQUE SOURCES WITH LINKS ================= */

function uniqueSources(docs = []) {
  
  const seen = new Set();

  return docs
    .filter((doc) => {
      const key =
        doc.metadata?.fileId ||
        doc.fileId ||
        doc.source ||
        getDocOriginalName(doc);

      if (!key || seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .map((doc) => {
      const links = buildGoogleDriveLinks(doc);
      const originalSource = getDocOriginalName(doc);
      const path = getDocPath(doc);
      const tier = doc.sourceTier || getSourceTier(doc);

      return {
        title: originalSource || doc.source || "Untitled Source",
        source: doc.source,
        originalSource,
        path,
        fileId: links.fileId,
        driveViewUrl: links.driveViewUrl,
        driveDownloadUrl: links.driveDownloadUrl,
        score: doc.score,
        adjustedScore: doc.adjustedScore,
        authorityTier: tier?.tier || 99,
        authorityLabel: tier?.label || "Unclassified Source",
        preview: doc.text ? doc.text.substring(0, 300) : ""
      };
    });
}

/* ================= MEMORY ================= */

function buildMemoryContext(messages = []) {
  if (!messages.length) return "No prior conversation.";

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
    .join("\n");
}

async function saveConversationTurn({ conversationId, userId, question, answerText }) {
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

/* ================= HEALTH / ROUTES ================= */

app.get("/", (req, res) => {
  res.send("TINA backend is running. Use /health, /routes, /index-drive?secret=YOUR_SECRET.");
});

app.get("/routes", (req, res) => {
  res.json({
    success: true,
    engine: "TINA Big 4 Mode",
    routes: [
      "GET /",
      "GET /health",
      "GET /routes",
      "POST /register",
      "POST /login",
      "GET /list?secret=YOUR_SECRET",
      "GET /read-drive?secret=YOUR_SECRET",
      "GET /index-drive?secret=YOUR_SECRET",
      "GET /reindex?secret=YOUR_SECRET",
      "GET /admin/index-drive?secret=YOUR_SECRET",
      "GET /vector-stats?secret=YOUR_SECRET",
      "POST /ask"
    ]
  });
});

app.get("/health", async (req, res) => {
  const vectorStats = await getVectorStoreStats();

  res.json({
    status: "ok",
    engine: "TINA Big 4 Tax Intelligence Engine",
    openai: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    supabaseUrl: Boolean(process.env.SUPABASE_URL),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    googleDriveFolder: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
    googleDriveFolderIdPreview: process.env.GOOGLE_DRIVE_FOLDER_ID
      ? `${process.env.GOOGLE_DRIVE_FOLDER_ID.slice(0, 6)}...`
      : null,
    googleServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    oldGoogleKeyFile: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
    indexSecretEnabled: Boolean(process.env.INDEX_SECRET),
    vectorStore: vectorStats,
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

    if (!userId) return res.status(401).json({ error: "User ID not found in token." });

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

    if (!userId) return res.status(401).json({ error: "User ID not found in token." });

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

    if (!userId) return res.status(401).json({ error: "User ID not found in token." });

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

/* ================= GOOGLE DRIVE INDEXING ================= */

async function runDriveIndexing() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");
  }

  console.log("🚀 Starting TINA Big 4 Google Drive indexing...");
  console.log("📁 Folder ID:", folderId);

  await clearVectorStore();

  const files = await listDriveFiles(folderId);
  const indexed = [];
  const failed = [];

  console.log(`📄 Files found in Google Drive: ${files.length}`);

  for (const file of files) {
    try {
      console.log(`🔎 Reading file: ${file.name}`);

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

      console.log(`✅ Indexed: ${file.name}`);
    } catch (fileError) {
      console.error(`❌ Failed file: ${file.name}`, fileError);

      failed.push({
        fileName: file.name,
        normalizedSource: normalizeSourceName(file.name),
        path: file.path || file.name,
        mimeType: file.mimeType,
        reason: fileError.message || "File indexing failed"
      });
    }
  }

  const stats = await getVectorStoreStats();

  const result = {
    totalFilesChecked: files.length,
    filesIndexed: indexed.length,
    filesFailed: failed.length,
    vectorStore: stats,
    indexed,
    failed
  };

  console.log("✅ TINA Big 4 Google Drive indexing completed:", result);

  return result;
}

/* ================= BACKGROUND INDEXING CONTROL ================= */

let isIndexingRunning = false;

let lastIndexingStatus = {
  running: false,
  startedAt: null,
  finishedAt: null,
  success: null,
  message: "No indexing job has started yet.",
  error: null,
  result: null
};

function startIndexingInBackground() {
  if (isIndexingRunning) {
    return {
      started: false,
      message: "Indexing is already running."
    };
  }

  isIndexingRunning = true;

  lastIndexingStatus = {
    running: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    success: null,
    message: "Indexing is running in background.",
    error: null,
    result: null
  };

  runDriveIndexing()
    .then((result) => {
      lastIndexingStatus = {
        running: false,
        startedAt: lastIndexingStatus.startedAt,
        finishedAt: new Date().toISOString(),
        success: true,
        message: "Indexing completed successfully.",
        error: null,
        result
      };
    })
    .catch((error) => {
      console.error("Background indexing error:", error);

      lastIndexingStatus = {
        running: false,
        startedAt: lastIndexingStatus.startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        message: "Indexing failed.",
        error: error.message || "Unknown indexing error",
        result: null
      };
    })
    .finally(() => {
      isIndexingRunning = false;
    });

  return {
    started: true,
    message: "Indexing started in background."
  };
}

/* ================= INDEXING ROUTES ================= */

app.get("/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const started = startIndexingInBackground();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    route: "/index-drive",
    ...started,
    statusUrl: "/index-status?secret=YOUR_SECRET"
  });
});

app.get("/index-status", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const vectorStats = await getVectorStoreStats();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    indexing: lastIndexingStatus,
    vectorStore: vectorStats,
    time: new Date().toISOString()
  });
});

app.get("/reindex", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const started = startIndexingInBackground();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    route: "/reindex",
    ...started,
    statusUrl: "/index-status?secret=YOUR_SECRET"
  });
});

app.get("/admin/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const started = startIndexingInBackground();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    route: "/admin/index-drive",
    ...started,
    statusUrl: "/index-status?secret=YOUR_SECRET"
  });
});

/* ================= DRIVE UTILITY ROUTES ================= */

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

app.get("/vector-stats", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    res.json({
      success: true,
      engine: "TINA Big 4 Tax Intelligence Engine",
      vectorStore: vectorStats
    });
  } catch (error) {
    console.error("Vector stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to read vector stats"
    });
  }
});

/* ================= FALLBACK ================= */

async function generateGeneralFallbackAnswer(cleanQuestion, memoryContext, reason = "No sufficient indexed source was found.") {
  const fallbackSystemPrompt = `
You are TINA, Tax Information Navigation Assistant for Bong Corpuz & Co. CPAs.

You may answer using general Philippine tax knowledge only when indexed sources are absent or weak.

Rules:
1. Clearly state that this is a general fallback answer.
2. Do not pretend the answer came from indexed Google Drive sources.
3. Keep the answer professional and Philippine-tax oriented.
4. Do not invent specific RR, RMC, RMO, BIR rulings, dates, forms, deadlines, rates, or case citations.
5. For exact issuance questions, do not provide speculative content.
6. Recommend verification against official NIRC/BIR/CTA/Supreme Court sources.
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
    "Important Note: This answer is not based on an indexed Google Drive source and should be verified against official BIR/NIRC/court sources.\n\n" +
    (text || "No fallback answer generated.")
  );
}

/* ================= DYNAMIC TAX HOOKS - STRICT MODE ================= */

async function loadTaxHookConfig(rawQuestion = "") {
  const text = String(rawQuestion || "").trim();

  let hookCode = "/ask";
  let cleanQuestion = text;

  const firstWord = text.split(/\s+/)[0]?.toLowerCase() || "";

  const allowedHooks = [
    "/ask",
    "/tax",
    "/review",
    "/quiz",
    "/feedback",
    "/source"
  ];

  if (allowedHooks.includes(firstWord)) {
    hookCode = firstWord;
    cleanQuestion = text.slice(firstWord.length).trim();
  }

  const hardcodedHooks = {
    "/ask": {
      hook_code: "/ask",
      mode: "ASK",
      title: "Default TINA Assistant",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      output_format: "short_format",
      response_template: {
        sections: ["Short Answer", "Explanation", "Practical Note"]
      }
    },

    "/tax": {
      hook_code: "/tax",
      mode: "TAX_EXPERT",
      title: "Big 4 Tax Expert Mode",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      output_format: "big4_format",
      response_template: {
        sections: [
          "Executive Answer",
          "Issue",
          "Applicable Source / Legal Basis",
          "Analysis",
          "Practical Compliance / Audit Implication",
          "Recommended Action",
          "Limitations",
          "Confidence",
          "Sources Used"
        ]
      }
    },

    "/review": {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      output_format: "review_format",
      response_template: {
        sections: [
          "Topic",
          "Core Concept",
          "Rule",
          "Simple Example",
          "CPALE Trap",
          "Quick Recall",
          "Practice Question",
          "Instruction"
        ]
      }
    },

    "/quiz": {
      hook_code: "/quiz",
      mode: "QUIZ_MASTER",
      title: "Tax Quiz Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      output_format: "quiz_format",
      response_template: {
        sections: ["Question", "A", "B", "C", "D", "Instruction"]
      }
    },

    "/feedback": {
      hook_code: "/feedback",
      mode: "FEEDBACK",
      title: "Feedback Mode",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: true,
      output_format: "feedback_format",
      response_template: {
        sections: ["Acknowledgement", "Correction Captured", "Learning Note"]
      }
    },

    "/source": {
      hook_code: "/source",
      mode: "SOURCE_FINDER",
      title: "Source Finder Mode",
      requires_retrieval: true,
      requires_memory: false,
      requires_feedback: false,
      output_format: "source_finder_format",
      response_template: {
        sections: [
          "Best Matching Source",
          "Document / Regulation / Case Title",
          "Relevant Section or Keyword",
          "Short Summary",
          "Confidence",
          "Sources Used"
        ]
      }
    }
  };

  const fallbackConfig = hardcodedHooks[hookCode] || hardcodedHooks["/ask"];

  try {
    const { data, error } = await supabase
      .from("tina_tax_hooks")
      .select("*")
      .eq("hook_code", hookCode)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Hook config load error:", error.message);
    }

    if (data) {
      return {
        ...fallbackConfig,
        ...data,

        // Strict control: database may tune labels/templates,
        // but it must not change the core mode behavior.
        hook_code: fallbackConfig.hook_code,
        mode: fallbackConfig.mode,
        requires_retrieval: fallbackConfig.requires_retrieval,

        title: data.title || fallbackConfig.title,
        requires_memory: data.requires_memory ?? fallbackConfig.requires_memory,
        requires_feedback: data.requires_feedback ?? fallbackConfig.requires_feedback,
        output_format: data.output_format || fallbackConfig.output_format,
        response_template: data.response_template || fallbackConfig.response_template,

        cleanQuestion: cleanQuestion || text,
        originalQuestion: text
      };
    }
  } catch (error) {
    console.error("Hook config fallback used:", error.message);
  }

  return {
    ...fallbackConfig,
    cleanQuestion: cleanQuestion || text,
    originalQuestion: text
  };
}

function buildHookInstruction(hookConfig = {}) {
  const mode = hookConfig.mode || "ASK";
  const template = hookConfig.response_template || {};
  const sections = Array.isArray(template.sections)
    ? template.sections.map((s) => `- ${s}`).join("\n")
    : "- Use a clear professional format.";

  if (mode === "TAX_EXPERT") {
    return `
Mode: Big 4 Tax Expert Mode.
Use strict professional tax research format.
Required sections:
${sections}
    `.trim();
  }

  if (mode === "TAX_REVIEWER") {
    return `
Mode: CPALE Tax Reviewer Mode.
Teach the topic clearly like a tax reviewer, then ask one question.
Required sections:
${sections}
    `.trim();
  }

  if (mode === "QUIZ_MASTER") {
    return `
Mode: Tax Quiz Mode.
TINA must ask one multiple-choice question.
Do not reveal the answer until the user replies.
Required sections:
${sections}
    `.trim();
  }

  if (mode === "FEEDBACK") {
    return `
Mode: Feedback Mode.
Acknowledge the feedback and capture the correction for future improvement.
Required sections:
${sections}
    `.trim();
  }

  if (mode === "SOURCE_FINDER") {
    return `
Mode: Source Finder Mode.
Find and summarize the best indexed source only.
Required sections:
${sections}
    `.trim();
  }

  return `
Mode: Default TINA Assistant.
Answer clearly and professionally.
Required sections:
${sections}
  `.trim();
}
/* ================= ASK: DYNAMIC HOOK ENGINE + BIG 4 RAG ================= */

app.post("/ask", authenticate, async (req, res) => {
  try {
    const { question, conversationId } = req.body;
    const userId = getUserId(req);

    const rawQuestion = String(question || "").trim();
const firstWord = rawQuestion.split(/\s+/)[0]?.toLowerCase();

/* ================= MODE COMMANDS ================= */

if (firstWord === "/exit" || firstWord === "/reset") {
  await clearModeState(supabase, userId, conversationId);

  return res.json({
    success: true,
    engine: "TINA Mode State System",
    answer: "Mode reset. TINA is now back to Default Ask Mode.",
    hook: "/ask",
    mode: "ASK",
    sourceStatus: "MODE_RESET",
    sourcesUsed: [],
    vectorMatches: 0
  });
}

if (firstWord === "/mode") {
  const currentMode = await getModeState(supabase, userId, conversationId);

  return res.json({
    success: true,
    engine: "TINA Mode State System",
    answer: currentMode
      ? `Current Mode: ${currentMode.active_mode}\nHook: ${currentMode.active_hook}\nTitle: ${currentMode.mode_title}`
      : "Current Mode: ASK\nHook: /ask\nTitle: Default TINA Assistant",
    modeState: currentMode || {
      active_hook: "/ask",
      active_mode: "ASK",
      mode_title: "Default TINA Assistant"
    },
    sourceStatus: "MODE_STATUS"
  });
}

    

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question required"
      });
    }

    let effectiveQuestion = question;

const existingMode = await getModeState(supabase, userId, conversationId);

if (
  existingMode &&
  existingMode.active_hook &&
  existingMode.active_hook !== "/ask" &&
  !isExplicitModeHook(question)
) {
  effectiveQuestion = `${existingMode.active_hook} ${question}`;
}

const hookConfig = await loadTaxHookConfig(effectiveQuestion);
    
    const cleanQuestion = hookConfig.cleanQuestion;
    const originalQuestion = hookConfig.originalQuestion;
    const hookInstruction = buildHookInstruction(hookConfig);

    if (!cleanQuestion || !cleanQuestion.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question required after hook"
      });
    }

    async function saveSimpleHookMemory(answerText) {
  if (hookConfig.requires_memory === false) return;

  await saveConversationTurn({
    conversationId,
    userId,
    question: originalQuestion,
    answerText
  });

  await saveModeState(supabase, {
    userId,
    sessionId: conversationId,
    activeHook: hookConfig.hook_code,
    activeMode: hookConfig.mode,
    modeTitle: hookConfig.title,
    lastQuestion: originalQuestion,
    lastAnswer: answerText
  });
}

    /* ================= FEEDBACK MODE ================= */

    if (hookConfig.mode === "FEEDBACK") {
      const answerText =
        "Feedback received. Thank you. TINA will use this correction to improve future answers.";

      await saveSimpleHookMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Dynamic Hook Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "feedback_captured",
        confidence: "N/A",
        sourceStatus: "FEEDBACK_CAPTURED",
        originalQuestion,
        resolvedQuestion: cleanQuestion,
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

    /* ================= QUIZ MODE: TINA ASKS FIRST ================= */

    if (hookConfig.mode === "QUIZ_MASTER") {
      const quizPrompt = `
You are TINA, a CPALE taxation examiner.

Create ONE multiple-choice question about this topic:
${cleanQuestion}

Rules:
- Ask only ONE question.
- Give four choices: A, B, C, and D.
- Do NOT reveal the correct answer.
- Do NOT explain yet.
- Wait for the user to answer A, B, C, or D.
- Keep it Philippine taxation-focused.

Output format:

Question:
[question]

A. [choice]
B. [choice]
C. [choice]
D. [choice]

Instruction:
Answer A, B, C, or D.
`.trim();

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "user", content: quizPrompt }
        ]
      });

      const answerText =
        response.choices?.[0]?.message?.content?.trim() ||
        "Unable to generate quiz question.";

      await saveSimpleHookMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Dynamic Hook Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "quiz_question_generated",
        confidence: "N/A",
        sourceStatus: "QUIZ_MODE_NO_RAG_REQUIRED",
        originalQuestion,
        resolvedQuestion: cleanQuestion,
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

    /* ================= REVIEW MODE: TEACH + ASK ================= */

    if (hookConfig.mode === "TAX_REVIEWER") {
      const reviewPrompt = `
You are TINA, a CPALE taxation reviewer.

Teach this topic:
${cleanQuestion}

Rules:
- Teach clearly and simply.
- Use Philippine taxation context.
- Explain like a CPA board exam reviewer.
- Include one common CPALE trap.
- End by asking ONE review question.
- Do not make a long legal memo.

Output format:

Topic:
[topic]

Core Concept:
[explanation]

Rule:
[rule]

Simple Example:
[example]

CPALE Trap:
[trap]

Quick Recall:
[one-liner memory aid]

Practice Question:
[ask one question]

Instruction:
Answer the practice question, then TINA will check your answer.
`.trim();

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "user", content: reviewPrompt }
        ]
      });

      const answerText =
        response.choices?.[0]?.message?.content?.trim() ||
        "Unable to generate reviewer lesson.";

      await saveSimpleHookMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Dynamic Hook Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "reviewer_teach_and_ask",
        confidence: "GENERAL_REVIEWER",
        sourceStatus: "REVIEW_MODE_NO_RAG_REQUIRED",
        originalQuestion,
        resolvedQuestion: cleanQuestion,
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

        /* ================= TOPIC + MEMORY ================= */

    const topicData = await detectTopic({
      question: cleanQuestion,
      userId,
      sessionId: conversationId
    });

    let finalQuestion = topicData.resolvedQuestion || cleanQuestion;

    /* ================= TOPIC MEMORY FALLBACK ================= */

    if ((!finalQuestion || finalQuestion.length < 5) && conversationId && userId) {
      try {
        const lastState = await getLastTopicState(userId, conversationId);

        if (lastState?.last_question) {
          finalQuestion = lastState.last_question;
        }
      } catch (e) {
        console.error("Topic fallback error:", e.message);
      }
    }

    const issuance = detectIssuanceQuery(finalQuestion);
    const questionType = classifyQuestion(finalQuestion);

    let conversationHistory = [];
    if (conversationId && userId) {
      conversationHistory = await getConversationMessages(supabase, {
        conversationId,
        userId
      });
    }

    const memoryContext = buildMemoryContext(conversationHistory);

    async function saveAllMemory(answerText) {
      if (hookConfig.requires_memory === false) return;

      await saveConversationTurn({
        conversationId,
        userId,
        question: originalQuestion,
        answerText
      });

      await saveTopicState({
        userId,
        sessionId: conversationId,
        topic: topicData.topic,
        subject: topicData.subject,
        taxType: topicData.taxType,
        question: originalQuestion,
        answer: answerText
      });
    }

    /* ================= RETRIEVAL ================= */

    let relevantDocs = [];

    const retrievalQuery = issuance
  ? [
      finalQuestion,
      `${issuance.type} ${issuance.number}-${issuance.year}`,
      `${issuance.type} ${String(issuance.number).padStart(2, "0")}-${issuance.year}`,
      `${issuance.type} ${String(issuance.number).padStart(3, "0")}-${issuance.year}`,
      `${issuance.type} No. ${issuance.number}-${issuance.year}`,
      `${issuance.type} No. ${String(issuance.number).padStart(2, "0")}-${issuance.year}`,
      `${issuance.type} No. ${String(issuance.number).padStart(3, "0")}-${issuance.year}`,
      `Revenue Regulation ${issuance.number}-${issuance.year}`,
      `Revenue Regulation No. ${issuance.number}-${issuance.year}`,
      `Revenue Memorandum Circular ${issuance.number}-${issuance.year}`,
      `Revenue Memorandum Order ${issuance.number}-${issuance.year}`
    ].join(" ")
  : finalQuestion;

    if (hookConfig.requires_retrieval !== false) {
  /* ================= ISSUANCE-FIRST RETRIEVAL ================= */

  if (issuance) {
    try {
      const allDocs = await smartSearch(retrievalQuery, 50);

      const exactDocs = (allDocs || []).filter((doc) =>
        isExactIssuanceMatch(doc, issuance)
      );

      if (exactDocs.length > 0) {
        relevantDocs = rankDocsByAuthority(exactDocs);
      } else {
        relevantDocs = [];
      }
    } catch (error) {
      console.error("Issuance-first retrieval failed:", error.message);
      relevantDocs = [];
    }
  } else {
    try {
      relevantDocs = await smartSearch(retrievalQuery, 24);
    } catch (error) {
      console.error("Smart search failed:", error.message);

      try {
        relevantDocs = await searchSimilar(retrievalQuery, 24);
      } catch (fallbackError) {
        console.error("Fallback search failed:", fallbackError.message);
      }
    }
  }

  relevantDocs = rankDocsByAuthority(relevantDocs || []);
  relevantDocs = filterDocsByQuestionType(relevantDocs, questionType);

      /* ================= SOURCE FINDER MODE ================= */

      if (hookConfig.mode === "SOURCE_FINDER") {
        const sourceDocs = relevantDocs.slice(0, 10);
        const sourcesUsed = uniqueSources(sourceDocs);

        if (!sourcesUsed || sourcesUsed.length === 0) {
          return res.json({
            success: true,
            engine: "TINA Dynamic Hook Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: "No indexed source found for the requested query.",
            answerMode: "source_finder_no_match",
            confidence: "LOW",
            sourceStatus: "NO_INDEXED_SOURCE",
            originalQuestion,
            resolvedQuestion: finalQuestion,
            sourcesUsed: [],
            vectorMatches: 0
          });
        }

        const answerText =
          "Source Finder Results\n\n" +
          sourcesUsed
            .map((s, i) => {
              return [
                `${i + 1}. ${s.title}`,
                `Authority: Tier ${s.authorityTier} - ${s.authorityLabel}`,
                `View: ${s.driveViewUrl || "No link"}`,
                `Download: ${s.driveDownloadUrl || "No link"}`,
                `Preview: ${s.preview || ""}`
              ].join("\n");
            })
            .join("\n\n");

        return res.json({
          success: true,
          engine: "TINA Dynamic Hook Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: "source_finder_results",
          confidence: "SOURCE_LIST",
          sourceStatus: "INDEXED_SOURCE_LISTED",
          originalQuestion,
          resolvedQuestion: finalQuestion,
          sourcesUsed,
          vectorMatches: sourceDocs.length
        });
      }
    }
    /* ================= NO SOURCE HANDLING ================= */

    if (!relevantDocs || relevantDocs.length === 0) {
      let answerText;

      if (issuance || questionType === "issuance") {
        answerText =
          "No indexed document found for the requested issuance. TINA will not generate a speculative answer. Please upload or re-index the exact RR/RMC/RMO.";
      } else {
        answerText = await generateGeneralFallbackAnswer(
          finalQuestion,
          memoryContext,
          "No indexed Google Drive/Supabase vector source matched the question."
        );
      }

      await saveAllMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Dynamic Hook Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: issuance ? "no_exact_issuance_match" : "general_fallback_no_context",
        confidence: issuance ? "LOW" : "GENERAL",
        sourceStatus: "NO_INDEXED_SOURCE",
        questionType,
        topicData,
        originalQuestion,
        resolvedQuestion: finalQuestion,
        sourcesUsed: [],
        vectorMatches: 0,
        detectedIssuance: issuance || null
      });
    }

    /* ================= EXACT ISSUANCE CHECK ================= */

    if (issuance) {
      const exactDocs = relevantDocs.filter((doc) =>
        isExactIssuanceMatch(doc, issuance)
      );

      if (exactDocs.length === 0) {
        const answerText = `No indexed document found for ${issuance.type} No. ${issuance.number}-${issuance.year}. TINA will not generate a speculative answer. Please upload or re-index the exact issuance.`;

        await saveAllMemory(answerText);

        return res.json({
          success: true,
          engine: "TINA Dynamic Hook Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: "no_exact_issuance_match",
          confidence: "LOW",
          sourceStatus: "NO_EXACT_ISSUANCE_MATCH",
          questionType,
          topicData,
          originalQuestion,
          resolvedQuestion: finalQuestion,
          sourcesUsed: [],
          vectorMatches: relevantDocs.length,
          detectedIssuance: issuance
        });
      }

      relevantDocs = rankDocsByAuthority(exactDocs);
    }

    /* ================= CONFIDENCE FILTER ================= */

    const MIN_SCORE = issuance ? 0 : 0.38;

    let highConfidenceDocs = relevantDocs.filter((doc) => {
      const score = Number(doc.score);
      if (issuance) return true;
      return !Number.isNaN(score) && score >= MIN_SCORE;
    });

    highConfidenceDocs = rankDocsByAuthority(highConfidenceDocs).slice(0, 10);

    if (highConfidenceDocs.length === 0) {
      let answerText;

      if (issuance || questionType === "issuance") {
        answerText =
          "Insufficient supporting data found in indexed sources. TINA will not generate an answer to avoid incorrect interpretation.";
      } else {
        answerText = await generateGeneralFallbackAnswer(
          finalQuestion,
          memoryContext,
          "Indexed sources were found but similarity confidence was low."
        );
      }

      await saveAllMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Dynamic Hook Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: issuance ? "low_confidence" : "general_fallback_low_confidence",
        confidence: issuance ? "LOW" : "GENERAL",
        sourceStatus: issuance ? "LOW_CONFIDENCE_EXACT_QUERY" : "LOW_CONFIDENCE_GENERAL_QUERY",
        questionType,
        topicData,
        originalQuestion,
        resolvedQuestion: finalQuestion,
        sourcesUsed: [],
        vectorMatches: relevantDocs.length,
        detectedIssuance: issuance || null
      });
    }

    /* ================= CONTEXT BUILDING ================= */

    const sourcesUsed = uniqueSources(highConfidenceDocs);
    const topTier = Math.min(...sourcesUsed.map((s) => s.authorityTier || 99));

    let confidence = "MEDIUM";
    if (issuance) confidence = "HIGH";
    else if (topTier <= 2) confidence = "HIGH";
    else if (topTier <= 4) confidence = "MEDIUM";
    else if (topTier <= 7) confidence = "LIMITED";
    else confidence = "LOW";

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

    /* ================= SYSTEM PROMPT ================= */

    const systemPrompt = `
You are TINA, a Philippine tax research, compliance, education, and audit-risk assistant for Bong Corpuz & Co. CPAs.

ACTIVE HOOK MODE:
${hookInstruction}

You must follow the ACTIVE HOOK MODE behavior strictly.

CORE BEHAVIOR:
- precise
- source-grounded
- conservative
- audit-defensible
- no hallucinations
- no unsupported legal conclusions

SOURCE AUTHORITY HIERARCHY:
Tier 1: NIRC / Tax Code
Tier 2: Revenue Regulations
Tier 3: Revenue Memorandum Circulars
Tier 4: Revenue Memorandum Orders
Tier 5: BIR Rulings
Tier 6: Court Cases
Tier 7: CPA Notes / Internal Notes

STRICT RULES:
1. Answer ONLY from the provided CONTEXT when indexed context is available.
2. Do NOT use general knowledge, assumptions, or memory to add legal bases not shown in CONTEXT.
3. Do NOT invent RR, RMC, RMO, BIR rulings, dates, sections, rates, forms, thresholds, deadlines, case doctrines, or citations.
4. If a specific issuance is asked and the exact issuance is not in CONTEXT, say: "No indexed document found for the requested issuance."
5. Prefer higher authority sources over lower authority sources.
6. If sources conflict, identify the conflict and prefer the higher authority source.
7. Use court cases as interpretative authority, not as substitute for statute/regulation unless the question asks about case doctrine.
8. Use CPA notes only as internal guidance, not primary authority.
9. Always cite exact filename/path shown in CONTEXT.
10. Do not mention ChatGPT.
11. Do not overstate certainty. State limitations clearly.
12. For computations, show formula only if the formula is found or reasonably derived from the context. If not, state that computation support is insufficient.
13. For audit-risk questions, separate legal basis, exposure, evidence needed, and recommended next steps.

MODE-SPECIFIC OUTPUT RULES:

ASK MODE:
Use:
Short Answer
Explanation
Practical Note
Confidence
Sources Used

TAX_EXPERT MODE:
Use:
Executive Answer
Issue
Applicable Source / Legal Basis
Analysis
Practical Compliance / Audit Implication
Recommended Action
Limitations
Confidence
Sources Used

SOURCE_FINDER MODE:
Use:
Best Matching Source
Document / Regulation / Case Title
Relevant Section or Keyword
Short Summary
Confidence
Sources Used
`.trim();

    const userPrompt = `
Conversation Memory:
${memoryContext}

Hook:
${hookConfig.hook_code}

Mode:
${hookConfig.mode}

Topic Data:
${JSON.stringify(topicData)}

Original User Question:
${originalQuestion}

Clean Question:
${cleanQuestion}

Resolved Question Used for Search:
${finalQuestion}

Question Type:
${questionType}

Detected Issuance:
${issuance ? JSON.stringify(issuance) : "None"}

CONTEXT:
${context}

Instruction:
Answer strictly using only the CONTEXT. Apply the source hierarchy and the active hook mode.
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

    await saveAllMemory(answerText);

    return res.json({
      success: true,
      engine: "TINA Dynamic Hook Engine",
      hook: hookConfig.hook_code,
      mode: hookConfig.mode,
      hookTitle: hookConfig.title,
      answer: answerText,
      answerMode: issuance
        ? `exact_issuance_${hookConfig.mode.toLowerCase()}_rag`
        : `${hookConfig.mode.toLowerCase()}_authority_ranked_rag`,
      confidence,
      sourceStatus: "INDEXED_SOURCE_USED",
      questionType,
      topicData,
      originalQuestion,
      resolvedQuestion: finalQuestion,
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

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
    message: "Check /routes to confirm available backend routes."
  });
});

/* ================= START ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 TINA Big 4 Backend running on port ${PORT}`);
});
