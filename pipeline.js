// FILE: pipeline.js
// TINA 16-Step Query Pipeline
// Version: 1.0.0
//
// LAW 1 — PIPELINE SUPREMACY
// Every query enters through runPipeline() only.
// ask-handler.js calls ONLY pipeline.runPipeline().
// No engine is called from anywhere except this file.
//
// LAW 3 — authority_name filter enforced in Step 5 (semantic-only retrieval PROHIBITED)
// LAW 4 — Full Four-Part Doctrine Test enforced in Step 9

"use strict";

import {
  classify,
  hasSemanticNoMatchGuard,
  sourceMaterialTermsMatchAuthority,
  isEwtBridgeEligible,
  isVatDefinitionQuery
}                                                 from "./issue-classification-engine.js";
import {
  getModeRoutingMetadata,
  buildAdaptivePromptContract
}                                                 from "./adaptive-tina-master-prompt.js";
import { planAdaptiveResponse }                   from "./adaptive-response-planner.js";
import {
  rerankByHierarchy,
  annotateAuthorityCandidates
}                                                 from "./authority-engine.js";
import { applySupersessionFilter }                from "./supersession-engine.js";
import { retrieveRelevantSources }                from "./retrieval-engine.js";
import {
  searchSimilar,
  exactAuthoritySearch,
  normalizedCitationSearch,
  titleMetadataSearch,
  exactProvisionSearch
}                                                 from "./vector-store.js";
import { rerankForTina }                          from "./reranker-engine.js";
import { detectDoctrinalConflicts }               from "./doctrinal-engine.js";
import {
  isGenuineConflict,
  analyzeConflictPair
}                                                 from "./conflict-engine.js";
import { callOpenAIWithOrchestration }            from "./context-orchestration-engine.js";
import {
  generateTraceId,
  startTrace,
  endTrace,
  flushObservability
}                                                 from "./services/observability-service.js";
import {
  renderTinaAnswer,
  renderFastDefinitionConversational,
  applyVerifiedAuthorityGate
}                                                 from "./answer-renderer.js";
import { enforceFinalAnswerCompliance, stripUnverifiedAuthorityLines } from "./final-answer-compliance.js";
import { analyzeFactPattern }                     from "./fact-pattern-engine.js";
import { characterizeTransaction }                from "./transaction-characterization-engine.js";
import { evaluateEvidence }                       from "./evidence-evaluation-engine.js";
import { scoreRisk }                              from "./risk-scoring-engine.js";
import {
  inferIssuanceNumber,
  sourceTitleOf,
  canonicalSourceKey,
  filterDisplayedSourcesByDirectSupport,
  shouldHideSource
}                                                 from "./source-visibility-engine.js";
import {
  detectPhilippineTaxBoundary,
  BOUNDARY_REJECTION_MESSAGE
}                                                 from "./services/philippine-tax-domain-boundary.js";
import { selectSourceAuthorities }                from "./services/source-authority-selector.js";

const PIPELINE_VERSION = "1.0.0";
const ROUTE_BUDGET_MS = 90_000;
const PIPELINE_BUDGET_WARNING_THRESHOLDS_MS = [15_000, 10_000, 5_000];

// ─── helpers ──────────────────────────────────────────────────────────────────

function ensurePipelineDiagnostics(diag = null, {
  requestStartedAt = Date.now(),
  route = "",
  model = "",
  budgetMs = null,
  requestId = ""
} = {}) {
  const target = diag && typeof diag === "object" ? diag : {};
  target.requestId = target.requestId || requestId || generateTraceId();
  target.route = target.route || route;
  target.model = target.model || model || "";
  target.budgetMs = Number.isFinite(Number(target.budgetMs)) ? Number(target.budgetMs) : budgetMs;
  target.pipelineTimings = target.pipelineTimings || { requestStartedAt };
  target.pipelineTimings.requestStartedAt = target.pipelineTimings.requestStartedAt || requestStartedAt;
  target.pipelineStageDurations = target.pipelineStageDurations || {};
  target.partialPipelineState = target.partialPipelineState || {
    retrievalCompleted: false,
    classificationCompleted: false,
    generationStarted: false,
    generationCompleted: false,
    complianceStarted: false,
    complianceCompleted: false
  };
  target.openaiCalls = Array.isArray(target.openaiCalls) ? target.openaiCalls : [];
  target.checkpoints = Array.isArray(target.checkpoints) ? target.checkpoints : [];
  return target;
}

function computePipelineStageDurations(diag = {}) {
  const t = diag.pipelineTimings || {};
  const duration = (start, end) =>
    Number.isFinite(t[start]) && Number.isFinite(t[end])
      ? Math.max(0, t[end] - t[start])
      : undefined;
  const totalEnd = t.responseCompletedAt || Date.now();
  const durations = {
    classificationMs: duration("classificationStartedAt", "classificationCompletedAt"),
    retrievalMs: duration("retrievalStartedAt", "retrievalCompletedAt"),
    authorityResolutionMs: duration("authorityResolutionStartedAt", "authorityResolutionCompletedAt"),
    sourceSelectionMs: duration("sourceSelectionStartedAt", "sourceSelectionCompletedAt"),
    generationMs: duration("generationStartedAt", "generationCompletedAt"),
    complianceMs: duration("complianceStartedAt", "complianceCompletedAt"),
    renderingMs: duration("renderingStartedAt", "renderingCompletedAt"),
    totalMs: Number.isFinite(t.requestStartedAt) ? Math.max(0, totalEnd - t.requestStartedAt) : undefined
  };
  diag.pipelineStageDurations = Object.fromEntries(
    Object.entries(durations).filter(([, value]) => value !== undefined)
  );
  return diag.pipelineStageDurations;
}

function markPipelineCheckpoint(diag = null, checkpoint, {
  timingField = "",
  mode = "",
  route = "",
  model = "",
  sourceAvailabilityStatus = "",
  retrievedCount = 0,
  displayedSourceCardCount = 0
} = {}) {
  if (!diag || !checkpoint) return;
  const now = Date.now();
  const timings = diag.pipelineTimings || (diag.pipelineTimings = { requestStartedAt: now });
  if (timingField) timings[timingField] = now;
  const elapsedMs = Number.isFinite(timings.requestStartedAt) ? now - timings.requestStartedAt : 0;
  const budgetMs = Number.isFinite(Number(diag.budgetMs)) ? Number(diag.budgetMs) : null;
  const remainingBudgetMs = budgetMs === null ? null : budgetMs - elapsedMs;
  const entry = {
    checkpoint,
    requestId: diag.requestId || "",
    elapsedMs,
    remainingBudgetMs,
    model: model || diag.model || "",
    mode,
    route: route || diag.route || "",
    sourceAvailabilityStatus: sourceAvailabilityStatus || "",
    retrievedCount,
    displayedSourceCardCount
  };
  diag.checkpoints = diag.checkpoints || [];
  diag.checkpoints.push(entry);
  computePipelineStageDurations(diag);
  console.log("[PIPELINE CHECKPOINT]", entry);
  for (const threshold of [15000, 10000, 5000]) {
    if (remainingBudgetMs !== null && remainingBudgetMs <= threshold && !diag[`_warnedBelow${threshold}`]) {
      diag[`_warnedBelow${threshold}`] = true;
      console.warn("[PIPELINE_BUDGET_WARNING]", { ...entry, thresholdMs: threshold });
    }
  }
}

function finalizePipelineDiagnostics(diag = null) {
  if (!diag) return null;
  diag.pipelineTimings = diag.pipelineTimings || { requestStartedAt: Date.now() };
  diag.pipelineTimings.responseCompletedAt = diag.pipelineTimings.responseCompletedAt || Date.now();
  computePipelineStageDurations(diag);
  diag.pipelineTimings.totalMs = diag.pipelineStageDurations.totalMs;
  return diag;
}
function safeStr(v) {
  return typeof v === "string" ? v : String(v || "");
}

function hasSaeHardFail(compliantResult = {}) {
  const status = safeStr(compliantResult.complianceStatus).toUpperCase();
  const violations = Array.isArray(compliantResult.saeViolations)
    ? compliantResult.saeViolations
    : [];
  const saeCompliance = compliantResult.saeCompliance || compliantResult.metadata?.saeCompliance || {};
  const saeViolations = Array.isArray(saeCompliance.violations)
    ? saeCompliance.violations
    : [];

  const allViolations = [...violations, ...saeViolations];
  const hasHardFailViolation = allViolations.some((violation) => {
    const severity = safeStr(violation?.severity || violation?.type).toLowerCase();
    const code = safeStr(violation?.code || violation?.id).toUpperCase();
    return (
      severity === "hard_fail" ||
      code.includes("SAE_C1") ||
      code.includes("SAE_C3") ||
      code.includes("SAE_C6")
    );
  });

  return compliantResult.success === false || status === "FAILED" || hasHardFailViolation;
}

function buildSaeHardFailFallback(ctx = {}) {
  const saeStatus = safeStr(ctx.saeStatus).toUpperCase();

  if (saeStatus === "RELATED_AUTHORITY_ONLY") {
    return [
      "I cannot present the available source as controlling authority for this issue.",
      "",
      "Only related or supporting authority was found. Please verify the governing statute, regulation, or controlling issuance before relying on this answer."
    ].join("\n");
  }

  if (saeStatus === "SOURCE_LOOKUP_EMPTY") {
    return [
      "The source lookup completed but did not return matching authority for this query.",
      "",
      "This does not mean that no law or authority exists. Please verify the relevant indexed source before relying on a legal or tax conclusion."
    ].join("\n");
  }

  if (saeStatus === "RETRIEVAL_TIMEOUT") {
    return [
      "The authority retrieval process timed out before a reliable indexed source could be confirmed.",
      "",
      "This does not mean that no law or authority exists. Please retry or verify the relevant indexed source before relying on a legal or tax conclusion."
    ].join("\n");
  }

  if (saeStatus === "SOURCE_PARSE_ERROR") {
    return [
      "An indexed source was located, but its content could not be parsed reliably.",
      "",
      "I cannot rely on the parse-failed content as authority. Please verify the relevant indexed source before relying on a legal or tax conclusion."
    ].join("\n");
  }

  if (saeStatus === "NO_INDEXED_SOURCE") {
    return [
      "TINA could not identify an indexed authority matching the specific transaction or claim described.",
      "",
      "This does not mean that no law or authority exists."
    ].join("\n");
  }

  return [
    "The answer did not pass final SAE compliance checks.",
    "",
    "Please verify the relevant indexed source before relying on this response."
  ].join("\n");
}

function buildOpenAiFailureRetrievalAnswer(ctx = {}, query = "") {
  const sources = Array.isArray(ctx.rerankedChunks) ? ctx.rerankedChunks : [];
  const sourceLabels = sources
    .map((source) =>
      source.citation ||
      source.normalized_reference ||
      source.normalizedReference ||
      source.title ||
      source.document_title ||
      source.source ||
      ""
    )
    .filter(Boolean)
    .slice(0, 5);

  const governingLine = sourceLabels.length
    ? `Governing indexed authority was retrieved: ${sourceLabels.join(", ")}.`
    : "Indexed authority was retrieved for this query.";

  return [
    "TINA retrieved indexed legal sources, but the answer-generation request failed due to a temporary model connection issue. Please retry the question.",
    "",
    governingLine,
    "",
    "Please use the source cards shown with this response to review the retrieved governing authority."
  ].join("\n");
}

// ── PATCH-018B: Safe insufficient-generation fallback for the fast-EWT path ──
// Replaces the removed hardcoded EWT legal conclusion. This text must never
// state a specific rate, treatment, income payment category, or legal
// conclusion — those depend on facts that generation did not analyze.
const SAFE_EWT_INSUFFICIENT_GENERATION_ANSWER =
  "TINA found potentially relevant withholding tax authorities, but the answer could not be safely completed within the available generation budget. The applicable EWT treatment or rate depends on the specific income payment category, payee status, and governing regulation. Please rerun the query or narrow the fact pattern.";

function buildRetrievalLayerCounts(retrievalDiagnostics = {}) {
  return {
    exactAuthorityMatches:    retrievalDiagnostics?.exactAuthorityMatches    ?? 0,
    citationVariantMatches:   retrievalDiagnostics?.citationVariantMatches   ?? 0,
    metadataMatches:          retrievalDiagnostics?.metadataMatches          ?? 0,
    contentKeywordMatches:    retrievalDiagnostics?.contentKeywordMatches    ?? 0,
    semanticMatches:          retrievalDiagnostics?.semanticMatches          ?? 0,
    fallbackMatches:          retrievalDiagnostics?.fallbackMatches          ?? 0,
    supabaseFallbackMatches:  retrievalDiagnostics?.supabaseFallbackMatches  ?? 0
  };
}

function buildFirstSourceLabels(sources = [], max = 5) {
  return (Array.isArray(sources) ? sources : [])
    .map((source) =>
      source.citation ||
      source.normalized_reference ||
      source.normalizedReference ||
      source.title ||
      source.document_title ||
      source.source ||
      ""
    )
    .filter(Boolean)
    .slice(0, max);
}

function createPipelineInstrumentation({
  budgetMs = ROUTE_BUDGET_MS,
  now = () => Date.now()
} = {}) {
  const startedAt = now();
  const pipelineTimings = {};
  const pipelineStageDurations = {};
  const openaiCalls = [];
  const warnedThresholds = new Set();
  const partialPipelineState = {
    retrievalCompleted: false,
    classificationCompleted: false,
    generationStarted: false,
    generationCompleted: false,
    complianceStarted: false,
    complianceCompleted: false,
    retrievedCount: 0,
    displayedSourceCardCount: 0,
    sourceAvailabilityStatusBeforeTimeout: null,
    sourceLabelsBeforeTimeout: [],
    retrievalLayerCounts: {}
  };

  const elapsedMs = () => now() - startedAt;
  const remainingBudgetMs = () => Math.max(0, budgetMs - elapsedMs());

  function warnIfNeeded(checkpoint) {
    const remaining = remainingBudgetMs();
    for (const threshold of PIPELINE_BUDGET_WARNING_THRESHOLDS_MS) {
      if (remaining <= threshold && !warnedThresholds.has(threshold)) {
        warnedThresholds.add(threshold);
        console.warn("[PIPELINE_BUDGET_WARNING]", {
          checkpoint,
          elapsedMs: elapsedMs(),
          remainingBudgetMs: remaining,
          thresholdMs: threshold,
          budgetMs
        });
      }
    }
  }

  function checkpoint(event, stageName = null) {
    const entry = {
      event,
      stageName,
      at: new Date(now()).toISOString(),
      elapsedMs: elapsedMs(),
      remainingBudgetMs: remainingBudgetMs(),
      budgetMs
    };
    pipelineTimings[event] = entry;
    warnIfNeeded(event);
    console.log(`[${event}]`, {
      elapsedMs: entry.elapsedMs,
      remainingBudgetMs: entry.remainingBudgetMs,
      budgetMs
    });
    return entry;
  }

  function stageStarted(event, stageName) {
    const entry = checkpoint(event, stageName);
    pipelineStageDurations[stageName] = {
      startedAt: entry.at,
      completedAt: null,
      durationMs: null,
      status: "started"
    };
    return entry;
  }

  function stageCompleted(event, stageName, extra = {}) {
    const entry = checkpoint(event, stageName);
    const startedAtIso = pipelineStageDurations[stageName]?.startedAt;
    const startedAtMs = startedAtIso ? Date.parse(startedAtIso) : now();
    pipelineStageDurations[stageName] = {
      ...pipelineStageDurations[stageName],
      ...extra,
      completedAt: entry.at,
      durationMs: Number.isFinite(startedAtMs) ? now() - startedAtMs : null,
      status: "completed"
    };
    return entry;
  }

  function classifyTimeoutType() {
    if (!partialPipelineState.classificationCompleted) return "CLASSIFICATION_TIMEOUT";
    if (!partialPipelineState.retrievalCompleted) return "RETRIEVAL_OPERATION_TIMEOUT";
    if (partialPipelineState.generationStarted && !partialPipelineState.generationCompleted) return "GENERATION_TIMEOUT";
    if (partialPipelineState.complianceStarted && !partialPipelineState.complianceCompleted) return "COMPLIANCE_TIMEOUT";
    if (pipelineStageDurations.rendering?.status === "started" && pipelineStageDurations.rendering?.status !== "completed") return "RENDERING_TIMEOUT";
    return "UNKNOWN_PIPELINE_TIMEOUT";
  }

  function diagnostics(timeout = false) {
    const timeoutType = timeout ? classifyTimeoutType() : null;
    return {
      timeout,
      timeoutType,
      elapsedMs: elapsedMs(),
      budgetMs,
      pipelineTimings,
      pipelineStageDurations,
      partialPipelineState: { ...partialPipelineState },
      openaiCalls: [...openaiCalls]
    };
  }

  return {
    budgetMs,
    pipelineTimings,
    pipelineStageDurations,
    partialPipelineState,
    openaiCalls,
    elapsedMs,
    remainingBudgetMs,
    checkpoint,
    stageStarted,
    stageCompleted,
    classifyTimeoutType,
    diagnostics
  };
}

function extractRetrievalLayerCounts(retrievalDiagnostics = {}) {
  return {
    exactAuthorityMatches: retrievalDiagnostics?.exactAuthorityMatches ?? null,
    citationVariantMatches: retrievalDiagnostics?.citationVariantMatches ?? null,
    metadataMatches: retrievalDiagnostics?.metadataMatches ?? null,
    contentKeywordMatches: retrievalDiagnostics?.contentKeywordMatches ?? null,
    semanticMatches: retrievalDiagnostics?.semanticMatches ?? null,
    fallbackMatches: retrievalDiagnostics?.fallbackMatches ?? null,
    supabaseFallbackMatches: retrievalDiagnostics?.supabaseFallbackMatches ?? null
  };
}

function detectQueryFlags(issueClassification, hook = "/ask") {
  const qi = safeStr(issueClassification?.queryIntent).toLowerCase();
  const pi = safeStr(issueClassification?.primaryIssue).toLowerCase();
  return {
    isDispute:     hook === "/audit" || /dispute|audit|assessment|protest|litigation/.test(qi),
    isTransaction: /transaction|characteriz|agency|sale.*service|pass.through|principal/.test(qi + " " + pi),
    isFactPattern: /fact.?pattern|complex|multiple|parties|transaction.*flow/.test(qi)
  };
}

// ─── Four-Part Doctrine Test (Law 4) ─────────────────────────────────────────
// trueConflict = true ONLY when ALL FOUR are satisfied:
//   (1) Same legal issue
//   (2) Same material facts   (unknown → pass-through; does not block)
//   (3) Same statute
//   (4) Opposite holding

function sourceCardBasename(value = "") {
  return safeStr(value).replace(/^.*[/\\]/, "");
}

function sourceCardIdentityBlob(c = {}) {
  const meta = c.metadata || {};
  return [
    c.issuanceNumber,
    c.displayTitle,
    c.sourceTitle,
    c.source_title,
    c.document_title,
    c.documentTitle,
    c.source,
    c.originalSource,
    c.original_source,
    c.path,
    c.source_path,
    meta.documentTitle,
    meta.document_title,
    meta.originalFileName,
    meta.original_file_name,
    meta.originalSource,
    meta.path,
    meta.source_path
  ]
    .filter(Boolean)
    .map(sourceCardBasename)
    .join(" ");
}

