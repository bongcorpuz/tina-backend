// FILE: legal-validation-engine.js

import { classifyAuthorityFromDocument, AUTHORITY_LEVEL } from "./authority-engine.js";
import { detectNamedLaw } from "./named-law-engine.js";

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

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
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
    /^issue$/i,
    /^applicable law(?:\s*\(.*\))?$/i,
    /^bir position$/i,
    /^court position$/i,
    /^legally defensible conclusion$/i,
    /^taxpayer risk assessment$/i,
    /^recommended action$/i,
    /^sources:?$/i,
    /^source:?$/i,
    /^references:?$/i,
    /^conflict detected:\s*(yes|no)$/i,
    /^controlling authority:/i,
    /^recommended action:/i,
    /^source a:/i,
    /^source b:/i,
    /^contradiction:/i,
    /^\-\s*\[(constitution|statute|treaty|supreme court|cta en banc|court of appeals|cta division|rr|rmc|rmo|ramo|bir ruling|case|source)\]/i
  ].some((pattern) => pattern.test(value));
}

function looksLikeSourceBullet(line = "") {
  const value = normalizeText(line);

  return [
    /^\-\s*(ra|rr|rmc|rmo|ramo|bir ruling|g\.r\.|cta|ca-g\.r\.)/i,
    /^\d+\.\s*(ra|rr|rmc|rmo|ramo|bir ruling|g\.r\.|cta|ca-g\.r\.)/i
  ].some((pattern) => pattern.test(value));
}

function extractClaims(answerText = "") {
  return normalizeText(answerText)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.endsWith(":"))
    .filter((line) => !isStructuralLine(line))
    .filter((line) => !looksLikeSourceBullet(line))
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
    { type: "rmo", regex: /\brmo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "ramo", regex: /\bramo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g }
  ];

  for (const { type, regex } of patterns) {
    for (const match of value.matchAll(regex)) {
      refs.push(
        `${type}-${String(match[1]).replace(/^0+/, "")}-${normalizeYear(match[2])}`
      );
    }
  }

  return unique(refs);
}

function extractCourtRefs(text = "") {
  const value = normalizeText(text);
  const refs = [];

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    refs.push(`gr-${String(match[1]).toUpperCase()}`);
  }

  const ctaMatches = [
    ...value.matchAll(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/gi),
    ...value.matchAll(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/gi)
  ];

  for (const match of ctaMatches) {
    refs.push(`cta-${String(match[1]).toUpperCase()}`);
  }

  for (const match of value.matchAll(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    refs.push(`ca-${String(match[1]).toUpperCase()}`);
  }

  return unique(refs);
}

function extractNamedLawAnchors(text = "") {
  const value = normalizeLooseText(text);
  const detection = detectNamedLaw(text);
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
    if (value.includes(anchor)) anchors.push(anchor);
  }

  if (detection?.bestMatch) {
    if (detection.bestMatch.shortTitle) {
      anchors.push(normalizeLooseText(detection.bestMatch.shortTitle));
    }
    if (detection.bestMatch.canonicalTitle) {
      anchors.push(normalizeLooseText(detection.bestMatch.canonicalTitle));
    }
    for (const alias of detection.bestMatch.aliases || []) {
      anchors.push(normalizeLooseText(alias));
    }
    for (const alias of detection.bestMatch.normalizedAliases || []) {
      anchors.push(normalizeLooseText(alias));
    }
  }

  return unique(anchors);
}

