// FILE: learning/domain-normalizer.js
"use strict";

const ENGINE_VERSION = "1.0.0";

// Canonical domain definitions with subtopics, labels, and default authorities
const DOMAINS = Object.freeze({
  VAT: {
    key: "VAT",
    label: "VAT",
    fullLabel: "Value Added Tax",
    subtopics: [
      "DEFINITION", "REFUND_CREDIT", "ZERO_RATING", "INPUT_TAX",
      "EXEMPTION", "OUTPUT_TAX", "REGISTRATION", "COMPLIANCE",
      "WITHHOLDING_VAT", "TRANSITIONAL"
    ],
    subtopicLabels: {
      DEFINITION:      "VAT — Definition and Nature",
      REFUND_CREDIT:   "VAT — Refund and Input Tax Credit",
      ZERO_RATING:     "VAT — Zero-Rated Transactions",
      INPUT_TAX:       "VAT — Input Tax",
      EXEMPTION:       "VAT — Exempt Transactions",
      OUTPUT_TAX:      "VAT — Output Tax",
      REGISTRATION:    "VAT — Registration",
      COMPLIANCE:      "VAT — Compliance and Filing",
      WITHHOLDING_VAT: "VAT — Withholding VAT",
      TRANSITIONAL:    "VAT — Transitional Input Tax"
    },
    searchKeywords: ["vat", "value added", "input tax", "output tax", "zero rated", "exempt transaction", "vat refund", "section 105", "section 106", "section 108", "section 110", "section 112", "rr 16-2005"],
    authorities: ["NIRC Sec. 105-115", "RR 16-2005", "CREATE Act RA 11534", "TRAIN Act RA 10963"]
  },

  INCOME_TAX: {
    key: "INCOME_TAX",
    label: "Income Tax",
    fullLabel: "Income Tax (Corporate and Individual)",
    subtopics: [
      "RCIT", "MCIT", "NOLCO", "GROSS_INCOME", "DEDUCTIONS",
      "CAPITAL_GAINS", "RELATED_PARTY", "SPECIAL_RATES", "DIVIDENDS",
      "PASSIVE_INCOME", "TAX_TREATY", "ACCOUNTING_METHOD",
      "COMPENSATION", "SELF_EMPLOYMENT", "MIXED_INCOME", "DE_MINIMIS",
      "13TH_MONTH", "FRINGE_BENEFITS", "ALIEN_NRA", "EXPATRIATE",
      "OSD", "MINIMUM_WAGE_EARNER"
    ],
    subtopicLabels: {
      RCIT:               "Income Tax — Regular Corporate Income Tax (RCIT)",
      MCIT:               "Income Tax — Minimum Corporate Income Tax (MCIT)",
      NOLCO:              "Income Tax — Net Operating Loss Carry-Over (NOLCO)",
      GROSS_INCOME:       "Income Tax — Gross Income",
      DEDUCTIONS:         "Income Tax — Allowable Deductions",
      CAPITAL_GAINS:      "Income Tax — Capital Gains",
      RELATED_PARTY:      "Income Tax — Related Party / Transfer Pricing",
      SPECIAL_RATES:      "Income Tax — Special Corporate Rates",
      DIVIDENDS:          "Income Tax — Dividends",
      PASSIVE_INCOME:     "Income Tax — Passive Income",
      TAX_TREATY:         "Income Tax — Tax Treaty Benefits",
      ACCOUNTING_METHOD:  "Income Tax — Accounting Method",
      COMPENSATION:       "Income Tax — Compensation Income",
      SELF_EMPLOYMENT:    "Income Tax — Self-Employment / Professional",
      MIXED_INCOME:       "Income Tax — Mixed Income Earner",
      DE_MINIMIS:         "Income Tax — De Minimis Benefits",
      "13TH_MONTH":       "Income Tax — 13th Month Pay Exclusion",
      FRINGE_BENEFITS:    "Income Tax — Fringe Benefit Tax",
      ALIEN_NRA:          "Income Tax — Alien / Non-Resident Alien",
      EXPATRIATE:         "Income Tax — Expatriate Taxation",
      OSD:                "Income Tax — Optional Standard Deduction (OSD)",
      MINIMUM_WAGE_EARNER:"Income Tax — Minimum Wage Earner Exemption"
    },
    searchKeywords: ["income tax", "rcit", "mcit", "nolco", "deduction", "gross income", "capital gains", "fringe benefit", "compensation", "self-employed", "osd", "alien", "minimum wage", "13th month", "tax treaty", "transfer pricing", "section 24", "section 27", "section 32", "section 34"],
    authorities: ["NIRC Sec. 23-86", "CREATE Act RA 11534", "TRAIN Act RA 10963", "RR 8-2018", "RR 2-2013"]
  },

  WITHHOLDING_TAX: {
    key: "WITHHOLDING_TAX",
    label: "Withholding Tax",
    fullLabel: "Withholding Tax (EWT, FWT, CWT, FBT)",
    subtopics: [
      "EWT", "FINAL_WHT", "COMPENSATION_WHT", "WITHHOLDING_AGENT",
      "GOVERNMENT_WHT", "VAT_WHT", "FRINGE_BENEFIT_TAX", "TREATY_WHT",
      "FILING_REMITTANCE", "BIR_FORMS"
    ],
    subtopicLabels: {
      EWT:                "Withholding Tax — Expanded Withholding Tax (EWT)",
      FINAL_WHT:          "Withholding Tax — Final Withholding Tax (FWT)",
      COMPENSATION_WHT:   "Withholding Tax — Withholding on Compensation",
      WITHHOLDING_AGENT:  "Withholding Tax — Withholding Agent Obligations",
      GOVERNMENT_WHT:     "Withholding Tax — Government Withholding",
      VAT_WHT:            "Withholding Tax — Withholding VAT",
      FRINGE_BENEFIT_TAX: "Withholding Tax — Fringe Benefit Tax (FBT)",
      TREATY_WHT:         "Withholding Tax — Treaty Rate Application",
      FILING_REMITTANCE:  "Withholding Tax — Filing and Remittance",
      BIR_FORMS:          "Withholding Tax — BIR Forms 2306 / 2307"
    },
    searchKeywords: ["withholding", "ewt", "cwt", "fwt", "expanded withholding", "final withholding", "compensation withholding", "fringe benefit tax", "fbt", "withholding agent", "2307", "2306", "government withholding", "section 57", "section 58", "rr 2-98", "rr 11-2018"],
    authorities: ["NIRC Sec. 57-84", "RR 2-98", "RR 11-2018", "TRAIN Act RA 10963"]
  },

  ESTATE_TAX: {
    key: "ESTATE_TAX",
    label: "Estate Tax",
    fullLabel: "Estate Tax",
    subtopics: [
      "GROSS_ESTATE", "DEDUCTIONS", "COMPUTATION", "FILING", "AMNESTY", "CONJUGAL_ACP_CPG"
    ],
    subtopicLabels: {
      GROSS_ESTATE:    "Estate Tax — Gross Estate",
      DEDUCTIONS:      "Estate Tax — Deductions",
      COMPUTATION:     "Estate Tax — Computation and Rate",
      FILING:          "Estate Tax — Filing and Payment",
      AMNESTY:         "Estate Tax — Estate Tax Amnesty",
      CONJUGAL_ACP_CPG:"Estate Tax — Conjugal / ACP / CPG Property Regimes"
    },
    searchKeywords: ["estate tax", "gross estate", "decedent", "succession", "inheritance", "conjugal", "acp", "cpg", "estate deduction", "estate amnesty", "section 84", "section 85", "section 86", "rr 12-2018"],
    authorities: ["NIRC Sec. 84-97", "TRAIN Act RA 10963", "RA 11213 Estate Tax Amnesty", "RR 12-2018"]
  },

  DONORS_TAX: {
    key: "DONORS_TAX",
    label: "Donor's Tax",
    fullLabel: "Donor's Tax",
    subtopics: [
      "RATES", "EXEMPT_DONATIONS", "VALUATION", "RELATED_PARTY_DONATIONS", "CORPORATE_DONATIONS"
    ],
    subtopicLabels: {
      RATES:                   "Donor's Tax — Tax Rates",
      EXEMPT_DONATIONS:        "Donor's Tax — Exempt Donations",
      VALUATION:               "Donor's Tax — Valuation of Donated Property",
      RELATED_PARTY_DONATIONS: "Donor's Tax — Related Party / Close Corporation",
      CORPORATE_DONATIONS:     "Donor's Tax — Corporate Donations"
    },
    searchKeywords: ["donor's tax", "donors tax", "donation", "donee", "gift tax", "exempt donation", "related party donation", "section 98", "section 99", "section 101", "rr 12-2018"],
    authorities: ["NIRC Sec. 98-104", "TRAIN Act RA 10963", "RR 12-2018"]
  },

  PERCENTAGE_TAX: {
    key: "PERCENTAGE_TAX",
    label: "Percentage Tax",
    fullLabel: "Percentage Tax",
    subtopics: [
      "SEC116", "OPTION_8PCT", "COMMON_CARRIERS", "FRANCHISE_TAX",
      "OVERSEAS_DISPATCH", "STT", "BANKS_NON_BANKS", "IPT", "FILING_PAYMENT", "VAT_ELECTION"
    ],
    subtopicLabels: {
      SEC116:          "Percentage Tax — Section 116 General Rule",
      OPTION_8PCT:     "Percentage Tax — 8% Flat Rate Option",
      COMMON_CARRIERS: "Percentage Tax — Common Carriers",
      FRANCHISE_TAX:   "Percentage Tax — Franchise Tax",
      OVERSEAS_DISPATCH:"Percentage Tax — Overseas Dispatch / Communication",
      STT:             "Percentage Tax — Stock Transaction Tax (STT)",
      BANKS_NON_BANKS: "Percentage Tax — Banks and Non-Banks",
      IPT:             "Percentage Tax — International Air/Shipping",
      FILING_PAYMENT:  "Percentage Tax — Filing and Payment",
      VAT_ELECTION:    "Percentage Tax — VAT vs. Non-VAT Election"
    },
    searchKeywords: ["percentage tax", "section 116", "3%", "3 percent", "8%", "8 percent", "common carrier", "franchise tax", "stock transaction tax", "stt", "banks percentage", "ipt", "overseas dispatch", "rr 8-2018"],
    authorities: ["NIRC Sec. 116-127", "TRAIN Act RA 10963", "CREATE Act RA 11534"]
  },

  EXCISE_TAX: {
    key: "EXCISE_TAX",
    label: "Excise Tax",
    fullLabel: "Excise Tax",
    subtopics: [
      "TOBACCO", "ALCOHOL", "PETROLEUM", "AUTOMOBILE", "SWEETENED_BEVERAGES",
      "MINERAL_PRODUCTS", "COSMETIC_PROCEDURES", "EXEMPTIONS", "REMOVAL_MARKING", "REFUND"
    ],
    subtopicLabels: {
      TOBACCO:             "Excise Tax — Tobacco Products",
      ALCOHOL:             "Excise Tax — Alcohol Products",
      PETROLEUM:           "Excise Tax — Petroleum Products",
      AUTOMOBILE:          "Excise Tax — Automobiles",
      SWEETENED_BEVERAGES: "Excise Tax — Sweetened Beverages",
      MINERAL_PRODUCTS:    "Excise Tax — Mineral Products",
      COSMETIC_PROCEDURES: "Excise Tax — Cosmetic Procedures",
      EXEMPTIONS:          "Excise Tax — Exemptions",
      REMOVAL_MARKING:     "Excise Tax — Removal and Marking",
      REFUND:              "Excise Tax — Excise Tax Refund"
    },
    searchKeywords: ["excise tax", "sin tax", "tobacco", "alcohol", "petroleum", "automobile excise", "sweetened beverage", "mineral product", "cosmetic", "specific tax", "ad valorem excise", "section 129", "section 131"],
    authorities: ["NIRC Sec. 129-172", "TRAIN Act RA 10963", "CREATE Act RA 11534"]
  },

  PRESCRIPTION: {
    key: "PRESCRIPTION",
    label: "Prescription",
    fullLabel: "Prescription and Assessment",
    subtopics: [
      "PRESCRIPTION_3YR", "PRESCRIPTION_10YR", "WAIVER_VALIDITY", "LOA_LN",
      "PAN_FAN_FDDA", "METRO_STAR_DOCTRINE", "COLLECTION_PRESCRIPTION",
      "TOLLING_INTERRUPTION", "AMENDED_RETURN", "JEOPARDY_ASSESSMENT"
    ],
    subtopicLabels: {
      PRESCRIPTION_3YR:      "Prescription — 3-Year General Rule (Sec. 203)",
      PRESCRIPTION_10YR:     "Prescription — 10-Year Exception (Sec. 222(a))",
      WAIVER_VALIDITY:       "Prescription — Waiver of Prescriptive Period",
      LOA_LN:                "Prescription — Letter of Authority / Letter Notice",
      PAN_FAN_FDDA:          "Prescription — PAN, FAN, FDDA Due Process",
      METRO_STAR_DOCTRINE:   "Prescription — Metro Star Doctrine (No PAN = Void)",
      COLLECTION_PRESCRIPTION:"Prescription — Prescription for Collection",
      TOLLING_INTERRUPTION:  "Prescription — Tolling and Interruption",
      AMENDED_RETURN:        "Prescription — Effect of Amended Return",
      JEOPARDY_ASSESSMENT:   "Prescription — Jeopardy Assessment"
    },
    searchKeywords: ["prescription", "assessment prescription", "3 year", "10 year", "section 203", "section 222", "waiver", "loa", "letter of authority", "pan", "pre-assessment notice", "fan", "final assessment notice", "fdda", "metro star", "jeopardy", "amended return", "tolling"],
    authorities: ["NIRC Sec. 203", "NIRC Sec. 222", "CIR v. Metro Star Superama GR 185371", "RMO 20-90"]
  },

  TAX_DISPUTE: {
    key: "TAX_DISPUTE",
    label: "Tax Dispute",
    fullLabel: "Tax Dispute / Tax Remedies",
    subtopics: [
      "PROTEST", "RECONSIDERATION_REINVESTIGATION", "INACTION", "CTA_DIVISION",
      "CTA_EN_BANC", "SUPREME_COURT", "COMPROMISE_ABATEMENT", "TAX_AMNESTY",
      "REFUND_CLAIMS", "INJUNCTION", "CRIMINAL_TAX"
    ],
    subtopicLabels: {
      PROTEST:                       "Tax Dispute — Filing a Protest",
      RECONSIDERATION_REINVESTIGATION:"Tax Dispute — Reconsideration vs. Reinvestigation",
      INACTION:                      "Tax Dispute — BIR Inaction",
      CTA_DIVISION:                  "Tax Dispute — CTA Division",
      CTA_EN_BANC:                   "Tax Dispute — CTA En Banc",
      SUPREME_COURT:                 "Tax Dispute — Supreme Court Review",
      COMPROMISE_ABATEMENT:          "Tax Dispute — Compromise and Abatement",
      TAX_AMNESTY:                   "Tax Dispute — Tax Amnesty",
      REFUND_CLAIMS:                 "Tax Dispute — Refund and Tax Credit",
      INJUNCTION:                    "Tax Dispute — Injunction",
      CRIMINAL_TAX:                  "Tax Dispute — Criminal Tax Cases"
    },
    searchKeywords: ["protest", "reconsideration", "reinvestigation", "cta", "court of tax appeals", "compromise", "abatement", "tax amnesty", "refund", "injunction", "criminal tax", "inaction", "appeal", "section 228", "section 229", "section 204", "ra 1125", "ra 9282"],
    authorities: ["NIRC Sec. 204", "NIRC Sec. 228-248", "RA 1125 CTA Charter", "RA 9282"]
  }
});

