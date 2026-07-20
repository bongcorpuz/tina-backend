// PHASE-10A14-R16 — frozen probe inventory generator (COMMIT 1).
//
// GOVERNANCE: every expectation is authored or derived from the frozen specification in
// this file. This script does not import or consult the domain boundary, the journal, or
// any production classifier. Expectations are frozen BEFORE any implementation changes.

import fs from "node:fs";
import crypto from "node:crypto";

const D = "evaluation/results/phase-10a14-r16/";
const sha = (s) => crypto.createHash("sha256").update(JSON.stringify(s)).digest("hex");
const write = (n, o) => fs.writeFileSync(D + n, JSON.stringify(o, null, 2) + "\n");

// Frozen decision vocabulary. ALLOW = reaches the Philippine-tax domain.
// NOT_ALLOW = REJECT or CLARIFY (both are non-allow at the enforcement point).
const ALLOW = "ALLOW", NOT_ALLOW = "NOT_ALLOW", CLARIFY_OK = "CLARIFY_OR_NOT_ALLOW";

const manual = [];
const m = (probeId, cls, text, expected, note = "") =>
  manual.push({ probeId, suite: "domain-manual", coverageClass: cls, text, expected, note });

// ── A. The exact independent failures (must close) ───────────────────────────
m("IR-1", "independent_failure", "For a private lease payment, does the weekend rule automatically extend my deadline?", NOT_ALLOW, "no PH-tax anchor; 'vat' matched inside 'private'");
m("IR-2", "independent_failure", "Can a court filing deadline that falls on a holiday be moved to the next business day?", NOT_ALLOW, "generic court/filing/deadline only");

// ── B. Near-neighbour non-tax controls ───────────────────────────────────────
m("NN-1", "nontax_near", "When is my private loan payment deadline?", NOT_ALLOW);
m("NN-2", "nontax_near", "When is my rent installment due if it falls on a Sunday?", NOT_ALLOW);
m("NN-3", "nontax_near", "What is the school filing deadline for enrolment forms?", NOT_ALLOW);
m("NN-4", "nontax_near", "What is the deadline for filing corporate documents with the SEC?", NOT_ALLOW, "SEC filing without a tax question");
m("NN-5", "nontax_near", "What is the deadline for an ordinary civil-court appeal?", NOT_ALLOW);
m("NN-6", "nontax_near", "What is the deadline for filing a labor case?", NOT_ALLOW);
m("NN-7", "nontax_near", "When is the HR payroll cutoff?", NOT_ALLOW);
m("NN-8", "nontax_near", "How do I book a passport appointment before the deadline?", NOT_ALLOW);
m("NN-9", "nontax_near", "What is the software file submission deadline for the sprint?", NOT_ALLOW);
m("NN-10", "nontax_near", "What is the deadline for filing an insurance claim?", NOT_ALLOW);
m("NN-11", "nontax_near", "Can I file a police complaint after the deadline?", NOT_ALLOW);
m("NN-12", "nontax_near", "Is the interest on my personal bank loan due this weekend?", NOT_ALLOW);
m("NN-13", "nontax_near", "What is the registration deadline for the marathon?", NOT_ALLOW);
m("NN-14", "nontax_near", "Does the weekend rule extend my gym membership payment?", NOT_ALLOW);
m("NN-15", "nontax_near", "When is the invoice from my supplier due?", NOT_ALLOW);
m("NN-16", "nontax_near", "Can a court pleading deadline be moved to the next business day?", NOT_ALLOW);
m("NN-17", "nontax_near", "Is the assessment for my condo association dues extended?", NOT_ALLOW);
m("NN-18", "nontax_near", "When is the refund for my cancelled flight due?", NOT_ALLOW);
m("NN-19", "nontax_near", "What is the penalty for returning the rental car late?", NOT_ALLOW);
m("NN-20", "nontax_near", "Does my lease payment deadline move if it falls on a holiday?", NOT_ALLOW);

