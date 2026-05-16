// FILE: citation-formatting-engine.js
"use strict";

/**
 * TINA Enterprise Citation Formatting Engine
 * Version: 4.1.0
 *
 * Purpose:
 * - Show only cited, relevant, non-duplicated sources
 * - Prioritize issueClassificationMatch, targetAuthorityMatch, and controllingPrecedence
 * - Prevent vague conflict text unless metadata is complete
 * - Prevent full source text / debug objects from reaching final output
 * - Support context-orchestration-engine.js
 */

const ENGINE_VERSION = "4.1.0";
const MAX_CITATIONS = 5;
const MAX_EXCERPT_CHARS = 280;

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function trimText(value = "", max = 500) {
  const text = compactSpaces(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
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
    source.sourcePath ||
    source.source_path ||
    source.path ||
    source.url ||
    source.sourceUrl ||
    source.source_url ||
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
  const raw =
    source.authorityType ||
    source.authority_type ||
    source.metadata?.authorityType ||
    null;

  if (!raw) return null;

  const value = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    SECONDARY_SOURCE: "SECONDARY"
  };

  return aliases[value] || value;
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
    source.url ||
    source.sourceUrl ||
    source.source_url ||
    source.metadata?.driveViewUrl ||
    source.metadata?.drive_view_url ||
    source.metadata?.url ||
    null
  );
}

function fileIdOf(source = {}) {
  return (
    source.fileId ||
    source.file_id ||
    source.id ||
    source.metadata?.fileId ||
    source.metadata?.file_id ||
    null
  );
}

function excerptOf(source = {}, maxLength = MAX_EXCERPT_CHARS) {
  const raw =
    source.excerpt ||
    source.preview ||
    source.text ||
    source.content ||
    source.doctrineSummary ||
    source.caseApplicabilityExplanation ||
    source.metadata?.excerpt ||
    "";

  return trimText(raw, maxLength);
}

