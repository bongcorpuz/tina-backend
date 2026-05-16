// FILE: provision-citation-engine.js
"use strict";

/**
 * TINA Enterprise Provision Citation Engine
 * Version: 4.1.0
 *
 * Patch:
 * - Uses issueClassification to retrieve/rank exact NIRC/RR/RMC/RMO/RAMO provisions.
 * - Emits structured issueClassificationMatch for source/citation downstream.
 * - Emits targetAuthorityMatch consistently.
 * - Penalizes issue-mismatched provisions even if they share broad keywords.
 */

import {
  classifyAuthorityFromDocument,
  AUTHORITY_LEVEL,
  AUTHORITY_LABEL,
  normalizeLegalReference,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} from "./conflict-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

const ENGINE_VERSION = "4.1.0";

const PRIMARY_PROVISION_TYPES = Object.freeze([
  "CONSTITUTION",
  "STATUTE",
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

const COURT_TYPES = Object.freeze([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const AUTHORITY_ALIASES = Object.freeze({
  NIRC: "STATUTE",
  TAX_CODE: "STATUTE",
  LAW: "STATUTE",
  STATUTE: "STATUTE",
  REVENUE_REGULATION: "RR",
  REVENUE_REGULATIONS: "RR",
  REVENUE_MEMORANDUM_CIRCULAR: "RMC",
  REVENUE_MEMORANDUM_ORDER: "RMO",
  REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
  BIR_RULINGS: "BIR_RULING",
  SC: "SUPREME_COURT",
  CASE: "SUPREME_COURT",
  JURISPRUDENCE: "SUPREME_COURT",
  CTA: "CTA_DIVISION",
  IFRS: "PFRS"
});

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
    DEFINITION: "VAT_LIABILITY",
    CHARACTERIZATION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_") || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return AUTHORITY_ALIASES[raw] || raw || null;
}

function normalizeTargetAuthorities(targetAuthorities = null) {
  if (!targetAuthorities) return [];

  if (Array.isArray(targetAuthorities)) {
    return unique(targetAuthorities.map(normalizeAuthority).filter(Boolean));
  }

  if (typeof targetAuthorities === "object") {
    const output = [];

    for (const value of Object.values(targetAuthorities)) {
      for (const item of safeArray(value)) {
        const normalized = normalizeAuthority(item);
        if (normalized) output.push(normalized);
      }
    }

    return unique(output);
  }

  return [];
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
    ...safeArray(source.legal_dimension).map(normalizeDimension)
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...normalizeTargetAuthorities(source.targetAuthorities),
    ...normalizeTargetAuthorities(source.target_authorities)
  ]);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "PROVISION_ISSUE_CLASSIFIED_RETRIEVAL",
    targetAuthorities,
    raw: source
  };
}

function looksLikeProvisionQuestion(question = "") {
  const q = lower(question);

  return (
    /\b(section|sec\.?|article|art\.?|paragraph|para\.?|clause|provision|cite|citation|legal basis|basis|authority)\b/i.test(q) ||
    /\bunder\s+(the\s+)?(nirc|tax code|rr|rmc|rmo|ramo|republic act|ra|bir ruling)\b/i.test(q) ||
    /\b(rr|rmc|rmo|ramo)\s*(?:no\.?)?\s*\d+[-/_ ]+\d{2,4}\b/i.test(q) ||
    /\bwhat does\b/i.test(q)
  );
}

function extractProvisionHint(question = "") {
  const text = String(question || "");

  const sectionMatch =
    text.match(/\bsection\s+(\d+[a-zA-Z\-]*)/i) ||
    text.match(/\bsec\.?\s+(\d+[a-zA-Z\-]*)/i);

  if (sectionMatch) return `Section ${sectionMatch[1]}`;

  const articleMatch =
    text.match(/\barticle\s+([A-Za-z0-9\-]+)/i) ||
    text.match(/\bart\.?\s+([A-Za-z0-9\-]+)/i);

  if (articleMatch) return `Article ${articleMatch[1]}`;

  const paragraphMatch =
    text.match(/\bparagraph\s+([A-Za-z0-9().\-]+)/i) ||
    text.match(/\bpara\.?\s+([A-Za-z0-9().\-]+)/i);

  if (paragraphMatch) return `Paragraph ${paragraphMatch[1]}`;

  return "";
}

function buildSourceSnippet(doc = {}, maxLen = 1800) {
  return normalizeText(doc.text || doc.content || doc.excerpt || doc.preview || "").slice(0, maxLen);
}

