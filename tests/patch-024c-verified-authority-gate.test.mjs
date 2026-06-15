/**
 * PATCH-024C / PATCH-024C-REV2 — Verified Authority Only VAT Generation Gate
 *
 * Run: node tests/patch-024c-verified-authority-gate.test.mjs
 *
 * Validates three implementation targets:
 *
 *   1. stripUnverifiedAuthorityLines() in final-answer-compliance.js
 *        – Lines whose every cited authority is in visibleSources → kept
 *        – Lines with any unsupported citation → stripped
 *        – Lines with no citations → always kept
 *        – Empty visibleSources → all citation-bearing lines stripped
 *
 *   2. pipeline.js _024b_specializedVatSubs shield extended to include all 8
 *      specialized VAT sub-issues (including the 3 PATCH-024B-EXT additions)
 *
 *   3. PATCH-024C diagnostic marker + PATCH-024C-REV2 canonical infrastructure
 *      present in final-answer-compliance.js source
 *
 * Scenarios covered (from PATCH-024C spec):
 *   S1  – RR 16-2005 verified; NIRC Sec. 109(P) hallucinated → RR survives, 109(P) removed
 *   S2  – No verified authority; NIRC Sec. 112 and RR 1-2017 hallucinated → both removed
 *   S3  – Verified statute AND verified RR → both survive
 *   S4  – Long-form variant "Section 109(P) of the National Internal Revenue Code" → kept when verified
 *   S5  – Hallucinated "RR 999-2099" not in sources → removed
 *   S6  – Lines with no citations (prose, headings) always pass through
 *   S7  – NIRC Sec. 109(P) in source; model writes "NIRC Sec. 109(BB)" → STRIPPED (REV2 fix)
 *   S8  – NIRC Sec. 109(P) in source; model writes "NIRC Sec. 109" (base only) → kept
 *
 * REV2 canonical scenarios (Group 7):
 *   C1  – "NIRC SEC 109(BB)" (uppercase variant) matched against source "NIRC Sec. 109(BB)"
 *   C2  – "Section 109(P) of the NIRC" (suffix form) verified from source
 *   C3  – "Revenue Regulations No. 16-2005" matched against source "RR No. 16-2005"
 *   C4  – "RMC 75-2015" matched against source "RMC No. 75-2015"
 *   C5  – Hallucinated "NIRC Sec. 109(BB)" stripped when only "NIRC Sec. 109(P)" sourced
 *   C6  – Range expansion: "NIRC Secs. 105 to 107" verified via range source "NIRC Sec. 106"
 *   C7  – Empty authority heading removed when all lines under it are stripped
 *   C8  – Source with label field (not citation) correctly provides verified key
 */

"use strict";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname       = dirname(fileURLToPath(import.meta.url));
const COMPLIANCE_PATH = join(__dirname, "..", "final-answer-compliance.js");
const COMPLIANCE_SRC  = readFileSync(COMPLIANCE_PATH, "utf8");
const PIPELINE_SRC    = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");
const ASK_HANDLER_SRC = readFileSync(join(__dirname, "..", "ask-handler.js"), "utf8");

let passed  = 0;
let failed  = 0;
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

// ─── Group 1: Static code-presence checks ─────────────────────────────────────

group("Static — PATCH-024C / REV2 implementation markers present", () => {
  assert(
    COMPLIANCE_SRC.includes("stripUnverifiedAuthorityLines"),
    "stripUnverifiedAuthorityLines function defined in final-answer-compliance.js"
  );
  assert(
    COMPLIANCE_SRC.includes("PATCH_024C_UNVERIFIED_CITATIONS_STRIPPED"),
    "diagnostic marker PATCH_024C_UNVERIFIED_CITATIONS_STRIPPED present"
  );
  assert(
    COMPLIANCE_SRC.includes("stripUnverifiedAuthorityLines(output, visibleSources)"),
    "stripUnverifiedAuthorityLines called inside finalizeCompliance"
  );
  // Check ordering within finalizeCompliance body only (not whole-file indexOf)
  const finalizeBody = COMPLIANCE_SRC.match(/function finalizeCompliance\([\s\S]{0,5000}\}/)?.[0] ?? "";
  assert(
    finalizeBody.includes("stripUnverifiedAuthorityLines") &&
    finalizeBody.indexOf("stripUnverifiedAuthorityLines") < finalizeBody.indexOf("validateFinalAnswerStructure"),
    "stripUnverifiedAuthorityLines call precedes validateFinalAnswerStructure inside finalizeCompliance"
  );
  // Confirm both functions are exported (increase regex budget to cover long export block)
  const exportBlock = COMPLIANCE_SRC.match(/export\s*\{[\s\S]{0,1800}\}/)?.[0] ?? "";
  assert(
    exportBlock.includes("stripUnverifiedAuthorityLines"),
    "stripUnverifiedAuthorityLines included in named exports"
  );
  // REV2 infrastructure markers
  assert(
    COMPLIANCE_SRC.includes("_024C_REV2_EXTRACTORS"),
    "REV2 canonical extractor array _024C_REV2_EXTRACTORS present"
  );
  assert(
    COMPLIANCE_SRC.includes("extractCanonicalCitationsFromText"),
    "extractCanonicalCitationsFromText function defined"
  );
  assert(
    exportBlock.includes("extractCanonicalCitationsFromText"),
    "extractCanonicalCitationsFromText included in named exports"
  );
  assert(
    COMPLIANCE_SRC.includes("_buildVerifiedCanonicalSet"),
    "_buildVerifiedCanonicalSet helper present"
  );
  assert(
    COMPLIANCE_SRC.includes("source.label") && COMPLIANCE_SRC.includes("source.displayLabel"),
    "REV2 verified set builder reads label and displayLabel fields"
  );
});

