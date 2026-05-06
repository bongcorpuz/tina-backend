// FILE: named-law-engine.js

import {
  AUTHORITY_LEVEL,
  classifyAuthorityFromDocument,
  resolveCourtOverride,
  isGenuineConflict
} from "./authority-engine.js";

const OFFICIAL_SOURCES = {
  LAWPHIL: "https://lawphil.net",
  BIR: "https://www.bir.gov.ph",
  FIRB: "https://firb.gov.ph",
  DOF: "https://www.dof.gov.ph"
};

function uniq(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegex(text = "") {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

export function normalizeLawText(text = "") {
  return normalizeWhitespace(
    String(text)
      .toLowerCase()
      .replace(/[“”"'`]/g, "")
      .replace(/\brepublic\s+act\s+no\.?\s*/g, "ra ")
      .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
      .replace(/\br\.?\s*a\.?\s*/g, "ra ")
      .replace(/\bnational internal revenue code\b/g, "nirc")
      .replace(/\bease of paying taxes act\b/g, "ease of paying taxes")
      .replace(
        /\bcorporate recovery and tax incentives for enterprises act\b/g,
        "create law"
      )
      .replace(
        /\bcorporate recovery and tax incentives for enterprises\b/g,
        "create law"
      )
      .replace(
        /\btax reform for acceleration and inclusion act\b/g,
        "train law"
      )
      .replace(
        /\btax reform for acceleration and inclusion\b/g,
        "train law"
      )
      .replace(/\bcreate more act\b/g, "create more")
      .replace(/\bcreate act\b/g, "create law")
      .replace(/\beopt act\b/g, "eopt")
      .replace(/\bthe tax code\b/g, "tax code")
      .replace(/[()\-_,:;]+/g, " ")
  );
}

function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.metadata?.originalSource ||
    doc.source ||
    doc.title ||
    ""
  );
}

function buildDocHaystack(doc = {}) {
  return normalizeLawText(
    [
      doc.source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.title,
      doc.text?.slice(0, 2500),
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(doc.normalizedAliases || []),
      ...(doc.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function detectDocAuthorityType(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    "";

  if (explicit) {
    return String(explicit).toUpperCase();
  }

  return classifyAuthorityFromDocument({
    fileName: doc.source || doc.originalSource || doc.title || "",
    path: getDocPath(doc),
    text: doc.text || ""
  });
}

function isPrimaryAuthorityType(authorityType = "") {
  return ["CONSTITUTION", "STATUTE", "TREATY"].includes(
    String(authorityType || "").toUpperCase()
  );
}

function authorityWeightForNamedLaw(authorityType = "") {
  const type = String(authorityType || "").toUpperCase();

  switch (type) {
    case "CONSTITUTION":
      return 150;
    case "STATUTE":
      return 140;
    case "TREATY":
      return 130;
    case "SUPREME_COURT":
      return 120;
    case "CTA_EN_BANC":
      return 115;
    case "COURT_OF_APPEALS":
      return 110;
    case "CTA_DIVISION":
      return 105;
    case "RR":
      return 100;
    case "RMC":
      return 75;
    case "RMO":
      return 70;
    case "RAMO":
      return 68;
    case "BIR_RULING":
      return 60;
    case "LGU":
      return 50;
    default:
      return 0;
  }
}

function extractIssuanceRefs(text = "") {
  const value = normalizeLawText(text);
  const refs = [];

  const patterns = [
    { type: "rr", regex: /\brr\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmc", regex: /\brmc\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "rmo", regex: /\brmo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g },
    { type: "ramo", regex: /\bramo\s*(?:no\.?\s*)?(\d+)[-/ ]+(\d{2,4})\b/g }
  ];

  for (const { type, regex } of patterns) {
    for (const match of value.matchAll(regex)) {
      const year = String(match[2]).length === 2 ? `20${match[2]}` : String(match[2]);
      refs.push(`${type}-${String(match[1]).replace(/^0+/, "")}-${year}`);
    }
  }

  return uniq(refs);
}

function extractCourtAnchors(text = "") {
  const value = normalizeLawText(text);
  const refs = [];

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/g)) {
    refs.push(`gr-${String(match[1]).toUpperCase()}`);
  }

  for (const match of value.matchAll(/\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/g)) {
    refs.push(`cta-${String(match[1]).toUpperCase()}`);
  }

  for (const match of value.matchAll(/\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/g)) {
    refs.push(`ctaeb-${String(match[1]).toUpperCase()}`);
  }

  return uniq(refs);
}

function detectNamedLawSpecificIssuanceProfile(bestMatch = null) {
  if (!bestMatch) {
    return {
      preferredImplementingIssuances: [],
      restrictedIssuances: [],
      preferredCourtAnchors: []
    };
  }

  if (bestMatch.id === "RA-11534") {
    return {
      preferredImplementingIssuances: ["rr-5-2021"],
      restrictedIssuances: ["rmc-99-2021"],
      preferredCourtAnchors: []
    };
  }

  if (bestMatch.id === "RA-12066") {
    return {
      preferredImplementingIssuances: [],
      restrictedIssuances: [],
      preferredCourtAnchors: []
    };
  }

  return {
    preferredImplementingIssuances: [],
    restrictedIssuances: [],
    preferredCourtAnchors: []
  };
}

export const NAMED_LAW_REGISTRY = [
  {
    id: "RA-8424",
    canonicalTitle: "National Internal Revenue Code of 1997",
    shortTitle: "Tax Code",
    republicActNumber: "8424",
    category: "tax_code",
    enactedOn: "1997-12-11",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 8424",
      "republic act no 8424",
      "republic act 8424",
      "nirc",
      "nirc 1997",
      "national internal revenue code",
      "national internal revenue code of 1997",
      "tax code",
      "philippine tax code"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra1997/ra_8424_1997.html`
    ],
    preferredImplementingQueries: [],
    restrictedIssuanceNotes: []
  },
  {
    id: "RA-10963",
    canonicalTitle: "Tax Reform for Acceleration and Inclusion Act",
    shortTitle: "TRAIN Law",
    republicActNumber: "10963",
    category: "tax_reform",
    enactedOn: "2017-12-19",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 10963",
      "republic act no 10963",
      "republic act 10963",
      "train",
      "train law",
      "train act",
      "tax reform for acceleration and inclusion",
      "tax reform for acceleration and inclusion act"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2017/ra_10963_2017.html`,
      `${OFFICIAL_SOURCES.DOF}/ra-10963-train-law-and-veto-message-of-the-president/`
    ],
    preferredImplementingQueries: [],
    restrictedIssuanceNotes: []
  },
  {
    id: "RA-11534",
    canonicalTitle: "Corporate Recovery and Tax Incentives for Enterprises Act",
    shortTitle: "CREATE Law",
    republicActNumber: "11534",
    category: "tax_reform",
    enactedOn: "2021-03-26",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 11534",
      "republic act no 11534",
      "republic act 11534",
      "create",
      "create law",
      "create act",
      "corporate recovery and tax incentives for enterprises",
      "corporate recovery and tax incentives for enterprises act"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2021/ra_11534_2021.html`,
      `${OFFICIAL_SOURCES.FIRB}/download/create-act-ra-11534/`
    ],
    preferredImplementingQueries: [
      "RR 5-2021",
      "CREATE RR 5-2021",
      "CREATE Law RR 5-2021",
      "CREATE implementing rules",
      "CREATE Law implementing rules"
    ],
    restrictedIssuanceNotes: [
      "RMC 99-2021 covers CIT computation examples under RR 5-2021 Sec. 3(B)/3(D); it is not a generic CREATE implementation circular."
    ]
  },
  {
    id: "RA-11976",
    canonicalTitle: "Ease of Paying Taxes Act",
    shortTitle: "EOPT",
    republicActNumber: "11976",
    category: "tax_administration",
    enactedOn: "2024-01-05",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 11976",
      "republic act no 11976",
      "republic act 11976",
      "eopt",
      "eopt law",
      "eopt act",
      "ease of paying taxes",
      "ease of paying taxes act"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2024/ra_11976_2024.html`,
      `${OFFICIAL_SOURCES.BIR}/EOPT`
    ],
    preferredImplementingQueries: [],
    restrictedIssuanceNotes: []
  },
  {
    id: "RA-12023",
    canonicalTitle: "VAT on Digital Services Law",
    shortTitle: "VAT on Digital Services",
    republicActNumber: "12023",
    category: "vat",
    enactedOn: "2024-10-02",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 12023",
      "republic act no 12023",
      "republic act 12023",
      "vat on digital services",
      "digital services vat",
      "digital services law",
      "nonresident digital service providers vat",
      "vat on digital service providers"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2024/ra_12023_2024.html`
    ],
    preferredImplementingQueries: [],
    restrictedIssuanceNotes: []
  },
  {
    id: "RA-12066",
    canonicalTitle: "CREATE MORE Act",
    shortTitle: "CREATE MORE",
    republicActNumber: "12066",
    category: "tax_incentives",
    enactedOn: "2024-11-08",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 12066",
      "republic act no 12066",
      "republic act 12066",
      "create more",
      "create more act",
      "create more law",
      "corporate recovery and tax incentives for enterprises to maximize opportunities for reinvigorating the economy",
      "corporate recovery and tax incentives for enterprises to maximize opportunities for reinvigorating the economy act"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2024/ra_12066_2024.html`,
      `${OFFICIAL_SOURCES.FIRB}/resources/create-more/`
    ],
    preferredImplementingQueries: [
      "CREATE MORE IRR",
      "CREATE MORE Act IRR",
      "CREATE MORE implementing rules"
    ],
    restrictedIssuanceNotes: []
  },
  {
    id: "RA-12079",
    canonicalTitle: "VAT Refund for Non-Resident Tourists Act",
    shortTitle: "Tourist VAT Refund Law",
    republicActNumber: "12079",
    category: "vat",
    enactedOn: "2024-12-06",
    authorityType: "STATUTE",
    authorityLevel: AUTHORITY_LEVEL.STATUTE,
    aliases: [
      "ra 12079",
      "republic act no 12079",
      "republic act 12079",
      "vat refund for non resident tourists",
      "tourist vat refund law",
      "non resident tourist vat refund",
      "vat refund mechanism for non resident tourists"
    ],
    officialSources: [
      `${OFFICIAL_SOURCES.LAWPHIL}/statutes/repacts/ra2024/ra_12079_2024.html`
    ],
    preferredImplementingQueries: [],
    restrictedIssuanceNotes: []
  }
];

export const NAMED_LAW_INDEX = NAMED_LAW_REGISTRY.map((entry) => ({
  ...entry,
  normalizedAliases: uniq(
    [
      entry.canonicalTitle,
      entry.shortTitle,
      entry.republicActNumber ? `ra ${entry.republicActNumber}` : null,
      entry.republicActNumber ? `republic act no ${entry.republicActNumber}` : null,
      ...(entry.aliases || [])
    ].map(normalizeLawText)
  )
}));

export function buildGenericRaAliases(raNumber = "") {
  const clean = String(raNumber).replace(/\D/g, "");
  if (!clean) return [];

  return uniq([
    `ra ${clean}`,
    `ra no ${clean}`,
    `republic act ${clean}`,
    `republic act no ${clean}`
  ]);
}

export function extractRepublicActNumbers(text = "") {
  const value = normalizeLawText(text);
  const matches = [
    ...value.matchAll(/\b(?:ra|republic act(?: no)?)\s*(\d{4,6})\b/g)
  ];

  return uniq(matches.map((match) => match[1]));
}

export function detectNamedLaw(question = "") {
  const normalizedQuestion = normalizeLawText(question);

  if (!normalizedQuestion) {
    return {
      matched: false,
      normalizedQuestion,
      exactMatches: [],
      genericRaNumbers: [],
      bestMatch: null,
      allMatches: []
    };
  }

  const scored = NAMED_LAW_INDEX.map((entry) => {
    let score = 0;
    const matchedAliases = [];

    for (const alias of entry.normalizedAliases) {
      if (!alias) continue;

      const wholeWord = new RegExp(`(^|\\b)${escapeRegex(alias)}(\\b|$)`, "i");
      if (wholeWord.test(normalizedQuestion)) {
        matchedAliases.push(alias);
        score += alias.startsWith("ra ") ? 12 : 10;
      }
    }

    if (
      entry.republicActNumber &&
      extractRepublicActNumbers(normalizedQuestion).includes(entry.republicActNumber)
    ) {
      score += 25;
      matchedAliases.push(`ra ${entry.republicActNumber}`);
    }

    if (
      entry.shortTitle &&
      normalizeLawText(entry.shortTitle) &&
      normalizedQuestion.includes(normalizeLawText(entry.shortTitle))
    ) {
      score += 8;
    }

    if (
      entry.canonicalTitle &&
      normalizeLawText(entry.canonicalTitle) &&
      normalizedQuestion.includes(normalizeLawText(entry.canonicalTitle))
    ) {
      score += 8;
    }

    return {
      ...entry,
      matchedAliases: uniq(matchedAliases),
      score
    };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const genericRaNumbers = extractRepublicActNumbers(normalizedQuestion);

  let exactMatches = scored;

  if (!exactMatches.length && genericRaNumbers.length) {
    exactMatches = genericRaNumbers.map((raNumber) => ({
      id: `RA-${raNumber}`,
      canonicalTitle: `Republic Act No. ${raNumber}`,
      shortTitle: `RA ${raNumber}`,
      republicActNumber: raNumber,
      category: "generic_republic_act",
      enactedOn: null,
      authorityType: "STATUTE",
      authorityLevel: AUTHORITY_LEVEL.STATUTE,
      aliases: buildGenericRaAliases(raNumber),
      normalizedAliases: buildGenericRaAliases(raNumber).map(normalizeLawText),
      officialSources: [],
      preferredImplementingQueries: [],
      restrictedIssuanceNotes: [],
      matchedAliases: buildGenericRaAliases(raNumber),
      score: 15
    }));
  }

  return {
    matched: exactMatches.length > 0,
    normalizedQuestion,
    exactMatches,
    genericRaNumbers,
    bestMatch: exactMatches[0] || null,
    allMatches: exactMatches
  };
}

export function buildNamedLawSearchQueries(question = "", options = {}) {
  const { includeOriginalQuestion = true, maxQueries = 12 } = options;
  const detection = detectNamedLaw(question);

  const queries = [];

  if (includeOriginalQuestion && question) {
    queries.push(question);
  }

  if (detection.bestMatch) {
    const best = detection.bestMatch;

    queries.push(best.canonicalTitle);
    if (best.shortTitle) queries.push(best.shortTitle);

    if (best.republicActNumber) {
      queries.push(`RA ${best.republicActNumber}`);
      queries.push(`Republic Act No. ${best.republicActNumber}`);
    }

    for (const alias of best.aliases || []) {
      queries.push(alias);
    }

    for (const query of best.preferredImplementingQueries || []) {
      queries.push(query);
    }
  }

  return uniq(queries).slice(0, maxQueries);
}

export function scoreDocAgainstNamedLaw(doc = {}, lawMatch = null) {
  if (!lawMatch) return 0;

  const haystack = buildDocHaystack(doc);
  if (!haystack) return 0;

  const authorityType = detectDocAuthorityType(doc);
  let score = authorityWeightForNamedLaw(authorityType);

  if (
    lawMatch.republicActNumber &&
    new RegExp(`\\bra\\s*${escapeRegex(lawMatch.republicActNumber)}\\b`, "i").test(haystack)
  ) {
    score += authorityType === "STATUTE" ? 220 : 90;
  }

  if (
    lawMatch.republicActNumber &&
    new RegExp(
      `\\brepublic act(?: no)?\\s*${escapeRegex(lawMatch.republicActNumber)}\\b`,
      "i"
    ).test(haystack)
  ) {
    score += authorityType === "STATUTE" ? 220 : 90;
  }

  for (const alias of lawMatch.normalizedAliases || []) {
    if (!alias) continue;
    if (haystack.includes(alias)) {
      score += alias.startsWith("ra ") ? 26 : 16;
    }
  }

  if (lawMatch.shortTitle && haystack.includes(normalizeLawText(lawMatch.shortTitle))) {
    score += 20;
  }

  if (lawMatch.canonicalTitle && haystack.includes(normalizeLawText(lawMatch.canonicalTitle))) {
    score += 24;
  }

  const issuanceRefs = extractIssuanceRefs(haystack);
  const profile = detectNamedLawSpecificIssuanceProfile(lawMatch);

  for (const preferred of profile.preferredImplementingIssuances) {
    if (issuanceRefs.includes(preferred)) {
      score += authorityType === "RR" ? 75 : 20;
    }
  }

  for (const restricted of profile.restrictedIssuances) {
    if (issuanceRefs.includes(restricted)) {
      score -= 20;
    }
  }

  if (lawMatch.id === "RA-11534") {
    if (authorityType === "RR" && issuanceRefs.includes("rr-5-2021")) {
      score += 120;
    }

    if (authorityType === "RMC" && issuanceRefs.includes("rmc-99-2021")) {
      score += 10;
    }
  }

  if (lawMatch.id === "RA-12066" && /\birr\b/.test(haystack)) {
    score += authorityType === "RR" || authorityType === "STATUTE" ? 30 : 10;
  }

  return score;
}

export function filterDocsForNamedLaw(
  docs = [],
  lawDetection = null,
  options = {}
) {
  const {
    minScore = 40,
    hardFilter = true,
    maxDocs = 12,
    requirePrimaryAuthority = true
  } = options;

  const bestMatch = lawDetection?.bestMatch || null;

  if (!bestMatch) {
    return {
      lawMatched: false,
      bestMatch: null,
      matchedDocs: docs.slice(0, maxDocs),
      discardedDocs: [],
      scoredDocs: docs.map((doc) => ({
        doc,
        namedLawScore: 0,
        authorityType: detectDocAuthorityType(doc)
      }))
    };
  }

  const scoredDocs = docs
    .map((doc) => {
      const authorityType = detectDocAuthorityType(doc);
      return {
        doc,
        authorityType,
        namedLawScore: scoreDocAgainstNamedLaw(doc, bestMatch)
      };
    })
    .sort((a, b) => {
      if (b.namedLawScore !== a.namedLawScore) {
        return b.namedLawScore - a.namedLawScore;
      }

      return authorityWeightForNamedLaw(b.authorityType) - authorityWeightForNamedLaw(a.authorityType);
    });

  const aboveThreshold = scoredDocs.filter((item) => item.namedLawScore >= minScore);

  const primaryDocs = aboveThreshold.filter(
    (item) => item.authorityType === "STATUTE"
  );

  const preferredDocs =
    requirePrimaryAuthority && primaryDocs.length
      ? [
          ...primaryDocs,
          ...aboveThreshold.filter((item) => item.authorityType === "RR"),
          ...aboveThreshold.filter(
            (item) => item.authorityType !== "STATUTE" && item.authorityType !== "RR"
          )
        ]
      : aboveThreshold;

  const matchedDocs = preferredDocs.map((item) => ({
    ...item.doc,
    namedLawScore: item.namedLawScore,
    namedLawAuthorityType: item.authorityType
  }));

  const fallbackDocs = hardFilter
    ? []
    : scoredDocs
        .filter((item) => item.namedLawScore < minScore)
        .map((item) => ({
          ...item.doc,
          namedLawScore: item.namedLawScore,
          namedLawAuthorityType: item.authorityType
        }));

  const finalDocs = matchedDocs.length
    ? matchedDocs
    : requirePrimaryAuthority
      ? []
      : fallbackDocs;

  return {
    lawMatched: true,
    bestMatch,
    matchedDocs: finalDocs.slice(0, maxDocs),
    discardedDocs: matchedDocs.length ? fallbackDocs.slice(0, maxDocs) : [],
    scoredDocs,
    primaryAuthorityFound: primaryDocs.length > 0
  };
}

export function buildNamedLawDebugSummary(question = "", docs = []) {
  const detection = detectNamedLaw(question);
  const filtered = filterDocsForNamedLaw(docs, detection, {
    minScore: 40,
    hardFilter: true,
    maxDocs: 5,
    requirePrimaryAuthority: true
  });

  return {
    question,
    normalizedQuestion: detection.normalizedQuestion,
    namedLawMatched: detection.matched,
    bestMatch: detection.bestMatch
      ? {
          id: detection.bestMatch.id,
          canonicalTitle: detection.bestMatch.canonicalTitle,
          shortTitle: detection.bestMatch.shortTitle,
          republicActNumber: detection.bestMatch.republicActNumber,
          matchedAliases: detection.bestMatch.matchedAliases
        }
      : null,
    suggestedQueries: buildNamedLawSearchQueries(question),
    primaryAuthorityFound: filtered.primaryAuthorityFound || false,
    topDocScores: filtered.scoredDocs.slice(0, 5).map((item) => ({
      title:
        item.doc.title ||
        item.doc.originalSource ||
        item.doc.source ||
        item.doc.path ||
        "Untitled Source",
      path:
        item.doc.path ||
        item.doc.source_path ||
        item.doc.metadata?.path ||
        null,
      authorityType: item.authorityType,
      namedLawScore: item.namedLawScore
    }))
  };
}

export default {
  NAMED_LAW_REGISTRY,
  NAMED_LAW_INDEX,
  normalizeLawText,
  extractRepublicActNumbers,
  detectNamedLaw,
  buildNamedLawSearchQueries,
  scoreDocAgainstNamedLaw,
  filterDocsForNamedLaw,
  buildNamedLawDebugSummary
};
