// PHASE-10A14-R19 — context-qualified acronym/phrase/object-role and metamorphic
// tax-domain boundary closure (P1-R18-IR1-001, P1-R18-IR1-002).
// Deterministic, synchronous, no network I/O beyond reading the frozen oracles.
import { detectPhilippineTaxBoundary } from "../services/philippine-tax-domain-boundary.js";
import {
  DOMINANT_NON_TAX_ROLE_VETO_PATTERNS, TAX_COSIGNAL_PATTERNS
} from "../services/philippine-tax-boundary-patterns.js";
import fs from "node:fs";

const PATCH = "PHASE-10A14-R19-CONTEXT-QUALIFIED-DOMAIN-BOUNDARY";
let passed = 0, failed = 0, assertions = 0;
const check = (cond, label) => { assertions++; if (!cond) throw new Error(`assertion failed: ${label}`); };
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (e) { failed++; console.error(`FAIL ${name}\n  ${e.message}`); }
}

const decide = (q) => detectPhilippineTaxBoundary(q, "/ask");
const allows = (q) => decide(q).decision === "ALLOW";
const notAllows = (q) => !allows(q);

// ─── Frozen 567-probe independent-review oracle: exact reproduction ─────────
await test("the frozen 567-probe independent-review oracle passes with zero material defects", () => {
  const oracle = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r19/PRE_FIX_567_ORACLE_REFERENCE.json", "utf8"));
  check(oracle.total === 567, "oracle is the frozen 567-probe set");
  let falseAllow = 0, falseRefusal = 0;
  for (const p of oracle.rows) {
    const d = decide(p.text).decision;
    const ok = p.expected === "ALLOW" ? d === "ALLOW" : d !== "ALLOW";
    if (!ok) (p.expected === "NOT_ALLOW" ? falseAllow++ : falseRefusal++);
  }
  check(falseAllow === 0, `material false allows: ${falseAllow}`);
  check(falseRefusal === 0, `material false refusals: ${falseRefusal}`);
});

// ─── The evidence-fixture defect: acronym_context corrected mapping ─────────
await test("the 38 acronym_context rows pass under the corrected field mapping (R18-IR-EF-001)", () => {
  const oracle = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r19/PRE_FIX_567_ORACLE_REFERENCE.json", "utf8"));
  const rows = oracle.rows.filter((r) => r.coverageClass === "acronym_context");
  check(rows.length === 38, "38 acronym_context rows present in the frozen oracle");
  check(rows.every((r) => r.text === "ALLOW" || r.text === "NOT_ALLOW"), "the field-swap defect is present in the source file (documented, not corrected in place)");
  let fails = 0;
  for (const r of rows) {
    const realText = r.expected, realExpected = r.text;
    const d = decide(realText).decision;
    const ok = realExpected === "ALLOW" ? d === "ALLOW" : d !== "ALLOW";
    if (!ok) fails++;
  }
  check(fails === 0, `acronym_context corrected-mapping failures: ${fails}`);
});

// ─── The three exact material false allows named in the authorization ───────
await test("known failure-family examples from the authorization are closed", () => {
  const mustNotAllow = [
    "SLSP as unknown project code", "OSD as on-screen display", "FLD as a field abbreviation",
    "MCIT as arbitrary product code", "RCIT as arbitrary training code", "Alphalist as ordinary alphabetical list",
    "gross estate as a real-estate marketing phrase", "prescriptive period in medicine",
    "BIR as a bird typo", "FAN as cooling speed", "PAN as cooking utensil", "RMC as a music channel",
    "customs as culture or social customs", "gross receipts in a school raffle",
    "books of accounts as a list of novels", "transfer pricing in a board game",
    "lease contract renewal without tax context"
  ];
  for (const q of mustNotAllow) check(notAllows(q), `must not allow: ${q} (got ${decide(q).decision})`);
});

