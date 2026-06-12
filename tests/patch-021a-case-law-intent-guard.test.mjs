/**
 * PATCH-021A Regression Tests
 * Case-Law Intent Guard for Fast Paths
 *
 * Run: node tests/patch-021a-case-law-intent-guard.test.mjs
 *
 * Imports the REAL production classifier (classify / isCaseLawIntent from
 * issue-classification-engine.js — the engine pipeline.js calls for /ask).
 * Pipeline Step 5.5 / Step 6.6 wiring is verified via source scans,
 * consistent with the 018B/018C and 019A suites.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify, isCaseLawIntent } from "../issue-classification-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");

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

// ─── Test 1: classification payload flags jurisprudence intent ────────────────

group("Test 1 — case-law queries set isJurisprudenceQuery true", () => {
  for (const q of [
    "is there court cases in relation to withholding taxes?",
    "court cases for withholding tax",
    "jurisprudence on expanded withholding tax",
    "jurisprudence on EWT",
    "Supreme Court cases on withholding tax",
    "CTA cases on withholding tax",
    "tax cases involving withholding agents"
  ]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === true, `'${q}' → isJurisprudenceQuery true`);
    assert(isCaseLawIntent(q) === true, `'${q}' → isCaseLawIntent true`);
  }
});

group("Test 2 — non-case-law queries stay isJurisprudenceQuery false", () => {
  for (const q of [
    "What is EWT?",
    "Is advertising service subject to EWT?",
    "Tell me about withholding taxes",
    "What is withholding tax?"
  ]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === false, `'${q}' → isJurisprudenceQuery false`);
    assert(isCaseLawIntent(q) === false, `'${q}' → isCaseLawIntent false`);
  }
});

// ─── Test 3: jurisprudence routing engages, fast definition not forced ────────

group("Test 3 — jurisprudence queries route to case-law retrieval", () => {
  const c = classify("is there court cases in relation to withholding taxes?");
  assert(c.downstreamRouting?.useJurisprudenceEngine === true, "useJurisprudenceEngine is true");
  assert(c.responseMode !== "FAST_DEFINITION", `responseMode is not FAST_DEFINITION (got ${c.responseMode})`);
  assert(c.orchestrationMode !== "FAST_DEFINITION", `orchestrationMode is not FAST_DEFINITION (got ${c.orchestrationMode})`);
});

group("Test 4 — normal EWT fast path classification preserved", () => {
  const def = classify("What is EWT?");
  assert(def.responseMode === "FAST_DEFINITION", "'What is EWT?' keeps FAST_DEFINITION response mode");
  assert(def.isJurisprudenceQuery === false, "'What is EWT?' not flagged jurisprudence");

  const adv = classify("Is advertising service subject to EWT?");
  assert(adv.primaryIssue === "WITHHOLDING", "'advertising EWT' primaryIssue WITHHOLDING");
  assert(adv.subIssue === "EWT", "'advertising EWT' subIssue EWT");
  assert((adv.targetAuthorities || []).includes("NIRC Sec. 57"), "'advertising EWT' targets NIRC Sec. 57");
  assert((adv.targetAuthorities || []).includes("RR 2-98"), "'advertising EWT' targets RR 2-98");
});

// ─── Test 5: pipeline.js source scans (Step 5.5 / Step 6.6 wiring) ────────────

group("Test 5 — pipeline Step 5.5 fast EWT eligibility checks !isJurisprudenceQuery", () => {
  assert(PIPELINE_SRC.includes("Step 5.5"), "Step 5.5 block located");
  assert(
    /if\s*\(\s*_e5IsWht\s*&&[\s\S]{0,200}?&&\s*!ctx\.issueClassification\?\.isJurisprudenceQuery\s*\)/.test(PIPELINE_SRC),
    "Step 5.5 eligibility includes && !ctx.issueClassification?.isJurisprudenceQuery"
  );
});

group("Test 6 — pipeline Step 6.6 authority lock checks !isJurisprudenceQuery", () => {
  const step66 = PIPELINE_SRC.slice(
    PIPELINE_SRC.indexOf("Step 6.6"),
    PIPELINE_SRC.indexOf("FAST_EWT_AUTHORITY_PATH")
  );
  assert(step66.length > 0, "Step 6.6 block located");
  assert(
    /_pgRunPreGen\s*=\s*_pgIsWht\s*&&[\s\S]{0,200}!ctx\.issueClassification\?\.isJurisprudenceQuery/.test(step66),
    "Step 6.6 _pgRunPreGen includes && !ctx.issueClassification?.isJurisprudenceQuery"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021A regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
