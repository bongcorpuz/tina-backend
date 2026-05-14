// FILE: answer-renderer.js
"use strict";

/**
 * answer-renderer.js
 * TINA Adaptive Answer Renderer
 *
 * Purpose:
 * Final rendering layer for TINA answers.
 *
 * Compatible with:
 * - patched ask-handler.js
 * - patched rag-answer-handler.js
 * - adaptive-mode-engine.js v2.1.0
 * - adaptive-response-planner.js v2.1.0
 * - assumption-gap-engine.js
 * - risk-scoring-engine.js
 * - position-strength-engine.js
 */

const ENGINE_VERSION = "2.1.0";

const TINA_AF_HEADINGS = Object.freeze([
  "A. DIRECT ANSWER",
  "B. CONTROLLING LEGAL BASIS",
  "C. SUPPORTING JURISPRUDENCE",
  "D. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "E. HIERARCHY ANALYSIS",
  "F. PRACTICAL APPLICATION"
]);

const FALLBACK_TEMPLATES = Object.freeze({
  QUICK: [
    "A. DIRECT ANSWER",
    "B. SHORT BASIS",
    "C. PRACTICAL NOTE"
  ],

  STANDARD: [
    "A. DIRECT ANSWER",
    "B. CONTROLLING LEGAL BASIS",
    "C. PRACTICAL APPLICATION",
    "D. TAX / COMPLIANCE RISK"
  ],

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
  ]
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function itemToText(item) {
  if (!item) return "";

  if (typeof item === "string") return item;

  if (typeof item === "object") {
    return (
      item.fact ||
      item.document ||
      item.issue ||
      item.description ||
      item.text ||
      item.clause ||
      item.heading ||
      item.requiredLanguage ||
      JSON.stringify(item)
    );
  }

  return String(item);
}

function stripRawSourceSections(text = "") {
  return normalizeText(text)
    .replace(/\n+\s*Sources Used[\s\S]*$/i, "")
    .replace(/\n+\s*Sources:[\s\S]*$/i, "")
    .replace(/\n+\s*References:[\s\S]*$/i, "")
    .replace(/\n+\s*Validated Indexed Sources[\s\S]*$/i, "")
    .replace(/\n+\s*Authority Used[\s\S]*$/i, "")
    .replace(/\n+\s*Supersession Audit[\s\S]*$/i, "")
    .trim();
}

function hasHeading(text = "", heading = "") {
  return new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\b`, "i").test(
    String(text || "")
  );
}

function hasStructure(text = "", headings = TINA_AF_HEADINGS) {
  return headings.every((heading) => hasHeading(text, heading));
}

function hasCompleteAFStructure(text = "") {
  return hasStructure(text, TINA_AF_HEADINGS);
}

function getSectionBody(text = "", heading = "", headings = TINA_AF_HEADINGS) {
  const source = normalizeText(text);
  const index = headings.indexOf(heading);

  if (index < 0) return "";

  const current = escapeRegex(heading);
  const nextHeadings = headings
    .slice(index + 1)
    .map(escapeRegex)
    .join("|");

  const regex = nextHeadings
    ? new RegExp(`${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextHeadings})\\b|$)`, "i")
    : new RegExp(`${current}\\s*([\\s\\S]*)$`, "i");

  const match = source.match(regex);
  return normalizeText(match?.[1] || "");
}

function normalizeLegacyHeadings(text = "") {
  return normalizeText(text)
    .replace(/(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi, "$1A. DIRECT ANSWER")
    .replace(/(^|\n)\s*2\.\s*LEGAL BASIS\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING RULES\b/gi, "$1B. CONTROLLING LEGAL BASIS")
    .replace(/(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi, "$1C. SUPPORTING JURISPRUDENCE")
    .replace(/(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi, "$1F. PRACTICAL APPLICATION")
    .replace(/(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi, "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Issue\b/gim, "A. DIRECT ANSWER")
    .replace(/^#+\s*Applicable law.*$/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*BIR position\b/gim, "B. CONTROLLING LEGAL BASIS")
    .replace(/^#+\s*Court position\b/gim, "C. SUPPORTING JURISPRUDENCE")
    .replace(/^#+\s*Conflict flag\b/gim, "D. DOCTRINAL STATUS / CONFLICT ANALYSIS")
    .replace(/^#+\s*Legally defensible conclusion\b/gim, "E. HIERARCHY ANALYSIS")
    .replace(/^#+\s*Taxpayer risk assessment\b/gim, "F. PRACTICAL APPLICATION")
    .replace(/^#+\s*Recommended action\b/gim, "F. PRACTICAL APPLICATION");
}

function defaultBodyForHeading(heading = "", responseMode = "TECHNICAL") {
  const defaults = {
    "A. DIRECT ANSWER":
      "No direct answer was rendered. Verify the controlling authority, facts, and supporting evidence before relying on the position.",

    "B. SHORT BASIS":
      "No short basis was rendered. Verify the applicable rule before relying on the answer.",

    "C. PRACTICAL NOTE":
      "Verify the latest authority and supporting documents before implementation.",

    "B. CONTROLLING LEGAL BASIS":
      "No controlling legal basis was rendered. TINA should identify the applicable Constitution, NIRC/statute, Revenue Regulation, BIR issuance, or court authority before final use.",

    "C. SUPPORTING JURISPRUDENCE":
      "No issue-relevant jurisprudence was rendered. TINA should not cite unrelated cases merely because they mention the same tax type.",

    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "No direct doctrinal conflict was rendered. If authorities address different substantive, procedural, evidentiary, jurisdictional, factual, temporal, or administrative issues, they should be treated as distinguishable or complementary rather than conflicting.",

    "E. HIERARCHY ANALYSIS":
      "Apply Philippine legal hierarchy: Constitution, NIRC/statute, Revenue Regulations, RMC/RMO/RAMO, BIR rulings, Supreme Court doctrine, CTA decisions, and secondary materials. Lower authorities cannot override higher authorities.",

    "F. PRACTICAL APPLICATION":
      "Verify the latest official authority and maintain documentation before relying on the position for compliance, audit, protest, or litigation.",

    "B. KNOWN FACTS AND ASSUMPTIONS":
      "Known facts and assumptions were not separately rendered. The conclusion should remain preliminary until facts are verified.",

    "C. AUDIT ISSUE":
      "Audit issue was not separately rendered. Identify recognition, measurement, presentation, disclosure, and tax reconciliation risks.",

    "D. ACCOUNTING / TAX TREATMENT":
      "Accounting and tax treatment were not separately rendered. Separate PFRS/PAS analysis from BIR/tax compliance treatment.",

    "E. AUDIT RISK / MISSTATEMENT RISK":
      "Audit risk was not separately rendered. Assess material misstatement, cut-off, classification, completeness, and disclosure risk.",

    "F. REQUIRED AUDIT EVIDENCE":
      "Required audit evidence was not separately rendered. Obtain sufficient appropriate audit evidence before final conclusion.",

    "G. RECOMMENDED AUDIT POSITION":
      "Recommended audit position was not separately rendered. Use preliminary language until audit evidence is complete.",

    "B. ASSERTED FACTS":
      "Asserted facts were not separately rendered. Separate assertions from documented facts.",

    "C. DOCUMENTED FACTS":
      "Documented facts were not separately rendered. Identify which facts are supported by contracts, invoices, OR/SI, GL, tax returns, bank records, board approvals, confirmations, and third-party documents.",

    "D. UNSUPPORTED / CONTRADICTORY FACTS":
      "Unsupported or contradictory facts were not separately rendered. Do not treat unsupported assertions as verified facts.",

    "E. MISSING DOCUMENTS":
      "Missing documents were not separately rendered. Identify documents needed before final conclusion.",

    "F. AUDIT-SENSITIVE ITEMS":
      "Audit-sensitive items were not separately rendered. Identify items affecting audit evidence, tax reconciliation, presentation, and disclosure.",

    "G. CONCLUSION SUBJECT TO VERIFICATION":
      "Based on the available facts, the position is preliminary and subject to verification."
  };

  return (
    defaults[heading] ||
    `No ${heading.replace(/^[A-Z]\.\s*/, "").toLowerCase()} was rendered. Apply ${responseMode} response discipline and verify supporting authority.`
  );
}

function repairStructure(answer = "", headings = TINA_AF_HEADINGS, responseMode = "TECHNICAL") {
  const clean = normalizeLegacyHeadings(stripRawSourceSections(answer));

  if (hasStructure(clean, headings)) return clean;

  const sections = headings.map((heading) => {
    const body = getSectionBody(clean, heading, headings) || defaultBodyForHeading(heading, responseMode);
    return `${heading}\n${body}`;
  });

  if (!headings.some((heading) => hasHeading(clean, heading))) {
    sections[0] = `${headings[0]}\n${clean || defaultBodyForHeading(headings[0], responseMode)}`;
  }

  return sections.join("\n\n").trim();
}

function repairAFStructure(answer = "") {
  return repairStructure(answer, TINA_AF_HEADINGS, "TECHNICAL");
}

function sanitizeConflictLanguage(answer = "", headings = TINA_AF_HEADINGS) {
  const clean = normalizeText(answer);

  const conflictHeading =
    headings.find((heading) => /DOCTRINAL STATUS|CONFLICT ANALYSIS/i.test(heading)) ||
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS";

  const conflictBody = getSectionBody(clean, conflictHeading, headings);

  if (!conflictBody) return clean;

  const vagueConflict =
    /Conflict Detected:\s*YES/i.test(conflictBody) &&
    !/(exact issue|controlling doctrine|controlling authority|distinction type|resolution basis|why it controls|substantive|procedural|evidentiary|jurisdictional|temporal|factual|administrative|direct conflict|partial conflict|apparent conflict)/i.test(
      conflictBody
    );

  if (!vagueConflict) return clean;

  const nextHeading = headings[headings.indexOf(conflictHeading) + 1];
  const nextPattern = nextHeading ? `(?=\\n\\s*${escapeRegex(nextHeading)}\\b|$)` : "$";

  return clean.replace(
    new RegExp(`(${escapeRegex(conflictHeading)}\\b)[\\s\\S]*?${nextPattern}`, "i"),
    [
      conflictHeading,
      "A vague conflict flag was removed. No direct doctrinal conflict should be stated unless the answer identifies the exact legal issue, controlling doctrine, hierarchy basis, distinction type, and why one authority prevails."
    ].join("\n")
  );
}

function protectHeadingSpacing(answer = "", headings = TINA_AF_HEADINGS) {
  let clean = normalizeText(answer);

  for (const heading of headings) {
    const pattern = new RegExp(`\\s*${escapeRegex(heading)}\\s*`, "gi");
    clean = clean.replace(pattern, `\n\n${heading}\n`);
  }

  return clean.replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
}

function renderSources(sources = []) {
  if (!Array.isArray(sources) || !sources.length) return "";

  const lines = sources.slice(0, 5).map((source, index) => {
    const title =
      source.issuanceNumber || source.issuance_number
        ? `${source.issuanceNumber || source.issuance_number} – ${source.title || "Untitled Source"}`
        : source.title || source.source || source.sourcePath || source.path || "Untitled Source";

    const authority =
      source.authorityType ||
      source.authority_type ||
      source.authorityLabel ||
      "Source";

    return `${index + 1}. ${title} (${authority})`;
  });

  return ["", "Validated Indexed Sources", ...lines].join("\n");
}

function renderList(items = []) {
  const normalized = normalizeArray(items)
    .map(itemToText)
    .filter(Boolean);

  if (!normalized.length) return "";

  return normalized.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function renderPreConclusionBlocks(blocks = []) {
  const normalizedBlocks = normalizeArray(blocks).filter(Boolean);
  if (!normalizedBlocks.length) return "";

  const rendered = normalizedBlocks
    .filter((block) => normalizeArray(block.items).length)
    .map((block) => {
      const heading = block.heading || "PRELIMINARY DISCLOSURE";
      const body = renderList(block.items);
      return `${heading}\n${body}`;
    })
    .join("\n\n");

  return rendered ? `PRE-CONCLUSION DISCLOSURES\n${rendered}` : "";
}

function renderRiskBlock(riskBlock = null) {
  if (!riskBlock) return "";

  const lines = [];

  if (riskBlock.overallRisk) {
    const risk =
      typeof riskBlock.overallRisk === "object"
        ? `${riskBlock.overallRisk.level || ""}${riskBlock.overallRisk.score != null ? ` (${riskBlock.overallRisk.score})` : ""}`.trim()
        : String(riskBlock.overallRisk);

    if (risk) lines.push(`Overall Risk: ${risk}`);
  }

  if (riskBlock.taxpayerDefensibility) {
    const defensibility =
      typeof riskBlock.taxpayerDefensibility === "object"
        ? `${riskBlock.taxpayerDefensibility.level || ""}${riskBlock.taxpayerDefensibility.score != null ? ` (${riskBlock.taxpayerDefensibility.score})` : ""}`.trim()
        : String(riskBlock.taxpayerDefensibility);

    if (defensibility) lines.push(`Taxpayer Defensibility: ${defensibility}`);
  }

  if (riskBlock.positionStrength) {
    lines.push(`Position Strength: ${riskBlock.positionStrength}`);
  }

  if (riskBlock.conclusionRestriction) {
    lines.push(`Conclusion Restriction: ${riskBlock.conclusionRestriction}`);
  }

  if (normalizeArray(riskBlock.recommendedControls).length) {
    lines.push("Recommended Controls:");
    lines.push(renderList(riskBlock.recommendedControls));
  }

  return lines.length ? `RISK AND POSITION CONTROL\n${lines.join("\n")}` : "";
}

function getResponsePlan(input = {}) {
  return (
    input.responsePlan ||
    input.adaptiveContext?.responsePlan ||
    input.adaptiveContext?.rendererContract ||
    input.rendererContract ||
    {}
  );
}

function getRendererContract(input = {}) {
  return (
    input.rendererContract ||
    input.responsePlan?.rendererContract ||
    input.adaptiveContext?.responsePlan?.rendererContract ||
    input.adaptiveContext?.rendererContract ||
    {}
  );
}

function getHeadingsFromInput(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  const headings =
    contract.sections ||
    plan.responseTemplate ||
    input.responseTemplate ||
    FALLBACK_TEMPLATES[plan.responseMode || input.responseMode || "TECHNICAL"] ||
    TINA_AF_HEADINGS;

  return normalizeArray(headings).filter(Boolean);
}

function getResponseModeFromInput(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  return (
    contract.responseMode ||
    plan.responseMode ||
    input.responseMode ||
    input.adaptiveContext?.adaptiveMode?.responseMode ||
    "TECHNICAL"
  );
}

function getLimitationStatement(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);
  const assumptionGap = input.assumptionGap || input.adaptiveContext?.assumptionGap || {};
  const positionStrength = input.positionStrength || input.adaptiveContext?.positionStrength || {};

  return (
    input.limitationStatement ||
    contract.limitationStatement ||
    plan.limitationStatement ||
    assumptionGap.limitationStatement ||
    positionStrength.limitationStatement ||
    null
  );
}

function shouldPrependLimitation(input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);
  const assumptionGap = input.assumptionGap || input.adaptiveContext?.assumptionGap || {};
  const riskScore = input.riskScore || input.adaptiveContext?.riskScore || {};
  const positionStrength = input.positionStrength || input.adaptiveContext?.positionStrength || {};

  return Boolean(
    input.mustIncludeLimitation ||
    plan.mustIncludeLimitation ||
    contract.conclusionRule?.requireLimitation ||
    contract.conclusionRule?.allowStrongConclusion === false ||
    assumptionGap.mustDiscloseBeforeConclusion ||
    riskScore.conclusionRestriction === "PRELIMINARY_CONCLUSION_ONLY" ||
    riskScore.conclusionRestriction === "DEFER_STRONG_CONCLUSION" ||
    positionStrength.conclusionAction === "DEFER_CONCLUSION" ||
    positionStrength.conclusionAction === "USE_QUALIFIED_CONCLUSION" ||
    positionStrength.conclusionAction === "DISCLOSE_AGGRESSIVE_POSITION"
  );
}

function applyLimitation(answer = "", input = {}) {
  const limitation =
    getLimitationStatement(input) ||
    "Based on the available facts, the position is preliminary and subject to verification.";

  if (!shouldPrependLimitation(input)) return answer;

  if (answer.includes(limitation)) return answer;

  return `${answer}\n\nLIMITATION\n${limitation}`;
}

function applyPreConclusionBlocks(answer = "", input = {}) {
  const plan = getResponsePlan(input);
  const contract = getRendererContract(input);

  const blocks =
    input.preConclusionBlocks ||
    contract.preConclusionBlocks ||
    plan.preConclusionBlocks ||
    input.adaptiveContext?.assumptionGap?.mandatoryDisclosure ||
    [];

  const renderedBlocks = Array.isArray(blocks) && blocks[0]?.heading
    ? renderPreConclusionBlocks(blocks)
    : renderPreConclusionBlocks([
        {
          heading: "MANDATORY DISCLOSURES",
          items: blocks
        }
      ]);

  if (!renderedBlocks) return answer;
  if (answer.includes("PRE-CONCLUSION DISCLOSURES")) return answer;

  return `${renderedBlocks}\n\n${answer}`;
}

function applyRiskBlock(answer = "", input = {}) {
  const contract = getRendererContract(input);

  const riskBlock =
    input.riskBlock ||
    contract.riskBlock ||
    input.adaptiveContext?.responsePlan?.riskBlock ||
    null;

  const rendered = renderRiskBlock(riskBlock);
  if (!rendered) return answer;
  if (answer.includes("RISK AND POSITION CONTROL")) return answer;

  return `${answer}\n\n${rendered}`;
}

function renderAdaptiveAnswer(input = {}) {
  const draft =
    input.draftAnswer ||
    input.answer ||
    input.fallbackAnswer ||
    "";

  const responseMode = getResponseModeFromInput(input);
  const headings = getHeadingsFromInput(input);

  let rendered = repairStructure(draft, headings, responseMode);
  rendered = sanitizeConflictLanguage(rendered, headings);
  rendered = protectHeadingSpacing(rendered, headings);
  rendered = applyPreConclusionBlocks(rendered, input);
  rendered = applyLimitation(rendered, input);
  rendered = applyRiskBlock(rendered, input);

  return normalizeText(rendered);
}

function renderAnswer(input = {}) {
  return renderAdaptiveAnswer(input);
}

function buildRenderedAnswer(input = {}) {
  return {
    answer: renderAdaptiveAnswer(input),
    renderer: "answer-renderer.js",
    rendererVersion: ENGINE_VERSION
  };
}

function renderTinaAnswer({
  answer = "",
  sources = [],
  includeSources = false,
  responseTemplate = null,
  responseMode = "TECHNICAL",
  adaptiveContext = null,
  responsePlan = null,
  assumptionGap = null,
  riskScore = null,
  positionStrength = null
} = {}) {
  let rendered = renderAdaptiveAnswer({
    answer,
    responseTemplate,
    responseMode,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength
  });

  if (includeSources) {
    const sourceBlock = renderSources(sources);
    if (sourceBlock) rendered = `${rendered}\n${sourceBlock}`;
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
  assumptionGap = null,
  riskScore = null,
  positionStrength = null
} = {}) {
  const renderedAnswer = renderTinaAnswer({
    answer,
    sources,
    includeSources: includeSourcesInAnswer,
    adaptiveContext,
    responsePlan,
    assumptionGap,
    riskScore,
    positionStrength
  });

  const headings = getHeadingsFromInput({
    adaptiveContext,
    responsePlan
  });

  return {
    success: true,
    answer: renderedAnswer,
    sources,
    metadata: {
      ...metadata,
      renderer: "answer-renderer.js",
      rendererVersion: ENGINE_VERSION,
      structurePreserved: hasStructure(renderedAnswer, headings),
      afStructurePreserved: hasCompleteAFStructure(renderedAnswer),
      sourceCount: Array.isArray(sources) ? sources.length : 0
    }
  };
}

function assertAFStructure(answer = "") {
  const clean = renderTinaAnswer({ answer });

  return {
    ok: hasCompleteAFStructure(clean),
    answer: clean,
    missingHeadings: TINA_AF_HEADINGS.filter(
      (heading) => !hasHeading(clean, heading)
    )
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

module.exports = {
  ENGINE_VERSION,
  TINA_AF_HEADINGS,
  FALLBACK_TEMPLATES,

  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  repairAFStructure,
  sanitizeConflictLanguage,
  protectHeadingSpacing,

  renderAdaptiveAnswer,
  renderAnswer,
  buildRenderedAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure
};
