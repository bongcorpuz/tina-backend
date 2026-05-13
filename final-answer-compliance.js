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
    .replace(/\n+\s*See clickable sources below\.\s*$/i, "")
    .replace(/\n+\s*No clickable sources available\.\s*$/i, "")
    .trim();
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
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return getSectionBody(text, escaped);
}

function hasCompleteAFStructure(text = "") {
  const value = normalizeText(text);
  return TINA_AF_HEADINGS.every((heading) => {
    const pattern = new RegExp(
      `(^|\\n)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    return pattern.test(value);
  });
}

function hasAnyAFStructure(text = "") {
  const value = normalizeText(text);
  return TINA_AF_HEADINGS.some((heading) => {
    const pattern = new RegExp(
      `(^|\\n)\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
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
    return ensureDashedBullets(legalBasisLines);
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
    getSectionBody(draftAnswer, String.raw`###\s*Jurisprudence\b`);

  if (body) return body;

  return "No directly issue-matched jurisprudence was retrieved from the indexed context. TINA should not cite unrelated cases merely because they mention the same tax type.";
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

  const specificConflict =
    Array.isArray(conflicts) &&
    conflicts.find((conflict) => {
      const aProvision =
        conflict.source_a_section ||
        conflict.sourceASection ||
        conflict.section_a ||
        conflict.sectionA ||
        "";
      const bProvision =
        conflict.source_b_section ||
        conflict.sourceBSection ||
        conflict.section_b ||
        conflict.sectionB ||
        "";
      const contradiction =
        conflict.contradiction ||
        conflict.reason ||
        conflict.description ||
        conflict.conflict_reason ||
        "";

      return (
        String(aProvision).trim() &&
        String(bProvision).trim() &&
        String(contradiction).trim()
      );
    });

  if (specificConflict) {
    const sourceA =
      specificConflict.source_a_title ||
      specificConflict.sourceATitle ||
      specificConflict.source_a_path ||
      specificConflict.sourceAPath ||
      "Source A";

    const sourceB =
      specificConflict.source_b_title ||
      specificConflict.sourceBTitle ||
      specificConflict.source_b_path ||
      specificConflict.sourceBPath ||
      "Source B";

    const sectionA =
      specificConflict.source_a_section ||
      specificConflict.sourceASection ||
      specificConflict.section_a ||
      specificConflict.sectionA ||
      "Unknown provision";

    const sectionB =
      specificConflict.source_b_section ||
      specificConflict.sourceBSection ||
      specificConflict.section_b ||
      specificConflict.sectionB ||
      "Unknown provision";

    const contradiction =
      specificConflict.contradiction ||
      specificConflict.reason ||
      specificConflict.description ||
      specificConflict.conflict_reason ||
      "A specific contradiction was detected.";

    const controllingAuthority =
      hierarchyConflict?.controllingAuthority ||
      hierarchyConflict?.controlling_authority ||
      "the higher controlling authority under Philippine tax law hierarchy";

    return [
      "Partial or direct conflict may exist based on the retrieved evidence.",
      `Exact issue in conflict: ${normalizeText(contradiction)}`,
      `Source A: ${sourceA}, ${sectionA}`,
      `Source B: ${sourceB}, ${sectionB}`,
      `Controlling doctrine/authority: ${controllingAuthority}.`,
      "The conflict must be resolved by applying the Constitution, statute, valid regulations, and controlling court doctrine in proper hierarchy. TINA should not merely flag the conflict; it must explain whether the distinction is substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative."
    ].join("\n");
  }

  if (hierarchyConflict?.conflict) {
    return [
      "Partial or apparent hierarchy conflict exists.",
      hierarchyConflict.sourceA ? `Source A: ${hierarchyConflict.sourceA}` : null,
      hierarchyConflict.sourceB ? `Source B: ${hierarchyConflict.sourceB}` : null,
      hierarchyConflict.reason ? `Issue: ${hierarchyConflict.reason}` : null,
      hierarchyConflict.controllingAuthority
        ? `Controlling authority: ${hierarchyConflict.controllingAuthority}.`
        : "Controlling authority: higher authority prevails under Philippine tax hierarchy.",
      "The answer must explain why the controlling authority prevails and whether the conflict is direct or merely apparent."
    ]
      .filter(Boolean)
      .join("\n");
  }

  return "No direct doctrinal conflict is detected from the validated indexed sources. If authorities address different procedural, evidentiary, jurisdictional, factual, or temporal issues, they should be treated as distinguishable or complementary rather than conflicting.";
}

function buildHierarchyAnalysis({
  draftAnswer = "",
  legalBasisDocs = [],
  professionalInsight = ""
}) {
  const body =
    getAFSectionBody(draftAnswer, "E. HIERARCHY ANALYSIS") ||
    getSectionBody(draftAnswer, String.raw`\b4\.\s*PROFESSIONAL INSIGHT\b`);

  if (body) return body;

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);

  if (legalBasisLines.length) {
    return [
      "Apply the controlling authority in this order: Constitution, NIRC/statute, Revenue Regulations, RMC/RMO/RAMO, BIR rulings, Supreme Court doctrine, CTA decisions, and secondary materials.",
      "Administrative issuances may implement or interpret the Tax Code, but they cannot amend the statute or override controlling judicial doctrine.",
      professionalInsight || "Use lower-authority materials only as support, not as controlling basis."
    ].join("\n");
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
      "Verify the latest BIR issuance and documentary requirements before implementation. Assess the tax consequence, compliance requirement, audit risk, possible BIR position, and available taxpayer defense before taking a final position."
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
    /(Section|Sec\.?|Item|Article|Provision)\s+/i.test(value);

  if (hasSpecificConflict) return false;

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

  if (
    legacyConflictBody &&
    isVagueConflictYes(legacyConflictBody)
  ) {
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
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS");

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
    professionalInsight
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
