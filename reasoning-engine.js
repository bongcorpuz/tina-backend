// FILE: reasoning-engine.js

function safeString(value) {
  return String(value || "").trim();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function lower(value) {
  return safeString(value).toLowerCase();
}

function normalizeSourceName(name = "") {
  return safeString(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/[\\/]+/g, "/")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_\s]/g, "-")
    .replace(/[\\/]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getDocPath(doc = {}) {
  return safeString(
    doc.metadata?.path ||
      doc.path ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source
  );
}

function getDocOriginalName(doc = {}) {
  return safeString(
    doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source
  );
}

function buildDocIdentity(doc = {}) {
  return (
    safeString(doc.id) ||
    safeString(doc.chunk_id) ||
    safeString(doc.metadata?.chunkId) ||
    safeString(doc.metadata?.fileId) ||
    getDocPath(doc) ||
    getDocOriginalName(doc) ||
    safeString(doc.source)
  );
}

function inferAuthorityTier(doc = {}) {
  const explicitTier =
    doc.authority_tier ??
    doc.metadata?.authorityTier ??
    doc.sourceTier?.tier;

  if (Number.isFinite(Number(explicitTier))) {
    return Number(explicitTier);
  }

  const value = `${getDocPath(doc)} ${getDocOriginalName(doc)} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) return 1;
  if (value.includes("02_revenue_regulations")) return 2;
  if (value.includes("03_rmc")) return 3;
  if (value.includes("04_rmo")) return 4;
  if (value.includes("05_bir_rulings")) return 5;
  if (value.includes("06_court_cases")) return 6;
  if (value.includes("07_cpa_notes")) return 7;

  return 99;
}

function authorityWeight(tier = 99) {
  if (tier === 1) return 1.0;
  if (tier === 2) return 0.95;
  if (tier === 3) return 0.9;
  if (tier === 4) return 0.85;
  if (tier === 5) return 0.75;
  if (tier === 6) return 0.6;
  if (tier === 7) return 0.4;
  return 0.5;
}

function inferAuthorityLabel(tier = 99) {
  if (tier === 1) return "Tax Code / NIRC";
  if (tier === 2) return "Revenue Regulations";
  if (tier === 3) return "Revenue Memorandum Circulars";
  if (tier === 4) return "Revenue Memorandum Orders";
  if (tier === 5) return "BIR Rulings";
  if (tier === 6) return "Court Cases";
  if (tier === 7) return "CPA Notes / Internal Notes";
  return "Unclassified Source";
}

function inferEvidenceType(doc = {}) {
  const tier = inferAuthorityTier(doc);
  if (tier <= 4) return "primary";
  if (tier <= 6) return "interpretive";
  return "secondary";
}

function inferEffectiveDate(doc = {}) {
  const raw =
    doc.metadata?.effectiveFrom ||
    doc.metadata?.effective_date ||
    doc.effective_from ||
    doc.modified_at ||
    doc.metadata?.modifiedTime ||
    doc.modifiedTime ||
    null;

  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function uniqueBy(items = [], makeKey = (item) => item) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const key = makeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return results;
}

function tokenize(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function computeKeywordScore(query = "", text = "") {
  const queryTokens = tokenize(query);
  const textTokens = new Set(tokenize(text));

  if (!queryTokens.length || !textTokens.size) return 0;

  let hits = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) hits += 1;
  }

  return hits / queryTokens.length;
}

function classifyEvidenceTopic(doc = {}) {
  return safeString(
    doc.metadata?.topic ||
      doc.topic ||
      doc.metadata?.taxType ||
      doc.tax_type ||
      doc.metadata?.subtopic ||
      doc.subtopic ||
      "general"
  );
}

function compareEvidencePair(a, b) {
  const sameTopic = classifyEvidenceTopic(a) === classifyEvidenceTopic(b);
  if (!sameTopic) return null;

  const textA = lower(a.text || a.claim_text || "");
  const textB = lower(b.text || b.claim_text || "");

  if (!textA || !textB) return null;
  if (textA === textB) return null;

  const negWords = ["not", "except", "unless", "prohibited", "disallowed", "invalid"];
  const hasNegA = negWords.some((word) => textA.includes(word));
  const hasNegB = negWords.some((word) => textB.includes(word));

  if (hasNegA !== hasNegB) {
    return {
      conflict_topic: classifyEvidenceTopic(a),
      source_a_path: getDocPath(a),
      source_b_path: getDocPath(b),
      source_a_claim: safeString(a.text).slice(0, 500),
      source_b_claim: safeString(b.text).slice(0, 500),
      preferred_source_path:
        inferAuthorityTier(a) <= inferAuthorityTier(b) ? getDocPath(a) : getDocPath(b),
      conflict_reason: "Potential contradiction detected from opposing rule language.",
      resolution_basis: "Prefer higher-authority source and verify effective dates."
    };
  }

  return null;
}

function extractTopClaims(answerDraft = "") {
  return safeString(answerDraft)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .slice(0, 12);
}

export async function resolveExactCitation(supabase, query) {
  const cleanQuery = safeString(query);

  const patterns = [
    {
      type: "RR",
      regex: /\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    }
  ];

  let matchInfo = null;

  for (const pattern of patterns) {
    const match = cleanQuery.match(pattern.regex);
    if (match) {
      const number = String(match[1]).replace(/^0+/, "") || "0";
      const year = String(match[2]).length === 2 ? `20${match[2]}` : String(match[2]);
      matchInfo = {
        type: pattern.type,
        number,
        year
      };
      break;
    }
  }

  if (!matchInfo) {
    return {
      matched: false,
      query: cleanQuery,
      citation: null,
      documents: []
    };
  }

  const candidateStrings = uniqueBy(
    [
      `${matchInfo.type} ${matchInfo.number}-${matchInfo.year}`,
      `${matchInfo.type} No. ${matchInfo.number}-${matchInfo.year}`,
      `${matchInfo.type}-${matchInfo.number}-${matchInfo.year}`,
      `${matchInfo.type}_${matchInfo.number}-${matchInfo.year}`,
      `${matchInfo.type}${matchInfo.number}-${matchInfo.year}`
    ],
    (value) => value
  );

  const { data, error } = await supabase
    .from("tina_vector_store")
    .select("*")
    .or(candidateStrings.map((value) => `source.ilike.%${value}%`).join(","))
    .limit(25);

  if (error) {
    throw new Error(`resolveExactCitation failed: ${error.message}`);
  }

  const documents = (data || []).filter((doc) => {
    const haystack = [
      doc.source,
      doc.original_source,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.path
    ]
      .filter(Boolean)
      .map(normalizeForMatch)
      .join(" ");

    return candidateStrings
      .map(normalizeForMatch)
      .some((candidate) => haystack.includes(candidate));
  });

  return {
    matched: true,
    query: cleanQuery,
    citation: matchInfo,
    documents
  };
}

export async function hybridRetrieve({
  supabase,
  vectorStore,
  query,
  questionType = "general",
  taxType = "",
  topK = 24
}) {
  const cleanQuery = safeString(query);

  if (!cleanQuery) {
    return {
      query: cleanQuery,
      results: []
    };
  }

  const exact = await resolveExactCitation(supabase, cleanQuery);
  const exactDocs = exact.documents || [];

  let metadataDocs = [];
  if (taxType) {
    const { data, error } = await supabase
      .from("tina_vector_store")
      .select("*")
      .or(`metadata->>taxType.eq.${taxType},metadata->>tax_type.eq.${taxType}`)
      .limit(Math.max(topK, 20));

    if (!error) {
      metadataDocs = data || [];
    }
  }

  let keywordDocs = [];
  {
    const tokens = tokenize(cleanQuery).filter((token) => token.length >= 3).slice(0, 8);

    if (tokens.length) {
      const orClause = tokens.map((token) => `text.ilike.%${token}%`).join(",");
      const { data, error } = await supabase
        .from("tina_vector_store")
        .select("*")
        .or(orClause)
        .limit(Math.max(topK, 20));

      if (!error) {
        keywordDocs = data || [];
      }
    }
  }

  let vectorDocs = [];
  if (vectorStore?.smartSearch) {
    try {
      vectorDocs = await vectorStore.smartSearch(cleanQuery, topK);
    } catch {
      if (vectorStore?.searchSimilar) {
        vectorDocs = await vectorStore.searchSimilar(cleanQuery, topK);
      }
    }
  }

  const merged = uniqueBy(
    [...exactDocs, ...metadataDocs, ...keywordDocs, ...(vectorDocs || [])],
    (doc) => buildDocIdentity(doc)
  );

  const scored = merged.map((doc) => {
    const textBlob = [
      doc.text,
      doc.source,
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.topic,
      doc.metadata?.taxType
    ]
      .filter(Boolean)
      .join(" ");

    const vectorScore = safeNumber(doc.score, 0);
    const keywordScore = computeKeywordScore(cleanQuery, textBlob);
    const tier = inferAuthorityTier(doc);
    const combinedScore = Math.max(vectorScore, keywordScore) * authorityWeight(tier);

    return {
      ...doc,
      score: vectorScore || keywordScore,
      keyword_score: keywordScore,
      authority_tier: tier,
      combined_score: combinedScore,
      question_type: questionType
    };
  });

  scored.sort((a, b) => {
    if (b.combined_score !== a.combined_score) {
      return b.combined_score - a.combined_score;
    }
    return inferAuthorityTier(a) - inferAuthorityTier(b);
  });

  return {
    query: cleanQuery,
    exactCitation: exact,
    results: scored.slice(0, topK)
  };
}

export function normalizeRetrievedEvidence(docs = []) {
  return docs.map((doc) => {
    const authorityTier = inferAuthorityTier(doc);
    const rawScore = safeNumber(doc.combined_score || doc.score || doc.keyword_score || 0, 0);

    return {
      id: buildDocIdentity(doc),
      vector_chunk_id: doc.id || doc.chunk_id || doc.metadata?.chunkId || null,
      topic: classifyEvidenceTopic(doc),
      text: safeString(doc.text),
      source_path: getDocPath(doc),
      source_title: getDocOriginalName(doc) || safeString(doc.source),
      section_label: safeString(doc.metadata?.sectionLabel || doc.metadata?.heading || ""),
      authority_tier: authorityTier,
      authority_label: inferAuthorityLabel(authorityTier),
      evidence_type: inferEvidenceType(doc),
      effective_date: inferEffectiveDate(doc),
      score: rawScore,
      raw: doc
    };
  });
}

export function detectEvidenceConflicts(evidence = []) {
  const conflicts = [];

  for (let i = 0; i < evidence.length; i += 1) {
    for (let j = i + 1; j < evidence.length; j += 1) {
      const result = compareEvidencePair(evidence[i], evidence[j]);
      if (result) {
        conflicts.push(result);
      }
    }
  }

  return uniqueBy(
    conflicts,
    (conflict) =>
      [
        conflict.conflict_topic,
        conflict.source_a_path,
        conflict.source_b_path,
        conflict.preferred_source_path
      ].join("|")
  );
}

export function rankEvidenceByAuthority(evidence = []) {
  return [...evidence].sort((a, b) => {
    const scoreDiff = safeNumber(b.score, 0) - safeNumber(a.score, 0);
    if (scoreDiff !== 0) return scoreDiff;

    const tierDiff = safeNumber(a.authority_tier, 99) - safeNumber(b.authority_tier, 99);
    if (tierDiff !== 0) return tierDiff;

    return safeString(a.source_path).localeCompare(safeString(b.source_path));
  });
}

export function buildClaimEvidenceMap(answerDraft, evidence = []) {
  const claims = extractTopClaims(answerDraft);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const combinedText = [
          item.text,
          item.source_title,
          item.source_path,
          item.section_label,
          item.topic
        ]
          .filter(Boolean)
          .join(" ");

        const evidenceScore = computeKeywordScore(claim, combinedText);

        return {
          claim_text: claim,
          support_status:
            evidenceScore >= 0.55
              ? "supported"
              : evidenceScore >= 0.25
                ? "partial"
                : "unsupported",
          source_path: item.source_path || null,
          source_title: item.source_title || null,
          vector_chunk_id: item.vector_chunk_id || null,
          authority_tier: item.authority_tier ?? null,
          evidence_score: Number(evidenceScore.toFixed(4))
        };
      })
      .sort((a, b) => b.evidence_score - a.evidence_score);

    return ranked[0] || {
      claim_text: claim,
      support_status: "unsupported",
      source_path: null,
      source_title: null,
      vector_chunk_id: null,
      authority_tier: null,
      evidence_score: 0
    };
  });
}

export async function synthesizeGroundedAnswer({
  openai,
  hookConfig,
  originalQuestion,
  cleanQuestion,
  topicData,
  questionType,
  evidence = [],
  conflicts = [],
  memoryContext = ""
}) {
  const topEvidence = rankEvidenceByAuthority(evidence).slice(0, 10);

  const context = topEvidence
    .map((item, index) => {
      return [
        `SOURCE ${index + 1}: ${item.source_title || "Untitled Source"}`,
        `PATH: ${item.source_path || "Unknown"}`,
        `AUTHORITY TIER: ${item.authority_tier} - ${item.authority_label}`,
        `SECTION: ${item.section_label || "N/A"}`,
        `SCORE: ${item.score}`,
        `TEXT:`,
        item.text || ""
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const systemPrompt = `
You are TINA, a Philippine tax research, compliance, education, and audit-risk assistant for Bong Corpuz & Co. CPAs.

ACTIVE HOOK MODE:
${hookConfig?.mode || "ASK"}

You must follow the ACTIVE HOOK MODE behavior strictly.

CORE BEHAVIOR:
- precise
- source-grounded
- conservative
- audit-defensible
- no hallucinations
- no unsupported legal conclusions

SOURCE AUTHORITY HIERARCHY:
Tier 1: NIRC / Tax Code
Tier 2: Revenue Regulations
Tier 3: Revenue Memorandum Circulars
Tier 4: Revenue Memorandum Orders
Tier 5: BIR Rulings
Tier 6: Court Cases
Tier 7: CPA Notes / Internal Notes

STRICT RULES:
1. Answer ONLY from the provided CONTEXT when indexed context is available.
2. Do NOT use general knowledge, assumptions, or memory to add legal bases not shown in CONTEXT.
3. Do NOT invent RR, RMC, RMO, BIR rulings, dates, sections, rates, forms, thresholds, deadlines, case doctrines, or citations.
4. If a specific issuance is asked and the exact issuance is not in CONTEXT, say: "No indexed document found for the requested issuance."
5. Prefer higher authority sources over lower authority sources.
6. If sources conflict, identify the conflict and prefer the higher authority source.
7. Use court cases as interpretative authority, not as substitute for statute/regulation unless the question asks about case doctrine.
8. Use CPA notes only as internal guidance, not primary authority.
9. Always cite exact filename/path shown in CONTEXT.
10. Do not mention ChatGPT.
11. Do not overstate certainty. State limitations clearly.
12. For computations, show formula only if the formula is found or reasonably derived from the context. If not, state that computation support is insufficient.
13. For audit-risk questions, separate legal basis, exposure, evidence needed, and recommended next steps.

MODE-SPECIFIC OUTPUT RULES:

ASK MODE:
Use:
Short Answer
Explanation
Practical Note
Confidence
Sources Used

TAX_EXPERT MODE:
Use:
Executive Answer
Issue
Applicable Source / Legal Basis
Analysis
Practical Compliance / Audit Implication
Recommended Action
Limitations
Confidence
Sources Used

SOURCE_FINDER MODE:
Use:
Best Matching Source
Document / Regulation / Case Title
Relevant Section or Keyword
Short Summary
Confidence
Sources Used
`.trim();

  const userPrompt = `
Conversation Memory:
${memoryContext || "No prior conversation."}

Hook:
${hookConfig?.hook_code || "/ask"}

Mode:
${hookConfig?.mode || "ASK"}

Topic Data:
${JSON.stringify(topicData || {})}

Original User Question:
${originalQuestion}

Clean Question:
${cleanQuestion}

Question Type:
${questionType}

Conflicts:
${
  conflicts.length
    ? conflicts
        .map((item, index) =>
          [
            `Conflict ${index + 1}: ${item.conflict_topic || "general"}`,
            `Source A: ${item.source_a_path || "N/A"}`,
            `Source B: ${item.source_b_path || "N/A"}`,
            `Reason: ${item.conflict_reason || "Potential contradiction"}`,
            `Preferred Source: ${item.preferred_source_path || "N/A"}`,
            `Resolution Basis: ${item.resolution_basis || "Prefer higher authority"}`
          ].join("\n")
        )
        .join("\n\n")
    : "No explicit conflicts detected."
}

CONTEXT:
${context}

Instruction:
Answer strictly using only the CONTEXT. Apply the source hierarchy and the active hook mode.
`.trim();

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

export async function saveReasoningRun(supabase, payload) {
  const record = {
    user_id: payload.userId || null,
    session_id: payload.sessionId || null,
    question: safeString(payload.question),
    normalized_question: safeString(payload.normalizedQuestion || ""),
    question_type: safeString(payload.questionType || ""),
    mode: safeString(payload.mode || ""),
    retrieval_status: safeString(payload.retrievalStatus || ""),
    reasoning_status: safeString(payload.reasoningStatus || ""),
    fallback_used: Boolean(payload.fallbackUsed),
    top_confidence:
      payload.topConfidence === null || payload.topConfidence === undefined
        ? null
        : Number(payload.topConfidence),
    answer_summary: safeString(payload.answerSummary || "")
  };

  const { data, error } = await supabase
    .from("tina_reasoning_runs")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(`saveReasoningRun failed: ${error.message}`);
  }

  return data;
}

export async function saveReasoningEvidence(supabase, payload) {
  const reasoningRunId = safeString(payload.reasoningRunId);
  const evidenceItems = Array.isArray(payload.evidence) ? payload.evidence : [];

  if (!reasoningRunId || !evidenceItems.length) {
    return [];
  }

  const rows = evidenceItems.map((item) => ({
    reasoning_run_id: reasoningRunId,
    claim_text: safeString(item.claim_text),
    support_status: safeString(item.support_status || "unsupported"),
    source_path: safeString(item.source_path || "") || null,
    source_title: safeString(item.source_title || "") || null,
    vector_chunk_id: item.vector_chunk_id || null,
    authority_tier:
      item.authority_tier === null || item.authority_tier === undefined
        ? null
        : Number(item.authority_tier),
    evidence_score:
      item.evidence_score === null || item.evidence_score === undefined
        ? null
        : Number(item.evidence_score)
  }));

  const { data, error } = await supabase
    .from("tina_reasoning_evidence")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`saveReasoningEvidence failed: ${error.message}`);
  }

  return data || [];
}

export async function saveReasoningConflicts(supabase, payload) {
  const reasoningRunId = safeString(payload.reasoningRunId);
  const conflictItems = Array.isArray(payload.conflicts) ? payload.conflicts : [];

  if (!reasoningRunId || !conflictItems.length) {
    return [];
  }

  const rows = conflictItems.map((item) => ({
    reasoning_run_id: reasoningRunId,
    conflict_topic: safeString(item.conflict_topic || "") || null,
    source_a_path: safeString(item.source_a_path || "") || null,
    source_b_path: safeString(item.source_b_path || "") || null,
    source_a_claim: safeString(item.source_a_claim || "") || null,
    source_b_claim: safeString(item.source_b_claim || "") || null,
    preferred_source_path: safeString(item.preferred_source_path || "") || null,
    conflict_reason: safeString(item.conflict_reason || "") || null,
    resolution_basis: safeString(item.resolution_basis || "") || null
  }));

  const { data, error } = await supabase
    .from("tina_source_conflicts")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`saveReasoningConflicts failed: ${error.message}`);
  }

  return data || [];
}
