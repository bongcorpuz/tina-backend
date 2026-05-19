// FILE: main-tax-engine-classification.js
// TINA Main Tax Engine Classification Orchestrator
// ESM-compatible | Production-safe | Backward-compatible

// ── Tax-Engine Domain Integration Bridge ──────────────────────────────────────
// Imports fully-populated domain-configs from tax-engines/ and merges them
// into the live domain registry so issue classification uses authoritative data.
// Only the VAT domain-config is currently implemented; other domain stubs are
// skipped until populated. Add new imports here as each domain is built out.

import { VAT_DOMAIN } from "./tax-engines/VAT/domain-config.js";

// Build the merged domain map: inline TAX_DOMAINS entries are overridden by
// authoritative tax-engine configs wherever both exist.
function buildMergedDomainRegistry(inlineDomains, ...engineConfigs) {
  const merged = { ...inlineDomains };
  for (const cfg of engineConfigs) {
    if (cfg && cfg.code) {
      merged[cfg.code] = {
        ...merged[cfg.code],
        ...cfg,
        subIssues: {
          ...(merged[cfg.code]?.subIssues || {}),
          ...(cfg.subIssues || {})
        }
      };
    }
  }
  return Object.freeze(merged);
}

export const MAIN_TAX_ENGINE_VERSION = "1.0.0";

export const TAX_AUTHORITY_HIERARCHY = Object.freeze([
  "CONSTITUTION",
  "NIRC",
  "REPUBLIC_ACT",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "REVENUE_REGULATION",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING",
  "LGU_ISSUANCE",
  "BOC_ISSUANCE",
  "TAX_TREATY",
  "OECD_GUIDANCE",
  "SECONDARY_SOURCE"
]);

