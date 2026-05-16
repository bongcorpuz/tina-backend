// FILE: conflict-engine.js
"use strict";

/**
 * TINA Conflict Engine
 * Version: 3.0.0
 *
 * Purpose:
 * - Detect true legal conflicts only.
 * - Require strict SAME-ISSUE gate before conflict analysis.
 * - Require OPPOSITE-HOLDING gate before declaring doctrinal conflict.
 * - Treat different legal dimensions as distinguishable, not conflicting.
 */

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

const ENGINE_VERSION = "3.0.0";

const CONFLICT_TYPE = Object.freeze({
  NONE: "NO_CONFLICT",
  HIERARCHY: "HIERARCHY_CONFLICT",
  DOCTRINAL: "DOCTRINAL_CONFLICT",
  MIXED: "MIXED_HIERARCHY_AND_DOCTRINAL_CONFLICT",
  APPARENT: "APPARENT_CONFLICT_ONLY",
  DISTINGUISHABLE: "DISTINGUISHABLE_AUTHORITIES"
});

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TEMPORAL: "TEMPORAL",
  FACTUAL: "FACTUAL",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  GENERAL: "GENERAL"
});

function getDocText(doc = {}) {
  return compactSpaces(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.summary,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.title,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function issueSignals(doc = {}) {
  const text = lower(getDocText(doc));
  const signals = [];

  const add = (condition, value) => {
    if (condition) signals.push(value);
  };

  add(/\bvat refund|input vat refund|unutilized input vat|excess input vat|tcc|claim for refund|120\+30|judicial claim|administrative claim\b/i.test(text), "VAT_REFUND");
  add(/\bvat liability|output vat|vatable|gross receipts|sale of goods|sale of services|subject to vat|value-added tax\b/i.test(text), "VAT_LIABILITY");
  add(/\bwithholding|expanded withholding|ewt|cwt|fwt|withholding tax\b/i.test(text), "WITHHOLDING");
  add(/\bincome tax|rcit|mcit|nolco|deductible|non-deductible|gross income|taxable income\b/i.test(text), "INCOME_TAX");
  add(/\binvoice|receipt|substantiation|documentary|evidence|proof|burden of proof|supporting document\b/i.test(text), "EVIDENTIARY");
  add(/\bjurisdiction|deadline|prescription|protest|appeal|loa|pan|fan|fld|assessment|remedy\b/i.test(text), "PROCEDURAL");
  add(/\bcontract|agreement|lease|concession|clause\b/i.test(text), "CONTRACT");
  add(/\bprincipal|agent|pass-through|pass through|reimbursement|reimbursable|economic substance|substance over form\b/i.test(text), "TRANSACTION");
  add(/\bmutuality|association dues|condominium dues|homeowners association\b/i.test(text), "MUTUALITY");
  add(/\bexemption|tax exempt|vat-exempt|zero-rated|zero rated\b/i.test(text), "EXEMPTION");

  return unique(signals);
}

function legalDimensions(doc = {}) {
  const text = lower(getDocText(doc));
  const dimensions = [];

  const add = (condition, value) => {
    if (condition) dimensions.push(value);
  };

  add(/\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(text), LEGAL_DIMENSION.SUBSTANTIVE);
  add(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(text), LEGAL_DIMENSION.PROCEDURAL);
  add(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|supporting documents)\b/i.test(text), LEGAL_DIMENSION.EVIDENTIARY);
  add(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(text), LEGAL_DIMENSION.JURISDICTIONAL);
  add(/\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(text), LEGAL_DIMENSION.TEMPORAL);
  add(/\b(transaction|actual circumstances|facts|factual|actual facts)\b/i.test(text), LEGAL_DIMENSION.FACTUAL);
  add(/\b(contract|agreement|clause|lease|concession)\b/i.test(text), LEGAL_DIMENSION.CONTRACTUAL);
  add(/\b(economic substance|substance over form|sham|simulation)\b/i.test(text), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function hasIssueOverlap(a = {}, b = {}) {
  const aSignals = issueSignals(a);
  const bSignals = issueSignals(b);
  if (!aSignals.length || !bSignals.length) return false;
  return aSignals.some((signal) => bSignals.includes(signal));
}

function getSameIssues(a = {}, b = {}) {
  const aSignals = issueSignals(a);
  const bSignals = issueSignals(b);
  return aSignals.filter((signal) => bSignals.includes(signal));
}

function getSameDimensions(a = {}, b = {}) {
  const aDimensions = legalDimensions(a);
  const bDimensions = legalDimensions(b);

  if (aDimensions.includes(LEGAL_DIMENSION.GENERAL) || bDimensions.includes(LEGAL_DIMENSION.GENERAL)) {
    return [];
  }

  return aDimensions.filter((dimension) => bDimensions.includes(dimension));
}

function hasDifferentVatDoctrine(a = {}, b = {}) {
  const aSignals = issueSignals(a);
  const bSignals = issueSignals(b);

  return (
    (aSignals.includes("VAT_REFUND") && bSignals.includes("VAT_LIABILITY")) ||
    (aSignals.includes("VAT_LIABILITY") && bSignals.includes("VAT_REFUND"))
  );
}

function getAuthorityType(doc = {}) {
  return getAuthorityTypeForDoc(doc) || "UNKNOWN";
}

function getAuthorityLevel(doc = {}) {
  return Number(getAuthorityLevelForDoc(doc) || 99);
}

function getPrecedence(doc = {}) {
  return Number(getControllingPrecedenceForDoc(doc) || 99);
}

function isCourtAuthority(type = "") {
  return COURT_TYPES.has(String(type || "").toUpperCase());
}

function isBIRAuthority(type = "") {
  return BIR_TYPES.has(String(type || "").toUpperCase());
}

function sameAuthorityFamily(a = {}, b = {}) {
  const aType = getAuthorityType(a);
  const bType = getAuthorityType(b);

  if (aType === bType) return true;
  if (isCourtAuthority(aType) && isCourtAuthority(bType)) return true;
  if (isBIRAuthority(aType) && isBIRAuthority(bType)) return true;

  return false;
}

function buildSourceLabel(doc = {}) {
  const type = getAuthorityType(doc);
  const label = AUTHORITY_LABEL[type] || type || "Unknown Authority";

  return {
    source: getDocPath(doc) || getDocSource(doc) || "Unknown source",
    reference: getDocNormalizedReference(doc) || null,
    authorityType: type,
    authorityLabel: label,
    authorityLevel: getAuthorityLevel(doc),
    controllingPrecedence: getPrecedence(doc)
  };
}

function detectHoldingPolarity(doc = {}) {
  const text = lower(getDocText(doc));

  let taxable = 0;
  let notTaxable = 0;
  let allowed = 0;
  let disallowed = 0;
  let valid = 0;
  let invalid = 0;
  let hasJurisdiction = 0;
  let noJurisdiction = 0;

  const count = (regex) => (text.match(regex) || []).length;

  taxable += count(/\b(subject to tax|subject to vat|vatable|taxable|forms part of gross income|included in gross income)\b/gi);
  notTaxable += count(/\b(not subject to tax|not subject to vat|not vatable|non-taxable|tax exempt|vat-exempt|excluded from gross income|does not form part of gross income)\b/gi);

  allowed += count(/\b(allowed|deductible|claim granted|refund granted|entitled to refund|valid claim|may be claimed)\b/gi);
  disallowed += count(/\b(disallowed|non-deductible|not deductible|claim denied|refund denied|not entitled to refund|invalid claim|cannot be claimed)\b/gi);

  valid += count(/\b(valid|validly issued|valid assessment|valid notice|valid protest)\b/gi);
  invalid += count(/\b(invalid|null and void|void|void assessment|invalid notice|invalid protest)\b/gi);

  hasJurisdiction += count(/\b(has jurisdiction|within jurisdiction|cta has jurisdiction|court has jurisdiction)\b/gi);
  noJurisdiction += count(/\b(no jurisdiction|lack of jurisdiction|without jurisdiction|cta has no jurisdiction|court has no jurisdiction)\b/gi);

  const polarities = [];

  if (taxable > notTaxable && taxable > 0) polarities.push("TAXABLE_OR_SUBJECT");
  if (notTaxable > taxable && notTaxable > 0) polarities.push("NOT_TAXABLE_OR_EXEMPT");

  if (allowed > disallowed && allowed > 0) polarities.push("ALLOWED_OR_GRANTED");
  if (disallowed > allowed && disallowed > 0) polarities.push("DISALLOWED_OR_DENIED");

  if (valid > invalid && valid > 0) polarities.push("VALID");
  if (invalid > valid && invalid > 0) polarities.push("INVALID");

  if (hasJurisdiction > noJurisdiction && hasJurisdiction > 0) polarities.push("HAS_JURISDICTION");
  if (noJurisdiction > hasJurisdiction && noJurisdiction > 0) polarities.push("NO_JURISDICTION");

  return unique(polarities);
}

function areOppositeHoldings(a = {}, b = {}) {
  const aPolarity = detectHoldingPolarity(a);
  const bPolarity = detectHoldingPolarity(b);

  const oppositePairs = [
    ["TAXABLE_OR_SUBJECT", "NOT_TAXABLE_OR_EXEMPT"],
    ["ALLOWED_OR_GRANTED", "DISALLOWED_OR_DENIED"],
    ["VALID", "INVALID"],
    ["HAS_JURISDICTION", "NO_JURISDICTION"]
  ];

  for (const [left, right] of oppositePairs) {
    if (
      (aPolarity.includes(left) && bPolarity.includes(right)) ||
      (aPolarity.includes(right) && bPolarity.includes(left))
    ) {
      return true;
    }
  }

  return false;
}

function sameIssueGate(a = {}, b = {}) {
  const sameIssues = getSameIssues(a, b);
  const sameDimensions = getSameDimensions(a, b);
  const vatDoctrineMismatch = hasDifferentVatDoctrine(a, b);

  if (vatDoctrineMismatch) {
    return {
      passed: false,
      sameIssues,
      sameDimensions,
      distinctionType: "VAT liability doctrine distinguished from VAT refund/procedural doctrine.",
      reason: "Authorities mention VAT but resolve different VAT doctrines."
    };
  }

  if (!sameIssues.length) {
    return {
      passed: false,
      sameIssues,
      sameDimensions,
      distinctionType: "Different tax issue.",
      reason: "Authorities do not resolve the same legal issue."
    };
  }

  if (!sameDimensions.length) {
    return {
      passed: false,
      sameIssues,
      sameDimensions,
      distinctionType: "Same broad tax topic but different legal dimension.",
      reason:
        "Authorities may involve the same tax type but one may be substantive, procedural, evidentiary, jurisdictional, factual, contractual, or temporal."
    };
  }

  return {
    passed: true,
    sameIssues,
    sameDimensions,
    distinctionType: null,
    reason: "Authorities pass same-issue and same-dimension gate."
  };
}

function oppositeHoldingGate(a = {}, b = {}) {
  const aPolarity = detectHoldingPolarity(a);
  const bPolarity = detectHoldingPolarity(b);
  const passed = areOppositeHoldings(a, b);

  return {
    passed,
    sourceAHoldingPolarity: aPolarity,
    sourceBHoldingPolarity: bPolarity,
    reason: passed
      ? "Authorities contain opposite holding polarity on the same issue."
      : "No opposite holding polarity detected. Similar keywords do not establish doctrinal conflict."
  };
}

function isGenuineConflict(a = {}, b = {}) {
  if (!a || !b) return false;

  const aType = getAuthorityType(a);
  const bType = getAuthorityType(b);

  if (aType === "UNKNOWN" || bType === "UNKNOWN") return false;

  const sameIssue = sameIssueGate(a, b);
  if (!sameIssue.passed) return false;

  const oppositeHolding = oppositeHoldingGate(a, b);
  if (!oppositeHolding.passed) return false;

  return true;
}

function resolveCourtOverride(a = {}, b = {}) {
  const aType = getAuthorityType(a);
  const bType = getAuthorityType(b);

  const aCourt = isCourtAuthority(aType);
  const bCourt = isCourtAuthority(bType);
  const aBir = isBIRAuthority(aType);
  const bBir = isBIRAuthority(bType);

  if (aCourt && bBir) {
    return {
      overrideApplies: true,
      winningSource: a,
      overriddenSource: b,
      winningAuthority: aType,
      overriddenAuthority: bType,
      reason: "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue."
    };
  }

  if (bCourt && aBir) {
    return {
      overrideApplies: true,
      winningSource: b,
      overriddenSource: a,
      winningAuthority: bType,
      overriddenAuthority: aType,
      reason: "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue."
    };
  }

  const aPrecedence = getPrecedence(a);
  const bPrecedence = getPrecedence(b);

  if (aPrecedence < bPrecedence) {
    return {
      overrideApplies: false,
      winningSource: a,
      overriddenSource: b,
      winningAuthority: aType,
      overriddenAuthority: bType,
      reason: "Higher controlling authority prevails based on TINA authority hierarchy."
    };
  }

  if (bPrecedence < aPrecedence) {
    return {
      overrideApplies: false,
      winningSource: b,
      overriddenSource: a,
      winningAuthority: bType,
      overriddenAuthority: aType,
      reason: "Higher controlling authority prevails based on TINA authority hierarchy."
    };
  }

  return {
    overrideApplies: false,
    winningSource: null,
    overriddenSource: null,
    winningAuthority: null,
    overriddenAuthority: null,
    reason: "No hierarchy override determined."
  };
}

function analyzeConflictPair(a = {}, b = {}) {
  const aInfo = buildSourceLabel(a);
  const bInfo = buildSourceLabel(b);

  const sameIssue = sameIssueGate(a, b);
  const oppositeHolding = oppositeHoldingGate(a, b);

  const apparentConflict = hasIssueOverlap(a, b);
  const genuineConflict = sameIssue.passed && oppositeHolding.passed;
  const vatDoctrineMismatch = hasDifferentVatDoctrine(a, b);

  const hierarchyConflict = genuineConflict && getPrecedence(a) !== getPrecedence(b);
  const doctrinalConflict = genuineConflict && sameAuthorityFamily(a, b);

  let conflictType = CONFLICT_TYPE.NONE;
  let distinctionType = sameIssue.distinctionType || null;

  if (genuineConflict && hierarchyConflict && doctrinalConflict) {
    conflictType = CONFLICT_TYPE.MIXED;
  } else if (genuineConflict && hierarchyConflict) {
    conflictType = CONFLICT_TYPE.HIERARCHY;
  } else if (genuineConflict && doctrinalConflict) {
    conflictType = CONFLICT_TYPE.DOCTRINAL;
  } else if (apparentConflict && !sameIssue.passed) {
    conflictType = CONFLICT_TYPE.DISTINGUISHABLE;
  } else if (apparentConflict && sameIssue.passed && !oppositeHolding.passed) {
    conflictType = CONFLICT_TYPE.APPARENT;
    distinctionType = "Same issue, but no opposite holding detected.";
  }

  if (vatDoctrineMismatch) {
    conflictType = CONFLICT_TYPE.DISTINGUISHABLE;
    distinctionType = "VAT liability doctrine distinguished from VAT refund/procedural doctrine.";
  }

  const override = genuineConflict ? resolveCourtOverride(a, b) : null;

  return {
    conflict: genuineConflict,
    apparentConflict,
    doctrinalConflict,
    hierarchyConflict,
    conflictType,
    distinctionType,
    sameIssueGate: sameIssue,
    oppositeHoldingGate: oppositeHolding,
    exactIssue: sameIssue.sameIssues?.join(", ") || null,
    exactLegalDimension: sameIssue.sameDimensions?.join(", ") || null,
    sourceA: aInfo,
    sourceB: bInfo,
    winningSource: override?.winningSource || null,
    overriddenSource: override?.overriddenSource || null,
    resolutionBasis:
      override?.reason ||
      (vatDoctrineMismatch
        ? "No direct conflict. The authorities address different VAT doctrines."
        : !sameIssue.passed
          ? sameIssue.reason
          : !oppositeHolding.passed
            ? oppositeHolding.reason
            : "Same-issue opposite-holding conflict detected; hierarchy analysis is required."),
    reason:
      conflictType === CONFLICT_TYPE.NONE
        ? "No direct same-issue and opposite-holding conflict detected."
        : conflictType === CONFLICT_TYPE.DISTINGUISHABLE
          ? "Authorities are distinguishable because they do not resolve the same legal issue or legal dimension."
          : conflictType === CONFLICT_TYPE.APPARENT
            ? "Only apparent conflict detected because no opposite holding was found."
            : "A genuine same-issue opposite-holding conflict was detected."
  };
}

function detectHierarchyConflict(docs = []) {
  const list = Array.isArray(docs) ? docs.filter(Boolean) : [];

  if (list.length < 2) {
    return {
      conflict: false,
      apparentConflict: false,
      hierarchyConflict: false,
      doctrinalConflict: false,
      conflictType: CONFLICT_TYPE.NONE,
      reason: "Insufficient authorities for hierarchy conflict analysis."
    };
  }

  let firstApparent = null;

  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const review = analyzeConflictPair(list[i], list[j]);

      if (review?.conflict) {
        const override = resolveCourtOverride(list[i], list[j]);

        return {
          ...review,
          controllingAuthority: override?.winningAuthority || null,
          controllingSource: override?.winningSource || null,
          overriddenAuthority: override?.overriddenAuthority || null,
          overriddenSource: override?.overriddenSource || null,
          overrideApplied: Boolean(override?.overrideApplies)
        };
      }

      if (!firstApparent && review?.apparentConflict) {
        firstApparent = review;
      }
    }
  }

  if (firstApparent) {
    return {
      ...firstApparent,
      conflict: false,
      hierarchyConflict: false,
      doctrinalConflict: false,
      overrideApplied: false
    };
  }

  return {
    conflict: false,
    apparentConflict: false,
    hierarchyConflict: false,
    doctrinalConflict: false,
    conflictType: CONFLICT_TYPE.NONE,
    reason: "No direct hierarchy or doctrinal conflict detected."
  };
}

function conflictEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONFLICT_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    hierarchyConflictExport: true,
    strictSameIssueGate: true,
    oppositeHoldingGate: true,
    distinguishableAuthoritiesSupported: true
  };
}

export {
  ENGINE_VERSION,
  CONFLICT_TYPE,
  LEGAL_DIMENSION,
  issueSignals,
  legalDimensions,
  detectHoldingPolarity,
  sameIssueGate,
  oppositeHoldingGate,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  detectHierarchyConflict,
  conflictEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  CONFLICT_TYPE,
  LEGAL_DIMENSION,
  issueSignals,
  legalDimensions,
  detectHoldingPolarity,
  sameIssueGate,
  oppositeHoldingGate,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  detectHierarchyConflict,
  conflictEngineHealthCheck
};
