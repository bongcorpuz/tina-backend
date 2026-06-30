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

import {
  inferIssuanceNumber,
  canonicalSourceKey
} from "./source-visibility-engine.js";

const ENGINE_VERSION = "5.2.0";

const ORCHESTRATION_MODES = Object.freeze({
  FAST_DEFINITION: "FAST_DEFINITION",
  STANDARD_TAX: "STANDARD_TAX",
  LEGAL_ANALYSIS: "LEGAL_ANALYSIS",
  COMPLEX_ADVISORY: "COMPLEX_ADVISORY",
  EMERGENCY_TRIM: "EMERGENCY_TRIM",
  SENIOR_COUNSEL_MEMO: "SENIOR_COUNSEL_MEMO",
  CASE_ANALYSIS: "CASE_ANALYSIS",
  SOURCE_LOOKUP: "SOURCE_LOOKUP"
});

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "D. SUPPORTING JURISPRUDENCE",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "F. PRACTICAL NOTE / APPLICATION"
]);

const TAX_SENIOR_MEMO_HEADINGS = Object.freeze([
  "A. Short Answer / Conclusion",
  "B. Governing Authority",
  "C. Analysis",
  "D. Compliance Effect",
  "E. Caveats / Missing Facts",
  "F. Sources / Source Cards"
]);

const FAST_DEFINITION_HEADINGS = Object.freeze([
  "### Direct Answer",
  "### Legal Basis",
  "### Practical Explanation",
  "### Practical Note"
]);