function inferLinkedSourceType(c = {}) {
  const blob = sourceCardIdentityBlob(c).toLowerCase();
  if (/(^|[\s_/.-])rr[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue regulation")) return "RR";
  if (/(^|[\s_/.-])rmc[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum circular")) return "RMC";
  if (/(^|[\s_/.-])rmo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum order")) return "RMO";
  if (/(^|[\s_/.-])ramo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue audit memorandum order")) return "RAMO";
  if (blob.includes("01_tax_code") || blob.includes("nirc") || blob.includes("tax code")) return "NIRC";
  if (/\bra[\s_.-]*(?:no[\s_.-]*)?\d{4,6}\b/.test(blob) || blob.includes("republic act")) return "RA";
  return "";
}

function sourceCardYear(value = "") {
  const text = safeStr(value);
  if (text.length !== 2) return text;
  return Number(text) <= 30 ? `20${text}` : `19${text}`;
}

function inferAdministrativeRef(blob = "", type = "") {
  const prefix = safeStr(type).toUpperCase();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escaped}[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i"),
    new RegExp(`\\bRevenue\\s+(?:Audit\\s+)?(?:Regulations?|Memorandum\\s+(?:Circulars?|Orders?))[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i")
  ];
  for (const pattern of patterns) {
    const match = safeStr(blob).match(pattern);
    if (match) return `${prefix} No. ${Number(match[1])}-${sourceCardYear(match[2])}`;
  }
  return "";
}

function inferSourceCardRef(c = {}, linkedType = "") {
  const meta = c.metadata || {};
  const identityBlob = sourceCardIdentityBlob(c);
  const normalizedRef =
    c.normalizedReference ||
    c.normalized_reference ||
    meta.normalizedReference ||
    meta.normalized_reference ||
    "";

  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    return inferAdministrativeRef(identityBlob, linkedType);
  }

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    // Search normalizedRef + citation + reference + identity blob
    // PLUS chunk title and text preview — normalizedReference is often null for
    // NIRC Sec. 105-108 chunks, so the section number must be extracted from
    // the section heading (c.title) or the chunk text itself.
    const nircExtra = [
      c.title,
      c.sectionHeading,
      c.section_heading,
      c.sectionTitle,
      c.section_title,
      String(c.text || c.content || "").slice(0, 500)
    ].filter(Boolean).join(" ");
    const nircBlob = [normalizedRef, c.citation, c.reference, identityBlob, nircExtra]
      .filter(Boolean).join(" ");
    // 1. Qualified "NIRC Sec. NNN" / "Tax Code Section NNN" reference
    const direct = nircBlob.match(/\b(?:NIRC|Tax Code)\s+Sec(?:tion)?\.?\s*(\d+[A-Z]?)\b/i);
    if (direct) return `NIRC Sec. ${direct[1]}`;
    // 2. DB-normalised NIRC_SEC_NNN / TAX_CODE_SEC_NNN form (normalizedRef column)
    const normalizedMatch = nircBlob.match(/\b(?:NIRC|TAX_CODE)_SEC_(\d+[A-Z]?)\b/i);
    if (normalizedMatch) return `NIRC Sec. ${normalizedMatch[1]}`;
    // 3. Bare "Section NNN" / "Sec. NNN" — present in NIRC chunk headings and text.
    //    Range capped at 1–999 (all NIRC provisions) to avoid false positives from
    //    year literals or large RPC/civil code article numbers.
    const bare = nircBlob.match(/\bSec(?:tion)?\.?\s+(\d{1,3}[A-Z]?)\b/i);
    if (bare) return `NIRC Sec. ${bare[1]}`;
    // 4. No section number found — return a NIRC-typed document-level label.
    //    Do NOT fall through to inferIssuanceNumber here: inferIssuanceNumber would
    //    match "RA-10963" in the NIRC filename and return "RA No. 10963", collapsing
    //    ALL NIRC chunks into a single mislabeled "RA No. 10963" card.
    return "Tax Code";
  }

  if (linkedType === "RA") {
    const match = identityBlob.match(/\bRA[-\s_]*(?:No\.?)?[-\s_]*(\d{4,6})\b/i);
    if (match) return `RA No. ${match[1]}`;
  }

  return inferIssuanceNumber({
    ...c,
    title: "",
    normalizedReference: "",
    normalized_reference: "",
    metadata: {
      ...meta,
      normalizedReference: "",
      normalized_reference: ""
    }
  });
}

/**
 * Resolves the canonical display label for a source card chip.
 *
 * Extends inferSourceCardRef with additional provision-scope metadata fields
 * that the DB sometimes stores in sectionScope / metadata-nested heading fields.
 * Also upgrades the generic "Tax Code" fallback to the more descriptive "NIRC Tax Code".
 *
 * HARD RULE: NIRC section labels (e.g. "NIRC Sec. 116") are derived only from
 * source-side metadata — answer text is never consulted here.
 *
 * Priority for NIRC/statute family:
 *   1-4.  normalizedReference / metadata.normalizedReference  (via inferSourceCardRef)
 *   5-6.  sectionScope / metadata.sectionScope               (checked here first)
 *   7.    metadata.sectionHeading / metadata.section_heading  (checked here first)
 *   8-9.  citation / reference                                (via inferSourceCardRef)
 *  10.    section number in c.title / c.sectionHeading / chunk text (via inferSourceCardRef)
 *  11.    "NIRC Tax Code" — document-family fallback
 *
 * For RR / RMC / RMO / RAMO / RA: delegates directly to inferSourceCardRef.
 */
function resolveSourceCardDisplayRef(c = {}, linkedType = "") {
  const meta = c.metadata || {};

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    // Priority 5-6: explicit sectionScope field in source/metadata
    const sectionScope = safeStr(
      meta.sectionScope  || meta.section_scope ||
      c.sectionScope     || c.section_scope    || ""
    );
    if (sectionScope) {
      const m = sectionScope.match(/\b(?:NIRC\s+)?Sec(?:tion)?\.?\s*(\d{1,3}[A-Z]?)\b/i);
      if (m) return `NIRC Sec. ${m[1]}`;
    }

    // Priority 7: metadata-nested section heading (not inspected by inferSourceCardRef)
    const metaHeading = safeStr(
      meta.sectionHeading || meta.section_heading ||
      meta.sectionTitle   || meta.section_title   || ""
    );
    if (metaHeading) {
      const m = metaHeading.match(/\b(?:NIRC\s+)?Sec(?:tion)?\.?\s*(\d{1,3}[A-Z]?)\b/i);
      if (m) return `NIRC Sec. ${m[1]}`;
    }

    // Delegate to inferSourceCardRef for all remaining patterns
    // (normalizedRef, citation, top-level sectionHeading, chunk text excerpt)
    const base = inferSourceCardRef(c, linkedType);

    // Upgrade the generic "Tax Code" fallback to the more descriptive family label
    return base === "Tax Code" ? "NIRC Tax Code" : base;
  }

  // All other types: delegate directly
  return inferSourceCardRef(c, linkedType);
}

function sourceCardLabelType(label = "") {
  const text = safeStr(label).trim().toUpperCase();
  if (/^NIRC\b|^TAX CODE\b/.test(text)) return "NIRC";
  if (/^RR\b|^REVENUE REGULATIONS?\b/.test(text)) return "RR";
  if (/^RMC\b|^REVENUE MEMORANDUM CIRCULAR\b/.test(text)) return "RMC";
  if (/^RMO\b|^REVENUE MEMORANDUM ORDER\b/.test(text)) return "RMO";
  if (/^RAMO\b|^REVENUE AUDIT MEMORANDUM ORDER\b/.test(text)) return "RAMO";
  if (/^RA\b|^REPUBLIC ACT\b/.test(text)) return "RA";
  return "";
}

function sourceCardIsConsistent(label = "", linkedType = "") {
  const labelType = sourceCardLabelType(label);
  if (!labelType || !linkedType) return true;
  if (labelType === "NIRC") return ["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  if (labelType === "RA") return ["RA", "NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  return labelType === linkedType;
}

/**
 * Visible-source target whitelist.
 *
 * When targetAuthorities is non-empty this is a strict allowlist — only two
 * categories of cards survive:
 *
 *   1. Exact canonical match: canonicalSourceKey(provRef) === canonicalSourceKey(target)
 *      e.g. "NIRC Sec. 105" ↔ target "NIRC Sec. 105"
 *           "RR No. 16-2005" ↔ target "RR 16-2005"   (canonicalization strips "No.")
 *
 *   2. NIRC document-level fallback "Tax Code" — allowed only when at least one
 *      target authority is a NIRC/statute provision (correct document family).
 *      Specific section labels like "NIRC Sec. 4" do NOT fall into this bucket —
 *      they must match a target via case 1 or be rejected.
 *
 * Everything else is rejected, including:
 *   - off-target NIRC sections (NIRC Sec. 4 for a VAT query)
 *   - off-target administrative issuances (RMC 65-2012 for a VAT query)
 *   - RA labels that are not themselves in targetAuthorities
 *
 * When targetAuthorities is empty the gate is open (returns true for all).
 */
function isTargetAllowedCard(provRef, linkedType, targetAuths) {
  if (!targetAuths.length) return true;

  const provKey = canonicalSourceKey(provRef);

  // 1. Canonical match — covers "RR No. 16-2005" ≡ target "RR 16-2005"
  if (targetAuths.some(a => canonicalSourceKey(a) === provKey)) return true;

  // 2. NIRC document-level fallback — both "Tax Code" and "NIRC Tax Code" labels.
  //    Only valid when the target list includes at least one NIRC/statute provision.
  if (/^(?:nirc\s+)?tax\s+code$/i.test(provRef)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a));
  }

  return false;
}

function extractNircSectionNumber(ref = "") {
  const match = safeStr(ref).match(/\bsec(?:tion)?\.?\s*(\d{1,4})/i);
  return match ? Number(match[1]) : null;
}

function sourceCardPlanSortScore(card = {}) {
  const tier = Number(card.authorityMatchTier || 4);
  const section = extractNircSectionNumber(card.normalizedReference || card.citation || card.title || "");
  if (tier === 1) return section === null ? 0 : section;
  if (tier === 2) return section === null ? 100 : 100 + section;
  return 1000 + tier * 100 + (section || 0);
}

function finalSourceCardCanonicalKey(card = {}) {
  const ref = safeStr(
    card.normalizedReference ||
      card.normalized_reference ||
      card.citation ||
      card.displayLabel ||
      card.display_label ||
      card.label ||
      card.title ||
      ""
  );
  if (!ref) return "";

  const admin = ref.match(/\b(?:rr|revenue\s+regulations?|revenue\s+regulation)\s*(?:no\.?\s*)?(\d{1,4})[-\s]+(\d{2,4})\b/i);
  if (admin) {
    const number = String(Number(admin[1]));
    const year = admin[2].length === 2 ? `19${admin[2]}` : admin[2];
    return `rr:${number}-${year}`;
  }

  return canonicalSourceKey(ref);
}

function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5) {
  const beforeCards = [
    ...(Array.isArray(existingCards) ? existingCards : []),
    ...(Array.isArray(restoredCards) ? restoredCards : [])
  ];
  const seen = new Set();
  const finalCards = [];
  const droppedDuplicateLabels = [];

  for (const card of beforeCards) {
    const key = finalSourceCardCanonicalKey(card);
    const label = card?.normalizedReference || card?.citation || card?.displayLabel || card?.label || card?.title || "";
    if (!key) continue;
    if (seen.has(key)) {
      droppedDuplicateLabels.push(label || "(unlabeled)");
      continue;
    }
    seen.add(key);
    finalCards.push(card);
    if (finalCards.length >= maxCards) break;
  }

  return {
    finalCards,
    diagnostics: {
      beforeLabels: beforeCards.map(c => c?.normalizedReference || c?.citation || c?.displayLabel || c?.label || c?.title || "?"),
      afterLabels: finalCards.map(c => c?.normalizedReference || c?.citation || c?.displayLabel || c?.label || c?.title || "?"),
      beforeCanonicalKeys: beforeCards.map(c => finalSourceCardCanonicalKey(c)).filter(Boolean),
      afterCanonicalKeys: finalCards.map(c => finalSourceCardCanonicalKey(c)).filter(Boolean),
      droppedDuplicateLabels,
      finalCount: finalCards.length
    }
  };
}

// PATCH-021C: jurisprudence authority promotion rank. For case-law intent
// queries (isJurisprudenceQuery), SUPREME_COURT / CTA_EN_BANC / CTA_DIVISION
// materials must outrank statutes and regulations in the final sources sent
// to the model and in visible source cards. Lower rank = higher priority.
function patch021cJurisprudenceRank(doc = {}) {
  // Inspect every type field: the Step-6 reranker can rewrite authorityType to
  // the coarse "CASE" class while the raw authority_type / metadata still hold
  // the precise court type (validated live in PATCH-021D).
  const candidates = [
    doc.authorityType, doc.authority_type,
    doc.metadata?.authorityType, doc.metadata?.authority_type,
    doc.linkedSourceType
  ]
    .map((v) => String(v || "").trim().toUpperCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
  const has = (...types) => candidates.some((t) => types.includes(t));

  if (has("SUPREME_COURT", "SUPREME_COURT_EN_BANC", "SC")) return 1;
  if (has("CTA_EN_BANC")) return 2;
  if (has("CTA_DIVISION", "COURT_OF_APPEALS")) return 3;
  // Coarse case-law class (reranker output) — court decision of unspecified level.
  if (has("CASE", "CASE_LAW", "JURISPRUDENCE")) return 3;
  if (has("STATUTE", "NIRC", "TAX_CODE", "REPUBLIC_ACT", "RA", "CMTA", "LGC")) return 4;
  if (has("RR", "REVENUE_REGULATION")) return 5;
  if (has("RMC")) return 6;
  if (has("RMO", "RAMO")) return 7;
  return 8;
}

function patch021cIsCaseAuthority(doc = {}) {
  return patch021cJurisprudenceRank(doc) <= 3;
}

// PATCH-021E: build the explicit names of retrieved court decisions from the
// FINAL source set only — never invented, never inferred. Used by the Step 13.5
// naming directive so the model cannot claim no indexed case law was retrieved
// when promoted court sources are sitting in its own source blocks.
function patch021eCaseNamesFromSources(sources = []) {
  const names = [];
  for (const c of Array.isArray(sources) ? sources : []) {
    if (!patch021cIsCaseAuthority(c)) continue;
    const ref = String(
      c.normalizedReference || c.normalized_reference || c.citation || ""
    ).trim();
    const title = String(c.title || c.document_title || c.documentTitle || "")
      .replace(/\.pdf$/i, "")
      .trim();
    let name = "";
    if (title && ref && title.toLowerCase().startsWith(ref.toLowerCase())) {
      name = title; // title already begins with the case reference
    } else if (title && ref) {
      name = `${ref} (${title})`;
    } else {
      name = title || ref;
    }
    if (name) names.push(name);
  }
  return [...new Set(names)];
}

/**
 * For chunks where inferSourceCardRef returned "" (no issuance label derived),
 * attempts to return a safe visible-card reference when targetAuthorities exist.
 *
 * Returns a non-empty string if the chunk's document identity can be tied to a
 * target authority; returns null when it cannot be verified and the chunk should
 * be suppressed (prevents arbitrary docTitle cards from bypassing the whitelist).
 *
 * Rules:
 *   NIRC/statute/tax-code: "Tax Code" when any target is a NIRC/statute provision.
 *     (inferSourceCardRef already returns "Tax Code" for this family, so this helper
 *      acts as a defensive backstop for edge cases.)
 *   RR/RMC/RMO/RAMO: re-attempts inferAdministrativeRef on the document identity blob;
 *     returns the derived label only when it is an exact canonical target match.
 *     A non-matching or empty label → null (suppressed).
 *   RA or unknown linkedType → null (cannot safely verify target match).
 */
function deriveTargetSafeDocumentRef(c, linkedType, targetAuths) {
  if (!targetAuths.length) return null;

  // NIRC/statute family — document-level "Tax Code" is safe when NIRC targets exist
  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a)) ? "Tax Code" : null;
  }

  // Administrative issuances — only allow exact canonical target match
  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    const adminRef = inferAdministrativeRef(sourceCardIdentityBlob(c), linkedType);
    if (adminRef && isTargetAllowedCard(adminRef, linkedType, targetAuths)) return adminRef;
    return null;
  }

  // RA or unknown — cannot safely determine target match from document identity alone
  return null;
}

/**
 * Returns whether a non-target-matched chunk has sufficient affirmative issue
 * relevance to appear as a visible source chip.
 *
 * Leverages the reranker's issueClassificationMatch.matched flag, which is
 * computed by buildIssueClassificationMatch and captures:
 *   • compatible — whether the doc's detected issues are compatible with the query
 *   • issueOverlap — whether query and doc issues share a common issue type
 *   • issueMismatch — whether there is an explicit cross-domain mismatch
 *
 * The `matched` flag is `false` when the reranker explicitly determined that the
 * chunk's subject matter is incompatible with the query (e.g. a VAT section chunk
 * for an EWT query, where detectDocIssues found ["VAT"] and compatible === false).
 *
 * Rules (applied in order — caller should only invoke for non-target chunks):
 *  1. issueMismatch === true  → reject ("issue_mismatch")
 *  2. No issueClassificationMatch data → allow ("no_icm_data") — conservative pass
 *  3. icm.matched === false   → reject ("non_target_no_issue_relevance")
 *  4. icm.matched === true or undefined → allow
 *
 * @param {object} c - Reranked chunk (must have c.issueClassificationMatch)
 * @returns {{ allowed: boolean, reason: string }}
 */
function isIssueRelevantSourceCardCandidate(c) {
  if (c.issueMismatch === true) {
    return { allowed: false, reason: "issue_mismatch" };
  }
  const icm = c.issueClassificationMatch;
  if (!icm || typeof icm !== "object") {
    return { allowed: true, reason: "no_icm_data" };
  }
  if (icm.matched === false) {
    return { allowed: false, reason: "non_target_no_issue_relevance" };
  }
  return { allowed: true, reason: icm.matched === true ? "issue_match" : "unknown_allow" };
}

/**
 * Final outbound consistency sanitizer for source cards.
 *
 * Re-derives the actual document type from each card's stable identity fields
 * (source, document_title, documentTitle) and compares it with the visible chip
 * label type.  Catches mismatches that escaped the per-chunk gates — most commonly
 * a chunk whose DB-stored normalizedReference says "NIRC Sec. X" but whose source
 * field identifies it as an RR or RMC document.
 *
 * Outcomes per card:
 *   consistent              → kept unchanged
 *   inconsistent, relabeled → card re-emitted with corrected RR/RMC label
 *   inconsistent, no label  → card dropped
 *
 * NOTE: targetAuths is accepted for legacy call-site compatibility but is no longer
 * used to drop relabeled cards.  Target-priority ordering is handled upstream by
 * the source-card loop before this function is called.
 */
function sanitizeOutboundSourceCards(cards, targetAuths = []) {
  const result = [];
  for (const card of cards) {
    const labelRef  = (card.normalizedReference || card.citation || "").trim();
    const labelType = sourceCardLabelType(labelRef);

    // No typed chip label — nothing to validate
    if (!labelType) { result.push(sanitizePublicSourceCard(card)); continue; }

    // Re-derive actual document type from the card's source-identity fields.
    // These are set from c.source / c.document_title / c.documentTitle in the loop
    // and survive independently of whatever linkedType was inferred at chunk level.
    const reChunk = {
      source:         card.source         || "",
      document_title: card.document_title || "",
      documentTitle:  card.documentTitle  || ""
    };
    const recomputedType = inferLinkedSourceType(reChunk);
    const effectiveType  = recomputedType || card.linkedSourceType || "";

    // Cannot determine document type — keep as-is
    if (!effectiveType) { result.push(sanitizePublicSourceCard(card)); continue; }

    // Is the label type compatible with the actual document type?
    const consistent =
      labelType === effectiveType ||
      (labelType === "NIRC" && ["NIRC", "STATUTE", "TAX_CODE"].includes(effectiveType)) ||
      (labelType === "RA"   && ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(effectiveType));

    if (consistent) { result.push(sanitizePublicSourceCard(card)); continue; }

    // Inconsistency detected (e.g. "NIRC Sec. 4" label on an RR document).
    // Attempt to derive the correct label from the card's identity fields.
    let correctedRef = "";
    if (["RR", "RMC", "RMO", "RAMO"].includes(effectiveType)) {
      correctedRef = inferAdministrativeRef(sourceCardIdentityBlob(reChunk), effectiveType);
    }

    if (!correctedRef) {
      // Cannot safely relabel — drop the card
      console.warn("[SC SANITIZE] drop (no relabel):", {
        labelRef, labelType, effectiveType, source: reChunk.source || "(none)"
      });
      continue;
    }

    // Accept with corrected label (canonical authority label only; filename stays in documentTitle)
    const newTitle = correctedRef || card.documentTitle || card.document_title || "Source";
    console.warn("[SC SANITIZE] relabeled:", { from: labelRef, to: correctedRef, effectiveType });
    result.push(sanitizePublicSourceCard({
      ...card,
      title:               newTitle,
      citation:            correctedRef,
      normalizedReference: correctedRef,
      normalized_reference: correctedRef,
      linkedSourceType:    effectiveType
    }));
  }

  if (result.length !== cards.length) {
    console.log("[SC SANITIZE] summary:", {
      before: cards.length, after: result.length,
      dropped: cards.length - result.length
    });
  }

  return result;
}

function publicText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

function publicUrl(value = "") {
  const url = safeStr(value).trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function sanitizePublicSourceCard(card = {}) {
  const citation = publicText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicText(card.title) || displayLabel || citation || "Source";
  const normalizedReference = publicText(card.normalizedReference || card.normalized_reference || "");
  const authorityRole = publicText(card.authorityRole || card.authority_role || "");
  const authorityMatchTier = Number(card.authorityMatchTier || card.authority_match_tier || 0);
  // PATCH-023B: bridge all intermediate URL fields to publicUrl.
  // Intermediate cards carry driveViewUrl/url/webViewLink; sanitizePublicSourceCard
  // previously read only publicUrl/public_url, which was never set → all cards lacked
  // clickable URLs in the outbound payload.
  const safeUrl = publicUrl(
    card.publicUrl    || card.public_url    ||
    card.driveViewUrl || card.drive_view_url ||
    card.url          || card.webViewLink    || card.web_view_link || ""
  );

  return {
    title,
    label: displayLabel || title,
    displayLabel: displayLabel || title,
    citation,
    authorityType: publicText(card.authorityType || card.authority_type || ""),
    limitationRequired: card.limitationRequired === true,
    ...(normalizedReference ? { normalizedReference } : {}),
    ...(Number.isFinite(authorityMatchTier) && authorityMatchTier > 0 ? { authorityMatchTier } : {}),
    ...(authorityRole ? { authorityRole } : {}),
    ...(safeUrl ? { publicUrl: safeUrl } : {})
  };
}

function sourceCardFromRetrievedTarget(doc = {}, target = "") {
  const meta = doc.metadata || {};
  const citation = publicText(
    target ||
      doc.citation ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      meta.normalizedReference ||
      meta.normalized_reference ||
      doc.reference ||
      ""
  );
  if (!citation) return null;

  return sanitizePublicSourceCard({
    title: doc.title || doc.documentTitle || doc.document_title || meta.documentTitle || meta.document_title || citation,
    label: citation,
    displayLabel: citation,
    citation,
    normalizedReference:
      doc.normalizedReference ||
      doc.normalized_reference ||
      meta.normalizedReference ||
      meta.normalized_reference ||
      citation,
    normalized_reference:
      doc.normalized_reference ||
      doc.normalizedReference ||
      meta.normalized_reference ||
      meta.normalizedReference ||
      citation,
    authorityType: doc.authorityType || doc.authority_type || meta.authorityType || meta.authority_type || "STATUTE",
    authorityRole: doc.authorityRole || doc.authority_role || meta.authorityRole || meta.authority_role || "",
    authorityMatchTier:
      doc.authorityMatchTier ||
      doc.authority_match_tier ||
      doc.issueClassificationMatch?.authorityMatchTier ||
      meta.authorityMatchTier ||
      meta.authority_match_tier ||
      undefined,
    limitationRequired: doc.limitationRequired === true || doc.limitation_required === true || meta.limitationRequired === true,
    publicUrl: doc.publicUrl || doc.public_url || meta.publicUrl || meta.public_url || "",
    driveViewUrl: doc.driveViewUrl || doc.drive_view_url || meta.driveViewUrl || meta.drive_view_url || "",
    webViewLink: doc.webViewLink || doc.web_view_link || meta.webViewLink || meta.web_view_link || "",
    url: doc.url || meta.url || doc.source_url || meta.source_url || ""
  });
}

function sourceCardDocumentTitle(c = {}) {
  const meta = c.metadata || {};
  return safeStr(
    c.document_title ||
      c.documentTitle ||
      meta.documentTitle ||
      meta.document_title ||
      meta.originalFileName ||
      meta.original_file_name ||
      c.source ||
      c.originalSource ||
      c.original_source ||
      c.path ||
      c.source_path ||
      c.title ||
      "Source"
  ).slice(0, 80);
}

function detectSameStatute(a, b) {
  const normalize = v =>
    safeStr(v?.statute || v?.primaryStatute || v?.normalizedReference || v?.citation || "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  const aS = normalize(a);
  const bS = normalize(b);
  if (!aS || !bS) return false;
  return aS === bS || aS.includes(bS) || bS.includes(aS);
}

function detectSameMaterialFacts(a, b) {
  const extract = v =>
    safeStr(v?.factPattern || v?.facts || v?.factContext || v?.holding || "")
      .toLowerCase();
  const aF = extract(a);
  const bF = extract(b);
  if (!aF && !bF) return null;
  if (!aF || !bF) return null;
  const tokens = t => new Set(t.split(/\W+/).filter(w => w.length > 4));
  const aT = tokens(aF);
  const bT = tokens(bF);
  let overlap = 0;
  for (const t of aT) { if (bT.has(t)) overlap++; }
  return overlap >= 3;
}

export function fourPartDoctrineTest(a, b) {
  const pairAnalysis = analyzeConflictPair(a, b);

  // Parts 1 & 4: sameIssue + oppositeHolding (delegated to existing functions)
  const sameIssueAndOppositeHolding =
    pairAnalysis.genuineConflict === true || isGenuineConflict(a, b);

  // Part 2: same material facts — unknown (null) is a pass-through (benefit of doubt)
  const sameFacts = detectSameMaterialFacts(a, b);
  const factPartPassed = sameFacts === null || sameFacts === true;

  // Part 3: same statute
  const sameStatutePassed = detectSameStatute(a, b);

  const trueConflict = sameIssueAndOppositeHolding && factPartPassed && sameStatutePassed;

  return {
    trueConflict,
    parts: {
      sameIssue:       pairAnalysis.sameIssue?.passed ?? sameIssueAndOppositeHolding,
      sameMaterialFacts: sameFacts,
      sameStatute:     sameStatutePassed,
      oppositeHolding: pairAnalysis.oppositeHolding?.passed ?? sameIssueAndOppositeHolding
    },
    pairAnalysis
  };
}

// ─── Stage 2C: Educational Source Layer ──────────────────────────────────────
// Pure function — no retrieval, no OpenAI, no async.
// Input: reranked chunks (already authority-ranked), responseStyle, query string.
// Output: educationalSources object or null.
// Gate: called only when hook === "/ask" && ctx.mode === "FAST_DEFINITION".

function buildEducationalSources(chunks = [], responseStyle = null, query = "") {
  if (!Array.isArray(chunks) || !chunks.length) return null;

  const STYLE_CONFIG = {
    CONCISE:     { displayStyle: "SOURCE",          label: "Source",          max: 2, allowRMC: false },
    STANDARD:    { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: true  },
    EXPLAIN:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    PROCEDURAL:  { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    EXAMPLE:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 4, allowRMC: true  },
    BEGINNER:    { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: false },
    TAGLISH:     { displayStyle: "LEARN_MORE",      label: "Learn More",      max: 3, allowRMC: false },
    COMPARATIVE: { displayStyle: "COMPARE_SOURCES", label: "Compare Sources", max: 6, allowRMC: true  }
  };
  const cfg = STYLE_CONFIG[responseStyle] || STYLE_CONFIG.STANDARD;

  const WEAK_TYPES  = new Set(["SECONDARY", "UNKNOWN", "CPA_NOTES", "REVIEW_MATERIALS"]);
  const COURT_TYPES = new Set([
    "SUPREME_COURT_EN_BANC", "SUPREME_COURT", "SC",
    "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"
  ]);
  const RMC_TYPES   = new Set(["RMC", "RMO", "RAMO"]);

  function docType(doc) {
    return String(doc.authorityType || doc.authority_type || doc.metadata?.authorityType || "UNKNOWN")
      .trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function docLevel(doc) {
    const n = Number(
      doc.authorityLevel    ?? doc.authority_level    ??
      doc.controllingPrecedence ?? doc.controlling_precedence ??
      doc.metadata?.authorityLevel ?? NaN
    );
    if (Number.isFinite(n) && n > 0) return n;
    const t = docType(doc);
    if (t === "CONSTITUTION")                                             return 1;
    if (["STATUTE","NIRC","TAX_CODE","REPUBLIC_ACT","RA","CMTA","LGC"].includes(t)) return 2;
    if (["TAX_TREATY","TREATY"].includes(t))                             return 3;
    if (t === "SUPREME_COURT_EN_BANC")                                   return 4;
    if (["SUPREME_COURT","SC"].includes(t))                              return 5;
    if (t === "CTA_EN_BANC")                                             return 6;
    if (["CTA_DIVISION","COURT_OF_APPEALS"].includes(t))                 return 7;
    if (["RR","REVENUE_REGULATION"].includes(t))                         return 8;
    if (["RMC","RMO","RAMO"].includes(t))                                return 9;
    if (t === "BIR_RULING")                                              return 10;
    return 99;
  }

  const wantsCase = /\b(doctrine|ruling|case|supreme court|cta|jurisprudence)\b/i.test(query);

  // COMPARATIVE: extract two concept terms from query
  function extractComparativeTerms(q) {
    const pats = [
      /difference between\s+(.+?)\s+and\s+(.+)/i,
      /compare\s+(.+?)\s+(?:and|vs\.?)\s+(.+)/i,
      /(.+?)\s+vs\.?\s+(.+)/i,
      /(.+?)\s+versus\s+(.+)/i
    ];
    for (const re of pats) {
      const m = q.match(re);
      if (m?.[1] && m?.[2]) {
        const a = m[1].trim().replace(/[?]+$/, "").trim();
        const b = m[2].trim().replace(/[?]+$/, "").trim();
        if (a.length > 1 && a.length < 50 && b.length > 1 && b.length < 50) return [a, b];
      }
    }
    return [];
  }

  const comparativeTerms =
    responseStyle === "COMPARATIVE" ? extractComparativeTerms(query) : [];

  // Assign a comparative group only if one concept clearly dominates.
  // Generic words ("tax") are excluded to avoid false matches.
  const GENERIC_WORDS = new Set(["tax", "the", "and", "for", "not", "are", "this", "that"]);
  function assignGroup(doc, chipLabel) {
    if (comparativeTerms.length !== 2) return null;
    const blob = [
      chipLabel,
      String(doc.title || ""),
      String(doc.source || ""),
      String(doc.text || doc.content || "").slice(0, 300),
      String(doc.normalizedReference || doc.normalized_reference || "")
    ].join(" ").toLowerCase();
    const scores = comparativeTerms.map(term => {
      const words = term.toLowerCase().split(/\s+/)
        .filter(w => w.length >= 3 && !GENERIC_WORDS.has(w));
      if (!words.length) return 0;
      return words.filter(w => {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${esc}\\b`).test(blob);
      }).length;
    });
    if (scores[0] === scores[1]) return null;
    const winner = comparativeTerms[scores[0] > scores[1] ? 0 : 1];
    return winner.charAt(0).toUpperCase() + winner.slice(1);
  }

  // Filter to educational-quality authorities only
  const eligible = chunks.filter(doc => {
    const t   = docType(doc);
    const lvl = docLevel(doc);
    if (WEAK_TYPES.has(t))               return false;
    if (COURT_TYPES.has(t) && !wantsCase) return false;
    if (RMC_TYPES.has(t) && !cfg.allowRMC) return false;
    if (lvl > 10)                         return false;
    return true;
  });

  if (!eligible.length) return null;

  // Build chips; deduplicate by normalized label, prefer entry with URL.
  // Learn More must show document-level labels ("NIRC 1997 as amended"),
  // NOT provision-level labels ("NIRC Sec. 105") — those belong in sourceCards.
  // Multiple chunks from the same parent document collapse to one chip here.
  const seen = new Map();
  for (const doc of eligible) {
    // Document-level title: prefer explicit document_title metadata over filename.
    const rawDocTitle   = String(
      doc.document_title    || doc.documentTitle    ||
      doc.metadata?.documentTitle || doc.metadata?.document_title ||
      doc.metadata?.originalFileName || doc.metadata?.original_file_name ||
      ""
    ).trim();
    const issuanceLabel = inferIssuanceNumber(doc);
    // Section-level provision references ("NIRC Sec. 105") belong in sourceCards.
    // For Learn More use the broader parent document label instead.
    const isSection     = /\bsec(?:tion)?\.?\s*\d/i.test(issuanceLabel);
    const fallback      = sourceTitleOf(doc)?.slice(0, 60) || "";
    const chipLabel     = rawDocTitle
      ? rawDocTitle.slice(0, 80)
      : (isSection ? fallback : (issuanceLabel || fallback));
    if (!chipLabel) continue;

    const normKey = chipLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normKey) continue;

    const meta = doc.metadata || {};
    const url  =
      doc.driveViewUrl  || doc.drive_view_url   ||
      doc.url           || doc.webViewLink       ||
      doc.web_view_link || doc.sourceUrl         ||
      doc.source_url    ||
      meta.driveViewUrl || meta.drive_view_url   ||
      meta.url          || meta.webViewLink       ||
      meta.web_view_link || meta.sourceUrl        ||
      meta.source_url   || null;

    const lvl  = docLevel(doc);
    const kind = lvl <= 3 ? "primary" : lvl <= 9 ? "regulation" : lvl === 10 ? "ruling" : "other";
    const title = String(
      rawDocTitle || doc.title || doc.document_title || doc.documentTitle || doc.source || chipLabel
    ).slice(0, 120);

    const chip = { label: chipLabel, title, url, group: assignGroup(doc, chipLabel), kind };
    if (!seen.has(normKey)) {
      seen.set(normKey, chip);
    } else if (url && !seen.get(normKey).url) {
      seen.set(normKey, chip);
    }
  }

  const chips = Array.from(seen.values()).slice(0, cfg.max);
  if (!chips.length) return null;

  return {
    label:         cfg.label,
    responseStyle: responseStyle || "STANDARD",
    displayStyle:  cfg.displayStyle,
    chips
  };
}

// ─── Source Availability Classification ──────────────────────────────────────

/**
 * Classifies source availability after all filtering stages are complete.
 * Must be called ONLY after filterDisplayedSourcesByDirectSupport has run.
 *
 * Invariant: AUTHORITY_FOUND requires displayedCount > 0 (renderer-visible cards).
 * acceptedSourceCount alone never produces AUTHORITY_FOUND.
 *
 * Priority order:
 *  1. AUTHORITY_FOUND      — displayedCount > 0 (visible cards exist; timeout is diagnostic only)
 *  2. RETRIEVAL_TIMEOUT    — timedOut and no visible card
 *  3. SOURCE_LOOKUP_EMPTY  — /source or SOURCE_LOOKUP mode with no visible card
 *  4. RELATED_AUTHORITY_ONLY — retrieved/accepted chunks exist but none survived to visible card
 *  5. NO_INDEXED_SOURCE    — nothing retrieved, no timeout
 *
 * acceptedSourceCount > 0 upgrades the no-visible-card path from NO_INDEXED_SOURCE to
 * RELATED_AUTHORITY_ONLY (sources were retrieved and passed Gates 1–3 but were filtered
 * out before display).  It never claims AUTHORITY_FOUND.
 *
 * timedOut is always preserved as retrievalTimedOut in the return value for diagnostics.
 */
function computeSourceAvailability({
  mode,
  hook,
  rerankedChunks,
  finalSourceCards,
  retrievalDiagnostics,
  acceptedSourceCount = 0
}) {
  const timedOut       = Boolean(retrievalDiagnostics?.timedOut);
  const isSourceLookup = String(mode || "").toUpperCase() === "SOURCE_LOOKUP" || hook === "/source";
  const rerankedCount  = Array.isArray(rerankedChunks) ? rerankedChunks.length : 0;
  const displayedCount = Array.isArray(finalSourceCards) ? finalSourceCards.length : 0;

  let sourceAvailability;
  let sourceAvailabilityReason;

  if (displayedCount > 0) {
    // Only path that may produce AUTHORITY_FOUND — visible cards must exist.
    sourceAvailability      = "AUTHORITY_FOUND";
    sourceAvailabilityReason = timedOut
      ? `${displayedCount} direct-support source card(s) verified; partial retrieval timeout occurred but authority found.`
      : `${displayedCount} direct-support source card(s) passed all filters.`;
  } else if (timedOut) {
    sourceAvailability      = "RETRIEVAL_TIMEOUT";
    sourceAvailabilityReason = "Retrieval timed out; no indexed source verification was possible.";
  } else if (isSourceLookup) {
    sourceAvailability      = "SOURCE_LOOKUP_EMPTY";
    sourceAvailabilityReason = "SOURCE_LOOKUP mode: no indexed source card survived the direct-support filter.";
  } else if (rerankedCount > 0 || acceptedSourceCount > 0) {
    // Chunks were retrieved and/or passed pre-filter gates, but none survived to a
    // visible source card.  acceptedSourceCount > 0 prevents misclassification as
    // NO_INDEXED_SOURCE when sources did exist — just filtered before display.
    sourceAvailability      = "RELATED_AUTHORITY_ONLY";
    sourceAvailabilityReason = acceptedSourceCount > 0
      ? `${acceptedSourceCount} accepted authority source(s) retrieved but no source card survived display filtering.`
      : `${rerankedCount} reranked chunk(s) retrieved but no source card survived direct-support filter.`;
  } else {
    sourceAvailability      = "NO_INDEXED_SOURCE";
    sourceAvailabilityReason = "No reranked chunks retrieved and retrieval did not time out.";
  }

  return {
    sourceAvailability,
    sourceStatus:             sourceAvailability,
    sourceAvailabilityReason,
    retrievalTimedOut:        timedOut,
    retrievedSourceCount:     rerankedCount,
    displayedSourceCount:     displayedCount,
    relatedSourceCount:       sourceAvailability === "RELATED_AUTHORITY_ONLY" ? rerankedCount : 0
  };
}

