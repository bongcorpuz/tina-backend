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
  RMC: 88,
  RMO: 84,
  RAMO: 82,
  BIR_RULING: 76,
  SUPREME_COURT: 95,
  CTA_EN_BANC: 72,
  COURT_OF_APPEALS: 70,
  CTA_DIVISION: 68,
  TREATY: 90,
  LGU: 60,
  SECONDARY: 25
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
    f.includes("cpa notes") ||
    f.includes("lecture notes") ||
    f.includes("bullet notes") ||
    f.includes("reviewer") ||
    f.includes("handout")
  );
}

function detectCourtTypeFromText(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;
  if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) || /\bsupreme court\b/i.test(raw)) return "SUPREME_COURT";
  if (/\bcta en banc\b/i.test(raw) || /\bcta\s+eb\s+no\.?\s*[a-z0-9.-]+\b/i.test(raw)) return "CTA_EN_BANC";
  if (/\bcourt of appeals\b/i.test(raw) || /\bca-g\.?r\.\b/i.test(raw) || /\bca gr\b/i.test(l)) return "COURT_OF_APPEALS";
  if (/\bcta division\b/i.test(raw) || /\bcta case\b/i.test(l)) return "CTA_DIVISION";

  return null;
}

function detectOfficialLegalReferenceFromName(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) return null;

  const courtType = detectCourtTypeFromText(raw);
  if (courtType) return courtType;

  if (l.includes("1987 philippine constitution") || l.includes("constitution of the philippines")) return "CONSTITUTION";
  if (l.includes("national internal revenue code") || /\bnirc\b/.test(l) || /\btax code\b/.test(l)) return "STATUTE";
  if (/\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*\d+\b/i.test(raw)) return "STATUTE";
  if (/\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RR";
  if (/\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RMC";
  if (/\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RMO";
  if (/\b(?:ramo|revenue\s+audit\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*\d+[-_ /]\d{2,4}\b/i.test(raw)) return "RAMO";
  if (/\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*[a-z0-9()/.-]+\b/i.test(raw)) return "BIR_RULING";
  if (l.includes("tax treaty") || l.includes("international agreement") || l.includes("convention between")) return "TREATY";
  if (l.includes("ordinance") || l.includes("city ordinance") || l.includes("municipal ordinance") || l.includes("local tax code")) return "LGU";

  return null;
}

function classifyAuthorityFromPath(path = "", fileName = "", text = "") {
  const p = lower(path);
  const f = lower(fileName);
  const t = lower(text);

  if (!p) return null;
  if (p.includes("00_constitution")) return "CONSTITUTION";
  if (p.includes("01_tax_code")) return "STATUTE";
  if (p.includes("02_revenue_regulations")) return "RR";
  if (p.includes("03_rmc")) return "RMC";
  if (p.includes("04b_ramo")) return "RAMO";
  if (p.includes("04_rmo")) return "RMO";
  if (p.includes("05_bir_rulings")) return "BIR_RULING";
  if (p.includes("05b_tax_treaties")) return "TREATY";
  if (p.includes("06_court_cases")) return detectCourtTypeFromText(`${fileName} ${path} ${text}`) || "SUPREME_COURT";
  if (p.includes("07_cpa_notes") || p.includes("08_review_materials")) return "SECONDARY";
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

  if (blob.includes("1987 philippine constitution") || blob.includes("constitution of the philippines")) return "CONSTITUTION";

  if (blob.includes("national internal revenue code") || /\bnirc\b/.test(blob)) {
    if (file.includes("bullet notes") || file.includes("review") || p.includes("07_cpa_notes") || p.includes("08_review_materials")) return null;
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

  if (l.includes("1987 philippine constitution") || l === "constitution" || l.includes("philippine constitution")) {
    return {
      raw,
      normalized: "1987_PHILIPPINE_CONSTITUTION",
      type: "CONSTITUTION",
      aliases: ["constitution", "1987 constitution", "philippine constitution"]
    };
  }

  if (l.includes("national internal revenue code") || l.includes("nirc") || l.includes("tax code")) {
    return {
      raw,
      normalized: "NIRC_1997",
      type: "STATUTE",
      aliases: ["nirc", "tax code", "national internal revenue code", "national internal revenue code of 1997"]
    };
  }

  const raMatch = raw.match(/\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*0*(\d+)\b/i);
  if (raMatch) {
    const raNo = String(raMatch[1]).replace(/^0+/, "");
    return {
      raw,
      normalized: `RA_${raNo}`,
      type: "STATUTE",
      aliases: [`ra ${raNo}`, `republic act no. ${raNo}`, `republic act ${raNo}`]
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

export function classifyAuthorityFromDocument({ fileName = "", path = "", text = "" }) {
  const pathType = classifyAuthorityFromPath(path, fileName, text);
  const nameType = isSecondaryByFolder(path, fileName)
    ? "SECONDARY"
    : detectOfficialLegalReferenceFromName(`${fileName} ${path}`);
  const textType = classifyAuthorityFromTextContent(text, fileName, path);
  const blob = `${fileName}\n${path}\n${text}`.toLowerCase();

  if (blob.includes("1987 philippine constitution") || blob.includes("constitution of the philippines")) return "CONSTITUTION";
  if (pathType) return pathType;
  if (nameType) return nameType;
  if (textType) return textType;

  return "SECONDARY";
}

export function buildAuthorityMetadata({ fileName = "", path = "", text = "", modifiedTime = null }) {
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

  const haystack = [getDocSource(doc), getDocPath(doc), getDocNormalizedReference(doc), ...getDocAliases(doc)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const normalizedNeedle = String(intent.normalizedReference || "").toLowerCase();
  const aliasHit = (intent.aliases || []).some((alias) => haystack.includes(String(alias).toLowerCase()));

  if (normalizedNeedle && haystack.includes(normalizedNeedle)) return 120;
  if (aliasHit) return 95;

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
      text: doc.text || ""
    })
  );
}

export function getAuthorityLevelForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  return Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) || AUTHORITY_LEVEL[authorityType] || 99;
}

export function getAuthorityScoreForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  return Number(doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore) || AUTHORITY_SCORE[authorityType] || 0;
}

export function getControllingPrecedenceForDoc(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  return Number(doc.controllingPrecedence || doc.controlling_precedence || doc.metadata?.controllingPrecedence) || CONTROLLING_PRECEDENCE[authorityType] || 99;
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
      haystack.includes(`republic act ${raNeedle}`) ||
      haystack.includes(`republic act no ${raNeedle}`);

    if (exactRaHit) bonus += authorityType === "STATUTE" ? 180 : 30;
  }

  for (const anchor of ["create law", "train law", "create more", "ease of paying taxes", "eopt", "tax code", "nirc"]) {
    if (normalizedQuery.includes(anchor) && haystack.includes(anchor)) {
      bonus += authorityType === "STATUTE" ? 90 : authorityType === "RR" ? 40 : 12;
    }
  }

  return bonus;
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

      const finalScore =
        semanticSimilarity * 0.38 +
        authorityScore * 0.34 +
        recencyScore * 0.04 +
        citationMatchBonus * 0.16 +
        namedLawBonus * 0.08;

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
        finalScore
      };
    })
    .sort((a, b) => {
      if (b.citationMatchBonus !== a.citationMatchBonus) return b.citationMatchBonus - a.citationMatchBonus;
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (a.authorityLevel || 99) - (b.authorityLevel || 99);
    });
}