const ASK_CONVERSATIONAL_MODES = Object.freeze(new Set([
  "FAST_DEFINITION",
  "EMERGENCY_TRIM",
  "QUICK"
]));

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
  STANDARD_TAX: TAX_SENIOR_MEMO_HEADINGS,
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
  ],

  CASE_ANALYSIS: [
    "CASE NAME / CITATION",
    "FACTS",
    "ISSUE",
    "RULING",
    "DOCTRINE / RATIO",
    "APPLICATION",
    "LIMITATIONS / DISTINGUISHING FACTORS"
  ],

  SOURCE_LOOKUP: [
    "SOURCES FOUND",
    "CONTROLLING AUTHORITIES",
    "SECONDARY SOURCES",
    "RETRIEVAL NOTES"
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

const SAE_DISCLOSURE_STATUSES = Object.freeze(new Set([
  "RELATED_AUTHORITY_ONLY",
  "NO_INDEXED_SOURCE",
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR"
]));

const SOURCE_CARD_SUPPRESSED_SAE_STATUSES = Object.freeze(new Set([
  "NO_INDEXED_SOURCE",
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR"
]));

const AUTHORITY_ROLE_SUFFIX = Object.freeze({
  GOVERNING:  "",
  SUPPORTING: "Supporting authority only",
  RELATED:    "Related authority only",
  SECONDARY:  "Secondary reference only",
  UNKNOWN:    "Unclassified reference only"
});

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

function normalizeStatus(value = "") {
  if (value && typeof value === "object") return "";
  return String(value || "").trim().toUpperCase();
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstObject(...values) {
  for (const value of values) {
    const candidate = objectOrEmpty(value);
    if (Object.keys(candidate).length > 0) return candidate;
  }
  return {};
}

function normalizeAuthorityRole(source = {}) {
  return normalizeStatus(
    source.authorityRole ||
    source.authority_role ||
    source.metadata?.authorityRole ||
    source.metadata?.authority_role ||
    "UNKNOWN"
  ) || "UNKNOWN";
}

function resolveSaeContext(input = {}) {
  const metadata = input.metadata || {};
  const inputSourceAvailability = objectOrEmpty(input.sourceAvailability);
  const metadataSourceAvailability = objectOrEmpty(metadata.sourceAvailability);
  const saeMetadata = firstObject(
    input.sourceAvailabilityMetadata,
    metadata.sourceAvailabilityMetadata,
    inputSourceAvailability,
    metadataSourceAvailability
  );

  const saeStatus = normalizeStatus(
    input.saeStatus ||
    inputSourceAvailability.saeStatus ||
    inputSourceAvailability.status ||
    (typeof input.sourceAvailability === "string" ? input.sourceAvailability : "") ||
    input.sourceStatus ||
    saeMetadata.saeStatus ||
    saeMetadata.status ||
    saeMetadata.sourceAvailability ||
    metadata.saeStatus ||
    metadataSourceAvailability.saeStatus ||
    metadataSourceAvailability.status ||
    (typeof metadata.sourceAvailability === "string" ? metadata.sourceAvailability : "") ||
    metadata.sourceStatus
  );

  if (!saeStatus) {
    return {
      hasSaeMetadata: false,
      saeStatus: "",
      disclosureType: null,
      limitationRequired: false,
      statusReason: ""
    };
  }

  const disclosureType = normalizeStatus(
    input.disclosureType ||
    inputSourceAvailability.disclosureType ||
    saeMetadata.disclosureType ||
    metadata.disclosureType ||
    metadataSourceAvailability.disclosureType ||
    saeStatus
  );

  return {
    hasSaeMetadata: true,
    saeStatus,
    disclosureType,
    limitationRequired: saeStatus === "RELATED_AUTHORITY_ONLY",
    statusReason: trimText(
      input.statusReason ||
      input.sourceAvailabilityReason ||
      inputSourceAvailability.statusReason ||
      inputSourceAvailability.sourceAvailabilityReason ||
      saeMetadata.statusReason ||
      saeMetadata.sourceAvailabilityReason ||
      metadata.statusReason ||
      metadataSourceAvailability.statusReason ||
      metadataSourceAvailability.sourceAvailabilityReason ||
      metadata.sourceAvailabilityReason ||
      "",
      500
    )
  };
}

function suppressSourcesIfSaeStatusRequires(sourceCards = [], saeContext = {}) {
  const cards = safeArray(sourceCards);
  const saeStatus = normalizeStatus(saeContext?.saeStatus || saeContext?.sourceAvailability || "");

  // Renderer-pipeline contract guard: source cards should normally arrive only
  // after SAS eligibility and pipeline SAE suppression. This defensive backstop
  // protects direct renderer calls without recomputing SAE status.
  if (SOURCE_CARD_SUPPRESSED_SAE_STATUSES.has(saeStatus)) return [];

  return cards;
}

function deriveIsGoverning(source = {}, saeContext = {}) {
  const role = normalizeAuthorityRole(source);
  if (!saeContext.hasSaeMetadata) {
    return source.isGoverning === true || source.metadata?.isGoverning === true;
  }
  return saeContext.saeStatus === "AUTHORITY_FOUND" && role === "GOVERNING";
}

function deriveLimitationRequired(source = {}, saeContext = {}) {
  if (!saeContext.hasSaeMetadata) {
    return source.limitationRequired === true || source.metadata?.limitationRequired === true;
  }
  if (saeContext.saeStatus === "AUTHORITY_FOUND") return false;
  return saeContext.saeStatus === "RELATED_AUTHORITY_ONLY";
}

function authorityRoleSuffix(authorityRole = "UNKNOWN") {
  return AUTHORITY_ROLE_SUFFIX[normalizeStatus(authorityRole)] ?? AUTHORITY_ROLE_SUFFIX.UNKNOWN;
}

function buildSourceAvailabilityDisclosure(saeContext = {}) {
  if (!saeContext.hasSaeMetadata) return "";
  const type = normalizeStatus(saeContext.disclosureType || saeContext.saeStatus);
  if (!SAE_DISCLOSURE_STATUSES.has(type)) return "";

  if (type === "RELATED_AUTHORITY_ONLY") {
    return [
      "Source limitation:",
      "A governing authority was not directly located.",
      "Displayed sources are related, supporting, or secondary only.",
      "They are not the controlling basis for the answer."
    ].join(" ");
  }

  if (type === "NO_INDEXED_SOURCE") {
    return "Source limitation: No indexed source was located for direct verification.";
  }

  if (type === "RETRIEVAL_TIMEOUT") {
    return "Source limitation: Indexed source retrieval timed out before source availability could be verified.";
  }

  if (type === "SOURCE_LOOKUP_EMPTY") {
    return "Source limitation: Source lookup completed, but no indexed source was found.";
  }

  if (type === "SOURCE_PARSE_ERROR") {
    return "Source limitation: Sources were retrieved, but source parsing failed before authority could be verified.";
  }

  return "";
}

function hasDisclosureText(answer = "", disclosure = "") {
  if (!disclosure) return true;
  const normalizedAnswer = normalizeText(answer).toLowerCase();
  const normalizedDisclosure = normalizeText(disclosure).toLowerCase();
  return normalizedAnswer.includes(normalizedDisclosure);
}

function appendDisclosureBeforeSources(answer = "", disclosure = "") {
  const rendered = normalizeText(answer);
  if (!disclosure || hasDisclosureText(rendered, disclosure)) return rendered;
  return [rendered, disclosure].filter(Boolean).join("\n\n");
}

function formatSourceLine(source = {}, index = 0, sourcePath = "") {
  const label = `${source.citation ? `${source.citation} – ` : ""}${source.title}`;
  const suffix = source.authorityRoleSuffix ? ` [${source.authorityRoleSuffix}]` : "";
  const linked = source.url ? `[${label}](${source.url})` : label;
  const path = trimText(sourcePath, 240);
  return path
    ? `${index + 1}. ${linked}${suffix} — ${path}`
    : `${index + 1}. ${linked}${suffix} (${source.authorityType})`;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRawSourceSections(text = "") {
  return normalizeText(text)
    // "Sources Used" — plain, bold (**Sources Used:**), italic (*Sources Used:*)
    .replace(/\n+\*{0,2}Sources Used\*{0,2}:?\*{0,2}[\s\S]*$/i, "")
    // "Sources" — colon-present variant: Sources:, **Sources:**, **Sources**:, *Sources:*
    // No (?:\n|$) guard needed when a colon is present; colon itself distinguishes the
    // section header from prose like "Sources of income vary…"
    .replace(/\n+\*{0,2}Sources\*{0,2}:\*{0,2}[\s\S]*$/i, "")
    // "Sources" — no-colon variant (e.g. **Sources** then newline); explicit \n guard
    // required here to avoid stripping "Sources of income…" sentences
    .replace(/\n+\*{0,2}Sources\*{0,2}\s*\n[\s\S]*$/i, "")
    // Markdown heading variants: ## Sources, ### Sources:, # Sources Used, ## References
    .replace(/\n+#{1,6}\s*\*{0,2}(?:Sources(?:\s+Used)?|References)\*{0,2}:?[\s\S]*$/i, "")
    // "References" — plain (References:), bold (**References:**), italic
    .replace(/\n+\*{0,2}References\*{0,2}:?\*{0,2}[\s\S]*$/i, "")
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

function normalizeLegacyTaxMemoHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*A\.\s*(?:DIRECT ANSWER|SHORT ANSWER|CONCLUSION|SHORT ANSWER \/ CONCLUSION)\b/gi, "$1A. Short Answer / Conclusion")
    .replace(/(^|\n)\s*B\.\s*(?:CONTROLLING LEGAL BASIS|LEGAL BASIS|GOVERNING AUTHORITY)\b/gi, "$1B. Governing Authority")
    .replace(/(^|\n)\s*C\.\s*(?:SUPPORTING RULES \/ ADMINISTRATIVE ISSUANCES|SUPPORTING RULES|ADMINISTRATIVE ISSUANCES|ANALYSIS)\b/gi, "$1C. Analysis")
    .replace(/(^|\n)\s*D\.\s*(?:SUPPORTING JURISPRUDENCE|COMPLIANCE EFFECT|PRACTICAL EFFECT)\b/gi, "$1D. Compliance Effect")
    .replace(/(^|\n)\s*E\.\s*(?:DOCTRINAL STATUS \/ CONFLICT ANALYSIS|CAVEATS \/ MISSING FACTS|CAVEATS|MISSING FACTS)\b/gi, "$1E. Caveats / Missing Facts")
    .replace(/(^|\n)\s*F\.\s*(?:PRACTICAL NOTE \/ APPLICATION|PRACTICAL APPLICATION|SOURCES \/ SOURCE CARDS|SOURCE CARDS|SOURCES)\b/gi, "$1F. Sources / Source Cards");
}

function normalizeOrchestrationMode(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  if (Object.values(ORCHESTRATION_MODES).includes(raw)) return raw;
  if (raw.includes("SENIOR_COUNSEL") || raw.includes("LITIGATION_MEMO") || raw.includes("COUNSEL_MEMO")) return "SENIOR_COUNSEL_MEMO";
  if (raw.includes("CASE_ANALYSIS") || raw === "CASE") return "CASE_ANALYSIS";
  if (raw.includes("SOURCE_LOOKUP") || raw === "SOURCE" || raw === "SOURCE_FINDER") return "SOURCE_LOOKUP";
  if (raw.includes("FAST") || raw.includes("QUICK") || raw.includes("DEFINITION")) return "FAST_DEFINITION";
  if (raw.includes("LEGAL") || raw.includes("DOCTRINE") || raw.includes("JURISPRUDENCE")) return "LEGAL_ANALYSIS";
  if (raw.includes("COMPLEX") || raw.includes("AUDIT") || raw.includes("CONTRACT") || raw.includes("TRANSACTION") || raw.includes("EVIDENCE") || raw.includes("RISK")) return "COMPLEX_ADVISORY";
  if (raw.includes("EMERGENCY")) return "EMERGENCY_TRIM";
  if (raw.includes("STANDARD") || raw.includes("TAX")) return "STANDARD_TAX";

  return null;
}

function routeTokensFromInput(input = {}) {
  return [
    input.route,
    input.routeHook,
    input.routeMode,
    input.commandMode,
    input.metadata?.routeHook,
    input.metadata?.routeMode,
    input.metadata?.hook,
    input.metadata?.hookCode,
    input.metadata?.activeHook,
    input.metadata?.modeFlags?.hook,
    input.metadata?.modeFlags?.commandMode,
    input.adaptiveContext?.activeHook,
    input.adaptiveContext?.routeHook,
    input.adaptiveContext?.hookConfig?.hook_code,
    input.responsePlan?.hookCode
  ].map(normalizeRouteToken);
}

function isTaxRoute(input = {}) {
  const tokens = routeTokensFromInput(input);
  return tokens.includes("/tax") || tokens.includes("tax");
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

  if (isTaxRoute(input)) {
    return TAX_SENIOR_MEMO_HEADINGS;
  }

  const rawSections = safeArray(
    input.rendererContract?.sections ||
      input.responsePlan?.rendererContract?.sections ||
      input.responsePlan?.responseTemplate ||
      input.requiredAnswerSections ||
      input.issueClassification?.requiredAnswerSections ||
      input.issueClassification?.taxDomainClassification?.requiredAnswerSections ||
      FALLBACK_TEMPLATES[mode] ||
      FALLBACK_TEMPLATES.LEGAL_ANALYSIS
  );

  // Normalize /ask profile section labels to markdown headings.
  // The LLM is instructed to emit "### Short Answer" etc., but the planner stores
  // plain labels ("Short Answer").  hasHeading() and repairStructure() both use
  // the exact heading string — if plain and the LLM emits ### , they miss each other,
  // causing repairStructure to dump all content into section 0.
  // Normalizing here ensures consistent ### matching without changing any other path.
  if (input.responsePlan?.askProfile) {
    return rawSections.map(s => {
      const str = String(s || "").trim();
      return str.startsWith("### ") ? str : `### ${str}`;
    });
  }

  return rawSections;
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

    "C. ADMINISTRATIVE ISSUANCE": "Implementing regulations applicable to this provision are pending index verification.",
    "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES": "Indexed source not found.",
    "C. SUPPORTING RULES": "Indexed source not found.",
    "D. PRACTICAL NOTE": "Verify the latest indexed authority before relying on the answer.",
    "D. SUPPORTING JURISPRUDENCE": "Indexed source not found.",

    "E. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "Conflict Detected: NO\nNo direct doctrinal conflict is established from the validated indexed sources.",

    "F. PRACTICAL NOTE / APPLICATION":
      "Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.",

    "F. PRACTICAL APPLICATION":
      "Verify the latest indexed authority, controlling doctrine, and supporting documents before relying on the position.",

    "A. Short Answer / Conclusion": "Indexed source not found.",
    "B. Governing Authority": "Indexed source not found.",
    "C. Analysis": "Apply the verified governing authority to the stated facts before relying on the position.",
    "D. Compliance Effect": "Confirm the filing, withholding, payment, documentation, and reporting effects once the governing authority and facts are verified.",
    "E. Caveats / Missing Facts": "Material facts may be missing. Confirm the taxpayer, transaction, taxable period, amounts, and supporting documents.",
    "F. Sources / Source Cards": "Use source cards only when indexed sources support the answer; do not treat related sources as governing authority.",

    "### Direct Answer": "Please refer to the applicable NIRC provision for the statutory definition.",
    "### Legal Basis": "Refer to the relevant provision of the NIRC as amended.",
    "### Practical Explanation": "The implementing regulation applies. Refer to the relevant Revenue Regulation for operational details.",
    "### Practical Note": "Consult the applicable provision and implementing regulation before relying on this answer.",

    // Senior Tax Counsel Memo headings
    "RULING":             "Indexed source not found.",
    "LEGAL BASIS":        "Indexed source not found.",
    "ANALYSIS":           "Indexed source not found.",
    "QUALIFICATIONS":     "No conditions that change the ruling have been identified.",
    "OPEN ISSUES":        "No unresolved doctrinal issues identified.",
    "RECOMMENDED ACTION": "Indexed source not found.",
    "POSITION STRENGTH":  "MODERATE — Position requires verification against current indexed authority.",

    // /ask research profile headings (BASIC_RESEARCH, LEGAL_INTERPRETATION, etc.)
    "### Short Answer":                   "Indexed source not found.",
    "### Controlling Authorities":        "Indexed source not found.",
    "### Interpretation":                 "Indexed source not found.",
    "### Practical Meaning":              "Consult the applicable provision and implementing regulation before relying on this answer.",
    "### Issue Presented":                "Indexed source not found.",
    "### Legal Interpretation":           "Indexed source not found.",
    "### Practical Application":          "Consult the applicable provision and implementing regulation before relying on this answer.",
    "### Relevant Facts / Assumptions":   "The factual circumstances have not been fully described. The analysis is based on the question as presented.",
    "### Legal / Tax Analysis":           "Indexed source not found.",
    "### Alternative Interpretations":    "No alternative interpretations identified from the available indexed authorities.",
    "### Position Strength":              "Position strength is preliminary and subject to full fact pattern verification.",
    "### Practical Note":                 "Consult the applicable provision and implementing regulation before relying on this answer.",
    "### Characterization Issue":         "Indexed source not found.",
    "### Competing Characterizations":    "No competing characterizations identified from the available authorities.",
    "### Tax Consequences":               "Indexed source not found.",
    "### Evidence / Substance Factors":   "The applicable substance-over-form factors have not been fully assessed.",
    "### Most Defensible Position":       "Position determination requires full fact pattern assessment.",
    "### Case / Doctrine Asked":          "Indexed source not found.",
    "### Facts and Issue":                "Indexed source not found.",
    "### Ruling":                         "Indexed source not found.",
    "### Doctrine":                       "Indexed source not found.",
    "### Current Significance":           "Indexed source not found.",
    "### Related Authorities":            "Indexed source not found.",
    "### Authority Question":             "Indexed source not found.",
    "### Authority Hierarchy":            "Refer to the Master Prompt authority hierarchy: Constitution → NIRC/CMTA/LGC → Tax Treaties → Supreme Court → CTA → RR → RMC/RMO → BIR Rulings.",
    "### Conflict / Consistency Analysis": "No conflict identified from the available indexed authorities.",
    "### Controlling Rule":               "Indexed source not found.",
    "### Practical Effect":               "Consult the applicable provision and implementing regulation before relying on this answer.",
    "### Accounting Treatment":           "Indexed source not found.",
    "### Tax Treatment":                  "Indexed source not found.",
    "### Differences and Reconciliation": "Indexed source not found."
  };

  return defaults[heading] || "Indexed source not found.";
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS) {
  const stripped = stripRawSourceSections(answer);
  const clean = headings === TAX_SENIOR_MEMO_HEADINGS
    ? normalizeLegacyTaxMemoHeadings(stripped)
    : normalizeLegacyHeadings(stripped);
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

    TREATY: "TREATY",
    TAX_TREATY: "TREATY",

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
  // PRIMARY: resolve to a canonical authority key so that variant encodings of the
  // same issuance (abbreviated, full-form, filename) collapse to the same dedup slot.
  const authorityRef =
    inferIssuanceNumber(source)    ||
    source.citation                ||
    source.reference               ||
    source.normalizedReference     ||
    source.normalized_reference    ||
    source.issuanceNumber          || "";

  if (authorityRef) {
    return canonicalSourceKey(authorityRef);
  }

  // FALLBACK: exact-document fields when no authority ref can be resolved.
  return [
    source.fileId,
    source.id,
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

// Best URL from any known variant — top-level and metadata-nested.
function bestSourceUrl(source = {}) {
  return (
    source.driveViewUrl    || source.drive_view_url      ||
    source.url             || source.webViewLink          ||
    source.web_view_link   || source.sourceUrl            ||
    source.source_url      ||
    source.metadata?.driveViewUrl  || source.metadata?.drive_view_url ||
    source.metadata?.url           || source.metadata?.webViewLink    ||
    source.metadata?.web_view_link || source.metadata?.sourceUrl      ||
    source.metadata?.source_url    || ""
  );
}

// Merge metadata from an incoming duplicate into the retained source.
// URL upgrade: if retained has no URL, promote incoming's best URL (including
//   metadata-nested) to retained's top-level fields.
// Metadata coalesce: ALWAYS fills any missing field from incoming — decoupled from
//   the URL upgrade so that retained sources that already have a URL still gain
//   documentTitle, citation, etc. from later duplicates.
function mergeSourceMetadata(retained, incoming) {
  if (!incoming) return retained;
  const retUrl     = bestSourceUrl(retained);
  const incUrl     = bestSourceUrl(incoming);
  const promoteUrl = !retUrl && incUrl ? incUrl : undefined;
  return Object.assign({}, retained, {
    driveViewUrl:   retained.driveViewUrl   || incoming.driveViewUrl   || promoteUrl,
    drive_view_url: retained.drive_view_url || incoming.drive_view_url || promoteUrl,
    url:            retained.url            || incoming.url            || promoteUrl,
    webViewLink:    retained.webViewLink    || incoming.webViewLink,
    web_view_link:  retained.web_view_link  || incoming.web_view_link,
    sourceUrl:      retained.sourceUrl      || incoming.sourceUrl,
    source_url:     retained.source_url     || incoming.source_url,
    documentTitle:        retained.documentTitle        || incoming.documentTitle,
    document_title:       retained.document_title       || incoming.document_title,
    normalizedReference:  retained.normalizedReference  || incoming.normalizedReference,
    normalized_reference: retained.normalized_reference || incoming.normalized_reference,
    citation:             retained.citation             || incoming.citation,
    reference:            retained.reference            || incoming.reference,
    source:               retained.source               || incoming.source,
    authorityId:          retained.authorityId          || incoming.authorityId          || incoming.authority_id,
    authority_id:         retained.authority_id         || incoming.authority_id         || incoming.authorityId,
    displayLabel:         retained.displayLabel         || incoming.displayLabel         || incoming.display_label,
    display_label:        retained.display_label        || incoming.display_label        || incoming.displayLabel,
    authorityType:        retained.authorityType        || incoming.authorityType        || incoming.authority_type,
    authority_type:       retained.authority_type       || incoming.authority_type       || incoming.authorityType,
    authorityRole:        retained.authorityRole        || incoming.authorityRole        || incoming.authority_role,
    authority_role:       retained.authority_role       || incoming.authority_role       || incoming.authorityRole,
    authorityLevel:       retained.authorityLevel       || incoming.authorityLevel       || incoming.authority_level,
    authority_level:      retained.authority_level      || incoming.authority_level      || incoming.authorityLevel,
    isIndexed:            retained.isIndexed            ?? incoming.isIndexed            ?? incoming.is_indexed,
    is_indexed:           retained.is_indexed           ?? incoming.is_indexed           ?? incoming.isIndexed,
    isParsed:             retained.isParsed             ?? incoming.isParsed             ?? incoming.is_parsed,
    is_parsed:            retained.is_parsed            ?? incoming.is_parsed            ?? incoming.isParsed,
    isGoverning:          retained.isGoverning          ?? incoming.isGoverning          ?? incoming.is_governing,
    is_governing:         retained.is_governing         ?? incoming.is_governing         ?? incoming.isGoverning,
    limitationRequired:   retained.limitationRequired   ?? incoming.limitationRequired   ?? incoming.limitation_required,
    limitation_required:  retained.limitation_required  ?? incoming.limitation_required  ?? incoming.limitationRequired,
    confidence:           retained.confidence           ?? incoming.confidence,
    retrievalStatus:      retained.retrievalStatus      || incoming.retrievalStatus      || incoming.retrieval_status,
    retrieval_status:     retained.retrieval_status     || incoming.retrieval_status     || incoming.retrievalStatus
  });
}

function dedupeSources(sources = []) {
  const seenIdx = new Map();
  const output = [];

  for (const source of safeArray(sources)) {
    const key = normalizeSourceKey(source);
    if (!key) continue;
    if (seenIdx.has(key)) {
      const idx = seenIdx.get(key);
      output[idx] = mergeSourceMetadata(output[idx], source);
      continue;
    }
    seenIdx.set(key, output.length);
    output.push(source);
  }

  return output;
}

function compactSource(source = {}, saeContext = {}) {
  const authorityType = sourceAuthorityType(source);
  const authorityRole = normalizeAuthorityRole(source);
  const displayLabel = trimText(
    source.displayLabel ||
      source.display_label ||
      source.metadata?.displayLabel ||
      source.metadata?.display_label ||
      "",
    220
  );
  const citation = trimText(
    source.citation ||
      source.metadata?.citation ||
      source.reference ||
      source.metadata?.reference ||
      source.normalizedReference ||
      source.normalized_reference ||
      source.metadata?.normalizedReference ||
      source.metadata?.normalized_reference ||
      source.issuanceNumber ||
      source.issuance_number ||
      source.metadata?.issuanceNumber ||
      source.metadata?.issuance_number ||
      "",
    260
  );
  const isGoverning = deriveIsGoverning(source, saeContext);
  const limitationRequired = deriveLimitationRequired(source, saeContext);

  return {
    title: trimText(
      displayLabel ||
      source.title ||
        source.sourceTitle ||
        source.source ||
        source.sourcePath ||
        source.source_path ||
        source.path ||
        "Untitled Source",
      220
    ),
    displayLabel,
    citation,
    url: trimText(
      bestSourceUrl(source),
      320
    ),
    authorityType,
    authorityRole,
    authorityLevel: source.authorityLevel ?? source.authority_level ?? sourcePrecedence(source),
    controllingPrecedence: sourcePrecedence(source),
    authorityId: source.authorityId || source.authority_id || source.metadata?.authorityId || source.metadata?.authority_id || "",
    isIndexed: source.isIndexed ?? source.is_indexed ?? source.metadata?.isIndexed ?? source.metadata?.is_indexed ?? null,
    isParsed: source.isParsed ?? source.is_parsed ?? source.metadata?.isParsed ?? source.metadata?.is_parsed ?? null,
    isGoverning,
    limitationRequired,
    confidence: source.confidence ?? source.metadata?.confidence ?? null,
    retrievalStatus: source.retrievalStatus || source.retrieval_status || source.metadata?.retrievalStatus || source.metadata?.retrieval_status || "",
    authorityRoleSuffix: saeContext.hasSaeMetadata ? authorityRoleSuffix(authorityRole) : "",
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

function normalizeLegacyFastDefinitionHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*A\. DIRECT ANSWER\b/gi, "$1### Direct Answer")
    .replace(/(^|\n)\s*B\. CONTROLLING LEGAL BASIS\b/gi, "$1### Legal Basis")
    .replace(/(^|\n)\s*C\. ADMINISTRATIVE ISSUANCE\b/gi, "$1### Practical Explanation")
    .replace(/(^|\n)\s*D\. PRACTICAL NOTE\b/gi, "$1### Practical Note");
}

function renderAdaptiveAnswer(input = {}) {
  const headings = getHeadingsFromInput(input);
  const rawAnswer = input.answer || input.draftAnswer || input.fallbackAnswer || "";

  const preNormalized = headings === FAST_DEFINITION_HEADINGS
    ? normalizeLegacyFastDefinitionHeadings(rawAnswer)
    : rawAnswer;

  let rendered = repairStructure(preNormalized, headings);
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

function renderFastDefinitionConversational(structuredAnswer = "", userQuery = "", responseStyle = null) {
  const q = normalizeText(userQuery).toLowerCase();

  const directAnswer     = getSectionBody(structuredAnswer, "### Direct Answer",        FAST_DEFINITION_HEADINGS);
  const legalBasis       = getSectionBody(structuredAnswer, "### Legal Basis",           FAST_DEFINITION_HEADINGS);
  const practicalExplain = getSectionBody(structuredAnswer, "### Practical Explanation", FAST_DEFINITION_HEADINGS);
  const practicalNote    = getSectionBody(structuredAnswer, "### Practical Note",        FAST_DEFINITION_HEADINGS);

  // If key sections are missing, return structured output unchanged (safe fallback)
  if (!directAnswer.trim() || !legalBasis.trim()) return structuredAnswer;

  // Normalize legal basis: convert bullet list → readable sentence
  const legalIsBulleted = /^[-•]\s/m.test(legalBasis.trim());
  const legalPara = legalIsBulleted
    ? "The main legal basis includes " +
      legalBasis.split("\n")
        .map(l => l.replace(/^[-•*]\s+/, "").trim())
        .filter(Boolean)
        .join(", ") + "."
    : legalBasis.trim();

  // Suppress generic compliance boilerplate in Practical Note
  const isGenericNote = /consult the applicable provision.*before relying/i.test(practicalNote);
  const noteToUse = (!isGenericNote && practicalNote.trim()) ? practicalNote.trim() : "";

  // Suppress Practical Explanation if empty or identical to Direct Answer (skipped for COMPARATIVE)
  const explainToUse = (practicalExplain.trim() && practicalExplain.trim() !== directAnswer.trim())
    ? practicalExplain.trim()
    : "";

  // COMPARATIVE: DA + PE + LB; PN suppressed; dedup guard bypassed
  if (responseStyle === "COMPARATIVE") {
    return [
      directAnswer.trim(),
      practicalExplain.trim() || explainToUse,
      legalPara
    ].filter(Boolean).join("\n\n");
  }

  // Derive presentation policy from responseStyle; fall back to inline regex when null
  const isUltraShort  = responseStyle === "CONCISE"
    || (!responseStyle && q.length <= 60 && /^(what is|define|meaning of|[a-z]+ meaning)\b/i.test(q));
  const isProcedural  = responseStyle === "PROCEDURAL"
    || (!responseStyle && /\b(how does|how is|how do|how are)\b/i.test(q));
  const isExplanation = responseStyle === "EXPLAIN"
    || (!responseStyle && /\b(explain|walk me through|help me understand)\b/i.test(q));

  const paragraphs = [];

  paragraphs.push(directAnswer.trim());

  if (!isUltraShort && explainToUse) {
    paragraphs.push(explainToUse);
  }

  if ((isProcedural || isExplanation) && noteToUse) {
    paragraphs.push(noteToUse);
  }

  paragraphs.push(legalPara);

  return paragraphs.filter(Boolean).join("\n\n");
}

function normalizeRouteToken(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isAskConversationalFormattingEligible(input = {}) {
  const mode = normalizeOrchestrationMode(
    input.orchestrationMode ||
      input.contextMode ||
      input.mode ||
      input.metadata?.orchestrationMode ||
      input.metadata?.mode ||
      input.responsePlan?.orchestrationMode ||
      input.responsePlan?.contextMode ||
      input.metadata?.modeFlags?.orchestrationMode ||
      input.metadata?.modeFlags?.responseMode ||
      ""
  );

  const routeTokens = routeTokensFromInput(input);

  const isAskRoute = routeTokens.includes("/ask") || routeTokens.includes("ask");
  return isAskRoute && (ASK_CONVERSATIONAL_MODES.has(mode) || input.responsePlan?.askProfile === true);
}

function stripHeadingOnlyLines(text = "") {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,4}\s+/i.test(line))
    .filter((line) => !/^[A-Z]\.\s+(?:DIRECT ANSWER|CONTROLLING LEGAL BASIS|SUPPORTING RULES|SUPPORTING JURISPRUDENCE|DOCTRINAL STATUS|PRACTICAL NOTE|PRACTICAL APPLICATION)\b/i.test(line))
    .join("\n")
    .trim();
}

function ensureAskHeading(label = "", body = "") {
  const clean = stripHeadingOnlyLines(body);
  if (!clean) return "";
  return `### ${label}\n${clean}`;
}

function renderAskConversationalAnswer(structuredAnswer = "", input = {}) {
  const clean = normalizeText(structuredAnswer);
  if (!clean) return clean;

  if (hasStructure(clean, FAST_DEFINITION_HEADINGS)) {
    const directAnswer = getSectionBody(clean, "### Direct Answer", FAST_DEFINITION_HEADINGS);
    const legalBasis = getSectionBody(clean, "### Legal Basis", FAST_DEFINITION_HEADINGS);
    const practicalExplain = getSectionBody(clean, "### Practical Explanation", FAST_DEFINITION_HEADINGS);
    const practicalNote = getSectionBody(clean, "### Practical Note", FAST_DEFINITION_HEADINGS);

    return [
      ensureAskHeading("Direct answer", directAnswer),
      ensureAskHeading("Key explanation", practicalExplain),
      ensureAskHeading("Practical note", practicalNote),
      ensureAskHeading("Source / authority note", legalBasis)
    ].filter(Boolean).join("\n\n").trim() || clean;
  }

  if (hasCompleteAFStructure(clean)) {
    const directAnswer = getSectionBody(clean, "A. DIRECT ANSWER", TINA_AF_HEADINGS);
    const legalBasis = getSectionBody(clean, "B. CONTROLLING LEGAL BASIS", TINA_AF_HEADINGS);
    const supportingRules = getSectionBody(clean, "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES", TINA_AF_HEADINGS);
    const jurisprudence = getSectionBody(clean, "D. SUPPORTING JURISPRUDENCE", TINA_AF_HEADINGS);
    const doctrinalStatus = getSectionBody(clean, "E. DOCTRINAL STATUS / CONFLICT ANALYSIS", TINA_AF_HEADINGS);
    const practicalNote = getSectionBody(clean, "F. PRACTICAL NOTE / APPLICATION", TINA_AF_HEADINGS);
    const sourceNote = [legalBasis, supportingRules, jurisprudence, doctrinalStatus]
      .map(stripHeadingOnlyLines)
      .filter(Boolean)
      .join("\n\n");

    return [
      ensureAskHeading("Direct answer", directAnswer),
      ensureAskHeading("Key explanation", supportingRules || legalBasis),
      ensureAskHeading("Practical note", practicalNote),
      ensureAskHeading("Source / authority note", sourceNote)
    ].filter(Boolean).join("\n\n").trim() || clean;
  }

  return clean;
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
  route = null,
  routeHook = null,
  routeMode = null,
  commandMode = null,
  saeStatus = null,
  sourceAvailability = null,
  sourceStatus = null,
  sourceAvailabilityMetadata = null,
  limitationRequired = null,
  disclosureType = null,
  statusReason = null,
  sourceAvailabilityReason = null,
  metadata = {}
} = {}) {
  const saeContext = resolveSaeContext({
    saeStatus,
    sourceAvailability,
    sourceStatus,
    sourceAvailabilityMetadata,
    limitationRequired,
    disclosureType,
    statusReason,
    sourceAvailabilityReason,
    metadata
  });
  const sourceDisclosure = buildSourceAvailabilityDisclosure(saeContext);
  const resolvedMode = String(mode || orchestrationMode || contextMode || "").toUpperCase();
  const isQuizMode = resolvedMode === "QUIZ_MODE" || resolvedMode === "QUIZ";
  const isReviewerMode = resolvedMode === "REVIEWER_MODE" || resolvedMode === "REVIEWER";
  const isCaseMode = resolvedMode === "CASE_ANALYSIS" || resolvedMode === "CASE";
  const isSourceMode = resolvedMode === "SOURCE_LOOKUP" || resolvedMode === "SOURCE" || resolvedMode === "SOURCE_FINDER";
  const renderableSources = suppressSourcesIfSaeStatusRequires(sources, saeContext);

  let rendered;
  if (isQuizMode || isReviewerMode || isCaseMode || isSourceMode) {
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
      route,
      routeHook,
      routeMode,
      commandMode,
      metadata
    });
  }

  if (isAskConversationalFormattingEligible({
    rendered,
    adaptiveContext,
    responsePlan,
    orchestrationMode,
    contextMode,
    mode,
    route,
    routeHook,
    routeMode,
    commandMode,
    metadata
  })) {
    rendered = renderAskConversationalAnswer(rendered, {
      adaptiveContext,
      responsePlan,
      orchestrationMode,
      contextMode,
      mode,
      route,
      routeHook,
      routeMode,
      commandMode,
      metadata
    });
  }

  // ── Source mode: deterministic list when sources are available ───────────────
  // When SOURCE_LOOKUP has retrieved sources, discard the model's answer text
  // (which may say "No indexed sources found" if the pipeline passed it an empty
  // list before retrieval was fixed) and render a numbered list from the source
  // array instead.  includeSources is intentionally not consulted — SOURCE_LOOKUP
  // always owns its own rendered output when sources are present.
  if (isSourceMode && renderableSources.length > 0) {
    const SOURCE_MODE_CAP = 12;
    const sorted = sortVisibleSources(renderableSources).slice(0, SOURCE_MODE_CAP);

    const lines = sorted.map((s, i) => {
      const compact = compactSource(s, saeContext);
      const path    = String(s.source || s.original_source || "").trim();
      return formatSourceLine(compact, i, path);
    });

    rendered = appendDisclosureBeforeSources("Indexed sources found:", sourceDisclosure);
    rendered = [rendered, lines.join("\n")].filter(Boolean).join("\n\n");
  }
  // ── End source mode override ────────────────────────────────────────────────

  if (includeSources) {
    const visible = sortVisibleSources(renderableSources)
      .slice(0, MAX_VISIBLE_SOURCES)
      .map((source) => compactSource(source, saeContext));

    if (visible.length) {
      const sourceLines = visible.map((s, i) => formatSourceLine(s, i));

      rendered = appendDisclosureBeforeSources(rendered, sourceDisclosure);
      rendered = `${rendered}\n\n**Sources**\n${sourceLines.join("\n")}`;
    }
  } else if (sourceDisclosure) {
    rendered = appendDisclosureBeforeSources(rendered, sourceDisclosure);
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
  mode = null,
  route = null,
  routeHook = null,
  routeMode = null,
  commandMode = null,
  saeStatus = null,
  sourceAvailability = null,
  sourceStatus = null,
  sourceAvailabilityMetadata = null,
  limitationRequired = null,
  disclosureType = null,
  statusReason = null,
  sourceAvailabilityReason = null
} = {}) {
  const saeContext = resolveSaeContext({
    saeStatus,
    sourceAvailability,
    sourceStatus,
    sourceAvailabilityMetadata,
    limitationRequired,
    disclosureType,
    statusReason,
    sourceAvailabilityReason,
    metadata
  });
  const sourceDisclosure = buildSourceAvailabilityDisclosure(saeContext);

  const effectiveMode =
    normalizeOrchestrationMode(orchestrationMode || contextMode || mode || metadata?.orchestrationMode || metadata?.mode || "") ||
    getResponseModeFromInput({ adaptiveContext, responsePlan, metadata });

  const sortedSources = sortVisibleSources(sources)
    .slice(0, MAX_VISIBLE_SOURCES)
    .map((source) => compactSource(source, saeContext));

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
    route,
    routeHook,
    routeMode,
    commandMode,
    saeStatus,
    sourceAvailability,
    sourceStatus,
    sourceAvailabilityMetadata,
    limitationRequired,
    disclosureType,
    statusReason,
    sourceAvailabilityReason,
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
    sourceCards: sortedSources,
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
      sourceAvailabilityDisclosurePrepared: Boolean(sourceDisclosure),
      disclosureEmitted: Boolean(sourceDisclosure && hasDisclosureText(renderedAnswer, sourceDisclosure)),
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

/* ═══════════════════════════════════════════════════════════════════════════
 * PATCH-019A REV2 — Verified-Authority Final Answer Gate
 *
 * Post-generation, post-compliance, post-017J/017K text gate.
 * Rule: No verified source, no legal citation.
 *
 * The gate NEVER performs retrieval, NEVER changes SAE status, NEVER invents
 * authorities. It only inspects/sanitizes the final answer TEXT against an
 * allow-list of verified authorities supplied by the caller (pipeline.js /
 * ask-handler.js). VAT-bridge and EWT-fast-path preservation decisions are
 * made by the CALLER from existing pipeline flags and passed in as booleans —
 * the gate does no query matching and no classification of its own.
 * ═══════════════════════════════════════════════════════════════════════════ */

const PATCH_019A_UNSAFE_STATUSES = Object.freeze(new Set([
  "NO_INDEXED_SOURCE",
  "RETRIEVAL_TIMEOUT",
  "SOURCE_LOOKUP_EMPTY",
  "SOURCE_PARSE_ERROR",
  "PIPELINE_ERROR"
]));

// Canonical keys for the preservation contracts (PATCH-019A §8 / §9).
const PATCH_019A_VAT_FAST_DEFINITION_KEYS = Object.freeze([
  "nircsec105", "nircsec106", "nircsec107", "nircsec108", "rr162005"
]);
const PATCH_019A_EWT_FAST_PATH_KEYS = Object.freeze([
  "nircsec57", "nircsec58", "rr298"
]);

// Per-status safe limitation messages (mirror pipeline.js SAE fallback texts).
// Used only when sanitization removes so much that no usable answer remains.
const PATCH_019A_LIMITATION_MESSAGES = Object.freeze({
  RETRIEVAL_TIMEOUT:
    "The authority retrieval process timed out before a reliable indexed source could be confirmed.\n\nThis does not mean that no law or authority exists. Please retry or verify the relevant indexed source before relying on a legal or tax conclusion.",
  NO_INDEXED_SOURCE:
    "TINA could not identify an indexed authority matching the specific transaction or claim described.\n\nThis does not mean that no law or authority exists.",
  SOURCE_LOOKUP_EMPTY:
    "The source lookup completed but did not return matching authority for this query.\n\nThis does not mean that no law or authority exists. Please verify the relevant indexed source before relying on a legal or tax conclusion.",
  SOURCE_PARSE_ERROR:
    "An indexed source was located, but its content could not be parsed reliably.\n\nI cannot rely on the parse-failed content as authority. Please verify the relevant indexed source before relying on a legal or tax conclusion.",
  PIPELINE_ERROR:
    "TINA encountered an internal pipeline error before it could complete a sourced answer. This does not mean that no law or authority exists. Please retry or narrow the question."
});

// Gate-local canonicalization for allow-list matching ONLY. Pre-normalizes
// long-form issuance names before canonicalSourceKey so that
// "Revenue Regulations No. 16-2005" and "RR 16-2005" produce the same key.
// Not a replacement for authority-utils normalization (which is untouched).
function patch019aCanonicalKey(value = "") {
  const pre = String(value || "")
    .toLowerCase()
    .replace(/\brevenue\s+regulations?\b/g, "rr")
    .replace(/\brevenue\s+memorandum\s+circular\b/g, "rmc")
    .replace(/\brevenue\s+memorandum\s+order\b/g, "rmo")
    .replace(/\brevenue\s+audit\s+memorandum\s+order\b/g, "ramo")
    .replace(/\bnational\s+internal\s+revenue\s+code\b/g, "nirc")
    .replace(/\btax\s+code\b/g, "nirc")
    .replace(/\bsections?\b/g, "sec")
    .replace(/\brepublic\s+act\b/g, "ra");
  return canonicalSourceKey(pre);
}

// Citation extractors: return canonical keys for every authority-looking
// citation in a text fragment. Patterns cover the citation families the
// Authority Lock governs (NIRC/Tax Code sections, RR/RMC/RMO/RAMO, RA).
const PATCH_019A_CITATION_EXTRACTORS = Object.freeze([
  {
    re: /\b(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)\s*,?\s*(?:sec(?:tion)?s?\.?\s*)(\d{1,3}(?:\s*-\s*[a-z]|[a-z])?)\b/gi,
    key: (m) => `nircsec${m[1].toLowerCase().replace(/[\s-]/g, "")}`
  },
  {
    re: /\bsec(?:tion)?s?\.?\s*(\d{1,3}(?:\s*-\s*[a-z]|[a-z])?)\s*(?:,\s*|\s+of\s+the\s+)(?:nirc|tax\s+code|national\s+internal\s+revenue\s+code)\b/gi,
    key: (m) => `nircsec${m[1].toLowerCase().replace(/[\s-]/g, "")}`
  },
  {
    re: /\b(rr|rmc|rmo|ramo)\s*(?:no\.?\s*)?(\d{1,3})\s*[-–]\s*(\d{2,4})\b/gi,
    key: (m) => `${m[1].toLowerCase()}${m[2]}${m[3]}`
  },
  {
    re: /\brevenue\s+(regulations?|memorandum\s+circular|memorandum\s+order|audit\s+memorandum\s+order)\s*(?:no\.?\s*)?(\d{1,3})\s*[-–]\s*(\d{2,4})\b/gi,
    key: (m) => {
      const t = m[1].toLowerCase();
      const prefix = t.startsWith("regulation") ? "rr"
        : t.startsWith("memorandum circular") ? "rmc"
        : t.startsWith("audit") ? "ramo" : "rmo";
      return `${prefix}${m[2]}${m[3]}`;
    }
  },
  {
    re: /\b(?:ra|r\.\s*a\.|republic\s+act)\s*(?:no\.?\s*)?(\d{3,6})\b/gi,
    key: (m) => `ra${m[1]}`
  }
]);

function patch019aExtractCitations(text = "") {
  const found = [];
  for (const { re, key } of PATCH_019A_CITATION_EXTRACTORS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(String(text))) !== null) {
      found.push({ raw: m[0], key: key(m) });
    }
  }
  return found;
}