function normalizeAuthorityType(type = "") {
  const value = normalizeLooseText(type);

  if (!value) return "unknown";
  if (value.includes("constitution")) return "constitution";
  if (value.includes("statute")) return "statute";
  if (value.includes("treaty")) return "treaty";
  if (value.includes("supreme court")) return "supreme_court";
  if (value.includes("cta en banc")) return "cta_en_banc";
  if (value.includes("court of appeals")) return "court_of_appeals";
  if (value.includes("cta division")) return "cta_division";
  if (value === "rr" || value.includes("revenue regulation")) return "rr";
  if (value === "rmc" || value.includes("revenue memorandum circular")) return "rmc";
  if (value === "rmo" || value.includes("revenue memorandum order")) return "rmo";
  if (value === "ramo" || value.includes("revenue audit memorandum order")) return "ramo";
  if (value.includes("bir ruling")) return "bir_ruling";
  if (value.includes("lgu")) return "lgu";
  if (value.includes("secondary") || value.includes("source")) return "secondary";

  return value || "unknown";
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

  const explicit = normalizeAuthorityType(
    item.authority_type ||
      item.authorityType ||
      item.metadata?.authorityType ||
      ""
  );

  if (explicit !== "unknown") return explicit;

  const inferred = classifyAuthorityFromDocument({
    fileName: item.source_title || item.source || "",
    path: item.source_path || item.path || item.metadata?.path || "",
    text: item.text || ""
  });

  if (inferred) return normalizeAuthorityType(inferred);

  if (path.includes("00_constitution")) return "constitution";
  if (path.includes("01_tax_code")) return "statute";
  if (path.includes("02_revenue_regulations")) return "rr";
  if (path.includes("03_rmc")) return "rmc";
  if (path.includes("04b_ramo")) return "ramo";
  if (path.includes("04_rmo")) return "rmo";
  if (path.includes("05_bir_rulings")) return "bir_ruling";
  if (path.includes("05b_tax_treaties")) return "treaty";
  if (path.includes("06_court_cases")) return "supreme_court";

  return "unknown";
}

function getDocAuthorityLevel(item = {}) {
  const explicit =
    item.authority_tier ||
    item.authorityLevel ||
    item.authority_level ||
    item.metadata?.authorityLevel ||
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  const normalizedType = normalizeAuthorityType(getDocAuthorityType(item));

  const mapped = {
    constitution: AUTHORITY_LEVEL.CONSTITUTION,
    statute: AUTHORITY_LEVEL.STATUTE,
    rr: AUTHORITY_LEVEL.RR,
    rmc: AUTHORITY_LEVEL.RMC,
    rmo: AUTHORITY_LEVEL.RMO,
    ramo: AUTHORITY_LEVEL.RAMO,
    bir_ruling: AUTHORITY_LEVEL.BIR_RULING,
    supreme_court: AUTHORITY_LEVEL.SUPREME_COURT,
    cta_en_banc: AUTHORITY_LEVEL.CTA_EN_BANC,
    court_of_appeals: AUTHORITY_LEVEL.COURT_OF_APPEALS,
    cta_division: AUTHORITY_LEVEL.CTA_DIVISION,
    treaty: AUTHORITY_LEVEL.TREATY,
    lgu: AUTHORITY_LEVEL.LGU
  };

  return mapped[normalizedType] || 99;
}

function buildEvidenceText(item = {}) {
  return normalizeText(
    [
      item.text,
      item.source_title,
      item.sourceTitle,
      item.source,
      item.path,
      item.source_path,
      item.metadata?.path,
      item.section_label,
      item.metadata?.documentTitle,
      item.metadata?.originalSource,
      item.metadata?.originalFileName,
      item.metadata?.normalizedReference,
      item.normalizedReference,
      item.normalized_reference,
      ...(item.normalizedAliases || []),
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
    authorityLevel: getDocAuthorityLevel(item),
    raNumbers: extractRaNumbers(combinedText),
    issuanceRefs: extractIssuanceRefs(combinedText),
    courtRefs: extractCourtRefs(combinedText),
    namedLawAnchors: extractNamedLawAnchors(combinedText)
  };
}

function scoreIdentityMatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  let bonus = 0;

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);
  const claimCourtRefs = extractCourtRefs(claim);
  const claimAnchors = extractNamedLawAnchors(claimText);

  for (const ra of claimRaNumbers) {
    if (identity.raNumbers.includes(ra)) bonus += 0.6;
  }

  for (const ref of claimIssuances) {
    if (identity.issuanceRefs.includes(ref)) bonus += 0.65;
  }

  for (const ref of claimCourtRefs) {
    if (identity.courtRefs.includes(ref)) bonus += 0.7;
  }

  for (const anchor of claimAnchors) {
    if (identity.namedLawAnchors.includes(anchor)) bonus += 0.25;
  }

  return Math.min(bonus, 1);
}

