/**
 * PATCH-06E-004 Tests
 * Reranker normalizer helper extraction.
 *
 * Run: node tests/patch-06e-004-reranker-normalizers-extraction.test.mjs
 */

import assert from "node:assert/strict";

import {
  RESPONSE_MODE,
  arrayify,
  lower,
  normalizeAuthority,
  normalizeMode,
  normalizeText,
  unique
} from "../reranker-normalizers.js";
import { RESPONSE_MODE as RERANKER_RESPONSE_MODE, normalizeMode as rerankerNormalizeMode } from "../reranker-engine.js";

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

test("text and list normalizers preserve existing defaults", () => {
  assert.equal(normalizeText("  NIRC   Sec. 23  "), "NIRC Sec. 23");
  assert.equal(normalizeText(null), "");
  assert.equal(lower("  RR   2-98  "), "rr 2-98");
  assert.deepEqual(unique(["NIRC", "", "RR", "NIRC", null, "RR"]), ["NIRC", "RR"]);
  assert.deepEqual(arrayify(null), []);
  assert.deepEqual(arrayify("RA 10963"), ["RA 10963"]);
  assert.deepEqual(arrayify(["RA 10963", "", "TRAIN"]), ["RA 10963", "TRAIN"]);
});

test("mode normalizer preserves reranker aliases and fallbacks", () => {
  assert.equal(normalizeMode(), RESPONSE_MODE.STANDARD);
  assert.equal(normalizeMode("quick_mode"), RESPONSE_MODE.QUICK);
  assert.equal(normalizeMode("tax_expert"), RESPONSE_MODE.TECHNICAL);
  assert.equal(normalizeMode("litigation legal defense mode"), RESPONSE_MODE.LITIGATION);
  assert.equal(normalizeMode("contract review"), RESPONSE_MODE.CONTRACT);
  assert.equal(normalizeMode("unknown mode"), RESPONSE_MODE.STANDARD);
});

test("authority normalizer preserves reranker authority aliases", () => {
  assert.equal(normalizeAuthority("NIRC"), "STATUTE");
  assert.equal(normalizeAuthority("Republic Act"), "STATUTE");
  assert.equal(normalizeAuthority("CTA Case"), "CTA_DIVISION");
  assert.equal(normalizeAuthority("Revenue Memorandum Circular"), "RMC");
  assert.equal(normalizeAuthority("CPA Notes"), "SECONDARY");
  assert.equal(normalizeAuthority("custom authority"), "CUSTOM_AUTHORITY");
  assert.equal(normalizeAuthority(""), null);
});

test("reranker-engine continues re-exporting public mode normalizer contract", () => {
  assert.equal(RERANKER_RESPONSE_MODE, RESPONSE_MODE);
  assert.equal(rerankerNormalizeMode("reviewer learning mode"), RESPONSE_MODE.REVIEWER);
});

console.log(`\nPATCH-06E-004 reranker normalizer extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
