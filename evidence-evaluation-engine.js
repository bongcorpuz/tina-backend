"use strict";

/**
 * evidence-evaluation-engine.js
 * TINA Evidence Evaluation Engine
 *
 * Purpose:
 * Checks whether facts are supported by contracts, invoices, OR/SI, GL,
 * tax returns, board approvals, confirmations, bank records, and third-party documents.
 */

const EVIDENCE_STATUS = Object.freeze({
  DOCUMENTED: "DOCUMENTED_FACT",
  PARTIALLY_SUPPORTED: "PARTIALLY_SUPPORTED_FACT",
  ASSERTED_ONLY: "ASSERTED_ONLY",
  MISSING: "MISSING_EVIDENCE",
  CONTRADICTORY: "CONTRADICTORY_EVIDENCE",
  UNRESOLVED: "UNRESOLVED_EVIDENCE"
});

const EVIDENCE_STRENGTH = Object.freeze({
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
  NONE: "NONE"
});

const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const DOCUMENT_TYPES = Object.freeze({
  CONTRACT: "CONTRACT_OR_AGREEMENT",
  INVOICE: "INVOICE_OR_BILLING",
  OR_SI: "OFFICIAL_RECEIPT_OR_SALES_INVOICE",
  GL: "GENERAL_LEDGER",
  TAX_RETURN: "TAX_RETURN",
  BOARD_APPROVAL: "BOARD_APPROVAL_OR_RESOLUTION",
  CONFIRMATION: "THIRD_PARTY_CONFIRMATION",
  BANK_RECORD: "BANK_RECORD",
  THIRD_PARTY: "THIRD_PARTY_DOCUMENT",
  WORKING_PAPER: "AUDIT_WORKING_PAPER",
  MANAGEMENT_REP: "MANAGEMENT_REPRESENTATION"
});

function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") {
    return input.replace(/\s+/g, " ").trim();
  }

  if (typeof input === "object") {
    return JSON.stringify(input).replace(/\s+/g, " ").trim();
  }

  return String(input).replace(/\s+/g, " ").trim();
}

function lower(input) {
  return normalizeText(input).toLowerCase();
}

function includesAny(text, keywords = []) {
  const source = lower(text);
  return keywords.some((keyword) => source.includes(keyword.toLowerCase()));
}

