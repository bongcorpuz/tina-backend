// FILE: authority-engine.js
"use strict";

/**
 * TINA AUTHORITY ENGINE
 * Version: 3.2.0
 *
 * Constitutional role:
 * - Central wrapper for authority metadata, hierarchy-aware reranking, and authority prompt text.
 * - Preserve compatibility with authority-constants.js and authority-utils.js.
 * - Never retrieve, call OpenAI, fabricate authorities, or render final answers.
 */

import {
  ENGINE_VERSION as CONSTANTS_ENGINE_VERSION,
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES
} from "./authority-constants.js";

import {
  normalizeText,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,
  computeIssueMatchBonus,
  computeAuthorityPriorityBonus
} from "./authority-utils.js";

const ENGINE_VERSION = "3.2.0";

/**
 * Master Prompt hierarchy:
 * 1. Constitution
 * 2. NIRC / CMTA / LGC / primary statutes
 * 3. Tax Treaties
 * 4. Supreme Court En Banc
 * 5. Supreme Court Division
 * 6. CTA En Banc
 * 7. CTA Division
 * 8. Revenue Regulations
 * 9. RMC / RMO / RAMO
 * 10. BIR Rulings
 * 11. LGU / BOC issuances
 * 12. PFRS / PAS / PSA when accounting applies
 * 13. OECD / foreign persuasive authorities
 * 14. CPA reviewer notes / secondary materials
 */
const MASTER_AUTHORITY_PRECEDENCE = Object.freeze({
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
  BOC_ISSUANCE: 11,
  FIRB_ISSUANCE: 11,
  PEZA_MEMO: 11,
  SEC_GUIDANCE: 11,
  ADMINISTRATIVE_GUIDANCE: 11,

  PFRS: 12,
  PAS: 12,
  PSA: 12,

  OECD_GUIDANCE: 13,
  FOREIGN_AUTHORITY: 13,

  SECONDARY: 14,
  CPA_NOTES: 14,
  REVIEW_MATERIALS: 14,

  UNKNOWN: 99
});

const MASTER_AUTHORITY_SCORE = Object.freeze({
  CONSTITUTION: 150,

  STATUTE: 145,
  NIRC: 145,
  TAX_CODE: 145,
  CMTA: 145,
  LGC: 145,
  REPUBLIC_ACT: 145,
  RA: 145,

  TAX_TREATY: 138,
  TREATY: 138,

  SUPREME_COURT_EN_BANC: 132,
  SUPREME_COURT: 126,

  CTA_EN_BANC: 118,
  CTA_DIVISION: 112,
  COURT_OF_APPEALS: 112,

  RR: 104,
  REVENUE_REGULATION: 104,

  RMC: 96,
  RMO: 94,
  RAMO: 94,

  BIR_RULING: 86,

  LGU: 78,
  BOC_ISSUANCE: 78,
  FIRB_ISSUANCE: 78,
  PEZA_MEMO: 78,
  SEC_GUIDANCE: 76,
  ADMINISTRATIVE_GUIDANCE: 76,

  PFRS: 70,
  PAS: 70,
  PSA: 66,

  OECD_GUIDANCE: 45,
  FOREIGN_AUTHORITY: 45,

  SECONDARY: 8,
  CPA_NOTES: 8,
  REVIEW_MATERIALS: 8,

  UNKNOWN: 0
});

