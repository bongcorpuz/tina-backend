// FILE: named-law-engine.js

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

export const NAMED_LAW_REGISTRY = [
  {
    id: "RA-8424",
    canonicalTitle: "National Internal Revenue Code of 1997",
    shortTitle: "Tax Code",
    republicActNumber: "8424",
    category: "tax_code",
    enactedOn: "1997-12-11",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    ]
  },
  {
    id: "RA-10963",
    canonicalTitle: "Tax Reform for Acceleration and Inclusion Act",
    shortTitle: "TRAIN Law",
    republicActNumber: "10963",
    category: "tax_reform",
    enactedOn: "2017-12-19",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    ]
  },
  {
    id: "RA-11534",
    canonicalTitle: "Corporate Recovery and Tax Incentives for Enterprises Act",
    shortTitle: "CREATE Law",
    republicActNumber: "11534",
    category: "tax_reform",
    enactedOn: "2021-03-26",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    authorityLevel: 1,
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
    ]
  },
  {
    id: "RA-12023",
    canonicalTitle: "VAT on Digital Services Law",
    shortTitle: "VAT on Digital Services",
    republicActNumber: "12023",
    category: "vat",
    enactedOn: "2024-10-02",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    ]
  },
  {
    id: "RA-12066",
    canonicalTitle:
      "CREATE MORE Act",
    shortTitle: "CREATE MORE",
    republicActNumber: "12066",
    category: "tax_incentives",
    enactedOn: "2024-11-08",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    ]
  },
  {
    id: "RA-12079",
    canonicalTitle:
      "VAT Refund for Non-Resident Tourists Act",
    shortTitle: "Tourist VAT Refund Law",
    republicActNumber: "12079",
    category: "vat",
    enactedOn: "2024-12-06",
    authorityType: "STATUTE",
    authorityLevel: 1,
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
    ]
  }
];

export const NAMED_LAW_INDEX = NAMED_LAW_REGISTRY.map((entry) => ({
  ...entry,
  normalizedAliases: uniq(
    [
      entry.canonicalTitle,
      entry.shortTitle,
      entry.republicActNumber ? `ra ${entry.republicActNumber}` : null,
      entry.republicActNumber
        ? `republic act no ${entry.republicActNumber}`
        : null,
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
    ...value.matchAll(
      /\b(?:ra|republic act(?: no)?)\s*(\d{4,6})\b/g
    )
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
    let matchedAliases = [];

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
      extractRepublicActNumbers(normalizedQuestion).includes(
        entry.republicActNumber
      )
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
      authorityLevel: 1,
      aliases: buildGenericRaAliases(raNumber),
      normalizedAliases: buildGenericRaAliases(raNumber).map(normalizeLawText),
      officialSources: [],
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

    if (
      best.id === "RA-12066" ||
      normalizeLawText(best.shortTitle).includes("create more")
    ) {
      queries.push("CREATE MORE IRR");
      queries.push("CREATE MORE Act IRR");
    }

    if (
      best.id === "RA-11534" ||
      normalizeLawText(best.shortTitle).includes("create law")
    ) {
      queries.push("CREATE Law IRR");
      queries.push("CREATE Act IRR");
    }
  }

  return uniq(queries).slice(0, maxQueries);
}

export function scoreDocAgainstNamedLaw(doc = {}, lawMatch = null) {
  if (!lawMatch) return 0;

  const haystack = normalizeLawText(
    [
      doc.source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.title,
      doc.text?.slice(0, 1200),
      doc.metadata?.path,
      doc.metadata?.originalSource,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      ...(doc.metadata?.normalizedAliases || [])
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!haystack) return 0;

  let score = 0;

  if (
    lawMatch.republicActNumber &&
    new RegExp(`\\bra\\s*${escapeRegex(lawMatch.republicActNumber)}\\b`, "i").test(
      haystack
    )
  ) {
    score += 100;
  }

  if (
    lawMatch.republicActNumber &&
    new RegExp(
      `\\brepublic act(?: no)?\\s*${escapeRegex(lawMatch.republicActNumber)}\\b`,
      "i"
    ).test(haystack)
  ) {
    score += 100;
  }

  for (const alias of lawMatch.normalizedAliases || []) {
    if (!alias) continue;
    if (haystack.includes(alias)) {
      score += alias.startsWith("ra ") ? 20 : 14;
    }
  }

  if (
    lawMatch.shortTitle &&
    haystack.includes(normalizeLawText(lawMatch.shortTitle))
  ) {
    score += 12;
  }

  if (
    lawMatch.canonicalTitle &&
    haystack.includes(normalizeLawText(lawMatch.canonicalTitle))
  ) {
    score += 16;
  }

  if (
    lawMatch.id === "RA-12066" &&
    /\birr\b/.test(haystack)
  ) {
    score += 8;
  }

  if (
    lawMatch.id === "RA-11534" &&
    /\birr\b/.test(haystack)
  ) {
    score += 6;
  }

  return score;
}

export function filterDocsForNamedLaw(
  docs = [],
  lawDetection = null,
  options = {}
) {
  const {
    minScore = 20,
    hardFilter = false,
    maxDocs = 12
  } = options;

  const bestMatch = lawDetection?.bestMatch || null;
  if (!bestMatch) {
    return {
      lawMatched: false,
      bestMatch: null,
      matchedDocs: docs.slice(0, maxDocs),
      discardedDocs: [],
      scoredDocs: docs.map((doc) => ({ doc, namedLawScore: 0 }))
    };
  }

  const scoredDocs = docs
    .map((doc) => ({
      doc,
      namedLawScore: scoreDocAgainstNamedLaw(doc, bestMatch)
    }))
    .sort((a, b) => b.namedLawScore - a.namedLawScore);

  const matchedDocs = scoredDocs
    .filter((item) => item.namedLawScore >= minScore)
    .map((item) => ({
      ...item.doc,
      namedLawScore: item.namedLawScore
    }));

  const fallbackDocs = hardFilter
    ? []
    : scoredDocs
        .filter((item) => item.namedLawScore < minScore)
        .map((item) => ({
          ...item.doc,
          namedLawScore: item.namedLawScore
        }));

  return {
    lawMatched: true,
    bestMatch,
    matchedDocs: (matchedDocs.length ? matchedDocs : fallbackDocs).slice(
      0,
      maxDocs
    ),
    discardedDocs: matchedDocs.length
      ? fallbackDocs.slice(0, maxDocs)
      : [],
    scoredDocs
  };
}

export function buildNamedLawDebugSummary(question = "", docs = []) {
  const detection = detectNamedLaw(question);
  const filtered = filterDocsForNamedLaw(docs, detection, {
    minScore: 20,
    hardFilter: false,
    maxDocs: 5
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