// ── C. Strong tax controls (must remain ALLOW) ───────────────────────────────
m("ST-1", "strong_tax", "What is the deadline for filing the BIR annual income tax return?", ALLOW);
m("ST-2", "strong_tax", "What is the VAT filing deadline for this quarter?", ALLOW);
m("ST-3", "strong_tax", "When is the withholding tax payment deadline?", ALLOW);
m("ST-4", "strong_tax", "Does the BIR Form 1701Q deadline move when it falls on a holiday?", ALLOW);
m("ST-5", "strong_tax", "What is the CTA deadline for filing a petition for review?", ALLOW);
m("ST-6", "strong_tax", "What is the CTA deadline for appealing an FDDA?", ALLOW);
m("ST-7", "strong_tax", "What is the deadline for submitting documents under a Letter of Authority?", ALLOW);
m("ST-8", "strong_tax", "What is the prescriptive period for a tax refund claim?", ALLOW);
m("ST-9", "strong_tax", "Is withholding tax on the private lease payment due this weekend?", ALLOW, "strong-tax override of a non-tax word");
m("ST-10", "strong_tax", "For VAT on residential lease, does the deadline move?", ALLOW, "strong-tax override");
m("ST-11", "strong_tax", "Does the BIR filing deadline move when the due date is a holiday?", ALLOW);
m("ST-12", "strong_tax", "What does NIRC Section 51 say about the filing deadline?", ALLOW);
m("ST-13", "strong_tax", "How do I respond to a BIR assessment notice?", ALLOW);
m("ST-14", "strong_tax", "What is the percentage tax filing deadline?", ALLOW);
m("ST-15", "strong_tax", "Does RMC 2024 change the eFPS filing deadline?", ALLOW);
m("ST-16", "strong_tax", "Is the taxpayer required to file if the deadline falls on a Sunday?", ALLOW);
m("ST-17", "strong_tax", "Is my income tax refund claim still within the prescriptive period?", ALLOW);
m("ST-18", "strong_tax", "What is the deadline for the quarterly percentage tax return?", ALLOW);

// ── D. Previously closed R15 false-refusal family (must stay ALLOW) ──────────
const r15FalseRefusals = [
  ["LN3", "Tell me not to forget to file my return today."],
  ["LN5", "Can you confirm I cannot afford to fail to file today?"],
  ["LN8", "Must failure to file today be avoided in my case?"],
  ["LQ1", "My accountant said, “Do not fail to file today.” Is that advice supported?"],
  ["LQ2", "The notice says, “File today.” Does that apply to me?"],
  ["LS2", "Does the authority establish that I must file today?"],
  ["LT1", "Huwag daw akong mag-fail mag-file ngayon. Tama ba iyon?"]
];
for (const [id, text] of r15FalseRefusals) m(id, "r15_false_refusal_closed", text, ALLOW, "R15 accepted closure — must not regress");
const r15Broader = [
  ["RA1", "Is my annual return due today?"], ["RA2", "Should I submit the return before midnight?"],
  ["RA3", "Do I need to file if I had no income?"], ["RA4", "The BIR notice says I must file. Is that correct?"],
  ["RA5", "My accountant told me the deadline passed. Is that right?"], ["RA6", "Kailangan ko bang mag-file ngayon?"],
  ["RA7", "Huwag daw akong mag-file hangga't hindi kumpirmado. Tama ba?"], ["RA8", "Is failure to file penalised?"],
  ["RA9", "Does the authority establish a filing deadline for me?"], ["RA10", "Is the return still outstanding if I filed late?"]
];
for (const [id, text] of r15Broader) m(id, "r15_adjacency_closed", text, ALLOW, "R15 adjacency family — must not regress");

// ── E. Ambiguity controls ────────────────────────────────────────────────────
m("AM-1", "ambiguous", "Does my lease deadline move?", CLARIFY_OK, "no tax anchor; must not falsely ALLOW");
m("AM-2", "ambiguous", "Can I file next business day?", CLARIFY_OK);
m("AM-3", "ambiguous", "Is the assessment deadline extended?", CLARIFY_OK);
m("AM-4", "ambiguous", "When is the return due?", CLARIFY_OK);

