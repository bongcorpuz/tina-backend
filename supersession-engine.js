import { AUTHORITY_LEVEL } from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function authorityLevelOf(doc = {}) {
  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    AUTHORITY_LEVEL[doc.authorityType || doc.authority_type || doc.metadata?.authorityType] ||
    99
  );
}

function docKey(doc = {}) {
  return (
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

export function isDocumentEffective(doc = {}, asOfDate = new Date()) {
  const asOf = toDate(asOfDate) || new Date();
  const from = effectiveFromOf(doc);
  const to = effectiveToOf(doc);

  if (from && from > asOf) return false;
  if (to && to < asOf) return false;

  return true;
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
    return fromB - fromA;
  });

  return sorted[0] || null;
}

export function detectSupersededDocuments(docs = []) {
  const groups = new Map();

  for (const doc of docs) {
    const key = normalizeText(docKey(doc));
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  const superseded = [];

  for (const [, items] of groups) {
    if (items.length < 2) continue;

    const controlling = chooseLatestControllingVersion(items);
    for (const item of items) {
      if (item !== controlling) {
        superseded.push({
          doc: item,
          replacedBy: controlling,
          reason: "Older or weaker version appears superseded by a newer/effective controlling source."
        });
      }
    }
  }

  return superseded;
}

export function applySupersessionFilter(docs = [], asOfDate = new Date()) {
  const effectiveDocs = filterEffectiveDocuments(docs, asOfDate);
  const superseded = detectSupersededDocuments(effectiveDocs);
  const supersededSet = new Set(
    superseded.map((item) => item.doc)
  );

  return {
    effectiveDocs,
    superseded,
    activeDocs: effectiveDocs.filter((doc) => !supersededSet.has(doc))
  };
}
