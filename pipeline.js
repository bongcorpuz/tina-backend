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

import { classify }                               from "./issue-classification-engine.js";
import {
  getModeRoutingMetadata,
  buildAdaptivePromptContract
}                                                 from "./adaptive-tina-master-prompt.js";
import { rerankByHierarchy }                      from "./authority-engine.js";
import { applySupersessionFilter }                from "./supersession-engine.js";
import { retrieveRelevantSources }                from "./retrieval-engine.js";
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
  renderFastDefinitionConversational
}                                                 from "./answer-renderer.js";
import { enforceFinalAnswerCompliance }           from "./final-answer-compliance.js";
import { analyzeFactPattern }                     from "./fact-pattern-engine.js";
import { characterizeTransaction }                from "./transaction-characterization-engine.js";
import { evaluateEvidence }                       from "./evidence-evaluation-engine.js";
import { scoreRisk }                              from "./risk-scoring-engine.js";

const PIPELINE_VERSION = "1.0.0";

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeStr(v) {
  return typeof v === "string" ? v : String(v || "");
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

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function runPipeline({
  query,
  hook = "/ask",
  supabase,
  openai,
  model,
  conversationHistory = [],
  issueClassificationOverride = null,
  modeOverride = null
} = {}) {
  const trace          = { steps: [], warnings: [] };
  const ctx            = {};
  const traceId        = generateTraceId();
  const pipelineStartMs = Date.now();

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

  // ── Step 1: Issue Classification ──────────────────────────────────────────
  ctx.issueClassification = issueClassificationOverride || classify(query);
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
  ctx.rankedAuthorities = rerankByHierarchy(authorityDocs, query);
  trace.steps.push({ step: 3, name: "authorityRanking", count: ctx.rankedAuthorities.length, done: true });

  // ── Step 4: Supersession Filter ───────────────────────────────────────────
  ctx.activeAuthorities = applySupersessionFilter(ctx.rankedAuthorities);
  trace.steps.push({ step: 4, name: "supersessionFilter", done: true });

  // ── Step 5: Issue-Targeted Retrieval (Law 3) ──────────────────────────────
  // authority_name IN controllingAuthorities[] is passed explicitly.
  // Semantic similarity alone is PROHIBITED as the sole retrieval criterion.
  // retrieval-engine.js Layer 1 (EXACT_NORMALIZED_AUTHORITY) runs first;
  // Layer 5 (VECTOR_SEMANTIC) only fires after all authority-targeted layers.
  // Per-step timeout: Supabase free-tier cold starts can hang without rejecting.
  // After 15 s, fall through with empty chunks so the pipeline still completes.
  const controllingAuthorities = rawTargets;
  const RETRIEVAL_STEP_TIMEOUT_MS = 15000;
  ctx.retrievedChunks = await Promise.race([
    retrieveRelevantSources({
      query,
      supabase,
      issueClassification:  ctx.issueClassification,
      targetAuthorities:    controllingAuthorities,
      controllingAuthorities,
      topK:   12,
      poolK:  48
    }),
    new Promise(resolve =>
      setTimeout(() => {
        trace.warnings.push({ step: 5, warning: "Retrieval timed out after 15 s — proceeding with empty chunks" });
        resolve([]);
      }, RETRIEVAL_STEP_TIMEOUT_MS)
    )
  ]);
  trace.steps.push({ step: 5, name: "retrieval", chunksFound: ctx.retrievedChunks?.length ?? 0, done: true });

  // ── Step 6: Reranker ──────────────────────────────────────────────────────
  const rerankResult = rerankForTina({
    docs:               ctx.retrievedChunks,
    query,
    issueClassification: ctx.issueClassification
  });
  ctx.rerankedChunks = rerankResult?.results || rerankResult?.sources || rerankResult?.retrievedSources || [];
  trace.steps.push({ step: 6, name: "reranker", done: true });

  // ── Step 7: Fact Pattern Reconstruction (conditional) ────────────────────
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

  // ── Step 13: Build Adaptive Master Prompt ────────────────────────────────
  ctx.promptContract = buildAdaptivePromptContract(ctx.mode, {
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    factPattern:         ctx.factPattern,
    transactionChar:     ctx.transactionChar
  });
  trace.steps.push({ step: 13, name: "masterPromptBuilt", done: true });

  // ── Step 14: OpenAI Completion ────────────────────────────────────────────
  let openAiResult;
  try {
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
      conversationHistory,
      mode:                 ctx.mode,
      adaptiveContext:      { activeHook: hook, orchestrationMode: ctx.mode },
      _traceId:             traceId
    });
  } catch (e) {
    const label = `OpenAI step-14 error [${e?.name || e?.constructor?.name}] status=${e?.status} code=${e?.code}: ${e?.message}`;
    trace.warnings.push({ step: 14, warning: label });
    throw new Error(label);
  }
  ctx.rawAnswer    = openAiResult?.answer || "";
  ctx.orchestration = openAiResult?.orchestration || {};
  trace.steps.push({ step: 14, name: "openAiCompletion", done: true });

  // Refine rendering mode from the orchestration engine's determineMode() result.
  // ctx.mode (Step 2) reflects only the hook type (e.g. "STANDARD_TAX_MODE" for /ask).
  // The orchestration engine analyzes query intent and returns a specific rendering
  // mode: FAST_DEFINITION for "what is VAT?", LEGAL_ANALYSIS for doctrinal queries, etc.
  // Specialized hook modes (QUIZ_MODE, REVIEWER_MODE, etc.) are pinned and must not
  // be overridden by orchestration inference.
  const PINNED_HOOK_MODES = new Set([
    "QUIZ_MODE", "REVIEWER_MODE", "CASE_ANALYSIS", "SOURCE_LOOKUP", "SENIOR_COUNSEL_MEMO"
  ]);
  const orchestrationRefinedMode = ctx.orchestration?.mode;
  if (orchestrationRefinedMode && !PINNED_HOOK_MODES.has(ctx.mode)) {
    console.log(`[TINA MODE] Refining ctx.mode from '${ctx.mode}' → '${orchestrationRefinedMode}' (orchestration)`);
    ctx.mode = orchestrationRefinedMode;
  }

  // ── Step 15: Format Answer ────────────────────────────────────────────────
  ctx.formattedAnswer = renderTinaAnswer({
    answer:              ctx.rawAnswer,
    sources:             ctx.rerankedChunks || [],
    includeSources:      true,
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    conflict:            ctx.conflictAnalysis?.hasConflict ? ctx.conflictAnalysis : null
  });
  trace.steps.push({ step: 15, name: "answerRenderer", done: true });

  // ── Step 16: Final Compliance Validation ──────────────────────────────────
  const compliantResult = enforceFinalAnswerCompliance({
    draftAnswer:         ctx.formattedAnswer,
    sources:             ctx.rerankedChunks || [],
    retrievedSources:    ctx.rerankedChunks || [],
    conflicts:           ctx.conflictAnalysis?.trueConflicts || [],
    issueClassification: ctx.issueClassification,
    mode:                ctx.mode,
    query
  });
  trace.steps.push({ step: 16, name: "finalAnswerCompliance", done: true });

  // ── Step 17: Presentation Transform (FAST_DEFINITION only) ─────────────────
  // Converts validated structured output to conversational paragraphs.
  // Compliance gate output is preserved as fallback if section parsing fails.
  const rawFinalAnswer = compliantResult?.finalAnswer || compliantResult?.answer || ctx.formattedAnswer;
  const finalAnswer = ctx.mode === "FAST_DEFINITION"
    ? renderFastDefinitionConversational(rawFinalAnswer, query)
    : rawFinalAnswer;

  // Build normalized source cards for frontend rendering.
  // Each card has the URL fields the frontend normalizeSources() needs.
  const sourceCards = (ctx.rerankedChunks || [])
    .filter((c) => c.title || c.document_title || c.source || c.originalSource)
    .slice(0, 5)
    .map((c) => {
      const meta = c.metadata || {};
      const url =
        c.driveViewUrl ||
        c.drive_view_url ||
        c.url ||
        meta.driveViewUrl ||
        meta.drive_view_url ||
        meta.url ||
        meta.sourceUrl ||
        "";
      return {
        title:
          c.title ||
          c.document_title ||
          c.documentTitle ||
          c.originalSource ||
          c.source ||
          "Source",
        citation:
          c.normalizedReference ||
          c.normalized_reference ||
          c.citation ||
          "",
        authorityType: c.authorityType || c.authority_type || "UNKNOWN",
        driveViewUrl: url,
        url,
        excerpt: String(c.text || c.content || "").slice(0, 300)
      };
    });

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

  return {
    answer:              finalAnswer,
    sources:             ctx.rerankedChunks || [],
    sourcesUsed:         ctx.rerankedChunks || [],
    sourceCards,
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    orchestration:       ctx.orchestration,
    mode:                ctx.mode,
    orchestrationMode:   ctx.mode,
    responseMode:        ctx.mode,
    pipelineVersion:     PIPELINE_VERSION,
    traceId,
    trace
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