// ── F. Non-tax file-object controls (R15 closure, must not regress) ──────────
m("NF-1", "nontax_file", "Open the computer file.", NOT_ALLOW);
m("NF-2", "nontax_file", "How do I file a photo in the right folder?", NOT_ALLOW);
m("NF-3", "nontax_file", "Should I file a police complaint?", NOT_ALLOW);
m("NF-4", "nontax_file", "Save the spreadsheet file.", NOT_ALLOW);
m("NF-5", "nontax_file", "Attach a Word file to the email.", NOT_ALLOW);
m("NF-6", "nontax_file", "What is the weather in Manila today?", NOT_ALLOW);

// ── G. Additional coverage to meet the frozen 80-probe manual minimum ────────
m("NN-21", "nontax_near", "Is there a penalty if I return the library book after the due date?", NOT_ALLOW);
m("NN-22", "nontax_near", "What is the filing deadline for my visa application?", NOT_ALLOW);
m("NN-23", "nontax_near", "Does the payment deadline for my utility bill move on a holiday?", NOT_ALLOW);
m("NN-24", "nontax_near", "When is the registration deadline for the conference?", NOT_ALLOW);
m("NN-25", "nontax_near", "Can I file an appeal in my barangay dispute next week?", NOT_ALLOW);
m("ST-19", "strong_tax", "Is the eFPS filing deadline extended this month?", ALLOW);
m("ST-20", "strong_tax", "What is the documentary stamp tax deadline?", ALLOW);
m("ST-21", "strong_tax", "Does RR 2024 change the withholding tax remittance date?", ALLOW);
m("ST-22", "strong_tax", "What is the estate tax return filing deadline?", ALLOW);
m("ST-23", "strong_tax", "When is the donor's tax return due?", ALLOW);
m("ST-24", "strong_tax", "Is a BIR ruling required before the deadline?", ALLOW);
m("ST-25", "strong_tax", "What is the deadline under an eLA for submitting records?", ALLOW);
m("AM-5", "ambiguous", "Is the penalty waived if I pay late?", CLARIFY_OK);
m("AM-6", "ambiguous", "Does the holiday move my due date?", CLARIFY_OK);

// ── GENERATED near-neighbour permutations (>= 100) ───────────────────────────
// Frozen rule: a STRONG anchor makes it ALLOW regardless of the non-tax object;
// otherwise a weak generic term with a non-tax object is NOT_ALLOW.
const STRONG = [
  { id: "bir", frag: "BIR" }, { id: "vat_word", frag: "VAT" }, { id: "income_tax", frag: "income tax" },
  { id: "withholding_tax", frag: "withholding tax" }, { id: "cta", frag: "CTA" }, { id: "nirc", frag: "NIRC" },
  { id: "taxpayer", frag: "taxpayer" }, { id: "percentage_tax", frag: "percentage tax" }
];
const NONTAX_OBJ = [
  { id: "private_lease", frag: "private lease payment" }, { id: "court", frag: "court pleading" },
  { id: "labor", frag: "labor case" }, { id: "payroll", frag: "payroll cutoff" },
  { id: "passport", frag: "passport appointment" }, { id: "school", frag: "school enrolment" },
  { id: "insurance", frag: "insurance claim" }, { id: "loan", frag: "personal loan" }
];
const WEAK = [
  { id: "deadline", frag: "deadline" }, { id: "filing", frag: "filing" }, { id: "due_date", frag: "due date" },
  { id: "payment", frag: "payment" }, { id: "assessment", frag: "assessment" }, { id: "refund", frag: "refund" },
  { id: "interest", frag: "interest" }, { id: "penalty", frag: "penalty" }
];
const generated = [];
// weak + non-tax object => NOT_ALLOW
for (const w of WEAK) for (const o of NONTAX_OBJ) {
  generated.push({
    probeId: `G-weak-${w.id}-${o.id}`, suite: "domain-generated",
    params: { weak: w.id, nonTaxObject: o.id, strong: null },
    text: `What is the ${w.frag} for my ${o.frag}?`, expected: NOT_ALLOW
  });
}
// strong + non-tax object => ALLOW (strong-tax override)
for (const s of STRONG) for (const o of NONTAX_OBJ.slice(0, 6)) {
  generated.push({
    probeId: `G-strong-${s.id}-${o.id}`, suite: "domain-generated",
    params: { weak: null, nonTaxObject: o.id, strong: s.id },
    text: `For ${s.frag} purposes, what is the deadline on my ${o.frag}?`, expected: ALLOW
  });
}

