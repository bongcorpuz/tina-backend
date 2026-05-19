"use strict";

/**
 * fact-pattern-engine.js
 * TINA Fact Pattern Engine
 *
 * Purpose:
 * Extracts and organizes facts, parties, transaction flow, consideration,
 * documents, tax issues, accounting issues, evidence gaps, and unresolved facts.
 */

const FACT_CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN"
});

const FACT_STATUS = Object.freeze({
  ASSERTED: "ASSERTED_FACT",
  DOCUMENTED: "DOCUMENTED_FACT",
  ASSUMED: "ASSUMED_FACT",
  MISSING: "MISSING_FACT",
  CONTRADICTORY: "CONTRADICTORY_FACT",
  UNRESOLVED: "UNRESOLVED_FACT"
});

const ISSUE_TYPES = Object.freeze({
  TAX: "TAX_ISSUE",
  ACCOUNTING: "ACCOUNTING_ISSUE",
  AUDIT: "AUDIT_ISSUE",
  LEGAL: "LEGAL_ISSUE",
  CONTRACT: "CONTRACT_ISSUE",
  EVIDENCE: "EVIDENCE_ISSUE",
  TRANSACTION: "TRANSACTION_CHARACTERIZATION_ISSUE"
});

function normalizeText(input) {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function lower(input) {
  return String(input || "").toLowerCase();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniqueArray(items = []) {
  return [...new Set(items.filter(Boolean).map((x) => String(x).trim()))];
}

function matchAll(text, regex) {
  const results = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    results.push(match[0].trim());
  }

  return uniqueArray(results);
}

function extractAmounts(text) {
  return matchAll(
    text,
    /(?:php|₱|p)\s?[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s?(?:pesos|php)/gi
  );
}

function extractPercentages(text) {
  return matchAll(text, /\b\d+(?:\.\d+)?\s?%/g);
}

function extractDates(text) {
  return matchAll(
    text,
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b20\d{2}\b/gi
  );
}

function extractNamedParties(text) {
  const parties = new Set();

  const patterns = [
    /\b[A-Z][A-Za-z0-9&.,'\-\s]+(?:Inc\.?|Corporation|Corp\.?|Company|Co\.?|LLC|Ltd\.?|Association|Foundation|School|Hotel|Resort|Restaurant|Condominium|Bank)\b/g,
    /\b(?:supplier|customer|client|lessor|lessee|concessionaire|principal|agent|vendor|buyer|seller|taxpayer|corporation|company|resort|restaurant|tenant|landlord|auditor|management|BIR|SEC)\b/gi
  ];

  for (const pattern of patterns) {
    for (const party of matchAll(text, pattern)) {
      parties.add(party);
    }
  }

  return [...parties].map((name) => ({
    name,
    role: inferPartyRole(name, text),
    status: FACT_STATUS.ASSERTED,
    confidence: FACT_CONFIDENCE.MEDIUM
  }));
}

function inferPartyRole(name, fullText) {
  const text = lower(fullText);
  const n = lower(name);

  const roleMap = [
    ["supplier", "SUPPLIER"],
    ["customer", "CUSTOMER"],
    ["client", "CLIENT"],
    ["lessor", "LESSOR"],
    ["lessee", "LESSEE"],
    ["concessionaire", "CONCESSIONAIRE"],
    ["principal", "PRINCIPAL"],
    ["agent", "AGENT"],
    ["vendor", "VENDOR"],
    ["buyer", "BUYER"],
    ["seller", "SELLER"],
    ["taxpayer", "TAXPAYER"],
    ["auditor", "AUDITOR"],
    ["management", "MANAGEMENT"],
    ["bir", "TAX_AUTHORITY"],
    ["sec", "REGULATOR"],
    ["restaurant", "SERVICE_PROVIDER"],
    ["resort", "BUSINESS_OPERATOR"]
  ];

  for (const [keyword, role] of roleMap) {
    if (n.includes(keyword) || text.includes(`${keyword} ${n}`)) return role;
  }

  return "UNSPECIFIED_PARTY";
}

function extractDocuments(text) {
  const documentTerms = [
    "contract", "agreement", "lease agreement", "concession agreement",
    "service agreement", "supplier agreement", "moa", "loa",
    "invoice", "official receipt", "or", "sales invoice", "si",
    "billing statement", "collection receipt", "acknowledgment receipt",
    "general ledger", "gl", "trial balance", "tax return", "itr",
    "vat return", "2550q", "1702", "afs", "financial statements",
    "board resolution", "board approval", "confirmation", "bank statement",
    "schedule", "working paper", "bir filing", "sec filing"
  ];

  const found = [];

  for (const term of documentTerms) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) {
      found.push({
        document: term,
        status: FACT_STATUS.ASSERTED,
        confidence: FACT_CONFIDENCE.MEDIUM
      });
    }
  }

  return found;
}

function extractTransactionFlow(sentences) {
  const flowKeywords = [
    "pay", "paid", "collect", "collected", "bill", "billed", "invoice",
    "charge", "charged", "receive", "received", "remit", "remitted",
    "recognize", "record", "book", "booked", "provide", "served",
    "deliver", "transfer", "lease", "rent", "reimburse", "advance"
  ];

  return sentences
    .filter((sentence) => {
      const s = lower(sentence);
      return flowKeywords.some((keyword) => s.includes(keyword));
    })
    .map((sentence) => ({
      description: sentence,
      amounts: extractAmounts(sentence),
      percentages: extractPercentages(sentence),
      partiesMentioned: extractNamedParties(sentence).map((p) => p.name),
      status: FACT_STATUS.ASSERTED,
      confidence: FACT_CONFIDENCE.MEDIUM
    }));
}

function extractConsideration(text, sentences) {
  const considerationTerms = [
    "consideration", "payment", "fee", "rent", "lease payment",
    "commission", "margin", "markup", "reimbursement", "cost",
    "charge", "room rate", "sales", "service fee", "advance"
  ];

  const relevantSentences = sentences.filter((sentence) => {
    const s = lower(sentence);
    return considerationTerms.some((term) => s.includes(term)) || extractAmounts(sentence).length > 0;
  });

  return {
    amounts: extractAmounts(text),
    percentages: extractPercentages(text),
    descriptions: relevantSentences.map((sentence) => ({
      description: sentence,
      status: FACT_STATUS.ASSERTED,
      confidence: FACT_CONFIDENCE.MEDIUM
    }))
  };
}

function extractTaxIssues(text) {
  const issueMap = [
    ["VAT", /\bvat\b|output vat|input vat|value-added tax/i],
    ["Income tax", /income tax|rcit|mcit|nolco|taxable income/i],
    ["Withholding tax", /withholding|ewt|cwt|expanded withholding/i],
    ["Deductibility", /deductible|non-deductible|deductibility/i],
    ["Gross vs net reporting", /gross|net revenue|net presentation|principal|agent/i],
    ["Pass-through / reimbursement", /reimbursement|pass-through|pass through|advance/i],
    ["BIR compliance", /bir|tax return|filing|assessment|loa|pan|fan/i]
  ];

  return issueMap
    .filter(([, pattern]) => pattern.test(text))
    .map(([issue]) => ({
      type: ISSUE_TYPES.TAX,
      issue,
      status: FACT_STATUS.ASSERTED,
      confidence: FACT_CONFIDENCE.MEDIUM
    }));
}

function extractAccountingIssues(text) {
  const issueMap = [
    ["Revenue recognition", /revenue|sales|recognize|pfrs 15|principal|agent/i],
    ["Cost of sales vs operating expense", /cost of sales|cost of service|opex|expense/i],
    ["Lease accounting", /lease|right-of-use|rou|lease liability|rent expense/i],
    ["Related party disclosure", /related party|pas 24|intercompany/i],
    ["Financial statement presentation", /afs|financial statements|presentation|classification/i],
    ["Deferred tax / income tax accounting", /deferred tax|dta|dtl|pas 12|income tax expense/i],
    ["Audit adjustment", /adjustment|caje|paje|prior period|misstatement/i]
  ];

  return issueMap
    .filter(([, pattern]) => pattern.test(text))
    .map(([issue]) => ({
      type: ISSUE_TYPES.ACCOUNTING,
      issue,
      status: FACT_STATUS.ASSERTED,
      confidence: FACT_CONFIDENCE.MEDIUM
    }));
}

function extractLegalContractIssues(text) {
  const issueMap = [
    ["Contract interpretation", /contract|agreement|clause|terms|obligation/i],
    ["Lease vs concession", /lease|concession|rent|percentage of sales/i],
    ["Rights and obligations", /rights|obligations|risk allocation|control/i],
    ["Legal consequence", /legal consequence|enforceable|liability|breach/i]
  ];

  return issueMap
    .filter(([, pattern]) => pattern.test(text))
    .map(([issue]) => ({
      type: ISSUE_TYPES.CONTRACT,
      issue,
      status: FACT_STATUS.ASSERTED,
      confidence: FACT_CONFIDENCE.MEDIUM
    }));
}

function detectUnresolvedFacts(text, extracted) {
  const unresolved = [];

  const checks = [
    {
      condition: extracted.parties.length === 0,
      fact: "Identity and roles of the parties are not clearly established."
    },
    {
      condition: extracted.documents.length === 0,
      fact: "No specific supporting document was identified."
    },
    {
      condition: extracted.transactionFlow.length === 0,
      fact: "Transaction flow is not sufficiently described."
    },
    {
      condition: extracted.consideration.amounts.length === 0 && extracted.consideration.percentages.length === 0,
      fact: "Consideration, price, margin, fee, or payment amount is not clearly stated."
    },
    {
      condition: /vat|sales|revenue|principal|agent|reimbursement|pass-through|lease|concession/i.test(text) &&
        !/invoice|receipt|contract|agreement|billing/i.test(text),
      fact: "Tax characterization is raised, but billing documents or contract support are not identified."
    },
    {
      condition: /audit|afs|pfrs|financial statements|working paper/i.test(text) &&
        !/gl|trial balance|schedule|support|confirmation|invoice|receipt/i.test(text),
      fact: "Audit or accounting issue is raised, but audit evidence is incomplete."
    },
    {
      condition: /contract|agreement|lease|concession/i.test(text) &&
        !/clause|obligation|consideration|termination|billing|tax clause/i.test(text),
      fact: "Contract is mentioned, but key clauses and obligations are not fully described."
    }
  ];

  for (const check of checks) {
    if (check.condition) {
      unresolved.push({
        fact: check.fact,
        status: FACT_STATUS.UNRESOLVED,
        confidence: FACT_CONFIDENCE.HIGH
      });
    }
  }

  return unresolved;
}

function detectAlternativeCharacterizations(text) {
  const alternatives = [];

  const rules = [
    {
      pattern: /lease|concession|rent|percentage of sales/i,
      alternatives: ["Lease", "Concession arrangement", "Service arrangement", "Revenue-sharing arrangement"]
    },
    {
      pattern: /reimbursement|pass-through|advance|collection/i,
      alternatives: ["Reimbursement", "Pass-through collection", "Agency collection", "Income / revenue"]
    },
    {
      pattern: /principal|agent|gross|net|margin|commission/i,
      alternatives: ["Principal - gross revenue", "Agent - net commission/margin", "Bundled service"]
    },
    {
      pattern: /free breakfast|package|bundled|room rate/i,
      alternatives: ["Bundled room package", "Separate food sale", "Agent arrangement", "Marketing cost / cost of service"]
    },
    {
      pattern: /related party|intercompany|settlement/i,
      alternatives: ["Related-party reimbursement", "Intercompany settlement", "Loan/advance", "Expense allocation"]
    }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      alternatives.push(...rule.alternatives);
    }
  }

  return uniqueArray(alternatives).map((item) => ({
    characterization: item,
    status: FACT_STATUS.UNRESOLVED,
    confidence: FACT_CONFIDENCE.MEDIUM
  }));
}

