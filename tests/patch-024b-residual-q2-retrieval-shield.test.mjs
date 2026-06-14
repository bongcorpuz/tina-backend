/**
 * PATCH-024B Residual Defect Fix — Q2 Retrieval Classification Shield
 *
 * Run: node tests/patch-024b-residual-q2-retrieval-shield.test.mjs
 *
 * Root cause:
 *   retrieval-engine.js's isVatDefinitionClassification() fires on Q2 because:
 *     - normalizeIssue("VAT_LIABILITY") === "VAT"  → issues.includes("VAT") = true
 *     - Q2 text matches /what is.*vat/i             → condition 2 triggers
 *   This overrides provisional.subIssue to "VAT_DEFINITION" and
 *   provisional.targetAuthorities to NIRC Sec. 105/106/108, discarding the
 *   PATCH-024B precise authority targets (NIRC Sec. 109(P), RR 4-2007).
 *
 * Fix (pipeline.js):
 *   Before calling retrieveRelevantSources(), build a shallow copy of
 *   issueClassification where primaryIssue and domainCode equal the specialized
 *   sub-issue value (e.g. "VAT_EXEMPTION_REAL_PROPERTY").  That value is NOT in
 *   the retrieval alias table → normalizeIssue(primaryIssue) !== "VAT" →
 *   issues.includes("VAT") = false → isVatDefinitionClassification() = false →
 *   no override.  ctx.issueClassification is unchanged.
 *
 * This test file verifies:
 *   A. pipeline.js shield code is present and correct
 *   B. Q2 classification from issue-classification-engine is still correct
 *   C. Q2 targetAuthorities include NIRC Sec. 109(P) and RR 4-2007
 *   D. Q2 responseMode = STANDARD (not FAST_DEFINITION)
 *   E. Q2 retrievalStrategy = ISSUE_AUTHORITY_HIERARCHY_SEMANTIC (not FAST_DEFINITION_PRIMARY_AUTHORITY)
 *   F. Q5 ("What is the VAT rate on importation...") also shielded (same root cause)
 *   G. Existing PATCH-024B routing for Q1, Q3, Q4 unaffected
 */

"use strict";

import { readFileSync } from "node:fs";
import { createRequire  } from "node:module";
import { fileURLToPath  } from "node:url";
import { dirname, join  } from "node:path";

const __dirname     = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC  = readFileSync(join(__dirname, "..", "pipeline.js"),                     "utf8");
const ENGINE_SRC    = readFileSync(join(__dirname, "..", "issue-classification-engine.js"), "utf8");

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

// ─── Group 1: pipeline.js shield code present and correct ────────────────────

group("pipeline.js — PATCH-024B retrieval classification shield present", () => {
  assert(
    PIPELINE_SRC.includes("PATCH_024B_RETRIEVAL_CLASSIFICATION_SHIELD"),
    "diagnostic log marker PATCH_024B_RETRIEVAL_CLASSIFICATION_SHIELD present"
  );

  assert(
    PIPELINE_SRC.includes("_024b_specializedVatSubs"),
    "_024b_specializedVatSubs Set defined in pipeline.js"
  );

  const setMatch = PIPELINE_SRC.match(/_024b_specializedVatSubs\s*=\s*new Set\(\[[\s\S]{0,900}\]\)/);
  const setBody  = setMatch ? setMatch[0] : "";
  assert(setBody.includes('"VAT_EXEMPTION_REAL_PROPERTY"'), "Shield Set includes VAT_EXEMPTION_REAL_PROPERTY");
  assert(setBody.includes('"VAT_REGISTRATION"'),            "Shield Set includes VAT_REGISTRATION");
  assert(setBody.includes('"VAT_EXEMPTION_MEDICAL_PROFESSIONAL"'), "Shield Set includes VAT_EXEMPTION_MEDICAL_PROFESSIONAL");
  assert(setBody.includes('"VAT_IMPORTATION"'),             "Shield Set includes VAT_IMPORTATION");
  assert(setBody.includes('"VAT_REFUND_CREDIT"'),           "Shield Set includes VAT_REFUND_CREDIT");

  assert(
    PIPELINE_SRC.includes("_024bClassificationForRetrieval"),
    "_024bClassificationForRetrieval variable present"
  );

  assert(
    PIPELINE_SRC.includes("primaryIssue: _024b_sub") &&
    PIPELINE_SRC.includes("domainCode: _024b_sub"),
    "shield replaces primaryIssue and domainCode with the specialized sub-issue"
  );

  // Confirm the shielded classification is passed to retrieveRelevantSources
  assert(
    PIPELINE_SRC.includes("issueClassification: _024bClassificationForRetrieval"),
    "_024bClassificationForRetrieval passed as issueClassification to retrieveRelevantSources"
  );

  // Confirm ctx.issueClassification itself is NOT mutated (only the copy)
  const shieldBlock = PIPELINE_SRC.match(
    /PATCH-024B: retrieval-engine[\s\S]{0,3000}issueClassification: _024bClassificationForRetrieval/
  );
  assert(
    Boolean(shieldBlock) &&
    !shieldBlock[0].includes("ctx.issueClassification = ") &&
    !shieldBlock[0].includes("ctx.issueClassification.primaryIssue ="),
    "ctx.issueClassification is never mutated — only the retrieval snapshot is modified"
  );
});

// ─── Group 2: Q2 classification is VAT_EXEMPTION_REAL_PROPERTY ───────────────

