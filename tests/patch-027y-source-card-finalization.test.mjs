/**
 * PATCH-027Y Tests
 * Final source-card dedupe/order repair.
 *
 * Run: node tests/patch-027y-source-card-finalization.test.mjs
 */

import fs from "fs";

const PIPELINE_SRC = fs.readFileSync(new URL("../pipeline.js", import.meta.url), "utf8");

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

function safeStr(value = "") {
  return String(value || "").trim();
}

function canonicalSourceKey(ref = "") {
  return String(ref || "")
    .toLowerCase()
    .replace(/\bno\.?\s*/g, "")
    .replace(/[^a-z0-9]/g, "");
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
  const beforeCards = [...existingCards, ...restoredCards];
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

function publicText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  return text;
}

function publicUrl(value = "") {
  const url = safeStr(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

function sanitizePublicSourceCard(card = {}) {
  const citation = publicText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicText(card.title) || displayLabel || citation || "Source";
  const normalizedReference = publicText(card.normalizedReference || card.normalized_reference || "");
  const authorityRole = publicText(card.authorityRole || card.authority_role || "");
  const authorityMatchTier = Number(card.authorityMatchTier || card.authority_match_tier || 0);
  const safeUrl = publicUrl(
    card.publicUrl ||
      card.public_url ||
      card.driveViewUrl ||
      card.drive_view_url ||
      card.url ||
      card.webViewLink ||
      card.web_view_link ||
      ""
  );

  return {
    title,
    label: displayLabel || title,
    displayLabel: displayLabel || title,
    citation,
    authorityType: publicText(card.authorityType || card.authority_type || ""),
    limitationRequired: card.limitationRequired === true,
    ...(normalizedReference ? { normalizedReference } : {}),
    ...(Number.isFinite(authorityMatchTier) && authorityMatchTier > 0 ? { authorityMatchTier } : {}),
    ...(authorityRole ? { authorityRole } : {}),
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
    normalized_reference:
      doc.normalized_reference ||
      doc.normalizedReference ||
      meta.normalized_reference ||
      meta.normalizedReference ||
      citation,
    authorityType: doc.authorityType || doc.authority_type || meta.authorityType || meta.authority_type || "STATUTE",
    authorityRole: doc.authorityRole || doc.authority_role || meta.authorityRole || meta.authority_role || "",
    authorityMatchTier:
      doc.authorityMatchTier ||
      doc.authority_match_tier ||
      doc.issueClassificationMatch?.authorityMatchTier ||
      meta.authorityMatchTier ||
      meta.authority_match_tier ||
      undefined,
    limitationRequired: doc.limitationRequired === true || doc.limitation_required === true || meta.limitationRequired === true,
    publicUrl: doc.publicUrl || doc.public_url || meta.publicUrl || meta.public_url || "",
    driveViewUrl: doc.driveViewUrl || doc.drive_view_url || meta.driveViewUrl || meta.drive_view_url || "",
    webViewLink: doc.webViewLink || doc.web_view_link || meta.webViewLink || meta.web_view_link || "",
    url: doc.url || meta.url || doc.source_url || meta.source_url || ""
  });
}

const card = (label, fields = {}) => ({
  citation: label,
  displayLabel: label,
  label,
  title: label,
  ...fields
});

group("Production source contains PATCH-027Y hooks", () => {
  assert(PIPELINE_SRC.includes("function finalSourceCardCanonicalKey(card = {})"), "final canonical key helper exists");
  assert(PIPELINE_SRC.includes("function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5)"), "final merge helper exists");
  assert(PIPELINE_SRC.includes("[PATCH_027Y_SOURCE_CARD_FINALIZED]"), "bounded PATCH-027Y diagnostic marker exists");
  assert(PIPELINE_SRC.includes("finalSourceCards = [..._dsFiltered, ..._tier1Dropped]"), "DSF-kept cards are preserved before restored SAS cards");
  assert(PIPELINE_SRC.includes("const beforeCards = [...finalSourceCards, ...restored];"), "PATCH-017J merge evaluates existing cards before restored cards");
});

group("RR alias canonicalization", () => {
  const a = finalSourceCardCanonicalKey(card("RR 2-98"));
  const b = finalSourceCardCanonicalKey(card("RR No. 2-1998"));
  const c = finalSourceCardCanonicalKey(card("Revenue Regulations No. 2-1998"));

  assert(a === "rr:2-1998", "RR 2-98 canonicalizes to rr:2-1998");
  assert(b === a, "RR No. 2-1998 dedupes to the same key");
  assert(c === a, "Revenue Regulations No. 2-1998 dedupes to the same key");
});

group("Final dedupe and ordering", () => {
  const existing = [
    card("NIRC Sec. 57", { normalizedReference: "NIRC Sec. 57", authorityMatchTier: 1 }),
    card("RR No. 2-1998", { normalizedReference: "RR No. 2-1998", authorityMatchTier: 1 }),
    card("NIRC Sec. 58", { normalizedReference: "NIRC Sec. 58", authorityMatchTier: 1 })
  ];
  const restored = [card("RR 2-98", { normalizedReference: "RR 2-98" })];

  const { finalCards, droppedDuplicateLabels } = mergeFinalSourceCards(existing, restored, 5);
  const labels = finalCards.map(c => c.normalizedReference || c.citation);

  assert(labels.join(" > ") === "NIRC Sec. 57 > RR No. 2-1998 > NIRC Sec. 58", "NIRC Sec. 57 remains before restored RR 2-98");
  assert(labels.includes("NIRC Sec. 58"), "NIRC Sec. 58 remains available after NIRC Sec. 57");
  assert(droppedDuplicateLabels.includes("RR 2-98"), "restored duplicate RR 2-98 is dropped");
});

group("Restored card field preservation", () => {
  const restored = sourceCardFromRetrievedTarget({
    normalizedReference: "NIRC Sec. 57",
    authorityType: "NIRC",
    authorityRole: "GOVERNING",
    authorityMatchTier: 1,
    publicUrl: "https://drive.google.com/file/d/example/view"
  }, "NIRC Sec. 57");

  assert(restored.normalizedReference === "NIRC Sec. 57", "normalizedReference is preserved");
  assert(restored.authorityMatchTier === 1, "authorityMatchTier is preserved");
  assert(restored.authorityRole === "GOVERNING", "authorityRole is preserved");
  assert(restored.publicUrl === "https://drive.google.com/file/d/example/view", "publicUrl is preserved");
});

group("Final cap and single-authority behavior", () => {
  const existing = ["NIRC Sec. 57", "RR 2-98", "NIRC Sec. 58", "RMC 65-2012", "RMO 20-2013", "RMO 24-2013"]
    .map(label => card(label, { normalizedReference: label }));
  assert(mergeFinalSourceCards(existing, [], 5).finalCards.length === 5, "final source-card cap remains 5");

  const rmc = mergeFinalSourceCards([card("RMC No. 65-2012", { normalizedReference: "RMC No. 65-2012" })], [], 5).finalCards;
  assert(rmc.length === 1 && rmc[0].normalizedReference === "RMC No. 65-2012", "RMC 65-2012 single-card behavior unchanged");
});

group("VAT and scope controls", () => {
  const vat = mergeFinalSourceCards([
    card("NIRC Sec. 108", { normalizedReference: "NIRC Sec. 108" }),
    card("RR 16-2005", { normalizedReference: "RR 16-2005" }),
    card("NIRC Sec. 106", { normalizedReference: "NIRC Sec. 106" })
  ], [
    card("RR No. 16-2005", { normalizedReference: "RR No. 16-2005" })
  ], 5).finalCards;

  assert(vat.map(c => c.normalizedReference).join(" > ") === "NIRC Sec. 108 > RR 16-2005 > NIRC Sec. 106", "VAT cards keep existing order and dedupe RR alias");
  assert(PIPELINE_SRC.includes("function sourceCardFromRetrievedTarget(doc = {}, target = \"\")"), "PATCH-027Y is scoped to pipeline source-card finalization helpers");
  assert(PIPELINE_SRC.includes("selectSourceAuthorities({"), "SAS call remains in place");
  assert(PIPELINE_SRC.includes("filterDisplayedSourcesByDirectSupport({"), "DSF call remains in place");
});

console.log(`\n${"=".repeat(60)}`);
console.log(`PATCH-027Y  ${passed} passed  ${failed} failed`);
if (failures.length) {
  console.log("\nFailed:");
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
