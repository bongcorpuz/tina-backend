// FILE: case-analysis-engine.js
"use strict";

/**
 * TINA Enterprise Case Analysis Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Uses issueClassification to prevent unrelated jurisprudence from being cited.
 * - Filters cases by classified issue, legal dimension, case role, and applicability.
 * - Treats generic keyword/topic similarity as insufficient.
 */

import {
  rerankByHierarchy,
  selectTopLegalBases,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

import {
  detectHierarchyConflict,
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} from "./conflict-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

import {
  selectIssueRelevantJurisprudence,
  buildJurisprudencePayload,
  CASE_ROLE,
  APPLICABILITY_STATUS
} from "./jurisprudence-engine.js";

import { reconcileDoctrine } from "./doctrinal-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

const ENGINE_VERSION = "4.0.0";

const COURT_TYPES = Object.freeze([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const BIR_TYPES = Object.freeze([
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
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

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    "Unknown"
  );
}

function getDocText(doc = {}) {
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
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      getDocPath(doc)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function getAuthorityType(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc(doc) ||
    "UNKNOWN"
  );
}

function getAuthorityLevel(doc = {}) {
  return Number(
    doc.authorityLevel ??
      doc.authority_level ??
      doc.metadata?.authorityLevel ??
      getAuthorityLevelForDoc(doc) ??
      99
  );
}

function isCourtAuthority(type = "") {
  return COURT_TYPES.includes(String(type || "").toUpperCase());
}

function isBIRAuthority(type = "") {
  return BIR_TYPES.includes(String(type || "").toUpperCase());
}

function buildDisplaySource(doc = {}) {
  return {
    source: getDocPath(doc),
    authorityType: getAuthorityType(doc),
    authorityLevel: getAuthorityLevel(doc),
    title:
      doc.metadata?.documentTitle ||
      doc.metadata?.originalFileName ||
      doc.title ||
      doc.source ||
      doc.originalSource ||
      null,
    caseRole: doc.caseRole || null,
    caseApplicability: doc.caseApplicability || null,
    issueClassificationMatch: doc.issueClassificationMatch || null,
    overrideApplied: Boolean(doc.overrideApplied || false)
  };
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
    AGREEMENT: "CONTRACT"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_") || null;
}

function normalizeIssueClassification(issueClassification = null, question = "", adaptiveContext = {}) {
  const source =
    issueClassification ||
    adaptiveContext?.issueClassification ||
    adaptiveContext?.queryIntent?.issueClassification ||
    adaptiveContext?.responsePlan?.issueClassification ||
    {};

  const fallbackSignals = extractIssueSignals(question).map((item) =>
    normalizeIssue(item.replace(/\s+/g, "_"))
  );

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    fallbackSignals[0] ||
    "GENERAL";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue),
    ...fallbackSignals
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(source.legalDimensions).map(normalizeDimension),
    ...safeArray(source.legalDimension).map(normalizeDimension),
    ...safeArray(source.legal_dimensions).map(normalizeDimension),
    ...safeArray(source.legal_dimension).map(normalizeDimension)
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...safeArray(source.targetAuthorities),
    ...safeArray(source.target_authorities)
  ]).filter(Boolean);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "CASE_ANALYSIS_ISSUE_CLASSIFIED",
    targetAuthorities,
    raw: source
  };
}

