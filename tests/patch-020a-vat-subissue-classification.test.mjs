/**
 * PATCH-020A Regression Tests
 * VAT Sub-Issue Classification Priority Guard
 *
 * Run: node tests/patch-020a-vat-subissue-classification.test.mjs
 *
 * Imports the REAL production classifier (classify from
 * issue-classification-engine.js — the engine pipeline.js calls for /ask).
 * Verifies that specialized VAT sub-issue checks (exemption, zero-rating,
 * input tax, output tax) take priority over the generic definition pattern,
 * while pure VAT definition and EWT classification are preserved.
 */

"use strict";

import {
  classify,
  detectSubIssue,
  isVatDefinitionQuery
} from "../issue-classification-engine.js";

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

const targetsOf = (c) => (c.targetAuthorities || []).map(String);
const hasTarget = (c, ref) => targetsOf(c).includes(ref);

// ─── Test 1: pure VAT definition preserved ────────────────────────────────────

group("Test 1 — 'What is VAT?' stays VAT_DEFINITION (no regression)", () => {
  const c = classify("What is VAT?");
  assert(c.subIssue === "VAT_DEFINITION", `subIssue is VAT_DEFINITION (got ${c.subIssue})`);
  assert(c.primaryIssue === "VAT_LIABILITY", `primaryIssue is VAT_LIABILITY (got ${c.primaryIssue})`);
  assert(c.retrievalStrategy === "VAT_DEFINITION_AUTHORITY_FIRST", `strategy is VAT_DEFINITION_AUTHORITY_FIRST (got ${c.retrievalStrategy})`);
  assert(hasTarget(c, "NIRC Sec. 105"), "targets include NIRC Sec. 105");
  assert(hasTarget(c, "NIRC Sec. 106"), "targets include NIRC Sec. 106");
  assert(hasTarget(c, "NIRC Sec. 107"), "targets include NIRC Sec. 107");
  assert(hasTarget(c, "NIRC Sec. 108"), "targets include NIRC Sec. 108");
  assert(hasTarget(c, "RR 16-2005"), "targets include RR 16-2005");
  assert(isVatDefinitionQuery(c) === true, "isVatDefinitionQuery flag remains true");
});

group("Test 1b — 'Define VAT.' stays VAT_DEFINITION", () => {
  const c = classify("Define VAT.");
  assert(c.subIssue === "VAT_DEFINITION", `subIssue is VAT_DEFINITION (got ${c.subIssue})`);
  assert(c.retrievalStrategy === "VAT_DEFINITION_AUTHORITY_FIRST", `strategy is VAT_DEFINITION_AUTHORITY_FIRST (got ${c.retrievalStrategy})`);
});

group("Test 1c — 'Explain VAT in simple terms.' stays VAT_OVERVIEW", () => {
  const c = classify("Explain VAT in simple terms.");
  assert(c.subIssue === "VAT_OVERVIEW", `subIssue is VAT_OVERVIEW (got ${c.subIssue})`);
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
});

// ─── Test 2: VAT exemption priority ───────────────────────────────────────────

group("Test 2 — 'What is VAT-exempt sale?' routes to VAT_EXEMPTION", () => {
  const c = classify("What is VAT-exempt sale?");
  assert(c.subIssue === "VAT_EXEMPTION", `subIssue is VAT_EXEMPTION (got ${c.subIssue})`);
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
  assert(c.retrievalStrategy !== "VAT_DEFINITION_AUTHORITY_FIRST", `strategy is not VAT_DEFINITION_AUTHORITY_FIRST (got ${c.retrievalStrategy})`);
  assert(hasTarget(c, "NIRC Sec. 109"), "targets include NIRC Sec. 109");
  assert((c.controllingAuthorities || []).includes("NIRC Sec. 109"), "NIRC Sec. 109 is controlling");
  assert(hasTarget(c, "RR 16-2005"), "RR 16-2005 remains supporting target");
  assert(!hasTarget(c, "NIRC Sec. 105"), "targets do not include NIRC Sec. 105 (definition bridge)");
  assert(isVatDefinitionQuery(c) === false, "isVatDefinitionQuery flag is false");
});

group("Test 3 — 'What is VAT-exempt transaction?' routes to VAT_EXEMPTION", () => {
  const c = classify("What is VAT-exempt transaction?");
  assert(c.subIssue === "VAT_EXEMPTION", `subIssue is VAT_EXEMPTION (got ${c.subIssue})`);
  assert(hasTarget(c, "NIRC Sec. 109"), "targets include NIRC Sec. 109");
  assert(c.retrievalStrategy !== "VAT_DEFINITION_AUTHORITY_FIRST", "strategy is not VAT_DEFINITION_AUTHORITY_FIRST");
});

