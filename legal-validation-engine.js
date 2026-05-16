// FILE: legal-validation-engine.js
"use strict";

/**
 * TINA Legal Validation Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Full ESM compatibility with patched authority-engine.js.
 * - Uses issueClassification, issueClassificationMatch, targetAuthorityMatch.
 * - Validates source sufficiency using controllingPrecedence.
 * - Blocks issue-mismatched authorities and vague conflict language.
 * - Complements patched RAG, retrieval, reranker, jurisprudence, doctrine,
 *   citation, source visibility, and final answer compliance engines.
 */

import { detectNamedLaw } from "./named-law-engine.js";

import {
  classifyAuthorityFromDocument,
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

const ENGINE_VERSION = "4.0.0";

const REQUIRED_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function tokenize(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s/%₱().:-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeLooseText(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\brevenue regulation[s]?\b/g, "rr")
    .replace(/\brevenue memorandum circular[s]?\b/g, "rmc")
    .replace(/\brevenue memorandum order[s]?\b/g, "rmo")
    .replace(/\brevenue audit memorandum order[s]?\b/g, "ramo")
    .replace(/[^\w\s/%₱().:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    ECONOMIC_SUBSTANCE_ANALYSIS: "ECONOMIC_SUBSTANCE"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    SUBSTANCE: "SUBSTANTIVE",
    PROCEDURE: "PROCEDURAL",
    PROOF: "EVIDENTIARY",
    EVIDENCE: "EVIDENTIARY",
    JURISDICTION: "JURISDICTIONAL",
    FACT: "FACTUAL",
    FACTS: "FACTUAL",
    CONTRACT: "CONTRACTUAL"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthorityType(type = "") {
  const raw = String(type || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    BIR_RULINGS: "BIR_RULING",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function normalizeIssueClassification(issueClassification = null, query = "") {
  const source = issueClassification || {};
  const fallbackIssues = detectIssueSignals(query).map(normalizeIssue);

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
    ...classifyIssueDimensions(query).map(normalizeDimension)
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...safeArray(source.targetAuthorities).map(normalizeAuthorityType),
    ...safeArray(source.target_authorities).map(normalizeAuthorityType)
  ]).filter(Boolean);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "LEGAL_VALIDATION_ISSUE_CLASSIFIED",
    targetAuthorities,
    raw: source
  };
}

function computeKeywordScore(query = "", text = "") {
  const queryTokens = tokenize(query);
  const textTokens = new Set(tokenize(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  let hits = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

function isStructuralLine(line = "") {
  const value = normalizeText(line);

  if (!value) return true;

  return [
    /^a\.\s*direct answer$/i,
    /^b\.\s*controlling legal basis$/i,
    /^c\.\s*supporting jurisprudence$/i,
    /^d\.\s*doctrinal status\s*\/\s*conflict analysis$/i,
    /^e\.\s*hierarchy analysis$/i,
    /^f\.\s*practical application$/i,
    /^\d+\.\s*direct answer$/i,
    /^\d+\.\s*legal basis$/i,
    /^\d+\.\s*supporting rules$/i,
    /^\d+\.\s*professional insight$/i,
    /^\d+\.\s*conflict flag$/i,
    /^\d+\.\s*sources$/i,
    /^issue$/i,
    /^applicable law(?:\s*\(.*\))?$/i,
    /^bir position$/i,
    /^court position$/i,
    /^legally defensible conclusion$/i,
    /^taxpayer risk assessment$/i,
    /^recommended action$/i,
    /^validated indexed sources$/i,
    /^sources:?$/i,
    /^source:?$/i,
    /^references:?$/i,
    /^conflict detected:\s*(yes|no)$/i,
    /^conflict type:/i,
    /^exact issue:/i,
    /^exact legal dimension:/i,
    /^controlling authority:/i,
    /^resolution basis:/i,
    /^recommended action:/i,
    /^source a:/i,
    /^source b:/i,
    /^distinction type:/i,
    /^\-\s*\[(constitution|statute|treaty|supreme court|cta en banc|court of appeals|cta division|rr|rmc|rmo|ramo|bir ruling|case|source)\]/i
  ].some((pattern) => pattern.test(value));
}

function looksLikeSourceBullet(line = "") {
  const value = normalizeText(line);

  return [
    /^\-\s*(ra|rr|rmc|rmo|ramo|bir ruling|g\.r\.|cta|ca-g\.r\.)/i,
    /^\d+\.\s*(ra|rr|rmc|rmo|ramo|bir ruling|g\.r\.|cta|ca-g\.r\.)/i
  ].some((pattern) => pattern.test(value));
}

function extractClaims(answerText = "") {
  return String(answerText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .filter((line) => !isStructuralLine(line))
    .filter((line) => !looksLikeSourceBullet(line))
    .filter((line) => normalizeText(line).length >= 18)
    .slice(0, 25);
}

function extractRaNumbers(text = "") {
  const value = normalizeLooseText(text);
  return unique(
    [...value.matchAll(/\bra\s*(\d{4,6})\b/g)].map((match) => match[1])
  );
}

function extractIssuanceRefs(text = "") {
  const value = normalizeLooseText(text);
  const refs = [];

  const patterns = [
    { type: "rr", regex: /\brr\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmc", regex: /\brmc\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmo", regex: /\brmo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "ramo", regex: /\bramo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g }
  ];

  for (const { type, regex } of patterns) {
    for (const match of value.matchAll(regex)) {
      refs.push(
        `${type}-${String(match[1]).replace(/^0+/, "")}-${normalizeYear(match[2])}`
      );
    }
  }

  return unique(refs);
}

function extractCourtRefs(text = "") {
  const value = normalizeText(text);
  const refs = [];

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    refs.push(`gr-${String(match[1]).toUpperCase()}`);
  }

  const ctaMatches = [
    ...value.matchAll(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/gi),
    ...value.matchAll(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/gi)
  ];

  for (const match of ctaMatches) {
    refs.push(`cta-${String(match[1]).toUpperCase()}`);
  }

  for (const match of value.matchAll(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    refs.push(`ca-${String(match[1]).toUpperCase()}`);
  }

  return unique(refs);
}

function extractNamedLawAnchors(text = "") {
  const value = normalizeLooseText(text);
  const detection = detectNamedLaw(text);
  const anchors = [];

  const knownAnchors = [
    "create law",
    "create act",
    "train law",
    "train act",
    "create more",
    "eopt",
    "ease of paying taxes",
    "nirc",
    "local government code",
    "tax code",
    "vat",
    "value added tax",
    "income tax",
    "withholding tax",
    "excise tax",
    "documentary stamp tax"
  ];

  for (const anchor of knownAnchors) {
    if (value.includes(anchor)) anchors.push(anchor);
  }

  if (detection?.bestMatch) {
    if (detection.bestMatch.shortTitle) anchors.push(normalizeLooseText(detection.bestMatch.shortTitle));
    if (detection.bestMatch.canonicalTitle) anchors.push(normalizeLooseText(detection.bestMatch.canonicalTitle));

    for (const alias of detection.bestMatch.aliases || []) {
      anchors.push(normalizeLooseText(alias));
    }

    for (const alias of detection.bestMatch.normalizedAliases || []) {
      anchors.push(normalizeLooseText(alias));
    }
  }

  return unique(anchors);
}

function getDocAuthorityType(item = {}) {
  const explicit =
    item.authorityType ||
    item.authority_type ||
    item.metadata?.authorityType ||
    "";

  if (explicit) return normalizeAuthorityType(explicit);

  if (typeof getAuthorityTypeForDoc === "function") {
    const inferred = getAuthorityTypeForDoc(item);
    if (inferred) return normalizeAuthorityType(inferred);
  }

  if (typeof classifyAuthorityFromDocument === "function") {
    const inferred = classifyAuthorityFromDocument({
      fileName: item.source_title || item.source || item.title || "",
      path: item.source_path || item.path || item.metadata?.path || "",
      text: item.text || item.content || item.excerpt || ""
    });

    if (inferred) return normalizeAuthorityType(inferred);
  }

  return "UNKNOWN";
}

function getDocAuthorityLevel(item = {}) {
  const explicit =
    item.authority_tier ||
    item.authorityTier ||
    item.authorityLevel ||
    item.authority_level ||
    item.metadata?.authorityLevel ||
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  if (typeof getAuthorityLevelForDoc === "function") {
    const inferred = getAuthorityLevelForDoc(item);
    if (Number.isFinite(Number(inferred))) return Number(inferred);
  }

  return AUTHORITY_LEVEL[getDocAuthorityType(item)] || 99;
}

function getDocControllingPrecedence(item = {}) {
  const explicit =
    item.controllingPrecedence ||
    item.controlling_precedence ||
    item.metadata?.controllingPrecedence ||
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  if (typeof getControllingPrecedenceForDoc === "function") {
    const inferred = getControllingPrecedenceForDoc(item);
    if (Number.isFinite(Number(inferred))) return Number(inferred);
  }

  return getDocAuthorityLevel(item) || 99;
}

function buildEvidenceText(item = {}) {
  return normalizeText(
    [
      item.text,
      item.content,
      item.excerpt,
      item.preview,
      item.source_title,
      item.sourceTitle,
      item.source,
      item.path,
      item.source_path,
      item.metadata?.path,
      item.section_label,
      item.metadata?.documentTitle,
      item.metadata?.originalSource,
      item.metadata?.originalFileName,
      item.metadata?.normalizedReference,
      item.normalizedReference,
      item.normalized_reference,
      item.doctrineLabel,
      item.doctrineApplicability,
      item.doctrineApplicabilityExplanation,
      ...(item.normalizedAliases || []),
      ...(item.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildEvidenceIdentity(item = {}) {
  const combinedText = buildEvidenceText(item);

  return {
    authorityType: getDocAuthorityType(item),
    authorityLevel: getDocAuthorityLevel(item),
    controllingPrecedence: getDocControllingPrecedence(item),
    raNumbers: extractRaNumbers(combinedText),
    issuanceRefs: extractIssuanceRefs(combinedText),
    courtRefs: extractCourtRefs(combinedText),
    namedLawAnchors: extractNamedLawAnchors(combinedText),
    text: combinedText
  };
}

function detectIssueSignals(text = "") {
  const value = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|excess input vat|unutilized input vat)\b/i.test(value), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|lease of goods|gross selling price|gross receipts|value-added tax|value added tax)\b/i.test(value), "VAT_LIABILITY");
  push(/\b(withholding|ewt|expanded withholding|cwt|fwt|final withholding)\b/i.test(value), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income)\b/i.test(value), "INCOME_TAX");
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|proof|evidence|burden of proof|supporting document)\b/i.test(value), "EVIDENTIARY");
  push(/\b(jurisdiction|deadline|filing|prescription|appeal|protest|assessment|loa|pan|fan|remedy|120\+30)\b/i.test(value), "PROCEDURAL");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(value), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|gross vs net|gross or net|economic substance|substance over form)\b/i.test(value), "TRANSACTION");
  push(/\b(pfrs|pas|afs|financial statements|audit|misstatement|working paper)\b/i.test(value), "AUDIT");

  return unique(issues);
}

function classifyIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|capital gains tax|documentary stamp tax|percentage tax|vatable|sales|revenue)\b/i.test(value), "SUBSTANTIVE");
  push(/\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|fld|return|form|remedy|120\+30)\b/i.test(value), "PROCEDURAL");
  push(/\b(invoice|receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(value), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|cta|court has no jurisdiction|condition precedent|exhaustion|120\+30|30-day)\b/i.test(value), "JURISDICTIONAL");
  push(/\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value), "TEMPORAL");
  push(/\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|implementing rule|regulation)\b/i.test(value), "ADMINISTRATIVE");
  push(/\b(facts|factual|depending on|case-to-case|actual|circumstances|transaction structure|documentation)\b/i.test(value), "FACTUAL");
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(value), "CONTRACTUAL");
  push(/\b(economic substance|substance over form|sham|simulation|business purpose)\b/i.test(value), "ECONOMIC_SUBSTANCE");

  return unique(dimensions.length ? dimensions : ["GENERAL"]);
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return true;
  if (a.includes("GENERAL") || b.includes("GENERAL")) return true;
  return a.some((item) => b.includes(item));
}

