// FILE: ask-helpers.js

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

export const MAX_VISIBLE_SOURCES = 5;

const HIDDEN_FOLDER_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers"
];

const CURRENT_YEAR = new Date().getFullYear();

function normalizeText(value = "") {
  return String(value || "").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function stripFileExtension(value = "") {
  return String(value || "").replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "");
}

function basename(value = "") {
  const text = String(value || "");
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

function cleanFilename(value = "") {
  return compactSpaces(
    stripFileExtension(basename(value))
      .replace(/[_]+/g, " ")
      .replace(/\(\d+\)/g, " ")
      .replace(/\s+/g, " ")
  );
}

export function normalizeSourceName(name = "") {
  return String(name || "")
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
    .replace(/revenue audit memorandum order[s]?/g, "ramo")
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
    .replace(/[\\/]/g, "-")
    .replace(/[_\s]/g, "-")
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
      doc.original_source ||
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
      doc.original_source ||
      doc.source ||
      doc.title ||
      getDocPath(doc) ||
      ""
  );
}

function getSearchableSourceText(source = {}) {
  return [
    getDocPath(source),
    getDocOriginalName(source),
    source.path,
    source.source_path,
    source.source,
    source.title,
    source.originalSource,
    source.original_source,
    source.metadata?.path,
    source.metadata?.originalSource,
    source.metadata?.originalFileName,
    source.metadata?.documentTitle,
    source.metadata?.normalizedReference,
    source.normalizedReference,
    source.normalized_reference
  ]
    .filter(Boolean)
    .join(" || ");
}

function cleanDisplayTitle(doc = {}) {
  const raw =
    doc.title ||
    doc.source_title ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    getDocOriginalName(doc) ||
    getDocPath(doc) ||
    "Untitled Source";

  return cleanFilename(raw) || "Untitled Source";
}

export function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

export function normalizeIssuanceYear(year = "") {
  const raw = String(year || "").trim();

  if (!raw) return "";

  if (/^\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = CURRENT_YEAR % 100;

    if (yy <= currentYY + 1) {
      return `20${raw}`;
    }

    return `19${raw}`;
  }

  return raw;
}

function extractIssuanceReference(text = "") {
  const value = compactSpaces(text);

  const patterns = [
    {
      type: "CONSTITUTION",
      regex: /\b1987 Constitution\b/i,
      formatter: () => "1987 Constitution"
    },
    {
      type: "STATUTE",
      regex: /\bRepublic Act No\.?\s*(\d{4,6})\b/i,
      formatter: (m) => `Republic Act No. ${m[1]}`
    },
    {
      type: "STATUTE",
      regex: /\bRA\s*(?:No\.?)?\s*(\d{4,6})\b/i,
      formatter: (m) => `RA No. ${m[1]}`
    },
    {
      type: "RR",
      regex: /\bRR\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      formatter: (m) => `RR No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RMC",
      regex: /\bRMC\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMC No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RMO",
      regex: /\bRMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMO No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RAMO",
      regex: /\bRAMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      formatter: (m) => `RAMO No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "BIR_RULING",
      regex: /\bBIR Ruling\s*(?:No\.?)?\s*([A-Za-z0-9./()-]+)\b/i,
      formatter: (m) => `BIR Ruling No. ${m[1]}`
    },
    {
      type: "SUPREME_COURT",
      regex: /\bG\.R\.\s*No\.?\s*([A-Za-z0-9.-]+)\b/i,
      formatter: (m) => `G.R. No. ${m[1]}`
    },
    {
      type: "CTA_EN_BANC",
      regex: /\bCTA\s+EB\s+No\.?\s*([A-Za-z0-9.-]+)\b/i,
      formatter: (m) => `CTA EB No. ${m[1]}`
    },
    {
      type: "CTA_DIVISION",
      regex: /\bCTA(?:\s+Case)?\s+No\.?\s*([A-Za-z0-9.-]+)\b/i,
      formatter: (m) => `CTA No. ${m[1]}`
    },
    {
      type: "COURT_OF_APPEALS",
      regex: /\bCA-G\.R\.\s*([A-Za-z0-9.-]+)\b/i,
      formatter: (m) => `CA-G.R. ${m[1]}`
    }
  ];

  for (const rule of patterns) {
    const match = value.match(rule.regex);
    if (match) {
      return {
        authorityType: rule.type,
        issuanceNumber: compactSpaces(rule.formatter(match))
      };
    }
  }

  return {
    authorityType: null,
    issuanceNumber: ""
  };
}

