// FILE: source-visibility-engine.js
"use strict";

/**
 * TINA Source Visibility Engine
 * Version: 3.0.0
 *
 * Patch:
 * - Uses issueClassificationMatch and targetAuthorityMatch from reranker.
 * - Prioritizes exact issue-matched and target-authority-matched sources.
 * - Prevents final citations from showing weak or issue-mismatched authorities first.
 */

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

export const ENGINE_VERSION = "3.0.0";
export const MAX_VISIBLE_SOURCES = 5;

const HIDDEN_SOURCE_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers"
];

const CONTROLLING_AUTHORITY_PRIORITY = {
  CONSTITUTION: 1,
  STATUTE: 2,
  SUPREME_COURT: 3,
  RR: 4,
  TREATY: 5,
  RMC: 6,
  RMO: 7,
  RAMO: 8,
  BIR_RULING: 9,
  CTA_EN_BANC: 10,
  COURT_OF_APPEALS: 11,
  CTA_DIVISION: 12,
  LGU: 13,
  PFRS: 14,
  PAS: 15,
  PSA: 16,
  SECONDARY: 98,
  UNKNOWN: 99
};

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
    .replace(/\brevenue regulation[s]?\b/g, "rr")
    .replace(/\brevenue memorandum circular[s]?\b/g, "rmc")
    .replace(/\brevenue memorandum order[s]?\b/g, "rmo")
    .replace(/\brevenue audit memorandum order[s]?\b/g, "ramo")
    .replace(/[^\w\s/%₱.,()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

export function dedupe(values = []) {
  return [...new Set((values || []).filter(Boolean))];
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

function sourceSearchBlob(doc = {}) {
  return compactSpaces(
    [
      sourcePathOf(doc),
      sourceRawTitleOf(doc),
      doc.title,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.normalizedReference,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.doctrineApplicability,
      doc.doctrineApplicabilityExplanation
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function sourceTitleOf(doc = {}) {
  const explicit = sourceRawTitleOf(doc);

  if (explicit) {
    return compactSpaces(stripFileExtension(stripFolderPrefixes(explicit)) || explicit);
  }

  return "Untitled Source";
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

export function sourceDriveUrlOf(doc = {}) {
  const fileId = fileIdOf(doc);

  return (
    doc.driveViewUrl ||
    doc.drive_view_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null)
  );
}

export function sourceDownloadUrlOf(doc = {}) {
  const fileId = fileIdOf(doc);

  return (
    doc.driveDownloadUrl ||
    doc.drive_download_url ||
    doc.metadata?.driveDownloadUrl ||
    doc.metadata?.drive_download_url ||
    (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null)
  );
}

function hasSupremeCourtSignal(text = "") {
  return /\bg\.?\s*r\.?\s*no\.?/i.test(text) || /supreme court/i.test(text);
}

function hasCtaSignal(text = "") {
  return /\bcta\b/i.test(text);
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
  ) {
    return "STATUTE";
  }

  if (path.includes("02_revenue_regulations") || /\brr\b/i.test(title)) return "RR";
  if (path.includes("03_rmc") || /\brmc\b/i.test(title)) return "RMC";
  if (path.includes("04b_ramo") || /\bramo\b/i.test(title)) return "RAMO";
  if (path.includes("04_rmo") || /\brmo\b/i.test(title)) return "RMO";
  if (path.includes("05_bir_rulings") || title.includes("bir ruling")) return "BIR_RULING";
  if (path.includes("05b_tax_treaties") || title.includes("tax treaty")) return "TREATY";

  if (title.includes("supreme court") || hasSupremeCourtSignal(blob)) return "SUPREME_COURT";
  if (title.includes("cta en banc") || /\bcta eb\b/i.test(blob)) return "CTA_EN_BANC";
  if (title.includes("court of appeals") || /\bca-g\.?r\.?\b/i.test(blob)) return "COURT_OF_APPEALS";
  if (title.includes("cta") || hasCtaSignal(blob)) return "CTA_DIVISION";

  if (title.includes("pfrs")) return "PFRS";
  if (title.includes("pas")) return "PAS";
  if (title.includes("psa")) return "PSA";

  if (title.includes("ordinance") || title.includes("local tax code")) return "LGU";

  return "SECONDARY";
}

export function authorityLevelOf(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  return CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)] || 99;
}

export function controllingPrecedenceOf(doc = {}) {
  const explicit =
    doc.controllingPrecedence ??
    doc.controlling_precedence ??
    doc.metadata?.controllingPrecedence ??
    null;

  if (Number.isFinite(Number(explicit))) return Number(explicit);

  return CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)] || 99;
}

export function shouldHideSource(doc = {}) {
  const haystack = normalizeLooseText([sourcePathOf(doc), sourceTitleOf(doc)].join(" "));
  return HIDDEN_SOURCE_PATTERNS.some((pattern) => haystack.includes(pattern));
}

export function isWeakAuthority(doc = {}) {
  return ["SECONDARY", "UNKNOWN"].includes(authorityTypeOf(doc));
}

export function isControllingAuthority(doc = {}) {
  return controllingPrecedenceOf(doc) <= 9;
}

export function isAdministrativeAuthority(doc = {}) {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityTypeOf(doc));
}