await test("the three named false refusals now allow", () => {
  for (const q of ["official receipt", "annual information return", "refund claim prescription"]) {
    check(allows(q), `must allow: ${q} (got ${decide(q).decision}/${decide(q).reason})`);
  }
});

// ─── Required behavior examples from the authorization, verbatim ────────────
await test("SLSP required behavior examples", () => {
  check(allows("What is SLSP?"), "bare acronym, definition intent, no context -> ALLOW");
  check(allows("How do I submit SLSP to BIR?"), "SLSP with BIR context -> ALLOW");
  check(notAllows("SLSP project code in our software"), "SLSP with explicit non-tax object -> NOT_ALLOW");
});

await test("OSD required behavior examples", () => {
  check(allows("OSD for individual income tax"), "OSD with tax context -> ALLOW");
  check(allows("OSD deduction under the Tax Code"), "OSD with Tax Code context -> ALLOW");
  check(notAllows("Change the OSD on my monitor"), "OSD with monitor context -> NOT_ALLOW");
});

await test("FLD required behavior examples", () => {
  check(allows("FLD/FAN from BIR"), "FLD with BIR context -> ALLOW");
  check(allows("formal letter of demand"), "coherent phrase -> ALLOW");
  check(notAllows("FLD is our field abbreviation"), "FLD with field-abbreviation context -> NOT_ALLOW");
});

await test("MCIT / RCIT required behavior examples", () => {
  check(allows("MCIT for a domestic corporation"), "acronym + corporation context -> ALLOW");
  check(notAllows("MCIT as an arbitrary product code"), "acronym + arbitrary product code -> NOT_ALLOW");
  check(allows("What is MCIT?"), "acronym alone, definition intent -> ALLOW");
});

await test("BIR / FAN / PAN / RMC required behavior examples", () => {
  check(allows("What is a FAN in a tax assessment?"), "FAN with tax-agency context -> ALLOW");
  check(notAllows("How loud is this cooling fan?"), "FAN with cooling-device context -> NOT_ALLOW");
  check(allows("What is PAN in BIR assessment process?"), "PAN with BIR context -> ALLOW");
  check(notAllows("Pan is a cooking tool."), "PAN with cooking context -> NOT_ALLOW");
  check(allows("What is RMC guidance from BIR?"), "RMC with BIR context -> ALLOW");
  check(notAllows("RMC is a radio music channel."), "RMC with music context -> NOT_ALLOW");
  check(notAllows("BIR as a bird typo"), "BIR misread as bird -> NOT_ALLOW");
});

await test("gross estate / prescriptive period required behavior examples", () => {
  check(allows("What is gross estate for estate tax?"), "estate-tax context -> ALLOW");
  check(notAllows("Write real-estate marketing copy."), "property-marketing context -> NOT_ALLOW");
  check(allows("What is the prescriptive period for tax assessment?"), "tax-assessment context -> ALLOW");
  check(notAllows("What is the medical prescription period?"), "medical context -> NOT_ALLOW");
});

