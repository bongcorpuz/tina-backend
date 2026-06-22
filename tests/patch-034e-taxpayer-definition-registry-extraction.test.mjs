/**
 * PATCH-034E Tests
 * Taxpayer-definition registry extraction with classifier compatibility wrappers.
 *
 * Run: node tests/patch-034e-taxpayer-definition-registry-extraction.test.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classify, detectSubIssue } from "../issue-classification-engine.js";
import {
  RESIDENT_CITIZEN_INCOME_SCOPE,
  TAXPAYER_DEFINITION,
  hasTaxOrNircContext,
  isResidentCitizenIncomeScopeQuery,
  isTaxpayerDefinitionQuery
} from "../taxpayer-definition-registry.js";

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

await test("registry exports NIRC Sec. 22 taxpayer definition authority metadata", () => {
  assert.deepEqual(TAXPAYER_DEFINITION, {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 22"],
    controllingAuthorities: ["NIRC Sec. 22"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  });
});

await test("registry exports NIRC Sec. 23 resident citizen income-scope metadata", () => {
  assert.deepEqual(RESIDENT_CITIZEN_INCOME_SCOPE, {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 23"],
    controllingAuthorities: ["NIRC Sec. 23"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  });
});

await test("tax/NIRC context predicate preserves taxpayer-status context", () => {
  assert.equal(hasTaxOrNircContext("What is a nonresident citizen under the NIRC?"), true);
  assert.equal(hasTaxOrNircContext("What is a resident citizen?"), false);
  assert.equal(hasTaxOrNircContext("What is a taxpayer?", { taxpayerStatus: true }), true);
});

await test("resident citizen income-scope predicate preserves Sec. 23 positives and controls", () => {
  assert.equal(isResidentCitizenIncomeScopeQuery("Are resident citizens taxable only on Philippine-source income?"), true);
  assert.equal(isResidentCitizenIncomeScopeQuery("What is a resident citizen?"), false);

  const classification = classify("Are resident citizens taxable only on Philippine-source income?");
  assert.equal(classification.subIssue, "RESIDENT_CITIZEN_INCOME_SCOPE");
  assert.deepEqual(classification.targetAuthorities, ["NIRC Sec. 23"]);
  assert.deepEqual(classification.controllingAuthorities, ["NIRC Sec. 23"]);
});

await test("taxpayer definition predicate preserves Sec. 22 positives and ambiguity controls", () => {
  assert.equal(isTaxpayerDefinitionQuery("What is a nonresident citizen under the NIRC?"), true);
  assert.equal(isTaxpayerDefinitionQuery("What is a resident foreign corporation under the NIRC?"), true);
  assert.equal(isTaxpayerDefinitionQuery("Define domestic corporation under the NIRC."), true);
  assert.equal(isTaxpayerDefinitionQuery("What is a taxpayer under the NIRC?"), true);
  assert.equal(isTaxpayerDefinitionQuery("What is a resident citizen?"), false);
  assert.equal(isTaxpayerDefinitionQuery("What is a nonresident alien?"), false);

  const classification = classify("What is a taxpayer under the NIRC?");
  assert.equal(classification.subIssue, "TAXPAYER_DEFINITION");
  assert.deepEqual(classification.targetAuthorities, ["NIRC Sec. 22"]);
  assert.deepEqual(classification.controllingAuthorities, ["NIRC Sec. 22"]);
});

await test("detectSubIssue keeps resident citizen income-scope before taxpayer definition", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /if\s*\(\s*isResidentCitizenIncomeScopeQuery\(question\)\s*\)\s*return\s+["']RESIDENT_CITIZEN_INCOME_SCOPE["'];\s*if\s*\(\s*isTaxpayerDefinitionQuery\(question\)\s*\)\s*return\s+["']TAXPAYER_DEFINITION["'];/s
  );
  assert.equal(detectSubIssue("Are resident citizens taxable only on Philippine-source income?"), "RESIDENT_CITIZEN_INCOME_SCOPE");
});

await test("classifier keeps local compatibility wrappers for extracted predicates", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /import\s+\{[\s\S]*isResidentCitizenIncomeScopeQuery\s+as\s+registryIsResidentCitizenIncomeScopeQuery[\s\S]*isTaxpayerDefinitionQuery\s+as\s+registryIsTaxpayerDefinitionQuery[\s\S]*\}\s+from\s+["']\.\/taxpayer-definition-registry\.js["'];/
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+isResidentCitizenIncomeScopeQuery\(question\s*=\s*""\)\s*\{\s*return\s+registryIsResidentCitizenIncomeScopeQuery\(question\);\s*\}/s
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+isTaxpayerDefinitionQuery\(question\s*=\s*""\)\s*\{\s*return\s+registryIsTaxpayerDefinitionQuery\(question\);\s*\}/s
  );
});

await test("response and retrieval overrides remain local in issue-classification-engine", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+detectRetrievalStrategy[\s\S]*if\s*\(\s*subIssue\s*===\s*["']TAXPAYER_DEFINITION["']\s*\)\s*return\s+RETRIEVAL_STRATEGY\.MIXED;/
  );
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /function\s+detectResponseMode[\s\S]*if\s*\(\s*subIssue\s*===\s*["']TAXPAYER_DEFINITION["']\s*\)\s*return\s+["']STANDARD["'];/
  );

  const classification = classify("What is a taxpayer under the NIRC?");
  assert.equal(classification.retrievalStrategy, "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC");
  assert.equal(classification.responseMode, "STANDARD");
});

await test("domain-boundary clarification logic was not moved into classifier extraction", () => {
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /philippine-tax-domain-boundary/);
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /DOMAIN_BOUNDARY_CLARIFY/);
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /CLARIFY_PATTERNS/);
});

console.log(`\nPATCH-034E taxpayer-definition registry extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