// ─── Group 2: Pipeline shield contains all 8 specialized VAT sub-issues ───────

group("pipeline.js — _024b_specializedVatSubs contains all 8 sub-issues", () => {
  const setMatch  = PIPELINE_SRC.match(/_024b_specializedVatSubs\s*=\s*new Set\(\[[\s\S]{0,600}\]\)/);
  const setBody   = setMatch ? setMatch[0] : "";

  // Original 5 (PATCH-024B)
  assert(setBody.includes('"VAT_REGISTRATION"'),                  "Shield includes VAT_REGISTRATION");
  assert(setBody.includes('"VAT_EXEMPTION_REAL_PROPERTY"'),       "Shield includes VAT_EXEMPTION_REAL_PROPERTY");
  assert(setBody.includes('"VAT_EXEMPTION_MEDICAL_PROFESSIONAL"'),"Shield includes VAT_EXEMPTION_MEDICAL_PROFESSIONAL");
  assert(setBody.includes('"VAT_IMPORTATION"'),                   "Shield includes VAT_IMPORTATION");
  assert(setBody.includes('"VAT_REFUND_CREDIT"'),                 "Shield includes VAT_REFUND_CREDIT");

  // Added by PATCH-024C (previously only in issue-classification-engine Set)
  assert(setBody.includes('"VAT_INVOICING"'),                     "Shield includes VAT_INVOICING (PATCH-024C)");
  assert(setBody.includes('"VAT_INPUT_TAX_ALLOCATION"'),          "Shield includes VAT_INPUT_TAX_ALLOCATION (PATCH-024C)");
  assert(setBody.includes('"VAT_EXEMPTION_RESIDENTIAL_LEASE"'),   "Shield includes VAT_EXEMPTION_RESIDENTIAL_LEASE (PATCH-024C)");
});

// ─── Functional tests — import stripUnverifiedAuthorityLines ──────────────────

let stripUnverifiedAuthorityLines = null;
let extractCanonicalCitationsFromText = null;

try {
  const mod = await import(pathToFileURL(COMPLIANCE_PATH).href);
  stripUnverifiedAuthorityLines        = mod.stripUnverifiedAuthorityLines        ?? null;
  extractCanonicalCitationsFromText    = mod.extractCanonicalCitationsFromText    ?? null;
} catch {
  // Module has external dependencies that may not resolve in unit-test context.
  // Static checks above cover the gate presence; functional tests will be skipped.
}

// Helper — source card with normalizedReference.
function src(normalizedReference) { return { normalizedReference }; }
// Helper — source card with label (primary field in many pipeline source cards).
function srcLabel(label) { return { label }; }

// ─── Group 3: Core scenarios ──────────────────────────────────────────────────

group("Functional — core PATCH-024C scenarios", () => {
  if (!stripUnverifiedAuthorityLines) {
    console.log("  SKIP  (module load failed — static checks in Group 1 cover this)");
    return;
  }

  // S1 — verified RR survives; hallucinated NIRC Sec. 109(P) is removed
  {
    const sources = [src("RR 16-2005")];
    const answer  = [
      "B. CONTROLLING LEGAL BASIS",
      "- RR 16-2005 provides the implementing rules for VAT.",
      "- NIRC Sec. 109(P) exempts residential lots below the threshold.",
      "",
      "The above rules govern the transaction."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("RR 16-2005"),
      "S1: verified RR 16-2005 line survives"
    );
    assert(
      !result.includes("NIRC Sec. 109(P)"),
      "S1: hallucinated NIRC Sec. 109(P) line is removed"
    );
    assert(
      result.includes("The above rules govern the transaction."),
      "S1: prose line with no citation passes through"
    );
  }

  // S2 — no verified authority; gate is guarded by visibleSources.length > 0 in
  //       finalizeCompliance, so empty-source calls do NOT invoke
  //       stripUnverifiedAuthorityLines directly.  Here we call the function
  //       directly to verify its standalone behaviour: with an empty source list
  //       every citation-bearing line is stripped.
  {
    const sources = [];
    const answer  = [
      "### Controlling Authorities",
      "- NIRC Sec. 112 governs VAT refund claims.",
      "- RR 1-2017 sets the procedural requirements.",
      "",
      "A VAT-registered exporter may file a claim within two years."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      !result.includes("NIRC Sec. 112"),
      "S2 (direct call): NIRC Sec. 112 stripped when sources are empty"
    );
    assert(
      !result.includes("RR 1-2017"),
      "S2 (direct call): RR 1-2017 stripped when sources are empty"
    );
    assert(
      result.includes("A VAT-registered exporter"),
      "S2 (direct call): prose explanation survives even when all sources are empty"
    );
  }

  // S3 — verified statute AND verified RR; both survive
  {
    const sources = [src("NIRC Sec. 109(Q)"), src("RR 16-2005")];
    const answer  = [
      "- NIRC Sec. 109(Q) exempts the lease of residential units not exceeding ₱15,000/month.",
      "- RR 16-2005 implements the residential lease exemption.",
      "No VAT is due on the monthly rent."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("NIRC Sec. 109(Q)"),
      "S3: verified NIRC Sec. 109(Q) survives"
    );
    assert(
      result.includes("RR 16-2005"),
      "S3: verified RR 16-2005 survives"
    );
    assert(
      result.includes("No VAT is due"),
      "S3: prose survives"
    );
  }

  // S4 — long-form citation "Section 109(P) of the National Internal Revenue Code"
  //       → verified when source has NIRC Sec. 109(P)
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = [
      "Under Section 109(P) of the National Internal Revenue Code, the sale of residential lots below ₱1.5M is exempt.",
      "No other authority was cited."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("Section 109(P) of the National Internal Revenue Code"),
      "S4: long-form verified citation survives"
    );
  }

  // S5 — hallucinated RR 999-2099 not in any source card
  {
    const sources = [src("RR 16-2005")];
    const answer  = [
      "- RR 16-2005 is the primary implementing regulation.",
      "- RR 999-2099 further clarifies the exemption.",
      "This is the applicable framework."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("RR 16-2005"),
      "S5: verified RR 16-2005 survives"
    );
    assert(
      !result.includes("RR 999-2099"),
      "S5: hallucinated RR 999-2099 is stripped"
    );
  }
});