function getAuthorityType(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc?.(doc) ||
    classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || doc.title || "",
      path: doc.path || doc.source_path || doc.metadata?.path || "",
      text: doc.text || doc.content || doc.excerpt || ""
    }) ||
    "UNKNOWN"
  );
}

function getAuthorityLevel(doc = {}) {
  return (
    Number(
      doc.authorityLevel ??
        doc.authority_level ??
        doc.metadata?.authorityLevel ??
        getAuthorityLevelForDoc?.(doc)
    ) ||
    AUTHORITY_LEVEL[getAuthorityType(doc)] ||
    99
  );
}

function getControllingPrecedence(doc = {}) {
  return (
    Number(
      doc.controllingPrecedence ??
        doc.controlling_precedence ??
        doc.metadata?.controllingPrecedence ??
        getControllingPrecedenceForDoc?.(doc)
    ) || 99
  );
}

function getSourceTitle(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.title ||
    "Unknown Source"
  );
}

function getSourcePath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.metadata?.fileName ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    getSourceTitle(doc) ||
    "Unknown Path"
  );
}

function getDocBlob(doc = {}) {
  return lower(
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
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      ...safeArray(doc.normalizedAliases),
      ...safeArray(doc.normalized_aliases),
      ...safeArray(doc.metadata?.normalizedAliases)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isCourtAuthority(type = "") {
  return COURT_TYPES.includes(String(type || "").toUpperCase());
}

function isBIRAuthority(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(String(type || "").toUpperCase());
}

function isPrimaryOrControllingAuthority(type = "") {
  return [...PRIMARY_PROVISION_TYPES, ...COURT_TYPES].includes(String(type || "").toUpperCase());
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, value) => {
    if (condition) issues.push(value);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|value-added tax)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|records|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(filing|deadline|protest|appeal|assessment|loa|pan|fan|prescription|remedy)\b/i.test(q), "PROCEDURAL");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|gross income|taxable income)\b/i.test(q), "INCOME_TAX");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(pfrs|pas|afs|financial statements|recognition|presentation|measurement)\b/i.test(q), "ACCOUNTING");

  return unique(issues);
}

function detectLegalDimensions(text = "") {
  const q = lower(text);
  const dimensions = [];

  const push = (condition, value) => {
    if (condition) dimensions.push(value);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(q), "SUBSTANTIVE");
  push(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(q), "PROCEDURAL");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|supporting documents)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(q), "JURISDICTIONAL");
  push(/\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(q), "TEMPORAL");
  push(/\b(transaction|actual circumstances|facts|factual|actual facts)\b/i.test(q), "FACTUAL");
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(q), "CONTRACTUAL");
  push(/\b(economic substance|substance over form|sham|simulation)\b/i.test(q), "ECONOMIC_SUBSTANCE");

  return unique(dimensions.length ? dimensions : ["GENERAL"]);
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function hasDimensionOverlap(queryDimensions = [], docDimensions = []) {
  if (!queryDimensions.length || queryDimensions.includes("GENERAL")) return true;
  if (!docDimensions.length || docDimensions.includes("GENERAL")) return true;
  return queryDimensions.some((dimension) => docDimensions.includes(dimension));
}

function hasIssueMismatch(issueClassification = {}, doc = {}, question = "") {
  const profile = normalizeIssueClassification(issueClassification, question);
  const docIssues = detectIssueSignals(getDocBlob(doc)).map(normalizeIssue);

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    docIssues.includes("VAT_LIABILITY") &&
    !profile.subIssues.includes("VAT_LIABILITY")
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    (docIssues.includes("VAT_REFUND") || docIssues.includes("VAT_LIABILITY"))
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "INCOME_TAX" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  return false;
}

function targetAuthorityMatched(profile = {}, doc = {}) {
  const authorityType = getAuthorityType(doc);
  return safeArray(profile.targetAuthorities).includes(authorityType);
}

function buildStructuredIssueClassificationMatch(question = "", doc = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const docIssues = detectIssueSignals(getDocBlob(doc)).map(normalizeIssue);
  const docDimensions = detectLegalDimensions(getDocBlob(doc)).map(normalizeDimension);
  const queryIssues = safeArray(profile.subIssues).map(normalizeIssue).filter(Boolean);
  const queryDimensions = safeArray(profile.legalDimensions).map(normalizeDimension).filter(Boolean);

  const issueMismatch = hasIssueMismatch(profile, doc, question);
  const issueOverlap = hasIssueOverlap(queryIssues, docIssues);
  const dimensionOverlap = hasDimensionOverlap(queryDimensions, docDimensions);
  const targetAuthorityMatch = targetAuthorityMatched(profile, doc);

  const matched =
    !issueMismatch &&
    (
      targetAuthorityMatch ||
      (issueOverlap && dimensionOverlap) ||
      !docIssues.length
    );

  return {
    matched,
    compatible: matched,
    issueOverlap,
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
    docAuthorityType: getAuthorityType(doc)
  };
}

