// PATCH-017K — Indexed Supporting Authority Availability Mapping
// Unit tests for the alias normalization logic used in the AUTHORITY_FOUND restoration block.
// Run: node _stage017k_test.mjs
//
// NOTE: The pipeline-level source card restoration requires an integration test
// (live VAT / EWT query). These unit tests verify the alias key logic and the
// acceptance criteria for the compliance layer remain intact.

import { ensureIndexedSourceLimitation, enforceFinalAnswerCompliance } from "./final-answer-compliance.js";

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function assertAbsent(label, text, forbidden) {
  const found = text.toLowerCase().includes(forbidden.toLowerCase());
  if (!found) {
    console.log(`  PASS: ${label} — "${forbidden}" absent`);
    passed++;
  } else {
    console.error(`  FAIL: ${label} — "${forbidden}" present but should be absent`);
    console.error(`        Snippet: ${text.slice(0, 300)}`);
    failed++;
  }
}

function assertPresent(label, text, required) {
  const found = text.toLowerCase().includes(required.toLowerCase());
  if (found) {
    console.log(`  PASS: ${label} — "${required}" present`);
    passed++;
  } else {
    console.error(`  FAIL: ${label} — "${required}" absent but should be present`);
    console.error(`        Snippet: ${text.slice(0, 300)}`);
    failed++;
  }
}

// ── Part 1: RR alias canonical key normalization ──────────────────────────────
// Verifies that the alias normalization logic used in PATCH-017K candidate matching
// would correctly equate all RR 16-2005 alias forms to a single canonical key.
console.log("\n=== PART 1: RR alias canonical key normalization ===\n");

