// FILE: ask-handler.js

import {
  getModeState,
  saveModeState,
  clearModeState,
  isExplicitModeHook
} from "./mode-state.js";

import { detectTopic } from "./topic-detector.js";

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
  getAdaptiveQuizProfile,
  buildAdaptiveQuizPrompt,
  safeParseQuizJson,
  storeUnansweredQuiz,
  getRecentQuizHistory,
  buildQuizExclusionFromHistory
} from "./adaptive-quiz.js";

import {
  getOrCreateLearnerProfile,
  updateLearnerProfileStats,
  updateTopicMastery
} from "./learner-profile.js";

import { storeFeedbackEntry } from "./feedback-learning.js";

import {
  searchSimilar,
  smartSearch,
  getQuizSourceChunks
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
  detectHierarchyConflict,
  selectTopLegalBases,
  buildStrictAnswerPrompt
} from "./authority-engine.js";

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
  buildFinalRoutePayload,
  sanitizeDraftAnswer
} from "./final-answer-compliance.js";

import {
  MAX_VISIBLE_SOURCES,
  getUserId,
  toSafeDbNumeric,
  buildMemoryContext,
  extractQuizAnswer,
  formatQuestionBlock,
  finalizeSourcesForResponse,
  classifyQuestion,
  detectIssuanceQuery,
  shouldHideSourceFromUser,
  stripTrailingSourceSection
} from "./ask-helpers.js";

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

