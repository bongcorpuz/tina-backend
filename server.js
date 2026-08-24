// FILE: server.js
"use strict";

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
import { getAuthenticatedSourceDocument } from "./services/source-document-service.js";

import {
  loginUser,
  registerUser,
  authenticate
} from "./auth.js";

import {
  getVectorStoreStats,
  normalizeSourceName,
  INSTANCE_ID,
  acquireReindexLock,
  releaseReindexLock
} from "./vector-store.js";

import { createAskHandler, askHandlerHealthCheck } from "./ask-handler.js";
import { assessmentHandlerHealthCheck } from "./assessment-handler.js";

import {
  getUserId,
  getSourceTier,
  askHelpersHealthCheck
} from "./ask-helpers.js";

import { createBackgroundReindexController, runTargetedReindex, isTargetedReindexRunning, generateJobId } from "./reindex-service.js";
import { registerTinaRoutes } from "./routes/index.js";

import { queryIntentEngineHealthCheck } from "./query-intent-engine.js";
import { issueClassificationEngineHealthCheck } from "./issue-classification-engine.js";
import { ragAnswerHandlerHealthCheck } from "./rag-answer-handler.js";
import { adaptiveModeHealthCheck } from "./adaptive-mode-engine.js";
import { adaptiveResponsePlannerHealthCheck } from "./adaptive-response-planner.js";
import { pipelineHealthCheck } from "./pipeline.js";
import { finalAnswerComplianceHealthCheck } from "./final-answer-compliance.js";
import { adaptiveMasterPromptHealthCheck } from "./adaptive-tina-master-prompt.js";
import { legalValidationEngineHealthCheck } from "./legal-validation-engine.js";
import { jurisprudenceEngineHealthCheck } from "./jurisprudence-engine.js";
import { conflictEngineHealthCheck } from "./conflict-engine.js";
import { answerRendererHealthCheck } from "./answer-renderer.js";
import { feedbackLearningHealthCheck } from "./feedback-learning.js";

import {
  buildOpenAIContext,
  callOpenAIWithOrchestration,
  contextOrchestrationHealthCheck as engineContextOrchestrationHealthCheck
} from "./context-orchestration-engine.js";

/* ================= ENV VALIDATION ================= */

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

const PORT = Number(process.env.PORT || 10000);
const REQUEST_LIMIT = process.env.REQUEST_LIMIT || "25mb";
const NODE_ENV = process.env.NODE_ENV || "development";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SERVER_VERSION = "5.0.0";

/* ================= APP ================= */

const app = express();

/* ================= CORS ================= */

function buildAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || "*";
  if (raw === "*") return "*";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (allowedOrigins === "*") return callback(null, true);
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMIT }));

/* ================= CLIENTS ================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/*
  SERVER RULE:
  server.js must not assemble OpenAI prompts.
  server.js only injects OpenAI client and context orchestration into ask-handler.js.
*/
const contextOrchestration = {
  buildOpenAIContext,
  callOpenAIWithOrchestration
};

const askHandler = createAskHandler({
  supabase,
  openai,
  contextOrchestration,
  openaiModel: OPENAI_MODEL
});

const reindexController = createBackgroundReindexController();

/* ================= HELPERS ================= */

function maskValue(value, visible = 6) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= visible) return "***";
  return `${text.slice(0, visible)}...`;
}

function sendError(res, status, message, extra = {}) {
  return res.status(status).json({
    success: false,
    error: message,
    ...extra
  });
}

function getAdminSecret(req) {
  return (
    req.query.secret ||
    req.headers["x-index-secret"] ||
    req.headers["x-admin-secret"] ||
    null
  );
}

