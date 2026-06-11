/**
 * PATCH-018B / PATCH-018C Regression Tests
 *
 *   PATCH-018B — Safe EWT Fallback:
 *     The fast-EWT low-budget fallback must never return a hardcoded legal
 *     conclusion (advertising-agency answer, "10% of gross payments", any
 *     specific EWT rate). Safe insufficient-generation language only.
 *
 *   PATCH-018C — SAE Error Classification Integrity:
 *     Non-timeout internal pipeline errors must NOT be emitted as
 *     saeStatus / sourceAvailability "RETRIEVAL_TIMEOUT". They must emit
 *     internalError: true, errorCategory: "PIPELINE_ERROR", saeStatus: null.
 *
 * Run: node tests/patch-018b-018c-regression.test.mjs
 *
 * Conventions follow tests/patch-018a-regression.test.mjs:
 *  - No production-module imports (vector-store.js instantiates clients at
 *    module load; importing pipeline.js/ask-handler.js needs live env).
 *  - Behavioral logic is inlined verbatim where needed.
 *  - Additionally, this suite scans the ACTUAL production source files to
 *    verify the unsafe code paths were removed and the safe ones exist.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC    = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");
const ASK_HANDLER_SRC = readFileSync(join(__dirname, "..", "ask-handler.js"), "utf8");

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n── ${name}`);
  fn();
}

// ─── Production text extraction (real pipeline.js / ask-handler.js) ──────────

// The production safe-fallback answer constant (PATCH-018B).
const safeAnswerMatch = PIPELINE_SRC.match(
  /const SAFE_EWT_INSUFFICIENT_GENERATION_ANSWER\s*=\s*\r?\n?\s*"([^"]+)";/
);
const PRODUCTION_SAFE_EWT_ANSWER = safeAnswerMatch ? safeAnswerMatch[1] : null;

// The production buildPipelineErrorFallback() body (PATCH-018C).
function extractFunctionBody(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  if (start === -1 || end === -1) return null;
  return src.slice(start, end);
}
const PIPELINE_ERROR_FALLBACK_BODY = extractFunctionBody(
  ASK_HANDLER_SRC,
  "function buildPipelineErrorFallback",
  "function getUserId"
);
const ROUTE_TIMEOUT_FALLBACK_BODY = extractFunctionBody(
  ASK_HANDLER_SRC,
  "function buildRouteTimeoutFallback",
  "// ── PATCH-018C"
);

// ─── Behavioral replicas (mirror the production branches) ────────────────────

/**
 * Mirrors the PATCH-018B low-budget branch in pipeline.js Step 14:
 * answer is the (query-independent) production safe constant; retrieved
 * authority cards are NOT modified; diagnostic carries the required fields.
 */
function simulateLowBudgetEwtFallback({ query = "", cards = [], remainingBudgetMs = 5000 } = {}) {
  const authorities = cards
    .map(c => c.normalizedReference || c.citation || c.title || "")
    .filter(Boolean)
    .slice(0, 8);
  return {
    answer: PRODUCTION_SAFE_EWT_ANSWER,
    preGenerationSourceCards: cards, // untouched by the fallback branch
    diagnostic: {
      marker: "PATCH_018B_SAFE_EWT_INSUFFICIENT_GENERATION_FALLBACK",
      query: query.slice(0, 120),
      remainingBudgetMs,
      sourceCount: cards.length,
      authorities,
      reason: "remaining_generation_budget_below_safe_minimum"
    }
  };
}

/**
 * Mirrors the PATCH-018C buildPipelineErrorFallback() contract fields in
 * ask-handler.js for a non-timeout internal error.
 */