const MASTER_AUTHORITY_LABEL = Object.freeze({
  CONSTITUTION: "1987 Constitution",

  STATUTE: "Primary Statute",
  NIRC: "National Internal Revenue Code",
  TAX_CODE: "Tax Code",
  CMTA: "Customs Modernization and Tariff Act",
  LGC: "Local Government Code",
  REPUBLIC_ACT: "Republic Act",
  RA: "Republic Act",

  TAX_TREATY: "Tax Treaty",
  TREATY: "Tax Treaty",

  SUPREME_COURT_EN_BANC: "Supreme Court En Banc Decision",
  SUPREME_COURT: "Supreme Court Decision",

  CTA_EN_BANC: "CTA En Banc Decision",
  CTA_DIVISION: "CTA Division Decision",
  COURT_OF_APPEALS: "Court of Appeals Decision",

  RR: "Revenue Regulations",
  REVENUE_REGULATION: "Revenue Regulations",

  RMC: "Revenue Memorandum Circular",
  RMO: "Revenue Memorandum Order",
  RAMO: "Revenue Audit Memorandum Order",

  BIR_RULING: "BIR Ruling",

  LGU: "LGU Issuance",
  BOC_ISSUANCE: "BOC Issuance",
  FIRB_ISSUANCE: "FIRB Issuance",
  PEZA_MEMO: "PEZA Issuance",
  SEC_GUIDANCE: "SEC Guidance",

  PFRS: "PFRS",
  PAS: "PAS",
  PSA: "PSA",

  OECD_GUIDANCE: "OECD Guidance",
  FOREIGN_AUTHORITY: "Foreign Persuasive Authority",

  SECONDARY: "Secondary Material",
  CPA_NOTES: "CPA Reviewer Notes",
  REVIEW_MATERIALS: "Reviewer Materials",

  UNKNOWN: "Unknown Authority"
});

const COURT_AUTHORITY_TYPES = new Set([
  "SUPREME_COURT_EN_BANC",
  "SUPREME_COURT",
  "CTA_EN_BANC",
  "CTA_DIVISION",
  "COURT_OF_APPEALS"
]);

const BIR_ISSUANCE_TYPES = new Set([
  "RR",
  "REVENUE_REGULATION",
  "RMC",
  "RMO",
  "RAMO",
  "BIR_RULING"
]);

const PRIMARY_LEGAL_TYPES = new Set([
  "CONSTITUTION",
  "STATUTE",
  "NIRC",
  "TAX_CODE",
  "CMTA",
  "LGC",
  "REPUBLIC_ACT",
  "RA",
  "TAX_TREATY",
  "TREATY"
]);

const SECONDARY_OR_REVIEW_TYPES = new Set([
  "SECONDARY",
  "CPA_NOTES",
  "REVIEW_MATERIALS",
  "OECD_GUIDANCE",
  "FOREIGN_AUTHORITY",
  "UNKNOWN"
]);

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function safeText(value = "") {
  return normalizeText(String(value || ""));
}

function normalizeAuthorityType(value = "") {
  const raw = String(value || "UNKNOWN").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    CONSTITUTION: "CONSTITUTION",

    STATUTES: "STATUTE",
    STATUTE: "STATUTE",
    LAW: "STATUTE",
    LAWS: "STATUTE",
    NIRC: "NIRC",
    TAX_CODE: "TAX_CODE",
    NATIONAL_INTERNAL_REVENUE_CODE: "NIRC",
    CMTA: "CMTA",
    CUSTOMS_MODERNIZATION_AND_TARIFF_ACT: "CMTA",
    LGC: "LGC",
    LOCAL_GOVERNMENT_CODE: "LGC",
    REPUBLIC_ACT: "REPUBLIC_ACT",
    RA: "REPUBLIC_ACT",

    TAX_TREATY: "TREATY",
    TREATY: "TREATY",

    SUPREME_COURT_EN_BANC: "SUPREME_COURT_EN_BANC",
    SUPREME_COURT: "SUPREME_COURT",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    CASE_LAW: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",

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
    BOC_ISSUANCE: "BOC_ISSUANCE",

    FIRB: "FIRB_ISSUANCE",
    FIRB_ISSUANCE: "FIRB_ISSUANCE",
    PEZA: "PEZA_MEMO",
    PEZA_MEMO: "PEZA_MEMO",
    SEC: "SEC_GUIDANCE",
    SEC_GUIDANCE: "SEC_GUIDANCE",

    PFRS: "PFRS",
    PAS: "PAS",
    PSA: "PSA",

    OECD: "OECD_GUIDANCE",
    OECD_GUIDANCE: "OECD_GUIDANCE",
    FOREIGN: "FOREIGN_AUTHORITY",
    FOREIGN_AUTHORITY: "FOREIGN_AUTHORITY",

    CPA_NOTES: "CPA_NOTES",
    REVIEW_MATERIALS: "REVIEW_MATERIALS",
    SECONDARY: "SECONDARY",

    UNKNOWN: "UNKNOWN"
  };

  return aliases[raw] || raw || "UNKNOWN";
}

