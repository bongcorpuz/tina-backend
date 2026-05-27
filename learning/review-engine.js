// FILE: learning/review-engine.js
"use strict";

import { buildRetrievalHints } from "./question-bank-router.js";
import { getSubtopicLabel, getDomainAuthorities } from "./domain-normalizer.js";
import { buildTaxConceptRetrievalAliases } from "../services/tax-concept-aliases.js";

const ENGINE_VERSION = "1.0.0";

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1400) {
  const text = normalizeText(value);
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function compactSourceChunk(chunk = {}) {
  return {
    id: String(chunk.id || ""),

    sourcePath:
      chunk.sourcePath ||
      chunk.metadata?.path ||
      chunk.original_source ||
      chunk.source ||
      "",

    title:
      chunk.title ||
      chunk.sourceTitle ||
      chunk.document_title ||
      chunk.metadata?.documentTitle ||
      chunk.metadata?.originalFileName ||
      chunk.originalSource ||
      chunk.original_source ||
      chunk.source ||
      "Source",

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
      chunk.text || chunk.content || chunk.excerpt || chunk.preview || "", 1400
    ),

    score:
      Number(chunk.finalScore || chunk.final_score || chunk.retrievalScore || chunk.score || chunk.similarity || 0) || 0
  };
}

// ─── bounded light retrieval ─────────────────────────────────────────────────
// Mirrors the light stage of getReviewSourceChunks (vector-store.js) without
// the smartSearch fallback.  One indexed-column Supabase query is issued with a
// 2 s AbortController deadline.  When the deadline fires, the underlying fetch
// is cancelled by Supabase's PostgREST client — no orphan HTTP request remains.
//
// Columns queried: source, document_title, normalized_reference
// Authority filter: everything except UNKNOWN (same as the full function)
// Priority: primary authorities fill first; CPA_NOTES/REVIEW_MATERIALS supplement
//
// NIRC raw-form expansion (buildNircLightExpansion) is omitted because it is an
// internal helper in vector-store.js that is not exported.  The concept-alias
// expansion already covers the formal NIRC section labels that matter here.
async function getBoundedReviewSourceChunks({
  topic,
  excludeChunkIds = [],
  excludeSourcePaths = [],
  limit = 4,
  supabase: supabaseClient
}) {
  if (!supabaseClient || typeof supabaseClient.from !== "function") return [];
  const cleanTopic = String(topic || "").trim().toLowerCase();
  if (!cleanTopic) return [];

  const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 4)), 6);
  const pattern   = `%${cleanTopic}%`;

  // Concept-alias expansion — mirrors buildConceptAliasExpansion from vector-store.js
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

  const VECTOR_TABLE   = process.env.VECTOR_TABLE || "tina_vector_store";
  const REVIEWER_TYPES = new Set(["CPA_NOTES", "REVIEW_MATERIALS", "SECONDARY"]);

  const excPaths = new Set(safeArray(excludeSourcePaths));
  const excIds   = new Set(safeArray(excludeChunkIds).map(String));

  // AbortController: 2 s deadline.  When controller.abort() fires, the
  // underlying fetch is cancelled by Supabase's PostgREST client.
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 2000);

  let data, queryError;
  try {
    ({ data, error: queryError } = await supabaseClient
      .from(VECTOR_TABLE)
      .select(
        "id,source,original_source,document_title,authority_type,authority_level," +
        "normalized_reference,chunk_index,text,metadata"
      )
      .or(orClause)
      .neq("authority_type", "UNKNOWN")
      .order("authority_level", { ascending: true, nullsFirst: false })
      .limit(safeLimit * 3)
      .abortSignal(controller.signal));
    clearTimeout(timer);
  } catch (fetchErr) {
    clearTimeout(timer);
    if (timedOut) {
      console.warn("[REVIEW ENGINE] Bounded light query timed out (>2 s) — no-source guard will fire");
    } else {
      console.error("[REVIEW ENGINE] Bounded light query fetch error:", fetchErr?.message);
    }
    return [];
  }

  if (queryError) {
    console.error("[REVIEW ENGINE] Bounded light query DB error:", {
      message: queryError.message, code: queryError.code, topic: cleanTopic
    });
    return [];
  }

  const shaped = (data || [])
    .filter(row => {
      const path    = row.metadata?.path || row.original_source || row.source || "";
      const chunkId = String(row.id || "");
      return (
        !excPaths.has(path) &&
        !excIds.has(chunkId) &&
        (row.text || "").trim().length >= 50
      );
    })
    .map(row => {
      const meta       = row.metadata || {};
      const driveViewUrl = meta.driveViewUrl || meta.drive_view_url || meta.url || null;
      return {
        id:                row.id,
        source:            row.source,
        original_source:   row.original_source,
        title:             row.document_title || row.original_source || row.source || "Review Source",
        document_title:    row.document_title,
        authorityType:     row.authority_type || "UNKNOWN",
        authority_type:    row.authority_type,
        authority_level:   row.authority_level,
        citation:          row.normalized_reference || "",
        normalized_reference: row.normalized_reference,
        chunk_index:       row.chunk_index,
        url:               driveViewUrl || "",
        driveViewUrl:      driveViewUrl || "",
        drive_view_url:    driveViewUrl || "",
        text:              trimText(row.text || "", 1400),
        content:           trimText(row.text || "", 1400),
        excerpt:           trimText(row.text || "", 1400),
        metadata:          meta,
        score:             0.7,
        sourceTitle:       row.document_title || row.original_source || row.source,
        sourcePath:        meta.path || row.original_source || row.source,
        fileId:            meta.fileId || meta.file_id || null,
        compactOutput:     true
      };
    });

  const primary   = shaped.filter(r => !REVIEWER_TYPES.has(r.authority_type));
  const secondary = shaped.filter(r =>  REVIEWER_TYPES.has(r.authority_type));

  if (primary.length >= safeLimit) return primary.slice(0, safeLimit);
  const remaining = safeLimit - primary.length;
  return [...primary, ...secondary.slice(0, remaining)];
}
// ─── end bounded light retrieval ──────────────────────────────────────────────

