// FILE: provision-citation-engine.js

import {
  rerankByHierarchy,
  normalizeLegalReference
} from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    null
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
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
    "SECONDARY"
  );
}

function authorityLevelOf(doc = {}) {
  return Number(
    doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel ||
      99
  );
}

function normalizedReferenceOf(doc = {}) {
  return (
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    null
  );
}

function extractSectionReferences(text = "") {
  const raw = compactSpaces(text);
  if (!raw) return [];

  const refs = [];
  const patterns = [
    /\bsection\s+(\d+[a-z]?)(?:\s*\(([a-z0-9]+)\))?(?:\s*\(([a-z0-9]+)\))?/gi,
    /\bsec\.?\s+(\d+[a-z]?)(?:\s*\(([a-z0-9]+)\))?(?:\s*\(([a-z0-9]+)\))?/gi,
    /\bsections\s+(\d+[a-z]?)\s*(?:to|-|–)\s*(\d+[a-z]?)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(raw)) !== null) {
      if (match[2] && !match[3]) {
        refs.push({
          raw: match[0],
          base: String(match[1]).toUpperCase(),
          subsections: [String(match[2]).toUpperCase()],
          normalized: `SECTION_${String(match[1]).toUpperCase()}(${String(match[2]).toUpperCase()})`
        });
      } else if (match[2] && match[3]) {
        refs.push({
          raw: match[0],
          base: String(match[1]).toUpperCase(),
          subsections: [String(match[2]).toUpperCase(), String(match[3]).toUpperCase()],
          normalized: `SECTION_${String(match[1]).toUpperCase()}(${String(match[2]).toUpperCase()})(${String(match[3]).toUpperCase()})`
        });
      } else if (match[2] && !Number.isNaN(Number(match[2]))) {
        refs.push({
          raw: match[0],
          base: `${String(match[1]).toUpperCase()}-${String(match[2]).toUpperCase()}`,
          subsections: [],
          normalized: `SECTION_RANGE_${String(match[1]).toUpperCase()}_${String(match[2]).toUpperCase()}`
        });
      } else {
        refs.push({
          raw: match[0],
          base: String(match[1]).toUpperCase(),
          subsections: [],
          normalized: `SECTION_${String(match[1]).toUpperCase()}`
        });
      }
    }
  }

  return refs;
}

function extractArticleReferences(text = "") {
  const raw = compactSpaces(text);
  if (!raw) return [];

  const refs = [];
  const pattern = /\barticle\s+([ivxlcdm]+|\d+)\b/gi;

  let match;
  while ((match = pattern.exec(raw)) !== null) {
    refs.push({
      raw: match[0],
      base: String(match[1]).toUpperCase(),
      normalized: `ARTICLE_${String(match[1]).toUpperCase()}`
    });
  }

  return refs;
}

function extractProvisionIntent(question = "") {
  const q = compactSpaces(question);
  const lowerQ = lower(q);
  const sectionRefs = extractSectionReferences(q);
  const articleRefs = extractArticleReferences(q);
  const legalRef = normalizeLegalReference(q);

  const exactSignals = [
    "exact provision",
    "exact section",
    "identify the exact provision",
    "identify the provision",
    "cite the exact provision",
    "what section",
    "which section",
    "under section",
    "per section",
    "penalizes",
    "elements under section"
  ];

  const asksExactProvision =
    sectionRefs.length > 0 ||
    articleRefs.length > 0 ||
    exactSignals.some((signal) => lowerQ.includes(signal));

  return {
    question: q,
    asksExactProvision,
    sectionRefs,
    articleRefs,
    legalReference: legalRef,
    hasNormalizedLegalReference: Boolean(legalRef?.normalized)
  };
}