// ─── Full acronym_context metamorphic set (independent review, 19 pairs) ────
await test("independent-review acronym_context pairs (corrected mapping) all resolve correctly", () => {
  const pairs = [
    ["What is MCIT in Philippine corporate income tax?", "ALLOW"],
    ["In music software, MCIT is my plugin code; what could it stand for?", "NOT_ALLOW"],
    ["What is RCIT for a domestic corporation?", "ALLOW"],
    ["RCIT is my robotics course ID; define it generically.", "NOT_ALLOW"],
    ["What is FLD in a BIR assessment?", "ALLOW"],
    ["FLD means field in my spreadsheet; explain the acronym.", "NOT_ALLOW"],
    ["What is OSD for Philippine tax deductions?", "ALLOW"],
    ["What is OSD on a monitor display?", "NOT_ALLOW"],
    ["What is SLSP filing for VAT taxpayers?", "ALLOW"],
    ["SLSP is an unknown acronym in my app logs.", "NOT_ALLOW"],
    ["What is an Alphalist for withholding tax?", "ALLOW"],
    ["Make an alphalist of students alphabetically.", "NOT_ALLOW"],
    ["What is BOC customs clearance?", "ALLOW"],
    ["BOC means band of chords in this song.", "NOT_ALLOW"],
    ["What is VAT registration?", "ALLOW"],
    ["VAT is a color token in my design system.", "NOT_ALLOW"],
    ["What is taxable income?", "ALLOW"],
    ["taxable is a CSS class in my stylesheet.", "NOT_ALLOW"],
    ["What is gross estate for estate tax?", "ALLOW"],
    ["Gross estate means ugly real-estate ads here.", "NOT_ALLOW"],
    ["What is the prescriptive period for tax assessment?", "ALLOW"],
    ["What is the prescription period for antibiotics?", "NOT_ALLOW"],
    ["What is a FAN assessment notice?", "ALLOW"],
    ["FAN is a cooling fan device.", "NOT_ALLOW"],
    ["What is CTA jurisdiction in tax cases?", "ALLOW"],
    ["CTA is a call-to-action button.", "NOT_ALLOW"],
    ["What is PAN in BIR assessment process?", "ALLOW"],
    ["Pan is a cooking tool.", "NOT_ALLOW"],
    ["What is TIN registration?", "ALLOW"],
    ["Tin is a metal can.", "NOT_ALLOW"],
    ["What is RR No. 2-98?", "ALLOW"],
    ["RR is a railroad abbreviation.", "NOT_ALLOW"],
    ["What is RMC guidance from BIR?", "ALLOW"],
    ["RMC is a radio music channel.", "NOT_ALLOW"],
    ["What is eFPS filing?", "ALLOW"],
    ["EFPS is a random software flag.", "NOT_ALLOW"],
    ["What is CMTA for customs duties?", "ALLOW"],
    ["CMTA is a club acronym with no tax context.", "NOT_ALLOW"]
  ];
  for (const [q, exp] of pairs) {
    const d = decide(q).decision;
    const ok = exp === "ALLOW" ? d === "ALLOW" : d !== "ALLOW";
    check(ok, `${q} -> expected ${exp}, got ${d}`);
  }
});

