// FILE: jurisprudence-engine.js
"use strict";

/**
 * jurisprudence-engine.js
 * TINA Enterprise Jurisprudence Intelligence Engine
 *
 * PURPOSE
 * - issue-specific jurisprudence selection
 * - doctrinal applicability analysis
 * - hierarchy-aware jurisprudence routing
 * - conflict analysis
 * - doctrine extraction
 * - litigation-grade jurisprudence controls
 * - adaptive orchestration compatibility
 *
 * COMPATIBLE WITH
 * - ask-handler.js
 * - rag-answer-handler.js
 * - adaptive-response-planner.js
 * - answer-renderer.js
 * - reranker-engine.js
 * - supersession-engine.js
 * - doctrine-engine.js
 * - adaptive-mode-engine.js
 * - risk-scoring-engine.js
 * - position-strength-engine.js
 */

const {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} = require("./authority-engine.js");

const {
  analyzeConflictPair
} = require("./conflict-engine.js");

const {
  rerankForTina
} = require("./reranker-engine.js");

const {
  analyzeQueryIntent,
  ISSUE_TYPE,
  LEGAL_DIMENSION
} = require("./query-intent-engine.js");

const {
  applySupersessionFilter
} = require("./supersession-engine.js");

const ENGINE_VERSION = "3.0.0";

