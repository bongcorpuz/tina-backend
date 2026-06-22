"use strict";

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildAdminIssuanceYearLookupVariants(term = "") {
  const raw = String(term || "").trim();
  if (!raw) return [];

  const patterns = [
    {
      prefix: "RR",
      longName: "Revenue Regulations",
      regex: /\b(?:RR|Revenue\s+Regulations?)\s*(?:No\.?)?\s*0*(\d+)\s*[-/. ]+\s*(19\d{2})\b/i
    },
    {
      prefix: "RMC",
      longName: "Revenue Memorandum Circular",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circulars?)\s*(?:No\.?)?\s*0*(\d+)\s*[-/. ]+\s*(19\d{2})\b/i
    },
    {
      prefix: "RMO",
      longName: "Revenue Memorandum Order",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*0*(\d+)\s*[-/. ]+\s*(19\d{2})\b/i
    },
    {
      prefix: "RAMO",
      longName: "Revenue Audit Memorandum Order",
      regex: /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*0*(\d+)\s*[-/. ]+\s*(19\d{2})\b/i
    }
  ];

  for (const { prefix, longName, regex } of patterns) {
    const match = raw.match(regex);
    if (!match) continue;

    const number = String(Number(match[1]));
    const fullYear = match[2];
    const shortYear = fullYear.slice(-2);

    return unique([
      `${prefix} No. ${number}-${fullYear}`,
      `${prefix} ${number}-${fullYear}`,
      `${longName} No. ${number}-${fullYear}`,
      `${longName} ${number}-${fullYear}`,
      `${prefix} No. ${number}-${shortYear}`,
      `${prefix} ${number}-${shortYear}`,
      `${longName} No. ${number}-${shortYear}`,
      `${longName} ${number}-${shortYear}`
    ]);
  }

  return [];
}

function buildNormalizedRefVariants(terms = [], { normalizeLegalReference } = {}) {
  const variants = [];
  for (const term of terms) {
    if (!term) continue;
    variants.push(term);
    try {
      const nr = typeof normalizeLegalReference === "function"
        ? normalizeLegalReference(term)
        : {};
      if (nr.normalized) variants.push(nr.normalized);
      for (const alias of (nr.aliases || [])) {
        if (alias) variants.push(alias);
      }
    } catch {
      // normalizeLegalReference is best-effort; failures are safe to ignore
    }
    variants.push(...buildAdminIssuanceYearLookupVariants(term));
  }
  return unique(variants).filter(Boolean);
}

function isRecognizableAuthorityReference(input = "") {
  const s = String(input || "");
  return (
    /\b(?:RR|Revenue\s+Regulations?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RMC|Revenue\s+Memorandum\s+Circulars?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RMO|Revenue\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Orders?)\s*(?:No\.?)?\s*\d+\s*[-_/]\s*\d{2,4}\b/i.test(s) ||
    /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)\s+sec(?:tion)?\.?\s*\d{1,3}[A-Z]?\b/i.test(s) ||
    /\bsec(?:tion)?\.?\s*\d{1,3}[A-Z]?\s+(?:of\s+(?:the\s+)?)?(?:nirc|tax\s+code)\b/i.test(s) ||
    /\bg\.?\s*r\.?\s*no\.?\s*\d/i.test(s) ||
    /\bcta\s+(?:eb\s+)?(?:case\s+)?no\.?\s*\d/i.test(s) ||
    /\b(?:RA|R\.A\.|Republic\s+Act)\s*(?:No\.?)?\s*\d{4,6}\b/i.test(s)
  );
}

export {
  buildAdminIssuanceYearLookupVariants,
  buildNormalizedRefVariants,
  isRecognizableAuthorityReference
};
