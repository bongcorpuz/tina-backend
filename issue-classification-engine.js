// FILE: issue-classification-engine.js
"use strict";

/**
 * TINA Issue Classification Engine
 * Version: 5.0.0
 *
 * Purpose:
 * - Classify Philippine tax issues before retrieval
 * - Route every query into tax domain, sub-issue, retrieval strategy, and target authorities
 * - Preserve queryIntent flags
 * - Return compact downstream-compatible classification objects
 *
 * Boundary:
 * - Does not call OpenAI
 * - Does not retrieve sources
 * - Does not generate final answers
 * - Does not duplicate RAG, context orchestration, or answer rendering
 */

import { enrichIssueClassification } from "./main-tax-engine-classification.js";

const ENGINE_VERSION = "5.0.0";

const PRIMARY_ISSUE = Object.freeze({
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

  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_REFUND: "VAT_REFUND",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",
  INCOME_TAX: "INCOME_TAX",
  WITHHOLDING: "WITHHOLDING",
  ASSESSMENT: "ASSESSMENT",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TRANSACTION: "TRANSACTION",
  CONTRACT: "CONTRACT",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  ACCOUNTING: "ACCOUNTING",
  AUDIT: "AUDIT",
  DOCTRINE: "DOCTRINE",
  CASE_LAW: "CASE_LAW",
  ISSUANCE: "ISSUANCE",
  NAMED_LAW: "NAMED_LAW",
  GENERAL_TAX: "GENERAL_TAX"
});

const LEGACY_PRIMARY_ISSUE = Object.freeze({
  DEFINITION: "DEFINITION",
  COMPLIANCE: "COMPLIANCE",
  REFUND: "REFUND",
  PRESCRIPTION: "PRESCRIPTION",
  EXEMPTION: "EXEMPTION",
  PROCEDURAL: "PROCEDURAL",
  CONSTITUTIONAL: "CONSTITUTIONAL",
  WITHHOLDING: "WITHHOLDING",
  CHARACTERIZATION: "CHARACTERIZATION",
  DISPUTE_RESOLUTION: "DISPUTE_RESOLUTION",
  EVIDENTIARY: "EVIDENTIARY",
  ACCOUNTING_TAX: "ACCOUNTING_TAX",
  GENERAL_TAX: "GENERAL_TAX"
});

const QUERY_INTENT = Object.freeze({
  DEFINITION: "definition",
  COMPLIANCE: "compliance",
  DISPUTE: "dispute",
  PLANNING: "planning",
  ADVISORY: "advisory",
  COMPUTATION: "computation",
  SOURCE_INVENTORY: "source_inventory",
  REVIEW: "review"
});

const COMPLEXITY = Object.freeze({
  SIMPLE: "simple",
  MODERATE: "moderate",
  COMPLEX: "complex",
  MULTI_ISSUE: "multi-issue"
});

const FACT_SENSITIVITY = Object.freeze({
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high"
});

const RETRIEVAL_STRATEGY = Object.freeze({
  FOUNDATIONAL: "ISSUE_FOUNDATIONAL_AUTHORITY_FIRST",
  PROCEDURAL: "ISSUE_PROCEDURAL_AUTHORITY_FIRST",
  JURISPRUDENTIAL: "ISSUE_JURISPRUDENCE_FIRST",
  MIXED: "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC",
  FACT_DRIVEN: "ISSUE_FACT_DRIVEN_AUTHORITY_FIRST",
  EXACT_AUTHORITY: "EXACT_AUTHORITY_FIRST_THEN_ISSUE_SEMANTIC",
  EVIDENCE_DRIVEN: "ISSUE_EVIDENCE_AUTHORITY_FIRST",
  COMPUTATION: "ISSUE_COMPUTATION_AUTHORITY_FIRST"
});

const LEGAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TEMPORAL: "TEMPORAL",
  ADMINISTRATIVE: "ADMINISTRATIVE",
  FACTUAL: "FACTUAL",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  TRANSACTION: "TRANSACTION",
  ACCOUNTING: "ACCOUNTING",
  AUDIT: "AUDIT",
  CONSTITUTIONAL: "CONSTITUTIONAL",
  COMPUTATIONAL: "COMPUTATIONAL",
  GENERAL: "GENERAL"
});

const AUTHORITY_TYPE = Object.freeze({
  CONSTITUTION: "CONSTITUTION",
  STATUTE: "STATUTE",
  TAX_TREATY: "TAX_TREATY",
  SUPREME_COURT: "SUPREME_COURT",
  CTA_EN_BANC: "CTA_EN_BANC",
  CTA_DIVISION: "CTA_DIVISION",
  COURT_OF_APPEALS: "COURT_OF_APPEALS",
  RR: "RR",
  RMC: "RMC",
  RMO: "RMO",
  RAMO: "RAMO",
  BIR_RULING: "BIR_RULING",
  ADMINISTRATIVE_GUIDANCE: "ADMINISTRATIVE_GUIDANCE",
  OECD_GUIDANCE: "OECD_GUIDANCE",
  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",
  LGU: "LGU",
  BOC_ISSUANCE: "BOC_ISSUANCE",
  SECONDARY: "SECONDARY"
});