function countMatches(text, keywords = []) {
  const source = lower(text);
  const matched = [];

  for (const keyword of keywords) {
    if (source.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }

  return {
    score: matched.length,
    matched
  };
}

function getInputText(input, options = {}) {
  if (typeof input === "string") return normalizeText(input);

  const parts = [];

  if (input && typeof input === "object") {
    if (Array.isArray(input.knownFacts)) {
      parts.push(...input.knownFacts.map((x) => x.fact || x.description || ""));
    }

    if (Array.isArray(input.transactionFlow)) {
      parts.push(...input.transactionFlow.map((x) => x.description || ""));
    }

    if (Array.isArray(input.documents)) {
      parts.push(...input.documents.map((x) => x.document || ""));
    }

    if (Array.isArray(input.documentsRequired)) {
      parts.push(...input.documentsRequired.map((x) => x.document || ""));
    }

    if (Array.isArray(input.requiredEvidence)) {
      parts.push(...input.requiredEvidence);
    }

    if (Array.isArray(input.requiredDocuments)) {
      parts.push(...input.requiredDocuments);
    }

    if (input.preliminaryConclusion) parts.push(input.preliminaryConclusion);
    if (input.limitationStatement) parts.push(input.limitationStatement);
  }

  if (options.text) parts.push(options.text);

  return normalizeText(parts.join(" "));
}

const DOCUMENT_SIGNALS = Object.freeze({
  [DOCUMENT_TYPES.CONTRACT]: [
    "contract", "agreement", "lease agreement", "concession agreement",
    "service agreement", "supplier agreement", "moa", "terms", "clause"
  ],

  [DOCUMENT_TYPES.INVOICE]: [
    "invoice", "billing", "billing statement", "statement of account",
    "charge invoice", "supplier invoice"
  ],

  [DOCUMENT_TYPES.OR_SI]: [
    "official receipt", "or", "sales invoice", "si", "collection receipt",
    "acknowledgment receipt"
  ],

  [DOCUMENT_TYPES.GL]: [
    "general ledger", "gl", "ledger", "subsidiary ledger",
    "trial balance", "journal entry", "caje", "paje"
  ],

  [DOCUMENT_TYPES.TAX_RETURN]: [
    "tax return", "itr", "vat return", "2550q", "1702",
    "withholding tax return", "bir filing", "slsp", "alphalist"
  ],

  [DOCUMENT_TYPES.BOARD_APPROVAL]: [
    "board approval", "board resolution", "secretary certificate",
    "minutes of meeting", "directors approval", "stockholders approval"
  ],

  [DOCUMENT_TYPES.CONFIRMATION]: [
    "confirmation", "third-party confirmation", "supplier confirmation",
    "customer confirmation", "bank confirmation", "balance confirmation"
  ],

  [DOCUMENT_TYPES.BANK_RECORD]: [
    "bank statement", "deposit slip", "proof of payment",
    "remittance", "fund transfer", "check voucher", "bank record"
  ],

  [DOCUMENT_TYPES.THIRD_PARTY]: [
    "third-party document", "supplier billing", "vendor statement",
    "delivery receipt", "service report", "liquidation report"
  ],

  [DOCUMENT_TYPES.WORKING_PAPER]: [
    "working paper", "audit schedule", "lead schedule",
    "supporting schedule", "reconciliation", "analysis schedule"
  ],

  [DOCUMENT_TYPES.MANAGEMENT_REP]: [
    "management representation", "management letter",
    "certification", "representation letter", "management explanation"
  ]
});

const FACT_AREA_REQUIREMENTS = Object.freeze({
  revenue: [
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.OR_SI,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.BANK_RECORD,
    DOCUMENT_TYPES.TAX_RETURN
  ],

  reimbursement: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.THIRD_PARTY,
    DOCUMENT_TYPES.BANK_RECORD,
    DOCUMENT_TYPES.GL
  ],

  lease: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.OR_SI,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.TAX_RETURN
  ],

  concession: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.BANK_RECORD,
    DOCUMENT_TYPES.THIRD_PARTY,
    DOCUMENT_TYPES.GL
  ],

  principalAgent: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.THIRD_PARTY,
    DOCUMENT_TYPES.CONFIRMATION,
    DOCUMENT_TYPES.WORKING_PAPER
  ],

  taxCompliance: [
    DOCUMENT_TYPES.TAX_RETURN,
    DOCUMENT_TYPES.OR_SI,
    DOCUMENT_TYPES.INVOICE,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.BANK_RECORD
  ],

  relatedParty: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.BOARD_APPROVAL,
    DOCUMENT_TYPES.CONFIRMATION,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.BANK_RECORD
  ],

  financing: [
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.BOARD_APPROVAL,
    DOCUMENT_TYPES.BANK_RECORD,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.CONFIRMATION
  ],

  equity: [
    DOCUMENT_TYPES.BOARD_APPROVAL,
    DOCUMENT_TYPES.CONTRACT,
    DOCUMENT_TYPES.BANK_RECORD,
    DOCUMENT_TYPES.GL,
    DOCUMENT_TYPES.THIRD_PARTY
  ]
});

function detectDocuments(text) {
  const detected = {};

  for (const [docType, keywords] of Object.entries(DOCUMENT_SIGNALS)) {
    const result = countMatches(text, keywords);

    detected[docType] = {
      present: result.score > 0,
      matchedSignals: result.matched,
      strength:
        result.score >= 3
          ? EVIDENCE_STRENGTH.STRONG
          : result.score >= 1
            ? EVIDENCE_STRENGTH.MODERATE
            : EVIDENCE_STRENGTH.NONE
    };
  }

  return detected;
}

function detectFactAreas(text) {
  return {
    revenue: includesAny(text, [
      "sales", "revenue", "income", "room rate", "gross revenue", "net revenue"
    ]),
    reimbursement: includesAny(text, [
      "reimbursement", "pass-through", "pass through", "advance", "liquidation"
    ]),
    lease: includesAny(text, [
      "lease", "rent", "lessor", "lessee", "right to use", "rou"
    ]),
    concession: includesAny(text, [
      "concession", "concessionaire", "percentage of sales", "revenue share"
    ]),
    principalAgent: includesAny(text, [
      "principal", "agent", "commission", "margin", "gross or net", "control"
    ]),
    taxCompliance: includesAny(text, [
      "vat", "output vat", "input vat", "withholding", "ewt", "cwt",
      "income tax", "bir", "tax return"
    ]),
    relatedParty: includesAny(text, [
      "related party", "intercompany", "affiliate", "stockholder", "director"
    ]),
    financing: includesAny(text, [
      "loan", "financing", "interest", "borrow", "lend", "debt", "repayment"
    ]),
    equity: includesAny(text, [
      "equity", "capital", "shares", "subscription", "dfs",
      "deposit for future subscription"
    ])
  };
}

function buildRequiredDocuments(factAreas) {
  const required = new Set();

  for (const [area, active] of Object.entries(factAreas)) {
    if (!active) continue;

    const docs = FACT_AREA_REQUIREMENTS[area] || [];
    docs.forEach((doc) => required.add(doc));
  }

  return [...required];
}

