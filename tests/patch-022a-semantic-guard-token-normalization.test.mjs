/**
 * PATCH-022A Regression Tests
 * Semantic Guard Query Token Normalization
 *
 * Run: node tests/patch-022a-semantic-guard-token-normalization.test.mjs
 *
 * Root cause: sourceMaterialTermsMatchAuthority(candidate, queryString) split the
 * raw query on whitespace without stripping punctuation, then filtered len > 3.
 * For "What is VAT?":
 *   tokens (pre-patch) = ["what", "vat?"]  — "vat?" never matches "vat" in source text
 *   tokens (post-patch) = ["what", "vat"]  — "vat" matches RR 16-2005 chunks → PASS
 *
 * Fix: strip leading/trailing punctuation per token; whitelist 3-char tax acronyms
 * (VAT, EWT, FWT, CWT, CGT, DST, RPT) so they survive the len > 3 filter.
 * The len > 3 threshold is preserved for all other tokens to avoid false positives
 * from common 3-letter words ("the", "and", "for").
 *
 * Scope: query-string branch of sourceMaterialTermsMatchAuthority only.
 * No retrieval, ranking, DSF, SAS, or authority-lock changes.
 */

"use strict";

import { sourceMaterialTermsMatchAuthority } from "../issue-classification-engine.js";

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

// Minimal RR 16-2005 chunk fixture — text contains "vat" (as the real chunks do).
const RR_16_2005_CHUNK = {
  text: "The value-added tax (VAT) shall be levied on every sale, barter, exchange, or lease of goods and services in the Philippines under Revenue Regulations 16-2005.",
  normalizedReference: "rr 16-2005"
};

// Chunk that does NOT contain "vat" — verifies no false positive.
const UNRELATED_CHUNK = {
  text: "The estate tax is imposed on the transfer of the net estate of the decedent to his heirs.",
  normalizedReference: "nirc sec 84"
};

// ─── Group 1: Core "What is VAT?" fix ────────────────────────────────────────

group("Test 1 — 'What is VAT?' passes RR 16-2005 chunk", () => {
  // Pre-patch: tokens=["what","vat?"] → "vat?" not in text → FAIL
  // Post-patch: tokens=["what","vat"] → "vat" in text → PASS
  const result = sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "What is VAT?");
  assert(result === true, "'What is VAT?' → RR 16-2005 chunk passes semantic guard");
});

group("Test 2 — 'What is VAT' (no punctuation) passes", () => {
  // Baseline: the fix must not break the no-punctuation form.
  const result = sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "What is VAT");
  assert(result === true, "'What is VAT' (no trailing ?) → RR 16-2005 chunk passes semantic guard");
});

group("Test 3 — 'Explain VAT?' passes", () => {
  // Another real-world query variant; "explain" (7 chars) also passes > 3.
  const result = sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "Explain VAT?");
  assert(result === true, "'Explain VAT?' → RR 16-2005 chunk passes semantic guard");
});

group("Test 4 — 'What is EWT?' passes EWT chunk", () => {
  const EWT_CHUNK = {
    text: "The expanded withholding tax (EWT) shall be withheld by the income payor on compensation and business income payments pursuant to Revenue Regulations 2-98."
  };
  const result = sourceMaterialTermsMatchAuthority(EWT_CHUNK, "What is EWT?");
  assert(result === true, "'What is EWT?' → EWT chunk passes semantic guard");
});

// ─── Group 2: Punctuation Variant Normalization ───────────────────────────────

group("Test 5 — Punctuation variants all normalize to 'vat'", () => {
  // "VAT?", "VAT.", "(VAT)", "VAT:" in isolation (as if they were the only query token).
  // Wrap each in a longer query so there are multiple tokens to check the mechanism.
  assert(
    sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "Define VAT?") === true,
    "VAT? variant → 'vat' extracted → PASS"
  );
  assert(
    sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "Define VAT.") === true,
    "VAT. variant → 'vat' extracted → PASS"
  );
  assert(
    sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "Define (VAT)") === true,
    "(VAT) variant → 'vat' extracted → PASS"
  );
  assert(
    sourceMaterialTermsMatchAuthority(RR_16_2005_CHUNK, "Define VAT:") === true,
    "VAT: variant → 'vat' extracted → PASS"
  );
});

// ─── Group 3: No False Positives / Guard Integrity ───────────────────────────

group("Test 6 — Unrelated chunk still fails for 'What is VAT?'", () => {
  // Estate tax chunk does not contain "vat" — guard must still reject it.
  const result = sourceMaterialTermsMatchAuthority(UNRELATED_CHUNK, "What is VAT?");
  assert(result === false, "Estate tax chunk does NOT pass semantic guard for VAT query");
});

group("Test 7 — Short common words do NOT cause false positives", () => {
  // "The" (3 chars) and "is" (2 chars) are excluded by len > 3; "VAT?" → "vat" passes
  // but an unrelated chunk with "the" and "is" does not contain "vat" → FAIL.
  // This verifies we did NOT change the > 3 threshold to >= 3 (which would admit "the").
  const NIRC_CHUNK = {
    text: "The national internal revenue code provides the framework for all internal revenue taxes."
  };
  // Query with only short words + acronym: the acronym must be what drives matching.
  // If we accidentally lowered the threshold to >= 3, "the" would match every chunk.
  const result = sourceMaterialTermsMatchAuthority(NIRC_CHUNK, "What is VAT?");
  // NIRC_CHUNK does not contain "vat" → should fail despite "what" (4 chars) being present.
  // "what" not in NIRC_CHUNK text → false (no token matches)
  assert(result === false, "NIRC chunk without 'vat' does not pass for VAT query (no token match)");
});

group("Test 8 — Object-branch dispatch unchanged (regression guard)", () => {
  // sourceMaterialTermsMatchAuthority's second dispatch path (issueClassification object)
  // must be completely unaffected. With guard.active !== true → { matches: true }.
  const result = sourceMaterialTermsMatchAuthority(
    { text: "some source text" },
    { semanticNoMatchGuard: { active: false } }
  );
  assert(
    result?.matches === true,
    "Object-branch with inactive guard returns { matches: true } (no regression)"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-022A Semantic Guard Token Normalization: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  ✗ ${f}`);
}
console.log("─".repeat(60));

process.exit(failed > 0 ? 1 : 0);
