/**
 * PATCH-021G Regression Tests
 * Court Indexer Reference Derivation Rule
 *
 * Run: node tests/patch-021g-court-indexer-reference.test.mjs
 *
 * vector-store.js imports env-free, so extractCourtCaseIdentifier and
 * isStatuteShapedReference are tested as REAL production functions.
 * drive-reader.js throws at import on missing Google credentials, so its
 * inferNormalizedReference wiring is verified by source scan, and the
 * buildAuthorityFields guard in vector-store.js likewise (not exported).
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  extractCourtCaseIdentifier,
  isStatuteShapedReference,
  COURT_AUTHORITY_TYPES
} from "../vector-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTOR_SRC = readFileSync(join(__dirname, "..", "vector-store.js"), "utf8");
const DRIVE_SRC = readFileSync(join(__dirname, "..", "drive-reader.js"), "utf8");

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

// ─── Tests 1-4: title-derived references for the audit's polluted documents ───

group("Tests 1-4 — case identifiers derived from document titles", () => {
  assert(
    extractCourtCaseIdentifier("G.R. No. 222743 – Medicard Philippines, Inc. v. CIR.pdf") === "G.R. No. 222743",
    "Medicard → G.R. No. 222743 (not NIRC Sec. 249)"
  );
  assert(
    extractCourtCaseIdentifier("G.R. No. 187485. October 08, 2013.pdf") === "G.R. No. 187485",
    "San Roque resolution → G.R. No. 187485 (not BIR Ruling DA-489-03)"
  );
  assert(
    extractCourtCaseIdentifier("G.R. Nos. 250032 & 250047.pdf") === "G.R. Nos. 250032 & 250047",
    "consolidated dockets → G.R. Nos. 250032 & 250047"
  );
  assert(
    extractCourtCaseIdentifier("CTA Case No. 8900 – Telstar Manufacturing Corporation v. CIR.pdf") === "CTA Case No. 8900",
    "Telstar → CTA Case No. 8900"
  );
  assert(extractCourtCaseIdentifier("CTA EB No. 2748 – X v. CIR.pdf") === "CTA EB No. 2748", "CTA EB recognized");
  assert(extractCourtCaseIdentifier("CTA AC No. 123.pdf") === "CTA AC No. 123", "CTA AC recognized");
  assert(extractCourtCaseIdentifier("G.R. No. L-28508.pdf") === "G.R. No. L-28508", "L-series docket preserved");
  assert(
    extractCourtCaseIdentifier("G.R. No. 198677. November 26, 2014.pdf") === "G.R. No. 198677",
    "date suffix never absorbed into docket number"
  );
});

// ─── Test 5: non-court materials unaffected ───────────────────────────────────

group("Test 5 — statute/issuance filenames yield no court identifier", () => {
  for (const f of ["RR_2-98.pdf", "NIRC-1997-RA-10963 (BIR).pdf", "RMC No. 65-2012.pdf", "RR 16-2005.pdf", "RMO 23-2020.pdf"]) {
    assert(extractCourtCaseIdentifier(f) === null, `'${f}' → null (existing normalization preserved)`);
  }
  // inferNormalizedReference keeps its statute patterns intact after the court check
  assert(/nircSectionMatches/.test(DRIVE_SRC), "NIRC section inference retained in drive-reader");
  assert(/issuancePatterns/.test(DRIVE_SRC), "RR/RMC/RMO issuance inference retained in drive-reader");
});

// ─── Wiring: drive-reader title-first rule ────────────────────────────────────

group("Wiring — inferNormalizedReference checks title BEFORE body sampling", () => {
  const fnStart = DRIVE_SRC.indexOf("export function inferNormalizedReference");
  const fnBlock = DRIVE_SRC.slice(fnStart, fnStart + 1600);
  const titleCheckIdx = fnBlock.indexOf("extractCourtCaseIdentifier(`${fileName}\\n${folderPath}`)");
  const bodySampleIdx = fnBlock.indexOf("normalizeText(text).slice(0, 3000)");
  assert(titleCheckIdx > -1, "title/path court check present");
  assert(bodySampleIdx > -1, "body sampling still present for non-court docs");
  assert(titleCheckIdx < bodySampleIdx, "court check runs BEFORE the body-text sample is built");
  assert(fnBlock.includes("[PATCH_021G_COURT_REFERENCE_FROM_TITLE]"), "diagnostic logged in drive-reader");
  assert(/import \{ extractCourtCaseIdentifier \} from "\.\/vector-store\.js"/.test(DRIVE_SRC), "single canonical helper imported");
});

// ─── Wiring: vector-store ingestion guard ─────────────────────────────────────

group("Wiring — buildAuthorityFields court guard", () => {
  assert(/COURT_AUTHORITY_TYPES\.has\(authorityType\)/.test(VECTOR_SRC), "guard gated on court authority types");
  for (const t of ["SUPREME_COURT", "SUPREME_COURT_EN_BANC", "CTA_EN_BANC", "CTA_DIVISION", "CASE", "CASE_LAW", "JURISPRUDENCE"]) {
    assert(COURT_AUTHORITY_TYPES.has(t), `court type set includes ${t}`);
  }
  assert(VECTOR_SRC.includes("[PATCH_021G_COURT_REFERENCE_FROM_TITLE]"), "title-derivation diagnostic present in ingestion");
  assert(VECTOR_SRC.includes("[PATCH_021G_COURT_REFERENCE_FALLBACK_WARNING]"), "warning logged for court docs without case identifiers (Test 6)");
  assert(
    /bodyCaseId\s*=\s*extractCourtCaseIdentifier\(String\(text \|\| ""\)\.slice\(0, 3000\)\)/.test(VECTOR_SRC),
    "body consulted only as case-identifier fallback, never statute extraction"
  );
  assert(
    /isStatuteShapedReference\(normalizedReference\)/.test(VECTOR_SRC),
    "statute-shaped references rejected for court documents"
  );
});

// ─── Requirement 4: statute shapes never valid court references ───────────────

group("Requirement 4 — statute-shaped reference detection", () => {
  for (const ref of ["NIRC Sec. 249", "RR 2-98", "RMC 65-2012", "RMO 23-2020", "RA 10963", "BIR Ruling DA-489-03", "CMTA Sec. 100", "LGC Sec. 143"]) {
    assert(isStatuteShapedReference(ref) === true, `'${ref}' recognized as statute-shaped`);
  }
  for (const ref of ["G.R. No. 222743", "G.R. Nos. 250032 & 250047", "CTA Case No. 8900", "CTA EB No. 2748"]) {
    assert(isStatuteShapedReference(ref) === false, `'${ref}' is a valid court reference`);
  }
});

// ─── No DB writes from this patch ─────────────────────────────────────────────

group("Constraint — ingest-rule patch only, no row modifications", () => {
  assert(!VECTOR_SRC.includes("PATCH_021G_DB_REPAIR"), "no database repair code added");
  assert(extractCourtCaseIdentifier("") === null, "empty input safe");
  assert(extractCourtCaseIdentifier(null) === null, "null input safe");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021G regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
