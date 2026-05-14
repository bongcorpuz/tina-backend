"use strict";

/**
 * contract-interpretation-engine.js
 * TINA Contract Interpretation Engine
 *
 * Purpose:
 * Reads contract clauses and classifies rights, obligations, consideration,
 * control, risk transfer, agency indicators, lease indicators, termination,
 * tax clauses, and documentary gaps.
 */

const CLAUSE_TYPE = Object.freeze({
  PARTIES: "PARTIES",
  OBJECT: "OBJECT",
  CONSIDERATION: "CONSIDERATION",
  RIGHTS: "RIGHTS",
  OBLIGATIONS: "OBLIGATIONS",
  CONTROL: "CONTROL",
  RISK_TRANSFER: "RISK_TRANSFER",
  AGENCY: "AGENCY_INDICATOR",
  LEASE: "LEASE_INDICATOR",
  CONCESSION: "CONCESSION_INDICATOR",
  TERMINATION: "TERMINATION",
  TAX: "TAX_CLAUSE",
  BILLING_COLLECTION: "BILLING_COLLECTION",
  DOCUMENTARY_GAP: "DOCUMENTARY_GAP",
  INCONSISTENCY: "INCONSISTENCY",
  GENERAL: "GENERAL"
});

const INTERPRETATION_RISK = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
});

function normalizeText(input) {
  if (!input) return "";

  if (typeof input === "string") {
    return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
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
    if (source.includes(keyword.toLowerCase())) matched.push(keyword);
  }

  return { score: matched.length, matched };
}

function splitClauses(text) {
  return normalizeText(text)
    .split(/\n+|(?<=\.)\s+(?=[A-Z0-9])|(?:\bSection\s+\d+\.?|\bClause\s+\d+\.?)/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 2);
}

const CLAUSE_SIGNALS = Object.freeze({
  [CLAUSE_TYPE.PARTIES]: [
    "between", "party", "parties", "lessor", "lessee", "supplier",
    "customer", "client", "principal", "agent", "concessionaire",
    "service provider", "owner", "operator"
  ],
  [CLAUSE_TYPE.OBJECT]: [
    "purpose", "object", "subject matter", "scope", "engagement",
    "services", "space", "premises", "right to use", "deliverables"
  ],
  [CLAUSE_TYPE.CONSIDERATION]: [
    "consideration", "fee", "rent", "rental", "payment", "price",
    "compensation", "commission", "percentage of sales", "revenue share",
    "service fee", "deposit", "advance"
  ],
  [CLAUSE_TYPE.RIGHTS]: [
    "right", "entitled", "may", "exclusive", "non-exclusive",
    "access", "use", "possess", "operate", "collect"
  ],
  [CLAUSE_TYPE.OBLIGATIONS]: [
    "shall", "must", "obligation", "responsible", "undertakes",
    "warrants", "covenants", "provide", "perform", "deliver",
    "maintain", "pay", "remit"
  ],
  [CLAUSE_TYPE.CONTROL]: [
    "control", "supervise", "manage", "direct", "approve",
    "sets price", "pricing", "customer relationship", "operations",
    "quality standards", "authority"
  ],
  [CLAUSE_TYPE.RISK_TRANSFER]: [
    "risk", "liability", "loss", "damage", "indemnify",
    "hold harmless", "insurance", "warranty", "credit risk",
    "inventory risk", "service risk"
  ],
  [CLAUSE_TYPE.AGENCY]: [
    "agent", "principal", "on behalf", "for the account of",
    "representative", "fiduciary", "remit", "collection only",
    "commission"
  ],
  [CLAUSE_TYPE.LEASE]: [
    "lease", "lessor", "lessee", "premises", "rent", "rental",
    "right to use", "occupy", "possession", "space", "term of lease"
  ],
  [CLAUSE_TYPE.CONCESSION]: [
    "concession", "concessionaire", "right to operate",
    "percentage of sales", "gross sales", "revenue share",
    "operate within", "stall", "booth"
  ],
  [CLAUSE_TYPE.TERMINATION]: [
    "termination", "terminate", "expiry", "expiration", "default",
    "breach", "notice", "renewal", "pre-termination"
  ],
  [CLAUSE_TYPE.TAX]: [
    "tax", "vat", "withholding", "ewt", "cwt", "bir",
    "output vat", "input vat", "taxes", "duties", "government charges"
  ],
  [CLAUSE_TYPE.BILLING_COLLECTION]: [
    "invoice", "billing", "official receipt", "sales invoice",
    "collection", "collect", "receipt", "remittance", "payable",
    "due date"
  ],
  [CLAUSE_TYPE.DOCUMENTARY_GAP]: [
    "no agreement", "without agreement", "verbal", "not documented",
    "missing", "not provided", "unsupported", "no invoice", "no receipt"
  ],
  [CLAUSE_TYPE.INCONSISTENCY]: [
    "however", "but", "despite", "notwithstanding", "inconsistent",
    "different from actual practice", "actual practice", "booked as",
    "treated as"
  ]
});

