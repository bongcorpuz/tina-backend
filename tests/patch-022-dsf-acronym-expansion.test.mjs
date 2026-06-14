/**
 * PATCH-022 Regression Tests
 * DSF Tax Acronym Expansion — filterDisplayedSourcesByDirectSupport
 *
 * Run: node tests/patch-022-dsf-acronym-expansion.test.mjs
 *
 * Root cause: when the LLM answer uses an acronym (e.g. "VAT") the DSF key-term
 * extractor only adds the short form.  Source blobs that use the spelled-out or
 * hyphenated form ("value-added tax") cannot achieve ≥2 Signal C overlaps, so the
 * source card is rejected even though it directly supports the answer.
 *
 * Fix (_expandTaxAcronyms called in _extractAnswerKeyTerms before return):
 * - "vat"   → adds "value added tax", "value-added tax"
 * - "ewt"   → adds "expanded withholding tax"
 * - "fwt"   → adds "final withholding tax"
 * - "cwt"   → adds "creditable withholding tax"
 * - "cgt"   → adds "capital gains tax"
 * - "dst"   → adds "documentary stamp tax"
 * - "mcit"  → adds "minimum corporate income tax"
 * - "nolco" → adds "net operating loss carry-over", "net operating loss carryover"
 * - "rpt"   → adds "real property tax"
 *
 * Unknown acronyms (e.g. "gst") must NOT be expanded.
 * Original acronym term must be preserved after expansion.
 */

"use strict";

import { filterDisplayedSourcesByDirectSupport } from "../source-visibility-engine.js";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(excerpt, normalizedReference = "rr 16-2005", title = "") {
  return { excerpt, normalizedReference, title };
}

// ─── Group 1: VAT Acronym Expansion ──────────────────────────────────────────

