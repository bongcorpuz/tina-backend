// FILE: final-answer-compliance.js
"use strict";

/**
 * TINA Final Answer Compliance Engine
 * Version: 5.1.0
 *
 * Final gate only:
 * - no OpenAI calls
 * - no prompt assembly
 * - no retrieval
 * - no token budgeting
 *
 * Key patch:
 * - preserves system/orchestration fallback answers
 * - does not reformat fallback into legal-basis templates
 */

import {
  runSupersessionPreflight,
  filterVisibleSources,
  buildLegalBasisEntry,
  buildSourcesEntry,
  uniqueDocs,
  dedupe,
  normalizeText,
  normalizeLooseText,
  MAX_VISIBLE_SOURCES
} from "./source-visibility-engine.js";

const ENGINE_VERSION = "5.1.0";

const RESPONSE_MODE = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM",
  DEFAULT_AF: "DEFAULT_AF"
});

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function compactText(value = "") {
  return normalizeText(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value = "", max = 1200) {
  const text = compactText(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max).trim()} ...[trimmed]`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMode(mode = "") {
  const raw = String(mode || "").trim().toUpperCase();

  if (Object.values(RESPONSE_MODE).includes(raw)) return raw;
  if (raw.includes("FAST") || raw.includes("QUICK") || raw.includes("DEFINITION")) return RESPONSE_MODE.FAST_DEFINITION;
  if (raw.includes("LEGAL") || raw.includes("DOCTRINE") || raw.includes("JURISPRUDENCE")) return RESPONSE_MODE.LEGAL_ANALYSIS;
  if (
    raw.includes("COMPLEX") ||
    raw.includes("ADVISORY") ||
    raw.includes("AUDIT") ||
    raw.includes("RISK") ||
    raw.includes("CONTRACT") ||
    raw.includes("TRANSACTION") ||
    raw.includes("EVIDENCE")
  ) return RESPONSE_MODE.COMPLEX_ADVISORY;
  if (raw.includes("STANDARD") || raw.includes("TAX")) return RESPONSE_MODE.STANDARD_TAX;

  return RESPONSE_MODE.DEFAULT_AF;
}

function stripInventedSourceSections(text = "") {
  return String(text || "")
    .replace(/\n+\s*6\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*6\.\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*8\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Source:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*References:\s*[\s\S]*$/i, "")
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

function isSystemFallbackAnswer(text = "") {
  const value = normalizeText(text);

  return Boolean(
    /\bTINA could not complete\b/i.test(value) ||
    /\bSYSTEM LIMITATION\b/i.test(value) ||
    /\bActual error:/i.test(value) ||
    /\borchestration-safe OpenAI call failed\b/i.test(value) ||
    /\bprocessing limitation\b/i.test(value) ||
    /\bRAG response due to a processing limitation\b/i.test(value)
  );
}

function preserveSystemFallbackAnswer({
  draftAnswer = "",
  fallbackAnswer = "",
  sourcesUsed = [],
  legalBasisDocs = []
} = {}) {
  const preferred =
    normalizeText(draftAnswer) ||
    normalizeText(fallbackAnswer) ||
    "TINA could not complete the response due to a processing limitation.";

  const clean = stripInventedSourceSections(preferred);

  const sourceDocs = uniqueDocs([
    ...safeArray(sourcesUsed),
    ...safeArray(legalBasisDocs)
  ]).slice(0, MAX_VISIBLE_SOURCES);

  if (!sourceDocs.length) return clean;

  return appendValidatedSourceAppendix(clean, sourceDocs);
}

function getSectionBody(text = "", headingPattern = "") {
  const value = normalizeText(text);
  const regex = new RegExp(
    `${headingPattern}\\s*([\\s\\S]*?)(?=\\n\\s*(?:[A-H]\\.\\s+[A-Z][A-Z /()&-]+\\b|\\d+\\.\\s*[A-Z][A-Z /()&-]+\\b|###\\s+[A-Za-z])|$)`,
    "i"
  );

  return value.match(regex)?.[1]?.trim() || "";
}

function getAFSectionBody(text = "", heading = "") {
  return getSectionBody(text, escapeRegex(heading));
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(
    normalizeText(text)
  );
}

function hasCompleteAFStructure(text = "") {
  return TINA_AF_HEADINGS.every((heading) => hasHeading(text, heading));
}

function hasAnyAFStructure(text = "") {
  return TINA_AF_HEADINGS.some((heading) => hasHeading(text, heading));
}

function splitNonEmptyLines(text = "") {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanBulletPrefix(line = "") {
  return String(line).replace(/^[\-\u2022*\d.)\s]+/, "").trim();
}

function ensureDashedBullets(lines = []) {
  return safeArray(lines)
    .filter(Boolean)
    .map((line) => `- ${cleanBulletPrefix(line)}`)
    .join("\n");
}

function takeSentences(text = "", maxSentences = 4) {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  return (cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned])
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxSentences)
    .join(" ");
}

