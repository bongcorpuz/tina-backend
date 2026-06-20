/**
 * PATCH-030A Tests
 * Exact jurisprudence authority integrity.
 *
 * Run: node tests/patch-030a-exact-jurisprudence-authority-integrity.test.mjs
 */

import fs from "fs";
import { classify } from "../issue-classification-engine.js";

const PIPELINE_SRC = fs.readFileSync(new URL("../pipeline.js", import.meta.url), "utf8");
const ORCH_SRC = fs.readFileSync(new URL("../context-orchestration-engine.js", import.meta.url), "utf8");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL  ${label}`);
    failed += 1;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n-- ${name}`);
  fn();
}

function canonicalSourceKey(ref = "") {
  return String(ref || "")
    .toLowerCase()
    .replace(/\bno\.?\s*/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCourtCaseReference(reference = "", type = "") {
  const ref = String(reference || "").trim();
  if (!ref) return "";

  if (type === "CTA_DIVISION") {
    const match = ref.match(/\bcta\s+(?:case\s+)?(?:no\.?\s*)?([a-z0-9.-]+)\b/i);
    return match ? `CTA Case No. ${match[1]}` : ref;
  }

  if (type === "CTA_EN_BANC") {
    const match = ref.match(/\bcta\s+(?:eb\s+)?(?:no\.?\s*)?([a-z0-9.-]+)\b/i);
    return match ? `CTA EB No. ${match[1]}` : ref;
  }

  if (type === "SUPREME_COURT") {
    const match = ref.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
    return match ? `G.R. No. ${match[1]}` : ref;
  }

  return ref;
}

function exactCourtAuthority(issueClassification = {}) {
  const exactAuthority = issueClassification?.exactAuthority || {};
  const type = String(exactAuthority.type || "").toUpperCase().replace(/[\s-]+/g, "_");
  if (exactAuthority.detected !== true) return null;
  if (!["SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "COURT_OF_APPEALS"].includes(type)) return null;

  const reference = normalizeCourtCaseReference(exactAuthority.reference || "", type);
  if (!reference) return null;
  return { type, reference, key: canonicalSourceKey(reference) };
}

function sourceCardMatchesExactCourt(card = {}, exactCourt = null) {
  if (!exactCourt?.key) return false;
  const refs = [
    card.normalizedReference,
    card.normalized_reference,
    card.citation,
    card.displayLabel,
    card.display_label,
    card.label,
    card.title,
    card.reference,
    card.metadata?.normalizedReference,
    card.metadata?.normalized_reference
  ].filter(Boolean);

  return refs.some((ref) =>
    canonicalSourceKey(normalizeCourtCaseReference(ref, exactCourt.type)) === exactCourt.key
  );
}

function exact(query) {
  return classify(query).exactAuthority || {};
}

group("R1 CTA exact authority canonicalization", () => {
  const bare = exact("CTA Case No. 9369");
  const provides = exact("What does CTA Case No. 9369 provide?");
  const explain = exact("Explain CTA Case No. 9369");
  const cta9711 = exact("CTA Case No. 9711");

  assert(bare.detected === true, "bare CTA case is detected");
  assert(bare.type === "CTA_DIVISION", "bare CTA case remains CTA_DIVISION");
  assert(bare.reference === "CTA Case No. 9369", "bare CTA case maps to indexed canonical reference");
  assert(provides.reference === "CTA Case No. 9369", "explanatory CTA query maps to indexed canonical reference");
  assert(explain.reference === "CTA Case No. 9369", "instructional CTA query maps to indexed canonical reference");
  assert(cta9711.reference === "CTA Case No. 9711", "CTA Case No. 9711 maps to indexed canonical reference");
});

group("Existing exact-authority behavior is preserved", () => {
  const gr = exact("G.R. No. 184823");
  const rr = exact("RR 2-98");
  const vat = exact("What is VAT?");
  const bir = exact("What is the BIR?");
  const genericJuris = exact("Are there jurisprudence cases on withholding tax?");

  assert(gr.detected === true && gr.reference === "G.R. No. 184823", "G.R. exact citation remains unchanged");
  assert(rr.detected === true && rr.reference === "RR No. 2-1998", "PATCH-029 RR bare citation remains unchanged");
  assert(vat.detected === false, "VAT definition does not become an exact authority lookup");
  assert(bir.detected === false, "BIR definition does not become an exact authority lookup");
  assert(genericJuris.detected === false, "generic jurisprudence query does not become exact named-case lookup");
});

group("R2/R3 exact court-card matching guard behavior", () => {
  const exactCourt = exactCourtAuthority(classify("CTA Case No. 9369"));
  const exactCard = { normalizedReference: "CTA Case No. 9369", citation: "CTA Case No. 9369" };
  const shortAlias = { normalizedReference: "CTA 9369", citation: "CTA 9369" };
  const unrelatedGr = { normalizedReference: "G.R. No. 184823", citation: "G.R. No. 184823" };
  const unrelatedStatute = { normalizedReference: "NIRC Sec. 3", citation: "NIRC Sec. 3" };

  assert(exactCourt?.reference === "CTA Case No. 9369", "exact court helper uses indexed CTA reference");
  assert(sourceCardMatchesExactCourt(exactCard, exactCourt), "indexed CTA case card matches exact query");
  assert(sourceCardMatchesExactCourt(shortAlias, exactCourt), "short CTA alias still matches the exact CTA case");
  assert(!sourceCardMatchesExactCourt(unrelatedGr, exactCourt), "unrelated G.R. card does not match exact CTA query");
  assert(!sourceCardMatchesExactCourt(unrelatedStatute, exactCourt), "unrelated NIRC card does not match exact CTA query");
});

group("Production hooks are present and scoped", () => {
  assert(PIPELINE_SRC.includes("function patch030aExactCourtAuthority(issueClassification = {})"), "pipeline exact court helper exists");
  assert(PIPELINE_SRC.includes("[PATCH_030A_EXACT_COURT_CARD_GUARD]"), "pipeline exact court source-card guard diagnostic exists");
  assert(PIPELINE_SRC.includes("ctx._030a_exactCourtAuthorityMissing = true"), "pipeline marks missing exact court authority");
  assert(PIPELINE_SRC.includes("I could not locate an indexed source card matching"), "pipeline answer guard for missing exact case exists");
  assert(ORCH_SRC.includes("Exact court-case integrity:"), "orchestration prompt guard for missing exact case exists");
  assert(ORCH_SRC.includes("exactAuthority:"), "orchestration receives exact authority metadata");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-030A  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