function evaluateCoverage(requiredDocuments, detectedDocuments) {
  const coverage = requiredDocuments.map((docType) => {
    const detected = detectedDocuments[docType];

    if (!detected || !detected.present) {
      return {
        documentType: docType,
        status: EVIDENCE_STATUS.MISSING,
        strength: EVIDENCE_STRENGTH.NONE,
        matchedSignals: []
      };
    }

    return {
      documentType: docType,
      status:
        detected.strength === EVIDENCE_STRENGTH.STRONG
          ? EVIDENCE_STATUS.DOCUMENTED
          : EVIDENCE_STATUS.PARTIALLY_SUPPORTED,
      strength: detected.strength,
      matchedSignals: detected.matchedSignals
    };
  });

  return coverage;
}

function detectContradictionRisk(text) {
  const contradictionSignals = countMatches(text, [
    "but", "however", "although", "despite", "inconsistent",
    "conflict", "contradict", "not supported", "different from",
    "no agreement", "without agreement", "booked as", "treated as",
    "actual practice differs"
  ]);

  return {
    hasContradictionRisk: contradictionSignals.score > 0,
    matchedSignals: contradictionSignals.matched,
    risk:
      contradictionSignals.score >= 4
        ? RISK_LEVEL.HIGH
        : contradictionSignals.score >= 2
          ? RISK_LEVEL.MEDIUM
          : contradictionSignals.score === 1
            ? RISK_LEVEL.LOW
            : RISK_LEVEL.LOW
  };
}

function detectUnsupportedAssertionRisk(text, detectedDocuments) {
  const documentPresent = Object.values(detectedDocuments).some((x) => x.present);

  const assertionSignals = countMatches(text, [
    "client said", "management said", "they said", "verbal",
    "according to management", "assume", "assuming", "claimed",
    "asserted", "represented", "no document", "no support"
  ]);

  return {
    hasUnsupportedAssertionRisk: assertionSignals.score > 0 || !documentPresent,
    matchedSignals: assertionSignals.matched,
    risk:
      !documentPresent
        ? RISK_LEVEL.HIGH
        : assertionSignals.score >= 3
          ? RISK_LEVEL.HIGH
          : assertionSignals.score >= 1
            ? RISK_LEVEL.MEDIUM
            : RISK_LEVEL.LOW
  };
}

function computeEvidenceStrength(coverage) {
  if (!coverage.length) return EVIDENCE_STRENGTH.WEAK;

  const documented = coverage.filter((x) => x.status === EVIDENCE_STATUS.DOCUMENTED).length;
  const partial = coverage.filter((x) => x.status === EVIDENCE_STATUS.PARTIALLY_SUPPORTED).length;
  const missing = coverage.filter((x) => x.status === EVIDENCE_STATUS.MISSING).length;

  const score = documented * 2 + partial - missing * 2;

  if (score >= coverage.length * 1.5) return EVIDENCE_STRENGTH.STRONG;
  if (score >= 0) return EVIDENCE_STRENGTH.MODERATE;
  if (documented || partial) return EVIDENCE_STRENGTH.WEAK;
  return EVIDENCE_STRENGTH.NONE;
}

function computeOverallRisk(evidenceStrength, contradictionRisk, unsupportedRisk, coverage) {
  let score = 0;

  if (evidenceStrength === EVIDENCE_STRENGTH.NONE) score += 5;
  if (evidenceStrength === EVIDENCE_STRENGTH.WEAK) score += 3;
  if (evidenceStrength === EVIDENCE_STRENGTH.MODERATE) score += 1;

  if (contradictionRisk.hasContradictionRisk) score += 2;
  if (contradictionRisk.risk === RISK_LEVEL.HIGH) score += 2;

  if (unsupportedRisk.hasUnsupportedAssertionRisk) score += 2;
  if (unsupportedRisk.risk === RISK_LEVEL.HIGH) score += 2;

  const missingCount = coverage.filter((x) => x.status === EVIDENCE_STATUS.MISSING).length;
  if (missingCount >= 5) score += 3;
  else if (missingCount >= 3) score += 2;
  else if (missingCount >= 1) score += 1;

  if (score >= 9) return RISK_LEVEL.CRITICAL;
  if (score >= 6) return RISK_LEVEL.HIGH;
  if (score >= 3) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.LOW;
}

