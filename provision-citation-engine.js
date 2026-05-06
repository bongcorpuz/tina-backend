// FILE: provision-citation-engine.js

import { classifyAuthorityFromDocument, AUTHORITY_LEVEL } from "./authority-engine.js";
import { normalizeLegalReference } from "./authority-engine.js";

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
    q.includes("citation")
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

  return "";
}

function buildSourceSnippet(doc = {}, maxLen = 1400) {
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
        doc.metadata?.normalizedReference
      ]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();

    if (normalizedHaystack.includes(String(citationIntent.normalized).toLowerCase())) {
      bonus += 60;
    }
  }

  return bonus;
}

function rankProvisionDocs(results = [], question = "") {
  return [...results].sort((a, b) => {
    const aLevel = getAuthorityLevel(a);
    const bLevel = getAuthorityLevel(b);

    const aScore = Number(a.finalScore ?? a.combined_score ?? a.score ?? 0);
    const bScore = Number(b.finalScore ?? b.combined_score ?? b.score ?? 0);

    const aType = getAuthorityType(a);
    const bType = getAuthorityType(b);

    const aBonus = buildProvisionMatchBonus(question, a);
    const bBonus = buildProvisionMatchBonus(question, b);

    const aComposite = aScore + aBonus;
    const bComposite = bScore + bBonus;

    const courtVsBirA = isCourtAuthority(aType) && isBIRAuthority(bType);
    const courtVsBirB = isCourtAuthority(bType) && isBIRAuthority(aType);

    if (courtVsBirA && aComposite >= bComposite * 0.7) {
      return -1;
    }

    if (courtVsBirB && bComposite >= aComposite * 0.7) {
      return 1;
    }

    if (aLevel !== bLevel) return aLevel - bLevel;
    return bComposite - aComposite;
  });
}

function buildContextBlock(docs = []) {
  return docs
    .map((doc, index) => {
      const source =
        doc.source ||
        doc.originalSource ||
        doc.metadata?.originalSource ||
        "Unknown Source";

      const path =
        doc.path ||
        doc.source_path ||
        doc.metadata?.path ||
        doc.metadata?.fileName ||
        "Unknown Path";

      const authorityType = getAuthorityType(doc);
      const authorityLevel = getAuthorityLevel(doc);
      const snippet = buildSourceSnippet(doc);

      return [
        `SOURCE ${index + 1}`,
        `Title: ${source}`,
        `Path: ${path}`,
        `Authority Type: ${authorityType}`,
        `Authority Level: ${authorityLevel}`,
        `Excerpt:`,
        snippet || "[No excerpt available]"
      ].join("\n");
    })
    .join("\n\n--------------------\n\n");
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
    const topDocs = ranked.slice(0, 5);

    if (!topDocs.length) {
      return { handled: false };
    }

    const provisionHint = extractProvisionHint(question);
    const contextBlock = buildContextBlock(topDocs);

    const systemPrompt = `
You are TINA's Provision Citation Engine.

Your job:
1. Determine whether the user's question is asking for a legal provision, statutory citation, issuance citation, or case-doctrine citation.
2. Answer ONLY from the retrieved sources provided.
3. Follow this authority order:
   Constitution > Statute / NIRC / Republic Act > Treaty > Supreme Court > CTA En Banc > Court of Appeals > CTA Division > RR > RMC > RMO > RAMO > BIR Ruling > LGU > Secondary.
4. If a court decision conflicts with a BIR issuance, the court decision prevails.
5. If a specific section/article/provision is identifiable, cite it clearly.
6. If no exact provision is visible in the excerpts, do not invent one.
7. If exact citation is uncertain, say: "Exact provision not fully visible in retrieved text."

Use exactly this structure:
1. DIRECT ANSWER
2. LEGAL BASIS
3. SUPPORTING RULES
4. PROFESSIONAL INSIGHT
5. CONFLICT FLAG
6. SOURCES

Strict rules:
- Be conservative.
- Do not hallucinate section numbers, case numbers, dates, or issuance numbers.
- Never cite a source for a point it does not actually cover.
- Do not use vague conflict language.
- If a conflict exists, identify the higher authority that controls.
`.trim();

    const userPrompt = `
User Question:
${question}

Provision Hint:
${provisionHint || "None detected"}

Retrieved Legal Sources:
${contextBlock}
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
      answer
    };
  } catch (error) {
    console.error("maybeGenerateProvisionCitationAnswer error:", error.message);
    return { handled: false };
  }
}
