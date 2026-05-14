// FILE: doctrine-tagging-engine.js
"use strict";

/**
 * TINA Enterprise Doctrine Tagging Engine
 * Version: 3.0.0
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} = require("./authority-engine.js");

const { analyzeConflictPair } = require("./conflict-engine.js");

const ENGINE_VERSION = "3.0.0";

const DOCTRINE_LIBRARY = {
  SUBSTANCE_OVER_FORM: {
    label: "Substance Over Form",
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
  SUBSTANTIVE: "substantive",
  PROCEDURAL: "procedural",
  EVIDENTIARY: "evidentiary",
  JURISDICTIONAL: "jurisdictional",
  TEMPORAL: "temporal",
  FACTUAL: "factual",
  ADMINISTRATIVE: "administrative",
  CONTRACTUAL: "contractual",
  ECONOMIC_SUBSTANCE: "economic_substance",
  AUDIT: "audit",
  TRANSACTION: "transaction",
  GENERAL: "general"
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
  return Array.isArray(value) ? value : [];
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

export function detectDoctrineIntent(question = "") {
  const q = lower(question);
  const matched = [];

  for (const [code, item] of doctrineEntries()) {
    const aliasHit = item.aliases.some((alias) => q.includes(lower(alias)));
    const conceptHit = item.concepts.some((concept) => q.includes(lower(concept)));

    if (aliasHit || conceptHit) {
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
    explicitSignals.some((signal) => q.includes(signal));

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    isDoctrineFocused,
    matchedDoctrineCodes: matched.map((item) => item.code),
    matchedDoctrineLabels: matched.map((item) => item.label),
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

  if (
    /\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|vat liability|vatable|percentage tax|capital gains tax)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.SUBSTANTIVE);
  }

  if (
    /\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|fld|return|form|remedy|120\+30)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.PROCEDURAL);
  }

  if (
    /\b(invoice|receipt|official receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.EVIDENTIARY);
  }

  if (
    /\b(jurisdiction|jurisdictional|cta|court has no jurisdiction|condition precedent|exhaustion|120\+30|30-day)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.JURISDICTIONAL);
  }

  if (
    /\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.TEMPORAL);
  }

  if (
    /\b(facts|factual|depending on|case-to-case|actual|circumstances|evidence shows|transaction structure|actual practice)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.FACTUAL);
  }

  if (
    /\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|implementing rule|regulation)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.ADMINISTRATIVE);
  }

  if (
    /\b(contract|agreement|lease|concession|clause|termination|consideration|obligation|rights and obligations)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.CONTRACTUAL);
  }

  if (
    /\b(economic substance|substance over form|business purpose|commercial reality|sham|simulation|tax avoidance|tax evasion)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.ECONOMIC_SUBSTANCE);
  }

  if (
    /\b(principal|agent|pass-through|reimbursement|bundled|gross vs net|gross or net|control before transfer)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.TRANSACTION);
  }

  if (
    /\b(audit|afs|pfrs|pas|working paper|misstatement|audit evidence|qualified opinion)\b/i.test(value)
  ) {
    dimensions.push(ISSUE_DIMENSIONS.AUDIT);
  }

  return unique(dimensions.length ? dimensions : [ISSUE_DIMENSIONS.GENERAL]);
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return false;
  if (a.includes(ISSUE_DIMENSIONS.GENERAL) || b.includes(ISSUE_DIMENSIONS.GENERAL)) return true;
  return a.some((item) => b.includes(item));
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

function computeIssueApplicabilityScore(question = "", doc = {}) {
  const text = buildDocDoctrineText(doc);
  const queryTokens = extractIssueTokens(question);
  const textTokens = new Set(extractIssueTokens(text));
  const queryDimensions = classifyIssueDimensions(question);
  const docDimensions = classifyIssueDimensions(text);

  let tokenHits = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token) || lower(text).includes(token)) tokenHits += 1;
  }

  const tokenOverlap = queryTokens.length ? tokenHits / queryTokens.length : 0;
  const dimensionOverlap = dimensionsOverlap(queryDimensions, docDimensions) ? 1 : 0;

  let penalty = 0;

  if (hasVatLiabilitySignal(question) && hasVatRefundSignal(text) && !hasVatRefundSignal(question)) {
    penalty += 0.45;
  }

  if (hasVatRefundSignal(question) && hasVatLiabilitySignal(text) && !hasVatLiabilitySignal(question)) {
    penalty += 0.3;
  }

  return Math.max(
    0,
    Number((tokenOverlap * 0.62 + dimensionOverlap * 0.38 - penalty).toFixed(4))
  );
}

function classifyApplicability(question = "", doc = {}) {
  const issueScore = computeIssueApplicabilityScore(question, doc);
  const type = authorityTypeOf(doc);

  if (issueScore >= 0.55) {
    return {
      applicability: "DIRECTLY_APPLICABLE",
      explanation:
        "The authority addresses the same doctrine and substantially the same legal issue or issue dimension raised by the question."
    };
  }

  if (issueScore >= 0.3) {
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
        "The case may mention a related tax type or doctrine but does not sufficiently match the exact issue. It should not be cited as supporting jurisprudence unless the answer expressly distinguishes it."
    };
  }

  return {
    applicability: "WEAK_SUPPORT",
    explanation:
      "The source has weak issue applicability and should be used, if at all, only as background support."
  };
}

function scoreDoctrineAgainstDoc(doctrineCode, doc = {}, question = "") {
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
  const applicabilityScore = computeIssueApplicabilityScore(question, doc);
  const applicability = classifyApplicability(question, doc);

  const score =
    aliasHits * 0.34 +
    conceptHits * 0.21 +
    queryOverlap * 0.15 +
    applicabilityScore * 0.3;

  return {
    doctrineCode,
    doctrineLabel: doctrine.label,
    score: Number(score.toFixed(4)),
    aliasHits,
    conceptHits,
    queryOverlap: Number(queryOverlap.toFixed(4)),
    applicabilityScore,
    applicability: applicability.applicability,
    applicabilityExplanation: applicability.explanation
  };
}

export function tagDoctrineCandidates({
  question = "",
  retrievedResults = [],
  limit = 8
} = {}) {
  const reranked = rerankByHierarchy(retrievedResults, question);
  const intent = detectDoctrineIntent(question);

  const activeDoctrineCodes =
    intent.matchedDoctrineCodes.length > 0
      ? intent.matchedDoctrineCodes
      : doctrineEntries().map(([code]) => code);

  const tagged = reranked.map((doc) => {
    const doctrineScores = activeDoctrineCodes
      .map((code) => scoreDoctrineAgainstDoc(code, doc, question))
      .sort((a, b) => b.score - a.score);

    const topDoctrine = doctrineScores[0] || null;
    const authorityLevel = authorityLevelOf(doc);
    const authorityBoost = isLegalAuthority(doc) ? Math.max(0, (100 - authorityLevel) / 100) : 0;

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
      doctrineFinalScore:
        semanticScore * 0.5 +
        Number(topDoctrine?.score || 0) * 35 * 0.32 +
        authorityBoost * 18,
      doctrineTaggingMetadata: {
        engine: "TINA_DOCTRINE_TAGGING_ENGINE",
        version: ENGINE_VERSION,
        authorityType: authorityTypeOf(doc),
        authorityLevel,
        plannerCompatible: true,
        rendererCompatible: true
      }
    };
  });

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    intent,
    candidates: tagged
      .filter((doc) => {
        if (!intent.isDoctrineFocused) return true;
        if (!doc.doctrineScore) return false;
        return ["DIRECTLY_APPLICABLE", "DISTINGUISHABLE_BUT_RELEVANT"].includes(
          doc.doctrineApplicability
        );
      })
      .sort((a, b) => b.doctrineFinalScore - a.doctrineFinalScore)
      .slice(0, limit)
  };
}

export function selectTopDoctrineAuthorities({
  question = "",
  retrievedResults = [],
  limit = 3
} = {}) {
  const { intent, candidates } = tagDoctrineCandidates({
    question,
    retrievedResults,
    limit: Math.max(limit * 3, 9)
  });

  const top = candidates
    .filter((doc) => {
      if (!intent.isDoctrineFocused) return true;
      return doc.doctrineApplicability !== "NOT_ISSUE_MATCHED";
    })
    .slice(0, limit);

  return {
    intent,
    topAuthorities: top.map((doc) => ({
      doctrineCode: doc.topDoctrineCode,
      doctrineLabel: doc.topDoctrineLabel,
      doctrineScore: doc.doctrineScore,
      doctrineApplicabilityScore: doc.doctrineApplicabilityScore,
      doctrineApplicability: doc.doctrineApplicability,
      doctrineApplicabilityExplanation: doc.doctrineApplicabilityExplanation,
      source: sourcePathOf(doc),
      title: sourceTitleOf(doc),
      authorityType: authorityTypeOf(doc),
      authorityLevel: authorityLevelOf(doc),
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
    return "No direct doctrinal conflict detected. If VAT cases address different procedural requirements, such as substantiation, administrative claim timing, or judicial claim timing, they are complementary or distinguishable rather than conflicting.";
  }

  return reviews
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
    .join("\n\n");
}

export function buildDoctrineSummary({
  question = "",
  retrievedResults = [],
  limit = 3
} = {}) {
  const { intent, topAuthorities } = selectTopDoctrineAuthorities({
    question,
    retrievedResults,
    limit
  });

  const summary = topAuthorities.length
    ? topAuthorities
        .map((item, index) =>
          [
            `${index + 1}. ${item.doctrineLabel || "Untitled Doctrine"}`,
            `Source: ${item.title || item.source || "Unknown source"}`,
            `Authority: ${item.authorityType} (Level ${item.authorityLevel})`,
            `Applicability: ${item.doctrineApplicability}`,
            `Applicability Analysis: ${item.doctrineApplicabilityExplanation}`,
            `Issue Applicability Score: ${item.doctrineApplicabilityScore}`,
            `Excerpt: ${item.excerpt}`
          ].join("\n")
        )
        .join("\n\n")
    : "No strong issue-applicable doctrine-tagged authority found.";

  return {
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    intent,
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
  conflictReview = ""
} = {}) {
  return `
You are TINA, a Philippine tax research and compliance assistant.

CORE RULE:
Never merely tag a doctrine or enumerate cases.
You must explain whether the doctrine actually applies to the user's exact legal issue.

STRICT RULES:
1. Use only the doctrine-tagged indexed authorities below.
2. Do not invent doctrine names, holdings, legal tests, case names, dates, or citations.
3. Prefer higher-authority legal sources.
4. If doctrine support is weak, say so clearly.
5. Do not cite a case merely because it mentions the same tax type.
6. For every doctrine or case used, explain:
   - legal issue addressed;
   - doctrine established;
   - why it applies or does not apply to the present question.
7. If VAT cases address different procedural requirements, explain the distinction. For example:
   - substantiation cases concern evidentiary support;
   - administrative claim timing cases concern procedural compliance;
   - judicial claim timing cases may concern jurisdiction;
   - these are complementary, not conflicting, unless they directly contradict on the same legal issue.
8. Do not fabricate doctrinal conflict.
9. Never output only "Conflict detected: YES."
10. Never mention ChatGPT.
11. If evidence is incomplete, use preliminary conclusion language.

MANDATORY OUTPUT FORMAT:

A. DIRECT ANSWER
[Answer the exact doctrine/tax question immediately.]

B. CONTROLLING LEGAL BASIS
[Identify the controlling law, regulation, or authority from the context. Explain whether mandatory, procedural, interpretative, administrative, evidentiary, jurisdictional, or substantive.]

C. SUPPORTING JURISPRUDENCE
[Only issue-applicable cases. For each: legal issue, doctrine, applicability. If a case is distinguishable, say why.]

D. DOCTRINAL STATUS / CONFLICT ANALYSIS
[State no conflict, apparent conflict, partial conflict, or direct conflict. Explain whether differences are substantive, procedural, evidentiary, jurisdictional, factual, temporal, administrative, contractual, economic-substance, audit, or transaction-based.]

E. HIERARCHY ANALYSIS
[Explain which authority controls and why under Philippine legal hierarchy.]

F. PRACTICAL APPLICATION
[Apply to facts. State tax consequence, compliance implication, audit risk, litigation exposure, documentation requirements, possible BIR position, and strongest taxpayer defense where applicable.]

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
  adaptiveContext = {}
} = {}) {
  const { intent, topAuthorities, summary, conflictReview } = buildDoctrineSummary({
    question,
    retrievedResults,
    limit: 3
  });

  if (!intent.isDoctrineFocused) {
    return {
      handled: false,
      answer: "",
      intent,
      topAuthorities,
      responseMode,
      adaptiveContext,
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
      engineVersion: ENGINE_VERSION
    };
  }

  const prompt = buildDoctrinePrompt({
    question,
    doctrineSummary: summary,
    conflictReview
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
    engineVersion: ENGINE_VERSION
  };
}

export function doctrineTaggingHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DOCTRINE_TAGGING_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsBridgeCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true
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
