// FILE: authority-engine.js

const AUTHORITY_LEVEL = {
  CONSTITUTION: 1,
  STATUTE: 2,
  TREATY: 3,
  JURISPRUDENCE: 4,
  RR: 5,
  BIR_ISSUANCE: 6,
  BIR_RULING: 7,
  LGU: 8,
  SECONDARY: 9
};

const AUTHORITY_SCORE = {
  CONSTITUTION: 100,
  STATUTE: 95,
  TREATY: 90,
  JURISPRUDENCE: 92,
  RR: 85,
  BIR_ISSUANCE: 75,
  BIR_RULING: 65,
  LGU: 60,
  SECONDARY: 40
};

const AUTHORITY_LABEL = {
  CONSTITUTION: "Constitution",
  STATUTE: "Statute",
  TREATY: "Treaty / International Agreement",
  JURISPRUDENCE: "Jurisprudence",
  RR: "Revenue Regulation",
  BIR_ISSUANCE: "BIR Issuance",
  BIR_RULING: "BIR Ruling",
  LGU: "Local Tax Ordinance",
  SECONDARY: "Secondary / Commentary"
};

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeYear(year) {
  const clean = String(year || "").trim();

  if (!clean) return "";

  if (clean.length === 2) {
    const num = Number(clean);
    return String(num <= 30 ? 2000 + num : 1900 + num);
  }

  return clean;
}

function padDocNumber(num, len = 2) {
  return String(num || "").replace(/^0+/, "").padStart(len, "0");
}

