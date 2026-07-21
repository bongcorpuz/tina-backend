// PHASE-10A14-R18 — context-aware substring / tax-signal hardening (P1-R17-IR1-002).
// Deterministic, synchronous, no I/O beyond reading the frozen oracle.
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";
import {
  NON_TAX_OBJECT_VETO_PATTERNS, TAX_COSIGNAL_PATTERNS
} from "../services/philippine-tax-boundary-patterns.js";
import fs from "node:fs";

const PATCH = "PHASE-10A14-R18-DOMAIN-HARDENING";
let passed = 0, failed = 0, assertions = 0;
const check = (cond, label) => { assertions++; if (!cond) throw new Error(`assertion failed: ${label}`); };
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

const decide = (q) => detectPhilippineTaxBoundary(q, "/ask");
const allows = (q) => decide(q).decision === "ALLOW";
const notAllows = (q) => !allows(q);

// ─── The three exact independent-review false allows ─────────────────────────
await test("the three exact P1-R17-IR1-002 false allows are closed", () => {
  for (const q of [
    "What is the taxable font in a CSS file?",
    "Is the BOC a band of chords?",
    "How do I close a VAT color palette?"
  ]) {
    const r = decide(q);
    check(r.decision !== "ALLOW", `must not allow: ${q} (got ${r.decision}/${r.reason})`);
    check(r.reason === "non_tax_object_veto", `closed by the veto, not by accident: ${q} -> ${r.reason}`);
  }
});

// ─── Required non-tax context families ───────────────────────────────────────
await test("every required non-tax context family vetoes an ambiguous tax homograph", () => {
  const families = {
    CSS: "What is the taxable value in this CSS rule?",
    font: "What is the taxable font here?",
    typeface: "Is this taxable typeface licensed?",
    code: "What is the taxable flag in this code?",
    software: "What is the taxable setting in this software?",
    variable: "What is the taxable variable called?",
    palette: "Where is the VAT palette?",
    color: "What VAT color is this?",
    paint: "Is the VAT paint dry?",
    graphics: "What VAT graphics preset is this?",
    band: "Is BOC a band?",
    chord: "What BOC chord is that?",
    music: "Is BOC music popular?",
    audio: "What does BOC mean in audio?",
    acronymDefinition: "What is a LOA in aviation terminology?"
  };
  for (const [family, q] of Object.entries(families)) {
    check(notAllows(q), `${family} family vetoes: ${q} (got ${decide(q).decision})`);
  }
});

// ─── Required tax co-signal families must still ALLOW ────────────────────────
await test("every required tax co-signal family still allows", () => {
  const families = {
    tax: "Is this subject to tax?",
    taxableIncome: "What is taxable income?",
    taxableCompensation: "Is this compensation taxable?",
    taxableSale: "Is this sale taxable?",
    vatReturn: "How do I file a VAT return?",
    vatInvoice: "What is a VAT invoice?",
    vatRegistration: "How do I complete VAT registration?",
    outputInputVat: "What is input VAT and output VAT?",
    bocCustoms: "What are the BOC customs duties on imported goods?",
    bureauOfCustoms: "What is the Bureau of Customs tariff classification procedure?",
    importDuty: "What is the import duty rate?",
    tariffClassification: "What is the tariff classification of these goods?",
    customsClassification: "What is the customs classification procedure?"
  };
  for (const [family, q] of Object.entries(families)) {
    check(allows(q), `${family} family allows: ${q} (got ${decide(q).decision})`);
  }
});

// ─── The eight mandated genuine tax queries ──────────────────────────────────
await test("the eight mandated genuine tax queries remain ALLOW", () => {
  for (const q of [
    "Is this compensation taxable?",
    "What income is taxable in the Philippines?",
    "Is this sale subject to VAT?",
    "How do I file a VAT return?",
    "What are the BOC customs duties on imported goods?",
    "What is the Bureau of Customs tariff classification?",
    "What is the capital-gain holding-period rule?",
    "When may BIR apply Oplan Kandado?"
  ]) check(allows(q), `must allow: ${q} (got ${decide(q).decision})`);
});