function allowAuthenticatedOrIndexSecret(req, res, next) {
  const providedSecret = getAdminSecret(req);

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

function localContextOrchestrationHealthCheck() {
  let engineHealth = null;

  try {
    engineHealth =
      typeof engineContextOrchestrationHealthCheck === "function"
        ? engineContextOrchestrationHealthCheck()
        : null;
  } catch (error) {
    engineHealth = {
      ok: false,
      error: error.message
    };
  }

  return {
    loaded: true,
    buildOpenAIContext: typeof buildOpenAIContext === "function",
    callOpenAIWithOrchestration: typeof callOpenAIWithOrchestration === "function",
    defaultModel: OPENAI_MODEL,
    serverUsesDirectPromptAssembly: false,
    serverUsesDependencyInjectionOnly: true,
    engineHealth
  };
}

/* ================= BASIC ROUTES ================= */

app.get("/", (req, res) => {
  return res.json({
    success: true,
    name: "TINA Backend",
    version: SERVER_VERSION,
    engine: "TINA Philippine Tax Intelligence Engine",
    architecture:
      "Adaptive Tax, Legal, Audit, Evidence, RAG, and Context Orchestration",
    contextOrchestrationEnabled: true,
    serverUsesDirectPromptAssembly: false,
    message: "Backend is running.",
    usefulRoutes: [
      "/health",
      "/routes",
      "/ask",
      "/tax",
      "/review",
      "/quiz",
      "/diagnostic",
      "/source",
      "/audit",
      "/case",
      "/debug",
      "/patch",
      "/progress",
      "/feedback"
    ]
  });
});

app.get("/routes", (req, res) => {
  return res.json({
    success: true,
    version: SERVER_VERSION,
    engine: "TINA Philippine Tax Intelligence Engine",
    adaptiveSupport: true,
    issueClassificationPipeline: true,
    contextOrchestrationEnabled: true,
    serverUsesDirectPromptAssembly: false,
    modeSupport: ["/ask", "/tax", "/review", "/quiz", "/diagnostic", "/source", "/audit", "/case", "/debug", "/patch", "/progress", "/feedback"],
    adaptiveModules: [
      "context-orchestration-engine.js",
      "issue-classification-engine.js",
      "query-intent-engine.js",
      "adaptive-mode-engine.js",
      "adaptive-response-planner.js",
      "retrieval-engine.js",
      "reranker-engine.js",
      "supersession-engine.js",
      "provision-citation-engine.js",
      "jurisprudence-engine.js",
      "doctrine-tagging-engine.js",
      "conflict-engine.js",
      "legal-validation-engine.js",
      "final-answer-compliance.js",
      "answer-renderer.js",
      "rag-answer-handler.js",
      "assessment-handler.js",
      "ask-handler.js"
    ],
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
      "POST /ask",
      "POST /tax",
      "POST /review",
      "POST /quiz",
      "POST /diagnostic",
      "POST /source",
      "POST /audit",
      "POST /case",
      "POST /debug",
      "POST /patch",
      "POST /progress",
      "POST /feedback"
    ]
  });
});

app.get("/health", async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    return res.json({
      success: true,
      status: "ok",
      version: SERVER_VERSION,
      environment: NODE_ENV,
      engine: "TINA Philippine Tax Intelligence Engine",
      adaptiveArchitectureEnabled: true,
      issueClassificationEnabled: true,
      contextOrchestrationEnabled: true,
      serverUsesDirectPromptAssembly: false,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      openaiModel: OPENAI_MODEL,
      supabaseConfigured: Boolean(
        process.env.SUPABASE_URL &&
          process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      googleDriveConfigured: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID),
      googleDriveFolderIdPreview: maskValue(process.env.GOOGLE_DRIVE_FOLDER_ID),
      googleServiceAccountJsonConfigured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      oldGoogleKeyFileConfigured: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
      indexSecretEnabled: Boolean(process.env.INDEX_SECRET),
      indexingRunning: reindexController.isActive(),
      vectorStore: vectorStats,
      adaptiveStack: {
        server: true,
        pipeline: pipelineHealthCheck(),
        askHandler: askHandlerHealthCheck(),
        contextOrchestration: localContextOrchestrationHealthCheck(),
        ragAnswerHandler: ragAnswerHandlerHealthCheck(),
        issueClassificationEngine: issueClassificationEngineHealthCheck(),
        queryIntentEngine: queryIntentEngineHealthCheck(),
        adaptiveModeEngine: adaptiveModeHealthCheck(),
        adaptiveResponsePlanner: adaptiveResponsePlannerHealthCheck(),
        askHelpers: askHelpersHealthCheck(),
        finalAnswerCompliance: finalAnswerComplianceHealthCheck(),
        adaptiveMasterPrompt: adaptiveMasterPromptHealthCheck(),
        legalValidationEngine: legalValidationEngineHealthCheck(),
        jurisprudenceEngine: jurisprudenceEngineHealthCheck(),
        conflictEngine: conflictEngineHealthCheck(),
        answerRenderer: answerRendererHealthCheck(),
        assessmentHandler: assessmentHandlerHealthCheck(),
        feedbackLearning: feedbackLearningHealthCheck()
      },
      routeModes: {
        ask: true,
        tax: true,
        review: true,
        quiz: true,
        diagnostic: true,
        source: true,
        audit: true,
        case: true,
        debug: true,
        patch: true,
        progress: true,
        feedback: true
      },
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check error:", error);
    return sendError(res, 500, error.message || "Health check failed");
  }
});

