import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const server = readFileSync(resolve("server.js"), "utf8");
const service = readFileSync(resolve("services/source-document-service.js"), "utf8");
const driveReader = readFileSync(resolve("drive-reader.js"), "utf8");
const sourceCards = readFileSync(resolve("services/source-authority-selector.js"), "utf8");
const visibleSources = readFileSync(resolve("source-visibility-engine.js"), "utf8");
const pipeline = readFileSync(resolve("pipeline.js"), "utf8");
const quiz = readFileSync(resolve("learning/quiz-engine.js"), "utf8");
const review = readFileSync(resolve("learning/review-engine.js"), "utf8");

let assertions = 0;
function check(value, message) {
  assertions += 1;
  assert(value, message);
}

check(
  /app\.get\("\/sources\/:documentId\/document", authenticate/.test(server) &&
    server.includes('"Cache-Control": "private, no-store, max-age=0"') &&
    server.includes('"X-Content-Type-Options": "nosniff"'),
  "document route requires normal TINA authentication and sends no-store PDF headers"
);
check(
  service.includes("DOCUMENT_ID_PATTERN") &&
    service.includes('.contains("metadata", metadata)') &&
    service.includes("returnsDriveUrls: false") &&
    !/https?:\/\//.test(service),
  "document service validates canonical IDs, resolves indexed metadata, and contains no external URL path"
);
check(
  driveReader.includes("export async function getDrivePdfBuffer") &&
    driveReader.includes("return downloadFileBuffer(fileId)"),
  "document delivery reuses the server-side Drive byte primitive"
);
check(
  sourceCards.includes("documentId") &&
    sourceCards.includes("driveViewUrl:") &&
    sourceCards.includes("sourceUrl:"),
  "canonical source cards add document IDs without removing legacy URL fields"
);
check(
  visibleSources.includes("documentId: fileIdOf(doc)") &&
    visibleSources.includes("drive_url:") &&
    visibleSources.includes("driveDownloadUrl:"),
  "explorer source entries add canonical IDs while preserving legacy URLs and paths"
);
check(
  pipeline.includes("documentId") &&
    pipeline.includes("driveViewUrl:") &&
    pipeline.includes("sourceUrl:"),
  "normal answer source cards add document IDs without a global URL-field removal"
);
check(
  quiz.includes("documentId") && quiz.includes("driveViewUrl:") &&
    review.includes("documentId") && review.includes("driveViewUrl:"),
  "learning-mode source payloads keep established URL fields while exposing document IDs additively"
);

console.log(`TINA source document delivery checks: ${assertions} assertions passed`);
