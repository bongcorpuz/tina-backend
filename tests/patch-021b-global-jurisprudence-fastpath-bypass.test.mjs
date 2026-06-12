/**
 * PATCH-021B Regression Tests
 * Global Jurisprudence Bypass for Fast Paths
 *
 * Run: node tests/patch-021b-global-jurisprudence-fastpath-bypass.test.mjs
 *
 * Imports the REAL production classifier (classify from
 * issue-classification-engine.js). Pipeline fast-path gate wiring
 * (PATCH-017F pre-retrieval short-circuit, PATCH-017D generation cap /
 * compact prompt, Step 5.5 / 6.6 from PATCH-021A) is verified via source
 * scans, consistent with the 019A and 021A suites.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify } from "../issue-classification-engine.js";

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

// ─── Test 1: PATCH-017F eligibility checks the jurisprudence guard ────────────

group("Test 1 — PATCH_017F eligibility includes case-law guard", () => {
  assert(
    /const\s+_patch017fCaseLawGuard\s*=\s*_patch017fIsJurisQuery\s*\|\|\s*_patch017fReqJuris\s*\|\|\s*_patch017fUseJurisEngine/.test(PIPELINE_SRC),
    "_patch017fCaseLawGuard ORs isJurisprudenceQuery / requiresJurisprudence / useJurisprudenceEngine"
  );
  assert(
    /_patch017fIsJurisQuery\s*=\s*ctx\.issueClassification\?\.isJurisprudenceQuery\s*===\s*true/.test(PIPELINE_SRC),
    "guard reads ctx.issueClassification?.isJurisprudenceQuery"
  );
  assert(
    /_patch017fEligible\s*=[\s\S]{0,200}?&&\s*!_patch017fCaseLawGuard/.test(PIPELINE_SRC),
    "PATCH_017F eligibility includes && !_patch017fCaseLawGuard"
  );
  assert(
    /caseLawGuardApplied:\s*_patch017fCaseLawGuard/.test(PIPELINE_SRC),
    "PATCH_017F_PRE_RETRIEVAL_EWT_CHECK logs caseLawGuardApplied"
  );
});

// ─── Test 2: FAST_EWT generation cap checks the jurisprudence guard ───────────

group("Test 2 — FAST_EWT generation cap includes case-law guard", () => {
  assert(
    /const\s+_fdCaseLawGuard\s*=[\s\S]{0,300}?isJurisprudenceQuery\s*===\s*true[\s\S]{0,300}?useJurisprudenceEngine\s*===\s*true/.test(PIPELINE_SRC),
    "_fdCaseLawGuard ORs isJurisprudenceQuery / requiresJurisprudence / useJurisprudenceEngine"
  );
  assert(
    /if\s*\(\s*ctx\._fastEwtAuthorityPath\s*&&\s*ctx\.saeStatus\s*===\s*"AUTHORITY_FOUND"\s*&&\s*!_fdCaseLawGuard\s*\)/.test(PIPELINE_SRC),
    "generation cap gate includes && !_fdCaseLawGuard"
  );
});

// ─── Test 3: compact prompt path is governed by the same guard ────────────────

group("Test 3 — compact prompt path is inside the guarded gate", () => {
  const gateIdx   = PIPELINE_SRC.indexOf('ctx.saeStatus === "AUTHORITY_FOUND" && !_fdCaseLawGuard');
  const capIdx    = PIPELINE_SRC.indexOf('console.log("[FAST_EWT_GENERATION_CAP_APPLIED]"', gateIdx);
  const promptIdx = PIPELINE_SRC.indexOf('console.log("[FAST_EWT_COMPACT_PROMPT_USED]"', gateIdx);
  assert(gateIdx > -1, "guarded generation gate located");
  assert(capIdx > gateIdx, "FAST_EWT_GENERATION_CAP_APPLIED log sits inside the guarded gate");
  assert(promptIdx > gateIdx, "FAST_EWT_COMPACT_PROMPT_USED log sits inside the guarded gate");
  // The compact prompt log must be in the gate's success block, before the
  // gate's else branch (FAST_EWT_GATE_SKIPPED).
  const skipIdx = PIPELINE_SRC.indexOf('console.log("[FAST_EWT_GATE_SKIPPED]"', gateIdx);
  assert(skipIdx > promptIdx, "compact prompt sits before the gate's skip branch");
});

// ─── Test 3b: PATCH-021A Step 5.5 / 6.6 guards still present ──────────────────

group("Test 3b — Step 5.5 / Step 6.6 jurisprudence guards retained", () => {
  assert(
    /if\s*\(\s*_e5IsWht\s*&&[\s\S]{0,200}?&&\s*!ctx\.issueClassification\?\.isJurisprudenceQuery\s*\)/.test(PIPELINE_SRC),
    "Step 5.5 compact retrieval guard retained"
  );
  assert(
    /_pgRunPreGen\s*=\s*_pgIsWht\s*&&[\s\S]{0,200}?!ctx\.issueClassification\?\.isJurisprudenceQuery/.test(PIPELINE_SRC),
    "Step 6.6 authority lock guard retained"
  );
});

// ─── Tests 4-8: classifier signals ────────────────────────────────────────────

group("Test 4 — WHT case-law queries flag isJurisprudenceQuery true", () => {
  for (const q of [
    "Is there court cases in relation to withholding taxes?",
    "Court cases for withholding tax.",
    "Supreme Court cases on EWT.",
    "CTA cases on withholding tax."
  ]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === true, `'${q}' → isJurisprudenceQuery true`);
  }
});

group("Test 5 — ordinary EWT queries stay unflagged (fast path preserved)", () => {
  for (const q of ["What is EWT?", "Is advertising service subject to EWT?", "Tell me about withholding taxes."]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === false, `'${q}' → isJurisprudenceQuery false`);
    assert(c.requiresJurisprudence !== true, `'${q}' → requiresJurisprudence not true`);
    assert(c.downstreamRouting?.useJurisprudenceEngine !== true, `'${q}' → useJurisprudenceEngine not true`);
  }
});

group("Test 6 — VAT case-law queries flag isJurisprudenceQuery true", () => {
  for (const q of [
    "Is there court cases in relation to VAT?",
    "Court cases on VAT.",
    "Supreme Court cases on VAT.",
    "CTA cases on VAT."
  ]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === true, `'${q}' → isJurisprudenceQuery true`);
  }
});

group("Test 7 — ordinary VAT definition bridge preserved", () => {
  for (const q of ["What is VAT?", "Define VAT."]) {
    const c = classify(q);
    assert(c.isJurisprudenceQuery === false, `'${q}' → isJurisprudenceQuery false`);
    assert(c.subIssue === "VAT_DEFINITION", `'${q}' → subIssue VAT_DEFINITION`);
    assert(c.retrievalStrategy === "VAT_DEFINITION_AUTHORITY_FIRST", `'${q}' → VAT definition strategy intact`);
  }
  const ov = classify("Explain VAT in simple terms.");
  assert(ov.isJurisprudenceQuery === false, "'Explain VAT in simple terms.' → isJurisprudenceQuery false");
});

group("Test 8 — jurisprudence queries not forced into FAST_DEFINITION", () => {
  for (const q of [
    "Is there court cases in relation to withholding taxes?",
    "Is there court cases in relation to VAT?"
  ]) {
    const c = classify(q);
    assert(c.responseMode !== "FAST_DEFINITION", `'${q}' → responseMode not FAST_DEFINITION (got ${c.responseMode})`);
    assert(c.orchestrationMode !== "FAST_DEFINITION", `'${q}' → orchestrationMode not FAST_DEFINITION (got ${c.orchestrationMode})`);
  }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021B regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