const COURT_AUTHORITY_TYPES = Object.freeze([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const APPLICABILITY_STATUS = Object.freeze({
  DIRECTLY_APPLICABLE: "DIRECTLY_APPLICABLE",
  DISTINGUISHABLE_BUT_RELEVANT: "DISTINGUISHABLE_BUT_RELEVANT",
  BACKGROUND_ONLY: "BACKGROUND_ONLY",
  NOT_APPLICABLE_ISSUE_MISMATCH:
    "NOT_APPLICABLE_ISSUE_MISMATCH"
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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
  return COURT_AUTHORITY_TYPES.includes(
    getAuthorityTypeForDoc(doc)
  );
}

function extractCaseReference(text = "") {
  const value = normalizeText(text);

  const gr = value.match(
    /\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );

  if (gr) {
    return `G.R. No. ${gr[1]}`;
  }

  const cta =
    value.match(
      /\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i
    ) ||
    value.match(
      /\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i
    );

  if (cta) {
    return `CTA ${cta[1]}`;
  }

  const ca = value.match(
    /\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );

  if (ca) {
    return `CA-G.R. ${ca[1]}`;
  }

  const caseName = value.match(
    /\b([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)\s+(?:v\.|vs\.?|versus)\s+([A-Z][A-Za-z0-9&.,'\-\s]{2,80}?)(?=[,.;?)]|\s+G\.?R\.?|\s+CTA|\s+CA-G\.?R\.?|$)/i
  );

  if (caseName) {
    return normalizeText(
      `${caseName[1]} v. ${caseName[2]}`
    );
  }

  return null;
}

function detectCaseIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  const push = (condition, dimension) => {
    if (condition) dimensions.push(dimension);
  };

  push(
    /\b(taxable|liable|subject to|exempt|zero-rated|deductible|output vat|income tax|withholding tax)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.SUBSTANTIVE
  );

  push(
    /\b(file|filing|deadline|period|administrative claim|judicial claim|appeal|assessment|loa|pan|fan|return|remedy)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.PROCEDURAL
  );

  push(
    /\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof|records)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.EVIDENTIARY
  );

  push(
    /\b(jurisdiction|jurisdictional|cta|condition precedent|120\+30)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.JURISDICTIONAL
  );

  push(
    /\b(effective|retroactive|prospective|transition|amended|repealed|superseded)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.TEMPORAL
  );

  push(
    /\b(transaction|actual circumstances|facts|factual)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.FACTUAL
  );

  push(
    /\b(contract|agreement|clause|lease)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.CONTRACTUAL
  );

  push(
    /\b(economic substance|substance over form|sham|simulation)\b/i.test(
      value
    ),
    LEGAL_DIMENSION.ECONOMIC_SUBSTANCE
  );

  return unique(
    dimensions.length
      ? dimensions
      : [LEGAL_DIMENSION.GENERAL]
  );
}

function detectTaxIssueSignals(text = "") {
  const value = lower(text);
  const signals = [];

  const push = (condition, issue) => {
    if (condition) signals.push(issue);
  };

  push(
    /\b(vat refund|input vat refund|tax credit certificate|120\+30|administrative claim|judicial claim|unutilized input vat)\b/i.test(
      value
    ),
    ISSUE_TYPE.VAT_REFUND
  );

  push(
    /\b(vat liability|output vat|subject to vat|vatable|gross receipts)\b/i.test(
      value
    ),
    ISSUE_TYPE.VAT_LIABILITY
  );

  push(
    /\b(invoice|receipt|substantiation|documentary|proof|evidence|burden of proof)\b/i.test(
      value
    ),
    ISSUE_TYPE.EVIDENTIARY
  );

  push(
    /\b(jurisdiction|jurisdictional|condition precedent|cta)\b/i.test(
      value
    ),
    ISSUE_TYPE.JURISDICTIONAL
  );

  push(
    /\b(assessment|loa|pan|fan|protest|appeal|prescription)\b/i.test(
      value
    ),
    ISSUE_TYPE.ASSESSMENT
  );

  push(
    /\b(withholding|ewt|cwt|fwt)\b/i.test(
      value
    ),
    ISSUE_TYPE.WITHHOLDING_TAX
  );

  push(
    /\b(income tax|rcit|mcit|nolco|deductible)\b/i.test(
      value
    ),
    ISSUE_TYPE.INCOME_TAX
  );

  push(
    /\b(substance over form|economic substance|tax avoidance|tax evasion)\b/i.test(
      value
    ),
    ISSUE_TYPE.DOCTRINE
  );

  push(
    /\b(principal vs agent|gross or net|pass-through|reimbursement|bundled)\b/i.test(
      value
    ),
    ISSUE_TYPE.TRANSACTION
  );

  push(
    /\b(contract|agreement|lease agreement|concession)\b/i.test(
      value
    ),
    ISSUE_TYPE.CONTRACT
  );

  return unique(signals);
}

function hasIssueMismatch(queryIntent = {}, doc = {}) {
  const queryIssues =
    safeArray(queryIntent.issueTypes);

  const docIssues =
    detectTaxIssueSignals(docText(doc));

  if (
    queryIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    ) &&
    docIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    ) &&
    !queryIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    )
  ) {
    return true;
  }

  if (
    queryIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    ) &&
    docIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    ) &&
    !queryIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    )
  ) {
    return true;
  }

  return false;
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) {
    return false;
  }

  if (
    a.includes(LEGAL_DIMENSION.GENERAL) ||
    b.includes(LEGAL_DIMENSION.GENERAL)
  ) {
    return true;
  }

  return a.some((item) => b.includes(item));
}

function extractDoctrineSignals(text = "") {
  const value = lower(text);
  const doctrines = [];

  const push = (condition, doctrine) => {
    if (condition) doctrines.push(doctrine);
  };

  push(
    /\bsubstance over form\b/i.test(value),
    "SUBSTANCE_OVER_FORM"
  );

  push(
    /\beconomic substance\b/i.test(value),
    "ECONOMIC_SUBSTANCE"
  );

  push(
    /\bstrictissimi juris\b/i.test(value),
    "STRICTISSIMI_JURIS"
  );

  push(
    /\bmutuality\b/i.test(value),
    "MUTUALITY_DOCTRINE"
  );

  push(
    /\bbeneficial use\b/i.test(value),
    "BENEFICIAL_USE"
  );

  push(
    /\bstrict interpretation\b/i.test(value),
    "STRICT_INTERPRETATION"
  );

  push(
    /\blifeblood doctrine\b/i.test(value),
    "LIFEBLOOD_DOCTRINE"
  );

  return unique(doctrines);
}

