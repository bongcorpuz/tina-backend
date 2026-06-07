// FILE: authority-utils.js
"use strict";

/**
 * TINA Authority Utilities
 * Version: 3.2.0
 *
 * Constitutional role:
 * - Classify authority type from document metadata, file path, filename, and text.
 * - Normalize legal references.
 * - Build compact authority metadata.
 * - Preserve Master Prompt hierarchy from authority-constants.js.
 *
 * This file must NOT:
 * - retrieve sources,
 * - call OpenAI,
 * - render final answers,
 * - fabricate authorities.
 */

import {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  CONTROLLING_PRECEDENCE,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL
} from "./authority-constants.js";

export function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function compactSpaces(value = "") {
  return normalizeText(value);
}

export function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function basename(value = "") {
  const parts = String(value || "").split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(value || "");
}

function normalizeYear(year = "") {
  const raw = String(year || "").trim();
  if (!raw) return "";
  if (/^\d{4}$/.test(raw)) return raw;

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);
    const currentYY = new Date().getFullYear() % 100;
    return yy <= currentYY + 1 ? `20${raw}` : `19${raw}`;
  }

  return raw;
}

function unique(values = []) {
  return [...new Set(safeArray(values))];
}

function firstText(values = []) {
  return values.map(normalizeText).find(Boolean) || "";
}

function hasPathOrIdShape(value = "") {
  const text = String(value || "");
  return (
    /[\\/]/.test(text) ||
    /\.[a-z0-9]{2,5}(?:$|[?#\s])/i.test(text) ||
    /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i.test(text) ||
    /\b(?:storage|vector|chunk|file|source)[_-]?[a-f0-9]{8,}\b/i.test(text)
  );
}

function safeDisplayText(value = "") {
  const text = normalizeText(value);
  return text && !hasPathOrIdShape(text) ? text : "";
}

export function getDocPath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.metadata?.sourcePath ||
    doc.metadata?.source_path ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.metadata?.originalFileName ||
    doc.source ||
    ""
  );
}

export function getDocSource(doc = {}) {
  return (
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.metadata?.originalFileName ||
    doc.metadata?.documentTitle ||
    doc.title ||
    basename(getDocPath(doc)) ||
    "Unknown source"
  );
}

export function getDocNormalizedReference(doc = {}) {
  return (
    doc.normalizedReference ||
    doc.normalized_reference ||
    doc.metadata?.normalizedReference ||
    doc.metadata?.normalized_reference ||
    ""
  );
}

export function getDocAliases(doc = {}) {
  return [
    ...safeArray(doc.normalizedAliases),
    ...safeArray(doc.normalized_aliases),
    ...safeArray(doc.metadata?.normalizedAliases),
    ...safeArray(doc.metadata?.normalized_aliases)
  ].filter(Boolean);
}

