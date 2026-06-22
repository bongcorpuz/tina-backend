import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMINISTRATIVE_AUTHORITY_TYPES,
  EXACT_ADMINISTRATIVE_AUTHORITY_TYPES,
  normalizeAdminAuthorityYear,
  normalizeAdministrativeAuthorityReference,
  detectAdministrativeAuthorityReference,
  isExactAdministrativeAuthorityLookup
} from "../authority-alias-registry.js";
import { classify, detectExactAuthority } from "../issue-classification-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ISSUE_CLASSIFICATION_SRC = readFileSync(join(__dirname, "..", "issue-classification-engine.js"), "utf8");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    return;
  }
  passed += 1;
  console.log(`PASS ${name}`);
}

function assertExact(query, expected) {
  assert.deepEqual(detectAdministrativeAuthorityReference(query), expected);
  assert.deepEqual(detectExactAuthority(query), expected);
}

function assertControlling(query, reference) {
  const classification = classify(query);
  assert.equal(classification.exactAuthority?.reference, reference);
  assert.equal(classification.controllingAuthorities.includes(reference), true);
  assert.equal(classification.supportingAuthorities.includes(reference), false);
  assert.equal(classification.retrievalStrategy, "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC");
}

await test("registry exports expected administrative helper primitives", () => {
  assert.deepEqual(ADMINISTRATIVE_AUTHORITY_TYPES, ["RR", "RMC", "RMO", "RAMO"]);
  assert.deepEqual(EXACT_ADMINISTRATIVE_AUTHORITY_TYPES, ["RR", "RMC", "RMO", "RAMO"]);
  assert.equal(typeof normalizeAdminAuthorityYear, "function");
  assert.equal(typeof normalizeAdministrativeAuthorityReference, "function");
  assert.equal(typeof detectAdministrativeAuthorityReference, "function");
  assert.equal(typeof isExactAdministrativeAuthorityLookup, "function");
});

