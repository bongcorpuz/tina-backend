// PATCH-017L — FAST_EWT Answer Section Completion
// Acceptance tests for empty-heading detection, fill, and removal behavior.
// Run: node _stage017l_test.mjs

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
    console.error(`        Snippet: ${text.slice(0, 400)}`);
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
    console.error(`        Snippet: ${text.slice(0, 400)}`);
    failed++;
  }
}

// Detect "empty heading" — a heading immediately followed by blank + next heading (or end)
function hasEmptyHeading(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s+/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const nextIsHeading = j < lines.length && /^#{1,4}\s+/.test(lines[j]);
      const atEnd         = j >= lines.length;
      if (nextIsHeading || atEnd) return true;
    }
  }
  return false;
}

// ── Part 1: _applyEwtSectionCompletion017l via ensureIndexedSourceLimitation ─
console.log("\n=== PART 1: EWT empty headings filled (AUTHORITY_FOUND + EWT context) ===\n");

{
  // Simulate what PATCH-017J produces: placeholder stripped, empty headings remain
  const textWithEmptyHeadings = [
    "### Short Answer",
    "",
    "Yes, advertising services are subject to expanded withholding tax (EWT) under NIRC Sec. 57 and 58.",
    "",
    "### Controlling Authorities",
    "",
    "### Interpretation",
    "",
    "### Practical Meaning"
  ].join("\n");

  const ewtContext = {
    saeStatus: "AUTHORITY_FOUND",
    issueClassification: {
      primaryIssue: "WITHHOLDING",
      subIssue: "EWT",
      primaryDomain: "WHT"
    }
  };

  const result = ensureIndexedSourceLimitation({
    answer: textWithEmptyHeadings,
    sources: [],
    context: ewtContext
  });

  assert("EWT: no empty headings remain", !hasEmptyHeading(result),
    `Empty heading detected in:\n${result}`);
  assertPresent("EWT: Controlling Authorities section filled", result, "NIRC Sec. 57 authorizes");
  assertPresent("EWT: Interpretation section filled", result, "withholding agent to a resident income payee");
  assertPresent("EWT: Practical Meaning section filled", result, "withholds the applicable EWT");
  assertPresent("EWT: substantive Short Answer preserved", result, "advertising services are subject to");
}

{
  // Only some sections empty
  const textPartialEmpty = [
    "### Short Answer",
    "",
    "Yes, EWT applies.",
    "",
    "### Controlling Authorities",
    "",
    "### Interpretation",
    "",
    "Advertising services are creditable withholding tax transactions under RR 2-98.",
    "",
    "### Practical Meaning"
  ].join("\n");

  const ewtContext = {
    saeStatus: "AUTHORITY_FOUND",
    issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT" }
  };

  const result = ensureIndexedSourceLimitation({
    answer: textPartialEmpty,
    sources: [],
    context: ewtContext
  });

  assert("EWT partial: no empty headings remain", !hasEmptyHeading(result),
    `Empty heading in:\n${result}`);
  assertPresent("EWT partial: Controlling Authorities filled", result, "NIRC Sec. 57 authorizes");
  assertPresent("EWT partial: existing Interpretation body preserved", result, "creditable withholding tax transactions");
  assertPresent("EWT partial: Practical Meaning filled", result, "withholds the applicable EWT");
}

// ── Part 2: Non-EWT empty headings removed ────────────────────────────────────
console.log("\n=== PART 2: Non-EWT empty headings removed (AUTHORITY_FOUND, non-WHT context) ===\n");

{
  const vatTextWithEmpty = [
    "### Direct Answer",
    "",
    "VAT is a 12% tax on sale of goods, properties, and services.",
    "",
    "### Controlling Authorities",
    "",
    "### Interpretation",
    "",
    "### Practical Meaning"
  ].join("\n");

  const vatContext = {
    saeStatus: "AUTHORITY_FOUND",
    issueClassification: { primaryIssue: "VAT", subIssue: "VAT_DEFINITION" }
  };

  const result = ensureIndexedSourceLimitation({
    answer: vatTextWithEmpty,
    sources: [],
    context: vatContext
  });

  assert("VAT: no empty headings remain", !hasEmptyHeading(result),
    `Empty heading in:\n${result}`);
  assertPresent("VAT: Direct Answer preserved", result, "12%");
  // EWT fill text must NOT appear in VAT answers
  assertAbsent("VAT: no EWT fill text injected", result, "NIRC Sec. 57 authorizes");
  assertAbsent("VAT: no withholding agent fill injected", result, "withholding agent to a resident income payee");
}

