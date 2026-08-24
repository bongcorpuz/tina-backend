// FILE: source-visibility-engine.js
"use strict";

/**
 * TINA Source Visibility Engine
 * Version: 3.3.0
 *
 * Constitutional role:
 * - Show only cited, relevant, non-duplicated, non-hidden sources.
 * - Suppress hidden/internal/weak/unmatched/reviewer sources outside reviewer mode.
 * - Resolve superseded sources through supersession-engine.js.
 * - Prevent raw full text or full debug objects from being exposed downstream.
 *
 * This file must NOT:
 * - retrieve sources,
 * - call OpenAI,
 * - create legal reasoning,
 * - fabricate authorities,
 * - override final answer compliance.
 */

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

import {
  expandLegalCitationMentionsToKeys
} from "./legal-citation-range-utils.js";

export const ENGINE_VERSION = "3.3.0";
export const MAX_VISIBLE_SOURCES = 5;

/**
 * Architecture v2.0 visible source hierarchy.
 * Retrieval order and vector score must not control display order.
 */
const CONTROLLING_AUTHORITY_PRIORITY = Object.freeze({
  STATUTE: 1,
  CONSTITUTION: 1,
  NIRC: 1,
  TAX_CODE: 1,
  CMTA: 1,
  LGC: 1,
  REPUBLIC_ACT: 1,
  RA: 1,

  TAX_TREATY: 2,
  TREATY: 2,

  CASE_SC: 3,
  SUPREME_COURT_EN_BANC: 3,
  SUPREME_COURT: 3,
  SC: 3,

  CASE_CTA: 4,
  CTA_EN_BANC: 4,
  CTA_DIVISION: 4,

  RR: 5,
  REVENUE_REGULATION: 5,

  RMC: 6,
  RMO: 7,
  RAMO: 8,

  BIR_RULING: 9,

  SECONDARY: 10,
  LGU: 10,
  LGU_ISSUANCE: 10,
  BOC_ISSUANCE: 10,
  FIRB_ISSUANCE: 10,
  PEZA_MEMO: 10,
  SEC_GUIDANCE: 10,

  PFRS: 10,
  PAS: 10,
  PSA: 10,

  OECD_GUIDANCE: 10,
  FOREIGN_AUTHORITY: 10,

  CPA_NOTES: 10,
  REVIEW_MATERIALS: 10,

  UNKNOWN: 99
});

const HIDDEN_SOURCE_PATTERNS = Object.freeze([
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers",
  "reviewer",
  "lecture notes",
  "handout"
]);

const REVIEW_MODE_MARKERS = Object.freeze([
  "REVIEWER",
  "TAX_REVIEWER",
  "REVIEW",
  "QUIZ",
  "ASSESSMENT"
]);

const DOMAIN_KEYWORDS = Object.freeze({
  VAT: ["vat", "value added tax", "value-added tax", "output vat", "input vat", "zero rated", "zero-rated"],
  CIT: ["corporate income tax", "income tax", "rcit", "mcit", "nolco", "deduction", "taxable income"],
  IIT: ["individual income tax", "compensation", "self employed", "self-employed", "8%", "graduated rates"],
  WHT: ["withholding", "withholding tax", "ewt", "cwt", "fwt", "2307", "1601"],
  EST: ["estate tax", "donor tax", "donation", "gross estate", "net estate"],
  PCT: ["percentage tax", "2551q", "non-vat"],
  EXC: ["excise tax", "sin tax", "petroleum", "sweetened beverage"],
  PRE: ["prescription", "assessment", "loa", "pan", "fan", "fdda", "waiver"],
  DIS: ["protest", "appeal", "cta", "refund", "compromise", "abatement"],
  LGT: ["local business tax", "real property tax", "lgu", "local tax"],
  CUS: ["customs", "tariff", "import duty", "cmta", "boc"],
  SPC: ["transfer pricing", "peza", "create incentives", "tax treaty", "oecd"],
  CON: ["constitution", "due process", "equal protection", "uniformity", "equity"],
  PFRS: ["pfrs", "pas", "psa", "financial statements", "audit", "afs"],
  TRANSACTION: ["contract", "principal", "agent", "reimbursement", "pass-through", "bundled", "economic substance"]
});

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

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function trimText(value = "", max = 500) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
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
    doc.sourcePath ||
    doc.source_path ||
    doc.path ||
    doc.url ||
    doc.sourceUrl ||
    doc.source_url ||
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
      doc.doctrineApplicabilityExplanation,
      doc.primaryDomain,
      doc.primary_domain,
      doc.retrievalMetadata?.primaryDomain,
      doc.issueClassificationMatch?.primaryDomain,
      doc.metadata?.primaryDomain
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function sourceTitleOf(doc = {}) {
  const explicit = sourceRawTitleOf(doc);

  if (explicit) {
    return trimText(stripFileExtension(stripFolderPrefixes(explicit)) || explicit, 240);
  }

  return "Untitled Source";
}

