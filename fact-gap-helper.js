// FILE: fact-gap-helper.js
"use strict";

/**
 * PATCH-07B-009 narrow fact-gap helper.
 *
 * Boundary:
 * - Identifies missing user facts and document/checklist needs only.
 * - Preserves authority/source coverage needs separately.
 * - Does not produce legal conclusions, BIR/taxpayer positions, risk scoring,
 *   settlement/protest strategy, authority hierarchy, supersession, or effective-date logic.
 */

import { frameTaxIssue, ISSUE_FAMILIES, TAX_TYPES } from "./issue-framing-engine.js";
import { applyReasoningSafetyPolicy } from "./reasoning-safety-policy.js";

export const FACT_GAP_HELPER_VERSION = "07B-009.1";

const ISSUE_FACT_MAP = Object.freeze({
  [ISSUE_FAMILIES.WITHHOLDING_EWT]: {
    critical: ["taxpayer status", "payor/payee relationship", "nature of income/payment", "amount and payment date", "tax period"],
    helpful: ["withholding rate claimed"],
    documents: ["BIR form/return filed", "proof of withholding/remittance"],
    timing: ["amount and payment date", "tax period"],
    taxpayer: ["taxpayer status", "payor/payee relationship"],
    transaction: ["nature of income/payment"],
    assessment: []
  },
  [ISSUE_FAMILIES.VAT_ZERO_RATING]: {
    critical: ["taxpayer VAT registration", "buyer/customer status", "nature of sale/service", "transaction date/taxable period"],
    helpful: ["PEZA/export status if relevant", "zero-rating basis", "proof of foreign currency inward remittance if applicable"],
    documents: ["sales invoice/supporting documents"],
    timing: ["transaction date/taxable period"],
    taxpayer: ["taxpayer VAT registration", "buyer/customer status"],
    transaction: ["PEZA/export status if relevant", "nature of sale/service", "zero-rating basis"],
    assessment: []
  },
  [ISSUE_FAMILIES.NOLCO]: {
    critical: ["taxable year of loss", "year of intended deduction", "taxpayer type", "whether subject to regular corporate income tax"],
    helpful: ["whether substantial change in ownership occurred", "whether NOLCO was previously used", "MCIT interaction if relevant"],
    documents: ["ITR/AFS support"],
    timing: ["taxable year of loss", "year of intended deduction"],
    taxpayer: ["taxpayer type", "whether subject to regular corporate income tax", "whether substantial change in ownership occurred"],
    transaction: ["whether NOLCO was previously used", "MCIT interaction if relevant"],
    assessment: []
  },
  [ISSUE_FAMILIES.DEDUCTIBILITY_SUBSTANTIATION]: {
    critical: ["nature of expense", "business connection", "amount", "payee", "tax period"],
    helpful: ["withholding compliance if applicable"],
    documents: ["official receipts/invoices", "board/contract/supporting documents if relevant"],
    timing: ["tax period"],
    taxpayer: ["payee"],
    transaction: ["nature of expense", "business connection", "amount"],
    assessment: []
  },
  [ISSUE_FAMILIES.CWT_FORM_2307]: {
    critical: ["income type", "customer/payor", "amount of income", "amount of CWT", "taxable period"],
    helpful: ["whether claimed in ITR/VAT or only income tax"],
    documents: ["Form 2307 availability", "matching to sales/SLSP/GL"],
    timing: ["taxable period"],
    taxpayer: ["customer/payor"],
    transaction: ["income type", "amount of income", "amount of CWT", "whether claimed in ITR/VAT or only income tax"],
    assessment: []
  },
  [ISSUE_FAMILIES.BIR_AUDIT_PROCEDURE]: {
    critical: ["LOA date", "taxable year/period", "tax types covered", "PAN/FAN/FDDA status", "assessment amount", "protest deadline"],
    helpful: ["authorized revenue officer issue if relevant"],
    documents: ["documents received", "documents submitted"],
    timing: ["LOA date", "taxable year/period", "protest deadline"],
    taxpayer: [],
    transaction: ["tax types covered", "assessment amount"],
    assessment: ["PAN/FAN/FDDA status", "protest deadline", "authorized revenue officer issue if relevant"]
  },
  [ISSUE_FAMILIES.INPUT_VAT_INVOICE_MISMATCH]: {
    critical: ["purchase/service nature", "invoice date", "supplier name/TIN", "buyer/customer name/TIN", "VAT amount"],
    helpful: ["connection to taxable sales", "whether mismatch is legal name, trade name, or third-party billing"],
    documents: ["invoice compliance details", "proof of payment"],
    timing: ["invoice date"],
    taxpayer: ["supplier name/TIN", "buyer/customer name/TIN"],
    transaction: ["purchase/service nature", "VAT amount", "connection to taxable sales", "whether mismatch is legal name, trade name, or third-party billing"],
    assessment: []
  },
  [ISSUE_FAMILIES.REIMBURSABLE_PASS_THROUGH]: {
    critical: ["principal/client", "third-party vendor", "whether markup exists", "invoice name", "contract/agency arrangement"],
    helpful: ["billing statement details", "whether amount was recorded as revenue or liability", "VAT treatment used"],
    documents: ["proof of reimbursement", "supporting reconciliation"],
    timing: [],
    taxpayer: ["principal/client", "third-party vendor"],
    transaction: ["whether markup exists", "invoice name", "billing statement details", "contract/agency arrangement", "whether amount was recorded as revenue or liability", "VAT treatment used"],
    assessment: []
  },
  [ISSUE_FAMILIES.GENERAL_TAX_ORIENTATION]: {
    critical: ["taxpayer type", "transaction type", "taxable period"],
    helpful: ["amount/materiality", "document availability", "desired output type"],
    documents: ["document availability"],
    timing: ["taxable period"],
    taxpayer: ["taxpayer type"],
    transaction: ["transaction type", "amount/materiality"],
    assessment: []
  },
  [ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS]: {
    critical: ["taxpayer type", "transaction type", "taxable period", "tax type involved"],
    helpful: ["amount/materiality", "documents available", "current procedural stage"],
    documents: ["documents available"],
    timing: ["taxable period"],
    taxpayer: ["taxpayer type"],
    transaction: ["transaction type", "tax type involved", "amount/materiality"],
    assessment: ["current procedural stage"]
  }
});