function issueOverlap(a = [], b = []) {
  if (!a.length || !b.length) return true;
  if (a.includes("GENERAL") || b.includes("GENERAL")) return true;
  return a.some((item) => b.includes(item));
}

function isVatRefundText(text = "") {
  const value = lower(text);
  return /\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|excess input vat|unutilized input vat)\b/i.test(value);
}

function isVatLiabilityText(text = "") {
  const value = lower(text);
  return /\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|lease of goods|gross selling price|gross receipts)\b/i.test(value);
}

function hasIssueMismatch(profile = {}, evidenceText = "") {
  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    isVatRefundText(evidenceText)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    isVatLiabilityText(evidenceText)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    (isVatRefundText(evidenceText) || isVatLiabilityText(evidenceText))
  ) {
    return true;
  }

  return false;
}

function targetAuthorityMatched(profile = {}, item = {}) {
  if (!safeArray(profile.targetAuthorities).length) return false;
  return profile.targetAuthorities.includes(getDocAuthorityType(item));
}

function getStructuredIssueClassificationMatch(item = {}, profile = {}, claim = "") {
  const existing = item.issueClassificationMatch;

  if (existing && typeof existing === "object") {
    return {
      ...existing,
      targetAuthorityMatch:
        existing.targetAuthorityMatch === true ||
        item.targetAuthorityMatch === true ||
        targetAuthorityMatched(profile, item),
      issueMismatch:
        existing.issueMismatch === true ||
        item.issueMismatch === true
    };
  }

  const evidenceText = buildEvidenceText(item);
  const docIssues = detectIssueSignals(evidenceText).map(normalizeIssue);
  const docDimensions = classifyIssueDimensions(evidenceText).map(normalizeDimension);
  const claimIssues = detectIssueSignals(claim).map(normalizeIssue);
  const queryIssues = unique([
    ...safeArray(profile.subIssues).map(normalizeIssue),
    ...claimIssues
  ]).filter(Boolean);

  const claimDimensions = classifyIssueDimensions(claim).map(normalizeDimension);
  const queryDimensions = unique([
    ...safeArray(profile.legalDimensions).map(normalizeDimension),
    ...claimDimensions
  ]).filter(Boolean);

  const issueMismatch =
    item.issueMismatch === true ||
    hasIssueMismatch(profile, evidenceText);

  const issueOverlapValue = issueOverlap(queryIssues, docIssues);
  const dimensionOverlap = dimensionsOverlap(queryDimensions, docDimensions);
  const targetAuthorityMatch =
    item.targetAuthorityMatch === true ||
    targetAuthorityMatched(profile, item);

  const matched =
    !issueMismatch &&
    (targetAuthorityMatch || issueOverlapValue || dimensionOverlap || !docIssues.length);

  return {
    matched,
    compatible: matched,
    issueOverlap: issueOverlapValue,
    dimensionOverlap,
    issueMismatch,
    targetAuthorityMatch,
    primaryIssue: profile.primaryIssue,
    subIssues: profile.subIssues,
    legalDimensions: profile.legalDimensions,
    retrievalStrategy: profile.retrievalStrategy,
    targetAuthorities: profile.targetAuthorities,
    docIssues,
    docDimensions,
    docAuthorityType: getDocAuthorityType(item)
  };
}

function scoreIdentityMatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  let bonus = 0;

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);
  const claimCourtRefs = extractCourtRefs(claim);
  const claimAnchors = extractNamedLawAnchors(claimText);

  for (const ra of claimRaNumbers) {
    if (identity.raNumbers.includes(ra)) bonus += 0.6;
  }

  for (const ref of claimIssuances) {
    if (identity.issuanceRefs.includes(ref)) bonus += 0.65;
  }

  for (const ref of claimCourtRefs) {
    if (identity.courtRefs.includes(ref)) bonus += 0.7;
  }

  for (const anchor of claimAnchors) {
    if (identity.namedLawAnchors.includes(anchor)) bonus += 0.25;
  }

  return Math.min(bonus, 1);
}

function penaltyForGenericMismatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimHasRa = extractRaNumbers(claimText).length > 0;
  const claimHasIssuance = extractIssuanceRefs(claimText).length > 0;
  const claimHasCourtRef = extractCourtRefs(claim).length > 0;
  const claimHasNamedLaw = extractNamedLawAnchors(claimText).length > 0;

  let penalty = 0;

  if (claimHasRa && identity.raNumbers.length === 0) penalty += 0.25;
  if (claimHasIssuance && identity.issuanceRefs.length === 0) penalty += 0.3;
  if (claimHasCourtRef && identity.courtRefs.length === 0) penalty += 0.35;
  if (claimHasNamedLaw && identity.namedLawAnchors.length === 0) penalty += 0.15;

  return Math.min(penalty, 0.6);
}

