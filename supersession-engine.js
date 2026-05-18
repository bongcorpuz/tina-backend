// FILE: supersession-engine.js
"use strict";

/**
 * TINA Supersession / Authority Validity Engine
 * Version: 3.2.0
 *
 * Constitutional role:
 * - Determine whether an indexed authority is active, superseded, repealed,
 *   amended, expired, future-effective, or historical.
 * - Preserve Master Prompt hierarchy.
 * - Prevent lower authorities from superseding higher authorities.
 *
 * This file must NOT:
 * - retrieve sources,
 * - call OpenAI,
 * - render answers,
 * - fabricate replacements,
 * - infer supersession without textual or metadata support.
 */

import {
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

const ENGINE_VERSION = "3.2.0";

const SUPERSESSION_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  SUPERSEDED: "SUPERSEDED",
  REPEALED: "REPEALED",
  AMENDED: "AMENDED",
  EXPIRED: "EXPIRED",
  HISTORICAL: "HISTORICAL",
  FUTURE_EFFECTIVE: "FUTURE_EFFECTIVE",
  UNKNOWN: "UNKNOWN"
});

/**
 * Master Prompt hierarchy:
 * 1. Constitution
 * 2. NIRC / CMTA / LGC / primary statutes
 * 3. Tax Treaties
 * 4. Supreme Court En Banc
 * 5. Supreme Court Division
 * 6. CTA En Banc
 * 7. CTA Division
 * 8. Revenue Regulations
 * 9. RMC / RMO / RAMO
 * 10. BIR Rulings
 * 11. LGU / BOC issuances
 * 12. PFRS / PAS / PSA when accounting applies
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */
const MASTER_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,

  UNKNOWN: 99
});

const COURT_TYPES = new Set([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "COURT_OF_APPEALS"
]);

