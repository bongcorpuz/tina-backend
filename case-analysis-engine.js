// FILE: case-analysis-engine.js

import OpenAI from "openai";
import {
  rerankByHierarchy,
  selectTopLegalBases
} from "./authority-engine.js";
import {
  reconcileDoctrine
} from "./doctrinal-engine.js";
import {
  applySupersessionFilter
} from "./supersession-engine.js";
import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
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
    "court of tax appeals case"
  ];

  const caseReferenceSignals = [
    " v. ",
    " vs ",
    " vs. ",
    "cta",
    "court of tax appeals",
    "supreme court",
    "g.r. no."
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
    confidence: hasStrongCaseSignal ? "high" : hasCaseReferenceSignal ? "medium" : "low"
  };
}

function isLikelyCaseDocument(doc = {}) {
  const blob = [
    doc.authorityType,
    doc.authority_type,
    doc.source,
    doc.originalSource,
    doc.path,
    doc.metadata?.path,
    doc.metadata?.documentTitle,
    doc.text
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    blob.includes("cta") ||
    blob.includes("court of tax appeals") ||
    blob.includes("supreme court") ||
    blob.includes("g.r. no.") ||
    blob.includes("v. cir") ||
    blob.includes(" vs ") ||
    blob.includes(" v. ")
  );
}

function scoreCaseDoc(doc = {}, query = "") {
  const q = lower(query);
  const text = lower(doc.text || "");
  const path = lower(
    doc.path ||
      doc.metadata?.path ||
      doc.source ||
      doc.originalSource ||
      ""
  );

  let score = Number(doc.finalScore || doc.score || 0);

  if (isLikelyCaseDocument(doc)) score += 25;
  if (path.includes("court_cases")) score += 20;
  if (path.includes("cta")) score += 10;
  if (path.includes("supreme court")) score += 10;

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
    "the ruling"
  ];

  for (const term of caseTerms) {
    if (text.includes(term)) score += 2;
  }

  if (q.includes("tax evasion") && text.includes("tax evasion")) score += 10;
  if (q.includes("tax avoidance") && text.includes("tax avoidance")) score += 10;
  if (q.includes("vat") && text.includes("vat")) score += 8;
  if (q.includes("withholding") && text.includes("withholding")) score += 8;

  return score;
}

export function selectTopCaseAuthorities(results = [], query = "", limit = 3) {
  return rerankByHierarchy(results, query)
    .filter((doc) => isLikelyCaseDocument(doc))
    .map((doc) => ({
      ...doc,
      caseScore: scoreCaseDoc(doc, query)
    }))
    .sort((a, b) => b.caseScore - a.caseScore)
    .slice(0, limit);
}

function extractCaseTitle(doc = {}) {
  const candidates = [
    doc.metadata?.documentTitle,
    doc.originalSource,
    doc.source,
    doc.path,
    doc.metadata?.path
  ].filter(Boolean);

  const raw = String(candidates[0] || "Unidentified Case")
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .trim();

  return raw || "Unidentified Case";
}

function buildCasePrompt({
  question = "",
  strictContext = "",
  topLegalBases = [],
  doctrineInfo = null
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

  const conflictText = doctrineInfo?.hasConflict
    ? [
        "Conflict Detected: YES",
        doctrineInfo.hierarchyConflict?.controllingAuthority
          ? `Controlling Authority: ${doctrineInfo.hierarchyConflict.controllingAuthority}`
          : null,
        doctrineInfo.hierarchyConflict?.reason
          ? `Reason: ${doctrineInfo.hierarchyConflict.reason}`
          : null
      ]
          .filter(Boolean)
          .join("\n")
    : "Conflict Detected: NO";

  return `
You are TINA, a Philippine tax research, compliance, education, and audit-risk assistant.

STRICT RULES:
1. Use only the supplied context.
2. Do not invent case names, facts, issues, doctrines, sections, or holdings.
3. If the context is insufficient for a proper case breakdown, say so clearly.
4. Prefer higher-authority legal bases over lower ones.
5. If a court case is discussed, present it analytically and only from the supplied materials.
6. Never mention ChatGPT.

RESPONSE FORMAT:
1. CASE TITLE
2. FACTS
3. ISSUE
4. RULING
5. DOCTRINE
6. APPLICATION
7. LEGAL SIGNIFICANCE
8. SOURCES USED

QUESTION:
${question}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT STATUS:
${conflictText}

CONTEXT:
${strictContext}
`.trim();
}

export async function generateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  const reranked = rerankByHierarchy(retrievedResults, question);
  const { activeDocs } = applySupersessionFilter(reranked);
  const caseDocs = selectTopCaseAuthorities(activeDocs, question, 3);
  const doctrinalReview = reconcileDoctrine({
    rankedDocs: caseDocs,
    maxDocs: 3
  });

  const topLegalBases = selectTopLegalBases(caseDocs, 2);

  if (caseDocs.length === 0) {
    return {
      success: true,
      answer: buildNoSourceReply(),
      mode: "CASE_ANALYSIS",
      sourcesUsed: [],
      caseDocs: [],
      validation: null
    };
  }

  const strictContext = caseDocs
    .map((doc, index) =>
      [
        `CASE SOURCE ${index + 1}: ${extractCaseTitle(doc)}`,
        `PATH: ${doc.path || doc.metadata?.path || doc.source || "Unknown"}`,
        `AUTHORITY TYPE: ${doc.authorityType || doc.metadata?.authorityType || "JURISPRUDENCE"}`,
        `AUTHORITY LEVEL: ${doc.authorityLevel || doc.metadata?.authorityLevel || 99}`,
        `TEXT:`,
        doc.text || ""
      ].join("\n")
    )
    .join("\n\n---\n\n");

  const prompt = buildCasePrompt({
    question,
    strictContext,
    topLegalBases,
    doctrineInfo: doctrinalReview
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `Analyze this case question strictly from the supplied context:\n${question}` }
    ]
  });

  let answerText = response.choices?.[0]?.message?.content?.trim() || "";

  const claimSupportMap = buildClaimSupportMap(answerText, caseDocs);
  const validation = validateEvidenceSufficiency({
    evidence: caseDocs,
    claimSupportMap,
    minEvidenceCount: 1,
    minSupportedClaims: 1,
    minTopScore: 0.2
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
    sourcesUsed: caseDocs.map((doc) => ({
      source:
        doc.path ||
        doc.metadata?.path ||
        doc.source ||
        doc.originalSource ||
        "Unknown source",
      authorityType: doc.authorityType || doc.metadata?.authorityType || null,
      authorityLevel: doc.authorityLevel || doc.metadata?.authorityLevel || null
    })),
    caseDocs,
    validation,
    doctrinalReview
  };
}

export async function maybeGenerateCaseAnalysisAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  const intent = detectCaseAnalysisIntent(question);

  if (!intent.isCaseAnalysis) {
    return {
      handled: false,
      answer: "",
      mode: null,
      sourcesUsed: [],
      caseDocs: [],
      validation: null
    };
  }

  const result = await generateCaseAnalysisAnswer({
    openai,
    question,
    retrievedResults,
    model
  });

  return {
    handled: true,
    ...result,
    intent
  };
}
