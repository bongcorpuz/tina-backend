// PHASE-10A14-R17 — frozen domain probe inventory (COMMIT 1).
//
// GOVERNANCE: every expectation is authored here and frozen BEFORE any runtime change.
// This script does not import or consult the domain boundary. Expectations are never
// retrofitted after outcomes are known.

import fs from "node:fs";
import crypto from "node:crypto";

const D = "evaluation/results/phase-10a14-r17/";
const sha = (s) => crypto.createHash("sha256").update(JSON.stringify(s)).digest("hex");

const ALLOW = "ALLOW";
const NOT_ALLOW = "NOT_ALLOW";                 // REJECT or CLARIFY, both acceptable
const CLARIFY_OK = "CLARIFY_OR_NOT_ALLOW";     // must not falsely ALLOW

const probes = [];
const p = (probeId, cls, text, expected, note = "") =>
  probes.push({ probeId, coverageClass: cls, text, expected, note });

// ── A. CUSTOMS STRONG-TAX CONTROLS (30) — must ALLOW ────────────────────────
const customs = [
  "What customs duties apply to importing goods into the Philippines?",
  "What is the BOC customs duty deadline for imported goods?",
  "What are Philippine customs duties?",
  "How is customs duty computed on imported machinery?",
  "What is the tariff rate for imported vehicles?",
  "Does the Bureau of Customs require a duty deposit?",
  "What does the CMTA say about post-clearance audit?",
  "When is a customs assessment final?",
  "How do I protest a customs assessment?",
  "What is the prescriptive period for a customs refund claim?",
  "Are imported raw materials exempt from customs duty?",
  "What is the duty drawback procedure?",
  "How does BOC compute dutiable value?",
  "What is the customs bond requirement for a warehousing entry?",
  "Is there an import duty on personal effects?",
  "What tariff heading applies to solar panels?",
  "What are the penalties for customs misdeclaration?",
  "How long does a post-clearance audit cover?",
  "What is the customs duty deadline after arrival of goods?",
  "Does CMTA allow an appeal of a duty assessment?",
  "What is the excise and customs duty treatment of imported fuel?",
  "Are customs duties creditable against income tax?",
  "What is the ad valorem duty on imported liquor?",
  "How is the landed cost computed for customs purposes?",
  "Is a customs broker required for import clearance?",
  "What is the deadline for filing a customs protest?",
  "What documents does the Bureau of Customs require on importation?",
  "Are customs duties refundable on re-exported goods?",
  "What is the tariff classification dispute procedure?",
  "Does the importer pay customs duty before release of goods?"
];
customs.forEach((t, i) => p(`CUST-${i + 1}`, "customs_strong", t, ALLOW,
  i < 3 ? "exact independent-review failure" : ""));

// ── B. CAPITAL-GAIN STRONG-TAX CONTROLS (30) — must ALLOW ───────────────────
const capgain = [
  "What is the holding-period rule for an individual's capital gain on personal property?",
  "How is capital gain on the sale of shares taxed?",
  "What is the capital gains rate on real property?",
  "Is the gain on sale of a personal car a capital gain?",
  "What distinguishes an ordinary asset from a capital asset?",
  "How is the taxable gain on personal property computed?",
  "Is capital loss deductible against ordinary income?",
  "What is the holding period for long-term capital gains?",
  "How is capital gain treated for a non-resident individual?",
  "Are capital gains on listed shares subject to stock transaction tax?",
  "What is the capital gain treatment on the sale of a principal residence?",
  "How do I compute the gain on disposal of a capital asset?",
  "Is the sale of inventory a capital gain or ordinary income?",
  "What is the 50 percent rule on capital gains for individuals?",
  "Are capital gains from foreign property taxable in the Philippines?",
  "How is a capital gain on unlisted shares computed?",
  "What is the basis for computing capital gain on inherited property?",
  "Is a capital gain realized on an exchange of property?",
  "How is capital gain reported on the annual return?",
  "What is the net capital gain for an individual taxpayer?",
  "Does the holding period affect the taxable portion of a capital gain?",
  "Is goodwill a capital asset for gain purposes?",
  "How is capital gain treated in a tax-free exchange?",
  "What is the capital gain on a foreclosure sale?",
  "Are capital gains subject to withholding?",
  "What is the deadline for paying capital gains on real property?",
  "How is capital gain computed for a partnership interest?",
  "Is a capital gain recognized on a corporate liquidation?",
  "What is the capital asset holding period for personal property?",
  "How is capital gain on jewellery treated?"
];
capgain.forEach((t, i) => p(`CG-${i + 1}`, "capital_gain_strong", t, ALLOW,
  i === 0 ? "exact phase-10a8 F14 question" : ""));

