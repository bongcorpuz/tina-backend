// FILE: case-analysis-engine.js
"use strict";

/**
 * TINA Enterprise Case Analysis Engine
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  rerankByHierarchy,
  selectTopLegalBases,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} = require("./authority-engine.js");

const {
  detectHierarchyConflict,
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} = require("./conflict-engine.js");

const {
  applySupersessionFilter
} = require("./supersession-engine.js");

const {
  selectIssueRelevantJurisprudence,
  buildJurisprudencePayload
} = require("./jurisprudence-engine.js");

import { reconcileDoctrine } from "./doctrinal-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

const ENGINE_VERSION = "3.0.0";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
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
  return [
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(String(type || "").toUpperCase());
}

function isBIRAuthority(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(
    String(type || "").toUpperCase()
  );
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
    overrideApplied: Boolean(doc.overrideApplied || false)
  };
}

export function detectCaseAnalysisIntent(question = "") {
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

  const hasStrongCaseSignal = strongCaseSignals.some((token) =>
    q.includes(token)
  );

  const hasCaseReferenceSignal = caseReferenceSignals.some((token) =>
    q.includes(token)
  );

  const isGenericExplain = genericTaxExplainSignals.some((token) =>
    q.includes(token)
  );

  return {
    isCaseAnalysis:
      !isGenericExplain && (hasStrongCaseSignal || hasCaseReferenceSignal),
    confidence: hasStrongCaseSignal
      ? "high"
      : hasCaseReferenceSignal
        ? "medium"
        : "low",
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
      signal: "vat liability",
      patterns: [
        /\bvat\b/,
        /\bvalue added tax\b/,
        /\boutput vat\b/,
        /\bvatable\b/,
        /\bzero-rated\b/,
        /\bexempt\b/
      ]
    },
    {
      signal: "vat refund",
      patterns: [
        /\brefund\b/,
        /\btax credit certificate\b/,
        /\btcc\b/,
        /\b120\+30\b/,
        /\badministrative claim\b/,
        /\bjudicial claim\b/,
        /\bunutilized input vat\b/
      ]
    },
    {
      signal: "withholding tax",
      patterns: [
        /\bwithholding\b/,
        /\bewt\b/,
        /\bexpanded withholding\b/,
        /\bfinal withholding\b/
      ]
    },
    {
      signal: "income tax",
      patterns: [
        /\bincome tax\b/,
        /\brcit\b/,
        /\bmcit\b/,
        /\bnolco\b/,
        /\bdeductible\b/,
        /\bnon-deductible\b/
      ]
    },
    {
      signal: "assessment due process",
      patterns: [
        /\bloa\b/,
        /\bletter of authority\b/,
        /\bpan\b/,
        /\bfan\b/,
        /\bfld\b/,
        /\bdue process\b/,
        /\bassessment\b/,
        /\bprotest\b/
      ]
    },
    {
      signal: "prescription",
      patterns: [
        /\bprescription\b/,
        /\bprescriptive\b/,
        /\bstatute of limitations\b/,
        /\bthree-year\b/,
        /\bten-year\b/
      ]
    },
    {
      signal: "tax evasion",
      patterns: [/\btax evasion\b/, /\bfraud\b/, /\bwillful\b/]
    },
    {
      signal: "tax avoidance",
      patterns: [/\btax avoidance\b/, /\btax planning\b/, /\bsham\b/]
    },
    {
      signal: "contract",
      patterns: [/\bcontract\b/, /\bagreement\b/, /\blease\b/, /\bconcession\b/]
    },
    {
      signal: "transaction characterization",
      patterns: [
        /\bprincipal\b/,
        /\bagent\b/,
        /\bpass-through\b/,
        /\breimbursement\b/,
        /\bbundled\b/,
        /\beconomic substance\b/
      ]
    }
  ];

  for (const group of issueGroups) {
    if (group.patterns.some((pattern) => pattern.test(q))) {
      signals.add(group.signal);
    }
  }

  for (const token of tokenizeIssue(question)) {
    signals.add(token);
  }

  return [...signals];
}

function buildIssueRelevanceScore(doc = {}, query = "") {
  const qSignals = extractIssueSignals(query);
  const qTokens = new Set(tokenizeIssue(query));
  const text = lower(getDocText(doc));

  let score = 0;

  for (const signal of qSignals) {
    if (text.includes(signal)) score += 18;
  }

  for (const token of qTokens) {
    if (text.includes(token)) score += 4;
  }

  if (qSignals.includes("vat liability") && qSignals.includes("vat refund")) {
    score += 0;
  } else if (qSignals.includes("vat liability")) {
    if (/\brefund\b|\b120\+30\b|\btcc\b|\badministrative claim\b|\bjudicial claim\b/i.test(text)) {
      score -= 30;
    }
  } else if (qSignals.includes("vat refund")) {
    if (/\bliability\b|\boutput vat\b|\bvatable sale\b/i.test(text)) {
      score -= 12;
    }
  }

  return score;
}

function isIssueRelevantCase(doc = {}, query = "", minimumScore = 18) {
  if (!isLikelyCaseDocument(doc)) return false;

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
    return true;
  }

  const relevanceScore = buildIssueRelevanceScore(doc, query);
  return relevanceScore >= minimumScore;
}

function scoreCaseDoc(doc = {}, query = "") {
  const q = lower(query);
  const text = lower(getDocText(doc));
  const path = lower(getDocPath(doc));
  const authorityType = String(getAuthorityType(doc)).toUpperCase();

  let score = Number(
    doc.rerankScore ||
      doc.retrievalScore ||
      doc.finalScore ||
      doc.combined_score ||
      doc.score ||
      0
  );

  if (isLikelyCaseDocument(doc)) score += 30;
  if (isIssueRelevantCase(doc, query, 18)) score += 45;

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

  score += buildIssueRelevanceScore(doc, query);

  if (q.includes("tax evasion") && text.includes("tax evasion")) score += 10;
  if (q.includes("tax avoidance") && text.includes("tax avoidance")) score += 10;
  if (q.includes("vat") && text.includes("vat")) score += 8;
  if (q.includes("withholding") && text.includes("withholding")) score += 8;
  if (q.includes("mcit") && text.includes("mcit")) score += 8;

  return score;
}

export function selectTopCaseAuthorities(results = [], query = "", limit = 4) {
  const caseNameNeedles = extractCaseNamesFromQuestion(query);
  const hasSpecificCaseRequest = caseNameNeedles.length > 0;
  const minimumScore = hasSpecificCaseRequest ? 8 : 18;

  return rerankByHierarchy(results, query)
    .filter((doc) => isLikelyCaseDocument(doc))
    .filter((doc) => isIssueRelevantCase(doc, query, minimumScore))
    .map((doc) => ({
      ...doc,
      caseScore: scoreCaseDoc(doc, query),
      issueRelevanceScore: buildIssueRelevanceScore(doc, query)
    }))
    .sort((a, b) => b.caseScore - a.caseScore)
    .slice(0, limit);
}

function selectRelevantBIRAuthorities(results = [], query = "", limit = 3) {
  const qTokens = new Set(tokenizeIssue(query));

  return rerankByHierarchy(results, query)
    .filter((doc) => isBIRAuthority(getAuthorityType(doc)))
    .map((doc) => {
      const text = lower(getDocText(doc));
      let issueScore = buildIssueRelevanceScore(doc, query);

      for (const token of qTokens) {
        if (text.includes(token)) issueScore += 2;
      }

      return {
        ...doc,
        issueRelevanceScore: issueScore
      };
    })
    .filter((doc) => doc.issueRelevanceScore >= 8)
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
        `Source A: ${item.sourceA}`,
        `Source B: ${item.sourceB}`,
        `Exact Issue: ${item.exactIssue || "Not determined"}`,
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
  issueRelevantCaseCount = 0,
  rejectedCaseCount = 0
}) {
  const legalBasesText =
    topLegalBases.length > 0
      ? topLegalBases
          .map(
            (item, index) =>
              `${index + 1}. [${item.authorityLabel}] ${item.source}\nExcerpt: ${item.excerpt}`
          )
          .join("\n\n")
      : "No controlling legal basis found.";

  const conflictText = hierarchyConflict?.conflict
    ? [
        `Conflict Type: ${hierarchyConflict.conflictType || "N/A"}`,
        `Doctrinal Conflict: ${hierarchyConflict.doctrinalConflict ? "YES" : "NO"}`,
        `Hierarchy Conflict: ${hierarchyConflict.hierarchyConflict ? "YES" : "NO"}`,
        hierarchyConflict.controllingAuthority
          ? `Controlling Authority: ${hierarchyConflict.controllingAuthority}`
          : null,
        hierarchyConflict.reason ? `Reason: ${hierarchyConflict.reason}` : null,
        hierarchyConflict.sourceA ? `Source A: ${hierarchyConflict.sourceA}` : null,
        hierarchyConflict.sourceB ? `Source B: ${hierarchyConflict.sourceB}` : null,
        hierarchyConflict.overrideApplied !== undefined
          ? `Court Override Applied: ${hierarchyConflict.overrideApplied ? "YES" : "NO"}`
          : null
      ]
        .filter(Boolean)
        .join("\n")
    : hierarchyConflict?.apparentConflict
      ? [
          "Conflict Type: APPARENT_CONFLICT_ONLY",
          "Doctrinal Conflict: NO",
          "Hierarchy Conflict: NO",
          hierarchyConflict.reason ? `Reason: ${hierarchyConflict.reason}` : null,
          hierarchyConflict.sourceA ? `Source A: ${hierarchyConflict.sourceA}` : null,
          hierarchyConflict.sourceB ? `Source B: ${hierarchyConflict.sourceB}` : null
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
Only use cases that are directly relevant to the user's legal issue.
A case is relevant only if it addresses the same tax type and the same legal question, doctrine, remedy, procedural requirement, evidentiary requirement, or factual setting.

STRICT RULES:
1. Use only the supplied context.
2. Do not invent case names, facts, issues, doctrines, sections, GR numbers, CTA case numbers, or holdings.
3. If the context is insufficient for a proper case breakdown, say so clearly.
4. Do not cite a case merely because it mentions VAT, income tax, withholding tax, or another broad tax type.
5. For each case cited, explain:
   - legal issue;
   - doctrine;
   - applicability to the user's question.
6. Exclude unrelated cases and do not mention them as support.
7. Organize retrieved sources using TINA hierarchy.
8. If a court decision genuinely conflicts with a BIR issuance, controlling judicial doctrine prevails.
9. Different procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, or administrative rules are not direct doctrinal conflicts unless they contradict on the same legal issue.
10. Never use vague conflict language.
11. Never mention ChatGPT.

CASE RELEVANCE AUDIT:
Issue-relevant cases selected: ${issueRelevantCaseCount}
Potential case documents rejected for weak issue relevance: ${rejectedCaseCount}

REQUIRED OUTPUT FORMAT:

A. DIRECT ANSWER
[Answer the exact legal/tax question immediately.]

B. CONTROLLING LEGAL BASIS
[Identify NIRC/statute, RR, RMC/RMO/RAMO, or constitutional basis present in context. Explain whether mandatory, procedural, interpretative, or administrative.]

C. SUPPORTING JURISPRUDENCE
[Only issue-relevant cases. For each case: legal issue, doctrine, and applicability. If none, say no directly relevant case was retrieved.]

D. DOCTRINAL STATUS / CONFLICT ANALYSIS
[State no conflict, apparent conflict, partial conflict, or direct conflict. If conflict exists, explain exact issue, controlling doctrine, why it prevails, and distinction type.]

E. HIERARCHY ANALYSIS
[Explain which authority controls and why under Philippine legal hierarchy.]

F. PRACTICAL APPLICATION
[Apply to facts. State tax consequence, compliance implication, audit risk, litigation exposure, documentation requirements, possible BIR position, and strongest taxpayer defense.]

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

function countRejectedCases(activeDocs = [], selectedCaseDocs = [], query = "") {
  const selectedPaths = new Set(selectedCaseDocs.map((doc) => getDocPath(doc)));

  return activeDocs.filter(
    (doc) =>
      isLikelyCaseDocument(doc) &&
      !selectedPaths.has(getDocPath(doc)) &&
      !isIssueRelevantCase(doc, query, 18)
  ).length;
}

export async function generateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {}
}) {
  const reranked = rerankByHierarchy(retrievedResults, question);
  const supersessionResult = applySupersessionFilter(reranked);

  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : reranked;

  const jurisprudenceCases = selectIssueRelevantJurisprudence({
    query: question,
    docs: activeDocs,
    limit: 4,
    responseMode,
    adaptiveContext
  });

  const caseDocs =
    jurisprudenceCases.length > 0
      ? jurisprudenceCases
      : selectTopCaseAuthorities(activeDocs, question, 4);

  const rejectedCaseCount = countRejectedCases(activeDocs, caseDocs, question);
  const rawBirDocs = selectRelevantBIRAuthorities(activeDocs, question, 3);
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
        "A. DIRECT ANSWER\nNo issue-relevant case authority was retrieved from the indexed context.\n\nB. CONTROLLING LEGAL BASIS\nThe indexed context did not retrieve a case directly addressing the user's legal issue.\n\nC. SUPPORTING JURISPRUDENCE\nNo directly issue-relevant case was retrieved. TINA should not cite unrelated jurisprudence merely because it mentions the same tax type.\n\nD. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo doctrinal conflict can be determined because no issue-relevant case authority was retrieved.\n\nE. HIERARCHY ANALYSIS\nNo hierarchy comparison can be made without a retrieved controlling or supporting authority.\n\nF. PRACTICAL APPLICATION\nVerify against the exact Supreme Court, CTA, NIRC, and BIR authorities before relying on a litigation or audit position.",
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
        `ISSUE RELEVANCE SCORE: ${doc.issueRelevanceScore ?? doc.caseApplicabilityScore ?? buildIssueRelevanceScore(doc, question)}`,
        `CASE APPLICABILITY: ${doc.caseApplicability || "N/A"}`,
        `CASE APPLICABILITY EXPLANATION: ${doc.caseApplicabilityExplanation || "N/A"}`,
        "TEXT:",
        getDocText(doc)
      ].join("\n")
    ),
    ...birDocs.map((doc, index) =>
      [
        `BIR SOURCE ${index + 1}: ${
          doc.source || doc.originalSource || doc.original_source || "Unknown BIR Source"
        }`,
        `PATH: ${getDocPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityType(doc)}`,
        `AUTHORITY LEVEL: ${getAuthorityLevel(doc)}`,
        `ISSUE RELEVANCE SCORE: ${doc.issueRelevanceScore ?? buildIssueRelevanceScore(doc, question)}`,
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
        content: `Analyze this Philippine tax case question strictly from the supplied issue-relevant context:\n${question}`
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
    rejectedCaseCount,
    engineVersion: ENGINE_VERSION
  };
}

export async function maybeGenerateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {}
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
      engineVersion: ENGINE_VERSION
    };
  }

  const result = await generateCaseAnalysisAnswer({
    openai,
    question,
    retrievedResults,
    model,
    responseMode,
    adaptiveContext
  });

  return {
    handled: true,
    ...result,
    intent
  };
}

export function caseAnalysisHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CASE_ANALYSIS_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsBridgeCompatible: true,
    jurisprudenceEngineCompatible: true,
    supersessionCompatible: true,
    conflictEngineCompatible: true
  };
}

export default {
  detectCaseAnalysisIntent,
  selectTopCaseAuthorities,
  generateCaseAnalysisAnswer,
  maybeGenerateCaseAnalysisAnswer,
  caseAnalysisHealthCheck
};
