// FILE: workflow/tax-memo-runtime-renderer.js
// PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1
//
// Pure, dependency-free renderer for tax-memo runtime scaffold drafts. This
// module has NO I/O, NO network calls, NO Supabase/OpenAI/Google Drive/n8n/
// Firecrawl/Crawlee dependency, NO filesystem access, NO process.env
// dependency, NO Date.now/randomness, and NO side effects. It renders only
// the provided output object — it performs no new legal analysis, fabricates
// no authorities, fetches no links, and makes no official-URL-verification
// or currentness-fully-verified claim unless the underlying source card
// already carries that support. It is not wired into ask-handler.js,
// pipeline.js, server.js, routes, or the frontend.

"use strict";

import { detectProhibitedWorkflowClaims } from "./workflow-output-governance-gate.js";

export const PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION = "1.0.0";

export const TAX_MEMO_RUNTIME_RENDER_SECTIONS = Object.freeze([
  "title",
  "statusNotice",
  "factsProvided",
  "issues",
  "applicableAuthorities",
  "analysis",
  "conclusion",
  "risksLimitations",
  "assumptions",
  "missingFacts",
  "documentsNeeded",
  "sourceCards",
  "humanReviewNotice"
]);

const DRAFT_ONLY_NOTICE =
  "This is a draft work-product scaffold for human review and is not a final filing or automatic submission.";

/**
 * Returns a fresh render-result scaffold. Every call returns new
 * arrays/strings; no shared mutable references are returned.
 *
 * @returns {object}
 */
