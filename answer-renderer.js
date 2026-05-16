// FILE: answer-renderer.js
"use strict";

/**
 * TINA Answer Renderer
 * Version: 5.1.0
 *
 * Formatting-only layer.
 * No OpenAI calls.
 * No prompt assembly.
 * No retrieval.
 */

const ENGINE_VERSION = "5.1.0";

const ORCHESTRATION_MODES = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM"
});

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const FALLBACK_TEMPLATES = Object.freeze({
  FAST_DEFINITION: ["A. DIRECT ANSWER", "B. LEGAL BASIS"],
  STANDARD_TAX: ["A. DIRECT ANSWER", "B. LEGAL BASIS", "C. SUPPORTING RULES", "D. PRACTICAL NOTE"],
  LEGAL_ANALYSIS: TINA_AF_HEADINGS,
  COMPLEX_ADVISORY: [
    "A. EXECUTIVE ANSWER",
    "B. FACTS / ASSUMPTIONS",
    "C. CONTROLLING BASIS",
    "D. ANALYSIS",
    "E. RISK / EXPOSURE",
    "F. DOCUMENTARY GAPS",
    "G. RECOMMENDED POSITION"
  ],
  EMERGENCY_TRIM: ["A. DIRECT ANSWER", "B. LIMITED BASIS"],
  QUICK: ["A. DIRECT ANSWER", "B. SHORT BASIS", "C. PRACTICAL NOTE"],
  STANDARD: TINA_AF_HEADINGS,
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

const MAX_VISIBLE_SOURCES = 5;

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function trimText(value = "", max = 1000) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
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
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*CLASSIFICATION CONTROL[\s\S]*$/i, "")
    .replace(/\n+\s*DEBUG[\s\S]*$/i, "")
    .replace(/\n+\s*RAW CONTEXT[\s\S]*$/i, "")
    .replace(/\n+\s*RETRIEVAL PAYLOAD[\s\S]*$/i, "")
    .replace(/\n+\s*JSON DUMP[\s\S]*$/i, "")
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
  const next = headings.slice(index + 1).map(escapeRegex).join("|");

  const regex = next
    ? new RegExp(`${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\b|$)`, "i")
    : new RegExp(`${current}\\s*([\\s\\S]*)$`, "i");

  return normalizeText(source.match(regex)?.[1] || "");
}

function normalizeLegacyHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1C. SUPPORTING RULES")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1C. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS");
}

function normalizeOrchestrationMode(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  if (Object.values(ORCHESTRATION_MODES).includes(raw)) return raw;
  if (raw.includes("FAST") || raw.includes("QUICK") || raw.includes("DEFINITION")) return "FAST_DEFINITION";
  if (raw.includes("LEGAL") || raw.includes("DOCTRINE") || raw.includes("JURISPRUDENCE")) return "LEGAL_ANALYSIS";
  if (raw.includes("COMPLEX") || raw.includes("AUDIT") || raw.includes("CONTRACT") || raw.includes("TRANSACTION") || raw.includes("EVIDENCE") || raw.includes("RISK")) return "COMPLEX_ADVISORY";
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
  return safeArray(
    input.rendererContract?.sections ||
      input.responsePlan?.rendererContract?.sections ||
      input.responsePlan?.responseTemplate ||
      FALLBACK_TEMPLATES[mode] ||
      FALLBACK_TEMPLATES.LEGAL_ANALYSIS
  );
}

