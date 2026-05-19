// FILE: conflict-engine.js
"use strict";

/**
 * TINA Conflict Engine
 * Version: 3.1.0
 *
 * Strict conflict validator only.
 *
 * Purpose:
 * - Detect true legal conflicts only.
 * - Require SAME-ISSUE gate.
 * - Require SAME-LEGAL-DIMENSION gate.
 * - Require OPPOSITE-HOLDING gate.
 * - Treat different legal dimensions as distinguishable, not conflicting.
 * - Apply Master Prompt hierarchy where court doctrine overrides conflicting BIR issuances.
 *
 * This file must NOT:
 * - retrieve sources,
 * - call OpenAI,
 * - render final answers,
 * - fabricate conflicts,
 * - fabricate authorities.
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

const ENGINE_VERSION = "3.1.0";

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

/**
 * Master Prompt hierarchy:
 * 1 Constitution
 * 2 NIRC / CMTA / LGC / primary statutes
 * 3 Tax Treaties
 * 4 Supreme Court En Banc
 * 5 Supreme Court Division
 * 6 CTA En Banc
 * 7 CTA Division
 * 8 Revenue Regulations
 * 9 RMC / RMO / RAMO
 * 10 BIR Rulings
 * 11 LGU / BOC issuances
 * 12 PFRS / PAS / PSA
 * 13 OECD / foreign persuasive authorities
 * 14 CPA reviewer notes / secondary materials
 */
const MASTER_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,

  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
});

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    STATUTES: "STATUTE",
    STATUTE: "STATUTE",
    LAW: "STATUTE",
    LAWS: "STATUTE",
    NIRC: "NIRC",
    TAX_CODE: "TAX_CODE",
    CMTA: "CMTA",
    LGC: "LGC",
    REPUBLIC_ACT: "REPUBLIC_ACT",
    RA: "REPUBLIC_ACT",

    TAX_TREATY: "TAX_TREATY",
    TREATY: "TAX_TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    CTA: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU: "LGU",
    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",

    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN: "FOREIGN_AUTHORITY",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    CPA_NOTES: "CPA_NOTES",
    REVIEW_MATERIALS: "REVIEW_MATERIALS",
    SECONDARY: "SECONDARY",

    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
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

function issueSignals(doc = {}) {
  const text = lower(getDocText(doc));
  const signals = [];

  const add = (condition, value) => {
    if (condition) signals.push(value);
  };

  add(/\b(vat refund|input vat refund|unutilized input vat|excess input vat|tcc|claim for refund|120\+30|judicial claim|administrative claim)\b/i.test(text), "VAT_REFUND");
  add(/\b(vat liability|output vat|vatable|gross receipts|sale of goods|sale of services|subject to vat|value-added tax|value added tax)\b/i.test(text), "VAT_LIABILITY");
  add(/\b(zero-rated|zero rated|zero rating|export sales)\b/i.test(text), "VAT_ZERO_RATING");
  add(/\b(vat exempt|vat-exempt|exemption|tax exempt)\b/i.test(text), "EXEMPTION");
  add(/\b(withholding|expanded withholding|ewt|cwt|fwt|withholding tax)\b/i.test(text), "WITHHOLDING");
  add(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|gross income|taxable income)\b/i.test(text), "INCOME_TAX");
  add(/\b(invoice|receipt|substantiation|documentary|evidence|proof|burden of proof|supporting document)\b/i.test(text), "EVIDENTIARY");
  add(/\b(jurisdiction|deadline|prescription|protest|appeal|loa|pan|fan|fld|fdda|assessment|remedy)\b/i.test(text), "PROCEDURAL");
  add(/\b(contract|agreement|lease|concession|clause)\b/i.test(text), "CONTRACT");
  add(/\b(principal|agent|pass-through|pass through|reimbursement|reimbursable|economic substance|substance over form)\b/i.test(text), "TRANSACTION");
  add(/\b(mutuality|association dues|condominium dues|homeowners association)\b/i.test(text), "MUTUALITY");

  return unique(signals);
}

function legalDimensions(doc = {}) {
  const text = lower(getDocText(doc));
  const dimensions = [];

  const add = (condition, value) => {
    if (condition) dimensions.push(value);
  };

  add(/\b(taxable|liable|subject to|exempt|zero-rated|zero rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(text), LEGAL_DIMENSION.SUBSTANTIVE);
  add(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|fdda|return|remedy|protest|prescription)\b/i.test(text), LEGAL_DIMENSION.PROCEDURAL);
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

  if (
    aDimensions.includes(LEGAL_DIMENSION.GENERAL) ||
    bDimensions.includes(LEGAL_DIMENSION.GENERAL)
  ) {
    return [];
  }

  return aDimensions.filter((dimension) => bDimensions.includes(dimension));
}

