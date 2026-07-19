// PHASE-10A14-R11: clause-level calendar-relative filing-directive detection completeness +
// contextual safe-answer builder. Closes P1-R10-IR-002 (detector missed answer-introduced
// filing directives) and P2-R10-IR-003 (contextual wording). Do not weaken R9/R10 tests.

import assert from "node:assert/strict";
import {
  evaluateCalendarRelativeDeadline, evaluateAnswerSupport,
  buildCalendarRelativeSafeAnswer, deriveCalendarContext
} from "../services/answer-support-validator.js";

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); }
}
const SEC51 = [{ label: "NIRC Sec. 51" }];
const NOAUTH = [{ label: "NIRC Sec. 24" }];
const fires = (a, q = "") => evaluateCalendarRelativeDeadline({ question: q, answer: a }).sufficient === false;

// confirmed R10 misses + directive families
for (const [name, a] of [
  ["confirmed miss: please file today", "The deadline is April 15. Please file your annual income tax return today."],
  ["confirmed miss: file now to avoid penalties", "The deadline is April 15. File now to avoid penalties."],
  ["polite: please submit by end of today", "Please submit the return by the end of today."],
  ["imperative: file now", "File now to avoid penalties."],
  ["imperative: submit immediately", "Submit your return immediately."],
  ["must file now", "You must file now."],
  ["should file today", "You should file today."],
  ["complete before day ends", "Complete the filing before the day ends."],
  ["go ahead and file today", "Go ahead and file the return today."],
  ["file tomorrow", "File the return tomorrow."],
  ["submit tomorrow", "Your return must be submitted tomorrow."],
  ["should have filed yesterday", "You should have filed yesterday."],
  ["was due yesterday", "The return was due yesterday."],
  ["submit today no penalty", "Submit today so penalties will not apply."],
  ["file immediately prevent", "You need to file immediately to prevent penalties."],
  ["file before end of day surcharge", "File before the end of the day to avoid surcharges."],
  ["taglish mag-file ngayon", "Mag-file ka ngayon."],
  ["taglish i-file ngayon", "I-file mo na ngayon para walang penalty."],
  ["taglish ngayong araw isumite", "Ngayong araw mo isumite ang return."],
  ["taglish mag-submit bago araw", "Mag-submit ka bago matapos ang araw."],
  ["taglish bukas i-file", "Bukas mo dapat i-file."],
  ["taglish huli mag-file agad", "Huli ka na, mag-file ka agad."],
  ["directive only under Practical Meaning", "### Short Answer\nThe deadline is April 15.\n### Practical Meaning\nPlease file your return today to be safe."],
  ["multiline with heading", "### Short Answer\nApril 15.\n\n### Next Step\nSubmit your return now."],
]) {
  await test(`detect: ${name}`, () => assert.equal(fires(a), true, name));
}

// safe controls must NOT fire
for (const [name, a] of [
  ["general April 15", "The general deadline for the annual ITR is on or before April 15 under Section 51(C)."],
  ["safe hypothetical", "A taxpayer would be late if the operative filing deadline had already passed."],
  ["historical", "For taxable year 2023, the annual ITR deadline was April 17, 2024 because April 15 fell on a weekend."],
  ["ordinary penalty", "A surcharge and interest may apply when a return is filed late."],
  ["last day of employment", "On the last day of employment, the employer must issue BIR Form 2316."],
  ["today tax news", "As of today, the regular corporate income tax rate is 25 percent."],
  ["neutral checklist", "To file an annual ITR you generally need BIR Form 1701 and your BIR Form 2316."],
  ["conditional no conclusion", "A taxpayer is considered late only if the operative deadline has passed; TINA cannot conclude that here."],
]) {
  await test(`safe control does NOT fire: ${name}`, () => assert.equal(evaluateCalendarRelativeDeadline({ answer: a }).applicable, false, name));
}

// contextual builder (WS6): must not always say "today"
await test("context derived from question (today/tomorrow/yesterday/already-late/still-on-time)", () => {
  assert.equal(deriveCalendarContext("Is my return due tomorrow?"), "TOMORROW");
  assert.equal(deriveCalendarContext("Was it due yesterday?"), "YESTERDAY");
  assert.equal(deriveCalendarContext("Am I already late?"), "ALREADY_LATE");
  assert.equal(deriveCalendarContext("Do I still have time left?"), "STILL_ON_TIME");
  assert.equal(deriveCalendarContext("Is today the last day?"), "TODAY");
});
await test("builder tomorrow context does not say 'today is the deadline'", () => {
  const s = buildCalendarRelativeSafeAnswer(SEC51, "Is my return due tomorrow?");
  assert.ok(/tomorrow is the operative filing deadline/i.test(s));
  assert.ok(!/today is the operative filing deadline/i.test(s));
});
await test("builder yesterday context", () => {
  assert.ok(/return was due yesterday/i.test(buildCalendarRelativeSafeAnswer(SEC51, "Was it due yesterday?")));
});
await test("builder states April 15 only when Sec 51 present", () => {
  assert.ok(/April 15/.test(buildCalendarRelativeSafeAnswer(SEC51, "due today?")));
  assert.ok(!/April 15/.test(buildCalendarRelativeSafeAnswer(NOAUTH, "due today?")));
});
await test("builder carries no unsafe present-day directive / no validator terminology", () => {
  const s = buildCalendarRelativeSafeAnswer(SEC51, "due tomorrow?") + buildCalendarRelativeSafeAnswer(NOAUTH, "due today?");
  assert.ok(!/file (?:it |your return )?today|due today|file now|submit today|calendar-relative|verifiedEligible/i.test(s));
});

// end-to-end: directive routes to the calendar-relative-deadline stage (before LLM)
await test("evaluateAnswerSupport routes 'please file today' to calendar-relative-deadline", async () => {
  const e = await evaluateAnswerSupport({ question: "When must I file?", answer: "### Short Answer\nApril 15.\n### Practical Meaning\nPlease file your annual income tax return today.", sources: SEC51 });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "calendar-relative-deadline");
});
await test("model-validator non-override (no client) for a directive", async () => {
  const e = await evaluateAnswerSupport({ question: "x", answer: "File now to avoid penalties.", sources: SEC51 });
  assert.equal(e.stage, "calendar-relative-deadline");
});

console.log(`\nphase-10a14-r11: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