const MODE_FACTS = Object.freeze({
  "/tax": {
    critical: ["taxpayer type", "taxable period", "transaction type"],
    documents: [],
    assessment: []
  },
  "/audit": {
    critical: ["taxpayer type", "taxable period"],
    documents: ["assessment notices", "supporting documents"],
    assessment: ["assessment/procedural stage", "notice dates", "protest deadline if applicable"]
  },
  "/ask": {
    critical: [],
    documents: [],
    assessment: []
  }
});

function safeString(value = "") {
  return String(value || "").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(safeString).filter(Boolean) : [safeString(value)].filter(Boolean);
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function normalizeMode(mode) {
  return ["/ask", "/tax", "/audit"].includes(mode) ? mode : "/ask";
}

function normalizeIssueFamily(value) {
  return Object.values(ISSUE_FAMILIES).includes(value) ? value : ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS;
}

function normalizeTaxType(value) {
  return Object.values(TAX_TYPES).includes(value) ? value : TAX_TYPES.UNKNOWN;
}

function lowerList(values = []) {
  return safeArray(values).map((item) => item.toLowerCase());
}

function itemIsCovered(item, knownFacts, providedDocuments) {
  const needle = safeString(item).toLowerCase();
  const haystack = [...lowerList(knownFacts), ...lowerList(providedDocuments)].join(" ");
  const tokens = needle
    .replace(/if relevant|if applicable|whether|availability|details|support|proof of/gi, "")
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  return tokens.length > 0 && tokens.some((token) => haystack.includes(token));
}

function pendingItems(items, knownFacts, providedDocuments = []) {
  return unique(items).filter((item) => !itemIsCovered(item, knownFacts, providedDocuments));
}

function categorizeProvidedMissingFacts(missingFacts = []) {
  const categories = {
    critical: [],
    helpful: [],
    documents: [],
    timing: [],
    taxpayer: [],
    transaction: [],
    assessment: []
  };

  for (const fact of safeArray(missingFacts)) {
    const text = fact.toLowerCase();
    if (/document|invoice|receipt|form|2307|return|itr|afs|proof|support|contract|notice|pan|fan|fdda|loa/i.test(text)) {
      categories.documents.push(fact);
    }
    if (/date|period|year|deadline|time|taxable|effective/i.test(text)) {
      categories.timing.push(fact);
    }
    if (/taxpayer|payor|payee|buyer|seller|customer|supplier|principal|client|vendor|status|tin/i.test(text)) {
      categories.taxpayer.push(fact);
    }
    if (/transaction|sale|service|payment|income|expense|amount|markup|reimbursement|pass-through|vat|withholding|nolco|cwt/i.test(text)) {
      categories.transaction.push(fact);
    }
    if (/assessment|audit|loa|pan|fan|fdda|protest|stage|revenue officer|notice/i.test(text)) {
      categories.assessment.push(fact);
    }
    if (/critical|required|must|before final|material/i.test(text)) {
      categories.critical.push(fact);
    } else {
      categories.helpful.push(fact);
    }
  }

  return categories;
}

function questionFor(item) {
  const clean = safeString(item).replace(/\.$/, "");
  return `Please provide ${clean}.`;
}

function checklistFromGaps(result) {
  const source = [
    ...result.criticalMissingFacts,
    ...result.documentGaps,
    ...result.timingOrPeriodGaps,
    ...result.taxpayerStatusGaps,
    ...result.transactionCharacterGaps,
    ...result.assessmentStageGaps,
    ...result.helpfulMissingFacts
  ];
  const limit = result.mode === "/ask" ? 6 : 12;
  return unique(source).slice(0, limit).map(questionFor);
}

export function identifyFactGaps(input = {}) {
  const mode = normalizeMode(input.mode);
  const framed = frameTaxIssue(input);
  const issueFamily = normalizeIssueFamily(input.issueFamily || framed.issueFamily);
  const taxType = normalizeTaxType(input.taxType || framed.taxType);
  const authorityState = safeString(input.authorityState || input.sourceAvailabilityState || "GENERAL_TAX") || "GENERAL_TAX";
  const sourceAvailabilityState = safeString(input.sourceAvailabilityState || authorityState) || authorityState;
  const knownFacts = unique(input.knownFacts);
  const providedDocuments = unique(input.providedDocuments);
  const sourceCoverageNeeds = unique(input.authorityOrSourceCoverageNeeds || input.sourceCoverageNeeds || framed.sourceCoverageNeeds);
  const missingCategories = categorizeProvidedMissingFacts(input.missingUserFacts);
  const issueMap = ISSUE_FACT_MAP[issueFamily] || ISSUE_FACT_MAP[ISSUE_FAMILIES.UNKNOWN_NEEDS_MORE_FACTS];
  const modeMap = MODE_FACTS[mode] || MODE_FACTS["/ask"];
  const safety = applyReasoningSafetyPolicy({
    mode,
    authorityState,
    sourceAvailabilityState,
    missingUserFacts: input.missingUserFacts || framed.missingFacts,
    authorityOrSourceCoverageNeeds: sourceCoverageNeeds,
    requestedOutput: input.query
  });

  const criticalMissingFacts = unique([
    ...pendingItems(issueMap.critical, knownFacts),
    ...pendingItems(modeMap.critical, knownFacts),
    ...missingCategories.critical
  ]);
  const helpfulMissingFacts = unique([
    ...pendingItems(issueMap.helpful, knownFacts),
    ...missingCategories.helpful
  ]).filter((item) => !criticalMissingFacts.includes(item));
  const documentGaps = unique([
    ...pendingItems(issueMap.documents, knownFacts, providedDocuments),
    ...pendingItems(modeMap.documents, knownFacts, providedDocuments),
    ...missingCategories.documents
  ]);
  const timingOrPeriodGaps = unique([
    ...pendingItems(issueMap.timing, knownFacts),
    ...missingCategories.timing
  ]);
  const taxpayerStatusGaps = unique([
    ...pendingItems(issueMap.taxpayer, knownFacts),
    ...missingCategories.taxpayer
  ]);
  const transactionCharacterGaps = unique([
    ...pendingItems(issueMap.transaction, knownFacts),
    ...missingCategories.transaction
  ]);
  const assessmentStageGaps = unique([
    ...pendingItems(issueMap.assessment, knownFacts),
    ...pendingItems(modeMap.assessment, knownFacts),
    ...missingCategories.assessment
  ]);

  const result = {
    issueFamily,
    taxType,
    knownFacts,
    criticalMissingFacts,
    helpfulMissingFacts,
    documentGaps,
    timingOrPeriodGaps,
    taxpayerStatusGaps,
    transactionCharacterGaps,
    assessmentStageGaps,
    sourceCoverageNeeds,
    checklistQuestions: [],
    reasoningPosture: safety.safetyPosture,
    sourceStateCaution: safety.sourceStateCaution,
    implementationScope: "FACT_GAP_HELPER_ONLY",
    mode
  };

  result.checklistQuestions = checklistFromGaps(result);
  return result;
}

export function buildFactChecklist(inputOrFactGapResult = {}) {
  const result = inputOrFactGapResult.implementationScope === "FACT_GAP_HELPER_ONLY"
    ? inputOrFactGapResult
    : identifyFactGaps(inputOrFactGapResult);
  const mustAnswerBeforeFinalAdvice = unique([
    ...result.criticalMissingFacts,
    ...result.documentGaps,
    ...result.timingOrPeriodGaps,
    ...result.taxpayerStatusGaps,
    ...result.transactionCharacterGaps,
    ...result.assessmentStageGaps
  ]);

  return {
    checklistQuestions: result.checklistQuestions.length > 0 ? result.checklistQuestions : checklistFromGaps(result),
    mustAnswerBeforeFinalAdvice,
    canProceedWithGeneralOrientation: true
  };
}

export default {
  identifyFactGaps,
  buildFactChecklist
};
