// FILE: conflict-engine.js
"use strict";

/**
 * conflict-engine.js
 * TINA Legal / Doctrinal Conflict Engine
 */

const {
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
} = require("./authority-engine.js");

const ENGINE_VERSION = "2.2.0";

const CONFLICT_TYPE = Object.freeze({
  NONE: "NO_CONFLICT",
  HIERARCHY: "HIERARCHY_CONFLICT",
  DOCTRINAL: "DOCTRINAL_CONFLICT",
  MIXED: "MIXED_HIERARCHY_AND_DOCTRINAL_CONFLICT",
  APPARENT: "APPARENT_CONFLICT_ONLY"
});

const DOCTRINE_DIMENSION = Object.freeze({
  SUBSTANTIVE: "substantive",
  PROCEDURAL: "procedural",
  EVIDENTIARY: "evidentiary",
  JURISDICTIONAL: "jurisdictional",
  TEMPORAL: "temporal",
  ADMINISTRATIVE: "administrative",
  FACTUAL: "factual",
  CONTRACTUAL: "contractual",
  ECONOMIC_SUBSTANCE: "economic_substance",
  AUDIT: "audit",
  GENERAL: "general"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sourceLabel(doc = {}) {
  return getDocPath(doc) || getDocSource(doc) || "Unknown source";
}

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
    /\bitem\s+([a-zA-Z0-9().-]+)\b/i,
    /\bparagraph\s+([a-zA-Z0-9().-]+)\b/i
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
          "ruling",
          "section",
          "article",
          "source",
          "authority",
          "court",
          "decision",
          "document",
          "taxpayer",
          "commissioner"
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

function hasNegativeSignal(text = "") {
  const value = ` ${lower(text)} `;

  return [
    " not ",
    " except ",
    " unless ",
    " exempt ",
    " exempted ",
    " exemption ",
    " disallowed ",
    " prohibited ",
    " excluded ",
    " void ",
    " invalid ",
    " shall not ",
    " may not ",
    " must not ",
    " cannot ",
    " non-taxable ",
    " nontaxable ",
    " non taxable ",
    " not subject ",
    " not liable ",
    " not deductible ",
    " non-deductible ",
    " not allowed ",
    " denied ",
    " barred "
  ].some((token) => value.includes(token));
}

function hasAffirmativeTaxabilitySignal(text = "") {
  const value = lower(text);

  return /\b(subject to|taxable|liable|imposable|included in gross income|forms part of gross income|vatable|deductible|allowed as deduction|allowable|may be claimed|entitled to|valid)\b/i.test(
    value
  );
}

function hasMandatorySignal(text = "") {
  const value = lower(text);
  return /\b(shall|must|required|mandatory|jurisdictional|condition precedent|prerequisite|indispensable)\b/i.test(value);
}

function hasPermissiveSignal(text = "") {
  const value = lower(text);
  return /\b(may|optional|directory|discretionary|allowed|permitted|substantial compliance)\b/i.test(value);
}

function classifyDimension(text = "") {
  const value = lower(text);
  const dimensions = [];

  if (/\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|capital gains tax|documentary stamp tax|percentage tax)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.SUBSTANTIVE);
  }

  if (/\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|fld|return|form|remedy)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.PROCEDURAL);
  }

  if (/\b(invoice|receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.EVIDENTIARY);
  }

  if (/\b(jurisdiction|jurisdictional|cta|court has no jurisdiction|condition precedent|exhaustion|120\+30|30-day)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.JURISDICTIONAL);
  }

  if (/\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.TEMPORAL);
  }

  if (/\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|implementing rule|regulation)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.ADMINISTRATIVE);
  }

  if (/\b(facts|factual|depending on|case-to-case|actual|circumstances|evidence shows)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.FACTUAL);
  }

  if (/\b(contract|agreement|clause|lease|concession|termination|obligation|consideration|control|risk transfer)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.CONTRACTUAL);
  }

  if (/\b(economic substance|substance over form|sham|simulation|business purpose|commercial reality)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.ECONOMIC_SUBSTANCE);
  }

  if (/\b(audit|working paper|pfrs|pas|afs|misstatement|assertion|sufficient appropriate audit evidence)\b/i.test(value)) {
    dimensions.push(DOCTRINE_DIMENSION.AUDIT);
  }

  return dimensions.length ? dimensions : [DOCTRINE_DIMENSION.GENERAL];
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return false;

  if (a.includes(DOCTRINE_DIMENSION.GENERAL) || b.includes(DOCTRINE_DIMENSION.GENERAL)) {
    return true;
  }

  return a.some((item) => b.includes(item));
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const xNeg = hasNegativeSignal(x);
  const yNeg = hasNegativeSignal(y);

  const negationOpposition = xNeg !== yNeg;

  const taxabilityOpposition =
    (hasAffirmativeTaxabilitySignal(x) && hasNegativeSignal(y)) ||
    (hasAffirmativeTaxabilitySignal(y) && hasNegativeSignal(x));

  const mandatoryOpposition =
    (hasMandatorySignal(x) && hasPermissiveSignal(y)) ||
    (hasMandatorySignal(y) && hasPermissiveSignal(x));

  if (!negationOpposition && !taxabilityOpposition && !mandatoryOpposition) {
    return false;
  }

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
  return lexicalTopicTokens(input).slice(0, 12);
}

