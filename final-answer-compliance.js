// FILE: answer-renderer.js
"use strict";

/**
 * TINA Answer Renderer
 * Version: 6.0.0
 *
 * Rendering-only layer:
 * - no OpenAI calls
 * - no prompt assembly
 * - no retrieval
 * - no reranking
 * - no legal reasoning generation
 * - no citation-engine replacement
 * - no final-answer-compliance replacement
 *
 * Owns:
 * - final answer presentation
 * - section formatting
 * - heading normalization
 * - authority/source presentation
 * - reviewer-mode presentation
 * - audit/fact-pattern presentation
 * - compact readable output
 */

const ENGINE_VERSION = "6.0.0";

const ORCHESTRATION_MODES = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM",
  REVIEWER: "REVIEWER",
  REVIEW_MODE: "REVIEW_MODE",
  QUIZ_MODE: "QUIZ_MODE",
  AUDIT_FACT_PATTERN: "AUDIT_FACT_PATTERN",
  FACT_PATTERN: "FACT_PATTERN"
});

const STANDARD_LEGAL_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const SIMPLE_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. PRACTICAL NOTE"
]);

const AUDIT_FACT_PATTERN_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. FACTS / ASSUMPTIONS",
  "C. CONTROLLING LEGAL BASIS",
  "D. ANALYSIS",
  "E. AUDIT / TAX RISK",
  "F. DOCUMENTARY GAPS",
  "G. PRACTICAL POSITION"
]);

const REVIEWER_HEADINGS = Object.freeze([
  "A. QUESTION",
  "B. SUGGESTED ANSWER",
  "C. CONTROLLING BASIS",
  "D. MEMORY AID / DOCTRINE",
  "E. TRAP / DISTINCTION"
]);

const LEGACY_TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const TINA_AF_HEADINGS = STANDARD_LEGAL_HEADINGS;

const FALLBACK_TEMPLATES = Object.freeze({
  FAST_DEFINITION: SIMPLE_HEADINGS,
  STANDARD_TAX: STANDARD_LEGAL_HEADINGS,
  LEGAL_ANALYSIS: STANDARD_LEGAL_HEADINGS,
  COMPLEX_ADVISORY: AUDIT_FACT_PATTERN_HEADINGS,
  EMERGENCY_TRIM: [
    "A. DIRECT ANSWER",
    "B. LIMITED BASIS"
  ],
  REVIEWER: REVIEWER_HEADINGS,
  REVIEW_MODE: REVIEWER_HEADINGS,
  QUIZ_MODE: REVIEWER_HEADINGS,
  AUDIT_FACT_PATTERN: AUDIT_FACT_PATTERN_HEADINGS,
  FACT_PATTERN: AUDIT_FACT_PATTERN_HEADINGS,

  QUICK: SIMPLE_HEADINGS,
  STANDARD: STANDARD_LEGAL_HEADINGS,
  TECHNICAL: STANDARD_LEGAL_HEADINGS,
  AUDIT: AUDIT_FACT_PATTERN_HEADINGS,
  LITIGATION: [
    "A. DIRECT ANSWER",
    "B. ISSUE FOR RESOLUTION",
    "C. CONTROLLING LEGAL BASIS",
    "D. SUPPORTING JURISPRUDENCE",
    "E. BIR / OPPOSING POSITION",
    "F. TAXPAYER DEFENSE",
    "G. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    "H. CONCLUSION"
  ],
  CONTRACT: [
    "A. DIRECT ANSWER",
    "B. CONTRACT PARTIES AND OBJECT",
    "C. RIGHTS AND OBLIGATIONS",
    "D. CONSIDERATION / BILLING / COLLECTION",
    "E. CONTROL AND RISK ALLOCATION",
    "F. TAX CLAUSES / LEGAL CONSEQUENCES",
    "G. DOCUMENTARY GAPS",
    "H. RECOMMENDED POSITION"
  ],
  TRANSACTION: [
    "A. DIRECT ANSWER",
    "B. LEGAL FORM",
    "C. ECONOMIC SUBSTANCE",
    "D. TRANSACTION FLOW",
    "E. PRINCIPAL VS AGENT / CONTROL ANALYSIS",
    "F. TAX AND ACCOUNTING CHARACTERIZATION",
    "G. BIR / AUDIT RISK",
    "H. DOCUMENTATION REQUIRED"
  ],
  EVIDENCE_HEAVY: [
    "A. DIRECT ANSWER",
    "B. ASSERTED FACTS",
    "C. DOCUMENTED FACTS",
    "D. UNSUPPORTED / CONTRADICTORY FACTS",
    "E. MISSING DOCUMENTS",
    "F. AUDIT-SENSITIVE ITEMS",
    "G. CONCLUSION SUBJECT TO VERIFICATION"
  ]
});

const AUTHORITY_GROUP_ORDER = Object.freeze([
  "CONTROLLING",
  "STATUTES",
  "TREATIES",
  "JURISPRUDENCE",
  "REGULATIONS",
  "ADMINISTRATIVE",
  "BIR_RULINGS",
  "TECHNICAL",
  "REVIEWER_MATERIALS",
  "OTHER"
]);

const AUTHORITY_GROUP_LABELS = Object.freeze({
  CONTROLLING: "Controlling Authorities",
  STATUTES: "Statutes / Tax Code / Republic Acts",
  TREATIES: "Tax Treaties",
  JURISPRUDENCE: "Supporting Jurisprudence",
  REGULATIONS: "Revenue Regulations",
  ADMINISTRATIVE: "Administrative Issuances",
  BIR_RULINGS: "BIR Rulings",
  TECHNICAL: "Technical / Persuasive Authorities",
  REVIEWER_MATERIALS: "Reviewer / Secondary Materials",
  OTHER: "Other Sources"
});

const AUTHORITY_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,
  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  REPUBLIC_ACT: 2,
  RA: 2,
  CMTA: 2,
  LGC: 2,
  TAX_TREATY: 3,
  TREATY: 3,
  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,
  JURISPRUDENCE: 5,
  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  CTA: 7,
  RR: 8,
  RMC: 9,
  RMO: 9,
  RAMO: 9,
  BIR_RULING: 10,
  ADMINISTRATIVE_GUIDANCE: 11,
  TECHNICAL_GUIDANCE: 11,
  BOC_ISSUANCE: 11,
  LGU_ORDINANCE: 11,
  OECD: 12,
  FOREIGN_AUTHORITY: 12,
  PFRS: 13,
  PAS: 13,
  PSA: 13,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,
  UNKNOWN: 99
});

