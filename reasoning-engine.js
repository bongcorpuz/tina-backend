// FILE: reasoning-engine.js

import {
  AUTHORITY_LABEL,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict
} from "./conflict-engine.js";

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
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
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
      doc.source_path ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.original_source ||
      doc.source
  );
}

function getDocOriginalName(doc = {}) {
  return safeString(
    doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.original_source ||
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

function getAuthorityType(doc = {}) {
  return (
    doc.authority_type ||
    doc.authorityType ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc({
      source: doc.source || doc.originalSource || "",
      originalSource: doc.originalSource || "",
      path: getDocPath(doc),
      metadata: doc.metadata || {},
      text: doc.text || ""
    }) ||
    classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || "",
      path: getDocPath(doc),
      text: doc.text || ""
    })
  );
}

function inferAuthorityTier(doc = {}) {
  const explicitTier =
    doc.authority_tier ??
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    doc.metadata?.authorityTier ??
    doc.sourceTier?.tier;

  if (Number.isFinite(Number(explicitTier))) {
    return Number(explicitTier);
  }

  return getAuthorityLevelForDoc({
    ...doc,
    path: getDocPath(doc),
    metadata: doc.metadata || {}
  });
}

function inferControllingPrecedence(doc = {}) {
  const explicit =
    doc.controlling_precedence ??
    doc.controllingPrecedence ??
    doc.metadata?.controllingPrecedence;

  if (Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  return getControllingPrecedenceForDoc({
    ...doc,
    path: getDocPath(doc),
    metadata: doc.metadata || {}
  });
}

function authorityWeight(tier = 99) {
  if (tier <= 2) return 1.0;
  if (tier <= 3) return 0.97;
  if (tier <= 7) return 0.94;
  if (tier <= 8) return 0.9;
  if (tier <= 11) return 0.78;
  if (tier === 12) return 0.72;
  if (tier === 13) return 0.62;
  return 0.35;
}

function inferAuthorityLabel(tier = 99, doc = {}) {
  const authorityType = getAuthorityType(doc);

  return (
    AUTHORITY_LABEL[authorityType] ||
    AUTHORITY_LABEL.SECONDARY ||
    "Unclassified Source"
  );
}

function inferEvidenceType(doc = {}) {
  const authorityType = getAuthorityType(doc);

  if (["CONSTITUTION", "STATUTE", "TREATY"].includes(authorityType)) {
    return "primary";
  }

  if (["RR", "RMC", "RMO", "RAMO", "BIR_RULING", "LGU"].includes(authorityType)) {
    return "administrative";
  }

  if (
    [
      "SUPREME_COURT",
      "CTA_EN_BANC",
      "COURT_OF_APPEALS",
      "CTA_DIVISION"
    ].includes(authorityType)
  ) {
    return "jurisprudence";
  }

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

function isCourtAuthority(authorityType = "") {
  return [
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(authorityType);
}

function isBIRAuthority(authorityType = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityType);
}

function buildConflictResolutionBasis(aType = "", bType = "", override = null) {
  if (override?.overrideApplies) {
    return override.reason || "Court decision prevails over conflicting BIR issuance.";
  }

  if (
    (isCourtAuthority(aType) && isBIRAuthority(bType)) ||
    (isCourtAuthority(bType) && isBIRAuthority(aType))
  ) {
    return "Court decision prevails over conflicting BIR issuance.";
  }

  return `Prefer ${
    override?.winningAuthority || aType || bType || "higher authority"
  } based on controlling authority hierarchy.`;
}

function compareEvidencePair(a, b) {
  const sameTopic = classifyEvidenceTopic(a) === classifyEvidenceTopic(b);
  if (!sameTopic) return null;

  const docA = a.raw || a;
  const docB = b.raw || b;

  const textA = lower(a.text || a.claim_text || "");
  const textB = lower(b.text || b.claim_text || "");

  if (!textA || !textB) return null;
  if (textA === textB) return null;

  if (!isGenuineConflict(docA, docB)) {
    return null;
  }

  const aType = getAuthorityType(docA);
  const bType = getAuthorityType(docB);

  const override = resolveCourtOverride(docA, docB);

  const preferred = override?.winningSource
    ? override.winningSource === docA
      ? a
      : b
    : inferControllingPrecedence(docA) <= inferControllingPrecedence(docB)
      ? a
      : b;

  const overridden = preferred === a ? b : a;

  return {
    conflict_topic: classifyEvidenceTopic(a),
    source_a_path: getDocPath(docA),
    source_b_path: getDocPath(docB),
    source_a_claim: safeString(a.text || a.claim_text).slice(0, 500),
    source_b_claim: safeString(b.text || b.claim_text).slice(0, 500),
    source_a_type: aType,
    source_b_type: bType,
    preferred_source_path: getDocPath(preferred.raw || preferred),
    overridden_source_path: getDocPath(overridden.raw || overridden),
    controlling_authority:
      override?.winningAuthority || getAuthorityType(preferred.raw || preferred),
    overridden_authority:
      override?.overriddenAuthority || getAuthorityType(overridden.raw || overridden),
    override_applied: Boolean(override?.overrideApplies),
    conflict_reason: override?.reason
      ? override.reason
      : "Genuine contradiction detected between sources on the same issue.",
    resolution_basis: buildConflictResolutionBasis(aType, bType, override),
    audit_record: override
      ? {
          overrideApplied: Boolean(override.overrideApplies),
          winningAuthority: override.winningAuthority || null,
          overriddenAuthority: override.overriddenAuthority || null,
          winningSource: getDocPath(override.winningSource || {}),
          overriddenSource: getDocPath(override.overriddenSource || {})
        }
      : null
  };
}

function extractTopClaims(answerDraft = "") {
  return safeString(answerDraft)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .slice(0, 12);
}

function buildCitationCandidates(normalized) {
  const raw = safeString(normalized.raw);
  const aliases = Array.isArray(normalized.aliases) ? normalized.aliases : [];

  return uniqueBy(
    [normalized.normalized, raw, ...aliases]
      .filter(Boolean)
      .map((value) => safeString(value)),
    (value) => value.toLowerCase()
  );
}

function escapeIlikeValue(value = "") {
  return safeString(value).replace(/[%,'"]/g, " ").trim();
}

function buildExactCitationOrClauses(candidateStrings = []) {
  const clauses = [];

  for (const value of candidateStrings) {
    const rawValue = escapeIlikeValue(value);
    const normalizedValue = escapeIlikeValue(normalizeForMatch(value));

    if (!rawValue && !normalizedValue) continue;

    if (rawValue) {
      clauses.push(`source.ilike.%${rawValue}%`);
      clauses.push(`original_source.ilike.%${rawValue}%`);
      clauses.push(`metadata->>path.ilike.%${rawValue}%`);
      clauses.push(`metadata->>originalSource.ilike.%${rawValue}%`);
      clauses.push(`metadata->>originalFileName.ilike.%${rawValue}%`);
    }

    if (normalizedValue) {
      clauses.push(`source.ilike.%${normalizedValue}%`);
      clauses.push(`original_source.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>path.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>originalSource.ilike.%${normalizedValue}%`);
      clauses.push(`metadata->>originalFileName.ilike.%${normalizedValue}%`);
      clauses.push(`normalized_reference.ilike.%${normalizedValue}%`);
    }
  }

  return uniqueBy(clauses, (item) => item);
}

export async function resolveExactCitation(supabase, query) {
  const cleanQuery = safeString(query);
  const normalized = normalizeLegalReference(cleanQuery);

  if (!normalized.type) {
    return {
      matched: false,
      query: cleanQuery,
      citation: null,
      documents: []
    };
  }

  const candidateStrings = buildCitationCandidates(normalized);
  const sourceOrClauses = buildExactCitationOrClauses(candidateStrings);

  if (!sourceOrClauses.length) {
    return {
      matched: false,
      query: cleanQuery,
      citation: {
        normalizedReference: normalized.normalized,
        type: normalized.type,
        aliases: normalized.aliases || []
      },
      documents: []
    };
  }

  const { data, error } = await supabase
    .from("tina_vector_store")
    .select("*")
    .or(sourceOrClauses.join(","))
    .limit(40);

  if (error) {
    throw new Error(`resolveExactCitation failed: ${error.message}`);
  }

  const normalizedNeedle = safeString(normalized.normalized).toLowerCase();

  const documents = (data || []).filter((doc) => {
    const haystack = [
      doc.source,
      doc.original_source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.path,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.normalizedReference,
      ...(doc.normalizedAliases || []),
      ...(doc.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .map((value) => normalizeForMatch(String(value)))
      .join(" ");

    const aliasHit = candidateStrings
      .map((candidate) => normalizeForMatch(candidate))
      .some((candidate) => candidate && haystack.includes(candidate));

    const normalizedReference = normalizeForMatch(
      doc.normalizedReference ||
        doc.normalized_reference ||
        doc.metadata?.normalizedReference ||
        ""
    );

    return (
      aliasHit ||
      (normalizedNeedle &&
        normalizedReference.includes(normalizeForMatch(normalizedNeedle)))
    );
  });

  return {
    matched: documents.length > 0,
    query: cleanQuery,
    citation: {
      normalizedReference: normalized.normalized,
      type: normalized.type,
      aliases: normalized.aliases || []
    },
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

  const tokens = tokenize(cleanQuery)
    .filter((token) => token.length >= 3)
    .slice(0, 8);

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
      doc.original_source,
      doc.originalSource,
      doc.path,
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
    const citationBoost = exactDocs.some((exactDoc) => buildDocIdentity(exactDoc) === buildDocIdentity(doc))
      ? 1.25
      : 1;

    const combinedScore =
      Math.max(vectorScore, keywordScore) *
      authorityWeight(tier) *
      citationBoost;

    return {
      ...doc,
      score: vectorScore || keywordScore,
      keyword_score: keywordScore,
      authority_tier: tier,
      authority_type: getAuthorityType(doc),
      controlling_precedence: inferControllingPrecedence(doc),
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
    const authorityType = getAuthorityType(doc);
    const rawScore = safeNumber(
      doc.combined_score || doc.score || doc.keyword_score || 0,
      0
    );

    return {
      id: buildDocIdentity(doc),
      vector_chunk_id: doc.id || doc.chunk_id || doc.metadata?.chunkId || null,
      topic: classifyEvidenceTopic(doc),
      text: safeString(doc.text),
      source_path: getDocPath(doc),
      source_title: getDocOriginalName(doc) || safeString(doc.source),
      section_label: safeString(
        doc.metadata?.sectionLabel || doc.metadata?.heading || ""
      ),
      authority_tier: authorityTier,
      authority_type: authorityType,
      authority_label: inferAuthorityLabel(authorityTier, doc),
      controlling_precedence: inferControllingPrecedence(doc),
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
      if (result) conflicts.push(result);
    }
  }

  return uniqueBy(
    conflicts,
    (conflict) =>
      [
        conflict.conflict_topic,
        conflict.source_a_path,
        conflict.source_b_path,
        conflict.preferred_source_path,
        conflict.overridden_source_path,
        conflict.controlling_authority
      ].join("|")
  );
}

export function rankEvidenceByAuthority(evidence = []) {
  return [...evidence].sort((a, b) => {
    const aTier = safeNumber(a.authority_tier, 99);
    const bTier = safeNumber(b.authority_tier, 99);

    if (aTier !== bTier) return aTier - bTier;

    const scoreDiff = safeNumber(b.score, 0) - safeNumber(a.score, 0);
    if (scoreDiff !== 0) return scoreDiff;

    const aPrecedence = safeNumber(a.controlling_precedence, 99);
    const bPrecedence = safeNumber(b.controlling_precedence, 99);

    if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

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
          authority_type: item.authority_type ?? null,
          evidence_score: Number(evidenceScore.toFixed(4))
        };
      })
      .sort((a, b) => b.evidence_score - a.evidence_score);

    return (
      ranked[0] || {
        claim_text: claim,
        support_status: "unsupported",
        source_path: null,
        source_title: null,
        vector_chunk_id: null,
        authority_tier: null,
        authority_type: null,
        evidence_score: 0
      }
    );
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
        `AUTHORITY: ${item.authority_label || "Unknown"} (Tier ${item.authority_tier})`,
        `CONTROLLING PRECEDENCE: ${item.controlling_precedence ?? 99}`,
        `SECTION: ${item.section_label || "N/A"}`,
        `SCORE: ${item.score}`,
        "TEXT:",
        item.text || ""
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const systemPrompt = `
You are TINA (Tax Intelligence and Analysis), an expert Philippine tax researcher and analyst for Bong Corpuz & Co. CPAs.

ACTIVE HOOK MODE:
${hookConfig?.mode || "ASK"}

CORE BEHAVIOR:
- precise
- source-grounded
- conservative
- audit-defensible
- no hallucinations
- no unsupported legal conclusions

RETRIEVAL HIERARCHY:
1. 1987 Constitution
2. NIRC / Tax Code / Republic Acts amending tax law
3. Revenue Regulations
4. Revenue Memorandum Circulars
5. Revenue Memorandum Orders
6. Revenue Audit Memorandum Orders
7. BIR Rulings
8. Supreme Court decisions
9. CTA En Banc decisions
10. Court of Appeals decisions
11. CTA Division decisions
12. Tax Treaties / LGU ordinances / Secondary materials as applicable

CONFLICT RESOLUTION:
- Constitution and statutes control administrative issuances.
- If a court decision genuinely conflicts with a BIR issuance, the court ruling controls.
- Do not claim a conflict unless the conflict is specific and visible in the provided context.

STRICT RULES:
1. Answer ONLY from the provided CONTEXT when indexed context is available.
2. Do NOT use general knowledge, assumptions, or memory to add legal bases not shown in CONTEXT.
3. Do NOT invent RR, RMC, RMO, RAMO, BIR rulings, dates, sections, rates, forms, thresholds, deadlines, case doctrines, or citations.
4. If a specific issuance is asked and the exact issuance is not in CONTEXT, say: "No indexed document found for the requested issuance."
5. Prefer TINA retrieval hierarchy for source organization.
6. Use controlling legal precedence only for actual conflict resolution.
7. Use exact filenames/path shown in CONTEXT only.
8. Do not mention ChatGPT.
9. Do not overstate certainty. State limitations clearly.
10. For computations, show formula only if found or reasonably derived from the context.
11. Use exact thresholds and dates when visible; do not paraphrase loosely.

RESPONSE FORMAT:
1. DIRECT ANSWER
2. LEGAL BASIS
3. SUPPORTING RULES
4. PROFESSIONAL INSIGHT
5. CONFLICT FLAG
6. SOURCES
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
            `Source A: ${item.source_a_path || "N/A"} (${item.source_a_type || "Unknown"})`,
            `Source B: ${item.source_b_path || "N/A"} (${item.source_b_type || "Unknown"})`,
            `Reason: ${item.conflict_reason || "Potential contradiction"}`,
            `Preferred Source: ${item.preferred_source_path || "N/A"}`,
            item.overridden_source_path
              ? `Overridden Source: ${item.overridden_source_path}`
              : null,
            item.override_applied !== undefined
              ? `Court Override Applied: ${item.override_applied ? "YES" : "NO"}`
              : null,
            `Resolution Basis: ${item.resolution_basis || "Prefer higher authority"}`
          ]
            .filter(Boolean)
            .join("\n")
        )
        .join("\n\n")
    : "No explicit conflicts detected."
}

CONTEXT:
${context}

Instruction:
Answer strictly using only the CONTEXT. Apply the TINA hierarchy for source organization and controlling legal precedence only for actual conflicts.
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

  if (!reasoningRunId || !evidenceItems.length) return [];

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

  if (!reasoningRunId || !conflictItems.length) return [];

  const rows = conflictItems.map((item) => {
    const resolutionSuffix = [
      item.override_applied !== undefined
        ? `override_applied=${item.override_applied ? "yes" : "no"}`
        : null,
      item.controlling_authority
        ? `controlling_authority=${item.controlling_authority}`
        : null,
      item.overridden_authority
        ? `overridden_authority=${item.overridden_authority}`
        : null
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      reasoning_run_id: reasoningRunId,
      conflict_topic: safeString(item.conflict_topic || "") || null,
      source_a_path: safeString(item.source_a_path || "") || null,
      source_b_path: safeString(item.source_b_path || "") || null,
      source_a_claim: safeString(item.source_a_claim || "") || null,
      source_b_claim: safeString(item.source_b_claim || "") || null,
      preferred_source_path:
        safeString(item.preferred_source_path || "") || null,
      conflict_reason: safeString(item.conflict_reason || "") || null,
      resolution_basis:
        safeString(item.resolution_basis || "") +
          (resolutionSuffix ? ` | ${resolutionSuffix}` : "") || null
    };
  });

  const { data, error } = await supabase
    .from("tina_source_conflicts")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(`saveReasoningConflicts failed: ${error.message}`);
  }

  return data || [];
}
