// FILE: services/source-authority-selector-card-sanitizer.js
"use strict";

/**
 * Source Authority Selector Card Sanitizer
 *
 * Pure public-card formatting helpers extracted from
 * services/source-authority-selector.js.
 *
 * Boundary:
 * - Does not select, rank, relabel, or suppress source cards.
 * - Does not inspect sourceAvailability or authority eligibility.
 * - Does not access DB, vector store, OpenAI, or corpus/indexing data.
 */

const INTERNAL_CARD_FIELDS = Object.freeze([
  "id",
  "source",
  "path",
  "filePath",
  "file_path",
  "filename",
  "fileName",
  "documentTitle",
  "document_title",
  "source_path",
  "sourcePath",
  "storageKey",
  "metadata",
  "fileId",
  "vectorId",
  "supabaseId",
  "rowId"
]);

function safeStr(v) {
  return typeof v === "string" ? v : String(v == null ? "" : v);
}

export function stripInternalCardFields(card = {}) {
  const clean = sanitizePublicSelectorCard(card);
  for (const field of INTERNAL_CARD_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export function publicCardText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

export function publicCardUrl(value = "") {
  const url = safeStr(value).trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

export function sanitizePublicSelectorCard(card = {}) {
  const citation = publicCardText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicCardText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicCardText(card.title) || displayLabel || citation || "Source";
  const normalizedReference = publicCardText(card.normalizedReference || card.normalized_reference || "");
  const authorityMatchTier = Number(card.authorityMatchTier || card._authorityMatchTier || 0);
  const excerpt = publicCardText(card.excerpt || "");
  // PATCH-023B: bridge intermediate URL fields to publicUrl (mirrors pipeline.js fix).
  const safeUrl = publicCardUrl(
    card.publicUrl    || card.public_url    ||
    card.driveViewUrl || card.drive_view_url ||
    card.url          || card.webViewLink    || card.web_view_link || ""
  );

  return {
    title,
    label: displayLabel || title,
    displayLabel: displayLabel || title,
    citation,
    authorityType: publicCardText(card.authorityType || card.authority_type || ""),
    limitationRequired: card.limitationRequired === true,
    ...(normalizedReference ? { normalizedReference } : {}),
    ...(Number.isFinite(authorityMatchTier) && authorityMatchTier > 0 ? { authorityMatchTier } : {}),
    ...(excerpt ? { excerpt } : {}),
    ...(safeUrl ? { publicUrl: safeUrl } : {})
  };
}

export default {
  stripInternalCardFields,
  publicCardText,
  publicCardUrl,
  sanitizePublicSelectorCard
};
