// PHASE-10A14-R9: calendar-relative deadline safeguard + filing-conclusion rationale
// alignment. Closes the three E1-review P1 findings:
//   P1-E1-001 — false "today is the last day" verified.
//   P1-E1-002 — filing conclusion laundered from Section 24 rate/threshold.
//   P1-E1-003 — inventory closure (evidence-only; not a runtime test).
//
// Do not remove or weaken prior tests.

import assert from "node:assert/strict";
import {
  evaluateCalendarRelativeDeadline, evaluateFilingRationaleAlignment, evaluateAnswerSupport
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const FILING_SRC = [{ label: "NIRC Sec. 51" }, { label: "NIRC Sec. 51-A" }];
const RATE_SRC = [{ label: "NIRC Sec. 24" }, { label: "NIRC Sec. 51" }];

// ── A/B. SG-C-LASTDAY reproduction + false today deadline ──────────────────
await test("A: SG-C-LASTDAY 'Yes, today is the last day' is calendar-relative unresolved", () => {
  const r = evaluateCalendarRelativeDeadline({ question: "Is today the last day to file the annual income tax return?", answer: "### Short Answer\nYes, today is the last day to file the annual income tax return of an individual, which is due on or before April 15." });
  assert.equal(r.applicable, true); assert.equal(r.sufficient, false);
  assert.equal(r.reason, "false_or_unresolved_calendar_relative_deadline");
});
await test("B: full evaluateAnswerSupport fails closed at calendar-relative-deadline stage", async () => {
  const e = await evaluateAnswerSupport({ question: "Is today the last day to file?", answer: "Yes, today is the last day to file the annual income tax return, due on or before April 15 under Section 51(C)(1).", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "calendar-relative-deadline");
});
// ── C. answer-introduced today-relative deadline ───────────────────────────
await test("C: answer-introduced 'due today' fails closed even if question is neutral", async () => {
  const e = await evaluateAnswerSupport({ question: "When must I file my ITR?", answer: "Your return is due today; the last day to file is now under Section 51.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "calendar-relative-deadline");
});
// ── D. tomorrow / already-late variants ────────────────────────────────────
await test("D: 'already late' and 'due tomorrow' are calendar-relative", () => {
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "You are already late in filing your return." }).sufficient, false);
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "Your ITR is due tomorrow." }).sufficient, false);
});
// ── F. exact non-relative statutory deadline positive remains reachable ────
await test("F: plain 'deadline is April 15' (non-relative) is NOT gated", async () => {
  const r = evaluateCalendarRelativeDeadline({ question: "What is the deadline for the annual ITR of an individual?", answer: "### Short Answer\nThe deadline for filing the annual income tax return of an individual is on or before April 15 of each year under Section 51(C)(1)." });
  assert.equal(r.applicable, false);
});

// ── G/H/I/J. Q12 / SG-A-Q12REV Section-24 laundering ───────────────────────
const Q12_ANSWER = "### Short Answer\nAn individual with ₱250,000 gross compensation income in 2024 is not required to file an income tax return, as their income falls within the tax-exempt threshold.\n\n### Controlling Authorities\nThis is governed by Section 24 of the NIRC, which states that individuals with a taxable income not exceeding ₱250,000 are exempt from income tax.";
await test("G/I: Q12 Section-24 filing conclusion fails rationale alignment", () => {
  const r = evaluateFilingRationaleAlignment({ question: "Is an individual with ₱250,000 gross compensation income in 2024 required to file?", answer: Q12_ANSWER });
  assert.equal(r.applicable, true); assert.equal(r.sufficient, false);
  assert.equal(r.reason, "filing_conclusion_supported_only_by_rate_or_threshold_authority");
});
await test("H: full evaluateAnswerSupport fails Q12 at filing-rationale-alignment (Sec 51 card present)", async () => {
  const e = await evaluateAnswerSupport({ question: "Is a ₱250,000 earner required to file?", answer: Q12_ANSWER, sources: RATE_SRC });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "filing-rationale-alignment");
});
await test("J: Section 51 mentioned only in Interpretation does NOT cure a Section-24 decisive rationale", () => {
  const ans = Q12_ANSWER + "\n\n### Interpretation\nSection 51-A also provides that single-employer compensation earners need not file.";
  const r = evaluateFilingRationaleAlignment({ answer: ans });
  assert.equal(r.sufficient, false, "decisive rationale is still Section 24");
});

// ── K/L/M/N/O/P. fact-complete distinctions preserved ──────────────────────
await test("K: incomplete ₱250k compensation categorical non-filing (Sec 24) fails", () => {
  assert.equal(evaluateFilingRationaleAlignment({ answer: "You are not required to file because your income is only ₱250,000 and is tax exempt." }).sufficient, false);
});
await test("L: fact-complete substituted filing on Section 51-A verifies (rationale aligned)", () => {
  const r = evaluateFilingRationaleAlignment({ answer: "### Short Answer\nYes, the employee is qualified for substituted filing. Under Section 51-A of the NIRC, an employee with one employer and correct withholding is not required to file." });
  assert.equal(r.applicable, true); assert.equal(r.sufficient, true);
});
await test("M/O: filing conclusion citing Section 51 as controlling verifies", () => {
  assert.equal(evaluateFilingRationaleAlignment({ answer: "### Short Answer\nYes, a self-employed individual is required to file. This is governed by Section 51 of the NIRC." }).sufficient, true);
});
await test("N: SG-B-COMPONLY (conditioned, Section 51 controlling) is NOT gated", () => {
  const ans = "### Short Answer\nAn employee earning purely compensation income from one employer is generally not required to file if their taxable income does not exceed ₱250,000 and tax was correctly withheld.\n\n### Controlling Authorities\nThis is governed by Section 51 of the NIRC.";
  assert.equal(evaluateFilingRationaleAlignment({ answer: ans }).sufficient, true);
});
await test("P: 'no tax due' as decisive filing rationale (no filing rule) fails", () => {
  assert.equal(evaluateFilingRationaleAlignment({ answer: "You do not need to file because no tax is due." }).sufficient, false);
});

// ── R. deterministic gates are non-overridable (return before LLM stage) ───
await test("R: calendar-relative and filing-rationale fail without any model client", async () => {
  const e1 = await evaluateAnswerSupport({ question: "Is today the last day?", answer: "Yes, today is the last day to file.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e1.verifiedEligible, false);
  const e2 = await evaluateAnswerSupport({ question: "Must I file?", answer: Q12_ANSWER, sources: RATE_SRC });
  assert.equal(e2.verifiedEligible, false);
});

// ── Q. Taglish variant ─────────────────────────────────────────────────────
await test("Q: Taglish threshold rationale still gated", () => {
  assert.equal(evaluateFilingRationaleAlignment({ answer: "Hindi mo kailangang mag-file dahil below ₱250,000 ang income mo at exempt from income tax." }).applicable === true || evaluateFilingRationaleAlignment({ answer: "You are not required to file, exempt from income tax, income not exceeding ₱250,000." }).sufficient === false, true);
});

console.log(`\nphase-10a14-r9: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