await test("classifier keeps detectExactAuthority compatibility wrapper behavior", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /import\s+\{[\s\S]*detectAdministrativeAuthorityReference[\s\S]*\}\s+from\s+["']\.\/authority-alias-registry\.js["'];/
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+detectExactAuthority\s*\(\s*question\s*=\s*["']{2}\s*\)/
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /const\s+administrativeAuthority\s*=\s*detectAdministrativeAuthorityReference\(value\);/
  );
});

await test("registry normalizes administrative authority years and references", () => {
  assert.equal(normalizeAdminAuthorityYear("98"), "1998");
  assert.equal(normalizeAdminAuthorityYear("1998"), "1998");
  assert.deepEqual(
    normalizeAdministrativeAuthorityReference("rr", "02", "98"),
    {
      detected: true,
      type: "RR",
      reference: "RR No. 2-1998",
      number: "2",
      year: "1998"
    }
  );
});

await test("RR variants preserve exact authority shape", () => {
  const expected = {
    detected: true,
    type: "RR",
    reference: "RR No. 2-1998",
    number: "2",
    year: "1998"
  };

  assertExact("RR 2-98", expected);
  assertExact("RR 2-1998", expected);
  assertExact("RR No. 2-1998", expected);
  assertExact("Revenue Regulations No. 2-1998", expected);
});

await test("RMC/RMO/RAMO short and full names preserve exact authority shape", () => {
  assertExact("RMC 65-2012", {
    detected: true,
    type: "RMC",
    reference: "RMC No. 65-2012",
    number: "65",
    year: "2012"
  });
  assertExact("Revenue Memorandum Circular No. 65-2012", {
    detected: true,
    type: "RMC",
    reference: "RMC No. 65-2012",
    number: "65",
    year: "2012"
  });
  assertExact("RMO 20-2013", {
    detected: true,
    type: "RMO",
    reference: "RMO No. 20-2013",
    number: "20",
    year: "2013"
  });
  assertExact("Revenue Memorandum Order No. 20-2013", {
    detected: true,
    type: "RMO",
    reference: "RMO No. 20-2013",
    number: "20",
    year: "2013"
  });
  assertExact("RAMO 1-2000", {
    detected: true,
    type: "RAMO",
    reference: "RAMO No. 1-2000",
    number: "1",
    year: "2000"
  });
  assertExact("Revenue Audit Memorandum Order No. 1-2000", {
    detected: true,
    type: "RAMO",
    reference: "RAMO No. 1-2000",
    number: "1",
    year: "2000"
  });
});

await test("admin lookup query-shape helper preserves dependency injection behavior", () => {
  const rr = detectExactAuthority("RR 2-98");
  assert.equal(isExactAdministrativeAuthorityLookup("RR 2-98", rr), true);
  assert.equal(isExactAdministrativeAuthorityLookup("What does RR 2-98 provide?", rr), true);
  assert.equal(
    isExactAdministrativeAuthorityLookup("Custom injected source request", rr, {
      detectDefinitionPattern: () => false,
      detectOverviewPattern: () => false,
      detectSourcePattern: () => true
    }),
    true
  );
  assert.equal(isExactAdministrativeAuthorityLookup("RR 2-98 and EWT rates", rr), false);
});

await test("exact admin query shapes still promote only when lookup wrapper says yes", () => {
  assertControlling("RR 2-98", "RR No. 2-1998");
  assertControlling("Revenue Regulations No. 2-1998", "RR No. 2-1998");
  assertControlling("RMC 65-2012", "RMC No. 65-2012");
  assertControlling("RMO 20-2013", "RMO No. 20-2013");
  assertControlling("RAMO 1-2000", "RAMO No. 1-2000");
});

await test("compound substantive query does not promote admin authority over NIRC controls", () => {
  const classification = classify("RR 2-98 and EWT rates");
  assert.equal(classification.exactAuthority?.reference, "RR No. 2-1998");
  assert.equal(classification.controllingAuthorities.includes("RR No. 2-1998"), false);
  assert.equal(classification.controllingAuthorities.includes("NIRC Sec. 57"), true);
  assert.equal(classification.controllingAuthorities.includes("NIRC Sec. 58"), true);
  assert.equal(classification.supportingAuthorities.includes("RR No. 2-1998"), true);
});

await test("compare and multi-authority queries do not arbitrarily promote later admin authorities", () => {
  const compared = classify("Compare RR 2-98 and RR 12-2018");
  assert.equal(compared.exactAuthority?.reference, "RR No. 2-1998");
  assert.equal(compared.controllingAuthorities.some((a) => /\bRR\s+No\.\s*(?:2-1998|12-2018)\b/i.test(a)), false);

  const multi = classify("Explain estate tax under RR 12-2018 and RMC 65-2012");
  const multiAdminControls = multi.controllingAuthorities.filter((a) =>
    /\b(?:RR|RMC|RMO|RAMO)\s+No\.\s*\d+/i.test(a)
  );
  assert.equal(multiAdminControls.includes("RMC No. 65-2012"), false);
  assert.equal(multiAdminControls.length <= 1, true);
});

await test("BIR ruling exact-looking query remains outside exact admin promotion", () => {
  const exact = detectExactAuthority("What does BIR Ruling No. 016-2024 provide on VAT refund?");
  const classification = classify("What does BIR Ruling No. 016-2024 provide on VAT refund?");
  assert.equal(exact.detected, false);
  assert.equal(classification.exactAuthority?.detected, false);
  assert.equal(
    classification.controllingAuthorities.some((a) => /BIR Ruling No\. 016-2024/i.test(a)),
    false
  );
});

await test("CTA Case No. 9369 remains court authority behavior", () => {
  const exact = detectExactAuthority("CTA Case No. 9369");
  const classification = classify("CTA Case No. 9369");
  assert.equal(exact.detected, true);
  assert.equal(exact.type, "CTA_DIVISION");
  assert.equal(exact.reference, "CTA Case No. 9369");
  assert.equal(classification.controllingAuthorities.includes("CTA Case No. 9369"), false);
  assert.equal(classification.supportingJurisprudence.includes("CTA Case No. 9369"), true);
  assert.equal(classification.responseMode, "CASE_ANALYSIS");
  assert.equal(classification.orchestrationMode, "CASE_ANALYSIS");
});

await test("classifier keeps buildAuthorities and route strategy logic local", () => {
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+buildAuthorities\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectRetrievalStrategy\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectResponseMode\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectOrchestrationMode\s*\(/);
});

console.log(`\nPATCH-034F-1 authority-alias registry extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
