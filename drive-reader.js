// FILE: drive-reader.js
"use strict";

/**
 * TINA Enterprise Google Drive Reader
 * Version: 3.0.0
 */

import "dotenv/config";
import { google } from "googleapis";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const ENGINE_VERSION = "3.0.0";

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

/* ================= HELPERS ================= */

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeString(value = "") {
  return String(value || "").trim();
}

function truncateText(value = "", maxChars = MAX_TEXT_CHARS) {
  const text = normalizeText(value);
  if (!maxChars || text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
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

function buildDriveViewUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (isGoogleDocMime(mimeType)) return `https://docs.google.com/document/d/${fileId}/edit`;
  if (isGoogleSheetMime(mimeType)) return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  if (isGoogleSlideMime(mimeType)) return `https://docs.google.com/presentation/d/${fileId}/edit`;

  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildDriveDownloadUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (isGoogleDocMime(mimeType)) return `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  if (isGoogleSheetMime(mimeType)) return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  if (isGoogleSlideMime(mimeType)) return `https://docs.google.com/presentation/d/${fileId}/export/txt`;

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
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
    .replace(/\s+/g, "_")
    .replace(/[\\/]+/g, "/")
    .replace(/[^a-z0-9._()/-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_/-]+|[_/-]+$/g, "");
}

function getExtension(name = "") {
  const match = safeString(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function isTextLikeFile(file, mimeType = "") {
  const name = safeString(file.name).toLowerCase();

  return (
    mimeType.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    name.endsWith(".json") ||
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

function inferAuthorityType(file = {}) {
  const blob = safeString(`${file.path || ""} ${file.name || ""}`).toLowerCase();

  if (blob.includes("00_constitution") || blob.includes("constitution")) return "CONSTITUTION";
  if (blob.includes("01_tax_code") || /\b(nirc|tax code|ra\s*\d{4,6}|republic act)\b/i.test(blob)) return "STATUTE";
  if (blob.includes("02_revenue_regulations") || /\brr\b|revenue regulation/i.test(blob)) return "RR";
  if (blob.includes("03_rmc") || /\brmc\b|revenue memorandum circular/i.test(blob)) return "RMC";
  if (blob.includes("04b_ramo") || /\bramo\b|revenue audit memorandum order/i.test(blob)) return "RAMO";
  if (blob.includes("04_rmo") || /\brmo\b|revenue memorandum order/i.test(blob)) return "RMO";
  if (blob.includes("05_bir_rulings") || /bir ruling/i.test(blob)) return "BIR_RULING";
  if (blob.includes("05b_tax_treaties") || /tax treaty/i.test(blob)) return "TREATY";
  if (blob.includes("06_court_cases") || /\bg\.?\s*r\.?\s*no\.?\b|supreme court/i.test(blob)) return "SUPREME_COURT";
  if (/cta en banc|cta eb/i.test(blob)) return "CTA_EN_BANC";
  if (/court of appeals|ca-g\.?r\.?/i.test(blob)) return "COURT_OF_APPEALS";
  if (/\bcta\b/i.test(blob)) return "CTA_DIVISION";
  if (blob.includes("07_cpa_notes") || blob.includes("08_review_materials")) return "SECONDARY";

  return "SECONDARY";
}

function authorityLevelOf(type = "SECONDARY") {
  const levels = {
    CONSTITUTION: 1,
    STATUTE: 2,
    RR: 3,
    RMC: 4,
    RMO: 5,
    RAMO: 6,
    BIR_RULING: 7,
    SUPREME_COURT: 8,
    CTA_EN_BANC: 9,
    COURT_OF_APPEALS: 10,
    CTA_DIVISION: 11,
    TREATY: 12,
    LGU: 13,
    SECONDARY: 99,
    UNKNOWN: 99
  };

  return levels[type] || 99;
}

function enrichDriveFile(file, parentPath = "") {
  const fileName = safeString(file.name);
  const currentPath = parentPath ? `${parentPath}/${fileName}` : fileName;
  const driveViewUrl = file.webViewLink || buildDriveViewUrl(file.id, file.mimeType);
  const driveDownloadUrl =
    file.webContentLink || buildDriveDownloadUrl(file.id, file.mimeType);
  const authorityType = inferAuthorityType({ ...file, path: currentPath });

  return {
    ...file,
    path: currentPath,
    originalSource: fileName,
    original_source: fileName,
    normalizedSource: buildNormalizedSource(fileName, currentPath),
    normalized_source: buildNormalizedSource(fileName, currentPath),
    extension: getExtension(fileName),
    supportedForTextExtraction: isSupportedFile(file),
    extractionType: classifyExtractionType(file),
    driveViewUrl,
    drive_view_url: driveViewUrl,
    driveDownloadUrl,
    drive_download_url: driveDownloadUrl,
    authorityType,
    authority_type: authorityType,
    authorityLevel: authorityLevelOf(authorityType),
    authority_level: authorityLevelOf(authorityType)
  };
}

async function getAllFilesRecursive(folderId, parentPath = "") {
  let results = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: [
        "nextPageToken",
        "files(",
        "id,",
        "name,",
        "mimeType,",
        "size,",
        "modifiedTime,",
        "createdTime,",
        "webViewLink,",
        "webContentLink",
        ")"
      ].join(""),
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

function buildExtractionMetadata(file = {}) {
  const authorityType = file.authorityType || file.authority_type || inferAuthorityType(file);

  return {
    fileId: file.id || null,
    file_id: file.id || null,
    fileName: safeString(file.name),
    file_name: safeString(file.name),
    originalSource: safeString(file.originalSource || file.name),
    original_source: safeString(file.originalSource || file.name),
    normalizedSource:
      file.normalizedSource || buildNormalizedSource(file.name, file.path),
    normalized_source:
      file.normalizedSource || buildNormalizedSource(file.name, file.path),
    path: safeString(file.path || file.name),
    extension: file.extension || getExtension(file.name),
    mimeType: safeString(file.mimeType),
    mime_type: safeString(file.mimeType),
    modifiedTime: file.modifiedTime || null,
    modified_time: file.modifiedTime || null,
    createdTime: file.createdTime || null,
    created_time: file.createdTime || null,
    size: file.size || null,
    driveViewUrl: file.driveViewUrl || buildDriveViewUrl(file.id, file.mimeType),
    drive_view_url: file.driveViewUrl || buildDriveViewUrl(file.id, file.mimeType),
    driveDownloadUrl:
      file.driveDownloadUrl || buildDriveDownloadUrl(file.id, file.mimeType),
    drive_download_url:
      file.driveDownloadUrl || buildDriveDownloadUrl(file.id, file.mimeType),
    authorityType,
    authority_type: authorityType,
    authorityLevel: authorityLevelOf(authorityType),
    authority_level: authorityLevelOf(authorityType),
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
  if (!file?.id) throw new Error("Invalid Google Drive file object.");

  const mimeType = safeString(file.mimeType);
  const fileName = safeString(file.name).toLowerCase();

  let extractedText = "";

  if (isGoogleDocMime(mimeType)) {
    const buffer = await exportGoogleFile(file.id, "text/plain");
    extractedText = buffer.toString("utf8");
  } else if (isGoogleSheetMime(mimeType)) {
    const buffer = await exportGoogleFile(file.id, "text/csv");
    extractedText = buffer.toString("utf8");
  } else if (isGoogleSlideMime(mimeType)) {
    const buffer = await exportGoogleFile(file.id, "text/plain");
    extractedText = buffer.toString("utf8");
  } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const buffer = await downloadFileBuffer(file.id);
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text || "";

    if (!normalizeText(extractedText)) {
      throw new Error(
        "PDF contains no extractable text. It may be scanned and require OCR."
      );
    }
  } else if (mimeType === DOCX_MIME || fileName.endsWith(".docx")) {
    const buffer = await downloadFileBuffer(file.id);
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value || "";
  } else if (isTextLikeFile(file, mimeType)) {
    const buffer = await downloadFileBuffer(file.id);
    extractedText = buffer.toString("utf8");
  } else {
    throw new Error(
      `Unsupported file type for text extraction: ${mimeType || fileName}`
    );
  }

  return truncateText(extractedText);
}

export async function readDriveFile(file) {
  const metadata = buildExtractionMetadata(file);

  try {
    const text = await extractTextFromFile(file);

    return {
      ...metadata,
      text,
      content: text,
      excerpt: text.slice(0, 1200),
      textLength: text.length,
      text_length: text.length,
      extractionStatus: text ? "success" : "empty",
      extraction_status: text ? "success" : "empty"
    };
  } catch (error) {
    return {
      ...metadata,
      text: "",
      content: "",
      excerpt: "",
      textLength: 0,
      text_length: 0,
      extractionStatus: "failed",
      extraction_status: "failed",
      extractionError: error.message || "Failed to extract file text",
      extraction_error: error.message || "Failed to extract file text"
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

export function driveReaderHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DRIVE_READER",
    version: ENGINE_VERSION,
    esmCompatible: true,
    driveReadonlyCompatible: true,
    vectorStoreMetadataCompatible: true,
    authorityMetadataCompatible: true
  };
}

export default {
  listDriveFiles,
  extractTextFromFile,
  readDriveFile,
  listAndReadDriveFiles,
  driveReaderHealthCheck
};
