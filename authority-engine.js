// FILE: authority-engine.js

export const AUTHORITY_LEVEL = {
  CONSTITUTION: 1,
  STATUTE: 2,
  RR: 3,
  RMC: 4,
  RMO: 5,
  RAMO: 6,
  BIR_RULING: 7,
  SUPREME_COURT: 8,
  CTA_EN_BANC: 9,
  COURT_OF_APPEALS: 10,
  CTA_DIVISION: 11,
  TREATY: 12,
  LGU: 13,
  SECONDARY: 99
};

export const AUTHORITY_SCORE = {
  CONSTITUTION: 100,
  STATUTE: 98,
  RR: 94,
  SUPREME_COURT: 95,
  TREATY: 90,
  RMC: 86,
  RMO: 82,
  RAMO: 80,
  BIR_RULING: 72,
  CTA_EN_BANC: 70,
  COURT_OF_APPEALS: 68,
  CTA_DIVISION: 64,
  LGU: 58,
  SECONDARY: 20
};

export const AUTHORITY_LABEL = {
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / Tax Code / Republic Act",
  RR: "Revenue Regulation",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  SUPREME_COURT: "Supreme Court Decision",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  TREATY: "Tax Treaty / International Agreement",
  LGU: "Local Tax Ordinance",
  SECONDARY: "Secondary / Commentary"
};

export const CONTROLLING_PRECEDENCE = {
  CONSTITUTION: 1,
  STATUTE: 2,
  TREATY: 3,
  RR: 4,
  SUPREME_COURT: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  SECONDARY: 99
};

export const COURT_TYPES = new Set([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

export const BIR_TYPES = new Set(["RR", "RMC", "RMO", "RAMO", "BIR_RULING"]);

export function normalizeText(value = "") {
  return String(value || "").trim();
}

export function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

export function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeYear(year) {
  const clean = String(year || "").trim();
  if (!clean) return "";
  if (/^\d{4}$/.test(clean)) return clean;

  if (/^\d{2}$/.test(clean)) {
    const yy = Number(clean);
    const currentYY = new Date().getFullYear() % 100;
    return String(yy <= currentYY + 1 ? 2000 + yy : 1900 + yy);
  }

  return clean;
}

function padDocNumber(num, len = 2) {
  return String(num || "").replace(/^0+/, "").padStart(len, "0");
}

function basename(value = "") {
  const parts = String(value || "").split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(value || "");
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.source ||
    doc.title ||
    ""
  );
}

export function getDocSource(doc = {}) {
  return (
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.metadata?.originalFileName ||
    doc.title ||
    basename(getDocPath(doc)) ||
    "Unknown source"
  );
}

export function getDocNormalizedReference(doc = {}) {
  return (
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    ""
  );
}

export function getDocAliases(doc = {}) {
  return [
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases)
  ].filter(Boolean);
}