const STANDARD_REQUIRED_ANSWER_SECTIONS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const DOMAIN_CONFIGS = Object.freeze({
  VAT: {
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    keywords: [
      /\bvat\b/i,
      /\bvalue[- ]added tax\b/i,
      /\binput tax\b/i,
      /\boutput tax\b/i,
      /\bzero[- ]rated\b/i,
      /\bvat[- ]exempt\b/i,
      /\bsection 112\b/i
    ],
    defaultSubIssue: "COMPLIANCE",
    subIssues: {
      DEFINITION: {
        keywords: [/\bwhat is vat\b/i, /\bdefine vat\b/i, /\bnature of vat\b/i, /\bmeaning of vat\b/i],
        retrievalStrategy: "VAT_DEFINITION_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Secs. 105–108"],
        supportingAuthorities: ["RR 16-2005"],
        supportingJurisprudence: ["CIR v. Seagate Technology", "CIR v. Aichi Forging", "CIR v. Toshiba"],
        targetAuthorities: ["NIRC Secs. 105–108", "RR 16-2005"]
      },
      ZERO_RATING: {
        keywords: [/\bzero[- ]rated\b/i, /\b0% vat\b/i, /\bzero rating\b/i],
        retrievalStrategy: "VAT_ZERO_RATING_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)"],
        supportingAuthorities: ["RR 16-2005", "Revenue regulations on VAT zero-rating"],
        supportingJurisprudence: ["Supreme Court VAT zero-rating jurisprudence"]
      },
      INPUT_TAX: {
        keywords: [/\binput vat\b/i, /\binput tax\b/i, /\bcreditable input\b/i],
        retrievalStrategy: "VAT_INPUT_TAX_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Sec. 110"],
        supportingAuthorities: ["RR 16-2005"]
      },
      OUTPUT_TAX: {
        keywords: [/\boutput vat\b/i, /\boutput tax\b/i, /\bvat payable\b/i],
        retrievalStrategy: "VAT_OUTPUT_TAX_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Secs. 106–108"],
        supportingAuthorities: ["RR 16-2005"]
      },
      REFUND_CREDIT: {
        keywords: [/\bvat refund\b/i, /\btax credit certificate\b/i, /\btcc\b/i, /\bsection 112\b/i, /\bunutilized input\b/i, /\bexcess input\b/i],
        retrievalStrategy: "VAT_REFUND_PROCEDURAL_FIRST",
        controllingAuthorities: ["NIRC Sec. 112"],
        supportingAuthorities: ["RR 16-2005 VAT refund provisions"],
        supportingJurisprudence: ["CIR v. Aichi Forging", "CIR v. San Roque Power", "CIR v. Mirant"]
      },
      EXEMPTION: {
        keywords: [/\bvat exempt\b/i, /\bexempt from vat\b/i, /\bsection 109\b/i],
        retrievalStrategy: "VAT_EXEMPTION_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Sec. 109"],
        supportingAuthorities: ["RR 16-2005 VAT exemption provisions"]
      },
      REGISTRATION: {
        keywords: [/\bvat registration\b/i, /\bregister as vat\b/i, /\bthreshold\b/i],
        retrievalStrategy: "VAT_REGISTRATION_COMPLIANCE_FIRST",
        controllingAuthorities: ["NIRC Sec. 236"],
        supportingAuthorities: ["VAT registration regulations and BIR issuances"]
      },
      COMPLIANCE: {
        keywords: [/\bvat return\b/i, /\b2550q\b/i, /\bslsp\b/i, /\bvat filing\b/i, /\bvat invoice\b/i],
        retrievalStrategy: "VAT_COMPLIANCE_ADMIN_FIRST",
        controllingAuthorities: ["NIRC VAT filing and invoicing provisions"],
        supportingAuthorities: ["RR 16-2005", "EOPT VAT invoicing rules"]
      },
      TRANSITIONAL_INPUT_TAX: {
        keywords: [/\btransitional input tax\b/i],
        retrievalStrategy: "VAT_TRANSITIONAL_INPUT_TAX_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Sec. 111"],
        supportingAuthorities: ["RR 16-2005"]
      },
      DEEMED_SALE: {
        keywords: [/\bdeemed sale\b/i, /\btransactions deemed sale\b/i],
        retrievalStrategy: "VAT_DEEMED_SALE_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC Sec. 106(B)"],
        supportingAuthorities: ["RR 16-2005"]
      }
    }
  },

  CIT: {
    domainCode: "CIT",
    domainName: "Corporate Income Tax",
    keywords: [/\bcit\b/i, /\brcit\b/i, /\bmcit\b/i, /\bnolco\b/i, /\bcorporate income tax\b/i, /\bdeduction\b/i],
    defaultSubIssue: "RCIT",
    subIssues: {
      RCIT: {
        keywords: [/\brcit\b/i, /\bregular corporate income tax\b/i],
        retrievalStrategy: "CIT_RCIT_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 27(A)", "CREATE Act"],
        supportingAuthorities: ["Applicable income tax regulations"]
      },
      MCIT: {
        keywords: [/\bmcit\b/i, /\bminimum corporate income tax\b/i],
        retrievalStrategy: "CIT_MCIT_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 27(E)", "CREATE Act"],
        supportingAuthorities: ["RR 9-1998", "RMC 4-2014"]
      },
      NOLCO: {
        keywords: [/\bnolco\b/i, /\bnet operating loss carry[- ]over\b/i],
        retrievalStrategy: "CIT_NOLCO_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 34(D)(3)"],
        supportingAuthorities: ["RR 25-2020 where applicable", "Relevant NOLCO regulations"]
      },
      DEDUCTIONS: {
        keywords: [/\bdeductible\b/i, /\bdeduction\b/i, /\bnon[- ]deductible\b/i, /\bsubstantiation\b/i],
        retrievalStrategy: "CIT_DEDUCTIONS_STATUTE_RR_FIRST",
        controllingAuthorities: ["NIRC Sec. 34"],
        supportingAuthorities: ["Applicable substantiation regulations"]
      },
      IMPROPERLY_ACCUMULATED_EARNINGS: {
        keywords: [/\biaet\b/i, /\bimproperly accumulated\b/i],
        retrievalStrategy: "CIT_IAET_STATUTE_FIRST",
        controllingAuthorities: ["NIRC IAET provisions where applicable"],
        supportingAuthorities: ["Related BIR issuances"]
      },
      RELATED_PARTY: {
        keywords: [/\brelated party\b/i, /\btransfer pricing\b/i, /\barm'?s length\b/i],
        retrievalStrategy: "CIT_RELATED_PARTY_TP_FIRST",
        controllingAuthorities: ["NIRC related-party and anti-avoidance provisions"],
        supportingAuthorities: ["RR 19-2020", "Transfer pricing documentation rules"]
      },
      TAX_TREATY: {
        keywords: [/\btax treaty\b/i, /\btreaty relief\b/i, /\btrc\b/i, /\bdta\b/i],
        retrievalStrategy: "CIT_TAX_TREATY_FIRST",
        controllingAuthorities: ["Applicable tax treaty", "NIRC treaty provisions"],
        supportingAuthorities: ["BIR treaty relief issuances"]
      },
      DEFERRED_TAX: {
        keywords: [/\bdeferred tax\b/i, /\bdta\b/i, /\bdtl\b/i, /\btemporary difference\b/i],
        retrievalStrategy: "CIT_DEFERRED_TAX_PFRS_TAX_FIRST",
        controllingAuthorities: ["PAS 12", "Related NIRC provisions"],
        supportingAuthorities: ["PFRS/PAS guidance"]
      },
      CREATE_INCENTIVES: {
        keywords: [/\bcreate\b/i, /\bincentive\b/i, /\btax holiday\b/i, /\bscit\b/i],
        retrievalStrategy: "CIT_CREATE_INCENTIVES_STATUTE_FIRST",
        controllingAuthorities: ["CREATE Act", "NIRC incentive provisions"],
        supportingAuthorities: ["FIRB and BIR implementing issuances"]
      }
    }
  },

  IIT: {
    domainCode: "IIT",
    domainName: "Individual Income Tax",
    keywords: [/\bindividual income tax\b/i, /\bcompensation income\b/i, /\bmixed income\b/i, /\bself[- ]employed\b/i, /\bfringe benefit\b/i],
    defaultSubIssue: "COMPENSATION",
    subIssues: {
      COMPENSATION: {
        keywords: [/\bcompensation\b/i, /\bsalary\b/i, /\bwage\b/i],
        retrievalStrategy: "IIT_COMPENSATION_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 24", "NIRC compensation tax provisions"],
        supportingAuthorities: ["RR 2-98", "BIR compensation withholding issuances"]
      },
      SELF_EMPLOYED: {
        keywords: [/\bself[- ]employed\b/i, /\bprofessional income\b/i],
        retrievalStrategy: "IIT_SELF_EMPLOYED_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 24"],
        supportingAuthorities: ["Graduated/8% income tax rules"]
      },
      MIXED_INCOME: {
        keywords: [/\bmixed income\b/i],
        retrievalStrategy: "IIT_MIXED_INCOME_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 24"],
        supportingAuthorities: ["TRAIN Law and related BIR issuances"]
      },
      FRINGE_BENEFITS: {
        keywords: [/\bfringe benefit\b/i, /\bfbt\b/i],
        retrievalStrategy: "IIT_FRINGE_BENEFIT_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Sec. 33"],
        supportingAuthorities: ["Fringe benefit tax regulations"]
      },
      DE_MINIMIS: {
        keywords: [/\bde minimis\b/i],
        retrievalStrategy: "IIT_DE_MINIMIS_RR_FIRST",
        controllingAuthorities: ["NIRC compensation tax provisions"],
        supportingAuthorities: ["RR 2-98", "De minimis benefits issuances"]
      },
      CAPITAL_GAINS: {
        keywords: [/\bcapital gains\b/i, /\bcgt\b/i, /\bsale of shares\b/i, /\bsale of real property\b/i],
        retrievalStrategy: "IIT_CAPITAL_GAINS_STATUTE_FIRST",
        controllingAuthorities: ["NIRC capital gains tax provisions"],
        supportingAuthorities: ["Relevant CGT regulations"]
      }
    }
  },

  WHT: {
    domainCode: "WHT",
    domainName: "Withholding Tax",
    keywords: [/\bwithholding\b/i, /\bewt\b/i, /\bcwt\b/i, /\bfwt\b/i, /\b2307\b/i, /\b1601\b/i],
    defaultSubIssue: "CREDITABLE_WHT",
    subIssues: {
      CREDITABLE_WHT: {
        keywords: [/\bewt\b/i, /\bcwt\b/i, /\bcreditable\b/i, /\bexpanded withholding\b/i, /\b2307\b/i],
        retrievalStrategy: "WHT_EWT_RR_FIRST",
        controllingAuthorities: ["NIRC Secs. 57–58"],
        supportingAuthorities: ["RR 2-98", "RR 11-2018", "RR 14-2018"]
      },
      FINAL_WHT: {
        keywords: [/\bfwt\b/i, /\bfinal withholding\b/i, /\bfinal tax\b/i],
        retrievalStrategy: "WHT_FINAL_WHT_STATUTE_RR_FIRST",
        controllingAuthorities: ["NIRC final withholding tax provisions"],
        supportingAuthorities: ["RR 2-98"]
      },
      COMPENSATION_WHT: {
        keywords: [/\bcompensation withholding\b/i, /\bwithholding on compensation\b/i, /\b1601c\b/i],
        retrievalStrategy: "WHT_COMPENSATION_RR_FIRST",
        controllingAuthorities: ["NIRC withholding on compensation provisions"],
        supportingAuthorities: ["RR 2-98", "TRAIN withholding tables"]
      },
      WITHHOLDING_AGENT_LIABILITY: {
        keywords: [/\bwithholding agent\b/i, /\bliability of withholding agent\b/i, /\bfailure to withhold\b/i],
        retrievalStrategy: "WHT_AGENT_LIABILITY_STATUTE_FIRST",
        controllingAuthorities: ["NIRC Secs. 57–58", "NIRC penalty provisions"],
        supportingAuthorities: ["RR 2-98"],
        supportingJurisprudence: ["Supreme Court withholding agent liability cases"]
      },
      TREATY_WHT: {
        keywords: [/\btreaty withholding\b/i, /\btax treaty\b/i, /\bnonresident\b/i, /\bnrfc\b/i],
        retrievalStrategy: "WHT_TREATY_FIRST",
        controllingAuthorities: ["Applicable tax treaty", "NIRC withholding provisions"],
        supportingAuthorities: ["BIR treaty relief issuances"]
      }
    }
  }
});