function detectCaseAnalysisIntent(question = "") {
  const q = lower(question);

  const strongCaseSignals = [
    "analyze the case",
    "case analysis",
    "facts issue ruling",
    "facts, issue, ruling",
    "facts doctrine application",
    "break down the case",
    "case breakdown",
    "discuss the case",
    "explain the case",
    "summarize the case",
    "what happened in the case",
    "what was the ruling",
    "what is the doctrine in",
    "cta case",
    "g.r. no.",
    "supreme court case",
    "court of tax appeals case",
    "court position",
    "bir position",
    "legally defensible conclusion",
    "taxpayer risk assessment"
  ];

  const caseReferenceSignals = [
    " v. ",
    " vs ",
    " vs. ",
    "cta",
    "court of tax appeals",
    "supreme court",
    "g.r. no.",
    "g.r no.",
    "ca-g.r.",
    "cta en banc",
    "cta division"
  ];

  const genericTaxExplainSignals = [
    "what is vat",
    "explain vat",
    "what is income tax",
    "explain income tax",
    "what is percentage tax",
    "explain percentage tax",
    "what is withholding tax",
    "explain withholding tax"
  ];

  const hasStrongCaseSignal = strongCaseSignals.some((token) => q.includes(token));
  const hasCaseReferenceSignal = caseReferenceSignals.some((token) => q.includes(token));
  const isGenericExplain = genericTaxExplainSignals.some((token) => q.includes(token));

  return {
    isCaseAnalysis: !isGenericExplain && (hasStrongCaseSignal || hasCaseReferenceSignal),
    confidence: hasStrongCaseSignal ? "high" : hasCaseReferenceSignal ? "medium" : "low",
    engineVersion: ENGINE_VERSION
  };
}

function isLikelyCaseDocument(doc = {}) {
  const blob = lower(
    [
      getAuthorityType(doc),
      doc.source,
      doc.originalSource,
      doc.original_source,
      getDocPath(doc),
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.text,
      doc.content,
      doc.excerpt
    ]
      .filter(Boolean)
      .join(" ")
  );

  return (
    isCourtAuthority(getAuthorityType(doc)) ||
    blob.includes("cta") ||
    blob.includes("court of tax appeals") ||
    blob.includes("supreme court") ||
    blob.includes("g.r. no.") ||
    blob.includes("g.r no.") ||
    blob.includes("ca-g.r.") ||
    blob.includes("v. cir") ||
    blob.includes(" vs ") ||
    blob.includes(" v. ")
  );
}

function extractCaseTitle(doc = {}) {
  const candidates = [
    doc.metadata?.documentTitle,
    doc.metadata?.originalFileName,
    doc.title,
    doc.originalSource,
    doc.original_source,
    doc.source,
    doc.path,
    doc.metadata?.path
  ].filter(Boolean);

  const raw = String(candidates[0] || "Unidentified Case")
    .replace(/\.(pdf|docx|doc|txt)$/i, "")
    .replace(/_/g, " ")
    .trim();

  return raw || "Unidentified Case";
}

function extractCaseNamesFromQuestion(question = "") {
  const q = normalizeText(question);
  const results = [];

  const vMatch = q.match(
    /\b([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)\s+(?:v\.|vs\.?|versus)\s+([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)(?=[,.;?)]|\s+G\.?R\.?|\s+CTA|\s+in\s+|$)/i
  );

  if (vMatch) {
    results.push(normalizeText(`${vMatch[1]} v. ${vMatch[2]}`));
    results.push(normalizeText(vMatch[1]));
    results.push(normalizeText(vMatch[2]));
  }

  const grMatch = q.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (grMatch) results.push(`g.r. no. ${grMatch[1]}`);

  const ctaMatch =
    q.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i) ||
    q.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i);
  if (ctaMatch) results.push(`cta ${ctaMatch[1]}`);

  return [...new Set(results.map((item) => lower(item)).filter(Boolean))];
}

