// FILE: ask-helpers.js

import { rerankByHierarchy } from "./authority-engine.js";

export const MAX_VISIBLE_SOURCES = 5;

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

  return Number(
    Math.min(max, Math.max(0, num)).toFixed(decimals)
  );
}

export function normalizeSourceName(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/revenue regulation[s]?/g, "rr")
    .replace(/revenue memorandum circular[s]?/g, "rmc")
    .replace(/revenue memorandum order[s]?/g, "rmo")
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
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source ||
      ""
  );
}

export function getDocOriginalName(doc = {}) {
  return String(
    doc.metadata?.originalSource ||
      doc.metadata?.originalFileName ||
      doc.originalSource ||
      doc.source ||
      ""
  );
}

export function buildMemoryContext(messages = []) {
  if (!messages.length) return "No prior conversation.";

  return messages
    .slice(-10)
    .map((msg) => `${String(msg.role).toUpperCase()}: ${msg.content}`)
    .join("\n");
}

export function extractQuizAnswer(text = "") {
  const cleaned = String(text || "").trim().toUpperCase();
  if (!cleaned) return null;
  if (/^[ABCD]$/.test(cleaned)) return cleaned;

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

  if (prefix) parts.push(prefix);
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
  parts.push("");

  if (storedQuiz?.source_title) parts.push(`Source: ${storedQuiz.source_title}`);
  if (storedQuiz?.source_path) parts.push(`Source Path: ${storedQuiz.source_path}`);

  return parts.filter(Boolean).join("\n");
}

export function shouldHideSourceFromUser(source = {}) {
  const path = String(
    source.path ||
      source.source_path ||
      source.metadata?.path ||
      source.originalSource ||
      source.source ||
      ""
  ).toLowerCase();

  return (
    path.includes("07_cpa_notes") ||
    path.includes("08_review_materials")
  );
}

export function buildSourceResponseItem(item = {}) {
  const fileId =
    item.fileId ||
    item.file_id ||
    item.metadata?.fileId ||
    item.metadata?.file_id ||
    null;

  return {
    title:
      item.title ||
      item.source_title ||
      item.metadata?.documentTitle ||
      item.source ||
      item.originalSource ||
      "Unknown source",
    source:
      item.source ||
      item.source_title ||
      item.originalSource ||
      "Unknown source",
    originalSource:
      item.originalSource ||
      item.metadata?.originalSource ||
      item.source_title ||
      item.source ||
      null,
    path:
      item.source_path ||
      item.path ||
      item.metadata?.path ||
      item.originalSource ||
      item.source ||
      null,
    fileId,
    driveViewUrl:
      item.driveViewUrl ||
      item.metadata?.driveViewUrl ||
      (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null),
    driveDownloadUrl:
      item.driveDownloadUrl ||
      item.metadata?.driveDownloadUrl ||
      (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null),
    text: item.text || "",
    preview: item.preview || (item.text ? item.text.substring(0, 300) : ""),
    score: Number(item.finalScore || item.adjustedScore || item.score || 0),
    adjustedScore: Number(item.finalScore || item.adjustedScore || item.score || 0),
    authorityType:
      item.authorityType ||
      item.authority_type ||
      item.metadata?.authorityType ||
      null,
    authorityLevel:
      item.authorityLevel ||
      item.authority_level ||
      item.metadata?.authorityLevel ||
      item.authority_tier ||
      null,
    authorityScore:
      item.authorityScore ||
      item.authority_score ||
      item.metadata?.authorityScore ||
      0,
    authorityLabel:
      item.authorityLabel ||
      item.authority_label ||
      item.metadata?.authorityLabel ||
      "Unknown"
  };
}