const DOMAIN_ALIAS_MAP = new Map([
  // VAT aliases
  ["vat", "VAT"], ["value added tax", "VAT"], ["value-added tax", "VAT"],
  ["output vat", "VAT"], ["input vat", "VAT"], ["vat refund", "VAT"],
  ["vat exemption", "VAT"], ["zero rated", "VAT"], ["zero rating", "VAT"],
  ["zero-rated", "VAT"], ["sec 105", "VAT"], ["section 105", "VAT"],

  // Income Tax aliases
  ["income tax", "INCOME_TAX"], ["income taxation", "INCOME_TAX"],
  ["corporate income tax", "INCOME_TAX"], ["individual income tax", "INCOME_TAX"],
  ["cit", "INCOME_TAX"], ["iit", "INCOME_TAX"], ["rcit", "INCOME_TAX"],
  ["mcit", "INCOME_TAX"], ["nolco", "INCOME_TAX"], ["individual tax", "INCOME_TAX"],
  ["corporate tax", "INCOME_TAX"], ["fringe benefit", "INCOME_TAX"],
  ["osd", "INCOME_TAX"], ["compensation income", "INCOME_TAX"],
  ["passive income tax", "INCOME_TAX"], ["capital gains tax", "INCOME_TAX"],
  ["cgt", "INCOME_TAX"], ["transfer pricing", "INCOME_TAX"],

  // Withholding Tax aliases
  ["withholding tax", "WITHHOLDING_TAX"], ["withholding", "WITHHOLDING_TAX"],
  ["ewt", "WITHHOLDING_TAX"], ["cwt", "WITHHOLDING_TAX"], ["fwt", "WITHHOLDING_TAX"],
  ["expanded withholding", "WITHHOLDING_TAX"], ["final withholding", "WITHHOLDING_TAX"],
  ["creditable withholding", "WITHHOLDING_TAX"], ["final tax", "WITHHOLDING_TAX"],
  ["fringe benefit tax", "WITHHOLDING_TAX"], ["fbt", "WITHHOLDING_TAX"],
  ["withholding agent", "WITHHOLDING_TAX"], ["government withholding", "WITHHOLDING_TAX"],
  ["2307", "WITHHOLDING_TAX"], ["2306", "WITHHOLDING_TAX"],

  // Estate Tax aliases
  ["estate tax", "ESTATE_TAX"], ["estate taxation", "ESTATE_TAX"],
  ["gross estate", "ESTATE_TAX"], ["estate deduction", "ESTATE_TAX"],
  ["estate amnesty", "ESTATE_TAX"], ["conjugal", "ESTATE_TAX"],
  ["acp", "ESTATE_TAX"], ["cpg", "ESTATE_TAX"],
  ["succession", "ESTATE_TAX"], ["inheritance", "ESTATE_TAX"],

  // Donor's Tax aliases
  ["donor's tax", "DONORS_TAX"], ["donors tax", "DONORS_TAX"],
  ["donation tax", "DONORS_TAX"], ["gift tax", "DONORS_TAX"],
  ["donor tax", "DONORS_TAX"], ["exempt donation", "DONORS_TAX"],
  ["donation", "DONORS_TAX"], ["donor", "DONORS_TAX"],

  // Percentage Tax aliases
  ["percentage tax", "PERCENTAGE_TAX"], ["section 116", "PERCENTAGE_TAX"],
  ["sec 116", "PERCENTAGE_TAX"], ["8% option", "PERCENTAGE_TAX"],
  ["8 percent option", "PERCENTAGE_TAX"], ["common carrier", "PERCENTAGE_TAX"],
  ["franchise tax", "PERCENTAGE_TAX"], ["overseas dispatch", "PERCENTAGE_TAX"],
  ["stt", "PERCENTAGE_TAX"], ["stock transaction tax", "PERCENTAGE_TAX"],
  ["banks percentage", "PERCENTAGE_TAX"], ["ipt", "PERCENTAGE_TAX"],

  // Excise Tax aliases
  ["excise tax", "EXCISE_TAX"], ["sin tax", "EXCISE_TAX"],
  ["tobacco tax", "EXCISE_TAX"], ["alcohol tax", "EXCISE_TAX"],
  ["petroleum tax", "EXCISE_TAX"], ["automobile excise", "EXCISE_TAX"],
  ["sweetened beverages", "EXCISE_TAX"], ["mineral products", "EXCISE_TAX"],
  ["cosmetic procedure", "EXCISE_TAX"], ["excise", "EXCISE_TAX"],

  // Prescription aliases
  ["prescription", "PRESCRIPTION"], ["assessment prescription", "PRESCRIPTION"],
  ["prescription and assessment", "PRESCRIPTION"], ["prescriptive period", "PRESCRIPTION"],
  ["3-year prescription", "PRESCRIPTION"], ["10-year prescription", "PRESCRIPTION"],
  ["waiver", "PRESCRIPTION"], ["loa", "PRESCRIPTION"],
  ["letter of authority", "PRESCRIPTION"], ["pan", "PRESCRIPTION"],
  ["pre-assessment notice", "PRESCRIPTION"], ["fan", "PRESCRIPTION"],
  ["fdda", "PRESCRIPTION"], ["metro star", "PRESCRIPTION"],
  ["jeopardy assessment", "PRESCRIPTION"], ["amended return prescription", "PRESCRIPTION"],
  ["tolling", "PRESCRIPTION"],

  // Tax Dispute aliases
  ["tax dispute", "TAX_DISPUTE"], ["tax remedies", "TAX_DISPUTE"],
  ["tax litigation", "TAX_DISPUTE"], ["protest", "TAX_DISPUTE"],
  ["reconsideration", "TAX_DISPUTE"], ["reinvestigation", "TAX_DISPUTE"],
  ["cta", "TAX_DISPUTE"], ["court of tax appeals", "TAX_DISPUTE"],
  ["compromise", "TAX_DISPUTE"], ["abatement", "TAX_DISPUTE"],
  ["tax amnesty", "TAX_DISPUTE"], ["refund claim", "TAX_DISPUTE"],
  ["injunction", "TAX_DISPUTE"], ["criminal tax", "TAX_DISPUTE"],
  ["inaction", "TAX_DISPUTE"], ["appeal tax", "TAX_DISPUTE"]
]);

