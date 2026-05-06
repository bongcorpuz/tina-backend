// FILE: ask-helpers.js

export const MAX_VISIBLE_SOURCES = 5;

const HIDDEN_FOLDER_PATTERNS = ["07_cpa_notes", "08_review_materials"];

const SOURCE_TIER_RULES = [
  {
    matchers: ["00_constitution", "/00_constitution/", "1987 constitution", "constitution"],
    tier: 1,
    label: "1987 Constitution",
    weight: 1.0,
    authorityType: "CONSTITUTION"
  },
  {
    matchers: ["01_tax_code", "/01_tax_code/", "tax code", "nirc", "republic act", "ra "],
    tier: 2,
    label: "Statute / Tax Code / Republic Act",
    weight: 0.98,
    authorityType: "STATUTE"
  },
  {
    matchers: ["05b_tax_treaties", "/05b_tax_treaties/", "tax treaty", "convention between"],
    tier: 3,
    label: "Tax Treaty",
    weight: 0.96,
    authorityType: "TREATY"
  },
  {
    matchers: ["supreme court", "g.r. no", "gr no", "gr. no", "sc decision"],
    tier: 4,
    label: "Supreme Court Decision",
    weight: 0.95,
    authorityType: "SUPREME_COURT"
  },
  {
    matchers: ["cta en banc", "cta eb", "en banc"],
    tier: 5,
    label: "CTA En Banc Decision",
    weight: 0.93,
    authorityType: "CTA_EN_BANC"
  },
  {
    matchers: ["court of appeals", "ca-g.r.", "ca gr", "ca-g.r"],
    tier: 6,
    label: "Court of Appeals Decision",
    weight: 0.9,
    authorityType: "COURT_OF_APPEALS"
  },
  {
    matchers: ["cta division", "cta case", "court of tax appeals"],
    tier: 7,
    label: "CTA Division Decision",
    weight: 0.88,
    authorityType: "CTA_DIVISION"
  },
  {
    matchers: [
      "02_revenue_regulations",
      "/02_revenue_regulations/",
      "revenue regulation",
      "rr "
    ],
    tier: 8,
    label: "Revenue Regulation",
    weight: 0.84,
    authorityType: "RR"
  },
  {
    matchers: [
      "03_rmc",
      "/03_rmc/",
      "revenue memorandum circular",
      "rmc "
    ],
    tier: 9,
    label: "Revenue Memorandum Circular",
    weight: 0.76,
    authorityType: "RMC"
  },
  {
    matchers: [
      "04_rmo",
      "/04_rmo/",
      "revenue memorandum order",
      "rmo "
    ],
    tier: 10,
    label: "Revenue Memorandum Order",
    weight: 0.72,
    authorityType: "RMO"
  },
  {
    matchers: [
      "04b_ramo",
      "/04b_ramo/",
      "revenue audit memorandum order",
      "ramo "
    ],
    tier: 11,
    label: "Revenue Audit Memorandum Order",
    weight: 0.7,
    authorityType: "RAMO"
  },
  {
    matchers: ["05_bir_rulings", "/05_bir_rulings/", "bir ruling", "ruling no"],
    tier: 12,
    label: "BIR Ruling",
    weight: 0.66,
    authorityType: "BIR_RULING"
  },
  {
    matchers: ["lgu", "local tax code", "city ordinance", "municipal ordinance", "ordinance"],
    tier: 13,
    label: "Local Tax Ordinance",
    weight: 0.6,
    authorityType: "LGU"
  },
  {
    matchers: ["07_cpa_notes", "/07_cpa_notes/", "cpa notes"],
    tier: 90,
    label: "CPA Notes",
    weight: 0.35,
    authorityType: "SECONDARY"
  },
  {
    matchers: [
      "08_review_materials",
      "/08_review_materials/",
      "review materials",
      "reviewer",
      "bullet notes"
    ],
    tier: 91,
    label: "Review Materials",
    weight: 0.3,
    authorityType: "SECONDARY"
  }
];

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function toSearchableText(source = {}) {
  return [
    getDocPath(source),
    getDocOriginalName(source),
    source.path,
    source.source_path,
    source.source,
    source.title,
    source.originalSource,
    source.metadata?.path,
    source.metadata?.originalSource,
    source.metadata?.originalFileName,
    source.metadata?.documentTitle,
    source.metadata?.normalizedReference
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" || ");
}

export function getSourceTier(source = {}) {
  const haystack = toSearchableText(source);

  for (const rule of SOURCE_TIER_RULES) {
    if (
      rule.matchers.some((matcher) =>
        haystack.includes(String(matcher).toLowerCase())
      )
    ) {
      return {
        tier: rule.tier,
        label: rule.label,
        weight: rule.weight,
        authorityType: rule.authorityType
      };
    }
  }

  return {
    tier: 99,
    label: "Unknown",
    weight: 0.1,
    authorityType: "UNKNOWN"
  };
}

