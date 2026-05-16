// FILE: answer-renderer.js
"use strict";

/**
 * answer-renderer.js
 * TINA Enterprise Adaptive Answer Renderer
 * Version: 4.0.0
 *
 * PURPOSE
 * - final adaptive rendering layer
 * - structure enforcement
 * - adaptive response shaping
 * - conclusion gating
 * - litigation-safe rendering
 * - evidence-aware rendering
 * - hierarchy-aware rendering
 * - supersession disclosure rendering
 * - planner contract enforcement
 * - conflict-language gating
 */

const ENGINE_VERSION = "4.0.0";

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const FALLBACK_TEMPLATES = Object.freeze({
  QUICK: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],

  STANDARD: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL APPLICATION",
    "D. TAX / COMPLIANCE RISK"
  ],

  TECHNICAL: TINA_AF_HEADINGS,

  AUDIT: [
    "A. DIRECT ANSWER",
    "B. KNOWN FACTS AND ASSUMPTIONS",
    "C. AUDIT ISSUE",
    "D. ACCOUNTING / TAX TREATMENT",
    "E. AUDIT RISK / MISSTATEMENT RISK",
    "F. REQUIRED AUDIT EVIDENCE",
    "G. RECOMMENDED AUDIT POSITION"
  ],

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
  ],

  REVIEWER: [
    "A. SIMPLE ANSWER",
    "B. WHY",
    "C. BASIC LEGAL BASIS",
    "D. EXAMPLE",
    "E. PRACTICAL / EXAM TIP"
  ]
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function itemToText(item) {
  if (!item) return "";

  if (typeof item === "string") return item;

  if (typeof item === "object") {
    return (
      item.fact ||
      item.document ||
      item.issue ||
      item.description ||
      item.text ||
      item.clause ||
      item.heading ||
      item.requiredLanguage ||
      JSON.stringify(item)
    );
  }

  return String(item);
}

function stripRawSourceSections(text = "") {
  return normalizeText(text)
    .replace(/\n+\s*Sources Used[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .trim();
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(String(text || ""));
}

function hasStructure(text = "", headings = TINA_AF_HEADINGS) {
  return headings.every((heading) => hasHeading(text, heading));
}

function hasCompleteAFStructure(text = "") {
  return hasStructure(text, TINA_AF_HEADINGS);
}

function getSectionBody(text = "", heading = "", headings = TINA_AF_HEADINGS) {
  const source = normalizeText(text);
  const index = headings.indexOf(heading);

  if (index < 0) return "";

  const current = escapeRegex(heading);

  const nextHeadings = headings
    .slice(index + 1)
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
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1C. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS");
}

function defaultBodyForHeading(heading = "", responseMode = "TECHNICAL") {
  const defaults = {
    "A. DIRECT ANSWER":
      "No direct answer was rendered. Verify the controlling authority, facts, and supporting evidence before relying on the position.",

    "B. CONTROLLING LEGAL BASIS":
      "No controlling legal basis was rendered. TINA should identify the applicable Constitution, NIRC/statute, Revenue Regulation, BIR issuance, or court authority before final use.",

    "C. SUPPORTING JURISPRUDENCE":
      "No issue-relevant jurisprudence was rendered. TINA should not cite unrelated cases merely because they mention the same tax type.",

    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "No doctrinal conflict should be asserted unless conflict metadata confirms the same exact issue, same legal dimension, opposite holding, conflict type, and hierarchy-based resolution.",

    "E. HIERARCHY ANALYSIS":
      "Apply Philippine legal hierarchy. Lower authorities cannot override higher authorities.",

    "F. PRACTICAL APPLICATION":
      "Verify the latest official authority and maintain supporting documentation before relying on the position."
  };

  return (
    defaults[heading] ||
    `No ${heading.replace(/^[A-Z]\.\s*/, "").toLowerCase()} was rendered.`
  );
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS, responseMode = "TECHNICAL") {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));

  if (hasStructure(clean, headings)) return clean;

  const sections = headings.map((heading) => {
    const body =
      getSectionBody(clean, heading, headings) ||
      defaultBodyForHeading(heading, responseMode);

    return `${heading}\n${body}`;
  });

  if (!headings.some((heading) => hasHeading(clean, heading))) {
    sections[0] = `${headings[0]}\n${clean || defaultBodyForHeading(headings[0], responseMode)}`;
  }

  return sections.join("\n\n").trim();
}

