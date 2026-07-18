// FILE: services/ask-handler-public-source-sanitizer.js
"use strict";

/**
 * Pure public source/card sanitizer helpers for ask-handler responses.
 *
 * Boundary:
 * - No request orchestration, retrieval, source selection, or sourceAvailability logic.
 * - No DB, vector, OpenAI, indexing, or corpus access.
 * - Preserves ask-handler public response source/card field shape.
 */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

export function publicSourceCardText(value = "") {
  const text = normalizeText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

export function publicSourceCardUrl(value = "") {
  const url = normalizeText(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

export function sanitizePublicSourceCard(card = {}) {
  const citation = publicSourceCardText(card.citation || card.label || card.displayLabel || card.title || "");
  const title = publicSourceCardText(card.title) || citation || "Source";
  const displayLabel = publicSourceCardText(card.displayLabel || card.label || citation || title) || title;
  const safeUrl = publicSourceCardUrl(card.publicUrl || card.public_url || "");

  // PHASE-10A14-R5 (P1-R4-001): carry a sanitized Section 51 amendment-chain summary
  // (non-sensitive: official law identifiers + canonical URLs + reviewed flag) so a
  // current Section 51 card records that the later amendment chain (RA 11976 EOPT /
  // RA 12214 CMEPA) was reviewed rather than implying "RA 10963 is the only current
  // authority".
  const chainReviewed = card.amendmentChainReviewed === true || card.metadata?.amendmentChainReviewed === true;
  let amendmentChain;
  if (chainReviewed) {
    const laws = card.officialAmendmentLaws || card.metadata?.officialAmendmentLaws || [];
    amendmentChain = {
      reviewed: true,
      status: publicSourceCardText(card.amendmentChainStatus || card.metadata?.amendmentChainStatus || ""),
      currentAuthoritySet: safeArray(card.currentAuthoritySet || card.metadata?.currentAuthoritySet).map(publicSourceCardText).filter(Boolean),
      amendingAuthorities: safeArray(card.amendingAuthorities || card.metadata?.amendingAuthorities).map(publicSourceCardText).filter(Boolean),
      officialLaws: safeArray(laws)
        .map((l) => ({ id: publicSourceCardText(l.id || ""), title: publicSourceCardText(l.title || ""), url: publicSourceCardUrl(l.url || "") }))
        .filter((l) => l.id)
    };
  }

  return {
    label: displayLabel,
    title,
    citation,
    authorityType: publicSourceCardText(card.authorityType || card.authority_type || ""),
    displayLabel,
    limitationRequired: card.limitationRequired === true,
    ...(safeUrl ? { publicUrl: safeUrl } : {}),
    ...(amendmentChain ? { amendmentChainReviewed: true, amendmentChain } : {})
  };
}

export function sanitizePublicSourceCards(cards = []) {
  return safeArray(cards).map(sanitizePublicSourceCard);
}

export default {
  publicSourceCardText,
  publicSourceCardUrl,
  sanitizePublicSourceCard,
  sanitizePublicSourceCards
};