function simulatePipelineErrorFallback(error) {
  return {
    internalError: true,
    errorCategory: "PIPELINE_ERROR",
    saeStatus: null,
    sourceAvailability: null,
    sourceAvailabilityStatus: null,
    sourceStatus: "PIPELINE_ERROR",
    retrievalTimedOut: false,
    errorName: error?.name || error?.constructor?.name || "Error",
    answer:
      "TINA encountered an internal pipeline error before it could complete a sourced answer. This does not mean that no law or authority exists. Please retry or narrow the question."
  };
}

// ─── Inlined SAE classifier subset (verbatim from pipeline.js, as in 018A test) ──

function _saeIsParsed(candidate = {}) {
  if (candidate.isParsed === true) return true;
  if (candidate.authorityAnnotation?.isParsed === true) return true;
  return String(candidate.parseStatus || candidate.parse_status || "").toLowerCase() === "success";
}

function classifySourceAvailabilitySubset(input = {}) {
  const annotatedCandidates = Array.isArray(input.annotatedCandidates) ? input.annotatedCandidates : [];
  const outcomeCategory = String(input.outcomeCategory || "").toUpperCase();
  const retrievalTimedOut =
    outcomeCategory === "RETRIEVAL_TIMEOUT" ||
    input.retrievalDiagnostics?.timedOut === true;

  const eligibleCandidates = annotatedCandidates.filter((candidate) =>
    candidate.authorityRole === "GOVERNING" &&
    candidate.directlyGovernsIssue === true &&
    candidate.isIndexed === true &&
    _saeIsParsed(candidate) === true &&
    candidate.higherAuthorityMissing === false
  );

  // PATCH-018A reconciliation guard (preserved): timeout + candidates falls through.
  if (retrievalTimedOut) {
    if (annotatedCandidates.length === 0) {
      return { saeStatus: "RETRIEVAL_TIMEOUT" };
    }
  }
  if (outcomeCategory === "NO_CANDIDATES" && annotatedCandidates.length === 0) {
    return { saeStatus: "SOURCE_LOOKUP_EMPTY" };
  }
  if (eligibleCandidates.length > 0) {
    return { saeStatus: "AUTHORITY_FOUND" };
  }
  if (annotatedCandidates.length === 0) {
    return { saeStatus: "NO_INDEXED_SOURCE" };
  }
  return { saeStatus: "NO_INDEXED_SOURCE" };
}

// ─── Forbidden-content matchers ───────────────────────────────────────────────

const SPECIFIC_RATE_PATTERN = /\b\d+(?:\.\d+)?\s*(?:%|percent)\b/i;

function assertSafeFallbackText(text, label) {
  assert(typeof text === "string" && text.length > 0, `${label}: fallback text exists`);
  const t = String(text || "");
  assert(!/advertising agencies/i.test(t), `${label}: no "advertising agencies"`);
  assert(!/10% of gross payments/i.test(t), `${label}: no "10% of gross payments"`);
  assert(!SPECIFIC_RATE_PATTERN.test(t), `${label}: no specific EWT rate stated`);
  assert(
    /could not be safely completed within the available generation budget/i.test(t),
    `${label}: safe insufficient-generation language present`
  );
  assert(
    /depends on the specific income payment category, payee status, and governing regulation/i.test(t),
    `${label}: fact-pattern dependency disclosure present`
  );
}

// ═══ PATCH-018B ═══════════════════════════════════════════════════════════════

