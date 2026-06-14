// FILE: services/source-authority-selector.js
"use strict";

/**
 * Source Authority Selector — Stage 1: Passive Diagnostic
 * Version: 1.0.0-diagnostic
 *
 * Inspects existing reranked chunks and produces a candidate source selection
 * for diagnostic comparison only.  Does NOT affect visible source chips, answer
 * context, prompt construction, or any part of normal pipeline behavior.
 *
 * The selector replicates the same gate logic as the pipeline.js source-card
 * loop (Gates 1–3 + priority sort + outbound sanitizer) so that its output can
 * be compared side-by-side with the current sourceCards.  Any divergence is
 * surfaced in the diagnostics object.
 *
 * Exported API:
 *   selectSourceAuthorities(input) → { validatedSources, visibleSourceCards, diagnostics }
 *
 * Input fields:
 *   rerankedChunks      – ctx.rerankedChunks from pipeline
 *   issueClassification – ctx.issueClassification
 *   query               – original user query string
 *   answerText          – generated answer (reserved for Stage 2 answer-support scoring)
 *   mode                – pipeline mode string (e.g. "FULL", "FAST_DEFINITION")
 *   maxSources          – visible chip cap (default 5)
 *   currentSourceCards  – existing sourceCards from pipeline, for diff comparison
 *
 * Stage 2 note:
 *   answerText is accepted but not yet used.  Stage 2 will add answer-support
 *   overlap scoring (excerpt ↔ answer text) as an additional relevance signal.
 *
 * Safety: All errors are caught and returned inside diagnostics.error.
 *   A thrown exception never reaches the caller.
 */

import {
  canonicalSourceKey,
  inferIssuanceNumber
} from "../source-visibility-engine.js";
import {
  hasSemanticNoMatchGuard,
  sourceMaterialTermsMatchAuthority,
  isEwtBridgeEligible
} from "../issue-classification-engine.js";

const SELECTOR_VERSION = "2.0.0-active";
const DEFAULT_CANDIDATE_CAP = 15;
const DEFAULT_MAX_VISIBLE    = 5;

const CARD_ELIGIBLE_SAE_STATUSES = Object.freeze(new Set([
  "AUTHORITY_FOUND",
  "RELATED_AUTHORITY_ONLY"
]));

const CARD_SUPPRESSED_SAE_STATUSES = Object.freeze(new Set([
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "NO_INDEXED_SOURCE"
]));

const SAS_AUTHORITY_PRIORITY = Object.freeze({
  CONSTITUTION: 0,
  STATUTE: 1,
  NIRC: 1,
  TAX_CODE: 1,
  TREATY: 2,
  TAX_TREATY: 2,
  DOUBLE_TAXATION_AGREEMENT: 2,
  DTA: 2,
  SUPREME_COURT: 3,
  SC: 3,
  CTA_EN_BANC: 4,
  CTA_DIVISION: 5,
  CTA: 5,
  RR: 6,
  REVENUE_REGULATION: 6,
  RMO: 7,
  REVENUE_MEMORANDUM_ORDER: 7,
  RMC: 8,
  REVENUE_MEMORANDUM_CIRCULAR: 8,
  BIR_RULING: 9,
  RULING: 9,
  SECONDARY: 10,
  UNKNOWN: 99
});

