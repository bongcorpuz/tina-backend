// FILE: server.js

import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import {
  createConversation,
  getUserConversations,
  getConversationMessages
} from "./conversation-memory.js";

import {
  listDriveFiles,
  extractTextFromFile
} from "./drive-reader.js";

import {
  loginUser,
  registerUser,
  authenticate
} from "./auth.js";

import {
  clearVectorStore,
  addDocumentToVectorStore,
  getVectorStoreStats
} from "./vector-store.js";

import {
  buildAuthorityMetadata
} from "./authority-engine.js";

import {
  createAskHandler
} from "./ask-handler.js";

import {
  getUserId,
  normalizeSourceName,
  getSourceTier
} from "./ask-helpers.js";

/* ================= ENV ================= */

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/* ================= APP ================= */

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "25mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const askHandler = createAskHandler({ supabase, openai });

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

/* ================= GOOGLE DRIVE INDEXING ================= */

async function runDriveIndexing() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");
  }

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

      const authority = buildAuthorityMetadata({
        fileName: file.name,
        path,
        text,
        modifiedTime: file.modifiedTime || null
      });

      const driveViewUrl = file.id
        ? `https://drive.google.com/file/d/${file.id}/view`
        : null;

      const driveDownloadUrl = file.id
        ? `https://drive.google.com/uc?export=download&id=${file.id}`
        : null;

      const result = await addDocumentToVectorStore(text, normalizedSource, {
        fileId: file.id,
        originalFileName: file.name,
        originalSource: file.name,
        normalizedSource,
        mimeType: file.mimeType,
        path,
        modifiedTime: file.modifiedTime || null,
        driveViewUrl,
        driveDownloadUrl,

        authorityType: authority.authorityType,
        authorityLevel: authority.authorityLevel,
        authorityScore: authority.authorityScore,
        authorityLabel: authority.authorityLabel,
        normalizedReference: authority.normalizedReference,
        normalizedAliases: authority.normalizedAliases,
        recencyDate: authority.recencyDate,

        fallbackAuthorityTier: tierInfo.tier,
        fallbackAuthorityLabel: tierInfo.label,
        fallbackAuthorityWeight: tierInfo.weight
      });

      indexed.push({
        fileName: file.name,
        normalizedSource,
        path,
        mimeType: file.mimeType,
        authorityType: authority.authorityType,
        authorityLevel: authority.authorityLevel,
        authorityScore: authority.authorityScore,
        authorityLabel: authority.authorityLabel,
        fallbackAuthorityTier: tierInfo,
        textLength: text.length,
        chunksAdded: result?.chunksAdded ?? 0,
        status: "Indexed",
        preview: text.substring(0, 200)
      });
    } catch (fileError) {
      console.error(`Failed file: ${file.name}`, fileError);

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

  return {
    totalFilesChecked: files.length,
    filesIndexed: indexed.length,
    filesFailed: failed.length,
    vectorStore: stats,
    indexed,
    failed
  };
}

/* ================= BACKGROUND INDEXING ================= */

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

/* ================= BASIC ROUTES ================= */

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
      "POST /conversations",
      "GET /conversations",
      "GET /conversations/:conversationId/messages",
      "GET /list?secret=YOUR_SECRET",
      "GET /read-drive?secret=YOUR_SECRET",
      "GET /index-drive?secret=YOUR_SECRET",
      "GET /index-status?secret=YOUR_SECRET",
      "GET /reindex?secret=YOUR_SECRET",
      "GET /admin/index-drive?secret=YOUR_SECRET",
      "GET /vector-stats?secret=YOUR_SECRET",
      "POST /ask"
    ]
  });
});

app.get("/health", async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message || "Health check failed"
    });
  }
});

/* ================= AUTH ROUTES ================= */

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

    return res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
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
      return res.status(401).json({
        error: "User ID not found in token."
      });
    }

    const conversation = await createConversation(supabase, {
      userId,
      title: title || "New Conversation"
    });

    return res.status(201).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error("Create conversation error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create conversation"
    });
  }
});

app.get("/conversations", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: "User ID not found in token."
      });
    }

    const conversations = await getUserConversations(supabase, userId);

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({
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
      return res.status(401).json({
        error: "User ID not found in token."
      });
    }

    const messages = await getConversationMessages(supabase, {
      conversationId,
      userId
    });

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load messages"
    });
  }
});

/* ================= INDEX ROUTES ================= */

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

app.get("/index-status", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    return res.json({
      success: true,
      engine: "TINA Background Indexing Engine",
      indexing: lastIndexingStatus,
      vectorStore: vectorStats,
      time: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to read index status"
    });
  }
});

/* ================= DRIVE ROUTES ================= */

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

    return res.json({
      success: true,
      totalFiles: files.length,
      files
    });
  } catch (error) {
    console.error("List error:", error);
    return res.status(500).json({
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

    return res.json({
      success: true,
      message: "Drive read completed.",
      filesRead: results.length,
      files: results
    });
  } catch (error) {
    console.error("Read-drive error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Drive read failed"
    });
  }
});

app.get("/vector-stats", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    return res.json({
      success: true,
      engine: "TINA Big 4 Tax Intelligence Engine",
      vectorStore: vectorStats
    });
  } catch (error) {
    console.error("Vector stats error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to read vector stats"
    });
  }
});

/* ================= ASK ROUTE ================= */

app.post("/ask", authenticate, askHandler);

/* ================= SERVER ================= */

const PORT = Number(process.env.PORT || 10000);

app.listen(PORT, () => {
  console.log(`TINA Big 4 Backend running on port ${PORT}`);
});

export default app;
