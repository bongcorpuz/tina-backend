// FILE: conflict-engine.js
"use strict";

/**
 * TINA Conflict Engine
 * Version: 2.4.0
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

const ENGINE_VERSION = "2.4.0";

const CONFLICT_TYPE = Object.freeze({
  NONE: "NO_CONFLICT",
  HIERARCHY: "HIERARCHY_CONFLICT",
  DOCTRINAL: "DOCTRINAL_CONFLICT",
  MIXED: "MIXED_HIERARCHY_AND_DOCTRINAL_CONFLICT",
  APPARENT: "APPARENT_CONFLICT_ONLY"
});

function safeString(value = "") {
  return String(value || "").trim();
}

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
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function issueSignals(doc = {}) {
  const text = lower(getDocText(doc));
  const signals = [];

  const add = (condition, value) => {
    if (condition) signals.push(value);
  };

  add(/\bvat refund|input vat refund|unutilized input vat|tcc|120\+30|judicial claim|administrative claim\b/i.test(text), "VAT_REFUND");
  add(/\bvat liability|output vat|vatable|gross receipts|sale of goods|sale of services|subject to vat\b/i.test(text), "VAT_LIABILITY");
  add(/\bwithholding|ewt|cwt|fwt\b/i.test(text), "WITHHOLDING");
  add(/\bincome tax|rcit|mcit|nolco|deductible|gross income|taxable income\b/i.test(text), "INCOME_TAX");
  add(/\binvoice|receipt|substantiation|documentary|evidence|proof\b/i.test(text), "EVIDENTIARY");
  add(/\bjurisdiction|deadline|prescription|protest|appeal|loa|pan|fan|fld\b/i.test(text), "PROCEDURAL");
  add(/\bcontract|agreement|lease|concession|clause\b/i.test(text), "CONTRACT");
  add(/\bprincipal|agent|pass-through|reimbursement|economic substance|substance over form\b/i.test(text), "TRANSACTION");

  return [...new Set(signals)];
}

function hasIssueOverlap(a = {}, b = {}) {
  const aSignals = issueSignals(a);
  const bSignals = issueSignals(b);

  if (!aSignals.length || !bSignals.length) return false;

  return aSignals.some((signal) => bSignals.includes(signal));
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

function isGenuineConflict(a = {}, b = {}) {
  if (!a || !b) return false;

  if (hasDifferentVatDoctrine(a, b)) {
    return false;
  }

  if (!hasIssueOverlap(a, b)) {
    return false;
  }

  const aType = getAuthorityType(a);
  const bType = getAuthorityType(b);

  if (aType === "UNKNOWN" || bType === "UNKNOWN") {
    return false;
  }

  const aText = lower(getDocText(a));
  const bText = lower(getDocText(b));

  const contradictionWords = [
    "shall not",
    "not subject",
    "exempt",
    "taxable",
    "subject to",
    "disallowed",
    "allowed",
    "deductible",
    "non-deductible",
    "invalid",
    "valid"
  ];

  const hasContradictoryLanguage =
    contradictionWords.some((word) => aText.includes(word)) &&
    contradictionWords.some((word) => bText.includes(word));

  if (!hasContradictoryLanguage) {
    return false;
  }

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
      reason: "Court doctrine prevails over a conflicting BIR administrative issuance on the same issue."
    };
  }

  if (bCourt && aBir) {
    return {
      overrideApplies: true,
      winningSource: b,
      overriddenSource: a,
      winningAuthority: bType,
      overriddenAuthority: aType,
      reason: "Court doctrine prevails over a conflicting BIR administrative issuance on the same issue."
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

  const apparentConflict = hasIssueOverlap(a, b);
  const genuineConflict = isGenuineConflict(a, b);
  const vatDoctrineMismatch = hasDifferentVatDoctrine(a, b);
  const hierarchyConflict =
    genuineConflict && getPrecedence(a) !== getPrecedence(b);

  const doctrinalConflict =
    genuineConflict && sameAuthorityFamily(a, b);

  let conflictType = CONFLICT_TYPE.NONE;
  let distinctionType = null;

  if (vatDoctrineMismatch) {
    conflictType = CONFLICT_TYPE.APPARENT;
    distinctionType = "VAT liability doctrine distinguished from VAT refund/procedural doctrine.";
  } else if (hierarchyConflict && doctrinalConflict) {
    conflictType = CONFLICT_TYPE.MIXED;
  } else if (hierarchyConflict) {
    conflictType = CONFLICT_TYPE.HIERARCHY;
  } else if (doctrinalConflict) {
    conflictType = CONFLICT_TYPE.DOCTRINAL;
  } else if (apparentConflict) {
    conflictType = CONFLICT_TYPE.APPARENT;
  }

  const override = genuineConflict ? resolveCourtOverride(a, b) : null;

  return {
    conflict: genuineConflict,
    apparentConflict,
    doctrinalConflict,
    hierarchyConflict,
    conflictType,
    distinctionType,
    exactIssue: issueSignals(a).filter((signal) => issueSignals(b).includes(signal)).join(", ") || null,
    sourceA: aInfo,
    sourceB: bInfo,
    winningSource: override?.winningSource || null,
    overriddenSource: override?.overriddenSource || null,
    resolutionBasis:
      override?.reason ||
      (vatDoctrineMismatch
        ? "No direct conflict. The authorities address different VAT doctrines."
        : apparentConflict
          ? "Apparent conflict only; verify whether the authorities address the same legal issue."
          : "No conflict detected."),
    reason:
      conflictType === CONFLICT_TYPE.NONE
        ? "No direct same-issue conflict detected."
        : conflictType === CONFLICT_TYPE.APPARENT
          ? "Only an apparent conflict was detected because the authorities may address different doctrinal dimensions."
          : "A potential same-issue conflict was detected and hierarchy analysis is required."
  };
}

function conflictEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CONFLICT_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true
  };
}

export {
  ENGINE_VERSION,
  CONFLICT_TYPE,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  conflictEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  CONFLICT_TYPE,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  conflictEngineHealthCheck
};