function extractIssuanceReferenceFromNormalizedRef(value = "") {
  const ref = String(value || "").trim();

  const patterns = [
    {
      type: "STATUTE",
      regex: /\bRA_(\d{4,6})\b/i,
      formatter: (m) => `RA No. ${m[1]}`
    },
    {
      type: "RR",
      regex: /\bRR_(\d{1,3})[-_](\d{2,4})\b/i,
      formatter: (m) => `RR No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RMC",
      regex: /\bRMC_(\d{1,3})[-_](\d{2,4})\b/i,
      formatter: (m) => `RMC No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RMO",
      regex: /\bRMO_(\d{1,3})[-_](\d{2,4})\b/i,
      formatter: (m) => `RMO No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "RAMO",
      regex: /\bRAMO_(\d{1,3})[-_](\d{2,4})\b/i,
      formatter: (m) => `RAMO No. ${Number(m[1])}-${normalizeIssuanceYear(m[2])}`
    },
    {
      type: "BIR_RULING",
      regex: /\bBIR_RULING_([A-Z0-9_()./-]+)\b/i,
      formatter: (m) => `BIR Ruling No. ${String(m[1]).replace(/_/g, "-")}`
    },
    {
      type: "SUPREME_COURT",
      regex: /\bGR_([A-Z0-9_()./-]+)\b/i,
      formatter: (m) => `G.R. No. ${String(m[1]).replace(/_/g, "-")}`
    },
    {
      type: "COURT_OF_APPEALS",
      regex: /\bCA_GR_([A-Z0-9_()./-]+)\b/i,
      formatter: (m) => `CA-G.R. ${String(m[1]).replace(/_/g, "-")}`
    },
    {
      type: "CTA_EN_BANC",
      regex: /\bCTA_EB_([A-Z0-9_()./-]+)\b/i,
      formatter: (m) => `CTA EB No. ${String(m[1]).replace(/_/g, "-")}`
    },
    {
      type: "CTA_DIVISION",
      regex: /\bCTA_([A-Z0-9_()./-]+)\b/i,
      formatter: (m) => `CTA No. ${String(m[1]).replace(/_/g, "-")}`
    }
  ];

  for (const rule of patterns) {
    const match = ref.match(rule.regex);
    if (match) {
      return {
        authorityType: rule.type,
        issuanceNumber: compactSpaces(rule.formatter(match))
      };
    }
  }

  return {
    authorityType: null,
    issuanceNumber: ""
  };
}

function inferIssuanceNumber(item = {}) {
  const text = [
    item.issuanceNumber,
    item.title,
    item.source_title,
    item.source,
    item.originalSource,
    item.original_source,
    item.path,
    item.source_path,
    item.metadata?.path,
    item.metadata?.normalizedReference,
    item.normalizedReference,
    item.normalized_reference
  ]
    .filter(Boolean)
    .join(" ");

  const direct = extractIssuanceReference(text);
  if (direct.issuanceNumber) {
    return direct.issuanceNumber;
  }

  const normalizedRef =
    item.normalizedReference ||
    item.normalized_reference ||
    item.metadata?.normalizedReference ||
    "";

  const fromNormalized = extractIssuanceReferenceFromNormalizedRef(normalizedRef);
  return fromNormalized.issuanceNumber || "";
}

function detectAuthorityFromPathOrText(doc = {}) {
  const path = lower(getDocPath(doc));
  const original = lower(getDocOriginalName(doc));
  const title = lower(doc.title || doc.source_title || "");
  const allText = compactSpaces(
    [
      getDocPath(doc),
      getDocOriginalName(doc),
      doc.title,
      doc.source_title,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference
    ]
      .filter(Boolean)
      .join(" ")
  );

  const explicit =
    extractIssuanceReference(allText).authorityType ||
    extractIssuanceReferenceFromNormalizedRef(
      doc.normalizedReference ||
        doc.normalized_reference ||
        doc.metadata?.normalizedReference ||
        ""
    ).authorityType;

  if (explicit) return explicit;

  if (path.includes("00_constitution") || original.includes("constitution")) {
    return "CONSTITUTION";
  }

  if (path.includes("01_tax_code") || path.includes("statute")) {
    return "STATUTE";
  }

  if (path.includes("02_revenue_regulations")) {
    return "RR";
  }

  if (path.includes("03_rmc")) {
    return "RMC";
  }

  if (path.includes("04b_ramo")) {
    return "RAMO";
  }

  if (path.includes("04_rmo")) {
    return "RMO";
  }

  if (path.includes("05_bir_rulings")) {
    return "BIR_RULING";
  }

  if (path.includes("05b_tax_treaties")) {
    return "TREATY";
  }

  if (path.includes("06_court_cases")) {
    if (original.includes("supreme court") || title.includes("supreme court")) {
      return "SUPREME_COURT";
    }
    if (original.includes("cta en banc") || title.includes("cta en banc")) {
      return "CTA_EN_BANC";
    }
    if (original.includes("court of appeals") || title.includes("court of appeals")) {
      return "COURT_OF_APPEALS";
    }
    if (original.includes("cta") || title.includes("cta")) {
      return "CTA_DIVISION";
    }
    return "CASE";
  }

  if (/\brr\s*\d+[-/]\d{2,4}\b/i.test(allText)) return "RR";
  if (/\brmc\s*\d+[-/]\d{2,4}\b/i.test(allText)) return "RMC";
  if (/\brmo\s*\d+[-/]\d{2,4}\b/i.test(allText)) return "RMO";
  if (/\bramo\s*\d+[-/]\d{2,4}\b/i.test(allText)) return "RAMO";
  if (/\b(republic act|ra)\s*(no\.?)?\s*\d{4,6}\b/i.test(allText)) return "STATUTE";

  return "UNKNOWN";
}

const AUTHORITY_META = {
  CONSTITUTION: { level: 1, label: "1987 Constitution", weight: 1.0 },
  STATUTE: { level: 2, label: "Statute / Tax Code / Republic Act", weight: 0.98 },
  RR: { level: 3, label: "Revenue Regulation", weight: 0.94 },
  RMC: { level: 4, label: "Revenue Memorandum Circular", weight: 0.88 },
  RMO: { level: 5, label: "Revenue Memorandum Order", weight: 0.84 },
  RAMO: { level: 6, label: "Revenue Audit Memorandum Order", weight: 0.82 },
  BIR_RULING: { level: 7, label: "BIR Ruling", weight: 0.76 },
  SUPREME_COURT: { level: 8, label: "Supreme Court Decision", weight: 0.95 },
  CTA_EN_BANC: { level: 9, label: "CTA En Banc Decision", weight: 0.72 },
  COURT_OF_APPEALS: { level: 10, label: "Court of Appeals Decision", weight: 0.7 },
  CTA_DIVISION: { level: 11, label: "CTA Division Decision", weight: 0.68 },
  TREATY: { level: 12, label: "Tax Treaty", weight: 0.9 },
  LGU: { level: 13, label: "Local Tax Ordinance", weight: 0.6 },
  CASE: { level: 20, label: "Case", weight: 0.5 },
  SECONDARY: { level: 90, label: "Secondary Material", weight: 0.35 },
  UNKNOWN: { level: 99, label: "Unknown", weight: 0.1 }
};

export function getSourceTier(source = {}) {
  const authorityType =
    source.authorityType ||
    source.authority_type ||
    source.metadata?.authorityType ||
    detectAuthorityFromPathOrText(source);

  const meta = AUTHORITY_META[authorityType] || AUTHORITY_META.UNKNOWN;

  return {
    tier: meta.level,
    level: meta.level,
    label: meta.label,
    weight: meta.weight,
    authorityType
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
  if (!Number.isFinite(num)) return 0;
  return Number(Math.min(max, Math.max(0, num)).toFixed(decimals));
}

export function buildMemoryContext(messages = []) {
  if (!messages.length) {
    return "No prior conversation.";
  }

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role || "unknown").toUpperCase()}: ${msg.content || ""}`)
    .join("\n");
}

export function extractQuizAnswer(text = "") {
  const cleaned = String(text || "").trim().toUpperCase();

  if (!cleaned) return null;
  if (/^[ABCD]$/.test(cleaned)) return cleaned;

  const match = cleaned.match(/^(?:ANSWER\s*[:\-]?\s*)?([ABCD])(?:[\s.)-].*)?$/i);
  return match?.[1]?.toUpperCase() || null;
}

