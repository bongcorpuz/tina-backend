/**
 * PATCH-06E-010 - Unavailable BIR Ruling SourceAvailability Guard
 *
 * Run: node tests/patch-06e-010-unavailable-bir-ruling-sourceavailability-guard.test.mjs
 *
 * Verifies that specific BIR Ruling-number queries cannot be upgraded to
 * AUTHORITY_FOUND by unrelated G.R./NIRC substitute candidates while ordinary
 * BIR, NIRC, jurisprudence, and CTA behavior remains unchanged.
 */

"use strict";

import assert from "node:assert/strict";
import { classifyTaxIssue as classify } from "../issue-classification-engine.js";
import { annotateAuthorityCandidates } from "../authority-utils.js";
import { classifySourceAvailability } from "../pipeline.js";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    failed++;
  }
}

function candidate({
  authorityType = "STATUTE",
  citation = "NIRC Sec. 2",
  source = "01-tax-code/nirc-1997-ra-10963-(bir).pdf",
  title = citation,
  retrievalLayer = "LAYER_1_EXACT_NORMALIZED_AUTHORITY",
  text = "Bureau of Internal Revenue authority and Philippine tax source material."
} = {}) {
  return {
    authorityType,
    normalizedReference: citation,
    citation,
    source,
    title,
    document_title: title,
    text,
    retrievalLayer,
    isIndexed: true,
    parseStatus: "success",
    exactAuthorityMatch: true,
    targetAuthorityMatch: true,
    higherAuthorityMissing: false,
    authorityLevel:
      authorityType === "STATUTE" ? 2 :
      authorityType === "SUPREME_COURT" ? 4 :
      authorityType === "CTA_DIVISION" ? 7 :
      authorityType === "BIR_RULING" ? 10 :
      9
  };
}

function availabilityFor(query, candidates) {
  const issueClassification = classify(query);
  const annotatedCandidates = annotateAuthorityCandidates(candidates, { issueClassification });
  return classifySourceAvailability({
    query,
    issueClassification,
    annotatedCandidates,
    outcomeCategory: "CANDIDATES_RETURNED"
  });
}

function assertSpecificBirRulingGuard(query) {
  const cls = classify(query);
  assert.equal(cls.exactAuthority.detected, false, "BIR Ruling remains outside exact-authority detector");
  assert.equal(cls.specificBirRulingQuery, true, "specific BIR Ruling query flag is set");
  assert.match(cls.specificBirRulingReference, /^BIR Ruling /);

  const availability = availabilityFor(query, [
    candidate({
      authorityType: "SUPREME_COURT",
      citation: "G.R. No. 187485",
      source: "06-court-cases/g.r.-no.-187485.-october-08-2013.pdf",
      title: "G.R. No. 187485"
    }),
    candidate({
      authorityType: "SUPREME_COURT",
      citation: "G.R. No. 226592",
      source: "06-court-cases/g.r.-no.-226592.-july-27-2021.pdf",
      title: "G.R. No. 226592"
    }),
    candidate({ authorityType: "STATUTE", citation: "NIRC Sec. 2" })
  ]);

  assert.notEqual(
    availability.saeStatus,
    "AUTHORITY_FOUND",
    `${query}: unrelated G.R./NIRC candidates must not produce AUTHORITY_FOUND`
  );
  assert.equal(
    availability.eligibleCandidates.length,
    0,
    `${query}: unrelated substitutes are not eligible governing candidates`
  );
}

await test("specific unavailable BIR Ruling queries do not become AUTHORITY_FOUND", () => {
  for (const query of [
    "What is BIR Ruling DA-489-03?",
    "BIR Ruling DA-489-03",
    "Explain BIR Ruling DA-489-03",
    "BIR Ruling DA 489 03"
  ]) {
    assertSpecificBirRulingGuard(query);
  }
});

await test("matching BIR_RULING candidate remains directly governing when the source exists", () => {
  const query = "What is BIR Ruling DA-489-03?";
  const issueClassification = classify(query);
  const annotated = annotateAuthorityCandidates([
    candidate({
      authorityType: "BIR_RULING",
      citation: "BIR Ruling DA-489-03",
      source: "05-bir-rulings/bir-ruling-da-489-03.pdf",
      title: "BIR Ruling DA-489-03",
      text: "BIR Ruling DA-489-03 official indexed source.",
      authorityMatchTier: 1
    })
  ], { issueClassification });

  assert.equal(annotated[0].directlyGovernsIssue, true);
  assert.equal(annotated[0].authorityRole, "GOVERNING");
});

await test("general BIR definition behavior remains unchanged", () => {
  const cls = classify("What is BIR?");
  assert.equal(cls.specificBirRulingQuery, false);

  const availability = availabilityFor("What is BIR?", [
    candidate({ authorityType: "STATUTE", citation: "NIRC Sec. 2" })
  ]);

  assert.equal(availability.saeStatus, "AUTHORITY_FOUND");
});

await test("direct NIRC Section 2 and Section 3 behavior remains unchanged", () => {
  for (const [query, ref] of [
    ["What is NIRC Section 2?", "NIRC Sec. 2"],
    ["What is NIRC Section 3?", "NIRC Sec. 3"]
  ]) {
    const availability = availabilityFor(query, [
      candidate({ authorityType: "STATUTE", citation: ref })
    ]);
    assert.equal(availability.saeStatus, "AUTHORITY_FOUND", `${query} remains AUTHORITY_FOUND`);
  }
});

await test("jurisprudence and CTA behavior remains unchanged", () => {
  const jurisprudence = availabilityFor("Are there jurisprudence cases on withholding tax?", [
    candidate({
      authorityType: "CTA_DIVISION",
      citation: "CTA Case No. 9711",
      source: "06-court-cases/cta-case-no.-9711-dizon-farms-produce-inc.-v.-cir.pdf",
      title: "CTA Case No. 9711",
      text: "CTA Case No. 9711 jurisprudence cases on withholding tax."
    })
  ]);
  assert.equal(jurisprudence.saeStatus, "RELATED_AUTHORITY_ONLY");

  const cta = availabilityFor("What is CTA Case No. 9369?", [
    candidate({
      authorityType: "CTA_DIVISION",
      citation: "CTA Case No. 9369",
      source: "06-court-cases/cta-cases-on-vat-refund-substantiation/cta-case-no.-9369-taganito-mining-corporation-v.-cir.pdf",
      title: "CTA Case No. 9369",
      text: "CTA Case No. 9369 court tax case source."
    })
  ]);
  assert.equal(cta.saeStatus, "RELATED_AUTHORITY_ONLY");
});

console.log(`\nPATCH-06E-010 unavailable BIR Ruling guard tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
