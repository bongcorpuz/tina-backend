// FILE: provision-citation-engine.js

import {
  classifyAuthorityFromDocument,
  AUTHORITY_LEVEL,
  AUTHORITY_LABEL,
  normalizeLegalReference
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair
} from "./conflict-engine.js";

import { applySupersessionFilter } from "./supersession-engine.js";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function looksLikeProvisionQuestion(question = "") {
  const q = lower(question);

  return (
    q.includes("section ") ||
    q.includes("sec. ") ||
    q.includes("sec ") ||
    q.includes("article ") ||
    q.includes("art. ") ||
    q.includes("art ") ||
    q.includes("provision") ||
    q.includes("paragraph") ||
    q.includes("clause") ||
    q.includes("what does") ||
    q.includes("per nirc") ||
    q.includes("under the nirc") ||
    q.includes("under rr") ||
    q.includes("under rmc") ||
    q.includes("under rmo") ||
    q.includes("under ramo") ||
    q.includes("gr no") ||
    q.includes("g.r. no") ||
    q.includes("cta") ||
    q.includes("cite") ||
    q.includes("citation") ||
    q.includes("legal basis") ||
    q.includes("basis") ||
    q.includes("authority")
  );
}

function extractProvisionHint(question = "") {
  const text = String(question || "");

  const sectionMatch =
    text.match(/\bsection\s+(\d+[a-zA-Z\-]*)/i) ||
    text.match(/\bsec\.?\s+(\d+[a-zA-Z\-]*)/i);

  if (sectionMatch) {
    return `Section ${sectionMatch[1]}`;
  }

  const articleMatch =
    text.match(/\barticle\s+([A-Za-z0-9\-]+)/i) ||
    text.match(/\bart\.?\s+([A-Za-z0-9\-]+)/i);

  if (articleMatch) {
    return `Article ${articleMatch[1]}`;
  }

  const paragraphMatch =
    text.match(/\bparagraph\s+([A-Za-z0-9().\-]+)/i) ||
    text.match(/\bpara\.?\s+([A-Za-z0-9().\-]+)/i);

  if (paragraphMatch) {
    return `Paragraph ${paragraphMatch[1]}`;
  }

  return "";
}

function buildSourceSnippet(doc = {}, maxLen = 1800) {
  const text = normalizeText(doc.text || doc.content || "");
  if (!text) return "";
  return text.slice(0, maxLen);
}

function getAuthorityType(doc = {}) {
  const explicit =
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    "";

  if (explicit) {
    return String(explicit).toUpperCase();
  }

  return classifyAuthorityFromDocument({
    fileName: doc.source || doc.originalSource || "",
    path: doc.path || doc.source_path || doc.metadata?.path || "",
    text: doc.text || doc.content || ""
  });
}

function getAuthorityLevel(doc = {}) {
  const explicit =
    doc.authorityLevel ??
    doc.authority_level ??
    doc.metadata?.authorityLevel ??
    null;

  if (Number.isFinite(Number(explicit))) {
    return Number(explicit);
  }

  const authorityType = getAuthorityType(doc);
  return AUTHORITY_LEVEL[authorityType] || 99;
}

function getSourceTitle(doc = {}) {
  return (
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    doc.metadata?.originalSource ||
    doc.metadata?.originalFileName ||
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
  return ["RR", "RMC", "RMO", "RAMO", "BIR_RULING"].includes(
    String(type || "").toUpperCase()
  );
}

function isPrimaryOrControllingAuthority(type = "") {
  const value = String(type || "").toUpperCase();
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
  ].includes(value);
}