function defaultBodyForHeading(heading = "") {
  const defaults = {
    "A. DIRECT ANSWER": "No direct answer was rendered.",
    "A. EXECUTIVE ANSWER": "No executive answer was rendered.",
    "A. SIMPLE ANSWER": "No simple answer was rendered.",
    "B. CONTROLLING LEGAL BASIS": "No controlling legal basis was rendered.",
    "B. LEGAL BASIS": "No legal basis was rendered.",
    "B. SHORT BASIS": "No short basis was rendered.",
    "B. LIMITED BASIS": "No limited basis was rendered.",
    "C. SUPPORTING JURISPRUDENCE": "No issue-relevant jurisprudence was rendered.",
    "C. SUPPORTING RULES": "No supporting rules were rendered.",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS": "Conflict Detected: NO\nNo direct doctrinal conflict is asserted.",
    "E. HIERARCHY ANALYSIS": "Apply Philippine legal hierarchy. Lower authorities cannot override higher authorities.",
    "F. PRACTICAL APPLICATION": "Verify latest authority and supporting documents before relying on the position."
  };

  return defaults[heading] || `No ${heading.replace(/^[A-Z]\.\s*/, "").toLowerCase()} was rendered.`;
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS) {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));
  if (hasStructure(clean, headings)) return clean;

  const hasAnyHeading = headings.some((heading) => hasHeading(clean, heading));

  return headings
    .map((heading, index) => {
      const body =
        getSectionBody(clean, heading, headings) ||
        (!hasAnyHeading && index === 0 ? clean : "") ||
        defaultBodyForHeading(heading);

      return `${heading}\n${body}`;
    })
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
      "No direct doctrinal conflict is asserted.",
      "A conflict label requires complete same-issue, same-dimension, opposite-holding, conflict-type, and hierarchy-resolution metadata."
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
    return replaceSection(clean, conflictHeading, headings, buildConflictMetadataBlock(null));
  }

  return clean;
}

