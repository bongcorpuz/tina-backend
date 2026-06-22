/**
 * PATCH-034D Tests
 * Source-intent registry extraction with classifier compatibility wrapper.
 *
 * Run: node tests/patch-034d-source-intent-registry-extraction.test.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classify } from "../issue-classification-engine.js";
import {
  detectSourcePattern,
  isExplicitSourceInventoryRequest,
  isIncomeSourceLegalTerm
} from "../source-intent-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ISSUE_CLASSIFICATION_SRC = readFileSync(join(__dirname, "..", "issue-classification-engine.js"), "utf8");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function isSourceLookup(classification = {}) {
  return (
    classification.queryIntent === "source_inventory" ||
    classification.responseMode === "SOURCE" ||
    classification.orchestrationMode === "SOURCE_LOOKUP" ||
    classification.requiresSourceInventory === true
  );
}

const sourceInventoryQueries = [
  "What sources do you have for NIRC Sec. 23?",
  "Show indexed sources for NIRC Sec. 23.",
  "What are your sources for resident citizen taxation?",
  "Show source cards for resident citizen taxation.",
  "Legal basis for NIRC Sec. 23.",
  "Show citations for NIRC Sec. 23.",
  "NIRC Sec. 23 source only.",
  "NIRC Sec. 23 basis only."
];

for (const query of sourceInventoryQueries) {
  await test(`${query} is explicit source inventory`, () => {
    assert.equal(isExplicitSourceInventoryRequest(query), true);
    assert.equal(detectSourcePattern(query), true);
  });
}

const incomeSourceLegalTerms = [
  "Philippine-source income.",
  "foreign-source income.",
  "income from sources within the Philippines.",
  "income from sources without the Philippines.",
  "income from sources within and without the Philippines.",
  "source of income."
];

for (const query of incomeSourceLegalTerms) {
  await test(`${query} is income-source legal terminology, not source inventory`, () => {
    assert.equal(isIncomeSourceLegalTerm(query), true);
    assert.equal(detectSourcePattern(query), false);
  });
}

await test("source inventory query still yields SOURCE_LOOKUP", () => {
  const classification = classify("What sources do you have for NIRC Sec. 23?");
  assert.equal(isSourceLookup(classification), true);
  assert.equal(classification.responseMode, "SOURCE");
  assert.equal(classification.orchestrationMode, "SOURCE_LOOKUP");
});

await test("resident citizen Philippine-source income remains legal NIRC Sec. 23 mode", () => {
  const classification = classify("Are resident citizens taxable only on Philippine-source income?");
  assert.equal(isSourceLookup(classification), false);
  assert.equal(classification.subIssue, "RESIDENT_CITIZEN_INCOME_SCOPE");
  assert.equal(classification.orchestrationMode !== "SOURCE_LOOKUP", true);
  assert.equal((classification.controllingAuthorities || []).includes("NIRC Sec. 23"), true);
});

await test("exact NIRC Sec. 23 behavior is preserved", () => {
  const classification = classify("NIRC Sec. 23");
  assert.equal(classification.exactAuthority?.detected, true);
  assert.equal(classification.exactAuthority?.reference, "NIRC Sec. 23");
  assert.equal(isSourceLookup(classification), false);
  assert.equal((classification.controllingAuthorities || []).includes("NIRC Sec. 23"), true);
});

await test("RR 2-98 exact authority behavior is preserved", () => {
  const classification = classify("RR 2-98");
  assert.equal(classification.exactAuthority?.detected, true);
  assert.equal(classification.exactAuthority?.reference, "RR No. 2-1998");
  assert.equal(isSourceLookup(classification), false);
  assert.equal((classification.controllingAuthorities || []).includes("RR No. 2-1998"), true);
});

await test("Revenue Regulations No. 2-1998 exact admin alias behavior is preserved", () => {
  const classification = classify("Revenue Regulations No. 2-1998");
  assert.equal(classification.exactAuthority?.detected, true);
  assert.equal(classification.exactAuthority?.reference, "RR No. 2-1998");
  assert.equal(isSourceLookup(classification), false);
  assert.equal((classification.controllingAuthorities || []).includes("RR No. 2-1998"), true);
});

await test("issue-classification-engine keeps local detectSourcePattern compatibility wrapper", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /import\s+\{\s*detectSourcePattern\s+as\s+registryDetectSourcePattern\s*\}\s+from\s+["']\.\/source-intent-registry\.js["'];/
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+detectSourcePattern\(question\s*=\s*""\s*,\s*queryIntent\s*=\s*\{\}\)\s*\{\s*return\s+registryDetectSourcePattern\(question,\s*queryIntent\);\s*\}/s
  );
});

console.log(`\nPATCH-034D source-intent registry extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