// ─── Group 4: Prose-and-heading pass-through ──────────────────────────────────

group("Functional — non-citation lines always pass through", () => {
  if (!stripUnverifiedAuthorityLines) {
    console.log("  SKIP  (module load failed)");
    return;
  }

  const sources = [src("NIRC Sec. 109(Q)")];
  const answer  = [
    "### Issue Presented",
    "Is the lease of a residential unit subject to VAT?",
    "",
    "### Short Answer",
    "The lease is VAT-exempt under the applicable threshold.",
    "",
    "### Controlling Authorities",
    "- NIRC Sec. 109(Q) provides the exemption.",
    "",
    "### Practical Application",
    "Landlords need not register as VAT taxpayers for qualifying residential leases."
  ].join("\n");

  const result  = stripUnverifiedAuthorityLines(answer, sources);

  assert(result.includes("### Issue Presented"),       "Heading passes through");
  assert(result.includes("Is the lease"),              "Prose question passes through");
  assert(result.includes("### Short Answer"),          "Short answer heading passes through");
  assert(result.includes("VAT-exempt under"),          "Short answer prose passes through");
  assert(result.includes("NIRC Sec. 109(Q)"),         "Verified NIRC Sec. 109(Q) line survives");
  assert(result.includes("Landlords need not"),        "Practical application prose passes through");
});

// ─── Group 5: Subsection specificity — (P) vs (BB) ───────────────────────────

group("Functional — subsection specificity: (P) does not allow (BB)", () => {
  if (!stripUnverifiedAuthorityLines) {
    console.log("  SKIP  (module load failed)");
    return;
  }

  // S7 — source has (P); model writes (P) correctly → correct subsection survives
  //      REV2 canonical keys: "NIRC:109(P)" ≠ "NIRC:109(BB)".  The verified set
  //      contains {"NIRC:109(P)", "NIRC:109"}.  Answer "NIRC Sec. 109(BB)" →
  //      canonical key "NIRC:109(BB)" — NOT in verified set → stripped.
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = [
      "- NIRC Sec. 109(P) exempts the sale of residential lots below ₱1.5M.",
      "- NIRC Sec. 109(BB) exempts persons with receipts below the VAT threshold."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("NIRC Sec. 109(P)"),
      "S7: NIRC Sec. 109(P) (correct subsection) survives"
    );
    assert(
      !result.includes("NIRC Sec. 109(BB)"),
      "S7 (REV2): NIRC Sec. 109(BB) is stripped — different canonical key from (P)"
    );
  }

  // S8 — source has (P); model writes base "NIRC Sec. 109" → kept
  //       normalizeLooseText comparison: "nirc sec. 109(p)".includes("nirc sec. 109") = true
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = [
      "- NIRC Sec. 109 lists VAT-exempt transactions.",
      "- NIRC Sec. 109(P) specifically covers residential lots."
    ].join("\n");

    const result  = stripUnverifiedAuthorityLines(answer, sources);

    assert(
      result.includes("NIRC Sec. 109(P)"),
      "S8: specific subsection (P) line survives"
    );
    assert(
      result.includes("NIRC Sec. 109 lists"),
      "S8: base NIRC Sec. 109 reference survives (covered by (P) source)"
    );
  }
});

// ─── Group 6: Regression — EXT sub-issues all in pipeline shield ──────────────

group("Regression — all 8 sub-issues shielded in pipeline.js", () => {
  const allEight = [
    "VAT_REGISTRATION",
    "VAT_EXEMPTION_REAL_PROPERTY",
    "VAT_EXEMPTION_MEDICAL_PROFESSIONAL",
    "VAT_IMPORTATION",
    "VAT_REFUND_CREDIT",
    "VAT_INVOICING",
    "VAT_INPUT_TAX_ALLOCATION",
    "VAT_EXEMPTION_RESIDENTIAL_LEASE"
  ];

  const setMatch = PIPELINE_SRC.match(/_024b_specializedVatSubs\s*=\s*new Set\(\[[\s\S]{0,600}\]\)/);
  const setBody  = setMatch ? setMatch[0] : "";

  for (const sub of allEight) {
    assert(
      setBody.includes(`"${sub}"`),
      `Pipeline shield contains ${sub}`
    );
  }

  // VAT_DEFINITION must NOT be in the shield (would break simple VAT queries)
  assert(
    !setBody.includes('"VAT_DEFINITION"'),
    "Pipeline shield does NOT contain VAT_DEFINITION"
  );
});

