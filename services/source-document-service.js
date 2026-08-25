// TINA source-document delivery.
// Accepts only a canonical indexed document ID and never returns a Drive URL,
// file path, storage credential, or source-system diagnostic to the browser.

import { getDrivePdfBuffer } from "../drive-reader.js";
import { DOCUMENT_ID_PATTERN, canonicalDocumentIdOf } from "./source-document-identity.js";



function metadataFileId(row = {}) {
  return canonicalDocumentIdOf(row);
}

function isPdfSource(row = {}) {
  const metadata = row.metadata || {};
  const mimeType = String(metadata.mimeType || metadata.mime_type || row.mime_type || "").toLowerCase();
  const name = String(row.document_title || row.documentTitle || row.source || "").toLowerCase();
  return mimeType === "application/pdf" || name.endsWith(".pdf");
}

async function findIndexedDocumentById(supabase, documentId) {
  const table = process.env.VECTOR_TABLE || "tina_vector_store";
  const metadataCandidates = [
    { documentId },
    { document_id: documentId },
    { fileId: documentId },
    { file_id: documentId }
  ];

  // Older indexed rows may retain only a server-stored Drive URL. These are
  // exact metadata candidates derived from the validated opaque ID; no client
  // URL is accepted, reflected, or returned.
  const legacyUrls = [
    `https://drive.google.com/file/d/${documentId}/view`,
    `https://drive.google.com/uc?export=download&id=${documentId}`,
    `https://docs.google.com/document/d/${documentId}/edit`,
    `https://docs.google.com/spreadsheets/d/${documentId}/edit`,
    `https://docs.google.com/presentation/d/${documentId}/edit`
  ];
  const legacyUrlFields = [
    "driveViewUrl", "drive_view_url", "driveDownloadUrl", "drive_download_url",
    "webViewLink", "web_view_link", "sourceUrl", "source_url", "url"
  ];

  for (const url of legacyUrls) {
    for (const field of legacyUrlFields) metadataCandidates.push({ [field]: url });
  }

  for (const metadata of metadataCandidates) {
    const { data, error } = await supabase
      .from(table)
      .select("id,source,document_title,metadata")
      .contains("metadata", metadata)
      .limit(1);

    if (error) continue;
    const candidate = data?.[0] || null;
    if (candidate && metadataFileId(candidate) === documentId) return candidate;
  }

  return null;
}

export async function getAuthenticatedSourceDocument({ supabase, documentId, userId }) {
  if (!userId) return { status: 401 };
  if (!DOCUMENT_ID_PATTERN.test(String(documentId || ""))) return { status: 404 };

  const source = await findIndexedDocumentById(supabase, String(documentId));
  // Deliberately identical generic result for unknown and access-ineligible records.
  if (!source) return { status: 404 };
  if (!isPdfSource(source)) return { status: 415 };

  try {
    const fileBuffer = await getDrivePdfBuffer(documentId);
    return { status: 200, fileBuffer };
  } catch {
    return { status: 503 };
  }
}

export function sourceDocumentHealthCheck() {
  return {
    ok: true,
    acceptsCanonicalDocumentIdOnly: true,
    resolvesIndexedRecordsOnly: true,
    returnsDriveUrls: false,
    supportsInlinePdfOnly: true
  };
}