function getMasterAuthorityTypeForDoc(doc = {}) {
  return normalizeAuthorityType(
    doc.authorityType ||
      doc.authority_type ||
      doc.metadata?.authorityType ||
      doc.metadata?.sourceType ||
      getAuthorityTypeForDoc(doc) ||
      "UNKNOWN"
  );
}

function getMasterAuthorityPrecedenceForDoc(doc = {}) {
  const explicit = Number(
    doc.controllingPrecedence ??
      doc.controlling_precedence ??
      doc.authorityPrecedence ??
      doc.authority_precedence ??
      doc.authorityLevel ??
      doc.authority_level ??
      doc.metadata?.controllingPrecedence ??
      doc.metadata?.authorityLevel ??
      0
  );

  if (Number.isFinite(explicit) && explicit > 0 && explicit < 99) {
    return explicit;
  }

  const type = getMasterAuthorityTypeForDoc(doc);
  return MASTER_AUTHORITY_PRECEDENCE[type] || CONTROLLING_PRECEDENCE[type] || 99;
}

function getMasterAuthorityScoreForDoc(doc = {}) {
  const type = getMasterAuthorityTypeForDoc(doc);
  return MASTER_AUTHORITY_SCORE[type] ?? AUTHORITY_SCORE[type] ?? 0;
}

function getMasterAuthorityLabelForDoc(doc = {}) {
  const type = getMasterAuthorityTypeForDoc(doc);
  return MASTER_AUTHORITY_LABEL[type] || AUTHORITY_LABEL[type] || type;
}

function getMasterAuthorityLevelForDoc(doc = {}) {
  return getMasterAuthorityPrecedenceForDoc(doc);
}

function isCourtAuthority(doc = {}) {
  return COURT_AUTHORITY_TYPES.has(getMasterAuthorityTypeForDoc(doc));
}

function isBirIssuance(doc = {}) {
  return BIR_ISSUANCE_TYPES.has(getMasterAuthorityTypeForDoc(doc));
}

function isPrimaryAuthority(doc = {}) {
  return PRIMARY_LEGAL_TYPES.has(getMasterAuthorityTypeForDoc(doc));
}

function isSecondaryOrReviewMaterial(doc = {}) {
  return SECONDARY_OR_REVIEW_TYPES.has(getMasterAuthorityTypeForDoc(doc));
}

function hasReviewMaterialPath(doc = {}) {
  const haystack = lower(
    [
      getDocPath(doc),
      getDocSource(doc),
      doc.title,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.metadata?.path,
      doc.metadata?.folder,
      doc.metadata?.documentTitle
    ]
      .filter(Boolean)
      .join(" ")
  );

  return (
    haystack.includes("07_cpa_notes") ||
    haystack.includes("08_review_materials") ||
    haystack.includes("reviewer") ||
    haystack.includes("lecture notes") ||
    haystack.includes("handout")
  );
}

function exactReferenceBonus(query = "", doc = {}) {
  const cleanQuery = lower(query);
  const ref =
    lower(getDocNormalizedReference(doc)) ||
    lower(doc.normalizedReference) ||
    lower(doc.normalized_reference) ||
    lower(doc.citation) ||
    lower(doc.reference) ||
    "";

  if (!cleanQuery || !ref) return 0;

  if (cleanQuery.includes(ref)) return 80;

  const aliases = getDocAliases(doc);
  for (const alias of aliases) {
    const normalizedAlias = lower(alias);
    if (normalizedAlias && cleanQuery.includes(normalizedAlias)) return 65;
  }

  return 0;
}

function authorityRiskPenalty(doc = {}) {
  let penalty = 0;

  if (isSecondaryOrReviewMaterial(doc)) penalty += 45;
  if (hasReviewMaterialPath(doc)) penalty += 40;

  const type = getMasterAuthorityTypeForDoc(doc);

  if (type === "UNKNOWN") penalty += 35;
  if (type === "BIR_RULING") penalty += 5;

  return penalty;
}

