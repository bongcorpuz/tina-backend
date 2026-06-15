/**
 * PATCH-026A-R3 Regression Tests
 * TRAIN Law exact-authority canonicalization.
 *
 * Run: node tests/patch-026a-r3-train-law-canonicalization.test.mjs
 */

"use strict";

import {
  classify,
  detectExactAuthority,
  RETRIEVAL_STRATEGY
} from "../issue-classification-engine.js";
import {
  buildRetrievalQuerySet,
  normalizeAuthorityCitation
} from "../retrieval-engine.js";

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

function assertRa10963Exact(query, label) {
  const exact = detectExactAuthority(query);
  assert(exact.detected === true, `${label}: exact authority detected`);
  assert(exact.type === "STATUTE", `${label}: type is STATUTE`);
  assert(exact.reference === "RA 10963", `${label}: reference is RA 10963`);
  assert(exact.number === "10963", `${label}: number is 10963`);
}

group("Exact authority detection canonicalizes narrow TRAIN aliases", () => {
  assertRa10963Exact("What is the TRAIN Law?", "TRAIN Law");
  assertRa10963Exact("Explain the TRAIN Law.", "Explain TRAIN Law");
  assertRa10963Exact(
    "What is the Tax Reform for Acceleration and Inclusion Act?",
    "full TRAIN title"
  );
  assertRa10963Exact("Explain RA 10963.", "RA 10963");
  assertRa10963Exact("Explain Republic Act No. 10963.", "Republic Act No. 10963");
});

group("Standalone train usage does not canonicalize", () => {
  for (const q of [
    "How do I train a model?",
    "What is TRAIN?",
    "train employees on withholding tax"
  ]) {
    const exact = detectExactAuthority(q);
    assert(exact.reference !== "RA 10963", `'${q}' does not resolve to RA 10963`);
  }

  const parsed = normalizeAuthorityCitation("train");
  assert(parsed.normalized !== "RA 10963", "standalone 'train' does not normalize to RA 10963");
  assert(parsed.key !== "RA_10963", "standalone 'train' does not use RA_10963 key");
});

group("Classification routes TRAIN Law as exact authority, not fast definition", () => {
  const c = classify("What is the TRAIN Law?");
  assert(
    c.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY,
    `TRAIN Law retrievalStrategy is exact authority (got ${c.retrievalStrategy})`
  );
  assert(c.responseMode !== "FAST_DEFINITION", `TRAIN Law responseMode is not FAST_DEFINITION (got ${c.responseMode})`);
  assert(
    c.retrievalStrategy !== RETRIEVAL_STRATEGY.FAST_DEFINITION,
    "TRAIN Law retrievalStrategy is not FAST_DEFINITION_PRIMARY_AUTHORITY"
  );
  assert(c.targetAuthorities.includes("RA 10963"), "TRAIN Law targetAuthorities include RA 10963");
  assert(c.controllingAuthorities.includes("RA 10963"), "TRAIN Law controllingAuthorities include RA 10963");
});

group("Classifier-built retrieval query layers use canonical RA 10963", () => {
  const classification = classify("What is the TRAIN Law?");
  const querySet = buildRetrievalQuerySet("What is the TRAIN Law?", classification);
  const layer1 = querySet.layers.find((layer) => layer.layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY");
  const layer2 = querySet.layers.find((layer) => layer.layer === "LAYER_2_CITATION_VARIANT");

  assert(layer1?.queries.includes("RA 10963"), "Layer 1 includes canonical RA 10963");
  assert(layer2?.queries.includes("R.A. No. 10963"), "Layer 2 includes R.A. No. 10963 variant");
  assert(layer2?.queries.includes("Republic Act No. 10963"), "Layer 2 includes Republic Act No. 10963 variant");

  const fullTitleClassification = classify("What is the Tax Reform for Acceleration and Inclusion Act?");
  const fullTitleQuerySet = buildRetrievalQuerySet(
    "What is the Tax Reform for Acceleration and Inclusion Act?",
    fullTitleClassification
  );
  const fullTitleLayer1 = fullTitleQuerySet.layers.find((layer) => layer.layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY");
  assert(fullTitleLayer1?.queries.includes("RA 10963"), "Full TRAIN title Layer 1 includes canonical RA 10963");
});

group("Existing authority and domain behavior is preserved", () => {
  const create = classify("What is the CREATE Act?");
  assert(create.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY, "CREATE Act still routes as exact authority");
  assert(create.targetAuthorities.includes("RA 11534"), "CREATE Act targetAuthorities preserve RA 11534");
  const ordinaryCreate = detectExactAuthority("How do I create a VAT invoice?");
  assert(ordinaryCreate.detected === false, "ordinary lowercase create remains non-authority");

  const rr = normalizeAuthorityCitation("RR 13-2018");
  assert(rr.type === "RR", "RR 13-2018 still normalizes as RR");
  assert(rr.normalized === "RR 13-2018", "RR 13-2018 normalized reference preserved");
  const rrClass = classify("What is RR 13-2018?");
  assert(rrClass.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY, "RR 13-2018 still routes as exact authority");
  assert(rrClass.responseMode === "FAST_DEFINITION", "RR 13-2018 definition-phrased response mode preserved");

  const vat = classify("What is VAT?");
  assert(vat.responseMode === "FAST_DEFINITION", "VAT definition keeps FAST_DEFINITION response mode");
  assert(vat.retrievalStrategy === RETRIEVAL_STRATEGY.VAT_DEFINITION, "VAT definition retrieval strategy preserved");

  const ewt = classify("What is EWT?");
  assert(ewt.responseMode === "FAST_DEFINITION", "EWT definition keeps FAST_DEFINITION response mode");

  const caseQuery = classify("Supreme Court cases on withholding tax");
  assert(caseQuery.isJurisprudenceQuery === true, "jurisprudence detection preserved");
  assert(caseQuery.responseMode !== "FAST_DEFINITION", "jurisprudence query not downgraded to FAST_DEFINITION");
});

console.log(`\nPATCH-026A-R3 TRAIN canonicalization tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
