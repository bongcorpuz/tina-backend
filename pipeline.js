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
import {
  searchSimilar,
  exactAuthoritySearch,
  normalizedCitationSearch,
  titleMetadataSearch
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
  renderFastDefinitionConversational
}                                                 from "./answer-renderer.js";
import { enforceFinalAnswerCompliance }           from "./final-answer-compliance.js";
import { analyzeFactPattern }                     from "./fact-pattern-engine.js";
import { characterizeTransaction }                from "./transaction-characterization-engine.js";
import { evaluateEvidence }                       from "./evidence-evaluation-engine.js";
import { scoreRisk }                              from "./risk-scoring-engine.js";
import {
  inferIssuanceNumber,
  sourceTitleOf
}                                                 from "./source-visibility-engine.js";

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

  // Build chips; deduplicate by normalized label, prefer entry with URL
  const seen = new Map();
  for (const doc of eligible) {
    const issuanceLabel = inferIssuanceNumber(doc);
    const fallback      = sourceTitleOf(doc)?.slice(0, 60) || "";
    const chipLabel     = issuanceLabel || fallback;
    if (!chipLabel) continue;

    const normKey = chipLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normKey) continue;

    const meta = doc.metadata || {};
    const url  =
      doc.driveViewUrl  || doc.drive_view_url ||
      doc.url           ||
      meta.driveViewUrl || meta.drive_view_url || meta.url || meta.sourceUrl ||
      null;

    const lvl  = docLevel(doc);
    const kind = lvl <= 3 ? "primary" : lvl <= 9 ? "regulation" : lvl === 10 ? "ruling" : "other";
    const title = String(
      doc.title || doc.document_title || doc.documentTitle || doc.source || chipLabel
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
    if (layer === "LAYER_3_TITLE_PATH_METADATA") {
      console.log("[DOMAIN RETRIEVAL]",     { query: q, layer });
      const r = await titleMetadataSearch(base);
      for (const doc of r) {
        if (_isUsableAuthorityDoc(doc)) _uniqueAuthorityCandidates.add(_authorityDocKey(doc));
      }
      return r;
    }
    if (layer === "LAYER_4_CONTENT_KEYWORD") {
      // Use titleMetadataSearch (metadata-column only) — NOT smartSearch, which
      // cascades into semantic search internally before Layer 5 is reached.
      console.log("[DOMAIN RETRIEVAL]",     { query: q, layer });
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
      console.log("[SEMANTIC FALLBACK SKIPPED]", { query: q, layer, uniqueAuthorityCount: _uniqueAuthorityCandidates.size, semanticHits: _semanticHits, total: _totalHits });
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
  let _retrievalWon = false;
  const _retrievalRaw = await Promise.race([
    retrieveRelevantSources({
      query,
      supabase,
      vectorSearch:         _vectorSearchFn,
      issueClassification:  ctx.issueClassification,
      targetAuthorities:    controllingAuthorities,
      controllingAuthorities,
      topK:   12,
      poolK:  48
    }).then((r) => { _retrievalWon = true; return r; }),
    new Promise(resolve =>
      setTimeout(() => {
        trace.warnings.push({ step: 5, warning: `Retrieval timed out after ${RETRIEVAL_STEP_TIMEOUT_MS} ms — proceeding with empty chunks`, timedOut: true });
        // Return object shape (not bare []) so the normalizer stores retrievalDiagnostics
        // with timedOut: true and downstream code can distinguish timeout from
        // genuine empty retrieval.  The normalizer handles both [] and object shapes.
        resolve({
          retrievedSources:     [],
          sources:              [],
          retrievalDiagnostics: {
            timedOut:  true,
            timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
          }
        });
      }, RETRIEVAL_STEP_TIMEOUT_MS)
    )
  ]);
  if (_retrievalWon) {
    console.log("[RETRIEVAL COMPLETED BEFORE TIMEOUT]", {
      mode:      ctx.mode,
      timeoutMs: RETRIEVAL_STEP_TIMEOUT_MS
    });
  }

  // ── TEMP TRACE: inspect raw retrieval shape before normalization ───────────
  // Remove after retrieval audit is complete.
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
    "QUIZ_MODE", "REVIEWER_MODE", "CASE_ANALYSIS", "SOURCE_LOOKUP",
    "SENIOR_COUNSEL_MEMO", "COMPLEX_ADVISORY"
  ]);
  const orchestrationRefinedMode = ctx.orchestration?.mode;
  if (orchestrationRefinedMode && !PINNED_HOOK_MODES.has(ctx.mode)) {
    console.log(`[TINA MODE] Refining ctx.mode from '${ctx.mode}' → '${orchestrationRefinedMode}' (orchestration)`);
    ctx.mode = orchestrationRefinedMode;
  }
  ctx.responseStyle = ctx.orchestration?.responseStyle || null;
  if (ctx.mode !== "FAST_DEFINITION" || hook !== "/ask") {
    if (ctx.responseStyle) {
      console.log(`[MODE ISOLATION] responseStyle cleared: hook=${hook} mode=${ctx.mode}`);
    }
    ctx.responseStyle = null;
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
  const finalAnswer = (ctx.mode === "FAST_DEFINITION" && hook === "/ask")
    ? renderFastDefinitionConversational(rawFinalAnswer, query, ctx.responseStyle)
    : rawFinalAnswer;

  // ── Stage 2C: Educational sources (FAST_DEFINITION /ask only) ────────────
  const educationalSources =
    (hook === "/ask" && ctx.mode === "FAST_DEFINITION")
      ? buildEducationalSources(ctx.rerankedChunks, ctx.responseStyle, query)
      : null;

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
    educationalSources,
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
