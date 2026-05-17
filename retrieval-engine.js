// FILE: retrieval-engine.js
"use strict";

/**
 * TINA Enterprise Retrieval Orchestration Engine
 * Version: 4.3.1
 */

import {
  rerankByHierarchy,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";
import { analyzeQueryIntent } from "./query-intent-engine.js";

import {
  classifyTaxIssue,
  buildIssueClassificationSearchQueries,
  isIssueClassificationCompatibleWithDoc
} from "./issue-classification-engine.js";

import { rerankForTina } from "./reranker-engine.js";

const ENGINE_VERSION = "4.3.1";

const DEFAULT_TOP_K = 12;
const DEFAULT_POOL_K = 36;

const MAX_SOURCE_TEXT_CHARS = 3500;
const MAX_SOURCE_TITLE_CHARS = 240;
const MAX_SOURCE_CITATION_CHARS = 240;
const MAX_SOURCE_URL_CHARS = 500;

const HIDDEN_OR_WEAK_PATTERNS = [
  "07_cpa_notes",
  "08_review_materials",
  "internal_notes",
  "drafts",
  "working_papers",
  "reviewer",
  "handout",
  "lecture notes"
];

const REVIEW_ALLOWED_MODES = new Set([
  "REVIEWER",
  "TAX_REVIEWER",
  "REVIEWER_LEARNING_MODE",
  "ASSESSMENT",
  "QUIZ"
]);

const MODE_ALIASES = Object.freeze({
  ASK: "STANDARD",
  TAX_EXPERT: "TECHNICAL",
  TAX_REVIEWER: "REVIEWER",
  SOURCE_FINDER: "STANDARD",
  QUICK_MODE: "QUICK",
  STANDARD_TAX_MODE: "STANDARD",
  TECHNICAL_TAX_MODE: "TECHNICAL",
  AUDIT_MODE: "AUDIT",
  LITIGATION_LEGAL_DEFENSE_MODE: "LITIGATION",
  TRANSACTION_CHARACTERIZATION_MODE: "TRANSACTION",
  CONTRACT_INTERPRETATION_MODE: "CONTRACT",
  EVIDENCE_EVALUATION_MODE: "EVIDENCE_HEAVY",
  FACT_PATTERN_ANALYSIS_MODE: "TECHNICAL",
  REVIEWER_LEARNING_MODE: "REVIEWER"
});

const AUTHORITY_GROUP_TO_TYPES = Object.freeze({
  constitution: ["CONSTITUTION"],
  nirc: ["STATUTE", "NIRC", "TAX_CODE"],
  statute: ["STATUTE", "NIRC", "TAX_CODE"],
  taxCode: ["STATUTE", "NIRC", "TAX_CODE"],
  republicAct: ["STATUTE"],
  taxTreaty: ["TAX_TREATY"],
  treaty: ["TAX_TREATY"],
  supremeCourt: ["SUPREME_COURT"],
  jurisprudence: ["SUPREME_COURT"],
  cases: ["SUPREME_COURT"],
  ctaEnBanc: ["CTA_EN_BANC"],
  ctaDivision: ["CTA_DIVISION"],
  courtOfAppeals: ["COURT_OF_APPEALS"],
  rr: ["RR"],
  revenueRegulations: ["RR"],
  rmc: ["RMC"],
  rmo: ["RMO"],
  ramo: ["RAMO"],
  birRulings: ["BIR_RULING"],
  birRuling: ["BIR_RULING"],
  lgu: ["LGU"],
  boc: ["BOC_ISSUANCE"],
  pfrs: ["PFRS"],
  pas: ["PAS"],
  psa: ["PSA"],
  cpaNotes: ["SECONDARY"],
  reviewMaterials: ["SECONDARY"]
});

const VAT_DEFINITION_AUTHORITY_TERMS = Object.freeze([
  "NIRC Section 105",
  "NIRC Sec. 105",
  "Tax Code Section 105",
  "NIRC Section 106",
  "NIRC Sec. 106",
  "Tax Code Section 106",
  "NIRC Section 107",
  "NIRC Sec. 107",
  "Tax Code Section 107",
  "NIRC Section 108",
  "NIRC Sec. 108",
  "Tax Code Section 108",
  "Revenue Regulations No. 16-2005",
  "RR No. 16-2005",
  "RR 16-2005"
]);

const VAT_DEFINITION_CASE_TERMS = Object.freeze([
  "CIR v. Seagate",
  "Seagate Technology",
  "CIR v. Aichi",
  "Aichi Forging",
  "CIR v. Toshiba",
  "Toshiba Information Equipment"
]);

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function trimString(value = "", max = 1000) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function normalizeMode(mode = "STANDARD") {
  const value = String(mode || "STANDARD").trim().toUpperCase();

  if (MODE_ALIASES[value]) return MODE_ALIASES[value];

  if (
    [
      "QUICK",
      "STANDARD",
      "TECHNICAL",
      "AUDIT",
      "LITIGATION",
      "CONTRACT",
      "TRANSACTION",
      "EVIDENCE_HEAVY",
      "REVIEWER"
    ].includes(value)
  ) {
    return value;
  }

  if (value.includes("AUDIT")) return "AUDIT";
  if (value.includes("LITIGATION") || value.includes("LEGAL")) return "LITIGATION";
  if (value.includes("CONTRACT")) return "CONTRACT";
  if (value.includes("TRANSACTION")) return "TRANSACTION";
  if (value.includes("EVIDENCE")) return "EVIDENCE_HEAVY";
  if (value.includes("REVIEWER") || value.includes("QUIZ")) return "REVIEWER";
  if (value.includes("TECHNICAL") || value.includes("DOCTRINE")) return "TECHNICAL";
  if (value.includes("QUICK")) return "QUICK";

  return "STANDARD";
}

function isReviewMode(mode = "STANDARD", adaptiveContext = {}) {
  const normalized = normalizeMode(mode);
  const hookCode = String(adaptiveContext?.hookCode || adaptiveContext?.modeHook || "").toLowerCase();
  const responseMode = String(adaptiveContext?.responsePlan?.responseMode || "").toUpperCase();

  return (
    REVIEW_ALLOWED_MODES.has(normalized) ||
    REVIEW_ALLOWED_MODES.has(responseMode) ||
    hookCode === "/review" ||
    hookCode.includes("review") ||
    hookCode.includes("quiz") ||
    adaptiveContext?.assessmentMode === true ||
    adaptiveContext?.adaptiveQuizMode === true
  );
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    VAT_OUTPUT: "VAT_LIABILITY",
    VAT_DEFINITION: "VAT_DEFINITION",
    DEFINITION_OF_VAT: "VAT_DEFINITION",
    VALUE_ADDED_TAX_DEFINITION: "VAT_DEFINITION",
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
    CIT: "INCOME_TAX",
    IIT: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    CHARACTERIZATION: "TRANSACTION",
    DEFINITION: "VAT_DEFINITION",
    REFUND_PROCEDURE: "VAT_REFUND"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    STATUTE: "STATUTE",

    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

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

    LGU: "LGU",
    LGU_ISSUANCE: "LGU",

    BOC: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",

    TREATY: "TAX_TREATY",
    TAX_TREATY: "TAX_TREATY",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",

    IFRS: "PFRS",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    SECONDARY: "SECONDARY",
    SECONDARY_SOURCE: "SECONDARY",
    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY"
  };

  return aliases[raw] || raw || null;
}

