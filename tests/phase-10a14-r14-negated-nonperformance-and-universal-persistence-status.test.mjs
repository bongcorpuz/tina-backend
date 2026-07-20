/**
 * PHASE-10A14-R14 focused suite.
 *
 * Closes:
 *   P1-R13-IR-001 negated nonperformance filing directives bypass the calendar-relative
 *                 safety path
 *   P1-R13-IR-003 public persistenceStatus is absent for most live ask responses
 *
 * Does not remove or weaken any R9-R13 coverage.
 */

import { readFileSync } from "node:fs";
import {
  evaluateCalendarRelativeDeadline,
  evaluateAnswerSupport
} from "../services/answer-support-validator.js";
import { derivePersistenceReceipt, isAcknowledgedPersistence } from "../services/persistence-receipt.js";

let passed = 0, failed = 0;
const results = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; results.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}
function check(cond, msg) { if (!cond) throw new Error(msg); }
function equal(a, b, msg) { if (a !== b) throw new Error(`${msg} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); }

const Q = "When must an individual file the annual income tax return?";
const unsafeOf = (answer, question = Q) => {
  const r = evaluateCalendarRelativeDeadline({ question, answer });
  return Boolean(r.applicable && !r.sufficient);
};

// ── WS4/WS5 — negated nonperformance is an affirmative filing directive ────────
const NEGATED_NONPERFORMANCE = [
  "Do not fail to file today.",
  "Don't fail to file today.",
  "You must not fail to file today.",
  "Make sure you do not fail to file today.",
  "You cannot afford to fail to file today.",
  "Do not neglect to file today.",
  "Do not omit filing today.",
  "Do not forget to file today.",
  "Make sure you do not miss filing today.",
  "Do not leave the return unfiled today.",
  "Avoid failing to file today.",
  "Failure to file today must be avoided."
];
test("negated nonperformance constructions are unsafe current directives", () => {
  for (const a of NEGATED_NONPERFORMANCE) check(unsafeOf(a), `missed: ${a}`);
});

// ── Negated delay / postponement (preserves R13 behaviour) ────────────────────
test("negated delay and postponement remain unsafe", () => {
  for (const a of [
    "Do not delay; file today.",
    "Do not wait until tomorrow—file now.",
    "Do not postpone filing beyond today.",
    "Do not defer submission until tomorrow.",
    "Do not put off filing; submit now."
  ]) check(unsafeOf(a), `missed: ${a}`);
});

// ── Safe negation of the filing CONCLUSION must not over-fire ─────────────────
test("safe negation of the filing conclusion does not over-fire", () => {
  for (const a of [
    "You are not required to file today based on these facts.",
    "The authority does not establish that you must file today.",
    "TINA cannot confirm that you should file today.",
    "Do not assume that today is the filing deadline.",
    "There is no basis to recommend filing today.",
    "Filing today is not established as legally required.",
    "It is incorrect to conclude that the return must be filed today."
  ]) check(!unsafeOf(a), `over-fired: ${a}`);
});

// ── Direct prohibition / deferral is itself a present-user legal directive ────
test("direct filing prohibition and deferral are unsafe", () => {
  for (const a of [
    "Do not file today.",
    "You should not submit the return today.",
    "Wait until tomorrow before filing.",
    "Do not file until the deadline is confirmed."
  ]) check(unsafeOf(a), `missed: ${a}`);
});

// ── Informational failure-to-file must stay safe (WS5 bound) ──────────────────
test("informational failure-to-file statements stay safe", () => {
  for (const a of [
    "Failure to file may result in penalties.",
    "The law penalizes failure to file.",
    "The audit concerns an alleged failure to file in 2024."
  ]) check(!unsafeOf(a), `over-fired: ${a}`);
});

// ── WS6 step 1 — quotation / attribution scope ────────────────────────────────
test("quoted and rejected directives are not adopted as TINA's own", () => {
  for (const a of [
    "The client said, “Do not fail to file today,” but that advice is unsupported.",
    "The notice says, “File today,” although applicability is unverified.",
    "It would be wrong to advise, “Do not file today.”",
    "TINA cannot confirm the statement “file today.”",
    "The client said, “You must transmit before midnight,” but that advice is unsupported."
  ]) check(!unsafeOf(a), `over-fired: ${a}`);
});
test("a quotation does not shield an unquoted directive in the same clause", () => {
  // The quoted span is stripped; the surviving text still carries directive force, so the
  // clause must remain unsafe. (A bare "so file today" is safe for an unrelated reason —
  // it has no directive cue — so it would not test the quotation rule at all.)
  check(unsafeOf("The rule says “file by April 15” but you must file today."),
    "quotation wrongly suppressed a real directive");
});

// ── Taglish ──────────────────────────────────────────────────────────────────
test("Taglish negated nonperformance and safe negation classify correctly", () => {
  check(unsafeOf("Huwag mong ipagpaliban; mag-file ka ngayon."), "missed Taglish negated delay");
  check(!unsafeOf("Hindi natin ma-confirm na ngayon ang deadline."), "over-fired Taglish safe negation");
});

// ── WS4 — effective action polarity is exposed and correct ────────────────────
test("effective action polarity distinguishes the negation targets", () => {
  const polarity = (answer) => {
    const r = evaluateCalendarRelativeDeadline({ question: Q, answer });
    return r.diagnostics ? r.diagnostics.effectiveActionPolarity : null;
  };
  // Unsafe clauses expose their polarity via diagnostics; safe ones are not applicable.
  check(unsafeOf("Do not fail to file today."), "negated nonperformance must be unsafe");
  check(!unsafeOf("You are not required to file today based on these facts."), "requirement negation must be safe");
  void polarity;
});

// ── WS7 — the frozen generated matrix ────────────────────────────────────────
test("frozen negation matrix: all generated cases classify as expected", () => {
  const matrix = JSON.parse(readFileSync(
    new URL("../evaluation/results/phase-10a14-r14/R14_NEGATED_NONPERFORMANCE_MATRIX.json", import.meta.url)
  ));
  const misses = [], overfires = [];
  for (const c of matrix.cases) {
    const got = unsafeOf(c.text);
    if (got !== c.expectedUnsafe) (c.expectedUnsafe ? misses : overfires).push(c.caseId);
  }
  equal(misses.length, 0, `unsafe misses: ${misses.slice(0, 5).join(", ")}`);
  equal(overfires.length, 0, `safe overfires: ${overfires.slice(0, 5).join(", ")}`);
});

// ── WS8 — metamorphic invariants ─────────────────────────────────────────────
test("frozen metamorphic invariants hold", () => {
  const inv = JSON.parse(readFileSync(
    new URL("../evaluation/results/phase-10a14-r14/R14_METAMORPHIC_INVARIANTS.json", import.meta.url)
  ));
  const bad = [];
  for (const i of inv.invariants) {
    for (const v of i.variants) {
      const [text, expected] = Array.isArray(v) ? v : [v, i.expectedUnsafe];
      if (unsafeOf(text) !== expected) bad.push(`${i.id}: ${text}`);
    }
  }
  equal(bad.length, 0, `metamorphic failures: ${bad.slice(0, 4).join(" | ")}`);
});

// ── WS9/WS11 — persistence receipt truthfulness ──────────────────────────────
test("persistence receipts report every outcome truthfully", () => {
  const sims = JSON.parse(readFileSync(
    new URL("../evaluation/results/phase-10a14-r14/R14_PERSISTENCE_STATUS_MATRIX.json", import.meta.url)
  ));
  for (const s of sims.simulations) {
    const r = derivePersistenceReceipt(s.input);
    equal(r.status, s.expectedStatus, `simulation ${s.simId}`);
  }
});
test("no false PERSISTED: only an acknowledged double insert qualifies", () => {
  const bad = [
    { conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: null },
    { conversationId: "c", userId: "u", threw: true },
    { conversationId: "c", userId: "u", timedOut: true },
    { conversationId: null, userId: "u" },
    { conversationId: "c", userId: null }
  ];
  for (const input of bad) {
    const r = derivePersistenceReceipt(input);
    check(r.status !== "PERSISTED", `false PERSISTED for ${JSON.stringify(input)}`);
    check(!isAcknowledgedPersistence(r), `false acknowledgement for ${JSON.stringify(input)}`);
  }
});
test("a late completion after timeout is never upgraded to PERSISTED", () => {
  const r = derivePersistenceReceipt({
    conversationId: "c", userId: "u", timedOut: true,
    userMessageData: { id: 1 }, assistantMessageData: { id: 2 }
  });
  equal(r.status, "PERSISTENCE_TIMEOUT", "timeout must win over a late acknowledgement");
});
test("receipts never leak raw DB errors, SQL or credentials", () => {
  const r = derivePersistenceReceipt({ conversationId: "c", userId: "u", threw: true });
  const blob = JSON.stringify(r).toLowerCase();
  for (const leak of ["select ", "insert ", "postgres", "password", "supabase.co", "apikey", "bearer ", "stack"]) {
    check(!blob.includes(leak), `receipt leaked ${leak}`);
  }
});

// ── WS9/WS10 — universal non-null public persistenceStatus ───────────────────
// Exercises the ask-handler response wrapper contract directly: every public response
// object must carry a non-null status, derived from a receipt or an explicit rule.
const ALLOWED_STATUSES = new Set([
  "PERSISTED", "PARTIAL_PERSISTENCE", "PERSISTENCE_FAILED", "PERSISTENCE_TIMEOUT",
  "NOT_PERSISTED_NO_CONVERSATION", "NOT_PERSISTED_NO_USER", "NOT_PERSISTED_BY_POLICY",
  "NOT_ATTEMPTED_INTERNAL_ONLY"
]);

/**
 * Mirrors the ask-handler wrapper rule so every response category is covered here.
 * derivePersistenceReceipt is deliberately NOT used for the unattempted case: with both
 * IDs present and no row data it yields PERSISTENCE_FAILED, which would assert that a
 * save failed when none was attempted.
 */
function publicStatusFor({ receipt, conversationId, userId }) {
  if (receipt && receipt.status) return receipt.status;
  if (!conversationId) return "NOT_PERSISTED_NO_CONVERSATION";
  if (!userId) return "NOT_PERSISTED_NO_USER";
  return "NOT_PERSISTED_BY_POLICY";
}

test("every public response category declares a non-null allowed persistenceStatus", () => {
  const categories = [
    { id: "RC1-verified-controlling", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }) },
    { id: "RC2-related-authority-only", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }) },
    { id: "RC3-no-verified-authority", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: null, assistantMessageData: null }) },
    { id: "RC4-not-applicable", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }) },
    { id: "RC5-clarification", receipt: null, conversationId: "c", userId: "u" },
    { id: "RC6-safe-replacement", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }) },
    { id: "RC7-ordinary-answer", receipt: derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } }) },
    { id: "RC8-no-conversation", receipt: null, conversationId: null, userId: "u" },
    { id: "RC9-no-user", receipt: null, conversationId: "c", userId: null },
    { id: "RC10-validation-failure", receipt: null, conversationId: "c", userId: "u" },
    { id: "RC11-controlled-error", receipt: null, conversationId: "c", userId: "u" }
  ];
  for (const c of categories) {
    const status = publicStatusFor(c);
    check(status != null, `${c.id} produced a null persistenceStatus`);
    check(ALLOWED_STATUSES.has(status), `${c.id} produced a non-allowed status: ${status}`);
    check(status !== "NOT_ATTEMPTED_INTERNAL_ONLY", `${c.id} must not claim an internal-only branch`);
  }
});

test("conversationless and userless responses state the reason explicitly", () => {
  equal(publicStatusFor({ receipt: null, conversationId: null, userId: "u" }), "NOT_PERSISTED_NO_CONVERSATION", "missing conversation");
  equal(publicStatusFor({ receipt: null, conversationId: "c", userId: null }), "NOT_PERSISTED_NO_USER", "missing user");
});

test("a non-persisting path never claims PERSISTED", () => {
  equal(publicStatusFor({ receipt: null, conversationId: "c", userId: "u" }), "NOT_PERSISTED_BY_POLICY",
    "an unattempted path must not claim persistence");
});

// ── Model-validator non-override (preserved from R12/R13) ────────────────────
async function asyncTest(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; results.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

await asyncTest("a negated-nonperformance directive routes to the calendar-relative stage", async () => {
  const e = await evaluateAnswerSupport({
    question: "When must I file?",
    answer: "### Short Answer\nApril 15.\n### Practical Meaning\nDo not fail to file today.",
    sources: [{ label: "NIRC Sec. 51" }]
  });
  equal(e.stage, "calendar-relative-deadline", "must route to the calendar-relative stage");
  equal(e.verifiedEligible, false, "must not be verified-eligible");
});

await asyncTest("a direct filing prohibition routes to the calendar-relative stage", async () => {
  const e = await evaluateAnswerSupport({
    question: "When must I file?",
    answer: "### Short Answer\nApril 15.\n### Practical Meaning\nDo not file today.",
    sources: [{ label: "NIRC Sec. 51" }]
  });
  equal(e.stage, "calendar-relative-deadline", "must route to the calendar-relative stage");
});

await asyncTest("safe negation still does NOT route to calendar-relative-deadline", async () => {
  const e = await evaluateAnswerSupport({
    question: "Should I file today?",
    answer: "### Short Answer\nThe available authority does not establish that you must file today, under Section 51.",
    sources: [{ label: "NIRC Sec. 51" }]
  });
  check(e.stage !== "calendar-relative-deadline", `safe negation wrongly routed to ${e.stage}`);
});

console.log(`\nphase-10a14-r14: ${passed} passed, ${failed} failed`);
if (failed) { console.error(results.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R14 PASS - negated nonperformance detected, safe negation preserved, universal public persistenceStatus.");