// ─── A co-signal must defeat the veto; a bare homograph must not ─────────────
await test("a tax co-signal defeats the veto but a bare homograph does not", () => {
  // Same non-tax object ("software"), different tax reading.
  check(allows("Is software subject to VAT?"), "'subject to VAT' is a co-signal and rescues a software query");
  check(notAllows("What is the VAT variable in this software?"), "a bare VAT token does not rescue a software query");
  check(allows("Is the sale of this font design subject to VAT?"), "a real VAT question about a font is still tax");
  check(notAllows("What is the taxable font in a CSS file?"), "a font question wearing a tax word is not tax");
});

await test("bare 'withholding' does not rescue a code query, but withholding tax still allows", () => {
  check(notAllows("What is the withholding pattern in this code?"), "a withholding pattern is a programming term");
  check(allows("What is withholding tax on rent?"), "withholding tax remains in domain");
  check(allows("What is expanded withholding tax?"), "expanded withholding remains in domain");
});

// ─── No global weakening: the terms still work on their own ──────────────────
await test("VAT, BOC, taxable, customs and capital-gain terms are not weakened generally", () => {
  for (const q of [
    "What is VAT?", "What is the VAT rate?", "Is the gain taxable?",
    "What is BOC?", "What are customs duties?", "What is a capital gain?",
    "What is capital gains tax?", "What are Philippine customs duties?"
  ]) check(allows(q), `term still works standalone: ${q} (got ${decide(q).decision})`);
});

// ─── Accepted R15-R17 closures preserved ─────────────────────────────────────
await test("accepted R15-R17 closures are preserved", () => {
  for (const q of [
    "What customs duties apply to importing goods into the Philippines?",
    "What is the BOC customs duty deadline for imported goods?",
    "What is the holding-period rule for an individual's capital gain on personal property?",
    "What is Oplan Kandado and when can it be applied?",
    "Is withholding tax on the private lease payment due this weekend?"
  ]) check(allows(q), `preserved closure: ${q} (got ${decide(q).decision})`);
  // MM-15-weak: R17 adjudicated this a fixture defect, not a runtime false allow. The
  // runtime reading is correct and must not change.
  check(allows("Is the gain taxable?"), "MM-15-weak still allows; it was never a runtime defect");
});

await test("prior non-tax closures are preserved", () => {
  for (const q of [
    "For a private lease payment, does the weekend rule automatically extend my deadline?",
    "Can a court filing deadline that falls on a holiday be moved to the next business day?",
    "What is the deadline to file a motion for reconsideration in a civil case?"
  ]) check(notAllows(q), `preserved non-tax closure: ${q} (got ${decide(q).decision})`);
});

// ─── False refusals closed by R18 ────────────────────────────────────────────
await test("the 26 R18-discovered false refusals are closed", () => {
  for (const q of [
    "What is MCIT?", "What is RCIT?", "What is included in the gross estate?",
    "How do I protest a deficiency assessment?", "What is the prescriptive period for assessment?",
    "What is a compromise penalty?", "What is the per-unit residential exemption?",
    "What is the optional standard deduction?", "What expenses are deductible?",
    "What is substantiation for deductions?", "Are representation expenses deductible?",
    "What is transfer pricing documentation?", "What is a permanent establishment?",
    "What is a registered business enterprise?", "What is the EOPT law?",
    "What is an Alphalist?", "What is SLSP?", "What are books of accounts?",
    "What is an official receipt requirement?", "What is a surcharge for late filing?",
    "What is an administrative protest?", "What is a reinvestigation request?",
    "What is a reconsideration request?", "What is a Notice for Informal Conference?",
    "What is a Formal Letter of Demand?", "What is a deficiency assessment?"
  ]) check(allows(q), `false refusal closed: ${q} (got ${decide(q).decision})`);
});