export function finalizeSourcesForResponse(rawSources = [], query = "") {
  const reranked = rerankByHierarchy(
    rawSources.map((item) => buildSourceResponseItem(item)),
    query
  );

  const seen = new Set();

  return reranked
    .filter((item) => !shouldHideSourceFromUser(item))
    .filter((item) => item.driveViewUrl)
    .filter((item) => {
      const key = String(
        item.fileId ||
          item.driveViewUrl ||
          item.path ||
          item.originalSource ||
          item.source ||
          item.title ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((item) => ({
      title: item.title,
      source: item.source,
      originalSource: item.originalSource,
      path: item.path,
      fileId: item.fileId,
      driveViewUrl: item.driveViewUrl,
      driveDownloadUrl: item.driveDownloadUrl,
      text: item.text,
      preview: item.preview,
      score: item.score,
      adjustedScore: item.adjustedScore,
      authorityType: item.authorityType,
      authorityLevel: item.authorityLevel,
      authorityScore: item.authorityScore,
      authorityLabel: item.authorityLabel
    }));
}

export function getSourceTier(doc = {}) {
  const value = `${getDocPath(doc)} ${getDocOriginalName(doc)} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) {
    return { tier: 1, label: "Tax Code / NIRC", weight: 1.0 };
  }

  if (value.includes("02_revenue_regulations")) {
    return { tier: 2, label: "Revenue Regulations", weight: 0.95 };
  }

  if (value.includes("03_rmc")) {
    return { tier: 3, label: "Revenue Memorandum Circulars", weight: 0.9 };
  }

  if (value.includes("04_rmo")) {
    return { tier: 4, label: "Revenue Memorandum Orders", weight: 0.85 };
  }

  if (value.includes("05_bir_rulings")) {
    return { tier: 5, label: "BIR Rulings", weight: 0.75 };
  }

  if (value.includes("06_court_cases")) {
    return { tier: 6, label: "Court Cases", weight: 0.6 };
  }

  if (value.includes("07_cpa_notes")) {
    return { tier: 7, label: "CPA Notes / Internal Notes", weight: 0.4 };
  }

  return { tier: 99, label: "Unclassified Source", weight: 0.5 };
}

export function classifyQuestion(question = "") {
  const q = String(question || "").toLowerCase();

  if (
    /\b(rr|rmc|rmo)\s*(no\.?)?\s*\d+/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order")
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
    q.includes("g.r. no")
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
      regex: /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMC",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
    },
    {
      type: "RMO",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)[\s\-_]?(\d{2,4})\b/i
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

export function isExactIssuanceMatch(doc, issuance) {
  if (!doc || !issuance) return false;

  const type = String(issuance.type || "").toLowerCase();
  const number = normalizeIssuanceNumber(issuance.number);
  const year = normalizeIssuanceYear(issuance.year);

  const number2 = number.padStart(2, "0");
  const number3 = number.padStart(3, "0");

  const rawCandidates = [
    doc.source,
    doc.originalSource,
    doc.metadata?.originalSource,
    doc.metadata?.originalFileName,
    doc.metadata?.normalizedSource,
    doc.metadata?.path,
    doc.path
  ].filter(Boolean);

  const normalizedCandidates = rawCandidates.map(normalizeForMatch);

  const fullName =
    type === "rr"
      ? "revenue-regulation"
      : type === "rmc"
        ? "revenue-memorandum-circular"
        : "revenue-memorandum-order";

  const pluralFullName =
    type === "rr"
      ? "revenue-regulations"
      : type === "rmc"
        ? "revenue-memorandum-circulars"
        : "revenue-memorandum-orders";

  const possibleTargets = [
    `${type}-${number}-${year}`,
    `${type}-${number2}-${year}`,
    `${type}-${number3}-${year}`,
    `${type}_${number}-${year}`,
    `${type}_${number2}-${year}`,
    `${type}_${number3}-${year}`,
    `${type}-${number}_${year}`,
    `${type}-${number2}_${year}`,
    `${type}-${number3}_${year}`,
    `${type}${number}-${year}`,
    `${type}${number2}-${year}`,
    `${type}${number3}-${year}`,
    `${type}${number}_${year}`,
    `${type}${number2}_${year}`,
    `${type}${number3}_${year}`,
    `${type}${number}${year}`,
    `${type}${number2}${year}`,
    `${type}${number3}${year}`,
    `${type}-no-${number}-${year}`,
    `${type}-no-${number2}-${year}`,
    `${type}-no-${number3}-${year}`,
    `${fullName}-${number}-${year}`,
    `${fullName}-${number2}-${year}`,
    `${fullName}-${number3}-${year}`,
    `${fullName}-no-${number}-${year}`,
    `${fullName}-no-${number2}-${year}`,
    `${fullName}-no-${number3}-${year}`,
    `${pluralFullName}-${number}-${year}`,
    `${pluralFullName}-${number2}-${year}`,
    `${pluralFullName}-${number3}-${year}`
  ].map(normalizeForMatch);

  return normalizedCandidates.some((candidate) =>
    possibleTargets.some((target) => candidate.includes(target))
  );
}
