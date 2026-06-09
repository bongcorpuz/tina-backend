// PATCH-017J — Authority-Found Answer Body and Source Card Completion
// Acceptance tests for PATCH-017J behavior
// Run: node _stage017j_test.mjs

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
    console.error(`  FAIL: ${label} — "${forbidden}" is present but should be absent`);
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

// ── Part 1: ensureIndexedSourceLimitation — AUTHORITY_FOUND strips all placeholder strings ──
console.log("\n=== PART 1: ensureIndexedSourceLimitation — AUTHORITY_FOUND placeholder stripping ===\n");

{
  // Test that PATCH-017I neutral replacements are now stripped (Defect 1 fix)
  const answer = [
    "A. DIRECT ANSWER",
    "Yes, advertising services are subject to EWT under Section 57 of the NIRC.",
    "Refer to the retrieved indexed authority.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Section 57, NIRC.",
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "Refer to applicable implementing regulations.",
    "",
    "D. SUPPORTING JURISPRUDENCE",
    "See the retrieved indexed authority.",
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    "Consult the applicable provision and implementing regulation before relying on this answer."
  ].join("\n");

  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });

  assertAbsent("AUTHORITY_FOUND: 'Refer to the retrieved indexed authority' stripped", result, "Refer to the retrieved indexed authority");
  assertAbsent("AUTHORITY_FOUND: 'Refer to applicable implementing regulations' stripped", result, "Refer to applicable implementing regulations");
  assertAbsent("AUTHORITY_FOUND: 'See the retrieved indexed authority' stripped", result, "See the retrieved indexed authority");
  assertAbsent("AUTHORITY_FOUND: 'Consult the applicable provision' stripped", result, "Consult the applicable provision and implementing regulation before relying on this answer");
  assertPresent("AUTHORITY_FOUND: substantive EWT answer preserved", result, "advertising services are subject to EWT");
  assertPresent("AUTHORITY_FOUND: legal basis preserved", result, "Section 57");
}

{
  // Test defaultBodyForHeading strings are stripped
  const answer = [
    "A. DIRECT ANSWER",
    "VAT is imposed at 12% under Section 105 of the NIRC.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Refer to the relevant provision of the NIRC as amended.",
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "The implementing regulation applies. Refer to the relevant Revenue Regulation for operational details.",
    "",
    "D. SUPPORTING JURISPRUDENCE",
    "Indexed source not found.",
    "",
    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "Please refer to the applicable NIRC provision for the statutory definition.",
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    "Verify the latest indexed authority before relying on the answer."
  ].join("\n");

  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });

  assertAbsent("AUTHORITY_FOUND: 'Refer to the relevant provision of the NIRC as amended' stripped", result, "Refer to the relevant provision of the NIRC as amended");
  assertAbsent("AUTHORITY_FOUND: 'The implementing regulation applies' stripped", result, "The implementing regulation applies. Refer to the relevant Revenue Regulation");
  assertAbsent("AUTHORITY_FOUND: 'Indexed source not found' stripped", result, "Indexed source not found");
  assertAbsent("AUTHORITY_FOUND: 'Please refer to the applicable NIRC provision' stripped", result, "Please refer to the applicable NIRC provision for the statutory definition");
  assertAbsent("AUTHORITY_FOUND: 'Verify the latest indexed authority before relying' stripped", result, "Verify the latest indexed authority before relying on the answer");
  assertPresent("AUTHORITY_FOUND: VAT substantive answer preserved", result, "VAT is imposed at 12%");
}

{
  // Test remaining defaultBodyForHeading strings
  const answer = [
    "F. PRACTICAL NOTE / APPLICATION",
    "Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.",
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "Implementing regulations applicable to this provision are pending index verification.",
    "",
    "No legal basis exists.",
    "No supporting rules exist."
  ].join("\n");

  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });

  assertAbsent("AUTHORITY_FOUND: 'Verify the latest indexed authority, controlling doctrine' stripped", result, "Verify the latest indexed authority, controlling doctrine");
  assertAbsent("AUTHORITY_FOUND: 'Implementing regulations applicable to this provision are pending' stripped", result, "Implementing regulations applicable to this provision are pending index verification");
  assertAbsent("AUTHORITY_FOUND: 'No legal basis exists' stripped", result, "No legal basis exists");
  assertAbsent("AUTHORITY_FOUND: 'No supporting rules exist' stripped", result, "No supporting rules exist");
}

