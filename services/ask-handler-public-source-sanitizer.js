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

  return {
    label: displayLabel,
    title,
    citation,
    authorityType: publicSourceCardText(card.authorityType || card.authority_type || ""),
    displayLabel,
    limitationRequired: card.limitationRequired === true,
    ...(safeUrl ? { publicUrl: safeUrl } : {})
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
