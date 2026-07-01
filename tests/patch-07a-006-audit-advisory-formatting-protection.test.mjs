/**
 * PATCH-07A-006 - /audit advisory formatting protection
 *
 * Run: node tests/patch-07a-006-audit-advisory-formatting-protection.test.mjs
 *
 * Verifies the answer-renderer-only /audit advisory formatting path and the
 * prompt-only audit mode guidance without live retrieval, DB/vector store,
 * OpenAI, staging, external services, sourceAvailability computation, or
 * source-card selection.
 */

"use strict";

import assert from "node:assert/strict";

import {
  applyVerifiedAuthorityGate,
  renderTinaAnswer,
  renderTinaJsonPayload
} from "../answer-renderer.js";

import {
  AUDIT_ADVISORY_SECTIONS,
  auditPromptHealthCheck,
  buildAuditSystemPrompt
} from "../prompts/audit-mode-prompt.js";

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

const LEGACY_AUDIT_ANSWER = [
  "A. DIRECT ANSWER",
  "The PAN/FAN mismatch is an audit risk point, but outcome depends on the documents and verified authority.",
  "",
  "B. KNOWN FACTS AND ASSUMPTIONS",
  "The BIR may argue the assessment remains valid if the deficiency basis is substantially the same.",
  "",
  "C. AUDIT ISSUE",
  "The taxpayer may raise due-process and variance arguments if the FAN materially differs from the PAN.",
  "",
  "D. ACCOUNTING / TAX TREATMENT",
  "The taxpayer should gather the PAN, FAN/FLD, schedules, reconciliations, and proof of submissions.",
  "",
  "E. AUDIT RISK / MISSTATEMENT RISK",
  "Procedural issues require exact dates, notices, service details, and authority verification.",
  "",
  "F. REQUIRED AUDIT EVIDENCE",
  "Risk level is preliminary and should not be treated as a taxpayer-win conclusion.",
  "",
  "G. RECOMMENDED AUDIT POSITION",
  "Prepare a document matrix and verify the procedural authority before finalizing the protest position."
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

const TAX_LEGACY_ANSWER = [
  "A. DIRECT ANSWER",
  "NIRC Sec. 57 requires withholding at source when the verified payment type is covered.",
  "",
  "B. CONTROLLING LEGAL BASIS",
  "NIRC Sec. 57 is the verified authority for the stated withholding issue.",
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

function assertAuditAdvisory(rendered) {
  for (const heading of AUDIT_ADVISORY_SECTIONS) {
    assert(rendered.includes(heading), `missing ${heading}`);
  }
  assert(!rendered.includes("### Direct answer"));
  assert(!rendered.includes("### Key explanation"));
  assert(!rendered.includes("A. Short Answer / Conclusion"));
  assert(!rendered.includes("B. Governing Authority"));
  assert(!rendered.includes("F. Sources / Source Cards"));
  assert(!/taxpayer will win/i.test(rendered));
}

await test("/audit formatting preserves audit advisory structure", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AUDIT_ANSWER,
    orchestrationMode: "AUDIT",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "AUDIT" } }
  });

  assertAuditAdvisory(rendered);
});

await test("/audit includes Quick Assessment", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("1. Quick Assessment"));
  assert(rendered.includes("PAN/FAN mismatch"));
});

await test("/audit includes BIR Likely Position", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("2. BIR Likely Position"));
  assert(rendered.includes("BIR may argue"));
});

await test("/audit includes Taxpayer Position / Defenses", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("3. Taxpayer Position / Defenses"));
  assert(rendered.includes("due-process"));
});

await test("/audit includes Documentary Support Needed", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("4. Documentary Support Needed"));
  assert(rendered.includes("PAN, FAN/FLD"));
});

await test("/audit includes Procedural Issues", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("5. Procedural Issues"));
});

await test("/audit includes Risk Level", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("6. Risk Level"));
  assert(rendered.includes("preliminary"));
});

await test("/audit includes Recommended Action", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("7. Recommended Action"));
  assert(rendered.includes("document matrix"));
});

await test("/audit includes Sources / Source Cards policy", () => {
  const rendered = renderTinaAnswer({ answer: LEGACY_AUDIT_ANSWER, orchestrationMode: "AUDIT", route: "/audit" });
  assert(rendered.includes("8. Sources / Source Cards"));
});

await test("/audit does not use lighter /ask conversational format as primary structure", () => {
  const rendered = renderTinaAnswer({
    answer: ASK_FAST_ANSWER,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "FAST_DEFINITION" } }
  });

  assertAuditAdvisory(rendered);
});

