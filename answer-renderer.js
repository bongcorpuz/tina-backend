// FILE: answer-renderer.js
"use strict";

/**
 * TINA Answer Renderer
 * Version: 5.2.0
 *
 * Formatting-only layer.
 * No OpenAI calls.
 * No prompt assembly.
 * No retrieval.
 * No reranking.
 * No legal reasoning generation.
 */

const ENGINE_VERSION = "5.2.0";

const ORCHESTRATION_MODES = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM",
  SENIOR_COUNSEL_MEMO: "SENIOR_COUNSEL_MEMO"
});

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const FAST_DEFINITION_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. PRACTICAL NOTE"
]);

const COMPLEX_ADVISORY_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. FACTS / ASSUMPTIONS",
  "C. CONTROLLING LEGAL BASIS",
  "D. ANALYSIS",
  "E. AUDIT / TAX RISK",
  "F. DOCUMENTARY GAPS",
  "G. PRACTICAL POSITION"
]);

// Senior Tax Counsel Memo — for LITIGATION, TECHNICAL, ADVISORY modes
const SENIOR_COUNSEL_MEMO_HEADINGS = Object.freeze([
  "RULING",
  "LEGAL BASIS",
  "ANALYSIS",
  "QUALIFICATIONS",
  "OPEN ISSUES",
  "RECOMMENDED ACTION",
  "POSITION STRENGTH"
]);

const POSITION_STRENGTH_VALUES = Object.freeze(["STRONG", "MODERATE", "WEAK", "INDEFENSIBLE"]);