group("Test 1 — VAT acronym (standard mode): hyphenated source blob passes Signal C", () => {
  // Pre-patch: key_terms = {"vat"}.  Source has "(VAT)" → overlap=1 < 2 → FAIL.
  // Post-patch: expansion adds "value-added tax" → overlap=2 ("vat" + "value-added tax") → PASS.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "VAT is a consumption tax imposed on the sale of goods and services in the Philippines.",
    issueClassification: { primaryDomain: "VAT" },
    candidateSources: [
      makeSource(
        "The value-added tax (VAT) shall be levied on every sale of goods and services.",
        "rr 16-2005",
        "Revenue Regulations No. 16-2005"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "RR 16-2005 with 'value-added tax (VAT)' blob passes Signal C for VAT-acronym answer"
  );
  assert(
    result.rejectedSources.length === 0,
    "no rejected sources"
  );
});

group("Test 2 — VAT acronym (FAST_DEFINITION mode): non-hyphenated source blob passes Signal C", () => {
  // FAST_DEFINITION requires only 1 key-term overlap.
  // Source has "value added tax" (no hyphen, no "VAT" word) → pre-patch: "vat" not in blob → 0 < 1 → FAIL.
  // Post-patch: expansion adds "value added tax" → 1 overlap ≥ 1 → PASS.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "VAT is a consumption tax.",
    mode: "FAST_DEFINITION",
    issueClassification: { primaryDomain: "VAT" },
    candidateSources: [
      makeSource(
        "The value added tax is an indirect tax on consumption levied at the rate of twelve percent.",
        "nirc sec 105"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "Non-hyphenated 'value added tax' blob passes Signal C in FAST_DEFINITION mode for VAT-acronym answer"
  );
});

group("Test 3 — VAT original acronym preserved after expansion", () => {
  // Expansion adds spelled-out forms but must NOT remove the original "vat" term.
  // Source with only "(VAT)" and no spelled-out form should still pass via "vat".
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "VAT is levied at a rate of 12%.",
    mode: "FAST_DEFINITION",
    issueClassification: { primaryDomain: "VAT" },
    candidateSources: [
      makeSource(
        "The standard VAT rate is 12 percent under the NIRC.",
        "bir ruling 2023-01"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "Original 'vat' term preserved in key-term set after expansion — source with 'VAT' only still passes"
  );
});

// ─── Group 2: Other Acronym Expansions ───────────────────────────────────────

group("Test 4 — EWT acronym: 'ewt' expands to 'expanded withholding tax'", () => {
  // Pre-patch: key_terms = {"ewt"}.  Source has "expanded withholding tax (EWT)" → "ewt"=1 < 2 → FAIL.
  // Post-patch: "expanded withholding tax" added → "ewt" + "expanded withholding tax" = 2 → PASS.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "EWT must be withheld by the income payor on compensation payments.",
    issueClassification: { primaryDomain: "WHT" },
    candidateSources: [
      makeSource(
        "The expanded withholding tax (EWT) shall be deducted by the withholding agent from payments made.",
        "rr 2-98"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "RR 2-98 with 'expanded withholding tax (EWT)' passes Signal C for EWT-acronym answer"
  );
});

group("Test 5 — DST via keyTerms: 'dst' expands to 'documentary stamp tax'", () => {
  // keyTerms injects "dst" (as if passed from pipeline classification).
  // Source has "documentary stamp tax (DST)" → pre-patch: "dst"=1 < 2 → FAIL.
  // Post-patch: "documentary stamp tax" added → 2 overlaps → PASS.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "The instrument is subject to the applicable stamp duty requirement.",
    keyTerms: ["DST"],
    candidateSources: [
      makeSource(
        "The documentary stamp tax (DST) shall be imposed on all debt instruments and sale transactions.",
        "nirc sec 173"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "DST keyTerm injection expands to 'documentary stamp tax' — source passes Signal C"
  );
});

group("Test 6 — NOLCO acronym: 'nolco' expands to 'net operating loss carry-over'", () => {
  // Pre-patch: key_terms = {"nolco"}.  Source has "net operating loss carry-over (NOLCO)" → "nolco"=1 < 2 → FAIL.
  // Post-patch: "net operating loss carry-over" added → 2 overlaps → PASS.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "NOLCO may be carried forward and deducted from gross income for the next three taxable years.",
    issueClassification: { primaryDomain: "CIT" },
    candidateSources: [
      makeSource(
        "The net operating loss carry-over (NOLCO) of the preceding three taxable years shall be allowed as deduction.",
        "nirc sec 34d"
      )
    ]
  });
  assert(
    result.displayedSources.length === 1,
    "NIRC Sec. 34(D) with 'net operating loss carry-over (NOLCO)' passes Signal C for NOLCO answer"
  );
});

// ─── Group 3: Negative / Guard Cases ─────────────────────────────────────────

group("Test 7 — Unknown acronym (GST) is NOT expanded", () => {
  // "gst" is NOT in _TAX_ACRONYM_EXPANSIONS.  If it WERE expanded (incorrectly) to
  // "goods and services tax", the source blob would reach 2 overlaps and pass.
  // The test produces ≥2 total key terms (so minOverlapRequired stays at 2, not 1):
  //   "vat" (from VAT domain) → expanded to "value added tax", "value-added tax"
  //   "gst" (from keyTerms)   → NOT expanded
  // Source has "goods and services tax (GST)" but no VAT terms → only "gst" matches → 1 < 2 → FAIL (correct).
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "VAT and GST are both consumption taxes but apply in different jurisdictions.",
    issueClassification: { primaryDomain: "VAT" },
    keyTerms: ["GST"],
    candidateSources: [
      makeSource(
        "The goods and services tax (GST) is levied on consumption in foreign jurisdictions.",
        "foreign-tax-ref"
      )
    ]
  });
  assert(
    result.displayedSources.length === 0,
    "Unknown acronym 'GST' is NOT expanded — source with only 'goods and services tax (GST)' correctly rejected"
  );
});

group("Test 8 — No acronym in answer: expansion never fires, source rejected", () => {
  // Answer does not contain "vat" (or any domain acronym) → key terms empty → no expansion.
  // Source with "value-added tax (VAT)" content has nothing to match against → Signal C fails.
  const result = filterDisplayedSourcesByDirectSupport({
    answerText: "The tax is an indirect levy on consumption transactions in the Philippines.",
    issueClassification: { primaryDomain: "VAT" },
    candidateSources: [
      makeSource(
        "The value-added tax (VAT) shall be levied on every sale of goods and services.",
        "rr 16-2005"
      )
    ]
  });
  assert(
    result.displayedSources.length === 0,
    "No acronym in answer → no expansion → source correctly rejected when no Signal A/B match"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-022 DSF Acronym Expansion: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  ✗ ${f}`);
}
console.log("─".repeat(60));

process.exit(failed > 0 ? 1 : 0);
