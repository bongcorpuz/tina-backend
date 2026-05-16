// FILE: tax-engines/shared/domain-registry.js
"use strict";

/**
 * TINA Shared Tax Domain Registry
 * Version: 1.0.0
 *
 * Purpose:
 * - Single shared registry for Philippine tax domains.
 * - Complements:
 *   main-tax-engine-classification.js
 *   issue-classification-engine.js
 *   retrieval-engine.js
 *   reranker-engine.js
 *   rag-answer-handler.js
 *   source-visibility-engine.js
 *   authority-engine.js
 */

import {
  buildTargetAuthorityProfile,
  sortAuthorityTypes
} from "./authority-hierarchy.js";

export const DOMAIN_REGISTRY_VERSION = "1.0.0";

export const TAX_DOMAIN_CODE = Object.freeze({
  VAT: "VAT",
  CIT: "CIT",
  IIT: "IIT",
  WHT: "WHT",
  EST: "EST",
  PCT: "PCT",
  EXC: "EXC",
  PRE: "PRE",
  DIS: "DIS",
  LGT: "LGT",
  CUS: "CUS",
  SPC: "SPC",
  CON: "CON",
  GENERAL: "GENERAL"
});

export const TAX_DOMAIN_REGISTRY = Object.freeze({
  VAT: {
    code: "VAT",
    name: "Value-Added Tax",
    shortName: "VAT",
    primaryStatutes: ["NIRC Secs. 105-115", "RR 16-2005"],
    defaultAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
    coverage: 10,
    aliases: [
      "VAT",
      "Value-Added Tax",
      "Value Added Tax",
      "Output VAT",
      "Input VAT",
      "Vatable Sale",
      "VAT Exempt",
      "Zero-Rated"
    ],
    subIssues: {
      VAT_REGISTRATION: ["registration", "vat registration", "threshold", "3 million", "vat taxpayer"],
      VAT_LIABILITY: ["vat liability", "output vat", "subject to vat", "vatable", "value-added tax"],
      VAT_EXEMPTION: ["vat exempt", "exemption", "section 109", "non-vat", "exempt sale"],
      ZERO_RATED_SALES: ["zero-rated", "zero rated", "export", "foreign currency", "cross-border"],
      INPUT_VAT: ["input vat", "input tax", "creditable input", "excess input"],
      VAT_REFUND: ["vat refund", "input vat refund", "tax credit certificate", "tcc", "section 112"],
      VAT_INVOICING: ["invoice", "official receipt", "sales invoice", "e-invoice", "invoicing"],
      VAT_TIMING: ["time of sale", "timing", "accrual", "payment", "taxable quarter"],
      VAT_CROSS_BORDER: ["cross-border", "nonresident", "foreign service", "offshore"],
      VAT_SPECIAL_TRANSACTIONS: ["deemed sale", "consignment", "advance payment", "reimbursement", "pass-through"]
    }
  },

  CIT: {
    code: "CIT",
    name: "Corporate Income Tax",
    shortName: "CIT",
    primaryStatutes: ["NIRC Secs. 27-28", "CREATE R.A. 11534"],
    defaultAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
    coverage: 11,
    aliases: [
      "Corporate Income Tax",
      "CIT",
      "RCIT",
      "MCIT",
      "NOLCO",
      "Income Tax",
      "Taxable Income",
      "Deduction"
    ],
    subIssues: {
      GROSS_INCOME: ["gross income", "taxable income", "income recognition"],
      DEDUCTIONS: ["deduction", "ordinary and necessary", "substantiation", "non-deductible"],
      NOLCO: ["nolco", "net operating loss", "loss carry-over", "carry over"],
      MCIT: ["mcit", "minimum corporate income tax", "2%", "1%"],
      RCIT: ["rcit", "regular corporate income tax", "25%", "20%"],
      TAX_CREDITS: ["tax credit", "prior year credit", "excess credit"],
      CWT: ["cwt", "creditable withholding tax", "bir form 2307"],
      RELATED_PARTY: ["related party", "intercompany", "arm's length"],
      FINAL_TAX: ["final tax", "interest income", "passive income"],
      IMPROPER_ACCUMULATION: ["improperly accumulated", "iaet"],
      TAX_RECONCILIATION: ["tax reconciliation", "income tax expense", "deferred tax", "pas 12"]
    }
  },

  IIT: {
    code: "IIT",
    name: "Individual Income Tax",
    shortName: "IIT",
    primaryStatutes: ["NIRC Secs. 24-26", "TRAIN R.A. 10963"],
    defaultAuthorities: ["STATUTE", "RR", "RMC"],
    coverage: 10,
    aliases: [
      "Individual Income Tax",
      "IIT",
      "Compensation Income",
      "Self-Employed",
      "Professional Income",
      "8%",
      "Graduated Rates"
    ],
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
    shortName: "WHT",
    primaryStatutes: ["NIRC Secs. 57-58", "NIRC Secs. 79-83", "RR 2-98"],
    defaultAuthorities: ["STATUTE", "RR", "RMC", "BIR_RULING", "SUPREME_COURT"],
    coverage: 8,
    aliases: [
      "Withholding Tax",
      "WHT",
      "EWT",
      "CWT",
      "FWT",
      "Expanded Withholding Tax",
      "Creditable Withholding Tax",
      "Final Withholding Tax"
    ],
    subIssues: {
      EWT: ["ewt", "expanded withholding", "creditable withholding"],
      CWT: ["cwt", "creditable withholding tax", "2307"],
      FWT: ["final withholding", "fwt"],
      COMPENSATION_WHT: ["withholding on compensation", "payroll withholding"],
      WITHHOLDING_AGENT: ["withholding agent", "obligation to withhold"],
      TIMING: ["when to withhold", "accrual", "payment", "whichever comes first"],
      RATES: ["withholding rate", "rate", "atc"],
      REMITTANCE_RETURNS: ["1601", "0619", "1604", "alphalist", "remittance"]
    }
  },

  EST: {
    code: "EST",
    name: "Estate & Donor's Tax",
    shortName: "Estate/Donor",
    primaryStatutes: ["NIRC Secs. 84-104", "TRAIN", "RR 12-2018"],
    defaultAuthorities: ["STATUTE", "RR", "RMC"],
    coverage: 7,
    aliases: ["Estate Tax", "Donor Tax", "Donor's Tax", "Donation", "Gross Estate"],
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
    shortName: "Percentage Tax",
    primaryStatutes: ["NIRC Secs. 116-128", "RR 9-2021"],
    defaultAuthorities: ["STATUTE", "RR", "RMC"],
    coverage: 6,
    aliases: ["Percentage Tax", "2551Q", "Non-VAT Percentage Tax"],
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
    shortName: "Excise Tax",
    primaryStatutes: ["NIRC Secs. 129-172", "TRAIN", "SIN Tax"],
    defaultAuthorities: ["STATUTE", "RR", "RMC"],
    coverage: 6,
    aliases: ["Excise Tax", "Sin Tax", "Petroleum Tax", "Sweetened Beverage Tax"],
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
    name: "Prescription & Assessment",
    shortName: "Assessment",
    primaryStatutes: ["NIRC Sec. 203", "NIRC Secs. 222-228", "CTA"],
    defaultAuthorities: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR", "RMC"],
    coverage: 8,
    aliases: [
      "Prescription",
      "Assessment",
      "LOA",
      "PAN",
      "FAN",
      "FDDA",
      "Waiver",
      "Deficiency Tax"
    ],
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
    shortName: "Dispute",
    primaryStatutes: ["NIRC Secs. 204, 228-231", "R.A. 9282"],
    defaultAuthorities: ["STATUTE", "SUPREME_COURT", "CTA_EN_BANC", "CTA_DIVISION", "RR"],
    coverage: 8,
    aliases: ["Dispute", "Protest", "CTA Appeal", "Refund Claim", "Compromise", "Abatement"],
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
    shortName: "Local Tax",
    primaryStatutes: ["LGC R.A. 7160", "SC Jurisprudence"],
    defaultAuthorities: ["STATUTE", "SUPREME_COURT", "LGU"],
    coverage: 6,
    aliases: ["Local Tax", "LGU Tax", "Local Business Tax", "Real Property Tax", "RPT"],
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
    name: "Customs & Tariff",
    shortName: "Customs",
    primaryStatutes: ["CMTA R.A. 10863", "BOC Regulations"],
    defaultAuthorities: ["STATUTE", "BOC_ISSUANCE", "SUPREME_COURT", "CTA_EN_BANC"],
    coverage: 5,
    aliases: ["Customs", "Tariff", "BOC", "CMTA", "Import Duties"],
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
    name: "Transfer Pricing & Special",
    shortName: "Special Tax",
    primaryStatutes: ["RR 2-2013", "CREATE", "PEZA", "OECD"],
    defaultAuthorities: ["RR", "STATUTE", "RMC", "TAX_TREATY", "OECD_GUIDANCE"],
    coverage: 6,
    aliases: [
      "Transfer Pricing",
      "Special Tax",
      "PEZA",
      "CREATE Incentives",
      "Tax Treaty",
      "OECD",
      "Arm's Length"
    ],
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
    name: "Constitutional Issues",
    shortName: "Constitutional",
    primaryStatutes: ["1987 Constitution", "SC En Banc"],
    defaultAuthorities: ["CONSTITUTION", "SUPREME_COURT"],
    coverage: 7,
    aliases: ["Constitution", "Constitutional Tax", "Due Process", "Equal Protection"],
    subIssues: {
      DUE_PROCESS: ["constitutional due process", "procedural due process"],
      EQUAL_PROTECTION: ["equal protection"],
      NON_IMPAIRMENT: ["non-impairment"],
      UNIFORMITY_EQUITY: ["uniformity", "equity in taxation"],
      NON_DELEGATION: ["non-delegation"],
      TAX_EXEMPTION: ["constitutional exemption", "religious", "charitable"],
      LOCAL_AUTONOMY: ["local autonomy", "power to tax"]
    }
  },

  GENERAL: {
    code: "GENERAL",
    name: "General Philippine Taxation",
    shortName: "General Tax",
    primaryStatutes: ["NIRC", "BIR Issuances", "SC Jurisprudence"],
    defaultAuthorities: ["STATUTE", "RR", "SUPREME_COURT", "RMC"],
    coverage: 0,
    aliases: ["Tax", "Philippine Tax", "BIR", "NIRC"],
    subIssues: {
      GENERAL_TAX: ["tax", "bir", "nirc", "compliance"]
    }
  }
});