function containsExplicitRuleLikeValue(text = "") {
  const value = normalizeLooseText(text);

  return (
    /\b\d+(\.\d+)?%\b/.test(value) ||
    /\b₱\s*\d[\d,]*(\.\d+)?\b/i.test(value) ||
    /\b(net taxable income|total assets|deadline|due date|rate|threshold|effective|shall|must|required|subject to|exempt|deductible)\b/i.test(value)
  );
}

function buildValidatedLegalBasis(docs = []) {
  return uniqueDocs(docs).slice(0, MAX_VISIBLE_SOURCES).map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs).slice(0, MAX_VISIBLE_SOURCES).map(buildSourcesEntry);
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  return Boolean(
    conflict.conflict === true &&
      (conflict.conflictType || conflict.type) &&
      (conflict.exactIssue || conflict.sameIssueGate?.sameIssues?.length) &&
      (conflict.exactLegalDimension ||
        conflict.sameIssueGate?.sameDimensions?.length ||
        conflict.legalDimension) &&
      (conflict.sameIssueGate?.passed === true || conflict.exactIssue) &&
      (conflict.oppositeHoldingGate?.passed === true ||
        conflict.oppositeHolding ||
        conflict.oppositeHoldings) &&
      (conflict.resolutionBasis ||
        conflict.reason ||
        conflict.winningAuthority ||
        conflict.controllingAuthority ||
        conflict.controllingSource)
  );
}

function hasConflictSignal(conflict = {}) {
  return Boolean(
    conflict?.conflict ||
      conflict?.doctrinalConflict ||
      conflict?.hierarchyConflict ||
      conflict?.apparentConflict ||
      conflict?.conflictType ||
      conflict?.conflictStatus ||
      conflict?.reason ||
      conflict?.resolutionBasis ||
      conflict?.exactIssue ||
      conflict?.sameIssueGate ||
      conflict?.oppositeHoldingGate
  );
}

function normalizeConflictStatus(conflict = {}) {
  if (!conflictMetadataIsComplete(conflict)) {
    if (conflict?.apparentConflict || conflict?.distinctionType) {
      return "APPARENT_OR_DISTINGUISHABLE";
    }

    return "NO_CONFLICT";
  }

  const type = String(
    conflict.conflictType ||
      conflict.conflictStatus ||
      conflict.status ||
      ""
  ).toUpperCase();

  if (type.includes("DIRECT")) return "DIRECT_CONFLICT";
  if (type.includes("DOCTRINAL")) return "DOCTRINAL_CONFLICT";
  if (type.includes("HIERARCHY")) return "HIERARCHY_CONFLICT";
  if (type.includes("MIXED")) return "MIXED_CONFLICT";

  return conflict.conflict === true ? "CONFLICT" : "NO_CONFLICT";
}

function collectConflictCandidates({
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null
} = {}) {
  const candidates = [];

  for (const item of [
    conflict,
    conflictReview,
    hierarchyConflict,
    jurisprudencePayload?.conflictReview,
    jurisprudencePayload?.jurisprudenceConflict
  ]) {
    if (item && typeof item === "object" && hasConflictSignal(item)) {
      candidates.push(item);
    }
  }

  for (const item of safeArray(conflicts)) {
    if (item && typeof item === "object" && hasConflictSignal(item)) {
      candidates.push(item);
    }
  }

  return candidates;
}

function pickBestConflict({
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null
} = {}) {
  const candidates = collectConflictCandidates({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload
  });

  if (!candidates.length) return null;

  const complete = candidates.filter(conflictMetadataIsComplete);

  if (!complete.length) {
    return candidates.find((item) => item.apparentConflict || item.distinctionType) || null;
  }

  const priority = {
    MIXED_CONFLICT: 1,
    DIRECT_CONFLICT: 2,
    DOCTRINAL_CONFLICT: 3,
    HIERARCHY_CONFLICT: 4,
    CONFLICT: 5,
    APPARENT_OR_DISTINGUISHABLE: 50,
    NO_CONFLICT: 99
  };

  return complete.sort((a, b) => {
    const aStatus = normalizeConflictStatus(a);
    const bStatus = normalizeConflictStatus(b);
    return (priority[aStatus] || 50) - (priority[bStatus] || 50);
  })[0];
}

