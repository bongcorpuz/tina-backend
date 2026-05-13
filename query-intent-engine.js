// FILE: query-intent-engine.js

const ISSUE_TYPE = {
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_SUBSTANTIATION: "VAT_SUBSTANTIATION",
  VAT_EXEMPTION: "VAT_EXEMPTION",
  ZERO_RATED_SALES: "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",
  DEDUCTIBILITY: "DEDUCTIBILITY",

  WITHHOLDING_TAX: "WITHHOLDING_TAX",
  EWT: "EWT",
  CWT: "CWT",
  FWT: "FWT",

  ASSESSMENT: "ASSESSMENT",
  LOA: "LOA",
  PAN_FAN: "PAN_FAN",
  TAX_REMEDIES: "TAX_REMEDIES",
  PRESCRIPTION: "PRESCRIPTION",
  JURISDICTIONAL: "JURISDICTIONAL",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",

  NAMED_LAW: "NAMED_LAW",
  ISSUANCE: "ISSUANCE",
  CASE_LAW: "CASE_LAW",
  DOCTRINE: "DOCTRINE",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",

  LOCAL_TAX: "LOCAL_TAX",
  DST: "DST",
  PERCENTAGE_TAX: "PERCENTAGE_TAX",
  EXCISE_TAX: "EXCISE_TAX",
  FINAL_TAX: "FINAL_TAX",
  CGT: "CGT",
  ESTATE_TAX: "ESTATE_TAX",
  DONOR_TAX: "DONOR_TAX",

  GENERAL_TAX: "GENERAL_TAX"
};

const RESPONSE_MODE = {
  STANDARD_TAX: "STANDARD_TAX",
  PROVISION_CITATION: "PROVISION_CITATION",
  CASE_ANALYSIS: "CASE_ANALYSIS",
  DOCTRINE_ANALYSIS: "DOCTRINE_ANALYSIS",
  CONFLICT_ANALYSIS: "CONFLICT_ANALYSIS",
  SOURCE_FINDER: "SOURCE_FINDER",
  FALLBACK: "FALLBACK"
};

const LEGAL_DIMENSION = {
  SUBSTANTIVE: "substantive",
  PROCEDURAL: "procedural",
  EVIDENTIARY: "evidentiary",
  JURISDICTIONAL: "jurisdictional",
  TEMPORAL: "temporal",
  ADMINISTRATIVE: "administrative",
  FACTUAL: "factual",
  GENERAL: "general"
};

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function has(text = "", pattern) {
  return pattern.test(text);
}

function scorePattern(text = "", patterns = [], weight = 1) {
  return patterns.reduce((score, pattern) => score + (has(text, pattern) ? weight : 0), 0);
}

function detectIssuanceReference(text = "") {
  const value = normalizeText(text);

  const patterns = [
    {
      type: "RR",
      regex: /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex: /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    }
  ];

  for (const item of patterns) {
    const match = value.match(item.regex);
    if (match) {
      return {
        detected: true,
        type: item.type,
        number: String(Number(match[1])),
        year: normalizeYear(match[2]),
        reference: `${item.type} No. ${Number(match[1])}-${normalizeYear(match[2])}`
      };
    }
  }

  const rulingMatch = value.match(/\b(?:bir\s*)?ruling\s*(?:no\.?)?\s*([a-z0-9()/. -]+)\b/i);
  if (rulingMatch) {
    return {
      detected: true,
      type: "BIR_RULING",
      number: normalizeText(rulingMatch[1]),
      year: null,
      reference: `BIR Ruling ${normalizeText(rulingMatch[1])}`
    };
  }

  return {
    detected: false,
    type: null,
    number: null,
    year: null,
    reference: null
  };
}

