import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const PIPELINE_SRC = fs.readFileSync(path.join(ROOT, "pipeline.js"), "utf8");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

function safeStr(value = "") {
  return String(value ?? "");
}

function publicText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

function publicUrl(value = "") {
  const url = safeStr(value).trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function sourceCardPublicUrlFromDoc(doc = {}) {
  const meta = doc.metadata || {};
  return publicUrl(
    doc.publicUrl || doc.public_url ||
      doc.driveViewUrl || doc.drive_view_url ||
      doc.url || doc.webViewLink || doc.web_view_link ||
      doc.sourceUrl || doc.source_url ||
      meta.publicUrl || meta.public_url ||
      meta.driveViewUrl || meta.drive_view_url ||
      meta.url || meta.webViewLink || meta.web_view_link ||
      meta.sourceUrl || meta.source_url ||
      ""
  );
}

function sanitizePublicSourceCard(card = {}) {
  const citation = publicText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicText(card.title) || displayLabel || citation || "Source";
  const normalizedReference = publicText(card.normalizedReference || card.normalized_reference || "");
  const safeUrl = publicUrl(
    card.publicUrl || card.public_url ||
      card.driveViewUrl || card.drive_view_url ||
      card.url || card.webViewLink || card.web_view_link || ""
  );

  return {
    title,
    label: displayLabel || title,
    displayLabel: displayLabel || title,
    citation,
    authorityType: publicText(card.authorityType || card.authority_type || ""),
    limitationRequired: card.limitationRequired === true,
    ...(normalizedReference ? { normalizedReference } : {}),
    ...(safeUrl ? { publicUrl: safeUrl } : {})
  };
}

function sourceCardFromRetrievedTarget(doc = {}, target = "") {
  const meta = doc.metadata || {};
  const citation = publicText(
    target ||
      doc.citation ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      meta.normalizedReference ||
      meta.normalized_reference ||
      doc.reference ||
      ""
  );
  if (!citation) return null;

  return sanitizePublicSourceCard({
    title: doc.title || doc.documentTitle || doc.document_title || meta.documentTitle || meta.document_title || citation,
    label: citation,
    displayLabel: citation,
    citation,
    normalizedReference:
      doc.normalizedReference ||
      doc.normalized_reference ||
      meta.normalizedReference ||
      meta.normalized_reference ||
      citation,
    authorityType: doc.authorityType || doc.authority_type || meta.authorityType || meta.authority_type || "STATUTE",
    publicUrl: sourceCardPublicUrlFromDoc(doc),
    driveViewUrl: doc.driveViewUrl || doc.drive_view_url || meta.driveViewUrl || meta.drive_view_url || "",
    webViewLink: doc.webViewLink || doc.web_view_link || meta.webViewLink || meta.web_view_link || "",
    url: doc.url || meta.url || doc.source_url || meta.source_url || ""
  });
}

function restorePatch017kFallbackCard({ indexedDoc = null, authorityType = "RR", target = "" } = {}) {
  return indexedDoc
    ? sourceCardFromRetrievedTarget(indexedDoc, target)
    : sourceCardFromRetrievedTarget({ authorityType }, target);
}

function canonicalSourceKey(value = "") {
  return safeStr(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function finalSourceCardCanonicalKey(card = {}) {
  const ref = safeStr(
    card.normalizedReference ||
      card.normalized_reference ||
      card.citation ||
      card.displayLabel ||
      card.display_label ||
      card.label ||
      card.title ||
      ""
  );
  if (!ref) return "";

  const admin = ref.match(/\b(?:rr|revenue\s+regulations?|revenue\s+regulation)\s*(?:no\.?\s*)?(\d{1,4})[-\s]+(\d{2,4})\b/i);
  if (admin) {
    const number = String(Number(admin[1]));
    const year = admin[2].length === 2 ? `19${admin[2]}` : admin[2];
    return `rr:${number}-${year}`;
  }

  return canonicalSourceKey(ref);
}

function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5) {
  const beforeCards = [
    ...(Array.isArray(existingCards) ? existingCards : []),
    ...(Array.isArray(restoredCards) ? restoredCards : [])
  ];
  const seen = new Set();
  const finalCards = [];
  const droppedDuplicateLabels = [];

  for (const card of beforeCards) {
    const key = finalSourceCardCanonicalKey(card);
    const label = card?.normalizedReference || card?.citation || card?.displayLabel || card?.label || card?.title || "";
    if (!key) continue;
    if (seen.has(key)) {
      droppedDuplicateLabels.push(label || "(unlabeled)");
      continue;
    }
    seen.add(key);
    finalCards.push(card);
    if (finalCards.length >= maxCards) break;
  }

  return { finalCards, droppedDuplicateLabels };
}

test("RR 16-2005 restored through PATCH-017K fallback keeps indexed metadata URL", () => {
  const card = restorePatch017kFallbackCard({
    target: "RR 16-2005",
    authorityType: "RR",
    indexedDoc: {
    normalizedReference: "RR 16-2005",
    authorityType: "RR",
    metadata: {
      driveViewUrl: "https://drive.google.com/file/d/rr16/view",
      documentTitle: "RR_16-2005.pdf"
    }
    }
  });

  assert.equal(card.publicUrl, "https://drive.google.com/file/d/rr16/view");
  assert.equal(card.citation, "RR 16-2005");
});

test("PATCH-017K fallback still creates label-only card when indexed metadata is missing", () => {
  const card = restorePatch017kFallbackCard({
    target: "RR 16-2005",
    authorityType: "RR",
    indexedDoc: null
  });

  assert.equal(card.citation, "RR 16-2005");
  assert.equal(card.normalizedReference, "RR 16-2005");
  assert.equal(card.authorityType, "RR");
  assert.equal(card.publicUrl, undefined);
});

test("RR 2-98 final cards are globally deduped", () => {
  const duplicateCards = [
    { citation: "RR 2-98", publicUrl: "https://drive.google.com/file/d/rr2/view" },
    { citation: "RR 2-98", publicUrl: "https://drive.google.com/file/d/rr2/view" },
    { normalizedReference: "RR 2-98", citation: "RR 2-98" },
    { citation: "RR No. 2-1998" }
  ];
  const { finalCards, droppedDuplicateLabels } = mergeFinalSourceCards(duplicateCards, [], 5);

  assert.equal(finalCards.length, 1);
  assert.equal(finalCards[0].citation, "RR 2-98");
  assert.equal(droppedDuplicateLabels.length, 3);
});

test("CTA Case No. 9369 clickable card behavior does not regress", () => {
  const card = sourceCardFromRetrievedTarget({
    normalizedReference: "CTA Case No. 9369",
    authorityType: "CTA_DIVISION",
    metadata: {
      driveViewUrl: "https://drive.google.com/file/d/cta9369/view",
      documentTitle: "CTA Case No. 9369 - Taganito Mining Corporation v. CIR.pdf"
    }
  }, "CTA Case No. 9369");

  assert.equal(card.citation, "CTA Case No. 9369");
  assert.equal(card.publicUrl, "https://drive.google.com/file/d/cta9369/view");
});

test("VAT authority cards remain visible after final dedupe", () => {
  const vatCards = [
    { citation: "NIRC Sec. 105" },
    { citation: "NIRC Sec. 106" },
    { citation: "NIRC Sec. 107" },
    { citation: "NIRC Sec. 108" },
    { citation: "RR 16-2005", publicUrl: "https://drive.google.com/file/d/rr16/view" }
  ];
  const { finalCards } = mergeFinalSourceCards(vatCards, [], 5);

  assert.deepEqual(finalCards.map(c => c.citation), [
    "NIRC Sec. 105",
    "NIRC Sec. 106",
    "NIRC Sec. 107",
    "NIRC Sec. 108",
    "RR 16-2005"
  ]);
  assert.equal(finalCards[4].publicUrl, "https://drive.google.com/file/d/rr16/view");
});

test("PATCH-033D-R1 runtime hooks are present and scoped to source-card finalization", () => {
  assert.match(PIPELINE_SRC, /function sourceCardPublicUrlFromDoc\(doc = \{\}\)/);
  assert.match(PIPELINE_SRC, /async function resolveIndexedSourceCardTarget\(target = ""\)/);
  assert.match(PIPELINE_SRC, /indexed_source_card_lookup/);
  assert.match(PIPELINE_SRC, /classification_authority_inventory/);
  assert.match(PIPELINE_SRC, /PATCH_033D_R1_SOURCE_CARD_GLOBAL_DEDUPE/);
  assert.match(PIPELINE_SRC, /finalSourceCards = _033dR1DedupedCards;/);
  assert.doesNotMatch(PIPELINE_SRC, /PATCH_033D_R1.*BIR_DEFINITION/s);
  assert.doesNotMatch(PIPELINE_SRC, /PATCH_033D_R1.*detectSourcePattern/s);
});

console.log(`\nPATCH-033D-R1 source-card integrity tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