function buildEvidenceFindings(coverage, contradictionRisk, unsupportedRisk) {
  const findings = [];

  const documented = coverage.filter((x) => x.status === EVIDENCE_STATUS.DOCUMENTED);
  const partial = coverage.filter((x) => x.status === EVIDENCE_STATUS.PARTIALLY_SUPPORTED);
  const missing = coverage.filter((x) => x.status === EVIDENCE_STATUS.MISSING);

  if (documented.length) {
    findings.push(`Documented evidence found for: ${documented.map((x) => x.documentType).join(", ")}.`);
  }

  if (partial.length) {
    findings.push(`Partial support found for: ${partial.map((x) => x.documentType).join(", ")}.`);
  }

  if (missing.length) {
    findings.push(`Missing evidence for: ${missing.map((x) => x.documentType).join(", ")}.`);
  }

  if (contradictionRisk.hasContradictionRisk) {
    findings.push("Contradiction or inconsistency indicators are present and require reconciliation.");
  }

  if (unsupportedRisk.hasUnsupportedAssertionRisk) {
    findings.push("Some facts appear to be asserted without sufficient documentary support.");
  }

  if (!findings.length) {
    findings.push("No significant evidentiary issue detected from the available text.");
  }

  return findings;
}

function buildAuditSensitiveItems(factAreas, coverage) {
  const items = [];

  if (factAreas.revenue) {
    items.push("Revenue completeness, occurrence, cut-off, VAT classification, and gross-versus-net presentation.");
  }

  if (factAreas.reimbursement) {
    items.push("Whether collections are true reimbursements/pass-through items or taxable income.");
  }

  if (factAreas.principalAgent) {
    items.push("Principal-versus-agent conclusion and whether revenue should be gross or net.");
  }

  if (factAreas.lease || factAreas.concession) {
    items.push("Lease/concession classification, rent/revenue share computation, withholding tax, and VAT treatment.");
  }

  if (factAreas.taxCompliance) {
    items.push("Reconciliation of GL, invoices/OR/SI, tax returns, SLSP/alphalist, and BIR filings.");
  }

  if (factAreas.financing || factAreas.equity) {
    items.push("Debt-versus-equity classification, approval trail, fund flow, and financial statement presentation.");
  }

  const missingDocs = coverage
    .filter((x) => x.status === EVIDENCE_STATUS.MISSING)
    .map((x) => x.documentType);

  if (missingDocs.length) {
    items.push(`Missing critical evidence: ${missingDocs.join(", ")}.`);
  }

  return items;
}

function evaluateEvidence(input, options = {}) {
  const text = getInputText(input, options);
  const detectedDocuments = detectDocuments(text);
  const factAreas = detectFactAreas(text);
  const requiredDocuments = buildRequiredDocuments(factAreas);
  const coverage = evaluateCoverage(requiredDocuments, detectedDocuments);

  const contradictionRisk = detectContradictionRisk(text);
  const unsupportedAssertionRisk = detectUnsupportedAssertionRisk(text, detectedDocuments);
  const evidenceStrength = computeEvidenceStrength(coverage);
  const riskLevel = computeOverallRisk(
    evidenceStrength,
    contradictionRisk,
    unsupportedAssertionRisk,
    coverage
  );

  return {
    engine: "TINA_EVIDENCE_EVALUATION_ENGINE",
    version: "1.0.0",

    factAreas,
    detectedDocuments,
    requiredDocuments,
    evidenceCoverage: coverage,

    evidenceStrength,
    riskLevel,
    contradictionRisk,
    unsupportedAssertionRisk,

    findings: buildEvidenceFindings(
      coverage,
      contradictionRisk,
      unsupportedAssertionRisk
    ),

    auditSensitiveItems: buildAuditSensitiveItems(factAreas, coverage),

    conclusionRule:
      riskLevel === RISK_LEVEL.LOW
        ? "Evidence appears sufficient for a preliminary conclusion, subject to source review."
        : "Do not issue a definitive conclusion until missing, partial, or contradictory evidence is resolved.",

    limitationStatement:
      "Based on the available facts and documents identified, the position is preliminary and subject to verification."
  };
}

function buildEvidenceEvaluationInstruction(result) {
  if (!result || result.engine !== "TINA_EVIDENCE_EVALUATION_ENGINE") {
    throw new Error("Invalid evidence evaluation result supplied.");
  }

  return {
    instruction: [
      "Use the evidence evaluation before finalizing any tax, accounting, audit, or legal conclusion.",
      "Separate asserted facts from documented facts.",
      "Identify missing, partial, contradictory, and unsupported evidence.",
      "Do not treat management assertions as verified facts without documents.",
      "If evidence risk is medium, high, or critical, state that the conclusion is preliminary.",
      `Evidence strength: ${result.evidenceStrength}.`,
      `Evidence risk level: ${result.riskLevel}.`,
      `Required limitation: ${result.limitationStatement}`
    ],
    result
  };
}

export {
  EVIDENCE_STATUS,
  EVIDENCE_STRENGTH,
  RISK_LEVEL,
  DOCUMENT_TYPES,
  evaluateEvidence,
  buildEvidenceEvaluationInstruction
};