function mergeUniqueDocs(docs = []) {
  const results = [];
  const seen = new Set();

  for (const doc of docs) {
    if (!doc) continue;

    const key = buildDocKey(doc) || `doc-${results.length}`;
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(doc);
  }

  return results;
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

  if (
    bestMatch.shortTitle &&
    haystack.includes(normalizeLooseText(bestMatch.shortTitle))
  ) {
    return true;
  }

  if (
    bestMatch.canonicalTitle &&
    haystack.includes(normalizeLooseText(bestMatch.canonicalTitle))
  ) {
    return true;
  }

  return false;
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
    getDocAuthorityType(doc) === "RR" &&
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

function sortDocsForLegalBasis(docs = []) {
  return [...docs].sort((a, b) => {
    const levelDiff = getDocAuthorityLevel(a) - getDocAuthorityLevel(b);
    if (levelDiff !== 0) return levelDiff;

    return getDocScore(b) - getDocScore(a);
  });
}

function selectNamedLawPriorityDocs(
  docs = [],
  namedLawDetection = null,
  maxDocs = 5
) {
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

  return {
    results: merged,
    exactCitation
  };
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
  const standardMatch = text.match(
    /\b2\.\s*LEGAL BASIS\b([\s\S]*?)(?:\n\s*\d+\.\s*[A-Z][A-Z ]+\b|$)/i
  );

  if (standardMatch) {
    return standardMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[\-\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  const caseMatch = text.match(
    /###\s*Applicable law(?:\s*\(.*?\))?\b([\s\S]*?)(?:\n\s*###\s+[A-Za-z]|$)/i
  );

  if (!caseMatch) {
    return [];
  }

  return caseMatch[1]
    .split("\n")
    .map((line) => line.replace(/^[\-\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
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

    if (best.canonicalTitle) {
      anchors.add(normalizeLooseText(best.canonicalTitle));
    }

    if (best.shortTitle) {
      anchors.add(normalizeLooseText(best.shortTitle));
    }

    if (best.republicActNumber) {
      anchors.add(`ra ${best.republicActNumber}`);
    }

    for (const alias of best.normalizedAliases || []) {
      if (alias) {
        anchors.add(normalizeLooseText(alias));
      }
    }
  }

  if (issuance) {
    anchors.add(
      normalizeLooseText(`${issuance.type} ${issuance.number} ${issuance.year}`)
    );
    anchors.add(
      normalizeLooseText(`${issuance.type}-${issuance.number}-${issuance.year}`)
    );
    anchors.add(
      normalizeLooseText(`${issuance.type} no ${issuance.number}-${issuance.year}`)
    );
  }

  for (const line of extractLegalBasisLines(answerText)) {
    const normalized = normalizeLooseText(line);

    if (normalized.length >= 6) {
      anchors.add(normalized);
    }

    const trimmedBeforeParen = normalizeLooseText(line.replace(/\(.*?\)/g, ""));
    if (trimmedBeforeParen.length >= 6) {
      anchors.add(trimmedBeforeParen);
    }

    const raInLine = normalized.match(/\bra\s*(\d{4,6})\b/);
    if (raInLine) {
      anchors.add(`ra ${raInLine[1]}`);
    }
  }

  return [...anchors]
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
}

function docMatchesAnchors(doc = {}, anchors = []) {
  const haystack = buildDocHaystack(doc);

  if (!haystack) {
    return false;
  }

  return anchors.some((anchor) => {
    const normalizedAnchor = normalizeLooseText(anchor);
    if (!normalizedAnchor || normalizedAnchor.length < 4) {
      return false;
    }

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
  namedLawDetection = null
}) {
  if (issuance || questionType === "issuance") {
    return "Use the cited issuance and verify the latest amended or superseding BIR issuance before relying on the rule operationally.";
  }

  if (namedLawDetection?.matched) {
    return "For named-law questions, rely first on the exact statute and its IRR before using secondary support.";
  }

  return "Apply the higher-authority rule first and use lower-authority material only as support.";
}

function buildFallbackComplianceAnswer({
  fallbackText,
  professionalInsight
}) {
  return buildFinalCompliantAnswer({
    draftAnswer: fallbackText,
    fallbackAnswer: fallbackText,
    directAnswer: fallbackText,
    legalBasisDocs: [],
    sourcesUsed: [],
    conflicts: [],
    hierarchyConflict: null,
    professionalInsight
  });
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

export function createAskHandler({ supabase, openai }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("createAskHandler requires a valid supabase client");
  }

  if (!openai) {
    throw new Error("createAskHandler requires openai");
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

  async function fetchLatestPendingQuizDirect(userId, conversationId = null) {
    if (!userId) return null;

    let query = supabase
      .from("tina_learning_attempts")
      .select("*")
      .eq("user_id", String(userId))
      .is("user_answer", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (conversationId) {
      query = query.eq("session_id", conversationId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("fetchLatestPendingQuizDirect error:", error.message);
      return null;
    }

    return data || null;
  }

  async function updatePendingQuizAnswerDirect({
    pendingQuiz,
    cleanAnswer,
    isCorrect
  }) {
    if (!pendingQuiz?.id) {
      return {
        data: null,
        error: new Error("Pending quiz id is required.")
      };
    }

    const payload = {
      user_answer: cleanAnswer,
      is_correct: Boolean(isCorrect),
      answered_at: new Date().toISOString()
    };

    if (pendingQuiz.updated_at !== undefined) {
      payload.updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("tina_learning_attempts")
      .update(payload)
      .eq("id", pendingQuiz.id)
      .select();

    if (error) {
      console.error("updatePendingQuizAnswerDirect error:", error.message, {
        pendingQuizId: pendingQuiz.id,
        payload
      });

      return {
        data: null,
        error
      };
    }

    const updatedRow = Array.isArray(data) ? data[0] || null : data || null;

    if (!updatedRow) {
      return {
        data: null,
        error: new Error("No quiz row was updated.")
      };
    }

    return {
      data: updatedRow,
      error: null
    };
  }

  async function clearPendingQuizAttempts(userId, conversationId = null) {
    if (!userId) return;

    let query = supabase
      .from("tina_learning_attempts")
      .update({
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .is("user_answer", null);

    if (conversationId) {
      query = query.eq("session_id", conversationId);
    }

    const { error } = await query;

    if (error) {
      console.error("clearPendingQuizAttempts error:", error.message);
    }
  }

  async function generateGeneralFallbackAnswer(
    cleanQuestion,
    memoryContext,
    reason = "No sufficient indexed source was found."
  ) {
    const fallbackSystemPrompt = `
You are TINA, Tax Information Navigation Assistant for Bong Corpuz & Co. CPAs.

You may answer using general Philippine tax knowledge only when indexed sources are absent or weak.

Rules:
1. Clearly state that this is a general fallback answer.
2. Do not pretend the answer came from indexed Google Drive sources.
3. Keep the answer professional and Philippine-tax oriented.
4. Do not invent specific RR, RMC, RMO, RAMO, BIR rulings, dates, forms, deadlines, rates, or case citations.
5. For exact issuance questions, do not provide speculative content.
6. Recommend verification against official NIRC/BIR/CTA/Supreme Court sources.
`.trim();

    const fallbackUserPrompt = `
Reason for fallback:
${reason}

Conversation Memory:
${memoryContext}

Question:
${cleanQuestion}
`.trim();

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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
      "Important Note: This answer is not based on an indexed Google Drive source and should be verified against official BIR/NIRC/court sources.",
      "",
      text || "No fallback answer generated."
    ].join("\n");
  }

  async function loadTaxHookConfig(rawQuestion = "") {
    const text = String(rawQuestion || "").trim();

    let hookCode = "/ask";
    let cleanQuestion = text;

    const firstWord = text.split(/\s+/)[0]?.toLowerCase() || "";

    const allowedHooks = [
      "/ask",
      "/tax",
      "/review",
      "/quiz",
      "/diagnostic",
      "/progress",
      "/feedback",
      "/source"
    ];

    if (allowedHooks.includes(firstWord)) {
      hookCode = firstWord;
      cleanQuestion = text.slice(firstWord.length).trim();
    }

    const hardcodedHooks = {
      "/ask": {
        hook_code: "/ask",
        mode: "ASK",
        title: "Default TINA Assistant",
        requires_retrieval: true,
        requires_memory: true,
        requires_feedback: false
      },
      "/tax": {
        hook_code: "/tax",
        mode: "TAX_EXPERT",
        title: "Big 4 Tax Expert Mode",
        requires_retrieval: true,
        requires_memory: true,
        requires_feedback: false
      },
      "/review": {
        hook_code: "/review",
        mode: "TAX_REVIEWER",
        title: "CPALE Tax Reviewer Mode",
        requires_retrieval: false,
        requires_memory: true,
        requires_feedback: false
      },
      "/quiz": {
        hook_code: "/quiz",
        mode: "QUIZ_MASTER",
        title: "Tax Quiz Mode",
        requires_retrieval: false,
        requires_memory: true,
        requires_feedback: false
      },
      "/diagnostic": {
        hook_code: "/diagnostic",
        mode: "ADAPTIVE_QUIZ",
        title: "Adaptive CPALE Diagnostic Quiz",
        requires_retrieval: false,
        requires_memory: true,
        requires_feedback: false
      },
      "/progress": {
        hook_code: "/progress",
        mode: "LEARNING_PROGRESS",
        title: "Learning Progress Tracker",
        requires_retrieval: false,
        requires_memory: true,
        requires_feedback: false
      },
      "/feedback": {
        hook_code: "/feedback",
        mode: "FEEDBACK",
        title: "Feedback Mode",
        requires_retrieval: false,
        requires_memory: true,
        requires_feedback: true
      },
      "/source": {
        hook_code: "/source",
        mode: "SOURCE_FINDER",
        title: "Source Finder Mode",
        requires_retrieval: true,
        requires_memory: false,
        requires_feedback: false
      }
    };

    const fallbackConfig = hardcodedHooks[hookCode] || hardcodedHooks["/ask"];

    try {
      const { data, error } = await supabase
        .from("tina_tax_hooks")
        .select("*")
        .eq("hook_code", hookCode)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Hook config load error:", error.message);
      }

      if (data) {
        return {
          ...fallbackConfig,
          ...data,
          hook_code: fallbackConfig.hook_code,
          mode: fallbackConfig.mode,
          requires_retrieval: fallbackConfig.requires_retrieval,
          title: data.title || fallbackConfig.title,
          requires_memory:
            data.requires_memory ?? fallbackConfig.requires_memory,
          requires_feedback:
            data.requires_feedback ?? fallbackConfig.requires_feedback,
          cleanQuestion: cleanQuestion || text,
          originalQuestion: text
        };
      }
    } catch (error) {
      console.error("Hook config fallback used:", error.message);
    }

    return {
      ...fallbackConfig,
      cleanQuestion: cleanQuestion || text,
      originalQuestion: text
    };
  }

  async function buildReviewTeachingBlock(topic = "") {
    const prompt = `
You are TINA, a CPALE taxation reviewer.

Teach this topic briefly and clearly:
${topic}

Rules:
- Philippine taxation context only
- concise, useful, exam-oriented
- no long memo
- no practice question
- no free-text answer request

Output format exactly:

Topic:
[topic]

Core Concept:
[brief explanation]

Rule:
[brief rule]

Simple Example:
[brief example]

CPALE Trap:
[brief trap]

Quick Recall:
[memory aid]
`.trim();

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });

    return response.choices?.[0]?.message?.content?.trim() || "";
  }

  async function generateStoredAssessmentQuestion({
    userId,
    conversationId,
    hookConfig,
    requestedTopic,
    teachingText = ""
  }) {
    const quizProfile = await getAdaptiveQuizProfile(
      supabase,
      userId,
      requestedTopic
    );

    const recentHistory = await getRecentQuizHistory(supabase, {
      userId,
      topic: quizProfile.topic,
      limit: 20
    });

    const exclusions = buildQuizExclusionFromHistory(recentHistory);

    const sourceChunks = await getQuizSourceChunks({
      topic: quizProfile.topic,
      excludeSourcePaths: exclusions.excludeSourcePaths,
      excludeChunkIds: exclusions.excludeChunkIds,
      limit: 3
    });

    const quizPrompt = buildAdaptiveQuizPrompt({
      topic: quizProfile.topic,
      difficulty: quizProfile.difficulty,
      profile: quizProfile.profile,
      sourceChunks,
      recentQuestions: recentHistory
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: quizPrompt }]
    });

    const rawQuiz = response.choices?.[0]?.message?.content?.trim() || "";
    const quiz = safeParseQuizJson(rawQuiz);

    if (!quiz) {
      return {
        ok: false,
        error: "Unable to generate valid multiple-choice question JSON.",
        rawQuiz,
        sourceChunks
      };
    }

    const storedQuiz = await storeUnansweredQuiz(supabase, {
      userId,
      sessionId: conversationId || null,
      quiz,
      mode: hookConfig.mode,
      sourceChunks
    });

    if (!storedQuiz || storedQuiz.saveFailed) {
      return {
        ok: false,
        error: "Question was generated but could not be saved.",
        supabaseError: storedQuiz?.error || null,
        rawQuiz,
        quiz,
        sourceChunks
      };
    }

    const answerText = formatQuestionBlock({
      quiz,
      storedQuiz,
      teachingText
    });

    return {
      ok: true,
      quiz,
      storedQuiz,
      sourceChunks,
      answerText
    };
  }

  async function continueAssessmentLoop({
    userId,
    conversationId,
    incomingAnswer
  }) {
    const pendingQuiz = await fetchLatestPendingQuizDirect(userId, conversationId);

    if (!pendingQuiz) {
      return { handled: false };
    }

    const cleanAnswer = extractQuizAnswer(incomingAnswer);

    if (!cleanAnswer) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "INVALID_ANSWER",
          answer:
            "Please answer using letter A, B, C, or D only. Example: A. Type /bye or /exit to stop.",
          sourceStatus: "INVALID_QUIZ_ANSWER",
          sourcesUsed: [],
          vectorMatches: 0
        }
      };
    }

    const correctAnswer = String(pendingQuiz.correct_answer || "")
      .replace(/[^A-Da-d]/g, "")
      .trim()
      .toUpperCase();

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "INVALID_PENDING_QUESTION",
          answer: "Pending question has invalid correct-answer data.",
          sourceStatus: "INVALID_PENDING_QUIZ_DATA",
          sourcesUsed: [],
          vectorMatches: 0
        }
      };
    }

    const isCorrect = cleanAnswer === correctAnswer;

    const { data: answeredQuiz, error: answerError } =
      await updatePendingQuizAnswerDirect({
        pendingQuiz,
        cleanAnswer,
        isCorrect
      });

    if (answerError || !answeredQuiz) {
      return {
        handled: true,
        response: {
          success: false,
          engine: "TINA Continuous Learning Engine",
          mode: "ANSWER_SAVE_FAILED",
          answer: "TINA failed to save your answer.",
          sourceStatus: "QUIZ_UPDATE_FAILED",
          sourcesUsed: [],
          vectorMatches: 0
        }
      };
    }

    await updateLearnerProfileStats(supabase, {
      userId,
      topic: pendingQuiz.topic,
      isCorrect
    });

    const mastery = await updateTopicMastery(supabase, {
      userId,
      topic: pendingQuiz.topic,
      subtopic: pendingQuiz.subtopic || "",
      isCorrect
    });

    const nextMode =
      pendingQuiz.mode === "TAX_REVIEWER"
        ? "TAX_REVIEWER"
        : pendingQuiz.mode === "ADAPTIVE_QUIZ"
          ? "ADAPTIVE_QUIZ"
          : "QUIZ_MASTER";

    const nextHookConfig = {
      hook_code:
        nextMode === "TAX_REVIEWER"
          ? "/review"
          : nextMode === "ADAPTIVE_QUIZ"
            ? "/diagnostic"
            : "/quiz",
      mode: nextMode,
      title:
        nextMode === "TAX_REVIEWER"
          ? "CPALE Tax Reviewer Mode"
          : nextMode === "ADAPTIVE_QUIZ"
            ? "Adaptive CPALE Diagnostic Quiz"
            : "Tax Quiz Mode",
      requires_memory: true
    };

    const nextQuestion = await generateStoredAssessmentQuestion({
      userId,
      conversationId,
      hookConfig: nextHookConfig,
      requestedTopic: pendingQuiz.topic || "VAT",
      teachingText: ""
    });

    let nextQuestionText =
      "\nNext question could not be generated. Type the mode command again to continue.";
    let nextSources = [];

    if (nextQuestion.ok) {
      nextSources = finalizeSourcesForResponse(nextQuestion.sourceChunks || [], {
        maxItems: MAX_VISIBLE_SOURCES
      });
      nextQuestionText = ["", "Next Question:", nextQuestion.answerText].join("\n");
    }

    const finalAnswer = [
      isCorrect ? "Correct ✅" : "Incorrect ❌",
      "",
      `Your Answer: ${cleanAnswer}`,
      `Correct Answer: ${correctAnswer}`,
      "",
      `Explanation: ${pendingQuiz.explanation || "No explanation available."}`,
      nextQuestionText
    ]
      .filter(Boolean)
      .join("\n");

    if (conversationId) {
      await saveConversationTurn({
        conversationId,
        userId,
        question: incomingAnswer,
        answerText: finalAnswer,
        sourcesUsed: nextSources,
        fallbackReferences: []
      });
    }

    await saveModeState(supabase, {
      userId,
      sessionId: conversationId || null,
      activeHook: nextHookConfig.hook_code,
      activeMode: nextHookConfig.mode,
      modeTitle: nextHookConfig.title,
      lastQuestion: incomingAnswer,
      lastAnswer: finalAnswer
    });

    return {
      handled: true,
      response: {
        success: true,
        engine: "TINA Continuous Learning Engine",
        mode: "ANSWER_CHECKED_AND_NEXT_READY",
        answer: finalAnswer,
        isCorrect,
        mastery,
        topic: pendingQuiz.topic || null,
        difficulty: pendingQuiz.difficulty || null,
        sourceStatus: nextSources.length
          ? "GDRIVE_GROUNDED_NEXT_QUESTION"
          : "GENERAL_NEXT_QUESTION",
        sourcesUsed: nextSources,
        sources: nextSources,
        vectorMatches: nextSources.length
      }
    };
  }

  return async function handleAsk(req, res) {
    try {
      const { question, conversationId, correction, feedbackType } = req.body;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID not found in token. Cannot proceed."
        });
      }

      const rawQuestion = String(question || "").trim();

      if (!rawQuestion) {
        return res.status(400).json({
          success: false,
          error: "Question required"
        });
      }

      const existingMode = await getModeState(
        supabase,
        userId,
        conversationId || null
      );

      const exitCommands = ["/bye", "/exit", "/stop", "/quit", "/reset"];

      if (exitCommands.includes(rawQuestion.toLowerCase())) {
        const activeHook = existingMode?.active_hook || "/ask";

        await clearModeState(supabase, userId, conversationId || null);
        await clearPendingQuizAttempts(userId, conversationId || null);

        let answerText = "You are already in normal /ask mode.";

        if (activeHook === "/quiz") {
          answerText = "Quiz mode ended. You are now back in normal /ask mode.";
        } else if (activeHook === "/review") {
          answerText = "Review mode ended. You are now back in normal /ask mode.";
        } else if (activeHook === "/diagnostic") {
          answerText = "Diagnostic mode ended. You are now back in normal /ask mode.";
        } else if (activeHook !== "/ask") {
          answerText = `Mode ${activeHook} ended. You are now back in normal /ask mode.`;
        }

        return res.json({
          success: true,
          engine: "TINA Mode State System",
          mode: "MODE_CLEARED",
          previousMode: activeHook,
          answer: answerText,
          sourceStatus: "MODE_STATE_CLEARED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        });
      }

      const pendingQuiz = await fetchLatestPendingQuizDirect(
        userId,
        conversationId || null
      );

      const directQuizAnswer = extractQuizAnswer(rawQuestion);
      const normalizedInput = rawQuestion.toLowerCase();
      const allowedExitCommands = ["/bye", "/exit", "/stop", "/quit", "/reset"];

      const activeAssessmentModes = new Set([
        "/quiz",
        "/review",
        "/diagnostic"
      ]);

      const activeHook = existingMode?.active_hook || null;
      const hasActiveAssessmentMode = activeAssessmentModes.has(activeHook);

      if (pendingQuiz && !hasActiveAssessmentMode) {
        try {
          await clearPendingQuizAttempts(userId, conversationId || null);
          console.log("Cleared stale pending quiz because no active assessment mode exists.", {
            userId,
            conversationId: conversationId || null,
            pendingQuizId: pendingQuiz.id || null
          });
        } catch (clearError) {
          console.error("Failed to clear stale pending quiz:", clearError.message);
        }
      }

      const freshPendingQuiz = hasActiveAssessmentMode ? pendingQuiz : null;

      if (freshPendingQuiz && directQuizAnswer) {
        const loopResult = await continueAssessmentLoop({
          userId,
          conversationId: conversationId || null,
          incomingAnswer: rawQuestion
        });

        if (loopResult.handled) {
          return res.json(loopResult.response);
        }
      }

      if (freshPendingQuiz && !directQuizAnswer) {
        if (!allowedExitCommands.includes(normalizedInput)) {
          let lockedModeLabel = "quiz";
          let lockedModeMessage =
            "You are still in active quiz mode. Please answer using A, B, C, or D only. Type /bye or /exit to leave quiz mode.";

          if (activeHook === "/review") {
            lockedModeLabel = "review";
            lockedModeMessage =
              "You are still in active review mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave review mode.";
          } else if (activeHook === "/diagnostic") {
            lockedModeLabel = "diagnostic";
            lockedModeMessage =
              "You are still in active diagnostic mode. Please answer the current multiple-choice question using A, B, C, or D only. Type /bye or /exit to leave diagnostic mode.";
          }

          return res.json({
            success: false,
            engine: "TINA Continuous Learning Engine",
            mode: "QUIZ_MODE_LOCKED",
            lockedMode: lockedModeLabel,
            answer: lockedModeMessage,
            sourceStatus: "QUIZ_MODE_LOCKED",
            sourcesUsed: [],
            sources: [],
            vectorMatches: 0
          });
        }
      }

      let effectiveQuestion = rawQuestion;

      if (
        existingMode?.active_hook &&
        existingMode.active_hook !== "/ask" &&
        !isExplicitModeHook(rawQuestion)
      ) {
        effectiveQuestion = `${existingMode.active_hook} ${rawQuestion}`;
      }

      const hookConfig = await loadTaxHookConfig(effectiveQuestion);
      const cleanQuestion = hookConfig.cleanQuestion;
      const originalQuestion = hookConfig.originalQuestion;

      async function saveSimpleHookMemory(answerText) {
        if (hookConfig.requires_memory === false) return;

        await saveConversationTurn({
          conversationId,
          userId,
          question: originalQuestion,
          answerText,
          sourcesUsed: [],
          fallbackReferences: []
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

      if (hookConfig.mode === "LEARNING_PROGRESS") {
        const profile = await getOrCreateLearnerProfile(supabase, userId);

        const answerText = profile
          ? [
              "Learning Progress",
              "",
              `Skill Level: ${profile.skill_level || "beginner"}`,
              `Learning Goal: ${profile.learning_goal || "CPALE"}`,
              `Total Questions: ${profile.total_questions || 0}`,
              `Correct Answers: ${profile.correct_answers || 0}`,
              `Accuracy Rate: ${Math.round(Number(profile.accuracy_rate || 0) * 100)}%`,
              `Last Reviewed Topic: ${profile.last_reviewed_topic || "None"}`,
              "",
              `Weak Topics: ${(profile.weak_topics || []).join(", ") || "None yet"}`,
              `Strong Topics: ${(profile.strong_topics || []).join(", ") || "None yet"}`
            ].join("\n")
          : "No learning profile found yet.";

        await saveSimpleHookMemory(answerText);

        return res.json({
          success: true,
          engine: "TINA Adaptive Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: "learning_progress",
          sourceStatus: "LEARNING_PROFILE_USED",
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        });
      }

      if (hookConfig.mode === "FEEDBACK") {
        const cleanCorrection = String(correction || "").trim();
        const cleanFeedbackType = String(feedbackType || "general_feedback").trim();

        if (!cleanCorrection) {
          return res.status(400).json({
            success: false,
            error: "Feedback correction is required.",
            hint: "Send { question, conversationId, correction, feedbackType }"
          });
        }

        const feedbackResult = await storeFeedbackEntry(supabase, {
          userId,
          sessionId: conversationId || null,
          originalQuestion,
          originalAnswer: "",
          feedbackType: cleanFeedbackType,
          userCorrection: cleanCorrection
        });

        const answerText =
          "Feedback received and stored for review. Thank you. TINA will only learn from this after validation.";

        await saveSimpleHookMemory(answerText);

        return res.json({
          success: true,
          engine: "TINA Feedback Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode: "feedback_stored_for_review",
          confidence: "N/A",
          sourceStatus: "FEEDBACK_STORED",
          feedbackId: feedbackResult?.id || null,
          feedbackType: cleanFeedbackType,
          originalQuestion,
          resolvedQuestion: cleanQuestion,
          sourcesUsed: [],
          sources: [],
          vectorMatches: 0
        });
      }

      if (
        hookConfig.mode === "QUIZ_MASTER" ||
        hookConfig.mode === "ADAPTIVE_QUIZ"
      ) {
        const questionResult = await generateStoredAssessmentQuestion({
          userId,
          conversationId,
          hookConfig,
          requestedTopic: cleanQuestion,
          teachingText: ""
        });

        if (!questionResult.ok) {
          return res.json({
            success: false,
            engine: "TINA Continuous Learning Engine",
            error: questionResult.error,
            rawQuiz: questionResult.rawQuiz || null,
            supabaseError: questionResult.supabaseError || null,
            answer:
              "TINA failed to generate the next stored multiple-choice question."
          });
        }

        const quizSourcesUsed = finalizeSourcesForResponse(
          questionResult.sourceChunks || [],
          { maxItems: MAX_VISIBLE_SOURCES }
        );

        await saveConversationTurn({
          conversationId,
          userId,
          question: originalQuestion,
          answerText: questionResult.answerText,
          sourcesUsed: quizSourcesUsed,
          fallbackReferences: []
        });

        await saveModeState(supabase, {
          userId,
          sessionId: conversationId || null,
          activeHook: hookConfig.hook_code,
          activeMode: hookConfig.mode,
          modeTitle: hookConfig.title,
          lastQuestion: originalQuestion,
          lastAnswer: questionResult.answerText
        });

        return res.json({
          success: true,
          engine: "TINA Continuous Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: questionResult.answerText,
          answerMode: "continuous_question_generated",
          quizId: questionResult.storedQuiz.id,
          topic: questionResult.quiz.topic,
          difficulty: questionResult.quiz.difficulty,
          correctAnswerStored: Boolean(questionResult.storedQuiz.correct_answer),
          pendingAnswerStored: questionResult.storedQuiz.user_answer === null,
          confidence: quizSourcesUsed.length
            ? "GDRIVE_GROUNDED"
            : "GENERAL_ADAPTIVE",
          sourceStatus: quizSourcesUsed.length
            ? "GDRIVE_GROUNDED_QUESTION_READY"
            : "GENERAL_QUESTION_READY",
          sourcesUsed: quizSourcesUsed,
          sources: quizSourcesUsed,
          vectorMatches: quizSourcesUsed.length
        });
      }

      if (hookConfig.mode === "TAX_REVIEWER") {
        const teachingText = await buildReviewTeachingBlock(cleanQuestion);

        const questionResult = await generateStoredAssessmentQuestion({
          userId,
          conversationId,
          hookConfig,
          requestedTopic: cleanQuestion,
          teachingText
        });

        if (!questionResult.ok) {
          return res.json({
            success: false,
            engine: "TINA Continuous Learning Engine",
            error: questionResult.error,
            rawQuiz: questionResult.rawQuiz || null,
            supabaseError: questionResult.supabaseError || null,
            answer:
              teachingText ||
              "TINA failed to generate the reviewer multiple-choice question."
          });
        }

        const quizSourcesUsed = finalizeSourcesForResponse(
          questionResult.sourceChunks || [],
          { maxItems: MAX_VISIBLE_SOURCES }
        );

        await saveConversationTurn({
          conversationId,
          userId,
          question: originalQuestion,
          answerText: questionResult.answerText,
          sourcesUsed: quizSourcesUsed,
          fallbackReferences: []
        });

        await saveModeState(supabase, {
          userId,
          sessionId: conversationId || null,
          activeHook: hookConfig.hook_code,
          activeMode: hookConfig.mode,
          modeTitle: hookConfig.title,
          lastQuestion: originalQuestion,
          lastAnswer: questionResult.answerText
        });

        return res.json({
          success: true,
          engine: "TINA Continuous Learning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: questionResult.answerText,
          answerMode: "review_then_continuous_question_generated",
          quizId: questionResult.storedQuiz.id,
          topic: questionResult.quiz.topic,
          difficulty: questionResult.quiz.difficulty,
          correctAnswerStored: Boolean(questionResult.storedQuiz.correct_answer),
          pendingAnswerStored: questionResult.storedQuiz.user_answer === null,
          confidence: quizSourcesUsed.length
            ? "GDRIVE_GROUNDED"
            : "GENERAL_ADAPTIVE",
          sourceStatus: quizSourcesUsed.length
            ? "GDRIVE_GROUNDED_QUESTION_READY"
            : "GENERAL_QUESTION_READY",
          sourcesUsed: quizSourcesUsed,
          sources: quizSourcesUsed,
          vectorMatches: quizSourcesUsed.length
        });
      }

      if (!cleanQuestion || !cleanQuestion.trim()) {
        return res.status(400).json({
          success: false,
          error: "Question required after hook"
        });
      }

      const topicData = await detectTopic({
        supabase,
        question: cleanQuestion,
        userId,
        sessionId: conversationId || null
      });

      let finalQuestion = topicData.resolvedQuestion || cleanQuestion;

      if ((!finalQuestion || finalQuestion.length < 5) && conversationId && userId) {
        try {
          const lastState = await getLastTopicState(supabase, userId, conversationId);

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

      async function saveAllMemory(answerText, sourcesUsed = [], fallbackReferences = []) {
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
          topK: 12
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
          metadata: {
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
          }
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
        model: process.env.OPENAI_MODEL || "gpt-4o-mini"
      });

      const caseModeResult =
        !provisionModeResult.handled
          ? await maybeGenerateCaseAnalysisAnswer({
              openai,
              question: finalQuestion,
              retrievedResults: internalRankedDocs,
              model: process.env.OPENAI_MODEL || "gpt-4o-mini"
            })
          : { handled: false };

      const doctrineModeResult =
        !provisionModeResult.handled && !caseModeResult.handled
          ? await maybeGenerateDoctrineAnswer({
              openai,
              question: finalQuestion,
              retrievedResults: internalRankedDocs,
              model: process.env.OPENAI_MODEL || "gpt-4o-mini"
            })
          : { handled: false };

      const strictContext = internalRankedDocs
        .slice(0, 5)
        .map((doc, index) =>
          [
            `SOURCE ${index + 1}: ${doc.source || doc.originalSource || "Untitled Source"}`,
            `PATH: ${doc.path || doc.metadata?.path || "Unknown"}`,
            `AUTHORITY TYPE: ${
              doc.authorityType ||
              doc.authority_type ||
              doc.metadata?.authorityType ||
              "SECONDARY"
            }`,
            `AUTHORITY LEVEL: ${
              doc.authorityLevel ||
              doc.authority_level ||
              doc.metadata?.authorityLevel ||
              99
            }`,
            `AUTHORITY SCORE: ${
              doc.authorityScore ||
              doc.authority_score ||
              doc.metadata?.authorityScore ||
              0
            }`,
            `FINAL SCORE: ${
              doc.finalScore ||
              doc.combined_score ||
              doc.score ||
              0
            }`,
            "TEXT:",
            doc.text || ""
          ].join("\n")
        )
        .join("\n\n---\n\n");

      if (provisionModeResult.handled) {
        preliminaryAnswer = provisionModeResult.answer || "";
      } else if (caseModeResult.handled) {
        preliminaryAnswer = caseModeResult.answer || "";
      } else if (doctrineModeResult.handled) {
        preliminaryAnswer = doctrineModeResult.answer || "";
      } else if (topEvidence.length > 0) {
        const topLegalBasesForPrompt = namedLawDetection.matched
          ? selectNamedLawPriorityDocs(displayableRankedDocs, namedLawDetection, 3)
          : selectTopLegalBases(displayableRankedDocs, 3);

        const strictPrompt = buildStrictAnswerPrompt({
          hookMode: hookConfig?.mode || "ASK",
          originalQuestion,
          cleanQuestion,
          context: strictContext,
          topLegalBases: topLegalBasesForPrompt,
          conflict: hierarchyConflict
        });

        const strictResponse = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
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
                  : "Detected Named Law: none"
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
            ...groundedDisplayableDocs
          ]).slice(0, Math.max(MAX_VISIBLE_SOURCES, 8))
        : groundedDisplayableDocs;

      const finalVisibleSources = finalizeSourcesForResponse(finalDisplayableDocs, {
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
          ? `No exact indexed primary source matched ${namedLawDetection.bestMatch.shortTitle || namedLawDetection.bestMatch.canonicalTitle}.`
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
                  item.finalScore ??
                    item.combined_score ??
                    item.score ??
                    0
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

          if (displayableConflicts.length) {
            await saveReasoningConflicts(supabase, {
              reasoningRunId: reasoningRun.id,
              conflicts: displayableConflicts
            });
          }
        }
      } catch (reasoningError) {
        console.error("Reasoning persistence error:", reasoningError.message, {
          safeTopConfidenceRaw,
          safeTopConfidence
        });
      }

      if (hookConfig.mode === "SOURCE_FINDER") {
        const sourceFinderDocs = namedLawDetection.matched
          ? mergeUniqueDocs([...namedLawPriorityDocs, ...finalDisplayableDocs])
          : finalDisplayableDocs;

        const sourcesUsed = finalizeSourcesForResponse(sourceFinderDocs, {
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
            engine: "TINA Reasoning Engine",
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
            vectorMatches: 0
          });
        }

        const answerText =
          "Source Finder Results\n\n" +
          sourcesUsed
            .map((s, i) =>
              [
                `${i + 1}. ${s.issuanceNumber ? `${s.issuanceNumber} – ` : ""}${s.title}`,
                `Authority: Level ${s.authorityLevel || 99} - ${s.authorityLabel || "Unknown"}`
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

        return res.json({
          success: true,
          engine: "TINA Reasoning Engine",
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
          vectorMatches: routePayload.sources.length
        });
      }

      const complianceInsight = buildComplianceInsight({
        issuance,
        questionType,
        namedLawDetection
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
                  fallbackReason
                );

        const answerText = buildFallbackComplianceAnswer({
          fallbackText,
          professionalInsight: complianceInsight
        });

        await saveAllMemory(answerText, [], []);

        const routePayload = buildRouteResponsePayload({
          answerText,
          legalBasisDocs: [],
          sourcesUsed: [],
          hierarchyConflict: null
        });

        return res.json({
          success: true,
          engine: "TINA Reasoning Engine",
          hook: hookConfig.hook_code,
          mode: hookConfig.mode,
          hookTitle: hookConfig.title,
          answer: answerText,
          answerMode:
            namedLawDetection.matched && namedLawDetection.bestMatch
              ? "named_law_exact_source_not_found"
              : issuance
                ? "no_exact_issuance_match"
                : "general_fallback",
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
          reasoningRunId: reasoningRun?.id || null
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

      const answerText = buildFinalCompliantAnswer({
        draftAnswer: preliminaryAnswer || "",
        fallbackAnswer: buildNoSourceReply(),
        legalBasisDocs: topLegalBases,
        sourcesUsed: finalVisibleSources,
        conflicts: displayableConflicts,
        hierarchyConflict,
        professionalInsight: complianceInsight
      });

      await saveAllMemory(answerText, finalVisibleSources, []);

      const routePayload = buildRouteResponsePayload({
        answerText,
        legalBasisDocs: topLegalBases,
        sourcesUsed: finalVisibleSources,
        hierarchyConflict
      });

      return res.json({
        success: true,
        engine: "TINA Reasoning Engine",
        hook: hookConfig.hook_code,
        mode: hookConfig.mode,
        hookTitle: hookConfig.title,
        answer: answerText,
        answerMode: provisionModeResult.handled
          ? "provision_citation_answer"
          : caseModeResult.handled
            ? "case_analysis_answer"
            : doctrineModeResult.handled
              ? "doctrine_analysis_answer"
              : namedLawDetection.matched
                ? "named_law_reasoned_answer"
                : issuance
                  ? `exact_issuance_${hookConfig.mode.toLowerCase()}_reasoned`
                  : `${hookConfig.mode.toLowerCase()}_reasoned_answer`,
        confidence: routePayload.confidence_level || confidence,
        sourceStatus: routePayload.sources.length
          ? "INDEXED_REASONED_SOURCE_USED"
          : "INDEXED_ANSWER_WITH_NO_DISPLAYABLE_SOURCE",
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
        conflictCount: displayableConflicts.length,
        hierarchyConflict: Boolean(hierarchyConflict?.conflict),
        doctrinalConflictCount: doctrinalReview?.doctrinalConflicts?.length || 0,
        supersededFilteredCount: supersessionResult?.superseded?.length || 0
      });
    } catch (error) {
      console.error("Ask error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Ask failed"
      });
    }
  };
}