function hasDifferentVatDoctrine(a = {}, b = {}) {
  const aSignals = issueSignals(a);
  const bSignals = issueSignals(b);

  return (
    (aSignals.includes("VAT_REFUND") && bSignals.includes("VAT_LIABILITY")) ||
    (aSignals.includes("VAT_LIABILITY") && bSignals.includes("VAT_REFUND")) ||
    (aSignals.includes("VAT_REFUND") && bSignals.includes("VAT_ZERO_RATING")) ||
    (aSignals.includes("VAT_ZERO_RATING") && bSignals.includes("VAT_REFUND"))
  );
}

function getAuthorityType(doc = {}) {
  return normalizeAuthorityType(getAuthorityTypeForDoc(doc) || doc.authorityType || doc.authority_type || "UNKNOWN");
}

function getAuthorityLevel(doc = {}) {
  const explicit = Number(
    doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) return explicit;

  return Number(getAuthorityLevelForDoc(doc) || MASTER_PRECEDENCE[getAuthorityType(doc)] || 99);
}

function getPrecedence(doc = {}) {
  const explicit = Number(
    doc.controllingPrecedence ||
      doc.controlling_precedence ||
      doc.metadata?.controllingPrecedence ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) return explicit;

  return Number(getControllingPrecedenceForDoc(doc) || MASTER_PRECEDENCE[getAuthorityType(doc)] || 99);
}

function isCourtAuthority(type = "") {
  const normalized = normalizeAuthorityType(type);
  return (
    COURT_TYPES.has(normalized) ||
    [
      "SUPREME_COURT_EN_BANC",
      "SUPREME_COURT",
      "CTA_EN_BANC",
      "CTA_DIVISION",
      "COURT_OF_APPEALS"
    ].includes(normalized)
  );
}

function isBIRAuthority(type = "") {
  const normalized = normalizeAuthorityType(type);
  return (
    BIR_TYPES.has(normalized) ||
    ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(normalized)
  );
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

  taxable += count(/\b(subject to tax|subject to vat|vatable|taxable|forms part of gross income|included in gross income|liable for tax)\b/gi);
  notTaxable += count(/\b(not subject to tax|not subject to vat|not vatable|non-taxable|tax exempt|vat-exempt|excluded from gross income|does not form part of gross income|not liable for tax)\b/gi);

  allowed += count(/\b(allowed|deductible|claim granted|refund granted|entitled to refund|valid claim|may be claimed|may be deducted)\b/gi);
  disallowed += count(/\b(disallowed|non-deductible|not deductible|claim denied|refund denied|not entitled to refund|invalid claim|cannot be claimed|cannot be deducted)\b/gi);

  valid += count(/\b(valid|validly issued|valid assessment|valid notice|valid protest|valid waiver)\b/gi);
  invalid += count(/\b(invalid|null and void|void|void assessment|invalid notice|invalid protest|invalid waiver)\b/gi);

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
      sameExactIssue: false,
      sameLegalDimension: false,
      distinctionType: "VAT liability doctrine distinguished from VAT refund/procedural doctrine.",
      reason: "Authorities mention VAT but resolve different VAT doctrines."
    };
  }

  if (!sameIssues.length) {
    return {
      passed: false,
      sameIssues,
      sameDimensions,
      sameExactIssue: false,
      sameLegalDimension: sameDimensions.length > 0,
      distinctionType: "Different tax issue.",
      reason: "Authorities do not resolve the same legal issue."
    };
  }

  if (!sameDimensions.length) {
    return {
      passed: false,
      sameIssues,
      sameDimensions,
      sameExactIssue: true,
      sameLegalDimension: false,
      distinctionType: "Same broad tax topic but different legal dimension.",
      reason:
        "Authorities may involve the same tax type but one may be substantive, procedural, evidentiary, jurisdictional, factual, contractual, or temporal."
    };
  }

  return {
    passed: true,
    sameIssues,
    sameDimensions,
    sameExactIssue: true,
    sameLegalDimension: true,
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
    oppositeHoldingOrRule: passed,
    sourceAHoldingPolarity: aPolarity,
    sourceBHoldingPolarity: bPolarity,
    reason: passed
      ? "Authorities contain opposite holding polarity on the same issue."
      : "No opposite holding polarity detected. Similar keywords do not establish doctrinal conflict."
  };
}

// LAW 4 — FOUR-PART DOCTRINE TEST
// trueConflict = true ONLY when ALL FOUR are satisfied:
//   (1) Same legal issue       → sameIssueGate
//   (2) Same material facts    → sameStatuteOrFactGate (unknown = pass-through)
//   (3) Same statute           → sameStatuteOrFactGate
//   (4) Opposite holding       → oppositeHoldingGate
// Semantic divergence alone is NOT a conflict. Remove any such detection.

