"use strict";

// Canonical source-document identity helpers. Legacy Drive metadata is inspected only
// while normalizing an indexed record. No URL is returned to the client.

export const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com"
]);

function canonicalId(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return DOCUMENT_ID_PATTERN.test(text) ? text : null;
}

export function extractDriveDocumentId(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !DRIVE_HOSTS.has(url.hostname)) return null;

    const queryId = canonicalId(url.searchParams.get("id"));
    if (queryId) return queryId;

    const parts = url.pathname.split("/").filter(Boolean);
    const markerIndex = parts.indexOf("d");
    return markerIndex >= 0 ? canonicalId(parts[markerIndex + 1]) : null;
  } catch {
    return null;
  }
}

function directId(record = {}) {
  const metadata = record.metadata || {};
  const driveMetadata = metadata.drive || record.drive || {};

  return canonicalId(
    record.documentId ||
      record.document_id ||
      record.fileId ||
      record.file_id ||
      record.driveFileId ||
      record.drive_file_id ||
      metadata.documentId ||
      metadata.document_id ||
      metadata.fileId ||
      metadata.file_id ||
      metadata.driveFileId ||
      metadata.drive_file_id ||
      driveMetadata.fileId ||
      driveMetadata.file_id ||
      null
  );
}

export function canonicalDocumentIdOf(record = {}) {
  const explicit = directId(record);
  if (explicit) return explicit;

  const metadata = record.metadata || {};
  const driveMetadata = metadata.drive || record.drive || {};
  const urlCandidates = [
    record.driveViewUrl,
    record.drive_view_url,
    record.driveDownloadUrl,
    record.drive_download_url,
    record.webViewLink,
    record.web_view_link,
    record.sourceUrl,
    record.source_url,
    record.url,
    metadata.driveViewUrl,
    metadata.drive_view_url,
    metadata.driveDownloadUrl,
    metadata.drive_download_url,
    metadata.webViewLink,
    metadata.web_view_link,
    metadata.sourceUrl,
    metadata.source_url,
    metadata.url,
    driveMetadata.viewUrl,
    driveMetadata.view_url,
    driveMetadata.downloadUrl,
    driveMetadata.download_url
  ];

  for (const candidate of urlCandidates) {
    const extracted = extractDriveDocumentId(candidate);
    if (extracted) return extracted;
  }

  return null;
}
