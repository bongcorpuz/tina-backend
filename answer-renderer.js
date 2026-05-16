// FILE: answer-renderer.js
"use strict";

/**
 * TINA Enterprise Adaptive Answer Renderer
 * Version: 5.0.0
 *
 * Purpose:
 * - Render final TINA answers according to selected orchestration mode
 * - Support context-orchestration-engine.js
 * - Prevent raw source/debug/full engine output injection
 * - Gate conflict language unless complete conflict metadata exists
 * - Keep sources compact, relevant, non-duplicated, and issue-matched
 */

const ENGINE_VERSION = "5.0.0";

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
  FAST_DEFINITION: [
    "A. DIRECT ANSWER",
    "B. LEGAL BASIS"
  ],

  STANDARD_TAX: [
    "A. DIRECT ANSWER",
    "B. LEGAL BASIS",
    "C. SUPPORTING RULES",
    "D. PRACTICAL NOTE"
  ],

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

  EMERGENCY_TRIM: [
    "A. DIRECT ANSWER",
    "B. LIMITED BASIS"
  ],

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

const MAX_VISIBLE_SOURCES = 5;
const MAX_SOURCE_TITLE_CHARS = 220;
const MAX_SOURCE_CITATION_CHARS = 260;
const MAX_SOURCE_URL_CHARS = 320;

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function trimText(value = "", max = 1000) {
  const text = normalizeText(value).replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()} ...[trimmed]`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRawSourceSections(text = "") {
  return normalizeText(text)
    .replace(/\n+\s*Sources Used[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:[\s\S]*$/i, "")
    .replace(/\n+\s*Source:[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*CLASSIFICATION CONTROL[\s\S]*$/i, "")
    .replace(/\n+\s*DEBUG[\s\S]*$/i, "")
    .replace(/\n+\s*RAW CONTEXT[\s\S]*$/i, "")
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
  const nextHeadings = headings.slice(index + 1).map(escapeRegex).join("|");

  const regex = nextHeadings
    ? new RegExp(`${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextHeadings})\\b|$)`, "i")
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

  if (raw.includes("FAST") || raw.includes("QUICK") || raw.includes("DEFINITION")) {
    return ORCHESTRATION_MODES.FAST_DEFINITION;
  }

  if (raw.includes("LEGAL") || raw.includes("DOCTRINE") || raw.includes("JURISPRUDENCE")) {
    return ORCHESTRATION_MODES.LEGAL_ANALYSIS;
  }

  if (
    raw.includes("COMPLEX") ||
    raw.includes("ADVISORY") ||
    raw.includes("AUDIT") ||
    raw.includes("RISK") ||
    raw.includes("CONTRACT") ||
    raw.includes("TRANSACTION") ||
    raw.includes("EVIDENCE")
  ) {
    return ORCHESTRATION_MODES.COMPLEX_ADVISORY;
  }

  if (raw.includes("EMERGENCY")) return ORCHESTRATION_MODES.EMERGENCY_TRIM;
  if (raw.includes("STANDARD") || raw.includes("TAX")) return ORCHESTRATION_MODES.STANDARD_TAX;

  return null;
}

function getOrchestrationMode(input = {}) {
  return normalizeOrchestrationMode(
    input.orchestrationMode ||
      input.contextMode ||
      input.mode ||
      input.contextOrchestration?.mode ||
      input.orchestration?.mode ||
      input.metadata?.orchestrationMode ||
      input.metadata?.mode ||
      input.adaptiveContext?.orchestration?.mode ||
      input.responsePlan?.contextMode ||
      ""
  );
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
  const orchestrationMode = getOrchestrationMode(input);
  if (orchestrationMode) return orchestrationMode;

  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  return (
    contract.responseMode ||
    plan.responseMode ||
    input.responseMode ||
    input.adaptiveResponseMode ||
    "LEGAL_ANALYSIS"
  );
}

function getHeadingsFromInput(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);
  const mode = getResponseModeFromInput(input);

  return normalizeArray(
    contract.sections ||
      plan.responseTemplate ||
      FALLBACK_TEMPLATES[mode] ||
      FALLBACK_TEMPLATES.LEGAL_ANALYSIS
  ).filter(Boolean);
}

function defaultBodyForHeading(heading = "", responseMode = "LEGAL_ANALYSIS") {
  const defaults = {
    "A. DIRECT ANSWER":
      "No direct answer was rendered. Verify the controlling authority, facts, and supporting evidence before relying on the position.",
    "A. EXECUTIVE ANSWER":
      "No executive answer was rendered. The conclusion remains subject to verification of facts and source authority.",
    "A. SIMPLE ANSWER":
      "No simple answer was rendered.",
    "B. CONTROLLING LEGAL BASIS":
      "No controlling legal basis was rendered. TINA should identify the applicable Constitution, NIRC/statute, Revenue Regulation, BIR issuance, or court authority before final use.",
    "B. LEGAL BASIS":
      "No legal basis was rendered.",
    "B. SHORT BASIS":
      "No short basis was rendered.",
    "B. LIMITED BASIS":
      "No limited basis was rendered.",
    "C. SUPPORTING JURISPRUDENCE":
      "No issue-relevant jurisprudence was rendered. TINA should not cite unrelated cases merely because they mention the same tax type.",
    "C. SUPPORTING RULES":
      "No supporting rules were rendered.",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "No doctrinal conflict should be asserted unless conflict metadata confirms the same exact issue, same legal dimension, opposite holding, conflict type, and hierarchy-based resolution.",
    "E. HIERARCHY ANALYSIS":
      "Apply Philippine legal hierarchy. Lower authorities cannot override higher authorities.",
    "F. PRACTICAL APPLICATION":
      "Verify the latest official authority and maintain supporting documentation before relying on the position.",
    "D. PRACTICAL NOTE":
      "Verify the latest official authority and supporting documentation before implementation.",
    "G. RECOMMENDED POSITION":
      "No recommended position was rendered."
  };

  return defaults[heading] || `No ${heading.replace(/^[A-Z]\.\s*/, "").toLowerCase()} was rendered.`;
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS, responseMode = "LEGAL_ANALYSIS") {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));
  if (hasStructure(clean, headings)) return clean;

  const sections = headings.map((heading) => {
    const body = getSectionBody(clean, heading, headings) || defaultBodyForHeading(heading, responseMode);
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
    input.hierarchyConflict ||
    input.jurisprudenceConflict ||
    input.jurisprudencePayload?.conflictReview ||
    input.jurisprudencePayload?.jurisprudenceConflict ||
    input.adaptiveContext?.conflict ||
    input.adaptiveContext?.conflictReview ||
    input.adaptiveContext?.hierarchyConflict ||
    input.responsePlan?.conflict ||
    input.responsePlan?.conflictReview ||
    null
  );
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);
  const hasExactIssue = Boolean(conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.length);

  const hasExactDimension = Boolean(
    conflict.exactLegalDimension ||
      conflict.exact_legal_dimension ||
      conflict.sameIssueGate?.sameDimensions?.length ||
      conflict.legalDimension
  );

  const sameIssuePassed =
    conflict.sameIssueGate?.passed === true ||
    Boolean(conflict.exactIssue || conflict.exact_issue);

  const oppositeHoldingPassed =
    conflict.oppositeHoldingGate?.passed === true ||
    Boolean(conflict.oppositeHolding || conflict.oppositeHoldings);

  const hasResolution = Boolean(
    conflict.resolutionBasis ||
      conflict.resolution_basis ||
      conflict.reason ||
      conflict.winningAuthority ||
      conflict.controllingAuthority ||
      conflict.controlling_authority ||
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

function buildConflictMetadataBlock(conflict = null) {
  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "Conflict Detected: NO",
      "No direct doctrinal conflict is asserted.",
      "A conflict label requires complete metadata showing same exact legal issue, same legal dimension, opposite holding, conflict type, and controlling authority or hierarchy-based resolution.",
      "Authorities involving different substantive, procedural, evidentiary, jurisdictional, temporal, factual, contractual, economic-substance, audit, transaction, or administrative issues should be treated as distinguishable, not conflicting."
    ].join("\n");
  }

  const exactIssue =
    conflict.exactIssue ||
    conflict.exact_issue ||
    conflict.sameIssueGate?.sameIssues?.join(", ") ||
    "Not specified";

  const exactDimension =
    conflict.exactLegalDimension ||
    conflict.exact_legal_dimension ||
    conflict.sameIssueGate?.sameDimensions?.join(", ") ||
    conflict.legalDimension ||
    "Not specified";

  const conflictType = conflict.conflictType || conflict.type || "DOCTRINAL_CONFLICT";
  const resolution =
    conflict.resolutionBasis ||
    conflict.resolution_basis ||
    conflict.reason ||
    "Hierarchy-based resolution required.";

  const controllingAuthority =
    conflict.controllingAuthority ||
    conflict.controlling_authority ||
    conflict.winningAuthority ||
    conflict.winningSource?.authorityType ||
    conflict.winningSource?.authorityLabel ||
    "Not clearly identified";

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${trimText(conflictType, 160)}`,
    `Exact Issue: ${trimText(exactIssue, 260)}`,
    `Exact Legal Dimension: ${trimText(exactDimension, 260)}`,
    `Controlling Authority: ${trimText(controllingAuthority, 260)}`,
    `Resolution Basis: ${trimText(resolution, 700)}`
  ].join("\n");
}

