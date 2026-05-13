// FILE: jurisprudence-engine.js

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { analyzeConflictPair } from "./conflict-engine.js";
import { rerankForTina } from "./reranker-engine.js";
import { analyzeQueryIntent, ISSUE_TYPE, LEGAL_DIMENSION } from "./query-intent-engine.js";

const COURT_AUTHORITY_TYPES = [
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
];

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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
      doc.title,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    "Unknown source"
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.title ||
    doc.source ||
    doc.originalSource ||
    sourcePathOf(doc)
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

  if (/\b(taxable|liable|subject to|exempt|zero-rated|deductible|gross income|output vat|income tax|withholding tax|tax base|tax rate)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.SUBSTANTIVE);
  }

  if (/\b(file|filing|deadline|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|return|remedy)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.PROCEDURAL);
  }

  if (/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records|books)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.EVIDENTIARY);
  }

  if (/\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30|court has no jurisdiction)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.JURISDICTIONAL);
  }

  if (/\b(effective|effectivity|retroactive|prospective|taxable year|transition|amended|repealed|superseded)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.TEMPORAL);
  }

  if (/\b(facts|factual|actual circumstances|transaction|documentation)\b/i.test(value)) {
    dimensions.push(LEGAL_DIMENSION.FACTUAL);
  }

  return unique(dimensions.length ? dimensions : [LEGAL_DIMENSION.GENERAL]);
}

function detectTaxIssueSignals(text = "") {
  const value = lower(text);
  const signals = [];

  if (/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.VAT_REFUND);
  }

  if (/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross receipts|gross selling price)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.VAT_LIABILITY);
  }

  if (/\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.EVIDENTIARY);
  }

  if (/\b(jurisdiction|jurisdictional|condition precedent|120\+30|cta)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.JURISDICTIONAL);
  }

  if (/\b(assessment|loa|pan|fan|protest|appeal|prescription|prescriptive)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.ASSESSMENT);
  }

  if (/\b(withholding|ewt|cwt|fwt|2307)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.WITHHOLDING_TAX);
  }

  if (/\b(income tax|rcit|mcit|nolco|deductible|gross income|taxable income)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.INCOME_TAX);
  }

  if (/\b(tax avoidance|tax evasion|substance over form|business purpose|economic substance|fraud)\b/i.test(value)) {
    signals.push(ISSUE_TYPE.DOCTRINE);
  }

  return unique(signals);
}

function hasIssueMismatch(queryIntent = {}, doc = {}) {
  const queryIssues = queryIntent.issueTypes || [];
  const docIssues = detectTaxIssueSignals(docText(doc));

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

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return false;
  if (a.includes(LEGAL_DIMENSION.GENERAL) || b.includes(LEGAL_DIMENSION.GENERAL)) return true;
  return a.some((item) => b.includes(item));
}

function computeCaseApplicabilityScore({
  query = "",
  queryIntent = null,
  doc = {}
}) {
  const intent = queryIntent || analyzeQueryIntent(query);
  const text = docText(doc);

  const querySignals = intent.issueTypes || [];
  const docSignals = detectTaxIssueSignals(text);

  const queryDimensions = intent.legalDimensions || [];
  const docDimensions = detectCaseIssueDimensions(text);

  let score = 0;

  for (const signal of querySignals) {
    if (docSignals.includes(signal)) score += 18;
  }

  if (dimensionsOverlap(queryDimensions, docDimensions)) score += 22;

  const queryTokens = lower(query)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  const docBlob = lower(text);

  for (const token of unique(queryTokens)) {
    if (docBlob.includes(token)) score += 2;
  }

  if (hasIssueMismatch(intent, doc)) score -= 45;

  const type = getAuthorityTypeForDoc(doc);

  if (type === "SUPREME_COURT") score += 30;
  if (type === "CTA_EN_BANC") score += 18;
  if (type === "COURT_OF_APPEALS") score += 14;
  if (type === "CTA_DIVISION") score += 10;

  if (extractCaseReference(query)) {
    const ref = lower(extractCaseReference(query) || "");
    if (lower(text).includes(ref) || lower(sourceTitleOf(doc)).includes(ref)) {
      score += 60;
    }
  }

  return Number(Math.max(0, score).toFixed(4));
}