const REVIEW_FOLDER_PATTERNS = Object.freeze([
  "07_CPA_NOTES",
  "08_REVIEW_MATERIALS",
  "CPA_NOTES",
  "REVIEW_MATERIALS",
  "review materials",
  "reviewer",
  "cpa notes"
]);

const RAW_PAYLOAD_PATTERNS = Object.freeze([
  /```json[\s\S]*?```/gi,
  /\braw retrieval payload\b[\s\S]*$/gi,
  /\bretrieval payload\b[\s\S]*$/gi,
  /\braw context\b[\s\S]*$/gi,
  /\bdebug\b[\s\S]*$/gi,
  /\bjson dump\b[\s\S]*$/gi,
  /\bembeddings?\b[\s\S]*$/gi,
  /\bquery_embedding\b[\s\S]*$/gi,
  /\bmetadata\s*:\s*\{[\s\S]*?\}\s*$/gi,
  /\bsupabase row\b[\s\S]*$/gi,
  /\bCLASSIFICATION CONTROL\b[\s\S]*$/gi,
  /\bSupersession Audit\b[\s\S]*$/gi,
  /\bSYSTEM PROMPT\b[\s\S]*$/gi,
  /\bDEVELOPER MESSAGE\b[\s\S]*$/gi,
  /\bAPI_KEY\b[\s\S]*$/gi,
  /\baccess_token\b[\s\S]*$/gi,
  /\brefresh_token\b[\s\S]*$/gi
]);