function penaltyForGenericMismatch(claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimHasRa = extractRaNumbers(claimText).length > 0;
  const claimHasIssuance = extractIssuanceRefs(claimText).length > 0;
  const claimHasCourtRef = extractCourtRefs(claim).length > 0;
  const claimHasNamedLaw = extractNamedLawAnchors(claimText).length > 0;

  let penalty = 0;

  if (claimHasRa && identity.raNumbers.length === 0) penalty += 0.25;
  if (claimHasIssuance && identity.issuanceRefs.length === 0) penalty += 0.3;
  if (claimHasCourtRef && identity.courtRefs.length === 0) penalty += 0.35;
  if (claimHasNamedLaw && identity.namedLawAnchors.length === 0) penalty += 0.15;

  return Math.min(penalty, 0.6);
}

function computeLegalSupportScore(claim = "", item = {}) {
  const combinedText = buildEvidenceText(item);
  const keywordScore = computeKeywordScore(claim, combinedText);
  const identityBonus = scoreIdentityMatch(claim, item);
  const mismatchPenalty = penaltyForGenericMismatch(claim, item);

  return Number(Math.max(0, Math.min(keywordScore + identityBonus - mismatchPenalty, 1)).toFixed(4));
}

function classifySupportStatus(score = 0, claim = "", item = {}) {
  const claimText = normalizeLooseText(claim);
  const identity = buildEvidenceIdentity(item);

  const claimRaNumbers = extractRaNumbers(claimText);
  const claimIssuances = extractIssuanceRefs(claimText);
  const claimCourtRefs = extractCourtRefs(claim);

  const exactRaMatch =
    claimRaNumbers.length > 0 &&
    claimRaNumbers.some((ra) => identity.raNumbers.includes(ra));

  const exactIssuanceMatch =
    claimIssuances.length > 0 &&
    claimIssuances.some((ref) => identity.issuanceRefs.includes(ref));

  const exactCourtMatch =
    claimCourtRefs.length > 0 &&
    claimCourtRefs.some((ref) => identity.courtRefs.includes(ref));

  if ((exactRaMatch || exactIssuanceMatch || exactCourtMatch) && score >= 0.45) {
    return "supported";
  }

  if (score >= 0.72) return "supported";
  if (score >= 0.4) return "partial";

  return "unsupported";
}

function extractPrimaryAuthorityHints(text = "") {
  const normalized = normalizeLooseText(text);
  const namedLaw = detectNamedLaw(text);

  return {
    raNumbers: extractRaNumbers(normalized),
    issuanceRefs: extractIssuanceRefs(normalized),
    courtRefs: extractCourtRefs(text),
    namedLawAnchors: extractNamedLawAnchors(normalized),
    namedLaw
  };
}

function isStatutoryAuthorityType(type = "") {
  return ["constitution", "statute"].includes(normalizeAuthorityType(type));
}

function isCourtAuthorityType(type = "") {
  return [
    "supreme_court",
    "cta_en_banc",
    "court_of_appeals",
    "cta_division"
  ].includes(normalizeAuthorityType(type));
}

function isAdministrativeAuthorityType(type = "") {
  return ["rr", "rmc", "rmo", "ramo", "bir_ruling"].includes(
    normalizeAuthorityType(type)
  );
}

function isControllingOrUsableAuthorityType(type = "") {
  return (
    isStatutoryAuthorityType(type) ||
    isAdministrativeAuthorityType(type) ||
    isCourtAuthorityType(type) ||
    ["treaty", "lgu"].includes(normalizeAuthorityType(type))
  );
}

function hasPrimaryAuthorityEvidence(evidence = [], queryHints = {}) {
  const {
    raNumbers = [],
    namedLawAnchors = [],
    courtRefs = [],
    issuanceRefs = []
  } = queryHints;

  if (!evidence.length) return false;

  for (const item of evidence) {
    const identity = buildEvidenceIdentity(item);
    const authorityType = normalizeAuthorityType(identity.authorityType);

    const statuteRaMatch =
      authorityType === "statute" &&
      raNumbers.length > 0 &&
      raNumbers.some((ra) => identity.raNumbers.includes(ra));

    if (statuteRaMatch) return true;

    const namedLawStatuteMatch =
      authorityType === "statute" &&
      namedLawAnchors.length > 0 &&
      namedLawAnchors.some((anchor) => identity.namedLawAnchors.includes(anchor));

    if (namedLawStatuteMatch) return true;

    const courtMatch =
      isCourtAuthorityType(authorityType) &&
      courtRefs.length > 0 &&
      courtRefs.some((ref) => identity.courtRefs.includes(ref));

    if (courtMatch) return true;

    const issuanceMatch =
      isAdministrativeAuthorityType(authorityType) &&
      issuanceRefs.length > 0 &&
      issuanceRefs.some((ref) => identity.issuanceRefs.includes(ref));

    if (issuanceMatch) return true;

    if (
      authorityType === "constitution" &&
      !raNumbers.length &&
      !namedLawAnchors.length &&
      !courtRefs.length &&
      !issuanceRefs.length
    ) {
      return true;
    }
  }

  return false;
}

