/**
 * PATCH-021E Regression Tests
 * Jurisprudence Answer Naming Directive
 *
 * Run: node tests/patch-021e-jurisprudence-naming-directive.test.mjs
 *
 * pipeline.js is not env-free to import, so (consistent with the 021C/021D
 * suites) the production helpers patch021cJurisprudenceRank /
 * patch021cIsCaseAuthority / patch021eCaseNamesFromSources are EXTRACTED from
 * pipeline.js source and executed directly. Directive wiring is verified by
 * source scan. Classifier gating uses the real classify() import.
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

// ─── Extract REAL production helpers from pipeline.js ─────────────────────────

function extractFn(name) {
  const m = PIPELINE_SRC.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  return m ? m[0] : null;
}
const rankSrc  = extractFn("patch021cJurisprudenceRank");
const isCaseSrc = extractFn("patch021cIsCaseAuthority");
const namesSrc  = extractFn("patch021eCaseNamesFromSources");
const patch021eCaseNamesFromSources = (rankSrc && isCaseSrc && namesSrc)
  ? new Function(`${rankSrc}; ${isCaseSrc}; ${namesSrc}; return patch021eCaseNamesFromSources;`)()
  : null;

group("Test 0 — production functions extracted", () => {
  assert(typeof patch021eCaseNamesFromSources === "function", "patch021eCaseNamesFromSources found in pipeline.js");
});

// ─── Test 1: CTA Case No. 9711 in finalSources → named in directive input ─────

group("Test 1 — court source present produces its exact name", () => {
  const finalSources = [
    { authorityType: "CASE", authority_type: "CTA_DIVISION", normalizedReference: "CTA Case No. 9711", title: "CTA Case No. 9711 – Dizon Farms Produce, Inc. v. CIR.pdf" },
    { authorityType: "STATUTE", normalizedReference: "NIRC Sec. 57" },
    { authorityType: "STATUTE", normalizedReference: "NIRC Sec. 58" },
    { authorityType: "RR", normalizedReference: "RR 2-98" }
  ];
  const names = patch021eCaseNamesFromSources(finalSources);
  assert(names.length === 1, `exactly one case name (got ${names.length})`);
  assert(names[0].includes("CTA Case No. 9711"), "name includes normalized_reference CTA Case No. 9711");
  assert(names[0].includes("Dizon Farms"), "name includes the document title (case name)");
  assert(!/\.pdf$/i.test(names[0]), "trailing .pdf stripped");
  assert(!names.some((n) => /NIRC|RR 2-98/.test(n)), "statute/RR sources never named as court decisions");
});

group("Test 1b — ref-not-in-title composes 'ref (title)'", () => {
  const names = patch021eCaseNamesFromSources([
    { authorityType: "SUPREME_COURT", normalized_reference: "G.R. No. 153866", document_title: "CIR v. Seagate Technology (2007).pdf" }
  ]);
  assert(names[0] === "G.R. No. 153866 (CIR v. Seagate Technology (2007))", `composed name correct (got '${names[0]}')`);
});

group("Test 1c — duplicate chunks of the same case dedupe to one name", () => {
  const chunk = { authorityType: "CASE", normalizedReference: "CTA Case No. 9711", title: "CTA Case No. 9711 – Dizon Farms Produce, Inc. v. CIR.pdf" };
  const names = patch021eCaseNamesFromSources([chunk, { ...chunk }, { ...chunk }]);
  assert(names.length === 1, "four identical case chunks yield one name");
});

// ─── Test 2: directive wording (source scan) ──────────────────────────────────

group("Test 2 — naming directive forbids the false 'none retrieved' claim", () => {
  assert(PIPELINE_SRC.includes("[JURISPRUDENCE QUERY DIRECTIVE — PATCH-021C/021E]"), "021E directive header present");
  assert(PIPELINE_SRC.includes("Indexed court decisions retrieved for this query include:"), "directive names retrieved decisions explicitly");
  assert(PIPELINE_SRC.includes("Do NOT state that no indexed court cases or case-law sources were retrieved"), "directive forbids the false negative when promoted");
  assert(PIPELINE_SRC.includes("discuss these retrieved court decisions FIRST"), "courts-before-statutes ordering instruction present");
  assert(PIPELINE_SRC.includes("supporting background only"), "statutes/RR kept as background");
});

// ─── Test 3: promotedCount === 0 keeps the original fallback ──────────────────

group("Test 3 — zero court sources preserves the fallback directive", () => {
  const names = patch021eCaseNamesFromSources([
    { authorityType: "STATUTE", normalizedReference: "NIRC Sec. 57" },
    { authorityType: "RR", normalizedReference: "RR 2-98" }
  ]);
  assert(names.length === 0, "no names from statute-only sources");
  assert(
    /_jpPromotedNames\.length\s*>\s*0\s*\?/.test(PIPELINE_SRC),
    "directive selection branches on promoted names"
  );
  assert(
    PIPELINE_SRC.includes("state plainly that no indexed case-law source was retrieved for this question — do NOT claim that no such cases exist"),
    "original 021C fallback wording retained for the zero-promoted branch"
  );
});

// ─── Test 4: gating — non-jurisprudence EWT unaffected ────────────────────────

group("Test 4 — directive gated on isJurisprudenceQuery; EWT untouched", () => {
  const block = PIPELINE_SRC.slice(
    PIPELINE_SRC.indexOf("Step 13.5: PATCH-021C"),
    PIPELINE_SRC.indexOf("TEMP TRACE: Stage 7")
  );
  assert(/_jpIntent\s*=\s*ctx\.issueClassification\?\.isJurisprudenceQuery\s*===\s*true/.test(block), "Step 13.5 gated on isJurisprudenceQuery === true");
  assert(block.includes("patch021eCaseNamesFromSources(ctx.rerankedChunks)"), "names built only from the final reranked sources");
  const ewt = classify("Is advertising service subject to EWT?");
  assert(ewt.isJurisprudenceQuery === false, "'Is advertising service subject to EWT?' never enters the directive block");
  const def = classify("What is EWT?");
  assert(def.isJurisprudenceQuery === false, "'What is EWT?' never enters the directive block");
});

// ─── Test 5: no fabrication — names come only from sources ────────────────────

group("Test 5 — no court source, no name; nothing is invented", () => {
  assert(patch021eCaseNamesFromSources([]).length === 0, "empty sources → empty names");
  assert(patch021eCaseNamesFromSources([{ authorityType: "RMC", normalizedReference: "RMC 65-2012" }]).length === 0, "admin issuances never named");
  const noIdentity = patch021eCaseNamesFromSources([{ authorityType: "CASE" }]);
  assert(noIdentity.length === 0, "court chunk without any reference/title contributes no name (nothing synthesized)");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021E regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
