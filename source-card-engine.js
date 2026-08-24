// FILE: source-card-engine.js
// Phase 6B PATCH-034A: Pure source-card finalization helpers.

"use strict";

import { canonicalDocumentIdOf } from "./services/source-document-identity.js";

import { canonicalSourceKey } from "./source-visibility-engine.js";

function safeStr(v) {
  return typeof v === "string" ? v : String(v || "");
}

function publicText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

function publicUrl(value = "") {
  const url = safeStr(value).trim();
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com" ? "" : url;
  } catch {
    return "";
  }
}

export function finalSourceCardCanonicalKey(card = {}) {
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

export function mergeFinalSourceCards(existingCards = [], restoredCards = [], maxCards = 5) {
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

  return {
    finalCards,
    diagnostics: {
      beforeLabels: beforeCards.map(c => c?.normalizedReference || c?.citation || c?.displayLabel || c?.label || c?.title || "?"),
      afterLabels: finalCards.map(c => c?.normalizedReference || c?.citation || c?.displayLabel || c?.label || c?.title || "?"),
      beforeCanonicalKeys: beforeCards.map(c => finalSourceCardCanonicalKey(c)).filter(Boolean),
      afterCanonicalKeys: finalCards.map(c => finalSourceCardCanonicalKey(c)).filter(Boolean),
      droppedDuplicateLabels,
      finalCount: finalCards.length
    }
  };
}

export function sourceCardPublicUrlFromDoc(doc = {}) {
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

export function sanitizePublicSourceCard(card = {}) {
  const citation = publicText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicText(card.title) || displayLabel || citation || "Source";
  const normalizedReference = publicText(card.normalizedReference || card.normalized_reference || "");
  const authorityRole = publicText(card.authorityRole || card.authority_role || "");
  const authorityMatchTier = Number(card.authorityMatchTier || card.authority_match_tier || 0);
  const documentId = canonicalDocumentIdOf(card);
  const safeUrl = publicUrl(
    card.publicUrl    || card.public_url    ||
    card.driveViewUrl || card.drive_view_url ||
    card.url          || card.webViewLink    || card.web_view_link || ""
  );

  return {
    title,
    label: displayLabel || title,
    displayLabel: displayLabel || title,
    citation,
    authorityType: publicText(card.authorityType || card.authority_type || ""),
    ...(documentId ? { documentId, document_id: documentId } : {}),
    limitationRequired: card.limitationRequired === true,
    ...(normalizedReference ? { normalizedReference } : {}),
    ...(Number.isFinite(authorityMatchTier) && authorityMatchTier > 0 ? { authorityMatchTier } : {}),
    ...(authorityRole ? { authorityRole } : {}),
    ...(safeUrl ? { publicUrl: safeUrl } : {})
  };
}

export function sourceCardFromRetrievedTarget(doc = {}, target = "") {
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
  const documentId = canonicalDocumentIdOf(doc);

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
    ...(documentId ? { documentId, document_id: documentId } : {}),
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
    publicUrl: sourceCardPublicUrlFromDoc(doc),
    driveViewUrl: doc.driveViewUrl || doc.drive_view_url || meta.driveViewUrl || meta.drive_view_url || "",
    webViewLink: doc.webViewLink || doc.web_view_link || meta.webViewLink || meta.web_view_link || "",
    url: doc.url || meta.url || doc.source_url || meta.source_url || ""
  });
}

export async function resolveIndexedSourceCardTarget(target = "", { exactAuthoritySearch, logger = console } = {}) {
  const cleanTarget = safeStr(target).trim();
  if (!cleanTarget) return null;
  if (typeof exactAuthoritySearch !== "function") return null;

  try {
    const matches = await exactAuthoritySearch({
      query: cleanTarget,
      keyword: cleanTarget,
      targetAuthorities: [cleanTarget],
      topK: 1
    });
    return Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
  } catch (error) {
    logger?.warn?.("[PATCH_033D_R1_INDEXED_SOURCE_CARD_LOOKUP_FAILED]", {
      target: cleanTarget.slice(0, 80),
      error: error?.message || String(error)
    });
    return null;
  }
}

export default {
  finalSourceCardCanonicalKey,
  mergeFinalSourceCards,
  resolveIndexedSourceCardTarget,
  sanitizePublicSourceCard,
  sourceCardFromRetrievedTarget,
  sourceCardPublicUrlFromDoc
};
