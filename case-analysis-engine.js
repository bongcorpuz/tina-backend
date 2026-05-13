// FILE: case-analysis-engine.js

import {
  rerankByHierarchy,
  selectTopLegalBases,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc
} from "./authority-engine.js";

import {
  detectHierarchyConflict,
  resolveCourtOverride,
  isGenuineConflict
} from "./conflict-engine.js";

import { reconcileDoctrine } from "./doctrinal-engine.js";
import { applySupersessionFilter } from "./supersession-engine.js";

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

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    "Unknown"
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
        : "low"
  };
}

function isLikelyCaseDocument(doc = {}) {
  const blob = [
    getAuthorityType(doc),
    doc.source,
    doc.originalSource,
    getDocPath(doc),
    doc.metadata?.documentTitle,
    doc.text
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

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

function scoreCaseDoc(doc = {}, query = "") {
  const q = lower(query);
  const text = lower(doc.text || "");
  const path = lower(getDocPath(doc));
  const authorityType = String(getAuthorityType(doc)).toUpperCase();

  let score = Number(doc.finalScore || doc.combined_score || doc.score || 0);

  if (isLikelyCaseDocument(doc)) score += 30;
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

  if (q.includes("tax evasion") && text.includes("tax evasion")) score += 10;
  if (q.includes("tax avoidance") && text.includes("tax avoidance")) score += 10;
  if (q.includes("vat") && text.includes("vat")) score += 8;
  if (q.includes("withholding") && text.includes("withholding")) score += 8;
  if (q.includes("mcit") && text.includes("mcit")) score += 8;

  return score;
}

export function selectTopCaseAuthorities(results = [], query = "", limit = 4) {
  return rerankByHierarchy(results, query)
    .filter((doc) => isLikelyCaseDocument(doc))
    .map((doc) => ({
      ...doc,
      caseScore: scoreCaseDoc(doc, query)
    }))
    .sort((a, b) => b.caseScore - a.caseScore)
    .slice(0, limit);
}

function selectRelevantBIRAuthorities(results = [], limit = 3) {
  return rerankByHierarchy(results)
    .filter((doc) => isBIRAuthority(getAuthorityType(doc)))
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
  hierarchyConflict = null,
  overrideAudit = []
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
        "Conflict Detected: YES",
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
    : "Conflict Detected: NO";

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

STRICT RULES:
1. Use only the supplied context.
2. Do not invent case names, facts, issues, doctrines, sections, GR numbers, CTA case numbers, or holdings.
3. If the context is insufficient for a proper case breakdown, say so clearly.
4. Organize retrieved sources using TINA hierarchy:
   Constitution > Statute / NIRC / Republic Act > Revenue Regulations > RMC > RMO > RAMO > BIR Ruling > Supreme Court > CTA En Banc > Court of Appeals > CTA Division > Treaty / LGU / Secondary.
5. For actual conflict resolution only: Constitution and statutes control administrative issuances; if a court decision genuinely conflicts with a BIR issuance, the court decision controls.
6. Only flag conflicts for genuine legal contradictions. Do not flag minor wording differences, date differences, or scope differences as conflicts.
7. Never use vague conflict language.
8. Never mention ChatGPT.

REQUIRED OUTPUT FORMAT:

### Issue
[One sentence statement of the tax question]

### Applicable law (ranked by authority)
[Only authorities present in context]

### BIR position
[What BIR says via RR/RMC/Ruling, with citation from context]

### Court position
[What SC/CTA/CA has ruled, with case citation from context]

### Conflict flag
[YES/NO — if YES, explain which prevails and why]

### Legally defensible conclusion
[The position most supported by the highest authority]

### Taxpayer risk assessment
[LOW / MEDIUM / HIGH — with basis]

### Recommended action
[Compliance / protest / ruling request / litigation / documentation, only if supported by context]

QUESTION:
${question}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT STATUS:
${conflictText}

COURT OVERRIDE AUDIT:
${overrideText}

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
  const supersessionResult = applySupersessionFilter(reranked);
  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : reranked;

  const caseDocs = selectTopCaseAuthorities(activeDocs, question, 4);
  const rawBirDocs = selectRelevantBIRAuthorities(activeDocs, 3);
  const birDocs = filterOverriddenBirDocs(caseDocs, rawBirDocs);

  const doctrinalReview = reconcileDoctrine({
    rankedDocs: [...caseDocs, ...birDocs],
    maxDocs: 5
  });

  const conflictDocs = [...caseDocs, ...birDocs];
  const hierarchyConflict = detectHierarchyConflict(conflictDocs.slice(0, 5));
  const topLegalBases = selectTopLegalBases(conflictDocs, 3);
  const overrideAudit = buildCourtOverrideAudit(caseDocs, rawBirDocs);

  if (caseDocs.length === 0) {
    return {
      success: true,
      answer: buildNoSourceReply(),
      mode: "CASE_ANALYSIS",
      sourcesUsed: [],
      caseDocs: [],
      birDocs: [],
      validation: null,
      doctrinalReview,
      hierarchyConflict,
      overrideAudit,
      supersessionResult
    };
  }

  const strictContext = [
    ...caseDocs.map((doc, index) =>
      [
        `COURT SOURCE ${index + 1}: ${extractCaseTitle(doc)}`,
        `PATH: ${getDocPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityType(doc)}`,
        `AUTHORITY LEVEL: ${getAuthorityLevel(doc)}`,
        "TEXT:",
        doc.text || ""
      ].join("\n")
    ),
    ...birDocs.map((doc, index) =>
      [
        `BIR SOURCE ${index + 1}: ${
          doc.source || doc.originalSource || "Unknown BIR Source"
        }`,
        `PATH: ${getDocPath(doc)}`,
        `AUTHORITY TYPE: ${getAuthorityType(doc)}`,
        `AUTHORITY LEVEL: ${getAuthorityLevel(doc)}`,
        "TEXT:",
        doc.text || ""
      ].join("\n")
    )
  ].join("\n\n---\n\n");

  const prompt = buildCasePrompt({
    question,
    strictContext,
    topLegalBases,
    hierarchyConflict,
    overrideAudit
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Analyze this tax case question strictly from the supplied context:\n${question}`
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
    sourcesUsed: [...caseDocs, ...birDocs].slice(0, 5).map(buildDisplaySource),
    caseDocs,
    birDocs,
    validation,
    doctrinalReview,
    hierarchyConflict,
    overrideAudit,
    supersessionResult
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
      birDocs: [],
      validation: null,
      doctrinalReview: null,
      hierarchyConflict: null,
      overrideAudit: [],
      supersessionResult: null
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