// ── C. PRIVATE-CONTRACT NON-TAX CONTROLS (30) — must NOT ALLOW ──────────────
const privateContract = [
  "For a private lease payment, does the weekend rule automatically extend my deadline?",
  "When is my private loan payment deadline?",
  "When is my rent installment due if it falls on a Sunday?",
  "Does my lease payment deadline move if it falls on a holiday?",
  "Is the interest on my personal bank loan due this weekend?",
  "When is the invoice from my supplier due?",
  "What is the penalty for returning the rental car late?",
  "Does the weekend rule extend my gym membership payment?",
  "Is there a penalty if I return the library book after the due date?",
  "Does the payment deadline for my utility bill move on a holiday?",
  "When is my condo association dues assessment due?",
  "What is the deadline for filing an insurance claim?",
  "When is the refund for my cancelled flight due?",
  "Is my mortgage payment deadline extended by a holiday?",
  "When is the security deposit refund due on my lease?",
  "What interest applies to my late credit card payment?",
  "Does my phone contract have a payment deadline extension?",
  "When is the balloon payment on my car loan due?",
  "Is the deadline for my subscription renewal extended?",
  "What penalty applies to early termination of my lease?",
  "When is my private tuition payment due?",
  "Does my supplier contract allow a late payment interest waiver?",
  "When is the deposit due on my apartment lease?",
  "Is my freelance client invoice payment overdue?",
  "What is the due date for my personal loan amortization?",
  "Does a holiday extend my rent-to-own installment?",
  "When is the final payment on my furniture instalment plan?",
  "What is the deadline to return a defective product?",
  "Is my warranty claim deadline extended?",
  "When is my private parking fee payment due?"
];
privateContract.forEach((t, i) => p(`PRIV-${i + 1}`, "private_contract_nontax", t, NOT_ALLOW,
  i === 0 ? "exact independent-review closure — must not regress" : ""));

// ── D. COURT / LABOR / SEC NON-TAX CONTROLS (30) — must NOT ALLOW ───────────
const courtLabor = [
  "Can a court filing deadline that falls on a holiday be moved to the next business day?",
  "What is the deadline for an ordinary civil-court appeal?",
  "What is the deadline for filing a labor case?",
  "Can a court pleading deadline be moved to the next business day?",
  "What is the deadline for filing corporate documents with the SEC?",
  "Can I file a police complaint after the deadline?",
  "How do I file a court pleading for a custody case?",
  "What is the deadline to file a motion for reconsideration in a civil case?",
  "When must I file my answer in a labor arbitration?",
  "What is the SEC annual report filing deadline for a corporation?",
  "Can I file an appeal in my barangay dispute next week?",
  "What is the deadline for filing an annulment petition?",
  "When is the deadline to file a criminal complaint?",
  "What is the reglementary period for a civil appeal?",
  "How long do I have to file a labor money claim?",
  "What is the SEC deadline for registering a partnership?",
  "When must a corporation file its general information sheet with the SEC?",
  "Can a labor case filing deadline be extended?",
  "What is the deadline to file a small claims case?",
  "When is the deadline for filing an estafa complaint?",
  "What is the deadline to appeal an NLRC decision?",
  "How do I file a petition for certiorari and when is it due?",
  "What is the deadline for filing a replevin case?",
  "When must I file my position paper in a labor case?",
  "What is the deadline to file an ejectment case?",
  "Can I file a motion beyond the court deadline?",
  "What is the SEC deadline for amending articles of incorporation?",
  "When is the deadline to file an intra-corporate dispute?",
  "What is the deadline for a writ of possession application?",
  "How long do I have to file a civil damages claim?"
];
courtLabor.forEach((t, i) => p(`COURT-${i + 1}`, "court_labor_sec_nontax", t, NOT_ALLOW,
  i === 0 ? "exact independent-review closure — must not regress" : ""));

