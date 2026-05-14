// FILE: provision-citation-engine.js
"use strict";

/**
 * TINA Enterprise Provision Citation Engine
 * Version: 3.0.0
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

const {
  classifyAuthorityFromDocument,
  AUTHORITY_LEVEL,
  AUTHORITY_LABEL,
  normalizeLegalReference,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} = require("./authority-engine.js");

const {
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} = require("./conflict-engine.js");

const { applySupersessionFilter } = require("./supersession-engine.js");

const ENGINE_VERSION = "3.0.0";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function looksLikeProvisionQuestion(question = "") {
  const q = lower(question);

  return (
    /\b(section|sec\.?|article|art\.?|paragraph|para\.?|clause|provision|cite|citation|legal basis|basis|authority)\b/i.test(q) ||
    /\bunder\s+(the\s+)?(nirc|tax code|rr|rmc|rmo|ramo|republic act|ra|bir ruling)\b/i.test(q) ||
    /\bg\.?\s*r\.?\s*no\.?\b/i.test(q) ||
    /\bcta\b/i.test(q) ||
    /\bwhat does\b/i.test(q)
  );
}

function extractProvisionHint(question = "") {
  const text = String(question || "");

  const sectionMatch =
    text.match(/\bsection\s+(\d+[a-zA-Z\-]*)/i) ||
    text.match(/\bsec\.?\s+(\d+[a-zA-Z\-]*)/i);

  if (sectionMatch) return `Section ${sectionMatch[1]}`;

  const articleMatch =
    text.match(/\barticle\s+([A-Za-z0-9\-]+)/i) ||
    text.match(/\bart\.?\s+([A-Za-z0-9\-]+)/i);

  if (articleMatch) return `Article ${articleMatch[1]}`;

  const paragraphMatch =
    text.match(/\bparagraph\s+([A-Za-z0-9().\-]+)/i) ||
    text.match(/\bpara\.?\s+([A-Za-z0-9().\-]+)/i);

  if (paragraphMatch) return `Paragraph ${paragraphMatch[1]}`;

  return "";
}

function buildSourceSnippet(doc = {}, maxLen = 1800) {
  return normalizeText(doc.text || doc.content || doc.excerpt || doc.preview || "").slice(0, maxLen);
}

function getAuthorityType(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc?.(doc) ||
    classifyAuthorityFromDocument({
      fileName: doc.source || doc.originalSource || doc.title || "",
      path: doc.path || doc.source_path || doc.metadata?.path || "",
      text: doc.text || doc.content || doc.excerpt || ""
    }) ||
    "UNKNOWN"
  );
}

function getAuthorityLevel(doc = {}) {
  return (
    Number(
      doc.authorityLevel ??
        doc.authority_level ??
        doc.metadata?.authorityLevel ??
        getAuthorityLevelForDoc?.(doc)
    ) ||
    AUTHORITY_LEVEL[getAuthorityType(doc)] ||
    99
  );
}

function getControllingPrecedence(doc = {}) {
  return (
    Number(
      doc.controllingPrecedence ??
        doc.controlling_precedence ??
        doc.metadata?.controllingPrecedence ??
        getControllingPrecedenceForDoc?.(doc)
    ) || 99
  );
}

function getSourceTitle(doc = {}) {
  return (
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.title ||
    "Unknown Source"
  );
}

function getSourcePath(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.metadata?.fileName ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    getSourceTitle(doc) ||
    "Unknown Path"
  );
}

function isCourtAuthority(type = "") {
  return ["SUPREME_COURT", "CTA_EN_BANC", "COURT_OF_APPEALS", "CTA_DIVISION"].includes(
    String(type || "").toUpperCase()
  );
}

function isBIRAuthority(type = "") {
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(String(type || "").toUpperCase());
}

function isPrimaryOrControllingAuthority(type = "") {
  return [
    "CONSTITUTION",
    "STATUTE",
    "RR",
    "RMC",
    "RMO",
    "RAMO",
    "BIR_RULING",
    "SUPREME_COURT",
    "CTA_EN_BANC",
    "COURT_OF_APPEALS",
    "CTA_DIVISION"
  ].includes(String(type || "").toUpperCase());
}

function detectIssueSignals(text = "") {
  const q = lower(text);
  const issues = [];

  const push = (condition, value) => {
    if (condition) issues.push(value);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|unutilized input vat)\b/i.test(q), "VAT_REFUND");
  push(/\b(vat liability|output vat|subject to vat|vatable|gross receipts|sale of goods|sale of services)\b/i.test(q), "VAT_LIABILITY");
  push(/\b(invoice|receipt|substantiation|documentary|proof|evidence|records)\b/i.test(q), "EVIDENTIARY");
  push(/\b(filing|deadline|protest|appeal|assessment|loa|pan|fan|prescription)\b/i.test(q), "PROCEDURAL");
  push(/\b(withholding|ewt|cwt|fwt)\b/i.test(q), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|gross income)\b/i.test(q), "INCOME_TAX");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(q), "CONTRACT");
  push(/\b(principal|agent|pass-through|reimbursement|bundled|economic substance)\b/i.test(q), "TRANSACTION");

  return [...new Set(issues)];
}

function hasIssueMismatch(question = "", doc = {}) {
  const queryIssues = detectIssueSignals(question);
  const docIssues = detectIssueSignals(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.source,
      doc.originalSource,
      doc.path,
      doc.metadata?.path
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (
    queryIssues.includes("VAT_LIABILITY") &&
    docIssues.includes("VAT_REFUND") &&
    !queryIssues.includes("VAT_REFUND")
  ) {
    return true;
  }

  if (
    queryIssues.includes("VAT_REFUND") &&
    docIssues.includes("VAT_LIABILITY") &&
    !queryIssues.includes("VAT_LIABILITY")
  ) {
    return true;
  }

  return false;
}

function buildProvisionMatchBonus(question = "", doc = {}) {
  const hint = extractProvisionHint(question);

  const rawText = lower(
    [
      doc.text,
      doc.content,
      doc.excerpt,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.normalizedReference,
      doc.normalizedReference,
      doc.normalized_reference,
      ...(safeArray(doc.normalizedAliases)),
      ...(safeArray(doc.normalized_aliases)),
      ...(safeArray(doc.metadata?.normalizedAliases))
    ]
      .filter(Boolean)
      .join(" ")
  );

  let bonus = 0;

  if (hint && rawText.includes(lower(hint))) bonus += 60;

  const citationIntent = normalizeLegalReference(question);

  if (citationIntent?.normalized) {
    const normalizedNeedle = lower(citationIntent.normalized);

    if (rawText.includes(normalizedNeedle)) bonus += 90;

    const aliasHit = safeArray(citationIntent.aliases).some((alias) =>
      rawText.includes(lower(alias))
    );

    if (aliasHit) bonus += 45;
  }

  if (/\b(section|sec\.?|article|art\.?|paragraph|clause)\b/i.test(question)) bonus += 10;

  return bonus;
}

function uniqueDocs(docs = []) {
  const seen = new Set();
  const output = [];

  for (const doc of docs || []) {
    const key =
      doc.id ||
      doc.normalizedReference ||
      doc.normalized_reference ||
      doc.metadata?.normalizedReference ||
      getSourcePath(doc) ||
      getSourceTitle(doc);

    if (!key || seen.has(key)) continue;

    seen.add(key);
    output.push(doc);
  }

  return output;
}

function rankProvisionDocs(results = [], question = "", options = {}) {
  const { suppressIssueMismatch = true } = options;

  const supersessionResult = applySupersessionFilter(results || []);
  const activeDocs =
    supersessionResult?.activeDocs?.length > 0 ? supersessionResult.activeDocs : results || [];

  return uniqueDocs(activeDocs)
    .filter((doc) => {
      if (!suppressIssueMismatch) return true;
      return !hasIssueMismatch(question, doc);
    })
    .sort((a, b) => {
      const aLevel = getAuthorityLevel(a);
      const bLevel = getAuthorityLevel(b);

      const aPrecedence = getControllingPrecedence(a);
      const bPrecedence = getControllingPrecedence(b);

      const aScore = Number(a.finalScore ?? a.final_score ?? a.retrievalScore ?? a.score ?? 0);
      const bScore = Number(b.finalScore ?? b.final_score ?? b.retrievalScore ?? b.score ?? 0);

      const aType = getAuthorityType(a);
      const bType = getAuthorityType(b);

      const aBonus = buildProvisionMatchBonus(question, a);
      const bBonus = buildProvisionMatchBonus(question, b);

      const aPrimaryBonus = isPrimaryOrControllingAuthority(aType) ? 20 : 0;
      const bPrimaryBonus = isPrimaryOrControllingAuthority(bType) ? 20 : 0;

      const aComposite = aScore + aBonus + aPrimaryBonus;
      const bComposite = bScore + bBonus + bPrimaryBonus;

      const override = isGenuineConflict(a, b) ? resolveCourtOverride(a, b) : null;

      if (override?.overrideApplies) {
        if (override.winningSource === a) return -1;
        if (override.winningSource === b) return 1;
      }

      const courtVsBirA = isCourtAuthority(aType) && isBIRAuthority(bType);
      const courtVsBirB = isCourtAuthority(bType) && isBIRAuthority(aType);

      if (courtVsBirA && aComposite >= bComposite * 0.7) return -1;
      if (courtVsBirB && bComposite >= aComposite * 0.7) return 1;

      if (bBonus !== aBonus) return bBonus - aBonus;
      if (aLevel !== bLevel) return aLevel - bLevel;
      if (aPrecedence !== bPrecedence) return aPrecedence - bPrecedence;

      return bComposite - aComposite;
    });
}

function buildContextBlock(docs = []) {
  return docs
    .map((doc, index) => {
      const authorityType = getAuthorityType(doc);
      const authorityLevel = getAuthorityLevel(doc);
      const authorityLabel = AUTHORITY_LABEL[authorityType] || authorityType;

      return [
        `SOURCE ${index + 1}`,
        `Title: ${getSourceTitle(doc)}`,
        `Path: ${getSourcePath(doc)}`,
        `Authority Type: ${authorityType}`,
        `Authority Label: ${authorityLabel}`,
        `Authority Level: ${authorityLevel}`,
        `Controlling Precedence: ${getControllingPrecedence(doc)}`,
        "Excerpt:",
        buildSourceSnippet(doc) || "[No excerpt available]"
      ].join("\n");
    })
    .join("\n\n--------------------\n\n");
}

function buildConflictContext(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      try {
        const analysis = analyzeConflictPair(docs[i], docs[j]);

        if (analysis?.conflict || analysis?.apparentConflict) {
          conflicts.push(analysis);
        }
      } catch (error) {
        conflicts.push({
          conflict: false,
          apparentConflict: false,
          error: error.message
        });
      }
    }
  }

  if (!conflicts.length) {
    return "No direct doctrinal or hierarchy conflict detected from the retrieved provision sources.";
  }

  return conflicts
    .slice(0, 3)
    .map((item, index) =>
      [
        `CONFLICT REVIEW ${index + 1}`,
        `Conflict Type: ${item.conflictType || "N/A"}`,
        `Doctrinal Conflict: ${item.doctrinalConflict ? "YES" : "NO"}`,
        `Hierarchy Conflict: ${item.hierarchyConflict ? "YES" : "NO"}`,
        `Apparent Conflict Only: ${item.apparentConflict ? "YES" : "NO"}`,
        `Source A: ${item.sourceA || "N/A"}`,
        `Source B: ${item.sourceB || "N/A"}`,
        `Exact Issue: ${item.exactIssue || "Not determined"}`,
        `Distinction Type: ${item.distinctionType || "Not determined"}`,
        `Resolution Basis: ${item.resolutionBasis || item.reason || "Not determined"}`
      ].join("\n")
    )
    .join("\n\n");
}

function hasSubstantiveTaxQuestion(question = "") {
  return /\b(what is|define|meaning|taxability|taxable|exempt|liable|subject to|vat|income tax|withholding|deductible|expense|revenue|sales|cost|basis|why|how|proper treatment|accounting|bir risk|audit risk|consequence|apply)\b/i.test(
    lower(question)
  );
}

function isCitationOnlyQuestion(question = "") {
  const q = lower(question);

  const citationOnlySignals =
    /\b(cite|citation|source|legal basis|section|sec\.|article|provision)\b/i.test(q);

  const analyticalSignals =
    /\b(why|explain|analyze|apply|taxability|proper|risk|consequence|treatment|conflict|define|meaning|what is|how)\b/i.test(q);

  return citationOnlySignals && !analyticalSignals;
}

function buildPromptModeInstruction(question = "") {
  if (isCitationOnlyQuestion(question)) {
    return [
      "The user appears to be asking for a citation or provision.",
      "Do not give citation-only output.",
      "Provide the exact citation if visible, then explain the rule, legal effect, hierarchy, doctrinal status, and practical application in concise form."
    ].join("\n");
  }

  if (hasSubstantiveTaxQuestion(question)) {
    return [
      "The user is asking a substantive tax/legal question.",
      "Do not merely list provisions.",
      "Use the provision as controlling basis, then provide legal analysis, doctrine, hierarchy, and practical application."
    ].join("\n");
  }

  return [
    "Provide a conservative provision-based legal answer.",
    "Do not invent provisions or cite irrelevant sources.",
    "Explain the legal relevance of each cited source."
  ].join("\n");
}

function buildSourcesUsed(topDocs = []) {
  return topDocs.map((doc) => ({
    title: getSourceTitle(doc),
    source: getSourcePath(doc),
    authorityType: getAuthorityType(doc),
    authorityLevel: getAuthorityLevel(doc),
    excerpt: buildSourceSnippet(doc, 500)
  }));
}

export async function maybeGenerateProvisionCitationAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  responseMode = "TECHNICAL",
  adaptiveContext = {}
}) {
  try {
    if (!looksLikeProvisionQuestion(question)) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION
      };
    }

    const ranked = rankProvisionDocs(retrievedResults || [], question);
    const topDocs = ranked.slice(0, 6);

    if (!topDocs.length) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION
      };
    }

    const provisionHint = extractProvisionHint(question);
    const contextBlock = buildContextBlock(topDocs);
    const conflictContext = buildConflictContext(topDocs);
    const modeInstruction = buildPromptModeInstruction(question);

    const systemPrompt = `
You are TINA's Provision Citation Engine.

Your job is not merely to retrieve citations.
Your job is to give a legally coherent Philippine tax answer anchored on the retrieved provision, issuance, or case authority.

ACTIVE RESPONSE MODE:
${responseMode}

CORE RULE:
Never output a citation-only answer.
Every citation must be legally explained.
You must synthesize, reconcile, and apply the authority to the user's question.

AUTHORITY ORGANIZATION HIERARCHY:
1. Constitution
2. NIRC / Tax Code / Republic Act
3. Revenue Regulations
4. Revenue Memorandum Circulars
5. Revenue Memorandum Orders
6. Revenue Audit Memorandum Orders
7. BIR Rulings
8. Supreme Court decisions
9. CTA En Banc / CTA Division / Court of Appeals decisions
10. Secondary materials

CONFLICT RESOLUTION RULE:
- Constitution and statutes control administrative issuances.
- Revenue Regulations implement statutes but cannot amend them.
- RMCs, RMOs, RAMOs, and BIR rulings are administrative or interpretative and cannot override the NIRC, RR, or controlling court doctrine.
- If a court decision genuinely conflicts with a BIR issuance, controlling judicial doctrine prevails.
- Do not fabricate conflict.
- Different procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, transaction, or administrative rules are not direct doctrinal conflicts unless they contradict on the same legal issue.

MANDATORY OUTPUT FORMAT:
A. DIRECT ANSWER
B. CONTROLLING LEGAL BASIS
C. SUPPORTING JURISPRUDENCE
D. DOCTRINAL STATUS / CONFLICT ANALYSIS
E. HIERARCHY ANALYSIS
F. PRACTICAL APPLICATION

STRICT RULES:
- Be conservative.
- Do not hallucinate section numbers, case numbers, dates, rates, thresholds, or issuance numbers.
- Never cite a source for a point it does not actually cover.
- Do not use generic legal summaries.
- Do not append raw sources. The app will show clickable sources separately.
- If evidence or retrieved text is incomplete, state the limitation.
`.trim();

    const userPrompt = `
User Question:
${question}

Provision Hint:
${provisionHint || "None detected"}

Question Handling Instruction:
${modeInstruction}

Adaptive Context:
${JSON.stringify(adaptiveContext || {}, null, 2).slice(0, 3000)}

Retrieved Legal Sources:
${contextBlock}

Conflict Review:
${conflictContext}
`.trim();

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const answer = completion?.choices?.[0]?.message?.content?.trim() || "";

    if (!answer) {
      return {
        handled: false,
        engineVersion: ENGINE_VERSION
      };
    }

    return {
      handled: true,
      answer,
      topDocs,
      sourcesUsed: buildSourcesUsed(topDocs),
      responseMode,
      adaptiveContext,
      engineVersion: ENGINE_VERSION,
      provisionCitationMetadata: {
        provisionHint,
        rankedCount: ranked.length,
        topDocCount: topDocs.length,
        hierarchyAware: true,
        conflictAware: true,
        supersessionAware: true,
        rendererCompatible: true,
        plannerCompatible: true
      }
    };
  } catch (error) {
    console.error("maybeGenerateProvisionCitationAnswer error:", error.message);

    return {
      handled: false,
      error: error.message,
      engineVersion: ENGINE_VERSION
    };
  }
}

export function provisionCitationHealthCheck() {
  return {
    ok: true,
    engine: "TINA_PROVISION_CITATION_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsBridgeCompatible: true,
    authorityEngineCompatible: true,
    conflictEngineCompatible: true,
    supersessionCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true
  };
}

export default {
  maybeGenerateProvisionCitationAnswer,
  provisionCitationHealthCheck
};
