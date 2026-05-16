// FILE: authority-engine.js
"use strict";

/**
 * TINA AUTHORITY ENGINE
 * Version: 3.1.0
 */

import {
  ENGINE_VERSION,
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function rerankByHierarchy(results = [], query = "") {
  return safeArray(results)
    .map((doc) => {
      const authorityType = getAuthorityTypeForDoc(doc);
      const semanticScore = Number(
        doc.rerankScore ||
          doc.finalScore ||
          doc.final_score ||
          doc.score ||
          doc.similarity ||
          0
      );

      const authorityScore = getAuthorityScoreForDoc(doc);
      const issueMatchBonus = computeIssueMatchBonus(query, doc);
      const authorityPriorityBonus = computeAuthorityPriorityBonus(doc);
      const controllingPrecedence = getControllingPrecedenceForDoc(doc);
      const authorityLevel = getAuthorityLevelForDoc(doc);

      const hierarchyWeight = (100 - Math.min(controllingPrecedence, 99)) * 4;

      const finalScore =
        hierarchyWeight +
        authorityScore * 0.3 +
        semanticScore * 0.18 +
        issueMatchBonus * 0.14 +
        authorityPriorityBonus;

      return {
        ...doc,
        authorityType,
        authority_type: authorityType,
        authorityLevel,
        authority_level: authorityLevel,
        authorityScore,
        authority_score: authorityScore,
        authorityLabel: AUTHORITY_LABEL[authorityType] || authorityType,
        authority_label: AUTHORITY_LABEL[authorityType] || authorityType,
        controllingPrecedence,
        controlling_precedence: controllingPrecedence,
        issueMatchBonus,
        authorityPriorityBonus,
        hierarchyWeight,
        finalScore,
        final_score: finalScore
      };
    })
    .sort((a, b) => {
      const precedenceA = Number(a.controllingPrecedence || a.controlling_precedence || 99);
      const precedenceB = Number(b.controllingPrecedence || b.controlling_precedence || 99);

      if (precedenceA !== precedenceB) return precedenceA - precedenceB;

      return Number(b.finalScore || 0) - Number(a.finalScore || 0);
    });
}

function selectTopLegalBases(results = [], maxItems = 3) {
  return rerankByHierarchy(results)
    .filter((doc) => {
      const type = getAuthorityTypeForDoc(doc);
      return type !== "SECONDARY" && type !== "UNKNOWN";
    })
    .slice(0, maxItems)
    .map((doc) => ({
      ...doc,
      source: getDocPath(doc) || getDocSource(doc),
      excerpt: normalizeText(doc.text || doc.content || doc.excerpt || "").slice(0, 700)
    }));
}

function buildAuthorityHierarchyText() {
  return [
    "1. Constitution",
    "2. NIRC / Republic Acts / Statutes",
    "3. Supreme Court Decisions",
    "4. Revenue Regulations",
    "5. Tax Treaties",
    "6. RMC / RMO / RAMO",
    "7. BIR Rulings",
    "8. CTA / Court of Appeals",
    "9. LGU / BOC Issuances / PFRS / PAS / PSA, depending on the issue",
    "10. OECD / secondary materials"
  ].join("\n");
}

function buildControllingPrecedenceText() {
  return [
    "Constitution controls all.",
    "Statutes control administrative issuances.",
    "Supreme Court doctrine controls conflicting administrative interpretations.",
    "Revenue Regulations implement statutes but cannot amend statutes.",
    "Administrative issuances cannot override statutes or Supreme Court doctrine.",
    "Tax treaties may control treaty-based cross-border tax issues, subject to statutory and constitutional limits.",
    "CTA and Court of Appeals decisions may be persuasive but are not controlling over Supreme Court doctrine.",
    "PFRS/PAS/PSA govern accounting and auditing standards but cannot override tax statutes.",
    "BOC issuances apply to customs/tariff issues but do not override statutes or Supreme Court doctrine.",
    "OECD materials are persuasive only unless adopted by Philippine law or regulation.",
    "Secondary materials are never controlling authority."
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
            `${idx + 1}. [${item.authorityLabel}] ${item.source || getDocSource(item)}
Authority Type: ${item.authorityType}
Authority Level: ${item.authorityLevel}
Controlling Precedence: ${item.controllingPrecedence || item.controlling_precedence || 99}
Excerpt: ${item.excerpt || ""}`
        )
        .join("\n\n")
    : "No controlling legal basis retrieved.";

  return `
You are TINA — Philippine Tax Intelligence and Analysis System.

ACTIVE MODE:
${hookMode}

MANDATORY RULES:
- Apply Philippine legal hierarchy strictly.
- Controlling precedence ALWAYS prevails over semantic similarity.
- Do not perform citation dumping.
- Do not mix unrelated cases.
- Distinguish substantive vs procedural doctrine.
- Distinguish VAT liability vs VAT refund doctrine.
- Distinguish evidentiary vs jurisdictional requirements.
- Explain controlling authority clearly.
- Disclose limitations if authorities are incomplete.
- Use the issue classification and tax-domain classification to determine relevance.
- If a conflict exists, explain:
  - exact issue,
  - exact legal dimension,
  - controlling authority,
  - why it controls.

AUTHORITY HIERARCHY:
${buildAuthorityHierarchyText()}

CONTROLLING PRECEDENCE:
${buildControllingPrecedenceText()}

QUESTION:
${originalQuestion}

NORMALIZED QUESTION:
${cleanQuestion}

ISSUE CLASSIFICATION:
${JSON.stringify(issueClassification || null, null, 2)}

TOP LEGAL BASES:
${legalBasesText}

CONFLICT ANALYSIS:
${conflict?.reason || "No direct doctrinal conflict detected."}

INDEXED CONTEXT:
${context}

FINAL INSTRUCTION:
Return only the final legal analysis answer.
`.trim();
}

function authorityEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_AUTHORITY_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    vectorStoreCompatible: true,
    adaptiveCompatible: true,
    plannerCompatible: true,
    conflictCompatible: true,
    rerankerCompatible: true,
    rendererCompatible: true,
    strictHierarchyEnforced: true,
    strictControllingPrecedence: true,
    taxDomainAuthorityCompatible: true,
    customsAuthorityCompatible: true,
    treatyAuthorityCompatible: true,
    oecdGuidanceCompatible: true
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
  buildStrictAnswerPrompt,
  authorityEngineHealthCheck
};
