// FILE: conflict-engine.js

import {
  AUTHORITY_LABEL,
  BIR_TYPES,
  COURT_TYPES,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

function extractGRNumber(input = "") {
  const match = compactSpaces(input).match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function extractCTACaseNumber(input = "") {
  const raw = compactSpaces(input);
  const patterns = [
    /\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i,
    /\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i,
    /\bc\.?t\.?a\.?\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return "";
}

function extractCAGRNumber(input = "") {
  const match = compactSpaces(input).match(
    /\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );
  return match ? match[1].toUpperCase() : "";
}

function extractProvisionLabel(input = "") {
  const raw = compactSpaces(input);
  const patterns = [
    /\bsection\s+(\d+[a-zA-Z-]*)\b/i,
    /\bsec\.?\s+(\d+[a-zA-Z-]*)\b/i,
    /\barticle\s+([a-zA-Z0-9-]+)\b/i,
    /\bart\.?\s+([a-zA-Z0-9-]+)\b/i,
    /\bitem\s+([a-zA-Z0-9().-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[0];
  }

  return "";
}

function lexicalTopicTokens(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter(
      (token) =>
        ![
          "shall",
          "where",
          "which",
          "under",
          "there",
          "their",
          "this",
          "that",
          "with",
          "from",
          "have",
          "been",
          "were",
          "when",
          "what",
          "than",
          "into",
          "also",
          "only",
          "revenue",
          "memorandum",
          "regulation",
          "ruling"
        ].includes(token)
    );
}

function hasMeaningfulTopicOverlap(a = "", b = "") {
  const setA = new Set(lexicalTopicTokens(a));
  const setB = new Set(lexicalTopicTokens(b));

  if (!setA.size || !setB.size) return false;

  let hits = 0;

  for (const token of setA) {
    if (setB.has(token)) hits += 1;
    if (hits >= 3) return true;
  }

  return false;
}

function signaturesOverlap(a = [], b = []) {
  if (!a.length || !b.length) return false;

  const setB = new Set(b);
  let hits = 0;

  for (const token of a) {
    if (setB.has(token)) hits += 1;
    if (hits >= 2) return true;
  }

  return false;
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const negPatterns = [
    /\bnot\b/,
    /\bexcept\b/,
    /\bunless\b/,
    /\bexempt\b/,
    /\bdisallowed\b/,
    /\bprohibited\b/,
    /\bexcluded\b/,
    /\bsubject to\b/,
    /\bshall not\b/,
    /\bshall\b/,
    /\bmay not\b/,
    /\bmust\b/,
    /\bmust not\b/
  ];

  const xNeg = negPatterns.some((pattern) => pattern.test(x));
  const yNeg = negPatterns.some((pattern) => pattern.test(y));

  if (xNeg === yNeg) return false;

  return hasMeaningfulTopicOverlap(x, y);
}

function extractIssuanceFingerprint(input = "") {
  const raw = compactSpaces(input).toUpperCase();

  const patterns = [
    /\bRR[_\s-]*(\d{1,3})[_\s-]*(\d{2,4})\b/,
    /\bRMC[_\s-]*(\d{1,3})[_\s-]*(\d{2,4})\b/,
    /\bRMO[_\s-]*(\d{1,3})[_\s-]*(\d{2,4})\b/,
    /\bRAMO[_\s-]*(\d{1,3})[_\s-]*(\d{2,4})\b/,
    /\bRA[_\s-]*(\d{4,6})\b/,
    /\bBIR_RULING[_\s-]*([A-Z0-9_()./-]+)\b/
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[0].replace(/\s+/g, "_");
  }

  return "";
}

function extractTopicSignature(input = "") {
  return lexicalTopicTokens(input)
    .filter(
      (token) =>
        ![
          "section",
          "article",
          "source",
          "authority",
          "court",
          "decision"
        ].includes(token)
    )
    .slice(0, 12);
}

function extractConflictSignals(doc = {}) {
  const sourceText = compactSpaces(doc.text || "");
  const combinedRef = compactSpaces(
    [getDocSource(doc), getDocPath(doc), getDocNormalizedReference(doc)]
      .filter(Boolean)
      .join(" ")
  );

  return {
    authorityType: getAuthorityTypeForDoc(doc),
    authorityLevel: getAuthorityLevelForDoc(doc),
    controllingPrecedence: getControllingPrecedenceForDoc(doc),
    provisionLabel: extractProvisionLabel(`${combinedRef} ${sourceText}`),
    issuanceFingerprint: extractIssuanceFingerprint(combinedRef),
    grNumber: extractGRNumber(combinedRef),
    ctaCaseNumber: extractCTACaseNumber(combinedRef),
    caGrNumber: extractCAGRNumber(combinedRef),
    topicSignature: extractTopicSignature(sourceText),
    text: sourceText
  };
}

export function isGenuineConflict(sourceA = {}, sourceB = {}) {
  const a = extractConflictSignals(sourceA);
  const b = extractConflictSignals(sourceB);

  if (!a.text || !b.text) return false;
  if (a.text === b.text) return false;

  const sameIssuance =
    a.issuanceFingerprint &&
    b.issuanceFingerprint &&
    a.issuanceFingerprint === b.issuanceFingerprint;

  const sameCase =
    (a.grNumber && a.grNumber === b.grNumber) ||
    (a.ctaCaseNumber && a.ctaCaseNumber === b.ctaCaseNumber) ||
    (a.caGrNumber && a.caGrNumber === b.caGrNumber);

  if (sameIssuance || sameCase) return false;

  const sameProvision =
    a.provisionLabel &&
    b.provisionLabel &&
    lower(a.provisionLabel) === lower(b.provisionLabel);

  const overlappingTopics =
    signaturesOverlap(a.topicSignature, b.topicSignature) ||
    hasMeaningfulTopicOverlap(a.text, b.text);

  if (!sameProvision && !overlappingTopics) return false;
  if (!looksContradictory(a.text, b.text)) return false;

  return true;
}

export function resolveCourtOverride(sourceA = {}, sourceB = {}) {
  const aType = getAuthorityTypeForDoc(sourceA);
  const bType = getAuthorityTypeForDoc(sourceB);

  const aIsCourt = COURT_TYPES.has(aType);
  const bIsCourt = COURT_TYPES.has(bType);
  const aIsBir = BIR_TYPES.has(aType);
  const bIsBir = BIR_TYPES.has(bType);

  if (aIsCourt && bIsBir) {
    return {
      overrideApplies: true,
      winningSource: sourceA,
      overriddenSource: sourceB,
      winningAuthority: aType,
      overriddenAuthority: bType,
      reason: `${AUTHORITY_LABEL[aType] || aType} overrides conflicting ${AUTHORITY_LABEL[bType] || bType}.`
    };
  }

  if (bIsCourt && aIsBir) {
    return {
      overrideApplies: true,
      winningSource: sourceB,
      overriddenSource: sourceA,
      winningAuthority: bType,
      overriddenAuthority: aType,
      reason: `${AUTHORITY_LABEL[bType] || bType} overrides conflicting ${AUTHORITY_LABEL[aType] || aType}.`
    };
  }

  const aPrecedence = getControllingPrecedenceForDoc(sourceA);
  const bPrecedence = getControllingPrecedenceForDoc(sourceB);

  const winningSource = aPrecedence <= bPrecedence ? sourceA : sourceB;
  const overriddenSource = aPrecedence <= bPrecedence ? sourceB : sourceA;
  const winningAuthority = getAuthorityTypeForDoc(winningSource);
  const overriddenAuthority = getAuthorityTypeForDoc(overriddenSource);

  return {
    overrideApplies: false,
    winningSource,
    overriddenSource,
    winningAuthority,
    overriddenAuthority,
    reason: `${AUTHORITY_LABEL[winningAuthority] || winningAuthority} prevails based on controlling authority hierarchy.`
  };
}

export function detectHierarchyConflict(topDocs = []) {
  if (!Array.isArray(topDocs) || topDocs.length < 2) {
    return {
      conflict: false,
      controllingAuthority: null,
      controllingSource: null,
      reason: null,
      conflictingDocs: [],
      sourceA: null,
      sourceB: null,
      overriddenAuthority: null,
      overrideApplied: false,
      auditRecord: null
    };
  }

  for (let i = 0; i < topDocs.length; i += 1) {
    for (let j = i + 1; j < topDocs.length; j += 1) {
      const a = topDocs[i];
      const b = topDocs[j];

      if (!isGenuineConflict(a, b)) continue;

      const override = resolveCourtOverride(a, b);
      const controlling = override.winningSource;
      const overridden = override.overriddenSource;

      const auditRecord = {
        decisionType: override.overrideApplies ? "COURT_OVERRIDE" : "HIERARCHY_RESOLUTION",
        controllingAuthority: override.winningAuthority,
        overriddenAuthority: override.overriddenAuthority,
        controllingSource: getDocPath(controlling) || getDocSource(controlling),
        overriddenSource: getDocPath(overridden) || getDocSource(overridden),
        generatedAt: new Date().toISOString()
      };

      return {
        conflict: true,
        controllingAuthority: override.winningAuthority,
        controllingSource: auditRecord.controllingSource,
        reason: override.reason,
        conflictingDocs: [a, b],
        sourceA: getDocPath(a) || getDocSource(a),
        sourceB: getDocPath(b) || getDocSource(b),
        overriddenAuthority: override.overriddenAuthority,
        overrideApplied: Boolean(override.overrideApplies),
        auditRecord
      };
    }
  }

  return {
    conflict: false,
    controllingAuthority: null,
    controllingSource: null,
    reason: null,
    conflictingDocs: [],
    sourceA: null,
    sourceB: null,
    overriddenAuthority: null,
    overrideApplied: false,
    auditRecord: null
  };
}