function buildAuthorityAuditMetadata(doc = {}, query = "") {
  const authorityType = getMasterAuthorityTypeForDoc(doc);
  const controllingPrecedence = getMasterAuthorityPrecedenceForDoc(doc);
  const authorityScore = getMasterAuthorityScoreForDoc(doc);
  const authorityLabel = getMasterAuthorityLabelForDoc(doc);

  return {
    authorityType,
    authority_type: authorityType,
    authorityLevel: controllingPrecedence,
    authority_level: controllingPrecedence,
    authorityScore,
    authority_score: authorityScore,
    authorityLabel,
    authority_label: authorityLabel,
    controllingPrecedence,
    controlling_precedence: controllingPrecedence,

    issueMatchBonus: computeIssueMatchBonus(query, doc),
    authorityPriorityBonus: computeAuthorityPriorityBonus(doc),
    exactReferenceBonus: exactReferenceBonus(query, doc),
    authorityRiskPenalty: authorityRiskPenalty(doc),

    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    birIssuanceCannotOverrideCourtDoctrine: isBirIssuance(doc),
    secondaryMaterialNeverControlling: isSecondaryOrReviewMaterial(doc)
  };
}

function rerankByHierarchy(results = [], query = "") {
  return safeArray(results)
    .map((doc) => {
      const semanticScore = Number(
        doc.rerankScore ||
          doc.finalScore ||
          doc.final_score ||
          doc.score ||
          doc.similarity ||
          0
      );

      const authorityAudit = buildAuthorityAuditMetadata(doc, query);
      const controllingPrecedence = authorityAudit.controllingPrecedence;

      const hierarchyWeight = (100 - Math.min(controllingPrecedence, 99)) * 4;
      const courtProtectionBonus = isCourtAuthority(doc) ? 35 : 0;
      const primaryAuthorityBonus = isPrimaryAuthority(doc) ? 45 : 0;

      const finalScore =
        hierarchyWeight +
        authorityAudit.authorityScore * 0.35 +
        semanticScore * 0.18 +
        authorityAudit.issueMatchBonus * 0.14 +
        authorityAudit.authorityPriorityBonus +
        authorityAudit.exactReferenceBonus +
        courtProtectionBonus +
        primaryAuthorityBonus -
        authorityAudit.authorityRiskPenalty;

      return {
        ...doc,
        ...authorityAudit,
        hierarchyWeight,
        finalScore,
        final_score: finalScore
      };
    })
    .sort((a, b) => {
      const precedenceA = Number(a.controllingPrecedence || a.controlling_precedence || 99);
      const precedenceB = Number(b.controllingPrecedence || b.controlling_precedence || 99);

      if (precedenceA !== precedenceB) return precedenceA - precedenceB;

      const aCourt = isCourtAuthority(a) ? 1 : 0;
      const bCourt = isCourtAuthority(b) ? 1 : 0;
      if (bCourt !== aCourt) return bCourt - aCourt;

      return Number(b.finalScore || 0) - Number(a.finalScore || 0);
    });
}

function selectTopLegalBases(results = [], maxItems = 3) {
  return rerankByHierarchy(results)
    .filter((doc) => {
      const type = getMasterAuthorityTypeForDoc(doc);
      return type !== "SECONDARY" && type !== "CPA_NOTES" && type !== "REVIEW_MATERIALS" && type !== "UNKNOWN";
    })
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(doc.text || doc.content || doc.excerpt || "").slice(0, 700),
      masterPromptAuthorityHierarchyApplied: true
    }));
}

