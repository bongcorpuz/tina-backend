// PHASE-10A14-R4: Individual filing / substituted-filing authority bridge.
//
// Root cause remediated: NIRC Sec. 51 (individual return obligation + 51(C)
// deadline) and Sec. 51-A (substituted filing) statutory text is indexed under
// lagged chunk labels ("NIRC Sec. 50" / "NIRC Sec. 52"), so the Layer-1 equality
// lookup on normalized_reference returns zero rows and the decisive filing
// authority never reaches a final source card. This suite asserts the bridge:
//   1. fires for individual filing/deadline/substituted intent (natural + explicit),
//   2. re-labels the genuine indexed chunks as Sec. 51 / 51(C) / 51-A,
//   3. marks them Tier-1 exact-authority matches,
//   4. does NOT overfire for corporate/estate/donor/VAT/percentage filing,
//   5. only draws from the genuine NIRC-1997-RA-10963 source (no fabrication).

import assert from "node:assert/strict";

import {
  exactAuthoritySearch,
  isSection51FilingAuthorityIntent,
  assignSection51Ref
} from "../vector-store.js";

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

// ── Genuine Section 51 region chunks, as stored (mislabeled) in the corpus ──
const NIRC_SOURCE = "01-tax-code/nirc-1997-ra-10963-(bir).pdf";
const NIRC_TITLE = "NIRC-1997-RA-10963 (BIR).pdf";

function nircRow(id, chunkIndex, storedRef, text) {
  return {
    id,
    source: NIRC_SOURCE,
    original_source: NIRC_SOURCE,
    document_title: NIRC_TITLE,
    text,
    normalized_reference: storedRef,
    authority_type: "STATUTE",
    authority_level: 2,
    authority_score: 90,
    authority_label: storedRef,
    chunk_index: chunkIndex,
    metadata: { normalizedReference: storedRef, authorityType: "STATUTE" }
  };
}

const CORPUS_ROWS = [
  nircRow("s51-obl", 180, "NIRC Sec. 50",
    "CHAPTER IX RETURNS AND PAYMENT OF TAX SEC. 51. Individual Return. - (A) Requirements. - (1) the following individuals are required to file an income tax return: (a) Every Filipino citizen residing in the Philippines"),
  nircRow("s51-exempt", 181, "NIRC Sec. 50",
    "(2) The following individuals shall not be required to file an income tax return: (a) An individual whose taxable income does not exceed Two hundred fifty thousand pesos"),
  nircRow("s51-dup", 183, "NIRC Sec. 50",
    "The income tax return shall be filed in duplicate by the following persons: (a) A resident citizen - on his income from all sources"),
  nircRow("s51c-deadline", 184, "NIRC Sec. 50",
    "(B) Where to File. - (C) When to File. - (1) The return of any individual shall be filed on or before the fifteenth (15th) day of April of each year"),
  nircRow("s51a-subst", 186, "NIRC Sec. 52",
    "Substituted Filing of Income Tax Returns by Employees Receiving Purely Compensation Income. Individual taxpayers receiving purely compensation income from only one employer"),
  // decoy: Sec 52 corporate return chunk (must never be surfaced as a filing card here)
  nircRow("s52-corp", 187, "NIRC Sec. 52",
    "SEC. 52. Corporation Returns. - (A) Requirements. Every corporation subject to the tax herein imposed shall render a true and accurate quarterly income tax return")
];

// Minimal mock supporting the bridge's chained .ilike("source",..).ilike("text",..)
function createMockSupabase(rows = []) {
  const calls = [];
  const like = (value, pattern) =>
    String(value || "").toLowerCase().includes(String(pattern || "").replace(/^%|%$/g, "").toLowerCase());
  return {
    calls,
    from() {
      const state = { refs: null, ilikes: [] };
      const builder = {
        select() { return this; },
        in(column, refs) { state.refs = refs; calls.push({ type: "in", refs }); return this; },
        or(orClause) { state.or = orClause; calls.push({ type: "or", orClause }); return this; },
        ilike(column, pattern) { state.ilikes.push({ column, pattern }); return this; },
        order() { return this; },
        limit(limit) {
          let data = [];
          if (state.refs) {
            const set = new Set(state.refs);
            data = rows.filter((r) => set.has(r.normalized_reference));
          } else if (state.ilikes.length) {
            data = rows.filter((r) => state.ilikes.every(({ column, pattern }) => like(r[column], pattern)));
          }
          return Promise.resolve({ data: data.slice(0, limit), error: null });
        }
      };
      return builder;
    }
  };
}

async function search(query, keyword, extra = {}) {
  const supabase = createMockSupabase(CORPUS_ROWS);
  const results = await exactAuthoritySearch({
    supabase, query, keyword, topK: 8, includeWeakSources: true, ...extra
  });
  return results;
}

function refsOf(results) {
  return [...new Set(results.map((r) => r.normalizedReference || r.normalized_reference))];
}

