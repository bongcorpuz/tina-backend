/**
 * PATCH-023B Regression Tests
 * Source Visibility: publicUrl Bridging + Statute Label Fix
 *
 * Run: node tests/patch-023b-source-card-url-and-label.test.mjs
 *
 * Two defects fixed:
 *
 * DEFECT 1 (Critical): All outbound source cards lacked publicUrl.
 *   Root cause: sanitizePublicSourceCard and sanitizePublicSelectorCard read only
 *   card.publicUrl / card.public_url, but intermediate cards carry driveViewUrl /
 *   url / webViewLink. These fields are stripped before the payload is built.
 *   Fix: PATCH-023B bridges driveViewUrl / drive_view_url / url / webViewLink /
 *   web_view_link to publicUrl in both sanitizers.
 *
 * DEFECT 2 (Medium): FAST_DEFINITION NIRC statute cards displayed "Primary Statute"
 *   instead of the specific section reference (e.g. "NIRC Sec. 57").
 *   Root cause: inferLinkedSourceType returned "" for chunks whose identity blob
 *   lacked "nirc" / "tax code" markers, causing inferSourceCardRef to return ""
 *   (provRef = ""), which caused the displayLabel to fall through to
 *   metadata.displayLabel = "Primary Statute" (from AUTHORITY_LABEL.STATUTE).
 *   Fix: PATCH-023B adds an authorityType field fallback in inferLinkedSourceType:
 *   STATUTE / NIRC / TAX_CODE → "NIRC", allowing inferSourceCardRef to extract
 *   "NIRC Sec. 57" from the normalizedReference.
 */

"use strict";

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { selectSourceAuthorities } from "../services/source-authority-selector.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_SRC = readFileSync(join(__dirname, "..", "pipeline.js"), "utf8");
const SOURCE_CARD_ENGINE_SRC = readFileSync(join(__dirname, "..", "source-card-engine.js"), "utf8");
const SAS_SRC      = readFileSync(join(__dirname, "..", "services", "source-authority-selector.js"), "utf8");
const SAS_SANITIZER_SRC = readFileSync(
  join(__dirname, "..", "services", "source-authority-selector-card-sanitizer.js"),
  "utf8"
);

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
  console.log(`\n── ${name}`);
  fn();
}

// ─── Shared SAS runner ────────────────────────────────────────────────────────

