// FILE: reindex-service.js
"use strict";

/**
 * TINA Reindex Service
 * Version: 4.0.0
 *
 * Role:
 * - Google Drive tax-library reindexing
 * - file reading via drive-reader.js
 * - metadata normalization
 * - authority metadata preservation
 * - normalized reference preservation
 * - source/chunk hashing metadata
 * - vector-store persistence handoff
 *
 * Boundary:
 * - No OpenAI answer calls
 * - No answer generation
 * - No retrieval policy
 * - No reranking
 * - No legal reasoning
 * - No citation rendering
 */

import { createHash, randomBytes } from "crypto";

import {
  listDriveFiles,
  extractTextFromFile,
  readDriveFile,
  normalizeDriveFileMetadata,
  inferAuthorityTypeFromPath,
  inferNormalizedReference
} from "./drive-reader.js";

import {
  clearVectorStore,
  acquireReindexLock,
  releaseReindexLock,
  heartbeatReindexLock,
  INSTANCE_ID,
  LOCK_TABLE,
  addDocumentToVectorStore,
  removeSourceFromVectorStore,
  removeSourceByPatternFromVectorStore,
  countSourceRows,
  getVectorStoreStats,
  normalizeSourceName
} from "./vector-store.js";

import { buildAuthorityMetadata } from "./authority-engine.js";

// Generate a unique job ID for log correlation and DB lock attribution.
// Format: "reindex-<timestamp-base36>-<4-byte-hex>"
function generateJobId() {
  return `reindex-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

const ENGINE_VERSION = "4.0.0";

const MAX_INDEX_TEXT_CHARS = Number(
  process.env.REINDEX_MAX_INDEX_TEXT_CHARS || 900000
);

const MAX_INDEX_EXCERPT_CHARS = Number(
  process.env.REINDEX_MAX_EXCERPT_CHARS || 1800
);

const INDEX_CHUNK_SIZE = Number(
  process.env.REINDEX_CHUNK_SIZE || 1200
);

const INDEX_CHUNK_OVERLAP = Number(
  process.env.REINDEX_CHUNK_OVERLAP || 200
);

const TAX_LIBRARY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES",
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

const INDEXED_AUTHORITY_FOLDERS = Object.freeze([
  "01_TAX_CODE",
  "02_REVENUE_REGULATIONS",
  "03_RMC",
  "04_RMO",
  "05_BIR_RULINGS",
  "06_COURT_CASES"
]);

const REVIEW_FOLDERS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS"
]);

const FOLDER_AUTHORITY_MAP = Object.freeze({
  "01_TAX_CODE": "STATUTE",
  "02_REVENUE_REGULATIONS": "RR",
  "03_RMC": "RMC",
  "04_RMO": "RMO",
  "05_BIR_RULINGS": "BIR_RULING",
  "06_COURT_CASES": "JURISPRUDENCE",
  "07_CPA_NOTES": "CPA_NOTES",
  "08_REVIEW_MATERIALS": "REVIEW_MATERIALS"
});

const AUTHORITY_LEVELS = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  REPUBLIC_ACT: 2,
  CMTA: 2,
  LGC: 2,
  TAX_TREATY: 3,
  TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  JURISPRUDENCE: 5,
  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  RR: 8,
  RMC: 9,
  RMO: 9,
  RAMO: 9,
  BIR_RULING: 10,
  ADMINISTRATIVE_GUIDANCE: 11,
  BOC_ISSUANCE: 11,
  LGU_ORDINANCE: 11,
  OECD: 12,
  FOREIGN_AUTHORITY: 12,
  PFRS: 13,
  PAS: 13,
  PSA: 13,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,
  UNKNOWN: 99
});

function safeString(value = "") {
  return String(value || "").trim();
}

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function compactSpaces(value = "") {
  return safeString(value).replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return compactSpaces(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function truncateText(value = "", maxChars = MAX_INDEX_TEXT_CHARS) {
  const text = normalizeText(value);
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
}

function makeExcerpt(value = "", maxChars = MAX_INDEX_EXCERPT_CHARS) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()} ...[trimmed for context budget]`;
}

function hashContent(value = "") {
  return createHash("sha256")
    .update(String(value || ""), "utf8")
    .digest("hex");
}

function safeNormalizeSourceName(value = "") {
  if (typeof normalizeSourceName === "function") {
    return normalizeSourceName(value);
  }

  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._/-]/g, "")
    .replace(/_+/g, "_")
    .trim();
}

