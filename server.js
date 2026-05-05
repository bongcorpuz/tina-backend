// FILE: server.js

import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import {
  getModeState,
  saveModeState,
  clearModeState,
  isExplicitModeHook
} from "./mode-state.js";

import { detectTopic } from "./topic-detector.js";
import {
  getLastTopicState,
  saveTopicState,
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  saveMessage
} from "./conversation-memory.js";

import {
  getAdaptiveQuizProfile,
  buildAdaptiveQuizPrompt,
  safeParseQuizJson,
  storeUnansweredQuiz,
  getRecentQuizHistory,
  buildQuizExclusionFromHistory
} from "./adaptive-quiz.js";

import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  updateTopicMastery
} from "./learner-profile.js";

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";

import {
  storeFeedbackEntry,
  listPendingFeedback,
  approveFeedbackEntry,
  rejectFeedbackEntry,
  applyApprovedFeedbackToKnowledge
} from "./feedback-learning.js";

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
  getQuizSourceChunks,
  getVectorStoreStats
} from "./vector-store.js";

import {
  hybridRetrieve,
  normalizeRetrievedEvidence,
  detectEvidenceConflicts,
  rankEvidenceByAuthority,
  buildClaimEvidenceMap,
  synthesizeGroundedAnswer,
  saveReasoningRun,
  saveReasoningEvidence,
  saveReasoningConflicts
} from "./reasoning-engine.js";

import {
  rerankByHierarchy,
  detectHierarchyConflict,
  selectTopLegalBases,
  buildStrictAnswerPrompt,
  buildAuthorityMetadata
} from "./authority-engine.js";

import {
  reconcileDoctrine
} from "./doctrinal-engine.js";

import {
  applySupersessionFilter
} from "./supersession-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

import {
  maybeGenerateProvisionCitationAnswer
} from "./provision-citation-engine.js";

import {
  formatLegalBasisBlock,
  formatSourcesUsedBlock,
  buildConflictFlagText,
  buildSupportingRulesText,
  ensureStructuredAnswerSections
} from "./citation-formatting-engine.js";

import {
  maybeGenerateCaseAnalysisAnswer
} from "./case-analysis-engine.js";

import {
  maybeGenerateDoctrineAnswer
} from "./doctrine-tagging-engine.js";

import {
  createBackgroundReindexController
} from "./reindex-service.js";

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

const reindexController = createBackgroundReindexController();

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

/* ================= HELPERS ================= */

const MAX_VISIBLE_SOURCES = 5;

function getUserId(req) {
  return (
    req.user?.id ||
    req.user?.user_id ||
    req.user?.sub ||
    req.user?.username ||
    req.user?.email ||
    null
  );
}

function toSafeDbNumeric(value, max = 999999.9999, decimals = 4) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return 0;
  }

  return Number(
    Math.min(max, Math.max(0, num)).toFixed(decimals)
  );
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

function buildMemoryContext(messages = []) {
  if (!messages.length) return "No prior conversation.";

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
    .join("\n");
}

function extractQuizAnswer(text = "") {
  const cleaned = String(text || "").trim().toUpperCase();
  if (!cleaned) return null;
  if (/^[ABCD]$/.test(cleaned)) return cleaned;

  const match = cleaned.match(/^(?:ANSWER\s*[:\-]?\s*)?([ABCD])$/i);
  return match?.[1]?.toUpperCase() || null;
}

function isModeCommand(text = "") {
  const value = String(text || "").trim().toLowerCase();

  return [
    "/ask",
    "/tax",
    "/review",
    "/quiz",
    "/diagnostic",
    "/progress",
    "/feedback",
    "/source",
    "/bye",
    "/exit",
    "/stop",
    "/quit",
    "/reset"
  ].some((prefix) => value.startsWith(prefix));
}

function isAssessmentMode(mode = "") {
  return ["QUIZ_MASTER", "ADAPTIVE_QUIZ", "TAX_REVIEWER"].includes(mode);
}

