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
  return String(value || "").replace(/\s+/g, " ").trim();
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
    sourcePathOf(doc) ||
    null
  );
}

function doctrinalTopicOf(doc = {}) {
  return normalizeText(
    doc.topic ||
      doc.metadata?.topic ||
      doc.taxType ||
      doc.tax_type ||
      doc.metadata?.taxType ||
      doc.subtopic ||
      doc.metadata?.subtopic ||
      "general"
  ).toLowerCase();
}

function claimTextOf(doc = {}) {
  return normalizeText(
    doc.claim_text ||
      doc.claimText ||
      doc.doctrine ||
      doc.rule ||
      doc.text ||
      doc.content ||
      ""
  );
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
    " void ",
    " invalid ",
    " shall not ",
    " may not ",
    " must not ",
    " cannot ",
    " non-deductible ",
    " non taxable ",
    " non-taxable ",
    " not subject ",
    " not liable ",
    " excluded "
  ].some((token) => value.includes(token));
}

function hasMandatorySignal(text = "") {
  const value = lower(text);
  return /\b(shall|must|required|mandatory|jurisdictional|condition precedent|prerequisite)\b/i.test(value);
}

function hasPermissiveSignal(text = "") {
  const value = lower(text);
  return /\b(may|optional|directory|discretionary|allowed|permitted)\b/i.test(value);
}

function hasSubstantiveSignal(text = "") {
  const value = lower(text);
  return /\b(subject to|liable|taxable|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax)\b/i.test(value);
}

function hasProceduralSignal(text = "") {
  const value = lower(text);
  return /\b(file|filing|deadline|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|fan|fl d|pan|return|form)\b/i.test(value);
}

function hasEvidentiarySignal(text = "") {
  const value = lower(text);
  return /\b(invoice|receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books)\b/i.test(value);
}

function hasJurisdictionalSignal(text = "") {
  const value = lower(text);
  return /\b(jurisdiction|jurisdictional|court has no jurisdiction|cta|120\+30|30-day|condition precedent|exhaustion)\b/i.test(value);
}

function hasTemporalSignal(text = "") {
  const value = lower(text);
  return /\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value);
}

function classifyDoctrineDimension(text = "") {
  const dimensions = [];

  if (hasSubstantiveSignal(text)) dimensions.push("substantive");
  if (hasProceduralSignal(text)) dimensions.push("procedural");
  if (hasEvidentiarySignal(text)) dimensions.push("evidentiary");
  if (hasJurisdictionalSignal(text)) dimensions.push("jurisdictional");
  if (hasTemporalSignal(text)) dimensions.push("temporal");

  if (!dimensions.length) dimensions.push("general/legal");

  return dimensions;
}

function sameOrRelatedTopic(topicA = "", topicB = "") {
  const a = lower(topicA);
  const b = lower(topicB);

  if (!a || !b) return true;
  if (a === b) return true;
  if (a === "general" || b === "general") return true;

  return a.includes(b) || b.includes(a);
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const xNeg = hasNegativeSignal(x);
  const yNeg = hasNegativeSignal(y);
  const negationOpposition = xNeg !== yNeg;

  const mandatoryOpposition =
    (hasMandatorySignal(x) && hasPermissiveSignal(y)) ||
    (hasMandatorySignal(y) && hasPermissiveSignal(x));

  const taxableOpposition =
    (/\b(subject to tax|taxable|liable|subject to vat|subject to income tax)\b/i.test(x) &&
      /\b(not subject|exempt|non-taxable|excluded)\b/i.test(y)) ||
    (/\b(subject to tax|taxable|liable|subject to vat|subject to income tax)\b/i.test(y) &&
      /\b(not subject|exempt|non-taxable|excluded)\b/i.test(x));

  return negationOpposition || mandatoryOpposition || taxableOpposition;
}

function determineConflictKind({ textA = "", textB = "", authorityA = "", authorityB = "" }) {
  const dimensionsA = classifyDoctrineDimension(textA);
  const dimensionsB = classifyDoctrineDimension(textB);

  const sameDimension = dimensionsA.some((item) => dimensionsB.includes(item));
  const contradictory = looksContradictory(textA, textB);

  if (!contradictory) {
    return {
      status: "NO_CONFLICT",
      label: "No doctrinal conflict exists",
      distinction: "The retrieved authorities do not state inconsistent rules.",
      dimensionsA,
      dimensionsB
    };
  }

  if (!sameDimension) {
    return {
      status: "APPARENT_CONFLICT",
      label: "Apparent conflict only",
      distinction:
        "The authorities appear different because they address different legal dimensions, such as substantive liability versus procedural, evidentiary, jurisdictional, or temporal compliance.",
      dimensionsA,
      dimensionsB
    };
  }

  const sameAuthorityClass = authorityA === authorityB;

  return {
    status: sameAuthorityClass ? "DIRECT_CONFLICT" : "PARTIAL_CONFLICT",
    label: sameAuthorityClass ? "Direct conflict exists" : "Partial conflict exists",
    distinction: sameAuthorityClass
      ? "The authorities appear to address the same legal dimension and state inconsistent rules."
      : "The authorities appear to address the same legal dimension, but they are issued by different authority levels and must be reconciled through hierarchy.",
    dimensionsA,
    dimensionsB
  };
}

