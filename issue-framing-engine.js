// FILE: issue-framing-engine.js
"use strict";

/**
 * PATCH-07B-008 narrow issue-framing helper.
 *
 * Boundary:
 * - Classifies issue family and tax type only.
 * - Preserves user fact gaps separately from source coverage needs.
 * - Does not produce BIR/taxpayer positions, risk scores, settlement advice,
 *   legal conclusions, authority hierarchy, supersession, or effective-date logic.
 */

import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";

export const ISSUE_FRAMING_ENGINE_VERSION = "07B-008.1";

export const ISSUE_FAMILIES = Object.freeze({
  WITHHOLDING_EWT: "WITHHOLDING_EWT",
  VAT_ZERO_RATING: "VAT_ZERO_RATING",
  NOLCO: "NOLCO",
  DEDUCTIBILITY_SUBSTANTIATION: "DEDUCTIBILITY_SUBSTANTIATION",
  CWT_FORM_2307: "CWT_FORM_2307",
  BIR_AUDIT_PROCEDURE: "BIR_AUDIT_PROCEDURE",
  INPUT_VAT_INVOICE_MISMATCH: "INPUT_VAT_INVOICE_MISMATCH",
  REIMBURSABLE_PASS_THROUGH: "REIMBURSABLE_PASS_THROUGH",
  GENERAL_TAX_ORIENTATION: "GENERAL_TAX_ORIENTATION",
  UNKNOWN_NEEDS_MORE_FACTS: "UNKNOWN_NEEDS_MORE_FACTS"
});

export const TAX_TYPES = Object.freeze({
  INCOME_TAX: "INCOME_TAX",
  WITHHOLDING_TAX: "WITHHOLDING_TAX",
  VAT: "VAT",
  CWT: "CWT",
  BIR_AUDIT_PROCEDURE: "BIR_AUDIT_PROCEDURE",
  GENERAL_TAX: "GENERAL_TAX",
  UNKNOWN: "UNKNOWN"
});

const DEFAULT_MODE = "/ask";

const ISSUE_RULES = Object.freeze([
  {
    family: ISSUE_FAMILIES.INPUT_VAT_INVOICE_MISMATCH,
    taxType: TAX_TYPES.VAT,
    pattern: /\b(input\s+vat|input\s+tax)\b.*\b(invoice|receipt|mismatch|substantiation|disallow|disallowed)\b|\b(invoice|receipt)\b.*\b(input\s+vat|input\s+tax)\b/i,
    statement: "Frame whether input VAT can be supported by matching invoices, receipts, returns, and authority."
  },
  {
    family: ISSUE_FAMILIES.VAT_ZERO_RATING,
    taxType: TAX_TYPES.VAT,
    pattern: /\b(vat|zero[-\s]?rated|zero[-\s]?rating|peza|export)\b.*\b(zero[-\s]?rated|zero[-\s]?rating|peza|export|vat)\b/i,
    statement: "Frame whether VAT zero-rating applies based on transaction facts, documents, period, and source support."
  },
  {
    family: ISSUE_FAMILIES.CWT_FORM_2307,
    taxType: TAX_TYPES.CWT,
    pattern: /\b(cwt|creditable\s+withholding|form\s*2307|2307)\b/i,
    statement: "Frame whether CWT/Form 2307 support matches the claimed withholding credit or assessment issue."
  },
  {
    family: ISSUE_FAMILIES.WITHHOLDING_EWT,
    taxType: TAX_TYPES.WITHHOLDING_TAX,
    pattern: /\b(ewt|expanded\s+withholding|withholding\s+tax|withheld|withhold|withholding)\b/i,
    statement: "Frame the withholding tax issue around payment type, parties, period, compliance, and source support."
  },
  {
    family: ISSUE_FAMILIES.NOLCO,
    taxType: TAX_TYPES.INCOME_TAX,
    pattern: /\b(nolco|net\s+operating\s+loss|operating\s+loss\s+carry|loss\s+carryover|carryover)\b/i,
    statement: "Frame whether NOLCO may be claimed based on loss year, claim year, ownership continuity, and authority."
  },
  {
    family: ISSUE_FAMILIES.DEDUCTIBILITY_SUBSTANTIATION,
    taxType: TAX_TYPES.INCOME_TAX,
    pattern: /\b(deduct|deducted|deductible|deduction|expense|substantiation|substantiated|ordinary\s+and\s+necessary)\b/i,
    statement: "Frame deductibility around business purpose, substantiation, withholding compliance, period, and authority."
  },
  {
    family: ISSUE_FAMILIES.BIR_AUDIT_PROCEDURE,
    taxType: TAX_TYPES.BIR_AUDIT_PROCEDURE,
    pattern: /\b(loa|letter\s+of\s+authority|pan|preliminary\s+assessment|fan|final\s+assessment|flD|assessment|protest|audit)\b/i,
    statement: "Frame the BIR audit procedure issue around notice stage, deadlines, documents, amounts, and authority."
  },
  {
    family: ISSUE_FAMILIES.REIMBURSABLE_PASS_THROUGH,
    taxType: TAX_TYPES.GENERAL_TAX,
    pattern: /\b(reimbursable|reimbursement|pass[-\s]?through|gross\s+(receipts|sales)|agency|principal)\b/i,
    statement: "Frame whether reimbursed or pass-through amounts are receipts or costs based on contract and billing facts."
  },
  {
    family: ISSUE_FAMILIES.GENERAL_TAX_ORIENTATION,
    taxType: TAX_TYPES.GENERAL_TAX,
    pattern: /\b(tax|bir|revenue|nirc|regulation|authority)\b/i,
    statement: "Frame as general tax orientation until a specific issue, facts, and authority need are identified."
  }
]);

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
}