function formatQuestionBlock({
  prefix = "",
  quiz,
  storedQuiz,
  teachingText = ""
}) {
  const parts = [];

  if (prefix) parts.push(prefix);
  if (teachingText) {
    parts.push(teachingText);
    parts.push("");
  }

  parts.push(`Topic: ${quiz.topic}`);
  parts.push(`Difficulty: ${quiz.difficulty}`);
  parts.push("");
  parts.push("Question:");
  parts.push(quiz.question);
  parts.push("");
  parts.push(`A. ${quiz.choices.A}`);
  parts.push(`B. ${quiz.choices.B}`);
  parts.push(`C. ${quiz.choices.C}`);
  parts.push(`D. ${quiz.choices.D}`);
  parts.push("");
  parts.push("Instruction:");
  parts.push("Answer A, B, C, or D. Type /bye or /exit to stop.");
  parts.push("");

  if (storedQuiz?.source_title) parts.push(`Source: ${storedQuiz.source_title}`);
  if (storedQuiz?.source_path) parts.push(`Source Path: ${storedQuiz.source_path}`);

  return parts.filter(Boolean).join("\n");
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

async function fetchLatestPendingQuizDirect(userId, conversationId = null) {
  if (!userId) return null;

  let query = supabase
    .from("tina_learning_attempts")
    .select("*")
    .eq("user_id", String(userId))
    .is("user_answer", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (conversationId) {
    query = query.eq("session_id", conversationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("fetchLatestPendingQuizDirect error:", error.message);
    return null;
  }

  return data || null;
}

async function updatePendingQuizAnswerDirect({
  pendingQuiz,
  cleanAnswer,
  isCorrect
}) {
  if (!pendingQuiz?.id) {
    return {
      data: null,
      error: new Error("Pending quiz id is required.")
    };
  }

  const payload = {
    user_answer: cleanAnswer,
    is_correct: Boolean(isCorrect),
    answered_at: new Date().toISOString()
  };

  if (pendingQuiz.updated_at !== undefined) {
    payload.updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tina_learning_attempts")
    .update(payload)
    .eq("id", pendingQuiz.id)
    .select();

  if (error) {
    console.error("updatePendingQuizAnswerDirect error:", error.message, {
      pendingQuizId: pendingQuiz.id,
      payload
    });

    return {
      data: null,
      error
    };
  }

  const updatedRow = Array.isArray(data) ? data[0] || null : data || null;

  if (!updatedRow) {
    return {
      data: null,
      error: new Error("No quiz row was updated.")
    };
  }

  return {
    data: updatedRow,
    error: null
  };
}

function shouldHideSourceFromUser(source = {}) {
  const path = String(
    source.path ||
      source.source_path ||
      source.metadata?.path ||
      source.originalSource ||
      source.source ||
      ""
  ).toLowerCase();

  return (
    path.includes("07_cpa_notes") ||
    path.includes("08_review_materials")
  );
}

function buildSourceResponseItem(item = {}) {
  const fileId =
    item.fileId ||
    item.file_id ||
    item.metadata?.fileId ||
    item.metadata?.file_id ||
    null;

  return {
    title:
      item.title ||
      item.source_title ||
      item.metadata?.documentTitle ||
      item.source ||
      item.originalSource ||
      "Unknown source",
    source:
      item.source ||
      item.source_title ||
      item.originalSource ||
      "Unknown source",
    originalSource:
      item.originalSource ||
      item.metadata?.originalSource ||
      item.source_title ||
      item.source ||
      null,
    path:
      item.source_path ||
      item.path ||
      item.metadata?.path ||
      item.originalSource ||
      item.source ||
      null,
    fileId,
    driveViewUrl:
      item.driveViewUrl ||
      item.metadata?.driveViewUrl ||
      (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null),
    driveDownloadUrl:
      item.driveDownloadUrl ||
      item.metadata?.driveDownloadUrl ||
      (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null),
    text: item.text || "",
    preview: item.preview || (item.text ? item.text.substring(0, 300) : ""),
    score: Number(item.finalScore || item.adjustedScore || item.score || 0),
    adjustedScore: Number(item.finalScore || item.adjustedScore || item.score || 0),
    authorityType:
      item.authorityType ||
      item.authority_type ||
      item.metadata?.authorityType ||
      null,
    authorityLevel:
      item.authorityLevel ||
      item.authority_level ||
      item.metadata?.authorityLevel ||
      item.authority_tier ||
      null,
    authorityScore:
      item.authorityScore ||
      item.authority_score ||
      item.metadata?.authorityScore ||
      0,
    authorityLabel:
      item.authorityLabel ||
      item.authority_label ||
      item.metadata?.authorityLabel ||
      "Unknown"
  };
}

function finalizeSourcesForResponse(rawSources = [], query = "") {
  const reranked = rerankByHierarchy(
    rawSources.map((item) => buildSourceResponseItem(item)),
    query
  );

  const seen = new Set();

  return reranked
    .filter((item) => !shouldHideSourceFromUser(item))
    .filter((item) => item.driveViewUrl)
    .filter((item) => {
      const key = String(
        item.fileId ||
          item.driveViewUrl ||
          item.path ||
          item.originalSource ||
          item.source ||
          item.title ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((item) => ({
      title: item.title,
      source: item.source,
      originalSource: item.originalSource,
      path: item.path,
      fileId: item.fileId,
      driveViewUrl: item.driveViewUrl,
      driveDownloadUrl: item.driveDownloadUrl,
      text: item.text,
      preview: item.preview,
      score: item.score,
      adjustedScore: item.adjustedScore,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      authorityScore: item.authorityScore,
      authorityLabel: item.authorityLabel
    }));
}

/* ================= AUTHORITY ENGINE ================= */

function getSourceTier(doc = {}) {
  const value = `${getDocPath(doc)} ${getDocOriginalName(doc)} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) {
    return { tier: 1, label: "Tax Code / NIRC", weight: 1.0 };
  }

  if (value.includes("02_revenue_regulations")) {
    return { tier: 2, label: "Revenue Regulations", weight: 0.95 };
  }

  if (value.includes("03_rmc")) {
    return { tier: 3, label: "Revenue Memorandum Circulars", weight: 0.9 };
  }

  if (value.includes("04_rmo")) {
    return { tier: 4, label: "Revenue Memorandum Orders", weight: 0.85 };
  }

  if (value.includes("05_bir_rulings")) {
    return { tier: 5, label: "BIR Rulings", weight: 0.75 };
  }

  if (value.includes("06_court_cases")) {
    return { tier: 6, label: "Court Cases", weight: 0.6 };
  }

  if (value.includes("07_cpa_notes")) {
    return { tier: 7, label: "CPA Notes / Internal Notes", weight: 0.4 };
  }

  return { tier: 99, label: "Unclassified Source", weight: 0.5 };
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
    q.includes("compute") ||
    q.includes("calculate") ||
    q.includes("tax due") ||
    q.includes("vat payable") ||
    q.includes("mcit") ||
    q.includes("rcit") ||
    q.includes("nolco") ||
    q.includes("withholding") ||
    q.includes("ewt")
  ) {
    return "tax_computation";
  }

  if (
    q.includes("risk") ||
    q.includes("audit") ||
    q.includes("exposure") ||
    q.includes("assessment") ||
    q.includes("deficiency")
  ) {
    return "audit_risk";
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

/* ================= SOURCE LINKS ================= */

function buildGoogleDriveLinks(doc = {}) {
  const fileId = doc.metadata?.fileId || doc.fileId || null;

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

function uniqueSources(docs = []) {
  const seen = new Set();

  return docs
    .filter((doc) => {
      const key =
        doc.metadata?.fileId ||
        doc.fileId ||
        doc.path ||
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
        source: doc.source || originalSource || "Untitled Source",
        originalSource,
        path,
        fileId:
          doc.metadata?.fileId ||
          doc.fileId ||
          links.fileId ||
          null,
        driveViewUrl:
          doc.driveViewUrl ||
          doc.metadata?.driveViewUrl ||
          links.driveViewUrl ||
          null,
        driveDownloadUrl:
          doc.driveDownloadUrl ||
          doc.metadata?.driveDownloadUrl ||
          links.driveDownloadUrl ||
          null,
        text: doc.text || "",
        score: Number(doc.score || 0),
        adjustedScore: Number(doc.adjustedScore || doc.score || 0),
        authorityTier:
          doc.authorityTier ||
          tier?.tier ||
          99,
        authorityLabel:
          doc.authorityLabel ||
          tier?.label ||
          "Unclassified Source",
        sourceTier: {
          tier:
            doc.authorityTier ||
            tier?.tier ||
            99,
          label:
            doc.authorityLabel ||
            tier?.label ||
            "Unclassified Source"
        },
        preview: doc.text ? doc.text.substring(0, 300) : ""
      };
    });
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

/* ================= FALLBACK ================= */

async function generateGeneralFallbackAnswer(
  cleanQuestion,
  memoryContext,
  reason = "No sufficient indexed source was found."
) {
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

  return [
    "General TINA Fallback Answer",
    "",
    `Source Status: ${reason}`,
    "",
    "Important Note: This answer is not based on an indexed Google Drive source and should be verified against official BIR/NIRC/court sources.",
    "",
    text || "No fallback answer generated."
  ].join("\n");
}

/* ================= HOOK CONFIG ================= */

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
    "/diagnostic",
    "/progress",
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
          "Quick Recall"
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
    "/diagnostic": {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      output_format: "adaptive_quiz_format",
      response_template: {
        sections: ["Question", "Choices", "Instruction"]
      }
    },
    "/progress": {
      hook_code: "/progress",
      mode: "LEARNING_PROGRESS",
      title: "Learning Progress Tracker",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      output_format: "progress_format",
      response_template: {
        sections: ["Profile", "Accuracy", "Weak Topics", "Strong Topics"]
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
Teach briefly, then continue with multiple-choice questions only.
Required sections:
${sections}
    `.trim();
  }

  if (mode === "QUIZ_MASTER" || mode === "ADAPTIVE_QUIZ") {
    return `
Mode: Quiz Mode.
TINA must ask one multiple-choice question and continue until the user exits.
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

/* ================= REVIEW TEACHING ================= */

async function buildReviewTeachingBlock(topic = "") {
  const prompt = `
You are TINA, a CPALE taxation reviewer.

Teach this topic briefly and clearly:
${topic}

Rules:
- Philippine taxation context only
- concise, useful, exam-oriented
- no long memo
- no practice question
- no free-text answer request

Output format exactly:

Topic:
[topic]

Core Concept:
[brief explanation]

Rule:
[brief rule]

Simple Example:
[brief example]

CPALE Trap:
[brief trap]

Quick Recall:
[memory aid]
`.trim();

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

/* ================= CONTINUOUS ASSESSMENT HELPERS ================= */

async function generateStoredAssessmentQuestion({
  userId,
  conversationId,
  hookConfig,
  requestedTopic,
  teachingText = ""
}) {
  const quizProfile = await getAdaptiveQuizProfile(
    supabase,
    userId,
    requestedTopic
  );

  const recentHistory = await getRecentQuizHistory(supabase, {
    userId,
    topic: quizProfile.topic,
    limit: 20
  });

  const exclusions = buildQuizExclusionFromHistory(recentHistory);

  const sourceChunks = await getQuizSourceChunks({
    topic: quizProfile.topic,
    excludeSourcePaths: exclusions.excludeSourcePaths,
    excludeChunkIds: exclusions.excludeChunkIds,
    limit: 3
  });

  const quizPrompt = buildAdaptiveQuizPrompt({
    topic: quizProfile.topic,
    difficulty: quizProfile.difficulty,
    profile: quizProfile.profile,
    sourceChunks,
    recentQuestions: recentHistory
  });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [{ role: "user", content: quizPrompt }]
  });

  const rawQuiz = response.choices?.[0]?.message?.content?.trim() || "";
  const quiz = safeParseQuizJson(rawQuiz);

  if (!quiz) {
    return {
      ok: false,
      error: "Unable to generate valid multiple-choice question JSON.",
      rawQuiz,
      sourceChunks
    };
  }

  const storedQuiz = await storeUnansweredQuiz(supabase, {
    userId,
    sessionId: conversationId || null,
    quiz,
    mode: hookConfig.mode,
    sourceChunks
  });

  if (!storedQuiz || storedQuiz.saveFailed) {
    return {
      ok: false,
      error: "Question was generated but could not be saved.",
      supabaseError: storedQuiz?.error || null,
      rawQuiz,
      quiz,
      sourceChunks
    };
  }

  const answerText = formatQuestionBlock({
    quiz,
    storedQuiz,
    teachingText
  });

  return {
    ok: true,
    quiz,
    storedQuiz,
    sourceChunks,
    answerText
  };
}

async function continueAssessmentLoop({
  userId,
  conversationId,
  incomingAnswer
}) {
  const pendingQuiz = await fetchLatestPendingQuizDirect(userId, conversationId);

  if (!pendingQuiz) {
    return { handled: false };
  }

  const cleanAnswer = extractQuizAnswer(incomingAnswer);

  if (!cleanAnswer) {
    return {
      handled: true,
      response: {
        success: false,
        engine: "TINA Continuous Learning Engine",
        mode: "INVALID_ANSWER",
        answer: "Please answer using letter A, B, C, or D only. Example: A. Type /bye or /exit to stop.",
        sourceStatus: "INVALID_QUIZ_ANSWER",
        sourcesUsed: [],
        vectorMatches: 0
      }
    };
  }

  const correctAnswer = String(pendingQuiz.correct_answer || "")
    .replace(/[^A-Da-d]/g, "")
    .trim()
    .toUpperCase();

  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return {
      handled: true,
      response: {
        success: false,
        engine: "TINA Continuous Learning Engine",
        mode: "INVALID_PENDING_QUESTION",
        answer: "Pending question has invalid correct-answer data.",
        sourceStatus: "INVALID_PENDING_QUIZ_DATA",
        sourcesUsed: [],
        vectorMatches: 0
      }
    };
  }

  const isCorrect = cleanAnswer === correctAnswer;

  const { data: answeredQuiz, error: answerError } = await updatePendingQuizAnswerDirect({
    pendingQuiz,
    cleanAnswer,
    isCorrect
  });

  if (answerError || !answeredQuiz) {
    return {
      handled: true,
      response: {
        success: false,
        engine: "TINA Continuous Learning Engine",
        mode: "ANSWER_SAVE_FAILED",
        answer: "TINA failed to save your answer.",
        sourceStatus: "QUIZ_UPDATE_FAILED",
        sourcesUsed: [],
        vectorMatches: 0
      }
    };
  }

  await updateLearnerProfileStats(supabase, {
    userId,
    topic: pendingQuiz.topic,
    isCorrect
  });

  const mastery = await updateTopicMastery(supabase, {
    userId,
    topic: pendingQuiz.topic,
    subtopic: pendingQuiz.subtopic || "",
    isCorrect
  });

  const nextMode =
    pendingQuiz.mode === "TAX_REVIEWER"
      ? "TAX_REVIEWER"
      : pendingQuiz.mode === "ADAPTIVE_QUIZ"
        ? "ADAPTIVE_QUIZ"
        : "QUIZ_MASTER";

  const nextHookConfig = {
    hook_code:
      nextMode === "TAX_REVIEWER"
        ? "/review"
        : nextMode === "ADAPTIVE_QUIZ"
          ? "/diagnostic"
          : "/quiz",
    mode: nextMode,
    title:
      nextMode === "TAX_REVIEWER"
        ? "CPALE Tax Reviewer Mode"
        : nextMode === "ADAPTIVE_QUIZ"
          ? "Adaptive CPALE Diagnostic Quiz"
          : "Tax Quiz Mode",
    requires_memory: true
  };

  const nextQuestion = await generateStoredAssessmentQuestion({
    userId,
    conversationId,
    hookConfig: nextHookConfig,
    requestedTopic: pendingQuiz.topic || "VAT",
    teachingText: ""
  });

let nextQuestionText = "\nNext question could not be generated. Type the mode command again to continue.";
let nextSources = [];

if (nextQuestion.ok) {
  nextSources = finalizeSourcesForResponse(
    nextQuestion.sourceChunks || [],
    pendingQuiz.topic || "VAT"
  );
  nextQuestionText = ["", "Next Question:", nextQuestion.answerText].join("\n");
}

  const finalAnswer = [
    isCorrect ? "Correct ✅" : "Incorrect ❌",
    "",
    `Your Answer: ${cleanAnswer}`,
    `Correct Answer: ${correctAnswer}`,
    "",
    `Explanation: ${pendingQuiz.explanation || "No explanation available."}`,
    "",
    pendingQuiz.source_title ? `Source: ${pendingQuiz.source_title}` : "",
    pendingQuiz.source_path ? `Source Path: ${pendingQuiz.source_path}` : "",
    nextQuestionText
  ]
    .filter(Boolean)
    .join("\n");

  if (conversationId) {
    await saveConversationTurn({
      conversationId,
      userId,
      question: incomingAnswer,
      answerText: finalAnswer
    });
  }

  await saveModeState(supabase, {
    userId,
    sessionId: conversationId || null,
    activeHook: nextHookConfig.hook_code,
    activeMode: nextHookConfig.mode,
    modeTitle: nextHookConfig.title,
    lastQuestion: incomingAnswer,
    lastAnswer: finalAnswer
  });

  return {
    handled: true,
    response: {
      success: true,
      engine: "TINA Continuous Learning Engine",
      mode: "ANSWER_CHECKED_AND_NEXT_READY",
      answer: finalAnswer,
      isCorrect,
      mastery,
      topic: pendingQuiz.topic || null,
      difficulty: pendingQuiz.difficulty || null,
      sourceStatus: nextSources.length
        ? "GDRIVE_GROUNDED_NEXT_QUESTION"
        : "GENERAL_NEXT_QUESTION",
      sourcesUsed: nextSources,
      vectorMatches: nextSources.length
    }
  };
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
      return res.status(401).json({ error: "User ID not found in token." });
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
      return res.status(401).json({ error: "User ID not found in token." });
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
      return res.status(401).json({ error: "User ID not found in token." });
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
  const started = reindexController.start();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    route: "/index-drive",
    ...started,
    statusUrl: "/index-status?secret=YOUR_SECRET"
  });
});

app.get("/reindex", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const started = reindexController.start();

  return res.json({
    success: true,
    engine: "TINA Background Indexing Engine",
    route: "/reindex",
    ...started,
    statusUrl: "/index-status?secret=YOUR_SECRET"
  });
});

app.get("/admin/index-drive", allowAuthenticatedOrIndexSecret, async (req, res) => {
  const started = reindexController.start();

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
      indexing: reindexController.getStatus(),
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

async function clearPendingQuizAttempts(userId, conversationId = null) {
  if (!userId) return;

  let query = supabase
    .from("tina_learning_attempts")
    .update({
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .is("user_answer", null);

  if (conversationId) {
    query = query.eq("session_id", conversationId);
  }

  const { error } = await query;

  if (error) {
    console.error("clearPendingQuizAttempts error:", error.message);
  }
}

function finalizeSourcesForResponse(rawSources = [], query = "") {
  const reranked = rerankByHierarchy(
    rawSources.map((item) => buildSourceResponseItem(item)),
    query
  );

  const seen = new Set();

  return reranked
    .filter((item) => !shouldHideSourceFromUser(item))
    .filter((item) => item.driveViewUrl)
    .filter((item) => {
      const key = String(
        item.fileId ||
          item.driveViewUrl ||
          item.path ||
          item.originalSource ||
          item.source ||
          item.title ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((item) => ({
      title: item.title,
      source: item.source,
      originalSource: item.originalSource,
      path: item.path,
      fileId: item.fileId,
      driveViewUrl: item.driveViewUrl,
      driveDownloadUrl: item.driveDownloadUrl,
      text: item.text,
      preview: item.preview,
      score: item.score,
      adjustedScore: item.adjustedScore,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      authorityScore: item.authorityScore,
      authorityLabel: item.authorityLabel
    }));
}

/* ================= ASK ROUTE ================= */

app.post("/ask", authenticate, async (req, res) => {
  try {
    const { question, conversationId, correction, feedbackType } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User ID not found in token. Cannot proceed."
      });
    }

    const rawQuestion = String(question || "").trim();

    if (!rawQuestion) {
      return res.status(400).json({
        success: false,
        error: "Question required"
      });
    }

    const existingMode = await getModeState(
      supabase,
      userId,
      conversationId || null
    );

    const exitCommands = ["/bye", "/exit", "/stop", "/quit", "/reset"];

    if (exitCommands.includes(rawQuestion.toLowerCase())) {
      const activeHook = existingMode?.active_hook || "/ask";

      await clearModeState(supabase, userId, conversationId || null);
      await clearPendingQuizAttempts(userId, conversationId || null);

      let answerText = "You are already in normal /ask mode.";

      if (activeHook === "/quiz") {
        answerText = "Quiz mode ended. You are now back in normal /ask mode.";
      } else if (activeHook === "/review") {
        answerText = "Review mode ended. You are now back in normal /ask mode.";
      } else if (activeHook === "/diagnostic") {
        answerText = "Diagnostic mode ended. You are now back in normal /ask mode.";
      } else if (activeHook !== "/ask") {
        answerText = `Mode ${activeHook} ended. You are now back in normal /ask mode.`;
      }

      return res.json({
        success: true,
        engine: "TINA Mode State System",
        mode: "MODE_CLEARED",
        previousMode: activeHook,
        answer: answerText,
        sourceStatus: "MODE_STATE_CLEARED",
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

    const pendingQuiz = await fetchLatestPendingQuizDirect(
      userId,
      conversationId || null
    );

    const directQuizAnswer = extractQuizAnswer(rawQuestion);
    const normalizedInput = rawQuestion.toLowerCase();
    const allowedExitCommands = ["/bye", "/exit", "/stop", "/quit", "/reset"];

    const activeAssessmentModes = new Set([
      "/quiz",
      "/review",
      "/diagnostic"
    ]);

    const activeHook = existingMode?.active_hook || null;
    const hasActiveAssessmentMode = activeAssessmentModes.has(activeHook);

    if (pendingQuiz && !hasActiveAssessmentMode) {
      try {
        await clearPendingQuizAttempts(userId, conversationId || null);
        console.log(
          "Cleared stale pending quiz because no active assessment mode exists.",
          {
            userId,
            conversationId: conversationId || null,
            pendingQuizId: pendingQuiz.id || null
          }
        );
      } catch (clearError) {
        console.error("Failed to clear stale pending quiz:", clearError.message);
      }
    }

    const freshPendingQuiz = hasActiveAssessmentMode ? pendingQuiz : null;

    if (freshPendingQuiz && directQuizAnswer) {
      const loopResult = await continueAssessmentLoop({
        userId,
        conversationId: conversationId || null,
        incomingAnswer: rawQuestion
      });

      if (loopResult.handled) {
        return res.json(loopResult.response);
      }
    }

    if (freshPendingQuiz && !directQuizAnswer) {
      if (!allowedExitCommands.includes(normalizedInput)) {
        let lockedModeLabel = "quiz";
        let lockedModeMessage =
          "You are still in active quiz mode. Please answer using A, B, C, or D only. Type /bye or /exit to leave quiz mode.";

        if (activeHook === "/review") {
          lockedModeLabel = "review";
          lockedModeMessage =
            "You are still in active review mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave review mode.";
        } else if (activeHook === "/diagnostic") {
          lockedModeLabel = "diagnostic";
          lockedModeMessage =
            "You are still in active diagnostic mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave diagnostic mode.";
        }

        return res.json({
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "QUIZ_MODE_LOCKED",
          lockedMode: lockedModeLabel,
          answer: lockedModeMessage,
          sourceStatus: "QUIZ_MODE_LOCKED",
          sourcesUsed: [],
          vectorMatches: 0
        });
      }
    }

    let effectiveQuestion = rawQuestion;

    if (
      existingMode?.active_hook &&
      existingMode.active_hook !== "/ask" &&
      !isExplicitModeHook(rawQuestion)
    ) {
      effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
    }

    const hookConfig = await loadTaxHookConfig(effectiveQuestion);
    const cleanQuestion = hookConfig.cleanQuestion;
    const originalQuestion = hookConfig.originalQuestion;

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
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: originalQuestion,
        lastAnswer: answerText
      });
    }

    if (hookConfig.mode === "LEARNING_PROGRESS") {
      const profile = await getOrCreateLearnerProfile(supabase, userId);

      const answerText = profile
        ? [
            "Learning Progress",
            "",
            `Skill Level: ${profile.skill_level || "beginner"}`,
            `Learning Goal: ${profile.learning_goal || "CPALE"}`,
            `Total Questions: ${profile.total_questions || 0}`,
            `Correct Answers: ${profile.correct_answers || 0}`,
            `Accuracy Rate: ${Math.round(Number(profile.accuracy_rate || 0) * 100)}%`,
            `Last Reviewed Topic: ${profile.last_reviewed_topic || "None"}`,
            "",
            `Weak Topics: ${(profile.weak_topics || []).join(", ") || "None yet"}`,
            `Strong Topics: ${(profile.strong_topics || []).join(", ") || "None yet"}`
          ].join("\n")
        : "No learning profile found yet.";

      await saveSimpleHookMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Adaptive Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "learning_progress",
        sourceStatus: "LEARNING_PROFILE_USED",
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

    if (hookConfig.mode === "FEEDBACK") {
      const cleanCorrection = String(correction || "").trim();
      const cleanFeedbackType = String(
        feedbackType || "general_feedback"
      ).trim();

      if (!cleanCorrection) {
        return res.status(400).json({
          success: false,
          error: "Feedback correction is required.",
          hint: "Send { question, conversationId, correction, feedbackType }"
        });
      }

      const feedbackResult = await storeFeedbackEntry(supabase, {
        userId,
        sessionId: conversationId || null,
        originalQuestion,
        originalAnswer: "",
        feedbackType: cleanFeedbackType,
        userCorrection: cleanCorrection
      });

      const answerText =
        "Feedback received and stored for review. Thank you. TINA will only learn from this after validation.";

      await saveSimpleHookMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Feedback Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: "feedback_stored_for_review",
        confidence: "N/A",
        sourceStatus: "FEEDBACK_STORED",
        feedbackId: feedbackResult?.id || null,
        feedbackType: cleanFeedbackType,
        originalQuestion,
        resolvedQuestion: cleanQuestion,
        sourcesUsed: [],
        vectorMatches: 0
      });
    }

    if (
      hookConfig.mode === "QUIZ_MASTER" ||
      hookConfig.mode === "ADAPTIVE_QUIZ"
    ) {
      const questionResult = await generateStoredAssessmentQuestion({
        userId,
        conversationId,
        hookConfig,
        requestedTopic: cleanQuestion,
        teachingText: ""
      });

      if (!questionResult.ok) {
        return res.json({
          success: false,
          engine: "TINA Continuous Learning Engine",
          error: questionResult.error,
          rawQuiz: questionResult.rawQuiz || null,
          supabaseError: questionResult.supabaseError || null,
          answer:
            "TINA failed to generate the next stored multiple-choice question."
        });
      }

      const quizSourcesUsed = finalizeSourcesForResponse(
        questionResult.sourceChunks || [],
        cleanQuestion
      );

      await saveSimpleHookMemory(questionResult.answerText);

      return res.json({
        success: true,
        engine: "TINA Continuous Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: questionResult.answerText,
        answerMode: "continuous_question_generated",
        quizId: questionResult.storedQuiz.id,
        topic: questionResult.quiz.topic,
        difficulty: questionResult.quiz.difficulty,
        correctAnswerStored: Boolean(questionResult.storedQuiz.correct_answer),
        pendingAnswerStored: questionResult.storedQuiz.user_answer === null,
        confidence: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED"
          : "GENERAL_ADAPTIVE",
        sourceStatus: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED_QUESTION_READY"
          : "GENERAL_QUESTION_READY",
        sourcesUsed: quizSourcesUsed,
        vectorMatches: quizSourcesUsed.length
      });
    }

    if (hookConfig.mode === "TAX_REVIEWER") {
      const teachingText = await buildReviewTeachingBlock(cleanQuestion);

      const questionResult = await generateStoredAssessmentQuestion({
        userId,
        conversationId,
        hookConfig,
        requestedTopic: cleanQuestion,
        teachingText
      });

      if (!questionResult.ok) {
        return res.json({
          success: false,
          engine: "TINA Continuous Learning Engine",
          error: questionResult.error,
          rawQuiz: questionResult.rawQuiz || null,
          supabaseError: questionResult.supabaseError || null,
          answer:
            teachingText ||
            "TINA failed to generate the reviewer multiple-choice question."
        });
      }

      const quizSourcesUsed = finalizeSourcesForResponse(
        questionResult.sourceChunks || [],
        cleanQuestion
      );

      await saveSimpleHookMemory(questionResult.answerText);

      return res.json({
        success: true,
        engine: "TINA Continuous Learning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: questionResult.answerText,
        answerMode: "review_then_continuous_question_generated",
        quizId: questionResult.storedQuiz.id,
        topic: questionResult.quiz.topic,
        difficulty: questionResult.quiz.difficulty,
        correctAnswerStored: Boolean(questionResult.storedQuiz.correct_answer),
        pendingAnswerStored: questionResult.storedQuiz.user_answer === null,
        confidence: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED"
          : "GENERAL_ADAPTIVE",
        sourceStatus: quizSourcesUsed.length
          ? "GDRIVE_GROUNDED_QUESTION_READY"
          : "GENERAL_QUESTION_READY",
        sourcesUsed: quizSourcesUsed,
        vectorMatches: quizSourcesUsed.length
      });
    }

    if (!cleanQuestion || !cleanQuestion.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question required after hook"
      });
    }

    const topicData = await detectTopic({
      question: cleanQuestion,
      userId,
      sessionId: conversationId || null
    });

    let finalQuestion = topicData.resolvedQuestion || cleanQuestion;

    if ((!finalQuestion || finalQuestion.length < 5) && conversationId && userId) {
      try {
        const lastState = await getLastTopicState(
          supabase,
          userId,
          conversationId
        );

        if (lastState?.last_question) {
          finalQuestion = lastState.last_question;
        }
      } catch (error) {
        console.error("Topic fallback error:", error.message);
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

      await saveTopicState(supabase, {
        userId,
        sessionId: conversationId || null,
        topic: topicData.topic,
        subject: topicData.subject,
        taxType: topicData.taxType,
        question: originalQuestion,
        answer: answerText
      });

      await saveModeState(supabase, {
        userId,
        sessionId: conversationId || null,
        activeHook: hookConfig.hook_code,
        activeMode: hookConfig.mode,
        modeTitle: hookConfig.title,
        lastQuestion: originalQuestion,
        lastAnswer: answerText
      });
    }

    const retrieval = await hybridRetrieve({
      supabase,
      vectorStore: { smartSearch, searchSimilar },
      query: finalQuestion,
      questionType,
      taxType: topicData.taxType || "",
      topK: 24
    });

    const hierarchyRerankedDocs = rerankByHierarchy(
      retrieval.results || [],
      finalQuestion
    );

    const supersessionResult = applySupersessionFilter(
      hierarchyRerankedDocs,
      new Date()
    );

    const activeRankedDocs =
      supersessionResult.activeDocs?.length > 0
        ? supersessionResult.activeDocs
        : hierarchyRerankedDocs;

    const doctrinalReview = reconcileDoctrine({
      rankedDocs: activeRankedDocs,
      maxDocs: 5
    });

    const hierarchyConflict =
      doctrinalReview?.hierarchyConflict ||
      detectHierarchyConflict(activeRankedDocs.slice(0, 5));

    const topLegalBases = selectTopLegalBases(activeRankedDocs, 2);

    let evidence = normalizeRetrievedEvidence(
      activeRankedDocs.map((doc) => ({
        ...doc,
        authority_tier:
          doc.authorityLevel ??
          doc.authority_level ??
          doc.metadata?.authorityLevel ??
          null,
        metadata: {
          ...(doc.metadata || {}),
          authorityTier:
            doc.authorityLevel ??
            doc.authority_level ??
            doc.metadata?.authorityLevel ??
            null,
          authorityType:
            doc.authorityType ??
            doc.authority_type ??
            doc.metadata?.authorityType ??
            null,
          authorityScore:
            doc.authorityScore ??
            doc.authority_score ??
            doc.metadata?.authorityScore ??
            null,
          normalizedReference:
            doc.normalizedReference ??
            doc.normalized_reference ??
            doc.metadata?.normalizedReference ??
            null,
          normalizedAliases:
            doc.normalizedAliases ??
            doc.normalized_aliases ??
            doc.metadata?.normalizedAliases ??
            [],
          effectiveFrom:
            doc.effectiveFrom ??
            doc.effective_from ??
            doc.metadata?.effectiveFrom ??
            null,
          effectiveTo:
            doc.effectiveTo ??
            doc.effective_to ??
            doc.metadata?.effectiveTo ??
            null,
          isSuperseded:
            typeof doc.isSuperseded === "boolean"
              ? doc.isSuperseded
              : typeof doc.is_superseded === "boolean"
                ? doc.is_superseded
                : Boolean(doc.metadata?.isSuperseded || false),
          supersededByReference:
            doc.supersededByReference ??
            doc.superseded_by_reference ??
            doc.metadata?.supersededByReference ??
            null,
          repealedByReference:
            doc.repealedByReference ??
            doc.repealed_by_reference ??
            doc.metadata?.repealedByReference ??
            null,
          amendedByReference:
            doc.amendedByReference ??
            doc.amended_by_reference ??
            doc.metadata?.amendedByReference ??
            null
        }
      }))
    );

    evidence = rankEvidenceByAuthority(evidence);

    const conflicts = detectEvidenceConflicts(evidence);

    if (hierarchyConflict?.conflict) {
      conflicts.unshift({
        conflict_topic: "authority_hierarchy",
        source_a_path:
          hierarchyConflict.conflictingDocs?.[0]?.path ||
          hierarchyConflict.conflictingDocs?.[0]?.metadata?.path ||
          hierarchyConflict.conflictingDocs?.[0]?.source ||
          null,
        source_b_path:
          hierarchyConflict.conflictingDocs?.[1]?.path ||
          hierarchyConflict.conflictingDocs?.[1]?.metadata?.path ||
          hierarchyConflict.conflictingDocs?.[1]?.source ||
          null,
        source_a_claim: (
          hierarchyConflict.conflictingDocs?.[0]?.text || ""
        ).slice(0, 500),
        source_b_claim: (
          hierarchyConflict.conflictingDocs?.[1]?.text || ""
        ).slice(0, 500),
        preferred_source_path: hierarchyConflict.controllingSource || null,
        conflict_reason:
          hierarchyConflict.reason || "Higher authority prevails.",
        resolution_basis: `Controlling authority: ${
          hierarchyConflict.controllingAuthority || "UNKNOWN"
        }`
      });
    }

    const topEvidence = evidence.slice(0, 10);

    const strictContext = activeRankedDocs
      .slice(0, 5)
      .map((doc, index) =>
        [
          `SOURCE ${index + 1}: ${doc.source || doc.originalSource || "Untitled Source"}`,
          `PATH: ${doc.path || doc.metadata?.path || "Unknown"}`,
          `AUTHORITY TYPE: ${doc.authorityType || doc.authority_type || doc.metadata?.authorityType || "SECONDARY"}`,
          `AUTHORITY LEVEL: ${doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel || 99}`,
          `AUTHORITY SCORE: ${doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore || 0}`,
          `FINAL SCORE: ${doc.finalScore || doc.score || 0}`,
          `TEXT:`,
          doc.text || ""
        ].join("\n")
      )
      .join("\n\n---\n\n");

    const fallbackReason =
      !topEvidence.length
        ? "No indexed Google Drive/Supabase vector source matched the question."
        : "Indexed sources were found but evidence strength was insufficient.";

    let preliminaryAnswer = "";

    const provisionModeResult = await maybeGenerateProvisionCitationAnswer({
      openai,
      question: finalQuestion,
      retrievedResults: activeRankedDocs,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini"
    });

    const caseModeResult = !provisionModeResult.handled
      ? await maybeGenerateCaseAnalysisAnswer({
          openai,
          question: finalQuestion,
          retrievedResults: activeRankedDocs,
          model: process.env.OPENAI_MODEL || "gpt-4o-mini"
        })
      : { handled: false };

    const doctrineModeResult =
      !provisionModeResult.handled && !caseModeResult.handled
        ? await maybeGenerateDoctrineAnswer({
            openai,
            question: finalQuestion,
            retrievedResults: activeRankedDocs,
            model: process.env.OPENAI_MODEL || "gpt-4o-mini"
          })
        : { handled: false };

    if (provisionModeResult.handled) {
      preliminaryAnswer = provisionModeResult.answer || "";
    } else if (caseModeResult.handled) {
      preliminaryAnswer = caseModeResult.answer || "";
    } else if (doctrineModeResult.handled) {
      preliminaryAnswer = doctrineModeResult.answer || "";
    } else if (topEvidence.length > 0) {
      const strictPrompt = buildStrictAnswerPrompt({
        hookMode: hookConfig?.mode || "ASK",
        originalQuestion,
        cleanQuestion,
        context: strictContext,
        topLegalBases,
        conflict: hierarchyConflict
      });

      const strictResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: strictPrompt },
          {
            role: "user",
            content: [
              `Conversation Memory:`,
              memoryContext || "No prior conversation.",
              ``,
              `Topic Data:`,
              JSON.stringify(topicData || {}),
              ``,
              `Question Type: ${questionType}`,
              `Resolved Question: ${finalQuestion}`
            ].join("\n")
          }
        ]
      });

      preliminaryAnswer =
        strictResponse.choices?.[0]?.message?.content?.trim() ||
        (await synthesizeGroundedAnswer({
          openai,
          hookConfig,
          originalQuestion,
          cleanQuestion,
          topicData,
          questionType,
          evidence: topEvidence,
          conflicts,
          memoryContext
        }));
    }

    const claimSupportMap = buildClaimSupportMap(preliminaryAnswer, topEvidence);

    const validation = validateEvidenceSufficiency({
      evidence: activeRankedDocs,
      claimSupportMap,
      minEvidenceCount: 1,
      minSupportedClaims: 1,
      minTopScore: 0.25
    });

    const shouldFallback =
      topEvidence.length === 0 ||
      shouldRejectForWeakLegalBasis({
        validation,
        hasExactCitation: Boolean(retrieval.exactCitation?.matched)
      });

    const safeTopConfidenceRaw =
      activeRankedDocs.length > 0
        ? Math.max(
            0,
            ...activeRankedDocs.map((item) => {
              const value = Number(item.finalScore || item.score || 0);
              return Number.isFinite(value) ? value : 0;
            })
          )
        : 0;

    const safeTopConfidence = toSafeDbNumeric(
      safeTopConfidenceRaw,
      999999.9999,
      4
    );

    let reasoningRun = null;

    try {
      reasoningRun = await saveReasoningRun(supabase, {
        userId,
        sessionId: conversationId || null,
        question: originalQuestion,
        normalizedQuestion: finalQuestion,
        questionType,
        mode: hookConfig.mode,
        retrievalStatus: topEvidence.length ? "evidence_found" : "no_evidence",
        reasoningStatus: shouldFallback ? "fallback" : "grounded_answer",
        fallbackUsed: shouldFallback,
        topConfidence: safeTopConfidence,
        answerSummary: String(preliminaryAnswer || "").slice(0, 1000)
      });

      if (reasoningRun?.id) {
        await saveReasoningEvidence(supabase, {
          reasoningRunId: reasoningRun.id,
          evidence: claimSupportMap
        });

        if (conflicts.length) {
          await saveReasoningConflicts(supabase, {
            reasoningRunId: reasoningRun.id,
            conflicts
          });
        }
      }
    } catch (reasoningError) {
      console.error("Reasoning persistence error:", reasoningError.message, {
        safeTopConfidenceRaw,
        safeTopConfidence
      });
    }

    if (hookConfig.mode === "SOURCE_FINDER") {
      const rawSourceFinderSources = topEvidence.map((item) => ({
        ...item,
        preview: item.text ? item.text.substring(0, 300) : ""
      }));

      const sourcesUsed = finalizeSourcesForResponse(
        rawSourceFinderSources,
        finalQuestion
      );

      if (!sourcesUsed.length) {
        return res.json({
          success: true,
          engine: "TINA Reasoning Engine",
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
          .map((s, i) =>
            [
              `${i + 1}. ${s.title}`,
              `Authority: Level ${s.authorityLevel || 99} - ${s.authorityLabel || "Unknown"}`,
              `Preview: ${s.preview || ""}`
            ].join("\n")
          )
          .join("\n\n");

      return res.json({
        success: true,
        engine: "TINA Reasoning Engine",
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
        vectorMatches: sourcesUsed.length
      });
    }

    if (shouldFallback) {
      const answerText =
        issuance || questionType === "issuance"
          ? "No indexed document found or insufficient verified evidence for the requested issuance. TINA will not generate a speculative answer."
          : await generateGeneralFallbackAnswer(
              finalQuestion,
              memoryContext,
              fallbackReason
            );

      await saveAllMemory(answerText);

      return res.json({
        success: true,
        engine: "TINA Reasoning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: issuance ? "no_exact_issuance_match" : "general_fallback",
        confidence: issuance ? "LOW" : "GENERAL",
        sourceStatus: "FALLBACK_USED",
        questionType,
        topicData,
        originalQuestion,
        resolvedQuestion: finalQuestion,
        sourcesUsed: [],
        vectorMatches: topEvidence.length,
        detectedIssuance: issuance || null,
        reasoningRunId: reasoningRun?.id || null
      });
    }

    const sourcesUsed = finalizeSourcesForResponse(
      topEvidence,
      finalQuestion
    );

    const topTier = sourcesUsed.length
      ? Math.min(...sourcesUsed.map((s) => s.authorityLevel || 99))
      : 99;

    let confidence = "MEDIUM";
    if (issuance) confidence = "HIGH";
    else if (topTier <= 2) confidence = "HIGH";
    else if (topTier <= 4) confidence = "MEDIUM";
    else if (topTier <= 7) confidence = "LIMITED";
    else confidence = "LOW";

    const legalBasisText = formatLegalBasisBlock(topLegalBases);
    const supportingRulesText = buildSupportingRulesText({
      topLegalBases,
      extraSources: sourcesUsed
    });
    const conflictFlagText = buildConflictFlagText(hierarchyConflict);
    const sourcesUsedText = formatSourcesUsedBlock(sourcesUsed, {
      maxItems: 5
    });

    let answerText = preliminaryAnswer || buildNoSourceReply();

    if (
      !caseModeResult.handled &&
      !provisionModeResult.handled &&
      !doctrineModeResult.handled
    ) {
      answerText = ensureStructuredAnswerSections({
        directAnswer: preliminaryAnswer || buildNoSourceReply(),
        legalBasis: legalBasisText,
        supportingRules: supportingRulesText,
        professionalInsight:
          issuance || questionType === "issuance"
            ? "Use the cited issuance and verify the latest amended or superseding BIR issuance before relying on the rule operationally."
            : "Apply the higher-authority rule first and use lower-authority material only as support.",
        conflictFlag: conflictFlagText,
        sourcesUsed: sourcesUsedText
      });
    } else if (!String(answerText).toLowerCase().includes("sources used")) {
      answerText = `${answerText}\n\n${sourcesUsedText}`;
    }

    await saveAllMemory(answerText);

    return res.json({
      success: true,
      engine: "TINA Reasoning Engine",
      hook: hookConfig.hook_code,
      mode: hookConfig.mode,
      hookTitle: hookConfig.title,
      answer: answerText,
      answerMode: provisionModeResult.handled
        ? "provision_citation_answer"
        : caseModeResult.handled
          ? "case_analysis_answer"
          : doctrineModeResult.handled
            ? "doctrine_analysis_answer"
            : issuance
              ? `exact_issuance_${hookConfig.mode.toLowerCase()}_reasoned`
              : `${hookConfig.mode.toLowerCase()}_reasoned_answer`,
      confidence,
      sourceStatus: "INDEXED_REASONED_SOURCE_USED",
      questionType,
      topicData,
      originalQuestion,
      resolvedQuestion: finalQuestion,
      sourcesUsed,
      vectorMatches: activeRankedDocs.length,
      detectedIssuance: issuance || null,
      reasoningRunId: reasoningRun?.id || null,
      conflictCount: conflicts.length,
      hierarchyConflict: Boolean(hierarchyConflict?.conflict),
      doctrinalConflictCount: doctrinalReview?.doctrinalConflicts?.length || 0,
      supersededFilteredCount: supersessionResult?.superseded?.length || 0
    });
  } catch (error) {
    console.error("Ask error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Ask failed"
    });
  }
});

/* ================= ADMIN FEEDBACK ROUTES ================= */

app.get("/admin/feedback/pending", authenticate, requireAdmin, async (req, res) => {
  try {
    const feedback = await listPendingFeedback(supabase);

    return res.json({
      success: true,
      engine: "TINA Feedback Learning Engine",
      total: feedback.length,
      feedback
    });
  } catch (error) {
    console.error("List pending feedback error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load pending feedback"
    });
  }
});

app.post("/admin/feedback/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const reviewer =
      req.user?.username ||
      req.user?.email ||
      req.user?.id ||
      "admin";

    const feedback = await approveFeedbackEntry(
      supabase,
      req.params.id,
      reviewer
    );

    return res.json({
      success: true,
      engine: "TINA Feedback Learning Engine",
      message: "Feedback approved.",
      feedback
    });
  } catch (error) {
    console.error("Approve feedback error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to approve feedback"
    });
  }
});

app.post("/admin/feedback/:id/reject", authenticate, requireAdmin, async (req, res) => {
  try {
    const reviewer =
      req.user?.username ||
      req.user?.email ||
      req.user?.id ||
      "admin";

    const notes = String(req.body?.notes || "").trim();

    const feedback = await rejectFeedbackEntry(
      supabase,
      req.params.id,
      reviewer,
      notes
    );

    return res.json({
      success: true,
      engine: "TINA Feedback Learning Engine",
      message: "Feedback rejected.",
      feedback
    });
  } catch (error) {
    console.error("Reject feedback error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to reject feedback"
    });
  }
});

app.post("/admin/feedback/:id/apply", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await applyApprovedFeedbackToKnowledge(
      supabase,
      req.params.id
    );

    return res.json({
      success: true,
      engine: "TINA Feedback Learning Engine",
      message: "Approved feedback queued for knowledge application.",
      result
    });
  } catch (error) {
    console.error("Apply feedback error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to apply approved feedback"
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

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TINA Big 4 Backend running on port ${PORT}`);
});
