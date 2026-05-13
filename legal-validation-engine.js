// FILE: legal-validation-engine.js

import { classifyAuthorityFromDocument, AUTHORITY_LEVEL } from "./authority-engine.js";
import { detectNamedLaw } from "./named-law-engine.js";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
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
    /^a\.\s*direct answer$/i,
    /^b\.\s*controlling legal basis$/i,
    /^c\.\s*supporting jurisprudence$/i,
    /^d\.\s*doctrinal status\s*\/\s*conflict analysis$/i,
    /^e\.\s*hierarchy analysis$/i,
    /^f\.\s*practical application$/i,
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
    /^validated indexed sources$/i,
    /^sources:?$/i,
    /^source:?$/i,
    /^references:?$/i,
    /^conflict detected:\s*(yes|no)$/i,
    /^controlling authority:/i,
    /^recommended action:/i,
    /^source a:/i,
    /^source b:/i,
    /^contradiction:/i,
    /^exact issue/i,
    /^distinction type/i,
    /^resolution basis/i,
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
    .filter((line) => line.length >= 18)
    .slice(0, 25);
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
  if (value.includes("tax code")) return "statute";
  if (value.includes("republic act")) return "statute";
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
      item.excerpt,
      item.preview,
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
      item.doctrineLabel,
      item.doctrineApplicability,
      item.doctrineApplicabilityExplanation,
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
    namedLawAnchors: extractNamedLawAnchors(combinedText),
    text: combinedText
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

function classifyIssueDimensions(text = "") {
  const value = lower(text);
  const dimensions = [];

  if (
    /\b(taxable|liable|subject to|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|capital gains tax|documentary stamp tax|percentage tax|vatable|sales|revenue)\b/i.test(value)
  ) {
    dimensions.push("substantive");
  }

  if (
    /\b(file|filing|deadline|due date|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|pan|fan|fl d|return|form|remedy|120\+30)\b/i.test(value)
  ) {
    dimensions.push("procedural");
  }

  if (
    /\b(invoice|receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(value)
  ) {
    dimensions.push("evidentiary");
  }

  if (
    /\b(jurisdiction|jurisdictional|cta|court has no jurisdiction|condition precedent|exhaustion|120\+30|30-day)\b/i.test(value)
  ) {
    dimensions.push("jurisdictional");
  }

  if (
    /\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(value)
  ) {
    dimensions.push("temporal");
  }

  if (
    /\b(rmc|rmo|ramo|revenue memorandum|bir ruling|administrative|interpretative|clarificatory|implementing rule|regulation)\b/i.test(value)
  ) {
    dimensions.push("administrative");
  }

  if (
    /\b(facts|factual|depending on|case-to-case|actual|circumstances|transaction structure|documentation)\b/i.test(value)
  ) {
    dimensions.push("factual");
  }

  return unique(dimensions.length ? dimensions : ["general"]);
}

function dimensionsOverlap(a = [], b = []) {
  if (!a.length || !b.length) return false;
  if (a.includes("general") || b.includes("general")) return true;
  return a.some((item) => b.includes(item));
}

function isVatRefundText(text = "") {
  const value = lower(text);
  return /\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|excess input vat|unutilized input vat)\b/i.test(value);
}

function isVatLiabilityText(text = "") {
  const value = lower(text);
  return /\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|lease of goods|gross selling price|gross receipts)\b/i.test(value);
}

function computeIssueMatchScore(claim = "", item = {}) {
  const evidenceText = buildEvidenceText(item);
  const claimDimensions = classifyIssueDimensions(claim);
  const evidenceDimensions = classifyIssueDimensions(evidenceText);

  let score = dimensionsOverlap(claimDimensions, evidenceDimensions) ? 0.25 : 0;

  const claimTokens = unique(
    tokenize(claim).filter((token) => token.length >= 4)
  );
  const evidenceTokens = new Set(
    tokenize(evidenceText).filter((token) => token.length >= 4)
  );

  if (claimTokens.length) {
    let hits = 0;
    for (const token of claimTokens) {
      if (evidenceTokens.has(token)) hits += 1;
    }
    score += Math.min(0.45, hits / claimTokens.length);
  }

  if (isVatLiabilityText(claim) && isVatRefundText(evidenceText)) {
    score -= 0.35;
  }

  if (isVatRefundText(claim) && isVatLiabilityText(evidenceText)) {
    score -= 0.2;
  }

  return Number(Math.max(0, Math.min(score, 1)).toFixed(4));
}