const DOMAIN_CONFIGS_PART_2 = Object.freeze({
  EST: {
    domainCode: "EST",
    domainName: "Estate and Donor's Tax",
    keywords: [/\bestate tax\b/i, /\bdonor'?s tax\b/i, /\bdonor tax\b/i, /\bgift tax\b/i],
    defaultSubIssue: "ESTATE_TAX",
    subIssues: {
      ESTATE_TAX: {
        keywords: [/\bestate tax\b/i, /\bdecedent\b/i, /\bgross estate\b/i],
        retrievalStrategy: "EST_ESTATE_TAX_STATUTE_FIRST",
        controllingAuthorities: ["NIRC estate tax provisions"],
        supportingAuthorities: ["Estate tax regulations and BIR issuances"]
      },
      DONOR_TAX: {
        keywords: [/\bdonor'?s tax\b/i, /\bdonor tax\b/i, /\bgift\b/i, /\bdonation\b/i],
        retrievalStrategy: "EST_DONOR_TAX_STATUTE_FIRST",
        controllingAuthorities: ["NIRC donor's tax provisions"],
        supportingAuthorities: ["Donor's tax regulations and BIR issuances"]
      },
      EXEMPTIONS: {
        keywords: [/\bexempt\b/i, /\bdeduction\b/i, /\bstandard deduction\b/i],
        retrievalStrategy: "EST_EXEMPTIONS_DEDUCTIONS_FIRST",
        controllingAuthorities: ["NIRC estate and donor's tax exemption/deduction provisions"],
        supportingAuthorities: ["Applicable estate/donor's tax regulations"]
      }
    }
  },

  PCT: {
    domainCode: "PCT",
    domainName: "Percentage Tax",
    keywords: [/\bpercentage tax\b/i, /\b2551q\b/i, /\bnon[- ]vat\b/i],
    defaultSubIssue: "PERCENTAGE_TAX",
    subIssues: {
      PERCENTAGE_TAX: {
        keywords: [/\bpercentage tax\b/i, /\b2551q\b/i],
        retrievalStrategy: "PCT_STATUTE_RR_FIRST",
        controllingAuthorities: ["NIRC percentage tax provisions"],
        supportingAuthorities: ["Percentage tax regulations"]
      },
      NON_VAT_TAXPAYER: {
        keywords: [/\bnon[- ]vat\b/i, /\bnon vat\b/i],
        retrievalStrategy: "PCT_NON_VAT_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC percentage tax provisions"],
        supportingAuthorities: ["BIR non-VAT taxpayer regulations"]
      },
      COMPLIANCE: {
        keywords: [/\bfile\b/i, /\bfiling\b/i, /\bdue date\b/i, /\breturn\b/i],
        retrievalStrategy: "PCT_COMPLIANCE_ADMIN_FIRST",
        controllingAuthorities: ["NIRC percentage tax provisions"],
        supportingAuthorities: ["BIR filing issuances"]
      }
    }
  },

  EXC: {
    domainCode: "EXC",
    domainName: "Excise Tax",
    keywords: [/\bexcise tax\b/i, /\bexcise\b/i, /\bsin tax\b/i],
    defaultSubIssue: "EXCISE_TAX",
    subIssues: {
      EXCISE_TAX: {
        keywords: [/\bexcise tax\b/i, /\bexcise\b/i],
        retrievalStrategy: "EXC_STATUTE_FIRST",
        controllingAuthorities: ["NIRC excise tax provisions"],
        supportingAuthorities: ["Excise tax regulations and BIR issuances"]
      },
      EXEMPTION: {
        keywords: [/\bexempt\b/i, /\bexemption\b/i],
        retrievalStrategy: "EXC_EXEMPTION_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC excise tax exemption provisions"],
        supportingAuthorities: ["Applicable excise tax issuances"]
      },
      COMPLIANCE: {
        keywords: [/\breturn\b/i, /\bfiling\b/i, /\bstamp\b/i, /\bmarking\b/i],
        retrievalStrategy: "EXC_COMPLIANCE_ADMIN_FIRST",
        controllingAuthorities: ["NIRC excise tax administrative provisions"],
        supportingAuthorities: ["BIR excise tax compliance issuances"]
      }
    }
  },

  PRE: {
    domainCode: "PRE",
    domainName: "Prescription and Assessment",
    keywords: [/\bprescription\b/i, /\bprescriptive\b/i, /\bloa\b/i, /\bpan\b/i, /\bfan\b/i, /\bfdda\b/i, /\bwaiver\b/i, /\bdue process\b/i, /\bassessment\b/i],
    defaultSubIssue: "PRESCRIPTION",
    subIssues: {
      PRESCRIPTION: {
        keywords: [/\bprescription\b/i, /\bprescriptive\b/i, /\bthree years\b/i, /\bten years\b/i],
        retrievalStrategy: "PRE_PRESCRIPTION_STATUTE_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["NIRC Secs. 203 and 222"],
        supportingAuthorities: ["Assessment prescription regulations"],
        supportingJurisprudence: ["Supreme Court prescription cases"]
      },
      LOA_VALIDITY: {
        keywords: [/\bloa\b/i, /\bletter of authority\b/i],
        retrievalStrategy: "PRE_LOA_VALIDITY_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["NIRC assessment provisions"],
        supportingAuthorities: ["BIR audit and LOA issuances"],
        supportingJurisprudence: ["Medicard Philippines", "Revenue audit LOA jurisprudence"]
      },
      PAN_FAN: {
        keywords: [/\bpan\b/i, /\bfan\b/i, /\bfld\b/i, /\bformal letter of demand\b/i],
        retrievalStrategy: "PRE_PAN_FAN_DUE_PROCESS_FIRST",
        controllingAuthorities: ["NIRC Sec. 228"],
        supportingAuthorities: ["RR 18-2013"],
        supportingJurisprudence: ["CIR v. Metro Star Superama", "CIR v. Enron Subic Power"]
      },
      FDDA: {
        keywords: [/\bfdda\b/i, /\bfinal decision on disputed assessment\b/i],
        retrievalStrategy: "PRE_FDDA_PROCEDURAL_FIRST",
        controllingAuthorities: ["NIRC Sec. 228"],
        supportingAuthorities: ["RR 18-2013"],
        supportingJurisprudence: ["CTA and Supreme Court FDDA jurisprudence"]
      },
      WAIVER: {
        keywords: [/\bwaiver\b/i, /\bstatute of limitations\b/i],
        retrievalStrategy: "PRE_WAIVER_VALIDITY_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["NIRC Secs. 203 and 222"],
        supportingAuthorities: ["BIR waiver issuances"],
        supportingJurisprudence: ["Supreme Court waiver validity cases"]
      },
      DUE_PROCESS: {
        keywords: [/\bdue process\b/i, /\bdenial of due process\b/i],
        retrievalStrategy: "PRE_DUE_PROCESS_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["NIRC Sec. 228", "Constitutional due process"],
        supportingAuthorities: ["RR 18-2013"],
        supportingJurisprudence: ["CIR v. Metro Star Superama", "CIR v. Enron Subic Power"]
      }
    }
  },

  DIS: {
    domainCode: "DIS",
    domainName: "Tax Dispute Resolution",
    keywords: [/\bprotest\b/i, /\bcta appeal\b/i, /\bappeal to cta\b/i, /\bcompromise\b/i, /\brefund claim\b/i, /\bcriminal tax\b/i],
    defaultSubIssue: "PROTEST",
    subIssues: {
      PROTEST: {
        keywords: [/\bprotest\b/i, /\bdisputed assessment\b/i],
        retrievalStrategy: "DIS_PROTEST_PROCEDURAL_FIRST",
        controllingAuthorities: ["NIRC Secs. 228–229"],
        supportingAuthorities: ["RR 18-2013"],
        supportingJurisprudence: ["CIR v. First Express Pawnshop"]
      },
      CTA_APPEAL: {
        keywords: [/\bcta appeal\b/i, /\bcourt of tax appeals\b/i, /\b30 days\b/i],
        retrievalStrategy: "DIS_CTA_APPEAL_JURISDICTION_FIRST",
        controllingAuthorities: ["NIRC Sec. 228", "RA 1125 as amended"],
        supportingAuthorities: ["CTA procedural rules"],
        supportingJurisprudence: ["Supreme Court and CTA appeal-period jurisprudence"]
      },
      REFUND: {
        keywords: [/\brefund\b/i, /\btax refund\b/i, /\bclaim for refund\b/i],
        retrievalStrategy: "DIS_REFUND_PROCEDURAL_FIRST",
        controllingAuthorities: ["NIRC Sec. 229", "Applicable special refund provisions"],
        supportingAuthorities: ["Refund regulations"],
        supportingJurisprudence: ["Supreme Court tax refund jurisprudence"]
      },
      COMPROMISE: {
        keywords: [/\bcompromise\b/i, /\babate\b/i, /\babatement\b/i],
        retrievalStrategy: "DIS_COMPROMISE_ADMIN_FIRST",
        controllingAuthorities: ["NIRC Sec. 204"],
        supportingAuthorities: ["BIR compromise and abatement issuances"]
      },
      CRIMINAL_TAX_CASE: {
        keywords: [/\bcriminal tax\b/i, /\btax evasion\b/i, /\bwillful failure\b/i],
        retrievalStrategy: "DIS_CRIMINAL_TAX_CASE_AUTHORITY_FIRST",
        controllingAuthorities: ["NIRC criminal penalty provisions"],
        supportingAuthorities: ["DOJ/BIR tax enforcement issuances"],
        supportingJurisprudence: ["Criminal tax jurisprudence"]
      }
    }
  },

  LGT: {
    domainCode: "LGT",
    domainName: "Local Government Taxation",
    keywords: [/\blocal business tax\b/i, /\blbt\b/i, /\breal property tax\b/i, /\brpt\b/i, /\blocal franchise tax\b/i, /\blgu\b/i],
    defaultSubIssue: "BUSINESS_TAX",
    subIssues: {
      BUSINESS_TAX: {
        keywords: [/\blocal business tax\b/i, /\blbt\b/i, /\bmayor'?s permit\b/i],
        retrievalStrategy: "LGT_BUSINESS_TAX_LGC_FIRST",
        controllingAuthorities: ["Local Government Code local business tax provisions"],
        supportingAuthorities: ["LGU ordinances where available"]
      },
      REAL_PROPERTY_TAX: {
        keywords: [/\breal property tax\b/i, /\brpt\b/i, /\bassessed value\b/i],
        retrievalStrategy: "LGT_RPT_LGC_FIRST",
        controllingAuthorities: ["Local Government Code real property tax provisions"],
        supportingAuthorities: ["Local assessment rules"]
      },
      LOCAL_FRANCHISE_TAX: {
        keywords: [/\blocal franchise tax\b/i, /\bfranchise tax\b/i],
        retrievalStrategy: "LGT_FRANCHISE_TAX_LGC_FIRST",
        controllingAuthorities: ["Local Government Code franchise tax provisions"],
        supportingAuthorities: ["LGU ordinances and jurisprudence"]
      },
      EXEMPTIONS: {
        keywords: [/\bexempt\b/i, /\btax exemption\b/i],
        retrievalStrategy: "LGT_EXEMPTION_LGC_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Local Government Code exemption provisions"],
        supportingJurisprudence: ["Supreme Court local tax exemption jurisprudence"]
      }
    }
  },

  CUS: {
    domainCode: "CUS",
    domainName: "Customs and Tariff",
    keywords: [/\bcustoms\b/i, /\btariff\b/i, /\bimport duty\b/i, /\bcustoms valuation\b/i, /\bpost[- ]clearance audit\b/i],
    defaultSubIssue: "CUSTOMS_VALUATION",
    subIssues: {
      CUSTOMS_VALUATION: {
        keywords: [/\bcustoms valuation\b/i, /\btransaction value\b/i],
        retrievalStrategy: "CUS_VALUATION_CMTA_FIRST",
        controllingAuthorities: ["CMTA customs valuation provisions"],
        supportingAuthorities: ["BOC customs valuation issuances"]
      },
      TARIFF_CLASSIFICATION: {
        keywords: [/\btariff classification\b/i, /\bahtn\b/i, /\bhs code\b/i],
        retrievalStrategy: "CUS_TARIFF_CLASSIFICATION_FIRST",
        controllingAuthorities: ["CMTA tariff classification provisions", "AHTN"],
        supportingAuthorities: ["BOC tariff classification rulings"]
      },
      POST_CLEARANCE_AUDIT: {
        keywords: [/\bpost[- ]clearance audit\b/i, /\bpca\b/i],
        retrievalStrategy: "CUS_POST_CLEARANCE_AUDIT_FIRST",
        controllingAuthorities: ["CMTA post-clearance audit provisions"],
        supportingAuthorities: ["BOC post-clearance audit issuances"]
      },
      CUSTOMS_EXEMPTION: {
        keywords: [/\bcustoms exemption\b/i, /\bduty exempt\b/i],
        retrievalStrategy: "CUS_EXEMPTION_CMTA_FIRST",
        controllingAuthorities: ["CMTA exemption provisions"],
        supportingAuthorities: ["BOC exemption issuances"]
      }
    }
  },

  SPC: {
    domainCode: "SPC",
    domainName: "Transfer Pricing and Special Regimes",
    keywords: [/\btransfer pricing\b/i, /\bpeza\b/i, /\bcreate incentives\b/i, /\bjoint venture\b/i, /\bfirb\b/i, /\barm'?s length\b/i],
    defaultSubIssue: "TRANSFER_PRICING",
    subIssues: {
      TRANSFER_PRICING: {
        keywords: [/\btransfer pricing\b/i, /\barm'?s length\b/i, /\btpd\b/i],
        retrievalStrategy: "SPC_TRANSFER_PRICING_FIRST",
        controllingAuthorities: ["NIRC related-party and anti-avoidance provisions"],
        supportingAuthorities: ["RR 19-2020", "Transfer pricing documentation rules", "OECD persuasive guidance where appropriate"]
      },
      PEZA: {
        keywords: [/\bpeza\b/i, /\beconomic zone\b/i],
        retrievalStrategy: "SPC_PEZA_SPECIAL_REGIME_FIRST",
        controllingAuthorities: ["PEZA law", "CREATE Act"],
        supportingAuthorities: ["PEZA, FIRB, and BIR issuances"]
      },
      CREATE_INCENTIVES: {
        keywords: [/\bcreate\b/i, /\bincentive\b/i, /\btax holiday\b/i, /\bscit\b/i],
        retrievalStrategy: "SPC_CREATE_INCENTIVES_FIRST",
        controllingAuthorities: ["CREATE Act"],
        supportingAuthorities: ["FIRB and BIR implementing issuances"]
      },
      JOINT_VENTURE: {
        keywords: [/\bjoint venture\b/i, /\bjv\b/i, /\bunincorporated joint venture\b/i],
        retrievalStrategy: "SPC_JOINT_VENTURE_CHARACTERIZATION_FIRST",
        controllingAuthorities: ["NIRC joint venture and income tax provisions"],
        supportingAuthorities: ["BIR rulings and regulations on joint ventures"]
      }
    }
  },

  CON: {
    domainCode: "CON",
    domainName: "Constitutional Tax Issues",
    keywords: [/\bdue process\b/i, /\bequal protection\b/i, /\buniformity\b/i, /\bconstitutional\b/i, /\bretroactive\b/i, /\btax exemption\b/i],
    defaultSubIssue: "DUE_PROCESS",
    subIssues: {
      DUE_PROCESS: {
        keywords: [/\bdue process\b/i, /\bnotice\b/i, /\bhearing\b/i],
        retrievalStrategy: "CON_DUE_PROCESS_CONSTITUTION_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Constitutional due process clause"],
        supportingJurisprudence: ["Supreme Court due process tax cases"]
      },
      EQUAL_PROTECTION: {
        keywords: [/\bequal protection\b/i],
        retrievalStrategy: "CON_EQUAL_PROTECTION_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Constitutional equal protection clause"],
        supportingJurisprudence: ["Supreme Court equal protection tax cases"]
      },
      UNIFORMITY: {
        keywords: [/\buniformity\b/i, /\buniform and equitable\b/i],
        retrievalStrategy: "CON_UNIFORMITY_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Constitutional uniformity rule"],
        supportingJurisprudence: ["Supreme Court tax uniformity cases"]
      },
      RETROACTIVITY: {
        keywords: [/\bretroactive\b/i, /\bprospective\b/i, /\bvested rights\b/i],
        retrievalStrategy: "CON_RETROACTIVITY_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Constitutional due process principles"],
        supportingAuthorities: ["NIRC/BIR rules on retroactivity"],
        supportingJurisprudence: ["Supreme Court retroactivity tax cases"]
      },
      TAX_EXEMPTION: {
        keywords: [/\btax exemption\b/i, /\bstrictissimi juris\b/i],
        retrievalStrategy: "CON_TAX_EXEMPTION_JURISPRUDENCE_FIRST",
        controllingAuthorities: ["Constitutional and statutory tax exemption rules"],
        supportingJurisprudence: ["Supreme Court tax exemption jurisprudence"]
      }
    }
  }
});