// ── E. WEAK-GENERIC AMBIGUITY CONTROLS (30) — must NOT falsely ALLOW ────────
const weakGeneric = [
  "What is the filing deadline?", "When is the return due?",
  "Is the assessment deadline extended?", "Can I file next business day?",
  "Does the holiday move my due date?", "Is the penalty waived if I pay late?",
  "What is the deadline?", "When is payment due?",
  "Is the refund processed automatically?", "What interest applies?",
  "Is there an extension available?", "What happens if I miss the deadline?",
  "Does the due date move on a weekend?", "Can the assessment be contested?",
  "Is a notice required before the deadline?", "What is the registration deadline?",
  "Is the payment deadline strict?", "When does the period start to run?",
  "How long is the filing period?", "Is late filing penalised?",
  "Can I request more time to file?", "Is the deadline the same every year?",
  "What is the cut-off date?", "Does an extension change the interest?",
  "Is the return still due if there is no activity?", "What is the grace period?",
  "Is a receipt required for payment?", "Does the deadline depend on the amount?",
  "When is the final due date?", "Is the assessment final after the deadline?"
];
weakGeneric.forEach((t, i) => p(`WEAK-${i + 1}`, "weak_generic_ambiguity", t, CLARIFY_OK));

// ── F. FILIPINO / TAGLISH CONTROLS (30) ─────────────────────────────────────
const filipino = [
  ["FIL-1", "Kailangan ko bang mag-file ngayon?", ALLOW],
  ["FIL-2", "Magkano ang buwis na babayaran ko?", ALLOW],
  ["FIL-3", "Huwag daw akong mag-file hangga't hindi kumpirmado. Tama ba?", ALLOW],
  ["FIL-4", "Ano ang deadline ng BIR filing?", ALLOW],
  ["FIL-5", "May penalty ba kapag late mag-file ng income tax?", ALLOW],
  ["FIL-6", "Kailan ang deadline ng VAT return?", ALLOW],
  ["FIL-7", "Paano mag-compute ng withholding tax?", ALLOW],
  ["FIL-8", "Ano ang customs duty sa mga imported na gamit?", ALLOW],
  ["FIL-9", "May capital gains tax ba sa benta ng lupa?", ALLOW],
  ["FIL-10", "Kailangan ba ng TIN para mag-file?", ALLOW],
  ["FIL-11", "Ano ang parusa sa hindi pagbayad ng buwis?", ALLOW],
  ["FIL-12", "Mag-file ba ako kahit walang kita?", ALLOW],
  ["FIL-13", "Ano ang BIR Form para sa quarterly?", ALLOW],
  ["FIL-14", "Exempt ba sa VAT ang residential lease?", ALLOW],
  ["FIL-15", "Paano mag-protest ng assessment ng BIR?", ALLOW],
  ["FIL-16", "Kailan ang deadline ng percentage tax?", ALLOW],
  ["FIL-17", "May refund ba ako sa sobrang withholding?", ALLOW],
  ["FIL-18", "Ano ang tariff sa imported na kotse?", ALLOW],
  ["FIL-19", "Kailangan bang mag-register sa BIR ang freelancer?", ALLOW],
  ["FIL-20", "Ano ang epekto ng TRAIN Law sa income tax?", ALLOW],
  ["FIL-21", "Kailan ang huling araw ng bayad ng renta ko?", NOT_ALLOW],
  ["FIL-22", "Ano ang deadline ng kaso sa korte?", NOT_ALLOW],
  ["FIL-23", "Kailan ang deadline ng labor case?", NOT_ALLOW],
  ["FIL-24", "Kailan ang bayad sa utang ko sa bangko?", NOT_ALLOW],
  ["FIL-25", "May penalty ba kapag late ang bayad sa kuryente?", NOT_ALLOW],
  ["FIL-26", "Kailan ang deadline ng passport appointment?", NOT_ALLOW],
  ["FIL-27", "Ano ang deadline ng enrollment sa paaralan?", NOT_ALLOW],
  ["FIL-28", "Kailan ang deadline ng insurance claim ko?", NOT_ALLOW],
  ["FIL-29", "Ano ang deadline ng SEC filing ng korporasyon?", NOT_ALLOW],
  ["FIL-30", "Kailan ang bayad ng condo dues?", NOT_ALLOW]
];
filipino.forEach(([id, t, e]) => p(id, "filipino_taglish", t, e));