function buildSectionRegex(sectionRef) {
  const base = String(sectionRef?.base || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!base) return null;

  const subsectionPattern =
    safeArray(sectionRef?.subsections).length > 0
      ? safeArray(sectionRef.subsections)
          .map((part) => `\\(${String(part).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`)
          .join("\\s*")
      : "";

  return new RegExp(
    `\\b(?:section|sec\\.?)\\s*${base}\\s*${subsectionPattern}`,
    "i"
  );
}

function findSectionMatchesInText(text = "", refs = []) {
  const content = String(text || "");
  const matches = [];

  for (const ref of refs) {
    const regex = buildSectionRegex(ref);
    if (!regex) continue;
    const match = content.match(regex);
    if (match) {
      matches.push({
        ref,
        matchText: match[0],
        index: match.index ?? content.indexOf(match[0])
      });
    }
  }

  return matches;
}

function extractSnippetAround(text = "", index = 0, radius = 260) {
  const content = String(text || "");
  if (!content) return "";

  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return content.slice(start, end).trim();
}

function computeQuestionKeywordScore(question = "", text = "") {
  const qTokens = lower(question)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.length > 2);

  if (!qTokens.length) return 0;

  const haystack = lower(text);
  let hits = 0;

  for (const token of qTokens) {
    if (haystack.includes(token)) hits += 1;
  }

  return hits / qTokens.length;
}

function computeProvisionMatchScore(doc = {}, provisionIntent) {
  const text = doc.text || "";
  const matches = findSectionMatchesInText(text, provisionIntent.sectionRefs || []);
  const sectionMatchScore = matches.length > 0 ? 1 : 0;
  const keywordScore = computeQuestionKeywordScore(
    provisionIntent.question,
    [
      doc.text,
      doc.source,
      doc.originalSource,
      doc.path,
      doc.metadata?.path,
      normalizedReferenceOf(doc)
    ]
      .filter(Boolean)
      .join(" ")
  );

  const exactLegalReferenceBonus =
    provisionIntent.hasNormalizedLegalReference &&
    normalizedReferenceOf(doc) &&
    String(normalizedReferenceOf(doc)).toLowerCase() ===
      String(provisionIntent.legalReference.normalized).toLowerCase()
      ? 1
      : 0;

  return {
    sectionMatchScore,
    keywordScore,
    exactLegalReferenceBonus,
    total:
      sectionMatchScore * 0.5 +
      keywordScore * 0.3 +
      exactLegalReferenceBonus * 0.2,
    matches
  };
}

function buildProvisionCitation(doc = {}, sectionMatch = null) {
  const source = sourcePathOf(doc);
  const title = sourceTitleOf(doc);
  const authorityType = authorityTypeOf(doc);
  const authorityLevel = authorityLevelOf(doc);

  return {
    source,
    title,
    authorityType,
    authorityLevel,
    normalizedReference: normalizedReferenceOf(doc),
    sectionLabel: sectionMatch?.matchText || null,
    excerpt: sectionMatch
      ? extractSnippetAround(doc.text || "", sectionMatch.index, 220)
      : normalizeText(doc.text || "").slice(0, 320)
  };
}

