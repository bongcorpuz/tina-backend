// FILE: rag-answer-handler.js

import { detectTopic } from "./topic-detector.js";
import { saveModeState } from "./mode-state.js";

import {
  getLastTopicState,
  saveTopicState,
  extractMemoryHooks,
  saveMemoryHooks
} from "./memory-hooks.js";

import {
  getConversationMessages,
  saveMessage
} from "./conversation-memory.js";

import {
  searchSimilar,
  smartSearch
} from "./vector-store.js";

import {
  hybridRetrieve,
  normalizeRetrievedEvidence,
  detectEvidenceConflicts,
  rankEvidenceByAuthority,
  synthesizeGroundedAnswer,
  saveReasoningRun,
  saveReasoningEvidence,
  saveReasoningConflicts
} from "./reasoning-engine.js";

import {
  rerankByHierarchy,
  selectTopLegalBases,
  buildStrictAnswerPrompt
} from "./authority-engine.js";

import { detectHierarchyConflict } from "./conflict-engine.js";
import { reconcileDoctrine } from "./doctrinal-engine.js";
import { applySupersessionFilter } from "./supersession-engine.js";

import {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
} from "./legal-validation-engine.js";

import { maybeGenerateProvisionCitationAnswer } from "./provision-citation-engine.js";
import { maybeGenerateCaseAnalysisAnswer } from "./case-analysis-engine.js";
import { maybeGenerateDoctrineAnswer } from "./doctrine-tagging-engine.js";

import {
  detectNamedLaw,
  buildNamedLawSearchQueries,
  filterDocsForNamedLaw
} from "./named-law-engine.js";

import {
  buildFinalCompliantAnswer,
  sanitizeDraftAnswer
} from "./final-answer-compliance.js";

import {
  buildFinalRoutePayload,
  filterVisibleSources
} from "./source-visibility-engine.js";

import {
  MAX_VISIBLE_SOURCES,
  toSafeDbNumeric,
  buildMemoryContext,
  classifyQuestion,
  detectIssuanceQuery,
  shouldHideSourceFromUser,
  stripTrailingSourceSection
} from "./ask-helpers.js";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ANSWER_RENDERER_PATH = "./answer-renderer.js";

const TINA_AF_HEADINGS = [
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
];

const FALLBACK_TINA_STRUCTURE = `
You are TINA — Tax Intelligence and Analysis — a Philippine tax, legal, audit,
and compliance reasoning AI acting as a senior tax lawyer, CPA, audit partner,
and legal researcher.

You are not a citation retriever. You must synthesize law, facts, evidence,
hierarchy, doctrine, risks, assumptions, and practical application.

DEFAULT STRUCTURE FOR SUBSTANTIVE TAX / LEGAL QUESTIONS:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

STRICT RULES:
- Do not fabricate laws, cases, GR numbers, rates, deadlines, or issuances.
- Do not cite unrelated cases.
- Do not merely say "Conflict detected: YES."
- Explain exact conflict, controlling authority, and why it controls.
- If facts or documents are incomplete, say the position is preliminary and subject to verification.
- Separate tax treatment, accounting treatment, audit risk, litigation exposure, and documentation requirements.
`.trim();

const rendererCache = {
  loaded: false,
  module: null
};

function hasCompleteAFStructure(text = "") {
  const value = String(text || "");
  return TINA_AF_HEADINGS.every((heading) =>
    new RegExp(
      `(^|\\n)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    ).test(value)
  );
}

function truncateForPrompt(value = "", maxChars = 3500) {
  const text = String(value || "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...[truncated]` : text;
}

function normalizeLooseText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/[^\w\s/%₱.,()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.source ||
    doc.title ||
    null
  );
}

function mergeUniqueDocs(docs = []) {
  const results = [];
  const seen = new Set();

  for (const doc of docs || []) {
    if (!doc) continue;
    const key = buildDocKey(doc) || `doc-${results.length}`;

    if (seen.has(key)) continue;

    seen.add(key);
    results.push(doc);
  }

  return results;
}

function getDocAuthorityType(doc = {}) {
  return String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      ""
  )
    .trim()
    .toUpperCase();
}

function getDocAuthorityLevel(doc = {}) {
  const value =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    99;

  return Number.isFinite(Number(value)) ? Number(value) : 99;
}