export const DOMAIN_ALIAS_TO_CODE = Object.freeze(
  Object.values(TAX_DOMAIN_REGISTRY).reduce((map, domain) => {
    map[domain.code] = domain.code;
    map[domain.name.toUpperCase()] = domain.code;
    map[domain.shortName.toUpperCase()] = domain.code;

    for (const alias of domain.aliases || []) {
      map[String(alias).toUpperCase()] = domain.code;
    }

    return map;
  }, {})
);

export function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s%.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDomainCode(value = "") {
  const key = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VALUE_ADDED_TAX: "VAT",
    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "CIT",
    INDIVIDUAL_INCOME_TAX: "IIT",
    WITHHOLDING: "WHT",
    WITHHOLDING_TAX: "WHT",
    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",
    PRESCRIPTION: "PRE",
    ASSESSMENT: "PRE",
    DISPUTE: "DIS",
    DISPUTE_RESOLUTION: "DIS",
    LOCAL_TAX: "LGT",
    LOCAL_GOVERNMENT_TAX: "LGT",
    CUSTOMS: "CUS",
    CUSTOMS_TARIFF: "CUS",
    TRANSFER_PRICING: "SPC",
    SPECIAL_TAX: "SPC",
    SPECIAL_TAX_REGIMES: "SPC",
    CONSTITUTIONAL: "CON",
    CONSTITUTIONAL_TAX: "CON",
    GENERAL_TAX: "GENERAL"
  };

  return aliases[key] || DOMAIN_ALIAS_TO_CODE[key] || key || "GENERAL";
}