// ── Part 2: NON-AUTHORITY_FOUND states still inject limitation language ──────
console.log("\n=== PART 2: NON-AUTHORITY_FOUND states — limitation still present ===\n");

{
  const answer = "A. DIRECT ANSWER\nIndexed source not found.\n\nF. PRACTICAL NOTE\nVerify the latest indexed authority before relying on the answer.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "NO_INDEXED_SOURCE" }
  });
  assertPresent("NO_INDEXED_SOURCE: Framework knowledge injected for 'Indexed source not found'", result, "Framework knowledge");
}

{
  const answer = "B. CONTROLLING LEGAL BASIS\nNo legal basis was rendered.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "RELATED_AUTHORITY_ONLY" }
  });
  assertPresent("RELATED_AUTHORITY_ONLY: Framework knowledge injected for 'No legal basis was rendered'", result, "Framework knowledge");
}

{
  const answer = "C. SUPPORTING RULES\nNo supporting rules were rendered.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "RETRIEVAL_TIMEOUT" }
  });
  assertPresent("RETRIEVAL_TIMEOUT: Framework knowledge injected for 'No supporting rules were rendered'", result, "Framework knowledge");
}

// ── Part 3: enforceFinalAnswerCompliance — Test 1: VAT AUTHORITY_FOUND ────────
console.log("\n=== PART 3: enforceFinalAnswerCompliance — VAT AUTHORITY_FOUND ===\n");

