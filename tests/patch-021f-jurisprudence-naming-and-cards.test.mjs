/**
 * PATCH-021F Regression Tests
 * Jurisprudence Response Naming and Source Card Eligibility
 *
 * Run: node tests/patch-021f-jurisprudence-naming-and-cards.test.mjs
 *
 * Both services/source-authority-selector.js and
 * context-orchestration-engine.js import env-free, so Part A (answer-plan
 * naming rule) and Part B (SAS court-card eligibility) are tested against the
 * REAL production functions. pipeline.js wiring is verified by source scan.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify } from "../issue-classification-engine.js";
import { selectSourceAuthorities } from "../services/source-authority-selector.js";
import { buildOpenAIContext } from "../context-orchestration-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CASE_NAME = "CTA Case No. 9711 – Dizon Farms Produce, Inc. v. CIR";
const COURT_CHUNK = {
  id: "court-1",
  authorityType: "CASE",
  authority_type: "CTA_DIVISION",
  normalizedReference: "CTA Case No. 9711",
  normalized_reference: "CTA Case No. 9711",
  document_title: "CTA Case No. 9711 – Dizon Farms Produce, Inc. v. CIR.pdf",
  source: "06-court-cases/cta-cases-on-ewt",
  targetAuthorityMatch: false,
  issueMismatch: true,
  text: "COURT OF TAX APPEALS ... deficiency expanded withholding tax assessment against Dizon Farms Produce."
};
const STATUTE_CHUNK = {
  id: "stat-1",
  authorityType: "STATUTE",
  normalizedReference: "NIRC Sec. 57",
  normalized_reference: "NIRC Sec. 57",
  document_title: "NIRC-1997-RA-10963 (BIR).pdf",
  source: "nirc",
  targetAuthorityMatch: true,
  text: "SEC. 57. Withholding of Tax at Source ...",
  authorityAnnotation: {
    authorityId: "nirc-57", displayLabel: "NIRC Sec. 57", authorityType: "STATUTE",
    authorityRole: "GOVERNING", authorityLevel: 2, citation: "NIRC Sec. 57",
    isIndexed: true, isParsed: true, isGoverning: true, limitationRequired: false
  }
};
const JURIS_CLASSIFICATION = {
  primaryIssue: "WITHHOLDING",
  subIssue: "WITHHOLDING_TAX",
  isJurisprudenceQuery: true,
  targetAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]
};

function runSas(chunks, classification) {
  return selectSourceAuthorities({
    rerankedChunks: chunks,
    issueClassification: classification,
    query: "Is there court cases in relation to withholding taxes?",
    answerText: "",
    mode: "STANDARD_TAX_MODE",
    maxSources: 5,
    saeStatus: "AUTHORITY_FOUND"
  });
}

// ─── Test 1 (Part A): answer plan requires naming the case ────────────────────

group("Test 1 — prompt requires the answer to name CTA Case No. 9711", () => {
  const out = buildOpenAIContext({
    userQuery: "Is there court cases in relation to withholding taxes?",
    retrievedSources: [COURT_CHUNK, STATUTE_CHUNK],
    issueClassification: classify("Is there court cases in relation to withholding taxes?"),
    mode: "STANDARD_TAX_MODE",
    model: "gpt-4o-mini",
    responsePlan: {
      askProfile: "BASIC_RESEARCH",
      askProfileSections: ["Short Answer", "Controlling Authorities", "Interpretation", "Practical Meaning"],
      jurisprudenceNamedAuthorities: [CASE_NAME]
    }
  });
  const blob = out.messages.map((m) => m.content).join("\n");
  assert(blob.includes("CASE-LAW NAMING"), "CASE-LAW NAMING rule present in prompt");
  assert(blob.includes(CASE_NAME), "prompt names CTA Case No. 9711 in the section rules");
  assert(blob.includes('"### Short Answer" section MUST explicitly name'), "Short Answer naming requirement present");
  assert(blob.includes("Do NOT state that no court cases were retrieved"), "false-negative prohibition present");
});

group("Test 1b — no named authorities → no naming rule (fallback preserved)", () => {
  const out = buildOpenAIContext({
    userQuery: "Is there court cases in relation to withholding taxes?",
    retrievedSources: [STATUTE_CHUNK],
    issueClassification: classify("Is there court cases in relation to withholding taxes?"),
    mode: "STANDARD_TAX_MODE",
    model: "gpt-4o-mini",
    responsePlan: {
      askProfile: "BASIC_RESEARCH",
      askProfileSections: ["Short Answer", "Controlling Authorities"]
    }
  });
  const blob = out.messages.map((m) => m.content).join("\n");
  assert(!blob.includes("CASE-LAW NAMING"), "no naming rule without promoted court decisions");
  assert(!blob.includes("CTA Case No. 9711"), "no case name fabricated into prompt");
});

// ─── Tests 2-4 (Part B): SAS court-card eligibility ───────────────────────────

group("Test 2/3 — SAS accepts the court chunk as supporting jurisprudence", () => {
  const r = runSas([COURT_CHUNK, STATUTE_CHUNK], JURIS_CLASSIFICATION);
  const labels = (r.visibleSourceCards || []).map((c) => c.citation || c.normalizedReference || c.title);
  assert(labels.some((l) => /CTA Case No\. 9711/.test(l)), `court card accepted (labels: ${labels.join(", ")})`);
  assert(labels.some((l) => /NIRC Sec\. 57/.test(l)), "statute context card preserved");
  const courtCard = (r.visibleSourceCards || []).find((c) => /CTA Case No\. 9711/.test(c.citation || ""));
  assert(courtCard != null, "court card object present");
});

group("Test 4 — pipeline Gate-1 contamination exemption wired", () => {
  assert(
    /_021fCourtCard\s*=\s*\n?\s*ctx\.issueClassification\?\.isJurisprudenceQuery\s*===\s*true\s*&&\s*\n?\s*patch021cIsCaseAuthority\(c\)/.test(PIPELINE_SRC),
    "card-loop exemption gated on isJurisprudenceQuery + court type"
  );
  assert(
    /!_021fCourtCard\s*&&\s*\n?\s*hasTargetAuthorities/.test(PIPELINE_SRC),
    "contamination gate skips exempted court chunks"
  );
  assert(PIPELINE_SRC.includes("[PATCH_021F_COURT_CARD_ELIGIBILITY_APPLIED]"), "pipeline eligibility diagnostic present");
  assert(
    /jurisprudenceNamedAuthorities:\s*_jpPromotedNames/.test(PIPELINE_SRC),
    "Step 13.5 wires promoted names into responsePlan"
  );
});

// ─── Tests 5-7: non-jurisprudence behavior unchanged ──────────────────────────

group("Test 5 — non-jurisprudence EWT query unchanged", () => {
  const ewt = classify("Is advertising service subject to EWT?");
  assert(ewt.isJurisprudenceQuery === false, "EWT query carries no jurisprudence intent");
  const r = runSas([COURT_CHUNK, STATUTE_CHUNK], { ...JURIS_CLASSIFICATION, isJurisprudenceQuery: false });
  const labels = (r.visibleSourceCards || []).map((c) => c.citation || c.normalizedReference || "");
  assert(!labels.some((l) => /CTA Case/.test(l)), "court chunk NOT card-eligible without jurisprudence intent");
});

group("Test 6 — statute-only sources fabricate no court card", () => {
  const r = runSas([STATUTE_CHUNK], JURIS_CLASSIFICATION);
  const labels = (r.visibleSourceCards || []).map((c) => c.citation || c.normalizedReference || "");
  assert(!labels.some((l) => /CTA|G\.R\./.test(l)), "no court card when no court source exists");
});

group("Test 7 — court chunk without any reference/title stays suppressed", () => {
  const bare = { id: "x", authorityType: "CASE", text: "some court text", targetAuthorityMatch: false };
  const r = runSas([bare, STATUTE_CHUNK], JURIS_CLASSIFICATION);
  const labels = (r.visibleSourceCards || []).map((c) => c.citation || c.normalizedReference || "");
  assert(!labels.some((l) => /CASE|court/i.test(l)), "identity-less court chunk not card-eligible (override requires a usable ref)");
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021F regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
