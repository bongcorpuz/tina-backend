import assert from "node:assert/strict";

import { classify } from "../issue-classification-engine.js";
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

function row(normalizedReference, overrides = {}) {
  const source = overrides.source || `${normalizedReference}.pdf`;
  const title = overrides.document_title || `${normalizedReference}.pdf`;
  const authorityType = overrides.authority_type || "STATUTE";
  return {
    id: overrides.id || `${normalizedReference}-${overrides.chunk_index ?? 0}`,
    source,
    original_source: overrides.original_source || source,
    document_title: title,
    text: overrides.text || `${normalizedReference} indexed text`,
    normalized_reference: normalizedReference,
    authority_type: authorityType,
    authority_level: overrides.authority_level || 2,
    authority_score: overrides.authority_score || 90,
    authority_label: overrides.authority_label || normalizedReference,
    chunk_index: overrides.chunk_index ?? 0,
    metadata: {
      citation: normalizedReference,
      normalizedReference,
      authorityType,
      fileId: overrides.fileId || encodeURIComponent(normalizedReference),
      driveViewUrl: overrides.driveViewUrl || `https://drive.google.com/file/d/${encodeURIComponent(normalizedReference)}/view`,
      ...(overrides.metadata || {})
    }
  };
}

function trainRow(section = "NIRC Sec. 2", chunkIndex = 0) {
  return row(section, {
    id: `train-${chunkIndex}`,
    source: "01-tax-code/nirc-1997-ra-10963-(bir).pdf",
    original_source: "01-tax-code/nirc-1997-ra-10963-(bir).pdf",
    document_title: "NIRC-1997-RA-10963 (BIR).pdf",
    chunk_index: chunkIndex,
    text: "NATIONAL INTERNAL REVENUE CODE OF 1997 As amended by Republic Act (RA) No. 10963 (TRAIN)."
  });
}

