/**
 * PATCH-019A REV2 Regression Tests
 * Verified Authority Only Generation Gate
 *
 * Run: node tests/patch-019a-regression.test.mjs
 *
 * Unlike the 018A/018B/018C suites, this suite imports the REAL production
 * gate (applyVerifiedAuthorityGate from answer-renderer.js — env-free import
 * chain, proven by _stage2a_test.mjs). Pipeline/ask-handler wiring is
 * verified via source scans, consistent with the 018B/018C suite.
 *
 * Covers spec Tests 1–9 plus RELATED_AUTHORITY_ONLY relabeling.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyVerifiedAuthorityGate } from "../answer-renderer.js";

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

// Inlined verbatim from issue-classification-engine.js (as in 018A suite) —
// demonstrates the classifier flag that controls VAT preservation eligibility.
function isVatDefinitionQuery(classification = {}) {
  const subIssue = String(classification?.subIssue || "");
  const strategy = String(classification?.retrievalStrategy || "");
  return subIssue === "VAT_DEFINITION" || strategy.includes("VAT_DEFINITION");
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VAT_CARDS = [
  { normalizedReference: "NIRC Sec. 105", citation: "NIRC Sec. 105" },
  { normalizedReference: "NIRC Sec. 106", citation: "NIRC Sec. 106" },
  { normalizedReference: "NIRC Sec. 107", citation: "NIRC Sec. 107" },
  { normalizedReference: "NIRC Sec. 108", citation: "NIRC Sec. 108" },
  { normalizedReference: "Revenue Regulations No. 16-2005", citation: "RR 16-2005" }
];

const VAT_FAST_DEFINITION_ANSWER = [
  "Value-Added Tax (VAT) is an indirect tax on the sale of goods and services in the Philippines, imposed under NIRC Sec. 105.",
  "",
  "Sales of goods are taxed under NIRC Sec. 106, importation under NIRC Sec. 107, and sale of services under NIRC Sec. 108. The implementing rules are found in RR 16-2005.",
  "",
  "In practice, VAT-registered businesses charge 12% output VAT and credit input VAT against it."
].join("\n");

const EWT_CARDS = [
  { normalizedReference: "NIRC Sec. 57", citation: "NIRC Sec. 57" },
  { normalizedReference: "NIRC Sec. 58", citation: "NIRC Sec. 58" },
  { normalizedReference: "RR 2-98", citation: "RR 2-98" }
];

const EWT_ANSWER_WITH_SECTION = [
  "Yes, payments to advertising agencies are subject to expanded withholding tax.",
  "",
  "Controlling Authorities:",
  "- NIRC Sec. 57",
  "- NIRC Sec. 58",
  "- RR 2-98",
  "",
  "The payor acts as withholding agent at the time of payment."
].join("\n");

const LEAKING_TIMEOUT_ANSWER = [
  "Indexed source retrieval timed out.",
  "",
  "Controlling Authorities:",
  "NIRC Sec. 105",
  "RR 16-2005"
].join("\n");

const CITATION_TOKENS = /Controlling Authorities|Governing Authorities|NIRC\s+Sec\.|\bRR\s*(?:No\.?\s*)?\d|\bRMC\b|\bRMO\b/i;

// ═══ Source-scan: gate wiring, insertion point, no new VAT classifier ════════

group("WIRING — pipeline.js Step 17.5 insertion and flag derivation", () => {
  assert(PIPELINE_SRC.includes("Step 17.5: PATCH-019A Verified-Authority Final Answer Gate"), "Step 17.5 gate block exists in pipeline.js");

  const gateIdx       = PIPELINE_SRC.indexOf("Step 17.5: PATCH-019A");
  const complianceIdx = PIPELINE_SRC.indexOf('markPipelineCheckpoint(diagnostics, "COMPLIANCE_COMPLETE"');
  const k017Idx       = PIPELINE_SRC.indexOf("PATCH_017K_SUPPORTING_AUTHORITY_COMPLETION_SUMMARY");
  const j017Idx       = PIPELINE_SRC.indexOf("PATCH_017J_VAT_SOURCE_CARD_RESTORATION_COMPLETED");
  const responseIdx   = PIPELINE_SRC.lastIndexOf('"RESPONSE_COMPLETE"');
  assert(gateIdx > complianceIdx && complianceIdx > 0, "gate runs AFTER final-answer compliance");
  assert(gateIdx > k017Idx && k017Idx > 0, "gate runs AFTER PATCH-017K restoration");
  assert(gateIdx > j017Idx && j017Idx > 0, "gate runs AFTER PATCH-017J restoration");
  assert(gateIdx < responseIdx, "gate runs BEFORE RESPONSE_COMPLETE / return");

  // Preservation flags must come from existing pipeline state only.
  const gateBlock = PIPELINE_SRC.slice(gateIdx, gateIdx + 3000);
  assert(gateBlock.includes("isVatDefinitionQuery(ctx.issueClassification)"), "VAT preservation uses existing classifier flag isVatDefinitionQuery()");
  assert(gateBlock.includes('VAT_DEFINITION_BRIDGE_AUTHORITY_CONFIRMED'), "VAT preservation honors the 017H bridge-applied marker");
  assert(gateBlock.includes("ctx._fastEwtAuthorityPath === true"), "EWT preservation uses existing 017F/017B fast-path flag");
  assert(!/query\s*\.\s*match|\/what\s|\bvat\b.*test\(\s*query/i.test(gateBlock), "no query-string matching / keyword guessing in gate wiring");

  // Required diagnostics present in production sources.
  for (const marker of [
    "PATCH_019A_AUTHORITY_GATE_EVALUATED",
    "PATCH_019A_AUTHORITY_LEAKAGE_BLOCKED",
    "PATCH_019A_RELATED_AUTHORITY_RELABEL_APPLIED",
    "PATCH_019A_FAST_DEFINITION_PRESERVED",
    "PATCH_019A_FAST_VAT_AUTHORITY_PATH_PRESERVED",
    "PATCH_019A_EWT_FAST_PATH_PRESERVED"
  ]) {
    const inProd = PIPELINE_SRC.includes(marker) ||
      readFileSync(join(__dirname, "..", "answer-renderer.js"), "utf8").includes(marker);
    assert(inProd, `diagnostic marker present in production code: ${marker}`);
  }
});

group("WIRING — ask-handler.js route fallbacks pass the gate (PIPELINE_ERROR / timeout)", () => {
  assert(ASK_HANDLER_SRC.includes('import { applyVerifiedAuthorityGate } from "./answer-renderer.js"'), "ask-handler imports the gate");
  const errIdx = ASK_HANDLER_SRC.indexOf("function buildPipelineErrorFallback");
  const errBody = ASK_HANDLER_SRC.slice(errIdx, ASK_HANDLER_SRC.indexOf("function getUserId", errIdx));
  assert(errBody.includes('saeStatus: "PIPELINE_ERROR"') && errBody.includes("applyVerifiedAuthorityGate("), "PIPELINE_ERROR fallback answer is gated");
  assert(errBody.includes("internalError: true") && errBody.includes('errorCategory: "PIPELINE_ERROR"'), "018C contract fields preserved");
  const toIdx = ASK_HANDLER_SRC.indexOf("function buildRouteTimeoutFallback");
  const toBody = ASK_HANDLER_SRC.slice(toIdx, errIdx);
  assert(toBody.includes("applyVerifiedAuthorityGate(") && toBody.includes('saeStatus: "RETRIEVAL_TIMEOUT"'), "route-timeout fallback answer is gated");
});

// ═══ Tests 1–3 — VAT FAST_DEFINITION preservation ════════════════════════════

group("TEST 1 — 'What is VAT?' FAST_DEFINITION preserved (AUTHORITY_FOUND)", () => {
  const r = applyVerifiedAuthorityGate({
    answer: VAT_FAST_DEFINITION_ANSWER,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: VAT_CARDS,
    vatFastDefinitionPreserved: true,
    mode: "FAST_DEFINITION",
    route: "/ask"
  });
  assert(r.answer === VAT_FAST_DEFINITION_ANSWER, "answer text unchanged");
  assert(r.leakageBlocked === false, "no leakage blocking triggered");
  assert(r.vatFastDefinitionPreserved === true, "vatFastDefinitionPreserved flag honored");
  for (const cite of ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"]) {
    assert(r.answer.includes(cite), `${cite} preserved`);
  }
  // Contract belt-and-braces: even with ZERO cards, the preservation contract
  // verifies the five canonical VAT definition authorities.
  const sectionAnswer = "What is VAT:\n\nControlling Authorities:\n- NIRC Sec. 105\n- RR 16-2005\n\nVAT applies to sales.";
  const r2 = applyVerifiedAuthorityGate({
    answer: sectionAnswer,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [],
    vatFastDefinitionPreserved: true,
    mode: "FAST_DEFINITION"
  });
  assert(r2.answer.includes("NIRC Sec. 105") && r2.answer.includes("RR 16-2005"), "contract keys verify VAT authorities even with empty cards");
  assert(r2.verifiedAuthorityCount >= 5, "contract injects 5 canonical VAT keys");
});

group("TEST 2 — 'Define VAT.' same preservation (gate is query-independent)", () => {
  const r = applyVerifiedAuthorityGate({
    answer: VAT_FAST_DEFINITION_ANSWER,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: VAT_CARDS,
    vatFastDefinitionPreserved: true,
    mode: "FAST_DEFINITION"
  });
  assert(r.answer === VAT_FAST_DEFINITION_ANSWER && r.leakageBlocked === false, "Define VAT: identical preservation outcome");
});

group("TEST 3 — 'Explain VAT in simple terms.' same preservation", () => {
  const simple = VAT_FAST_DEFINITION_ANSWER + "\n\nThink of it like a pass-through tax collected at each sale.";
  const r = applyVerifiedAuthorityGate({
    answer: simple,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: VAT_CARDS,
    vatFastDefinitionPreserved: true,
    mode: "FAST_DEFINITION"
  });
  assert(r.answer === simple && r.leakageBlocked === false, "simple-terms answer preserved, tone untouched");
});

// ═══ Test 4 — zero-rated VAT: classifier controls, no forced preservation ════

group("TEST 4 — zero-rated VAT query does not force FAST_DEFINITION / bridge", () => {
  assert(isVatDefinitionQuery({ subIssue: "VAT_ZERO_RATED" }) === false, "classifier: VAT_ZERO_RATED is not a VAT definition query");
  assert(isVatDefinitionQuery({ subIssue: "ZERO_RATED_SALES" }) === false, "classifier: ZERO_RATED_SALES is not a VAT definition query");

  // Gate with preservation flag false: does NOT inject VAT definition keys.
  const r = applyVerifiedAuthorityGate({
    answer: "Zero-rated sales are taxed at 0% under NIRC Sec. 106(A)(2) and NIRC Sec. 108(B).",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [
      { normalizedReference: "NIRC Sec. 106" },
      { normalizedReference: "NIRC Sec. 108" }
    ],
    vatFastDefinitionPreserved: false,
    mode: "STANDARD_TAX_MODE"
  });
  assert(r.vatFastDefinitionPreserved === false, "no forced VAT preservation flag");
  assert(r.verifiedAuthorityCount === 2, "only retrieved authorities verified (no contract injection)");
  assert(r.answer.includes("NIRC Sec. 106(A)(2)"), "zero-rating prose untouched");
});

// ═══ Test 5 — EWT fast path preservation ═════════════════════════════════════

group("TEST 5 — 'Is advertising service subject to EWT?' fast path preserved", () => {
  const r = applyVerifiedAuthorityGate({
    answer: EWT_ANSWER_WITH_SECTION,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: EWT_CARDS,
    preGenerationSourceCards: EWT_CARDS,
    lockedAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
    ewtFastPathPreserved: true,
    mode: "FAST_DEFINITION"
  });
  assert(r.answer === EWT_ANSWER_WITH_SECTION, "EWT answer (with Controlling Authorities section) unchanged");
  assert(r.ewtFastPathPreserved === true, "ewtFastPathPreserved flag honored");
  for (const cite of ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]) {
    assert(r.answer.includes(cite), `${cite} preserved`);
  }
  // Short-circuited retrieval (zero cards) still verified via contract keys.
  const r2 = applyVerifiedAuthorityGate({
    answer: EWT_ANSWER_WITH_SECTION,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [],
    ewtFastPathPreserved: true
  });
  assert(r2.answer.includes("NIRC Sec. 57") && r2.answer.includes("RR 2-98"), "017F/017G short-circuit authorities not suppressed");

  // No VAT pollution: a VAT citation inside the EWT authority section is
  // unverified for this query and must be suppressed.
  const polluted = EWT_ANSWER_WITH_SECTION.replace("- RR 2-98", "- RR 2-98\n- NIRC Sec. 105");
  const r3 = applyVerifiedAuthorityGate({
    answer: polluted,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: EWT_CARDS,
    ewtFastPathPreserved: true
  });
  assert(!r3.answer.includes("NIRC Sec. 105"), "unverified VAT authority removed from EWT authority section");
  assert(r3.answer.includes("NIRC Sec. 57") && r3.answer.includes("RR 2-98"), "verified EWT authorities kept");
  assert(r3.leakageBlocked === true, "leakage flag raised for unverified citation");
});

// ═══ REV2-FIX — AUTHORITY_FOUND inline unverified citation suppression ═══════

group("REV2-FIX — AUTHORITY_FOUND inline unverified citation suppression", () => {
  // Inline prose citations OUTSIDE any authority section: the unverified
  // NIRC Sec. 105 line must be suppressed; the verified Sec. 57 line stays.
  const inlineAnswer = [
    "Advertising service is subject to EWT under NIRC Sec. 57.",
    "VAT is governed by NIRC Sec. 105.",
    "",
    "The payor acts as withholding agent at the time of payment."
  ].join("\n");
  const r = applyVerifiedAuthorityGate({
    answer: inlineAnswer,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "NIRC Sec. 57", citation: "NIRC Sec. 57" }],
    mode: "FAST_DEFINITION",
    route: "/ask"
  });
  assert(r.gateEvaluated === true, "PATCH_019A_AUTHORITY_GATE_EVALUATED emitted");
  assert(r.answer.includes("NIRC Sec. 57"), "verified NIRC Sec. 57 remains");
  assert(!r.answer.includes("NIRC Sec. 105"), "unverified NIRC Sec. 105 removed");
  assert(!r.answer.includes("VAT is governed by"), "line bearing the unverified citation suppressed");
  assert(r.answer.includes("withholding agent at the time of payment"), "citation-free prose untouched");
  assert(r.leakageBlocked === true, "PATCH_019A_AUTHORITY_LEAKAGE_BLOCKED emitted");
  assert(r.suppressedCitations.some((c) => /105/.test(c)), "suppressed-citation diagnostic names NIRC Sec. 105");

  // Mixed citation line: one verified + one unverified — whole line suppressed.
  const mixedAnswer = [
    "Advertising service is subject to EWT under NIRC Sec. 57.",
    "This involves NIRC Sec. 57 and NIRC Sec. 105.",
    "",
    "The payor acts as withholding agent at the time of payment."
  ].join("\n");
  const r2 = applyVerifiedAuthorityGate({
    answer: mixedAnswer,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "NIRC Sec. 57", citation: "NIRC Sec. 57" }]
  });
  assert(!r2.answer.includes("This involves"), "mixed line suppressed because one citation is unverified");
  assert(!r2.answer.includes("NIRC Sec. 105"), "unverified citation absent from gated answer");
  assert(r2.answer.includes("Advertising service is subject to EWT under NIRC Sec. 57."), "fully verified line kept");
  assert(r2.leakageBlocked === true, "leakage blocked for mixed citation line");
});

// ═══ Test 6 — professional fees: no advertising fallback, no fabricated rate ═

group("TEST 6 — EWT professional fees: safe fallback survives the gate; no pollution", () => {
  const SAFE_018B =
    "TINA found potentially relevant withholding tax authorities, but the answer could not be safely completed within the available generation budget. The applicable EWT treatment or rate depends on the specific income payment category, payee status, and governing regulation. Please rerun the query or narrow the fact pattern.";
  const r = applyVerifiedAuthorityGate({
    answer: SAFE_018B,
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: EWT_CARDS,
    ewtFastPathPreserved: true
  });
  assert(r.answer === SAFE_018B, "018B safe fallback passes the gate unchanged");
  assert(!/advertising agencies/i.test(r.answer), "no advertising fallback");
  assert(!/\b\d+(?:\.\d+)?\s*%/.test(r.answer), "no fabricated rate");
  assert(!PIPELINE_SRC.includes("10% of gross payments"), "pipeline still free of hardcoded advertising answer (018B intact)");
});

// ═══ Tests 7–8 — unsafe statuses must not leak citations ═════════════════════

group("TEST 7 — RETRIEVAL_TIMEOUT: authority leakage blocked", () => {
  const r = applyVerifiedAuthorityGate({
    answer: LEAKING_TIMEOUT_ANSWER,
    saeStatus: "RETRIEVAL_TIMEOUT",
    finalSourceCards: [],   // suppressed states have no cards
    mode: "STANDARD_TAX_MODE",
    route: "/ask"
  });
  assert(r.leakageBlocked === true, "PATCH_019A_AUTHORITY_LEAKAGE_BLOCKED raised");
  assert(!CITATION_TOKENS.test(r.answer), "no Controlling/Governing headings, NIRC Sec., RR, RMC, RMO in answer");
  assert(/timed out|could not be confirmed|verify/i.test(r.answer), "limitation explained plainly");
  assert(/does not mean that no law or authority exists/i.test(r.answer), "timeout not framed as absence of law (SAE C5)");
});

group("TEST 8 — NO_INDEXED_SOURCE: authority leakage blocked", () => {
  const leaking = "No indexed source was found for this query.\n\nHowever, NIRC Sec. 109 generally exempts these transactions, per RR 16-2005.";
  const r = applyVerifiedAuthorityGate({
    answer: leaking,
    saeStatus: "NO_INDEXED_SOURCE",
    finalSourceCards: []
  });
  assert(r.leakageBlocked === true, "leakage blocked under NO_INDEXED_SOURCE");
  assert(!CITATION_TOKENS.test(r.answer), "no citation tokens remain");
  // Clean disclosure-only answers must pass through untouched.
  const clean = "TINA could not identify an indexed authority matching the specific transaction described.\n\nThis does not mean that no law or authority exists.";
  const r2 = applyVerifiedAuthorityGate({ answer: clean, saeStatus: "NO_INDEXED_SOURCE" });
  assert(r2.answer === clean && r2.leakageBlocked === false, "citation-free disclosure answer unchanged");
});

// ═══ Test 9 — PIPELINE_ERROR ═════════════════════════════════════════════════

group("TEST 9 — PIPELINE_ERROR: 018C contract preserved, no citations", () => {
  const STATIC_018C =
    "TINA encountered an internal pipeline error before it could complete a sourced answer. This does not mean that no law or authority exists. Please retry or narrow the question.";
  const r = applyVerifiedAuthorityGate({ answer: STATIC_018C, saeStatus: "PIPELINE_ERROR", route: "/ask" });
  assert(r.answer === STATIC_018C, "static 018C fallback unchanged (no citations to block)");
  assert(!CITATION_TOKENS.test(r.answer), "PIPELINE_ERROR answer cites no authorities");

  const leaking = STATIC_018C + "\n\nControlling Authorities:\nNIRC Sec. 57";
  const r2 = applyVerifiedAuthorityGate({ answer: leaking, saeStatus: "PIPELINE_ERROR" });
  assert(r2.leakageBlocked === true && !CITATION_TOKENS.test(r2.answer), "hypothetical citation leak under PIPELINE_ERROR is blocked");
  // 018C response-contract fields remain in ask-handler (source-verified).
  assert(ASK_HANDLER_SRC.includes("internalError: true"), "internalError: true preserved in ask-handler");
  assert(ASK_HANDLER_SRC.includes('errorCategory: "PIPELINE_ERROR"'), "errorCategory PIPELINE_ERROR preserved in ask-handler");
});

// ═══ RELATED_AUTHORITY_ONLY relabeling (§7.2) ════════════════════════════════

group("RELATED_AUTHORITY_ONLY — controlling headings relabeled, prose untouched", () => {
  const related = [
    "Only related authority was located for this issue.",
    "",
    "Controlling Authorities:",
    "- RR 16-2005",
    "",
    "Note that the controlling authority question remains open."
  ].join("\n");
  const r = applyVerifiedAuthorityGate({
    answer: related,
    saeStatus: "RELATED_AUTHORITY_ONLY",
    finalSourceCards: [{ normalizedReference: "RR 16-2005" }]
  });
  assert(r.relabelApplied === true, "PATCH_019A_RELATED_AUTHORITY_RELABEL_APPLIED raised");
  assert(r.answer.includes("Related / Supporting Authorities"), "heading relabeled to Related / Supporting Authorities");
  assert(!/Controlling Authorities|Governing Authorities|Primary Authorities/.test(r.answer), "forbidden headings absent");
  assert(r.answer.includes("RR 16-2005"), "related citations kept (cards allowed under this status)");
  assert(r.answer.includes("the controlling authority question remains open"), "prose sentence untouched (heading-only relabel)");
});

// ─── REV1 OUTCOME 6 — authority verification failure prohibits citations ──────
// AUTHORITY_FOUND status with ZERO verified authority records (and no
// preservation contract) is a verification failure: no citation in the answer
// is backed by a verified record, so all citation-bearing lines are suppressed.

group("REV1 OUTCOME 6 — AUTHORITY_FOUND with empty verified set suppresses citations", () => {
  const r = applyVerifiedAuthorityGate({
    answer: "Under NIRC Sec. 57 and RR 2-98, EWT applies to income payments.\n\nWithholding obligations rest on the payor.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [],
    pipelineSourceCards: [],
    eligibleCandidates: [],
    preGenerationSourceCards: [],
    lockedAuthorities: []
  });
  assert(r.leakageBlocked === true, "leakage blocked on verification failure");
  assert(!/NIRC Sec\.\s*57|RR 2-98/i.test(r.answer), "no authority citations in output");
  assert(r.suppressedCitations.length >= 2, "both citations recorded as suppressed");
  assert(r.answer.length > 0, "answer generation not blocked — safe text remains");
  assert(r.verifiedAuthorityCount === 0, "verified authority count is zero");
});

group("REV1 OUTCOME 6 — fully-cited answer falls back to safe limitation message", () => {
  const r = applyVerifiedAuthorityGate({
    answer: "NIRC Sec. 57 and RR 2-98 apply.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: []
  });
  assert(r.leakageBlocked === true, "leakage blocked");
  assert(!/NIRC|RR 2-98/.test(r.answer), "no citations in fallback");
  assert(r.answer.includes("does not mean that no law or authority exists"), "safe limitation message used");
});

group("REV1 OUTCOME 6 — verified records still allow citations (no regression)", () => {
  const r = applyVerifiedAuthorityGate({
    answer: "Under NIRC Sec. 57 and RR 2-98, EWT applies.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [
      { normalizedReference: "NIRC Sec. 57" },
      { normalizedReference: "RR 2-98" }
    ]
  });
  assert(r.leakageBlocked === false, "no blocking when citations verified");
  assert(r.answer.includes("NIRC Sec. 57") && r.answer.includes("RR 2-98"), "verified citations preserved");
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-019A Regression: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed tests:");
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log("All tests passed.");
  process.exit(0);
}