const ALL_DOMAIN_CONFIGS = Object.freeze({
  ...DOMAIN_CONFIGS,
  ...DOMAIN_CONFIGS_PART_2
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT",
    VALUE_ADDED_TAX: "VAT",
    VAT_LIABILITY: "VAT",
    VAT_REFUND: "VAT",
    VAT_EXEMPTION: "VAT",
    ZERO_RATED_SALES: "VAT",

    CIT: "CIT",
    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "CIT",
    RCIT: "CIT",
    MCIT: "CIT",
    NOLCO: "CIT",

    IIT: "IIT",
    INDIVIDUAL_INCOME_TAX: "IIT",

    WHT: "WHT",
    WITHHOLDING: "WHT",
    WITHHOLDING_TAX: "WHT",
    EWT: "WHT",
    CWT: "WHT",
    FWT: "WHT",

    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    DONORS_TAX: "EST",

    PERCENTAGE_TAX: "PCT",
    PCT: "PCT",

    EXCISE_TAX: "EXC",
    EXC: "EXC",

    PRESCRIPTION: "PRE",
    ASSESSMENT: "PRE",
    DUE_PROCESS: "PRE",
    LOA: "PRE",
    PAN_FAN: "PRE",

    DISPUTE_RESOLUTION: "DIS",
    PROTEST: "DIS",
    CTA_APPEAL: "DIS",

    LOCAL_TAX: "LGT",
    LOCAL_GOVERNMENT_TAX: "LGT",
    REAL_PROPERTY_TAX: "LGT",

    CUSTOMS: "CUS",
    TARIFF: "CUS",

    TRANSFER_PRICING: "SPC",
    PEZA: "SPC",
    SPECIAL_REGIME: "SPC",

    CONSTITUTIONAL: "CON",

    GENERAL_TAX: "GENERAL_TAX"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    CREATE_ACT: "STATUTE",
    TRAIN_LAW: "STATUTE",
    CMTA: "STATUTE",
    LGC: "STATUTE",
    TREATY: "TAX_TREATY",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULINGS: "BIR_RULING",
    IFRS: "PFRS",
    BOC: "BOC_ISSUANCE"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    SUBSTANCE: "SUBSTANTIVE",
    PROCEDURE: "PROCEDURAL",
    PROOF: "EVIDENTIARY",
    EVIDENCE: "EVIDENTIARY",
    JURISDICTION: "JURISDICTIONAL",
    FACT: "FACTUAL",
    FACTS: "FACTUAL",
    CONTRACT: "CONTRACTUAL",
    ECONOMIC: "ECONOMIC_SUBSTANCE",
    TRANSACTION_CHARACTERIZATION: "TRANSACTION",
    CONSTITUTION: "CONSTITUTIONAL"
  };

  return aliases[raw] || raw || null;
}