const REQUIRED_CARD_FIELDS = Object.freeze([
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

// ─── Pure helpers (mirrors pipeline.js; no side-effects) ─────────────────────

function safeStr(v) {
  return typeof v === "string" ? v : String(v == null ? "" : v);
}

function normalizeStatus(value = "") {
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

function resolveSaeStatus(input = {}) {
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

function normalizedEligibilityFields(card = {}) {
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

// PATCH-021F: court source types eligible as jurisprudence cards for case-law
// queries. Court decisions never receive authorityRole GOVERNING for statute-
// target sub-issues, so the AUTHORITY_FOUND eligibility gate structurally
// suppressed them — the exact defect of the post-021E staging audit.
const PATCH_021F_COURT_TYPES = Object.freeze(new Set([
  "CASE", "CASE_LAW", "JURISPRUDENCE",
  "SUPREME_COURT", "SUPREME_COURT_EN_BANC",
  "CTA_EN_BANC", "CTA_DIVISION"
]));

function patch021fCourtSourceType(doc = {}) {
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

function patch021fCourtRef(doc = {}) {
  return String(
    doc.normalizedReference || doc.normalized_reference ||
    doc.citation || doc.document_title || doc.documentTitle || doc.title || ""
  ).trim();
}

function validateSourceCardEligibility(card = {}, saeStatus = "") {
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

function stripInternalCardFields(card = {}) {
  const clean = sanitizePublicSelectorCard(card);
  for (const field of INTERNAL_CARD_FIELDS) {
    delete clean[field];
  }
  return clean;
}

function publicCardText(value = "") {
  const text = safeStr(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/[\\/]/.test(text)) return "";
  if (/\.(?:pdf|docx?|txt|csv|md|json)(?:$|[?#\s])/i.test(text)) return "";
  if (/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text)) return "";
  return text;
}

function publicCardUrl(value = "") {
  const url = safeStr(value).trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function sanitizePublicSelectorCard(card = {}) {
  const citation = publicCardText(card.citation || card.normalizedReference || card.normalized_reference || "");
  const displayLabel = publicCardText(card.displayLabel || card.display_label || citation || card.authorityLabel || "");
  const title = publicCardText(card.title) || displayLabel || citation || "Source";
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
    ...(safeUrl ? { publicUrl: safeUrl } : {})
  };
}

function sourceCardBasename(value = "") {
  return safeStr(value).replace(/^.*[/\\]/, "");
}

function sourceCardIdentityBlob(c = {}) {
  const meta = c.metadata || {};
  return [
    c.issuanceNumber, c.displayTitle, c.sourceTitle, c.source_title,
    c.document_title, c.documentTitle, c.source,
    c.originalSource, c.original_source, c.path, c.source_path,
    meta.documentTitle, meta.document_title, meta.originalFileName,
    meta.original_file_name, meta.originalSource, meta.path, meta.source_path
  ]
    .filter(Boolean)
    .map(sourceCardBasename)
    .join(" ");
}

function inferLinkedSourceType(c = {}) {
  const blob = sourceCardIdentityBlob(c).toLowerCase();
  if (/(^|[\s_/.-])rr[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue regulation")) return "RR";
  if (/(^|[\s_/.-])rmc[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum circular")) return "RMC";
  if (/(^|[\s_/.-])rmo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum order")) return "RMO";
  if (/(^|[\s_/.-])ramo[\s_.-]*\d+[\s_.-]*\d{2,4}\b/.test(blob) || blob.includes("revenue audit memorandum order")) return "RAMO";
  if (blob.includes("01_tax_code") || blob.includes("nirc") || blob.includes("tax code")) return "NIRC";
  if (/\bra[\s_.-]*(?:no[\s_.-]*)?\d{4,6}\b/.test(blob) || blob.includes("republic act")) return "RA";
  // PATCH-023B: fall back to authorityType field when the identity blob lacks document-type
  // markers (e.g. NIRC statute chunks whose source paths don't contain "nirc" / "tax code").
  // Without this, inferSourceCardRef returns "" → provRef = "" → displayLabel falls to
  // metadata.displayLabel = "Primary Statute" instead of "NIRC Sec. 57".
  const rawType = String(
    c.authorityType || c.authority_type || (c.metadata || {}).authorityType || ""
  ).trim().toUpperCase();
  if (["STATUTE", "NIRC", "TAX_CODE"].includes(rawType)) return "NIRC";
  if (rawType === "RR" || rawType === "REVENUE_REGULATION") return "RR";
  if (rawType === "RMC") return "RMC";
  if (rawType === "RMO") return "RMO";
  if (rawType === "RAMO") return "RAMO";
  return "";
}

function sourceCardYear(value = "") {
  const text = safeStr(value);
  if (text.length !== 2) return text;
  return Number(text) <= 30 ? `20${text}` : `19${text}`;
}

function inferAdministrativeRef(blob = "", type = "") {
  const prefix  = safeStr(type).toUpperCase();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escaped}[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i"),
    new RegExp(`\\bRevenue\\s+(?:Audit\\s+)?(?:Regulations?|Memorandum\\s+(?:Circulars?|Orders?))[-\\s_]*(?:No\\.?)?[-\\s_]*0*(\\d+)[-\\s_/](\\d{2,4})\\b`, "i")
  ];
  for (const pattern of patterns) {
    const match = safeStr(blob).match(pattern);
    if (match) return `${prefix} No. ${Number(match[1])}-${sourceCardYear(match[2])}`;
  }
  return "";
}

function inferSourceCardRef(c = {}, linkedType = "") {
  const meta           = c.metadata || {};
  const identityBlob   = sourceCardIdentityBlob(c);
  const normalizedRef  =
    c.normalizedReference || c.normalized_reference ||
    meta.normalizedReference || meta.normalized_reference || "";

  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    return inferAdministrativeRef(identityBlob, linkedType);
  }

  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    const nircExtra = [
      c.title, c.sectionHeading, c.section_heading, c.sectionTitle, c.section_title,
      String(c.text || c.content || "").slice(0, 500)
    ].filter(Boolean).join(" ");
    const nircBlob = [normalizedRef, c.citation, c.reference, identityBlob, nircExtra]
      .filter(Boolean).join(" ");
    const direct = nircBlob.match(/\b(?:NIRC|Tax Code)\s+Sec(?:tion)?\.?\s*(\d+[A-Z]?)\b/i);
    if (direct) return `NIRC Sec. ${direct[1]}`;
    const normalizedMatch = nircBlob.match(/\b(?:NIRC|TAX_CODE)_SEC_(\d+[A-Z]?)\b/i);
    if (normalizedMatch) return `NIRC Sec. ${normalizedMatch[1]}`;
    const bare = nircBlob.match(/\bSec(?:tion)?\.?\s+(\d{1,3}[A-Z]?)\b/i);
    if (bare) return `NIRC Sec. ${bare[1]}`;
    return "Tax Code";
  }

  if (linkedType === "RA") {
    const match = identityBlob.match(/\bRA[-\s_]*(?:No\.?)?[-\s_]*(\d{4,6})\b/i);
    if (match) return `RA No. ${match[1]}`;
  }

  // Fallback: use inferIssuanceNumber from source-visibility-engine (no normalizedRef override)
  return inferIssuanceNumber({
    ...c,
    title:               "",
    normalizedReference: "",
    normalized_reference: "",
    metadata: {
      ...meta,
      normalizedReference:  "",
      normalized_reference: ""
    }
  });
}

function sourceCardLabelType(label = "") {
  const text = safeStr(label).trim().toUpperCase();
  if (/^NIRC\b|^TAX CODE\b/.test(text))                        return "NIRC";
  if (/^RR\b|^REVENUE REGULATIONS?\b/.test(text))              return "RR";
  if (/^RMC\b|^REVENUE MEMORANDUM CIRCULAR\b/.test(text))      return "RMC";
  if (/^RMO\b|^REVENUE MEMORANDUM ORDER\b/.test(text))         return "RMO";
  if (/^RAMO\b|^REVENUE AUDIT MEMORANDUM ORDER\b/.test(text))  return "RAMO";
  if (/^RA\b|^REPUBLIC ACT\b/.test(text))                      return "RA";
  return "";
}

function sourceCardIsConsistent(label = "", linkedType = "") {
  const labelType = sourceCardLabelType(label);
  if (!labelType || !linkedType) return true;
  if (labelType === "NIRC") return ["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType);
  if (labelType === "RA")   return ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(linkedType);
  return labelType === linkedType;
}

function isTargetAllowedCard(provRef, linkedType, targetAuths) {
  if (!targetAuths.length) return true;
  const provKey = canonicalSourceKey(provRef);
  if (targetAuths.some(a => canonicalSourceKey(a) === provKey)) return true;
  if (/^tax code$/i.test(provRef)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a));
  }
  return false;
}

function deriveTargetSafeDocumentRef(c, linkedType, targetAuths) {
  if (!targetAuths.length) return null;
  if (["NIRC", "STATUTE", "TAX_CODE"].includes(linkedType)) {
    return targetAuths.some(a => /\b(?:NIRC|Tax\s*Code)\b/i.test(a)) ? "Tax Code" : null;
  }
  if (["RR", "RMC", "RMO", "RAMO"].includes(linkedType)) {
    const adminRef = inferAdministrativeRef(sourceCardIdentityBlob(c), linkedType);
    if (adminRef && isTargetAllowedCard(adminRef, linkedType, targetAuths)) return adminRef;
    return null;
  }
  return null;
}

function isIssueRelevantSourceCardCandidate(c) {
  if (c.issueMismatch === true) {
    return { allowed: false, reason: "issue_mismatch" };
  }
  const icm = c.issueClassificationMatch;
  if (!icm || typeof icm !== "object") {
    return { allowed: true, reason: "no_icm_data" };
  }
  if (icm.matched === false) {
    return { allowed: false, reason: "non_target_no_issue_relevance" };
  }
  return { allowed: true, reason: icm.matched === true ? "issue_match" : "unknown_allow" };
}

function sourceCardDocumentTitle(c = {}) {
  const meta = c.metadata || {};
  return safeStr(
    c.document_title || c.documentTitle || meta.documentTitle || meta.document_title ||
    meta.originalFileName || meta.original_file_name ||
    c.source || c.originalSource || c.original_source ||
    c.path || c.source_path || c.title || "Source"
  ).slice(0, 80);
}

function sanitizeSelectorCards(cards) {
  const result = [];
  for (const card of cards) {
    const labelRef  = (card.normalizedReference || card.citation || "").trim();
    const labelType = sourceCardLabelType(labelRef);
    if (!labelType) { result.push(card); continue; }

    const reChunk = {
      source:         card.source         || "",
      document_title: card.document_title || "",
      documentTitle:  card.documentTitle  || ""
    };
    const recomputedType = inferLinkedSourceType(reChunk);
    const effectiveType  = recomputedType || card.linkedSourceType || "";
    if (!effectiveType) { result.push(card); continue; }

    const consistent =
      labelType === effectiveType ||
      (labelType === "NIRC" && ["NIRC", "STATUTE", "TAX_CODE"].includes(effectiveType)) ||
      (labelType === "RA"   && ["RA",   "NIRC",    "STATUTE",  "TAX_CODE"].includes(effectiveType));

    if (consistent) { result.push(card); continue; }

    // Inconsistent: attempt relabel
    let correctedRef = "";
    if (["RR", "RMC", "RMO", "RAMO"].includes(effectiveType)) {
      correctedRef = inferAdministrativeRef(sourceCardIdentityBlob(reChunk), effectiveType);
    }
    if (!correctedRef) {
      // Cannot safely relabel — drop silently (no console.warn in diagnostic path)
      continue;
    }
    const docTitle  = card.documentTitle || card.document_title || "";
    const newTitle  = correctedRef && docTitle ? `${correctedRef} — ${docTitle}` : correctedRef || docTitle || "Source";
    result.push({
      ...card,
      title:               newTitle,
      citation:            correctedRef,
      normalizedReference: correctedRef,
      normalized_reference: correctedRef,
      linkedSourceType:    effectiveType
    });
  }
  return result;
}

// ─── Diff helper ──────────────────────────────────────────────────────────────

/**
 * Compare selector output with current pipeline sourceCards.
 * Returns { same, added, removed } where added/removed are arrays of refs.
 */
function diffSourceCards(selectorCards = [], currentCards = []) {
  const selectorRefs = new Set(
    selectorCards.map(c => canonicalSourceKey(c.normalizedReference || c.citation || "")).filter(Boolean)
  );
  const currentRefs  = new Set(
    currentCards.map(c => canonicalSourceKey(c.normalizedReference || c.citation || "")).filter(Boolean)
  );

  const added   = [...selectorRefs].filter(k => !currentRefs.has(k));
  const removed = [...currentRefs].filter(k => !selectorRefs.has(k));

  return {
    same:    added.length === 0 && removed.length === 0,
    added,   // in selector but absent from current sourceCards
    removed  // in current sourceCards but absent from selector
  };
}

// ─── NIRC generic-label detection (Blocker 1) ────────────────────────────────

/**
 * Returns true when ref is a generic NIRC document-level label with no specific
 * section number.  Matches: "Tax Code", "NIRC Tax Code", bare "NIRC", and
 * "National Internal Revenue Code".  Does NOT match specific section labels
 * ("NIRC Sec. 105") or section ranges ("NIRC Secs. 84-97").
 */
function isGenericNircDocumentLabel(ref = "") {
  const r = safeStr(ref).trim();
  if (!r) return false;
  // Exact generic fallback labels produced by inferSourceCardRef / resolveSourceCardDisplayRef
  if (/^(?:nirc\s+)?tax\s+code$/i.test(r)) return true;
  // Full document name
  if (/^national\s+internal\s+revenue\s+code\b/i.test(r)) return true;
  // Bare "NIRC..." without a section number or section-range number
  if (/^nirc\b/i.test(r) &&
      !/\bsec(?:tion)?\.?\s*\d/i.test(r) &&   // no "Sec. NNN"
      !/\bsecs?\.\s*\d/i.test(r)) return true; // no "Secs. NNN-MMM"
  return false;
}

/** Returns true when ref identifies a specific NIRC section, e.g. "NIRC Sec. 105". */
function isExactNircSectionLabel(ref = "") {
  return /\bNIRC\s+Sec(?:tion)?\.?\s*\d/i.test(safeStr(ref));
}

// ─── Range section-number helpers (Blocker 2) ────────────────────────────────

/**
 * Extracts the first section number from a reference string such as "NIRC Sec. 91".
 * Returns null when no number is found.
 */
function extractSectionNumber(ref = "") {
  const m = safeStr(ref).match(/\bsec(?:tion)?\.?\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Parses a section range from an authority string.  Returns { start, end } or null.
 *
 * Handles all standard forms:
 *   "NIRC Secs. 84-97"     "NIRC Secs. 84–97"
 *   "NIRC Sections 84-97"  "NIRC Sections 84 to 97"
 *   "Secs. 98-104"         "Sections 98 to 104"
 *   "Sec. 116 to Sec. 127"
 */
function parseRangeFromAuthority(auth = "") {
  const m = safeStr(auth).match(
    /\b(?:secs?|sections?)\s*\.?\s*(\d+)\s*(?:[-–]|to)\s*(?:secs?|sections?)?\s*\.?\s*(\d+)/i
  );
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end   = parseInt(m[2], 10);
  if (isNaN(start) || isNaN(end) || start > end) return null;
  return { start, end };
}

/**
 * Searches authorities for the first entry that is a section range whose bounds
 * contain the section number extracted from cardRef.  Returns { start, end } or null.
 */
function findCoveringRange(cardRef = "", authorities = []) {
  const secNum = extractSectionNumber(cardRef);
  if (secNum === null) return null;
  for (const auth of authorities) {
    const r = parseRangeFromAuthority(auth);
    if (!r) continue;
    if (secNum >= r.start && secNum <= r.end) return r;
  }
  return null;
}

// ─── Off-plan NIRC section suppression helpers ───────────────────────────────

/**
 * Builds a NIRC authority plan from the issueClassification.
 * Returns { exactSections: Set<number>, ranges: Array<{start,end}> } when
 * the plan contains at least one explicit section or range entry.
 * Returns null when no specific NIRC section or range is found (e.g. only
 * "NIRC Title III") — no off-plan suppression is applied in that case.
 */
function buildNircAuthorityPlan(issueClassification = {}) {
  const allAuths = [
    ...(issueClassification.targetAuthorities        || []),
    ...(issueClassification.controllingAuthorities   || []),
    ...(issueClassification.targetAuthorityGroups?.controllingAuthorities || []),
    ...(issueClassification.supportingAuthorities    || []),
    ...(issueClassification.targetAuthorityGroups?.supportingAuthorities  || [])
  ].filter(Boolean);

  const exactSections = new Set();
  const ranges = [];

  for (const auth of allAuths) {
    const r = parseRangeFromAuthority(auth);
    if (r) {
      ranges.push(r);
    } else if (/\bNIRC\b|\bTax\s*Code\b/i.test(auth)) {
      const secNum = extractSectionNumber(auth);
      if (secNum !== null) exactSections.add(secNum);
    }
  }

  if (exactSections.size === 0 && ranges.length === 0) return null;
  return { exactSections, ranges };
}

/**
 * Returns true when the section number from ref is on the NIRC authority plan
 * (exact match or inside a planned range).  Always returns true when plan is null.
 */
function isNircSectionOnPlan(ref = "", plan = null) {
  if (!plan) return true;
  const secNum = extractSectionNumber(ref);
  if (secNum === null) return true;
  if (plan.exactSections.has(secNum)) return true;
  for (const range of plan.ranges) {
    if (secNum >= range.start && secNum <= range.end) return true;
  }
  return false;
}

// ─── Authority-priority sort helper ──────────────────────────────────────────

/**
 * Returns a numeric sort score for a candidate source card.
 * Lower score = higher display priority.
 *
 * Priority 1 (score 0..n-1):     Tier 1 exact match in controllingAuthorities, in classifier order.
 * Priority 2 (score 150):        Tier 1 exact match in targetAuthorities, not in controlling/supporting.
 * Priority 3 (score 100..199):   Tier 2 range match — score = 100 + (sectionNum − rangeStart),
 *                                 giving deterministic ordering by section number within the range.
 * Priority 4 (score 200..m):     Tier 1 exact match in supportingAuthorities, in classifier order.
 * Priority 5 (score 1000+):      Tier 3/4 generic family or no match.
 *
 * _rerankScore is used only as a tiebreaker after the authority-plan score, so
 * semantic similarity cannot reorder sections within the same range.
 */
function _computeCardSortScore(card, controllingAuths, supportingAuths) {
  const tier    = Number(card._authorityMatchTier || 4);
  const cardKey = canonicalSourceKey(card.normalizedReference || card.citation || "");

  if (!cardKey) return 1500 + tier * 100;

  if (tier <= 2) {
    // Priority 1 — exact match in controllingAuthorities (classifier order: 0..n-1)
    const ci = controllingAuths.findIndex(a => canonicalSourceKey(a) === cardKey);
    if (ci >= 0) return ci;

    // Priority 3 — Tier 2 range match.
    // Score = 100 + (sectionNumber − rangeStart), giving deterministic ordering
    // by section number within the range.  Capped at 0..99 offset so all Tier 2
    // scores stay in [100, 199] and never bleed into Priority 4 (200+).
    // rerankScore is NOT used here — only after the authority-plan score.
    if (tier === 2) {
      const cardRef  = card.normalizedReference || card.citation || "";
      const covering = findCoveringRange(cardRef, [...controllingAuths, ...supportingAuths]);
      if (covering) {
        const secNum = extractSectionNumber(cardRef);
        if (secNum !== null) {
          const offset = Math.min(Math.max(0, secNum - covering.start), 99);
          return 100 + offset;
        }
      }
      return 100;
    }

    // Priority 4 — exact match in supportingAuthorities (200..m)
    const si = supportingAuths.findIndex(a => canonicalSourceKey(a) === cardKey);
    if (si >= 0) return 200 + si;

    // Priority 2 — Tier 1 exact match not found in controlling or supporting lists
    return 150;
  }

  // Priority 5 — Tier 3 generic family match or Tier 4 no match
  return tier === 3 ? 1000 : 2000;
}

function _authorityPriorityOf(card = {}) {
  const rawType =
    card.authorityType ||
    card.authority_type ||
    card.metadata?.authorityType ||
    card.metadata?.authority_type ||
    "";
  const authorityType = normalizeStatus(rawType) || "UNKNOWN";
  return SAS_AUTHORITY_PRIORITY[authorityType] ?? SAS_AUTHORITY_PRIORITY.UNKNOWN;
}

function _compareBySasAuthorityPriority(a, b, controllingAuths, supportingAuths) {
  const aPriority = _authorityPriorityOf(a);
  const bPriority = _authorityPriorityOf(b);
  if (aPriority !== bPriority) return aPriority - bPriority;

  const aScore = _computeCardSortScore(a, controllingAuths, supportingAuths);
  const bScore = _computeCardSortScore(b, controllingAuths, supportingAuths);
  if (aScore !== bScore) return aScore - bScore;

  return (b._rerankScore || 0) - (a._rerankScore || 0);
}

// ─── Main selector ────────────────────────────────────────────────────────────

/**
 * selectSourceAuthorities — Active Source Authority Selector (v2)
 *
 * Selects and orders source cards from the reranked pool using issueClassification
 * authority metadata.  This is the active Single Source of Truth for source card
 * ordering — it is NOT merely diagnostic.
 *
 * Sort order (lowest score = highest priority):
 *   1. Exact controlling authorities in issueClassification.controllingAuthorities,
 *      in classifier order.
 *   2. Exact targetAuthorities matches (not in controlling), in classifier order.
 *   3. Range members (section number falls within a named range target, Tier 2).
 *   4. Exact supportingAuthorities matches, in classifier order.
 *   5. Generic issue-relevant authorities (Tier 3/4, pass Gate 3).
 *
 * Gates (applied before scoring):
 *   Gate 0 — visibility (shouldHideSource): enforced by pipeline caller, not here.
 *   Gate 1 — contamination: both targetAuthorityMatch===false AND issueMismatch===true.
 *   Gate 2 — label/link consistency: NIRC labels must link to NIRC/statute docs, etc.
 *   Gate 3 — issue relevance: non-exact-match candidates must have affirmative relevance.
 *
 * Never throws.  All exceptions are caught and returned in diagnostics.error.
 *
 * @param {{
 *   rerankedChunks:      object[],
 *   issueClassification: object,
 *   query:               string,
 *   answerText:          string,
 *   mode:                string,
 *   maxSources:          number,
 *   saeStatus:           string,
 *   sourceAvailability:  object,
 *   currentSourceCards:  object[]
 * }} input
 * @returns {{ validatedSources: object[], visibleSourceCards: object[], diagnostics: object }}
 */
export function selectSourceAuthorities({
  rerankedChunks      = [],
  issueClassification = {},
  query               = "",      // eslint-disable-line no-unused-vars
  answerText          = "",      // eslint-disable-line no-unused-vars — reserved Stage 2
  mode                = "",      // eslint-disable-line no-unused-vars
  maxSources          = DEFAULT_MAX_VISIBLE,
  saeStatus           = "",
  sourceStatus        = "",
  sourceAvailability  = null,
  sourceAvailabilityMetadata = null,
  currentSourceCards  = []
} = {}) {
  try {
    const targetAuths          = issueClassification?.targetAuthorities || [];
    const hasTargetAuthorities = targetAuths.length > 0;
    const semanticNoMatchGuardActive = hasSemanticNoMatchGuard(issueClassification || {});
    const candidateCap         = Math.max(maxSources * 3, DEFAULT_CANDIDATE_CAP);
    const visibleCap           = Math.min(maxSources, DEFAULT_MAX_VISIBLE);
    const resolvedSaeStatus    = resolveSaeStatus({
      saeStatus,
      sourceStatus,
      sourceAvailability,
      sourceAvailabilityMetadata
    });
    const eligibilityGateActive = CARD_ELIGIBLE_SAE_STATUSES.has(resolvedSaeStatus);

    if (CARD_SUPPRESSED_SAE_STATUSES.has(resolvedSaeStatus)) {
      const diagnostics = {
        selectorVersion: SELECTOR_VERSION,
        computedAt: new Date().toISOString(),
        totalChunksInspected: rerankedChunks.length,
        eligibilityStatus: "SUPPRESSED",
        saeStatus: resolvedSaeStatus,
        suppressionReason: `sae_status_${resolvedSaeStatus.toLowerCase()}`,
        validationFailures: [],
        visibleCount: 0,
        accepted: 0,
        rejected: rerankedChunks.length
      };
      return { validatedSources: [], visibleSourceCards: [], diagnostics };
    }

    const seen  = new Map();  // dedupeKey → { card, _targetMatch }
    const skip  = { contamination: 0, consistency: 0, issueRelevance: 0, eligibility: 0, semanticNoMatch: 0 };
    const rejectDetails = [];
    const eligibilityDetails = [];

    // PATCH-021F: jurisprudence queries accept court sources as supporting
    // jurisprudence cards — they bypass the GOVERNING eligibility requirement
    // and the contamination/semantic gates (which are tuned for statute/RR
    // targets), but must still carry a usable reference or title.
    const _021fJurisIntent = issueClassification?.isJurisprudenceQuery === true;

    for (const c of rerankedChunks) {
      if (seen.size >= candidateCap) break;

      const _021fCourtType = _021fJurisIntent ? patch021fCourtSourceType(c) : null;
      const _021fCourtOverride = Boolean(_021fCourtType && patch021fCourtRef(c));

      let eligibility = eligibilityGateActive
        ? validateSourceCardEligibility(c, resolvedSaeStatus)
        : { eligible: true, fields: normalizedEligibilityFields(c), validationFailures: [], suppressionReason: null };
      if (!eligibility.eligible && _021fCourtOverride) {
        eligibility = {
          eligible: true,
          fields: {
            ...eligibility.fields,
            authorityRole: "SUPPORTING_JURISPRUDENCE",
            authorityType: _021fCourtType,
            citation: eligibility.fields.citation || patch021fCourtRef(c),
            displayLabel: eligibility.fields.displayLabel || patch021fCourtRef(c)
          },
          validationFailures: [],
          suppressionReason: null
        };
        console.log("[PATCH_021F_COURT_CARD_ELIGIBILITY_APPLIED]", {
          stage: "sas_eligibility_override",
          ref: patch021fCourtRef(c),
          courtType: _021fCourtType,
          role: "SUPPORTING_JURISPRUDENCE"
        });
      }
      if (!eligibility.eligible) {
        skip.eligibility++;
        eligibilityDetails.push({
          ref: c.normalizedReference || c.normalized_reference || c.citation || c.title || "(no-ref)",
          eligibilityStatus: "SUPPRESSED",
          suppressionReason: eligibility.suppressionReason,
          validationFailures: eligibility.validationFailures
        });
        continue;
      }

      // Gate 1 — contamination (both flags required)
      // PATCH-021F: court sources for jurisprudence queries are exempt — they
      // are never statute/RR target matches by construction.
      if (!_021fCourtOverride && hasTargetAuthorities && c.targetAuthorityMatch === false && c.issueMismatch === true) {
        skip.contamination++;
        rejectDetails.push({ ref: "(pre-label)", reason: "contamination" });
        continue;
      }

      // Gate 3 — Semantic No-Match Guard (PATCH-016)
      // Bypassed by PATCH-017A Bridge for EWT authorities
      const ewtBridgeActive = isEwtBridgeEligible(issueClassification, c, query);

      if (semanticNoMatchGuardActive && !ewtBridgeActive && !_021fCourtOverride) {
        if (!sourceMaterialTermsMatchAuthority(c, query)) {
          skip.semanticNoMatch++;
          rejectDetails.push({
            ref: c.normalizedReference || c.title || "(no-ref)",
            reason: "semantic_no_match"
          });
          continue;
        }
      }

      if (ewtBridgeActive) {
        console.log(`[SEMANTIC_SOURCE_SELECTION_BRIDGE] Bypassing no-match for EWT authority:`, {
          query: query.slice(0, 100),
          primaryIssue: issueClassification.primaryIssue,
          subIssue: issueClassification.subIssue,
          matchedAuthority: c.normalizedReference || c.citation || c.title,
          reason: "ewt_target_match_with_keywords"
        });
      }

      const linkedType = inferLinkedSourceType(c);
      let   provRef    = inferSourceCardRef(c, linkedType);

      // PATCH-021F: court cards label from their case reference directly.
      if (_021fCourtOverride && !provRef) {
        provRef = patch021fCourtRef(c);
      }

      // Gate 2 — label/link consistency (court override: the case reference
      // IS the document identity — statute-style consistency rules don't apply)
      if (!_021fCourtOverride && provRef && !sourceCardIsConsistent(provRef, linkedType)) {
        skip.consistency++;
        rejectDetails.push({ ref: provRef, reason: "label_link_mismatch", linkedType });
        continue;
      }

      // Priority signal (not a filter — sets _targetMatch flag)
      let _targetMatch = !hasTargetAuthorities;
      if (hasTargetAuthorities) {
        if (provRef) {
          _targetMatch = isTargetAllowedCard(provRef, linkedType, targetAuths);
        } else {
          const safeRef = deriveTargetSafeDocumentRef(c, linkedType, targetAuths);
          if (safeRef) { provRef = safeRef; _targetMatch = true; }
        }
      }

      // Gate 3 — issue relevance (non-target candidates only)
      // PATCH-021F: court override cards already passed retrieval relevance +
      // 021C promotion for this jurisprudence query.
      if (!_targetMatch && !_021fCourtOverride) {
        const rel = isIssueRelevantSourceCardCandidate(c);
        if (!rel.allowed) {
          skip.issueRelevance++;
          rejectDetails.push({ ref: provRef || "(no-ref)", reason: rel.reason,
            src: c.source || c.document_title || "" });
          continue;
        }
      }

      // Change-A guard — DB normalizedReference mislabel
      if (!provRef && linkedType) {
        const meta   = c.metadata || {};
        const dbRef  =
          c.normalizedReference || c.normalized_reference ||
          meta.normalizedReference || meta.normalized_reference || "";
        if (dbRef) {
          const dbLabelType = sourceCardLabelType(dbRef);
          if (dbLabelType && !sourceCardIsConsistent(dbRef, linkedType)) {
            skip.consistency++;
            rejectDetails.push({ ref: dbRef, reason: "label_link_mismatch", note: "db_normalizedRef_leak" });
            continue;
          }
        }
      }

      const docTitle  = sourceCardDocumentTitle(c);
      const dedupeKey = provRef
        ? canonicalSourceKey(provRef)
        : (docTitle + "|" + String(c.chunk_index || c.id || "")).toLowerCase().slice(0, 60);

      if (seen.has(dedupeKey)) continue;

      const meta = c.metadata || {};
      const url  =
        c.driveViewUrl    || c.drive_view_url    || c.url             || c.webViewLink     ||
        c.web_view_link   || c.sourceUrl         || c.source_url      ||
        meta.driveViewUrl || meta.drive_view_url || meta.url          || meta.webViewLink  ||
        meta.web_view_link || meta.sourceUrl     || meta.source_url   || "";
      const eligibilityFields = eligibility.fields;

      seen.set(dedupeKey, {
        _targetMatch,
        _authorityMatchTier: c.authorityMatchTier ||
                             c.issueClassificationMatch?.authorityMatchTier || 4,
        _rerankScore:        c.rerankScore || c.finalScore || c.score || 0,
        title:               provRef && docTitle ? `${provRef} — ${docTitle}` : provRef || docTitle || "Source",
        displayLabel:        provRef || eligibilityFields.displayLabel || docTitle || "Source",
        citation:            provRef || eligibilityFields.citation || c.citation || "",
        authorityId:         eligibilityFields.authorityId || "",
        authorityType:       eligibilityFields.authorityType || c.authorityType || c.authority_type || "UNKNOWN",
        authorityRole:       eligibilityFields.authorityRole || "UNKNOWN",
        authorityLevel:      eligibilityFields.authorityLevel ?? null,
        isIndexed:           eligibilityFields.isIndexed,
        isParsed:            eligibilityFields.isParsed,
        isGoverning:         eligibilityFields.isGoverning,
        limitationRequired:  eligibilityFields.limitationRequired,
        authorityMatchTier:  c.authorityMatchTier ||
                             c.issueClassificationMatch?.authorityMatchTier || 4,
        driveViewUrl:        url,
        drive_view_url:      url,
        url,
        webViewLink:         c.webViewLink    || meta.webViewLink    || "",
        web_view_link:       c.web_view_link  || meta.web_view_link  || "",
        sourceUrl:           c.sourceUrl      || c.source_url        || meta.sourceUrl   || meta.source_url || "",
        source_url:          c.source_url     || meta.source_url     || "",
        documentTitle:       c.document_title || c.documentTitle     || meta.documentTitle || docTitle || "",
        document_title:      c.document_title || meta.documentTitle  || "",
        normalizedReference: provRef || c.normalizedReference || c.normalized_reference || meta.normalizedReference || "",
        normalized_reference: provRef || c.normalized_reference || meta.normalizedReference || "",
        reference:           c.reference || "",
        source:              c.source    || "",
        linkedSourceType:    linkedType,
        excerpt:             String(c.text || c.content || "").slice(0, 300)
      });
    }

    const controllingAuths = [
      ...(issueClassification?.controllingAuthorities || []),
      ...(issueClassification?.targetAuthorityGroups?.controllingAuthorities || [])
    ].filter((v, i, a) => v && a.indexOf(v) === i);
    const supportingAuths  = [
      ...(issueClassification?.supportingAuthorities || []),
      ...(issueClassification?.targetAuthorityGroups?.supportingAuthorities || [])
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    const allCandidates = [...seen.values()];
    allCandidates.sort((a, b) => _compareBySasAuthorityPriority(a, b, controllingAuths, supportingAuths));

    const _hasExactNircSection = allCandidates.some(c =>
      isExactNircSectionLabel(c.normalizedReference || c.citation || "")
    );
    const afterGenericSuppress = _hasExactNircSection
      ? allCandidates.filter(c => !isGenericNircDocumentLabel(c.normalizedReference || c.citation || ""))
      : allCandidates;
    const _genericSuppressed = allCandidates.length - afterGenericSuppress.length;

    const _nircPlan = buildNircAuthorityPlan(issueClassification);
    const finalSorted = _nircPlan
      ? afterGenericSuppress.filter(c => {
          const ref = c.normalizedReference || c.citation || "";
          if (!isExactNircSectionLabel(ref)) return true;
          return isNircSectionOnPlan(ref, _nircPlan);
        })
      : afterGenericSuppress;
    const _offPlanSuppressed = afterGenericSuppress.length - finalSorted.length;

    // eslint-disable-next-line no-unused-vars
    const validatedSources = finalSorted
      .map(({ _targetMatch, _authorityMatchTier, _rerankScore, ...card }) => stripInternalCardFields(card));

    // eslint-disable-next-line no-unused-vars
    const preClean         = finalSorted.slice(0, visibleCap).map(({ _targetMatch, _authorityMatchTier, _rerankScore, ...card }) => card);
    const visibleSourceCards = sanitizeSelectorCards(preClean).map(stripInternalCardFields);

    const diff = diffSourceCards(visibleSourceCards, currentSourceCards);

    const diagnostics = {
      selectorVersion:       SELECTOR_VERSION,
      computedAt:            new Date().toISOString(),
      totalChunksInspected:  rerankedChunks.length,
      eligibilityStatus:     eligibilityGateActive ? "ENFORCED" : "NOT_EVALUATED",
      saeStatus:             resolvedSaeStatus || null,
      suppressionReason:     eligibilityDetails.length ? "card_validation_failed" : null,
      validationFailures:    eligibilityDetails.slice(0, 10),
      candidatesCollected:         allCandidates.length,
      genericNircSuppressed:       _genericSuppressed,
      offPlanNircSectionsSuppressed: _offPlanSuppressed,
      tier1Count:            allCandidates.filter(v => Number(v._authorityMatchTier || 4) === 1).length,
      tier2Count:            allCandidates.filter(v => Number(v._authorityMatchTier || 4) === 2).length,
      tier3Count:            allCandidates.filter(v => Number(v._authorityMatchTier || 4) === 3).length,
      accepted:              validatedSources.length,
      rejected:              skip.contamination + skip.consistency + skip.issueRelevance + skip.eligibility,
      rejectionBreakdown: {
        contamination:  skip.contamination,
        consistency:    skip.consistency,
        issueRelevance: skip.issueRelevance,
        eligibility:    skip.eligibility
      },
      rejectedDetails:       [...eligibilityDetails, ...rejectDetails].slice(0, 10),
      visibleCount:          visibleSourceCards.length,
      targetAuths:           targetAuths.slice(0, 8),
      selectorLabels:        visibleSourceCards.map(c => c.normalizedReference || c.citation || "(none)"),
      currentLabels:         currentSourceCards.map(c => c.normalizedReference || c.citation || "(none)"),
      diffFromCurrentSourceCards: diff,
      note: diff.same
        ? "selector output matches current sourceCards"
        : "selector output DIFFERS from current sourceCards — review rejectedDetails and diff"
    };

    return { validatedSources, visibleSourceCards, diagnostics };

  } catch (err) {
    const diagnostics = {
      selectorVersion: SELECTOR_VERSION,
      computedAt:      new Date().toISOString(),
      error:           String(err?.message || err),
      stack:           String(err?.stack || "").split("\n").slice(0, 5).join("\n"),
      totalChunksInspected: rerankedChunks?.length ?? 0
    };
    return { validatedSources: [], visibleSourceCards: [], diagnostics };
  }
}

export default { selectSourceAuthorities, SELECTOR_VERSION };
  