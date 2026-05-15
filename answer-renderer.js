// FILE: answer-renderer.js
"use strict";

/**
 * answer-renderer.js
 * TINA Enterprise Adaptive Answer Renderer
 *
 * PURPOSE
 * - final adaptive rendering layer
 * - structure enforcement
 * - adaptive response shaping
 * - conclusion gating
 * - litigation-safe rendering
 * - evidence-aware rendering
 * - hierarchy-aware rendering
 * - supersession disclosure rendering
 * - planner contract enforcement
 *
 * COMPATIBLE WITH
 * - ask-handler.js
 * - rag-answer-handler.js
 * - adaptive-mode-engine.js
 * - adaptive-response-planner.js
 * - assumption-gap-engine.js
 * - risk-scoring-engine.js
 * - position-strength-engine.js
 * - jurisprudence-engine.js
 * - supersession-engine.js
 */

const ENGINE_VERSION = "3.0.0";

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

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value)
    ? value
    : [value];
}

function escapeRegex(value = "") {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function itemToText(item) {
  if (!item) return "";

  if (typeof item === "string") {
    return item;
  }

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

function stripRawSourceSections(
  text = ""
) {
  return normalizeText(text)
    .replace(
      /\n+\s*Sources Used[\s\S]*$/i,
      ""
    )
    .replace(
      /\n+\s*Sources:[\s\S]*$/i,
      ""
    )
    .replace(
      /\n+\s*References:[\s\S]*$/i,
      ""
    )
    .replace(
      /\n+\s*Validated Indexed Sources[\s\S]*$/i,
      ""
    )
    .replace(
      /\n+\s*Authority Used[\s\S]*$/i,
      ""
    )
    .replace(
      /\n+\s*Supersession Audit[\s\S]*$/i,
      ""
    )
    .trim();
}

function hasHeading(
  text = "",
  heading = ""
) {
  return new RegExp(
    `(^|\\n)\\s*${escapeRegex(
      heading
    )}\\b`,
    "i"
  ).test(String(text || ""));
}

function hasStructure(
  text = "",
  headings = TINA_AF_HEADINGS
) {
  return headings.every((heading) =>
    hasHeading(text, heading)
  );
}

function hasCompleteAFStructure(
  text = ""
) {
  return hasStructure(
    text,
    TINA_AF_HEADINGS
  );
}

function getSectionBody(
  text = "",
  heading = "",
  headings = TINA_AF_HEADINGS
) {
  const source =
    normalizeText(text);

  const index =
    headings.indexOf(heading);

  if (index < 0) return "";

  const current =
    escapeRegex(heading);

  const nextHeadings =
    headings
      .slice(index + 1)
      .map(escapeRegex)
      .join("|");

  const regex = nextHeadings
    ? new RegExp(
        `${current}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextHeadings})\\b|$)`,
        "i"
      )
    : new RegExp(
        `${current}\\s*([\\s\\S]*)$`,
        "i"
      );

  const match =
    source.match(regex);

  return normalizeText(
    match?.[1] || ""
  );
}

function normalizeLegacyHeadings(
  text = ""
) {
  return normalizeText(text)
    .replace(
      /(^|\n)\s*1\.\s*DIRECT ANSWER\b/gi,
      "$1A. DIRECT ANSWER"
    )

    .replace(
      /(^|\n)\s*2\.\s*LEGAL BASIS\b/gi,
      "$1B. CONTROLLING LEGAL BASIS"
    )

    .replace(
      /(^|\n)\s*3\.\s*SUPPORTING JURISPRUDENCE\b/gi,
      "$1C. SUPPORTING JURISPRUDENCE"
    )

    .replace(
      /(^|\n)\s*4\.\s*PROFESSIONAL INSIGHT\b/gi,
      "$1F. PRACTICAL APPLICATION"
    )

    .replace(
      /(^|\n)\s*5\.\s*CONFLICT FLAG\b/gi,
      "$1D. DOCTRINAL STATUS / CONFLICT ANALYSIS"
    );
}

function defaultBodyForHeading(
  heading = "",
  responseMode = "TECHNICAL"
) {
  const defaults = {
    "A. DIRECT ANSWER":
      "No direct answer was rendered. Verify the controlling authority, facts, and supporting evidence before relying on the position.",

    "B. CONTROLLING LEGAL BASIS":
      "No controlling legal basis was rendered. TINA should identify the applicable Constitution, NIRC/statute, Revenue Regulation, BIR issuance, or court authority before final use.",

    "C. SUPPORTING JURISPRUDENCE":
      "No issue-relevant jurisprudence was rendered. TINA should not cite unrelated cases merely because they mention the same tax type.",

    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS":
      "No direct doctrinal conflict was rendered. Authorities addressing different substantive, procedural, evidentiary, jurisdictional, temporal, or factual issues should be treated as distinguishable rather than conflicting.",

    "E. HIERARCHY ANALYSIS":
      "Apply Philippine legal hierarchy. Lower authorities cannot override higher authorities.",

    "F. PRACTICAL APPLICATION":
      "Verify the latest official authority and maintain supporting documentation before relying on the position."
  };

  return (
    defaults[heading] ||
    `No ${heading
      .replace(/^[A-Z]\.\s*/, "")
      .toLowerCase()} was rendered.`
  );
}

function repairStructure(
  answer = "",
  headings = TINA_AF_HEADINGS,
  responseMode = "TECHNICAL"
) {
  const clean =
    normalizeLegacyHeadings(
      stripRawSourceSections(
        answer
      )
    );

  if (
    hasStructure(clean, headings)
  ) {
    return clean;
  }

  const sections =
    headings.map((heading) => {
      const body =
        getSectionBody(
          clean,
          heading,
          headings
        ) ||
        defaultBodyForHeading(
          heading,
          responseMode
        );

      return `${heading}\n${body}`;
    });

  if (
    !headings.some((heading) =>
      hasHeading(clean, heading)
    )
  ) {
    sections[0] =
      `${headings[0]}\n${
        clean ||
        defaultBodyForHeading(
          headings[0],
          responseMode
        )
      }`;
  }

  return sections.join("\n\n").trim();
}

function sanitizeConflictLanguage(
  answer = "",
  headings = TINA_AF_HEADINGS
) {
  const clean =
    normalizeText(answer);

  const conflictHeading =
    headings.find((heading) =>
      /DOCTRINAL STATUS|CONFLICT ANALYSIS/i.test(
        heading
      )
    ) ||
    "D. DOCTRINAL STATUS / CONFLICT ANALYSIS";

  const body = getSectionBody(
    clean,
    conflictHeading,
    headings
  );

  if (!body) {
    return clean;
  }

  const vagueConflict =
    /Conflict Detected:\s*YES/i.test(
      body
    ) &&
    !/(exact issue|controlling doctrine|controlling authority|distinction type|resolution basis|substantive|procedural|evidentiary|jurisdictional|temporal|factual|administrative)/i.test(
      body
    );

  if (!vagueConflict) {
    return clean;
  }

  return clean.replace(
    new RegExp(
      `(${escapeRegex(
        conflictHeading
      )}\\b)[\\s\\S]*?(?=\\n\\s*[A-Z]\\.\\s|$)`,
      "i"
    ),

    [
      conflictHeading,

      "A vague conflict flag was removed. No doctrinal conflict should be asserted unless the exact issue, controlling doctrine, hierarchy basis, and resolution analysis are specifically identified."
    ].join("\n")
  );
}

function protectHeadingSpacing(
  answer = "",
  headings = TINA_AF_HEADINGS
) {
  let clean =
    normalizeText(answer);

  for (const heading of headings) {
    const pattern =
      new RegExp(
        `\\s*${escapeRegex(
          heading
        )}\\s*`,
        "gi"
      );

    clean = clean.replace(
      pattern,
      `\n\n${heading}\n`
    );
  }

  return clean
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderList(items = []) {
  const normalized =
    normalizeArray(items)
      .map(itemToText)
      .filter(Boolean);

  if (!normalized.length) {
    return "";
  }

  return normalized
    .map(
      (item, index) =>
        `${index + 1}. ${item}`
    )
    .join("\n");
}

function renderSources(
  sources = []
) {
  if (
    !Array.isArray(sources) ||
    !sources.length
  ) {
    return "";
  }

  const lines =
    sources.slice(0, 8).map(
      (source, index) => {
        const title =
          source.issuanceNumber ||
          source.issuance_number
            ? `${
                source.issuanceNumber ||
                source.issuance_number
              } – ${
                source.title ||
                "Untitled Source"
              }`
            : source.title ||
              source.source ||
              source.sourcePath ||
              source.path ||
              "Untitled Source";

        const authority =
          source.authorityType ||
          source.authority_type ||
          source.authorityLabel ||
          "Source";

        return `${index + 1}. ${title} (${authority})`;
      }
    );

  return [
    "",
    "VALIDATED INDEXED SOURCES",
    ...lines
  ].join("\n");
}

function renderSupersessionAudit(
  supersessionAudit = null
) {
  if (
    !supersessionAudit
      ?.auditTrail?.length
  ) {
    return "";
  }

  const lines =
    supersessionAudit.auditTrail
      .slice(0, 5)

      .map((item, index) => {
        return [
          `${index + 1}. ${item.documentTitle || item.document}`,

          `Status: ${item.status}`,

          item.replacedByTitle
            ? `Replaced By: ${item.replacedByTitle}`
            : null,

          item.reason
            ? `Reason: ${item.reason}`
            : null
        ]
          .filter(Boolean)
          .join("\n");
      });

  return [
    "",
    "SUPERSESSION AUDIT",
    ...lines
  ].join("\n\n");
}

function renderRiskBlock(
  riskBlock = null
) {
  if (!riskBlock) return "";

  const lines = [];

  if (riskBlock.overallRisk) {
    const risk =
      typeof riskBlock.overallRisk ===
      "object"
        ? `${riskBlock.overallRisk.level || ""}${
            riskBlock.overallRisk
              .score != null
              ? ` (${riskBlock.overallRisk.score})`
              : ""
          }`.trim()
        : String(
            riskBlock.overallRisk
          );

    if (risk) {
      lines.push(
        `Overall Risk: ${risk}`
      );
    }
  }

  if (
    riskBlock.taxpayerDefensibility
  ) {
    lines.push(
      `Taxpayer Defensibility: ${riskBlock.taxpayerDefensibility}`
    );
  }

  if (
    riskBlock.positionStrength
  ) {
    lines.push(
      `Position Strength: ${riskBlock.positionStrength}`
    );
  }

  if (
    riskBlock.conclusionRestriction
  ) {
    lines.push(
      `Conclusion Restriction: ${riskBlock.conclusionRestriction}`
    );
  }

  return lines.length
    ? `RISK AND POSITION CONTROL\n${lines.join("\n")}`
    : "";
}

function getResponsePlan(
  input = {}
) {
  return (
    input.responsePlan ||
    input.adaptiveContext
      ?.responsePlan ||
    {}
  );
}

function getRendererContract(
  input = {}
) {
  return (
    input.rendererContract ||
    input.responsePlan
      ?.rendererContract ||
    input.adaptiveContext
      ?.rendererContract ||
    {}
  );
}

function getResponseModeFromInput(
  input = {}
) {
  const plan =
    getResponsePlan(input);

  const contract =
    getRendererContract(input);

  return (
    contract.responseMode ||
    plan.responseMode ||
    input.responseMode ||
    "TECHNICAL"
  );
}

function getHeadingsFromInput(
  input = {}
) {
  const plan =
    getResponsePlan(input);

  const contract =
    getRendererContract(input);

  return normalizeArray(
    contract.sections ||
      plan.responseTemplate ||
      FALLBACK_TEMPLATES[
        getResponseModeFromInput(
          input
        )
      ] ||
      TINA_AF_HEADINGS
  ).filter(Boolean);
}

function getLimitationStatement(
  input = {}
) {
  return (
    input.limitationStatement ||
    input.assumptionGap
      ?.limitationStatement ||
    input.positionStrength
      ?.limitationStatement ||
    "Based on the available facts, the position is preliminary and subject to verification."
  );
}

function shouldApplyLimitation(
  input = {}
) {
  return Boolean(
    input.mustIncludeLimitation ||
      input.assumptionGap
        ?.mustDiscloseBeforeConclusion ||
      input.positionStrength
        ?.conclusionAction ===
        "DEFER_CONCLUSION" ||
      input.positionStrength
        ?.conclusionAction ===
        "USE_QUALIFIED_CONCLUSION" ||
      input.riskScore
        ?.conclusionRestriction ===
        "PRELIMINARY_CONCLUSION_ONLY"
  );
}

function applyLimitation(
  answer = "",
  input = {}
) {
  if (
    !shouldApplyLimitation(
      input
    )
  ) {
    return answer;
  }

  const limitation =
    getLimitationStatement(
      input
    );

  if (
    answer.includes("LIMITATION")
  ) {
    return answer;
  }

  return `${answer}\n\nLIMITATION\n${limitation}`;
}

function applyRiskBlock(
  answer = "",
  input = {}
) {
  const rendered =
    renderRiskBlock(
      input.riskBlock ||
        input.riskScore
    );

  if (!rendered) {
    return answer;
  }

  if (
    answer.includes(
      "RISK AND POSITION CONTROL"
    )
  ) {
    return answer;
  }

  return `${answer}\n\n${rendered}`;
}

function applySupersessionAudit(
  answer = "",
  input = {}
) {
  const rendered =
    renderSupersessionAudit(
      input.supersessionAudit ||
        input.supersessionResult
    );

  if (!rendered) {
    return answer;
  }

  if (
    answer.includes(
      "SUPERSESSION AUDIT"
    )
  ) {
    return answer;
  }

  return `${answer}\n${rendered}`;
}

function renderAdaptiveAnswer(
  input = {}
) {
  const responseMode =
    getResponseModeFromInput(
      input
    );

  const headings =
    getHeadingsFromInput(input);

  const rawAnswer =
    input.answer ||
    input.draftAnswer ||
    input.fallbackAnswer ||
    "";

  let rendered =
    repairStructure(
      rawAnswer,
      headings,
      responseMode
    );

  rendered =
    sanitizeConflictLanguage(
      rendered,
      headings
    );

  rendered =
    protectHeadingSpacing(
      rendered,
      headings
    );

  rendered =
    applyLimitation(
      rendered,
      input
    );

  rendered =
    applyRiskBlock(
      rendered,
      input
    );

  rendered =
    applySupersessionAudit(
      rendered,
      input
    );

  return normalizeText(
    rendered
  );
}

function renderTinaAnswer({
  answer = "",
  sources = [],
  includeSources = false,
  adaptiveContext = null,
  responsePlan = null,
  assumptionGap = null,
  riskScore = null,
  positionStrength = null,
  supersessionAudit = null
} = {}) {
  let rendered =
    renderAdaptiveAnswer({
      answer,
      adaptiveContext,
      responsePlan,
      assumptionGap,
      riskScore,
      positionStrength,
      supersessionAudit
    });

  if (includeSources) {
    const sourceBlock =
      renderSources(sources);

    if (sourceBlock) {
      rendered =
        `${rendered}\n${sourceBlock}`;
    }
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
  positionStrength = null,
  supersessionAudit = null
} = {}) {
  const renderedAnswer =
    renderTinaAnswer({
      answer,
      sources,
      includeSources:
        includeSourcesInAnswer,

      adaptiveContext,
      responsePlan,
      assumptionGap,
      riskScore,
      positionStrength,
      supersessionAudit
    });

  const headings =
    getHeadingsFromInput({
      adaptiveContext,
      responsePlan
    });

  return {
    success: true,

    answer:
      renderedAnswer,

    sources,

    metadata: {
      ...metadata,

      renderer:
        "answer-renderer.js",

      rendererVersion:
        ENGINE_VERSION,

      structurePreserved:
        hasStructure(
          renderedAnswer,
          headings
        ),

      afStructurePreserved:
        hasCompleteAFStructure(
          renderedAnswer
        ),

      sourceCount:
        Array.isArray(sources)
          ? sources.length
          : 0
    }
  };
}

function assertAFStructure(
  answer = ""
) {
  const clean =
    renderTinaAnswer({
      answer
    });

  return {
    ok:
      hasCompleteAFStructure(
        clean
      ),

    answer: clean,

    missingHeadings:
      TINA_AF_HEADINGS.filter(
        (heading) =>
          !hasHeading(
            clean,
            heading
          )
      )
  };
}

function assertStructure(
  answer = "",
  headings = TINA_AF_HEADINGS
) {
  const clean =
    repairStructure(
      answer,
      headings
    );

  return {
    ok:
      hasStructure(
        clean,
        headings
      ),

    answer: clean,

    missingHeadings:
      headings.filter(
        (heading) =>
          !hasHeading(
            clean,
            heading
          )
      )
  };
}

export {
  ENGINE_VERSION,
  TINA_AF_HEADINGS,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  sanitizeConflictLanguage,
  protectHeadingSpacing,
  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure
};

export default {
  ENGINE_VERSION,
  TINA_AF_HEADINGS,
  FALLBACK_TEMPLATES,
  normalizeText,
  stripRawSourceSections,
  hasHeading,
  hasStructure,
  hasCompleteAFStructure,
  repairStructure,
  sanitizeConflictLanguage,
  protectHeadingSpacing,
  renderAdaptiveAnswer,
  renderTinaAnswer,
  renderTinaJsonPayload,
  assertAFStructure,
  assertStructure
};