export function normalizeLegalReference(input = "") {
  const raw = compactSpaces(input);
  const l = lower(raw);

  if (!raw) {
    return {
      raw,
      normalized: "",
      type: null,
      aliases: []
    };
  }

  if (
    l.includes("1987 philippine constitution") ||
    l === "constitution" ||
    l.includes("philippine constitution")
  ) {
    return {
      raw,
      normalized: "1987_PHILIPPINE_CONSTITUTION",
      type: "CONSTITUTION",
      aliases: ["constitution", "1987 constitution", "philippine constitution"]
    };
  }

  if (
    l.includes("national internal revenue code") ||
    l.includes("nirc") ||
    l.includes("tax code")
  ) {
    return {
      raw,
      normalized: "NIRC_1997",
      type: "STATUTE",
      aliases: [
        "nirc",
        "tax code",
        "national internal revenue code",
        "national internal revenue code of 1997"
      ]
    };
  }

  const raMatch = raw.match(/\b(?:republic\s+act|ra)\s*(?:no\.?)?\s*0*(\d+)\b/i);
  if (raMatch) {
    const raNo = String(raMatch[1]).replace(/^0+/, "");
    return {
      raw,
      normalized: `RA_${raNo}`,
      type: "STATUTE",
      aliases: [
        `ra ${raNo}`,
        `republic act no. ${raNo}`,
        `republic act ${raNo}`
      ]
    };
  }

  const rrMatch = raw.match(
    /\b(?:rr|revenue\s+regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );

  if (rrMatch) {
    const num = String(rrMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rrMatch[2]);

    return {
      raw,
      normalized: `RR_${padDocNumber(num, 2)}-${year}`,
      type: "RR",
      aliases: [
        `rr ${num}-${year}`,
        `rr ${padDocNumber(num, 2)}-${year}`,
        `revenue regulation no. ${num}-${year}`
      ]
    };
  }

  const rmcMatch = raw.match(
    /\b(?:rmc|revenue\s+memorandum\s+circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );

  if (rmcMatch) {
    const num = String(rmcMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rmcMatch[2]);

    return {
      raw,
      normalized: `RMC_${padDocNumber(num, 3)}_${year}`,
      type: "BIR_ISSUANCE",
      aliases: [
        `rmc ${num}-${year}`,
        `rmc ${padDocNumber(num, 3)}-${year}`,
        `revenue memorandum circular ${num}-${year}`
      ]
    };
  }

  const rmoMatch = raw.match(
    /\b(?:rmo|revenue\s+memorandum\s+order[s]?)\s*(?:no\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
  );

  if (rmoMatch) {
    const num = String(rmoMatch[1]).replace(/^0+/, "");
    const year = normalizeYear(rmoMatch[2]);

    return {
      raw,
      normalized: `RMO_${padDocNumber(num, 3)}_${year}`,
      type: "BIR_ISSUANCE",
      aliases: [
        `rmo ${num}-${year}`,
        `rmo ${padDocNumber(num, 3)}-${year}`,
        `revenue memorandum order ${num}-${year}`
      ]
    };
  }

  const rulingMatch = raw.match(
    /\b(?:bir\s+ruling|ruling)\s*(?:no\.?)?\s*([a-z0-9-]+)\b/i
  );

  if (rulingMatch) {
    return {
      raw,
      normalized: `BIR_RULING_${String(rulingMatch[1]).toUpperCase()}`,
      type: "BIR_RULING",
      aliases: [raw]
    };
  }

  return {
    raw,
    normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    type: null,
    aliases: [raw]
  };
}

export function classifyAuthorityFromDocument({
  fileName = "",
  path = "",
  text = ""
}) {
  const blob = `${fileName}\n${path}\n${text}`.toLowerCase();

  if (
    blob.includes("1987 philippine constitution") ||
    blob.includes("constitution of the philippines")
  ) {
    return "CONSTITUTION";
  }

  if (
    blob.includes("national internal revenue code") ||
    /\bnirc\b/.test(blob) ||
    /\brepublic act\b/.test(blob) ||
    /\bra\s*no\.?\s*\d+\b/.test(blob) ||
    /\bra\s*\d+\b/.test(blob)
  ) {
    return "STATUTE";
  }

  if (
    blob.includes("treaty") ||
    blob.includes("tax treaty") ||
    blob.includes("international agreement")
  ) {
    return "TREATY";
  }

  if (
    blob.includes("supreme court") ||
    blob.includes("g.r. no.") ||
    blob.includes("cta en banc") ||
    blob.includes("court of tax appeals") ||
    /\bcta\b/.test(blob)
  ) {
    return "JURISPRUDENCE";
  }

  if (
    /\brr\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue regulation")
  ) {
    return "RR";
  }

  if (
    /\brmc\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    /\brmo\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    /\brda\s*\d+[-_ ]\d{2,4}\b/.test(blob) ||
    blob.includes("revenue memorandum circular") ||
    blob.includes("revenue memorandum order") ||
    blob.includes("revenue delegation authority")
  ) {
    return "BIR_ISSUANCE";
  }

  if (
    blob.includes("bir ruling") ||
    /\bruling no\.?\b/.test(blob)
  ) {
    return "BIR_RULING";
  }

  if (
    blob.includes("ordinance") ||
    blob.includes("city ordinance") ||
    blob.includes("municipal ordinance") ||
    blob.includes("local tax code")
  ) {
    return "LGU";
  }

  return "SECONDARY";
}

export function buildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
  const authorityType = classifyAuthorityFromDocument({ fileName, path, text });
  const normalizedRef = normalizeLegalReference(`${fileName} ${path}`);

  return {
    authorityType,
    authorityLevel: AUTHORITY_LEVEL[authorityType] || 99,
    authorityScore: AUTHORITY_SCORE[authorityType] || 0,
    authorityLabel: AUTHORITY_LABEL[authorityType] || "Unknown",
    normalizedReference: normalizedRef.normalized || null,
    normalizedAliases: normalizedRef.aliases || [],
    recencyDate: modifiedTime || null
  };
}

export function computeRecencyScore(dateValue) {
  if (!dateValue) return 50;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 50;

  const ageDays = Math.max(
    0,
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (ageDays <= 30) return 100;
  if (ageDays <= 180) return 90;
  if (ageDays <= 365) return 80;
  if (ageDays <= 730) return 70;
  if (ageDays <= 1825) return 60;

  return 50;
}

export function detectCitationIntent(query = "") {
  const normalized = normalizeLegalReference(query);

  return {
    normalizedReference: normalized.normalized,
    authorityType: normalized.type,
    aliases: normalized.aliases || [],
    hasCitationIntent: Boolean(normalized.type)
  };
}

function computeCitationMatchBonus(query = "", doc = {}) {
  const intent = detectCitationIntent(query);
  if (!intent.hasCitationIntent) return 0;

  const haystack = [
    doc.source,
    doc.path,
    doc.originalSource,
    doc.metadata?.path,
    doc.metadata?.originalSource,
    doc.normalizedReference,
    doc.metadata?.normalizedReference,
    ...(doc.normalizedAliases || []),
    ...(doc.metadata?.normalizedAliases || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const normalizedNeedle = String(intent.normalizedReference || "").toLowerCase();
  const aliasHit = (intent.aliases || []).some((alias) =>
    haystack.includes(String(alias).toLowerCase())
  );

  if (normalizedNeedle && haystack.includes(normalizedNeedle)) return 100;
  if (aliasHit) return 85;

  return 0;
}

export function rerankByHierarchy(results = [], query = "") {
  return results
    .map((doc) => {
      const semanticSimilarity = Number(doc.score || doc.similarity || 0);

      const authorityType =
        doc.authorityType ||
        doc.authority_type ||
        doc.metadata?.authorityType ||
        classifyAuthorityFromDocument({
          fileName: doc.source || doc.originalSource || "",
          path: doc.path || doc.metadata?.path || "",
          text: doc.text || ""
        });

      const authorityLevel =
        Number(
          doc.authorityLevel ||
          doc.authority_level ||
          doc.metadata?.authorityLevel
        ) ||
        AUTHORITY_LEVEL[authorityType] ||
        99;

      const authorityScore =
        Number(
          doc.authorityScore ||
          doc.authority_score ||
          doc.metadata?.authorityScore
        ) ||
        AUTHORITY_SCORE[authorityType] ||
        0;

      const recencyScore = computeRecencyScore(
        doc.recencyDate ||
          doc.recency_date ||
          doc.metadata?.recencyDate ||
          doc.modifiedTime ||
          doc.metadata?.modifiedTime ||
          null
      );

      const citationMatchBonus = computeCitationMatchBonus(query, doc);

      const finalScore =
        semanticSimilarity * 0.5 +
        authorityScore * 0.3 +
        recencyScore * 0.1 +
        citationMatchBonus * 0.1;

      return {
        ...doc,
        authorityType,
        authorityLevel,
        authorityScore,
        recencyScore,
        citationMatchBonus,
        finalScore
      };
    })
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (a.authorityLevel || 99) - (b.authorityLevel || 99);
    });
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  const negTokens = [
    " not ",
    " except ",
    " unless ",
    " exempt ",
    " disallowed ",
    " prohibited "
  ];

  const xNeg = negTokens.some((t) => x.includes(t.trim()) || x.includes(t));
  const yNeg = negTokens.some((t) => y.includes(t.trim()) || y.includes(t));

  if (x === y) return false;

  return xNeg !== yNeg;
}

export function detectHierarchyConflict(topDocs = []) {
  if (!Array.isArray(topDocs) || topDocs.length < 2) {
    return {
      conflict: false,
      controllingAuthority: null,
      reason: null,
      conflictingDocs: []
    };
  }

  for (let i = 0; i < topDocs.length; i += 1) {
    for (let j = i + 1; j < topDocs.length; j += 1) {
      const a = topDocs[i];
      const b = topDocs[j];

      const aLevel = a.authorityLevel || AUTHORITY_LEVEL[a.authorityType] || 99;
      const bLevel = b.authorityLevel || AUTHORITY_LEVEL[b.authorityType] || 99;

      if (aLevel === bLevel) continue;
      if (!looksContradictory(a.text || "", b.text || "")) continue;

      const controlling = aLevel < bLevel ? a : b;
      const lowerDoc = aLevel < bLevel ? b : a;

      return {
        conflict: true,
        controllingAuthority: controlling.authorityType,
        controllingSource:
          controlling.path ||
          controlling.metadata?.path ||
          controlling.source ||
          controlling.originalSource ||
          null,
        reason: `${lowerDoc.authorityType} appears inconsistent with ${controlling.authorityType}. Higher authority prevails.`,
        conflictingDocs: [a, b]
      };
    }
  }

  return {
    conflict: false,
    controllingAuthority: null,
    reason: null,
    conflictingDocs: []
  };
}

export function selectTopLegalBases(results = [], maxItems = 2) {
  return rerankByHierarchy(results)
    .filter((doc) => {
      const type = doc.authorityType || doc.metadata?.authorityType || "SECONDARY";
      return type !== "SECONDARY";
    })
    .slice(0, maxItems)
    .map((doc) => ({
      authorityType: doc.authorityType,
      authorityLabel: AUTHORITY_LABEL[doc.authorityType] || doc.authorityType,
      source:
        doc.path ||
        doc.metadata?.path ||
        doc.source ||
        doc.originalSource ||
        "Unknown source",
      excerpt: normalizeText(doc.text).slice(0, 280)
    }));
}

export function buildStrictAnswerPrompt({
  hookMode = "ASK",
  originalQuestion = "",
  cleanQuestion = "",
  context = "",
  topLegalBases = [],
  conflict = null
}) {
  const legalBasesText =
    topLegalBases.length > 0
      ? topLegalBases
          .map(
            (item, index) =>
              `${index + 1}. [${item.authorityLabel}] ${item.source}\nExcerpt: ${item.excerpt}`
          )
          .join("\n\n")
      : "No legal basis found.";

  const conflictText = conflict?.conflict
    ? [
        "Conflict Detected: YES",
        `Controlling Authority: ${conflict.controllingAuthority || "Unknown"}`,
        `Reason: ${conflict.reason || "Higher authority prevails."}`
      ].join("\n")
    : "Conflict Detected: NO";

  return `
You are TINA, a Philippine tax research and compliance assistant.

ACTIVE MODE: ${hookMode}

NON-NEGOTIABLE RULES:
1. Never answer from blogs or commentary if legal sources exist.
2. Always prioritize higher authority.
3. Always show top 2 legal bases only.
4. Always flag conflicts.
5. If no source exists in the uploaded knowledge base, say:
   "I cannot find this in the uploaded knowledge base."
6. Never mention ChatGPT.
7. Be conservative and audit-defensible.

RESPONSE FORMAT:
1. DIRECT ANSWER
2. LEGAL BASIS
3. SUPPORTING RULES
4. PROFESSIONAL INSIGHT
5. CONFLICT FLAG

ORIGINAL QUESTION:
${originalQuestion}

CLEAN QUESTION:
${cleanQuestion}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT STATUS:
${conflictText}

CONTEXT:
${context}
`.trim();
}

export {
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL
};