function buildReviewPrompt({ domain, subtopic, subtopicLabel, sourceChunks, authorities }) {
  const sourceContext = safeArray(sourceChunks)
    .map((chunk, i) => {
      const text = String(chunk.text || chunk.content || "").slice(0, 2500);
      return `SOURCE ${i + 1}\nTitle: ${chunk.title || "Untitled"}\nAuthority: ${chunk.authorityType || "UNKNOWN"}\nCitation: ${chunk.citation || "N/A"}\nText:\n${text}`;
    })
    .join("\n\n---\n\n");

  const authoritiesText = safeArray(authorities).join(", ");

  if (!sourceContext) {
    return `
You are TINA, a professional Philippine Tax CPA Reviewer and CPALE coach.

Create a comprehensive reviewer entry on: **${subtopicLabel}**

Domain: ${domain}
Subtopic: ${subtopic}
Key Authorities: ${authoritiesText || "NIRC, RR, Supreme Court"}

STRICT RULES:
- Philippine taxation only. NIRC, RR, RMC, Supreme Court, CTA only.
- Do not fabricate specific GR numbers, dates, or rates unless certain.
- Output must use the EXACT markdown section headers shown below — no plain text headers.
- Write at the level of a CPALE/BAR exam reviewer.
- Include one mini MCQ at the end with correct answer indicated.
- If no specific indexed source is available, state principles from training knowledge without fabricating citations.

OUTPUT FORMAT (use exactly these markdown headers, including the # symbols):

# ${subtopicLabel}

## Core Concept
[2-4 sentence explanation of the core rule or principle]

## Legal Basis
[Cite the primary NIRC section, RR, RMC, or Supreme Court case — only cite authorities you are certain of]

## Doctrine
[Key doctrinal rule or leading case with citation — if uncertain of GR number, state the case name and principle without fabricating the number]

## Practical Example
[One concrete, exam-style fact pattern showing the rule in action]

## CPA / Bar Tip
[One exam strategy or common trap for this subtopic]

## Mini Question
[One MCQ with 4 choices: A, B, C, D]

## Correct Answer
[State the correct letter and option text]

## Explanation
[One-sentence explanation of why the correct answer is correct]

## Why the Other Choices Are Wrong
[Brief note for each incorrect choice A–D]
`.trim();
  }

  return `
You are TINA, a professional Philippine Tax CPA Reviewer and CPALE coach.

Create a comprehensive reviewer entry on: **${subtopicLabel}**

Domain: ${domain}
Subtopic: ${subtopic}

SOURCE CONTEXT (use this as primary authority):
${sourceContext}

STRICT RULES:
- Base your answer primarily on SOURCE CONTEXT.
- Do not fabricate legal bases, rates, or citations not found in SOURCE CONTEXT.
- Philippine taxation only.
- Output must use the EXACT markdown section headers shown below — no plain text headers.
- Write at the level of a CPALE/BAR exam reviewer.
- Include one mini MCQ at the end grounded in SOURCE CONTEXT.

OUTPUT FORMAT (use exactly these markdown headers, including the # symbols):

# ${subtopicLabel}

## Core Concept
[2-4 sentence explanation from SOURCE CONTEXT]

## Legal Basis
[Cite the primary NIRC section, RR, or case from SOURCE CONTEXT]

## Doctrine
[Key doctrinal rule from SOURCE CONTEXT]

## Practical Example
[One concrete, exam-style fact pattern based on SOURCE CONTEXT]

## CPA / Bar Tip
[One exam strategy or CPALE trap derived from SOURCE CONTEXT]

## Mini Question
[One MCQ with 4 choices: A, B, C, D]

## Correct Answer
[State the correct letter and option text]

## Explanation
[One-sentence explanation grounded in SOURCE CONTEXT]

## Why the Other Choices Are Wrong
[Brief note for each incorrect choice A–D]
`.trim();
}