// ── METAMORPHIC INVARIANTS (>= 20) ───────────────────────────────────────────
const metamorphic = [
  { id: "MM1", rule: "Adding a strong tax anchor to a non-tax question flips it to ALLOW.", variants: [["Does the weekend rule extend my private lease payment deadline?", NOT_ALLOW], ["Does the weekend rule extend the withholding tax on my private lease payment?", ALLOW]] },
  { id: "MM2", rule: "Removing the tax anchor flips ALLOW to NOT_ALLOW.", variants: [["What is the BIR filing deadline?", ALLOW], ["What is the filing deadline?", CLARIFY_OK]] },
  { id: "MM3", rule: "Court context alone is never tax.", variants: [["Can a court filing deadline that falls on a holiday be moved?", NOT_ALLOW], ["Can a CTA filing deadline that falls on a holiday be moved?", ALLOW]] },
  { id: "MM4", rule: "'private' must not be read as containing VAT.", variants: [["For a private lease payment, does the weekend rule extend my deadline?", NOT_ALLOW], ["For VAT on a lease payment, does the weekend rule extend my deadline?", ALLOW]] },
  { id: "MM5", rule: "Labor case filing is not tax filing.", variants: [["What is the deadline for filing a labor case?", NOT_ALLOW], ["What is the deadline for filing a tax case?", ALLOW]] },
  { id: "MM6", rule: "Weak word stacking does not create tax domain.", variants: [["What is the deadline, due date and penalty for my lease?", NOT_ALLOW]] },
  { id: "MM7", rule: "Tax-filing adjacency survives the weak-signal gate.", variants: [["Does the authority establish that I must file today?", ALLOW], ["Tell me not to forget to file my return today.", ALLOW]] },
  { id: "MM8", rule: "Filipino filing verbs remain tax-adjacent.", variants: [["Kailangan ko bang mag-file ngayon?", ALLOW]] },
  { id: "MM9", rule: "Non-tax file objects stay out.", variants: [["Open the computer file.", NOT_ALLOW], ["How do I file a photo in the right folder?", NOT_ALLOW]] },
  { id: "MM10", rule: "SEC document filing without tax is not tax.", variants: [["What is the deadline for filing corporate documents with the SEC?", NOT_ALLOW]] },
  { id: "MM11", rule: "BIR anchors an otherwise generic sentence.", variants: [["Is the deadline extended?", CLARIFY_OK], ["Is the BIR deadline extended?", ALLOW]] },
  { id: "MM12", rule: "Payroll cutoff is HR, not tax, absent withholding.", variants: [["When is the HR payroll cutoff?", NOT_ALLOW], ["When is the withholding tax remittance for payroll due?", ALLOW]] },
  { id: "MM13", rule: "Insurance claim filing is not tax.", variants: [["What is the deadline for filing an insurance claim?", NOT_ALLOW]] },
  { id: "MM14", rule: "Refund alone is not tax.", variants: [["When is the refund for my cancelled flight due?", NOT_ALLOW], ["When is my income tax refund due?", ALLOW]] },
  { id: "MM15", rule: "Assessment alone is not tax.", variants: [["Is the assessment for my condo dues extended?", NOT_ALLOW], ["Is the BIR assessment notice period extended?", ALLOW]] },
  { id: "MM16", rule: "Interest alone is not tax.", variants: [["Is the interest on my personal bank loan due this weekend?", NOT_ALLOW]] },
  { id: "MM17", rule: "Case variation does not change the decision.", variants: [["WHAT IS THE BIR FILING DEADLINE?", ALLOW], ["what is the deadline for filing a labor case?", NOT_ALLOW]] },
  { id: "MM18", rule: "Punctuation does not change the decision.", variants: [["Can a court filing deadline, that falls on a holiday, be moved?", NOT_ALLOW]] },
  { id: "MM19", rule: "NIRC anchors a generic deadline question.", variants: [["What does NIRC say about the deadline?", ALLOW]] },
  { id: "MM20", rule: "Fail-closed survives for unrelated queries.", variants: [["What is photosynthesis?", NOT_ALLOW], ["Who won the game last night?", NOT_ALLOW]] },
  { id: "MM21", rule: "A tax form number anchors the domain.", variants: [["Does the Form 1701Q deadline move on a holiday?", ALLOW]] },
  { id: "MM22", rule: "eFPS is a tax system anchor.", variants: [["Is the eFPS filing deadline extended?", ALLOW]] }
];

