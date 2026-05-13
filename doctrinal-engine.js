// FILE: doctrinal-engine.js

import {
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict
} from "./conflict-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
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

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    null
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.title ||
    doc.source_title ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
    doc.source ||
    null
  );
}

function doctrinalTopicOf(doc = {}) {
  return (
    doc.topic ||
    doc.metadata?.topic ||
    doc.taxType ||
    doc.tax_type ||
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
    " invalid ",
    " shall not ",
    " may not ",
    " must not "
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

  if (!textA || !textB) return null;
  if (!looksContradictory(textA, textB)) return null;
  if (!isGenuineConflict(a, b)) return null;

  const override = resolveCourtOverride(a, b);

  const controlling = override?.winningSource
    ? override.winningSource
    : controllingPrecedenceOf(a) <= controllingPrecedenceOf(b)
      ? a
      : b;

  const weaker = override?.overriddenSource
    ? override.overriddenSource
    : controlling === a
      ? b
      : a;

  const controllingAuthority = override?.winningAuthority || authorityTypeOf(controlling);
  const weakerAuthority = override?.overriddenAuthority || authorityTypeOf(weaker);

  return {
    conflict: true,
    overrideApplied: Boolean(override?.overrideApplies),
    conflictTopic: doctrinalTopicOf(a),
    controllingAuthority,
    controllingSource: sourcePathOf(controlling),
    controllingTitle: sourceTitleOf(controlling),
    weakerAuthority,
    weakerSource: sourcePathOf(weaker),
    weakerTitle: sourceTitleOf(weaker),
    reason:
      override?.reason ||
      `${weakerAuthority} appears inconsistent with ${controllingAuthority}. Higher authority prevails.`,
    resolutionBasis: override?.overrideApplies
      ? "Court override applied."
      : `Prefer ${controllingAuthority} based on legal hierarchy.`,
    sourceAClaim: normalizeText(textA).slice(0, 500),
    sourceBClaim: normalizeText(textB).slice(0, 500),
    auditRecord: {
      decisionType: override?.overrideApplies
        ? "COURT_OVERRIDE"
        : "HIERARCHY_RESOLUTION",
      controllingAuthority,
      weakerAuthority,
      controllingSource: sourcePathOf(controlling),
      weakerSource: sourcePathOf(weaker)
    }
  };
}

export function detectDoctrinalConflicts(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const result = compareDoctrinalPair(docs[i], docs[j]);
      if (result) conflicts.push(result);
    }
  }

  const seen = new Set();

  return conflicts.filter((item) => {
    const key = [
      item.conflictTopic,
      item.controllingSource,
      item.weakerSource,
      item.controllingAuthority,
      item.weakerAuthority
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
      conflictingDocs: [],
      overrideApplied: false,
      weakerAuthority: null,
      weakerSource: null,
      auditRecord: null
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
          conflictingDocs: [topDocs[i], topDocs[j]],
          overrideApplied: Boolean(pair.overrideApplied),
          weakerAuthority: pair.weakerAuthority,
          weakerSource: pair.weakerSource,
          auditRecord: pair.auditRecord || null
        };
      }
    }
  }

  return {
    conflict: false,
    controllingAuthority: null,
    controllingSource: null,
    reason: null,
    conflictingDocs: [],
    overrideApplied: false,
    weakerAuthority: null,
    weakerSource: null,
    auditRecord: null
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
