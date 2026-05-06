// FILE: authority-engine.js

const AUTHORITY_LEVEL = {
  CONSTITUTION: 1,
  STATUTE: 2,
  TREATY: 3,
  SUPREME_COURT: 4,
  CTA_EN_BANC: 5,
  COURT_OF_APPEALS: 6,
  CTA_DIVISION: 7,
  RR: 8,
  RMC: 9,
  RMO: 10,
  RAMO: 11,
  BIR_RULING: 12,
  LGU: 13,
  SECONDARY: 99
};

const AUTHORITY_SCORE = {
  CONSTITUTION: 100,
  STATUTE: 97,
  TREATY: 94,
  SUPREME_COURT: 96,
  CTA_EN_BANC: 93,
  COURT_OF_APPEALS: 90,
  CTA_DIVISION: 87,
  RR: 84,
  RMC: 76,
  RMO: 72,
  RAMO: 70,
  BIR_RULING: 66,
  LGU: 60,
  SECONDARY: 25
};

const AUTHORITY_LABEL = {
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / Tax Code / Republic Act",
  TREATY: "Tax Treaty / International Agreement",
  SUPREME_COURT: "Supreme Court Decision",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  RR: "Revenue Regulation",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  LGU: "Local Tax Ordinance",
  SECONDARY: "Secondary / Commentary"
};

const CONTROLLING_PRECEDENCE = {
  CONSTITUTION: 1,
  STATUTE: 2,
  TREATY: 3,
  SUPREME_COURT: 4,
  CTA_EN_BANC: 5,
  COURT_OF_APPEALS: 6,
  CTA_DIVISION: 7,
  RR: 8,
  RMC: 9,
  RMO: 10,
  RAMO: 11,
  BIR_RULING: 12,
  LGU: 13,
  SECONDARY: 99
};