function explainWhyControls({
  controllingAuthority,
  weakerAuthority,
  override = null,
  conflictKind = null
}) {
  if (override?.overrideApplies) {
    return (
      override.reason ||
      `${controllingAuthority} controls because binding judicial doctrine prevails over inconsistent administrative interpretation.`
    );
  }

  const status = conflictKind?.status || "";

  if (status === "APPARENT_CONFLICT") {
    return "No controlling override is required if the difference is only apparent; the authorities should be harmonized by limiting each rule to its own procedural, evidentiary, temporal, jurisdictional, administrative, or substantive context.";
  }

  return `${controllingAuthority} controls over ${weakerAuthority} based on Philippine legal hierarchy and controlling precedence. Lower-authority administrative issuances cannot amend, expand, or defeat a higher-authority rule.`;
}

function buildResolutionExplanation({
  conflictKind,
  controllingAuthority,
  weakerAuthority,
  controlling,
  weaker,
  override = null
}) {
  const controllingTitle = sourceTitleOf(controlling) || sourcePathOf(controlling) || "controlling source";
  const weakerTitle = sourceTitleOf(weaker) || sourcePathOf(weaker) || "weaker source";

  return [
    `${conflictKind.label}.`,
    `Exact issue: whether the retrieved statements can both govern the same tax issue, or whether one must yield to the other.`,
    `Nature of distinction: ${conflictKind.distinction}`,
    `Source A/B dimensions: ${conflictKind.dimensionsA.join(", ")} versus ${conflictKind.dimensionsB.join(", ")}.`,
    `Controlling authority: ${controllingAuthority} (${controllingTitle}).`,
    `Weaker or limited authority: ${weakerAuthority} (${weakerTitle}).`,
    `Why it controls: ${explainWhyControls({
      controllingAuthority,
      weakerAuthority,
      override,
      conflictKind
    })}`
  ].join(" ");
}

export function compareDoctrinalPair(a = {}, b = {}) {
  const topicA = doctrinalTopicOf(a);
  const topicB = doctrinalTopicOf(b);

  if (!sameOrRelatedTopic(topicA, topicB)) return null;

  const textA = claimTextOf(a);
  const textB = claimTextOf(b);

  if (!textA || !textB) return null;

  const authorityA = authorityTypeOf(a);
  const authorityB = authorityTypeOf(b);

  const conflictKind = determineConflictKind({
    textA,
    textB,
    authorityA,
    authorityB
  });

  if (conflictKind.status === "NO_CONFLICT") return null;
  if (conflictKind.status === "APPARENT_CONFLICT" && !looksContradictory(textA, textB)) return null;
  if (!isGenuineConflict(a, b) && conflictKind.status !== "APPARENT_CONFLICT") return null;

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

  const explanation = buildResolutionExplanation({
    conflictKind,
    controllingAuthority,
    weakerAuthority,
    controlling,
    weaker,
    override
  });

  return {
    conflict: conflictKind.status !== "NO_CONFLICT",
    conflictStatus: conflictKind.status,
    conflictLabel: conflictKind.label,
    overrideApplied: Boolean(override?.overrideApplies),
    conflictTopic: sameOrRelatedTopic(topicA, topicB) ? topicA || topicB : "general",
    controllingAuthority,
    controllingSource: sourcePathOf(controlling),
    controllingTitle: sourceTitleOf(controlling),
    weakerAuthority,
    weakerSource: sourcePathOf(weaker),
    weakerTitle: sourceTitleOf(weaker),
    reason: explanation,
    exactIssue:
      "Whether the compared authorities state inconsistent rules on the same Philippine tax issue, or are distinguishable by legal dimension or authority hierarchy.",
    distinctionType: conflictKind.dimensionsA
      .concat(conflictKind.dimensionsB)
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .join(", "),
    resolutionBasis: override?.overrideApplies
      ? "Court override applied because controlling judicial doctrine prevails over inconsistent administrative interpretation."
      : conflictKind.status === "APPARENT_CONFLICT"
        ? "Authorities should be harmonized because the apparent inconsistency arises from different legal dimensions."
        : `Prefer ${controllingAuthority} based on Philippine legal hierarchy and controlling precedence.`,
    sourceAClaim: normalizeText(textA).slice(0, 700),
    sourceBClaim: normalizeText(textB).slice(0, 700),
    chronologyNote:
      "If one authority is later in time, later issuance may matter only if it validly amends, supersedes, or interprets within the limits of its authority. A later lower-authority issuance cannot override a higher-authority statute or Supreme Court doctrine.",
    auditRecord: {
      decisionType: override?.overrideApplies
        ? "COURT_OVERRIDE"
        : conflictKind.status === "APPARENT_CONFLICT"
          ? "APPARENT_CONFLICT_HARMONIZATION"
          : "HIERARCHY_RESOLUTION",
      conflictStatus: conflictKind.status,
      controllingAuthority,
      weakerAuthority,
      controllingSource: sourcePathOf(controlling),
      weakerSource: sourcePathOf(weaker),
      distinctionType: conflictKind.dimensionsA
        .concat(conflictKind.dimensionsB)
        .filter((item, index, arr) => arr.indexOf(item) === index)
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
      item.weakerAuthority,
      item.conflictStatus
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
      conflictStatus: "NO_CONFLICT",
      conflictLabel: "No doctrinal conflict exists",
      controllingAuthority: null,
      controllingSource: null,
      reason: null,
      exactIssue: null,
      distinctionType: null,
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
          conflictStatus: pair.conflictStatus,
          conflictLabel: pair.conflictLabel,
          controllingAuthority: pair.controllingAuthority,
          controllingSource: pair.controllingSource,
          reason: pair.reason,
          exactIssue: pair.exactIssue,
          distinctionType: pair.distinctionType,
          conflictingDocs: [topDocs[i], topDocs[j]],
          overrideApplied: Boolean(pair.overrideApplied),
          weakerAuthority: pair.weakerAuthority,
          weakerSource: pair.weakerSource,
          chronologyNote: pair.chronologyNote,
          resolutionBasis: pair.resolutionBasis,
          auditRecord: pair.auditRecord || null
        };
      }
    }
  }

  return {
    conflict: false,
    conflictStatus: "NO_CONFLICT",
    conflictLabel: "No doctrinal conflict exists",
    controllingAuthority: null,
    controllingSource: null,
    reason:
      "No direct doctrinal conflict was detected. Retrieved authorities should still be evaluated for relevance, legal hierarchy, and whether they address substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative issues.",
    exactIssue: null,
    distinctionType: null,
    conflictingDocs: [],
    overrideApplied: false,
    weakerAuthority: null,
    weakerSource: null,
    auditRecord: null
  };
}

