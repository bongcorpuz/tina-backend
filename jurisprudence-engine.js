// FILE: jurisprudence-engine.js
"use strict";

/**
 * TINA Enterprise Jurisprudence Intelligence Engine
 * Version: 4.1.0
 *
 * Purpose:
 * - Select only directly issue-relevant jurisprudence.
 * - Prevent citation dumping.
 * - Prevent unrelated VAT/tax cases from being injected into OpenAI.
 * - Return compact case summaries only.
 * - Support context-orchestration-engine.js.
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { analyzeConflictPair } from "./conflict-engine.js";
import { rerankForTina } from "./reranker-engine.js";

import {
  analyzeQueryIntent,
  ISSUE_TYPE,
  LEGAL_DIMENSION
} from "./query-intent-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

const ENGINE_VERSION = "4.1.0";

const MAX_CASES = 4;
const MAX_CASE_SUMMARY_CHARS = 900;
const MAX_EXCERPT_CHARS = 650;
const MAX_EXPLANATION_CHARS = 700;
const MAX_PROMPT_BLOCK_CHARS = 4500;

const COURT_AUTHORITY_TYPES = Object.freeze([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const APPLICABILITY_STATUS = Object.freeze({
  DIRECTLY_APPLICABLE: "DIRECTLY_APPLICABLE",
  PERSUASIVE_AUTHORITY: "PERSUASIVE_AUTHORITY",
  DISTINGUISHABLE_BUT_RELEVANT: "DISTINGUISHABLE_BUT_RELEVANT",
  BACKGROUND_ONLY: "BACKGROUND_ONLY",
  NOT_APPLICABLE_ISSUE_MISMATCH: "NOT_APPLICABLE_ISSUE_MISMATCH",
  NOT_APPLICABLE_ROLE_MISMATCH: "NOT_APPLICABLE_ROLE_MISMATCH"
});

const CASE_ROLE = Object.freeze({
  CONTROLLING: "CONTROLLING",
  PERSUASIVE: "PERSUASIVE",
  DISTINGUISHING: "DISTINGUISHING",
  BACKGROUND: "BACKGROUND",
  PROCEDURAL_ONLY: "PROCEDURAL_ONLY",
  EVIDENTIARY_ONLY: "EVIDENTIARY_ONLY",
  EXCLUDED: "EXCLUDED"
});

const LOCAL_ISSUE = Object.freeze({
  VAT_REFUND: ISSUE_TYPE?.VAT_REFUND || "VAT_REFUND",
  VAT_LIABILITY: ISSUE_TYPE?.VAT_LIABILITY || "VAT_LIABILITY",
  PROCEDURAL: ISSUE_TYPE?.PROCEDURAL || "PROCEDURAL",
  EVIDENTIARY: ISSUE_TYPE?.EVIDENTIARY || "EVIDENTIARY",
  JURISDICTIONAL: ISSUE_TYPE?.JURISDICTIONAL || "JURISDICTIONAL",
  ASSESSMENT: ISSUE_TYPE?.ASSESSMENT || "ASSESSMENT",
  WITHHOLDING_TAX: ISSUE_TYPE?.WITHHOLDING_TAX || ISSUE_TYPE?.WITHHOLDING || "WITHHOLDING",
  INCOME_TAX: ISSUE_TYPE?.INCOME_TAX || "INCOME_TAX",
  DOCTRINE: ISSUE_TYPE?.DOCTRINE || "DOCTRINE",
  TRANSACTION: ISSUE_TYPE?.TRANSACTION || "TRANSACTION",
  CONTRACT: ISSUE_TYPE?.CONTRACT || "CONTRACT",
  ACCOUNTING: ISSUE_TYPE?.ACCOUNTING || "ACCOUNTING",
  GENERAL: ISSUE_TYPE?.GENERAL_TAX || "GENERAL"
});

const LOCAL_DIMENSION = Object.freeze({
  SUBSTANTIVE: LEGAL_DIMENSION?.SUBSTANTIVE || "SUBSTANTIVE",
  PROCEDURAL: LEGAL_DIMENSION?.PROCEDURAL || "PROCEDURAL",
  EVIDENTIARY: LEGAL_DIMENSION?.EVIDENTIARY || "EVIDENTIARY",
  JURISDICTIONAL: LEGAL_DIMENSION?.JURISDICTIONAL || "JURISDICTIONAL",
  TEMPORAL: LEGAL_DIMENSION?.TEMPORAL || "TEMPORAL",
  FACTUAL: LEGAL_DIMENSION?.FACTUAL || "FACTUAL",
  CONTRACTUAL: LEGAL_DIMENSION?.CONTRACTUAL || "CONTRACTUAL",
  ECONOMIC_SUBSTANCE: LEGAL_DIMENSION?.ECONOMIC_SUBSTANCE || "ECONOMIC_SUBSTANCE",
  GENERAL: LEGAL_DIMENSION?.GENERAL || "GENERAL"
});

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function trimText(value = "", max = MAX_CASE_SUMMARY_CHARS) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function docText(doc = {}) {
  return normalizeText(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.title,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function sourcePathOf(doc = {}) {
  return (
    doc.url ||
    doc.sourceUrl ||
    doc.source_url ||
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    ""
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.title ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    sourcePathOf(doc) ||
    "Untitled Case"
  );
}

function sourceCitationOf(doc = {}) {
  return (
    doc.citation ||
    doc.reference ||
    doc.normalizedReference ||
    doc.metadata?.citation ||
    doc.metadata?.reference ||
    doc.metadata?.normalizedReference ||
    extractCaseReference(docText(doc)) ||
    extractCaseReference(sourceTitleOf(doc)) ||
    sourceTitleOf(doc)
  );
}

function isCourtAuthority(doc = {}) {
  return COURT_AUTHORITY_TYPES.includes(getAuthorityTypeForDoc(doc));
}

function extractCaseReference(text = "") {
  const value = normalizeText(text);

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) return `G.R. No. ${gr[1]}`;

  const cta =
    value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i);
  if (cta) return `CTA ${cta[1]}`;

  const ca = value.match(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (ca) return `CA-G.R. ${ca[1]}`;

  const caseName = value.match(
    /\b([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)\s+(?:v\.|vs\.?|versus)\s+([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)(?=[,.;?)]|\s+G\.?R\.?|\s+CTA|\s+CA-G\.?R\.?|$)/i
  );

  if (caseName) return normalizeText(`${caseName[1]} v. ${caseName[2]}`);

  return null;
}

function detectCaseIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(value), LOCAL_DIMENSION.SUBSTANTIVE);
  push(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(value), LOCAL_DIMENSION.PROCEDURAL);
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|supporting documents)\b/i.test(value), LOCAL_DIMENSION.EVIDENTIARY);
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(value), LOCAL_DIMENSION.JURISDICTIONAL);
  push(/\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(value), LOCAL_DIMENSION.TEMPORAL);
  push(/\b(transaction|actual circumstances|facts|factual|actual facts)\b/i.test(value), LOCAL_DIMENSION.FACTUAL);
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(value), LOCAL_DIMENSION.CONTRACTUAL);
  push(/\b(economic substance|substance over form|sham|simulation)\b/i.test(value), LOCAL_DIMENSION.ECONOMIC_SUBSTANCE);

  return unique(dimensions.length ? dimensions : [LOCAL_DIMENSION.GENERAL]);
}

function detectTaxIssueSignals(text = "") {
  const value = lower(text);
  const signals = [];

  const push = (condition, issue) => {
    if (condition) signals.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat|claim for refund)\b/i.test(value), LOCAL_ISSUE.VAT_REFUND);
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|define vat|value-added tax)\b/i.test(value), LOCAL_ISSUE.VAT_LIABILITY);
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|supporting document)\b/i.test(value), LOCAL_ISSUE.EVIDENTIARY);
  push(/\b(jurisdiction|jurisdictional|condition precedent|cta)\b/i.test(value), LOCAL_ISSUE.JURISDICTIONAL);
  push(/\b(assessment|loa|pan|fan|protest|appeal|prescription|deficiency tax)\b/i.test(value), LOCAL_ISSUE.ASSESSMENT);
  push(/\b(withholding|ewt|expanded withholding|cwt|fwt|withholding tax)\b/i.test(value), LOCAL_ISSUE.WITHHOLDING_TAX);
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income)\b/i.test(value), LOCAL_ISSUE.INCOME_TAX);
  push(/\b(substance over form|economic substance|tax avoidance|tax evasion|lifeblood doctrine|strictissimi juris|mutuality)\b/i.test(value), LOCAL_ISSUE.DOCTRINE);
  push(/\b(principal vs agent|principal and agent|gross or net|pass-through|pass through|reimbursement|reimbursable|bundled|package)\b/i.test(value), LOCAL_ISSUE.TRANSACTION);
  push(/\b(contract|agreement|lease agreement|concession agreement|clause)\b/i.test(value), LOCAL_ISSUE.CONTRACT);
  push(/\b(pfrs|pas|financial statements|afs|accounting treatment|recognition|presentation)\b/i.test(value), LOCAL_ISSUE.ACCOUNTING);

  return unique(signals.length ? signals : [LOCAL_ISSUE.GENERAL]);
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: LOCAL_ISSUE.VAT_LIABILITY,
    OUTPUT_VAT: LOCAL_ISSUE.VAT_LIABILITY,
    INPUT_VAT: LOCAL_ISSUE.VAT_REFUND,
    INPUT_VAT_REFUND: LOCAL_ISSUE.VAT_REFUND,
    TAX_REFUND: LOCAL_ISSUE.VAT_REFUND,
    REFUND: LOCAL_ISSUE.VAT_REFUND,
    PROCEDURE: LOCAL_ISSUE.PROCEDURAL,
    REMEDY: LOCAL_ISSUE.PROCEDURAL,
    REMEDIES: LOCAL_ISSUE.PROCEDURAL,
    SUBSTANTIATION: LOCAL_ISSUE.EVIDENTIARY,
    PROOF: LOCAL_ISSUE.EVIDENTIARY,
    EWT: LOCAL_ISSUE.WITHHOLDING_TAX,
    CWT: LOCAL_ISSUE.WITHHOLDING_TAX,
    FWT: LOCAL_ISSUE.WITHHOLDING_TAX,
    WITHHOLDING: LOCAL_ISSUE.WITHHOLDING_TAX,
    TAX_WITHHOLDING: LOCAL_ISSUE.WITHHOLDING_TAX,
    RCIT: LOCAL_ISSUE.INCOME_TAX,
    MCIT: LOCAL_ISSUE.INCOME_TAX,
    NOLCO: LOCAL_ISSUE.INCOME_TAX,
    PRINCIPAL_AGENT: LOCAL_ISSUE.TRANSACTION,
    GROSS_NET: LOCAL_ISSUE.TRANSACTION,
    PASS_THROUGH: LOCAL_ISSUE.TRANSACTION,
    REIMBURSEMENT: LOCAL_ISSUE.TRANSACTION,
    AGREEMENT: LOCAL_ISSUE.CONTRACT
  };

  if (aliases[raw]) return aliases[raw];

  const known = Object.values(LOCAL_ISSUE);
  if (known.includes(raw)) return raw;

  return null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const known = Object.values(LOCAL_DIMENSION);
  if (known.includes(raw)) return raw;
  return null;
}

function extractIssueProfile({ query = "", queryIntent = {}, adaptiveContext = {}, issueClassification = null } = {}) {
  const classification =
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    queryIntent?.issueClassification?.orchestrationClassification ||
    queryIntent?.issueClassification ||
    queryIntent?.classification ||
    queryIntent?.taxIssueClassification ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.classification ||
    adaptiveContext?.responsePlan?.issueClassification ||
    {};

  const detectedIssues = detectTaxIssueSignals(query);
  const detectedDimensions = detectCaseIssueDimensions(query);

  const primaryIssue =
    normalizeIssue(classification.primaryIssue) ||
    normalizeIssue(classification.primary_issue) ||
    normalizeIssue(queryIntent?.primaryIssue) ||
    normalizeIssue(queryIntent?.issueType) ||
    detectedIssues[0] ||
    LOCAL_ISSUE.GENERAL;

  const issueTypes = unique([
    primaryIssue,
    ...safeArray(classification.subIssue).map(normalizeIssue),
    ...safeArray(classification.subIssues).map(normalizeIssue),
    ...safeArray(queryIntent?.issueTypes).map(normalizeIssue),
    ...safeArray(queryIntent?.subIssue).map(normalizeIssue),
    ...safeArray(queryIntent?.subIssues).map(normalizeIssue),
    ...detectedIssues
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(classification.legalDimension).map(normalizeDimension),
    ...safeArray(classification.legalDimensions).map(normalizeDimension),
    ...safeArray(queryIntent?.legalDimensions).map(normalizeDimension),
    ...detectedDimensions
  ]).filter(Boolean);

  return {
    primaryIssue,
    issueTypes: issueTypes.length ? issueTypes : [LOCAL_ISSUE.GENERAL],
    legalDimensions: legalDimensions.length ? legalDimensions : [LOCAL_DIMENSION.GENERAL],
    retrievalStrategy:
      classification.retrievalStrategy ||
      classification.retrieval_strategy ||
      queryIntent?.retrievalStrategy ||
      "ISSUE_ROLE_APPLICABILITY_CASE_FILTER"
  };
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (queryIssues.includes(LOCAL_ISSUE.GENERAL) || docIssues.includes(LOCAL_ISSUE.GENERAL)) {
    return true;
  }

  return queryIssues.some((issue) => docIssues.includes(issue));
}

function hasDimensionOverlap(queryDimensions = [], docDimensions = []) {
  if (!queryDimensions.length || !docDimensions.length) return false;

  if (
    queryDimensions.includes(LOCAL_DIMENSION.GENERAL) ||
    docDimensions.includes(LOCAL_DIMENSION.GENERAL)
  ) {
    return true;
  }

  return queryDimensions.some((dimension) => docDimensions.includes(dimension));
}

function hasIssueMismatch(issueProfile = {}, doc = {}) {
  const queryIssues = safeArray(issueProfile.issueTypes);
  const docIssues = detectTaxIssueSignals(docText(doc));

  if (
    queryIssues.includes(LOCAL_ISSUE.VAT_LIABILITY) &&
    docIssues.includes(LOCAL_ISSUE.VAT_REFUND) &&
    !queryIssues.includes(LOCAL_ISSUE.VAT_REFUND)
  ) return true;

  if (
    queryIssues.includes(LOCAL_ISSUE.VAT_REFUND) &&
    docIssues.includes(LOCAL_ISSUE.VAT_LIABILITY) &&
    !queryIssues.includes(LOCAL_ISSUE.VAT_LIABILITY)
  ) return true;

  if (
    queryIssues.includes(LOCAL_ISSUE.WITHHOLDING_TAX) &&
    (docIssues.includes(LOCAL_ISSUE.VAT_REFUND) || docIssues.includes(LOCAL_ISSUE.VAT_LIABILITY)) &&
    !queryIssues.includes(LOCAL_ISSUE.VAT_LIABILITY)
  ) return true;

  if (
    queryIssues.includes(LOCAL_ISSUE.INCOME_TAX) &&
    docIssues.includes(LOCAL_ISSUE.VAT_REFUND) &&
    !queryIssues.includes(LOCAL_ISSUE.VAT_REFUND)
  ) return true;

  if (
    queryIssues.includes(LOCAL_ISSUE.CONTRACT) &&
    docIssues.includes(LOCAL_ISSUE.VAT_REFUND) &&
    !queryIssues.includes(LOCAL_ISSUE.VAT_REFUND)
  ) return true;

  return false;
}

function extractDoctrineSignals(text = "") {
  const value = lower(text);
  const doctrines = [];

  const push = (condition, doctrine) => {
    if (condition) doctrines.push(doctrine);
  };

  push(/\bsubstance over form\b/i.test(value), "SUBSTANCE_OVER_FORM");
  push(/\beconomic substance\b/i.test(value), "ECONOMIC_SUBSTANCE");
  push(/\bstrictissimi juris\b/i.test(value), "STRICTISSIMI_JURIS");
  push(/\bmutuality\b/i.test(value), "MUTUALITY_DOCTRINE");
  push(/\bbeneficial use\b/i.test(value), "BENEFICIAL_USE");
  push(/\bstrict interpretation\b/i.test(value), "STRICT_INTERPRETATION");
  push(/\blifeblood doctrine\b/i.test(value), "LIFEBLOOD_DOCTRINE");
  push(/\bclaim for refund\b/i.test(value), "TAX_REFUND_STRICT_PROOF");
  push(/\bburden of proof\b/i.test(value), "BURDEN_OF_PROOF");

  return unique(doctrines);
}

function classifyCaseRole({ issueProfile = {}, doc = {} } = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  const text = docText(doc);
  const docIssues = detectTaxIssueSignals(text);
  const docDimensions = detectCaseIssueDimensions(text);

  const issueMatch = hasIssueOverlap(issueProfile.issueTypes, docIssues);
  const dimensionMatch = hasDimensionOverlap(issueProfile.legalDimensions, docDimensions);
  const mismatch = hasIssueMismatch(issueProfile, doc);

  if (mismatch) return CASE_ROLE.EXCLUDED;

  if (authorityType === "SUPREME_COURT" && issueMatch && dimensionMatch) {
    return CASE_ROLE.CONTROLLING;
  }

  if (
    ["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(authorityType) &&
    issueMatch &&
    dimensionMatch
  ) {
    return CASE_ROLE.PERSUASIVE;
  }

  if (issueMatch && !dimensionMatch) {
    if (docDimensions.includes(LOCAL_DIMENSION.PROCEDURAL)) return CASE_ROLE.PROCEDURAL_ONLY;
    if (docDimensions.includes(LOCAL_DIMENSION.EVIDENTIARY)) return CASE_ROLE.EVIDENTIARY_ONLY;
    return CASE_ROLE.DISTINGUISHING;
  }

  if (!issueMatch && dimensionMatch) return CASE_ROLE.BACKGROUND;

  return CASE_ROLE.EXCLUDED;
}

function computeCaseApplicabilityScore({ query = "", queryIntent = null, issueProfile = null, doc = {} }) {
  const intent = queryIntent || analyzeQueryIntent(query);
  const profile =
    issueProfile ||
    extractIssueProfile({
      query,
      queryIntent: intent
    });

  const text = docText(doc);
  const docIssues = detectTaxIssueSignals(text);
  const docDimensions = detectCaseIssueDimensions(text);
  const role = classifyCaseRole({ issueProfile: profile, doc });

  let score = 0;

  for (const signal of profile.issueTypes) {
    if (docIssues.includes(signal)) score += 24;
  }

  if (docIssues.includes(profile.primaryIssue)) score += 30;

  for (const dimension of profile.legalDimensions) {
    if (docDimensions.includes(dimension)) score += 18;
  }

  if (hasIssueOverlap(profile.issueTypes, docIssues)) score += 18;
  if (hasDimensionOverlap(profile.legalDimensions, docDimensions)) score += 16;

  const doctrineHits = extractDoctrineSignals(query).filter((doctrine) =>
    extractDoctrineSignals(text).includes(doctrine)
  ).length;

  score += doctrineHits * 12;

  const queryTokens = lower(query)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 5);

  const docBlob = lower(text);

  for (const token of unique(queryTokens)) {
    if (docBlob.includes(token)) score += 1.5;
  }

  const type = getAuthorityTypeForDoc(doc);

  if (type === "SUPREME_COURT") score += 35;
  if (type === "CTA_EN_BANC") score += 20;
  if (type === "COURT_OF_APPEALS") score += 14;
  if (type === "CTA_DIVISION") score += 10;

  if (role === CASE_ROLE.CONTROLLING) score += 35;
  if (role === CASE_ROLE.PERSUASIVE) score += 24;
  if (role === CASE_ROLE.DISTINGUISHING) score += 8;
  if (role === CASE_ROLE.PROCEDURAL_ONLY) score -= 35;
  if (role === CASE_ROLE.EVIDENTIARY_ONLY) score -= 28;
  if (role === CASE_ROLE.BACKGROUND) score -= 60;
  if (role === CASE_ROLE.EXCLUDED) score -= 150;

  if (hasIssueMismatch(profile, doc)) score -= 200;

  const queryReference = extractCaseReference(query);

  if (queryReference) {
    const ref = lower(queryReference);

    if (lower(text).includes(ref) || lower(sourceTitleOf(doc)).includes(ref)) {
      score += 90;
    }
  }

  return Number(Math.max(0, score).toFixed(4));
}

function classifyApplicability(score = 0, issueProfile = {}, doc = {}) {
  const role = classifyCaseRole({ issueProfile, doc });

  if (role === CASE_ROLE.EXCLUDED || hasIssueMismatch(issueProfile, doc)) {
    return {
      status: APPLICABILITY_STATUS.NOT_APPLICABLE_ISSUE_MISMATCH,
      role,
      explanation:
        "The case addresses a different legal issue and should not be cited as supporting jurisprudence."
    };
  }

  if (role === CASE_ROLE.PROCEDURAL_ONLY || role === CASE_ROLE.EVIDENTIARY_ONLY) {
    return {
      status: APPLICABILITY_STATUS.NOT_APPLICABLE_ROLE_MISMATCH,
      role,
      explanation:
        "The case mentions a related tax type but resolves only a procedural or evidentiary point, not the controlling issue."
    };
  }

  if (role === CASE_ROLE.CONTROLLING && score >= 85) {
    return {
      status: APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,
      role,
      explanation:
        "The case directly matches the legal issue and legal dimension and comes from the highest applicable court authority."
    };
  }

  if (role === CASE_ROLE.PERSUASIVE && score >= 70) {
    return {
      status: APPLICABILITY_STATUS.PERSUASIVE_AUTHORITY,
      role,
      explanation:
        "The case matches the issue and legal dimension but is not the highest controlling authority."
    };
  }

  if (role === CASE_ROLE.DISTINGUISHING && score >= 55) {
    return {
      status: APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT,
      role,
      explanation:
        "The case is relevant but must be distinguished because it does not resolve the exact same legal dimension."
    };
  }

  return {
    status: APPLICABILITY_STATUS.BACKGROUND_ONLY,
    role,
    explanation:
      "The case is background only and should not be used as the primary legal basis."
  };
}

function enrichCaseMetadata({ query = "", queryIntent = null, issueProfile = null, doc = {} }) {
  const intent = queryIntent || analyzeQueryIntent(query);
  const profile =
    issueProfile ||
    extractIssueProfile({
      query,
      queryIntent: intent
    });

  const applicabilityScore = computeCaseApplicabilityScore({
    query,
    queryIntent: intent,
    issueProfile: profile,
    doc
  });

  const applicability = classifyApplicability(applicabilityScore, profile, doc);

  return {
    ...doc,
    caseReference: extractCaseReference(docText(doc)) || extractCaseReference(sourceTitleOf(doc)),
    caseRole: applicability.role,
    caseApplicabilityScore: applicabilityScore,
    caseApplicability: applicability.status,
    caseApplicabilityExplanation: applicability.explanation,
    caseIssueSignals: detectTaxIssueSignals(docText(doc)),
    caseLegalDimensions: detectCaseIssueDimensions(docText(doc)),
    doctrineSignals: extractDoctrineSignals(docText(doc)),
    issueProfileUsed: profile
  };
}

function sanitizeCaseSummary(doc = {}) {
  const text = docText(doc);

  return {
    title: trimText(sourceTitleOf(doc), 220),
    citation: trimText(sourceCitationOf(doc), 260),
    url: trimText(sourcePathOf(doc), 320),
    authorityType: getAuthorityTypeForDoc(doc),
    authorityLevel: getAuthorityLevelForDoc(doc),
    controllingPrecedence: getControllingPrecedenceForDoc(doc),

    caseReference:
      doc.caseReference ||
      extractCaseReference(text) ||
      extractCaseReference(sourceTitleOf(doc)) ||
      null,

    caseRole: doc.caseRole || CASE_ROLE.BACKGROUND,
    caseApplicability: doc.caseApplicability || APPLICABILITY_STATUS.BACKGROUND_ONLY,
    caseApplicabilityScore: Number(doc.caseApplicabilityScore || 0),
    caseApplicabilityExplanation: trimText(doc.caseApplicabilityExplanation, MAX_EXPLANATION_CHARS),

    issueSignals: safeArray(doc.caseIssueSignals || detectTaxIssueSignals(text)),
    legalDimensions: safeArray(doc.caseLegalDimensions || detectCaseIssueDimensions(text)),
    doctrineSignals: safeArray(doc.doctrineSignals || extractDoctrineSignals(text)),

    excerpt: trimText(
      doc.excerpt ||
        doc.preview ||
        doc.text ||
        doc.content ||
        "",
      MAX_EXCERPT_CHARS
    ),

    useInstruction:
      doc.caseApplicability === APPLICABILITY_STATUS.DIRECTLY_APPLICABLE ||
      doc.caseApplicability === APPLICABILITY_STATUS.PERSUASIVE_AUTHORITY
        ? "May be used as supporting jurisprudence if aligned with the final legal issue."
        : "Use only for distinction, not as controlling authority."
  };
}

function selectIssueRelevantJurisprudence({
  query = "",
  docs = [],
  limit = MAX_CASES,
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null,
  includeDistinguishable = false,
  includeBackground = false
} = {}) {
  const queryIntent = analyzeQueryIntent(query);

  const issueProfile =
    extractIssueProfile({
      query,
      queryIntent,
      adaptiveContext,
      issueClassification
    });

  const supersessionResult = applySupersessionFilter(docs);
  const activeDocs = supersessionResult.activeDocs || docs;

  const rerankedResult = rerankForTina({
    query,
    docs: rerankByHierarchy(activeDocs, query),
    limit: Math.max(limit * 5, 20),
    suppressIssueMismatch: true,
    suppressWeakSecondary: true,
    suppressSuperseded: true,
    responseMode,
    adaptiveContext,
    issueClassification: {
      primaryIssue: issueProfile.primaryIssue,
      subIssues: issueProfile.issueTypes,
      legalDimensions: issueProfile.legalDimensions,
      retrievalStrategy: issueProfile.retrievalStrategy
    }
  });

  const reranked = Array.isArray(rerankedResult?.results)
    ? rerankedResult.results
    : Array.isArray(rerankedResult)
      ? rerankedResult
      : [];

  const allowedApplicability = [
    APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,
    APPLICABILITY_STATUS.PERSUASIVE_AUTHORITY
  ];

  if (includeDistinguishable) {
    allowedApplicability.push(APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT);
  }

  if (includeBackground) {
    allowedApplicability.push(APPLICABILITY_STATUS.BACKGROUND_ONLY);
  }

  const selected = reranked
    .filter(isCourtAuthority)
    .map((doc) =>
      enrichCaseMetadata({
        query,
        queryIntent,
        issueProfile,
        doc
      })
    )
    .filter((doc) => allowedApplicability.includes(doc.caseApplicability))
    .filter((doc) => doc.caseRole !== CASE_ROLE.EXCLUDED)
    .filter((doc) => !hasIssueMismatch(issueProfile, doc))
    .sort((a, b) => {
      const rolePriority = {
        [CASE_ROLE.CONTROLLING]: 1,
        [CASE_ROLE.PERSUASIVE]: 2,
        [CASE_ROLE.DISTINGUISHING]: 3,
        [CASE_ROLE.BACKGROUND]: 4,
        [CASE_ROLE.PROCEDURAL_ONLY]: 5,
        [CASE_ROLE.EVIDENTIARY_ONLY]: 6,
        [CASE_ROLE.EXCLUDED]: 99
      };

      const aRole = rolePriority[a.caseRole] || 99;
      const bRole = rolePriority[b.caseRole] || 99;

      if (aRole !== bRole) return aRole - bRole;

      if (b.caseApplicabilityScore !== a.caseApplicabilityScore) {
        return b.caseApplicabilityScore - a.caseApplicabilityScore;
      }

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);

      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return getAuthorityLevelForDoc(a) - getAuthorityLevelForDoc(b);
    })
    .slice(0, Math.min(limit, MAX_CASES));

  return selected.map(sanitizeCaseSummary);
}

function buildNoJurisprudenceText() {
  return "No directly issue-relevant jurisprudence was retrieved. Do not cite unrelated cases merely because they mention the same tax type or keyword.";
}

function buildJurisprudenceApplicabilitySummary({ query = "", cases = [] } = {}) {
  if (!cases.length) return buildNoJurisprudenceText();

  return trimText(
    cases
      .map((doc, index) =>
        [
          `${index + 1}. ${doc.title || sourceTitleOf(doc)}`,
          `Authority: ${doc.authorityType || getAuthorityTypeForDoc(doc)}`,
          `Case Reference: ${doc.caseReference || "Not clearly extracted"}`,
          `Case Role: ${doc.caseRole || "Not classified"}`,
          `Applicability: ${doc.caseApplicability || "Not classified"}`,
          `Applicability Score: ${doc.caseApplicabilityScore || 0}`,
          `Applicability Analysis: ${doc.caseApplicabilityExplanation || ""}`,
          `Issue Signals: ${(doc.issueSignals || doc.caseIssueSignals || []).join(", ") || "N/A"}`,
          `Legal Dimensions: ${(doc.legalDimensions || doc.caseLegalDimensions || []).join(", ") || "N/A"}`,
          `Doctrine Signals: ${(doc.doctrineSignals || []).join(", ") || "N/A"}`,
          `Excerpt: ${trimText(doc.excerpt || doc.text || doc.content || "", MAX_EXCERPT_CHARS)}`
        ].join("\n")
      )
      .join("\n\n"),
    MAX_PROMPT_BLOCK_CHARS
  );
}

function sanitizeConflictReview(review = {}) {
  return {
    conflict: Boolean(review.conflict),
    apparentConflict: Boolean(review.apparentConflict),
    conflictType: review.conflictType || null,
    doctrinalConflict: Boolean(review.doctrinalConflict),
    hierarchyConflict: Boolean(review.hierarchyConflict),
    exactIssue: trimText(review.exactIssue, 300),
    distinctionType: trimText(review.distinctionType, 300),
    resolutionBasis: trimText(review.resolutionBasis || review.reason, 700)
  };
}

function analyzeJurisprudenceConflicts({ cases = [], supportingAuthorities = [] } = {}) {
  const docs = [...cases, ...supportingAuthorities].filter(Boolean);
  const reviews = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      try {
        const review = analyzeConflictPair(docs[i], docs[j]);

        if (review?.conflict || review?.apparentConflict) {
          reviews.push(sanitizeConflictReview(review));
        }
      } catch (error) {
        reviews.push({
          conflict: false,
          apparentConflict: false,
          error: trimText(error.message, 300)
        });
      }
    }
  }

  if (!reviews.length) {
    return {
      conflict: false,
      explanation:
        "No direct doctrinal conflict detected. Cases may address different substantive, procedural, evidentiary, jurisdictional, factual, contractual, or temporal issues and should be treated as distinguishable rather than conflicting.",
      reviews: []
    };
  }

  return {
    conflict: reviews.some((item) => item.conflict),
    explanation: trimText(
      reviews
        .slice(0, 3)
        .map((item, index) =>
          [
            `Conflict Review ${index + 1}:`,
            `Conflict Type: ${item.conflictType || "N/A"}`,
            `Doctrinal Conflict: ${item.doctrinalConflict ? "YES" : "NO"}`,
            `Hierarchy Conflict: ${item.hierarchyConflict ? "YES" : "NO"}`,
            `Apparent Conflict Only: ${item.apparentConflict ? "YES" : "NO"}`,
            `Exact Issue: ${item.exactIssue || "Not determined"}`,
            `Distinction Type: ${item.distinctionType || "Not determined"}`,
            `Resolution Basis: ${item.resolutionBasis || "Not determined"}`
          ].join("\n")
        )
        .join("\n\n"),
      MAX_PROMPT_BLOCK_CHARS
    ),
    reviews: reviews.slice(0, 3)
  };
}

function buildJurisprudencePromptBlock({
  query = "",
  cases = [],
  supportingAuthorities = []
} = {}) {
  const summary = buildJurisprudenceApplicabilitySummary({
    query,
    cases
  });

  const conflictReview = analyzeJurisprudenceConflicts({
    cases,
    supportingAuthorities
  });

  return trimText(
    [
      "JURISPRUDENCE APPLICABILITY REVIEW",
      summary,
      "",
      "JURISPRUDENCE CONFLICT REVIEW",
      conflictReview.explanation,
      "",
      "JURISPRUDENCE USE RULE",
      "Use DIRECTLY_APPLICABLE and PERSUASIVE_AUTHORITY cases as legal support. Use DISTINGUISHABLE_BUT_RELEVANT cases only to explain distinctions. Do not cite BACKGROUND_ONLY or issue-mismatched cases as controlling authority."
    ].join("\n"),
    MAX_PROMPT_BLOCK_CHARS
  );
}

function buildJurisprudencePayload({
  query = "",
  cases = [],
  supportingAuthorities = []
} = {}) {
  const cleanCases = safeArray(cases)
    .map((item) => {
      if (item?.caseApplicability && item?.title && item?.excerpt !== undefined) {
        return item;
      }
      return sanitizeCaseSummary(item);
    })
    .filter((item) =>
      [
        APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,
        APPLICABILITY_STATUS.PERSUASIVE_AUTHORITY,
        APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT
      ].includes(item.caseApplicability)
    )
    .slice(0, MAX_CASES);

  const conflictReview = analyzeJurisprudenceConflicts({
    cases: cleanCases,
    supportingAuthorities
  });

  return {
    engine: "TINA_JURISPRUDENCE_ENGINE",
    engineVersion: ENGINE_VERSION,
    query,

    cases: cleanCases,
    directlyRelevantCases: cleanCases,
    caseCount: cleanCases.length,

    jurisprudenceConflict: conflictReview.conflict,
    conflictReview,

    applicabilitySummary: buildJurisprudenceApplicabilitySummary({
      query,
      cases: cleanCases
    }),

    promptBlock: buildJurisprudencePromptBlock({
      query,
      cases: cleanCases,
      supportingAuthorities
    }),

    noJurisprudence: !cleanCases.length,

    contextOrchestrationSafe: true,
    directlyRelevantOnly: true,
    rawFullCaseInjectionPrevented: true,
    compactCaseSummaryOnly: true
  };
}

function jurisprudenceEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_JURISPRUDENCE_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    rerankerEngineCompatible: true,
    queryIntentEngineCompatible: true,
    supersessionCompatible: true,
    issueFilteringCompatible: true,
    caseRoleFilteringCompatible: true,
    applicabilityFilteringCompatible: true,
    contextOrchestrationCompatible: true,
    directlyRelevantOnly: true,
    compactCaseSummaryOnly: true,
    rawFullCaseInjectionPrevented: true,
    unrelatedTaxCaseSuppressionReady: true
  };
}

export {
  ENGINE_VERSION,
  APPLICABILITY_STATUS,
  CASE_ROLE,
  detectTaxIssueSignals,
  detectCaseIssueDimensions,
  classifyCaseRole,
  computeCaseApplicabilityScore,
  selectIssueRelevantJurisprudence,
  buildJurisprudenceApplicabilitySummary,
  analyzeJurisprudenceConflicts,
  buildJurisprudencePromptBlock,
  buildNoJurisprudenceText,
  buildJurisprudencePayload,
  jurisprudenceEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  APPLICABILITY_STATUS,
  CASE_ROLE,
  detectTaxIssueSignals,
  detectCaseIssueDimensions,
  classifyCaseRole,
  computeCaseApplicabilityScore,
  selectIssueRelevantJurisprudence,
  buildJurisprudenceApplicabilitySummary,
  analyzeJurisprudenceConflicts,
  buildJurisprudencePromptBlock,
  buildNoJurisprudenceText,
  buildJurisprudencePayload,
  jurisprudenceEngineHealthCheck
};
