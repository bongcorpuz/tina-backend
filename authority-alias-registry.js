"use strict";

const ADMINISTRATIVE_AUTHORITY_TYPES = Object.freeze(["RR", "RMC", "RMO", "RAMO"]);
const EXACT_ADMINISTRATIVE_AUTHORITY_TYPES = ADMINISTRATIVE_AUTHORITY_TYPES;

const ADMINISTRATIVE_AUTHORITY_PATTERNS = Object.freeze([
  ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
  ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
  ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i],
  ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i]
]);

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/[â€œâ€]/g, '"')
    .replace(/[â€˜â€™]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeAdminAuthorityYear(year = "") {
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

function normalizeAdministrativeAuthorityReference(type = "", number = "", year = "") {
  const normalizedType = String(type || "").trim().toUpperCase();
  if (!ADMINISTRATIVE_AUTHORITY_TYPES.includes(normalizedType)) return null;

  const normalizedNumber = String(Number(number));
  if (!normalizedNumber || normalizedNumber === "NaN") return null;

  const normalizedYear = normalizeAdminAuthorityYear(year);
  if (!normalizedYear) return null;

  return {
    detected: true,
    type: normalizedType,
    reference: `${normalizedType} No. ${normalizedNumber}-${normalizedYear}`,
    number: normalizedNumber,
    year: normalizedYear
  };
}

function detectAdministrativeAuthorityReference(question = "") {
  const value = normalizeText(question);

  for (const [type, regex] of ADMINISTRATIVE_AUTHORITY_PATTERNS) {
    const match = value.match(regex);
    if (!match) continue;

    return normalizeAdministrativeAuthorityReference(type, match[1], match[2]);
  }

  return {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  };
}

function isExactAdministrativeAuthorityLookup(
  question = "",
  exactAuthority = {},
  {
    detectDefinitionPattern = () => false,
    detectOverviewPattern = () => false,
    detectSourcePattern = () => false
  } = {}
) {
  if (!exactAuthority?.detected) return false;
  if (!ADMINISTRATIVE_AUTHORITY_TYPES.includes(String(exactAuthority.type || "").toUpperCase())) return false;

  const q = lower(question);
  if (!q) return false;

  const isBareIssuanceCitation =
    exactAuthority.detected === true &&
    /^\s*(?:(?:rr|rmc|rmo|ramo)|revenue\s+regulations?|revenue\s+memorandum\s+circulars?|revenue\s+memorandum\s+orders?|revenue\s+audit\s+memorandum\s+orders?)\s*(?:no\.?\s*)?\d+[-/. ]+\d{2,4}\s*$/i.test(q);
  if (isBareIssuanceCitation) return true;

  const topicModifierLookup =
    /\bwhat\s+does\b[\s\S]{0,80}\b(?:provide|say|state|cover|discuss)\b(?:\s+(?:about|on|regarding)\b[\s\S]{0,80})?/i.test(q);

  return (
    detectDefinitionPattern(question) ||
    detectOverviewPattern(question) ||
    detectSourcePattern(question) ||
    topicModifierLookup ||
    /\b(?:explain|summari[sz]e|what\s+is|what\s+are|show\s+sources?\s+for|source[s]?\s+for)\b/i.test(q)
  );
}

export {
  ADMINISTRATIVE_AUTHORITY_TYPES,
  EXACT_ADMINISTRATIVE_AUTHORITY_TYPES,
  normalizeAdminAuthorityYear,
  normalizeAdministrativeAuthorityReference,
  detectAdministrativeAuthorityReference,
  isExactAdministrativeAuthorityLookup
};