group("018B SOURCE SCAN — hardcoded EWT legal answer removed from pipeline.js", () => {
  assert(PRODUCTION_SAFE_EWT_ANSWER !== null, "SAFE_EWT_INSUFFICIENT_GENERATION_ANSWER constant exists in pipeline.js");
  assert(!PIPELINE_SRC.includes("The EWT rate applicable"), `pipeline.js: "The EWT rate applicable" removed`);
  assert(!PIPELINE_SRC.includes("10% of gross payments"), `pipeline.js: "10% of gross payments" removed`);
  assert(!PIPELINE_SRC.includes("advertising agencies under RR 2-98"), `pipeline.js: advertising-agency conclusion removed`);
  assert(
    PIPELINE_SRC.includes("PATCH_018B_SAFE_EWT_INSUFFICIENT_GENERATION_FALLBACK"),
    "pipeline.js: PATCH_018B diagnostic marker present"
  );

  // Diagnostic fields required by the patch spec, near the marker.
  const markerIdx = PIPELINE_SRC.indexOf("[PATCH_018B_SAFE_EWT_INSUFFICIENT_GENERATION_FALLBACK]");
  const markerBlock = markerIdx >= 0 ? PIPELINE_SRC.slice(markerIdx, markerIdx + 600) : "";
  for (const field of ["query:", "remainingBudgetMs:", "sourceCount:", "authorities:", "reason:"]) {
    assert(markerBlock.includes(field), `018B diagnostic includes ${field.replace(":", "")}`);
  }
  assert(
    !/JSON\.stringify/.test(markerBlock),
    "018B diagnostic does not log full payloads"
  );
});

group("018B PRESERVATION — PATCH-017D capped generation branch intact", () => {
  assert(PIPELINE_SRC.includes("FAST_EWT_GENERATION_CAP_APPLIED"), "FAST_EWT_GENERATION_CAP_APPLIED marker preserved");
  assert(PIPELINE_SRC.includes("FAST_EWT_COMPACT_PROMPT_USED"), "FAST_EWT_COMPACT_PROMPT_USED marker preserved");
  assert(/max_tokens:\s*600/.test(PIPELINE_SRC), "017D 600-token generation cap preserved");
  assert(PIPELINE_SRC.includes("PATCH_017F_PRE_RETRIEVAL_SHORT_CIRCUIT_APPLIED"), "017F marker preserved");
  assert(PIPELINE_SRC.includes("PATCH_017G_SOURCE_STATE_SYNC"), "017G marker preserved");
  assert(PIPELINE_SRC.includes("PATCH_017H_VAT_DEFINITION_BRIDGE_APPLIED"), "017H marker preserved");
  assert(PIPELINE_SRC.includes("FAST_EWT_RETRIEVAL_EARLY_STOP_APPLIED"), "017E marker preserved");
  assert(PIPELINE_SRC.includes("PATCH_018A_SAE_TIMEOUT_OVERRIDE_BLOCKED"), "018A reconciliation guard preserved");
});

group("TEST 1 — Non-advertising EWT fallback (professional fees, low budget)", () => {
  const cards = [
    { normalizedReference: "RR 2-98", text: "creditable withholding tax on income payments" },
    { normalizedReference: "NIRC Sec. 57", text: "withholding of creditable tax at source" }
  ];
  const result = simulateLowBudgetEwtFallback({
    query: "What is the EWT treatment of professional fees?",
    cards,
    remainingBudgetMs: 8000
  });
  assertSafeFallbackText(result.answer, "professional fees");
  assert(result.preGenerationSourceCards.length === 2, "professional fees: retrieved authorities preserved");
  assert(
    result.diagnostic.authorities.includes("RR 2-98") && result.diagnostic.authorities.includes("NIRC Sec. 57"),
    "professional fees: authorities listed in diagnostic"
  );
  assert(
    result.diagnostic.marker === "PATCH_018B_SAFE_EWT_INSUFFICIENT_GENERATION_FALLBACK",
    "professional fees: 018B diagnostic marker emitted"
  );
});

group("TEST 2 — Royalties EWT fallback (timeout / model failure)", () => {
  const result = simulateLowBudgetEwtFallback({
    query: "What is the EWT treatment of royalties?",
    cards: [{ normalizedReference: "NIRC Sec. 57", text: "withholding at source" }],
    remainingBudgetMs: 2000
  });
  assertSafeFallbackText(result.answer, "royalties");
  assert(result.preGenerationSourceCards.length === 1, "royalties: retrieved authority preserved");
  // The fallback text is query-independent by construction — it cannot encode
  // a category-specific conclusion for ANY query, which is the safety property.
  const advertisingResult = simulateLowBudgetEwtFallback({
    query: "Is advertising service subject to EWT?",
    cards: []
  });
  assert(
    advertisingResult.answer === result.answer,
    "fallback text is query-independent (no per-category legal conclusion possible)"
  );
});

