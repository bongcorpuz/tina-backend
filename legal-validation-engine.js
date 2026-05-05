// FILE: legal-validation-engine.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
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

function extractClaims(answerText = "") {
  return normalizeText(answerText)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .slice(0, 15);
}

export function buildClaimSupportMap(answerText = "", evidence = []) {
  const claims = extractClaims(answerText);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const combinedText = [
          item.text,
          item.source_title,
          item.source,
          item.path,
          item.metadata?.path,
          item.section_label
        ]
          .filter(Boolean)
          .join(" ");

        const evidenceScore = computeKeywordScore(claim, combinedText);

        return {
          claimText: claim,
          supportStatus:
            evidenceScore >= 0.55
              ? "supported"
              : evidenceScore >= 0.25
                ? "partial"
                : "unsupported",
          sourcePath:
            item.source_path ||
            item.path ||
            item.metadata?.path ||
            item.source ||
            null,
          sourceTitle:
            item.source_title ||
            item.metadata?.documentTitle ||
            item.source ||
            null,
          vectorChunkId:
            item.vector_chunk_id ||
            item.id ||
            null,
          authorityTier:
            item.authority_tier ||
            item.authorityLevel ||
            item.metadata?.authorityLevel ||
            null,
          evidenceScore: Number(evidenceScore.toFixed(4))
        };
      })
      .sort((a, b) => b.evidenceScore - a.evidenceScore);

    return ranked[0] || {
      claimText: claim,
      supportStatus: "unsupported",
      sourcePath: null,
      sourceTitle: null,
      vectorChunkId: null,
      authorityTier: null,
      evidenceScore: 0
    };
  });
}

export function validateEvidenceSufficiency({
  evidence = [],
  claimSupportMap = [],
  minEvidenceCount = 1,
  minSupportedClaims = 1,
  minTopScore = 0.25
}) {
  const supportedClaims = claimSupportMap.filter(
    (item) => item.supportStatus === "supported" || item.supportStatus === "partial"
  );

  const topScore =
    evidence.length > 0
      ? Math.max(
          ...evidence.map((item) =>
            Number(item.finalScore || item.score || item.evidenceScore || 0)
          )
        )
      : 0;

  return {
    isSufficient:
      evidence.length >= minEvidenceCount &&
      supportedClaims.length >= minSupportedClaims &&
      topScore >= minTopScore,
    topScore,
    evidenceCount: evidence.length,
    supportedClaimCount: supportedClaims.length,
    supportedClaims
  };
}

export function shouldRejectForWeakLegalBasis({
  validation,
  hasExactCitation = false
}) {
  if (!validation) return true;
  if (hasExactCitation) return false;
  return !validation.isSufficient;
}

export function buildNoSourceReply() {
  return "I cannot find this in the uploaded knowledge base.";
}
