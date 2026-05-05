import { AUTHORITY_LEVEL } from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function authorityLevelOf(doc = {}) {
  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    AUTHORITY_LEVEL[doc.authorityType || doc.authority_type || doc.metadata?.authorityType] ||
    99
  );
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    null
  );
}

function doctrinalTopicOf(doc = {}) {
  return (
    doc.topic ||
    doc.metadata?.topic ||
    doc.taxType ||
    doc.metadata?.taxType ||
    doc.subtopic ||
    doc.metadata?.subtopic ||
    "general"
  );
}

function hasNegativeSignal(text = "") {
  const value = lower(text);
  return [
    " not ",
    " except ",
    " unless ",
    " exempt ",
    " disallowed ",
    " prohibited ",
    " void ",
    " invalid "
  ].some((token) => value.includes(token.trim()) || value.includes(token));
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const xNeg = hasNegativeSignal(x);
  const yNeg = hasNegativeSignal(y);

  return xNeg !== yNeg;
}

export function compareDoctrinalPair(a = {}, b = {}) {
  const sameTopic = doctrinalTopicOf(a) === doctrinalTopicOf(b);
  if (!sameTopic) return null;

  const textA = a.text || a.claim_text || "";
  const textB = b.text || b.claim_text || "";
  if (!looksContradictory(textA, textB)) return null;

  const levelA = authorityLevelOf(a);
  const levelB = authorityLevelOf(b);
  const controlling = levelA <= levelB ? a : b;
  const weaker = levelA <= levelB ? b : a;

  return {
    conflict: true,
    conflictTopic: doctrinalTopicOf(a),
    controllingAuthority:
      controlling.authorityType ||
      controlling.authority_type ||
      controlling.metadata?.authorityType ||
      "UNKNOWN",
    controllingSource: sourcePathOf(controlling),
    weakerAuthority:
      weaker.authorityType ||
      weaker.authority_type ||
      weaker.metadata?.authorityType ||
      "UNKNOWN",
    weakerSource: sourcePathOf(weaker),
    reason: `${weaker.authorityType || weaker.metadata?.authorityType || "Lower authority"} appears inconsistent with ${controlling.authorityType || controlling.metadata?.authorityType || "higher authority"}. Higher authority prevails.`,
    sourceAClaim: normalizeText(textA).slice(0, 500),
    sourceBClaim: normalizeText(textB).slice(0, 500)
  };
}

export function detectDoctrinalConflicts(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const result = compareDoctrinalPair(docs[i], docs[j]);
      if (result) {
        conflicts.push(result);
      }
    }
  }

  const seen = new Set();
  return conflicts.filter((item) => {
    const key = [
      item.conflictTopic,
      item.controllingSource,
      item.weakerSource
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectHierarchyConflict(topDocs = []) {
  if (!Array.isArray(topDocs) || topDocs.length < 2) {
    return {
      conflict: false,
      controllingAuthority: null,
      controllingSource: null,
      reason: null,
      conflictingDocs: []
    };
  }

  for (let i = 0; i < topDocs.length; i += 1) {
    for (let j = i + 1; j < topDocs.length; j += 1) {
      const pair = compareDoctrinalPair(topDocs[i], topDocs[j]);
      if (pair?.conflict) {
        return {
          conflict: true,
          controllingAuthority: pair.controllingAuthority,
          controllingSource: pair.controllingSource,
          reason: pair.reason,
          conflictingDocs: [topDocs[i], topDocs[j]]
        };
      }
    }
  }

  return {
    conflict: false,
    controllingAuthority: null,
    controllingSource: null,
    reason: null,
    conflictingDocs: []
  };
}

export function reconcileDoctrine({
  rankedDocs = [],
  maxDocs = 5
}) {
  const topDocs = rankedDocs.slice(0, maxDocs);
  const hierarchyConflict = detectHierarchyConflict(topDocs);
  const doctrinalConflicts = detectDoctrinalConflicts(topDocs);

  return {
    topDocs,
    hierarchyConflict,
    doctrinalConflicts,
    hasConflict: hierarchyConflict.conflict || doctrinalConflicts.length > 0
  };
}
