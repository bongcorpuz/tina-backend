// FILE: authority-engine.js
"use strict";

/**
 * TINA AUTHORITY ENGINE
 * Version: 3.0.0
 *
 * Purpose:
 * - Strictly enforce Philippine legal hierarchy.
 * - Separate semantic relevance from controlling legal authority.
 * - Prevent lower authorities from outranking controlling authorities.
 * - Ensure consistent controlling_precedence usage across:
 *   - reranker-engine
 *   - jurisprudence-engine
 *   - conflict-engine
 *   - response-composer
 */

const ENGINE_VERSION = "3.0.0";

/**
 * AUTHORITY LEVEL
 * =========================
 * PURE CLASSIFICATION ORDER
 * Lower number = stronger authority
 */

const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  SUPREME_COURT: 3,
  RR: 4,
  TREATY: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  PFRS: 14,
  PAS: 15,
  PSA: 16,
  SECONDARY: 98,
  UNKNOWN: 99
});

/**
 * CONTROLLING PRECEDENCE
 * =========================
 * TRUE LEGAL CONTROL ORDER
 * Lower number ALWAYS controls higher number.
 */

const CONTROLLING_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  SUPREME_COURT: 3,
  RR: 4,
  TREATY: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  PFRS: 14,
  PAS: 15,
  PSA: 16,
  SECONDARY: 98,
  UNKNOWN: 99
});

/**
 * AUTHORITY SCORE
 * =========================
 * Used ONLY as secondary weighting.
 * NEVER overrides controlling precedence.
 */

const AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 100,
  STATUTE: 98,
  SUPREME_COURT: 96,
  RR: 92,
  TREATY: 88,
  RMC: 80,
  RMO: 76,
  RAMO: 74,
  BIR_RULING: 68,
  CTA_EN_BANC: 66,
  COURT_OF_APPEALS: 62,
  CTA_DIVISION: 58,
  LGU: 54,
  PFRS: 52,
  PAS: 52,
  PSA: 50,
  SECONDARY: 10,
  UNKNOWN: 0
});

const AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / NIRC / Republic Act",
  SUPREME_COURT: "Supreme Court Decision",
  RR: "Revenue Regulation",
  TREATY: "Tax Treaty",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  LGU: "Local Tax Ordinance",
  PFRS: "Philippine Financial Reporting Standards",
  PAS: "Philippine Accounting Standards",
  PSA: "Philippine Standards on Auditing",
  SECONDARY: "Secondary Material",
  UNKNOWN: "Unknown Authority"
});

const COURT_TYPES = new Set([
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "COURT_OF_APPEALS",
  "CTA_DIVISION"
]);

const BIR_TYPES = new Set([
  "RR",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value);
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function basename(value = "") {
  const parts = String(value || "").split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(value || "");
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

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.metadata?.originalFileName ||
    doc.source ||
    ""
  );
}

function getDocSource(doc = {}) {
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

function getDocNormalizedReference(doc = {}) {
  return (
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    ""
  );
}

function getDocAliases(doc = {}) {
  return [
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases)
  ].filter(Boolean);
}

