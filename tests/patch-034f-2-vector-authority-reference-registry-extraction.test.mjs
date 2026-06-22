import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as registry from "../vector-authority-reference-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VECTOR_STORE_SRC = readFileSync(join(ROOT, "vector-store.js"), "utf8");
const PIPELINE_SRC = readFileSync(join(ROOT, "pipeline.js"), "utf8");
const SOURCE_CARD_ENGINE_SRC = readFileSync(join(ROOT, "source-card-engine.js"), "utf8");

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

function variants(term, normalizeLegalReference) {
  return registry.buildNormalizedRefVariants([term], { normalizeLegalReference });
}

function assertIncludesAll(values, expected) {
  for (const value of expected) {
    assert(values.includes(value), `expected ${JSON.stringify(values)} to include ${value}`);
  }
}

await test("registry exports expected helpers only", () => {
  assert.deepEqual(Object.keys(registry).sort(), [
    "buildAdminIssuanceYearLookupVariants",
    "buildNormalizedRefVariants",
    "isRecognizableAuthorityReference"
  ]);
  assert.equal(typeof registry.buildAdminIssuanceYearLookupVariants, "function");
  assert.equal(typeof registry.buildNormalizedRefVariants, "function");
  assert.equal(typeof registry.isRecognizableAuthorityReference, "function");
});

await test("RR 2-1998 variants preserve RR 2-98 lookup forms", () => {
  for (const term of ["RR 2-1998", "RR No. 2-1998", "Revenue Regulations No. 2-1998"]) {
    assertIncludesAll(variants(term), [
      "RR No. 2-98",
      "RR 2-98",
      "Revenue Regulations No. 2-98",
      "Revenue Regulations 2-98"
    ]);
  }
});

await test("RMC/RMO/RAMO full and short names include protected old-year variants", () => {
  assertIncludesAll(variants("RMC 65-1998"), [
    "RMC No. 65-1998",
    "RMC 65-1998",
    "Revenue Memorandum Circular No. 65-1998",
    "RMC No. 65-98",
    "RMC 65-98",
    "Revenue Memorandum Circular No. 65-98"
  ]);
  assertIncludesAll(variants("Revenue Memorandum Order No. 20-1998"), [
    "RMO No. 20-1998",
    "RMO 20-1998",
    "Revenue Memorandum Order No. 20-1998",
    "RMO No. 20-98",
    "RMO 20-98",
    "Revenue Memorandum Order No. 20-98"
  ]);
  assertIncludesAll(variants("Revenue Audit Memorandum Order No. 1-1995"), [
    "RAMO No. 1-1995",
    "RAMO 1-1995",
    "Revenue Audit Memorandum Order No. 1-1995",
    "RAMO No. 1-95",
    "RAMO 1-95",
    "Revenue Audit Memorandum Order No. 1-95"
  ]);
});

await test("RR 16-2005 remains valid and is not corrupted by old-year conversion", () => {
  const values = variants("RR 16-2005", () => ({
    normalized: "RR_16_2005",
    aliases: ["RR 16-2005", "RR No. 16-2005"]
  }));
  assertIncludesAll(values, ["RR 16-2005", "RR_16_2005", "RR No. 16-2005"]);
  assert.equal(values.includes("RR 16-05"), false);
  assert.equal(values.includes("RR No. 16-05"), false);
});

await test("CTA/G.R./RA/NIRC do not receive admin year conversion", () => {
  const normalizeLegalReference = (term) => ({
    normalized: term.toUpperCase().replaceAll(/\W+/g, "_").replaceAll(/^_|_$/g, ""),
    aliases: []
  });
  for (const term of ["CTA Case No. 9369", "G.R. No. 199422", "RA 9337", "NIRC Sec. 105"]) {
    const values = variants(term, normalizeLegalReference);
    assert.equal(values.some((value) => /\b(?:RR|RMC|RMO|RAMO)\s+(?:No\.\s*)?\d+-\d{2,4}\b/i.test(value)), false);
  }
});

await test("BIR Ruling is not treated as recognizable admin authority lookup", () => {
  assert.equal(registry.isRecognizableAuthorityReference("BIR Ruling No. 016-2024"), false);
  assert.deepEqual(registry.buildAdminIssuanceYearLookupVariants("BIR Ruling No. 016-2024"), []);
});

await test("recognizable reference helper still recognizes court and statute references separately", () => {
  assert.equal(registry.isRecognizableAuthorityReference("CTA Case No. 9369"), true);
  assert.equal(registry.isRecognizableAuthorityReference("G.R. No. 199422"), true);
  assert.equal(registry.isRecognizableAuthorityReference("RA 9337"), true);
  assert.equal(registry.isRecognizableAuthorityReference("NIRC Sec. 105"), true);
});

await test("vector-store exports exactAuthoritySearch and keeps implementation local", async () => {
  process.env.OPENAI_API_KEY ||= "test-openai-key";
  process.env.SUPABASE_URL ||= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-supabase-service-role-key";

  const vectorStore = await import(`../vector-store.js?patch034f2=${Date.now()}`);
  assert.equal(typeof vectorStore.exactAuthoritySearch, "function");
  assert.match(VECTOR_STORE_SRC, /export\s+async\s+function\s+exactAuthoritySearch\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastRefLookup\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastRefLookupByExplicitAuthority\s*\(/);
  assert.match(VECTOR_STORE_SRC, /async\s+function\s+fastAuthorityReferenceLookup\s*\(/);
  assert.match(VECTOR_STORE_SRC, /buildRegistryNormalizedRefVariants\(terms,\s*\{\s*normalizeLegalReference\s*\}\)/);
  assert.doesNotMatch(VECTOR_STORE_SRC, /export\s+\{\s*exactAuthoritySearch\s*\}/);
});

await test("source-card-engine and pipeline are untouched by registry extraction", () => {
  assert.equal(SOURCE_CARD_ENGINE_SRC.includes("vector-authority-reference-registry"), false);
  assert.equal(PIPELINE_SRC.includes("vector-authority-reference-registry"), false);
  assert.match(PIPELINE_SRC, /engineResolveIndexedSourceCardTarget\(target,\s*\{\s*exactAuthoritySearch,\s*logger:\s*console\s*\}\)/);
});

console.log(`\nPATCH-034F-2 vector authority reference registry extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
