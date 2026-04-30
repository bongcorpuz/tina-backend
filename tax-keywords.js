export const taxKeywords = [
  // Core
  "tax", "taxation", "taxable", "taxpayer", "tax liability", "tax compliance",
  "tax assessment", "deficiency tax", "tax audit", "tax refund", "tax credit",

  // BIR
  "bir", "bureau of internal revenue", "rdo", "efps", "eafs", "or us",

  // Income tax
  "income tax", "corporate income tax", "individual income tax",
  "rcit", "mcit", "nolco", "taxable income", "gross income",
  "allowable deduction", "itemized deduction", "osd",

  // VAT
  "vat", "value-added tax", "output vat", "input vat", "input tax",
  "output tax", "vatable", "vat-exempt", "zero-rated", "vat refund",

  // Withholding
  "withholding tax", "ewt", "cwt", "fwt", "final tax",
  "expanded withholding tax", "creditable withholding tax",
  "withholding agent", "2307", "2306", "2316",

  // Other taxes
  "percentage tax", "documentary stamp tax", "dst",
  "capital gains tax", "cgt", "fringe benefit tax", "fbt",
  "estate tax", "donor's tax", "excise tax",

  // Forms
  "1700", "1701", "1701a", "1701q", "1702", "1702q",
  "2550q", "2550m", "1601eq", "1601fq", "1604e", "1604cf",

  // Issuances
  "nirc", "tax code", "train law", "create law",
  "ease of paying taxes", "eopt",
  "revenue regulation", "rr", "revenue memorandum circular", "rmc",
  "revenue memorandum order", "rmo", "bir ruling",

  // Enforcement
  "letter of authority", "loa", "notice of discrepancy", "nod",
  "preliminary assessment notice", "pan", "final assessment notice", "fan",
  "final decision on disputed assessment", "fdda",

  // Transfer pricing / international tax
  "transfer pricing", "related party transaction", "rpt",
  "arm's length", "arm’s length", "benchmarking study",
  "transfer pricing documentation", "local file", "master file",
  "country-by-country report", "cbcr", "beps",
  "tax treaty", "double tax agreement", "dta",
  "permanent establishment", "withholding on foreign payments",
  "tax sparing", "most favored nation", "beneficial owner",

  // Incentives / special regimes
  "peza", "boi", "firb", "registered business enterprise", "rbe",
  "income tax holiday", "ith", "special corporate income tax", "scit",
  "enhanced deductions", "tax incentives",

  // Local taxes
  "local business tax", "lbt", "mayor's permit", "business permit",
  "community tax certificate", "real property tax", "rptax",

  // Common compliance words
  "invoice", "official receipt", "sales invoice", "e-invoice",
  "e-receipt", "books of accounts", "substantiation",
  "filing", "deadline", "due date", "surcharge", "interest", "compromise penalty"
];

export function isTaxRelated(question) {
  const q = question.toLowerCase();
  return taxKeywords.some(keyword => q.includes(keyword.toLowerCase()));
}