// ═══ PATCH-018C ═══════════════════════════════════════════════════════════════

group("018C SOURCE SCAN — ask-handler.js no longer mislabels internal errors", () => {
  assert(PIPELINE_ERROR_FALLBACK_BODY !== null, "buildPipelineErrorFallback() exists in ask-handler.js");
  assert(
    ASK_HANDLER_SRC.includes("PATCH_018C_INTERNAL_PIPELINE_ERROR_NOT_SAE_TIMEOUT"),
    "PATCH_018C diagnostic marker present"
  );
  assert(
    !PIPELINE_ERROR_FALLBACK_BODY.match(/"RETRIEVAL_TIMEOUT"/),
    `buildPipelineErrorFallback emits no "RETRIEVAL_TIMEOUT" literal`
  );
  assert(PIPELINE_ERROR_FALLBACK_BODY.includes("internalError: true"), "builder emits internalError: true");
  assert(PIPELINE_ERROR_FALLBACK_BODY.includes(`errorCategory: "PIPELINE_ERROR"`), `builder emits errorCategory: "PIPELINE_ERROR"`);
  assert(PIPELINE_ERROR_FALLBACK_BODY.includes("saeStatus: null"), "builder emits saeStatus: null");
  assert(PIPELINE_ERROR_FALLBACK_BODY.includes("sourceAvailability: null"), "builder emits sourceAvailability: null");
  assert(PIPELINE_ERROR_FALLBACK_BODY.includes("retrievalTimedOut: false"), "builder emits retrievalTimedOut: false");

  // The old mislabeled inline fallback is gone.
  assert(
    !ASK_HANDLER_SRC.includes("The route-level pipeline fallback was used before source verification completed."),
    "old mislabeled inline fallback removed"
  );

  // The catch block dispatches on isRoutePipelineTimeout — timeout path unchanged.
  assert(
    /isRoutePipelineTimeout\(error\)\s*\r?\n?\s*\?\s*buildRouteTimeoutFallback\(\{ error, question, hookConfig, pipelineDiagnostics \}\)\s*\r?\n?\s*:\s*buildPipelineErrorFallback\(\{ error, question, hookConfig, pipelineDiagnostics \}\)/.test(ASK_HANDLER_SRC),
    "catch block: timeout → buildRouteTimeoutFallback, non-timeout → buildPipelineErrorFallback"
  );

  // 018C diagnostic fields required by spec.
  const mIdx = ASK_HANDLER_SRC.indexOf("[PATCH_018C_INTERNAL_PIPELINE_ERROR_NOT_SAE_TIMEOUT]");
  const mBlock = mIdx >= 0 ? ASK_HANDLER_SRC.slice(mIdx, mIdx + 600) : "";
  for (const field of [
    "query:", "route:", "errorName", "errorMessage:",
    "errorCategory:", "emittedSaeStatus:", "emittedSourceAvailabilityStatus:"
  ]) {
    assert(mBlock.includes(field), `018C diagnostic includes ${field.replace(":", "")}`);
  }

  // Payload-level default can no longer resurrect RETRIEVAL_TIMEOUT for internal errors.
  assert(
    /result\.internalError === true\s*\r?\n?\s*\?\s*"PIPELINE_ERROR"/.test(ASK_HANDLER_SRC),
    "payload sourceStatus default guarded for internalError"
  );
});

