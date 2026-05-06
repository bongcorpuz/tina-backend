// FILE: final-answer-compliance.js

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLooseText(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/\brepublic act no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*no\.?\s*/g, "ra ")
    .replace(/\br\.?\s*a\.?\s*/g, "ra ")
    .replace(/\bnational internal revenue code\b/g, "nirc")
    .replace(/[^\w\s/%₱.,()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupe(values = []) {
  return [...new Set(values.filter(Boolean))];
}

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
    String.raw`${headingPattern}([\s\S]*?)(?=\n\s*(?:\d+\.\s*[A-Z][A-Z ]+\b|###\s+[A-Za-z][\s\S]*?)|$)`,
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

function normalizeAuthorityType(value = "") {
  const raw = String(value || "").toUpperCase().trim();
  if (!raw) return "";

  if (raw.includes("CONSTITUTION")) return "CONSTITUTION";
  if (raw.includes("STATUTE")) return "STATUTE";
  if (raw.includes("TREATY")) return "TREATY";
  if (raw.includes("SUPREME_COURT")) return "SUPREME_COURT";
  if (raw.includes("CTA_EN_BANC")) return "CTA_EN_BANC";
  if (raw.includes("COURT_OF_APPEALS")) return "COURT_OF_APPEALS";
  if (raw.includes("CTA_DIVISION")) return "CTA_DIVISION";
  if (raw === "RR" || raw.includes("REVENUE REGULATION")) return "RR";
  if (raw === "RMC" || raw.includes("REVENUE MEMORANDUM CIRCULAR")) return "RMC";
  if (raw === "RMO" || raw.includes("REVENUE MEMORANDUM ORDER")) return "RMO";
  if (raw === "RAMO" || raw.includes("REVENUE AUDIT MEMORANDUM ORDER")) return "RAMO";
  if (raw.includes("BIR_RULING") || raw.includes("BIR RULING")) return "BIR_RULING";
  if (raw.includes("LGU")) return "LGU";
  if (raw.includes("SECONDARY")) return "SECONDARY";

  return raw;
}

function formatDocType(doc = {}) {
  const authorityType = normalizeAuthorityType(
    doc.authorityType ||
      doc.authority_type ||
      doc.authorityLabel ||
      doc.authority_label ||
      doc.metadata?.authorityType ||
      ""
  );

  const path = normalizeLooseText(
    doc.path ||
      doc.source_path ||
      doc.originalSource ||
      doc.source ||
      doc.title ||
      doc.metadata?.path ||
      ""
  );

  if (authorityType === "CONSTITUTION" || path.includes("00_constitution")) return "Constitution";
  if (authorityType === "STATUTE" || path.includes("01_tax_code")) return "Statute";
  if (authorityType === "TREATY" || path.includes("05b_tax_treaties")) return "Treaty";
  if (authorityType === "SUPREME_COURT") return "Supreme Court";
  if (authorityType === "CTA_EN_BANC") return "CTA En Banc";
  if (authorityType === "COURT_OF_APPEALS") return "Court of Appeals";
  if (authorityType === "CTA_DIVISION") return "CTA Division";
  if (authorityType === "RR" || path.includes("02_revenue_regulations") || /\brr\b/.test(path)) return "RR";
  if (authorityType === "RMC" || path.includes("03_rmc") || /\brmc\b/.test(path)) return "RMC";
  if (authorityType === "RAMO" || path.includes("04b_ramo") || /\bramo\b/.test(path)) return "RAMO";
  if (authorityType === "RMO" || path.includes("04_rmo") || /\brmo\b/.test(path)) return "RMO";
  if (authorityType === "BIR_RULING" || path.includes("05_bir_rulings")) return "BIR Ruling";
  if (authorityType === "LGU") return "LGU";
  return "Source";
}

function inferIssuanceNumber(doc = {}) {
  const haystack = normalizeText(
    [
      doc.title,
      doc.source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.normalizedReference,
      doc.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );

  const patterns = [
    /\b(1987 Constitution)\b/i,
    /\b(RA\s*\d{4,6})\b/i,
    /\b(RR\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMC\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(RAMO\s*(?:No\.?)?\s*\d+\s*[-/]\s*\d{2,4})\b/i,
    /\b(BIR Ruling\s*(?:No\.?)?\s*[\w./()-]+)\b/i,
    /\b(CTA(?:\s+EB)?\s+No\.?\s*[\w.-]+)\b/i,
    /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i,
    /\b(CA-G\.R\.\s*[\w.-]+)\b/i
  ];

  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match) {
      return compactNumberSpacing(match[1]);
    }
  }

  return "";
}

function compactNumberSpacing(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function buildShortSubject(doc = {}) {
  const title = normalizeText(
    doc.title ||
      doc.originalSource ||
      doc.source ||
      doc.path ||
      doc.source_path ||
      "Untitled Source"
  );

  return title
    .replace(/\.(pdf|docx|doc|txt|md|csv|json)$/i, "")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLegalBasisEntry(doc = {}) {
  const type = formatDocType(doc);
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number) {
    return `[${type}] ${number} – ${subject}`;
  }

  return `[${type}] ${subject}`;
}

function buildSourcesEntry(doc = {}) {
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number) {
    return `${number} – ${subject}`;
  }

  return subject;
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.id ||
    doc.path ||
    doc.source_path ||
    doc.originalSource ||
    doc.source ||
    doc.title ||
    JSON.stringify(doc)
  );
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const result = [];

  for (const doc of docs) {
    const key = buildDocKey(doc);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(doc);
  }

  return result;
}

function forceConflictDetectedNo() {
  return "Conflict Detected: NO";
}

function buildConflictSection({
  draftAnswer = "",
  conflicts = [],
  hierarchyConflict = null
}) {
  const draftConflictBody =
    getSectionBody(draftAnswer, String.raw`\b5\.\s*CONFLICT FLAG\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Conflict flag\b`);

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

    return [
      "Conflict Detected: YES",
      `Source A: ${sourceA}, ${sectionA}`,
      `Source B: ${sourceB}, ${sectionB}`,
      `Contradiction: ${normalizeText(contradiction)}`,
      `Controlling Authority: ${controllingAuthority}`,
      "Recommended Action: Follow the higher authority pending clarification."
    ].join("\n");
  }

  const vagueYesPatterns = [
    /Conflict Detected:\s*YES[\s\S]*secondary sources may not fully align/i,
    /Conflict Detected:\s*YES[\s\S]*higher authority prevails/i,
    /Conflict Detected:\s*YES[\s\S]*may not fully align/i
  ];

  if (
    !draftConflictBody ||
    vagueYesPatterns.some((pattern) => pattern.test(draftConflictBody))
  ) {
    return forceConflictDetectedNo();
  }

  if (/Conflict Detected:\s*NO/i.test(draftConflictBody)) {
    return forceConflictDetectedNo();
  }

  return forceConflictDetectedNo();
}

