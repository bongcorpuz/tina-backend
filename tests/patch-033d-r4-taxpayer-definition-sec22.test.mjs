/**
 * PATCH-033D-R4 Tests
 * Taxpayer-status definitions route to NIRC Sec. 22 only with tax/NIRC context.
 *
 * Run: node tests/patch-033d-r4-taxpayer-definition-sec22.test.mjs
 */

import { classify } from "../issue-classification-engine.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";

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

function plansNirc22(cls = {}) {
  return (
    cls.primaryIssue === "INCOME_TAX" &&
    cls.domainCode === "CIT" &&
    cls.subIssue === "TAXPAYER_DEFINITION" &&
    Array.isArray(cls.targetAuthorities) &&
    cls.targetAuthorities.length === 1 &&
    cls.targetAuthorities[0] === "NIRC Sec. 22" &&
    Array.isArray(cls.controllingAuthorities) &&
    cls.controllingAuthorities.length === 1 &&
    cls.controllingAuthorities[0] === "NIRC Sec. 22"
  );
}

function assertNirc22Plan(query) {
  const cls = classify(query);
  assert(plansNirc22(cls), `${query} -> NIRC Sec. 22 controlling`);
  assert(cls.responseMode !== "SOURCE", `${query} is not source lookup`);
  assert(cls.orchestrationMode !== "SOURCE_LOOKUP", `${query} orchestration is not SOURCE_LOOKUP`);
  assert(cls.responseMode === "STANDARD", `${query} uses standard legal answer mode`);
}

function assertNotNirc22Plan(query) {
  const cls = classify(query);
  assert(cls.subIssue !== "TAXPAYER_DEFINITION", `${query} is not TAXPAYER_DEFINITION`);
  assert(!(cls.controllingAuthorities || []).includes("NIRC Sec. 22"), `${query} does not force NIRC Sec. 22`);
}

group("Positive NIRC Sec. 22 taxpayer-definition mapping", () => {
  const positives = [
    "What is a nonresident citizen under the NIRC?",
    "What is a resident foreign corporation under the NIRC?",
    "Define domestic corporation under the NIRC.",
    "Define foreign corporation under the NIRC.",
    "What is a taxpayer under the NIRC?"
  ];

  for (const query of positives) assertNirc22Plan(query);

  const exact = classify("NIRC Sec. 22");
  assert((exact.controllingAuthorities || []).includes("NIRC Sec. 22"), "NIRC Sec. 22 remains controlling");
});

group("Clarification controls for ambiguous taxpayer-status terms", () => {
  const controls = [
    "What is a nonresident citizen?",
    "What is a resident citizen?",
    "What is a nonresident alien?"
  ];

  for (const query of controls) {
    const boundary = detectPhilippineTaxBoundary(query, "/ask");
    assert(boundary.decision === "CLARIFY", `${query} returns boundary CLARIFY`);
    assert(boundary.reason === "tax_adjacent_needs_context", `${query} uses tax-adjacent clarification reason`);
    assertNotNirc22Plan(query);
  }
});

group("Non-overcapture controls", () => {
  const controls = [
    "What is citizenship?",
    "What is immigration status?",
    "What is a corporation?",
    "What is a foreign corporation?"
  ];

  for (const query of controls) assertNotNirc22Plan(query);
});

group("Regression controls", () => {
  const residentScope = classify("Are resident citizens taxable only on Philippine-source income?");
  assert(residentScope.subIssue === "RESIDENT_CITIZEN_INCOME_SCOPE", "resident citizen income-source query remains Sec. 23 scope");
  assert((residentScope.controllingAuthorities || []).includes("NIRC Sec. 23"), "resident citizen income-source query controls on NIRC Sec. 23");

  const vat = classify("What is VAT?");
  assert(vat.subIssue === "VAT_DEFINITION", "What is VAT? remains VAT_DEFINITION");
  assert((vat.controllingAuthorities || []).includes("NIRC Sec. 105"), "What is VAT? keeps NIRC Sec. 105");

  const rrFull = classify("Revenue Regulations No. 2-1998");
  assert(rrFull.exactAuthority?.reference === "RR No. 2-1998", "Revenue Regulations No. 2-1998 remains exact admin authority");

  const cta = classify("CTA Case No. 9369");
  assert(cta.exactAuthority?.reference === "CTA Case No. 9369", "CTA Case No. 9369 remains exact court authority");

  const rr = classify("RR 2-98");
  assert(rr.exactAuthority?.reference === "RR No. 2-1998", "RR 2-98 remains exact admin authority");
});

console.log(`\nPATCH-033D-R4 taxpayer-definition Sec. 22 tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