// Authority-looking section headings (PATCH-019A §10). Matches plain,
// markdown (#/##/###), bolded, lettered ("B."), and inline-list variants.
const PATCH_019A_AUTHORITY_HEADING_RE =
  /^\s{0,3}(?:#{1,4}\s*)?(?:\*\*)?\s*(?:[A-Z]\.\s*)?(controlling|governing|primary|legal)?\s*authorit(?:y|ies)\s*(?:\*\*)?\s*:?\s*(?:\*\*)?\s*/i;

const PATCH_019A_FORBIDDEN_RELATED_HEADING_RE =
  /(controlling|governing|primary)\s+authorit(?:y|ies)/gi;

function patch019aIsAuthorityHeadingLine(line = "") {
  const trimmed = String(line).trim();
  if (!trimmed) return false;
  const m = trimmed.match(PATCH_019A_AUTHORITY_HEADING_RE);
  if (!m) return false;
  // Require the heading to be the dominant content of the line: either the
  // line is just the heading, or heading + inline citation list after ":".
  const rest = trimmed.replace(PATCH_019A_AUTHORITY_HEADING_RE, "").trim();
  return rest === "" || patch019aExtractCitations(rest).length > 0;
}

function patch019aIsListLine(line = "") {
  return /^\s*(?:[-*•]|\d+[.)])\s+/.test(String(line));
}