export function isCourtAuthority(doc = {}) {
  return [
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(authorityTypeOf(doc));
}

export function isStatutoryAuthority(doc = {}) {
  return ["CONSTITUTION", "STATUTE"].includes(authorityTypeOf(doc));
}

function extractIssueSignals(text = "") {
  const value = normalizeLooseText(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tax credit certificate|unutilized input vat)\b/i.test(value), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|value added tax)\b/i.test(value), "VAT_LIABILITY");
  push(/\b(withholding tax|expanded withholding tax|withholding|ewt|final withholding tax|fwt|cwt)\b/i.test(value), "WITHHOLDING");
  push(/\b(nolco|mcit|rcit|income tax|taxable income|gross income)\b/i.test(value), "INCOME_TAX");
  push(/\b(substantiation|invoice|receipt|supporting document|evidence|proof|burden of proof)\b/i.test(value), "EVIDENTIARY");
  push(/\b(jurisdiction|120\+30|prescriptive|appeal|assessment|fan|pan|loa|protest|deadline)\b/i.test(value), "PROCEDURAL");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(value), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|economic substance|substance over form)\b/i.test(value), "TRANSACTION");
  push(/\b(audit|afs|pfrs|pas|misstatement|working paper)\b/i.test(value), "AUDIT");

  return dedupe(issues);
}

function issueOverlap(a = [], b = []) {
  return a.some((item) => b.includes(item));
}

function issueMismatch(a = [], b = []) {
  return (
    (a.includes("VAT_LIABILITY") && b.includes("VAT_REFUND") && !a.includes("VAT_REFUND")) ||
    (a.includes("VAT_REFUND") && b.includes("VAT_LIABILITY") && !a.includes("VAT_LIABILITY")) ||
    (a.includes("WITHHOLDING") && (b.includes("VAT_REFUND") || b.includes("VAT_LIABILITY")))
  );
}

function docIssueSignals(doc = {}) {
  return extractIssueSignals(sourceSearchBlob(doc));
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT"
  };

  return aliases[raw] || raw || null;
}

function normalizeIssueClassification(issueClassification = null, query = "") {
  const source = issueClassification || {};

  const queryIssues = extractIssueSignals(query).map(normalizeIssue);

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    queryIssues[0] ||
    null;

  const subIssues = dedupe([
    primaryIssue,
    ...((Array.isArray(source.subIssues) ? source.subIssues : []).map(normalizeIssue)),
    ...((Array.isArray(source.subIssue) ? source.subIssue : []).map(normalizeIssue)),
    ...queryIssues
  ]).filter(Boolean);

  const targetAuthorities = dedupe([
    ...((Array.isArray(source.targetAuthorities) ? source.targetAuthorities : [])),
    ...((Array.isArray(source.target_authorities) ? source.target_authorities : []))
  ]).filter(Boolean);

  return {
    primaryIssue,
    subIssues,
    targetAuthorities,
    raw: source
  };
}

