// FILE: pipeline-observability.js
// Pipeline diagnostics, timing, and lightweight source-count helpers.

"use strict";

import { generateTraceId } from "./services/observability-service.js";

const DEFAULT_ROUTE_BUDGET_MS = 90_000;
const PIPELINE_BUDGET_WARNING_THRESHOLDS_MS = [15_000, 10_000, 5_000];

export function ensurePipelineDiagnostics(diag = null, {
  requestStartedAt = Date.now(),
  route = "",
  model = "",
  budgetMs = null,
  requestId = ""
} = {}) {
  const target = diag && typeof diag === "object" ? diag : {};
  target.requestId = target.requestId || requestId || generateTraceId();
  target.route = target.route || route;
  target.model = target.model || "";
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

export function computePipelineStageDurations(diag = {}) {
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

export function markPipelineCheckpoint(diag = null, checkpoint, {
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

export function finalizePipelineDiagnostics(diag = null) {
  if (!diag) return null;
  diag.pipelineTimings = diag.pipelineTimings || { requestStartedAt: Date.now() };
  diag.pipelineTimings.responseCompletedAt = diag.pipelineTimings.responseCompletedAt || Date.now();
  computePipelineStageDurations(diag);
  diag.pipelineTimings.totalMs = diag.pipelineStageDurations.totalMs;
  return diag;
}

export function buildRetrievalLayerCounts(retrievalDiagnostics = {}) {
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

export function buildFirstSourceLabels(sources = [], max = 5) {
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

export function createPipelineInstrumentation({
  budgetMs = DEFAULT_ROUTE_BUDGET_MS,
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