function buildAuthorityBlob(doc = {}) {
  return compactSpaces(
    [
      getDocSource(doc),
      getDocPath(doc),
      getDocNormalizedReference(doc),
      ...getDocAliases(doc),
      doc.authorityType,
      doc.authority_type,
      doc.metadata?.authorityType,
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isSecondaryMaterial(path = "", fileName = "") {
  const p = lower(path);
  const f = lower(fileName);

  return (
    p.includes("07_cpa_notes") ||
    p.includes("08_review_materials") ||
    p.includes("drafts") ||
    p.includes("internal_notes") ||
    p.includes("working_papers") ||
    f.includes("reviewer") ||
    f.includes("lecture") ||
    f.includes("notes") ||
    f.includes("handout") ||
    f.includes("working paper")
  );
}

function detectCourtType(text = "") {
  const raw = compactSpaces(text);

  if (/\bcta\s+en\s+banc\b/i.test(raw) || /\bcta\s+eb\b/i.test(raw)) {
    return "CTA_EN_BANC";
  }

  if (/\bcourt\s+of\s+appeals\b/i.test(raw) || /\bca-?g\.?\s*r\.?\b/i.test(raw)) {
    return "COURT_OF_APPEALS";
  }

  if (/\bcta\s+case\s+no\.?\b/i.test(raw) || /\bcta\s+division\b/i.test(raw)) {
    return "CTA_DIVISION";
  }

  if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) || /\bsupreme\s+court\b/i.test(raw)) {
    return "SUPREME_COURT";
  }

  return null;
}

function classifyAuthorityFromDocument({ fileName = "", path = "", text = "" }) {
  if (isSecondaryMaterial(path, fileName)) return "SECONDARY";

  const headerBlob = lower(`${fileName}\n${path}`);
  const fullBlob = lower(`${fileName}\n${path}\n${text}`);

  /**
   * IMPORTANT:
   * Administrative issuances mentioning cases
   * MUST remain administrative issuances.
   */

  if (
    fullBlob.includes("constitution of the philippines") ||
    /\b1987\s+constitution\b/i.test(fullBlob)
  ) {
    return "CONSTITUTION";
  }

  if (
    /\bnirc\b/.test(fullBlob) ||
    /\btax code\b/.test(fullBlob) ||
    /\brepublic act\b/.test(fullBlob) ||
    /\bra\s*\d{4,6}\b/.test(fullBlob)
  ) {
    return "STATUTE";
  }

  if (/\brevenue regulation\b/i.test(fullBlob) || /\brr\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) {
    return "RR";
  }

  if (/\brevenue memorandum circular\b/i.test(fullBlob) || /\brmc\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) {
    return "RMC";
  }

  if (/\brevenue memorandum order\b/i.test(fullBlob) || /\brmo\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) {
    return "RMO";
  }

  if (/\brevenue audit memorandum order\b/i.test(fullBlob) || /\bramo\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) {
    return "RAMO";
  }

  if (/\bbir ruling\b/i.test(fullBlob) || /\bruling no\.?\b/i.test(fullBlob)) {
    return "BIR_RULING";
  }

  if (
    /\bpfrs\b/i.test(fullBlob) ||
    /\bphilippine financial reporting standards\b/i.test(fullBlob)
  ) {
    return "PFRS";
  }

  if (
    /\bpas\b/i.test(fullBlob) ||
    /\bphilippine accounting standards\b/i.test(fullBlob)
  ) {
    return "PAS";
  }

  if (
    /\bpsa\b/i.test(fullBlob) ||
    /\bphilippine standards on auditing\b/i.test(fullBlob)
  ) {
    return "PSA";
  }

  const courtType = detectCourtType(fullBlob);
  if (courtType) return courtType;

  if (
    /\btax treaty\b/i.test(fullBlob) ||
    /\bdouble taxation agreement\b/i.test(fullBlob)
  ) {
    return "TREATY";
  }

  if (
    /\blocal tax code\b/i.test(fullBlob) ||
    /\blocal business tax\b/i.test(fullBlob)
  ) {
    return "LGU";
  }

  return "SECONDARY";
}

function normalizeLegalReference(input = "") {
  const raw = compactSpaces(input);

  if (!raw) {
    return {
      raw,
      normalized: "",
      type: null,
      aliases: []
    };
  }

  const raMatch = raw.match(/\b(?:republic act|ra|r\.a\.)\s*(?:no\.?)?\s*0*(\d{4,6})\b/i);

  if (raMatch) {
    const num = String(raMatch[1]).replace(/^0+/, "");

    return {
      raw,
      normalized: `RA_${num}`,
      type: "STATUTE",
      aliases: [`RA ${num}`, `Republic Act No. ${num}`]
    };
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i]
  ];

  for (const [type, regex] of issuancePatterns) {
    const match = raw.match(regex);

    if (match) {
      const num = String(match[1]).replace(/^0+/, "");
      const year = normalizeYear(match[2]);

      return {
        raw,
        normalized: `${type}_${num}_${year}`,
        type,
        aliases: [
          `${type} ${num}-${year}`,
          `${type} No. ${num}-${year}`
        ]
      };
    }
  }

  const grMatch = raw.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);

  if (grMatch) {
    const ref = String(grMatch[1]).toUpperCase();

    return {
      raw,
      normalized: `GR_${ref.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "SUPREME_COURT",
      aliases: [`G.R. No. ${ref}`]
    };
  }

  const courtType = detectCourtType(raw);

  return {
    raw,
    normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    type: courtType,
    aliases: [raw]
  };
}

function buildAuthorityMetadata({
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

  const normalized = normalizeLegalReference(`${fileName} ${path}`);

  return {
    authorityType,
    authorityLevel: AUTHORITY_LEVEL[authorityType] || 99,
    authorityScore: AUTHORITY_SCORE[authorityType] || 0,
    authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
    controllingPrecedence: CONTROLLING_PRECEDENCE[authorityType] || 99,
    normalizedReference: normalized.normalized || null,
    normalizedAliases: normalized.aliases || [],
    modifiedTime,
    recencyDate: modifiedTime || null,
    tinaAuthorityEngineVersion: ENGINE_VERSION
  };
}

function getAuthorityTypeForDoc(doc = {}) {
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

function getAuthorityLevelForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    AUTHORITY_LEVEL[type] ||
    99
  );
}

function getAuthorityScoreForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return (
    Number(doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore) ||
    AUTHORITY_SCORE[type] ||
    0
  );
}

function getControllingPrecedenceForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return (
    Number(
      doc.controllingPrecedence ||
      doc.controlling_precedence ||
      doc.metadata?.controllingPrecedence
    ) ||
    CONTROLLING_PRECEDENCE[type] ||
    99
  );
}

function computeAuthorityPriorityBonus(doc = {}) {
  const precedence = getControllingPrecedenceForDoc(doc);

  if (precedence <= 2) return 65;
  if (precedence <= 4) return 52;
  if (precedence <= 8) return 26;
  if (precedence <= 12) return 12;
  if (precedence >= 98) return -60;

  return 0;
}

function computeIssueMatchBonus(query = "", doc = {}) {
  const q = lower(query);
  const blob = lower(buildAuthorityBlob(doc));
  let score = 0;

  const issueAnchors = [
    "vat",
    "withholding",
    "income tax",
    "mcit",
    "nolco",
    "refund",
    "substantiation",
    "invoice",
    "receipt",
    "contract",
    "lease",
    "principal",
    "agent",
    "audit",
    "pfrs",
    "economic substance",
    "assessment",
    "protest",
    "jurisdiction",
    "prescription"
  ];

  for (const anchor of issueAnchors) {
    if (q.includes(anchor) && blob.includes(anchor)) score += 14;
  }

  return score;
}

function rerankByHierarchy(results = [], query = "") {
  return safeArray(results)
    .map((doc) => {
      const authorityType = getAuthorityTypeForDoc(doc);
      const semanticScore = Number(
        doc.rerankScore ||
        doc.finalScore ||
        doc.final_score ||
        doc.score ||
        doc.similarity ||
        0
      );

      const authorityScore = getAuthorityScoreForDoc(doc);
      const issueMatchBonus = computeIssueMatchBonus(query, doc);
      const authorityPriorityBonus = computeAuthorityPriorityBonus(doc);
      const controllingPrecedence = getControllingPrecedenceForDoc(doc);
      const authorityLevel = getAuthorityLevelForDoc(doc);

      /**
       * IMPORTANT:
       * Semantic score can NEVER overpower hierarchy.
       */

      const hierarchyWeight =
        (100 - Math.min(controllingPrecedence, 99)) * 4;

      const finalScore =
        hierarchyWeight +
        authorityScore * 0.30 +
        semanticScore * 0.18 +
        issueMatchBonus * 0.14 +
        authorityPriorityBonus;

      return {
        ...doc,
        authorityType,
        authority_type: authorityType,
        authorityLevel,
        authority_level: authorityLevel,
        authorityScore,
        authority_score: authorityScore,
        authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
        authority_label: AUTHORITY_LABEL[authorityType] || authorityType,
        controllingPrecedence,
        controlling_precedence: controllingPrecedence,
        issueMatchBonus,
        authorityPriorityBonus,
        hierarchyWeight,
        finalScore,
        final_score: finalScore
      };
    })
    .sort((a, b) => {
      const precedenceA = Number(a.controllingPrecedence || a.controlling_precedence || 99);
      const precedenceB = Number(b.controllingPrecedence || b.controlling_precedence || 99);

      /**
       * STRICT PRECEDENCE ENFORCEMENT
       */

      if (precedenceA !== precedenceB) {
        return precedenceA - precedenceB;
      }

      /**
       * ONLY if same precedence:
       * compare final score
       */

      return Number(b.finalScore || 0) - Number(a.finalScore || 0);
    });
}

function selectTopLegalBases(results = [], maxItems = 3) {
  return rerankByHierarchy(results)
    .filter((doc) => {
      const type = getAuthorityTypeForDoc(doc);
      return type !== "SECONDARY" && type !== "UNKNOWN";
    })
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(
        doc.text ||
        doc.content ||
        doc.excerpt ||
        ""
      ).slice(0, 700)
    }));
}

function buildAuthorityHierarchyText() {
  return [
    "1. Constitution",
    "2. NIRC / Republic Acts / Statutes",
    "3. Supreme Court Decisions",
    "4. Revenue Regulations",
    "5. Tax Treaties",
    "6. RMC / RMO / RAMO",
    "7. BIR Rulings",
    "8. CTA / Court of Appeals",
    "9. PFRS / PAS / PSA",
    "10. Secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "Constitution controls all.",
    "Statutes control administrative issuances.",
    "Supreme Court doctrine controls conflicting administrative interpretations.",
    "Revenue Regulations implement statutes but cannot amend statutes.",
    "Administrative issuances cannot override statutes or Supreme Court doctrine.",
    "CTA and Court of Appeals decisions may be persuasive but are not controlling over Supreme Court doctrine.",
    "PFRS/PAS/PSA govern accounting and auditing standards but cannot override tax statutes.",
    "Secondary materials are never controlling authority."
  ].join("\n");
}

function buildStrictAnswerPrompt({
  hookMode = "ASK",
  originalQuestion = "",
  cleanQuestion = "",
  context = "",
  topLegalBases = [],
  conflict = null
}) {
  const legalBasesText = topLegalBases.length
    ? topLegalBases
        .map(
          (item, idx) =>
            `${idx + 1}. [${item.authorityLabel}] ${
              item.source || getDocSource(item)
            }
Authority Type: ${item.authorityType}
Authority Level: ${item.authorityLevel}
Controlling Precedence: ${
              item.controllingPrecedence || item.controlling_precedence || 99
            }
Excerpt: ${item.excerpt || ""}`
        )
        .join("\n\n")
    : "No controlling legal basis retrieved.";

  return `
You are TINA — Philippine Tax Intelligence and Analysis System.

ACTIVE MODE:
${hookMode}

MANDATORY RULES:
- Apply Philippine legal hierarchy strictly.
- Controlling precedence ALWAYS prevails over semantic similarity.
- Do not perform citation dumping.
- Do not mix unrelated cases.
- Distinguish substantive vs procedural doctrine.
- Distinguish VAT liability vs VAT refund doctrine.
- Distinguish evidentiary vs jurisdictional requirements.
- Explain controlling authority clearly.
- Disclose limitations if authorities are incomplete.
- If a conflict exists, explain:
  - exact issue,
  - exact legal dimension,
  - controlling authority,
  - why it controls.

AUTHORITY HIERARCHY:
${buildAuthorityHierarchyText()}

CONTROLLING PRECEDENCE:
${buildControllingPrecedenceText()}

QUESTION:
${originalQuestion}

NORMALIZED QUESTION:
${cleanQuestion}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT ANALYSIS:
${conflict?.reason || "No direct doctrinal conflict detected."}

INDEXED CONTEXT:
${context}

FINAL INSTRUCTION:
Return only the final legal analysis answer.
`.trim();
}

function authorityEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_AUTHORITY_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    vectorStoreCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    conflictCompatible: true,
    rerankerCompatible: true,
    rendererCompatible: true,
    strictHierarchyEnforced: true,
    strictControllingPrecedence: true
  };
}

export {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES,
  normalizeText,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,
  rerankByHierarchy,
  selectTopLegalBases,
  buildAuthorityHierarchyText,
  buildControllingPrecedenceText,
  buildStrictAnswerPrompt,
  authorityEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES,
  normalizeText,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,
  rerankByHierarchy,
  selectTopLegalBases,
  buildAuthorityHierarchyText,
  buildControllingPrecedenceText,
  buildStrictAnswerPrompt,
  authorityEngineHealthCheck
};
