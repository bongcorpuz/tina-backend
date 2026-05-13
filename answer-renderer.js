// FILE: answer-renderer.js

const TINA_AF_HEADINGS = [
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
];

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRawSourceSections(text = "") {
  return normalizeText(text)
    .replace(/\n+\s*Sources Used[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .trim();
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(
    String(text || "")
  );
}

function hasCompleteAFStructure(text = "") {
  return TINA_AF_HEADINGS.every((heading) => hasHeading(text, heading));
}

function getSectionBody(text = "", heading = "") {
  const source = normalizeText(text);
  const index = TINA_AF_HEADINGS.indexOf(heading);

  if (index < 0) return "";

  const current = escapeRegex(heading);
  const nextHeadings = TINA_AF_HEADINGS.slice(index + 1)
    .map(escapeRegex)
    .join("|");

  const regex = nextHeadings
    ? new RegExp(`${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextHeadings})\\b|$)`, "i")
    : new RegExp(`${current}\\s*([\\s\\S]*)$`, "i");

  const match = source.match(regex);
  return normalizeText(match?.[1] || "");
}

function normalizeLegacyHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1C. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Issue\b/gim, "A. DIRECT ANSWER")
    .replace(/^#+\s*Applicable law.*$/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*BIR position\b/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*Court position\b/gim, "C. SUPPORTING JURISPRUDENCE")
    .replace(/^#+\s*Conflict flag\b/gim, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Legally defensible conclusion\b/gim, "E. HIERARCHY ANALYSIS")
    .replace(/^#+\s*Taxpayer risk assessment\b/gim, "F. PRACTICAL APPLICATION")
    .replace(/^#+\s*Recommended action\b/gim, "F. PRACTICAL APPLICATION");
}

function defaultBodyForHeading(heading = "") {
  const defaults = {
    "A. DIRECT ANSWER":
      "No direct answer was rendered. Verify the controlling authority before relying on the position.",
    "B. CONTROLLING LEGAL BASIS":
      "No controlling legal basis was rendered. TINA should identify the applicable Constitution, NIRC/statute, Revenue Regulation, BIR issuance, or court authority before final use.",
    "C. SUPPORTING JURISPRUDENCE":
      "No issue-relevant jurisprudence was rendered. TINA should not cite unrelated cases merely because they mention the same tax type.",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "No direct doctrinal conflict was rendered. If authorities address different substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative issues, they should be treated as distinguishable or complementary rather than conflicting.",
    "E. HIERARCHY ANALYSIS":
      "Apply Philippine legal hierarchy: Constitution, NIRC/statute, Revenue Regulations, RMC/RMO/RAMO, BIR rulings, Supreme Court doctrine, CTA decisions, and secondary materials. Lower authorities cannot override higher authorities.",
    "F. PRACTICAL APPLICATION":
      "Verify the latest official authority and maintain documentation before relying on the position for compliance, audit, protest, or litigation."
  };

  return defaults[heading] || "";
}

function repairAFStructure(answer = "") {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));

  if (hasCompleteAFStructure(clean)) return clean;

  const sections = TINA_AF_HEADINGS.map((heading) => {
    const body = getSectionBody(clean, heading) || defaultBodyForHeading(heading);

    return `${heading}\n${body}`;
  });

  if (!TINA_AF_HEADINGS.some((heading) => hasHeading(clean, heading))) {
    sections[0] = `A. DIRECT ANSWER\n${clean || defaultBodyForHeading("A. DIRECT ANSWER")}`;
  }

  return sections.join("\n\n").trim();
}

function sanitizeConflictLanguage(answer = "") {
  const clean = normalizeText(answer);

  const conflictBody = getSectionBody(
    clean,
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS"
  );

  if (!conflictBody) return clean;

  const vagueConflict =
    /Conflict Detected:\s*YES/i.test(conflictBody) &&
    !/(exact issue|controlling doctrine|controlling authority|distinction type|resolution basis|why it controls|substantive|procedural|evidentiary|jurisdictional|temporal|factual|administrative)/i.test(
      conflictBody
    );

  if (!vagueConflict) return clean;

  return clean.replace(
    /(D\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS\b)[\s\S]*?(?=\n\s*E\.\s*HIERARCHY ANALYSIS\b|$)/i,
    [
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
      "A vague conflict flag was removed. No direct doctrinal conflict should be stated unless the answer identifies the exact legal issue, controlling doctrine, hierarchy basis, distinction type, and why one authority prevails."
    ].join("\n")
  );
}

function protectHeadingSpacing(answer = "") {
  let clean = normalizeText(answer);

  for (const heading of TINA_AF_HEADINGS) {
    const pattern = new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi");
    clean = clean.replace(pattern, `\n\n${heading}\n`);
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function renderSources(sources = []) {
  if (!Array.isArray(sources) || !sources.length) return "";

  const lines = sources.slice(0, 5).map((source, index) => {
    const title =
      source.issuanceNumber ||
      source.issuance_number
        ? `${source.issuanceNumber || source.issuance_number} – ${source.title || "Untitled Source"}`
        : source.title || source.source || source.sourcePath || "Untitled Source";

    const authority =
      source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      "Source";

    return `${index + 1}. ${title} (${authority})`;
  });

  return ["", "Validated Indexed Sources", ...lines].join("\n");
}

export function renderTinaAnswer({
  answer = "",
  sources = [],
  includeSources = false
} = {}) {
  let rendered = repairAFStructure(answer);
  rendered = sanitizeConflictLanguage(rendered);
  rendered = protectHeadingSpacing(rendered);

  if (includeSources) {
    const sourceBlock = renderSources(sources);
    if (sourceBlock) rendered = `${rendered}\n${sourceBlock}`;
  }

  return rendered.trim();
}

export function renderTinaJsonPayload({
  answer = "",
  sources = [],
  metadata = {},
  includeSourcesInAnswer = false
} = {}) {
  const renderedAnswer = renderTinaAnswer({
    answer,
    sources,
    includeSources: includeSourcesInAnswer
  });

  return {
    success: true,
    answer: renderedAnswer,
    sources,
    metadata: {
      ...metadata,
      renderer: "answer-renderer.js",
      afStructurePreserved: hasCompleteAFStructure(renderedAnswer),
      sourceCount: Array.isArray(sources) ? sources.length : 0
    }
  };
}

export function assertAFStructure(answer = "") {
  const clean = renderTinaAnswer({ answer });

  return {
    ok: hasCompleteAFStructure(clean),
    answer: clean,
    missingHeadings: TINA_AF_HEADINGS.filter(
      (heading) => !hasHeading(clean, heading)
    )
  };
}

export {
  TINA_AF_HEADINGS,
  hasCompleteAFStructure,
  repairAFStructure,
  sanitizeConflictLanguage
};

export default {
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  hasCompleteAFStructure,
  repairAFStructure,
  sanitizeConflictLanguage,
  TINA_AF_HEADINGS
};
