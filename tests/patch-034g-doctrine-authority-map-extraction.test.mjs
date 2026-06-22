import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFINITION_AUTHORITY_MAP,
  DOMAIN_DETECTORS,
  ISSUE_SPECIFIC_TARGETS
} from "../doctrine-authority-map.js";
import { classify } from "../issue-classification-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ISSUE_CLASSIFICATION_SRC = readFileSync(join(ROOT, "issue-classification-engine.js"), "utf8");
const DOCTRINE_MAP_SRC = readFileSync(join(ROOT, "doctrine-authority-map.js"), "utf8");

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

function assertAuthorities(query, expected) {
  const classification = classify(query);
  for (const [key, value] of Object.entries(expected)) {
    if (Array.isArray(value)) {
      assert.deepEqual(classification[key], value, `${query}: ${key}`);
    } else {
      assert.equal(classification[key], value, `${query}: ${key}`);
    }
  }
  return classification;
}

await test("doctrine authority map exports exactly the expected maps", async () => {
  const moduleKeys = Object.keys(await import("../doctrine-authority-map.js")).sort();
  assert.deepEqual(moduleKeys, [
    "DEFINITION_AUTHORITY_MAP",
    "DOMAIN_DETECTORS",
    "ISSUE_SPECIFIC_TARGETS"
  ]);
  assert.equal(typeof DEFINITION_AUTHORITY_MAP, "object");
  assert.equal(Array.isArray(DOMAIN_DETECTORS), true);
  assert.equal(typeof ISSUE_SPECIFIC_TARGETS, "object");
});

await test("issue classifier imports maps and keeps classifier functions local", () => {
  assert.match(
    ISSUE_CLASSIFICATION_SRC,
    /import\s+\{[\s\S]*DEFINITION_AUTHORITY_MAP[\s\S]*DOMAIN_DETECTORS[\s\S]*ISSUE_SPECIFIC_TARGETS[\s\S]*\}\s+from\s+["']\.\/doctrine-authority-map\.js["'];/
  );
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+getDefinitionAuthorityFor\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+buildAuthorities\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectSubIssue\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectExactAuthority\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectRetrievalStrategy\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectResponseMode\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+detectOrchestrationMode\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+classifyTaxIssue\s*\(/);
  assert.match(ISSUE_CLASSIFICATION_SRC, /function\s+buildIssueClassificationSearchQueries\s*\(/);
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /const\s+DEFINITION_AUTHORITY_MAP\s*=/);
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /const\s+DOMAIN_DETECTORS\s*=/);
  assert.doesNotMatch(ISSUE_CLASSIFICATION_SRC, /const\s+ISSUE_SPECIFIC_TARGETS\s*=/);
});

await test("doctrine map contains only pure constants and imports taxpayer metadata", () => {
  assert.match(DOCTRINE_MAP_SRC, /from\s+["']\.\/taxpayer-definition-registry\.js["'];/);
  assert.doesNotMatch(DOCTRINE_MAP_SRC, /function\s+(detectSubIssue|detectExactAuthority|getDefinitionAuthorityFor|buildAuthorities|detectRetrievalStrategy|detectResponseMode|detectOrchestrationMode|classifyTaxIssue|buildIssueClassificationSearchQueries)\s*\(/);
  assert.doesNotMatch(DOCTRINE_MAP_SRC, /export\s+default/);
});

await test("VAT definition authority map values are preserved", () => {
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.VAT_DEFINITION, {
    primaryIssue: "VAT_LIABILITY",
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    targetAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  });
});

await test("BIR definition map values are preserved", () => {
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.BIR_DEFINITION.targetAuthorities, ["NIRC Sec. 2", "NIRC Sec. 3"]);
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.BIR_DEFINITION.controllingAuthorities, ["NIRC Sec. 2", "NIRC Sec. 3"]);
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.NIRC_DEFINITION.targetAuthorities, ["NIRC Sec. 21", "NIRC Sec. 2"]);
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.TAX_CLASSIFICATION_DEFINITION.targetAuthorities, ["NIRC Sec. 21"]);
});

