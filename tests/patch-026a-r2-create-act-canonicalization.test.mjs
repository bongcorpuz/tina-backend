/**
 * PATCH-026A-R2 Regression Tests
 * CREATE Act exact-authority canonicalization.
 *
 * Run: node tests/patch-026a-r2-create-act-canonicalization.test.mjs
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

function assertRa11534Exact(query, label) {
  const exact = detectExactAuthority(query);
  assert(exact.detected === true, `${label}: exact authority detected`);
  assert(exact.type === "STATUTE", `${label}: type is STATUTE`);
  assert(exact.reference === "RA 11534", `${label}: reference is RA 11534`);
  assert(exact.number === "11534", `${label}: number is 11534`);
}

group("Exact authority detection canonicalizes narrow CREATE aliases", () => {
  assertRa11534Exact("What is the CREATE Act?", "CREATE Act");
  assertRa11534Exact(
    "Explain the Corporate Recovery and Tax Incentives for Enterprises Act",
    "full CREATE title"
  );
  assertRa11534Exact("Explain RA 11534", "RA 11534");
  assertRa11534Exact("Explain Republic Act No. 11534", "Republic Act No. 11534");
});

group("Broad ordinary create usage does not canonicalize", () => {
  const exact = detectExactAuthority("How do I create a VAT invoice?");
  assert(exact.detected === false, "lowercase ordinary 'create' is not RA 11534");

  const parsed = normalizeAuthorityCitation("create");
  assert(parsed.normalized !== "RA 11534", "standalone 'create' does not normalize to RA 11534");
  assert(parsed.key !== "RA_11534", "standalone 'create' does not use RA_11534 key");
});

group("Classification routes CREATE Act as exact authority, not fast definition", () => {
  const c = classify("What is the CREATE Act?");
  assert(
    c.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY,
    `CREATE Act retrievalStrategy is exact authority (got ${c.retrievalStrategy})`
  );
  assert(c.responseMode !== "FAST_DEFINITION", `CREATE Act responseMode is not FAST_DEFINITION (got ${c.responseMode})`);
  assert(
    c.retrievalStrategy !== RETRIEVAL_STRATEGY.FAST_DEFINITION,
    "CREATE Act retrievalStrategy is not FAST_DEFINITION_PRIMARY_AUTHORITY"
  );
  assert(c.targetAuthorities.includes("RA 11534"), "CREATE Act targetAuthorities include RA 11534");
  assert(c.controllingAuthorities.includes("RA 11534"), "CREATE Act controllingAuthorities include RA 11534");
});

group("Classifier-built retrieval query layers use canonical RA 11534", () => {
  const classification = classify("What is the CREATE Act?");
  const querySet = buildRetrievalQuerySet("What is the CREATE Act?", classification);
  const layer1 = querySet.layers.find((layer) => layer.layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY");
  const layer2 = querySet.layers.find((layer) => layer.layer === "LAYER_2_CITATION_VARIANT");

  assert(layer1?.queries.includes("RA 11534"), "Layer 1 includes canonical RA 11534");
  assert(layer2?.queries.includes("Republic Act No. 11534"), "Layer 2 includes Republic Act No. 11534 variant");

  const fullTitleClassification = classify("What is the Corporate Recovery and Tax Incentives for Enterprises Act?");
  const fullTitleQuerySet = buildRetrievalQuerySet(
    "What is the Corporate Recovery and Tax Incentives for Enterprises Act?",
    fullTitleClassification
  );
  const fullTitleLayer1 = fullTitleQuerySet.layers.find((layer) => layer.layer === "LAYER_1_EXACT_NORMALIZED_AUTHORITY");
  assert(fullTitleLayer1?.queries.includes("RA 11534"), "Full CREATE title Layer 1 includes canonical RA 11534");
});

group("Existing authority and domain behavior is preserved", () => {
  const ra = classify("Explain RA 11534");
  assert(ra.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY, "RA 11534 still routes as exact authority");
  assert(ra.targetAuthorities.includes("RA 11534"), "RA 11534 targetAuthorities preserved");

  const rr = normalizeAuthorityCitation("RR 13-2018");
  assert(rr.type === "RR", "RR 13-2018 still normalizes as RR");
  assert(rr.normalized === "RR 13-2018", "RR 13-2018 normalized reference preserved");
  const rrClass = classify("What is RR 13-2018?");
  assert(rrClass.retrievalStrategy === RETRIEVAL_STRATEGY.EXACT_AUTHORITY, "RR 13-2018 still routes as exact authority");
  assert(rrClass.responseMode === "FAST_DEFINITION", "RR 13-2018 definition-phrased response mode preserved");

  const vat = classify("What is VAT?");
  assert(vat.responseMode === "FAST_DEFINITION", "VAT definition keeps FAST_DEFINITION response mode");
  assert(vat.retrievalStrategy === RETRIEVAL_STRATEGY.VAT_DEFINITION, "VAT definition retrieval strategy preserved");

  const caseQuery = classify("Supreme Court cases on withholding tax");
  assert(caseQuery.isJurisprudenceQuery === true, "jurisprudence detection preserved");
  assert(caseQuery.responseMode !== "FAST_DEFINITION", "jurisprudence query not downgraded to FAST_DEFINITION");
});

console.log(`\nPATCH-026A-R2 CREATE canonicalization tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