group("Test 3b — other exemption phrasings route to VAT_EXEMPTION", () => {
  for (const q of [
    "Is the sale exempt from VAT?",
    "What is VAT exemption?",
    "What does NIRC Sec. 109 cover?",
    "What is covered by Section 109?"
  ]) {
    const sub = detectSubIssue(q, "VAT_LIABILITY", {});
    assert(sub === "VAT_EXEMPTION", `'${q}' → VAT_EXEMPTION (got ${sub})`);
  }
});

// ─── Test 4: zero-rating priority ─────────────────────────────────────────────

group("Test 4 — 'What is zero-rated sale?' routes to zero-rating", () => {
  const c = classify("What is zero-rated sale?");
  assert(
    ["ZERO_RATING", "ZERO_RATING_DEFINITION", "ZERO_RATED_SALES"].includes(c.subIssue),
    `subIssue is a zero-rating equivalent (got ${c.subIssue})`
  );
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
  assert(c.primaryIssue === "ZERO_RATED_SALES", `primaryIssue is ZERO_RATED_SALES (got ${c.primaryIssue})`);
  assert(c.retrievalStrategy !== "VAT_DEFINITION_AUTHORITY_FIRST", "strategy is not VAT_DEFINITION_AUTHORITY_FIRST");
  assert(hasTarget(c, "NIRC Sec. 106(A)(2)"), "targets include NIRC Sec. 106(A)(2)");
  assert(hasTarget(c, "NIRC Sec. 108(B)"), "targets include NIRC Sec. 108(B)");
});

group("Test 5 — 'What is VAT on zero-rated transactions?' routes to zero-rating", () => {
  const c = classify("What is VAT on zero-rated transactions?");
  assert(
    ["ZERO_RATING", "ZERO_RATING_DEFINITION", "ZERO_RATED_SALES"].includes(c.subIssue),
    `subIssue is a zero-rating equivalent (got ${c.subIssue})`
  );
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
  assert(c.retrievalStrategy !== "VAT_DEFINITION_AUTHORITY_FIRST", `strategy is not VAT_DEFINITION_AUTHORITY_FIRST (got ${c.retrievalStrategy})`);
  assert(hasTarget(c, "NIRC Sec. 106(A)(2)"), "targets include NIRC Sec. 106(A)(2)");
  assert(!hasTarget(c, "NIRC Sec. 105"), "targets do not include NIRC Sec. 105 (definition bridge)");
  assert(isVatDefinitionQuery(c) === false, "isVatDefinitionQuery flag is false");
});

group("Test 5b — export sale phrasings route to zero-rating", () => {
  for (const q of ["Is VAT due on export sales?", "What is the VAT treatment of a PEZA zero-rated sale?"]) {
    const sub = detectSubIssue(q, "VAT_LIABILITY", {});
    assert(
      ["ZERO_RATING", "ZERO_RATING_DEFINITION"].includes(sub),
      `'${q}' → zero-rating equivalent (got ${sub})`
    );
  }
});

// ─── Test 6: input / output VAT ───────────────────────────────────────────────

group("Test 6 — 'What is input VAT?' routes to INPUT_TAX definition", () => {
  const c = classify("What is input VAT?");
  assert(
    ["INPUT_TAX", "INPUT_TAX_DEFINITION"].includes(c.subIssue),
    `subIssue is INPUT_TAX equivalent (got ${c.subIssue})`
  );
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
  assert(hasTarget(c, "NIRC Sec. 110"), "targets include NIRC Sec. 110");
  assert(hasTarget(c, "NIRC Sec. 112"), "targets include NIRC Sec. 112");
});

group("Test 7 — 'What is output VAT?' routes to OUTPUT_TAX definition", () => {
  const c = classify("What is output VAT?");
  assert(
    ["OUTPUT_TAX", "OUTPUT_TAX_DEFINITION"].includes(c.subIssue),
    `subIssue is OUTPUT_TAX equivalent (got ${c.subIssue})`
  );
  assert(c.subIssue !== "VAT_DEFINITION", "subIssue is not VAT_DEFINITION");
  assert(hasTarget(c, "NIRC Sec. 106"), "targets include NIRC Sec. 106");
  assert(hasTarget(c, "NIRC Sec. 108"), "targets include NIRC Sec. 108");
});

// ─── Test 8: EWT preservation ─────────────────────────────────────────────────

group("Test 8 — 'Is advertising service subject to EWT?' unchanged", () => {
  const c = classify("Is advertising service subject to EWT?");
  assert(c.primaryIssue === "WITHHOLDING", `primaryIssue is WITHHOLDING (got ${c.primaryIssue})`);
  assert(c.subIssue === "EWT", `subIssue is EWT (got ${c.subIssue})`);
  assert(hasTarget(c, "NIRC Sec. 57"), "targets include NIRC Sec. 57");
  assert(hasTarget(c, "NIRC Sec. 58"), "targets include NIRC Sec. 58");
  assert(hasTarget(c, "RR 2-98"), "targets include RR 2-98");
  assert(isVatDefinitionQuery(c) === false, "EWT query never flagged as VAT definition");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-020A regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