export function formatQuestionBlock({
  prefix = "",
  quiz,
  storedQuiz,
  teachingText = ""
}) {
  const parts = [];

  if (prefix) parts.push(prefix);
  if (teachingText) {
    parts.push(teachingText);
    parts.push("");
  }

  parts.push(`Topic: ${quiz.topic || "Taxation"}`);
  parts.push(`Difficulty: ${quiz.difficulty || "medium"}`);
  parts.push("");
  parts.push("Question:");
  parts.push(quiz.question || "");
  parts.push("");
  parts.push(`A. ${quiz.choices?.A || ""}`);
  parts.push(`B. ${quiz.choices?.B || ""}`);
  parts.push(`C. ${quiz.choices?.C || ""}`);
  parts.push(`D. ${quiz.choices?.D || ""}`);
  parts.push("");
  parts.push("Instruction:");
  parts.push("Answer A, B, C, or D. Type /bye or /exit to stop.");

  return parts.filter(Boolean).join("\n");
}

export function shouldHideSourceFromUser(source = {}) {
  const haystack = lower(getSearchableSourceText(source));
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
    (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null);

  return {
    fileId,
    driveViewUrl,
    driveDownloadUrl
  };
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    normalizeForMatch(inferIssuanceNumber(doc)) ||
    normalizeForMatch(getDocPath(doc)) ||
    normalizeForMatch(getDocOriginalName(doc)) ||
    normalizeForMatch(doc.source) ||
    JSON.stringify(doc)
  );
}

function safeNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

export function buildSourceResponseItem(item = {}) {
  const links = buildGoogleDriveLinks(item);
  const path = getDocPath(item);
  const originalSource = getDocOriginalName(item);
  const tierInfo = getSourceTier(item);
  const issuanceNumber = inferIssuanceNumber(item);
  const title = cleanDisplayTitle(item);

  return {
    title,
    issuanceNumber,
    displayTitle: issuanceNumber || title,
    source: item.source || originalSource || path || "Untitled Source",
    originalSource,
    path,
    sourcePath: path,
    fileId: links.fileId,
    driveViewUrl: links.driveViewUrl,
    driveDownloadUrl: links.driveDownloadUrl,
    text: item.text || "",
    preview: item.preview || (item.text ? String(item.text).slice(0, 300) : ""),
    score: safeNumber(item.score, item.adjustedScore, item.finalScore, item.combined_score),
    adjustedScore: safeNumber(item.adjustedScore, item.finalScore, item.combined_score, item.score),
    authorityType:
      item.authorityType ||
      item.authority_type ||
      item.metadata?.authorityType ||
      tierInfo.authorityType,
    authorityLevel:
      safeNumber(
        item.authorityLevel,
        item.authority_level,
        item.metadata?.authorityLevel,
        tierInfo.tier
      ) || tierInfo.tier,
    authorityScore:
      safeNumber(
        item.authorityScore,
        item.authority_score,
        item.metadata?.authorityScore,
        tierInfo.weight
      ) || tierInfo.weight,
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
      const key = buildDocKey(doc);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isClickableSource(item = {}) {
  return Boolean(item.driveViewUrl || item.fileId);
}

export function filterVisibleSources(
  rawSources = [],
  {
    maxItems = MAX_VISIBLE_SOURCES,
    supersessionResult = null,
    requireClickable = true
  } = {}
) {
  const visible = [];

  for (const item of uniqueSources(rawSources)) {
    if (!item) continue;
    if (shouldHideSourceFromUser(item)) continue;

    const replacement = findReplacementForDocument(item, supersessionResult);
    const sourceToUse = replacement ? buildSourceResponseItem(replacement) : item;

    if (shouldHideSourceFromUser(sourceToUse)) continue;
    if (requireClickable && !isClickableSource(sourceToUse)) continue;

    visible.push(sourceToUse);
  }

  return uniqueSources(visible)
    .sort((a, b) => {
      const aLevel = Number(a.authorityLevel ?? 999);
      const bLevel = Number(b.authorityLevel ?? 999);

      if (aLevel !== bLevel) return aLevel - bLevel;

      return (
        Number(b.adjustedScore ?? b.score ?? 0) -
        Number(a.adjustedScore ?? a.score ?? 0)
      );
    })
    .slice(0, maxItems);
}

export function finalizeSourcesForResponse(
  rawSources = [],
  {
    maxItems = MAX_VISIBLE_SOURCES,
    supersessionResult = null,
    requireClickable = true
  } = {}
) {
  const combinedDocs = rawSources.map((item) =>
    item && typeof item === "object" ? item : {}
  );

  const effectiveSupersessionResult =
    supersessionResult || applySupersessionFilter(combinedDocs, new Date());

  return filterVisibleSources(rawSources, {
    maxItems,
    supersessionResult: effectiveSupersessionResult,
    requireClickable
  });
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

export function detectIssuanceQuery(question = "") {
  const q = String(question || "");

  const patterns = [
    {
      type: "RR",
      regex:
        /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_\/]+(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex:
        /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_\/]+(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex:
        /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_\/]+(\d{2,4})\b/i
    },
    {
      type: "RAMO",
      regex:
        /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_\/]+(\d{2,4})\b/i
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
        normalized: `${item.type.toLowerCase()}-${number}-${year}`,
        display: `${item.type} No. ${number}-${year}`
      };
    }
  }

  return null;
}

export function isStructuredAnswer(text = "") {
  const value = String(text || "").trim();

  if (!value) return false;

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
