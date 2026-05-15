// FILE: authority-engine.js
"use strict";

/**
 * TINA AUTHORITY ENGINE
 * Version: 2.4.1
 *
 * Patch:
 * - Preserves CommonJS export format.
 * - Aligned with vector-store.js authority metadata usage.
 * - Distinguishes authority level from controlling precedence.
 * - Avoids misclassifying BIR issuances as court cases merely because they mention cases.
 * - Strengthens exact RR/RMC/RMO/RAMO/RA/GR normalization.
 */

const ENGINE_VERSION = "2.4.1";

const AUTHORITY_LEVEL = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  RR: 3,
  SUPREME_COURT: 4,
  TREATY: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  SECONDARY: 99,
  UNKNOWN: 99
});

const AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 100,
  STATUTE: 98,
  SUPREME_COURT: 97,
  RR: 95,
  TREATY: 92,
  RMC: 86,
  RMO: 82,
  RAMO: 80,
  BIR_RULING: 72,
  CTA_EN_BANC: 70,
  COURT_OF_APPEALS: 68,
  CTA_DIVISION: 64,
  LGU: 58,
  SECONDARY: 15,
  UNKNOWN: 0
});

const AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",
  STATUTE: "Statute / NIRC / Republic Act",
  RR: "Revenue Regulation",
  SUPREME_COURT: "Supreme Court Decision",
  TREATY: "Tax Treaty",
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  LGU: "Local Tax Ordinance",
  SECONDARY: "Secondary Material",
  UNKNOWN: "Unknown Authority"
});

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
  SECONDARY: 99,
  UNKNOWN: 99
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

  if (/\bcta\b/i.test(raw)) {
    return "CTA_DIVISION";
  }

  return null;
}

function classifyAuthorityFromDocument({ fileName = "", path = "", text = "" }) {
  if (isSecondaryMaterial(path, fileName)) return "SECONDARY";

  const headerBlob = lower(`${fileName}\n${path}`);
  const fullBlob = lower(`${fileName}\n${path}\n${text}`);

  if (
    fullBlob.includes("constitution of the philippines") ||
    fullBlob.includes("1987 philippine constitution") ||
    /\b1987\s+constitution\b/i.test(fullBlob)
  ) {
    return "CONSTITUTION";
  }

  if (
    headerBlob.includes("national internal revenue code") ||
    /\bnirc\b/.test(headerBlob) ||
    /\btax code\b/.test(headerBlob) ||
    /\brepublic act\b/.test(headerBlob) ||
    /\bra\s*\d{4,6}\b/.test(headerBlob)
  ) {
    return "STATUTE";
  }

  if (/\brr\s*\d+[-/ _]\d{2,4}\b/i.test(headerBlob) || /\brevenue regulation[s]?\b/i.test(headerBlob)) {
    return "RR";
  }

  if (/\brmc\s*\d+[-/ _]\d{2,4}\b/i.test(headerBlob) || /\brevenue memorandum circular[s]?\b/i.test(headerBlob)) {
    return "RMC";
  }

  if (/\brmo\s*\d+[-/ _]\d{2,4}\b/i.test(headerBlob) || /\brevenue memorandum order[s]?\b/i.test(headerBlob)) {
    return "RMO";
  }

  if (/\bramo\s*\d+[-/ _]\d{2,4}\b/i.test(headerBlob) || /\brevenue audit memorandum order[s]?\b/i.test(headerBlob)) {
    return "RAMO";
  }

  if (/\bbir ruling\b/i.test(headerBlob) || /\bruling no\.?\b/i.test(headerBlob)) {
    return "BIR_RULING";
  }

  if (
    /\btax treaty\b/i.test(headerBlob) ||
    /\binternational tax agreement\b/i.test(headerBlob) ||
    /\bdouble taxation agreement\b/i.test(headerBlob)
  ) {
    return "TREATY";
  }

  const courtType = detectCourtType(headerBlob);
  if (courtType) return courtType;

  if (
    fullBlob.includes("national internal revenue code") ||
    /\bnirc\b/.test(fullBlob) ||
    /\btax code\b/.test(fullBlob) ||
    /\brepublic act\b/.test(fullBlob) ||
    /\bra\s*\d{4,6}\b/.test(fullBlob)
  ) {
    return "STATUTE";
  }

  if (/\brr\s*\d+[-/ _]\d{2,4}\b/i.test(fullBlob) || /\brevenue regulation[s]?\b/i.test(fullBlob)) {
    return "RR";
  }

  if (/\brmc\s*\d+[-/ _]\d{2,4}\b/i.test(fullBlob) || /\brevenue memorandum circular[s]?\b/i.test(fullBlob)) {
    return "RMC";
  }

  if (/\brmo\s*\d+[-/ _]\d{2,4}\b/i.test(fullBlob) || /\brevenue memorandum order[s]?\b/i.test(fullBlob)) {
    return "RMO";
  }

  if (/\bramo\s*\d+[-/ _]\d{2,4}\b/i.test(fullBlob) || /\brevenue audit memorandum order[s]?\b/i.test(fullBlob)) {
    return "RAMO";
  }

  if (/\bbir ruling\b/i.test(fullBlob) || /\bruling no\.?\b/i.test(fullBlob)) {
    return "BIR_RULING";
  }

  const fullCourtType = detectCourtType(fullBlob);
  if (fullCourtType) return fullCourtType;

  if (/\btax treaty\b/i.test(fullBlob) || /\bdouble taxation agreement\b/i.test(fullBlob)) {
    return "TREATY";
  }

  if (/\bord(inance)?\b/i.test(fullBlob) || /\blocal tax code\b/i.test(fullBlob) || /\blocal business tax\b/i.test(fullBlob)) {
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

  const l = lower(raw);

  if (l.includes("constitution")) {
    return {
      raw,
      normalized: "1987_PHILIPPINE_CONSTITUTION",
      type: "CONSTITUTION",
      aliases: ["constitution", "1987 constitution", "1987 philippine constitution"]
    };
  }

  const raMatch = raw.match(/\b(?:republic act|ra|r\.a\.)\s*(?:no\.?)?\s*0*(\d{4,6})\b/i);

  if (raMatch) {
    const num = String(raMatch[1]).replace(/^0+/, "");

    return {
      raw,
      normalized: `RA_${num}`,
      type: "STATUTE",
      aliases: [`ra ${num}`, `ra no ${num}`, `republic act no ${num}`]
    };
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/ _]\s*(\d{2,4})\b/i],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/ _]\s*(\d{2,4})\b/i],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/ _]\s*(\d{2,4})\b/i],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/ _]\s*(\d{2,4})\b/i]
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
        aliases: [`${type} ${num}-${year}`, `${type} No. ${num}-${year}`, raw]
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
      aliases: [`G.R. No. ${ref}`, `GR No. ${ref}`, raw]
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