function createMockSupabase(rows = []) {
  const calls = [];
  const matchesIlike = (value, pattern) => {
    const needle = String(pattern || "").replace(/^%|%$/g, "").toLowerCase();
    return String(value || "").toLowerCase().includes(needle);
  };
  const parseOr = (orClause = "") =>
    String(orClause || "")
      .split(",")
      .map((clause) => clause.match(/^(source|original_source|document_title|normalized_reference)\.ilike\.(.*)$/))
      .filter(Boolean)
      .map((match) => ({ column: match[1], pattern: match[2] }));

  return {
    calls,
    from() {
      const builder = {
        _refs: [],
        _or: "",
        select() {
          return this;
        },
        in(column, refs) {
          assert.equal(column, "normalized_reference");
          this._refs = refs;
          calls.push({ type: "in", refs });
          return this;
        },
        or(orClause) {
          this._or = orClause;
          calls.push({ type: "or", orClause });
          return this;
        },
        order() {
          return this;
        },
        limit(limit) {
          let data = [];
          if (this._refs.length) {
            const refSet = new Set(this._refs);
            data = rows.filter((item) => refSet.has(item.normalized_reference));
          } else if (this._or) {
            const filters = parseOr(this._or);
            data = rows.filter((item) =>
              filters.some(({ column, pattern }) => matchesIlike(item[column], pattern))
            );
          }

          data = data
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

function exactClassification(query) {
  const classification = classify(query);
  return {
    issueClassification: classification,
    targetAuthorities: classification.targetAuthorities || [],
    controllingAuthorities: classification.controllingAuthorities || []
  };
}

async function search(query, rows, extra = {}) {
  const supabase = createMockSupabase(rows);
  const results = await exactAuthoritySearch({
    supabase,
    query,
    keyword: query,
    topK: 5,
    includeWeakSources: true,
    ...exactClassification(query),
    ...extra
  });
  return { results, calls: supabase.calls };
}

function refs(results = []) {
  return results.map((item) => item.normalizedReference || item.normalized_reference);
}

function assertBridgeHit(result, label) {
  assert.deepEqual(refs(result.results), ["NIRC Sec. 2", "NIRC Sec. 21"], `${label}: bridged NIRC source rows`);
  assert(result.calls.some((call) => call.type === "or" && call.orClause.includes("nirc-1997-ra-10963")), `${label}: bridge uses known source path`);
  assert(result.results.every((item) => /nirc-1997-ra-10963/i.test(item.source || "")), `${label}: only TRAIN/NIRC source returned`);
}

await test("RA 10963 bridges to the known NIRC-1997-RA-10963 source after equality miss", async () => {
  const result = await search("Explain RA 10963.", [trainRow("NIRC Sec. 2", 0), trainRow("NIRC Sec. 21", 20)]);
  assertBridgeHit(result, "RA 10963");
});

await test("TRAIN Law bridges to the known NIRC-1997-RA-10963 source after equality miss", async () => {
  const result = await search("What is the TRAIN Law?", [trainRow("NIRC Sec. 2", 0), trainRow("NIRC Sec. 21", 20)]);
  assertBridgeHit(result, "TRAIN Law");
});

await test("Tax Reform for Acceleration and Inclusion Act bridges to the known source", async () => {
  const result = await search("What is the Tax Reform for Acceleration and Inclusion Act?", [
    trainRow("NIRC Sec. 2", 0),
    trainRow("NIRC Sec. 21", 20)
  ]);
  assertBridgeHit(result, "full TRAIN title");
});

await test("CREATE Act / RA 11534 still resolves through RA 11534 equality rows", async () => {
  const result = await search("What is the CREATE Act?", [
    row("RA 11534", {
      source: "01-tax-code/ra-11534-create.pdf",
      document_title: "RA_11534- CREATE.pdf"
    }),
    trainRow("NIRC Sec. 2", 0)
  ]);
  assert.deepEqual(refs(result.results), ["RA 11534"]);
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("NIRC Sec. 23 still resolves by normalized_reference and is not bridged", async () => {
  const result = await search("NIRC Sec. 23", [row("NIRC Sec. 23"), trainRow("NIRC Sec. 2", 0)]);
  assert.equal(refs(result.results)[0], "NIRC Sec. 23");
  assert(refs(result.results).includes("NIRC Sec. 23"));
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("NIRC Sec. 57 still resolves by normalized_reference and is not bridged", async () => {
  const result = await search("NIRC Sec. 57", [row("NIRC Sec. 57"), trainRow("NIRC Sec. 2", 0)]);
  assert.equal(refs(result.results)[0], "NIRC Sec. 57");
  assert(refs(result.results).includes("NIRC Sec. 57"));
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("NIRC Sec. 58 still resolves by normalized_reference and is not bridged", async () => {
  const result = await search("NIRC Sec. 58", [row("NIRC Sec. 58"), trainRow("NIRC Sec. 2", 0)]);
  assert.equal(refs(result.results)[0], "NIRC Sec. 58");
  assert(refs(result.results).includes("NIRC Sec. 58"));
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("RR 2-98 still resolves through existing admin issuance variants", async () => {
  const result = await search("RR 2-98", [row("RR 2-98", { authority_type: "RR" }), trainRow("NIRC Sec. 2", 0)]);
  assert.deepEqual(refs(result.results), ["RR 2-98"]);
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("CTA Case No. 9369 keeps its source-card click target", async () => {
  const result = await search("CTA Case No. 9369", [
    row("CTA Case No. 9369", {
      authority_type: "CTA_DIVISION",
      source: "06-court-cases/cta-case-no-9369.pdf",
      document_title: "CTA Case No. 9369.pdf",
      driveViewUrl: "https://drive.google.com/file/d/cta-9369/view"
    }),
    trainRow("NIRC Sec. 2", 0)
  ]);
  assert.deepEqual(refs(result.results), ["CTA Case No. 9369"]);
  assert.equal(result.results[0]?.driveViewUrl, "https://drive.google.com/file/d/cta-9369/view");
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("BIR Ruling exclusion remains outside exact-authority bridge scope", async () => {
  const classification = classify("What does BIR Ruling No. 016-2024 provide on VAT refund?");
  assert.equal(classification.exactAuthority.detected, false);
  assert.equal(classification.controllingAuthorities.includes("BIR Ruling No. 016-2024"), false);

  const result = await search("What does BIR Ruling No. 016-2024 provide on VAT refund?", [
    row("BIR Ruling No. 016-2024", { authority_type: "BIR_RULING" }),
    trainRow("NIRC Sec. 2", 0)
  ]);
  assert.deepEqual(refs(result.results), []);
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

await test("generic TRAIN-like wording without exact authority classification is not bridged", async () => {
  const classification = classify("What is TRAIN?");
  assert.notEqual(classification.exactAuthority?.reference, "RA 10963");

  const result = await search("What is TRAIN?", [trainRow("NIRC Sec. 2", 0)], {
    issueClassification: classification,
    targetAuthorities: [],
    controllingAuthorities: []
  });
  assert.deepEqual(refs(result.results), []);
  assert.equal(result.calls.some((call) => call.type === "or"), false);
});

console.log(`\nPATCH-035B RA 10963 bridge tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