function findConflictHeading(headings = TINA_AF_HEADINGS) {
  return (
    headings.find((heading) =>
      /DOCTRINAL STATUS|CONFLICT ANALYSIS|CONFLICT/i.test(heading)
    ) || null
  );
}

function replaceSection(text = "", heading = "", headings = TINA_AF_HEADINGS, replacementBody = "") {
  const clean = normalizeText(text);
  const index = headings.indexOf(heading);

  if (index < 0 || !hasHeading(clean, heading)) return clean;

  const current = escapeRegex(heading);
  const nextHeadings = headings.slice(index + 1).map(escapeRegex).join("|");

  const regex = nextHeadings
    ? new RegExp(`(${current}\\b)[\\s\\S]*?(?=\\n\\s*(?:${nextHeadings})\\b|$)`, "i")
    : new RegExp(`(${current}\\b)[\\s\\S]*$`, "i");

  return clean.replace(regex, `${heading}\n${replacementBody}`);
}

function containsConflictLanguage(text = "") {
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

  if (!conflictHeading) {
    if (!containsConflictLanguage(clean)) return clean;
    if (conflictMetadataIsComplete(conflictMetadata)) return `${clean}\n\nDOCTRINAL STATUS\n${buildConflictMetadataBlock(conflictMetadata)}`;
    return clean.replace(/Conflict Detected:\s*YES/gi, "Conflict Detected: NO");
  }

  const body = getSectionBody(clean, conflictHeading, headings);

  if (!body) return clean;

  const metadataComplete = conflictMetadataIsComplete(conflictMetadata);

  if (metadataComplete) {
    return replaceSection(clean, conflictHeading, headings, buildConflictMetadataBlock(conflictMetadata));
  }

  if (containsConflictLanguage(body) || !hasConflictSpecifics(body)) {
    return replaceSection(clean, conflictHeading, headings, buildConflictMetadataBlock(null));
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

function sourceAuthorityType(source = {}) {
  return source.authorityType || source.authority_type || source.authorityLabel || source.authority_label || "Source";
}

function sourcePrecedence(source = {}) {
  return Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.authorityLevel ??
      source.authority_level ??
      99
  );
}

function sourceScore(source = {}) {
  return Number(
    source.finalScore ||
      source.final_score ||
      source.rerankScore ||
      source.retrievalScore ||
      source.score ||
      0
  );
}

function getTaxDomainClassification(input = {}) {
  return (
    input.taxDomainClassification ||
    input.tax_domain_classification ||
    input.issueClassification?.taxDomainClassification ||
    input.issueClassification?.tax_domain_classification ||
    input.adaptiveContext?.taxDomainClassification ||
    input.adaptiveContext?.issueClassification?.taxDomainClassification ||
    input.adaptiveContext?.queryIntent?.taxDomainClassification ||
    input.responsePlan?.taxDomainClassification ||
    input.metadata?.taxDomainClassification ||
    null
  );
}

function getPrimaryDomain(input = {}) {
  const taxDomainClassification = getTaxDomainClassification(input);

  return (
    input.primaryDomain ||
    input.primary_domain ||
    input.issueClassification?.primaryDomain ||
    input.issueClassification?.primary_domain ||
    taxDomainClassification?.primaryDomain ||
    taxDomainClassification?.primary_domain ||
    input.adaptiveContext?.issueClassification?.primaryDomain ||
    input.adaptiveContext?.queryIntent?.primaryDomain ||
    input.metadata?.primaryDomain ||
    null
  );
}

function getIssueClassification(input = {}) {
  return (
    input.issueClassification?.orchestrationClassification ||
    input.issueClassification ||
    input.adaptiveContext?.issueClassification?.orchestrationClassification ||
    input.adaptiveContext?.issueClassification ||
    input.adaptiveContext?.queryIntent?.issueClassification ||
    input.responsePlan?.issueClassification ||
    input.metadata?.issueClassification ||
    null
  );
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

function isPrimaryDomainMatched(source = {}, input = {}) {
  const expectedDomain = getPrimaryDomain(input);
  if (!expectedDomain) return null;

  const sourceDomain =
    source.primaryDomain ||
    source.primary_domain ||
    source.retrievalMetadata?.primaryDomain ||
    source.issueClassificationMatch?.primaryDomain ||
    source.metadata?.primaryDomain ||
    null;

  if (!sourceDomain) return null;

  return String(sourceDomain).toUpperCase() === String(expectedDomain).toUpperCase();
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

  for (const source of normalizeArray(sources)) {
    const key = normalizeSourceKey(source);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function compactSource(source = {}) {
  return {
    title: trimText(
      source.title ||
        source.sourceTitle ||
        source.source ||
        source.sourcePath ||
        source.source_path ||
        source.path ||
        "Untitled Source",
      MAX_SOURCE_TITLE_CHARS
    ),

    citation: trimText(
      source.citation ||
        source.reference ||
        source.normalizedReference ||
        source.normalized_reference ||
        source.issuanceNumber ||
        source.issuance_number ||
        source.title ||
        "",
      MAX_SOURCE_CITATION_CHARS
    ),

    url: trimText(
      source.url ||
        source.driveViewUrl ||
        source.drive_url ||
        source.driveViewURL ||
        source.sourceUrl ||
        "",
      MAX_SOURCE_URL_CHARS
    ),

    authorityType: sourceAuthorityType(source),
    authorityLevel: Number(source.authorityLevel || source.authority_level || 99),
    controllingPrecedence: sourcePrecedence(source),
    score: sourceScore(source),

    issueClassificationMatch: source.issueClassificationMatch || null,
    targetAuthorityMatch: isTargetAuthorityMatched(source),
    domainMatch: source.domainMatch ?? null
  };
}

function sortVisibleSources(sources = [], input = {}) {
  return [...dedupeSources(sources)]
    .filter((source) => source.issueMismatch !== true)
    .filter((source) => source.issueClassificationMatch?.issueMismatch !== true)
    .sort((a, b) => {
      const domainDiff =
        Number(isPrimaryDomainMatched(b, input) === true) -
        Number(isPrimaryDomainMatched(a, input) === true);
      if (domainDiff !== 0) return domainDiff;

      const targetDiff =
        Number(isTargetAuthorityMatched(b)) -
        Number(isTargetAuthorityMatched(a));
      if (targetDiff !== 0) return targetDiff;

      const aIssue = isIssueMatched(a);
      const bIssue = isIssueMatched(b);

      if (aIssue !== bIssue) return Number(bIssue === true) - Number(aIssue === true);

      const precedenceDiff = sourcePrecedence(a) - sourcePrecedence(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      return sourceScore(b) - sourceScore(a);
    });
}

function renderSources(sources = [], input = {}) {
  const visible = sortVisibleSources(sources, input)
    .slice(0, MAX_VISIBLE_SOURCES)
    .map(compactSource);

  if (!visible.length) return "";

  const lines = visible.map((source, index) => {
    const title = source.citation && !source.title.includes(source.citation)
      ? `${source.citation} – ${source.title}`
      : source.title;

    const matchFlags = [
      isPrimaryDomainMatched(source, input) === true ? "Domain Match" : null,
      source.targetAuthorityMatch ? "Target Authority Match" : null,
      source.issueClassificationMatch?.matched === true ||
      source.issueClassificationMatch?.issueOverlap === true
        ? "Issue Match"
        : null
    ].filter(Boolean);

    return `${index + 1}. ${title} (${source.authorityType})${matchFlags.length ? ` [${matchFlags.join("; ")}]` : ""}`;
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
    ].filter(Boolean).join("\n");
  });

  return ["", "SUPERSESSION AUDIT", ...lines].join("\n\n");
}

function renderRiskBlock(riskBlock = null) {
  if (!riskBlock) return "";

  const lines = [];

  if (riskBlock.overallRisk) {
    const risk =
      typeof riskBlock.overallRisk === "object"
        ? `${riskBlock.overallRisk.level || ""}${riskBlock.overallRisk.score != null ? ` (${riskBlock.overallRisk.score})` : ""}`.trim()
        : String(riskBlock.overallRisk);

    if (risk) lines.push(`Overall Risk: ${risk}`);
  }

  if (riskBlock.taxpayerDefensibility) lines.push(`Taxpayer Defensibility: ${riskBlock.taxpayerDefensibility}`);
  if (riskBlock.positionStrength) lines.push(`Position Strength: ${riskBlock.positionStrength}`);
  if (riskBlock.conclusionRestriction) lines.push(`Conclusion Restriction: ${riskBlock.conclusionRestriction}`);

  return lines.length ? `RISK AND POSITION CONTROL\n${lines.join("\n")}` : "";
}

function renderClassificationBlock(input = {}) {
  const issueClassification = getIssueClassification(input);
  if (!issueClassification) return "";

  const taxDomainClassification = getTaxDomainClassification(input);
  const lines = [];

  const primaryDomain = getPrimaryDomain(input);
  const primaryDomainName =
    taxDomainClassification?.primaryDomainName ||
    taxDomainClassification?.primary_domain_name ||
    null;

  if (primaryDomain) {
    lines.push(`Tax Domain: ${primaryDomain}${primaryDomainName ? ` — ${primaryDomainName}` : ""}`);
  }

  if (issueClassification.primaryIssue) lines.push(`Primary Issue: ${issueClassification.primaryIssue}`);
  if (issueClassification.subIssue) lines.push(`Sub-Issue: ${issueClassification.subIssue}`);

  if (issueClassification.retrievalStrategy || taxDomainClassification?.retrievalStrategy) {
    lines.push(`Retrieval Strategy: ${issueClassification.retrievalStrategy || taxDomainClassification.retrievalStrategy}`);
  }

  if (normalizeArray(issueClassification.targetAuthorities).length) {
    lines.push(`Target Authorities: ${normalizeArray(issueClassification.targetAuthorities).join(", ")}`);
  }

  if (!lines.length) return "";

  return `CLASSIFICATION CONTROL\n${lines.join("\n")}`;
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
  if (/LIMITATION\b/i.test(answer)) return answer;
  return `${answer}\n\nLIMITATION\n${limitation}`;
}

function applyRiskBlock(answer = "", input = {}) {
  const rendered = renderRiskBlock(input.riskBlock || input.riskScore);
  if (!rendered || answer.includes("RISK AND POSITION CONTROL")) return answer;
  return `${answer}\n\n${rendered}`;
}

function applyClassificationBlock(answer = "", input = {}) {
  const shouldShow =
    input.includeClassificationBlock === true ||
    input.responsePlan?.includeClassificationBlock === true ||
    input.adaptiveContext?.responsePlan?.includeClassificationBlock === true;

  if (!shouldShow) return answer;

  const rendered = renderClassificationBlock(input);
  if (!rendered || answer.includes("CLASSIFICATION CONTROL")) return answer;
  return `${rendered}\n\n${answer}`;
}

function applySupersessionAudit(answer = "", input = {}) {
  const rendered = renderSupersessionAudit(input.supersessionAudit || input.supersessionResult);
  if (!rendered || answer.includes("SUPERSESSION AUDIT")) return answer;
  return `${answer}\n${rendered}`;
}

function applyConflictMetadata(answer = "", input = {}, headings = TINA_AF_HEADINGS) {
  return sanitizeConflictLanguage(answer, headings, getConflictMetadata(input));
}

function renderAdaptiveAnswer(input = {}) {
  const responseMode = getResponseModeFromInput(input);
  const headings = getHeadingsFromInput(input);
  const rawAnswer = input.answer || input.draftAnswer || input.fallbackAnswer || "";

  let rendered = repairStructure(rawAnswer, headings, responseMode);
  rendered = applyConflictMetadata(rendered, input, headings);
  rendered = protectHeadingSpacing(rendered, headings);
  rendered = applyLimitation(rendered, input);
  rendered = applyRiskBlock(rendered, input);
  rendered = applyClassificationBlock(rendered, input);
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
  supersessionResult = null,
  conflict = null,
  conflictReview = null,
  hierarchyConflict = null,
  jurisprudencePayload = null,
  issueClassification = null,
  taxDomainClassification = null,
  primaryDomain = null,
  includeClassificationBlock = false,
  orchestrationMode = null,
  contextMode = null,
  mode = null,
  metadata = {}
} = {}) {
  const effectiveIssueClassification =
    issueClassification ||
    getIssueClassification({
      adaptiveContext,
      responsePlan,
      metadata
    });

  const effectiveTaxDomainClassification =
    taxDomainClassification ||
    getTaxDomainClassification({
      issueClassification: effectiveIssueClassification,
      adaptiveContext,
      responsePlan,
      metadata
    });

  let rendered = renderAdaptiveAnswer({
    answer,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    jurisprudencePayload,
    issueClassification: effectiveIssueClassification,
    taxDomainClassification: effectiveTaxDomainClassification,
    primaryDomain,
    includeClassificationBlock,
    orchestrationMode,
    contextMode,
    mode,
    metadata
  });

  if (includeSources) {
    const sourceBlock = renderSources(sources, {
      issueClassification: effectiveIssueClassification,
      taxDomainClassification: effectiveTaxDomainClassification,
      primaryDomain
    });

    if (sourceBlock) rendered = `${rendered}\n${sourceBlock}`;
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
  contextOrchestration = null
} = {}) {
  const effectiveIssueClassification =
    issueClassification ||
    getIssueClassification({
      adaptiveContext,
      responsePlan,
      metadata
    });

  const effectiveTaxDomainClassification =
    taxDomainClassification ||
    getTaxDomainClassification({
      issueClassification: effectiveIssueClassification,
      adaptiveContext,
      responsePlan,
      metadata
    });

  const effectivePrimaryDomain =
    primaryDomain ||
    getPrimaryDomain({
      issueClassification: effectiveIssueClassification,
      taxDomainClassification: effectiveTaxDomainClassification,
      adaptiveContext,
      responsePlan,
      metadata
    });

  const effectiveMode =
    normalizeOrchestrationMode(
      orchestrationMode ||
        contextMode ||
        mode ||
        contextOrchestration?.mode ||
        metadata?.orchestrationMode ||
        metadata?.mode ||
        ""
    ) || getResponseModeFromInput({ adaptiveContext, responsePlan, metadata });

  const sortedSources = sortVisibleSources(sources, {
    issueClassification: effectiveIssueClassification,
    taxDomainClassification: effectiveTaxDomainClassification,
    primaryDomain: effectivePrimaryDomain
  })
    .slice(0, MAX_VISIBLE_SOURCES)
    .map(compactSource);

  const renderedAnswer = renderTinaAnswer({
    answer,
    sources: sortedSources,
    includeSources: includeSourcesInAnswer,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength,
    supersessionAudit,
    supersessionResult,
    conflict,
    conflictReview,
    hierarchyConflict,
    jurisprudencePayload,
    issueClassification: effectiveIssueClassification,
    taxDomainClassification: effectiveTaxDomainClassification,
    primaryDomain: effectivePrimaryDomain,
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
      primaryDomain: effectivePrimaryDomain,
      taxDomainClassification: effectiveTaxDomainClassification,
      taxDomainClassificationAware: true,
      issueClassification: effectiveIssueClassification,
      issueClassificationAware: true,
      issueClassificationMatchAware: true,
      targetAuthorityAware: true,
      domainAwareSourceOrdering: true
    }
  };
}

function assertAFStructure(answer = "") {
  const clean = renderTinaAnswer({
    answer,
    orchestrationMode: ORCHESTRATION_MODES.LEGAL_ANALYSIS
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
    esmCompatible: true,
    adaptiveCompatible: true,
    contextOrchestrationCompatible: true,
    orchestrationModeAware: true,
    supportedOrchestrationModes: Object.values(ORCHESTRATION_MODES),
    issueClassificationAware: true,
    taxDomainClassificationAware: true,
    primaryDomainAware: true,
    conflictMetadataGated: true,
    domainAwareSourceOrdering: true,
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
