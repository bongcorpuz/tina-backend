// FILE: citation-formatting-engine.js
"use strict";

/**
 * TINA Enterprise Citation Formatting Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Prioritizes issueClassificationMatch and targetAuthorityMatch.
 * - Uses controllingPrecedence when available.
 * - Blocks vague conflict text unless metadata is complete.
 * - Prevents issue-mismatched authorities from appearing first.
 */

const ENGINE_VERSION = "4.0.0";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

function normalizeYear(year = "") {
  const raw = String(year || "").trim();

  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function normalizeIssuanceNumber(num = "") {
  return String(num || "").replace(/^0+/, "") || "0";
}

function titleOf(source = {}) {
  return (
    source.title ||
    source.sourceTitle ||
    source.source_title ||
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.originalFileName ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    source.path ||
    source.metadata?.path ||
    "Unknown source"
  );
}

function pathOf(source = {}) {
  return (
    source.path ||
    source.sourcePath ||
    source.source_path ||
    source.metadata?.path ||
    source.originalSource ||
    source.original_source ||
    source.source ||
    null
  );
}

function sectionOf(source = {}) {
  return (
    source.sectionLabel ||
    source.section_label ||
    source.section ||
    source.provision ||
    source.sectionLabelText ||
    source.metadata?.sectionLabel ||
    source.metadata?.provision ||
    null
  );
}

function authorityTypeOf(source = {}) {
  return (
    source.authorityType ||
    source.authority_type ||
    source.metadata?.authorityType ||
    null
  );
}

function authorityLabelOf(source = {}) {
  return (
    source.authorityLabel ||
    source.authority_label ||
    source.metadata?.authorityLabel ||
    authorityTypeOf(source) ||
    "Unknown authority"
  );
}

function authorityLevelOf(source = {}) {
  return Number(
    source.authorityLevel ??
      source.authority_level ??
      source.metadata?.authorityLevel ??
      99
  );
}

function controllingPrecedenceOf(source = {}) {
  return Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.metadata?.controllingPrecedence ??
      authorityLevelOf(source) ??
      99
  );
}

function driveViewUrlOf(source = {}) {
  return (
    source.driveViewUrl ||
    source.drive_view_url ||
    source.metadata?.driveViewUrl ||
    source.metadata?.drive_view_url ||
    null
  );
}

function fileIdOf(source = {}) {
  return (
    source.fileId ||
    source.file_id ||
    source.metadata?.fileId ||
    source.metadata?.file_id ||
    null
  );
}

function excerptOf(source = {}, maxLength = 280) {
  const raw =
    source.excerpt ||
    source.preview ||
    source.text ||
    source.content ||
    source.metadata?.excerpt ||
    "";

  return compactSpaces(String(raw || "")).slice(0, maxLength);
}

function normalizeAuthorityLabel(value = "") {
  const raw = compactSpaces(String(value || ""));
  const upper = raw.toUpperCase();

  if (!raw) return "Unknown authority";

  const labels = {
    CONSTITUTION: "1987 Constitution",
    STATUTE: "Statute / Tax Code / Republic Act",
    TREATY: "Tax Treaty",
    SUPREME_COURT: "Supreme Court Decision",
    CTA_EN_BANC: "CTA En Banc Decision",
    COURT_OF_APPEALS: "Court of Appeals Decision",
    CTA_DIVISION: "CTA Division Decision",
    RR: "Revenue Regulation",
    RMC: "Revenue Memorandum Circular",
    RMO: "Revenue Memorandum Order",
    RAMO: "Revenue Audit Memorandum Order",
    BIR_RULING: "BIR Ruling",
    LGU: "Local Tax Ordinance",
    PFRS: "Philippine Financial Reporting Standards",
    PAS: "Philippine Accounting Standards",
    PSA: "Philippine Standards on Auditing",
    SECONDARY: "Secondary Material",
    UNKNOWN: "Unknown Authority"
  };

  return labels[upper] || raw;
}

