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

function safeString(value = "") {
  return String(value || "").trim();
}

function buildIndexMetadata(file = {}, text = "") {
  const path = safeString(file.path || file.name || "");
  const originalFileName = safeString(file.name || "");
  const originalSource = safeString(file.originalSource || file.name || "");
  const normalizedSource =
    safeString(file.normalizedSource) ||
    normalizeSourceName(path || originalFileName);

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

function buildFailedRecord(file = {}, overrides = {}) {
  const fallbackName = safeString(file?.name || "unknown");
  const fallbackPath = safeString(file?.path || file?.name || "unknown");

  return {
    fileName: overrides.fileName || fallbackName,
    normalizedSource:
      overrides.normalizedSource ||
      normalizeSourceName(fallbackPath || fallbackName),
    path: overrides.path || fallbackPath,
    mimeType: overrides.mimeType || file?.mimeType || null,
    authorityType: overrides.authorityType || null,
    authorityLevel: overrides.authorityLevel || null,
    authorityLabel: overrides.authorityLabel || null,
    reason: overrides.reason || "File indexing failed"
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
        failed.push(
          buildFailedRecord(file, {
            fileName: metadata.originalFileName,
            normalizedSource,
            path: metadata.path,
            mimeType: metadata.mimeType,
            authorityType: metadata.authorityType,
            authorityLevel: metadata.authorityLevel,
            authorityLabel: metadata.authorityLabel,
            reason: "No readable text"
          })
        );
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
      console.error(`Reindex failed for file: ${file?.name || "unknown"}`, error);

      failed.push(
        buildFailedRecord(file, {
          reason: error?.message || "File indexing failed"
        })
      );
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
        console.error("Background reindex error:", error);

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
