// PATCH-017I — FAST_DEFINITION Renderer Source-State Cleanup
// Acceptance tests for PATCH-017I behavior
// Run: node _stage017i_test.mjs

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
    console.error(`        Snippet: ${text.slice(0, 200)}`);
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
    console.error(`        Snippet: ${text.slice(0, 200)}`);
    failed++;
  }
}

// ── Part 1: ensureIndexedSourceLimitation — AUTHORITY_FOUND guard ─────────────
console.log("\n=== PART 1: ensureIndexedSourceLimitation — AUTHORITY_FOUND ===\n");

{
  const answer = "A. DIRECT ANSWER\nIndexed source not found.\n\nB. CONTROLLING LEGAL BASIS\nIndexed source not found.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });
  assertAbsent("AUTHORITY_FOUND: no pendingLabel injected", result, "Framework knowledge");
  assertAbsent("AUTHORITY_FOUND: no 'Indexed source not found'", result, "Indexed source not found");
  // PATCH-017J: neutral replacement strings are themselves stripped (they were Defect 1)
  assertAbsent("AUTHORITY_FOUND: neutral replacement not present (PATCH-017J)", result, "retrieved indexed authority");
}

{
  const answer = "A. DIRECT ANSWER\nNo legal basis was rendered.\n\nC. SUPPORTING RULES\nNo supporting rules were rendered.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });
  assertAbsent("AUTHORITY_FOUND: 'No legal basis was rendered' cleared", result, "Framework knowledge");
  assertAbsent("AUTHORITY_FOUND: 'No supporting rules were rendered' cleared", result, "Framework knowledge");
}

{
  const answer = "VAT is imposed under Section 105, NIRC. (Framework knowledge — pending index verification)";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "AUTHORITY_FOUND" }
  });
  // Note: ensureIndexedSourceLimitation does not strip model-output Framework knowledge labels —
  // that is handled by buildFastDefinitionAnswer's stripMechanics.
  // This test confirms the function returns without injecting NEW pendingLabel text.
  assertAbsent("AUTHORITY_FOUND: no new pendingLabel additions on clean pass", result, "Indexed source not found");
}

// ── Part 2: ensureIndexedSourceLimitation — NON-AUTHORITY_FOUND still works ──
console.log("\n=== PART 2: ensureIndexedSourceLimitation — NO_INDEXED_SOURCE ===\n");

{
  const answer = "A. DIRECT ANSWER\nIndexed source not found.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "NO_INDEXED_SOURCE" }
  });
  assertPresent("NO_INDEXED_SOURCE: pendingLabel injected for 'Indexed source not found'", result, "Framework knowledge");
}

{
  const answer = "B. CONTROLLING LEGAL BASIS\nNo legal basis was rendered.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: { saeStatus: "RELATED_AUTHORITY_ONLY" }
  });
  assertPresent("RELATED_AUTHORITY_ONLY: pendingLabel injected for 'No legal basis was rendered'", result, "Framework knowledge");
}

// ── Part 3: ensureIndexedSourceLimitation — no saeStatus (legacy path) ────────
console.log("\n=== PART 3: ensureIndexedSourceLimitation — no saeStatus ===\n");

{
  const answer = "A. DIRECT ANSWER\nIndexed source not found.";
  const result = ensureIndexedSourceLimitation({
    answer,
    sources: [],
    context: {}
  });
  assertPresent("no saeStatus: pendingLabel still injected", result, "Framework knowledge");
}

// ── Part 4: enforceFinalAnswerCompliance — AUTHORITY_FOUND + FAST_DEFINITION ──
console.log("\n=== PART 4: enforceFinalAnswerCompliance — AUTHORITY_FOUND ===\n");

{
  const draftWithFallback = `### Direct Answer
VAT is a 12% tax imposed under Section 105 of the NIRC. (Framework knowledge — pending index verification)

### Legal Basis
- Section 105, NIRC
- RR No. 16-2005

### Practical Explanation
VAT applies to every sale, barter, exchange, or lease of goods or properties.

### Practical Note
Businesses above the 3M threshold must register for VAT.`;

  const result = enforceFinalAnswerCompliance({
    draftAnswer:    draftWithFallback,
    sources:        [],
    mode:           "FAST_DEFINITION",
    saeStatus:      "AUTHORITY_FOUND",
    sourceAvailability: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    sourceAvailabilityMetadata: { saeStatus: "AUTHORITY_FOUND", limitationRequired: false },
    limitationRequired: false,
    query:          "What is VAT?"
  });

  const finalText = result?.finalAnswer || result?.answer || "";
  assertAbsent("FAST_DEFINITION AUTHORITY_FOUND: no Framework knowledge label", finalText, "Framework knowledge");
  assertAbsent("FAST_DEFINITION AUTHORITY_FOUND: no Source Verification Limitation", finalText, "Source Verification Limitation");
  assertPresent("FAST_DEFINITION AUTHORITY_FOUND: Direct Answer retained", finalText, "VAT");
}

// ── Part 5: enforceFinalAnswerCompliance — RELATED_AUTHORITY_ONLY keeps limitation ──
console.log("\n=== PART 5: enforceFinalAnswerCompliance — RELATED_AUTHORITY_ONLY (should NOT suppress) ===\n");

{
  const draftRelated = `A. DIRECT ANSWER
No direct governing authority was found. Related authority indicates VAT applies at 12%.

B. CONTROLLING LEGAL BASIS
Related authority only — a governing source was not directly located.

C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES
Indexed source not found.

D. SUPPORTING JURISPRUDENCE
Indexed source not found.

E. DOCTRINAL STATUS / CONFLICT ANALYSIS
Conflict Detected: NO
No direct doctrinal conflict established.

F. PRACTICAL NOTE / APPLICATION
Verify the latest indexed authority.`;

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
  assertPresent("RELATED_AUTHORITY_ONLY: Framework knowledge injected for placeholders", finalText, "Framework knowledge");
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
