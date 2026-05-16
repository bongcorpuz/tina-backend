// FILE: reasoning-engine.js
"use strict";

/**
 * TINA Enterprise Reasoning Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Complements patched issue-classified RAG pipeline.
 * - Preserves structured issueClassificationMatch and targetAuthorityMatch.
 * - Suppresses issue-mismatched evidence.
 * - Uses complete conflict gates before treating conflict as doctrinal.
 * - Keeps legacy hybridRetrieve export for compatibility, but issue-aware.
 */

import {
  AUTHORITY_LABEL,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
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

const ENGINE_VERSION = "4.0.0";

function safeString(value = "") {
  return String(value || "").trim();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function lower(value = "") {
  return safeString(value).toLowerCase();
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
    CONTRACT: "CONTRACTUAL",
    TRANSACTION_CHARACTERIZATION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
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
    BIR_RULINGS: "BIR_RULING",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    IFRS: "PFRS"
  };

  return aliases[raw] || raw || null;
}

function normalizeSourceName(name = "") {
  return safeString(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/[\\/]+/g, "/")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_\s]/g, "-")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/-+/g, "-")
    .trim();
}

function uniqueBy(items = [], makeKey = (item) => item) {
  const seen = new Set();
  const results = [];

  for (const item of items || []) {
    const key = makeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return results;
}

function getDocPath(doc = {}) {
  return safeString(
    doc.metadata?.path ||
      doc.path ||
      doc.source_path ||
      doc.sourcePath ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.original_source ||
      doc.source
  );
}

function getDocOriginalName(doc = {}) {
  return safeString(
    doc.metadata?.documentTitle ||
      doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.title
  );
}

function getDocText(doc = {}) {
  return safeString(
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
      doc.doctrineLabel,
      doc.doctrineApplicability,
      doc.doctrineApplicabilityExplanation,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases)
        ? doc.metadata.normalizedAliases
        : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildDocIdentity(doc = {}) {
  return (
    safeString(doc.id) ||
    safeString(doc.chunk_id) ||
    safeString(doc.metadata?.chunkId) ||
    safeString(doc.metadata?.fileId) ||
    safeString(doc.metadata?.file_id) ||
    safeString(doc.normalizedReference) ||
    safeString(doc.normalized_reference) ||
    safeString(doc.metadata?.normalizedReference) ||
    getDocPath(doc) ||
    getDocOriginalName(doc) ||
    safeString(doc.source)
  );
}

function getAuthorityType(doc = {}) {
  return (
    doc.authority_type ||
    doc.authorityType ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc?.(doc) ||
    classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || doc.title || "",
      path: getDocPath(doc),
      text: getDocText(doc)
    }) ||
    "UNKNOWN"
  );
}

function inferAuthorityTier(doc = {}) {
  const explicitTier =
    doc.authority_tier ??
    doc.authorityTier ??
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    doc.metadata?.authorityTier ??
    doc.sourceTier?.tier;

  if (Number.isFinite(Number(explicitTier))) return Number(explicitTier);

  return (
    getAuthorityLevelForDoc?.({
      ...doc,
      path: getDocPath(doc),
      metadata: doc.metadata || {}
    }) || 99
  );
}

function inferControllingPrecedence(doc = {}) {
  const explicit =
    doc.controlling_precedence ??
    doc.controllingPrecedence ??
    doc.metadata?.controllingPrecedence;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  return (
    getControllingPrecedenceForDoc?.({
      ...doc,
      path: getDocPath(doc),
      metadata: doc.metadata || {}
    }) || inferAuthorityTier(doc) || 99
  );
}

function authorityWeight(tier = 99) {
  if (tier <= 2) return 1.0;
  if (tier <= 3) return 0.97;
  if (tier <= 7) return 0.94;
  if (tier <= 8) return 0.9;
  if (tier <= 11) return 0.78;
  if (tier === 12) return 0.72;
  if (tier === 13) return 0.62;
  return 0.35;
}

function inferAuthorityLabel(tier = 99, doc = {}) {
  const authorityType = getAuthorityType(doc);
  return AUTHORITY_LABEL[authorityType] || AUTHORITY_LABEL.SECONDARY || "Unclassified Source";
}