/* ================= AUTH ROUTES ================= */

app.post("/register", async (req, res) => {
  try {
    const { username, password, email, mobile, company } = req.body || {};

    if (!username || !password) {
      return sendError(res, 400, "Username and password are required.");
    }

    const user = await registerUser(
      username,
      password,
      "user",
      email,
      mobile,
      company
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user
    });
  } catch (error) {
    console.error("Register error:", error);
    return sendError(res, 400, error.message || "Registration failed");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return sendError(res, 400, "Username and password are required.");
    }

    const result = await loginUser(username, password);

    if (!result) {
      return sendError(res, 401, "Invalid credentials");
    }

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, 500, "Login failed");
  }
});

/* ================= CONVERSATIONS ================= */

app.post("/conversations", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title } = req.body || {};

    if (!userId) return sendError(res, 401, "User ID not found in token.");

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
    return sendError(res, 500, error.message || "Failed to create conversation");
  }
});

app.get("/conversations", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) return sendError(res, 401, "User ID not found in token.");

    const conversations = await getUserConversations(supabase, userId);

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    return sendError(res, 500, error.message || "Failed to load conversations");
  }
});

app.get("/conversations/:conversationId/messages", authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (!userId) return sendError(res, 401, "User ID not found in token.");
    if (!conversationId) return sendError(res, 400, "Conversation ID is required.");

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
    return sendError(res, 500, error.message || "Failed to load messages");
  }
});

/* ================= AUTHENTICATED SOURCE DOCUMENT ================= */

app.get("/sources/:documentId/document", authenticate, async (req, res) => {
  try {
    const result = await getAuthenticatedSourceDocument({
      supabase,
      documentId: req.params.documentId,
      userId: getUserId(req)
    });

    if (result.status === 200) {
      res.set({
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": "inline; filename=\"tina-source.pdf\"",
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff"
      });
      return res.status(200).send(result.fileBuffer);
    }

    if (result.status === 401) return sendError(res, 401, "Authentication required");
    if (result.status === 415) return sendError(res, 415, "Source document format unavailable");
    if (result.status === 503) return sendError(res, 503, "Source document retrieval unavailable");
    return sendError(res, 404, "Source document unavailable");
  } catch {
    return sendError(res, 503, "Source document retrieval unavailable");
  }
});

/* ================= INDEX ROUTES ================= */

async function startIndexingResponse(route) {
  // Block full reindex while targeted reindex is running — both write NIRC rows.
  if (isTargetedReindexRunning()) {
    return {
      httpStatus: 409,
      success: false,
      started: false,
      reason: "targeted_reindex_running",
      message: "Targeted NIRC/VAT reindex is currently running. " +
        "Wait for [REINDEX COMPLETE] in Render logs before starting a full reindex.",
    };
  }

  // Acquire DB lock synchronously before returning started:true.
  // This guarantees the client only sees started:true when the lock is confirmed held.
  // If the lock is denied or the table is missing, the route returns 409/503 instead.
  const jobId = generateJobId();
  const lockResult = await acquireReindexLock(jobId, "full_drive_reindex");

  if (!lockResult.acquired) {
    return {
      httpStatus: lockResult.reason === "lock_held" ? 409 : 503,
      success: false,
      started: false,
      lockAcquired: false,
      jobId,
      reason: lockResult.reason,
      existingJobId: lockResult.existingJobId || null,
      message: lockResult.reason === "lock_held"
        ? "Another reindex job holds the DB lock. Check Render logs for [REINDEX LOCK ACQUIRED] / [REINDEX COMPLETE]."
        : "Cannot acquire reindex lock — tina_reindex_locks table missing or RLS error. Run the migration and check /debug/db-identity.",
    };
  }

  // Lock confirmed. Attempt to start the background controller.
  // If already running in-memory (race condition guard), release the lock we just acquired.
  const startResult = reindexController.start(jobId);

  if (!startResult.started) {
    await releaseReindexLock(jobId).catch(e =>
      console.error("[REINDEX] Failed to release lock after start() denied", {
        jobId, error: e?.message,
      })
    );
    return {
      httpStatus: 409,
      success: false,
      started: false,
      lockAcquired: false,
      jobId,
      reason: "full_reindex_running",
      message: "Indexing is already running.",
    };
  }

  return {
    httpStatus: 200,
    success: true,
    engine: "TINA Background Indexing Engine",
    route,
    started: true,
    lockAcquired: true,
    jobId,
    message: "Full reindex started in background. DB lock confirmed before this response.",
    statusUrl: "/index-status?secret=YOUR_SECRET"
  };
}