// ── Pure intent-gate unit tests (no store) ───────────────────────────────
await test("intent: explicit Section 51 fires", () => {
  assert.equal(isSection51FilingAuthorityIntent({ keyword: "Section 51", query: "NIRC Section 51" }), true);
});
await test("intent: explicit Section 51-A fires", () => {
  assert.equal(isSection51FilingAuthorityIntent({ keyword: "Sec. 51-A" }), true);
});
await test("intent: natural substituted filing fires", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "employee one employer substituted filing" }), true);
});
await test("intent: natural self-employed obligation fires", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "is a self-employed individual required to file an income tax return" }), true);
});
await test("intent: natural individual deadline fires", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "when is the annual individual income tax return due date" }), true);
});
await test("intent OVERFIRE: corporate return does NOT fire", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "when must a corporation file its income tax return" }), false);
});
await test("intent OVERFIRE: estate return does NOT fire", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "what is the estate tax return filing deadline for a decedent" }), false);
});
await test("intent OVERFIRE: donor return does NOT fire", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "donor's tax return filing for a donation" }), false);
});
await test("intent OVERFIRE: VAT return does NOT fire", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "VAT return filing deadline under Section 114" }), false);
});
await test("intent: bare rate question does NOT fire", () => {
  assert.equal(isSection51FilingAuthorityIntent({ query: "what is the individual income tax rate" }), false);
});

// ── Label assignment unit tests ──────────────────────────────────────────
await test("label: obligation chunk -> Sec. 51", () => {
  assert.equal(assignSection51Ref("SEC. 51. Individual Return. - (A) Requirements"), "NIRC Sec. 51");
});
await test("label: deadline chunk -> Sec. 51(C)", () => {
  assert.equal(assignSection51Ref("(C) When to File. - filed on or before the fifteenth (15th) day of April"), "NIRC Sec. 51(C)");
});
await test("label: substituted chunk -> Sec. 51-A", () => {
  assert.equal(assignSection51Ref("Substituted Filing of Income Tax Returns by Employees"), "NIRC Sec. 51-A");
});

// ── Bridge retrieval tests (mock store) ──────────────────────────────────
await test("explicit Section 51 surfaces Sec. 51 + 51(C) + 51-A, Tier-1 exact", async () => {
  const results = await search("What does NIRC Section 51 require?", "Section 51");
  const refs = refsOf(results);
  assert.ok(refs.includes("NIRC Sec. 51"), `has Sec. 51: ${JSON.stringify(refs)}`);
  assert.ok(refs.includes("NIRC Sec. 51(C)"), `has Sec. 51(C): ${JSON.stringify(refs)}`);
  assert.ok(refs.includes("NIRC Sec. 51-A"), `has Sec. 51-A: ${JSON.stringify(refs)}`);
  assert.ok(results.every((r) => /nirc-1997-ra-10963/i.test(r.source || "")), "only genuine NIRC source");
  const bridged = results.filter((r) => r.metadata?.sec51FilingAuthorityBridge);
  assert.ok(bridged.length > 0 && bridged.every((r) => r.exactAuthorityMatch === true && r.authorityMatchTier === 1),
    "bridge rows are Tier-1 exact-authority matches");
  // decoy Sec 52 corporate chunk must not be relabeled as a filing card
  assert.ok(!refs.includes("NIRC Sec. 52"), "Sec 52 corporate decoy not surfaced");
});

await test("explicit Section 51-A surfaces substituted-filing authority", async () => {
  const results = await search("Explain NIRC Section 51-A substituted filing", "Section 51-A");
  assert.ok(refsOf(results).includes("NIRC Sec. 51-A"), "surfaces Sec. 51-A");
});

await test("natural substituted-filing question surfaces Sec. 51-A", async () => {
  const results = await search("Can an employee with only one employer skip filing an annual income tax return?", "substituted filing one employer employee");
  assert.ok(refsOf(results).includes("NIRC Sec. 51-A"), `surfaces Sec. 51-A: ${JSON.stringify(refsOf(results))}`);
});

await test("natural self-employed obligation surfaces Sec. 51", async () => {
  const results = await search("Is a self-employed individual required to file an income tax return?", "self-employed required to file income tax return");
  assert.ok(refsOf(results).includes("NIRC Sec. 51"), `surfaces Sec. 51: ${JSON.stringify(refsOf(results))}`);
});

await test("OVERFIRE: corporate return question surfaces NO Sec. 51 bridge card", async () => {
  const results = await search("When must a corporation file its income tax return?", "corporate income tax return filing");
  assert.ok(!results.some((r) => r.metadata?.sec51FilingAuthorityBridge), "no Sec 51 bridge rows for corporate filing");
});

await test("OVERFIRE: estate return question surfaces NO Sec. 51 bridge card", async () => {
  const results = await search("What is the estate tax return filing deadline?", "estate tax return filing deadline decedent");
  assert.ok(!results.some((r) => r.metadata?.sec51FilingAuthorityBridge), "no Sec 51 bridge rows for estate filing");
});

console.log(`\nphase-10a14-r4-sec51-filing-authority-bridge: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
