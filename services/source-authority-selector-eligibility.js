// FILE: services/source-authority-selector-eligibility.js
"use strict";

export const CARD_ELIGIBLE_SAE_STATUSES = Object.freeze(new Set([
  "AUTHORITY_FOUND",
  "RELATED_AUTHORITY_ONLY"
]));

export const CARD_SUPPRESSED_SAE_STATUSES = Object.freeze(new Set([
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "NO_INDEXED_SOURCE"
]));

export const REQUIRED_CARD_FIELDS = Object.freeze([
  "authorityId",
  "displayLabel",
  "authorityType",
  "authorityRole",
  "authorityLevel",
  "citation",
  "isIndexed",
  "isParsed",
  "isGoverning",
  "limitationRequired"
]);

export const PATCH_021F_COURT_TYPES = Object.freeze(new Set([
  "CASE", "CASE_LAW", "JURISPRUDENCE",
  "SUPREME_COURT", "SUPREME_COURT_EN_BANC",
  "CTA_EN_BANC", "CTA_DIVISION"
]));

function safeStr(v) {
  return typeof v === "string" ? v : String(v == null ? "" : v);
}

export function normalizeStatus(value = "") {
  if (value && typeof value === "object") return "";
  return safeStr(value).trim().toUpperCase();
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstObject(...values) {
  for (const value of values) {
    const candidate = objectOrEmpty(value);
    if (Object.keys(candidate).length > 0) return candidate;
  }
  return {};
}

export function resolveSaeStatus(input = {}) {
  const availability = firstObject(input.sourceAvailabilityMetadata, input.sourceAvailability);
  return normalizeStatus(
    input.saeStatus ||
    input.sourceStatus ||
    availability.saeStatus ||
    availability.sourceAvailability ||
    availability.sourceStatus ||
    availability.status
  );
}

function coalesceCardField(card = {}, camel, snake = null) {
  const meta = card.metadata || {};
  const annotation = card.authorityAnnotation || {};
  const snakeKey = snake || camel.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return card[camel] ?? card[snakeKey] ?? annotation[camel] ?? annotation[snakeKey] ?? meta[camel] ?? meta[snakeKey];
}

function normalizeAuthorityRole(card = {}) {
  return normalizeStatus(coalesceCardField(card, "authorityRole") || "UNKNOWN") || "UNKNOWN";
}

function normalizeBooleanField(value) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

export function normalizedEligibilityFields(card = {}) {
  return {
    authorityId: coalesceCardField(card, "authorityId"),
    displayLabel: coalesceCardField(card, "displayLabel"),
    authorityType: normalizeStatus(coalesceCardField(card, "authorityType")),
    authorityRole: normalizeAuthorityRole(card),
    authorityLevel: coalesceCardField(card, "authorityLevel"),
    citation:
      coalesceCardField(card, "citation") ||
      coalesceCardField(card, "reference") ||
      coalesceCardField(card, "normalizedReference") ||
      coalesceCardField(card, "issuanceNumber"),
    isIndexed: normalizeBooleanField(coalesceCardField(card, "isIndexed")),
    isParsed: normalizeBooleanField(coalesceCardField(card, "isParsed")),
    isGoverning: normalizeBooleanField(coalesceCardField(card, "isGoverning")),
    limitationRequired: normalizeBooleanField(coalesceCardField(card, "limitationRequired"))
  };
}

export function patch021fCourtSourceType(doc = {}) {
  const candidates = [
    doc.authorityType, doc.authority_type,
    doc.metadata?.authorityType, doc.metadata?.authority_type
  ];
  for (const v of candidates) {
    const t = String(v || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (PATCH_021F_COURT_TYPES.has(t)) return t;
  }
  return null;
}

export function patch021fCourtRef(doc = {}) {
  return String(
    doc.normalizedReference || doc.normalized_reference ||
    doc.citation || doc.document_title || doc.documentTitle || doc.title || ""
  ).trim();
}

export function validateSourceCardEligibility(card = {}, saeStatus = "") {
  const failures = [];
  const fields = normalizedEligibilityFields(card);

  if (Object.prototype.hasOwnProperty.call(card, "isSupportingOnly") ||
      Object.prototype.hasOwnProperty.call(card.metadata || {}, "isSupportingOnly") ||
      Object.prototype.hasOwnProperty.call(card.authorityAnnotation || {}, "isSupportingOnly")) {
    failures.push("isSupportingOnly_prohibited");
  }

  for (const field of REQUIRED_CARD_FIELDS) {
    const value = fields[field];
    const missing =
      value === undefined ||
      value === null ||
      value === "" ||
      (field === "authorityLevel" && !Number.isFinite(Number(value)));
    if (missing) failures.push(`missing_${field}`);
  }

  if (saeStatus === "AUTHORITY_FOUND") {
    if (fields.isGoverning !== true) failures.push("authority_found_requires_isGoverning_true");
    if (fields.limitationRequired !== false) failures.push("authority_found_requires_limitationRequired_false");
    if (fields.authorityRole !== "GOVERNING") failures.push("authority_found_requires_governing_role");
  }

  if (saeStatus === "RELATED_AUTHORITY_ONLY") {
    if (fields.isGoverning !== false) failures.push("related_only_requires_isGoverning_false");
    if (fields.limitationRequired !== true) failures.push("related_only_requires_limitationRequired_true");
    if (fields.authorityRole === "GOVERNING") failures.push("related_only_prohibits_governing_role");
  }

  return {
    eligible: failures.length === 0,
    fields,
    validationFailures: failures,
    suppressionReason: failures[0] || null
  };
}