function extractConflictSignals(doc = {}) {
  const sourceText = compactSpaces(
    doc.text ||
      doc.claim_text ||
      doc.claimText ||
      doc.content ||
      doc.excerpt ||
      doc.preview ||
      ""
  );

  const combinedRef = compactSpaces(
    [
      getDocSource(doc),
      getDocPath(doc),
      getDocNormalizedReference(doc),
      doc.title,
      doc.sourceTitle,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName
    ]
      .filter(Boolean)
      .join(" ")
  );

  const authorityType = getAuthorityTypeForDoc(doc);
  const authorityLevel = getAuthorityLevelForDoc(doc);
  const controllingPrecedence = getControllingPrecedenceForDoc(doc);

  return {
    authorityType,
    authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
    authorityLevel,
    controllingPrecedence,

    provisionLabel: extractProvisionLabel(`${combinedRef} ${sourceText}`),
    issuanceFingerprint: extractIssuanceFingerprint(combinedRef),
    grNumber: extractGRNumber(combinedRef),
    ctaCaseNumber: extractCTACaseNumber(combinedRef),
    caGrNumber: extractCAGRNumber(combinedRef),

    topicSignature: extractTopicSignature(sourceText),
    dimensions: classifyDimension(sourceText),

    text: sourceText,
    source: combinedRef
  };
}

function sameDocumentOrCase(a, b) {
  const sameIssuance =
    a.issuanceFingerprint &&
    b.issuanceFingerprint &&
    a.issuanceFingerprint === b.issuanceFingerprint;

  const sameCase =
    (a.grNumber && a.grNumber === b.grNumber) ||
    (a.ctaCaseNumber && a.ctaCaseNumber === b.ctaCaseNumber) ||
    (a.caGrNumber && a.caGrNumber === b.caGrNumber);

  return Boolean(sameIssuance || sameCase);
}

function hasSameLegalIssue(a, b) {
  const sameProvision =
    a.provisionLabel &&
    b.provisionLabel &&
    lower(a.provisionLabel) === lower(b.provisionLabel);

  const overlappingTopics =
    signaturesOverlap(a.topicSignature, b.topicSignature) ||
    hasMeaningfulTopicOverlap(a.text, b.text);

  const sameDimension = dimensionsOverlap(a.dimensions, b.dimensions);

  return Boolean((sameProvision || overlappingTopics) && sameDimension);
}