export function getUserId(req) {
  return (
    req.user?.id ||
    req.user?.user_id ||
    req.user?.sub ||
    req.user?.username ||
    req.user?.email ||
    null
  );
}

export function toSafeDbNumeric(value, max = 999999.9999, decimals = 4) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return 0;
  }

  return Number(Math.min(max, Math.max(0, num)).toFixed(decimals));
}

export function normalizeSourceName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
    .replace(/\brev\.?\s*reg\.?\b/g, "rr")
    .replace(/\brev\.?\s*memo\.?\s*circular\b/g, "rmc")
    .replace(/\brev\.?\s*memo\.?\s*order\b/g, "rmo")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
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
    .replace(/[_\s]/g, "-")
    .replace(/[\\/]/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function getDocPath(doc = {}) {
  return String(
    doc.metadata?.path ||
      doc.path ||
      doc.source_path ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.originalSource ||
      doc.source ||
      doc.title ||
      ""
  );
}

export function getDocOriginalName(doc = {}) {
  return String(
    doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source ||
      doc.title ||
      ""
  );
}

export function buildMemoryContext(messages = []) {
  if (!messages.length) {
    return "No prior conversation.";
  }

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
    .join("\n");
}

export function extractQuizAnswer(text = "") {
  const cleaned = String(text || "").trim().toUpperCase();

  if (!cleaned) {
    return null;
  }

  if (/^[ABCD]$/.test(cleaned)) {
    return cleaned;
  }

  const match = cleaned.match(/^(?:ANSWER\s*[:\-]?\s*)?([ABCD])$/i);
  return match?.[1]?.toUpperCase() || null;
}

export function formatQuestionBlock({
  prefix = "",
  quiz,
  storedQuiz,
  teachingText = ""
}) {
  const parts = [];

  if (prefix) {
    parts.push(prefix);
  }

  if (teachingText) {
    parts.push(teachingText);
    parts.push("");
  }

  parts.push(`Topic: ${quiz.topic}`);
  parts.push(`Difficulty: ${quiz.difficulty}`);
  parts.push("");
  parts.push("Question:");
  parts.push(quiz.question);
  parts.push("");
  parts.push(`A. ${quiz.choices.A}`);
  parts.push(`B. ${quiz.choices.B}`);
  parts.push(`C. ${quiz.choices.C}`);
  parts.push(`D. ${quiz.choices.D}`);
  parts.push("");
  parts.push("Instruction:");
  parts.push("Answer A, B, C, or D. Type /bye or /exit to stop.");

  return parts.filter(Boolean).join("\n");
}

export function shouldHideSourceFromUser(source = {}) {
  const haystack = toSearchableText(source);
  return HIDDEN_FOLDER_PATTERNS.some((pattern) => haystack.includes(pattern));
}

export function buildGoogleDriveLinks(doc = {}) {
  const fileId =
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    null;

  const driveViewUrl =
    doc.driveViewUrl ||
    doc.drive_view_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null);

  const driveDownloadUrl =
    doc.driveDownloadUrl ||
    doc.drive_download_url ||
    doc.metadata?.driveDownloadUrl ||
    doc.metadata?.drive_download_url ||
    (fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : null);

  return {
    fileId,
    driveViewUrl,
    driveDownloadUrl
  };
}