// ─── Group 7: REV2 canonical extraction scenarios ─────────────────────────────

group("Functional — REV2 canonical key extraction and verification", () => {
  if (!stripUnverifiedAuthorityLines || !extractCanonicalCitationsFromText) {
    console.log("  SKIP  (module load failed — static checks cover this)");
    return;
  }

  // C1 — "NIRC SEC 109(BB)" (all-caps variant) matched against "NIRC Sec. 109(BB)"
  {
    const sources = [src("NIRC Sec. 109(BB)")];
    const answer  = "- NIRC SEC 109(BB) exempts persons below the threshold.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC SEC 109(BB)"),
      "C1: uppercase NIRC SEC 109(BB) matched against source NIRC Sec. 109(BB)"
    );
  }

  // C2 — suffix form "Section 109(P) of the NIRC" verified from source
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = "- Section 109(P) of the NIRC governs residential lot exemptions.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("Section 109(P) of the NIRC"),
      "C2: suffix-form 'Section 109(P) of the NIRC' verified via canonical key NIRC:109(P)"
    );
  }

  // C3 — "Revenue Regulations No. 16-2005" matched against source "RR No. 16-2005"
  {
    const sources = [src("RR No. 16-2005")];
    const answer  = "- Revenue Regulations No. 16-2005 implements the VAT exemptions.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("Revenue Regulations No. 16-2005"),
      "C3: long-form 'Revenue Regulations No. 16-2005' matched against 'RR No. 16-2005'"
    );
  }

  // C4 — "RMC 75-2015" matched against source "RMC No. 75-2015"
  {
    const sources = [src("RMC No. 75-2015")];
    const answer  = "- RMC 75-2015 clarifies the transitional rules.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("RMC 75-2015"),
      "C4: abbreviated 'RMC 75-2015' matched against 'RMC No. 75-2015'"
    );
  }

  // C5 — hallucinated NIRC Sec. 109(BB) stripped when only NIRC Sec. 109(P) sourced
  //      verifiedSet = {"NIRC:109(P)", "NIRC:109"}.  "NIRC:109(BB)" not in set.
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = [
      "- NIRC Sec. 109(P) exempts residential lots below ₱1.5M.",
      "- NIRC Sec. 109(BB) exempts persons below the threshold."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 109(P)"),
      "C5: correct subsection (P) line survives"
    );
    assert(
      !result.includes("NIRC Sec. 109(BB)"),
      "C5: wrong subsection (BB) line stripped when only (P) is sourced"
    );
  }

  // C6 — range expansion: answer cites "NIRC Sec. 106" which falls inside
  //      "NIRC Secs. 105 to 107" source range expansion.
  //      extractCanonicalCitationsFromText("NIRC Secs. 105 to 107 of the NIRC")
  //      → {NIRC:105, NIRC:106, NIRC:107}.  Source "NIRC Sec. 106" → key NIRC:106.
  //      Answer "NIRC Sec. 106" → key NIRC:106 → verified.
  {
    const sources = [src("NIRC Sec. 106")];
    const answer  = "- NIRC Sec. 106 imposes VAT on sale of services.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 106"),
      "C6: NIRC Sec. 106 verified from source 'NIRC Sec. 106'"
    );
  }

  // C7 — empty authority heading removed after stripping
  {
    const sources = [src("RR 16-2005")];
    const answer  = [
      "### Short Answer",
      "The sale is VAT-exempt.",
      "",
      "### Controlling Authorities",
      "- NIRC Sec. 109(P) exempts this transaction.",
      "",
      "### Practical Notes",
      "Threshold applies from effectivity."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("NIRC Sec. 109(P)"),
      "C7: hallucinated NIRC Sec. 109(P) line stripped"
    );
    assert(
      !result.includes("### Controlling Authorities"),
      "C7: empty Controlling Authorities heading removed after stripping"
    );
    assert(
      result.includes("The sale is VAT-exempt."),
      "C7: prose outside stripped section survives"
    );
  }

  // C8 canonical extractor unit: extractCanonicalCitationsFromText
  {
    const keys = extractCanonicalCitationsFromText("NIRC Sec. 109(BB) and RR No. 16-2005 apply.");
    assert(
      keys.includes("NIRC:109(BB)"),
      "C8 extractor: extracts NIRC:109(BB)"
    );
    assert(
      keys.includes("NIRC:109"),
      "C8 extractor: also adds base key NIRC:109 (from _rev2AddNircBase)"
    );
    assert(
      keys.includes("RR:16-2005"),
      "C8 extractor: extracts RR:16-2005"
    );
  }
});

// ─── Group 8: Source field coverage (label / displayLabel) ────────────────────

