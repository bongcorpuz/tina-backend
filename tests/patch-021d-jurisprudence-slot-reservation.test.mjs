/**
 * PATCH-021D Regression Tests
 * Jurisprudence Retrieval Slot Reservation
 *
 * Run: node tests/patch-021d-jurisprudence-slot-reservation.test.mjs
 *
 * retrieval-engine.js imports env-free, so the slot-reservation logic is
 * tested directly against the REAL production functions with mock docs.
 * The recovery wiring and gating are verified by source scan (consistent
 * with the 019A/021A/021B/021C suites). Classifier signals come from the
 * real classify() import.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify } from "../issue-classification-engine.js";
import {
  patch021dDocCourtType,
  patch021dCourtRank,
  patch021dReserveJurisprudenceSlots
} from "../retrieval-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_SRC = readFileSync(join(__dirname, "..", "retrieval-engine.js"), "utf8");

// ─── Test harness ─────────────────────────────────────────────────────────────

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

// ─── Fixtures: 12 statute/RR docs ranked first, courts trailing ───────────────

function statuteDoc(i) {
  return { id: `st-${i}`, authorityType: i < 3 ? "STATUTE" : "RR", normalized_reference: i < 3 ? `NIRC Sec. 5${i}` : "RR 2-98" };
}
const TRAILING_POOL = [
  ...Array.from({ length: 12 }, (_, i) => statuteDoc(i)),
  { id: "cta-1", authorityType: "CTA_DIVISION", normalized_reference: "CTA Case No. 9369" },
  { id: "sc-1", authority_type: "SUPREME_COURT", normalized_reference: "G.R. No. 197515" }
];

// ─── Test 1: case-law query — SC/CTA preserved through consolidation ──────────

group("Test 1 — slot reservation pulls SC and CTA into the final topK", () => {
  const final = patch021dReserveJurisprudenceSlots(TRAILING_POOL, 12);
  const types = final.map((d) => d.authorityType || d.authority_type);
  assert(final.length === 12, `final stays capped at topK (got ${final.length})`);
  assert(types.includes("SUPREME_COURT"), "SUPREME_COURT reserved into final set");
  assert(types.includes("CTA_DIVISION"), "CTA_DIVISION reserved into final set");
  assert(types.includes("STATUTE"), "statute framework source retained");
  assert(final.filter((d) => !patch021dDocCourtType(d)).length >= 1, "at least one statute/RR context source kept");
});

group("Test 1b — courts already inside topK are not duplicated", () => {
  const pool = [
    { id: "sc-1", authorityType: "SUPREME_COURT", normalized_reference: "G.R. No. 1" },
    { id: "cta-1", authorityType: "CTA_EN_BANC", normalized_reference: "CTA EB 1" },
    ...Array.from({ length: 10 }, (_, i) => statuteDoc(i))
  ];
  const final = patch021dReserveJurisprudenceSlots(pool, 12);
  assert(final.length === 12, "no eviction needed — all 12 kept");
  assert(new Set(final.map((d) => d.id)).size === 12, "no duplicates introduced");
  assert(final[0].id === "sc-1" && final[1].id === "cta-1", "existing rank order preserved");
});

group("Test 1c — CTA_EN_BANC outranks CTA_DIVISION for the CTA slot", () => {
  const pool = [
    ...Array.from({ length: 12 }, (_, i) => statuteDoc(i)),
    { id: "cta-div", authorityType: "CTA_DIVISION", normalized_reference: "CTA Case No. 2" },
    { id: "cta-eb", authorityType: "CTA_EN_BANC", normalized_reference: "CTA EB 7" }
  ];
  const final = patch021dReserveJurisprudenceSlots(pool, 12);
  const ids = final.map((d) => d.id);
  assert(ids.includes("cta-eb"), "CTA_EN_BANC chosen for the reserved CTA slot");
  assert(patch021dCourtRank({ authorityType: "CTA_EN_BANC" }) < patch021dCourtRank({ authorityType: "CTA_DIVISION" }), "rank order CTA_EN_BANC < CTA_DIVISION");
});

group("Test 1d — never evicts the last framework source", () => {
  const pool = [
    { id: "st-only", authorityType: "STATUTE", normalized_reference: "NIRC Sec. 57" },
    { id: "sc-a", authorityType: "SUPREME_COURT", normalized_reference: "G.R. No. 1" },
    { id: "sc-b", authorityType: "SUPREME_COURT", normalized_reference: "G.R. No. 2" },
    { id: "cta-a", authorityType: "CTA_DIVISION", normalized_reference: "CTA 1" }
  ];
  const final = patch021dReserveJurisprudenceSlots(pool, 2);
  assert(final.some((d) => d.id === "st-only"), "lone statute framework source survives");
});

// ─── Test 2: no courts available — behavior identical to plain slice ──────────

group("Test 2 — statute-only pool returns the plain topK slice (no fabrication)", () => {
  const pool = Array.from({ length: 15 }, (_, i) => statuteDoc(i));
  const final = patch021dReserveJurisprudenceSlots(pool, 12);
  assert(final.length === 12, "topK respected");
  assert(JSON.stringify(final) === JSON.stringify(pool.slice(0, 12)), "identical to plain slice — no court forced/fabricated");
});

// ─── Test 3: gating — recovery and reservation run only on jurisprudence intent

group("Test 3 — engine wiring gated on isJurisprudenceQuery", () => {
  assert(
    /const\s+_021dIntent\s*=\s*issueClassification\?\.isJurisprudenceQuery\s*===\s*true/.test(ENGINE_SRC),
    "recovery/reservation gated on isJurisprudenceQuery === true"
  );
  assert(ENGINE_SRC.includes("[PATCH_021D_CASELAW_CANDIDATES]"), "case-law candidates diagnostic present");
  assert(ENGINE_SRC.includes("[PATCH_021D_COURT_RECOVERY_APPLIED]"), "recovery diagnostic present");
  assert(ENGINE_SRC.includes("[PATCH_021D_JURISPRUDENCE_SLOT_RESERVATION]"), "slot reservation diagnostic present");
  assert(
    /if\s*\(\s*_021dCourtsInPool\.length\s*===\s*0\s*\)/.test(ENGINE_SRC),
    "recovery runs only when pool has zero court candidates"
  );
  assert(
    /finalSelection\s*=\s*patch021dReserveJurisprudenceSlots\(dedupedAfterScoring,\s*topK,\s*_021dScoredCourts\)/.test(ENGINE_SRC),
    "reservation applied at the final topK slice with scored court carry-through"
  );
  assert(
    /_021dScoredCourts\s*=\s*_021dIntent\s*\?\s*scored\.filter/.test(ENGINE_SRC),
    "court docs captured at scoring time before safe reranks can drop them"
  );
  assert(
    /\.in\("authority_type",\s*\[\.\.\.PATCH_021D_COURT_TYPES\]\)/.test(ENGINE_SRC),
    "recovery select filters by court authority_type"
  );
});

// ─── Test 4: classifier signals route the four spec queries correctly ─────────

group("Test 4 — spec queries carry the correct intent signals", () => {
  const caseQ = classify("Is there court cases in relation to withholding taxes?");
  assert(caseQ.isJurisprudenceQuery === true, "case-law query → isJurisprudenceQuery true (021D active)");

  const ewtAdv = classify("Is advertising service subject to EWT?");
  assert(ewtAdv.isJurisprudenceQuery === false, "'Is advertising service subject to EWT?' → false (fast path intact, no forced slots)");
  assert(ewtAdv.requiresJurisprudence !== true, "advertising EWT carries no jurisprudence flags at all");

  const ewtDef = classify("What is EWT?");
  assert(ewtDef.isJurisprudenceQuery === false, "'What is EWT?' → false (unaffected)");

  const whtDef = classify("What is withholding tax?");
  assert(whtDef.isJurisprudenceQuery === false, "'What is withholding tax?' → false (no court forcing)");
});

// ─── Test 5: PATCH-021B/021C protections untouched ────────────────────────────

group("Test 5 — upstream guards and promotion remain wired", () => {
  const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");
  assert(
    /_patch017fEligible\s*=[\s\S]{0,200}?&&\s*!_patch017fCaseLawGuard/.test(PIPELINE_SRC),
    "PATCH-021B 017F guard retained"
  );
  assert(PIPELINE_SRC.includes("[PATCH_021C_JURISPRUDENCE_SOURCE_PROMOTION]"), "PATCH-021C promotion retained");
  assert(
    /ctx\.saeStatus\s*===\s*"AUTHORITY_FOUND"\s*&&\s*!_fdCaseLawGuard/.test(PIPELINE_SRC),
    "PATCH-021B generation-cap guard retained"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`PATCH-021D regression: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ALL TESTS PASSED");
