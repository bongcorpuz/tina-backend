// FILE: source-visibility-engine.js

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

export const MAX_VISIBLE_SOURCES = 5;

const HIDDEN_SOURCE_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers"
];

export function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeLooseText(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/[^\w\s/%₱.,()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

export function dedupe(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function stripFileExtension(value = "") {
  return String(value || "").replace(/\.(pdf|docx|doc|txt|md|csv|json)$/i, "");
}

function basename(value = "") {
  const parts = String(value || "").split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(value || "");
}

function normalizeYear(year = "") {
  const clean = String(year || "").trim();
  if (!clean) return "";
  if (/^\d{4}$/.test(clean)) return clean;

  if (/^\d{2}$/.test(clean)) {
    const yy = Number(clean);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${clean}` : `19${clean}`;
  }

  return clean;
}

function stripFolderPrefixes(value = "") {
  return String(value || "")
    .replace(
      /(^|\/)(00_constitution|01_tax_code|02_revenue_regulations|03_rmc|04_rmo|04b_ramo|05_bir_rulings|05b_tax_treaties|06_court_cases|07_cpa_notes|08_review_materials)(\/|$)/gi,
      " "
    )
    .replace(/[\\/]+/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.sourcePath ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.source ||
    ""
  );
}

function sourceRawTitleOf(doc = {}) {
  return normalizeText(
    doc.title ||
      doc.sourceTitle ||
      doc.source_title ||
      doc.metadata?.documentTitle ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      basename(sourcePathOf(doc)) ||
      ""
  );
}

export function sourceTitleOf(doc = {}) {
  const explicit = sourceRawTitleOf(doc);

  if (explicit) {
    return compactSpaces(stripFileExtension(stripFolderPrefixes(explicit)) || explicit);
  }

  return "Untitled Source";
}

export function sourceDriveUrlOf(doc = {}) {
  const fileId =
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    null;

  return (
    doc.driveViewUrl ||
    doc.drive_view_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null)
  );
}

export function sourceDownloadUrlOf(doc = {}) {
  const fileId =
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    null;

  return (
    doc.driveDownloadUrl ||
    doc.drive_download_url ||
    doc.metadata?.driveDownloadUrl ||
    doc.metadata?.drive_download_url ||
    (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null)
  );
}

export function fileIdOf(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    null
  );
}

export function authorityTypeOf(doc = {}) {
  const raw = String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      ""
  )
    .trim()
    .toUpperCase();

  if (raw) return raw;

  const path = normalizeLooseText(sourcePathOf(doc));
  const title = normalizeLooseText(sourceRawTitleOf(doc));
  const blob = `${path} ${title}`;

  if (path.includes("00_constitution") || title.includes("constitution")) return "CONSTITUTION";
  if (
    path.includes("01_tax_code") ||
    /\b(?:republic act|ra)\s*(?:no)?\s*\d{4,6}\b/i.test(blob) ||
    title.includes("tax code") ||
    title.includes("nirc")
  ) return "STATUTE";

  if (path.includes("02_revenue_regulations") || /\brr\b/i.test(title)) return "RR";
  if (path.includes("03_rmc") || /\brmc\b/i.test(title)) return "RMC";
  if (path.includes("04b_ramo") || /\bramo\b/i.test(title)) return "RAMO";
  if (path.includes("04_rmo") || /\brmo\b/i.test(title)) return "RMO";
  if (path.includes("05_bir_rulings") || title.includes("bir ruling")) return "BIR_RULING";
  if (title.includes("supreme court") || /\bg\.r\.\s*no\b/i.test(title)) return "SUPREME_COURT";
  if (title.includes("cta en banc") || /\bcta eb\b/i.test(title)) return "CTA_EN_BANC";
  if (title.includes("court of appeals") || /\bca-g\.r\.\b/i.test(title)) return "COURT_OF_APPEALS";
  if (title.includes("cta") || /\bcta\b/i.test(title)) return "CTA_DIVISION";
  if (path.includes("05b_tax_treaties") || title.includes("tax treaty")) return "TREATY";

  return "SECONDARY";
}

export function authorityLevelOf(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  const map = {
    CONSTITUTION: 1,
    STATUTE: 2,
    RR: 3,
    RMC: 4,
    RMO: 5,
    RAMO: 6,
    BIR_RULING: 7,
    SUPREME_COURT: 8,
    CTA_EN_BANC: 9,
    COURT_OF_APPEALS: 10,
    CTA_DIVISION: 11,
    TREATY: 12,
    LGU: 13,
    SECONDARY: 99
  };

  return map[authorityTypeOf(doc)] || 99;
}

function shouldHideSource(doc = {}) {
  const haystack = normalizeLooseText([sourcePathOf(doc), sourceTitleOf(doc)].join(" "));
  return HIDDEN_SOURCE_PATTERNS.some((pattern) => haystack.includes(pattern));
}

export function formatDocType(doc = {}) {
  const type = authorityTypeOf(doc);

  const labels = {
    CONSTITUTION: "Constitution",
    STATUTE: "Statute",
    RR: "RR",
    RMC: "RMC",
    RMO: "RMO",
    RAMO: "RAMO",
    BIR_RULING: "BIR Ruling",
    SUPREME_COURT: "Supreme Court",
    CTA_EN_BANC: "CTA En Banc",
    COURT_OF_APPEALS: "Court of Appeals",
    CTA_DIVISION: "CTA Division",
    TREATY: "Treaty",
    LGU: "LGU",
    SECONDARY: "Source"
  };

  return labels[type] || "Source";
}

export function inferIssuanceNumber(doc = {}) {
  const haystack = compactSpaces(
    [
      doc.issuanceNumber,
      doc.displayTitle,
      doc.title,
      doc.sourceTitle,
      doc.source_title,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.originalSource
    ]
      .filter(Boolean)
      .join(" ")
  );

  const normalizedRef = String(
    doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      ""
  );

  const directPatterns = [
    { regex: /\b(1987 Constitution)\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(Republic Act No\.?\s*\d{4,6})\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(RA)\s*(?:No\.?)?\s*(\d{4,6})\b/i, value: (m) => `RA No. ${m[2]}` },
    { regex: /\b(RR)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMC)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RAMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(BIR Ruling)\s*(?:No\.?)?\s*([\w./()-]+)\b/i, value: (m) => `${m[1]} No. ${m[2]}` },
    { regex: /\b(CTA(?:\s+EB)?\s+No\.?\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(CA-G\.R\.\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) }
  ];

  for (const pattern of directPatterns) {
    const match = haystack.match(pattern.regex);
    if (match) return compactSpaces(pattern.value(match));
  }

  const normalizedPatterns = [
    { regex: /\bRA_(\d{4,6})\b/i, value: (m) => `RA No. ${m[1]}` },
    { regex: /\bRR_(\d{1,3})[-_](\d{2,4})\b/i, value: (m) => `RR No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRMC_(\d{1,3})[-_](\d{2,4})\b/i, value: (m) => `RMC No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRMO_(\d{1,3})[-_](\d{2,4})\b/i, value: (m) => `RMO No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRAMO_(\d{1,3})[-_](\d{2,4})\b/i, value: (m) => `RAMO No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bBIR_RULING_([A-Z0-9_./()-]+)\b/i, value: (m) => `BIR Ruling No. ${String(m[1]).replace(/_/g, "-")}` }
  ];

  for (const pattern of normalizedPatterns) {
    const match = normalizedRef.match(pattern.regex);
    if (match) return compactSpaces(pattern.value(match));
  }

  return "";
}

export function buildShortSubject(doc = {}) {
  const explicitTitle = normalizeText(
    doc.metadata?.documentTitle ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.title ||
      doc.sourceTitle ||
      doc.source_title ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      basename(sourcePathOf(doc)) ||
      ""
  );

  const rawPath = normalizeText(sourcePathOf(doc));
  const basis = explicitTitle || rawPath || "Untitled Source";
  const issuanceNumber = inferIssuanceNumber(doc);

  let subject = stripFolderPrefixes(stripFileExtension(basis));

  if (issuanceNumber) {
    const escaped = issuanceNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    subject = subject.replace(new RegExp(`\\b${escaped}\\b`, "i"), "").trim();
  }

  subject = subject
    .replace(/\bcopy\b/gi, "")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!subject) {
    subject = stripFolderPrefixes(stripFileExtension(rawPath)) || "Untitled Source";
  }

  if (
    authorityTypeOf(doc) === "STATUTE" &&
    /^(ra no\.?\s*\d+|republic act no\.?\s*\d+)$/i.test(subject)
  ) {
    return "";
  }

  return compactSpaces(subject);
}

export function buildLegalBasisEntry(doc = {}) {
  const type = formatDocType(doc);
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number && subject) return `[${type}] ${number} – ${subject}`;
  if (number) return `[${type}] ${number}`;
  return `[${type}] ${subject || sourceTitleOf(doc)}`;
}

export function buildSourcesEntry(doc = {}) {
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number && subject) return `${number} – ${subject}`;
  if (number) return number;
  return subject || sourceTitleOf(doc);
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    doc.title ||
    JSON.stringify(doc)
  );
}

export function uniqueDocs(docs = []) {
  const seen = new Set();
  const result = [];

  for (const doc of Array.isArray(docs) ? docs : []) {
    if (!doc) continue;
    const key = buildDocKey(doc);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(doc);
  }

  return result;
}

function toVisibleSourceEntry(doc = {}) {
  return {
    ...doc,
    title: sourceTitleOf(doc),
    driveViewUrl: sourceDriveUrlOf(doc),
    driveDownloadUrl: sourceDownloadUrlOf(doc),
    fileId: fileIdOf(doc),
    sourcePath: sourcePathOf(doc),
    authorityType: authorityTypeOf(doc),
    authorityLevel: authorityLevelOf(doc),
    issuanceNumber: inferIssuanceNumber(doc)
  };
}

export function filterVisibleSources(
  docs = [],
  { maxItems = MAX_VISIBLE_SOURCES, supersessionResult = null } = {}
) {
  const visible = [];

  for (const doc of uniqueDocs(docs)) {
    if (shouldHideSource(doc)) continue;

    const replacement = findReplacementForDocument(doc, supersessionResult);
    const sourceToUse = replacement || doc;

    if (shouldHideSource(sourceToUse)) continue;

    visible.push(toVisibleSourceEntry(sourceToUse));
  }

  return uniqueDocs(visible)
    .sort((a, b) => {
      const levelDiff = authorityLevelOf(a) - authorityLevelOf(b);
      if (levelDiff !== 0) return levelDiff;

      const aNumber = inferIssuanceNumber(a);
      const bNumber = inferIssuanceNumber(b);
      if (aNumber && bNumber) return aNumber.localeCompare(bNumber);

      return sourceTitleOf(a).localeCompare(sourceTitleOf(b));
    })
    .slice(0, maxItems);
}

export function runSupersessionPreflight({
  legalBasisDocs = [],
  sourcesUsed = [],
  asOfDate = new Date()
}) {
  const combinedDocs = uniqueDocs([...legalBasisDocs, ...sourcesUsed]);
  const supersessionResult = applySupersessionFilter(combinedDocs, asOfDate);

  const resolvedLegalBasisDocs = uniqueDocs(
    legalBasisDocs.map(
      (doc) => findReplacementForDocument(doc, supersessionResult) || doc
    )
  );

  const visiblePool = sourcesUsed.length > 0 ? sourcesUsed : resolvedLegalBasisDocs;

  const resolvedSourcesUsed = filterVisibleSources(visiblePool, {
    maxItems: MAX_VISIBLE_SOURCES,
    supersessionResult
  });

  return {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  };
}

function inferAuthorityUsed(legalBasisDocs = [], sourcesUsed = []) {
  return dedupe(
    [...legalBasisDocs, ...sourcesUsed]
      .map((doc) => formatDocType(doc))
      .filter(Boolean)
      .slice(0, 5)
  );
}

function inferConfidenceLevel({
  legalBasisDocs = [],
  hierarchyConflict = null,
  supersessionResult = null
}) {
  if (!legalBasisDocs.length) return "LOW";

  const bestLevel = Math.min(...legalBasisDocs.map((doc) => authorityLevelOf(doc)));

  if (hierarchyConflict?.conflict) return bestLevel <= 8 ? "MEDIUM" : "LOW";
  if (supersessionResult?.superseded?.length) return bestLevel <= 8 ? "MEDIUM" : "LOW";

  if (bestLevel <= 3) return "HIGH";
  if (bestLevel <= 7) return "MEDIUM";
  if (bestLevel <= 11) return "LIMITED";

  return "LOW";
}

export function buildFinalRoutePayload({
  answer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  hierarchyConflict = null,
  asOfDate = new Date()
}) {
  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate
  });

  const finalVisibleSources =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

  return {
    answer,
    sources: finalVisibleSources.slice(0, MAX_VISIBLE_SOURCES).map((doc) => ({
      title: sourceTitleOf(doc),
      drive_url: sourceDriveUrlOf(doc),
      driveViewUrl: sourceDriveUrlOf(doc),
      drive_download_url: sourceDownloadUrlOf(doc),
      driveDownloadUrl: sourceDownloadUrlOf(doc),
      fileId: fileIdOf(doc),
      source_path: sourcePathOf(doc),
      sourcePath: sourcePathOf(doc),
      authority_type: authorityTypeOf(doc),
      authorityType: authorityTypeOf(doc),
      authority_level: authorityLevelOf(doc),
      authorityLevel: authorityLevelOf(doc),
      issuance_number: inferIssuanceNumber(doc) || null,
      issuanceNumber: inferIssuanceNumber(doc) || null
    })),
    authority_used: inferAuthorityUsed(resolvedLegalBasisDocs, finalVisibleSources),
    confidence_level: inferConfidenceLevel({
      legalBasisDocs: resolvedLegalBasisDocs,
      hierarchyConflict,
      supersessionResult
    }),
    supersession_audit: supersessionResult?.auditTrail || []
  };
}

export default {
  filterVisibleSources,
  runSupersessionPreflight,
  buildFinalRoutePayload,
  sourceTitleOf,
  sourceDriveUrlOf,
  sourcePathOf,
  authorityTypeOf,
  authorityLevelOf,
  inferIssuanceNumber,
  buildLegalBasisEntry,
  buildSourcesEntry,
  uniqueDocs
};