function inferIssuanceNumber(item = {}) {
  const haystack = normalizeText(
    [
      item.title,
      item.source,
      item.originalSource,
      item.path,
      item.source_path,
      item.metadata?.path,
      item.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );

  const patterns = [
    /\b(1987 Constitution)\b/i,
    /\b(RA\s*\d{4,6})\b/i,
    /\b(RR\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMC\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RAMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(BIR Ruling\s*(?:No\.?)?\s*[\w./()-]+)\b/i,
    /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i,
    /\b(CTA(?:\s+EB)?\s+No\.?\s*[\w.-]+)\b/i,
    /\b(CA-G\.R\.\s*[\w.-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

export function buildSourceResponseItem(item = {}) {
  const links = buildGoogleDriveLinks(item);
  const path = getDocPath(item);
  const originalSource = getDocOriginalName(item);
  const tierInfo = getSourceTier(item);

  return {
    title: originalSource || item.title || item.source || "Untitled Source",
    issuanceNumber: inferIssuanceNumber(item),
    source: item.source || originalSource || path || "Untitled Source",
    originalSource,
    path,
    fileId: links.fileId,
    driveViewUrl: links.driveViewUrl,
    driveDownloadUrl: links.driveDownloadUrl,
    text: item.text || "",
    preview: item.preview || (item.text ? String(item.text).slice(0, 300) : ""),
    score: Number(item.score ?? item.adjustedScore ?? item.finalScore ?? item.combined_score ?? 0),
    adjustedScore: Number(
      item.adjustedScore ?? item.finalScore ?? item.combined_score ?? item.score ?? 0
    ),
    authorityType:
      item.authorityType ||
      item.authority_type ||
      item.metadata?.authorityType ||
      tierInfo.authorityType,
    authorityLevel:
      item.authorityLevel ||
      item.authority_level ||
      item.metadata?.authorityLevel ||
      tierInfo.tier,
    authorityScore:
      item.authorityScore ||
      item.authority_score ||
      item.metadata?.authorityScore ||
      tierInfo.weight,
    authorityLabel:
      item.authorityLabel ||
      item.authority_label ||
      item.metadata?.authorityLabel ||
      tierInfo.label
  };
}

export function uniqueSources(docs = []) {
  const seen = new Set();

  return docs
    .map((doc) => buildSourceResponseItem(doc))
    .filter((doc) => {
      const key =
        doc.fileId ||
        normalizeForMatch(doc.path) ||
        normalizeForMatch(doc.originalSource) ||
        normalizeForMatch(doc.source);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function finalizeSourcesForResponse(
  rawSources = [],
  { maxItems = MAX_VISIBLE_SOURCES } = {}
) {
  return uniqueSources(rawSources)
    .filter((item) => !shouldHideSourceFromUser(item))
    .filter((item) => item.driveViewUrl)
    .sort((a, b) => {
      const aLevel = Number(a.authorityLevel ?? 999);
      const bLevel = Number(b.authorityLevel ?? 999);

      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }

      return (
        Number(b.adjustedScore ?? b.score ?? 0) -
        Number(a.adjustedScore ?? a.score ?? 0)
      );
    })
    .slice(0, maxItems);
}

export function classifyQuestion(question = "") {
  const q = String(question || "").toLowerCase();

  if (
    /\b(rr|rmc|rmo|ramo)\s*(no\.?)?\s*\d+/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order") ||
    q.includes("revenue audit memorandum order")
  ) {
    return "issuance";
  }

  if (
    q.includes("bir ruling") ||
    q.includes("da(") ||
    q.includes("ot-") ||
    q.includes("ruling no")
  ) {
    return "ruling";
  }

  if (
    q.includes("case") ||
    q.includes(" v. ") ||
    q.includes(" vs ") ||
    q.includes(" vs. ") ||
    q.includes("cta") ||
    q.includes("supreme court") ||
    q.includes("g.r. no") ||
    q.includes("ca-g.r.")
  ) {
    return "case";
  }

  if (
    q.includes("compute") ||
    q.includes("calculate") ||
    q.includes("tax due") ||
    q.includes("vat payable") ||
    q.includes("mcit") ||
    q.includes("rcit") ||
    q.includes("nolco") ||
    q.includes("withholding") ||
    q.includes("ewt")
  ) {
    return "tax_computation";
  }

  if (
    q.includes("risk") ||
    q.includes("audit") ||
    q.includes("exposure") ||
    q.includes("assessment") ||
    q.includes("deficiency")
  ) {
    return "audit_risk";
  }

  if (
    q.startsWith("what is") ||
    q.startsWith("what are") ||
    q.startsWith("define") ||
    q.includes("meaning of") ||
    q.includes("definition of") ||
    q.includes("explain")
  ) {
    return "concept";
  }

  if (
    q.includes("deadline") ||
    q.includes("due date") ||
    q.includes("filing") ||
    q.includes("form") ||
    q.includes("rate") ||
    q.includes("threshold") ||
    q.includes("penalty")
  ) {
    return "compliance";
  }

  return "general";
}

export function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

export function normalizeIssuanceYear(year = "") {
  const y = String(year || "").trim();
  return y.length === 2 ? `20${y}` : y;
}

export function detectIssuanceQuery(question = "") {
  const q = String(question || "");

  const patterns = [
    {
      type: "RR",
      regex:
        /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex:
        /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex:
        /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex:
        /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    }
  ];

  for (const item of patterns) {
    const match = q.match(item.regex);

    if (match) {
      const number = normalizeIssuanceNumber(match[1]);
      const year = normalizeIssuanceYear(match[2]);

      return {
        type: item.type,
        number,
        year,
        normalized: `${item.type.toLowerCase()}-${number}-${year}`
      };
    }
  }

  return null;
}

export function isStructuredAnswer(text = "") {
  const value = String(text || "").trim();

  if (!value) {
    return false;
  }

  const hasStandard =
    /(^|\n)\s*1\.\s*DIRECT ANSWER\b/i.test(value) &&
    /\b2\.\s*LEGAL BASIS\b/i.test(value) &&
    /\b5\.\s*CONFLICT FLAG\b/i.test(value);

  const hasCase =
    /(^|\n)\s*###\s*Issue\b/i.test(value) &&
    /###\s*Applicable law/i.test(value) &&
    /###\s*Conflict flag/i.test(value);

  return hasStandard || hasCase;
}

export function stripTrailingSourceSection(text = "") {
  return String(text || "")
    .replace(/\n+\s*6\.\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*6\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*See clickable sources below\.\s*$/i, "")
    .replace(/\n+\s*No clickable sources available\.\s*$/i, "")
    .trim();
}
