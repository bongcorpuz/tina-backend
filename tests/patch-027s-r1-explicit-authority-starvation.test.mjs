/**
 * PATCH-027S-R1 Tests
 * Explicit authority starvation prevention.
 *
 * Run: node tests/patch-027s-r1-explicit-authority-starvation.test.mjs
 */

import fs from "fs";

const VECTOR_STORE_SRC = fs.readFileSync(new URL("../vector-store.js", import.meta.url), "utf8");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed += 1;
  } else {
    console.error(`  FAIL  ${label}`);
    failed += 1;
    failures.push(label);
  }
}

function group(name, fn) {
  console.log(`\n-- ${name}`);
  fn();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function isRecognizableAuthorityReference(input = "") {
  const s = String(input || "");
  return (
    /\b(?:RR|Revenue\s+Regulations?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RMC|Revenue\s+Memorandum\s+Circulars?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RMO|Revenue\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)\s+sec(?:tion)?\.?\s*\d{1,3}[A-Z]?\b/i.test(s) ||
    /\bsec(?:tion)?\.?\s*\d{1,3}[A-Z]?\s+(?:of\s+(?:the\s+)?)?(?:nirc|tax\s+code)\b/i.test(s) ||
    /\b(?:RA|R\.A\.|Republic\s+Act)\s*(?:No\.?)?\s*\d{4,6}\b/i.test(s)
  );
}

function buildNormalizedRefVariants(terms = []) {
  const variants = [];
  for (const term of terms) {
    if (!term) continue;
    variants.push(term);

    const nirc = String(term).match(/\b(?:NIRC|Tax\s+Code|National\s+Internal\s+Revenue\s+Code)\s+Sec(?:tion)?\.?\s*(\d{1,3}[A-Z]?)\b/i);
    if (nirc) {
      variants.push(`NIRC Sec. ${nirc[1]}`, `NIRC_SEC_${nirc[1]}`, `Section ${nirc[1]}`);
    }

    const admin = String(term).match(/\b(RR|RMC|RMO|RAMO)\s*(?:No\.?)?\s*(\d+)\s*[-_/]\s*(\d{2,4})\b/i);
    if (admin) {
      variants.push(`${admin[1].toUpperCase()} ${admin[2]}-${admin[3]}`);
      variants.push(`${admin[1].toUpperCase()} No. ${admin[2]}-${admin[3]}`);
    }
  }
  return unique(variants);
}

function buildExplicitAuthorityRefGroups(targetAuthorities = []) {
  return unique(targetAuthorities)
    .filter((term) => isRecognizableAuthorityReference(term))
    .map((term) => ({
      term,
      refs: buildNormalizedRefVariants([term])
    }))
    .filter((group) => group.refs.length > 0);
}

function combinedFastRefLookup(rows, refs, limit) {
  const refSet = new Set(refs);
  return rows
    .filter((row) => refSet.has(row.normalized_reference))
    .sort((a, b) =>
      Number(a.authority_level || 99) - Number(b.authority_level || 99) ||
      Number(a.chunk_index || 0) - Number(b.chunk_index || 0)
    )
    .slice(0, limit);
}

function allocatedFastRefLookup(rows, groups, limit) {
  const perAuthorityLimit = Math.max(3, Math.ceil(limit / groups.length));
  return groups.flatMap((group) => combinedFastRefLookup(rows, group.refs, perAuthorityLimit));
}

function refsOf(rows) {
  return new Set(rows.map((row) => row.normalized_reference));
}

const fixtureRows = [
  ...Array.from({ length: 167 }, (_, i) => ({
    id: `rr-${i}`,
    normalized_reference: "RR 2-98",
    authority_level: 1,
    chunk_index: i,
    text: `RR 2-98 chunk ${i}`
  })),
  { id: "nirc-57-195", normalized_reference: "NIRC Sec. 57", authority_level: 1, chunk_index: 195, text: "NIRC Sec. 57 text" },
  { id: "nirc-57-196", normalized_reference: "NIRC Sec. 57", authority_level: 1, chunk_index: 196, text: "NIRC Sec. 57 continuation" },
  { id: "nirc-58-199", normalized_reference: "NIRC Sec. 58", authority_level: 1, chunk_index: 199, text: "NIRC Sec. 58 text" },
  { id: "rmc-65", normalized_reference: "RMC 65-2012", authority_level: 8, chunk_index: 0, text: "RMC 65-2012 text" },
  { id: "rr-12", normalized_reference: "RR 12-2018", authority_level: 6, chunk_index: 0, text: "RR 12-2018 text" }
];

group("Production source contains PATCH-027S-R1 allocation hooks", () => {
  assert(VECTOR_STORE_SRC.includes("function buildExplicitAuthorityRefGroups"), "vector-store builds explicit authority ref groups");
  assert(VECTOR_STORE_SRC.includes("async function fastRefLookupByExplicitAuthority"), "vector-store has per-explicit-authority fast lookup helper");
  assert(VECTOR_STORE_SRC.includes("[...perAuthorityResults, ...fastResults]"), "exactAuthoritySearch merges per-authority results before sorting");
  assert(VECTOR_STORE_SRC.includes("explicitAuthorityGroups.length > 1"), "per-authority allocation is limited to multi-authority searches");
});

group("CHUNK_INDEX_CROWD_OUT reproduction", () => {
  const refs = buildNormalizedRefVariants(["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]);
  const oldPool = combinedFastRefLookup(fixtureRows, refs, 24);
  const oldRefs = refsOf(oldPool);

  assert(oldRefs.has("RR 2-98"), "old combined lookup includes RR 2-98");
  assert(!oldRefs.has("NIRC Sec. 57"), "old combined lookup starves NIRC Sec. 57");
  assert(!oldRefs.has("NIRC Sec. 58"), "old combined lookup starves NIRC Sec. 58");
});

group("PATCH-027S-R1 per-authority allocation", () => {
  const groups = buildExplicitAuthorityRefGroups(["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"]);
  const allocated = allocatedFastRefLookup(fixtureRows, groups, 24);
  const allocatedRefs = refsOf(allocated);

  assert(groups.length === 3, "three explicit authority groups are built");
  assert(allocatedRefs.has("NIRC Sec. 57"), "allocated lookup includes NIRC Sec. 57");
  assert(allocatedRefs.has("NIRC Sec. 58"), "allocated lookup includes NIRC Sec. 58");
  assert(allocatedRefs.has("RR 2-98"), "allocated lookup preserves RR 2-98");
});

group("Non-NIRC authority coverage and single-authority regression", () => {
  const rmcGroups = buildExplicitAuthorityRefGroups(["RMC 65-2012"]);
  const rrGroups = buildExplicitAuthorityRefGroups(["RR 2-98"]);
  const rr12Groups = buildExplicitAuthorityRefGroups(["RR 12-2018"]);

  assert(allocatedFastRefLookup(fixtureRows, rmcGroups, 24).some((row) => row.normalized_reference === "RMC 65-2012"), "RMC 65-2012 receives allocation");
  assert(allocatedFastRefLookup(fixtureRows, rrGroups, 24).some((row) => row.normalized_reference === "RR 2-98"), "RR 2-98 direct lookup still works");
  assert(allocatedFastRefLookup(fixtureRows, rr12Groups, 24).some((row) => row.normalized_reference === "RR 12-2018"), "RR 12-2018 direct lookup still works");
});

group("Generic queries do not create explicit authority allocations", () => {
  const genericGroups = buildExplicitAuthorityRefGroups(["withholding tax", "Explain EWT", "Applicable NIRC / primary statute provisions"]);

  assert(genericGroups.length === 0, "generic withholding/EWT terms do not trigger per-authority allocation");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027S-R1  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
