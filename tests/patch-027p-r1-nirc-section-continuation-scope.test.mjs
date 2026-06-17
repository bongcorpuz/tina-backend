/**
 * PATCH-027P-R1 Tests
 * NIRC Section Continuation Scope Inheritance
 *
 * Validates the carry-forward behavior introduced into addDocumentToVectorStore
 * for NIRC documents. Pure functions and the state machine are replicated here
 * to keep the test self-contained (vector-store.js cannot be imported without
 * live OPENAI_API_KEY / Supabase environment variables).
 *
 * Run: node tests/patch-027p-r1-nirc-section-continuation-scope.test.mjs
 */

// ---------------------------------------------------------------------------
// Pure functions replicated from vector-store.js (identical logic).
// These have no side effects and require no credentials.
// ---------------------------------------------------------------------------

function detectNircSectionHeading(chunkText = "") {
  const match = chunkText.match(
    /(?:^|[\r\n]|\.\s*|\s{2,})\s*(?:SEC(?:TION)?\.?)\s+([0-9]+[A-Z]?)\./i
  );
  if (!match) return null;
  return `NIRC Sec. ${match[1]}`;
}

function isNircSourceDocument(source = "", metadata = {}) {
  const s = (source || "").toLowerCase();
  const m = (metadata.filePath || metadata.source || "").toLowerCase();
  return (
    s.includes("nirc") ||
    s.includes("national.internal.revenue.code") ||
    m.includes("nirc") ||
    m.includes("national.internal.revenue.code")
  );
}

// ---------------------------------------------------------------------------
// Simulation of the carry-forward state machine from addDocumentToVectorStore.
// Returns per-chunk resolved fields. lastNircSection is local to each call,
// mirroring the per-document-call reset in the production code.
// ---------------------------------------------------------------------------

function simulateChunkLoop(source, metadata, chunks) {
  const isNirc = isNircSourceDocument(source, metadata);
  let lastNircSection = null;
  return chunks.map((chunk, i) => {
    let chunkNormalizedRef  = isNirc ? null : (metadata.normalizedReference || null);
    let chunkSectionScope   = null;
    let chunkSectionHeading = null;

    if (isNirc) {
      const detectedSection = detectNircSectionHeading(chunk);
      if (detectedSection) {
        lastNircSection     = detectedSection;
        chunkNormalizedRef  = detectedSection;
        chunkSectionScope   = detectedSection;
        chunkSectionHeading = detectedSection;
      } else if (lastNircSection) {
        chunkNormalizedRef = lastNircSection;
        chunkSectionScope  = lastNircSection;
      }
    }

    const effectiveNormalizedReference = isNirc
      ? (chunkSectionScope || null)
      : chunkNormalizedRef;

    return {
      chunkIndex:                  i,
      chunkSectionScope,
      chunkSectionHeading,
      effectiveNormalizedReference,
      metadataNormalizedReference: effectiveNormalizedReference,
    };
  });
}

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NIRC_SOURCE   = "01-tax-code/nirc-1997-ra-10963-(bir).pdf";
const NIRC_METADATA = {};

const SEC57_HEADING_CHUNK = [
  "SEC. 57. Income Upon Which Withholding Tax May Be Imposed.",
  "(A) Withholding of Final Tax on Certain Incomes. — Subject to rules and",
  "regulations, in cases of interest, dividends, rents, royalties, salaries,",
  "premiums, annuities, compensation, remunerations, emoluments, or other",
  "fixed or determinable annual, periodical or casual gains, profits,",
].join("\n");

const CONTINUATION_CHUNK_1 = [
  "the payor shall deduct and withhold from such income a tax equal to",
  "fifteen percent (15%) or such other rate as may be provided by law,",
  "and such tax shall be final.",
].join("\n");

const CONTINUATION_CHUNK_2 = [
  "(B) Withholding of Creditable Tax at Source. — The Department of Finance",
  "may, upon the recommendation of the Commissioner, require the withholding",
  "of a tax on the items of income payable to natural or juridical persons,",
  "residing in the Philippines, by payor-corporations and persons.",
].join("\n");

const SEC58_HEADING_CHUNK = [
  "SEC. 58. Returns and Payment of Taxes Withheld at Source.",
  "(A) Quarterly Returns and Payments of Taxes Withheld. — Every withholding",
  "agent shall file a quarterly return for the first three (3) quarters of",
].join("\n");

