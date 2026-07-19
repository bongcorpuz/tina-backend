// PHASE-10A14-R13: polarity-aware clause-frame directive classifier + acknowledged persistence
// receipt. Closes P1-R12-IR-001 (semantic bypasses), P1-R12-IR-002 (safe-negation overfire),
// P1-R12-IR-003 (false PERSISTED). Do not weaken R9–R12 tests.

import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateCalendarRelativeDeadline, evaluateAnswerSupport } from "../services/answer-support-validator.js";
import { derivePersistenceReceipt } from "../services/persistence-receipt.js";

let passed = 0, failed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}`); console.error(e?.stack || e); } }
const fires = (a) => evaluateCalendarRelativeDeadline({ answer: a }).sufficient === false;
const safe = (a) => evaluateCalendarRelativeDeadline({ answer: a }).applicable === false;

// P1-R12-IR-001 explicit misses
for (const [n, a] of [
  ["suggest today", "I suggest that you file today."],
  ["my advice today", "My advice is to file today."],
  ["may wish immediately", "You may wish to file today immediately."],
  ["best course today", "The best course is to file today."],
  ["best to submit today", "It is best to submit today."],
  ["strongly encourage", "I strongly encourage filing today."],
  ["may be wise today", "It may be wise to file today."],
  ["complete before COB", "Complete the filing before close of business."],
  ["may lodge surcharge", "You may lodge the return today to prevent a surcharge."],
  ["unless file penalty", "Unless you file today, penalties may apply."],
  ["nominalized advisable", "Filing today is advisable."],
  ["nominalized recommended", "Submission today is recommended."],
  ["should consider", "You should consider filing today."],
]) await test(`detect: ${n}`, () => assert.equal(fires(a), true, n));

// negated delay/postponement remain unsafe
for (const [n, a] of [
  ["do not delay", "Do not delay filing today."],
  ["do not wait", "Do not wait until tomorrow; file now."],
  ["do not postpone", "Do not postpone submission beyond today."],
]) await test(`detect delay-negation: ${n}`, () => assert.equal(fires(a), true, n));

// P1-R12-IR-002 safe negations (must NOT fire)
for (const [n, a] of [
  ["does not establish", "The available authority does not establish that you must file today."],
  ["do not assume", "Do not assume that today is the filing deadline."],
  ["evidence does not show", "The evidence does not show that today is the deadline."],
  ["not required based on facts", "You are not required to file today based only on these facts."],
  ["cannot confirm should", "TINA cannot confirm that you should file today."],
]) await test(`safe negation: ${n}`, () => assert.equal(safe(a), true, n));

// counterfactual / general controls (safe)
for (const [n, a] of [
  ["only-if confirmed", "You may file today only if today is the independently confirmed operative deadline."],
  ["extension counterfactual", "I would advise filing today only if an official extension made today the operative deadline."],
  ["general practitioner", "A practitioner would normally advise a taxpayer to file by the applicable deadline."],
  ["conditional extension", "If an extension applies, the deadline may differ from the general rule."],
]) await test(`safe control: ${n}`, () => assert.equal(safe(a), true, n));

// grammar matrix (WS9) — every generated case matches its expected classification
await test("grammar matrix: all generated cases classify as expected", () => {
  const m = JSON.parse(fs.readFileSync(new URL("../evaluation/results/phase-10a14-r13/R13_PRE_FIX_MANIFEST.json", import.meta.url), "utf8"));
  let mism = 0;
  for (const g of m.grammar) if (fires(g.text) !== g.expectedUnsafe) { mism++; if (mism <= 5) console.error("  grammar mismatch:", g.caseId, "expected", g.expectedUnsafe, "text:", g.text); }
  assert.equal(mism, 0, `${mism} grammar-matrix mismatches`);
});
// metamorphic invariants (WS10)
await test("metamorphic invariants hold", () => {
  const m = JSON.parse(fs.readFileSync(new URL("../evaluation/results/phase-10a14-r13/R13_PRE_FIX_MANIFEST.json", import.meta.url), "utf8"));
  let fail = 0;
  for (const inv of m.metamorphic) {
    const vs = inv.variants.map((v) => Array.isArray(v) ? { t: v[0], e: v[1] } : { t: v, e: inv.expectedUnsafe });
    for (const v of vs) if (fires(v.t) !== v.e) { fail++; console.error("  invariant fail:", inv.id, v.t); }
  }
  assert.equal(fail, 0);
});

// persistence receipt (WS11/WS12) — truthful statuses
await test("persistence receipt: PERSISTED only on acknowledged double insert", () => {
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }).status, "PERSISTED");
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: null }).status, "PARTIAL_PERSISTENCE");
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: null, assistantMessageData: null }).status, "PERSISTENCE_FAILED");
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: "u", threw: true }).status, "PERSISTENCE_FAILED");
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: "u", timedOut: true }).status, "PERSISTENCE_TIMEOUT");
  assert.equal(derivePersistenceReceipt({ conversationId: null, userId: "u" }).status, "NOT_PERSISTED_NO_CONVERSATION");
  assert.equal(derivePersistenceReceipt({ conversationId: "c", userId: null }).status, "NOT_PERSISTED_NO_USER");
});
await test("persistence receipt: memory-hook failure does NOT downgrade PERSISTED", () => {
  const r = derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 }, memoryHookOk: false });
  assert.equal(r.status, "PERSISTED"); assert.equal(r.persisted, true); assert.equal(r.memoryHookCompleted, false);
});
await test("persistence receipt: no false PERSISTED and no raw DB error leakage", () => {
  for (const o of [{ conversationId: "c", userId: "u", threw: true }, { conversationId: "c", userId: "u", timedOut: true }, { conversationId: "c", userId: "u" }]) {
    const r = derivePersistenceReceipt(o);
    assert.notEqual(r.status, "PERSISTED");
    assert.equal(r.persisted, false);
    assert.ok(!/password|supabase|postgres|sql|stack/i.test(JSON.stringify(r)), "no raw DB detail in receipt");
  }
});

// end-to-end + model-validator non-override
await test("evaluateAnswerSupport routes a recommendation directive to calendar-relative-deadline", async () => {
  const e = await evaluateAnswerSupport({ question: "When must I file?", answer: "### Short Answer\nApril 15.\n### Practical Meaning\nI suggest that you file today.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.equal(e.verifiedEligible, false); assert.equal(e.stage, "calendar-relative-deadline");
});
await test("safe negation does NOT route to calendar-relative-deadline", async () => {
  const e = await evaluateAnswerSupport({ question: "Should I file today?", answer: "### Short Answer\nThe available authority does not establish that you must file today, under Section 51.", sources: [{ label: "NIRC Sec. 51" }] });
  assert.notEqual(e.stage, "calendar-relative-deadline");
});

console.log(`\nphase-10a14-r13: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
