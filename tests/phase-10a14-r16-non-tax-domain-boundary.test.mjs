/**
 * PHASE-10A14-R16 — non-tax domain-boundary focused suite.
 *
 * Closes P1-R15-IR-003: two independently discovered non-tax false allows, without
 * reopening the tax-filing false refusals R15 closed.
 *
 * Expectations are read from the frozen inventory generated at COMMIT 1; this suite never
 * recomputes an expectation from the classifier under test.
 */

import { readFileSync } from "node:fs";
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";

let passed = 0, failed = 0;
const failures = [];
const check = (c, m) => { if (!c) throw new Error(m); };
const equal = (a, b, m) => { if (a !== b) throw new Error(`${m} (expected ${JSON.stringify(b)}, got ${JSON.stringify(a)})`); };
function test(name, fn) {
  try { fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; failures.push(`${name}: ${e.message}`); console.log(`FAIL ${name}\n  ${e.message}`); }
}

const INV = JSON.parse(readFileSync(new URL("../evaluation/results/phase-10a14-r16/R16_DOMAIN_PROBE_INVENTORY.json", import.meta.url)));
const decide = (q) => detectPhilippineTaxBoundary(q, "/ask");
const allows = (q) => decide(q).decision === "ALLOW";
const matches = (p) => {
  const got = allows(p.text) ? "ALLOW" : "NOT_ALLOW";
  return p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
};

test("the two exact independent false allows are closed", () => {
  check(!allows("For a private lease payment, does the weekend rule automatically extend my deadline?"), "IR-1 must not be tax");
  check(!allows("Can a court filing deadline that falls on a holiday be moved to the next business day?"), "IR-2 must not be tax");
});

test("'private' is never read as containing VAT", () => {
  const r = decide("For a private lease payment, does the weekend rule automatically extend my deadline?");
  check(r.decision !== "ALLOW", "substring 'vat' inside 'private' must not allow");
  check(allows("For VAT on a lease payment, does the weekend rule extend my deadline?"), "an explicit VAT anchor must allow");
});

test("all frozen manual probes match their expectation", () => {
  const bad = INV.manual.filter((p) => !matches(p)).map((p) => `${p.probeId}(${p.expected})`);
  equal(bad.length, 0, `mismatches: ${bad.slice(0, 8).join(", ")}`);
});

test("all frozen generated near-neighbour permutations match", () => {
  const bad = INV.generated.filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `mismatches: ${bad.slice(0, 8).join(", ")}`);
});

test("all frozen metamorphic invariants hold", () => {
  const bad = [];
  for (const inv of INV.metamorphic) {
    for (const [text, expected] of inv.variants) {
      const got = allows(text) ? "ALLOW" : "NOT_ALLOW";
      const ok = expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === expected;
      if (!ok) bad.push(`${inv.id}: ${text.slice(0, 44)}`);
    }
  }
  equal(bad.length, 0, `failures: ${bad.slice(0, 5).join(" | ")}`);
});

test("false tax ALLOW = 0 across the whole inventory", () => {
  const falseAllow = [...INV.manual, ...INV.generated].filter((p) => p.expected !== "ALLOW" && allows(p.text));
  equal(falseAllow.length, 0, `false allows: ${falseAllow.slice(0, 6).map((p) => p.probeId).join(", ")}`);
});

test("material tax false refusal = 0 across the whole inventory", () => {
  const falseRefusal = [...INV.manual, ...INV.generated].filter((p) => p.expected === "ALLOW" && !allows(p.text));
  equal(falseRefusal.length, 0, `false refusals: ${falseRefusal.slice(0, 6).map((p) => p.probeId).join(", ")}`);
});

test("the seven R15 false-refusal probes remain in the tax domain", () => {
  const bad = INV.manual.filter((p) => p.coverageClass === "r15_false_refusal_closed" && !allows(p.text)).map((p) => p.probeId);
  equal(bad.length, 0, `regressed: ${bad.join(", ")}`);
});

test("the broader R15 adjacency family remains in the tax domain", () => {
  const bad = INV.manual.filter((p) => p.coverageClass === "r15_adjacency_closed" && !allows(p.text)).map((p) => p.probeId);
  equal(bad.length, 0, `regressed: ${bad.join(", ")}`);
});

test("a strong tax anchor overrides a non-tax object", () => {
  for (const q of [
    "Is withholding tax on the private lease payment due this weekend?",
    "For VAT on residential lease, does the deadline move?",
    "What is the CTA deadline for appealing an FDDA?",
    "Does the BIR filing deadline move when the due date is a holiday?"
  ]) check(allows(q), `strong-tax override failed: ${q}`);
});

test("weak generic signals alone never ALLOW", () => {
  for (const q of [
    "What is the filing deadline?", "When is the return due?",
    "Is the assessment deadline extended?", "Can I file next business day?"
  ]) check(!allows(q), `weak-only signal wrongly allowed: ${q}`);
});

test("weak signal with explicit non-tax context is rejected, not clarified", () => {
  const r = decide("What is the deadline for filing a labor case?");
  equal(r.decision, "REJECT", "explicit non-tax context must reject");
  equal(r.reason, "weak_signal_with_non_tax_context", "reason must be explicit");
});

test("weak signal without non-tax context invites clarification", () => {
  const r = decide("What is the filing deadline?");
  equal(r.decision, "CLARIFY", "ambiguous tax-adjacent must clarify");
  equal(r.reason, "weak_tax_signal_needs_context", "reason must be explicit");
});

test("non-tax file-object controls remain out of the tax domain", () => {
  for (const q of ["Open the computer file.", "How do I file a photo in the right folder?", "Should I file a police complaint?", "Save the spreadsheet file."]) {
    check(!allows(q), `leaked into tax domain: ${q}`);
  }
});

test("fail-closed default preserved for unrelated queries", () => {
  for (const q of ["What is photosynthesis?", "Who won the game last night?", "asdfgh"]) {
    check(!allows(q), `wrongly allowed: ${q}`);
  }
});

console.log(`\nphase-10a14-r16-domain: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R16 DOMAIN PASS — non-tax false allows closed, R15 closures preserved.");