function docIssueClassificationMatched(doc = {}) {
  if (doc.issueMismatch === true) return false;

  const match = doc.issueClassificationMatch;

  if (!match || typeof match !== "object") return null;

  if (match.issueMismatch === true) return false;
  if (match.targetAuthorityMatch === true) return true;
  if (match.issueOverlap === true) return true;
  if (match.matched === true) return true;

  return null;
}

function docTargetAuthorityMatched(doc = {}, issueClassification = null) {
  if (doc.targetAuthorityMatch === true) return true;
  if (doc.issueClassificationMatch?.targetAuthorityMatch === true) return true;

  const profile = normalizeIssueClassification(issueClassification);
  if (!profile.targetAuthorities.length) return false;

  return profile.targetAuthorities.includes(authorityTypeOf(doc));
}

function buildIssueMatchedVisiblePool(docs = [], query = "", issueClassification = null) {
  const unique = uniqueDocs(docs);
  const profile = normalizeIssueClassification(issueClassification, query);

  if (!query && !profile.primaryIssue) return unique;

  return unique.filter((doc) => {
    if (doc.issueMismatch === true) return false;
    if (doc.issueClassificationMatch?.issueMismatch === true) return false;

    const explicitMatch = docIssueClassificationMatched(doc);
    if (explicitMatch === true) return true;
    if (explicitMatch === false) return false;

    const querySignals = profile.subIssues.length ? profile.subIssues : extractIssueSignals(query).map(normalizeIssue);
    if (!querySignals.length) return true;

    const docSignals = docIssueSignals(doc).map(normalizeIssue);
    if (!docSignals.length) return true;

    if (issueMismatch(querySignals, docSignals)) return false;

    return issueOverlap(querySignals, docSignals);
  });
}