export function createTaxMemoRuntimeRenderResult() {
  return {
    valid: true,
    errors: [],
    warnings: [],
    markdown: "",
    sections: []
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function renderListSection(items, formatter) {
  const list = asArray(items);
  if (list.length === 0) return "_None provided._";
  return list.map((item) => `- ${formatter(item)}`).join("\n");
}

function formatMaybeString(item) {
  return typeof item === "string" ? item : JSON.stringify(item);
}

/**
 * Renders a safe markdown bullet list for source cards. Never fetches or
 * verifies links; only labels fields already present on each card. Never
 * throws on malformed input.
 *
 * @param {*} sourceCards
 * @returns {string}
 */
export function renderTaxMemoSourceCards(sourceCards) {
  const cards = asArray(sourceCards);
  if (cards.length === 0) return "_No source cards provided._";

  return cards
    .map((card, index) => {
      if (card === null || typeof card !== "object" || Array.isArray(card)) {
        return `- Source ${index + 1}: (malformed source card)`;
      }

      const label =
        typeof card.title === "string" && card.title.length > 0
          ? card.title
          : typeof card.sourceCardId === "string" && card.sourceCardId.length > 0
            ? card.sourceCardId
            : `Source ${index + 1}`;

      const parts = [];

      if (typeof card.archiveUrl === "string" && card.archiveUrl.length > 0) {
        parts.push(`archive reference: ${card.archiveUrl}`);
      }
      if (typeof card.gdriveFileId === "string" && card.gdriveFileId.length > 0) {
        parts.push(`GDrive source: ${card.gdriveFileId}`);
      }
      if (typeof card.officialUrl === "string" && card.officialUrl.length > 0) {
        const isVerified = typeof card.currentnessStatus === "string" && card.currentnessStatus.toLowerCase() === "verified";
        parts.push(
          isVerified
            ? `official URL (currentness verified): ${card.officialUrl}`
            : `official URL (verification status unconfirmed): ${card.officialUrl}`
        );
      }
      if (typeof card.relevance === "string" && card.relevance.length > 0) {
        parts.push(`relevance: ${card.relevance}`);
      }

      const detail = parts.length > 0 ? ` — ${parts.join("; ")}` : "";
      return `- ${label}${detail}`;
    })
    .join("\n");
}

/**
 * Renders a provided tax-memo output draft to safe markdown. Renders only
 * the given object — generates no new legal analysis, fabricates no source
 * cards or authorities, and always includes the draft-only / human-review
 * status notice. Never throws on malformed input.
 *
 * @param {*} output
 * @param {object} [options]
 * @returns {string}
 */
export function renderTaxMemoDraftToMarkdown(output, options = {}) {
  const safe = output && typeof output === "object" && !Array.isArray(output) ? output : {};

  const lines = [];
  lines.push("# Tax Memo (Draft Scaffold)");
  lines.push("");
  lines.push(`**Status:** ${DRAFT_ONLY_NOTICE}`);
  lines.push("");
  lines.push("## Facts Provided");
  lines.push(renderListSection(safe.factsProvided, formatMaybeString));
  lines.push("");
  lines.push("## Issues");
  lines.push(renderListSection(safe.issues, formatMaybeString));
  lines.push("");
  lines.push("## Applicable Authorities");
  lines.push(renderListSection(safe.applicableAuthorities, formatMaybeString));
  lines.push("");
  lines.push("## Analysis");
  lines.push(renderListSection(safe.analysis, formatMaybeString));
  lines.push("");
  lines.push("## Conclusion");
  lines.push(asString(safe.conclusion).length > 0 ? asString(safe.conclusion) : "_None provided._");
  lines.push("");
  lines.push("## Risks and Limitations");
  lines.push(renderListSection(safe.risksLimitations, formatMaybeString));
  lines.push("");
  lines.push("## Assumptions");
  lines.push(renderListSection(safe.assumptions, formatMaybeString));
  lines.push("");
  lines.push("## Missing Facts");
  lines.push(renderListSection(safe.missingFacts, formatMaybeString));
  lines.push("");
  lines.push("## Documents Needed");
  lines.push(renderListSection(safe.documentsNeeded, formatMaybeString));
  lines.push("");
  lines.push("## Source Cards");
  lines.push(renderTaxMemoSourceCards(safe.sourceCards));
  lines.push("");
  lines.push("## Human Review Notice");
  lines.push(
    asString(safe.humanReviewNotice).length > 0
      ? asString(safe.humanReviewNotice)
      : "_This draft requires human professional review before any use._"
  );

  return lines.join("\n");
}

/**
 * Validates rendered tax-memo markdown output. Never throws.
 *
 * @param {*} markdown
 * @param {*} output
 * @returns {{valid: boolean, errors: string[], warnings: string[], sectionCount: number}}
 */
export function validateTaxMemoRuntimeRenderedOutput(markdown, output) {
  const errors = [];
  const warnings = [];

  if (typeof markdown !== "string" || markdown.trim().length === 0) {
    errors.push("markdown must be a nonblank string");
    return { valid: false, errors, warnings, sectionCount: 0 };
  }

  const requiredHeadings = [
    "Facts Provided",
    "Issues",
    "Applicable Authorities",
    "Analysis",
    "Conclusion",
    "Risks and Limitations",
    "Assumptions",
    "Missing Facts",
    "Documents Needed",
    "Source Cards",
    "Human Review Notice"
  ];

  let sectionCount = 0;
  for (const heading of requiredHeadings) {
    if (markdown.includes(heading)) {
      sectionCount += 1;
    } else {
      errors.push(`missing section: ${heading}`);
    }
  }

  if (!markdown.includes(DRAFT_ONLY_NOTICE)) {
    errors.push("draft-only notice missing");
  }
  if (!/human review/i.test(markdown)) {
    errors.push("human-review notice missing");
  }
  if (!markdown.includes("Source Cards")) {
    errors.push("source-card section missing");
  }
  if (!markdown.includes("Missing Facts")) {
    errors.push("missing-facts section missing");
  }
  if (!markdown.includes("Assumptions")) {
    errors.push("assumptions section missing");
  }

  const claimCheck = detectProhibitedWorkflowClaims(markdown);
  if (claimCheck.hasProhibitedClaims) {
    errors.push("prohibited claims detected in rendered markdown");
  }

  return { valid: errors.length === 0, errors, warnings, sectionCount };
}

/**
 * Validates the renderer module itself: that all render sections are
 * defined, that a fresh render result is safe, and that a sample safe output
 * renders and validates cleanly. Never throws.
 *
 * @returns {{valid: boolean, errors: string[], warnings: string[], renderSectionCount: number}}
 */
export function validateTaxMemoRuntimeRenderer() {
  const errors = [];
  const warnings = [];

  for (const section of [
    "title",
    "statusNotice",
    "factsProvided",
    "issues",
    "applicableAuthorities",
    "analysis",
    "conclusion",
    "risksLimitations",
    "assumptions",
    "missingFacts",
    "documentsNeeded",
    "sourceCards",
    "humanReviewNotice"
  ]) {
    if (!TAX_MEMO_RUNTIME_RENDER_SECTIONS.includes(section)) errors.push(`render sections must include: ${section}`);
  }

  const freshResult = createTaxMemoRuntimeRenderResult();
  if (freshResult.valid !== true || freshResult.markdown !== "" || freshResult.sections.length !== 0) {
    errors.push("default/fresh render result must be safe (valid true, empty markdown, empty sections)");
  }

  const sampleOutput = {
    mode: "tax_memo",
    schemaKey: "taxMemoOutput",
    factsProvided: ["Sample facts for renderer self-check."],
    issues: ["Sample issue"],
    applicableAuthorities: [],
    analysis: [],
    conclusion: "",
    risksLimitations: [],
    assumptions: ["Sample assumption"],
    missingFacts: ["Sample missing fact"],
    documentsNeeded: [],
    sourceCards: [{ sourceCardId: "self-check", title: "Self-check source" }],
    humanReviewNotice: "Self-check draft for internal validation only.",
    metadata: { finalFiling: false, automaticSubmission: false, runtimeWiring: false, featureFlagDefault: "off" }
  };
  const markdown = renderTaxMemoDraftToMarkdown(sampleOutput);
  const renderCheck = validateTaxMemoRuntimeRenderedOutput(markdown, sampleOutput);
  if (!renderCheck.valid) errors.push(...renderCheck.errors.map((e) => `sample render: ${e}`));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    renderSectionCount: TAX_MEMO_RUNTIME_RENDER_SECTIONS.length
  };
}