function inferEvidenceType(doc = {}) {
  const authorityType = getAuthorityType(doc);

  if (["CONSTITUTION", "STATUTE", "TREATY"].includes(authorityType)) return "primary";
  if (["RR", "RMC", "RMO", "RAMO", "BIR_RULING", "LGU"].includes(authorityType)) {
    return "administrative";
  }
  if (["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(authorityType)) {
    return "jurisprudence";
  }

  return "secondary";
}

function inferEffectiveDate(doc = {}) {
  const raw =
    doc.metadata?.effectiveFrom ||
    doc.metadata?.effective_date ||
    doc.effective_from ||
    doc.modified_at ||
    doc.metadata?.modifiedTime ||
    doc.modifiedTime ||
    null;

  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function tokenize(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function computeKeywordScore(query = "", text = "") {
  const queryTokens = uniqueBy(tokenize(query), (item) => item).filter(
    (token) => token.length >= 3
  );

  const textTokens = new Set(tokenize(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  let hits = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token) || lower(text).includes(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

function classifyEvidenceTopic(doc = {}) {
  return safeString(
    doc.metadata?.topic ||
      doc.topic ||
      doc.metadata?.taxType ||
      doc.tax_type ||
      doc.metadata?.subtopic ||
      doc.subtopic ||
      "general"
  ).toLowerCase();
}

function detectIssueSignals(text = "") {
  const value = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|tax credit certificate|unutilized input vat|excess input vat)\b/i.test(value), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|value-added tax|value added tax)\b/i.test(value), "VAT_LIABILITY");
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|proof|evidence|records|burden of proof)\b/i.test(value), "EVIDENTIARY");
  push(/\b(filing|deadline|protest|appeal|assessment|loa|pan|fan|prescription|remedy)\b/i.test(value), "PROCEDURAL");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(value), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|gross income|taxable income)\b/i.test(value), "INCOME_TAX");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(value), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|gross vs net|economic substance|substance over form)\b/i.test(value), "TRANSACTION");
  push(/\b(audit|afs|pfrs|pas|misstatement|working paper|financial statements)\b/i.test(value), "AUDIT");

  return unique(issues);
}

function classifyIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|vatable|sales|revenue)\b/i.test(value), "SUBSTANTIVE");
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
      "REASONING_ENGINE_ISSUE_CLASSIFIED",
    targetAuthorities,
    raw: source
  };
}

function targetAuthorityMatched(profile = {}, doc = {}) {
  if (!safeArray(profile.targetAuthorities).length) return false;
  return profile.targetAuthorities.includes(getAuthorityType(doc));
}

function hasIssueMismatchByProfile(profile = {}, doc = {}) {
  const text = getDocText(doc);

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    /\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|unutilized input vat|excess input vat)\b/i.test(text)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    /\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services|value-added tax)\b/i.test(text)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    /\b(vat refund|input vat refund|vat liability|output vat|vatable)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}

function buildIssueClassificationMatch(query = "", doc = {}, issueClassification = null) {
  if (doc.issueClassificationMatch && typeof doc.issueClassificationMatch === "object") {
    return {
      ...doc.issueClassificationMatch,
      targetAuthorityMatch:
        doc.issueClassificationMatch.targetAuthorityMatch === true ||
        doc.targetAuthorityMatch === true,
      issueMismatch:
        doc.issueClassificationMatch.issueMismatch === true ||
        doc.issueMismatch === true
    };
  }

  const profile = normalizeIssueClassification(issueClassification, query);
  const text = getDocText(doc);
  const docIssues = detectIssueSignals(text).map(normalizeIssue);
  const docDimensions = classifyIssueDimensions(text).map(normalizeDimension);

  const queryIssues = safeArray(profile.subIssues).map(normalizeIssue).filter(Boolean);
  const queryDimensions = safeArray(profile.legalDimensions).map(normalizeDimension).filter(Boolean);

  const issueMismatch =
    doc.issueMismatch === true ||
    hasIssueMismatchByProfile(profile, doc);

  const issueOverlapValue = issueOverlap(queryIssues, docIssues);
  const dimensionOverlap = dimensionsOverlap(queryDimensions, docDimensions);
  const targetAuthorityMatch =
    doc.targetAuthorityMatch === true ||
    targetAuthorityMatched(profile, doc);

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
    docAuthorityType: getAuthorityType(doc)
  };
}

function hasIssueMismatch(query = "", doc = {}, issueClassification = null) {
  const match = buildIssueClassificationMatch(query, doc, issueClassification);
  return match.issueMismatch === true;
}

function isCourtAuthority(authorityType = "") {
  return ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
    String(authorityType || "").toUpperCase()
  );
}

