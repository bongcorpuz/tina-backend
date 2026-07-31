// FILE: ask-handler.js
"use strict";

/**
 * TINA Ask Handler
 * Version: 9.0.0
 *
 * Role:
 * - Route controller only
 * - Slash command interceptor
 * - Mode-state preserver
 * - Retrieved-source preserver
 * - Query-intent-aware dispatcher
 *
 * Normal RAG flow:
 * ask-handler.js
 * → query-intent-engine.js
 * → issue-classification-engine.js
 * → retrieval-engine.js
 * → reranker-engine.js
 * → context-orchestration-engine.js
 * → rag-answer-handler.js
 *
 * Boundary:
 * - Does not perform legal reasoning
 * - Does not rank sources internally
 * - Does not render final answers
 * - Does not assemble OpenAI prompts
 * - Does not call OpenAI directly
 */

import {
  getModeState,
  saveModeState,
  clearModeState,
  isExplicitModeHook
} from "./mode-state.js";

import {
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import { saveMessage, getHistory, createConversation } from "./conversation-memory.js";
import { storeFeedbackEntry } from "./feedback-learning.js";

import { extractQuizAnswer, finalizeSourcesForResponse, MAX_VISIBLE_SOURCES } from "./ask-helpers.js";
import { createAssessmentHandler } from "./assessment-handler.js";
import { createLearningHandler, parseLearningCommand } from "./learning/session-engine.js";
import { resolveTaxDomain } from "./learning/domain-normalizer.js";
import { resolveSlashCommand, resolveCommandIntent } from "./command-resolver.js";
// generateRagAnswer removed — Law 1: all pipeline logic lives in pipeline.js

import {
  buildOpenAIContext as defaultBuildOpenAIContext,
  callOpenAIWithOrchestration as defaultCallOpenAIWithOrchestration
} from "./context-orchestration-engine.js";

// LAW 1: Individual engine imports removed — all engine calls go through pipeline.js only.
import { runPipeline, isChatContextCarryoverEnabled, isControlledLoaAskGateEnabled } from "./pipeline.js";
import { buildShortTermContextCarryover } from "./helpers/chat-context-carryover.js";
import { applyVerifiedAuthorityGate } from "./answer-renderer.js";

import {
  detectPhilippineTaxBoundary,
  BOUNDARY_REJECTION_MESSAGE,
  BOUNDARY_CLARIFY_MESSAGE
} from "./services/philippine-tax-domain-boundary.js";
import { applyControlledLoaAuditProcedureBoundaryOverlay } from "./services/controlled-loa-audit-procedure-boundary.js";
import { evaluateUpstreamRestrictedLegalConclusionGate } from "./services/controlled-loa-legal-conclusion-safety.js";

import { sanitizePublicSourceCards } from "./services/ask-handler-public-source-sanitizer.js";
import { buildResponseTrust } from "./services/trust-contract.js";
import { answerIsBareSourceListing } from "./services/trust-contract.js";
import { resolveStagingFixture } from "./services/staging-trust-fixtures.js";
import {
  querySeeksSpecificAuthority,
  queryFramesAuthorityConflict,
  buildStructuredSourceFallbackAnswer,
  buildSourceFallbackDisclosureMeta
} from "./services/source-fallback-disclosure.js";
import { evaluateAnswerSupport, buildCalendarRelativeSafeAnswer } from "./services/answer-support-validator.js";
import { buildAnswerSupportEvidence } from "./services/answer-support-evidence.js";
import { derivePersistenceReceipt } from "./services/persistence-receipt.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { publicRuntimeIdentity } from "./services/runtime-identity.js";
import { detectTaxComputationClarification, buildTaxComputationClarification } from "./services/tax-computation-clarification.js";

// PHASE-10A14-R14 (P1-R13-IR-003): request-scoped persistence context. R13 set a public
// persistenceStatus on exactly ONE response path (the domain boundary), so 24 of 28 live
// records declared null. Rather than editing dozens of res.json call sites — which would
// silently miss any path not individually enumerated — the turn's acknowledged receipt is
// recorded here and injected by a single response wrapper installed in handleAsk.
// AsyncLocalStorage keeps this per-request and concurrency-safe.
const persistenceContext = new AsyncLocalStorage();

/** Record the acknowledged receipt for the in-flight request, if any. */
function recordPersistenceReceipt(receipt) {
  const store = persistenceContext.getStore();
  if (store) { store.receipt = receipt; store.attempted = true; }
}

/** Sanitized public receipt. Never carries DB errors, SQL, connection strings or credentials. */
function sanitizeReceipt(receipt) {
  return {
    attempted: Boolean(receipt.attempted),
    persisted: Boolean(receipt.persisted),
    userMessagePersisted: Boolean(receipt.userMessagePersisted),
    assistantMessagePersisted: Boolean(receipt.assistantMessagePersisted),
    memoryHookCompleted: Boolean(receipt.memoryHookCompleted),
    reasonCode: String(receipt.reasonCode || ""),
    safeDiagnostic: String(receipt.safeDiagnostic || receipt.status || "")
  };
}

/**
 * PHASE-10A14-R15 (P1-R14-IR-003) — CENTRAL PUBLIC PERSISTENCE FINALIZER.
 *
 * R14 injected persistence information only when `body.persistenceStatus == null`. The
 * domain-boundary branch pre-populates a status without a receipt, so the wrapper skipped
 * the body entirely and every boundary response declared PERSISTED with a null receipt.
 * The R15 pre-fix campaign reproduced this on 21 live responses, not merely the 8 sampled.
 * The guard conflated "status is absent" with "persistence declaration is absent".
 *
 * This finalizer runs UNCONDITIONALLY on every public JSON body. A branch cannot bypass it
 * by pre-populating a status. The request-scoped acknowledged receipt is the single source
 * of truth; a branch-supplied status that contradicts it, or a malformed/incomplete
 * declaration, is REPLACED.
 *
 * Invariants:
 *   - status is never null;
 *   - PERSISTED always carries a sanitized acknowledged receipt;
 *   - PERSISTED is impossible without an acknowledged receipt (never inferred from
 *     history equality, never from the presence of IDs);
 *   - a path that did not attempt persistence is never reported as PERSISTENCE_FAILED.
 *
 * Exported for direct test coverage of the exact adversarial cases.
 */
export function finalizePublicPersistence(body, store, conversationId, userId) {
  const receipt = store && store.receipt;
  const claimed = body.persistenceStatus;

  if (receipt && receipt.status) {
    // Acknowledged receipt exists: it is authoritative. A contradictory branch claim is
    // recorded (for evidence) and then overwritten with the truth.
    if (claimed && claimed !== receipt.status) {
      body.persistenceStatusClaimOverridden = claimed;
    }
    body.persistenceStatus = receipt.status;
    body.persistenceReceipt = sanitizeReceipt(receipt);
    return body;
  }

  // No acknowledged receipt for this request.
  // PERSISTED may never survive here: without an acknowledgement there is no evidence of
  // a write, and history equality is not acknowledgement.
  const truthfulStatus = !conversationId ? "NOT_PERSISTED_NO_CONVERSATION"
    : !userId ? "NOT_PERSISTED_NO_USER"
    : "NOT_PERSISTED_BY_POLICY";
  const reasonCode = !conversationId ? "MISSING_CONVERSATION_ID"
    : !userId ? "MISSING_USER_ID"
    : "NO_PERSISTENCE_ON_THIS_RESPONSE_PATH";

  if (claimed && claimed !== truthfulStatus) body.persistenceStatusClaimOverridden = claimed;
  body.persistenceStatus = truthfulStatus;
  // NOTE: derivePersistenceReceipt is deliberately NOT used for the no-attempt case —
  // with both IDs present and no row data it returns PERSISTENCE_FAILED, which would
  // assert that a save failed when none was ever attempted.
  body.persistenceReceipt = {
    attempted: false, persisted: false,
    userMessagePersisted: false, assistantMessagePersisted: false,
    memoryHookCompleted: false,
    reasonCode, safeDiagnostic: truthfulStatus
  };
  return body;
}

const ENGINE_VERSION = "9.0.0";

const EXIT_COMMANDS = ["/bye", "/exit", "/stop", "/quit", "/reset"];

const AUDIT_WELCOME_MESSAGE = `\
You are now in **/audit mode**.

This mode is specifically designed for **COMPLEX_ADVISORY** matters involving:

- BIR audit
- Letter of Authority (LOA)
- Notice for Informal Conference (NIC)
- Preliminary Assessment Notice (PAN)
- Final Assessment Notice / Formal Letter of Demand (FAN/FLD)
- Deficiency tax assessments
- Protest preparation
- Request for reconsideration
- Request for reinvestigation
- Tax exposure analysis
- Documentary evidence gaps
- Audit defense strategy
- CTA-preparation support
- Settlement or compromise evaluation

In this mode, TINA will act as a **senior Philippine tax controversy advisor, CPA-lawyer, BIR audit defense strategist, and Big 4-style tax advisory partner.**

You may ask questions such as:
- "I received an LOA. What should I check first?"
- "How do I respond to a PAN?"
- "What are the defenses against this deficiency VAT assessment?"
- "What documents should I prepare for BIR audit?"
- "Can this assessment be protested?"
- "What are the procedural defects in this BIR notice?"
- "What are the tax, legal, and accounting risks?"

TINA will answer in a **natural advisory format** — not a rigid template — unless you specifically ask for a formal memo, protest draft, board report, or legal opinion.

**Source-grounding:** TINA will prioritize indexed authorities, indexed jurisprudence, indexed BIR issuances, and indexed tax references before giving legal or tax conclusions.

**Anti-hallucination:** TINA will never invent provisions, cases, Revenue Regulations, RMCs, RMOs, RAMOs, or BIR rulings. If an authority is unavailable from indexed sources, TINA will say so explicitly.

---

To exit **/audit mode** and return to normal **/ask mode**, type: \`/bye\`, \`/quit\`, or \`/exit\`

_What is your audit or tax controversy matter?_\
`.trim();

const ALLOWED_HOOKS = [
  "/ask",
  "/quiz",
  "/review",
  "/case",
  "/source",
  "/tax",
  "/audit",
  "/debug",
  "/patch",
  "/diagnostic",
  "/progress",
  "/feedback"
];

const NORMAL_RAG_ROUTED_HOOKS = new Set([
  "/ask",
  "/tax",
  "/audit",
  "/debug",
  "/patch"
]);

const REVIEW_ROUTED_HOOKS = new Set([]);

const CASE_ROUTED_HOOKS = new Set([
  "/case"
]);

const SOURCE_ROUTED_HOOKS = new Set([
  "/source"
]);

const SPECIAL_ASSESSMENT_HOOKS = new Set([
  "/quiz",
  "/review",
  "/diagnostic"
]);

const RAG_ROUTED_HOOKS = new Set([
  ...NORMAL_RAG_ROUTED_HOOKS,
  ...CASE_ROUTED_HOOKS,
  ...SOURCE_ROUTED_HOOKS
]);

const DEFAULT_RETRIEVAL_LIMIT = 5;
const SIMPLE_RETRIEVAL_LIMIT = 3;
const SOURCE_MODE_RETRIEVAL_LIMIT = 8;
const CASE_MODE_RETRIEVAL_LIMIT = 8;
const REVIEW_MODE_RETRIEVAL_LIMIT = 6;
const AUDIT_MODE_RETRIEVAL_LIMIT = 8;
const DEBUG_PATCH_RETRIEVAL_LIMIT = 4;
const MAX_RETRIEVAL_LIMIT = 8;

const MAX_SOURCE_TEXT_CHARS_SIMPLE = 1200;
const MAX_SOURCE_TEXT_CHARS_STANDARD = 2200;
const MAX_SOURCE_TEXT_CHARS_REVIEW_MODE = 2400;
const MAX_SOURCE_TEXT_CHARS_CASE_MODE = 2600;
const MAX_SOURCE_TEXT_CHARS_SOURCE_MODE = 2800;
const MAX_SOURCE_TEXT_CHARS_AUDIT_MODE = 2600;

const QUERY_INTENT_TIMEOUT_MS = 8000;
const ISSUE_CLASSIFICATION_TIMEOUT_MS = 10000;
const RETRIEVAL_TIMEOUT_MS = 18000;
const RERANK_TIMEOUT_MS = 12000;
const RAG_TIMEOUT_MS = 90000;

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalizeText(value).toLowerCase();
}

function isExitCommand(value = "") {
  return EXIT_COMMANDS.includes(normalizeLower(value));
}

function normalizeHookCommand(value = "") {
  return normalizeLower(value).split(/\s+/)[0] || "";
}

function isAllowedHook(hookCode = "") {
  return ALLOWED_HOOKS.includes(normalizeLower(hookCode));
}