function hasAtLeastOneControllingSource(evidence = []) {
  return evidence.some((item) =>
    isControllingOrUsableAuthorityType(getDocAuthorityType(item))
  );
}

export function buildClaimSupportMap(answerText = "", evidence = []) {
  const claims = extractClaims(answerText);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const evidenceScore = computeLegalSupportScore(claim, item);

        return {
          claimText: claim,
          claim_text: claim,
          supportStatus: classifySupportStatus(evidenceScore, claim, item),
          support_status: classifySupportStatus(evidenceScore, claim, item),
          sourcePath:
            item.source_path ||
            item.path ||
            item.metadata?.path ||
            item.source ||
            null,
          source_path:
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
          source_title:
            item.source_title ||
            item.metadata?.documentTitle ||
            item.source ||
            null,
          vectorChunkId: item.vector_chunk_id || item.id || null,
          vector_chunk_id: item.vector_chunk_id || item.id || null,
          authorityTier:
            item.authority_tier ||
            item.authorityLevel ||
            item.authority_level ||
            item.metadata?.authorityLevel ||
            null,
          authority_tier:
            item.authority_tier ||
            item.authorityLevel ||
            item.authority_level ||
            item.metadata?.authorityLevel ||
            null,
          authorityType: getDocAuthorityType(item),
          authority_type: getDocAuthorityType(item),
          evidenceScore,
          evidence_score: evidenceScore
        };
      })
      .sort((a, b) => {
        if (b.evidenceScore !== a.evidenceScore) {
          return b.evidenceScore - a.evidenceScore;
        }

        return getDocAuthorityLevel(a) - getDocAuthorityLevel(b);
      });

    return (
      ranked[0] || {
        claimText: claim,
        claim_text: claim,
        supportStatus: "unsupported",
        support_status: "unsupported",
        sourcePath: null,
        source_path: null,
        sourceTitle: null,
        source_title: null,
        vectorChunkId: null,
        vector_chunk_id: null,
        authorityTier: null,
        authority_tier: null,
        authorityType: null,
        authority_type: null,
        evidenceScore: 0,
        evidence_score: 0
      }
    );
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
    (item) =>
      item.supportStatus === "supported" ||
      item.supportStatus === "partial" ||
      item.support_status === "supported" ||
      item.support_status === "partial"
  );

  const topScore =
    evidence.length > 0
      ? Math.max(
          ...evidence.map((item) =>
            Number(
              item.finalScore ||
                item.score ||
                item.evidenceScore ||
                item.evidence_score ||
                0
            )
          )
        )
      : 0;

  const queryHints = extractPrimaryAuthorityHints(query);
  const primaryAuthorityPresent = hasPrimaryAuthorityEvidence(evidence, queryHints);

  const hasIdentitySensitiveQuery =
    queryHints.raNumbers.length > 0 ||
    queryHints.namedLawAnchors.length > 0 ||
    queryHints.courtRefs.length > 0 ||
    queryHints.issuanceRefs.length > 0;

  const primaryAuthoritySatisfied =
    !requirePrimaryAuthority && !hasIdentitySensitiveQuery
      ? true
      : primaryAuthorityPresent;

  const hasControllingSource = hasAtLeastOneControllingSource(evidence);

  return {
    isSufficient:
      evidence.length >= minEvidenceCount &&
      supportedClaims.length >= minSupportedClaims &&
      topScore >= minTopScore &&
      primaryAuthoritySatisfied &&
      hasControllingSource,
    topScore,
    evidenceCount: evidence.length,
    supportedClaimCount: supportedClaims.length,
    supportedClaims,
    queryHints,
    primaryAuthorityPresent,
    primaryAuthorityRequired:
      requirePrimaryAuthority || hasIdentitySensitiveQuery,
    hasControllingSource
  };
}

export function shouldRejectForWeakLegalBasis({
  validation,
  hasExactCitation = false
}) {
  if (!validation) return true;
  if (!validation.hasControllingSource) return true;

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
