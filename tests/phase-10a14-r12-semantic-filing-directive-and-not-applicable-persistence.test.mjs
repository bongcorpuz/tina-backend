// PHASE-10A14-R12: structured semantic filing-directive coverage + NOT_APPLICABLE persistence
// contract. Closes P1-R11-IR-001 (recommendation/advice/urgency/inverted/passive/permission-
// pressure/Taglish bypasses) and P1-R11-IR-002 (domain-boundary persistence). Do not weaken
// R9/R10/R11 tests.

import assert from "node:assert/strict";
import { evaluateCalendarRelativeDeadline, evaluateAnswerSupport } from "../services/answer-support-validator.js";
let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); } }
const fires = (a) => evaluateCalendarRelativeDeadline({ answer: a }).sufficient === false;
const safe = (a) => evaluateCalendarRelativeDeadline({ answer: a }).applicable === false;

// P1-R11-IR-001 confirmed misses + families (must DETECT)
for (const [n, a] of [
  ["recommend today", "I recommend that you file today."],
  ["advise today", "I advise you to file today."],
  ["would advise today", "I would advise you to file today."],
  ["would need today", "You would need to file today."],
  ["prudent today", "It would be prudent to file today."],
  ["advisable today", "It is advisable to file today."],
  ["ought today", "You ought to file today."],
  ["encouraged today", "You are encouraged to file today."],
  ["urged submit today", "You are urged to submit today."],
  ["better file today", "Better file today."],
  ["prudent course", "The prudent course is to file today."],
  ["my recommendation", "My recommendation is to file today."],
  ["before midnight", "Send the return before midnight."],
  ["without delay", "File without delay."],
  ["within the day", "Submit within the day."],
  ["at once", "File at once."],
  ["right away", "Submit the return right away."],
  ["close of business", "File by close of business today."],
  ["this morning", "Please file this morning."],
  ["tonight", "Submit the return tonight."],
  ["inverted to avoid", "To avoid penalties, file today."],
  ["inverted before midnight", "Before midnight, submit the return."],
  ["inverted within day", "Within the day, complete the filing."],
  ["inverted asap", "As soon as possible, lodge the return."],
  ["passive must be filed today", "The return must be filed today."],
  ["passive should be submitted immediately", "The return should be submitted immediately."],
  ["passive within day", "Filing should be completed within the day."],
  ["permission+pressure can", "You can file today to avoid penalties."],
  ["permission+pressure may", "You may file today to avoid penalties."],
  ["taglish para maiwasan", "Para maiwasan ang penalty, mag-file ngayon."],
  ["taglish kaagad", "Mag-file ka kaagad."],
  ["taglish isumite agad", "Isumite mo agad ang return."],
  ["taglish bago hatinggabi", "Bago maghatinggabi, i-file mo ang return."],
  ["taglish sa loob ng araw", "Sa loob ng araw, tapusin ang filing."],
]) {
  await test(`detect: ${n}`, () => assert.equal(fires(a), true, n));
}

// safe controls (must NOT fire) — WS4/WS6/WS7 scope precision
for (const [n, a] of [
  ["general practitioner would advise", "A practitioner would normally advise a taxpayer to file by the applicable deadline."],
  ["general by deadline", "A taxpayer should file by the applicable statutory deadline for the taxable year."],
  ["counterfactual extension", "I would advise filing today only if an official extension made today the operative deadline."],
  ["counterfactual had passed", "Had the deadline passed, you would have been late."],
  ["negated recommendation", "I cannot confirm that you should file today without the taxable year and operative deadline."],
  ["conditional extension no directive", "If an extension applies, the deadline may be different from the general April 15 rule."],
  ["permission electronically", "You can file electronically through the applicable BIR eFPS or eBIRForms facility."],
  ["permission conditional confirmed", "You may file today only if today is the independently confirmed operative deadline."],
  ["general April 15", "The general deadline for the annual ITR is on or before April 15 under Section 51(C)."],
  ["ordinary penalty", "A surcharge and interest may apply when a return is filed late."],
]) {
  await test(`safe: ${n}`, () => assert.equal(safe(a), true, n));
}

// conditional-guard precision (WS7): "would/should/can/may/if" alone must not suppress a current directive
await test("would/should/could/may/can do not auto-suppress current directives", () => {
  assert.equal(fires("You could file today to avoid penalties."), true);
  assert.equal(fires("You may file today to avoid penalties."), true);
  assert.equal(fires("You should file today."), true);
});

// end-to-end + model-validator non-override
await test("evaluateAnswerSupport routes a recommendation directive to calendar-relative-deadline", async () => {
  const e = await evaluateAnswerSupport({ question: "When must I file?", answer: "### Short Answer\nApril 15.\n### Practical Meaning\nI recommend that you file today.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e.verifiedEligible, false);
  assert.equal(e.stage, "calendar-relative-deadline");
});
await test("no model client: directive still fails closed", async () => {
  const e = await evaluateAnswerSupport({ question: "x", answer: "File without delay.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e.stage, "calendar-relative-deadline");
});

console.log(`\nphase-10a14-r12: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