const COURT_TYPES = new Set([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const BIR_TYPES = new Set(["RR", "RMC", "RMO", "RAMO", "BIR_RULING"]);

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeYear(year) {
  const clean = String(year || "").trim();

  if (!clean) return "";

  if (clean.length === 2) {
    const num = Number(clean);
    return String(num <= 30 ? 2000 + num : 1900 + num);
  }

  return clean;
}

function padDocNumber(num, len = 2) {
  return String(num || "").replace(/^0+/, "").padStart(len, "0");
}

function buildBlob({ fileName = "", path = "", text = "" }) {
  return `${fileName}\n${path}\n${text}`.toLowerCase();
}

function pathIncludes(path = "", token = "") {
  return lower(path).includes(lower(token));
}

function startsLikeOfficialReviewMaterial(path = "", fileName = "") {
  const p = lower(path);
  const f = lower(fileName);

  if (!p.includes("08_review_materials")) return false;

  return (
    f.includes("bullet notes") ||
    f.includes("reviewer") ||
    f.includes("review materials") ||
    f.includes("handout") ||
    f.includes("notes")
  );
}

function startsLikeCPANotes(path = "", fileName = "") {
  const p = lower(path);
  const f = lower(fileName);

  return (
    p.includes("07_cpa_notes") ||
    f.includes("cpa notes") ||
    f.includes("lecture notes")
  );
}

function isSecondaryByFolder(path = "", fileName = "") {
  return (
    startsLikeOfficialReviewMaterial(path, fileName) ||
    startsLikeCPANotes(path, fileName)
  );
}

function classifyAuthorityFromPath(path = "") {
  const p = lower(path);

  if (!p) return null;

  if (p.includes("00_constitution")) return "CONSTITUTION";
  if (p.includes("01_tax_code")) return "STATUTE";
  if (p.includes("02_revenue_regulations")) return "RR";
  if (p.includes("03_rmc")) return "RMC";
  if (p.includes("04b_ramo")) return "RAMO";
  if (p.includes("04_rmo")) return "RMO";
  if (p.includes("05_bir_rulings")) return "BIR_RULING";
  if (p.includes("05b_tax_treaties")) return "TREATY";
  if (p.includes("06_court_cases")) return "SUPREME_COURT";
  if (p.includes("07_cpa_notes")) return "SECONDARY";
  if (p.includes("08_review_materials")) return "SECONDARY";

  return null;
}

function detectCourtTypeFromText(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;

  if (
    /\bg\.r\.\s*no\.?/i.test(raw) ||
    /\bsupreme court\b/i.test(raw) ||
    /\bsc\b/i.test(l)
  ) {
    return "SUPREME_COURT";
  }

  if (
    /\bcta en banc\b/i.test(raw) ||
    /\bc\.?t\.?a\.?\s+en\s+banc\b/i.test(raw)
  ) {
    return "CTA_EN_BANC";
  }

  if (
    /\bcourt of appeals\b/i.test(raw) ||
    /\bca-g\.?r\.\b/i.test(raw) ||
    /\bca gr\b/i.test(l)
  ) {
    return "COURT_OF_APPEALS";
  }

  if (
    /\bcta division\b/i.test(raw) ||
    /\bc\.?t\.?a\.?\s+case\b/i.test(raw) ||
    /\bcta case\b/i.test(l)
  ) {
    return "CTA_DIVISION";
  }

  return null;
}

function detectOfficialLegalReferenceFromName(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;

  const courtType = detectCourtTypeFromText(raw);
  if (courtType) return courtType;

  if (
    l.includes("1987 philippine constitution") ||
    l.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (
    l.includes("national internal revenue code") ||
    /\bnirc\b/.test(l) ||
    /\btax code\b/.test(l)
  ) {
    return "STATUTE";
  }

  if (/\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*\d+\b/i.test(raw)) {
    return "STATUTE";
  }

  if (
    /\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*\d+[-_ ]\d{2,4}\b/i.test(raw)
  ) {
    return "RR";
  }

  if (
    /\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*\d+[-_ ]\d{2,4}\b/i.test(raw)
  ) {
    return "RMC";
  }

  if (
    /\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ ]\d{2,4}\b/i.test(raw)
  ) {
    return "RMO";
  }

  if (
    /\b(?:ramo|revenue\s+audit\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ ]\d{2,4}\b/i.test(raw)
  ) {
    return "RAMO";
  }

  if (
    /\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*[a-z0-9()/.-]+\b/i.test(raw)
  ) {
    return "BIR_RULING";
  }

  if (
    l.includes("tax treaty") ||
    l.includes("international agreement") ||
    l.includes("convention between")
  ) {
    return "TREATY";
  }

  if (
    l.includes("ordinance") ||
    l.includes("city ordinance") ||
    l.includes("municipal ordinance") ||
    l.includes("local tax code")
  ) {
    return "LGU";
  }

  return null;
}

function classifyAuthorityFromFileName(fileName = "", path = "") {
  if (isSecondaryByFolder(path, fileName)) {
    return "SECONDARY";
  }

  return detectOfficialLegalReferenceFromName(fileName);
}

function classifyAuthorityFromPathAndFileName(fileName = "", path = "") {
  if (isSecondaryByFolder(path, fileName)) {
    return "SECONDARY";
  }

  return detectOfficialLegalReferenceFromName(`${fileName} ${path}`);
}

function classifyAuthorityFromTextContent(text = "", fileName = "", path = "") {
  const blob = lower(text);
  const file = lower(fileName);
  const p = lower(path);

  if (!blob) return null;

  if (isSecondaryByFolder(path, fileName)) {
    return "SECONDARY";
  }

  const courtType = detectCourtTypeFromText(blob);
  if (courtType) return courtType;

  if (
    blob.includes("1987 philippine constitution") ||
    blob.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (
    blob.includes("national internal revenue code") ||
    /\bnirc\b/.test(blob)
  ) {
    if (
      file.includes("bullet notes") ||
      file.includes("review") ||
      p.includes("07_cpa_notes") ||
      p.includes("08_review_materials")
    ) {
      return null;
    }

    return "STATUTE";
  }

  if (
    blob.includes("tax treaty") ||
    blob.includes("international agreement") ||
    blob.includes("convention between")
  ) {
    return "TREATY";
  }

  if (
    /\brr\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue regulation")
  ) {
    return "RR";
  }

  if (
    /\brmc\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue memorandum circular")
  ) {
    return "RMC";
  }

  if (
    /\brmo\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue memorandum order")
  ) {
    return "RMO";
  }

  if (
    /\bramo\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue audit memorandum order")
  ) {
    return "RAMO";
  }

  if (
    blob.includes("bir ruling") ||
    /\bruling no\.?\b/.test(blob)
  ) {
    return "BIR_RULING";
  }

  if (
    blob.includes("ordinance") ||
    blob.includes("city ordinance") ||
    blob.includes("municipal ordinance") ||
    blob.includes("local tax code")
  ) {
    return "LGU";
  }

  return null;
}

function extractGRNumber(input = "") {
  const match = compactSpaces(input).match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function extractCTACaseNumber(input = "") {
  const raw = compactSpaces(input);

  const patterns = [
    /\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i,
    /\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i,
    /\bc\.?t\.?a\.?\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return "";
}

function extractCAGRNumber(input = "") {
  const match = compactSpaces(input).match(/\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  return match ? match[1].toUpperCase() : "";
}

export function normalizeLegalReference(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) {
    return {
      raw,
      normalized: "",
      type: null,
      aliases: []
    };
  }

  if (
    l.includes("1987 philippine constitution") ||
    l === "constitution" ||
    l.includes("philippine constitution")
  ) {
    return {
      raw,
      normalized: "1987_PHILIPPINE_CONSTITUTION",
      type: "CONSTITUTION",
      aliases: ["constitution", "1987 constitution", "philippine constitution"]
    };
  }

  if (
    l.includes("national internal revenue code") ||
    l.includes("nirc") ||
    l.includes("tax code")
  ) {
    return {
      raw,
      normalized: "NIRC_1997",
      type: "STATUTE",
      aliases: [
        "nirc",
        "tax code",
        "national internal revenue code",
        "national internal revenue code of 1997"
      ]
    };
  }

  const raMatch = raw.match(/\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*0*(\d+)\b/i);
  if (raMatch) {
    const raNo = String(raMatch[1]).replace(/^0+/, "");
    return {
      raw,
      normalized: `RA_${raNo}`,
      type: "STATUTE",
      aliases: [
        `ra ${raNo}`,
        `republic act no. ${raNo}`,
        `republic act ${raNo}`
      ]
    };
  }

  const rrMatch = raw.match(
    /\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );
  if (rrMatch) {
    const num = String(rrMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rrMatch[2]);

    return {
      raw,
      normalized: `RR_${padDocNumber(num, 2)}-${year}`,
      type: "RR",
      aliases: [
        `rr ${num}-${year}`,
        `rr ${padDocNumber(num, 2)}-${year}`,
        `revenue regulation no. ${num}-${year}`
      ]
    };
  }

  const rmcMatch = raw.match(
    /\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );
  if (rmcMatch) {
    const num = String(rmcMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rmcMatch[2]);

    return {
      raw,
      normalized: `RMC_${padDocNumber(num, 3)}_${year}`,
      type: "RMC",
      aliases: [
        `rmc ${num}-${year}`,
        `rmc ${padDocNumber(num, 3)}-${year}`,
        `revenue memorandum circular ${num}-${year}`
      ]
    };
  }

  const rmoMatch = raw.match(
    /\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );
  if (rmoMatch) {
    const num = String(rmoMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rmoMatch[2]);

    return {
      raw,
      normalized: `RMO_${padDocNumber(num, 3)}_${year}`,
      type: "RMO",
      aliases: [
        `rmo ${num}-${year}`,
        `rmo ${padDocNumber(num, 3)}-${year}`,
        `revenue memorandum order ${num}-${year}`
      ]
    };
  }

  const ramoMatch = raw.match(
    /\b(?:ramo|revenue\s+audit\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );
  if (ramoMatch) {
    const num = String(ramoMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(ramoMatch[2]);

    return {
      raw,
      normalized: `RAMO_${padDocNumber(num, 3)}_${year}`,
      type: "RAMO",
      aliases: [
        `ramo ${num}-${year}`,
        `ramo ${padDocNumber(num, 3)}-${year}`,
        `revenue audit memorandum order ${num}-${year}`
      ]
    };
  }

  const rulingMatch = raw.match(
    /\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*([a-z0-9()/.-]+)\b/i
  );
  if (rulingMatch) {
    const number = String(rulingMatch[1]).toUpperCase();

    return {
      raw,
      normalized: `BIR_RULING_${number.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "BIR_RULING",
      aliases: [raw, `bir ruling ${number}`]
    };
  }

  const grNumber = extractGRNumber(raw);
  if (grNumber) {
    return {
      raw,
      normalized: `GR_${grNumber.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "SUPREME_COURT",
      aliases: [raw, `g.r. no. ${grNumber}`, `gr no ${grNumber}`]
    };
  }

  const caGrNumber = extractCAGRNumber(raw);
  if (caGrNumber) {
    return {
      raw,
      normalized: `CA_GR_${caGrNumber.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "COURT_OF_APPEALS",
      aliases: [raw, `ca-g.r. ${caGrNumber}`, `court of appeals ${caGrNumber}`]
    };
  }

  const ctaCaseNumber = extractCTACaseNumber(raw);
  if (ctaCaseNumber) {
    const type = /\bcta en banc\b/i.test(raw) ? "CTA_EN_BANC" : "CTA_DIVISION";

    return {
      raw,
      normalized: `CTA_${ctaCaseNumber.replace(/[^A-Z0-9]+/g, "_")}`,
      type,
      aliases: [raw, `cta case no. ${ctaCaseNumber}`]
    };
  }

  return {
    raw,
    normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    type: null,
    aliases: [raw]
  };
}

export function classifyAuthorityFromDocument({
  fileName = "",
  path = "",
  text = ""
}) {
  const fileType = classifyAuthorityFromFileName(fileName, path);
  const pathAndFileType = classifyAuthorityFromPathAndFileName(fileName, path);
  const textType = classifyAuthorityFromTextContent(text, fileName, path);
  const pathType = classifyAuthorityFromPath(path);
  const blob = buildBlob({ fileName, path, text });

  if (
    blob.includes("1987 philippine constitution") ||
    blob.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (fileType) return fileType;
  if (pathAndFileType) return pathAndFileType;
  if (textType) return textType;
  if (pathType) return pathType;

  return "SECONDARY";
}

export function buildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
  const authorityType = classifyAuthorityFromDocument({ fileName, path, text });
  const normalizedRef = normalizeLegalReference(`${fileName} ${path}`);

  return {
    authorityType,
    authorityLevel: AUTHORITY_LEVEL[authorityType] || 99,
    controllingPrecedence: CONTROLLING_PRECEDENCE[authorityType] || 99,
    authorityScore: AUTHORITY_SCORE[authorityType] || 0,
    authorityLabel: AUTHORITY_LABEL[authorityType] || "Unknown",
    normalizedReference: normalizedRef.normalized || null,
    normalizedAliases: normalizedRef.aliases || [],
    recencyDate: modifiedTime || null
  };
}

export function computeRecencyScore(dateValue) {
  if (!dateValue) return 50;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 50;

  const ageDays = Math.max(
    0,
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (ageDays <= 30) return 100;
  if (ageDays <= 180) return 90;
  if (ageDays <= 365) return 80;
  if (ageDays <= 730) return 70;
  if (ageDays <= 1825) return 60;

  return 50;
}

export function detectCitationIntent(query = "") {
  const normalized = normalizeLegalReference(query);

  return {
    normalizedReference: normalized.normalized,
    authorityType: normalized.type,
    aliases: normalized.aliases || [],
    hasCitationIntent: Boolean(normalized.type)
  };
}

function computeCitationMatchBonus(query = "", doc = {}) {
  const intent = detectCitationIntent(query);
  if (!intent.hasCitationIntent) return 0;

  const haystack = [
    doc.source,
    doc.path,
    doc.originalSource,
    doc.metadata?.path,
    doc.metadata?.originalSource,
    doc.normalizedReference,
    doc.metadata?.normalizedReference,
    ...(doc.normalizedAliases || []),
    ...(doc.metadata?.normalizedAliases || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const normalizedNeedle = String(intent.normalizedReference || "").toLowerCase();
  const aliasHit = (intent.aliases || []).some((alias) =>
    haystack.includes(String(alias).toLowerCase())
  );

  if (normalizedNeedle && haystack.includes(normalizedNeedle)) return 100;
  if (aliasHit) return 85;

  return 0;
}

function getAuthorityTypeForDoc(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || "",
      path: doc.path || doc.metadata?.path || "",
      text: doc.text || ""
    })
  );
}

function getAuthorityLevelForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    AUTHORITY_LEVEL[authorityType] ||
    99
  );
}

function getAuthorityScoreForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore) ||
    AUTHORITY_SCORE[authorityType] ||
    0
  );
}

function getControllingPrecedenceForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(
      doc.controllingPrecedence ||
        doc.controlling_precedence ||
        doc.metadata?.controllingPrecedence
    ) ||
    CONTROLLING_PRECEDENCE[authorityType] ||
    99
  );
}

function hasCourtOverridePriority(aType = "", bType = "") {
  return (
    (COURT_TYPES.has(aType) && BIR_TYPES.has(bType)) ||
    (COURT_TYPES.has(bType) && BIR_TYPES.has(aType))
  );
}

function lexicalTopicTokens(text = "") {
  return lower(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter(
      (token) =>
        ![
          "shall",
          "where",
          "which",
          "under",
          "there",
          "their",
          "this",
          "that",
          "with",
          "from",
          "have",
          "been",
          "were",
          "when",
          "what",
          "than",
          "into",
          "also",
          "only"
        ].includes(token)
    );
}

function hasMeaningfulTopicOverlap(a = "", b = "") {
  const setA = new Set(lexicalTopicTokens(a));
  const setB = new Set(lexicalTopicTokens(b));

  if (!setA.size || !setB.size) return false;

  let hits = 0;
  for (const token of setA) {
    if (setB.has(token)) hits += 1;
    if (hits >= 3) return true;
  }

  return false;
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const negPatterns = [
    /\bnot\b/,
    /\bexcept\b/,
    /\bunless\b/,
    /\bexempt\b/,
    /\bdisallowed\b/,
    /\bprohibited\b/,
    /\bexcluded\b/,
    /\bsubject to\b/,
    /\bshall\b/
  ];

  const xNeg = negPatterns.some((pattern) => pattern.test(x));
  const yNeg = negPatterns.some((pattern) => pattern.test(y));

  if (xNeg === yNeg) return false;

  return hasMeaningfulTopicOverlap(x, y);
}

export function rerankByHierarchy(results = [], query = "") {
  return results
    .map((doc) => {
      const semanticSimilarity = Number(doc.score || doc.similarity || 0);
      const authorityType = getAuthorityTypeForDoc(doc);
      const authorityLevel = getAuthorityLevelForDoc(doc);
      const authorityScore = getAuthorityScoreForDoc(doc);

      const recencyScore = computeRecencyScore(
        doc.recencyDate ||
          doc.recency_date ||
          doc.metadata?.recencyDate ||
          doc.modifiedTime ||
          doc.metadata?.modifiedTime ||
          null
      );

      const citationMatchBonus = computeCitationMatchBonus(query, doc);

      const finalScore =
        semanticSimilarity * 0.45 +
        authorityScore * 0.35 +
        recencyScore * 0.05 +
        citationMatchBonus * 0.15;

      return {
        ...doc,
        authorityType,
        authorityLevel,
        controllingPrecedence: getControllingPrecedenceForDoc(doc),
        authorityScore,
        authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
        recencyScore,
        citationMatchBonus,
        finalScore
      };
    })
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (a.authorityLevel || 99) - (b.authorityLevel || 99);
    });
}

export function detectHierarchyConflict(topDocs = []) {
  if (!Array.isArray(topDocs) || topDocs.length < 2) {
    return {
      conflict: false,
      controllingAuthority: null,
      controllingSource: null,
      reason: null,
      conflictingDocs: [],
      sourceA: null,
      sourceB: null
    };
  }

  for (let i = 0; i < topDocs.length; i += 1) {
    for (let j = i + 1; j < topDocs.length; j += 1) {
      const a = topDocs[i];
      const b = topDocs[j];

      const aType = getAuthorityTypeForDoc(a);
      const bType = getAuthorityTypeForDoc(b);

      if (!looksContradictory(a.text || "", b.text || "")) {
        continue;
      }

      const aPrecedence = getControllingPrecedenceForDoc(a);
      const bPrecedence = getControllingPrecedenceForDoc(b);

      const controlling = aPrecedence <= bPrecedence ? a : b;
      const lowerDoc = aPrecedence <= bPrecedence ? b : a;
      const controllingType = getAuthorityTypeForDoc(controlling);
      const lowerType = getAuthorityTypeForDoc(lowerDoc);

      let reason = `${lowerType} appears inconsistent with ${controllingType}. Higher authority prevails.`;

      if (hasCourtOverridePriority(aType, bType)) {
        reason = `${COURT_TYPES.has(aType) ? aType : bType} appears to override a conflicting BIR issuance. Court decision prevails.`;
      }

      return {
        conflict: true,
        controllingAuthority: controllingType,
        controllingSource:
          controlling.path ||
          controlling.metadata?.path ||
          controlling.source ||
          controlling.originalSource ||
          null,
        reason,
        conflictingDocs: [a, b],
        sourceA:
          a.path || a.metadata?.path || a.source || a.originalSource || null,
        sourceB:
          b.path || b.metadata?.path || b.source || b.originalSource || null
      };
    }
  }

  return {
    conflict: false,
    controllingAuthority: null,
    controllingSource: null,
    reason: null,
    conflictingDocs: [],
    sourceA: null,
    sourceB: null
  };
}

export function selectTopLegalBases(results = [], maxItems = 2) {
  return rerankByHierarchy(results)
    .filter((doc) => {
      const type = getAuthorityTypeForDoc(doc);
      return type !== "SECONDARY";
    })
    .slice(0, maxItems)
    .map((doc) => ({
      authorityType: getAuthorityTypeForDoc(doc),
      authorityLabel: AUTHORITY_LABEL[getAuthorityTypeForDoc(doc)] || getAuthorityTypeForDoc(doc),
      source:
        doc.path ||
        doc.metadata?.path ||
        doc.source ||
        doc.originalSource ||
        "Unknown source",
      excerpt: normalizeText(doc.text).slice(0, 280)
    }));
}

export function buildStrictAnswerPrompt({
  hookMode = "ASK",
  originalQuestion = "",
  cleanQuestion = "",
  context = "",
  topLegalBases = [],
  conflict = null
}) {
  const legalBasesText =
    topLegalBases.length > 0
      ? topLegalBases
          .map(
            (item, index) =>
              `${index + 1}. [${item.authorityLabel}] ${item.source}\nExcerpt: ${item.excerpt}`
          )
          .join("\n\n")
      : "No legal basis found.";

  const conflictText = conflict?.conflict
    ? [
        "Conflict Detected: YES",
        `Controlling Authority: ${conflict.controllingAuthority || "Unknown"}`,
        `Reason: ${conflict.reason || "Higher authority prevails."}`,
        conflict.sourceA ? `Source A: ${conflict.sourceA}` : null,
        conflict.sourceB ? `Source B: ${conflict.sourceB}` : null
      ]
          .filter(Boolean)
          .join("\n")
    : "Conflict Detected: NO";

  return `
You are TINA (Tax Intelligence and Analysis), an expert Philippine tax researcher and analyst.

ACTIVE MODE: ${hookMode}

NON-NEGOTIABLE RULES:
1. Follow Philippine tax authority hierarchy and prefer higher controlling authority.
2. If a court decision conflicts with a BIR issuance, the court decision prevails.
3. Never invent section numbers, dates, rates, thresholds, or citations.
4. Never cite a source for a point it does not actually cover.
5. Use exact statutory thresholds and dates when visible in the provided context.
6. If the answer requires information not visible in the provided context, say:
   "This may require verification against the latest BIR issuance. Please consult the BIR website or a licensed CPA."
7. Do not use vague conflict language.

RESPONSE FORMAT:
1. DIRECT ANSWER
2. LEGAL BASIS
3. SUPPORTING RULES
4. PROFESSIONAL INSIGHT
5. CONFLICT FLAG
6. SOURCES

ORIGINAL QUESTION:
${originalQuestion}

CLEAN QUESTION:
${cleanQuestion}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT STATUS:
${conflictText}

CONTEXT:
${context}
`.trim();
}

export {
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE
};