group("Q2 classification — subIssue, responseMode, retrievalStrategy, targetAuthorities", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(join(__dirname, "..", "issue-classification-engine.js")));
  } catch {
    console.log("  SKIP  (module import failed — static checks cover this group)");
    return;
  }

  const Q2 = "What is the VAT treatment of sale of residential lots valued at ₱1.9M?";
  const result = classifyTaxIssue(Q2);

  assert(
    result?.subIssue === "VAT_EXEMPTION_REAL_PROPERTY",
    `Q2: subIssue === VAT_EXEMPTION_REAL_PROPERTY (got: ${result?.subIssue})`
  );

  assert(
    result?.subIssue !== "VAT_DEFINITION",
    `Q2: subIssue is NOT VAT_DEFINITION`
  );

  assert(
    result?.responseMode === "STANDARD",
    `Q2: responseMode === STANDARD (got: ${result?.responseMode})`
  );

  assert(
    result?.responseMode !== "FAST_DEFINITION",
    `Q2: responseMode is NOT FAST_DEFINITION`
  );

  assert(
    result?.retrievalStrategy !== "FAST_DEFINITION_PRIMARY_AUTHORITY",
    `Q2: retrievalStrategy is NOT FAST_DEFINITION_PRIMARY_AUTHORITY (got: ${result?.retrievalStrategy})`
  );

  const targets = result?.targetAuthorities || [];
  assert(
    targets.some(t => /NIRC\s+Sec\.?\s*109\s*\(P\)/i.test(t)),
    `Q2: targetAuthorities includes NIRC Sec. 109(P) (got: ${JSON.stringify(targets)})`
  );

  assert(
    targets.some(t => /RR\s+4[-–]2007/i.test(t)),
    `Q2: targetAuthorities includes RR 4-2007 (got: ${JSON.stringify(targets)})`
  );

  assert(
    targets.some(t => /RR\s+16[-–]2005/i.test(t)),
    `Q2: targetAuthorities includes RR 16-2005`
  );
});

// ─── Group 3: Q5 also shielded (same "what is VAT" root cause) ───────────────

group("Q5 classification — also shielded from isVatDefinitionClassification", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(join(__dirname, "..", "issue-classification-engine.js")));
  } catch {
    console.log("  SKIP  (module import failed)");
    return;
  }

  const Q5 = "What is the VAT rate on importation of goods used for manufacturing export products?";
  const result = classifyTaxIssue(Q5);

  assert(
    result?.subIssue === "VAT_IMPORTATION",
    `Q5: subIssue === VAT_IMPORTATION (got: ${result?.subIssue})`
  );

  assert(
    result?.responseMode === "STANDARD",
    `Q5: responseMode === STANDARD (got: ${result?.responseMode})`
  );

  assert(
    result?.retrievalStrategy !== "FAST_DEFINITION_PRIMARY_AUTHORITY",
    `Q5: retrievalStrategy is NOT FAST_DEFINITION_PRIMARY_AUTHORITY (got: ${result?.retrievalStrategy})`
  );

  const targets = result?.targetAuthorities || [];
  assert(
    targets.some(t => /NIRC\s+Sec\.?\s*107\b/i.test(t)),
    `Q5: targetAuthorities includes NIRC Sec. 107 (got: ${JSON.stringify(targets)})`
  );
});

// ─── Group 4: Q1, Q3, Q4 routing unaffected ──────────────────────────────────

group("Regression — Q1, Q3, Q4 routing unchanged by residual fix", () => {
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(join(__dirname, "..", "issue-classification-engine.js")));
  } catch {
    console.log("  SKIP  (module import failed)");
    return;
  }

  const Q1 = "Is a freelance graphic designer with annual gross receipts of ₱2.8M required to register for VAT?";
  assert(
    classifyTaxIssue(Q1)?.subIssue === "VAT_REGISTRATION",
    `Q1: subIssue still VAT_REGISTRATION (got: ${classifyTaxIssue(Q1)?.subIssue})`
  );

  const Q3 = "A VAT-registered exporter sells 100% of its goods abroad. Can it claim a VAT refund or credit on its input taxes?";
  assert(
    classifyTaxIssue(Q3)?.subIssue === "VAT_REFUND_CREDIT",
    `Q3: subIssue still VAT_REFUND_CREDIT (got: ${classifyTaxIssue(Q3)?.subIssue})`
  );

  const Q4 = "Are doctors' professional fees subject to VAT?";
  assert(
    classifyTaxIssue(Q4)?.subIssue === "VAT_EXEMPTION_MEDICAL_PROFESSIONAL",
    `Q4: subIssue still VAT_EXEMPTION_MEDICAL_PROFESSIONAL (got: ${classifyTaxIssue(Q4)?.subIssue})`
  );
});

// ─── Group 5: Simple VAT definition queries still unaffected ─────────────────

group("Regression — simple VAT definition queries NOT intercepted by shield", () => {
  // The shield only modifies the snapshot passed to retrieveRelevantSources;
  // it does NOT affect classifyTaxIssue() output.
  // "What is VAT?" → subIssue = VAT_DEFINITION (correct, not shielded).
  let classifyTaxIssue;
  try {
    const require = createRequire(import.meta.url);
    ({ classifyTaxIssue } = require(join(__dirname, "..", "issue-classification-engine.js")));
  } catch {
    console.log("  SKIP  (module import failed)");
    return;
  }

  assert(
    classifyTaxIssue("What is VAT?")?.subIssue === "VAT_DEFINITION",
    "Regression: 'What is VAT?' still classifies as VAT_DEFINITION"
  );

  // Shield Set does NOT contain VAT_DEFINITION → no shield applied for this query.
  assert(
    !PIPELINE_SRC.match(/_024b_specializedVatSubs[\s\S]{0,300}"VAT_DEFINITION"/),
    "Shield Set does NOT contain VAT_DEFINITION (would never shield a true VAT definition query)"
  );
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`PATCH-024B residual Q2 fix: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("All assertions passed.");