function normalizeAuthorityType(type = "") {
  const raw = safeString(type).toUpperCase();

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    TREATY: "TAX_TREATY",
    CASE_LAW: "JURISPRUDENCE",
    COURT_CASES: "JURISPRUDENCE",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RULING: "BIR_RULING",
    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS",
    SECONDARY_MATERIAL: "SECONDARY"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function authorityLevelOf(type = "UNKNOWN") {
  const normalized = normalizeAuthorityType(type);
  return Number(AUTHORITY_LEVELS[normalized] || AUTHORITY_LEVELS.UNKNOWN);
}

function getFolderNameFromPath(path = "") {
  const normalized = safeString(path).toUpperCase();

  for (const folder of TAX_LIBRARY_FOLDERS) {
    if (normalized.includes(folder)) return folder;
  }

  return null;
}

function getSourceLibrary(folderName = "") {
  if (INDEXED_AUTHORITY_FOLDERS.includes(folderName)) {
    return "TAX_AUTHORITY_LIBRARY";
  }

  if (REVIEW_FOLDERS.includes(folderName)) {
    return "TAX_REVIEW_LIBRARY";
  }

  return "GENERAL_DRIVE_LIBRARY";
}

function isReviewMaterial(folderPath = "") {
  const folderName = getFolderNameFromPath(folderPath);
  return REVIEW_FOLDERS.includes(folderName);
}

function inferAuthorityType(file = {}, textPreview = "") {
  const folderPath = safeString(
    file.folderPath ||
      file.folder_path ||
      file.path ||
      file.metadata?.folderPath ||
      file.metadata?.path ||
      file.name ||
      file.fileName ||
      ""
  );

  const fileName = safeString(file.fileName || file.name || file.documentTitle || "");

  if (typeof inferAuthorityTypeFromPath === "function") {
    const inferred = inferAuthorityTypeFromPath(folderPath, fileName, textPreview);
    if (inferred && inferred !== "UNKNOWN") return normalizeAuthorityType(inferred);
  }

  const folderName = getFolderNameFromPath(`${folderPath} ${fileName}`);
  if (folderName && FOLDER_AUTHORITY_MAP[folderName]) {
    return FOLDER_AUTHORITY_MAP[folderName];
  }

  const blob = lower(`${folderPath} ${fileName} ${textPreview.slice(0, 2000)}`);

  if (/\bconstitution|1987 philippine constitution/i.test(blob)) return "CONSTITUTION";
  if (/\b(cmta|customs modernization and tariff act)\b/i.test(blob)) return "CMTA";
  if (/\b(local government code|lgc)\b/i.test(blob)) return "LGC";
  if (/\b(nirc|tax code|national internal revenue code)\b/i.test(blob)) return "STATUTE";
  if (/\b(ra|r\.a\.|republic act)\s*(no\.?)?\s*\d{4,6}\b/i.test(blob)) return "STATUTE";
  if (/\btax treaty|double tax agreement|dta\b/i.test(blob)) return "TAX_TREATY";

  if (/\brr\b|revenue regulation/i.test(blob)) return "RR";
  if (/\brmc\b|revenue memorandum circular/i.test(blob)) return "RMC";
  if (/\bramo\b|revenue audit memorandum order/i.test(blob)) return "RAMO";
  if (/\brmo\b|revenue memorandum order/i.test(blob)) return "RMO";
  if (/bir ruling|b\.i\.r\. ruling/i.test(blob)) return "BIR_RULING";

  if (/supreme court en banc/i.test(blob)) return "SUPREME_COURT_EN_BANC";
  if (/\bg\.?\s*r\.?\s*no\.?\b|supreme court/i.test(blob)) return "SUPREME_COURT";
  if (/cta en banc|cta eb/i.test(blob)) return "CTA_EN_BANC";
  if (/\bcta\b|court of tax appeals/i.test(blob)) return "CTA_DIVISION";

  if (/\bboc\b|customs memorandum|customs administrative order/i.test(blob)) {
    return "BOC_ISSUANCE";
  }

  if (/lgu ordinance|local tax ordinance|revenue ordinance/i.test(blob)) {
    return "LGU_ORDINANCE";
  }

  if (/\bpfrs\b|philippine financial reporting standards/i.test(blob)) return "PFRS";
  if (/\bpas\b|philippine accounting standard/i.test(blob)) return "PAS";
  if (/\bpsa\b|philippine standards on auditing/i.test(blob)) return "PSA";
  if (/\boecd\b/i.test(blob)) return "OECD";
  if (/foreign authority|irs|hmrc|ato|singapore iras/i.test(blob)) return "FOREIGN_AUTHORITY";

  if (/cpa notes|review materials|reviewer|handout|lecture/i.test(blob)) {
    return "SECONDARY";
  }

  return "UNKNOWN";
}

function normalizeYear(year = "") {
  const raw = safeString(year);
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function padNumber(num = "") {
  const n = safeString(num).replace(/^0+/, "") || "0";

  return {
    raw: n,
    two: n.padStart(2, "0"),
    three: n.padStart(3, "0")
  };
}

function buildIssuanceReference(prefix, num, year) {
  const padded = padNumber(num);
  const normalizedYear = normalizeYear(year);

  if (!prefix || !padded.raw || !normalizedYear) return "";

  return `${prefix.toUpperCase()} ${padded.raw}-${normalizedYear}`;
}

function buildSectionReference(code, section = "") {
  const cleanSection = safeString(section).replace(/\s+/g, "");
  if (!code || !cleanSection) return "";
  return `${code.toUpperCase()} Sec. ${cleanSection}`;
}

function inferNormalizedReferenceFallback({
  fileName = "",
  folderPath = "",
  text = ""
} = {}) {
  const raw = `${fileName}\n${folderPath}\n${normalizeText(text).slice(0, 3000)}`;
  const sample = raw.replace(/_/g, " ");

  // Use period-terminated matchAll so inline citations (no trailing dot) are excluded.
  // If 2+ distinct section numbers appear, this is a multi-section document (e.g. full NIRC);
  // skip document-level inference and let per-chunk detection assign references instead.
  const nircSectionMatches = [
    ...sample.matchAll(
      /\b(?:NIRC|National\s+Internal\s+Revenue\s+Code)?\s*(?:Sec\.?|Section)\s+([0-9]{1,3}[A-Z]?)\./gi
    )
  ];
  const distinctNircNums = new Set(nircSectionMatches.map(m => m[1].toUpperCase()));
  if (distinctNircNums.size === 1) {
    return buildSectionReference("NIRC", [...distinctNircNums][0]);
  }

  const cmtaSection = sample.match(
    /\b(?:CMTA|Customs\s+Modernization\s+and\s+Tariff\s+Act)\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\b/i
  );
  if (cmtaSection) return buildSectionReference("CMTA", cmtaSection[1]);

  const lgcSection = sample.match(
    /\b(?:LGC|Local\s+Government\s+Code)\s*(?:Sec\.?|Section)\s*([0-9]{1,4}[A-Z]?(?:\([A-Z0-9]+\))?)\b/i
  );
  if (lgcSection) return buildSectionReference("LGC", lgcSection[1]);

  const issuancePatterns = [
    {
      prefix: "RR",
      regex: /\b(?:RR|Revenue\s+Regulation[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "RMC",
      regex: /\b(?:RMC|Revenue\s+Memorandum\s+Circular[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "RMO",
      regex: /\b(?:RMO|Revenue\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    },
    {
      prefix: "RAMO",
      regex: /\b(?:RAMO|Revenue\s+Audit\s+Memorandum\s+Order[s]?)\s*(?:No\.?)?\s*0*(\d+)\s*[-_ /]?\s*(\d{2,4})\b/i
    }
  ];

  for (const item of issuancePatterns) {
    const match = sample.match(item.regex);
    if (match) return buildIssuanceReference(item.prefix, match[1], match[2]);
  }

  const birRuling = sample.match(
    /\b(?:BIR\s+Ruling|Ruling)\s*(?:No\.?)?\s*([A-Z0-9-]+)\b/i
  );
  if (birRuling) return `BIR Ruling ${birRuling[1]}`;

  const grNo = sample.match(/\bG\.?\s*R\.?\s*No\.?\s*([A-Z0-9.-]+)\b/i);
  if (grNo) return `G.R. No. ${grNo[1]}`;

  const ctaEb = sample.match(
    /\bCTA\s*(?:EB|En\s+Banc)\s*(?:No\.?)?\s*(\d[A-Z0-9.-]*)\b/i
  );
  if (ctaEb) return `CTA EB No. ${ctaEb[1]}`;

  const ctaCase = sample.match(
    /\bCTA\s*(?:Case)?\s*(?:No\.?)?\s*(\d[A-Z0-9.-]*)\b/i
  );
  if (ctaCase) return `CTA Case No. ${ctaCase[1]}`;

  const ra = sample.match(
    /\b(?:RA|R\.A\.|Republic\s+Act)\s*(?:No\.?)?\s*0*(\d{4,6})\b/i
  );
  if (ra) return `RA ${ra[1]}`;

  return safeNormalizeSourceName(fileName || folderPath);
}

function inferNormalizedReferenceSafe({
  fileName = "",
  folderPath = "",
  text = ""
} = {}) {
  try {
    if (typeof inferNormalizedReference === "function") {
      const inferred = inferNormalizedReference({
        fileName,
        folderPath,
        text
      });

      if (inferred) return inferred;
    }
  } catch {
    // fallback below
  }

  return inferNormalizedReferenceFallback({
    fileName,
    folderPath,
    text
  });
}

function inferPossibleTaxDomains(input = {}) {
  const blob = lower(
    [
      input.fileName,
      input.documentTitle,
      input.folderPath,
      input.folderName,
      input.normalizedReference,
      input.text
    ].filter(Boolean).join(" ")
  );

  const domains = [];

  if (/\bvat|value[- ]added tax|input vat|output vat|zero[- ]rated|2550q|2550m\b/i.test(blob)) domains.push("VAT");
  if (/\bcit|corporate income tax|rcit|mcit|nolco|regular corporate income tax\b/i.test(blob)) domains.push("CIT");
  if (/\biit|individual income tax|compensation income|self-employed|professional income\b/i.test(blob)) domains.push("IIT");
  if (/\bwht|withholding tax|ewt|cwt|fwt|expanded withholding|creditable withholding\b/i.test(blob)) domains.push("WHT");
  if (/\bestate tax|estate\b/i.test(blob)) domains.push("EST");
  if (/\bpercentage tax|pct\b/i.test(blob)) domains.push("PCT");
  if (/\bexcise tax|excise\b/i.test(blob)) domains.push("EXC");
  if (/\bassessment|loa|pan|fan|flda|preliminary assessment|final assessment\b/i.test(blob)) domains.push("PRE");
  if (/\bprotest|appeal|cta|dispute|refund litigation\b/i.test(blob)) domains.push("DIS");
  if (/\blocal business tax|real property tax|lgu|local tax\b/i.test(blob)) domains.push("LGT");
  if (/\bcustoms|tariff|import duties|boc\b/i.test(blob)) domains.push("CUS");
  if (/\bstamp tax|documentary stamp|dst\b/i.test(blob)) domains.push("SPC");
  if (/\bcontract|lease|agreement|concession\b/i.test(blob)) domains.push("CON");

  return unique(domains);
}

function inferPossibleSubIssues(input = {}) {
  const blob = lower(
    [
      input.fileName,
      input.documentTitle,
      input.folderPath,
      input.folderName,
      input.normalizedReference,
      input.text
    ].filter(Boolean).join(" ")
  );

  const subIssues = [];

  if (/\bdefine vat|what is vat|nature of vat|scope of vat|sec\.?\s*105\b/i.test(blob)) subIssues.push("DEFINITION");
  if (/\brefund|tax credit|tcc|sec\.?\s*112|120-day|30-day|administrative claim|judicial claim\b/i.test(blob)) subIssues.push("REFUND_CREDIT");
  if (/\bzero[- ]rated|export sales|cross-border|destination principle|peza|create\b/i.test(blob)) subIssues.push("ZERO_RATING");
  if (/\binput tax|input vat|creditable input|substantiation|sec\.?\s*110\b/i.test(blob)) subIssues.push("INPUT_TAX");
  if (/\bexempt|sec\.?\s*109|vat exempt|non-vat\b/i.test(blob)) subIssues.push("EXEMPTION");
  if (/\boutput vat|output tax|gross receipts|gross selling price|sec\.?\s*106|sec\.?\s*108\b/i.test(blob)) subIssues.push("OUTPUT_TAX");
  if (/\bregistration|threshold|cor|sec\.?\s*236\b/i.test(blob)) subIssues.push("REGISTRATION");
  if (/\b2550m|2550q|vat return|slsp|filing|deadline\b/i.test(blob)) subIssues.push("COMPLIANCE");
  if (/\bwithholding vat|wvat|sec\.?\s*114\(c\)|government money payment\b/i.test(blob)) subIssues.push("WITHHOLDING_VAT");
  if (/\btransitional input|beginning inventory|sec\.?\s*111\b/i.test(blob)) subIssues.push("TRANSITIONAL_INPUT_TAX");
  if (/\bdeemed sale|sec\.?\s*106\(b\)|retirement|cessation\b/i.test(blob)) subIssues.push("DEEMED_SALE");

  return unique(subIssues);
}

function chunkTextForIndexing(text = "", chunkSize = INDEX_CHUNK_SIZE, overlap = INDEX_CHUNK_OVERLAP) {
  const clean = normalizeText(text);
  if (!clean) return [];

  const safeChunkSize = Math.max(400, Number(chunkSize) || INDEX_CHUNK_SIZE);
  const safeOverlap = Math.max(
    0,
    Math.min(Number(overlap) || INDEX_CHUNK_OVERLAP, safeChunkSize - 150)
  );

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((part) => normalizeText(part))
    .filter((part) => part.length >= 20);

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if ((current.length + paragraph.length + 2) <= safeChunkSize) {
      current = `${current}\n\n${paragraph}`;
    } else {
      chunks.push(current);
      const carry = current.slice(Math.max(0, current.length - safeOverlap));
      current = carry ? `${carry}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);

  return chunks
    .map((chunk) => normalizeText(chunk))
    .filter((chunk) => chunk.length >= 80);
}

function buildFallbackAuthorityMetadata({ fileName = "", path = "", text = "" }) {
  const authorityType = inferAuthorityType(
    {
      fileName,
      name: fileName,
      folderPath: path,
      path
    },
    text.slice(0, 3000)
  );

  return {
    authorityType,
    authorityLevel: authorityLevelOf(authorityType),
    authorityScore: authorityType === "UNKNOWN" ? 0 : 70,
    authorityLabel: authorityType,
    controllingPrecedence: authorityLevelOf(authorityType),
    normalizedReference: inferNormalizedReferenceSafe({
      fileName,
      folderPath: path,
      text
    }),
    normalizedAliases: [],
    recencyDate: null
  };
}

function safeBuildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
  try {
    if (typeof buildAuthorityMetadata === "function") {
      const authority = buildAuthorityMetadata({
        fileName,
        path,
        text,
        modifiedTime
      });

      if (authority) return authority;
    }
  } catch (error) {
    console.warn("Authority metadata fallback used:", error?.message || "Unknown authority metadata error");
  }

  return buildFallbackAuthorityMetadata({
    fileName,
    path,
    text
  });
}

export function normalizeIndexedMetadata(file = {}, text = "") {
  const compactText = truncateText(text);
  const textPreview = compactText.slice(0, 4000);

  let driveMetadata = {};
  try {
    driveMetadata =
      typeof normalizeDriveFileMetadata === "function"
        ? normalizeDriveFileMetadata(file, file.path ? "" : "")
        : file;
  } catch {
    driveMetadata = file;
  }

  const fileId = driveMetadata.fileId || driveMetadata.file_id || driveMetadata.id || file.id || null;
  const fileName = safeString(
    driveMetadata.fileName ||
      driveMetadata.file_name ||
      driveMetadata.name ||
      file.name ||
      "unknown"
  );

  const documentTitle = safeString(
    driveMetadata.documentTitle ||
      driveMetadata.document_title ||
      file.documentTitle ||
      fileName
  );

  const folderPath = safeString(
    driveMetadata.folderPath ||
      driveMetadata.folder_path ||
      driveMetadata.path ||
      file.path ||
      fileName
  );

  const folderName =
    driveMetadata.folderName ||
    driveMetadata.folder_name ||
    getFolderNameFromPath(folderPath);

  const authorityFromDrive =
    driveMetadata.authorityType ||
    driveMetadata.authority_type ||
    null;

  const inferredAuthorityType =
    authorityFromDrive && authorityFromDrive !== "UNKNOWN"
      ? normalizeAuthorityType(authorityFromDrive)
      : inferAuthorityType(
          {
            ...file,
            fileName,
            name: fileName,
            documentTitle,
            folderPath,
            path: folderPath
          },
          textPreview
        );

  const authority = safeBuildAuthorityMetadata({
    fileName,
    path: folderPath,
    text: textPreview,
    modifiedTime: file.modifiedTime || driveMetadata.modifiedTime || null
  });

  const authorityType =
    inferredAuthorityType !== "UNKNOWN"
      ? inferredAuthorityType
      : normalizeAuthorityType(authority.authorityType || "UNKNOWN");

  const authorityLevel =
    Number(authority.authorityLevel || authorityLevelOf(authorityType)) ||
    authorityLevelOf(authorityType);

  const normalizedReference =
    inferNormalizedReferenceSafe({
      fileName,
      folderPath,
      text: textPreview
    }) ||
    driveMetadata.normalizedReference ||
    driveMetadata.normalized_reference ||
    authority.normalizedReference;

  const possibleTaxDomain = unique([
    ...(Array.isArray(driveMetadata.possibleTaxDomain) ? driveMetadata.possibleTaxDomain : []),
    ...(Array.isArray(driveMetadata.possibleTaxDomains) ? driveMetadata.possibleTaxDomains : []),
    ...inferPossibleTaxDomains({
      fileName,
      documentTitle,
      folderPath,
      folderName,
      normalizedReference,
      text: textPreview
    })
  ]);

  const possibleSubIssues = unique([
    ...(Array.isArray(driveMetadata.possibleSubIssues) ? driveMetadata.possibleSubIssues : []),
    ...inferPossibleSubIssues({
      fileName,
      documentTitle,
      folderPath,
      folderName,
      normalizedReference,
      text: textPreview
    })
  ]);

  const normalizedSource =
    safeString(driveMetadata.normalizedSource || driveMetadata.normalized_source) ||
    safeNormalizeSourceName(folderPath || fileName);

  const sourceHash = hashContent(
    [
      fileId,
      normalizedSource,
      folderPath,
      fileName,
      file.modifiedTime || driveMetadata.modifiedTime || "",
      compactText.length,
      compactText.slice(0, 2000)
    ].join("|")
  );

  return {
    fileId,
    file_id: fileId,

    documentTitle,
    document_title: documentTitle,

    fileName,
    file_name: fileName,

    originalFileName: fileName,
    original_file_name: fileName,
    originalSource: fileName,
    original_source: fileName,

    normalizedSource,
    normalized_source: normalizedSource,

    mimeType: driveMetadata.mimeType || driveMetadata.mime_type || file.mimeType || null,
    mime_type: driveMetadata.mimeType || driveMetadata.mime_type || file.mimeType || null,

    driveViewUrl:
      driveMetadata.driveViewUrl ||
      driveMetadata.drive_view_url ||
      driveMetadata.webViewLink ||
      file.driveViewUrl ||
      file.webViewLink ||
      null,
    drive_view_url:
      driveMetadata.driveViewUrl ||
      driveMetadata.drive_view_url ||
      driveMetadata.webViewLink ||
      file.driveViewUrl ||
      file.webViewLink ||
      null,
    webViewLink:
      driveMetadata.webViewLink ||
      driveMetadata.web_view_link ||
      driveMetadata.driveViewUrl ||
      file.webViewLink ||
      file.driveViewUrl ||
      null,

    driveDownloadUrl:
      driveMetadata.driveDownloadUrl ||
      driveMetadata.drive_download_url ||
      file.driveDownloadUrl ||
      file.webContentLink ||
      null,
    drive_download_url:
      driveMetadata.driveDownloadUrl ||
      driveMetadata.drive_download_url ||
      file.driveDownloadUrl ||
      file.webContentLink ||
      null,

    folderId: driveMetadata.folderId || driveMetadata.folder_id || file.folderId || null,
    folder_id: driveMetadata.folderId || driveMetadata.folder_id || file.folderId || null,

    folderName,
    folder_name: folderName,

    folderPath,
    folder_path: folderPath,
    path: folderPath,

    parentFolderIds:
      driveMetadata.parentFolderIds ||
      driveMetadata.parent_folder_ids ||
      file.parents ||
      [],
    parent_folder_ids:
      driveMetadata.parentFolderIds ||
      driveMetadata.parent_folder_ids ||
      file.parents ||
      [],

    authorityType,
    authority_type: authorityType,
    authorityLevel,
    authority_level: authorityLevel,
    authorityScore: authority.authorityScore || (authorityType === "UNKNOWN" ? 0 : 70),
    authority_score: authority.authorityScore || (authorityType === "UNKNOWN" ? 0 : 70),
    authorityLabel: authority.authorityLabel || authorityType,
    authority_label: authority.authorityLabel || authorityType,
    controllingPrecedence:
      authority.controllingPrecedence ||
      authorityLevelOf(authorityType),
    controlling_precedence:
      authority.controllingPrecedence ||
      authorityLevelOf(authorityType),

    normalizedReference,
    normalized_reference: normalizedReference,
    normalizedAliases: Array.isArray(authority.normalizedAliases)
      ? authority.normalizedAliases
      : [],
    normalized_aliases: Array.isArray(authority.normalizedAliases)
      ? authority.normalizedAliases
      : [],

    taxDomain: possibleTaxDomain[0] || null,
    tax_domain: possibleTaxDomain[0] || null,
    possibleTaxDomain,
    possible_tax_domain: possibleTaxDomain,
    possibleTaxDomains: possibleTaxDomain,
    possible_tax_domains: possibleTaxDomain,
    possibleSubIssues,
    possible_sub_issues: possibleSubIssues,

    sourceLibrary: driveMetadata.sourceLibrary || getSourceLibrary(folderName),
    source_library: driveMetadata.sourceLibrary || getSourceLibrary(folderName),
    isTaxLibraryFile:
      typeof driveMetadata.isTaxLibraryFile === "boolean"
        ? driveMetadata.isTaxLibraryFile
        : Boolean(folderName),
    is_tax_library_file:
      typeof driveMetadata.isTaxLibraryFile === "boolean"
        ? driveMetadata.isTaxLibraryFile
        : Boolean(folderName),
    isReviewMaterial:
      typeof driveMetadata.isReviewMaterial === "boolean"
        ? driveMetadata.isReviewMaterial
        : isReviewMaterial(folderPath),
    is_review_material:
      typeof driveMetadata.isReviewMaterial === "boolean"
        ? driveMetadata.isReviewMaterial
        : isReviewMaterial(folderPath),

    createdTime: driveMetadata.createdTime || driveMetadata.created_time || file.createdTime || null,
    created_time: driveMetadata.createdTime || driveMetadata.created_time || file.createdTime || null,
    modifiedTime: driveMetadata.modifiedTime || driveMetadata.modified_time || file.modifiedTime || null,
    modified_time: driveMetadata.modifiedTime || driveMetadata.modified_time || file.modifiedTime || null,

    size: driveMetadata.size || file.size || null,

    recencyDate: authority.recencyDate || driveMetadata.modifiedTime || file.modifiedTime || null,
    recency_date: authority.recencyDate || driveMetadata.modifiedTime || file.modifiedTime || null,

    jurisdiction: "PH",
    sourceCategory: "google_drive_index",
    source_category: "google_drive_index",

    effectiveFrom: authority.effectiveFrom || null,
    effective_from: authority.effectiveFrom || null,
    effectiveTo: authority.effectiveTo || null,
    effective_to: authority.effectiveTo || null,

    isSuperseded: Boolean(authority.isSuperseded || false),
    is_superseded: Boolean(authority.isSuperseded || false),
    supersededByReference: authority.supersededByReference || null,
    superseded_by_reference: authority.supersededByReference || null,
    repealedByReference: authority.repealedByReference || null,
    repealed_by_reference: authority.repealedByReference || null,
    amendedByReference: authority.amendedByReference || null,
    amended_by_reference: authority.amendedByReference || null,

    sourceHash,
    source_hash: sourceHash,
    isActive: true,
    is_active: true,

    indexedAt: new Date().toISOString(),
    indexed_at: new Date().toISOString(),

    tinaIndexedAt: new Date().toISOString(),
    tinaReindexServiceVersion: ENGINE_VERSION,
    tina_reindex_service_version: ENGINE_VERSION
  };
}

function buildIndexChunks(text = "", metadata = {}) {
  const chunks = chunkTextForIndexing(text);

  return chunks.map((chunkText, index) => {
    const chunkHash = hashContent(
      [
        metadata.fileId,
        metadata.normalizedSource,
        metadata.sourceHash,
        index,
        chunkText
      ].join("|")
    );

    return {
      chunkId: `${metadata.fileId || metadata.normalizedSource || "source"}:${index}:${chunkHash.slice(0, 12)}`,
      chunk_id: `${metadata.fileId || metadata.normalizedSource || "source"}:${index}:${chunkHash.slice(0, 12)}`,
      chunkIndex: index,
      chunk_index: index,
      chunkText,
      chunk_text: chunkText,
      text: chunkText,
      content: chunkText,
      excerpt: makeExcerpt(chunkText),
      chunkHash,
      chunk_hash: chunkHash
    };
  });
}

export function buildIndexedChunkPayload(chunk = {}, metadata = {}) {
  return {
    source: metadata.normalizedSource,
    original_source: metadata.originalSource || metadata.fileName,
    chunk_index: chunk.chunkIndex,
    text: chunk.text,
    metadata: {
      ...metadata,

      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      chunkHash: chunk.chunkHash,
      chunkTextLength: chunk.text.length,
      chunkExcerpt: chunk.excerpt,

      fileId: metadata.fileId,
      fileName: metadata.fileName,
      documentTitle: metadata.documentTitle,
      mimeType: metadata.mimeType,

      driveViewUrl: metadata.driveViewUrl,
      webViewLink: metadata.webViewLink,

      folderId: metadata.folderId,
      folderName: metadata.folderName,
      folderPath: metadata.folderPath,
      parentFolderIds: metadata.parentFolderIds,

      authorityType: metadata.authorityType,
      authorityLevel: metadata.authorityLevel,
      controllingPrecedence: metadata.controllingPrecedence,
      normalizedReference: metadata.normalizedReference,

      taxDomain: metadata.taxDomain,
      possibleTaxDomain: metadata.possibleTaxDomain,
      possibleTaxDomains: metadata.possibleTaxDomains,
      possibleSubIssues: metadata.possibleSubIssues,

      sourceLibrary: metadata.sourceLibrary,
      sourceHash: metadata.sourceHash,
      chunkHash: chunk.chunkHash,
      indexedAt: metadata.indexedAt,
      isActive: true,

      compactIndexedMetadata: true
    }
  };
}

function buildFailedRecord(file = {}, overrides = {}) {
  const fallbackName = safeString(file?.name || file?.fileName || "unknown");
  const fallbackPath = safeString(file?.path || file?.folderPath || fallbackName);
  const folderName = getFolderNameFromPath(fallbackPath);

  return {
    fileId: file?.id || file?.fileId || null,
    fileName: overrides.fileName || fallbackName,
    documentTitle: overrides.documentTitle || fallbackName,
    normalizedSource:
      overrides.normalizedSource ||
      safeNormalizeSourceName(fallbackPath || fallbackName),
    folderName: overrides.folderName || folderName,
    folderPath: overrides.folderPath || fallbackPath,
    path: overrides.path || fallbackPath,
    mimeType: overrides.mimeType || file?.mimeType || null,
    authorityType: overrides.authorityType || null,
    authorityLevel: overrides.authorityLevel || null,
    authorityLabel: overrides.authorityLabel || null,
    normalizedReference: overrides.normalizedReference || null,
    possibleTaxDomain: overrides.possibleTaxDomain || [],
    possibleSubIssues: overrides.possibleSubIssues || [],
    reason: overrides.reason || "File indexing failed",
    status: "Failed"
  };
}

async function readFileForIndexing(file = {}) {
  if (typeof readDriveFile === "function") {
    const record = await readDriveFile(file);

    return {
      file: {
        ...file,
        ...record
      },
      text: normalizeText(record.text || record.content || ""),
      readRecord: record
    };
  }

  const text = normalizeText(await extractTextFromFile(file));

  return {
    file,
    text,
    readRecord: null
  };
}

export async function shouldReindexFile(file = {}, existingMetadata = null) {
  if (!existingMetadata) return true;

  const currentModified = safeString(file.modifiedTime || file.modified_time || "");
  const previousModified = safeString(
    existingMetadata.modifiedTime ||
      existingMetadata.modified_time ||
      existingMetadata.metadata?.modifiedTime ||
      ""
  );

  if (currentModified && previousModified && currentModified !== previousModified) {
    return true;
  }

  const currentFileId = safeString(file.id || file.fileId || "");
  const previousFileId = safeString(
    existingMetadata.fileId ||
      existingMetadata.file_id ||
      existingMetadata.metadata?.fileId ||
      ""
  );

  return currentFileId && previousFileId && currentFileId !== previousFileId;
}

export async function deactivateOldChunks() {
  return {
    supported: false,
    strategy: "vector_store_replace_by_source",
    message:
      "Current architecture uses addDocumentToVectorStore(), which removes and replaces chunks per normalized source."
  };
}

export async function upsertIndexedChunks(text = "", metadata = {}, { skipDelete = false, jobId = null } = {}) {
  const chunks = buildIndexChunks(text, metadata);

  const result = await addDocumentToVectorStore(
    text,
    metadata.normalizedSource,
    {
      ...metadata,
      indexedChunks: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        chunkHash: chunk.chunkHash,
        excerpt: chunk.excerpt
      })),
      chunkCount: chunks.length,
      chunk_count: chunks.length,
      compactIndexedMetadata: true
    },
    undefined,
    { skipDelete, jobId }
  );

  return {
    ...result,
    chunkCount: chunks.length,
    chunk_count: chunks.length,
    chunks: chunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      chunkHash: chunk.chunkHash,
      textLength: chunk.text.length
    }))
  };
}

export async function runDriveReindex() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");
  }

  const jobId = generateJobId();

  // Compute DB identity fields once — used in logs and identity assertions.
  const _supabaseUrl = process.env.SUPABASE_URL || "";
  const _supabaseHost = _supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const _supabaseProjectRef = _supabaseHost.split(".")[0] || null;
  const _vectorTable = process.env.VECTOR_TABLE || "tina_vector_store";

  // Log DB + instance identity before any DB operation so mismatches are visible.
  console.info("[DB IDENTITY]", {
    jobId,
    mode: "full_drive_reindex",
    supabaseUrlHost: _supabaseHost || null,
    supabaseProjectRef: _supabaseProjectRef,
    VECTOR_TABLE: _vectorTable,
    LOCK_TABLE,
    INSTANCE_ID,
    instanceId: INSTANCE_ID,
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || null,
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT || null,
    RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID || null,
    NODE_ENV: process.env.NODE_ENV || null,
    pid: process.pid,
  });

  // Acquire DB lock — fail closed: if lock cannot be acquired for ANY reason
  // (lock_held OR lock_error), abort immediately. No unlocked reindex allowed.
  const lockResult = await acquireReindexLock(jobId, "full_drive_reindex");
  if (!lockResult.acquired) {
    const reason = lockResult.reason;
    console.error("[REINDEX DRIVE] Cannot acquire lock — aborting (fail-closed)", {
      jobId,
      reason,
      existingJobId: lockResult.existingJobId || null,
      error: lockResult.error || null,
    });
    return {
      skipped: true,
      reason,
      jobId,
      existingJobId: lockResult.existingJobId || null,
      error: lockResult.error || null,
    };
  }

  // Heartbeat: renew lock TTL every 5 minutes while reindex runs.
  // Prevents the 30-minute expires_at from lapsing on large Drive libraries.
  const HEARTBEAT_MS = 5 * 60 * 1000;
  let _heartbeatTimer = setInterval(async () => {
    try { await heartbeatReindexLock(jobId); }
    catch (hbErr) { console.error("[REINDEX HEARTBEAT EXCEPTION]", { jobId, error: hbErr?.message }); }
  }, HEARTBEAT_MS);

  try {
  await clearVectorStore();

  const files = await listDriveFiles(folderId);
  const indexed = [];
  const failed = [];
  const skipped = [];

  for (const file of files || []) {
    try {
      const { file: readableFile, text } = await readFileForIndexing(file);
      const cleanText = truncateText(normalizeText(text));

      const metadata = normalizeIndexedMetadata(readableFile, cleanText);
      const normalizedSource = metadata.normalizedSource;

      if (!cleanText) {
        failed.push(
          buildFailedRecord(readableFile, {
            fileName: metadata.fileName,
            documentTitle: metadata.documentTitle,
            normalizedSource,
            folderName: metadata.folderName,
            folderPath: metadata.folderPath,
            path: metadata.path,
            mimeType: metadata.mimeType,
            authorityType: metadata.authorityType,
            authorityLevel: metadata.authorityLevel,
            authorityLabel: metadata.authorityLabel,
            normalizedReference: metadata.normalizedReference,
            possibleTaxDomain: metadata.possibleTaxDomain,
            possibleSubIssues: metadata.possibleSubIssues,
            reason: "No readable text"
          })
        );
        continue;
      }

      const indexResult = await upsertIndexedChunks(cleanText, metadata, { jobId });

      indexed.push({
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        documentTitle: metadata.documentTitle,
        normalizedSource,
        normalizedReference: metadata.normalizedReference,
        folderName: metadata.folderName,
        folderPath: metadata.folderPath,
        sourceLibrary: metadata.sourceLibrary,
        mimeType: metadata.mimeType,
        authorityType: metadata.authorityType,
        authorityLevel: metadata.authorityLevel,
        authorityLabel: metadata.authorityLabel,
        controllingPrecedence: metadata.controllingPrecedence,
        possibleTaxDomain: metadata.possibleTaxDomain,
        possibleSubIssues: metadata.possibleSubIssues,
        sourceHash: metadata.sourceHash,
        textLength: cleanText.length,
        chunkCount: indexResult?.chunkCount ?? indexResult?.chunksAdded ?? 0,
        chunksAdded: indexResult?.chunksAdded ?? 0,
        status: "Indexed"
      });
    } catch (error) {
      console.error(
        `Reindex failed for file: ${file?.name || file?.fileName || "unknown"} — ${error?.message || "Unknown error"}`
      );

      failed.push(
        buildFailedRecord(file, {
          reason: error?.message || "File indexing failed"
        })
      );
    }
  }

  const stats = await getVectorStoreStats();

  return {
    totalFilesChecked: Array.isArray(files) ? files.length : 0,
    filesIndexed: indexed.length,
    filesFailed: failed.length,
    filesSkipped: skipped.length,
    vectorStore: stats,
    indexed,
    failed,
    skipped,
    reindexServiceVersion: ENGINE_VERSION,
    indexedAt: new Date().toISOString(),
    jobId
  };
  } catch (outerError) {
    console.error("[REINDEX FAILED]", {
      jobId,
      mode: "full_drive_reindex",
      error: outerError?.message,
      stack: outerError?.stack?.split("\n").slice(0, 4).join(" | "),
    });
    throw outerError;
  } finally {
    clearInterval(_heartbeatTimer);
    await releaseReindexLock(jobId);
  }
}

// ── Targeted reindex ──────────────────────────────────────────────────────────

// Returns true for NIRC and priority VAT authority files only.
// Filename-only match — broad folder path matching is intentionally excluded
// to prevent pulling in unrelated files (e.g. Civil Code) that share a folder.
// ── Targeted reindex concurrency lock ──────────────────────────────────────────
// Prevents duplicate concurrent background jobs from overlapping HTTP calls.
// Resets in the finally block of runTargetedReindex regardless of outcome.
let _targetedReindexRunning = false;
export function isTargetedReindexRunning() { return _targetedReindexRunning; }

// ILIKE patterns covering all known historical source-name variants for the NIRC.
// Underscores vs hyphens, bare vs parenthesised "(bir)", folder prefix variations.
// Applied in repair reindex only — never during ordinary incremental indexing.
// Used only as FALLBACK if the exact-match delete does not clear all rows.
const NIRC_REPAIR_PATTERNS = [
  "%nirc-1997-ra-10963%",
  "%nirc%10963%",
  "%tax%code%nirc%",
];

// Canonical source key as it exists in the production DB.
// normalizeIndexedMetadata may produce a different string depending on Drive file path
// formatting (underscores vs hyphens). Using this constant directly for the exact-match
// delete and for reinsertion guarantees the correct key is used regardless of metadata.
const NIRC_CANONICAL_SOURCE = "01-tax-code/nirc-1997-ra-10963-(bir).pdf";

function isNircOrVatFile(file) {
  const name = (file.name || file.fileName || "").toLowerCase();
  return (
    name.includes("nirc") ||
    name.includes("rr_16-2005") ||
    name.includes("16-2005") ||
    name.includes("13-2018") ||
    name.includes("rmc_67") ||
    name.includes("67-2021") ||
    name.includes("rmc_99") ||
    name.includes("99-2021")
  );
}

// Reindexes only files matched by isTargetFile (defaults to NIRC + VAT files).
// Does NOT call clearVectorStore. Each source's existing chunks are removed
// per-source via exact-match delete inside addDocumentToVectorStore. For NIRC
// files an additional broad ILIKE delete purges historical source-name variants
// (underscores vs hyphens, folder prefix casing) before reinsertion.
// A concurrency lock prevents duplicate overlapping runs.
export async function runTargetedReindex(isTargetFile = isNircOrVatFile) {
  if (_targetedReindexRunning) {
    console.warn("[REINDEX TARGETED] Already running — rejecting duplicate invocation");
    return { skipped: true, reason: "already_running" };
  }
  _targetedReindexRunning = true;

  const jobId = generateJobId();

  // Compute DB identity fields once — used in logs and identity assertions.
  const _supabaseUrl = process.env.SUPABASE_URL || "";
  const _supabaseHost = _supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const _supabaseProjectRef = _supabaseHost.split(".")[0] || null;
  const _vectorTable = process.env.VECTOR_TABLE || "tina_vector_store";

  // Log DB + instance identity before any DB operation.
  console.info("[DB IDENTITY]", {
    jobId,
    mode: "targeted_reindex",
    supabaseUrlHost: _supabaseHost || null,
    supabaseProjectRef: _supabaseProjectRef,
    VECTOR_TABLE: _vectorTable,
    LOCK_TABLE,
    INSTANCE_ID,
    instanceId: INSTANCE_ID,
    RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME || null,
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT || null,
    RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID || null,
    NODE_ENV: process.env.NODE_ENV || null,
    pid: process.pid,
  });

  // Acquire DB lock — fail closed: if lock cannot be acquired for ANY reason
  // (lock_held OR lock_error), abort immediately. No unlocked reindex allowed.
  const lockResult = await acquireReindexLock(jobId, "targeted_reindex");
  if (!lockResult.acquired) {
    const reason = lockResult.reason;
    console.error("[REINDEX TARGETED] Cannot acquire lock — aborting (fail-closed)", {
      jobId,
      reason,
      existingJobId: lockResult.existingJobId || null,
      error: lockResult.error || null,
    });
    _targetedReindexRunning = false;
    return {
      skipped: true,
      reason,
      jobId,
      existingJobId: lockResult.existingJobId || null,
      error: lockResult.error || null,
    };
  }

  // Heartbeat: renew lock TTL every 5 minutes while reindex runs.
  const HEARTBEAT_MS = 5 * 60 * 1000;
  let _heartbeatTimer = setInterval(async () => {
    try { await heartbeatReindexLock(jobId); }
    catch (hbErr) { console.error("[REINDEX HEARTBEAT EXCEPTION]", { jobId, error: hbErr?.message }); }
  }, HEARTBEAT_MS);

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");

    const files = await listDriveFiles(folderId);
    const targetFiles = (files || []).filter(isTargetFile);

    console.info("[REINDEX START]", {
      jobId,
      targeted: true,
      totalFilesInDrive: files.length,
      matchedFiles: targetFiles.length,
      fileNames: targetFiles.map(f => f.name || f.fileName || "?")
    });

    const indexed = [];
    const failed = [];
    const skipped = [];

    for (const file of targetFiles) {
      const fileName = file.name || file.fileName || "unknown";
      try {
        const { file: readableFile, text } = await readFileForIndexing(file);
        const cleanText = truncateText(normalizeText(text));

        if (!cleanText) {
          skipped.push({ fileName, reason: "No readable text" });
          continue;
        }

        const metadata = normalizeIndexedMetadata(readableFile, cleanText);
        const normalizedSource = metadata.normalizedSource;

        // ── NIRC repair delete ─────────────────────────────────────────────────
        // Uses NIRC_CANONICAL_SOURCE for all counts and deletes — not the
        // metadata-derived normalizedSource which may differ depending on Drive
        // file path formatting. Strategy: exact-match delete first (fast, indexed,
        // no timeout risk); broad ILIKE patterns only as fallback if rows survive.
        const isNircFile =
          /nirc/.test(normalizedSource) ||
          /nirc.*10963/.test((metadata.fileName || "").toLowerCase());

        if (isNircFile) {
          const repairSource = NIRC_CANONICAL_SOURCE;
          console.info("[NIRC REPAIR CANONICAL SOURCE]", {
            jobId,
            metadataNormalizedSource: normalizedSource,
            canonicalSource: repairSource,
          });

          // 1. Pre-delete count against canonical source
          const preDeleteCount = await countSourceRows(repairSource);
          console.info("[NIRC REPAIR PREDELETE COUNT]", {
            jobId,
            source: repairSource,
            rows: preDeleteCount,
          });

          // 2. Exact-match delete on canonical source — eq() scan is indexed and fast
          const exactDeleteResult = await removeSourceFromVectorStore(repairSource, undefined, jobId);
          console.info("[NIRC EXACT DELETE]", {
            jobId,
            source: repairSource,
            removedChunks: exactDeleteResult.removedChunks,
          });

          // 3. Post-delete count
          const postDeleteCount = await countSourceRows(repairSource);
          console.info("[NIRC REPAIR POSTDELETE COUNT]", {
            jobId,
            source: repairSource,
            rows: postDeleteCount,
          });

          if (postDeleteCount === 0) {
            // Exact delete cleared all rows — skip broad ILIKE to avoid 57014 timeout
            console.info("[NIRC REPAIR PATTERN DELETE SKIPPED]", {
              jobId,
              source: repairSource,
              reason: "exact delete cleared all rows — ILIKE patterns not needed",
            });
          } else {
            // Fallback: broad ILIKE patterns for any surviving historical source variants
            for (const pattern of NIRC_REPAIR_PATTERNS) {
              console.info("[NIRC PATTERN DELETE]", { jobId, pattern, source: repairSource });
              await removeSourceByPatternFromVectorStore(pattern);
            }
            const finalCount = await countSourceRows(repairSource);
            if (finalCount > 0) {
              console.error("[NIRC DELETE FAILED — ABORT]", {
                jobId,
                source: repairSource,
                preDeleteCount,
                postDeleteCount,
                finalCount,
                patterns: NIRC_REPAIR_PATTERNS,
                reason: "rows remain after exact + pattern delete — reinsertion aborted",
              });
              failed.push({
                fileName,
                reason: `NIRC delete failed — ${finalCount} rows remain after all deletes`,
              });
              continue;
            }
          }

          // Force canonical source so new rows are inserted with the known DB key,
          // regardless of what normalizeIndexedMetadata produced.
          metadata.normalizedSource = repairSource;
        }

        console.info("[REINDEX DELETE AND REINSERT]", {
          jobId,
          source: normalizedSource,
          fileName,
          reason: "metadata repair reindex — old rows deleted before reinsertion",
        });

        const indexResult = await upsertIndexedChunks(cleanText, metadata, { jobId });
        const chunksAdded = indexResult?.chunksAdded ?? indexResult?.chunkCount ?? 0;

        console.info("[REINDEX INSERT]", {
          jobId,
          source: normalizedSource,
          chunksAdded,
          normalizedReference: metadata.normalizedReference
        });

        // NIRC-specific: verify post-insert row count matches chunks added.
        // Detects silent insert failures, cross-instance overlap, or table mismatch.
        // isNircFile is already declared above (used for repair delete logic).
        if (isNircFile) {
          const postInsertCount = await countSourceRows(NIRC_CANONICAL_SOURCE);
          console.info("[NIRC POSTINSERT EXACT COUNT]", {
            jobId,
            source: NIRC_CANONICAL_SOURCE,
            postInsertCount,
            chunksAdded,
          });
          if (postInsertCount !== chunksAdded) {
            console.error("[NIRC POSTINSERT COUNT MISMATCH]", {
              jobId,
              source: NIRC_CANONICAL_SOURCE,
              postInsertCount,
              chunksAdded,
              note: "mismatch may indicate cross-instance overlap, table mismatch, or silent insert failure",
            });
          }
        }

        indexed.push({
          jobId,
          fileName: metadata.fileName,
          normalizedSource,
          normalizedReference: metadata.normalizedReference,
          chunksAdded
        });
      } catch (error) {
        console.error(`[REINDEX] Failed: ${fileName} — ${error?.message}`, { jobId });
        failed.push({ fileName, reason: error?.message || "Failed" });
      }
    }

    console.info("[REINDEX COMPLETE]", {
      jobId,
      indexed: indexed.length,
      failed: failed.length,
      skipped: skipped.length,
      sources: indexed.map(r => r.normalizedSource)
    });

    return {
      targeted: true,
      jobId,
      totalFilesInDrive: (files || []).length,
      filesMatched: targetFiles.length,
      filesIndexed: indexed.length,
      filesFailed: failed.length,
      filesSkipped: skipped.length,
      indexed,
      failed,
      skipped,
      indexedAt: new Date().toISOString()
    };
  } catch (outerError) {
    console.error("[REINDEX FAILED]", {
      jobId,
      mode: "targeted_reindex",
      error: outerError?.message,
      stack: outerError?.stack?.split("\n").slice(0, 4).join(" | "),
    });
    throw outerError;
  } finally {
    clearInterval(_heartbeatTimer);
    _targetedReindexRunning = false;
    await releaseReindexLock(jobId);
  }
}

export function createBackgroundReindexController() {
  let isRunning = false;

  let lastStatus = {
    running: false,
    startedAt: null,
    finishedAt: null,
    success: null,
    message: "No indexing job has started yet.",
    error: null,
    result: null
  };

  function getStatus() {
    return lastStatus;
  }

  function isActive() {
    return isRunning;
  }

  function start() {
    if (isRunning) {
      return {
        started: false,
        message: "Indexing is already running."
      };
    }

    isRunning = true;
    const startedAt = new Date().toISOString();

    lastStatus = {
      running: true,
      startedAt,
      finishedAt: null,
      success: null,
      message: "Indexing is running in background.",
      error: null,
      result: null
    };

    runDriveReindex()
      .then((result) => {
        lastStatus = {
          running: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          success: true,
          message: "Indexing completed successfully.",
          error: null,
          result
        };
      })
      .catch((error) => {
        console.error("Background reindex error:", error?.message || error);

        lastStatus = {
          running: false,
          startedAt,
          finishedAt: new Date().toISOString(),
          success: false,
          message: "Indexing failed.",
          error: error?.message || "Unknown indexing error",
          result: null
        };
      })
      .finally(() => {
        isRunning = false;
      });

    return {
      started: true,
      message: "Indexing started in background."
    };
  }

  return {
    start,
    getStatus,
    isActive
  };
}

export function reindexServiceHealthCheck() {
  return {
    ok: true,
    module: "reindex-service",
    engine: "TINA_REINDEX_SERVICE",
    version: ENGINE_VERSION,

    driveReaderCompatible: true,
    vectorStoreCompatible: true,
    authorityEngineCompatible: true,
    backgroundControllerCompatible: true,

    supportsFolderTraversal: true,
    supportsFileReading: true,
    supportsMetadataNormalization: true,
    supportsAuthorityTypeInference: true,
    supportsNormalizedReferenceExtraction: true,
    supportsChunkHashing: true,
    supportsSourceHashing: true,
    supportsSupabasePersistenceHandoff: true,
    supportsStaleChunkCleanupBySourceReplacement: true,
    supportsDuplicatePreventionMetadata: true,

    googleDriveFolders: TAX_LIBRARY_FOLDERS,
    indexedAuthorityFolders: INDEXED_AUTHORITY_FOLDERS,
    reviewFolders: REVIEW_FOLDERS,

    noOpenAIAnswerCalls: true,
    noAnswerGeneration: true,
    noRetrievalPolicyDuplication: true,
    noFullDocumentLogging: true,

    maxIndexTextChars: MAX_INDEX_TEXT_CHARS,
    chunkSize: INDEX_CHUNK_SIZE,
    chunkOverlap: INDEX_CHUNK_OVERLAP
  };
}

export default {
  runDriveReindex,
  runTargetedReindex,
  isTargetedReindexRunning,
  createBackgroundReindexController,
  reindexServiceHealthCheck,

  normalizeIndexedMetadata,
  inferAuthorityType,
  inferNormalizedReferenceSafe,
  inferPossibleTaxDomains,
  inferPossibleSubIssues,
  chunkTextForIndexing,
  hashContent,
  shouldReindexFile,
  buildIndexedChunkPayload,
  deactivateOldChunks,
  upsertIndexedChunks
};