export function formatDocType(doc = {}) {
  const type = authorityTypeOf(doc);

  const labels = {
    CONSTITUTION: "Constitution",
    STATUTE: "Statute",
    SUPREME_COURT: "Supreme Court",
    RR: "RR",
    TREATY: "Treaty",
    RMC: "RMC",
    RMO: "RMO",
    RAMO: "RAMO",
    BIR_RULING: "BIR Ruling",
    CTA_EN_BANC: "CTA En Banc",
    COURT_OF_APPEALS: "Court of Appeals",
    CTA_DIVISION: "CTA Division",
    LGU: "LGU",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",
    SECONDARY: "Secondary Source",
    UNKNOWN: "Unknown Source"
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
    fileIdOf(doc) ||
    doc.id ||
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    sourcePathOf(doc) ||
    sourceTitleOf(doc) ||
    JSON.stringify({
      title: sourceTitleOf(doc),
      path: sourcePathOf(doc),
      authorityType: authorityTypeOf(doc),
      issuanceNumber: inferIssuanceNumber(doc)
    })
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

function toVisibleSourceEntry(doc = {}, issueClassification = null) {
  return {
    ...doc,
    title: sourceTitleOf(doc),
    driveViewUrl: sourceDriveUrlOf(doc),
    driveDownloadUrl: sourceDownloadUrlOf(doc),
    fileId: fileIdOf(doc),
    sourcePath: sourcePathOf(doc),
    authorityType: authorityTypeOf(doc),
    authorityLevel: authorityLevelOf(doc),
    controllingPrecedence: controllingPrecedenceOf(doc),
    issuanceNumber: inferIssuanceNumber(doc),
    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: docTargetAuthorityMatched(doc, issueClassification),
    isControllingAuthority: isControllingAuthority(doc),
    isAdministrativeAuthority: isAdministrativeAuthority(doc),
    isCourtAuthority: isCourtAuthority(doc),
    isStatutoryAuthority: isStatutoryAuthority(doc),
    isWeakAuthority: isWeakAuthority(doc)
  };
}

function sourceScore(doc = {}, issueClassification = null) {
  const base =
    Number(
      doc.rerankScore ||
        doc.retrievalScore ||
        doc.finalScore ||
        doc.final_score ||
        doc.score ||
        doc.similarity ||
        0
    ) || 0;

  const precedence = controllingPrecedenceOf(doc);
  const controlBonus = isControllingAuthority(doc) ? 35 : 0;
  const targetBonus = docTargetAuthorityMatched(doc, issueClassification) ? 60 : 0;
  const issueMatch = docIssueClassificationMatched(doc);
  const issueBonus = issueMatch === true ? 55 : issueMatch === false ? -120 : 0;
  const weakPenalty = isWeakAuthority(doc) ? -70 : 0;
  const exactBonus = inferIssuanceNumber(doc) ? 20 : 0;
  const mismatchPenalty =
    doc.issueMismatch === true || doc.issueClassificationMatch?.issueMismatch === true ? -150 : 0;

  return (
    base +
    controlBonus +
    targetBonus +
    issueBonus +
    exactBonus +
    weakPenalty +
    mismatchPenalty -
    precedence
  );
}

function prioritizeVisibleSources(docs = [], issueClassification = null) {
  return [...docs].sort((a, b) => {
    const targetDiff =
      Number(docTargetAuthorityMatched(b, issueClassification)) -
      Number(docTargetAuthorityMatched(a, issueClassification));
    if (targetDiff !== 0) return targetDiff;

    const aIssue = docIssueClassificationMatched(a);
    const bIssue = docIssueClassificationMatched(b);

    if (aIssue !== bIssue) {
      return Number(bIssue === true) - Number(aIssue === true);
    }

    const precedenceDiff = controllingPrecedenceOf(a) - controllingPrecedenceOf(b);
    if (precedenceDiff !== 0) return precedenceDiff;

    const scoreDiff = sourceScore(b, issueClassification) - sourceScore(a, issueClassification);
    if (scoreDiff !== 0) return scoreDiff;

    const aNumber = inferIssuanceNumber(a);
    const bNumber = inferIssuanceNumber(b);

    if (aNumber && bNumber) return aNumber.localeCompare(bNumber);

    return sourceTitleOf(a).localeCompare(sourceTitleOf(b));
  });
}

export function filterVisibleSources(
  docs = [],
  {
    maxItems = MAX_VISIBLE_SOURCES,
    supersessionResult = null,
    query = "",
    issueClassification = null
  } = {}
) {
  const visible = [];
  const issueMatchedDocs = buildIssueMatchedVisiblePool(
    uniqueDocs(docs),
    query,
    issueClassification
  );

  for (const doc of issueMatchedDocs) {
    if (shouldHideSource(doc)) continue;

    const replacement = findReplacementForDocument(doc, supersessionResult);
    const sourceToUse = replacement || doc;

    if (shouldHideSource(sourceToUse)) continue;
    if (sourceToUse.issueMismatch === true) continue;
    if (sourceToUse.issueClassificationMatch?.issueMismatch === true) continue;

    visible.push(toVisibleSourceEntry(sourceToUse, issueClassification));
  }

  return uniqueDocs(prioritizeVisibleSources(visible, issueClassification)).slice(0, maxItems);
}

export function runSupersessionPreflight({
  legalBasisDocs = [],
  sourcesUsed = [],
  asOfDate = new Date(),
  query = "",
  issueClassification = null
}) {
  const combinedDocs = uniqueDocs([...legalBasisDocs, ...sourcesUsed]);
  const supersessionResult = applySupersessionFilter(combinedDocs, asOfDate);

  const resolvedLegalBasisDocs = uniqueDocs(
    legalBasisDocs.map((doc) => findReplacementForDocument(doc, supersessionResult) || doc)
  );

  const visiblePool = sourcesUsed.length > 0 ? sourcesUsed : resolvedLegalBasisDocs;

  const resolvedSourcesUsed = filterVisibleSources(visiblePool, {
    maxItems: MAX_VISIBLE_SOURCES,
    supersessionResult,
    query,
    issueClassification
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
      .slice(0, 8)
  );
}

function inferConfidenceLevel({
  legalBasisDocs = [],
  hierarchyConflict = null,
  supersessionResult = null,
  query = "",
  issueClassification = null
}) {
  if (!legalBasisDocs.length) return "LOW";

  const issueMatchedDocs = buildIssueMatchedVisiblePool(
    legalBasisDocs,
    query,
    issueClassification
  );

  if (!issueMatchedDocs.length) return "LOW";

  const bestPrecedence = Math.min(...issueMatchedDocs.map((doc) => controllingPrecedenceOf(doc)));
  const hasStatute = issueMatchedDocs.some((doc) => isStatutoryAuthority(doc));
  const hasSupremeCourt = issueMatchedDocs.some((doc) => authorityTypeOf(doc) === "SUPREME_COURT");
  const hasTargetAuthority = issueMatchedDocs.some((doc) =>
    docTargetAuthorityMatched(doc, issueClassification)
  );

  if (hierarchyConflict?.conflict) return bestPrecedence <= 9 ? "MEDIUM" : "LOW";
  if (supersessionResult?.superseded?.length) return bestPrecedence <= 9 ? "MEDIUM" : "LOW";
  if (hasStatute && hasSupremeCourt && hasTargetAuthority) return "HIGH";
  if (bestPrecedence <= 3 && hasTargetAuthority) return "HIGH";
  if (bestPrecedence <= 6) return "MEDIUM";
  if (bestPrecedence <= 12) return "LIMITED";

  return "LOW";
}

export function buildFinalRoutePayload({
  answer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  hierarchyConflict = null,
  asOfDate = new Date(),
  query = "",
  issueClassification = null
}) {
  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate,
    query,
    issueClassification
  });

  const finalVisibleSources =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult,
          query,
          issueClassification
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
      controlling_precedence: controllingPrecedenceOf(doc),
      controllingPrecedence: controllingPrecedenceOf(doc),
      issuance_number: inferIssuanceNumber(doc) || null,
      issuanceNumber: inferIssuanceNumber(doc) || null,
      issueClassificationMatch: doc.issueClassificationMatch || null,
      targetAuthorityMatch: docTargetAuthorityMatched(doc, issueClassification),
      is_controlling_authority: isControllingAuthority(doc),
      isControllingAuthority: isControllingAuthority(doc),
      is_weak_authority: isWeakAuthority(doc),
      isWeakAuthority: isWeakAuthority(doc)
    })),
    authority_used: inferAuthorityUsed(resolvedLegalBasisDocs, finalVisibleSources),
    confidence_level: inferConfidenceLevel({
      legalBasisDocs: resolvedLegalBasisDocs,
      hierarchyConflict,
      supersessionResult,
      query,
      issueClassification
    }),
    supersession_audit: supersessionResult?.auditTrail || [],
    source_visibility_metadata: {
      engineVersion: ENGINE_VERSION,
      issueClassificationAware: true,
      targetAuthorityAware: true,
      issueClassification: issueClassification || null
    }
  };
}

export function sourceVisibilityHealthCheck() {
  return {
    ok: true,
    engine: "TINA_SOURCE_VISIBILITY_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    supersessionCompatible: true,
    sourceFilteringCompatible: true,
    issueMismatchGuardCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityMatchAware: true
  };
}

export default {
  ENGINE_VERSION,
  filterVisibleSources,
  runSupersessionPreflight,
  buildFinalRoutePayload,
  sourceTitleOf,
  sourceDriveUrlOf,
  sourceDownloadUrlOf,
  sourcePathOf,
  authorityTypeOf,
  authorityLevelOf,
  controllingPrecedenceOf,
  inferIssuanceNumber,
  buildLegalBasisEntry,
  buildSourcesEntry,
  uniqueDocs,
  normalizeText,
  normalizeLooseText,
  compactSpaces,
  dedupe,
  shouldHideSource,
  isWeakAuthority,
  isControllingAuthority,
  isAdministrativeAuthority,
  isCourtAuthority,
  isStatutoryAuthority,
  sourceVisibilityHealthCheck
};