function normalizeTargetAuthorities(targetAuthorities = null) {
  const output = [];

  if (Array.isArray(targetAuthorities)) {
    for (const item of targetAuthorities) {
      if (typeof item === "string") {
        const normalized = normalizeAuthority(item);
        if (normalized) output.push(normalized);
      } else if (item && typeof item === "object") {
        const normalized = normalizeAuthority(item.type || item.authorityType || item.group);
        if (normalized) output.push(normalized);
      }
    }
    return unique(output);
  }

  if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const [group, values] of Object.entries(targetAuthorities)) {
      const groupTypes = AUTHORITY_GROUP_TO_TYPES[group] || [];
      for (const type of groupTypes) output.push(type);

      for (const value of safeArray(values)) {
        if (typeof value === "string") {
          const normalized = normalizeAuthority(value);
          if (normalized) output.push(normalized);
        } else if (value && typeof value === "object") {
          const normalized = normalizeAuthority(value.type || value.authorityType || value.group);
          if (normalized) output.push(normalized);
        }
      }
    }
  }

  return unique(output);
}

function extractAuthoritySearchTerms(targetAuthorities = null) {
  const output = [];

  const pushTerm = (value) => {
    const term = normalizeText(
      typeof value === "string"
        ? value
        : value?.title ||
            value?.name ||
            value?.citation ||
            value?.reference ||
            value?.normalizedReference ||
            value?.authority ||
            ""
    );

    if (!term) return;

    if (!normalizeAuthority(term) || /\d|sec|section|rr|rmc|rmo|cir|v\.|versus/i.test(term)) {
      output.push(term);
    }
  };

  if (Array.isArray(targetAuthorities)) {
    targetAuthorities.forEach(pushTerm);
  } else if (targetAuthorities && typeof targetAuthorities === "object") {
    for (const values of Object.values(targetAuthorities)) {
      safeArray(values).forEach(pushTerm);
    }
  }

  return unique(output);
}

function normalizeAuthoritySearchTerm(term = "") {
  const value = normalizeText(term);
  if (!value) return "";

  return value
    .replace(/\bSections?\b/gi, "Sec.")
    .replace(/\bSection\b/gi, "Sec.")
    .replace(/\bRevenue Regulations?\b/gi, "RR")
    .replace(/\bNo\.\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectIssueType(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(define vat|definition of vat|what is vat|value-added tax|value added tax)\b/i.test(q), "VAT_DEFINITION");
  push(/\b(vat refund|input vat refund|tax credit certificate|tcc|120\+30|administrative claim|judicial claim|unutilized input vat|excess input vat|claim for refund)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|sale of goods|sale of services|gross selling price|gross receipts)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|support|invoicing|burden of proof)\b/i.test(q), "EVIDENTIARY");
  push(/\b(jurisdiction|jurisdictional|prescriptive|deadline|due date|filing|appeal|protest|assessment|loa|pan|fan|fld)\b/i.test(q), "PROCEDURAL");
  push(/\b(withholding|ewt|expanded withholding|final withholding|fwt|cwt)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|deduction|taxable income|gross income)\b/i.test(q), "INCOME_TAX");
  push(/\b(create|train|eopt|ease of paying taxes|create more|republic act|ra\s*\d{4,6}|nirc|tax code)\b/i.test(q), "NAMED_LAW");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal vs agent|principal|agent|pass-through|pass through|reimbursement|bundled|gross or net|economic substance|substance over form)\b/i.test(q), "TRANSACTION");
  push(/\b(audit|afs|working paper|pfrs|pas|misstatement|financial statements)\b/i.test(q), "AUDIT");
  push(/\b(g\.?\s*r\.?\s*no\.?|cta|supreme court|court of appeals|jurisprudence|case)\b/i.test(q), "CASE_LAW");
  push(/\b(rr|rmc|rmo|ramo|revenue regulation|revenue memorandum circular|revenue memorandum order)\s*(?:no\.?)?\s*\d+/i.test(q), "ISSUANCE");

  return unique(issues);
}

