// FILE: reindex-service.js

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";
import {
  clearVectorStore,
  addDocumentToVectorStore,
  getVectorStoreStats,
  normalizeSourceName
} from "./vector-store.js";
import { buildAuthorityMetadata } from "./authority-engine.js";

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function buildIndexMetadata(file = {}, text = "") {
  const path = file.path || file.name || "";
  const originalFileName = file.name || "";
  const originalSource = file.originalSource || file.name || "";
  const normalizedSource =
    file.normalizedSource || normalizeSourceName(path || originalFileName);

  const authority = buildAuthorityMetadata({
    fileName: originalFileName,
    path,
    text,
    modifiedTime: file.modifiedTime || null
  });

  return {
    fileId: file.id || null,
    originalFileName,
    originalSource,
    normalizedSource,
    mimeType: file.mimeType || null,
    path,
    modifiedTime: file.modifiedTime || null,
    driveViewUrl: file.driveViewUrl || null,
    driveDownloadUrl: file.driveDownloadUrl || null,
    authorityType: authority.authorityType,
    authorityLevel: authority.authorityLevel,
    authorityScore: authority.authorityScore,
    authorityLabel: authority.authorityLabel,
    normalizedReference: authority.normalizedReference,
    normalizedAliases: authority.normalizedAliases,
    recencyDate: authority.recencyDate,
    jurisdiction: "PH",
    sourceCategory: "google_drive_index",
    documentTitle: originalFileName || originalSource || path,
    effectiveFrom: null,
    effectiveTo: null,
    isSuperseded: false,
    supersededByReference: null,
    repealedByReference: null,
    amendedByReference: null
  };
}

export async function runDriveReindex() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");
  }

  await clearVectorStore();

  const files = await listDriveFiles(folderId);
  const indexed = [];
  const failed = [];

  for (const file of files) {
    try {
      let text = await extractTextFromFile(file);
      text = normalizeText(text);

      const metadata = buildIndexMetadata(file, text);
      const normalizedSource = metadata.normalizedSource;

      if (!text) {
        failed.push({
          fileName: metadata.originalFileName,
          normalizedSource,
          path: metadata.path,
          mimeType: metadata.mimeType,
          authorityType: metadata.authorityType,
          authorityLevel: metadata.authorityLevel,
          authorityLabel: metadata.authorityLabel,
          reason: "No readable text"
        });
        continue;
      }

      const result = await addDocumentToVectorStore(text, normalizedSource, metadata);

      indexed.push({
        fileName: metadata.originalFileName,
        normalizedSource,
        path: metadata.path,
        mimeType: metadata.mimeType,
        authorityType: metadata.authorityType,
        authorityLevel: metadata.authorityLevel,
        authorityLabel: metadata.authorityLabel,
        textLength: text.length,
        chunksAdded: result?.chunksAdded ?? 0,
        status: "Indexed"
      });
    } catch (error) {
      const fallbackName = file?.name || "unknown";
      const fallbackPath = file?.path || file?.name || "unknown";

      console.error(`Reindex failed for file: ${fallbackName}`, error);

      failed.push({
        fileName: fallbackName,
        normalizedSource: normalizeSourceName(fallbackPath || fallbackName),
        path: fallbackPath,
        mimeType: file?.mimeType || null,
        reason: error.message || "File indexing failed"
      });
    }
  }

  const stats = await getVectorStoreStats();

  return {
    totalFilesChecked: files.length,
    filesIndexed: indexed.length,
    filesFailed: failed.length,
    vectorStore: stats,
    indexed,
    failed
  };
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

    lastStatus = {
      running: true,
      startedAt: new Date().toISOString(),
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
          startedAt: lastStatus.startedAt,
          finishedAt: new Date().toISOString(),
          success: true,
          message: "Indexing completed successfully.",
          error: null,
          result
        };
      })
      .catch((error) => {
        console.error("Background reindex error:", error);

        lastStatus = {
          running: false,
          startedAt: lastStatus.startedAt,
          finishedAt: new Date().toISOString(),
          success: false,
          message: "Indexing failed.",
          error: error.message || "Unknown indexing error",
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
