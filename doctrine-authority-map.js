"use strict";

import {
  RESIDENT_CITIZEN_INCOME_SCOPE,
  TAXPAYER_DEFINITION
} from "./taxpayer-definition-registry.js";

const DEFINITION_AUTHORITY_MAP = Object.freeze({
  VAT_DEFINITION: {
    primaryIssue: "VAT_LIABILITY",
    domainCode: "VAT",
    domainName: "Value-Added Tax",
    targetAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  INCOME_TAX_DEFINITION: {
    primaryIssue: "INCOME_TAX",
    domainCode: "CIT",
    domainName: "Income Tax",
    targetAuthorities: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
    controllingAuthorities: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  RESIDENT_CITIZEN_INCOME_SCOPE: {
    ...RESIDENT_CITIZEN_INCOME_SCOPE
  },

  TAXPAYER_DEFINITION: {
    ...TAXPAYER_DEFINITION
  },

  WITHHOLDING_TAX_DEFINITION: {
    primaryIssue: "WITHHOLDING",
    domainCode: "WHT",
    domainName: "Withholding Tax",
    targetAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
    controllingAuthorities: ["NIRC Sec. 57", "NIRC Sec. 58"],
    supportingAuthorities: ["RR 2-98"],
    supportingJurisprudence: []
  },

  PERCENTAGE_TAX_DEFINITION: {
    primaryIssue: "PCT",
    domainCode: "PCT",
    domainName: "Percentage Tax",
    targetAuthorities: ["NIRC Sec. 116", "NIRC Sec. 117", "NIRC Sec. 118", "NIRC Sec. 119", "NIRC Sec. 120", "NIRC Sec. 121", "NIRC Sec. 122"],
    controllingAuthorities: ["NIRC Sec. 116", "NIRC Sec. 117", "NIRC Sec. 118", "NIRC Sec. 119", "NIRC Sec. 120", "NIRC Sec. 121", "NIRC Sec. 122"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  EXCISE_TAX_DEFINITION: {
    primaryIssue: "EXC",
    domainCode: "EXC",
    domainName: "Excise Tax",
    targetAuthorities: ["NIRC Title VI", "NIRC Sec. 129", "NIRC Secs. 129-172"],
    controllingAuthorities: ["NIRC Title VI", "NIRC Secs. 129-172"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  DST_DEFINITION: {
    primaryIssue: "DST",
    domainCode: "DST",
    domainName: "Documentary Stamp Tax",
    targetAuthorities: ["NIRC Title VII", "NIRC Sec. 173", "NIRC Secs. 173-201"],
    controllingAuthorities: ["NIRC Title VII", "NIRC Secs. 173-201"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  CGT_DEFINITION: {
    primaryIssue: "CGT",
    domainCode: "CGT",
    domainName: "Capital Gains Tax",
    targetAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "NIRC Sec. 27(D)(2)", "NIRC Sec. 28(A)(7)", "NIRC Sec. 28(B)(5)"],
    controllingAuthorities: ["NIRC Sec. 24(C)", "NIRC Sec. 24(D)", "NIRC Sec. 27(D)(2)", "NIRC Sec. 28(A)(7)", "NIRC Sec. 28(B)(5)"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  DONOR_TAX_DEFINITION: {
    primaryIssue: "EST",
    domainCode: "EST",
    domainName: "Donor's Tax",
    targetAuthorities: ["NIRC Title III", "NIRC Sec. 98", "NIRC Sec. 99", "NIRC Sec. 100", "NIRC Secs. 98-104"],
    controllingAuthorities: ["NIRC Title III", "NIRC Sec. 98", "NIRC Sec. 99", "NIRC Sec. 100", "NIRC Secs. 98-104"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  ESTATE_TAX_DEFINITION: {
    primaryIssue: "EST",
    domainCode: "EST",
    domainName: "Estate Tax",
    targetAuthorities: ["NIRC Title III", "NIRC Sec. 84", "NIRC Secs. 84-97"],
    controllingAuthorities: ["NIRC Title III", "NIRC Secs. 84-97"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  LOCAL_BUSINESS_TAX_DEFINITION: {
    primaryIssue: "LGT",
    domainCode: "LGT",
    domainName: "Local Business Tax",
    targetAuthorities: ["Local Government Code Sec. 143", "Local Government Code Sec. 151", "City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"],
    controllingAuthorities: ["Local Government Code Sec. 143", "Local Government Code Sec. 151"],
    supportingAuthorities: ["Applicable LGU ordinance"],
    supportingJurisprudence: ["City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"]
  },

  REAL_PROPERTY_TAX_DEFINITION: {
    primaryIssue: "RPT",
    domainCode: "LGT",
    domainName: "Real Property Tax",
    targetAuthorities: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
    controllingAuthorities: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
    supportingAuthorities: ["Applicable LGU real property tax ordinance"],
    supportingJurisprudence: []
  },

  CUSTOMS_DUTIES_DEFINITION: {
    primaryIssue: "CUS",
    domainCode: "CUS",
    domainName: "Customs Duties",
    targetAuthorities: ["CMTA", "CMTA customs valuation provisions", "CMTA tariff classification provisions"],
    controllingAuthorities: ["CMTA"],
    supportingAuthorities: ["BOC issuances where applicable"],
    supportingJurisprudence: []
  },

  PEZA_INCENTIVES_DEFINITION: {
    primaryIssue: "SPC",
    domainCode: "SPC",
    domainName: "PEZA / Fiscal Incentives",
    targetAuthorities: ["CREATE Act", "NIRC incentive provisions", "FIRB issuances", "PEZA law"],
    controllingAuthorities: ["CREATE Act", "NIRC incentive provisions", "PEZA law"],
    supportingAuthorities: ["FIRB issuances", "PEZA issuances"],
    supportingJurisprudence: []
  },

  TAX_REFUND_CREDIT_DEFINITION: {
    primaryIssue: "TAX_REFUND_CREDIT",
    domainCode: "DIS",
    domainName: "Tax Refunds and Credits",
    targetAuthorities: ["NIRC Sec. 112", "NIRC Sec. 204", "NIRC Sec. 229"],
    controllingAuthorities: ["NIRC Sec. 112", "NIRC Sec. 204", "NIRC Sec. 229"],
    supportingAuthorities: ["Refund regulations"],
    supportingJurisprudence: ["CIR v. Aichi Forging", "CIR v. San Roque Power"]
  },

  ASSESSMENT_PRESCRIPTION_DEFINITION: {
    primaryIssue: "ASSESSMENT",
    domainCode: "PRE",
    domainName: "Tax Assessment and Prescription",
    targetAuthorities: ["NIRC Sec. 203", "NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013"],
    controllingAuthorities: ["NIRC Sec. 203"],
    supportingAuthorities: ["NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013"],
    supportingJurisprudence: ["CIR v. Metro Star Superama", "CIR v. Enron Subic Power"]
  },

  DEDUCTIONS_DEFINITION: {
    primaryIssue: "DEDUCTIONS",
    domainCode: "CIT",
    domainName: "Deductions",
    targetAuthorities: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],
    controllingAuthorities: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],
    supportingAuthorities: ["Applicable substantiation regulations"],
    supportingJurisprudence: []
  },

  EXEMPTIONS_DEFINITION: {
    primaryIssue: "EXEMPTIONS",
    domainCode: "CON",
    domainName: "Tax Exemptions",
    targetAuthorities: ["Applicable statutory exemption provision", "1987 Constitution tax exemption principles", "Supreme Court tax exemption jurisprudence"],
    controllingAuthorities: ["Applicable statutory exemption provision"],
    supportingAuthorities: [],
    supportingJurisprudence: ["Supreme Court tax exemption jurisprudence"]
  },

  INPUT_TAX_DEFINITION: {
    primaryIssue: "INPUT_TAX",
    domainCode: "VAT",
    domainName: "Input Tax",
    targetAuthorities: ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 110", "NIRC Sec. 112"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  OUTPUT_TAX_DEFINITION: {
    primaryIssue: "OUTPUT_TAX",
    domainCode: "VAT",
    domainName: "Output Tax",
    targetAuthorities: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  ZERO_RATING_DEFINITION: {
    primaryIssue: "ZERO_RATED_SALES",
    domainCode: "VAT",
    domainName: "VAT Zero-Rating",
    targetAuthorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"],
    controllingAuthorities: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)"],
    supportingAuthorities: ["RR 16-2005"],
    supportingJurisprudence: []
  },

  // PATCH-028A-R2A: BIR organizational / foundational definitions
  BIR_DEFINITION: {
    primaryIssue: "BIR_ORGANIZATION",
    domainCode: "BIR",
    domainName: "BIR / NIRC Organizational",
    targetAuthorities: ["NIRC Sec. 2", "NIRC Sec. 3"],
    controllingAuthorities: ["NIRC Sec. 2", "NIRC Sec. 3"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  },

  NIRC_DEFINITION: {
    primaryIssue: "BIR_ORGANIZATION",
    domainCode: "BIR",
    domainName: "BIR / NIRC Organizational",
    targetAuthorities: ["NIRC Sec. 21", "NIRC Sec. 2"],
    controllingAuthorities: ["NIRC Sec. 21"],
    supportingAuthorities: ["NIRC Sec. 2"],
    supportingJurisprudence: []
  },

  TAX_CLASSIFICATION_DEFINITION: {
    primaryIssue: "BIR_ORGANIZATION",
    domainCode: "BIR",
    domainName: "BIR / NIRC Organizational",
    targetAuthorities: ["NIRC Sec. 21"],
    controllingAuthorities: ["NIRC Sec. 21"],
    supportingAuthorities: [],
    supportingJurisprudence: []
  }
});

const DOMAIN_DETECTORS = Object.freeze([
  {
    domainCode: "VAT",
    primaryIssue: "VAT_LIABILITY",
    domainName: "Value-Added Tax",
    defaultSubIssue: "VAT_OVERVIEW",
    patterns: [/\bvat\b/i, /\bvalue[- ]added tax\b/i],
    definitionKey: "VAT_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "INPUT_TAX",
    domainName: "Input Tax",
    defaultSubIssue: "INPUT_TAX",
    patterns: [/\binput tax\b/i, /\binput vat\b/i, /\bcreditable input\b/i],
    definitionKey: "INPUT_TAX_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "OUTPUT_TAX",
    domainName: "Output Tax",
    defaultSubIssue: "OUTPUT_TAX",
    patterns: [/\boutput tax\b/i, /\boutput vat\b/i, /\bvat payable\b/i],
    definitionKey: "OUTPUT_TAX_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "ZERO_RATED_SALES",
    domainName: "VAT Zero-Rating",
    defaultSubIssue: "ZERO_RATING",
    patterns: [/\bzero[- ]rated\b/i, /\bzero rating\b/i, /\b0%\s*vat\b/i],
    definitionKey: "ZERO_RATING_DEFINITION"
  },
  {
    domainCode: "VAT",
    primaryIssue: "VAT_REFUND",
    domainName: "VAT Refund / Credit",
    defaultSubIssue: "REFUND_CREDIT",
    patterns: [/\bvat refund\b/i, /\bunutilized input\b/i, /\bexcess input\b/i, /\bsection 112\b/i, /\bsec\.?\s*112\b/i],
    definitionKey: "TAX_REFUND_CREDIT_DEFINITION"
  },
  {
    domainCode: "CIT",
    primaryIssue: "INCOME_TAX",
    domainName: "Income Tax",
    defaultSubIssue: "INCOME_TAX_OVERVIEW",
    patterns: [/\bincome tax\b/i, /\bcorporate income tax\b/i, /\bcit\b/i, /\brcit\b/i, /\bmcit\b/i, /\bnolco\b/i],
    definitionKey: "INCOME_TAX_DEFINITION"
  },
  {
    domainCode: "WHT",
    primaryIssue: "WITHHOLDING",
    domainName: "Withholding Tax",
    defaultSubIssue: "WITHHOLDING_TAX",
    patterns: [/\bwithholding tax\b/i, /\bwithholding\b/i, /\bewt\b/i, /\bcwt\b/i, /\bfwt\b/i, /\b2307\b/i],
    definitionKey: "WITHHOLDING_TAX_DEFINITION"
  },
  {
    domainCode: "PCT",
    primaryIssue: "PCT",
    domainName: "Percentage Tax",
    defaultSubIssue: "PERCENTAGE_TAX",
    patterns: [/\bpercentage tax\b/i, /\b2551q\b/i, /\bnon[- ]vat\b/i],
    definitionKey: "PERCENTAGE_TAX_DEFINITION"
  },
  {
    domainCode: "EXC",
    primaryIssue: "EXC",
    domainName: "Excise Tax",
    defaultSubIssue: "EXCISE_TAX",
    patterns: [/\bexcise tax\b/i, /\bexcise\b/i, /\bsin tax\b/i],
    definitionKey: "EXCISE_TAX_DEFINITION"
  },
  {
    domainCode: "DST",
    primaryIssue: "DST",
    domainName: "Documentary Stamp Tax",
    defaultSubIssue: "DST",
    patterns: [/\bdocumentary stamp tax\b/i, /\bdst\b/i],
    definitionKey: "DST_DEFINITION"
  },
  {
    domainCode: "CGT",
    primaryIssue: "CGT",
    domainName: "Capital Gains Tax",
    defaultSubIssue: "CGT",
    patterns: [/\bcapital gains tax\b/i, /\bcgt\b/i],
    definitionKey: "CGT_DEFINITION"
  },
  {
    domainCode: "EST",
    primaryIssue: "EST",
    domainName: "Estate Tax",
    defaultSubIssue: "ESTATE_TAX",
    patterns: [/\bestate tax\b/i, /\bgross estate\b/i, /\bdecedent\b/i],
    definitionKey: "ESTATE_TAX_DEFINITION"
  },
  {
    domainCode: "EST",
    primaryIssue: "EST",
    domainName: "Donor's Tax",
    defaultSubIssue: "DONOR_TAX",
    patterns: [/\bdonor'?s tax\b/i, /\bdonor tax\b/i, /\bdonation\b/i, /\bgift tax\b/i],
    definitionKey: "DONOR_TAX_DEFINITION"
  },
  {
    domainCode: "LGT",
    primaryIssue: "LGT",
    domainName: "Local Business Tax",
    defaultSubIssue: "LOCAL_BUSINESS_TAX",
    patterns: [/\blocal business tax\b/i, /\blbt\b/i, /\bmayor'?s permit\b/i],
    definitionKey: "LOCAL_BUSINESS_TAX_DEFINITION"
  },
  {
    domainCode: "LGT",
    primaryIssue: "RPT",
    domainName: "Real Property Tax",
    defaultSubIssue: "REAL_PROPERTY_TAX",
    patterns: [/\breal property tax\b/i, /\brpt\b/i],
    definitionKey: "REAL_PROPERTY_TAX_DEFINITION"
  },
  {
    domainCode: "CUS",
    primaryIssue: "CUS",
    domainName: "Customs Duties",
    defaultSubIssue: "CUSTOMS_DUTIES",
    patterns: [/\bcustoms\b/i, /\btariff\b/i, /\bimport dut(y|ies)\b/i, /\bcmta\b/i],
    definitionKey: "CUSTOMS_DUTIES_DEFINITION"
  },
  {
    domainCode: "SPC",
    primaryIssue: "SPC",
    domainName: "PEZA / Incentives",
    defaultSubIssue: "PEZA_INCENTIVES",
    patterns: [/\bpeza\b/i, /\bincentives?\b/i, /\bcreate incentives\b/i, /\bfirb\b/i, /\bscit\b/i],
    definitionKey: "PEZA_INCENTIVES_DEFINITION"
  },
  {
    domainCode: "DIS",
    primaryIssue: "TAX_REFUND_CREDIT",
    domainName: "Tax Refunds and Credits",
    defaultSubIssue: "TAX_REFUND_CREDIT",
    patterns: [/\btax refund\b/i, /\bclaim for refund\b/i, /\btax credit\b/i, /\btcc\b/i],
    definitionKey: "TAX_REFUND_CREDIT_DEFINITION"
  },
  {
    domainCode: "PRE",
    primaryIssue: "ASSESSMENT",
    domainName: "Tax Assessment and Prescription",
    defaultSubIssue: "ASSESSMENT_PRESCRIPTION",
    patterns: [/\bassessment\b/i, /\bprescription\b/i, /\bprescriptive\b/i, /\bloa\b/i, /\bpan\b/i, /\bfan\b/i, /\bfdda\b/i, /\bwaiver\b/i],
    definitionKey: "ASSESSMENT_PRESCRIPTION_DEFINITION"
  },
  {
    domainCode: "CIT",
    primaryIssue: "DEDUCTIONS",
    domainName: "Deductions",
    defaultSubIssue: "DEDUCTIONS",
    patterns: [/\bdeduction\b/i, /\bdeductible\b/i, /\bnon[- ]deductible\b/i, /\bsubstantiation\b/i],
    definitionKey: "DEDUCTIONS_DEFINITION"
  },
  {
    domainCode: "CON",
    primaryIssue: "EXEMPTIONS",
    domainName: "Tax Exemptions",
    defaultSubIssue: "EXEMPTIONS",
    patterns: [/\btax exemption\b/i, /\bexemptions?\b/i, /\bstrictissimi juris\b/i],
    definitionKey: "EXEMPTIONS_DEFINITION"
  },
  // PATCH-028A-R2A: BIR/NIRC organizational and foundational tax-classification queries.
  // Without this detector, queries about the BIR, the NIRC as an entity, the Tax Code,
  // and the classification of national internal revenue taxes fall to GENERAL_TAX with
  // only generic placeholder target authorities that match no indexed chunk.
  {
    domainCode: "BIR",
    primaryIssue: "BIR_ORGANIZATION",
    domainName: "BIR / NIRC Organizational",
    defaultSubIssue: "BIR_OVERVIEW",
    patterns: [
      /\bbir\b/i,
      /\bbureau\s+of\s+internal\s+revenue\b/i,
      /\bcommissioner\s+of\s+internal\s+revenue\b/i,
      /\bnirc\b/i,
      /\bnational\s+internal\s+revenue\s+code\b/i,
      /\bnational\s+internal\s+revenue\s+taxes?\b/i,
      /\btax\s+code\b/i
    ],
    definitionKey: "BIR_DEFINITION"
  }
]);

const ISSUE_SPECIFIC_TARGETS = Object.freeze({
  VAT_OVERVIEW: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005", "CIR v. Seagate Technology (GR No. 153866)"],
  VAT_RISK_ANALYSIS: ["NIRC Sec. 105", "NIRC Sec. 106", "NIRC Sec. 108", "NIRC Sec. 113", "NIRC Sec. 114", "RR 16-2005"],
  VAT_EXEMPTION: ["NIRC Sec. 109", "RR 16-2005"],
  INPUT_TAX: ["NIRC Sec. 110", "NIRC Sec. 112", "RR 16-2005"],
  OUTPUT_TAX: ["NIRC Sec. 106", "NIRC Sec. 107", "NIRC Sec. 108", "RR 16-2005"],
  ZERO_RATING: ["NIRC Sec. 106(A)(2)", "NIRC Sec. 108(B)", "RR 16-2005"],
  REFUND_CREDIT: ["NIRC Sec. 112", "RR 16-2005", "CIR v. Aichi Forging", "CIR v. San Roque Power"],

  // PATCH-024B: Specialized VAT sub-issues - more precise authority targets than
  // the generic VAT_OVERVIEW / VAT_EXEMPTION entries above.
  VAT_REGISTRATION: ["NIRC Sec. 109(BB)", "NIRC Sec. 236", "RR 16-2005", "RMC 75-2015"],
  VAT_EXEMPTION_REAL_PROPERTY: ["NIRC Sec. 109(P)", "RR 4-2007", "RR 16-2005"],
  VAT_EXEMPTION_MEDICAL_PROFESSIONAL: ["NIRC Sec. 109(G)", "RR 16-2005"],
  VAT_IMPORTATION: ["NIRC Sec. 107", "NIRC Sec. 107(B)", "RR 16-2005"],
  VAT_REFUND_CREDIT: ["NIRC Sec. 112", "RR 1-2017", "RR 16-2005", "CIR v. San Roque Power Corporation", "CIR v. Aichi Forging"],

  // PATCH-024B-EXT: Additional specialized VAT sub-issues discovered in Q6-Q8 expanded probes.
  VAT_INVOICING: ["NIRC Sec. 264", "RR 18-2012", "NIRC Sec. 236", "RR 16-2005"],
  VAT_INPUT_TAX_ALLOCATION: ["NIRC Sec. 110(B)", "NIRC Sec. 110", "RR 16-2005"],
  VAT_EXEMPTION_RESIDENTIAL_LEASE: ["NIRC Sec. 109(Q)", "RR 16-2005"],

  INCOME_TAX_OVERVIEW: ["NIRC Sec. 23", "NIRC Sec. 24", "NIRC Sec. 27", "NIRC Sec. 31", "NIRC Sec. 32", "NIRC Sec. 34"],
  RESIDENT_CITIZEN_INCOME_SCOPE: ["NIRC Sec. 23"],
  RCIT: ["NIRC Sec. 27(A)", "CREATE Act", "RR 9-1998"],
  MCIT: ["NIRC Sec. 27(E)", "RR 9-1998", "CREATE Act"],
  NOLCO: ["NIRC Sec. 34(D)(3)"],
  DEDUCTIONS: ["NIRC Sec. 34", "NIRC Sec. 34(A)", "NIRC Sec. 34(K)"],

  WITHHOLDING_TAX: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
  EWT: ["NIRC Sec. 57", "NIRC Sec. 58", "RR 2-98"],
  FWT: ["NIRC final withholding tax provisions", "RR 2-98"],
  COMPENSATION_WHT: ["NIRC withholding on compensation provisions", "RR 2-98"],

  ASSESSMENT_PRESCRIPTION: ["NIRC Sec. 203", "NIRC Sec. 222", "NIRC Sec. 228", "RR 18-2013", "CIR v. Aznar (GR No. L-20569)", "CIR v. BF Goodrich Philippines (GR No. L-28508)", "CIR v. Bohol Land Transportation (G.R. No. L-13099)"],
  LOA_VALIDITY: ["NIRC assessment provisions", "BIR audit and LOA issuances", "Medicard Philippines"],
  PAN_FAN: ["NIRC Sec. 228", "RR 18-2013", "CIR v. Metro Star Superama", "CIR v. Enron Subic Power"],
  FDDA: ["NIRC Sec. 228", "RR 18-2013"],
  WAIVER: ["NIRC Sec. 203", "NIRC Sec. 222", "BIR waiver issuances"],

  LOCAL_BUSINESS_TAX: ["Local Government Code Sec. 143", "Local Government Code Sec. 151", "City of Manila v. Coca-Cola Bottlers Philippines (G.R. No. 180845)"],
  REAL_PROPERTY_TAX: ["Local Government Code Sec. 197", "Local Government Code Sec. 198", "Local Government Code Sec. 199", "Local Government Code Sec. 232"],
  CUSTOMS_DUTIES: ["CMTA", "BOC issuances"],
  PEZA_INCENTIVES: ["CREATE Act", "NIRC incentive provisions", "PEZA law", "FIRB issuances"],

  // PATCH-028A-R2A: BIR/NIRC organizational sub-issues -> concrete indexed sections
  BIR_OVERVIEW:           ["NIRC Sec. 2", "NIRC Sec. 3"],
  BIR_DEFINITION:         ["NIRC Sec. 2", "NIRC Sec. 3"],
  NIRC_DEFINITION:        ["NIRC Sec. 21", "NIRC Sec. 2"],
  TAX_CLASSIFICATION:     ["NIRC Sec. 21"]
});

export {
  DEFINITION_AUTHORITY_MAP,
  DOMAIN_DETECTORS,
  ISSUE_SPECIFIC_TARGETS
};