function computeAuthorityWeight(item = {}) {
  const type = normalizeAuthorityType(getDocAuthorityType(item));

  const weights = {
    constitution: 0.35,
    statute: 0.34,
    rr: 0.28,
    rmc: 0.2,
    rmo: 0.18,
    ramo: 0.17,
    bir_ruling: 0.14,
    supreme_court: 0.32,
    cta_en_banc: 0.2,
    court_of_appeals: 0.18,
    cta_division: 0.16,
    treaty: 0.25,
    lgu: 0.12,
    secondary: 0,
    unknown: 0
  };

  return weights[type] ?? 0;
}

function computeLegalSupportScore(claim = "", item = {}) {
  const combinedText = buildEvidenceText(item);
  const keywordScore = computeKeywordScore(claim, combinedText);
  const identityBonus = scoreIdentityMatch(claim, item);
  const issueScore = computeIssueMatchScore(claim, item);
  const authorityWeight = computeAuthorityWeight(item);
  const mismatchPenalty = penaltyForGenericMismatch(claim, item);

  return Number(
    Math.max(
      0,
      Math.min(
        keywordScore * 0.3 +
          identityBonus * 0.25 +
          issueScore * 0.3 +
          authorityWeight -
          mismatchPenalty,
        1
      )
    ).toFixed(4)
  );
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
  if (score >= 0.42) return "partial";

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

function hasHighAuthoritySource(evidence = []) {
  return evidence.some((item) => {
    const type = normalizeAuthorityType(getDocAuthorityType(item));
    return ["constitution", "statute", "rr", "supreme_court"].includes(type);
  });
}

function hasOnlyWeakAuthority(evidence = []) {
  if (!evidence.length) return true;

  return evidence.every((item) => {
    const type = normalizeAuthorityType(getDocAuthorityType(item));
    return ["secondary", "unknown", "bir_ruling", "cta_division", "lgu"].includes(type);
  });
}

function answerHasAFStructure(answerText = "") {
  const value = normalizeText(answerText);
  const headings = [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. SUPPORTING JURISPRUDENCE",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "E. HIERARCHY ANALYSIS",
    "F. PRACTICAL APPLICATION"
  ];

  return headings.every((heading) =>
    new RegExp(`(^|\\n)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(value)
  );
}

function answerHasVagueConflictYes(answerText = "") {
  const value = normalizeText(answerText);
  const match =
    value.match(/D\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS([\s\S]*?)(?=\n\s*E\.\s*HIERARCHY ANALYSIS|$)/i) ||
    value.match(/(?:5\.\s*CONFLICT FLAG|###\s*Conflict flag)([\s\S]*?)(?=\n\s*(?:6\.|###|[A-F]\.)|$)/i);

  if (!match) return false;

  const body = normalizeText(match[1] || "");

  if (!/Conflict Detected:\s*YES/i.test(body)) return false;

  const hasReasoning =
    /(exact issue|controlling doctrine|controlling authority|distinction type|resolution basis|why it controls|procedural|substantive|evidentiary|jurisdictional|temporal|factual|administrative)/i.test(body) &&
    body.length >= 250;

  return !hasReasoning;
}

function answerHasUnsupportedSpecifics(answerText = "", evidence = []) {
  const answerRefs = {
    raNumbers: extractRaNumbers(answerText),
    issuanceRefs: extractIssuanceRefs(answerText),
    courtRefs: extractCourtRefs(answerText)
  };

  const evidenceIdentity = evidence.reduce(
    (acc, item) => {
      const identity = buildEvidenceIdentity(item);
      acc.raNumbers.push(...identity.raNumbers);
      acc.issuanceRefs.push(...identity.issuanceRefs);
      acc.courtRefs.push(...identity.courtRefs);
      return acc;
    },
    { raNumbers: [], issuanceRefs: [], courtRefs: [] }
  );

  const evidenceRa = new Set(evidenceIdentity.raNumbers);
  const evidenceIssuances = new Set(evidenceIdentity.issuanceRefs);
  const evidenceCourts = new Set(evidenceIdentity.courtRefs);

  const unsupportedRa = answerRefs.raNumbers.filter((ref) => !evidenceRa.has(ref));
  const unsupportedIssuance = answerRefs.issuanceRefs.filter(
    (ref) => !evidenceIssuances.has(ref)
  );
  const unsupportedCourt = answerRefs.courtRefs.filter((ref) => !evidenceCourts.has(ref));

  return {
    hasUnsupportedSpecifics:
      unsupportedRa.length > 0 ||
      unsupportedIssuance.length > 0 ||
      unsupportedCourt.length > 0,
    unsupportedRa,
    unsupportedIssuance,
    unsupportedCourt
  };
}

function detectIssueMismatchRisk(query = "", evidence = []) {
  const queryIsVatLiability = isVatLiabilityText(query);
  const queryIsVatRefund = isVatRefundText(query);

  const evidenceTexts = evidence.map(buildEvidenceText);
  const allEvidenceLooksVatRefund =
    evidenceTexts.length > 0 &&
    evidenceTexts.every((text) => isVatRefundText(text) && !isVatLiabilityText(text));

  const allEvidenceLooksVatLiability =
    evidenceTexts.length > 0 &&
    evidenceTexts.every((text) => isVatLiabilityText(text) && !isVatRefundText(text));

  if (queryIsVatLiability && allEvidenceLooksVatRefund) {
    return {
      hasIssueMismatchRisk: true,
      reason:
        "The query appears to concern VAT liability/output VAT, but the evidence appears to consist only of VAT refund/procedural authorities."
    };
  }

  if (queryIsVatRefund && allEvidenceLooksVatLiability) {
    return {
      hasIssueMismatchRisk: true,
      reason:
        "The query appears to concern VAT refund/input VAT claim procedure, but the evidence appears to consist only of VAT liability authorities."
    };
  }

  return {
    hasIssueMismatchRisk: false,
    reason: null
  };
}

export function buildClaimSupportMap(answerText = "", evidence = []) {
  const claims = extractClaims(answerText);

  return claims.map((claim) => {
    const ranked = evidence
      .map((item) => {
        const evidenceScore = computeLegalSupportScore(claim, item);
        const issueScore = computeIssueMatchScore(claim, item);

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
          evidence_score: evidenceScore,
          issueMatchScore: issueScore,
          issue_match_score: issueScore
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
        evidence_score: 0,
        issueMatchScore: 0,
        issue_match_score: 0
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
  requirePrimaryAuthority = false,
  answerText = ""
}) {
  const supportedClaims = claimSupportMap.filter(
    (item) =>
      item.supportStatus === "supported" ||
      item.supportStatus === "partial" ||
      item.support_status === "supported" ||
      item.support_status === "partial"
  );

  const issueMatchedClaims = claimSupportMap.filter(
    (item) => Number(item.issueMatchScore || item.issue_match_score || 0) >= 0.25
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
  const highAuthorityPresent = hasHighAuthoritySource(evidence);
  const onlyWeakAuthority = hasOnlyWeakAuthority(evidence);

  const structureSatisfied = answerText ? answerHasAFStructure(answerText) : true;
  const vagueConflictYes = answerText ? answerHasVagueConflictYes(answerText) : false;
  const unsupportedSpecifics = answerText
    ? answerHasUnsupportedSpecifics(answerText, evidence)
    : {
        hasUnsupportedSpecifics: false,
        unsupportedRa: [],
        unsupportedIssuance: [],
        unsupportedCourt: []
      };

  const issueMismatchRisk = detectIssueMismatchRisk(query, evidence);

  const issueMatchSatisfied =
    claimSupportMap.length === 0 || issueMatchedClaims.length >= Math.min(1, claimSupportMap.length);

  const isSufficient =
    evidence.length >= minEvidenceCount &&
    supportedClaims.length >= minSupportedClaims &&
    topScore >= minTopScore &&
    primaryAuthoritySatisfied &&
    hasControllingSource &&
    !onlyWeakAuthority &&
    issueMatchSatisfied &&
    !issueMismatchRisk.hasIssueMismatchRisk &&
    !vagueConflictYes &&
    !unsupportedSpecifics.hasUnsupportedSpecifics &&
    structureSatisfied;

  return {
    isSufficient,
    topScore,
    evidenceCount: evidence.length,
    supportedClaimCount: supportedClaims.length,
    issueMatchedClaimCount: issueMatchedClaims.length,
    supportedClaims,
    issueMatchedClaims,
    queryHints,
    primaryAuthorityPresent,
    primaryAuthorityRequired:
      requirePrimaryAuthority || hasIdentitySensitiveQuery,
    hasControllingSource,
    highAuthorityPresent,
    onlyWeakAuthority,
    structureSatisfied,
    vagueConflictYes,
    unsupportedSpecifics,
    issueMismatchRisk,
    issueMatchSatisfied,
    rejectionReasons: [
      evidence.length < minEvidenceCount ? "INSUFFICIENT_EVIDENCE_COUNT" : null,
      supportedClaims.length < minSupportedClaims ? "INSUFFICIENT_SUPPORTED_CLAIMS" : null,
      topScore < minTopScore ? "LOW_TOP_SCORE" : null,
      !primaryAuthoritySatisfied ? "PRIMARY_AUTHORITY_NOT_PRESENT" : null,
      !hasControllingSource ? "NO_CONTROLLING_OR_USABLE_AUTHORITY" : null,
      onlyWeakAuthority ? "ONLY_WEAK_AUTHORITY_AVAILABLE" : null,
      !issueMatchSatisfied ? "CLAIMS_NOT_ISSUE_MATCHED" : null,
      issueMismatchRisk.hasIssueMismatchRisk ? "ISSUE_MISMATCH_RISK" : null,
      vagueConflictYes ? "VAGUE_CONFLICT_ANALYSIS" : null,
      unsupportedSpecifics.hasUnsupportedSpecifics ? "UNSUPPORTED_SPECIFIC_CITATION" : null,
      !structureSatisfied ? "MISSING_TINA_A_F_STRUCTURE" : null
    ].filter(Boolean)
  };
}

export function shouldRejectForWeakLegalBasis({
  validation,
  hasExactCitation = false
}) {
  if (!validation) return true;
  if (!validation.hasControllingSource) return true;
  if (validation.onlyWeakAuthority) return true;
  if (validation.issueMismatchRisk?.hasIssueMismatchRisk) return true;
  if (validation.vagueConflictYes) return true;
  if (validation.unsupportedSpecifics?.hasUnsupportedSpecifics) return true;
  if (validation.structureSatisfied === false) return true;

  if (validation.primaryAuthorityRequired && !validation.primaryAuthorityPresent) {
    return true;
  }

  if (hasExactCitation && validation.primaryAuthorityPresent && !validation.issueMismatchRisk?.hasIssueMismatchRisk) {
    return false;
  }

  return !validation.isSufficient;
}

export function buildNoSourceReply() {
  return [
    "A. DIRECT ANSWER",
    "TINA cannot give a legally reliable answer from the indexed knowledge base because no sufficient controlling or issue-matched authority was retrieved.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "No validated controlling legal basis was retrieved from the indexed sources. Verify the applicable NIRC provision, Revenue Regulation, BIR issuance, or controlling court authority.",
    "",
    "C. SUPPORTING JURISPRUDENCE",
    "No issue-relevant jurisprudence was validated. TINA should not cite unrelated cases merely because they mention the same tax type.",
    "",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "No doctrinal conflict can be determined because sufficient issue-matched authorities were not retrieved.",
    "",
    "E. HIERARCHY ANALYSIS",
    "No hierarchy conclusion can be made without a validated controlling source. Apply the Constitution, NIRC/statute, regulations, administrative issuances, and court doctrine in proper hierarchy after verification.",
    "",
    "F. PRACTICAL APPLICATION",
    "Verify against official BIR, NIRC, CTA, or Supreme Court sources before relying on the position for compliance, audit, protest, or litigation."
  ].join("\n");
}

export default {
  buildClaimSupportMap,
  validateEvidenceSufficiency,
  shouldRejectForWeakLegalBasis,
  buildNoSourceReply
};
