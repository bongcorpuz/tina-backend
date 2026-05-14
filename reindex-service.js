// FILE: reindex-service.js
"use strict";

/**
 * TINA Reindex Service
 * Version: 3.1.0
 *
 * Patch:
 * - Fixed CommonJS compatibility with authority-engine.js.
 * - Preserves ES Module imports for Drive and vector-store.
 * - Adds safer metadata handling for TINA authority hierarchy.
 */

import { createRequire } from "module";

import { listDriveFiles, extractTextFromFile } from "./drive-reader.js";

import {
  clearVectorStore,
  addDocumentToVectorStore,
  getVectorStoreStats,
  normalizeSourceName
} from "./vector-store.js";

const require = createRequire(import.meta.url);

const { buildAuthorityMetadata } = require("./authority-engine.js");

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

function buildFallbackAuthorityMetadata({ fileName = "", path = "", text = "" }) {
  const blob = `${fileName} ${path} ${text.slice(0, 1000)}`.toLowerCase();

  let authorityType = "SECONDARY";
  let authorityLevel = 99;
  let authorityScore = 0;
  let authorityLabel = "Secondary Material";

  if (blob.includes("constitution")) {
    authorityType = "CONSTITUTION";
    authorityLevel = 1;
    authorityScore = 100;
    authorityLabel = "1987 Constitution";
  } else if (
    blob.includes("national internal revenue code") ||
    /\bnirc\b/.test(blob) ||
    /\btax code\b/.test(blob) ||
    /\brepublic act\b/.test(blob) ||
    /\bra\s+\d{4,6}\b/.test(blob)
  ) {
    authorityType = "STATUTE";
    authorityLevel = 2;
    authorityScore = 98;
    authorityLabel = "Statute / NIRC / Republic Act";
  } else if (/\brr\s*\d+[-/]\d{2,4}\b/i.test(blob) || blob.includes("revenue regulation")) {
    authorityType = "RR";
    authorityLevel = 3;
    authorityScore = 95;
    authorityLabel = "Revenue Regulation";
  } else if (/\brmc\s*\d+[-/]\d{2,4}\b/i.test(blob) || blob.includes("revenue memorandum circular")) {
    authorityType = "RMC";
    authorityLevel = 4;
    authorityScore = 86;
    authorityLabel = "Revenue Memorandum Circular";
  } else if (/\brmo\s*\d+[-/]\d{2,4}\b/i.test(blob) || blob.includes("revenue memorandum order")) {
    authorityType = "RMO";
    authorityLevel = 5;
    authorityScore = 82;
    authorityLabel = "Revenue Memorandum Order";
  } else if (/\bramo\s*\d+[-/]\d{2,4}\b/i.test(blob) || blob.includes("revenue audit memorandum order")) {
    authorityType = "RAMO";
    authorityLevel = 6;
    authorityScore = 80;
    authorityLabel = "Revenue Audit Memorandum Order";
  } else if (blob.includes("bir ruling")) {
    authorityType = "BIR_RULING";
    authorityLevel = 7;
    authorityScore = 72;
    authorityLabel = "BIR Ruling";
  } else if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(blob) || blob.includes("supreme court")) {
    authorityType = "SUPREME_COURT";
    authorityLevel = 8;
    authorityScore = 97;
    authorityLabel = "Supreme Court Decision";
  }

  return {
    authorityType,
    authorityLevel,
    authorityScore,
    authorityLabel,
    normalizedReference: null,
    normalizedAliases: [],
    recencyDate: null
  };
}

function safeBuildAuthorityMetadata({ fileName = "", path = "", text = "", modifiedTime = null }) {
  try {
    if (typeof buildAuthorityMetadata === "function") {
      return buildAuthorityMetadata({
        fileName,
        path,
        text,
        modifiedTime
      });
    }
  } catch (error) {
    console.warn("Authority metadata fallback used:", error?.message || error);
  }

  return buildFallbackAuthorityMetadata({
    fileName,
    path,
    text
  });
}

function buildIndexMetadata(file = {}, text = "") {
  const path = safeString(file.path || file.name || "");
  const originalFileName = safeString(file.name || "");
  const originalSource = safeString(file.originalSource || file.name || "");
  const normalizedSource =
    safeString(file.normalizedSource) ||
    safeNormalizeSourceName(path || originalFileName || originalSource);

  const authority = safeBuildAuthorityMetadata({
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

    authorityType: authority.authorityType || "SECONDARY",
    authorityLevel: authority.authorityLevel || 99,
    authorityScore: authority.authorityScore || 0,
    authorityLabel: authority.authorityLabel || "Secondary Material",
    controllingPrecedence: authority.controllingPrecedence || null,

    normalizedReference: authority.normalizedReference || null,
    normalizedAliases: Array.isArray(authority.normalizedAliases)
      ? authority.normalizedAliases
      : [],

    recencyDate: authority.recencyDate || file.modifiedTime || null,
    jurisdiction: "PH",
    sourceCategory: "google_drive_index",
    documentTitle: originalFileName || originalSource || path,

    effectiveFrom: null,
    effectiveTo: null,
    isSuperseded: false,
    supersededByReference: null,
    repealedByReference: null,
    amendedByReference: null,

    tinaIndexedAt: new Date().toISOString(),
    tinaReindexServiceVersion: "3.1.0"
  };
}

function buildFailedRecord(file = {}, overrides = {}) {
  const fallbackName = safeString(file?.name || "unknown");
  const fallbackPath = safeString(file?.path || file?.name || "unknown");

  return {
    fileName: overrides.fileName || fallbackName,
    normalizedSource:
      overrides.normalizedSource ||
      safeNormalizeSourceName(fallbackPath || fallbackName),
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

  for (const file of files || []) {
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

      const result = await addDocumentToVectorStore(
        text,
        normalizedSource,
        metadata
      );

      indexed.push({
        fileName: metadata.originalFileName,
        normalizedSource,
        path: metadata.path,
        mimeType: metadata.mimeType,
        authorityType: metadata.authorityType,
        authorityLevel: metadata.authorityLevel,
        authorityLabel: metadata.authorityLabel,
        normalizedReference: metadata.normalizedReference,
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
    totalFilesChecked: Array.isArray(files) ? files.length : 0,
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

export function reindexServiceHealthCheck() {
  return {
    ok: true,
    module: "reindex-service",
    version: "3.1.0",
    driveReaderCompatible: true,
    vectorStoreCompatible: true,
    authorityEngineCompatible: true,
    backgroundControllerCompatible: true
  };
}

export default {
  runDriveReindex,
  createBackgroundReindexController,
  reindexServiceHealthCheck
};
