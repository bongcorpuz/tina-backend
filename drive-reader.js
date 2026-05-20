// FILE: drive-reader.js
"use strict";

/**
 * TINA Enterprise Google Drive Reader
 * Version: 4.0.0
 *
 * Role:
 * - Google Drive file listing
 * - file reading / export
 * - safe text extraction
 * - source metadata normalization
 * - folder path preservation
 * - authority-type inference
 * - normalized reference extraction
 * - indexing-ready object construction
 *
 * Boundary:
 * - No OpenAI calls
 * - No answer generation
 * - No vector search
 * - No retrieval policy
 * - No reranking
 * - No legal reasoning
 */

import "dotenv/config";
import { google } from "googleapis";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const ENGINE_VERSION = "4.0.0";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const FOLDER_MIME = "application/vnd.google-apps.folder";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDE_MIME = "application/vnd.google-apps.presentation";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const MAX_TEXT_CHARS = Number(process.env.DRIVE_READER_MAX_TEXT_CHARS || 900000);
const MAX_EXCERPT_CHARS = Number(process.env.DRIVE_READER_MAX_EXCERPT_CHARS || 1800);

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

/* ================= GOOGLE DRIVE AUTH ================= */

if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_JSON is missing in Render environment variables."
  );
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} catch {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON.");
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: SCOPES
});

const drive = google.drive({ version: "v3", auth });

/* ================= BASIC HELPERS ================= */

function safeString(value = "") {
  return String(value || "").trim();
}

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
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

function truncateText(value = "", maxChars = MAX_TEXT_CHARS) {
  const text = normalizeText(value);
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
}

function makeExcerpt(value = "", maxChars = MAX_EXCERPT_CHARS) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()} ...[trimmed for context budget]`;
}

function isGoogleDocMime(mimeType = "") {
  return mimeType === GOOGLE_DOC_MIME;
}

function isGoogleSheetMime(mimeType = "") {
  return mimeType === GOOGLE_SHEET_MIME;
}

function isGoogleSlideMime(mimeType = "") {
  return mimeType === GOOGLE_SLIDE_MIME;
}

function isFolder(file = {}) {
  return file.mimeType === FOLDER_MIME;
}

export function buildDriveViewUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (isGoogleDocMime(mimeType)) {
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }

  if (isGoogleSheetMime(mimeType)) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  }

  if (isGoogleSlideMime(mimeType)) {
    return `https://docs.google.com/presentation/d/${fileId}/edit`;
  }

  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildDriveDownloadUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (isGoogleDocMime(mimeType)) {
    return `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  }

  if (isGoogleSheetMime(mimeType)) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  }

  if (isGoogleSlideMime(mimeType)) {
    return `https://docs.google.com/presentation/d/${fileId}/export/txt`;
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function getExtension(name = "") {
  const match = safeString(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function normalizeForReference(value = "") {
  return safeString(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brevenue regulation[s]?\b/g, "rr")
    .replace(/\brevenue memorandum circular[s]?\b/g, "rmc")
    .replace(/\brevenue memorandum order[s]?\b/g, "rmo")
    .replace(/\brevenue audit memorandum order[s]?\b/g, "ramo")
    .replace(/\brepublic act\b/g, "ra")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\bno\.?\b/g, "")
    .replace(/[_–—]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[\\/]+/g, "/")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_/-]+|[_/-]+$/g, "");
}

function buildNormalizedSource(name = "", path = "") {
  const basis = safeString(path || name);

  return basis
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brevenue regulation[s]?\b/g, "rr")
    .replace(/\brevenue memorandum circular[s]?\b/g, "rmc")
    .replace(/\brevenue memorandum order[s]?\b/g, "rmo")
    .replace(/\brevenue audit memorandum order[s]?\b/g, "ramo")
    .replace(/\brepublic act\b/g, "ra")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/\s+/g, "_")
    .replace(/[\\/]+/g, "/")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_/-]+|[_/-]+$/g, "");
}