{
  const draftVAT = [
    "### Direct Answer",
    "VAT is a 12% tax on sale, barter, exchange, or lease of goods or properties and on sale of services, imposed under Section 105 of the NIRC.",
    "",
    "### Legal Basis",
    "- Section 105, NIRC (imposition of VAT)",
    "- Section 106, NIRC (VAT on sale of goods)",
    "- Section 107, NIRC (VAT on importation)",
    "- Section 108, NIRC (VAT on services)",
    "- RR No. 16-2005 (implementing regulations)",
    "",
    "### Practical Explanation",
    "Refer to the retrieved indexed authority.",
    "",
    "### Practical Note",
    "Consult the applicable provision and implementing regulation before relying on this answer."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    draftVAT,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is VAT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("VAT AUTHORITY_FOUND: no 'Refer to the retrieved indexed authority'", finalText, "Refer to the retrieved indexed authority");
  assertAbsent("VAT AUTHORITY_FOUND: no 'Consult the applicable provision'", finalText, "Consult the applicable provision and implementing regulation before relying on this answer");
  assertAbsent("VAT AUTHORITY_FOUND: no Framework knowledge label", finalText, "Framework knowledge");
  assertAbsent("VAT AUTHORITY_FOUND: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertPresent("VAT AUTHORITY_FOUND: substantive answer preserved", finalText, "12%");
  assertPresent("VAT AUTHORITY_FOUND: Section 105 preserved", finalText, "105");
}

// ── Part 4: enforceFinalAnswerCompliance — Test 2: EWT AUTHORITY_FOUND ────────
console.log("\n=== PART 4: enforceFinalAnswerCompliance — EWT AUTHORITY_FOUND ===\n");

{
  const draftEWT = [
    "A. DIRECT ANSWER",
    "Yes. Advertising services are subject to Expanded Withholding Tax (EWT) under Section 57 and 58 of the NIRC, when paid by a withholding agent.",
    "Refer to the retrieved indexed authority.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Section 57, NIRC — creditable withholding at source.",
    "Section 58, NIRC — obligation of withholding agents.",
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "No supporting rules were rendered.",
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    "Consult the applicable provision and implementing regulation before relying on this answer."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    draftEWT,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "Is advertising service subject to EWT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("EWT AUTHORITY_FOUND: 'Refer to the retrieved indexed authority' stripped", finalText, "Refer to the retrieved indexed authority");
  assertAbsent("EWT AUTHORITY_FOUND: 'No supporting rules were rendered' stripped", finalText, "No supporting rules were rendered");
  assertAbsent("EWT AUTHORITY_FOUND: 'Consult the applicable provision' stripped", finalText, "Consult the applicable provision and implementing regulation before relying on this answer");
  assertAbsent("EWT AUTHORITY_FOUND: no Framework knowledge label", finalText, "Framework knowledge");
  assertAbsent("EWT AUTHORITY_FOUND: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertPresent("EWT AUTHORITY_FOUND: substantive answer preserved", finalText, "advertising services are subject to");
  assertPresent("EWT AUTHORITY_FOUND: Section 57 preserved", finalText, "57");
  assertPresent("EWT AUTHORITY_FOUND: Section 58 preserved", finalText, "58");
}

// ── Part 5: RELATED_AUTHORITY_ONLY — limitation preserved ────────────────────
console.log("\n=== PART 5: enforceFinalAnswerCompliance — RELATED_AUTHORITY_ONLY (limitation must remain) ===\n");

{
  const draftRelated = [
    "A. DIRECT ANSWER",
    "No direct governing authority was found.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "No legal basis was rendered.",
    "",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
    "Indexed source not found.",
    "",
    "F. PRACTICAL NOTE / APPLICATION",
    "Verify the latest indexed authority before relying on the answer."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    draftRelated,
    sources:        [],
    mode:           "STANDARD_TAX",
    saeStatus:      "RELATED_AUTHORITY_ONLY",
    sourceAvailability: { saeStatus: "RELATED_AUTHORITY_ONLY", limitationRequired: true },
    sourceAvailabilityMetadata: { saeStatus: "RELATED_AUTHORITY_ONLY", limitationRequired: true },
    limitationRequired: true,
    query:          "What is XYZ tax under RA 99999?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertPresent("RELATED_AUTHORITY_ONLY: Framework knowledge still injected", finalText, "Framework knowledge");
}

// ── Part 6: NO_INDEXED_SOURCE — limitation preserved ─────────────────────────
console.log("\n=== PART 6: enforceFinalAnswerCompliance — NO_INDEXED_SOURCE (limitation must remain) ===\n");

{
  const draftNoSource = [
    "A. DIRECT ANSWER",
    "Indexed source not found.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "No legal basis was rendered."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    draftNoSource,
    sources:        [],
    mode:           "STANDARD_TAX",
    saeStatus:      "NO_INDEXED_SOURCE",
    sourceAvailability: { saeStatus: "NO_INDEXED_SOURCE", limitationRequired: true },
    sourceAvailabilityMetadata: { saeStatus: "NO_INDEXED_SOURCE", limitationRequired: true },
    limitationRequired: true,
    query:          "What is obscure provision?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertPresent("NO_INDEXED_SOURCE: Framework knowledge still injected", finalText, "Framework knowledge");
}

// ── Part 7: VAT/EWT isolation — cross-contamination must not occur ────────────
console.log("\n=== PART 7: VAT/EWT authority isolation ===\n");

{
  const vatDraft = [
    "A. DIRECT ANSWER",
    "VAT is a 12% consumption tax under Section 105, NIRC.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Section 105, NIRC. Section 106, NIRC."
  ].join("\n");

  const vatResult = enforceFinalAnswerCompliance({
    draftAnswer:    vatDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is VAT?"
  });

  const vatText = vatResult?.finalAnswer || vatResult?.answer || "";
  assertAbsent("VAT answer: EWT (Section 57) not present", vatText, "Section 57");
  assertAbsent("VAT answer: EWT (Section 58) not present", vatText, "Section 58");
}

{
  const ewtDraft = [
    "A. DIRECT ANSWER",
    "Yes. Advertising services are subject to EWT under Section 57, NIRC.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "Section 57, NIRC. Section 58, NIRC."
  ].join("\n");

  const ewtResult = enforceFinalAnswerCompliance({
    draftAnswer:    ewtDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "Is advertising service subject to EWT?"
  });

  const ewtText = ewtResult?.finalAnswer || ewtResult?.answer || "";
  assertAbsent("EWT answer: VAT (Section 105) not present", ewtText, "Section 105");
  assertAbsent("EWT answer: VAT (Section 106) not present", ewtText, "Section 106");
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