function isVatDefinitionClassification(classification = {}, query = "") {
  const issues = unique([
    normalizeIssue(classification.primaryIssue),
    normalizeIssue(classification.subIssue),
    ...safeArray(classification.subIssues).map(normalizeIssue),
    ...detectIssueType(query).map(normalizeIssue)
  ]).filter(Boolean);

  const strategy = lower(classification.retrievalStrategy || "");
  const q = lower(query);

  return (
    issues.includes("VAT_DEFINITION") ||
    (issues.includes("VAT_LIABILITY") &&
      /\b(define|definition|what is)\b.*\b(vat|value-added tax|value added tax)\b/i.test(q)) ||
    strategy.includes("vat_definition")
  );
}

function userRequestedJurisprudence(query = "", classification = {}) {
  const q = lower(query);
  const targetTypes = normalizeTargetAuthorities(classification.targetAuthorities);

  return (
    /\b(case|jurisprudence|supreme court|g\.?\s*r\.?|seagate|aichi|toshiba|doctrine|ruling)\b/i.test(q) ||
    targetTypes.includes("SUPREME_COURT") ||
    targetTypes.includes("CTA_EN_BANC") ||
    targetTypes.includes("CTA_DIVISION") ||
    classification?.retrievalControls?.shouldUseJurisprudence === true ||
    classification?.retrievalControls?.includeJurisprudence === true
  );
}