function cleanSourceTitle(value = "") {
  return compactSpaces(String(value || ""))
    .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSectionLabel(value = "") {
  return compactSpaces(String(value || "")).trim();
}

function inferIssuanceNumber(source = {}) {
  const raw = compactSpaces(
    [
      source.issuanceNumber,
      source.issuance_number,
      source.displayTitle,
      source.reference,
      source.normalizedReference,
      source.normalized_reference,
      source.metadata?.normalizedReference,
      source.title,
      source.sourceTitle,
      source.source_title,
      source.source,
      source.originalSource,
      source.original_source,
      source.path,
      source.metadata?.path
    ]
      .filter(Boolean)
      .join(" ")
  );

  const patterns = [
    {
      regex: /\b(?:Republic Act|RA)\s*(?:No\.?)?\s*0*(\d{4,6})\b/i,
      formatter: (m) => `RA No. ${m[1]}`
    },
    {
      regex: /\bRR\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) => `RR No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\bRMC\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMC No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\bRMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) => `RMO No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\bRAMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) => `RAMO No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },
    {
      regex: /\bBIR Ruling\s*(?:No\.?)?\s*([\w./()-]+)\b/i,
      formatter: (m) => `BIR Ruling No. ${m[1]}`
    },
    {
      regex: /\bG\.R\.\s*No\.?\s*([\w.-]+)\b/i,
      formatter: (m) => `G.R. No. ${m[1]}`
    },
    {
      regex: /\bCTA\s+EB\s+No\.?\s*([\w.-]+)\b/i,
      formatter: (m) => `CTA EB No. ${m[1]}`
    },
    {
      regex: /\bCTA(?:\s+Case)?\s+No\.?\s*([\w.-]+)\b/i,
      formatter: (m) => `CTA No. ${m[1]}`
    },
    {
      regex: /\bCA-G\.R\.\s*([\w.-]+)\b/i,
      formatter: (m) => `CA-G.R. ${m[1]}`
    }
  ];

  for (const item of patterns) {
    const match = raw.match(item.regex);
    if (match) return compactSpaces(item.formatter(match));
  }

  return "";
}

function targetAuthorityMatched(item = {}) {
  return Boolean(
    item.targetAuthorityMatch === true ||
      item.issueClassificationMatch?.targetAuthorityMatch === true
  );
}

function issueClassificationMatched(item = {}) {
  if (item.issueMismatch === true) return false;
  if (item.issueClassificationMatch?.issueMismatch === true) return false;

  const match = item.issueClassificationMatch;

  if (!match || typeof match !== "object") return null;

  if (match.issueOverlap === true) return true;
  if (match.matched === true) return true;
  if (match.targetAuthorityMatch === true) return true;

  return null;
}

function citationScore(item = {}) {
  const base = Number(
    item.rerankScore ||
      item.finalScore ||
      item.final_score ||
      item.retrievalScore ||
      item.score ||
      item.similarity ||
      0
  );

  const targetBonus = targetAuthorityMatched(item) ? 80 : 0;
  const issueMatch = issueClassificationMatched(item);
  const issueBonus = issueMatch === true ? 70 : issueMatch === false ? -150 : 0;
  const exactBonus = inferIssuanceNumber(item) ? 25 : 0;
  const sectionBonus = sectionOf(item) ? 20 : 0;
  const weakPenalty = ["SECONDARY", "UNKNOWN"].includes(String(authorityTypeOf(item) || "").toUpperCase())
    ? -100
    : 0;

  return (
    base +
    targetBonus +
    issueBonus +
    exactBonus +
    sectionBonus +
    weakPenalty -
    controllingPrecedenceOf(item)
  );
}

function sortCitationAuthorities(items = []) {
  return [...safeArray(items)]
    .filter((item) => item)
    .sort((a, b) => {
      const targetDiff = Number(targetAuthorityMatched(b)) - Number(targetAuthorityMatched(a));
      if (targetDiff !== 0) return targetDiff;

      const aIssue = issueClassificationMatched(a);
      const bIssue = issueClassificationMatched(b);

      if (aIssue !== bIssue) {
        return Number(bIssue === true) - Number(aIssue === true);
      }

      const precedenceDiff = controllingPrecedenceOf(a) - controllingPrecedenceOf(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      const scoreDiff = citationScore(b) - citationScore(a);
      if (scoreDiff !== 0) return scoreDiff;

      return cleanSourceTitle(titleOf(a)).localeCompare(cleanSourceTitle(titleOf(b)));
    });
}

function buildLegalBasisLine(item = {}) {
  const authorityLabel = normalizeAuthorityLabel(authorityLabelOf(item));
  const issuanceNumber = inferIssuanceNumber(item);
  const title = cleanSourceTitle(titleOf(item));

  if (issuanceNumber && title && !title.includes(issuanceNumber)) {
    return `[${authorityLabel}] ${issuanceNumber} – ${title}`;
  }

  if (issuanceNumber) return `[${authorityLabel}] ${issuanceNumber}`;

  return `[${authorityLabel}] ${title}`;
}

function buildSourceLine(item = {}) {
  const issuanceNumber = inferIssuanceNumber(item);
  const title = cleanSourceTitle(titleOf(item));

  if (issuanceNumber && title && !title.includes(issuanceNumber)) {
    return `${issuanceNumber} – ${title}`;
  }

  return issuanceNumber || title;
}

/* =========================================================
 * TINA STRUCTURED CITATIONS
 * ========================================================= */

export function formatSingleCitation(source = {}) {
  const title = cleanSourceTitle(titleOf(source));
  const path = pathOf(source);
  const section = cleanSectionLabel(sectionOf(source) || "");
  const authorityLabel = normalizeAuthorityLabel(authorityLabelOf(source));
  const authorityLevel = authorityLevelOf(source);
  const controllingPrecedence = controllingPrecedenceOf(source);
  const issuanceNumber = inferIssuanceNumber(source);
  const driveViewUrl = driveViewUrlOf(source);
  const fileId = fileIdOf(source);

  const lines = [
    issuanceNumber ? `${issuanceNumber} – ${title}` : title
  ];

  if (section) lines.push(`Provision: ${section}`);
  if (authorityLabel) lines.push(`Authority: ${authorityLabel}`);

  lines.push(`Authority Level: ${authorityLevel}`);
  lines.push(`Controlling Precedence: ${controllingPrecedence}`);

  if (targetAuthorityMatched(source)) {
    lines.push("Target Authority Match: YES");
  }

  if (issueClassificationMatched(source) === true) {
    lines.push("Issue Classification Match: YES");
  }

  if (path) lines.push(`Source Path: ${path}`);
  if (driveViewUrl) lines.push(`Drive View URL: ${driveViewUrl}`);
  if (fileId) lines.push(`File ID: ${fileId}`);

  return lines.join("\n");
}

export function formatProvisionCitationBlock(citations = []) {
  const uniqueCitations = uniqueBy(
    citations,
    (item) => `${titleOf(item)}|${pathOf(item)}|${sectionOf(item)}`
  );

  if (!uniqueCitations.length) return "No exact provision citation found.";

  return sortCitationAuthorities(uniqueCitations)
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const section = cleanSectionLabel(sectionOf(item) || "");
      if (section) lines.push(`Provision: ${section}`);

      const authority = normalizeAuthorityLabel(authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);

      if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");

      const excerpt = excerptOf(item, 320);
      if (excerpt) lines.push(`Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (path) lines.push(`Source Path: ${path}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatLegalBasisBlock(legalBases = []) {
  const uniqueBases = uniqueBy(
    legalBases,
    (item) =>
      `${authorityTypeOf(item) || ""}|${titleOf(item) || item.source || ""}|${pathOf(item) || ""}|${excerptOf(item, 80)}`
  );

  if (!uniqueBases.length) return "No legal basis found.";

  return sortCitationAuthorities(uniqueBases)
    .map((item) => `- ${buildLegalBasisLine(item)}`)
    .join("\n");
}

export function formatSourcesUsedBlock(sources = [], options = {}) {
  const maxItems = Number(options.maxItems || 8);
  const includePaths = Boolean(options.includePaths || false);
  const includeAuthorityLevels = Boolean(options.includeAuthorityLevels !== false);
  const includeMatchMetadata = Boolean(options.includeMatchMetadata || false);

  const uniqueSources = sortCitationAuthorities(
    uniqueBy(
      sources,
      (item) => `${titleOf(item)}|${pathOf(item)}|${driveViewUrlOf(item) || ""}`
    )
  ).slice(0, maxItems);

  if (!uniqueSources.length) {
    return "6. SOURCES\n- No displayable validated source available.";
  }

  const lines = ["6. SOURCES"];

  for (const item of uniqueSources) {
    const sourceLine = buildSourceLine(item);
    const authority = normalizeAuthorityLabel(authorityLabelOf(item));
    const authorityLevel = authorityLevelOf(item);
    const precedence = controllingPrecedenceOf(item);
    const driveViewUrl = driveViewUrlOf(item);

    lines.push(
      `- ${sourceLine}${authority ? ` [${authority}]` : ""}${
        includeAuthorityLevels ? ` [Level ${authorityLevel}; Precedence ${precedence}]` : ""
      }`
    );

    if (includeMatchMetadata) {
      if (targetAuthorityMatched(item)) lines.push("  Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("  Issue Classification Match: YES");
    }

    if (includePaths && pathOf(item)) lines.push(`  Path: ${pathOf(item)}`);
    if (driveViewUrl) lines.push(`  Link: ${driveViewUrl}`);
  }

  return lines.join("\n");
}

export function formatCaseCitationBlock(caseSources = []) {
  const uniqueCases = uniqueBy(
    caseSources,
    (item) => `${titleOf(item)}|${pathOf(item)}`
  );

  if (!uniqueCases.length) return "No case citation found.";

  return sortCitationAuthorities(uniqueCases)
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const authority = normalizeAuthorityLabel(authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);

      if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");

      if (item.caseRole) lines.push(`Case Role: ${item.caseRole}`);
      if (item.caseApplicability) lines.push(`Case Applicability: ${item.caseApplicability}`);

      const excerpt = excerptOf(item, 320);
      if (excerpt) lines.push(`Case Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (path) lines.push(`Source Path: ${path}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

/* =========================================================
 * TINA STRUCTURED RESPONSE BUILDERS
 * ========================================================= */

export function ensureStructuredAnswerSections({
  directAnswer = "",
  legalBasis = "",
  supportingRules = "",
  professionalInsight = "",
  conflictFlag = "",
  sourcesUsed = "",
  assumptions = "",
  evidentiaryGaps = ""
}) {
  return [
    "1. DIRECT ANSWER",
    directAnswer || "No direct answer available.",
    "",
    assumptions ? "2. ASSUMPTIONS / FACTUAL LIMITATIONS" : null,
    assumptions || null,
    "",
    evidentiaryGaps ? "3. EVIDENTIARY GAPS" : null,
    evidentiaryGaps || null,
    "",
    "4. LEGAL BASIS",
    legalBasis || "No legal basis found.",
    "",
    "5. SUPPORTING RULES",
    supportingRules || "No supporting rules found.",
    "",
    "6. PROFESSIONAL INSIGHT",
    professionalInsight || "No additional professional insight.",
    "",
    "7. CONFLICT FLAG",
    conflictFlag || "Conflict Detected: NO",
    "",
    sourcesUsed || "8. SOURCES\n- No displayable validated source available."
  ]
    .filter(Boolean)
    .join("\n");
}

export function ensureCaseAnswerSections({
  issue = "",
  applicableLaw = "",
  birPosition = "",
  courtPosition = "",
  conflictFlag = "",
  legallyDefensibleConclusion = "",
  taxpayerRiskAssessment = "",
  recommendedAction = "",
  assumptions = "",
  evidentiaryGaps = "",
  sourcesUsed = ""
}) {
  return [
    "### Issue",
    issue || "No clear issue identified from the indexed sources.",
    "",
    assumptions ? "### Assumptions / factual limitations" : null,
    assumptions || null,
    "",
    evidentiaryGaps ? "### Evidentiary gaps" : null,
    evidentiaryGaps || null,
    "",
    "### Applicable law (ranked by authority)",
    applicableLaw || "No applicable ranked authority found.",
    "",
    "### BIR position",
    birPosition || "No clear BIR position found in the indexed sources.",
    "",
    "### Court position",
    courtPosition || "No clear court position found in the indexed sources.",
    "",
    "### Conflict flag",
    conflictFlag || "Conflict Detected: NO",
    "",
    "### Legally defensible conclusion",
    legallyDefensibleConclusion || "No legally defensible conclusion could be formed from the indexed sources.",
    "",
    "### Taxpayer risk assessment",
    taxpayerRiskAssessment || "MEDIUM — further source verification may be required.",
    "",
    "### Recommended action",
    recommendedAction || "Verify the latest controlling authority before acting.",
    "",
    sourcesUsed || "6. SOURCES\n- No displayable validated source available."
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
 * CONFLICT TEXT
 * ========================================================= */

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);
  const hasExactIssue = Boolean(conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.length);
  const hasExactDimension = Boolean(
    conflict.exactLegalDimension ||
      conflict.sameIssueGate?.sameDimensions?.length ||
      conflict.legalDimension
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controllingSource
  );

  return (
    hasTrueConflict &&
    hasConflictType &&
    hasExactIssue &&
    hasExactDimension &&
    sameIssuePassed &&
    oppositeHoldingPassed &&
    hasResolution
  );
}

export function buildConflictFlagText(conflict = null) {
  if (!conflict || !conflict.conflict) {
    return "Conflict Detected: NO";
  }

  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "Conflict Detected: NO",
      "Note: A possible or apparent conflict was not elevated to doctrinal conflict because complete same-issue, same-dimension, opposite-holding, and hierarchy-resolution metadata was not provided."
    ].join("\n");
  }

  const lines = [
    "Conflict Detected: YES",
    `Conflict Type: ${conflict.conflictType || conflict.type}`,
    `Exact Issue: ${conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.join(", ")}`,
    `Exact Legal Dimension: ${
      conflict.exactLegalDimension ||
      conflict.sameIssueGate?.sameDimensions?.join(", ") ||
      conflict.legalDimension
    }`
  ];

  if (conflict.sourceA) lines.push(`Source A: ${JSON.stringify(conflict.sourceA)}`);
  if (conflict.sourceB) lines.push(`Source B: ${JSON.stringify(conflict.sourceB)}`);

  if (conflict.reason) lines.push(`Reason: ${conflict.reason}`);
  if (conflict.resolutionBasis) lines.push(`Resolution Basis: ${conflict.resolutionBasis}`);
  if (conflict.controllingAuthority) lines.push(`Controlling Authority: ${conflict.controllingAuthority}`);
  if (conflict.controllingSource) lines.push(`Recommended Action: Follow ${JSON.stringify(conflict.controllingSource)}`);
  if (conflict.distinctionType) lines.push(`Distinction Type: ${conflict.distinctionType}`);

  return lines.join("\n");
}

/* =========================================================
 * SUPPORTING RULES
 * ========================================================= */

export function buildSupportingRulesText({
  topLegalBases = [],
  extraSources = []
}) {
  const blocks = [];

  const legalBasisLines = sortCitationAuthorities(safeArray(topLegalBases))
    .slice(0, 3)
    .map((item) => {
      const excerpt = excerptOf(item, 220);
      return excerpt ? `- ${excerpt}` : null;
    })
    .filter(Boolean);

  if (legalBasisLines.length) blocks.push(legalBasisLines.join("\n"));

  const extra = sortCitationAuthorities(
    uniqueBy(safeArray(extraSources), (item) => `${titleOf(item)}|${pathOf(item)}`)
  ).slice(0, 3);

  if (extra.length) {
    blocks.push(
      extra
        .map((item) => {
          const excerpt = excerptOf(item, 220);
          return excerpt ? `- ${excerpt}` : null;
        })
        .filter(Boolean)
        .join("\n")
    );
  }

  return blocks.filter(Boolean).join("\n\n") || "No supporting rules found.";
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

export function citationFormattingHealthCheck() {
  return {
    ok: true,
    engine: "TINA_CITATION_FORMATTING_ENGINE",
    version: ENGINE_VERSION,
    adaptiveCompatible: true,
    rendererCompatible: true,
    litigationCompatible: true,
    auditCompatible: true,
    issueClassificationMatchAware: true,
    targetAuthorityMatchAware: true,
    conflictMetadataGated: true
  };
}

export default {
  formatSingleCitation,
  formatProvisionCitationBlock,
  formatLegalBasisBlock,
  formatSourcesUsedBlock,
  formatCaseCitationBlock,
  ensureStructuredAnswerSections,
  ensureCaseAnswerSections,
  buildConflictFlagText,
  buildSupportingRulesText,
  citationFormattingHealthCheck
};