function getDocScore(doc = {}) {
  const value =
    doc.namedLawScore ??
    doc.finalScore ??
    doc.combined_score ??
    doc.score ??
    0;

  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sortDocsForLegalBasis(docs = []) {
  return [...docs].sort((a, b) => {
    const levelDiff = getDocAuthorityLevel(a) - getDocAuthorityLevel(b);
    if (levelDiff !== 0) return levelDiff;
    return getDocScore(b) - getDocScore(a);
  });
}

function buildDocHaystack(doc = {}) {
  return normalizeLooseText(
    [
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.title,
      doc.text?.slice(0, 2500),
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(doc.metadata?.normalizedAliases || []),
      ...(doc.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function docHasNamedLawRaAnchor(doc = {}, namedLawDetection = null) {
  const raNumber = namedLawDetection?.bestMatch?.republicActNumber;
  if (!raNumber) return false;

  const haystack = buildDocHaystack(doc);

  return (
    haystack.includes(`ra ${raNumber}`) ||
    haystack.includes(`republic act ${raNumber}`) ||
    haystack.includes(`republic act no ${raNumber}`)
  );
}

function docHasNamedLawTitleAnchor(doc = {}, namedLawDetection = null) {
  const bestMatch = namedLawDetection?.bestMatch;
  if (!bestMatch) return false;

  const haystack = buildDocHaystack(doc);

  return Boolean(
    (bestMatch.shortTitle &&
      haystack.includes(normalizeLooseText(bestMatch.shortTitle))) ||
      (bestMatch.canonicalTitle &&
        haystack.includes(normalizeLooseText(bestMatch.canonicalTitle)))
  );
}

function docMatchesPreferredImplementingQuery(doc = {}, namedLawDetection = null) {
  const bestMatch = namedLawDetection?.bestMatch;
  if (!bestMatch) return false;

  const haystack = buildDocHaystack(doc);
  const queries = Array.isArray(bestMatch.preferredImplementingQueries)
    ? bestMatch.preferredImplementingQueries
    : [];

  return queries.some((query) => {
    const normalized = normalizeLooseText(query);
    return normalized && haystack.includes(normalized);
  });
}

function isNamedLawPrimaryStatute(doc = {}, namedLawDetection = null) {
  return (
    getDocAuthorityType(doc) === "STATUTE" &&
    (docHasNamedLawRaAnchor(doc, namedLawDetection) ||
      docHasNamedLawTitleAnchor(doc, namedLawDetection))
  );
}

function isNamedLawImplementingRR(doc = {}, namedLawDetection = null) {
  return (
    ["RR", "REVENUE_REGULATION"].includes(getDocAuthorityType(doc)) &&
    (docHasNamedLawRaAnchor(doc, namedLawDetection) ||
      docHasNamedLawTitleAnchor(doc, namedLawDetection) ||
      docMatchesPreferredImplementingQuery(doc, namedLawDetection))
  );
}

function isNamedLawSupportingIssuance(doc = {}, namedLawDetection = null) {
  const authorityType = getDocAuthorityType(doc);

  return (
    ["RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityType) &&
    (docHasNamedLawRaAnchor(doc, namedLawDetection) ||
      docHasNamedLawTitleAnchor(doc, namedLawDetection) ||
      docMatchesPreferredImplementingQuery(doc, namedLawDetection))
  );
}

function selectNamedLawPriorityDocs(docs = [], namedLawDetection = null, maxDocs = 5) {
  if (!namedLawDetection?.matched || !namedLawDetection?.bestMatch) {
    return sortDocsForLegalBasis(docs).slice(0, maxDocs);
  }

  const uniqueDocs = mergeUniqueDocs(docs);

  const primaryStatutes = sortDocsForLegalBasis(
    uniqueDocs.filter((doc) => isNamedLawPrimaryStatute(doc, namedLawDetection))
  );

  const implementingRRs = sortDocsForLegalBasis(
    uniqueDocs.filter(
      (doc) =>
        !primaryStatutes.includes(doc) &&
        isNamedLawImplementingRR(doc, namedLawDetection)
    )
  );

  const supportingIssuances = sortDocsForLegalBasis(
    uniqueDocs.filter(
      (doc) =>
        !primaryStatutes.includes(doc) &&
        !implementingRRs.includes(doc) &&
        isNamedLawSupportingIssuance(doc, namedLawDetection)
    )
  );

  const otherAnchoredDocs = sortDocsForLegalBasis(
    uniqueDocs.filter(
      (doc) =>
        !primaryStatutes.includes(doc) &&
        !implementingRRs.includes(doc) &&
        !supportingIssuances.includes(doc) &&
        (docHasNamedLawRaAnchor(doc, namedLawDetection) ||
          docHasNamedLawTitleAnchor(doc, namedLawDetection))
    )
  );

  return mergeUniqueDocs([
    ...primaryStatutes,
    ...implementingRRs,
    ...supportingIssuances,
    ...otherAnchoredDocs
  ]).slice(0, maxDocs);
}

function hasNamedLawPrimaryBasis(docs = [], namedLawDetection = null) {
  return docs.some((doc) => isNamedLawPrimaryStatute(doc, namedLawDetection));
}

function mergeRetrievalResults(retrievals = []) {
  const merged = [];
  const seen = new Map();
  let exactCitation = null;

  for (const retrieval of retrievals) {
    if (!exactCitation && retrieval?.exactCitation?.matched) {
      exactCitation = retrieval.exactCitation;
    }

    for (const item of retrieval?.results || []) {
      const key = buildDocKey(item) || `doc-${merged.length}`;

      if (!seen.has(key)) {
        seen.set(key, merged.length);
        merged.push(item);
        continue;
      }

      const index = seen.get(key);
      const existing = merged[index];

      const existingScore = Number(
        existing?.finalScore ??
          existing?.combined_score ??
          existing?.score ??
          0
      );

      const candidateScore = Number(
        item?.finalScore ??
          item?.combined_score ??
          item?.score ??
          0
      );

      if (candidateScore > existingScore) {
        merged[index] = {
          ...existing,
          ...item,
          finalScore: candidateScore,
          score: candidateScore
        };
      }
    }
  }

  return { results: merged, exactCitation };
}

function buildEvidenceMetadata(doc = {}) {
  return {
    ...(doc.metadata || {}),
    authorityTier:
      doc.authorityLevel ??
      doc.authority_level ??
      doc.metadata?.authorityLevel ??
      null,
    authorityType:
      doc.authorityType ??
      doc.authority_type ??
      doc.metadata?.authorityType ??
      null,
    authorityScore:
      doc.authorityScore ??
      doc.authority_score ??
      doc.metadata?.authorityScore ??
      null,
    normalizedReference:
      doc.normalizedReference ??
      doc.normalized_reference ??
      doc.metadata?.normalizedReference ??
      null,
    normalizedAliases:
      doc.normalizedAliases ??
      doc.normalized_aliases ??
      doc.metadata?.normalizedAliases ??
      [],
    effectiveFrom:
      doc.effectiveFrom ??
      doc.effective_from ??
      doc.metadata?.effectiveFrom ??
      null,
    effectiveTo:
      doc.effectiveTo ??
      doc.effective_to ??
      doc.metadata?.effectiveTo ??
      null,
    isSuperseded:
      typeof doc.isSuperseded === "boolean"
        ? doc.isSuperseded
        : typeof doc.is_superseded === "boolean"
          ? doc.is_superseded
          : Boolean(doc.metadata?.isSuperseded || false),
    supersededByReference:
      doc.supersededByReference ??
      doc.superseded_by_reference ??
      doc.metadata?.supersededByReference ??
      null,
    repealedByReference:
      doc.repealedByReference ??
      doc.repealed_by_reference ??
      doc.metadata?.repealedByReference ??
      null,
    amendedByReference:
      doc.amendedByReference ??
      doc.amended_by_reference ??
      doc.metadata?.amendedByReference ??
      null
  };
}

function formatDocsForPrompt(docs = [], maxDocs = 8) {
  return (docs || [])
    .slice(0, maxDocs)
    .map((doc, index) => {
      const title =
        doc.source ||
        doc.originalSource ||
        doc.original_source ||
        doc.title ||
        doc.metadata?.originalSource ||
        "Untitled Source";

      return [
        `SOURCE ${index + 1}: ${title}`,
        `PATH: ${doc.path || doc.source_path || doc.metadata?.path || "Unknown"}`,
        `AUTHORITY TYPE: ${doc.authorityType || doc.authority_type || doc.metadata?.authorityType || "SECONDARY"}`,
        `AUTHORITY LEVEL: ${doc.authorityLevel ?? doc.authority_level ?? doc.metadata?.authorityLevel ?? 99}`,
        `NORMALIZED REFERENCE: ${doc.normalizedReference || doc.normalized_reference || doc.metadata?.normalizedReference || "N/A"}`,
        "TEXT:",
        truncateForPrompt(doc.text || doc.content || doc.excerpt || "", 3500)
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function buildConflictContextForPrompt({
  conflicts = [],
  hierarchyConflict = null,
  doctrinalReview = null
}) {
  const parts = [];

  if (hierarchyConflict) {
    parts.push(
      [
        "Hierarchy / Conflict Engine Review:",
        JSON.stringify(
          {
            conflict: Boolean(hierarchyConflict.conflict),
            conflictType: hierarchyConflict.conflictType || null,
            doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
            hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
            apparentConflict: Boolean(hierarchyConflict.apparentConflict),
            exactIssue: hierarchyConflict.exactIssue || null,
            distinctionType: hierarchyConflict.distinctionType || null,
            controllingAuthority: hierarchyConflict.controllingAuthority || null,
            controllingSource: hierarchyConflict.controllingSource || null,
            overriddenAuthority: hierarchyConflict.overriddenAuthority || null,
            reason: hierarchyConflict.reason || null,
            resolutionBasis: hierarchyConflict.resolutionBasis || null,
            overrideApplied: Boolean(hierarchyConflict.overrideApplied)
          },
          null,
          2
        )
      ].join("\n")
    );
  }

  if (doctrinalReview) {
    parts.push(
      [
        "Doctrinal Engine Review:",
        JSON.stringify(
          {
            hasConflict: Boolean(doctrinalReview.hasConflict),
            hasApparentConflict: Boolean(doctrinalReview.hasApparentConflict),
            doctrinalStatus: doctrinalReview.doctrinalStatus || null,
            explanation: doctrinalReview.explanation || null,
            doctrinalConflictCount:
              doctrinalReview.doctrinalConflicts?.length || 0
          },
          null,
          2
        )
      ].join("\n")
    );
  }

  if (Array.isArray(conflicts) && conflicts.length) {
    parts.push(
      [
        "Evidence Conflict Signals:",
        JSON.stringify(conflicts.slice(0, 5), null, 2)
      ].join("\n")
    );
  }

  return parts.length
    ? parts.join("\n\n")
    : "No detected conflict signal from retrieval. The answer must still independently determine doctrinal status.";
}

function buildNamedLawFallbackText(bestMatch) {
  if (!bestMatch) {
    return "No exact indexed legal source was found for the named law or act asked.";
  }

  const title =
    bestMatch.shortTitle ||
    bestMatch.canonicalTitle ||
    `RA ${bestMatch.republicActNumber || ""}`.trim();

  const raText = bestMatch.republicActNumber
    ? ` (RA ${bestMatch.republicActNumber})`
    : "";

  return [
    `TINA recognized the question as referring to ${title}${raText}.`,
    "",
    "However, no exact indexed primary legal source for that law was found in the current tax library.",
    "TINA will not present unrelated documents as support.",
    "",
    "Please upload or index the exact law text and, if available, its implementing rules and regulations."
  ].join("\n");
}

function extractLegalBasisLines(answerText = "") {
  const text = String(answerText || "");

  const afMatch = text.match(
    /\bB\.\s*CONTROLLING LEGAL BASIS\b([\s\S]*?)(?:\n\s*[C-F]\.\s+[A-Z][A-Z /]+\b|$)/i
  );

  if (afMatch) {
    return afMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[\-\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  return [];
}

function buildAnswerAnchors({
  answerText = "",
  finalQuestion = "",
  namedLawDetection = null,
  issuance = null
}) {
  const anchors = new Set();
  const normalizedAnswer = normalizeLooseText(answerText);
  const normalizedQuestion = normalizeLooseText(finalQuestion);

  const commonAnchors = [
    "1987 constitution",
    "constitution",
    "nirc",
    "tax code",
    "local government code",
    "value added tax",
    "vat",
    "income tax",
    "excise tax",
    "documentary stamp tax",
    "withholding tax",
    "create law",
    "train law",
    "ease of paying taxes",
    "eopt",
    "create more"
  ];

  for (const anchor of commonAnchors) {
    const normalizedAnchor = normalizeLooseText(anchor);

    if (
      normalizedAnswer.includes(normalizedAnchor) ||
      normalizedQuestion.includes(normalizedAnchor)
    ) {
      anchors.add(normalizedAnchor);
    }
  }

  const raMatches = [
    ...normalizedAnswer.matchAll(/\bra\s*(\d{4,6})\b/g),
    ...normalizedQuestion.matchAll(/\bra\s*(\d{4,6})\b/g)
  ];

  for (const match of raMatches) {
    anchors.add(`ra ${match[1]}`);
  }

  if (namedLawDetection?.bestMatch) {
    const best = namedLawDetection.bestMatch;

    if (best.canonicalTitle) anchors.add(normalizeLooseText(best.canonicalTitle));
    if (best.shortTitle) anchors.add(normalizeLooseText(best.shortTitle));
    if (best.republicActNumber) anchors.add(`ra ${best.republicActNumber}`);

    for (const alias of best.normalizedAliases || []) {
      if (alias) anchors.add(normalizeLooseText(alias));
    }
  }

  if (issuance) {
    anchors.add(normalizeLooseText(`${issuance.type} ${issuance.number} ${issuance.year}`));
    anchors.add(normalizeLooseText(`${issuance.type}-${issuance.number}-${issuance.year}`));
    anchors.add(normalizeLooseText(`${issuance.type} no ${issuance.number}-${issuance.year}`));
  }

  for (const line of extractLegalBasisLines(answerText)) {
    const normalized = normalizeLooseText(line);

    if (normalized.length >= 6) anchors.add(normalized);

    const trimmedBeforeParen = normalizeLooseText(line.replace(/\(.*?\)/g, ""));
    if (trimmedBeforeParen.length >= 6) anchors.add(trimmedBeforeParen);

    const raInLine = normalized.match(/\bra\s*(\d{4,6})\b/);
    if (raInLine) anchors.add(`ra ${raInLine[1]}`);
  }

  return [...anchors].map((item) => item.trim()).filter((item) => item.length >= 4);
}

function docMatchesAnchors(doc = {}, anchors = []) {
  const haystack = buildDocHaystack(doc);
  if (!haystack) return false;

  return anchors.some((anchor) => {
    const normalizedAnchor = normalizeLooseText(anchor);
    if (!normalizedAnchor || normalizedAnchor.length < 4) return false;
    return haystack.includes(normalizedAnchor);
  });
}

function selectGroundedDisplayableDocs(displayableDocs = [], options = {}) {
  const {
    answerText = "",
    finalQuestion = "",
    namedLawDetection = null,
    issuance = null
  } = options;

  const anchors = buildAnswerAnchors({
    answerText,
    finalQuestion,
    namedLawDetection,
    issuance
  });

  const matched = displayableDocs.filter((doc) => docMatchesAnchors(doc, anchors));

  return matched.length ? matched : displayableDocs.slice(0, MAX_VISIBLE_SOURCES);
}

function buildComplianceInsight({
  issuance = null,
  questionType = "",
  namedLawDetection = null,
  doctrinalReview = null,
  hierarchyConflict = null,
  adaptiveState = null
}) {
  const notes = [];

  if (adaptiveState?.riskScore?.overallRisk?.level) {
    notes.push(`Adaptive risk level: ${adaptiveState.riskScore.overallRisk.level}.`);
  }

  if (adaptiveState?.positionStrength?.positionStrength) {
    notes.push(`Position strength: ${adaptiveState.positionStrength.positionStrength}.`);
  }

  if (adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion) {
    notes.push("Assumptions, gaps, and limitations must be disclosed before a strong conclusion.");
  }

  if (hierarchyConflict?.apparentConflict) {
    notes.push(
      "An apparent conflict was detected; verify whether the authorities are distinguishable by issue, procedure, evidence, jurisdiction, timing, or facts."
    );
  }

  if (hierarchyConflict?.conflict) {
    notes.push(
      "A hierarchy or doctrinal conflict signal was detected; apply the controlling authority expressly and document why lower authority does not control."
    );
  }

  if (doctrinalReview?.hasApparentConflict) {
    notes.push("Some authorities may be complementary or distinguishable rather than directly conflicting.");
  }

  if (issuance || questionType === "issuance") {
    return [
      "Use the cited issuance and verify the latest amended or superseding BIR issuance before relying on the rule operationally.",
      ...notes
    ].join(" ");
  }

  if (namedLawDetection?.matched) {
    return [
      "For named-law questions, rely first on the exact statute and its IRR before using secondary support.",
      ...notes
    ].join(" ");
  }

  return [
    "Apply the higher-authority rule first and use lower-authority material only as support.",
    ...notes
  ].join(" ");
}

function buildRouteResponsePayload({
  answerText,
  legalBasisDocs = [],
  sourcesUsed = [],
  hierarchyConflict = null
}) {
  return buildFinalRoutePayload({
    answer: answerText,
    legalBasisDocs,
    sourcesUsed,
    hierarchyConflict
  });
}

function mergeConflictSignals({
  rawConflicts = [],
  displayableConflicts = [],
  hierarchyConflict = null,
  doctrinalReview = null,
  provisionModeResult = null,
  caseModeResult = null,
  doctrineModeResult = null
}) {
  const merged = [];

  for (const item of displayableConflicts || []) merged.push(item);

  for (const item of rawConflicts || []) {
    if (!displayableConflicts.includes(item)) merged.push(item);
  }

  if (hierarchyConflict?.conflict || hierarchyConflict?.apparentConflict) {
    merged.push({
      source: "conflict-engine",
      conflictType: hierarchyConflict.conflictType || null,
      doctrinalConflict: Boolean(hierarchyConflict.doctrinalConflict),
      hierarchyConflict: Boolean(hierarchyConflict.hierarchyConflict),
      apparentConflict: Boolean(hierarchyConflict.apparentConflict),
      exactIssue: hierarchyConflict.exactIssue || null,
      distinctionType: hierarchyConflict.distinctionType || null,
      controllingAuthority: hierarchyConflict.controllingAuthority || null,
      controllingSource: hierarchyConflict.controllingSource || null,
      overriddenAuthority: hierarchyConflict.overriddenAuthority || null,
      reason: hierarchyConflict.reason || null,
      resolutionBasis: hierarchyConflict.resolutionBasis || null
    });
  }

  for (const item of doctrinalReview?.doctrinalConflicts || []) {
    merged.push({
      source: "doctrinal-engine",
      conflictType: item.conflictStatus || null,
      conflictLabel: item.conflictLabel || null,
      doctrinalConflict: ["DIRECT_CONFLICT", "PARTIAL_CONFLICT"].includes(item.conflictStatus),
      apparentConflict: item.conflictStatus === "APPARENT_CONFLICT",
      exactIssue: item.exactIssue || null,
      distinctionType: item.distinctionType || null,
      controllingAuthority: item.controllingAuthority || null,
      controllingSource: item.controllingSource || null,
      weakerAuthority: item.weakerAuthority || null,
      weakerSource: item.weakerSource || null,
      reason: item.reason || null,
      resolutionBasis: item.resolutionBasis || null
    });
  }

  for (const result of [provisionModeResult, caseModeResult, doctrineModeResult]) {
    if (!result) continue;

    if (result.hierarchyConflict?.conflict || result.hierarchyConflict?.apparentConflict) {
      merged.push({
        source: `${result.mode || "specialized"}-hierarchy-conflict`,
        ...result.hierarchyConflict
      });
    }

    if (Array.isArray(result.doctrinalReview?.doctrinalConflicts)) {
      for (const item of result.doctrinalReview.doctrinalConflicts) {
        merged.push({
          source: `${result.mode || "specialized"}-doctrinal-review`,
          ...item
        });
      }
    }

    if (Array.isArray(result.overrideAudit)) {
      for (const item of result.overrideAudit) {
        merged.push({
          source: `${result.mode || "specialized"}-override-audit`,
          ...item
        });
      }
    }
  }

  const seen = new Set();

  return merged.filter((item) => {
    const key = JSON.stringify({
      source: item.source || null,
      type: item.conflictType || item.conflictStatus || null,
      a: item.sourceA || item.source_a_path || item.controllingSource || null,
      b: item.sourceB || item.source_b_path || item.overriddenSource || item.weakerSource || null,
      issue: item.exactIssue || item.reason || null
    });

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildAnswerMode({
  hookConfig,
  provisionModeResult,
  caseModeResult,
  doctrineModeResult,
  namedLawDetection,
  issuance,
  adaptiveState
}) {
  if (adaptiveState?.responsePlan?.responseMode) {
    return `adaptive_${String(adaptiveState.responsePlan.responseMode).toLowerCase()}_reasoned_answer`;
  }

  if (provisionModeResult?.handled) return "provision_citation_reasoned_answer";
  if (caseModeResult?.handled) return "case_analysis_reasoned_answer";
  if (doctrineModeResult?.handled) return "doctrine_analysis_reasoned_answer";
  if (namedLawDetection?.matched) return "named_law_reasoned_answer";
  if (issuance) return `exact_issuance_${hookConfig.mode.toLowerCase()}_reasoned`;

  return `${hookConfig.mode.toLowerCase()}_reasoned_answer`;
}

function getSpecializedDocs({
  provisionModeResult,
  caseModeResult,
  doctrineModeResult
}) {
  if (provisionModeResult?.handled && Array.isArray(provisionModeResult.topDocs)) {
    return provisionModeResult.topDocs;
  }

  if (caseModeResult?.handled) {
    return mergeUniqueDocs([
      ...(caseModeResult.caseDocs || []),
      ...(caseModeResult.birDocs || [])
    ]);
  }

  if (doctrineModeResult?.handled && Array.isArray(doctrineModeResult.topAuthorities)) {
    return doctrineModeResult.topAuthorities.map((item) => ({
      source: item.title || item.source,
      path: item.source,
      text: item.excerpt,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      doctrineLabel: item.doctrineLabel,
      doctrineApplicability: item.doctrineApplicability,
      doctrineApplicabilityExplanation: item.doctrineApplicabilityExplanation
    }));
  }

  return [];
}

function buildAdaptiveState({ adaptiveContext = null, adaptivePromptBundle = null }) {
  const context = adaptiveContext || {};

  return {
    enabled: Boolean(adaptiveContext),
    adaptivePromptBundle: adaptivePromptBundle || context.adaptivePromptBundle || null,
    userBehavior: context.userBehavior || null,
    adaptiveMode: context.adaptiveMode || null,
    queryIntent: context.queryIntent || null,
    factPattern: context.factPattern || null,
    contractInterpretation: context.contractInterpretation || null,
    transactionCharacterization: context.transactionCharacterization || null,
    economicSubstance: context.economicSubstance || null,
    evidenceEvaluation: context.evidenceEvaluation || null,
    assumptionGap: context.assumptionGap || null,
    riskScore: context.riskScore || null,
    positionStrength: context.positionStrength || null,
    responsePlan: context.responsePlan || null,
    failures: context.failures || []
  };
}

function getAdaptivePlannerInstructions(adaptiveState) {
  const instructions = [];

  if (adaptiveState?.adaptivePromptBundle) {
    instructions.push(adaptiveState.adaptivePromptBundle);
  } else {
    instructions.push(FALLBACK_TINA_STRUCTURE);
  }

  if (adaptiveState?.responsePlan?.plannerInstruction?.length) {
    instructions.push(
      [
        "ADAPTIVE RESPONSE PLAN:",
        ...adaptiveState.responsePlan.plannerInstruction.map((item) => `- ${item}`)
      ].join("\n")
    );
  }

  if (adaptiveState?.assumptionGap?.mandatoryDisclosure?.length) {
    instructions.push(
      [
        "MANDATORY DISCLOSURE BEFORE STRONG CONCLUSION:",
        JSON.stringify(adaptiveState.assumptionGap.mandatoryDisclosure, null, 2)
      ].join("\n")
    );
  }

  if (adaptiveState?.riskScore?.recommendedResponseControls?.length) {
    instructions.push(
      [
        "RISK-BASED RESPONSE CONTROLS:",
        ...adaptiveState.riskScore.recommendedResponseControls.map((item) => `- ${item}`)
      ].join("\n")
    );
  }

  if (adaptiveState?.positionStrength?.conclusionLanguage) {
    instructions.push(
      `POSITION-STRENGTH CONCLUSION LANGUAGE:\n${adaptiveState.positionStrength.conclusionLanguage}`
    );
  }

  return instructions.filter(Boolean).join("\n\n---\n\n");
}

function getConclusionRestriction(adaptiveState = {}) {
  const riskRestriction = adaptiveState?.riskScore?.conclusionRestriction || null;
  const positionAction = adaptiveState?.positionStrength?.conclusionAction || null;
  const gapStrength = adaptiveState?.assumptionGap?.conclusionStrength || null;

  if (
    riskRestriction === "DEFER_STRONG_CONCLUSION" ||
    positionAction === "DEFER_CONCLUSION" ||
    gapStrength === "DEFER_CONCLUSION"
  ) {
    return "DEFER_STRONG_CONCLUSION";
  }

  if (
    riskRestriction === "PRELIMINARY_CONCLUSION_ONLY" ||
    positionAction === "USE_QUALIFIED_CONCLUSION" ||
    positionAction === "DISCLOSE_AGGRESSIVE_POSITION" ||
    gapStrength === "PRELIMINARY_CONCLUSION_ONLY"
  ) {
    return "PRELIMINARY_CONCLUSION_ONLY";
  }

  return "DIRECT_CONCLUSION_ALLOWED";
}

function buildConclusionRestrictionInstruction(adaptiveState = {}) {
  const restriction = getConclusionRestriction(adaptiveState);

  if (restriction === "DEFER_STRONG_CONCLUSION") {
    return [
      "CONCLUSION GATING:",
      "Do not give a definitive or strong conclusion.",
      "State what facts, documents, legal bases, or evidence must be verified first.",
      "Use preliminary and conditional language."
    ].join("\n");
  }

  if (restriction === "PRELIMINARY_CONCLUSION_ONLY") {
    return [
      "CONCLUSION GATING:",
      "Use qualified conclusion language only.",
      "State that the position is preliminary and subject to verification.",
      "Disclose assumptions, gaps, ambiguities, and evidence limits where applicable."
    ].join("\n");
  }

  return [
    "CONCLUSION GATING:",
    "A direct conclusion is allowed only if supported by retrieved authority and evidence."
  ].join("\n");
}

function buildAdaptiveContextForPrompt(adaptiveState = {}) {
  return JSON.stringify(
    {
      userBehavior: adaptiveState.userBehavior
        ? {
            inferredRole: adaptiveState.userBehavior.inferredRole,
            responsePosture: adaptiveState.userBehavior.responsePosture,
            recommendedMode: adaptiveState.userBehavior.recommendedMode
          }
        : null,
      adaptiveMode: adaptiveState.adaptiveMode
        ? {
            primaryMode: adaptiveState.adaptiveMode.primaryMode,
            secondaryModes: adaptiveState.adaptiveMode.secondaryModes,
            riskLevel: adaptiveState.adaptiveMode.riskLevel,
            complexityLevel: adaptiveState.adaptiveMode.complexityLevel,
            outputDepth: adaptiveState.adaptiveMode.outputDepth,
            responseStructure: adaptiveState.adaptiveMode.responseStructure
          }
        : null,
      factPattern: adaptiveState.factPattern
        ? {
            knownFacts: adaptiveState.factPattern.knownFacts,
            unresolvedFacts: adaptiveState.factPattern.unresolvedFacts,
            alternativeCharacterizations: adaptiveState.factPattern.alternativeCharacterizations,
            documentsRequired: adaptiveState.factPattern.documentsRequired,
            factCompleteness: adaptiveState.factPattern.factCompleteness
          }
        : null,
      transactionCharacterization: adaptiveState.transactionCharacterization
        ? {
            primaryCharacterization: adaptiveState.transactionCharacterization.primaryCharacterization,
            riskLevel: adaptiveState.transactionCharacterization.riskLevel,
            preliminaryConclusion: adaptiveState.transactionCharacterization.preliminaryConclusion
          }
        : null,
      economicSubstance: adaptiveState.economicSubstance
        ? {
            result: adaptiveState.economicSubstance.result,
            riskLevel: adaptiveState.economicSubstance.riskLevel,
            findings: adaptiveState.economicSubstance.findings
          }
        : null,
      evidenceEvaluation: adaptiveState.evidenceEvaluation
        ? {
            evidenceStrength: adaptiveState.evidenceEvaluation.evidenceStrength,
            riskLevel: adaptiveState.evidenceEvaluation.riskLevel,
            findings: adaptiveState.evidenceEvaluation.findings,
            auditSensitiveItems: adaptiveState.evidenceEvaluation.auditSensitiveItems
          }
        : null,
      assumptionGap: adaptiveState.assumptionGap
        ? {
            riskLevel: adaptiveState.assumptionGap.riskLevel,
            conclusionStrength: adaptiveState.assumptionGap.conclusionStrength,
            mandatoryDisclosure: adaptiveState.assumptionGap.mandatoryDisclosure
          }
        : null,
      riskScore: adaptiveState.riskScore
        ? {
            overallRisk: adaptiveState.riskScore.overallRisk,
            taxpayerDefensibility: adaptiveState.riskScore.taxpayerDefensibility,
            conclusionRestriction: adaptiveState.riskScore.conclusionRestriction
          }
        : null,
      positionStrength: adaptiveState.positionStrength
        ? {
            positionStrength: adaptiveState.positionStrength.positionStrength,
            conclusionAction: adaptiveState.positionStrength.conclusionAction,
            conclusionLanguage: adaptiveState.positionStrength.conclusionLanguage
          }
        : null,
      responsePlan: adaptiveState.responsePlan
        ? {
            responseMode: adaptiveState.responsePlan.responseMode,
            responseDepth: adaptiveState.responsePlan.responseDepth,
            responseTemplate: adaptiveState.responsePlan.responseTemplate,
            conclusionRule: adaptiveState.responsePlan.conclusionRule,
            mustIncludeLimitation: adaptiveState.responsePlan.mustIncludeLimitation
          }
        : null
    },
    null,
    2
  );
}

async function enforceAdaptiveFinalAnalysis({
  openai,
  model = DEFAULT_MODEL,
  question,
  draftAnswer = "",
  docs = [],
  conflicts = [],
  hierarchyConflict = null,
  doctrinalReview = null,
  namedLawDetection = null,
  issuance = null,
  memoryContext = "",
  adaptiveState = {}
}) {
  const cleanDraft = String(draftAnswer || "").trim();
  if (!cleanDraft) return cleanDraft;

  const sourceContext = formatDocsForPrompt(docs, 8);
  if (!sourceContext.trim()) return cleanDraft;

  const alreadyCompleteAF = hasCompleteAFStructure(cleanDraft);
  const adaptiveInstructions = getAdaptivePlannerInstructions(adaptiveState);
  const conclusionInstruction = buildConclusionRestrictionInstruction(adaptiveState);

  const systemPrompt = [
    adaptiveInstructions || FALLBACK_TINA_STRUCTURE,
    "",
    alreadyCompleteAF
      ? "You are the final adaptive TINA technical reviewer. Preserve the current structure if it matches the response plan. Improve legal coherence, factual discipline, evidence limits, conflict analysis, and hierarchy analysis."
      : "You are the final adaptive TINA technical reviewer. Rewrite the draft using the adaptive response plan.",
    conclusionInstruction,
    "Use only the provided indexed source context, adaptive context, conflict metadata, and draft.",
    "Do not invent laws, cases, dates, rates, issuances, section numbers, GR numbers, or citations.",
    "If a required item is not supported by provided context, say no indexed support was retrieved for that item.",
    "Every cited source must be tied to doctrine, rule, hierarchy, evidence, or application.",
    "Do not append a separate raw source list; route payload handles sources."
  ].join("\n");

  const userPrompt = [
    "QUESTION:",
    question,
    "",
    "CONVERSATION MEMORY:",
    memoryContext || "No prior conversation.",
    "",
    "ADAPTIVE CONTEXT:",
    buildAdaptiveContextForPrompt(adaptiveState),
    "",
    "DETECTED QUERY CONTEXT:",
    issuance ? `Issuance Query: ${JSON.stringify(issuance)}` : "Issuance Query: none",
    namedLawDetection?.matched
      ? `Named Law: ${namedLawDetection.bestMatch?.shortTitle || namedLawDetection.bestMatch?.canonicalTitle || "matched"}`
      : "Named Law: none",
    "",
    "DRAFT ANSWER TO REVIEW:",
    cleanDraft,
    "",
    "INDEXED SOURCE CONTEXT:",
    sourceContext,
    "",
    "CONFLICT / DOCTRINE CONTEXT:",
    buildConflictContextForPrompt({
      conflicts,
      hierarchyConflict,
      doctrinalReview
    }),
    "",
    "OUTPUT REQUIREMENT:",
    adaptiveState?.responsePlan?.responseTemplate?.length
      ? adaptiveState.responsePlan.responseTemplate.join("\n")
      : TINA_AF_HEADINGS.join("\n")
  ].join("\n");

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || cleanDraft;
}

async function loadAnswerRenderer() {
  if (rendererCache.loaded) return rendererCache.module;

  try {
    rendererCache.module = await import(ANSWER_RENDERER_PATH);
  } catch (error) {
    console.warn("answer-renderer.js not loaded; fallback renderer will be used:", error?.message || error);
    rendererCache.module = null;
  }

  rendererCache.loaded = true;
  return rendererCache.module;
}

async function renderAdaptiveAnswer({
  draftAnswer,
  fallbackAnswer,
  adaptiveState,
  legalBasisDocs,
  sourcesUsed,
  conflicts,
  hierarchyConflict,
  professionalInsight,
  routePayload
}) {
  const renderer = await loadAnswerRenderer();

  const renderFn =
    renderer?.renderAdaptiveAnswer ||
    renderer?.renderAnswer ||
    renderer?.buildRenderedAnswer ||
    null;

  if (typeof renderFn === "function") {
    try {
      const rendered = await renderFn({
        draftAnswer,
        fallbackAnswer,
        adaptiveContext: adaptiveState,
        responsePlan: adaptiveState?.responsePlan || null,
        assumptionGap: adaptiveState?.assumptionGap || null,
        riskScore: adaptiveState?.riskScore || null,
        positionStrength: adaptiveState?.positionStrength || null,
        legalBasisDocs,
        sourcesUsed,
        conflicts,
        hierarchyConflict,
        professionalInsight,
        routePayload
      });

      if (typeof rendered === "string") return rendered;
      if (rendered?.answer) return rendered.answer;
      if (rendered?.answerText) return rendered.answerText;
      if (rendered?.markdown) return rendered.markdown;
    } catch (error) {
      console.warn("Adaptive answer renderer failed; fallback renderer used:", error?.message || error);
    }
  }

  return buildFinalCompliantAnswer({
    draftAnswer,
    fallbackAnswer,
    legalBasisDocs,
    sourcesUsed,
    conflicts,
    hierarchyConflict,
    professionalInsight
  });
}

async function persistAnswerRendering({
  supabase,
  userId,
  conversationId,
  messageId = null,
  adaptiveState,
  answerText,
  routePayload,
  finalVisibleSources,
  limitationStatement = null
}) {
  try {
    const { error } = await supabase.from("tina_answer_renderings").insert({
      user_id: userId || null,
      conversation_id: conversationId || null,
      message_id: messageId || null,
      response_mode:
        adaptiveState?.responsePlan?.responseMode ||
        adaptiveState?.adaptiveMode?.primaryMode ||
        null,
      response_depth:
        adaptiveState?.responsePlan?.responseDepth ||
        adaptiveState?.adaptiveMode?.outputDepth ||
        null,
      answer_markdown: answerText || "",
      answer_sections: adaptiveState?.responsePlan?.responseTemplate || [],
      citations_used: routePayload?.sources || [],
      sources_used: finalVisibleSources || [],
      limitation_statement: limitationStatement,
      confidence_statement: routePayload?.confidence_level || null,
      renderer_payload: {
        adaptiveMode: adaptiveState?.adaptiveMode || null,
        responsePlan: adaptiveState?.responsePlan || null,
        riskScore: adaptiveState?.riskScore || null,
        positionStrength: adaptiveState?.positionStrength || null,
        assumptionGap: adaptiveState?.assumptionGap || null
      }
    });

    if (error) {
      console.warn("tina_answer_renderings insert skipped:", error.message);
    }
  } catch (error) {
    console.warn("tina_answer_renderings insert failed:", error?.message || error);
  }
}

function buildFallbackComplianceAnswer({
  fallbackText,
  professionalInsight,
  adaptiveState
}) {
  const limitation =
    adaptiveState?.assumptionGap?.limitationStatement ||
    adaptiveState?.responsePlan?.limitationStatement ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  const adaptiveNote =
    adaptiveState?.responsePlan?.mustIncludeLimitation ||
    adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion
      ? `\n\nLimitation: ${limitation}`
      : "";

  return buildFinalCompliantAnswer({
    draftAnswer: `${fallbackText}${adaptiveNote}`,
    fallbackAnswer: fallbackText,
    directAnswer: "",
    legalBasisDocs: [],
    sourcesUsed: [],
    conflicts: [],
    hierarchyConflict: null,
    professionalInsight
  });
}

export function createRagAnswerHandler({ supabase, openai }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createRagAnswerHandler requires a valid Supabase client.");
  }

  if (!openai) {
    throw new Error("createRagAnswerHandler requires OpenAI client.");
  }

  async function saveConversationTurn({
    conversationId,
    userId,
    question,
    answerText,
    sourcesUsed = [],
    fallbackReferences = []
  }) {
    if (!conversationId || !userId) return;

    await saveMessage(supabase, {
      conversationId,
      userId,
      role: "user",
      content: question
    });

    await saveMessage(supabase, {
      conversationId,
      userId,
      role: "assistant",
      content: answerText,
      sourcesUsed,
      fallbackReferences
    });

    const hooks = extractMemoryHooks(question);
    await saveMemoryHooks(supabase, userId, hooks);
  }

  async function generateGeneralFallbackAnswer(
    cleanQuestion,
    memoryContext,
    adaptiveState,
    reason = "No sufficient indexed source was found."
  ) {
    const fallbackSystemPrompt = [
      adaptiveState?.adaptivePromptBundle || FALLBACK_TINA_STRUCTURE,
      "",
      "You may answer using general Philippine tax knowledge only when indexed sources are absent or weak.",
      "Rules:",
      "1. Clearly state that this is a general fallback answer.",
      "2. Do not pretend the answer came from indexed Google Drive or Supabase sources.",
      "3. Do not invent specific RR, RMC, RMO, RAMO, BIR rulings, dates, forms, deadlines, rates, case names, GR numbers, or case citations.",
      "4. For exact issuance questions, do not provide speculative content.",
      "5. Recommend verification against official NIRC/BIR/CTA/Supreme Court sources.",
      "6. Follow the adaptive response plan if available.",
      buildConclusionRestrictionInstruction(adaptiveState)
    ].join("\n");

    const fallbackUserPrompt = [
      "Reason for fallback:",
      reason,
      "",
      "Conversation Memory:",
      memoryContext,
      "",
      "Adaptive Context:",
      buildAdaptiveContextForPrompt(adaptiveState),
      "",
      "Question:",
      cleanQuestion
    ].join("\n");

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: fallbackSystemPrompt },
        { role: "user", content: fallbackUserPrompt }
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    return [
      "General TINA Fallback Answer",
      "",
      `Source Status: ${reason}`,
      "",
      "Important Note: This answer is not based on an indexed Google Drive/Supabase source and should be verified against official BIR/NIRC/court sources.",
      "",
      text || "No fallback answer generated."
    ].join("\n");
  }

  return {
    async handleRagAnswer({
      res,
      userId,
      conversationId,
      hookConfig,
      cleanQuestion,
      originalQuestion,
      adaptiveContext = null,
      adaptivePromptBundle = null
    }) {
      try {
        if (!cleanQuestion || !String(cleanQuestion).trim()) {
          return res.status(400).json({
            success: false,
            error: "Question required after hook"
          });
        }

        const adaptiveState = buildAdaptiveState({
          adaptiveContext,
          adaptivePromptBundle
        });

        const topicData = await detectTopic({
          supabase,
          question: cleanQuestion,
          userId,
          sessionId: conversationId || null
        });

        let finalQuestion = topicData.resolvedQuestion || cleanQuestion;

        if (
          (!finalQuestion || finalQuestion.length < 5) &&
          conversationId &&
          userId
        ) {
          try {
            const lastState = await getLastTopicState(
              supabase,
              userId,
              conversationId
            );

            if (lastState?.last_question) {
              finalQuestion = lastState.last_question;
            }
          } catch (error) {
            console.error("Topic fallback error:", error.message);
          }
        }

        const issuance = detectIssuanceQuery(finalQuestion);
        const questionType = classifyQuestion(finalQuestion);
        const namedLawDetection = detectNamedLaw(finalQuestion);

        const retrievalQueries = namedLawDetection.matched
          ? buildNamedLawSearchQueries(finalQuestion, {
              includeOriginalQuestion: true,
              maxQueries: 6
            })
          : [finalQuestion];

        let conversationHistory = [];

        if (conversationId && userId) {
          conversationHistory = await getConversationMessages(supabase, {
            conversationId,
            userId
          });
        }

        const memoryContext = buildMemoryContext(conversationHistory);

        async function saveAllMemory(
          answerText,
          sourcesUsed = [],
          fallbackReferences = []
        ) {
          if (hookConfig.requires_memory === false) return;

          await saveConversationTurn({
            conversationId,
            userId,
            question: originalQuestion,
            answerText,
            sourcesUsed,
            fallbackReferences
          });

          await saveTopicState(supabase, {
            userId,
            sessionId: conversationId || null,
            topic: topicData.topic,
            subject: topicData.subject,
            taxType: topicData.taxType,
            question: originalQuestion,
            answer: answerText
          });

          await saveModeState(supabase, {
            userId,
            sessionId: conversationId || null,
            activeHook: hookConfig.hook_code,
            activeMode: hookConfig.mode,
            modeTitle: hookConfig.title,
            lastQuestion: originalQuestion,
            lastAnswer: answerText
          });
        }

        const retrievals = [];

        for (const query of retrievalQueries) {
          const retrieval = await hybridRetrieve({
            supabase,
            vectorStore: { smartSearch, searchSimilar },
            query,
            questionType,
            taxType: topicData.taxType || "",
            topK:
              adaptiveState?.responsePlan?.responseDepth === "COMPREHENSIVE"
                ? 16
                : 12
          });

          retrievals.push(retrieval);
        }

        const mergedRetrieval = mergeRetrievalResults(retrievals);

        const hierarchyRerankedDocs = rerankByHierarchy(
          mergedRetrieval.results || [],
          finalQuestion
        );

        const supersessionResult = applySupersessionFilter(
          hierarchyRerankedDocs,
          new Date()
        );

        const activeRankedDocs =
          supersessionResult.activeDocs?.length > 0
            ? supersessionResult.activeDocs
            : hierarchyRerankedDocs;

        const namedLawFiltered = namedLawDetection.matched
          ? filterDocsForNamedLaw(activeRankedDocs, namedLawDetection, {
              minScore: 40,
              hardFilter: true,
              maxDocs: 12,
              requirePrimaryAuthority: true
            })
          : {
              lawMatched: false,
              bestMatch: null,
              matchedDocs: activeRankedDocs,
              discardedDocs: [],
              scoredDocs: [],
              primaryAuthorityFound: false
            };

        const namedLawMatchedDocs =
          namedLawDetection.matched && namedLawFiltered.matchedDocs.length > 0
            ? namedLawFiltered.matchedDocs
            : activeRankedDocs;

        const internalRankedDocs = namedLawMatchedDocs;

        const displayableRankedDocs = namedLawMatchedDocs.filter(
          (doc) => !shouldHideSourceFromUser(doc)
        );

        const namedLawPriorityDocs = namedLawDetection.matched
          ? selectNamedLawPriorityDocs(
              displayableRankedDocs,
              namedLawDetection,
              Math.max(MAX_VISIBLE_SOURCES, 6)
            )
          : [];

        const doctrinalReview = reconcileDoctrine({
          rankedDocs: internalRankedDocs,
          maxDocs: 5
        });

        const hierarchyConflict = detectHierarchyConflict(
          displayableRankedDocs.slice(0, 5)
        );

        let evidence = normalizeRetrievedEvidence(
          internalRankedDocs.map((doc) => ({
            ...doc,
            authority_tier:
              doc.authorityLevel ??
              doc.authority_level ??
              doc.metadata?.authorityLevel ??
              null,
            metadata: buildEvidenceMetadata(doc)
          }))
        );

        evidence = rankEvidenceByAuthority(evidence);

        const rawConflicts = detectEvidenceConflicts(evidence);

        const displayableConflicts = rawConflicts.filter((conflict) => {
          const a = conflict.source_a_path || "";
          const b = conflict.source_b_path || "";

          return (
            !shouldHideSourceFromUser({ path: a }) &&
            !shouldHideSourceFromUser({ path: b })
          );
        });

        const topEvidence = evidence.slice(0, 10);

        let preliminaryAnswer = "";

        const provisionModeResult = await maybeGenerateProvisionCitationAnswer({
          openai,
          question: finalQuestion,
          retrievedResults: internalRankedDocs,
          model: DEFAULT_MODEL
        });

        const caseModeResult =
          !provisionModeResult.handled
            ? await maybeGenerateCaseAnalysisAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL
              })
            : { handled: false };

        const doctrineModeResult =
          !provisionModeResult.handled && !caseModeResult.handled
            ? await maybeGenerateDoctrineAnswer({
                openai,
                question: finalQuestion,
                retrievedResults: internalRankedDocs,
                model: DEFAULT_MODEL
              })
            : { handled: false };

        const specializedDocs = getSpecializedDocs({
          provisionModeResult,
          caseModeResult,
          doctrineModeResult
        });

        const strictDocsForContext = mergeUniqueDocs([
          ...specializedDocs,
          ...internalRankedDocs
        ]);

        const strictContext = formatDocsForPrompt(strictDocsForContext, 6);

        if (provisionModeResult.handled) {
          preliminaryAnswer = provisionModeResult.answer || "";
        } else if (caseModeResult.handled) {
          preliminaryAnswer = caseModeResult.answer || "";
        } else if (doctrineModeResult.handled) {
          preliminaryAnswer = doctrineModeResult.answer || "";
        } else if (topEvidence.length > 0) {
          const topLegalBasesForPrompt = namedLawDetection.matched
            ? selectNamedLawPriorityDocs(
                displayableRankedDocs,
                namedLawDetection,
                3
              )
            : selectTopLegalBases(displayableRankedDocs, 3);

          const strictPrompt = [
            adaptiveState?.adaptivePromptBundle || "",
            buildStrictAnswerPrompt({
              hookMode: hookConfig?.mode || "ASK",
              originalQuestion,
              cleanQuestion,
              context: strictContext,
              topLegalBases: topLegalBasesForPrompt,
              conflict: hierarchyConflict
            }),
            getAdaptivePlannerInstructions(adaptiveState),
            buildConclusionRestrictionInstruction(adaptiveState)
          ]
            .filter(Boolean)
            .join("\n\n---\n\n");

          const strictResponse = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            temperature: 0,
            messages: [
              { role: "system", content: strictPrompt },
              {
                role: "user",
                content: [
                  "Conversation Memory:",
                  memoryContext || "No prior conversation.",
                  "",
                  "Topic Data:",
                  JSON.stringify(topicData || {}),
                  "",
                  `Question Type: ${questionType}`,
                  `Resolved Question: ${finalQuestion}`,
                  namedLawDetection.matched
                    ? `Detected Named Law: ${
                        namedLawDetection.bestMatch?.shortTitle ||
                        namedLawDetection.bestMatch?.canonicalTitle ||
                        "N/A"
                      }`
                    : "Detected Named Law: none",
                  "",
                  "Adaptive Context:",
                  buildAdaptiveContextForPrompt(adaptiveState),
                  "",
                  "Doctrinal Review:",
                  JSON.stringify(doctrinalReview || {}, null, 2),
                  "",
                  "Hierarchy Conflict Review:",
                  JSON.stringify(hierarchyConflict || {}, null, 2)
                ].join("\n")
              }
            ]
          });

          preliminaryAnswer =
            strictResponse.choices?.[0]?.message?.content?.trim() ||
            (await synthesizeGroundedAnswer({
              openai,
              hookConfig,
              originalQuestion,
              cleanQuestion,
              topicData,
              questionType,
              evidence: topEvidence,
              conflicts: rawConflicts,
              memoryContext
            }));
        }

        const mergedConflictSignals = mergeConflictSignals({
          rawConflicts,
          displayableConflicts,
          hierarchyConflict,
          doctrinalReview,
          provisionModeResult,
          caseModeResult,
          doctrineModeResult
        });

        if (preliminaryAnswer && topEvidence.length > 0) {
          preliminaryAnswer = await enforceAdaptiveFinalAnalysis({
            openai,
            model: DEFAULT_MODEL,
            question: finalQuestion,
            draftAnswer: preliminaryAnswer,
            docs: strictDocsForContext,
            conflicts: mergedConflictSignals,
            hierarchyConflict,
            doctrinalReview,
            namedLawDetection,
            issuance,
            memoryContext,
            adaptiveState
          });
        }

        preliminaryAnswer = sanitizeDraftAnswer(
          stripTrailingSourceSection(preliminaryAnswer || "")
        );

        const groundedDisplayableDocs = selectGroundedDisplayableDocs(
          displayableRankedDocs,
          {
            answerText: preliminaryAnswer,
            finalQuestion,
            namedLawDetection,
            issuance
          }
        );

        const finalDisplayableDocs = namedLawDetection.matched
          ? mergeUniqueDocs([
              ...namedLawPriorityDocs,
              ...specializedDocs,
              ...groundedDisplayableDocs
            ]).slice(0, Math.max(MAX_VISIBLE_SOURCES, 8))
          : mergeUniqueDocs([
              ...specializedDocs,
              ...groundedDisplayableDocs
            ]).slice(0, Math.max(MAX_VISIBLE_SOURCES, 8));

        const finalVisibleSources = filterVisibleSources(finalDisplayableDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

        const topDisplayableEvidence = rankEvidenceByAuthority(
          normalizeRetrievedEvidence(finalDisplayableDocs)
        ).slice(0, 10);

        const claimSupportMap = buildClaimSupportMap(
          preliminaryAnswer,
          topDisplayableEvidence
        );

        const namedLawPrimaryVisible = namedLawDetection.matched
          ? hasNamedLawPrimaryBasis(finalDisplayableDocs, namedLawDetection)
          : false;

        const validation = validateEvidenceSufficiency({
          evidence: finalDisplayableDocs,
          claimSupportMap,
          minEvidenceCount: 1,
          minSupportedClaims: 1,
          minTopScore: 0.25,
          query: finalQuestion,
          requirePrimaryAuthority: Boolean(namedLawDetection?.matched)
        });

        const fallbackReason =
          namedLawDetection.matched &&
          (!namedLawFiltered.primaryAuthorityFound || !namedLawPrimaryVisible) &&
          namedLawDetection.bestMatch
            ? `No exact indexed primary source matched ${
                namedLawDetection.bestMatch.shortTitle ||
                namedLawDetection.bestMatch.canonicalTitle
              }.`
            : !topEvidence.length
              ? "No indexed Google Drive/Supabase vector source matched the question."
              : "Indexed sources were found but evidence strength was insufficient.";

        const shouldFallback =
          (namedLawDetection.matched && !namedLawFiltered.primaryAuthorityFound) ||
          (namedLawDetection.matched && !namedLawPrimaryVisible) ||
          (namedLawDetection.matched && finalDisplayableDocs.length === 0) ||
          (issuance && finalDisplayableDocs.length === 0) ||
          topEvidence.length === 0 ||
          shouldRejectForWeakLegalBasis({
            validation,
            hasExactCitation: Boolean(mergedRetrieval.exactCitation?.matched)
          });

        const safeTopConfidenceRaw =
          internalRankedDocs.length > 0
            ? Math.max(
                0,
                ...internalRankedDocs.map((item) => {
                  const value = Number(
                    item.finalScore ?? item.combined_score ?? item.score ?? 0
                  );
                  return Number.isFinite(value) ? value : 0;
                })
              )
            : 0;

        const safeTopConfidence = toSafeDbNumeric(
          safeTopConfidenceRaw,
          999999.9999,
          4
        );

        let reasoningRun = null;

        try {
          reasoningRun = await saveReasoningRun(supabase, {
            userId,
            sessionId: conversationId || null,
            question: originalQuestion,
            normalizedQuestion: finalQuestion,
            questionType,
            mode: hookConfig.mode,
            retrievalStatus: topEvidence.length ? "evidence_found" : "no_evidence",
            reasoningStatus: shouldFallback ? "fallback" : "grounded_answer",
            fallbackUsed: shouldFallback,
            topConfidence: safeTopConfidence,
            answerSummary: String(preliminaryAnswer || "").slice(0, 1000)
          });

          if (reasoningRun?.id) {
            await saveReasoningEvidence(supabase, {
              reasoningRunId: reasoningRun.id,
              evidence: claimSupportMap
            });

            if (mergedConflictSignals.length) {
              await saveReasoningConflicts(supabase, {
                reasoningRunId: reasoningRun.id,
                conflicts: mergedConflictSignals
              });
            }
          }
        } catch (reasoningError) {
          console.error("Reasoning persistence error:", reasoningError.message);
        }

        if (hookConfig.mode === "SOURCE_FINDER") {
          const sourceFinderDocs = namedLawDetection.matched
            ? mergeUniqueDocs([
                ...namedLawPriorityDocs,
                ...specializedDocs,
                ...finalDisplayableDocs
              ])
            : mergeUniqueDocs([...specializedDocs, ...finalDisplayableDocs]);

          const sourcesUsed = filterVisibleSources(sourceFinderDocs, {
            maxItems: MAX_VISIBLE_SOURCES,
            supersessionResult
          });

          if (!sourcesUsed.length) {
            const answerText =
              namedLawDetection.matched && namedLawDetection.bestMatch
                ? buildNamedLawFallbackText(namedLawDetection.bestMatch)
                : "No indexed source found for the requested query.";

            await saveAllMemory(answerText, [], []);

            return res.json({
              success: true,
              engine: "TINA Adaptive Reasoning Engine",
              hook: hookConfig.hook_code,
              mode: hookConfig.mode,
              hookTitle: hookConfig.title,
              answer: answerText,
              answerMode: "source_finder_no_match",
              confidence: "LOW",
              sourceStatus: "NO_INDEXED_SOURCE",
              originalQuestion,
              resolvedQuestion: finalQuestion,
              sourcesUsed: [],
              sources: [],
              vectorMatches: 0,
              adaptive: {
                enabled: adaptiveState.enabled,
                responseMode: adaptiveState?.responsePlan?.responseMode || null,
                riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
                positionStrength: adaptiveState?.positionStrength?.positionStrength || null
              }
            });
          }

          const answerText =
            "Source Finder Results\n\n" +
            sourcesUsed
              .map((s, i) =>
                [
                  `${i + 1}. ${s.issuanceNumber ? `${s.issuanceNumber} – ` : ""}${s.title}`,
                  `Authority: Level ${s.authorityLevel || 99} - ${
                    s.authorityLabel || s.authorityType || "Unknown"
                  }`
                ].join("\n")
              )
              .join("\n\n");

          await saveAllMemory(answerText, sourcesUsed, []);

          const routePayload = buildRouteResponsePayload({
            answerText,
            legalBasisDocs: sourcesUsed,
            sourcesUsed,
            hierarchyConflict: null
          });

          await persistAnswerRendering({
            supabase,
            userId,
            conversationId,
            adaptiveState,
            answerText,
            routePayload,
            finalVisibleSources: sourcesUsed
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: answerText,
            answerMode: "source_finder_results",
            confidence: routePayload.confidence_level || "SOURCE_LIST",
            sourceStatus: "INDEXED_SOURCE_LISTED",
            originalQuestion,
            resolvedQuestion: finalQuestion,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: routePayload.sources.length,
            adaptive: {
              enabled: adaptiveState.enabled,
              responseMode: adaptiveState?.responsePlan?.responseMode || null,
              riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
              positionStrength: adaptiveState?.positionStrength?.positionStrength || null
            }
          });
        }

        const complianceInsight = buildComplianceInsight({
          issuance,
          questionType,
          namedLawDetection,
          doctrinalReview,
          hierarchyConflict,
          adaptiveState
        });

        if (shouldFallback) {
          const fallbackText =
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? buildNamedLawFallbackText(namedLawDetection.bestMatch)
              : issuance || questionType === "issuance"
                ? "No indexed document found or insufficient verified evidence for the requested issuance. TINA will not generate a speculative answer."
                : await generateGeneralFallbackAnswer(
                    finalQuestion,
                    memoryContext,
                    adaptiveState,
                    fallbackReason
                  );

          const answerText = buildFallbackComplianceAnswer({
            fallbackText,
            professionalInsight: complianceInsight,
            adaptiveState
          });

          await saveAllMemory(answerText, [], []);

          const routePayload = buildRouteResponsePayload({
            answerText,
            legalBasisDocs: [],
            sourcesUsed: [],
            hierarchyConflict: null
          });

          await persistAnswerRendering({
            supabase,
            userId,
            conversationId,
            adaptiveState,
            answerText,
            routePayload,
            finalVisibleSources: [],
            limitationStatement:
              adaptiveState?.assumptionGap?.limitationStatement ||
              adaptiveState?.responsePlan?.limitationStatement ||
              null
          });

          return res.json({
            success: true,
            engine: "TINA Adaptive Reasoning Engine",
            hook: hookConfig.hook_code,
            mode: hookConfig.mode,
            hookTitle: hookConfig.title,
            answer: answerText,
            answerMode:
              namedLawDetection.matched && namedLawDetection.bestMatch
                ? "named_law_exact_source_not_found"
                : issuance
                  ? "no_exact_issuance_match"
                  : "adaptive_general_fallback",
            confidence:
              namedLawDetection.matched && namedLawDetection.bestMatch
                ? "LOW"
                : issuance
                  ? "LOW"
                  : "GENERAL",
            sourceStatus: "FALLBACK_USED",
            questionType,
            topicData,
            originalQuestion,
            resolvedQuestion: finalQuestion,
            sourcesUsed: routePayload.sources,
            sources: routePayload.sources,
            authorityUsed: routePayload.authority_used,
            supersessionAudit: routePayload.supersession_audit,
            vectorMatches: topDisplayableEvidence.length,
            detectedIssuance: issuance || null,
            detectedNamedLaw: namedLawDetection.bestMatch || null,
            reasoningRunId: reasoningRun?.id || null,
            conflictType: hierarchyConflict?.conflictType || null,
            doctrinalConflict: Boolean(hierarchyConflict?.doctrinalConflict),
            hierarchyConflict: Boolean(hierarchyConflict?.hierarchyConflict),
            apparentConflict: Boolean(hierarchyConflict?.apparentConflict),
            doctrinalStatus: doctrinalReview?.doctrinalStatus || null,
            adaptive: {
              enabled: adaptiveState.enabled,
              responseMode: adaptiveState?.responsePlan?.responseMode || null,
              responseDepth: adaptiveState?.responsePlan?.responseDepth || null,
              riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
              positionStrength: adaptiveState?.positionStrength?.positionStrength || null,
              conclusionRestriction: getConclusionRestriction(adaptiveState),
              mustDiscloseBeforeConclusion:
                adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion || false
            }
          });
        }

        const topTier = finalVisibleSources.length
          ? Math.min(...finalVisibleSources.map((s) => Number(s.authorityLevel || 99)))
          : 99;

        let confidence = "MEDIUM";

        if (issuance) confidence = "HIGH";
        else if (namedLawDetection.matched) confidence = "HIGH";
        else if (topTier <= 2) confidence = "HIGH";
        else if (topTier <= 4) confidence = "MEDIUM";
        else if (topTier <= 7) confidence = "LIMITED";
        else confidence = "LOW";

        const topLegalBases = namedLawDetection.matched
          ? selectNamedLawPriorityDocs(finalDisplayableDocs, namedLawDetection, 3)
          : selectTopLegalBases(finalDisplayableDocs, 3);

        const preliminaryRoutePayload = buildRouteResponsePayload({
          answerText: preliminaryAnswer,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          hierarchyConflict
        });

        const answerText = await renderAdaptiveAnswer({
          draftAnswer: preliminaryAnswer || "",
          fallbackAnswer: buildNoSourceReply(),
          adaptiveState,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          conflicts: mergedConflictSignals,
          hierarchyConflict,
          professionalInsight: complianceInsight,
          routePayload: preliminaryRoutePayload
        });

        await saveAllMemory(answerText, finalVisibleSources, []);

        const routePayload = buildRouteResponsePayload({
          answerText,
          legalBasisDocs: topLegalBases,
          sourcesUsed: finalVisibleSources,
          hierarchyConflict
        });

        await persistAnswerRendering({
          supabase,
          userId,
          conversationId,
          adaptiveState,
          answerText,
          routePayload,
          finalVisibleSources,
          limitationStatement:
            adaptiveState?.assumptionGap?.limitationStatement ||
            adaptiveState?.responsePlan?.limitationStatement ||
            null
        });

        return res.json({
          success: true,
          engine: "TINA Adaptive Reasoning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: buildAnswerMode({
            hookConfig,
            provisionModeResult,
            caseModeResult,
            doctrineModeResult,
            namedLawDetection,
            issuance,
            adaptiveState
          }),
          confidence: routePayload.confidence_level || confidence,
          sourceStatus: routePayload.sources.length
            ? "INDEXED_ADAPTIVE_REASONED_SOURCE_USED"
            : "INDEXED_ADAPTIVE_ANSWER_WITH_NO_DISPLAYABLE_SOURCE",
          questionType,
          topicData,
          originalQuestion,
          resolvedQuestion: finalQuestion,
          sourcesUsed: routePayload.sources,
          sources: routePayload.sources,
          authorityUsed: routePayload.authority_used,
          supersessionAudit: routePayload.supersession_audit,
          vectorMatches: finalDisplayableDocs.length,
          detectedIssuance: issuance || null,
          detectedNamedLaw: namedLawDetection.bestMatch || null,
          reasoningRunId: reasoningRun?.id || null,
          conflictCount: mergedConflictSignals.length,
          conflictType: hierarchyConflict?.conflictType || null,
          doctrinalConflict: Boolean(hierarchyConflict?.doctrinalConflict),
          hierarchyConflict: Boolean(hierarchyConflict?.hierarchyConflict),
          apparentConflict: Boolean(hierarchyConflict?.apparentConflict),
          doctrinalStatus: doctrinalReview?.doctrinalStatus || null,
          doctrinalConflictCount: doctrinalReview?.doctrinalConflicts?.length || 0,
          supersededFilteredCount: supersessionResult?.superseded?.length || 0,
          adaptive: {
            enabled: adaptiveState.enabled,
            responseMode: adaptiveState?.responsePlan?.responseMode || null,
            responseDepth: adaptiveState?.responsePlan?.responseDepth || null,
            adaptivePrimaryMode: adaptiveState?.adaptiveMode?.primaryMode || null,
            riskLevel: adaptiveState?.riskScore?.overallRisk?.level || null,
            positionStrength: adaptiveState?.positionStrength?.positionStrength || null,
            conclusionRestriction: getConclusionRestriction(adaptiveState),
            mustDiscloseBeforeConclusion:
              adaptiveState?.assumptionGap?.mustDiscloseBeforeConclusion || false,
            taxpayerDefensibility:
              adaptiveState?.riskScore?.taxpayerDefensibility?.level ||
              adaptiveState?.positionStrength?.taxpayerDefensibility?.level ||
              null
          }
        });
      } catch (error) {
        console.error("RAG answer error:", error);

        return res.status(500).json({
          success: false,
          error: error.message || "RAG answer failed"
        });
      }
    }
  };
}