function _saeOutcomeCategory(input = {}) {
  return String(
    input.outcomeCategory ||
    input.retrievalMeta?.outcomeCategory ||
    input.retrievalMeta?.retrievalMeta?.outcomeCategory ||
    ""
  ).toUpperCase();
}

function _saeFallbackStatus(input = {}) {
  return String(input.fallbackStatus?.saeStatus || input.fallbackStatus || "").toUpperCase();
}

const SAE_SOURCE_CARD_SUPPRESSED_STATUSES = new Set([
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "NO_INDEXED_SOURCE"
]);

function sourceCardsSuppressedBySaeStatus(saeStatus = "") {
  return SAE_SOURCE_CARD_SUPPRESSED_STATUSES.has(String(saeStatus || "").toUpperCase());
}

function syncPatch017gSourceState(ctx = {}, {
  visibleSourceCount = 0,
  reason = "authority_lock_with_visible_cards"
} = {}) {
  const priorSaeStatus = ctx.saeStatus || ctx.sourceAvailability?.saeStatus || "";
  const hasAuthorityLock =
    ctx.authorityLockApplied === true ||
    ctx._fastEwtAuthorityPath === true ||
    (ctx.preGenerationSourceCards?.length || 0) > 0;
  const hasAuthorityFound =
    ctx.saeStatus === "AUTHORITY_FOUND" ||
    ctx.sourceAvailability?.saeStatus === "AUTHORITY_FOUND";
  const hasVisibleAuthorityCards =
    (ctx.preGenerationSourceCards?.length || 0) > 0 ||
    (ctx.sourceCards?.length || 0) > 0 ||
    visibleSourceCount > 0;

  if (!(hasAuthorityLock && hasAuthorityFound && hasVisibleAuthorityCards)) {
    return false;
  }

  const statusReason =
    "[PATCH-017G] Authority-locked EWT source cards preserved after source-state synchronization.";
  ctx.saeStatus = "AUTHORITY_FOUND";
  ctx.limitationRequired = false;
  ctx.disclosureType = null;
  ctx.statusReason = statusReason;
  ctx.sourceAvailability = {
    ...(ctx.sourceAvailability || {}),
    saeStatus: "AUTHORITY_FOUND",
    sourceAvailability: "AUTHORITY_FOUND",
    sourceStatus: "AUTHORITY_FOUND",
    limitationRequired: false,
    disclosureType: null,
    statusReason,
    sourceAvailabilityReason: statusReason
  };

  console.log("[PATCH_017G_SOURCE_STATE_SYNC]", {
    priorSaeStatus,
    finalSaeStatus: ctx.saeStatus,
    authorityLockApplied: ctx.authorityLockApplied === true,
    fastEwtAuthorityPath: ctx._fastEwtAuthorityPath === true,
    preGenCardCount: ctx.preGenerationSourceCards?.length || 0,
    sourceCardCount: ctx.sourceCards?.length || 0,
    visibleSourceCount,
    reason
  });
  return true;
}

function _saeIsParsed(candidate = {}) {
  if (candidate.isParsed === true) return true;
  if (candidate.authorityAnnotation?.isParsed === true) return true;
  return String(candidate.parseStatus || candidate.parse_status || "").toLowerCase() === "success";
}

function _saeHasRequiredAuthorityLevel(candidate = {}) {
  const required = candidate.requiredAuthorityLevel ?? candidate.authorityAnnotation?.requiredAuthorityLevel;
  const actual = candidate.authorityLevel ?? candidate.authorityAnnotation?.authorityLevel;
  if (!Number.isFinite(Number(required))) return true;
  if (!Number.isFinite(Number(actual))) return false;
  return Number(actual) <= Number(required);
}

function _saeSuppressionReason(candidate = {}) {
  if (!_saeIsParsed(candidate)) return "SOURCE_PARSE_ERROR";
  if (candidate.isIndexed !== true && candidate.authorityAnnotation?.isIndexed !== true) return "NOT_INDEXED";
  if (candidate.authorityRole !== "GOVERNING") return "NON_GOVERNING_AUTHORITY";
  if (candidate.directlyGovernsIssue !== true) return "DOES_NOT_DIRECTLY_GOVERN_ISSUE";
  if (candidate.higherAuthorityMissing === true) return "HIGHER_AUTHORITY_MISSING";
  if (!_saeHasRequiredAuthorityLevel(candidate)) return "REQUIRED_AUTHORITY_LEVEL_NOT_SATISFIED";
  return "NOT_ELIGIBLE_FOR_AUTHORITY_FOUND";
}

function _saeAuthorityType(candidate = {}) {
  return String(
    candidate.authorityType ||
      candidate.authority_type ||
      candidate.authorityAnnotation?.authorityType ||
      candidate.metadata?.authorityType ||
      "UNKNOWN"
  ).toUpperCase();
}

function _saeHasRelatedIssueSignal(candidate = {}) {
  const match = candidate.issueClassificationMatch || {};
  return Boolean(
    candidate.directlyGovernsIssue === true ||
      candidate.exactAuthorityMatch === true ||
      candidate.targetAuthorityMatch === true ||
      match.exactAuthorityMatch === true ||
      match.targetAuthorityMatch === true ||
      match.matched === true ||
      match.issueOverlap === true ||
      Number(candidate.citationMatchBonus || 0) > 0 ||
      Number(candidate.confidence || candidate.authorityAnnotation?.confidence || 0) >= 0.35
  );
}

function _saeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function _saeHasConcreteAuthorityPlan(issueClassification = {}) {
  const authorityGroups = issueClassification.targetAuthorityGroups || {};
  const planned = [
    ..._saeArray(issueClassification.targetAuthorities),
    ..._saeArray(issueClassification.controllingAuthorities),
    ..._saeArray(issueClassification.supportingAuthorities),
    ..._saeArray(issueClassification.supportingJurisprudence),
    ..._saeArray(authorityGroups.controllingAuthorities),
    ..._saeArray(authorityGroups.supportingAuthorities),
    ..._saeArray(authorityGroups.supportingJurisprudence)
  ];

  return planned.some((authority) => {
    const text = String(authority || "").trim();
    if (!text) return false;
    if (/^applicable\b/i.test(text)) return false;
    if (/\bprimary statute provisions?\b/i.test(text)) return false;
    if (/\brevenue regulations?\s*\/\s*bir issuances?\b/i.test(text)) return false;
    return true;
  });
}

function _saeHasConcreteRelatedIssueSignal(candidate = {}, issueClassification = {}) {
  const match = candidate.issueClassificationMatch || {};
  const hasConcreteAuthorityPlan = _saeHasConcreteAuthorityPlan(issueClassification);
  const exactOrTargetAuthorityMatch = Boolean(
    candidate.exactAuthorityMatch === true ||
      candidate.targetAuthorityMatch === true ||
      match.exactAuthorityMatch === true ||
      match.targetAuthorityMatch === true ||
      Number(candidate.citationMatchBonus || 0) > 0
  );
  const issueFamilyMatch = Boolean(match.matched === true || match.issueOverlap === true);

  if (candidate.directlyGovernsIssue === true) return true;
  if (exactOrTargetAuthorityMatch && hasConcreteAuthorityPlan) return true;
  if (issueFamilyMatch && hasConcreteAuthorityPlan) return true;

  return false;
}

function _saeIsRelatedAuthorityCandidate(candidate = {}, issueClassification = {}) {
  const role = String(candidate.authorityRole || candidate.authorityAnnotation?.authorityRole || "UNKNOWN").toUpperCase();
  const type = _saeAuthorityType(candidate);
  if (role === "GOVERNING" || role === "UNKNOWN" || role === "SECONDARY") return false;
  if (["UNKNOWN", "SECONDARY", "REVIEWER", "CPA_NOTES", "REVIEW_MATERIALS"].includes(type)) return false;
  return (
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    _saeHasRelatedIssueSignal(candidate) &&
    _saeHasConcreteRelatedIssueSignal(candidate, issueClassification)
  );
}

export function patch027nIsBroadWithholdingDefinitionQuery(query = "", issueClassification = {}) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return false;

  const primary = String(issueClassification.primaryIssue || "").toUpperCase();
  const domain = String(
    issueClassification.primaryDomain ||
      issueClassification.primaryDomainCode ||
      issueClassification.domainCode ||
      ""
  ).toUpperCase();
  const subIssue = String(issueClassification.subIssue || "").toUpperCase();
  const isWht =
    primary === "WITHHOLDING" ||
    primary === "WHT" ||
    domain === "WHT" ||
    domain.includes("WITHHOLDING") ||
    subIssue === "WITHHOLDING_TAX_DEFINITION";
  if (!isWht) return false;

  // Path 1 (unchanged): "what is withholding tax" / "explain withholding tax" exact forms.
  const _withholdingTaxShape =
    /^(?:what\s+is|define|explain)\s+(?:the\s+)?withholding\s+tax\s*[\?\.!]?$/i.test(q);
  if (_withholdingTaxShape) {
    return !/\b(?:ewt|expanded\s+withholding|cwt|fwt|final\s+withholding|creditable\s+withholding|rate|subject\s+to|applicab|classification|categor|payor|payer|payee|withholding\s+agent|advertising|professional|contractor|service|income\s+payment|rr\s*(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998)|revenue\s+regulations?\s+(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998))\b/i.test(q);
  }

  // PATCH-027O Path 2: EWT acronym and expanded-name definitional forms.
  // "explain EWT", "what is EWT?", "what is the EWT?", "define EWT", "define the EWT",
  // "explain the EWT", "explain expanded withholding tax", etc.
  // When the EWT acronym or full name is the sole subject of a definition/explanation
  // request it is a broad definition request, not a specific rate or applicability inquiry.
  const _ewtAcronymShape =
    /^(?:what\s+is|define|explain)\s+(?:the\s+)?(?:ewt|expanded\s+withholding\s+tax)\s*[\?\.!]?$/i.test(q);
  if (!_ewtAcronymShape) return false;

  // Exclude if specificity terms appear alongside the EWT acronym — these signals indicate
  // the query goes beyond a generic definition despite the EWT-acronym opener.
  // Note: "ewt" and "expanded withholding" are intentionally absent from this exclusion
  // list — they are the query subject here, not specificity signals.
  return !/\b(?:rate|percentage|subject\s+to|applicab|classification|categor|payor|payer|payee|withholding\s+agent|advertising|professional|contractor|service|income\s+payment|cwt|fwt|final\s+withholding|creditable\s+withholding|rr\s*(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998)|revenue\s+regulations?\s+(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998))\b/i.test(q);
}

export function patch027nHasSpecificWhtFastPathSignal(query = "", issueClassification = {}) {
  const q = String(query || "");
  if (patch027nIsBroadWithholdingDefinitionQuery(q, issueClassification)) return false;

  return /\b(?:ewt|expanded\s+withholding|cwt|fwt|final\s+withholding|creditable\s+withholding|rate|subject\s+to|applicab|classification|categor|payor|payer|payee|withholding\s+agent|advertising|professional|contractor|service|income\s+payment|rr\s*(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998)|revenue\s+regulations?\s+(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998))\b/i.test(q);
}

// PATCH-027O: Determines whether a WHT/EWT query is rate-seeking (specific) or
// generic (definitional). Used by the fast-EWT compact prompt to avoid instructing
// the model to "State the applicable rate" when the user only asked for a general
// explanation of EWT. Rate-seeking signals: explicit mention of rate, percentage,
// specific payment category (advertising, service, professional), or party roles.
export function patch027oIsEwtRateSeeking(query = "") {
  return /\b(?:rates?|percentage|subject\s+to|applicabl(?:e|ity)?|classification|categor|payor|payer|payee|withholding\s+agent|advertising|professional|contractor|service|income\s+payment)\b/i.test(
    String(query || "")
  );
}

function patch027nHasJurisprudenceIntent(query = "", issueClassification = {}) {
  return Boolean(
    issueClassification.isJurisprudenceQuery === true ||
      issueClassification.requiresJurisprudence === true ||
      issueClassification.downstreamRouting?.useJurisprudenceEngine === true ||
      /\b(cases?|jurisprudence|case\s+law|ruling[s]?|supreme\s+court|cta\b|court\s+decision)\b/i.test(String(query || ""))
  );
}