group("TEST 3 — Internal pipeline exception → PIPELINE_ERROR, not SAE timeout", () => {
  const err = new TypeError("Cannot read properties of undefined (reading 'rerankedChunks')");
  const result = simulatePipelineErrorFallback(err);
  assert(result.internalError === true, "internalError === true");
  assert(result.errorCategory === "PIPELINE_ERROR", `errorCategory === "PIPELINE_ERROR"`);
  assert(result.saeStatus === null, "saeStatus === null");
  assert(result.sourceAvailability === null, "sourceAvailability === null");
  assert(result.sourceAvailabilityStatus === null, "sourceAvailabilityStatus === null");
  assert(result.retrievalTimedOut === false, "retrievalTimedOut === false");
  assert(result.sourceStatus !== "RETRIEVAL_TIMEOUT", "sourceStatus is not RETRIEVAL_TIMEOUT");
  assert(
    /internal pipeline error/i.test(result.answer) && /does not mean that no law or authority exists/i.test(result.answer),
    "safe user-facing fallback text preserved"
  );
  assert(result.errorName === "TypeError", "errorName captured for diagnostics");
});

group("TEST 4 — True retrieval timeout remains valid", () => {
  // SAE level: genuine retrieval timeout (timedOut + zero candidates) → RETRIEVAL_TIMEOUT.
  const saeTimeout = classifySourceAvailabilitySubset({
    annotatedCandidates: [],
    retrievalDiagnostics: { timedOut: true }
  });
  assert(saeTimeout.saeStatus === "RETRIEVAL_TIMEOUT", "timedOut + zero candidates → RETRIEVAL_TIMEOUT (valid)");

  // PATCH-018A preserved: timeout + candidates → NOT RETRIEVAL_TIMEOUT.
  const saeReconciled = classifySourceAvailabilitySubset({
    annotatedCandidates: [{
      authorityRole: "GOVERNING", directlyGovernsIssue: true,
      isIndexed: true, isParsed: true, higherAuthorityMissing: false
    }],
    retrievalDiagnostics: { timedOut: true }
  });
  assert(
    saeReconciled.saeStatus !== "RETRIEVAL_TIMEOUT",
    "018A preserved: timedOut + candidates → NOT RETRIEVAL_TIMEOUT"
  );

  // Route level: buildRouteTimeoutFallback still emits RETRIEVAL_TIMEOUT for genuine route timeouts.
  assert(ROUTE_TIMEOUT_FALLBACK_BODY !== null, "buildRouteTimeoutFallback still present");
  assert(
    ROUTE_TIMEOUT_FALLBACK_BODY.includes(`saeStatus: "RETRIEVAL_TIMEOUT"`),
    "route timeout fallback still emits saeStatus RETRIEVAL_TIMEOUT"
  );
  assert(
    ASK_HANDLER_SRC.includes("TINA 16-step pipeline timed out"),
    "isRoutePipelineTimeout still keyed to the route-timeout message"
  );
});

group("TEST 5 — True no-source remains valid", () => {
  const noSource = classifySourceAvailabilitySubset({ annotatedCandidates: [] });
  assert(noSource.saeStatus === "NO_INDEXED_SOURCE", "zero candidates, no timeout → NO_INDEXED_SOURCE (valid)");

  const lookupEmpty = classifySourceAvailabilitySubset({
    annotatedCandidates: [],
    outcomeCategory: "NO_CANDIDATES"
  });
  assert(lookupEmpty.saeStatus === "SOURCE_LOOKUP_EMPTY", "NO_CANDIDATES outcome → SOURCE_LOOKUP_EMPTY (valid)");

  const found = classifySourceAvailabilitySubset({
    annotatedCandidates: [{
      authorityRole: "GOVERNING", directlyGovernsIssue: true,
      isIndexed: true, isParsed: true, higherAuthorityMissing: false
    }]
  });
  assert(found.saeStatus === "AUTHORITY_FOUND", "AND-gate candidate → AUTHORITY_FOUND (valid)");
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-018B/018C Regression: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed tests:");
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("All tests passed.");
  process.exit(0);
}
