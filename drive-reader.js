// FILE: drive-reader.js

import { google } from "googleapis";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

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

function buildNormalizedSource(name = "", path = "") {
  const basis = safeString(path || name);

  return basis
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
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

function enrichDriveFile(file, parentPath = "") {
  const fileName = safeString(file.name);
  const currentPath = parentPath ? `${parentPath}/${fileName}` : fileName;
  const driveViewUrl = file.webViewLink || buildDriveViewUrl(file.id, file.mimeType);
  const driveDownloadUrl =
    file.webContentLink || buildDriveDownloadUrl(file.id, file.mimeType);

  return {
    ...file,
    path: currentPath,
    originalSource: fileName,
    normalizedSource: buildNormalizedSource(fileName, currentPath),
    extension: getExtension(fileName),
    supportedForTextExtraction: isSupportedFile(file),
    extractionType: classifyExtractionType(file),
    driveViewUrl,
    driveDownloadUrl
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
    {
      responseType: "arraybuffer"
    }
  );

  return Buffer.from(res.data);
}

async function exportGoogleFile(fileId, mimeType) {
  const res = await drive.files.export(
    {
      fileId,
      mimeType
    },
    {
      responseType: "arraybuffer"
    }
  );

  return Buffer.from(res.data);
}

function buildExtractionMetadata(file = {}) {
  return {
    fileId: file.id || null,
    fileName: safeString(file.name),
    originalSource: safeString(file.originalSource || file.name),
    normalizedSource:
      file.normalizedSource || buildNormalizedSource(file.name, file.path),
    path: safeString(file.path || file.name),
    extension: file.extension || getExtension(file.name),
    mimeType: safeString(file.mimeType),
    modifiedTime: file.modifiedTime || null,
    createdTime: file.createdTime || null,
    size: file.size || null,
    driveViewUrl: file.driveViewUrl || buildDriveViewUrl(file.id, file.mimeType),
    driveDownloadUrl:
      file.driveDownloadUrl || buildDriveDownloadUrl(file.id, file.mimeType),
    supportedForTextExtraction:
      typeof file.supportedForTextExtraction === "boolean"
        ? file.supportedForTextExtraction
        : isSupportedFile(file),
    extractionType: file.extractionType || classifyExtractionType(file)
  };
}

/* ================= PUBLIC FUNCTIONS ================= */

export async function listDriveFiles(folderId) {
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing.");
  }

  const files = await getAllFilesRecursive(folderId);

  return files.sort((a, b) =>
    safeString(a.path).localeCompare(safeString(b.path), undefined, {
      sensitivity: "base"
    })
  );
}

export async function extractTextFromFile(file) {
  if (!file?.id) {
    throw new Error("Invalid Google Drive file object.");
  }

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

  return normalizeText(extractedText);
}

export async function readDriveFile(file) {
  const metadata = buildExtractionMetadata(file);

  try {
    const text = await extractTextFromFile(file);

    return {
      ...metadata,
      text,
      textLength: text.length,
      extractionStatus: text ? "success" : "empty"
    };
  } catch (error) {
    return {
      ...metadata,
      text: "",
      textLength: 0,
      extractionStatus: "failed",
      extractionError: error.message || "Failed to extract file text"
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

export default {
  listDriveFiles,
  extractTextFromFile,
  readDriveFile,
  listAndReadDriveFiles
};