function sourceNameFromConflict(conflict = {}, side = "A") {
  if (side === "A") {
    return (
      conflict.sourceA ||
      conflict.source_a_path ||
      conflict.source_a_title ||
      conflict.controllingSource ||
      conflict.winningSource ||
      "Source A"
    );
  }

  return (
    conflict.sourceB ||
    conflict.source_b_path ||
    conflict.source_b_title ||
    conflict.overriddenSource ||
    conflict.weakerSource ||
    "Source B"
  );
}

function buildConflictExplanationFromMetadata(conflict = {}) {
  if (!conflictMetadataIsComplete(conflict)) {
    if (conflict?.apparentConflict || conflict?.distinctionType) {
      return [
        "Conflict Detected: NO",
        "The retrieved authorities may appear related, but the metadata does not establish the required same exact issue, same legal dimension, and opposite holding.",
        conflict.distinctionType
          ? `Distinction type: ${trimText(conflict.distinctionType, 300)}`
          : null,
        conflict.reason ? `Reason: ${trimText(conflict.reason, 700)}` : null,
        "Treat the authorities as distinguishable or complementary unless a complete same-issue opposite-holding conflict is established."
      ]
        .filter(Boolean)
        .join("\n");
    }

    return "Conflict Detected: NO\nNo direct doctrinal conflict is detected from the validated indexed sources.";
  }

  const status = normalizeConflictStatus(conflict);

  const exactIssue =
    conflict.exactIssue ||
    conflict.sameIssueGate?.sameIssues?.join(", ") ||
    "The exact legal issue must be determined from the retrieved authorities.";

  const exactLegalDimension =
    conflict.exactLegalDimension ||
    conflict.sameIssueGate?.sameDimensions?.join(", ") ||
    conflict.legalDimension ||
    "Not expressly classified";

  const controllingAuthority =
    conflict.controllingAuthority ||
    conflict.controlling_authority ||
    conflict.winningAuthority ||
    "the higher controlling authority under Philippine tax hierarchy";

  const overriddenAuthority =
    conflict.overriddenAuthority ||
    conflict.weakerAuthority ||
    conflict.overridden_authority ||
    null;

  const resolutionBasis =
    conflict.resolutionBasis ||
    conflict.resolution_basis ||
    conflict.reason ||
    "Apply the Constitution, statute, valid regulations, and controlling court doctrine in proper hierarchy.";

  return [
    "Conflict Detected: YES",
    `Conflict Type: ${status}`,
    `Exact legal issue in conflict: ${trimText(exactIssue, 300)}`,
    `Exact legal dimension: ${trimText(exactLegalDimension, 300)}`,
    `Source A: ${trimText(sourceNameFromConflict(conflict, "A"), 260)}`,
    `Source B: ${trimText(sourceNameFromConflict(conflict, "B"), 260)}`,
    `Controlling doctrine/authority: ${trimText(controllingAuthority, 260)}`,
    overriddenAuthority
      ? `Overridden or limited authority: ${trimText(overriddenAuthority, 260)}`
      : null,
    `Why it controls: ${trimText(resolutionBasis, 900)}`
  ]
    .filter(Boolean)
    .join("\n");
}

function isVagueConflictYes(text = "") {
  const value = normalizeText(text);

  if (!/Conflict Detected:\s*YES/i.test(value)) return false;

  const hasSpecificConflict =
    /Source A:/i.test(value) &&
    /Source B:/i.test(value) &&
    /(Exact issue|Exact legal dimension|Controlling doctrine|Controlling authority|Resolution basis)\s*[:\s]/i.test(value);

  return !(hasSpecificConflict && value.length >= 300);
}

