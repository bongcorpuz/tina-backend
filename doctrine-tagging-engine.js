// FILE: doctrine-tagging-engine.js
"use strict";

/**
 * TINA Enterprise Doctrine Tagging Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Uses issueClassification before doctrine selection.
 * - Blocks unrelated doctrines even if broad keywords overlap.
 * - Emits issueClassificationMatch and targetAuthorityMatch downstream.
 * - Removes CommonJS bridge for cleaner ESM compatibility.
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { analyzeConflictPair } from "./conflict-engine.js";

const ENGINE_VERSION = "4.0.0";

const DOCTRINE_LIBRARY = {
  SUBSTANCE_OVER_FORM: {
    label: "Substance Over Form",
    issueFamilies: ["TRANSACTION", "ECONOMIC_SUBSTANCE", "DOCTRINE"],
    dimensions: ["FACTUAL", "ECONOMIC_SUBSTANCE", "TRANSACTION"],
    aliases: [
      "substance over form",
      "economic substance",
      "real nature of the transaction",
      "true nature of the transaction",
      "real transaction",
      "substance controls over form"
    ],
    concepts: [
      "transaction should be judged by its real substance",
      "formal structure cannot defeat tax consequences",
      "sham arrangements should not control"
    ]
  },

  BUSINESS_PURPOSE_TEST: {
    label: "Business Purpose Test",
    issueFamilies: ["TRANSACTION", "ECONOMIC_SUBSTANCE", "DOCTRINE"],
    dimensions: ["FACTUAL", "ECONOMIC_SUBSTANCE"],
    aliases: [
      "business purpose",
      "business purpose test",
      "no real business activity",
      "legitimate business purpose",
      "valid business purpose"
    ],
    concepts: [
      "transaction must have a real business reason",
      "mere tax reduction is not enough",
      "lack of commercial purpose may indicate avoidance or evasion risk"
    ]
  },

  SIMULATION: {
    label: "Simulation of Transactions",
    issueFamilies: ["TRANSACTION", "ECONOMIC_SUBSTANCE", "DOCTRINE"],
    dimensions: ["FACTUAL", "ECONOMIC_SUBSTANCE"],
    aliases: [
      "simulation",
      "simulated transaction",
      "fictitious transaction",
      "sham transaction",
      "dummy corporation",
      "dummy entity",
      "no real business activity"
    ],
    concepts: [
      "transaction may be unreal or fictitious",
      "paper arrangement without real substance",
      "simulated acts may conceal true tax consequences"
    ]
  },

  FRAUD_INTENT: {
    label: "Fraud / Intent",
    issueFamilies: ["DOCTRINE", "ASSESSMENT", "INCOME_TAX"],
    dimensions: ["FACTUAL", "EVIDENTIARY"],
    aliases: [
      "fraud",
      "fraudulent intent",
      "intent to evade",
      "willful",
      "deliberate",
      "bad faith",
      "tax evasion"
    ],
    concepts: [
      "tax evasion requires wrongful intent or fraud",
      "willful attempt to evade tax is material",
      "bad faith may distinguish evasion from avoidance"
    ]
  },

  ECONOMIC_SUBSTANCE: {
    label: "Economic Substance",
    issueFamilies: ["TRANSACTION", "ECONOMIC_SUBSTANCE", "DOCTRINE"],
    dimensions: ["FACTUAL", "ECONOMIC_SUBSTANCE", "TRANSACTION"],
    aliases: [
      "economic substance",
      "real economic effect",
      "commercial reality",
      "no economic substance"
    ],
    concepts: [
      "arrangement must have meaningful economic consequences",
      "mere formal compliance may be insufficient"
    ]
  },

  TAX_AVOIDANCE_VS_EVASION: {
    label: "Tax Avoidance vs Tax Evasion",
    issueFamilies: ["DOCTRINE", "ASSESSMENT", "INCOME_TAX"],
    dimensions: ["FACTUAL", "EVIDENTIARY", "ECONOMIC_SUBSTANCE"],
    aliases: [
      "tax avoidance",
      "tax evasion",
      "distinguish tax avoidance and tax evasion",
      "avoidance versus evasion",
      "avoidance vs evasion"
    ],
    concepts: [
      "avoidance is generally legal",
      "evasion is generally illegal",
      "fraud, deceit, or sham may turn the arrangement into evasion"
    ]
  },

  VAT_NATURE: {
    label: "Nature of VAT",
    issueFamilies: ["VAT_LIABILITY"],
    dimensions: ["SUBSTANTIVE"],
    aliases: [
      "vat",
      "value-added tax",
      "value added tax",
      "indirect tax",
      "tax on sale of goods and services"
    ],
    concepts: [
      "vat is an indirect tax",
      "vat is imposed on sale, barter, exchange, or lease",
      "vat is borne by the end consumer"
    ]
  },

  VAT_REFUND_PROCEDURE: {
    label: "VAT Refund Procedure",
    issueFamilies: ["VAT_REFUND"],
    dimensions: ["PROCEDURAL", "JURISDICTIONAL", "EVIDENTIARY"],
    aliases: [
      "vat refund",
      "input vat refund",
      "tax credit certificate",
      "tcc",
      "120+30",
      "administrative claim",
      "judicial claim",
      "aichi",
      "san roque"
    ],
    concepts: [
      "vat refund claims require administrative and judicial timing compliance",
      "120+30 day rule may be jurisdictional",
      "vat refund substantiation and timing are procedural or jurisdictional"
    ]
  },

  VAT_SUBSTANTIATION: {
    label: "VAT Substantiation",
    issueFamilies: ["VAT_REFUND", "EVIDENTIARY"],
    dimensions: ["EVIDENTIARY"],
    aliases: [
      "substantiation",
      "invoice",
      "official receipt",
      "vat invoice",
      "vat official receipt",
      "seagate",
      "invoicing requirement"
    ],
    concepts: [
      "vat claims require proper invoicing and substantiation",
      "documentary evidence supports entitlement to vat treatment",
      "substantiation is evidentiary"
    ]
  },

  MUTUALITY_DOCTRINE: {
    label: "Mutuality Doctrine",
    issueFamilies: ["INCOME_TAX", "VAT_LIABILITY", "DOCTRINE"],
    dimensions: ["SUBSTANTIVE"],
    aliases: [
      "mutuality",
      "mutuality doctrine",
      "association dues",
      "condominium dues",
      "homeowners association dues",
      "membership dues",
      "first e-bank tower"
    ],
    concepts: [
      "no income arises where contributors and beneficiaries are the same",
      "association dues may be treated under mutuality principles",
      "collections held for common expenses may not constitute taxable income depending on facts and law"
    ]
  },

  PRINCIPAL_AGENT: {
    label: "Principal-Agent Doctrine / Gross vs Net Recognition",
    issueFamilies: ["TRANSACTION", "PRINCIPAL_AGENT", "PASS_THROUGH", "REIMBURSEMENT", "ACCOUNTING"],
    dimensions: ["TRANSACTION", "FACTUAL", "CONTRACTUAL"],
    aliases: [
      "principal agent",
      "principal vs agent",
      "gross vs net",
      "agent model",
      "principal model",
      "pass-through",
      "reimbursement",
      "concession",
      "bundled package"
    ],
    concepts: [
      "control before transfer supports principal treatment",
      "agent earns commission or net fee",
      "pass-through collections require evidence of agency or reimbursement arrangement"
    ]
  }
};

const ISSUE_DIMENSIONS = {
  SUBSTANTIVE: "SUBSTANTIVE",
  PROCEDURAL: "PROCEDURAL",
  EVIDENTIARY: "EVIDENTIARY",
  JURISDICTIONAL: "JURISDICTIONAL",
  TEMPORAL: "TEMPORAL",
  FACTUAL: "FACTUAL",
  ADMINISTRATIVE: "ADMINISTRATIVE",
  CONTRACTUAL: "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: "ECONOMIC_SUBSTANCE",
  AUDIT: "AUDIT",
  TRANSACTION: "TRANSACTION",
  GENERAL: "GENERAL"
};

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function tokenize(value = "") {
  return lower(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    PRINCIPAL_AGENT: "PRINCIPAL_AGENT",
    PRINCIPAL_VS_AGENT: "PRINCIPAL_AGENT",
    GROSS_NET: "PRINCIPAL_AGENT",
    PASS_THROUGH: "PASS_THROUGH",
    REIMBURSEMENT: "REIMBURSEMENT",
    AGREEMENT: "CONTRACT",
    ECONOMIC_SUBSTANCE_ANALYSIS: "ECONOMIC_SUBSTANCE"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ISSUE_DIMENSIONS[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULINGS: "BIR_RULING"
  };

  return aliases[raw] || raw || null;
}

function normalizeIssueClassification(issueClassification = null, question = "", adaptiveContext = {}) {
  const source =
    issueClassification ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.queryIntent?.issueClassification ||
    adaptiveContext?.responsePlan?.issueClassification ||
    {};

  const fallbackIssues = detectIssueSignals(question).map(normalizeIssue);

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    fallbackIssues[0] ||
    "GENERAL";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue),
    ...fallbackIssues
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(source.legalDimensions).map(normalizeDimension),
    ...safeArray(source.legalDimension).map(normalizeDimension),
    ...safeArray(source.legal_dimensions).map(normalizeDimension),
    ...safeArray(source.legal_dimension).map(normalizeDimension),
    ...classifyIssueDimensions(question).map(normalizeDimension)
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...safeArray(source.targetAuthorities).map(normalizeAuthority),
    ...safeArray(source.target_authorities).map(normalizeAuthority)
  ]).filter(Boolean);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "DOCTRINE_ISSUE_CLASSIFIED_SELECTION",
    targetAuthorities,
    raw: source
  };
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    null
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.title ||
    doc.sourceTitle ||
    doc.source_title ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    sourcePathOf(doc) ||
    "Unknown source"
  );
}

function authorityTypeOf(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc(doc) ||
    "UNKNOWN"
  );
}

function authorityLevelOf(doc = {}) {
  return Number(
    doc.authorityLevel ??
      doc.authority_level ??
      doc.metadata?.authorityLevel ??
      getAuthorityLevelForDoc(doc) ??
      99
  );
}

function controllingPrecedenceOf(doc = {}) {
  return Number(
    doc.controllingPrecedence ??
      doc.controlling_precedence ??
      doc.metadata?.controllingPrecedence ??
      getControllingPrecedenceForDoc(doc) ??
      authorityLevelOf(doc) ??
      99
  );
}

function doctrineEntries() {
  return Object.entries(DOCTRINE_LIBRARY);
}

function isCourtAuthority(type = "") {
  return [
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(String(type || "").toUpperCase());
}

function isLegalAuthority(doc = {}) {
  const type = authorityTypeOf(doc);
  return type !== "SECONDARY" && type !== "UNKNOWN";
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, value) => {
    if (condition) issues.push(value);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|tax credit certificate|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|vatable|subject to vat|value-added tax|value added tax|sale of goods|sale of services|gross receipts|gross selling price|nature of vat)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income)\b/i.test(q), "INCOME_TAX");
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|proof|evidence|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|deadline|filing|prescription|appeal|protest|assessment|loa|pan|fan|remedy|120\+30)\b/i.test(q), "PROCEDURAL");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal|agent|pass-through|pass through|reimbursement|reimbursable|bundled|gross vs net|gross or net)\b/i.test(q), "PRINCIPAL_AGENT");
  push(/\b(economic substance|substance over form|business purpose|sham|simulation|tax avoidance|tax evasion)\b/i.test(q), "ECONOMIC_SUBSTANCE");
  push(/\b(audit|afs|pfrs|pas|misstatement|working paper|financial statements)\b/i.test(q), "AUDIT");
  push(/\b(mutuality|association dues|condominium dues|membership dues|homeowners association)\b/i.test(q), "DOCTRINE");

  return unique(issues);
}

export function detectDoctrineIntent(question = "", issueClassification = null, adaptiveContext = {}) {
  const q = lower(question);
  const profile = normalizeIssueClassification(issueClassification, question, adaptiveContext);
  const matched = [];

  for (const [code, item] of doctrineEntries()) {
    const aliasHit = item.aliases.some((alias) => q.includes(lower(alias)));
    const conceptHit = item.concepts.some((concept) => q.includes(lower(concept)));
    const issueHit = item.issueFamilies.some((issue) => profile.subIssues.includes(normalizeIssue(issue)));

    if (aliasHit || conceptHit || issueHit) {
      matched.push({
        code,
        label: item.label
      });
    }
  }

  const explicitSignals = [
    "doctrine",
    "apply the doctrine",
    "legal doctrine",
    "business purpose test",
    "substance over form",
    "simulation",
    "economic substance",
    "fraud",
    "intent",
    "conflict",
    "doctrinal status",
    "doctrinal conflict",
    "supporting jurisprudence",
    "jurisprudence",
    "case doctrine",
    "principal vs agent",
    "mutuality doctrine"
  ];

  const isDoctrineFocused =
    matched.length > 0 ||
    explicitSignals.some((signal) => q.includes(signal)) ||
    ["DOCTRINE", "ECONOMIC_SUBSTANCE", "PRINCIPAL_AGENT", "TRANSACTION"].includes(profile.primaryIssue);

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    isDoctrineFocused,
    matchedDoctrineCodes: unique(matched.map((item) => item.code)),
    matchedDoctrineLabels: unique(matched.map((item) => item.label)),
    issueClassification: profile,
    plannerCompatibility: {
      requiresDoctrinalAnalysis: isDoctrineFocused,
      requiresConflictDisclosure: isDoctrineFocused,
      requiresHierarchyExplanation: isDoctrineFocused
    }
  };
}

function computePhraseHits(text = "", phrases = []) {
  const haystack = lower(text);
  let hits = 0;

  for (const phrase of phrases) {
    if (haystack.includes(lower(phrase))) hits += 1;
  }

  return hits;
}

function computeTokenOverlap(query = "", text = "") {
  const queryTokens = unique(tokenize(query)).filter((token) => token.length > 2);
  const textTokens = new Set(tokenize(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  let hits = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

function buildDocDoctrineText(doc = {}) {
  return [
    doc.text,
    doc.content,
    doc.excerpt,
    doc.preview,
    doc.source,
    doc.originalSource,
    doc.original_source,
    doc.path,
    doc.source_path,
    doc.metadata?.path,
    doc.metadata?.documentTitle,
    doc.metadata?.originalFileName,
    doc.metadata?.normalizedReference,
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases)
  ]
    .filter(Boolean)
    .join(" ");
}

function classifyIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|vat liability|vatable|percentage tax|capital gains tax)\b/i.test(value), ISSUE_DIMENSIONS.SUBSTANTIVE);
  push(/\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|fld|return|form|remedy|120\+30)\b/i.test(value), ISSUE_DIMENSIONS.PROCEDURAL);
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(value), ISSUE_DIMENSIONS.EVIDENTIARY);
  push(/\b(jurisdiction|jurisdictional|cta|court has no jurisdiction|condition precedent|exhaustion|120\+30|30-day)\b/i.test(value), ISSUE_DIMENSIONS.JURISDICTIONAL);
  push(/\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value), ISSUE_DIMENSIONS.TEMPORAL);
  push(/\b(facts|factual|depending on|case-to-case|actual|circumstances|evidence shows|transaction structure|actual practice)\b/i.test(value), ISSUE_DIMENSIONS.FACTUAL);
  push(/\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|implementing rule|regulation)\b/i.test(value), ISSUE_DIMENSIONS.ADMINISTRATIVE);
  push(/\b(contract|agreement|lease|concession|clause|termination|consideration|obligation|rights and obligations)\b/i.test(value), ISSUE_DIMENSIONS.CONTRACTUAL);
  push(/\b(economic substance|substance over form|business purpose|commercial reality|sham|simulation|tax avoidance|tax evasion)\b/i.test(value), ISSUE_DIMENSIONS.ECONOMIC_SUBSTANCE);
  push(/\b(principal|agent|pass-through|reimbursement|bundled|gross vs net|gross or net|control before transfer)\b/i.test(value), ISSUE_DIMENSIONS.TRANSACTION);
  push(/\b(audit|afs|pfrs|pas|working paper|misstatement|audit evidence|qualified opinion)\b/i.test(value), ISSUE_DIMENSIONS.AUDIT);

  return unique(dimensions.length ? dimensions : [ISSUE_DIMENSIONS.GENERAL]);
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return true;
  if (a.includes(ISSUE_DIMENSIONS.GENERAL) || b.includes(ISSUE_DIMENSIONS.GENERAL)) return true;
  return a.some((item) => b.includes(item));
}

function issueOverlap(a = [], b = []) {
  if (!a.length || !b.length) return true;
  if (a.includes("GENERAL") || b.includes("GENERAL")) return true;
  return a.some((item) => b.includes(item));
}

function hasVatLiabilitySignal(text = "") {
  return /\b(vat liability|output vat|vatable|subject to vat|sale of goods|sale of services|gross selling price|gross receipts|define vat|nature of vat)\b/i.test(
    lower(text)
  );
}

function hasVatRefundSignal(text = "") {
  return /\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tax credit certificate|tcc|unutilized input vat)\b/i.test(
    lower(text)
  );
}

function hasIssueMismatch(profile = {}, doc = {}, question = "") {
  const text = buildDocDoctrineText(doc);

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    hasVatRefundSignal(text) &&
    !hasVatRefundSignal(question)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    hasVatLiabilitySignal(text) &&
    !hasVatLiabilitySignal(question)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    (hasVatRefundSignal(text) || hasVatLiabilitySignal(text))
  ) {
    return true;
  }

  return false;
}

function doctrineCompatibleWithIssue(doctrineCode = "", profile = {}) {
  const doctrine = DOCTRINE_LIBRARY[doctrineCode];
  if (!doctrine) return false;

  if (profile.primaryIssue === "GENERAL") return true;

  return doctrine.issueFamilies.some((issue) =>
    safeArray(profile.subIssues).includes(normalizeIssue(issue))
  );
}

function targetAuthorityMatched(profile = {}, doc = {}) {
  if (!safeArray(profile.targetAuthorities).length) return false;
  return profile.targetAuthorities.includes(authorityTypeOf(doc));
}

function extractIssueTokens(text = "") {
  const stopWords = new Set([
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "from",
    "that",
    "this",
    "there",
    "their",
    "have",
    "been",
    "were",
    "will",
    "shall",
    "must",
    "case",
    "court",
    "supreme",
    "appeals",
    "tax",
    "taxes",
    "taxpayer",
    "commissioner",
    "internal",
    "revenue",
    "bir",
    "cir",
    "cta",
    "issue",
    "ruling",
    "doctrine",
    "explain",
    "analyze",
    "legal",
    "basis",
    "under",
    "value",
    "added"
  ]);

  return unique(
    tokenize(text).filter((token) => token.length >= 4 && !stopWords.has(token))
  );
}

function computeIssueApplicabilityScore(question = "", doc = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const text = buildDocDoctrineText(doc);
  const queryTokens = extractIssueTokens(question);
  const textTokens = new Set(extractIssueTokens(text));
  const queryDimensions = profile.legalDimensions.length
    ? profile.legalDimensions
    : classifyIssueDimensions(question);
  const docDimensions = classifyIssueDimensions(text);
  const docIssues = detectIssueSignals(text).map(normalizeIssue);

  let tokenHits = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token) || lower(text).includes(token)) tokenHits += 1;
  }

  const tokenOverlap = queryTokens.length ? tokenHits / queryTokens.length : 0;
  const dimensionHit = dimensionsOverlap(queryDimensions, docDimensions) ? 1 : 0;
  const issueHit = issueOverlap(profile.subIssues, docIssues) ? 1 : 0;
  const targetHit = targetAuthorityMatched(profile, doc) ? 1 : 0;

  let penalty = 0;

  if (hasIssueMismatch(profile, doc, question)) penalty += 0.6;

  return Math.max(
    0,
    Number(
      (
        tokenOverlap * 0.32 +
        dimensionHit * 0.24 +
        issueHit * 0.34 +
        targetHit * 0.1 -
        penalty
      ).toFixed(4)
    )
  );
}

function buildIssueClassificationMatch(question = "", doc = {}, issueClassification = null, doctrineCode = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const text = buildDocDoctrineText(doc);
  const docIssues = detectIssueSignals(text).map(normalizeIssue);
  const docDimensions = classifyIssueDimensions(text).map(normalizeDimension);
  const issueMismatch = hasIssueMismatch(profile, doc, question);
  const issueOverlapValue = issueOverlap(profile.subIssues, docIssues);
  const dimensionOverlap = dimensionsOverlap(profile.legalDimensions, docDimensions);
  const targetAuthorityMatch = targetAuthorityMatched(profile, doc);
  const doctrineIssueCompatible = doctrineCode
    ? doctrineCompatibleWithIssue(doctrineCode, profile)
    : true;

  const matched =
    !issueMismatch &&
    doctrineIssueCompatible &&
    (targetAuthorityMatch || issueOverlapValue || dimensionOverlap || !docIssues.length);

  return {
    matched,
    compatible: matched,
    issueOverlap: issueOverlapValue,
    dimensionOverlap,
    issueMismatch,
    targetAuthorityMatch,
    doctrineIssueCompatible,
    primaryIssue: profile.primaryIssue,
    subIssues: profile.subIssues,
    legalDimensions: profile.legalDimensions,
    retrievalStrategy: profile.retrievalStrategy,
    targetAuthorities: profile.targetAuthorities,
    docIssues,
    docDimensions,
    docAuthorityType: authorityTypeOf(doc),
    doctrineCode
  };
}

function classifyApplicability(question = "", doc = {}, issueClassification = null, doctrineCode = null) {
  const issueScore = computeIssueApplicabilityScore(question, doc, issueClassification);
  const match = buildIssueClassificationMatch(question, doc, issueClassification, doctrineCode);
  const type = authorityTypeOf(doc);

  if (match.issueMismatch || !match.doctrineIssueCompatible) {
    return {
      applicability: "NOT_ISSUE_MATCHED",
      explanation:
        "The doctrine or authority does not match the classified legal issue. It should not be cited as supporting authority."
    };
  }

  if (issueScore >= 0.6 && match.matched) {
    return {
      applicability: "DIRECTLY_APPLICABLE",
      explanation:
        "The authority addresses the same doctrine and the same classified legal issue or issue dimension raised by the question."
    };
  }

  if (issueScore >= 0.35 && match.matched) {
    return {
      applicability: "DISTINGUISHABLE_BUT_RELEVANT",
      explanation:
        "The authority is related but must be limited to its own factual, procedural, evidentiary, jurisdictional, temporal, administrative, contractual, economic-substance, audit, transaction, or substantive context."
    };
  }

  if (isCourtAuthority(type)) {
    return {
      applicability: "NOT_ISSUE_MATCHED",
      explanation:
        "The case may mention a related tax type or doctrine but does not sufficiently match the classified issue."
    };
  }

  return {
    applicability: "WEAK_SUPPORT",
    explanation:
      "The source has weak issue applicability and should be used, if at all, only as background support."
  };
}

function scoreDoctrineAgainstDoc(doctrineCode, doc = {}, question = "", issueClassification = null) {
  const doctrine = DOCTRINE_LIBRARY[doctrineCode];

  if (!doctrine) {
    return {
      doctrineCode,
      doctrineLabel: doctrineCode,
      score: 0,
      aliasHits: 0,
      conceptHits: 0,
      queryOverlap: 0,
      applicabilityScore: 0,
      applicability: "WEAK_SUPPORT",
      applicabilityExplanation: "Doctrine code is not in the doctrine library."
    };
  }

  const text = buildDocDoctrineText(doc);
  const aliasHits = computePhraseHits(text, doctrine.aliases);
  const conceptHits = computePhraseHits(text, doctrine.concepts);
  const queryOverlap = computeTokenOverlap(question, text);
  const applicabilityScore = computeIssueApplicabilityScore(question, doc, issueClassification);
  const applicability = classifyApplicability(question, doc, issueClassification, doctrineCode);
  const match = buildIssueClassificationMatch(question, doc, issueClassification, doctrineCode);

  const compatibilityPenalty =
    applicability.applicability === "NOT_ISSUE_MATCHED" ? 2.0 : 0;

  const score =
    aliasHits * 0.28 +
    conceptHits * 0.18 +
    queryOverlap * 0.12 +
    applicabilityScore * 0.42 -
    compatibilityPenalty;

  return {
    doctrineCode,
    doctrineLabel: doctrine.label,
    score: Number(Math.max(0, score).toFixed(4)),
    aliasHits,
    conceptHits,
    queryOverlap: Number(queryOverlap.toFixed(4)),
    applicabilityScore,
    applicability: applicability.applicability,
    applicabilityExplanation: applicability.explanation,
    issueClassificationMatch: match
  };
}

export function tagDoctrineCandidates({
  question = "",
  retrievedResults = [],
  limit = 8,
  issueClassification = null,
  adaptiveContext = {}
} = {}) {
  const profile = normalizeIssueClassification(issueClassification, question, adaptiveContext);
  const reranked = rerankByHierarchy(retrievedResults, question);
  const intent = detectDoctrineIntent(question, profile, adaptiveContext);

  const activeDoctrineCodes =
    intent.matchedDoctrineCodes.length > 0
      ? intent.matchedDoctrineCodes
      : doctrineEntries()
          .filter(([code]) => doctrineCompatibleWithIssue(code, profile))
          .map(([code]) => code);

  const tagged = reranked.map((doc) => {
    const doctrineScores = activeDoctrineCodes
      .map((code) => scoreDoctrineAgainstDoc(code, doc, question, profile))
      .sort((a, b) => b.score - a.score);

    const topDoctrine = doctrineScores[0] || null;
    const authorityLevel = authorityLevelOf(doc);
    const authorityBoost = isLegalAuthority(doc) ? Math.max(0, (100 - authorityLevel) / 100) : 0;
    const targetAuthorityMatch = targetAuthorityMatched(profile, doc);

    const semanticScore = Number(
      doc.rerankScore ??
        doc.retrievalScore ??
        doc.retrieval_score ??
        doc.finalScore ??
        doc.final_score ??
        doc.score ??
        doc.similarity ??
        0
    );

    return {
      ...doc,
      doctrineTags: doctrineScores.filter((item) => item.score > 0),
      topDoctrineCode: topDoctrine?.doctrineCode || null,
      topDoctrineLabel: topDoctrine?.doctrineLabel || null,
      doctrineScore: topDoctrine?.score || 0,
      doctrineApplicabilityScore: topDoctrine?.applicabilityScore || 0,
      doctrineApplicability: topDoctrine?.applicability || "WEAK_SUPPORT",
      doctrineApplicabilityExplanation:
        topDoctrine?.applicabilityExplanation ||
        "No doctrine applicability analysis was available.",
      issueClassificationMatch:
        topDoctrine?.issueClassificationMatch ||
        buildIssueClassificationMatch(question, doc, profile, topDoctrine?.doctrineCode),
      targetAuthorityMatch,
      doctrineFinalScore:
        semanticScore * 0.35 +
        Number(topDoctrine?.score || 0) * 35 * 0.38 +
        authorityBoost * 18 +
        (targetAuthorityMatch ? 20 : 0) -
        controllingPrecedenceOf(doc) * 0.2,
      doctrineTaggingMetadata: {
        engine: "TINA_DOCTRINE_TAGGING_ENGINE",
        version: ENGINE_VERSION,
        authorityType: authorityTypeOf(doc),
        authorityLevel,
        controllingPrecedence: controllingPrecedenceOf(doc),
        issueClassification: profile,
        issueClassificationAware: true,
        targetAuthorityAware: true,
        plannerCompatible: true,
        rendererCompatible: true
      }
    };
  });

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    intent,
    issueClassification: profile,
    candidates: tagged
      .filter((doc) => {
        if (doc.issueClassificationMatch?.issueMismatch) return false;
        if (!intent.isDoctrineFocused) return doc.issueClassificationMatch?.matched !== false;
        if (!doc.doctrineScore) return false;

        return ["DIRECTLY_APPLICABLE", "DISTINGUISHABLE_BUT_RELEVANT"].includes(
          doc.doctrineApplicability
        );
      })
      .sort((a, b) => {
        const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
        if (targetDiff !== 0) return targetDiff;

        const aPrecedence = controllingPrecedenceOf(a);
        const bPrecedence = controllingPrecedenceOf(b);
        if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

        return b.doctrineFinalScore - a.doctrineFinalScore;
      })
      .slice(0, limit)
  };
}

export function selectTopDoctrineAuthorities({
  question = "",
  retrievedResults = [],
  limit = 3,
  issueClassification = null,
  adaptiveContext = {}
} = {}) {
  const { intent, candidates, issueClassification: profile } = tagDoctrineCandidates({
    question,
    retrievedResults,
    limit: Math.max(limit * 3, 9),
    issueClassification,
    adaptiveContext
  });

  const top = candidates
    .filter((doc) => {
      if (doc.issueClassificationMatch?.issueMismatch) return false;
      if (!intent.isDoctrineFocused) return true;
      return doc.doctrineApplicability !== "NOT_ISSUE_MATCHED";
    })
    .slice(0, limit);

  return {
    intent,
    issueClassification: profile,
    topAuthorities: top.map((doc) => ({
      doctrineCode: doc.topDoctrineCode,
      doctrineLabel: doc.topDoctrineLabel,
      doctrineScore: doc.doctrineScore,
      doctrineApplicabilityScore: doc.doctrineApplicabilityScore,
      doctrineApplicability: doc.doctrineApplicability,
      doctrineApplicabilityExplanation: doc.doctrineApplicabilityExplanation,
      issueClassificationMatch: doc.issueClassificationMatch || null,
      targetAuthorityMatch: doc.targetAuthorityMatch === true,
      source: sourcePathOf(doc),
      title: sourceTitleOf(doc),
      authorityType: authorityTypeOf(doc),
      authorityLevel: authorityLevelOf(doc),
      controllingPrecedence: controllingPrecedenceOf(doc),
      excerpt: normalizeText(doc.text || doc.content || doc.excerpt || doc.preview || "").slice(0, 420)
    }))
  };
}

function buildDoctrineConflictReview(authorities = []) {
  if (!authorities.length || authorities.length < 2) {
    return "No conflict review available because fewer than two doctrine-tagged authorities were selected.";
  }

  const reviews = [];

  for (let i = 0; i < authorities.length; i += 1) {
    for (let j = i + 1; j < authorities.length; j += 1) {
      const a = authorities[i];
      const b = authorities[j];

      const review = analyzeConflictPair(
        {
          text: a.excerpt,
          source: a.title,
          path: a.source,
          authorityType: a.authorityType,
          authorityLevel: a.authorityLevel
        },
        {
          text: b.excerpt,
          source: b.title,
          path: b.source,
          authorityType: b.authorityType,
          authorityLevel: b.authorityLevel
        }
      );

      if (review?.conflict || review?.apparentConflict) reviews.push(review);
    }
  }

  if (!reviews.length) {
    return "No direct doctrinal conflict detected. Authorities addressing different substantive, procedural, evidentiary, jurisdictional, factual, temporal, administrative, contractual, economic-substance, audit, or transaction issues are distinguishable rather than conflicting.";
  }

  return reviews
    .slice(0, 3)
    .map((item, index) =>
      [
        `Conflict Review ${index + 1}:`,
        `Conflict: ${item.conflict ? "YES" : "NO"}`,
        `Conflict Type: ${item.conflictType || "N/A"}`,
        `Doctrinal Conflict: ${item.doctrinalConflict ? "YES" : "NO"}`,
        `Hierarchy Conflict: ${item.hierarchyConflict ? "YES" : "NO"}`,
        `Apparent Conflict Only: ${item.apparentConflict ? "YES" : "NO"}`,
        `Exact Issue: ${item.exactIssue || "Not determined"}`,
        `Exact Legal Dimension: ${item.exactLegalDimension || "Not determined"}`,
        `Distinction Type: ${item.distinctionType || "Not determined"}`,
        `Resolution Basis: ${item.resolutionBasis || item.reason || "Not determined"}`
      ].join("\n")
    )
    .join("\n\n");
}

export function buildDoctrineSummary({
  question = "",
  retrievedResults = [],
  limit = 3,
  issueClassification = null,
  adaptiveContext = {}
} = {}) {
  const { intent, topAuthorities, issueClassification: profile } = selectTopDoctrineAuthorities({
    question,
    retrievedResults,
    limit,
    issueClassification,
    adaptiveContext
  });

  const summary = topAuthorities.length
    ? topAuthorities
        .map((item, index) =>
          [
            `${index + 1}. ${item.doctrineLabel || "Untitled Doctrine"}`,
            `Source: ${item.title || item.source || "Unknown source"}`,
            `Authority: ${item.authorityType} (Level ${item.authorityLevel}; Precedence ${item.controllingPrecedence})`,
            `Target Authority Match: ${item.targetAuthorityMatch ? "YES" : "NO"}`,
            `Applicability: ${item.doctrineApplicability}`,
            `Applicability Analysis: ${item.doctrineApplicabilityExplanation}`,
            `Issue Applicability Score: ${item.doctrineApplicabilityScore}`,
            `Issue Classification Match: ${JSON.stringify(item.issueClassificationMatch || {})}`,
            `Excerpt: ${item.excerpt}`
          ].join("\n")
        )
        .join("\n\n")
    : "No strong issue-applicable doctrine-tagged authority found.";

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    intent,
    issueClassification: profile,
    topAuthorities,
    summary,
    conflictReview: buildDoctrineConflictReview(topAuthorities),
    plannerCompatibility: {
      requiresDoctrinalAnalysis: Boolean(topAuthorities.length),
      requiresConflictDisclosure: Boolean(topAuthorities.length),
      requiresHierarchyExplanation: Boolean(topAuthorities.length)
    },
    rendererCompatibility: {
      doctrinalStatusBlockRequired: true,
      hierarchyBlockRequired: Boolean(topAuthorities.length),
      limitationLanguageRecommended: !topAuthorities.length
    }
  };
}

export function buildDoctrinePrompt({
  question = "",
  doctrineSummary = "",
  conflictReview = "",
  issueClassification = null
} = {}) {
  return `
You are TINA, a Philippine tax research and compliance assistant.

CORE RULE:
Never merely tag a doctrine or enumerate cases.
Use only doctrines and authorities that match the classified legal issue.

ISSUE CLASSIFICATION:
${JSON.stringify(issueClassification || {}, null, 2)}

STRICT RULES:
1. Use only the doctrine-tagged indexed authorities below.
2. Do not invent doctrine names, holdings, legal tests, case names, dates, or citations.
3. Prefer higher-authority legal sources.
4. If doctrine support is weak, say so clearly.
5. Do not cite a doctrine or case merely because it mentions the same tax type.
6. For every doctrine or case used, explain:
   - legal issue addressed;
   - doctrine established;
   - why it applies or does not apply to the classified issue.
7. Do not fabricate doctrinal conflict.
8. Never output only "Conflict detected: YES."
9. Do not say "Conflict Detected: YES" unless conflict metadata confirms conflict === true, same issue, same legal dimension, and opposite holding.
10. If evidence is incomplete, use preliminary conclusion language.

MANDATORY OUTPUT FORMAT:

A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

QUESTION:
${question}

DOCTRINE-TAGGED AUTHORITIES:
${doctrineSummary}

CONFLICT REVIEW:
${conflictReview}
`.trim();
}

export async function maybeGenerateDoctrineAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null
} = {}) {
  const {
    intent,
    topAuthorities,
    summary,
    conflictReview,
    issueClassification: profile
  } = buildDoctrineSummary({
    question,
    retrievedResults,
    limit: 3,
    issueClassification,
    adaptiveContext
  });

  if (!intent.isDoctrineFocused) {
    return {
      handled: false,
      answer: "",
      intent,
      topAuthorities,
      responseMode,
      adaptiveContext,
      issueClassification: profile,
      engineVersion: ENGINE_VERSION
    };
  }

  if (!topAuthorities.length) {
    return {
      handled: true,
      answer:
        "A. DIRECT ANSWER\nI cannot find sufficient issue-applicable doctrine support in the uploaded knowledge base.\n\nB. CONTROLLING LEGAL BASIS\nNo controlling doctrine-tagged authority was retrieved from the indexed sources.\n\nC. SUPPORTING JURISPRUDENCE\nNo issue-applicable case was retrieved. TINA should not cite cases merely because they mention the same tax type.\n\nD. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo doctrinal conflict can be determined because no issue-applicable authority was retrieved.\n\nE. HIERARCHY ANALYSIS\nNo hierarchy analysis can be completed without a retrieved controlling authority.\n\nF. PRACTICAL APPLICATION\nVerify against the exact NIRC provision, BIR issuance, and Supreme Court or CTA authority before adopting a tax position.",
      intent,
      topAuthorities,
      responseMode,
      adaptiveContext,
      issueClassification: profile,
      engineVersion: ENGINE_VERSION
    };
  }

  const prompt = buildDoctrinePrompt({
    question,
    doctrineSummary: summary,
    conflictReview,
    issueClassification: profile
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Answer this doctrine-focused Philippine tax question strictly from the issue-applicable doctrine-tagged authorities:\n${question}`
      }
    ]
  });

  const answer =
    response.choices?.[0]?.message?.content?.trim() ||
    "A. DIRECT ANSWER\nI cannot find sufficient doctrine support in the uploaded knowledge base.\n\nB. CONTROLLING LEGAL BASIS\nNo controlling indexed authority was retrieved.\n\nC. SUPPORTING JURISPRUDENCE\nNo issue-applicable case was retrieved.\n\nD. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo doctrinal conflict can be determined.\n\nE. HIERARCHY ANALYSIS\nNo hierarchy analysis can be completed.\n\nF. PRACTICAL APPLICATION\nVerify against official legal sources before relying on the position.";

  return {
    handled: true,
    answer,
    intent,
    topAuthorities,
    responseMode,
    adaptiveContext,
    issueClassification: profile,
    engineVersion: ENGINE_VERSION
  };
}

export function doctrineTaggingHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    issueClassificationCompatible: true,
    targetAuthorityAware: true,
    unrelatedDoctrineBlocked: true
  };
}

export {
  DOCTRINE_LIBRARY,
  ISSUE_DIMENSIONS,
  ENGINE_VERSION
};

export default {
  detectDoctrineIntent,
  tagDoctrineCandidates,
  selectTopDoctrineAuthorities,
  buildDoctrineSummary,
  buildDoctrinePrompt,
  maybeGenerateDoctrineAnswer,
  doctrineTaggingHealthCheck,
  DOCTRINE_LIBRARY,
  ISSUE_DIMENSIONS,
  ENGINE_VERSION
};