function detectCaseReference(text = "") {
  const value = normalizeText(text);

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) {
    return {
      detected: true,
      court: "SUPREME_COURT",
      reference: `G.R. No. ${gr[1]}`
    };
  }

  const cta =
    value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i);

  if (cta) {
    return {
      detected: true,
      court: "CTA",
      reference: `CTA ${cta[1]}`
    };
  }

  const ca = value.match(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (ca) {
    return {
      detected: true,
      court: "COURT_OF_APPEALS",
      reference: `CA-G.R. ${ca[1]}`
    };
  }

  if (/\b[A-Z][A-Za-z0-9&.,'\-\s]{2,60}\s+(?:v\.|vs\.?|versus)\s+[A-Z][A-Za-z0-9&.,'\-\s]{2,60}\b/.test(value)) {
    return {
      detected: true,
      court: "CASE_NAME",
      reference: value.match(/\b[A-Z][A-Za-z0-9&.,'\-\s]{2,60}\s+(?:v\.|vs\.?|versus)\s+[A-Z][A-Za-z0-9&.,'\-\s]{2,60}\b/)?.[0] || null
    };
  }

  return {
    detected: false,
    court: null,
    reference: null
  };
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

function detectNamedLaw(text = "") {
  const value = lower(text);

  const laws = [];

  if (/\b(create law|create act|ra\s*11534|republic act\s*(?:no\.?)?\s*11534)\b/i.test(value)) {
    laws.push({
      code: "CREATE",
      title: "Corporate Recovery and Tax Incentives for Enterprises Act",
      raNumber: "11534"
    });
  }

  if (/\b(train law|train act|ra\s*10963|republic act\s*(?:no\.?)?\s*10963)\b/i.test(value)) {
    laws.push({
      code: "TRAIN",
      title: "Tax Reform for Acceleration and Inclusion Act",
      raNumber: "10963"
    });
  }

  if (/\b(eopt|ease of paying taxes|ra\s*11976|republic act\s*(?:no\.?)?\s*11976)\b/i.test(value)) {
    laws.push({
      code: "EOPT",
      title: "Ease of Paying Taxes Act",
      raNumber: "11976"
    });
  }

  if (/\b(create more|ra\s*12066|republic act\s*(?:no\.?)?\s*12066)\b/i.test(value)) {
    laws.push({
      code: "CREATE_MORE",
      title: "CREATE MORE Act",
      raNumber: "12066"
    });
  }

  const raMatch = value.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);
  if (raMatch && !laws.some((law) => law.raNumber === raMatch[1])) {
    laws.push({
      code: `RA_${raMatch[1]}`,
      title: `Republic Act No. ${raMatch[1]}`,
      raNumber: raMatch[1]
    });
  }

  return {
    detected: laws.length > 0,
    laws
  };
}

