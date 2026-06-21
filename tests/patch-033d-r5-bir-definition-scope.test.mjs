/**
 * PATCH-033D-R5 Tests
 * BIR definition authority scope: Sec. 2/3 for BIR organization, Sec. 21 for
 * national internal revenue taxes.
 *
 * Run: node tests/patch-033d-r5-bir-definition-scope.test.mjs
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

function authorities(cls = {}) {
  return {
    target: cls.targetAuthorities || [],
    controlling: cls.controllingAuthorities || [],
    supporting: cls.supportingAuthorities || []
  };
}

function hasOnlySec2And3(values = []) {
  return (
    values.length === 2 &&
    values[0] === "NIRC Sec. 2" &&
    values[1] === "NIRC Sec. 3"
  );
}

function assertBirDefinitionPlan(query) {
  const cls = classify(query);
  const a = authorities(cls);
  assert(cls.primaryIssue === "BIR_ORGANIZATION", `${query}: BIR_ORGANIZATION`);
  assert(cls.subIssue === "BIR_DEFINITION", `${query}: BIR_DEFINITION`);
  assert(hasOnlySec2And3(a.target), `${query}: targets Sec. 2 and Sec. 3 only`);
  assert(hasOnlySec2And3(a.controlling), `${query}: controls on Sec. 2 and Sec. 3`);
  assert(!a.supporting.includes("NIRC Sec. 21"), `${query}: Sec. 21 not supporting`);
  assert(!a.target.includes("NIRC Sec. 21"), `${query}: Sec. 21 not target`);
}

function assertBirOverviewPlan(query) {
  const cls = classify(query);
  const a = authorities(cls);
  assert(cls.subIssue === "BIR_OVERVIEW", `${query}: BIR_OVERVIEW`);
  assert(hasOnlySec2And3(a.target), `${query}: keeps Sec. 2 and Sec. 3`);
  assert(!a.target.includes("NIRC Sec. 21"), `${query}: does not target Sec. 21`);
}

function assertTaxClassificationPlan(query) {
  const cls = classify(query);
  const a = authorities(cls);
  assert(cls.primaryIssue === "BIR_ORGANIZATION", `${query}: BIR_ORGANIZATION`);
  assert(cls.subIssue === "TAX_CLASSIFICATION", `${query}: TAX_CLASSIFICATION`);
  assert(a.target.length === 1 && a.target[0] === "NIRC Sec. 21", `${query}: targets only Sec. 21`);
  assert(a.controlling.length === 1 && a.controlling[0] === "NIRC Sec. 21", `${query}: controls only on Sec. 21`);
  assert(!a.target.includes("NIRC Sec. 2") && !a.target.includes("NIRC Sec. 3"), `${query}: does not use BIR Sec. 2/3 definition plan`);
}

group("Basic BIR definitions exclude NIRC Sec. 21", () => {
  assertBirDefinitionPlan("What is the BIR?");
  assertBirDefinitionPlan("What is BIR?");
  assertBirDefinitionPlan("Define BIR.");
});

group("BIR overview still uses organizational provisions", () => {
  assertBirOverviewPlan("What does the Bureau of Internal Revenue do?");
});

group("National internal revenue tax scope uses NIRC Sec. 21", () => {
  assertTaxClassificationPlan("What are national internal revenue taxes?");
  assertTaxClassificationPlan("What is the scope of national internal revenue taxes?");

  const exact = classify("What does NIRC Sec. 21 provide?");
  assert(exact.exactAuthority?.reference === "NIRC Sec. 21", "NIRC Sec. 21 exact authority is detected");
  assert((exact.controllingAuthorities || []).includes("NIRC Sec. 21"), "NIRC Sec. 21 exact query keeps Sec. 21 controlling");
});

group("Regression controls", () => {
  const taxpayer = classify("What is a taxpayer under the NIRC?");
  assert(taxpayer.subIssue === "TAXPAYER_DEFINITION", "PATCH-033D-R4 taxpayer definition remains TAXPAYER_DEFINITION");
  assert((taxpayer.controllingAuthorities || []).includes("NIRC Sec. 22"), "PATCH-033D-R4 taxpayer definition still controls on Sec. 22");

  const residentScope = classify("Are resident citizens taxable only on Philippine-source income?");
  assert(residentScope.subIssue === "RESIDENT_CITIZEN_INCOME_SCOPE", "resident-citizen income-source remains Sec. 23 scope");
  assert((residentScope.controllingAuthorities || []).includes("NIRC Sec. 23"), "resident-citizen income-source controls on Sec. 23");

  const vat = classify("What is VAT?");
  assert(vat.subIssue === "VAT_DEFINITION", "What is VAT? remains VAT_DEFINITION");
  assert((vat.supportingAuthorities || []).includes("RR 16-2005"), "What is VAT? keeps RR 16-2005 support");

  const rrFull = classify("Revenue Regulations No. 2-1998");
  assert(rrFull.exactAuthority?.reference === "RR No. 2-1998", "Revenue Regulations No. 2-1998 remains exact admin authority");

  const cta = classify("CTA Case No. 9369");
  assert(cta.exactAuthority?.reference === "CTA Case No. 9369", "CTA Case No. 9369 remains exact court authority");

  const rr = classify("RR 2-98");
  assert(rr.exactAuthority?.reference === "RR No. 2-1998", "RR 2-98 remains exact admin authority");
});

console.log(`\nPATCH-033D-R5 BIR definition scope tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