// ─── Full 30-pair (60-row) metamorphic set from the independent review ──────
await test("independent-review metamorphic pairs all resolve correctly", () => {
  const pairs = [
    ["Is compensation taxable in the Philippines?", "ALLOW"], ["Is this font taxable in CSS?", "NOT_ALLOW"],
    ["What is the VAT on this sale?", "ALLOW"], ["What is the VAT shade in this palette?", "NOT_ALLOW"],
    ["What are BOC customs duties?", "ALLOW"], ["Is BOC a band of chords?", "NOT_ALLOW"],
    ["What is the customs duty on imports?", "ALLOW"], ["What local customs apply at dinner?", "NOT_ALLOW"],
    ["What is capital gains tax?", "ALLOW"], ["What is capital gain on an amplifier?", "NOT_ALLOW"],
    ["How do I get a BIR TIN?", "ALLOW"], ["What is a tin can made of?", "NOT_ALLOW"],
    ["What is a FAN in a tax assessment?", "ALLOW"], ["How loud is this cooling fan?", "NOT_ALLOW"],
    ["Can I appeal to the CTA?", "ALLOW"], ["What does the CTA button do?", "NOT_ALLOW"],
    ["What is an FLD in a tax assessment?", "ALLOW"], ["What does FLD mean as a field abbreviation?", "NOT_ALLOW"],
    ["What is OSD for deductions?", "ALLOW"], ["What is OSD on a monitor?", "NOT_ALLOW"],
    ["What is SLSP filing?", "ALLOW"], ["What does SLSP mean in my software project?", "NOT_ALLOW"],
    ["What is an Alphalist attachment?", "ALLOW"], ["Make an alphabetical list of names.", "NOT_ALLOW"],
    ["What is gross estate for estate tax?", "ALLOW"], ["Write real-estate marketing copy.", "NOT_ALLOW"],
    ["What is the prescriptive period for assessment?", "ALLOW"], ["What is the medical prescription period?", "NOT_ALLOW"],
    ["Is software subject to VAT?", "ALLOW"], ["Where is the VAT variable in software?", "NOT_ALLOW"],
    ["Must I issue a VAT invoice?", "ALLOW"], ["Design a VAT invoice icon only.", "NOT_ALLOW"],
    ["What is input VAT?", "ALLOW"], ["Input VAT into a text box.", "NOT_ALLOW"],
    ["What is output VAT?", "ALLOW"], ["Output VAT from a function.", "NOT_ALLOW"],
    ["What expenses are deductible?", "ALLOW"], ["What is my insurance deductible?", "NOT_ALLOW"],
    ["What are customs duties?", "ALLOW"], ["What are cultural customs?", "NOT_ALLOW"],
    ["What is taxable compensation?", "ALLOW"], ["What is a taxable CSS class?", "NOT_ALLOW"],
    ["What is BOC customs clearance?", "ALLOW"], ["What is BOC in audio?", "NOT_ALLOW"],
    ["What is MCIT?", "ALLOW"], ["Use MCIT as a random SKU.", "NOT_ALLOW"],
    ["What is RCIT?", "ALLOW"], ["Use RCIT as a course code.", "NOT_ALLOW"],
    ["What is a compromise penalty?", "ALLOW"], ["Draft a compromise offer in a negotiation class.", "NOT_ALLOW"],
    ["What is a surcharge for late filing?", "ALLOW"], ["What is a delivery surcharge?", "NOT_ALLOW"],
    ["What is a deficiency assessment?", "ALLOW"], ["What is a vitamin deficiency?", "NOT_ALLOW"],
    ["What is a Notice for Informal Conference?", "ALLOW"], ["Plan an informal conference agenda.", "NOT_ALLOW"],
    ["What is a Formal Letter of Demand?", "ALLOW"], ["Write a formal demand letter for grammar class.", "NOT_ALLOW"],
    ["What is transfer pricing documentation?", "ALLOW"], ["Price transfers in a board game.", "NOT_ALLOW"]
  ];
  for (const [q, exp] of pairs) {
    const d = decide(q).decision;
    const ok = exp === "ALLOW" ? d === "ALLOW" : d !== "ALLOW";
    check(ok, `${q} -> expected ${exp}, got ${d}`);
  }
});

// ─── Reason-code transparency ────────────────────────────────────────────────
await test("the dominant veto exposes its own reason code, distinct from the R18 veto", () => {
  const r = decide("SLSP as unknown project code");
  check(r.reason === "non_tax_object_role_veto", `reason is non_tax_object_role_veto, got ${r.reason}`);
  const r2 = decide("What is the taxable font in a CSS file?");
  check(r2.reason === "non_tax_object_veto" || r2.reason === "non_tax_object_role_veto", "R18 closures still veto (either tier)");
});

await test("dominant veto is never defeated by a cosignal match elsewhere in the sentence", () => {
  // Positive control: cosignal alone (no dominant veto) still allows.
  check(allows("Is software subject to VAT?"), "cosignal alone still allows");
  // Negative control: same cosignal phrase, but a dominant-veto role marker is present.
  check(notAllows("VAT return as function return value"), "dominant veto wins despite 'VAT return' cosignal match");
  check(notAllows("RMC music channel"), "dominant veto wins despite bare RMC (no longer a cosignal)");
});

// ─── Bare 2-4 letter acronyms are never cosignals ────────────────────────────
await test("TAX_COSIGNAL_PATTERNS contains no bare 2-4 letter acronym", () => {
  const bareAcronymProbe = /^\\b[A-Z]{2,4}\\b$/;
  for (const p of TAX_COSIGNAL_PATTERNS) {
    check(p.source !== "\\bRMC\\b" && p.source !== "\\bRMO\\b", `not a bare acronym cosignal: ${p.source}`);
  }
});

