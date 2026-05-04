// FILE: reindex-service.js

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";
import {
  clearVectorStore,
  addDocumentToVectorStore,
  getVectorStoreStats,
  normalizeSourceName
} from "./vector-store.js";

function getSourceTier(doc = {}) {
  const value = `${doc.metadata?.path || ""} ${doc.metadata?.originalFileName || ""} ${doc.source || ""}`.toLowerCase();

  if (value.includes("01_tax_code")) return { tier: 1, label: "Tax Code / NIRC", weight: 1.0 };
  if (value.includes("02_revenue_regulations")) return { tier: 2, label: "Revenue Regulations", weight: 0.95 };
  if (value.includes("03_rmc")) return { tier: 3, label: "Revenue Memorandum Circulars", weight: 0.9 };
  if (value.includes("04_rmo")) return { tier: 4, label: "Revenue Memorandum Orders", weight: 0.85 };
  if (value.includes("05_bir_rulings")) return { tier: 5, label: "BIR Rulings", weight: 0.75 };
  if (value.includes("06_court_cases")) return { tier: 6, label: "Court Cases", weight: 0.6 };
  if (value.includes("07_cpa_notes")) return { tier: 7, label: "CPA Notes / Internal Notes", weight: 0.4 };

  return { tier: 99, label: "Unclassified Source", weight: 0.5 };
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
      text = String(text || "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

      const path = file.path || file.name;
      const normalizedSource = normalizeSourceName(file.name);

      const tierInfo = getSourceTier({
        source: file.name,
        metadata: {
          path,
          originalFileName: file.name
        }
      });

      if (!text) {
        failed.push({
          fileName: file.name,
          normalizedSource,
          path,
          mimeType: file.mimeType,
          authorityTier: tierInfo,
          reason: "No readable text"
        });
        continue;
      }

      const result = await addDocumentToVectorStore(text, normalizedSource, {
        fileId: file.id,
        originalFileName: file.name,
        originalSource: file.name,
        normalizedSource,
        mimeType: file.mimeType,
        path,
        modifiedTime: file.modifiedTime || null,
        authorityTier: tierInfo.tier,
        authorityLabel: tierInfo.label,
        authorityWeight: tierInfo.weight
      });

      indexed.push({
        fileName: file.name,
        normalizedSource,
        path,
        mimeType: file.mimeType,
        authorityTier: tierInfo,
        textLength: text.length,
        chunksAdded: result?.chunksAdded ?? 0,
        status: "Indexed"
      });
    } catch (error) {
      console.error(`Reindex failed for file: ${file?.name || "unknown"}`, error);

      failed.push({
        fileName: file?.name || "unknown",
        normalizedSource: normalizeSourceName(file?.name || "unknown"),
        path: file?.path || file?.name || "unknown",
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