app.get("/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const result = await startIndexingResponse("/index-drive");
  const { httpStatus = 200, ...body } = result;
  return res.status(httpStatus).json(body);
});

app.get("/reindex", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const result = await startIndexingResponse("/reindex");
  const { httpStatus = 200, ...body } = result;
  return res.status(httpStatus).json(body);
});

app.get("/admin/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const result = await startIndexingResponse("/admin/index-drive");
  const { httpStatus = 200, ...body } = result;
  return res.status(httpStatus).json(body);
});

app.get("/reindex-targeted", allowAuthenticatedOrIndexSecret, async (req, res) => {
  if (isTargetedReindexRunning()) {
    return res.status(409).json({
      started: false,
      reason: "already_running",
      message: "Targeted reindex is already in progress. Check Render logs for [REINDEX COMPLETE]."
    });
  }
  // Block targeted reindex while full background reindex is running.
  if (reindexController.isActive()) {
    return res.status(409).json({
      started: false,
      reason: "full_reindex_running",
      message: "Full background reindex is currently running. " +
        "Wait for it to complete before starting targeted reindex."
    });
  }

  // Acquire DB lock synchronously before returning started:true.
  // This guarantees the client only sees started:true when the lock is confirmed held.
  // If the lock is denied or the table is missing, the route returns 409/503 instead.
  const jobId = generateJobId();
  const lockResult = await acquireReindexLock(jobId, "targeted_reindex");

  if (!lockResult.acquired) {
    const status = lockResult.reason === "lock_held" ? 409 : 503;
    return res.status(status).json({
      started: false,
      lockAcquired: false,
      jobId,
      reason: lockResult.reason,
      existingJobId: lockResult.existingJobId || null,
      message: lockResult.reason === "lock_held"
        ? "Another reindex job holds the DB lock. Check Render logs for [REINDEX LOCK ACQUIRED] / [REINDEX COMPLETE]."
        : "Cannot acquire reindex lock — tina_reindex_locks table missing or RLS error. Run the migration and check /debug/db-identity.",
    });
  }

  // Lock confirmed. Respond to client before background work starts.
  res.json({
    started: true,
    lockAcquired: true,
    jobId,
    message: "Targeted NIRC + VAT reindex started. DB lock confirmed before this response.",
    targets: ["01_TAX_CODE (all)", "RR 16-2005", "RR 13-2018", "RMC 67-2021", "RMC 99-2021"],
    note: "Check Render logs for [DB IDENTITY], [REINDEX START], [NIRC REPAIR PREDELETE COUNT], [NIRC POSTINSERT EXACT COUNT], [REINDEX COMPLETE], [REINDEX LOCK RELEASED]"
  });

  // Pass the pre-acquired jobId so runTargetedReindex skips re-acquisition.
  setImmediate(() => {
    runTargetedReindex(undefined, { preAcquiredJobId: jobId })
      .catch(err => console.error("[REINDEX] Targeted reindex failed:", err?.message, { jobId }));
  });
});

app.get("/index-status", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    return res.json({
      success: true,
      engine: "TINA Background Indexing Engine",
      indexing: reindexController.getStatus(),
      vectorStore: vectorStats,
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error("Index status error:", error);
    return sendError(res, 500, error.message || "Failed to read index status");
  }
});

/* ================= DB IDENTITY DEBUG ================= */