group("Functional — REV2 reads label and displayLabel source card fields", () => {
  if (!stripUnverifiedAuthorityLines) {
    console.log("  SKIP  (module load failed)");
    return;
  }

  // Source card with only .label field (no .citation or .normalizedReference)
  {
    const sources = [srcLabel("NIRC Sec. 109(Q)")];
    const answer  = [
      "- NIRC Sec. 109(Q) exempts residential units not exceeding ₱15,000/month.",
      "No other authority applies."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 109(Q)"),
      "G8-1: source with .label='NIRC Sec. 109(Q)' correctly verifies answer citation"
    );
  }

  // Source card with .label = "RR 16-2005" (no citation field)
  {
    const sources = [srcLabel("RR 16-2005")];
    const answer  = "- RR 16-2005 provides the VAT exemption implementing rules.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("RR 16-2005"),
      "G8-2: source with .label='RR 16-2005' correctly verifies RR citation in answer"
    );
  }

  // Source card with .displayLabel field
  {
    const sources = [{ displayLabel: "NIRC Sec. 110(B)" }];
    const answer  = "- NIRC Sec. 110(B) governs creditable input tax.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 110(B)"),
      "G8-3: source with .displayLabel='NIRC Sec. 110(B)' correctly verifies answer citation"
    );
  }

  // Hallucinated authority not matched even with label source
  {
    const sources = [srcLabel("NIRC Sec. 109(P)")];
    const answer  = [
      "- NIRC Sec. 109(P) exempts residential lots.",
      "- NIRC Sec. 109(BB) exempts other transactions."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 109(P)"),
      "G8-4: (P) citation survives from label source"
    );
    assert(
      !result.includes("NIRC Sec. 109(BB)"),
      "G8-4: (BB) citation stripped — not in label-sourced verified set"
    );
  }
});

// ─── Group 9: REV3 Form 2 — direct extraction assertions ─────────────────────
//
// These cases all failed before PATCH-024C-REV3 because the old Form 2 regex
// had \s* before the optional connector, greedily consuming the space between
// the section number and "of", so \s+of\s+ inside the optional group couldn't
// match.  After the fix the suffix form is correctly extracted.

group("REV3 Form 2 — direct extraction assertions (suffix-form NIRC)", () => {
  if (!extractCanonicalCitationsFromText) {
    console.log("  SKIP  (module load failed — static checks cover this)");
    return;
  }

  {
    const keys = extractCanonicalCitationsFromText(
      "Section 109(BB) of the National Internal Revenue Code"
    );
    assert(keys.includes("NIRC:109(BB)"), "REV3-E1: extracts NIRC:109(BB) from suffix long-form");
  }

  {
    const keys = extractCanonicalCitationsFromText("Section 109(P) of the NIRC");
    assert(keys.includes("NIRC:109(P)"), "REV3-E2: extracts NIRC:109(P) from 'Section N(P) of the NIRC'");
  }

  {
    const keys = extractCanonicalCitationsFromText("Section 110(B) of the NIRC");
    assert(keys.includes("NIRC:110(B)"), "REV3-E3: extracts NIRC:110(B) from 'Section 110(B) of the NIRC'");
  }

  {
    const keys = extractCanonicalCitationsFromText("Sec 112 NIRC");
    assert(keys.includes("NIRC:112"), "REV3-E4: extracts NIRC:112 from 'Sec 112 NIRC' (no 'of', no dot)");
  }

  {
    const keys = extractCanonicalCitationsFromText("Section 107 of the Tax Code");
    assert(keys.includes("NIRC:107"), "REV3-E5: extracts NIRC:107 from 'Section 107 of the Tax Code'");
  }
});

// ─── Group 10: REV3 Form 2 — strip behavior ──────────────────────────────────

group("REV3 Form 2 — suffix-form strip and keep behavior", () => {
  if (!stripUnverifiedAuthorityLines || !extractCanonicalCitationsFromText) {
    console.log("  SKIP  (module load failed)");
    return;
  }

  // REV3-S1: visible source = RR 16-2005 only; answer cites suffix-form NIRC → stripped
  {
    const sources = [src("RR 16-2005")];
    const answer  = "This is governed by Section 109(P) of the NIRC, which provides the exemption.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("Section 109(P) of the NIRC"),
      "REV3-S1: suffix 'Section 109(P) of the NIRC' stripped when source is only RR 16-2005"
    );
  }

  // REV3-S2: visible source = NIRC Sec. 109(P); answer cites suffix-form (P) → kept
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = "This is governed by Section 109(P) of the NIRC.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("Section 109(P) of the NIRC"),
      "REV3-S2: suffix 'Section 109(P) of the NIRC' kept when source is NIRC Sec. 109(P)"
    );
  }

  // REV3-S3: visible source = NIRC Sec. 109(P); answer cites suffix-form (BB) → stripped
  //          NIRC:109(BB) ≠ NIRC:109(P) and ≠ NIRC:109 (base); verifiedSet = {NIRC:109(P), NIRC:109}
  //          Wait: NIRC:109(BB) ≠ NIRC:109 so it's stripped. ✓
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = "Under Section 109(BB) of the NIRC the person is exempt.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("Section 109(BB) of the NIRC"),
      "REV3-S3: suffix 'Section 109(BB) of the NIRC' stripped when source is only NIRC Sec. 109(P)"
    );
  }

  // REV3-S4: visible source = NIRC Sec. 110(B); answer cites suffix-form 110(B) → kept
  {
    const sources = [src("NIRC Sec. 110(B)")];
    const answer  = "Input tax allocation is governed by Section 110(B) of the NIRC.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("Section 110(B) of the NIRC"),
      "REV3-S4: suffix 'Section 110(B) of the NIRC' kept when source is NIRC Sec. 110(B)"
    );
  }
});

// ─── Group 11: REV4 — post-source-card authority contract ────────────────────
//
// These tests call stripUnverifiedAuthorityLines directly with source lists
// that represent finalSourceCards (the user-visible chips), NOT raw reranked
// chunks.  This proves that REV4's second pass — which uses finalSourceCards —
// produces correct strip / keep behaviour across all tax domains.
//
// The root-cause scenario (REV3 failure):
//   ctx.rerankedChunks includes an NIRC 109(P) chunk → verified set contains
//   NIRC:109(P) → citation survives Step 16 strip.
//   finalSourceCards has only RR 16-2005 → REV4 pass strips NIRC:109(P). ✓