function extractStatuteRef(doc = {}) {
  return lower(
    doc.statute ||
    doc.primaryStatute ||
    doc.normalizedReference ||
    doc.citation ||
    doc.source ||
    ""
  ).replace(/\s+/g, " ").trim();
}

function sameStatuteGate(a = {}, b = {}) {
  const aS = extractStatuteRef(a);
  const bS = extractStatuteRef(b);
  if (!aS || !bS) {
    return { passed: null, reason: "Statute reference unknown — gate passed by benefit of doubt." };
  }
  const same = aS === bS || aS.includes(bS) || bS.includes(aS);
  return {
    passed: same,
    aStatute: aS,
    bStatute: bS,
    reason: same
      ? "Both authorities cite the same statute."
      : "Authorities cite different statutes — not a true conflict, merely different rules."
  };
}

function isGenuineConflict(a = {}, b = {}) {
  if (!a || !b) return false;

  const aType = getAuthorityType(a);
  const bType = getAuthorityType(b);

  if (aType === "UNKNOWN" || bType === "UNKNOWN") return false;

  // Part 1: Same legal issue
  const sameIssue = sameIssueGate(a, b);
  if (!sameIssue.passed) return false;

  // Part 3: Same statute (null = unknown = pass-through)
  const sameStatute = sameStatuteGate(a, b);
  if (sameStatute.passed === false) return false;

  // Part 4: Opposite holding
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
      hierarchyAnalysis:
        "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue.",
      conflictResolutionBasis:
        "A BIR issuance cannot override Supreme Court or CTA doctrine within the court decision's proper issue scope.",
      reason:
        "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue."
    };
  }

  if (bCourt && aBir) {
    return {
      overrideApplies: true,
      winningSource: b,
      overriddenSource: a,
      winningAuthority: bType,
      overriddenAuthority: aType,
      hierarchyAnalysis:
        "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue.",
      conflictResolutionBasis:
        "A BIR issuance cannot override Supreme Court or CTA doctrine within the court decision's proper issue scope.",
      reason:
        "Court doctrine prevails over a conflicting BIR administrative issuance on the same exact issue."
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
      hierarchyAnalysis: "Higher controlling authority prevails based on TINA authority hierarchy.",
      conflictResolutionBasis:
        "Apply the authority with the lower controlling-precedence number under the Master Prompt hierarchy.",
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
      hierarchyAnalysis: "Higher controlling authority prevails based on TINA authority hierarchy.",
      conflictResolutionBasis:
        "Apply the authority with the lower controlling-precedence number under the Master Prompt hierarchy.",
      reason: "Higher controlling authority prevails based on TINA authority hierarchy."
    };
  }

  return {
    overrideApplies: false,
    winningSource: null,
    overriddenSource: null,
    winningAuthority: null,
    overriddenAuthority: null,
    hierarchyAnalysis: "No hierarchy override determined because authorities appear to have the same precedence.",
    conflictResolutionBasis:
      "If same-precedence authorities conflict, analyze later controlling doctrine, en banc status, finality, and factual applicability.",
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

  const resolutionBasis =
    override?.reason ||
    (vatDoctrineMismatch
      ? "No direct conflict. The authorities address different VAT doctrines."
      : !sameIssue.passed
        ? sameIssue.reason
        : !oppositeHolding.passed
          ? oppositeHolding.reason
          : "Same-issue opposite-holding conflict detected; hierarchy analysis is required.");

  return {
    conflict: genuineConflict,
    apparentConflict,
    doctrinalConflict,
    hierarchyConflict,
    conflictType,
    distinctionType,

    sameIssueGate: sameIssue,
    oppositeHoldingGate: oppositeHolding,

    sameExactIssue: sameIssue.sameExactIssue === true,
    sameLegalDimension: sameIssue.sameLegalDimension === true,
    oppositeHoldingOrRule: oppositeHolding.oppositeHoldingOrRule === true,

    exactIssue: sameIssue.sameIssues?.join(", ") || null,
    exactLegalDimension: sameIssue.sameDimensions?.join(", ") || null,

    sourceA: aInfo,
    sourceB: bInfo,

    source_a_title: aInfo.source,
    source_b_title: bInfo.source,

    winningSource: override?.winningSource || null,
    overriddenSource: override?.overriddenSource || null,
    winningAuthority: override?.winningAuthority || null,
    overriddenAuthority: override?.overriddenAuthority || null,

    controllingAuthority: override?.winningAuthority || null,
    controllingSource: override?.winningSource || null,

    hierarchyAnalysis:
      override?.hierarchyAnalysis ||
      (genuineConflict
        ? "Hierarchy analysis required under the Master Prompt authority order."
        : "No hierarchy conflict established because the same-issue opposite-holding gates did not both pass."),

    conflictResolutionBasis:
      override?.conflictResolutionBasis ||
      resolutionBasis,

    resolutionBasis,
    reason:
      conflictType === CONFLICT_TYPE.NONE
        ? "No direct same-issue and opposite-holding conflict detected."
        : conflictType === CONFLICT_TYPE.DISTINGUISHABLE
          ? "Authorities are distinguishable because they do not resolve the same legal issue or legal dimension."
          : conflictType === CONFLICT_TYPE.APPARENT
            ? "Only apparent conflict detected because no opposite holding was found."
            : "A genuine same-issue opposite-holding conflict was detected.",

    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    birIssuanceCannotOverrideCourtDoctrine: true,
    conflictLabelMayBeDisplayed: genuineConflict === true
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
      sameExactIssue: false,
      sameLegalDimension: false,
      oppositeHoldingOrRule: false,
      hierarchyAnalysis: "Insufficient authorities for hierarchy conflict analysis.",
      conflictResolutionBasis: "At least two authorities are required to detect a legal conflict.",
      reason: "Insufficient authorities for hierarchy conflict analysis.",
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true
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
          controllingAuthority: override?.winningAuthority || review.controllingAuthority || null,
          controllingSource: override?.winningSource || review.controllingSource || null,
          overriddenAuthority: override?.overriddenAuthority || review.overriddenAuthority || null,
          overriddenSource: override?.overriddenSource || review.overriddenSource || null,
          overrideApplied: Boolean(override?.overrideApplies),
          hierarchyAnalysis: override?.hierarchyAnalysis || review.hierarchyAnalysis,
          conflictResolutionBasis: override?.conflictResolutionBasis || review.conflictResolutionBasis,
          masterPromptAuthorityHierarchyApplied: true,
          courtAuthorityNotSubordinatedToBIRIssuances: true,
          birIssuanceCannotOverrideCourtDoctrine: true,
          conflictLabelMayBeDisplayed: true
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
      overrideApplied: false,
      sameExactIssue: firstApparent.sameExactIssue === true,
      sameLegalDimension: firstApparent.sameLegalDimension === true,
      oppositeHoldingOrRule: false,
      hierarchyAnalysis:
        "No hierarchy override applies because no complete same-issue opposite-holding conflict was established.",
      conflictResolutionBasis:
        firstApparent.distinctionType ||
        firstApparent.reason ||
        "Authorities are apparent or distinguishable, not directly conflicting.",
      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      conflictLabelMayBeDisplayed: false
    };
  }

  return {
    conflict: false,
    apparentConflict: false,
    hierarchyConflict: false,
    doctrinalConflict: false,
    conflictType: CONFLICT_TYPE.NONE,
    sameExactIssue: false,
    sameLegalDimension: false,
    oppositeHoldingOrRule: false,
    hierarchyAnalysis: "No direct hierarchy or doctrinal conflict detected.",
    conflictResolutionBasis:
      "No same-issue, same-dimension, opposite-holding conflict was detected from indexed sources.",
    reason: "No direct hierarchy or doctrinal conflict detected.",
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    conflictLabelMayBeDisplayed: false
  };
}

