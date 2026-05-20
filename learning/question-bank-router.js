// FILE: learning/question-bank-router.js
"use strict";

import {
  getDomainSubtopics,
  getSubtopicLabel,
  getDomainSearchKeywords,
  getDomainAuthorities
} from "./domain-normalizer.js";

const ENGINE_VERSION = "1.0.0";

// How many unique subtopics to attempt before allowing repeats
const SUBTOPIC_CYCLE_THRESHOLD = 3;

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Selects the next subtopic for a domain, avoiding recently covered subtopics.
// Falls back to a random uncovered subtopic, then rotates if all are covered.
export function selectNextSubtopic(domainKey = "", sessionLearning = {}) {
  const subtopics = getDomainSubtopics(domainKey);
  if (!subtopics.length) return null;

  const covered = safeArray(sessionLearning.coveredSubtopics);
  const weakSubtopics = safeArray(sessionLearning.weakSubtopics);

  // Prioritize weak subtopics not covered recently
  const recentlyCovered = covered.slice(-SUBTOPIC_CYCLE_THRESHOLD);
  const weakNotRecent = weakSubtopics.filter((s) => !recentlyCovered.includes(s));
  if (weakNotRecent.length) {
    return weakNotRecent[Math.floor(Math.random() * weakNotRecent.length)];
  }

  // Uncovered subtopics
  const uncovered = subtopics.filter((s) => !covered.includes(s));
  if (uncovered.length) {
    const shuffled = shuffle(uncovered);
    return shuffled[0];
  }

  // All covered — pick one not in the last N recently covered
  const eligible = subtopics.filter((s) => !recentlyCovered.includes(s));
  const pool = eligible.length ? eligible : subtopics;
  return shuffle(pool)[0];
}

// Builds keyword search terms for vector retrieval scoped to a domain + subtopic
export function buildRetrievalHints(domainKey = "", subtopic = "") {
  const baseKeywords = getDomainSearchKeywords(domainKey);
  const subtopicLabel = getSubtopicLabel(domainKey, subtopic);
  const authorities = getDomainAuthorities(domainKey);

  const subtopicSpecific = getSubtopicKeywords(domainKey, subtopic);

  return {
    primaryQuery: subtopicLabel,
    fallbackQuery: `${domainKey.replace(/_/g, " ")} ${subtopic.replace(/_/g, " ")}`,
    keywords: [...new Set([...subtopicSpecific, ...baseKeywords])].slice(0, 8),
    targetAuthorities: authorities,
    domainKey,
    subtopic,
    subtopicLabel
  };
}