const FALLBACK_TEMPLATES = Object.freeze({
  FAST_DEFINITION: FAST_DEFINITION_HEADINGS,
  STANDARD_TAX: TINA_AF_HEADINGS,
  LEGAL_ANALYSIS: TINA_AF_HEADINGS,
  COMPLEX_ADVISORY: COMPLEX_ADVISORY_HEADINGS,
  EMERGENCY_TRIM: FAST_DEFINITION_HEADINGS,
  SENIOR_COUNSEL_MEMO: SENIOR_COUNSEL_MEMO_HEADINGS,
  LITIGATION_MEMO: SENIOR_COUNSEL_MEMO_HEADINGS,

  QUICK: FAST_DEFINITION_HEADINGS,
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

/**
 * Master Prompt hierarchy:
 * 1 Constitution
 * 2 NIRC / CMTA / LGC / primary statutes
 * 3 Tax Treaties
 * 4 Supreme Court En Banc
 * 5 Supreme Court Division
 * 6 CTA En Banc
 * 7 CTA Division
 * 8 Revenue Regulations
 * 9 RMC / RMO / RAMO
 * 10 BIR Rulings
 * 11 LGU / BOC issuances
 * 12 PFRS / PAS / PSA
 * 13 OECD / foreign persuasive authorities
 * 14 CPA reviewer notes / secondary materials
 */
const AUTHORITY_PRECEDENCE = Object.freeze({
  CONSTITUTION: 1,

  STATUTE: 2,
  NIRC: 2,
  TAX_CODE: 2,
  CMTA: 2,
  LGC: 2,
  REPUBLIC_ACT: 2,
  RA: 2,

  TAX_TREATY: 3,
  TREATY: 3,

  SUPREME_COURT_EN_BANC: 4,
  SUPREME_COURT: 5,
  SC: 5,

  CTA_EN_BANC: 6,
  CTA_DIVISION: 7,
  COURT_OF_APPEALS: 7,

  RR: 8,
  REVENUE_REGULATION: 8,

  RMC: 9,
  RMO: 9,
  RAMO: 9,

  BIR_RULING: 10,

  LGU: 11,
  LGU_ISSUANCE: 11,
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  PEZA_ISSUANCE: 11,
  SEC_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,
  SECONDARY: 14,

  UNKNOWN: 99
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
    .replace(/\n+\*{0,2}Sources\*{0,2}\s*\n[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*CLASSIFICATION CONTROL[\s\S]*$/i, "")
    .replace(/\n+\s*DEBUG[\s\S]*$/i, "")
    .replace(/\n+\s*RAW CONTEXT[\s\S]*$/i, "")
    .replace(/\n+\s*RETRIEVAL PAYLOAD[\s\S]*$/i, "")
    .replace(/\n+\s*JSON DUMP[\s\S]*$/i, "")
    .replace(/```json[\s\S]*?```/gi, "")
    .trim();
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

function hasPositionStrength(text = "") {
  return /\bPOSITION STRENGTH\s*:/i.test(normalizeText(text));
}

function enforcePositionStrength(text = "") {
  const clean = normalizeText(text);
  if (!hasPositionStrength(clean)) return clean;
  return clean.replace(
    /POSITION STRENGTH\s*:\s*([^\n]*)/gi,
    (match, value) => {
      const upper = value.trim().toUpperCase();
      const valid = POSITION_STRENGTH_VALUES.find((v) => upper.includes(v));
      return valid
        ? `POSITION STRENGTH: ${valid} — ${value.trim().replace(new RegExp(`^${valid}\\s*—?\\s*`, "i"), "")}`
        : match;
    }
  );
}

function normalizeLegacyHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*2\.\s*CONTROLLING LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1D. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL NOTE / APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/(^|\n)\s*E\.\s*HIERARCHY ANALYSIS\b/gi, "$1E. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/(^|\n)\s*F\.\s*PRACTICAL APPLICATION\b/gi, "$1F. PRACTICAL NOTE / APPLICATION")
    .replace(/(^|\n)\s*B\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*C\.\s*SUPPORTING RULES(?:\s*\/\s*ADMINISTRATIVE\s+ISSUANCES)?\b/gi, "$1C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES")
    .replace(/(^|\n)\s*C\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1D. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*D\.\s*DOCTRINAL STATUS \/ CONFLICT ANALYSIS\b/gi, "$1E. DOCTRINAL STATUS / CONFLICT ANALYSIS");
}

function normalizeOrchestrationMode(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  if (Object.values(ORCHESTRATION_MODES).includes(raw)) return raw;
  if (raw.includes("SENIOR_COUNSEL") || raw.includes("LITIGATION_MEMO") || raw.includes("COUNSEL_MEMO")) return "SENIOR_COUNSEL_MEMO";
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
      input.requiredAnswerSections ||
      input.issueClassification?.requiredAnswerSections ||
      input.issueClassification?.taxDomainClassification?.requiredAnswerSections ||
      FALLBACK_TEMPLATES[mode] ||
      FALLBACK_TEMPLATES.LEGAL_ANALYSIS
  );
}

function defaultBodyForHeading(heading = "") {
  const defaults = {
    "A. DIRECT ANSWER": "Indexed source not found.",
    "A. EXECUTIVE ANSWER": "Indexed source not found.",
    "A. SIMPLE ANSWER": "Indexed source not found.",

    "B. CONTROLLING LEGAL BASIS": "Indexed source not found.",
    "B. LEGAL BASIS": "Indexed source not found.",
    "B. SHORT BASIS": "Indexed source not found.",
    "B. LIMITED BASIS": "Indexed source not found.",

    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES": "Indexed source not found.",
    "C. SUPPORTING RULES": "Indexed source not found.",
    "D. SUPPORTING JURISPRUDENCE": "Indexed source not found.",

    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "Conflict Detected: NO\nNo direct doctrinal conflict is established from the validated indexed sources.",

    "F. PRACTICAL NOTE / APPLICATION":
      "Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.",

    "F. PRACTICAL APPLICATION":
      "Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.",

    // Senior Tax Counsel Memo headings
    "RULING":             "Indexed source not found.",
    "LEGAL BASIS":        "Indexed source not found.",
    "ANALYSIS":           "Indexed source not found.",
    "QUALIFICATIONS":     "No conditions that change the ruling have been identified.",
    "OPEN ISSUES":        "No unresolved doctrinal issues identified.",
    "RECOMMENDED ACTION": "Indexed source not found.",
    "POSITION STRENGTH":  "MODERATE — Position requires verification against current indexed authority."
  };

  return defaults[heading] || "Indexed source not found.";
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS) {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));
  if (hasStructure(clean, headings)) return clean;

  const hasAnyHeading = safeArray(headings).some((heading) => hasHeading(clean, heading));

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
      (conflict.conflictType || conflict.type || conflict.conflictStatus) &&
      (conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.length || conflict.sameExactIssue === true) &&
      (conflict.exactLegalDimension ||
        conflict.exact_legal_dimension ||
        conflict.sameIssueGate?.sameDimensions?.length ||
        conflict.legalDimension ||
        conflict.sameLegalDimension === true) &&
      (conflict.sameIssueGate?.passed === true || conflict.exactIssue || conflict.exact_issue || conflict.sameExactIssue === true) &&
      (conflict.oppositeHoldingGate?.passed === true ||
        conflict.oppositeHolding ||
        conflict.oppositeHoldings ||
        conflict.oppositeHoldingOrRule === true) &&
      (conflict.resolutionBasis ||
        conflict.resolution_basis ||
        conflict.conflictResolutionBasis ||
        conflict.hierarchyAnalysis ||
        conflict.reason ||
        conflict.controllingAuthority ||
        conflict.controlling_authority ||
        conflict.controllingSource)
  );
}