const MAX_VISIBLE_SOURCES = 5;
const MAX_SOURCE_TITLE_CHARS = 220;
const MAX_SOURCE_LINE_CHARS = 320;
const MAX_SECTION_BODY_CHARS = 3500;
const MAX_RENDERED_CHARS = 16000;

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function uniqueBy(items = [], getKey = (item) => item) {
  const seen = new Set();
  const output = [];

  for (const item of safeArray(items)) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function trimText(value = "", max = 1000) {
  const text = compactSpaces(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function trimBlock(value = "", max = MAX_SECTION_BODY_CHARS) {
  const text = normalizeText(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()}\n...[trimmed for readability]`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAuthorityCode(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    CASE_LAW: "SUPREME_COURT",
    COURT_CASES: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",
    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS",
    REVIEWER: "REVIEW_MATERIALS",
    SECONDARY_SOURCE: "SECONDARY"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function authorityTypeOf(source = {}) {
  return normalizeAuthorityCode(
    source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      source.authority_label ||
      source.metadata?.authorityType ||
      source.metadata?.authority_type ||
      "UNKNOWN"
  );
}

function authorityLevelOf(source = {}) {
  const explicit = Number(
    source.authorityLevel ??
      source.authority_level ??
      source.metadata?.authorityLevel ??
      source.metadata?.authority_level
  );

  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  return Number(AUTHORITY_PRECEDENCE[authorityTypeOf(source)] || AUTHORITY_PRECEDENCE.UNKNOWN);
}

function sourcePrecedence(source = {}) {
  const explicit = Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.metadata?.controllingPrecedence ??
      source.metadata?.controlling_precedence
  );

  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  return authorityLevelOf(source);
}

function sourceScore(source = {}) {
  return Number(
    source.finalScore ||
      source.final_score ||
      source.rerankScore ||
      source.rerank_score ||
      source.retrievalScore ||
      source.retrieval_score ||
      source.score ||
      source.similarity ||
      0
  );
}

function sourceTitleOf(source = {}) {
  return (
    source.title ||
    source.sourceTitle ||
    source.source_title ||
    source.documentTitle ||
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.document_title ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    source.path ||
    source.metadata?.path ||
    "Untitled Source"
  );
}

function sourcePathOf(source = {}) {
  return (
    source.folderPath ||
    source.folder_path ||
    source.sourcePath ||
    source.source_path ||
    source.path ||
    source.metadata?.folderPath ||
    source.metadata?.folder_path ||
    source.metadata?.path ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    ""
  );
}

function sourceReferenceOf(source = {}) {
  return (
    source.citation ||
    source.reference ||
    source.normalizedReference ||
    source.normalized_reference ||
    source.metadata?.normalizedReference ||
    source.metadata?.normalized_reference ||
    source.issuanceNumber ||
    source.issuance_number ||
    ""
  );
}

function sourceUrlOf(source = {}) {
  return (
    source.url ||
    source.driveViewUrl ||
    source.drive_view_url ||
    source.sourceUrl ||
    source.source_url ||
    source.metadata?.url ||
    source.metadata?.driveViewUrl ||
    source.metadata?.drive_view_url ||
    ""
  );
}

function isIssueMatched(source = {}) {
  if (source.issueMismatch === true || source.issueClassificationMatch?.issueMismatch === true) return false;
  if (source.issueClassificationMatch === true) return true;
  if (source.issue_classification_match === true) return true;
  if (source.issueClassificationMatch?.matched === true) return true;
  if (source.issueClassificationMatch?.issueOverlap === true) return true;
  if (source.issueClassificationMatch?.targetAuthorityMatch === true) return true;
  if (source.metadata?.issueClassificationMatch === true) return true;
  return null;
}

function isTargetAuthorityMatched(source = {}) {
  return Boolean(
    source.targetAuthorityMatch === true ||
      source.target_authority_match === true ||
      source.issueClassificationMatch?.targetAuthorityMatch === true ||
      source.metadata?.targetAuthorityMatch === true
  );
}

function isHiddenSource(source = {}) {
  return Boolean(
    source.hidden === true ||
      source.visible === false ||
      source.sourceVisible === false ||
      source.source_visible === false ||
      source.visibility === "hidden" ||
      source.metadata?.hidden === true ||
      source.metadata?.visible === false ||
      source.metadata?.sourceVisible === false
  );
}

function isReviewOrSecondarySource(source = {}) {
  const type = authorityTypeOf(source);
  if (["CPA_NOTES", "REVIEW_MATERIALS", "SECONDARY"].includes(type)) return true;

  const blob = `${sourcePathOf(source)} ${sourceTitleOf(source)}`.toUpperCase();
  return REVIEW_FOLDER_PATTERNS.some((pattern) =>
    blob.includes(String(pattern).toUpperCase())
  );
}

function isReviewMode(input = {}) {
  const mode = String(
    input.mode ||
      input.contextMode ||
      input.orchestrationMode ||
      input.responseMode ||
      input.metadata?.mode ||
      input.metadata?.orchestrationMode ||
      input.issueClassification?.responseMode ||
      input.issueClassification?.orchestrationMode ||
      input.issueClassification?.queryIntent?.intent ||
      ""
  ).toUpperCase();

  const query = String(input.query || input.originalQuery || "").toLowerCase();

  return Boolean(
    input.reviewMode === true ||
      input.reviewerMode === true ||
      input.requiresReviewMode === true ||
      input.requiresQuizMode === true ||
      input.issueClassification?.requiresReviewMode === true ||
      input.issueClassification?.queryIntent?.requiresReviewMode === true ||
      input.issueClassification?.queryIntent?.requiresQuizMode === true ||
      ["TAX_REVIEWER", "REVIEW_MODE", "REVIEWER", "QUIZ_MODE", "LEARNING_MODE", "ASSESSMENT"].includes(mode) ||
      query.includes("/review")
  );
}

function sourceAllowed(source = {}, input = {}) {
  if (!source) return false;
  if (isHiddenSource(source) && !input.includeHiddenSources) return false;
  if (isReviewOrSecondarySource(source) && !isReviewMode(input)) return false;
  if (source.issueMismatch === true) return false;
  if (source.issueClassificationMatch?.issueMismatch === true) return false;
  return true;
}

function normalizeSourceKey(source = {}) {
  return [
    source.fileId,
    source.file_id,
    source.id,
    source.citation,
    source.reference,
    source.normalizedReference,
    source.normalized_reference,
    source.title,
    source.documentTitle,
    source.document_title,
    source.source,
    source.sourcePath,
    source.source_path,
    source.path,
    source.url
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeSources(sources = []) {
  return uniqueBy(safeArray(sources), normalizeSourceKey);
}

function sortVisibleSources(sources = [], input = {}) {
  return dedupeSources(sources)
    .filter((source) => sourceAllowed(source, input))
    .sort((a, b) => {
      const targetDiff = Number(isTargetAuthorityMatched(b)) - Number(isTargetAuthorityMatched(a));
      if (targetDiff !== 0) return targetDiff;

      const aIssue = isIssueMatched(a);
      const bIssue = isIssueMatched(b);
      if (aIssue !== bIssue) return Number(bIssue === true) - Number(aIssue === true);

      const precedenceDiff = sourcePrecedence(a) - sourcePrecedence(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      const levelDiff = authorityLevelOf(a) - authorityLevelOf(b);
      if (levelDiff !== 0) return levelDiff;

      return sourceScore(b) - sourceScore(a);
    });
}
function compactSource(source = {}) {
  const title = trimText(sourceTitleOf(source), MAX_SOURCE_TITLE_CHARS);
  const citation = trimText(sourceReferenceOf(source), MAX_SOURCE_LINE_CHARS);
  const url = trimText(sourceUrlOf(source), MAX_SOURCE_LINE_CHARS);
  const type = authorityTypeOf(source);

  return {
    title,
    citation,
    url,
    authorityType: type,
    authorityLevel: authorityLevelOf(source),
    controllingPrecedence: sourcePrecedence(source),
    score: sourceScore(source),
    issueClassificationMatch: isIssueMatched(source),
    targetAuthorityMatch: isTargetAuthorityMatched(source),
    reviewMaterial: isReviewOrSecondarySource(source)
  };
}

function authorityGroupOf(source = {}, role = "") {
  const type = authorityTypeOf(source);
  const normalizedRole = String(role || "").toUpperCase();

  if (
    normalizedRole === "CONTROLLING" ||
    source.isControllingAuthority === true ||
    source.controlling === true ||
    source.metadata?.isControllingAuthority === true
  ) {
    return "CONTROLLING";
  }

  if (["CONSTITUTION", "STATUTE", "NIRC", "TAX_CODE", "REPUBLIC_ACT", "RA", "CMTA", "LGC"].includes(type)) {
    return "STATUTES";
  }

  if (["TAX_TREATY", "TREATY"].includes(type)) return "TREATIES";

  if ([
    "SUPREME_COURT_EN_BANC",
    "SUPREME_COURT",
    "SC",
    "JURISPRUDENCE",
    "CTA_EN_BANC",
    "CTA_DIVISION",
    "CTA"
  ].includes(type)) {
    return "JURISPRUDENCE";
  }

  if (type === "RR") return "REGULATIONS";
  if (["RMC", "RMO", "RAMO", "ADMINISTRATIVE_GUIDANCE", "BOC_ISSUANCE", "LGU_ORDINANCE"].includes(type)) return "ADMINISTRATIVE";
  if (type === "BIR_RULING") return "BIR_RULINGS";
  if (["OECD", "FOREIGN_AUTHORITY", "PFRS", "PAS", "PSA", "TECHNICAL_GUIDANCE"].includes(type)) return "TECHNICAL";
  if (["CPA_NOTES", "REVIEW_MATERIALS", "SECONDARY"].includes(type)) return "REVIEWER_MATERIALS";

  return "OTHER";
}

function groupSourcesByAuthority(sources = [], input = {}) {
  const groups = {};

  for (const source of sortVisibleSources(sources, input)) {
    const role =
      source.citationRole ||
      source.citation_role ||
      source.authorityRole ||
      source.authority_role ||
      "";

    const group = authorityGroupOf(source, role);

    if (!groups[group]) {
      groups[group] = {
        code: group,
        label: AUTHORITY_GROUP_LABELS[group] || group,
        items: []
      };
    }

    groups[group].items.push(source);
  }

  return AUTHORITY_GROUP_ORDER
    .filter((code) => groups[code]?.items?.length)
    .map((code) => groups[code]);
}

function formatSourceLine(source = {}, options = {}) {
  const compact = compactSource(source);
  const parts = [];

  if (compact.citation) {
    parts.push(compact.citation);
  }

  if (compact.title && !compact.citation.includes(compact.title)) {
    parts.push(compact.title);
  }

  const base = parts.length ? parts.join(" – ") : compact.title || "Untitled source";
  const type = compact.authorityType && compact.authorityType !== "UNKNOWN"
    ? ` [${compact.authorityType}]`
    : "";

  const matchTag = options.includeMatchTags
    ? compact.targetAuthorityMatch
      ? " [Target authority match]"
      : compact.issueClassificationMatch === true
        ? " [Issue match]"
        : ""
    : "";

  return trimText(`${base}${type}${matchTag}`, MAX_SOURCE_LINE_CHARS);
}

export function renderAuthorityList(sources = [], options = {}) {
  const input = options.context || options;
  const maxItems = Number(options.maxItems || MAX_VISIBLE_SOURCES);
  const grouped = options.grouped !== false;

  const visible = sortVisibleSources(sources, input).slice(0, maxItems);

  if (!visible.length) {
    return options.emptyText || "Indexed source not found.";
  }

  if (!grouped) {
    return visible.map((source) => `- ${formatSourceLine(source, options)}`).join("\n");
  }

  const groups = groupSourcesByAuthority(visible, input);

  return groups
    .map((group) => {
      const lines = [group.label];

      for (const source of group.items.slice(0, maxItems)) {
        lines.push(`- ${formatSourceLine(source, options)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function renderPracticalNote(value = "", options = {}) {
  const text = normalizeText(value);

  if (!text) {
    return options.emptyText || "Verify the latest controlling authority and supporting documents before relying on the position.";
  }

  const lines = splitSentencesOrBullets(text).slice(0, options.maxItems || 5);

  return lines.length <= 1
    ? trimBlock(lines[0] || text, 1200)
    : lines.map((line) => `- ${trimText(line, 500)}`).join("\n");
}

function splitSentencesOrBullets(text = "") {
  const clean = normalizeText(text);
  if (!clean) return [];

  const lines = clean
    .split("\n")
    .map((line) => line.replace(/^[\-\u2022*\d.)\s]+/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) return lines;

  return (clean.match(/[^.!?]+[.!?]?/g) || [clean])
    .map((part) => part.trim())
    .filter(Boolean);
}

function sectionBodyFromObject(input = {}, heading = "") {
  const key = heading
    .replace(/^[A-Z]\.\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const candidates = [
    input.sections?.[heading],
    input.sections?.[key],
    input.sectionMap?.[heading],
    input.sectionMap?.[key],
    input.answerSections?.[heading],
    input.answerSections?.[key],
    input.structuredAnswer?.[heading],
    input.structuredAnswer?.[key],
    input.taxEngineAnswer?.sections?.[heading],
    input.taxEngineAnswer?.sections?.[key],
    input.responsePlan?.sections?.[heading],
    input.responsePlan?.sections?.[key]
  ];

  for (const item of candidates) {
    if (typeof item === "string" && normalizeText(item)) return normalizeText(item);
    if (Array.isArray(item) && item.length) return item.map(String).join("\n");
  }

  return "";
}

function defaultBodyForHeading(heading = "", input = {}) {
  const normalized = heading.replace(/^[A-Z]\.\s*/, "").toUpperCase();

  if (/DIRECT ANSWER|EXECUTIVE ANSWER|SUGGESTED ANSWER|QUESTION/.test(normalized)) {
    return (
      input.directAnswer ||
      input.suggestedAnswer ||
      input.question ||
      input.fallbackAnswer ||
      "No direct answer was rendered."
    );
  }

  if (/CONTROLLING LEGAL BASIS|LEGAL BASIS|CONTROLLING BASIS|SHORT BASIS|LIMITED BASIS/.test(normalized)) {
    const sources = [
      ...safeArray(input.controllingAuthorities),
      ...safeArray(input.legalBasis),
      ...safeArray(input.legalBasisDocs),
      ...safeArray(input.citations)
    ];

    return sources.length
      ? renderAuthorityList(sources, { ...input, grouped: true })
      : "Indexed source not found.";
  }

  if (/SUPPORTING RULES|ADMINISTRATIVE ISSUANCES|SUPPORTING AUTHORITIES/.test(normalized)) {
    const sources = [
      ...safeArray(input.supportingAuthorities),
      ...safeArray(input.adminAuthorities),
      ...safeArray(input.legalBasisDocs)
    ];

    return sources.length
      ? renderAuthorityList(sources, { ...input, grouped: true })
      : "Indexed source not found.";
  }

  if (/SUPPORTING JURISPRUDENCE|JURISPRUDENCE|COURT POSITION/.test(normalized)) {
    const sources = [
      ...safeArray(input.supportingJurisprudence),
      ...safeArray(input.jurisprudencePayload?.directlyRelevantCases),
      ...safeArray(input.jurisprudencePayload?.cases)
    ];

    return sources.length
      ? renderAuthorityList(sources, { ...input, grouped: true })
      : "No directly issue-matched jurisprudence was retrieved from the indexed context.";
  }

  if (/CONFLICT|DOCTRINAL STATUS/.test(normalized)) {
    return renderConflictAnalysis(getConflictMetadata(input), input);
  }

  if (/PRACTICAL NOTE|PRACTICAL APPLICATION|PRACTICAL POSITION|RECOMMENDED POSITION|CONCLUSION/.test(normalized)) {
    return renderPracticalNote(
      input.practicalNote ||
        input.professionalInsight ||
        input.recommendedAction ||
        input.fallbackAnswer ||
        "",
      input
    );
  }

  if (/AUDIT|TAX RISK|RISK/.test(normalized)) {
    return renderAuditRisk(input.auditRisk || input.taxRisk || input.riskNotes || "", input);
  }

  if (/DOCUMENTARY GAPS|MISSING DOCUMENTS|DOCUMENTATION REQUIRED|REQUIRED AUDIT EVIDENCE/.test(normalized)) {
    return renderDocumentaryGaps(input.documentaryGaps || input.missingDocuments || input.requiredDocuments || [], input);
  }

  if (/MEMORY AID|DOCTRINE/.test(normalized)) {
    return renderReviewerNote(input.memoryAid || input.doctrineSummary || "", input);
  }

  if (/TRAP|DISTINCTION/.test(normalized)) {
    return renderReviewerNote(input.trap || input.distinction || input.distinctionNote || "", input);
  }

  return `No ${heading.replace(/^[A-Z]\.\s*/, "").toLowerCase()} was rendered.`;
}

function getSectionBody(text = "", heading = "", headings = TINA_AF_HEADINGS) {
  const source = normalizeText(text);
  const index = headings.indexOf(heading);
  if (index < 0) return "";

  const current = escapeRegex(heading);
  const next = headings.slice(index + 1).map(escapeRegex).join("|");

  const regex = next
    ? new RegExp(`${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\b|$)`, "i")
    : new RegExp(`${current}\\s*([\\s\\S]*)$`, "i");

  return normalizeText(source.match(regex)?.[1] || "");
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(String(text || ""));
}

function hasStructure(text = "", headings = TINA_AF_HEADINGS) {
  return safeArray(headings).every((heading) => hasHeading(text, heading));
}

function hasCompleteAFStructure(text = "") {
  return hasStructure(text, TINA_AF_HEADINGS);
}

function hasAnyKnownHeading(text = "") {
  const headings = uniqueBy([
    ...STANDARD_LEGAL_HEADINGS,
    ...SIMPLE_HEADINGS,
    ...AUDIT_FACT_PATTERN_HEADINGS,
    ...REVIEWER_HEADINGS,
    ...LEGACY_TINA_AF_HEADINGS
  ]);

  return headings.some((heading) => hasHeading(text, heading));
}

function normalizeLegacyHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1D. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL NOTE / APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Issue\b/gim, "A. DIRECT ANSWER")
    .replace(/^#+\s*Applicable law.*$/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*BIR position\b/gim, "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/^#+\s*Court position\b/gim, "D. SUPPORTING JURISPRUDENCE")
    .replace(/^#+\s*Conflict flag\b/gim, "E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Legally defensible conclusion\b/gim, "F. PRACTICAL NOTE / APPLICATION")
    .replace(/^#+\s*Taxpayer risk assessment\b/gim, "F. PRACTICAL NOTE / APPLICATION")
    .replace(/^#+\s*Recommended action\b/gim, "F. PRACTICAL NOTE / APPLICATION");
}

function normalizeOrchestrationMode(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  if (Object.values(ORCHESTRATION_MODES).includes(raw)) return raw;
  if (raw.includes("FAST") || raw.includes("QUICK") || raw.includes("DEFINITION")) return "FAST_DEFINITION";
  if (raw.includes("REVIEW") || raw.includes("QUIZ") || raw.includes("LEARNING")) return "REVIEWER";
  if (raw.includes("LEGAL") || raw.includes("DOCTRINE") || raw.includes("JURISPRUDENCE")) return "LEGAL_ANALYSIS";
  if (raw.includes("AUDIT") || raw.includes("FACT") || raw.includes("CONTRACT") || raw.includes("TRANSACTION") || raw.includes("EVIDENCE") || raw.includes("RISK")) return "COMPLEX_ADVISORY";
  if (raw.includes("COMPLEX") || raw.includes("ADVISORY")) return "COMPLEX_ADVISORY";
  if (raw.includes("EMERGENCY")) return "EMERGENCY_TRIM";
  if (raw.includes("STANDARD") || raw.includes("TAX")) return "STANDARD_TAX";
  return null;
}

function getResponseModeFromInput(input = {}) {
  return (
    normalizeOrchestrationMode(
      input.orchestrationMode ||
        input.contextMode ||
        input.mode ||
        input.metadata?.orchestrationMode ||
        input.metadata?.mode ||
        input.responsePlan?.contextMode ||
        input.responsePlan?.orchestrationMode ||
        input.issueClassification?.responseMode ||
        input.issueClassification?.orchestrationMode ||
        ""
    ) ||
    input.responsePlan?.rendererContract?.responseMode ||
    input.responsePlan?.responseMode ||
    input.responseMode ||
    "LEGAL_ANALYSIS"
  );
}

function getHeadingsFromInput(input = {}) {
  const mode = getResponseModeFromInput(input);

  const custom =
    input.requiredAnswerSections ||
    input.answerStructure ||
    input.rendererContract?.sections ||
    input.responsePlan?.rendererContract?.sections ||
    input.responsePlan?.responseTemplate ||
    input.issueClassification?.requiredAnswerSections ||
    input.issueClassification?.answerStructure ||
    input.issueClassification?.taxDomainClassification?.requiredAnswerSections ||
    input.issueClassification?.taxDomainClassification?.answerStructure ||
    null;

  if (Array.isArray(custom) && custom.length) {
    return custom.map((item) => String(item).trim()).filter(Boolean);
  }

  return safeArray(
    FALLBACK_TEMPLATES[mode] ||
      FALLBACK_TEMPLATES.LEGAL_ANALYSIS
  );
}

export function sanitizeRenderedPayload(text = "") {
  let output = String(text || "");

  for (const pattern of RAW_PAYLOAD_PATTERNS) {
    output = output.replace(pattern, "");
  }

  return normalizeText(output)
    .replace(/\n+\s*Sources Used[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*CLASSIFICATION CONTROL[\s\S]*$/i, "")
    .replace(/\n+\s*DEBUG[\s\S]*$/i, "")
    .replace(/\n+\s*RAW CONTEXT[\s\S]*$/i, "")
    .replace(/\n+\s*RETRIEVAL PAYLOAD[\s\S]*$/i, "")
    .replace(/\n+\s*JSON DUMP[\s\S]*$/i, "")
    .trim();
}

function stripRawSourceSections(text = "") {
  return sanitizeRenderedPayload(text);
}

export function renderSection(heading = "", body = "", options = {}) {
  const cleanHeading = normalizeText(heading);
  const cleanBody = trimBlock(body || defaultBodyForHeading(cleanHeading, options));

  if (!cleanHeading) return cleanBody;
  if (!cleanBody && options.skipEmptySections) return "";

  return `${cleanHeading}\n${cleanBody || defaultBodyForHeading(cleanHeading, options)}`.trim();
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS, input = {}) {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));
  const selectedHeadings = safeArray(headings).length ? safeArray(headings) : TINA_AF_HEADINGS;

  if (hasStructure(clean, selectedHeadings)) {
    return selectedHeadings
      .map((heading) => {
        const body =
          getSectionBody(clean, heading, selectedHeadings) ||
          sectionBodyFromObject(input, heading) ||
          defaultBodyForHeading(heading, input);

        return renderSection(heading, body, input);
      })
      .filter(Boolean)
      .join("\n\n");
  }

  const hasAnyHeading = hasAnyKnownHeading(clean);

  return selectedHeadings
    .map((heading, index) => {
      const body =
        getSectionBody(clean, heading, selectedHeadings) ||
        sectionBodyFromObject(input, heading) ||
        (!hasAnyHeading && index === 0 ? clean : "") ||
        defaultBodyForHeading(heading, input);

      return renderSection(heading, body, input);
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  return Boolean(
    conflict.conflict === true &&
      (conflict.conflictType || conflict.type) &&
      (conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.length) &&
      (conflict.exactLegalDimension || conflict.exact_legal_dimension || conflict.sameIssueGate?.sameDimensions?.length || conflict.legalDimension) &&
      (conflict.sameIssueGate?.passed === true || conflict.exactIssue || conflict.exact_issue) &&
      (conflict.oppositeHoldingGate?.passed === true || conflict.oppositeHolding || conflict.oppositeHoldings) &&
      (conflict.resolutionBasis || conflict.resolution_basis || conflict.reason || conflict.controllingAuthority || conflict.controlling_authority || conflict.controllingSource)
  );
}

function buildConflictMetadataBlock(conflict = null) {
  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "Conflict Detected: NO",
      "No direct doctrinal conflict is established by the available conflict metadata.",
      "Treat related authorities as distinguishable or complementary unless same-issue, same-dimension, opposite-holding, and hierarchy-resolution metadata is complete."
    ].join("\n");
  }

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${trimText(conflict.conflictType || conflict.type || "DOCTRINAL_CONFLICT", 160)}`,
    `Exact Issue: ${trimText(conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.join(", ") || "Not specified", 260)}`,
    `Exact Legal Dimension: ${trimText(conflict.exactLegalDimension || conflict.exact_legal_dimension || conflict.sameIssueGate?.sameDimensions?.join(", ") || conflict.legalDimension || "Not specified", 260)}`,
    `Controlling Authority: ${trimText(conflict.controllingAuthority || conflict.controlling_authority || conflict.winningAuthority || "Not clearly identified", 260)}`,
    `Resolution Basis: ${trimText(conflict.resolutionBasis || conflict.resolution_basis || conflict.reason || "Hierarchy-based resolution required.", 700)}`
  ].join("\n");
}

function getConflictMetadata(input = {}) {
  return (
    input.conflict ||
    input.conflictReview ||
    input.hierarchyConflict ||
    input.conflictValidation?.bestConflict ||
    input.jurisprudenceConflict ||
    input.jurisprudencePayload?.conflictReview ||
    input.jurisprudencePayload?.jurisprudenceConflict ||
    input.adaptiveContext?.conflict ||
    input.adaptiveContext?.conflictReview ||
    input.responsePlan?.conflict ||
    null
  );
}

function containsConflictLanguage(text = "") {
  return /\b(conflict\s+detected\s*:\s*yes|doctrinal conflict|conflicting authorities|conflict exists)\b/i.test(normalizeText(text));
}

export function renderConflictAnalysis(conflict = null, options = {}) {
  if (conflictMetadataIsComplete(conflict)) {
    return buildConflictMetadataBlock(conflict);
  }

  if (conflict?.apparentConflict || conflict?.distinctionType) {
    return [
      "Conflict Detected: NO",
      "The retrieved authorities may be related, but a direct doctrinal conflict is not established.",
      conflict.distinctionType ? `Distinction: ${trimText(conflict.distinctionType, 260)}` : null,
      conflict.reason ? `Reason: ${trimText(conflict.reason, 600)}` : null
    ]
      .filter(Boolean)
      .join("\n");
  }

  return options.emptyText ||
    "Conflict Detected: NO\nNo direct doctrinal conflict is established by the available metadata.";
}

function replaceSection(text = "", heading = "", headings = TINA_AF_HEADINGS, replacementBody = "") {
  const index = headings.indexOf(heading);
  if (index < 0 || !hasHeading(text, heading)) return text;

  const current = escapeRegex(heading);
  const next = headings.slice(index + 1).map(escapeRegex).join("|");

  const regex = next
    ? new RegExp(`(${current}\\b)[\\s\\S]*?(?=\\n\\s*(?:${next})\\b|$)`, "i")
    : new RegExp(`(${current}\\b)[\\s\\S]*$`, "i");

  return normalizeText(text).replace(regex, `${heading}\n${replacementBody}`);
}

function sanitizeConflictLanguage(answer = "", headings = TINA_AF_HEADINGS, conflictMetadata = null) {
  const conflictHeading = headings.find((heading) => /CONFLICT|DOCTRINAL STATUS/i.test(heading));
  const clean = normalizeText(answer);

  if (!conflictHeading) {
    if (!containsConflictLanguage(clean)) return clean;
    return conflictMetadataIsComplete(conflictMetadata)
      ? `${clean}\n\nDOCTRINAL STATUS\n${buildConflictMetadataBlock(conflictMetadata)}`
      : clean.replace(/Conflict Detected:\s*YES/gi, "Conflict Detected: NO");
  }

  const body = getSectionBody(clean, conflictHeading, headings);

  if (conflictMetadataIsComplete(conflictMetadata)) {
    return replaceSection(clean, conflictHeading, headings, buildConflictMetadataBlock(conflictMetadata));
  }

  if (containsConflictLanguage(body) || !body) {
    return replaceSection(clean, conflictHeading, headings, renderConflictAnalysis(conflictMetadata));
  }

  return clean;
}

function protectHeadingSpacing(answer = "", headings = TINA_AF_HEADINGS) {
  let clean = normalizeText(answer);

  for (const heading of headings) {
    clean = clean.replace(
      new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi"),
      `\n\n${heading}\n`
    );
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function compactRenderedOutput(answer = "", maxChars = MAX_RENDERED_CHARS) {
  const clean = normalizeText(answer);

  if (!clean) return "";
  if (clean.length <= maxChars) return clean;

  return `${clean.slice(0, maxChars).trim()}\n\n...[trimmed for readable output]`;
}

export function renderAuditRisk(value = "", options = {}) {
  const input = typeof value === "object" && value !== null ? value : null;

  const raw =
    input?.summary ||
    input?.riskSummary ||
    input?.risk ||
    input?.auditRisk ||
    value ||
    "";

  const lines = Array.isArray(raw)
    ? raw
    : splitSentencesOrBullets(String(raw));

  const fallback = [
    "Tax and audit risk depend on the strength of supporting documents, consistency of accounting entries, and alignment with BIR filings.",
    "Confirm the actual transaction flow before finalizing the position."
  ];

  return (lines.length ? lines : fallback)
    .slice(0, options.maxItems || 5)
    .map((line) => `- ${trimText(line, 500)}`)
    .join("\n");
}

export function renderDocumentaryGaps(value = [], options = {}) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? splitSentencesOrBullets(value)
      : [
          ...safeArray(value?.missingDocuments),
          ...safeArray(value?.documentaryGaps),
          ...safeArray(value?.requiredDocuments)
        ];

  const fallback = [
    "Executed contract or agreement",
    "Invoices, official receipts, billing statements, and BIR-compliant supporting documents",
    "General ledger entries and account reconciliations",
    "Proof of actual payment and transaction flow",
    "Management explanation supporting the tax position"
  ];

  return (raw.length ? raw : fallback)
    .slice(0, options.maxItems || 6)
    .map((line) => `- ${trimText(line, 500)}`)
    .join("\n");
}

export function renderReviewerNote(value = "", options = {}) {
  const text = normalizeText(value);

  if (!text) {
    return options.emptyText || "Use this only as a reviewer aid. Confirm the controlling legal basis before relying on it.";
  }

  return splitSentencesOrBullets(text)
    .slice(0, options.maxItems || 5)
    .map((line) => `- ${trimText(line, 420)}`)
    .join("\n");
}

export function renderReviewerMode(input = {}) {
  const headings = REVIEWER_HEADINGS;
  const answer =
    input.answer ||
    input.draftAnswer ||
    input.finalAnswer ||
    input.fallbackAnswer ||
    "";

  const reviewerInput = {
    ...input,
    reviewerMode: true,
    reviewMode: true
  };

  let rendered = repairStructure(answer, headings, reviewerInput);

  rendered = sanitizeConflictLanguage(rendered, headings, getConflictMetadata(reviewerInput));
  rendered = protectHeadingSpacing(rendered, headings);

  return compactRenderedOutput(rendered);
}

function renderFactPatternMode(input = {}) {
  const headings = AUDIT_FACT_PATTERN_HEADINGS;
  const answer =
    input.answer ||
    input.draftAnswer ||
    input.finalAnswer ||
    input.fallbackAnswer ||
    "";

  let rendered = repairStructure(answer, headings, input);

  rendered = sanitizeConflictLanguage(rendered, headings, getConflictMetadata(input));
  rendered = protectHeadingSpacing(rendered, headings);

  return compactRenderedOutput(rendered);
}

function buildFinalMarkdown(input = {}) {
  const mode = getResponseModeFromInput(input);
  const headings = getHeadingsFromInput(input);

  if (
    mode === "REVIEWER" ||
    mode === "REVIEW_MODE" ||
    mode === "QUIZ_MODE" ||
    isReviewMode(input)
  ) {
    return renderReviewerMode(input);
  }

  if (
    mode === "COMPLEX_ADVISORY" ||
    mode === "AUDIT_FACT_PATTERN" ||
    mode === "FACT_PATTERN"
  ) {
    return renderFactPatternMode(input);
  }

  const rawAnswer =
    input.answer ||
    input.draftAnswer ||
    input.finalAnswer ||
    input.fallbackAnswer ||
    "";

  let rendered = repairStructure(rawAnswer, headings, input);

  rendered = sanitizeConflictLanguage(rendered, headings, getConflictMetadata(input));
  rendered = protectHeadingSpacing(rendered, headings);

  return compactRenderedOutput(rendered);
}

function appendSourceAppendix(rendered = "", sources = [], input = {}) {
  if (!input.includeSources && !input.includeSourcesInAnswer) return rendered;

  const visible = sortVisibleSources(sources, input).slice(0, MAX_VISIBLE_SOURCES);
  if (!visible.length) return rendered;

  const sourceBlock = renderAuthorityList(visible, {
    ...input,
    grouped: true,
    includeMatchTags: input.includeMatchTags === true
  });

  return `${rendered.trim()}\n\nVALIDATED INDEXED SOURCES\n${sourceBlock}`.trim();
}

function collectInputSources(input = {}) {
  return [
    ...safeArray(input.sources),
    ...safeArray(input.sourcesUsed),
    ...safeArray(input.retrievedSources),
    ...safeArray(input.legalBasis),
    ...safeArray(input.legalBasisDocs),
    ...safeArray(input.citations),
    ...safeArray(input.controllingAuthorities),
    ...safeArray(input.supportingAuthorities),
    ...safeArray(input.supportingJurisprudence)
  ];
}

function renderAdaptiveAnswer(input = {}) {
  const sources = collectInputSources(input);
  const rendered = buildFinalMarkdown(input);

  return appendSourceAppendix(rendered, sources, input);
}

function renderTinaAnswer({
  answer = "",
  finalAnswer = "",
  draftAnswer = "",
  fallbackAnswer = "",
  directAnswer = "",
  sources = [],
  sourcesUsed = [],
  retrievedSources = [],
  legalBasis = [],
  legalBasisDocs = [],
  citations = [],
  controllingAuthorities = [],
  supportingAuthorities = [],
  supportingJurisprudence = [],
  includeSources = false,
  includeSourcesInAnswer = false,
  adaptiveContext = null,
  responsePlan = null,
  supersessionAudit = null,
  supersessionResult = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  conflictValidation = null,
  jurisprudencePayload = null,
  issueClassification = null,
  taxDomainClassification = null,
  primaryDomain = null,
  orchestrationMode = null,
  contextMode = null,
  mode = null,
  responseMode = null,
  metadata = {},
  reviewMode = false,
  reviewerMode = false,
  query = ""
} = {}) {
  return renderAdaptiveAnswer({
    answer: answer || finalAnswer || draftAnswer,
    finalAnswer,
    draftAnswer,
    fallbackAnswer,
    directAnswer,
    sources,
    sourcesUsed,
    retrievedSources,
    legalBasis,
    legalBasisDocs,
    citations,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence,
    includeSources,
    includeSourcesInAnswer,
    adaptiveContext,
    responsePlan,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    conflictValidation,
    jurisprudencePayload,
    issueClassification,
    taxDomainClassification,
    primaryDomain,
    orchestrationMode,
    contextMode,
    mode,
    responseMode,
    metadata,
    reviewMode,
    reviewerMode,
    query
  }).trim();
}

function renderTinaJsonPayload({
  answer = "",
  finalAnswer = "",
  draftAnswer = "",
  fallbackAnswer = "",
  directAnswer = "",
  sources = [],
  sourcesUsed = [],
  retrievedSources = [],
  legalBasis = [],
  legalBasisDocs = [],
  citations = [],
  controllingAuthorities = [],
  supportingAuthorities = [],
  supportingJurisprudence = [],
  metadata = {},
  includeSourcesInAnswer = false,
  includeSources = false,
  adaptiveContext = null,
  responsePlan = null,
  supersessionAudit = null,
  supersessionResult = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  conflictValidation = null,
  jurisprudencePayload = null,
  issueClassification = null,
  taxDomainClassification = null,
  primaryDomain = null,
  orchestrationMode = null,
  contextMode = null,
  mode = null,
  responseMode = null,
  reviewMode = false,
  reviewerMode = false,
  query = ""
} = {}) {
  const input = {
    answer,
    finalAnswer,
    draftAnswer,
    fallbackAnswer,
    directAnswer,
    sources,
    sourcesUsed,
    retrievedSources,
    legalBasis,
    legalBasisDocs,
    citations,
    controllingAuthorities,
    supportingAuthorities,
    supportingJurisprudence,
    metadata,
    includeSourcesInAnswer,
    includeSources,
    adaptiveContext,
    responsePlan,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    conflictValidation,
    jurisprudencePayload,
    issueClassification,
    taxDomainClassification,
    primaryDomain,
    orchestrationMode,
    contextMode,
    mode,
    responseMode,
    reviewMode,
    reviewerMode,
    query
  };

  const effectiveMode =
    normalizeOrchestrationMode(orchestrationMode || contextMode || mode || responseMode || metadata?.orchestrationMode || metadata?.mode || "") ||
    getResponseModeFromInput(input);

  const sortedSources = sortVisibleSources(collectInputSources(input), input)
    .slice(0, MAX_VISIBLE_SOURCES)
    .map(compactSource);

  const renderedAnswer = renderTinaAnswer({
    ...input,
    orchestrationMode: effectiveMode,
    sources: sortedSources
  });

  const headings = getHeadingsFromInput({
    ...input,
    orchestrationMode: effectiveMode
  });

  const conflictMeta = getConflictMetadata(input);

  return {
    success: true,
    answer: renderedAnswer,
    finalAnswer: renderedAnswer,
    sources: sortedSources,
    sourcesUsed: sortedSources,
    metadata: {
      ...metadata,
      renderer: "answer-renderer.js",
      rendererVersion: ENGINE_VERSION,
      formattingOnly: true,
      noOpenAICalls: true,
      noPromptAssembly: true,
      noRetrieval: true,
      noReranking: true,
      noLegalReasoningGeneration: true,

      orchestrationMode: effectiveMode,
      responseMode: effectiveMode,

      contextOrchestrationCompatible: true,
      adaptiveResponseCompatible: true,
      taxEngineStructureAware: true,
      reviewerModeAware: true,
      auditFactPatternAware: true,
      sourceVisibilityCompatible: true,

      structurePreserved: hasStructure(renderedAnswer, headings),
      afStructurePreserved: hasCompleteAFStructure(renderedAnswer),
      sourceCount: sortedSources.length,
      compactSourcesOnly: true,
      rawSourceInjectionPrevented: true,
      debugOutputSuppressed: true,
      conflictLanguageGated: true,
      conflictMetadataComplete: conflictMetadataIsComplete(conflictMeta),
      issueClassificationAware: true,
      targetAuthorityAware: true
    }
  };
}

function assertAFStructure(answer = "") {
  const clean = renderTinaAnswer({
    answer,
    orchestrationMode: "LEGAL_ANALYSIS"
  });

  return {
    ok: hasCompleteAFStructure(clean),
    answer: clean,
    missingHeadings: TINA_AF_HEADINGS.filter((heading) => !hasHeading(clean, heading))
  };
}

function assertStructure(answer = "", headings = TINA_AF_HEADINGS) {
  const clean = repairStructure(answer, headings);

  return {
    ok: hasStructure(clean, headings),
    answer: clean,
    missingHeadings: headings.filter((heading) => !hasHeading(clean, heading))
  };
}

function answerRendererHealthCheck() {
  return {
    ok: true,
    engine: "TINA_ANSWER_RENDERER",
    version: ENGINE_VERSION,

    formattingOnly: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noRetrieval: true,
    noReranking: true,
    noLegalReasoningGeneration: true,

    esmCompatible: true,
    contextOrchestrationCompatible: true,
    ragAnswerHandlerCompatible: true,
    finalAnswerComplianceCompatible: true,
    citationFormattingCompatible: true,
    sourceVisibilityCompatible: true,
    adaptiveResponseCompatible: true,
    taxEngineCompatible: true,

    supportsStandardLegalStructure: true,
    supportsSimpleStructure: true,
    supportsAuditFactPatternStructure: true,
    supportsReviewerStructure: true,
    supportsCustomTaxEngineSections: true,

    supportsSectionRendering: true,
    supportsAuthorityListRendering: true,
    supportsPracticalNoteRendering: true,
    supportsConflictRendering: true,
    supportsReviewerMode: true,
    supportsAuditRiskRendering: true,
    supportsDocumentaryGapRendering: true,

    compactSourcesOnly: true,
    rawSourceInjectionPrevented: true,
    debugOutputSuppressed: true,
    conflictLanguageGated: true,
    hiddenSourceSuppressionAware: true,
    reviewMaterialSuppressionAware: true
  };
}

export {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
  TINA_AF_HEADINGS,
  STANDARD_LEGAL_HEADINGS,
  SIMPLE_HEADINGS,
  AUDIT_FACT_PATTERN_HEADINGS,
  REVIEWER_HEADINGS,
  FALLBACK_TEMPLATES,

  normalizeText,
  sanitizeRenderedPayload,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  conflictMetadataIsComplete,
  buildConflictMetadataBlock,
  sanitizeConflictLanguage,
  protectHeadingSpacing,

  renderSection,
  renderAuthorityList,
  renderPracticalNote,
  renderConflictAnalysis,
  renderReviewerMode,
  renderAuditRisk,
  renderDocumentaryGaps,
  renderReviewerNote,
  compactRenderedOutput,
  buildFinalMarkdown,

  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure,
  normalizeOrchestrationMode,
  answerRendererHealthCheck
};

export default {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
  TINA_AF_HEADINGS,
  STANDARD_LEGAL_HEADINGS,
  SIMPLE_HEADINGS,
  AUDIT_FACT_PATTERN_HEADINGS,
  REVIEWER_HEADINGS,
  FALLBACK_TEMPLATES,

  normalizeText,
  sanitizeRenderedPayload,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  conflictMetadataIsComplete,
  buildConflictMetadataBlock,
  sanitizeConflictLanguage,
  protectHeadingSpacing,

  renderSection,
  renderAuthorityList,
  renderPracticalNote,
  renderConflictAnalysis,
  renderReviewerMode,
  renderAuditRisk,
  renderDocumentaryGaps,
  renderReviewerNote,
  compactRenderedOutput,
  buildFinalMarkdown,

  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure,
  normalizeOrchestrationMode,
  answerRendererHealthCheck
};
