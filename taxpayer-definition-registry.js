"use strict";

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

function isDefinitionPattern(question = "") {
  const q = lower(question);

  return Boolean(
    /\b(what is|define|definition of|meaning of|ano ang|ano ibig sabihin|nature of)\b/i.test(q) &&
      !/\b(explain|discuss|analyze|risk|case|jurisprudence|compare|compute|review|quiz|source|sources)\b/i.test(q)
  );
}

const RESIDENT_CITIZEN_INCOME_SCOPE = Object.freeze({
  primaryIssue: "INCOME_TAX",
  domainCode: "CIT",
  domainName: "Income Tax",
  targetAuthorities: ["NIRC Sec. 23"],
  controllingAuthorities: ["NIRC Sec. 23"],
  supportingAuthorities: [],
  supportingJurisprudence: []
});

const TAXPAYER_DEFINITION = Object.freeze({
  primaryIssue: "INCOME_TAX",
  domainCode: "CIT",
  domainName: "Income Tax",
  targetAuthorities: ["NIRC Sec. 22"],
  controllingAuthorities: ["NIRC Sec. 22"],
  supportingAuthorities: [],
  supportingJurisprudence: []
});

function isResidentCitizenIncomeScopeQuery(question = "") {
  const q = lower(question);
  if (!/\bresident\s+citizens?\b/i.test(q)) return false;

  return Boolean(
    /\btaxable\b/i.test(q) ||
      /\bincome\b/i.test(q) ||
      /\bphilippine[-\s]+source\b/i.test(q) ||
      /\bsource\s+income\b/i.test(q) ||
      /\bsources?\s+within\b/i.test(q) ||
      /\bsources?\s+without\b/i.test(q) ||
      /\bwithin\s+and\s+without\b/i.test(q) ||
      /\bworldwide\s+income\b/i.test(q) ||
      /\bnirc\b/i.test(q) ||
      /\btax\s+code\b/i.test(q)
  );
}

function hasTaxOrNircContext(question = "", { taxpayerStatus = false } = {}) {
  const q = lower(question);

  return Boolean(
    /\bnirc\b/i.test(q) ||
      /\bnational\s+internal\s+revenue\s+code\b/i.test(q) ||
      /\btax\s+code\b/i.test(q) ||
      /\bphilippine\s+(?:tax|taxation|income\s+tax)\b/i.test(q) ||
      /\bincome\s+tax\b/i.test(q) ||
      /\btax(?:es|able|ation)?\b/i.test(q) ||
      taxpayerStatus
  );
}

function isTaxpayerDefinitionQuery(question = "") {
  const q = lower(question);
  if (!isDefinitionPattern(question)) return false;

  const citizenOrAlienStatus =
    /\b(?:non[-\s]?resident|resident)\s+citizens?\b/i.test(q) ||
    /\b(?:non[-\s]?resident|resident)\s+aliens?\b/i.test(q);

  const corporationStatus =
    /\b(?:resident|non[-\s]?resident)\s+foreign\s+corporations?\b/i.test(q) ||
    /\bdomestic\s+corporations?\b/i.test(q) ||
    /\bforeign\s+corporations?\b/i.test(q);

  const taxpayerStatus = /\btaxpayers?\b/i.test(q);

  if (!citizenOrAlienStatus && !corporationStatus && !taxpayerStatus) return false;

  const distinctiveTaxpayerCorporation =
    /\b(?:resident|non[-\s]?resident)\s+foreign\s+corporations?\b/i.test(q);

  return Boolean(hasTaxOrNircContext(question, { taxpayerStatus }) || distinctiveTaxpayerCorporation);
}

export {
  RESIDENT_CITIZEN_INCOME_SCOPE,
  TAXPAYER_DEFINITION,
  hasTaxOrNircContext,
  isResidentCitizenIncomeScopeQuery,
  isTaxpayerDefinitionQuery
};
