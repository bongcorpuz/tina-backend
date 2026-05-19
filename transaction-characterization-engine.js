"use strict";

/**
 * transaction-characterization-engine.js
 * TINA Transaction Characterization Engine
 *
 * Purpose:
 * Determines whether a transaction is sale, service, lease, agency,
 * reimbursement, concession, bundled package, principal-agent, pass-through,
 * financing, equity, or mixed transaction.
 */

const CHARACTERIZATION_TYPES = Object.freeze({
  SALE: "SALE",
  SERVICE: "SERVICE",
  LEASE: "LEASE",
  AGENCY: "AGENCY",
  REIMBURSEMENT: "REIMBURSEMENT",
  CONCESSION: "CONCESSION",
  BUNDLED_PACKAGE: "BUNDLED_PACKAGE",
  PRINCIPAL_AGENT: "PRINCIPAL_AGENT",
  PASS_THROUGH: "PASS_THROUGH",
  FINANCING: "FINANCING",
  EQUITY: "EQUITY",
  MIXED: "MIXED_TRANSACTION",
  UNRESOLVED: "UNRESOLVED_TRANSACTION"
});

const CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
});

const RISK_LEVEL = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
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

function countSignals(text, keywords = []) {
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

function getFactText(input) {
  if (!input) return "";

  if (typeof input === "string") return normalizeText(input);

  const parts = [];

  if (Array.isArray(input.knownFacts)) {
    parts.push(...input.knownFacts.map((x) => x.fact || x.description || ""));
  }

  if (Array.isArray(input.transactionFlow)) {
    parts.push(...input.transactionFlow.map((x) => x.description || ""));
  }

  if (input.consideration && Array.isArray(input.consideration.descriptions)) {
    parts.push(...input.consideration.descriptions.map((x) => x.description || ""));
  }

  if (Array.isArray(input.documents)) {
    parts.push(...input.documents.map((x) => x.document || ""));
  }

  if (Array.isArray(input.taxIssues)) {
    parts.push(...input.taxIssues.map((x) => x.issue || ""));
  }

  if (Array.isArray(input.accountingIssues)) {
    parts.push(...input.accountingIssues.map((x) => x.issue || ""));
  }

  if (Array.isArray(input.alternativeCharacterizations)) {
    parts.push(...input.alternativeCharacterizations.map((x) => x.characterization || ""));
  }

  return normalizeText(parts.join(" "));
}

const SIGNALS = Object.freeze({
  [CHARACTERIZATION_TYPES.SALE]: [
    "sale", "sell", "sold", "sales invoice", "goods", "product",
    "inventory", "customer buys", "transfer of ownership", "title transfers"
  ],

  [CHARACTERIZATION_TYPES.SERVICE]: [
    "service", "professional fee", "service fee", "rendered",
    "perform", "labor", "management fee", "consultancy", "maintenance"
  ],

  [CHARACTERIZATION_TYPES.LEASE]: [
    "lease", "rent", "rental", "lessor", "lessee", "tenant",
    "right to use", "rou", "lease liability", "fixed rent", "space rental"
  ],

  [CHARACTERIZATION_TYPES.AGENCY]: [
    "agent", "agency", "on behalf", "for the account of",
    "representative", "collects for", "remits to", "principal"
  ],

  [CHARACTERIZATION_TYPES.REIMBURSEMENT]: [
    "reimbursement", "reimburse", "actual cost", "out-of-pocket",
    "expense recovery", "cost recovery", "advance payment", "liquidation"
  ],

  [CHARACTERIZATION_TYPES.CONCESSION]: [
    "concession", "concessionaire", "percentage of sales",
    "revenue share", "right to operate", "operate inside",
    "use of space with sales percentage"
  ],

  [CHARACTERIZATION_TYPES.BUNDLED_PACKAGE]: [
    "bundle", "bundled", "package", "inclusive", "free breakfast",
    "included in room rate", "room package", "combined price",
    "single price"
  ],

  [CHARACTERIZATION_TYPES.PRINCIPAL_AGENT]: [
    "principal vs agent", "principal", "agent", "gross or net",
    "gross revenue", "net revenue", "commission", "margin",
    "controls the service", "bears risk"
  ],

  [CHARACTERIZATION_TYPES.PASS_THROUGH]: [
    "pass-through", "pass through", "collection only",
    "amount collected for another", "remittance", "no margin",
    "held in trust", "not income"
  ],

  [CHARACTERIZATION_TYPES.FINANCING]: [
    "loan", "financing", "advance", "interest", "principal repayment",
    "borrow", "lend", "credit facility", "promissory note",
    "debt", "liability"
  ],

  [CHARACTERIZATION_TYPES.EQUITY]: [
    "equity", "capital", "shares", "subscription", "deposit for future subscription",
    "dfs", "additional paid-in capital", "stockholders", "issuance of shares"
  ]
});

function scoreCharacterizations(text) {
  const scores = {};

  for (const [type, keywords] of Object.entries(SIGNALS)) {
    scores[type] = countSignals(text, keywords);
  }

  return scores;
}

function analyzeEconomicSubstance(text) {
  return {
    legalFormSignals: {
      lease: includesAny(text, ["lease", "rent", "lessor", "lessee"]),
      contract: includesAny(text, ["contract", "agreement", "moa", "clause"]),
      invoice: includesAny(text, ["invoice", "billing", "official receipt", "sales invoice"]),
      financing: includesAny(text, ["loan", "interest", "repayment", "borrow", "lend"]),
      equity: includesAny(text, ["shares", "subscription", "capital", "equity", "dfs"])
    },

    substanceSignals: {
      control: includesAny(text, ["control", "controls", "responsible", "decides", "directs"]),
      risk: includesAny(text, ["risk", "liable", "bears", "obligation", "warranty"]),
      margin: includesAny(text, ["margin", "markup", "commission", "spread", "earned"]),
      remittance: includesAny(text, ["remit", "remitted", "remittance", "paid to supplier"]),
      bundledPricing: includesAny(text, ["package", "inclusive", "bundle", "combined price"]),
      customerFacing: includesAny(text, ["customer", "guest", "client", "charged to customer"]),
      supplierFacing: includesAny(text, ["supplier", "vendor", "restaurant", "third party"])
    }
  };
}

function determinePrimaryClassification(scores) {
  const ranked = Object.entries(scores)
    .map(([type, data]) => ({
      type,
      score: data.score,
      matched: data.matched
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      type: CHARACTERIZATION_TYPES.UNRESOLVED,
      confidence: CONFIDENCE.LOW,
      basis: []
    };
  }

  const top = ranked[0];
  const second = ranked[1];

  if (second && second.score >= Math.max(2, top.score - 1)) {
    return {
      type: CHARACTERIZATION_TYPES.MIXED,
      confidence: CONFIDENCE.MEDIUM,
      basis: ranked.slice(0, 5)
    };
  }

  return {
    type: top.type,
    confidence: top.score >= 3 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
    basis: ranked.slice(0, 5)
  };
}

function identifyPrincipalAgentIndicators(text) {
  return {
    principalIndicators: [
      includesAny(text, ["sets price", "controls price", "customer pays the company"]),
      includesAny(text, ["responsible to customer", "obligation to customer"]),
      includesAny(text, ["bears inventory risk", "bears service risk", "liable to customer"]),
      includesAny(text, ["recognizes gross revenue", "gross revenue"]),
      includesAny(text, ["supplier paid by company", "company pays supplier"])
    ].filter(Boolean).length,

    agentIndicators: [
      includesAny(text, ["on behalf", "for the account of", "agent"]),
      includesAny(text, ["commission", "net margin", "net revenue"]),
      includesAny(text, ["remit", "remittance", "pass-through"]),
      includesAny(text, ["supplier controls", "third party responsible"]),
      includesAny(text, ["no inventory risk", "no service risk", "collection only"])
    ].filter(Boolean).length
  };
}

function determinePrincipalAgentPosition(text) {
  const indicators = identifyPrincipalAgentIndicators(text);

  if (indicators.principalIndicators > indicators.agentIndicators) {
    return {
      position: "PRINCIPAL",
      confidence:
        indicators.principalIndicators - indicators.agentIndicators >= 2
          ? CONFIDENCE.HIGH
          : CONFIDENCE.MEDIUM,
      indicators
    };
  }

  if (indicators.agentIndicators > indicators.principalIndicators) {
    return {
      position: "AGENT",
      confidence:
        indicators.agentIndicators - indicators.principalIndicators >= 2
          ? CONFIDENCE.HIGH
          : CONFIDENCE.MEDIUM,
      indicators
    };
  }

  return {
    position: "UNRESOLVED_PRINCIPAL_AGENT",
    confidence: CONFIDENCE.LOW,
    indicators
  };
}

function identifyTaxAccountingConsequences(classification, principalAgentPosition) {
  const type = classification.type;

  const result = {
    taxConsequences: [],
    accountingConsequences: [],
    birRisks: [],
    auditRisks: []
  };

  switch (type) {
    case CHARACTERIZATION_TYPES.SALE:
      result.taxConsequences.push("Possible VAT/output tax on gross selling price if VAT-taxable.");
      result.accountingConsequences.push("Revenue generally recognized gross if entity is principal.");
      result.birRisks.push("Risk of underdeclared sales if billed amount is excluded from revenue.");
      break;

    case CHARACTERIZATION_TYPES.SERVICE:
      result.taxConsequences.push("Service income may be subject to VAT and withholding tax depending on payor and nature.");
      result.accountingConsequences.push("Revenue recognized as service obligation is satisfied.");
      break;

    case CHARACTERIZATION_TYPES.LEASE:
      result.taxConsequences.push("Rental income/expense and applicable withholding tax should be evaluated.");
      result.accountingConsequences.push("Assess lease classification and possible ROU asset / lease liability if lessee accounting applies.");
      break;

    case CHARACTERIZATION_TYPES.CONCESSION:
      result.taxConsequences.push("Percentage fee, rent, commission, or revenue share must be characterized based on contract and actual conduct.");
      result.accountingConsequences.push("May be lease, service, agency, or mixed arrangement depending on control and risk.");
      result.birRisks.push("High risk if substance differs from written contract.");
      break;

    case CHARACTERIZATION_TYPES.REIMBURSEMENT:
      result.taxConsequences.push("Pure reimbursement requires strong documentation; otherwise BIR may treat collections as taxable income.");
      result.accountingConsequences.push("May be recorded as receivable/payable instead of income if entity acts only as collecting/settling party.");
      result.auditRisks.push("Risk of improper gross-up or improper offsetting without support.");
      break;

    case CHARACTERIZATION_TYPES.PASS_THROUGH:
      result.taxConsequences.push("Pass-through treatment requires proof that the entity has no beneficial ownership of the amount.");
      result.accountingConsequences.push("Generally not revenue if collected for another party and remitted without control or margin.");
      result.birRisks.push("BIR may challenge if invoices are under taxpayer’s name or amounts are commingled.");
      break;

    case CHARACTERIZATION_TYPES.BUNDLED_PACKAGE:
      result.taxConsequences.push("Bundled consideration may require allocation for VAT, withholding, and income tax analysis.");
      result.accountingConsequences.push("Assess whether there are separate performance obligations under PFRS 15.");
      result.auditRisks.push("Risk of wrong revenue allocation between principal service and third-party component.");
      break;

    case CHARACTERIZATION_TYPES.FINANCING:
      result.taxConsequences.push("Interest income/expense and withholding tax implications should be evaluated.");
      result.accountingConsequences.push("Classify as financial asset/liability unless substance supports another treatment.");
      break;

    case CHARACTERIZATION_TYPES.EQUITY:
      result.taxConsequences.push("Equity treatment depends on legal issuance, approvals, and absence of repayment obligation.");
      result.accountingConsequences.push("Assess PAS 32 / applicable PFRS equity-versus-liability classification.");
      break;

    case CHARACTERIZATION_TYPES.MIXED:
      result.taxConsequences.push("Separate components may require different tax treatments.");
      result.accountingConsequences.push("Allocate consideration based on legal obligations, economic substance, and performance obligations.");
      result.birRisks.push("High risk if taxpayer applies one treatment to all components without support.");
      result.auditRisks.push("High risk of classification, cut-off, revenue recognition, and disclosure misstatement.");
      break;

    default:
      result.taxConsequences.push("Tax treatment cannot be finalized without additional facts and documents.");
      result.accountingConsequences.push("Accounting treatment cannot be finalized without transaction documents and flow analysis.");
      result.birRisks.push("High risk of unsupported tax position.");
      result.auditRisks.push("High risk of unsupported accounting position.");
  }

  if (principalAgentPosition.position === "PRINCIPAL") {
    result.accountingConsequences.push("Principal indicators support gross presentation, subject to verification.");
  }

  if (principalAgentPosition.position === "AGENT") {
    result.accountingConsequences.push("Agent indicators support net presentation, subject to verification.");
  }

  return result;
}

function determineRiskLevel(classification, text, principalAgentPosition) {
  let risk = 0;

  if (classification.type === CHARACTERIZATION_TYPES.MIXED) risk += 3;
  if (classification.type === CHARACTERIZATION_TYPES.UNRESOLVED) risk += 4;

  if (includesAny(text, ["vat", "output vat", "input vat", "withholding", "bir"])) risk += 2;
  if (includesAny(text, ["audit", "afs", "pfrs", "financial statements"])) risk += 2;
  if (includesAny(text, ["contract", "agreement", "no agreement", "without agreement"])) risk += 2;
  if (includesAny(text, ["gross", "net", "principal", "agent", "reimbursement", "pass-through"])) risk += 2;

  if (principalAgentPosition.position === "UNRESOLVED_PRINCIPAL_AGENT") risk += 1;

  if (risk >= 6) return RISK_LEVEL.HIGH;
  if (risk >= 3) return RISK_LEVEL.MEDIUM;
  return RISK_LEVEL.LOW;
}

function identifyRequiredDocuments(classification, text) {
  const docs = new Set();

  docs.add("Written contract or agreement, including amendments");
  docs.add("Invoices, official receipts, billing statements, and collection receipts");
  docs.add("General ledger and subsidiary ledger entries");
  docs.add("Actual flow of funds schedule");

  if (includesAny(text, ["vat", "withholding", "bir", "tax"])) {
    docs.add("VAT returns, withholding tax returns, and related tax schedules");
  }

  if (includesAny(text, ["principal", "agent", "gross", "net", "commission", "margin"])) {
    docs.add("Principal-agent analysis memo");
    docs.add("Evidence of who controls pricing, service delivery, customer relationship, and credit risk");
  }

  if (classification.type === CHARACTERIZATION_TYPES.BUNDLED_PACKAGE || includesAny(text, ["bundle", "package", "inclusive"])) {
    docs.add("Allocation schedule for bundled consideration");
    docs.add("Basis for identifying separate performance obligations");
  }

  if (classification.type === CHARACTERIZATION_TYPES.REIMBURSEMENT || classification.type === CHARACTERIZATION_TYPES.PASS_THROUGH) {
    docs.add("Liquidation reports and third-party supplier billings");
    docs.add("Proof of remittance or settlement to third party");
    docs.add("Evidence that no beneficial ownership or margin exists, unless margin is separately recognized");
  }

  if (classification.type === CHARACTERIZATION_TYPES.LEASE || classification.type === CHARACTERIZATION_TYPES.CONCESSION) {
    docs.add("Lease/concession terms, floor area/use rights, rent or percentage fee computation");
    docs.add("Evidence of possession, control, and right to operate");
  }

  if (classification.type === CHARACTERIZATION_TYPES.FINANCING) {
    docs.add("Loan agreement, promissory note, repayment schedule, and interest computation");
  }

  if (classification.type === CHARACTERIZATION_TYPES.EQUITY) {
    docs.add("Subscription agreement, board approval, SEC filings, and proof of share issuance or approval");
  }

  return [...docs];
}

function buildConclusion(classification, riskLevel) {
  if (classification.type === CHARACTERIZATION_TYPES.UNRESOLVED) {
    return "The transaction cannot be conclusively characterized based on the available facts. Further documents and fact verification are required.";
  }

  if (classification.type === CHARACTERIZATION_TYPES.MIXED) {
    return "The transaction appears to be a mixed transaction. Each component should be separately analyzed for tax, accounting, billing, and audit presentation.";
  }

  return `The transaction is preliminarily characterized as ${classification.type}. This conclusion is subject to verification of the contract, billing documents, flow of funds, actual conduct of the parties, and applicable tax/accounting evidence.`;
}

function characterizeTransaction(input, options = {}) {
  const text = getFactText(input) || normalizeText(options.text);
  const scores = scoreCharacterizations(text);
  const classification = determinePrimaryClassification(scores);
  const economicSubstance = analyzeEconomicSubstance(text);
  const principalAgentPosition = determinePrincipalAgentPosition(text);
  const consequences = identifyTaxAccountingConsequences(classification, principalAgentPosition);
  const riskLevel = determineRiskLevel(classification, text, principalAgentPosition);
  const requiredDocuments = identifyRequiredDocuments(classification, text);

  return {
    engine: "TINA_TRANSACTION_CHARACTERIZATION_ENGINE",
    version: "1.0.0",
    primaryCharacterization: classification.type,
    confidence: classification.confidence,
    riskLevel,
    basisSignals: classification.basis,
    allScores: scores,
    principalAgentAnalysis: principalAgentPosition,
    economicSubstanceAnalysis: economicSubstance,
    taxConsequences: consequences.taxConsequences,
    accountingConsequences: consequences.accountingConsequences,
    birRisks: consequences.birRisks,
    auditRisks: consequences.auditRisks,
    requiredDocuments,
    alternativeCharacterizations:
      classification.type === CHARACTERIZATION_TYPES.MIXED
        ? classification.basis.map((x) => x.type)
        : classification.basis.filter((x) => x.type !== classification.type).map((x) => x.type),
    preliminaryConclusion: buildConclusion(classification, riskLevel),
    limitationStatement:
      "Based on the available facts, the position is preliminary and subject to verification."
  };
}

function buildTransactionCharacterizationInstruction(result) {
  if (!result || result.engine !== "TINA_TRANSACTION_CHARACTERIZATION_ENGINE") {
    throw new Error("Invalid transaction characterization result supplied.");
  }

  return {
    instruction: [
      "Use the transaction characterization result as the transaction analysis foundation.",
      "Do not rely only on labels used by the parties; compare legal form against economic substance.",
      "Analyze the flow of money, flow of goods/services, control, risk, margin, invoicing, and documentation.",
      "If principal-agent indicators are unresolved, do not give a final gross/net revenue conclusion.",
      "If the transaction is mixed, analyze each component separately.",
      `Primary characterization: ${result.primaryCharacterization}.`,
      `Risk level: ${result.riskLevel}.`,
      `Required limitation: ${result.limitationStatement}`
    ],
    result
  };
}

export {
  CHARACTERIZATION_TYPES,
  CONFIDENCE,
  RISK_LEVEL,
  characterizeTransaction,
  buildTransactionCharacterizationInstruction
};