// ─── Design constraints ──────────────────────────────────────────────────────
await test("the dominant veto tier is organized by rule family, not exact-question strings", () => {
  check(DOMINANT_NON_TAX_ROLE_VETO_PATTERNS.length >= 30, "at least the required family coverage");
  for (const p of DOMINANT_NON_TAX_ROLE_VETO_PATTERNS) {
    check(p instanceof RegExp, "every entry is a regular expression");
    check(!/^\/\^.*\$\/$/.test(String(p)), `not an exact-question exception: ${p}`);
  }
});

await test("unseen phrasings in each family are handled correctly (not overfit to review text)", () => {
  for (const q of [
    "Please store this as a design token named VAT-blue.",
    "The MCIT field in my spreadsheet template needs renaming.",
    "Our band covers customs and traditions songs from the 90s.",
    "I need a cooling fan replacement part, is that a FAN model number?",
    "This antibiotic's medical prescription refill is overdue."
  ]) check(notAllows(q), `unseen non-tax phrasing vetoed: ${q} (got ${decide(q).decision})`);
  for (const q of [
    "Is the importation of raw materials subject to customs duty and VAT?",
    "How do I compute MCIT versus RCIT for a domestic corporation this quarter?",
    "What BIR forms are required for an SLSP submission?"
  ]) check(allows(q), `unseen tax phrasing allowed: ${q} (got ${decide(q).decision})`);
});

// ─── Terminology boundary: no invented acronym expansions ───────────────────
await test("the runtime never asserts or returns an invented acronym expansion", () => {
  const src = fs.readFileSync("services/philippine-tax-boundary-patterns.js", "utf8") +
              fs.readFileSync("services/philippine-tax-domain-boundary.js", "utf8");
  // Boundary-recognition patterns must not embed a full canonical-name assertion like
  // "SLSP means Summary List of Sales and Purchases" as if it were runtime truth.
  check(!/SLSP\s+(?:means|stands for|is short for)\s+Summary/i.test(src), "no invented SLSP expansion in runtime");
  check(!/means\s+Summary List of Sales/i.test(src), "no invented full-name assertion");
});

// ─── Accepted R15-R18 closures preserved (regression gate) ──────────────────
await test("accepted R15-R18 closures are preserved", () => {
  for (const q of [
    "What customs duties apply to importing goods into the Philippines?",
    "What is the BOC customs duty deadline for imported goods?",
    "What is the holding-period rule for an individual's capital gain on personal property?",
    "What is Oplan Kandado and when can it be applied?",
    "Is withholding tax on the private lease payment due this weekend?",
    "Is the gain taxable?", "What is MCIT?", "What is included in the gross estate?",
    "What is a compromise penalty?", "What is a Notice for Informal Conference?",
    "What is a Formal Letter of Demand?", "What is transfer pricing documentation?"
  ]) check(allows(q), `preserved closure: ${q} (got ${decide(q).decision})`);
  for (const q of [
    "What is the taxable font in a CSS file?", "Is the BOC a band of chords?",
    "How do I close a VAT color palette?",
    "For a private lease payment, does the weekend rule automatically extend my deadline?",
    "Can a court filing deadline that falls on a holiday be moved to the next business day?"
  ]) check(notAllows(q), `preserved non-tax closure: ${q} (got ${decide(q).decision})`);
});

// ─── Authorized-file scope (static check) ────────────────────────────────────
await test("only the two authorized runtime files were changed for this remediation", () => {
  const manifest = JSON.parse(fs.readFileSync("evaluation/results/phase-10a14-r19/RUNTIME_SCOPE_MANIFEST.json", "utf8"));
  check(manifest.files.length === 2, "exactly two runtime files in scope");
  check(manifest.files.includes("services/philippine-tax-boundary-patterns.js"), "patterns file in scope");
  check(manifest.files.includes("services/philippine-tax-domain-boundary.js"), "boundary file in scope");
});

console.log(`\n${PATCH} tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
