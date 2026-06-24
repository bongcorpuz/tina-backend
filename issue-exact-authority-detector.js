// FILE: issue-exact-authority-detector.js
"use strict";

import { detectAdministrativeAuthorityReference } from "./authority-alias-registry.js";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isCreateActAuthorityAlias(value = "") {
  const text = normalizeText(value);
  return (
    /\bCREATE\s+Act\b/i.test(text) ||
    /\bCorporate\s+Recovery\s+and\s+Tax\s+Incentives\s+for\s+Enterprises\s+Act\b/i.test(text)
  );
}

function isTrainLawAuthorityAlias(value = "") {
  const text = normalizeText(value);
  return (
    /\bTRAIN\s+Law\b/i.test(text) ||
    /\bTax\s+Reform\s+for\s+Acceleration\s+and\s+Inclusion\s+Act\b/i.test(text)
  );
}

function detectExactAuthority(question = "") {
  const value = normalizeText(question);

  if (isCreateActAuthorityAlias(value)) {
    return {
      detected: true,
      type: "STATUTE",
      reference: "RA 11534",
      number: "11534",
      year: null
    };
  }

  if (isTrainLawAuthorityAlias(value)) {
    return {
      detected: true,
      type: "STATUTE",
      reference: "RA 10963",
      number: "10963",
      year: null
    };
  }

  const administrativeAuthority = detectAdministrativeAuthorityReference(value);
  if (administrativeAuthority.detected) return administrativeAuthority;

  const ra = value.match(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i);
  if (ra) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `RA ${ra[1]}`,
      number: ra[1],
      year: null
    };
  }

  const nircSec = value.match(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(\d+[a-z]?(?:\([a-z0-9]+\))*)\b/i);
  if (nircSec) {
    return {
      detected: true,
      type: "STATUTE",
      reference: `NIRC Sec. ${nircSec[1]}`,
      number: nircSec[1],
      year: null
    };
  }

  const gr = value.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);
  if (gr) {
    return {
      detected: true,
      type: "SUPREME_COURT",
      reference: `G.R. No. ${gr[1]}`,
      number: gr[1],
      year: null
    };
  }

  const ctaEb = value.match(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i);
  if (ctaEb) {
    return {
      detected: true,
      type: "CTA_EN_BANC",
      reference: `CTA EB No. ${ctaEb[1]}`,
      number: ctaEb[1],
      year: null
    };
  }

  const cta = value.match(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i);
  if (cta) {
    return {
      detected: true,
      type: "CTA_DIVISION",
      reference: `CTA Case No. ${cta[1]}`,
      number: cta[1],
      year: null
    };
  }

  return {
    detected: false,
    type: null,
    reference: null,
    number: null,
    year: null
  };
}

export {
  isCreateActAuthorityAlias,
  isTrainLawAuthorityAlias,
  detectExactAuthority
};

export default {
  isCreateActAuthorityAlias,
  isTrainLawAuthorityAlias,
  detectExactAuthority
};