function buildAuthorityHierarchyText() {
  return [
    "1. 1987 Constitution",
    "2. NIRC / CMTA / LGC / primary statutes / Republic Acts",
    "3. Tax Treaties",
    "4. Supreme Court En Banc decisions",
    "5. Supreme Court Division decisions",
    "6. CTA En Banc decisions",
    "7. CTA Division decisions",
    "8. Revenue Regulations",
    "9. RMC / RMO / RAMO",
    "10. BIR Rulings",
    "11. LGU / BOC issuances and other issue-specific administrative issuances",
    "12. PFRS / PAS / PSA when accounting or audit standards apply",
    "13. OECD / foreign persuasive authorities",
    "14. CPA reviewer notes / secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "The Constitution controls all authorities.",
    "Primary statutes, including the NIRC, CMTA, LGC, and Republic Acts, control administrative issuances.",
    "Tax treaties are applied where treaty issues are involved, subject to constitutional and statutory limits.",
    "Supreme Court decisions are controlling judicial doctrine and prevail over conflicting BIR issuances.",
    "CTA En Banc decisions are stronger than CTA Division decisions within tax controversy analysis.",
    "CTA Division decisions are persuasive or case-specific unless final and applicable under procedural doctrine.",
    "Revenue Regulations implement statutes but cannot amend, expand, or override statutes or controlling court doctrine.",
    "RMCs, RMOs, RAMOs, and BIR rulings clarify or administer the law but cannot override statutes, treaties, or court doctrine.",
    "BIR rulings generally bind only the requesting party or parties and are not binding on courts.",
    "LGU and BOC issuances apply only within their proper statutory domain.",
    "PFRS, PAS, and PSA govern accounting and audit treatment but cannot override tax statutes or court doctrine.",
    "OECD and foreign authorities are persuasive only unless adopted by Philippine law, treaty, or regulation.",
    "CPA reviewer notes and secondary materials are never controlling authority and must be hidden outside reviewer modes.",
    "If an indexed authority is not found, state exactly: Indexed source not found."
  ].join("\n");
}

function buildInterpretationRulesText() {
  return [
    "Tax impositions are strictly construed against the government.",
    "Tax exemptions are strictly construed against the taxpayer under strictissimi juris.",
    "Ambiguity on imposition favors the taxpayer.",
    "Ambiguity on exemption favors the taxing authority.",
    "BIR administrative interpretations carry persuasive or administrative weight but remain subject to judicial review.",
    "Stare decisis applies; Supreme Court doctrine controls unless overturned by the Supreme Court with compelling reason.",
    "Administrative convenience cannot override statutory text or controlling jurisprudence."
  ].join("\n");
}

function buildCrossReferenceSequenceText() {
  return [
    "Step 1 — Anchor: Identify the specific NIRC, CMTA, LGC, or primary statutory provision governing the issue.",
    "Step 2 — Implement: Identify the applicable Revenue Regulations implementing that statutory provision.",
    "Step 3 — Clarify: Check RMCs, RMOs, and RAMOs for the BIR's current administrative position and flag overreach.",
    "Step 4 — Position: Check BIR rulings for analogous fact patterns, while noting that rulings are not binding on courts.",
    "Step 5 — Override Check: Check Supreme Court and CTA decisions on the same issue.",
    "Step 6 — Conflict Map: Identify true conflicts only when the same exact issue, same legal dimension, and opposite rule or holding are present.",
    "Step 7 — Conclusion: State the legally defensible position with ranked citations and limitations."
  ].join("\n");
}

