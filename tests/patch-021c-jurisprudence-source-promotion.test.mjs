/**
 * PATCH-021C Regression Tests
 * Jurisprudence Authority Promotion for Case-Law Queries
 *
 * Run: node tests/patch-021c-jurisprudence-source-promotion.test.mjs
 *
 * pipeline.js is not env-free to import, so (consistent with the 019A/021A/
 * 021B suites) wiring is verified via source scans. The production
 * patch021cJurisprudenceRank function is EXTRACTED from pipeline.js source
 * and executed directly, so the ordering assertions run real production code.
 * Classifier signals come from the real classify() import.
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

// ─── Extract the REAL production rank function from pipeline.js ───────────────

const _rankMatch = PIPELINE_SRC.match(/function patch021cJurisprudenceRank\(doc = \{\}\) \{[\s\S]*?\n\}/);
const patch021cJurisprudenceRank = _rankMatch
  ? new Function(`${_rankMatch[0]}; return patch021cJurisprudenceRank;`)()
  : null;

group("Test 0 — production rank function extracted", () => {
  assert(typeof patch021cJurisprudenceRank === "function", "patch021cJurisprudenceRank found in pipeline.js");
});

// ─── Test 1: jurisprudence ordering — SC/CTA before statutes/regs ─────────────

group("Test 1 — SUPREME_COURT promoted before STATUTE", () => {
  const sc      = { authorityType: "SUPREME_COURT" };
  const statute = { authorityType: "STATUTE" };
  assert(patch021cJurisprudenceRank(sc) < patch021cJurisprudenceRank(statute), "SUPREME_COURT ranks above STATUTE");
  const scEb = { authority_type: "SUPREME_COURT_EN_BANC" };
  assert(patch021cJurisprudenceRank(scEb) < patch021cJurisprudenceRank(statute), "SUPREME_COURT_EN_BANC ranks above STATUTE");
});

group("Test 2 — CTA_DIVISION / CTA_EN_BANC promoted before STATUTE/RR", () => {
  const ctaEb  = { authorityType: "CTA_EN_BANC" };
  const ctaDiv = { authorityType: "CTA_DIVISION" };
  const statute = { authorityType: "STATUTE" };
  const rr      = { authorityType: "RR" };
  assert(patch021cJurisprudenceRank(ctaEb)  < patch021cJurisprudenceRank(statute), "CTA_EN_BANC ranks above STATUTE");
  assert(patch021cJurisprudenceRank(ctaDiv) < patch021cJurisprudenceRank(statute), "CTA_DIVISION ranks above STATUTE");
  assert(patch021cJurisprudenceRank(ctaEb)  < patch021cJurisprudenceRank(rr),      "CTA_EN_BANC ranks above RR");
  assert(patch021cJurisprudenceRank(ctaDiv) < patch021cJurisprudenceRank(rr),      "CTA_DIVISION ranks above RR");
  assert(patch021cJurisprudenceRank(ctaEb)  < patch021cJurisprudenceRank(ctaDiv),  "CTA_EN_BANC ranks above CTA_DIVISION");
});

group("Test 3 — full spec priority order holds", () => {
  const order = ["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "STATUTE", "RR", "RMC", "RMO", "SECONDARY"];
  const ranks = order.map(t => patch021cJurisprudenceRank({ authorityType: t }));
  const sorted = [...ranks].every((r, i) => i === 0 || ranks[i - 1] <= r);
  assert(sorted, `priority order SUPREME_COURT > CTA_EN_BANC > CTA_DIVISION > STATUTE > RR > RMC > RMO > Other (ranks: ${ranks.join(",")})`);
});

group("Test 4 — mock source set sorts SC/CTA first, statutes as background", () => {
  const mock = [
    { authorityType: "STATUTE",      normalizedReference: "NIRC Sec. 57" },
    { authorityType: "RR",           normalizedReference: "RR 2-98" },
    { authorityType: "CTA_DIVISION", normalizedReference: "CTA Case 9876" },
    { authorityType: "STATUTE",      normalizedReference: "NIRC Sec. 58" },
    { authorityType: "SUPREME_COURT", normalizedReference: "CIR v. Example (G.R. No. 123456)" }
  ];
  const sorted = [...mock].sort((a, b) => patch021cJurisprudenceRank(a) - patch021cJurisprudenceRank(b));
  assert(sorted[0].authorityType === "SUPREME_COURT", "SUPREME_COURT first");
  assert(sorted[1].authorityType === "CTA_DIVISION", "CTA_DIVISION second");
  assert(sorted[2].authorityType === "STATUTE", "statutes follow jurisprudence");
  assert(sorted[4].authorityType === "RR", "RR last");
});

// ─── Test 5: pipeline wiring (source scans) ───────────────────────────────────

group("Test 5 — Step 13.5 promotion block wired into pipeline", () => {
  assert(
    PIPELINE_SRC.includes("[PATCH_021C_JURISPRUDENCE_SOURCE_PROMOTION]"),
    "PATCH_021C_JURISPRUDENCE_SOURCE_PROMOTION diagnostic exists"
  );
  assert(
    /const\s+_jpIntent\s*=\s*ctx\.issueClassification\?\.isJurisprudenceQuery\s*===\s*true/.test(PIPELINE_SRC),
    "promotion triggers on isJurisprudenceQuery only"
  );
  for (const field of ["beforeTypes", "afterTypes", "promotedCount", "finalSourceCount", "includedCaseAuthorities", "includedBackgroundAuthorities"]) {
    assert(PIPELINE_SRC.includes(`${field}:`), `diagnostic includes ${field}`);
  }
  assert(
    /_jpMax\s*=\s*5/.test(PIPELINE_SRC),
    "final sources to model capped at 5 for jurisprudence queries"
  );
  assert(
    /_jpBackground\.length\s*>\s*0\s*\?\s*_jpMax\s*-\s*1\s*:\s*_jpMax/.test(PIPELINE_SRC),
    "at least one statute/regulation background slot retained when available"
  );
});

group("Test 6 — generation directive wired for jurisprudence queries", () => {
  assert(PIPELINE_SRC.includes("JURISPRUDENCE QUERY DIRECTIVE — PATCH-021C"), "directive header present");
  assert(PIPELINE_SRC.includes("do NOT claim that no such cases exist"), "no-cases wording: indexed case-law not retrieved, not 'no cases exist'");
  assert(PIPELINE_SRC.includes("do NOT present statutes or regulations as the only controlling authorities"), "statutes-not-controlling instruction present");
  assert(PIPELINE_SRC.includes("NEVER invent case names"), "anti-invention instruction present");
  assert(
    /masterPrompt:\s*_jpPromotedNames\.length\s*>\s*0\s*\?\s*_jpDirective\.trimStart\(\)[\s\S]{0,120}?:\s*ctx\.promptContract\.masterPrompt\s*\+\s*"\\n"\s*\+\s*_jpDirective/.test(PIPELINE_SRC),
    "directive wired to master prompt (PATCH-021E: prepended when court decisions promoted, appended fallback otherwise)"
  );
});

group("Test 7 — source card ordering promotes SC/CTA for jurisprudence queries", () => {
  const cardSortIdx = PIPELINE_SRC.indexOf("PATCH-021C: for case-law intent queries, SC/CTA cards outrank");
  assert(cardSortIdx > -1, "card-ordering promotion block present");
  const cardBlock = PIPELINE_SRC.slice(cardSortIdx, cardSortIdx + 600);
  assert(
    /isJurisprudenceQuery\s*===\s*true/.test(cardBlock),
    "card re-sort gated on isJurisprudenceQuery"
  );
  assert(
    /patch021cJurisprudenceRank\(a\)\s*-\s*patch021cJurisprudenceRank\(b\)/.test(cardBlock),
    "card re-sort uses patch021cJurisprudenceRank"
  );
});

// ─── Test 8: PATCH-021B guards still present ──────────────────────────────────

group("Test 8 — PATCH-021B fast-path guards retained", () => {
  assert(
    /_patch017fEligible\s*=[\s\S]{0,200}?&&\s*!_patch017fCaseLawGuard/.test(PIPELINE_SRC),
    "PATCH-017F case-law guard retained"
  );
  assert(
    /ctx\.saeStatus\s*===\s*"AUTHORITY_FOUND"\s*&&\s*!_fdCaseLawGuard/.test(PIPELINE_SRC),
    "generation cap case-law guard retained"
  );
});

// ─── Test 9: classifier signals (ordinary paths preserved) ────────────────────

group("Test 9 — ordinary EWT / VAT paths unaffected", () => {
  const ewt = classify("What is EWT?");
  assert(ewt.isJurisprudenceQuery === false, "'What is EWT?' → isJurisprudenceQuery false (promotion never triggers)");
  const adv = classify("Is advertising service subject to EWT?");
  assert(adv.isJurisprudenceQuery === false, "'Is advertising service subject to EWT?' → isJurisprudenceQuery false");
  const vat = classify("What is VAT?");
  assert(vat.isJurisprudenceQuery === false, "'What is VAT?' → isJurisprudenceQuery false (despite requiresJurisprudence by design)");
  assert(vat.retrievalStrategy === "VAT_DEFINITION_AUTHORITY_FIRST", "'What is VAT?' → VAT definition bridge intact");
  const wht = classify("Is there court cases in relation to withholding taxes?");
  assert(wht.isJurisprudenceQuery === true, "case-law query → isJurisprudenceQuery true (promotion triggers)");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021C regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