function classifyClause(clause) {
  const classifications = [];

  for (const [type, signals] of Object.entries(CLAUSE_SIGNALS)) {
    const result = countMatches(clause, signals);

    if (result.score > 0) {
      classifications.push({
        type,
        score: result.score,
        matchedSignals: result.matched
      });
    }
  }

  classifications.sort((a, b) => b.score - a.score);

  return {
    text: clause,
    primaryType: classifications[0]?.type || CLAUSE_TYPE.GENERAL,
    classifications,
    confidence:
      classifications[0]?.score >= 3
        ? CONFIDENCE.HIGH
        : classifications[0]?.score >= 1
          ? CONFIDENCE.MEDIUM
          : CONFIDENCE.LOW
  };
}

function extractParties(text) {
  const parties = new Set();

  const partyPatterns = [
    /\b[A-Z][A-Za-z0-9&.,'\-\s]+(?:Inc\.?|Corporation|Corp\.?|Company|Co\.?|Association|Foundation|Hotel|Resort|Restaurant|School|Bank)\b/g,
    /\b(?:lessor|lessee|supplier|customer|client|principal|agent|concessionaire|service provider|owner|operator|tenant|landlord)\b/gi
  ];

  for (const pattern of partyPatterns) {
    const matches = text.match(pattern) || [];
    matches.forEach((x) => parties.add(x.trim()));
  }

  return [...parties].map((name) => ({
    name,
    role: inferPartyRole(name, text)
  }));
}

function inferPartyRole(name, text) {
  const n = lower(name);
  const source = lower(text);

  const roleMap = [
    ["lessor", "LESSOR"],
    ["lessee", "LESSEE"],
    ["supplier", "SUPPLIER"],
    ["customer", "CUSTOMER"],
    ["client", "CLIENT"],
    ["principal", "PRINCIPAL"],
    ["agent", "AGENT"],
    ["concessionaire", "CONCESSIONAIRE"],
    ["service provider", "SERVICE_PROVIDER"],
    ["owner", "OWNER"],
    ["operator", "OPERATOR"],
    ["tenant", "TENANT"],
    ["landlord", "LANDLORD"],
    ["restaurant", "SERVICE_PROVIDER"],
    ["resort", "BUSINESS_OPERATOR"]
  ];

  for (const [keyword, role] of roleMap) {
    if (n.includes(keyword) || source.includes(`${keyword} ${n}`)) return role;
  }

  return "UNSPECIFIED_PARTY";
}

function extractConsideration(clauses) {
  return clauses
    .filter((c) =>
      c.classifications.some((x) => x.type === CLAUSE_TYPE.CONSIDERATION)
    )
    .map((c) => ({
      clause: c.text,
      amounts: c.text.match(/(?:php|₱|p)\s?[\d,]+(?:\.\d{1,2})?|\b\d+(?:\.\d+)?\s?%/gi) || [],
      confidence: c.confidence
    }));
}

function summarizeByClauseType(classifiedClauses) {
  const summary = {};

  for (const type of Object.values(CLAUSE_TYPE)) {
    summary[type] = classifiedClauses
      .filter((clause) => clause.classifications.some((x) => x.type === type))
      .map((clause) => clause.text);
  }

  return summary;
}

function analyzeAgencyIndicators(text) {
  const principalSignals = countMatches(text, [
    "sets price", "controls price", "responsible to customer",
    "bears risk", "gross revenue", "customer pays", "primary obligor"
  ]);

  const agentSignals = countMatches(text, [
    "agent", "principal", "on behalf", "for the account of",
    "commission", "remit", "collection only", "net revenue"
  ]);

  let position = "UNRESOLVED";

  if (principalSignals.score > agentSignals.score) position = "PRINCIPAL_INDICATORS_PRESENT";
  if (agentSignals.score > principalSignals.score) position = "AGENCY_INDICATORS_PRESENT";

  return {
    position,
    principalSignals: principalSignals.matched,
    agentSignals: agentSignals.matched,
    confidence:
      Math.abs(principalSignals.score - agentSignals.score) >= 2
        ? CONFIDENCE.HIGH
        : principalSignals.score || agentSignals.score
          ? CONFIDENCE.MEDIUM
          : CONFIDENCE.LOW
  };
}

function analyzeLeaseIndicators(text) {
  const leaseSignals = countMatches(text, [
    "lease", "lessor", "lessee", "rent", "rental", "premises",
    "right to use", "occupy", "possession", "space"
  ]);

  const concessionSignals = countMatches(text, [
    "concession", "concessionaire", "right to operate",
    "percentage of sales", "revenue share", "gross sales"
  ]);

  return {
    leaseIndicatorsPresent: leaseSignals.score > 0,
    concessionIndicatorsPresent: concessionSignals.score > 0,
    leaseSignals: leaseSignals.matched,
    concessionSignals: concessionSignals.matched,
    possibleClassification:
      leaseSignals.score && concessionSignals.score
        ? "POSSIBLE_MIXED_LEASE_CONCESSION"
        : leaseSignals.score
          ? "POSSIBLE_LEASE"
          : concessionSignals.score
            ? "POSSIBLE_CONCESSION"
            : "NO_CLEAR_LEASE_OR_CONCESSION_INDICATOR"
  };
}

function analyzeControlRisk(text) {
  return {
    controlIndicators: countMatches(text, CLAUSE_SIGNALS[CLAUSE_TYPE.CONTROL]).matched,
    riskTransferIndicators: countMatches(text, CLAUSE_SIGNALS[CLAUSE_TYPE.RISK_TRANSFER]).matched,
    taxpayerLikelyControls:
      includesAny(text, ["controls", "sets price", "responsible to customer", "manage operations"]),
    thirdPartyLikelyControls:
      includesAny(text, ["supplier controls", "operator controls", "service provider controls"]),
    riskTransferPresent:
      includesAny(text, ["indemnify", "liability", "risk", "insurance", "hold harmless"])
  };
}

function analyzeTaxClauses(classifiedClauses) {
  const taxClauses = classifiedClauses.filter((c) =>
    c.classifications.some((x) => x.type === CLAUSE_TYPE.TAX)
  );

  return taxClauses.map((clause) => ({
    clause: clause.text,
    mentionsVAT: includesAny(clause.text, ["vat", "output vat", "input vat"]),
    mentionsWithholding: includesAny(clause.text, ["withholding", "ewt", "cwt"]),
    mentionsBIR: includesAny(clause.text, ["bir", "tax return", "filing"]),
    confidence: clause.confidence
  }));
}

function identifyDocumentaryGaps(text, summary) {
  const gaps = [];

  if (!summary[CLAUSE_TYPE.PARTIES]?.length) {
    gaps.push("Parties and capacities are not clearly identified.");
  }

  if (!summary[CLAUSE_TYPE.OBJECT]?.length) {
    gaps.push("Object or scope of the contract is not clearly stated.");
  }

  if (!summary[CLAUSE_TYPE.CONSIDERATION]?.length) {
    gaps.push("Consideration, fee, rent, commission, or payment basis is missing or unclear.");
  }

  if (!summary[CLAUSE_TYPE.OBLIGATIONS]?.length) {
    gaps.push("Obligations of the parties are not sufficiently stated.");
  }

  if (!summary[CLAUSE_TYPE.CONTROL]?.length) {
    gaps.push("Control over service delivery, pricing, customer relationship, or operations is not clearly stated.");
  }

  if (!summary[CLAUSE_TYPE.RISK_TRANSFER]?.length) {
    gaps.push("Risk allocation, liability, indemnity, or warranty clauses are missing or unclear.");
  }

  if (!summary[CLAUSE_TYPE.TAX]?.length) {
    gaps.push("Tax clause is missing or unclear.");
  }

  if (!summary[CLAUSE_TYPE.BILLING_COLLECTION]?.length) {
    gaps.push("Billing, collection, invoicing, or remittance mechanics are not clearly stated.");
  }

  if (!summary[CLAUSE_TYPE.TERMINATION]?.length) {
    gaps.push("Termination, default, renewal, or expiry provisions are missing or unclear.");
  }

  if (includesAny(text, ["no agreement", "without agreement", "verbal", "not documented"])) {
    gaps.push("The arrangement may be undocumented or only verbally agreed.");
  }

  return gaps;
}

function computeRiskLevel(text, gaps, agencyAnalysis, leaseAnalysis) {
  let score = 0;

  if (gaps.length >= 6) score += 4;
  else if (gaps.length >= 3) score += 2;
  else if (gaps.length >= 1) score += 1;

  if (includesAny(text, ["vat", "withholding", "bir", "tax", "assessment"])) score += 2;
  if (includesAny(text, ["no agreement", "without agreement", "not documented"])) score += 3;
  if (includesAny(text, ["actual practice differs", "inconsistent", "booked as", "treated as"])) score += 2;
  if (agencyAnalysis.position === "UNRESOLVED" && includesAny(text, ["principal", "agent", "commission", "margin"])) score += 2;
  if (leaseAnalysis.possibleClassification === "POSSIBLE_MIXED_LEASE_CONCESSION") score += 2;

  if (score >= 8) return INTERPRETATION_RISK.CRITICAL;
  if (score >= 5) return INTERPRETATION_RISK.HIGH;
  if (score >= 3) return INTERPRETATION_RISK.MEDIUM;
  return INTERPRETATION_RISK.LOW;
}

function buildRequiredFollowUpDocuments(gaps, text) {
  const docs = new Set();

  docs.add("Complete executed contract and amendments");
  docs.add("Actual billing, invoices, OR/SI, and collection records");
  docs.add("General ledger and accounting entries");
  docs.add("Evidence of actual conduct compared with contract terms");

  if (gaps.some((x) => /tax/i.test(x)) || includesAny(text, ["vat", "withholding", "bir"])) {
    docs.add("Tax position memo and relevant tax returns");
  }

  if (gaps.some((x) => /control|risk/i.test(x))) {
    docs.add("Evidence of who controls pricing, service delivery, customer relationship, and risk");
  }

  if (includesAny(text, ["lease", "concession", "space", "rent"])) {
    docs.add("Floor area/use rights schedule and rent or revenue share computation");
  }

  if (includesAny(text, ["agent", "principal", "commission", "remit"])) {
    docs.add("Principal-agent analysis and remittance support");
  }

  if (includesAny(text, ["board", "approval", "related party", "subscription", "loan"])) {
    docs.add("Board approvals, resolutions, and third-party confirmations");
  }

  return [...docs];
}

function interpretContract(input, options = {}) {
  const text = normalizeText(input || options.text);
  const rawClauses = splitClauses(text);
  const classifiedClauses = rawClauses.map(classifyClause);
  const clauseSummary = summarizeByClauseType(classifiedClauses);

  const parties = extractParties(text);
  const consideration = extractConsideration(classifiedClauses);
  const agencyAnalysis = analyzeAgencyIndicators(text);
  const leaseAnalysis = analyzeLeaseIndicators(text);
  const controlRiskAnalysis = analyzeControlRisk(text);
  const taxClauseAnalysis = analyzeTaxClauses(classifiedClauses);
  const documentaryGaps = identifyDocumentaryGaps(text, clauseSummary);
  const riskLevel = computeRiskLevel(text, documentaryGaps, agencyAnalysis, leaseAnalysis);

  return {
    engine: "TINA_CONTRACT_INTERPRETATION_ENGINE",
    version: "1.0.0",

    parties,
    clauseCount: classifiedClauses.length,
    classifiedClauses,
    clauseSummary,

    consideration,
    agencyAnalysis,
    leaseConcessionAnalysis: leaseAnalysis,
    controlRiskAnalysis,
    taxClauseAnalysis,

    documentaryGaps,
    requiredFollowUpDocuments: buildRequiredFollowUpDocuments(documentaryGaps, text),

    riskLevel,

    preliminaryInterpretation:
      riskLevel === INTERPRETATION_RISK.LOW
        ? "The contract appears interpretable based on the available clauses, subject to verification against actual practice."
        : "The contract contains missing, unclear, or risk-sensitive areas. Final tax/accounting characterization should be deferred until gaps are resolved.",

    limitationStatement:
      "Based on the available clauses, the interpretation is preliminary and subject to verification against the complete contract, supporting documents, and actual conduct of the parties."
  };
}

function buildContractInterpretationInstruction(result) {
  if (!result || result.engine !== "TINA_CONTRACT_INTERPRETATION_ENGINE") {
    throw new Error("Invalid contract interpretation result supplied.");
  }

  return {
    instruction: [
      "Use the contract interpretation result before final transaction, tax, audit, or legal conclusion.",
      "Identify parties, object, consideration, obligations, control, risk allocation, billing, tax clauses, and termination.",
      "Compare contract terms against actual practice and supporting evidence.",
      "Do not treat contract labels as controlling if economic substance indicates otherwise.",
      "If documentary gaps exist, state that the conclusion is preliminary.",
      `Contract interpretation risk level: ${result.riskLevel}.`,
      `Required limitation: ${result.limitationStatement}`
    ],
    result
  };
}

module.exports = {
  CLAUSE_TYPE,
  INTERPRETATION_RISK,
  CONFIDENCE,
  interpretContract,
  buildContractInterpretationInstruction
};