// Inline fallback definitions — overridden by tax-engines/ domain-configs via buildMergedDomainRegistry()
const _INLINE_TAX_DOMAINS = {
  VAT: {
    code: "VAT",
    name: "Value-Added Tax",
    primaryStatutes: ["NIRC Secs. 105-115", "RR 16-2005"],
    defaultAuthorities: ["NIRC", "REVENUE_REGULATION", "SUPREME_COURT", "RMC"],
    subIssues: {
      VAT_REGISTRATION: ["registration", "vat registration", "threshold", "3 million", "vat taxpayer"],
      VAT_EXEMPTIONS: ["vat exempt", "exemption", "section 109", "non-vat", "exempt sale"],
      ZERO_RATED: ["zero-rated", "zero rated", "export", "foreign currency", "cross-border service"],
      INPUT_VAT: ["input vat", "input tax", "creditable input", "excess input"],
      OUTPUT_VAT: ["output vat", "output tax", "vat on sales", "vatable sales"],
      VAT_REFUNDS: ["vat refund", "input vat refund", "tax credit certificate", "tcc"],
      VAT_INVOICING: ["invoice", "official receipt", "sales invoice", "e-invoice", "invoicing"],
      VAT_TIMING: ["time of sale", "timing", "accrual", "payment", "taxable quarter"],
      VAT_CROSS_BORDER: ["cross-border", "nonresident", "foreign service", "offshore"],
      VAT_SPECIAL_TRANSACTIONS: ["deemed sale", "consignment", "advance payment", "reimbursement", "pass-through"]
    }
  },

  CIT: {
    code: "CIT",
    name: "Corporate Income Tax",
    primaryStatutes: ["NIRC Secs. 27-28", "CREATE Act, R.A. 11534"],
    defaultAuthorities: ["NIRC", "REPUBLIC_ACT", "REVENUE_REGULATION", "SUPREME_COURT", "RMC"],
    subIssues: {
      GROSS_INCOME: ["gross income", "taxable income", "income recognition"],
      DEDUCTIONS: ["deduction", "ordinary and necessary", "substantiation", "non-deductible"],
      NOLCO: ["nolco", "net operating loss", "loss carry-over", "carry over"],
      MCIT: ["mcit", "minimum corporate income tax", "2%", "1%"],
      RCIT: ["rcit", "regular corporate income tax", "25%", "20%"],
      CWT_TAX_CREDITS: ["cwt", "creditable withholding tax", "prior year tax credit", "excess credits"],
      RELATED_PARTY: ["related party", "intercompany", "transfer pricing", "arm's length"],
      FINAL_TAX: ["final tax", "interest income", "passive income"],
      IMPROPER_ACCUMULATION: ["improperly accumulated", "iaet"],
      TAX_RECONCILIATION: ["tax reconciliation", "income tax expense", "deferred tax", "pas 12"]
    }
  },

  IIT: {
    code: "IIT",
    name: "Individual Income Tax",
    primaryStatutes: ["NIRC Secs. 24-26", "TRAIN Law, R.A. 10963"],
    defaultAuthorities: ["NIRC", "REPUBLIC_ACT", "REVENUE_REGULATION", "RMC"],
    subIssues: {
      COMPENSATION: ["compensation", "salary", "wages", "13th month"],
      BUSINESS_INCOME: ["self-employed", "professional", "business income"],
      MIXED_INCOME: ["mixed income", "compensation and business"],
      GRADUATED_RATES: ["graduated rates", "tax table"],
      EIGHT_PERCENT: ["8%", "eight percent", "optional 8 percent"],
      FRINGE_BENEFIT: ["fringe benefit", "fbt"],
      FINAL_TAX: ["final withholding", "passive income"],
      NONRESIDENT: ["nonresident alien", "foreign individual"],
      EXEMPTIONS: ["de minimis", "tax exempt compensation"],
      FILING_PAYMENT: ["1701", "filing", "payment", "annual income tax"]
    }
  },

  WHT: {
    code: "WHT",
    name: "Withholding Tax",
    primaryStatutes: ["NIRC Secs. 57-58", "NIRC Secs. 79-83", "RR 2-98"],
    defaultAuthorities: ["NIRC", "REVENUE_REGULATION", "RMC", "SUPREME_COURT"],
    subIssues: {
      EWT: ["ewt", "expanded withholding", "creditable withholding"],
      FWT: ["final withholding", "fwt"],
      COMPENSATION_WHT: ["withholding on compensation", "payroll withholding"],
      WITHHOLDING_AGENT: ["withholding agent", "obligation to withhold"],
      TIMING: ["when to withhold", "accrual", "payment", "whichever comes first"],
      RATES: ["withholding rate", "rate", "atc"],
      NON_WITHHOLDING: ["failure to withhold", "non-withholding", "disallowance"],
      REMITTANCE_RETURNS: ["1601", "0619", "1604", "alphalist", "remittance"]
    }
  },

  EST: {
    code: "EST",
    name: "Estate and Donor's Tax",
    primaryStatutes: ["NIRC Secs. 84-104", "TRAIN Law", "RR 12-2018"],
    defaultAuthorities: ["NIRC", "REPUBLIC_ACT", "REVENUE_REGULATION", "RMC"],
    subIssues: {
      ESTATE_TAX: ["estate tax", "gross estate", "net estate"],
      DONOR_TAX: ["donor tax", "donation", "gift tax"],
      DEDUCTIONS: ["estate deduction", "standard deduction", "claims against estate"],
      FAMILY_HOME: ["family home"],
      VANISHING_DEDUCTION: ["vanishing deduction"],
      FILING_PAYMENT: ["estate tax return", "donor tax return", "filing"],
      EXTRAJUDICIAL_SETTLEMENT: ["extrajudicial settlement", "estate settlement"]
    }
  },

  PCT: {
    code: "PCT",
    name: "Percentage Tax",
    primaryStatutes: ["NIRC Secs. 116-128", "RR 9-2021"],
    defaultAuthorities: ["NIRC", "REVENUE_REGULATION", "RMC"],
    subIssues: {
      THREE_PERCENT: ["percentage tax", "3%", "section 116"],
      NON_VAT_TAXPAYER: ["non-vat", "below vat threshold"],
      COMMON_CARRIER: ["common carrier"],
      BANKS_FINANCE: ["bank", "finance company"],
      FILING_PAYMENT: ["2551q", "percentage tax return"],
      EXEMPTIONS: ["percentage tax exemption"]
    }
  },

  EXC: {
    code: "EXC",
    name: "Excise Tax",
    primaryStatutes: ["NIRC Secs. 129-172", "TRAIN Law", "Sin Tax Laws"],
    defaultAuthorities: ["NIRC", "REPUBLIC_ACT", "REVENUE_REGULATION", "RMC"],
    subIssues: {
      ALCOHOL_TOBACCO: ["alcohol", "tobacco", "sin tax"],
      PETROLEUM: ["petroleum", "fuel", "diesel", "gasoline"],
      SWEETENED_BEVERAGES: ["sweetened beverage"],
      MINERALS: ["mineral", "mining"],
      AUTOMOBILE: ["automobile", "vehicle excise"],
      FILING_PAYMENT: ["excise return", "removal", "payment"]
    }
  },

  PRE: {
    code: "PRE",
    name: "Prescription and Assessment",
    primaryStatutes: ["NIRC Secs. 203", "NIRC Secs. 222-228", "CTA Rules"],
    defaultAuthorities: ["NIRC", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "REVENUE_REGULATION", "RMC"],
    subIssues: {
      THREE_YEAR_PERIOD: ["three-year", "3-year", "ordinary prescription", "section 203"],
      TEN_YEAR_PERIOD: ["ten-year", "10-year", "fraud", "false return", "failure to file"],
      WAIVER: ["waiver", "statute of limitations"],
      LOA: ["letter of authority", "loa"],
      PAN_FAN: ["pan", "fan", "preliminary assessment", "final assessment"],
      FDDA: ["fdda", "final decision on disputed assessment"],
      DUE_PROCESS: ["due process", "assessment notice"],
      COLLECTION: ["collection", "warrant", "distraint", "levy"]
    }
  },

  DIS: {
    code: "DIS",
    name: "Dispute Resolution",
    primaryStatutes: ["NIRC Secs. 204", "NIRC Secs. 228-231", "R.A. 9282"],
    defaultAuthorities: ["NIRC", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "REVENUE_REGULATION"],
    subIssues: {
      PROTEST: ["protest", "request for reconsideration", "request for reinvestigation"],
      ADMIN_APPEAL: ["administrative appeal", "commissioner"],
      CTA_APPEAL: ["cta", "court of tax appeals"],
      REFUND_CLAIM: ["refund", "tax credit", "claim for refund"],
      COMPROMISE_ABATEMENT: ["compromise", "abatement"],
      COLLECTION_REMEDIES: ["collection", "levy", "distraint"],
      JURISDICTION: ["jurisdiction", "appeal period"],
      EVIDENCE_BURDEN: ["burden of proof", "evidence", "substantiation"]
    }
  },

  LGT: {
    code: "LGT",
    name: "Local Government Tax",
    primaryStatutes: ["Local Government Code, R.A. 7160", "Supreme Court Jurisprudence"],
    defaultAuthorities: ["REPUBLIC_ACT", "SUPREME_COURT", "LGU_ISSUANCE"],
    subIssues: {
      LOCAL_BUSINESS_TAX: ["local business tax", "lbt", "mayor's permit"],
      REAL_PROPERTY_TAX: ["real property tax", "rpt"],
      TRANSFER_TAX: ["local transfer tax"],
      SITUS: ["situs", "branch", "principal office"],
      LGU_ASSESSMENT: ["lgu assessment", "local treasurer"],
      REMEDIES: ["local tax protest", "appeal", "refund"]
    }
  },

  CUS: {
    code: "CUS",
    name: "Customs and Tariff",
    primaryStatutes: ["CMTA, R.A. 10863", "BOC Regulations"],
    defaultAuthorities: ["REPUBLIC_ACT", "BOC_ISSUANCE", "SUPREME_COURT", "CTA_EN_BANC"],
    subIssues: {
      IMPORT_DUTIES: ["customs duty", "import duty", "tariff"],
      CLASSIFICATION: ["tariff classification", "hs code"],
      VALUATION: ["customs valuation", "transaction value"],
      POST_CLEARANCE: ["post clearance audit", "pca"],
      SEIZURE_FORFEITURE: ["seizure", "forfeiture", "smuggling"]
    }
  },

  SPC: {
    code: "SPC",
    name: "Transfer Pricing and Special Tax Regimes",
    primaryStatutes: ["RR 2-2013", "CREATE Act", "PEZA", "OECD Guidelines"],
    defaultAuthorities: ["REVENUE_REGULATION", "REPUBLIC_ACT", "RMC", "OECD_GUIDANCE"],
    subIssues: {
      TRANSFER_PRICING: ["transfer pricing", "arm's length", "related party"],
      DOCUMENTATION: ["tp documentation", "local file", "master file"],
      PEZA_INCENTIVES: ["peza", "income tax holiday", "5% git"],
      CREATE_INCENTIVES: ["create incentives", "scit", "edr"],
      TREATY_RELIEF: ["tax treaty", "trc", "relief from double taxation"],
      INTERNATIONAL_TAX: ["permanent establishment", "withholding on nonresident"]
    }
  },

  CON: {
    code: "CON",
    name: "Constitutional Tax Issues",
    primaryStatutes: ["1987 Philippine Constitution", "Supreme Court En Banc Jurisprudence"],
    defaultAuthorities: ["CONSTITUTION", "SUPREME_COURT"],
    subIssues: {
      DUE_PROCESS: ["constitutional due process", "procedural due process"],
      EQUAL_PROTECTION: ["equal protection"],
      NON_IMPAIRMENT: ["non-impairment"],
      UNIFORMITY_EQUITY: ["uniformity", "equity in taxation"],
      NON_DELEGATION: ["non-delegation"],
      TAX_EXEMPTION: ["constitutional exemption", "religious", "charitable"],
      LOCAL_AUTONOMY: ["local autonomy", "power to tax"]
    }
  }
};