function buildConflictMetadataBlock(conflict = null) {
  if (!conflictMetadataIsComplete(conflict)) {
    return [
      "Conflict Detected: NO",
      "No direct doctrinal conflict is established from the validated indexed sources.",
      "A conflict label requires complete same-issue, same-dimension, opposite-holding, conflict-type, and hierarchy-resolution metadata."
    ].join("\n");
  }

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${trimText(conflict.conflictType || conflict.type || conflict.conflictStatus || "DOCTRINAL_CONFLICT", 160)}`,
    `Exact Issue: ${trimText(conflict.exactIssue || conflict.exact_issue || conflict.sameIssueGate?.sameIssues?.join(", ") || "Not specified", 260)}`,
    `Exact Legal Dimension: ${trimText(conflict.exactLegalDimension || conflict.exact_legal_dimension || conflict.sameIssueGate?.sameDimensions?.join(", ") || conflict.legalDimension || "Not specified", 260)}`,
    `Controlling Authority: ${trimText(conflict.controllingAuthority || conflict.controlling_authority || conflict.winningAuthority || "Not clearly identified", 260)}`,
    `Resolution Basis: ${trimText(conflict.resolutionBasis || conflict.resolution_basis || conflict.conflictResolutionBasis || conflict.hierarchyAnalysis || conflict.reason || "Hierarchy-based resolution required.", 700)}`
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

  for (const heading of safeArray(headings)) {
    clean = clean.replace(new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi"), `\n\n${heading}\n`);
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    TAX_CODE: "STATUTE",
    NIRC: "STATUTE",
    RA: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    NATIONAL_INTERNAL_REVENUE_CODE: "STATUTE",
    CMTA: "CMTA",
    LGC: "LGC",

    TREATY: "TAX_TREATY",
    TAX_TREATY: "TAX_TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SC: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    COURT_CASES: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",

    BIR_RULINGS: "BIR_RULING",
    RULING: "BIR_RULING",

    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    FIRB: "FIRB_ISSUANCE",
    PEZA: "PEZA_ISSUANCE",
    PEZA_MEMO: "PEZA_ISSUANCE",
    SEC: "SEC_GUIDANCE",

    OECD: "OECD_GUIDANCE",

    CPA_NOTE: "CPA_NOTES",
    REVIEW: "REVIEW_MATERIALS",
    REVIEWER: "REVIEW_MATERIALS",
    SECONDARY_SOURCE: "SECONDARY"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function sourceAuthorityType(source = {}) {
  return normalizeAuthorityType(
    source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      source.authority_label ||
      source.metadata?.authorityType ||
      source.metadata?.sourceType ||
      "UNKNOWN"
  );
}

function sourcePrecedence(source = {}) {
  const explicit = Number(
    source.controllingPrecedence ??
      source.controlling_precedence ??
      source.authorityLevel ??
      source.authority_level ??
      source.metadata?.controllingPrecedence ??
      source.metadata?.authorityLevel
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) return explicit;

  return AUTHORITY_PRECEDENCE[sourceAuthorityType(source)] || AUTHORITY_PRECEDENCE.UNKNOWN;
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
    source.reference,
    source.normalizedReference,
    source.normalized_reference,
    source.title,
    source.source,
    source.sourcePath,
    source.source_path,
    source.path,
    source.url,
    source.driveViewUrl
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
  const authorityType = sourceAuthorityType(source);

  return {
    title: trimText(
      source.title ||
        source.sourceTitle ||
        source.source ||
        source.sourcePath ||
        source.source_path ||
        source.path ||
        "Untitled Source",
      220
    ),
    citation: trimText(
      source.citation ||
        source.reference ||
        source.normalizedReference ||
        source.normalized_reference ||
        source.issuanceNumber ||
        source.issuance_number ||
        "",
      260
    ),
    url: trimText(
      source.url ||
        source.driveViewUrl ||
        source.drive_url ||
        source.sourceUrl ||
        "",
      320
    ),
    authorityType,
    authorityLevel: sourcePrecedence(source),
    controllingPrecedence: sourcePrecedence(source),
    score: sourceScore(source),
    issueClassificationMatch: source.issueClassificationMatch || null,
    targetAuthorityMatch: isTargetAuthorityMatched(source),
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    rawFullTextHidden: true
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
  const headings = getHeadingsFromInput(input);
  const rawAnswer = input.answer || input.draftAnswer || input.fallbackAnswer || "";

  let rendered = repairStructure(rawAnswer, headings);
  rendered = sanitizeConflictLanguage(rendered, headings, getConflictMetadata(input));
  rendered = protectHeadingSpacing(rendered, headings);
  if (headings === SENIOR_COUNSEL_MEMO_HEADINGS || headings.includes("POSITION STRENGTH")) {
    rendered = enforcePositionStrength(rendered);
  }

  rendered = rendered
    .replace(/No legal basis was rendered\./gi, "Indexed source not found.")
    .replace(/No supporting rules were rendered\./gi, "Indexed source not found.")
    .replace(/No controlling legal basis was rendered\./gi, "Indexed source not found.")
    .replace(/No issue-relevant jurisprudence was rendered\./gi, "Indexed source not found.");

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
  const resolvedMode = String(mode || orchestrationMode || contextMode || "").toUpperCase();
  const isQuizMode = resolvedMode === "QUIZ_MODE" || resolvedMode === "QUIZ";
  const isReviewerMode = resolvedMode === "REVIEWER_MODE" || resolvedMode === "REVIEWER";

  let rendered;
  if (isQuizMode || isReviewerMode) {
    rendered = normalizeText(stripRawSourceSections(answer));
  } else {
    rendered = renderAdaptiveAnswer({
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
  }

  if (includeSources) {
    const visible = sortVisibleSources(sources)
      .slice(0, MAX_VISIBLE_SOURCES)
      .map(compactSource);

    if (visible.length) {
      const sourceLines = visible.map((s, i) => {
        const label = `${s.citation ? `${s.citation} – ` : ""}${s.title}`;
        const linked = s.url ? `[${label}](${s.url})` : label;
        return `${i + 1}. ${linked} (${s.authorityType})`;
      });

      rendered = `${rendered}\n\n**Sources**\n${sourceLines.join("\n")}`;
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
    metadata,
    issueClassification
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
      noReranking: true,
      noLegalReasoningGeneration: true,

      orchestrationMode: effectiveMode,
      contextOrchestrationCompatible: true,
      ragAnswerHandlerCompatible: true,
      finalAnswerComplianceCompatible: true,

      structurePreserved: hasStructure(renderedAnswer, headings),
      afStructurePreserved: hasCompleteAFStructure(renderedAnswer),

      sourceCount: sortedSources.length,
      compactSourcesOnly: true,
      rawSourceInjectionPrevented: true,
      debugOutputSuppressed: true,

      conflictLanguageGated: true,
      conflictMetadataComplete: conflictMetadataIsComplete(conflictMeta),

      issueClassificationAware: true,
      targetAuthorityAware: true,

      masterPromptAuthorityHierarchyApplied: true,
      courtAuthorityNotSubordinatedToBIRIssuances: true,
      indexedSourceNotFoundFallbackEnabled: true
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
    noReranking: true,
    noLegalReasoningGeneration: true,
    esmCompatible: true,
    contextOrchestrationCompatible: true,
    compactSourcesOnly: true,
    rawSourceInjectionPrevented: true,
    debugOutputSuppressed: true,
    ragAnswerHandlerCompatible: true,
    finalAnswerComplianceCompatible: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    indexedSourceNotFoundFallbackEnabled: true,
    seniorCounselMemoFormatSupported: true,
    positionStrengthEnforced: true
  };
}

export {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
  TINA_AF_HEADINGS,
  FAST_DEFINITION_HEADINGS,
  COMPLEX_ADVISORY_HEADINGS,
  SENIOR_COUNSEL_MEMO_HEADINGS,
  POSITION_STRENGTH_VALUES,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  hasPositionStrength,
  enforcePositionStrength,
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
  FAST_DEFINITION_HEADINGS,
  COMPLEX_ADVISORY_HEADINGS,
  SENIOR_COUNSEL_MEMO_HEADINGS,
  POSITION_STRENGTH_VALUES,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  hasPositionStrength,
  enforcePositionStrength,
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
