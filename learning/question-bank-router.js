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
  const subtopicAliases = getSubtopicAliases(domainKey, subtopic);

  // Aliases use formal legal terminology more likely to match indexed document titles.
  // Fall back to first informal keyword if no alias defined.
  const primaryQuery =
    subtopicAliases[0] || subtopicSpecific[0] || baseKeywords[0] || domainKey.toLowerCase();

  return {
    primaryQuery,
    subtopicQuery: subtopicLabel,
    queryAliases: subtopicAliases,
    fallbackQuery: `${domainKey.replace(/_/g, " ")} ${subtopic.replace(/_/g, " ")}`,
    keywords: [...new Set([...subtopicAliases, ...subtopicSpecific, ...baseKeywords])].slice(0, 10),
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

// Legal-terminology aliases — formal document-title-friendly phrases for ILIKE retrieval.
// First entry is used as primaryQuery; subsequent entries expand the keywords array.
function getSubtopicAliases(domainKey = "", subtopic = "") {
  const map = {
    VAT: {
      DEFINITION:      ["value added tax", "section 105", "vat nature"],
      EXEMPTION:       ["section 109", "vat exemption", "exempt transactions", "RR 16-2005"],
      ZERO_RATING:     ["zero rated sales", "section 106", "section 108", "export sales vat"],
      INPUT_TAX:       ["input tax credit", "section 110", "creditable input tax"],
      OUTPUT_TAX:      ["output vat", "output tax", "section 106"],
      REFUND_CREDIT:   ["section 112", "vat refund", "input tax refund", "120 day 30 day"],
      REGISTRATION:    ["vat registration", "section 236", "3 million threshold"],
      COMPLIANCE:      ["RR 16-2005", "vat return", "BIR Form 2550", "vat compliance filing"],
      WITHHOLDING_VAT: ["withholding vat", "government withholding vat", "5 percent vat"],
      TRANSITIONAL:    ["section 111", "transitional input tax", "beginning inventory vat"]
    },
    INCOME_TAX: {
      RCIT:               ["section 27", "regular corporate income tax", "domestic corporation tax"],
      MCIT:               ["section 27(e)", "minimum corporate income tax", "2 percent minimum tax"],
      NOLCO:              ["net operating loss", "section 34(d)(3)", "nolco carry over"],
      GROSS_INCOME:       ["section 32", "gross income exclusions", "items gross income"],
      DEDUCTIONS:         ["section 34", "allowable deductions", "ordinary necessary expense"],
      CAPITAL_GAINS:      ["section 24(d)", "capital gains tax", "real property 6 percent"],
      RELATED_PARTY:      ["transfer pricing", "section 50", "arm length transaction", "RR 2-2013"],
      SPECIAL_RATES:      ["CREATE Act", "income tax holiday", "special economic zone"],
      DIVIDENDS:          ["section 24(b)", "dividends income", "section 27(d)"],
      PASSIVE_INCOME:     ["passive income", "interest income", "royalty income"],
      TAX_TREATY:         ["tax treaty", "double taxation", "treaty benefit", "certificate of residency"],
      ACCOUNTING_METHOD:  ["accounting method", "cash basis accrual", "percentage of completion"],
      COMPENSATION:       ["section 24(a)", "compensation income", "graduated tax rates individual"],
      SELF_EMPLOYMENT:    ["professional income", "self employed income", "business income individual"],
      MIXED_INCOME:       ["mixed income earner", "section 24(a)(2)", "compensation plus business"],
      DE_MINIMIS:         ["de minimis benefits", "RR 11-2018", "exempt de minimis"],
      "13TH_MONTH":       ["13th month pay", "section 32(b)(7)", "90000 exempt"],
      FRINGE_BENEFITS:    ["fringe benefit tax", "section 33", "managerial supervisory fbt"],
      ALIEN_NRA:          ["nonresident alien", "nra engaged trade", "alien income taxation"],
      EXPATRIATE:         ["resident alien", "alien individual income", "income taxation aliens"],
      OSD:                ["optional standard deduction", "section 34(l)", "40 percent osd"],
      MINIMUM_WAGE_EARNER:["minimum wage earner", "section 24(a)(2)", "exempt minimum wage"]
    },
    WITHHOLDING_TAX: {
      EWT:               ["expanded withholding tax", "RR 2-98", "creditable withholding tax"],
      FINAL_WHT:         ["final withholding tax", "section 57", "passive income withholding"],
      COMPENSATION_WHT:  ["withholding on compensation", "payroll withholding", "RR 11-2018"],
      WITHHOLDING_AGENT: ["withholding agent obligation", "payor withholding", "liable withholding"],
      GOVERNMENT_WHT:    ["government withholding", "procuring entity", "1601E"],
      VAT_WHT:           ["withholding vat", "5 percent vat withholding", "government vat"],
      FRINGE_BENEFIT_TAX:["fringe benefit tax", "section 33", "fbt grossed up"],
      TREATY_WHT:        ["treaty withholding rate", "reduced withholding rate", "certificate of residency"],
      FILING_REMITTANCE: ["1601-EQ quarterly", "remittance deadline withholding", "monthly quarterly filing"],
      BIR_FORMS:         ["BIR Form 2307", "BIR Form 2306", "withholding tax certificate"]
    },
    ESTATE_TAX: {
      GROSS_ESTATE:    ["section 85", "gross estate", "decedent property estate"],
      DEDUCTIONS:      ["section 86", "estate deductions", "family home deduction"],
      COMPUTATION:     ["section 84", "estate tax rate", "6 percent net estate"],
      FILING:          ["section 90", "estate tax return", "one year filing estate"],
      AMNESTY:         ["estate tax amnesty", "RA 11213", "amnesty availment"],
      CONJUGAL_ACP_CPG:["conjugal property", "absolute community property", "conjugal partnership"]
    },
    DONORS_TAX: {
      RATES:                   ["section 99", "donor's tax", "6 percent donation"],
      EXEMPT_DONATIONS:        ["section 101", "exempt donation", "dowry gift exempt"],
      VALUATION:               ["donation valuation", "fair market value donation"],
      RELATED_PARTY_DONATIONS: ["related party donation", "stranger donor tax"],
      CORPORATE_DONATIONS:     ["corporate donation", "deductible contribution", "section 34(h)"]
    },
    PERCENTAGE_TAX: {
      SEC116:          ["section 116", "percentage tax general", "3 percent non-vat"],
      OPTION_8PCT:     ["section 24(a)(2)(b)", "8 percent option", "flat 8 percent tax"],
      COMMON_CARRIERS: ["section 117", "common carrier tax", "transport percentage tax"],
      FRANCHISE_TAX:   ["section 119", "franchise tax", "franchisee percentage"],
      OVERSEAS_DISPATCH:["section 120", "overseas communication tax"],
      STT:             ["section 127", "stock transaction tax", "6/10 percent stt"],
      BANKS_NON_BANKS: ["section 121", "bank percentage tax", "non-bank financial intermediary"],
      IPT:             ["section 118", "international carrier tax", "shipping percentage"],
      FILING_PAYMENT:  ["2551Q quarterly", "quarterly percentage tax return"],
      VAT_ELECTION:    ["vat registration election", "opt into vat", "non-vat to vat election"]
    },
    EXCISE_TAX: {
      TOBACCO:             ["section 145", "cigarette excise tax", "tobacco tax"],
      ALCOHOL:             ["section 143", "alcohol excise tax", "fermented liquor distilled spirits"],
      PETROLEUM:           ["section 148", "petroleum excise tax", "fuel oil excise"],
      AUTOMOBILE:          ["section 149", "automobile excise tax", "motor vehicle excise"],
      SWEETENED_BEVERAGES: ["section 150(b)", "sweetened beverage tax", "sugar tax"],
      MINERAL_PRODUCTS:    ["section 151", "mineral excise tax", "mining excise"],
      COSMETIC_PROCEDURES: ["section 150(a)", "cosmetic procedure tax"],
      EXEMPTIONS:          ["excise tax exemption", "diplomatic exemption excise"],
      REMOVAL_MARKING:     ["section 130", "removal marking excise"],
      REFUND:              ["excise tax refund", "section 204 excise"]
    },
    PRESCRIPTION: {
      PRESCRIPTION_3YR:       ["section 203", "3 year prescriptive period", "ordinary prescription tax"],
      PRESCRIPTION_10YR:      ["section 222(a)", "10 year prescription", "fraudulent false return"],
      WAIVER_VALIDITY:        ["waiver prescription", "RMO 20-90", "valid waiver requirements"],
      LOA_LN:                 ["letter of authority", "loa validity", "letter notice BIR"],
      PAN_FAN_FDDA:           ["section 228", "pre-assessment notice", "final assessment notice fdda"],
      METRO_STAR_DOCTRINE:    ["metro star superama", "GR 185371", "due process assessment void"],
      COLLECTION_PRESCRIPTION:["section 222(c)", "5 year collection prescription"],
      TOLLING_INTERRUPTION:   ["tolling prescription", "interruption prescriptive period"],
      AMENDED_RETURN:         ["amended return prescription", "filing amended return"],
      JEOPARDY_ASSESSMENT:    ["section 6(d)", "jeopardy assessment", "immediate collection"]
    },
    TAX_DISPUTE: {
      PROTEST:                       ["section 228", "tax protest", "30 day protest period"],
      RECONSIDERATION_REINVESTIGATION:["reconsideration reinvestigation", "protest types", "submission documents protest"],
      INACTION:                      ["inaction 180 days", "constructive denial", "30 days cta appeal"],
      CTA_DIVISION:                  ["court of tax appeals", "cta division", "petition for review cta"],
      CTA_EN_BANC:                   ["cta en banc", "appeal en banc cta"],
      SUPREME_COURT:                 ["supreme court tax", "certiorari tax case", "rule 45 tax"],
      COMPROMISE_ABATEMENT:          ["section 204", "compromise settlement", "abatement penalty"],
      TAX_AMNESTY:                   ["tax amnesty", "RA 11213", "immunity from prosecution"],
      REFUND_CLAIMS:                 ["section 229", "tax refund claim", "2 year refund period"],
      INJUNCTION:                    ["section 218", "no injunction tax collection"],
      CRIMINAL_TAX:                  ["section 254", "criminal liability tax", "tax evasion prosecution"]
    }
  };

  return safeArray(map[domainKey]?.[subtopic] || []);
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
