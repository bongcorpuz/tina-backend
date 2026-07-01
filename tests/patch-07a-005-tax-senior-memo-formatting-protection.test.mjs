/**
 * PATCH-07A-005 - /tax senior memo formatting protection
 *
 * Run: node tests/patch-07a-005-tax-senior-memo-formatting-protection.test.mjs
 *
 * Verifies the answer-renderer-only /tax senior memo formatting path and the
 * prompt-only tax mode guidance without live retrieval, DB/vector store, OpenAI,
 * staging, external services, sourceAvailability computation, or source-card selection.
 */

"use strict";

import assert from "node:assert/strict";

import {
  applyVerifiedAuthorityGate,
  renderTinaAnswer,
  renderTinaJsonPayload
} from "../answer-renderer.js";

import {
  buildTaxSystemPrompt,
  taxPromptHealthCheck,
  TAX_SENIOR_MEMO_SECTIONS
} from "../prompts/tax-mode-prompt.js";

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

const LEGACY_AF_TAX_ANSWER = [
  "A. DIRECT ANSWER",
  "NIRC Sec. 57 requires withholding at source when the verified payment type is covered.",
  "",
  "B. CONTROLLING LEGAL BASIS",
  "NIRC Sec. 57 and RR 2-98 are the verified authorities for the stated withholding issue.",
  "",
  "C. SUPPORTING RULES / ADMINISTRATIVE ISSUANCES",
  "The withholding agent must determine the payee, payment type, and applicable rate.",
  "",
  "D. SUPPORTING JURISPRUDENCE",
  "No issue-relevant jurisprudence is required for this narrow compliance point.",
  "",
  "E. DOCTRINAL STATUS / CONFLICT ANALYSIS",
  "No direct doctrinal conflict is established from the presented facts.",
  "",
  "F. PRACTICAL NOTE / APPLICATION",
  "Confirm documentation, remittance, and filing requirements before relying on the position."
].join("\n");

const ASK_FAST_ANSWER = [
  "### Direct Answer",
  "Withholding tax is an amount withheld by the payor and remitted to the BIR.",
  "",
  "### Legal Basis",
  "RR 2-98 may be relevant when the authority state supports it.",
  "",
  "### Practical Explanation",
  "The payor withholds part of the payment and remits it as tax.",
  "",
  "### Practical Note",
  "Check the payment type, payee status, and rate before applying the rule."
].join("\n");

function assertTaxSeniorMemo(rendered) {
  for (const heading of TAX_SENIOR_MEMO_SECTIONS) {
    assert(rendered.includes(heading), `missing ${heading}`);
  }
  assert(!rendered.includes("### Direct answer"));
  assert(!rendered.includes("### Key explanation"));
  assert(!rendered.includes("### Practical note"));
  assert(!rendered.includes("### Source / authority note"));
  assert(!rendered.includes("1. Quick Assessment"));
  assert(!rendered.includes("7. Recommended Action"));
}

await test("/tax formatting preserves A-F senior memo structure", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    metadata: { modeFlags: { hook: "/tax", orchestrationMode: "STANDARD_TAX" } }
  });

  assertTaxSeniorMemo(rendered);
});

await test("/tax includes Short Answer / Conclusion", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("A. Short Answer / Conclusion"));
  assert(rendered.includes("requires withholding at source"));
});

await test("/tax includes Governing Authority", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("B. Governing Authority"));
  assert(rendered.includes("NIRC Sec. 57"));
});

await test("/tax includes Analysis", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("C. Analysis"));
  assert(rendered.includes("withholding agent"));
});

await test("/tax includes Compliance Effect", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("D. Compliance Effect"));
});

await test("/tax includes Caveats / Missing Facts", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("E. Caveats / Missing Facts"));
});

await test("/tax includes Sources / Source Cards policy", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("F. Sources / Source Cards"));
});

