/**
 * PATCH-06E-006 Tests
 * Issue exact-authority detector extraction.
 *
 * Run: node tests/patch-06e-006-issue-exact-authority-detector-extraction.test.mjs
 */

import assert from "node:assert/strict";

import {
  detectExactAuthority,
  isCreateActAuthorityAlias,
  isSeagateAuthorityAlias,
  isTrainLawAuthorityAlias
} from "../issue-exact-authority-detector.js";
import {
  classify,
  detectExactAuthority as classifierDetectExactAuthority
} from "../issue-classification-engine.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function assertAuthority(query, expected) {
  const extracted = detectExactAuthority(query);
  const reexported = classifierDetectExactAuthority(query);
  assert.deepEqual(extracted, expected, `${query}: extracted detector result`);
  assert.deepEqual(reexported, expected, `${query}: classifier re-export result`);
}

test("CREATE and TRAIN named-law aliases preserve exact authority canonicalization", () => {
  assert.equal(isCreateActAuthorityAlias("What is the CREATE Act?"), true);
  assert.equal(isCreateActAuthorityAlias("What does create mean?"), false);
  assert.equal(isTrainLawAuthorityAlias("What is the TRAIN Law?"), true);
  assert.equal(isTrainLawAuthorityAlias("What is TRAIN?"), false);

  assertAuthority("What is the CREATE Act?", {
    detected: true,
    type: "STATUTE",
    reference: "RA 11534",
    number: "11534",
    year: null
  });
  assertAuthority("What is the Tax Reform for Acceleration and Inclusion Act?", {
    detected: true,
    type: "STATUTE",
    reference: "RA 10963",
    number: "10963",
    year: null
  });
});

test("statute and NIRC exact authority recognition is preserved", () => {
  assertAuthority("What is RA 10963?", {
    detected: true,
    type: "STATUTE",
    reference: "RA 10963",
    number: "10963",
    year: null
  });
  assertAuthority("What is Republic Act No. 11534?", {
    detected: true,
    type: "STATUTE",
    reference: "RA 11534",
    number: "11534",
    year: null
  });
  assertAuthority("What does NIRC Section 57 provide?", {
    detected: true,
    type: "STATUTE",
    reference: "NIRC Sec. 57",
    number: "57",
    year: null
  });
});

test("administrative authority aliases preserve registry-backed results", () => {
  assertAuthority("What does RR 2-98 provide on expanded withholding tax?", {
    detected: true,
    type: "RR",
    reference: "RR No. 2-1998",
    number: "2",
    year: "1998"
  });
  assertAuthority("What is RMC 65-2012?", {
    detected: true,
    type: "RMC",
    reference: "RMC No. 65-2012",
    number: "65",
    year: "2012"
  });
  assertAuthority("What is RMO 20-2013?", {
    detected: true,
    type: "RMO",
    reference: "RMO No. 20-2013",
    number: "20",
    year: "2013"
  });
});

test("court exact authority recognition is preserved", () => {
  assert.equal(isSeagateAuthorityAlias("CIR v. Seagate"), true);
  assert.equal(isSeagateAuthorityAlias("Seagate case"), true);
  assert.equal(isSeagateAuthorityAlias("VAT case"), false);

  assertAuthority("What is CTA Case No. 9369?", {
    detected: true,
    type: "CTA_DIVISION",
    reference: "CTA Case No. 9369",
    number: "9369",
    year: null
  });
  assertAuthority("CTA Case 9369", {
    detected: true,
    type: "CTA_DIVISION",
    reference: "CTA Case No. 9369",
    number: "9369",
    year: null
  });
  assertAuthority("Discuss G.R. No. 203335.", {
    detected: true,
    type: "SUPREME_COURT",
    reference: "G.R. No. 203335",
    number: "203335",
    year: null
  });
  assertAuthority("CIR v. Seagate", {
    detected: true,
    type: "SUPREME_COURT",
    reference: "G.R. No. 153866",
    number: "153866",
    year: null
  });
  assertAuthority("Seagate case", {
    detected: true,
    type: "SUPREME_COURT",
    reference: "G.R. No. 153866",
    number: "153866",
    year: null
  });
});

test("generic and excluded authorities remain unpromoted", () => {
  assertAuthority("What is TRAIN?", {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  });
  assertAuthority("What is a Republic Act?", {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  });
  assert.equal(classify("What is BIR Ruling DA-489-03?").exactAuthority.detected, false);
});

test("classifier behavior still consumes extracted exact authority without mode drift", () => {
  const train = classify("What is the TRAIN Law?");
  assert.equal(train.exactAuthority.reference, "RA 10963");
  assert.equal(train.retrievalStrategy, "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC");
  assert.equal(train.responseMode, "STANDARD");

  const create = classify("What is the CREATE Act?");
  assert.equal(create.exactAuthority.reference, "RA 11534");
  assert.equal(create.retrievalStrategy, "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC");
  assert.equal(create.responseMode, "STANDARD");
});

console.log(`\nPATCH-06E-006 issue exact-authority detector extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