function isBIRAuthority(authorityType = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(String(authorityType || "").toUpperCase());
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);

  const hasExactIssue = Boolean(
    conflict.exactIssue ||
      conflict.exact_issue ||
      conflict.sameIssueGate?.sameIssues?.length
  );

  const hasExactDimension = Boolean(
    conflict.exactLegalDimension ||
      conflict.exact_legal_dimension ||
      conflict.sameIssueGate?.sameDimensions?.length ||
      conflict.legalDimension
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue || conflict.exact_issue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.resolution_basis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controlling_authority ||
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

function buildConflictResolutionBasis(aType = "", bType = "", override = null) {
  if (override?.overrideApplies) {
    return override.reason || "Court decision prevails over conflicting BIR issuance.";
  }

  if (
    (isCourtAuthority(aType) && isBIRAuthority(bType)) ||
    (isCourtAuthority(bType) && isBIRAuthority(aType))
  ) {
    return "Court decision prevails over conflicting BIR issuance only if there is a genuine same-issue opposite-holding conflict.";
  }

  return `Prefer ${override?.winningAuthority || aType || bType || "higher authority"} based on controlling authority hierarchy.`;
}

function compareEvidencePair(a, b, issueClassification = null) {
  const docA = a.raw || a;
  const docB = b.raw || b;

  const matchA = buildIssueClassificationMatch("", docA, issueClassification);
  const matchB = buildIssueClassificationMatch("", docB, issueClassification);

  if (matchA.issueMismatch || matchB.issueMismatch) return null;
  if (!matchA.matched || !matchB.matched) return null;

  const analysis = analyzeConflictPair(docA, docB);

  if (!analysis?.conflict && !analysis?.apparentConflict && !isGenuineConflict(docA, docB)) {
    return null;
  }

  const aType = getAuthorityType(docA);
  const bType = getAuthorityType(docB);
  const override = resolveCourtOverride(docA, docB);

  const preferred = override?.winningSource
    ? override.winningSource === docA
      ? a
      : b
    : inferControllingPrecedence(docA) <= inferControllingPrecedence(docB)
      ? a
      : b;

  const overridden = preferred === a ? b : a;

  const completeConflict = conflictMetadataIsComplete(analysis);

  return {
    conflict: completeConflict,
    conflict_topic: classifyEvidenceTopic(a) || classifyEvidenceTopic(b) || "general",
    source_a_path: getDocPath(docA),
    source_b_path: getDocPath(docB),
    source_a_claim: safeString(a.text || a.claim_text || getDocText(docA)).slice(0, 500),
    source_b_claim: safeString(b.text || b.claim_text || getDocText(docB)).slice(0, 500),
    source_a_type: aType,
    source_b_type: bType,
    preferred_source_path: getDocPath(preferred.raw || preferred),
    overridden_source_path: getDocPath(overridden.raw || overridden),
    controlling_authority:
      override?.winningAuthority || getAuthorityType(preferred.raw || preferred),
    overridden_authority:
      override?.overriddenAuthority || getAuthorityType(overridden.raw || overridden),
    override_applied: Boolean(override?.overrideApplies),
    conflict_reason:
      analysis?.reason ||
      analysis?.resolutionBasis ||
      override?.reason ||
      "Potential contradiction signal detected; verify same issue and opposite holding before treating as conflict.",
    resolution_basis:
      analysis?.resolutionBasis || buildConflictResolutionBasis(aType, bType, override),
    doctrinal_conflict: completeConflict && Boolean(analysis?.doctrinalConflict),
    hierarchy_conflict: completeConflict && Boolean(analysis?.hierarchyConflict),
    apparent_conflict: !completeConflict && Boolean(analysis?.apparentConflict),
    distinction_type: analysis?.distinctionType || null,
    exact_issue: analysis?.exactIssue || null,
    exact_legal_dimension: analysis?.exactLegalDimension || null,
    sameIssueGate: analysis?.sameIssueGate || null,
    oppositeHoldingGate: analysis?.oppositeHoldingGate || null,
    issueClassificationMatchA: matchA,
    issueClassificationMatchB: matchB,
    targetAuthorityMatchA: matchA.targetAuthorityMatch,
    targetAuthorityMatchB: matchB.targetAuthorityMatch,
    audit_record: {
      completeConflict,
      overrideApplied: Boolean(override?.overrideApplies),
      winningAuthority: override?.winningAuthority || null,
      overriddenAuthority: override?.overriddenAuthority || null,
      winningSource: getDocPath(override?.winningSource || {}),
      overriddenSource: getDocPath(override?.overriddenSource || {}),
      analysis,
      tinaReasoningEngineVersion: ENGINE_VERSION
    }
  };
}

function extractTopClaims(answerDraft = "") {
  return safeString(answerDraft)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .slice(0, 12);
}

function buildCitationCandidates(normalized) {
  const raw = safeString(normalized.raw);
  const aliases = Array.isArray(normalized.aliases) ? normalized.aliases : [];

  return uniqueBy(
    [normalized.normalized, raw, ...aliases].filter(Boolean).map((value) => safeString(value)),
    (value) => value.toLowerCase()
  );
}

function escapeIlikeValue(value = "") {
  return safeString(value).replace(/[%,'"]/g, " ").trim();
}

function buildExactCitationOrClauses(candidateStrings = []) {
  const clauses = [];

  for (const value of candidateStrings) {
    const rawValue = escapeIlikeValue(value);
    const normalizedValue = escapeIlikeValue(normalizeForMatch(value));

    if (!rawValue && !normalizedValue) continue;

    if (rawValue) {
      clauses.push(`source.ilike.%${rawValue}%`);
      clauses.push(`original_source.ilike.%${rawValue}%`);
      clauses.push(`metadata->>path.ilike.%${rawValue}%`);
      clauses.push(`metadata->>originalSource.ilike.%${rawValue}%`);
      clauses.push(`metadata->>originalFileName.ilike.%${rawValue}%`);
      clauses.push(`metadata->>normalizedReference.ilike.%${rawValue}%`);
    }

    if (normalizedValue) {
      clauses.push(`source.ilike.%${normalizedValue}%`);
      clauses.push(`original_source.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>path.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>originalSource.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>originalFileName.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>normalizedReference.ilike.%${normalizedValue}%`);
      clauses.push(`normalized_reference.ilike.%${normalizedValue}%`);
    }
  }

  return uniqueBy(clauses, (item) => item);
}

export async function resolveExactCitation(supabase, query) {
  const cleanQuery = safeString(query);
  const normalized = normalizeLegalReference(cleanQuery);

  if (!normalized?.type) {
    return {
      matched: false,
      query: cleanQuery,
      citation: null,
      documents: []
    };
  }

  const candidateStrings = buildCitationCandidates(normalized);
  const sourceOrClauses = buildExactCitationOrClauses(candidateStrings);

  if (!sourceOrClauses.length) {
    return {
      matched: false,
      query: cleanQuery,
      citation: {
        normalizedReference: normalized.normalized,
        type: normalized.type,
        aliases: normalized.aliases || []
      },
      documents: []
    };
  }

  const { data, error } = await supabase
    .from("tina_vector_store")
    .select("*")
    .or(sourceOrClauses.join(","))
    .limit(40);

  if (error) {
    throw new Error(`resolveExactCitation failed: ${error.message}`);
  }

  const normalizedNeedle = safeString(normalized.normalized).toLowerCase();

  const documents = (data || []).filter((doc) => {
    const haystack = [
      doc.source,
      doc.original_source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.path,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.normalizedReference,
      ...(doc.normalizedAliases || []),
      ...(doc.normalized_aliases || []),
      ...(doc.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .map((value) => normalizeForMatch(String(value)))
      .join(" ");

    const aliasHit = candidateStrings
      .map((candidate) => normalizeForMatch(candidate))
      .some((candidate) => candidate && haystack.includes(candidate));

    const normalizedReference = normalizeForMatch(
      doc.normalizedReference ||
        doc.normalized_reference ||
        doc.metadata?.normalizedReference ||
        ""
    );

    return (
      aliasHit ||
      (normalizedNeedle &&
        normalizedReference.includes(normalizeForMatch(normalizedNeedle)))
    );
  });

  return {
    matched: documents.length > 0,
    query: cleanQuery,
    citation: {
      normalizedReference: normalized.normalized,
      type: normalized.type,
      aliases: normalized.aliases || []
    },
    documents
  };
}

async function runVectorSearch(vectorStore, cleanQuery, topK, supabase) {
  if (vectorStore?.smartSearch) {
    try {
      const result = await vectorStore.smartSearch({
        query: cleanQuery,
        topK,
        supabase
      });

      return Array.isArray(result) ? result : result?.results || [];
    } catch {
      const result = await vectorStore.smartSearch(cleanQuery, topK);
      return Array.isArray(result) ? result : result?.results || [];
    }
  }

  if (vectorStore?.searchSimilar) {
    try {
      const result = await vectorStore.searchSimilar({
        query: cleanQuery,
        topK,
        supabase
      });

      return Array.isArray(result) ? result : result?.results || [];
    } catch {
      const result = await vectorStore.searchSimilar(cleanQuery, topK);
      return Array.isArray(result) ? result : result?.results || [];
    }
  }

  return [];
}

export async function hybridRetrieve({
  supabase,
  vectorStore,
  query,
  questionType = "general",
  taxType = "",
  topK = 24,
  adaptiveMode = "STANDARD",
  adaptiveContext = {},
  issueClassification = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = []
}) {
  const cleanQuery = safeString(query);

  if (!cleanQuery) {
    return {
      query: cleanQuery,
      results: [],
      retrievalMetadata: {
        engine: "TINA_REASONING_ENGINE",
        version: ENGINE_VERSION
      }
    };
  }

  const profile = normalizeIssueClassification(
    {
      ...(issueClassification || {}),
      primaryIssue:
        primaryIssue ||
        issueClassification?.primaryIssue ||
        issueClassification?.primary_issue,
      subIssue:
        subIssue ||
        issueClassification?.subIssue ||
        issueClassification?.sub_issue,
      subIssues: unique([
        ...safeArray(subIssues),
        ...safeArray(issueClassification?.subIssues),
        ...safeArray(issueClassification?.sub_issues)
      ]),
      legalDimensions: unique([
        ...safeArray(legalDimensions),
        ...safeArray(issueClassification?.legalDimensions),
        ...safeArray(issueClassification?.legal_dimensions)
      ]),
      retrievalStrategy:
        retrievalStrategy ||
        issueClassification?.retrievalStrategy ||
        issueClassification?.retrieval_strategy,
      targetAuthorities: unique([
        ...safeArray(targetAuthorities),
        ...safeArray(issueClassification?.targetAuthorities),
        ...safeArray(issueClassification?.target_authorities)
      ])
    },
    cleanQuery
  );

  const exact = await resolveExactCitation(supabase, cleanQuery);
  const exactDocs = exact.documents || [];

  let metadataDocs = [];

  if (taxType) {
    const { data, error } = await supabase
      .from("tina_vector_store")
      .select("*")
      .or(`metadata->>taxType.eq.${taxType},metadata->>tax_type.eq.${taxType}`)
      .limit(Math.max(topK, 20));

    if (!error) metadataDocs = data || [];
  }

  let keywordDocs = [];
  const tokens = tokenize(cleanQuery).filter((token) => token.length >= 3).slice(0, 8);

  if (tokens.length) {
    const orClause = tokens.map((token) => `text.ilike.%${escapeIlikeValue(token)}%`).join(",");

    const { data, error } = await supabase
      .from("tina_vector_store")
      .select("*")
      .or(orClause)
      .limit(Math.max(topK, 20));

    if (!error) keywordDocs = data || [];
  }

  const vectorDocs = await runVectorSearch(vectorStore, cleanQuery, topK, supabase);

  const supersessionResult = applySupersessionFilter(
    uniqueBy(
      [...exactDocs, ...metadataDocs, ...keywordDocs, ...(vectorDocs || [])],
      (doc) => buildDocIdentity(doc)
    )
  );

  const merged = supersessionResult?.activeDocs || [];

  const scored = merged
    .map((doc) => {
      const issueClassificationMatch = buildIssueClassificationMatch(cleanQuery, doc, profile);
      return {
        ...doc,
        issueClassificationMatch,
        targetAuthorityMatch: issueClassificationMatch.targetAuthorityMatch,
        issueMismatch: issueClassificationMatch.issueMismatch
      };
    })
    .filter((doc) => !doc.issueMismatch)
    .map((doc) => {
      const textBlob = getDocText(doc);
      const vectorScore = safeNumber(
        doc.finalScore ?? doc.final_score ?? doc.retrievalScore ?? doc.score,
        0
      );
      const keywordScore = computeKeywordScore(cleanQuery, textBlob);
      const tier = inferAuthorityTier(doc);
      const precedence = inferControllingPrecedence(doc);
      const citationBoost = exactDocs.some(
        (exactDoc) => buildDocIdentity(exactDoc) === buildDocIdentity(doc)
      )
        ? 1.25
        : 1;

      const issueBonus = doc.issueClassificationMatch?.matched ? 0.25 : 0;
      const targetBonus = doc.targetAuthorityMatch ? 0.25 : 0;

      const combinedScore =
        (Math.max(vectorScore, keywordScore) *
          authorityWeight(tier) *
          citationBoost) +
        issueBonus +
        targetBonus -
        precedence * 0.002;

      return {
        ...doc,
        score: vectorScore || keywordScore,
        keyword_score: keywordScore,
        authority_tier: tier,
        authority_type: getAuthorityType(doc),
        controlling_precedence: precedence,
        combined_score: Number(combinedScore.toFixed(6)),
        question_type: questionType,
        adaptive_mode: adaptiveMode,
        reasoning_metadata: {
          adaptiveContextAware: true,
          supersessionAware: true,
          issueMismatchSuppressed: true,
          issueClassificationAware: true,
          targetAuthorityAware: true,
          controllingPrecedenceAware: true,
          tinaReasoningEngineVersion: ENGINE_VERSION,
          issueClassification: profile
        }
      };
    });

  scored.sort((a, b) => {
    const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
    if (targetDiff !== 0) return targetDiff;

    const issueDiff =
      Number(b.issueClassificationMatch?.matched === true) -
      Number(a.issueClassificationMatch?.matched === true);
    if (issueDiff !== 0) return issueDiff;

    if (b.combined_score !== a.combined_score) return b.combined_score - a.combined_score;

    const precedenceDiff = inferControllingPrecedence(a) - inferControllingPrecedence(b);
    if (precedenceDiff !== 0) return precedenceDiff;

    return inferAuthorityTier(a) - inferAuthorityTier(b);
  });

  return {
    query: cleanQuery,
    exactCitation: exact,
    supersessionResult,
    issueClassification: profile,
    results: scored.slice(0, topK),
    retrievalMetadata: {
      engine: "TINA_REASONING_ENGINE",
      version: ENGINE_VERSION,
      adaptiveMode,
      adaptiveContext,
      issueClassification: profile,
      exactCitationMatched: Boolean(exact.matched),
      rawCount: exactDocs.length + metadataDocs.length + keywordDocs.length + vectorDocs.length,
      finalCount: scored.slice(0, topK).length,
      issueClassificationAware: true,
      targetAuthorityAware: true
    }
  };
}

export function normalizeRetrievedEvidence(docs = [], options = {}) {
  const issueClassification =
    options.issueClassification ||
    options.adaptiveContext?.issueClassification ||
    null;

  return docs
    .map((doc) => {
      const authorityTier = inferAuthorityTier(doc);
      const authorityType = getAuthorityType(doc);
      const rawScore = safeNumber(
        doc.combined_score ||
          doc.score ||
          doc.keyword_score ||
          doc.retrievalScore ||
          doc.finalScore ||
          doc.final_score ||
          0,
        0
      );

      const issueClassificationMatch = buildIssueClassificationMatch(
        "",
        doc,
        issueClassification || doc.issueClassificationMatch?.profile || null
      );

      return {
        id: buildDocIdentity(doc),
        vector_chunk_id: doc.id || doc.chunk_id || doc.metadata?.chunkId || null,
        topic: classifyEvidenceTopic(doc),
        text: getDocText(doc),
        source_path: getDocPath(doc),
        source_title: getDocOriginalName(doc) || safeString(doc.source),
        section_label: safeString(doc.metadata?.sectionLabel || doc.metadata?.heading || ""),
        authority_tier: authorityTier,
        authority_type: authorityType,
        authority_label: inferAuthorityLabel(authorityTier, doc),
        controlling_precedence: inferControllingPrecedence(doc),
        evidence_type: inferEvidenceType(doc),
        effective_date: inferEffectiveDate(doc),
        score: rawScore,
        issueClassificationMatch,
        targetAuthorityMatch:
          doc.targetAuthorityMatch === true ||
          issueClassificationMatch.targetAuthorityMatch === true,
        issueMismatch:
          doc.issueMismatch === true ||
          issueClassificationMatch.issueMismatch === true,
        raw: doc
      };
    })
    .filter((item) => !item.issueMismatch);
}

export function detectEvidenceConflicts(evidence = [], options = {}) {
  const issueClassification =
    options.issueClassification ||
    options.adaptiveContext?.issueClassification ||
    null;

  const cleanEvidence = safeArray(evidence).filter((item) => !item.issueMismatch);
  const conflicts = [];

  for (let i = 0; i < cleanEvidence.length; i += 1) {
    for (let j = i + 1; j < cleanEvidence.length; j += 1) {
      const result = compareEvidencePair(cleanEvidence[i], cleanEvidence[j], issueClassification);
      if (result) conflicts.push(result);
    }
  }

  return uniqueBy(
    conflicts,
    (conflict) =>
      [
        conflict.conflict_topic,
        conflict.source_a_path,
        conflict.source_b_path,
        conflict.preferred_source_path,
        conflict.overridden_source_path,
        conflict.controlling_authority,
        conflict.exact_issue,
        conflict.exact_legal_dimension
      ].join("|")
  );
}

export function rankEvidenceByAuthority(evidence = []) {
  return [...safeArray(evidence)]
    .filter((item) => !item.issueMismatch)
    .sort((a, b) => {
      const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
      if (targetDiff !== 0) return targetDiff;

      const issueDiff =
        Number(b.issueClassificationMatch?.matched === true) -
        Number(a.issueClassificationMatch?.matched === true);
      if (issueDiff !== 0) return issueDiff;

      const aPrecedence = safeNumber(a.controlling_precedence, 99);
      const bPrecedence = safeNumber(b.controlling_precedence, 99);

      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      const aTier = safeNumber(a.authority_tier, 99);
      const bTier = safeNumber(b.authority_tier, 99);

      if (aTier !== bTier) return aTier - bTier;

      const scoreDiff = safeNumber(b.score, 0) - safeNumber(a.score, 0);
      if (scoreDiff !== 0) return scoreDiff;

      return safeString(a.source_path).localeCompare(safeString(b.source_path));
    });
}

export function buildClaimEvidenceMap(answerDraft, evidence = []) {
  const claims = extractTopClaims(answerDraft);

  return claims.map((claim) => {
    const ranked = evidence
      .filter((item) => !item.issueMismatch)
      .map((item) => {
        const combinedText = [
          item.text,
          item.source_title,
          item.source_path,
          item.section_label,
          item.topic
        ]
          .filter(Boolean)
          .join(" ");

        const evidenceScore = computeKeywordScore(claim, combinedText);
        const issueBoost = item.issueClassificationMatch?.matched ? 0.15 : 0;
        const targetBoost = item.targetAuthorityMatch ? 0.15 : 0;
        const finalScore = Math.min(1, evidenceScore + issueBoost + targetBoost);

        return {
          claim_text: claim,
          support_status:
            finalScore >= 0.55
              ? "supported"
              : finalScore >= 0.25
                ? "partial"
                : "unsupported",
          source_path: item.source_path || null,
          source_title: item.source_title || null,
          vector_chunk_id: item.vector_chunk_id || null,
          authority_tier: item.authority_tier ?? null,
          authority_type: item.authority_type ?? null,
          controlling_precedence: item.controlling_precedence ?? null,
          evidence_score: Number(finalScore.toFixed(4)),
          issueClassificationMatch: item.issueClassificationMatch || null,
          targetAuthorityMatch: item.targetAuthorityMatch === true
        };
      })
      .sort((a, b) => {
        if (b.targetAuthorityMatch !== a.targetAuthorityMatch) {
          return Number(b.targetAuthorityMatch) - Number(a.targetAuthorityMatch);
        }

        if (b.evidence_score !== a.evidence_score) return b.evidence_score - a.evidence_score;

        return safeNumber(a.controlling_precedence, 99) - safeNumber(b.controlling_precedence, 99);
      });

    return (
      ranked[0] || {
        claim_text: claim,
        support_status: "unsupported",
        source_path: null,
        source_title: null,
        vector_chunk_id: null,
        authority_tier: null,
        authority_type: null,
        controlling_precedence: null,
        evidence_score: 0,
        issueClassificationMatch: null,
        targetAuthorityMatch: false
      }
    );
  });
}

export async function synthesizeGroundedAnswer({
  openai,
  hookConfig,
  originalQuestion,
  cleanQuestion,
  topicData,
  questionType,
  evidence = [],
  conflicts = [],
  memoryContext = "",
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  const profile =
    issueClassification ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.queryIntent?.issueClassification ||
    null;

  const topEvidence = rankEvidenceByAuthority(
    normalizeRetrievedEvidence(evidence, { issueClassification: profile })
  ).slice(0, 10);

  const context = topEvidence
    .map((item, index) => {
      return [
        `SOURCE ${index + 1}: ${item.source_title || "Untitled Source"}`,
        `PATH: ${item.source_path || "Unknown"}`,
        `AUTHORITY: ${item.authority_label || "Unknown"} (Tier ${item.authority_tier})`,
        `AUTHORITY TYPE: ${item.authority_type || "UNKNOWN"}`,
        `CONTROLLING PRECEDENCE: ${item.controlling_precedence ?? 99}`,
        `TARGET AUTHORITY MATCH: ${item.targetAuthorityMatch ? "YES" : "NO"}`,
        `ISSUE CLASSIFICATION MATCH: ${JSON.stringify(item.issueClassificationMatch || {})}`,
        `SECTION: ${item.section_label || "N/A"}`,
        `SCORE: ${item.score}`,
        "TEXT:",
        item.text || ""
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const completeConflicts = safeArray(conflicts).filter((item) => item.conflict === true);

  const systemPrompt = `
You are TINA (Tax Intelligence and Analysis), an expert Philippine tax researcher, analyst, CPA, audit partner, and legal reasoning assistant.

ACTIVE HOOK MODE:
${hookConfig?.mode || "ASK"}

ACTIVE RESPONSE MODE:
${responseMode}

CORE BEHAVIOR:
- precise
- source-grounded
- conservative
- audit-defensible
- evidence-aware
- hierarchy-aware
- issue-classification-aware
- no hallucinations
- no unsupported legal conclusions

STRICT RULES:
1. Answer ONLY from the provided CONTEXT when indexed context is available.
2. Do NOT invent RR, RMC, RMO, RAMO, BIR rulings, dates, sections, rates, forms, thresholds, deadlines, case doctrines, or citations.
3. If exact authority is not in CONTEXT, state the limitation.
4. Do not claim a conflict unless conflict metadata shows conflict === true, same issue, same legal dimension, and opposite holding.
5. Different substantive, procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, transaction, or administrative rules are not direct conflicts unless they contradict on the same legal issue.
6. Do not cite issue-mismatched authorities.
7. Prefer sources with issueClassificationMatch.matched === true and targetAuthorityMatch === true.
8. Do not mention ChatGPT.
9. If evidence is incomplete, use preliminary conclusion language.
10. Do not append raw source lists; the app will display source links separately.

MANDATORY RESPONSE FORMAT:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION
`.trim();

  const userPrompt = `
Conversation Memory:
${memoryContext || "No prior conversation."}

Hook:
${hookConfig?.hook_code || "/ask"}

Mode:
${hookConfig?.mode || "ASK"}

Response Mode:
${responseMode}

Issue Classification:
${JSON.stringify(profile || {}, null, 2)}

Adaptive Context:
${JSON.stringify(adaptiveContext || {}, null, 2).slice(0, 3000)}

Topic Data:
${JSON.stringify(topicData || {})}

Original User Question:
${originalQuestion}

Clean Question:
${cleanQuestion}

Question Type:
${questionType}

Conflicts:
${
  completeConflicts.length
    ? completeConflicts
        .map((item, index) =>
          [
            `Conflict ${index + 1}: ${item.conflict_topic || "general"}`,
            `Conflict: ${item.conflict ? "YES" : "NO"}`,
            `Source A: ${item.source_a_path || "N/A"} (${item.source_a_type || "Unknown"})`,
            `Source B: ${item.source_b_path || "N/A"} (${item.source_b_type || "Unknown"})`,
            `Reason: ${item.conflict_reason || "Potential contradiction"}`,
            `Preferred Source: ${item.preferred_source_path || "N/A"}`,
            item.overridden_source_path ? `Overridden Source: ${item.overridden_source_path}` : null,
            item.override_applied !== undefined
              ? `Court Override Applied: ${item.override_applied ? "YES" : "NO"}`
              : null,
            `Resolution Basis: ${item.resolution_basis || "Prefer higher authority"}`,
            item.exact_issue ? `Exact Issue: ${item.exact_issue}` : null,
            item.exact_legal_dimension ? `Exact Legal Dimension: ${item.exact_legal_dimension}` : null,
            item.distinction_type ? `Distinction Type: ${item.distinction_type}` : null
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n\n")
    : "No complete same-issue opposite-holding conflict detected."
}

CONTEXT:
${context}

Instruction:
Answer strictly using only the CONTEXT. Apply TINA hierarchy only to issue-matched authorities and only declare conflict where complete conflict metadata exists.
`.trim();

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

export async function saveReasoningRun(supabase, payload) {
  const record = {
    user_id: payload.userId || null,
    session_id: payload.sessionId || null,
    conversation_id: payload.conversationId || null,
    question: safeString(payload.question),
    normalized_question: safeString(payload.normalizedQuestion || ""),
    question_type: safeString(payload.questionType || ""),
    mode: safeString(payload.mode || ""),
    adaptive_mode: safeString(payload.adaptiveMode || payload.responseMode || ""),
    retrieval_status: safeString(payload.retrievalStatus || ""),
    reasoning_status: safeString(payload.reasoningStatus || ""),
    fallback_used: Boolean(payload.fallbackUsed),
    top_confidence:
      payload.topConfidence === null || payload.topConfidence === undefined
        ? null
        : Number(payload.topConfidence),
    answer_summary: safeString(payload.answerSummary || ""),
    metadata: {
      engine: "TINA_REASONING_ENGINE",
      version: ENGINE_VERSION,
      adaptiveContext: payload.adaptiveContext || null,
      issueClassification: payload.issueClassification || null,
      retrievalMetadata: payload.retrievalMetadata || null
    }
  };

  const { data, error } = await supabase
    .from("tina_reasoning_runs")
    .insert(record)
    .select("*")
    .single();

  if (error) throw new Error(`saveReasoningRun failed: ${error.message}`);

  return data;
}

export async function saveReasoningEvidence(supabase, payload) {
  const reasoningRunId = safeString(payload.reasoningRunId);
  const evidenceItems = Array.isArray(payload.evidence) ? payload.evidence : [];

  if (!reasoningRunId || !evidenceItems.length) return [];

  const rows = evidenceItems.map((item) => ({
    reasoning_run_id: reasoningRunId,
    claim_text: safeString(item.claim_text || item.claimText),
    support_status: safeString(item.support_status || item.supportStatus || "unsupported"),
    source_path: safeString(item.source_path || item.sourcePath || "") || null,
    source_title: safeString(item.source_title || item.sourceTitle || "") || null,
    vector_chunk_id: item.vector_chunk_id || item.vectorChunkId || null,
    authority_tier:
      item.authority_tier === null || item.authority_tier === undefined
        ? null
        : Number(item.authority_tier),
    authority_type: safeString(item.authority_type || item.authorityType || "") || null,
    evidence_score:
      item.evidence_score === null || item.evidence_score === undefined
        ? null
        : Number(item.evidence_score)
  }));

  const { data, error } = await supabase
    .from("tina_reasoning_evidence")
    .insert(rows)
    .select("*");

  if (error) throw new Error(`saveReasoningEvidence failed: ${error.message}`);

  return data || [];
}

export async function saveReasoningConflicts(supabase, payload) {
  const reasoningRunId = safeString(payload.reasoningRunId);
  const conflictItems = Array.isArray(payload.conflicts) ? payload.conflicts : [];

  if (!reasoningRunId || !conflictItems.length) return [];

  const rows = conflictItems.map((item) => {
    const resolutionSuffix = [
      item.conflict !== undefined ? `conflict=${item.conflict ? "yes" : "no"}` : null,
      item.override_applied !== undefined
        ? `override_applied=${item.override_applied ? "yes" : "no"}`
        : null,
      item.controlling_authority
        ? `controlling_authority=${item.controlling_authority}`
        : null,
      item.overridden_authority
        ? `overridden_authority=${item.overridden_authority}`
        : null,
      item.distinction_type ? `distinction_type=${item.distinction_type}` : null,
      item.exact_issue ? `exact_issue=${item.exact_issue}` : null,
      item.exact_legal_dimension ? `exact_legal_dimension=${item.exact_legal_dimension}` : null
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      reasoning_run_id: reasoningRunId,
      conflict_topic: safeString(item.conflict_topic || "") || null,
      source_a_path: safeString(item.source_a_path || "") || null,
      source_b_path: safeString(item.source_b_path || "") || null,
      source_a_claim: safeString(item.source_a_claim || "") || null,
      source_b_claim: safeString(item.source_b_claim || "") || null,
      preferred_source_path: safeString(item.preferred_source_path || "") || null,
      conflict_reason: safeString(item.conflict_reason || "") || null,
      resolution_basis:
        safeString(item.resolution_basis || "") +
          (resolutionSuffix ? ` | ${resolutionSuffix}` : "") || null
    };
  });

  const { data, error } = await supabase
    .from("tina_source_conflicts")
    .insert(rows)
    .select("*");

  if (error) throw new Error(`saveReasoningConflicts failed: ${error.message}`);

  return data || [];
}

export function reasoningEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_REASONING_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    supersessionCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    issueClassificationCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityAware: true,
    controllingPrecedenceAware: true,
    completeConflictGateAware: true
  };
}

export {
  ENGINE_VERSION,
  normalizeIssueClassification,
  buildIssueClassificationMatch,
  conflictMetadataIsComplete
};

export default {
  resolveExactCitation,
  hybridRetrieve,
  normalizeRetrievedEvidence,
  detectEvidenceConflicts,
  rankEvidenceByAuthority,
  buildClaimEvidenceMap,
  synthesizeGroundedAnswer,
  saveReasoningRun,
  saveReasoningEvidence,
  saveReasoningConflicts,
  reasoningEngineHealthCheck
};