// Merge inline defaults with authoritative tax-engine domain configs.
// VAT_DOMAIN from tax-engines/VAT/domain-config.js overrides the inline VAT entry.
// Add new domain imports to this call when each domain-config is populated.
export const TAX_DOMAINS = buildMergedDomainRegistry(_INLINE_TAX_DOMAINS, VAT_DOMAIN);

const LEGAL_DIMENSION_RULES = Object.freeze({
  substantive: [
    "taxable",
    "exempt",
    "gross income",
    "deduction",
    "vatable",
    "zero-rated",
    "income tax",
    "output vat",
    "input vat"
  ],
  procedural: [
    "filing",
    "appeal",
    "protest",
    "assessment",
    "refund",
    "prescription",
    "deadline",
    "period",
    "notice",
    "loa",
    "pan",
    "fan",
    "fdda"
  ],
  compliance: [
    "return",
    "invoice",
    "receipt",
    "withhold",
    "remit",
    "alphalist",
    "bir form",
    "registration",
    "bookkeeping"
  ],
  litigation: [
    "cta",
    "supreme court",
    "case",
    "jurisprudence",
    "doctrine",
    "burden of proof",
    "appeal"
  ],
  accounting: [
    "pfrs",
    "pas",
    "afs",
    "revenue recognition",
    "accrual",
    "deferred tax",
    "tax expense",
    "journal entry"
  ],
  audit: [
    "audit",
    "working paper",
    "evidence",
    "substantiation",
    "reconciliation",
    "confirmation",
    "risk"
  ],
  economicSubstance: [
    "economic substance",
    "substance over form",
    "beneficial owner",
    "commercial purpose",
    "sham",
    "recharacterization"
  ],
  transactionCharacterization: [
    "principal",
    "agent",
    "reimbursement",
    "pass-through",
    "lease",
    "concession",
    "service",
    "sale",
    "bundle",
    "related party"
  ]
});

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^\w\s%.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueArray(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function scoreKeywordSet(text, keywords = []) {
  let score = 0;
  const matched = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (text.includes(normalizedKeyword)) {
      matched.push(keyword);
      score += normalizedKeyword.length > 8 ? 2 : 1;
    }
  }

  return { score, matched };
}

