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

function authorityLabelOf(source = {}) {
  return (
    source.authorityLabel ||
    source.authority_label ||
    source.metadata?.authorityLabel ||
    source.authorityType ||
    source.authority_type ||
    source.metadata?.authorityType ||
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

function cleanSourceTitle(value = "") {
  return compactSpaces(String(value || ""))
    .replace(/\.pdf$/i, "")
    .replace(/\.docx$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function cleanSectionLabel(value = "") {
  return compactSpaces(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSingleCitation(source = {}) {
  const title = cleanSourceTitle(titleOf(source));
  const path = pathOf(source);
  const section = cleanSectionLabel(sectionOf(source) || "");
  const authorityLabel = authorityLabelOf(source);

  const lines = [title];

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
      const lines = [`${index + 1}. ${cleanSourceTitle(titleOf(item))}`];

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
    (item) => `${item.authorityType || ""}|${item.source || ""}|${item.excerpt || ""}`
  );

  if (!uniqueBases.length) {
    return "No legal basis found.";
  }

  return uniqueBases
    .map((item, index) => {
      const lines = [
        `${index + 1}. [${item.authorityLabel || item.authorityType || "Authority"}] ${cleanSourceTitle(item.source || "Unknown source")}`
      ];

      if (item.excerpt) {
        lines.push(`Excerpt: ${compactSpaces(String(item.excerpt)).slice(0, 320)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatSourcesUsedBlock(sources = [], options = {}) {
  const maxItems = Number(options.maxItems || 8);
  const uniqueSources = uniqueBy(
    safeArray(sources),
    (item) => `${titleOf(item)}|${pathOf(item)}`
  ).slice(0, maxItems);

  if (!uniqueSources.length) {
    return "Sources Used:\n- None";
  }

  const lines = ["Sources Used:"];

  for (const item of uniqueSources) {
    const title = cleanSourceTitle(titleOf(item));
    const path = pathOf(item);
    const section = cleanSectionLabel(sectionOf(item) || "");

    let line = `- ${title}`;
    if (section) line += ` | ${section}`;
    if (path) line += ` | ${path}`;

    lines.push(line);
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
      const lines = [`${index + 1}. ${cleanSourceTitle(titleOf(item))}`];

      const authority = authorityLabelOf(item);
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

  sections.push("DIRECT ANSWER");
  sections.push(directAnswer || "No direct answer available.");
  sections.push("");

  sections.push("LEGAL BASIS");
  sections.push(legalBasis || "No legal basis found.");
  sections.push("");

  sections.push("SUPPORTING RULES");
  sections.push(supportingRules || "No supporting rules found.");
  sections.push("");

  sections.push("PROFESSIONAL INSIGHT");
  sections.push(professionalInsight || "No additional professional insight.");
  sections.push("");

  sections.push("CONFLICT FLAG");
  sections.push(conflictFlag || "No conflict detected.");
  sections.push("");

  sections.push(sourcesUsed || "Sources Used:\n- None");

  return sections.join("\n");
}

export function ensureCaseAnswerSections({
  caseTitle = "",
  facts = "",
  issue = "",
  ruling = "",
  doctrine = "",
  application = "",
  legalSignificance = "",
  sourcesUsed = ""
}) {
  const sections = [];

  sections.push("CASE TITLE");
  sections.push(caseTitle || "No identified case title.");
  sections.push("");

  sections.push("FACTS");
  sections.push(facts || "Insufficient facts found in the indexed source.");
  sections.push("");

  sections.push("ISSUE");
  sections.push(issue || "No clear issue found in the indexed source.");
  sections.push("");

  sections.push("RULING");
  sections.push(ruling || "No clear ruling found in the indexed source.");
  sections.push("");

  sections.push("DOCTRINE");
  sections.push(doctrine || "No clear doctrine found in the indexed source.");
  sections.push("");

  sections.push("APPLICATION");
  sections.push(application || "No application analysis available.");
  sections.push("");

  sections.push("LEGAL SIGNIFICANCE");
  sections.push(legalSignificance || "No additional legal significance provided.");
  sections.push("");

  sections.push(sourcesUsed || "Sources Used:\n- None");

  return sections.join("\n");
}

export function buildConflictFlagText(conflict = null) {
  if (!conflict || !conflict.conflict) {
    return "No conflict detected.";
  }

  const lines = ["Conflict Detected: YES"];

  if (conflict.controllingAuthority) {
    lines.push(`Controlling Authority: ${conflict.controllingAuthority}`);
  }

  if (conflict.reason) {
    lines.push(`Reason: ${conflict.reason}`);
  }

  if (conflict.controllingSource) {
    lines.push(`Controlling Source: ${conflict.controllingSource}`);
  }

  return lines.join("\n");
}

export function buildSupportingRulesText({
  topLegalBases = [],
  extraSources = []
}) {
  const blocks = [];

  if (safeArray(topLegalBases).length) {
    blocks.push(formatLegalBasisBlock(topLegalBases));
  }

  const extra = uniqueBy(
    safeArray(extraSources),
    (item) => `${titleOf(item)}|${pathOf(item)}`
  ).slice(0, 3);

  if (extra.length) {
    blocks.push(
      extra
        .map((item, index) => {
          const lines = [
            `${index + 1}. ${cleanSourceTitle(titleOf(item))}`
          ];

          const excerpt = excerptOf(item, 220);
          if (excerpt) {
            lines.push(`Support: ${excerpt}`);
          }

          return lines.join("\n");
        })
        .join("\n\n")
    );
  }

  return blocks.filter(Boolean).join("\n\n") || "No supporting rules found.";
}
