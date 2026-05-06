// FILE: tax-keywords.js

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export const taxKeywords = unique(
  [
    // Core
    "tax",
    "taxation",
    "taxable",
    "taxpayer",
    "tax liability",
    "tax compliance",
    "tax assessment",
    "deficiency tax",
    "tax audit",
    "tax refund",
    "tax credit",

    // Constitutional / statutory anchors
    "constitution",
    "1987 constitution",
    "philippine constitution",
    "nirc",
    "tax code",
    "national internal revenue code",
    "ra 8424",
    "ra 10963",
    "train law",
    "train act",
    "ra 11534",
    "create law",
    "create act",
    "ra 11976",
    "ease of paying taxes",
    "eopt",
    "ra 12066",
    "create more",

    // BIR / admin
    "bir",
    "bureau of internal revenue",
    "rdo",
    "efps",
    "eafs",
    "orus",
    "bir registration",
    "certificate of registration",
    "cor",
    "2303",

    // Income tax
    "income tax",
    "corporate income tax",
    "individual income tax",
    "rcit",
    "mcit",
    "nolco",
    "taxable income",
    "gross income",
    "allowable deduction",
    "itemized deduction",
    "osd",
    "deductible expense",
    "section 34",
    "section 34 c",

    // VAT
    "vat",
    "value-added tax",
    "value added tax",
    "output vat",
    "input vat",
    "input tax",
    "output tax",
    "vatable",
    "vat-exempt",
    "vat exempt",
    "zero-rated",
    "zero rated",
    "vat refund",

    // Withholding
    "withholding tax",
    "ewt",
    "cwt",
    "fwt",
    "final tax",
    "expanded withholding tax",
    "creditable withholding tax",
    "withholding agent",
    "2307",
    "2306",
    "2316",

    // Other taxes
    "percentage tax",
    "documentary stamp tax",
    "dst",
    "capital gains tax",
    "cgt",
    "fringe benefit tax",
    "fbt",
    "estate tax",
    "donor's tax",
    "donors tax",
    "excise tax",
    "local business tax",
    "lbt",
    "real property tax",
    "rptax",

    // Forms
    "1700",
    "1701",
    "1701a",
    "1701q",
    "1702",
    "1702q",
    "1702rt",
    "1702mx",
    "2550q",
    "2550m",
    "2551q",
    "1601eq",
    "1601fq",
    "1604e",
    "1604cf",

    // Issuances
    "revenue regulation",
    "rr",
    "revenue memorandum circular",
    "rmc",
    "revenue memorandum order",
    "rmo",
    "revenue audit memorandum order",
    "ramo",
    "bir ruling",

    // Enforcement / remedies
    "letter of authority",
    "loa",
    "notice of discrepancy",
    "nod",
    "preliminary assessment notice",
    "pan",
    "final assessment notice",
    "fan",
    "final decision on disputed assessment",
    "fdda",
    "assessment",
    "protest",
    "refund",
    "claim for refund",
    "prescription",
    "prescriptive period",

    // Courts / doctrine
    "supreme court",
    "court of appeals",
    "court of tax appeals",
    "cta",
    "cta en banc",
    "cta division",
    "g.r. no",
    "gr no",
    "ca-g.r.",
    "jurisprudence",
    "doctrine",
    "stare decisis",
    "legally defensible conclusion",
    "court position",
    "bir position",

    // Transfer pricing / international tax
    "transfer pricing",
    "related party transaction",
    "rpt",
    "arm's length",
    "arm’s length",
    "benchmarking study",
    "transfer pricing documentation",
    "local file",
    "master file",
    "country-by-country report",
    "cbcr",
    "beps",
    "tax treaty",
    "double tax agreement",
    "dta",
    "permanent establishment",
    "withholding on foreign payments",
    "tax sparing",
    "most favored nation",
    "beneficial owner",

    // Incentives / special regimes
    "peza",
    "boi",
    "firb",
    "registered business enterprise",
    "rbe",
    "income tax holiday",
    "ith",
    "special corporate income tax",
    "scit",
    "enhanced deductions",
    "tax incentives",

    // Local taxes / permits
    "mayor's permit",
    "business permit",
    "community tax certificate",

    // Common compliance words
    "invoice",
    "official receipt",
    "sales invoice",
    "e-invoice",
    "e-receipt",
    "books of accounts",
    "substantiation",
    "filing",
    "deadline",
    "due date",
    "surcharge",
    "interest",
    "compromise penalty",

    // Freight / logistics special context
    "common carrier",
    "freight forwarder",
    "freight",
    "logistics",
    "cross-border services",
    "2307 mechanics",
    "rmc 5-2024",
    "aces philippines"
  ].map(normalizeText)
);

function tokenize(text = "") {
  return normalizeText(text)
    .replace(/[^a-z0-9\s.%/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function isTaxRelated(question = "") {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) {
    return false;
  }

  const questionTokens = new Set(tokenize(normalizedQuestion));

  return taxKeywords.some((keyword) => {
    if (!keyword) {
      return false;
    }

    if (normalizedQuestion.includes(keyword)) {
      return true;
    }

    const keywordTokens = tokenize(keyword);
    if (!keywordTokens.length) {
      return false;
    }

    return keywordTokens.every((token) => questionTokens.has(token));
  });
}

export default {
  taxKeywords,
  isTaxRelated
};