function getConflictMetadata(input = {}) {
  return (
    input.conflict ||
    input.conflictReview ||
    input.jurisprudenceConflict ||
    input.jurisprudencePayload?.conflictReview ||
    input.jurisprudencePayload?.jurisprudenceConflict ||
    input.adaptiveContext?.conflict ||
    input.adaptiveContext?.conflictReview ||
    input.responsePlan?.conflict ||
    input.responsePlan?.conflictReview ||
    null
  );
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

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controllingSource
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  return (
    hasTrueConflict &&
    hasConflictType &&
    hasExactIssue &&
    hasExactDimension &&
    hasResolution &&
    sameIssuePassed &&
    oppositeHoldingPassed
  );
}

function buildConflictMetadataBlock(conflict = null) {
  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "No direct doctrinal conflict is asserted.",
      "A conflict label requires complete metadata showing:",
      "1. same exact legal issue;",
      "2. same legal dimension;",
      "3. opposite holding;",
      "4. conflict type;",
      "5. controlling authority or hierarchy-based resolution.",
      "Authorities involving different substantive, procedural, evidentiary, jurisdictional, temporal, factual, or contractual issues should be treated as distinguishable, not conflicting."
    ].join("\n");
  }

  const exactIssue =
    conflict.exactIssue ||
    conflict.sameIssueGate?.sameIssues?.join(", ") ||
    "Not specified";

  const exactDimension =
    conflict.exactLegalDimension ||
    conflict.sameIssueGate?.sameDimensions?.join(", ") ||
    conflict.legalDimension ||
    "Not specified";

  const conflictType = conflict.conflictType || conflict.type || "DOCTRINAL_CONFLICT";

  const resolution =
    conflict.resolutionBasis ||
    conflict.reason ||
    "Hierarchy-based resolution required.";

  const controllingAuthority =
    conflict.controllingAuthority ||
    conflict.winningAuthority ||
    conflict.winningSource?.authorityType ||
    conflict.winningSource?.authorityLabel ||
    "Not clearly identified";

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${conflictType}`,
    `Exact Issue: ${exactIssue}`,
    `Exact Legal Dimension: ${exactDimension}`,
    `Controlling Authority: ${controllingAuthority}`,
    `Resolution Basis: ${resolution}`
  ].join("\n");
}

function findConflictHeading(headings = TINA_AF_HEADINGS) {
  return (
    headings.find((heading) =>
      /DOCTRINAL STATUS|CONFLICT ANALYSIS|CONFLICT/i.test(heading)
    ) || "D. DOCTRINAL STATUS / CONFLICT ANALYSIS"
  );
}

function replaceSection(text = "", heading = "", headings = TINA_AF_HEADINGS, replacementBody = "") {
  const clean = normalizeText(text);
  const index = headings.indexOf(heading);

  if (index < 0 || !hasHeading(clean, heading)) return clean;

  const current = escapeRegex(heading);
  const nextHeadings = headings
    .slice(index + 1)
    .map(escapeRegex)
    .join("|");

  const regex = nextHeadings
    ? new RegExp(`(${current}\\b)[\\s\\S]*?(?=\\n\\s*(?:${nextHeadings})\\b|$)`, "i")
    : new RegExp(`(${current}\\b)[\\s\\S]*$`, "i");

  return clean.replace(regex, `${heading}\n${replacementBody}`);
}

function containsVagueConflictLanguage(text = "") {
  const body = normalizeText(text);

  return (
    /\bconflict\s+detected\s*:\s*yes\b/i.test(body) ||
    /\bconflict\s*:\s*yes\b/i.test(body) ||
    /\bdoctrinal conflict\b/i.test(body) ||
    /\bthere is a conflict\b/i.test(body) ||
    /\bconflicting authorities\b/i.test(body) ||
    /\bconflict exists\b/i.test(body)
  );
}

function hasConflictSpecifics(text = "") {
  const body = normalizeText(text);

  return (
    /\bexact issue\b/i.test(body) &&
    /\b(exact legal dimension|legal dimension)\b/i.test(body) &&
    /\b(controlling authority|controlling doctrine|winning authority|hierarchy)\b/i.test(body) &&
    /\b(resolution basis|why it controls|basis for resolution)\b/i.test(body)
  );
}

function sanitizeConflictLanguage(answer = "", headings = TINA_AF_HEADINGS, conflictMetadata = null) {
  const clean = normalizeText(answer);
  const conflictHeading = findConflictHeading(headings);
  const body = getSectionBody(clean, conflictHeading, headings);

  if (!body) return clean;

  const metadataComplete = conflictMetadataIsComplete(conflictMetadata);
  const vagueConflict = containsVagueConflictLanguage(body) && !hasConflictSpecifics(body);

  if (metadataComplete) {
    return replaceSection(
      clean,
      conflictHeading,
      headings,
      buildConflictMetadataBlock(conflictMetadata)
    );
  }

  if (!metadataComplete && (vagueConflict || containsVagueConflictLanguage(body))) {
    return replaceSection(
      clean,
      conflictHeading,
      headings,
      buildConflictMetadataBlock(null)
    );
  }

  return clean;
}

function protectHeadingSpacing(answer = "", headings = TINA_AF_HEADINGS) {
  let clean = normalizeText(answer);

  for (const heading of headings) {
    const pattern = new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi");
    clean = clean.replace(pattern, `\n\n${heading}\n`);
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function renderList(items = []) {
  const normalized = normalizeArray(items).map(itemToText).filter(Boolean);

  if (!normalized.length) return "";

  return normalized.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function renderSources(sources = []) {
  if (!Array.isArray(sources) || !sources.length) return "";

  const lines = sources.slice(0, 8).map((source, index) => {
    const title =
      source.issuanceNumber || source.issuance_number
        ? `${source.issuanceNumber || source.issuance_number} – ${source.title || "Untitled Source"}`
        : source.title ||
          source.source ||
          source.sourcePath ||
          source.path ||
          "Untitled Source";

    const authority =
      source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      "Source";

    return `${index + 1}. ${title} (${authority})`;
  });

  return ["", "VALIDATED INDEXED SOURCES", ...lines].join("\n");
}

function renderSupersessionAudit(supersessionAudit = null) {
  if (!supersessionAudit?.auditTrail?.length) return "";

  const lines = supersessionAudit.auditTrail.slice(0, 5).map((item, index) => {
    return [
      `${index + 1}. ${item.documentTitle || item.document}`,
      `Status: ${item.status}`,
      item.replacedByTitle ? `Replaced By: ${item.replacedByTitle}` : null,
      item.reason ? `Reason: ${item.reason}` : null
    ]
      .filter(Boolean)
      .join("\n");
  });

  return ["", "SUPERSESSION AUDIT", ...lines].join("\n\n");
}

function renderRiskBlock(riskBlock = null) {
  if (!riskBlock) return "";

  const lines = [];

  if (riskBlock.overallRisk) {
    const risk =
      typeof riskBlock.overallRisk === "object"
        ? `${riskBlock.overallRisk.level || ""}${
            riskBlock.overallRisk.score != null ? ` (${riskBlock.overallRisk.score})` : ""
          }`.trim()
        : String(riskBlock.overallRisk);

    if (risk) lines.push(`Overall Risk: ${risk}`);
  }

  if (riskBlock.taxpayerDefensibility) {
    lines.push(`Taxpayer Defensibility: ${riskBlock.taxpayerDefensibility}`);
  }

  if (riskBlock.positionStrength) {
    lines.push(`Position Strength: ${riskBlock.positionStrength}`);
  }

  if (riskBlock.conclusionRestriction) {
    lines.push(`Conclusion Restriction: ${riskBlock.conclusionRestriction}`);
  }

  return lines.length ? `RISK AND POSITION CONTROL\n${lines.join("\n")}` : "";
}

function getResponsePlan(input = {}) {
  return input.responsePlan || input.adaptiveContext?.responsePlan || {};
}

function getRendererContract(input = {}) {
  return (
    input.rendererContract ||
    input.responsePlan?.rendererContract ||
    input.adaptiveContext?.rendererContract ||
    {}
  );
}

function getResponseModeFromInput(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  return contract.responseMode || plan.responseMode || input.responseMode || "TECHNICAL";
}

function getHeadingsFromInput(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  return normalizeArray(
    contract.sections ||
      plan.responseTemplate ||
      FALLBACK_TEMPLATES[getResponseModeFromInput(input)] ||
      TINA_AF_HEADINGS
  ).filter(Boolean);
}

function getLimitationStatement(input = {}) {
  return (
    input.limitationStatement ||
    input.assumptionGap?.limitationStatement ||
    input.positionStrength?.limitationStatement ||
    "Based on the available facts, the position is preliminary and subject to verification."
  );
}

function shouldApplyLimitation(input = {}) {
  return Boolean(
    input.mustIncludeLimitation ||
      input.assumptionGap?.mustDiscloseBeforeConclusion ||
      input.positionStrength?.conclusionAction === "DEFER_CONCLUSION" ||
      input.positionStrength?.conclusionAction === "USE_QUALIFIED_CONCLUSION" ||
      input.riskScore?.conclusionRestriction === "PRELIMINARY_CONCLUSION_ONLY"
  );
}

function applyLimitation(answer = "", input = {}) {
  if (!shouldApplyLimitation(input)) return answer;

  const limitation = getLimitationStatement(input);

  if (answer.includes("LIMITATION")) return answer;

  return `${answer}\n\nLIMITATION\n${limitation}`;
}

function applyRiskBlock(answer = "", input = {}) {
  const rendered = renderRiskBlock(input.riskBlock || input.riskScore);

  if (!rendered) return answer;

  if (answer.includes("RISK AND POSITION CONTROL")) return answer;

  return `${answer}\n\n${rendered}`;
}

function applySupersessionAudit(answer = "", input = {}) {
  const rendered = renderSupersessionAudit(input.supersessionAudit || input.supersessionResult);

  if (!rendered) return answer;

  if (answer.includes("SUPERSESSION AUDIT")) return answer;

  return `${answer}\n${rendered}`;
}

function applyConflictMetadata(answer = "", input = {}, headings = TINA_AF_HEADINGS) {
  const conflict = getConflictMetadata(input);
  return sanitizeConflictLanguage(answer, headings, conflict);
}

function renderAdaptiveAnswer(input = {}) {
  const responseMode = getResponseModeFromInput(input);
  const headings = getHeadingsFromInput(input);

  const rawAnswer =
    input.answer ||
    input.draftAnswer ||
    input.fallbackAnswer ||
    "";

  let rendered = repairStructure(rawAnswer, headings, responseMode);

  rendered = applyConflictMetadata(rendered, input, headings);

  rendered = protectHeadingSpacing(rendered, headings);

  rendered = applyLimitation(rendered, input);

  rendered = applyRiskBlock(rendered, input);

  rendered = applySupersessionAudit(rendered, input);

  return normalizeText(rendered);
}

function renderTinaAnswer({
  answer = "",
  sources = [],
  includeSources = false,
  adaptiveContext = null,
  responsePlan = null,
  assumptionGap = null,
  riskScore = null,
  positionStrength = null,
  supersessionAudit = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null
} = {}) {
  let rendered = renderAdaptiveAnswer({
    answer,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength,
    supersessionAudit,
    conflict,
    conflictReview,
    jurisprudencePayload
  });

  if (includeSources) {
    const sourceBlock = renderSources(sources);

    if (sourceBlock) {
      rendered = `${rendered}\n${sourceBlock}`;
    }
  }

  return rendered.trim();
}

function renderTinaJsonPayload({
  answer = "",
  sources = [],
  metadata = {},
  includeSourcesInAnswer = false,
  adaptiveContext = null,
  responsePlan = null,
  assumptionGap = null,
  riskScore = null,
  positionStrength = null,
  supersessionAudit = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null
} = {}) {
  const renderedAnswer = renderTinaAnswer({
    answer,
    sources,
    includeSources: includeSourcesInAnswer,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength,
    supersessionAudit,
    conflict,
    conflictReview,
    jurisprudencePayload
  });

  const headings = getHeadingsFromInput({
    adaptiveContext,
    responsePlan
  });

  const conflictMeta = conflict || conflictReview || jurisprudencePayload?.conflictReview || null;

  return {
    success: true,

    answer: renderedAnswer,

    sources,

    metadata: {
      ...metadata,

      renderer: "answer-renderer.js",

      rendererVersion: ENGINE_VERSION,

      structurePreserved: hasStructure(renderedAnswer, headings),

      afStructurePreserved: hasCompleteAFStructure(renderedAnswer),

      sourceCount: Array.isArray(sources) ? sources.length : 0,

      conflictLanguageGated: true,

      conflictMetadataComplete: conflictMetadataIsComplete(conflictMeta)
    }
  };
}

function assertAFStructure(answer = "") {
  const clean = renderTinaAnswer({ answer });

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

export {
  ENGINE_VERSION,
  TINA_AF_HEADINGS,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  conflictMetadataIsComplete,
  buildConflictMetadataBlock,
  sanitizeConflictLanguage,
  protectHeadingSpacing,
  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure
};

export default {
  ENGINE_VERSION,
  TINA_AF_HEADINGS,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  conflictMetadataIsComplete,
  buildConflictMetadataBlock,
  sanitizeConflictLanguage,
  protectHeadingSpacing,
  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure
};