function sanitizeConflictSection(text = "", conflictMetadata = null) {
  const value = normalizeText(text);
  if (!value) return value;

  const replacement = buildConflictExplanationFromMetadata(conflictMetadata || {});

  const legacyConflictBody =
    getSectionBody(value, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(value, String.raw`###\s*Conflict flag\b`);

  if (legacyConflictBody && isVagueConflictYes(legacyConflictBody)) {
    return value.replace(
      /(\b5\.\s*CONFLICT FLAG\b|###\s*Conflict flag\b)[\s\S]*?(?=\n\s*(?:[A-H]\.\s+[A-Z][A-Z /()&-]+\b|\d+\.\s*[A-Z][A-Z /()&-]+\b|###\s+[A-Za-z])|$)/i,
      `D. DOCTRINAL STATUS / CONFLICT ANALYSIS\n${replacement}`
    );
  }

  const afConflictBody = getAFSectionBody(
    value,
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS"
  );

  if (
    afConflictBody &&
    (/Conflict Detected:\s*YES/i.test(afConflictBody) ||
      isVagueConflictYes(afConflictBody)) &&
    !conflictMetadataIsComplete(conflictMetadata)
  ) {
    return value.replace(
      /(D\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS\b)[\s\S]*?(?=\n\s*(?:E\.\s*HIERARCHY ANALYSIS\b|$))/i,
      `D. DOCTRINAL STATUS / CONFLICT ANALYSIS\n${replacement}\n`
    );
  }

  return value;
}

function normalizeLegacyHeadingsToAF(text = "") {
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

function buildDirectAnswer({ draftAnswer = "", fallbackAnswer = "" }) {
  const directBody =
    getAFSectionBody(draftAnswer, "A. DIRECT ANSWER") ||
    getSectionBody(draftAnswer, String.raw`\b1\.\s*DIRECT ANSWER\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Legally defensible conclusion\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Issue\b`);

  return takeSentences(directBody || fallbackAnswer || draftAnswer || "", 4);
}

function buildControllingLegalBasis({ draftAnswer = "", legalBasisDocs = [] }) {
  const body =
    getAFSectionBody(draftAnswer, "B. CONTROLLING LEGAL BASIS") ||
    getSectionBody(draftAnswer, String.raw`\b2\.\s*LEGAL BASIS\b`);

  if (body) return body;

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  return legalBasisLines.length
    ? ensureDashedBullets(legalBasisLines)
    : "- No validated indexed controlling legal basis was available.";
}

function buildSupportingJurisprudence({
  draftAnswer = "",
  jurisprudencePayload = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "C. SUPPORTING JURISPRUDENCE") ||
    getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING JURISPRUDENCE\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Jurisprudence\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Court position\b`);

  if (body) return body;

  const cases = safeArray(
    jurisprudencePayload?.directlyRelevantCases ||
      jurisprudencePayload?.cases ||
      []
  ).slice(0, 4);

  if (jurisprudencePayload?.noJurisprudence || !cases.length) {
    return "No directly issue-matched jurisprudence was retrieved from the indexed context.";
  }

  return ensureDashedBullets(
    cases.map((item) => {
      const title = item.title || item.caseReference || item.citation || "Relevant case";
      const role = item.caseRole || item.caseApplicability || "supporting jurisprudence";
      return `${title} — ${role}`;
    })
  );
}

function buildDoctrinalStatus({
  draftAnswer = "",
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS") ||
    getSectionBody(draftAnswer, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Conflict flag\b`);

  const bestConflict = pickBestConflict({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload
  });

  if (body && !isVagueConflictYes(body) && !/Conflict Detected:\s*YES/i.test(body)) {
    return body;
  }

  return buildConflictExplanationFromMetadata(bestConflict || {});
}

function buildHierarchyAnalysis({
  draftAnswer = "",
  legalBasisDocs = [],
  professionalInsight = "",
  hierarchyConflict = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "E. HIERARCHY ANALYSIS") ||
    getSectionBody(draftAnswer, String.raw`\b4\.\s*PROFESSIONAL INSIGHT\b`);

  if (body) return body;

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  const conflictInstruction =
    conflictMetadataIsComplete(hierarchyConflict)
      ? [
          "A complete hierarchy conflict was detected.",
          hierarchyConflict.controllingAuthority
            ? `The controlling authority identified is ${hierarchyConflict.controllingAuthority}.`
            : "The controlling authority must be determined by legal hierarchy.",
          hierarchyConflict.reason
            ? `Reason: ${hierarchyConflict.reason}`
            : "Apply higher authority over lower authority."
        ].join("\n")
      : "";

  if (legalBasisLines.length) {
    return [
      "Apply the controlling authority in this order: Constitution, NIRC/statute, Supreme Court doctrine, Revenue Regulations, RMC/RMO/RAMO, BIR rulings, CTA decisions, and secondary materials.",
      "Administrative issuances may implement or interpret the Tax Code, but they cannot amend the statute or override controlling judicial doctrine.",
      conflictInstruction,
      professionalInsight || "Use lower-authority materials only as support, not as controlling basis."
    ]
      .filter(Boolean)
      .join("\n");
  }

  return "No validated indexed source was available for hierarchy analysis.";
}

function buildPracticalApplication({
  draftAnswer = "",
  fallbackAnswer = "",
  professionalInsight = "",
  supersessionResult = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "F. PRACTICAL APPLICATION") ||
    getSectionBody(draftAnswer, String.raw`###\s*Recommended action\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Taxpayer risk assessment\b`);

  if (body) return body;

  if (supersessionResult?.superseded?.length) {
    return "One or more indexed sources appeared superseded, so only active controlling sources were retained. Verify the latest BIR issuance and maintain supporting documentation before implementation.";
  }

  return normalizeText(
    professionalInsight ||
      fallbackAnswer ||
      "Verify the latest BIR issuance and documentary requirements before implementation."
  );
}

function buildSupportingRules({ draftAnswer = "", legalBasisDocs = [] }) {
  const body = getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING RULES\b`);

  const lines = splitNonEmptyLines(body)
    .map(cleanBulletPrefix)
    .filter(Boolean);

  if (lines.length) return lines;

  const inferred = [];

  for (const doc of legalBasisDocs.slice(0, 3)) {
    const snippet = normalizeText(
      doc.text ||
        doc.preview ||
        doc.excerpt ||
        doc.content ||
        ""
    );

    if (!snippet) continue;

    const sentences = snippet.match(/[^.!?]+[.!?]?/g) || [];

    for (const sentence of sentences) {
      const trimmed = normalizeText(sentence);

      if (trimmed && containsExplicitRuleLikeValue(trimmed)) {
        inferred.push(trimmed);
      }

      if (inferred.length >= 4) break;
    }

    if (inferred.length >= 4) break;
  }

  return dedupe(inferred).slice(0, 4);
}

function rebuildAFAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  professionalInsight = "",
  supersessionResult = null
}) {
  const finalDirectAnswer = normalizeText(
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      })
  );

  return [
    "A. DIRECT ANSWER",
    finalDirectAnswer ||
      "This requires verification against the latest BIR issuance, NIRC provision, or controlling court authority.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "C. SUPPORTING JURISPRUDENCE",
    buildSupportingJurisprudence({
      draftAnswer: sanitizedDraft,
      jurisprudencePayload
    }),
    "",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    buildDoctrinalStatus({
      draftAnswer: sanitizedDraft,
      conflicts,
      hierarchyConflict,
      conflict,
      conflictReview,
      jurisprudencePayload
    }),
    "",
    "E. HIERARCHY ANALYSIS",
    buildHierarchyAnalysis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs,
      professionalInsight,
      hierarchyConflict
    }),
    "",
    "F. PRACTICAL APPLICATION",
    buildPracticalApplication({
      draftAnswer: sanitizedDraft,
      fallbackAnswer,
      professionalInsight,
      supersessionResult
    })
  ]
    .join("\n")
    .trim();
}

function repairMissingAFSections({
  answer = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  professionalInsight = "",
  supersessionResult = null
}) {
  if (hasCompleteAFStructure(answer)) return answer;

  return rebuildAFAnswer({
    sanitizedDraft: answer,
    fallbackAnswer,
    directAnswer,
    legalBasisDocs,
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    professionalInsight,
    supersessionResult
  });
}

function appendValidatedSourceAppendix(answer = "", docs = []) {
  const sourceLines = buildValidatedSources(docs);

  if (!sourceLines.length) return answer;

  return [
    answer.trim(),
    "",
    "Validated Indexed Sources",
    ensureDashedBullets(sourceLines)
  ].join("\n");
}

function buildFastDefinitionAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = []
}) {
  const answer = takeSentences(
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }),
    3
  );

  const basis = buildValidatedLegalBasis(legalBasisDocs).slice(0, 3);

  return [
    "Direct Answer",
    answer || "No direct answer could be formed from the indexed sources.",
    "",
    "Legal Basis",
    basis.length
      ? ensureDashedBullets(basis)
      : "- No validated indexed legal basis was retrieved."
  ].join("\n");
}

function buildStandardTaxAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  jurisprudencePayload = null,
  professionalInsight = ""
}) {
  const supportingRules = buildSupportingRules({
    draftAnswer: sanitizedDraft,
    legalBasisDocs
  });

  return [
    "Direct Answer",
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }) ||
      "No direct answer could be formed from the indexed sources.",
    "",
    "Legal Basis",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "Supporting Rules",
    Array.isArray(supportingRules)
      ? ensureDashedBullets(supportingRules)
      : supportingRules || "No supporting rule was extracted.",
    "",
    "Practical Note",
    professionalInsight ||
      buildPracticalApplication({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }),
    "",
    "Jurisprudence",
    buildSupportingJurisprudence({
      draftAnswer: sanitizedDraft,
      jurisprudencePayload
    })
  ].join("\n");
}

function buildComplexAdvisoryAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  professionalInsight = "",
  issueClassification = null,
  supersessionResult = null
}) {
  const factSensitivity =
    issueClassification?.factSensitivity ||
    issueClassification?.orchestrationClassification?.factSensitivity ||
    "moderate";

  return [
    "Executive Answer",
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      }) ||
      "The conclusion depends on the final facts and supporting documents.",
    "",
    "Controlling Basis",
    buildControllingLegalBasis({
      draftAnswer: sanitizedDraft,
      legalBasisDocs
    }),
    "",
    "Assumptions / Fact Sensitivity",
    `Fact sensitivity: ${factSensitivity}. The conclusion should be confirmed against the actual contracts, invoices, receipts, accounting entries, and transaction flow.`,
    "",
    "Risk / Practical Application",
    buildPracticalApplication({
      draftAnswer: sanitizedDraft,
      fallbackAnswer,
      professionalInsight,
      supersessionResult
    }),
    "",
    "Recommended Documentation",
    ensureDashedBullets([
      "Executed contract or agreement",
      "Invoices, receipts, billing statements, and official BIR documents",
      "General ledger entries and reconciliations",
      "Proof of actual transaction flow and payment flow",
      "Management explanation supporting the tax position"
    ])
  ].join("\n");
}

function resolveVisibleSources({
  legalBasisDocs = [],
  sourcesUsed = [],
  asOfDate = new Date(),
  query = "",
  issueClassification = null
}) {
  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate,
    query,
    issueClassification
  });

  const visibleSourceDocs =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult,
          query,
          issueClassification
        });

  return {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed,
    visibleSourceDocs
  };
}

export function sanitizeDraftAnswer(text = "", conflictMetadata = null) {
  return sanitizeConflictSection(
    stripInventedSourceSections(text),
    conflictMetadata
  );
}

export function buildFinalCompliantAnswer({
  draftAnswer = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  professionalInsight = "",
  asOfDate = new Date(),
  query = "",
  issueClassification = null,
  mode = null,
  orchestrationMode = null,
  responseMode = null,
  contextMode = null
}) {
  if (
    isSystemFallbackAnswer(draftAnswer) ||
    isSystemFallbackAnswer(fallbackAnswer) ||
    normalizeMode(orchestrationMode || contextMode || mode) === RESPONSE_MODE.EMERGENCY_TRIM
  ) {
    return preserveSystemFallbackAnswer({
      draftAnswer,
      fallbackAnswer,
      sourcesUsed,
      legalBasisDocs
    }).trim();
  }

  const finalMode = normalizeMode(
    mode ||
      orchestrationMode ||
      responseMode ||
      contextMode ||
      issueClassification?.responseMode ||
      issueClassification?.orchestrationClassification?.mode ||
      RESPONSE_MODE.DEFAULT_AF
  );

  const bestConflict = pickBestConflict({
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload
  });

  const rawSanitizedDraft = sanitizeDraftAnswer(draftAnswer, bestConflict);
  const sanitizedDraft = normalizeLegacyHeadingsToAF(rawSanitizedDraft);

  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    visibleSourceDocs
  } = resolveVisibleSources({
    legalBasisDocs,
    sourcesUsed,
    asOfDate,
    query,
    issueClassification
  });

  let finalAnswer;

  if (
    finalMode === RESPONSE_MODE.FAST_DEFINITION ||
    finalMode === RESPONSE_MODE.EMERGENCY_TRIM
  ) {
    finalAnswer = buildFastDefinitionAnswer({
      sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs
    });
  } else if (finalMode === RESPONSE_MODE.STANDARD_TAX) {
    finalAnswer = buildStandardTaxAnswer({
      sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs,
      jurisprudencePayload,
      professionalInsight
    });
  } else if (finalMode === RESPONSE_MODE.COMPLEX_ADVISORY) {
    finalAnswer = buildComplexAdvisoryAnswer({
      sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs,
      professionalInsight,
      issueClassification,
      supersessionResult
    });
  } else {
    if (hasCompleteAFStructure(sanitizedDraft)) {
      finalAnswer = sanitizeConflictSection(sanitizedDraft, bestConflict);
    } else if (hasAnyAFStructure(sanitizedDraft)) {
      finalAnswer = repairMissingAFSections({
        answer: sanitizedDraft,
        fallbackAnswer,
        directAnswer,
        legalBasisDocs: resolvedLegalBasisDocs,
        conflicts,
        hierarchyConflict,
        conflict,
        conflictReview,
        jurisprudencePayload,
        professionalInsight,
        supersessionResult
      });
    } else {
      finalAnswer = rebuildAFAnswer({
        sanitizedDraft,
        fallbackAnswer,
        directAnswer,
        legalBasisDocs: resolvedLegalBasisDocs,
        conflicts,
        hierarchyConflict,
        conflict,
        conflictReview,
        jurisprudencePayload,
        professionalInsight,
        supersessionResult
      });
    }
  }

  finalAnswer = sanitizeConflictSection(finalAnswer, bestConflict);

  return appendValidatedSourceAppendix(finalAnswer, visibleSourceDocs).trim();
}

/**
 * Compatibility wrapper for older modules.
 * Keeps final-answer-compliance.js as final gate only.
 */
export function enforceFinalAnswerCompliance({
  answer = "",
  draftAnswer = "",
  fallbackAnswer = "",
  responseMode = null,
  orchestrationMode = null,
  contextMode = null,
  mode = null,
  legalBasisDocs = [],
  sourcesUsed = [],
  issueClassification = null,
  conflicts = [],
  hierarchyConflict = null,
  conflict = null,
  conflictReview = null,
  jurisprudencePayload = null,
  professionalInsight = "",
  query = "",
  asOfDate = new Date()
} = {}) {
  const finalAnswer = buildFinalCompliantAnswer({
    draftAnswer: draftAnswer || answer,
    fallbackAnswer,
    legalBasisDocs,
    sourcesUsed,
    conflicts,
    hierarchyConflict,
    conflict,
    conflictReview,
    jurisprudencePayload,
    professionalInsight,
    asOfDate,
    query,
    issueClassification,
    mode,
    orchestrationMode,
    responseMode,
    contextMode
  });

  return {
    success: true,
    answer: finalAnswer,
    version: ENGINE_VERSION,
    finalGateOnly: true,
    fallbackPreservationEnabled: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noRetrieval: true
  };
}

export function finalAnswerComplianceHealthCheck() {
  return {
    ok: true,
    engine: "TINA_FINAL_ANSWER_COMPLIANCE",
    version: ENGINE_VERSION,
    finalGateOnly: true,
    noOpenAICalls: true,
    noPromptAssembly: true,
    noRetrieval: true,
    fallbackPreservationEnabled: true,
    fallbackReformattingPrevented: true,
    afStructureCompatible: true,
    modeAwareFormatting: true,
    supportedModes: Object.values(RESPONSE_MODE),
    conflictSanitizerCompatible: true,
    conflictMetadataCompleteGate: true,
    supersessionPreflightCompatible: true,
    issueClassificationCompatible: true,
    sourceVisibilityCompatible: true,
    jurisprudencePayloadCompatible: true,
    contextOrchestrationCompatible: true,
    compactFinalAnswerOutput: true
  };
}

export {
  ENGINE_VERSION,
  RESPONSE_MODE,
  TINA_AF_HEADINGS,
  hasCompleteAFStructure,
  hasAnyAFStructure,
  isSystemFallbackAnswer,
  preserveSystemFallbackAnswer,
  sanitizeConflictSection,
  buildSupportingRules,
  conflictMetadataIsComplete,
  normalizeMode
};

export default {
  sanitizeDraftAnswer,
  sanitizeConflictSection,
  buildFinalCompliantAnswer,
  enforceFinalAnswerCompliance,
  finalAnswerComplianceHealthCheck,
  isSystemFallbackAnswer,
  preserveSystemFallbackAnswer,
  normalizeMode
};
