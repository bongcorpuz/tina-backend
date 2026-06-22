import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  authorityRestorationCandidateMatchesTarget,
  findAuthorityRestorationCandidate,
  inferRestorationAuthorityType
} from "../authority-restoration-engine.js";
import { canonicalSourceKey } from "../source-visibility-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function deps(overrides = {}) {
  return {
    canonicalSourceKey,
    inferAdministrativeRef(blob = "", type = "") {
      const text = String(blob || "");
      const match = text.match(/\b(?:rr|revenue regulations?)\s*(?:no\.?\s*)?(\d+)[-\s]+(\d{2,4})\b/i);
      if (match && type === "RR") return `RR No. ${Number(match[1])}-${match[2].length === 2 ? `19${match[2]}` : match[2]}`;
      return "";
    },
    sourceCardIdentityBlob(candidate = {}) {
      const meta = candidate.metadata || {};
      return [
        candidate.displayTitle,
        candidate.sourceTitle,
        candidate.source,
        candidate.path,
        meta.documentTitle,
        meta.originalFileName,
        meta.path
      ].filter(Boolean).join(" ");
    },
    inferLinkedSourceType(candidate = {}) {
      const blob = [
        candidate.citation,
        candidate.normalizedReference,
        candidate.normalized_reference,
        candidate.displayTitle,
        candidate.sourceTitle,
        candidate.source,
        candidate.path,
        candidate.metadata?.documentTitle,
        candidate.metadata?.originalFileName,
        candidate.metadata?.path
      ].filter(Boolean).join(" ").toLowerCase();
      if (blob.includes("revenue regulation") || /\brr\b/.test(blob)) return "RR";
      if (blob.includes("revenue memorandum circular") || /\brmc\b/.test(blob)) return "RMC";
      if (blob.includes("revenue memorandum order") || /\brmo\b/.test(blob)) return "RMO";
      if (blob.includes("revenue audit memorandum order") || /\bramo\b/.test(blob)) return "RAMO";
      return "";
    },
    ...overrides
  };
}

await test("inferRestorationAuthorityType detects RR", () => {
  assert.equal(inferRestorationAuthorityType("Revenue Regulations No. 16-2005"), "RR");
});

await test("inferRestorationAuthorityType detects RMC", () => {
  assert.equal(inferRestorationAuthorityType("Revenue Memorandum Circular No. 65-2012"), "RMC");
});

await test("inferRestorationAuthorityType detects RMO", () => {
  assert.equal(inferRestorationAuthorityType("Revenue Memorandum Order No. 20-2013"), "RMO");
});

await test("inferRestorationAuthorityType detects NIRC/statute", () => {
  assert.equal(inferRestorationAuthorityType("NIRC Sec. 23"), "STATUTE");
});

await test("fallback type inference does not overclassify unknown targets", () => {
  assert.equal(inferRestorationAuthorityType("Unknown Authority 123"), "STATUTE");
});

await test("authorityRestorationCandidateMatchesTarget matches candidate.normalizedReference", () => {
  const targetKey = canonicalSourceKey("NIRC Sec. 23");
  assert.equal(authorityRestorationCandidateMatchesTarget({ normalizedReference: "NIRC Sec. 23" }, targetKey, deps()), true);
});

await test("authorityRestorationCandidateMatchesTarget matches candidate.metadata.normalized_reference", () => {
  const targetKey = canonicalSourceKey("NIRC Sec. 105");
  assert.equal(authorityRestorationCandidateMatchesTarget({ metadata: { normalized_reference: "NIRC Sec. 105" } }, targetKey, deps()), true);
});

await test("authorityRestorationCandidateMatchesTarget matches candidate.metadata.normalizedReference", () => {
  const targetKey = canonicalSourceKey("RR 16-2005");
  assert.equal(authorityRestorationCandidateMatchesTarget({ metadata: { normalizedReference: "RR 16-2005" } }, targetKey, deps()), true);
});

await test("authorityRestorationCandidateMatchesTarget matches administrative alias Revenue Regulations to RR", () => {
  const targetKey = canonicalSourceKey("RR 16-2005");
  assert.equal(
    authorityRestorationCandidateMatchesTarget({ citation: "Revenue Regulations No. 16-2005" }, targetKey, deps()),
    true
  );
});

await test("authorityRestorationCandidateMatchesTarget matches inferred administrative reference from identity blob", () => {
  const targetKey = canonicalSourceKey("RR No. 16-2005");
  const candidate = {
    path: "issuances/revenue-regulations/RR 16-2005.pdf"
  };
  assert.equal(authorityRestorationCandidateMatchesTarget(candidate, targetKey, deps()), true);
});

await test("authorityRestorationCandidateMatchesTarget rejects nonmatching candidate", () => {
  const targetKey = canonicalSourceKey("RR 16-2005");
  assert.equal(authorityRestorationCandidateMatchesTarget({ normalizedReference: "RR 2-98" }, targetKey, deps()), false);
});

await test("findAuthorityRestorationCandidate returns first matching reranked chunk", () => {
  const targetKey = canonicalSourceKey("NIRC Sec. 23");
  const first = { normalizedReference: "NIRC Sec. 22" };
  const second = { normalizedReference: "NIRC Sec. 23" };
  assert.equal(findAuthorityRestorationCandidate([first, second], targetKey, deps()), second);
});

await test("findAuthorityRestorationCandidate returns null when none match", () => {
  const targetKey = canonicalSourceKey("NIRC Sec. 23");
  assert.equal(findAuthorityRestorationCandidate([{ normalizedReference: "NIRC Sec. 22" }], targetKey, deps()), null);
});

await test("pipeline.js still contains PATCH-017K coordinator/log markers", () => {
  assert.match(PIPELINE_SRC, /PATCH_017K_SUPPORTING_AUTHORITY_LOOKUP_STARTED/);
  assert.match(PIPELINE_SRC, /PATCH_017K_INDEXED_SUPPORTING_AUTHORITY_RESTORED/);
  assert.match(PIPELINE_SRC, /PATCH_017K_SUPPORTING_AUTHORITY_COMPLETION_SUMMARY/);
});

await test("pipeline.js still calls sourceCardFromRetrievedTarget inside restoration corridor", () => {
  assert.match(PIPELINE_SRC, /sourceCardFromRetrievedTarget\(doc, target\)/);
  assert.match(PIPELINE_SRC, /sourceCardFromRetrievedTarget\(_033dR1IndexedDoc, target\)/);
});

await test("pipeline.js still owns resolveIndexedSourceCardTarget cache/coordinator usage", () => {
  assert.match(PIPELINE_SRC, /const _033dR1IndexedCardCache = new Map\(\)/);
  assert.match(PIPELINE_SRC, /await resolveIndexedSourceCardTarget\(target\)/);
});

console.log(`\nPATCH-034C authority restoration helper extraction tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