function tokenizeIssue(text = "") {
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
    "under"
  ]);

  return lower(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function extractIssueSignals(question = "") {
  const q = lower(question);
  const signals = new Set();

  const issueGroups = [
    {
      signal: "VAT_LIABILITY",
      patterns: [/\bvat\b/, /\bvalue added tax\b/, /\boutput vat\b/, /\bvatable\b/, /\bzero-rated\b/, /\bexempt\b/]
    },
    {
      signal: "VAT_REFUND",
      patterns: [/\brefund\b/, /\btax credit certificate\b/, /\btcc\b/, /\b120\+30\b/, /\badministrative claim\b/, /\bjudicial claim\b/, /\bunutilized input vat\b/]
    },
    {
      signal: "WITHHOLDING",
      patterns: [/\bwithholding\b/, /\bewt\b/, /\bexpanded withholding\b/, /\bfinal withholding\b/]
    },
    {
      signal: "INCOME_TAX",
      patterns: [/\bincome tax\b/, /\brcit\b/, /\bmcit\b/, /\bnolco\b/, /\bdeductible\b/, /\bnon-deductible\b/]
    },
    {
      signal: "ASSESSMENT",
      patterns: [/\bloa\b/, /\bletter of authority\b/, /\bpan\b/, /\bfan\b/, /\bfld\b/, /\bdue process\b/, /\bassessment\b/, /\bprotest\b/]
    },
    {
      signal: "PROCEDURAL",
      patterns: [/\bprescription\b/, /\bprescriptive\b/, /\bstatute of limitations\b/, /\bthree-year\b/, /\bten-year\b/]
    },
    {
      signal: "DOCTRINE",
      patterns: [/\btax evasion\b/, /\bfraud\b/, /\bwillful\b/, /\btax avoidance\b/, /\btax planning\b/, /\bsham\b/]
    },
    {
      signal: "CONTRACT",
      patterns: [/\bcontract\b/, /\bagreement\b/, /\blease\b/, /\bconcession\b/]
    },
    {
      signal: "TRANSACTION",
      patterns: [/\bprincipal\b/, /\bagent\b/, /\bpass-through\b/, /\breimbursement\b/, /\bbundled\b/, /\beconomic substance\b/]
    }
  ];

  for (const group of issueGroups) {
    if (group.patterns.some((pattern) => pattern.test(q))) {
      signals.add(group.signal);
    }
  }

  return [...signals];
}

function detectDocIssueSignals(doc = {}) {
  return extractIssueSignals(getDocText(doc));
}

function detectDocLegalDimensions(doc = {}) {
  const text = lower(getDocText(doc));
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(/\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax|gross income|gross receipts)\b/i.test(text), "SUBSTANTIVE");
  push(/\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy|protest|prescription)\b/i.test(text), "PROCEDURAL");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|supporting documents)\b/i.test(text), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(text), "JURISDICTIONAL");
  push(/\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(text), "TEMPORAL");
  push(/\b(transaction|actual circumstances|facts|factual|actual facts)\b/i.test(text), "FACTUAL");
  push(/\b(contract|agreement|clause|lease|concession)\b/i.test(text), "CONTRACTUAL");
  push(/\b(economic substance|substance over form|sham|simulation)\b/i.test(text), "ECONOMIC_SUBSTANCE");

  return unique(dimensions.length ? dimensions : ["GENERAL"]);
}