export async function generateReviewMaterial({
  domain,
  subtopic,
  sessionLearning = {},
  callOpenAI,
  supabase,
  excludeChunkIds = [],
  excludeSourcePaths = []
}) {
  const subtopicLabel = getSubtopicLabel(domain, subtopic);
  const authorities = getDomainAuthorities(domain);
  const hints = buildRetrievalHints(domain, subtopic);

  // Bounded single-stage retrieval: one indexed-column query, no smartSearch fallback.
  // If this returns empty the no-source guard fires immediately; there is nothing else
  // running that could produce post-response logs or start an OpenAI call.
  let sourceChunks = [];
  try {
    sourceChunks = await getBoundedReviewSourceChunks({
      topic:              hints.primaryQuery,
      excludeSourcePaths: safeArray(excludeSourcePaths),
      excludeChunkIds:    safeArray(excludeChunkIds).map(String),
      limit:              4,
      supabase
    });
  } catch (err) {
    console.error("[REVIEW ENGINE] Source retrieval failed:", err?.message);
    sourceChunks = [];
  }

  const compactSources = safeArray(sourceChunks).map(compactSourceChunk);

  if (compactSources.length > 0) {
    console.info("[REVIEW ENGINE] Grounded retrieval", {
      domain,
      subtopic,
      query: hints.primaryQuery,
      sourceCount: compactSources.length
    });
  } else {
    console.warn("[REVIEW ENGINE] No indexed source found — refusing ungrounded generation", {
      domain,
      subtopic,
      query: hints.primaryQuery,
      sourceCount: 0
    });
    // No source chunks: do NOT call OpenAI to invent doctrine.
    // Return noSource so the caller (session-engine) can surface a clear limitation.
    return {
      ok: false,
      noSource: true,
      reviewText: null,
      sourceChunks: [],
      subtopicLabel
    };
  }

  const reviewPrompt = buildReviewPrompt({
    domain,
    subtopic,
    subtopicLabel,
    sourceChunks: compactSources,
    authorities
  });

  const rawReview = await callOpenAI({
    userQuery: reviewPrompt,
    systemPrompt: `
You are TINA, a CPALE Philippine Tax Reviewer.
Output must use markdown formatting: use # for the topic title and ## for every section header.
All section headers are mandatory. Do NOT use plain-text headers — always include the # or ## prefix.
Philippine taxation only. Authority-grounded. No fabricated citations.
Write at CPALE/BAR exam difficulty level.
`.trim(),
    masterPrompt: `Follow the markdown output format exactly. All ## sections required. Use # and ## headers.`,
    retrievedSources: compactSources,
    classification: {
      primaryIssue: domain,
      subIssue: subtopic,
      retrievalStrategy: compactSources.length ? "SOURCE_GROUNDED_REVIEW" : "TRAINING_KNOWLEDGE_REVIEW",
      targetAuthorities: hints.targetAuthorities
    },
    intent: {
      intent: "GENERATE_REVIEW_MATERIAL",
      requiresReviewMode: true,
      reviewDomain: domain,
      reviewSubtopic: subtopic
    },
    quizMode: false,
    adaptiveContext: { activeHook: "/review", reviewMode: true, orchestrationMode: "REVIEWER" }
  });

  const sourceLines = compactSources.length
    ? "\n\n---\n\n**Sources Used:**\n" +
      compactSources
        .map((s) => `- ${s.citation || s.title || "Indexed Authority"} *(${s.authorityType})*`)
        .join("\n")
    : "";

  return {
    ok: Boolean(rawReview),
    reviewText: (String(rawReview || "").trim() + sourceLines).trim(),
    sourceChunks: compactSources,
    subtopicLabel
  };
}

export function splitReviewContent(fullText = "") {
  const text = String(fullText || "").trim();
  const marker = "\n## Correct Answer";
  const idx = text.indexOf(marker);
  if (idx === -1) {
    return { displayContent: text, answerText: "", correctAnswer: null };
  }
  const displayContent = text.slice(0, idx).trim();
  const answerText = text.slice(idx).trim();
  const m = answerText.match(/^## Correct Answer\s*[\n\r]+([A-D])/im);
  const correctAnswer = m ? m[1].toUpperCase() : null;
  return { displayContent, answerText, correctAnswer };
}

export function reviewEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_REVIEW_ENGINE",
    version: ENGINE_VERSION,
    sourceGrounded: true,
    subtopicAware: true,
    professionalFormat: true
  };
}
