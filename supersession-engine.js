// FILE: supersession-engine.js

import {
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
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

function docPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    null
  );
}

function docTitle(doc = {}) {
  return (
    doc.title ||
    doc.source_title ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
    doc.source ||
    docPath(doc) ||
    "Unknown source"
  );
}

function docKey(doc = {}) {
  return normalizeText(
    doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.source ||
      doc.originalSource ||
      doc.path ||
      doc.metadata?.path ||
      ""
  );
}

function normalizedAliasesOf(doc = {}) {
  const aliases = [
    ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
    ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
    ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
  ];

  return unique(aliases.map((item) => normalizeText(item)));
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
  const raw =
    doc.supersedes ||
    doc.metadata?.supersedes ||
    [];

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

function matchesReference(doc = {}, reference = "") {
  const needle = lower(reference);
  if (!needle) return false;

  const candidates = unique([
    docKey(doc),
    docPath(doc),
    docTitle(doc),
    supersededByOf(doc),
    repealedByOf(doc),
    amendedByOf(doc),
    ...normalizedAliasesOf(doc)
  ]);

  return candidates.some((candidate) => lower(candidate).includes(needle));
}

function hasExplicitReplacementLink(olderDoc = {}, newerDoc = {}) {
  const olderKey = docKey(olderDoc);
  const newerKey = docKey(newerDoc);

  if (!olderKey && !newerKey) return false;

  const newerSupersedes = supersedesOf(newerDoc);
  if (olderKey && newerSupersedes.some((item) => lower(item).includes(lower(olderKey)))) {
    return true;
  }

  const olderSupersededBy = supersededByOf(olderDoc);
  if (olderSupersededBy && matchesReference(newerDoc, olderSupersededBy)) {
    return true;
  }

  const olderRepealedBy = repealedByOf(olderDoc);
  if (olderRepealedBy && matchesReference(newerDoc, olderRepealedBy)) {
    return true;
  }

  const olderAmendedBy = amendedByOf(olderDoc);
  if (olderAmendedBy && matchesReference(newerDoc, olderAmendedBy)) {
    return true;
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

export function isDocumentCurrentlyEffective(doc = {}, asOfDate = new Date()) {
  return isDocumentEffective(doc, asOfDate);
}

export function filterEffectiveDocuments(docs = [], asOfDate = new Date()) {
  return docs.filter((doc) => isDocumentEffective(doc, asOfDate));
}

export function chooseLatestControllingVersion(docs = []) {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  const sorted = [...docs].sort((a, b) => {
    const levelA = authorityLevelOf(a);
    const levelB = authorityLevelOf(b);
    if (levelA !== levelB) return levelA - levelB;

    const fromA = effectiveFromOf(a)?.getTime() || 0;
    const fromB = effectiveFromOf(b)?.getTime() || 0;
    if (fromA !== fromB) return fromB - fromA;

    const typeA = authorityTypeOf(a);
    const typeB = authorityTypeOf(b);
    if (typeA !== typeB) {
      return String(typeA).localeCompare(String(typeB));
    }

    return String(docPath(a) || "").localeCompare(String(docPath(b) || ""));
  });

  return sorted[0] || null;
}

function groupDocumentsForSupersession(docs = []) {
  const groups = new Map();

  for (const doc of docs) {
    const baseKeys = unique([
      docKey(doc),
      ...normalizedAliasesOf(doc)
    ]).filter(Boolean);

    const keys = baseKeys.length ? baseKeys : [normalizeText(docPath(doc))].filter(Boolean);

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(doc);
    }
  }

  return groups;
}

export function detectSupersededDocuments(docs = [], asOfDate = new Date()) {
  const groups = groupDocumentsForSupersession(docs);
  const superseded = [];
  const seen = new Set();

  for (const [, items] of groups) {
    if (items.length < 2) continue;

    const effectiveItems = items.filter((doc) => isDocumentEffective(doc, asOfDate));
    const controlling = chooseLatestControllingVersion(
      effectiveItems.length ? effectiveItems : items
    );

    for (const item of items) {
      if (item === controlling) continue;

      const explicitlySuperseded = isExplicitlySuperseded(item);
      const explicitlyReplaced = controlling
        ? hasExplicitReplacementLink(item, controlling)
        : false;

      if (!explicitlySuperseded && !explicitlyReplaced && isDocumentEffective(item, asOfDate)) {
        continue;
      }

      const reason = explicitlySuperseded
        ? "Source is explicitly marked as superseded."
        : explicitlyReplaced
          ? "Source is explicitly replaced by a controlling source."
          : "Older or weaker version appears superseded by a newer/effective controlling source.";

      const key = [
        docKey(item),
        docPath(item),
        docKey(controlling || {}),
        docPath(controlling || {})
      ].join("|");

      if (seen.has(key)) continue;
      seen.add(key);

      superseded.push({
        doc: item,
        replacedBy: controlling || null,
        reason,
        auditRecord: {
          document: docPath(item),
          replacedBy: controlling ? docPath(controlling) : null,
          authorityType: authorityTypeOf(item),
          replacingAuthorityType: controlling ? authorityTypeOf(controlling) : null
        }
      });
    }
  }

  return superseded;
}

export function applySupersessionFilter(docs = [], asOfDate = new Date()) {
  const effectiveDocs = filterEffectiveDocuments(docs, asOfDate);
  const superseded = detectSupersededDocuments(docs, asOfDate);

  const supersededSet = new Set(superseded.map((item) => item.doc));

  const activeDocs = effectiveDocs.filter((doc) => !supersededSet.has(doc));

  const replacedMap = new Map();
  for (const item of superseded) {
    const sourceKey = docPath(item.doc) || docKey(item.doc);
    if (!sourceKey) continue;
    replacedMap.set(sourceKey, item);
  }

  return {
    effectiveDocs,
    superseded,
    activeDocs,
    auditTrail: superseded.map((item) => ({
      document: docPath(item.doc),
      documentTitle: docTitle(item.doc),
      authorityType: authorityTypeOf(item.doc),
      replacedBy: item.replacedBy ? docPath(item.replacedBy) : null,
      replacedByTitle: item.replacedBy ? docTitle(item.replacedBy) : null,
      replacedByAuthorityType: item.replacedBy ? authorityTypeOf(item.replacedBy) : null,
      reason: item.reason
    })),
    replacedMap
  };
}

export function findReplacementForDocument(doc = {}, supersessionResult = null) {
  if (!supersessionResult?.superseded?.length) return null;

  const path = docPath(doc);
  const key = docKey(doc);

  const matched = supersessionResult.superseded.find((item) => {
    return item.doc === doc || docPath(item.doc) === path || docKey(item.doc) === key;
  });

  return matched?.replacedBy || null;
}