function buildStrictAnswerPrompt({
  hookMode = "ASK",
  originalQuestion = "",
  cleanQuestion = "",
  context = "",
  topLegalBases = [],
  conflict = null,
  issueClassification = null
}) {
  const legalBasesText = topLegalBases.length
    ? topLegalBases
        .map(
          (item, idx) =>
            `${idx + 1}. [${item.authorityLabel || item.authority_label || getMasterAuthorityLabelForDoc(item)}] ${item.source || getDocSource(item)}
Authority Type: ${item.authorityType || item.authority_type || getMasterAuthorityTypeForDoc(item)}
Authority Level: ${item.authorityLevel || item.authority_level || getMasterAuthorityLevelForDoc(item)}
Controlling Precedence: ${item.controllingPrecedence || item.controlling_precedence || getMasterAuthorityPrecedenceForDoc(item)}
Excerpt: ${item.excerpt || ""}`
        )
        .join("\n\n")
    : "Indexed source not found.";

  return `
You are TINA — Philippine Tax Intelligence and Analysis System.

ACTIVE MODE:
${hookMode}

MANDATORY RULES:
- Apply the Master Prompt hierarchy strictly.
- Controlling precedence always prevails over semantic similarity.
- Never elevate RMCs over statutes, BIR rulings over Supreme Court, reviewer notes over statutes, or persuasive materials over controlling authorities.
- If a BIR issuance conflicts with a Supreme Court or CTA En Banc decision on the same exact issue and legal dimension, the court decision prevails and the conflict must be flagged.
- Do not perform citation dumping.
- Do not mix unrelated cases.
- Distinguish substantive vs procedural doctrine.
- Distinguish VAT liability vs VAT refund doctrine.
- Distinguish evidentiary vs jurisdictional requirements.
- Explain controlling authority clearly.
- Disclose limitations if indexed authorities are incomplete.
- Use the issue classification and tax-domain classification to determine relevance.
- If a required authority is missing, say exactly: Indexed source not found.
- Do not invent citations, cases, statutes, RRs, RMCs, RMOs, RAMOs, or BIR rulings.
- Do not expose raw retrieval payloads, embeddings, debug metadata, or internal engine output.

AUTHORITY HIERARCHY:
${buildAuthorityHierarchyText()}

CONTROLLING PRECEDENCE:
${buildControllingPrecedenceText()}

INTERPRETATION RULES:
${buildInterpretationRulesText()}

MANDATORY CROSS-REFERENCE SEQUENCE:
${buildCrossReferenceSequenceText()}

QUESTION:
${originalQuestion}

NORMALIZED QUESTION:
${cleanQuestion}

ISSUE CLASSIFICATION:
${JSON.stringify(issueClassification || null, null, 2)}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT ANALYSIS:
${conflict?.reason || "No direct doctrinal conflict detected from indexed sources."}

INDEXED CONTEXT:
${context || "Indexed source not found."}

FINAL INSTRUCTION:
Return only the final legal analysis answer using this structure unless the tax-engine template overrides it:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES
D. SUPPORTING JURISPRUDENCE
E. DOCTRINAL STATUS / CONFLICT ANALYSIS
F. PRACTICAL NOTE / APPLICATION
`.trim();
}

function authorityEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_AUTHORITY_ENGINE",
    version: ENGINE_VERSION,
    constantsVersion: CONSTANTS_ENGINE_VERSION || null,

    esmCompatible: true,
    vectorStoreCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    conflictCompatible: true,
    rerankerCompatible: true,
    rendererCompatible: true,

    strictHierarchyEnforced: true,
    strictControllingPrecedence: true,
    masterPromptAuthorityHierarchyApplied: true,
    courtAuthorityNotSubordinatedToBIRIssuances: true,
    birIssuanceCannotOverrideCourtDoctrine: true,
    reviewerSourcesNeverControlling: true,

    taxDomainAuthorityCompatible: true,
    customsAuthorityCompatible: true,
    treatyAuthorityCompatible: true,
    oecdGuidanceCompatible: true,

    mandatoryCrossReferenceSequenceEnabled: true,
    interpretationRulesEnabled: true,

    noRetrieval: true,
    noOpenAI: true,
    noRendering: true,
    noFabricatedAuthorities: true
  };
}

export {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES,

  normalizeText,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,

  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,

  rerankByHierarchy,
  selectTopLegalBases,

  buildAuthorityHierarchyText,
  buildControllingPrecedenceText,
  buildInterpretationRulesText,
  buildCrossReferenceSequenceText,
  buildStrictAnswerPrompt,

  authorityEngineHealthCheck
};

export default {
  ENGINE_VERSION,
  AUTHORITY_LEVEL,
  AUTHORITY_SCORE,
  AUTHORITY_LABEL,
  CONTROLLING_PRECEDENCE,
  COURT_TYPES,
  BIR_TYPES,

  normalizeText,
  compactSpaces,
  lower,
  getDocPath,
  getDocSource,
  getDocNormalizedReference,
  getDocAliases,
  normalizeLegalReference,
  classifyAuthorityFromDocument,
  buildAuthorityMetadata,

  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getAuthorityScoreForDoc,
  getControllingPrecedenceForDoc,

  rerankByHierarchy,
  selectTopLegalBases,

  buildAuthorityHierarchyText,
  buildControllingPrecedenceText,
  buildInterpretationRulesText,
  buildCrossReferenceSequenceText,
  buildStrictAnswerPrompt,

  authorityEngineHealthCheck
};