await test("/tax does not use lighter /ask conversational format as primary structure", () => {
  const rendered = renderTinaAnswer({
    answer: ASK_FAST_ANSWER,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/tax", orchestrationMode: "FAST_DEFINITION" } }
  });

  assertTaxSeniorMemo(rendered);
});

await test("/ask conversational format from PATCH-07A-004 remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: ASK_FAST_ANSWER,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("### Direct answer"));
  assert(rendered.includes("### Key explanation"));
  assert(rendered.includes("### Source / authority note"));
  assert(!rendered.includes("A. Short Answer / Conclusion"));
});

await test("/audit advisory format remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: "Audit answer body.",
    orchestrationMode: "AUDIT",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "AUDIT" } }
  });

  assert(rendered.includes("1. Quick Assessment"));
  assert(rendered.includes("6. Risk Level"));
  assert(rendered.includes("7. Recommended Action"));
  assert(!rendered.includes("A. Short Answer / Conclusion"));
  assert(!rendered.includes("### Direct answer"));
});

await test("/tax RELATED_AUTHORITY_ONLY caution remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/tax"
  });

  assert(rendered.includes("Source limitation: A governing authority was not directly located."));
  assert(rendered.includes("Displayed sources are related, supporting, or secondary only."));
  assert(rendered.includes("They are not the controlling basis for the answer."));
});

await test("/tax NO_INDEXED_SOURCE non-fabrication/source unavailable policy remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: "No indexed source was located for direct verification.",
    orchestrationMode: "STANDARD_TAX",
    saeStatus: "NO_INDEXED_SOURCE",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/tax"
  });

  assertTaxSeniorMemo(rendered);
  assert(rendered.includes("Source limitation: No indexed source was located for direct verification."));
  assert(!rendered.includes("### Source / authority note"));
});

await test("/tax source limitation wording remains intact", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/tax"
  });

  assert.match(rendered, /Source limitation: A governing authority was not directly located\./);
});

await test("applyVerifiedAuthorityGate compatibility remains intact for /tax", () => {
  const result = gate({
    answer: "A. Short Answer / Conclusion\nNIRC Sec. 57 applies when verified.\n\nB. Governing Authority\nNIRC Sec. 57 is verified.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "NIRC Sec. 57", citation: "NIRC Sec. 57" }],
    mode: "STANDARD_TAX",
    route: "/tax"
  });

  assert.equal(result.leakageBlocked, false);
  assert(result.answer.includes("NIRC Sec. 57"));
});

await test("renderTinaJsonPayload marks /tax senior memo structure as preserved", () => {
  const payload = renderTinaJsonPayload({
    answer: LEGACY_AF_TAX_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    metadata: { modeFlags: { hook: "/tax", orchestrationMode: "STANDARD_TAX" } }
  });

  assert.equal(payload.success, true);
  assert(payload.answer.includes("A. Short Answer / Conclusion"));
  assert.equal(payload.metadata.renderer, "answer-renderer.js");
  assert.equal(payload.metadata.noOpenAICalls, true);
  assert.equal(payload.metadata.structurePreserved, true);
});

await test("tax mode prompt exports senior memo and authority-safety guidance", () => {
  const prompt = buildTaxSystemPrompt();
  const health = taxPromptHealthCheck();

  assert.equal(health.ok, true);
  assert.equal(health.noExternalSearchInstruction, true);
  assert.equal(health.noReasoningEngine, true);
  for (const section of TAX_SENIOR_MEMO_SECTIONS) {
    assert(prompt.includes(section));
  }
  assert.match(prompt, /Do not fabricate/i);
  assert.match(prompt, /RELATED_AUTHORITY_ONLY/);
  assert.match(prompt, /NO_INDEXED_SOURCE/);
  assert.match(prompt, /Preserve source limitation wording/i);
  assert(!/search the internet/i.test(prompt));
});

console.log(`\nPATCH-07A-005 tax senior memo formatting protection tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