function computeCaseApplicabilityScore({
  query = "",
  queryIntent = null,
  doc = {}
}) {
  const intent =
    queryIntent ||
    analyzeQueryIntent(query);

  const text = docText(doc);

  const querySignals =
    safeArray(intent.issueTypes);

  const docSignals =
    detectTaxIssueSignals(text);

  const queryDimensions =
    safeArray(intent.legalDimensions);

  const docDimensions =
    detectCaseIssueDimensions(text);

  let score = 0;

  for (const signal of querySignals) {
    if (docSignals.includes(signal)) {
      score += 18;
    }
  }

  if (
    dimensionsOverlap(
      queryDimensions,
      docDimensions
    )
  ) {
    score += 22;
  }

  const queryTokens = lower(query)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  const docBlob = lower(text);

  for (const token of unique(queryTokens)) {
    if (docBlob.includes(token)) {
      score += 2;
    }
  }

  if (
    hasIssueMismatch(
      intent,
      doc
    )
  ) {
    score -= 45;
  }

  const type =
    getAuthorityTypeForDoc(doc);

  if (type === "SUPREME_COURT") score += 30;
  if (type === "CTA_EN_BANC") score += 18;
  if (type === "COURT_OF_APPEALS") score += 14;
  if (type === "CTA_DIVISION") score += 10;

  const queryReference =
    extractCaseReference(query);

  if (queryReference) {
    const ref = lower(queryReference);

    if (
      lower(text).includes(ref) ||
      lower(sourceTitleOf(doc)).includes(ref)
    ) {
      score += 60;
    }
  }

  return Number(
    Math.max(0, score).toFixed(4)
  );
}

function classifyApplicability(
  score = 0,
  queryIntent = {},
  doc = {}
) {
  if (
    hasIssueMismatch(
      queryIntent,
      doc
    )
  ) {
    return {
      status:
        APPLICABILITY_STATUS.NOT_APPLICABLE_ISSUE_MISMATCH,

      explanation:
        "The case addresses a different legal issue or legal dimension."
    };
  }

  if (score >= 70) {
    return {
      status:
        APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,

      explanation:
        "The case addresses the same tax issue and legal dimension."
    };
  }

  if (score >= 40) {
    return {
      status:
        APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT,

      explanation:
        "The case is relevant but requires factual or doctrinal distinction analysis."
    };
  }

  return {
    status:
      APPLICABILITY_STATUS.BACKGROUND_ONLY,

    explanation:
      "The case may involve the same tax type but does not directly resolve the issue presented."
  };
}

function enrichCaseMetadata({
  query = "",
  queryIntent = null,
  doc = {}
}) {
  const applicabilityScore =
    computeCaseApplicabilityScore({
      query,
      queryIntent,
      doc
    });

  const applicability =
    classifyApplicability(
      applicabilityScore,
      queryIntent,
      doc
    );

  return {
    ...doc,

    caseReference:
      extractCaseReference(
        docText(doc)
      ) ||
      extractCaseReference(
        sourceTitleOf(doc)
      ),

    caseApplicabilityScore:
      applicabilityScore,

    caseApplicability:
      applicability.status,

    caseApplicabilityExplanation:
      applicability.explanation,

    caseIssueSignals:
      detectTaxIssueSignals(
        docText(doc)
      ),

    caseLegalDimensions:
      detectCaseIssueDimensions(
        docText(doc)
      ),

    doctrineSignals:
      extractDoctrineSignals(
        docText(doc)
      )
  };
}

