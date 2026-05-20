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

export const ENGINE_VERSION = "3.3.0";
export const MAX_VISIBLE_SOURCES = 5;

/**
 * Master Prompt hierarchy:
 * 1. Constitution
 * 2. NIRC / CMTA / LGC / primary statutes
 * 3. Tax Treaties
 * 4. Supreme Court En Banc
 * 5. Supreme Court Division
 * 6. CTA En Banc
 * 7. CTA Division
 * 8. Revenue Regulations
 * 9. RMC / RMO / RAMO
 * 10. BIR Rulings
 * 11. LGU / BOC issuances
 * 12. PFRS / PAS / PSA, when accounting applies
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */
const CONTROLLING_AUTHORITY_PRIORITY = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,

  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,

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
    doc.sourceUrl ||
    doc.source_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    doc.metadata?.url ||
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

    TAX_TREATY: "TAX_TREATY",
    TREATY: "TAX_TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT_DECISION: "SUPREME_COURT",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA_EN_BANC: "CTA_EN_BANC",
    CTA: "CTA_DIVISION",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",
    CA: "COURT_OF_APPEALS",

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

  if (path.includes("06_court_cases") && hasSupremeCourtEnBancSignal(blob)) return "SUPREME_COURT_EN_BANC";
  if (hasSupremeCourtEnBancSignal(blob)) return "SUPREME_COURT_EN_BANC";
  if (path.includes("06_court_cases") && hasSupremeCourtSignal(blob)) return "SUPREME_COURT";
  if (title.includes("supreme court") || hasSupremeCourtSignal(blob)) return "SUPREME_COURT";
  if (title.includes("cta en banc") || hasCtaEnBancSignal(blob)) return "CTA_EN_BANC";
  if (title.includes("court of appeals") || /\bca-g\.?r\.?\b/i.test(blob)) return "COURT_OF_APPEALS";
  if (title.includes("cta") || hasCtaSignal(blob)) return "CTA_DIVISION";

  if (
    path.includes("01_tax_code") ||
    /\b(?:republic act|ra)\s*(?:no)?\s*\d{4,6}\b/i.test(blob) ||
    title.includes("tax code") ||
    title.includes("nirc")
  ) return "STATUTE";

  if (path.includes("05b_tax_treaties") || title.includes("tax treaty") || title.includes("double tax")) return "TAX_TREATY";
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
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);

  return CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)] || 99;
}

export function controllingPrecedenceOf(doc = {}) {
  const explicit =
    doc.controllingPrecedence ??
    doc.controlling_precedence ??
    doc.metadata?.controllingPrecedence ??
    null;

  if (Number.isFinite(Number(explicit)) && Number(explicit) > 0) return Number(explicit);

  return CONTROLLING_AUTHORITY_PRIORITY[authorityTypeOf(doc)] || 99;
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
  return controllingPrecedenceOf(doc) <= 7;
}

export function isAdministrativeAuthority(doc = {}) {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(authorityTypeOf(doc));
}

export function isCourtAuthority(doc = {}) {
  return [
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
    "TAX_TREATY"
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
    { regex: /\b(RA)\s*(?:No\.?)?\s*(\d{4,6})\b/i, value: (m) => `RA No. ${m[2]}` },
    { regex: /\b(RR)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMC)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(RAMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i, value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}` },
    { regex: /\b(BIR Ruling)\s*(?:No\.?)?\s*([\w./()-]+)\b/i, value: (m) => `${m[1]} No. ${m[2]}` },
    { regex: /\b(CTA(?:\s+EB| En Banc)?\s+No\.?\s*[\w.-]+)\b/i, value: (m) => compactSpaces(m[1]) },
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

  return trimText(subject, 240);
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
  const number = inferIssuanceNumber(doc);
  const normalizedReference =
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.citation ||
    doc.reference ||
    doc.metadata?.normalizedReference ||
    doc.metadata?.citation ||
    doc.metadata?.reference ||
    "";

  return normalizeLooseText(
    [
      fileIdOf(doc),
      doc.id,
      number,
      normalizedReference,
      sourcePathOf(doc),
      sourceTitleOf(doc),
      authorityTypeOf(doc)
    ]
      .filter(Boolean)
      .join("|")
  );
}

export function uniqueDocs(docs = []) {
  const seen = new Set();
  const result = [];

  for (const doc of Array.isArray(docs) ? docs : []) {
    if (!doc) continue;

    const key = buildDocKey(doc);
    if (!key || seen.has(key)) continue;

    seen.add(key);
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

function toVisibleSourceEntry(doc = {}, issueClassification = null) {
  return {
    title: sourceTitleOf(doc),
    citation:
      doc.citation ||
      doc.reference ||
      doc.normalizedReference ||
      doc.metadata?.citation ||
      doc.metadata?.reference ||
      inferIssuanceNumber(doc) ||
      sourceTitleOf(doc),

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
    issueClassification = null,
    citedSourceKeys = [],
    requireCited = false
  } = {}
) {
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

  return uniqueDocs(prioritizeVisibleSources(visible, issueClassification)).slice(0, maxItems);
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

  const sources = uniqueDocs(finalVisibleSources)
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
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      reviewerSourcesExcludedUnlessReviewMode: true,
      sourceCount: sources.length,
      primaryDomain: getPrimaryDomain(issueClassification) || null
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
