import assert from "node:assert/strict";
import issueClassificationEngine from "../issue-classification-engine.js";
import { exactAuthoritySearch } from "../vector-store.js";

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

function fixtureRow(normalizedReference, overrides = {}) {
  return {
    id: `${normalizedReference}-${overrides.chunk_index ?? 0}`,
    source: `${normalizedReference}.pdf`,
    original_source: `02-revenue-regulations/${normalizedReference}.pdf`,
    document_title: `${normalizedReference}.pdf`,
    text: `${normalizedReference} indexed text`,
    normalized_reference: normalizedReference,
    authority_type: overrides.authority_type || "RR",
    authority_level: overrides.authority_level || 1,
    authority_score: overrides.authority_score || 90,
    authority_label: overrides.authority_label || normalizedReference,
    chunk_index: overrides.chunk_index ?? 0,
    metadata: {
      citation: normalizedReference,
      normalizedReference,
      authorityType: overrides.authority_type || "RR",
      driveViewUrl: `https://drive.google.com/file/d/${encodeURIComponent(normalizedReference)}/view`
    }
  };
}

function createMockSupabase(rows = [], capturedRefs = []) {
  return {
    from() {
      const builder = {
        _refs: [],
        select() {
          return this;
        },
        in(column, refs) {
          assert.equal(column, "normalized_reference");
          this._refs = refs;
          capturedRefs.push(...refs);
          return this;
        },
        order() {
          return this;
        },
        limit(limit) {
          const refSet = new Set(this._refs);
          const data = rows
            .filter((row) => refSet.has(row.normalized_reference))
            .sort((a, b) =>
              Number(a.authority_level || 99) - Number(b.authority_level || 99) ||
              Number(a.chunk_index || 0) - Number(b.chunk_index || 0)
            )
            .slice(0, limit);
          return Promise.resolve({ data, error: null });
        }
      };
      return builder;
    }
  };
}

async function search(query, rows, options = {}) {
  const capturedRefs = [];
  const results = await exactAuthoritySearch({
    supabase: createMockSupabase(rows, capturedRefs),
    query,
    keyword: query,
    topK: 5,
    targetAuthorities: options.targetAuthorities || [query],
    includeWeakSources: true
  });
  return { results, capturedRefs };
}

function refs(results = []) {
  return results.map((row) => row.normalizedReference || row.normalized_reference);
}

function classify(query) {
  return issueClassificationEngine.classify(query);
}

function assertExactAdminControlling(query, expectedReference, expectedType) {
  const classification = classify(query);
  assert.equal(classification.exactAuthority?.detected, true);
  assert.equal(classification.exactAuthority?.type, expectedType);
  assert.equal(classification.exactAuthority?.reference, expectedReference);
  assert(classification.controllingAuthorities.includes(expectedReference));
  assert(!classification.supportingAuthorities.includes(expectedReference));
}

await test("Revenue Regulations No. 2-1998 is planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("Revenue Regulations No. 2-1998", "RR No. 2-1998", "RR");
});

await test("Revenue Memorandum Circular No. 65-2012 is planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("Revenue Memorandum Circular No. 65-2012", "RMC No. 65-2012", "RMC");
});

await test("Revenue Memorandum Order No. 20-2013 is planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("Revenue Memorandum Order No. 20-2013", "RMO No. 20-2013", "RMO");
});

await test("Revenue Audit Memorandum Order No. 1-2000 is planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("Revenue Audit Memorandum Order No. 1-2000", "RAMO No. 1-2000", "RAMO");
});

await test("abbreviated RR No. 2-1998 remains planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("RR No. 2-1998", "RR No. 2-1998", "RR");
});

await test("abbreviated RR 2-1998 remains planned as controlling exact admin authority", async () => {
  assertExactAdminControlling("RR 2-1998", "RR No. 2-1998", "RR");
});