function canonicalSourceKey(ref = "") {
  return String(ref || "")
    .toLowerCase()
    .replace(/\bno\.?\s*/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function aliasNormalize(ref = "") {
  return ref
    .replace(/\brevenue regulation[s]?\b/gi, "rr")
    .replace(/\bno\.?\s*/g, "");
}

const aliases = [
  "RR 16-2005",
  "RR No. 16-2005",
  "RR No. 16 2005",
  "RR_16-2005",
  "RR-16-2005",
  "RR 16 2005",
  "Revenue Regulation 16-2005",
  "Revenue Regulations 16-2005",
  "Revenue Regulation No. 16-2005",
  "Revenue Regulations No. 16-2005",
];

const targetKey = canonicalSourceKey("RR 16-2005");

for (const alias of aliases) {
  // Direct canonical key
  const directKey = canonicalSourceKey(alias);
  const directMatch = directKey === targetKey;

  // Alias-normalized canonical key (the PATCH-017K path)
  const aliasKey = canonicalSourceKey(aliasNormalize(alias));
  const aliasMatch = aliasKey === targetKey;

  const matches = directMatch || aliasMatch;
  assert(
    `"${alias}" matches canonical key via direct(${directMatch}) or alias(${aliasMatch})`,
    matches,
    `direct=${directKey}, alias=${aliasKey}, target=${targetKey}`
  );
}

// ── Part 2: Non-RR authorities should not cross-match ────────────────────────
console.log("\n=== PART 2: Non-RR authority isolation ===\n");

{
  const nirc105Key = canonicalSourceKey("NIRC Sec. 105");
  const rr162005Key = canonicalSourceKey("RR 16-2005");
  assert("NIRC Sec. 105 key does not equal RR 16-2005 key", nirc105Key !== rr162005Key,
    `nirc105=${nirc105Key}, rr16=${rr162005Key}`);

  const sec57Key = canonicalSourceKey("NIRC Sec. 57");
  const sec105Key = canonicalSourceKey("NIRC Sec. 105");
  assert("NIRC Sec. 57 key does not equal NIRC Sec. 105 key", sec57Key !== sec105Key,
    `sec57=${sec57Key}, sec105=${sec105Key}`);
}

// ── Part 3: VAT answer compliance — AUTHORITY_FOUND ──────────────────────────
console.log("\n=== PART 3: VAT answer compliance — no placeholder leakage ===\n");

{
  const vatDraft = [
    "### Direct Answer",
    "Value Added Tax (VAT) is a 12% consumption tax imposed under Sections 105-108 of the National Internal Revenue Code (NIRC) and Revenue Regulation No. 16-2005.",
    "",
    "### Legal Basis",
    "- Section 105, NIRC",
    "- Section 106, NIRC",
    "- Section 107, NIRC",
    "- Section 108, NIRC",
    "- RR No. 16-2005",
    "",
    "### Practical Note",
    "VAT is imposed on every sale, barter, or exchange of goods, properties, and services."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    vatDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is VAT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("VAT AUTHORITY_FOUND: no Framework knowledge", finalText, "Framework knowledge");
  assertAbsent("VAT AUTHORITY_FOUND: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertAbsent("VAT AUTHORITY_FOUND: no placeholder text", finalText, "Indexed source not found");
  assertPresent("VAT AUTHORITY_FOUND: 12% substantive answer preserved", finalText, "12%");
  assertPresent("VAT AUTHORITY_FOUND: Section 105 preserved", finalText, "105");
  assertPresent("VAT AUTHORITY_FOUND: RR reference preserved", finalText, "16-2005");
}

// ── Part 4: "Explain VAT like a 5-year-old" — simplified style preserved ─────
console.log("\n=== PART 4: VAT simplified explanation — no false limitation ===\n");

{
  const simpleDraft = [
    "### Direct Answer",
    "Imagine you are buying a toy. When you pay for it, part of the money goes to the government as a tax. That is VAT — Value Added Tax.",
    "",
    "### Legal Basis",
    "Section 105, NIRC — Value Added Tax.",
    "Section 106, NIRC — VAT on goods.",
    "RR No. 16-2005 — implementing regulations.",
    "",
    "### Practical Note",
    "Businesses with sales above PHP 3 million per year must register for VAT."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    simpleDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "Explain VAT to me like a 5-year-old."
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("VAT simple: no false Source Verification Limitation", finalText, "Source Verification Limitation");
  assertAbsent("VAT simple: no Framework knowledge", finalText, "Framework knowledge");
  assertPresent("VAT simple: toy analogy preserved", finalText, "toy");
}

// ── Part 5: EWT answer — no RR 16-2005 cross-contamination ───────────────────
console.log("\n=== PART 5: EWT answer — no VAT/RR 16-2005 injection ===\n");

{
  const ewtDraft = [
    "A. DIRECT ANSWER",
    "Advertising services rendered by resident payees are subject to 2% EWT under Section 57 of the NIRC.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Section 57, NIRC — creditable withholding at source.",
    "Section 58, NIRC — withholding agents.",
    "",
    "F. PRACTICAL NOTE",
    "Clients paying advertising agencies must withhold and remit the applicable EWT."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    ewtDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is the EWT rate for advertising agencies?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("EWT: no RR 16-2005 injection", finalText, "16-2005");
  assertAbsent("EWT: no VAT Section 105", finalText, "Section 105");
  assertAbsent("EWT: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertPresent("EWT: Section 57 preserved", finalText, "57");
  assertPresent("EWT: substantive EWT answer preserved", finalText, "advertising");
}

// ── Part 6: Missing supporting authority — no fabrication ────────────────────
console.log("\n=== PART 6: Missing supporting authority — no fabricated card (compliance layer) ===\n");

// Note: The no-fabrication rule is enforced at the pipeline level (pipeline.js).
// At the compliance layer, there is no mechanism to fabricate cards. This test
// verifies the compliance layer does not inject RR 16-2005 into an answer that
// does not already contain it.
{
  const noRRDraft = [
    "### Direct Answer",
    "VAT is imposed at 12% under Section 105 of the NIRC.",
    "",
    "### Legal Basis",
    "Section 105, NIRC.",
    "",
    "### Practical Note",
    "Registration required above PHP 3M annual threshold."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    noRRDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is VAT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("No RR 16-2005 fabricated if absent from draft", finalText, "16-2005");
  assertPresent("VAT answer preserved without RR", finalText, "12%");
}

// ── Part 7: NON-AUTHORITY_FOUND — limitation still present ───────────────────
console.log("\n=== PART 7: NON-AUTHORITY_FOUND — limitation preserved ===\n");

{
  const draft = "A. DIRECT ANSWER\nIndexed source not found.\nB. CONTROLLING LEGAL BASIS\nNo legal basis was rendered.";
  const result = ensureIndexedSourceLimitation({
    answer: draft,
    sources: [],
    context: { saeStatus: "NO_INDEXED_SOURCE" }
  });
  assertPresent("NO_INDEXED_SOURCE: Framework knowledge still injected", result, "Framework knowledge");
}

{
  const draft = "B. CONTROLLING LEGAL BASIS\nNo legal basis was rendered.";
  const result = ensureIndexedSourceLimitation({
    answer: draft,
    sources: [],
    context: { saeStatus: "RELATED_AUTHORITY_ONLY" }
  });
  assertPresent("RELATED_AUTHORITY_ONLY: Framework knowledge still injected", result, "Framework knowledge");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