export function selectTopLegalBases(results = [], maxItems = 2) {
  return rerankByHierarchy(results)
    .filter((doc) => getAuthorityTypeForDoc(doc) !== "SECONDARY")
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      authorityType: getAuthorityTypeForDoc(doc),
      authorityLabel: AUTHORITY_LABEL[getAuthorityTypeForDoc(doc)] || getAuthorityTypeForDoc(doc),
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(doc.text).slice(0, 280)
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
    "9. CTA En Banc / CTA Division decisions",
    "10. Secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "For conflict resolution, apply controlling legal precedence as follows:",
    "1. Constitution controls all.",
    "2. Statutes control administrative issuances.",
    "3. A valid Revenue Regulation implements the statute but cannot amend or expand it.",
    "4. RMCs, RMOs, RAMOs, and BIR rulings are administrative or interpretative; they cannot override the NIRC, RR, or Supreme Court doctrine.",
    "5. Supreme Court doctrine controls BIR issuances and lower court rulings.",
    "6. CTA and Court of Appeals rulings may be persuasive or binding only within their proper procedural posture, but cannot override Supreme Court doctrine.",
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
    "- State whether each rule is mandatory, procedural, interpretative, or administrative.",
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
    "- State one of the following: No doctrinal conflict exists; Partial conflict exists; Direct conflict exists.",
    "- If conflict exists, explain the exact legal issue in conflict, which doctrine controls, why it controls, whether the distinction is procedural/factual/temporal/jurisdictional, and whether later jurisprudence modified earlier rulings.",
    "- Never write only: Conflict detected: YES.",
    "- If cases address different procedural requirements, classify them as complementary, not conflicting.",
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
  if (!conflict?.conflict) {
    return [
      "Retrieved Conflict Signal: NO",
      "Instruction: You must still perform doctrinal status analysis.",
      "Do not invent a conflict. If authorities address different issues, say they are complementary or distinguishable."
    ].join("\n");
  }

  return [
    "Retrieved Conflict Signal: YES",
    `Potential Controlling Authority: ${conflict.controllingAuthority || "Unknown"}`,
    `Preliminary Reason: ${conflict.reason || "Higher authority may prevail."}`,
    conflict.sourceA ? `Source A: ${conflict.sourceA}` : null,
    conflict.sourceB ? `Source B: ${conflict.sourceB}` : null,
    "",
    "Instruction:",
    "- Do not merely repeat the conflict signal.",
    "- Identify the exact legal issue in conflict.",
    "- Decide whether the conflict is direct, partial, or only apparent.",
    "- Explain which authority controls under hierarchy and doctrine.",
    "- Explain whether the distinction is substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative."
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
              }\nAuthority Type: ${getAuthorityTypeForDoc(item)}\nAuthority Level: ${getAuthorityLevelForDoc(item)}\nControlling Precedence: ${getControllingPrecedenceForDoc(item)}\nExcerpt: ${normalizeText(item.excerpt || item.text || "").slice(0, 500)}`
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
7. If a court decision conflicts with a BIR issuance, explain that controlling judicial doctrine prevails.
8. Always distinguish:
   - substantive vs procedural doctrine;
   - VAT liability vs VAT refund;
   - administrative remedy vs judicial remedy;
   - evidentiary requirement vs jurisdictional requirement;
   - statutory rule vs administrative implementation.
9. If an authority is not visible in the provided context, do not invent it. Say that the indexed context did not retrieve that authority.
10. Use exact dates, rates, thresholds, forms, and section numbers only if visible in the context.
11. If the issue requires latest verification, expressly recommend checking the latest official BIR/NIRC/court source.

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
