// FILE: authority-utils.js
"use strict";

import {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  CONTROLLING_PRECEDENCE,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL
} from "./authority-constants.js";

export function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function compactSpaces(value = "") {
  return normalizeText(value);
}

export function lower(value = "") {
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

export function getDocPath(doc = {}) {
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

  if (/\bcta\s+en\s+banc\b/i.test(raw) || /\bcta\s+eb\b/i.test(raw)) return "CTA_EN_BANC";
  if (/\bcourt\s+of\s+appeals\b/i.test(raw) || /\bca-?g\.?\s*r\.?\b/i.test(raw)) return "COURT_OF_APPEALS";
  if (/\bcta\s+case\s+no\.?\b/i.test(raw) || /\bcta\s+division\b/i.test(raw)) return "CTA_DIVISION";
  if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) || /\bsupreme\s+court\b/i.test(raw)) return "SUPREME_COURT";

  return null;
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    TAX_TREATY: "TAX_TREATY",
    TREATY: "TAX_TREATY",
    BOC: "BOC_ISSUANCE",
    CUSTOMS: "BOC_ISSUANCE",
    OECD: "OECD_GUIDANCE"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

export function classifyAuthorityFromDocument({ fileName = "", path = "", text = "" }) {
  if (isSecondaryMaterial(path, fileName)) return "SECONDARY";

  const fullBlob = lower(`${fileName}\n${path}\n${text}`);

  if (fullBlob.includes("constitution of the philippines") || /\b1987\s+constitution\b/i.test(fullBlob)) return "CONSTITUTION";

  if (/\bnirc\b/.test(fullBlob) || /\btax code\b/.test(fullBlob) || /\brepublic act\b/.test(fullBlob) || /\bra\s*\d{4,6}\b/.test(fullBlob)) return "STATUTE";

  if (/\brevenue regulation\b/i.test(fullBlob) || /\brr\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) return "RR";
  if (/\brevenue memorandum circular\b/i.test(fullBlob) || /\brmc\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) return "RMC";
  if (/\brevenue memorandum order\b/i.test(fullBlob) || /\brmo\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) return "RMO";
  if (/\brevenue audit memorandum order\b/i.test(fullBlob) || /\bramo\s*\d+[-/_ ]\d+\b/i.test(fullBlob)) return "RAMO";
  if (/\bbir ruling\b/i.test(fullBlob) || /\bruling no\.?\b/i.test(fullBlob)) return "BIR_RULING";

  if (/\btax treaty\b/i.test(fullBlob) || /\bdouble taxation agreement\b/i.test(fullBlob) || /\bdta\b/i.test(fullBlob)) return "TAX_TREATY";

  if (/\bcmta\b/i.test(fullBlob) || /\bbureau of customs\b/i.test(fullBlob) || /\bboc\b/i.test(fullBlob) || /\bcustoms memorandum\b/i.test(fullBlob) || /\btariff\b/i.test(fullBlob)) return "BOC_ISSUANCE";

  if (/\boecd\b/i.test(fullBlob) || /\btransfer pricing guidelines\b/i.test(fullBlob)) return "OECD_GUIDANCE";

  if (/\bpfrs\b/i.test(fullBlob) || /\bphilippine financial reporting standards\b/i.test(fullBlob)) return "PFRS";
  if (/\bpas\b/i.test(fullBlob) || /\bphilippine accounting standards\b/i.test(fullBlob)) return "PAS";
  if (/\bpsa\b/i.test(fullBlob) || /\bphilippine standards on auditing\b/i.test(fullBlob)) return "PSA";

  const courtType = detectCourtType(fullBlob);
  if (courtType) return courtType;

  if (/\blocal tax code\b/i.test(fullBlob) || /\blocal business tax\b/i.test(fullBlob)) return "LGU";

  return "SECONDARY";
}

export function normalizeLegalReference(input = "") {
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

  if (/\btax treaty\b|\bdouble taxation agreement\b|\bdta\b/i.test(raw)) {
    return {
      raw,
      normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
      type: "TAX_TREATY",
      aliases: [raw]
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
        aliases: [`${type} ${num}-${year}`, `${type} No. ${num}-${year}`]
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

export function buildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
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

export function getAuthorityTypeForDoc(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    null;

  if (explicit) return normalizeAuthorityType(explicit);

  return classifyAuthorityFromDocument({
    fileName: getDocSource(doc),
    path: getDocPath(doc),
    text: doc.text || doc.content || doc.excerpt || ""
  });
}

export function getAuthorityLevelForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  return Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) || AUTHORITY_LEVEL[type] || 99;
}

export function getAuthorityScoreForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  return Number(doc.authorityScore || doc.authority_score || doc.metadata?.authorityScore) || AUTHORITY_SCORE[type] || 0;
}

export function getControllingPrecedenceForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);
  return Number(doc.controllingPrecedence || doc.controlling_precedence || doc.metadata?.controllingPrecedence) || CONTROLLING_PRECEDENCE[type] || 99;
}

export function computeIssueMatchBonus(query = "", doc = {}) {
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
    "prescription",
    "customs",
    "tariff",
    "treaty",
    "transfer pricing"
  ];

  for (const anchor of issueAnchors) {
    if (q.includes(anchor) && blob.includes(anchor)) score += 14;
  }

  return score;
}

export function computeAuthorityPriorityBonus(doc = {}) {
  const precedence = getControllingPrecedenceForDoc(doc);

  if (precedence <= 2) return 65;
  if (precedence <= 4) return 52;
  if (precedence <= 8) return 26;
  if (precedence <= 12) return 12;
  if (precedence >= 98) return -60;

  return 0;
}
