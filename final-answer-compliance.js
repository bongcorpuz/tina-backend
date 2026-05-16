// FILE: final-answer-compliance.js
"use strict";

/**
 * TINA Final Answer Compliance Engine
 * Version: 3.0.0
 *
 * Patch:
 * - Accepts conflict, conflictReview, hierarchyConflict, and jurisprudencePayload.
 * - Blocks “Conflict Detected: YES” unless conflict metadata is complete.
 * - Passes issueClassification into source visibility / supersession preflight.
 * - Preserves issueClassificationMatch and targetAuthorityMatch-driven source ordering.
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

const ENGINE_VERSION = "3.0.0";

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

function stripInventedSourceSections(text = "") {
  return String(text || "")
    .replace(/\n+\s*6\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*6\.\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Source:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*References:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .replace(/\n+\s*See clickable sources below\.\s*$/i, "")
    .replace(/\n+\s*No clickable sources available\.\s*$/i, "")
    .trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function getSectionBody(text = "", headingPattern) {
  const value = normalizeText(text);

  const regex = new RegExp(
    `${headingPattern}\\s*([\\s\\S]*?)(?=\\n\\s*(?:[A-H]\\.\\s+[A-Z][A-Z /()&-]+\\b|\\d+\\.\\s*[A-Z][A-Z /()&-]+\\b|###\\s+[A-Za-z])|$)`,
    "i"
  );

  const match = value.match(regex);
  return match?.[1]?.trim() || "";
}

function getAFSectionBody(text = "", heading) {
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

function takeSentences(text = "", maxSentences = 4) {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  const parts = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, maxSentences)
    .join(" ");
}

function ensureDashedBullets(lines = []) {
  return lines
    .filter(Boolean)
    .map((line) => `- ${cleanBulletPrefix(line)}`)
    .join("\n");
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
  return uniqueDocs(docs).slice(0, 5).map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs).slice(0, 5).map(buildSourcesEntry);
}

function conflictMetadataIsComplete(conflict = null) {
  if (!conflict || typeof conflict !== "object") return false;

  const hasTrueConflict = conflict.conflict === true;
  const hasConflictType = Boolean(conflict.conflictType || conflict.type);

  const hasExactIssue = Boolean(
    conflict.exactIssue ||
      conflict.sameIssueGate?.sameIssues?.length
  );

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

function normalizeConflictStatus(conflict = {}) {
  if (!conflictMetadataIsComplete(conflict)) {
    if (conflict?.apparentConflict || conflict?.distinctionType) return "APPARENT_OR_DISTINGUISHABLE";
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
    const apparent = candidates.find((item) => item.apparentConflict || item.distinctionType);
    return apparent || null;
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
        "No direct doctrinal conflict is asserted.",
        "The retrieved authorities may appear related, but the metadata does not establish the required same exact issue, same legal dimension, and opposite holding.",
        conflict.distinctionType ? `Distinction type: ${conflict.distinctionType}.` : null,
        conflict.reason ? `Reason: ${conflict.reason}` : null,
        "Treat the authorities as distinguishable or complementary unless a complete same-issue opposite-holding conflict is established."
      ]
        .filter(Boolean)
        .join("\n");
    }

    return "No direct doctrinal conflict is detected from the validated indexed sources. A conflict label requires complete metadata showing the same exact issue, same legal dimension, opposite holding, conflict type, and hierarchy-based resolution.";
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

  const controllingSource =
    conflict.controllingSource ||
    conflict.controlling_source ||
    conflict.winningSource ||
    null;

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
    status === "DIRECT_CONFLICT"
      ? "Direct conflict exists based on complete conflict metadata."
      : status === "DOCTRINAL_CONFLICT"
        ? "Doctrinal conflict exists based on complete conflict metadata."
        : status === "HIERARCHY_CONFLICT"
          ? "Hierarchy conflict exists based on complete conflict metadata."
          : "Conflict exists based on complete conflict metadata.",
    `Exact legal issue in conflict: ${normalizeText(exactIssue)}`,
    `Exact legal dimension: ${normalizeText(exactLegalDimension)}`,
    `Source A: ${sourceNameFromConflict(conflict, "A")}`,
    `Source B: ${sourceNameFromConflict(conflict, "B")}`,
    `Controlling doctrine/authority: ${controllingAuthority}${controllingSource ? ` (${JSON.stringify(controllingSource)})` : ""}.`,
    overriddenAuthority ? `Overridden or limited authority: ${overriddenAuthority}.` : null,
    `Why it controls: ${normalizeText(resolutionBasis)}`,
    "The answer must explain why the controlling authority prevails and whether later authority validly modified earlier authority."
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

  if (hasSpecificConflict && value.length >= 300) return false;

  return true;
}

function sanitizeConflictSection(text = "", conflictMetadata = null) {
  const value = normalizeText(text);
  if (!value) return value;

  const replacement = conflictMetadataIsComplete(conflictMetadata)
    ? buildConflictExplanationFromMetadata(conflictMetadata)
    : "No direct doctrinal conflict is detected from the validated indexed sources. A conflict label requires complete metadata showing the same exact issue, same legal dimension, opposite holding, conflict type, and hierarchy-based resolution.";

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
    (/Conflict Detected:\s*YES/i.test(afConflictBody) || isVagueConflictYes(afConflictBody)) &&
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

  const candidate = directBody || fallbackAnswer || draftAnswer || "";
  return takeSentences(candidate, 4);
}

function buildControllingLegalBasis({ draftAnswer = "", legalBasisDocs = [] }) {
  const body =
    getAFSectionBody(draftAnswer, "B. CONTROLLING LEGAL BASIS") ||
    getSectionBody(draftAnswer, String.raw`\b2\.\s*LEGAL BASIS\b`);

  if (body) return body;

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  if (legalBasisLines.length) {
    return [
      "The following indexed authorities were validated as potential legal bases. Apply them according to hierarchy and classified-issue relevance:",
      ensureDashedBullets(legalBasisLines)
    ].join("\n");
  }

  return [
    "- No validated indexed controlling legal basis was available.",
    "- Verify against the latest NIRC, BIR issuance, or court authority before operational reliance."
  ].join("\n");
}

function buildSupportingJurisprudence({ draftAnswer = "", jurisprudencePayload = null }) {
  const body =
    getAFSectionBody(draftAnswer, "C. SUPPORTING JURISPRUDENCE") ||
    getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING JURISPRUDENCE\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Jurisprudence\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Court position\b`);

  if (body) return body;

  if (jurisprudencePayload?.noJurisprudence) {
    return "No directly issue-matched jurisprudence was retrieved from the indexed context. Do not cite unrelated cases merely because they mention the same tax type.";
  }

  return "No directly issue-matched jurisprudence was retrieved from the indexed context. Do not cite unrelated cases merely because they mention the same tax type.";
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

  if (bestConflict) return buildConflictExplanationFromMetadata(bestConflict);

  return "No direct doctrinal conflict is detected from the validated indexed sources. If authorities address different procedural, evidentiary, jurisdictional, factual, temporal, administrative, contractual, economic-substance, audit, or substantive issues, they should be treated as distinguishable or complementary rather than conflicting.";
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
            : "Apply higher authority over lower authority.",
          "Administrative issuances cannot amend, expand, or override the NIRC, valid statutory rules, or controlling Supreme Court doctrine."
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

  return "No validated indexed source was available for hierarchy analysis. Verify against the latest official NIRC, BIR issuances, and court rulings.";
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
      "Verify the latest BIR issuance and documentary requirements before implementation. Assess the tax consequence, compliance requirement, audit risk, possible BIR position, litigation exposure, documentation requirements, and available taxpayer defense before taking a final position."
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
    const snippet = normalizeText(doc.text || doc.preview || doc.excerpt || "");
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
    buildControllingLegalBasis({ draftAnswer: sanitizedDraft, legalBasisDocs }),
    "",
    "C. SUPPORTING JURISPRUDENCE",
    buildSupportingJurisprudence({ draftAnswer: sanitizedDraft, jurisprudencePayload }),
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
  issueClassification = null
}) {
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

  let finalAnswer;

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

  finalAnswer = sanitizeConflictSection(finalAnswer, bestConflict);

  return appendValidatedSourceAppendix(finalAnswer, visibleSourceDocs).trim();
}

export function sanitizeDraftAnswer(text = "", conflictMetadata = null) {
  return sanitizeConflictSection(stripInventedSourceSections(text), conflictMetadata);
}

export function finalAnswerComplianceHealthCheck() {
  return {
    ok: true,
    engine: "TINA_FINAL_ANSWER_COMPLIANCE",
    version: ENGINE_VERSION,
    afStructureCompatible: true,
    conflictSanitizerCompatible: true,
    conflictMetadataCompleteGate: true,
    supersessionPreflightCompatible: true,
    issueClassificationCompatible: true,
    sourceVisibilityCompatible: true,
    jurisprudencePayloadCompatible: true
  };
}

export {
  TINA_AF_HEADINGS,
  hasCompleteAFStructure,
  hasAnyAFStructure,
  sanitizeConflictSection,
  buildSupportingRules,
  conflictMetadataIsComplete
};

export default {
  sanitizeDraftAnswer,
  sanitizeConflictSection,
  buildFinalCompliantAnswer,
  finalAnswerComplianceHealthCheck
};