function classifyFactCompleteness(extracted) {
  let score = 0;

  if (extracted.parties.length > 0) score += 1;
  if (extracted.transactionFlow.length > 0) score += 1;
  if (extracted.consideration.amounts.length > 0 || extracted.consideration.percentages.length > 0) score += 1;
  if (extracted.documents.length > 0) score += 1;
  if (extracted.taxIssues.length > 0 || extracted.accountingIssues.length > 0) score += 1;
  if (extracted.unresolvedFacts.length === 0) score += 1;

  if (score >= 5) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

function extractKnownFacts(sentences) {
  return sentences.map((sentence) => ({
    fact: sentence,
    status: FACT_STATUS.ASSERTED,
    confidence: FACT_CONFIDENCE.MEDIUM
  }));
}

function buildDocumentsRequired(extracted) {
  const required = new Set();

  if (extracted.transactionFlow.length > 0) {
    required.add("Sales invoices / billing statements");
    required.add("Official receipts / collection receipts");
    required.add("General ledger and subsidiary ledgers");
  }

  if (extracted.consideration.amounts.length > 0 || extracted.consideration.percentages.length > 0) {
    required.add("Computation schedule of consideration, margin, reimbursement, or allocation");
  }

  if (extracted.legalContractIssues.length > 0 || extracted.alternativeCharacterizations.length > 0) {
    required.add("Executed contract / agreement and amendments");
    required.add("Tax clauses and billing clauses");
    required.add("Evidence of actual practice compared with contract terms");
  }

  if (extracted.taxIssues.length > 0) {
    required.add("Relevant tax returns and BIR filings");
    required.add("VAT / withholding tax schedules where applicable");
  }

  if (extracted.accountingIssues.length > 0) {
    required.add("Trial balance");
    required.add("AFS note disclosures");
    required.add("Accounting policy memo / management position paper");
  }

  if (extracted.parties.length > 0) {
    required.add("Confirmations from relevant parties where material");
  }

  return [...required].map((document) => ({
    document,
    status: FACT_STATUS.MISSING,
    confidence: FACT_CONFIDENCE.MEDIUM
  }));
}

function analyzeFactPattern(userInput, options = {}) {
  const text = normalizeText(userInput);
  const sentences = splitSentences(text);

  const extracted = {
    engine: "TINA_FACT_PATTERN_ENGINE",
    version: "1.0.0",
    sourceType: options.sourceType || "USER_PROMPT",
    knownFacts: extractKnownFacts(sentences),
    parties: extractNamedParties(text),
    transactionFlow: extractTransactionFlow(sentences),
    consideration: extractConsideration(text, sentences),
    documents: extractDocuments(text),
    dates: extractDates(text),
    taxIssues: extractTaxIssues(text),
    accountingIssues: extractAccountingIssues(text),
    legalContractIssues: extractLegalContractIssues(text),
    alternativeCharacterizations: [],
    unresolvedFacts: [],
    documentsRequired: [],
    limitationStatement: null
  };

  extracted.alternativeCharacterizations = detectAlternativeCharacterizations(text);
  extracted.unresolvedFacts = detectUnresolvedFacts(text, extracted);
  extracted.documentsRequired = buildDocumentsRequired(extracted);
  extracted.factCompleteness = classifyFactCompleteness(extracted);

  extracted.requiresVerification =
    extracted.factCompleteness !== "HIGH" ||
    extracted.unresolvedFacts.length > 0 ||
    extracted.documentsRequired.length > 0;

  extracted.limitationStatement = extracted.requiresVerification
    ? "Based on the available facts, the position is preliminary and subject to verification."
    : null;

  extracted.summary = {
    partyCount: extracted.parties.length,
    transactionFlowItems: extracted.transactionFlow.length,
    considerationItems:
      extracted.consideration.amounts.length + extracted.consideration.percentages.length,
    documentCount: extracted.documents.length,
    unresolvedFactCount: extracted.unresolvedFacts.length,
    taxIssueCount: extracted.taxIssues.length,
    accountingIssueCount: extracted.accountingIssues.length,
    alternativeCharacterizationCount: extracted.alternativeCharacterizations.length
  };

  return extracted;
}

function buildFactPatternInstruction(factPattern) {
  if (!factPattern || factPattern.engine !== "TINA_FACT_PATTERN_ENGINE") {
    throw new Error("Invalid factPattern supplied to buildFactPatternInstruction().");
  }

  return {
    instruction: [
      "Use the extracted fact pattern as the factual foundation.",
      "Do not treat asserted facts as verified facts unless documents support them.",
      "Separate known facts, assumed facts, missing facts, and unresolved facts.",
      "If alternative characterizations exist, analyze each before giving a final position.",
      "If documents are missing, state that the conclusion is preliminary.",
      factPattern.limitationStatement
        ? `Required limitation: ${factPattern.limitationStatement}`
        : null
    ].filter(Boolean),
    extractedFacts: factPattern
  };
}

export {
  FACT_CONFIDENCE,
  FACT_STATUS,
  ISSUE_TYPES,
  analyzeFactPattern,
  buildFactPatternInstruction
};
