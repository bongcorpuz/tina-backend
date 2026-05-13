// FILE: final-answer-compliance.js

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

const TINA_AF_HEADINGS = [
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
];

function stripInventedSourceSections(text = "") {
  return String(text || "")
    .replace(/\n+\s*6\.\s*SOURCES[\s\S]*$/i, "")
    .replace(/\n+\s*6\.\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*SOURCES USED[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Source:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*References:\s*[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*See clickable sources below\.\s*$/i, "")
    .replace(/\n+\s*No clickable sources available\.\s*$/i, "")
    .trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSectionBody(text = "", headingPattern) {
  const value = normalizeText(text);
  const regex = new RegExp(
    `${headingPattern}([\\s\\S]*?)(?=\\n\\s*(?:[A-F]\\.\\s+[A-Z][A-Z /]+\\b|\\d+\\.\\s*[A-Z][A-Z ]+\\b|###\\s+[A-Za-z])|$)`,
    "i"
  );

  const match = value.match(regex);
  return match?.[1]?.trim() || "";
}

function getAFSectionBody(text = "", heading) {
  return getSectionBody(text, escapeRegex(heading));
}

function hasCompleteAFStructure(text = "") {
  const value = normalizeText(text);
  return TINA_AF_HEADINGS.every((heading) => {
    const pattern = new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i");
    return pattern.test(value);
  });
}

function hasAnyAFStructure(text = "") {
  const value = normalizeText(text);
  return TINA_AF_HEADINGS.some((heading) => {
    const pattern = new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i");
    return pattern.test(value);
  });
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
  return lines.map((line) => `- ${cleanBulletPrefix(line)}`).join("\n");
}

function containsExplicitRuleLikeValue(text = "") {
  const value = normalizeLooseText(text);

  return (
    /\b\d+(\.\d+)?%\b/.test(value) ||
    /\b₱\s*\d[\d,]*(\.\d+)?\b/i.test(value) ||
    /\b(net taxable income|total assets|deadline|due date|rate|threshold|effective)\b/i.test(value) ||
    /\bshall\b/.test(value)
  );
}

function buildValidatedLegalBasis(docs = []) {
  return uniqueDocs(docs).slice(0, 5).map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs).slice(0, 5).map(buildSourcesEntry);
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

function buildControllingLegalBasis({
  draftAnswer = "",
  legalBasisDocs = []
}) {
  const body =
    getAFSectionBody(draftAnswer, "B. CONTROLLING LEGAL BASIS") ||
    getSectionBody(draftAnswer, String.raw`\b2\.\s*LEGAL BASIS\b`);

  if (body) return body;

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  if (legalBasisLines.length) {
    return [
      "The following indexed authorities were validated as potential legal bases. TINA must still apply them according to hierarchy and issue relevance:",
      ensureDashedBullets(legalBasisLines)
    ].join("\n");
  }

  return [
    "- No validated indexed controlling legal basis was available.",
    "- This may require verification against the latest NIRC, BIR issuance, or court authority."
  ].join("\n");
}

function buildSupportingJurisprudence({ draftAnswer = "" }) {
  const body =
    getAFSectionBody(draftAnswer, "C. SUPPORTING JURISPRUDENCE") ||
    getSectionBody(draftAnswer, String.raw`\b3\.\s*SUPPORTING JURISPRUDENCE\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Jurisprudence\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Court position\b`);

  if (body) return body;

  return "No directly issue-matched jurisprudence was retrieved from the indexed context. TINA should not cite unrelated cases merely because they mention the same tax type.";
}

function normalizeConflictStatus(conflict = {}) {
  const type = String(
    conflict.conflictType ||
      conflict.conflictStatus ||
      conflict.status ||
      ""
  ).toUpperCase();

  if (conflict.apparentConflict || type.includes("APPARENT")) {
    return "APPARENT_CONFLICT";
  }

  if (
    conflict.doctrinalConflict ||
    type.includes("DOCTRINAL") ||
    type.includes("DIRECT") ||
    type.includes("PARTIAL")
  ) {
    if (type.includes("DIRECT")) return "DIRECT_CONFLICT";
    if (type.includes("PARTIAL")) return "PARTIAL_CONFLICT";
    return "DOCTRINAL_CONFLICT";
  }

  if (conflict.hierarchyConflict || type.includes("HIERARCHY")) {
    return "HIERARCHY_CONFLICT";
  }

  if (conflict.conflict) return "CONFLICT";

  return "NO_CONFLICT";
}

function hasConflictSignal(conflict = {}) {
  return (
    conflict?.conflict ||
    conflict?.doctrinalConflict ||
    conflict?.hierarchyConflict ||
    conflict?.apparentConflict ||
    conflict?.conflictType ||
    conflict?.conflictStatus ||
    conflict?.reason ||
    conflict?.resolutionBasis ||
    conflict?.exactIssue
  );
}

function pickBestConflict(conflicts = [], hierarchyConflict = null) {
  const candidates = [];

  if (hierarchyConflict && hasConflictSignal(hierarchyConflict)) {
    candidates.push({
      source: "hierarchyConflict",
      ...hierarchyConflict
    });
  }

  for (const conflict of conflicts || []) {
    if (hasConflictSignal(conflict)) candidates.push(conflict);
  }

  if (!candidates.length) return null;

  const priority = {
    DIRECT_CONFLICT: 1,
    DOCTRINAL_CONFLICT: 2,
    PARTIAL_CONFLICT: 3,
    HIERARCHY_CONFLICT: 4,
    APPARENT_CONFLICT: 5,
    CONFLICT: 6,
    NO_CONFLICT: 99
  };

  return candidates.sort((a, b) => {
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
  const status = normalizeConflictStatus(conflict);
  const exactIssue =
    conflict.exactIssue ||
    conflict.issue ||
    conflict.reason ||
    conflict.contradiction ||
    "The exact legal issue must be determined from the retrieved authorities.";

  const distinctionType =
    conflict.distinctionType ||
    conflict.distinction_type ||
    conflict.dimension ||
    "not expressly classified";

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

  if (status === "APPARENT_CONFLICT") {
    return [
      "Apparent conflict only.",
      `Exact issue reviewed: ${normalizeText(exactIssue)}`,
      `Distinction type: ${distinctionType}.`,
      "The authorities should be treated as distinguishable or complementary if they address different substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative requirements.",
      "For VAT, cases dealing with substantiation, administrative claim timing, and judicial claim timing are not automatically conflicting; they usually address different procedural or evidentiary requirements."
    ].join("\n");
  }

  if (status === "DIRECT_CONFLICT") {
    return [
      "Direct conflict exists based on the conflict metadata.",
      `Exact legal issue in conflict: ${normalizeText(exactIssue)}`,
      `Source A: ${sourceNameFromConflict(conflict, "A")}`,
      `Source B: ${sourceNameFromConflict(conflict, "B")}`,
      `Controlling doctrine/authority: ${controllingAuthority}${controllingSource ? ` (${controllingSource})` : ""}.`,
      overriddenAuthority ? `Overridden or limited authority: ${overriddenAuthority}.` : null,
      `Why it controls: ${normalizeText(resolutionBasis)}`,
      "The answer must explain why the controlling authority prevails and whether later authority validly modified earlier rulings."
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (status === "PARTIAL_CONFLICT" || status === "DOCTRINAL_CONFLICT") {
    return [
      status === "PARTIAL_CONFLICT"
        ? "Partial doctrinal conflict exists."
        : "Doctrinal conflict exists.",
      `Exact issue reviewed: ${normalizeText(exactIssue)}`,
      `Distinction type: ${distinctionType}.`,
      `Controlling doctrine/authority: ${controllingAuthority}${controllingSource ? ` (${controllingSource})` : ""}.`,
      overriddenAuthority ? `Weaker or limited authority: ${overriddenAuthority}.` : null,
      `Resolution basis: ${normalizeText(resolutionBasis)}`,
      "The answer must reconcile the authorities rather than merely flag a conflict."
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (status === "HIERARCHY_CONFLICT" || status === "CONFLICT") {
    return [
      "Hierarchy conflict signal exists.",
      `Exact issue reviewed: ${normalizeText(exactIssue)}`,
      `Controlling authority: ${controllingAuthority}${controllingSource ? ` (${controllingSource})` : ""}.`,
      overriddenAuthority ? `Lower or limited authority: ${overriddenAuthority}.` : null,
      `Resolution basis: ${normalizeText(resolutionBasis)}`,
      "The conflict must be resolved through Philippine legal hierarchy. Lower administrative issuances cannot amend, expand, or override statutes or controlling judicial doctrine."
    ]
      .filter(Boolean)
      .join("\n");
  }

  return "No direct doctrinal conflict is detected from the validated indexed sources. If authorities address different procedural, evidentiary, jurisdictional, factual, temporal, administrative, or substantive issues, they should be treated as distinguishable or complementary rather than conflicting.";
}

function buildDoctrinalStatus({
  draftAnswer = "",
  conflicts = [],
  hierarchyConflict = null
}) {
  const body =
    getAFSectionBody(draftAnswer, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS") ||
    getSectionBody(draftAnswer, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Conflict flag\b`);

  if (body && !isVagueConflictYes(body)) return body;

  const bestConflict = pickBestConflict(conflicts, hierarchyConflict);

  if (bestConflict) {
    return buildConflictExplanationFromMetadata(bestConflict);
  }

  return "No direct doctrinal conflict is detected from the validated indexed sources. If authorities address different procedural, evidentiary, jurisdictional, factual, temporal, administrative, or substantive issues, they should be treated as distinguishable or complementary rather than conflicting.";
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

  const conflictInstruction = hierarchyConflict?.conflict || hierarchyConflict?.hierarchyConflict
    ? [
        "A hierarchy conflict signal was detected.",
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
      "Apply the controlling authority in this order: Constitution, NIRC/statute, Revenue Regulations, RMC/RMO/RAMO, BIR rulings, Supreme Court doctrine, CTA decisions, and secondary materials.",
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
    return "One or more indexed sources appeared superseded, so only active controlling sources were retained for the final answer. The taxpayer should verify the latest BIR issuance and maintain supporting documentation before implementation.";
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

function isVagueConflictYes(text = "") {
  const value = normalizeText(text);

  if (!/Conflict Detected:\s*YES/i.test(value)) return false;

  const hasSpecificConflict =
    /Source A:/i.test(value) &&
    /Source B:/i.test(value) &&
    /(Section|Sec\.?|Item|Article|Provision|Exact issue|Controlling doctrine|Distinction type|Resolution basis)\s*[:\s]/i.test(value);

  if (hasSpecificConflict && value.length >= 300) return false;

  return (
    /secondary sources may not fully align/i.test(value) ||
    /higher authority prevails/i.test(value) ||
    /may not fully align/i.test(value) ||
    value.length < 300
  );
}

function sanitizeConflictSection(text = "") {
  const value = normalizeText(text);
  if (!value) return value;

  const legacyConflictBody =
    getSectionBody(value, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(value, String.raw`###\s*Conflict flag\b`);

  if (legacyConflictBody && isVagueConflictYes(legacyConflictBody)) {
    return value.replace(
      /(\b5\.\s*CONFLICT FLAG\b|###\s*Conflict flag\b)[\s\S]*?(?=\n\s*(?:[A-F]\.\s+[A-Z][A-Z /]+\b|\d+\.\s*[A-Z][A-Z ]+\b|###\s+[A-Za-z])|$)/i,
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo direct doctrinal conflict is detected from the validated indexed sources. A mere general statement that higher authority prevails is not sufficient to establish a doctrinal conflict."
    );
  }

  const afConflictBody = getAFSectionBody(
    value,
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS"
  );

  if (afConflictBody && isVagueConflictYes(afConflictBody)) {
    return value.replace(
      /(D\.\s*DOCTRINAL STATUS\s*\/\s*CONFLICT ANALYSIS\b)[\s\S]*?(?=\n\s*(?:E\.\s*HIERARCHY ANALYSIS\b|$))/i,
      "D. DOCTRINAL STATUS / CONFLICT ANALYSIS\nNo direct doctrinal conflict is detected from the validated indexed sources. A mere general statement that higher authority prevails is not sufficient to establish a doctrinal conflict.\n"
    );
  }

  return value;
}

function normalizeLegacyHeadingsToAF(text = "") {
  let value = normalizeText(text);

  if (!value) return value;

  value = value
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

  return value;
}

function rebuildAFAnswer({
  sanitizedDraft = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  conflicts = [],
  hierarchyConflict = null,
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

  const controllingLegalBasis = buildControllingLegalBasis({
    draftAnswer: sanitizedDraft,
    legalBasisDocs
  });

  const supportingJurisprudence = buildSupportingJurisprudence({
    draftAnswer: sanitizedDraft
  });

  const doctrinalStatus = buildDoctrinalStatus({
    draftAnswer: sanitizedDraft,
    conflicts,
    hierarchyConflict
  });

  const hierarchyAnalysis = buildHierarchyAnalysis({
    draftAnswer: sanitizedDraft,
    legalBasisDocs,
    professionalInsight,
    hierarchyConflict
  });

  const practicalApplication = buildPracticalApplication({
    draftAnswer: sanitizedDraft,
    fallbackAnswer,
    professionalInsight,
    supersessionResult
  });

  return [
    "A. DIRECT ANSWER",
    finalDirectAnswer ||
      "This may require verification against the latest BIR issuance, NIRC provision, or controlling court authority.",
    "",
    "B. CONTROLLING LEGAL BASIS",
    controllingLegalBasis,
    "",
    "C. SUPPORTING JURISPRUDENCE",
    supportingJurisprudence,
    "",
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
    doctrinalStatus,
    "",
    "E. HIERARCHY ANALYSIS",
    hierarchyAnalysis,
    "",
    "F. PRACTICAL APPLICATION",
    practicalApplication
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
  professionalInsight = "",
  asOfDate = new Date()
}) {
  const rawSanitizedDraft = sanitizeDraftAnswer(draftAnswer);
  const sanitizedDraft = normalizeLegacyHeadingsToAF(rawSanitizedDraft);

  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate
  });

  const visibleSourceDocs =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

  let finalAnswer;

  if (hasCompleteAFStructure(sanitizedDraft)) {
    finalAnswer = sanitizeConflictSection(sanitizedDraft);
  } else if (hasAnyAFStructure(sanitizedDraft)) {
    finalAnswer = repairMissingAFSections({
      answer: sanitizedDraft,
      fallbackAnswer,
      directAnswer,
      legalBasisDocs: resolvedLegalBasisDocs,
      conflicts,
      hierarchyConflict,
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
      professionalInsight,
      supersessionResult
    });
  }

  finalAnswer = sanitizeConflictSection(finalAnswer);

  return appendValidatedSourceAppendix(finalAnswer, visibleSourceDocs).trim();
}

export function sanitizeDraftAnswer(text = "") {
  return sanitizeConflictSection(stripInventedSourceSections(text));
}

export { sanitizeConflictSection };

export default {
  sanitizeDraftAnswer,
  sanitizeConflictSection,
  buildFinalCompliantAnswer
};