function buildAuthorityMetadata({ fileName = "", path = "", text = "", modifiedTime = null }) {
  const authorityType = classifyAuthorityFromDocument({ fileName, path, text });
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
    Number(doc.controllingPrecedence || doc.controlling_precedence || doc.metadata?.controllingPrecedence) ||
    CONTROLLING_PRECEDENCE[type] ||
    99
  );
}

function computeAuthorityPriorityBonus(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  if (type === "CONSTITUTION") return 65;
  if (type === "STATUTE") return 60;
  if (type === "SUPREME_COURT") return 58;
  if (type === "RR") return 52;
  if (type === "TREATY") return 40;
  if (["RMC", "RMO", "RAMO"].includes(type)) return 28;
  if (type === "BIR_RULING") return 16;
  if (COURT_TYPES.has(type)) return 14;
  if (type === "SECONDARY") return -50;

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
      const semanticScore = Number(doc.score || doc.similarity || 0);
      const authorityScore = getAuthorityScoreForDoc(doc);
      const issueMatchBonus = computeIssueMatchBonus(query, doc);
      const authorityPriorityBonus = computeAuthorityPriorityBonus(doc);
      const controllingPrecedence = getControllingPrecedenceForDoc(doc);

      const finalScore =
        semanticScore * 0.32 +
        authorityScore * 0.42 +
        issueMatchBonus * 0.16 +
        authorityPriorityBonus * 0.10;

      return {
        ...doc,
        authorityType,
        authority_type: authorityType,
        authorityLevel: getAuthorityLevelForDoc(doc),
        authority_level: getAuthorityLevelForDoc(doc),
        authorityScore,
        authority_score: authorityScore,
        authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
        authority_label: AUTHORITY_LABEL[authorityType] || authorityType,
        controllingPrecedence,
        controlling_precedence: controllingPrecedence,
        issueMatchBonus,
        authorityPriorityBonus,
        finalScore,
        final_score: finalScore
      };
    })
    .sort((a, b) => {
      const precedenceA = Number(a.controllingPrecedence || a.controlling_precedence || 99);
      const precedenceB = Number(b.controllingPrecedence || b.controlling_precedence || 99);

      if (precedenceA !== precedenceB) return precedenceA - precedenceB;

      return Number(b.finalScore || 0) - Number(a.finalScore || 0);
    });
}

function selectTopLegalBases(results = [], maxItems = 3) {
  return rerankByHierarchy(results)
    .filter((doc) => getAuthorityTypeForDoc(doc) !== "SECONDARY")
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(doc.text || doc.content || doc.excerpt || "").slice(0, 700)
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
    "9. Secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "Constitution controls all.",
    "Statutes control administrative issuances.",
    "Supreme Court doctrine controls conflicting administrative interpretations.",
    "Revenue Regulations implement statutes but cannot amend them.",
    "Administrative issuances cannot override statutes or Supreme Court doctrine.",
    "CTA and Court of Appeals cases may be persuasive but are not controlling over Supreme Court doctrine.",
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
            }\nAuthority Type: ${item.authorityType}\nAuthority Level: ${
              item.authorityLevel
            }\nControlling Precedence: ${
              item.controllingPrecedence || item.controlling_precedence || 99
            }\nExcerpt: ${item.excerpt || ""}`
        )
        .join("\n\n")
    : "No controlling legal basis retrieved.";

  return `
You are TINA — Philippine Tax Intelligence and Analysis System.

ACTIVE MODE:
${hookMode}

MANDATORY RULES:
- Apply Philippine legal hierarchy strictly.
- Do not perform citation dumping.
- Do not mix unrelated cases.
- Distinguish substantive vs procedural doctrine.
- Distinguish VAT liability vs VAT refund doctrine.
- Distinguish evidentiary vs jurisdictional requirements.
- Explain controlling authority clearly.
- Disclose limitations if authorities are incomplete.
- If a conflict exists, explain the exact issue, controlling authority, and why it controls.

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
    commonJsCompatible: true,
    vectorStoreCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    conflictCompatible: true,
    rerankerCompatible: true,
    rendererCompatible: true
  };
}