function detectLegalDimensions(normalizedQuery) {
  const detected = [];

  for (const [dimension, keywords] of Object.entries(LEGAL_DIMENSION_RULES)) {
    const result = scoreKeywordSet(normalizedQuery, keywords);
    if (result.score > 0) {
      detected.push({
        dimension,
        score: result.score,
        matchedTerms: result.matched
      });
    }
  }

  detected.sort((a, b) => b.score - a.score);

  return detected;
}

function classifyDomain(query, priorClassification = {}) {
  const normalizedQuery = normalizeText(query);

  const candidates = [];

  for (const domain of Object.values(TAX_DOMAINS)) {
    let domainScore = 0;
    const matchedSubIssues = [];

    const domainNameScore = scoreKeywordSet(normalizedQuery, [
      domain.code,
      domain.name,
      ...domain.primaryStatutes
    ]);

    domainScore += domainNameScore.score;

    for (const [subIssueCode, keywords] of Object.entries(domain.subIssues)) {
      const subIssueScore = scoreKeywordSet(normalizedQuery, keywords);

      if (subIssueScore.score > 0) {
        matchedSubIssues.push({
          code: subIssueCode,
          score: subIssueScore.score,
          matchedTerms: subIssueScore.matched
        });

        domainScore += subIssueScore.score;
      }
    }

    if (
      priorClassification?.primaryDomain &&
      normalizeText(priorClassification.primaryDomain) === normalizeText(domain.code)
    ) {
      domainScore += 5;
    }

    if (
      priorClassification?.domain &&
      normalizeText(priorClassification.domain) === normalizeText(domain.code)
    ) {
      domainScore += 5;
    }

    if (
      priorClassification?.primaryIssue &&
      normalizeText(priorClassification.primaryIssue).includes(normalizeText(domain.code))
    ) {
      domainScore += 2;
    }

    if (domainScore > 0) {
      matchedSubIssues.sort((a, b) => b.score - a.score);

      candidates.push({
        domain,
        score: domainScore,
        matchedSubIssues
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

function inferRetrievalStrategy(domainCode, subIssueCode, legalDimensions = []) {
  const dimensionNames = legalDimensions.map((item) => item.dimension);

  if (dimensionNames.includes("litigation")) {
    return `${domainCode}_JURISPRUDENCE_FIRST`;
  }

  if (dimensionNames.includes("procedural")) {
    return `${domainCode}_PROCEDURAL_AUTHORITY_FIRST`;
  }

  if (dimensionNames.includes("accounting") || dimensionNames.includes("audit")) {
    return `${domainCode}_TAX_ACCOUNTING_AUDIT_ALIGNMENT`;
  }

  if (dimensionNames.includes("economicSubstance")) {
    return `${domainCode}_SUBSTANCE_OVER_FORM_ANALYSIS`;
  }

  if (dimensionNames.includes("transactionCharacterization")) {
    return `${domainCode}_TRANSACTION_CHARACTERIZATION_FIRST`;
  }

  if (subIssueCode) {
    return `${domainCode}_${subIssueCode}_ISSUE_SPECIFIC`;
  }

  return `${domainCode}_GENERAL_AUTHORITY_FIRST`;
}

function inferRequiredEngines(legalDimensions = [], domainCode = "") {
  const dimensionNames = legalDimensions.map((item) => item.dimension);

  const engines = [
    "issue-classification-engine.js",
    "retrieval-engine.js",
    "reranker-engine.js",
    "authority-engine.js",
    "provision-citation-engine.js"
  ];

  if (dimensionNames.includes("litigation")) {
    engines.push("jurisprudence-engine.js", "case-analysis-engine.js");
  }

  if (
    dimensionNames.includes("litigation") ||
    dimensionNames.includes("substantive") ||
    dimensionNames.includes("procedural")
  ) {
    engines.push("doctrinal-engine.js", "doctrine-tagging-engine.js");
  }

  if (
    dimensionNames.includes("economicSubstance") ||
    dimensionNames.includes("transactionCharacterization")
  ) {
    engines.push(
      "transaction-characterization-engine.js",
      "economic-substance-engine.js",
      "evidence-evaluation-engine.js"
    );
  }

  if (dimensionNames.includes("audit") || dimensionNames.includes("accounting")) {
    engines.push("evidence-evaluation-engine.js", "risk-scoring-engine.js");
  }

  if (["PRE", "DIS", "CON"].includes(domainCode)) {
    engines.push("conflict-engine.js", "legal-validation-engine.js");
  }

  engines.push("adaptive-response-planner.js", "answer-renderer.js");

  return uniqueArray(engines);
}

function inferRiskFlags(domainCode, subIssueCode, legalDimensions = []) {
  const flags = [];
  const dimensionNames = legalDimensions.map((item) => item.dimension);

  if (dimensionNames.includes("procedural")) {
    flags.push("STRICT_DEADLINE_OR_PROCEDURAL_PERIOD_CHECK_REQUIRED");
  }

  if (dimensionNames.includes("litigation")) {
    flags.push("JURISPRUDENCE_RELEVANCE_AND_DOCTRINAL_STATUS_CHECK_REQUIRED");
  }

  if (dimensionNames.includes("accounting")) {
    flags.push("TAX_ACCOUNTING_ALIGNMENT_REQUIRED");
  }

  if (dimensionNames.includes("audit")) {
    flags.push("EVIDENCE_AND_SUBSTANTIATION_CHECK_REQUIRED");
  }

  if (dimensionNames.includes("transactionCharacterization")) {
    flags.push("FORM_VS_SUBSTANCE_AND_PRINCIPAL_AGENT_CHECK_REQUIRED");
  }

  if (domainCode === "VAT" && ["INPUT_VAT", "VAT_REFUNDS", "ZERO_RATED"].includes(subIssueCode)) {
    flags.push("VAT_STRICT_COMPLIANCE_DOCUMENTATION_REQUIRED");
  }

  if (domainCode === "CIT" && ["DEDUCTIONS", "NOLCO", "MCIT", "CWT_TAX_CREDITS"].includes(subIssueCode)) {
    flags.push("CIT_COMPUTATION_AND_SUPPORTING_SCHEDULE_CHECK_REQUIRED");
  }

  if (domainCode === "WHT" && ["EWT", "TIMING", "NON_WITHHOLDING"].includes(subIssueCode)) {
    flags.push("WITHHOLDING_TIMING_AND_DEDUCTIBILITY_RISK_CHECK_REQUIRED");
  }

  if (["PRE", "DIS"].includes(domainCode)) {
    flags.push("ASSESSMENT_PROTEST_APPEAL_PERIOD_VALIDATION_REQUIRED");
  }

  return uniqueArray(flags);
}

function computeConfidence(topCandidate, secondCandidate) {
  if (!topCandidate) return 0;

  const top = topCandidate.score || 0;
  const second = secondCandidate?.score || 0;

  if (top <= 0) return 0;

  const separation = Math.max(top - second, 0);
  const base = Math.min(0.55 + top / 25, 0.9);
  const separationBoost = Math.min(separation / 20, 0.1);

  return Number(Math.min(base + separationBoost, 0.99).toFixed(2));
}

function buildFallbackClassification(query, priorClassification = {}) {
  const normalizedQuery = normalizeText(query);
  const legalDimensions = detectLegalDimensions(normalizedQuery);

  return {
    engine: "main-tax-engine-classification.js",
    version: MAIN_TAX_ENGINE_VERSION,
    status: "UNCLASSIFIED",
    primaryDomain: priorClassification?.primaryDomain || priorClassification?.domain || "GENERAL_TAX",
    primaryDomainName: "General Philippine Taxation",
    primaryIssue: priorClassification?.primaryIssue || "GENERAL_TAX_ISSUE",
    subIssues: [],
    governingStatutes: [],
    targetAuthorities: ["NIRC", "REVENUE_REGULATION", "RMC", "SUPREME_COURT"],
    authorityHierarchy: TAX_AUTHORITY_HIERARCHY,
    legalDimensions: legalDimensions.map((item) => item.dimension),
    legalDimensionDetails: legalDimensions,
    retrievalStrategy: "GENERAL_TAX_AUTHORITY_FIRST",
    requiredEngines: inferRequiredEngines(legalDimensions, "GENERAL_TAX"),
    riskFlags: ["LOW_CONFIDENCE_DOMAIN_CLASSIFICATION_REQUIRES_CAREFUL_RETRIEVAL"],
    classificationSignals: {
      matchedTerms: [],
      candidateDomains: []
    },
    confidence: 0.35,
    backwardCompatible: true,
    originalIssueClassification: priorClassification || null
  };
}

export function classifyMainTaxDomain(input = {}) {
  const query =
    typeof input === "string"
      ? input
      : input.query || input.userQuery || input.question || input.text || "";

  const priorClassification =
    typeof input === "object" && input !== null
      ? input.issueClassification || input.priorClassification || input.classification || {}
      : {};

  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return buildFallbackClassification("", priorClassification);
  }

  const legalDimensions = detectLegalDimensions(normalizedQuery);
  const candidates = classifyDomain(query, priorClassification);

  const topCandidate = candidates[0];
  const secondCandidate = candidates[1];

  if (!topCandidate) {
    return buildFallbackClassification(query, priorClassification);
  }

  const domain = topCandidate.domain;
  const primarySubIssue = topCandidate.matchedSubIssues[0] || null;

  const subIssues = topCandidate.matchedSubIssues.map((item) => item.code);
  const primaryIssue =
    priorClassification?.primaryIssue ||
    primarySubIssue?.code ||
    `${domain.code}_GENERAL`;

  const retrievalStrategy = inferRetrievalStrategy(
    domain.code,
    primarySubIssue?.code,
    legalDimensions
  );

  const requiredEngines = inferRequiredEngines(legalDimensions, domain.code);
  const riskFlags = inferRiskFlags(domain.code, primarySubIssue?.code, legalDimensions);
  const confidence = computeConfidence(topCandidate, secondCandidate);

  return {
    engine: "main-tax-engine-classification.js",
    version: MAIN_TAX_ENGINE_VERSION,
    status: confidence >= 0.7 ? "CLASSIFIED" : "LOW_CONFIDENCE_CLASSIFIED",

    primaryDomain: domain.code,
    primaryDomainName: domain.name,
    primaryIssue,
    primarySubIssue: primarySubIssue?.code || null,
    subIssues,

    governingStatutes: domain.primaryStatutes,
    targetAuthorities: domain.defaultAuthorities,
    authorityHierarchy: TAX_AUTHORITY_HIERARCHY,

    legalDimensions: legalDimensions.map((item) => item.dimension),
    legalDimensionDetails: legalDimensions,

    retrievalStrategy,
    requiredEngines,
    riskFlags,

    routing: {
      shouldUseIssueSpecificRetrieval: true,
      shouldApplyAuthorityHierarchy: true,
      shouldApplySupersessionCheck: true,
      shouldApplyConflictCheck:
        legalDimensions.some((item) =>
          ["litigation", "procedural", "substantive"].includes(item.dimension)
        ) || ["PRE", "DIS", "CON"].includes(domain.code),
      shouldUseJurisprudence:
        legalDimensions.some((item) => item.dimension === "litigation") ||
        ["PRE", "DIS", "CON"].includes(domain.code),
      shouldUseDoctrineTagging: true,
      shouldUseProvisionCitation: true,
      shouldUseLegalValidation: true,
      shouldUseRiskScoring: riskFlags.length > 0,
      shouldUseEvidenceEvaluation:
        legalDimensions.some((item) =>
          ["audit", "accounting", "transactionCharacterization", "economicSubstance"].includes(
            item.dimension
          )
        )
    },

    retrievalHints: {
      domainCode: domain.code,
      domainName: domain.name,
      primarySubIssue: primarySubIssue?.code || null,
      subIssues,
      preferredAuthorities: domain.defaultAuthorities,
      statutes: domain.primaryStatutes,
      strategy: retrievalStrategy,
      boostTerms: uniqueArray([
        domain.code,
        domain.name,
        ...domain.primaryStatutes,
        ...(primarySubIssue?.matchedTerms || [])
      ])
    },

    classificationSignals: {
      matchedTerms: uniqueArray(
        topCandidate.matchedSubIssues.flatMap((item) => item.matchedTerms)
      ),
      candidateDomains: candidates.slice(0, 5).map((candidate) => ({
        code: candidate.domain.code,
        name: candidate.domain.name,
        score: candidate.score,
        matchedSubIssues: candidate.matchedSubIssues.map((item) => ({
          code: item.code,
          score: item.score,
          matchedTerms: item.matchedTerms
        }))
      }))
    },

    confidence,
    backwardCompatible: true,
    originalIssueClassification: priorClassification || null
  };
}

export function enrichIssueClassification(issueClassification = {}, query = "") {
  const enriched = classifyMainTaxDomain({
    query:
      query ||
      issueClassification.query ||
      issueClassification.userQuery ||
      issueClassification.question ||
      "",
    issueClassification
  });

  return {
    ...issueClassification,
    taxDomainClassification: enriched,
    primaryDomain: issueClassification.primaryDomain || enriched.primaryDomain,
    primaryIssue: issueClassification.primaryIssue || enriched.primaryIssue,
    subIssue: issueClassification.subIssue || enriched.primarySubIssue,
    subIssues: issueClassification.subIssues || enriched.subIssues,
    targetAuthorities: issueClassification.targetAuthorities || enriched.targetAuthorities,
    retrievalStrategy: issueClassification.retrievalStrategy || enriched.retrievalStrategy,
    legalDimensions: issueClassification.legalDimensions || enriched.legalDimensions,
    confidence: Math.max(issueClassification.confidence || 0, enriched.confidence || 0)
  };
}

export function getTaxDomainRegistry() {
  return TAX_DOMAINS;
}

export function getTaxAuthorityHierarchy() {
  return TAX_AUTHORITY_HIERARCHY;
}

export function getDomainByCode(code = "") {
  const normalizedCode = String(code).toUpperCase().trim();
  return TAX_DOMAINS[normalizedCode] || null;
}

export function listTaxDomains() {
  return Object.values(TAX_DOMAINS).map((domain) => ({
    code: domain.code,
    name: domain.name,
    primaryStatutes: domain.primaryStatutes,
    subIssues: Object.keys(domain.subIssues),
    defaultAuthorities: domain.defaultAuthorities
  }));
}

export function validateTaxDomainClassification(classification = {}) {
  const errors = [];
  const warnings = [];

  if (!classification.primaryDomain) {
    errors.push("Missing primaryDomain.");
  }

  if (classification.primaryDomain && !TAX_DOMAINS[classification.primaryDomain]) {
    warnings.push(`Unknown primaryDomain: ${classification.primaryDomain}`);
  }

  if (!classification.retrievalStrategy) {
    warnings.push("Missing retrievalStrategy.");
  }

  if (!Array.isArray(classification.targetAuthorities)) {
    warnings.push("targetAuthorities should be an array.");
  }

  if (!Array.isArray(classification.legalDimensions)) {
    warnings.push("legalDimensions should be an array.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  MAIN_TAX_ENGINE_VERSION,
  TAX_DOMAINS,
  TAX_AUTHORITY_HIERARCHY,
  classifyMainTaxDomain,
  enrichIssueClassification,
  getTaxDomainRegistry,
  getTaxAuthorityHierarchy,
  getDomainByCode,
  listTaxDomains,
  validateTaxDomainClassification
};