await test("/audit does not use /tax senior memo format as primary structure", () => {
  const rendered = renderTinaAnswer({
    answer: TAX_LEGACY_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "STANDARD_TAX" } }
  });

  assertAuditAdvisory(rendered);
});

await test("/ask conversational format from PATCH-07A-004 remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: ASK_FAST_ANSWER,
    orchestrationMode: "FAST_DEFINITION",
    metadata: { modeFlags: { hook: "/ask", orchestrationMode: "FAST_DEFINITION" } }
  });

  assert(rendered.includes("### Direct answer"));
  assert(rendered.includes("### Key explanation"));
  assert(!rendered.includes("1. Quick Assessment"));
});

await test("/tax senior memo format from PATCH-07A-005 remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: TAX_LEGACY_ANSWER,
    orchestrationMode: "STANDARD_TAX",
    route: "/tax"
  });

  assert(rendered.includes("A. Short Answer / Conclusion"));
  assert(rendered.includes("B. Governing Authority"));
  assert(!rendered.includes("1. Quick Assessment"));
});

await test("/audit RELATED_AUTHORITY_ONLY caution remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AUDIT_ANSWER,
    orchestrationMode: "AUDIT",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/audit"
  });

  assert(rendered.includes("Source limitation: A governing authority was not directly located."));
  assert(rendered.includes("Displayed sources are related, supporting, or secondary only."));
  assert(rendered.includes("They are not the controlling basis for the answer."));
});

await test("/audit NO_INDEXED_SOURCE non-fabrication/source unavailable policy remains protected", () => {
  const rendered = renderTinaAnswer({
    answer: "No indexed source was located for direct verification.",
    orchestrationMode: "AUDIT",
    saeStatus: "NO_INDEXED_SOURCE",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/audit"
  });

  assertAuditAdvisory(rendered);
  assert(rendered.includes("Source limitation: No indexed source was located for direct verification."));
  assert(!/taxpayer will win/i.test(rendered));
});

await test("/audit source limitation wording remains intact", () => {
  const rendered = renderTinaAnswer({
    answer: LEGACY_AUDIT_ANSWER,
    orchestrationMode: "AUDIT",
    saeStatus: "RELATED_AUTHORITY_ONLY",
    sourceAvailabilityMetadata: { hasSaeMetadata: true },
    route: "/audit"
  });

  assert.match(rendered, /Source limitation: A governing authority was not directly located\./);
});

await test("applyVerifiedAuthorityGate compatibility remains intact for /audit", () => {
  const result = gate({
    answer: "1. Quick Assessment\nNIRC Sec. 228 applies when verified.\n\n5. Procedural Issues\nNIRC Sec. 228 is verified.",
    saeStatus: "AUTHORITY_FOUND",
    finalSourceCards: [{ normalizedReference: "NIRC Sec. 228", citation: "NIRC Sec. 228" }],
    mode: "AUDIT",
    route: "/audit"
  });

  assert.equal(result.leakageBlocked, false);
  assert(result.answer.includes("NIRC Sec. 228"));
});

await test("renderTinaJsonPayload marks /audit advisory structure as preserved", () => {
  const payload = renderTinaJsonPayload({
    answer: LEGACY_AUDIT_ANSWER,
    orchestrationMode: "AUDIT",
    metadata: { modeFlags: { hook: "/audit", orchestrationMode: "AUDIT" } }
  });

  assert.equal(payload.success, true);
  assert(payload.answer.includes("1. Quick Assessment"));
  assert.equal(payload.metadata.renderer, "answer-renderer.js");
  assert.equal(payload.metadata.noOpenAICalls, true);
  assert.equal(payload.metadata.structurePreserved, true);
});

await test("audit mode prompt exports advisory and authority-safety guidance", () => {
  const prompt = buildAuditSystemPrompt();
  const health = auditPromptHealthCheck();

  assert.equal(health.ok, true);
  assert.equal(health.noOutcomeGuarantee, true);
  assert.equal(health.sourceLimitationDiscipline, true);
  for (const section of AUDIT_ADVISORY_SECTIONS) {
    assert(prompt.includes(section));
  }
  assert.match(prompt, /Do not guarantee/i);
  assert.match(prompt, /Do not describe related authorities as governing/i);
  assert.match(prompt, /Preserve source limitation wording/i);
  assert(!/search the internet/i.test(prompt));
});

console.log(`\nPATCH-07A-006 audit advisory formatting protection tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
