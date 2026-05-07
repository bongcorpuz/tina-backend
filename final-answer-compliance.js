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
    `${headingPattern}([\\s\\S]*?)(?=\\n\\s*(?:\\d+\\.\\s*[A-Z][A-Z ]+\\b|###\\s+[A-Za-z])|$)`,
    "i"
  );

  const match = value.match(regex);
  return match?.[1]?.trim() || "";
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

function forceConflictDetectedNo() {
  return "Conflict Detected: NO";
}

function buildConflictSection({ conflicts = [], hierarchyConflict = null }) {
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
      "Higher authority prevails";

    const recommendedAction = hierarchyConflict?.overrideApplied
      ? "Recommended Action: Follow the controlling court authority."
      : "Recommended Action: Follow the higher authority pending clarification.";

    return [
      "Conflict Detected: YES",
      `Source A: ${sourceA}, ${sectionA}`,
      `Source B: ${sourceB}, ${sectionB}`,
      `Contradiction: ${normalizeText(contradiction)}`,
      `Controlling Authority: ${controllingAuthority}`,
      recommendedAction
    ].join("\n");
  }

  if (hierarchyConflict?.conflict) {
    return [
      "Conflict Detected: YES",
      hierarchyConflict.sourceA ? `Source A: ${hierarchyConflict.sourceA}` : null,
      hierarchyConflict.sourceB ? `Source B: ${hierarchyConflict.sourceB}` : null,
      hierarchyConflict.reason ? `Reason: ${hierarchyConflict.reason}` : null,
      hierarchyConflict.controllingAuthority
        ? `Controlling Authority: ${hierarchyConflict.controllingAuthority}`
        : null,
      hierarchyConflict.controllingSource
        ? `Recommended Action: Follow ${hierarchyConflict.controllingSource}`
        : null
    ]
      .filter(Boolean)
      .join("\n");
  }

  return forceConflictDetectedNo();
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

function buildDirectAnswer({ draftAnswer = "", fallbackAnswer = "" }) {
  const directBody =
    getSectionBody(draftAnswer, String.raw`\b1\.\s*DIRECT ANSWER\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Legally defensible conclusion\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Issue\b`);

  const candidate = directBody || fallbackAnswer || draftAnswer || "";
  return takeSentences(candidate, 4);
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

function buildProfessionalInsight({
  draftAnswer = "",
  defaultInsight = "",
  supersessionResult = null
}) {
  const body =
    getSectionBody(draftAnswer, String.raw`\b4\.\s*PROFESSIONAL INSIGHT\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Recommended action\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Taxpayer risk assessment\b`);

  if (body) return takeSentences(body, 3);

  if (supersessionResult?.superseded?.length) {
    return "One or more indexed sources appeared superseded, so only active controlling sources were retained for the final answer.";
  }

  return normalizeText(
    defaultInsight ||
      "Verify the latest BIR issuance and documentary requirements before implementation."
  );
}

function buildValidatedLegalBasis(docs = []) {
  return uniqueDocs(docs).slice(0, 5).map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs).slice(0, 5).map(buildSourcesEntry);
}

function ensureDashedBullets(lines = []) {
  return lines.map((line) => `- ${cleanBulletPrefix(line)}`).join("\n");
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
  const sanitizedDraft = sanitizeDraftAnswer(draftAnswer);

  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate
  });

  const finalDirectAnswer = normalizeText(
    directAnswer ||
      buildDirectAnswer({
        draftAnswer: sanitizedDraft,
        fallbackAnswer
      })
  );

  const legalBasisLines = buildValidatedLegalBasis(resolvedLegalBasisDocs);

  const visibleSourceDocs =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

  const supportingRuleLines = buildSupportingRules({
    draftAnswer: sanitizedDraft,
    legalBasisDocs: resolvedLegalBasisDocs
  });

  const finalInsight = buildProfessionalInsight({
    draftAnswer: sanitizedDraft,
    defaultInsight: professionalInsight,
    supersessionResult
  });

  const finalConflict = buildConflictSection({
    conflicts,
    hierarchyConflict
  });

  const sourceLines = buildValidatedSources(visibleSourceDocs);

  return [
    "1. DIRECT ANSWER",
    finalDirectAnswer ||
      "This may require verification against the latest BIR issuance. Please consult the BIR website or a licensed CPA.",
    "",
    "2. LEGAL BASIS",
    legalBasisLines.length
      ? ensureDashedBullets(legalBasisLines)
      : "- This may require verification against the latest BIR issuance. Please consult the BIR website or a licensed CPA.",
    "",
    "3. SUPPORTING RULES",
    supportingRuleLines.length
      ? ensureDashedBullets(supportingRuleLines)
      : "- This may require verification against the latest BIR issuance. Please consult the BIR website or a licensed CPA.",
    "",
    "4. PROFESSIONAL INSIGHT",
    finalInsight,
    "",
    "5. CONFLICT FLAG",
    finalConflict,
    "",
    "6. SOURCES",
    sourceLines.length
      ? ensureDashedBullets(sourceLines)
      : "- No displayable validated source available."
  ]
    .join("\n")
    .trim();
}

export function sanitizeDraftAnswer(text = "") {
  return sanitizeConflictSection(stripInventedSourceSections(text));
}

export function sanitizeConflictSection(text = "") {
  const value = normalizeText(text);
  if (!value) return value;

  const conflictBody =
    getSectionBody(value, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(value, String.raw`###\s*Conflict flag\b`);

  if (!conflictBody) return value;

  const hasSpecificConflict =
    /Source A:/i.test(conflictBody) &&
    /Source B:/i.test(conflictBody) &&
    /(Section|Sec\.?|Item|Article)\s+/i.test(conflictBody);

  const vagueYesPatterns = [
    /Conflict Detected:\s*YES[\s\S]*secondary sources may not fully align/i,
    /Conflict Detected:\s*YES[\s\S]*higher authority prevails/i,
    /Conflict Detected:\s*YES[\s\S]*may not fully align/i
  ];

  if (
    !hasSpecificConflict &&
    vagueYesPatterns.some((pattern) => pattern.test(conflictBody))
  ) {
    return value.replace(
      /(\b5\.\s*CONFLICT FLAG\b|###\s*Conflict flag\b)[\s\S]*?(?=\n\s*(?:\d+\.\s*[A-Z][A-Z ]+\b|###\s+[A-Za-z])|$)/i,
      "5. CONFLICT FLAG\nConflict Detected: NO"
    );
  }

  return value;
}

export default {
  sanitizeDraftAnswer,
  sanitizeConflictSection,
  buildFinalCompliantAnswer
};
