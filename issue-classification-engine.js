// FILE: issue-classification-engine.js
"use strict";

/**
 * TINA Issue Classification Engine
 * Version: 1.0.0
 *
 * Purpose:
 * - Classify Philippine tax queries before retrieval.
 * - Prevent broad semantic retrieval from selecting wrong authorities.
 * - Support issue-based retrieval, jurisprudence filtering, conflict gating,
 *   transaction characterization, and fact-pattern analysis.
 */

const ENGINE_VERSION = "1.0.0";

const PRIMARY_ISSUE = Object.freeze({
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
  ADVISORY: "advisory"
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
  FOUNDATIONAL: "foundational",
  PROCEDURAL: "procedural",
  JURISPRUDENTIAL: "jurisprudential",
  MIXED: "mixed",
  FACT_DRIVEN: "fact-driven",
  EXACT_AUTHORITY: "exact-authority",
  EVIDENCE_DRIVEN: "evidence-driven"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function hasAny(text = "", patterns = []) {
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(text);
    return text.includes(String(pattern).toLowerCase());
  });
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
      type: "RA",
      reference: `RA ${ra[1]}`,
      number: ra[1],
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
      type: "CTA",
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

function detectTaxDomain(question = "") {
  const q = lower(question);
  const domains = [];

  const push = (condition, domain) => {
    if (condition) domains.push(domain);
  };

  push(/\bvat\b|\bvalue[- ]added tax\b|\boutput vat\b|\binput vat\b|\bzero[- ]rated\b/i.test(q), "VAT");
  push(/\bincome tax\b|\brcit\b|\bmcit\b|\bnolco\b|\bdeductible\b|\btaxable income\b/i.test(q), "INCOME_TAX");
  push(/\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b|\bfinal tax\b|\bexpanded withholding\b/i.test(q), "WITHHOLDING_TAX");
  push(/\bdst\b|\bdocumentary stamp\b/i.test(q), "DST");
  push(/\bpercentage tax\b/i.test(q), "PERCENTAGE_TAX");
  push(/\bexcise\b/i.test(q), "EXCISE_TAX");
  push(/\bcapital gains\b|\bcgt\b/i.test(q), "CAPITAL_GAINS_TAX");
  push(/\bestate tax\b/i.test(q), "ESTATE_TAX");
  push(/\bdonor'?s tax\b|\bdonor tax\b/i.test(q), "DONOR_TAX");
  push(/\blocal business tax\b|\blbt\b|\breal property tax\b|\brpt\b|\blgu\b/i.test(q), "LOCAL_TAX");
  push(/\bcustoms\b|\btariff\b|\bimport duties\b/i.test(q), "CUSTOMS");
  push(/\btransfer pricing\b|\brelated party\b|\barms'? length\b/i.test(q), "TRANSFER_PRICING");
  push(/\bpfrs\b|\bpas\b|\bafs\b|\bfinancial statements\b|\baudit\b/i.test(q), "ACCOUNTING_AUDIT");

  return unique(domains.length ? domains : ["GENERAL_TAX"]);
}

function detectPrimaryIssue(question = "") {
  const q = lower(question);

  if (hasAny(q, [
    /\bwhat is\b/i,
    /\bdefine\b/i,
    /\bmeaning\b/i,
    /\bnature of\b/i,
    /\bscope of\b/i,
    /\bconcept of\b/i
  ])) return PRIMARY_ISSUE.DEFINITION;

  if (hasAny(q, [
    /\bfile\b/i,
    /\bfiling\b/i,
    /\bpayment\b/i,
    /\bregistration\b/i,
    /\bdeadline\b/i,
    /\bdue date\b/i,
    /\bform\b/i,
    /\breturn\b/i,
    /\bsubmit\b/i,
    /\bcompliance\b/i
  ])) return PRIMARY_ISSUE.COMPLIANCE;

  if (hasAny(q, [
    /\brefund\b/i,
    /\btax credit\b/i,
    /\btcc\b/i,
    /\bexcess input vat\b/i,
    /\bunutilized input vat\b/i,
    /\berroneously paid\b/i,
    /\bsection 112\b/i,
    /\b120[-+ ]day\b/i
  ])) return PRIMARY_ISSUE.REFUND;

  if (hasAny(q, [
    /\bprescription\b/i,
    /\bprescriptive\b/i,
    /\bstatute of limitations\b/i,
    /\b3[- ]year\b/i,
    /\b10[- ]year\b/i,
    /\bwaiver\b/i,
    /\bassessment period\b/i,
    /\bcollection period\b/i
  ])) return PRIMARY_ISSUE.PRESCRIPTION;

  if (hasAny(q, [
    /\bexempt\b/i,
    /\bexemption\b/i,
    /\btax[- ]exempt\b/i,
    /\bvat[- ]exempt\b/i,
    /\bsection 109\b/i,
    /\bnon[- ]taxable\b/i
  ])) return PRIMARY_ISSUE.EXEMPTION;

  if (hasAny(q, [
    /\bprotest\b/i,
    /\bappeal\b/i,
    /\bcta\b/i,
    /\bsupreme court\b/i,
    /\bfdda\b/i,
    /\bpan\b/i,
    /\bfan\b/i,
    /\bfld\b/i,
    /\bloa\b/i,
    /\bassessment\b/i,
    /\bdispute\b/i
  ])) return PRIMARY_ISSUE.DISPUTE_RESOLUTION;

  if (hasAny(q, [
    /\bdue process\b/i,
    /\bequal protection\b/i,
    /\bconstitutional\b/i,
    /\bvalidity\b/i,
    /\binvalid law\b/i,
    /\bconfiscatory\b/i
  ])) return PRIMARY_ISSUE.CONSTITUTIONAL;

  if (hasAny(q, [
    /\bwithholding\b/i,
    /\bewt\b/i,
    /\bcwt\b/i,
    /\bfwt\b/i,
    /\bfinal withholding\b/i,
    /\bexpanded withholding\b/i
  ])) return PRIMARY_ISSUE.WITHHOLDING;

  if (hasAny(q, [
    /\bprincipal\b/i,
    /\bagent\b/i,
    /\bpass[- ]through\b/i,
    /\breimbursement\b/i,
    /\breimbursable\b/i,
    /\bconcession\b/i,
    /\blease\b/i,
    /\bservice vs sale\b/i,
    /\bsale vs service\b/i,
    /\bclassification\b/i,
    /\bcharacterization\b/i,
    /\beconomic substance\b/i,
    /\bsubstance over form\b/i,
    /\bbundled\b/i,
    /\bpackage\b/i,
    /\bdfs\b/i,
    /\bdeposit for future subscription\b/i,
    /\bliability vs equity\b/i
  ])) return PRIMARY_ISSUE.CHARACTERIZATION;

  if (hasAny(q, [
    /\binvoice\b/i,
    /\breceipt\b/i,
    /\bsubstantiation\b/i,
    /\bevidence\b/i,
    /\bproof\b/i,
    /\bdocumentary\b/i,
    /\bsupporting document\b/i
  ])) return PRIMARY_ISSUE.EVIDENTIARY;

  if (hasAny(q, [
    /\bpfrs\b/i,
    /\bpas\b/i,
    /\bafs\b/i,
    /\baccounting treatment\b/i,
    /\bbook\b/i,
    /\bjournal entry\b/i,
    /\baudit\b/i,
    /\bmisstatement\b/i
  ])) return PRIMARY_ISSUE.ACCOUNTING_TAX;

  if (hasAny(q, [
    /\bbir\b/i,
    /\bcir\b/i,
    /\bdof\b/i,
    /\bruling\b/i,
    /\brevenue regulation\b/i,
    /\brmc\b/i,
    /\brmo\b/i,
    /\badministrative\b/i
  ])) return PRIMARY_ISSUE.PROCEDURAL;

  return PRIMARY_ISSUE.GENERAL_TAX;
}

function detectSubIssue(question = "", primaryIssue = PRIMARY_ISSUE.GENERAL_TAX, domains = []) {
  const q = lower(question);
  const domain = domains[0] || "GENERAL_TAX";

  if (domain === "VAT") {
    if (primaryIssue === PRIMARY_ISSUE.DEFINITION) return "DEFINITION/VAT_NATURE_SCOPE";
    if (primaryIssue === PRIMARY_ISSUE.REFUND) return "REFUND/VAT_SECTION_112";
    if (primaryIssue === PRIMARY_ISSUE.EXEMPTION) return "EXEMPTION/VAT_EXEMPT_TRANSACTION";
    if (/\bzero[- ]rated\b/i.test(q)) return "VAT/ZERO_RATED_SALES";
    if (/\binput vat\b/i.test(q)) return "VAT/INPUT_TAX";
    if (/\boutput vat\b/i.test(q)) return "VAT/OUTPUT_TAX";
    if (/\binvoice\b|\breceipt\b|\bsubstantiation\b/i.test(q)) return "VAT/INVOICING_SUBSTANTIATION";
    return "VAT/GENERAL";
  }

  if (domain === "INCOME_TAX") {
    if (/\bmcit\b/i.test(q)) return "INCOME_TAX/MCIT";
    if (/\brcit\b/i.test(q)) return "INCOME_TAX/RCIT";
    if (/\bnolco\b/i.test(q)) return "INCOME_TAX/NOLCO";
    if (/\bdeductible\b|\bnon[- ]deductible\b/i.test(q)) return "INCOME_TAX/DEDUCTIBILITY";
    return "INCOME_TAX/GENERAL";
  }

  if (domain === "WITHHOLDING_TAX") {
    if (/\bewt\b|\bexpanded\b/i.test(q)) return "WITHHOLDING/EWT";
    if (/\bcwt\b|\bcreditable\b/i.test(q)) return "WITHHOLDING/CWT";
    if (/\bfwt\b|\bfinal withholding\b/i.test(q)) return "WITHHOLDING/FWT";
    return "WITHHOLDING/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.CHARACTERIZATION) {
    if (/\bprincipal\b|\bagent\b/i.test(q)) return "CHARACTERIZATION/PRINCIPAL_AGENT";
    if (/\breimbursement\b|\breimbursable\b|\bpass[- ]through\b/i.test(q)) return "CHARACTERIZATION/REIMBURSEMENT_PASS_THROUGH";
    if (/\blease\b|\bconcession\b/i.test(q)) return "CHARACTERIZATION/LEASE_VS_CONCESSION";
    if (/\bservice\b|\bsale\b/i.test(q)) return "CHARACTERIZATION/SERVICE_VS_SALE";
    if (/\beconomic substance\b|\bsubstance over form\b/i.test(q)) return "CHARACTERIZATION/ECONOMIC_SUBSTANCE";
    if (/\bdfs\b|\bdeposit for future subscription\b|\bequity\b|\bliability\b/i.test(q)) return "CHARACTERIZATION/LIABILITY_VS_EQUITY";
    return "CHARACTERIZATION/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.PRESCRIPTION) {
    if (/\bassessment\b|\bloa\b|\bpan\b|\bfan\b/i.test(q)) return "PRESCRIPTION/ASSESSMENT";
    if (/\bcollection\b/i.test(q)) return "PRESCRIPTION/COLLECTION";
    if (/\brefund\b/i.test(q)) return "PRESCRIPTION/REFUND";
    return "PRESCRIPTION/GENERAL";
  }

  if (primaryIssue === PRIMARY_ISSUE.DISPUTE_RESOLUTION) {
    if (/\bprotest\b/i.test(q)) return "DISPUTE_RESOLUTION/PROTEST";
    if (/\bcta\b|\bappeal\b/i.test(q)) return "DISPUTE_RESOLUTION/CTA_APPEAL";
    if (/\bsupreme court\b|\bg\.?\s*r\.?\s*no/i.test(q)) return "DISPUTE_RESOLUTION/SC_REVIEW";
    return "DISPUTE_RESOLUTION/GENERAL";
  }

  return `${primaryIssue}/GENERAL`;
}

function detectQueryIntent(question = "", primaryIssue = PRIMARY_ISSUE.GENERAL_TAX) {
  const q = lower(question);

  if (primaryIssue === PRIMARY_ISSUE.DEFINITION) return QUERY_INTENT.DEFINITION;
  if ([PRIMARY_ISSUE.COMPLIANCE, PRIMARY_ISSUE.WITHHOLDING].includes(primaryIssue)) return QUERY_INTENT.COMPLIANCE;
  if ([PRIMARY_ISSUE.DISPUTE_RESOLUTION, PRIMARY_ISSUE.PRESCRIPTION, PRIMARY_ISSUE.PROCEDURAL].includes(primaryIssue)) return QUERY_INTENT.DISPUTE;

  if (hasAny(q, [
    /\bcan we\b/i,
    /\bshould we\b/i,
    /\bis it better\b/i,
    /\bstructure\b/i,
    /\bplanning\b/i,
    /\btax efficient\b/i
  ])) return QUERY_INTENT.PLANNING;

  return QUERY_INTENT.ADVISORY;
}

function buildLegalQuestionPresented({ question = "", primaryIssue, subIssue, domains = [] }) {
  const domain = domains[0] || "tax";

  const templates = {
    [PRIMARY_ISSUE.DEFINITION]: `What is the legal nature, scope, or meaning of ${domain} under Philippine tax law?`,
    [PRIMARY_ISSUE.COMPLIANCE]: `What are the applicable filing, payment, registration, or documentation obligations for the identified Philippine tax issue?`,
    [PRIMARY_ISSUE.REFUND]: `Whether the taxpayer may claim a tax refund or credit and what procedural and substantiation requirements apply.`,
    [PRIMARY_ISSUE.PRESCRIPTION]: `Whether the applicable assessment, collection, filing, protest, appeal, or refund period has prescribed under Philippine tax law.`,
    [PRIMARY_ISSUE.EXEMPTION]: `Whether the identified person, entity, income, or transaction is exempt from the applicable Philippine tax.`,
    [PRIMARY_ISSUE.PROCEDURAL]: `What administrative BIR, CIR, DOF, or procedural rule governs the issue?`,
    [PRIMARY_ISSUE.CONSTITUTIONAL]: `Whether the tax law, issuance, assessment, or government action is constitutionally valid.`,
    [PRIMARY_ISSUE.WITHHOLDING]: `Whether withholding tax applies, what type of withholding tax applies, and who is the withholding agent.`,
    [PRIMARY_ISSUE.CHARACTERIZATION]: `How the transaction should be legally characterized for Philippine tax, accounting, audit, and compliance purposes.`,
    [PRIMARY_ISSUE.DISPUTE_RESOLUTION]: `What remedy, protest, appeal, or litigation procedure applies to the tax dispute.`,
    [PRIMARY_ISSUE.EVIDENTIARY]: `What documentary evidence is required to support the tax position.`,
    [PRIMARY_ISSUE.ACCOUNTING_TAX]: `What accounting treatment and related Philippine tax consequences apply.`
  };

  return templates[primaryIssue] || `What Philippine tax rule governs the user's issue?`;
}

function buildTargetAuthorities({ primaryIssue, subIssue, domains = [], exactAuthority }) {
  const domain = domains[0] || "GENERAL_TAX";

  const targets = {
    constitution: [],
    nirc: [],
    supremeCourt: [],
    ctaEnBanc: [],
    rr: [],
    rmc: [],
    birRulings: []
  };

  if (exactAuthority?.detected) {
    if (exactAuthority.type === "RA") targets.nirc.push(exactAuthority.reference);
    else if (exactAuthority.type === "SUPREME_COURT") targets.supremeCourt.push(exactAuthority.reference);
    else if (exactAuthority.type === "CTA") targets.ctaEnBanc.push(exactAuthority.reference);
    else if (exactAuthority.type === "RR") targets.rr.push(exactAuthority.reference);
    else if (exactAuthority.type === "RMC") targets.rmc.push(exactAuthority.reference);
    else targets.birRulings.push(exactAuthority.reference);
  }

  if (domain === "VAT") {
    targets.nirc.push("NIRC Sections 105 to 115");
    targets.rr.push("RR No. 16-2005");

    if (primaryIssue === PRIMARY_ISSUE.DEFINITION) {
      targets.nirc.push("NIRC Sections 105, 106, 107, 108");
      targets.supremeCourt.push("VAT nature and scope cases");
      targets.rr.push("RR No. 16-2005 VAT regulations");
    }

    if (primaryIssue === PRIMARY_ISSUE.REFUND) {
      targets.nirc.push("NIRC Section 112");
      targets.supremeCourt.push("Aichi", "San Roque", "CIR v. Mirant", "CIR v. Team Energy");
      targets.rr.push("RR No. 16-2005 VAT refund provisions");
    }

    if (primaryIssue === PRIMARY_ISSUE.EXEMPTION) {
      targets.nirc.push("NIRC Section 109");
      targets.supremeCourt.push("VAT exemption jurisprudence");
      targets.rr.push("RR No. 16-2005 VAT exemption rules");
    }
  }

  if (domain === "INCOME_TAX") {
    targets.nirc.push("NIRC Sections 24 to 32", "NIRC Section 34");
    if (subIssue.includes("MCIT")) targets.nirc.push("NIRC Section 27(E)");
    if (subIssue.includes("NOLCO")) targets.nirc.push("NIRC Section 34(D)(3)");
  }

  if (domain === "WITHHOLDING_TAX") {
    targets.nirc.push("NIRC withholding tax provisions");
    targets.rr.push("RR No. 2-98");
    targets.rmc.push("Applicable BIR withholding tax circulars");
  }

  if (primaryIssue === PRIMARY_ISSUE.CHARACTERIZATION) {
    targets.nirc.push("Relevant gross income, VAT, withholding, and deduction provisions");
    targets.supremeCourt.push("Substance over form jurisprudence", "Principal-agent and reimbursement jurisprudence");
    targets.rr.push("Relevant VAT and withholding regulations");
    targets.rmc.push("BIR guidance on reimbursements, pass-through charges, and invoicing");
  }

  if (primaryIssue === PRIMARY_ISSUE.PRESCRIPTION) {
    targets.nirc.push("NIRC Sections 203, 222, 228");
    targets.supremeCourt.push("Assessment and prescription jurisprudence");
  }

  if (primaryIssue === PRIMARY_ISSUE.DISPUTE_RESOLUTION) {
    targets.nirc.push("NIRC Section 228");
    targets.supremeCourt.push("Tax protest, due process, and CTA jurisdiction cases");
    targets.ctaEnBanc.push("CTA En Banc procedural decisions");
  }

  if (primaryIssue === PRIMARY_ISSUE.CONSTITUTIONAL) {
    targets.constitution.push("1987 Philippine Constitution tax and due process provisions");
    targets.nirc.push("Relevant NIRC provision challenged or applied");
    targets.supremeCourt.push("Constitutional taxation jurisprudence");
  }

  for (const key of Object.keys(targets)) {
    targets[key] = unique(targets[key]);
  }

  return targets;
}

function buildKeyTerms({ question = "", primaryIssue, subIssue, domains = [], exactAuthority }) {
  const terms = [];

  terms.push(...domains);
  terms.push(primaryIssue);
  terms.push(subIssue);

  if (exactAuthority?.reference) terms.push(exactAuthority.reference);

  const q = lower(question);

  const termPatterns = [
    ["VAT", /\bvat\b|\bvalue[- ]added tax\b/i],
    ["output VAT", /\boutput vat\b/i],
    ["input VAT", /\binput vat\b/i],
    ["zero-rated sales", /\bzero[- ]rated\b/i],
    ["VAT-exempt", /\bvat[- ]exempt\b|\bexempt\b/i],
    ["refund", /\brefund\b|\btax credit\b|\btcc\b/i],
    ["withholding tax", /\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b/i],
    ["MCIT", /\bmcit\b/i],
    ["RCIT", /\brcit\b/i],
    ["NOLCO", /\bnolco\b/i],
    ["principal-agent", /\bprincipal\b|\bagent\b/i],
    ["reimbursement", /\breimbursement\b|\breimbursable\b/i],
    ["pass-through", /\bpass[- ]through\b/i],
    ["lease", /\blease\b/i],
    ["concession", /\bconcession\b/i],
    ["economic substance", /\beconomic substance\b|\bsubstance over form\b/i],
    ["assessment", /\bassessment\b|\bloa\b|\bpan\b|\bfan\b|\bfld\b/i],
    ["prescription", /\bprescription\b|\bprescriptive\b/i],
    ["evidence", /\bevidence\b|\bsubstantiation\b|\binvoice\b|\breceipt\b/i]
  ];

  for (const [term, regex] of termPatterns) {
    if (regex.test(q)) terms.push(term);
  }

  return unique(terms);
}

function detectComplexity({ question = "", primaryIssue, domains = [], keyTerms = [] }) {
  const q = lower(question);
  let score = 0;

  if (domains.length > 1) score += 2;
  if (keyTerms.length >= 6) score += 1;
  if (question.length > 220) score += 1;

  if ([
    PRIMARY_ISSUE.CHARACTERIZATION,
    PRIMARY_ISSUE.DISPUTE_RESOLUTION,
    PRIMARY_ISSUE.CONSTITUTIONAL,
    PRIMARY_ISSUE.PRESCRIPTION
  ].includes(primaryIssue)) score += 2;

  if (hasAny(q, [
    /\bconflict\b/i,
    /\bprevails\b/i,
    /\bhierarchy\b/i,
    /\bdoctrine\b/i,
    /\bjurisprudence\b/i,
    /\bcontract\b/i,
    /\bagreement\b/i,
    /\bactual facts\b/i,
    /\baudit risk\b/i,
    /\blegal consequence\b/i
  ])) score += 2;

  if (score >= 4) return COMPLEXITY.MULTI_ISSUE;
  if (score === 3) return COMPLEXITY.COMPLEX;
  if (score >= 1) return COMPLEXITY.MODERATE;
  return COMPLEXITY.SIMPLE;
}

function detectFactSensitivity(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (primaryIssue === PRIMARY_ISSUE.DEFINITION) return FACT_SENSITIVITY.LOW;

  if ([
    PRIMARY_ISSUE.CHARACTERIZATION,
    PRIMARY_ISSUE.EVIDENTIARY,
    PRIMARY_ISSUE.ACCOUNTING_TAX,
    PRIMARY_ISSUE.DISPUTE_RESOLUTION
  ].includes(primaryIssue)) return FACT_SENSITIVITY.HIGH;

  if (hasAny(q, [
    /\bcontract\b/i,
    /\bagreement\b/i,
    /\binvoice\b/i,
    /\breceipt\b/i,
    /\bactual\b/i,
    /\bfacts\b/i,
    /\bscenario\b/i,
    /\btransaction\b/i,
    /\bbooked\b/i,
    /\baudit\b/i
  ])) return FACT_SENSITIVITY.HIGH;

  if ([
    PRIMARY_ISSUE.EXEMPTION,
    PRIMARY_ISSUE.REFUND,
    PRIMARY_ISSUE.WITHHOLDING,
    PRIMARY_ISSUE.PRESCRIPTION
  ].includes(primaryIssue)) return FACT_SENSITIVITY.MODERATE;

  return FACT_SENSITIVITY.MODERATE;
}

function detectRetrievalStrategy({ primaryIssue, exactAuthority, factSensitivity }) {
  if (exactAuthority?.detected) return RETRIEVAL_STRATEGY.EXACT_AUTHORITY;

  if (primaryIssue === PRIMARY_ISSUE.DEFINITION) return RETRIEVAL_STRATEGY.FOUNDATIONAL;

  if ([
    PRIMARY_ISSUE.COMPLIANCE,
    PRIMARY_ISSUE.PROCEDURAL,
    PRIMARY_ISSUE.PRESCRIPTION,
    PRIMARY_ISSUE.DISPUTE_RESOLUTION
  ].includes(primaryIssue)) return RETRIEVAL_STRATEGY.PROCEDURAL;

  if ([
    PRIMARY_ISSUE.CHARACTERIZATION,
    PRIMARY_ISSUE.EVIDENTIARY,
    PRIMARY_ISSUE.ACCOUNTING_TAX
  ].includes(primaryIssue)) return RETRIEVAL_STRATEGY.FACT_DRIVEN;

  if (primaryIssue === PRIMARY_ISSUE.CONSTITUTIONAL) return RETRIEVAL_STRATEGY.JURISPRUDENTIAL;

  if (factSensitivity === FACT_SENSITIVITY.HIGH) return RETRIEVAL_STRATEGY.FACT_DRIVEN;

  return RETRIEVAL_STRATEGY.MIXED;
}

function detectCaseRoleFilters(primaryIssue, subIssue, domains = []) {
  const filters = [];

  if (primaryIssue === PRIMARY_ISSUE.DEFINITION) filters.push("foundational", "definition", "scope");
  if (primaryIssue === PRIMARY_ISSUE.REFUND) filters.push("refund", "procedural", "substantiation");
  if (primaryIssue === PRIMARY_ISSUE.PRESCRIPTION) filters.push("prescription", "assessment", "collection", "period");
  if (primaryIssue === PRIMARY_ISSUE.EXEMPTION) filters.push("exemption", "strict interpretation", "tax exemption");
  if (primaryIssue === PRIMARY_ISSUE.WITHHOLDING) filters.push("withholding", "withholding agent", "timing");
  if (primaryIssue === PRIMARY_ISSUE.CHARACTERIZATION) filters.push("substance over form", "transaction characterization", "principal-agent", "economic substance");
  if (primaryIssue === PRIMARY_ISSUE.DISPUTE_RESOLUTION) filters.push("protest", "appeal", "CTA jurisdiction", "due process");
  if (primaryIssue === PRIMARY_ISSUE.CONSTITUTIONAL) filters.push("constitutional", "due process", "equal protection");

  if (domains.includes("VAT")) filters.push("VAT");
  if (domains.includes("INCOME_TAX")) filters.push("income tax");
  if (domains.includes("WITHHOLDING_TAX")) filters.push("withholding tax");

  return unique(filters);
}

function buildExcludedAuthorities(primaryIssue, subIssue, domains = []) {
  const exclusions = [];

  if (primaryIssue === PRIMARY_ISSUE.DEFINITION) {
    exclusions.push(
      "fact-specific refund cases unless they define the concept",
      "procedural cases unrelated to the definition",
      "secondary reviewer notes unless no primary source exists"
    );
  }

  if (domains.includes("VAT") && primaryIssue !== PRIMARY_ISSUE.REFUND) {
    exclusions.push("VAT refund cases unless the query involves Section 112 or input VAT refund");
  }

  if (primaryIssue !== PRIMARY_ISSUE.DISPUTE_RESOLUTION) {
    exclusions.push("procedural protest or CTA jurisdiction cases unless directly relevant");
  }

  if (primaryIssue !== PRIMARY_ISSUE.CHARACTERIZATION) {
    exclusions.push("transaction characterization cases unless directly relevant");
  }

  return unique(exclusions);
}

function detectMischaracterizationRisk(primaryIssue, subIssue, question = "") {
  const q = lower(question);

  if (primaryIssue === PRIMARY_ISSUE.CHARACTERIZATION) return "high";

  if (hasAny(q, [
    /\breimbursement\b/i,
    /\bpass[- ]through\b/i,
    /\bprincipal\b/i,
    /\bagent\b/i,
    /\bconcession\b/i,
    /\blease\b/i,
    /\bbundled\b/i,
    /\bpackage\b/i,
    /\beconomic substance\b/i,
    /\bsubstance over form\b/i,
    /\bdfs\b/i
  ])) return "high";

  if ([PRIMARY_ISSUE.EXEMPTION, PRIMARY_ISSUE.WITHHOLDING, PRIMARY_ISSUE.ACCOUNTING_TAX].includes(primaryIssue)) {
    return "moderate";
  }

  return "low";
}

function shouldRequireTransactionCharacterization(primaryIssue, question = "") {
  return (
    primaryIssue === PRIMARY_ISSUE.CHARACTERIZATION ||
    detectMischaracterizationRisk(primaryIssue, "", question) === "high"
  );
}

function shouldRequireFactPattern(primaryIssue, factSensitivity) {
  return (
    factSensitivity === FACT_SENSITIVITY.HIGH ||
    [
      PRIMARY_ISSUE.CHARACTERIZATION,
      PRIMARY_ISSUE.EVIDENTIARY,
      PRIMARY_ISSUE.ACCOUNTING_TAX,
      PRIMARY_ISSUE.DISPUTE_RESOLUTION
    ].includes(primaryIssue)
  );
}

function shouldRequireDoctrinalAnalysis(primaryIssue, question = "") {
  const q = lower(question);

  return (
    [
      PRIMARY_ISSUE.CONSTITUTIONAL,
      PRIMARY_ISSUE.DISPUTE_RESOLUTION,
      PRIMARY_ISSUE.PRESCRIPTION,
      PRIMARY_ISSUE.EXEMPTION,
      PRIMARY_ISSUE.CHARACTERIZATION
    ].includes(primaryIssue) ||
    /\bdoctrine\b|\bjurisprudence\b|\bcase\b|\bconflict\b|\bprevails\b|\bhierarchy\b/i.test(q)
  );
}

function shouldRunConflictCheck(primaryIssue, question = "") {
  const q = lower(question);

  return (
    /\bconflict\b|\bcontradict\b|\bprevails\b|\boverride\b|\bhierarchy\b|\bversus\b|\bvs\.?\b/i.test(q) ||
    [PRIMARY_ISSUE.CONSTITUTIONAL, PRIMARY_ISSUE.DISPUTE_RESOLUTION].includes(primaryIssue)
  );
}

function classifyTaxIssue(question = "") {
  const normalizedQuestion = normalizeText(question);
  const exactAuthority = detectExactAuthority(normalizedQuestion);
  const domains = detectTaxDomain(normalizedQuestion);
  const primaryIssue = detectPrimaryIssue(normalizedQuestion);
  const subIssue = detectSubIssue(normalizedQuestion, primaryIssue, domains);
  const queryIntent = detectQueryIntent(normalizedQuestion, primaryIssue);
  const keyTerms = buildKeyTerms({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domains,
    exactAuthority
  });

  const complexityFlag = detectComplexity({
    question: normalizedQuestion,
    primaryIssue,
    domains,
    keyTerms
  });

  const factSensitivity = detectFactSensitivity(primaryIssue, subIssue, normalizedQuestion);
  const retrievalStrategy = detectRetrievalStrategy({
    primaryIssue,
    exactAuthority,
    factSensitivity
  });

  const targetAuthorities = buildTargetAuthorities({
    primaryIssue,
    subIssue,
    domains,
    exactAuthority
  });

  const legalQuestionPresented = buildLegalQuestionPresented({
    question: normalizedQuestion,
    primaryIssue,
    subIssue,
    domains
  });

  const transactionCharacterizationRequired =
    shouldRequireTransactionCharacterization(primaryIssue, normalizedQuestion);

  const factPatternRequired =
    shouldRequireFactPattern(primaryIssue, factSensitivity);

  return {
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    originalQuery: question,
    normalizedQuery: normalizedQuestion,

    primaryIssue,
    subIssue,
    queryIntent,

    legalQuestionPresented,

    taxDomains: domains,

    targetAuthorities,

    keyTerms,

    complexityFlag,
    factSensitivity,
    retrievalStrategy,

    transactionCharacterizationRequired,
    factPatternRequired,
    doctrinalAnalysisRequired: shouldRequireDoctrinalAnalysis(primaryIssue, normalizedQuestion),
    potentialConflictCheck: shouldRunConflictCheck(primaryIssue, normalizedQuestion),

    caseRoleFilters: detectCaseRoleFilters(primaryIssue, subIssue, domains),
    excludedAuthorities: buildExcludedAuthorities(primaryIssue, subIssue, domains),
    mischaracterizationRisk: detectMischaracterizationRisk(primaryIssue, subIssue, normalizedQuestion),

    exactAuthority,

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressUnrelatedProceduralCases: primaryIssue !== PRIMARY_ISSUE.PROCEDURAL,
      suppressVatRefundCasesUnlessRefundIssue:
        domains.includes("VAT") && primaryIssue !== PRIMARY_ISSUE.REFUND,
      requirePrimaryAuthorityForDefinitions: primaryIssue === PRIMARY_ISSUE.DEFINITION,
      requireFactDisclosureBeforeConclusion: factPatternRequired,
      allowConflictLabelOnlyIfSameIssueAndOppositeHolding: true
    },

    downstreamRouting: {
      useRetrievalEngine: true,
      useRerankerEngine: true,
      useJurisprudenceEngine: shouldRequireDoctrinalAnalysis(primaryIssue, normalizedQuestion),
      useConflictEngine: shouldRunConflictCheck(primaryIssue, normalizedQuestion),
      useTransactionCharacterizationEngine: transactionCharacterizationRequired,
      useFactPatternEngine: factPatternRequired,
      useEvidenceEvaluationEngine: factPatternRequired || primaryIssue === PRIMARY_ISSUE.EVIDENTIARY,
      useAnswerRenderer: true
    }
  };
}

function buildIssueClassificationSearchQueries(classification = {}, maxQueries = 8) {
  const queries = [];

  if (classification.exactAuthority?.detected) {
    queries.push(classification.exactAuthority.reference);
  }

  queries.push(classification.normalizedQuery);

  for (const authorityGroup of Object.values(classification.targetAuthorities || {})) {
    if (Array.isArray(authorityGroup)) {
      for (const authority of authorityGroup) {
        queries.push(`${classification.legalQuestionPresented} ${authority}`);
      }
    }
  }

  for (const term of classification.keyTerms || []) {
    queries.push(`${classification.primaryIssue} ${classification.subIssue} ${term}`);
  }

  return unique(queries).slice(0, maxQueries);
}

function isIssueClassificationCompatibleWithDoc(classification = {}, doc = {}) {
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
    ]
      .filter(Boolean)
      .join(" ")
  );

  const keyTerms = classification.keyTerms || [];
  const domains = classification.taxDomains || [];

  const termHit = keyTerms.some((term) => haystack.includes(lower(term)));
  const domainHit = domains.some((domain) => haystack.includes(lower(domain.replace(/_/g, " "))));

  if (classification.primaryIssue === PRIMARY_ISSUE.DEFINITION) {
    if (haystack.includes("refund") && !classification.subIssue.includes("REFUND")) return false;
    if (haystack.includes("prescription") && !classification.subIssue.includes("PRESCRIPTION")) return false;
  }

  if (
    domains.includes("VAT") &&
    classification.primaryIssue !== PRIMARY_ISSUE.REFUND &&
    /\bvat refund\b|\bsection 112\b|\b120\+30\b|\bunutilized input vat\b/i.test(haystack)
  ) {
    return false;
  }

  return termHit || domainHit || classification.primaryIssue === PRIMARY_ISSUE.GENERAL_TAX;
}

function issueClassificationEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ISSUE_CLASSIFICATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    issueFirstRetrievalReady: true,
    jurisprudenceFilteringReady: true,
    conflictGateReady: true,
    transactionCharacterizationReady: true,
    factPatternReady: true
  };
}

export {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  PRIMARY_ISSUE,
  QUERY_INTENT,
  COMPLEXITY,
  FACT_SENSITIVITY,
  RETRIEVAL_STRATEGY,
  detectExactAuthority,
  detectTaxDomain,
  detectPrimaryIssue,
  detectSubIssue,
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc,
  issueClassificationEngineHealthCheck
};
