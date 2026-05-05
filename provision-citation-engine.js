// provision-citation-engine.js

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function looksLikeProvisionQuestion(question = "") {
  const q = String(question || "").toLowerCase();

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

function buildSourceSnippet(doc = {}, maxLen = 1200) {
  const text = normalizeText(doc.text || doc.content || "");
  if (!text) return "";
  return text.slice(0, maxLen);
}

function rankProvisionDocs(results = []) {
  return [...results].sort((a, b) => {
    const aLevel =
      Number(
        a.authorityLevel ??
          a.authority_level ??
          a.metadata?.authorityLevel ??
          99
      ) || 99;

    const bLevel =
      Number(
        b.authorityLevel ??
          b.authority_level ??
          b.metadata?.authorityLevel ??
          99
      ) || 99;

    const aScore = Number(a.finalScore ?? a.score ?? 0);
    const bScore = Number(b.finalScore ?? b.score ?? 0);

    if (aLevel !== bLevel) return aLevel - bLevel;
    return bScore - aScore;
  });
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

    const ranked = rankProvisionDocs(retrievedResults || []);
    const topDocs = ranked.slice(0, 5);

    if (!topDocs.length) {
      return { handled: false };
    }

    const provisionHint = extractProvisionHint(question);

    const contextBlock = topDocs
      .map((doc, index) => {
        const source =
          doc.source ||
          doc.originalSource ||
          doc.metadata?.originalSource ||
          "Unknown Source";

        const path =
          doc.path || doc.metadata?.path || doc.metadata?.fileName || "Unknown Path";

        const authorityType =
          doc.authorityType ||
          doc.authority_type ||
          doc.metadata?.authorityType ||
          "SECONDARY";

        const authorityLevel =
          doc.authorityLevel ||
          doc.authority_level ||
          doc.metadata?.authorityLevel ||
          99;

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

    const systemPrompt = `
You are TINA's Provision Citation Engine.

Your job:
1. Determine whether the user's question is asking for a legal provision, statutory citation, or rule citation.
2. Answer ONLY from the retrieved sources provided.
3. Prefer higher legal authority first.
4. If a specific section/article/provision is identifiable, cite it clearly.
5. If no exact provision is visible in the excerpts, do not invent one.
6. Use this structure:

1. DIRECT ANSWER
2. LEGAL BASIS
3. SUPPORTING RULES
4. PROFESSIONAL INSIGHT
5. CONFLICT FLAG
6. SOURCES USED

Rules:
- Be conservative.
- Do not hallucinate section numbers.
- If exact citation is uncertain, say "Exact provision not fully visible in retrieved text."
- Prefer NIRC/statute over RR, RR over RMC, and so on.
- If conflicting authorities appear, mention which higher authority controls.
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

    const answer =
      completion?.choices?.[0]?.message?.content?.trim() || "";

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
