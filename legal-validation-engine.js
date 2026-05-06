// FILE: legal-validation-engine.js

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function tokenize(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s/%₱().:-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
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

function normalizeLooseText(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/[^\w\s/%₱().:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStructuralLine(line = "") {
  const value = normalizeText(line);

  if (!value) return true;

  return [
    /^\d+\.\s*direct answer$/i,
    /^\d+\.\s*legal basis$/i,
    /^\d+\.\s*supporting rules$/i,
    /^\d+\.\s*professional insight$/i,
    /^\d+\.\s*conflict flag$/i,
    /^\d+\.\s*sources$/i,
    /^sources:?$/i,
    /^source:?$/i,
    /^references:?$/i,
    /^conflict detected:\s*(yes|no)$/i,
    /^controlling authority:/i,
    /^recommended action:/i,
    /^source a:/i,
    /^source b:/i,
    /^\-\s*\[(statute|rr|rmc|rmo|bir ruling|case|source)\]/i
  ].some((pattern) => pattern.test(value));
}

function extractClaims(answerText = "") {
  return normalizeText(answerText)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .filter((line) => !isStructuralLine(line))
    .slice(0, 15);
}

function extractRaNumbers(text = "") {
  const value = normalizeLooseText(text);
  return unique(
    [...value.matchAll(/\bra\s*(\d{4,6})\b/g)].map((match) => match[1])
  );
}

function extractIssuanceRefs(text = "") {
  const value = normalizeLooseText(text);
  const refs = [];

  const patterns = [
    { type: "rr", regex: /\brr\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmc", regex: /\brmc\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmo", regex: /\brmo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g }
  ];

  for (const { type, regex } of patterns) {
    for (const match of value.matchAll(regex)) {
      const year = String(match[2]).length === 2 ? `20${match[2]}` : String(match[2]);
      refs.push(`${type}-${match[1]}-${year}`);
    }
  }

  return unique(refs);
}

function extractNamedLawAnchors(text = "") {
  const value = normalizeLooseText(text);

  const anchors = [];

  const knownAnchors = [
    "create law",
    "create act",
    "train law",
    "train act",
    "create more",
    "eopt",
    "ease of paying taxes",
    "nirc",
    "local government code",
    "tax code",
    "vat",
    "value added tax",
    "income tax",
    "withholding tax",
    "excise tax",
    "documentary stamp tax"
  ];

  for (const anchor of knownAnchors) {
    if (value.includes(anchor)) {
      anchors.push(anchor);
    }
  }

  return unique(anchors);
}

function getDocAuthorityType(item = {}) {
  const path = normalizeLooseText(
    item.source_path ||
      item.path ||
      item.metadata?.path ||
      item.source ||
      item.source_title ||
      ""
  );

  const authorityType = normalizeLooseText(
    item.authority_type ||
      item.authorityType ||
      item.metadata?.authorityType ||
      ""
  );

  if (authorityType.includes("statute") || path.includes("01_tax_code")) return "statute";
  if (authorityType === "rr" || path.includes("02_revenue_regulations")) return "rr";
  if (authorityType.includes("rmc") || path.includes("03_rmc")) return "rmc";
  if (authorityType.includes("rmo") || path.includes("04_rmo")) return "rmo";
  if (authorityType.includes("bir ruling") || path.includes("05_bir_rulings")) return "bir_ruling";
  if (authorityType.includes("jurisprudence") || path.includes("06_court_cases")) return "case";

  return authorityType || "unknown";
}

function buildEvidenceText(item = {}) {
  return normalizeText(
    [
      item.text,
      item.source_title,
      item.source,
      item.path,
      item.metadata?.path,
      item.section_label,
      item.metadata?.documentTitle,
      item.metadata?.originalSource,
      item.metadata?.normalizedReference,
      ...(item.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildEvidenceIdentity(item = {}) {
  const combinedText = buildEvidenceText(item);

  return {
    authorityType: getDocAuthorityType(item),
    raNumbers: extractRaNumbers(combinedText),
    issuanceRefs: extractIssuanceRefs(combinedText),
    namedLawAnchors: extractNamedLawAnchors(combinedText)
  };
}

function scoreIdentityMatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  let bonus = 0;

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);
  const claimAnchors = extractNamedLawAnchors(claimText);

  for (const ra of claimRaNumbers) {
    if (identity.raNumbers.includes(ra)) {
      bonus += 0.6;
    }
  }

  for (const ref of claimIssuances) {
    if (identity.issuanceRefs.includes(ref)) {
      bonus += 0.65;
    }
  }

  for (const anchor of claimAnchors) {
    if (identity.namedLawAnchors.includes(anchor)) {
      bonus += 0.25;
    }
  }

  return Math.min(bonus, 1);
}

function penaltyForGenericMismatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimHasRa = extractRaNumbers(claimText).length > 0;
  const claimHasIssuance = extractIssuanceRefs(claimText).length > 0;
  const claimHasNamedLaw = extractNamedLawAnchors(claimText).length > 0;

  let penalty = 0;

  if (claimHasRa && identity.raNumbers.length === 0) {
    penalty += 0.25;
  }

  if (claimHasIssuance && identity.issuanceRefs.length === 0) {
    penalty += 0.3;
  }

  if (claimHasNamedLaw && identity.namedLawAnchors.length === 0) {
    penalty += 0.15;
  }

  return Math.min(penalty, 0.5);
}

function computeLegalSupportScore(claim = "", item = {}) {
  const combinedText = buildEvidenceText(item);

  const keywordScore = computeKeywordScore(claim, combinedText);
  const identityBonus = scoreIdentityMatch(claim, item);
  const mismatchPenalty = penaltyForGenericMismatch(claim, item);

  const rawScore = keywordScore + identityBonus - mismatchPenalty;
  const boundedScore = Math.max(0, Math.min(rawScore, 1));

  return Number(boundedScore.toFixed(4));
}

function classifySupportStatus(score = 0, claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);

  const exactRaMatch =
    claimRaNumbers.length > 0 &&
    claimRaNumbers.some((ra) => identity.raNumbers.includes(ra));

  const exactIssuanceMatch =
    claimIssuances.length > 0 &&
    claimIssuances.some((ref) => identity.issuanceRefs.includes(ref));

  if ((exactRaMatch || exactIssuanceMatch) && score >= 0.45) {
    return "supported";
  }

  if (score >= 0.72) {
    return "supported";
  }

  if (score >= 0.4) {
    return "partial";
  }

  return "unsupported";
}

function extractPrimaryAuthorityHints(text = "") {
  const normalized = normalizeLooseText(text);

  return {
    raNumbers: extractRaNumbers(normalized),
    issuanceRefs: extractIssuanceRefs(normalized),
    namedLawAnchors: extractNamedLawAnchors(normalized)
  };
}

function hasPrimaryAuthorityEvidence(evidence = [], queryHints = {}) {
  const { raNumbers = [], namedLawAnchors = [] } = queryHints;

  if (!evidence.length) return false;

  for (const item of evidence) {
    const identity = buildEvidenceIdentity(item);
    const authorityType = identity.authorityType;

    const statuteRaMatch =
      authorityType === "statute" &&
      raNumbers.length > 0 &&
      raNumbers.some((ra) => identity.raNumbers.includes(ra));

    if (statuteRaMatch) {
      return true;
    }

    if (
      authorityType === "statute" &&
      namedLawAnchors.length > 0 &&
      namedLawAnchors.some((anchor) => identity.namedLawAnchors.includes(anchor))
    ) {
      return true;
    }
  }

  return false;
}

export function buildClaimSupportMap(answerText = "", evidence = []) {
  const claims = extractClaims(answerText);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const evidenceScore = computeLegalSupportScore(claim, item);

        return {
          claimText: claim,
          supportStatus: classifySupportStatus(evidenceScore, claim, item),
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
          authorityType: getDocAuthorityType(item),
          evidenceScore
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
      authorityType: null,
      evidenceScore: 0
    };
  });
}

export function validateEvidenceSufficiency({
  evidence = [],
  claimSupportMap = [],
  minEvidenceCount = 1,
  minSupportedClaims = 1,
  minTopScore = 0.25,
  query = "",
  requirePrimaryAuthority = false
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

  const queryHints = extractPrimaryAuthorityHints(query);
  const primaryAuthorityPresent = hasPrimaryAuthorityEvidence(evidence, queryHints);

  const hasIdentitySensitiveQuery =
    queryHints.raNumbers.length > 0 || queryHints.namedLawAnchors.length > 0;

  const primaryAuthoritySatisfied =
    !requirePrimaryAuthority &&
    !hasIdentitySensitiveQuery
      ? true
      : primaryAuthorityPresent;

  return {
    isSufficient:
      evidence.length >= minEvidenceCount &&
      supportedClaims.length >= minSupportedClaims &&
      topScore >= minTopScore &&
      primaryAuthoritySatisfied,
    topScore,
    evidenceCount: evidence.length,
    supportedClaimCount: supportedClaims.length,
    supportedClaims,
    queryHints,
    primaryAuthorityPresent,
    primaryAuthorityRequired:
      requirePrimaryAuthority || hasIdentitySensitiveQuery
  };
}

export function shouldRejectForWeakLegalBasis({
  validation,
  hasExactCitation = false
}) {
  if (!validation) return true;

  if (validation.primaryAuthorityRequired && !validation.primaryAuthorityPresent) {
    return true;
  }

  if (hasExactCitation && validation.primaryAuthorityPresent) {
    return false;
  }

  return !validation.isSufficient;
}

export function buildNoSourceReply() {
  return "This may require verification against the latest BIR issuance. Please consult the BIR website or a licensed CPA.";
}