export function summarizeDoctrinalStatus(conflicts = []) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return {
      status: "NO_CONFLICT",
      label: "No doctrinal conflict exists",
      explanation:
        "No direct doctrinal conflict was detected from the compared authorities. Differences in procedural, evidentiary, jurisdictional, factual, temporal, or administrative requirements should be treated as distinctions unless the authorities directly contradict on the same legal issue."
    };
  }

  const direct = conflicts.find((item) => item.conflictStatus === "DIRECT_CONFLICT");
  if (direct) {
    return {
      status: "DIRECT_CONFLICT",
      label: "Direct conflict exists",
      explanation: direct.reason
    };
  }

  const partial = conflicts.find((item) => item.conflictStatus === "PARTIAL_CONFLICT");
  if (partial) {
    return {
      status: "PARTIAL_CONFLICT",
      label: "Partial conflict exists",
      explanation: partial.reason
    };
  }

  const apparent = conflicts.find((item) => item.conflictStatus === "APPARENT_CONFLICT");
  if (apparent) {
    return {
      status: "APPARENT_CONFLICT",
      label: "Apparent conflict only",
      explanation: apparent.reason
    };
  }

  return {
    status: "NO_CONFLICT",
    label: "No doctrinal conflict exists",
    explanation:
      "No direct doctrinal conflict was detected after hierarchy and issue-dimension review."
  };
}

export function reconcileDoctrine({
  rankedDocs = [],
  maxDocs = 5
}) {
  const topDocs = rankedDocs.slice(0, maxDocs);
  const hierarchyConflict = detectHierarchyConflict(topDocs);
  const doctrinalConflicts = detectDoctrinalConflicts(topDocs);
  const doctrinalStatus = summarizeDoctrinalStatus(doctrinalConflicts);

  return {
    topDocs,
    hierarchyConflict,
    doctrinalConflicts,
    doctrinalStatus,
    hasConflict:
      hierarchyConflict.conflict ||
      doctrinalConflicts.some((item) =>
        ["DIRECT_CONFLICT", "PARTIAL_CONFLICT"].includes(item.conflictStatus)
      ),
    hasApparentConflict:
      doctrinalConflicts.some((item) => item.conflictStatus === "APPARENT_CONFLICT"),
    explanation: doctrinalStatus.explanation
  };
}

export default {
  compareDoctrinalPair,
  detectDoctrinalConflicts,
  detectHierarchyConflict,
  summarizeDoctrinalStatus,
  reconcileDoctrine
};