await test("taxpayer and resident citizen imported metadata are preserved", () => {
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.TAXPAYER_DEFINITION, {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 22"],
    controllingAuthorities: ["NIRC Sec. 22"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  });
  assert.deepEqual(DEFINITION_AUTHORITY_MAP.RESIDENT_CITIZEN_INCOME_SCOPE, {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 23"],
    controllingAuthorities: ["NIRC Sec. 23"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  });
});

await test("DOMAIN_DETECTORS order is preserved", () => {
  assert.deepEqual(
    DOMAIN_DETECTORS.map((detector) => detector.definitionKey),
    [
      "VAT_DEFINITION",
      "INPUT_TAX_DEFINITION",
      "OUTPUT_TAX_DEFINITION",
      "ZERO_RATING_DEFINITION",
      "TAX_REFUND_CREDIT_DEFINITION",
      "INCOME_TAX_DEFINITION",
      "WITHHOLDING_TAX_DEFINITION",
      "PERCENTAGE_TAX_DEFINITION",
      "EXCISE_TAX_DEFINITION",
      "DST_DEFINITION",
      "CGT_DEFINITION",
      "ESTATE_TAX_DEFINITION",
      "DONOR_TAX_DEFINITION",
      "LOCAL_BUSINESS_TAX_DEFINITION",
      "REAL_PROPERTY_TAX_DEFINITION",
      "CUSTOMS_DUTIES_DEFINITION",
      "PEZA_INCENTIVES_DEFINITION",
      "TAX_REFUND_CREDIT_DEFINITION",
      "ASSESSMENT_PRESCRIPTION_DEFINITION",
      "DEDUCTIONS_DEFINITION",
      "EXEMPTIONS_DEFINITION",
      "BIR_DEFINITION"
    ]
  );
});

await test("ISSUE_SPECIFIC_TARGETS keys are preserved", () => {
  assert.deepEqual(Object.keys(ISSUE_SPECIFIC_TARGETS), [
    "VAT_OVERVIEW",
    "VAT_RISK_ANALYSIS",
    "VAT_EXEMPTION",
    "INPUT_TAX",
    "OUTPUT_TAX",
    "ZERO_RATING",
    "REFUND_CREDIT",
    "VAT_REGISTRATION",
    "VAT_EXEMPTION_REAL_PROPERTY",
    "VAT_EXEMPTION_MEDICAL_PROFESSIONAL",
    "VAT_IMPORTATION",
    "VAT_REFUND_CREDIT",
    "VAT_INVOICING",
    "VAT_INPUT_TAX_ALLOCATION",
    "VAT_EXEMPTION_RESIDENTIAL_LEASE",
    "INCOME_TAX_OVERVIEW",
    "RESIDENT_CITIZEN_INCOME_SCOPE",
    "RCIT",
    "MCIT",
    "NOLCO",
    "DEDUCTIONS",
    "WITHHOLDING_TAX",
    "EWT",
    "FWT",
    "COMPENSATION_WHT",
    "ASSESSMENT_PRESCRIPTION",
    "LOA_VALIDITY",
    "PAN_FAN",
    "FDDA",
    "WAIVER",
    "LOCAL_BUSINESS_TAX",
    "REAL_PROPERTY_TAX",
    "CUSTOMS_DUTIES",
    "PEZA_INCENTIVES",
    "BIR_OVERVIEW",
    "BIR_DEFINITION",
    "NIRC_DEFINITION",
    "TAX_CLASSIFICATION"
  ]);
});

await test("core authority-map classifications are behavior-preserved", () => {
  assertAuthorities("What is VAT?", {
    primaryIssue: "VAT_LIABILITY",
    subIssue: "VAT_DEFINITION",
    targetAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"]
  });
  assertAuthorities("What is the BIR?", {
    primaryIssue: "BIR_ORGANIZATION",
    subIssue: "BIR_DEFINITION",
    targetAuthorities: ["NIRC Sec. 2", "NIRC Sec. 3"],
    controllingAuthorities: ["NIRC Sec. 2", "NIRC Sec. 3"]
  });
  assertAuthorities("What is a taxpayer under the NIRC?", {
    subIssue: "TAXPAYER_DEFINITION",
    targetAuthorities: ["NIRC Sec. 22"],
    controllingAuthorities: ["NIRC Sec. 22"]
  });
  assertAuthorities("Are resident citizens taxable only on Philippine-source income?", {
    subIssue: "RESIDENT_CITIZEN_INCOME_SCOPE",
    targetAuthorities: ["NIRC Sec. 23"],
    controllingAuthorities: ["NIRC Sec. 23"]
  });
  assertAuthorities("What is EWT?", {
    subIssue: "WITHHOLDING_TAX_DEFINITION",
    targetAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
    controllingAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58"],
    supportingAuthorities: ["RR 2-98"]
  });
});

await test("VAT specialized subIssues do not collapse into VAT_DEFINITION", () => {
  assertAuthorities("What is VAT-exempt sale?", {
    subIssue: "VAT_EXEMPTION",
    targetAuthorities: ["NIRC Sec. 109", "RR 16-2005"]
  });
  assertAuthorities("Can an exporter claim a VAT refund on its input taxes?", {
    subIssue: "VAT_REFUND_CREDIT",
    targetAuthorities: ["NIRC Sec. 112", "RR 1-2017", "RR 16-2005", "CIR v. San Roque Power Corporation", "CIR v. Aichi Forging"]
  });
});

await test("exact authority override behavior remains classifier-local", () => {
  assertAuthorities("RR 2-98", {
    retrievalStrategy: "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC",
    targetAuthorities: ["RR No. 2-1998", "Applicable Revenue Regulations / BIR issuances"],
    controllingAuthorities: ["RR No. 2-1998"],
    supportingAuthorities: ["Applicable Revenue Regulations / BIR issuances"]
  });
  const birRuling = classify("What does BIR Ruling No. 016-2024 provide on VAT refund?");
  assert.equal(birRuling.exactAuthority.detected, false);
  assert.equal(birRuling.controllingAuthorities.includes("BIR Ruling No. 016-2024"), false);
  const cta = classify("CTA Case No. 9369");
  assert.equal(cta.exactAuthority.type, "CTA_DIVISION");
  assert.equal(cta.controllingAuthorities.includes("CTA Case No. 9369"), false);
  assert.equal(cta.supportingJurisprudence.includes("CTA Case No. 9369"), true);
});

await test("pipeline/vector/source-card files have no PATCH-034G diff", () => {
  for (const file of ["pipeline.js", "vector-store.js", "source-card-engine.js"]) {
    const diff = execFileSync("git", ["diff", "--", file], { cwd: ROOT, encoding: "utf8" });
    assert.equal(diff, "", `${file} has no diff`);
  }
});

console.log(`\nPATCH-034G doctrine authority map extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