const BIR_ISSUANCE_TYPES = new Set([
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

const PRIMARY_TYPES = new Set([
  "CONSTITUTION",
  "STATUTE",
  "NIRC",
  "TAX_CODE",
  "CMTA",
  "LGC",
  "REPUBLIC_ACT",
  "RA",
  "TAX_TREATY"
]);

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function unique(values = []) {
  return [...new Set(safeArray(values).filter(Boolean))];
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    STATUTES: "STATUTE",
    STATUTE: "STATUTE",
    LAW: "STATUTE",
    LAWS: "STATUTE",
    NIRC: "NIRC",
    TAX_CODE: "TAX_CODE",
    CMTA: "CMTA",
    LGC: "LGC",
    REPUBLIC_ACT: "REPUBLIC_ACT",
    RA: "REPUBLIC_ACT",

    TAX_TREATY: "TAX_TREATY",
    TREATY: "TAX_TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",

    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU: "LGU",
    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",

    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY",
    SECONDARY: "SECONDARY",

    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function normalizeRef(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\brevenue regulation[s]?\b/g, "rr")
    .replace(/\brevenue memorandum circular[s]?\b/g, "rmc")
    .replace(/\brevenue memorandum order[s]?\b/g, "rmo")
    .replace(/\brevenue audit memorandum order[s]?\b/g, "ramo")
    .replace(/\bbir ruling no\.?\s*/g, "bir ruling ")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/[^\w\s./()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIssuanceReference(value = "") {
  const text = normalizeRef(value);

  const ra = text.match(/\bra\s*(\d{4,6})\b/i);
  if (ra) return `RA_${ra[1]}`;

  const patterns = [
    ["RR", /\brr\s*0*(\d+)\s*[-/ ]\s*(\d{2,4})\b/i],
    ["RMC", /\brmc\s*0*(\d+)\s*[-/ ]\s*(\d{2,4})\b/i],
    ["RMO", /\brmo\s*0*(\d+)\s*[-/ ]\s*(\d{2,4})\b/i],
    ["RAMO", /\bramo\s*0*(\d+)\s*[-/ ]\s*(\d{2,4})\b/i]
  ];

  for (const [prefix, regex] of patterns) {
    const match = text.match(regex);
    if (match) return `${prefix}_${Number(match[1])}_${normalizeYear(match[2])}`;
  }

  const gr = text.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) return `GR_${String(gr[1]).toUpperCase()}`;

  const cta =
    text.match(/\bcta\s+case\s+([a-z0-9.-]+)\b/i) ||
    text.match(/\bcta\s+eb\s+([a-z0-9.-]+)\b/i) ||
    text.match(/\bcta\s+en\s+banc\s+([a-z0-9.-]+)\b/i);

  if (cta) return `CTA_${String(cta[1]).toUpperCase()}`;

  const ruling = text.match(/\bbir ruling\s*([a-z0-9()/. -]+)\b/i);
  if (ruling) {
    return `BIR_RULING_${String(ruling[1])
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")}`;
  }

  return text.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function authorityTypeOf(doc = {}) {
  return normalizeAuthorityType(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      getAuthorityTypeForDoc(doc) ||
      "UNKNOWN"
  );
}

function authorityLevelOf(doc = {}) {
  const explicit = Number(
    doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  const type = authorityTypeOf(doc);

  return (
    MASTER_PRECEDENCE[type] ||
    getAuthorityLevelForDoc(doc) ||
    AUTHORITY_LEVEL[type] ||
    99
  );
}

function controllingPrecedenceOf(doc = {}) {
  const explicit = Number(
    doc.controllingPrecedence ||
      doc.controlling_precedence ||
      doc.metadata?.controllingPrecedence ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  const type = authorityTypeOf(doc);

  return (
    MASTER_PRECEDENCE[type] ||
    getControllingPrecedenceForDoc(doc) ||
    99
  );
}

function docPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    null
  );
}

function docTitle(doc = {}) {
  return (
    doc.title ||
    doc.source_title ||
    doc.sourceTitle ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    docPath(doc) ||
    "Unknown source"
  );
}

function docKey(doc = {}) {
  const key = normalizeText(
    doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.source ||
      doc.originalSource ||
      doc.original_source ||
      doc.path ||
      doc.source_path ||
      doc.metadata?.path ||
      ""
  );

  return key ? normalizeIssuanceReference(key) : "";
}

function normalizedAliasesOf(doc = {}) {
  return unique([
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases)
  ].map((item) => normalizeText(item)));
}

function referenceCandidatesOf(doc = {}) {
  return unique([
    docKey(doc),
    normalizeIssuanceReference(docPath(doc) || ""),
    normalizeIssuanceReference(docTitle(doc) || ""),
    normalizeIssuanceReference(doc.source || ""),
    normalizeIssuanceReference(doc.originalSource || ""),
    normalizeIssuanceReference(doc.original_source || ""),
    ...normalizedAliasesOf(doc).map(normalizeIssuanceReference)
  ]).filter(Boolean);
}

function effectiveFromOf(doc = {}) {
  return toDate(
    doc.effectiveFrom ||
      doc.effective_from ||
      doc.metadata?.effectiveFrom ||
      doc.metadata?.effective_from ||
      doc.recencyDate ||
      doc.recency_date ||
      doc.metadata?.recencyDate ||
      doc.modifiedTime ||
      doc.metadata?.modifiedTime ||
      null
  );
}

function effectiveToOf(doc = {}) {
  return toDate(
    doc.effectiveTo ||
      doc.effective_to ||
      doc.metadata?.effectiveTo ||
      doc.metadata?.effective_to ||
      null
  );
}

function supersededByOf(doc = {}) {
  return normalizeText(
    doc.supersededByReference ||
      doc.superseded_by_reference ||
      doc.metadata?.supersededByReference ||
      doc.metadata?.superseded_by_reference ||
      ""
  );
}

function repealedByOf(doc = {}) {
  return normalizeText(
    doc.repealedByReference ||
      doc.repealed_by_reference ||
      doc.metadata?.repealedByReference ||
      doc.metadata?.repealed_by_reference ||
      ""
  );
}

function amendedByOf(doc = {}) {
  return normalizeText(
    doc.amendedByReference ||
      doc.amended_by_reference ||
      doc.metadata?.amendedByReference ||
      doc.metadata?.amended_by_reference ||
      ""
  );
}

function supersedesOf(doc = {}) {
  const raw = doc.supersedes || doc.metadata?.supersedes || [];

  if (Array.isArray(raw)) {
    return unique(raw.map((item) => normalizeText(item)));
  }

  if (typeof raw === "string") {
    return unique(raw.split(/[;,|]/).map((item) => normalizeText(item)));
  }

  return [];
}

function replacementRefsOf(doc = {}) {
  return unique([supersededByOf(doc), repealedByOf(doc), amendedByOf(doc)]);
}

function isExplicitlySuperseded(doc = {}) {
  return Boolean(
    doc.isSuperseded ||
      doc.is_superseded ||
      doc.metadata?.isSuperseded ||
      doc.metadata?.is_superseded ||
      doc.metadata?.superseded
  );
}

function matchesReference(doc = {}, reference = "") {
  const needle = normalizeIssuanceReference(reference);
  if (!needle) return false;

  const candidates = referenceCandidatesOf(doc);

  return candidates.some(
    (candidate) =>
      candidate === needle || candidate.includes(needle) || needle.includes(candidate)
  );
}

function isDocumentEffective(doc = {}, asOfDate = new Date()) {
  const asOf = toDate(asOfDate) || new Date();
  const from = effectiveFromOf(doc);
  const to = effectiveToOf(doc);

  if (from && from > asOf) return false;
  if (to && to < asOf) return false;
  if (isExplicitlySuperseded(doc)) return false;
  if (repealedByOf(doc)) return false;

  return true;
}

function isHistoricalDocument(doc = {}, asOfDate = new Date()) {
  return !isDocumentEffective(doc, asOfDate);
}

function determineSupersessionStatus(doc = {}, asOfDate = new Date()) {
  const from = effectiveFromOf(doc);
  const to = effectiveToOf(doc);
  const asOf = toDate(asOfDate) || new Date();

  if (isExplicitlySuperseded(doc)) return SUPERSESSION_STATUS.SUPERSEDED;
  if (repealedByOf(doc)) return SUPERSESSION_STATUS.REPEALED;
  if (amendedByOf(doc)) return SUPERSESSION_STATUS.AMENDED;
  if (from && from > asOf) return SUPERSESSION_STATUS.FUTURE_EFFECTIVE;
  if (to && to < asOf) return SUPERSESSION_STATUS.EXPIRED;

  return SUPERSESSION_STATUS.ACTIVE;
}

function canReplaceAuthority(olderDoc = {}, newerDoc = {}) {
  const olderType = authorityTypeOf(olderDoc);
  const newerType = authorityTypeOf(newerDoc);

  const olderPrecedence = controllingPrecedenceOf(olderDoc);
  const newerPrecedence = controllingPrecedenceOf(newerDoc);

  if (olderDoc === newerDoc) return false;

  if (BIR_ISSUANCE_TYPES.has(newerType) && (PRIMARY_TYPES.has(olderType) || COURT_TYPES.has(olderType))) {
    return false;
  }

  if (BIR_ISSUANCE_TYPES.has(newerType) && olderPrecedence < newerPrecedence) {
    return false;
  }

  if (newerPrecedence > olderPrecedence && !hasSameAuthorityFamily(olderDoc, newerDoc)) {
    return false;
  }

  return true;
}

function hasSameAuthorityFamily(a = {}, b = {}) {
  const typeA = authorityTypeOf(a);
  const typeB = authorityTypeOf(b);

  if (typeA === typeB) return true;
  if (BIR_ISSUANCE_TYPES.has(typeA) && BIR_ISSUANCE_TYPES.has(typeB)) return true;
  if (COURT_TYPES.has(typeA) && COURT_TYPES.has(typeB)) return true;

  return false;
}

function compareVersionPriority(a = {}, b = {}) {
  const precedenceA = controllingPrecedenceOf(a);
  const precedenceB = controllingPrecedenceOf(b);

  if (precedenceA !== precedenceB) return precedenceA - precedenceB;

  const levelA = authorityLevelOf(a);
  const levelB = authorityLevelOf(b);

  if (levelA !== levelB) return levelA - levelB;

  const fromA = effectiveFromOf(a)?.getTime() || 0;
  const fromB = effectiveFromOf(b)?.getTime() || 0;

  if (fromA !== fromB) return fromB - fromA;

  return String(docPath(a) || "").localeCompare(String(docPath(b) || ""));
}

function chooseLatestControllingVersion(docs = []) {
  if (!Array.isArray(docs) || !docs.length) return null;
  return [...docs].sort(compareVersionPriority)[0] || null;
}

function groupDocumentsForSupersession(docs = []) {
  const groups = new Map();

  for (const doc of safeArray(docs)) {
    const refs = referenceCandidatesOf(doc);
    const keys = refs.length
      ? refs
      : [normalizeIssuanceReference(docPath(doc) || "")].filter(Boolean);

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(doc);
    }
  }

  return groups;
}

function hasExplicitReplacementLink(olderDoc = {}, newerDoc = {}) {
  if (!canReplaceAuthority(olderDoc, newerDoc)) return false;

  const olderRefs = referenceCandidatesOf(olderDoc);
  const newerSupersedes = supersedesOf(newerDoc).map(normalizeIssuanceReference);

  for (const olderRef of olderRefs) {
    if (newerSupersedes.some((item) => item === olderRef || item.includes(olderRef))) {
      return true;
    }
  }

  for (const replacementRef of replacementRefsOf(olderDoc)) {
    if (matchesReference(newerDoc, replacementRef)) return true;
  }

  return false;
}

function buildAuditRecord({
  doc,
  replacedBy = null,
  reason = "",
  status = SUPERSESSION_STATUS.SUPERSEDED
}) {
  return {
    status,
    document: docPath(doc),
    documentTitle: docTitle(doc),
    authorityType: authorityTypeOf(doc),
    authorityLevel: authorityLevelOf(doc),
    controllingPrecedence: controllingPrecedenceOf(doc),
    normalizedReference: docKey(doc),
    effectiveFrom: effectiveFromOf(doc)?.toISOString() || null,
    effectiveTo: effectiveToOf(doc)?.toISOString() || null,
    replacedBy: replacedBy ? docPath(replacedBy) : null,
    replacedByTitle: replacedBy ? docTitle(replacedBy) : null,
    replacedByAuthorityType: replacedBy ? authorityTypeOf(replacedBy) : null,
    replacedByAuthorityLevel: replacedBy ? authorityLevelOf(replacedBy) : null,
    replacedByControllingPrecedence: replacedBy ? controllingPrecedenceOf(replacedBy) : null,
    reason,
    masterPromptAuthorityHierarchyApplied: true,
    lowerAuthorityCannotSupersedeHigherAuthority: true,
    birIssuanceCannotOverrideCourtDoctrine: true
  };
}

function detectSupersededDocuments(docs = [], asOfDate = new Date()) {
  const allDocs = safeArray(docs);
  const groups = groupDocumentsForSupersession(allDocs);
  const superseded = [];
  const seen = new Set();

  for (const [, items] of groups) {
    if (items.length < 2) continue;

    const controlling = chooseLatestControllingVersion(items);
    if (!controlling) continue;

    for (const item of items) {
      if (item === controlling) continue;

      const explicitLink = hasExplicitReplacementLink(item, controlling);
      const inactive = !isDocumentEffective(item, asOfDate);

      if (!explicitLink && !inactive) continue;
      if (!canReplaceAuthority(item, controlling) && explicitLink) continue;

      const reason = explicitLink
        ? "Source is explicitly superseded, amended, repealed, or replaced by an indexed authority of equal or higher valid authority level."
        : "Older or inactive authority version detected.";

      const key = [docPath(item), docKey(item), docPath(controlling), reason].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      superseded.push({
        doc: item,
        replacedBy: explicitLink ? controlling : null,
        reason,
        auditRecord: buildAuditRecord({
          doc: item,
          replacedBy: explicitLink ? controlling : null,
          reason,
          status: determineSupersessionStatus(item, asOfDate)
        })
      });
    }
  }

  for (const doc of allDocs) {
    const status = determineSupersessionStatus(doc, asOfDate);

    if (status === SUPERSESSION_STATUS.ACTIVE) continue;

    const key = [docPath(doc), docKey(doc), status].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    superseded.push({
      doc,
      replacedBy: null,
      reason:
        status === SUPERSESSION_STATUS.EXPIRED
          ? "Source is outside its effective period."
          : status === SUPERSESSION_STATUS.REPEALED
            ? "Source is repealed."
            : status === SUPERSESSION_STATUS.AMENDED
              ? "Source is amended."
              : status === SUPERSESSION_STATUS.FUTURE_EFFECTIVE
                ? "Source is not yet effective."
                : "Source is superseded or inactive.",
      auditRecord: buildAuditRecord({
        doc,
        replacedBy: null,
        reason: status,
        status
      })
    });
  }

  return superseded;
}

function applySupersessionFilter(docs = [], asOfDate = new Date()) {
  const inputDocs = safeArray(docs);
  const superseded = detectSupersededDocuments(inputDocs, asOfDate);
  const supersededSet = new Set(superseded.map((item) => item.doc));

  const effectiveDocs = inputDocs.filter((doc) => isDocumentEffective(doc, asOfDate));
  const activeDocs = effectiveDocs.filter((doc) => !supersededSet.has(doc));

  return {
    effectiveDocs,
    activeDocs,
    superseded,
    hasSupersededSources: superseded.length > 0,
    activeCount: activeDocs.length,
    supersededCount: superseded.length,
    auditTrail: superseded.map((item) => item.auditRecord),
    plannerCompatibility: {
      requiresSupersessionDisclosure: superseded.length > 0,
      warning:
        superseded.length > 0
          ? "One or more authorities were superseded, repealed, amended, expired, future-effective, or inactive."
          : null
    },
    adaptiveMetadata: {
      engineVersion: ENGINE_VERSION,
      litigationRisk: superseded.length > 0 ? "HIGH" : "LOW",
      requiresDisclosure: superseded.length > 0,
      masterPromptAuthorityHierarchyApplied: true,
      lowerAuthorityCannotSupersedeHigherAuthority: true,
      birIssuanceCannotOverrideCourtDoctrine: true
    }
  };
}

function buildSupersessionWarning(supersessionResult = null) {
  if (!supersessionResult?.superseded?.length) return "";

  return [
    "Supersession Warning:",
    "One or more indexed authorities were superseded, repealed, amended, expired, future-effective, or otherwise inactive as of the query date.",
    "TINA should prioritize active controlling authorities and should not rely on obsolete authorities unless the discussion is historical.",
    "A lower authority must not be treated as superseding a higher authority."
  ].join(" ");
}

function findReplacementForDocument(doc = {}, supersessionResult = null) {
  if (!supersessionResult?.superseded?.length) return null;

  const refs = referenceCandidatesOf(doc);

  const matched = supersessionResult.superseded.find((item) => {
    const itemRefs = referenceCandidatesOf(item.doc);
    return refs.some((ref) => itemRefs.includes(ref));
  });

  return matched?.replacedBy || null;
}

function buildSupersessionPayload({ docs = [], asOfDate = new Date() } = {}) {
  const result = applySupersessionFilter(docs, asOfDate);

  return {
    engineVersion: ENGINE_VERSION,
    activeDocs: result.activeDocs,
    effectiveDocs: result.effectiveDocs,
    superseded: result.superseded,
    auditTrail: result.auditTrail,
    warning: buildSupersessionWarning(result),
    plannerCompatibility: result.plannerCompatibility,
    adaptiveMetadata: result.adaptiveMetadata,
    masterPromptAuthorityHierarchyApplied: true,
    lowerAuthorityCannotSupersedeHigherAuthority: true,
    birIssuanceCannotOverrideCourtDoctrine: true
  };
}

function supersessionEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SUPERSESSION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    ragCompatible: true,
    masterPromptAuthorityHierarchyApplied: true,
    lowerAuthorityCannotSupersedeHigherAuthority: true,
    birIssuanceCannotOverrideCourtDoctrine: true,
    noRetrieval: true,
    noOpenAI: true,
    noRendering: true
  };
}

export {
  ENGINE_VERSION,
  SUPERSESSION_STATUS,
  isDocumentEffective,
  isHistoricalDocument,
  determineSupersessionStatus,
  chooseLatestControllingVersion,
  detectSupersededDocuments,
  applySupersessionFilter,
  findReplacementForDocument,
  buildSupersessionWarning,
  buildSupersessionPayload,
  supersessionEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  SUPERSESSION_STATUS,
  isDocumentEffective,
  isHistoricalDocument,
  determineSupersessionStatus,
  chooseLatestControllingVersion,
  detectSupersededDocuments,
  applySupersessionFilter,
  findReplacementForDocument,
  buildSupersessionWarning,
  buildSupersessionPayload,
  supersessionEngineHealthCheck
};