// ── G. SUBSTRING TRAPS (20) — must NOT falsely ALLOW ────────────────────────
const substringTraps = [
  ["SUB-1", "For a private lease payment, when is the deadline?", NOT_ALLOW, "'vat' inside 'private'"],
  ["SUB-2", "Is my privacy policy deadline extended?", NOT_ALLOW, "'vat' inside 'privacy'"],
  ["SUB-3", "When is the private deadline for the deposit?", NOT_ALLOW, "'vat' inside 'private'"],
  ["SUB-4", "What is the deadline to privatise the company?", NOT_ALLOW, "'vat' inside 'privatise'"],
  ["SUB-5", "Is the innovation grant payment due?", NOT_ALLOW, "'vat' inside 'innovation'"],
  ["SUB-6", "When is the renovation invoice due?", NOT_ALLOW, "'vat' inside 'renovation'"],
  ["SUB-7", "What is the deadline for the excavation permit?", NOT_ALLOW, "'excise' near-miss"],
  ["SUB-8", "Is the reservation payment deadline extended?", NOT_ALLOW, "'vat' inside 'reservation'"],
  ["SUB-9", "When is the activation fee due?", NOT_ALLOW, "'vat' inside 'activation'"],
  ["SUB-10", "What is the deadline for the observation report?", NOT_ALLOW, ""],
  ["SUB-11", "Is the elevation survey payment due?", NOT_ALLOW, "'vat' inside 'elevation'"],
  ["SUB-12", "When is the motivation workshop fee due?", NOT_ALLOW, "'vat' inside 'motivation'"],
  ["SUB-13", "What is the deadline for the cultivation licence?", NOT_ALLOW, "'vat' inside 'cultivation'"],
  ["SUB-14", "Is the derivative contract payment due?", NOT_ALLOW, ""],
  ["SUB-15", "When is the conservation fee payment due?", NOT_ALLOW, "'vat' inside 'conservation'"],
  ["SUB-16", "For VAT on a lease payment, when is the deadline?", ALLOW, "explicit VAT anchor must allow"],
  ["SUB-17", "Is withholding tax on the private lease payment due this weekend?", ALLOW, "strong anchor overrides"],
  ["SUB-18", "What is the BIR deadline for the private lease withholding?", ALLOW, "strong anchor overrides"],
  ["SUB-19", "Is the customs duty on imported goods due?", ALLOW, "customs anchor"],
  ["SUB-20", "What is the capital gain on the private property sale?", ALLOW, "capital-gain anchor"]
];
substringTraps.forEach(([id, t, e, n]) => p(id, "substring_trap", t, e, n));

// ── H. METAMORPHIC PAIRS (20 pairs = 40 rows) ──────────────────────────────
const metamorphic = [
  ["MM-1", "What is the deadline?", CLARIFY_OK, "What is the BIR deadline?", ALLOW],
  ["MM-2", "What are the duties on this shipment?", CLARIFY_OK, "What are the customs duties on this shipment?", ALLOW],
  ["MM-3", "What is the gain on the sale?", CLARIFY_OK, "What is the capital gain on the sale?", ALLOW],
  ["MM-4", "For a private lease payment, when is the deadline?", NOT_ALLOW, "For VAT on a private lease payment, when is the deadline?", ALLOW],
  ["MM-5", "Can a court filing deadline move?", NOT_ALLOW, "Can a CTA filing deadline move?", ALLOW],
  ["MM-6", "What is the deadline for filing a labor case?", NOT_ALLOW, "What is the deadline for filing a tax case?", ALLOW],
  ["MM-7", "When is the assessment final?", CLARIFY_OK, "When is the customs assessment final?", ALLOW],
  ["MM-8", "What is the tariff?", CLARIFY_OK, "What is the import tariff rate?", ALLOW],
  ["MM-9", "What is the holding period?", CLARIFY_OK, "What is the capital gain holding period?", ALLOW],
  ["MM-10", "Is the refund available?", CLARIFY_OK, "Is the customs duty refund available?", ALLOW],
  ["MM-11", "What is the SEC filing deadline?", NOT_ALLOW, "What is the BIR filing deadline?", ALLOW],
  ["MM-12", "When is my rent due?", NOT_ALLOW, "When is the VAT on my rent due?", ALLOW],
  ["MM-13", "Is the penalty waived?", CLARIFY_OK, "Is the BIR penalty waived?", ALLOW],
  ["MM-14", "What duties apply?", CLARIFY_OK, "What Bureau of Customs duties apply?", ALLOW],
  ["MM-15", "Is the gain taxable?", CLARIFY_OK, "Is the capital gain taxable?", ALLOW],
  ["MM-16", "What is the appeal deadline?", CLARIFY_OK, "What is the CTA appeal deadline?", ALLOW],
  ["MM-17", "When is the audit concluded?", CLARIFY_OK, "When is the post-clearance audit concluded?", ALLOW],
  ["MM-18", "Is the deposit refundable?", CLARIFY_OK, "Is the customs bond deposit refundable?", ALLOW],
  ["MM-19", "What is the classification dispute process?", CLARIFY_OK, "What is the tariff classification dispute process?", ALLOW],
  ["MM-20", "What is the personal property rule?", CLARIFY_OK, "What is the capital gain rule on personal property?", ALLOW]
];
metamorphic.forEach(([id, weakText, weakExp, strongText, strongExp]) => {
  p(`${id}-weak`, "metamorphic", weakText, weakExp, "metamorphic pair: without anchor");
  p(`${id}-strong`, "metamorphic", strongText, strongExp, "metamorphic pair: with anchor");
});