function normalizeAuthorityLabel(value = "") {
  const raw = compactSpaces(String(value || ""));
  const upper = raw.toUpperCase();

  if (!raw) return "Unknown authority";

  const labels = {
    CONSTITUTION: "1987 Constitution",
    STATUTE: "Statute / Tax Code / Republic Act",
    TREATY: "Tax Treaty",
    TAX_TREATY: "Tax Treaty",
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
  return trimText(
    compactSpaces(String(value || ""))
      .replace(/\.(pdf|docx|doc|txt|csv|md|json)$/i, "")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    260
  );
}

function cleanSectionLabel(value = "") {
  return trimText(value, 160);
}

function inferIssuanceNumber(source = {}) {
  const raw = compactSpaces(
    [
      source.issuanceNumber,
      source.issuance_number,
      source.displayTitle,
      source.reference,
      source.citation,
      source.normalizedReference,
      source.normalized_reference,
      source.metadata?.normalizedReference,
      source.metadata?.citation,
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

function isWeakAuthority(item = {}) {
  return ["SECONDARY", "UNKNOWN", null].includes(authorityTypeOf(item));
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
  const weakPenalty = isWeakAuthority(item) ? -100 : 0;

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

function buildCitationKey(item = {}) {
  return compactSpaces(
    [
      authorityTypeOf(item),
      inferIssuanceNumber(item),
      titleOf(item),
      pathOf(item),
      sectionOf(item),
      driveViewUrlOf(item),
      fileIdOf(item)
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase()
  );
}

function sortCitationAuthorities(items = []) {
  return [...safeArray(items)]
    .filter((item) => item)
    .filter((item) => item.issueMismatch !== true)
    .filter((item) => item.issueClassificationMatch?.issueMismatch !== true)
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

function selectDisplayableCitations(items = [], options = {}) {
  const maxItems = Number(options.maxItems || MAX_CITATIONS);
  const allowWeak = Boolean(options.allowWeak || false);

  return sortCitationAuthorities(
    uniqueBy(items, buildCitationKey)
      .filter((item) => allowWeak || !isWeakAuthority(item))
  ).slice(0, maxItems);
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

export function extractCitedSourceKeys(answerText = "") {
  const text = String(answerText || "");
  const keys = [];

  const patterns = [
    /\bRR\s*No\.?\s*\d+[-/]\d{2,4}\b/gi,
    /\bRMC\s*No\.?\s*\d+[-/]\d{2,4}\b/gi,
    /\bRMO\s*No\.?\s*\d+[-/]\d{2,4}\b/gi,
    /\bRAMO\s*No\.?\s*\d+[-/]\d{2,4}\b/gi,
    /\bRA\s*No\.?\s*\d{4,6}\b/gi,
    /\bRepublic Act\s*No\.?\s*\d{4,6}\b/gi,
    /\bG\.R\.\s*No\.?\s*[\w.-]+\b/gi,
    /\bCTA\s*(?:EB)?\s*No\.?\s*[\w.-]+\b/gi,
    /\bBIR Ruling\s*No\.?\s*[\w./()-]+\b/gi,
    /\bNIRC\b/gi,
    /\bTax Code\b/gi
  ];

  for (const regex of patterns) {
    for (const match of text.matchAll(regex)) {
      keys.push(match[0]);
    }
  }

  return uniqueBy(keys.map(compactSpaces), (item) => item.toLowerCase());
}

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

  if (targetAuthorityMatched(source)) lines.push("Target Authority Match: YES");
  if (issueClassificationMatched(source) === true) lines.push("Issue Classification Match: YES");

  if (path) lines.push(`Source Path: ${trimText(path, 260)}`);
  if (driveViewUrl) lines.push(`Drive View URL: ${trimText(driveViewUrl, 260)}`);
  if (fileId) lines.push(`File ID: ${fileId}`);

  return lines.join("\n");
}

export function formatProvisionCitationBlock(citations = [], options = {}) {
  const selected = selectDisplayableCitations(citations, {
    maxItems: options.maxItems || MAX_CITATIONS,
    allowWeak: options.allowWeak || false
  });

  if (!selected.length) return "No exact provision citation found.";

  return selected
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const section = cleanSectionLabel(sectionOf(item) || "");
      if (section) lines.push(`Provision: ${section}`);

      const authority = normalizeAuthorityLabel(authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);

      if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");

      const excerpt = excerptOf(item, 260);
      if (excerpt) lines.push(`Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (options.includePaths && path) lines.push(`Source Path: ${trimText(path, 260)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatLegalBasisBlock(legalBases = [], options = {}) {
  const selected = selectDisplayableCitations(legalBases, {
    maxItems: options.maxItems || MAX_CITATIONS,
    allowWeak: options.allowWeak || false
  });

  if (!selected.length) return "No legal basis found.";

  return selected
    .map((item) => `- ${buildLegalBasisLine(item)}`)
    .join("\n");
}

export function formatSourcesUsedBlock(sources = [], options = {}) {
  const maxItems = Number(options.maxItems || MAX_CITATIONS);
  const includePaths = Boolean(options.includePaths || false);
  const includeAuthorityLevels = Boolean(options.includeAuthorityLevels !== false);
  const includeMatchMetadata = Boolean(options.includeMatchMetadata || false);

  const selected = selectDisplayableCitations(sources, {
    maxItems,
    allowWeak: options.allowWeak || false
  });

  if (!selected.length) {
    return "8. SOURCES\n- No displayable validated source available.";
  }

  const lines = ["8. SOURCES"];

  for (const item of selected) {
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

    if (includePaths && pathOf(item)) lines.push(`  Path: ${trimText(pathOf(item), 260)}`);
    if (driveViewUrl) lines.push(`  Link: ${trimText(driveViewUrl, 260)}`);
  }

  return lines.join("\n");
}

export function formatCaseCitationBlock(caseSources = [], options = {}) {
  const selected = selectDisplayableCitations(caseSources, {
    maxItems: options.maxItems || MAX_CITATIONS,
    allowWeak: false
  });

  if (!selected.length) return "No case citation found.";

  return selected
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const authority = normalizeAuthorityLabel(authorityLabelOf(item));
      if (authority) lines.push(`Authority: ${authority}`);

      lines.push(`Controlling Precedence: ${controllingPrecedenceOf(item)}`);

      if (targetAuthorityMatched(item)) lines.push("Target Authority Match: YES");
      if (issueClassificationMatched(item) === true) lines.push("Issue Classification Match: YES");

      if (item.caseRole) lines.push(`Case Role: ${item.caseRole}`);
      if (item.caseApplicability) lines.push(`Case Applicability: ${item.caseApplicability}`);

      const excerpt = excerptOf(item, 260);
      if (excerpt) lines.push(`Case Excerpt: ${excerpt}`);

      const path = pathOf(item);
      if (options.includePaths && path) lines.push(`Source Path: ${trimText(path, 260)}`);

      return lines.join("\n");
    })
    .join("\n\n");
}

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
    sourcesUsed || "8. SOURCES\n- No displayable validated source available."
  ]
    .filter(Boolean)
    .join("\n");
}

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
    `Conflict Type: ${trimText(conflict.conflictType || conflict.type, 120)}`,
    `Exact Issue: ${trimText(conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.join(", "), 220)}`,
    `Exact Legal Dimension: ${trimText(
      conflict.exactLegalDimension ||
        conflict.sameIssueGate?.sameDimensions?.join(", ") ||
        conflict.legalDimension,
      220
    )}`
  ];

  if (conflict.reason) lines.push(`Reason: ${trimText(conflict.reason, 700)}`);
  if (conflict.resolutionBasis) lines.push(`Resolution Basis: ${trimText(conflict.resolutionBasis, 700)}`);
  if (conflict.controllingAuthority) lines.push(`Controlling Authority: ${trimText(conflict.controllingAuthority, 160)}`);
  if (conflict.controllingSource) lines.push(`Recommended Action: Follow ${trimText(titleOf(conflict.controllingSource), 220)}`);
  if (conflict.distinctionType) lines.push(`Distinction Type: ${trimText(conflict.distinctionType, 220)}`);

  return lines.join("\n");
}

export function buildSupportingRulesText({
  topLegalBases = [],
  extraSources = []
}) {
  const blocks = [];

  const legalBasisLines = selectDisplayableCitations(topLegalBases, {
    maxItems: 3,
    allowWeak: false
  })
    .map((item) => {
      const excerpt = excerptOf(item, 220);
      return excerpt ? `- ${excerpt}` : null;
    })
    .filter(Boolean);

  if (legalBasisLines.length) blocks.push(legalBasisLines.join("\n"));

  const extra = selectDisplayableCitations(extraSources, {
    maxItems: 3,
    allowWeak: false
  });

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
    controllingPrecedenceAware: true,
    conflictMetadataGated: true,
    contextOrchestrationCompatible: true,
    nonDuplicatedSourcesReady: true,
    citedRelevantSourcesOnly: true,
    rawFullTextInjectionPrevented: true,
    compactCitationOutput: true
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
  extractCitedSourceKeys,
  citationFormattingHealthCheck
};
