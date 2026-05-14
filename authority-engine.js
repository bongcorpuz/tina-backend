// FILE: authority-engine.js
"use strict";

/**
 * TINA AUTHORITY ENGINE
 * Enterprise Legal Hierarchy + Authority Classification Engine
 * Production Adaptive Version
 */

const ENGINE_VERSION = "2.3.0";

const AUTHORITY_LEVEL = Object.freeze({
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
  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",
  BIR_RULING: "BIR Ruling",
  SUPREME_COURT: "Supreme Court Decision",
  CTA_EN_BANC: "CTA En Banc Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",
  CTA_DIVISION: "CTA Division Decision",
  TREATY: "Tax Treaty",
  LGU: "Local Tax Ordinance",
  SECONDARY: "Secondary Material",
  UNKNOWN: "Unknown Authority"
});

const CONTROLLING_PRECEDENCE = Object.freeze({
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
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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
  const parts = String(value || "")
    .split(/[\\/]/)
    .filter(Boolean);

  return parts.length
    ? parts[parts.length - 1]
    : String(value || "");
}

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
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

  if (
    /\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) ||
    /\bsupreme court\b/i.test(raw)
  ) {
    return "SUPREME_COURT";
  }

  if (
    /\bcta en banc\b/i.test(raw) ||
    /\bcta eb\b/i.test(raw)
  ) {
    return "CTA_EN_BANC";
  }

  if (
    /\bcourt of appeals\b/i.test(raw) ||
    /\bca-g\.?r\.?\b/i.test(raw)
  ) {
    return "COURT_OF_APPEALS";
  }

  if (
    /\bcta\b/i.test(raw) ||
    /\bcta case\b/i.test(raw)
  ) {
    return "CTA_DIVISION";
  }

  return null;
}

function classifyAuthorityFromDocument({
  fileName = "",
  path = "",
  text = ""
}) {
  if (isSecondaryMaterial(path, fileName)) {
    return "SECONDARY";
  }

  const blob = lower(
    `${fileName}\n${path}\n${text}`
  );

  const courtType = detectCourtType(blob);
  if (courtType) return courtType;

  if (
    blob.includes("constitution of the philippines") ||
    blob.includes("1987 philippine constitution")
  ) {
    return "CONSTITUTION";
  }

  if (
    blob.includes("national internal revenue code") ||
    /\bnirc\b/.test(blob) ||
    /\btax code\b/.test(blob) ||
    /\brepublic act\b/.test(blob) ||
    /\bra\s+\d{4,6}\b/.test(blob)
  ) {
    return "STATUTE";
  }

  if (
    /\brr\s*\d+[-/]\d{2,4}\b/i.test(blob) ||
    blob.includes("revenue regulation")
  ) {
    return "RR";
  }

  if (
    /\brmc\s*\d+[-/]\d{2,4}\b/i.test(blob) ||
    blob.includes("revenue memorandum circular")
  ) {
    return "RMC";
  }

  if (
    /\brmo\s*\d+[-/]\d{2,4}\b/i.test(blob) ||
    blob.includes("revenue memorandum order")
  ) {
    return "RMO";
  }

  if (
    /\bramo\s*\d+[-/]\d{2,4}\b/i.test(blob) ||
    blob.includes("revenue audit memorandum order")
  ) {
    return "RAMO";
  }

  if (
    blob.includes("bir ruling") ||
    /\bruling no\.?\b/i.test(blob)
  ) {
    return "BIR_RULING";
  }

  if (
    blob.includes("tax treaty") ||
    blob.includes("international agreement")
  ) {
    return "TREATY";
  }

  if (
    blob.includes("ordinance") ||
    blob.includes("local tax code")
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

  const l = lower(raw);

  if (
    l.includes("constitution")
  ) {
    return {
      raw,
      normalized: "1987_PHILIPPINE_CONSTITUTION",
      type: "CONSTITUTION",
      aliases: [
        "constitution",
        "1987 constitution"
      ]
    };
  }

  const raMatch = raw.match(
    /\b(?:republic act|ra)\s*(?:no\.?)?\s*0*(\d+)\b/i
  );

  if (raMatch) {
    const num = String(raMatch[1]).replace(/^0+/, "");

    return {
      raw,
      normalized: `RA_${num}`,
      type: "STATUTE",
      aliases: [
        `ra ${num}`,
        `ra no ${num}`,
        `republic act no ${num}`
      ]
    };
  }

  const issuancePatterns = [
    ["RR", /\brr\s*0*(\d+)[-/ ](\d{2,4})\b/i],
    ["RMC", /\brmc\s*0*(\d+)[-/ ](\d{2,4})\b/i],
    ["RMO", /\brmo\s*0*(\d+)[-/ ](\d{2,4})\b/i],
    ["RAMO", /\bramo\s*0*(\d+)[-/ ](\d{2,4})\b/i]
  ];

  for (const [type, regex] of issuancePatterns) {
    const match = raw.match(regex);

    if (match) {
      return {
        raw,
        normalized: `${type}_${match[1]}_${match[2]}`,
        type,
        aliases: [raw]
      };
    }
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

  const normalized = normalizeLegalReference(
    `${fileName} ${path}`
  );

  return {
    authorityType,
    authorityLevel: AUTHORITY_LEVEL[authorityType] || 99,
    authorityScore: AUTHORITY_SCORE[authorityType] || 0,
    authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
    controllingPrecedence:
      CONTROLLING_PRECEDENCE[authorityType] || 99,
    normalizedReference: normalized.normalized || null,
    normalizedAliases: normalized.aliases || [],
    modifiedTime,
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
      text:
        doc.text ||
        doc.content ||
        doc.excerpt ||
        ""
    })
  );
}

function getAuthorityLevelForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return (
    Number(
      doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel
    ) ||
    AUTHORITY_LEVEL[type] ||
    99
  );
}

function getAuthorityScoreForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return (
    Number(
      doc.authorityScore ||
      doc.authority_score ||
      doc.metadata?.authorityScore
    ) ||
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
  const type = getAuthorityTypeForDoc(doc);

  if (type === "CONSTITUTION") return 65;
  if (type === "STATUTE") return 60;
  if (type === "SUPREME_COURT") return 58;
  if (type === "RR") return 52;
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
    "economic substance"
  ];

  for (const anchor of issueAnchors) {
    if (
      q.includes(anchor) &&
      blob.includes(anchor)
    ) {
      score += 14;
    }
  }

  return score;
}

function rerankByHierarchy(results = [], query = "") {
  return safeArray(results)
    .map((doc) => {
      const authorityType = getAuthorityTypeForDoc(doc);

      const semanticScore =
        Number(doc.score || doc.similarity || 0);

      const authorityScore =
        getAuthorityScoreForDoc(doc);

      const issueMatchBonus =
        computeIssueMatchBonus(query, doc);

      const authorityPriorityBonus =
        computeAuthorityPriorityBonus(doc);

      const finalScore =
        semanticScore * 0.32 +
        authorityScore * 0.42 +
        issueMatchBonus * 0.16 +
        authorityPriorityBonus * 0.10;

      return {
        ...doc,
        authorityType,
        authorityLevel:
          getAuthorityLevelForDoc(doc),
        authorityScore,
        authorityLabel:
          AUTHORITY_LABEL[authorityType] ||
          authorityType,
        controllingPrecedence:
          getControllingPrecedenceForDoc(doc),
        issueMatchBonus,
        authorityPriorityBonus,
        finalScore
      };
    })
    .sort((a, b) => {
      if (
        (a.authorityLevel || 99) !==
        (b.authorityLevel || 99)
      ) {
        return (
          (a.authorityLevel || 99) -
          (b.authorityLevel || 99)
        );
      }

      return b.finalScore - a.finalScore;
    });
}

function selectTopLegalBases(results = [], maxItems = 3) {
  return rerankByHierarchy(results)
    .filter(
      (doc) =>
        getAuthorityTypeForDoc(doc) !== "SECONDARY"
    )
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      source:
        getDocPath(doc) ||
        getDocSource(doc),
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
    "3. Revenue Regulations",
    "4. Supreme Court Decisions",
    "5. RMC / RMO / RAMO",
    "6. BIR Rulings",
    "7. CTA / Court of Appeals",
    "8. Secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "Constitution controls all.",
    "Statutes control administrative issuances.",
    "Revenue Regulations implement but cannot amend statutes.",
    "Supreme Court doctrine prevails over inconsistent administrative interpretation.",
    "Administrative issuances cannot override Supreme Court doctrine.",
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
  const legalBasesText =
    topLegalBases.length
      ? topLegalBases
          .map(
            (item, idx) =>
              `${idx + 1}. [${
                item.authorityLabel
              }] ${
                item.source ||
                getDocSource(item)
              }\nAuthority Type: ${
                item.authorityType
              }\nAuthority Level: ${
                item.authorityLevel
              }\nExcerpt: ${
                item.excerpt || ""
              }`
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
${
  conflict?.reason ||
  "No direct doctrinal conflict detected."
}

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
    adaptiveCompatible: true,
    plannerCompatible: true,
    conflictCompatible: true,
    rerankerCompatible: true,
    rendererCompatible: true
  };
}

module.exports = {
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