function buildAuthorityBlob(doc = {}) {
  return compactSpaces(
    [
      getDocSource(doc),
      getDocPath(doc),
      getDocNormalizedReference(doc),
      ...getDocAliases(doc),
      doc.authorityType,
      doc.authority_type,
      doc.metadata?.authorityType,
      doc.metadata?.sourceType,
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isSecondaryMaterial(path = "", fileName = "") {
  const p = lower(path);
  const f = lower(fileName);

  return (
    p.includes("07_cpa_notes") ||
    p.includes("08_review_materials") ||
    p.includes("drafts") ||
    p.includes("internal_notes") ||
    p.includes("working_papers") ||
    f.includes("reviewer") ||
    f.includes("lecture") ||
    f.includes("handout") ||
    f.includes("working paper")
  );
}

function getGoogleDriveFolderAuthority(path = "", fileName = "") {
  const blob = lower(`${path} ${fileName}`);

  if (blob.includes("01_tax_code")) return "STATUTE";
  if (blob.includes("02_revenue_regulations")) return "RR";
  if (blob.includes("03_rmc")) return "RMC";
  if (blob.includes("04_rmo")) return "RMO";
  if (blob.includes("05_bir_rulings")) return "BIR_RULING";
  if (blob.includes("06_court_cases")) return null;
  if (blob.includes("07_cpa_notes")) return "SECONDARY";
  if (blob.includes("08_review_materials")) return "SECONDARY";

  return null;
}

function detectCourtType(text = "") {
  const raw = compactSpaces(text);

  if (/\bsupreme\s+court\s+en\s+banc\b/i.test(raw) || /\ben\s+banc\b/i.test(raw) && /\bsupreme\s+court\b/i.test(raw)) {
    return "SUPREME_COURT_EN_BANC";
  }

  if (/\bcta\s+en\s+banc\b/i.test(raw) || /\bcta\s+eb\b/i.test(raw)) {
    return "CTA_EN_BANC";
  }

  if (/\bcourt\s+of\s+appeals\b/i.test(raw) || /\bca-?g\.?\s*r\.?\b/i.test(raw)) {
    return "COURT_OF_APPEALS";
  }

  if (/\bcta\s+case\s+no\.?\b/i.test(raw) || /\bcta\s+division\b/i.test(raw)) {
    return "CTA_DIVISION";
  }

  if (/\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(raw) || /\bsupreme\s+court\b/i.test(raw)) {
    return "SUPREME_COURT";
  }

  return null;
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    STATUTORY: "STATUTE",
    STATUTE: "STATUTE",
    REPUBLIC_ACT: "STATUTE",
    RA: "STATUTE",
    CMTA: "STATUTE",
    LGC: "STATUTE",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

    CTA: "CTA_DIVISION",
    CTA_EN_BANC: "CTA_EN_BANC",
    CTA_DIVISION: "CTA_DIVISION",
    COURT_OF_APPEALS: "COURT_OF_APPEALS",
    CA: "COURT_OF_APPEALS",

    REVENUE_REGULATION: "RR",
    REVENUE_REGULATIONS: "RR",
    RR: "RR",

    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    RMC: "RMC",

    REVENUE_MEMORANDUM_ORDER: "RMO",
    RMO: "RMO",

    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    RAMO: "RAMO",

    BIR_RULING: "BIR_RULING",
    BIR_RULINGS: "BIR_RULING",

    LGU: "LGU",
    LGU_ISSUANCE: "LGU",
    BOC: "BOC_ISSUANCE",
    CUSTOMS: "BOC_ISSUANCE",
    BOC_ISSUANCE: "BOC_ISSUANCE",

    FIRB: "FIRB_ISSUANCE",
    FIRB_ISSUANCE: "FIRB_ISSUANCE",
    PEZA: "PEZA_MEMO",
    PEZA_MEMO: "PEZA_MEMO",
    SEC: "SEC_GUIDANCE",
    SEC_GUIDANCE: "SEC_GUIDANCE",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN: "FOREIGN_AUTHORITY",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    PFRS_FOR_SMES: "PFRS",
    IFRS: "PFRS",
    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    CPA_NOTES: "SECONDARY",
    REVIEW_MATERIALS: "SECONDARY",
    SECONDARY_SOURCE: "SECONDARY",
    SECONDARY: "SECONDARY",

    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function toContractAuthorityType(value = "") {
  const type = normalizeAuthorityType(value);

  if (["CONSTITUTION", "STATUTE", "NIRC", "TAX_CODE", "CMTA", "LGC", "REPUBLIC_ACT", "RA"].includes(type)) {
    return "STATUTE";
  }

  if (type === "TREATY") return "TREATY";
  if (["SUPREME_COURT_EN_BANC", "SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(type)) {
    return "CASE";
  }

  if (["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(type)) return type;
  if (["SECONDARY", "CPA_NOTES", "REVIEW_MATERIALS", "PFRS", "PAS", "PSA", "OECD_GUIDANCE", "FOREIGN_AUTHORITY", "UNKNOWN"].includes(type)) {
    return "SECONDARY";
  }

  return type || "SECONDARY";
}

function normalizeAuthorityIdCitation(value = "") {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayCitationFromReference(reference = {}) {
  const normalized = String(reference.normalized || "");

  if (!normalized) return "";

  const nirc = normalized.match(/^NIRC_SEC_(.+)$/i);
  if (nirc) return `NIRC Sec. ${nirc[1].replace(/_/g, ".")}`;

  const issuance = normalized.match(/^(RR|RMC|RMO|RAMO)_(\d+)_(\d{4})$/i);
  if (issuance) return `${issuance[1].toUpperCase()} No. ${issuance[2]}-${issuance[3]}`;

  const ra = normalized.match(/^RA_(\d+)$/i);
  if (ra) return `RA ${ra[1]}`;

  const gr = normalized.match(/^GR_(.+)$/i);
  if (gr) return `G.R. No. ${gr[1].replace(/_/g, "-")}`;

  return firstText(reference.aliases || []) || normalized.replace(/_/g, " ");
}

function buildAuthorityId(authorityType = "", citation = "") {
  const normalizedCitation = normalizeAuthorityIdCitation(citation);
  if (!authorityType || !normalizedCitation) return null;
  return `${authorityType}-${normalizedCitation}`;
}

function getDocCitation(doc = {}) {
  return firstText([
    doc.citation,
    doc.citationText,
    doc.citation_text,
    doc.reference,
    doc.referenceText,
    doc.reference_text,
    doc.metadata?.citation,
    doc.metadata?.reference
  ].map(safeDisplayText));
}

function buildDisplayLabel(doc = {}, citation = "", authorityType = "") {
  const candidates = [
    doc.displayLabel,
    doc.display_label,
    doc.authorityLabel,
    doc.authority_label,
    doc.title,
    doc.documentTitle,
    doc.document_title,
    doc.metadata?.displayLabel,
    doc.metadata?.authorityLabel,
    doc.metadata?.documentTitle,
    citation,
    AUTHORITY_LABEL[authorityType]
  ];

  return firstText(candidates.map(safeDisplayText)) || citation || AUTHORITY_LABEL[authorityType] || authorityType;
}

function hasParsedContent(doc = {}) {
  return Boolean(
    firstText([
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.chunkText,
      doc.chunk_text,
      doc.pageContent,
      doc.page_content
    ])
  );
}

function getIsParsed(doc = {}) {
  const parseStatus = String(doc.parseStatus || doc.parse_status || doc.metadata?.parseStatus || "").toLowerCase();
  if (parseStatus === "success") return true;
  if (parseStatus === "failed") return false;
  if (parseStatus === "unknown") return hasParsedContent(doc);
  return hasParsedContent(doc);
}

function isIndexedCandidate(doc = {}) {
  if (
    doc.isIndexed === true ||
    doc.indexed === true ||
    doc.googleDriveIndexed === true ||
    doc.metadata?.isIndexed === true ||
    doc.metadata?.googleDriveIndexed === true
  ) return true;

  if (
    doc.isIndexed === false ||
    doc.indexed === false ||
    doc.metadata?.isIndexed === false
  ) return false;

  return Boolean(
    doc.retrievalLayer ||
      doc.retrievalPhase ||
      doc.retrievalEngineVersion ||
      doc.metadata?.retrievalLayer ||
      doc.metadata?.retrievalEngineVersion
  );
}

function getNormalizedConfidence(doc = {}) {
  const explicit = Number(doc.confidence ?? doc.metadata?.confidence);
  if (Number.isFinite(explicit)) {
    return Math.min(1, Math.max(0, explicit));
  }

  const rawScore = Number(
    doc.rerankScore ??
      doc.rerank_score ??
      doc.finalScore ??
      doc.final_score ??
      doc.retrievalScore ??
      doc.retrieval_score ??
      doc.score ??
      doc.similarity ??
      0
  );

  if (!Number.isFinite(rawScore) || rawScore <= 0) return 0;
  return Math.min(1, Math.max(0, rawScore / 400));
}

function normalizeAuthorityProfileTypes(values = []) {
  return safeArray(values)
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === "string") return [value];
      if (typeof value === "object") {
        return [
          value.authorityType,
          value.authority_type,
          value.type,
          value.group,
          value.code
        ];
      }
      return [];
    })
    .map(normalizeAuthorityType)
    .filter(Boolean);
}

function getRequiredAuthorityLevel(issueClassification = {}, fallbackLevel = 99) {
  const profileTypes = normalizeAuthorityProfileTypes([
    ...safeArray(issueClassification.requiredAuthorityTypes),
    ...safeArray(issueClassification.requiredAuthorities),
    ...safeArray(issueClassification.controllingAuthorityTypes),
    ...safeArray(issueClassification.controllingAuthorities),
    ...safeArray(issueClassification.targetAuthorityTypes),
    ...safeArray(issueClassification.targetAuthorities)
  ]);

  const levels = profileTypes
    .map((type) => AUTHORITY_LEVEL[type])
    .filter((level) => Number.isFinite(level) && level > 0 && level < 99);

  if (levels.length) return Math.min(...levels);

  const safeFallback = Number(fallbackLevel);
  return Number.isFinite(safeFallback) && safeFallback > 0 ? safeFallback : 99;
}

function getRetrievalStatus(doc = {}, options = {}) {
  return (
    options.retrievalStatus ||
    options.outcomeCategory ||
    doc.retrievalStatus ||
    doc.retrieval_status ||
    doc.outcomeCategory ||
    doc.metadata?.retrievalStatus ||
    doc.metadata?.outcomeCategory ||
    null
  );
}

function directlyGovernsIssue(doc = {}) {
  const match = doc.issueClassificationMatch || {};
  return Boolean(
    doc.directlyGovernsIssue === true ||
      doc.exactAuthorityMatch === true ||
      doc.targetAuthorityMatch === true ||
      match.exactAuthorityMatch === true ||
      match.targetAuthorityMatch === true ||
      Number(doc.citationMatchBonus || 0) > 0 ||
      ["LAYER_1_EXACT_NORMALIZED_AUTHORITY", "LAYER_2_CITATION_VARIANT"].includes(
        doc.retrievalLayer || doc.retrievalPhase || match.retrievalLayer
      )
  );
}

function getAuthorityRole({
  authorityType = "UNKNOWN",
  authorityLevel = 99,
  directlyGoverns = false,
  isIndexed = false,
  isParsed = false,
  requiredAuthorityKnown = false,
  higherAuthorityMissing = false,
  hasGoverningPeer = false
} = {}) {
  const recognizedGoverningType = [
    "CONSTITUTION",
    "STATUTE",
    "TREATY",
    "CASE",
    "RR",
    "RMC",
    "RMO",
    "RAMO",
    "BIR_RULING",
    "LGU",
    "BOC_ISSUANCE",
    "FIRB_ISSUANCE",
    "PEZA_MEMO",
    "SEC_GUIDANCE"
  ].includes(String(authorityType || "").toUpperCase());

  if ([12, 13, 14].includes(Number(authorityLevel))) return "SECONDARY";
  if (directlyGoverns && isIndexed && isParsed && requiredAuthorityKnown && !higherAuthorityMissing) return "GOVERNING";
  if (directlyGoverns && isIndexed && isParsed && !requiredAuthorityKnown && !higherAuthorityMissing && recognizedGoverningType) return "GOVERNING";
  if (hasGoverningPeer) return "SUPPORTING";
  if (directlyGoverns === false) return "RELATED";
  return "UNKNOWN";
}

export function buildAuthorityAnnotation(doc = {}, options = {}) {
  const rawAuthorityType = getAuthorityTypeForDoc(doc);
  const authorityType = toContractAuthorityType(rawAuthorityType);
  const authorityLevel = getAuthorityLevelForDoc(doc);
  const parsedReference = normalizeLegalReference(
    getDocCitation(doc) || getDocNormalizedReference(doc)
  );
  const citation = getDocCitation(doc) || displayCitationFromReference(parsedReference);
  const isParsed = Boolean(citation) && getIsParsed(doc);
  const authorityId = isParsed ? buildAuthorityId(authorityType, citation) : null;
  const requiredAuthorityLevel = getRequiredAuthorityLevel(
    options.issueClassification || doc.issueClassification || doc.issueClassificationMatch || {},
    options.defaultRequiredAuthorityLevel || 99
  );
  const hasRequiredLevel = Number.isFinite(requiredAuthorityLevel) && requiredAuthorityLevel > 0 && requiredAuthorityLevel < 99;
  const higherAuthorityMissing = hasRequiredLevel && Number.isFinite(authorityLevel)
    ? authorityLevel > requiredAuthorityLevel
    : false;
  const governs = directlyGovernsIssue(doc);
  const indexed = isIndexedCandidate(doc);

  const annotation = {
    authorityId,
    displayLabel: buildDisplayLabel(doc, citation, authorityType),
    authorityType,
    authorityRole: "UNKNOWN",
    authorityLevel,
    citation: citation || null,
    isIndexed: indexed,
    isParsed,
    directlyGovernsIssue: governs,
    requiredAuthorityLevel: hasRequiredLevel ? requiredAuthorityLevel : null,
    higherAuthorityMissing,
    retrievalStatus: getRetrievalStatus(doc, options),
    confidence: getNormalizedConfidence(doc)
  };

  annotation.authorityRole = getAuthorityRole({
    authorityType,
    authorityLevel,
    directlyGoverns: governs,
    isIndexed: indexed,
    isParsed,
    requiredAuthorityKnown: hasRequiredLevel,
    higherAuthorityMissing,
    hasGoverningPeer: options.hasGoverningPeer === true
  });

  return annotation;
}

export function annotateAuthorityCandidate(doc = {}, options = {}) {
  const annotation = buildAuthorityAnnotation(doc, options);

  return {
    ...doc,
    ...annotation,
    authorityAnnotation: annotation,
    metadata: {
      ...(doc.metadata || {}),
      authorityAnnotation: annotation
    }
  };
}

export function annotateAuthorityCandidates(docs = [], options = {}) {
  const initial = safeArray(docs).map((doc) => annotateAuthorityCandidate(doc, options));
  const hasGoverningPeer = initial.some((doc) => doc.authorityRole === "GOVERNING");

  if (!hasGoverningPeer) return initial;

  return initial.map((doc) => {
    if (doc.authorityRole !== "UNKNOWN") return doc;

    const annotation = {
      ...doc.authorityAnnotation,
      authorityRole: "SUPPORTING"
    };

    return {
      ...doc,
      authorityRole: "SUPPORTING",
      authorityAnnotation: annotation,
      metadata: {
        ...(doc.metadata || {}),
        authorityAnnotation: annotation
      }
    };
  });
}

export function classifyAuthorityFromDocument({ fileName = "", path = "", text = "" }) {
  const folderAuthority = getGoogleDriveFolderAuthority(path, fileName);

  if (isSecondaryMaterial(path, fileName)) return "SECONDARY";

  const fullBlob = lower(`${fileName}\n${path}\n${text}`);
  const headerBlob = lower(`${fileName}\n${path}`);

  if (
    fullBlob.includes("constitution of the philippines") ||
    /\b1987\s+constitution\b/i.test(fullBlob)
  ) {
    return "CONSTITUTION";
  }

  const courtType = detectCourtType(`${fileName}\n${path}\n${text}`);
  if (courtType) return courtType;

  if (
    /\btax treaty\b/i.test(fullBlob) ||
    /\bdouble taxation agreement\b/i.test(fullBlob) ||
    /\bdouble tax(?:ation)? treaty\b/i.test(fullBlob) ||
    /\bphilippines[-\s]+[a-z]+ tax treaty\b/i.test(fullBlob)
  ) {
    return "TREATY";
  }

  if (
    /\bnirc\b/i.test(fullBlob) ||
    /\bnational internal revenue code\b/i.test(fullBlob) ||
    /\btax code\b/i.test(fullBlob) ||
    /\bcmta\b/i.test(fullBlob) ||
    /\bcustoms modernization and tariff act\b/i.test(fullBlob) ||
    /\blocal government code\b/i.test(fullBlob) ||
    /\brepublic act\b/i.test(fullBlob) ||
    /\bra\s*\d{4,6}\b/i.test(fullBlob)
  ) {
    return "STATUTE";
  }

  if (
    /\brevenue regulation\b/i.test(fullBlob) ||
    /\brevenue regulations\b/i.test(fullBlob) ||
    /\brr\s*(?:no\.?)?\s*\d+[-/_ ]\d+\b/i.test(fullBlob)
  ) {
    return "RR";
  }

  if (
    /\brevenue memorandum circular\b/i.test(fullBlob) ||
    /\brmc\s*(?:no\.?)?\s*\d+[-/_ ]\d+\b/i.test(fullBlob)
  ) {
    return "RMC";
  }

  if (
    /\brevenue memorandum order\b/i.test(fullBlob) ||
    /\brmo\s*(?:no\.?)?\s*\d+[-/_ ]\d+\b/i.test(fullBlob)
  ) {
    return "RMO";
  }

  if (
    /\brevenue audit memorandum order\b/i.test(fullBlob) ||
    /\bramo\s*(?:no\.?)?\s*\d+[-/_ ]\d+\b/i.test(fullBlob)
  ) {
    return "RAMO";
  }

  if (
    /\bbir ruling\b/i.test(fullBlob) ||
    /\bruling no\.?\b/i.test(fullBlob)
  ) {
    return "BIR_RULING";
  }

  if (
    /\blocal tax code\b/i.test(fullBlob) ||
    /\blocal business tax\b/i.test(fullBlob) ||
    /\blgu ordinance\b/i.test(fullBlob) ||
    /\btax ordinance\b/i.test(fullBlob)
  ) {
    return "LGU";
  }

  if (
    /\bcmta\b/i.test(headerBlob) ||
    /\bbureau of customs\b/i.test(fullBlob) ||
    /\bboc\b/i.test(headerBlob) ||
    /\bcustoms memorandum\b/i.test(fullBlob) ||
    /\btariff\b/i.test(fullBlob)
  ) {
    return "BOC_ISSUANCE";
  }

  if (
    /\bfirb\b/i.test(fullBlob) ||
    /\bfiscal incentives review board\b/i.test(fullBlob)
  ) {
    return "FIRB_ISSUANCE";
  }

  if (
    /\bpeza\b/i.test(fullBlob) ||
    /\bphilippine economic zone authority\b/i.test(fullBlob)
  ) {
    return "PEZA_MEMO";
  }

  if (
    /\boecd\b/i.test(fullBlob) ||
    /\btransfer pricing guidelines\b/i.test(fullBlob)
  ) {
    return "OECD_GUIDANCE";
  }

  if (
    /\bpfrs\b/i.test(fullBlob) ||
    /\bphilippine financial reporting standards\b/i.test(fullBlob)
  ) {
    return "PFRS";
  }

  if (
    /\bpas\b/i.test(fullBlob) ||
    /\bphilippine accounting standards\b/i.test(fullBlob)
  ) {
    return "PAS";
  }

  if (
    /\bpsa\b/i.test(fullBlob) ||
    /\bphilippine standards on auditing\b/i.test(fullBlob)
  ) {
    return "PSA";
  }

  if (folderAuthority) return folderAuthority;

  return "SECONDARY";
}

export function normalizeLegalReference(input = "") {
  const raw = compactSpaces(input);

  if (!raw) {
    return {
      raw,
      normalized: "",
      type: null,
      aliases: []
    };
  }

  const raMatch = raw.match(/\b(?:republic act|ra|r\.a\.)\s*(?:no\.?)?\s*0*(\d{4,6})\b/i);

  if (raMatch) {
    const num = String(raMatch[1]).replace(/^0+/, "");
    return {
      raw,
      normalized: `RA_${num}`,
      type: "STATUTE",
      aliases: [`RA ${num}`, `R.A. No. ${num}`, `Republic Act No. ${num}`]
    };
  }

  const nircSectionMatch = raw.match(/\b(?:nirc|tax code)?\s*(?:sec\.?|section)\s*0*(\d{1,4}[a-z]?)\b/i);

  if (nircSectionMatch) {
    const section = String(nircSectionMatch[1]).toUpperCase();
    return {
      raw,
      normalized: `NIRC_SEC_${section}`,
      type: "STATUTE",
      aliases: [`NIRC Sec. ${section}`, `Tax Code Sec. ${section}`, `Section ${section}`]
    };
  }

  if (
    /\btax treaty\b|\bdouble taxation agreement\b|\bdouble tax(?:ation)? treaty\b/i.test(raw)
  ) {
    return {
      raw,
      normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
      type: "TREATY",
      aliases: [raw]
    };
  }

  const issuancePatterns = [
    ["RR", /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RMC", /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RMO", /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i],
    ["RAMO", /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)\s*[-/_ ]\s*(\d{2,4})\b/i]
  ];

  for (const [type, regex] of issuancePatterns) {
    const match = raw.match(regex);

    if (match) {
      const num = String(match[1]).replace(/^0+/, "");
      const year = normalizeYear(match[2]);

      return {
        raw,
        normalized: `${type}_${num}_${year}`,
        type,
        aliases: [`${type} ${num}-${year}`, `${type} No. ${num}-${year}`]
      };
    }
  }

  const grMatch = raw.match(/\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i);

  if (grMatch) {
    const ref = String(grMatch[1]).toUpperCase();
    return {
      raw,
      normalized: `GR_${ref.replace(/[^A-Z0-9]+/g, "_")}`,
      type: "SUPREME_COURT",
      aliases: [`G.R. No. ${ref}`]
    };
  }

  const ctaEbMatch = raw.match(/\bcta\s+en\s+banc\b.*?(?:case\s+no\.?|no\.?)?\s*([a-z0-9.-]+)?/i);

  if (ctaEbMatch) {
    return {
      raw,
      normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
      type: "CTA_EN_BANC",
      aliases: [raw]
    };
  }

  const courtType = detectCourtType(raw);

  return {
    raw,
    normalized: raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    type: courtType,
    aliases: [raw]
  };
}

export function buildAuthorityMetadata({
  fileName = "",
  path = "",
  text = "",
  modifiedTime = null
}) {
  const authorityType = classifyAuthorityFromDocument({ fileName, path, text });
  const normalized = normalizeLegalReference(`${fileName} ${path}`);
  const normalizedAuthorityType = normalizeAuthorityType(authorityType);

  return {
    authorityType: normalizedAuthorityType,
    authorityLevel: AUTHORITY_LEVEL[normalizedAuthorityType] || 99,
    authorityScore: AUTHORITY_SCORE[normalizedAuthorityType] || 0,
    authorityLabel: AUTHORITY_LABEL[normalizedAuthorityType] || normalizedAuthorityType,
    controllingPrecedence: CONTROLLING_PRECEDENCE[normalizedAuthorityType] || 99,
    normalizedReference: normalized.normalized || null,
    normalizedAliases: unique([
      ...(normalized.aliases || []),
      fileName,
      basename(path)
    ]).filter(Boolean),
    modifiedTime,
    recencyDate: modifiedTime || null,
    tinaAuthorityEngineVersion: ENGINE_VERSION,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    reviewerSourcesNeverControlling: normalizedAuthorityType === "SECONDARY"
  };
}

export function getAuthorityTypeForDoc(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    doc.metadata?.sourceType ||
    null;

  if (explicit) return normalizeAuthorityType(explicit);

  return classifyAuthorityFromDocument({
    fileName: getDocSource(doc),
    path: getDocPath(doc),
    text: doc.text || doc.content || doc.excerpt || ""
  });
}

export function getAuthorityLevelForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const explicit = Number(
    doc.authorityLevel ||
      doc.authority_level ||
      doc.metadata?.authorityLevel ||
      doc.metadata?.authority_level ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  return AUTHORITY_LEVEL[type] || 99;
}

export function getAuthorityScoreForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const explicit = Number(
    doc.authorityScore ||
      doc.authority_score ||
      doc.metadata?.authorityScore ||
      doc.metadata?.authority_score ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  return AUTHORITY_SCORE[type] || 0;
}

export function getControllingPrecedenceForDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  const explicit = Number(
    doc.controllingPrecedence ||
      doc.controlling_precedence ||
      doc.metadata?.controllingPrecedence ||
      doc.metadata?.controlling_precedence ||
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  return CONTROLLING_PRECEDENCE[type] || 99;
}

export function computeIssueMatchBonus(query = "", doc = {}) {
  const q = lower(query);
  const blob = lower(buildAuthorityBlob(doc));
  let score = 0;

  const issueAnchors = [
    "vat",
    "value-added tax",
    "output vat",
    "input vat",
    "withholding",
    "ewt",
    "cwt",
    "fwt",
    "income tax",
    "mcit",
    "nolco",
    "refund",
    "substantiation",
    "invoice",
    "receipt",
    "contract",
    "lease",
    "principal",
    "agent",
    "audit",
    "pfrs",
    "pas",
    "psa",
    "economic substance",
    "assessment",
    "protest",
    "jurisdiction",
    "prescription",
    "customs",
    "tariff",
    "treaty",
    "transfer pricing",
    "create",
    "train",
    "eopt"
  ];

  for (const anchor of issueAnchors) {
    if (q.includes(anchor) && blob.includes(anchor)) score += 14;
  }

  return score;
}

export function computeAuthorityPriorityBonus(doc = {}) {
  const precedence = getControllingPrecedenceForDoc(doc);

  if (precedence <= 2) return 70;
  if (precedence === 3) return 62;
  if (precedence <= 5) return 56;
  if (precedence <= 7) return 46;
  if (precedence <= 10) return 24;
  if (precedence <= 12) return 12;
  if (precedence >= 14 && precedence < 99) return -30;
  if (precedence >= 99) return -60;

  return 0;
}

export function isCourtAuthorityDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return [
    "SUPREME_COURT_EN_BANC",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(type);
}

export function isBirIssuanceDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return [
    "RR",
    "RMC",
    "RMO",
    "RAMO",
    "BIR_RULING"
  ].includes(type);
}

export function isSecondaryAuthorityDoc(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return [
    "SECONDARY",
    "CPA_NOTES",
    "REVIEW_MATERIALS",
    "UNKNOWN"
  ].includes(type);
}

export function buildAuthoritySafetyFlags(doc = {}) {
  const type = getAuthorityTypeForDoc(doc);

  return {
    authorityType: type,
    authorityLevel: getAuthorityLevelForDoc(doc),
    authorityScore: getAuthorityScoreForDoc(doc),
    controllingPrecedence: getControllingPrecedenceForDoc(doc),
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthority: isCourtAuthorityDoc(doc),
    birIssuance: isBirIssuanceDoc(doc),
    secondaryAuthority: isSecondaryAuthorityDoc(doc),
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    birIssuanceCannotOverrideCourtDoctrine: isBirIssuanceDoc(doc),
    reviewerSourcesNeverControlling: isSecondaryAuthorityDoc(doc)
  };
}

export default {
  normalizeText,
  compactSpaces,
  lower,

  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,

  classifyAuthorityFromDocument,
  normalizeLegalReference,
  buildAuthorityMetadata,
  buildAuthorityAnnotation,
  annotateAuthorityCandidate,
  annotateAuthorityCandidates,

  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,

  computeIssueMatchBonus,
  computeAuthorityPriorityBonus,

  isCourtAuthorityDoc,
  isBirIssuanceDoc,
  isSecondaryAuthorityDoc,
  buildAuthoritySafetyFlags
};