function caseMatchesIssueClassification(doc = {}, issueClassification = {}, query = "") {
  if (!isLikelyCaseDocument(doc)) {
    return {
      matched: false,
      reason: "Document is not a court authority or recognizable case document.",
      score: 0
    };
  }

  const caseNameNeedles = extractCaseNamesFromQuestion(query);
  const haystack = lower(
    [
      extractCaseTitle(doc),
      doc.source,
      doc.originalSource,
      doc.original_source,
      getDocPath(doc),
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.text,
      doc.content,
      doc.excerpt
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (
    caseNameNeedles.length &&
    caseNameNeedles.some((needle) => haystack.includes(needle))
  ) {
    return {
      matched: true,
      reason: "Specific case name or case reference requested by the user.",
      score: 100
    };
  }

  const profile = normalizeIssueClassification(issueClassification, query);
  const docIssues = detectDocIssueSignals(doc).map(normalizeIssue);
  const docDimensions = detectDocLegalDimensions(doc).map(normalizeDimension);

  const issueMatch =
    profile.primaryIssue === "GENERAL" ||
    docIssues.includes(profile.primaryIssue) ||
    safeArray(profile.subIssues).some((issue) => docIssues.includes(normalizeIssue(issue)));

  const dimensionMatch =
    !safeArray(profile.legalDimensions).length ||
    profile.legalDimensions.includes("GENERAL") ||
    docDimensions.includes("GENERAL") ||
    safeArray(profile.legalDimensions).some((dimension) =>
      docDimensions.includes(normalizeDimension(dimension))
    );

  let score = 0;

  if (issueMatch) score += 55;
  if (dimensionMatch) score += 30;
  if (docIssues.includes(profile.primaryIssue)) score += 25;

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    docIssues.includes("VAT_REFUND") &&
    !profile.subIssues.includes("VAT_REFUND")
  ) {
    score -= 90;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    docIssues.includes("VAT_LIABILITY") &&
    !profile.subIssues.includes("VAT_LIABILITY")
  ) {
    score -= 70;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    (docIssues.includes("VAT_REFUND") || docIssues.includes("VAT_LIABILITY"))
  ) {
    score -= 70;
  }

  const matched = issueMatch && dimensionMatch && score >= 55;

  return {
    matched,
    reason: matched
      ? "Case matches the classified legal issue and legal dimension."
      : "Case does not sufficiently match the classified issue and legal dimension.",
    score,
    profile,
    docIssues,
    docDimensions,
    issueMatch,
    dimensionMatch
  };
}

function buildIssueRelevanceScore(doc = {}, query = "", issueClassification = null) {
  const match = caseMatchesIssueClassification(doc, issueClassification, query);
  const qTokens = new Set(tokenizeIssue(query));
  const text = lower(getDocText(doc));

  let score = match.score;

  for (const token of qTokens) {
    if (text.includes(token)) score += 2;
  }

  return score;
}

function isIssueRelevantCase(doc = {}, query = "", minimumScore = 55, issueClassification = null) {
  const match = caseMatchesIssueClassification(doc, issueClassification, query);
  return match.matched && match.score >= minimumScore;
}

function scoreCaseDoc(doc = {}, query = "", issueClassification = null) {
  const text = lower(getDocText(doc));
  const path = lower(getDocPath(doc));
  const authorityType = String(getAuthorityType(doc)).toUpperCase();
  const issueMatch = caseMatchesIssueClassification(doc, issueClassification, query);

  let score = Number(
    doc.rerankScore ||
      doc.retrievalScore ||
      doc.finalScore ||
      doc.combined_score ||
      doc.score ||
      0
  );

  if (isLikelyCaseDocument(doc)) score += 30;
  if (issueMatch.matched) score += issueMatch.score;

  if (authorityType === "SUPREME_COURT") score += 45;
  if (authorityType === "CTA_EN_BANC") score += 38;
  if (authorityType === "COURT_OF_APPEALS") score += 32;
  if (authorityType === "CTA_DIVISION") score += 26;
  if (path.includes("court_cases")) score += 18;
  if (path.includes("cta")) score += 10;
  if (path.includes("supreme court")) score += 14;

  const caseTerms = [
    "facts",
    "issue",
    "ruling",
    "held",
    "doctrine",
    "petitioner",
    "respondent",
    "court held",
    "the issue",
    "the ruling",
    "ratio",
    "dispositive"
  ];

  for (const term of caseTerms) {
    if (text.includes(term)) score += 2;
  }

  return score;
}

function selectTopCaseAuthorities(results = [], query = "", limit = 4, issueClassification = null) {
  const caseNameNeedles = extractCaseNamesFromQuestion(query);
  const hasSpecificCaseRequest = caseNameNeedles.length > 0;
  const minimumScore = hasSpecificCaseRequest ? 35 : 55;

  return rerankByHierarchy(results, query)
    .filter((doc) => isLikelyCaseDocument(doc))
    .map((doc) => {
      const classificationMatch = caseMatchesIssueClassification(doc, issueClassification, query);

      return {
        ...doc,
        issueClassificationMatch: classificationMatch,
        caseScore: scoreCaseDoc(doc, query, issueClassification),
        issueRelevanceScore: buildIssueRelevanceScore(doc, query, issueClassification)
      };
    })
    .filter((doc) => doc.issueClassificationMatch?.matched)
    .filter((doc) => Number(doc.issueRelevanceScore || 0) >= minimumScore)
    .sort((a, b) => b.caseScore - a.caseScore)
    .slice(0, limit);
}

function selectRelevantBIRAuthorities(results = [], query = "", limit = 3, issueClassification = null) {
  const qTokens = new Set(tokenizeIssue(query));
  const profile = normalizeIssueClassification(issueClassification, query);

  return rerankByHierarchy(results, query)
    .filter((doc) => isBIRAuthority(getAuthorityType(doc)))
    .map((doc) => {
      const text = lower(getDocText(doc));
      const docIssues = detectDocIssueSignals(doc).map(normalizeIssue);

      let issueScore = 0;

      if (docIssues.includes(profile.primaryIssue)) issueScore += 45;

      for (const issue of safeArray(profile.subIssues)) {
        if (docIssues.includes(normalizeIssue(issue))) issueScore += 18;
      }

      for (const token of qTokens) {
        if (text.includes(token)) issueScore += 2;
      }

      return {
        ...doc,
        issueRelevanceScore: issueScore,
        issueClassificationMatch: {
          matched: issueScore >= 18,
          profile,
          docIssues
        }
      };
    })
    .filter((doc) => doc.issueRelevanceScore >= 18)
    .slice(0, limit);
}

function filterOverriddenBirDocs(caseDocs = [], birDocs = []) {
  if (!caseDocs.length || !birDocs.length) return birDocs;

  return birDocs.filter((birDoc) => {
    for (const caseDoc of caseDocs) {
      if (!isGenuineConflict(caseDoc, birDoc)) continue;

      const override = resolveCourtOverride(caseDoc, birDoc);

      if (override?.overrideApplies && override.overriddenSource === birDoc) {
        return false;
      }
    }

    return true;
  });
}

function buildCourtOverrideAudit(caseDocs = [], birDocs = []) {
  const records = [];

  for (const caseDoc of caseDocs) {
    for (const birDoc of birDocs) {
      if (!isGenuineConflict(caseDoc, birDoc)) continue;

      const override = resolveCourtOverride(caseDoc, birDoc);

      if (override?.overrideApplies) {
        records.push({
          controllingAuthority: override.winningAuthority || null,
          controllingSource: getDocPath(override.winningSource || {}),
          overriddenAuthority: override.overriddenAuthority || null,
          overriddenSource: getDocPath(override.overriddenSource || {}),
          reason: override.reason || "Court override applied."
        });
      }
    }
  }

  const seen = new Set();

  return records.filter((item) => {
    const key = [
      item.controllingAuthority,
      item.controllingSource,
      item.overriddenAuthority,
      item.overriddenSource
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildConflictReviewText(docs = []) {
  const reviews = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const review = analyzeConflictPair(docs[i], docs[j]);

      if (review?.conflict || review?.apparentConflict) {
        reviews.push(review);
      }
    }
  }

  if (!reviews.length) {
    return "No direct doctrinal or hierarchy conflict was detected among the issue-relevant authorities.";
  }

  return reviews
    .slice(0, 4)
    .map((item, index) =>
      [
        `Conflict Review ${index + 1}:`,
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

function buildCasePrompt({
  question = "",
  strictContext = "",
  topLegalBases = [],
  hierarchyConflict = null,
  overrideAudit = [],
  jurisprudencePayload = null,
  issueClassification = null,
  issueRelevantCaseCount = 0,
  rejectedCaseCount = 0
}) {
  const legalBasesText =
    topLegalBases.length > 0
      ? topLegalBases
          .map(
            (item, index) =>
              `${index + 1}. [${item.authorityLabel || item.authorityType || "Authority"}] ${item.source || getDocPath(item)}\nExcerpt: ${item.excerpt || getDocText(item).slice(0, 600)}`
          )
          .join("\n\n")
      : "No controlling legal basis found.";

  const conflictText = hierarchyConflict?.conflict
    ? [
        `Conflict Type: ${hierarchyConflict.conflictType || "N/A"}`,
        `Doctrinal Conflict: ${hierarchyConflict.doctrinalConflict ? "YES" : "NO"}`,
        `Hierarchy Conflict: ${hierarchyConflict.hierarchyConflict ? "YES" : "NO"}`,
        `Exact Issue: ${hierarchyConflict.exactIssue || "N/A"}`,
        `Exact Legal Dimension: ${hierarchyConflict.exactLegalDimension || "N/A"}`,
        hierarchyConflict.controllingAuthority
          ? `Controlling Authority: ${hierarchyConflict.controllingAuthority}`
          : null,
        hierarchyConflict.reason ? `Reason: ${hierarchyConflict.reason}` : null
      ]
        .filter(Boolean)
        .join("\n")
    : hierarchyConflict?.apparentConflict
      ? [
          "Conflict Type: APPARENT_OR_DISTINGUISHABLE_ONLY",
          "Doctrinal Conflict: NO",
          "Hierarchy Conflict: NO",
          hierarchyConflict.reason ? `Reason: ${hierarchyConflict.reason}` : null
        ]
          .filter(Boolean)
          .join("\n")
      : "No direct doctrinal or hierarchy conflict detected.";

  const overrideText = overrideAudit.length
    ? overrideAudit
        .map((item, index) =>
          [
            `Override ${index + 1}:`,
            `Controlling Authority: ${item.controllingAuthority || "Unknown"}`,
            `Controlling Source: ${item.controllingSource || "Unknown"}`,
            `Overridden Authority: ${item.overriddenAuthority || "Unknown"}`,
            `Overridden Source: ${item.overriddenSource || "Unknown"}`,
            `Reason: ${item.reason || "Court override applied."}`
          ].join("\n")
        )
        .join("\n\n")
    : "No court override audit records.";

  return `
You are TINA, a Philippine tax researcher, tax analyst, and legal researcher.

CORE RULE:
Never merely retrieve or enumerate cases.
Only use cases that match the classified legal issue, legal dimension, case role, and applicability.

ISSUE CLASSIFICATION:
${JSON.stringify(issueClassification || {}, null, 2)}

STRICT RULES:
1. Use only the supplied context.
2. Do not invent case names, facts, issues, doctrines, sections, GR numbers, CTA case numbers, or holdings.
3. If the context is insufficient for a proper case breakdown, say so clearly.
4. Do not cite a case merely because it mentions VAT, income tax, withholding tax, or another broad tax type.
5. For each case cited, explain:
   - legal issue;
   - doctrine;
   - case role;
   - applicability to the user's classified issue.
6. Exclude unrelated cases and do not mention them as support.
7. Organize retrieved sources using TINA hierarchy.
8. If a court decision genuinely conflicts with a BIR issuance, controlling judicial doctrine prevails.
9. Different procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, or administrative rules are not direct doctrinal conflicts unless they contradict on the same legal issue.
10. Never use vague conflict language.
11. Never mention ChatGPT.

CASE RELEVANCE AUDIT:
Issue-relevant cases selected: ${issueRelevantCaseCount}
Potential case documents rejected for weak classified-issue relevance: ${rejectedCaseCount}

REQUIRED OUTPUT FORMAT:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

QUESTION:
${question}

TOP LEGAL BASES:
${legalBasesText}

JURISPRUDENCE ENGINE PAYLOAD:
${jurisprudencePayload?.promptBlock || "No jurisprudence payload."}

CONFLICT STATUS:
${conflictText}

COURT OVERRIDE AUDIT:
${overrideText}

CONTEXT:
${strictContext}
`.trim();
}

function countRejectedCases(activeDocs = [], selectedCaseDocs = [], query = "", issueClassification = null) {
  const selectedPaths = new Set(selectedCaseDocs.map((doc) => getDocPath(doc)));

  return activeDocs.filter((doc) => {
    if (!isLikelyCaseDocument(doc)) return false;
    if (selectedPaths.has(getDocPath(doc))) return false;

    const match = caseMatchesIssueClassification(doc, issueClassification, query);
    return !match.matched;
  }).length;
}

async function generateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null,
  jurisprudenceCases: preselectedJurisprudenceCases = []
}) {
  const effectiveIssueClassification = normalizeIssueClassification(
    issueClassification,
    question,
    adaptiveContext
  );

  const reranked = rerankByHierarchy(safeArray(retrievedResults), question);
  const supersessionResult = applySupersessionFilter(reranked);

  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : reranked;

  const jurisprudenceCases =
    safeArray(preselectedJurisprudenceCases).length > 0
      ? safeArray(preselectedJurisprudenceCases)
      : selectIssueRelevantJurisprudence({
          query: question,
          docs: activeDocs,
          limit: 4,
          responseMode,
          adaptiveContext,
          issueClassification: effectiveIssueClassification,
          includeDistinguishable: true,
          includeBackground: false
        });

  const filteredJurisprudenceCases = jurisprudenceCases.filter((doc) => {
    if (
      [
        APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,
        APPLICABILITY_STATUS.PERSUASIVE_AUTHORITY,
        APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT
      ].includes(doc.caseApplicability)
    ) {
      return true;
    }

    return caseMatchesIssueClassification(doc, effectiveIssueClassification, question).matched;
  });

  const caseDocs =
    filteredJurisprudenceCases.length > 0
      ? filteredJurisprudenceCases
      : selectTopCaseAuthorities(activeDocs, question, 4, effectiveIssueClassification);

  const rejectedCaseCount = countRejectedCases(
    activeDocs,
    caseDocs,
    question,
    effectiveIssueClassification
  );

  const rawBirDocs = selectRelevantBIRAuthorities(
    activeDocs,
    question,
    3,
    effectiveIssueClassification
  );

  const birDocs = filterOverriddenBirDocs(caseDocs, rawBirDocs);

  const jurisprudencePayload = buildJurisprudencePayload({
    query: question,
    cases: caseDocs,
    supportingAuthorities: birDocs
  });

  const doctrinalReview = reconcileDoctrine({
    rankedDocs: [...caseDocs, ...birDocs],
    maxDocs: 5
  });

  const conflictDocs = [...caseDocs, ...birDocs];
  const hierarchyConflict = detectHierarchyConflict(conflictDocs.slice(0, 5));

  const topLegalBases = selectTopLegalBases(conflictDocs, 3);
  const overrideAudit = buildCourtOverrideAudit(caseDocs, rawBirDocs);
  const conflictReviewText = buildConflictReviewText(conflictDocs);

  if (caseDocs.length === 0) {
    return {
      success: true,
      answer:
        "A. DIRECT ANSWER\nNo issue-relevant case authority was retrieved from the indexed context.\n\nB. CONTROLLING LEGAL BASIS\nThe indexed context did not retrieve a case directly addressing the classified legal issue.\n\nC. SUPPORTING JURISPRUDENCE\nNo directly issue-relevant case was retrieved. TINA should not cite unrelated jurisprudence merely because it mentions the same tax type.\n\nD. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo doctrinal conflict can be determined because no issue-relevant case authority was retrieved.\n\nE. HIERARCHY ANALYSIS\nNo hierarchy comparison can be made without a retrieved controlling or supporting authority.\n\nF. PRACTICAL APPLICATION\nVerify against the exact Supreme Court, CTA, NIRC, and BIR authorities before relying on a litigation or audit position.",
      mode: "CASE_ANALYSIS",
      sourcesUsed: [],
      caseDocs: [],
      birDocs: [],
      validation: null,
      doctrinalReview,
      hierarchyConflict,
      overrideAudit,
      supersessionResult,
      jurisprudencePayload,
      issueClassification: effectiveIssueClassification,
      rejectedCaseCount,
      engineVersion: ENGINE_VERSION
    };
  }

  const strictContext = [
    ...caseDocs.map((doc, index) =>
      [
        `COURT SOURCE ${index + 1}: ${extractCaseTitle(doc)}`,
        `PATH: ${getDocPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityType(doc)}`,
        `AUTHORITY LEVEL: ${getAuthorityLevel(doc)}`,
        `CASE ROLE: ${doc.caseRole || CASE_ROLE?.PERSUASIVE || "N/A"}`,
        `CASE APPLICABILITY: ${doc.caseApplicability || "N/A"}`,
        `CASE APPLICABILITY EXPLANATION: ${doc.caseApplicabilityExplanation || "N/A"}`,
        `ISSUE CLASSIFICATION MATCH: ${JSON.stringify(doc.issueClassificationMatch || caseMatchesIssueClassification(doc, effectiveIssueClassification, question))}`,
        "TEXT:",
        getDocText(doc)
      ].join("\n")
    ),
    ...birDocs.map((doc, index) =>
      [
        `BIR SOURCE ${index + 1}: ${doc.source || doc.originalSource || doc.original_source || "Unknown BIR Source"}`,
        `PATH: ${getDocPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityType(doc)}`,
        `AUTHORITY LEVEL: ${getAuthorityLevel(doc)}`,
        `ISSUE CLASSIFICATION MATCH: ${JSON.stringify(doc.issueClassificationMatch || {})}`,
        "TEXT:",
        getDocText(doc)
      ].join("\n")
    ),
    "CONFLICT REVIEW:",
    conflictReviewText
  ].join("\n\n---\n\n");

  const prompt = buildCasePrompt({
    question,
    strictContext,
    topLegalBases,
    hierarchyConflict,
    overrideAudit,
    jurisprudencePayload,
    issueClassification: effectiveIssueClassification,
    issueRelevantCaseCount: caseDocs.length,
    rejectedCaseCount
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Analyze this Philippine tax case question strictly from the supplied classified-issue-relevant context:\n${question}`
      }
    ]
  });

  let answerText = response.choices?.[0]?.message?.content?.trim() || "";

  const validationEvidence = [...caseDocs, ...birDocs];
  const claimSupportMap = buildClaimSupportMap(answerText, validationEvidence);

  const validation = validateEvidenceSufficiency({
    evidence: validationEvidence,
    claimSupportMap,
    minEvidenceCount: 1,
    minSupportedClaims: 1,
    minTopScore: 0.2,
    query: question,
    requirePrimaryAuthority: false
  });

  if (
    !answerText ||
    shouldRejectForWeakLegalBasis({
      validation,
      hasExactCitation: false
    })
  ) {
    answerText = buildNoSourceReply();
  }

  return {
    success: true,
    answer: answerText,
    mode: "CASE_ANALYSIS",
    responseMode,
    sourcesUsed: [...caseDocs, ...birDocs].slice(0, 5).map(buildDisplaySource),
    caseDocs,
    birDocs,
    validation,
    doctrinalReview,
    hierarchyConflict,
    overrideAudit,
    supersessionResult,
    jurisprudencePayload,
    issueClassification: effectiveIssueClassification,
    rejectedCaseCount,
    engineVersion: ENGINE_VERSION
  };
}

async function maybeGenerateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {},
  issueClassification = null,
  jurisprudenceCases = []
}) {
  const intent = detectCaseAnalysisIntent(question);

  if (!intent.isCaseAnalysis) {
    return {
      handled: false,
      answer: "",
      mode: null,
      sourcesUsed: [],
      caseDocs: [],
      birDocs: [],
      validation: null,
      doctrinalReview: null,
      hierarchyConflict: null,
      overrideAudit: [],
      supersessionResult: null,
      jurisprudencePayload: null,
      issueClassification:
        issueClassification ||
        adaptiveContext?.issueClassification ||
        null,
      engineVersion: ENGINE_VERSION
    };
  }

  const result = await generateCaseAnalysisAnswer({
    openai,
    question,
    retrievedResults,
    model,
    responseMode,
    adaptiveContext,
    issueClassification,
    jurisprudenceCases
  });

  return {
    handled: true,
    ...result,
    intent
  };
}

function caseAnalysisHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CASE_ANALYSIS_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    jurisprudenceEngineCompatible: true,
    supersessionCompatible: true,
    conflictEngineCompatible: true,
    legalValidationCompatible: true,
    doctrinalEngineCompatible: true,
    ragAnswerHandlerCompatible: true,
    issueClassificationCompatible: true,
    unrelatedJurisprudenceBlocked: true
  };
}

export {
  ENGINE_VERSION,
  detectCaseAnalysisIntent,
  selectTopCaseAuthorities,
  caseMatchesIssueClassification,
  generateCaseAnalysisAnswer,
  maybeGenerateCaseAnalysisAnswer,
  caseAnalysisHealthCheck
};

export default {
  ENGINE_VERSION,
  detectCaseAnalysisIntent,
  selectTopCaseAuthorities,
  caseMatchesIssueClassification,
  generateCaseAnalysisAnswer,
  maybeGenerateCaseAnalysisAnswer,
  caseAnalysisHealthCheck
};