function getSubtopicKeywords(domainKey = "", subtopic = "") {
  const map = {
    VAT: {
      DEFINITION:      ["vat definition", "value added tax nature", "section 105"],
      REFUND_CREDIT:   ["vat refund", "input tax credit", "section 112", "120 day"],
      ZERO_RATING:     ["zero rated", "zero-rated sale", "section 106(a)(2)", "section 108(b)"],
      INPUT_TAX:       ["input tax", "section 110", "creditable input tax"],
      EXEMPTION:       ["vat exempt", "section 109", "exempt transaction"],
      OUTPUT_TAX:      ["output tax", "section 106", "output vat"],
      REGISTRATION:    ["vat registration", "section 236", "threshold 3 million"],
      COMPLIANCE:      ["vat filing", "quarterly return", "monthly remittance"],
      WITHHOLDING_VAT: ["withholding vat", "government withholding vat", "5%"],
      TRANSITIONAL:    ["transitional input tax", "beginning inventory", "section 111"]
    },
    INCOME_TAX: {
      RCIT:               ["rcit", "regular corporate income tax", "section 27(a)", "25%", "25 percent"],
      MCIT:               ["mcit", "minimum corporate income tax", "section 27(e)", "2%", "2 percent", "rr 9-1998"],
      NOLCO:              ["nolco", "net operating loss", "section 34(d)(3)", "carry over"],
      GROSS_INCOME:       ["gross income", "section 32", "exclusions from gross income"],
      DEDUCTIONS:         ["allowable deduction", "section 34", "ordinary necessary expense"],
      CAPITAL_GAINS:      ["capital gains tax", "section 24(d)", "6%", "real property", "shares not listed"],
      RELATED_PARTY:      ["transfer pricing", "related party", "section 50", "arm's length", "rr 2-2013"],
      SPECIAL_RATES:      ["create act", "special rate", "domestic market enterprise", "5-27", "vat exempt special"],
      DIVIDENDS:          ["dividends", "section 24(b)", "section 27(d)(4)", "10 percent"],
      PASSIVE_INCOME:     ["passive income", "interest income", "royalty", "prize"],
      TAX_TREATY:         ["tax treaty", "double taxation", "treaty rate", "certificate of residency"],
      ACCOUNTING_METHOD:  ["accounting method", "cash basis", "accrual", "percentage of completion"],
      COMPENSATION:       ["compensation income", "section 24(a)", "graduated rates", "philippine income tax table"],
      SELF_EMPLOYMENT:    ["self employed", "professional income", "section 24(b)", "optional standard deduction"],
      MIXED_INCOME:       ["mixed income earner", "section 24(a)(2)", "compensation plus business"],
      DE_MINIMIS:         ["de minimis", "exempt de minimis", "rr 11-2018", "maximum de minimis"],
      "13TH_MONTH":       ["13th month pay", "section 32(b)(7)", "90000 limit", "non-taxable"],
      FRINGE_BENEFITS:    ["fringe benefit tax", "fbt", "section 33", "managerial supervisory", "grossed up"],
      ALIEN_NRA:          ["nra", "non-resident alien", "nra engaged in trade", "nra not engaged"],
      EXPATRIATE:         ["expatriate", "alien employee", "offshore income exempt"],
      OSD:                ["optional standard deduction", "osd", "40 percent", "section 34(l)"],
      MINIMUM_WAGE_EARNER:["minimum wage earner", "exempt mwe", "section 24(a)(2)", "holiday pay exempt"]
    },
    WITHHOLDING_TAX: {
      EWT:               ["expanded withholding tax", "ewt", "rr 2-98", "2307"],
      FINAL_WHT:         ["final withholding tax", "fwt", "2306", "passive income final"],
      COMPENSATION_WHT:  ["withholding on compensation", "rr 11-2018", "payroll withholding"],
      WITHHOLDING_AGENT: ["withholding agent", "obligation", "liable for withholding"],
      GOVERNMENT_WHT:    ["government withholding", "1601e", "procuring entity"],
      VAT_WHT:           ["withholding vat", "5% vat withholding", "government vat"],
      FRINGE_BENEFIT_TAX:["fringe benefit tax", "fbt", "section 33", "35 percent", "grossed up"],
      TREATY_WHT:        ["treaty rate", "withholding treaty", "reduced rate treaty", "certificate of residency"],
      FILING_REMITTANCE: ["filing deadline", "remittance", "1601-eq", "monthly quarterly"],
      BIR_FORMS:         ["form 2307", "form 2306", "creditable certificate", "final certificate"]
    },
    ESTATE_TAX: {
      GROSS_ESTATE:    ["gross estate", "section 85", "decedent's property"],
      DEDUCTIONS:      ["estate deduction", "section 86", "standard deduction", "family home"],
      COMPUTATION:     ["estate tax rate", "section 84", "6 percent", "net estate"],
      FILING:          ["estate tax filing", "section 90", "one year", "extension filing"],
      AMNESTY:         ["estate tax amnesty", "ra 11213", "june 2021", "amnesty availment"],
      CONJUGAL_ACP_CPG:["conjugal property", "acp", "cpg", "absolute community", "conjugal partnership"]
    },
    DONORS_TAX: {
      RATES:                   ["donor's tax rate", "section 99", "6 percent", "flat 6"],
      EXEMPT_DONATIONS:        ["exempt donation", "section 101", "dowry", "non-profit donation"],
      VALUATION:               ["valuation donation", "fair market value", "appraised value"],
      RELATED_PARTY_DONATIONS: ["related party donation", "close corporation", "stranger", "non-stranger"],
      CORPORATE_DONATIONS:     ["corporate donation", "deductible donation", "section 34(h)"]
    },
    PERCENTAGE_TAX: {
      SEC116:          ["section 116", "3%", "percentage tax general"],
      OPTION_8PCT:     ["8% option", "section 24(a)(2)(b)", "8 percent flat", "chose 8%"],
      COMMON_CARRIERS: ["common carrier", "section 117", "2%", "transport percentage"],
      FRANCHISE_TAX:   ["franchise tax", "section 119", "franchisee"],
      OVERSEAS_DISPATCH:["overseas dispatch", "section 120", "communication tax"],
      STT:             ["stock transaction tax", "stt", "section 127", "6/10 percent"],
      BANKS_NON_BANKS: ["banks percentage", "section 121", "bank percentage tax", "non-bank financial"],
      IPT:             ["international air", "shipping percentage", "section 118"],
      FILING_PAYMENT:  ["percentage tax filing", "quarterly 2551Q"],
      VAT_ELECTION:    ["vat or non-vat", "election", "opt for vat"]
    },
    EXCISE_TAX: {
      TOBACCO:             ["tobacco excise", "cigarette tax", "section 145"],
      ALCOHOL:             ["alcohol excise", "section 143", "fermented liquor", "distilled spirits"],
      PETROLEUM:           ["petroleum excise", "section 148", "oil tax"],
      AUTOMOBILE:          ["automobile excise", "section 149", "car tax"],
      SWEETENED_BEVERAGES: ["sweetened beverage", "section 150-b", "sugar tax"],
      MINERAL_PRODUCTS:    ["mineral excise", "section 151"],
      COSMETIC_PROCEDURES: ["cosmetic procedure", "section 150-a", "aesthetic"],
      EXEMPTIONS:          ["excise tax exempt", "diplomatic exempt excise"],
      REMOVAL_MARKING:     ["removal", "marking excise", "section 130"],
      REFUND:              ["excise tax refund", "section 204 refund"]
    },
    PRESCRIPTION: {
      PRESCRIPTION_3YR:       ["3 year prescription", "section 203", "ordinary prescriptive period"],
      PRESCRIPTION_10YR:      ["10 year prescription", "section 222(a)", "fraudulent return", "false return"],
      WAIVER_VALIDITY:        ["waiver", "rmo 20-90", "rdao 05-01", "valid waiver requirements"],
      LOA_LN:                 ["letter of authority", "loa", "letter notice", "ln", "loa validity"],
      PAN_FAN_FDDA:           ["pan", "pre-assessment notice", "fan", "final assessment notice", "fdda", "formal letter of demand"],
      METRO_STAR_DOCTRINE:    ["metro star", "gr 185371", "no pan void assessment", "due process assessment"],
      COLLECTION_PRESCRIPTION:["collection prescription", "section 222(c)", "5 year collection"],
      TOLLING_INTERRUPTION:   ["tolling prescription", "interruption", "request reinvestigation", "tolling factors"],
      AMENDED_RETURN:         ["amended return effect", "prescription amended", "filing amended return"],
      JEOPARDY_ASSESSMENT:    ["jeopardy assessment", "section 6(d)", "immediate collection"]
    },
    TAX_DISPUTE: {
      PROTEST:                       ["protest", "section 228", "30 days protest", "formal letter of demand"],
      RECONSIDERATION_REINVESTIGATION:["reconsideration vs reinvestigation", "protest types", "submission documents"],
      INACTION:                      ["inaction", "180 days inaction", "30 days inaction cta"],
      CTA_DIVISION:                  ["cta division", "petition review", "small cases", "ra 1125"],
      CTA_EN_BANC:                   ["cta en banc", "appeal division", "15 days"],
      SUPREME_COURT:                 ["supreme court tax", "certiorari tax"],
      COMPROMISE_ABATEMENT:          ["compromise", "abatement", "section 204", "doubtful validity"],
      TAX_AMNESTY:                   ["tax amnesty", "ra 11213", "amnesty availment", "immunity"],
      REFUND_CLAIMS:                 ["tax refund", "section 229", "2 year refund", "tax credit certificate"],
      INJUNCTION:                    ["injunction tax", "no injunction rule", "section 218"],
      CRIMINAL_TAX:                  ["criminal tax", "section 254", "willful failure", "tax evasion"]
    }
  };

  return safeArray(map[domainKey]?.[subtopic] || map[domainKey]?.["DEFINITION"] || []);
}

export function rotateSubtopics(domainKey = "", coveredSubtopics = []) {
  const allSubtopics = getDomainSubtopics(domainKey);
  const uncovered = allSubtopics.filter((s) => !coveredSubtopics.includes(s));
  return uncovered.length ? shuffle(uncovered) : shuffle(allSubtopics);
}

export function questionBankRouterHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUESTION_BANK_ROUTER",
    version: ENGINE_VERSION
  };
}