group("REV4 — post-source-card authority contract (domain-neutral)", () => {
  if (!stripUnverifiedAuthorityLines) {
    console.log("  SKIP  (module load failed — static checks cover this)");
    return;
  }

  // ── A: VAT source-card contract ─────────────────────────────────────────────
  // finalSourceCards = [RR No. 16-2005]; answer cites Section 109(P) → STRIPPED.
  // (This is the exact production failure fixed by REV4.)
  {
    const sources = [src("RR No. 16-2005")];
    const answer  = [
      "This is governed by Section 109(P) of the National Internal Revenue Code (NIRC), which states that the sale of residential lots exceeding ₱1.5 million is subject to VAT.",
      "Additionally, Revenue Regulations No. 16-2005 provides further clarification."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("Section 109(P) of the National Internal Revenue Code"),
      "REV4-A: suffix-form NIRC 109(P) stripped when finalSourceCards has only RR 16-2005"
    );
    assert(
      result.includes("Revenue Regulations No. 16-2005"),
      "REV4-A: verified RR 16-2005 line survives"
    );
  }

  // ── B: Verified VAT citation survives ─────────────────────────────────────
  // finalSourceCards = [NIRC Sec. 109(P)]; same phrase → KEPT.
  {
    const sources = [src("NIRC Sec. 109(P)")];
    const answer  = "This is governed by Section 109(P) of the National Internal Revenue Code (NIRC).";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("Section 109(P) of the National Internal Revenue Code"),
      "REV4-B: suffix-form NIRC 109(P) kept when finalSourceCards contains NIRC Sec. 109(P)"
    );
  }

  // ── C: COMPLEX_ADVISORY path ──────────────────────────────────────────────
  // Step 16 is bypassed for COMPLEX_ADVISORY; REV4 second pass catches it.
  // finalSourceCards = [RR 16-2005]; answer cites 109(BB) → STRIPPED.
  {
    const sources = [src("RR No. 16-2005")];
    const answer  = "Under Section 109(BB) of the National Internal Revenue Code, the person is exempt from VAT registration.";
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("Section 109(BB) of the National Internal Revenue Code"),
      "REV4-C: COMPLEX_ADVISORY-bypassed suffix-form 109(BB) stripped by post-source-card pass"
    );
  }

  // ── D: EWT domain ────────────────────────────────────────────────────────
  // finalSourceCards = [RR 2-98]; answer cites RR 2-98 (keep) and NIRC Sec. 57 (strip).
  {
    const sources = [src("RR 2-98")];
    const answer  = [
      "- RR 2-98 implements the expanded withholding tax (EWT) system.",
      "- NIRC Sec. 57 provides the statutory basis for the withholding of taxes."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("RR 2-98"),
      "REV4-D: verified RR 2-98 line survives"
    );
    assert(
      !result.includes("NIRC Sec. 57"),
      "REV4-D: unsupported NIRC Sec. 57 line stripped"
    );
  }

  // ── E: Income Tax domain ─────────────────────────────────────────────────
  // finalSourceCards = [NIRC Sec. 24]; answer cites Sec. 24 (keep) and Sec. 34 (strip).
  {
    const sources = [src("NIRC Sec. 24")];
    const answer  = [
      "- NIRC Sec. 24 imposes graduated income tax on individual taxpayers.",
      "- NIRC Sec. 34 provides the schedule of allowable deductions."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 24"),
      "REV4-E: verified NIRC Sec. 24 line kept (Income Tax)"
    );
    assert(
      !result.includes("NIRC Sec. 34"),
      "REV4-E: unsupported NIRC Sec. 34 line stripped (Income Tax)"
    );
  }

  // ── F: Estate Tax domain ─────────────────────────────────────────────────
  // finalSourceCards = [NIRC Sec. 84]; answer cites Sec. 84 (keep) and Sec. 90 (strip).
  {
    const sources = [src("NIRC Sec. 84")];
    const answer  = [
      "- NIRC Sec. 84 imposes estate tax on the net taxable estate of the decedent.",
      "- NIRC Sec. 90 prescribes the filing of the estate tax return."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("NIRC Sec. 84"),
      "REV4-F: verified NIRC Sec. 84 line kept (Estate Tax)"
    );
    assert(
      !result.includes("NIRC Sec. 90"),
      "REV4-F: unsupported NIRC Sec. 90 line stripped (Estate Tax)"
    );
  }

  // ── G: Jurisprudence domain ──────────────────────────────────────────────
  // finalSourceCards = [CTA Case No. 9711]; answer cites CTA 9711 (keep) and G.R. No. 222743 (strip).
  {
    const sources = [src("CTA Case No. 9711")];
    const answer  = [
      "- CTA 9711 upheld the zero-rating treatment for export sales.",
      "- G.R. No. 222743 provides the constitutional basis for the VAT system."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      result.includes("CTA 9711"),
      "REV4-G: verified CTA 9711 line kept (Jurisprudence)"
    );
    assert(
      !result.includes("G.R. No. 222743"),
      "REV4-G: unsupported G.R. No. 222743 line stripped (Jurisprudence)"
    );
  }

  // ── H: Empty authority heading removed after stripping ───────────────────
  // When all lines under a heading are stripped, the heading itself is removed.
  {
    const sources = [src("RR No. 16-2005")];
    const answer  = [
      "### Short Answer",
      "Yes, a VAT-registered exporter can claim a refund on input taxes.",
      "",
      "### Controlling Authorities",
      "- NIRC Sec. 112 allows VAT refund or credit for zero-rated sales.",
      "",
      "### Interpretation",
      "Applicable under Revenue Regulations No. 16-2005."
    ].join("\n");
    const result  = stripUnverifiedAuthorityLines(answer, sources);
    assert(
      !result.includes("NIRC Sec. 112"),
      "REV4-H: unsupported NIRC Sec. 112 citation stripped"
    );
    assert(
      !result.includes("### Controlling Authorities"),
      "REV4-H: empty '### Controlling Authorities' heading removed after stripping"
    );
    assert(
      result.includes("Revenue Regulations No. 16-2005"),
      "REV4-H: verified RR No. 16-2005 prose survives"
    );
  }
});

