/**
 * PATCH-07A-004 - /ask conversational formatting implementation
 *
 * Run: node tests/patch-07a-004-ask-conversational-formatting.test.mjs
 *
 * Verifies the answer-renderer-only /ask conversational formatting path without
 * live retrieval, DB/vector store, OpenAI, staging, external services, prompts,
 * routes/controllers, sourceAvailability computation, or source-card selection.
 */

"use strict";

import assert from "node:assert/strict";

import {
  applyVerifiedAuthorityGate,
  renderTinaAnswer,
  renderTinaJsonPayload
} from "../answer-renderer.js";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
    failed++;
  }
}

function gate(args) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return applyVerifiedAuthorityGate(args);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

const FAST_STRUCTURED = [
  "### Direct Answer",
  "Withholding tax is an amount withheld by the payor and remitted to the BIR.",
  "",
  "### Legal Basis",
  "RR 2-98 is the main indexed authority for expanded withholding tax.",
  "",
  "### Practical Explanation",
  "In practical terms, the payor withholds part of the payment and remits it as tax.",
  "",
  "### Practical Note",
  "Check the payment type, payee status, and rate before applying the rule."
].join("\n");

const AF_STRUCTURED = [
  "A. DIRECT ANSWER",
  "Withholding tax is collected at source by requiring the payor to withhold.",
  "",
  "B. CONTROLLING LEGAL BASIS",
  "NIRC Sec. 57 and RR 2-98 govern withholding obligations when verified.",
  "",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "Administrative rules explain withholding agent compliance.",
  "",
  "D. SUPPORTING JURISPRUDENCE",
  "Indexed source not found.",
  "",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "No direct doctrinal conflict is established.",
  "",
  "F. PRACTICAL NOTE / APPLICATION",
  "Confirm the payment type and withholding rate before filing."
].join("\n");

await test("/ask FAST_DEFINITION renders lighter conversational sections", () => {
  const rendered = renderTinaAnswer({
    answer: FAST_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.startsWith("### Direct answer"));
  assert(rendered.includes("### Key explanation"));
  assert(rendered.includes("### Practical note"));
  assert(rendered.includes("### Source / authority note"));
  assert(!rendered.includes("A. DIRECT ANSWER"));
  assert(!rendered.includes("B. CONTROLLING LEGAL BASIS"));
  assert(!rendered.includes("C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES"));
});

await test("/ask conversational formatting can convert legacy A-F fast answers", () => {
  const rendered = renderTinaAnswer({
    answer: AF_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.startsWith("### Direct answer"));
  assert(rendered.includes("### Key explanation"));
  assert(rendered.includes("### Source / authority note"));
  assert(!rendered.includes("A. DIRECT ANSWER"));
  assert(!rendered.includes("F. PRACTICAL NOTE / APPLICATION"));
});

await test("/ask source and authority note survives when applicable", () => {
  const rendered = renderTinaAnswer({
    answer: FAST_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { routeHook: "/ask", modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("### Source / authority note"));
  assert(rendered.includes("RR 2-98"));
});

await test("/ask RELATED_AUTHORITY_ONLY source limitation wording survives", () => {
  const rendered = renderTinaAnswer({
    answer: FAST_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("Source limitation: A governing authority was not directly located."));
  assert(rendered.includes("Displayed sources are related, supporting, or secondary only."));
  assert(rendered.includes("They are not the controlling basis for the answer."));
});

await test("/ask NO_INDEXED_SOURCE source unavailable wording survives", () => {
  const rendered = renderTinaAnswer({
    answer: "### Direct Answer\nNo indexed source was located for this question.\n\n### Legal Basis\nIndexed source not found.",
    orchestrationMode: "FAST_DEFINITION",
    saeStatus: "NO_INDEXED_SOURCE",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("Source limitation: No indexed source was located for direct verification."));
  assert(!rendered.includes("A. DIRECT ANSWER"));
});

await test("/ask GENERAL_TAX generic answer remains non-promotional", () => {
  const rendered = renderTinaAnswer({
    answer: [
      "### Direct Answer",
      "Withholding tax is a general mechanism where tax is withheld at source.",
      "",
      "### Legal Basis",
      "Ask for a specific payment type or authority if you need a governing citation.",
      "",
      "### Practical Explanation",
      "The exact treatment depends on the income payment, payee, and rate.",
      "",
      "### Practical Note",
      "A narrower fact pattern will produce a safer answer."
    ].join("\n"),
    orchestrationMode: "FAST_DEFINITION",
    saeStatus: "GENERAL_TAX",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("### Direct answer"));
  assert(!/governing authority is RR 2-98/i.test(rendered));
  assert(!/Source Cards with named authority/i.test(rendered));
});

await test("/tax formatting remains protected even for FAST_DEFINITION mode", () => {
  const rendered = renderTinaAnswer({
    answer: FAST_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/tax", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("A. Short Answer / Conclusion"));
  assert(rendered.includes("B. Governing Authority"));
  assert(rendered.includes("F. Sources / Source Cards"));
  assert(!rendered.includes("### Direct answer"));
  assert(!rendered.includes("### Source / authority note"));
});

await test("/audit formatting remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: "Audit answer body.",
    orchestrationMode: "AUDIT",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "AUDIT" } }
  });

  assert(rendered.includes("A. DIRECT ANSWER"));
  assert(rendered.includes("E. AUDIT / TAX RISK"));
  assert(rendered.includes("G. PRACTICAL POSITION"));
  assert(!rendered.includes("### Direct answer"));
});

await test("renderTinaJsonPayload marks /ask conversational answer as non-AF while preserving renderer metadata", () => {
  const payload = renderTinaJsonPayload({
    answer: FAST_STRUCTURED,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert.equal(payload.success, true);
  assert(payload.answer.includes("### Direct answer"));
  assert.equal(payload.metadata.renderer, "answer-renderer.js");
  assert.equal(payload.metadata.noOpenAICalls, true);
  assert.equal(payload.metadata.afStructurePreserved, false);
});

await test("applyVerifiedAuthorityGate remains compatible with short /ask answers", () => {
  const result = gate({
    answer: "RR 2-98 explains expanded withholding tax in practical terms.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "RR 2-98", citation: "RR 2-98" }],
    mode: "FAST_DEFINITION",
    route: "/ask"
  });

  assert.equal(result.leakageBlocked, false);
  assert(result.answer.includes("RR 2-98"));
});

console.log(`\nPATCH-07A-004 ask conversational formatting tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