function docText(doc = {}) {
  return normalizeText(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.title,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.folder,
      doc.folderName,
      doc.folder_name,
      doc.metadata?.path,
      doc.metadata?.folder,
      doc.metadata?.folderName,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference,
      doc.metadata?.authorityType,
      doc.authorityType,
      doc.authority_type,
      ...(Array.isArray(doc.normalizedAliases) ? doc.normalizedAliases : []),
      ...(Array.isArray(doc.normalized_aliases) ? doc.normalized_aliases : []),
      ...(Array.isArray(doc.metadata?.normalizedAliases) ? doc.metadata.normalizedAliases : [])
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function extractBestTitle(doc = {}) {
  return trimString(
    doc.title ||
      doc.documentTitle ||
      doc.document_title ||
      doc.metadata?.documentTitle ||
      doc.metadata?.document_title ||
      doc.metadata?.originalFileName ||
      doc.metadata?.original_file_name ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      doc.fileName ||
      doc.filename ||
      "Untitled Source",
    MAX_SOURCE_TITLE_CHARS
  );
}

function extractBestCitation(doc = {}) {
  return trimString(
    doc.citation ||
      doc.citationText ||
      doc.citation_text ||
      doc.reference ||
      doc.referenceText ||
      doc.reference_text ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      doc.metadata?.normalized_reference ||
      doc.metadata?.citation ||
      doc.metadata?.reference ||
      doc.grNumber ||
      doc.gr_number ||
      doc.caseNumber ||
      doc.case_number ||
      "",
    MAX_SOURCE_CITATION_CHARS
  );
}

function extractBestUrl(doc = {}) {
  return trimString(
    doc.url ||
      doc.link ||
      doc.href ||
      doc.sourceUrl ||
      doc.source_url ||
      doc.driveViewUrl ||
      doc.drive_view_url ||
      doc.metadata?.url ||
      doc.metadata?.sourceUrl ||
      doc.metadata?.source_url ||
      doc.metadata?.driveViewUrl ||
      "",
    MAX_SOURCE_URL_CHARS
  );
}

function extractBestContent(doc = {}) {
  return trimString(
    doc.text ||
      doc.content ||
      doc.excerpt ||
      doc.preview ||
      doc.chunkText ||
      doc.chunk_text ||
      doc.pageContent ||
      doc.page_content ||
      "",
    MAX_SOURCE_TEXT_CHARS
  );
}

function detectDocIssueType(doc = {}) {
  return detectIssueType(docText(doc));
}

function isSupersededDoc(doc = {}) {
  return Boolean(
    doc.superseded === true ||
      doc.isSuperseded === true ||
      doc.is_superseded === true ||
      doc.metadata?.superseded === true ||
      doc.metadata?.isSuperseded === true ||
      doc.metadata?.is_superseded === true
  );
}

function sanitizeRetrievedSource(doc = {}) {
  const authorityType = getAuthorityTypeForDoc(doc);
  const authorityLevel = getAuthorityLevelForDoc(doc);
  const controllingPrecedence = getControllingPrecedenceForDoc(doc);
  const content = extractBestContent(doc);

  return {
    id:
      doc.id ||
      doc.fileId ||
      doc.file_id ||
      doc.metadata?.fileId ||
      doc.metadata?.file_id ||
      null,

    title: extractBestTitle(doc),
    authorityType,
    authorityLevel,
    controllingPrecedence,

    citation: extractBestCitation(doc),
    url: extractBestUrl(doc),

    text: content,
    content,

    score: Number(
      doc.finalScore ||
        doc.final_score ||
        doc.retrievalScore ||
        doc.retrieval_score ||
        doc.rerankScore ||
        doc.rerank_score ||
        doc.score ||
        doc.similarity ||
        0
    ),

    issueClassificationMatch: doc.issueClassificationMatch || null,
    targetAuthorityMatch: doc.targetAuthorityMatch === true,
    exactAuthorityMatch: doc.exactAuthorityMatch === true,
    retrievalPhase: doc.retrievalPhase || null,
    retrievalIssueType: safeArray(doc.retrievalIssueType || doc.retrieval_issue_type),
    superseded: isSupersededDoc(doc),

    metadata: {
      sourceType: authorityType,
      retrievalEngineVersion: ENGINE_VERSION,
      issueMismatch: doc.issueMismatch === true,
      exactCitationMatched: Number(doc.citationMatchBonus || 0) > 0,
      retrievalPhase: doc.retrievalPhase || null,
      rawFullDocumentInjectionPrevented: true
    }
  };
}

function normalizeExternalIssueClassification({
  query = "",
  issueClassification = null,
  primaryDomain = null,
  primaryIssue = null,
  subIssue = null,
  subIssues = [],
  legalDimensions = [],
  retrievalStrategy = null,
  targetAuthorities = null,
  queryIntent = null
} = {}) {
  const detected = detectIssueType(query);
  let engineClassification = null;

  if (!issueClassification?.primaryIssue) {
    try {
      engineClassification = classifyTaxIssue(query);
    } catch (error) {
      engineClassification = {
        classificationError: error?.message || "Issue classification failed."
      };
    }
  }

  const source = issueClassification?.primaryIssue
    ? issueClassification
    : engineClassification || {};

  const taxDomainClassification =
    source.taxDomainClassification ||
    source.tax_domain_classification ||
    queryIntent?.taxDomainClassification ||
    queryIntent?.tax_domain_classification ||
    null;

  const retrievalHints =
    source.retrievalHints ||
    source.retrieval_hints ||
    taxDomainClassification?.retrievalHints ||
    taxDomainClassification?.retrieval_hints ||
    {};

  const normalizedPrimaryDomain =
    primaryDomain ||
    source.primaryDomain ||
    source.primary_domain ||
    taxDomainClassification?.primaryDomain ||
    taxDomainClassification?.primary_domain ||
    safeArray(source.taxDomains)[0] ||
    safeArray(taxDomainClassification?.taxDomains)[0] ||
    null;

  const normalizedPrimaryIssue =
    normalizeIssue(primaryIssue) ||
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(taxDomainClassification?.primaryIssue) ||
    normalizeIssue(taxDomainClassification?.primary_issue) ||
    normalizeIssue(taxDomainClassification?.primarySubIssue) ||
    normalizeIssue(taxDomainClassification?.primary_sub_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    normalizeIssue(queryIntent?.primaryIssue) ||
    detected.map(normalizeIssue).filter(Boolean)[0] ||
    "GENERAL_TAX";

  const normalizedSubIssues = unique([
    normalizedPrimaryIssue,
    normalizeIssue(subIssue),
    normalizeIssue(source.subIssue),
    normalizeIssue(source.sub_issue),
    normalizeIssue(taxDomainClassification?.primarySubIssue),
    normalizeIssue(taxDomainClassification?.primary_sub_issue),
    ...safeArray(subIssues).map(normalizeIssue),
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(taxDomainClassification?.subIssues).map(normalizeIssue),
    ...safeArray(taxDomainClassification?.sub_issues).map(normalizeIssue),
    ...safeArray(queryIntent?.subIssues).map(normalizeIssue),
    ...detected.map(normalizeIssue)
  ]).filter(Boolean);

  const normalizedLegalDimensions = unique([
    ...safeArray(legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...safeArray(source.legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...safeArray(source.legalDimension).map((item) => String(item || "").toUpperCase()),
    ...safeArray(taxDomainClassification?.legalDimensions).map((item) => String(item || "").toUpperCase()),
    ...safeArray(taxDomainClassification?.legalDimension).map((item) => String(item || "").toUpperCase()),
    ...safeArray(queryIntent?.legalDimensions).map((item) => String(item || "").toUpperCase())
  ]).filter(Boolean);

  const rawTargetAuthorities =
    targetAuthorities ||
    source.targetAuthorities ||
    source.target_authorities ||
    taxDomainClassification?.targetAuthorities ||
    taxDomainClassification?.target_authorities ||
    queryIntent?.targetAuthorities ||
    [];

  const normalizedTargetAuthorities = unique([
    ...normalizeTargetAuthorities(targetAuthorities),
    ...normalizeTargetAuthorities(source.targetAuthorities),
    ...normalizeTargetAuthorities(source.target_authorities),
    ...normalizeTargetAuthorities(taxDomainClassification?.targetAuthorities),
    ...normalizeTargetAuthorities(taxDomainClassification?.target_authorities),
    ...normalizeTargetAuthorities(queryIntent?.targetAuthorities)
  ]);

  const authoritySearchTerms = unique([
    ...extractAuthoritySearchTerms(rawTargetAuthorities),
    ...safeArray(retrievalHints.exactAuthorities),
    ...safeArray(retrievalHints.targetAuthorities),
    ...safeArray(retrievalHints.priorityAuthorities),
    ...safeArray(source.authoritySearchTerms),
    ...safeArray(source.authority_search_terms)
  ]).map(normalizeText).filter(Boolean);

  const normalizedRetrievalStrategy =
    retrievalStrategy ||
    source.retrievalStrategy ||
    source.retrieval_strategy ||
    taxDomainClassification?.retrievalStrategy ||
    taxDomainClassification?.retrieval_strategy ||
    queryIntent?.retrievalStrategy ||
    "ISSUE_AUTHORITY_HIERARCHY_SEMANTIC";

  const provisional = {
    ...source,

    primaryDomain: normalizedPrimaryDomain,
    primaryIssue: normalizedPrimaryIssue,
    subIssue:
      source.subIssue ||
      source.sub_issue ||
      taxDomainClassification?.primarySubIssue ||
      taxDomainClassification?.primary_sub_issue ||
      normalizedSubIssues[0] ||
      normalizedPrimaryIssue,

    subIssues: normalizedSubIssues,
    legalDimensions: normalizedLegalDimensions,
    retrievalStrategy: normalizedRetrievalStrategy,
    targetAuthorities: normalizedTargetAuthorities,
    authoritySearchTerms,

    taxDomainClassification,

    retrievalHints,

    keyTerms: unique([
      ...safeArray(source.keyTerms),
      ...safeArray(source.key_terms),
      ...safeArray(retrievalHints.boostTerms),
      ...safeArray(retrievalHints.priorityTerms),
      normalizedPrimaryDomain,
      normalizedPrimaryIssue,
      ...normalizedSubIssues
    ]),

    taxDomains: unique([
      ...safeArray(source.taxDomains),
      ...safeArray(source.tax_domains),
      normalizedPrimaryDomain,
      taxDomainClassification?.primaryDomain,
      taxDomainClassification?.primary_domain,
      normalizedPrimaryIssue
    ]),

    legalQuestionPresented:
      source.legalQuestionPresented ||
      source.legal_question_presented ||
      taxDomainClassification?.legalQuestionPresented ||
      taxDomainClassification?.legal_question_presented ||
      query,

    factSensitivity:
      source.factSensitivity ||
      source.fact_sensitivity ||
      taxDomainClassification?.factSensitivity ||
      "moderate",

    exactAuthority:
      source.exactAuthority || {
        detected: false,
        type: null,
        reference: null
      },

    retrievalControls: {
      issueFirst: true,
      suppressIssueMismatchedCases: true,
      suppressVatRefundCasesUnlessRefundIssue:
        normalizedPrimaryIssue !== "VAT_REFUND",
      requirePrimaryAuthorityForDefinitions:
        normalizedPrimaryIssue === "VAT_DEFINITION" ||
        normalizedPrimaryIssue === "VAT_LIABILITY",
      useIssueClassificationMatch: true,
      useTargetAuthorityMatch: true,
      useControllingPrecedence: true,
      ...(source.retrievalControls || {}),
      ...(taxDomainClassification?.routing
        ? {
            shouldApplyAuthorityHierarchy:
              taxDomainClassification.routing.shouldApplyAuthorityHierarchy,
            shouldApplySupersessionCheck:
              taxDomainClassification.routing.shouldApplySupersessionCheck,
            shouldApplyConflictCheck:
              taxDomainClassification.routing.shouldApplyConflictCheck,
            shouldUseJurisprudence:
              taxDomainClassification.routing.shouldUseJurisprudence,
            shouldUseDoctrineTagging:
              taxDomainClassification.routing.shouldUseDoctrineTagging,
            shouldUseProvisionCitation:
              taxDomainClassification.routing.shouldUseProvisionCitation,
            shouldUseLegalValidation:
              taxDomainClassification.routing.shouldUseLegalValidation
          }
        : {})
    }
  };

  if (isVatDefinitionClassification(provisional, query)) {
    provisional.primaryIssue = "VAT_DEFINITION";
    provisional.subIssue = provisional.subIssue || "VAT_DEFINITION";
    provisional.subIssues = unique(["VAT_DEFINITION", "VAT_LIABILITY", ...provisional.subIssues]);
    provisional.retrievalStrategy =
      provisional.retrievalStrategy || "VAT_DEFINITION_AUTHORITY_FIRST";

    provisional.authoritySearchTerms = unique([
      ...VAT_DEFINITION_AUTHORITY_TERMS,
      ...provisional.authoritySearchTerms,
      ...(userRequestedJurisprudence(query, provisional) ? VAT_DEFINITION_CASE_TERMS : [])
    ]);

    provisional.targetAuthorities = unique([
      "STATUTE",
      "RR",
      ...(userRequestedJurisprudence(query, provisional) ? ["SUPREME_COURT"] : []),
      ...provisional.targetAuthorities
    ]);
  }

  return provisional;
}

function safeIssueClassification(query = "", existingClassification = null, extras = {}) {
  return normalizeExternalIssueClassification({
    query,
    issueClassification: existingClassification,
    ...extras
  });
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    if (!doc) continue;

    const key =
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
      JSON.stringify(doc);

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function isHiddenOrWeakSource(doc = {}) {
  const haystack = lower(docText(doc));
  return HIDDEN_OR_WEAK_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function isGoogleDriveIndexedSource(doc = {}) {
  const haystack = lower(docText(doc));
  return (
    haystack.includes("01_tax_code") ||
    haystack.includes("02_revenue_regulations") ||
    haystack.includes("03_rmc") ||
    haystack.includes("04_rmo") ||
    haystack.includes("05_bir_rulings") ||
    haystack.includes("06_court_cases") ||
    haystack.includes("google drive") ||
    haystack.includes("drive.google") ||
    Boolean(doc.driveViewUrl || doc.drive_view_url || doc.metadata?.driveViewUrl)
  );
}

function hasIssueMismatch(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return false;

  if (
    (queryIssues.includes("VAT_LIABILITY") || queryIssues.includes("VAT_DEFINITION")) &&
    docIssues.includes("VAT_REFUND") &&
    !queryIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  if (
    queryIssues.includes("VAT_REFUND") &&
    (docIssues.includes("VAT_LIABILITY") || docIssues.includes("VAT_DEFINITION")) &&
    !queryIssues.includes("VAT_LIABILITY") &&
    !queryIssues.includes("VAT_DEFINITION")
  ) {
    return true;
  }

  if (
    queryIssues.includes("WITHHOLDING") &&
    (docIssues.includes("VAT_REFUND") ||
      docIssues.includes("VAT_LIABILITY") ||
      docIssues.includes("VAT_DEFINITION")) &&
    !queryIssues.includes("VAT_LIABILITY") &&
    !queryIssues.includes("VAT_DEFINITION")
  ) {
    return true;
  }

  return false;
}

function hasIssueOverlap(queryIssues = [], docIssues = []) {
  if (!queryIssues.length || !docIssues.length) return true;
  return queryIssues.some((issue) => docIssues.includes(issue));
}

function authorityWeight(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const weights = {
    CONSTITUTION: 100,
    STATUTE: 98,
    NIRC: 98,
    TAX_CODE: 98,
    TAX_TREATY: 96,
    SUPREME_COURT: 94,
    CTA_EN_BANC: 82,
    CTA_DIVISION: 76,
    COURT_OF_APPEALS: 72,
    RR: 70,
    RMC: 60,
    RMO: 58,
    RAMO: 56,
    BIR_RULING: 48,
    PFRS: 38,
    PAS: 38,
    PSA: 34,
    LGU: 32,
    BOC_ISSUANCE: 32,
    OECD_GUIDANCE: 20,
    SECONDARY: 5,
    UNKNOWN: 0
  };

  return weights[type] ?? 0;
}

function extractExactReferenceSignals(text = "") {
  const value = normalizeText(text);
  const signals = [];

  for (const match of value.matchAll(/\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/gi)) {
    signals.push(`RA_${match[1]}`);
  }

  for (const match of value.matchAll(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*(105|106|107|108|109|110|111|112|113|114|115)\b/gi)) {
    signals.push(`NIRC_SEC_${match[1]}`);
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/gi]
  ];

  for (const [prefix, regex] of issuancePatterns) {
    for (const match of value.matchAll(regex)) {
      signals.push(`${prefix}_${String(match[1]).replace(/^0+/, "")}_${match[2]}`);
    }
  }

  for (const match of value.matchAll(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/gi)) {
    signals.push(`GR_${String(match[1]).toUpperCase()}`);
  }

  return unique(signals);
}

function exactReferenceBonus(query = "", doc = {}, classification = null) {
  const queryRefs = unique([
    ...extractExactReferenceSignals(query),
    ...safeArray(classification?.authoritySearchTerms).flatMap(extractExactReferenceSignals)
  ]);

  const haystackRaw = docText(doc);
  const haystack = lower(haystackRaw).replace(/[^a-z0-9]+/g, "_");

  let bonus = 0;

  for (const ref of queryRefs) {
    const normalizedRef = lower(ref).replace(/[^a-z0-9]+/g, "_");
    if (haystack.includes(normalizedRef)) bonus += 120;
  }

  for (const term of safeArray(classification?.authoritySearchTerms)) {
    const normalizedTerm = lower(term);
    const normalizedVariant = lower(normalizeAuthoritySearchTerm(term));

    if (normalizedTerm && lower(haystackRaw).includes(normalizedTerm)) {
      bonus += 110;
    }

    if (normalizedVariant && lower(haystackRaw).includes(normalizedVariant)) {
      bonus += 95;
    }
  }

  return bonus;
}

function docTargetAuthorityMatch(classification = {}, doc = {}) {
  const targets = normalizeTargetAuthorities(classification.targetAuthorities);

  if (!targets.length) return false;

  return targets.includes(getAuthorityTypeForDoc(doc));
}

function issueClassificationCompatible(classification = {}, doc = {}) {
  try {
    const result = isIssueClassificationCompatibleWithDoc(classification, doc);
    return result !== false;
  } catch {
    const docIssues = detectDocIssueType(doc).map(normalizeIssue);
    const queryIssues = safeArray(classification.subIssues)
      .map(normalizeIssue)
      .filter(Boolean);

    if (!queryIssues.length || !docIssues.length) return true;

    if (hasIssueMismatch(queryIssues, docIssues)) return false;

    return hasIssueOverlap(queryIssues, docIssues);
  }
}

function targetAuthorityBonus(classification = {}, doc = {}) {
  const targetTypes = normalizeTargetAuthorities(classification.targetAuthorities);

  if (!targetTypes.length) return 0;

  const docType = getAuthorityTypeForDoc(doc);
  const haystack = lower(docText(doc));

  let bonus = 0;

  if (targetTypes.includes(docType)) bonus += 75;

  for (const target of targetTypes) {
    const normalized = lower(String(target).replace(/_/g, " "));
    if (normalized && haystack.includes(normalized)) bonus += 10;
  }

  for (const term of safeArray(classification.authoritySearchTerms)) {
    const normalized = lower(term);
    if (normalized && haystack.includes(normalized)) bonus += 80;
  }

  return bonus;
}

function buildIssueClassificationMatch(query = "", classification = {}, doc = {}) {
  const docIssues = detectDocIssueType(doc)
    .map(normalizeIssue)
    .filter(Boolean);

  const queryIssues = unique([
    normalizeIssue(classification.primaryIssue),
    normalizeIssue(classification.primaryDomain),
    ...safeArray(classification.subIssues).map(normalizeIssue),
    ...safeArray(classification.taxDomainClassification?.subIssues).map(normalizeIssue)
  ]).filter(Boolean);

  const issueMismatch = hasIssueMismatch(queryIssues, docIssues);
  const issueOverlap = hasIssueOverlap(queryIssues, docIssues);

  const compatible =
    issueClassificationCompatible(classification, doc) && !issueMismatch;

  const targetAuthorityMatch = docTargetAuthorityMatch(classification, doc);

  const exactAuthorityMatch =
    exactReferenceBonus(query, doc, classification) > 0;

  return {
    matched:
      compatible &&
      (issueOverlap ||
        targetAuthorityMatch ||
        exactAuthorityMatch ||
        !docIssues.length),

    compatible,
    issueOverlap,
    issueMismatch,
    targetAuthorityMatch,
    exactAuthorityMatch,

    primaryDomain: classification.primaryDomain || null,
    primaryIssue: classification.primaryIssue || null,
    subIssue: classification.subIssue || null,
    subIssues: classification.subIssues || [],
    legalDimensions: classification.legalDimensions || [],
    retrievalStrategy: classification.retrievalStrategy || null,
    targetAuthorities: classification.targetAuthorities || [],
    authoritySearchTerms: classification.authoritySearchTerms || [],
    docIssues,
    docAuthorityType: getAuthorityTypeForDoc(doc)
  };
}

function issueClassificationBonus(query = "", classification = {}, doc = {}) {
  if (!classification?.primaryIssue) return 0;

  const match = buildIssueClassificationMatch(query, classification, doc);

  if (match.issueMismatch || match.compatible === false) {
    return -150;
  }

  const haystack = lower(docText(doc));

  let bonus = 0;

  if (match.issueOverlap) bonus += 60;
  if (match.targetAuthorityMatch) bonus += 75;
  if (match.exactAuthorityMatch) bonus += 120;

  if (classification.primaryDomain) {
    const domainTerm = lower(
      String(classification.primaryDomain).replace(/_/g, " ")
    );

    if (domainTerm && haystack.includes(domainTerm)) {
      bonus += 15;
    }
  }

  if (classification.primaryIssue) {
    const issueTerm = lower(
      String(classification.primaryIssue).replace(/_/g, " ")
    );

    if (issueTerm && haystack.includes(issueTerm)) {
      bonus += 15;
    }
  }

  for (const issue of safeArray(classification.subIssues)) {
    const term = lower(String(issue).replace(/_/g, " "));

    if (term.length >= 3 && haystack.includes(term)) {
      bonus += 10;
    }
  }

  for (const term of safeArray(classification.keyTerms)) {
    const normalized = lower(String(term).replace(/_/g, " "));

    if (normalized && haystack.includes(normalized)) {
      bonus += 8;
    }
  }

  if (
    classification.retrievalControls
      ?.suppressVatRefundCasesUnlessRefundIssue
  ) {
    if (
      /\bvat refund\b|\bsection 112\b|\b120\+30\b|\bunutilized input vat\b|\bexcess input vat\b/i.test(
        haystack
      )
    ) {
      bonus -= 95;
    }
  }

  if (isGoogleDriveIndexedSource(doc)) {
    bonus += 20;
  }

  return bonus;
}

function issueWeight(query = "", doc = {}, classification = null) {
  const queryIssues = classification?.subIssues?.length
    ? classification.subIssues
        .map(normalizeIssue)
        .filter(Boolean)
    : detectIssueType(query)
        .map(normalizeIssue)
        .filter(Boolean);

  const docIssues = detectDocIssueType(doc)
    .map(normalizeIssue)
    .filter(Boolean);

  if (classification && !issueClassificationCompatible(classification, doc)) {
    return -120;
  }

  if (hasIssueMismatch(queryIssues, docIssues)) {
    return -80;
  }

  if (hasIssueOverlap(queryIssues, docIssues)) {
    return 35;
  }

  return 0;
}

function weakSourcePenalty(doc = {}, allowReviewMaterials = false) {
  if (allowReviewMaterials) return 0;

  return isHiddenOrWeakSource(doc) ? -100 : 0;
}

function adaptiveModeBonus({
  mode = "STANDARD",
  doc = {},
  classification = null
}) {
  const normalizedMode = normalizeMode(mode);

  const authority = getAuthorityTypeForDoc(doc);
  const text = lower(docText(doc));

  let bonus = 0;

  if (normalizedMode === "LITIGATION" && authority === "SUPREME_COURT") {
    bonus += 55;
  }

  if (normalizedMode === "TECHNICAL" && authority === "SUPREME_COURT") {
    bonus += 42;
  }

  if (normalizedMode === "AUDIT") {
    if (
      /\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b|\baudit\b/i.test(
        text
      )
    ) {
      bonus += 45;
    }

    if (["STATUTE", "RR", "RMC"].includes(authority)) {
      bonus += 25;
    }
  }

  if (normalizedMode === "TRANSACTION") {
    if (
      /\bprincipal\b|\bagent\b|\breimbursement\b|\bpass-through\b|\bgross\b|\bnet\b|\beconomic substance\b|\bbundled\b/i.test(
        text
      )
    ) {
      bonus += 50;
    }

    if (authority === "RR") {
      bonus += 28;
    }
  }

  if (normalizedMode === "CONTRACT") {
    if (
      /\bcontract\b|\bagreement\b|\bclause\b|\blease\b|\bconcession\b/i.test(
        text
      )
    ) {
      bonus += 48;
    }

    if (authority === "SUPREME_COURT") {
      bonus += 24;
    }
  }

  if (normalizedMode === "EVIDENCE_HEAVY") {
    if (
      /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(
        text
      )
    ) {
      bonus += 50;
    }
  }

  if (classification?.retrievalStrategy) {
    const strategy = lower(classification.retrievalStrategy);

    if (
      strategy.includes("foundational") ||
      strategy.includes("definition")
    ) {
      if (
        ["STATUTE", "NIRC", "TAX_CODE", "RR", "SUPREME_COURT"].includes(
          authority
        )
      ) {
        bonus += 30;
      }
    }

    if (strategy.includes("procedural")) {
      if (
        [
          "STATUTE",
          "RR",
          "RMC",
          "RMO",
          "SUPREME_COURT",
          "CTA_EN_BANC"
        ].includes(authority)
      ) {
        bonus += 24;
      }
    }

    if (strategy.includes("jurisprudential")) {
      if (
        [
          "SUPREME_COURT",
          "CTA_EN_BANC",
          "CTA_DIVISION",
          "COURT_OF_APPEALS"
        ].includes(authority)
      ) {
        bonus += 35;
      }
    }

    // FIXED BUGGED LINE
    if (
      strategy.includes("fact") ||
      strategy.includes("transaction") ||
      strategy.includes("substance")
    ) {
      if (
        /\bfacts\b|\btransaction\b|\bcontract\b|\bactual\b|\bevidence\b|\bsubstance\b/i.test(
          text
        )
      ) {
        bonus += 28;
      }
    }
  }

  return bonus;
}

function computeRetrievalScore({
  query = "",
  doc = {},
  adaptiveMode = "STANDARD",
  issueClassification = null,
  allowReviewMaterials = false
}) {
  const baseScore = Number(
    doc.rerankScore ??
      doc.retrievalScore ??
      doc.retrieval_score ??
      doc.finalScore ??
      doc.final_score ??
      doc.combined_score ??
      doc.score ??
      doc.similarity ??
      0
  );

  const hierarchyScore = authorityWeight(doc);

  const issueScore = issueWeight(
    query,
    doc,
    issueClassification
  );

  const classificationScore = issueClassificationBonus(
    query,
    issueClassification,
    doc
  );

  const weakPenalty = weakSourcePenalty(
    doc,
    allowReviewMaterials
  );

  const citationBonus = exactReferenceBonus(
    query,
    doc,
    issueClassification
  );

  const level = getAuthorityLevelForDoc(doc);

  const precedence = getControllingPrecedenceForDoc(doc);

  const levelBonus =
    level <= 3
      ? 38
      : level <= 8
      ? 24
      : level <= 12
      ? 10
      : 0;

  const precedenceBonus =
    precedence <= 5
      ? 24
      : precedence <= 9
      ? 12
      : 0;

  const driveBonus = isGoogleDriveIndexedSource(doc)
    ? 18
    : 0;

  const phaseBonus =
    doc.retrievalPhase === "EXACT_AUTHORITY"
      ? 80
      : doc.retrievalPhase === "NORMALIZED_AUTHORITY"
      ? 45
      : doc.retrievalPhase === "SEMANTIC_FALLBACK"
      ? 0
      : 0;

  const modeBonus = adaptiveModeBonus({
    mode: adaptiveMode,
    doc,
    classification: issueClassification
  });

  const supersessionPenalty = isSupersededDoc(doc)
    ? -150
    : 0;

  return Number(
    (
      baseScore * 0.2 +
      hierarchyScore * 0.3 +
      citationBonus * 0.2 +
      classificationScore +
      issueScore +
      levelBonus +
      precedenceBonus +
      modeBonus +
      driveBonus +
      phaseBonus +
      weakPenalty +
      supersessionPenalty
    ).toFixed(4)
  );
}

export {
  ENGINE_VERSION,
  normalizeMode,
  detectIssueType,
  detectDocIssueType,
  computeRetrievalScore,
  sanitizeRetrievedSource
};

export default {
  ENGINE_VERSION,
  normalizeMode,
  detectIssueType,
  detectDocIssueType,
  computeRetrievalScore,
  sanitizeRetrievedSource
};
