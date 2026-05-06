// FILE: final-answer-compliance.js

import {
  applySupersessionFilter,
  findReplacementForDocument
} from "./supersession-engine.js";

const MAX_VISIBLE_SOURCES = 5;
const HIDDEN_SOURCE_PATTERNS = ["07_cpa_notes", "08_review_materials"];

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

function compactSpaces(value = "") {
  return normalizeText(value).replace(/\s+/g, " ");
}

function stripFileExtension(value = "") {
  return String(value || "").replace(/\.(pdf|docx|doc|txt|md|csv|json)$/i, "");
}

function basename(value = "") {
  const text = String(value || "");
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

function normalizeYear(year = "") {
  const clean = String(year || "").trim();
  if (!clean) return "";
  return clean.length === 2 ? `20${clean}` : clean;
}

function stripFolderPrefixes(value = "") {
  return String(value || "")
    .replace(
      /(^|\/)(00_constitution|01_tax_code|02_revenue_regulations|03_rmc|04_rmo|04b_ramo|05_bir_rulings|05b_tax_treaties|06_court_cases|07_cpa_notes|08_review_materials)(\/|$)/gi,
      " "
    )
    .replace(/[\\/]+/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.source ||
    ""
  );
}

function sourceRawTitleOf(doc = {}) {
  return normalizeText(
    doc.title ||
      doc.source_title ||
      doc.metadata?.documentTitle ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      basename(sourcePathOf(doc)) ||
      ""
  );
}

function sourceTitleOf(doc = {}) {
  const explicit = sourceRawTitleOf(doc);

  if (explicit) {
    return compactSpaces(stripFileExtension(stripFolderPrefixes(explicit)) || explicit);
  }

  return "Untitled Source";
}

function sourceDriveUrlOf(doc = {}) {
  const fileId =
    doc.fileId ||
    doc.file_id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    null;

  return (
    doc.driveViewUrl ||
    doc.drive_view_url ||
    doc.metadata?.driveViewUrl ||
    doc.metadata?.drive_view_url ||
    (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null)
  );
}

function authorityTypeOf(doc = {}) {
  const raw = String(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      ""
  )
    .trim()
    .toUpperCase();

  if (raw) {
    return raw;
  }

  const path = normalizeLooseText(sourcePathOf(doc));
  const title = normalizeLooseText(sourceRawTitleOf(doc));
  const blob = `${path} ${title}`;

  if (path.includes("00_constitution") || title.includes("constitution")) {
    return "CONSTITUTION";
  }
  if (
    path.includes("01_tax_code") ||
    /\b(?:republic act|ra)\s*(?:no)?\s*\d{4,6}\b/i.test(blob) ||
    title.includes("tax code") ||
    title.includes("nirc")
  ) {
    return "STATUTE";
  }
  if (path.includes("05b_tax_treaties") || title.includes("tax treaty")) {
    return "TREATY";
  }
  if (path.includes("02_revenue_regulations") || /\brr\b/i.test(title)) {
    return "RR";
  }
  if (path.includes("03_rmc") || /\brmc\b/i.test(title)) {
    return "RMC";
  }
  if (path.includes("04b_ramo") || /\bramo\b/i.test(title)) {
    return "RAMO";
  }
  if (path.includes("04_rmo") || /\brmo\b/i.test(title)) {
    return "RMO";
  }
  if (path.includes("05_bir_rulings") || title.includes("bir ruling")) {
    return "BIR_RULING";
  }
  if (title.includes("supreme court") || /\bg\.r\.\s*no\b/i.test(title)) {
    return "SUPREME_COURT";
  }
  if (title.includes("cta en banc") || /\bcta eb\b/i.test(title)) {
    return "CTA_EN_BANC";
  }
  if (title.includes("court of appeals") || /\bca-g\.r\.\b/i.test(title)) {
    return "COURT_OF_APPEALS";
  }
  if (title.includes("cta") || /\bcta\b/i.test(title)) {
    return "CTA_DIVISION";
  }

  return "SECONDARY";
}

function authorityLevelOf(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  const authorityType = authorityTypeOf(doc);

  const map = {
    CONSTITUTION: 1,
    STATUTE: 2,
    TREATY: 3,
    SUPREME_COURT: 4,
    CTA_EN_BANC: 5,
    COURT_OF_APPEALS: 6,
    CTA_DIVISION: 7,
    RR: 8,
    RMC: 9,
    RMO: 10,
    RAMO: 11,
    BIR_RULING: 12,
    LGU: 13,
    SECONDARY: 99
  };

  return map[authorityType] || 99;
}

function shouldHideSource(doc = {}) {
  const haystack = normalizeLooseText(
    [sourcePathOf(doc), sourceTitleOf(doc)].join(" ")
  );

  return HIDDEN_SOURCE_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function formatDocType(doc = {}) {
  const authorityType = authorityTypeOf(doc);

  if (authorityType === "CONSTITUTION") return "Constitution";
  if (authorityType === "STATUTE") return "Statute";
  if (authorityType === "TREATY") return "Treaty";
  if (authorityType === "SUPREME_COURT") return "Supreme Court";
  if (authorityType === "CTA_EN_BANC") return "CTA En Banc";
  if (authorityType === "COURT_OF_APPEALS") return "Court of Appeals";
  if (authorityType === "CTA_DIVISION") return "CTA Division";
  if (authorityType === "RR") return "RR";
  if (authorityType === "RMC") return "RMC";
  if (authorityType === "RAMO") return "RAMO";
  if (authorityType === "RMO") return "RMO";
  if (authorityType === "BIR_RULING") return "BIR Ruling";
  if (authorityType === "LGU") return "LGU";
  return "Source";
}

function inferIssuanceNumber(doc = {}) {
  const haystack = compactSpaces(
    [
      doc.issuanceNumber,
      doc.title,
      doc.source_title,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.originalSource
    ]
      .filter(Boolean)
      .join(" ")
  );

  const normalizedRef = String(
    doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      ""
  );

  const directPatterns = [
    {
      regex: /\b(1987 Constitution)\b/i,
      value: (m) => compactSpaces(m[1])
    },
    {
      regex: /\b(Republic Act No\.?\s*\d{4,6})\b/i,
      value: (m) => compactSpaces(m[1]).replace(/\s+/g, " ")
    },
    {
      regex: /\b(RA\s*\d{4,6})\b/i,
      value: (m) => {
        const num = m[1].match(/\d{4,6}/)?.[0] || "";
        return num ? `RA No. ${num}` : compactSpaces(m[1]);
      }
    },
    {
      regex: /\b(RR)\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}`
    },
    {
      regex: /\b(RMC)\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}`
    },
    {
      regex: /\b(RMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}`
    },
    {
      regex: /\b(RAMO)\s*(?:No\.?)?\s*0*(\d+)\s*[-/]\s*(\d{2,4})\b/i,
      value: (m) => `${m[1].toUpperCase()} No. ${Number(m[2])}-${normalizeYear(m[3])}`
    },
    {
      regex: /\b(BIR Ruling)\s*(?:No\.?)?\s*([\w./()-]+)\b/i,
      value: (m) => `${m[1]} No. ${m[2]}`
    },
    {
      regex: /\b(CTA(?:\s+EB)?\s+No\.?\s*[\w.-]+)\b/i,
      value: (m) => compactSpaces(m[1])
    },
    {
      regex: /\b(G\.R\.\s*No\.?\s*[\w.-]+)\b/i,
      value: (m) => compactSpaces(m[1])
    },
    {
      regex: /\b(CA-G\.R\.\s*[\w.-]+)\b/i,
      value: (m) => compactSpaces(m[1])
    }
  ];

  for (const pattern of directPatterns) {
    const match = haystack.match(pattern.regex);
    if (match) {
      return compactSpaces(pattern.value(match));
    }
  }

  const normalizedPatterns = [
    {
      regex: /\bRA_(\d{4,6})\b/i,
      value: (m) => `RA No. ${m[1]}`
    },
    {
      regex: /\bRR_(\d{1,3})[-_](\d{4})\b/i,
      value: (m) => `RR No. ${Number(m[1])}-${m[2]}`
    },
    {
      regex: /\bRMC_(\d{1,3})[-_](\d{4})\b/i,
      value: (m) => `RMC No. ${Number(m[1])}-${m[2]}`
    },
    {
      regex: /\bRMO_(\d{1,3})[-_](\d{4})\b/i,
      value: (m) => `RMO No. ${Number(m[1])}-${m[2]}`
    },
    {
      regex: /\bRAMO_(\d{1,3})[-_](\d{4})\b/i,
      value: (m) => `RAMO No. ${Number(m[1])}-${m[2]}`
    },
    {
      regex: /\bBIR_RULING_([A-Z0-9_]+)\b/i,
      value: (m) => `BIR Ruling No. ${String(m[1]).replace(/_/g, "-")}`
    }
  ];

  for (const pattern of normalizedPatterns) {
    const match = normalizedRef.match(pattern.regex);
    if (match) {
      return compactSpaces(pattern.value(match));
    }
  }

  return "";
}

function buildShortSubject(doc = {}) {
  const explicitTitle = normalizeText(
    doc.metadata?.documentTitle ||
      doc.metadata?.originalFileName ||
      doc.metadata?.originalSource ||
      doc.title ||
      doc.source_title ||
      doc.originalSource ||
      doc.original_source ||
      doc.source ||
      basename(sourcePathOf(doc)) ||
      ""
  );

  const rawPath = normalizeText(sourcePathOf(doc));
  const basis = explicitTitle || rawPath || "Untitled Source";
  const issuanceNumber = inferIssuanceNumber(doc);

  let subject = stripFolderPrefixes(stripFileExtension(basis));

  if (issuanceNumber) {
    const escaped = issuanceNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    subject = subject.replace(new RegExp(`\\b${escaped}\\b`, "i"), "").trim();
  }

  subject = subject
    .replace(/\bcopy\b/gi, "")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!subject) {
    subject = stripFolderPrefixes(stripFileExtension(rawPath)) || "Untitled Source";
  }

  if (
    authorityTypeOf(doc) === "STATUTE" &&
    /^(ra no\.?\s*\d+|republic act no\.?\s*\d+)$/i.test(subject)
  ) {
    return "";
  }

  return compactSpaces(subject);
}

function buildLegalBasisEntry(doc = {}) {
  const type = formatDocType(doc);
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number && subject) {
    return `[${type}] ${number} – ${subject}`;
  }

  if (number) {
    return `[${type}] ${number}`;
  }

  return `[${type}] ${subject || sourceTitleOf(doc)}`;
}

function buildSourcesEntry(doc = {}) {
  const number = inferIssuanceNumber(doc);
  const subject = buildShortSubject(doc);

  if (number && subject) {
    return `${number} – ${subject}`;
  }

  if (number) {
    return number;
  }

  return subject || sourceTitleOf(doc);
}

function buildDocKey(doc = {}) {
  return (
    doc.fileId ||
    doc.file_id ||
    doc.id ||
    doc.metadata?.fileId ||
    doc.metadata?.file_id ||
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.originalSource ||
    doc.original_source ||
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

function toVisibleSourceEntry(doc = {}) {
  return {
    ...doc,
    title: sourceTitleOf(doc),
    driveViewUrl: sourceDriveUrlOf(doc),
    sourcePath: sourcePathOf(doc),
    authorityType: authorityTypeOf(doc),
    authorityLevel: authorityLevelOf(doc),
    issuanceNumber: inferIssuanceNumber(doc)
  };
}

export function filterVisibleSources(
  docs = [],
  { maxItems = MAX_VISIBLE_SOURCES, supersessionResult = null } = {}
) {
  const visible = [];

  for (const doc of uniqueDocs(docs)) {
    if (!doc) continue;
    if (shouldHideSource(doc)) continue;

    const replacement = findReplacementForDocument(doc, supersessionResult);
    const sourceToUse = replacement || doc;

    if (shouldHideSource(sourceToUse)) continue;

    visible.push(toVisibleSourceEntry(sourceToUse));
  }

  return uniqueDocs(visible)
    .sort((a, b) => {
      const levelDiff = authorityLevelOf(a) - authorityLevelOf(b);
      if (levelDiff !== 0) return levelDiff;

      const aNumber = inferIssuanceNumber(a);
      const bNumber = inferIssuanceNumber(b);
      if (aNumber && bNumber) {
        return aNumber.localeCompare(bNumber);
      }

      return sourceTitleOf(a).localeCompare(sourceTitleOf(b));
    })
    .slice(0, maxItems);
}

function runSupersessionPreflight({
  legalBasisDocs = [],
  sourcesUsed = [],
  asOfDate = new Date()
}) {
  const combinedDocs = uniqueDocs([...legalBasisDocs, ...sourcesUsed]);
  const supersessionResult = applySupersessionFilter(combinedDocs, asOfDate);

  const resolvedLegalBasisDocs = uniqueDocs(
    legalBasisDocs.map(
      (doc) => findReplacementForDocument(doc, supersessionResult) || doc
    )
  );

  const visiblePool =
    sourcesUsed.length > 0 ? sourcesUsed : resolvedLegalBasisDocs;

  const resolvedSourcesUsed = filterVisibleSources(visiblePool, {
    maxItems: MAX_VISIBLE_SOURCES,
    supersessionResult
  });

  return {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  };
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

    const recommendedAction =
      hierarchyConflict?.overrideApplied
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
  defaultInsight = "",
  supersessionResult = null
}) {
  const body =
    getSectionBody(draftAnswer, String.raw`\b4\.\s*PROFESSIONAL INSIGHT\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Recommended action\b`) ||
    getSectionBody(draftAnswer, String.raw`###\s*Taxpayer risk assessment\b`);

  if (body) {
    return takeSentences(body, 3);
  }

  if (supersessionResult?.superseded?.length) {
    return "One or more indexed sources appeared superseded, so only active controlling sources were retained for the final answer.";
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

function inferAuthorityUsed(legalBasisDocs = [], sourcesUsed = []) {
  const docs = [...legalBasisDocs, ...sourcesUsed];

  if (!docs.length) {
    return [];
  }

  return dedupe(
    docs
      .map((doc) => formatDocType(doc))
      .filter(Boolean)
      .slice(0, 5)
  );
}

function inferConfidenceLevel({
  legalBasisDocs = [],
  hierarchyConflict = null,
  supersessionResult = null
}) {
  if (!legalBasisDocs.length) {
    return "LOW";
  }

  const bestLevel = Math.min(
    ...legalBasisDocs.map((doc) => authorityLevelOf(doc))
  );

  if (hierarchyConflict?.conflict) {
    return bestLevel <= 4 ? "MEDIUM" : "LOW";
  }

  if (supersessionResult?.superseded?.length) {
    return bestLevel <= 4 ? "MEDIUM" : "LOW";
  }

  if (bestLevel <= 4) return "HIGH";
  if (bestLevel <= 8) return "MEDIUM";
  return "LOW";
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
    draftAnswer: sanitizedDraft,
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

export function buildFinalRoutePayload({
  answer = "",
  legalBasisDocs = [],
  sourcesUsed = [],
  hierarchyConflict = null,
  asOfDate = new Date()
}) {
  const {
    supersessionResult,
    resolvedLegalBasisDocs,
    resolvedSourcesUsed
  } = runSupersessionPreflight({
    legalBasisDocs,
    sourcesUsed,
    asOfDate
  });

  const finalVisibleSources =
    resolvedSourcesUsed.length > 0
      ? resolvedSourcesUsed
      : filterVisibleSources(resolvedLegalBasisDocs, {
          maxItems: MAX_VISIBLE_SOURCES,
          supersessionResult
        });

  return {
    answer,
    sources: finalVisibleSources.slice(0, MAX_VISIBLE_SOURCES).map((doc) => ({
      title: sourceTitleOf(doc),
      drive_url: sourceDriveUrlOf(doc),
      source_path: sourcePathOf(doc),
      authority_type: authorityTypeOf(doc),
      authority_level: authorityLevelOf(doc),
      issuance_number: inferIssuanceNumber(doc) || null
    })),
    authority_used: inferAuthorityUsed(
      resolvedLegalBasisDocs,
      finalVisibleSources
    ),
    confidence_level: inferConfidenceLevel({
      legalBasisDocs: resolvedLegalBasisDocs,
      hierarchyConflict,
      supersessionResult
    }),
    supersession_audit: supersessionResult?.auditTrail || []
  };
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
  buildFinalCompliantAnswer,
  buildFinalRoutePayload,
  filterVisibleSources
};
