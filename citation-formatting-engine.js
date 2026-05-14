// FILE: citation-formatting-engine.js
"use strict";

/**
 * TINA Enterprise Citation Formatting Engine
 * Version: 3.0.0
 */

const ENGINE_VERSION = "3.0.0";

function normalizeText(value = "") {
  return String(value || "").trim();
}

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

    return yy <= currentYY + 1
      ? `20${raw}`
      : `19${raw}`;
  }

  return raw;
}

function normalizeIssuanceNumber(num = "") {
  return String(num || "")
    .replace(/^0+/, "") || "0";
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

  return compactSpaces(String(raw || ""))
    .slice(0, maxLength);
}

function normalizeAuthorityLabel(value = "") {
  const raw = compactSpaces(String(value || ""));
  const upper = raw.toUpperCase();

  if (!raw) return "Unknown authority";

  if (upper === "CONSTITUTION") {
    return "1987 Constitution";
  }

  if (upper === "STATUTE") {
    return "Statute / Tax Code / Republic Act";
  }

  if (upper === "TREATY") {
    return "Tax Treaty";
  }

  if (upper === "SUPREME_COURT") {
    return "Supreme Court Decision";
  }

  if (upper === "CTA_EN_BANC") {
    return "CTA En Banc Decision";
  }

  if (upper === "COURT_OF_APPEALS") {
    return "Court of Appeals Decision";
  }

  if (upper === "CTA_DIVISION") {
    return "CTA Division Decision";
  }

  if (upper === "RR") {
    return "Revenue Regulation";
  }

  if (upper === "RMC") {
    return "Revenue Memorandum Circular";
  }

  if (upper === "RMO") {
    return "Revenue Memorandum Order";
  }

  if (upper === "RAMO") {
    return "Revenue Audit Memorandum Order";
  }

  if (upper === "BIR_RULING") {
    return "BIR Ruling";
  }

  if (upper === "LGU") {
    return "Local Tax Ordinance";
  }

  if (upper === "SECONDARY") {
    return "Secondary Material";
  }

  return raw;
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
      formatter: (m) =>
        `RR No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },

    {
      regex: /\bRMC\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) =>
        `RMC No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },

    {
      regex: /\bRMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) =>
        `RMO No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },

    {
      regex: /\bRAMO\s*(?:No\.?)?\s*0*(\d+)\s*[-/_]\s*(\d{2,4})\b/i,
      formatter: (m) =>
        `RAMO No. ${normalizeIssuanceNumber(m[1])}-${normalizeYear(m[2])}`
    },

    {
      regex: /\bBIR Ruling\s*(?:No\.?)?\s*([\w./()-]+)\b/i,
      formatter: (m) =>
        `BIR Ruling No. ${m[1]}`
    },

    {
      regex: /\bG\.R\.\s*No\.?\s*([\w.-]+)\b/i,
      formatter: (m) =>
        `G.R. No. ${m[1]}`
    },

    {
      regex: /\bCTA\s+EB\s+No\.?\s*([\w.-]+)\b/i,
      formatter: (m) =>
        `CTA EB No. ${m[1]}`
    },

    {
      regex: /\bCTA(?:\s+Case)?\s+No\.?\s*([\w.-]+)\b/i,
      formatter: (m) =>
        `CTA No. ${m[1]}`
    },

    {
      regex: /\bCA-G\.R\.\s*([\w.-]+)\b/i,
      formatter: (m) =>
        `CA-G.R. ${m[1]}`
    }
  ];

  for (const item of patterns) {
    const match = raw.match(item.regex);

    if (match) {
      return compactSpaces(
        item.formatter(match)
      );
    }
  }

  return "";
}

function buildLegalBasisLine(item = {}) {
  const authorityLabel =
    normalizeAuthorityLabel(
      authorityLabelOf(item)
    );

  const issuanceNumber =
    inferIssuanceNumber(item);

  const title =
    cleanSourceTitle(
      titleOf(item)
    );

  if (
    issuanceNumber &&
    title &&
    !title.includes(issuanceNumber)
  ) {
    return `[${authorityLabel}] ${issuanceNumber} – ${title}`;
  }

  if (issuanceNumber) {
    return `[${authorityLabel}] ${issuanceNumber}`;
  }

  return `[${authorityLabel}] ${title}`;
}

function buildSourceLine(item = {}) {
  const issuanceNumber =
    inferIssuanceNumber(item);

  const title =
    cleanSourceTitle(
      titleOf(item)
    );

  if (
    issuanceNumber &&
    title &&
    !title.includes(issuanceNumber)
  ) {
    return `${issuanceNumber} – ${title}`;
  }

  return issuanceNumber || title;
}

/* =========================================================
 * TINA STRUCTURED CITATIONS
 * ========================================================= */

export function formatSingleCitation(
  source = {}
) {
  const title =
    cleanSourceTitle(
      titleOf(source)
    );

  const path =
    pathOf(source);

  const section =
    cleanSectionLabel(
      sectionOf(source) || ""
    );

  const authorityLabel =
    normalizeAuthorityLabel(
      authorityLabelOf(source)
    );

  const authorityLevel =
    authorityLevelOf(source);

  const issuanceNumber =
    inferIssuanceNumber(source);

  const driveViewUrl =
    driveViewUrlOf(source);

  const fileId =
    fileIdOf(source);

  const lines = [
    issuanceNumber
      ? `${issuanceNumber} – ${title}`
      : title
  ];

  if (section) {
    lines.push(
      `Provision: ${section}`
    );
  }

  if (authorityLabel) {
    lines.push(
      `Authority: ${authorityLabel}`
    );
  }

  lines.push(
    `Authority Level: ${authorityLevel}`
  );

  if (path) {
    lines.push(
      `Source Path: ${path}`
    );
  }

  if (driveViewUrl) {
    lines.push(
      `Drive View URL: ${driveViewUrl}`
    );
  }

  if (fileId) {
    lines.push(
      `File ID: ${fileId}`
    );
  }

  return lines.join("\n");
}

export function formatProvisionCitationBlock(
  citations = []
) {
  const uniqueCitations =
    uniqueBy(
      citations,
      (item) =>
        `${titleOf(item)}|${pathOf(item)}|${sectionOf(item)}`
    );

  if (!uniqueCitations.length) {
    return "No exact provision citation found.";
  }

  return uniqueCitations
    .map((item, index) => {
      const lines = [
        `${index + 1}. ${buildSourceLine(item)}`
      ];

      const section =
        cleanSectionLabel(
          sectionOf(item) || ""
        );

      if (section) {
        lines.push(
          `Provision: ${section}`
        );
      }

      const excerpt =
        excerptOf(item, 320);

      if (excerpt) {
        lines.push(
          `Excerpt: ${excerpt}`
        );
      }

      const path =
        pathOf(item);

      if (path) {
        lines.push(
          `Source Path: ${path}`
        );
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatLegalBasisBlock(
  legalBases = []
) {
  const uniqueBases =
    uniqueBy(
      legalBases,
      (item) =>
        `${authorityTypeOf(item) || ""}|${titleOf(item) || item.source || ""}|${pathOf(item) || ""}|${excerptOf(item, 80)}`
    );

  if (!uniqueBases.length) {
    return "No legal basis found.";
  }

  return uniqueBases
    .sort(
      (a, b) =>
        authorityLevelOf(a) -
        authorityLevelOf(b)
    )
    .map(
      (item) =>
        `- ${buildLegalBasisLine(item)}`
    )
    .join("\n");
}

export function formatSourcesUsedBlock(
  sources = [],
  options = {}
) {
  const maxItems = Number(
    options.maxItems || 8
  );

  const includePaths = Boolean(
    options.includePaths || false
  );

  const includeAuthorityLevels =
    Boolean(
      options.includeAuthorityLevels !==
        false
    );

  const uniqueSources =
    uniqueBy(
      sources,
      (item) =>
        `${titleOf(item)}|${pathOf(item)}|${driveViewUrlOf(item) || ""}`
    )
      .sort(
        (a, b) =>
          authorityLevelOf(a) -
          authorityLevelOf(b)
      )
      .slice(0, maxItems);

  if (!uniqueSources.length) {
    return "6. SOURCES\n- No displayable validated source available.";
  }

  const lines = ["6. SOURCES"];

  for (const item of uniqueSources) {
    const sourceLine =
      buildSourceLine(item);

    const authority =
      normalizeAuthorityLabel(
        authorityLabelOf(item)
      );

    const authorityLevel =
      authorityLevelOf(item);

    const driveViewUrl =
      driveViewUrlOf(item);

    lines.push(
      `- ${sourceLine}${authority ? ` [${authority}]` : ""}${
        includeAuthorityLevels
          ? ` [Level ${authorityLevel}]`
          : ""
      }`
    );

    if (
      includePaths &&
      pathOf(item)
    ) {
      lines.push(
        `  Path: ${pathOf(item)}`
      );
    }

    if (driveViewUrl) {
      lines.push(
        `  Link: ${driveViewUrl}`
      );
    }
  }

  return lines.join("\n");
}

export function formatCaseCitationBlock(
  caseSources = []
) {
  const uniqueCases =
    uniqueBy(
      caseSources,
      (item) =>
        `${titleOf(item)}|${pathOf(item)}`
    );

  if (!uniqueCases.length) {
    return "No case citation found.";
  }

  return uniqueCases
    .sort(
      (a, b) =>
        authorityLevelOf(a) -
        authorityLevelOf(b)
    )
    .map((item, index) => {
      const lines = [
        `${index + 1}. ${buildSourceLine(item)}`
      ];

      const authority =
        normalizeAuthorityLabel(
          authorityLabelOf(item)
        );

      if (authority) {
        lines.push(
          `Authority: ${authority}`
        );
      }

      const excerpt =
        excerptOf(item, 320);

      if (excerpt) {
        lines.push(
          `Case Excerpt: ${excerpt}`
        );
      }

      const path =
        pathOf(item);

      if (path) {
        lines.push(
          `Source Path: ${path}`
        );
      }

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

    assumptions
      ? "2. ASSUMPTIONS / FACTUAL LIMITATIONS"
      : null,

    assumptions || null,

    "",

    evidentiaryGaps
      ? "3. EVIDENTIARY GAPS"
      : null,

    evidentiaryGaps || null,

    "",

    "4. LEGAL BASIS",
    legalBasis || "No legal basis found.",
    "",

    "5. SUPPORTING RULES",
    supportingRules || "No supporting rules found.",
    "",

    "6. PROFESSIONAL INSIGHT",
    professionalInsight ||
      "No additional professional insight.",
    "",

    "7. CONFLICT FLAG",
    conflictFlag ||
      "Conflict Detected: NO",
    "",

    sourcesUsed ||
      "8. SOURCES\n- No displayable validated source available."
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
    issue ||
      "No clear issue identified from the indexed sources.",
    "",

    assumptions
      ? "### Assumptions / factual limitations"
      : null,

    assumptions || null,

    "",

    evidentiaryGaps
      ? "### Evidentiary gaps"
      : null,

    evidentiaryGaps || null,

    "",

    "### Applicable law (ranked by authority)",
    applicableLaw ||
      "No applicable ranked authority found.",
    "",

    "### BIR position",
    birPosition ||
      "No clear BIR position found in the indexed sources.",
    "",

    "### Court position",
    courtPosition ||
      "No clear court position found in the indexed sources.",
    "",

    "### Conflict flag",
    conflictFlag ||
      "Conflict Detected: NO",
    "",

    "### Legally defensible conclusion",
    legallyDefensibleConclusion ||
      "No legally defensible conclusion could be formed from the indexed sources.",
    "",

    "### Taxpayer risk assessment",
    taxpayerRiskAssessment ||
      "MEDIUM — further source verification may be required.",
    "",

    "### Recommended action",
    recommendedAction ||
      "Verify the latest controlling authority before acting.",
    "",

    sourcesUsed ||
      "6. SOURCES\n- No displayable validated source available."
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================================================
 * CONFLICT TEXT
 * ========================================================= */

export function buildConflictFlagText(
  conflict = null
) {
  if (
    !conflict ||
    !conflict.conflict
  ) {
    return "Conflict Detected: NO";
  }

  const lines = [
    "Conflict Detected: YES"
  ];

  if (conflict.sourceA) {
    lines.push(
      `Source A: ${conflict.sourceA}`
    );
  }

  if (conflict.sourceB) {
    lines.push(
      `Source B: ${conflict.sourceB}`
    );
  }

  if (conflict.reason) {
    lines.push(
      `Reason: ${conflict.reason}`
    );
  }

  if (
    conflict.controllingAuthority
  ) {
    lines.push(
      `Controlling Authority: ${conflict.controllingAuthority}`
    );
  }

  if (
    conflict.controllingSource
  ) {
    lines.push(
      `Recommended Action: Follow ${conflict.controllingSource}`
    );
  }

  if (
    conflict.distinctionType
  ) {
    lines.push(
      `Distinction Type: ${conflict.distinctionType}`
    );
  }

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

  const legalBasisLines =
    safeArray(topLegalBases)
      .slice(0, 3)
      .map((item) => {
        const excerpt =
          excerptOf(item, 220);

        return excerpt
          ? `- ${excerpt}`
          : null;
      })
      .filter(Boolean);

  if (legalBasisLines.length) {
    blocks.push(
      legalBasisLines.join("\n")
    );
  }

  const extra = uniqueBy(
    safeArray(extraSources),
    (item) =>
      `${titleOf(item)}|${pathOf(item)}`
  ).slice(0, 3);

  if (extra.length) {
    blocks.push(
      extra
        .map((item) => {
          const excerpt =
            excerptOf(item, 220);

          return excerpt
            ? `- ${excerpt}`
            : null;
        })
        .filter(Boolean)
        .join("\n")
    );
  }

  return (
    blocks
      .filter(Boolean)
      .join("\n\n") ||
    "No supporting rules found."
  );
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

export function citationFormattingHealthCheck() {
  return {
    ok: true,
    engine:
      "TINA_CITATION_FORMATTING_ENGINE",
    version:
      ENGINE_VERSION,
    adaptiveCompatible: true,
    rendererCompatible: true,
    litigationCompatible: true,
    auditCompatible: true
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
