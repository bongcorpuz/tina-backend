/**
 * PATCH-027M Regression Tests
 * Exact administrative-authority query-shape coverage.
 *
 * Verifies that exact numbered RR/RMC/RMO/RAMO questions with narrow
 * provide/say/state/cover/discuss topic modifiers are treated as exact
 * administrative authority lookups for authority-plan purposes.
 *
 * Run: node tests/patch-027m-exact-admin-query-shape.test.mjs
 */

import { classify, detectExactAuthority } from "../issue-classification-engine.js";

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
  console.log(`\n-- ${name}`);
  fn();
}

function assertExactAdminPromoted(query, expectedType, expectedRef) {
  const exact = detectExactAuthority(query);
  const cls = classify(query);

  assert(exact.detected === true, `${query}: exact authority detected`);
  assert(exact.type === expectedType, `${query}: exact authority type is ${expectedType}`);
  assert(exact.reference === expectedRef, `${query}: normalized to ${expectedRef}`);
  assert(
    cls.controllingAuthorities.includes(expectedRef),
    `${query}: ${expectedRef} in controllingAuthorities`
  );
  assert(
    !cls.supportingAuthorities.includes(expectedRef),
    `${query}: ${expectedRef} not duplicated in supportingAuthorities`
  );
  assert(
    cls.targetAuthorities.includes(expectedRef),
    `${query}: ${expectedRef} in targetAuthorities`
  );
}

function assertNotPromoted(query, forbiddenRef, label) {
  const cls = classify(query);
  assert(
    !cls.controllingAuthorities.includes(forbiddenRef),
    `${label}: ${forbiddenRef} not in controllingAuthorities`
  );
}

group("Positive: exact administrative authority topic-modifier lookups", () => {
  assertExactAdminPromoted(
    "What does RR 12-2018 provide on estate tax?",
    "RR",
    "RR No. 12-2018"
  );

  assertExactAdminPromoted(
    "What does Revenue Regulations No. 12-2018 provide on estate tax?",
    "RR",
    "RR No. 12-2018"
  );

  assertExactAdminPromoted(
    "What does RMC 65-2012 say about withholding tax?",
    "RMC",
    "RMC No. 65-2012"
  );

  assertExactAdminPromoted(
    "What does RMO 20-2013 state regarding tax audit?",
    "RMO",
    "RMO No. 20-2013"
  );

  assertExactAdminPromoted(
    "What does RMO 24-2013 cover?",
    "RMO",
    "RMO No. 24-2013"
  );

  assertExactAdminPromoted(
    "What does RAMO 1-2020 discuss?",
    "RAMO",
    "RAMO No. 1-2020"
  );
});

group("Negative: generic and out-of-scope shapes are not promoted", () => {
  const genericBir = classify("What BIR issuances apply to estate tax?");
  assert(
    genericBir.controllingAuthorities.every((a) => !/\b(?:RR|RMC|RMO|RAMO)\s+No\.\s*\d+/i.test(a)),
    "generic BIR issuance query: no numbered administrative authority promoted"
  );

  const genericRegs = classify("What regulations apply to withholding tax?");
  assert(
    genericRegs.controllingAuthorities.every((a) => !/\b(?:RR|RMC|RMO|RAMO)\s+No\.\s*\d+/i.test(a)),
    "generic regulations query: no numbered administrative authority promoted"
  );

  assertNotPromoted(
    "What does RR 12-2019 provide on estate tax?",
    "RR No. 12-2018",
    "near-match RR 12-2019"
  );

  const multi = classify("Explain estate tax under RR 12-2018 and RMC 65-2012");
  const multiAdminControls = multi.controllingAuthorities.filter((a) =>
    /\b(?:RR|RMC|RMO|RAMO)\s+No\.\s*\d+/i.test(a)
  );
  assert(
    multiAdminControls.length <= 1,
    "multi-authority query: does not arbitrarily promote multiple administrative authorities"
  );
  assert(
    !multiAdminControls.includes("RMC No. 65-2012"),
    "multi-authority query: does not promote later RMC as wrong governing authority"
  );

  const birRuling = classify("What does BIR Ruling No. 016-2024 provide on VAT refund?");
  assert(
    !birRuling.controllingAuthorities.some((a) => /BIR Ruling No\. 016-2024/i.test(a)),
    "BIR Ruling No. 016-2024 remains out of exact-admin promotion scope"
  );
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027M  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
