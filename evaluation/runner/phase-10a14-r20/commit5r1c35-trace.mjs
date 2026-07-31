import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fourPartDoctrineTest, runPipeline } from "../../../pipeline.js";
import {
  RESULTS,
  hashRecord,
  requirePreflight,
  sanitize,
  sha256,
  writeJsonOnce
} from "./commit5r1c35-lib.mjs";

const QUESTION = "tell me more about VAT";

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`C35_REQUIRED_ENV_MISSING:${name}`);
  return value;
}

function sourceText(source = {}) {
  return String(
    source.text
    || source.content
    || source.excerpt
    || source.preview
    || source.summary
    || ""
  ).slice(0, 5000);
}

function slimSource(source = {}, index = null) {
  const metadata = source.metadata && typeof source.metadata === "object"
    ? source.metadata
    : {};
  const stableId = source.id || source.chunkId || source.chunk_id || null;
  return sanitize({
    index,
    sourceIdSha256: stableId == null ? null : sha256(String(stableId)),
    title:
      source.title
      || source.document_title
      || metadata.documentTitle
      || metadata.originalFileName
      || null,
    citation:
      source.citation
      || source.normalizedReference
      || source.normalized_reference
      || metadata.normalizedReference
      || null,
    statute: source.statute || source.primaryStatute || null,
    authorityType:
      source.authorityType
      || source.authority_type
      || metadata.authorityType
      || null,
    authorityRole: source.authorityRole || null,
    sourceState: source.sourceState || source.sourceStatus || null,
    retrievalLayer: source.retrievalLayer || null,
    score: source.score ?? null,
    facts: source.factPattern || source.facts || source.factContext || null,
    holding: source.holding || null,
    text: sourceText(source),
    path:
      source.path
      || source.source_path
      || metadata.path
      || metadata.originalFileName
      || null
  });
}

function slimPair(result, sourceA, sourceB, sourceAIndex, sourceBIndex) {
  const analysis = result.pairAnalysis || {};
  return {
    sourceAIndex,
    sourceBIndex,
    sourceA: slimSource(sourceA, sourceAIndex),
    sourceB: slimSource(sourceB, sourceBIndex),
    trueConflict: result.trueConflict === true,
    parts: sanitize(result.parts),
    pairAnalysis: sanitize({
      conflict: analysis.conflict,
      apparentConflict: analysis.apparentConflict,
      doctrinalConflict: analysis.doctrinalConflict,
      hierarchyConflict: analysis.hierarchyConflict,
      conflictType: analysis.conflictType,
      distinctionType: analysis.distinctionType,
      sameIssueGate: analysis.sameIssueGate,
      oppositeHoldingGate: analysis.oppositeHoldingGate,
      sameExactIssue: analysis.sameExactIssue,
      sameLegalDimension: analysis.sameLegalDimension,
      oppositeHoldingOrRule: analysis.oppositeHoldingOrRule,
      exactIssue: analysis.exactIssue,
      exactLegalDimension: analysis.exactLegalDimension,
      sourceA: analysis.sourceA,
      sourceB: analysis.sourceB,
      hierarchyAnalysis: analysis.hierarchyAnalysis,
      conflictResolutionBasis: analysis.conflictResolutionBasis,
      resolutionBasis: analysis.resolutionBasis,
      reason: analysis.reason
    })
  };
}

async function traceLocalRetrieval() {
  const { identity: preflightIdentity } = requirePreflight();
  const liveArtifact = hashRecord(
    path.join(RESULTS, "COMMIT_5R1C35_VAT_API_RESPONSE_SANITIZED.json")
  );
  const supabase = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  let result;
  try {
    result = await runPipeline({
      query: QUESTION,
      hook: "/ask",
      supabase,
      openai: null,
      model: "gpt-4o-mini",
      routeBudgetMs: 180_000,
      requestId: "C35_LOCAL_READ_ONLY_RETRIEVAL_TRACE"
    });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  const sources = Array.isArray(result?.sources) ? result.sources : [];
  const limit = Math.min(sources.length, 10);
  const pairMatrix = [];
  for (let i = 0; i < limit; i += 1) {
    for (let j = i + 1; j < limit; j += 1) {
      pairMatrix.push(
        slimPair(fourPartDoctrineTest(sources[i], sources[j]), sources[i], sources[j], i, j)
      );
    }
  }
  const firingPairs = pairMatrix.filter((pair) => pair.trueConflict);

  const conflictTraceFile = path.join(
    RESULTS,
    "COMMIT_5R1C35_VAT_CONFLICT_TRACE.json"
  );
  const artifact = writeJsonOnce(conflictTraceFile, {
    schemaVersion: 1,
    unit: "PHASE-10A14-R20 COMMIT 5R1-C35",
    generatedUtc: new Date().toISOString(),
    query: QUESTION,
    execution: {
      type: "LOCAL_READ_ONLY_RETRIEVAL_WITH_MODEL_DISABLED",
      gitBaseline: "d5b25e676f623fbc1888608ff250824fcd34af99",
      semanticBaseline:
        "73601ff73b1420b825251056c67cba39989f3fd65db8c5febda9c0768db4a775",
      selectedSemanticSnapshotAffectsConflictCode: false,
      reason:
        "The selected C34 snapshot contains only the three tax-domain boundary files; conflict-engine.js and pipeline.js are the committed C34 files.",
      externalWrites: false,
      modelCalls: 0
    },
    liveEvidence: liveArtifact,
    preflight: preflightIdentity,
    issueClassification: sanitize(result?.issueClassification ?? null),
    retrievedSourceCount: sources.length,
    displayedSourceCount: result?.displayedSourceCount ?? null,
    sourceAvailability: result?.sourceAvailability ?? null,
    sourceStatus: result?.sourceStatus ?? null,
    saeStatus: result?.saeStatus ?? null,
    rerankedSources: sources.map((source, index) => slimSource(source, index)),
    evaluatedPairCount: pairMatrix.length,
    pairMatrix,
    firingPairCount: firingPairs.length,
    firingPairs,
    pipelineConflictAnalysis: sanitize(result?.conflictAnalysis ?? null),
    reproduced:
      firingPairs.length > 0
      && result?.conflictAnalysis?.hasConflict === true,
    result: firingPairs.length > 0
      ? "PRE_FIX_CONFLICT_REPRODUCED"
      : "PRE_FIX_CONFLICT_NOT_REPRODUCED"
  });

  originalLog(JSON.stringify({
    status: "C35_LOCAL_CONFLICT_TRACE_COMPLETE",
    retrievedSourceCount: sources.length,
    evaluatedPairCount: pairMatrix.length,
    firingPairCount: firingPairs.length,
    pipelineHasConflict: result?.conflictAnalysis?.hasConflict ?? null,
    artifact
  }, null, 2));
}

if (process.argv[2] !== "trace-local-retrieval") {
  throw new Error("Usage: node commit5r1c35-trace.mjs trace-local-retrieval");
}
await traceLocalRetrieval();