export function normalizeTaxDomain(text = "") {
  if (!text) return null;

  const lower = String(text).toLowerCase().trim().replace(/\s+/g, " ");

  // Direct key match first
  const upperKey = lower.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (DOMAINS[upperKey]) return upperKey;

  // Exact alias match
  if (DOMAIN_ALIAS_MAP.has(lower)) return DOMAIN_ALIAS_MAP.get(lower);

  // Partial match — scan alias map for contained token
  for (const [alias, domain] of DOMAIN_ALIAS_MAP.entries()) {
    if (lower.includes(alias) || alias.includes(lower)) return domain;
  }

  return null;
}

export function getDomainConfig(domainKey = "") {
  return DOMAINS[String(domainKey).toUpperCase()] || null;
}

export function getAllDomains() {
  return Object.values(DOMAINS);
}

export function getDomainSubtopics(domainKey = "") {
  return DOMAINS[domainKey]?.subtopics || [];
}

export function getSubtopicLabel(domainKey = "", subtopic = "") {
  return DOMAINS[domainKey]?.subtopicLabels[subtopic] || `${domainKey} — ${subtopic}`;
}

export function getDomainSearchKeywords(domainKey = "") {
  return DOMAINS[domainKey]?.searchKeywords || [String(domainKey).toLowerCase()];
}

export function getDomainAuthorities(domainKey = "") {
  return DOMAINS[domainKey]?.authorities || ["NIRC"];
}

export function buildDomainMenuText(hookCode = "/quiz") {
  const cmd = hookCode === "/review" ? "/review" : "/quiz";
  const action = hookCode === "/review" ? "review" : "quiz";

  const lines = [
    `Choose a Philippine tax domain to ${action}:`,
    "",
    `${cmd} VAT`,
    `${cmd} Income Tax`,
    `${cmd} Withholding Tax`,
    `${cmd} Estate Tax`,
    `${cmd} Donor's Tax`,
    `${cmd} Percentage Tax`,
    `${cmd} Excise Tax`,
    `${cmd} Prescription`,
    `${cmd} Tax Dispute`,
    "",
    `Example: **${cmd} VAT** or **${cmd} Income Tax**`
  ];

  return lines.join("\n");
}

export function domainNormalizerHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DOMAIN_NORMALIZER",
    version: ENGINE_VERSION,
    domainCount: Object.keys(DOMAINS).length,
    aliasCount: DOMAIN_ALIAS_MAP.size
  };
}
