/**
 * PHASE-10A14-R15 focused suite (WS12).
 *
 * Closes:
 *   P1-R14-IR-001 semantic composition, action target, Filipino coverage
 *   P1-R14-IR-002 tax-adjacency routing false refusals
 *   P1-R14-IR-003 PERSISTED records lacking receipt evidence
 *   P2-R14-IR-008 LC5 clarification-first
 *   P2-R14-IR-009 exact staging runtime identity
 *
 * Does not remove or weaken any R9-R14 coverage.
 */

import { readFileSync } from "node:fs";
import { evaluateCalendarRelativeDeadline } from "../services/answer-support-validator.js";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";
import { derivePersistenceReceipt } from "../services/persistence-receipt.js";
import { finalizePublicPersistence } from "../ask-handler.js";
import { detectTaxComputationClarification, buildTaxComputationClarification } from "../services/tax-computation-clarification.js";
import { resolveRuntimeIdentity, publicRuntimeIdentity } from "../services/runtime-identity.js";

let passed = 0, failed = 0;
const failures = [];
const check = (c, m) => { if (!c) throw new Error(m); };
const equal = (a, b, m) => { if (a !== b) throw new Error(`${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); };
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

const Q = "When must an individual file the annual income tax return?";
const unsafeOf = (a) => { const r = evaluateCalendarRelativeDeadline({ question: Q, answer: a }); return Boolean(r.applicable && !r.sufficient); };
const inv = (f) => JSON.parse(readFileSync(new URL(`../evaluation/results/phase-10a14-r15/${f}`, import.meta.url)));

// ── LANE A ───────────────────────────────────────────────────────────────────
test("all 30 independent-review semantic probes classify correctly", () => {
  const bad = [];
  for (const p of inv("R15_SEMANTIC_PROBE_INVENTORY.json").independent) {
    if (unsafeOf(p.text) !== p.expectedUnsafe) bad.push(p.probeId);
  }
  equal(bad.length, 0, `mismatches: ${bad.join(", ")}`);
});

test("the 12 reported mismatches are individually closed", () => {
  const cases = [
    ["See to it that the return is not left unfiled today.", true],
    ["You cannot let today pass without filing.", true],
    ["The return must not remain outstanding after today.", true],
    ["Avoid leaving the return unsubmitted tonight.", true],
    ["Hold the return until tomorrow.", true],
    ["The authority does not establish today's deadline, but do not fail to file today.", true],
    ["Do not assume today is the deadline, and do not file until it is confirmed.", true],
    ["Siguraduhing hindi mo mapalampas ang filing ngayong araw.", true],
    ["Huwag hayaang lumipas ang araw nang hindi nakakapag-file.", true],
    ["Do not fail to verify whether filing is actually due today.", false],
    ["Hindi napatutunayan na kailangan mong mag-file ngayon.", false],
    ["Huwag ipalagay na ngayon ang deadline.", false]
  ];
  for (const [text, expected] of cases) equal(unsafeOf(text), expected, `mismatch: ${text}`);
});

test("a safe clause never suppresses an unsafe clause across a coordinator", () => {
  for (const t of [
    "The authority does not establish today's deadline, but do not fail to file today.",
    "We cannot confirm the deadline, however you must file today.",
    "Nothing establishes a due date; nevertheless, file now.",
    "Although the deadline is unconfirmed, do not fail to file today.",
    "Hindi tiyak ang deadline, ngunit mag-file ka ngayon."
  ]) check(unsafeOf(t), `compound bypass: ${t}`);
});

test("action target: verification is not a filing directive, filing is", () => {
  for (const t of [
    "Do not fail to verify whether filing is actually due today.",
    "Do not forget to check whether the return is due today.",
    "Do not fail to confirm the governing authority today.",
    "Make sure you preserve the filing evidence today."
  ]) check(!unsafeOf(t), `action-target overfire: ${t}`);
  for (const t of ["Do not fail to file the return today.", "Verify the deadline, then file today."]) {
    check(unsafeOf(t), `action-target miss: ${t}`);
  }
});

test("two individually safe clauses do not combine into a false positive", () => {
  check(!unsafeOf("File by the applicable statutory deadline, but do not fail to verify whether filing is due today."),
    "cross-clause contamination");
});

test("all 90 manual and all 1331 generated composition cases classify correctly", () => {
  const s = inv("R15_SEMANTIC_PROBE_INVENTORY.json");
  const bad = [];
  for (const p of [...s.manual, ...s.generated]) if (unsafeOf(p.text) !== p.expectedUnsafe) bad.push(p.probeId);
  equal(bad.length, 0, `mismatches: ${bad.slice(0, 6).join(", ")}`);
});

test("all 22 metamorphic invariants hold", () => {
  const bad = [];
  for (const i of inv("R15_SEMANTIC_PROBE_INVENTORY.json").metamorphic) {
    for (const [text, expected] of i.variants) if (unsafeOf(text) !== expected) bad.push(`${i.id}: ${text}`);
  }
  equal(bad.length, 0, `failures: ${bad.slice(0, 4).join(" | ")}`);
});

test("attributed assertion is reported; attributed imperative is adopted", () => {
  check(!unsafeOf("According to your accountant, the return is due today; we cannot confirm that."), "attributed assertion");
  check(unsafeOf("As the notice says, file today."), "attributed imperative must remain unsafe");
});

// ── LANE B ───────────────────────────────────────────────────────────────────
test("the 7 R14 live false refusals now reach the tax domain", () => {
  const bad = [];
  for (const p of inv("R15_ROUTING_PROBE_INVENTORY.json").falseRefusals) {
    if (detectPhilippineTaxBoundary(p.text, "/ask").decision !== "ALLOW") bad.push(p.probeId);
  }
  equal(bad.length, 0, `still rejected: ${bad.join(", ")}`);
});

test("tax-adjacent positives reach the tax domain", () => {
  const bad = [];
  for (const p of inv("R15_ROUTING_PROBE_INVENTORY.json").adjacentPositives) {
    if (detectPhilippineTaxBoundary(p.text, "/ask").decision !== "ALLOW") bad.push(p.probeId);
  }
  equal(bad.length, 0, `rejected: ${bad.join(", ")}`);
});

test("non-tax uses of 'file' stay out of the tax domain", () => {
  const bad = [];
  for (const p of inv("R15_ROUTING_PROBE_INVENTORY.json").negativeControls) {
    if (detectPhilippineTaxBoundary(p.text, "/ask").decision === "ALLOW") bad.push(p.probeId);
  }
  equal(bad.length, 0, `leaked into tax domain: ${bad.join(", ")}`);
});

test("fail-closed default is preserved for unrelated queries", () => {
  for (const q of ["What is photosynthesis?", "Who won the game last night?", "asdfgh"]) {
    check(detectPhilippineTaxBoundary(q, "/ask").decision !== "ALLOW", `wrongly allowed: ${q}`);
  }
});

// ── LANE B / P2-R14-IR-008 ───────────────────────────────────────────────────
test("LC5 is detected as a liability computation missing decisive facts", () => {
  const r = detectTaxComputationClarification("How much tax do I owe?");
  equal(r.applies, true, "LC5 must trigger clarification");
  check(r.missing.length >= 2, "must report the missing facts");
});

test("a fully specified computation is NOT intercepted", () => {
  const r = detectTaxComputationClarification("How much income tax do I owe as a self-employed professional for taxable year 2024 on PHP 1,200,000 gross?");
  equal(r.applies, false, "specified computations must reach the pipeline");
});

test("the clarification meets the WS7 contract", () => {
  const c = buildTaxComputationClarification("How much tax do I owe?");
  equal(c.responseKind, "FOCUSED_CLARIFICATION", "response kind");
  const numbered = (c.answer.match(/^\d\./gm) || []).length;
  check(numbered > 0 && numbered <= 4, `must ask at most four questions, got ${numbered}`);
  check(!/could not identify an indexed authority/i.test(c.answer), "must not reject for missing indexed authority");
  check(!/₱\s?\d|PHP\s?\d/.test(c.answer), "must not present a computed figure");
  check(/taxpayer type/i.test(c.answer) && /period/i.test(c.answer), "must request the decisive facts");
});

// ── LANE C ───────────────────────────────────────────────────────────────────
const ack = derivePersistenceReceipt({ conversationId: "c", userId: "u", userMessageData: { id: 1 }, assistantMessageData: { id: 2 } });
const failReceipt = derivePersistenceReceipt({ conversationId: "c", userId: "u", threw: true });

test("FIN1: a branch pre-populating PERSISTED without a receipt is corrected (the R14 defect)", () => {
  const body = { persistenceStatus: "PERSISTED" };
  finalizePublicPersistence(body, { receipt: null }, "c", "u");
  check(body.persistenceStatus !== "PERSISTED", "PERSISTED without an acknowledged receipt must not survive");
  check(body.persistenceReceipt && body.persistenceReceipt.persisted === false, "receipt must be present and truthful");
  equal(body.persistenceStatusClaimOverridden, "PERSISTED", "the overridden claim must be recorded");
});

test("FIN2: a receipt without a status yields the correct status", () => {
  const body = {};
  finalizePublicPersistence(body, { receipt: ack }, "c", "u");
  equal(body.persistenceStatus, "PERSISTED", "status from receipt");
  equal(body.persistenceReceipt.persisted, true, "receipt carried through");
});

test("FIN3: a branch claim contradicting the receipt is overridden", () => {
  const body = { persistenceStatus: "PERSISTED" };
  finalizePublicPersistence(body, { receipt: failReceipt }, "c", "u");
  equal(body.persistenceStatus, "PERSISTENCE_FAILED", "request-scoped truth wins");
  equal(body.persistenceStatusClaimOverridden, "PERSISTED", "claim recorded");
});

test("FIN4: a malformed receipt is replaced", () => {
  const body = { persistenceStatus: "PERSISTED", persistenceReceipt: "not-an-object" };
  finalizePublicPersistence(body, { receipt: ack }, "c", "u");
  equal(typeof body.persistenceReceipt, "object", "receipt must be a sanitized object");
  equal(body.persistenceReceipt.persisted, true, "receipt must reflect the acknowledgement");
});

test("FIN5: a no-attempt path is never reported as PERSISTENCE_FAILED", () => {
  const body = {};
  finalizePublicPersistence(body, { receipt: null }, "c", "u");
  equal(body.persistenceStatus, "NOT_PERSISTED_BY_POLICY", "no-attempt status");
  equal(body.persistenceReceipt.attempted, false, "attempted must be false");
});

test("FIN6/FIN7: missing identifiers are reported explicitly", () => {
  const a = {}; finalizePublicPersistence(a, { receipt: null }, null, "u");
  equal(a.persistenceStatus, "NOT_PERSISTED_NO_CONVERSATION", "missing conversation");
  const b = {}; finalizePublicPersistence(b, { receipt: null }, "c", null);
  equal(b.persistenceStatus, "NOT_PERSISTED_NO_USER", "missing user");
});

test("every PERSISTED response carries a complete sanitized receipt", () => {
  const body = {};
  finalizePublicPersistence(body, { receipt: ack }, "c", "u");
  for (const f of ["attempted", "persisted", "userMessagePersisted", "assistantMessagePersisted", "reasonCode", "safeDiagnostic"]) {
    check(Object.prototype.hasOwnProperty.call(body.persistenceReceipt, f), `receipt missing ${f}`);
  }
  equal(body.persistenceReceipt.userMessagePersisted, true, "user message");
  equal(body.persistenceReceipt.assistantMessagePersisted, true, "assistant message");
});

test("status and receipt can never contradict each other", () => {
  for (const r of [ack, failReceipt, derivePersistenceReceipt({ conversationId: "c", userId: "u", timedOut: true }), null]) {
    const body = { persistenceStatus: "PERSISTED" };
    finalizePublicPersistence(body, { receipt: r }, "c", "u");
    const isPersisted = body.persistenceStatus === "PERSISTED";
    equal(body.persistenceReceipt.persisted, isPersisted, "status/receipt coherence");
  }
});

test("the finalizer runs on every body shape, including error responses", () => {
  for (const body of [{ success: false, error: "x" }, { answer: "y" }, {}]) {
    finalizePublicPersistence(body, { receipt: null }, "c", "u");
    check(body.persistenceStatus != null, "status must never be null");
    check(body.persistenceReceipt != null, "receipt must never be null");
  }
});

test("receipts never leak raw DB errors, SQL or credentials", () => {
  const body = {};
  finalizePublicPersistence(body, { receipt: failReceipt }, "c", "u");
  const blob = JSON.stringify(body.persistenceReceipt).toLowerCase();
  for (const leak of ["select ", "insert ", "postgres", "password", "supabase.co", "apikey", "bearer ", "stack"]) {
    check(!blob.includes(leak), `leaked ${leak}`);
  }
});

test("all 10 receipt simulations remain truthful", () => {
  for (const s of inv("R15_PERSISTENCE_PROBE_INVENTORY.json").receiptSims) {
    equal(derivePersistenceReceipt(s.input).status, s.expectedStatus, `simulation ${s.simId}`);
  }
});

test("request isolation: one request's receipt never appears in another", () => {
  const storeA = { receipt: ack };
  const storeB = { receipt: failReceipt };
  const bodyA = {}, bodyB = {};
  finalizePublicPersistence(bodyA, storeA, "cA", "uA");
  finalizePublicPersistence(bodyB, storeB, "cB", "uB");
  equal(bodyA.persistenceStatus, "PERSISTED", "A keeps its own outcome");
  equal(bodyB.persistenceStatus, "PERSISTENCE_FAILED", "B keeps its own outcome");
  check(bodyA.persistenceReceipt !== bodyB.persistenceReceipt, "receipts must be distinct objects");
});

// ── LANE D ───────────────────────────────────────────────────────────────────
test("runtime identity reports a 40-hex commit or null, never a guess", () => {
  const id = resolveRuntimeIdentity({ force: true });
  check(id.runtimeCommit === null || /^[0-9a-f]{40}$/.test(id.runtimeCommit), `bad commit value: ${id.runtimeCommit}`);
  check(typeof id.runtimeCommitSource === "string" && id.runtimeCommitSource.length > 0, "source must be reported");
});

test("public identity exposes only the approved fields", () => {
  const keys = Object.keys(publicRuntimeIdentity()).sort();
  equal(keys.join(","), ["deploymentId", "runtimeCommit", "runtimeCommitSource", "service"].join(","),
    "identity must expose only commit, source, deployment and service");
});

console.log(`\nphase-10a14-r15: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R15 PASS — semantic composition, tax adjacency, universal persistence receipt, runtime identity.");