function detectExactAuthority(question = "") {
  const value = normalizeText(question);

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i]
  ];

  for (const [type, regex] of issuancePatterns) {
    const match = value.match(regex);

    if (match) {
      return {
        detected: true,
        type,
        reference: `${type} No. ${Number(match[1])}-${normalizeYear(match[2])}`,
        number: String(Number(match[1])),
        year: normalizeYear(match[2])
      };
    }
  }

  const ra = value.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);
  if (ra) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `RA ${ra[1]}`,
      number: ra[1],
      year: null
    };
  }

  const nircSec = value.match(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d+[a-z]?(?:\([a-z0-9]+\))*)\b/i);
  if (nircSec) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `NIRC Sec. ${nircSec[1]}`,
      number: nircSec[1],
      year: null
    };
  }

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) {
    return {
      detected: true,
      type: "SUPREME_COURT",
      reference: `G.R. No. ${gr[1]}`,
      number: gr[1],
      year: null
    };
  }

  const cta =
    value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i);

  if (cta) {
    return {
      detected: true,
      type: "CTA_DIVISION",
      reference: `CTA ${cta[1]}`,
      number: cta[1],
      year: null
    };
  }

  return {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  };
}

function scoreDomain(question = "", domainConfig = {}) {
  const q = normalizeText(question);
  let score = 0;

  for (const pattern of safeArray(domainConfig.keywords)) {
    if (pattern.test(q)) score += 8;
  }

  for (const [subIssue, config] of Object.entries(domainConfig.subIssues || {})) {
    for (const pattern of safeArray(config.keywords)) {
      if (pattern.test(q)) score += 12;
    }
    if (q.toUpperCase().includes(subIssue)) score += 6;
  }

  return score;
}

