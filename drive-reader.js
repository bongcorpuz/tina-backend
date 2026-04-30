import { google } from "googleapis";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || "service-account.json";

const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: SCOPES
});

const drive = google.drive({ version: "v3", auth });

const FOLDER_MIME = "application/vnd.google-apps.folder";

/* ================= HELPERS ================= */

async function getAllFilesRecursive(folderId, parentPath = "") {
  let results = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      pageSize: 1000,
      pageToken
    });

    const files = res.data.files || [];

    for (const file of files) {
      const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;

      if (file.mimeType === FOLDER_MIME) {
        const subFiles = await getAllFilesRecursive(file.id, currentPath);
        results = results.concat(subFiles);
      } else {
        results.push({
          ...file,
          path: currentPath
        });
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

async function exportGoogleDoc(fileId, mimeType = "text/plain") {
  const res = await drive.files.export(
    {
      fileId,
      mimeType
    },
    {
      responseType: "arraybuffer"
    }
  );

  return Buffer.from(res.data).toString("utf8");
}

/* ================= PUBLIC FUNCTIONS ================= */

export async function listDriveFiles(folderId) {
  return await getAllFilesRecursive(folderId);
}

export async function extractTextFromFile(file) {
  if (!file?.id) {
    throw new Error("Invalid Google Drive file object.");
  }

  const mimeType = file.mimeType || "";

  // Google Docs
  if (mimeType === "application/vnd.google-apps.document") {
    return await exportGoogleDoc(file.id, "text/plain");
  }

  // Google Sheets
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return await exportGoogleDoc(file.id, "text/csv");
  }

  // Google Slides
  if (mimeType === "application/vnd.google-apps.presentation") {
    return await exportGoogleDoc(file.id, "text/plain");
  }

  // PDF
  if (mimeType === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
    const buffer = await downloadFileBuffer(file.id);
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  // Word
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name?.toLowerCase().endsWith(".docx")
  ) {
    const buffer = await downloadFileBuffer(file.id);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // Plain text / CSV / Markdown / JSON
  if (
    mimeType.startsWith("text/") ||
    file.name?.toLowerCase().endsWith(".txt") ||
    file.name?.toLowerCase().endsWith(".csv") ||
    file.name?.toLowerCase().endsWith(".md") ||
    file.name?.toLowerCase().endsWith(".json")
  ) {
    const buffer = await downloadFileBuffer(file.id);
    return buffer.toString("utf8");
  }

  return "";
}