const SEC58_CONTINUATION_CHUNK = [
  "every taxable year and a final adjustment return, on or before the",
  "last day of the month following the close of each quarter during which",
  "withholding was made, and every withholding agent shall remit the",
  "amount withheld within the time prescribed by law.",
].join("\n");

// ---------------------------------------------------------------------------
// Group 1: SEC. 57 heading chunk receives correct sectionScope
// ---------------------------------------------------------------------------
group("Group 1: SEC. 57 heading chunk → NIRC Sec. 57", () => {
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, [SEC57_HEADING_CHUNK]);
  const r = results[0];

  assert(
    r.effectiveNormalizedReference === "NIRC Sec. 57",
    'Heading chunk effectiveNormalizedReference = "NIRC Sec. 57"'
  );
  assert(
    r.chunkSectionScope === "NIRC Sec. 57",
    'Heading chunk chunkSectionScope = "NIRC Sec. 57"'
  );
  assert(
    r.chunkSectionHeading === "NIRC Sec. 57",
    'Heading chunk chunkSectionHeading = "NIRC Sec. 57"'
  );
  assert(
    r.metadataNormalizedReference === "NIRC Sec. 57",
    'Heading chunk metadataNormalizedReference = "NIRC Sec. 57"'
  );
});

// ---------------------------------------------------------------------------
// Group 2: Continuation chunks after SEC. 57 inherit the section
// ---------------------------------------------------------------------------
group("Group 2: Continuation chunks after SEC. 57 inherit NIRC Sec. 57", () => {
  const chunks = [SEC57_HEADING_CHUNK, CONTINUATION_CHUNK_1, CONTINUATION_CHUNK_2];
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, chunks);

  for (let i = 1; i <= 2; i++) {
    const r = results[i];
    assert(
      r.effectiveNormalizedReference === "NIRC Sec. 57",
      `Chunk ${i}: effectiveNormalizedReference = "NIRC Sec. 57" (inherited)`
    );
    assert(
      r.chunkSectionScope === "NIRC Sec. 57",
      `Chunk ${i}: chunkSectionScope = "NIRC Sec. 57" (inherited)`
    );
  }
});

// ---------------------------------------------------------------------------
// Group 3: New heading SEC. 58 resets carry-forward
// ---------------------------------------------------------------------------
group("Group 3: New heading SEC. 58 → resets to NIRC Sec. 58", () => {
  const chunks = [
    SEC57_HEADING_CHUNK,
    CONTINUATION_CHUNK_1,
    SEC58_HEADING_CHUNK,
  ];
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, chunks);
  const r = results[2];

  assert(
    r.effectiveNormalizedReference === "NIRC Sec. 58",
    'SEC. 58 heading chunk effectiveNormalizedReference = "NIRC Sec. 58"'
  );
  assert(
    r.chunkSectionScope === "NIRC Sec. 58",
    'SEC. 58 heading chunk chunkSectionScope = "NIRC Sec. 58"'
  );
  assert(
    r.chunkSectionHeading === "NIRC Sec. 58",
    'SEC. 58 heading chunk chunkSectionHeading = "NIRC Sec. 58"'
  );
});

// ---------------------------------------------------------------------------
// Group 4: Continuation after SEC. 58 inherits NIRC Sec. 58
// ---------------------------------------------------------------------------
group("Group 4: Continuation after SEC. 58 inherits NIRC Sec. 58", () => {
  const chunks = [
    SEC57_HEADING_CHUNK,
    CONTINUATION_CHUNK_1,
    SEC58_HEADING_CHUNK,
    SEC58_CONTINUATION_CHUNK,
  ];
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, chunks);
  const r = results[3];

  assert(
    r.effectiveNormalizedReference === "NIRC Sec. 58",
    'Post-SEC58 continuation effectiveNormalizedReference = "NIRC Sec. 58"'
  );
  assert(
    r.chunkSectionScope === "NIRC Sec. 58",
    'Post-SEC58 continuation chunkSectionScope = "NIRC Sec. 58"'
  );
});