function detectTaxDomain(question = "", queryIntent = {}) {
  const scores = Object.values(ALL_DOMAIN_CONFIGS)
    .map((domain) => ({
      domainCode: domain.domainCode,
      score: scoreDomain(question, domain)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (queryIntent?.domainCode && ALL_DOMAIN_CONFIGS[queryIntent.domainCode]) {
    scores.unshift({
      domainCode: queryIntent.domainCode,
      score: 999
    });
  }

  if (queryIntent?.primaryDomain && ALL_DOMAIN_CONFIGS[queryIntent.primaryDomain]) {
    scores.unshift({
      domainCode: queryIntent.primaryDomain,
      score: 995
    });
  }

  return unique(scores.map((item) => item.domainCode)).slice(0, 4);
}

function detectSubIssueForDomain(question = "", domainConfig = {}, queryIntent = {}) {
  if (queryIntent?.subIssue && domainConfig.subIssues?.[queryIntent.subIssue]) {
    return {
      subIssue: queryIntent.subIssue,
      confidenceBoost: 25
    };
  }

  const scored = Object.entries(domainConfig.subIssues || {})
    .map(([subIssue, config]) => {
      let score = 0;
      for (const pattern of safeArray(config.keywords)) {
        if (pattern.test(question)) score += 20;
      }
      if (question.toUpperCase().includes(subIssue)) score += 8;
      return { subIssue, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) {
    return {
      subIssue: scored[0].subIssue,
      confidenceBoost: scored[0].score
    };
  }

  return {
    subIssue: domainConfig.defaultSubIssue,
    confidenceBoost: 0
  };
}

function detectPrimaryIssue(question = "", queryIntent = {}) {
  const domains = detectTaxDomain(question, queryIntent);
  return domains[0] || "GENERAL_TAX";
}

function detectSubIssue(question = "", primaryIssue = "GENERAL_TAX", queryIntent = {}) {
  const domainConfig = ALL_DOMAIN_CONFIGS[primaryIssue];
  if (!domainConfig) return "GENERAL";

  return detectSubIssueForDomain(question, domainConfig, queryIntent).subIssue;
}

function detectLegalDimensions(question = "", primaryIssue = "GENERAL_TAX", subIssue = "GENERAL") {
  const q = lower(question);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(["VAT", "CIT", "IIT", "WHT", "EST", "PCT", "EXC", "LGT", "CUS", "SPC"].includes(primaryIssue), LEGAL_DIMENSION.SUBSTANTIVE);
  push(["PRE", "DIS"].includes(primaryIssue), LEGAL_DIMENSION.PROCEDURAL);
  push(primaryIssue === "CON", LEGAL_DIMENSION.CONSTITUTIONAL);

  push(/\bdeadline|due date|filing|appeal|protest|prescription|assessment|return|form|registration\b/i.test(q), LEGAL_DIMENSION.PROCEDURAL);
  push(/\binvoice|receipt|proof|evidence|substantiation|documentary|burden of proof\b/i.test(q), LEGAL_DIMENSION.EVIDENTIARY);
  push(/\bjurisdiction|jurisdictional|cta|condition precedent\b/i.test(q), LEGAL_DIMENSION.JURISDICTIONAL);
  push(/\beffective|retroactive|prospective|superseded|amended|repealed\b/i.test(q), LEGAL_DIMENSION.TEMPORAL);
  push(/\brmc|rmo|ramo|bir ruling|administrative|interpretative|clarificatory\b/i.test(q), LEGAL_DIMENSION.ADMINISTRATIVE);
  push(/\bfacts|actual|scenario|transaction|documentation\b/i.test(q), LEGAL_DIMENSION.FACTUAL);
  push(/\bcontract|agreement|clause|lease|concession\b/i.test(q), LEGAL_DIMENSION.CONTRACTUAL);
  push(/\beconomic substance|substance over form|sham|simulation\b/i.test(q), LEGAL_DIMENSION.ECONOMIC_SUBSTANCE);
  push(/\bcompute|computation|calculate|how much|tax due|tax payable\b/i.test(q), LEGAL_DIMENSION.COMPUTATIONAL);

  if (subIssue.includes("DUE_PROCESS")) dimensions.push(LEGAL_DIMENSION.CONSTITUTIONAL);
  if (subIssue.includes("PROTEST") || subIssue.includes("CTA") || subIssue.includes("FDDA")) dimensions.push(LEGAL_DIMENSION.PROCEDURAL);

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectQueryIntent(question = "", primaryIssue = "GENERAL_TAX", queryIntent = {}) {
  const q = lower(question);

  if (queryIntent?.intent) return queryIntent.intent;
  if (queryIntent?.requiresSourceInventory) return QUERY_INTENT.SOURCE_INVENTORY;
  if (queryIntent?.requiresComputation || /\bcompute|calculate|how much|tax due|tax payable\b/i.test(q)) return QUERY_INTENT.COMPUTATION;
  if (queryIntent?.reviewMode || queryIntent?.assessmentMode) return QUERY_INTENT.REVIEW;
  if (/\bwhat is\b|\bdefine\b|\bmeaning\b|\bnature of\b|\bscope of\b/i.test(q)) return QUERY_INTENT.DEFINITION;
  if (["PRE", "DIS"].includes(primaryIssue)) return QUERY_INTENT.DISPUTE;
  if (/\bcan we\b|\bshould we\b|\bis it better\b|\bstructure\b|\bplanning\b|\btax efficient\b/i.test(q)) return QUERY_INTENT.PLANNING;
  if (/\bfile|filing|payment|return|registration|deadline|due date|submit|comply\b/i.test(q)) return QUERY_INTENT.COMPLIANCE;

  return QUERY_INTENT.ADVISORY;
}

function buildLegalQuestionPresented({ question = "", primaryIssue, subIssue, domainName }) {
  const templates = {
    VAT: `What Value-Added Tax rule governs the ${subIssue || "classified VAT issue"}?`,
    CIT: `What Corporate Income Tax rule governs the ${subIssue || "classified CIT issue"}?`,
    IIT: `What Individual Income Tax rule governs the ${subIssue || "classified IIT issue"}?`,
    WHT: `What withholding tax rule governs the ${subIssue || "classified WHT issue"}?`,
    EST: `What estate or donor's tax rule governs the ${subIssue || "classified EST issue"}?`,
    PCT: `What percentage tax rule governs the ${subIssue || "classified PCT issue"}?`,
    EXC: `What excise tax rule governs the ${subIssue || "classified EXC issue"}?`,
    PRE: `What prescription, assessment, or due process rule governs the ${subIssue || "classified PRE issue"}?`,
    DIS: `What tax dispute or remedy rule governs the ${subIssue || "classified DIS issue"}?`,
    LGT: `What local government taxation rule governs the ${subIssue || "classified LGT issue"}?`,
    CUS: `What customs or tariff rule governs the ${subIssue || "classified CUS issue"}?`,
    SPC: `What transfer pricing or special regime rule governs the ${subIssue || "classified SPC issue"}?`,
    CON: `What constitutional tax rule governs the ${subIssue || "classified CON issue"}?`
  };

  return templates[primaryIssue] || normalizeText(question) || `What Philippine tax rule governs the issue under ${domainName || "the classified domain"}?`;
}

function buildAuthoritiesFromConfig(domainConfig = {}, subIssue = "GENERAL", exactAuthority = {}) {
  const subConfig = domainConfig.subIssues?.[subIssue] || {};
  const controllingAuthorities = unique(safeArray(subConfig.controllingAuthorities));
  const supportingAuthorities = unique(safeArray(subConfig.supportingAuthorities));
  const supportingJurisprudence = unique(safeArray(subConfig.supportingJurisprudence));

  if (exactAuthority?.detected && exactAuthority.reference) {
    if (exactAuthority.type === "SUPREME_COURT" || exactAuthority.type === "CTA_DIVISION") {
      supportingJurisprudence.unshift(exactAuthority.reference);
    } else if (["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(exactAuthority.type)) {
      supportingAuthorities.unshift(exactAuthority.reference);
    } else {
      controllingAuthorities.unshift(exactAuthority.reference);
    }
  }

  const targetAuthorities = unique([
    ...controllingAuthorities,
    ...supportingAuthorities,
    ...supportingJurisprudence
  ]);

  return {
    targetAuthorities,
    controllingAuthorities: unique(controllingAuthorities),
    supportingAuthorities: unique(supportingAuthorities),
    supportingJurisprudence: unique(supportingJurisprudence)
  };
}

function buildTargetAuthorities({ primaryIssue, subIssue, exactAuthority }) {
  const domainConfig = ALL_DOMAIN_CONFIGS[primaryIssue];
  if (!domainConfig) {
    return {
      groups: {},
      flat: exactAuthority?.reference ? [exactAuthority.reference] : []
    };
  }

  const authoritySet = buildAuthoritiesFromConfig(domainConfig, subIssue, exactAuthority);

  return {
    groups: {
      controllingAuthorities: authoritySet.controllingAuthorities,
      supportingAuthorities: authoritySet.supportingAuthorities,
      supportingJurisprudence: authoritySet.supportingJurisprudence
    },
    flat: authoritySet.targetAuthorities
  };
}

function buildKeyTerms({ question = "", primaryIssue, subIssue, domains = [], exactAuthority }) {
  const terms = [primaryIssue, subIssue, ...domains];

  if (exactAuthority?.reference) terms.push(exactAuthority.reference);

  const domainConfig = ALL_DOMAIN_CONFIGS[primaryIssue];
  const subConfig = domainConfig?.subIssues?.[subIssue];

  for (const pattern of safeArray(domainConfig?.keywords)) {
    if (pattern.test(question)) terms.push(domainConfig.domainName);
  }

  for (const pattern of safeArray(subConfig?.keywords)) {
    if (pattern.test(question)) terms.push(subIssue);
  }

  const q = lower(question);
  const patterns = [
    ["legal basis", /\blegal basis\b/i],
    ["jurisprudence", /\bjurisprudence|case|supreme court|cta\b/i],
    ["computation", /\bcompute|calculate|tax due|tax payable\b/i],
    ["audit risk", /\baudit risk|misstatement|working paper\b/i],
    ["source inventory", /\blist sources|source inventory|authorities\b/i],
    ["conflict analysis", /\bconflict|prevails|override|hierarchy\b/i],
    ["fact pattern", /\bfacts|scenario|actual transaction\b/i],
    ["contract interpretation", /\bcontract|agreement|clause\b/i]
  ];

  for (const [term, regex] of patterns) {
    if (regex.test(q)) terms.push(term);
  }

  return unique(terms);
}

function detectComplexity({ question = "", primaryIssue, domains = [], keyTerms = [], queryIntent = {} }) {
  let score = 0;
  const q = lower(question);

  if (domains.length > 1) score += 2;
  if (keyTerms.length >= 6) score += 1;
  if (question.length > 220) score += 1;
  if (["PRE", "DIS", "SPC", "CON", "CUS"].includes(primaryIssue)) score += 1;
  if (queryIntent?.requiresFactPatternAnalysis || queryIntent?.requiresAuditRisk || queryIntent?.requiresComputation) score += 1;

  if (/\bconflict|prevails|hierarchy|doctrine|jurisprudence|contract|agreement|actual facts|audit risk|legal consequence|economic substance\b/i.test(q)) {
    score += 2;
  }

  if (score >= 4) return COMPLEXITY.MULTI_ISSUE;
  if (score === 3) return COMPLEXITY.COMPLEX;
  if (score >= 1) return COMPLEXITY.MODERATE;
  return COMPLEXITY.SIMPLE;
}

function detectFactSensitivity(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (/\bwhat is|define|meaning|nature\b/i.test(q)) return FACT_SENSITIVITY.LOW;

  if (
    ["PRE", "DIS", "SPC", "CUS"].includes(primaryIssue) ||
    /\bcontract|agreement|invoice|receipt|actual|facts|scenario|transaction|booked|audit|supporting document|economic substance|substance over form\b/i.test(q)
  ) {
    return FACT_SENSITIVITY.HIGH;
  }

  return FACT_SENSITIVITY.MODERATE;
}

function detectRetrievalStrategy({ primaryIssue, subIssue, exactAuthority, factSensitivity }) {
  if (exactAuthority?.detected) return RETRIEVAL_STRATEGY.EXACT_AUTHORITY;

  const domainConfig = ALL_DOMAIN_CONFIGS[primaryIssue];
  const subConfig = domainConfig?.subIssues?.[subIssue];

  if (subConfig?.retrievalStrategy) return subConfig.retrievalStrategy;

  if (["PRE", "DIS", "CON"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.JURISPRUDENTIAL;
  if (["CUS", "LGT", "PCT", "EXC"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.PROCEDURAL;
  if (["SPC"].includes(primaryIssue)) return RETRIEVAL_STRATEGY.FACT_DRIVEN;
  if (factSensitivity === FACT_SENSITIVITY.HIGH) return RETRIEVAL_STRATEGY.FACT_DRIVEN;

  return RETRIEVAL_STRATEGY.MIXED;
}

function detectCaseRoleFilters(primaryIssue, subIssue, domains = []) {
  const filters = [];

  if (["PRE", "DIS", "CON"].includes(primaryIssue)) filters.push("jurisprudence", "procedural", "due process", "hierarchy");
  if (primaryIssue === "VAT") filters.push("VAT", subIssue);
  if (primaryIssue === "CIT") filters.push("income tax", subIssue);
  if (primaryIssue === "WHT") filters.push("withholding tax", subIssue);
  if (primaryIssue === "SPC") filters.push("special regime", "transfer pricing", "incentives");
  if (primaryIssue === "CUS") filters.push("customs", "tariff", "CMTA");
  if (domains.length) filters.push(...domains);

  return unique(filters);
}

function buildExcludedAuthorities(primaryIssue, subIssue) {
  const exclusions = [];

  if (!(primaryIssue === "VAT" && subIssue === "REFUND_CREDIT")) {
    exclusions.push("VAT refund cases unless the issue involves Section 112 or input VAT refund");
  }

  if (!["PRE", "DIS", "CON"].includes(primaryIssue)) {
    exclusions.push("procedural protest, CTA jurisdiction, or constitutional due process cases unless directly relevant");
  }

  if (primaryIssue !== "SPC") {
    exclusions.push("transfer pricing or special regime authorities unless directly relevant");
  }

  return unique(exclusions);
}

function detectMischaracterizationRisk(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (["SPC", "CUS"].includes(primaryIssue)) return "high";

  if (/\breimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|joint venture|transfer pricing|related party\b/i.test(q)) {
    return "high";
  }

  if (["VAT", "WHT", "CIT"].includes(primaryIssue)) return "moderate";

  return "low";
}

function shouldRequireTransactionCharacterization(primaryIssue, question = "") {
  return (
    ["SPC"].includes(primaryIssue) ||
    /\breimbursement|pass[- ]through|principal|agent|concession|lease|bundled|package|economic substance|substance over form|joint venture|related party\b/i.test(question)
  );
}

function shouldRequireFactPattern(primaryIssue, factSensitivity) {
  return (
    factSensitivity === FACT_SENSITIVITY.HIGH ||
    ["PRE", "DIS", "SPC", "CUS", "LGT"].includes(primaryIssue)
  );
}

function shouldRequireDoctrinalAnalysis(primaryIssue, question = "") {
  return (
    ["PRE", "DIS", "CON"].includes(primaryIssue) ||
    /\bdoctrine|jurisprudence|case|conflict|prevails|hierarchy\b/i.test(question)
  );
}

function shouldRunConflictCheck(primaryIssue, question = "") {
  return (
    /\bconflict|contradict|prevails|override|hierarchy|versus|vs\.?\b/i.test(question) ||
    ["PRE", "DIS", "CON"].includes(primaryIssue)
  );
}

function detectResponseMode(complexity, queryIntent = {}) {
  if (queryIntent?.requiresSimpleDefinition || complexity === COMPLEXITY.SIMPLE) return "FAST_DEFINITION";
  if (queryIntent?.requiresComputation) return "COMPUTATION";
  if (queryIntent?.requiresAuditRisk) return "AUDIT_RISK";
  if (queryIntent?.requiresSourceInventory) return "SOURCE_INVENTORY";
  if (complexity === COMPLEXITY.MULTI_ISSUE || complexity === COMPLEXITY.COMPLEX) return "TECHNICAL";
  return "STANDARD";
}

function detectOrchestrationMode(complexity, flags = {}) {
  if (flags.requiresFactPatternAnalysis || flags.requiresAuditRiskAnalysis) return "COMPLEX_ADVISORY";
  if (flags.requiresJurisprudence || flags.requiresConflictAnalysis) return "LEGAL_ANALYSIS";
  if (complexity === COMPLEXITY.SIMPLE) return "FAST_DEFINITION";
  return "STANDARD_TAX";
}

function computeConfidence(domainScore = 0, subIssueBoost = 0, exactAuthority = {}) {
  let confidence = 0.45;

  if (domainScore >= 8) confidence += 0.2;
  if (domainScore >= 20) confidence += 0.15;
  if (subIssueBoost >= 20) confidence += 0.15;
  if (exactAuthority?.detected) confidence += 0.1;

  return Math.min(0.98, Number(confidence.toFixed(2)));
}

function buildOrchestrationClassification(classification = {}) {
  return {
    primaryIssue: classification.primaryIssue || "GENERAL_TAX",
    subIssue: classification.subIssue || "GENERAL",
    domainCode: classification.domainCode || classification.primaryIssue || null,
    domainName: classification.domainName || null,
    subIssues: safeArray(classification.subIssues),
    retrievalStrategy: classification.retrievalStrategy || RETRIEVAL_STRATEGY.MIXED,
    targetAuthorities: safeArray(classification.targetAuthorities),
    controllingAuthorities: safeArray(classification.controllingAuthorities),
    supportingAuthorities: safeArray(classification.supportingAuthorities),
    supportingJurisprudence: safeArray(classification.supportingJurisprudence),
    requiredAnswerSections: safeArray(classification.requiredAnswerSections),
    legalDimensions: safeArray(classification.legalDimensions),
    taxDomains: safeArray(classification.taxDomains),
    issueComplexity: classification.issueComplexity || classification.complexity || COMPLEXITY.MODERATE,
    complexity: classification.complexity || COMPLEXITY.MODERATE,
    responseMode: classification.responseMode || "STANDARD",
    orchestrationMode: classification.orchestrationMode || "STANDARD_TAX",
    doctrinalMode: classification.doctrinalMode || "NONE",
    requiresLegalBasis: Boolean(classification.requiresLegalBasis),
    requiresJurisprudence: Boolean(classification.requiresJurisprudence),
    requiresComputation: Boolean(classification.requiresComputation),
    requiresAuditRiskAnalysis: Boolean(classification.requiresAuditRiskAnalysis),
    requiresFactPatternAnalysis: Boolean(classification.requiresFactPatternAnalysis),
    requiresSourceInventory: Boolean(classification.requiresSourceInventory),
    requiresConflictAnalysis: Boolean(classification.requiresConflictAnalysis),
    tpmProfile: classification.tpmProfile || "standard",
    confidence: classification.confidence || 0,
    fallbackClassificationUsed: Boolean(classification.fallbackClassificationUsed),
    exactAuthority: classification.exactAuthority || { detected: false, type: null, reference: null },
    contextPolicy: {
      useContextOrchestrationEngine: true,
      preventRawFullDocumentInjection: true,
      preventFullDebugObjectInjection: true,
      preventFullEngineOutputInjection: true,
      passCompactClassificationOnly: true
    }
  };
}

function classifyTaxIssue(question = "", queryIntent = {}) {
  const normalizedQuestion = normalizeText(question);
  const exactAuthority = detectExactAuthority(normalizedQuestion);

  const detectedDomains = detectTaxDomain(normalizedQuestion, queryIntent);
  const primaryIssue = detectedDomains[0] || "GENERAL_TAX";
  const domainConfig = ALL_DOMAIN_CONFIGS[primaryIssue];

  const domainScores = Object.values(ALL_DOMAIN_CONFIGS)
    .map((domain) => ({
      domainCode: domain.domainCode,
      score: scoreDomain(normalizedQuestion, domain)
    }))
    .sort((a, b) => b.score - a.score);

  const domainScore = domainScores.find((item) => item.domainCode === primaryIssue)?.score || 0;

  const subIssueResult = domainConfig
    ? detectSubIssueForDomain(normalizedQuestion, domainConfig, queryIntent)
    : { subIssue: "GENERAL", confidenceBoost: 0 };

  const subIssue = subIssueResult.subIssue;
  const legalDimensions = detectLegalDimensions(normalizedQuestion, primaryIssue, subIssue);
  const finalQueryIntent = detectQueryIntent(normalizedQuestion, primaryIssue, queryIntent);

  const authorityTargets = buildTargetAuthorities({
    primaryIssue,
    subIssue,
    exactAuthority
  });

  const keyTerms = buildKeyTerms({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domains: detectedDomains,
    exactAuthority
  });

  const complexityFlag = detectComplexity({
    question: normalizedQuestion,
    primaryIssue,
    domains: detectedDomains,
    keyTerms,
    queryIntent
  });

  const factSensitivity = detectFactSensitivity(primaryIssue, subIssue, normalizedQuestion);

  const retrievalStrategy = detectRetrievalStrategy({
    primaryIssue,
    subIssue,
    exactAuthority,
    factSensitivity
  });

  const flags = {
    requiresLegalBasis:
      queryIntent?.requiresLegalBasis === true ||
      /\blegal basis|basis|authority|source\b/i.test(normalizedQuestion),

    requiresJurisprudence:
      queryIntent?.requiresJurisprudence === true ||
      /\bjurisprudence|case|supreme court|cta|g\.?\s*r\.?\s*no\b/i.test(normalizedQuestion),

    requiresComputation:
      queryIntent?.requiresComputation === true ||
      /\bcompute|calculate|how much|tax due|tax payable|amount\b/i.test(normalizedQuestion),

    requiresAuditRiskAnalysis:
      queryIntent?.requiresAuditRisk === true ||
      queryIntent?.requiresAuditRiskAnalysis === true ||
      /\baudit risk|misstatement|working paper|afs|pfrs|pas\b/i.test(normalizedQuestion),

    requiresFactPatternAnalysis:
      queryIntent?.requiresFactPatternAnalysis === true ||
      shouldRequireFactPattern(primaryIssue, factSensitivity),

    requiresSourceInventory:
      queryIntent?.requiresSourceInventory === true ||
      /\blist.*source|source inventory|what authorities|complete list of authorities\b/i.test(normalizedQuestion),

    requiresConflictAnalysis:
      queryIntent?.requiresConflictAnalysis === true ||
      shouldRunConflictCheck(primaryIssue, normalizedQuestion)
  };

  const transactionCharacterizationRequired =
    shouldRequireTransactionCharacterization(primaryIssue, normalizedQuestion);

  const doctrinalAnalysisRequired =
    shouldRequireDoctrinalAnalysis(primaryIssue, normalizedQuestion) ||
    flags.requiresJurisprudence ||
    flags.requiresConflictAnalysis;

  const responseMode = detectResponseMode(complexityFlag, {
    ...queryIntent,
    ...flags
  });

  const orchestrationMode = detectOrchestrationMode(complexityFlag, {
    ...flags,
    requiresJurisprudence: flags.requiresJurisprudence,
    requiresConflictAnalysis: flags.requiresConflictAnalysis
  });

  const confidence = computeConfidence(domainScore, subIssueResult.confidenceBoost, exactAuthority);
  const fallbackClassificationUsed = confidence < 0.55 || !domainConfig;

  const legalQuestionPresented = buildLegalQuestionPresented({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domainName: domainConfig?.domainName
  });

  const classification = {
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    originalQuery: question,
    normalizedQuery: normalizedQuestion,

    primaryIssue,
    subIssue,
    domainCode: domainConfig?.domainCode || primaryIssue,
    domainName: domainConfig?.domainName || "General Philippine Tax",

    subIssues: unique([subIssue]),

    queryIntent: finalQueryIntent,
    preservedQueryIntent: queryIntent || {},

    legalQuestionPresented,
    legalDimensions,

    taxDomains: detectedDomains,
    candidateDomains: domainScores.slice(0, 4),

    targetAuthorities: authorityTargets.flat,
    targetAuthorityGroups: authorityTargets.groups,
    controllingAuthorities: authorityTargets.groups.controllingAuthorities || [],
    supportingAuthorities: authorityTargets.groups.supportingAuthorities || [],
    supportingJurisprudence: authorityTargets.groups.supportingJurisprudence || [],

    requiredAnswerSections: STANDARD_REQUIRED_ANSWER_SECTIONS,

    keyTerms,
    complexityFlag,
    complexity: complexityFlag,
    issueComplexity: complexityFlag,
    factSensitivity,
    retrievalStrategy,

    responseMode,
    orchestrationMode,
    doctrinalMode: doctrinalAnalysisRequired ? "DOCTRINAL_ANALYSIS_REQUIRED" : "NONE",

    ...flags,

    transactionCharacterizationRequired,
    factPatternRequired: flags.requiresFactPatternAnalysis,
    doctrinalAnalysisRequired,
    potentialConflictCheck: flags.requiresConflictAnalysis,

    caseRoleFilters: detectCaseRoleFilters(primaryIssue, subIssue, detectedDomains),
    excludedAuthorities: buildExcludedAuthorities(primaryIssue, subIssue),
    mischaracterizationRisk: detectMischaracterizationRisk(primaryIssue, subIssue, normalizedQuestion),

    exactAuthority,

    confidence,
    fallbackClassificationUsed,
    tpmProfile: queryIntent?.tpmProfile || (complexityFlag === COMPLEXITY.SIMPLE ? "light" : complexityFlag === COMPLEXITY.MULTI_ISSUE ? "expanded" : "standard"),

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressUnrelatedProceduralCases: !["PRE", "DIS"].includes(primaryIssue),
      suppressVatRefundCasesUnlessRefundIssue:
        primaryIssue === "VAT" && subIssue !== "REFUND_CREDIT",
      requirePrimaryAuthorityForDefinitions:
        finalQueryIntent === QUERY_INTENT.DEFINITION,
      requireFactDisclosureBeforeConclusion: flags.requiresFactPatternAnalysis,
      allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true,
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true
    },

    downstreamRouting: {
      useRetrievalEngine: true,
      useRerankerEngine: true,
      useJurisprudenceEngine: doctrinalAnalysisRequired,
      useConflictEngine: flags.requiresConflictAnalysis,
      useTransactionCharacterizationEngine: transactionCharacterizationRequired,
      useFactPatternEngine: flags.requiresFactPatternAnalysis,
      useEvidenceEvaluationEngine:
        flags.requiresFactPatternAnalysis ||
        legalDimensions.includes(LEGAL_DIMENSION.EVIDENTIARY),
      useAnswerRenderer: true
    },

    sourceOrderingPolicy: {
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      hideIssueMismatchedSources: true,
      preserveControllingAuthorities: true
    },

    conflictDisplayPolicy: {
      displayConflictYesOnlyWhenConflictTrue: true,
      requireCompleteConflictMetadata: true,
      requireSameIssueGate: true,
      requireOppositeHoldingGate: true
    }
  };

  const enriched = enrichIssueClassification(classification, normalizedQuestion);

  return {
    ...enriched,
    orchestrationClassification: buildOrchestrationClassification(enriched)
  };
}

function buildIssueClassificationSearchQueries(classification = {}, maxQueries = 8) {
  const queries = [];

  if (classification.exactAuthority?.detected) {
    queries.push(classification.exactAuthority.reference);
  }

  queries.push(classification.normalizedQuery);
  queries.push(classification.legalQuestionPresented);
  queries.push(`${classification.primaryIssue} ${classification.subIssue}`);

  for (const authority of safeArray(classification.targetAuthorities)) {
    queries.push(`${classification.legalQuestionPresented} ${authority}`);
    queries.push(authority);
  }

  for (const term of classification.keyTerms || []) {
    queries.push(`${classification.primaryIssue} ${classification.subIssue} ${term}`);
  }

  return unique(queries.map(normalizeText)).filter(Boolean).slice(0, maxQueries);
}

function detectDocIssues(doc = {}) {
  const haystack = lower(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.title,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type
    ].filter(Boolean).join(" ")
  );

  const issues = [];

  for (const [domainCode, config] of Object.entries(ALL_DOMAIN_CONFIGS)) {
    for (const pattern of safeArray(config.keywords)) {
      if (pattern.test(haystack)) issues.push(domainCode);
    }

    for (const [subIssue, subConfig] of Object.entries(config.subIssues || {})) {
      for (const pattern of safeArray(subConfig.keywords)) {
        if (pattern.test(haystack)) issues.push(domainCode, subIssue);
      }
    }
  }

  return unique(issues);
}

function isIssueClassificationCompatibleWithDoc(classification = {}, doc = {}) {
  const docIssues = detectDocIssues(doc);
  const primary = classification.primaryIssue || classification.domainCode;
  const subIssue = classification.subIssue;
  const subIssues = safeArray(classification.subIssues);

  if (!docIssues.length) return true;

  if (docIssues.includes(primary)) return true;
  if (subIssue && docIssues.includes(subIssue)) return true;
  if (subIssues.some((issue) => docIssues.includes(issue))) return true;

  if (primary === "GENERAL_TAX") return true;

  if (
    primary === "VAT" &&
    subIssue !== "REFUND_CREDIT" &&
    docIssues.includes("REFUND_CREDIT")
  ) {
    return false;
  }

  return false;
}

function issueClassificationEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    noOpenAICalls: true,
    noRetrieval: true,
    noAnswerGeneration: true,
    allTaxDomainsSupported: true,
    supportedDomains: Object.keys(ALL_DOMAIN_CONFIGS),
    issueFirstRetrievalReady: true,
    domainCodeReady: true,
    domainNameReady: true,
    subIssueReady: true,
    targetAuthoritiesReady: true,
    controllingAuthoritiesReady: true,
    supportingAuthoritiesReady: true,
    supportingJurisprudenceReady: true,
    legalDimensionsReady: true,
    sourceOrderingPolicyReady: true,
    conflictDisplayPolicyReady: true,
    jurisprudenceFilteringReady: true,
    conflictGateReady: true,
    transactionCharacterizationReady: true,
    factPatternReady: true,
    mainTaxEngineClassificationIntegrated: true,
    contextOrchestrationCompatible: true,
    orchestrationClassificationReady: true,
    compactClassificationReady: true,
    passesPrimaryIssue: true,
    passesSubIssue: true,
    passesRetrievalStrategy: true,
    passesTargetAuthorities: true
  };
}

export {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  LEGACY_PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  LEGAL_DIMENSION,
  AUTHORITY_TYPE,
  normalizeIssue,
  normalizeAuthority,
  normalizeDimension,
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,
  buildOrchestrationClassification,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  LEGACY_PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  LEGAL_DIMENSION,
  AUTHORITY_TYPE,
  normalizeIssue,
  normalizeAuthority,
  normalizeDimension,
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  detectLegalDimensions,
  buildOrchestrationClassification,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
};