await test("non-admin court authority is not promoted by admin bare-citation rule", async () => {
  const classification = classify("CTA Case No. 9369");
  assert.equal(classification.exactAuthority?.detected, true);
  assert.equal(classification.exactAuthority?.type, "CTA_DIVISION");
  assert(!classification.controllingAuthorities.includes("CTA Case No. 9369"));
  assert(classification.supportingJurisprudence.includes("CTA Case No. 9369"));
});

await test("RR No. 2-1998 resolves to indexed RR 2-98", async () => {
  const { results, capturedRefs } = await search("RR No. 2-1998", [fixtureRow("RR 2-98")]);
  assert(capturedRefs.includes("RR No. 2-98"));
  assert(capturedRefs.includes("RR 2-98"));
  assert.deepEqual(refs(results), ["RR 2-98"]);
});

await test("Revenue Regulations No. 2-1998 resolves to indexed RR 2-98", async () => {
  const { results, capturedRefs } = await search("Revenue Regulations No. 2-1998", [fixtureRow("RR 2-98")]);
  assert(capturedRefs.includes("RR 2-98"));
  assert.deepEqual(refs(results), ["RR 2-98"]);
});

await test("RR 2-1998 resolves to indexed RR 2-98", async () => {
  const { results, capturedRefs } = await search("RR 2-1998", [fixtureRow("RR 2-98")]);
  assert(capturedRefs.includes("RR 2-98"));
  assert.deepEqual(refs(results), ["RR 2-98"]);
});

await test("RR 2-98 remains working", async () => {
  const { results } = await search("RR 2-98", [fixtureRow("RR 2-98")]);
  assert.deepEqual(refs(results), ["RR 2-98"]);
});

await test("RR No. 16-2005 remains working without old-year conversion", async () => {
  const { results } = await search("RR No. 16-2005", [fixtureRow("RR 16-2005")]);
  assert.deepEqual(refs(results), ["RR 16-2005"]);
});

await test("RMC No. 65-2012 remains working", async () => {
  const { results } = await search("RMC No. 65-2012", [
    fixtureRow("RMC 65-2012", { authority_type: "RMC" })
  ]);
  assert.deepEqual(refs(results), ["RMC 65-2012"]);
});

await test("RMO No. 20-2013 remains working", async () => {
  const { results } = await search("RMO No. 20-2013", [
    fixtureRow("RMO 20-2013", { authority_type: "RMO" })
  ]);
  assert.deepEqual(refs(results), ["RMO 20-2013"]);
});

await test("non-admin authorities do not receive RR-style 1900s conversion", async () => {
  const { results, capturedRefs } = await search("CTA Case No. 9369", [
    fixtureRow("CTA Case No. 9369", { authority_type: "CTA_DIVISION" })
  ]);
  assert(!capturedRefs.includes("CTA Case No. 69"));
  assert.deepEqual(refs(results), ["CTA Case No. 9369"]);
});

await test("PATCH-033D-R1 RR 16-2005 clickable metadata fixture remains available", async () => {
  const { results } = await search("RR No. 16-2005", [fixtureRow("RR 16-2005")]);
  assert.equal(results[0]?.metadata?.driveViewUrl?.startsWith("https://"), true);
});

await test("PATCH-033D-R1 RR 2-98 lookup does not duplicate one indexed row", async () => {
  const { results } = await search("RR 2-98", [fixtureRow("RR 2-98")]);
  assert.equal(results.length, 1);
  assert.equal(results[0].normalizedReference, "RR 2-98");
});

await test("PATCH-033D-R1 CTA Case No. 9369 clickable fixture remains available", async () => {
  const { results } = await search("CTA Case No. 9369", [
    fixtureRow("CTA Case No. 9369", { authority_type: "CTA_DIVISION" })
  ]);
  assert.equal(results[0]?.metadata?.driveViewUrl?.startsWith("https://"), true);
});

console.log(`\nPATCH-033D-R2 ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