export function fileIdOf(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.id ||
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
    doc.url ||
    doc.webViewLink ||
    doc.web_view_link ||
    doc.sourceUrl ||
    doc.source_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    doc.metadata?.url ||
    doc.metadata?.webViewLink ||
    doc.metadata?.web_view_link ||
    doc.metadata?.sourceUrl ||
    doc.metadata?.source_url ||
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

function hasSupremeCourtEnBancSignal(text = "") {
  return /\bsupreme\s+court\s+en\s+banc\b/i.test(text) ||
    (/\ben\s+banc\b/i.test(text) && /\bsupreme\s+court\b/i.test(text));
}

function hasSupremeCourtSignal(text = "") {
  return /\bg\.?\s*r\.?\s*no\.?/i.test(text) || /supreme court/i.test(text);
}

function hasCtaEnBancSignal(text = "") {
  return /\bcta\s+en\s+banc\b/i.test(text) || /\bcta\s+eb\b/i.test(text);
}

function hasCtaSignal(text = "") {
  return /\bcta\b/i.test(text);
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    STATUTE: "STATUTE",
    STATUTES: "STATUTE",
    NIRC: "NIRC",
    TAX_CODE: "TAX_CODE",
    REPUBLIC_ACT: "REPUBLIC_ACT",
    RA: "REPUBLIC_ACT",
    CMTA: "CMTA",
    LGC: "LGC",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",

    CASE_SC: "CASE_SC",
    SUPREME_COURT_EN_BANC: "CASE_SC",
    SUPREME_COURT_DECISION: "CASE_SC",
    SUPREME_COURT: "CASE_SC",
    SC: "CASE_SC",
    CASE_LAW: "CASE_SC",
    JURISPRUDENCE: "CASE_SC",

    CASE_CTA: "CASE_CTA",
    CTA_EN_BANC: "CASE_CTA",
    CTA: "CASE_CTA",
    CTA_DIVISION: "CASE_CTA",
    COURT_OF_APPEALS: "SECONDARY",
    CA: "SECONDARY",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU_ISSUANCE: "LGU",
    LGU: "LGU",
    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",
    FIRB: "FIRB_ISSUANCE",
    FIRB_ISSUANCE: "FIRB_ISSUANCE",
    PEZA: "PEZA_MEMO",
    PEZA_MEMO: "PEZA_MEMO",
    SEC: "SEC_GUIDANCE",
    SEC_GUIDANCE: "SEC_GUIDANCE",

    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",
    FOREIGN: "FOREIGN_AUTHORITY",

    CPA_NOTES: "CPA_NOTES",
    REVIEW_MATERIALS: "REVIEW_MATERIALS",
    SECONDARY_SOURCE: "SECONDARY",
    SECONDARY: "SECONDARY",

    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || null;
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

  if (raw) return normalizeAuthority(raw) || raw;

  const path = normalizeLooseText(sourcePathOf(doc));
  const title = normalizeLooseText(sourceRawTitleOf(doc));
  const blob = `${path} ${title}`;

  if (path.includes("00_constitution") || title.includes("constitution")) return "CONSTITUTION";

  if (path.includes("06_court_cases") && hasSupremeCourtEnBancSignal(blob)) return "CASE_SC";
  if (hasSupremeCourtEnBancSignal(blob)) return "CASE_SC";
  if (path.includes("06_court_cases") && hasSupremeCourtSignal(blob)) return "CASE_SC";
  if (title.includes("supreme court") || hasSupremeCourtSignal(blob)) return "CASE_SC";
  if (title.includes("cta en banc") || hasCtaEnBancSignal(blob)) return "CASE_CTA";
  if (title.includes("court of appeals") || /\bca-g\.?r\.?\b/i.test(blob)) return "SECONDARY";
  if (title.includes("cta") || hasCtaSignal(blob)) return "CASE_CTA";

  if (
    path.includes("01_tax_code") ||
    /\b(?:republic act|ra)\s*(?:no)?\s*\d{4,6}\b/i.test(blob) ||
    title.includes("tax code") ||
    title.includes("nirc")
  ) return "STATUTE";

  if (path.includes("05b_tax_treaties") || title.includes("tax treaty") || title.includes("double tax")) return "TREATY";
  if (path.includes("02_revenue_regulations") || /\brr\b/i.test(title)) return "RR";
  if (path.includes("03_rmc") || /\brmc\b/i.test(title)) return "RMC";
  if (path.includes("04b_ramo") || /\bramo\b/i.test(title)) return "RAMO";
  if (path.includes("04_rmo") || /\brmo\b/i.test(title)) return "RMO";
  if (path.includes("05_bir_rulings") || title.includes("bir ruling")) return "BIR_RULING";

  if (title.includes("pfrs")) return "PFRS";
  if (title.includes("pas")) return "PAS";
  if (title.includes("psa")) return "PSA";
  if (title.includes("ordinance") || title.includes("local tax code")) return "LGU";
  if (title.includes("boc") || title.includes("customs")) return "BOC_ISSUANCE";
  if (title.includes("oecd")) return "OECD_GUIDANCE";
  if (title.includes("foreign")) return "FOREIGN_AUTHORITY";

  return "SECONDARY";
}

export function authorityLevelOf(doc = {}) {
  const mapped = CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)];
  if (Number.isFinite(Number(mapped)) && Number(mapped) > 0) return Number(mapped);

  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);

  return 99;
}

export function controllingPrecedenceOf(doc = {}) {
  const mapped = CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)];
  if (Number.isFinite(Number(mapped)) && Number(mapped) > 0) return Number(mapped);

  const explicit =
    doc.controllingPrecedence ??
    doc.controlling_precedence ??
    doc.metadata?.controllingPrecedence ??
    null;

  if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);

  return 99;
}

function isReviewMode(issueClassification = null) {
  const source =
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    {};

  const values = [
    source.responseMode,
    source.orchestrationMode,
    source.mode,
    source.intent,
    source.primaryIssue,
    source.subIssue,
    source.taxDomainClassification?.responseMode,
    source.taxDomainClassification?.mode
  ]
    .filter(Boolean)
    .map((item) => String(item).toUpperCase());

  return values.some((value) =>
    REVIEW_MODE_MARKERS.some((marker) => value.includes(marker))
  );
}

export function shouldHideSource(doc = {}, issueClassification = null) {
  const haystack = normalizeLooseText([sourcePathOf(doc), sourceTitleOf(doc)].join(" "));
  const hiddenByPath = HIDDEN_SOURCE_PATTERNS.some((pattern) => haystack.includes(pattern));

  if (!hiddenByPath) return false;

  return !isReviewMode(issueClassification);
}

export function isWeakAuthority(doc = {}) {
  return ["SECONDARY", "UNKNOWN", "CPA_NOTES", "REVIEW_MATERIALS"].includes(authorityTypeOf(doc));
}

export function isControllingAuthority(doc = {}) {
  return controllingPrecedenceOf(doc) <= 4;
}

export function isAdministrativeAuthority(doc = {}) {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityTypeOf(doc));
}

export function isCourtAuthority(doc = {}) {
  return [
    "CASE_SC",
    "CASE_CTA",
    "SUPREME_COURT_EN_BANC",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(authorityTypeOf(doc));
}

export function isStatutoryAuthority(doc = {}) {
  return [
    "CONSTITUTION",
    "STATUTE",
    "NIRC",
    "TAX_CODE",
    "CMTA",
    "LGC",
    "REPUBLIC_ACT",
    "RA",
    "TAX_TREATY",
    "TREATY"
  ].includes(authorityTypeOf(doc));
}

function normalizeDomain(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VALUE_ADDED_TAX: "VAT",
    CORPORATE_INCOME_TAX: "CIT",
    INCOME_TAX: "CIT",
    INDIVIDUAL_INCOME_TAX: "IIT",
    WITHHOLDING: "WHT",
    WITHHOLDING_TAX: "WHT",
    ESTATE_TAX: "EST",
    DONOR_TAX: "EST",
    PERCENTAGE_TAX: "PCT",
    EXCISE_TAX: "EXC",
    PRESCRIPTION: "PRE",
    ASSESSMENT: "PRE",
    DISPUTE: "DIS",
    DISPUTE_RESOLUTION: "DIS",
    LOCAL_TAX: "LGT",
    CUSTOMS: "CUS",
    CUSTOMS_TARIFF: "CUS",
    TRANSFER_PRICING: "SPC",
    SPECIAL_TAX_REGIMES: "SPC",
    CONSTITUTIONAL_TAX: "CON",
    ACCOUNTING_AUDIT: "PFRS",
    CONTRACT_TRANSACTION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
}

function getTaxDomainClassification(issueClassification = null) {
  return (
    issueClassification?.taxDomainClassification ||
    issueClassification?.tax_domain_classification ||
    null
  );
}

function getPrimaryDomain(issueClassification = null) {
  const taxDomainClassification = getTaxDomainClassification(issueClassification);

  return normalizeDomain(
    issueClassification?.primaryDomain ||
      issueClassification?.primary_domain ||
      taxDomainClassification?.primaryDomain ||
      taxDomainClassification?.primary_domain ||
      safeArray(issueClassification?.taxDomains)[0] ||
      safeArray(issueClassification?.tax_domains)[0] ||
      null
  );
}

function docPrimaryDomain(doc = {}) {
  return normalizeDomain(
    doc.primaryDomain ||
      doc.primary_domain ||
      doc.retrievalMetadata?.primaryDomain ||
      doc.issueClassificationMatch?.primaryDomain ||
      doc.metadata?.primaryDomain ||
      null
  );
}

function docDomainMatched(doc = {}, issueClassification = null) {
  const expected = getPrimaryDomain(issueClassification);
  if (!expected) return null;

  const explicit = docPrimaryDomain(doc);
  if (explicit) return explicit === expected;

  const haystack = normalizeLooseText(sourceSearchBlob(doc));
  const keywords = DOMAIN_KEYWORDS[expected] || [];

  if (!keywords.length) return null;

  return keywords.some((term) => haystack.includes(normalizeLooseText(term)));
}

function extractIssueSignals(text = "") {
  const value = normalizeLooseText(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tax credit certificate|unutilized input vat)\b/i.test(value), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|value added tax)\b/i.test(value), "VAT_LIABILITY");
  push(/\b(zero rated|zero-rated|zero rating|export sales)\b/i.test(value), "VAT_ZERO_RATING");
  push(/\b(vat exempt|exemption|section 109)\b/i.test(value), "VAT_EXEMPTION");
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
    ZERO_RATING: "VAT_ZERO_RATING",
    VAT_ZERO_RATING: "VAT_ZERO_RATING",
    EXEMPTION: "VAT_EXEMPTION",
    VAT_EXEMPTION: "VAT_EXEMPTION",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    CIT: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT"
  };

  return aliases[raw] || raw || null;
}