export function getTaxDomain(code = "") {
  const normalized = normalizeDomainCode(code);
  return TAX_DOMAIN_REGISTRY[normalized] || TAX_DOMAIN_REGISTRY.GENERAL;
}

export function listTaxDomains() {
  return Object.values(TAX_DOMAIN_REGISTRY).map((domain) => ({
    code: domain.code,
    name: domain.name,
    shortName: domain.shortName,
    primaryStatutes: domain.primaryStatutes,
    defaultAuthorities: domain.defaultAuthorities,
    coverage: domain.coverage,
    subIssues: Object.keys(domain.subIssues || {})
  }));
}

export function getDomainSubIssues(code = "") {
  return getTaxDomain(code).subIssues || {};
}

export function getDomainPrimaryStatutes(code = "") {
  return getTaxDomain(code).primaryStatutes || [];
}

export function getDomainDefaultAuthorities(code = "") {
  return getTaxDomain(code).defaultAuthorities || [];
}

function scoreKeywordSet(text = "", keywords = []) {
  let score = 0;
  const matchedTerms = [];

  for (const keyword of keywords || []) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (text.includes(normalizedKeyword)) {
      matchedTerms.push(keyword);
      score += normalizedKeyword.length >= 10 ? 2 : 1;
    }
  }

  return { score, matchedTerms };
}

