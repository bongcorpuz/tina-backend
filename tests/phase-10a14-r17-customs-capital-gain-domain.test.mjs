/**
 * PHASE-10A14-R17 — customs and capital-gain domain focused suite.
 *
 * Closes P1-R16-IR-003 without reopening the private-lease, ordinary-court, labor, SEC,
 * substring or tax-filing false-refusal closures accepted in R15/R16.
 *
 * Expectations are read from the inventory frozen at COMMIT 1. This suite never
 * recomputes an expectation from the classifier under test, and the inventory is never
 * retrofitted.
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

const INV = JSON.parse(readFileSync(new URL("../evaluation/results/phase-10a14-r17/R17_DOMAIN_PROBE_INVENTORY.json", import.meta.url)));
const decide = (q) => detectPhilippineTaxBoundary(q, "/ask");
const allows = (q) => decide(q).decision === "ALLOW";
const matches = (p) => {
  const got = allows(p.text) ? "ALLOW" : "NOT_ALLOW";
  return p.expected === "CLARIFY_OR_NOT_ALLOW" ? got === "NOT_ALLOW" : got === p.expected;
};
const cls = (c) => INV.probes.filter((p) => p.coverageClass === c);

test("the four exact independent-review failures now ALLOW", () => {
  for (const q of [
    "What customs duties apply to importing goods into the Philippines?",
    "What is the BOC customs duty deadline for imported goods?",
    "What are Philippine customs duties?",
    "What is the holding-period rule for an individual's capital gain on personal property?"
  ]) check(allows(q), `must reach the tax domain: ${q}`);
});

test("the phase-10a8 F14 pair both ALLOW", () => {
  check(allows("What is the holding-period rule for an individual's capital gain on personal property?"), "capital-gain probe");
  check(allows("What is Oplan Kandado and when can it be applied?"), "Oplan Kandado probe");
});

test("all 30 customs strong-tax controls ALLOW", () => {
  const bad = cls("customs_strong").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `false refusals: ${bad.join(", ")}`);
});

test("all 30 capital-gain strong-tax controls ALLOW", () => {
  const bad = cls("capital_gain_strong").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `false refusals: ${bad.join(", ")}`);
});

test("all 30 private-contract non-tax controls do NOT allow", () => {
  const bad = cls("private_contract_nontax").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `false allows: ${bad.join(", ")}`);
});

test("all 30 court / labor / SEC controls do NOT allow", () => {
  const bad = cls("court_labor_sec_nontax").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `false allows: ${bad.join(", ")}`);
});

test("all 30 weak-generic ambiguity controls do NOT falsely allow", () => {
  const bad = cls("weak_generic_ambiguity").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `false allows: ${bad.join(", ")}`);
});

test("all 30 Filipino / Taglish controls match", () => {
  const bad = cls("filipino_taglish").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `mismatches: ${bad.join(", ")}`);
});

test("all 20 substring traps match, including 'vat' inside 'private'", () => {
  const bad = cls("substring_trap").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `mismatches: ${bad.join(", ")}`);
  check(!allows("For a private lease payment, when is the deadline?"), "substring trap must stay closed");
  check(allows("For VAT on a lease payment, when is the deadline?"), "explicit VAT anchor must allow");
});

test("the 7 prior named false-refusal probes remain ALLOW", () => {
  const bad = cls("r15_false_refusal_closed").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `regressed: ${bad.join(", ")}`);
});

test("the broader adjacency family remains ALLOW", () => {
  const bad = cls("r15_adjacency_closed").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `regressed: ${bad.join(", ")}`);
});

test("explicit non-tax controls remain NOT ALLOW", () => {
  const bad = cls("explicit_nontax").filter((p) => !matches(p)).map((p) => p.probeId);
  equal(bad.length, 0, `regressed: ${bad.join(", ")}`);
});

test("material tax false refusal = 0 across the whole inventory", () => {
  const fr = INV.probes.filter((p) => p.expected === "ALLOW" && !allows(p.text)).map((p) => p.probeId);
  equal(fr.length, 0, `false refusals: ${fr.join(", ")}`);
});

test("a strong anchor overrides a non-tax object; removing it clarifies", () => {
  check(!allows("For a private lease payment, does the weekend rule automatically extend my deadline?"), "no anchor");
  check(allows("Is withholding tax on the private lease payment due this weekend?"), "anchor overrides");
  check(!allows("What are the duties on this shipment?"), "bare duties clarifies");
  check(allows("What are the customs duties on this shipment?"), "customs anchor allows");
});

test("the correction is category-based, not exact-question hardcoding", () => {
  // Questions absent from the frozen inventory must still resolve by category.
  for (const q of [
    "How is customs duty assessed on a consolidated shipment?",
    "Is the capital gain on a bond sale taxable to an individual?",
    "What tariff classification applies to imported textile machinery?"
  ]) check(allows(q), `unseen in-category question must allow: ${q}`);
  for (const q of [
    "When is my private storage unit payment due?",
    "What is the deadline to file a guardianship petition in court?"
  ]) check(!allows(q), `unseen non-tax question must not allow: ${q}`);
});

console.log(`\nphase-10a14-r17-domain: ${passed} passed, ${failed} failed`);
if (failed) { console.error(failures.join("\n")); process.exit(1); }
console.log("PHASE-10A14-R17 DOMAIN PASS — customs and capital-gain closed, prior closures preserved.");