function buildDocReferenceBlob(doc = {}) {
  return compactSpaces(
    [
      getDocSource(doc),
      getDocPath(doc),
      getDocNormalizedReference(doc),
      ...getDocAliases(doc)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isSecondaryByFolder(path = "", fileName = "") {
  const p = lower(path);
  const f = lower(fileName);

  return (
    p.includes("07_cpa_notes") ||
    p.includes("08_review_materials") ||
    p.includes("internal_notes") ||
    p.includes("working_papers") ||
    p.includes("drafts") ||
    f.includes("cpa notes") ||
    f.includes("lecture notes") ||
    f.includes("bullet notes") ||
    f.includes("reviewer") ||
    f.includes("handout") ||
    f.includes("working paper") ||
    f.includes("draft")
  );
}

function detectCourtTypeFromText(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;

  if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) || /\bsupreme court\b/i.test(raw)) {
    return "SUPREME_COURT";
  }

  if (/\bcta en banc\b/i.test(raw) || /\bcta\s+eb\s+no\.?\s*[a-z0-9.-]+\b/i.test(raw)) {
    return "CTA_EN_BANC";
  }

  if (/\bcourt of appeals\b/i.test(raw) || /\bca-g\.?r\.\b/i.test(raw) || /\bca gr\b/i.test(l)) {
    return "COURT_OF_APPEALS";
  }

  if (/\bcta division\b/i.test(raw) || /\bcta case\b/i.test(l) || /\bcta\b/i.test(raw)) {
    return "CTA_DIVISION";
  }

  return null;
}

function detectOfficialLegalReferenceFromName(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;

  if (isSecondaryByFolder(raw, raw)) return "SECONDARY";

  const courtType = detectCourtTypeFromText(raw);
  if (courtType) return courtType;

  if (
    l.includes("1987 philippine constitution") ||
    l.includes("constitution of the philippines") ||
    l.includes("philippine constitution")
  ) {
    return "CONSTITUTION";
  }

  if (
    l.includes("national internal revenue code") ||
    /\bnirc\b/.test(l) ||
    /\btax code\b/.test(l) ||
    /\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*\d+\b/i.test(raw)
  ) {
    return "STATUTE";
  }

  if (/\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RR";
  if (/\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RMC";
  if (/\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RMO";
  if (/\b(?:ramo|revenue\s+audit\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RAMO";
  if (/\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*[a-z0-9()/.-]+\b/i.test(raw)) return "BIR_RULING";

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

function classifyAuthorityFromPath(path = "", fileName = "", text = "") {
  const p = lower(path);
  const f = lower(fileName);
  const t = lower(text);

  if (isSecondaryByFolder(path, fileName)) return "SECONDARY";

  if (p.includes("00_constitution")) return "CONSTITUTION";
  if (p.includes("01_tax_code")) return "STATUTE";
  if (p.includes("02_revenue_regulations")) return "RR";
  if (p.includes("03_rmc")) return "RMC";
  if (p.includes("04b_ramo")) return "RAMO";
  if (p.includes("04_rmo")) return "RMO";
  if (p.includes("05_bir_rulings")) return "BIR_RULING";
  if (p.includes("05b_tax_treaties")) return "TREATY";
  if (p.includes("06_court_cases")) return detectCourtTypeFromText(`${fileName} ${path} ${text}`) || "SUPREME_COURT";

  if (f.includes("constitution") || t.includes("constitution of the philippines")) return "CONSTITUTION";

  return null;
}

function classifyAuthorityFromTextContent(text = "", fileName = "", path = "") {
  const blob = lower(text);
  const file = lower(fileName);
  const p = lower(path);

  if (!blob) return null;
  if (isSecondaryByFolder(path, fileName)) return "SECONDARY";

  const courtType = detectCourtTypeFromText(`${fileName} ${path} ${blob}`);
  if (courtType) return courtType;

  if (
    blob.includes("1987 philippine constitution") ||
    blob.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (
    blob.includes("national internal revenue code") ||
    /\bnirc\b/.test(blob) ||
    /\btax code\b/.test(blob)
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
    /\brepublic\s+act\s+(?:no\.?)?\s*\d{4,6}\b/i.test(blob) ||
    /\bra\s+(?:no\.?)?\s*\d{4,6}\b/i.test(blob)
  ) {
    return "STATUTE";
  }

  if (blob.includes("tax treaty") || blob.includes("international agreement") || blob.includes("convention between")) return "TREATY";
  if (/\brr\s*\d+[-_ /]\d{2,4}\b/.test(blob) || blob.includes("revenue regulation")) return "RR";
  if (/\brmc\s*\d+[-_ /]\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum circular")) return "RMC";
  if (/\brmo\s*\d+[-_ /]\d{2,4}\b/.test(blob) || blob.includes("revenue memorandum order")) return "RMO";
  if (/\bramo\s*\d+[-_ /]\d{2,4}\b/.test(blob) || blob.includes("revenue audit memorandum order")) return "RAMO";
  if (blob.includes("bir ruling") || /\bruling no\.?\b/.test(blob)) return "BIR_RULING";
  if (blob.includes("ordinance") || blob.includes("city ordinance") || blob.includes("municipal ordinance") || blob.includes("local tax code")) return "LGU";

  return null;
}

export function normalizeLegalReference(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return { raw, normalized: "", type: null, aliases: [] };

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
        `ra no. ${raNo}`,
        `republic act no. ${raNo}`,
        `republic act ${raNo}`
      ]
    };
  }

  const patterns = [
    ["RR", /\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_ /]?(\d{2,4})\b/i, 2],
    ["RMC", /\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_ /]?(\d{2,4})\b/i, 3],
    ["RMO", /\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_ /]?(\d{2,4})\b/i, 3],
    ["RAMO", /\b(?:ramo|revenue\s+audit\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_ /]?(\d{2,4})\b/i, 3]
  ];

  for (const [type, regex, pad] of patterns) {
    const match = raw.match(regex);

    if (match) {
      const num = String(match[1]).replace(/^0+/, "");
      const year = normalizeYear(match[2]);
      const normalized = `${type}_${padDocNumber(num, pad)}_${year}`;

      return {
        raw,
        normalized,
        type,
        aliases: [
          `${type.toLowerCase()} ${num}-${year}`,
          `${type.toLowerCase()} ${padDocNumber(num, pad)}-${year}`,
          `${AUTHORITY_LABEL[type].toLowerCase()} ${num}-${year}`
        ]
      };
    }
  }

  const rulingMatch = raw.match(/\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*([a-z0-9()/.-]+)\b/i);
  if (rulingMatch) {
    const number = String(rulingMatch[1]).toUpperCase();

    return {
      raw,
      normalized: `BIR_RULING_${number.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "BIR_RULING",
      aliases: [raw, `bir ruling ${number}`]
    };
  }

  const courtType = detectCourtTypeFromText(raw);
  if (courtType) {
    return {
      raw,
      normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
      type: courtType,
      aliases: [raw]
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
  const pathType = classifyAuthorityFromPath(path, fileName, text);
  const nameType = isSecondaryByFolder(path, fileName)
    ? "SECONDARY"
    : detectOfficialLegalReferenceFromName(`${fileName} ${path}`);
  const textType = classifyAuthorityFromTextContent(text, fileName, path);
  const blob = `${fileName}\n${path}\n${text}`.toLowerCase();

  if (
    isSecondaryByFolder(path, fileName)
  ) {
    return "SECONDARY";
  }

  if (
    blob.includes("1987 philippine constitution") ||
    blob.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (pathType) return pathType;
  if (nameType) return nameType;
  if (textType) return textType;

  return "SECONDARY";
}

export function buildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
  const authorityType = classifyAuthorityFromDocument({
    fileName,
    path,
    text
  });

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

  const ageDays = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

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
    getDocSource(doc),
    getDocPath(doc),
    getDocNormalizedReference(doc),
    ...getDocAliases(doc)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const normalizedNeedle = String(intent.normalizedReference || "").toLowerCase();
  const aliasHit = (intent.aliases || []).some((alias) =>
    haystack.includes(String(alias).toLowerCase())
  );

  if (normalizedNeedle && haystack.includes(normalizedNeedle)) return 140;
  if (aliasHit) return 110;

  return 0;
}

export function getAuthorityTypeForDoc(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    classifyAuthorityFromDocument({
      fileName: getDocSource(doc),
      path: getDocPath(doc),
      text: doc.text || doc.content || doc.excerpt || ""
    })
  );
}

export function getAuthorityLevelForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    AUTHORITY_LEVEL[authorityType] ||
    99
  );
}

export function getAuthorityScoreForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore) ||
    AUTHORITY_SCORE[authorityType] ||
    0
  );
}

export function getControllingPrecedenceForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.controllingPrecedence || doc.controlling_precedence || doc.metadata?.controllingPrecedence) ||
    CONTROLLING_PRECEDENCE[authorityType] ||
    99
  );
}

function computeNamedLawBonus(query = "", doc = {}) {
  const normalizedQuery = lower(query);
  if (!normalizedQuery) return 0;

  const haystack = lower(buildDocReferenceBlob(doc));
  const authorityType = getAuthorityTypeForDoc(doc);
  let bonus = 0;

  const raMatch = normalizedQuery.match(/\bra\s*(\d{4,6})\b/);
  if (raMatch) {
    const raNeedle = raMatch[1];
    const exactRaHit =
      haystack.includes(`ra ${raNeedle}`) ||
      haystack.includes(`ra no. ${raNeedle}`) ||
      haystack.includes(`republic act ${raNeedle}`) ||
      haystack.includes(`republic act no. ${raNeedle}`) ||
      haystack.includes(`republic act no ${raNeedle}`);

    if (exactRaHit) bonus += authorityType === "STATUTE" ? 190 : 35;
  }

  for (const anchor of [
    "create law",
    "train law",
    "create more",
    "ease of paying taxes",
    "eopt",
    "tax code",
    "nirc",
    "value added tax",
    "vat",
    "withholding tax",
    "income tax"
  ]) {
    if (normalizedQuery.includes(anchor) && haystack.includes(anchor)) {
      bonus += authorityType === "STATUTE" ? 90 : authorityType === "RR" ? 45 : 12;
    }
  }

  return bonus;
}

function extractIssueSignals(text = "") {
  const value = lower(text);
  const signals = [];

  if (/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat)\b/i.test(value)) {
    signals.push("VAT_REFUND");
  }

  if (/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts)\b/i.test(value)) {
    signals.push("VAT_LIABILITY");
  }

  if (/\b(invoice|receipt|substantiation|documentary|proof|evidence|support)\b/i.test(value)) {
    signals.push("EVIDENTIARY");
  }

  if (/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan)\b/i.test(value)) {
    signals.push("PROCEDURAL");
  }

  if (/\b(withholding|ewt|expanded withholding|final withholding)\b/i.test(value)) {
    signals.push("WITHHOLDING");
  }

  if (/\b(income tax|rcit|mcit|nolco|deductible|non-deductible)\b/i.test(value)) {
    signals.push("INCOME_TAX");
  }

  return [...new Set(signals)];
}

function computeIssueMatchBonus(query = "", doc = {}) {
  const querySignals = extractIssueSignals(query);
  if (!querySignals.length) return 0;

  const docSignals = extractIssueSignals(
    [
      getDocSource(doc),
      getDocPath(doc),
      doc.text,
      doc.content,
      doc.excerpt
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!docSignals.length) return 0;

  const overlap = querySignals.filter((signal) => docSignals.includes(signal));
  let bonus = overlap.length * 22;

  if (querySignals.includes("VAT_LIABILITY") && docSignals.includes("VAT_REFUND")) {
    bonus -= 35;
  }

  if (querySignals.includes("VAT_REFUND") && docSignals.includes("VAT_LIABILITY")) {
    bonus -= 20;
  }

  return bonus;
}

function computeAuthorityPriorityBonus(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);

  if (authorityType === "CONSTITUTION") return 60;
  if (authorityType === "STATUTE") return 58;
  if (authorityType === "RR") return 48;
  if (authorityType === "SUPREME_COURT") return 46;
  if (["RMC", "RMO", "RAMO"].includes(authorityType)) return 28;
  if (authorityType === "BIR_RULING") return 18;
  if (["CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(authorityType)) return 12;
  if (authorityType === "SECONDARY") return -40;

  return 0;
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
      const namedLawBonus = computeNamedLawBonus(query, doc);
      const issueMatchBonus = computeIssueMatchBonus(query, doc);
      const authorityPriorityBonus = computeAuthorityPriorityBonus(doc);

      const finalScore =
        semanticSimilarity * 0.28 +
        authorityScore * 0.34 +
        recencyScore * 0.03 +
        citationMatchBonus * 0.16 +
        namedLawBonus * 0.09 +
        issueMatchBonus * 0.06 +
        authorityPriorityBonus * 0.04;

      return {
        ...doc,
        authorityType,
        authorityLevel,
        controllingPrecedence: getControllingPrecedenceForDoc(doc),
        authorityScore,
        authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
        recencyScore,
        citationMatchBonus,
        namedLawBonus,
        issueMatchBonus,
        authorityPriorityBonus,
        finalScore
      };
    })
    .sort((a, b) => {
      if (b.citationMatchBonus !== a.citationMatchBonus) return b.citationMatchBonus - a.citationMatchBonus;
      if (b.namedLawBonus !== a.namedLawBonus) return b.namedLawBonus - a.namedLawBonus;
      if (b.issueMatchBonus !== a.issueMatchBonus) return b.issueMatchBonus - a.issueMatchBonus;
      if ((a.authorityLevel || 99) !== (b.authorityLevel || 99)) return (a.authorityLevel || 99) - (b.authorityLevel || 99);
      if ((a.controllingPrecedence || 99) !== (b.controllingPrecedence || 99)) return (a.controllingPrecedence || 99) - (b.controllingPrecedence || 99);
      return b.finalScore - a.finalScore;
    });
}

export function selectTopLegalBases(results = [], maxItems = 2) {
  return rerankByHierarchy(results)
    .filter((doc) => getAuthorityTypeForDoc(doc) !== "SECONDARY")
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      authorityType: getAuthorityTypeForDoc(doc),
      authorityLevel: getAuthorityLevelForDoc(doc),
      controllingPrecedence: getControllingPrecedenceForDoc(doc),
      authorityLabel:
        AUTHORITY_LABEL[getAuthorityTypeForDoc(doc)] ||
        getAuthorityTypeForDoc(doc),
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(doc.text || doc.content || doc.excerpt || "").slice(0, 420)
    }));
}

function buildAuthorityHierarchyText() {
  return [
    "1. Constitution",
    "2. NIRC / Tax Code / Republic Act",
    "3. Revenue Regulations",
    "4. Revenue Memorandum Circulars",
    "5. Revenue Memorandum Orders",
    "6. Revenue Audit Memorandum Orders",
    "7. BIR Rulings",
    "8. Supreme Court decisions",
    "9. CTA En Banc / Court of Appeals / CTA Division decisions",
    "10. Secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "For conflict resolution, apply controlling legal precedence as follows:",
    "1. Constitution controls all.",
    "2. Statutes control administrative issuances.",
    "3. A valid Revenue Regulation implements the statute but cannot amend, expand, or defeat it.",
    "4. Supreme Court doctrine is binding judicial construction and controls inconsistent administrative interpretation.",
    "5. RMCs, RMOs, RAMOs, and BIR rulings are administrative or interpretative; they cannot override the Constitution, NIRC, valid RR, or Supreme Court doctrine.",
    "6. CTA and Court of Appeals rulings may be persuasive or binding within their procedural posture, but cannot override Supreme Court doctrine.",
    "7. Secondary materials are never controlling authority."
  ].join("\n");
}

function buildMandatoryOutputFormatText() {
  return [
    "A. DIRECT ANSWER",
    "- Answer the exact legal/tax question immediately.",
    "- Define the legal concept precisely.",
    "- Do not begin with generic background.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    "- Identify the NIRC/statute first when available.",
    "- Then identify relevant RR.",
    "- Then identify RMC/RMO/RAMO/BIR ruling only if applicable.",
    "- State whether each rule is mandatory, procedural, interpretative, administrative, substantive, evidentiary, or jurisdictional.",
    "- Explain why each authority governs the issue.",
    "- If the statute is not in the context, expressly say that the indexed context did not retrieve it.",
    "",
    "C. SUPPORTING JURISPRUDENCE",
    "- Cite only cases directly relevant to the issue.",
    "- For each case, state: legal issue, doctrine, and applicability.",
    "- Do not cite VAT refund cases for VAT liability issues unless the distinction is expressly explained.",
    "- Do not cite unrelated cases merely because they mention the same tax type.",
    "",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "- State one of the following: No doctrinal conflict exists; Apparent conflict only; Partial conflict exists; Direct conflict exists.",
    "- If conflict exists, explain the exact legal issue in conflict, which doctrine controls, why it controls, whether the distinction is substantive/procedural/evidentiary/factual/temporal/jurisdictional/administrative, and whether later jurisprudence modified earlier rulings.",
    "- Never write only: Conflict detected: YES.",
    "- If cases address different procedural requirements, classify them as complementary or distinguishable, not conflicting.",
    "",
    "E. HIERARCHY ANALYSIS",
    "- Apply Philippine legal hierarchy expressly.",
    "- Explain which authority prevails if there is tension.",
    "- Distinguish rule hierarchy from evidence relevance.",
    "",
    "F. PRACTICAL APPLICATION",
    "- Apply the doctrine to the user's facts.",
    "- State tax consequence, compliance implication, audit risk, litigation exposure, documentation requirements, possible BIR position, and strongest taxpayer defense."
  ].join("\n");
}

function buildConflictInstructionText(conflict = null) {
  if (!conflict?.conflict && !conflict?.apparentConflict) {
    return [
      "Retrieved Conflict Signal: NO",
      "Instruction: You must still perform doctrinal status analysis.",
      "Do not invent a conflict. If authorities address different issues, say they are complementary or distinguishable."
    ].join("\n");
  }

  return [
    conflict?.apparentConflict
      ? "Retrieved Conflict Signal: APPARENT ONLY"
      : "Retrieved Conflict Signal: YES",
    `Conflict Type: ${conflict.conflictType || conflict.conflictStatus || "Unknown"}`,
    `Doctrinal Conflict: ${conflict.doctrinalConflict ? "YES" : "NO"}`,
    `Hierarchy Conflict: ${conflict.hierarchyConflict ? "YES" : "NO"}`,
    `Apparent Conflict: ${conflict.apparentConflict ? "YES" : "NO"}`,
    `Potential Controlling Authority: ${conflict.controllingAuthority || "Unknown"}`,
    `Exact Issue: ${conflict.exactIssue || "Not specified"}`,
    `Distinction Type: ${conflict.distinctionType || "Not specified"}`,
    `Preliminary Reason: ${conflict.reason || conflict.resolutionBasis || "Higher authority may prevail."}`,
    conflict.sourceA ? `Source A: ${conflict.sourceA}` : null,
    conflict.sourceB ? `Source B: ${conflict.sourceB}` : null,
    "",
    "Instruction:",
    "- Do not merely repeat the conflict signal.",
    "- Identify the exact legal issue in conflict.",
    "- Decide whether the conflict is direct, partial, apparent only, or none.",
    "- Explain which authority controls under hierarchy and doctrine.",
    "- Explain whether the distinction is substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative.",
    "- If the authorities address different VAT procedural requirements, treat them as complementary or distinguishable unless they directly contradict on the same legal issue."
  ]
    .filter(Boolean)
    .join("\n");
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
              `${index + 1}. [${item.authorityLabel || AUTHORITY_LABEL[getAuthorityTypeForDoc(item)] || "Unknown"}] ${
                item.source || getDocPath(item) || getDocSource(item)
              }\nAuthority Type: ${getAuthorityTypeForDoc(item)}\nAuthority Level: ${getAuthorityLevelForDoc(item)}\nControlling Precedence: ${getControllingPrecedenceForDoc(item)}\nExcerpt: ${normalizeText(item.excerpt || item.text || item.content || "").slice(0, 700)}`
          )
          .join("\n\n")
      : "No controlling legal basis was retrieved from the indexed context.";

  const conflictText = buildConflictInstructionText(conflict);

  return `
You are TINA (Tax Intelligence and Analysis), a Philippine Tax AI operating as a senior tax lawyer, CPA, and legal researcher.

ACTIVE MODE: ${hookMode}

CORE RULE:
Never merely retrieve citations.
You must synthesize, reconcile, and legally analyze authorities using Philippine tax law hierarchy and doctrine.
Your goal is legally coherent analysis, not source retrieval.

NON-NEGOTIABLE LEGAL REASONING RULES:
1. Do not perform citation dumping.
2. Do not mix unrelated cases.
3. Do not fabricate doctrinal conflicts.
4. Do not cite a case unless its legal issue directly supports the answer.
5. Do not cite a BIR issuance as controlling if the NIRC/statute controls and is available.
6. Do not let an RMC, RMO, RAMO, or BIR ruling override the NIRC, RR, or Supreme Court doctrine.
7. If a court decision genuinely conflicts with a BIR issuance, explain that controlling judicial doctrine prevails.
8. Always distinguish:
   - substantive vs procedural doctrine;
   - VAT liability vs VAT refund;
   - administrative remedy vs judicial remedy;
   - evidentiary requirement vs jurisdictional requirement;
   - statutory rule vs administrative implementation.
9. If an authority is not visible in the provided context, do not invent it. Say that the indexed context did not retrieve that authority.
10. Use exact dates, rates, thresholds, forms, and section numbers only if visible in the context.
11. If the issue requires latest verification, expressly recommend checking the latest official BIR/NIRC/court source.
12. If cases address different procedural requirements, classify them as complementary or distinguishable unless they directly contradict on the same legal issue.

PHILIPPINE TAX AUTHORITY HIERARCHY FOR SOURCE ORGANIZATION:
${buildAuthorityHierarchyText()}

CONTROLLING PRECEDENCE FOR CONFLICT RESOLUTION:
${buildControllingPrecedenceText()}

MANDATORY RESPONSE FORMAT:
${buildMandatoryOutputFormatText()}

ORIGINAL QUESTION:
${originalQuestion}

CLEAN QUESTION:
${cleanQuestion}

TOP LEGAL BASES RETRIEVED:
${legalBasesText}

CONFLICT / DOCTRINAL REVIEW INSTRUCTION:
${conflictText}

INDEXED CONTEXT:
${context}

FINAL INSTRUCTION:
Return only the final answer.
Use exactly the A to F headings.
Do not include a separate raw source list unless the answer itself needs to identify a source as part of legal reasoning.
`.trim();
}

export default {
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES,
  normalizeText,
  lower,
  compactSpaces,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,
  computeRecencyScore,
  detectCitationIntent,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,
  rerankByHierarchy,
  selectTopLegalBases,
  buildStrictAnswerPrompt
};
