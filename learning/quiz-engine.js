// FILE: learning/quiz-engine.js
"use strict";

import {
  buildAdaptiveQuizPrompt,
  safeParseQuizJson,
  storeUnansweredQuiz,
  getRecentQuizHistory,
  buildQuizExclusionFromHistory
} from "../adaptive-quiz.js";

import { buildRetrievalHints } from "./question-bank-router.js";
import { getSubtopicLabel, getDomainConfig } from "./domain-normalizer.js";
import { safeParseQuizQuestion } from "../services/schema-validator.js";
import { buildTaxConceptRetrievalAliases } from "../services/tax-concept-aliases.js";
import { validateLearningAuthorityForDomain } from "./authority-validation.js";

const ENGINE_VERSION = "1.0.0";

const DIFFICULTY_LABELS = {
  1: "Basic",
  2: "Standard",
  3: "Applied",
  4: "Analytical",
  5: "Advanced"
};

const DIFFICULTY_MAP = {
  easy: 1, basic: 1,
  standard: 2, moderate: 2,
  applied: 3, hard: 3,
  analytical: 4,
  advanced: 5, "bar/cta": 5, "bar": 5, "cta": 5
};

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1200) {
  const text = normalizeText(value);
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function compactSourceChunk(chunk = {}) {
  return {
    title:
      chunk.title ||
      chunk.sourceTitle ||
      chunk.document_title ||
      chunk.metadata?.documentTitle ||
      chunk.metadata?.originalFileName ||
      chunk.originalSource ||
      chunk.original_source ||
      chunk.source ||
      "Quiz Source",

    authorityType:
      chunk.authorityType || chunk.authority_type || chunk.metadata?.authorityType || "UNKNOWN",

    citation:
      chunk.citation ||
      chunk.reference ||
      chunk.normalizedReference ||
      chunk.normalized_reference ||
      chunk.metadata?.normalizedReference ||
      "",

    url:
      chunk.url || chunk.driveViewUrl || chunk.drive_view_url || chunk.metadata?.driveViewUrl || "",

    text: trimText(
      chunk.text || chunk.content || chunk.excerpt || chunk.preview || "", 1200
    ),

    score:
      Number(chunk.finalScore || chunk.final_score || chunk.retrievalScore || chunk.score || chunk.similarity || 0) || 0
  };
}

function compactHistory(history = []) {
  return safeArray(history).slice(0, 8).map((item) => ({
    topic: item.topic || null,
    subtopic: item.subtopic || null,
    question: trimText(item.question || item.quiz_question || "", 280),
    correctAnswer: item.correct_answer || null,
    isCorrect: item.is_correct ?? null
  }));
}

// Normalizes choices from either array or {A,B,C,D} object into a plain text array.
function normalizeQuizChoices(raw) {
  const letters = ["A", "B", "C", "D"];
  if (Array.isArray(raw?.choices)) {
    return raw.choices.slice(0, 4).map((choice) => {
      if (typeof choice === "string") return choice.replace(/^[A-D][.)]\s*/i, "").trim();
      if (choice && typeof choice === "object") {
        return String(choice.text || choice.label || choice.value || "").replace(/^[A-D][.)]\s*/i, "").trim();
      }
      return "";
    });
  }
  if (raw?.choices && typeof raw.choices === "object") {
    return letters.map((l) => String(raw.choices[l] || "").replace(/^[A-D][.)]\s*/i, "").trim());
  }
  return [];
}

function resolveDifficulty(sessionLearning = {}) {
  const score = sessionLearning.score || { correct: 0, total: 0 };
  const total = score.total || 0;
  const correct = score.correct || 0;
  const accuracy = total > 0 ? correct / total : 0;

  if (accuracy >= 0.85 && total >= 3) return 4;
  if (accuracy >= 0.65 && total >= 2) return 3;
  if (accuracy >= 0.45) return 2;
  return 1;
}