// ── CRASH PROBE INVENTORY (WS4) ──────────────────────────────────────────────
const crashProbes = [
  { probeId: "KILL-AFTER-ALLOCATED", stage: "after-allocated", expect: { killReturned: true, exitCode: null, signal: "SIGKILL", allocated: 1, started: 0, terminal: 0, classification: "KILLED_OR_INCOMPLETE" } },
  { probeId: "KILL-AFTER-STARTED", stage: "after-started", expect: { killReturned: true, exitCode: null, signal: "SIGKILL", allocated: 1, started: 1, terminal: 0, classification: "KILLED_OR_INCOMPLETE" } },
  { probeId: "KILL-DURING-CALL", stage: "during-call", expect: { killReturned: true, exitCode: null, signal: "SIGKILL", allocated: 1, started: 1, terminal: 0, classification: "KILLED_OR_INCOMPLETE", extraOuterAttempts: 0 } },
  { probeId: "NEG-EARLY-EXIT", stage: "negative-early-exit", expect: { mustFail: true, reason: "child exits normally before kill; harness must detect and fail visibly" } },
  { probeId: "NEG-MARKER-TIMEOUT", stage: "negative-marker-timeout", expect: { mustFail: true, reason: "readiness marker never written; harness must time out and fail visibly" } }
];

fs.mkdirSync(D, { recursive: true });

const domain = {
  task: "PHASE-10A14-R16",
  frozenSpecRule: "Expectations are authored in build-frozen-inventories.mjs. The production boundary is NEVER consulted to produce an expectation.",
  decisionVocabulary: { ALLOW: "reaches the Philippine-tax domain", NOT_ALLOW: "REJECT or CLARIFY", CLARIFY_OR_NOT_ALLOW: "must not falsely ALLOW; CLARIFY or REJECT both acceptable" },
  signalModel: {
    strongAllowsAlone: true,
    weakAloneAllows: false,
    weakPlusNonTaxObject: "NOT_ALLOW",
    strongOverridesNonTaxObject: true,
    taxFilingAdjacencyRemains: true,
    failClosedDefault: true
  },
  counts: { manual: manual.length, generated: generated.length, metamorphic: metamorphic.length, metamorphicVariants: metamorphic.reduce((n, i) => n + i.variants.length, 0) },
  manual, generated, metamorphic
};
domain.frozenSpecSha256 = sha({ manual, generated, metamorphic });
write("R16_DOMAIN_PROBE_INVENTORY.json", domain);
write("R16_CRASH_PROBE_INVENTORY.json", { task: "PHASE-10A14-R16", counts: { crashProbes: crashProbes.length }, crashProbes });

console.log(`manual=${manual.length} generated=${generated.length} metamorphic=${metamorphic.length}/${domain.counts.metamorphicVariants} crashProbes=${crashProbes.length}`);
console.log(`expected: ALLOW=${manual.filter(p=>p.expected===ALLOW).length} NOT_ALLOW=${manual.filter(p=>p.expected===NOT_ALLOW).length} CLARIFY_OK=${manual.filter(p=>p.expected===CLARIFY_OK).length}`);
console.log(`frozenSpecSha256: ${domain.frozenSpecSha256}`);