function getFolderNameFromPath(path = "") {
  const normalized = safeString(path).toUpperCase();

  for (const folder of TAX_LIBRARY_FOLDERS) {
    if (normalized.includes(folder)) return folder;
  }

  return null;
}

export function isTaxLibraryFolder(pathOrName = "") {
  return Boolean(getFolderNameFromPath(pathOrName));
}

export function isReviewFolder(pathOrName = "") {
  const folder = getFolderNameFromPath(pathOrName);
  return REVIEW_FOLDERS.includes(folder);
}

function getSourceLibrary(folderName = "") {
  if (INDEXED_AUTHORITY_FOLDERS.includes(folderName)) return "TAX_AUTHORITY_LIBRARY";
  if (REVIEW_FOLDERS.includes(folderName)) return "TAX_REVIEW_LIBRARY";
  return "GENERAL_DRIVE_LIBRARY";
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

export function inferAuthorityTypeFromPath(path = "", fileName = "", textPreview = "") {
  const blob = lower(`${path} ${fileName} ${textPreview}`);

  const folderName = getFolderNameFromPath(`${path} ${fileName}`);
  if (folderName && FOLDER_AUTHORITY_MAP[folderName]) {
    const folderType = FOLDER_AUTHORITY_MAP[folderName];

    if (folderType === "JURISPRUDENCE") {
      if (/supreme court en banc|en banc|g\.?\s*r\.?\s*no\.?/i.test(blob)) {
        return /en banc/i.test(blob) ? "SUPREME_COURT_EN_BANC" : "SUPREME_COURT";
      }

      if (/cta en banc|cta eb/i.test(blob)) return "CTA_EN_BANC";
      if (/\bcta\b|court of tax appeals/i.test(blob)) return "CTA_DIVISION";

      return "JURISPRUDENCE";
    }

    return folderType;
  }

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

  if (/cpa notes|review materials|reviewer|handout|lecture/i.test(blob)) return "SECONDARY";

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

export function inferNormalizedReference({
  fileName = "",
  folderPath = "",
  text = ""
} = {}) {
  const sample = `${fileName}\n${folderPath}\n${normalizeText(text).slice(0, 3000)}`;

  const nircSection = sample.match(
    /\b(?:NIRC|National\s+Internal\s+Revenue\s+Code)?\s*(?:Sec\.?|Section)\s*([0-9]{1,3}[A-Z]?(?:\([A-Z0-9]+\))?)\b/i
  );
  if (nircSection) return buildSectionReference("NIRC", nircSection[1]);

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

  const ctaEb = sample.match(/\bCTA\s*(?:EB|En\s+Banc)\s*(?:No\.?)?\s*([A-Z0-9.-]+)\b/i);
  if (ctaEb) return `CTA EB No. ${ctaEb[1]}`;

  const ctaCase = sample.match(/\bCTA\s*(?:Case)?\s*(?:No\.?)?\s*([A-Z0-9.-]+)\b/i);
  if (ctaCase) return `CTA Case No. ${ctaCase[1]}`;

  const ra = sample.match(/\b(?:RA|R\.A\.|Republic\s+Act)\s*(?:No\.?)?\s*0*(\d{4,6})\b/i);
  if (ra) return `RA ${ra[1]}`;

  const normalized = normalizeForReference(fileName || folderPath);
  return normalized || "";
}

function detectPossibleTaxDomains(textOrMetadata = "") {
  const blob = lower(
    typeof textOrMetadata === "string"
      ? textOrMetadata
      : [
          textOrMetadata.fileName,
          textOrMetadata.folderPath,
          textOrMetadata.folderName,
          textOrMetadata.normalizedReference,
          textOrMetadata.text
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

function detectPossibleSubIssues(textOrMetadata = "") {
  const blob = lower(
    typeof textOrMetadata === "string"
      ? textOrMetadata
      : [
          textOrMetadata.fileName,
          textOrMetadata.folderPath,
          textOrMetadata.folderName,
          textOrMetadata.normalizedReference,
          textOrMetadata.text
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

function isTextLikeFile(file, mimeType = "") {
  const name = safeString(file.name).toLowerCase();

  return (
    mimeType.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    name.endsWith(".log")
  );
}

function isSupportedFile(file = {}) {
  const mimeType = safeString(file.mimeType);
  const name = safeString(file.name).toLowerCase();

  return (
    isGoogleDocMime(mimeType) ||
    isGoogleSheetMime(mimeType) ||
    isGoogleSlideMime(mimeType) ||
    mimeType === "application/pdf" ||
    mimeType === DOCX_MIME ||
    isTextLikeFile(file, mimeType) ||
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    name.endsWith(".log")
  );
}

function classifyExtractionType(file = {}) {
  const mimeType = safeString(file.mimeType);
  const fileName = safeString(file.name).toLowerCase();

  if (isGoogleDocMime(mimeType)) return "google_doc_export_txt";
  if (isGoogleSheetMime(mimeType)) return "google_sheet_export_csv";
  if (isGoogleSlideMime(mimeType)) return "google_slide_export_txt";
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "pdf_text";
  if (mimeType === DOCX_MIME || fileName.endsWith(".docx")) return "docx_text";
  if (isTextLikeFile(file, mimeType)) return "plain_text";
  if (mimeType === XLSX_MIME || fileName.endsWith(".xlsx")) return "unsupported_xlsx";
  if (mimeType === PPTX_MIME || fileName.endsWith(".pptx")) return "unsupported_pptx";

  return "unsupported";
}

export function normalizeDriveFileMetadata(file = {}, parentPath = "") {
  const fileName = safeString(file.name);
  const folderPath = parentPath ? `${parentPath}/${fileName}` : file.path || fileName;
  const folderName = getFolderNameFromPath(folderPath);
  const driveViewUrl = file.webViewLink || file.driveViewUrl || buildDriveViewUrl(file.id, file.mimeType);
  const driveDownloadUrl =
    file.webContentLink || file.driveDownloadUrl || buildDriveDownloadUrl(file.id, file.mimeType);

  const authorityType = inferAuthorityTypeFromPath(folderPath, fileName, "");
  const normalizedReference = inferNormalizedReference({
    fileName,
    folderPath,
    text: ""
  });

  const possibleTaxDomain = detectPossibleTaxDomains({
    fileName,
    folderPath,
    folderName,
    normalizedReference
  });

  const possibleSubIssues = detectPossibleSubIssues({
    fileName,
    folderPath,
    folderName,
    normalizedReference
  });

  const parentFolderIds = unique([
    ...(Array.isArray(file.parents) ? file.parents : []),
    file.folderId || null
  ]);

  return {
    ...file,

    fileId: file.id || file.fileId || null,
    file_id: file.id || file.fileId || null,
    id: file.id || file.fileId || null,

    fileName,
    file_name: fileName,
    name: fileName,

    documentTitle: file.documentTitle || fileName,
    document_title: file.documentTitle || fileName,

    mimeType: safeString(file.mimeType),
    mime_type: safeString(file.mimeType),

    folderId: file.folderId || parentFolderIds[0] || null,
    folder_id: file.folderId || parentFolderIds[0] || null,
    parentFolderIds,
    parent_folder_ids: parentFolderIds,

    folderName,
    folder_name: folderName,
    folderPath,
    folder_path: folderPath,
    path: folderPath,

    sourceLibrary: getSourceLibrary(folderName),
    source_library: getSourceLibrary(folderName),
    isTaxLibraryFile: Boolean(folderName),
    is_tax_library_file: Boolean(folderName),
    isReviewMaterial: isReviewFolder(folderPath),
    is_review_material: isReviewFolder(folderPath),

    originalSource: fileName,
    original_source: fileName,
    normalizedSource: buildNormalizedSource(fileName, folderPath),
    normalized_source: buildNormalizedSource(fileName, folderPath),

    extension: getExtension(fileName),
    size: file.size || null,

    createdTime: file.createdTime || null,
    created_time: file.createdTime || null,
    modifiedTime: file.modifiedTime || null,
    modified_time: file.modifiedTime || null,

    webViewLink: file.webViewLink || driveViewUrl,
    web_view_link: file.webViewLink || driveViewUrl,
    driveViewUrl,
    drive_view_url: driveViewUrl,
    driveDownloadUrl,
    drive_download_url: driveDownloadUrl,

    authorityType,
    authority_type: authorityType,
    authorityLevel: authorityLevelOf(authorityType),
    authority_level: authorityLevelOf(authorityType),

    normalizedReference,
    normalized_reference: normalizedReference,

    possibleTaxDomain,
    possible_tax_domain: possibleTaxDomain,
    possibleTaxDomains: possibleTaxDomain,
    possible_tax_domains: possibleTaxDomain,
    possibleSubIssues,
    possible_sub_issues: possibleSubIssues,

    supportedForTextExtraction:
      typeof file.supportedForTextExtraction === "boolean"
        ? file.supportedForTextExtraction
        : isSupportedFile(file),
    supported_for_text_extraction:
      typeof file.supportedForTextExtraction === "boolean"
        ? file.supportedForTextExtraction
        : isSupportedFile(file),

    extractionType: file.extractionType || classifyExtractionType(file),
    extraction_type: file.extractionType || classifyExtractionType(file),

    tinaDriveReaderVersion: ENGINE_VERSION,
    tina_drive_reader_version: ENGINE_VERSION
  };
}

function enrichDriveFile(file, parentPath = "") {
  return normalizeDriveFileMetadata(file, parentPath);
}

async function getAllFilesRecursive(folderId, parentPath = "") {
  let results = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size,parents,modifiedTime,createdTime,webViewLink,webContentLink)",
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const files = res.data.files || [];

    for (const file of files) {
      const enriched = enrichDriveFile(file, parentPath);

      if (isFolder(file)) {
        const subFiles = await getAllFilesRecursive(file.id, enriched.path);
        results = results.concat(subFiles);
      } else {
        results.push(enriched);
      }
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return results;
}

async function downloadFileBuffer(fileId) {
  const res = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true
    },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data);
}

async function exportGoogleFile(fileId, mimeType) {
  const res = await drive.files.export(
    { fileId, mimeType },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data);
}

function buildExtractionMetadata(file = {}, textPreview = "") {
  const normalized = normalizeDriveFileMetadata(file, file.path ? "" : "");
  const authorityType = inferAuthorityTypeFromPath(
    normalized.folderPath,
    normalized.fileName,
    textPreview
  );

  const normalizedReference = inferNormalizedReference({
    fileName: normalized.fileName,
    folderPath: normalized.folderPath,
    text: textPreview
  });

  const possibleTaxDomain = detectPossibleTaxDomains({
    fileName: normalized.fileName,
    folderPath: normalized.folderPath,
    folderName: normalized.folderName,
    normalizedReference,
    text: textPreview
  });

  const possibleSubIssues = detectPossibleSubIssues({
    fileName: normalized.fileName,
    folderPath: normalized.folderPath,
    folderName: normalized.folderName,
    normalizedReference,
    text: textPreview
  });

  return {
    ...normalized,

    authorityType,
    authority_type: authorityType,
    authorityLevel: authorityLevelOf(authorityType),
    authority_level: authorityLevelOf(authorityType),

    normalizedReference,
    normalized_reference: normalizedReference,

    possibleTaxDomain,
    possible_tax_domain: possibleTaxDomain,
    possibleTaxDomains: possibleTaxDomain,
    possible_tax_domains: possibleTaxDomain,

    possibleSubIssues,
    possible_sub_issues: possibleSubIssues,

    metadata: {
      fileId: normalized.fileId,
      fileName: normalized.fileName,
      documentTitle: normalized.documentTitle,
      mimeType: normalized.mimeType,
      folderId: normalized.folderId,
      folderName: normalized.folderName,
      folderPath: normalized.folderPath,
      parentFolderIds: normalized.parentFolderIds,
      path: normalized.folderPath,
      driveViewUrl: normalized.driveViewUrl,
      webViewLink: normalized.webViewLink,
      authorityType,
      authorityLevel: authorityLevelOf(authorityType),
      normalizedReference,
      possibleTaxDomain,
      possibleTaxDomains: possibleTaxDomain,
      possibleSubIssues,
      sourceLibrary: normalized.sourceLibrary,
      isTaxLibraryFile: normalized.isTaxLibraryFile,
      isReviewMaterial: normalized.isReviewMaterial,
      originalSource: normalized.originalSource,
      originalFileName: normalized.fileName,
      normalizedSource: normalized.normalizedSource,
      createdTime: normalized.createdTime,
      modifiedTime: normalized.modifiedTime,
      size: normalized.size,
      extractionType: normalized.extractionType,
      tinaDriveReaderVersion: ENGINE_VERSION
    }
  };
}

/* ================= PUBLIC FUNCTIONS ================= */

export async function listDriveFiles(folderId) {
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing.");

  const files = await getAllFilesRecursive(folderId);

  return files.sort((a, b) =>
    safeString(a.path).localeCompare(safeString(b.path), undefined, {
      sensitivity: "base"
    })
  );
}

export async function extractTextFromFile(file) {
  if (!file?.id && !file?.fileId) {
    throw new Error("Invalid Google Drive file object.");
  }

  const fileId = file.id || file.fileId;
  const mimeType = safeString(file.mimeType);
  const fileName = safeString(file.name || file.fileName).toLowerCase();

  let extractedText = "";

  if (isGoogleDocMime(mimeType)) {
    const buffer = await exportGoogleFile(fileId, "text/plain");
    extractedText = buffer.toString("utf8");
  } else if (isGoogleSheetMime(mimeType)) {
    const buffer = await exportGoogleFile(fileId, "text/csv");
    extractedText = buffer.toString("utf8");
  } else if (isGoogleSlideMime(mimeType)) {
    const buffer = await exportGoogleFile(fileId, "text/plain");
    extractedText = buffer.toString("utf8");
  } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const buffer = await downloadFileBuffer(fileId);
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text || "";

    if (!normalizeText(extractedText)) {
      throw new Error(
        "PDF contains no extractable text. It may be scanned and require OCR."
      );
    }
  } else if (mimeType === DOCX_MIME || fileName.endsWith(".docx")) {
    const buffer = await downloadFileBuffer(fileId);
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value || "";
  } else if (isTextLikeFile(file, mimeType)) {
    const buffer = await downloadFileBuffer(fileId);
    extractedText = buffer.toString("utf8");
  } else {
    throw new Error(
      `Unsupported file type for text extraction: ${mimeType || fileName}`
    );
  }

  return truncateText(extractedText);
}

export async function readDriveFile(file) {
  const initialMetadata = buildExtractionMetadata(file);

  try {
    const text = await extractTextFromFile(file);
    const compactText = truncateText(text);
    const metadata = buildExtractionMetadata(file, compactText.slice(0, 4000));

    return {
      ...metadata,

      text: compactText,
      content: compactText,
      excerpt: makeExcerpt(compactText),

      textLength: compactText.length,
      text_length: compactText.length,

      originalTextLength: normalizeText(text).length,
      original_text_length: normalizeText(text).length,

      readStatus: compactText ? "SUCCESS" : "EMPTY",
      read_status: compactText ? "SUCCESS" : "EMPTY",
      extractionStatus: compactText ? "success" : "empty",
      extraction_status: compactText ? "success" : "empty",

      error: null,
      extractionError: null,
      extraction_error: null,

      compactOutput: true,
      compact_output: true,

      metadata: {
        ...(metadata.metadata || {}),
        textLength: compactText.length,
        originalTextLength: normalizeText(text).length,
        readStatus: compactText ? "SUCCESS" : "EMPTY",
        extractionStatus: compactText ? "success" : "empty",
        compactOutput: true
      }
    };
  } catch (error) {
    const message =
      error?.message ||
      "Failed to extract file text";

    return {
      ...initialMetadata,

      text: "",
      content: "",
      excerpt: "",

      textLength: 0,
      text_length: 0,
      originalTextLength: 0,
      original_text_length: 0,

      readStatus: "FAILED",
      read_status: "FAILED",
      extractionStatus: "failed",
      extraction_status: "failed",

      error: message,
      extractionError: message,
      extraction_error: message,

      compactOutput: true,
      compact_output: true,

      metadata: {
        ...(initialMetadata.metadata || {}),
        textLength: 0,
        originalTextLength: 0,
        readStatus: "FAILED",
        extractionStatus: "failed",
        extractionError: message,
        compactOutput: true
      }
    };
  }
}

export async function listAndReadDriveFiles(folderId) {
  const files = await listDriveFiles(folderId);
  const output = [];

  for (const file of files) {
    const record = await readDriveFile(file);
    output.push(record);
  }

  return output;
}

export function compactDriveReadResult(record = {}, maxTextChars = MAX_TEXT_CHARS) {
  const text = truncateText(record.text || record.content || "", maxTextChars);
  const excerpt = makeExcerpt(text);

  return {
    ...record,
    text,
    content: text,
    excerpt,

    textLength: text.length,
    text_length: text.length,

    compactOutput: true,
    compact_output: true,

    metadata: {
      ...(record.metadata || {}),
      textLength: text.length,
      compactOutput: true,
      maxTextChars
    }
  };
}

export function driveReaderHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DRIVE_READER",
    version: ENGINE_VERSION,

    esmCompatible: true,
    driveReadonlyCompatible: true,
    googleDriveApiCompatible: true,
    serviceAccountCompatible: true,

    vectorStoreMetadataCompatible: true,
    reindexServiceCompatible: true,
    authorityMetadataCompatible: true,
    retrievalEngineCompatible: true,
    sourceVisibilityCompatible: true,
    contextOrchestrationCompatible: true,
    ragAnswerHandlerCompatible: true,

    supportsFileId: true,
    supportsFileName: true,
    supportsFolderPath: true,
    supportsFolderName: true,
    supportsDriveViewUrl: true,
    supportsAuthorityType: true,
    supportsNormalizedReference: true,
    supportsPossibleTaxDomain: true,
    supportsPossibleSubIssues: true,
    supportsCompactExtraction: true,

    googleDriveLibraryFolders: TAX_LIBRARY_FOLDERS,
    indexedAuthorityFolders: INDEXED_AUTHORITY_FOLDERS,
    reviewFolders: REVIEW_FOLDERS,

    noOpenAIAnswerCalls: true,
    noAnswerGeneration: true,
    noVectorSearch: true,
    noRetrievalPolicyDuplication: true,

    maxTextChars: MAX_TEXT_CHARS,
    maxExcerptChars: MAX_EXCERPT_CHARS
  };
}

export default {
  listDriveFiles,
  extractTextFromFile,
  readDriveFile,
  listAndReadDriveFiles,

  normalizeDriveFileMetadata,
  inferAuthorityTypeFromPath,
  inferNormalizedReference,
  buildDriveViewUrl,
  compactDriveReadResult,
  isReviewFolder,
  isTaxLibraryFolder,

  driveReaderHealthCheck
};
