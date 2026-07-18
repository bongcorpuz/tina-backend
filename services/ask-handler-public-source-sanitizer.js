// FILE: services/ask-handler-public-source-sanitizer.js
"use strict";

import { buildSection51AmendmentChainMetadata } from "../section51-authority-chain.js";

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

  // PHASE-10A14-R6 (P1-R5-001): the amendment-chain summary must survive to the public
  // source card. Upstream top-level fields do not survive the reranker/SAS/DSF
  // re-projection, so for a Section 51 / 51-A / 51(C) card we RE-DERIVE the sanitized
  // chain summary from the card's own provision via the governed resolver (this IS the
  // proposition-specific chain review, not a fabricated flag). Non-Section-51 cards get
  // no amendment-chain metadata. Public representation is sanitized (official law ids +
  // canonical URLs + reviewed flag only; no internal identifiers).
  const chainRef = normalizeText(card.normalizedReference || card.normalized_reference || card.citation || card.displayLabel || card.label || card.title || "");
  const isSection51Card = /\bsec(?:tion|\.)?\s*0*51(?:-?a|\(c\))?\b/i.test(chainRef) || /\b51-?a\b/i.test(chainRef);
  let amendmentChain;
  if (isSection51Card) {
    const m = buildSection51AmendmentChainMetadata(chainRef);
    amendmentChain = {
      reviewed: true,
      chainStatus: publicSourceCardText(m.chainStatus || ""),
      baseCode: publicSourceCardText(m.baseCode || ""),
      originatingLaw: publicSourceCardText(m.originatingLaw || ""),
      currentAuthoritySet: safeArray(m.currentAuthoritySet).map(publicSourceCardText).filter(Boolean),
      reviewedAmendments: safeArray(m.reviewedAmendments).map(publicSourceCardText).filter(Boolean),
      applicableAmendments: safeArray(m.applicableAmendments).map(publicSourceCardText).filter(Boolean),
      reviewedButNotApplicable: safeArray(m.reviewedButNotApplicable).map(publicSourceCardText).filter(Boolean),
      officialLaws: safeArray(m.officialAmendmentLaws)
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
    ...(amendmentChain ? { amendmentChainReviewed: true, chainReviewed: true, amendmentChain } : {})
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
