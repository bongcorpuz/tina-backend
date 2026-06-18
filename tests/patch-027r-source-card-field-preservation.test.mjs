/**
 * PATCH-027R Tests
 * Source-card field preservation and controlling-authority restoration fallback.
 *
 * Run: node tests/patch-027r-source-card-field-preservation.test.mjs
 */

import fs from "fs";
import selector from "../services/source-authority-selector.js";
import {
  canonicalSourceKey,
  filterDisplayedSourcesByDirectSupport
} from "../source-visibility-engine.js";

const PIPELINE_SRC = fs.readFileSync(new URL("../pipeline.js", import.meta.url), "utf8");
const SELECTOR_SRC = fs.readFileSync(new URL("../services/source-authority-selector.js", import.meta.url), "utf8");

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

function nircChunk(section, tier = 1) {
  return {
    text: `Section ${section}. Withholding tax rules and statutory requirements for NIRC Section ${section}.`,
    content: `Section ${section}. Withholding tax rules and statutory requirements for NIRC Section ${section}.`,
    normalizedReference: `NIRC Sec. ${section}`,
    normalized_reference: `NIRC Sec. ${section}`,
    citation: `NIRC Sec. ${section}`,
    displayLabel: `NIRC Sec. ${section}`,
    authorityId: `nirc-sec-${section}`,
    authorityType: "NIRC",
    authorityRole: "GOVERNING",
    authorityLevel: 1,
    isIndexed: true,
    isParsed: true,
    isGoverning: true,
    limitationRequired: false,
    authorityMatchTier: tier,
    documentTitle: "National Internal Revenue Code",
    source: "01-tax-code/nirc-1997-ra-10963-(bir).pdf"
  };
}

function selectOne(chunk, controllingAuthority) {
  return selector.selectSourceAuthorities({
    rerankedChunks: [chunk],
    issueClassification: {
      controllingAuthorities: [controllingAuthority],
      targetAuthorityGroups: { controllingAuthorities: [controllingAuthority] }
    },
    query: `What does ${controllingAuthority} provide?`,
    answerText: `${controllingAuthority} provides withholding tax rules.`,
    saeStatus: "AUTHORITY_FOUND",
    maxSources: 5
  });
}

function restoredCards({ sasVisible, dsFiltered, issueClassification }) {
  const dsKeys = new Set(
    dsFiltered
      .map(c => canonicalSourceKey(c.normalizedReference || c.citation || ""))
      .filter(Boolean)
  );
  const controllingKeys = new Set([
    ...(Array.isArray(issueClassification?.controllingAuthorities)
      ? issueClassification.controllingAuthorities
      : []),
    ...(Array.isArray(issueClassification?.targetAuthorityGroups?.controllingAuthorities)
      ? issueClassification.targetAuthorityGroups.controllingAuthorities
      : [])
  ].map(a => canonicalSourceKey(a)).filter(Boolean));

  return sasVisible.filter(c => {
    const k = canonicalSourceKey(c.normalizedReference || c.citation || "");
    const tierEligible = Number(c.authorityMatchTier || 4) <= 2;
    const controllingFallback = k && controllingKeys.has(k);
    return k && (tierEligible || controllingFallback) && !dsKeys.has(k);
  });
}

group("Production source contains PATCH-027R sanitizer and restoration hooks", () => {
  assert(
    SELECTOR_SRC.includes("const normalizedReference = publicCardText(card.normalizedReference || card.normalized_reference || \"\");"),
    "sanitizePublicSelectorCard preserves normalizedReference"
  );
  assert(
    SELECTOR_SRC.includes("const authorityMatchTier = Number(card.authorityMatchTier || card._authorityMatchTier || 0);"),
    "sanitizePublicSelectorCard preserves authorityMatchTier"
  );
  assert(
    SELECTOR_SRC.includes("const excerpt = publicCardText(card.excerpt || \"\");"),
    "sanitizePublicSelectorCard preserves excerpt"
  );
  assert(
    PIPELINE_SRC.includes("const _controllingKeys = new Set(["),
    "pipeline restoration builds controlling authority fallback keys"
  );
  assert(
    PIPELINE_SRC.includes("const _controllingFallback = k && _controllingKeys.has(k);"),
    "pipeline restoration uses canonical controlling-authority fallback"
  );
});

group("sanitizePublicSelectorCard preserves public evidence fields", () => {
  const result = selectOne(nircChunk(57, 1), "NIRC Sec. 57");
  const card = result.visibleSourceCards[0] || {};

  assert(!result.diagnostics.error, "selector completes without diagnostics error");
  assert(card.normalizedReference === "NIRC Sec. 57", "normalizedReference survives sanitizer");
  assert(card.authorityMatchTier === 1, "authorityMatchTier survives sanitizer");
  assert(/withholding tax rules/i.test(card.excerpt || ""), "excerpt survives sanitizer");
});

group("NIRC source-card survivability", () => {
  const sec57 = selectOne(nircChunk(57, 1), "NIRC Sec. 57").visibleSourceCards[0] || {};
  const sec58 = selectOne(nircChunk(58, 1), "NIRC Sec. 58").visibleSourceCards[0] || {};

  assert(sec57.normalizedReference === "NIRC Sec. 57", "NIRC Sec. 57 source card survives");
  assert(sec57.authorityMatchTier === 1, "NIRC Sec. 57 keeps Tier 1 metadata");
  assert(sec58.normalizedReference === "NIRC Sec. 58", "NIRC Sec. 58 remains unchanged");
  assert(sec58.authorityMatchTier === 1, "NIRC Sec. 58 keeps Tier 1 metadata");
});

group("Tier 1 restoration fallback works without authorityMatchTier", () => {
  const sasVisible = [
    { normalizedReference: "NIRC Sec. 57", citation: "NIRC Sec. 57", title: "NIRC Sec. 57" }
  ];
  const dsFiltered = [
    { normalizedReference: "RR 2-98", citation: "RR 2-98", authorityMatchTier: 1 }
  ];
  const issueClassification = {
    controllingAuthorities: ["NIRC Sec. 57"],
    targetAuthorityGroups: { controllingAuthorities: ["NIRC Sec. 57"] }
  };

  const restored = restoredCards({ sasVisible, dsFiltered, issueClassification });
  assert(restored.length === 1, "controlling NIRC Sec. 57 restored without authorityMatchTier");
  assert(restored[0].normalizedReference === "NIRC Sec. 57", "restored card is the controlling authority");
});

group("DSF Signal C succeeds when excerpt is available", () => {
  const result = filterDisplayedSourcesByDirectSupport({
    candidateSources: [
      {
        normalizedReference: "NIRC Sec. 57",
        citation: "NIRC Sec. 57",
        title: "NIRC Sec. 57",
        excerpt: "Withholding of final tax applies to certain income payments under the NIRC."
      }
    ],
    answerText: "Withholding of final tax applies to certain income payments.",
    issueClassification: { primaryDomain: "WHT" },
    query: "What does NIRC Sec. 57 provide on withholding tax?"
  });

  assert(result.displayedSources.length === 1, "excerpt gives DSF enough direct-support text to keep the card");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027R  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