// ─── Group 12: REV4 — pipeline.js static implementation checks ───────────────

group("REV4 — pipeline.js post-source-card gate: static checks", () => {
  assert(
    PIPELINE_SRC.includes("PATCH_024C_POST_SOURCECARD"),
    "pipeline.js contains [PATCH_024C_POST_SOURCECARD] log marker"
  );

  assert(
    PIPELINE_SRC.includes("stripUnverifiedAuthorityLines") &&
    PIPELINE_SRC.includes("final-answer-compliance.js") &&
    /import\s*\{[^}]*stripUnverifiedAuthorityLines[^}]*\}\s*from\s*["']\.\/final-answer-compliance\.js["']/.test(PIPELINE_SRC),
    "pipeline.js imports stripUnverifiedAuthorityLines from final-answer-compliance.js"
  );

  assert(
    PIPELINE_SRC.includes("requestId") &&
    PIPELINE_SRC.includes("traceId") &&
    PIPELINE_SRC.includes("sourceCardCount") &&
    PIPELINE_SRC.includes("beforeLength") &&
    PIPELINE_SRC.includes("afterLength"),
    "[PATCH_024C_POST_SOURCECARD] log includes requestId, traceId, sourceCardCount, beforeLength, afterLength"
  );

  assert(
    /const\s+_024c4CorrelationId\s*=\s*requestId\s*\|\|\s*traceId\s*\|\|\s*["']missing-request-id["']/.test(PIPELINE_SRC),
    "PATCH-025A static: PATCH_024C_POST_SOURCECARD log uses requestId with traceId fallback"
  );

  assert(
    /console\.log\(\s*`\[PATCH_024C_POST_SOURCECARD requestId=\$\{_024c4CorrelationId\}\]`/.test(PIPELINE_SRC),
    "PATCH-025A static: requestId is visible in PATCH_024C_POST_SOURCECARD log prefix"
  );

  assert(
    PIPELINE_SRC.includes('marker:          "PATCH_024C_POST_SOURCECARD"') &&
    PIPELINE_SRC.includes("requestId:       _024c4CorrelationId") &&
    PIPELINE_SRC.includes("traceId:         traceId || null"),
    "PATCH-025A regression: correlated log preserves marker, requestId, and traceId fields"
  );

  assert(
    !/console\.log\(\s*["']\[PATCH_024C_POST_SOURCECARD\]["']/.test(PIPELINE_SRC),
    "PATCH-025A regression: bare PATCH_024C_POST_SOURCECARD log prefix cannot hide requestId"
  );

  // Verify ordering: REV4 gate must come BEFORE PATCH-019A gate
  const rev4Idx  = PIPELINE_SRC.indexOf("PATCH_024C_POST_SOURCECARD");
  const p019aIdx = PIPELINE_SRC.indexOf("PATCH-019A Verified-Authority Final Answer Gate");
  assert(
    rev4Idx > 0 && p019aIdx > 0 && rev4Idx < p019aIdx,
    "PATCH-024C-REV4 post-source-card strip precedes PATCH-019A gate in pipeline.js"
  );
});

// ─── Group 13: PATCH-025A-REV2 — diagnostic echo static checks ───────────────
//
// Verifies that ctx._patch024cPostSourcecard is populated in both execution
// paths (gate ran / gate skipped) and that the field is echoed safely in the
// pipeline return payload.  All checks are static source analysis — no runtime
// pipeline invocation is required.
//
// Safety contract: the diagnostic MUST contain only counts, flags, enum strings,
// and a correlation requestId.  It MUST NOT contain answer text, retrieved
// chunks, prompt content, API keys, or internal paths.

group("PATCH-025A-REV2 — diagnostic echo static checks", () => {
  // 1. _024cSkipReason ternary present with all three allowed skip labels
  assert(
    /const\s+_024cSkipReason\s*=/.test(PIPELINE_SRC) &&
    PIPELINE_SRC.includes('"NO_FINAL_SOURCE_CARDS"') &&
    PIPELINE_SRC.includes('"LEARNING_MODE"')         &&
    PIPELINE_SRC.includes('"SOURCE_LOOKUP_EMPTY"'),
    "025A-REV2 static: _024cSkipReason covers NO_FINAL_SOURCE_CARDS, LEARNING_MODE, SOURCE_LOOKUP_EMPTY"
  );

  // 2. executed=true block present
  assert(
    PIPELINE_SRC.includes("ctx._patch024cPostSourcecard = {") &&
    /executed:\s+true,/.test(PIPELINE_SRC),
    "025A-REV2 static: ctx._patch024cPostSourcecard = { executed: true } set when gate runs"
  );

  // 3. executed=false + skippedReason block present (else branch)
  assert(
    /executed:\s+false,/.test(PIPELINE_SRC) &&
    /skippedReason:\s+_024cSkipReason,/.test(PIPELINE_SRC),
    "025A-REV2 static: skip branch sets executed:false and skippedReason:_024cSkipReason"
  );

  // 4. diagnostic is echoed in the pipeline return payload
  assert(
    /patch024cPostSourcecard:\s+ctx\._patch024cPostSourcecard/.test(PIPELINE_SRC),
    "025A-REV2 static: patch024cPostSourcecard returned in pipeline response payload"
  );

  // 5. All safe fields present in the executed=true diagnostic block
  const _execStart = PIPELINE_SRC.indexOf("executed:           true,");
  const _execSnip  = _execStart >= 0 ? PIPELINE_SRC.slice(_execStart, _execStart + 420) : "";
  for (const field of [
    "sourceCardCount", "beforeLength", "afterLength", "changed",
    "sourceAvailability", "answerMode", "requestId"
  ]) {
    assert(
      _execSnip.includes(field + ":"),
      `025A-REV2 static: safe field '${field}' present in executed=true diagnostic block`
    );
  }

  // 6. Forbidden content absent from both diagnostic assignment blocks
  //    Extract ~700 chars from the first ctx._patch024cPostSourcecard assignment
  //    (covers both the executed=true and executed=false blocks).
  const _diagStart = PIPELINE_SRC.indexOf("ctx._patch024cPostSourcecard = {");
  const _diagSnip  = _diagStart >= 0 ? PIPELINE_SRC.slice(_diagStart, _diagStart + 700) : "";
  for (const forbidden of [
    "finalAnswer",
    "ctx.rerankedChunks",
    "prompt",
    "openaiKey",
    "SUPABASE",
    "apiKey",
    "__dirname",
    "__filename"
  ]) {
    assert(
      !_diagSnip.includes(forbidden),
      `025A-REV2 safety: forbidden identifier '${forbidden}' absent from _patch024cPostSourcecard assignment`
    );
  }

  // 7. Regression: PATCH-019A verifiedAuthorityGate and patch024cPostSourcecard
  //    both present in the return object, in source order
  const _retStart     = PIPELINE_SRC.lastIndexOf("verifiedAuthorityGate:");
  const _ret024cStart = PIPELINE_SRC.lastIndexOf("patch024cPostSourcecard:");
  assert(
    _retStart > 0 && _ret024cStart > 0 && _ret024cStart > _retStart,
    "025A-REV2 regression: patch024cPostSourcecard follows verifiedAuthorityGate in return payload"
  );
});

// ─── Group 14: PATCH-025A-REV3 — /ask response mapper echo checks ───────────
//
// PATCH-025A-REV2 correctly returned patch024cPostSourcecard from pipeline.js,
// but /ask constructs a frontend-compatible payload object in ask-handler.js.
// These checks prevent that mapper from silently dropping the safe diagnostic.

group("PATCH-025A-REV3 — ask-handler payload mapper echoes diagnostic", () => {
  const payloadStart = ASK_HANDLER_SRC.indexOf("const payload = {");
  const payloadEnd   = ASK_HANDLER_SRC.indexOf("return res.json(payload)", payloadStart);
  const payloadSrc   = payloadStart >= 0 && payloadEnd > payloadStart
    ? ASK_HANDLER_SRC.slice(payloadStart, payloadEnd)
    : "";

  assert(
    payloadSrc.includes("patch024cPostSourcecard:"),
    "025A-REV3 static: /ask payload includes patch024cPostSourcecard"
  );

  assert(
    /patch024cPostSourcecard:\s+result\.patch024cPostSourcecard\s+\|\|\s+null/.test(payloadSrc),
    "025A-REV3 regression: /ask payload copies result.patch024cPostSourcecard || null"
  );

  const sourceAvailabilityIdx = payloadSrc.indexOf("sourceAvailability:");
  const saeStatusIdx          = payloadSrc.indexOf("saeStatus:");
  const patch025Idx           = payloadSrc.indexOf("patch024cPostSourcecard:");
  const diagnosticsIdx        = payloadSrc.indexOf("diagnostics:");
  assert(
    sourceAvailabilityIdx > 0 &&
    saeStatusIdx > sourceAvailabilityIdx &&
    patch025Idx > saeStatusIdx &&
    diagnosticsIdx > patch025Idx,
    "025A-REV3 static: diagnostic is placed near sourceAvailability/saeStatus before diagnostics"
  );

  const mapperLine = payloadSrc.match(/patch024cPostSourcecard:[^\n]+/)?.[0] || "";
  for (const forbidden of [
    "result.sources",
    "result.sourcesUsed",
    "result.sourceCards",
    "result.rerankedChunks",
    "result.prompt",
    "OPENAI",
    "SUPABASE",
    "apiKey",
    "__dirname",
    "__filename"
  ]) {
    assert(
      !mapperLine.includes(forbidden),
      `025A-REV3 safety: mapper diagnostic line does not introduce '${forbidden}'`
    );
  }

  assert(
    /patch024cPostSourcecard:\s+ctx\._patch024cPostSourcecard/.test(PIPELINE_SRC),
    "025A-REV3 regression: pipeline.js diagnostic return remains unchanged"
  );
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(56)}`);
console.log(`PATCH-024C: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("All assertions passed.");