function runSas(chunks, { classification = {}, query = "test", saeStatus = "" } = {}) {
  return selectSourceAuthorities({
    rerankedChunks:      chunks,
    issueClassification: classification,
    query,
    answerText:          "",
    mode:                "STANDARD_TAX_MODE",
    maxSources:          5,
    saeStatus
  });
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// RR chunk with a driveViewUrl — simulates an indexed Revenue Regulation with a
// stored drive URL.  inferAdministrativeRef derives "RR No. 2-1998" from the blob
// (2-digit year "98" expands to "1998"); we search for any card with publicUrl,
// not by the specific citation string, to avoid coupling tests to the year format.
const RR_CHUNK_WITH_DRIVE_URL = {
  id: "rr-chunk-1",
  authorityType: "RR",
  normalizedReference: "RR 2-98",
  normalized_reference: "RR 2-98",
  document_title: "Revenue Regulations No. 2-98",
  source: "rr_2-98_ewt",
  driveViewUrl: "https://drive.google.com/file/d/abc123rr298/view",
  targetAuthorityMatch: true,
  text: "Revenue Regulations No. 2-98 on Expanded Withholding Tax."
};

// RR chunk with webViewLink only — tests the second URL field in the bridge.
const RR_CHUNK_WITH_WEBVIEW = {
  id: "rr-chunk-2",
  authorityType: "RR",
  normalizedReference: "RR 2-98",
  normalized_reference: "RR 2-98",
  document_title: "Revenue Regulations No. 2-98",
  source: "rr_2-98_ewt",
  webViewLink: "https://docs.google.com/file/d/xyz456rr298",
  targetAuthorityMatch: true,
  text: "Revenue Regulations No. 2-98 on Expanded Withholding Tax."
};

// RR chunk with url field only — tests the third URL field in the bridge.
const RR_CHUNK_WITH_URL_FIELD = {
  id: "rr-chunk-3",
  authorityType: "RR",
  normalizedReference: "RR 2-98",
  normalized_reference: "RR 2-98",
  document_title: "Revenue Regulations No. 2-98",
  source: "rr_2-98_ewt",
  url: "https://www.bir.gov.ph/rr-2-98.pdf",
  targetAuthorityMatch: true,
  text: "Revenue Regulations No. 2-98 on Expanded Withholding Tax."
};

// RR chunk with NO URL fields — verifies publicUrl is absent (not hallucinated).
const RR_CHUNK_NO_URL = {
  id: "rr-chunk-4",
  authorityType: "RR",
  normalizedReference: "RR 2-98",
  normalized_reference: "RR 2-98",
  document_title: "Revenue Regulations No. 2-98",
  source: "rr_2-98_ewt",
  targetAuthorityMatch: true,
  text: "Revenue Regulations No. 2-98 on Expanded Withholding Tax."
};

// STATUTE chunk that reproduces DEFECT 2:
//   • source/document_title do NOT contain "nirc" or "tax code" (basename stripping
//     removes directory path, so only the filename matters to inferLinkedSourceType)
//   • authorityType: "STATUTE" (PATCH-023B uses this as fallback)
//   • authorityAnnotation.displayLabel: "Primary Statute" (DB artifact from AUTHORITY_LABEL)
//   • normalizedReference: "NIRC Sec. 57" (correct source for the label)
//
// Before PATCH-023B:
//   inferLinkedSourceType → "" (no blob match) → provRef = "" →
//   displayLabel = eligibilityFields.displayLabel = "Primary Statute" → label = "Primary Statute"
//
// After PATCH-023B:
//   inferLinkedSourceType → "NIRC" (from authorityType) → inferSourceCardRef enters NIRC branch →
//   provRef = "NIRC Sec. 57" → displayLabel = "NIRC Sec. 57" → label = "NIRC Sec. 57"
const STATUTE_CHUNK_NO_BLOB_MARKERS = {
  id: "stat-chunk-1",
  authorityType: "STATUTE",
  normalizedReference: "NIRC Sec. 57",
  normalized_reference: "NIRC Sec. 57",
  // Filename deliberately lacks "nirc" / "tax code" — this is the trigger condition.
  document_title: "Statutory Provision Section 57",
  source: "sec57",
  targetAuthorityMatch: true,
  text: "SEC. 57. Withholding of Tax at Source.",
  authorityAnnotation: {
    authorityId:        "nirc-57",
    displayLabel:       "Primary Statute",   // DB artifact — this caused DEFECT 2
    authorityType:      "STATUTE",
    authorityRole:      "GOVERNING",
    authorityLevel:     2,
    citation:           "NIRC Sec. 57",
    isIndexed:          true,
    isParsed:           true,
    isGoverning:        true,
    limitationRequired: false
  }
};

// ─── Part A: Code-level verification (source scan) ───────────────────────────

group("Test 1 — pipeline.js sanitizePublicSourceCard bridges driveViewUrl", () => {
  assert(
    /publicUrl\s*\(\s*[\s\S]*?driveViewUrl/.test(SOURCE_CARD_ENGINE_SRC),
    "sanitizePublicSourceCard reads driveViewUrl in its publicUrl() call"
  );
  assert(
    /publicUrl\s*\(\s*[\s\S]*?webViewLink/.test(SOURCE_CARD_ENGINE_SRC),
    "sanitizePublicSourceCard reads webViewLink in its publicUrl() call"
  );
});

group("Test 2 — source-authority-selector-card-sanitizer.js sanitizePublicSelectorCard bridges driveViewUrl", () => {
  assert(
    /publicCardUrl\s*\(\s*[\s\S]*?driveViewUrl/.test(SAS_SANITIZER_SRC),
    "sanitizePublicSelectorCard reads driveViewUrl in its publicCardUrl() call"
  );
  assert(
    /publicCardUrl\s*\(\s*[\s\S]*?webViewLink/.test(SAS_SANITIZER_SRC),
    "sanitizePublicSelectorCard reads webViewLink in its publicCardUrl() call"
  );
});

group("Test 3 — source-authority-selector.js inferLinkedSourceType has authorityType fallback", () => {
  assert(
    SAS_SRC.includes("STATUTE") && /STATUTE.*NIRC|NIRC.*TAX_CODE/.test(SAS_SRC),
    "inferLinkedSourceType maps STATUTE/NIRC/TAX_CODE to 'NIRC'"
  );
  assert(
    SAS_SRC.includes("REVENUE_REGULATION"),
    "inferLinkedSourceType maps REVENUE_REGULATION to 'RR'"
  );
});

// ─── Part B: SAS output — URL bridging via selectSourceAuthorities ─────────
//
// Note on citation format: inferAdministrativeRef expands 2-digit years to 4-digit
// (e.g. "RR 2-98" → "RR No. 2-1998"), so we cannot match by "RR 2-98" exactly.
// Instead: assert any card in visibleSourceCards has publicUrl set to the expected URL.

group("Test 4 — driveViewUrl is bridged to publicUrl in SAS output card", () => {
  const r = runSas([RR_CHUNK_WITH_DRIVE_URL], { query: "Is advertising service subject to EWT?", saeStatus: "" });
  const cards = r.visibleSourceCards || [];
  assert(cards.length > 0, "at least one card produced (visibleSourceCards is non-empty)");
  const urlCard = cards.find(c => Boolean(c.publicUrl));
  assert(
    urlCard != null,
    "a card with publicUrl is present in visibleSourceCards"
  );
  assert(
    urlCard?.publicUrl === "https://drive.google.com/file/d/abc123rr298/view",
    `publicUrl matches the driveViewUrl value (got: ${urlCard?.publicUrl ?? "undefined"})`
  );
});

group("Test 5 — webViewLink is bridged to publicUrl in SAS output card", () => {
  const r = runSas([RR_CHUNK_WITH_WEBVIEW], { query: "What are the EWT rates?", saeStatus: "" });
  const cards = r.visibleSourceCards || [];
  assert(cards.length > 0, "at least one card produced (webViewLink variant)");
  const urlCard = cards.find(c => Boolean(c.publicUrl));
  assert(
    urlCard != null,
    "a card with publicUrl is present (webViewLink bridge)"
  );
  assert(
    urlCard?.publicUrl === "https://docs.google.com/file/d/xyz456rr298",
    `publicUrl matches the webViewLink value (got: ${urlCard?.publicUrl ?? "undefined"})`
  );
});

group("Test 6 — url field is bridged to publicUrl in SAS output card", () => {
  const r = runSas([RR_CHUNK_WITH_URL_FIELD], { query: "What are the EWT rates?", saeStatus: "" });
  const cards = r.visibleSourceCards || [];
  assert(cards.length > 0, "at least one card produced (url field variant)");
  const urlCard = cards.find(c => Boolean(c.publicUrl));
  assert(
    urlCard != null,
    "a card with publicUrl is present (url field bridge)"
  );
  assert(
    urlCard?.publicUrl === "https://www.bir.gov.ph/rr-2-98.pdf",
    `publicUrl matches the url field value (got: ${urlCard?.publicUrl ?? "undefined"})`
  );
});

group("Test 7 — card with no URL fields has no publicUrl (no hallucination)", () => {
  const r = runSas([RR_CHUNK_NO_URL], { query: "What are the EWT rates?", saeStatus: "" });
  const cards = r.visibleSourceCards || [];
  const fakeUrl = cards.find(c => Boolean(c.publicUrl));
  assert(
    fakeUrl == null,
    "no publicUrl on card without any URL source field (no fabrication)"
  );
});

// ─── Part C: STATUTE label fix via selectSourceAuthorities ───────────────────

group("Test 8 — STATUTE chunk without blob markers: label is NIRC Sec. 57, not Primary Statute", () => {
  const r = runSas(
    [STATUTE_CHUNK_NO_BLOB_MARKERS],
    {
      query:          "Is advertising service subject to EWT?",
      saeStatus:      "AUTHORITY_FOUND",
      classification: {
        primaryIssue:      "WITHHOLDING",
        subIssue:          "EWT",
        targetAuthorities: ["NIRC Sec. 57"]
      }
    }
  );
  const cards = r.visibleSourceCards || [];
  const card  = cards.find(c => /NIRC Sec\. 57/.test(c.citation || c.label || ""));
  assert(card != null, "NIRC Sec. 57 card is visible in SAS output");
  assert(
    card?.label !== "Primary Statute",
    `label is not "Primary Statute" (got: "${card?.label}")`
  );
  assert(
    card?.label === "NIRC Sec. 57",
    `label is "NIRC Sec. 57" (got: "${card?.label}")`
  );
  assert(
    card?.citation === "NIRC Sec. 57",
    `citation is "NIRC Sec. 57" (got: "${card?.citation}")`
  );
});

group("Test 9 — STATUTE chunks with proper blob markers unaffected by PATCH-023B", () => {
  const STATUTE_WITH_BLOB = {
    id: "stat-blob-1",
    authorityType: "STATUTE",
    normalizedReference: "NIRC Sec. 24",
    normalized_reference: "NIRC Sec. 24",
    document_title: "NIRC-1997 Tax Code",  // contains "nirc"
    source: "nirc_sec24",                   // contains "nirc"
    targetAuthorityMatch: true,
    text: "SEC. 24. Income Tax Rates.",
    authorityAnnotation: {
      authorityId: "nirc-24", displayLabel: "NIRC Sec. 24", authorityType: "STATUTE",
      authorityRole: "GOVERNING", authorityLevel: 2, citation: "NIRC Sec. 24",
      isIndexed: true, isParsed: true, isGoverning: true, limitationRequired: false
    }
  };
  const r = runSas(
    [STATUTE_WITH_BLOB],
    { query: "What is income tax?", saeStatus: "AUTHORITY_FOUND" }
  );
  const cards = r.visibleSourceCards || [];
  const card  = cards.find(c => /NIRC Sec\. 24/.test(c.citation || c.label || ""));
  assert(card != null, "NIRC Sec. 24 card visible (blob-path unchanged)");
  assert(card?.label === "NIRC Sec. 24", `label is "NIRC Sec. 24" via blob path (got: "${card?.label}")`);
});

group("Test 10 — RMC and RMO authorityType fallback in inferLinkedSourceType", () => {
  assert(
    SAS_SRC.includes("rawType === \"RMC\""),
    "inferLinkedSourceType includes RMC fallback"
  );
  assert(
    SAS_SRC.includes("rawType === \"RMO\""),
    "inferLinkedSourceType includes RMO fallback"
  );
});

// ─── Part D: URL safety guard ─────────────────────────────────────────────────

group("Test 11 — non-https URL values are stripped (publicUrl sanitizer integrity)", () => {
  const CHUNK_WITH_FILE_PATH = {
    id: "rr-chunk-path",
    authorityType: "RR",
    normalizedReference: "RR 2-98",
    normalized_reference: "RR 2-98",
    document_title: "Revenue Regulations No. 2-98",
    source: "rr_2-98_ewt",
    driveViewUrl: "/internal/drive/path/rr298.pdf",  // not https → must be stripped
    targetAuthorityMatch: true,
    text: "Revenue Regulations No. 2-98."
  };
  const r = runSas([CHUNK_WITH_FILE_PATH], { query: "EWT rates?", saeStatus: "" });
  const cards = r.visibleSourceCards || [];
  const fakeUrl = cards.find(c => Boolean(c.publicUrl));
  assert(fakeUrl == null, "file-path driveViewUrl is not exposed as publicUrl (sanitizer strips non-https)");
});

group("Test 12 — [SOURCE CARDS FINAL] diagnostic checks publicUrl not driveViewUrl", () => {
  assert(
    PIPELINE_SRC.includes("hasUrl: Boolean(c.publicUrl)"),
    "[SOURCE CARDS FINAL] log checks c.publicUrl not c.driveViewUrl"
  );
  assert(
    !PIPELINE_SRC.includes("hasUrl: Boolean(c.driveViewUrl || c.drive_view_url || c.url)"),
    "[SOURCE CARDS FINAL] log no longer checks pre-sanitization URL fields"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`PATCH-023B Source Card URL + Label: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error("\nFailed assertions:");
  for (const f of failures) console.error(`  ✗ ${f}`);
}
console.log("─".repeat(60));

process.exit(failed > 0 ? 1 : 0);