export function classifyTaxDomainFromText(text = "", options = {}) {
  const normalizedText = normalizeText(text);
  const priorDomain = normalizeDomainCode(options.priorDomain || "");

  const candidates = [];

  for (const domain of Object.values(TAX_DOMAIN_REGISTRY)) {
    let score = 0;
    const matchedAliases = [];
    const matchedSubIssues = [];

    const aliasScore = scoreKeywordSet(normalizedText, [
      domain.code,
      domain.name,
      domain.shortName,
      ...(domain.aliases || []),
      ...(domain.primaryStatutes || [])
    ]);

    score += aliasScore.score;
    matchedAliases.push(...aliasScore.matchedTerms);

    for (const [subIssueCode, keywords] of Object.entries(domain.subIssues || {})) {
      const subIssueScore = scoreKeywordSet(normalizedText, keywords);

      if (subIssueScore.score > 0) {
        score += subIssueScore.score;
        matchedSubIssues.push({
          code: subIssueCode,
          score: subIssueScore.score,
          matchedTerms: subIssueScore.matchedTerms
        });
      }
    }

    if (priorDomain && priorDomain === domain.code) score += 5;

    if (score > 0) {
      matchedSubIssues.sort((a, b) => b.score - a.score);

      candidates.push({
        code: domain.code,
        name: domain.name,
        score,
        matchedAliases,
        matchedSubIssues
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0] || {
    code: "GENERAL",
    name: TAX_DOMAIN_REGISTRY.GENERAL.name,
    score: 0,
    matchedAliases: [],
    matchedSubIssues: []
  };

  const second = candidates[1] || null;
  const confidence = top.score <= 0
    ? 0.35
    : Number(Math.min(0.55 + top.score / 25 + Math.max(top.score - (second?.score || 0), 0) / 20, 0.99).toFixed(2));

  const domain = getTaxDomain(top.code);

  return {
    primaryDomain: domain.code,
    primaryDomainName: domain.name,
    primarySubIssue: top.matchedSubIssues?.[0]?.code || null,
    subIssues: top.matchedSubIssues?.map((item) => item.code) || [],
    primaryStatutes: domain.primaryStatutes,
    defaultAuthorities: domain.defaultAuthorities,
    confidence,
    candidates
  };
}

export function buildDomainRetrievalHints({
  primaryDomain = "",
  primaryIssue = "",
  subIssue = "",
  subIssues = [],
  extraTerms = []
} = {}) {
  const domain = getTaxDomain(primaryDomain);
  const allSubIssues = domain.subIssues || {};

  const selectedSubIssues = [
    subIssue,
    ...subIssues
  ].filter(Boolean);

  const boostTerms = [
    domain.code,
    domain.name,
    domain.shortName,
    ...(domain.primaryStatutes || []),
    ...(domain.aliases || []),
    primaryIssue,
    ...selectedSubIssues,
    ...selectedSubIssues.flatMap((code) => allSubIssues[code] || []),
    ...extraTerms
  ];

  const targetAuthorities = buildTargetAuthorityProfile({
    primaryDomain: domain.code,
    primaryIssue,
    subIssues: selectedSubIssues,
    targetAuthorities: domain.defaultAuthorities
  });

  return {
    domainCode: domain.code,
    domainName: domain.name,
    primaryStatutes: domain.primaryStatutes,
    defaultAuthorities: domain.defaultAuthorities,
    targetAuthorities: sortAuthorityTypes(targetAuthorities),
    boostTerms: [...new Set(boostTerms.filter(Boolean))]
  };
}

export function buildDomainClassificationObject({
  query = "",
  primaryIssue = "",
  priorDomain = "",
  subIssue = "",
  subIssues = [],
  targetAuthorities = [],
  legalDimensions = [],
  retrievalStrategy = ""
} = {}) {
  const detected = classifyTaxDomainFromText(query, { priorDomain });
  const domain = getTaxDomain(detected.primaryDomain);

  const effectiveSubIssues = [...new Set([
    detected.primarySubIssue,
    subIssue,
    ...subIssues,
    ...detected.subIssues
  ].filter(Boolean))];

  const hints = buildDomainRetrievalHints({
    primaryDomain: domain.code,
    primaryIssue,
    subIssue: effectiveSubIssues[0] || "",
    subIssues: effectiveSubIssues,
    extraTerms: detected.candidates?.[0]?.matchedAliases || []
  });

  const effectiveAuthorities = sortAuthorityTypes([
    ...hints.targetAuthorities,
    ...targetAuthorities
  ]);

  return {
    engine: "tax-engines/shared/domain-registry.js",
    version: DOMAIN_REGISTRY_VERSION,
    status: detected.confidence >= 0.7 ? "DOMAIN_CLASSIFIED" : "LOW_CONFIDENCE_DOMAIN_CLASSIFIED",
    primaryDomain: domain.code,
    primaryDomainName: domain.name,
    primaryIssue: primaryIssue || detected.primarySubIssue || `${domain.code}_GENERAL`,
    primarySubIssue: effectiveSubIssues[0] || null,
    subIssues: effectiveSubIssues,
    governingStatutes: domain.primaryStatutes,
    primaryStatutes: domain.primaryStatutes,
    targetAuthorities: effectiveAuthorities,
    defaultAuthorities: domain.defaultAuthorities,
    legalDimensions,
    retrievalStrategy:
      retrievalStrategy ||
      `${domain.code}_${effectiveSubIssues[0] || "GENERAL"}_DOMAIN_RETRIEVAL`,
    retrievalHints: hints,
    coverage: domain.coverage,
    confidence: detected.confidence,
    classificationSignals: {
      candidates: detected.candidates
    }
  };
}

export function mergeDomainIntoIssueClassification(issueClassification = {}, query = "") {
  const taxDomainClassification =
    issueClassification.taxDomainClassification ||
    buildDomainClassificationObject({
      query: query || issueClassification.normalizedQuery || issueClassification.originalQuery || "",
      primaryIssue: issueClassification.primaryIssue,
      priorDomain: issueClassification.primaryDomain,
      subIssue: issueClassification.subIssue,
      subIssues: issueClassification.subIssues,
      targetAuthorities: issueClassification.targetAuthorities,
      legalDimensions: issueClassification.legalDimensions,
      retrievalStrategy: issueClassification.retrievalStrategy
    });

  return {
    ...issueClassification,
    taxDomainClassification,
    primaryDomain:
      issueClassification.primaryDomain ||
      taxDomainClassification.primaryDomain,
    primaryIssue:
      issueClassification.primaryIssue ||
      taxDomainClassification.primaryIssue,
    subIssue:
      issueClassification.subIssue ||
      taxDomainClassification.primarySubIssue,
    subIssues: [
      ...new Set([
        ...(issueClassification.subIssues || []),
        ...(taxDomainClassification.subIssues || [])
      ].filter(Boolean))
    ],
    targetAuthorities: sortAuthorityTypes([
      ...(issueClassification.targetAuthorities || []),
      ...(taxDomainClassification.targetAuthorities || [])
    ]),
    legalDimensions: [
      ...new Set([
        ...(issueClassification.legalDimensions || []),
        ...(taxDomainClassification.legalDimensions || [])
      ].filter(Boolean))
    ],
    retrievalStrategy:
      issueClassification.retrievalStrategy ||
      taxDomainClassification.retrievalStrategy
  };
}

export function domainRegistryHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SHARED_DOMAIN_REGISTRY",
    version: DOMAIN_REGISTRY_VERSION,
    domainCount: Object.keys(TAX_DOMAIN_REGISTRY).length,
    supportsMasterQuickReference: true,
    supportsIssueClassificationEngine: true,
    supportsMainTaxEngineClassification: true,
    supportsRetrievalEngine: true,
    supportsRerankerEngine: true,
    supportsSourceVisibilityEngine: true,
    supportsVatCitWhtConfigs: true
  };
}

export default {
  DOMAIN_REGISTRY_VERSION,
  TAX_DOMAIN_CODE,
  TAX_DOMAIN_REGISTRY,
  DOMAIN_ALIAS_TO_CODE,
  normalizeText,
  normalizeDomainCode,
  getTaxDomain,
  listTaxDomains,
  getDomainSubIssues,
  getDomainPrimaryStatutes,
  getDomainDefaultAuthorities,
  classifyTaxDomainFromText,
  buildDomainRetrievalHints,
  buildDomainClassificationObject,
  mergeDomainIntoIssueClassification,
  domainRegistryHealthCheck
};