function containsExplicitRuleLikeValue(text = "") {
  const value = normalizeLooseText(text);

  return (
    /\b\d+(\.\d+)?%\b/.test(value) ||
    /\b₱\s*\d[\d,]*(\.\d+)?\b/i.test(value) ||
    /\b(net taxable income|total assets|deadline|due date|rate|threshold|effective)\b/i.test(
      value
    ) ||
    /\bshall\b/.test(value)
  );
}

function buildDirectAnswer({
  draftAnswer = "",
  fallbackAnswer = ""
}) {
  const directBody =
    getSectionBody(draftAnswer, String.raw`\b1\.\s*DIRECT ANSWER\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Legally defensible conclusion\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Issue\b`);

  const candidate = directBody || fallbackAnswer || draftAnswer || "";
  return takeSentences(candidate, 4);
}

function buildSupportingRules({
  draftAnswer = "",
  legalBasisDocs = []
}) {
  const body = getSectionBody(
    draftAnswer,
    String.raw`\b3\.\s*SUPPORTING RULES\b`
  );

  const lines = splitNonEmptyLines(body)
    .map(cleanBulletPrefix)
    .filter(Boolean);

  if (lines.length) {
    return lines;
  }

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
  defaultInsight = ""
}) {
  const body =
    getSectionBody(draftAnswer, String.raw`\b4\.\s*PROFESSIONAL INSIGHT\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Recommended action\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Taxpayer risk assessment\b`);

  if (body) {
    return takeSentences(body, 3);
  }

  return normalizeText(
    defaultInsight ||
      "Verify the latest BIR issuance and documentary requirements before implementation."
  );
}

function buildValidatedLegalBasis(docs = []) {
  return uniqueDocs(docs)
    .slice(0, 5)
    .map(buildLegalBasisEntry);
}

function buildValidatedSources(docs = []) {
  return uniqueDocs(docs)
    .slice(0, 5)
    .map(buildSourcesEntry);
}

function ensureDashedBullets(lines = []) {
  return lines
    .map((line) => `- ${cleanBulletPrefix(line)}`)
    .join("\n");
}

export function buildFinalCompliantAnswer({
  draftAnswer = "",
  fallbackAnswer = "",
  directAnswer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  conflicts = [],
  hierarchyConflict = null,
  professionalInsight = ""
}) {
  const sanitizedDraft = sanitizeDraftAnswer(draftAnswer);

  const finalDirectAnswer = normalizeText(
    directAnswer || buildDirectAnswer({ draftAnswer: sanitizedDraft, fallbackAnswer })
  );

  const legalBasisLines = buildValidatedLegalBasis(legalBasisDocs);
  const supportingRuleLines = buildSupportingRules({
    draftAnswer: sanitizedDraft,
    legalBasisDocs
  });
  const finalInsight = buildProfessionalInsight({
    draftAnswer: sanitizedDraft,
    defaultInsight: professionalInsight
  });
  const finalConflict = buildConflictSection({
    draftAnswer: sanitizedDraft,
    conflicts,
    hierarchyConflict
  });
  const sourceLines = buildValidatedSources(sourcesUsed);

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

  if (!hasSpecificConflict && vagueYesPatterns.some((pattern) => pattern.test(conflictBody))) {
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