function buildConflictSummary(conflict = null) {
  if (!conflict || conflict.conflict !== true) {
    return {
      conflictDetected: false,
      summary: "No direct doctrinal conflict detected from indexed sources.",
      conflictLabelMayBeDisplayed: false
    };
  }

  return {
    conflictDetected: true,
    conflictType: conflict.conflictType,
    exactIssue: conflict.exactIssue,
    exactLegalDimension: conflict.exactLegalDimension,
    controllingAuthority: conflict.controllingAuthority || conflict.winningAuthority || null,
    overriddenAuthority: conflict.overriddenAuthority || null,
    hierarchyAnalysis: conflict.hierarchyAnalysis,
    conflictResolutionBasis: conflict.conflictResolutionBasis,
    conflictLabelMayBeDisplayed:
      conflict.sameExactIssue === true &&
      conflict.sameLegalDimension === true &&
      conflict.oppositeHoldingOrRule === true &&
      Boolean(conflict.hierarchyAnalysis) &&
      Boolean(conflict.conflictResolutionBasis)
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
    strictSameLegalDimensionGate: true,
    oppositeHoldingGate: true,
    distinguishableAuthoritiesSupported: true,
    vatDoctrineMismatchGuard: true,
    finalAnswerComplianceCompatible: true,
    sourceVisibilityCompatible: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    birIssuanceCannotOverrideCourtDoctrine: true,
    noRetrieval: true,
    noOpenAI: true,
    noRendering: true
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
  sameStatuteGate,
  oppositeHoldingGate,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  detectHierarchyConflict,
  buildConflictSummary,
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
  sameStatuteGate,
  oppositeHoldingGate,
  isGenuineConflict,
  resolveCourtOverride,
  analyzeConflictPair,
  detectHierarchyConflict,
  buildConflictSummary,
  conflictEngineHealthCheck
};