// ─── bounded light retrieval for /quiz ──────────────────────────────────────
// Single indexed-column Supabase query with a 2 s AbortController deadline.
// When the deadline fires, the underlying fetch is actually cancelled — no
// orphan HTTP request continues in the background.
//
// Excluded authority types match getQuizSourceChunksLight:
//   CPA_NOTES, REVIEW_MATERIALS, UNKNOWN
//
// History-based exclusions are applied as a post-query filter because the
// AbortSignal approach targets the DB call itself, not post-processing.
//
// NIRC raw-form expansion is omitted (internal helper, not exported).
// Concept-alias expansion is replicated inline (3-line logic).
async function getBoundedQuizSourceChunks({
  topic,
  limit = 3,
  supabase: supabaseClient,
  excludeSourcePaths = [],
  excludeChunkIds = []
}) {
  if (!supabaseClient || typeof supabaseClient.from !== "function") return [];
  const cleanTopic = String(topic || "").trim().toLowerCase();
  if (!cleanTopic) return [];

  const EXCLUDED = new Set(["CPA_NOTES", "REVIEW_MATERIALS", "UNKNOWN"]);
  const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 3)), 5);
  const pattern   = `%${cleanTopic}%`;

  // Concept-alias expansion (mirrors buildConceptAliasExpansion in vector-store.js)
  const conceptAliases = buildTaxConceptRetrievalAliases(cleanTopic);
  const aliasFragments = conceptAliases.slice(0, 8).flatMap(a => [
    `normalized_reference.ilike.%${a}%`,
    `document_title.ilike.%${a}%`,
    `source.ilike.%${a}%`
  ]);

  const orClause = [
    `source.ilike.${pattern}`,
    `document_title.ilike.${pattern}`,
    `normalized_reference.ilike.${pattern}`,
    ...aliasFragments
  ].join(",");

  const VECTOR_TABLE = process.env.VECTOR_TABLE || "tina_vector_store";

  // AbortController: 2 s deadline.  When controller.abort() fires, the underlying
  // fetch is cancelled by Supabase's PostgREST client — no orphan request.
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 2000);

  let data, queryError;
  try {
    ({ data, error: queryError } = await supabaseClient
      .from(VECTOR_TABLE)
      .select(
        "id,source,original_source,document_title,authority_type,authority_level," +
        "normalized_reference,chunk_index,text,metadata"
      )
      .or(orClause)
      .order("authority_level", { ascending: true, nullsFirst: false })
      .limit(safeLimit * 3)
      .abortSignal(controller.signal));
    clearTimeout(timer);
  } catch (fetchErr) {
    clearTimeout(timer);
    if (timedOut) {
      console.warn("[QUIZ ENGINE] Bounded light query timed out (>2 s) — no-source guard will fire");
    } else {
      console.error("[QUIZ ENGINE] Bounded light query fetch error:", fetchErr?.message);
    }
    return [];
  }

  if (queryError) {
    console.error("[QUIZ ENGINE] Bounded light query DB error:", {
      message: queryError.message, code: queryError.code, topic: cleanTopic
    });
    return [];
  }

  const excPaths = new Set(safeArray(excludeSourcePaths));
  const excIds   = new Set(safeArray(excludeChunkIds).map(String));

  return (data || [])
    .filter(row => {
      if (EXCLUDED.has(row.authority_type)) return false;
      const path    = row.metadata?.path || row.original_source || row.source || "";
      const chunkId = String(row.id || "");
      return !excPaths.has(path) && !excIds.has(chunkId) && (row.text || "").trim().length >= 50;
    })
    .slice(0, safeLimit)
    .map(row => {
      const meta = row.metadata || {};
      const driveViewUrl = meta.driveViewUrl || meta.drive_view_url || meta.url || null;
      return {
        id:                   row.id,
        source:               row.source,
        original_source:      row.original_source,
        title:                row.document_title || row.original_source || row.source || "Quiz Source",
        document_title:       row.document_title,
        authorityType:        row.authority_type || "UNKNOWN",
        authority_type:       row.authority_type,
        authority_level:      row.authority_level,
        citation:             row.normalized_reference || "",
        normalized_reference: row.normalized_reference,
        chunk_index:          row.chunk_index,
        url:                  driveViewUrl || "",
        driveViewUrl:         driveViewUrl || "",
        drive_view_url:       driveViewUrl || "",
        text:                 trimText(row.text || "", 1200),
        content:              trimText(row.text || "", 1200),
        excerpt:              trimText(row.text || "", 1200),
        metadata:             meta,
        score:                0.7,
        sourceTitle:          row.document_title || row.original_source || row.source,
        sourcePath:           meta.path || row.original_source || row.source,
        fileId:               meta.fileId || meta.file_id || null,
        compactOutput:        true
      };
    });
}
// ─── end bounded light retrieval for /quiz ───────────────────────────────────

