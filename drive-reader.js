// FILE: drive-reader.js

import { google } from "googleapis";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const FOLDER_MIME = "application/vnd.google-apps.folder";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDE_MIME = "application/vnd.google-apps.presentation";

/* ================= GOOGLE DRIVE AUTH ================= */

if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing in Render environment variables.");
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
        "webViewLink,",
        "webContentLink",
        ")"
      ].join(""),
      pageSize: 1000,
      pageToken
    });

    const files = res.data.files || [];

    for (const file of files) {
      const enriched = enrichDriveFile(file, parentPath);

      if (file.mimeType === FOLDER_MIME) {
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
      alt: "media"
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

function buildExtractionMetadata(file = {}) {
  return {
    fileId: file.id || null,
    fileName: safeString(file.name),
    originalSource: safeString(file.originalSource || file.name),
    normalizedSource:
      file.normalizedSource || buildNormalizedSource(file.name, file.path),
    path: safeString(file.path || file.name),
    mimeType: safeString(file.mimeType),
    modifiedTime: file.modifiedTime || null,
    size: file.size || null,
    driveViewUrl: file.driveViewUrl || buildDriveViewUrl(file.id, file.mimeType),
    driveDownloadUrl:
      file.driveDownloadUrl || buildDriveDownloadUrl(file.id, file.mimeType)
  };
}

/* ================= PUBLIC FUNCTIONS ================= */

export async function listDriveFiles(folderId) {
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing.");
  }

  return getAllFilesRecursive(folderId);
}

export async function extractTextFromFile(file) {
  if (!file?.id) {
    throw new Error("Invalid Google Drive file object.");
  }

  const mimeType = file.mimeType || "";
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
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const buffer = await downloadFileBuffer(file.id);
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value || "";
  } else if (isTextLikeFile(file, mimeType)) {
    const buffer = await downloadFileBuffer(file.id);
    extractedText = buffer.toString("utf8");
  } else {
    extractedText = "";
  }

  return normalizeText(extractedText);
}

export async function readDriveFile(file) {
  const text = await extractTextFromFile(file);

  return {
    ...buildExtractionMetadata(file),
    text
  };
}

export async function listAndReadDriveFiles(folderId) {
  const files = await listDriveFiles(folderId);
  const output = [];

  for (const file of files) {
    try {
      const record = await readDriveFile(file);
      output.push(record);
    } catch (error) {
      output.push({
        ...buildExtractionMetadata(file),
        text: "",
        extractionError: error.message || "Failed to extract file text"
      });
    }
  }

  return output;
}

export default {
  listDriveFiles,
  extractTextFromFile,
  readDriveFile,
  listAndReadDriveFiles
};