function selectIssueRelevantJurisprudence({
  query = "",
  docs = [],
  limit = 4,
  responseMode = "TECHNICAL",
  adaptiveContext = {}
} = {}) {
  const queryIntent =
    analyzeQueryIntent(query);

  const supersessionResult =
    applySupersessionFilter(docs);

  const activeDocs =
    supersessionResult.activeDocs || docs;

  const rerankedResult =
    rerankForTina({
      query,

      docs:
        rerankByHierarchy(
          activeDocs,
          query
        ),

      limit:
        Math.max(limit * 4, 16),

      suppressIssueMismatch: true,
      suppressWeakSecondary: true,
      suppressSuperseded: true,

      responseMode,

      adaptiveContext
    });

  const reranked =
    rerankedResult.results ||
    rerankedResult ||
    [];

  return reranked
    .filter(isCourtAuthority)

    .map((doc) =>
      enrichCaseMetadata({
        query,
        queryIntent,
        doc
      })
    )

    .filter((doc) =>
      [
        APPLICABILITY_STATUS.DIRECTLY_APPLICABLE,
        APPLICABILITY_STATUS.DISTINGUISHABLE_BUT_RELEVANT
      ].includes(doc.caseApplicability)
    )

    .sort((a, b) => {
      if (
        b.caseApplicabilityScore !==
        a.caseApplicabilityScore
      ) {
        return (
          b.caseApplicabilityScore -
          a.caseApplicabilityScore
        );
      }

      const aPrecedence =
        getControllingPrecedenceForDoc(a);

      const bPrecedence =
        getControllingPrecedenceForDoc(b);

      if (
        aPrecedence !== bPrecedence
      ) {
        return aPrecedence - bPrecedence;
      }

      return (
        getAuthorityLevelForDoc(a) -
        getAuthorityLevelForDoc(b)
      );
    })

    .slice(0, limit);
}

function buildJurisprudenceApplicabilitySummary({
  query = "",
  cases = []
} = {}) {
  if (!cases.length) {
    return buildNoJurisprudenceText();
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

        `Doctrine Signals: ${(doc.doctrineSignals || []).join(", ") || "N/A"}`,

        `Excerpt: ${normalizeText(
          doc.text ||
            doc.excerpt ||
            ""
        ).slice(0, 600)}`
      ].join("\n")
    )

    .join("\n\n");
}

function analyzeJurisprudenceConflicts({
  cases = [],
  supportingAuthorities = []
} = {}) {
  const docs = [
    ...cases,
    ...supportingAuthorities
  ].filter(Boolean);

  const reviews = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (
      let j = i + 1;
      j < docs.length;
      j += 1
    ) {
      try {
        const review =
          analyzeConflictPair(
            docs[i],
            docs[j]
          );

        if (
          review?.conflict ||
          review?.apparentConflict
        ) {
          reviews.push(review);
        }
      } catch (error) {
        reviews.push({
          conflict: false,
          apparentConflict: false,
          error: error.message
        });
      }
    }
  }

  if (!reviews.length) {
    return {
      conflict: false,

      explanation:
        "No direct doctrinal conflict detected. Cases may address different substantive, procedural, evidentiary, jurisdictional, factual, or temporal issues and should therefore be treated as distinguishable rather than conflicting.",

      reviews: []
    };
  }

  return {
    conflict:
      reviews.some(
        (item) => item.conflict
      ),

    explanation:
      reviews
        .slice(0, 3)

        .map(
          (item, index) =>
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

function buildJurisprudencePromptBlock({
  query = "",
  cases = [],
  supportingAuthorities = []
} = {}) {
  const summary =
    buildJurisprudenceApplicabilitySummary({
      query,
      cases
    });

  const conflictReview =
    analyzeJurisprudenceConflicts({
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

function buildNoJurisprudenceText() {
  return "No directly issue-relevant jurisprudence was retrieved. TINA should not cite unrelated cases merely because they mention the same tax type.";
}

function buildJurisprudencePayload({
  query = "",
  cases = [],
  supportingAuthorities = []
} = {}) {
  const conflictReview =
    analyzeJurisprudenceConflicts({
      cases,
      supportingAuthorities
    });

  return {
    engineVersion: ENGINE_VERSION,

    query,

    cases,

    caseCount: cases.length,

    jurisprudenceConflict:
      conflictReview.conflict,

    conflictReview,

    applicabilitySummary:
      buildJurisprudenceApplicabilitySummary({
        query,
        cases
      }),

    promptBlock:
      buildJurisprudencePromptBlock({
        query,
        cases,
        supportingAuthorities
      }),

    noJurisprudence:
      !cases.length
  };
}

module.exports = {
  ENGINE_VERSION,

  APPLICABILITY_STATUS,

  selectIssueRelevantJurisprudence,

  buildJurisprudenceApplicabilitySummary,

  analyzeJurisprudenceConflicts,

  buildJurisprudencePromptBlock,

  buildNoJurisprudenceText,

  buildJurisprudencePayload
};