// Builds the quiz prompt for a specific domain + subtopic (different from the base adaptive prompt)
function buildDomainSubtopicQuizPrompt({
  domain,
  subtopic,
  subtopicLabel,
  difficulty,
  difficultyLabel,
  profile,
  sourceChunks,
  recentQuestions,
  excludeFingerprints
}) {
  const sourceContext = safeArray(sourceChunks)
    .map((chunk, i) => {
      const text = String(chunk.text || chunk.content || "").slice(0, 2500);
      return `SOURCE ${i + 1}\nTitle: ${chunk.title || "Untitled"}\nAuthority: ${chunk.authorityType || "UNKNOWN"}\nCitation: ${chunk.citation || "N/A"}\nText:\n${text}`;
    })
    .join("\n\n---\n\n");

  const recentQTexts = safeArray(recentQuestions)
    .map((q, i) => `${i + 1}. ${q.question}`)
    .filter(Boolean)
    .slice(0, 10)
    .join("\n");

  const excludedTexts = safeArray(excludeFingerprints).slice(0, 30).join("\n");

  const allExcluded = [recentQTexts, excludedTexts].filter(Boolean).join("\n").trim();

  if (!sourceContext) {
    return `
You are TINA, a CPALE Philippine Tax Examiner.

Generate ONE multiple-choice question on: **${subtopicLabel}**

Subtopic: ${subtopic}
Domain: ${domain}
Difficulty: ${difficultyLabel} (${difficulty}/5)

RULES:
- Philippine taxation only (NIRC, RR, RMC, Supreme Court, CTA).
- One question, four choices: A, B, C, D.
- Randomize where the correct answer falls (do not always put it at A).
- Do not cite specific RR numbers, RMC numbers, RMO numbers, BIR rulings, case names, G.R. numbers, deadlines, tax rates, or statutory section numbers. No indexed source is available for this question — use general framework explanation only.
- Avoid repeating the following questions:
${allExcluded || "None yet."}
- Return valid JSON only. No markdown. No text outside JSON.

JSON structure:
{
  "topic": "${domain}",
  "subtopic": "${subtopic}",
  "difficulty": ${difficulty},
  "question": "...",
  "choices": {
    "A": "First choice text",
    "B": "Second choice text",
    "C": "Third choice text",
    "D": "Fourth choice text"
  },
  "correctAnswer": "A",
  "explanation": "...",
  "cpaleTrap": "...",
  "sourceSupport": "GENERAL_FALLBACK_NO_INDEXED_SOURCE",
  "groundingStatus": "limited_indexed_source",
  "validationStatus": "GENERAL_FALLBACK"
}
`.trim();
  }

  return `
You are TINA, a source-grounded CPALE Philippine Tax Examiner.

Generate ONE multiple-choice question on: **${subtopicLabel}**

Subtopic: ${subtopic}
Domain: ${domain}
Difficulty: ${difficultyLabel} (${difficulty}/5)

Difficulty guide: 1=definition, 2=rule application, 3=computation, 4=exception/trap, 5=mixed CPALE scenario

SOURCE CONTEXT:
${sourceContext}

Questions already asked (do not repeat):
${allExcluded || "None yet."}

RULES:
- Create the question from SOURCE CONTEXT only.
- The correct answer MUST be directly supported by SOURCE CONTEXT.
- Do not fabricate legal bases, rates, or citations not in SOURCE CONTEXT.
- Four choices: A, B, C, D. Randomize the correct answer position.
- Wrong choices must be plausible but clearly wrong per SOURCE CONTEXT.
- Explanation must cite SOURCE CONTEXT.
- Return valid JSON only. No markdown. No text outside JSON.

JSON structure:
{
  "topic": "${domain}",
  "subtopic": "${subtopic}",
  "difficulty": ${difficulty},
  "question": "...",
  "choices": {
    "A": "First choice text",
    "B": "Second choice text",
    "C": "Third choice text",
    "D": "Fourth choice text"
  },
  "correctAnswer": "A",
  "explanation": "...",
  "cpaleTrap": "...",
  "sourceSupport": "Quote or close paraphrase from SOURCE CONTEXT supporting the answer",
  "groundingStatus": "grounded",
  "validationStatus": "SOURCE_GROUNDED"
}
`.trim();
}