function computeIssueMatchScore(claim = "", item = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, claim);
  const evidenceText = buildEvidenceText(item);
  const match = getStructuredIssueClassificationMatch(item, profile, claim);

  if (match.issueMismatch) return 0;

  const claimDimensions = classifyIssueDimensions(claim);
  const evidenceDimensions = classifyIssueDimensions(evidenceText);

  let score = dimensionsOverlap(claimDimensions, evidenceDimensions) ? 0.22 : 0;

  const claimTokens = unique(tokenize(claim).filter((token) => token.length >= 4));
  const evidenceTokens = new Set(tokenize(evidenceText).filter((token) => token.length >= 4));

  if (claimTokens.length) {
    let hits = 0;

    for (const token of claimTokens) {
      if (evidenceTokens.has(token)) hits += 1;
    }

    score += Math.min(0.38, hits / claimTokens.length);
  }

  if (match.issueOverlap) score += 0.2;
  if (match.dimensionOverlap) score += 0.1;
  if (match.targetAuthorityMatch) score += 0.18;
  if (match.matched) score += 0.12;

  return Number(Math.max(0, Math.min(score, 1)).toFixed(4));
}

function computeAuthorityWeight(item = {}) {
  const type = normalizeAuthorityType(getDocAuthorityType(item));

  const weights = {
    CONSTITUTION: 0.36,
    STATUTE: 0.35,
    SUPREME_COURT: 0.34,
    RR: 0.3,
    TREATY: 0.25,
    RMC: 0.22,
    RMO: 0.19,
    RAMO: 0.18,
    BIR_RULING: 0.14,
    CTA_EN_BANC: 0.21,
    COURT_OF_APPEALS: 0.18,
    CTA_DIVISION: 0.16,
    LGU: 0.12,
    PFRS: 0.16,
    PAS: 0.16,
    PSA: 0.14,
    SECONDARY: 0,
    UNKNOWN: 0
  };

  return weights[type] ?? 0;
}

function computeLegalSupportScore(claim = "", item = {}, issueClassification = null) {
  const combinedText = buildEvidenceText(item);
  const match = getStructuredIssueClassificationMatch(
    item,
    normalizeIssueClassification(issueClassification, claim),
    claim
  );

  if (match.issueMismatch) return 0;

  const keywordScore = computeKeywordScore(claim, combinedText);
  const identityBonus = scoreIdentityMatch(claim, item);
  const issueScore = computeIssueMatchScore(claim, item, issueClassification);
  const authorityWeight = computeAuthorityWeight(item);
  const mismatchPenalty = penaltyForGenericMismatch(claim, item);
  const targetBonus = match.targetAuthorityMatch ? 0.12 : 0;
  const issueBonus = match.matched ? 0.1 : 0;

  return Number(
    Math.max(
      0,
      Math.min(
        keywordScore * 0.22 +
          identityBonus * 0.2 +
          issueScore * 0.34 +
          authorityWeight +
          targetBonus +
          issueBonus -
          mismatchPenalty,
        1
      )
    ).toFixed(4)
  );
}

function classifySupportStatus(score = 0, claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);
  const claimCourtRefs = extractCourtRefs(claim);

  const exactRaMatch =
    claimRaNumbers.length > 0 &&
    claimRaNumbers.some((ra) => identity.raNumbers.includes(ra));

  const exactIssuanceMatch =
    claimIssuances.length > 0 &&
    claimIssuances.some((ref) => identity.issuanceRefs.includes(ref));

  const exactCourtMatch =
    claimCourtRefs.length > 0 &&
    claimCourtRefs.some((ref) => identity.courtRefs.includes(ref));

  if ((exactRaMatch || exactIssuanceMatch || exactCourtMatch) && score >= 0.45) {
    return "supported";
  }

  if (score >= 0.72) return "supported";
  if (score >= 0.42) return "partial";

  return "unsupported";
}

function extractPrimaryAuthorityHints(text = "") {
  const normalized = normalizeLooseText(text);
  const namedLaw = detectNamedLaw(text);

  return {
    raNumbers: extractRaNumbers(normalized),
    issuanceRefs: extractIssuanceRefs(normalized),
    courtRefs: extractCourtRefs(text),
    namedLawAnchors: extractNamedLawAnchors(normalized),
    namedLaw
  };
}

function isStatutoryAuthorityType(type = "") {
  return ["CONSTITUTION", "STATUTE"].includes(normalizeAuthorityType(type));
}