function patch027nIsCourtAuthority(candidate = {}) {
  const type = _saeAuthorityType(candidate).replace(/[\s-]+/g, "_");
  return ["CASE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "COURT_DECISION"].includes(type);
}

function patch027nIsStatutoryAuthority(candidate = {}) {
  const type = _saeAuthorityType(candidate).replace(/[\s-]+/g, "_");
  return ["NIRC", "STATUTE", "TAX_CODE", "REPUBLIC_ACT", "RA"].includes(type);
}

/**
 * Classifies source availability before prompt assembly.
 *
 * Priority order:
 *  1. RETRIEVAL_TIMEOUT
 *  2. SOURCE_LOOKUP_EMPTY
 *  3. SOURCE_PARSE_ERROR
 *  4. AUTHORITY_FOUND
 *  5. RELATED_AUTHORITY_ONLY
 *  6. NO_INDEXED_SOURCE
 */
export function classifySourceAvailability(input = {}) {
  const annotatedCandidates = Array.isArray(input.annotatedCandidates)
    ? input.annotatedCandidates
    : [];
  const issueClassification = input.issueClassification || {};
  const query = String(input.query || "");
  const outcomeCategory = _saeOutcomeCategory(input);
  const fallbackStatus = _saeFallbackStatus(input);
  const retrievalTimedOut =
    outcomeCategory === "RETRIEVAL_TIMEOUT" ||
    fallbackStatus === "RETRIEVAL_TIMEOUT" ||
    input.retrievalDiagnostics?.timedOut === true ||
    input.retrievalMeta?.retrievalDiagnostics?.timedOut === true;

  const eligibleCandidates = annotatedCandidates.filter((candidate) =>
    candidate.authorityRole === "GOVERNING" &&
    candidate.directlyGovernsIssue === true &&
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    candidate.higherAuthorityMissing === false
  );
  const semanticNoMatchGuardActive = hasSemanticNoMatchGuard(issueClassification);
  // PATCH-017B: use query string (not issueClassification object); function now returns boolean.
  const semanticNoMatchCandidateMatched =
    !semanticNoMatchGuardActive ||
    annotatedCandidates.some((candidate) =>
      sourceMaterialTermsMatchAuthority(candidate, query)
    );
  const suppressedCandidates = annotatedCandidates
    .filter((candidate) => !eligibleCandidates.includes(candidate))
    .map((candidate) => ({
      ...candidate,
      sourceAvailabilitySuppressionReason: _saeSuppressionReason(candidate)
    }));

  const base = {
    eligibleCandidates,
    suppressedCandidates,
    limitationRequired: true,
    disclosureType:    "LIMITATION",
    statusReason:      ""
  };

  // PATCH-018A: Reconciliation guard — if timedOut but candidates exist, block RETRIEVAL_TIMEOUT
  // override and fall through to normal classification with those candidates.
  // True timeout (zero candidates) still returns RETRIEVAL_TIMEOUT.
  if (retrievalTimedOut) {
    if (annotatedCandidates.length > 0) {
      console.log("[PATCH_018A_SAE_TIMEOUT_OVERRIDE_BLOCKED]", {
        annotatedCandidateCount: annotatedCandidates.length,
        retrievalTimedOut:       true,
        reason:                  "retrieval_returned_usable_candidates_despite_timeout_signal"
      });
      // Fall through to normal classification below
    } else {
      return {
        ...base,
        saeStatus:      "RETRIEVAL_TIMEOUT",
        disclosureType: "RETRIEVAL_TIMEOUT",
        statusReason:  "Retrieval timed out; source availability could not be verified within the retrieval window."
      };
    }
  }

  if (outcomeCategory === "NO_CANDIDATES" && annotatedCandidates.length === 0) {
    return {
      ...base,
      saeStatus:      "SOURCE_LOOKUP_EMPTY",
      disclosureType: "SOURCE_LOOKUP_EMPTY",
      statusReason:  "Retrieval completed successfully and returned zero candidates."
    };
  }

  if (
    annotatedCandidates.length > 0 &&
    annotatedCandidates.every((candidate) => !_saeIsParsed(candidate))
  ) {
    return {
      ...base,
      saeStatus:      "SOURCE_PARSE_ERROR",
      disclosureType: "SOURCE_PARSE_ERROR",
      statusReason:  "Candidates were retrieved, but all relevant candidates failed source parsing."
    };
  }

  const jurisprudenceIntent = patch027nHasJurisprudenceIntent(query, issueClassification);
  if (jurisprudenceIntent && eligibleCandidates.length > 0) {
    const courtEligibleCandidates = eligibleCandidates.filter(patch027nIsCourtAuthority);
    if (courtEligibleCandidates.length === 0) {
      console.log("[PATCH_027N_CASE_QUERY_AUTHORITY_FOUND_BLOCKED]", {
        query: query.slice(0, 120),
        eligibleCount: eligibleCandidates.length,
        reason: "case_law_intent_requires_court_authority_for_authority_found"
      });
      return {
        ...base,
        saeStatus:      "RELATED_AUTHORITY_ONLY",
        disclosureType: "RELATED_AUTHORITY_ONLY",
        statusReason:  "[PATCH-027N] Case/jurisprudence query: statute/RR authority cannot alone support AUTHORITY_FOUND."
      };
    }
  }

  if (
    patch027nIsBroadWithholdingDefinitionQuery(query, issueClassification) &&
    eligibleCandidates.length > 0 &&
    !eligibleCandidates.some(patch027nIsStatutoryAuthority)
  ) {
    console.log("[PATCH_027N_BROAD_WHT_RR_ONLY_AUTHORITY_FOUND_BLOCKED]", {
      query: query.slice(0, 120),
      eligibleCount: eligibleCandidates.length,
      reason: "broad_withholding_definition_requires_statutory_candidate_for_authority_found"
    });
    return {
      ...base,
      saeStatus:      "RELATED_AUTHORITY_ONLY",
      disclosureType: "RELATED_AUTHORITY_ONLY",
      statusReason:  "[PATCH-027N] Broad withholding definition: RR/admin authority alone cannot support AUTHORITY_FOUND."
    };
  }

  if (eligibleCandidates.length > 0) {
    return {
      ...base,
      saeStatus:          "AUTHORITY_FOUND",
      limitationRequired: false,
      disclosureType:     null,
      statusReason:       `${eligibleCandidates.length} governing indexed parsed candidate(s) directly govern the issue.`
    };
  }

  if (semanticNoMatchGuardActive && !semanticNoMatchCandidateMatched) {
    // PATCH-018A: log when NO_INDEXED_SOURCE would fire but candidates exist (override blocked diagnostic)
    if (annotatedCandidates.length > 0) {
      console.log("[PATCH_018A_NO_INDEXED_SOURCE_OVERRIDE_BLOCKED]", {
        reason:         "semantic_no_match_guard_active_with_existing_candidates",
        candidateCount: annotatedCandidates.length,
        guardActive:    true
      });
    }
    return {
      ...base,
      saeStatus:      "NO_INDEXED_SOURCE",
      disclosureType: "NO_INDEXED_SOURCE",
      statusReason:  "Retrieved generic tax candidates did not match the query's material transaction qualifiers."
    };
  }

  const hasRelatedAuthority = annotatedCandidates.some((candidate) =>
    _saeIsRelatedAuthorityCandidate(candidate, issueClassification)
  );
  if (hasRelatedAuthority) {
    return {
      ...base,
      saeStatus:      "RELATED_AUTHORITY_ONLY",
      disclosureType: "RELATED_AUTHORITY_ONLY",
      statusReason:  "Indexed candidates exist, but none satisfy governing direct-authority requirements."
    };
  }

  // PATCH-018A: For case/jurisprudence queries, if only statute/RR authority is found,
  // return RELATED_AUTHORITY_ONLY instead of NO_INDEXED_SOURCE.
  const _018aCaseQuery = /\b(cases?|jurisprudence|ruling[s]?|supreme\s+court|cta\b)/i.test(query);
  if (_018aCaseQuery && annotatedCandidates.length > 0) {
    const _018aHasStatuteOrRr = annotatedCandidates.some(c => {
      const t = String(c.authorityType || c.authority_type || c.authorityAnnotation?.authorityType || "").toUpperCase().replace(/[\s-]+/g, "_");
      return ["NIRC", "STATUTE", "TAX_CODE", "RR", "REVENUE_REGULATION", "REPUBLIC_ACT", "RA"].includes(t);
    });
    if (_018aHasStatuteOrRr) {
      console.log("[PATCH_018A_CASE_QUERY_RELATED_AUTHORITY_DOWNGRADE]", {
        query:           query.slice(0, 120),
        annotatedCount:  annotatedCandidates.length,
        reason:          "case_jurisprudence_query_statute_rr_only_downgraded_to_related_authority_only"
      });
      return {
        ...base,
        saeStatus:      "RELATED_AUTHORITY_ONLY",
        disclosureType: "RELATED_AUTHORITY_ONLY",
        statusReason:  "[PATCH-018A] Case/jurisprudence query: related statute/RR authority found but no case authority satisfied direct-govern requirements."
      };
    }
  }

  console.warn("[SOURCE AVAILABILITY] NO_INDEXED_SOURCE emitted", {
    outcomeCategory,
    candidateCount: annotatedCandidates.length
  });
  return {
    ...base,
    saeStatus:      "NO_INDEXED_SOURCE",
    disclosureType: "NO_INDEXED_SOURCE",
    statusReason:  "No indexed source candidate satisfied source availability classification."
  };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function runPipeline({
  query,
  hook = "/ask",
  supabase,
  openai,
  model,
  conversationHistory = [],
  issueClassificationOverride = null,
  modeOverride = null,
  instrumentationReceiver = null,
  routeBudgetMs = ROUTE_BUDGET_MS,
  pipelineDiagnostics = null,
  requestId = null
} = {}) {
  const trace          = { steps: [], warnings: [] };
  const ctx            = {};
  const traceId        = generateTraceId();
  const pipelineStartMs = Date.now();
  const timing         = createPipelineInstrumentation({ budgetMs: routeBudgetMs });
  const publishDiagnostics = (timeout = false) => {
    const diagnostics = timing.diagnostics(timeout);
    if (typeof instrumentationReceiver === "function") {
      instrumentationReceiver(diagnostics);
    }
    return diagnostics;
  };

  publishDiagnostics(false);
  const diagnostics = ensurePipelineDiagnostics(pipelineDiagnostics, {
    requestStartedAt: pipelineStartMs,
    route: hook,
    model,
    budgetMs: routeBudgetMs,
    requestId: requestId || traceId
  });

  startTrace({
    traceId,
    name: "tina-pipeline",
    hook,
    metadata: {
      queryLength:     (query || "").length,
      pipelineVersion: PIPELINE_VERSION,
      hook
    }
  });

  // ── Defense-in-depth: Philippine Tax Domain Boundary (FAIL-CLOSED) ─────────
  // Catches any direct call to runPipeline() that bypassed ask-handler.js.
  // Both REJECT and CLARIFY abort the pipeline — no retrieval, no OpenAI.
  {
    const _pipelineBoundaryCheck = detectPhilippineTaxBoundary(query || "", hook || "/ask");
    console.log("[PIPELINE DOMAIN BOUNDARY CHECK]", {
      query:           (query || "").slice(0, 120),
      hook,
      detectedDomain:  _pipelineBoundaryCheck.detectedDomain,
      isPhilippineTax: _pipelineBoundaryCheck.isPhilippineTax,
      decision:        _pipelineBoundaryCheck.decision,
      reason:          _pipelineBoundaryCheck.reason,
      confidence:      _pipelineBoundaryCheck.confidence,
    });
    if (_pipelineBoundaryCheck.decision === "REJECT" || _pipelineBoundaryCheck.decision === "CLARIFY") {
      console.log("[PIPELINE DOMAIN BOUNDARY REJECTED]", {
        query:      (query || "").slice(0, 120),
        hook,
        decision:   _pipelineBoundaryCheck.decision,
        reason:     _pipelineBoundaryCheck.reason,
        confidence: _pipelineBoundaryCheck.confidence,
        blocked:    true,
      });
      endTrace({ traceId, name: "tina-pipeline", status: "DOMAIN_BOUNDARY_REJECT", hook });
      markPipelineCheckpoint(diagnostics, "RESPONSE_COMPLETE", {
        timingField: "responseCompletedAt",
        mode: ctx.mode || "",
        route: hook,
        model,
        sourceAvailabilityStatus: "DOMAIN_BOUNDARY_REJECT"
      });
      finalizePipelineDiagnostics(diagnostics);
      return {
        answer:                   BOUNDARY_REJECTION_MESSAGE,
        sources:                  [],
        sourcesUsed:              [],
        sourceCards:              [],
        vectorMatches:            0,
        retrievedSourceCount:     0,
        displayedSourceCount:     0,
        relatedSourceCount:       0,
        sourceStatus:             "DOMAIN_BOUNDARY_REJECT",
        domainBoundary:           true,
        domainBoundaryDecision:   _pipelineBoundaryCheck.decision,
        domainBoundaryReason:     _pipelineBoundaryCheck.reason,
        domainBoundaryConfidence: _pipelineBoundaryCheck.confidence,
        detectedDomain:           _pipelineBoundaryCheck.detectedDomain,
        pipelineVersion:          PIPELINE_VERSION,
        diagnostics:              publishDiagnostics(false),
        diagnostics,
        pipelineTimings:          diagnostics.pipelineTimings,
        pipelineStageDurations:   diagnostics.pipelineStageDurations,
        partialPipelineState:     diagnostics.partialPipelineState,
        openaiCalls:              diagnostics.openaiCalls
      };
    }
  }
  // ── End Defense-in-depth ──────────────────────────────────────────────────

  // ── Step 1: Issue Classification ──────────────────────────────────────────
  markPipelineCheckpoint(diagnostics, "CLASSIFICATION_STARTED", {
    timingField: "classificationStartedAt",
    mode: ctx.mode || "",
    route: hook,
    model
  });
  ctx.issueClassification = issueClassificationOverride || classify(query);
  diagnostics.partialPipelineState.classificationCompleted = true;
  markPipelineCheckpoint(diagnostics, "CLASSIFICATION_COMPLETE", {
    timingField: "classificationCompletedAt",
    mode: ctx.mode || "",
    route: hook,
    model
  });
  trace.steps.push({ step: 1, name: "issueClassification", done: true });

  // ── Step 2: Sub-Prompt / Mode Routing ────────────────────────────────────
  // Hook takes precedence over issue-classification mode for explicit route modes.
  const HOOK_MODE_MAP = {
    "/case":       "CASE_ANALYSIS",
    "/audit":      "COMPLEX_ADVISORY",
    "/review":     "REVIEWER_MODE",
    "/quiz":       "QUIZ_MODE",
    "/diagnostic": "QUIZ_MODE",
    "/source":     "SOURCE_LOOKUP",
    "/tax":        "SENIOR_COUNSEL_MEMO",
    "/patch":      "CODE_PATCH_MODE",
    "/debug":      "DEBUG_MODE",
    "/progress":   "UTILITY",
    "/feedback":   "UTILITY"
  };
  const primaryIssue   = ctx.issueClassification?.primaryIssue || "GENERAL_TAX";
  ctx.routingMetadata  = getModeRoutingMetadata(primaryIssue);
  ctx.mode             = modeOverride || HOOK_MODE_MAP[hook] || ctx.routingMetadata?.mode || "STANDARD_TAX_MODE";
  trace.steps.push({ step: 2, name: "subPromptRouting", mode: ctx.mode, hook, done: true });

  // ── Step 3: Authority Ranking (by Source Hierarchy — Law 2) ──────────────
  const rawTargets     = ctx.issueClassification?.targetAuthorities || [];
  const authorityDocs  = rawTargets.map(a => ({
    normalizedReference: a,
    authorityType: a,
    source: a
  }));
  timing.stageStarted("AUTHORITY_RESOLUTION_STARTED", "authorityResolution");
  ctx.rankedAuthorities = rerankByHierarchy(authorityDocs, query);
  trace.steps.push({ step: 3, name: "authorityRanking", count: ctx.rankedAuthorities.length, done: true });

  // ── Step 4: Supersession Filter ───────────────────────────────────────────
  ctx.activeAuthorities = applySupersessionFilter(ctx.rankedAuthorities);
  timing.stageCompleted("AUTHORITY_RESOLUTION_COMPLETE", "authorityResolution");
  publishDiagnostics(false);
  trace.steps.push({ step: 4, name: "supersessionFilter", done: true });

  // ── Step 5: Issue-Targeted Retrieval (Law 3) ──────────────────────────────
  // authority_name IN controllingAuthorities[] is passed explicitly.
  // Semantic similarity alone is PROHIBITED as the sole retrieval criterion.
  // retrieval-engine.js Layer 1 (EXACT_NORMALIZED_AUTHORITY) runs first;
  // Layer 5 (VECTOR_SEMANTIC) only fires after all authority-targeted layers.
  // Per-step timeout: Supabase free-tier cold starts can hang without rejecting.
  // After 15 s, fall through with empty chunks so the pipeline still completes.
  const controllingAuthorities = rawTargets;

  // Adaptive timeout: authority-priority fast path (Phase 3) + early exit (Phase 3B)
  // complete quickly per query, but Render / Supabase free-tier TCP cold starts can add
  // 10–25 s before the first indexed row returns.  The old hard-coded 15 s was correct
  // for a single semantic query but too short for the layered indexed authority retrieval
  // now in place.  UTILITY / DEBUG modes keep the short timeout — they do not produce
  // user-facing answers and do not need full authority traversal.
  const _RETRIEVAL_TIMEOUT_MAP = {
    FAST_DEFINITION:     20_000,   // definitional — fast path sufficient
    STANDARD_TAX_MODE:   35_000,   // primary /ask path
    FULL_DOCUMENT_MODE:  35_000,
    CASE_ANALYSIS:       40_000,
    SOURCE_LOOKUP:       30_000,
    SENIOR_COUNSEL_MEMO: 45_000,   // complex advisory — more authority layers
    COMPLEX_ADVISORY:    45_000,
    REVIEWER_MODE:       25_000,
    QUIZ_MODE:           20_000,
    CODE_PATCH_MODE:     20_000,
    UTILITY:             15_000,   // no user-facing answer needed
    DEBUG_MODE:          15_000,
  };
  const RETRIEVAL_STEP_TIMEOUT_MS = _RETRIEVAL_TIMEOUT_MAP[ctx.mode] ?? 35_000;
  console.log("[RETRIEVAL TIMEOUT CONFIG]", { mode: ctx.mode, timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS });
  timing.stageStarted("RETRIEVAL_STARTED", "retrieval");
  publishDiagnostics(false);

  // ── PATCH-017F: Pre-retrieval EWT/WHT authority short-circuit ─────────────
  // Simple EWT/WHT questions only need an exact hit on the core governing
  // authorities before the existing PATCH-017E/017D fast path can take over.
  const _patch017fCanonicalAuthorityKey = (value = "") => {
    const raw = String(value || "");
    const compact = canonicalSourceKey(raw);
    if (!compact) return "";
    if (/\b(?:nirc|tax\s*code|national\s*internal\s*revenue\s*code)\s*(?:sec(?:tion)?\.?\s*)?57\b/i.test(raw) ||
        compact === "nircsec57" || compact === "taxcodesec57" ||
        compact === "nationalinternalrevenuecodesec57") return "nircsec57";
    if (/\b(?:nirc|tax\s*code|national\s*internal\s*revenue\s*code)\s*(?:sec(?:tion)?\.?\s*)?58\b/i.test(raw) ||
        compact === "nircsec58" || compact === "taxcodesec58" ||
        compact === "nationalinternalrevenuecodesec58") return "nircsec58";
    if (/\b(?:rr|rev(?:enue)?\.?\s*regs?|rev(?:enue)?\.?\s*reg(?:ulation)?s?)\s*(?:no\.?\s*)?2\s*[-.]?\s*(?:98|1998)\b/i.test(raw) ||
        compact === "rr298" || compact === "rr21998" ||
        compact === "revenueregulations298" || compact === "revenueregulation298" ||
        compact === "revenueregulations21998" || compact === "revenueregulation21998") return "rr298";
    return compact;
  };

  const _patch017fDocAuthorityKeys = (doc = {}) => {
    const meta = doc.metadata || {};
    const values = [
      doc.normalizedReference,
      doc.normalized_reference,
      doc.citation,
      doc.title,
      doc.document_title,
      doc.source,
      doc.sourceTitle,
      meta.normalizedReference,
      meta.normalized_reference,
      meta.citation,
      meta.title,
      meta.documentTitle,
      meta.document_title,
      meta.originalFileName,
      meta.original_file_name,
      meta.source,
      meta.sectionScope,
      meta.section_scope,
      meta.sectionHeading,
      meta.section_heading
    ];
    return new Set(values.map(_patch017fCanonicalAuthorityKey).filter(Boolean));
  };

  const _patch017fTargetKeys = new Set(["nircsec57", "nircsec58", "rr298"]);
  const _patch017fExactAuthorityRefs = [
    "NIRC Sec. 57",
    "NIRC Section 57",
    "Tax Code Sec. 57",
    "National Internal Revenue Code Sec. 57",
    "NIRC Sec. 58",
    "NIRC Section 58",
    "Tax Code Sec. 58",
    "National Internal Revenue Code Sec. 58",
    "RR 2-98",
    "RR No. 2-98",
    "RR 2-1998",
    "RR No. 2-1998",
    "Revenue Regulations No. 2-98",
    "Revenue Regulations No. 2-1998"
  ];
  const _patch017fPrimaryIssue = String(ctx.issueClassification?.primaryIssue || "").toUpperCase();
  const _patch017fPrimaryDomain = String(
    ctx.issueClassification?.primaryDomain ||
    ctx.issueClassification?.primaryDomainCode ||
    ""
  ).toUpperCase();
  const _patch017fQuery = String(query || "");
  const _patch017fTargetAuthorities = ctx.issueClassification?.targetAuthorities || [];
  const _patch017fComplexity = String(ctx.issueClassification?.complexity || "").toLowerCase();
  const _patch017fIsWht =
    _patch017fPrimaryIssue === "WITHHOLDING" ||
    _patch017fPrimaryIssue === "WHT" ||
    _patch017fPrimaryDomain === "WHT" ||
    _patch017fPrimaryDomain.includes("WITHHOLDING");
  const _patch017fHasTgts = _patch017fTargetAuthorities.some((target) =>
    _patch017fTargetKeys.has(_patch017fCanonicalAuthorityKey(target))
  );
  const _patch017fHasKw = /\b(ewt|withholding|advertising|rate)\b/i.test(_patch017fQuery);
  const _patch017fSpecificWhtSignal = patch027nHasSpecificWhtFastPathSignal(
    _patch017fQuery,
    ctx.issueClassification || {}
  );
  const _patch017fSimple =
    _patch017fComplexity === "" ||
    _patch017fComplexity === "simple" ||
    _patch017fComplexity === "standard" ||
    _patch017fComplexity === "moderate";
  // PATCH-021B: global jurisprudence guard. Case-law intent must never be
  // short-circuited away from full retrieval — the skipped layers (citation
  // variant, metadata, keyword, vector, fallback) are where SC/CTA chunks live.
  const _patch017fIsJurisQuery   = ctx.issueClassification?.isJurisprudenceQuery === true;
  const _patch017fReqJuris       = ctx.issueClassification?.requiresJurisprudence === true;
  const _patch017fUseJurisEngine = ctx.issueClassification?.downstreamRouting?.useJurisprudenceEngine === true;
  const _patch017fCaseLawGuard   = _patch017fIsJurisQuery || _patch017fReqJuris || _patch017fUseJurisEngine;
  const _patch017fEligible =
    _patch017fIsWht && (_patch017fHasTgts || _patch017fHasKw) && _patch017fSpecificWhtSignal && _patch017fSimple && !_patch017fCaseLawGuard;

  console.log("[PATCH_017F_PRE_RETRIEVAL_EWT_CHECK]", {
    query: _patch017fQuery.slice(0, 160),
    primaryIssue: ctx.issueClassification?.primaryIssue,
    primaryDomain: ctx.issueClassification?.primaryDomain || ctx.issueClassification?.primaryDomainCode,
    subIssue: ctx.issueClassification?.subIssue,
    complexity: ctx.issueClassification?.complexity,
    targetAuthorities: _patch017fTargetAuthorities,
    isJurisprudenceQuery: _patch017fIsJurisQuery,
    requiresJurisprudence: _patch017fReqJuris,
    useJurisprudenceEngine: _patch017fUseJurisEngine,
    caseLawGuardApplied: _patch017fCaseLawGuard,
    specificWhtFastPathSignal: _patch017fSpecificWhtSignal,
    eligible: _patch017fEligible
  });

  let _patch017fRetrievalRaw = null;
  if (_patch017fEligible) {
    const _patch017fExactHits = await exactAuthoritySearch({
      query: "RR 2-98 NIRC Sec. 57 NIRC Sec. 58",
      supabase,
      topK: 18,
      targetAuthorities: [...new Set([
        ..._patch017fTargetAuthorities.filter((target) =>
          _patch017fTargetKeys.has(_patch017fCanonicalAuthorityKey(target))
        ),
        ..._patch017fExactAuthorityRefs
      ])]
    });
    const _patch017fMatched = [];

    for (const c of _patch017fExactHits) {
      const keys = _patch017fDocAuthorityKeys(c);
      const matchedAuthority = [...keys].find((key) => _patch017fTargetKeys.has(key));
      if (matchedAuthority) _patch017fMatched.push({ c, matchedAuthority });
    }

    const _patch017fAuthorities = [...new Set(
      _patch017fMatched.map(({ matchedAuthority }) => matchedAuthority)
    )];
    console.log("[PATCH_017F_EXACT_AUTHORITY_HITS]", {
      foundCount: _patch017fMatched.length,
      foundAuthorities: _patch017fAuthorities
    });

    if (_patch017fMatched.length > 0) {
      const _patch017fEwtTerms = /\b(advertising|rate|income payments?|withholding|expanded withholding|ewt|2\.57\.2)\b/i;
      const _patch017fRank = ({ c, matchedAuthority }) => {
        const text = String(c.text || c.content || "");
        if (matchedAuthority === "rr298" && _patch017fEwtTerms.test(text)) return 0;
        if (matchedAuthority === "rr298") return 1;
        if (matchedAuthority === "nircsec57") return 2;
        if (matchedAuthority === "nircsec58") return 3;
        return 4;
      };
      _patch017fMatched.sort((a, b) => _patch017fRank(a) - _patch017fRank(b));

      const _patch017fCompact = _patch017fMatched.slice(0, 6).map(({ c, matchedAuthority }) => {
        const body = String(c.text || c.content || "").slice(0, 1200);
        return {
          id: c.id,
          title: c.title || c.document_title || c.sourceTitle || c.source,
          citation: c.citation,
          normalizedReference: c.normalizedReference || c.normalized_reference || matchedAuthority,
          authorityType: c.authorityType || c.authority_type,
          authority_type: c.authority_type || c.authorityType,
          authorityLevel: c.authorityLevel || c.authority_level,
          authority_level: c.authority_level || c.authorityLevel,
          text: body,
          content: body,
          url: c.url,
          score: c.score,
          retrievalLayer: "LAYER_1_EXACT_NORMALIZED_AUTHORITY",
          sourceType: c.sourceType,
          targetAuthorityMatch: true,
          exactAuthorityMatch: true,
          issueClassificationMatch: true,
          patch017fPreRetrievalShortCircuit: true
        };
      });

      console.log("[PATCH_017F_PRE_RETRIEVAL_SHORT_CIRCUIT_APPLIED]", {
        skippedNormalRetrieval: true,
        skippedLayers: [
          "LAYER_2_CITATION_VARIANT",
          "LAYER_3_TITLE_PATH_METADATA",
          "LAYER_4_CONTENT_KEYWORD",
          "LAYER_5_VECTOR_SEMANTIC",
          "LAYER_6_BROAD_TAX_DOMAIN_FALLBACK"
        ],
        compactCount: _patch017fCompact.length,
        authorities: _patch017fAuthorities,
        elapsedMs: timing.elapsedMs(),
        remainingBudgetMs: timing.remainingBudgetMs()
      });

      ctx._fastEwtAuthorityPath = true;
      ctx.saeStatus = "AUTHORITY_FOUND";
      ctx.sourceAvailability = {
        ...(ctx.sourceAvailability || {}),
        saeStatus: "AUTHORITY_FOUND",
        sourceAvailability: "AUTHORITY_FOUND",
        sourceStatus: "AUTHORITY_FOUND",
        limitationRequired: false,
        statusReason: "[PATCH-017F] Exact indexed EWT/WHT authority chunk found before expansion."
      };
      _patch017fRetrievalRaw = {
        retrievedSources: _patch017fCompact,
        sources: _patch017fCompact,
        retrievalDiagnostics: {
          exactAuthorityMatches: _patch017fMatched.length,
          citationVariantMatches: 0,
          metadataMatches: 0,
          contentKeywordMatches: 0,
          semanticMatches: 0,
          fallbackMatches: 0,
          supabaseFallbackMatches: 0,
          patch017fPreRetrievalShortCircuit: true,
          skippedLayers: [
            "LAYER_2_CITATION_VARIANT",
            "LAYER_3_TITLE_PATH_METADATA",
            "LAYER_4_CONTENT_KEYWORD",
            "LAYER_5_VECTOR_SEMANTIC",
            "LAYER_6_BROAD_TAX_DOMAIN_FALLBACK"
          ]
        }
      };
    } else {
      console.log("[PATCH_017F_PRE_RETRIEVAL_SHORT_CIRCUIT_NOT_APPLIED]", {
        reason: "no_target_authority_chunk_found"
      });
    }
  } else {
    console.log("[PATCH_017F_PRE_RETRIEVAL_SHORT_CIRCUIT_NOT_APPLIED]", {
      reason: _patch017fCaseLawGuard ? "case_law_intent_guard" : "not_eligible",
      caseLawGuardApplied: _patch017fCaseLawGuard
    });
  }

  // Authority-priority routing wrapper.
  // callSearchCallable() passes opts.retrievalLayer — each layer dispatches to the
  // correct vector-store.js function (metadata-column searches only; no semantic).
  // Semantic vector search is a TRUE FALLBACK: it fires only when layers 1–4 have
  // not yet accumulated enough results.
  //
  // _uniqueAuthorityCandidates (Set) tracks deduplicated authority docs from layers
  // 1–4.  Once .size + _semanticHits >= _SEMANTIC_SKIP_THRESHOLD, semantic calls
  // return [] to prevent noisy semantic results from burying authority-targeted ones.
  //
  // smartSearch() is NOT used for any layer — it performs a nested semantic
  // fallback internally (exact→normalized→title→semantic) which would run semantic
  // retrieval before Layer 5 is reached.
  // Unique authority candidate tracking.
  // Using a Set of stable doc keys so that the same doc retrieved by multiple
  // Layer 1–4 queries (e.g. "NIRC Sec. 105" via Layer 1 AND via Layer 2) is counted
  // only once toward the semantic skip threshold.  Only docs with usable text AND an
  // authority-identifying field are counted — guards against empty/partial metadata rows.
  const _authorityDocKey = (doc) => {
    if (doc.id) return `id:${doc.id}`;
    const src = String(doc.source        || doc.document_title || "");
    const ref = String(doc.normalized_reference || doc.normalizedReference ||
                       (doc.chunk_index != null ? doc.chunk_index : ""));
    return `${src}|${ref}`;
  };
  const _isUsableAuthorityDoc = (doc) => {
    const hasText = Boolean(doc.text || doc.content);
    const hasAuth = Boolean(
      doc.source || doc.document_title ||
      doc.normalized_reference || doc.normalizedReference || doc.authority_type
    );
    return hasText && hasAuth;
  };
  const _uniqueAuthorityCandidates = new Set();
  let _semanticHits = 0;
  const _SEMANTIC_SKIP_THRESHOLD = 12; // matches topK: 12 passed to retrieveRelevantSources

  // Returns true when a Layer 3/4 query is an exact NIRC section or provision
  // reference (e.g. "NIRC Sec. 105", "Section 105 of the NIRC", "NIRC 105").
  // These are safe to intercept with the indexed normalized_reference fast-path.
  // Broad topic queries ("VAT refund", "withholding tax", "BIR LOA") return false
  // and fall through to the standard titleMetadataSearch path unchanged.
  const _isExactProvisionQuery = (q = "") =>
    /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)(?:\s+sec(?:tion)?\.?\s*|\s+)\d{1,3}[A-Z]?\b/i.test(q) ||
    /\bsec(?:tion)?\.?\s*\d{1,3}[A-Z]?\s+(?:of\s+(?:the\s+)?)?(?:nirc|tax\s+code)\b/i.test(q) ||
    /\bnirc\s+\d{1,3}[A-Z]?\b/i.test(q);

  const _vectorSearchFn = async (q, opts = {}) => {
    const layer = opts.retrievalLayer || "";
    const base  = {
      query:                 q,
      supabase,
      topK:                  opts.topK || 48,
      issueClassification:   opts.issueClassification || ctx.issueClassification || null,
      targetAuthorities:     opts.targetAuthorities   || controllingAuthorities  || [],
      controllingAuthorities
    };

    if (layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY") {
      console.log("[EXACT RETRIEVAL]",      { query: q, layer });
      const r = await exactAuthoritySearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }
    if (layer === "LAYER_2_CITATION_VARIANT") {
      console.log("[NORMALIZED RETRIEVAL]", { query: q, layer });
      const r = await normalizedCitationSearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }
    if (layer === "LAYER_3_TITLE_PATH_METADATA" || layer === "LAYER_4_CONTENT_KEYWORD") {
      // Use titleMetadataSearch (metadata-column only) — NOT smartSearch, which
      // cascades into semantic search internally before Layer 5 is reached.
      console.log("[DOMAIN RETRIEVAL]", { query: q, layer });

      // ── Exact provision fast-path for Layer 3/4 ───────────────────────────
      // When the Layer 3/4 query itself is an exact NIRC section reference
      // (e.g. "NIRC Sec. 105" injected into titlePathMetadataQueries by
      // buildRetrievalQuerySet for a "what is VAT" or direct provision query),
      // try the indexed normalized_reference.in() lookup first.
      //
      // titleMetadataSearch also runs this fast-path internally, but intercepting
      // here lets us skip titleMetadataSearch entirely when we have enough hits,
      // avoiding the 10-sub-term ILIKE loop even when Layer 3 is not individually
      // sufficient per the isAuthoritySufficient gate.
      if (_isExactProvisionQuery(q)) {
        const exactHits = await exactProvisionSearch({ ...base, query: q });

        if (exactHits.length > 0) {
          for (const doc of exactHits) {
            if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
          }
          // Skip the slow ILIKE path when we have enough exact results.
          // Threshold: topK/4 ensures we don't skip when only 1-2 chunks matched
          // across a 48-doc pool — the isAuthoritySufficient gate will decide.
          const needed = Math.max(1, Math.floor((opts.topK || 48) / 4));
          if (exactHits.length >= needed) {
            console.log("[METADATA SEARCH SKIPPED FOR EXACT PROVISION]", {
              query:      q,
              layer,
              exactFound: exactHits.length,
              needed
            });
            return exactHits;
          }
          // Partial exact hit — merge with titleMetadataSearch.
          // titleMetadataSearch internally tries fastRefLookup again (idempotent)
          // and catches any 57014 gracefully, so duplicates sort out in dedup.
          const slowR = await titleMetadataSearch(base);
          const combined = [...exactHits, ...slowR];
          for (const doc of combined) {
            if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
          }
          return combined;
        }
        // Exact lookup missed (normalized_reference null/unindexed for this doc).
        // Fall through to titleMetadataSearch which catches 57014 internally
        // via [METADATA SEARCH TIMEOUT FALLBACK] and returns partial results
        // rather than wiping accumulated candidates.
      }
      // ── End exact provision fast-path ─────────────────────────────────────

      const r = await titleMetadataSearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }

    // Layer 5 (VECTOR_SEMANTIC), Layer 6 (BROAD_TAX_DOMAIN_FALLBACK), unlabelled:
    // Skip semantic if unique authority candidates (deduplicated via Set) plus any
    // previous semantic pass have already accumulated enough results.  Using
    // _uniqueAuthorityCandidates.size + _semanticHits prevents Layer 6 from running
    // a duplicate semantic pass when Layer 5 already found sufficient candidates.
    const _totalHits = _uniqueAuthorityCandidates.size + _semanticHits;
    if (_totalHits >= _SEMANTIC_SKIP_THRESHOLD) {
      console.log("[SEMANTIC FALLBACK SKIPPED]", {
        query: q,
        layer,
        reason: "retrieval_pool_sufficient",
        uniqueAuthorityCount: _uniqueAuthorityCandidates.size,
        semanticHits: _semanticHits,
        total: _totalHits,
        threshold: _SEMANTIC_SKIP_THRESHOLD
      });
      return [];
    }
    // Wrap searchSimilar so intentional skips ([SEMANTIC FALLBACK SKIPPED]) are
    // distinguishable from real search failures ([SEMANTIC FALLBACK FAILED]) in logs.
    console.log("[SEMANTIC FALLBACK]", { query: q, layer, uniqueAuthorityCount: _uniqueAuthorityCandidates.size, semanticHits: _semanticHits });
    try {
      const r = await searchSimilar(base);
      _semanticHits += r.length;
      return r;
    } catch (err) {
      console.warn("[SEMANTIC FALLBACK FAILED]", { query: q, layer, error: err?.message || String(err) });
      trace.warnings.push({ step: 5, warning: `semanticFallbackFailed: ${err?.message || "unknown"}`, layer });
      return [];
    }
  };

  // _retrievalWon is set inside the .then() wrapper before Promise.race resolves,
  // so it is guaranteed true when checked immediately after the await if retrieval
  // completed before the timeout arm fired.
  markPipelineCheckpoint(diagnostics, "RETRIEVAL_STARTED", {
    timingField: "retrievalStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus || ""
  });


  let _retrievalWon = Boolean(_patch017fRetrievalRaw);
  let _retrievalRaw = _patch017fRetrievalRaw || null;

  // PATCH-024A: isSourceLookupRetrieval is recorded for SAE classification
  // downstream but NO LONGER bypasses the retrieval timeout race.
  // Prior behaviour (SOURCE_LOOKUP awaiting retrieval without a timeout bound)
  // allowed estate-tax /source queries to block for 100+ s and trip Render's
  // 120 s hard-kill, returning HTTP 502.  Auth-critical /ask queries still
  // await retrieval fully (see isAuthorityCriticalRetrieval below).
  const isSourceLookupRetrieval =
    String(ctx.mode || "").toUpperCase() === "SOURCE_LOOKUP";

  // Authority-critical retrieval: queries whose answer is meaningless without the
  // canonical primary authorities (e.g. "What is VAT?" requires Sec. 105-108).
  // Accepting a timeout-empty fallback would cascade to zero source cards even
  // though retrieval eventually finds the right documents.  Like SOURCE_LOOKUP,
  // these await the real retrieval promise and skip the race entirely.
  //
  // PATCH-018A: Extended to include VAT-domain queries (input tax, credit, refund)
  // and case/jurisprudence queries whose evidence showed timeout-then-zero-source
  // inconsistency despite retrieval logging 12 ranked candidates in background.
  const _018aPrimaryDomain = String(
    ctx.issueClassification?.primaryDomain ||
    ctx.issueClassification?.primaryDomainCode || ""
  ).toUpperCase();
  const _018aPrimaryIssue = String(ctx.issueClassification?.primaryIssue || "").toUpperCase();
  const _018aSubIssue     = String(ctx.issueClassification?.subIssue     || "").toUpperCase();
  const _018aQueryLower   = (query || "").toLowerCase();
  const _018aIsCaseQuery  = /\b(cases?|jurisprudence|rulings?|supreme\s+court|\bcta\b)/i.test(query);
  const _018aIsVatDomain  =
    _018aPrimaryDomain === "VAT" ||
    _018aPrimaryIssue  === "VAT" ||
    _018aPrimaryIssue  === "INPUT_TAX" ||
    _018aPrimaryIssue  === "VAT_CREDIT" ||
    _018aPrimaryIssue  === "VAT_REFUND" ||
    _018aSubIssue.startsWith("VAT") ||
    /\b(vat|value.?added\s+tax|input\s+tax|output\s+tax|vat\s+credit|vat\s+refund)\b/i.test(_018aQueryLower);

  const isAuthorityCriticalRetrieval =
    ctx.issueClassification?.subIssue === "VAT_DEFINITION" ||
    ctx.issueClassification?.subIssue === "WITHHOLDING_TAX_DEFINITION" ||
    ctx.issueClassification?.subIssue === "EWT" ||
    ctx.issueClassification?.subIssue === "ESTATE_TAX_DEFINITION" ||
    ctx.issueClassification?.subIssue === "ESTATE_TAX" ||
    ctx.issueClassification?.subIssue === "ESTATE_DEDUCTIONS" ||
    ctx.issueClassification?.primaryIssue === "WITHHOLDING" ||
    ctx.issueClassification?.primaryIssue === "EST" ||
    ctx.issueClassification?.primaryIssue === "ESTATE_TAX" ||
    String(ctx.issueClassification?.retrievalStrategy || "").includes("VAT_DEFINITION") ||
    ctx.issueClassification?.requiresAuthorityCriticalRetrieval === true ||
    // PATCH-018A: VAT-domain and case queries always await retrieval
    _018aIsVatDomain ||
    (_018aIsCaseQuery && (ctx.issueClassification?.targetAuthorities || []).length > 0);

  if (isAuthorityCriticalRetrieval) {
    console.log("[RETRIEVAL AWAIT MODE]", {
      reason:            "authority_critical",
      mode:              ctx.mode,
      subIssue:          ctx.issueClassification?.subIssue || null,
      retrievalStrategy: ctx.issueClassification?.retrievalStrategy || null,
      patch018aVatDomain: _018aIsVatDomain,
      patch018aCaseQuery: _018aIsCaseQuery
    });
  }

  // PATCH-024B: retrieval-engine.js's isVatDefinitionClassification() fires on any
  // query whose text matches /what is.*vat/i when normalizeIssue(primaryIssue)
  // resolves to "VAT" (VAT_LIABILITY normalises to "VAT" in the retrieval alias
  // table).  When that check fires it resets provisional.subIssue to "VAT_DEFINITION"
  // and provisional.targetAuthorities to NIRC Sec. 105/106/108 — overwriting the
  // precise PATCH-024B authorities (NIRC Sec. 109(P), RR 4-2007, etc.).
  // Fix: pass a shallow copy of issueClassification where primaryIssue and
  // domainCode hold the specialized sub-issue value.  That value is NOT in the
  // retrieval alias table so normalizeIssue(primaryIssue) !== "VAT",
  // issues.includes("VAT") is false, and the override block is never entered.
  // ctx.issueClassification is unchanged; only the snapshot to the retrieval
  // layer is modified.
  const _024b_specializedVatSubs = new Set([
    "VAT_REGISTRATION",
    "VAT_EXEMPTION_REAL_PROPERTY",
    "VAT_EXEMPTION_MEDICAL_PROFESSIONAL",
    "VAT_IMPORTATION",
    "VAT_REFUND_CREDIT",
    // PATCH-024C: extend shield to PATCH-024B-EXT sub-issues so that queries
    // like "What is the VAT treatment of residential rental?" do not re-trigger
    // the /what is.*vat/i branch in isVatDefinitionClassification() and revert
    // the retrieval target to the generic NIRC Sec. 105-108 set.
    "VAT_INVOICING",
    "VAT_INPUT_TAX_ALLOCATION",
    "VAT_EXEMPTION_RESIDENTIAL_LEASE"
  ]);
  const _024b_sub = ctx.issueClassification?.subIssue;
  if (_024b_specializedVatSubs.has(_024b_sub)) {
    console.log("[PATCH_024B_RETRIEVAL_CLASSIFICATION_SHIELD]", {
      subIssue:             _024b_sub,
      originalPrimaryIssue: ctx.issueClassification?.primaryIssue,
      shieldedPrimaryIssue: _024b_sub
    });
  }
  const _024bClassificationForRetrieval = _024b_specializedVatSubs.has(_024b_sub)
    ? { ...ctx.issueClassification, primaryIssue: _024b_sub, domainCode: _024b_sub }
    : ctx.issueClassification;

  if (!_retrievalRaw) {
    const retrievalPromise = retrieveRelevantSources({
      query,
      supabase,
      vectorSearch: _vectorSearchFn,
      issueClassification: _024bClassificationForRetrieval,
      targetAuthorities: controllingAuthorities,
      controllingAuthorities,
      topK: 12,
      poolK: 48
    }).then((r) => {
      _retrievalWon = true;
      return r;
    });

    const timeoutFallbackPromise = new Promise(resolve =>
      setTimeout(() => {
        trace.warnings.push({
          step: 5,
          warning: `Retrieval timed out after ${RETRIEVAL_STEP_TIMEOUT_MS} ms — proceeding with empty chunks`,
          timedOut: true
        });

        resolve({
          retrievedSources: [],
          sources: [],
          retrievalDiagnostics: {
            timedOut: true,
            timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
          }
        });
      }, RETRIEVAL_STEP_TIMEOUT_MS)
    );

    // PATCH-024A: /source (isSourceLookupRetrieval) now uses the timeout race so
    // unbounded Supabase metadata scans cannot exceed Render's hard-kill limit.
    // Only auth-critical /ask requests bypass the race and await retrieval fully.
    _retrievalRaw = (isAuthorityCriticalRetrieval && !isSourceLookupRetrieval)
      ? await retrievalPromise
      : await Promise.race([retrievalPromise, timeoutFallbackPromise]);
  }

  diagnostics.partialPipelineState.retrievalCompleted = _retrievalWon === true;
  markPipelineCheckpoint(diagnostics, "RETRIEVAL_COMPLETE", {
    timingField: "retrievalCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus || "",
    retrievedCount: Array.isArray(_retrievalRaw)
      ? _retrievalRaw.length
      : Array.isArray(_retrievalRaw?.retrievedSources)
        ? _retrievalRaw.retrievedSources.length
        : Array.isArray(_retrievalRaw?.sources)
          ? _retrievalRaw.sources.length
          : 0
  });

  if (_retrievalWon) {
    console.log("[RETRIEVAL COMPLETED BEFORE TIMEOUT]", {
      mode:      ctx.mode,
      timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
    });
  }

  // ── TEMP TRACE: inspect raw retrieval shape before normalization ───────────
  // Remove after retrieval audit is complete.
  // WHT/EWT fast path: skip full JSON.stringify to avoid serializing 100+ chunks.
  {
    const _rpcIsWhtPath =
      String(ctx.issueClassification?.primaryIssue || "").toUpperCase() === "WITHHOLDING" ||
      String(ctx.issueClassification?.primaryDomain || ctx.issueClassification?.primaryDomainCode || "").toUpperCase() === "WHT";
    if (_rpcIsWhtPath) {
      console.log("[FAST_EWT_FULL_PAYLOAD_LOG_SUPPRESSED]", {
        query:          query.slice(0, 120),
        primaryIssue:   ctx.issueClassification?.primaryIssue,
        rawSourceCount: Array.isArray(_retrievalRaw?.retrievedSources) ? _retrievalRaw.retrievedSources.length :
                        Array.isArray(_retrievalRaw) ? _retrievalRaw.length : "n/a",
        reason:         "full payload log suppressed for WHT fast path"
      });
    } else {
      console.log(
        "[RPC RAW FULL]",
        JSON.stringify(
          Array.isArray(_retrievalRaw)
            ? _retrievalRaw.slice(0, 2)
            : _retrievalRaw,
          null,
          2
        )
      );
    }
  }
  // ── TEMP TRACE: authority-priority layer hit distribution ─────────────────
  // Uses the real buildCompactDiagnostics() field names (no layerHits sub-object).
  if (_retrievalRaw && typeof _retrievalRaw === "object" && !Array.isArray(_retrievalRaw)) {
    const _diag = _retrievalRaw.retrievalDiagnostics;
    console.log("[AUTHORITY PRIORITY ORDER]", {
      layer1_exact:      _diag?.exactAuthorityMatches    ?? "n/a",
      layer2_citation:   _diag?.citationVariantMatches   ?? "n/a",
      layer3_metadata:   _diag?.metadataMatches          ?? "n/a",
      layer4_keyword:    _diag?.contentKeywordMatches    ?? "n/a",
      layer5_semantic:   _diag?.semanticMatches          ?? "n/a",
      layer6_fallback:   _diag?.fallbackMatches          ?? "n/a",
      supabaseFallback:  _diag?.supabaseFallbackMatches  ?? "n/a",
      wrapperAuthorityHits: _uniqueAuthorityCandidates.size,
      wrapperSemanticHits:  _semanticHits,
      totalCandidates:   Array.isArray(_retrievalRaw.retrievedSources)
        ? _retrievalRaw.retrievedSources.length : "n/a"
    });
  }
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Retrieval contract normalizer ─────────────────────────────────────────
  // retrieveRelevantSources() returns an object { retrievedSources, sources, … }.
  // The timeout fallback returns [].  All downstream consumers (reranker,
  // renderer, compliance gate) require ctx.retrievedChunks to be a plain array.
  if (Array.isArray(_retrievalRaw)) {
    ctx.retrievedChunks      = _retrievalRaw;
    ctx.retrievalMeta        = null;
    ctx.retrievalDiagnostics = null;
  } else if (_retrievalRaw && typeof _retrievalRaw === "object") {
    const _chunks =
      Array.isArray(_retrievalRaw.retrievedSources) ? _retrievalRaw.retrievedSources :
      Array.isArray(_retrievalRaw.sources)           ? _retrievalRaw.sources          :
      Array.isArray(_retrievalRaw.results)            ? _retrievalRaw.results           :
      null;
    if (_chunks === null) {
      console.warn("[PIPELINE] Step 5: retrieval result has no recognizable source array — normalizing to []");
      ctx.retrievedChunks = [];
    } else {
      ctx.retrievedChunks = _chunks;
    }
    ctx.retrievalMeta        = _retrievalRaw;
    ctx.retrievalDiagnostics = _retrievalRaw.retrievalDiagnostics || null;
  } else {
    console.warn("[PIPELINE] Step 5: retrieval returned malformed data — normalizing to []");
    ctx.retrievedChunks      = [];
    ctx.retrievalMeta        = null;
    ctx.retrievalDiagnostics = null;
  }

  trace.steps.push({ step: 5, name: "retrieval", chunksFound: ctx.retrievedChunks.length, done: true });
  diagnostics.partialPipelineState.retrievedCount = ctx.retrievedChunks.length;
  diagnostics.partialPipelineState.retrievalLayerCounts = buildRetrievalLayerCounts(ctx.retrievalDiagnostics);
  publishDiagnostics(false);

  // PATCH-018A: Post-retrieval canonical counts — canonical state after normalization
  console.log("[PATCH_018A_POST_RETRIEVAL_CANONICAL_COUNTS]", {
    retrievedChunks:       ctx.retrievedChunks.length,
    timedOut:              Boolean(ctx.retrievalDiagnostics?.timedOut),
    retrievalWon:          _retrievalWon,
    exactAuthorityMatches: ctx.retrievalDiagnostics?.exactAuthorityMatches ?? "n/a",
    citationVariantMatches: ctx.retrievalDiagnostics?.citationVariantMatches ?? "n/a",
    metadataMatches:       ctx.retrievalDiagnostics?.metadataMatches        ?? "n/a",
    finalSourceCount:      ctx.retrievalDiagnostics?.finalSourceCount       ?? "n/a",
    mode:                  ctx.mode,
    isAuthorityCritical:   isAuthorityCriticalRetrieval
  });

  // ── Step 5.5: Compact EWT/WHT retrieval set (PATCH-017E) ──────────────────
  // For simple WHT/EWT queries targeting NIRC Sec. 57/58 or RR 2-98, replace
  // ctx.retrievedChunks with only target authority chunks before the reranker.
  // This ensures Step 6.6 authority lock fires and PATCH-017D gate is reachable
  // without 100+ irrelevant NIRC chunks flowing through all downstream steps.
  {
    const _e5Pi      = String(ctx.issueClassification?.primaryIssue  || "").toUpperCase();
    const _e5Pd      = String(ctx.issueClassification?.primaryDomain || ctx.issueClassification?.primaryDomainCode || "").toUpperCase();
    const _e5Q       = (query || "").toLowerCase();
    const _e5Ta      = ctx.issueClassification?.targetAuthorities || [];
    const _e5Cx      = String(ctx.issueClassification?.complexity   || "").toLowerCase();

    const _e5IsWht     = _e5Pi === "WITHHOLDING" || _e5Pd === "WHT" || _e5Pd.includes("WITHHOLDING") || _e5Pi === "WHT";
    const _e5HasTgts   = _e5Ta.some(t => /nirc.*sec\.?\s*(57|58)\b/i.test(t) || /rr[\s\-.]?2[\s\-.]?98\b/i.test(t));
    const _e5HasKw     = /\b(ewt|withholding|advertising|rate)\b/i.test(_e5Q);
    const _e5SpecificWhtSignal = patch027nHasSpecificWhtFastPathSignal(query || "", ctx.issueClassification || {});
    const _e5Simple    = _e5Cx === "simple" || _e5Cx === "standard" || _e5Cx === "";
    const _e5HasChunks = ctx.retrievedChunks.length > 0;

    // PATCH-021A: case-law / jurisprudence intent must never collapse into the
    // compact EWT retrieval set — Supreme Court / CTA retrieval is needed.
    if (_e5IsWht && (_e5HasTgts || _e5HasKw) && _e5SpecificWhtSignal && _e5Simple && _e5HasChunks && !ctx.issueClassification?.isJurisprudenceQuery) {
      const _e5TaKeys = new Set(_e5Ta.map(t => canonicalSourceKey(t)).filter(Boolean));
      // Always include core EWT governing authority canonical keys as a safety net
      _e5TaKeys.add("nircsec57");
      _e5TaKeys.add("nircsec58");
      _e5TaKeys.add("rr298");

      const _e5EwtTerms = [
        "advertising agencies", "advertising", "contractors", "withholding",
        "ewt", "expanded withholding tax", "sec. 2.57.2", "2.57.2",
        "gross payments", "income payments", "professional fees"
      ];
      const _e5OrigCount = ctx.retrievedChunks.length;
      const _e5Found     = [];

      for (const c of ctx.retrievedChunks) {
        const _e5Ref  = (c.normalizedReference || c.normalized_reference || c.citation || c.title || "").trim();
        const _e5CKey = canonicalSourceKey(_e5Ref);
        if (_e5CKey && _e5TaKeys.has(_e5CKey)) {
          const _e5FullTxt = (c.text || c.content || "").toLowerCase();
          const _e5HasMat  = _e5EwtTerms.some(t => _e5FullTxt.includes(t));
          _e5Found.push({ c, hasMat: _e5HasMat });
        }
      }

      if (_e5Found.length > 0) {
        // Prefer chunks with EWT material terms; cap at 6 compact chunks
        _e5Found.sort((a, b) => (b.hasMat ? 1 : 0) - (a.hasMat ? 1 : 0));
        ctx.retrievedChunks = _e5Found.slice(0, 6).map(({ c }) => ({
          id:                   c.id,
          title:                c.title,
          citation:             c.citation,
          normalizedReference:  c.normalizedReference || c.normalized_reference || "",
          authorityType:        c.authorityType || c.authority_type,
          authority_type:       c.authority_type || c.authorityType,
          authorityLevel:       c.authorityLevel || c.authority_level,
          authority_level:      c.authority_level || c.authorityLevel,
          text:                 (c.text || c.content || "").slice(0, 1200),
          url:                  c.url,
          targetAuthorityMatch: true,
          exactAuthorityMatch:  c.exactAuthorityMatch || false,
          retrievalLayer:       c.retrievalLayer,
          sourceType:           c.sourceType,
          score:                c.score,
          _fastEwtCompact:      true
        }));

        const _e5Refs = ctx.retrievedChunks.map(c => c.normalizedReference || c.title || "").filter(Boolean);

        console.log("[FAST_EWT_RETRIEVAL_EARLY_STOP_APPLIED]", {
          query:                  query.slice(0, 120),
          primaryIssue:           _e5Pi,
          primaryDomain:          _e5Pd,
          subIssue:               ctx.issueClassification?.subIssue,
          targetAuthorities:      _e5Ta.slice(0, 6),
          foundTargetAuthorities: _e5Refs,
          compactCandidateCount:  ctx.retrievedChunks.length,
          skippedExpansionLayer:  `${_e5OrigCount - _e5Found.length} non-target chunks skipped`,
          elapsedMs:              timing.elapsedMs(),
          remainingBudgetMs:      timing.remainingBudgetMs(),
          candidateRefs:          _e5Refs
        });
        console.log("[FAST_EWT_RETRIEVAL_EXPANSION_SKIPPED]", {
          query:            query.slice(0, 120),
          originalCount:    _e5OrigCount,
          targetCount:      _e5Found.length,
          compactCount:     ctx.retrievedChunks.length,
          nonTargetSkipped: _e5OrigCount - _e5Found.length
        });
        console.log("[FAST_EWT_COMPACT_RETRIEVAL_SET_BUILT]", {
          query:             query.slice(0, 120),
          compactCount:      ctx.retrievedChunks.length,
          candidateRefs:     _e5Refs,
          elapsedMs:         timing.elapsedMs(),
          remainingBudgetMs: timing.remainingBudgetMs()
        });
      }
    }
  }

  // ── TEMP TRACE: Stage 1-3 — retrieval output + authority distribution ──────
  // Remove after retrieval audit is complete.
  console.log("[RPC RAW COUNT]", {
    rawType:          typeof _retrievalRaw,
    isArray:          Array.isArray(_retrievalRaw),
    chunksNormalized: ctx.retrievedChunks.length,
    retrievedKey:     Array.isArray(_retrievalRaw?.retrievedSources)
      ? _retrievalRaw.retrievedSources.length : "n/a",
    sourcesKey:       Array.isArray(_retrievalRaw?.sources)
      ? _retrievalRaw.sources.length : "n/a"
  });
  if (ctx.retrievedChunks.length > 0) {
    const _s = ctx.retrievedChunks[0];
    console.log("[RPC SAMPLE]", {
      id:            _s.id ?? null,
      authorityType: _s.authorityType || _s.authority_type || "MISSING",
      title:         (_s.title || _s.document_title || "?").slice(0, 80),
      hasText:       Boolean(_s.text || _s.content),
      score:         _s.score ?? 0
    });
  }
  const _authDist = ctx.retrievedChunks.reduce((a, c) => {
    const t = c.authorityType || c.authority_type || "MISSING";
    a[t] = (a[t] || 0) + 1; return a;
  }, {});
  console.log("[AUTHORITY FILTER]", {
    total:             ctx.retrievedChunks.length,
    distribution:      _authDist,
    unknownOrMissing:  (_authDist.UNKNOWN || 0) + (_authDist.MISSING || 0)
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Step 6: Reranker ──────────────────────────────────────────────────────
  const rerankResult = rerankForTina({
    docs:               ctx.retrievedChunks,
    query,
    issueClassification: ctx.issueClassification
  });
  ctx.rerankedChunks = rerankResult?.results || rerankResult?.sources || rerankResult?.retrievedSources || [];
  // ── TEMP TRACE: Stage 5 — reranker output ─────────────────────────────────
  // Remove after retrieval audit is complete.
  console.log("[RERANK]", {
    input:               ctx.retrievedChunks.length,
    output:              ctx.rerankedChunks.length,
    suppressWeakDefault: true,
    auditSummary: rerankResult?.audit
      ? {
          inputCount:      rerankResult.audit.inputCount,
          outputCount:     rerankResult.audit.outputCount,
          suppressedWeak:  rerankResult.audit.suppressWeakSecondary
        }
      : "no audit field"
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────
  trace.steps.push({ step: 6, name: "reranker", done: true });

  // Step 6.5: Source Availability Engine classification.
  markPipelineCheckpoint(diagnostics, "AUTHORITY_RESOLUTION_STARTED", {
    timingField: "authorityResolutionStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  ctx.rerankedChunks = annotateAuthorityCandidates(ctx.rerankedChunks || [], {
    issueClassification: ctx.issueClassification,
    outcomeCategory:     ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null
  });

  // PATCH-018A: Pre-SAE annotated candidate counts before classifySourceAvailability
  console.log("[PATCH_018A_PRE_SAE_COUNTS]", {
    annotatedCandidates: ctx.rerankedChunks.length,
    timedOut:            Boolean(ctx.retrievalDiagnostics?.timedOut),
    outcomeCategory:     ctx.retrievalMeta?.outcomeCategory || null
  });

  ctx.sourceAvailability = classifySourceAvailability({
    annotatedCandidates:  ctx.rerankedChunks || [],
    issueClassification:  ctx.issueClassification,
    query,                // PATCH-017B: pass query for fixed sourceMaterialTermsMatchAuthority call
    outcomeCategory:      ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null,
    retrievalDiagnostics: ctx.retrievalDiagnostics,
    retrievalMeta:        ctx.retrievalMeta,
    fallbackStatus:       ctx.retrievalMeta?.fallbackStatus || null
  });
  ctx.saeStatus            = ctx.sourceAvailability.saeStatus;
  ctx.eligibleCandidates   = ctx.sourceAvailability.eligibleCandidates;
  ctx.suppressedCandidates = ctx.sourceAvailability.suppressedCandidates;
  ctx.limitationRequired   = ctx.sourceAvailability.limitationRequired;
  ctx.disclosureType       = ctx.sourceAvailability.disclosureType;
  ctx.statusReason         = ctx.sourceAvailability.statusReason;

  // PATCH-024A Q40: When a specific BIR issuance (RMC/RR/RMO/RAMO) is cited in
  // the query but retrieval returned nothing, reclassify RETRIEVAL_TIMEOUT to
  // NO_INDEXED_SOURCE.  RETRIEVAL_TIMEOUT allows the model to generate content
  // from training knowledge about a potentially fictional authority; the SAE
  // hard-fail gate at Step 16 is then forced so no fabricated text is surfaced.
  {
    const _024aExactAuth = ctx.issueClassification?.exactAuthority;
    if (
      _024aExactAuth?.detected === true &&
      ["RMC", "RR", "RMO", "RAMO"].includes(String(_024aExactAuth.type || "").toUpperCase()) &&
      (ctx.rerankedChunks || []).length === 0 &&
      ctx.saeStatus === "RETRIEVAL_TIMEOUT"
    ) {
      ctx.saeStatus   = "NO_INDEXED_SOURCE";
      ctx.statusReason = "[PATCH-024A] Specific BIR issuance cited but not in index; reclassified from RETRIEVAL_TIMEOUT.";
      ctx._024a_exactAuthorityMissing = true;
      console.log("[PATCH_024A_EXACT_AUTHORITY_NOT_INDEXED]", {
        exactAuthority: _024aExactAuth.reference,
        type:           _024aExactAuth.type,
        wasStatus:      "RETRIEVAL_TIMEOUT",
        nowStatus:      "NO_INDEXED_SOURCE"
      });
    }
  }

  diagnostics.partialPipelineState.sourceAvailabilityStatusBeforeTimeout = ctx.saeStatus;
  diagnostics.partialPipelineState.retrievedCount = ctx.rerankedChunks?.length || 0;
  diagnostics.partialPipelineState.sourceLabelsBeforeTimeout = buildFirstSourceLabels(ctx.rerankedChunks);
  markPipelineCheckpoint(diagnostics, "AUTHORITY_RESOLUTION_COMPLETE", {
    timingField: "authorityResolutionCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  console.log("[SOURCE AVAILABILITY]", {
    saeStatus:          ctx.saeStatus,
    reason:             ctx.statusReason,
    eligibleCount:      ctx.eligibleCandidates.length,
    suppressedCount:    ctx.suppressedCandidates.length,
    outcomeCategory:    ctx.retrievalMeta?.outcomeCategory || ctx.retrievalMeta?.retrievalMeta?.outcomeCategory || null,
    retrievalTimedOut:  Boolean(ctx.retrievalDiagnostics?.timedOut),
    limitationRequired: ctx.limitationRequired
  });

  // PATCH-018A: Post-SAE reconciliation state — confirms saeStatus after classification
  console.log("[PATCH_018A_RETRIEVAL_STATE_RECONCILED]", {
    saeStatus:          ctx.saeStatus,
    rerankedChunks:     ctx.rerankedChunks.length,
    eligibleCandidates: ctx.eligibleCandidates?.length ?? 0,
    timedOut:           Boolean(ctx.retrievalDiagnostics?.timedOut),
    reconciled:         Boolean(
      ctx.rerankedChunks.length > 0 &&
      (ctx.saeStatus === "AUTHORITY_FOUND" || ctx.saeStatus === "RELATED_AUTHORITY_ONLY")
    )
  });

  trace.steps.push({ step: "6.5", name: "sourceAvailabilityClassification", saeStatus: ctx.saeStatus, done: true });

  // ── Step 6.6: Pre-Generation Authority Lock (PATCH-017B) ──────────────────
  // For authority-critical WITHHOLDING/WHT queries targeting NIRC Sec. 57, Sec. 58,
  // or RR 2-98, run a narrow source selection BEFORE generation.
  // Prevents budget exhaustion caused by NO_INDEXED_SOURCE prompt when retrieval
  // actually succeeded but saeStatus was mis-classified (PATCH-017A regression).
  {
    const _pgPi  = String(ctx.issueClassification?.primaryIssue  || "").toUpperCase();
    const _pgPd  = String(ctx.issueClassification?.primaryDomain || ctx.issueClassification?.primaryDomainCode || "").toUpperCase();
    const _pgTa  = ctx.issueClassification?.targetAuthorities || [];
    const _pgQ   = (query || "").toLowerCase();

    const _pgIsWht       = _pgPi === "WITHHOLDING" || _pgPd === "WHT" || _pgPd.includes("WITHHOLDING") || _pgPi === "WHT";
    const _pgHasEwtTgts  = _pgTa.some(t => /nirc.*sec\.?\s*(57|58)\b/i.test(t) || /rr[\s\-.]?2[\s\-.]?98\b/i.test(t));
    const _pgHasEwtKw    = /\b(ewt|withholding|advertising|rate)\b/i.test(_pgQ);
    const _pgSpecificWhtSignal = patch027nHasSpecificWhtFastPathSignal(query || "", ctx.issueClassification || {});
    const _pgHasChunks   = (ctx.rerankedChunks || []).length > 0;
    // PATCH-021A: case-law / jurisprudence intent must not be locked onto the
    // fast EWT authority path (Sec. 57/58 only) nor forced into FAST_DEFINITION.
    const _pgRunPreGen   = _pgIsWht && (_pgHasEwtTgts || _pgHasEwtKw) && _pgSpecificWhtSignal && _pgHasChunks && !ctx.issueClassification?.isJurisprudenceQuery;

    if (_pgRunPreGen) {
      console.log("[PRE_GENERATION_SOURCE_SELECTION_STARTED]", {
        query:            _pgQ.slice(0, 120),
        primaryIssue:     ctx.issueClassification?.primaryIssue,
        subIssue:         ctx.issueClassification?.subIssue,
        primaryDomain:    ctx.issueClassification?.primaryDomain,
        targetAuthorities: _pgTa.slice(0, 6),
        retrievedCount:   ctx.rerankedChunks.length,
        currentSaeStatus: ctx.saeStatus
      });

      let _pgAccepted = 0;
      const _pgLockedRefs = [];

      for (const _pgC of ctx.rerankedChunks) {
        const _pgBridge = isEwtBridgeEligible(ctx.issueClassification, _pgC, query);
        const _pgMatch  = sourceMaterialTermsMatchAuthority(_pgC, query);
        if (_pgBridge || _pgMatch) {
          _pgAccepted++;
          const _pgRef =
            _pgC.normalizedReference || _pgC.normalized_reference ||
            _pgC.citation || _pgC.title || "";
          if (_pgRef && _pgLockedRefs.length < 8) _pgLockedRefs.push(_pgRef);
        }
      }

      console.log("[PRE_GENERATION_SOURCE_SELECTION_COMPLETE]", {
        inspected:  ctx.rerankedChunks.length,
        accepted:   _pgAccepted,
        locked:     _pgLockedRefs,
        sourceAvailability: ctx.saeStatus
      });

      if (_pgAccepted > 0) {
        const _pgLockedKeys = new Set(_pgLockedRefs.map(r => canonicalSourceKey(r)).filter(Boolean));
        const _pgHasTarget  = _pgTa.some(t => _pgLockedKeys.has(canonicalSourceKey(t)));

        if (_pgHasTarget || _pgAccepted >= 2) {
          console.log("[PRE_GENERATION_AUTHORITY_LOCK]", {
            query:             query.slice(0, 120),
            primaryIssue:      ctx.issueClassification?.primaryIssue,
            subIssue:          ctx.issueClassification?.subIssue,
            primaryDomain:     ctx.issueClassification?.primaryDomain,
            targetAuthorities: _pgTa.slice(0, 6),
            retrievedCount:    ctx.rerankedChunks.length,
            acceptedCount:     _pgAccepted,
            visibleCount:      _pgLockedRefs.length,
            lockedAuthorities: _pgLockedRefs,
            sourceAvailability: "AUTHORITY_FOUND"
          });

          ctx.saeStatus          = "AUTHORITY_FOUND";
          ctx.limitationRequired = false;
          ctx.disclosureType     = null;
          ctx.sourceAvailability = {
            ...ctx.sourceAvailability,
            saeStatus:          "AUTHORITY_FOUND",
            limitationRequired: false,
            disclosureType:     null,
            statusReason:       `[PATCH-017B] ${_pgAccepted} EWT authority candidate(s) verified pre-generation.`
          };
          ctx._fastEwtAuthorityPath     = true;
          ctx._preGenLockedAuthorities  = _pgLockedRefs;
          ctx.authorityLockApplied      = true;
          ctx.lockedAuthorities         = _pgLockedRefs;
          ctx.preGenerationSourceCards  = ctx.rerankedChunks.filter(c =>
            isEwtBridgeEligible(ctx.issueClassification, c, query) ||
            sourceMaterialTermsMatchAuthority(c, query)
          );

          // ── PATCH-017D: Filter contaminating non-target authorities ──────────
          if (_pgTa.length > 0) {
            const _fdTaKeys = new Set(_pgTa.map(t => canonicalSourceKey(t)).filter(Boolean));
            if (_fdTaKeys.size > 0) {
              const _fdLockedFiltered = ctx.lockedAuthorities.filter(
                r => _fdTaKeys.has(canonicalSourceKey(r))
              );
              const _fdCardsFiltered = ctx.preGenerationSourceCards.filter(c => {
                const _fdRef = c.normalizedReference || c.normalized_reference || c.citation || c.title || "";
                return _fdRef ? _fdTaKeys.has(canonicalSourceKey(_fdRef)) : false;
              });
              if (_fdLockedFiltered.length > 0) {
                if (
                  _fdLockedFiltered.length !== ctx.lockedAuthorities.length ||
                  _fdCardsFiltered.length  !== ctx.preGenerationSourceCards.length
                ) {
                  console.log("[FAST_EWT_LOCKED_AUTHORITIES_FILTERED]", {
                    query:        query.slice(0, 120),
                    lockedBefore: ctx.lockedAuthorities,
                    lockedAfter:  _fdLockedFiltered,
                    cardsBefore:  ctx.preGenerationSourceCards.length,
                    cardsAfter:   _fdCardsFiltered.length,
                    targetKeys:   [..._fdTaKeys]
                  });
                }
                ctx.lockedAuthorities        = _fdLockedFiltered;
                ctx._preGenLockedAuthorities = _fdLockedFiltered;
                ctx.preGenerationSourceCards = _fdCardsFiltered;
              }
            }
          }

          const _pgComplexity = String(ctx.issueClassification?.complexity || "").toLowerCase();
          const _pgPriorMode  = ctx.mode;
          if (_pgComplexity === "simple" || _pgComplexity === "standard") {
            ctx.mode = "FAST_DEFINITION";
            console.log("[FAST_DEFINITION_MODE_PRESERVED]", {
              query:       query.slice(0, 120),
              priorMode:   _pgPriorMode,
              complexity:  _pgComplexity,
              lockedCount: _pgAccepted
            });
          } else {
            console.log("[COMPACT_EWT_GENERATION_PATH]", {
              query:       query.slice(0, 120),
              priorMode:   _pgPriorMode,
              complexity:  _pgComplexity,
              lockedCount: _pgAccepted
            });
          }

          console.log("[PRE_GENERATION_AUTHORITY_LOCK_APPLIED]", {
            query:                query.slice(0, 120),
            authorityLockApplied: true,
            lockedAuthorities:    _pgLockedRefs,
            preGenCardCount:      ctx.preGenerationSourceCards.length,
            mode:                 ctx.mode,
            saeStatus:            ctx.saeStatus
          });

          console.log("[FAST_EWT_AUTHORITY_PATH]", {
            query:          query.slice(0, 120),
            lockedCount:    _pgAccepted,
            authorities:    _pgLockedRefs,
            mode:           ctx.mode,
            saeStatus:      ctx.saeStatus
          });
        } else {
          console.log("[PRE_GENERATION_AUTHORITY_LOCK_SKIPPED]", {
            query:             query.slice(0, 120),
            primaryIssue:      ctx.issueClassification?.primaryIssue,
            subIssue:          ctx.issueClassification?.subIssue,
            primaryDomain:     ctx.issueClassification?.primaryDomain,
            primaryDomainCode: ctx.issueClassification?.primaryDomainCode,
            acceptedCount:     _pgAccepted,
            acceptedRefs:      _pgLockedRefs,
            lockedKeys:        [..._pgLockedKeys],
            targetKeys:        _pgTa.map(t => canonicalSourceKey(t)),
            hasTarget:         _pgHasTarget,
            failedReason:      `_pgHasTarget=false && _pgAccepted=${_pgAccepted} < 2`
          });
        }
      } else {
        console.log("[PRE_GENERATION_AUTHORITY_LOCK_SKIPPED]", {
          query:             query.slice(0, 120),
          primaryIssue:      ctx.issueClassification?.primaryIssue,
          subIssue:          ctx.issueClassification?.subIssue,
          primaryDomain:     ctx.issueClassification?.primaryDomain,
          primaryDomainCode: ctx.issueClassification?.primaryDomainCode,
          acceptedCount:     0,
          acceptedRefs:      [],
          lockedKeys:        [],
          targetKeys:        _pgTa.map(t => canonicalSourceKey(t)),
          hasTarget:         false,
          failedReason:      "_pgAccepted=0 — no chunks matched EWT bridge or semantic terms"
        });
      }
    }
    trace.steps.push({ step: "6.6", name: "preGenerationSourceSelection", done: true, fastEwtPath: Boolean(ctx._fastEwtAuthorityPath) });
  }

  // ── Step 6.7: VAT Definition Bridge (PATCH-017H) ─────────────────────────
  // Repair: VAT definition queries that retrieved valid indexed authorities but
  // received NO_INDEXED_SOURCE or RELATED_AUTHORITY_ONLY due to annotation gaps
  // (missing citation field → isParsed=false → role never reaches GOVERNING).
  // Only activates when evidence of indexed target-matched VAT authority exists.
  //
  // PATCH-018A does NOT alter this gate. The gate condition is exactly as
  // established by PATCH-017H: isVatDefinitionQuery() + suppressed SAE status.
  // VAT credit / zero-rated / case queries resolve subIssue != VAT_DEFINITION,
  // so isVatDefinitionQuery() returns false and this block is never entered.
  console.log("[PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED]", {
    marker:              "PATCH_018A_VAT_BRIDGE_SCOPE_PRESERVED",
    isVatDefinitionQuery: isVatDefinitionQuery(ctx.issueClassification),
    subIssue:            ctx.issueClassification?.subIssue || null,
    retrievalStrategy:   ctx.issueClassification?.retrievalStrategy || null,
    saeStatus:           ctx.saeStatus,
    bridgeWillEvaluate:  (
      isVatDefinitionQuery(ctx.issueClassification) &&
      (ctx.saeStatus === "NO_INDEXED_SOURCE" || ctx.saeStatus === "RELATED_AUTHORITY_ONLY")
    )
  });
  if (
    isVatDefinitionQuery(ctx.issueClassification) &&
    (ctx.saeStatus === "NO_INDEXED_SOURCE" || ctx.saeStatus === "RELATED_AUTHORITY_ONLY")
  ) {
    const vatTargetChunks = (ctx.rerankedChunks || []).filter(
      (chunk) =>
        chunk.targetAuthorityMatch === true &&
        chunk.isIndexed !== false &&
        Boolean(chunk.text || chunk.content || chunk.excerpt)
    );

    if (vatTargetChunks.length > 0) {
      const vatTargetAuthorities =
        ctx.issueClassification?.targetAuthorities ||
        ctx.issueClassification?.definitionAuthorities ||
        [];

      for (const chunk of vatTargetChunks) {
        // Derive citation from the widest set of candidate fields (mirrors matchesTargetAuthority).
        // Needed because getDocCitation() in authority-utils only checks doc.citation/reference/metadata,
        // but targetAuthorityMatch can fire on normalizedReference, title, or source as well.
        const existingCitation =
          chunk.citation ||
          chunk.normalizedReference ||
          chunk.normalized_reference ||
          chunk.reference ||
          chunk.document_title ||
          chunk.title ||
          chunk.metadata?.citation ||
          chunk.metadata?.normalizedReference ||
          chunk.metadata?.normalized_reference ||
          null;

        chunk.authorityRole          = "GOVERNING";
        chunk.isGoverning            = true;
        chunk.limitationRequired     = false;
        chunk.directlyGovernsIssue   = true;
        chunk.isParsed               = true;
        if (existingCitation && !chunk.citation) {
          chunk.citation = existingCitation;
        }
        if (chunk.authorityAnnotation && typeof chunk.authorityAnnotation === "object") {
          chunk.authorityAnnotation.authorityRole        = "GOVERNING";
          chunk.authorityAnnotation.isGoverning          = true;
          chunk.authorityAnnotation.limitationRequired   = false;
          chunk.authorityAnnotation.directlyGovernsIssue = true;
          chunk.authorityAnnotation.isParsed             = true;
          if (existingCitation && !chunk.authorityAnnotation.citation) {
            chunk.authorityAnnotation.citation = existingCitation;
          }
        }
      }

      const prevStatus = ctx.saeStatus;
      ctx.saeStatus          = "AUTHORITY_FOUND";
      ctx.limitationRequired = false;
      ctx.disclosureType     = null;
      ctx.statusReason       = "VAT_DEFINITION_BRIDGE_AUTHORITY_CONFIRMED";
      if (ctx.sourceAvailability && typeof ctx.sourceAvailability === "object") {
        ctx.sourceAvailability.saeStatus          = "AUTHORITY_FOUND";
        ctx.sourceAvailability.limitationRequired  = false;
        ctx.sourceAvailability.disclosureType      = null;
        ctx.sourceAvailability.statusReason        = "VAT_DEFINITION_BRIDGE_AUTHORITY_CONFIRMED";
        ctx.sourceAvailability.eligibleCandidates  = vatTargetChunks;
        ctx.sourceAvailability.suppressedCandidates =
          (ctx.sourceAvailability.suppressedCandidates || []).filter(
            (c) => !vatTargetChunks.includes(c)
          );
      }
      ctx.eligibleCandidates   = ctx.sourceAvailability?.eligibleCandidates ?? vatTargetChunks;
      ctx.suppressedCandidates = ctx.sourceAvailability?.suppressedCandidates ?? [];

      console.log("[VAT DEFINITION BRIDGE]", {
        marker:          "PATCH_017H_VAT_DEFINITION_BRIDGE_APPLIED",
        prevStatus,
        newStatus:       ctx.saeStatus,
        correctedChunks: vatTargetChunks.length
      });
      trace.steps.push({
        step: "6.7",
        name: "vatDefinitionBridge",
        marker: "PATCH_017H_VAT_DEFINITION_BRIDGE_APPLIED",
        prevStatus,
        newStatus: ctx.saeStatus,
        correctedChunks: vatTargetChunks.length,
        done: true
      });
    } else {
      console.log("[VAT DEFINITION BRIDGE]", {
        marker:    "PATCH_017H_VAT_DEFINITION_BRIDGE_NOT_APPLIED",
        saeStatus: ctx.saeStatus,
        reason:    "no_indexed_target_matched_chunks"
      });
      trace.steps.push({
        step: "6.7",
        name: "vatDefinitionBridge",
        marker: "PATCH_017H_VAT_DEFINITION_BRIDGE_NOT_APPLIED",
        saeStatus: ctx.saeStatus,
        done: true
      });
    }
  }
  // ── END Step 6.7 ─────────────────────────────────────────────────────────

  // ── Step 7: Fact Pattern Reconstruction (conditional) ────────────────────
  syncPatch017gSourceState(ctx, {
    visibleSourceCount: ctx.preGenerationSourceCards?.length || 0,
    reason: "post_pre_generation_authority_lock"
  });

  const flags = detectQueryFlags(ctx.issueClassification, hook);
  ctx.factPattern = null;
  if (flags.isFactPattern) {
    try {
      ctx.factPattern = analyzeFactPattern(query);
    } catch (e) {
      trace.warnings.push({ step: 7, warning: `factPatternEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 7, name: "factPattern", skipped: !flags.isFactPattern, done: true });

  // ── Step 8: Doctrinal Analysis ────────────────────────────────────────────
  ctx.doctrinalStatus = detectDoctrinalConflicts(ctx.rerankedChunks || [], {
    issueClassification: ctx.issueClassification
  });
  trace.steps.push({ step: 8, name: "doctrinalAnalysis", done: true });

  // ── Step 9: Four-Part Doctrine Test (Law 4) ───────────────────────────────
  // Semantic divergence is NOT conflict. Only all-four-parts = trueConflict.
  const docs = ctx.rerankedChunks || [];
  const trueConflicts = [];
  const limit = Math.min(docs.length, 10);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const result = fourPartDoctrineTest(docs[i], docs[j]);
      if (result.trueConflict) trueConflicts.push(result);
    }
  }
  ctx.conflictAnalysis = {
    trueConflicts,
    count:       trueConflicts.length,
    hasConflict: trueConflicts.length > 0
  };
  trace.steps.push({ step: 9, name: "fourPartDoctrineTest", trueConflicts: trueConflicts.length, done: true });

  // ── Step 10: Transaction Characterization (conditional) ───────────────────
  ctx.transactionChar = null;
  if (flags.isTransaction) {
    try {
      ctx.transactionChar = characterizeTransaction(query);
    } catch (e) {
      trace.warnings.push({ step: 10, warning: `transactionCharEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 10, name: "transactionChar", skipped: !flags.isTransaction, done: true });

  // ── Step 11: Evidence Evaluation (conditional: dispute | audit) ───────────
  ctx.evidenceEval = null;
  if (flags.isDispute) {
    try {
      ctx.evidenceEval = evaluateEvidence(query);
    } catch (e) {
      trace.warnings.push({ step: 11, warning: `evidenceEvalEngine: ${e.message}` });
    }
  }
  trace.steps.push({ step: 11, name: "evidenceEvaluation", skipped: !flags.isDispute, done: true });

  // ── Step 12: Risk Scoring ─────────────────────────────────────────────────
  ctx.riskScore = null;
  try {
    ctx.riskScore = scoreRisk({
      query,
      issueClassification: ctx.issueClassification,
      conflictAnalysis:    ctx.conflictAnalysis,
      evidenceEval:        ctx.evidenceEval
    });
  } catch (e) {
    trace.warnings.push({ step: 12, warning: `riskScoringEngine: ${e.message}` });
  }
  trace.steps.push({ step: 12, name: "riskScoring", done: true });

  // ── Step 12.5: Adaptive Response Plan (/ask only) ─────────────────────────
  // Selects an /ask research profile (BASIC_RESEARCH, LEGAL_INTERPRETATION, etc.)
  // and builds the rendererContract used by Steps 14–16.  No OpenAI calls here.
  ctx.responsePlan = null;
  if (hook === "/ask" || !hook) {
    try {
      ctx.responsePlan = planAdaptiveResponse({
        hook,
        query,
        issueClassification:  ctx.issueClassification,
        factPattern:          ctx.factPattern,
        transactionChar:      ctx.transactionChar,
        evidenceEvaluation:   ctx.evidenceEval,
        riskScore:            ctx.riskScore,
        conflictAnalysis:     ctx.conflictAnalysis
      });
      console.log("[ASK PROFILE]", {
        profile:   ctx.responsePlan?.askProfile,
        sections:  ctx.responsePlan?.askProfileSections?.length ?? 0,
        mode:      ctx.responsePlan?.responseMode,
        limitation: ctx.responsePlan?.mustIncludeLimitation
      });
    } catch (e) {
      trace.warnings.push({ step: "12.5", warning: `adaptiveResponsePlanner: ${e.message || e}` });
    }
  }
  trace.steps.push({ step: "12.5", name: "adaptiveResponsePlan", done: true, askProfile: ctx.responsePlan?.askProfile || null });

  // ── Step 13: Build Adaptive Master Prompt ────────────────────────────────
  ctx.promptContract = buildAdaptivePromptContract(ctx.mode, {
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    factPattern:         ctx.factPattern,
    transactionChar:     ctx.transactionChar,
    responsePlan:        ctx.responsePlan
  });
  trace.steps.push({ step: 13, name: "masterPromptBuilt", done: true });

  // ── Step 13.5: PATCH-021C — jurisprudence authority promotion ─────────────
  // For case-law intent queries, retrieved SC/CTA decisions must lead the
  // final sources sent to the model; statutes/regulations stay as background.
  // Trigger is isJurisprudenceQuery ONLY: requiresJurisprudence /
  // useJurisprudenceEngine are also true for ordinary VAT definition queries
  // by design and must not receive case-law framing.
  {
    const _jpIntent = ctx.issueClassification?.isJurisprudenceQuery === true;
    if (_jpIntent && (ctx.rerankedChunks || []).length > 0) {
      const _jpBeforeTypes = ctx.rerankedChunks.map(c => c.authorityType || c.authority_type || "?");
      const _jpRefOf = (c) => c.normalizedReference || c.normalized_reference || c.citation || c.title || "?";

      // Stable sorts: reranker order is preserved within each rank.
      const _jpCase = ctx.rerankedChunks
        .filter(c => patch021cIsCaseAuthority(c))
        .sort((a, b) => patch021cJurisprudenceRank(a) - patch021cJurisprudenceRank(b));
      const _jpBackground = ctx.rerankedChunks
        .filter(c => !patch021cIsCaseAuthority(c))
        .sort((a, b) => patch021cJurisprudenceRank(a) - patch021cJurisprudenceRank(b));

      if (_jpCase.length > 0) {
        const _jpMax      = 5;
        const _jpCaseTake = Math.min(_jpCase.length, _jpBackground.length > 0 ? _jpMax - 1 : _jpMax);
        const _jpSelected = [
          ..._jpCase.slice(0, _jpCaseTake),
          ..._jpBackground.slice(0, _jpMax - _jpCaseTake)
        ];
        ctx.rerankedChunks = _jpSelected;
      }

      console.log("[PATCH_021C_JURISPRUDENCE_SOURCE_PROMOTION]", {
        query: query.slice(0, 120),
        caseLawIntent: {
          isJurisprudenceQuery:   true,
          requiresJurisprudence:  ctx.issueClassification?.requiresJurisprudence === true,
          useJurisprudenceEngine: ctx.issueClassification?.downstreamRouting?.useJurisprudenceEngine === true
        },
        beforeTypes:                   _jpBeforeTypes,
        afterTypes:                    ctx.rerankedChunks.map(c => c.authorityType || c.authority_type || "?"),
        promotedCount:                 Math.min(_jpCase.length, 5),
        finalSourceCount:              ctx.rerankedChunks.length,
        includedCaseAuthorities:       _jpCase.slice(0, 5).map(_jpRefOf),
        includedBackgroundAuthorities: ctx.rerankedChunks.filter(c => !patch021cIsCaseAuthority(c)).map(_jpRefOf)
      });

      // Generation directive: answer the case-law question directly.
      // PATCH-021E: when court sources were actually promoted into the final
      // set, NAME them explicitly — diagnostics proved the generic directive
      // (buried late in a ~10k-char system prompt and contradicted by
      // statute-only authority metadata) loses to framing, and the model
      // falsely answers "no indexed court cases were retrieved".
      const _jpPromotedNames = patch021eCaseNamesFromSources(ctx.rerankedChunks);
      const _jpDirective = _jpPromotedNames.length > 0
        ? [
            "",
            "[JURISPRUDENCE QUERY DIRECTIVE — PATCH-021C/021E]",
            "This question asks about court cases / case law.",
            `Indexed court decisions retrieved for this query include: ${_jpPromotedNames.join("; ")}.`,
            `1. You MUST identify and discuss these retrieved court decisions FIRST, naming them explicitly (e.g., "${_jpPromotedNames[0]}"), before any statutory background.`,
            "2. Do NOT state that no indexed court cases or case-law sources were retrieved — the court decisions listed above ARE present in the provided sources.",
            "3. Statutes and regulations (e.g., NIRC provisions, revenue regulations) are supporting background only — do NOT present them as the only controlling authorities.",
            "4. NEVER invent case names, G.R. numbers, or holdings that are not present in the provided sources. Discuss only the decisions listed above and any other court decisions actually present in the sources."
          ].join("\n")
        : [
            "",
            "[JURISPRUDENCE QUERY DIRECTIVE — PATCH-021C]",
            "This question asks about court cases / case law. Answer the case-law question directly:",
            "1. FIRST identify the retrieved court decisions (Supreme Court / CTA) exactly as they are named in the provided sources. If no court decision appears in the sources, state plainly that no indexed case-law source was retrieved for this question — do NOT claim that no such cases exist.",
            "2. THEN explain the statutory and regulatory background (e.g., NIRC provisions, revenue regulations) as supporting context only.",
            "3. If court decisions are present in the sources, do NOT present statutes or regulations as the only controlling authorities.",
            "4. NEVER invent case names, G.R. numbers, or holdings that are not present in the provided sources."
          ].join("\n");
      if (_jpPromotedNames.length > 0) {
        // PATCH-021E: surface the promoted decisions in the classification's
        // supportingJurisprudence so the USER prompt's authority context names
        // them too — Langfuse raw completions proved the system-prompt
        // directive alone loses to the statute-only authority JSON shown to
        // the model in the user message. supportingJurisprudence is prompt
        // metadata only: SAS, source cards, renderer, and 019A never read it,
        // and the SAE plan check consumed it before this step.
        ctx.issueClassification = {
          ...ctx.issueClassification,
          supportingJurisprudence: [...new Set([
            ...(ctx.issueClassification?.supportingJurisprudence || []),
            ..._jpPromotedNames
          ])]
        };
        // PATCH-021F: carry the promoted decision names into the response plan —
        // the ask-profile section machinery (the instruction block the model
        // demonstrably follows) renders a CASE-LAW NAMING rule from this field.
        ctx.responsePlan = {
          ...(ctx.responsePlan || {}),
          jurisprudenceNamedAuthorities: _jpPromotedNames
        };
        console.log("[PATCH_021E_JURISPRUDENCE_NAMING_DIRECTIVE]", {
          query: query.slice(0, 120),
          namedCaseAuthorities: _jpPromotedNames.slice(0, 5),
          promotedCount: _jpPromotedNames.length,
          supportingJurisprudenceAugmented: true
        });
      }
      if (ctx.promptContract && typeof ctx.promptContract.masterPrompt === "string") {
        // PATCH-021E: PREPEND when court decisions were promoted — live runs
        // proved the appended directive (landing at ~99% of a 10k-char system
        // message) loses to the statute-only authority framing above it.
        ctx.promptContract = {
          ...ctx.promptContract,
          masterPrompt: _jpPromotedNames.length > 0
            ? _jpDirective.trimStart() + "\n\n" + ctx.promptContract.masterPrompt
            : ctx.promptContract.masterPrompt + "\n" + _jpDirective
        };
      }
      trace.steps.push({
        step: "13.5",
        name: "jurisprudenceSourcePromotion",
        done: true,
        caseSourceCount: _jpCase.length,
        finalSourceCount: ctx.rerankedChunks.length
      });
    }
  }

  // ── TEMP TRACE: Stage 7 — final sources entering OpenAI ───────────────────
  // Remove after retrieval audit is complete.
  console.log("[FINAL SOURCES TO MODEL]", {
    count:  (ctx.rerankedChunks || []).length,
    types:  (ctx.rerankedChunks || []).map(c => c.authorityType || "?"),
    titles: (ctx.rerankedChunks || []).map(c => (c.title || c.document_title || "?").slice(0, 60))
  });
  // ── END TEMP TRACE ────────────────────────────────────────────────────────

  // ── Step 14: OpenAI Completion ────────────────────────────────────────────
  let openAiResult;
  const openaiCallTiming = {
    purpose: "answer_generation",
    model,
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    status: "started",
    errorCode: null,
    errorType: null
  };
  const openaiCallStartMs = Date.now();
  timing.openaiCalls.push(openaiCallTiming);

  diagnostics.partialPipelineState.generationStarted = true;
  markPipelineCheckpoint(diagnostics, "GENERATION_STARTED", {
    timingField: "generationStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  publishDiagnostics(false);

  // ── PATCH-017D: Hard fast-definition generation cap ──────────────────────
  // PATCH-021B: case-law intent must never receive the capped 600-token compact
  // EWT prompt — jurisprudence answers need full orchestration/generation.
  const _fdCaseLawGuard =
    ctx.issueClassification?.isJurisprudenceQuery === true ||
    ctx.issueClassification?.requiresJurisprudence === true ||
    ctx.issueClassification?.downstreamRouting?.useJurisprudenceEngine === true;
  const _fdGateRemainingMs = timing.remainingBudgetMs();
  console.log("[FAST_EWT_GATE_CHECK]", {
    query:                        query.slice(0, 120),
    fastEwtAuthorityPath:         ctx._fastEwtAuthorityPath,
    caseLawGuardApplied:          _fdCaseLawGuard,
    authorityLockApplied:         ctx.authorityLockApplied,
    saeStatus:                    ctx.saeStatus,
    sourceAvailability:           ctx.sourceAvailability,
    sourceAvailabilitySaeStatus:  ctx.sourceAvailability?.saeStatus,
    mode:                         ctx.mode,
    responseMode:                 ctx.responseMode,
    orchestrationMode:            ctx.orchestrationMode,
    openAiResultIsNull:           openAiResult == null,
    remainingBudgetMs:            _fdGateRemainingMs,
    preGenerationSourceCardsCount: (ctx.preGenerationSourceCards || []).length,
    lockedAuthorities:            ctx.lockedAuthorities,
    hasOpenAiClient:              Boolean(openai),
    generationFile:               "pipeline.js"
  });
  // PATCH-021B: !_fdCaseLawGuard keeps FAST_EWT_GENERATION_CAP_APPLIED and
  // FAST_EWT_COMPACT_PROMPT_USED away from jurisprudence / case-law queries.
  if (ctx._fastEwtAuthorityPath && ctx.saeStatus === "AUTHORITY_FOUND" && !_fdCaseLawGuard) {
    const _fdRemainingMs = _fdGateRemainingMs;
    const _fdCards       = (ctx.preGenerationSourceCards || []).slice(0, 4);

    if (_fdRemainingMs < 15000) {
      const _fdAuthorities = _fdCards
        .map(c => c.normalizedReference || c.citation || c.title || "")
        .filter(Boolean)
        .slice(0, 8);
      console.log("[FAST_EWT_LOW_BUDGET_FALLBACK_USED]", {
        query:       query.slice(0, 120),
        remainingMs: _fdRemainingMs,
        cardCount:   _fdCards.length,
        authorities: _fdAuthorities.join(", ")
      });
      // PATCH-018B: never return a hardcoded legal conclusion here. The prior
      // fallback stated an advertising-agency-specific rate regardless of the
      // actual income payment category. Retrieved authorities and source
      // cards are preserved downstream (ctx.preGenerationSourceCards is untouched
      // and saeStatus remains AUTHORITY_FOUND); only the answer text is replaced
      // with safe insufficient-generation language.
      console.log("[PATCH_018B_SAFE_EWT_INSUFFICIENT_GENERATION_FALLBACK]", {
        query:             query.slice(0, 120),
        remainingBudgetMs: _fdRemainingMs,
        sourceCount:       _fdCards.length,
        authorities:       _fdAuthorities,
        reason:            "remaining_generation_budget_below_safe_minimum"
      });
      openAiResult = {
        answer: SAFE_EWT_INSUFFICIENT_GENERATION_ANSWER,
        orchestration: {
          mode:                ctx.mode,
          engine:              "fast-ewt-fallback",
          version:             "1.1",
          sourceCount:         _fdCards.length,
          maxCompletionTokens: 0,
          wasTrimmed:          false,
          patch018bSafeFallbackApplied: true,
          diagnostics:         { finalTrimApplied: false }
        }
      };
      openaiCallTiming.completedAt = new Date().toISOString();
      openaiCallTiming.durationMs  = Date.now() - openaiCallStartMs;
      openaiCallTiming.status      = "completed";
    } else {
      const _fdSourceText = _fdCards
        .map((c, i) => {
          const ref = c.normalizedReference || c.citation || c.title || `Source ${i + 1}`;
          const txt = (c.text || c.content || "").slice(0, 800);
          return `[${ref}]\n${txt}`;
        })
        .join("\n\n---\n\n");
      console.log("[FAST_EWT_GENERATION_CAP_APPLIED]", {
        query:       query.slice(0, 120),
        remainingMs: _fdRemainingMs,
        sourceCount: _fdCards.length,
        maxTokens:   600,
        authorities: _fdCards.map(c => (c.normalizedReference || c.citation || "").slice(0, 60)).filter(Boolean)
      });
      // PATCH-027O: Only instruct "State the applicable rate" when the query is
      // rate-seeking. For generic EWT definition queries (e.g. a query that
      // reached this path despite the broad-definition guard), avoid forcing the
      // model to extract and cite a specific rate or payment category from whichever
      // RR 2-98 chunk happened to be retrieved.
      const _fdIsRateSeeking = patch027oIsEwtRateSeeking(query);
      const _fdSystemInstruction = _fdIsRateSeeking
        ? "You are TINA, a Philippine tax assistant. Answer in 2-3 sentences using only the provided sources. State the applicable rate and cite the authority."
        : "You are TINA, a Philippine tax assistant. Answer in 2-3 sentences using only the provided sources. Explain the legal concept generally and cite the authority. Do not speculate about rates or specific payment categories not mentioned in the question.";
      console.log("[FAST_EWT_COMPACT_PROMPT_USED]", {
        promptChars:    _fdSourceText.length,
        sources:        _fdCards.map(c => (c.normalizedReference || c.title || "").slice(0, 60)),
        isRateSeeking:  _fdIsRateSeeking
      });
      try {
        const _fdCompletion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role:    "system",
              content: _fdSystemInstruction
            },
            {
              role:    "user",
              content: `Sources:\n\n${_fdSourceText}\n\nQuestion: ${query}`
            }
          ],
          max_tokens:  600,
          temperature: 0.2
        });
        const _fdAnswer = _fdCompletion?.choices?.[0]?.message?.content || "";
        openAiResult = {
          answer:        _fdAnswer,
          orchestration: {
            mode:                ctx.mode,
            engine:              "fast-ewt-cap",
            version:             "1.0",
            sourceCount:         _fdCards.length,
            maxCompletionTokens: 600,
            wasTrimmed:          false,
            diagnostics:         { finalTrimApplied: false }
          },
          usage: _fdCompletion?.usage || null,
          raw:   _fdCompletion
        };
      } catch (_fdErr) {
        console.warn("[FAST_EWT_CAP_ERROR_FALLTHROUGH]", {
          query: query.slice(0, 120),
          error: _fdErr?.message || String(_fdErr)
        });
      }
      openaiCallTiming.completedAt = new Date().toISOString();
      openaiCallTiming.durationMs  = Date.now() - openaiCallStartMs;
      openaiCallTiming.status      = openAiResult ? "completed" : "fallthrough";
    }
  } else {
    console.log("[FAST_EWT_GATE_SKIPPED]", {
      reason:                   !ctx._fastEwtAuthorityPath
        ? "fastEwtAuthorityPath is falsy"
        : ctx.saeStatus !== "AUTHORITY_FOUND"
          ? `saeStatus is '${ctx.saeStatus}' not AUTHORITY_FOUND`
          : _fdCaseLawGuard
            ? "case_law_intent_guard"
            : "unknown",
      caseLawGuardApplied:      _fdCaseLawGuard,
      fastPath:                 Boolean(ctx._fastEwtAuthorityPath),
      saeStatus:                ctx.saeStatus,
      sourceAvailabilityStatus: ctx.sourceAvailability?.saeStatus,
      openAiResultIsNull:       openAiResult == null,
      remainingBudgetMs:        _fdGateRemainingMs
    });
  }

  if (openAiResult == null) try {
    openAiResult = await callOpenAIWithOrchestration({
      openai,
      model,
      query,
      userQuery:            query,
      retrievedSources:     ctx.rerankedChunks || [],
      issueClassification:  ctx.issueClassification,
      taxDomainClassification: ctx.routingMetadata,
      conflictAnalysis:     ctx.conflictAnalysis,
      systemPrompt:         ctx.promptContract?.masterPrompt,
      saeStatus:            ctx.saeStatus,
      sourceAvailabilityMetadata: ctx.sourceAvailability,
      limitationRequired:   ctx.limitationRequired,
      disclosureType:       ctx.disclosureType,
      statusReason:         ctx.statusReason,
      conversationHistory,
      mode:                 ctx.mode,
      responsePlan:         ctx.responsePlan,
      adaptiveContext: {
        activeHook:        hook,
        orchestrationMode: ctx.mode,
        responsePlan:      ctx.responsePlan
      },
      _traceId:             traceId,
      openaiDiagnostics:    diagnostics.openaiCalls
    });
    diagnostics.partialPipelineState.generationCompleted = true;
    markPipelineCheckpoint(diagnostics, "GENERATION_COMPLETE", {
      timingField: "generationCompletedAt",
      mode: ctx.mode,
      route: hook,
      model,
      sourceAvailabilityStatus: ctx.saeStatus,
      retrievedCount: ctx.rerankedChunks?.length || 0
    });
    openaiCallTiming.completedAt = new Date().toISOString();
    openaiCallTiming.durationMs = Date.now() - openaiCallStartMs;
    openaiCallTiming.status = "completed";
  } catch (e) {
    const lastCall = diagnostics.openaiCalls[diagnostics.openaiCalls.length - 1];
    if (lastCall && !lastCall.completedAt) {
      lastCall.completedAt = Date.now();
      lastCall.durationMs = lastCall.completedAt - lastCall.startedAt;
      lastCall.status = "error";
      lastCall.errorCode = e?.code || null;
      lastCall.errorType = e?.type || e?.name || e?.constructor?.name || "Error";
      lastCall.messageSummary = String(e?.message || e || "").slice(0, 180);
    }
    const label = `OpenAI step-14 error [${e?.name || e?.constructor?.name}] status=${e?.status} code=${e?.code}: ${e?.message}`;
    trace.warnings.push({ step: 14, warning: label });
    if ((ctx.rerankedChunks || []).length > 0) {
      console.warn("[OPENAI FAILURE RETRIEVAL PRESERVED]", {
        retrievedSourceCount: ctx.rerankedChunks.length,
        saeStatus:           ctx.saeStatus,
        errorStatus:         e?.status || null,
        errorCode:           e?.code || null
      });
      openAiResult = {
        answer: buildOpenAiFailureRetrievalAnswer(ctx, query),
        orchestration: {
          mode:                  ctx.mode,
          openAiModel:           model || process.env.OPENAI_MODEL || process.env.DEFAULT_OPENAI_MODEL || "gpt-4o-mini",
          openAiError:           e?.message || String(e),
          openAiErrorStatus:     e?.status || null,
          openAiErrorCode:       e?.code || null,
          openAiProjectAccessFailure:
            e?.status === 403 ||
            e?.code === "model_not_found" ||
            /does not have access to model|model_not_found/i.test(e?.message || ""),
          retrievalPreserved:    true,
          fallbackAnswerUsed:    true,
          answerGenerationFailed: true
        }
      };
    } else {
      publishDiagnostics(false);
      throw new Error(label);
    }
  }
  ctx.rawAnswer    = openAiResult?.answer || "";
  ctx.orchestration = openAiResult?.orchestration || {};
  if (!openaiCallTiming.model) {
    openaiCallTiming.model = ctx.orchestration?.diagnostics?.model || ctx.orchestration?.model || null;
  }
  timing.partialPipelineState.generationCompleted = true;
  timing.stageCompleted("GENERATION_COMPLETE", "generation", {
    openaiDurationMs: openaiCallTiming.durationMs,
    model: openaiCallTiming.model
  });
  publishDiagnostics(false);
  trace.steps.push({ step: 14, name: "openAiCompletion", done: true });

  // ── PATCH-017C: Post-Generation Timeout Safeguard ────────────────────────
  if (ctx._fastEwtAuthorityPath && ctx.saeStatus === "AUTHORITY_FOUND") {
    const _pgElapsed = timing.elapsedMs();
    const _pgBudget  = timing.budgetMs;
    if (_pgElapsed > _pgBudget * 0.9) {
      console.warn("[POST_GENERATION_TIMEOUT_WITH_AUTHORITY_FOUND]", {
        query:             query.slice(0, 120),
        elapsedMs:         _pgElapsed,
        budgetMs:          _pgBudget,
        saeStatus:         ctx.saeStatus,
        lockedAuthorities: ctx.lockedAuthorities || ctx._preGenLockedAuthorities || [],
        preGenCardCount:   ctx.preGenerationSourceCards?.length ?? 0
      });
    }
  }

  // Refine rendering mode from the orchestration engine's determineMode() result.
  // ctx.mode (Step 2) reflects only the hook type (e.g. "STANDARD_TAX_MODE" for /ask).
  // The orchestration engine analyzes query intent and returns a specific rendering
  // mode: FAST_DEFINITION for "what is VAT?", LEGAL_ANALYSIS for doctrinal queries, etc.
  // Specialized hook modes (QUIZ_MODE, REVIEWER_MODE, etc.) are pinned and must not
  // be overridden by orchestration inference.
  const PINNED_HOOK_MODES = new Set([
    "QUIZ_MODE", "REVIEWER_MODE", "CASE_ANALYSIS", "SOURCE_LOOKUP",
    "SENIOR_COUNSEL_MEMO", "COMPLEX_ADVISORY"
  ]);
  const orchestrationRefinedMode = ctx.orchestration?.mode;
  if (orchestrationRefinedMode && !PINNED_HOOK_MODES.has(ctx.mode)) {
    if (ctx._fastEwtAuthorityPath && orchestrationRefinedMode === "LEGAL_ANALYSIS") {
      console.log("[LEGAL_ANALYSIS_ESCALATION_SUPPRESSED]", {
        query:          query.slice(0, 120),
        primaryIssue:   ctx.issueClassification?.primaryIssue,
        suppressedMode: orchestrationRefinedMode,
        preservedMode:  ctx.mode,
        saeStatus:      ctx.saeStatus
      });
    } else {
      console.log(`[TINA MODE] Refining ctx.mode from '${ctx.mode}' → '${orchestrationRefinedMode}' (orchestration)`);
      ctx.mode = orchestrationRefinedMode;
    }
  }
  ctx.responseStyle = ctx.orchestration?.responseStyle || null;
  // isAskMode: plain queries (no explicit hook) are rendering-equivalent to /ask.
  // Renderer selection must rely on ctx.mode, not raw hook string detection.
  const isAskMode = !hook || hook === "/ask";
  if (ctx.mode !== "FAST_DEFINITION" || !isAskMode) {
    if (ctx.responseStyle) {
      console.log(`[MODE ISOLATION] responseStyle cleared: hook=${hook} mode=${ctx.mode}`);
    }
    ctx.responseStyle = null;
  }

  // ── PATCH-017I: Renderer source-state normalization ──────────────────────
  // Ensure limitationRequired and disclosureType are coherent with confirmed AUTHORITY_FOUND
  // before handing off to answer-renderer and final-answer-compliance.
  if (ctx.saeStatus === "AUTHORITY_FOUND") {
    if (ctx.limitationRequired !== false) ctx.limitationRequired = false;
    if (ctx.disclosureType)               ctx.disclosureType     = null;
    console.log("[PATCH-017I]", {
      marker:             "PATCH_017I_RENDERER_SOURCE_STATE_NORMALIZED",
      saeStatus:          ctx.saeStatus,
      mode:               ctx.mode,
      limitationRequired: ctx.limitationRequired,
      disclosureType:     ctx.disclosureType
    });
  }

  // ── Step 15: Format Answer ────────────────────────────────────────────────
  markPipelineCheckpoint(diagnostics, "RENDERING_STARTED", {
    timingField: "renderingStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  ctx.formattedAnswer = renderTinaAnswer({
    answer:              ctx.rawAnswer,
    sources:             ctx.rerankedChunks || [],
    includeSources:      false,  // sourceCards chip-rendered by frontend; no duplicate text block
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    responsePlan:        ctx.responsePlan,
    saeStatus:           ctx.saeStatus,
    sourceAvailability:  ctx.sourceAvailability,
    sourceAvailabilityMetadata: ctx.sourceAvailability,
    limitationRequired:  ctx.limitationRequired,
    disclosureType:      ctx.disclosureType,
    statusReason:        ctx.statusReason,
    conflict:            ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null
  });
  markPipelineCheckpoint(diagnostics, "RENDERING_COMPLETE", {
    timingField: "renderingCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  trace.steps.push({ step: 15, name: "answerRenderer", done: true });

  // ── Step 16: Final Compliance Validation ──────────────────────────────────
  diagnostics.partialPipelineState.complianceStarted = true;
  markPipelineCheckpoint(diagnostics, "COMPLIANCE_STARTED", {
    timingField: "complianceStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  const compliantResult = enforceFinalAnswerCompliance({
    draftAnswer:         ctx.formattedAnswer,
    sources:             ctx.rerankedChunks || [],
    retrievedSources:    ctx.rerankedChunks || [],
    conflicts:           ctx.conflictAnalysis?.trueConflicts || [],
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    responsePlan:        ctx.responsePlan,
    saeStatus:           ctx.saeStatus,
    sourceAvailability:  ctx.sourceAvailability,
    sourceAvailabilityMetadata: ctx.sourceAvailability,
    limitationRequired:  ctx.limitationRequired,
    disclosureType:      ctx.disclosureType,
    statusReason:        ctx.statusReason,
    query
  });
  diagnostics.partialPipelineState.complianceCompleted = true;
  markPipelineCheckpoint(diagnostics, "COMPLIANCE_COMPLETE", {
    timingField: "complianceCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  trace.steps.push({ step: 16, name: "finalAnswerCompliance", done: true });
  // PATCH-024A: force hard-fail when a specific BIR issuance was cited but not indexed.
  const saeHardFailBlocked = hasSaeHardFail(compliantResult) || ctx._024a_exactAuthorityMissing === true;
  const saeHardFailFallback = saeHardFailBlocked
    ? buildSaeHardFailFallback(ctx, compliantResult)
    : null;

  // ── Step 17: Presentation Transform (FAST_DEFINITION only) ─────────────────
  // Converts validated structured output to conversational paragraphs.
  // Compliance gate output is preserved as fallback if section parsing fails.
  // Strip "Validated Indexed Sources" appendix added by final-answer-compliance —
  // the frontend renders sourceCards as chips; text source lists are redundant.
  const rawFinalAnswer = (saeHardFailFallback || compliantResult?.finalAnswer || compliantResult?.answer || ctx.formattedAnswer)
    .replace(/\n+Validated Indexed Sources[\s\S]*$/i, "")
    .trim();
  // FAST_DEFINITION conversational rendering only fires when no /ask profile
  // is active — /ask profiles use their own section headings and must not be
  // reparsed by the FAST_DEFINITION paragraph converter.
  const finalAnswer = (!saeHardFailBlocked && ctx.mode === "FAST_DEFINITION" && isAskMode && !ctx.responsePlan?.askProfile)
    ? renderFastDefinitionConversational(rawFinalAnswer, query, ctx.responseStyle)
    : rawFinalAnswer;

  // ── Stage 2C: Educational sources (FAST_DEFINITION ask-mode only) ────────
  const educationalSources =
    (isAskMode && ctx.mode === "FAST_DEFINITION")
      ? buildEducationalSources(ctx.rerankedChunks, ctx.responseStyle, query)
      : null;

  timing.stageStarted("SOURCE_SELECTION_STARTED", "sourceSelection");
  publishDiagnostics(false);

  // Build provision-aware source cards with dedup.
  // Title = canonical authority label only (e.g. "NIRC Sec. 105", "RR No. 16-2005").
  // Raw filename / documentTitle is preserved in the documentTitle field.
  // Dedup key = provision reference, so each distinct section gets one card;
  // multiple chunks of the same section are collapsed to the first one.
  // This is semantically distinct from educationalSources (Learn More) which
  // groups at document level — same PDF appears in both but with different labels.
  //
  // Priority model (replaces Gate 3 exclusive whitelist):
  //   • Gate 1 (contamination) and Gate 2 (consistency) are hard blocks.
  //   • targetAuthorities is a RANKING signal, not a mandatory whitelist.
  //   • Retrieved, issue-relevant implementing regs (e.g. RR 2-98 for EWT) that
  //     are absent from targetAuthorities still appear as chips — just sorted after
  //     explicitly targeted authorities.
  //   • After collecting up to CANDIDATE_CAP unique candidates, sort target-matched
  //     cards first (preserving reranker order within each group), then slice to 5.
  markPipelineCheckpoint(diagnostics, "SOURCE_SELECTION_STARTED", {
    timingField: "sourceSelectionStartedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0
  });
  // PATCH-018A: Pre-source-selection counts before source card loop
  console.log("[PATCH_018A_PRE_SOURCE_SELECTION_COUNTS]", {
    rerankedChunks:        ctx.rerankedChunks?.length ?? 0,
    saeStatus:             ctx.saeStatus,
    saeSuppressSourceCards: saeHardFailBlocked || sourceCardsSuppressedBySaeStatus(ctx.saeStatus),
    eligibleCandidates:    ctx.eligibleCandidates?.length ?? 0,
    targetAuthorities:     (ctx.issueClassification?.targetAuthorities || []).length
  });

  const CANDIDATE_CAP  = 15; // collect more before priority-sort; final slice is 5
  const _scSeen        = new Map();
  const targetAuths    = ctx.issueClassification?.targetAuthorities || [];
  const hasTargetAuthorities = targetAuths.length > 0;
  const semanticNoMatchGuardActive = hasSemanticNoMatchGuard(ctx.issueClassification || {});
  // Skip counters - aggregated into a single structured log after the loop.
  const _scSkip = { contamination: 0, consistency: 0, issueRelevance: 0, semanticNoMatch: 0 };
  const _scSkipIssueDetail = [];   // up to 5 rejected non-target provRef values
  const isSourceLookupMode = String(ctx.mode || "").toUpperCase() === "SOURCE_LOOKUP";

  for (const c of (ctx.rerankedChunks || [])) {
    if (_scSeen.size >= CANDIDATE_CAP) break;

    // Identity derivation — computed before Gate 1 so sourcePathAuthorityHit can
    // protect RR/RMC/RMO/RAMO chunks whose normalized_reference was corrupted at
    // index time (e.g. "NIRC Sec. 4" written into an RR 16-2005 chunk).
    const linkedType = inferLinkedSourceType(c);
    let provRef = resolveSourceCardDisplayRef(c, linkedType);   // `let` — may be promoted below

    // True when this is a SOURCE_LOOKUP query and the chunk is a well-formed
    // RR/RMC/RMO/RAMO card whose source path unambiguously identifies the issuance.
    // Exempts such chunks from Gate 1 contamination and Gate 3 issue-relevance
    // rejection that was triggered by a stale/malformed normalized_reference.
    const sourcePathAuthorityHit =
      isSourceLookupMode &&
      ["RR", "RMC", "RMO", "RAMO"].includes(linkedType) &&
      Boolean(provRef) &&
      sourceCardIsConsistent(provRef, linkedType);

    // Gate 1 (contamination): hard-blocks cross-domain chunks flagged by reranker
    // as BOTH off-target AND issue-mismatched (the strictest reranker signal).
    // sourcePathAuthorityHit exempts correctly-identified RR/RMC/RMO/RAMO cards in
    // SOURCE_LOOKUP — their source path is authoritative even when normalized_reference
    // misled the reranker.
    // PATCH-021F: court sources for jurisprudence queries are exempt from the
    // contamination gate — they are never statute/RR target matches, and the
    // reranker's issueMismatch flag is tuned for statute targets. Staging
    // audit: skipContamination: 1 was the court card.
    const _021fCourtCard =
      ctx.issueClassification?.isJurisprudenceQuery === true &&
      patch021cIsCaseAuthority(c);
    if (
      !sourcePathAuthorityHit &&
      !_021fCourtCard &&
      hasTargetAuthorities &&
      c.targetAuthorityMatch === false &&
      c.issueMismatch === true
    ) {
      _scSkip.contamination++;
      continue;
    }
    if (_021fCourtCard) {
      console.log("[PATCH_021F_COURT_CARD_ELIGIBILITY_APPLIED]", {
        stage: "pipeline_candidate_loop",
        ref: c.normalizedReference || c.normalized_reference || c.citation || c.title || "(no-ref)",
        contaminationExempt: true
      });
    }

    if (!c.title && !c.document_title && !c.source && !c.originalSource) continue;

    // Gate 0 (visibility): hidden/reviewer-only materials must not appear as source
    // chips outside reviewer/quiz modes.  Mirrors the same gate in filterVisibleSources().
    if (shouldHideSource(c, ctx.issueClassification)) continue;
    // PATCH-017B: EWT bridge (PATCH-017A) + fixed signature (query string, not object; returns bool).
    const _scEwtBridge = isEwtBridgeEligible(ctx.issueClassification, c, query);
    if (
      semanticNoMatchGuardActive && !_scEwtBridge &&
      !sourceMaterialTermsMatchAuthority(c, query)
    ) {
      _scSkip.semanticNoMatch++;
      continue;
    }

    // Gate 2 (consistency): NIRC labels must link to NIRC/statute documents, etc.
    if (provRef && !sourceCardIsConsistent(provRef, linkedType)) {
      _scSkip.consistency++;
      continue;
    }

    // Priority signal: does this chunk canonically match a target authority?
    // Non-matching chunks are not immediately rejected — they become lower-priority
    // candidates if they also pass Gate 3 (issue relevance) below.
    let _isTargetMatch = !hasTargetAuthorities; // no targets → everything is "matched"
    if (hasTargetAuthorities) {
      if (provRef) {
        _isTargetMatch = isTargetAllowedCard(provRef, linkedType, targetAuths);
      } else {
        // Try to boost unlabeled chunk with a target-safe label.
        // If found, promote provRef and mark as target-matched.
        // If not found, chunk still passes as a lower-priority candidate (Gate 3 decides).
        const _safeRef = deriveTargetSafeDocumentRef(c, linkedType, targetAuths);
        if (_safeRef) {
          provRef       = _safeRef;
          _isTargetMatch = true;
        }
      }
    }

    // Gate 3 (issue relevance): non-target candidates must have affirmative
    // issue relevance according to the reranker's issueClassificationMatch.matched
    // signal.  This blocks VAT-domain chunks (NIRC Sec. 106, RMC 65-2012) from
    // appearing as chips in an EWT query, while still allowing retrieved
    // implementing regs whose doc issues genuinely overlap with the query
    // (e.g. RR 2-98 for EWT, RMC 65-2012 for condo-dues VAT queries).
    //
    // Target-matched chunks bypass this gate — they were explicitly requested by
    // the issue classifier and are always relevant by definition.
    // sourcePathAuthorityHit also bypasses — the source path is more reliable than
    // the reranker's issue-match signal when normalized_reference is corrupted.
    if (!_isTargetMatch && !sourcePathAuthorityHit) {
      const _rel = isIssueRelevantSourceCardCandidate(c);
      if (!_rel.allowed) {
        _scSkip.issueRelevance++;
        if (_scSkipIssueDetail.length < 5) {
          _scSkipIssueDetail.push({ ref: provRef || "(no-ref)", reason: _rel.reason });
        }
        continue;
      }
    }

    // Guard: when no issuance label was derived (provRef still ""), validate any
    // DB-stored normalizedReference against the actual linkedType before allowing it
    // to become the chip label.  Without this check, a chunk whose DB field says
    // normalizedReference="NIRC Sec. 4" but whose linkedType is "RR" would produce
    // a chip labeled "NIRC Sec. 4" that opens an RR PDF.
    //
    // Only fires when linkedType is known — unknown types (linkedType="") fall through
    // so that legitimate DB labels are still inherited when we have no counter-evidence.
    if (!provRef && linkedType) {
      const _cMeta  = c.metadata || {};
      const _dbRef  =
        c.normalizedReference || c.normalized_reference ||
        _cMeta.normalizedReference || _cMeta.normalized_reference || "";
      if (_dbRef) {
        const _dbLabelType = sourceCardLabelType(_dbRef);
        if (_dbLabelType && !sourceCardIsConsistent(_dbRef, linkedType)) {
          _scSkip.consistency++;
          continue;
        }
      }
    }

    const docTitle = sourceCardDocumentTitle(c);

    // Dedup: canonical authority key (strips "No.", punctuation, separators) so that
    // variant encodings of the same issuance (RR No. 16-2005 / RR_16_2005 / rr-16-2005)
    // all collapse to one card ("rr162005").  Falls back to raw docTitle+chunk for
    // sources without any issuance signal.
    const dedupeKey = provRef
      ? canonicalSourceKey(provRef)
      : (docTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);

    const meta = c.metadata || {};
    const url  =
      c.driveViewUrl    || c.drive_view_url    ||
      c.url             || c.webViewLink        ||
      c.web_view_link   || c.sourceUrl          ||
      c.source_url      ||
      meta.driveViewUrl || meta.drive_view_url  ||
      meta.url          || meta.webViewLink      ||
      meta.web_view_link || meta.sourceUrl       ||
      meta.source_url   || "";

    if (_scSeen.has(dedupeKey)) continue;

    _scSeen.set(dedupeKey, {
      _targetMatch:        _isTargetMatch,  // priority tag — stripped before output
      authorityMatchTier:  c.authorityMatchTier || c.issueClassificationMatch?.authorityMatchTier || 4,
      title:               provRef || docTitle || "Source",
      citation:            provRef || c.citation || "",
      authorityType:       c.authorityType || c.authority_type || "UNKNOWN",
      driveViewUrl:        url,
      drive_view_url:      url,
      url,
      webViewLink:         c.webViewLink   || meta.webViewLink   || "",
      web_view_link:       c.web_view_link || meta.web_view_link || "",
      sourceUrl:           c.sourceUrl     || c.source_url       || meta.sourceUrl || meta.source_url || "",
      source_url:          c.source_url    || meta.source_url    || "",
      documentTitle:       c.document_title || c.documentTitle   || meta.documentTitle || docTitle || "",
      document_title:      c.document_title || meta.documentTitle || "",
      normalizedReference: provRef || c.normalizedReference || c.normalized_reference || meta.normalizedReference || "",
      normalized_reference: provRef || c.normalized_reference || meta.normalizedReference || "",
      reference:           c.reference || "",
      source:              c.source    || "",
      linkedSourceType:    linkedType,
      excerpt:             String(c.text || c.content || "").slice(0, 300)
    });
  }

  // Sort: target-matched candidates first (reranker order preserved within group),
  // then non-target candidates.  Slice to 5 visible chips.
  const _scCandidateArray = [..._scSeen.values()];
  const _scTargetMatched  = _scCandidateArray
    .filter(v =>  v._targetMatch)
    .sort((a, b) => sourceCardPlanSortScore(a) - sourceCardPlanSortScore(b));
  const _scNonTarget      = _scCandidateArray
    .filter(v => !v._targetMatch)
    .sort((a, b) => sourceCardPlanSortScore(a) - sourceCardPlanSortScore(b));
  let _scSorted           = [..._scTargetMatched, ..._scNonTarget];

  // PATCH-021C: for case-law intent queries, SC/CTA cards outrank statute/RR
  // cards regardless of target-match tier (the WHT targets are statutes, which
  // would otherwise pin NIRC Sec. 57/58 ahead of retrieved decisions).
  // Stable sort: prior ordering is preserved within each jurisprudence rank.
  if (ctx.issueClassification?.isJurisprudenceQuery === true) {
    _scSorted = [..._scSorted].sort(
      (a, b) => patch021cJurisprudenceRank(a) - patch021cJurisprudenceRank(b)
    );
  }

  console.log("[SOURCE CARD CANDIDATES]", {
    total:              _scCandidateArray.length,
    targetMatched:      _scTargetMatched.length,
    nonTarget:          _scNonTarget.length,
    skipContamination:  _scSkip.contamination,
    skipConsistency:    _scSkip.consistency,
    skipIssueRelevance: _scSkip.issueRelevance,
    skipSemanticNoMatch: _scSkip.semanticNoMatch,
    targetMatched_labels: _scTargetMatched.map(v => v.normalizedReference || v.title || "?"),
    nonTarget_labels:     _scNonTarget.map(v => v.normalizedReference || v.title || "?").slice(0, 5),
    ...(_scSkipIssueDetail.length > 0 && { rejectedByIssue: _scSkipIssueDetail })
  });

  const _scFiltered = _scSorted.slice(0, 5);
  // Strip internal priority tag before passing to sanitizer / outbound response.
  // eslint-disable-next-line no-unused-vars
  const _scFilteredClean = _scFiltered.map(({ _targetMatch, ...card }) => card);

  console.log("[SOURCE CARD FILTERED]", {
    count:  _scFilteredClean.length,
    labels: _scFilteredClean.map(v => v.normalizedReference || v.title || "?")
  });

  // Non-empty safety fallback ─────────────────────────────────────────────────
  // Fires only when the main loop produced zero candidates (all chunks rejected
  // by Gates 1–3, or rerankedChunks is empty).  Applies the same three gates as
  // the main loop so fallback cannot reintroduce chunks that Gate 3 already
  // rejected (e.g. NIRC Sec. 106/107 or RMC 65-2012 for an EWT query).
  if (_scFilteredClean.length === 0) {
    const _fbCandidates = (ctx.rerankedChunks || []).filter(c => {
      if (!c.title && !c.document_title && !c.source && !c.originalSource) return false;
      // Gate 0 (visibility): mirrors the gate in the primary loop.
      if (shouldHideSource(c, ctx.issueClassification)) return false;
      // PATCH-017B: EWT bridge (PATCH-017A) + fixed signature (query string; returns bool).
      const _fbEwtBridge = isEwtBridgeEligible(ctx.issueClassification, c, query);
      if (
        semanticNoMatchGuardActive && !_fbEwtBridge &&
        !sourceMaterialTermsMatchAuthority(c, query)
      ) return false;
      // Derive identity here so sourcePathAuthorityHit can protect Gate 1 and Gate 3
      // (mirrors the main loop restructuring above).
      const _fbLType = inferLinkedSourceType(c);
      const _fbRef   = resolveSourceCardDisplayRef(c, _fbLType);
      const _fbSourcePathAuthorityHit =
        isSourceLookupMode &&
        ["RR", "RMC", "RMO", "RAMO"].includes(_fbLType) &&
        Boolean(_fbRef) &&
        sourceCardIsConsistent(_fbRef, _fbLType);
      // Gate 1: explicit contamination
      if (
        !_fbSourcePathAuthorityHit &&
        hasTargetAuthorities &&
        c.targetAuthorityMatch === false &&
        c.issueMismatch === true
      ) return false;
      // Gate 3: issue relevance for non-target chunks (mirrors main loop)
      if (!c.targetAuthorityMatch && !_fbSourcePathAuthorityHit) {
        const _rel = isIssueRelevantSourceCardCandidate(c);
        if (!_rel.allowed) return false;
      }
      return true;
    });
    if (_fbCandidates.length > 0) {
      for (const c of _fbCandidates) {
        const _fbLType    = inferLinkedSourceType(c);
        const _fbRef      = resolveSourceCardDisplayRef(c, _fbLType) ||
                            deriveTargetSafeDocumentRef(c, _fbLType, targetAuths) || "";
        const _fbDocTitle = sourceCardDocumentTitle(c);
        const _fbKey      = _fbRef
          ? canonicalSourceKey(_fbRef)
          : (_fbDocTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);
        if (!_fbKey) continue;
        if (_scFilteredClean.some(x =>
          x.normalizedReference && canonicalSourceKey(x.normalizedReference) === _fbKey
        )) continue;
        const _fbMeta = c.metadata || {};
        const _fbUrl  =
          c.driveViewUrl  || c.drive_view_url  || c.url          || c.webViewLink  ||
          c.web_view_link || c.sourceUrl       || c.source_url   ||
          _fbMeta.driveViewUrl || _fbMeta.drive_view_url || _fbMeta.url ||
          _fbMeta.webViewLink  || _fbMeta.web_view_link  ||
          _fbMeta.sourceUrl    || _fbMeta.source_url     || "";
        _scFilteredClean.push({
          title:               _fbRef || _fbDocTitle || "Source",
          citation:            _fbRef || c.citation || "",
          authorityType:       c.authorityType || c.authority_type || "UNKNOWN",
          driveViewUrl:        _fbUrl,
          drive_view_url:      _fbUrl,
          url:                 _fbUrl,
          webViewLink:         c.webViewLink  || _fbMeta.webViewLink  || "",
          web_view_link:       c.web_view_link || _fbMeta.web_view_link || "",
          sourceUrl:           c.sourceUrl    || c.source_url || _fbMeta.sourceUrl || _fbMeta.source_url || "",
          source_url:          c.source_url   || _fbMeta.source_url || "",
          documentTitle:       c.document_title || _fbMeta.document_title || _fbDocTitle || "",
          document_title:      c.document_title || _fbMeta.document_title || "",
          normalizedReference: _fbRef || c.normalizedReference || c.normalized_reference || _fbMeta.normalizedReference || "",
          normalized_reference: _fbRef || c.normalized_reference || _fbMeta.normalizedReference || "",
          reference:           c.reference || "",
          source:              c.source    || "",
          linkedSourceType:    _fbLType,
          excerpt:             String(c.text || c.content || "").slice(0, 300)
        });
        if (_scFilteredClean.length >= 5) break;
      }
      console.warn("[SOURCE CARDS FALLBACK]", {
        reason:     "main loop 0 candidates; rebuilt applying Gates 1+3 (no target whitelist)",
        produced:   _scFilteredClean.length,
        candidates: _fbCandidates.length,
        labels:     _scFilteredClean.map(v => v.normalizedReference || v.title || "?").slice(0, 6)
      });
    }
  }

  // Final outbound sanitizer: re-check each card's label↔document-type consistency.
  // Relabels or drops cards that slipped through earlier gates (e.g. a card with
  // normalizedReference="NIRC Sec. 4" whose source field identifies it as RR).
  const sourceCards = sanitizeOutboundSourceCards(_scFilteredClean, targetAuths);

  // Diagnostic log — shows the exact array that will be sent as result.sourceCards.
  // Each entry shows the chip label (ref), document type (type), source identity field
  // (src — what the sanitizer uses to re-derive type), and whether a clickable URL exists
  // in the outbound payload (hasUrl checks publicUrl after PATCH-023B URL bridging).
  console.log("[SOURCE CARDS FINAL]", {
    count:      sourceCards.length,
    targetAuths: targetAuths.slice(0, 8),
    cards: sourceCards.map(c => ({
      ref:    c.normalizedReference || c.citation || "(none)",
      type:   c.linkedSourceType   || "",
      src:    c.source             || c.document_title || "(none)",
      hasUrl: Boolean(c.publicUrl)
    }))
  });

  // ── Stage 1: Source Authority Selector — active selection (runs BEFORE DSF) ──
  // SAS is now the active Single Source of Truth for authority-priority ordering.
  // It selects and orders cards from the reranked pool by:
  //   Tier 1 exact controlling authorities (classifier order)
  //   →  Tier 2 range members  →  Tier 1 supporting  →  Tier 3/4 generic
  // Never throws; exceptions returned in diagnostics.error.
  const _sasResult = selectSourceAuthorities({
    rerankedChunks:      ctx.rerankedChunks || [],
    issueClassification: ctx.issueClassification || {},
    query,
    answerText:          finalAnswer || "",
    mode:                ctx.mode   || "",
    maxSources:          5,
    saeStatus:           ctx.saeStatus,
    sourceAvailability:  ctx.sourceAvailability,
    limitationRequired:  ctx.limitationRequired
  });
  trace._sourceAuthoritySelectorDiagnostics = _sasResult.diagnostics;

  // Gate 0 on SAS cards: shouldHideSource is not called inside SAS, so apply it here.
  const _sasVisible = (_sasResult.visibleSourceCards || [])
    .filter(c => !shouldHideSource(c, ctx.issueClassification))
    .sort((a, b) => sourceCardPlanSortScore(a) - sourceCardPlanSortScore(b));

  if (!_sasResult.diagnostics.error) {
    console.log("[SAS ACTIVE]", {
      version:        _sasResult.diagnostics.selectorVersion,
      inspected:      _sasResult.diagnostics.totalChunksInspected,
      accepted:       _sasResult.diagnostics.accepted,
      rejected:       _sasResult.diagnostics.rejected,
      visible:        _sasVisible.length,
      selectorLabels: _sasResult.diagnostics.selectorLabels
    });
  } else {
    console.warn("[SAS ERROR] (non-blocking):", _sasResult.diagnostics.error);
  }

  // ── Direct-support display filter ────────────────────────────────────────────
  // DSF is a display-safety filter — it does NOT determine authority priority order.
  // When SAS produced authority-ordered cards, DSF operates on that ordered list.
  // When SAS produced nothing, DSF falls back to the pipeline loop's sourceCards.
  // HARD RULE: only controls what is DISPLAYED; does not touch retrieval / LLM context.
  const _saeSuppressSourceCards = saeHardFailBlocked || sourceCardsSuppressedBySaeStatus(ctx.saeStatus);
  const _dsfInput = _saeSuppressSourceCards
    ? []
    : _sasVisible.length > 0 ? _sasVisible : sourceCards;
  const {
    displayedSources: _dsFiltered,
    diagnostics:      _dsDiag
  } = filterDisplayedSourcesByDirectSupport({
    candidateSources:    _dsfInput,
    answerText:          finalAnswer,
    issueClassification: ctx.issueClassification,
    query,
    legalBasisText:      "",
    keyTerms:            [],
    mode:                ctx.mode,
    hook
  });
  console.log("[DIRECT SUPPORT FILTER]", _dsDiag);

  // ── Final source card resolution ──────────────────────────────────────────────
  // SAS is primary; DSF is a display safety filter.
  // Key invariant: Tier 1 exact controlling authorities selected by SAS cannot be
  // suppressed by a partial DSF result.  They are restored at the front before cap.
  let finalSourceCards;
  if (_sasVisible.length > 0) {
    if (_dsFiltered.length > 0) {
      // Restore any Tier 1 exact controlling authority cards that DSF dropped.
      // These are the classifier's highest-confidence authorities (exact provision
      // match) and must appear regardless of DSF answer-text proximity scoring.
      const _dsKeys = new Set(
        _dsFiltered
          .map(c => canonicalSourceKey(c.normalizedReference || c.citation || ""))
          .filter(Boolean)
      );
      const _controllingKeys = new Set([
        ...(Array.isArray(ctx.issueClassification?.controllingAuthorities)
          ? ctx.issueClassification.controllingAuthorities
          : []),
        ...(Array.isArray(ctx.issueClassification?.targetAuthorityGroups?.controllingAuthorities)
          ? ctx.issueClassification.targetAuthorityGroups.controllingAuthorities
          : [])
      ].map(a => canonicalSourceKey(a)).filter(Boolean));
      // Restore planned authority cards (authorityMatchTier 1 or 2) that DSF dropped.
      // This covers exact controlling/supporting authorities and NIRC range members
      // such as estate-tax sections inside "NIRC Secs. 84-97".
      const _tier1Dropped = _sasVisible.filter(c => {
        const k = canonicalSourceKey(c.normalizedReference || c.citation || "");
        const _tierEligible = Number(c.authorityMatchTier || 4) <= 2;
        const _controllingFallback = k && _controllingKeys.has(k);
        return k && (_tierEligible || _controllingFallback) && !_dsKeys.has(k);
      });
      if (_tier1Dropped.length > 0) {
        // Preserve DSF-kept/direct cards first, then add restored planned authorities.
        const _restoreSeen = new Set();
        finalSourceCards = [..._dsFiltered, ..._tier1Dropped]
          .filter(c => {
            const k = canonicalSourceKey(c.normalizedReference || c.citation || "") ||
                      ((c.documentTitle || "") + "|" + (c.source || "")).toLowerCase().slice(0, 60);
            if (_restoreSeen.has(k)) return false;
            _restoreSeen.add(k);
            return true;
          })
          .slice(0, 5);
        console.log("[SAS EXACT AUTHORITY RESTORED]", {
          restored: _tier1Dropped.map(c => c.normalizedReference || c.citation || "?"),
          dsfKept:  _dsFiltered.length,
          final:    finalSourceCards.length
        });
      } else {
        finalSourceCards = _dsFiltered;
      }
    } else {
      // DSF dropped all cards — use SAS output directly (authority-priority ordered).
      finalSourceCards = _sasVisible.slice(0, 5);
      console.log("[SAS FALLBACK ACTIVATED]", {
        reason:  "direct_support_filter_dropped_all_cards",
        count:   finalSourceCards.length,
        labels:  finalSourceCards.map(c => c.normalizedReference || c.citation || "?")
      });
    }
  } else {
    // SAS found nothing — preserve existing DSF behavior as last resort.
    finalSourceCards = _dsFiltered;
  }
  // ── End Stage 1 ──────────────────────────────────────────────────────────────

  // ── Source Availability Classification ────────────────────────────────────────
  // Step 6.5 already classified source availability before prompt assembly.
  // This wrapper preserves legacy response fields without recalculating status.
  if (_saeSuppressSourceCards) {
    if (finalSourceCards.length > 0 || sourceCards.length > 0 || _sasVisible.length > 0) {
      console.warn("[SAE SOURCE CARD SUPPRESSION]", {
        saeStatus:      ctx.saeStatus,
        sourceCards:    sourceCards.length,
        sasVisible:     _sasVisible.length,
        dsfVisible:     _dsFiltered.length,
        finalBeforeCut: finalSourceCards.length
      });
    }
    finalSourceCards = [];
  }

  if (!_saeSuppressSourceCards && ctx.saeStatus === "AUTHORITY_FOUND" && targetAuths.length > 0) {
    // ── PATCH-017K: indexed supporting authority availability mapping ─────────────
    //
    // Problem: RR 16-2005 is in ctx.rerankedChunks but its chunk stores
    // normalizedReference as "Revenue Regulation No. 16-2005", which canonicalizes
    // to "revenueregulation162005" — not the "rr162005" we get from the target
    // string "RR 16-2005".  The previous exact-key match missed it.
    //
    // Fix (two layers):
    //   1. Alias-aware candidate key set — checks direct key AND RR-alias-normalized
    //      key AND inferAdministrativeRef-inferred key for each chunk.
    //   2. Indexed supporting authority fallback — if the target appears in the
    //      classification's supportingAuthorities (authority inventory lookup) and
    //      no chunk was found even after alias expansion, create a minimal card
    //      backed by the classification's authority inventory.
    // ─────────────────────────────────────────────────────────────────────────────

    // Supporting authorities pool (classification-validated)
    const _017kSupportAuths = [
      ...(ctx.issueClassification?.supportingAuthorities || []),
      ...(ctx.issueClassification?.targetAuthorityGroups?.supportingAuthorities || [])
    ].filter(Boolean);
    const _017kSupportKeys = new Set(
      _017kSupportAuths.map(a => canonicalSourceKey(a)).filter(Boolean)
    );

    if (_017kSupportKeys.size > 0) {
      console.log("[PATCH-017K]", {
        marker:             "PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_STARTED",
        supportingAuths:    _017kSupportAuths,
        rerankedChunkCount: (ctx.rerankedChunks || []).length
      });
    }

    const existingKeys = new Set(
      finalSourceCards.map(c => canonicalSourceKey(c.citation || c.label || c.title || "")).filter(Boolean)
    );
    const restored       = [];
    const _017kMissed    = [];

    for (const target of targetAuths) {
      const targetKey = canonicalSourceKey(target);
      if (!targetKey || existingKeys.has(targetKey)) continue;

      // PATCH-017K layer 1: alias-aware candidate search
      // For each candidate, compute a set of canonical keys covering:
      //   a) direct citation/normalizedReference key
      //   b) key after normalizing "Revenue Regulation[s]" → "RR"
      //   c) key inferred via inferAdministrativeRef (for RR/RMC/RMO/RAMO chunks)
      const doc = (ctx.rerankedChunks || []).find((candidate) => {
        const meta  = candidate.metadata || {};
        const refs  = [
          candidate.citation,
          candidate.normalizedReference,
          candidate.normalized_reference,
          meta.normalizedReference,
          meta.normalized_reference,
          candidate.reference,
        ].filter(Boolean);

        for (const ref of refs) {
          if (canonicalSourceKey(ref) === targetKey) return true;
          // Alias: "Revenue Regulation[s]" → "rr" before stripping punctuation
          const rrNorm = ref.replace(/\brevenue regulation[s]?\b/gi, "rr")
                            .replace(/\bno\.?\s*/g, "");
          if (canonicalSourceKey(rrNorm) === targetKey) return true;
        }

        // inferAdministrativeRef path — reconstructs "RR No. 16-2005" from the
        // chunk's identity blob (path, source, title) for admin document types
        const lt = inferLinkedSourceType(candidate);
        if (["RR", "RMC", "RMO", "RAMO"].includes(lt)) {
          const inferred = inferAdministrativeRef(sourceCardIdentityBlob(candidate), lt);
          if (inferred && canonicalSourceKey(inferred) === targetKey) return true;
        }

        return false;
      });

      let card = doc ? sourceCardFromRetrievedTarget(doc, target) : null;

      if (doc && _017kSupportKeys.has(targetKey)) {
        console.log("[PATCH-017K]", { marker: "PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_HIT", target });
      }

      // PATCH-017K layer 2: indexed supporting authority fallback
      // When no chunk matched even after alias expansion, but the target is listed
      // in classification.supportingAuthorities (authority inventory lookup), create
      // a minimal card.  This handles the case where the authority exists in the
      // index but the retrieval window did not return a chunk for it.
      if (!card && _017kSupportKeys.has(targetKey)) {
        const _017kType = /\brr\b|\brevenue regulation/i.test(target) ? "RR"
                        : /\brmc\b|\bmemorandu[mo]\s+circular/i.test(target) ? "RMC"
                        : /\brmo\b|\bmemorandu[mo]\s+order/i.test(target)    ? "RMO"
                        : "STATUTE";
        card = sourceCardFromRetrievedTarget({ authorityType: _017kType }, target);
        if (card) {
          console.log("[PATCH-017K]", {
            marker: "PATCH_017K_INDEXED_SUPPORTING_AUTHORITY_RESTORED",
            target,
            authorityType: _017kType,
            source: "classification_authority_inventory"
          });
        }
      }

      if (!card) {
        if (_017kSupportKeys.has(targetKey)) {
          _017kMissed.push(target);
          console.log("[PATCH-017K]", { marker: "PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_MISS", target });
        }
        continue;
      }

      restored.push(card);
      existingKeys.add(targetKey);
      // Removed 2-card cap (PATCH-017J) — restore all target authorities up to 5-card total limit
    }

    // ── PATCH-017K completion summary ─────────────────────────────────────────
    if (_017kSupportKeys.size > 0) {
      const _017kFound    = _017kSupportAuths.filter(a => !_017kMissed.some(m => canonicalSourceKey(m) === canonicalSourceKey(a)));
      console.log("[PATCH-017K]", {
        marker:                         "PATCH_017K_SUPPORTING_AUTHORITY_COMPLETION_SUMMARY",
        requestedSupportingAuthorities: _017kSupportAuths,
        foundSupportingAuthorities:     _017kFound,
        missingSupportingAuthorities:   _017kMissed,
        restoredCards:                  restored.length
      });
    }

    console.log("[PATCH-017J]", {
      marker:       "PATCH_017J_SOURCE_CARD_TARGET_COMPLETION_CHECK",
      targetAuths:  targetAuths.length,
      preExisting:  finalSourceCards.length,
      restored:     restored.length
    });

    if (restored.length > 0) {
      const beforeCards = [...finalSourceCards, ...restored];
      const {
        finalCards,
        diagnostics: _027yFinalDiag
      } = mergeFinalSourceCards(finalSourceCards, restored, 5);
      finalSourceCards = finalCards;
      console.log("[PATCH_027Y_SOURCE_CARD_FINALIZED]", {
        ..._027yFinalDiag,
        beforeLabels: beforeCards.map(c => c.normalizedReference || c.citation || c.displayLabel || c.label || c.title || "?"),
        beforeCanonicalKeys: beforeCards.map(c => finalSourceCardCanonicalKey(c)).filter(Boolean)
      });
      console.log("[PATCH-017J]", {
        marker:   "PATCH_017J_VAT_SOURCE_CARD_RESTORATION_COMPLETED",
        restored: restored.map(c => c.citation || c.label),
        final:    finalSourceCards.map(c => c.citation || c.label)
      });
    }
  }

  diagnostics.partialPipelineState.displayedSourceCardCount = finalSourceCards.length;
  diagnostics.partialPipelineState.sourceLabelsBeforeTimeout = buildFirstSourceLabels(finalSourceCards.length ? finalSourceCards : ctx.rerankedChunks);
  markPipelineCheckpoint(diagnostics, "SOURCE_SELECTION_COMPLETE", {
    timingField: "sourceSelectionCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0,
    displayedSourceCardCount: finalSourceCards.length
  });

  const _sourceAvail = {
    ...ctx.sourceAvailability,
    sourceAvailability:       ctx.saeStatus,
    sourceStatus:             ctx.saeStatus,
    sourceAvailabilityReason: ctx.statusReason,
    retrievalTimedOut:        Boolean(ctx.retrievalDiagnostics?.timedOut),
    retrievedSourceCount:     ctx.rerankedChunks?.length || 0,
    displayedSourceCount:     finalSourceCards.length,
    relatedSourceCount:       ctx.saeStatus === "RELATED_AUTHORITY_ONLY" ? ctx.suppressedCandidates?.length || 0 : 0
  };

  console.log("[SOURCE AVAILABILITY]", {
    sourceAvailability: _sourceAvail.sourceAvailability,
    reason:             _sourceAvail.sourceAvailabilityReason,
    retrievalTimedOut:  _sourceAvail.retrievalTimedOut,
    retrievedCount:     _sourceAvail.retrievedSourceCount,
    displayedCount:     _sourceAvail.displayedSourceCount,
    relatedCount:       _sourceAvail.relatedSourceCount,
    mode:               ctx.mode,
    hook
  });
  timing.partialPipelineState.displayedSourceCardCount = finalSourceCards.length;
  timing.partialPipelineState.sourceAvailabilityStatusBeforeTimeout = _sourceAvail.sourceAvailability;
  timing.partialPipelineState.sourceLabelsBeforeTimeout = finalSourceCards
    .map(c => c.normalizedReference || c.citation || c.title || "")
    .filter(Boolean);
  timing.stageCompleted("SOURCE_SELECTION_COMPLETE", "sourceSelection", {
    displayedSourceCardCount: finalSourceCards.length,
    sourceAvailability: _sourceAvail.sourceAvailability
  });
  publishDiagnostics(false);

  // Apply mode-specific answer modifications based on source availability.
  // finalAnswer is const; _outputAnswer holds the post-modification result.
  let _outputAnswer = finalAnswer;
  const _isLearningMode =
    String(ctx.mode || "").toUpperCase() === "REVIEWER_MODE" ||
    String(ctx.mode || "").toUpperCase() === "QUIZ_MODE";

  if (_sourceAvail.sourceAvailability === "SOURCE_LOOKUP_EMPTY") {
    // /source: return deterministic message, no general answer.
    _outputAnswer = [
      "The source lookup completed but did not return matching authority for this query.",
      "",
      "This does not mean that no law or authority exists. Please verify the relevant indexed source before relying on a legal or tax conclusion."
    ].join("\n");
  } else if (_isLearningMode && _sourceAvail.sourceAvailability !== "AUTHORITY_FOUND") {
    // /review and /quiz: no grounded source available — guard only; these hooks
    // normally route through learningHandler, not pipeline.
    _outputAnswer = "No grounded source available.";
  }
  // ── End Source Availability ───────────────────────────────────────────────────

  // ── Step 17.4: PATCH-024C-REV4 Post-Source-Card Verified Authority Gate ──────
  // PATCH-024C's first pass (Step 16) builds its verified set from
  // ctx.rerankedChunks — raw retrieval results that may include NIRC/RR chunks
  // for authorities later excluded from finalSourceCards.  This creates false
  // positives: unsupported citations appear "verified" because the underlying
  // chunk exists in the retrieval window even though it never became a chip.
  //
  // This pass runs AFTER finalSourceCards are finalised and uses them as the
  // authoritative source set — the exact cards shown to the user.  Any citation
  // not backed by a finalSourceCard is stripped here, regardless of mode.
  //
  // Applies globally: LEGAL_ANALYSIS, COMPLEX_ADVISORY (bypassed Step 16),
  // STANDARD_TAX, FAST_DEFINITION, and any future mode.
  // Does NOT modify routing, retrieval, source-card selection, or PATCH-019A.
  //
  // PATCH-025A-REV2: ctx._patch024cPostSourcecard stores safe diagnostic metadata
  // (counts and flags only — no text, keys, or chunks) for API-response echo.
  const _024cSkipReason =
    finalSourceCards.length === 0                             ? "NO_FINAL_SOURCE_CARDS" :
    _isLearningMode                                           ? "LEARNING_MODE"         :
    _sourceAvail.sourceAvailability === "SOURCE_LOOKUP_EMPTY" ? "SOURCE_LOOKUP_EMPTY"   :
    null;
  if (!_024cSkipReason) {
    const _024c4Before = _outputAnswer;
    _outputAnswer = stripUnverifiedAuthorityLines(_outputAnswer, finalSourceCards);
    const _024c4CorrelationId = requestId || traceId || "missing-request-id";
    ctx._patch024cPostSourcecard = {
      executed:           true,
      sourceCardCount:    finalSourceCards.length,
      beforeLength:       _024c4Before.length,
      afterLength:        _outputAnswer.length,
      changed:            _024c4Before.length !== _outputAnswer.length,
      sourceAvailability: _sourceAvail.sourceAvailability,
      answerMode:         ctx.mode,
      requestId:          _024c4CorrelationId
    };
    console.log(`[PATCH_024C_POST_SOURCECARD requestId=${_024c4CorrelationId}]`, {
      marker:          "PATCH_024C_POST_SOURCECARD",
      requestId:       _024c4CorrelationId,
      traceId:         traceId || null,
      sourceCardCount: finalSourceCards.length,
      beforeLength:    _024c4Before.length,
      afterLength:     _outputAnswer.length,
      changed:         _024c4Before.length !== _outputAnswer.length
    });
  } else {
    ctx._patch024cPostSourcecard = {
      executed:           false,
      skippedReason:      _024cSkipReason,
      sourceCardCount:    finalSourceCards.length,
      sourceAvailability: _sourceAvail.sourceAvailability,
      answerMode:         ctx.mode,
      requestId:          requestId || traceId || "missing-request-id"
    };
  }
  // ── End Step 17.4 ─────────────────────────────────────────────────────────────

  // ── Step 17.5: PATCH-019A Verified-Authority Final Answer Gate ────────────────
  // Runs AFTER retrieval, SAE assignment, generation, rendering, compliance,
  // and PATCH-017J/017K source-card restoration. Text-only: no retrieval, no
  // classification change, no SAE change, no invented authorities.
  //
  // Preservation flags are derived ONLY from existing pipeline state:
  //  - VAT FAST_DEFINITION: existing classifier gate isVatDefinitionQuery()
  //    (the same flag that gates the 017H bridge in Step 6.7) OR the bridge's
  //    own applied marker (statusReason). No query-string matching here.
  //  - EWT fast path: ctx._fastEwtAuthorityPath, set only by PATCH-017F
  //    short-circuit or the PATCH-017B/017G pre-generation authority lock.
  const _019aVatBridgeApplied =
    ctx.statusReason === "VAT_DEFINITION_BRIDGE_AUTHORITY_CONFIRMED";
  const _019aVatFastDefinitionPreserved =
    ctx.mode === "FAST_DEFINITION" &&
    ctx.saeStatus === "AUTHORITY_FOUND" &&
    (isVatDefinitionQuery(ctx.issueClassification) === true || _019aVatBridgeApplied);
  const _019aEwtFastPathPreserved =
    ctx._fastEwtAuthorityPath === true &&
    ctx.saeStatus === "AUTHORITY_FOUND";

  if (_019aVatFastDefinitionPreserved) {
    console.log("[PATCH_019A_FAST_DEFINITION_PRESERVED]", {
      query:            query.slice(0, 120),
      mode:             ctx.mode,
      saeStatus:        ctx.saeStatus,
      vatBridgeApplied: _019aVatBridgeApplied,
      subIssue:         ctx.issueClassification?.subIssue || null
    });
    console.log("[PATCH_019A_FAST_VAT_AUTHORITY_PATH_PRESERVED]", {
      query:               query.slice(0, 120),
      preservedAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"]
    });
  }
  if (_019aEwtFastPathPreserved) {
    console.log("[PATCH_019A_EWT_FAST_PATH_PRESERVED]", {
      query:                query.slice(0, 120),
      mode:                 ctx.mode,
      saeStatus:            ctx.saeStatus,
      lockedAuthorities:    ctx.lockedAuthorities || ctx._preGenLockedAuthorities || [],
      preservedAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]
    });
  }

  const _019aGate = applyVerifiedAuthorityGate({
    answer:                     _outputAnswer,
    saeStatus:                  ctx.saeStatus,
    finalSourceCards,
    pipelineSourceCards:        sourceCards,
    eligibleCandidates:         ctx.eligibleCandidates || [],
    preGenerationSourceCards:   ctx.preGenerationSourceCards || [],
    lockedAuthorities:          ctx.lockedAuthorities || ctx._preGenLockedAuthorities || [],
    vatFastDefinitionPreserved: _019aVatFastDefinitionPreserved,
    ewtFastPathPreserved:       _019aEwtFastPathPreserved,
    mode:                       ctx.mode,
    route:                      hook
  });
  _outputAnswer = _019aGate.answer;
  trace.steps.push({
    step: "17.5",
    name: "verifiedAuthorityGate",
    saeStatus: ctx.saeStatus,
    leakageBlocked: _019aGate.leakageBlocked,
    relabelApplied: _019aGate.relabelApplied,
    verifiedAuthorityCount: _019aGate.verifiedAuthorityCount,
    vatFastDefinitionPreserved: _019aVatFastDefinitionPreserved,
    ewtFastPathPreserved: _019aEwtFastPathPreserved,
    done: true
  });
  // ── End Step 17.5 ─────────────────────────────────────────────────────────────

  endTrace({
    traceId,
    metadata: {
      mode:              ctx.mode,
      primaryIssue:      ctx.issueClassification?.primaryIssue || null,
      sourceCount:       ctx.rerankedChunks?.length || 0,
      trueConflicts:     ctx.conflictAnalysis?.count || 0,
      riskLevel:         ctx.riskScore?.level || null,
      warnings:          trace.warnings.length,
      pipelineLatencyMs: Date.now() - pipelineStartMs
    }
  });

  // Flush all queued Langfuse observations before the HTTP response is sent.
  // Without this, the SDK's background timer (flushInterval) may fire after
  // the response is returned, causing observations to appear empty in the UI.
  // Capped at 2 s so a slow Langfuse API never delays TINA's answer.
  await Promise.race([
    flushObservability(),
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);
  markPipelineCheckpoint(diagnostics, "RESPONSE_COMPLETE", {
    timingField: "responseCompletedAt",
    mode: ctx.mode,
    route: hook,
    model,
    sourceAvailabilityStatus: ctx.saeStatus,
    retrievedCount: ctx.rerankedChunks?.length || 0,
    displayedSourceCardCount: finalSourceCards.length
  });
  finalizePipelineDiagnostics(diagnostics);

  timing.checkpoint("RESPONSE_COMPLETE", "response");
  const finalDiagnostics = publishDiagnostics(false);

  return {
    answer:                           _outputAnswer,
    sources:                          ctx.rerankedChunks || [],
    sourcesUsed:                      ctx.rerankedChunks || [],
    sourceCards:                      finalSourceCards,
    sourceCardsDirectSupportFiltered: true,
    retrievedSourceCount:             ctx.rerankedChunks?.length || 0,
    displayedSourceCount:             finalSourceCards.length,
    saeStatus:                        ctx.saeStatus,
    sourceAvailabilityMetadata:       ctx.sourceAvailability,
    eligibleCandidates:               ctx.eligibleCandidates,
    suppressedCandidates:             ctx.suppressedCandidates,
    limitationRequired:               ctx.limitationRequired,
    disclosureType:                   ctx.disclosureType,
    statusReason:                     ctx.statusReason,
    sourceAvailability:               _sourceAvail.sourceAvailability,
    sourceStatus:                     _sourceAvail.sourceStatus,
    sourceAvailabilityReason:         _sourceAvail.sourceAvailabilityReason,
    retrievalTimedOut:                _sourceAvail.retrievalTimedOut,
    relatedSourceCount:               _sourceAvail.relatedSourceCount,
    retrievalLayerCounts:             buildRetrievalLayerCounts(ctx.retrievalDiagnostics),
    firstSourceLabels:                buildFirstSourceLabels(finalSourceCards.length ? finalSourceCards : ctx.rerankedChunks),
    educationalSources,
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    orchestration:       ctx.orchestration,
    mode:                ctx.mode,
    orchestrationMode:   ctx.mode,
    responseMode:        ctx.mode,
    pipelineVersion:     PIPELINE_VERSION,
    diagnostics:         finalDiagnostics,
    traceId,
    diagnostics,
    pipelineTimings: diagnostics.pipelineTimings,
    pipelineStageDurations: diagnostics.pipelineStageDurations,
    partialPipelineState: diagnostics.partialPipelineState,
    openaiCalls: diagnostics.openaiCalls,
    trace,
    verifiedAuthorityGate: {
      evaluated:                  true,
      leakageBlocked:             _019aGate.leakageBlocked,
      relabelApplied:             _019aGate.relabelApplied,
      removedSectionCount:        _019aGate.removedSectionCount,
      suppressedCitationCount:    _019aGate.suppressedCitations.length,
      verifiedAuthorityCount:     _019aGate.verifiedAuthorityCount,
      vatFastDefinitionPreserved: _019aGate.vatFastDefinitionPreserved,
      ewtFastPathPreserved:       _019aGate.ewtFastPathPreserved
    },
    patch024cPostSourcecard: ctx._patch024cPostSourcecard || null,
    saeHardFailBlocked,
    saeHardFailFallbackApplied: saeHardFailBlocked,
    saeCompliance:             compliantResult.saeCompliance,
    saeViolations:             compliantResult.saeViolations || []
  };
}

export function pipelineHealthCheck() {
  return {
    ok:      true,
    version: PIPELINE_VERSION,
    steps:   16,
    laws:    ["LAW_1_PIPELINE_SUPREMACY", "LAW_2_SOURCE_HIERARCHY", "LAW_3_ISSUE_TARGETED_RETRIEVAL", "LAW_4_FOUR_PART_DOCTRINE_TEST"]
  };
}

export default { runPipeline, fourPartDoctrineTest, pipelineHealthCheck, PIPELINE_VERSION };