function isReviewRoutedHook(hookCode = "") {
  return REVIEW_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isCaseRoutedHook(hookCode = "") {
  return CASE_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isSourceRoutedHook(hookCode = "") {
  return SOURCE_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function isRagRoutedHook(hookCode = "") {
  return RAG_ROUTED_HOOKS.has(normalizeLower(hookCode));
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function compactString(value = "", maxChars = 2000) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function timeoutAfter(ms, label = "Operation") {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms.`)), ms);
  });
}

async function withTimeout(promise, ms, label) {
  return Promise.race([promise, timeoutAfter(ms, label)]);
}

function createRoutePipelineDiagnostics({
  requestId = "",
  route = "",
  model = "",
  budgetMs = RAG_TIMEOUT_MS
} = {}) {
  const requestStartedAt = Date.now();
  return {
    requestId,
    route,
    model,
    budgetMs,
    pipelineTimings: { requestStartedAt },
    pipelineStageDurations: {},
    partialPipelineState: {
      retrievalCompleted: false,
      classificationCompleted: false,
      generationStarted: false,
      generationCompleted: false,
      complianceStarted: false,
      complianceCompleted: false
    },
    openaiCalls: [],
    checkpoints: []
  };
}

function deriveInternalTimeoutType(diagnostics = {}) {
  const state = diagnostics.partialPipelineState || {};
  if (!state.classificationCompleted) return "ROUTE_PIPELINE_TIMEOUT";
  if (!diagnostics.pipelineTimings?.retrievalStartedAt) return "ROUTE_PIPELINE_TIMEOUT";
  if (diagnostics.pipelineTimings?.retrievalStartedAt && !state.retrievalCompleted) {
    return "RETRIEVAL_OPERATION_TIMEOUT";
  }
  if (state.retrievalCompleted && !state.generationCompleted) return "GENERATION_TIMEOUT";
  if (state.generationCompleted && !state.complianceCompleted) return "COMPLIANCE_TIMEOUT";
  if (state.complianceCompleted && !diagnostics.pipelineTimings?.renderingCompletedAt) return "RENDERING_TIMEOUT";
  return "UNKNOWN_PIPELINE_TIMEOUT";
}

function finalizeRouteDiagnostics(diagnostics = {}, timeout = false) {
  const now = Date.now();
  diagnostics.pipelineTimings = diagnostics.pipelineTimings || { requestStartedAt: now };
  diagnostics.pipelineTimings.responseCompletedAt = diagnostics.pipelineTimings.responseCompletedAt || now;
  const t = diagnostics.pipelineTimings;
  const dur = (a, b) =>
    Number.isFinite(t[a]) && Number.isFinite(t[b]) ? Math.max(0, t[b] - t[a]) : undefined;
  const durations = {
    classificationMs: dur("classificationStartedAt", "classificationCompletedAt"),
    retrievalMs: dur("retrievalStartedAt", "retrievalCompletedAt"),
    authorityResolutionMs: dur("authorityResolutionStartedAt", "authorityResolutionCompletedAt"),
    sourceSelectionMs: dur("sourceSelectionStartedAt", "sourceSelectionCompletedAt"),
    generationMs: dur("generationStartedAt", "generationCompletedAt"),
    complianceMs: dur("complianceStartedAt", "complianceCompletedAt"),
    renderingMs: dur("renderingStartedAt", "renderingCompletedAt"),
    totalMs: Number.isFinite(t.requestStartedAt) ? Math.max(0, t.responseCompletedAt - t.requestStartedAt) : undefined
  };
  diagnostics.pipelineStageDurations = Object.fromEntries(
    Object.entries(durations).filter(([, value]) => value !== undefined)
  );
  diagnostics.pipelineTimings.totalMs = diagnostics.pipelineStageDurations.totalMs;
  diagnostics.timeout = timeout;
  if (timeout) diagnostics.timeoutType = deriveInternalTimeoutType(diagnostics);
  return diagnostics;
}

function logRouteCheckpoint(diagnostics = {}, checkpoint, {
  route = "",
  mode = "",
  model = "",
  sourceAvailabilityStatus = "",
  retrievedCount = 0,
  displayedSourceCardCount = 0
} = {}) {
  const now = Date.now();
  const startedAt = diagnostics.pipelineTimings?.requestStartedAt || now;
  const elapsedMs = now - startedAt;
  const budgetMs = Number(diagnostics.budgetMs || RAG_TIMEOUT_MS);
  const entry = {
    checkpoint,
    requestId: diagnostics.requestId || "",
    elapsedMs,
    remainingBudgetMs: budgetMs - elapsedMs,
    model: model || diagnostics.model || "",
    mode,
    route: route || diagnostics.route || "",
    sourceAvailabilityStatus,
    retrievedCount,
    displayedSourceCardCount
  };
  diagnostics.checkpoints = diagnostics.checkpoints || [];
  diagnostics.checkpoints.push(entry);
  console.log("[ROUTE CHECKPOINT]", entry);
  return entry;
}

function isRoutePipelineTimeout(error = {}) {
  return /TINA 16-step pipeline timed out/i.test(error?.message || "");
}

function buildRouteTimeoutFallback({
  error = {},
  question = "",
  hookConfig = {},
  pipelineDiagnostics = null
} = {}) {
  const diagnostics = finalizeRouteDiagnostics(pipelineDiagnostics || {}, true);
  logRouteCheckpoint(diagnostics, "ROUTE_TIMEOUT_FIRED", {
    route: hookConfig.hook_code || "/ask",
    mode: hookConfig.mode || "ASK",
    model: diagnostics.model || "",
    sourceAvailabilityStatus: diagnostics.partialPipelineState?.sourceAvailabilityStatusBeforeTimeout || "RETRIEVAL_TIMEOUT",
    retrievedCount: diagnostics.partialPipelineState?.retrievedCount || 0,
    displayedSourceCardCount: diagnostics.partialPipelineState?.displayedSourceCardCount || 0
  });
  const hookCode = hookConfig.hook_code || "/ask";
  const mode = hookConfig.mode || "ASK";
  const responseMode = hookConfig.adaptiveResponseMode || mode;
  const orchestrationMode = hookConfig.orchestrationMode || responseMode;

  return {
    // PATCH-019A: timeout fallback answer passes the verified-authority gate
    // so a RETRIEVAL_TIMEOUT response can never carry legal citations.
    answer: applyVerifiedAuthorityGate({
      answer:
        "The retrieval or answer-generation pipeline timed out before TINA could complete a sourced answer. This does not mean that no law or authority exists. Please retry or narrow the question.",
      saeStatus: "RETRIEVAL_TIMEOUT",
      mode,
      route: hookCode
    }).answer,
    sources: [],
    sourcesUsed: [],
    sourceCards: [],
    issueClassification: {},
    sourceAvailability: "RETRIEVAL_TIMEOUT",
    saeStatus: "RETRIEVAL_TIMEOUT",
    sourceStatus: "RETRIEVAL_TIMEOUT",
    sourceAvailabilityReason:
      "The route-level pipeline timeout elapsed before sourced answer generation completed.",
    retrievalTimedOut: true,
    retrievedSourceCount: diagnostics.partialPipelineState?.retrievedCount || 0,
    displayedSourceCount: diagnostics.partialPipelineState?.displayedSourceCardCount || 0,
    relatedSourceCount: 0,
    retrievalLayerCounts: diagnostics.partialPipelineState?.retrievalLayerCounts || null,
    firstSourceLabels: diagnostics.partialPipelineState?.sourceLabelsBeforeTimeout || [],
    diagnostics,
    pipelineTimings: diagnostics.pipelineTimings,
    pipelineStageDurations: diagnostics.pipelineStageDurations,
    partialPipelineState: diagnostics.partialPipelineState,
    openaiCalls: diagnostics.openaiCalls,
    mode,
    responseMode,
    orchestrationMode,
    pipelineVersion: null,
    orchestration: {
      ragError: error?.message || "TINA 16-step pipeline timed out.",
      ragErrorName: error?.name || error?.constructor?.name || "Error",
      ragErrorStatus: error?.status,
      ragErrorCode: error?.code,
      routeTimeout: true,
      internalTimeoutType: diagnostics.timeoutType || "UNKNOWN_PIPELINE_TIMEOUT",
      timeoutMs: RAG_TIMEOUT_MS,
      selectedHook: hookCode,
      selectedMode: mode,
      responseMode,
      orchestrationMode,
      query: compactString(question, 500),
      sourceAvailability: "RETRIEVAL_TIMEOUT",
      saeStatus: "RETRIEVAL_TIMEOUT",
      sourceStatus: "RETRIEVAL_TIMEOUT",
      retrievalTimedOut: true,
      retrievalPreserved: diagnostics.partialPipelineState?.retrievalCompleted === true,
      fallbackAnswerUsed: true
    }
  };
}

// ── PATCH-018C: Internal pipeline errors are NOT Source Availability outcomes ──
// A non-timeout runPipeline() exception previously emitted
// saeStatus/sourceAvailability/sourceStatus = "RETRIEVAL_TIMEOUT", violating the
// Source Availability Contract (incorrect source state emitted). SAE statuses
// describe retrieval conditions only; software failures must be reported as
// PIPELINE_ERROR with null SAE fields. True retrieval timeouts still route to
// buildRouteTimeoutFallback() via isRoutePipelineTimeout() — unchanged.
function buildPipelineErrorFallback({
  error = {},
  question = "",
  hookConfig = {},
  pipelineDiagnostics = null
} = {}) {
  const diagnostics = finalizeRouteDiagnostics(pipelineDiagnostics || {}, false);
  const hookCode = hookConfig.hook_code || "/ask";
  const mode = hookConfig.mode || "ASK";
  const responseMode = hookConfig.adaptiveResponseMode || mode;
  const orchestrationMode = hookConfig.orchestrationMode || responseMode;
  const errorName = error?.name || error?.constructor?.name || "Error";

  // PATCH-019A: route-level unsafe-status answers pass the verified-authority
  // gate too, so no legal citation can ever ride out on a PIPELINE_ERROR.
  const gatedAnswer = applyVerifiedAuthorityGate({
    answer:
      "TINA encountered an internal pipeline error before it could complete a sourced answer. This does not mean that no law or authority exists. Please retry or narrow the question.",
    saeStatus: "PIPELINE_ERROR",
    mode,
    route: hookCode
  }).answer;

  console.error("[PATCH_018C_INTERNAL_PIPELINE_ERROR_NOT_SAE_TIMEOUT]", {
    query:                           compactString(question, 200),
    route:                           hookCode,
    errorName,
    errorMessage:                    compactString(error?.message || String(error), 300),
    errorCategory:                   "PIPELINE_ERROR",
    emittedSaeStatus:                null,
    emittedSourceAvailabilityStatus: null
  });

  return {
    answer: gatedAnswer,
    sources: [],
    sourcesUsed: [],
    sourceCards: [],
    issueClassification: {},
    internalError: true,
    errorCategory: "PIPELINE_ERROR",
    saeStatus: null,
    sourceAvailability: null,
    sourceAvailabilityStatus: null,
    // sourceStatus is the legacy mixed transport field (it already carries
    // non-SAE values like MODE_STATE_CLEARED / QUIZ_GROUNDED). PIPELINE_ERROR
    // here prevents the payload-level default from resurrecting
    // RETRIEVAL_TIMEOUT. It is not one of the reserved SAE statuses.
    sourceStatus: "PIPELINE_ERROR",
    sourceAvailabilityReason:
      "An internal pipeline error occurred before source availability could be classified. No SAE status was emitted.",
    retrievalTimedOut: false,
    retrievedSourceCount: diagnostics.partialPipelineState?.retrievedCount || 0,
    displayedSourceCount: 0,
    relatedSourceCount: 0,
    retrievalLayerCounts: null,
    firstSourceLabels: [],
    diagnostics,
    pipelineTimings: diagnostics.pipelineTimings,
    pipelineStageDurations: diagnostics.pipelineStageDurations,
    partialPipelineState: diagnostics.partialPipelineState,
    openaiCalls: diagnostics.openaiCalls,
    mode,
    responseMode,
    orchestrationMode,
    pipelineVersion: null,
    orchestration: {
      ragError: error?.message || String(error),
      ragErrorName: errorName,
      ragErrorStatus: error?.status,
      ragErrorCode: error?.code,
      routeTimeout: false,
      internalError: true,
      errorCategory: "PIPELINE_ERROR",
      internalTimeoutType: "PIPELINE_FALLBACK",
      timeoutMs: RAG_TIMEOUT_MS,
      selectedHook: hookCode,
      selectedMode: mode,
      responseMode,
      orchestrationMode,
      query: compactString(question, 500),
      sourceAvailability: null,
      saeStatus: null,
      sourceStatus: "PIPELINE_ERROR",
      retrievalTimedOut: false,
      retrievalPreserved: false,
      fallbackAnswerUsed: true
    }
  };
}

function getUserId(req) {
  return (
    req?.user?.id ||
    req?.user?.userId ||
    req?.user?.sub ||
    req?.auth?.userId ||
    req?.body?.userId ||
    null
  );
}

function getConversationId(req) {
  return (
    req?.body?.conversationId ||
    req?.body?.sessionId ||
    req?.headers?.["x-conversation-id"] ||
    null
  );
}

function getForcedHook(req) {
  const forced = req?.body?.forcedHook || req?.body?.hook || null;
  if (!forced) return null;

  const normalized = normalizeLower(forced);
  return isAllowedHook(normalized) ? normalized : null;
}

function detectExplicitSlashCommand(rawQuestion = "") {
  const firstWord = normalizeHookCommand(rawQuestion);
  return isAllowedHook(firstWord) ? firstWord : null;
}

function stripExplicitHook(rawQuestion = "", hookCode = "") {
  const text = normalizeText(rawQuestion);
  const hook = normalizeLower(hookCode);

  if (!hook || normalizeHookCommand(text) !== hook) return text;
  return text.slice(hook.length).trim();
}

function isSimpleDefinitionQuestion(question = "") {
  const q = normalizeLower(question);

  return (
    q.length <= 160 &&
    /^(what is|define|meaning of|ano ang|ano ibig sabihin ng)\b/i.test(q) &&
    !/\b(analyze|risk|audit|contract|jurisprudence|doctrine|conflict|case|legal consequence|assessment|substance|evidence|compare|reconcile|compute|calculate|explain|discuss|review|quiz|source)\b/i.test(q)
  );
}

function isComplexReasoningQuestion(question = "") {
  const q = normalizeLower(question);

  return /\b(analyze|evaluate|risk|audit|contract|jurisprudence|doctrine|conflict|legal basis|legal consequence|assessment|substance|evidence|compare|reconcile|position|defend|explain why|case law)\b/i.test(q);
}

function findFunction(moduleObject = {}, candidateNames = []) {
  for (const name of candidateNames) {
    if (typeof moduleObject[name] === "function") return moduleObject[name];
  }

  if (typeof moduleObject.default === "function") return moduleObject.default;

  if (moduleObject.default && typeof moduleObject.default === "object") {
    for (const name of candidateNames) {
      if (typeof moduleObject.default[name] === "function") {
        return moduleObject.default[name];
      }
    }
  }

  return null;
}

async function invokeFlexible(fn, positionalValue, objectValue) {
  try {
    return await fn(positionalValue, objectValue);
  } catch (firstError) {
    try {
      return await fn(objectValue);
    } catch {
      throw firstError;
    }
  }
}

function buildHardcodedHookConfig(hookCode = "/ask") {
  const hooks = {
    "/ask": {
      hook_code: "/ask",
      mode: "ASK",
      title: "Default TINA Assistant",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "STANDARD_TAX"
    },

    "/tax": {
      hook_code: "/tax",
      mode: "TAX_EXPERT",
      title: "Big 4 Tax Expert Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "TECHNICAL",
      orchestrationMode: "LEGAL_ANALYSIS"
    },

    "/audit": {
      hook_code: "/audit",
      mode: "AUDIT_MODE",
      title: "Audit / Evidence Evaluation Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "AUDIT",
      orchestrationMode: "COMPLEX_ADVISORY"
    },

    "/debug": {
      hook_code: "/debug",
      mode: "DEBUG_MODE",
      title: "Debugging Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "DEBUGGING",
      orchestrationMode: "DEBUGGING"
    },

    "/patch": {
      hook_code: "/patch",
      mode: "CODE_PATCH_MODE",
      title: "Code Patch Mode",
      routeKind: "NORMAL_RAG",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "CODE",
      orchestrationMode: "CODE_PATCH"
    },

    "/review": {
      hook_code: "/review",
      mode: "TAX_REVIEWER",
      title: "CPALE Tax Reviewer Mode",
      routeKind: "REVIEWER_ROUTE",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "REVIEWER",
      orchestrationMode: "REVIEWER"
    },

    "/quiz": {
      hook_code: "/quiz",
      mode: "QUIZ_MASTER",
      title: "Tax Quiz Mode",
      routeKind: "ASSESSMENT",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "QUIZ",
      orchestrationMode: "QUIZ"
    },

    "/case": {
      hook_code: "/case",
      mode: "CASE_ANALYSIS",
      title: "Jurisprudence and Case Analysis Mode",
      routeKind: "CASE_RAG",
      requires_retrieval: true,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "CASE_ANALYSIS",
      orchestrationMode: "CASE_ANALYSIS"
    },

    "/source": {
      hook_code: "/source",
      mode: "SOURCE_FINDER",
      title: "Source Finder Mode",
      routeKind: "SOURCE_RAG",
      requires_retrieval: true,
      requires_memory: false,
      requires_feedback: false,
      adaptiveResponseMode: "SOURCE",
      orchestrationMode: "SOURCE_LOOKUP",
      forceSourceVisibility: true
    },

    "/diagnostic": {
      hook_code: "/diagnostic",
      mode: "ADAPTIVE_QUIZ",
      title: "Adaptive CPALE Diagnostic Quiz",
      routeKind: "ASSESSMENT",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "QUIZ",
      orchestrationMode: "QUIZ"
    },

    "/progress": {
      hook_code: "/progress",
      mode: "LEARNING_PROGRESS",
      title: "Learning Progress Tracker",
      routeKind: "UTILITY",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: false,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "UTILITY"
    },

    "/feedback": {
      hook_code: "/feedback",
      mode: "FEEDBACK",
      title: "Feedback Mode",
      routeKind: "FEEDBACK",
      requires_retrieval: false,
      requires_memory: true,
      requires_feedback: true,
      adaptiveResponseMode: "STANDARD",
      orchestrationMode: "UTILITY"
    }
  };

  return hooks[hookCode] || hooks["/ask"];
}

function buildContextOrchestration(input = {}) {
  return {
    buildOpenAIContext: input.buildOpenAIContext || defaultBuildOpenAIContext,
    callOpenAIWithOrchestration:
      input.callOpenAIWithOrchestration || defaultCallOpenAIWithOrchestration
  };
}

function buildCompactExistingMode(existingMode = null) {
  if (!existingMode) return null;

  return {
    active_hook: existingMode.active_hook || null,
    active_mode: existingMode.active_mode || null,
    mode_title: existingMode.mode_title || null
  };
}

function buildCompactPendingQuiz(pendingQuiz = null) {
  if (!pendingQuiz) return false;

  return {
    exists: true,
    id: pendingQuiz.id || null,
    hook: pendingQuiz.hook || pendingQuiz.active_hook || null,
    status: pendingQuiz.status || null
  };
}

function buildCompactHookConfig(hookConfig = {}) {
  return {
    hook_code: hookConfig.hook_code || "/ask",
    mode: hookConfig.mode || "ASK",
    title: hookConfig.title || "Default TINA Assistant",
    routeKind: hookConfig.routeKind || "NORMAL_RAG",
    requires_retrieval: Boolean(hookConfig.requires_retrieval),
    requires_memory: Boolean(hookConfig.requires_memory),
    requires_feedback: Boolean(hookConfig.requires_feedback),
    adaptiveResponseMode: hookConfig.adaptiveResponseMode || "STANDARD",
    orchestrationMode: hookConfig.orchestrationMode || "STANDARD_TAX",
    forceSourceVisibility: Boolean(hookConfig.forceSourceVisibility),
    cleanQuestion: hookConfig.cleanQuestion || "",
    originalQuestion: hookConfig.originalQuestion || "",
    forcedHookApplied: Boolean(hookConfig.forcedHookApplied),
    explicitSlashCommandApplied: Boolean(hookConfig.explicitSlashCommandApplied),
    engineVersion: ENGINE_VERSION
  };
}

async function loadTaxHookConfig({ supabase, rawQuestion = "", forcedHook = null }) {
  const text = normalizeText(rawQuestion);
  const explicitHook = detectExplicitSlashCommand(text);

  let hookCode = "/ask";
  let cleanQuestion = text;

  // BUG-042: When forcedHook is the generic /ask default and the user explicitly
  // typed a slash command (e.g. /quiz), the explicit command must win.
  const forcedIsGenericDefault = forcedHook === "/ask";
  const explicitOverridesDefault = forcedIsGenericDefault && explicitHook && explicitHook !== "/ask";

  // Fuzzy resolution: fires when no exact command was found, text starts with /,
  // and forcedHook is absent or the generic /ask default (so that route-specific
  // forcedHooks like "/review" or "/quiz" are never overridden by fuzzy).
  // e.g., /quizz → /quiz, /revieu → /review, /sourc → /source
  let fuzzyHookResult = null;
  if (!explicitHook && (!forcedHook || forcedHook === "/ask")) {
    const firstWord = normalizeHookCommand(text);
    if (firstWord.startsWith("/")) {
      try {
        const candidate = resolveSlashCommand(firstWord);
        if (candidate.ok) fuzzyHookResult = candidate;
      } catch (err) {
        console.warn("[TINA ROUTE] Command resolver error (non-fatal):", err?.message);
      }
    }
  }
  const fuzzyHook = fuzzyHookResult?.commandKey || null;

  // A fuzzy-resolved command overrides the generic /ask default just as an explicit
  // command does. Route-specific forcedHooks (e.g. "/review") are never overridden.
  const fuzzyOverridesDefault = forcedIsGenericDefault && fuzzyHook && fuzzyHook !== "/ask";

  if (forcedHook && isAllowedHook(forcedHook) && !explicitOverridesDefault && !fuzzyOverridesDefault) {
    hookCode = forcedHook;
    cleanQuestion = stripExplicitHook(text, forcedHook);
  } else if (explicitHook) {
    hookCode = explicitHook;
    cleanQuestion = stripExplicitHook(text, explicitHook);
  } else if (fuzzyHook) {
    hookCode = fuzzyHook;
    // Strip the (misspelled) command prefix — everything after the first word is the payload
    cleanQuestion = text.replace(/^\S+\s*/, "").trim() || text;
  }

  console.log(`[TINA ROUTE] forcedHook=${forcedHook} explicitHook=${explicitHook} fuzzyHook=${fuzzyHook}(${fuzzyHookResult?.matchType || "-"}) resolved hookCode=${hookCode}`);

  const fallbackConfig = buildHardcodedHookConfig(hookCode);

  try {
    const { data, error } = await supabase
      .from("tina_tax_hooks")
      .select("*")
      .eq("hook_code", hookCode)
      .eq("status", "active")
      .maybeSingle();

    if (error) console.error("Hook config load error:", error.message);

    if (data) {
      return {
        ...fallbackConfig,
        hook_code: fallbackConfig.hook_code,
        mode: fallbackConfig.mode,
        routeKind: fallbackConfig.routeKind,
        requires_retrieval: fallbackConfig.requires_retrieval,
        requires_memory: data.requires_memory ?? fallbackConfig.requires_memory,
        requires_feedback: data.requires_feedback ?? fallbackConfig.requires_feedback,
        title: data.title || fallbackConfig.title,
        adaptiveResponseMode:
          data.adaptiveResponseMode ||
          data.adaptive_response_mode ||
          fallbackConfig.adaptiveResponseMode,
        orchestrationMode:
          data.orchestrationMode ||
          data.orchestration_mode ||
          fallbackConfig.orchestrationMode,
        forceSourceVisibility:
          fallbackConfig.forceSourceVisibility === true ||
          data.forceSourceVisibility === true ||
          data.force_source_visibility === true,
        cleanQuestion: cleanQuestion,
        originalQuestion: text,
        forcedHookApplied: Boolean(forcedHook),
        explicitSlashCommandApplied: Boolean(explicitHook),
        engineVersion: ENGINE_VERSION
      };
    }
  } catch (error) {
    console.error("Hook config fallback used:", error.message);
  }

  return {
    ...fallbackConfig,
    cleanQuestion: cleanQuestion,
    originalQuestion: text,
    forcedHookApplied: Boolean(forcedHook),
    explicitSlashCommandApplied: Boolean(explicitHook),
    engineVersion: ENGINE_VERSION
  };
}

function buildAdaptiveContextForHook({
  hookConfig,
  existingMode = null,
  pendingQuiz = null,
  contextOrchestrationEnabled = true
}) {
  const hookCode = hookConfig.hook_code;
  const mode = hookConfig.mode;
  const responseMode = hookConfig.adaptiveResponseMode || "STANDARD";
  const orchestrationMode = hookConfig.orchestrationMode || "STANDARD_TAX";

  return {
    askHandlerVersion: ENGINE_VERSION,

    activeHook: hookCode,
    activeMode: mode,
    routeKind: hookConfig.routeKind,

    existingMode: buildCompactExistingMode(existingMode),
    pendingQuiz: buildCompactPendingQuiz(pendingQuiz),

    adaptiveResponseMode: responseMode,
    responseMode,
    orchestrationMode,

    adaptiveMode: {
      primaryMode: mode,
      responseMode,
      orchestrationMode,
      sourceMode: hookCode === "/source",
      reviewerMode: hookCode === "/review",
      quizMode: hookCode === "/quiz",
      diagnosticMode: hookCode === "/diagnostic",
      caseMode: hookCode === "/case",
      taxExpertMode: hookCode === "/tax",
      seniorCounselMode: hookCode === "/tax",
      auditMode: hookCode === "/audit",
      debugMode: hookCode === "/debug",
      patchMode: hookCode === "/patch",
      progressMode: hookCode === "/progress",
      feedbackMode: hookCode === "/feedback",
      normalAskMode: hookCode === "/ask"
    },

    orchestration: {
      correctFlowEnabled: true,
      explicitSlashCommandInterception: true,
      queryIntentFirst: true,
      issueClassificationSecond: true,
      retrievalThird: true,
      rerankerFourth: true,
      ragFifth: true,
      contextOrchestrationFinal: true,
      contextOrchestrationEnabled: Boolean(contextOrchestrationEnabled),
      tpmConscious: true,
      compactContextOnly: true
    },

    responsePlan: {
      responseMode,
      orchestrationMode,

      responseDepth:
        hookCode === "/tax"
          ? "COMPREHENSIVE"
          : hookCode === "/audit"
            ? "AUDIT"
            : hookCode === "/source"
              ? "SOURCE_ONLY"
              : hookCode === "/review"
                ? "REVIEWER"
                : hookCode === "/case"
                  ? "CASE_ANALYSIS"
                  : hookCode === "/debug"
                    ? "DEBUGGING"
                    : hookCode === "/patch"
                      ? "CODE_PATCH"
                      : "STANDARD",

      mustUseRagPipeline: isRagRoutedHook(hookCode) || isReviewRoutedHook(hookCode),

      hookCode,
      hookMode: mode,
      routeKind: hookConfig.routeKind,

      requiresQuizMode: hookCode === "/quiz",
      requiresDiagnosticMode: hookCode === "/diagnostic",
      requiresReviewMode: hookCode === "/review",
      requiresSimpleDefinition: false,
      requiresSourceVisibility: hookCode === "/source",
      requiresCaseAnalysis: hookCode === "/case",
      requiresAuditMode: hookCode === "/audit",
      requiresSeniorCounselMemo: hookCode === "/tax",
      requiresDebuggingMode: hookCode === "/debug",
      requiresDebugMode: hookCode === "/debug",
      requiresCodePatch: hookCode === "/patch",
      requiresProgressMode: hookCode === "/progress",
      requiresFeedbackMode: hookCode === "/feedback",

      reviewerAnswerFormat:
        hookCode === "/review"
          ? ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"]
          : null,

      sourceOrderingPolicy: {
        useIssueClassificationMatch: true,
        useTargetAuthorityMatch: true,
        useControllingPrecedence: true,
        hideIssueMismatchedSources: false
      },

      conflictDisplayPolicy: {
        displayConflictYesOnlyWhenConflictTrue: true,
        requireCompleteConflictMetadata: true,
        requireSameIssueGate: true,
        requireOppositeHoldingGate: true
      },

      contextBudgetPolicy: {
        useContextOrchestrationEngine: true,
        preventRawFullDocumentInjection: true,
        preventFullDebugObjectInjection: true,
        preventFullEngineOutputInjection: true,
        compressSourcesBeforeOpenAI: true,
        finalTrimBeforeOpenAI: true,
        onlyPassCompactMetadata: true,
        maxVisibleSources: MAX_RETRIEVAL_LIMIT,
        tpmConscious: true
      }
    }
  };
}

function normalizeQueryIntentForHook(queryIntent = {}, hookConfig = {}) {
  const hookCode = hookConfig.hook_code;

  const forced = {
    responseMode:
      hookCode === "/review"
        ? "REVIEWER"
        : hookCode === "/quiz"
          ? "QUIZ"
          : hookCode === "/diagnostic"
            ? "QUIZ"
            : hookCode === "/tax"
              ? "SENIOR_COUNSEL_MEMO"
              : hookCode === "/case"
                ? "CASE_ANALYSIS"
                : hookCode === "/source"
                  ? "SOURCE"
                  : hookCode === "/audit"
                    ? "AUDIT"
                    : hookCode === "/debug"
                      ? "DEBUGGING"
                      : hookCode === "/patch"
                        ? "CODE"
                        : queryIntent.responseMode || hookConfig.adaptiveResponseMode || "STANDARD",

    orchestrationMode:
      hookCode === "/review"
        ? "REVIEWER"
        : hookCode === "/quiz"
          ? "QUIZ"
          : hookCode === "/diagnostic"
            ? "QUIZ"
            : hookCode === "/tax"
              ? "SENIOR_COUNSEL_MEMO"
              : hookCode === "/case"
                ? "CASE_ANALYSIS"
                : hookCode === "/source"
                  ? "SOURCE_LOOKUP"
                  : hookCode === "/audit"
                    ? "COMPLEX_ADVISORY"
                    : hookCode === "/debug"
                      ? "DEBUGGING"
                      : hookCode === "/patch"
                        ? "CODE_PATCH"
                        : queryIntent.orchestrationMode || hookConfig.orchestrationMode || "STANDARD_TAX",

    requiresQuizMode: hookCode === "/quiz" || Boolean(queryIntent.requiresQuizMode),
    requiresReviewMode: hookCode === "/review" || Boolean(queryIntent.requiresReviewMode),
    requiresSimpleDefinition: hookCode === "/ask" && Boolean(queryIntent.requiresSimpleDefinition),
    requiresSourceVisibility: hookCode === "/source" || Boolean(queryIntent.requiresSourceVisibility),
    requiresCaseMode: hookCode === "/case" || Boolean(queryIntent.requiresCaseMode),

    isNaturalConversation: Boolean(queryIntent.isNaturalConversation),
    isFollowUp: Boolean(queryIntent.isFollowUp)
  };

  return {
    ...safeObject(queryIntent),
    ...forced,

    commandMode:
      queryIntent.commandMode ||
      (
        hookCode === "/review"
          ? "REVIEW"
          : hookCode === "/quiz"
            ? "QUIZ"
            : hookCode === "/case"
              ? "CASE"
              : hookCode === "/source"
                ? "SOURCE"
                : hookCode === "/audit"
                  ? "AUDIT"
                  : hookCode === "/debug"
                    ? "DEBUG"
                    : hookCode === "/patch"
                      ? "PATCH"
                      : hookCode === "/progress"
                        ? "PROGRESS"
                        : hookCode === "/feedback"
                          ? "FEEDBACK"
                          : "ASK"
      ),

    primaryCommand:
      queryIntent.primaryCommand || hookCode.replace("/", ""),

    detectedCommands:
      safeArray(queryIntent.detectedCommands).length
        ? queryIntent.detectedCommands
        : [hookCode.replace("/", "")]
  };
}

// ─── DEAD CODE REMOVED (Law 1) ────────────────────────────────────────────────
// runQueryIntentEngine, runIssueClassificationEngine, runRetrievalEngine,
// runOptionalReranker, buildRagPipelineContext, buildRagOrchestrationIntent
// were removed. All engine calls now live exclusively in pipeline.js.
// ──────────────────────────────────────────────────────────────────────────────

async function runQueryIntentEngine_DEPRECATED({ question, hookConfig, adaptiveContext }) {
  const fn = findFunction({}, [
    "detectQueryIntent",
    "analyzeQueryIntent",
    "classifyQueryIntent",
    "runQueryIntentEngine",
    "queryIntentEngine",
    "detectIntent"
  ]);

  if (!fn) {
    return normalizeQueryIntentForHook({
      rawQuery: question,
      normalizedQuery: question,
      intentType: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true
    }, hookConfig);
  }

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
        question,
        query: question,
        userQuery: question,
        hookConfig,
        adaptiveContext,
        forcedHook: hookConfig.hook_code,
        command: hookConfig.hook_code
      }),
      QUERY_INTENT_TIMEOUT_MS,
      "Query intent engine"
    );

    return normalizeQueryIntentForHook(safeObject(result), hookConfig);
  } catch (error) {
    console.error("Query intent engine failed:", error.message);

    return normalizeQueryIntentForHook({
      rawQuery: question,
      normalizedQuery: question,
      intentType: "GENERAL_TAX_QUERY",
      requiresSimpleDefinition: isSimpleDefinitionQuestion(question),
      requiresLegalAnalysis:
        hookConfig.mode === "TAX_EXPERT" ||
        isComplexReasoningQuestion(question),
      routeHook: hookConfig.hook_code,
      routeMode: hookConfig.mode,
      fallbackIntentUsed: true,
      error: error.message
    }, hookConfig);
  }
}

function buildFallbackIssueClassification({ question = "", queryIntent = {}, hookConfig = {} } = {}) {
  const q = normalizeLower(question);

  let primaryIssue = "GENERAL_TAX";
  let subIssue = "GENERAL_TAX_QUERY";
  let targetAuthorities = ["NIRC", "RR", "RMC"];

  if (/\bvat\b|value[-\s]?added tax/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = isSimpleDefinitionQuestion(question) ? "VAT_DEFINITION" : "VAT_GENERAL_RULE";
    targetAuthorities = ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "RR 16-2005"];
  } else if (/\bzero[-\s]?rated|zero rating|0%\s*vat/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = "VAT_ZERO_RATING";
    targetAuthorities = ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"];
  } else if (/\binput tax|input vat|refund|tax credit certificate|tcc\b/i.test(q)) {
    primaryIssue = "VAT";
    subIssue = "VAT_INPUT_TAX_REFUND_CREDIT";
    targetAuthorities = ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"];
  } else if (/\bwithholding|ewt|cwt|fwt\b/i.test(q)) {
    primaryIssue = "WHT";
    subIssue = "WITHHOLDING_TAX";
    targetAuthorities = ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"];
  } else if (/\bincome tax|rcit|mcit|nolco\b/i.test(q)) {
    primaryIssue = "CIT";
    subIssue = "CORPORATE_INCOME_TAX";
    targetAuthorities = ["NIRC Sec. 27", "NIRC Sec. 34", "CREATE Act"];
  } else if (/\bcase|jurisprudence|supreme court|cta|g\.?\s*r\.?\s*no\b/i.test(q)) {
    primaryIssue = "CASE_LAW";
    subIssue = "JURISPRUDENCE_ANALYSIS";
    targetAuthorities = ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION"];
  }

  const simple = Boolean(queryIntent?.requiresSimpleDefinition || isSimpleDefinitionQuestion(question));

  const complex = Boolean(
    queryIntent?.requiresLegalAnalysis ||
    queryIntent?.needsJurisprudence ||
    queryIntent?.needsConflictAnalysis ||
    queryIntent?.needsFactPatternAnalysis ||
    isComplexReasoningQuestion(question) ||
    hookConfig.mode === "TAX_EXPERT" ||
    hookConfig.hook_code === "/case"
  );

  return {
    primaryIssue,
    subIssue,
    retrievalStrategy:
      hookConfig.hook_code === "/source"
        ? "SOURCE_FINDER_AUTHORITY_FIRST"
        : hookConfig.hook_code === "/case"
          ? "JURISPRUDENCE_CASE_AUTHORITY_FIRST"
          : simple
            ? "FAST_DEFINITION_PRIMARY_AUTHORITY"
            : complex
              ? "ISSUE_AUTHORITY_HIERARCHY_WITH_JURISPRUDENCE"
              : "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",

    targetAuthorities,

    responseMode:
      queryIntent.responseMode ||
      hookConfig.adaptiveResponseMode ||
      (simple ? "SIMPLE_DEFINITION" : complex ? "LEGAL_ANALYSIS" : "STANDARD"),

    orchestrationMode:
      queryIntent.orchestrationMode ||
      hookConfig.orchestrationMode ||
      (simple ? "FAST_DEFINITION" : complex ? "LEGAL_ANALYSIS" : "STANDARD_TAX"),

    complexity: simple ? "simple" : complex ? "complex" : "standard",
    fallbackClassificationUsed: true
  };
}

function normalizeIssueClassificationResult(result = {}, fallbackInput = {}) {
  const fallback = buildFallbackIssueClassification(fallbackInput);
  const source = result?.orchestrationClassification || result?.issueClassification || result?.classification || result || {};

  return {
    ...fallback,
    ...safeObject(source),

    primaryIssue:
      source.primaryIssue ||
      source.primary_issue ||
      source.domain ||
      source.domainCode ||
      fallback.primaryIssue,

    subIssue:
      source.subIssue ||
      source.sub_issue ||
      source.issueType ||
      fallback.subIssue,

    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      fallback.retrievalStrategy,

    targetAuthorities:
      safeArray(source.targetAuthorities || source.target_authorities || fallback.targetAuthorities),

    responseMode:
      source.responseMode ||
      source.response_mode ||
      fallback.responseMode,

    orchestrationMode:
      source.orchestrationMode ||
      source.orchestration_mode ||
      source.contextMode ||
      fallback.orchestrationMode,

    complexity: source.complexity || fallback.complexity
  };
}

async function runIssueClassificationEngine_DEPRECATED({ question, queryIntent, hookConfig, adaptiveContext }) {
  const fn = findFunction({}, [
    "classifyTaxIssue",
    "classifyIssue",
    "classifyQueryIssue",
    "runIssueClassification",
    "issueClassificationEngine",
    "classify"
  ]);

  if (!fn) return buildFallbackIssueClassification({ question, queryIntent, hookConfig });

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
        question,
        query: question,
        userQuery: question,
        queryIntent,
        intent: queryIntent,
        hookConfig,
        adaptiveContext
      }),
      ISSUE_CLASSIFICATION_TIMEOUT_MS,
      "Issue classification engine"
    );

    return normalizeIssueClassificationResult(result, { question, queryIntent, hookConfig });
  } catch (error) {
    console.error("Issue classification engine failed:", error.message);

    return {
      ...buildFallbackIssueClassification({ question, queryIntent, hookConfig }),
      classificationError: error.message
    };
  }
}

function getSourceTextLimit({ question, hookConfig, issueClassification, queryIntent }) {
  if (
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    queryIntent?.requiresSimpleDefinition ||
    isSimpleDefinitionQuestion(question)
  ) {
    return MAX_SOURCE_TEXT_CHARS_SIMPLE;
  }

  if (hookConfig?.hook_code === "/source") return MAX_SOURCE_TEXT_CHARS_SOURCE_MODE;
  if (hookConfig?.hook_code === "/case") return MAX_SOURCE_TEXT_CHARS_CASE_MODE;
  if (hookConfig?.hook_code === "/review") return MAX_SOURCE_TEXT_CHARS_REVIEW_MODE;
  if (hookConfig?.hook_code === "/audit") return MAX_SOURCE_TEXT_CHARS_AUDIT_MODE;

  return MAX_SOURCE_TEXT_CHARS_STANDARD;
}

function normalizeRetrievedSources(result = {}, context = {}) {
  const raw =
    result?.retrievedSources ||
    result?.sources ||
    result?.results ||
    result?.matches ||
    result?.documents ||
    result?.data ||
    [];

  const textLimit = getSourceTextLimit(context);

  return safeArray(raw)
    .map((source, index) => {
      const text =
        source.text ||
        source.content ||
        source.chunkText ||
        source.chunk_text ||
        source.excerpt ||
        source.preview ||
        source.pageContent ||
        source.summary ||
        "";

      return {
        ...safeObject(source),

        title:
          source.title ||
          source.sourceTitle ||
          source.source_title ||
          source.documentTitle ||
          source.document_title ||
          source.source ||
          source.path ||
          `Source ${index + 1}`,

        authorityType:
          source.authorityType ||
          source.authority_type ||
          source.type ||
          source.category ||
          source.metadata?.authorityType ||
          source.metadata?.authority_type ||
          "UNKNOWN",

        citation:
          source.citation ||
          source.reference ||
          source.normalizedReference ||
          source.normalized_reference ||
          source.url ||
          source.driveViewUrl ||
          "",

        url:
          source.url ||
          source.driveViewUrl ||
          source.drive_view_url ||
          source.sourceUrl ||
          "",

        text: compactString(text, textLimit),
        content: compactString(text, textLimit),

        score:
          Number(
            source.finalScore ??
              source.final_score ??
              source.rerankScore ??
              source.rerank_score ??
              source.retrievalScore ??
              source.retrieval_score ??
              source.score ??
              source.similarity ??
              0
          ) || 0,

        controllingPrecedence:
          Number(
            source.controllingPrecedence ??
              source.controlling_precedence ??
              source.authorityLevel ??
              source.authority_level ??
              99
          ) || 99,

        issueClassificationMatch:
          source.issueClassificationMatch ||
          source.issue_classification_match ||
          null,

        targetAuthorityMatch:
          source.targetAuthorityMatch === true ||
          source.target_authority_match === true ||
          source.issueClassificationMatch?.targetAuthorityMatch === true,

        issueMismatch:
          source.issueMismatch === true ||
          source.issue_mismatch === true ||
          source.issueClassificationMatch?.issueMismatch === true,

        superseded:
          source.superseded === true ||
          source.isSuperseded === true ||
          source.is_superseded === true,

        hidden:
          source.hidden === true ||
          source.isHidden === true ||
          source.is_hidden === true
      };
    })
    .filter((source) => source.text || source.content || source.title || source.citation);
}

function resolveRetrievalLimit({ question, hookConfig, issueClassification, queryIntent }) {
  if (hookConfig?.hook_code === "/source") return SOURCE_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/case") return CASE_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/review") return REVIEW_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/audit") return AUDIT_MODE_RETRIEVAL_LIMIT;
  if (hookConfig?.hook_code === "/debug" || hookConfig?.hook_code === "/patch") return DEBUG_PATCH_RETRIEVAL_LIMIT;

  if (
    issueClassification?.orchestrationMode === "FAST_DEFINITION" ||
    queryIntent?.requiresSimpleDefinition ||
    isSimpleDefinitionQuestion(question)
  ) {
    return SIMPLE_RETRIEVAL_LIMIT;
  }

  return DEFAULT_RETRIEVAL_LIMIT;
}

async function runRetrievalEngine({
  question,
  queryIntent,
  issueClassification,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  if (hookConfig.requires_retrieval === false) {
    return {
      retrievedSources: [],
      retrievalSkipped: true,
      retrievalEngineCalled: false,
      retrievalMetadata: {
        reason: "Route does not require retrieval."
      }
    };
  }

  const fn = findFunction({}, [
    "retrieveSources",
    "retrieveForQuestion",
    "runRetrieval",
    "runRetrievalEngine",
    "getRelevantSources",
    "searchRelevantSources",
    "retrievalEngine"
  ]);

  if (!fn) {
    return {
      retrievedSources: [],
      retrievalEngineMissing: true,
      retrievalMetadata: {
        reason: "No compatible retrieval function export found."
      }
    };
  }

  const limit = resolveRetrievalLimit({ question, hookConfig, issueClassification, queryIntent });

  try {
    const result = await withTimeout(
      invokeFlexible(fn, question, {
        question,
        query: question,
        userQuery: question,

        intent: queryIntent,
        queryIntent,

        issueClassification,
        primaryIssue: issueClassification.primaryIssue,
        subIssue: issueClassification.subIssue,
        retrievalStrategy: issueClassification.retrievalStrategy,
        targetAuthorities: issueClassification.targetAuthorities,

        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        requiresQuizMode: queryIntent.requiresQuizMode,
        requiresReviewMode: queryIntent.requiresReviewMode,
        requiresSimpleDefinition: queryIntent.requiresSimpleDefinition,
        requiresSourceVisibility: queryIntent.requiresSourceVisibility,
        isNaturalConversation: queryIntent.isNaturalConversation,
        isFollowUp: queryIntent.isFollowUp,

        hookConfig,
        adaptiveContext,
        supabase,

        forceSourceVisibility:
          hookConfig.forceSourceVisibility === true ||
          queryIntent.requiresSourceVisibility === true ||
          hookConfig.hook_code === "/source",

        caseMode: hookConfig.hook_code === "/case",
        reviewerMode: hookConfig.hook_code === "/review",
        auditMode: hookConfig.hook_code === "/audit",

        limit,
        maxResults: limit,
        maxSources: limit,
        tpmConscious: true
      }),
      RETRIEVAL_TIMEOUT_MS,
      "Retrieval engine"
    );

    const retrievedSources = normalizeRetrievedSources(result, {
      question,
      hookConfig,
      issueClassification,
      queryIntent
    });

    return {
      ...safeObject(result),
      retrievedSources,
      retrievalLimit: limit,
      retrievalEngineCalled: true,
      retrievalMetadata: {
        ...safeObject(result?.retrievalMetadata),
        ...safeObject(result?.retrievalMeta),
        sourceCount: retrievedSources.length
      }
    };
  } catch (error) {
    console.error("Retrieval engine failed:", error.message);

    return {
      retrievedSources: [],
      retrievalError: error.message,
      retrievalEngineCalled: true,
      retrievalLimit: limit,
      retrievalMetadata: {
        reason: "Retrieval engine failed or timed out.",
        sourceCount: 0
      }
    };
  }
}

async function runOptionalReranker({
  question,
  queryIntent,
  issueClassification,
  hookConfig,
  adaptiveContext,
  retrievalResult
}) {
  const retrievedSources = safeArray(retrievalResult?.retrievedSources);

  if (!retrievedSources.length) {
    return {
      rerankerCalled: false,
      rerankerSkipped: true,
      rerankedSources: retrievedSources,
      reason: "No retrieved sources to rerank."
    };
  }

  const fn = findFunction({}, [
    "rerankForTina",
    "rerankSources",
    "rerankRetrievedSources",
    "runReranker",
    "runRerankerEngine",
    "rerankerEngine"
  ]);

  if (!fn) {
    return {
      rerankerCalled: false,
      rerankerMissing: true,
      rerankedSources: retrievedSources,
      reason: "No compatible reranker export found."
    };
  }

  try {
    const result = await withTimeout(
      invokeFlexible(fn, {
        sources: retrievedSources,
        retrievedSources,
        query: question,
        question,
        issueClassification,
        queryIntent,
        adaptiveMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode,
        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        hookConfig,
        adaptiveContext
      }, {
        sources: retrievedSources,
        retrievedSources,
        query: question,
        question,
        issueClassification,
        queryIntent,
        adaptiveMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode,
        responseMode: queryIntent.responseMode,
        orchestrationMode: queryIntent.orchestrationMode,
        hookConfig,
        adaptiveContext
      }),
      RERANK_TIMEOUT_MS,
      "Reranker engine"
    );

    const rerankedSources =
      safeArray(result?.retrievedSources).length
        ? safeArray(result.retrievedSources)
        : safeArray(result?.sources).length
          ? safeArray(result.sources)
          : Array.isArray(result)
            ? result
            : retrievedSources;

    return {
      rerankerCalled: true,
      rerankedSources,
      rerankerMetadata: safeObject(result?.metadata || result?.rerankerMetadata)
    };
  } catch (error) {
    console.error("Reranker failed, using raw retrieved sources:", error.message);

    return {
      rerankerCalled: true,
      rerankerError: error.message,
      rerankedSources: retrievedSources
    };
  }
}

async function buildRagPipelineContext_DEPRECATED({
  question,
  hookConfig,
  adaptiveContext,
  supabase
}) {
  const queryIntent = await runQueryIntentEngine({ question, hookConfig, adaptiveContext });

  const issueClassification = await runIssueClassificationEngine({
    question,
    queryIntent,
    hookConfig,
    adaptiveContext
  });

  const retrievalResult = await runRetrievalEngine({
    question,
    queryIntent,
    issueClassification,
    hookConfig,
    adaptiveContext,
    supabase
  });

  const preRerankSources = safeArray(retrievalResult?.retrievedSources);

  const rerankerResult = await runOptionalReranker({
    question,
    queryIntent,
    issueClassification,
    hookConfig,
    adaptiveContext,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources: preRerankSources
    }
  });

  const retrievedSources = safeArray(rerankerResult.rerankedSources);

  return {
    queryIntent,
    issueClassification,
    retrievalResult: {
      ...safeObject(retrievalResult),
      retrievedSources,
      preRerankSources,
      rerankerMetadata: rerankerResult
    },
    retrievedSources,
    preRerankSources,
    rerankerResult
  };
}

function buildRagOrchestrationIntent_DEPRECATED({ queryIntent = {}, hookConfig = {}, pipeline = {} }) {
  return {
    ...safeObject(queryIntent),

    routeHook: hookConfig.hook_code,
    routeMode: hookConfig.mode,
    routeKind: hookConfig.routeKind,

    responseMode: queryIntent.responseMode || hookConfig.adaptiveResponseMode || "STANDARD",
    orchestrationMode: queryIntent.orchestrationMode || hookConfig.orchestrationMode || "STANDARD_TAX",

    requiresQuizMode: hookConfig.hook_code === "/quiz" || Boolean(queryIntent.requiresQuizMode),
    requiresReviewMode: hookConfig.hook_code === "/review" || Boolean(queryIntent.requiresReviewMode),
    requiresSimpleDefinition: Boolean(queryIntent.requiresSimpleDefinition),
    requiresSourceVisibility:
      hookConfig.hook_code === "/source" ||
      hookConfig.forceSourceVisibility === true ||
      Boolean(queryIntent.requiresSourceVisibility),
    requiresCaseMode: hookConfig.hook_code === "/case" || Boolean(queryIntent.requiresCaseMode),

    isNaturalConversation: Boolean(queryIntent.isNaturalConversation),
    isFollowUp: Boolean(queryIntent.isFollowUp),

    reviewerAnswerFormat:
      hookConfig.hook_code === "/review"
        ? ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"]
        : null,

    retrievedSourceCount: safeArray(pipeline.retrievedSources).length,
    tpmConscious: true
  };
}

function buildCompactOrchestrationMetadata(extra = {}) {
  return {
    askHandlerVersion: ENGINE_VERSION,
    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    slashCommandInterceptor: true,
    modeStatePreserver: true,
    retrievedSourcePreserver: true,
    queryIntentAwareDispatcher: true,

    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noLegalReasoningInsideAskHandler: true,
    noSourceRankingInsideAskHandler: true,
    noRenderingInsideAskHandler: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,

    correctFlowEnabled: true,
    queryIntentEngineCalled: Boolean(extra.queryIntentEngineCalled),
    issueClassificationEngineCalled: Boolean(extra.issueClassificationEngineCalled),
    retrievalEngineCalled: Boolean(extra.retrievalEngineCalled),
    rerankerEngineCalled: Boolean(extra.rerankerEngineCalled),

    contextOrchestrationEnabled: true,
    openAIContextBudgetingEnabled: true,
    finalTrimBeforeOpenAIEnabled: true,
    compressSourcesBeforeOpenAI: true,
    tpmConscious: true,

    routeHook: extra.routeHook || null,
    routeMode: extra.routeMode || null,
    routeKind: extra.routeKind || null,
    retrievalSourceCount: Number(extra.retrievalSourceCount || 0)
  };
}

export function createAskHandler({
  supabase,
  openai,
  contextOrchestration = null,
  openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAskHandler requires a valid Supabase client.");
  }

  if (!openai) throw new Error("createAskHandler requires OpenAI client.");

  const resolvedContextOrchestration = buildContextOrchestration(contextOrchestration || {});

  const assessmentHandler = createAssessmentHandler({
    supabase,
    openai,
    contextOrchestration: resolvedContextOrchestration,
    openaiModel
  });

  const learningHandler = createLearningHandler({
    supabase,
    openai,
    contextOrchestration: resolvedContextOrchestration,
    openaiModel
  });

  async function saveConversationTurn({
    conversationId,
    userId,
    question,
    answerText,
    sourcesUsed = [],
    fallbackReferences = [],
    trust = null
  }) {
    // PHASE-10A14-R13 (P1-R12-IR-003): return an ACKNOWLEDGED persistence receipt derived from
    // the actual saveMessage results (not from ID presence). Existing callers that ignore the
    // return value remain compatible; the domain-boundary path uses it to set persistenceStatus.
    if (!conversationId || !userId) {
      const missingIdReceipt = derivePersistenceReceipt({ conversationId, userId });
      recordPersistenceReceipt(missingIdReceipt);
      return missingIdReceipt;
    }
    let userMessageData = null, assistantMessageData = null, memoryHookOk = false, threw = false;
    try {
      userMessageData = await saveMessage(supabase, { conversationId, userId, role: "user", content: question });
      assistantMessageData = await saveMessage(supabase, {
        conversationId,
        userId,
        role: "assistant",
        content: answerText,
        sourcesUsed,
        fallbackReferences,
        trustMetadata: trust
      });
      try { await saveMemoryHooks(supabase, userId, extractMemoryHooks(question)); memoryHookOk = true; }
      catch (hookError) { console.warn("Memory-hook save skipped:", hookError.message); memoryHookOk = false; }
    } catch (error) {
      console.error("Conversation save failed:", error.message);
      threw = true;
    }
    const receipt = derivePersistenceReceipt({ conversationId, userId, userMessageData, assistantMessageData, memoryHookOk, threw });
    recordPersistenceReceipt(receipt);
    return receipt;
  }

  async function handleFeedback({ userId, conversationId, correction, feedbackType, originalAnswer, hookConfig }) {
    const cleanCorrection = normalizeText(correction);
    const cleanFeedbackType = normalizeText(feedbackType || "general_feedback");
    const cleanOriginalAnswer = normalizeText(originalAnswer);

    if (!cleanCorrection) {
      // Sticky mode: user sent plain text while in /feedback mode.
      // If there's a cleanQuestion (from sticky mode prepend), respond with a mode warning
      // rather than a 400 error — the user may have forgotten they're in feedback mode.
      const plainTextQuestion = normalizeText(hookConfig.cleanQuestion || "");
      if (plainTextQuestion) {
        const modeWarningAnswer = [
          "**You are currently in Feedback Mode.**",
          "",
          `Your message: _"${plainTextQuestion}"_`,
          "",
          "To submit feedback on a previous answer, include what needs to be corrected.",
          "",
          `To answer _"${plainTextQuestion}"_ normally, type:`,
          `> /ask ${plainTextQuestion}`,
          "",
          "To exit Feedback Mode, type **/bye** or **/reset**."
        ].join("\n");

        return {
          status: 200,
          body: {
            success: true,
            engine: "TINA Feedback Learning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            answer: modeWarningAnswer,
            answerMode: "feedback_mode_active_warning",
            sourceStatus: "FEEDBACK_MODE_ACTIVE",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0,
            askHandlerVersion: ENGINE_VERSION,
            contextOrchestrationEnabled: true
          }
        };
      }

      return {
        status: 400,
        body: {
          success: false,
          error: "Feedback correction is required.",
          hint: "Send { question, conversationId, correction, feedbackType, originalAnswer }",
          validFeedbackTypes: ["general_feedback", "factual_correction", "legal_correction", "citation_correction", "hallucination_report", "doctrinal_conflict", "evidence_gap", "rendering_issue", "mode_routing_issue", "tax_position_issue"]
        }
      };
    }

    const feedbackResult = await storeFeedbackEntry(supabase, {
      userId,
      sessionId: conversationId || null,
      conversationId: conversationId || null,
      originalQuestion: hookConfig.originalQuestion,
      originalAnswer: cleanOriginalAnswer,
      feedbackType: cleanFeedbackType,
      userCorrection: cleanCorrection,
      detectedMode: hookConfig.mode,
      adaptiveMode: hookConfig.mode,
      plannerMode: hookConfig.mode,
      metadata: {
        hookCode: hookConfig.hook_code,
        hookTitle: hookConfig.title,
        askHandlerVersion: ENGINE_VERSION,
        issueClassificationAware: true,
        contextOrchestrationAware: true,
        tpmConscious: true
      }
    });

    const answerText =
      "Feedback received and stored for review. Thank you. TINA will only learn from this after validation.";

    await saveConversationTurn({
      conversationId,
      userId,
      question: hookConfig.originalQuestion,
      answerText,
      sourcesUsed: [],
      fallbackReferences: []
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion,
      lastAnswer: answerText
    });

    return {
      status: 200,
      body: {
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
        originalQuestion: hookConfig.originalQuestion,
        resolvedQuestion: hookConfig.cleanQuestion,
        sourcesUsed: [],
        sources: [],
        vectorMatches: 0,
        askHandlerVersion: ENGINE_VERSION,
        contextOrchestrationEnabled: true
      }
    };
  }

  async function clearActiveMode({ userId, conversationId, existingMode }) {
    const activeHook = existingMode?.active_hook || "/ask";

    await clearModeState(supabase, userId, conversationId || null);
    await assessmentHandler.clearPendingQuizAttempts(userId, conversationId || null);

    if (activeHook === "/review") {
      console.log("[REVIEW EXIT]", {
        userId,
        sessionId: conversationId,
        previousDomain: existingMode?.adaptive_context?.learning?.domain || null
      });
    }

    let answerText = "Session ended. Thank you for using TINA. Type any question or a mode hook (e.g. /ask, /quiz, /review) to start a new session.";

    if (activeHook === "/quiz") answerText = "Quiz session ended. Your progress has been saved. Type /quiz to start a new quiz or /ask to continue with a regular question.";
    else if (activeHook === "/review") answerText = "You have exited /review mode and returned to normal /ask mode.";
    else if (activeHook === "/case") answerText = "Case analysis session ended. Type /case to start a new case analysis or /ask to continue with a regular question.";
    else if (activeHook === "/source") answerText = "Source finder session ended. Type /source to look up another source or /ask to continue with a regular question.";
    else if (activeHook === "/diagnostic") answerText = "Diagnostic session ended. Type /diagnostic to start a new diagnostic or /ask to continue with a regular question.";
    else if (activeHook === "/audit") answerText = "You have exited /audit mode and returned to normal /ask mode.";
    else if (activeHook !== "/ask") answerText = `${activeHook} session ended. Type /ask to continue with a regular question.`;

    return {
      success: true,
      engine: "TINA Mode State System",
      mode: "MODE_CLEARED",
      previousMode: activeHook,
      answer: answerText,
      sourceStatus: "MODE_STATE_CLEARED",
      sourcesUsed: [],
      sources: [],
      vectorMatches: 0,
      askHandlerVersion: ENGINE_VERSION,
      contextOrchestrationEnabled: true
    };
  }

  async function handleControlledRagRoute({
    res,
    userId,
    conversationId,
    hookConfig,
    adaptiveContext,
    orchestrationMetadata,
    isPhilippineTaxContext = false
  }) {
    const question = hookConfig.cleanQuestion || hookConfig.originalQuestion;

    // PHASE-10A2-RESTRICTED-LEGAL-CONCLUSION-TIMEOUT-GATE-REMEDIATION-1
    // Root cause: pipeline.js's Step 12.65/12.66 controlled-LOA gates run
    // AFTER Step 5 (retrieval) and Step 6 (reranker), inside the single
    // runPipeline() call that is raced against the 90s RAG_TIMEOUT_MS below.
    // For query shapes where retrieval/reranking is slow, the race can
    // reject with "TINA 16-step pipeline timed out" before runPipeline()
    // ever reaches Step 12.65/12.66, discarding whatever restricted-intent
    // classification it would have produced and substituting the generic
    // RETRIEVAL_TIMEOUT fallback instead (wrong response taxonomy, lost
    // requiresHumanReview / restricted trust metadata).
    //
    // Fix: evaluate the identical Step 12.66 classifier here, before
    // retrieval/generation/the timeout race begin, gated on the same
    // already-established Philippine-tax context signal (Invariant 8) so
    // isolated keywords in a context-free query can never trigger this.
    // On a match, `result` is set directly to the same deterministic
    // response shape Step 12.66 would have produced, and the code below
    // (payload construction, trust forwarding) runs completely unchanged --
    // no response-shape duplication. Step 12.66 itself is untouched and
    // remains defense in depth if this upstream check is ever bypassed.
    // Restricted to /ask only, and gated by the same existing
    // TINA_ENABLE_CONTROLLED_LOA_ASK_GATE flag Step 12.65/12.66 already use
    // (no new feature flag) -- identical scope/enablement to
    // evaluateControlledLoaAskGate/evaluateControlledLoaLegalConclusionSafetyGate
    // inside pipeline.js, so this upstream check never changes behavior for
    // /tax, /case, /audit, other non-/ask routes, or when the flag is off.
    const upstreamRestrictedGate = (hookConfig.hook_code === "/ask" && isControlledLoaAskGateEnabled())
      ? evaluateUpstreamRestrictedLegalConclusionGate({
          query: question,
          isPhilippineTax: isPhilippineTaxContext,
          // saeStatus explicitly set to NOT_APPLICABLE (not left undefined):
          // no retrieval was attempted for this deterministic response, and
          // the payload construction below defaults an unset sourceStatus to
          // the misleading string "RETRIEVAL_TIMEOUT" (its generic no-signal
          // fallback), which would falsely claim a timeout occurred here.
          ctx: { mode: hookConfig.mode, saeStatus: "NOT_APPLICABLE" }
        })
      : { matched: false, intentClassification: null, earlyExitResponse: null };
    if (upstreamRestrictedGate.matched) {
      console.log("[UPSTREAM RESTRICTED LEGAL CONCLUSION GATE]", {
        query: String(question || "").slice(0, 120),
        route: hookConfig.hook_code,
        intent: upstreamRestrictedGate.intentClassification?.intent || null
      });
    }

    const requestId = `route-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const pipelineDiagnostics = createRoutePipelineDiagnostics({
      requestId,
      route: hookConfig.hook_code,
      model: openaiModel,
      budgetMs: RAG_TIMEOUT_MS
    });

    // LAW 1: ask-handler calls ONLY pipeline.runPipeline(). No engine called here.
    // PHASE-10A2: when the upstream restricted gate above already matched,
    // `result` is the identical deterministic Step-12.66-shaped response --
    // runPipeline() (retrieval, reranking, generation, and the 90s timeout
    // race) is never invoked for this request.
    const priorMessages = (!upstreamRestrictedGate.matched && conversationId)
      ? await getHistory(supabase, conversationId, 20).catch(() => [])
      : [];
    let result;
    let latestPipelineDiagnostics = null;
    if (upstreamRestrictedGate.matched) {
      result = upstreamRestrictedGate.earlyExitResponse;
    } else {
    try {
      result = await withTimeout(
        runPipeline({
          query:   question,
          hook:    hookConfig.hook_code,
          supabase,
          openai,
          model:   openaiModel,
          conversationHistory: priorMessages,
          routeBudgetMs: RAG_TIMEOUT_MS,
          instrumentationReceiver: diagnostics => {
            latestPipelineDiagnostics = diagnostics;
          },
          pipelineDiagnostics,
          routeBudgetMs: RAG_TIMEOUT_MS,
          requestId
        }),
        RAG_TIMEOUT_MS,
        "TINA 16-step pipeline"
      );
    } catch (error) {
      const routeTimedOut = /timed out after/i.test(String(error?.message || ""));
      const partialState = latestPipelineDiagnostics?.partialPipelineState || {};
      const inferredTimeoutType =
        latestPipelineDiagnostics?.timeoutType ||
        (!partialState.classificationCompleted
          ? "CLASSIFICATION_TIMEOUT"
          : partialState.retrievalCompleted === false
            ? "RETRIEVAL_OPERATION_TIMEOUT"
            : partialState.generationStarted && !partialState.generationCompleted
              ? "GENERATION_TIMEOUT"
              : partialState.complianceStarted && !partialState.complianceCompleted
                ? "COMPLIANCE_TIMEOUT"
                : "ROUTE_PIPELINE_TIMEOUT");
      const timeoutDiagnostics = routeTimedOut
        ? {
            pipelineTimings: {},
            pipelineStageDurations: {},
            partialPipelineState: partialState,
            openaiCalls: [],
            ...(latestPipelineDiagnostics || {}),
            timeout: true,
            timeoutType: inferredTimeoutType,
            elapsedMs: latestPipelineDiagnostics?.elapsedMs ?? RAG_TIMEOUT_MS,
            budgetMs: latestPipelineDiagnostics?.budgetMs ?? RAG_TIMEOUT_MS
          }
        : null;
      if (routeTimedOut) {
        console.warn("[ROUTE_TIMEOUT_FIRED]", {
          elapsedMs: timeoutDiagnostics.elapsedMs,
          remainingBudgetMs: 0,
          budgetMs: timeoutDiagnostics.budgetMs,
          timeoutType: timeoutDiagnostics.timeoutType,
          partialPipelineState: timeoutDiagnostics.partialPipelineState || null
        });
      }
      console.error("Pipeline failed:", {
        name:    error?.name || error?.constructor?.name,
        message: error?.message,
        status:  error?.status,
        code:    error?.code,
        type:    error?.type,
        stack:   error?.stack?.split("\n").slice(0, 10).join("\n")
      });
      // PATCH-018C: non-timeout internal errors must not be classified as
      // RETRIEVAL_TIMEOUT (or any SAE status). True route timeouts keep the
      // existing buildRouteTimeoutFallback behavior unchanged.
      result = isRoutePipelineTimeout(error)
        ? buildRouteTimeoutFallback({ error, question, hookConfig, pipelineDiagnostics })
        : buildPipelineErrorFallback({ error, question, hookConfig, pipelineDiagnostics });
      result = {
        ...result,
        retrievedSourceCount: timeoutDiagnostics?.partialPipelineState?.retrievedCount ?? result.retrievedSourceCount ?? 0,
        displayedSourceCount: timeoutDiagnostics?.partialPipelineState?.displayedSourceCardCount ?? result.displayedSourceCount ?? 0,
        diagnostics: timeoutDiagnostics,
        orchestration: {
          ...safeObject(result.orchestration),
          timeout: routeTimedOut,
          timeoutType: timeoutDiagnostics?.timeoutType || null,
          diagnostics: timeoutDiagnostics
        }
      };
    }
    }

    const resultSources            = safeArray(result.sources || result.sourcesUsed);
    const resultSourceCards        = safeArray(result.sourceCards);
    const resultEducationalSources = result.educationalSources || null;

    // /source mode: full uncapped source explorer — do NOT restrict to sourceCards max-5.
    // All other modes: normalize all three fields to the deduped, authority-ranked, max-5
    // sourceCards array so the frontend never sees a duplicate raw source list.
    // Fallback: if sourceCards is unexpectedly empty but raw sources exist, build them.
    const isSourceMode =
      hookConfig.hook_code === "/source" ||
      hookConfig.forceSourceVisibility === true;

    // SOURCE_LOOKUP_EMPTY: pipeline determined no indexed source exists for /source.
    // Do NOT expose raw result.sources — the answer already says "Indexed source not found."
    // Returning raw chunks would contradict the deterministic no-source message.
    const _sourceLookupEmpty =
      result.sourceAvailability === "SOURCE_LOOKUP_EMPTY" ||
      result.sourceStatus === "SOURCE_LOOKUP_EMPTY";

    // When the pipeline applied the direct-support filter and intentionally produced
    // empty sourceCards, do NOT backfill from result.sources — those are also set to
    // finalSourceCards by pipeline.js and any backfill would reintroduce sources that
    // were deliberately excluded for not supporting the final answer.
    const _dsFiltered = Boolean(result.sourceCardsDirectSupportFiltered);

    const visibleSourcesRaw = _sourceLookupEmpty
      ? []                                                         // no raw exposure when no source found
      : isSourceMode
        ? resultSources                                            // /source with results: full array, uncapped
        : resultSourceCards.length > 0
          ? resultSourceCards                                      // normal: deduped max-5 cards
          : (!_dsFiltered && resultSources.length > 0)
            ? finalizeSourcesForResponse(resultSources, { maxItems: MAX_VISIBLE_SOURCES })
            : [];                                                   // no backfill when DS-filtered
    const visibleSources = sanitizePublicSourceCards(visibleSourcesRaw);
    const publicResultSourceCards = sanitizePublicSourceCards(resultSourceCards);

    // PHASE-10A6-R3-MISSING-AUTHORITY-CONFLICT-DISCLOSURE-REMEDIATION-1
    //
    // Structured explanatory fallback. PHASE-10A6-R1 stopped the SOURCE-mode
    // bare "Indexed sources found:" listing from being classified
    // VERIFIED_CONTROLLING; PHASE-10A6-R2 confirmed the remaining P1: the
    // answer BODY was still a bare source list that did not disclose that a
    // requested authority was not located and did not present the stated
    // conflict among authorities. When the rendered answer is a bare source
    // listing and sources are available, replace it with a substantive body
    // that discloses the missing requested authority (if any), presents the
    // competing/uncertain authorities, and explains the governing hierarchy.
    // A structured `sourceOnlyFallback` boolean is threaded onto `result` so
    // the trust contract keeps this response at RELATED_AUTHORITY_ONLY even
    // though the enriched body is no longer a bare listing (it must never
    // regress to VERIFIED_CONTROLLING). No fabricated facts or conclusions.
    let sourceFallbackDisclosure = null;
    if (answerIsBareSourceListing(result.answer) && visibleSources.length > 0) {
      const _fallbackQuery = typeof question === "string" ? question : "";
      const _specificAuthorityRequested = querySeeksSpecificAuthority(_fallbackQuery);
      const _authorityConflictFramed = queryFramesAuthorityConflict(_fallbackQuery);
      result.answer = buildStructuredSourceFallbackAnswer({
        sources: visibleSources,
        specificAuthorityRequested: _specificAuthorityRequested,
        conflictFramed: _authorityConflictFramed
      });
      // Structured signal read by the trust contract (input side) so this
      // response stays RELATED_AUTHORITY_ONLY even though the enriched body is
      // no longer a bare listing. Must never regress to VERIFIED_CONTROLLING.
      result.sourceOnlyFallback = true;
      result.specificAuthorityRequested = _specificAuthorityRequested;
      result.requestedAuthorityMatched = false;
      result.authorityConflictFramed = _authorityConflictFramed;
      // Additive payload-level disclosure metadata (kept off the frozen trust
      // contract shape). Persistence/reopen and the frontend can read it.
      sourceFallbackDisclosure = buildSourceFallbackDisclosureMeta({
        sourceOnlyFallback: true,
        specificAuthorityRequested: _specificAuthorityRequested,
        conflictFramed: _authorityConflictFramed
      });
    }

    console.log("TINA MODE DOWNSTREAM DEBUG:", {
      responseMode: result.responseMode || result.orchestration?.mode || hookConfig.mode,
      orchestrationMode: result.orchestrationMode || result.orchestration?.mode || hookConfig.mode,
      commandMode: hookConfig.mode,
      isSourceMode,
      retrievedSourceCount: resultSources.length,
      sourceCardCount: resultSourceCards.length,
      visibleSourceCount: visibleSources.length,
      finalComplianceApplied: Boolean(result.answer),
      rendererMode: result.mode || hookConfig.mode
    });

    const responseSourceStatus = result.sourceStatus || result.sourceAvailability ||
      (result.internalError === true
        ? "PIPELINE_ERROR"
        : resultSources.length ? "ISSUE_MATCHED_CONTEXT_USED" : "RETRIEVAL_TIMEOUT");

    // PHASE-10A8-TRUST-CALIBRATION-AND-ANSWER-CORRECTNESS-REMEDIATION-1
    //
    // Answer-support gate. VERIFIED_CONTROLLING must depend on the final answer
    // being substantive, responsive, correct, materially complete, and actually
    // supported -- not merely on retrieval/source presence (the systemic
    // PHASE-10A7 defect). Only the verified-CANDIDATE responses need validation:
    // AUTHORITY_FOUND with displayed sources, not the structured source-only
    // fallback, and not a controlled procedural / restricted / domain-boundary
    // response (those never reach VERIFIED_CONTROLLING). The controlled
    // validator runs a deterministic structural gate plus a constrained
    // post-generation evaluator and fails CLOSED on any error/unavailability.
    // The trust contract reads result.answerSupport.verifiedEligible.
    const _verifiedCandidate =
      String(responseSourceStatus).toUpperCase() === "AUTHORITY_FOUND" &&
      visibleSources.length > 0 &&
      result.sourceOnlyFallback !== true &&
      result.domainBoundary !== true &&
      result.responseType !== "controlled_loa_answer" &&
      result.responseType !== "controlled_loa_legal_conclusion_restricted";
    if (_verifiedCandidate) {
      // PHASE-10A14-R20 COMMIT 5R1-C35 Candidate 2: proposition support is
      // evaluated against a private, bounded packet that joins the FINAL
      // displayed authority identities to exact retrieved passages. Public
      // source cards remain sanitized and unchanged; unmatched displayed
      // authorities stay explicit in the private packet and fail closed.
      const _answerSupportEvidence = buildAnswerSupportEvidence({
        displayedSources: visibleSources,
        retrievedSources: resultSources
      });
      result.answerSupport = await evaluateAnswerSupport({
        question: typeof question === "string" ? question : "",
        answer: result.answer || "",
        sources: _answerSupportEvidence
      });
      // PHASE-10A14-R10 (P1-R9-IR-001 / WS2/WS3/WS6): a deterministically unsupported
      // calendar-relative filing-deadline conclusion must be REPLACED entirely — not merely
      // annotated. Prepending a note while retaining the unsafe answer left the false
      // "today is the last day / due today" text visible in the public answer, persistence
      // and history. Here the public answer is swapped for a dedicated deterministic safe
      // response; the rejected model output is kept only in an internal, non-public field.
      // Because the payload's `answer` and the persisted `answerText` both read `result.answer`,
      // this single replacement propagates to the API answer, persistence and history read-back.
      if (result.answerSupport && result.answerSupport.stage === "calendar-relative-deadline") {
        result.rejectedModelAnswer = result.answer || "";
        result.calendarRelativeReplaced = true;
        // PHASE-10A14-R11 (WS6): contextualize the replacement by the question's temporal
        // reference (today/tomorrow/yesterday/already-late/still-on-time) and the detected clause.
        const relRef = result.answerSupport.calendarRelative && result.answerSupport.calendarRelative.relRef;
        result.answer = buildCalendarRelativeSafeAnswer(
          visibleSources,
          typeof question === "string" ? question : "",
          relRef || null
        );
      }
    }

    const payload = {
      success: true,
      engine: "TINA_ASK_HANDLER",
      version: ENGINE_VERSION,
      hook: hookConfig.hook_code,
      mode: result.mode || hookConfig.mode,
      routeKind: hookConfig.routeKind,
      hookTitle: hookConfig.title,

      answer: result.answer || "",

      sources: visibleSources,
      sourcesUsed: visibleSources,
      sourceCards: _sourceLookupEmpty ? [] : (isSourceMode ? publicResultSourceCards : visibleSources),
      educationalSources:  resultEducationalSources,
      vectorMatches: result.retrievedSourceCount ?? resultSources.length,

      ...(result.responseType ? { responseType: result.responseType } : {}),
      ...(result.structuredClarificationObject
        ? { structuredClarificationObject: result.structuredClarificationObject }
        : {}),
      ...(result.clarificationRouteGate
        ? { clarificationRouteGate: result.clarificationRouteGate }
        : {}),

      trust: buildResponseTrust(
        result,
        result.displayedSourceCount ?? visibleSources.length,
        responseSourceStatus
      ),

      // PHASE-10A6-R3: additive structured disclosure metadata for the
      // source-only fallback path (null on all other paths). Kept off the
      // frozen canonical trust contract shape.
      ...(sourceFallbackDisclosure ? { sourceFallbackDisclosure } : {}),

      // PHASE-10A8: additive answer-support attestation (present only for
      // verified-candidate responses). Kept off the frozen trust contract shape.
      ...(result.answerSupport ? { answerSupport: result.answerSupport } : {}),

      retrievedSourceCount: result.retrievedSourceCount ?? resultSources.length,
      displayedSourceCount: result.displayedSourceCount ?? visibleSources.length,

      // PATCH-018C: internal errors must never default into RETRIEVAL_TIMEOUT.
      sourceStatus:             responseSourceStatus,
      sourceAvailability:       result.sourceAvailability        || null,
      saeStatus:                result.saeStatus                 ?? null,
      patch024cPostSourcecard:  result.patch024cPostSourcecard   || null,
      internalError:            result.internalError === true,
      errorCategory:            result.errorCategory             || null,
      sourceAvailabilityReason: result.sourceAvailabilityReason  || null,
      retrievalTimedOut:        result.retrievalTimedOut === true,
      relatedSourceCount:       result.relatedSourceCount        ?? 0,
      retrievalLayerCounts:     result.retrievalLayerCounts      || null,
      firstSourceLabels:        result.firstSourceLabels         || [],
      diagnostics:              result.diagnostics               || null,
      pipelineTimings:          result.pipelineTimings           || result.diagnostics?.pipelineTimings || null,
      pipelineStageDurations:   result.pipelineStageDurations    || result.diagnostics?.pipelineStageDurations || null,
      partialPipelineState:     result.partialPipelineState      || result.diagnostics?.partialPipelineState || null,
      openaiCalls:              result.openaiCalls               || result.diagnostics?.openaiCalls || [],

      responseMode: result.responseMode || result.orchestration?.mode || hookConfig.mode,
      orchestrationMode: result.orchestrationMode || result.orchestration?.mode || hookConfig.mode,
      pipelineVersion: result.pipelineVersion,
      diagnostics: result.diagnostics || result.orchestration?.diagnostics || null,

      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      commandMode: hookConfig.mode,
      requiresQuizMode: hookConfig.hook_code === "/quiz",
      requiresDiagnosticMode: hookConfig.hook_code === "/diagnostic",
      requiresReviewMode: hookConfig.hook_code === "/review",
      requiresSourceVisibility: hookConfig.hook_code === "/source" || Boolean(hookConfig.forceSourceVisibility),
      requiresCaseAnalysis: hookConfig.hook_code === "/case",
      requiresAuditMode: hookConfig.hook_code === "/audit",
      requiresSeniorCounselMemo: hookConfig.hook_code === "/tax",
      requiresDebugMode: hookConfig.hook_code === "/debug",
      requiresCodePatch: hookConfig.hook_code === "/patch",
      requiresProgressMode: hookConfig.hook_code === "/progress",
      requiresFeedbackMode: hookConfig.hook_code === "/feedback",

      metadata: {
        ...safeObject(result.orchestration),
        openAiModel: safeObject(result.orchestration).openAiModel || openaiModel,
        openAiProjectAccessFailure: Boolean(safeObject(result.orchestration).openAiProjectAccessFailure),
        diagnostics: result.diagnostics || result.orchestration?.diagnostics || null,
        askHandlerVersion: ENGINE_VERSION,
        pipelineSupremacy: true,
        pipelineVersion: result.pipelineVersion,
        correctFlowEnabled: true,
        issueClassificationEngineCalled: true,
        retrievalEngineCalled: true,
        rerankerEngineCalled: true,
        fourPartDoctrineTestApplied: true,
        retrievalLayerCounts: result.retrievalLayerCounts || null,
        firstSourceLabels:    result.firstSourceLabels    || [],
        diagnostics:          result.diagnostics           || null,
        pipelineTimings:      result.pipelineTimings       || result.diagnostics?.pipelineTimings || null,
        pipelineStageDurations: result.pipelineStageDurations || result.diagnostics?.pipelineStageDurations || null,
        partialPipelineState: result.partialPipelineState  || result.diagnostics?.partialPipelineState || null,
        openaiCalls:          result.openaiCalls           || result.diagnostics?.openaiCalls || [],
        routeControllerOnly: true,
        noLegalReasoningInsideAskHandler: true,
        noSourceRankingInsideAskHandler: true,
        noRenderingInsideAskHandler: true,
        orchestrationFirstArchitecture: true,
        noDirectOpenAICall: true,
        noPromptAssembly: true,
        tpmConscious: true
      }
    };

    await saveConversationTurn({
      conversationId,
      userId,
      question: hookConfig.originalQuestion,
      answerText: payload.answer,
      sourcesUsed: payload.sourcesUsed,
      fallbackReferences: [],
      trust: payload.trust
    });

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: hookConfig.hook_code,
      activeMode: hookConfig.mode,
      modeTitle: hookConfig.title,
      lastQuestion: hookConfig.originalQuestion,
      lastAnswer: payload.answer
    });

    return res.json(payload);
  }

  return async function handleAsk(req, res) {
    // ── PHASE-10A14-R14 (P1-R13-IR-003) — universal public persistenceStatus ──────
    // Every ordinary public ask response must declare a truthful, non-null
    // persistenceStatus. The status is derived ONLY from an acknowledged receipt or
    // from an explicit non-persistence rule — never inferred from a later history
    // lookup, and never from the mere presence of IDs.
    const _persistenceStore = { receipt: null, attempted: false };
    const _rawJson = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        finalizePublicPersistence(body, _persistenceStore, getConversationId(req), getUserId(req));
        // PHASE-10A14-R15 (P2-R14-IR-009) — server-reported runtime identity.
        // Exposed ONLY on an authenticated request that explicitly asks for it via the
        // diagnostics header, so ordinary users never receive it. This deliberately does
        // NOT touch public /health: PATCH-08S-FOLLOWUP minimized that endpoint and lists
        // commitSha as a forbidden public field, enforced by a staging smoke test.
        try {
          const wantsIdentity = String(req.headers?.["x-tina-runtime-identity"] || "") === "1";
          if (wantsIdentity) {
            const id = publicRuntimeIdentity();
            body.runtimeIdentity = {
              runtimeCommit: id.runtimeCommit,
              runtimeCommitSource: id.runtimeCommitSource,
              deploymentId: id.deploymentId,
              service: id.service
            };
          }
        } catch { /* identity is diagnostic only and must never break a response */ }
      }
      return _rawJson(body);
    };
    return persistenceContext.run(_persistenceStore, async () => {
    try {
      const { question, correction, feedbackType, originalAnswer } = req.body || {};
      const userId = getUserId(req);
      const conversationId = getConversationId(req);
      const forcedHook = getForcedHook(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID not found in token. Cannot proceed."
        });
      }

      // PHASE-10A4C-TRUST-CALIBRATION-CONFLICT-STATE-ACCESSIBILITY-KEYBOARD-AND-DETERMINISTIC-FIXTURE-REMEDIATION-1
      //
      // Deterministic, staging-only trust-state fixture short-circuit for
      // representative authenticated-browser rendered validation. Resolves
      // to null (fails closed) on any non-staging runtime or unrecognized
      // fixtureId -- see services/staging-trust-fixtures.js for the fixed,
      // closed fixture registry and full security posture. Runs AFTER
      // authentication (userId already validated above), so no new auth
      // bypass is introduced. Never calls retrieval or an LLM; never
      // mutates any data beyond the same conversation-message persistence
      // every other /ask response already writes for the caller's own
      // conversation.
      const fixture = resolveStagingFixture(req.body?.fixtureId);
      if (fixture) {
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          const created = await createConversation(supabase, { userId, title: "Fixture validation" });
          activeConversationId = created?.id;
        }

        const fixtureTrust = buildResponseTrust(fixture, fixture.displayedSourceCount, fixture.sourceStatus);
        const fixtureQuestion = `[fixture:${fixture.fixtureId}]`;

        await saveConversationTurn({
          conversationId: activeConversationId,
          userId,
          question: fixtureQuestion,
          answerText: fixture.answer,
          sourcesUsed: fixture.sourceCards,
          fallbackReferences: [],
          trust: fixtureTrust
        });

        return res.json({
          success: true,
          engine: "TINA_ASK_HANDLER",
          version: ENGINE_VERSION,
          hook: "/ask",
          mode: "fixture",
          fixtureId: fixture.fixtureId,
          answer: fixture.answer,
          sources: fixture.sourceCards,
          sourcesUsed: fixture.sourceCards,
          sourceCards: fixture.sourceCards,
          educationalSources: null,
          vectorMatches: fixture.sourceCards.length,
          trust: fixtureTrust,
          retrievedSourceCount: fixture.sourceCards.length,
          displayedSourceCount: fixture.displayedSourceCount,
          conversationId: activeConversationId,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      const rawQuestion = normalizeText(question);

      if (!rawQuestion) {
        return res.status(400).json({
          success: false,
          error: "Question required"
        });
      }

      const existingMode = await getModeState(supabase, userId, conversationId || null);

      if (isExitCommand(rawQuestion)) {
        return res.json(await clearActiveMode({ userId, conversationId, existingMode }));
      }

      const explicitHook = detectExplicitSlashCommand(rawQuestion);
      const activeHook = existingMode?.active_hook || null;
      const hasActiveAssessmentMode = assessmentHandler.isAssessmentHook(activeHook);

      // /reveal — shows hidden self-check answer stored by /review generation.
      // Must run before MODE SESSION LOCK so "/reveal" is not rejected as a foreign command.
      if (/^(?:\/)?reveal\s*$/i.test(rawQuestion.trim()) && activeHook === "/review") {
        const reviewReveal = existingMode?.adaptive_context?.learning?.reviewReveal;
        const hiddenContent = reviewReveal?.hiddenContent || "";

        if (!hiddenContent) {
          return res.json({
            success: false,
            engine: "TINA_ASK_HANDLER",
            mode: "REVIEW_REVEAL",
            answer: "No hidden review answer is available yet. Start with `/review [topic]`.",
            sourceStatus: "REVIEW_REVEAL",
            sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0,
            askHandlerVersion: ENGINE_VERSION,
            contextOrchestrationEnabled: true
          });
        }

        // Mark revealed:true in state (fire-and-forget — non-blocking)
        if (reviewReveal && !reviewReveal.revealed) {
          const updatedLearning = {
            ...existingMode.adaptive_context.learning,
            reviewReveal: { ...reviewReveal, revealed: true }
          };
          saveModeState(supabase, {
            userId,
            sessionId: conversationId || null,
            activeHook: existingMode.active_hook,
            activeMode: existingMode.active_mode,
            modeTitle: existingMode.mode_title || "",
            lastQuestion: rawQuestion,
            lastAnswer: hiddenContent,
            adaptiveContext: { learning: updatedLearning }
          }).catch(err => console.warn("[REVIEW_REVEAL] saveModeState failed:", err?.message));
        }

        return res.json({
          success: true,
          engine: "TINA_ASK_HANDLER",
          mode: "REVIEW_REVEAL",
          answer: hiddenContent,
          sourceStatus: "REVIEW_REVEAL",
          sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      // MODE SESSION LOCK — prevent switching to a different slash command while in /quiz.
      // /review intentionally does not lock explicit commands — the user may switch to
      // /ask, /quiz, or another hook directly without needing /bye first.
      if (
        activeHook === "/quiz" &&
        explicitHook &&
        explicitHook !== activeHook
      ) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const modeLabel = activeHook === "/quiz" ? "Quiz" : "Reviewer";
        const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "MODE_SESSION_LOCKED",
          hook: activeHook,
          answer: `You are currently in ${modeLabel} Mode${domainSuffix}. Type /bye, /exit, or /quit first before switching modes.`,
          sourceStatus: "MODE_SESSION_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      const pendingQuiz = await assessmentHandler.fetchLatestPendingQuiz(userId, conversationId || null);

      if (pendingQuiz && !hasActiveAssessmentMode) {
        await assessmentHandler.clearPendingQuizAttempts(userId, conversationId || null);
      }

      // ── QUIZ SELECTION GATE ───────────────────────────────────────────────────
      // When /quiz is active but no quiz question has been stored yet (i.e., the
      // domain-selection menu was shown and the user has not yet chosen a domain),
      // only "/quiz <domain>" commands and exit commands may proceed.
      //
      // Without this gate, requests arriving via the /ask endpoint (forcedHook="/ask")
      // bypass the sticky-mode prepend and fall through to the normal RAG pipeline.
      //
      // Condition: activeHook === "/quiz" AND pendingQuiz is null (no stored question)
      //            AND the learning context has no domain yet.
      if (
        activeHook === "/quiz" &&
        !pendingQuiz &&
        !isExitCommand(rawQuestion)
      ) {
        const quizLearningDomain =
          existingMode?.adaptive_context?.learning?.domain || null;

        if (!quizLearningDomain) {
          const lowerInput = normalizeLower(rawQuestion);
          // Valid domain commands must start with "/quiz " (e.g., "/quiz VAT")
          // or be exactly "/quiz" (re-show the menu).
          const isValidDomainCommand =
            lowerInput.startsWith("/quiz ") || lowerInput === "/quiz";

          if (!isValidDomainCommand) {
            console.log("[TINA ROUTE] QUIZ_SELECTION_LOCKED — blocking:", {
              rawQuestion: rawQuestion.slice(0, 80),
              activeHook,
              forcedHook,
              quizLearningDomain
            });
            return res.json({
              success: false,
              engine: "TINA_ASK_HANDLER",
              mode: "QUIZ_SELECTION_LOCKED",
              hook: "/quiz",
              answer:
                "Quiz mode is waiting for a tax domain. Please choose one of the listed /quiz options, or type /bye to exit.",
              sourceStatus: "QUIZ_SELECTION_LOCKED",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0,
              askHandlerVersion: ENGINE_VERSION,
              contextOrchestrationEnabled: true
            });
          }
        }
      }
      // ── END QUIZ SELECTION GATE ───────────────────────────────────────────────

      // ── REVIEW SELECTION GATE ─────────────────────────────────────────────────
      // When /review is active but no domain has been selected yet (i.e., the
      // domain-selection menu was shown and the user has not yet chosen a domain),
      // only "/review <domain>" commands and exit commands may proceed.
      //
      // Mirrors QUIZ SELECTION GATE — prevents fallback to /ask RAG pipeline.
      const reviewLockedDomain = existingMode?.adaptive_context?.learning?.domain || null;

      if (
        activeHook === "/review" &&
        !reviewLockedDomain &&
        !isExitCommand(rawQuestion)
      ) {
        const lowerInput = normalizeLower(rawQuestion);
        const isValidDomainCommand =
          lowerInput.startsWith("/review ") || lowerInput === "/review";

        if (!isValidDomainCommand) {
          // Attempt fuzzy resolution for misspelled /review commands
          // (e.g., /revie VAT, /REVVIE VAT, /reviw VAT).
          // Only tried when input starts with / — bare text is never a valid command.
          let fuzzyReviewOk = false;
          if (lowerInput.startsWith("/")) {
            try {
              const intent = resolveCommandIntent(rawQuestion);
              fuzzyReviewOk = intent.ok && intent.commandKey === "/review";
              if (fuzzyReviewOk) {
                console.log("[REVIEW COMMAND RESOLVED]", {
                  rawInput: rawQuestion.slice(0, 80),
                  resolvedCommand: "/review",
                  resolvedDomain: intent.domain || null,
                  confidence: intent.confidence,
                  method: intent.matchType
                });
              } else {
                console.log("[REVIEW COMMAND REJECTED]", {
                  rawInput: rawQuestion.slice(0, 80),
                  reason: intent.ok
                    ? `resolved to ${intent.commandKey}, not /review`
                    : "below confidence threshold"
                });
              }
            } catch (e) {
              console.warn("[REVIEW SELECTION GATE] Fuzzy resolver error (non-fatal):", e?.message);
            }
          }

          if (!fuzzyReviewOk) {
            console.log("[REVIEW MENU INVALID INPUT]", {
              input: rawQuestion.slice(0, 80),
              sessionId: conversationId,
              activeHook,
              hasDomain: false
            });
            return res.json({
              success: false,
              engine: "TINA_ASK_HANDLER",
              mode: "REVIEW_SELECTION_LOCKED",
              hook: "/review",
              answer: "## Invalid Review Selection\n\nChoose one of the allowed review domains:\n\n• /review VAT\n• /review Income Tax\n• /review Withholding Tax\n• /review Estate Tax\n• /review Donor's Tax\n• /review Percentage Tax\n• /review Excise Tax\n• /review Prescription\n• /review Tax Dispute\n\nOr type /bye to exit /review mode.",
              sourceStatus: "REVIEW_SELECTION_LOCKED",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0,
              askHandlerVersion: ENGINE_VERSION,
              contextOrchestrationEnabled: true
            });
          }
          // fuzzyReviewOk — fall through; loadTaxHookConfig resolves the command
        }
      }
      // ── END REVIEW SELECTION GATE ─────────────────────────────────────────────

      // ── QUIZ DOMAIN SWITCH BLOCK ──────────────────────────────────────────────
      // When a quiz question is pending (ANSWERING phase) and the user types a
      // /quiz command (e.g., "/quiz Income Tax"), the MODE SESSION LOCK above does
      // not fire because explicitHook === activeHook ("/quiz" === "/quiz").
      // This second guard catches same-hook domain-switch attempts.
      if (
        pendingQuiz &&
        hasActiveAssessmentMode &&
        activeHook === "/quiz" &&
        explicitHook === "/quiz"
      ) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const domainSuffix = lockedDomain ? ` for ${lockedDomain}` : "";
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "MODE_SESSION_LOCKED",
          hook: "/quiz",
          answer: `You are currently in Quiz Mode${domainSuffix}. Type /bye, /exit, or /quit first before switching modes.`,
          sourceStatus: "MODE_SESSION_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }
      // ── END QUIZ DOMAIN SWITCH BLOCK ──────────────────────────────────────────

      const quizAnswer = extractQuizAnswer(rawQuestion);
      const hasPendingReviewAnswer = Boolean(existingMode?.adaptive_context?.learning?.pendingAnswer);
      const hasActiveReviewMcq = Boolean(
        existingMode?.adaptive_context?.learning?.reviewMode?.currentItem?.questionType === "mcq"
      );

      if (pendingQuiz && hasActiveAssessmentMode && quizAnswer && !explicitHook) {
        const loopResult = await assessmentHandler.continueAssessmentLoop({
          userId,
          conversationId: conversationId || null,
          incomingAnswer: rawQuestion
        });

        if (loopResult.handled) return res.json(loopResult.response);
      }

      if (pendingQuiz && hasActiveAssessmentMode && !quizAnswer && !explicitHook) {
        const lockedDomain = existingMode?.adaptive_context?.learning?.domain || "";
        const modeLabel = activeHook === "/quiz" ? "Quiz" : "Reviewer";
        return res.json({
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "MODE_ANSWER_GATED",
          answer: `${modeLabel} mode is active${lockedDomain ? ` for ${lockedDomain}` : ""}. Please answer using A, B, C, or D only, or type /bye to exit.`,
          sourceStatus: "QUIZ_MODE_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      // REVIEW MODE LOCK — when a domain is selected, only A/B/C/D, exit commands, and
      // explicit slash commands may proceed. All other bare text is rejected.
      if (activeHook === "/review" && reviewLockedDomain && !quizAnswer && !explicitHook) {
        console.log("[REVIEW LOCKED INVALID INPUT]", {
          input: rawQuestion.slice(0, 80),
          sessionId: conversationId,
          activeDomain: reviewLockedDomain
        });
        return res.json({
          success: false,
          engine: "TINA_ASK_HANDLER",
          mode: "REVIEW_MODE_LOCKED",
          answer: `## Invalid Response\n\nAllowed responses:\n• A\n• B\n• C\n• D\n• /bye\n• /exit\n• /quit\n\nYou are currently inside /review ${reviewLockedDomain}.\n\nDo not answer questions directly in review mode.\n\nTYPE:\n• A/B/C/D to answer\n• /bye to exit`,
          sourceStatus: "REVIEW_MODE_LOCKED",
          sources: [],
          sourcesUsed: [],
          vectorMatches: 0,
          askHandlerVersion: ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }

      if (activeHook === "/review" && reviewLockedDomain && quizAnswer) {
        console.log("[REVIEW ANSWER ROUTED]", {
          answer: quizAnswer,
          domain: reviewLockedDomain,
          hasActiveReviewMcq,
          hasPendingReviewAnswer
        });

        if (!hasActiveReviewMcq && !hasPendingReviewAnswer) {
          // No active question — tell the user to restart review for this domain
          return res.json({
            success: true,
            engine: "TINA_ASK_HANDLER",
            mode: "REVIEW_SELF_CHECK",
            answer: `No active review question found. Type \`/review ${reviewLockedDomain}\` to start a new review item, or \`/bye\` to exit review mode.`,
            sourceStatus: "REVIEW_SELF_CHECK",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0,
            askHandlerVersion: ENGINE_VERSION,
            contextOrchestrationEnabled: true
          });
        }
        // hasActiveReviewMcq OR hasPendingReviewAnswer: fall through to
        // REVIEW_PENDING_ANSWER_EARLY_ROUTE (after compactHookConfig is built).
        // Both cases are routed safely to learningHandler — never assessmentHandler.
      }

      let effectiveQuestion = rawQuestion;

      // Sticky mode prepend: when the active hook is not /ask (e.g. /review or /quiz)
      // and the user sends a plain message (no slash prefix), prepend the active hook so
      // loadTaxHookConfig routes it to the correct learning handler.
      // Fires when forcedHook is absent OR the generic /ask default (not a route-specific hook).
      // The "/" guard prevents double-prefixing for fuzzy slash commands like /revie VAT —
      // those are handled by fuzzy resolution in loadTaxHookConfig.
      if (
        !forcedHook &&
        !explicitHook &&
        !rawQuestion.trimStart().startsWith("/") &&
        existingMode?.active_hook &&
        existingMode.active_hook !== "/ask" &&
        !isExplicitModeHook(rawQuestion)
      ) {
        effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
      }

      const hookConfig = await loadTaxHookConfig({
        supabase,
        rawQuestion: effectiveQuestion,
        forcedHook
      });

      console.log("TINA MODE ROUTE DEBUG:", {
        userId,
        sessionId: conversationId,
        rawQuestion: rawQuestion.slice(0, 80),
        cleanQuestion: (hookConfig?.cleanQuestion || "").slice(0, 80),
        detectedCommand: explicitHook,
        activeHookBefore: existingMode?.active_hook || null,
        activeModeBefore: existingMode?.active_mode || null,
        selectedHook: hookConfig?.hook_code,
        selectedMode: hookConfig?.mode,
        commandMode: hookConfig?.mode,
        responseMode: hookConfig?.orchestrationMode,
        orchestrationMode: hookConfig?.orchestrationMode,
        isStickyMode: Boolean(!forcedHook && !explicitHook && existingMode?.active_hook && existingMode.active_hook !== "/ask"),
        explicitCommandOverride: Boolean(explicitHook),
        exitCommandDetected: false
      });

      const compactHookConfig = buildCompactHookConfig(hookConfig);

      // ─── STANDALONE LEARNING MENU INTERCEPT ──────────────────────────────────
      // /quiz and /review typed alone (no topic) produce an empty cleanQuestion
      // after hook stripping.  The boundary check below falls back to rawQuestion
      // ("/quiz" or "/review") when cleanQuestion is empty — the domain guard
      // then unconditionally rejects it at step 5 (quiz_review_requires_tax_topic)
      // because it sees no Philippine-tax signal in the bare slash command.
      //
      // Fix: detect standalone entry here, before the boundary, and route directly
      // to the learning handler which renders the domain/mode selection menu.
      //
      // Scope:
      //   hook_code is /quiz or /review   AND   cleanQuestion is empty
      //
      // NOT intercepted (falls through to boundary as before):
      //   /quiz VAT, /review withholding   → cleanQuestion = "VAT" / "withholding"
      //   → boundary evaluates the topic normally (ALLOW for tax, REJECT otherwise)
      {
        const _isLearningHook =
          compactHookConfig.hook_code === "/quiz" ||
          compactHookConfig.hook_code === "/review";
        const _isStandaloneLearningEntry =
          _isLearningHook && !String(compactHookConfig.cleanQuestion || "").trim();

        if (_isStandaloneLearningEntry) {
          console.log("[LEARNING_MENU_ENTRY]", {
            hook:       compactHookConfig.hook_code,
            standalone: true,
            userId,
            conversationId
          });

          let _menuResult;
          try {
            _menuResult = await learningHandler.handleLearningCommand({
              userId,
              conversationId,
              hookConfig: compactHookConfig,
              cleanQuestion: compactHookConfig.cleanQuestion,
              originalQuestion: compactHookConfig.originalQuestion
            });
          } catch (_menuErr) {
            console.error("[LEARNING_MENU_ENTRY ERROR]", _menuErr.message);
            return res.json({
              success:      false,
              engine:       "TINA Learning System",
              hook:         compactHookConfig.hook_code,
              mode:         compactHookConfig.mode,
              answer:       "TINA could not load the learning menu. Please try again.",
              sources:      [],
              sourcesUsed:  [],
              vectorMatches: 0,
              error:        _menuErr.message
            });
          }

          if (!_menuResult || !_menuResult.handled || !_menuResult.response) {
            return res.json({
              success:      false,
              engine:       "TINA Learning System",
              hook:         compactHookConfig.hook_code,
              mode:         compactHookConfig.mode,
              answer:       "TINA could not load the learning menu. Please try again.",
              sources:      [],
              sourcesUsed:  [],
              vectorMatches: 0
            });
          }

          return res.json(_menuResult.response);
        }
      }
      // ─── END STANDALONE LEARNING MENU INTERCEPT ──────────────────────────────

      // ─── REVIEW PENDING ANSWER EARLY ROUTE ───────────────────────────────────
      // When /review is active with a locked domain AND a pending answer is stored,
      // a bare A/B/C/D input must reach the learning handler immediately — before
      // the domain boundary, which would otherwise reject "a"/"b"/"c"/"d" as
      // non-Philippine-tax at step 5 (quiz_review_requires_tax_topic).
      //
      // Condition: /review active, domain locked, pendingAnswer stored, quizAnswer
      // valid, no explicit slash command override.
      {
        const _hasPendingReviewAnswer =
          activeHook === "/review" &&
          reviewLockedDomain &&
          (hasActiveReviewMcq || Boolean(existingMode?.adaptive_context?.learning?.pendingAnswer)) &&
          quizAnswer &&
          !explicitHook;

        if (_hasPendingReviewAnswer) {
          console.log("[REVIEW_PENDING_ANSWER_ROUTE]", {
            answer:    quizAnswer,
            domain:    reviewLockedDomain,
            sessionId: conversationId
          });

          let _reviewAnsResult;
          try {
            _reviewAnsResult = await learningHandler.handleLearningCommand({
              userId,
              conversationId,
              hookConfig:       compactHookConfig,
              cleanQuestion:    compactHookConfig.cleanQuestion,
              originalQuestion: compactHookConfig.originalQuestion
            });
          } catch (_raErr) {
            console.error("[REVIEW_PENDING_ANSWER_ROUTE ERROR]", _raErr?.message);
          }

          if (_reviewAnsResult?.handled) return res.json(_reviewAnsResult.response);
          // if not handled, fall through (should not happen)
        }
      }
      // ─── END REVIEW PENDING ANSWER EARLY ROUTE ───────────────────────────────

      // ─── LEARNING DOMAIN RESOLVED INTERCEPT ──────────────────────────────────
      // For /quiz and /review: attempt domain normalization BEFORE the boundary.
      // The boundary's regex patterns don't do fuzzy matching, so a typo like
      // "prscription" reaches step 5 and is unconditionally rejected.
      //
      // If resolveTaxDomain succeeds, the cleanQuestion IS a valid PH-tax learning
      // domain — bypass the boundary and route directly to the learning handler.
      // The handler calls parseLearningCommand internally which re-resolves and logs
      // any fuzzy match.
      //
      // If resolution fails (e.g. "photosynthesis"), fall through to the boundary,
      // which will correctly reject it.
      {
        const _isLearningRoute =
          compactHookConfig.hook_code === "/quiz" ||
          compactHookConfig.hook_code === "/review";
        const _lcq = String(compactHookConfig.cleanQuestion || "").trim();

        if (_isLearningRoute && _lcq) {
          const _domainResolution = resolveTaxDomain(_lcq);

          if (_domainResolution.ok) {
            if (_domainResolution.matchType !== "exact" && _domainResolution.matchType !== "alias") {
              console.log("[LEARNING_DOMAIN_FUZZY_MATCH]", {
                raw:        _lcq,
                normalized: _domainResolution.canonicalDomain,
                domainKey:  _domainResolution.domainKey,
                matchType:  _domainResolution.matchType,
                confidence: _domainResolution.confidence,
                mode:       compactHookConfig.hook_code
              });
            }

            console.log("[LEARNING_DOMAIN_INTERCEPT]", {
              cleanQuestion: _lcq,
              resolvedDomain: _domainResolution.domainKey,
              hook: compactHookConfig.hook_code,
              bypassBoundary: true
            });

            let _ldResult;
            try {
              _ldResult = await learningHandler.handleLearningCommand({
                userId,
                conversationId,
                hookConfig:       compactHookConfig,
                cleanQuestion:    compactHookConfig.cleanQuestion,
                originalQuestion: compactHookConfig.originalQuestion
              });
            } catch (_ldErr) {
              console.error("[LEARNING_DOMAIN_INTERCEPT ERROR]", _ldErr?.message);
              return res.json({
                success:     false,
                engine:      "TINA Learning System",
                hook:        compactHookConfig.hook_code,
                mode:        compactHookConfig.mode,
                answer:      "TINA encountered an error in the learning system. Please try again.",
                sources:     [], sourcesUsed: [], sourceCards: [], vectorMatches: 0,
                error:       _ldErr?.message
              });
            }

            if (_ldResult?.handled) return res.json(_ldResult.response);
            // if not handled (shouldn't happen), fall through to boundary
          }
          // resolution failed → fall through to boundary (correct rejection path)
        }
      }
      // ─── END LEARNING DOMAIN RESOLVED INTERCEPT ──────────────────────────────

      // PHASE-10A2: carries the domain boundary's isPhilippineTax signal past
      // this block's closing brace so handleControlledRagRoute can gate the
      // upstream restricted-legal-conclusion check on it without
      // recomputing detectPhilippineTaxBoundary a second time.
      let _isPhilippineTaxContext = false;

      // ─── PHILIPPINE TAX DOMAIN BOUNDARY (FAIL-CLOSED) ───────────────────────
      // Pre-retrieval check: reject non-Philippine-tax queries before any
      // pipeline, retrieval, assessment handler, or OpenAI call.
      // Default is REJECT — ALLOW is granted only when a PH-tax signal is found.
      {
        const _originalBoundaryQuery =
          String(compactHookConfig.cleanQuestion || compactHookConfig.originalQuestion || rawQuestion || "").trim();

        // PATCH-08X-CHAT-CONTEXT-CARRYOVER-DOMAIN-BOUNDARY-WIRING-1
        // Flag-gated (TINA_ENABLE_CHAT_CONTEXT_CARRYOVER) short-term context
        // carryover for the domain boundary. OFF by default => the boundary
        // evaluates the original query unchanged. When ON and an eligible bounded
        // follow-up applies (prior tax context in bounded recent turns), the
        // boundary evaluates the standaloneQuery so an elliptical tax follow-up
        // ("How about fresh frozen seafood?") is not fail-closed-rejected before
        // the pipeline can run. The boundary's own PH-tax criteria still decide
        // ALLOW/REJECT; non-tax/reset/jurisdiction-switch follow-ups do not inherit
        // (helper returns applied:false) and remain rejected. Narrow, bounded,
        // read-only history reuse via the existing getHistory(); no persistence,
        // no memory flags, no raw recent-turn logging.
        let _boundaryQuery = _originalBoundaryQuery;
        let _ccBoundaryDecision = null;
        if (isChatContextCarryoverEnabled() && conversationId) {
          const _ccRecentTurns = await getHistory(supabase, conversationId, 20).catch(() => []);
          _ccBoundaryDecision = buildShortTermContextCarryover({
            currentQuery: _originalBoundaryQuery,
            recentTurns: _ccRecentTurns,
            activeConversationId: conversationId,
            maxRewriteTurns: 6,
            jurisdictionDefault: "Philippines"
          });
          if (_ccBoundaryDecision.applied) {
            _boundaryQuery = _ccBoundaryDecision.standaloneQuery;
          }
        }

        // PHASE-09ZH-CONTROLLED-LOA-LIVE-PATH-REMEDIATION-1: apply the same
        // shared narrow audit-procedure boundary overlay pipeline.js uses, so
        // safe LOA/eLA procedural-help candidates are not rejected here
        // before reaching the controlled LOA gate. This does not generate an
        // answer and does not decide legal safety -- final classification
        // stays in pipeline.js's controlled LOA gate.
        const _boundaryCheck = applyControlledLoaAuditProcedureBoundaryOverlay(
          detectPhilippineTaxBoundary(_boundaryQuery, compactHookConfig.hook_code),
          _boundaryQuery,
          compactHookConfig.hook_code
        );
        _isPhilippineTaxContext = _boundaryCheck.isPhilippineTax === true;

        // ── PHASE-10A14-R15 (P2-R14-IR-008) — FOCUSED CLARIFICATION ──────────
        // A liability-computation request that lacks the decisive facts cannot be
        // resolved by retrieval: the obstacle is missing FACTS, not missing authority.
        // R14 answered LC5 ("How much tax do I owe?") with a no-indexed-authority
        // fallback, which misdescribes why TINA cannot answer. Ask instead.
        // This runs only for in-domain queries and only when at least two decisive
        // facts are absent, so a fully specified computation still reaches the pipeline.
        if (_isPhilippineTaxContext) {
          const _clarify = detectTaxComputationClarification(_boundaryQuery);
          if (_clarify.applies) {
            const _c = buildTaxComputationClarification(_boundaryQuery);
            await saveConversationTurn({
              conversationId, userId,
              question: compactHookConfig.originalQuestion,
              answerText: _c.answer,
              sourcesUsed: [], fallbackReferences: [], trust: null
            });
            return res.json({
              success: true,
              engine: "TINA Ask Handler",
              hook: compactHookConfig.hook_code,
              mode: compactHookConfig.mode,
              answer: _c.answer,
              sources: [], sourcesUsed: [], sourceCards: [], vectorMatches: 0,
              responseKind: _c.responseKind,
              clarificationReason: _c.clarificationReason,
              missingDecisiveFacts: _clarify.missing,
              askHandlerVersion: ENGINE_VERSION
            });
          }
        }

        console.log("[DOMAIN BOUNDARY CHECK]", {
          query:           _boundaryQuery.slice(0, 120),
          route:           compactHookConfig.hook_code,
          mode:            compactHookConfig.mode,
          detectedDomain:  _boundaryCheck.detectedDomain,
          isPhilippineTax: _boundaryCheck.isPhilippineTax,
          decision:        _boundaryCheck.decision,
          reason:          _boundaryCheck.reason,
          confidence:      _boundaryCheck.confidence,
          // Safe carryover trace only — no raw recent turns / no prior message contents.
          domainBoundaryCarryoverEnabled: _ccBoundaryDecision != null,
          domainBoundaryCarryoverApplied: _ccBoundaryDecision ? _ccBoundaryDecision.applied : false,
          domainBoundaryStandaloneQueryUsed: _ccBoundaryDecision ? _ccBoundaryDecision.applied : false,
          inheritedTaxType: _ccBoundaryDecision ? _ccBoundaryDecision.inheritedTaxType : null,
          inheritedJurisdiction: _ccBoundaryDecision ? _ccBoundaryDecision.inheritedJurisdiction : null,
          boundedTurnCount: _ccBoundaryDecision ? _ccBoundaryDecision.boundedTurnCount : 0,
        });

        if (_boundaryCheck.decision === "REJECT" || _boundaryCheck.decision === "CLARIFY") {
          const _isHardReject  = _boundaryCheck.decision === "REJECT";
          const _boundaryMsg   = _isHardReject ? BOUNDARY_REJECTION_MESSAGE : BOUNDARY_CLARIFY_MESSAGE;
          const _boundaryStatus = _isHardReject ? "DOMAIN_BOUNDARY_REJECT" : "DOMAIN_BOUNDARY_CLARIFY";

          console.log("[DOMAIN BOUNDARY REJECTED]", {
            query:           _boundaryQuery.slice(0, 120),
            route:           compactHookConfig.hook_code,
            mode:            compactHookConfig.mode,
            detectedDomain:  _boundaryCheck.detectedDomain,
            decision:        _boundaryCheck.decision,
            reason:          _boundaryCheck.reason,
            confidence:      _boundaryCheck.confidence,
            blocked:         true,
            pipelineReached: false,
            retrievalReached: false,
            openAIReached:   false,
          });

          // PHASE-10A14-R12 (P1-R11-IR-002 / WS8 persistence contract): a user-visible
          // domain-boundary answer must follow the explicit persistence contract. Previously
          // this early return omitted saveConversationTurn, so the public API answer was
          // non-empty while conversation history was empty (apiEqualsHistory=false). We now
          // PERSIST the boundary turn when a conversationId is present (ordinary application
          // behavior) and declare an explicit persistenceStatus in every case.
          const _boundaryTrust = buildResponseTrust({ domainBoundary: true }, 0, _boundaryStatus);
          // PHASE-10A14-R13 (P1-R12-IR-003): derive persistenceStatus from the ACKNOWLEDGED receipt.
          const _boundaryReceipt = await saveConversationTurn({
            conversationId,
            userId,
            question: compactHookConfig.originalQuestion || _boundaryQuery || "",
            answerText: _boundaryMsg,
            trust: _boundaryTrust
          });
          const _boundaryPersistenceStatus = (_boundaryReceipt && _boundaryReceipt.status) || "NOT_PERSISTED_NO_CONVERSATION";
          return res.json({
            success:                true,
            engine:                 "TINA_ASK_HANDLER",
            version:                ENGINE_VERSION,
            hook:                   compactHookConfig.hook_code || "/ask",
            mode:                   compactHookConfig.mode || "GENERAL",
            routeKind:              "DOMAIN_BOUNDARY",
            answer:                 _boundaryMsg,
            sources:                [],
            sourcesUsed:            [],
            sourceCards:            [],
            vectorMatches:          0,
            retrievedSourceCount:   0,
            displayedSourceCount:   0,
            relatedSourceCount:     0,
            sourceStatus:           _boundaryStatus,
            domainBoundary:         true,
            domainBoundaryDecision: _boundaryCheck.decision,
            domainBoundaryReason:   _boundaryCheck.reason,
            domainBoundaryConfidence: _boundaryCheck.confidence,
            detectedDomain:         _boundaryCheck.detectedDomain,
            askHandlerVersion:      ENGINE_VERSION,
            contextOrchestrationEnabled: true,
            trust:                  buildResponseTrust({ domainBoundary: true }, 0, _boundaryStatus),
            persistenceStatus:      _boundaryPersistenceStatus,
          });
        }
      }
      // ─── END PHILIPPINE TAX DOMAIN BOUNDARY ──────────────────────────────────

      if (compactHookConfig.mode === "LEARNING_PROGRESS") {
        const result = await assessmentHandler.handleLearningProgress({
          userId,
          conversationId,
          hookConfig: compactHookConfig,
          originalQuestion: compactHookConfig.originalQuestion
        });

        return res.json(result.response);
      }

      if (compactHookConfig.mode === "FEEDBACK") {
        const result = await handleFeedback({
          userId,
          conversationId,
          correction,
          feedbackType,
          originalAnswer,
          hookConfig: compactHookConfig
        });

        return res.status(result.status).json(result.body);
      }

      if (
        SPECIAL_ASSESSMENT_HOOKS.has(compactHookConfig.hook_code) ||
        (
          assessmentHandler.isAssessmentMode(compactHookConfig.mode) &&
          !isRagRoutedHook(compactHookConfig.hook_code) &&
          !isReviewRoutedHook(compactHookConfig.hook_code)
        )
      ) {
        // /quiz and /review → learning system (domain-normalizer + session-engine)
        // /diagnostic → assessment handler (legacy adaptive quiz)
        const isLearningHook =
          compactHookConfig.hook_code === "/quiz" ||
          compactHookConfig.hook_code === "/review";

        if (isLearningHook) {
          let learningResult;
          try {
            learningResult = await learningHandler.handleLearningCommand({
              userId,
              conversationId,
              hookConfig: compactHookConfig,
              cleanQuestion: compactHookConfig.cleanQuestion,
              originalQuestion: compactHookConfig.originalQuestion
            });
          } catch (learningError) {
            console.error("Learning handler error:", learningError.message);
            return res.json({
              success: false,
              engine: "TINA Learning System",
              hook: compactHookConfig.hook_code,
              mode: compactHookConfig.mode,
              answer: "TINA encountered an error in the learning system. Please try again.",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0,
              error: learningError.message
            });
          }

          if (!learningResult || !learningResult.handled || !learningResult.response) {
            return res.json({
              success: false,
              engine: "TINA Learning System",
              hook: compactHookConfig.hook_code,
              mode: compactHookConfig.mode,
              answer: "TINA could not handle this learning command. Please try again.",
              sources: [],
              sourcesUsed: [],
              vectorMatches: 0
            });
          }

          return res.json(learningResult.response);
        }

        // /diagnostic → existing assessment handler
        let result;
        try {
          result = await assessmentHandler.handleAssessmentCommand({
            userId,
            conversationId,
            hookConfig: compactHookConfig,
            cleanQuestion: compactHookConfig.cleanQuestion,
            originalQuestion: compactHookConfig.originalQuestion
          });
        } catch (assessmentError) {
          console.error("Assessment handler error:", assessmentError.message);
          return res.json({
            success: false,
            engine: "TINA Ask Handler",
            hook: compactHookConfig.hook_code,
            mode: compactHookConfig.mode,
            answer: "TINA encountered an error generating the assessment question. Please try again or type /ask to switch to normal mode.",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0,
            error: assessmentError.message
          });
        }

        if (!result || !result.handled || !result.response) {
          return res.json({
            success: false,
            engine: "TINA Ask Handler",
            hook: compactHookConfig.hook_code,
            mode: compactHookConfig.mode,
            answer: "TINA could not handle this assessment command. Please try again.",
            sources: [],
            sourcesUsed: [],
            vectorMatches: 0
          });
        }

        return res.json(result.response);
      }

      // ─── AUDIT MODE SWITCH ─────────────────────────────────────────────────────
      // When the user types "/audit" with no following text, treat it as a mode
      // switch — NOT a retrieval query. Save audit session state and return the
      // welcome prompt immediately. The NEXT user message becomes the real query.
      if (
        compactHookConfig.hook_code === "/audit" &&
        !String(compactHookConfig.cleanQuestion || "").trim()
      ) {
        const auditWelcome = AUDIT_WELCOME_MESSAGE;

        await saveConversationTurn({
          conversationId,
          userId,
          question: compactHookConfig.originalQuestion,
          answerText: auditWelcome,
          sourcesUsed: [],
          fallbackReferences: []
        });

        await saveModeState(supabase, {
          userId,
          sessionId: conversationId || null,
          activeHook: "/audit",
          activeMode: "AUDIT_MODE",
          modeTitle: "Audit / Evidence Evaluation Mode",
          lastQuestion: compactHookConfig.originalQuestion,
          lastAnswer: auditWelcome
        });

        return res.json({
          success:              true,
          engine:               "TINA_ASK_HANDLER",
          version:              ENGINE_VERSION,
          hook:                 "/audit",
          mode:                 "AUDIT_MODE",
          routeKind:            "MODE_SWITCH",
          hookTitle:            "Audit / Evidence Evaluation Mode",
          answer:               auditWelcome,
          sources:              [],
          sourcesUsed:          [],
          sourceCards:          [],
          vectorMatches:        0,
          sourceStatus:         "AUDIT_MODE_ACTIVATED",
          responseMode:         "COMPLEX_ADVISORY",
          orchestrationMode:    "COMPLEX_ADVISORY",
          activeHook:           "/audit",
          activeMode:           "AUDIT_MODE",
          auditModeActivated:   true,
          askHandlerVersion:    ENGINE_VERSION,
          contextOrchestrationEnabled: true
        });
      }
      // ─── END AUDIT MODE SWITCH ──────────────────────────────────────────────────

      const adaptiveContext = buildAdaptiveContextForHook({
        hookConfig: compactHookConfig,
        existingMode,
        pendingQuiz,
        contextOrchestrationEnabled: true
      });

      const orchestrationMetadata = buildCompactOrchestrationMetadata({
        routeHook: compactHookConfig.hook_code,
        routeMode: compactHookConfig.mode,
        routeKind: compactHookConfig.routeKind
      });

      return handleControlledRagRoute({
        res,
        userId,
        conversationId,
        hookConfig: compactHookConfig,
        adaptiveContext,
        orchestrationMetadata,
        isPhilippineTaxContext: _isPhilippineTaxContext
      });
    } catch (error) {
      console.error("Ask dispatcher error:", error);

      return res.status(500).json({
        success: false,
        error: error.message || "Ask failed",
        engine: "TINA Ask Handler",
        askHandlerVersion: ENGINE_VERSION,
        contextOrchestrationEnabled: true,
        orchestrationFirstArchitecture: true,
        routeControllerOnly: true,
        slashCommandInterceptor: true,
        tpmConscious: true
      });
    }
    }); // PHASE-10A14-R14: end persistenceContext.run
  };
}

export function askHandlerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ASK_HANDLER",
    version: ENGINE_VERSION,

    correctFlowEnabled: true,

    flow: [
      "slash-command-interception",
      "query-intent-engine.js",
      "issue-classification-engine.js",
      "retrieval-engine.js",
      "reranker-engine.js",
      "context-orchestration-engine.js",
      "rag-answer-handler.js"
    ],

    allowedHooks: ALLOWED_HOOKS,
    normalRagRoutedHooks: [...NORMAL_RAG_ROUTED_HOOKS],
    reviewRoutedHooks: [...REVIEW_ROUTED_HOOKS],
    caseRoutedHooks: [...CASE_ROUTED_HOOKS],
    sourceRoutedHooks: [...SOURCE_ROUTED_HOOKS],
    specialAssessmentHooks: [...SPECIAL_ASSESSMENT_HOOKS],
    ragRoutedHooks: [...RAG_ROUTED_HOOKS],

    slashCommandInterceptionBeforeNormalRag: true,
    quizSeparatedFromRag: true,
    reviewSeparatedFromOrdinaryAFLegalFlow: true,
    reviewUsesReviewerRoute: true,
    reviewFormatHint: ["Concept", "Rule", "Memory Aid", "Common Trap", "Example", "Quick Check"],
    caseModeSupported: true,
    sourceModeForcesSourceVisibility: true,
    auditModeSupported: true,
    debugPatchHooksSupported: true,

    orchestrationFirstArchitecture: true,
    routeControllerOnly: true,
    modeStatePreserver: true,
    retrievedSourcePreserver: true,
    queryIntentAwareDispatcher: true,

    noDirectOpenAICall: true,
    noPromptAssembly: true,
    noTokenEstimation: true,
    noLegalReasoningInsideAskHandler: true,
    noSourceRankingInsideAskHandler: true,
    noRenderingInsideAskHandler: true,
    noRawRetrievalPayloadInjection: true,
    noRawEngineObjectInjection: true,

    retrievalBeforeRag: true,
    rerankerBetweenRetrievalAndRag: true,
    rerankerFallbackToRawSources: true,
    retrievedSourcesPreservedBeforeGenerateRagAnswer: true,
    queryIntentModeFlagsPassedToRag: true,

    timeoutProtected: true,
    tpmConscious: true,
    compactSourcesOnly: true,

    adaptiveCompatible: true,
    assessmentCompatible: true,
    ragCompatible: true,
    feedbackCompatible: true,
    modeStateCompatible: true
  };
}

export default {
  createAskHandler,
  askHandlerHealthCheck
};
