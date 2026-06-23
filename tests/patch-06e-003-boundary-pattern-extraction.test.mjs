/**
 * PATCH-06E-003 Tests
 * Philippine tax boundary pattern constants extraction.
 *
 * Run: node tests/patch-06e-003-boundary-pattern-extraction.test.mjs
 */

import assert from "node:assert/strict";

import {
  AUDIT_TAX_SIGNALS,
  BYPASS_HOOKS,
  CLARIFY_PATTERNS,
  NON_TAX_REJECT_PATTERNS,
  PH_TAX_ALLOW_PATTERNS
} from "../services/philippine-tax-boundary-patterns.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";

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

function decision(query, route = "/ask") {
  return detectPhilippineTaxBoundary(query, route).decision;
}

test("pattern constants are exported in expected shapes", () => {
  assert(BYPASS_HOOKS instanceof Set);
  assert(BYPASS_HOOKS.has("/debug"));
  assert(Array.isArray(PH_TAX_ALLOW_PATTERNS));
  assert(PH_TAX_ALLOW_PATTERNS.length > 50);
  assert(Array.isArray(NON_TAX_REJECT_PATTERNS));
  assert(NON_TAX_REJECT_PATTERNS.some((entry) => entry.domain === "SCIENCE"));
  assert(Array.isArray(AUDIT_TAX_SIGNALS));
  assert(AUDIT_TAX_SIGNALS.some((pattern) => pattern.test("LOA")));
  assert(Array.isArray(CLARIFY_PATTERNS));
  assert(CLARIFY_PATTERNS.some((entry) => entry.domain === "TAXPAYER_STATUS"));
});

test("Philippine tax queries remain allowed", () => {
  [
    "What is VAT?",
    "What is BIR?",
    "What is NIRC Section 23?",
    "What does NIRC Section 57 provide?",
    "What does NIRC Section 58 provide?",
    "What does RR 2-98 provide on expanded withholding tax?",
    "What is CTA Case No. 9369?"
  ].forEach((query) => assert.equal(decision(query), "ALLOW", query));
});

test("named law controls remain allowed only for exact tax-law forms", () => {
  assert.equal(decision("What is RA 10963?"), "ALLOW");
  assert.equal(decision("What is the TRAIN Law?"), "ALLOW");
  assert.equal(decision("What is RA 11534?"), "ALLOW");
  assert.equal(decision("What is the CREATE Act?"), "ALLOW");
});

test("generic Republic Act and generic TRAIN remain rejected", () => {
  assert.equal(decision("What is a Republic Act?"), "REJECT");
  assert.equal(decision("What is TRAIN?"), "REJECT");
});

test("clearly non-tax generic queries remain rejected", () => {
  assert.equal(decision("What is biology?"), "REJECT");
  assert.equal(decision("Who is the president of the Philippines?"), "REJECT");
  assert.equal(decision("How do I train a model?"), "REJECT");
});

test("tax-adjacent taxpayer status controls remain clarify", () => {
  assert.equal(decision("What is a nonresident citizen?"), "CLARIFY");
  assert.equal(decision("What is a resident citizen?"), "CLARIFY");
});

test("audit mode still requires audit tax signals", () => {
  assert.equal(decision("Prepare an audit defense for LOA defects", "/audit"), "ALLOW");
  assert.equal(decision("Prepare an audit of my website colors", "/audit"), "REJECT");
});

console.log(`\nPATCH-06E-003 boundary pattern extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