function buildProvisionMatchBonus(question = "", doc = {}) {
  const hint = extractProvisionHint(question);
  const rawText = normalizeText(
    [
      doc.text,
      doc.content,
      doc.source,
      doc.originalSource,
      doc.path,
      doc.source_path,
      doc.metadata?.path
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();

  let bonus = 0;

  if (hint && rawText.includes(hint.toLowerCase())) {
    bonus += 40;
  }

  const citationIntent = normalizeLegalReference(question);

  if (citationIntent?.normalized) {
    const normalizedHaystack = normalizeText(
      [
        doc.source,
        doc.originalSource,
        doc.path,
        doc.source_path,
        doc.metadata?.path,
        doc.metadata?.normalizedReference,
        doc.normalizedReference,
        doc.normalized_reference
      ]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();

    if (normalizedHaystack.includes(String(citationIntent.normalized).toLowerCase())) {
      bonus += 60;
    }

    const aliasHit = (citationIntent.aliases || []).some((alias) =>
      normalizedHaystack.includes(String(alias).toLowerCase())
    );

    if (aliasHit) {
      bonus += 35;
    }
  }

  return bonus;
}

function rankProvisionDocs(results = [], question = "") {
  const supersessionResult = applySupersessionFilter(results || []);
  const activeDocs =
    supersessionResult?.activeDocs?.length > 0
      ? supersessionResult.activeDocs
      : results || [];

  return [...activeDocs].sort((a, b) => {
    const aLevel = getAuthorityLevel(a);
    const bLevel = getAuthorityLevel(b);

    const aScore = Number(a.finalScore ?? a.combined_score ?? a.score ?? 0);
    const bScore = Number(b.finalScore ?? b.combined_score ?? b.score ?? 0);

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

    if (aBonus !== bBonus) return bBonus - aBonus;
    if (aLevel !== bLevel) return aLevel - bLevel;

    return bComposite - aComposite;
  });
}

function buildContextBlock(docs = []) {
  return docs
    .map((doc, index) => {
      const source = getSourceTitle(doc);
      const path = getSourcePath(doc);
      const authorityType = getAuthorityType(doc);
      const authorityLevel = getAuthorityLevel(doc);
      const authorityLabel = AUTHORITY_LABEL[authorityType] || authorityType;
      const snippet = buildSourceSnippet(doc);

      return [
        `SOURCE ${index + 1}`,
        `Title: ${source}`,
        `Path: ${path}`,
        `Authority Type: ${authorityType}`,
        `Authority Label: ${authorityLabel}`,
        `Authority Level: ${authorityLevel}`,
        `Excerpt:`,
        snippet || "[No excerpt available]"
      ].join("\n");
    })
    .join("\n\n--------------------\n\n");
}

function buildConflictContext(docs = []) {
  const conflicts = [];

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const analysis = analyzeConflictPair(docs[i], docs[j]);

      if (analysis?.conflict || analysis?.apparentConflict) {
        conflicts.push(analysis);
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
        `Source A: ${item.sourceA}`,
        `Source B: ${item.sourceB}`,
        `Exact Issue: ${item.exactIssue || "Not determined"}`,
        `Distinction Type: ${item.distinctionType || "Not determined"}`,
        `Resolution Basis: ${item.resolutionBasis || item.reason || "Not determined"}`
      ].join("\n")
    )
    .join("\n\n");
}

function hasSubstantiveTaxQuestion(question = "") {
  const q = lower(question);

  return /\b(what is|define|meaning|taxability|taxable|exempt|liable|subject to|vat|income tax|withholding|deductible|expense|revenue|sales|cost|basis|why|how|proper treatment|accounting|bir risk|audit risk|consequence|apply)\b/i.test(
    q
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
      "Even so, do not give citation-only output.",
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

export async function maybeGenerateProvisionCitationAnswer({
  openai,
  question = "",
  retrievedResults = [],
  model = "gpt-4o-mini"
}) {
  try {
    if (!looksLikeProvisionQuestion(question)) {
      return { handled: false };
    }

    const ranked = rankProvisionDocs(retrievedResults || [], question);
    const topDocs = ranked.slice(0, 6);

    if (!topDocs.length) {
      return { handled: false };
    }

    const provisionHint = extractProvisionHint(question);
    const contextBlock = buildContextBlock(topDocs);
    const conflictContext = buildConflictContext(topDocs);
    const modeInstruction = buildPromptModeInstruction(question);

    const systemPrompt = `
You are TINA's Provision Citation Engine.

Your job is not merely to retrieve citations.
Your job is to give a legally coherent Philippine tax answer anchored on the retrieved provision, issuance, or case authority.

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
- Do not fabricate conflict. Different procedural, evidentiary, jurisdictional, factual, temporal, or administrative rules are not direct doctrinal conflicts unless they contradict on the same legal issue.

MANDATORY OUTPUT FORMAT:
A. DIRECT ANSWER
- Answer the exact question immediately.
- If the question asks for a provision, identify the provision and state what it legally means.
- Do not merely list citations.

B. CONTROLLING LEGAL BASIS
- Identify the specific provision, issuance, or case visible in the retrieved context.
- Explain whether each authority is mandatory, procedural, interpretative, administrative, or jurisprudential.
- Explain why it governs the question.
- If no exact provision is visible, state: "Exact provision not fully visible in retrieved text."

C. SUPPORTING JURISPRUDENCE
- Cite only cases directly relevant to the same legal issue.
- For each case, state the legal issue, doctrine, and applicability.
- If no directly relevant case is retrieved, say so. Do not invent or add unrelated jurisprudence.

D. DOCTRINAL STATUS / CONFLICT ANALYSIS
- State whether no doctrinal conflict, apparent conflict only, partial conflict, or direct conflict exists.
- If conflict exists, explain exact legal issue, controlling doctrine, why it prevails, and whether the distinction is substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative.
- Never output only "Conflict detected: YES."

E. HIERARCHY ANALYSIS
- Apply the Philippine hierarchy expressly.
- Explain which authority controls if there is tension.
- Lower administrative issuances cannot override statutes or controlling court doctrine.

F. PRACTICAL APPLICATION
- Apply the rule to the user's facts or question.
- State tax consequence, compliance implication, audit risk, litigation exposure, documentation requirements, possible BIR position, and strongest taxpayer defense where applicable.

STRICT RULES:
- Be conservative.
- Do not hallucinate section numbers, case numbers, dates, rates, thresholds, or issuance numbers.
- Never cite a source for a point it does not actually cover.
- Do not use generic legal summaries.
- Do not append raw sources. The app will show clickable sources separately.
`.trim();

    const userPrompt = `
User Question:
${question}

Provision Hint:
${provisionHint || "None detected"}

Question Handling Instruction:
${modeInstruction}

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
      return { handled: false };
    }

    return {
      handled: true,
      answer,
      topDocs
    };
  } catch (error) {
    console.error("maybeGenerateProvisionCitationAnswer error:", error.message);
    return { handled: false };
  }
}

export default {
  maybeGenerateProvisionCitationAnswer
};
