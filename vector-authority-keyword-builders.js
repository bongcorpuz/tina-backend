// FILE: vector-authority-keyword-builders.js
"use strict";

const CURRENT_YEAR = new Date().getFullYear();

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

export function normalizeSourceName(name = "") {
  return String(name || "")
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
    .replace(/\brev\.?\s*audit\.?\s*memo\.?\s*order\b/g, "ramo")
    .replace(/\brepublic act\b/g, "ra")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_\u2013\u2014]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/[\\/]+/g, "/")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

export function normalizeForMatch(value = "") {
  return normalizeSourceName(value)
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[\\/]/g, "-")
    .replace(/[_\s]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function normalizeAuthorityReference(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  return normalizeForMatch(raw)
    .replace(/\bnirc-sec(?:tion)?-?/g, "nirc-sec-")
    .replace(/\bsec(?:tion)?-?/g, "sec-")
    .replace(/\brevenue-regulation[s]?\b/g, "rr")
    .replace(/\brevenue-memorandum-circular[s]?\b/g, "rmc")
    .replace(/\brevenue-memorandum-order[s]?\b/g, "rmo")
    .replace(/\brr-0+(\d+)/g, "rr-$1")
    .replace(/\brmc-0+(\d+)/g, "rmc-$1")
    .replace(/\brmo-0+(\d+)/g, "rmo-$1")
    .replace(/\bramo-0+(\d+)/g, "ramo-$1")
    .replace(/-+/g, "-");
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = CURRENT_YEAR % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function expandYear(year = "") {
  const y = String(year || "").trim();
  if (!y) return [];

  if (y.length === 2) {
    const normalized = normalizeYear(y);
    const alternate = normalized.startsWith("20") ? `19${y}` : `20${y}`;
    return unique([normalized, alternate, y]);
  }

  return unique([y, y.slice(-2)]);
}

function padNumber(num = "") {
  const n = String(num || "").replace(/^0+/, "") || "0";
  return {
    raw: n,
    two: n.padStart(2, "0"),
    three: n.padStart(3, "0")
  };
}

export function buildIssuanceKeywords(prefix, num, year, longName) {
  const n = padNumber(num);
  const years = expandYear(year);
  const keywords = [];

  for (const y of years) {
    for (const no of [n.raw, n.two, n.three]) {
      keywords.push(`${prefix}-${no}-${y}`);
      keywords.push(`${prefix}_${no}-${y}`);
      keywords.push(`${prefix}_${no}_${y}`);
      keywords.push(`${prefix} ${no}-${y}`);
      keywords.push(`${prefix} no ${no}-${y}`);
      keywords.push(`${prefix} no. ${no}-${y}`);
      keywords.push(`${longName} no. ${no}-${y}`);
      keywords.push(`${longName} ${no}-${y}`);
    }
  }

  return keywords;
}

export function buildRepublicActKeywords(raNumber = "") {
  const clean = String(raNumber || "").replace(/\D/g, "");
  if (!clean) return [];

  return [
    `ra-${clean}`,
    `ra ${clean}`,
    `ra no ${clean}`,
    `ra no. ${clean}`,
    `republic act ${clean}`,
    `republic act no ${clean}`,
    `republic act no. ${clean}`
  ];
}

export function buildCourtKeywords(kind = "", ref = "") {
  const cleanRef = String(ref || "").trim();
  if (!cleanRef) return [];

  if (kind === "SC") {
    return [
      `g.r. no. ${cleanRef}`,
      `gr no ${cleanRef}`,
      `gr-${cleanRef}`,
      `supreme court ${cleanRef}`
    ];
  }

  if (kind === "CTA") {
    return [
      `cta case no. ${cleanRef}`,
      `cta eb no. ${cleanRef}`,
      `cta-${cleanRef}`
    ];
  }

  if (kind === "CA") {
    return [
      `ca-g.r. ${cleanRef}`,
      `ca gr ${cleanRef}`,
      `court of appeals ${cleanRef}`
    ];
  }

  return [];
}

export function buildNircSectionKeywords(section = "") {
  const clean = String(section || "").trim().replace(/\s+/g, "");
  if (!clean) return [];

  return unique([
    `nirc sec. ${clean}`,
    `nirc sec ${clean}`,
    `nirc section ${clean}`,
    `section ${clean} nirc`,
    `sec. ${clean} nirc`,
    `sec ${clean} nirc`,
    `nirc-${clean}`,
    `nirc-sec-${clean}`,
    `section-${clean}`,
    `sec-${clean}`
  ]);
}

export function buildNircSectionRawForms(section = "") {
  const base = String(section || "").trim().match(/^([0-9]{1,3}[A-Z]?)/)?.[1];
  if (!base) return [];
  return [
    `nirc sec. ${base}`,
    `nirc sec ${base}`,
    `nirc section ${base}`
  ];
}

export function sanitizeMetadataSearchTerm(value = "") {
  const clean = String(value || "")
    .toLowerCase()
    .replace(/[,%()?!"'{}[\]\\:;]/g, " ")
    .replace(/[^a-z0-9.\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);

  if (clean.length < 2) return "";
  if (!/[a-z0-9]/.test(clean)) return "";
  return clean;
}

export function buildNircLightExpansion(topic = "") {
  const t = String(topic || "").trim();
  const m = t.match(/(?:^|(?:nirc[\s_-]+)?)sec(?:tion)?\.?\s+([0-9]{1,3}[A-Z]?)(?:\b|$)/i);
  if (!m) return "";
  const rawForms = buildNircSectionRawForms(m[1]);
  if (!rawForms.length) return "";
  return "," + rawForms.map(f => sanitizeMetadataSearchTerm(f)).filter(Boolean).map(f => `normalized_reference.ilike.%${f}%`).join(",");
}

function buildSafeMetadataSearchTerms(keyword = "") {
  const normalizedKeyword = normalizeForMatch(keyword);
  const normalizedAuthority = normalizeAuthorityReference(keyword);
  const looseKeyword = String(keyword || "").replace(/-/g, "_");
  const rawTokens = String(keyword || "")
    .toLowerCase()
    .match(/\b[a-z0-9][a-z0-9._-]{2,}\b/g) || [];

  return unique([
    normalizedAuthority,
    normalizedKeyword,
    looseKeyword,
    ...rawTokens
  ].map(sanitizeMetadataSearchTerm).filter(Boolean))
    .filter((term) => term.length <= 64)
    .slice(0, 6);
}

export function buildSourceIlikeFilters(keyword) {
  const terms = buildSafeMetadataSearchTerms(keyword);
  if (!terms.length) return "";

  return terms
    .flatMap((term) => [
      `source.ilike.%${term}%`,
      `original_source.ilike.%${term}%`,
      `document_title.ilike.%${term}%`,
      `normalized_reference.ilike.%${term}%`,
      `superseded_by_reference.ilike.%${term}%`,
      `repealed_by_reference.ilike.%${term}%`,
      `amended_by_reference.ilike.%${term}%`
    ])
    .join(",");
}

export function buildPossibleSourceKeywords(query = "") {
  const q = String(query || "");
  const keywords = [];

  if (/\b(1987\s+constitution|1987\s+philippine\s+constitution|philippine\s+constitution)\b/i.test(q)) {
    keywords.push(
      "1987 constitution",
      "1987 philippine constitution",
      "constitution of the philippines"
    );
  }

  const nircRaw = [];
  const nircMatches = [...q.matchAll(/\b(?:NIRC\s*)?(?:Sec\.?|Section)\s*([0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?)\b/gi)];
  for (const match of nircMatches) {
    keywords.push(...buildNircSectionKeywords(match[1]));
    nircRaw.push(...buildNircSectionRawForms(match[1]));
  }

  const raMatch = q.match(/\b(?:RA|R\.A\.|Republic\s+Act(?:\s+No\.?)?)\s*0*(\d{4,6})\b/i);
  if (raMatch) keywords.push(...buildRepublicActKeywords(raMatch[1]));

  const issuancePatterns = [
    {
      prefix: "rr",
      longName: "revenue regulation",
      regex: /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "rmc",
      longName: "revenue memorandum circular",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "rmo",
      longName: "revenue memorandum order",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "ramo",
      longName: "revenue audit memorandum order",
      regex: /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    }
  ];

  for (const item of issuancePatterns) {
    const match = q.match(item.regex);
    if (match) keywords.push(...buildIssuanceKeywords(item.prefix, match[1], match[2], item.longName));
  }

  const grMatch = q.match(/\bg\.?\s*r\.?\s*no\.?\s*([A-Z0-9.-]+)\b/i);
  if (grMatch) keywords.push(...buildCourtKeywords("SC", grMatch[1]));

  const ctaMatch = q.match(/\bcta\s+(?:case|eb)?\s*(?:no\.?)?\s*([A-Z0-9.-]+)\b/i);
  if (ctaMatch) keywords.push(...buildCourtKeywords("CTA", ctaMatch[1]));

  return unique([...nircRaw, ...keywords.map(normalizeForMatch)].filter(Boolean));
}