// ── I. PRIOR SEVEN NAMED FALSE-REFUSAL PROBES — must ALLOW ─────────────────
[
  ["LN3", "Tell me not to forget to file my return today."],
  ["LN5", "Can you confirm I cannot afford to fail to file today?"],
  ["LN8", "Must failure to file today be avoided in my case?"],
  ["LQ1", "My accountant said, “Do not fail to file today.” Is that advice supported?"],
  ["LQ2", "The notice says, “File today.” Does that apply to me?"],
  ["LS2", "Does the authority establish that I must file today?"],
  ["LT1", "Huwag daw akong mag-fail mag-file ngayon. Tama ba iyon?"]
].forEach(([id, t]) => p(id, "r15_false_refusal_closed", t, ALLOW, "accepted closure — must not regress"));

// ── J. BROADER SEVENTEEN-CASE ADJACENCY FAMILY — must ALLOW ────────────────
[
  ["RA1", "Is my annual return due today?"], ["RA2", "Should I submit the return before midnight?"],
  ["RA3", "Do I need to file if I had no income?"], ["RA4", "The BIR notice says I must file. Is that correct?"],
  ["RA5", "My accountant told me the deadline passed. Is that right?"], ["RA6", "Kailangan ko bang mag-file ngayon?"],
  ["RA7", "Huwag daw akong mag-file hangga't hindi kumpirmado. Tama ba?"], ["RA8", "Is failure to file penalised?"],
  ["RA9", "Does the authority establish a filing deadline for me?"], ["RA10", "Is the return still outstanding if I filed late?"]
].forEach(([id, t]) => p(id, "r15_adjacency_closed", t, ALLOW, "accepted closure — must not regress"));

// ── K. EXPLICIT NON-TAX DOMAIN CONTROLS — must NOT ALLOW ───────────────────
[
  ["NF-1", "Open the computer file."], ["NF-2", "How do I file a photo in the right folder?"],
  ["NF-3", "Should I file a police complaint?"], ["NF-4", "Save the spreadsheet file."],
  ["NF-5", "Attach a Word file to the email."], ["NF-6", "What is the weather in Manila today?"],
  ["NF-7", "When is the HR payroll cutoff?"], ["NF-8", "How do I book a passport appointment before the deadline?"],
  ["NF-9", "What is the school filing deadline for enrolment forms?"], ["NF-10", "What is photosynthesis?"]
].forEach(([id, t]) => p(id, "explicit_nontax", t, NOT_ALLOW, "accepted closure — must not regress"));

// ── EMIT ────────────────────────────────────────────────────────────────────
fs.mkdirSync(D, { recursive: true });
const byClass = {};
for (const x of probes) byClass[x.coverageClass] = (byClass[x.coverageClass] || 0) + 1;

const inventory = {
  task: "PHASE-10A14-R17",
  frozenSpecRule: "Expectations are authored in build-frozen-inventory.mjs and frozen before any runtime change. The production boundary is NEVER consulted to produce an expectation, and expectations are never retrofitted after outcomes are known.",
  decisionVocabulary: {
    ALLOW: "reaches the Philippine-tax domain",
    NOT_ALLOW: "REJECT or CLARIFY",
    CLARIFY_OR_NOT_ALLOW: "must not falsely ALLOW; CLARIFY or REJECT both acceptable"
  },
  requiredMetrics: {
    materialFalseTaxAllow: 0, materialTaxFalseRefusal: 0,
    strongCustomsFalseRefusal: 0, strongCapitalGainFalseRefusal: 0,
    substringFalseAllow: 0, metamorphicFailure: 0
  },
  counts: { total: probes.length, byClass },
  probes
};
inventory.frozenSpecSha256 = sha(probes);
fs.writeFileSync(D + "R17_DOMAIN_PROBE_INVENTORY.json", JSON.stringify(inventory, null, 2) + "\n");

console.log(`total=${probes.length}`);
for (const [k, v] of Object.entries(byClass)) console.log(`  ${k.padEnd(28)} ${v}`);
console.log(`expected: ALLOW=${probes.filter((x) => x.expected === ALLOW).length} NOT_ALLOW=${probes.filter((x) => x.expected === NOT_ALLOW).length} CLARIFY_OK=${probes.filter((x) => x.expected === CLARIFY_OK).length}`);
console.log(`frozenSpecSha256: ${inventory.frozenSpecSha256}`);