export async function generateQuizQuestion({
  domain,
  subtopic,
  sessionLearning = {},
  userId,
  conversationId,
  hookConfig,
  callOpenAI,
  supabase,
  persist = true   // false = preview-only; skip storeUnansweredQuiz (use for dedup retries)
}) {
  const subtopicLabel = getSubtopicLabel(domain, subtopic);
  const difficulty = resolveDifficulty(sessionLearning);
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] || String(difficulty);

  // Quiz history for deduplication
  let recentHistory = [];
  try {
    recentHistory = await Promise.race([
      getRecentQuizHistory(supabase, { userId, topic: domain, limit: 30 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("history timeout")), 4000))
    ]);
  } catch {
    // non-fatal
  }

  const exclusions = buildQuizExclusionFromHistory(recentHistory);
  const compactedHistory = compactHistory(recentHistory);

  // Source retrieval scoped to domain + subtopic.
  // Intentional design: issue-classification-engine, retrieval-engine, and reranker-engine
  // are bypassed here. /quiz uses a lightweight direct vector-store path for speed and
  // token efficiency. Domain is locked by the command itself, not by classifier.
  const hints = buildRetrievalHints(domain, subtopic);
  let sourceChunks = [];
  // Bounded single-stage light retrieval with a real AbortController deadline.
  // getBoundedQuizSourceChunks issues one indexed-column Supabase query and
  // cancels the underlying fetch via AbortSignal if it exceeds 2 s.
  // There is no smartSearch fallback; no background vector work continues after
  // this call returns.
  let retrievalFailed = false;
  let retrievalFailReason = null;
  try {
    sourceChunks = await getBoundedQuizSourceChunks({
      topic:              hints.primaryQuery,
      limit:              3,
      supabase,
      excludeSourcePaths: safeArray(exclusions.excludeSourcePaths),
      excludeChunkIds:    safeArray(exclusions.excludeChunkIds)
    });
  } catch (err) {
    retrievalFailed    = true;
    retrievalFailReason = err?.message || "unknown";
    console.error("[QUIZ ENGINE] Bounded source retrieval failed:", err?.message);
    sourceChunks = [];
  }

  // ── Fallback retrieval ────────────────────────────────────────────────────
  // If the primaryQuery ILIKE missed (common when the subtopic alias does not
  // appear verbatim in source/document_title/normalized_reference), try up to 4
  // alternate terms derived from the same hints object before refusing generation.
  // Uses the identical getBoundedQuizSourceChunks path — same 2-second
  // AbortController deadline, same column scope, same exclusion lists.
  // No semantic search, no LLM calls, no expansion of source authority scope.
  if (sourceChunks.length === 0) {
    const _fallbackTerms = [
      ...safeArray(hints.keywords),
      hints.fallbackQuery,
      hints.subtopicQuery
    ]
      .filter(Boolean)
      .filter(t => t !== hints.primaryQuery)
      .filter((t, i, arr) => arr.indexOf(t) === i)   // deduplicate
      .slice(0, 4);

    console.warn("[QUIZ SOURCE FALLBACK]", {
      domain,
      subtopic,
      primaryQuery:  hints.primaryQuery,
      fallbackTerms: _fallbackTerms,
      retrievalFailed
    });

    for (const _fbTerm of _fallbackTerms) {
      let _fbChunks = [];
      try {
        _fbChunks = await getBoundedQuizSourceChunks({
          topic:              _fbTerm,
          limit:              3,
          supabase,
          excludeSourcePaths: safeArray(exclusions.excludeSourcePaths),
          excludeChunkIds:    safeArray(exclusions.excludeChunkIds)
        });
      } catch {
        _fbChunks = [];
      }
      if (_fbChunks.length > 0) {
        sourceChunks = _fbChunks;
        console.info("[QUIZ SOURCE FALLBACK HIT]", {
          domain, subtopic, fallbackTerm: _fbTerm, chunks: _fbChunks.length
        });
        break;
      }
    }

    if (sourceChunks.length === 0) {
      console.warn("[QUIZ SOURCE FALLBACK MISS]", {
        domain, subtopic,
        triedTerms: [hints.primaryQuery, ..._fallbackTerms]
      });
    }
  }
  // ── End fallback retrieval ────────────────────────────────────────────────

  const compactSources = safeArray(sourceChunks).map(compactSourceChunk);

  if (compactSources.length > 0) {
    const authorityCheck = validateLearningAuthorityForDomain({
      domain,
      subtopic,
      sourceChunks: compactSources,
      mode: "quiz"
    });
    if (!authorityCheck.ok) {
      return {
        ok: false,
        noSource: true,
        reason: authorityCheck.reason || "insufficient_valid_authority",
        sourceChunks: compactSources
      };
    }
    console.info("[QUIZ ENGINE] Grounded retrieval", {
      domain,
      subtopic,
      query: hints.primaryQuery,
      chunks: compactSources.length,
      sources: compactSources.map((c) => c.title).slice(0, 3)
    });
  } else {
    console.warn("[QUIZ ENGINE] No indexed source found — refusing ungrounded generation", {
      domain,
      subtopic,
      query: hints.primaryQuery,
      retrievalFailed,
      retrievalFailReason
    });
    // No source chunks: do NOT call OpenAI to invent quiz content.
    // Return noSource so the caller (session-engine) can surface a clear limitation.
    return {
      ok: false,
      noSource: true,
      sourceChunks: []
    };
  }

  const quizPrompt = buildDomainSubtopicQuizPrompt({
    domain,
    subtopic,
    subtopicLabel,
    difficulty,
    difficultyLabel,
    profile: sessionLearning.learnerProfile || null,
    sourceChunks: compactSources,
    recentQuestions: compactedHistory,
    excludeFingerprints: safeArray(exclusions.excludeQuestionFingerprints)
  });

  const rawQuiz = await callOpenAI({
    userQuery: quizPrompt,
    systemPrompt: `
You are TINA's CPALE Philippine Tax Quiz Generator.
Return ONLY valid JSON. No markdown. No code fences. No prose outside JSON.
Philippine taxation context only. Authority-grounded only.

Required top-level keys: question, choices, correctAnswer, explanation.
choices MUST be a JSON object with exactly keys A, B, C, D — not an array.
correctAnswer MUST be exactly one of: A, B, C, D. Randomize; do not always use A.
All string values must be non-empty.

Output shape (use this structure exactly):
{"question":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"..."}
`.trim(),
    masterPrompt: `Return only this exact JSON structure with all fields populated.`,
    retrievedSources: compactSources,
    classification: {
      primaryIssue: domain,
      subIssue: subtopic,
      retrievalStrategy: compactSources.length ? "SOURCE_GROUNDED_QUIZ" : "GENERAL_QUIZ",
      targetAuthorities: hints.targetAuthorities
    },
    intent: {
      intent: "GENERATE_QUIZ_QUESTION",
      requiresQuizMode: true,
      quizDomain: domain,
      quizSubtopic: subtopic
    },
    quizMode: true,
    adaptiveContext: { activeHook: "/quiz", quizMode: true, orchestrationMode: "QUIZ" }
  });

  let quiz = safeParseQuizJson(rawQuiz);

  if (!quiz) {
    console.warn("[QUIZ ENGINE] safeParseQuizJson failed — retrying once");
    try {
      const retryRaw = await callOpenAI({
        userQuery: quizPrompt,
        systemPrompt: `Return ONLY valid JSON. No markdown. No code fences. No prose outside JSON.\nRequired keys: question, choices, correctAnswer, explanation.\nchoices MUST be an object with keys A, B, C, D — not an array. correctAnswer MUST be exactly A, B, C, or D. All strings non-empty.\nExample output (use this structure exactly):\n{"question":"Which transaction is exempt from VAT under the cited source?","choices":{"A":"Sale of ordinary taxable services","B":"Sale or importation of agricultural food products in their original state","C":"Sale of imported digital services","D":"Sale of non-essential services"},"correctAnswer":"B","explanation":"The cited source treats agricultural food products in their original state as VAT-exempt."}`,
        masterPrompt: `Return only valid JSON. Nothing else.`,
        retrievedSources: compactSources,
        classification: {
          primaryIssue: domain,
          subIssue: subtopic,
          retrievalStrategy: compactSources.length ? "SOURCE_GROUNDED_QUIZ" : "GENERAL_QUIZ",
          targetAuthorities: hints.targetAuthorities
        },
        intent: {
          intent: "GENERATE_QUIZ_QUESTION",
          requiresQuizMode: true,
          quizDomain: domain,
          quizSubtopic: subtopic
        },
        quizMode: true,
        adaptiveContext: { activeHook: "/quiz", quizMode: true, orchestrationMode: "QUIZ" }
      });
      quiz = safeParseQuizJson(retryRaw);
    } catch (retryErr) {
      console.error("[QUIZ ENGINE] Retry failed:", retryErr?.message);
    }
  }

  if (!quiz) {
    return { ok: false, error: "Quiz JSON parse failed.", sourceChunks: compactSources };
  }

  // Defense-in-depth: confirm shape is valid before writing to DB
  const quizValidation = safeParseQuizQuestion(quiz);
  if (!quizValidation.ok) {
    console.error(
      "[QUIZ ENGINE] Post-parse schema check failed:",
      quizValidation.error?.issues
        ?.map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
        .join("; ")
    );
    return { ok: false, error: "Quiz schema invalid after parsing.", sourceChunks: compactSources };
  }

  // Ensure subtopic is set
  quiz.subtopic = quiz.subtopic || subtopic;
  quiz.topic = quiz.topic || domain;

  // Store in tina_learning_attempts for answer lock (skip when persist:false — dedup retries)
  let storedQuiz = null;
  if (persist) {
    try {
      storedQuiz = await Promise.race([
        storeUnansweredQuiz(supabase, {
          userId,
          sessionId: conversationId || null,
          quiz,
          mode: hookConfig?.mode || "QUIZ_MASTER",
          sourceChunks: compactSources
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("store timeout")), 5000))
      ]);
    } catch (err) {
      console.error("[QUIZ ENGINE] storeUnansweredQuiz failed (untracked quiz returned):", err?.message);
      storedQuiz = null;
    }
  } else {
    // Preview-only: question generated and validated but NOT written to tina_learning_attempts.
    // The caller (dedup retry path) must store the winning question separately.
    storedQuiz = { id: null, correct_answer: quiz.correctAnswer, user_answer: null, previewOnly: true };
  }

  const domainConfig = getDomainConfig(domain) || {};
  const domainLabel = domainConfig.label || domain;
  const isGrounded = compactSources.length > 0;
  const answerText = formatQuizBlock({
    quiz,
    subtopicLabel,
    domainLabel,
    isGrounded
  });

  return {
    ok: true,
    quiz,
    storedQuiz: storedQuiz || { id: null, correct_answer: quiz.correctAnswer },
    sourceChunks: compactSources,
    answerText,
    saveFailed: !storedQuiz || Boolean(storedQuiz?.saveFailed)
  };
}

function formatQuizBlock({ quiz, subtopicLabel, domainLabel, isGrounded }) {
  const letters = ["A", "B", "C", "D"];
  const choicesObj = quiz.choices || {};
  const renderedChoices = letters
    .map((l) => `${l}. ${String(choicesObj[l] || "").trim()}`)
    .join("\n\n");

  // Strip "Domain — " prefix from subtopicLabel so the title reads cleanly
  const topicName = subtopicLabel.includes(" — ")
    ? subtopicLabel.split(" — ").slice(1).join(" — ")
    : subtopicLabel;

  const parts = [`# ${domainLabel} Quiz — ${topicName}`, ""];

  if (isGrounded === false) {
    parts.push("Indexed source is limited for this topic.", "");
  }

  parts.push(
    "## Question",
    quiz.question || "Question unavailable.",
    "",
    renderedChoices,
    "",
    "Answer with A, B, C, or D only.",
    "Type /bye to exit."
  );

  return parts.filter((line) => line !== null && line !== undefined).join("\n").trim();
}

export function quizEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_QUIZ_ENGINE",
    version: ENGINE_VERSION,
    sourceGrounded: true,
    subtopicAware: true,
    difficultyAdaptive: true
  };
}