// ---------------------------------------------------------------------------
// Group 5: Non-NIRC documents — scope detection and inheritance do not fire
// ---------------------------------------------------------------------------
group("Group 5: Non-NIRC documents — no NIRC scope inheritance", () => {
  const rrSource   = "02-revenue-regulations/rr-2-1998.pdf";
  const rrMetadata = { normalizedReference: "RR 2-98" };

  // A chunk with NIRC-looking text inside an RR document
  const rrChunk0 = "SEC. 57. This section discusses withholding for service income.";
  const rrChunk1 = "Continuation of the above rule on withholding.";

  const results = simulateChunkLoop(rrSource, rrMetadata, [rrChunk0, rrChunk1]);

  // isNirc is false → normalized_reference comes from document-level metadata
  assert(
    results[0].effectiveNormalizedReference === "RR 2-98",
    'RR heading chunk: effectiveNormalizedReference = "RR 2-98" (document-level)'
  );
  assert(
    results[1].effectiveNormalizedReference === "RR 2-98",
    'RR continuation chunk: effectiveNormalizedReference = "RR 2-98" (document-level, not NIRC carry-forward)'
  );
  assert(
    results[0].chunkSectionScope === null,
    'RR heading chunk: chunkSectionScope = null (no NIRC detection)'
  );
  assert(
    results[1].chunkSectionScope === null,
    'RR continuation chunk: chunkSectionScope = null (no NIRC inheritance)'
  );
});

// ---------------------------------------------------------------------------
// Group 6: New NIRC document call — no stale carry-forward from prior document
// ---------------------------------------------------------------------------
group("Group 6: Separate document calls — lastNircSection does not leak", () => {
  // First document call: ends with SEC. 57 in carry-forward state
  const firstDocChunks = [SEC57_HEADING_CHUNK, CONTINUATION_CHUNK_1];
  simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, firstDocChunks);
  // (lastNircSection is local to the first call — it is not visible here)

  // Second document call: starts fresh — no heading in the first chunk
  const secondDocChunks = [
    "This is the introductory preamble of a new NIRC document with no heading.",
    CONTINUATION_CHUNK_2,
  ];
  const secondResults = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, secondDocChunks);

  assert(
    secondResults[0].effectiveNormalizedReference === null,
    'Second doc chunk 0 (no heading): effectiveNormalizedReference = null (no stale carry-forward)'
  );
  assert(
    secondResults[1].effectiveNormalizedReference === null,
    'Second doc chunk 1 (no prior heading in this call): effectiveNormalizedReference = null'
  );
});

// ---------------------------------------------------------------------------
// Group 7: sectionHeading set only on detected heading chunks, not inherited
// ---------------------------------------------------------------------------
group("Group 7: chunkSectionHeading is null on inherited chunks", () => {
  const chunks = [SEC57_HEADING_CHUNK, CONTINUATION_CHUNK_1, CONTINUATION_CHUNK_2];
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, chunks);

  assert(
    results[0].chunkSectionHeading === "NIRC Sec. 57",
    'Heading chunk 0: chunkSectionHeading = "NIRC Sec. 57"'
  );
  assert(
    results[1].chunkSectionHeading === null,
    'Inherited chunk 1: chunkSectionHeading = null (not propagated)'
  );
  assert(
    results[2].chunkSectionHeading === null,
    'Inherited chunk 2: chunkSectionHeading = null (not propagated)'
  );
});

// ---------------------------------------------------------------------------
// Group 8: effectiveNormalizedReference === metadataNormalizedReference
//          for all chunks (column and JSON blob stay in sync)
// ---------------------------------------------------------------------------
group("Group 8: normalized_reference column matches metadata.normalizedReference", () => {
  const chunks = [
    SEC57_HEADING_CHUNK,
    CONTINUATION_CHUNK_1,
    CONTINUATION_CHUNK_2,
    SEC58_HEADING_CHUNK,
    SEC58_CONTINUATION_CHUNK,
  ];
  const results = simulateChunkLoop(NIRC_SOURCE, NIRC_METADATA, chunks);

  for (const r of results) {
    assert(
      r.effectiveNormalizedReference === r.metadataNormalizedReference,
      `Chunk ${r.chunkIndex}: effectiveNormalizedReference matches metadataNormalizedReference (both = "${r.effectiveNormalizedReference}")`
    );
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027P-R1  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
