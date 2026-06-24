import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildNircLightExpansion,
  buildPossibleSourceKeywords,
  buildSourceIlikeFilters,
  normalizeAuthorityReference,
  normalizeForMatch,
  normalizeSourceName,
  sanitizeMetadataSearchTerm
} from "../vector-authority-keyword-builders.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VECTOR_STORE_SRC = readFileSync(join(ROOT, "vector-store.js"), "utf8");
const KEYWORD_BUILDERS_SRC = readFileSync(join(ROOT, "vector-authority-keyword-builders.js"), "utf8");
const PIPELINE_SRC = readFileSync(join(ROOT, "pipeline.js"), "utf8");
const RETRIEVAL_SRC = readFileSync(join(ROOT, "retrieval-engine.js"), "utf8");
const RERANKER_SRC = readFileSync(join(ROOT, "reranker-engine.js"), "utf8");

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

function assertIncludesAll(values, expected) {
  for (const value of expected) {
    assert(values.includes(value), `expected ${JSON.stringify(values)} to include ${value}`);
  }
}

await test("keyword-builder module exports the extracted pure helpers", () => {
  assert.equal(typeof normalizeSourceName, "function");
  assert.equal(typeof normalizeForMatch, "function");
  assert.equal(typeof normalizeAuthorityReference, "function");
  assert.equal(typeof buildPossibleSourceKeywords, "function");
  assert.equal(typeof buildSourceIlikeFilters, "function");
  assert.equal(typeof buildNircLightExpansion, "function");
  assert.equal(typeof sanitizeMetadataSearchTerm, "function");
});

await test("source and authority normalization preserve vector-store lookup slugs", () => {
  assert.equal(normalizeSourceName("Revenue Regulations No. 2-1998.pdf"), "rr_._2-1998.pdf");
  assert.equal(normalizeForMatch("Revenue Regulations No. 2-1998.pdf"), "rr-.-2-1998");
  assert.equal(normalizeAuthorityReference("Revenue Regulations No. 2-1998"), "rr-.-2-1998");
  assert.equal(normalizeAuthorityReference("NIRC Section 57"), "nirc-sec-57");
});

await test("RA and CREATE keyword builders preserve numbered Republic Act forms", () => {
  assertIncludesAll(buildPossibleSourceKeywords("What is RA 10963?"), [
    "ra-10963",
    "ra-.-10963"
  ]);
  assertIncludesAll(buildPossibleSourceKeywords("What is the CREATE Act under RA 11534?"), [
    "ra-11534",
    "ra-.-11534"
  ]);
});

await test("NIRC section keyword builders preserve raw and normalized section forms", () => {
  const sec57 = buildPossibleSourceKeywords("What does NIRC Section 57 provide?");
  assertIncludesAll(sec57, [
    "nirc sec. 57",
    "nirc sec 57",
    "nirc section 57",
    "nirc-sec-57",
    "sec-57"
  ]);
  assert(buildNircLightExpansion("nirc section 58").includes("normalized_reference.ilike.%nirc sec. 58%"));
});

await test("RR/RMC/RMO aliases preserve exact source keyword expansion", () => {
  assertIncludesAll(buildPossibleSourceKeywords("RR 2-98"), [
    "rr-2-1998",
    "rr-.-2-1998",
    "rr-02-1998",
    "rr-002-1998"
  ]);
  assertIncludesAll(buildPossibleSourceKeywords("Revenue Memorandum Circular No. 65-2012"), [
    "rmc-65-2012",
    "rmc-.-65-2012",
    "rmc-065-2012"
  ]);
  assertIncludesAll(buildPossibleSourceKeywords("Revenue Memorandum Order No. 20-2013"), [
    "rmo-20-2013",
    "rmo-.-20-2013",
    "rmo-020-2013"
  ]);
});

await test("CTA keyword expansion preserves court source-card lookup forms", () => {
  assertIncludesAll(buildPossibleSourceKeywords("What is CTA Case No. 9369?"), [
    "cta-case-.-9369",
    "cta-eb-.-9369",
    "cta-9369"
  ]);
});

await test("BIR Ruling, generic TRAIN, and generic Republic Act do not create authority keyword bridges", () => {
  assert.deepEqual(buildPossibleSourceKeywords("What is BIR Ruling DA-489-03?"), []);
  assert.deepEqual(buildPossibleSourceKeywords("What is TRAIN?"), []);
  assert.deepEqual(buildPossibleSourceKeywords("What is a Republic Act?"), []);
});

await test("metadata ILIKE filters preserve indexed-column source lookup shape", () => {
  const rrFilters = buildSourceIlikeFilters("RR 2-98");
  assert(rrFilters.includes("source.ilike.%rr-2-98%"));
  assert(rrFilters.includes("normalized_reference.ilike.%rr-2-98%"));

  const safe = sanitizeMetadataSearchTerm("NIRC Sec. 57, expanded withholding tax?");
  assert.equal(safe, "nirc sec. 57 expanded withholding tax");
});

await test("vector-store keeps search execution and bridge behavior local", async () => {
  process.env.OPENAI_API_KEY ||= "test-openai-key";
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-supabase-service-role-key";

  const vectorStore = await import(`../vector-store.js?patch06e007=${Date.now()}`);
  assert.equal(typeof vectorStore.exactAuthoritySearch, "function");
  assert.equal(typeof vectorStore.normalizeSourceName, "function");
  assert.equal(typeof vectorStore.normalizeAuthorityReference, "function");

  assert.match(VECTOR_STORE_SRC, /export\s+async\s+function\s+exactAuthoritySearch\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastRefLookup\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastRefLookupByExplicitAuthority\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastAuthorityReferenceLookup\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+searchRa10963IndexedTaxCodeSource\s*\(/);
  assert.doesNotMatch(KEYWORD_BUILDERS_SRC, /from\(["']|\.from\(|exactAuthoritySearch|fastRefLookup|searchRa10963IndexedTaxCodeSource/);
});

await test("retrieval, reranker, and pipeline are untouched by keyword-builder extraction", () => {
  assert.equal(PIPELINE_SRC.includes("vector-authority-keyword-builders"), false);
  assert.equal(RETRIEVAL_SRC.includes("vector-authority-keyword-builders"), false);
  assert.equal(RERANKER_SRC.includes("vector-authority-keyword-builders"), false);
});

console.log(`\nPATCH-06E-007 vector authority keyword builders extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