function classifyConflictBetweenSignals(a, b) {
  if (!a.text || !b.text) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      reason: "One or both sources have no usable text for conflict analysis."
    };
  }

  if (a.text === b.text || sameDocumentOrCase(a, b)) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      reason: "Sources appear to be the same issuance/case or contain the same claim."
    };
  }

  const topicOverlap =
    signaturesOverlap(a.topicSignature, b.topicSignature) ||
    hasMeaningfulTopicOverlap(a.text, b.text);

  if (!topicOverlap) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      reason: "Sources do not address the same legal topic."
    };
  }

  const contradictory = looksContradictory(a.text, b.text);
  const sameLegalIssue = hasSameLegalIssue(a, b);
  const sameDimension = dimensionsOverlap(a.dimensions, b.dimensions);

  if (!contradictory) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      reason: "Sources may relate to the same topic but do not state contradictory rules."
    };
  }

  if (!sameLegalIssue || !sameDimension) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.APPARENT,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: true,
      reason:
        "The sources appear different, but the distinction is likely procedural, evidentiary, jurisdictional, temporal, factual, contractual, economic-substance, administrative, audit-related, or otherwise issue-specific rather than a true doctrinal conflict."
    };
  }

  if (a.controllingPrecedence === b.controllingPrecedence) {
    return {
      conflict: true,
      conflictType: CONFLICT_TYPE.DOCTRINAL,
      doctrinalConflict: true,
      hierarchyConflict: false,
      apparentConflict: false,
      reason:
        "The sources appear to state inconsistent rules on the same legal issue at the same controlling-precedence level."
    };
  }

  return {
    conflict: true,
    conflictType: CONFLICT_TYPE.MIXED,
    doctrinalConflict: true,
    hierarchyConflict: true,
    apparentConflict: false,
    reason:
      "The sources appear to state inconsistent rules on the same legal issue and are from different hierarchy levels, requiring hierarchy-based resolution."
  };
}

function resolveCourtOverride(sourceA = {}, sourceB = {}) {
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
      reason: `${AUTHORITY_LABEL[aType] || aType} controls over conflicting ${AUTHORITY_LABEL[bType] || bType} because controlling judicial doctrine prevails over inconsistent administrative interpretation.`
    };
  }

  if (bIsCourt && aIsBir) {
    return {
      overrideApplies: true,
      winningSource: sourceB,
      overriddenSource: sourceA,
      winningAuthority: bType,
      overriddenAuthority: aType,
      reason: `${AUTHORITY_LABEL[bType] || bType} controls over conflicting ${AUTHORITY_LABEL[aType] || aType} because controlling judicial doctrine prevails over inconsistent administrative interpretation.`
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
    reason: `${AUTHORITY_LABEL[winningAuthority] || winningAuthority} controls over ${AUTHORITY_LABEL[overriddenAuthority] || overriddenAuthority} based on Philippine legal hierarchy. Lower authority cannot amend, expand, or override higher authority.`
  };
}