function normalizeMode(mode) {
  return ["/ask", "/tax", "/audit"].includes(mode) ? mode : DEFAULT_MODE;
}

function classifyIssue(query) {
  const text = safeString(query);
  for (const rule of ISSUE_RULES) {
    if (rule.pattern.test(text)) return rule;
  }

  return {
    family: ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS,
    taxType: TAX_TYPES.UNKNOWN,
    statement: "Frame as an unknown tax issue requiring more facts before any legal or audit conclusion."
  };
}

function defaultMissingFacts(issueFamily) {
  const shared = ["taxpayer type", "tax period", "material documents"];
  const byIssue = {
    [ISSUE_FAMILIES.WITHHOLDING_EWT]: ["payment type", "payor/payee status", "withholding/remittance details"],
    [ISSUE_FAMILIES.VAT_ZERO_RATING]: ["seller VAT registration", "buyer/export or PEZA status", "invoice details"],
    [ISSUE_FAMILIES.NOLCO]: ["loss year", "claim year", "ownership or business continuity facts"],
    [ISSUE_FAMILIES.DEDUCTIBILITY_SUBSTANTIATION]: ["expense type", "business purpose", "supporting documents"],
    [ISSUE_FAMILIES.CWT_FORM_2307]: ["Form 2307 details", "related income/payment record", "return where credit was claimed"],
    [ISSUE_FAMILIES.BIR_AUDIT_PROCEDURE]: ["assessment stage", "notice dates", "amounts and protest deadline"],
    [ISSUE_FAMILIES.INPUT_VAT_INVOICE_MISMATCH]: ["invoice/receipt details", "return schedule", "supplier and period match"],
    [ISSUE_FAMILIES.REIMBURSABLE_PASS_THROUGH]: ["contract terms", "agency/principal role", "markup and billing method"],
    [ISSUE_FAMILIES.GENERAL_TAX_ORIENTATION]: ["specific transaction", "tax type", "requested authority scope"],
    [ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS]: ["specific tax issue", "transaction facts", "requested output"]
  };

  return [...shared, ...(byIssue[issueFamily] || [])];
}

function defaultSourceNeeds(issueFamily, authorityState) {
  const needs = {
    [ISSUE_FAMILIES.WITHHOLDING_EWT]: ["indexed NIRC/RR withholding authority for the payment type"],
    [ISSUE_FAMILIES.VAT_ZERO_RATING]: ["indexed VAT zero-rating authority and effective-period support"],
    [ISSUE_FAMILIES.NOLCO]: ["indexed NOLCO authority and currentness metadata if period-sensitive"],
    [ISSUE_FAMILIES.DEDUCTIBILITY_SUBSTANTIATION]: ["indexed deductibility and substantiation authority"],
    [ISSUE_FAMILIES.CWT_FORM_2307]: ["indexed CWT/Form 2307 authority for credit support"],
    [ISSUE_FAMILIES.BIR_AUDIT_PROCEDURE]: ["indexed procedural authority for the exact assessment stage"],
    [ISSUE_FAMILIES.INPUT_VAT_INVOICE_MISMATCH]: ["indexed input VAT substantiation and invoicing authority"],
    [ISSUE_FAMILIES.REIMBURSABLE_PASS_THROUGH]: ["indexed authority on reimbursement/pass-through treatment"],
    [ISSUE_FAMILIES.GENERAL_TAX_ORIENTATION]: ["specific indexed authority after issue is narrowed"],
    [ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS]: ["indexed authority after issue and facts are clarified"]
  };
  const result = [...(needs[issueFamily] || [])];
  if (authorityState === "NO_INDEXED_SOURCE") result.push("indexed source coverage before legal support can be claimed");
  if (authorityState === "RELATED_AUTHORITY_ONLY") result.push("direct governing authority before controlling support can be claimed");
  return result;
}

export function frameTaxIssue(input = {}) {
  const query = safeString(input.query);
  const mode = normalizeMode(input.mode);
  const authorityState = safeString(input.authorityState || input.sourceAvailabilityState || "GENERAL_TAX") || "GENERAL_TAX";
  const sourceAvailabilityState = safeString(input.sourceAvailabilityState || authorityState) || authorityState;
  const rule = classifyIssue(query);
  const knownFacts = safeArray(input.knownFacts);
  const missingFacts = safeArray(input.missingUserFacts);
  const sourceCoverageNeeds = safeArray(input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds);
  const safety = applyReasoningSafetyPolicy({
    mode,
    authorityState,
    sourceAvailabilityState,
    missingUserFacts: missingFacts,
    authorityOrSourceCoverageNeeds: sourceCoverageNeeds,
    requestedOutput: query
  });

  return {
    issueFamily: rule.family,
    taxType: rule.taxType,
    issueStatement: rule.statement,
    knownFacts,
    missingFacts: missingFacts.length > 0 ? missingFacts : defaultMissingFacts(rule.family),
    sourceCoverageNeeds: sourceCoverageNeeds.length > 0 ? sourceCoverageNeeds : defaultSourceNeeds(rule.family, sourceAvailabilityState),
    reasoningPosture: safety.safetyPosture,
    prohibitedConclusion: [...safety.prohibitedBehaviors],
    modeBoundary: safety.modeBoundary,
    sourceStateCaution: safety.sourceStateCaution,
    implementationScope: "ISSUE_FRAMING_ONLY"
  };
}

export default {
  frameTaxIssue,
  ISSUE_FAMILIES,
  TAX_TYPES
};