// ── Part 3: Test 1 — EWT rate query via /ask BASIC_RESEARCH profile ──────────
// This is the actual EWT empty-heading scenario: /ask profile mode preserves
// the draft section headings (no buildFastDefinitionAnswer() reformatting) and
// PATCH-017J strips their placeholder bodies, leaving empty headings.
console.log("\n=== PART 3: Test 1 — EWT advertising rate query (/ask BASIC_RESEARCH) ===\n");

{
  // Draft format for /ask BASIC_RESEARCH: Short Answer, Controlling Authorities,
  // Interpretation, Practical Meaning — each body has placeholder text stripped by PATCH-017J
  const ewtRateDraft = [
    "### Short Answer",
    "",
    "Advertising agencies are subject to expanded withholding tax (EWT) under NIRC Sec. 57 and 58. The applicable rate depends on the specific income classification and withholding tax regulation.",
    "",
    "### Controlling Authorities",
    "",
    "Indexed source not found.",
    "",
    "### Interpretation",
    "",
    "Indexed source not found.",
    "",
    "### Practical Meaning",
    "",
    "Consult the applicable provision and implementing regulation before relying on this answer."
  ].join("\n");

  // Route through enforceAskProfileCompliance (preserves section headings as-is,
  // no buildFastDefinitionAnswer() transformation)
  const result = enforceFinalAnswerCompliance({
    draftAnswer:    ewtRateDraft,
    sources:        [],
    responsePlan:   { askProfile: "BASIC_RESEARCH" },
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT", primaryDomain: "WHT" },
    query:          "What is the EWT rate for advertising agencies?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assert("EWT rate: no empty headings", !hasEmptyHeading(finalText),
    `Empty heading in:\n${finalText}`);
  assertAbsent("EWT rate: no placeholder text", finalText, "Indexed source not found");
  assertAbsent("EWT rate: no 'Consult applicable provision'", finalText,
    "Consult the applicable provision and implementing regulation");
  assertAbsent("EWT rate: no Framework knowledge", finalText, "Framework knowledge");
  assertAbsent("EWT rate: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertPresent("EWT rate: substantive answer preserved", finalText, "advertising agenc");
  assertPresent("EWT rate: Controlling Authorities filled with Sec. 57", finalText, "NIRC Sec. 57 authorizes");
  assertPresent("EWT rate: Interpretation filled", finalText, "withholding agent to a resident income payee");
  assertPresent("EWT rate: Practical Meaning filled", finalText, "withholds the applicable EWT");
}

// ── Part 4: Test 2 — "Is advertising service subject to EWT?" (/ask) ─────────
console.log("\n=== PART 4: Test 2 — Is advertising service subject to EWT? (/ask) ===\n");

{
  const ewtSubjectDraft = [
    "### Short Answer",
    "",
    "Yes. Advertising services rendered to withholding agents are subject to EWT under NIRC Sec. 57.",
    "",
    "### Controlling Authorities",
    "",
    "No legal basis was rendered.",
    "",
    "### Interpretation",
    "",
    "No supporting rules were rendered.",
    "",
    "### Practical Meaning",
    "",
    "Verify the latest indexed authority before relying on the answer."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    ewtSubjectDraft,
    sources:        [],
    responsePlan:   { askProfile: "BASIC_RESEARCH" },
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT" },
    query:          "Is advertising service subject to EWT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assert("EWT subject: no empty headings", !hasEmptyHeading(finalText),
    `Empty heading in:\n${finalText}`);
  assertPresent("EWT subject: Short Answer preserved", finalText, "advertising services");
  assertPresent("EWT subject: Controlling Authorities filled", finalText, "NIRC Sec. 57 authorizes");
  assertAbsent("EWT subject: no Framework knowledge", finalText, "Framework knowledge");
}

// ── Part 4b: FAST_DEFINITION EWT — Legal Basis / Practical Note sections ──────
// FAST_DEFINITION mode produces ### Legal Basis, ### Practical Explanation,
// ### Practical Note. The PATCH-017J fallback stripping leaves them empty;
// PATCH-017L must fill them.
console.log("\n=== PART 4b: FAST_DEFINITION EWT — empty section fill ===\n");

{
  // Simulate post-buildFastDefinitionAnswer + post-PATCH-017J output: headings with
  // no body (fallback strings stripped). Test that PATCH-017L fills them.
  const fastDefEmptyHeadings = [
    "### Direct Answer",
    "",
    "Yes, advertising services are subject to EWT under NIRC Sec. 57.",
    "",
    "### Legal Basis",
    "",
    "### Practical Explanation",
    "",
    "### Practical Note"
  ].join("\n");

  const result = ensureIndexedSourceLimitation({
    answer: fastDefEmptyHeadings,
    sources: [],
    context: {
      saeStatus: "AUTHORITY_FOUND",
      issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT" }
    }
  });

  assert("FAST_DEF EWT: no empty headings", !hasEmptyHeading(result),
    `Empty heading in:\n${result}`);
  assertPresent("FAST_DEF EWT: Legal Basis filled", result, "NIRC Sec. 57 and Sec. 58");
  assertPresent("FAST_DEF EWT: Practical Explanation filled", result, "withholding agents are required");
  assertPresent("FAST_DEF EWT: Practical Note filled", result, "applicable ewt rate");
  assertPresent("FAST_DEF EWT: Direct Answer preserved", result, "advertising services are subject to EWT");
}

// ── Part 5: Test 3 — VAT regression ───────────────────────────────────────────
console.log("\n=== PART 5: Test 3 — VAT regression ===\n");

{
  const vatDraft = [
    "### Direct Answer",
    "",
    "VAT is a 12% consumption tax imposed under NIRC Sec. 105.",
    "",
    "### Legal Basis",
    "",
    "Section 105, NIRC — imposition of VAT.",
    "Section 106, NIRC — VAT on goods.",
    "RR No. 16-2005 — VAT implementing regulations.",
    "",
    "### Practical Note",
    "",
    "Businesses above the PHP 3M threshold must register for VAT."
  ].join("\n");

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    vatDraft,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    issueClassification: { primaryIssue: "VAT", subIssue: "VAT_DEFINITION" },
    query:          "What is VAT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertPresent("VAT: substantive answer preserved", finalText, "12%");
  assertAbsent("VAT: no EWT fill text injected", finalText, "NIRC Sec. 57 authorizes");
  assertAbsent("VAT: no withholding agent fill", finalText, "withholding agent to a resident income payee");
  assertAbsent("VAT: no EWT practical meaning fill", finalText, "withholds the applicable EWT");
  assertAbsent("VAT: no Framework knowledge", finalText, "Framework knowledge");
  assertAbsent("VAT: no Source Verification Limitation", finalText, "Source Verification Limitation");
}

// ── Part 6: Test 4 — NO_INDEXED_SOURCE (limitation preserved) ─────────────────
console.log("\n=== PART 6: Test 4 — NO_INDEXED_SOURCE limitation preserved ===\n");

{
  const draft = [
    "A. DIRECT ANSWER",
    "Indexed source not found.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "No legal basis was rendered."
  ].join("\n");

  const result = ensureIndexedSourceLimitation({
    answer: draft,
    sources: [],
    context: {
      saeStatus: "NO_INDEXED_SOURCE",
      issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT" }
    }
  });

  assertPresent("NO_INDEXED_SOURCE EWT: Framework knowledge still injected", result, "Framework knowledge");
  assertAbsent("NO_INDEXED_SOURCE: no EWT section fill applied", result, "NIRC Sec. 57 authorizes");
}

// ── Part 7: Test 5 — RELATED_AUTHORITY_ONLY (limitation preserved) ─────────────
console.log("\n=== PART 7: Test 5 — RELATED_AUTHORITY_ONLY limitation preserved ===\n");

{
  const draft = "B. CONTROLLING LEGAL BASIS\nNo legal basis was rendered.";
  const result = ensureIndexedSourceLimitation({
    answer: draft,
    sources: [],
    context: {
      saeStatus: "RELATED_AUTHORITY_ONLY",
      issueClassification: { primaryIssue: "WITHHOLDING" }
    }
  });
  assertPresent("RELATED_AUTHORITY_ONLY: Framework knowledge injected", result, "Framework knowledge");
  assertAbsent("RELATED_AUTHORITY_ONLY: no EWT fill", result, "NIRC Sec. 57 authorizes");
}

// ── Part 8: No unsupported rate hard-coded by the patch ───────────────────────
console.log("\n=== PART 8: No rate fabrication by patch fill text ===\n");

{
  const ewtCtx = {
    saeStatus: "AUTHORITY_FOUND",
    issueClassification: { primaryIssue: "WITHHOLDING", subIssue: "EWT" }
  };
  const emptyEWT = [
    "### Short Answer",
    "EWT applies to advertising agencies.",
    "",
    "### Controlling Authorities",
    "",
    "### Interpretation",
    "",
    "### Practical Meaning"
  ].join("\n");

  const result = ensureIndexedSourceLimitation({ answer: emptyEWT, sources: [], context: ewtCtx });

  // The patch fill text must NOT hard-code any specific rate like "2%" or "10%"
  // (rates come from retrieved source, not patch-injected text)
  assertAbsent("Patch fill: no rate hard-coded (2%)", result, "2%");
  assertAbsent("Patch fill: no rate hard-coded (10%)", result, "10%");
  assertPresent("Patch fill: uses 'applicable EWT' (rate-agnostic)", result, "applicable ewt");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