function protectHeadingSpacing(answer = "", headings = TINA_AF_HEADINGS) {
  let clean = normalizeText(answer);

  for (const heading of headings) {
    clean = clean.replace(new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi"), `\n\n${heading}\n`);
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function sourcePrecedence(source = {}) {
  return Number(source.controllingPrecedence ?? source.controlling_precedence ?? source.authorityLevel ?? source.authority_level ?? 99);
}

function sourceScore(source = {}) {
  return Number(source.finalScore || source.final_score || source.rerankScore || source.retrievalScore || source.score || 0);
}

function isIssueMatched(source = {}) {
  if (source.issueMismatch === true || source.issueClassificationMatch?.issueMismatch === true) return false;
  if (source.issueClassificationMatch?.matched === true) return true;
  if (source.issueClassificationMatch?.issueOverlap === true) return true;
  if (source.issueClassificationMatch?.targetAuthorityMatch === true) return true;
  return null;
}

function isTargetAuthorityMatched(source = {}) {
  return source.targetAuthorityMatch === true || source.issueClassificationMatch?.targetAuthorityMatch === true;
}

function normalizeSourceKey(source = {}) {
  return [
    source.fileId,
    source.id,
    source.citation,
    source.normalizedReference,
    source.normalized_reference,
    source.title,
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
  const seen = new Set();
  const output = [];

  for (const source of safeArray(sources)) {
    const key = normalizeSourceKey(source);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function compactSource(source = {}) {
  return {
    title: trimText(source.title || source.sourceTitle || source.source || source.sourcePath || source.source_path || source.path || "Untitled Source", 220),
    citation: trimText(source.citation || source.reference || source.normalizedReference || source.normalized_reference || source.issuanceNumber || source.issuance_number || "", 260),
    url: trimText(source.url || source.driveViewUrl || source.drive_url || source.sourceUrl || "", 320),
    authorityType: source.authorityType || source.authority_type || source.authorityLabel || source.authority_label || "Source",
    authorityLevel: Number(source.authorityLevel || source.authority_level || 99),
    controllingPrecedence: sourcePrecedence(source),
    score: sourceScore(source),
    issueClassificationMatch: source.issueClassificationMatch || null,
    targetAuthorityMatch: isTargetAuthorityMatched(source)
  };
}

function sortVisibleSources(sources = []) {
  return dedupeSources(sources)
    .filter((source) => source.issueMismatch !== true)
    .filter((source) => source.issueClassificationMatch?.issueMismatch !== true)
    .sort((a, b) => {
      const targetDiff = Number(isTargetAuthorityMatched(b)) - Number(isTargetAuthorityMatched(a));
      if (targetDiff !== 0) return targetDiff;

      const aIssue = isIssueMatched(a);
      const bIssue = isIssueMatched(b);
      if (aIssue !== bIssue) return Number(bIssue === true) - Number(aIssue === true);

      const precedenceDiff = sourcePrecedence(a) - sourcePrecedence(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      return sourceScore(b) - sourceScore(a);
    });
}

function renderAdaptiveAnswer(input = {}) {
  const responseMode = getResponseModeFromInput(input);
  const headings = getHeadingsFromInput(input);
  const rawAnswer = input.answer || input.draftAnswer || input.fallbackAnswer || "";

  let rendered = repairStructure(rawAnswer, headings);
  rendered = sanitizeConflictLanguage(rendered, headings, getConflictMetadata(input));
  rendered = protectHeadingSpacing(rendered, headings);

  return normalizeText(rendered);
}

function renderTinaAnswer({
  answer = "",
  sources = [],
  includeSources = false,
  adaptiveContext = null,
  responsePlan = null,
  supersessionAudit = null,
  supersessionResult = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  jurisprudencePayload = null,
  issueClassification = null,
  taxDomainClassification = null,
  primaryDomain = null,
  orchestrationMode = null,
  contextMode = null,
  mode = null,
  metadata = {}
} = {}) {
  let rendered = renderAdaptiveAnswer({
    answer,
    adaptiveContext,
    responsePlan,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    jurisprudencePayload,
    issueClassification,
    taxDomainClassification,
    primaryDomain,
    orchestrationMode,
    contextMode,
    mode,
    metadata
  });

  if (includeSources) {
    const visible = sortVisibleSources(sources).slice(0, MAX_VISIBLE_SOURCES).map(compactSource);
    if (visible.length) {
      const sourceLines = visible.map((s, i) => `${i + 1}. ${s.citation ? `${s.citation} – ` : ""}${s.title} (${s.authorityType})`);
      rendered = `${rendered}\n\nVALIDATED INDEXED SOURCES\n${sourceLines.join("\n")}`;
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
  supersessionAudit = null,
  supersessionResult = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  jurisprudencePayload = null,
  issueClassification = null,
  taxDomainClassification = null,
  primaryDomain = null,
  orchestrationMode = null,
  contextMode = null,
  mode = null
} = {}) {
  const effectiveMode =
    normalizeOrchestrationMode(orchestrationMode || contextMode || mode || metadata?.orchestrationMode || metadata?.mode || "") ||
    getResponseModeFromInput({ adaptiveContext, responsePlan, metadata });

  const sortedSources = sortVisibleSources(sources)
    .slice(0, MAX_VISIBLE_SOURCES)
    .map(compactSource);

  const renderedAnswer = renderTinaAnswer({
    answer,
    sources: sortedSources,
    includeSources: includeSourcesInAnswer,
    adaptiveContext,
    responsePlan,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    jurisprudencePayload,
    issueClassification,
    taxDomainClassification,
    primaryDomain,
    orchestrationMode: effectiveMode,
    contextMode,
    mode,
    metadata
  });

  const headings = getHeadingsFromInput({
    adaptiveContext,
    responsePlan,
    orchestrationMode: effectiveMode,
    metadata
  });

  const conflictMeta =
    conflict ||
    conflictReview ||
    hierarchyConflict ||
    jurisprudencePayload?.conflictReview ||
    jurisprudencePayload?.jurisprudenceConflict ||
    null;

  return {
    success: true,
    answer: renderedAnswer,
    sources: sortedSources,
    metadata: {
      ...metadata,
      renderer: "answer-renderer.js",
      rendererVersion: ENGINE_VERSION,
      formattingOnly: true,
      noOpenAICalls: true,
      noPromptAssembly: true,
      noRetrieval: true,
      orchestrationMode: effectiveMode,
      contextOrchestrationCompatible: true,
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
  const clean = renderTinaAnswer({ answer, orchestrationMode: "LEGAL_ANALYSIS" });

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
    esmCompatible: true,
    contextOrchestrationCompatible: true,
    compactSourcesOnly: true,
    rawSourceInjectionPrevented: true,
    debugOutputSuppressed: true,
    ragAnswerHandlerCompatible: true,
    finalAnswerComplianceCompatible: true
  };
}

export {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
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
  assertStructure,
  normalizeOrchestrationMode,
  answerRendererHealthCheck
};

export default {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
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
  assertStructure,
  normalizeOrchestrationMode,
  answerRendererHealthCheck
};
