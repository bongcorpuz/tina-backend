// FILE: citation-formatting-engine.js

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

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function titleOf(source = {}) {
  return (
    source.title ||
    source.sourceTitle ||
    source.document_title ||
    source.metadata?.documentTitle ||
    source.metadata?.originalFileName ||
    source.originalSource ||
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

function excerptOf(source = {}, maxLength = 280) {
  const raw =
    source.excerpt ||
    source.preview ||
    source.text ||
    source.metadata?.excerpt ||
    "";

  return compactSpaces(String(raw || "")).slice(0, maxLength);
}

function normalizeAuthorityLabel(value = "") {
  const raw = compactSpaces(String(value || ""));
  const upper = raw.toUpperCase();

  if (!raw) return "Unknown authority";
  if (upper === "CONSTITUTION") return "1987 Constitution";
  if (upper === "STATUTE") return "Statute";
  if (upper === "TREATY") return "Tax Treaty";
  if (upper === "SUPREME_COURT") return "Supreme Court Decision";
  if (upper === "CTA_EN_BANC") return "CTA En Banc Decision";
  if (upper === "COURT_OF_APPEALS") return "Court of Appeals Decision";
  if (upper === "CTA_DIVISION") return "CTA Division Decision";
  if (upper === "RR") return "Revenue Regulation";
  if (upper === "RMC") return "Revenue Memorandum Circular";
  if (upper === "RMO") return "Revenue Memorandum Order";
  if (upper === "RAMO") return "Revenue Audit Memorandum Order";
  if (upper === "BIR_RULING") return "BIR Ruling";
  if (upper === "LGU") return "Local Tax Ordinance";
  if (upper === "SECONDARY") return "Secondary Material";

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
  return compactSpaces(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function inferIssuanceNumber(source = {}) {
  const raw = compactSpaces(
    [
      source.issuanceNumber,
      source.reference,
      source.normalizedReference,
      source.metadata?.normalizedReference,
      source.title,
      source.sourceTitle,
      source.source,
      source.originalSource,
      source.path,
      source.metadata?.path
    ]
      .filter(Boolean)
      .join(" ")
  );

  const patterns = [
    /\b(RA\s*\d{4,6})\b/i,
    /\b(RR\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMC\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RAMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(BIR Ruling\s*(?:No\.?)?\s*[\w./()-]+)\b/i,
    /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i,
    /\b(CTA(?:\s+EB)?\s+No\.?\s*[\w.-]+)\b/i,
    /\b(CA-G\.R\.\s*[\w.-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      return compactSpaces(match[1]);
    }
  }

  return "";
}

function buildLegalBasisLine(item = {}) {
  const authorityLabel = normalizeAuthorityLabel(authorityLabelOf(item));
  const issuanceNumber = inferIssuanceNumber(item);
  const title = cleanSourceTitle(titleOf(item));

  if (issuanceNumber) {
    return `[${authorityLabel}] ${issuanceNumber} – ${title}`;
  }

  return `[${authorityLabel}] ${title}`;
}

function buildSourceLine(item = {}) {
  const issuanceNumber = inferIssuanceNumber(item);
  const title = cleanSourceTitle(titleOf(item));

  if (issuanceNumber) {
    return `${issuanceNumber} – ${title}`;
  }

  return title;
}

export function formatSingleCitation(source = {}) {
  const title = cleanSourceTitle(titleOf(source));
  const path = pathOf(source);
  const section = cleanSectionLabel(sectionOf(source) || "");
  const authorityLabel = normalizeAuthorityLabel(authorityLabelOf(source));
  const issuanceNumber = inferIssuanceNumber(source);

  const lines = [issuanceNumber ? `${issuanceNumber} – ${title}` : title];

  if (section) {
    lines.push(`Provision: ${section}`);
  }

  if (authorityLabel) {
    lines.push(`Authority: ${authorityLabel}`);
  }

  if (path) {
    lines.push(`Source Path: ${path}`);
  }

  return lines.join("\n");
}

export function formatProvisionCitationBlock(citations = []) {
  const uniqueCitations = uniqueBy(
    safeArray(citations),
    (item) => `${titleOf(item)}|${pathOf(item)}|${sectionOf(item)}`
  );

  if (!uniqueCitations.length) {
    return "No exact provision citation found.";
  }

  return uniqueCitations
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const section = cleanSectionLabel(sectionOf(item) || "");
      if (section) {
        lines.push(`Provision: ${section}`);
      }

      const excerpt = excerptOf(item, 320);
      if (excerpt) {
        lines.push(`Excerpt: ${excerpt}`);
      }

      const path = pathOf(item);
      if (path) {
        lines.push(`Source Path: ${path}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatLegalBasisBlock(legalBases = []) {
  const uniqueBases = uniqueBy(
    safeArray(legalBases),
    (item) =>
      `${authorityTypeOf(item) || ""}|${titleOf(item) || item.source || ""}|${excerptOf(item, 80)}`
  );

  if (!uniqueBases.length) {
    return "No legal basis found.";
  }

  return uniqueBases
    .map((item) => `- ${buildLegalBasisLine(item)}`)
    .join("\n");
}

export function formatSourcesUsedBlock(sources = [], options = {}) {
  const maxItems = Number(options.maxItems || 8);
  const uniqueSources = uniqueBy(
    safeArray(sources),
    (item) => `${titleOf(item)}|${pathOf(item)}`
  ).slice(0, maxItems);

  if (!uniqueSources.length) {
    return "6. SOURCES\n- No displayable validated source available.";
  }

  const lines = ["6. SOURCES"];

  for (const item of uniqueSources) {
    lines.push(`- ${buildSourceLine(item)}`);
  }

  return lines.join("\n");
}

export function formatCaseCitationBlock(caseSources = []) {
  const uniqueCases = uniqueBy(
    safeArray(caseSources),
    (item) => `${titleOf(item)}|${pathOf(item)}`
  );

  if (!uniqueCases.length) {
    return "No case citation found.";
  }

  return uniqueCases
    .map((item, index) => {
      const lines = [`${index + 1}. ${buildSourceLine(item)}`];

      const authority = normalizeAuthorityLabel(authorityLabelOf(item));
      if (authority) {
        lines.push(`Authority: ${authority}`);
      }

      const excerpt = excerptOf(item, 320);
      if (excerpt) {
        lines.push(`Case Excerpt: ${excerpt}`);
      }

      const path = pathOf(item);
      if (path) {
        lines.push(`Source Path: ${path}`);
      }

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
  sourcesUsed = ""
}) {
  const sections = [];

  sections.push("1. DIRECT ANSWER");
  sections.push(directAnswer || "No direct answer available.");
  sections.push("");

  sections.push("2. LEGAL BASIS");
  sections.push(legalBasis || "No legal basis found.");
  sections.push("");

  sections.push("3. SUPPORTING RULES");
  sections.push(supportingRules || "No supporting rules found.");
  sections.push("");

  sections.push("4. PROFESSIONAL INSIGHT");
  sections.push(professionalInsight || "No additional professional insight.");
  sections.push("");

  sections.push("5. CONFLICT FLAG");
  sections.push(conflictFlag || "Conflict Detected: NO");
  sections.push("");

  sections.push(
    sourcesUsed || "6. SOURCES\n- No displayable validated source available."
  );

  return sections.join("\n");
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
  sourcesUsed = ""
}) {
  const sections = [];

  sections.push("### Issue");
  sections.push(issue || "No clear issue identified from the indexed sources.");
  sections.push("");

  sections.push("### Applicable law (ranked by authority)");
  sections.push(applicableLaw || "No applicable ranked authority found.");
  sections.push("");

  sections.push("### BIR position");
  sections.push(birPosition || "No clear BIR position found in the indexed sources.");
  sections.push("");

  sections.push("### Court position");
  sections.push(courtPosition || "No clear court position found in the indexed sources.");
  sections.push("");

  sections.push("### Conflict flag");
  sections.push(conflictFlag || "Conflict Detected: NO");
  sections.push("");

  sections.push("### Legally defensible conclusion");
  sections.push(
    legallyDefensibleConclusion || "No legally defensible conclusion could be formed from the indexed sources."
  );
  sections.push("");

  sections.push("### Taxpayer risk assessment");
  sections.push(taxpayerRiskAssessment || "MEDIUM — further source verification may be required.");
  sections.push("");

  sections.push("### Recommended action");
  sections.push(recommendedAction || "Verify the latest controlling authority before acting.");
  sections.push("");

  sections.push(
    sourcesUsed || "6. SOURCES\n- No displayable validated source available."
  );

  return sections.join("\n");
}

export function buildConflictFlagText(conflict = null) {
  if (!conflict || !conflict.conflict) {
    return "Conflict Detected: NO";
  }

  const lines = ["Conflict Detected: YES"];

  if (conflict.sourceA) {
    lines.push(`Source A: ${conflict.sourceA}`);
  }

  if (conflict.sourceB) {
    lines.push(`Source B: ${conflict.sourceB}`);
  }

  if (conflict.reason) {
    lines.push(`Contradiction: ${conflict.reason}`);
  }

  if (conflict.controllingAuthority) {
    lines.push(`Controlling Authority: ${conflict.controllingAuthority}`);
  }

  if (conflict.controllingSource) {
    lines.push(`Recommended Action: Follow ${conflict.controllingSource}`);
  }

  return lines.join("\n");
}

export function buildSupportingRulesText({
  topLegalBases = [],
  extraSources = []
}) {
  const blocks = [];

  const legalBasisLines = safeArray(topLegalBases)
    .slice(0, 3)
    .map((item) => `- ${excerptOf(item, 220)}`)
    .filter((line) => line !== "- ");

  if (legalBasisLines.length) {
    blocks.push(legalBasisLines.join("\n"));
  }

  const extra = uniqueBy(
    safeArray(extraSources),
    (item) => `${titleOf(item)}|${pathOf(item)}`
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
