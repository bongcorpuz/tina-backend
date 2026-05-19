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

import { createRequire } from "module";

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
import { renderTinaAnswer }                       from "./answer-renderer.js";
import { enforceFinalAnswerCompliance }           from "./final-answer-compliance.js";

// CJS engines — imported via createRequire because they use module.exports
const _require = createRequire(import.meta.url);
const { analyzeFactPattern }                      = _require("./fact-pattern-engine.js");
const { characterizeTransaction }                 = _require("./transaction-characterization-engine.js");
const { evaluateEvidence }                        = _require("./evidence-evaluation-engine.js");
const { scoreRisk }                               = _require("./risk-scoring-engine.js");

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
  const trace = { steps: [], warnings: [] };
  const ctx   = {};

  // ── Step 1: Issue Classification ──────────────────────────────────────────
  ctx.issueClassification = issueClassificationOverride || classify(query);
  trace.steps.push({ step: 1, name: "issueClassification", done: true });

  // ── Step 2: Sub-Prompt / Mode Routing ────────────────────────────────────
  const primaryIssue   = ctx.issueClassification?.primaryIssue || "GENERAL_TAX";
  ctx.routingMetadata  = getModeRoutingMetadata(primaryIssue);
  ctx.mode             = modeOverride || ctx.routingMetadata?.mode || "STANDARD_TAX_MODE";
  trace.steps.push({ step: 2, name: "subPromptRouting", mode: ctx.mode, done: true });

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
  const controllingAuthorities = rawTargets;
  ctx.retrievedChunks = await retrieveRelevantSources({
    query,
    supabase,
    issueClassification:  ctx.issueClassification,
    targetAuthorities:    controllingAuthorities,
    controllingAuthorities,
    topK:   12,
    poolK:  48
  });
  trace.steps.push({ step: 5, name: "retrieval", chunksFound: ctx.retrievedChunks?.length ?? 0, done: true });

  // ── Step 6: Reranker ──────────────────────────────────────────────────────
  ctx.rerankedChunks = rerankForTina({
    docs:               ctx.retrievedChunks,
    query,
    issueClassification: ctx.issueClassification
  });
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
  const openAiResult = await callOpenAIWithOrchestration({
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
    mode:                 ctx.mode
  });
  ctx.rawAnswer    = openAiResult?.answer || "";
  ctx.orchestration = openAiResult?.orchestration || {};
  trace.steps.push({ step: 14, name: "openAiCompletion", done: true });

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

  return {
    answer:              compliantResult?.finalAnswer || compliantResult?.answer || ctx.formattedAnswer,
    sources:             ctx.rerankedChunks || [],
    issueClassification: ctx.issueClassification,
    conflictAnalysis:    ctx.conflictAnalysis,
    riskScore:           ctx.riskScore,
    orchestration:       ctx.orchestration,
    mode:                ctx.mode,
    pipelineVersion:     PIPELINE_VERSION,
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
