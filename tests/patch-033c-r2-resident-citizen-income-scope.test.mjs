/**
 * PATCH-033C-R2 Tests
 * Resident-citizen income/source-scope authority planning.
 *
 * Run: node tests/patch-033c-r2-resident-citizen-income-scope.test.mjs
 */

import { classify } from "../issue-classification-engine.js";

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

function hasOnlyNirc23Plan(cls) {
  return (
    cls.primaryIssue === "INCOME_TAX" &&
    cls.primaryDomain === "CIT" &&
    cls.subIssue === "RESIDENT_CITIZEN_INCOME_SCOPE" &&
    Array.isArray(cls.targetAuthorities) &&
    cls.targetAuthorities.length === 1 &&
    cls.targetAuthorities[0] === "NIRC Sec. 23" &&
    Array.isArray(cls.controllingAuthorities) &&
    cls.controllingAuthorities.length === 1 &&
    cls.controllingAuthorities[0] === "NIRC Sec. 23"
  );
}

group("Positive resident-citizen income/source-scope queries", () => {
  const positives = [
    "What income is taxable to a resident citizen?",
    "Are resident citizens taxable only on Philippine-source income?",
    "Is a resident citizen taxable on worldwide income?",
    "Are resident citizens taxable on income within and without the Philippines?"
  ];

  for (const query of positives) {
    const cls = classify(query);
    assert(hasOnlyNirc23Plan(cls), `${query} -> NIRC Sec. 23 controlling`);
    assert(
      cls.retrievalStrategy !== "VAT_DEFINITION_AUTHORITY_FIRST",
      `${query} does not enter VAT definition path`
    );
  }
});

group("Negative non-overcapture controls", () => {
  const negatives = [
    "What is a nonresident citizen?",
    "What is a resident foreign corporation?",
    "What is citizenship?",
    "What is immigration status?"
  ];

  for (const query of negatives) {
    const cls = classify(query);
    assert(
      cls.subIssue !== "RESIDENT_CITIZEN_INCOME_SCOPE",
      `${query} is not resident-citizen income scope`
    );
    assert(
      !(cls.controllingAuthorities || []).includes("NIRC Sec. 23"),
      `${query} does not promote NIRC Sec. 23`
    );
  }
});

group("Regression controls", () => {
  const vat = classify("What is VAT?");
  assert(vat.subIssue === "VAT_DEFINITION", "What is VAT? remains VAT_DEFINITION");
  assert(vat.retrievalStrategy === "VAT_DEFINITION_AUTHORITY_FIRST", "What is VAT? keeps VAT retrieval strategy");
  assert((vat.controllingAuthorities || []).includes("NIRC Sec. 105"), "What is VAT? still controls on NIRC Sec. 105");

  const vatSubject = classify("Who is subject to VAT?");
  assert(vatSubject.subIssue === "VAT_OVERVIEW", "Who is subject to VAT? remains VAT_OVERVIEW");
  assert((vatSubject.controllingAuthorities || []).includes("NIRC Sec. 105"), "Who is subject to VAT? keeps NIRC Sec. 105");

  const bir = classify("What is the BIR?");
  assert(bir.primaryIssue === "BIR_ORGANIZATION", "What is the BIR? remains BIR_ORGANIZATION");
  assert(!(bir.controllingAuthorities || []).includes("NIRC Sec. 23"), "What is the BIR? does not promote NIRC Sec. 23");

  const rr = classify("RR 2-98");
  assert(rr.exactAuthority?.reference === "RR No. 2-1998", "RR 2-98 exact authority remains recognized");

  const cta = classify("CTA Case No. 9369");
  assert(cta.exactAuthority?.reference === "CTA Case No. 9369", "CTA Case No. 9369 exact authority remains recognized");

  const ewt = classify("Explain EWT");
  assert(ewt.primaryIssue === "WITHHOLDING", "Explain EWT remains WITHHOLDING");
  assert((ewt.controllingAuthorities || []).includes("NIRC Sec. 57"), "Explain EWT keeps NIRC Sec. 57");
});

console.log(`\nPATCH-033C-R2 resident-citizen income-scope tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