function classifyApplicability(score = 0, queryIntent = {}, doc = {}) {
  if (hasIssueMismatch(queryIntent, doc)) {
    return {
      status: "NOT_APPLICABLE_ISSUE_MISMATCH",
      explanation:
        "The case appears to involve a different legal issue, such as VAT refund procedure instead of VAT liability, or vice versa."
    };
  }

  if (score >= 70) {
    return {
      status: "DIRECTLY_APPLICABLE",
      explanation:
        "The case addresses the same tax issue and same legal dimension as the user's question."
    };
  }

  if (score >= 40) {
    return {
      status: "DISTINGUISHABLE_BUT_RELEVANT",
      explanation:
        "The case is related but must be limited to its own facts or legal dimension."
    };
  }

  return {
    status: "WEAK_OR_BACKGROUND_ONLY",
    explanation:
      "The case may mention a related tax type but does not sufficiently address the exact issue."
  };
}

export function selectIssueRelevantJurisprudence({
  query = "",
  docs = [],
  limit = 4
} = {}) {
  const queryIntent = analyzeQueryIntent(query);

  const { results: reranked } = rerankForTina({
    query,
    docs: rerankByHierarchy(docs, query),
    limit: Math.max(limit * 4, 16),
    suppressIssueMismatch: true,
    suppressWeakSecondary: true
  });

  return reranked
    .filter(isCourtAuthority)
    .map((doc) => {
      const applicabilityScore = computeCaseApplicabilityScore({
        query,
        queryIntent,
        doc
      });

      const applicability = classifyApplicability(applicabilityScore, queryIntent, doc);

      return {
        ...doc,
        caseReference: extractCaseReference(docText(doc)) || extractCaseReference(sourceTitleOf(doc)),
        caseApplicabilityScore: applicabilityScore,
        caseApplicability: applicability.status,
        caseApplicabilityExplanation: applicability.explanation,
        caseIssueSignals: detectTaxIssueSignals(docText(doc)),
        caseLegalDimensions: detectCaseIssueDimensions(docText(doc))
      };
    })
    .filter((doc) =>
      ["DIRECTLY_APPLICABLE", "DISTINGUISHABLE_BUT_RELEVANT"].includes(
        doc.caseApplicability
      )
    )
    .sort((a, b) => {
      if (b.caseApplicabilityScore !== a.caseApplicabilityScore) {
        return b.caseApplicabilityScore - a.caseApplicabilityScore;
      }

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);

      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return getAuthorityLevelForDoc(a) - getAuthorityLevelForDoc(b);
    })
    .slice(0, limit);
}

export function buildJurisprudenceApplicabilitySummary({
  query = "",
  cases = []
} = {}) {
  if (!cases.length) {
    return "No issue-relevant jurisprudence was selected. TINA should not cite cases merely because they mention the same tax type.";
  }

  return cases
    .map((doc, index) =>
      [
        `${index + 1}. ${sourceTitleOf(doc)}`,
        `Authority: ${getAuthorityTypeForDoc(doc)} / Level ${getAuthorityLevelForDoc(doc)}`,
        `Case Reference: ${doc.caseReference || "Not clearly extracted"}`,
        `Applicability: ${doc.caseApplicability}`,
        `Applicability Analysis: ${doc.caseApplicabilityExplanation}`,
        `Issue Signals: ${(doc.caseIssueSignals || []).join(", ") || "N/A"}`,
        `Legal Dimensions: ${(doc.caseLegalDimensions || []).join(", ") || "N/A"}`,
        `Excerpt: ${normalizeText(doc.text || doc.excerpt || "").slice(0, 600)}`
      ].join("\n")
    )
    .join("\n\n");
}

export function analyzeJurisprudenceConflicts({
  cases = [],
  supportingAuthorities = []
} = {}) {
  const docs = [...cases, ...supportingAuthorities].filter(Boolean);
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
    return {
      conflict: false,
      explanation:
        "No direct jurisprudential conflict detected. If cases address different VAT procedural requirements, such as substantiation, administrative claim timing, or judicial claim timing, they are complementary or distinguishable rather than conflicting.",
      reviews: []
    };
  }

  return {
    conflict: reviews.some((item) => item.conflict),
    explanation: reviews
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
          `Resolution Basis: ${item.resolutionBasis || item.reason || "Not determined"}`
        ].join("\n")
      )
      .join("\n\n"),
    reviews
  };
}

export function buildJurisprudencePromptBlock({
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

  return [
    "JURISPRUDENCE APPLICABILITY REVIEW",
    summary,
    "",
    "JURISPRUDENCE CONFLICT REVIEW",
    conflictReview.explanation
  ].join("\n");
}

export function buildNoJurisprudenceText() {
  return "No directly issue-relevant jurisprudence was retrieved. TINA should not cite unrelated cases merely because they mention the same tax type.";
}

export default {
  selectIssueRelevantJurisprudence,
  buildJurisprudenceApplicabilitySummary,
  analyzeJurisprudenceConflicts,
  buildJurisprudencePromptBlock,
  buildNoJurisprudenceText
};