export function selectProvisionCandidates({
  question = "",
  retrievedResults = [],
  limit = 5
}) {
  const provisionIntent = extractProvisionIntent(question);
  const reranked = rerankByHierarchy(retrievedResults, question);

  const candidates = reranked
    .map((doc) => {
      const provisionScore = computeProvisionMatchScore(doc, provisionIntent);

      return {
        ...doc,
        provisionScore: provisionScore.total,
        provisionMatches: provisionScore.matches,
        provisionKeywordScore: provisionScore.keywordScore,
        provisionSectionMatchScore: provisionScore.sectionMatchScore,
        provisionExactLegalReferenceBonus: provisionScore.exactLegalReferenceBonus
      };
    })
    .filter((doc) => {
      if (provisionIntent.asksExactProvision) {
        return doc.provisionScore > 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (b.provisionScore !== a.provisionScore) {
        return b.provisionScore - a.provisionScore;
      }
      if ((a.authorityLevel || 99) !== (b.authorityLevel || 99)) {
        return (a.authorityLevel || 99) - (b.authorityLevel || 99);
      }
      return Number(b.finalScore || b.score || 0) - Number(a.finalScore || a.score || 0);
    })
    .slice(0, limit);

  return {
    provisionIntent,
    candidates
  };
}

export function buildProvisionCitations({
  question = "",
  retrievedResults = [],
  limit = 3
}) {
  const { provisionIntent, candidates } = selectProvisionCandidates({
    question,
    retrievedResults,
    limit
  });

  const citations = candidates.map((doc) =>
    buildProvisionCitation(doc, doc.provisionMatches?.[0] || null)
  );

  return {
    provisionIntent,
    citations
  };
}

export function getBestExactProvisionMatch({
  question = "",
  retrievedResults = []
}) {
  const { provisionIntent, candidates } = selectProvisionCandidates({
    question,
    retrievedResults,
    limit: 1
  });

  const best = candidates[0] || null;

  if (!best) {
    return {
      found: false,
      provisionIntent,
      citation: null,
      doc: null
    };
  }

  return {
    found: true,
    provisionIntent,
    citation: buildProvisionCitation(best, best.provisionMatches?.[0] || null),
    doc: best
  };
}

export function formatProvisionCitationsForAnswer(citations = []) {
  if (!citations.length) {
    return "No exact provision citation found in the indexed knowledge base.";
  }

  return citations
    .map((item, index) => {
      const lines = [
        `${index + 1}. ${item.title}`,
        `Authority: ${item.authorityType} (Level ${item.authorityLevel})`
      ];

      if (item.sectionLabel) {
        lines.push(`Provision: ${item.sectionLabel}`);
      }

      if (item.excerpt) {
        lines.push(`Excerpt: ${item.excerpt}`);
      }

      if (item.source) {
        lines.push(`Source Path: ${item.source}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function shouldUseProvisionCitationMode(question = "") {
  return extractProvisionIntent(question).asksExactProvision;
}

export function buildProvisionCitationPrompt({
  question = "",
  citations = []
}) {
  const citationText = formatProvisionCitationsForAnswer(citations);

  return `
You are TINA, a Philippine tax research and compliance assistant.

STRICT RULES:
1. Use only the cited indexed sources below.
2. Do not invent section numbers, article numbers, paragraphs, or elements.
3. If exact provision support is insufficient, say:
   "I cannot find the exact provision in the uploaded knowledge base."
4. Prefer higher authority sources.
5. Cite exact source path when available.
6. Never mention ChatGPT.

RESPONSE FORMAT:
1. DIRECT ANSWER
2. EXACT PROVISION
3. LEGAL BASIS
4. EXPLANATION
5. SOURCES USED

QUESTION:
${question}

INDEXED PROVISION CANDIDATES:
${citationText}
`.trim();
}

export async function maybeGenerateProvisionCitationAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini"
}) {
  const provisionIntent = extractProvisionIntent(question);

  if (!provisionIntent.asksExactProvision) {
    return {
      handled: false,
      answer: "",
      provisionIntent,
      citations: []
    };
  }

  const { citations } = buildProvisionCitations({
    question,
    retrievedResults,
    limit: 3
  });

  if (!citations.length) {
    return {
      handled: true,
      answer: "I cannot find the exact provision in the uploaded knowledge base.",
      provisionIntent,
      citations: []
    };
  }

  const prompt = buildProvisionCitationPrompt({
    question,
    citations
  });

  const response = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Answer this exact-provision question strictly from the indexed provision candidates:\n${question}`
      }
    ]
  });

  const answer =
    response.choices?.[0]?.message?.content?.trim() ||
    "I cannot find the exact provision in the uploaded knowledge base.";

  return {
    handled: true,
    answer,
    provisionIntent,
    citations
  };
}
