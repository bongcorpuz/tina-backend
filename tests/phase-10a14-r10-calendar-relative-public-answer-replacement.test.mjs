// PHASE-10A14-R10: calendar-relative public-answer replacement + persistence safety.
// Closes P1-R9-IR-001 — the R9 note was prepended while the unsafe model answer was
// retained (SG-C-LASTDAY, R9-LASTDAY-REPRO) and the "due today" variants (R9-DUETODAY,
// SG-C-DUETODAY) reached proposition-source-sufficiency first and got no note at all.
// R10: the calendar-relative gate runs FIRST and the public answer is REPLACED entirely.
// Do not remove or weaken R9 or prior tests.

import assert from "node:assert/strict";
import {
  evaluateCalendarRelativeDeadline, buildCalendarRelativeSafeAnswer, evaluateAnswerSupport
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const SEC51 = [{ label: "NIRC Sec. 51" }];
const NOAUTH = [{ label: "NIRC Sec. 24" }];
const UNSAFE_RE = /today is the last day|due today|file (?:it |your return )?today|by the end of (?:the day|today)|today is april 15|already late|still on time|submit (?:it |your return )?today/i;

// 1-4. exact reproductions route to calendar-relative-deadline (incl. due-today variants)
for (const [name, ans, q] of [
  ["1 SG-C-LASTDAY", "### Short Answer\nYes, today is the last day to file the annual ITR, due on or before April 15 under Section 51(C).", "Is today the last day to file?"],
  ["2 R9-LASTDAY-REPRO", "### Short Answer\nYes, today is the last day to file the annual income tax return of an individual.", "Is today the last day to file the annual ITR?"],
  ["3 R9-DUETODAY", "### Short Answer\nYes, your annual income tax return is due today, April 15.\n### Practical Meaning\nSubmit by the end of the day.", "Is my annual ITR due today?"],
  ["4 SG-C-DUETODAY", "### Short Answer\nYour income tax return is due today if today is April 15.", "Is my ITR due today?"]
]) {
  await test(`${name} routes to calendar-relative-deadline stage`, async () => {
    const e = await evaluateAnswerSupport({ question: q, answer: ans, sources: SEC51 });
    assert.equal(e.verifiedEligible, false);
    assert.equal(e.stage, "calendar-relative-deadline");
  });
}

// 5-9. safe replacement content
await test("5/6 replacement contains no unsafe present-day statement", () => {
  assert.equal(UNSAFE_RE.test(buildCalendarRelativeSafeAnswer(SEC51)), false);
  assert.equal(UNSAFE_RE.test(buildCalendarRelativeSafeAnswer(NOAUTH)), false);
});
await test("7 replacement states April 15 only when Sec 51 deadline authority present", () => {
  assert.ok(/April 15/.test(buildCalendarRelativeSafeAnswer(SEC51)));
  assert.ok(!/April 15/.test(buildCalendarRelativeSafeAnswer(NOAUTH)));
});
await test("8 replacement asks for the missing filing details", () => {
  assert.ok(/taxable year/i.test(buildCalendarRelativeSafeAnswer(SEC51)));
  assert.ok(/taxable year/i.test(buildCalendarRelativeSafeAnswer(NOAUTH)));
});
await test("9 replacement carries no internal validator terminology", () => {
  const s = buildCalendarRelativeSafeAnswer(SEC51) + buildCalendarRelativeSafeAnswer(NOAUTH);
  assert.ok(!/calendar-relative|verifiedEligible|proposition-source|stage|answerSupport/i.test(s));
});

// 10-16. detector completeness (assertions)
for (const [name, a] of [
  ["10 today is the last day", "Today is the last day to file."],
  ["11 due today", "Your ITR is due today."],
  ["12 file today", "You should file today."],
  ["13 submit by end of today", "Please submit your return by the end of the day."],
  ["14 already late", "You are already late."],
  ["15 still on time", "You are still on time to file."],
  ["16 today is April 15", "Today is April 15, the filing deadline."]
]) {
  await test(`detector: ${name}`, () => {
    assert.equal(evaluateCalendarRelativeDeadline({ answer: a }).sufficient, false);
  });
}
// 17. Taglish
await test("17 Taglish variants detected", () => {
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "Ngayon ang huling araw para mag-file." }).sufficient, false);
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "Due ngayon ang return mo." }).sufficient, false);
});
// 18-19. answer-introduced + Practical Meaning section directive
await test("18/19 answer-introduced directive under Practical Meaning fires", async () => {
  const e = await evaluateAnswerSupport({ question: "When is my ITR due?", answer: "### Short Answer\nThe deadline is April 15.\n### Practical Meaning\nSubmit your return today to avoid penalties.", sources: SEC51 });
  assert.equal(e.stage, "calendar-relative-deadline");
});

// 20-22. controls that must NOT fire
await test("20 neutral non-relative April 15 does NOT fire", () => {
  assert.equal(evaluateCalendarRelativeDeadline({ question: "What is the ITR deadline?", answer: "### Short Answer\nThe deadline is on or before April 15 under Section 51(C)." }).applicable, false);
});
await test("21 safe conditional statement does NOT fire", () => {
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "A taxpayer would be late if the operative deadline had already passed for that year." }).applicable, false);
});
await test("22 unrelated 'today'/'last day' controls do NOT fire", () => {
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "On the last day of employment, the employer issues BIR Form 2316." }).applicable, false);
  assert.equal(evaluateCalendarRelativeDeadline({ answer: "As of today, the corporate income tax rate is 25 percent." }).applicable, false);
});

// 23. model-validator non-override (deterministic, returns before LLM stage)
await test("23 calendar-relative fails closed with no model client", async () => {
  const e = await evaluateAnswerSupport({ question: "due today?", answer: "Yes, your return is due today.", sources: SEC51 });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "calendar-relative-deadline");
});

// 24. runs BEFORE proposition-source-sufficiency (the R10 ordering fix)
await test("24 due-today variant no longer stops at proposition-source-sufficiency", async () => {
  const e = await evaluateAnswerSupport({ question: "Is my ITR due today?", answer: "Yes, your annual income tax return is due today, April 15.", sources: NOAUTH });
  assert.equal(e.stage, "calendar-relative-deadline");
});

console.log(`\nphase-10a14-r10: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