function analyzeConflictPair(sourceA = {}, sourceB = {}) {
  const a = extractConflictSignals(sourceA);
  const b = extractConflictSignals(sourceB);

  const classification = classifyConflictBetweenSignals(a, b);
  const override = classification.conflict
    ? resolveCourtOverride(sourceA, sourceB)
    : null;

  const controllingSource = override?.winningSource || null;
  const overriddenSource = override?.overriddenSource || null;

  return {
    ...classification,

    sourceA: sourceLabel(sourceA),
    sourceB: sourceLabel(sourceB),

    sourceAAuthority: a.authorityType,
    sourceBAuthority: b.authorityType,
    sourceAAuthorityLabel: a.authorityLabel,
    sourceBAuthorityLabel: b.authorityLabel,

    sourceAProvision: a.provisionLabel || null,
    sourceBProvision: b.provisionLabel || null,

    sourceADimensions: a.dimensions,
    sourceBDimensions: b.dimensions,

    sourceAClaim: normalizeText(a.text).slice(0, 700),
    sourceBClaim: normalizeText(b.text).slice(0, 700),

    exactIssue: classification.conflict
      ? "Whether both authorities can govern the same Philippine tax issue despite stating inconsistent rules."
      : classification.apparentConflict
        ? "Whether the apparent inconsistency is explained by different legal dimensions, facts, timing, evidence, contract terms, or procedural context."
        : null,

    controllingAuthority: override?.winningAuthority || null,
    controllingSource: controllingSource ? sourceLabel(controllingSource) : null,
    overriddenAuthority: override?.overriddenAuthority || null,
    overriddenSource: overriddenSource ? sourceLabel(overriddenSource) : null,
    overrideApplied: Boolean(override?.overrideApplies),

    resolutionBasis: classification.conflict
      ? override?.reason || "Apply controlling legal hierarchy to determine which authority prevails."
      : classification.apparentConflict
        ? "No hierarchy override should be applied unless the same legal issue is directly contradicted."
        : null,

    distinctionType: [...new Set([...(a.dimensions || []), ...(b.dimensions || [])])].join(", "),

    plannerCompatibility: {
      requiresConflictDisclosure: Boolean(classification.conflict || classification.apparentConflict),
      requiresHierarchyExplanation: Boolean(classification.hierarchyConflict),
      requiresDoctrinalAnalysis: Boolean(classification.doctrinalConflict),
      requiresApparentConflictCaution: Boolean(classification.apparentConflict)
    },

    rendererCompatibility: {
      doctrinalStatusBlockRequired: Boolean(classification.conflict || classification.apparentConflict),
      hierarchyBlockRequired: Boolean(classification.hierarchyConflict),
      limitationLanguageRecommended: Boolean(classification.apparentConflict)
    },

    auditRecord: {
      conflictType: classification.conflictType,
      doctrinalConflict: classification.doctrinalConflict,
      hierarchyConflict: classification.hierarchyConflict,
      apparentConflict: classification.apparentConflict,
      sourceA: sourceLabel(sourceA),
      sourceB: sourceLabel(sourceB),
      sourceAAuthority: a.authorityType,
      sourceBAuthority: b.authorityType,
      sourceADimensions: a.dimensions,
      sourceBDimensions: b.dimensions,
      controllingAuthority: override?.winningAuthority || null,
      overriddenAuthority: override?.overriddenAuthority || null,
      generatedAt: new Date().toISOString(),
      tinaConflictEngineVersion: ENGINE_VERSION
    }
  };
}

function isGenuineConflict(sourceA = {}, sourceB = {}) {
  return Boolean(analyzeConflictPair(sourceA, sourceB).conflict);
}

function isDoctrinalConflict(sourceA = {}, sourceB = {}) {
  return Boolean(analyzeConflictPair(sourceA, sourceB).doctrinalConflict);
}

function isHierarchyConflict(sourceA = {}, sourceB = {}) {
  return Boolean(analyzeConflictPair(sourceA, sourceB).hierarchyConflict);
}

function isApparentConflict(sourceA = {}, sourceB = {}) {
  return Boolean(analyzeConflictPair(sourceA, sourceB).apparentConflict);
}