// ─── Genuinely ambiguous frames must still clarify, not allow ────────────────
await test("genuinely ambiguous frames still do not allow", () => {
  for (const q of [
    "Is this deductible?", "What is the exemption?", "Is there a surcharge?",
    "What is the penalty?", "What is the period?", "What is the deadline?",
    "What is the rate?", "What is the threshold?", "What is the holding period?",
    "What is the tariff?", "When is the return due?", "What is the filing deadline?"
  ]) check(notAllows(q), `ambiguous frame clarifies: ${q} (got ${decide(q).decision})`);
});

// ─── Metamorphic invariant ───────────────────────────────────────────────────
await test("metamorphic pairs flip on the object, holding the tax term constant", () => {
  const pairs = [
    ["Is this compensation taxable?", "Is this font taxable in CSS?"],
    ["What is the VAT on this sale?", "What is the VAT shade in this color palette?"],
    ["What are BOC customs duties?", "Is BOC a band of chords?"],
    ["What is the customs duty on imports?", "What is my duty roster this week?"],
    ["What is a capital asset for tax?", "Is capital a font style in typography?"],
    ["How do I get a BIR TIN?", "What is a TIN can made of?"],
    ["What is a FAN in a tax assessment?", "How loud is this cooling FAN?"],
    ["Can I appeal to the CTA?", "What does the CTA button do on this site?"]
  ];
  for (const [taxSide, nonTaxSide] of pairs) {
    check(allows(taxSide), `tax side allows: ${taxSide} (got ${decide(taxSide).decision})`);
    check(notAllows(nonTaxSide), `non-tax side does not: ${nonTaxSide} (got ${decide(nonTaxSide).decision})`);
  }
});

// ─── Whole frozen oracle ─────────────────────────────────────────────────────
await test("the whole frozen 483-probe oracle passes with zero material defects", () => {
  const oracle = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r18/DOMAIN_ORACLE.json", "utf8"));
  check(oracle.total === 483, "oracle is the frozen 483-probe set");
  let falseAllow = 0, falseRefusal = 0;
  for (const p of oracle.probes) {
    const d = decide(p.text).decision;
    const ok = p.expected === "ALLOW" ? d === "ALLOW" : d !== "ALLOW";
    if (!ok) (p.expected === "NOT_ALLOW" ? falseAllow++ : falseRefusal++);
  }
  check(falseAllow === 0, `material false allows: ${falseAllow}`);
  check(falseRefusal === 0, `material false refusals: ${falseRefusal}`);
});

// ─── Design constraints ──────────────────────────────────────────────────────
await test("the remedy is context-aware, not a list of exact-question exceptions", () => {
  // Unseen phrasings that are in NO frozen list must still be classified correctly.
  for (const q of [
    "Which taxable serif font renders best on mobile?",
    "Does the BOC quartet play in a minor chord?",
    "Can I sample the VAT hue from this photo palette?",
    "What is the taxable constant in this TypeScript module?"
  ]) check(notAllows(q), `unseen non-tax phrasing vetoed: ${q} (got ${decide(q).decision})`);
  for (const q of [
    "Is the sale of imported fabric subject to customs duty?",
    "How is taxable compensation computed for a rank-and-file employee?",
    "Must I issue a VAT invoice for a zero-rated sale?"
  ]) check(allows(q), `unseen tax phrasing allowed: ${q} (got ${decide(q).decision})`);
});

await test("veto and co-signal lists are category-based and non-empty", () => {
  check(NON_TAX_OBJECT_VETO_PATTERNS.length >= 15, "at least the required non-tax families");
  check(TAX_COSIGNAL_PATTERNS.length >= 14, "at least the required tax co-signal families");
  for (const p of [...NON_TAX_OBJECT_VETO_PATTERNS, ...TAX_COSIGNAL_PATTERNS]) {
    check(p instanceof RegExp, "every entry is a regular expression");
    // An exact-question exception would be a long anchored literal; none may exist.
    check(!/^\/\^.*\$\/$/.test(String(p)), `not an exact-question exception: ${p}`);
  }
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