function detectIssueTypes(question = "") {
  const q = lower(question);
  const issues = [];

  if (scorePattern(q, [
    /\bvat refund\b/i,
    /\binput vat refund\b/i,
    /\bexcess input vat\b/i,
    /\bunutilized input vat\b/i,
    /\btax credit certificate\b/i,
    /\btcc\b/i,
    /\b120\+30\b/i,
    /\badministrative claim\b/i,
    /\bjudicial claim\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.VAT_REFUND);
  }

  if (scorePattern(q, [
    /\bvat liability\b/i,
    /\boutput vat\b/i,
    /\bsubject to vat\b/i,
    /\bvatable\b/i,
    /\bsale of goods\b/i,
    /\bsale of services\b/i,
    /\bgross selling price\b/i,
    /\bgross receipts\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.VAT_LIABILITY);
  }

  if (scorePattern(q, [
    /\bvat exempt\b/i,
    /\bvat-exempt\b/i,
    /\bexempt from vat\b/i,
    /\bsection\s*109\b/i,
    /\b109\b.*\bvat\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.VAT_EXEMPTION);
  }

  if (scorePattern(q, [
    /\bzero-rated\b/i,
    /\bzero rated\b/i,
    /\bzero-rating\b/i,
    /\bexport sale\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.ZERO_RATED_SALES);
  }

  if (scorePattern(q, [
    /\binvoice\b/i,
    /\breceipt\b/i,
    /\bsubstantiation\b/i,
    /\bdocumentary\b/i,
    /\bproof\b/i,
    /\bevidence\b/i,
    /\bbooks\b/i,
    /\brecords\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.EVIDENTIARY);
    if (q.includes("vat")) issues.push(ISSUE_TYPE.VAT_SUBSTANTIATION);
  }

  if (scorePattern(q, [
    /\bincome tax\b/i,
    /\brcit\b/i,
    /\bmcit\b/i,
    /\bnolco\b/i,
    /\bdeductible\b/i,
    /\bnon-deductible\b/i,
    /\bdeduction\b/i,
    /\bgross income\b/i,
    /\btaxable income\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.INCOME_TAX);
  }

  if (/\brcit\b/i.test(q)) issues.push(ISSUE_TYPE.RCIT);
  if (/\bmcit\b/i.test(q)) issues.push(ISSUE_TYPE.MCIT);
  if (/\bnolco\b/i.test(q)) issues.push(ISSUE_TYPE.NOLCO);

  if (scorePattern(q, [
    /\bdeductible\b/i,
    /\bnon-deductible\b/i,
    /\bnondeductible\b/i,
    /\bordinary and necessary\b/i,
    /\bsubstantiated expense\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.DEDUCTIBILITY);
  }

  if (scorePattern(q, [
    /\bwithholding\b/i,
    /\bewt\b/i,
    /\bcwt\b/i,
    /\bfwt\b/i,
    /\bexpanded withholding\b/i,
    /\bcreditable withholding\b/i,
    /\bfinal withholding\b/i,
    /\b2307\b/i,
    /\b1601\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.WITHHOLDING_TAX);
  }

  if (/\bewt\b|expanded withholding/i.test(q)) issues.push(ISSUE_TYPE.EWT);
  if (/\bcwt\b|creditable withholding/i.test(q)) issues.push(ISSUE_TYPE.CWT);
  if (/\bfwt\b|final withholding/i.test(q)) issues.push(ISSUE_TYPE.FWT);

  if (scorePattern(q, [
    /\bassessment\b/i,
    /\bdeficiency tax\b/i,
    /\bloa\b/i,
    /\bletter of authority\b/i,
    /\bpan\b/i,
    /\bfan\b/i,
    /\bfld\b/i,
    /\bprotest\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.ASSESSMENT);
  }

  if (/\bloa\b|letter of authority/i.test(q)) issues.push(ISSUE_TYPE.LOA);
  if (/\bpan\b|\bfan\b|\bfld\b|preliminary assessment|final assessment/i.test(q)) issues.push(ISSUE_TYPE.PAN_FAN);

  if (scorePattern(q, [
    /\brefund\b/i,
    /\bprotest\b/i,
    /\bappeal\b/i,
    /\bremedy\b/i,
    /\bcta\b/i,
    /\bcourt of tax appeals\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.TAX_REMEDIES);
  }

  if (scorePattern(q, [
    /\bprescription\b/i,
    /\bprescriptive\b/i,
    /\bstatute of limitations\b/i,
    /\bthree-year\b/i,
    /\bten-year\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.PRESCRIPTION);
  }

  if (scorePattern(q, [
    /\bjurisdiction\b/i,
    /\bjurisdictional\b/i,
    /\bcondition precedent\b/i,
    /\bexhaustion\b/i,
    /\bcourt has no jurisdiction\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.JURISDICTIONAL);
  }

  if (scorePattern(q, [
    /\bdeadline\b/i,
    /\bdue date\b/i,
    /\bfiling\b/i,
    /\bfile\b/i,
    /\breturn\b/i,
    /\bform\b/i,
    /\bperiod\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.PROCEDURAL);
  }

  if (scorePattern(q, [
    /\bdoctrine\b/i,
    /\bsubstance over form\b/i,
    /\bbusiness purpose\b/i,
    /\beconomic substance\b/i,
    /\btax avoidance\b/i,
    /\btax evasion\b/i,
    /\bjurisprudence\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.DOCTRINE);
  }

  if (scorePattern(q, [
    /\bconflict\b/i,
    /\bconflicting\b/i,
    /\bprevails\b/i,
    /\boverride\b/i,
    /\bhierarchy\b/i,
    /\bwhich law controls\b/i,
    /\bwhich authority controls\b/i
  ]) > 0) {
    issues.push(ISSUE_TYPE.CONFLICT_ANALYSIS);
  }

  if (detectIssuanceReference(q).detected) issues.push(ISSUE_TYPE.ISSUANCE);
  if (detectCaseReference(question).detected) issues.push(ISSUE_TYPE.CASE_LAW);
  if (detectNamedLaw(question).detected) issues.push(ISSUE_TYPE.NAMED_LAW);

  if (/\blocal tax\b|\blgu\b|\blocal business tax\b|\bmayor/i.test(q)) {
    issues.push(ISSUE_TYPE.LOCAL_TAX);
  }

  if (/\bdst\b|documentary stamp/i.test(q)) issues.push(ISSUE_TYPE.DST);
  if (/\bpercentage tax\b|\b2551\b|\bnon-vat\b|\bnon vat\b/i.test(q)) issues.push(ISSUE_TYPE.PERCENTAGE_TAX);
  if (/\bexcise tax\b/i.test(q)) issues.push(ISSUE_TYPE.EXCISE_TAX);
  if (/\bfinal tax\b|passive income|interest income|royalties|dividends/i.test(q)) issues.push(ISSUE_TYPE.FINAL_TAX);
  if (/\bcgt\b|capital gains tax|sale of shares|real property/i.test(q)) issues.push(ISSUE_TYPE.CGT);
  if (/\bestate tax\b|gross estate|net estate|decedent/i.test(q)) issues.push(ISSUE_TYPE.ESTATE_TAX);
  if (/\bdonor'?s tax\b|donor tax|donation|gift/i.test(q)) issues.push(ISSUE_TYPE.DONOR_TAX);

  return unique(issues.length ? issues : [ISSUE_TYPE.GENERAL_TAX]);
}

function detectLegalDimensions(question = "") {
  const q = lower(question);
  const dimensions = [];

  if (scorePattern(q, [
    /\btaxable\b/i,
    /\bliable\b/i,
    /\bsubject to\b/i,
    /\bexempt\b/i,
    /\bdeductible\b/i,
    /\bgross income\b/i,
    /\btax base\b/i,
    /\btax rate\b/i,
    /\boutput vat\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.SUBSTANTIVE);
  }

  if (scorePattern(q, [
    /\bfile\b/i,
    /\bfiling\b/i,
    /\bdeadline\b/i,
    /\bdue date\b/i,
    /\bperiod\b/i,
    /\bprotest\b/i,
    /\bappeal\b/i,
    /\bassessment\b/i,
    /\breturn\b/i,
    /\bform\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.PROCEDURAL);
  }

  if (scorePattern(q, [
    /\binvoice\b/i,
    /\breceipt\b/i,
    /\bsubstantiation\b/i,
    /\bdocumentary\b/i,
    /\bproof\b/i,
    /\bevidence\b/i,
    /\brecords\b/i,
    /\bbooks\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.EVIDENTIARY);
  }

  if (scorePattern(q, [
    /\bjurisdiction\b/i,
    /\bjurisdictional\b/i,
    /\bcta\b/i,
    /\bcondition precedent\b/i,
    /\b120\+30\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.JURISDICTIONAL);
  }

  if (scorePattern(q, [
    /\beffective\b/i,
    /\beffectivity\b/i,
    /\bretroactive\b/i,
    /\bprospective\b/i,
    /\btaxable year\b/i,
    /\btransition\b/i,
    /\bsuperseded\b/i,
    /\bamended\b/i,
    /\brepealed\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.TEMPORAL);
  }

  if (scorePattern(q, [
    /\brmc\b/i,
    /\brmo\b/i,
    /\bramo\b/i,
    /\bbir ruling\b/i,
    /\badministrative\b/i,
    /\binterpretative\b/i,
    /\bclarificatory\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.ADMINISTRATIVE);
  }

  if (scorePattern(q, [
    /\bfacts\b/i,
    /\bfactual\b/i,
    /\bactual\b/i,
    /\bcircumstances\b/i,
    /\btransaction\b/i,
    /\bdocumentation\b/i
  ]) > 0) {
    dimensions.push(LEGAL_DIMENSION.FACTUAL);
  }

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectResponseMode(question = "", issueTypes = []) {
  const q = lower(question);

  if (issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS)) return RESPONSE_MODE.CONFLICT_ANALYSIS;
  if (issueTypes.includes(ISSUE_TYPE.DOCTRINE)) return RESPONSE_MODE.DOCTRINE_ANALYSIS;
  if (issueTypes.includes(ISSUE_TYPE.CASE_LAW)) return RESPONSE_MODE.CASE_ANALYSIS;

  if (
    issueTypes.includes(ISSUE_TYPE.ISSUANCE) ||
    /\b(cite|citation|legal basis|provision|section|sec\.|article|under rr|under rmc|under rmo|under nirc)\b/i.test(q)
  ) {
    return RESPONSE_MODE.PROVISION_CITATION;
  }

  if (/\b(source|find source|show source|where is|which file)\b/i.test(q)) {
    return RESPONSE_MODE.SOURCE_FINDER;
  }

  return RESPONSE_MODE.STANDARD_TAX;
}

function detectRiskFlags(question = "", issueTypes = [], dimensions = []) {
  const flags = [];

  if (
    issueTypes.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    issueTypes.includes(ISSUE_TYPE.VAT_REFUND)
  ) {
    flags.push({
      code: "VAT_LIABILITY_REFUND_MIXED",
      message:
        "Question contains both VAT liability and VAT refund signals. Retrieval must separate substantive liability authorities from refund procedure authorities."
    });
  }

  if (
    issueTypes.includes(ISSUE_TYPE.VAT_REFUND) &&
    dimensions.includes(LEGAL_DIMENSION.JURISDICTIONAL)
  ) {
    flags.push({
      code: "VAT_REFUND_JURISDICTIONAL",
      message:
        "VAT refund question appears jurisdictional. Prioritize administrative and judicial claim timing authorities."
    });
  }

  if (
    issueTypes.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    dimensions.includes(LEGAL_DIMENSION.EVIDENTIARY)
  ) {
    flags.push({
      code: "VAT_LIABILITY_EVIDENTIARY",
      message:
        "VAT liability question includes evidentiary signals. Distinguish taxability from invoicing/substantiation."
    });
  }

  if (
    issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS)
  ) {
    flags.push({
      code: "REQUIRES_CONFLICT_REASONING",
      message:
        "Answer must distinguish hierarchy conflict, doctrinal conflict, and apparent conflict."
    });
  }

  if (
    issueTypes.includes(ISSUE_TYPE.CASE_LAW)
  ) {
    flags.push({
      code: "REQUIRES_ISSUE_RELEVANT_CASES",
      message:
        "Only issue-relevant jurisprudence should be retrieved and cited."
      });
  }

  if (
    issueTypes.includes(ISSUE_TYPE.NAMED_LAW)
  ) {
    flags.push({
      code: "REQUIRES_PRIMARY_STATUTE",
      message:
        "Named-law questions require the exact statute first, then IRR or implementing issuances."
    });
  }

  return flags;
}

function buildRetrievalHints({
  issueTypes = [],
  dimensions = [],
  issuance = null,
  caseReference = null,
  namedLaw = null
}) {
  const includeAuthorityTypes = [];
  const excludeIssueTypes = [];
  const priorityTerms = [];

  if (namedLaw?.detected) {
    includeAuthorityTypes.push("STATUTE", "RR", "RMC", "RMO");
    for (const law of namedLaw.laws) {
      priorityTerms.push(law.raNumber ? `RA ${law.raNumber}` : law.title);
      priorityTerms.push(law.title);
    }
  }

  if (issuance?.detected) {
    includeAuthorityTypes.push(issuance.type);
    priorityTerms.push(issuance.reference);
  }

  if (caseReference?.detected) {
    includeAuthorityTypes.push("SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION");
    priorityTerms.push(caseReference.reference);
  }

  if (issueTypes.includes(ISSUE_TYPE.VAT_REFUND)) {
    priorityTerms.push("VAT refund", "administrative claim", "judicial claim", "120+30", "unutilized input VAT");
    excludeIssueTypes.push(ISSUE_TYPE.VAT_LIABILITY);
  }

  if (issueTypes.includes(ISSUE_TYPE.VAT_LIABILITY)) {
    priorityTerms.push("output VAT", "subject to VAT", "vatable sales", "gross receipts");
    excludeIssueTypes.push(ISSUE_TYPE.VAT_REFUND);
  }

  if (issueTypes.includes(ISSUE_TYPE.VAT_SUBSTANTIATION)) {
    priorityTerms.push("invoice", "official receipt", "substantiation", "VAT invoice");
  }

  if (issueTypes.includes(ISSUE_TYPE.WITHHOLDING_TAX)) {
    priorityTerms.push("withholding tax", "expanded withholding tax", "creditable withholding tax", "BIR Form 2307");
  }

  if (issueTypes.includes(ISSUE_TYPE.MCIT)) {
    priorityTerms.push("minimum corporate income tax", "MCIT");
  }

  if (issueTypes.includes(ISSUE_TYPE.NOLCO)) {
    priorityTerms.push("net operating loss carry-over", "NOLCO");
  }

  if (dimensions.includes(LEGAL_DIMENSION.JURISDICTIONAL)) {
    priorityTerms.push("jurisdictional", "condition precedent", "CTA jurisdiction");
  }

  if (dimensions.includes(LEGAL_DIMENSION.PROCEDURAL)) {
    priorityTerms.push("filing", "deadline", "period", "remedy");
  }

  if (dimensions.includes(LEGAL_DIMENSION.EVIDENTIARY)) {
    priorityTerms.push("substantiation", "documentary evidence", "burden of proof");
  }

  return {
    includeAuthorityTypes: unique(includeAuthorityTypes),
    excludeIssueTypes: unique(excludeIssueTypes),
    priorityTerms: unique(priorityTerms.filter(Boolean))
  };
}

export function analyzeQueryIntent(question = "") {
  const cleanQuestion = normalizeText(question);
  const issueTypes = detectIssueTypes(cleanQuestion);
  const legalDimensions = detectLegalDimensions(cleanQuestion);
  const issuance = detectIssuanceReference(cleanQuestion);
  const caseReference = detectCaseReference(cleanQuestion);
  const namedLaw = detectNamedLaw(cleanQuestion);
  const responseMode = detectResponseMode(cleanQuestion, issueTypes);
  const riskFlags = detectRiskFlags(cleanQuestion, issueTypes, legalDimensions);
  const retrievalHints = buildRetrievalHints({
    issueTypes,
    dimensions: legalDimensions,
    issuance,
    caseReference,
    namedLaw
  });

  return {
    originalQuestion: question,
    normalizedQuestion: cleanQuestion,
    responseMode,
    issueTypes,
    legalDimensions,
    issuance,
    caseReference,
    namedLaw,
    riskFlags,
    retrievalHints,
    requiresPrimaryAuthority:
      namedLaw.detected || issuance.detected || caseReference.detected,
    requiresIssueMatchedCases:
      issueTypes.includes(ISSUE_TYPE.CASE_LAW) ||
      responseMode === RESPONSE_MODE.CASE_ANALYSIS,
    requiresConflictAnalysis:
      issueTypes.includes(ISSUE_TYPE.CONFLICT_ANALYSIS) ||
      responseMode === RESPONSE_MODE.CONFLICT_ANALYSIS,
    requiresAFStructure: true,
    tinaInstruction:
      "Apply TINA master prompt: answer using A-F structure, hierarchy analysis, issue-relevant jurisprudence only, and no citation dumping."
  };
}

export function buildIntentSearchQueries(question = "", maxQueries = 6) {
  const intent = analyzeQueryIntent(question);
  const queries = [intent.normalizedQuestion];

  for (const term of intent.retrievalHints.priorityTerms) {
    if (term) queries.push(`${intent.normalizedQuestion} ${term}`);
  }

  if (intent.namedLaw.detected) {
    for (const law of intent.namedLaw.laws) {
      if (law.raNumber) queries.push(`RA ${law.raNumber} ${law.title}`);
      queries.push(law.title);
    }
  }

  if (intent.issuance.detected) {
    queries.push(intent.issuance.reference);
  }

  if (intent.caseReference.detected) {
    queries.push(intent.caseReference.reference);
  }

  return unique(queries).slice(0, maxQueries);
}

export function isIssueMismatch(queryIntent = {}, docIssueTypes = []) {
  const queryIssues = queryIntent.issueTypes || [];
  const docIssues = docIssueTypes || [];

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    docIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_REFUND)
  ) {
    return true;
  }

  if (
    queryIssues.includes(ISSUE_TYPE.VAT_REFUND) &&
    docIssues.includes(ISSUE_TYPE.VAT_LIABILITY) &&
    !queryIssues.includes(ISSUE_TYPE.VAT_LIABILITY)
  ) {
    return true;
  }

  return false;
}

export { ISSUE_TYPE, RESPONSE_MODE, LEGAL_DIMENSION };

export default {
  ISSUE_TYPE,
  RESPONSE_MODE,
  LEGAL_DIMENSION,
  analyzeQueryIntent,
  buildIntentSearchQueries,
  isIssueMismatch
};
