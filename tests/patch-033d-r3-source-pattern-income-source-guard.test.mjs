/**
 * PATCH-033D-R3 Tests
 * Source-inventory false positive guard for income-source legal terminology.
 *
 * Run: node tests/patch-033d-r3-source-pattern-income-source-guard.test.mjs
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

function isSourceLookup(cls = {}) {
  return (
    cls.queryIntent === "source_inventory" ||
    cls.responseMode === "SOURCE" ||
    cls.orchestrationMode === "SOURCE_LOOKUP" ||
    cls.requiresSourceInventory === true
  );
}

function assertLegalAnswerMode(query) {
  const cls = classify(query);
  assert(!isSourceLookup(cls), `${query}: does not trigger source inventory`);
  assert(cls.responseMode !== "SOURCE", `${query}: responseMode is not SOURCE`);
  assert(cls.orchestrationMode !== "SOURCE_LOOKUP", `${query}: orchestrationMode is not SOURCE_LOOKUP`);
  return cls;
}

function assertResidentCitizenNirc23(query) {
  const cls = assertLegalAnswerMode(query);
  assert(cls.subIssue === "RESIDENT_CITIZEN_INCOME_SCOPE", `${query}: resident-citizen income scope`);
  assert((cls.controllingAuthorities || []).includes("NIRC Sec. 23"), `${query}: controls on NIRC Sec. 23`);
}

function assertSourceLookup(query) {
  const cls = classify(query);
  assert(isSourceLookup(cls), `${query}: triggers source inventory`);
  assert(cls.responseMode === "SOURCE", `${query}: responseMode SOURCE`);
  assert(cls.orchestrationMode === "SOURCE_LOOKUP", `${query}: orchestrationMode SOURCE_LOOKUP`);
}

group("Legal-answer resident citizen controls", () => {
  assertResidentCitizenNirc23("Are resident citizens taxable only on Philippine-source income?");
  assertResidentCitizenNirc23("Is a resident citizen taxable on worldwide income?");
  assertResidentCitizenNirc23("Are resident citizens taxable on income within and without the Philippines?");
  assertResidentCitizenNirc23("What income is taxable to a resident citizen?");
});

group("False-positive income-source legal terms", () => {
  const controls = [
    "Philippine-source income",
    "foreign-source income",
    "income from sources within the Philippines",
    "income from sources without the Philippines",
    "income from sources within and without the Philippines",
    "sources within and without the Philippines",
    "source of income"
  ];

  for (const query of controls) {
    assertLegalAnswerMode(query);
  }
});

group("Legitimate source-inventory controls", () => {
  const controls = [
    "What sources do you have for NIRC Sec. 23?",
    "Show indexed sources for NIRC Sec. 23.",
    "What are your sources for resident citizen taxation?",
    "Show source cards for resident citizen taxation.",
    "Legal basis for NIRC Sec. 23",
    "Show citations for NIRC Sec. 23.",
    "Show authorities for resident citizen taxation.",
    "NIRC Sec. 23 source only",
    "NIRC Sec. 23 basis only"
  ];

  for (const query of controls) {
    assertSourceLookup(query);
  }
});

console.log(`\nPATCH-033D-R3 source-pattern income-source guard tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