function detectHierarchyConflict(topDocs = []) {
  if (!Array.isArray(topDocs) || topDocs.length < 2) {
    return {
      conflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      controllingAuthority: null,
      controllingSource: null,
      reason: null,
      exactIssue: null,
      distinctionType: null,
      conflictingDocs: [],
      sourceA: null,
      sourceB: null,
      overriddenAuthority: null,
      overrideApplied: false,
      plannerCompatibility: {
        requiresConflictDisclosure: false,
        requiresHierarchyExplanation: false,
        requiresDoctrinalAnalysis: false,
        requiresApparentConflictCaution: false
      },
      auditRecord: null
    };
  }

  let firstApparentConflict = null;

  for (let i = 0; i < topDocs.length; i += 1) {
    for (let j = i + 1; j < topDocs.length; j += 1) {
      const a = topDocs[i];
      const b = topDocs[j];

      const analysis = analyzeConflictPair(a, b);

      if (analysis.apparentConflict && !firstApparentConflict) {
        firstApparentConflict = {
          conflict: false,
          conflictType: CONFLICT_TYPE.APPARENT,
          doctrinalConflict: false,
          hierarchyConflict: false,
          apparentConflict: true,
          controllingAuthority: null,
          controllingSource: null,
          reason: analysis.reason,
          exactIssue: analysis.exactIssue,
          distinctionType: analysis.distinctionType,
          conflictingDocs: [a, b],
          sourceA: analysis.sourceA,
          sourceB: analysis.sourceB,
          overriddenAuthority: null,
          overrideApplied: false,
          plannerCompatibility: analysis.plannerCompatibility,
          rendererCompatibility: analysis.rendererCompatibility,
          auditRecord: analysis.auditRecord
        };
      }

      if (!analysis.conflict) continue;

      return {
        conflict: true,
        conflictType: analysis.conflictType,
        doctrinalConflict: analysis.doctrinalConflict,
        hierarchyConflict: analysis.hierarchyConflict,
        apparentConflict: false,
        controllingAuthority: analysis.controllingAuthority,
        controllingSource: analysis.controllingSource,
        reason: [
          analysis.reason,
          analysis.resolutionBasis,
          `Exact issue: ${analysis.exactIssue}`,
          `Distinction type: ${analysis.distinctionType || "not determined"}`
        ]
          .filter(Boolean)
          .join(" "),
        exactIssue: analysis.exactIssue,
        distinctionType: analysis.distinctionType,
        conflictingDocs: [a, b],
        sourceA: analysis.sourceA,
        sourceB: analysis.sourceB,
        overriddenAuthority: analysis.overriddenAuthority,
        overrideApplied: Boolean(analysis.overrideApplied),
        plannerCompatibility: analysis.plannerCompatibility,
        rendererCompatibility: analysis.rendererCompatibility,
        auditRecord: analysis.auditRecord
      };
    }
  }

  if (firstApparentConflict) return firstApparentConflict;

  return {
    conflict: false,
    conflictType: CONFLICT_TYPE.NONE,
    doctrinalConflict: false,
    hierarchyConflict: false,
    apparentConflict: false,
    controllingAuthority: null,
    controllingSource: null,
    reason:
      "No hierarchy or doctrinal conflict was detected. Related authorities should still be analyzed for relevance and legal hierarchy, but no contradiction requiring override was found.",
    exactIssue: null,
    distinctionType: null,
    conflictingDocs: [],
    sourceA: null,
    sourceB: null,
    overriddenAuthority: null,
    overrideApplied: false,
    plannerCompatibility: {
      requiresConflictDisclosure: false,
      requiresHierarchyExplanation: false,
      requiresDoctrinalAnalysis: false,
      requiresApparentConflictCaution: false
    },
    rendererCompatibility: {
      doctrinalStatusBlockRequired: false,
      hierarchyBlockRequired: false,
      limitationLanguageRecommended: false
    },
    auditRecord: null
  };
}

function buildConflictPromptBlock(conflict = null) {
  if (!conflict || (!conflict.conflict && !conflict.apparentConflict)) {
    return "No direct doctrinal or hierarchy conflict detected. Do not invent a conflict.";
  }

  return [
    "CONFLICT ANALYSIS CONTROL",
    `Conflict Type: ${conflict.conflictType || "N/A"}`,
    `Doctrinal Conflict: ${conflict.doctrinalConflict ? "YES" : "NO"}`,
    `Hierarchy Conflict: ${conflict.hierarchyConflict ? "YES" : "NO"}`,
    `Apparent Conflict Only: ${conflict.apparentConflict ? "YES" : "NO"}`,
    `Exact Issue: ${conflict.exactIssue || "Not determined"}`,
    `Distinction Type: ${conflict.distinctionType || "Not determined"}`,
    `Controlling Authority: ${conflict.controllingAuthority || "Not determined"}`,
    `Controlling Source: ${conflict.controllingSource || "Not determined"}`,
    `Overridden Authority: ${conflict.overriddenAuthority || "None"}`,
    `Resolution Basis: ${conflict.reason || conflict.resolutionBasis || "Apply legal hierarchy."}`,
    "Instruction: Do not merely state 'Conflict detected.' Explain the exact issue, controlling authority, distinction type, and why the controlling authority prevails."
  ].join("\n");
}

function conflictEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONFLICT_ENGINE",
    version: ENGINE_VERSION,
    commonJsCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true
  };
}

module.exports = {
  ENGINE_VERSION,
  CONFLICT_TYPE,
  DOCTRINE_DIMENSION,

  analyzeConflictPair,
  detectHierarchyConflict,

  isGenuineConflict,
  isDoctrinalConflict,
  isHierarchyConflict,
  isApparentConflict,

  resolveCourtOverride,
  buildConflictPromptBlock,
  conflictEngineHealthCheck
};