/**
 * PATCH-019A REV2 — apply the verified-authority gate to a final answer.
 *
 * Runs strictly on TEXT. Caller supplies verified authority sources and the
 * preservation flags (computed from existing pipeline state — see pipeline.js
 * Step 17.5). Returns the gated answer plus diagnostics flags.
 */
function applyVerifiedAuthorityGate({
  answer = "",
  saeStatus = "",
  finalSourceCards = [],
  pipelineSourceCards = [],
  eligibleCandidates = [],
  preGenerationSourceCards = [],
  lockedAuthorities = [],
  vatFastDefinitionPreserved = false,
  ewtFastPathPreserved = false,
  mode = "",
  route = ""
} = {}) {
  const status = String(saeStatus || "").trim().toUpperCase();
  const originalAnswer = String(answer || "");
  const result = {
    answer: originalAnswer,
    saeStatus: status,
    gateEvaluated: true,
    changed: false,
    leakageBlocked: false,
    relabelApplied: false,
    removedSectionCount: 0,
    suppressedCitations: [],
    verifiedAuthorityCount: 0,
    vatFastDefinitionPreserved: vatFastDefinitionPreserved === true,
    ewtFastPathPreserved: ewtFastPathPreserved === true
  };

  // ── Build the verified-authority allow-list (PATCH-019A §6) ──────────────
  const verifiedKeys = new Set();
  const addRef = (ref) => {
    const key = patch019aCanonicalKey(ref);
    if (key) verifiedKeys.add(key);
  };
  const addCardLike = (card) => {
    if (!card || typeof card !== "object") return;
    addRef(card.normalizedReference || card.normalized_reference || "");
    addRef(card.citation || "");
    addRef(card.title || "");
    addRef(card.label || "");
    addRef(card.reference || "");
    if (card.authorityAnnotation && typeof card.authorityAnnotation === "object") {
      addRef(card.authorityAnnotation.citation || "");
      addRef(card.authorityAnnotation.displayLabel || "");
    }
  };
  (Array.isArray(finalSourceCards) ? finalSourceCards : []).forEach(addCardLike);
  (Array.isArray(pipelineSourceCards) ? pipelineSourceCards : []).forEach(addCardLike);
  (Array.isArray(eligibleCandidates) ? eligibleCandidates : []).forEach(addCardLike);
  (Array.isArray(preGenerationSourceCards) ? preGenerationSourceCards : []).forEach(addCardLike);
  (Array.isArray(lockedAuthorities) ? lockedAuthorities : []).forEach(addRef);

  // Preservation contracts: flags are decided by the CALLER from existing
  // pipeline state (017F/G/H flags, mode, saeStatus). The gate only honors them.
  if (vatFastDefinitionPreserved === true && status === "AUTHORITY_FOUND") {
    PATCH_019A_VAT_FAST_DEFINITION_KEYS.forEach((k) => verifiedKeys.add(k));
  }
  if (ewtFastPathPreserved === true && status === "AUTHORITY_FOUND") {
    PATCH_019A_EWT_FAST_PATH_KEYS.forEach((k) => verifiedKeys.add(k));
  }
  result.verifiedAuthorityCount = verifiedKeys.size;

  const lines = originalAnswer.split("\n");

  // ── Unsafe statuses: absolute citation suppression (PATCH-019A §7.3) ─────
  if (PATCH_019A_UNSAFE_STATUSES.has(status)) {
    const kept = [];
    let inAuthoritySection = false;
    for (const line of lines) {
      if (patch019aIsAuthorityHeadingLine(line)) {
        inAuthoritySection = true;
        result.removedSectionCount++;
        continue;
      }
      if (inAuthoritySection) {
        if (String(line).trim() === "") { inAuthoritySection = false; continue; }
        if (patch019aIsListLine(line) || patch019aExtractCitations(line).length > 0) continue;
        inAuthoritySection = false; // prose resumed — section ended
      }
      const cites = patch019aExtractCitations(line);
      if (cites.length > 0) {
        for (const c of cites) {
          if (result.suppressedCitations.length < 12) result.suppressedCitations.push(c.raw);
        }
        continue; // drop citation-bearing line under unsafe status
      }
      kept.push(line);
    }
    let gated = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (gated.length < 40) {
      gated = PATCH_019A_LIMITATION_MESSAGES[status] || PATCH_019A_LIMITATION_MESSAGES.NO_INDEXED_SOURCE;
    }
    if (gated !== originalAnswer.trim() && (result.removedSectionCount > 0 || result.suppressedCitations.length > 0)) {
      result.changed = true;
      result.leakageBlocked = true;
      result.answer = gated;
      console.warn("[PATCH_019A_AUTHORITY_LEAKAGE_BLOCKED]", {
        saeStatus: status,
        mode,
        route,
        removedSectionCount: result.removedSectionCount,
        suppressedCitationCount: result.suppressedCitations.length,
        suppressedCitations: result.suppressedCitations.slice(0, 8),
        fallbackMessageUsed: result.answer === PATCH_019A_LIMITATION_MESSAGES[status]
      });
    }
    console.log("[PATCH_019A_AUTHORITY_GATE_EVALUATED]", {
      saeStatus: status, mode, route,
      verifiedAuthorityCount: result.verifiedAuthorityCount,
      leakageBlocked: result.leakageBlocked,
      relabelApplied: false
    });
    return result;
  }

  // ── RELATED_AUTHORITY_ONLY: no controlling presentation (§7.2) ───────────
  // Relabel HEADING lines only ("Controlling/Governing/Primary Authorities").
  // Prose-level controlling-language framing remains the job of the existing
  // SAE_C1 compliance checks in final-answer-compliance.js (untouched).
  if (status === "RELATED_AUTHORITY_ONLY") {
    const relabeled = lines
      .map((line) => {
        if (!patch019aIsAuthorityHeadingLine(line)) return line;
        PATCH_019A_FORBIDDEN_RELATED_HEADING_RE.lastIndex = 0;
        if (!PATCH_019A_FORBIDDEN_RELATED_HEADING_RE.test(line)) return line;
        PATCH_019A_FORBIDDEN_RELATED_HEADING_RE.lastIndex = 0;
        return line.replace(
          PATCH_019A_FORBIDDEN_RELATED_HEADING_RE,
          "Related / Supporting Authorities"
        );
      })
      .join("\n");
    if (relabeled !== originalAnswer) {
      result.changed = true;
      result.relabelApplied = true;
      result.answer = relabeled;
      console.log("[PATCH_019A_RELATED_AUTHORITY_RELABEL_APPLIED]", {
        saeStatus: status, mode, route
      });
    }
    console.log("[PATCH_019A_AUTHORITY_GATE_EVALUATED]", {
      saeStatus: status, mode, route,
      verifiedAuthorityCount: result.verifiedAuthorityCount,
      leakageBlocked: false,
      relabelApplied: result.relabelApplied
    });
    return result;
  }

  // ── AUTHORITY_FOUND: every citation-bearing line must be fully verified ──
  // REV2-FIX: scan ALL lines, not only detected authority sections, so inline
  // prose citations cannot bypass the gate. A line survives only if it carries
  // no legal citation, or every detected citation is in the verified
  // allow-list. A single unverified citation suppresses the whole line.
  // REV1-OUTCOME-6 FIX: the scan runs even when the verified allow-list is
  // EMPTY. AUTHORITY_FOUND with zero verified authority records is an
  // authority-verification failure — no citation is backed by a verified
  // record, so every citation-bearing line must be suppressed.
  if (status === "AUTHORITY_FOUND") {
    const kept = [];
    for (const line of lines) {
      const cites = patch019aExtractCitations(line);
      if (cites.length > 0 && !cites.every((c) => verifiedKeys.has(c.key))) {
        for (const c of cites) {
          if (verifiedKeys.has(c.key)) continue;
          if (result.suppressedCitations.length < 12) result.suppressedCitations.push(c.raw);
        }
        result.changed = true;
        continue;
      }
      kept.push(line);
    }
    if (result.changed) {
      result.answer = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (verifiedKeys.size === 0 && result.answer.length < 40) {
        result.answer = PATCH_019A_LIMITATION_MESSAGES.NO_INDEXED_SOURCE;
      }
      console.warn("[PATCH_019A_AUTHORITY_LEAKAGE_BLOCKED]", {
        saeStatus: status, mode, route,
        reason: verifiedKeys.size === 0
          ? "authority_verification_failure_no_records"
          : "unverified_citation_in_answer",
        suppressedCitationCount: result.suppressedCitations.length,
        suppressedCitations: result.suppressedCitations.slice(0, 8)
      });
      result.leakageBlocked = true;
    }
  }

  console.log("[PATCH_019A_AUTHORITY_GATE_EVALUATED]", {
    saeStatus: status, mode, route,
    verifiedAuthorityCount: result.verifiedAuthorityCount,
    leakageBlocked: result.leakageBlocked,
    relabelApplied: result.relabelApplied,
    vatFastDefinitionPreserved: result.vatFastDefinitionPreserved,
    ewtFastPathPreserved: result.ewtFastPathPreserved
  });
  return result;
}

export {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
  TINA_AF_HEADINGS,
  TAX_SENIOR_MEMO_HEADINGS,
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
  renderFastDefinitionConversational,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure,
  normalizeOrchestrationMode,
  applyVerifiedAuthorityGate,
  answerRendererHealthCheck
};

export default {
  ENGINE_VERSION,
  ORCHESTRATION_MODES,
  TINA_AF_HEADINGS,
  TAX_SENIOR_MEMO_HEADINGS,
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
  renderFastDefinitionConversational,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure,
  normalizeOrchestrationMode,
  applyVerifiedAuthorityGate,
  answerRendererHealthCheck
};