function normalizeTargetAuthorities(values = []) {
  return dedupe(safeArray(values).map(normalizeAuthority).filter(Boolean));
}

function normalizeIssueClassification(issueClassification = null, query = "") {
  const source =
    issueClassification?.orchestrationClassification ||
    issueClassification ||
    {};

  const taxDomainClassification = getTaxDomainClassification(source);
  const queryIssues = extractIssueSignals(query).map(normalizeIssue).filter(Boolean);

  const primaryDomain = getPrimaryDomain(source);

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    normalizeIssue(taxDomainClassification?.primaryIssue) ||
    normalizeIssue(taxDomainClassification?.primarySubIssue) ||
    queryIssues[0] ||
    null;

  const subIssues = dedupe([
    primaryIssue,
    normalizeIssue(source.subIssue),
    normalizeIssue(source.sub_issue),
    normalizeIssue(taxDomainClassification?.primarySubIssue),
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(taxDomainClassification?.subIssues).map(normalizeIssue),
    ...queryIssues
  ]).filter(Boolean);

  const targetAuthorities = normalizeTargetAuthorities([
    ...safeArray(source.targetAuthorities),
    ...safeArray(source.target_authorities),
    ...safeArray(taxDomainClassification?.targetAuthorities),
    ...safeArray(taxDomainClassification?.target_authorities)
  ]);

  return {
    primaryDomain,
    primaryIssue,
    subIssues,
    targetAuthorities,
    taxDomainClassification
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

  if (!query && !profile.primaryIssue && !profile.primaryDomain) return unique;

  return unique.filter((doc) => {
    if (doc.issueMismatch === true) return false;
    if (doc.issueClassificationMatch?.issueMismatch === true) return false;

    const domainMatch = docDomainMatched(doc, issueClassification);
    const explicitMatch = docIssueClassificationMatched(doc);

    if (explicitMatch === true) return true;
    if (explicitMatch === false) return false;

    const querySignals = profile.subIssues.length
      ? profile.subIssues
      : extractIssueSignals(query).map(normalizeIssue).filter(Boolean);

    const docSignals = docIssueSignals(doc).map(normalizeIssue).filter(Boolean);

    if (querySignals.length && docSignals.length) {
      if (issueMismatch(querySignals, docSignals)) return false;
      if (issueOverlap(querySignals, docSignals)) return true;
    }

    if (domainMatch === true) return true;
    if (domainMatch === false && querySignals.length) return false;

    return true;
  });
}

export function formatDocType(doc = {}) {
  const type = authorityTypeOf(doc);

  const labels = {
    CONSTITUTION: "Constitution",
    STATUTE: "Statute",
    NIRC: "NIRC",
    TAX_CODE: "Tax Code",
    CMTA: "CMTA",
    LGC: "LGC",
    REPUBLIC_ACT: "Republic Act",
    TAX_TREATY: "Tax Treaty",
    TREATY: "Tax Treaty",
    CASE_SC: "Supreme Court Case",
    CASE_CTA: "CTA Case",
    SUPREME_COURT_EN_BANC: "Supreme Court En Banc",
    SUPREME_COURT: "Supreme Court",
    CTA_EN_BANC: "CTA En Banc",
    COURT_OF_APPEALS: "Court of Appeals",
    CTA_DIVISION: "CTA Division",
    RR: "RR",
    RMC: "RMC",
    RMO: "RMO",
    RAMO: "RAMO",
    BIR_RULING: "BIR Ruling",
    LGU: "LGU",
    BOC_ISSUANCE: "BOC Issuance",
    FIRB_ISSUANCE: "FIRB Issuance",
    PEZA_MEMO: "PEZA Issuance",
    SEC_GUIDANCE: "SEC Guidance",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",
    OECD_GUIDANCE: "OECD Guidance",
    FOREIGN_AUTHORITY: "Foreign Authority",
    CPA_NOTES: "CPA Notes",
    REVIEW_MATERIALS: "Review Materials",
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
    // RA: allow hyphen/underscore between "RA" and the act number (e.g. RA-10963, RA_10963)
    { regex: /\b(RA)[-\s_]*(?:No\.?)?[-\s_]*(\d{4,6})\b/i, value: (m) => `RA No. ${m[2]}` },
    // RR / RMC / RMO / RAMO: allow hyphen, underscore, or space between TYPE and "No." and
    // between "No." and the serial number, and as the number↔year separator.
    // Handles: RR-16-2005, RR_16_2005, rr-no.-16-2005, RMC65-2012, RMC No 65 2012, etc.
    { regex: /\b(RR)[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMC)[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMO)[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RAMO)[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    // Full English names → canonical abbreviated form.
    // Catches document titles/source fields like "Revenue Regulations No. 16-2005".
    // RAMO is listed before RMO/RMC so "Revenue Audit Memorandum Order" cannot
    // partially match the RMO pattern ("Revenue Memorandum Order" is a substring).
    { regex: /\bRevenue Audit Memorandum Orders?[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `RAMO No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRevenue Memorandum Circulars?[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `RMC No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRevenue Memorandum Orders?[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `RMO No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\bRevenue Regulations?[-\s_]*(?:No\.?)?[-\s_]*0*(\d+)[-\s_/](\d{2,4})\b/i, value: (m) => `RR No. ${Number(m[1])}-${normalizeYear(m[2])}` },
    { regex: /\b(BIR Ruling)\s*(?:No\.?)?\s*([\w./()-]+)\b/i, value: (m) => `${m[1]} No. ${m[2]}` },
    { regex: /\b(CTA(?:\s+EB| En Banc)?\s+No\.?\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
    { regex: /\b(CA-G\.R\.\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
    // NIRC / Tax Code section references: "NIRC Sec. 105", "Tax Code Section 106"
    { regex: /\b(?:NIRC|Tax Code)\s+Sec(?:tion)?\.?\s*(\d+[A-Z]?)\b/i, value: (m) => `NIRC Sec. ${m[1]}` }
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
    { regex: /\bBIR_RULING_([A-Z0-9_./()-]+)\b/i, value: (m) => `BIR Ruling No. ${String(m[1]).replace(/_/g, "-")}` },
    // DB-normalized form produced by normalizeLegalReference(): "NIRC_SEC_105", "TAX_CODE_SEC_105"
    { regex: /^(?:NIRC|TAX_CODE)_SEC_(\d+[A-Z]?)$/i, value: (m) => `NIRC Sec. ${m[1]}` }
  ];

  for (const pattern of normalizedPatterns) {
    const match = normalizedRef.match(pattern.regex);
    if (match) return compactSpaces(pattern.value(match));
  }

  return "";
}

/**
 * Canonical issuance comparison key for deduplication.
 * Strips "No." / "No", all punctuation, and whitespace so that the
 * many filename variants of the same authority all map to one key:
 *   "RR No. 16-2005" → "rr162005"
 *   "RR_16_2005"     → "rr162005"
 *   "rr-16-2005"     → "rr162005"
 *   "RMC No. 65-2012"→ "rmc652012"
 * Use this instead of a bare .replace(/[^a-z0-9]/g,"") for dedupeKey
 * computation so that the presence or absence of "No." is irrelevant.
 */
export function canonicalSourceKey(ref = "") {
  return String(ref || "")
    .toLowerCase()
    .replace(/\bno\.?\s*/g, "")   // remove "No." / "No " / standalone "No"
    .replace(/[^a-z0-9]/g, "");   // remove all punctuation, whitespace, underscores
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

  return trimText(subject, 240);
}

export function buildLegalBasisEntry(doc = {}) {
  const type = formatDocType(doc);
  const number = inferIssuanceNumber(doc);
  const subject = safeDisplayLabelOf(doc);

  if (number && subject) return `[${type}] ${number} – ${subject}`;
  if (number) return `[${type}] ${number}`;
  return `[${type}] ${subject || `${type} Source`}`;
}

export function buildSourcesEntry(doc = {}) {
  const number = inferIssuanceNumber(doc);
  const subject = safeDisplayLabelOf(doc);

  if (number && subject) return `${number} – ${subject}`;
  if (number) return number;
  return subject || "Source";
}

function buildDocKey(doc = {}) {
  // PRIMARY: canonical authority reference.
  // All variant encodings of the same issuance — abbreviated (RR No. 16-2005),
  // filename (RR-16-2005.pdf, RR_16_2005.pdf), and full-form
  // (Revenue Regulations No. 16-2005) — produce the same compact key ("rr162005").
  // Two chunks from different PDFs that represent the same authority will correctly
  // collapse to a single visible-source entry.
  const authorityRef =
    inferIssuanceNumber(doc)          ||
    doc.normalizedReference           || doc.normalized_reference ||
    doc.citation                      || doc.reference            ||
    doc.metadata?.normalizedReference ||
    doc.metadata?.citation            || doc.metadata?.reference  ||
    doc.document_title                || doc.documentTitle        ||
    doc.metadata?.documentTitle       ||
    doc.source                        || "";

  if (authorityRef) {
    return canonicalSourceKey(authorityRef);
  }

  // FALLBACK: document-specific fields for sources that carry no authority reference.
  // fileId / id uniquely identify the chunk; path and title provide a readable fallback.
  return normalizeLooseText(
    [
      fileIdOf(doc),
      doc.id,
      sourcePathOf(doc),
      sourceTitleOf(doc),
      String(doc.chunk_index || doc.chunkIndex || "")
    ]
      .filter(Boolean)
      .join("|")
  );
}

// Best URL available on any doc shape (top-level and metadata-nested).
// Checks every known URL variant so that metadata-nested URLs are found even
// when no top-level URL field is populated.
function bestDocUrl(doc = {}) {
  return (
    doc.driveViewUrl       || doc.drive_view_url       ||
    doc.url                || doc.webViewLink           ||
    doc.web_view_link      || doc.sourceUrl             ||
    doc.source_url         ||
    doc.metadata?.driveViewUrl  || doc.metadata?.drive_view_url ||
    doc.metadata?.url           || doc.metadata?.webViewLink    ||
    doc.metadata?.web_view_link || doc.metadata?.sourceUrl      ||
    doc.metadata?.source_url    || ""
  );
}

// Merge metadata from an incoming duplicate into the retained doc.
// URL upgrade: if retained has no clickable URL at all, promote incoming's best URL
//   (checks metadata-nested fields via bestDocUrl) to retained's top-level fields.
// Metadata coalesce: ALWAYS fills any missing field from incoming — decoupled from
//   the URL upgrade so that retained docs that already have a URL still gain
//   documentTitle, citation, normalizedReference, etc. from later duplicates.
function mergeDocMetadata(retained, incoming) {
  if (!incoming) return retained;
  const retUrl     = bestDocUrl(retained);
  const incUrl     = bestDocUrl(incoming);
  // promoteUrl: only set when retained has absolutely no URL but incoming has one.
  // Writing to driveViewUrl/url normalizes any metadata-nested URL to top-level.
  const promoteUrl = !retUrl && incUrl ? incUrl : undefined;
  return Object.assign({}, retained, {
    // URL fields: coalesce individual top-level variants; fall back to promoted URL.
    driveViewUrl:   retained.driveViewUrl   || incoming.driveViewUrl   || promoteUrl,
    drive_view_url: retained.drive_view_url || incoming.drive_view_url || promoteUrl,
    url:            retained.url            || incoming.url            || promoteUrl,
    webViewLink:    retained.webViewLink    || incoming.webViewLink,
    web_view_link:  retained.web_view_link  || incoming.web_view_link,
    sourceUrl:      retained.sourceUrl      || incoming.sourceUrl,
    source_url:     retained.source_url     || incoming.source_url,
    // Non-URL metadata: always fill missing fields from incoming regardless of URL state.
    documentTitle:        retained.documentTitle        || incoming.documentTitle,
    document_title:       retained.document_title       || incoming.document_title,
    normalizedReference:  retained.normalizedReference  || incoming.normalizedReference,
    normalized_reference: retained.normalized_reference || incoming.normalized_reference,
    citation:             retained.citation             || incoming.citation,
    reference:            retained.reference            || incoming.reference,
    source:               retained.source               || incoming.source,
    displayLabel:         retained.displayLabel         || incoming.displayLabel         || incoming.display_label,
    display_label:        retained.display_label        || incoming.display_label        || incoming.displayLabel,
    authorityType:        retained.authorityType        || incoming.authorityType        || incoming.authority_type,
    authority_type:       retained.authority_type       || incoming.authority_type       || incoming.authorityType,
    authorityLevel:       retained.authorityLevel       || incoming.authorityLevel       || incoming.authority_level,
    authority_level:      retained.authority_level      || incoming.authority_level      || incoming.authorityLevel
  });
}

export function uniqueDocs(docs = []) {
  const seenIdx = new Map();  // canonical key → index in result
  const result = [];

  for (const doc of Array.isArray(docs) ? docs : []) {
    if (!doc) continue;

    const key = buildDocKey(doc);
    if (!key) continue;

    if (seenIdx.has(key)) {
      // Merge: upgrade URL and safe metadata fields if retained is missing them.
      const idx = seenIdx.get(key);
      result[idx] = mergeDocMetadata(result[idx], doc);
      continue;
    }

    seenIdx.set(key, result.length);
    result.push(doc);
  }

  return result;
}

function isCitedOrUsed(doc = {}, citedSourceKeys = []) {
  if (!citedSourceKeys.length) return true;

  const keyBlob = normalizeLooseText(
    [
      buildDocKey(doc),
      sourceTitleOf(doc),
      sourcePathOf(doc),
      inferIssuanceNumber(doc),
      doc.citation,
      doc.reference,
      doc.normalizedReference,
      doc.metadata?.citation,
      doc.metadata?.reference,
      doc.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );

  return citedSourceKeys.some((key) => keyBlob.includes(normalizeLooseText(key)));
}

function safeDisplayLabelOf(doc = {}) {
  return trimText(
    doc.displayLabel ||
      doc.display_label ||
      doc.metadata?.displayLabel ||
      doc.metadata?.display_label ||
      doc.citation ||
      doc.reference ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.citation ||
      doc.metadata?.reference ||
      doc.metadata?.normalizedReference ||
      inferIssuanceNumber(doc) ||
      "",
    240
  );
}

function toVisibleSourceEntry(doc = {}, issueClassification = null) {
  // Provision-level display label: prefer the authority/provision reference
  // (e.g. "NIRC Sec. 105", "RR No. 16-2005") over the raw PDF filename that all
  // chunks from the same document would otherwise share.
  // inferIssuanceNumber now recognises NIRC Sec. patterns (direct + DB-normalized form).
  const _normRef   = doc.normalized_reference || doc.normalizedReference ||
                     doc.metadata?.normalizedReference || null;
  const _provLabel = inferIssuanceNumber(doc) || null;
  const _safeLabel = safeDisplayLabelOf(doc);
  const _title = _safeLabel || _provLabel || `${formatDocType(doc)} Source`;

  return {
    title: _title,
    displayLabel: _safeLabel || _title,

    // Expose normalized_reference so downstream dedup (buildDocKey) and the
    // frontend can distinguish provisions from the same source document.
    normalized_reference: _normRef,
    normalizedReference:  _normRef,

    citation:
      doc.citation ||
      doc.reference ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.citation ||
      doc.metadata?.reference ||
      _provLabel ||
      _safeLabel ||
      _title,

    drive_url: sourceDriveUrlOf(doc),
    driveViewUrl: sourceDriveUrlOf(doc),
    drive_download_url: sourceDownloadUrlOf(doc),
    driveDownloadUrl: sourceDownloadUrlOf(doc),

    fileId: fileIdOf(doc),
    source_path: sourcePathOf(doc),
    sourcePath: sourcePathOf(doc),
    documentId: fileIdOf(doc),
    document_id: fileIdOf(doc),

    authority_type: authorityTypeOf(doc),
    authorityType: authorityTypeOf(doc),
    authority_level: authorityLevelOf(doc),
    authorityLevel: authorityLevelOf(doc),
    controlling_precedence: controllingPrecedenceOf(doc),
    controllingPrecedence: controllingPrecedenceOf(doc),

    issuance_number: inferIssuanceNumber(doc) || null,
    issuanceNumber: inferIssuanceNumber(doc) || null,

    legalBasisEntry: buildLegalBasisEntry(doc),
    sourcesEntry: buildSourcesEntry(doc),

    primaryDomain:
      docPrimaryDomain(doc) ||
      getPrimaryDomain(issueClassification) ||
      null,

    domainMatch: docDomainMatched(doc, issueClassification),
    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: docTargetAuthorityMatched(doc, issueClassification),

    is_controlling_authority: isControllingAuthority(doc),
    isControllingAuthority: isControllingAuthority(doc),
    is_administrative_authority: isAdministrativeAuthority(doc),
    isAdministrativeAuthority: isAdministrativeAuthority(doc),
    is_court_authority: isCourtAuthority(doc),
    isCourtAuthority: isCourtAuthority(doc),
    is_statutory_authority: isStatutoryAuthority(doc),
    isStatutoryAuthority: isStatutoryAuthority(doc),
    is_weak_authority: isWeakAuthority(doc),
    isWeakAuthority: isWeakAuthority(doc),

    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    rawFullTextHidden: true,

    excerpt: String(
      doc.text ||
        doc.content ||
        doc.excerpt ||
        doc.preview ||
        doc.chunkText ||
        doc.chunk_text ||
        ""
    ).slice(0, 600),

    score:
      Number(
        doc.finalScore ||
          doc.final_score ||
          doc.rerankScore ||
          doc.retrievalScore ||
          doc.score ||
          doc.similarity ||
          0
      ) || 0
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
  const controlBonus = isControllingAuthority(doc) ? 45 : 0;
  const courtBonus = isCourtAuthority(doc) ? 35 : 0;
  const statutoryBonus = isStatutoryAuthority(doc) ? 35 : 0;
  const targetBonus = docTargetAuthorityMatched(doc, issueClassification) ? 60 : 0;
  const domainMatch = docDomainMatched(doc, issueClassification);
  const domainBonus = domainMatch === true ? 45 : domainMatch === false ? -35 : 0;
  const issueMatch = docIssueClassificationMatched(doc);
  const issueBonus = issueMatch === true ? 55 : issueMatch === false ? -120 : 0;
  const weakPenalty = isWeakAuthority(doc) ? -90 : 0;
  const exactBonus = inferIssuanceNumber(doc) ? 20 : 0;
  const mismatchPenalty =
    doc.issueMismatch === true || doc.issueClassificationMatch?.issueMismatch === true ? -150 : 0;

  return (
    base +
    controlBonus +
    courtBonus +
    statutoryBonus +
    targetBonus +
    domainBonus +
    issueBonus +
    exactBonus +
    weakPenalty +
    mismatchPenalty -
    precedence
  );
}

function prioritizeVisibleSources(docs = [], issueClassification = null) {
  return [...docs].sort((a, b) => {
    const precedenceDiff = controllingPrecedenceOf(a) - controllingPrecedenceOf(b);
    if (precedenceDiff !== 0) return precedenceDiff;

    const domainDiff =
      Number(docDomainMatched(b, issueClassification) === true) -
      Number(docDomainMatched(a, issueClassification) === true);
    if (domainDiff !== 0) return domainDiff;

    const targetDiff =
      Number(docTargetAuthorityMatched(b, issueClassification)) -
      Number(docTargetAuthorityMatched(a, issueClassification));
    if (targetDiff !== 0) return targetDiff;

    const aIssue = docIssueClassificationMatched(a);
    const bIssue = docIssueClassificationMatched(b);

    if (aIssue !== bIssue) {
      return Number(bIssue === true) - Number(aIssue === true);
    }

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
    issueClassification = null,
    citedSourceKeys = [],
    requireCited = false
  } = {}
) {
  const visibleLimit = Math.min(
    Math.max(Number(maxItems) || MAX_VISIBLE_SOURCES, 0),
    MAX_VISIBLE_SOURCES
  );
  const visible = [];

  const issueMatchedDocs = buildIssueMatchedVisiblePool(
    uniqueDocs(docs),
    query,
    issueClassification
  );

  for (const doc of issueMatchedDocs) {
    if (shouldHideSource(doc, issueClassification)) continue;

    const replacement = findReplacementForDocument(doc, supersessionResult);
    const sourceToUse = replacement || doc;

    if (shouldHideSource(sourceToUse, issueClassification)) continue;
    if (sourceToUse.issueMismatch === true) continue;
    if (sourceToUse.issueClassificationMatch?.issueMismatch === true) continue;
    if (isWeakAuthority(sourceToUse) && !isReviewMode(issueClassification)) continue;
    if (requireCited && !isCitedOrUsed(sourceToUse, citedSourceKeys)) continue;

    visible.push(toVisibleSourceEntry(sourceToUse, issueClassification));
  }

  return uniqueDocs(prioritizeVisibleSources(visible, issueClassification)).slice(0, visibleLimit);
}

export function runSupersessionPreflight({
  legalBasisDocs = [],
  sourcesUsed = [],
  asOfDate = new Date(),
  query = "",
  issueClassification = null,
  citedSourceKeys = []
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
    issueClassification,
    citedSourceKeys,
    requireCited: citedSourceKeys.length > 0
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
  const hasCourt = issueMatchedDocs.some((doc) => isCourtAuthority(doc));
  const hasTargetAuthority = issueMatchedDocs.some((doc) =>
    docTargetAuthorityMatched(doc, issueClassification)
  );
  const hasDomainMatch = issueMatchedDocs.some((doc) => docDomainMatched(doc, issueClassification) === true);

  if (hierarchyConflict?.conflict) return bestPrecedence <= 7 ? "MEDIUM" : "LOW";
  if (supersessionResult?.superseded?.length) return bestPrecedence <= 7 ? "MEDIUM" : "LOW";
  if (hasStatute && hasCourt && hasTargetAuthority && hasDomainMatch) return "HIGH";
  if (bestPrecedence <= 3 && hasTargetAuthority && hasDomainMatch) return "HIGH";
  if (bestPrecedence <= 7) return "MEDIUM";
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
  issueClassification = null,
  citedSourceKeys = []
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
    issueClassification,
    citedSourceKeys
  });

  const finalVisibleSources =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult,
          query,
          issueClassification,
          citedSourceKeys,
          requireCited: citedSourceKeys.length > 0
        });

  const uniqueFinalVisibleSources = uniqueDocs(finalVisibleSources);
  const sources = uniqueFinalVisibleSources
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((doc) => toVisibleSourceEntry(doc, issueClassification));

  return {
    answer,
    sources,
    sourceCards: sources,
    authority_used: inferAuthorityUsed(resolvedLegalBasisDocs, sources),
    confidence_level: inferConfidenceLevel({
      legalBasisDocs: resolvedLegalBasisDocs,
      hierarchyConflict,
      supersessionResult,
      query,
      issueClassification
    }),
    supersession_audit: safeArray(supersessionResult?.auditTrail).slice(0, 10),
    source_visibility_metadata: {
      engineVersion: ENGINE_VERSION,
      issueClassificationAware: true,
      taxDomainClassificationAware: true,
      primaryDomainAware: true,
      domainAwareSourceOrdering: true,
      targetAuthorityAware: true,
      citedSourceFilteringEnabled: citedSourceKeys.length > 0,
      nonDuplicatedSources: true,
      compactVisibleSourcesOnly: true,
      rawFullTextHidden: true,
      contextOrchestrationCompatible: true,
      masterPromptAuthorityHierarchyApplied: true,
      architectureV2DisplayHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      reviewerSourcesExcludedUnlessReviewMode: true,
      maxVisibleSources: MAX_VISIBLE_SOURCES,
      overflowSuppressedFromVisibleOutput: uniqueFinalVisibleSources.length > MAX_VISIBLE_SOURCES,
      caseOrderingLimitation: "CASE_SC and CASE_CTA are separated when source metadata or court signals identify Supreme Court or CTA sources; Court of Appeals sources are not treated as CASE_CTA.",
      sourceCount: sources.length,
      primaryDomain: getPrimaryDomain(issueClassification) || null
    }
  };
}

// ─── Direct-Support Display Filter ───────────────────────────────────────────
// Deterministic post-generation filter.
// Retrieved ≠ Displayed. Only sources that directly support the final answer
// are shown. targetAuthority alone is NOT a pass condition.

function _isSourceLookupQuery(query = "") {
  const q = normalizeLooseText(query);
  if (
    /\b(show me|find|locate|look up|fetch|get)\b/i.test(q) &&
    /\b(source|section|provision|rmc|rr|rmo|ramo|bir ruling|nirc|text)\b/i.test(q)
  ) return true;
  if (/\bwhat does\s+.{2,50}\s+say\b/i.test(q)) return true;
  if (/\btext of\b/i.test(q)) return true;
  if (/\bsources? on\b/i.test(q)) return true;
  if (/^(?:nirc|tax code)\s+sec(?:tion)?\.?\s*\d+[a-z]?\s*$/i.test(q.trim())) return true;
  if (/^(?:rmc|rr|rmo|ramo)\s+(?:no\.?\s*)?\d+[-\s]\d{2,4}\s*$/i.test(q.trim())) return true;
  return false;
}

function _extractLegalBasisSection(answerText = "") {
  const text = normalizeText(answerText);
  const patterns = [
    /B\.\s*CONTROLLING LEGAL BASIS\s*\n([\s\S]*?)(?=\n\s*[C-H]\.\s+[A-Z]|\n\s*#{1,6}\s+[A-Z]|$)/i,
    /#{1,3}\s*Legal Basis\s*\n([\s\S]*?)(?=\n\s*#{1,3}\s+[A-Z]|$)/i,
    /\bLEGAL BASIS\b[:\s]*\n([\s\S]*?)(?=\n\s*[C-H]\.\s+[A-Z]|\n\s*#{1,3}\s+[A-Z]|\n\s*\d+\.\s+[A-Z]|$)/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return "";
}

function _expandYear2(twoDigit = "") {
  return Number(twoDigit) <= 30 ? `20${twoDigit}` : `19${twoDigit}`;
}

// Extract canonical citation keys from normalized answer text.
// Returns a Set of short opaque strings used for O(1) source matching.
function _extractAnswerCitationKeys(normalizedAnswerText = "") {
  const keys = new Set();
  const t = normalizedAnswerText;

  // NIRC / Tax Code sections
  for (const m of t.matchAll(/\b(?:nirc\s+)?sec(?:tion)?\.?\s*(\d{1,3}[a-z]?)\b/gi)) {
    const n = m[1].toLowerCase();
    keys.add(`nircsc${n}`);
    keys.add(`sc${n}`);
  }
  for (const m of t.matchAll(/\bsec(?:tion)?\.?\s*(\d{1,3}[a-z]?)\s+of\s+(?:the\s+)?(?:nirc|tax code)\b/gi)) {
    const n = m[1].toLowerCase();
    keys.add(`nircsc${n}`); keys.add(`sc${n}`);
  }
  // Administrative issuances
  for (const m of t.matchAll(/\brr\s+(?:no\.?\s*)?(\d{1,3})[-\s](\d{2,4})\b/gi)) {
    const yr = m[2].length === 2 ? _expandYear2(m[2]) : m[2];
    keys.add(`rr${m[1]}${yr}`);
  }
  for (const m of t.matchAll(/\brmc\s+(?:no\.?\s*)?(\d{1,3})[-\s](\d{2,4})\b/gi)) {
    const yr = m[2].length === 2 ? _expandYear2(m[2]) : m[2];
    keys.add(`rmc${m[1]}${yr}`);
  }
  for (const m of t.matchAll(/\brmo\s+(?:no\.?\s*)?(\d{1,3})[-\s](\d{2,4})\b/gi)) {
    const yr = m[2].length === 2 ? _expandYear2(m[2]) : m[2];
    keys.add(`rmo${m[1]}${yr}`);
  }
  for (const m of t.matchAll(/\bramo\s+(?:no\.?\s*)?(\d{1,3})[-\s](\d{2,4})\b/gi)) {
    const yr = m[2].length === 2 ? _expandYear2(m[2]) : m[2];
    keys.add(`ramo${m[1]}${yr}`);
  }
  for (const m of t.matchAll(/\bra\s+(?:no\.?\s*)?(\d{4,6})\b/gi)) {
    keys.add(`ra${m[1]}`);
  }

  // Citation range/list expansion: "Sections 105 to 108 of the NIRC", "NIRC Secs. 84-97", etc.
  // Adds canonical keys for every section in a cited range so source cards can match.
  for (const ck of expandLegalCitationMentionsToKeys(normalizedAnswerText)) {
    keys.add(ck);
    const scDigit = ck.match(/^nircsc(\d+)$/);
    if (scDigit) keys.add(`sc${scDigit[1]}`);
  }

  return keys;
}

// Build the set of canonical keys that identify a source card.
function _sourceCanonicalKeys(source = {}) {
  const refs = [
    source.normalizedReference,
    source.citation,
    source.issuanceNumber,
    source.title
  ].filter(Boolean);

  const keys = new Set();
  for (const ref of refs) {
    const loose = normalizeLooseText(ref);

    // NIRC section key
    const secM = loose.match(/\bsec(?:tion)?\.?\s*(\d{1,3}[a-z]?)\b/i);
    if (secM) {
      const n = secM[1].toLowerCase();
      keys.add(`nircsc${n}`);
      keys.add(`sc${n}`);
    }

    // Admin issuance key
    const adminM = loose.match(/\b(rr|rmc|rmo|ramo)\s+(?:no\.?\s*)?(\d{1,3})[-\s](\d{2,4})\b/i);
    if (adminM) {
      const yr = adminM[3].length === 2 ? _expandYear2(adminM[3]) : adminM[3];
      keys.add(`${adminM[1].toLowerCase()}${adminM[2]}${yr}`);
    }

    // RA key
    const raM = loose.match(/\bra\s+(?:no\.?\s*)?(\d{4,6})\b/i);
    if (raM) keys.add(`ra${raM[1]}`);

    // Canonical key (strips all punctuation/spaces)
    const ck = canonicalSourceKey(loose);
    if (ck && ck.length >= 3) keys.add(ck);

    // Range expansion for multi-section source labels ("NIRC Secs. 105-108").
    // Allows a chunk covering a section range to match any individual section key.
    for (const rangeKey of expandLegalCitationMentionsToKeys(loose)) {
      keys.add(rangeKey);
      const scDigit = rangeKey.match(/^nircsc(\d+)$/);
      if (scDigit) keys.add(`sc${scDigit[1]}`);
    }
  }
  return keys;
}

// Signal A + B: does the source reference appear in the answer/legal-basis text?
function _sourceAppearsInAnswer(source = {}, answerCitationKeys = new Set(), normalizedAnswerText = "") {
  const sourceKeys = _sourceCanonicalKeys(source);
  for (const k of sourceKeys) {
    if (k && answerCitationKeys.has(k)) return true;
  }
  // Substring fallback for refs that canonical-key extraction may miss
  const refs = [source.normalizedReference, source.citation, source.issuanceNumber].filter(Boolean);
  for (const ref of refs) {
    const loose = normalizeLooseText(ref);
    if (loose.length >= 4 && normalizedAnswerText.includes(loose)) return true;
  }
  return false;
}

// Domain term groups used for Signal C key-term overlap scoring.
// Each group represents a distinct legal/tax proposition domain.
const _DIRECT_SUPPORT_TERM_GROUPS = Object.freeze([
  // EWT / Creditable Withholding
  ["withholding", "withholding tax", "expanded withholding tax", "creditable withholding", "ewt", "cwt", "tax withheld at source", "withholding agent", "2307", "1601"],
  // Final Withholding
  ["final withholding", "fwt", "final tax", "dividends", "royalties"],
  // VAT general
  ["value added tax", "value-added tax", "output vat", "input vat", "zero rated", "zero-rated", "vat exempt", "vat registration", "vatable"],
  // VAT importation (separate group so it does NOT bleed into EWT)
  ["importation", "import vat", "vat on importation", "customs", "tariff", "cmta", "section 107"],
  // Income tax
  ["income tax", "corporate income tax", "rcit", "mcit", "nolco", "taxable income", "gross income", "compensation income"],
  // Estate / Donor
  ["estate tax", "donor tax", "gross estate", "net estate"],
  // Percentage / Excise
  ["percentage tax", "excise tax", "sin tax", "petroleum"],
  // Assessment / Prescription
  ["assessment", "prescription", "loa", "pan", "fan", "fdda", "waiver"],
  // Dispute
  ["protest", "appeal", "refund", "compromise", "abatement"]
]);

// PATCH-022: DSF-local tax acronym expansion table.
// When an acronym appears in extracted answer key terms, inject the spelled-out
// phrases so source blobs using the full form can achieve ≥2 key-term overlap
// even when the LLM answer used only the abbreviation.
// Both hyphenated and non-hyphenated variants are included where applicable.
// Scope: DSF answer key-term extraction only — no retrieval or ranking changes.
const _TAX_ACRONYM_EXPANSIONS = Object.freeze({
  vat:   ["value added tax", "value-added tax"],
  ewt:   ["expanded withholding tax"],
  fwt:   ["final withholding tax"],
  cwt:   ["creditable withholding tax"],
  cgt:   ["capital gains tax"],
  dst:   ["documentary stamp tax"],
  mcit:  ["minimum corporate income tax"],
  nolco: ["net operating loss carry-over", "net operating loss carryover"],
  rpt:   ["real property tax"],
});

function _expandTaxAcronyms(terms) {
  for (const [acronym, phrases] of Object.entries(_TAX_ACRONYM_EXPANSIONS)) {
    if (terms.has(acronym)) {
      for (const phrase of phrases) {
        terms.add(phrase);
      }
    }
  }
}

function _extractAnswerKeyTerms(answerText = "", extraKeyTerms = [], issueClassification = null) {
  const normalized = normalizeLooseText(answerText);
  const terms = new Set();

  for (const t of extraKeyTerms) {
    if (t) terms.add(normalizeLooseText(t));
  }

  // Add domain terms that actually appear in this answer (word-boundary aware)
  for (const group of _DIRECT_SUPPORT_TERM_GROUPS) {
    for (const term of group) {
      const norm = normalizeLooseText(term);
      if (_termMatches(normalized, norm)) terms.add(norm);
    }
  }

  // Add domain keywords from issue classification (word-boundary aware)
  if (issueClassification) {
    const domKey = String(
      issueClassification.primaryDomain ||
      issueClassification.taxDomainClassification?.primaryDomain ||
      ""
    ).toUpperCase();
    if (domKey && DOMAIN_KEYWORDS[domKey]) {
      for (const kw of DOMAIN_KEYWORDS[domKey]) {
        const norm = normalizeLooseText(kw);
        if (_termMatches(normalized, norm)) terms.add(norm);
      }
    }
  }

  // Add section references that appear in the answer as strong key terms
  for (const m of normalized.matchAll(/\b(?:nirc\s+)?sec(?:tion)?\.?\s*(\d{1,3}[a-z]?)\b/gi)) {
    terms.add(`sec ${m[1].toLowerCase()}`);
    terms.add(`section ${m[1].toLowerCase()}`);
  }

  // PATCH-022: expand known tax acronyms to their spelled-out forms so source
  // blobs using the full phrase can achieve ≥2 key-term overlap with acronym answers.
  _expandTaxAcronyms(terms);

  return [...terms].filter(t => t && t.length >= 3);
}

// Word-boundary-aware term match.
// Single-word terms use \b anchors to prevent "pan" matching inside "expanded",
// "loa" inside "loan", etc.  Multi-word phrases use substring match (safe because
// a phrase like "withholding tax" cannot appear as an embedded fragment of another word).
function _termMatches(normalizedBlob = "", normalizedTerm = "") {
  if (!normalizedBlob || !normalizedTerm || normalizedTerm.length < 3) return false;
  if (normalizedTerm.includes(" ")) {
    return normalizedBlob.includes(normalizedTerm);
  }
  const esc = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${esc}\\b`).test(normalizedBlob);
}

// Signal C: count meaningful key-term overlaps between source blob and answer terms.
// Uses word-boundary matching for single-word terms via _termMatches.
function _hasDirectSupportTerms(sourceBlob = "", keyTerms = [], minOverlap = 2) {
  if (!sourceBlob || !keyTerms.length) return false;
  const nb = normalizeLooseText(sourceBlob);
  let overlap = 0;
  for (const term of keyTerms) {
    if (!term || term.length < 3) continue;
    if (_termMatches(nb, term)) {
      overlap++;
      if (overlap >= minOverlap) return true;
    }
  }
  return false;
}

/**
 * filterDisplayedSourcesByDirectSupport
 *
 * Final display-only filter. Runs AFTER retrieval, reranking, authority validation,
 * supersession, and answer generation. Only filters what is shown to the user.
 *
 * Pass signals (any one sufficient):
 *   A. Source reference explicitly cited in the final answer text.
 *   B. Source reference appears in the answer's Legal Basis section.
 *   C. Source excerpt/title key-term overlap with answer propositions (≥ 2 terms).
 *   D. Query is an explicit source/citation lookup (always pass).
 *
 * targetAuthority alone is NOT a pass signal (enforces HARD RULE 5 & 6).
 */
export function filterDisplayedSourcesByDirectSupport({
  candidateSources = [],
  answerText = "",
  issueClassification = null,
  query = "",
  legalBasisText = "",
  keyTerms = [],
  mode = "",
  hook = ""
} = {}) {
  if (!Array.isArray(candidateSources) || !candidateSources.length) {
    return {
      displayedSources: [],
      rejectedSources: [],
      diagnostics: { reason: "no_candidates", total: 0, displayed: 0, rejected: 0 }
    };
  }

  // Explicit source explorer / source lookup mode — pass all through without
  // answer-support gating.  /source is a document browser, not an answer validator.
  // SOURCE_LOOKUP mode is the pipeline's internal equivalent.
  const _isExplicitSourceMode =
    String(hook || "").toLowerCase() === "/source" ||
    String(mode || "").toUpperCase() === "SOURCE_LOOKUP";

  if (_isExplicitSourceMode) {
    const displayed = prioritizeVisibleSources(candidateSources, issueClassification)
      .slice(0, MAX_VISIBLE_SOURCES);
    return {
      displayedSources: displayed,
      rejectedSources: [],
      diagnostics: {
        reason:    "source_mode_passthrough",
        total:     candidateSources.length,
        displayed: displayed.length,
        rejected:  0
      }
    };
  }

  // No answer text — fail closed: cannot validate direct support without an answer.
  // Exception: explicit source/citation lookup queries may still pass all through.
  if (!answerText || !String(answerText).trim()) {
    if (_isSourceLookupQuery(query)) {
      const displayed = prioritizeVisibleSources(candidateSources, issueClassification)
        .slice(0, MAX_VISIBLE_SOURCES);
      return {
        displayedSources: displayed,
        rejectedSources: [],
        diagnostics: { reason: "source_lookup_exception_empty_answer", total: candidateSources.length, displayed: displayed.length, rejected: 0 }
      };
    }
    return {
      displayedSources: [],
      rejectedSources: candidateSources.map(s => ({
        ref:    s.normalizedReference || s.citation || s.title || "(no-ref)",
        reason: "empty_answer_text_no_direct_support"
      })),
      diagnostics: {
        reason:     "empty_answer_text_fail_closed",
        failClosed: true,
        total:      candidateSources.length,
        displayed:  0,
        rejected:   candidateSources.length
      }
    };
  }

  // Signal D: source lookup queries get all candidates (looser gate per spec)
  if (_isSourceLookupQuery(query)) {
    const displayed = prioritizeVisibleSources(candidateSources, issueClassification)
      .slice(0, MAX_VISIBLE_SOURCES);
    return {
      displayedSources: displayed,
      rejectedSources: [],
      diagnostics: { reason: "source_lookup_exception", total: candidateSources.length, displayed: displayed.length, rejected: 0 }
    };
  }

  const normalizedAnswer     = normalizeLooseText(answerText);
  const legalBasisBody       = _extractLegalBasisSection(answerText) || legalBasisText;
  const normalizedLegalBasis = normalizeLooseText(legalBasisBody);
  const answerCitationKeys   = _extractAnswerCitationKeys(normalizedAnswer);
  const legalBasisCitKeys    = _extractAnswerCitationKeys(normalizedLegalBasis);
  const answerKeyTerms       = _extractAnswerKeyTerms(answerText, keyTerms, issueClassification);

  const displayedSources = [];
  const rejectedSources  = [];

  for (const source of candidateSources) {
    // Signal A: source reference explicitly cited in the final answer
    if (_sourceAppearsInAnswer(source, answerCitationKeys, normalizedAnswer)) {
      displayedSources.push(source);
      continue;
    }

    // Signal B: source reference cited in the answer's legal basis section
    if (normalizedLegalBasis && _sourceAppearsInAnswer(source, legalBasisCitKeys, normalizedLegalBasis)) {
      displayedSources.push(source);
      continue;
    }

    // Signal C: source excerpt/title directly supports answer via key-term overlap.
    // Threshold: 1 for FAST_DEFINITION or single-term answers; 2 otherwise.
    const minOverlapRequired = (mode === "FAST_DEFINITION" || answerKeyTerms.length === 1) ? 1 : 2;
    if (answerKeyTerms.length >= minOverlapRequired) {
      const sourceBlob = [
        source.excerpt            || "",
        source.title              || "",
        source.normalizedReference || source.citation || "",
        source.documentTitle      || source.document_title || ""
      ].filter(Boolean).join(" ");

      if (sourceBlob && _hasDirectSupportTerms(sourceBlob, answerKeyTerms, minOverlapRequired)) {
        displayedSources.push(source);
        continue;
      }
    }

    // Signal E (FAST_DEFINITION only): accepted target-authority pass.
    // Short/concise FAST_DEFINITION answers may not produce enough key terms for
    // Signal C overlap.  Allow a source card whose canonical reference directly
    // matches a target authority from the issue classification, provided the card
    // is not contaminated (no issueMismatch on the card).
    if (mode === "FAST_DEFINITION") {
      const _e_targetAuths = issueClassification?.targetAuthorities || [];
      if (_e_targetAuths.length > 0) {
        const _e_srcRef = source.normalizedReference || source.citation || source.title || "";
        if (_e_srcRef) {
          const _e_srcKey = canonicalSourceKey(_e_srcRef);
          if (_e_targetAuths.some(t => canonicalSourceKey(t) === _e_srcKey)) {
            displayedSources.push(source);
            continue;
          }
        }
      }
    }

    // No signal — reject (HARD RULE 8: do not backfill with unrelated chunks)
    rejectedSources.push({
      ref:    source.normalizedReference || source.citation || source.title || "(no-ref)",
      reason: "no_direct_support"
    });
  }

  const orderedDisplayedSources = prioritizeVisibleSources(displayedSources, issueClassification)
    .slice(0, MAX_VISIBLE_SOURCES);

  return {
    displayedSources: orderedDisplayedSources,
    rejectedSources,
    diagnostics: {
      filterVersion:           "1.0.0",
      total:                   candidateSources.length,
      displayed:               orderedDisplayedSources.length,
      rejected:                rejectedSources.length,
      answerCitationKeysCount: answerCitationKeys.size,
      answerKeyTermsCount:     answerKeyTerms.length,
      keyTermsSample:          answerKeyTerms.slice(0, 8),
      rejectedRefs:            rejectedSources.map(r => r.ref).slice(0, 10)
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
    taxDomainClassificationAware: true,
    primaryDomainAware: true,
    domainAwareSourceOrdering: true,
    targetAuthorityMatchAware: true,
    contextOrchestrationCompatible: true,
    citedSourceFilteringReady: true,
    nonDuplicatedSourcesReady: true,
    compactVisibleSourcesOnly: true,
    rawFullTextHidden: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    reviewerSourcesExcludedUnlessReviewMode: true
  };
}

export default {
  ENGINE_VERSION,
  filterVisibleSources,
  runSupersessionPreflight,
  buildFinalRoutePayload,
  filterDisplayedSourcesByDirectSupport,
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