function buildProvisionMatchBonus(question = "", doc = {}) {
  const hint = extractProvisionHint(question);
  const rawText = getDocBlob(doc);

  let bonus = 0;

  if (hint && rawText.includes(lower(hint))) bonus += 80;

  const citationIntent = normalizeLegalReference(question);

  if (citationIntent?.normalized) {
    const normalizedNeedle = lower(citationIntent.normalized);

    if (rawText.includes(normalizedNeedle)) bonus += 120;

    const aliasHit = safeArray(citationIntent.aliases).some((alias) =>
      rawText.includes(lower(alias))
    );

    if (aliasHit) bonus += 70;
  }

  if (/\b(section|sec\.?|article|art\.?|paragraph|clause)\b/i.test(question)) bonus += 12;

  return bonus;
}

function buildIssueClassificationBonus(question = "", doc = {}, issueClassification = null) {
  const profile = normalizeIssueClassification(issueClassification, question);
  const match = buildStructuredIssueClassificationMatch(question, doc, profile);
  const authorityType = getAuthorityType(doc);

  let bonus = 0;

  if (match.issueMismatch) bonus -= 150;
  if (match.issueOverlap) bonus += 75;
  if (match.dimensionOverlap) bonus += 20;
  if (match.targetAuthorityMatch) bonus += 50;
  if (PRIMARY_PROVISION_TYPES.includes(authorityType)) bonus += 25;

  return bonus;
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    const key =
      doc.id ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      getSourcePath(doc) ||
      getSourceTitle(doc);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function rankProvisionDocs(results = [], question = "", options = {}) {
  const {
    suppressIssueMismatch = true,
    issueClassification = null
  } = options;

  const profile = normalizeIssueClassification(issueClassification, question);

  const supersessionResult = applySupersessionFilter(results || []);
  const activeDocs =
    supersessionResult?.activeDocs?.length > 0 ? supersessionResult.activeDocs : results || [];

  return uniqueDocs(activeDocs)
    .filter((doc) => {
      const type = getAuthorityType(doc);
      if (!isPrimaryOrControllingAuthority(type)) return false;

      const match = buildStructuredIssueClassificationMatch(question, doc, profile);

      if (suppressIssueMismatch && match.issueMismatch) return false;

      return match.matched || buildProvisionMatchBonus(question, doc) > 0;
    })
    .map((doc) => {
      const authorityType = getAuthorityType(doc);
      const rawScore = Number(doc.finalScore ?? doc.final_score ?? doc.retrievalScore ?? doc.score ?? 0);
      const provisionBonus = buildProvisionMatchBonus(question, doc);
      const issueBonus = buildIssueClassificationBonus(question, doc, profile);
      const issueClassificationMatch = buildStructuredIssueClassificationMatch(question, doc, profile);
      const primaryBonus = isPrimaryOrControllingAuthority(authorityType) ? 20 : 0;
      const precedence = getControllingPrecedence(doc);
      const hierarchyBonus = Math.max(0, 100 - precedence);

      const compositeScore =
        rawScore +
        provisionBonus +
        issueBonus +
        primaryBonus +
        hierarchyBonus;

      return {
        ...doc,
        issueClassificationMatch: {
          ...issueClassificationMatch,
          profile,
          provisionBonus,
          issueBonus
        },
        targetAuthorityMatch: issueClassificationMatch.targetAuthorityMatch,
        issueMismatch: issueClassificationMatch.issueMismatch,
        provisionCompositeScore: compositeScore
      };
    })
    .filter((doc) => {
      const match = doc.issueClassificationMatch || {};
      const bonus = match.issueBonus || 0;
      const provisionBonus = match.provisionBonus || 0;

      if (match.issueMismatch) return false;

      return match.matched || bonus > 0 || provisionBonus > 0;
    })
    .sort((a, b) => {
      const override = isGenuineConflict(a, b) ? resolveCourtOverride(a, b) : null;

      if (override?.overrideApplies) {
        if (override.winningSource === a) return -1;
        if (override.winningSource === b) return 1;
      }

      const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
      if (targetDiff !== 0) return targetDiff;

      const aProvisionBonus = a.issueClassificationMatch?.provisionBonus || 0;
      const bProvisionBonus = b.issueClassificationMatch?.provisionBonus || 0;

      if (bProvisionBonus !== aProvisionBonus) return bProvisionBonus - aProvisionBonus;

      const aPrecedence = getControllingPrecedence(a);
      const bPrecedence = getControllingPrecedence(b);

      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      const aLevel = getAuthorityLevel(a);
      const bLevel = getAuthorityLevel(b);

      if (aLevel !== bLevel) return aLevel - bLevel;

      return Number(b.provisionCompositeScore || 0) - Number(a.provisionCompositeScore || 0);
    });
}

function buildContextBlock(docs = []) {
  return docs
    .map((doc, index) => {
      const authorityType = getAuthorityType(doc);
      const authorityLevel = getAuthorityLevel(doc);
      const authorityLabel = AUTHORITY_LABEL[authorityType] || authorityType;

      return [
        `SOURCE ${index + 1}`,
        `Title: ${getSourceTitle(doc)}`,
        `Path: ${getSourcePath(doc)}`,
        `Authority Type: ${authorityType}`,
        `Authority Label: ${authorityLabel}`,
        `Authority Level: ${authorityLevel}`,
        `Controlling Precedence: ${getControllingPrecedence(doc)}`,
        `Target Authority Match: ${doc.targetAuthorityMatch ? "YES" : "NO"}`,
        `Issue Classification Match: ${JSON.stringify(doc.issueClassificationMatch || {})}`,
        "Excerpt:",
        buildSourceSnippet(doc) || "[No excerpt available]"
      ].join("\n");
    })
    .join("\n\n--------------------\n\n");
}

function buildConflictContext(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      try {
        const analysis = analyzeConflictPair(docs[i], docs[j]);

        if (analysis?.conflict || analysis?.apparentConflict) {
          conflicts.push(analysis);
        }
      } catch (error) {
        conflicts.push({
          conflict: false,
          apparentConflict: false,
          error: error.message
        });
      }
    }
  }

  if (!conflicts.length) {
    return "No direct doctrinal or hierarchy conflict detected from the retrieved provision sources.";
  }

  return conflicts
    .slice(0, 3)
    .map((item, index) =>
      [
        `CONFLICT REVIEW ${index + 1}`,
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

function hasSubstantiveTaxQuestion(question = "") {
  return /\b(what is|define|meaning|taxability|taxable|exempt|liable|subject to|vat|income tax|withholding|deductible|expense|revenue|sales|cost|basis|why|how|proper treatment|accounting|bir risk|audit risk|consequence|apply)\b/i.test(
    lower(question)
  );
}

function isCitationOnlyQuestion(question = "") {
  const q = lower(question);

  const citationOnlySignals =
    /\b(cite|citation|source|legal basis|section|sec\.|article|provision)\b/i.test(q);

  const analyticalSignals =
    /\b(why|explain|analyze|apply|taxability|proper|risk|consequence|treatment|conflict|define|meaning|what is|how)\b/i.test(q);

  return citationOnlySignals && !analyticalSignals;
}

function buildPromptModeInstruction(question = "") {
  if (isCitationOnlyQuestion(question)) {
    return [
      "The user appears to be asking for a citation or provision.",
      "Do not give citation-only output.",
      "Provide the exact citation if visible, then explain the rule, legal effect, hierarchy, doctrinal status, and practical application in concise form."
    ].join("\n");
  }

  if (hasSubstantiveTaxQuestion(question)) {
    return [
      "The user is asking a substantive tax/legal question.",
      "Do not merely list provisions.",
      "Use the provision as controlling basis, then provide legal analysis, doctrine, hierarchy, and practical application."
    ].join("\n");
  }

  return [
    "Provide a conservative provision-based legal answer.",
    "Do not invent provisions or cite irrelevant sources.",
    "Explain the legal relevance of each cited source."
  ].join("\n");
}

function buildSourcesUsed(topDocs = []) {
  return topDocs.map((doc) => ({
    title: getSourceTitle(doc),
    source: getSourcePath(doc),
    authorityType: getAuthorityType(doc),
    authorityLevel: getAuthorityLevel(doc),
    controllingPrecedence: getControllingPrecedence(doc),
    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: doc.targetAuthorityMatch === true,
    excerpt: buildSourceSnippet(doc, 500)
  }));
}

export async function maybeGenerateProvisionCitationAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null
}) {
  try {
    if (!looksLikeProvisionQuestion(question)) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION
      };
    }

    const effectiveIssueClassification = normalizeIssueClassification(
      issueClassification,
      question,
      adaptiveContext
    );

    const ranked = rankProvisionDocs(retrievedResults || [], question, {
      issueClassification: effectiveIssueClassification,
      suppressIssueMismatch: true
    });

    const topDocs = ranked.slice(0, 6);

    if (!topDocs.length) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION,
        issueClassification: effectiveIssueClassification
      };
    }

    const provisionHint = extractProvisionHint(question);
    const contextBlock = buildContextBlock(topDocs);
    const conflictContext = buildConflictContext(topDocs);
    const modeInstruction = buildPromptModeInstruction(question);

    const systemPrompt = `
You are TINA's Provision Citation Engine.

Your job is not merely to retrieve citations.
Your job is to give a legally coherent Philippine tax answer anchored on retrieved provisions, issuances, and controlling authority.

ACTIVE RESPONSE MODE:
${responseMode}

ISSUE CLASSIFICATION:
${JSON.stringify(effectiveIssueClassification, null, 2)}

CORE RULE:
Use only provisions and issuances that match the classified issue.
Do not cite NIRC/RR/RMC/RMO provisions merely because they mention the same broad tax type.

AUTHORITY ORGANIZATION HIERARCHY:
1. Constitution
2. NIRC / Tax Code / Republic Act
3. Supreme Court decisions
4. Revenue Regulations
5. Revenue Memorandum Circulars
6. Revenue Memorandum Orders
7. Revenue Audit Memorandum Orders
8. BIR Rulings
9. CTA En Banc / CTA Division / Court of Appeals decisions
10. Secondary materials

CONFLICT RESOLUTION RULE:
- Constitution and statutes control administrative issuances.
- Revenue Regulations implement statutes but cannot amend them.
- RMCs, RMOs, RAMOs, and BIR rulings are administrative or interpretative and cannot override the NIRC, RR, or controlling court doctrine.
- If a court decision genuinely conflicts with a BIR issuance, controlling judicial doctrine prevails.
- Do not fabricate conflict.
- Different procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, transaction, or administrative rules are not direct doctrinal conflicts unless they contradict on the same legal issue.
- Do not say "Conflict Detected: YES" unless conflict metadata confirms conflict === true, same issue, same legal dimension, and opposite holding.

MANDATORY OUTPUT FORMAT:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

STRICT RULES:
- Be conservative.
- Do not hallucinate section numbers, case numbers, dates, rates, thresholds, or issuance numbers.
- Never cite a source for a point it does not actually cover.
- Do not use generic legal summaries.
- Do not append raw sources. The app will show clickable sources separately.
- If evidence or retrieved text is incomplete, state the limitation.
- If conflict metadata is incomplete, say no direct doctrinal conflict is established.
`.trim();

    const userPrompt = `
User Question:
${question}

Provision Hint:
${provisionHint || "None detected"}

Question Handling Instruction:
${modeInstruction}

Adaptive Context:
${JSON.stringify(adaptiveContext || {}, null, 2).slice(0, 3000)}

Retrieved Legal Sources:
${contextBlock}

Conflict Review:
${conflictContext}
`.trim();

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim() || "";

    if (!answer) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION,
        issueClassification: effectiveIssueClassification
      };
    }

    return {
      handled: true,
      answer,
      topDocs,
      sourcesUsed: buildSourcesUsed(topDocs),
      responseMode,
      adaptiveContext,
      issueClassification: effectiveIssueClassification,
      engineVersion: ENGINE_VERSION,
      provisionCitationMetadata: {
        provisionHint,
        rankedCount: ranked.length,
        topDocCount: topDocs.length,
        hierarchyAware: true,
        conflictAware: true,
        supersessionAware: true,
        issueClassificationAware: true,
        exactProvisionAware: true,
        targetAuthorityAware: true,
        structuredIssueClassificationMatch: true,
        rendererCompatible: true,
        plannerCompatible: true
      }
    };
  } catch (error) {
    console.error("maybeGenerateProvisionCitationAnswer error:", error.message);

    return {
      handled: false,
      error: error.message,
      engineVersion: ENGINE_VERSION
    };
  }
}

export function provisionCitationHealthCheck() {
  return {
    ok: true,
    engine: "TINA_PROVISION_CITATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    supersessionCompatible: true,
    issueClassificationCompatible: true,
    targetAuthorityAware: true,
    structuredIssueClassificationMatch: true,
    plannerCompatible: true,
    rendererCompatible: true
  };
}

export default {
  maybeGenerateProvisionCitationAnswer,
  provisionCitationHealthCheck
};
