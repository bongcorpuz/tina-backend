// FILE: supersession-engine.js

import {
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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
    if (match) {
      return `${prefix}_${Number(match[1])}_${normalizeYear(match[2])}`;
    }
  }

  const gr = text.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) return `GR_${String(gr[1]).toUpperCase()}`;

  const cta =
    text.match(/\bcta\s+case\s+([a-z0-9.-]+)\b/i) ||
    text.match(/\bcta\s+eb\s+([a-z0-9.-]+)\b/i);

  if (cta) return `CTA_${String(cta[1]).toUpperCase()}`;

  const ruling = text.match(/\bbir ruling\s*([a-z0-9()/. -]+)\b/i);
  if (ruling) {
    return `BIR_RULING_${String(ruling[1]).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  }

  return text.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function authorityLevelOf(doc = {}) {
  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    getAuthorityLevelForDoc(doc) ||
    AUTHORITY_LEVEL[
      doc.authorityType || doc.authority_type || doc.metadata?.authorityType
    ] ||
    99
  );
}

function authorityTypeOf(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc(doc) ||
    "UNKNOWN"
  );
}

function controllingPrecedenceOf(doc = {}) {
  return (
    Number(
      doc.controllingPrecedence ||
        doc.controlling_precedence ||
        doc.metadata?.controllingPrecedence
    ) ||
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
  const aliases = [
    ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
    ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
    ...(Array.isArray(doc.metadata?.normalizedAliases)
      ? doc.metadata.normalizedAliases
      : [])
  ];

  return unique(
    aliases
      .map((item) => normalizeText(item))
      .filter(Boolean)
  );
}

function referenceCandidatesOf(doc = {}) {
  return unique([
    docKey(doc),
    normalizeIssuanceReference(docPath(doc) || ""),
    normalizeIssuanceReference(docTitle(doc) || ""),
    normalizeIssuanceReference(doc.source || ""),
    normalizeIssuanceReference(doc.originalSource || ""),
    normalizeIssuanceReference(doc.original_source || ""),
    ...(normalizedAliasesOf(doc).map(normalizeIssuanceReference))
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

function isExplicitlySuperseded(doc = {}) {
  return Boolean(
    doc.isSuperseded ||
      doc.is_superseded ||
      doc.metadata?.isSuperseded ||
      doc.metadata?.is_superseded
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
    return unique(
      raw
        .split(/[;,|]/)
        .map((item) => normalizeText(item))
        .filter(Boolean)
    );
  }

  return [];
}

function replacementRefsOf(doc = {}) {
  return unique([
    supersededByOf(doc),
    repealedByOf(doc),
    amendedByOf(doc)
  ]).filter(Boolean);
}

function matchesReference(doc = {}, reference = "") {
  const needle = normalizeIssuanceReference(reference);
  if (!needle) return false;

  const candidates = referenceCandidatesOf(doc);

  return candidates.some((candidate) => {
    if (!candidate) return false;
    return candidate === needle || candidate.includes(needle) || needle.includes(candidate);
  });
}

function hasExplicitReplacementLink(olderDoc = {}, newerDoc = {}) {
  const olderRefs = referenceCandidatesOf(olderDoc);
  const newerRefs = referenceCandidatesOf(newerDoc);

  if (!olderRefs.length && !newerRefs.length) return false;

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

function isAdministrativeIssuance(doc = {}) {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityTypeOf(doc));
}

function isSameAuthorityFamily(a = {}, b = {}) {
  const aType = authorityTypeOf(a);
  const bType = authorityTypeOf(b);

  if (aType === bType) return true;

  if (isAdministrativeIssuance(a) && isAdministrativeIssuance(b)) {
    const aRefs = referenceCandidatesOf(a);
    const bRefs = referenceCandidatesOf(b);
    return aRefs.some((ref) => bRefs.includes(ref));
  }

  return false;
}

function isDocumentEffective(doc = {}, asOfDate = new Date()) {
  const asOf = toDate(asOfDate) || new Date();
  const from = effectiveFromOf(doc);
  const to = effectiveToOf(doc);

  if (from && from > asOf) return false;
  if (to && to < asOf) return false;
  if (isExplicitlySuperseded(doc)) return false;

  return true;
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

  const typeA = authorityTypeOf(a);
  const typeB = authorityTypeOf(b);
  if (typeA !== typeB) return String(typeA).localeCompare(String(typeB));

  return String(docPath(a) || "").localeCompare(String(docPath(b) || ""));
}

function buildAuditRecord({
  doc,
  replacedBy = null,
  reason = "",
  status = "SUPERSEDED"
}) {
  return {
    status,
    document: docPath(doc),
    documentTitle: docTitle(doc),
    authorityType: authorityTypeOf(doc),
    authorityLevel: authorityLevelOf(doc),
    normalizedReference: docKey(doc),
    effectiveFrom: effectiveFromOf(doc)?.toISOString() || null,
    effectiveTo: effectiveToOf(doc)?.toISOString() || null,
    replacedBy: replacedBy ? docPath(replacedBy) : null,
    replacedByTitle: replacedBy ? docTitle(replacedBy) : null,
    replacedByAuthorityType: replacedBy ? authorityTypeOf(replacedBy) : null,
    replacedByAuthorityLevel: replacedBy ? authorityLevelOf(replacedBy) : null,
    reason
  };
}

export function isDocumentCurrentlyEffective(doc = {}, asOfDate = new Date()) {
  return isDocumentEffective(doc, asOfDate);
}

export function filterEffectiveDocuments(docs = [], asOfDate = new Date()) {
  return (Array.isArray(docs) ? docs : []).filter((doc) =>
    isDocumentEffective(doc, asOfDate)
  );
}

export function chooseLatestControllingVersion(docs = []) {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  return [...docs].sort(compareVersionPriority)[0] || null;
}

function groupDocumentsForSupersession(docs = []) {
  const groups = new Map();

  for (const doc of docs || []) {
    const refs = referenceCandidatesOf(doc);
    const keys = refs.length ? refs : [normalizeIssuanceReference(docPath(doc) || "")].filter(Boolean);

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(doc);
    }
  }

  return groups;
}

function findExplicitReplacement(doc = {}, docs = []) {
  const replacementRefs = replacementRefsOf(doc);

  if (!replacementRefs.length) return null;

  const candidates = docs.filter((candidate) => {
    if (candidate === doc) return false;
    return replacementRefs.some((ref) => matchesReference(candidate, ref));
  });

  if (!candidates.length) return null;

  return chooseLatestControllingVersion(candidates);
}

function isPastEffectiveTo(doc = {}, asOfDate = new Date()) {
  const asOf = toDate(asOfDate) || new Date();
  const to = effectiveToOf(doc);

  return Boolean(to && to < asOf);
}

export function detectSupersededDocuments(docs = [], asOfDate = new Date()) {
  const allDocs = Array.isArray(docs) ? docs : [];
  const groups = groupDocumentsForSupersession(allDocs);
  const superseded = [];
  const seen = new Set();

  for (const doc of allDocs) {
    const explicitReplacement = findExplicitReplacement(doc, allDocs);
    const explicitlySuperseded = isExplicitlySuperseded(doc);
    const expired = isPastEffectiveTo(doc, asOfDate);

    if (!explicitlySuperseded && !expired && !explicitReplacement) continue;

    const replacement = explicitReplacement || null;

    const reason = explicitlySuperseded
      ? "Source is explicitly marked as superseded."
      : expired
        ? "Source is outside its effective period as of the query date."
        : "Source is explicitly amended, repealed, or superseded by another indexed source.";

    const key = [docPath(doc), docKey(doc), docPath(replacement || {}), reason].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    superseded.push({
      doc,
      replacedBy: replacement,
      reason,
      auditRecord: buildAuditRecord({
        doc,
        replacedBy: replacement,
        reason
      })
    });
  }

  for (const [, items] of groups) {
    if (items.length < 2) continue;

    const effectiveItems = items.filter((doc) => isDocumentEffective(doc, asOfDate));
    const controlling = chooseLatestControllingVersion(
      effectiveItems.length ? effectiveItems : items
    );

    for (const item of items) {
      if (!controlling || item === controlling) continue;

      const explicitLink = hasExplicitReplacementLink(item, controlling);
      const sameFamily = isSameAuthorityFamily(item, controlling);
      const weakerOrOlder =
        compareVersionPriority(controlling, item) < 0 &&
        !isDocumentEffective(item, asOfDate);

      if (!explicitLink && !sameFamily && !weakerOrOlder) continue;

      if (!explicitLink && isDocumentEffective(item, asOfDate)) continue;

      const reason = explicitLink
        ? "Source is explicitly replaced by a controlling indexed source."
        : sameFamily
          ? "Older or weaker version appears superseded within the same authority family."
          : "Older or inactive version appears superseded by a newer controlling source.";

      const key = [docPath(item), docKey(item), docPath(controlling), reason].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      superseded.push({
        doc: item,
        replacedBy: controlling,
        reason,
        auditRecord: buildAuditRecord({
          doc: item,
          replacedBy: controlling,
          reason
        })
      });
    }
  }

  return superseded;
}

export function applySupersessionFilter(docs = [], asOfDate = new Date()) {
  const inputDocs = Array.isArray(docs) ? docs : [];
  const superseded = detectSupersededDocuments(inputDocs, asOfDate);
  const supersededSet = new Set(superseded.map((item) => item.doc));

  const effectiveDocs = inputDocs.filter((doc) => isDocumentEffective(doc, asOfDate));
  const activeDocs = effectiveDocs.filter((doc) => !supersededSet.has(doc));

  const replacedMap = new Map();

  for (const item of superseded) {
    const sourceKeys = unique([
      docPath(item.doc),
      docKey(item.doc),
      ...referenceCandidatesOf(item.doc)
    ]).filter(Boolean);

    for (const sourceKey of sourceKeys) {
      replacedMap.set(sourceKey, item);
    }
  }

  return {
    effectiveDocs,
    superseded,
    activeDocs,
    auditTrail: superseded.map((item) => item.auditRecord || buildAuditRecord({
      doc: item.doc,
      replacedBy: item.replacedBy,
      reason: item.reason
    })),
    replacedMap,
    hasSupersededSources: superseded.length > 0,
    activeCount: activeDocs.length,
    supersededCount: superseded.length
  };
}

export function findReplacementForDocument(doc = {}, supersessionResult = null) {
  if (!supersessionResult?.superseded?.length) return null;

  const path = docPath(doc);
  const key = docKey(doc);
  const refs = referenceCandidatesOf(doc);

  const matched = supersessionResult.superseded.find((item) => {
    if (item.doc === doc) return true;
    if (path && docPath(item.doc) === path) return true;
    if (key && docKey(item.doc) === key) return true;

    const itemRefs = referenceCandidatesOf(item.doc);
    return refs.some((ref) => itemRefs.includes(ref));
  });

  return matched?.replacedBy || null;
}

export function buildSupersessionWarning(supersessionResult = null) {
  if (!supersessionResult?.superseded?.length) return "";

  return [
    "Supersession Warning:",
    "One or more indexed sources were superseded, repealed, amended, expired, or otherwise inactive as of the query date.",
    "TINA should rely on active controlling sources and should not treat superseded administrative issuances as controlling authority unless the answer is historical."
  ].join(" ");
}

export default {
  isDocumentCurrentlyEffective,
  filterEffectiveDocuments,
  chooseLatestControllingVersion,
  detectSupersededDocuments,
  applySupersessionFilter,
  findReplacementForDocument,
  buildSupersessionWarning
};
