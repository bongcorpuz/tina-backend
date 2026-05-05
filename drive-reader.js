import { google } from "googleapis";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const FOLDER_MIME = "application/vnd.google-apps.folder";

/* ================= GOOGLE DRIVE AUTH ================= */

if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing in Render environment variables.");
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} catch (error) {
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON.");
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: SCOPES
});

const drive = google.drive({ version: "v3", auth });

/* ================= HELPERS ================= */

function buildDriveViewUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (mimeType === "application/vnd.google-apps.document") {
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
  }

  if (mimeType === "application/vnd.google-apps.presentation") {
    return `https://docs.google.com/presentation/d/${fileId}/edit`;
  }

  return `https://drive.google.com/file/d/${fileId}/view`;
}

function buildDriveDownloadUrl(fileId, mimeType = "") {
  if (!fileId) return null;

  if (mimeType === "application/vnd.google-apps.document") {
    return `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  }

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  }

  if (mimeType === "application/vnd.google-apps.presentation") {
    return `https://docs.google.com/presentation/d/${fileId}/export/txt`;
  }

  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function enrichDriveFile(file, parentPath = "") {
  const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;

  return {
    ...file,
    path: currentPath,
    driveViewUrl: buildDriveViewUrl(file.id, file.mimeType),
    driveDownloadUrl: buildDriveDownloadUrl(file.id, file.mimeType)
  };
}

async function getAllFilesRecursive(folderId, parentPath = "") {
  let results = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)",
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
        results.push({
          ...enriched,
          driveViewUrl: file.webViewLink || enriched.driveViewUrl,
          driveDownloadUrl: file.webContentLink || enriched.driveDownloadUrl
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

  return Buffer.from(res.data).toString("utf8");
}

function isTextLikeFile(file, mimeType) {
  const name = file.name?.toLowerCase() || "";

  return (
    mimeType.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".csv") ||
    name.endsWith(".md") ||
    name.endsWith(".json")
  );
}

/* ================= PUBLIC FUNCTIONS ================= */

export async function listDriveFiles(folderId) {
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing.");
  }

  return await getAllFilesRecursive(folderId);
}

export async function extractTextFromFile(file) {
  if (!file?.id) {
    throw new Error("Invalid Google Drive file object.");
  }

  const mimeType = file.mimeType || "";
  const fileName = file.name?.toLowerCase() || "";

  if (mimeType === "application/vnd.google-apps.document") {
    return await exportGoogleFile(file.id, "text/plain");
  }

  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return await exportGoogleFile(file.id, "text/csv");
  }

  if (mimeType === "application/vnd.google-apps.presentation") {
    return await exportGoogleFile(file.id, "text/plain");
  }

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const buffer = await downloadFileBuffer(file.id);
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const buffer = await downloadFileBuffer(file.id);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (isTextLikeFile(file, mimeType)) {
    const buffer = await downloadFileBuffer(file.id);
    return buffer.toString("utf8");
  }

  return "";
}