app.get("/debug/db-identity", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseHost = supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const supabaseProjectRef = supabaseHost.split(".")[0] || null;

    const LOCK_TABLE = "tina_reindex_locks";
    const VECTOR_TABLE = process.env.VECTOR_TABLE || "tina_vector_store";

    // Try reading lock table to confirm it exists and is accessible.
    let lockTableStatus = "unknown";
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sc = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { error } = await sc.from(LOCK_TABLE).select("lock_name").limit(1);
      lockTableStatus = error
        ? `error: ${error.message} (code: ${error.code})`
        : "accessible";
    } catch (e) {
      lockTableStatus = `exception: ${e?.message}`;
    }

    return res.json({
      supabaseUrlHost: supabaseHost || null,
      supabaseProjectRef,
      VECTOR_TABLE,
      vectorTableFromEnv: process.env.VECTOR_TABLE || null,
      vectorTableMatchExpected: VECTOR_TABLE === "tina_vector_store",
      LOCK_TABLE,
      lockTableStatus,
      RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || null,
      RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT || null,
      RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID || null,
      INSTANCE_ID,
      NODE_ENV: process.env.NODE_ENV || null,
      pid: process.pid,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DEBUG DB IDENTITY] Error:", error);
    return sendError(res, 500, error.message || "Failed to read DB identity");
  }
});

/* ================= DRIVE ROUTES ================= */

app.get("/list", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) return sendError(res, 400, "GOOGLE_DRIVE_FOLDER_ID not set");

    const files = await listDriveFiles(folderId);

    return res.json({
      success: true,
      totalFiles: files.length,
      files
    });
  } catch (error) {
    console.error("List error:", error);
    return sendError(res, 500, error.message || "Failed to list files");
  }
});

app.get("/read-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) return sendError(res, 400, "GOOGLE_DRIVE_FOLDER_ID not set");

    const maxFiles = Math.max(1, Number(req.query.limit || 25));
    const files = await listDriveFiles(folderId);
    const selectedFiles = files.slice(0, maxFiles);
    const results = [];

    for (const file of selectedFiles) {
      try {
        const text = await extractTextFromFile(file);
        const path = file.path || file.name;

        results.push({
          fileName: file.name,
          normalizedSource: normalizeSourceName(path),
          path,
          authorityTier: getSourceTier({
            source: file.name,
            metadata: { path }
          }),
          mimeType: file.mimeType,
          textLength: String(text || "").length,
          textPreview: String(text || "").substring(0, 1000),
          driveViewUrl: file.driveViewUrl || null,
          driveDownloadUrl: file.driveDownloadUrl || null
        });
      } catch (fileError) {
        const path = file.path || file.name;

        results.push({
          fileName: file.name,
          normalizedSource: normalizeSourceName(path),
          path,
          mimeType: file.mimeType,
          textLength: 0,
          error: fileError.message || "Failed to read file",
          driveViewUrl: file.driveViewUrl || null,
          driveDownloadUrl: file.driveDownloadUrl || null
        });
      }
    }

    return res.json({
      success: true,
      message: "Drive read completed.",
      totalFilesInFolder: files.length,
      filesRead: results.length,
      limitApplied: maxFiles,
      files: results
    });
  } catch (error) {
    console.error("Read-drive error:", error);
    return sendError(res, 500, error.message || "Drive read failed");
  }
});

app.get("/vector-stats", allowAuthenticatedOrIndexSecret, async (req, res) => {
  try {
    const vectorStats = await getVectorStoreStats();

    return res.json({
      success: true,
      engine: "TINA Philippine Tax Intelligence Engine",
      vectorStore: vectorStats
    });
  } catch (error) {
    console.error("Vector stats error:", error);
    return sendError(res, 500, error.message || "Failed to read vector stats");
  }
});

/* ================= ASK / MODE ROUTES ================= */

registerTinaRoutes(app, { askHandler });

/* ================= NOT FOUND ================= */

app.use((req, res) => {
  return sendError(res, 404, "Route not found", {
    path: req.originalUrl,
    method: req.method
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) return next(error);

  return sendError(
    res,
    error.status || 500,
    NODE_ENV === "production"
      ? "Internal server error"
      : error.message || "Internal server error"
  );
});

/* ================= SERVER ================= */

const server = app.listen(PORT, () => {
  console.log(`TINA Backend running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`OpenAI model: ${OPENAI_MODEL}`);
  console.log(`Server version: ${SERVER_VERSION}`);
  console.log("Context orchestration engine wired into ask-handler dependency injection.");
  console.log("server.js direct OpenAI prompt assembly: DISABLED.");
  console.log("Issue-classified RAG routes enabled: /ask /tax /review /quiz /diagnostic /source /audit /case /debug /patch /progress /feedback");
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down TINA backend...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