function isCourtAuthorityType(type = "") {
  return [
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(normalizeAuthorityType(type));
}

function isAdministrativeAuthorityType(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(
    normalizeAuthorityType(type)
  );
}

function isControllingOrUsableAuthorityType(type = "") {
  return (
    isStatutoryAuthorityType(type) ||
    isAdministrativeAuthorityType(type) ||
    isCourtAuthorityType(type) ||
    ["TREATY", "LGU", "PFRS", "PAS", "PSA"].includes(normalizeAuthorityType(type))
  );
}

function hasPrimaryAuthorityEvidence(evidence = [], queryHints = {}) {
  const {
    raNumbers = [],
    namedLawAnchors = [],
    courtRefs = [],
    issuanceRefs = []
  } = queryHints;

  if (!evidence.length) return false;

  for (const item of evidence) {
    const identity = buildEvidenceIdentity(item);
    const authorityType = normalizeAuthorityType(identity.authorityType);

    const statuteRaMatch =
      authorityType === "STATUTE" &&
      raNumbers.length > 0 &&
      raNumbers.some((ra) => identity.raNumbers.includes(ra));

    if (statuteRaMatch) return true;

    const namedLawStatuteMatch =
      authorityType === "STATUTE" &&
      namedLawAnchors.length > 0 &&
      namedLawAnchors.some((anchor) => identity.namedLawAnchors.includes(anchor));

    if (namedLawStatuteMatch) return true;

    const courtMatch =
      isCourtAuthorityType(authorityType) &&
      courtRefs.length > 0 &&
      courtRefs.some((ref) => identity.courtRefs.includes(ref));

    if (courtMatch) return true;

    const issuanceMatch =
      isAdministrativeAuthorityType(authorityType) &&
      issuanceRefs.length > 0 &&
      issuanceRefs.some((ref) => identity.issuanceRefs.includes(ref));

    if (issuanceMatch) return true;

    if (
      authorityType === "CONSTITUTION" &&
      !raNumbers.length &&
      !namedLawAnchors.length &&
      !courtRefs.length &&
      !issuanceRefs.length
    ) {
      return true;
    }
  }

  return false;
}

function hasAtLeastOneControllingSource(evidence = []) {
  return evidence.some((item) =>
    isControllingOrUsableAuthorityType(getDocAuthorityType(item))
  );
}

function hasHighAuthoritySource(evidence = []) {
  return evidence.some((item) => {
    const type = normalizeAuthorityType(getDocAuthorityType(item));
    return ["CONSTITUTION", "STATUTE", "RR", "SUPREME_COURT"].includes(type);
  });
}

function hasOnlyWeakAuthority(evidence = []) {
  if (!evidence.length) return true;

  return evidence.every((item) => {
    const type = normalizeAuthorityType(getDocAuthorityType(item));
    return ["SECONDARY", "UNKNOWN", "BIR_RULING", "CTA_DIVISION", "LGU"].includes(type);
  });
}

function hasIssueMatchedEvidence(evidence = [], issueClassification = null, query = "") {
  const profile = normalizeIssueClassification(issueClassification, query);

  if (!evidence.length) return false;

  return evidence.some((item) => {
    const match = getStructuredIssueClassificationMatch(item, profile, query);
    return match.matched && !match.issueMismatch;
  });
}

function hasTargetAuthorityEvidence(evidence = [], issueClassification = null, query = "") {
  const profile = normalizeIssueClassification(issueClassification, query);

  if (!safeArray(profile.targetAuthorities).length) return false;

  return evidence.some((item) => {
    const match = getStructuredIssueClassificationMatch(item, profile, query);
    return match.targetAuthorityMatch && !match.issueMismatch;
  });
}

function answerHasAFStructure(answerText = "") {
  const value = String(answerText || "");

  return REQUIRED_AF_HEADINGS.every((heading) =>
    new RegExp(
      `(^|\\n)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    ).test(value)
  );
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);

  const hasExactIssue = Boolean(
    conflict.exactIssue ||
      conflict.sameIssueGate?.sameIssues?.length
  );

  const hasExactDimension = Boolean(
    conflict.exactLegalDimension ||
      conflict.sameIssueGate?.sameDimensions?.length ||
      conflict.legalDimension
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controllingSource
  );

  return (
    hasTrueConflict &&
    hasConflictType &&
    hasExactIssue &&
    hasExactDimension &&
    sameIssuePassed &&
    oppositeHoldingPassed &&
    hasResolution
  );
}

function answerHasVagueConflictYes(answerText = "", conflictMetadata = null) {
  if (conflictMetadataIsComplete(conflictMetadata)) return false;

  const value = String(answerText || "");

  const match =
    value.match(/D\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS([\s\S]*?)(?=\n\s*E\.\s*HIERARCHY ANALYSIS|$)/i) ||
    value.match(/(?:5\.\s*CONFLICT FLAG|###\s*Conflict flag)([\s\S]*?)(?=\n\s*(?:6\.|###|[A-F]\.)|$)/i);

  if (!match) return false;

  const body = normalizeText(match[1] || "");

  if (!/Conflict Detected:\s*YES/i.test(body)) return false;

  const hasReasoning =
    /(exact issue|exact legal dimension|controlling doctrine|controlling authority|resolution basis|why it controls|same-issue|opposite-holding|procedural|substantive|evidentiary|jurisdictional|temporal|factual|administrative)/i.test(body) &&
    body.length >= 250;

  return !hasReasoning;
}

function answerHasUnsupportedSpecifics(answerText = "", evidence = []) {
  const answerRefs = {
    raNumbers: extractRaNumbers(answerText),
    issuanceRefs: extractIssuanceRefs(answerText),
    courtRefs: extractCourtRefs(answerText)
  };

  const evidenceIdentity = evidence.reduce(
    (acc, item) => {
      const identity = buildEvidenceIdentity(item);
      acc.raNumbers.push(...identity.raNumbers);
      acc.issuanceRefs.push(...identity.issuanceRefs);
      acc.courtRefs.push(...identity.courtRefs);
      return acc;
    },
    { raNumbers: [], issuanceRefs: [], courtRefs: [] }
  );

  const evidenceRa = new Set(evidenceIdentity.raNumbers);
  const evidenceIssuances = new Set(evidenceIdentity.issuanceRefs);
  const evidenceCourts = new Set(evidenceIdentity.courtRefs);

  const unsupportedRa = answerRefs.raNumbers.filter((ref) => !evidenceRa.has(ref));
  const unsupportedIssuance = answerRefs.issuanceRefs.filter(
    (ref) => !evidenceIssuances.has(ref)
  );
  const unsupportedCourt = answerRefs.courtRefs.filter((ref) => !evidenceCourts.has(ref));

  return {
    hasUnsupportedSpecifics:
      unsupportedRa.length > 0 ||
      unsupportedIssuance.length > 0 ||
      unsupportedCourt.length > 0,
    unsupportedRa,
    unsupportedIssuance,
    unsupportedCourt
  };
}

function detectIssueMismatchRisk(query = "", evidence = [], issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, query);

  const evidenceMatches = evidence.map((item) =>
    getStructuredIssueClassificationMatch(item, profile, query)
  );

  const hasExplicitMismatch = evidenceMatches.some((item) => item.issueMismatch);
  const hasValidMatch = evidenceMatches.some((item) => item.matched && !item.issueMismatch);

  if (hasExplicitMismatch && !hasValidMatch) {
    return {
      hasIssueMismatchRisk: true,
      reason:
        "The evidence appears mismatched against the classified legal issue and no valid issue-matched authority was found."
    };
  }

  const queryIsVatLiability =
    profile.primaryIssue === "VAT_LIABILITY" || isVatLiabilityText(query);

  const queryIsVatRefund =
    profile.primaryIssue === "VAT_REFUND" || isVatRefundText(query);

  const evidenceTexts = evidence.map(buildEvidenceText);

  const allEvidenceLooksVatRefund =
    evidenceTexts.length > 0 &&
    evidenceTexts.every((text) => isVatRefundText(text) && !isVatLiabilityText(text));

  const allEvidenceLooksVatLiability =
    evidenceTexts.length > 0 &&
    evidenceTexts.every((text) => isVatLiabilityText(text) && !isVatRefundText(text));

  if (queryIsVatLiability && allEvidenceLooksVatRefund) {
    return {
      hasIssueMismatchRisk: true,
      reason:
        "The query appears to concern VAT liability/output VAT, but the evidence appears to consist only of VAT refund/procedural authorities."
    };
  }

  if (queryIsVatRefund && allEvidenceLooksVatLiability) {
    return {
      hasIssueMismatchRisk: true,
      reason:
        "The query appears to concern VAT refund/input VAT claim procedure, but the evidence appears to consist only of VAT liability authorities."
    };
  }

  return {
    hasIssueMismatchRisk: false,
    reason: null
  };
}

function getFinalScore(item = {}) {
  return Number(
    item.finalScore ||
      item.final_score ||
      item.rerankScore ||
      item.retrievalScore ||
      item.score ||
      item.similarity ||
      0
  );
}

export function buildClaimSupportMap(answerText = "", evidence = [], options = {}) {
  const issueClassification =
    options.issueClassification ||
    options.adaptiveContext?.issueClassification ||
    null;

  const claims = extractClaims(answerText);
  const profile = normalizeIssueClassification(issueClassification, answerText);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const issueClassificationMatch = getStructuredIssueClassificationMatch(item, profile, claim);
        const evidenceScore = computeLegalSupportScore(claim, item, profile);
        const issueScore = computeIssueMatchScore(claim, item, profile);
        const authorityType = getDocAuthorityType(item);
        const authorityLevel = getDocAuthorityLevel(item);
        const controllingPrecedence = getDocControllingPrecedence(item);

        return {
          claimText: claim,
          claim_text: claim,

          supportStatus: classifySupportStatus(evidenceScore, claim, item),
          support_status: classifySupportStatus(evidenceScore, claim, item),

          sourcePath:
            item.source_path ||
            item.path ||
            item.metadata?.path ||
            item.source ||
            null,
          source_path:
            item.source_path ||
            item.path ||
            item.metadata?.path ||
            item.source ||
            null,

          sourceTitle:
            item.source_title ||
            item.sourceTitle ||
            item.metadata?.documentTitle ||
            item.source ||
            null,
          source_title:
            item.source_title ||
            item.sourceTitle ||
            item.metadata?.documentTitle ||
            item.source ||
            null,

          vectorChunkId: item.vector_chunk_id || item.id || null,
          vector_chunk_id: item.vector_chunk_id || item.id || null,

          authorityTier:
            item.authority_tier ||
            item.authorityLevel ||
            item.authority_level ||
            item.metadata?.authorityLevel ||
            authorityLevel,
          authority_tier:
            item.authority_tier ||
            item.authorityLevel ||
            item.authority_level ||
            item.metadata?.authorityLevel ||
            authorityLevel,

          authorityType,
          authority_type: authorityType,
          authorityLevel,
          authority_level: authorityLevel,
          controllingPrecedence,
          controlling_precedence: controllingPrecedence,

          evidenceScore,
          evidence_score: evidenceScore,
          issueMatchScore: issueScore,
          issue_match_score: issueScore,

          issueClassificationMatch,
          targetAuthorityMatch: issueClassificationMatch.targetAuthorityMatch,
          issueMismatch: issueClassificationMatch.issueMismatch
        };
      })
      .filter((item) => !item.issueMismatch)
      .sort((a, b) => {
        const targetDiff =
          Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);

        if (targetDiff !== 0) return targetDiff;

        if (b.evidenceScore !== a.evidenceScore) {
          return b.evidenceScore - a.evidenceScore;
        }

        const precedenceDiff =
          Number(a.controllingPrecedence || 99) - Number(b.controllingPrecedence || 99);

        if (precedenceDiff !== 0) return precedenceDiff;

        return Number(a.authorityLevel || 99) - Number(b.authorityLevel || 99);
      });

    return (
      ranked[0] || {
        claimText: claim,
        claim_text: claim,
        supportStatus: "unsupported",
        support_status: "unsupported",
        sourcePath: null,
        source_path: null,
        sourceTitle: null,
        source_title: null,
        vectorChunkId: null,
        vector_chunk_id: null,
        authorityTier: null,
        authority_tier: null,
        authorityType: null,
        authority_type: null,
        authorityLevel: null,
        authority_level: null,
        controllingPrecedence: null,
        controlling_precedence: null,
        evidenceScore: 0,
        evidence_score: 0,
        issueMatchScore: 0,
        issue_match_score: 0,
        issueClassificationMatch: null,
        targetAuthorityMatch: false,
        issueMismatch: false
      }
    );
  });
}

export function validateEvidenceSufficiency({
  evidence = [],
  claimSupportMap = [],
  minEvidenceCount = 1,
  minSupportedClaims = 1,
  minTopScore = 0.25,
  query = "",
  requirePrimaryAuthority = false,
  answerText = "",
  issueClassification = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  jurisprudencePayload = null
}) {
  const profile = normalizeIssueClassification(issueClassification, query);

  const cleanEvidence = safeArray(evidence).filter((item) => {
    const match = getStructuredIssueClassificationMatch(item, profile, query);
    return !match.issueMismatch;
  });

  const supportedClaims = claimSupportMap.filter(
    (item) =>
      item.supportStatus === "supported" ||
      item.supportStatus === "partial" ||
      item.support_status === "supported" ||
      item.support_status === "partial"
  );

  const issueMatchedClaims = claimSupportMap.filter(
    (item) =>
      Number(item.issueMatchScore || item.issue_match_score || 0) >= 0.25 &&
      item.issueMismatch !== true
  );

  const topScore =
    cleanEvidence.length > 0
      ? Math.max(...cleanEvidence.map((item) => getFinalScore(item)))
      : 0;

  const queryHints = extractPrimaryAuthorityHints(query);
  const primaryAuthorityPresent = hasPrimaryAuthorityEvidence(cleanEvidence, queryHints);

  const hasIdentitySensitiveQuery =
    queryHints.raNumbers.length > 0 ||
    queryHints.namedLawAnchors.length > 0 ||
    queryHints.courtRefs.length > 0 ||
    queryHints.issuanceRefs.length > 0;

  const primaryAuthoritySatisfied =
    !requirePrimaryAuthority && !hasIdentitySensitiveQuery
      ? true
      : primaryAuthorityPresent;

  const hasControllingSource = hasAtLeastOneControllingSource(cleanEvidence);
  const highAuthorityPresent = hasHighAuthoritySource(cleanEvidence);
  const onlyWeakAuthority = hasOnlyWeakAuthority(cleanEvidence);
  const issueMatchedEvidencePresent = hasIssueMatchedEvidence(cleanEvidence, profile, query);
  const targetAuthorityEvidencePresent = hasTargetAuthorityEvidence(cleanEvidence, profile, query);

  const structureSatisfied = answerText ? answerHasAFStructure(answerText) : true;

  const conflictMetadata =
    conflict ||
    conflictReview ||
    hierarchyConflict ||
    jurisprudencePayload?.conflictReview ||
    jurisprudencePayload?.jurisprudenceConflict ||
    null;

  const vagueConflictYes = answerText
    ? answerHasVagueConflictYes(answerText, conflictMetadata)
    : false;

  const unsupportedSpecifics = answerText
    ? answerHasUnsupportedSpecifics(answerText, cleanEvidence)
    : {
        hasUnsupportedSpecifics: false,
        unsupportedRa: [],
        unsupportedIssuance: [],
        unsupportedCourt: []
      };

  const issueMismatchRisk = detectIssueMismatchRisk(query, cleanEvidence, profile);

  const issueMatchSatisfied =
    claimSupportMap.length === 0 ||
    issueMatchedClaims.length >= Math.min(1, claimSupportMap.length);

  const targetAuthoritySatisfied =
    !safeArray(profile.targetAuthorities).length ||
    targetAuthorityEvidencePresent ||
    issueMatchedEvidencePresent;

  const isSufficient =
    cleanEvidence.length >= minEvidenceCount &&
    supportedClaims.length >= minSupportedClaims &&
    topScore >= minTopScore &&
    primaryAuthoritySatisfied &&
    hasControllingSource &&
    !onlyWeakAuthority &&
    issueMatchSatisfied &&
    targetAuthoritySatisfied &&
    issueMatchedEvidencePresent &&
    !issueMismatchRisk.hasIssueMismatchRisk &&
    !vagueConflictYes &&
    !unsupportedSpecifics.hasUnsupportedSpecifics &&
    structureSatisfied;

  return {
    isSufficient,
    topScore,
    evidenceCount: cleanEvidence.length,
    originalEvidenceCount: safeArray(evidence).length,
    supportedClaimCount: supportedClaims.length,
    issueMatchedClaimCount: issueMatchedClaims.length,
    supportedClaims,
    issueMatchedClaims,
    queryHints,
    primaryAuthorityPresent,
    primaryAuthorityRequired:
      requirePrimaryAuthority || hasIdentitySensitiveQuery,
    hasControllingSource,
    highAuthorityPresent,
    onlyWeakAuthority,
    issueMatchedEvidencePresent,
    targetAuthorityEvidencePresent,
    targetAuthoritySatisfied,
    structureSatisfied,
    vagueConflictYes,
    unsupportedSpecifics,
    issueMismatchRisk,
    issueMatchSatisfied,
    conflictMetadataComplete: conflictMetadataIsComplete(conflictMetadata),
    issueClassification: profile,
    rejectionReasons: [
      cleanEvidence.length < minEvidenceCount ? "INSUFFICIENT_EVIDENCE_COUNT" : null,
      supportedClaims.length < minSupportedClaims ? "INSUFFICIENT_SUPPORTED_CLAIMS" : null,
      topScore < minTopScore ? "LOW_TOP_SCORE" : null,
      !primaryAuthoritySatisfied ? "PRIMARY_AUTHORITY_NOT_PRESENT" : null,
      !hasControllingSource ? "NO_CONTROLLING_OR_USABLE_AUTHORITY" : null,
      onlyWeakAuthority ? "ONLY_WEAK_AUTHORITY_AVAILABLE" : null,
      !issueMatchSatisfied ? "CLAIMS_NOT_ISSUE_MATCHED" : null,
      !issueMatchedEvidencePresent ? "NO_ISSUE_MATCHED_EVIDENCE" : null,
      !targetAuthoritySatisfied ? "TARGET_AUTHORITY_NOT_PRESENT" : null,
      issueMismatchRisk.hasIssueMismatchRisk ? "ISSUE_MISMATCH_RISK" : null,
      vagueConflictYes ? "VAGUE_CONFLICT_ANALYSIS" : null,
      unsupportedSpecifics.hasUnsupportedSpecifics ? "UNSUPPORTED_SPECIFIC_CITATION" : null,
      !structureSatisfied ? "MISSING_TINA_A_F_STRUCTURE" : null
    ].filter(Boolean)
  };
}

export function shouldRejectForWeakLegalBasis({
  validation,
  hasExactCitation = false
}) {
  if (!validation) return true;
  if (!validation.hasControllingSource) return true;
  if (validation.onlyWeakAuthority) return true;
  if (validation.issueMismatchRisk?.hasIssueMismatchRisk) return true;
  if (validation.vagueConflictYes) return true;
  if (validation.unsupportedSpecifics?.hasUnsupportedSpecifics) return true;
  if (validation.structureSatisfied === false) return true;
  if (validation.issueMatchedEvidencePresent === false) return true;
  if (validation.targetAuthoritySatisfied === false) return true;

  if (validation.primaryAuthorityRequired && !validation.primaryAuthorityPresent) {
    return true;
  }

  if (
    hasExactCitation &&
    validation.primaryAuthorityPresent &&
    !validation.issueMismatchRisk?.hasIssueMismatchRisk &&
    validation.issueMatchedEvidencePresent
  ) {
    return false;
  }

  return !validation.isSufficient;
}

export function buildNoSourceReply() {
  return [
    "A. DIRECT ANSWER",
    "TINA cannot give a legally reliable answer from the indexed knowledge base because no sufficient controlling or issue-matched authority was retrieved.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "No validated controlling legal basis was retrieved from the indexed sources. Verify the applicable NIRC provision, Revenue Regulation, BIR issuance, or controlling court authority.",
    "",
    "C. SUPPORTING JURISPRUDENCE",
    "No issue-relevant jurisprudence was validated. TINA should not cite unrelated cases merely because they mention the same tax type.",
    "",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "No doctrinal conflict can be determined because sufficient issue-matched authorities were not retrieved.",
    "",
    "E. HIERARCHY ANALYSIS",
    "No hierarchy conclusion can be made without a validated controlling source. Apply the Constitution, NIRC/statute, regulations, administrative issuances, and court doctrine in proper hierarchy after verification.",
    "",
    "F. PRACTICAL APPLICATION",
    "Verify against official BIR, NIRC, CTA, or Supreme Court sources before relying on the position for compliance, audit, protest, or litigation."
  ].join("\n");
}

export function legalValidationEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_LEGAL_VALIDATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsBridgeCompatible: false,
    authorityCompatible: true,
    namedLawCompatible: true,
    adaptiveCompatible: true,
    evidenceCompatible: true,
    structureCompatible: true,
    issueClassificationCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    controllingPrecedenceAware: true,
    conflictMetadataAware: true
  };
}

export {
  ENGINE_VERSION,
  REQUIRED_AF_HEADINGS,
  normalizeIssueClassification,
  conflictMetadataIsComplete
};

export default {
  ENGINE_VERSION,
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply,
  legalValidationEngineHealthCheck
};
