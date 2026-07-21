// PHASE-10A14-R18 — frozen domain oracle builder.
//
// AUTHORING RULE (the MM-15-weak lesson from R17): a probe's expectation must be
// defensible from the probe's own text. If a probe contains an explicit, coherent tax
// object, its expectation is ALLOW — no matter how convenient NOT_ALLOW would be for a
// pass rate. Every NOT_ALLOW row below either carries no tax term at all, or carries an
// ambiguous tax homograph attached to an explicitly non-tax object.
//
// Expectations: "ALLOW" | "NOT_ALLOW" (REJECT or CLARIFY both satisfy NOT_ALLOW).
import fs from "node:fs";

const rows = [];
let n = 0;
const add = (coverageClass, text, expected, rationale) => {
  rows.push({ probeId: `R18-${String(++n).padStart(4, "0")}`, coverageClass, text, expected, rationale });
};

// ── 1. Explicit tax controls (120) — must ALLOW ──────────────────────────────
const taxCore = [
  "What is the VAT rate in the Philippines?", "How do I file a VAT return?",
  "Is this sale subject to VAT?", "What is a VAT invoice?", "How do I register for VAT?",
  "What is input VAT?", "What is output VAT?", "What is a zero-rated sale?",
  "Is this compensation taxable?", "What income is taxable in the Philippines?",
  "Is the sale of this property taxable?", "What is taxable income?",
  "What is the taxable base for percentage tax?", "Is a de minimis benefit taxable?",
  "What is the income tax rate for individuals?", "How is corporate income tax computed?",
  "What is MCIT?", "What is RCIT?", "When is the annual ITR due?",
  "What is expanded withholding tax?", "What is final withholding tax?",
  "How do I compute creditable withholding tax?", "What is BIR Form 2307 for?",
  "What is BIR Form 1601-C?", "When do I file BIR Form 2550Q?",
  "What is the estate tax rate?", "What is included in the gross estate?",
  "What is donor's tax?", "What is documentary stamp tax on a deed of sale?",
  "What is percentage tax for non-VAT taxpayers?", "What is excise tax on alcohol?",
  "What are the BOC customs duties on imported goods?",
  "What is the Bureau of Customs tariff classification procedure?",
  "How is customs duty computed on imported goods?", "What is dutiable value?",
  "What is a post-clearance audit by the BOC?", "What is duty drawback?",
  "What is landed cost for customs purposes?", "What is misdeclaration under the CMTA?",
  "What is the capital-gain holding-period rule?", "What is a capital asset?",
  "What is an ordinary asset?", "How is capital gains tax computed on shares?",
  "Is the gain on sale of my principal residence taxable?",
  "When may BIR apply Oplan Kandado?", "What is a Letter of Authority?",
  "What is the difference between a PAN and a FAN?", "What is an FDDA?",
  "How do I protest a deficiency assessment?", "What is the prescriptive period for assessment?",
  "Can I appeal to the Court of Tax Appeals?", "What is a compromise penalty?",
  "What is a tax lien?", "What is a Subpoena Duces Tecum from BIR?",
  "What is a Tax Compliance Verification Drive?", "What is a Mission Order?",
  "What is real property tax?", "What is local business tax?",
  "What is the situs of taxation for local business tax?", "What is RPT idle land tax?",
];
const taxMore = [
  "Is my lessor required to charge VAT on residential rent?",
  "What is the VAT exemption threshold for residential leases?",
  "Is rental income taxable?", "What is the per-unit residential exemption?",
  "What is the optional standard deduction?", "What expenses are deductible?",
  "What is substantiation for deductions?", "Are representation expenses deductible?",
  "What is a fringe benefit tax?", "What are gross receipts for percentage tax?",
  "What is transfer pricing documentation?", "What is a permanent establishment?",
  "What is a tax treaty relief application?", "What is double taxation relief?",
  "What is the tax sparing rule?", "What is an Income Tax Holiday?",
  "What incentives does PEZA grant?", "What is a registered business enterprise?",
  "What is the CREATE Act?", "What did the TRAIN Law change?",
  "What is RA 10963?", "What does RA 11976 cover?", "What is the EOPT law?",
  "What is the NIRC?", "What is Revenue Regulation No. 16-2005?",
  "What does RMC 24-2022 say?", "What is a BIR ruling?",
  "How do I get a TIN?", "What is eFPS?", "What is eBIRForms?",
  "What is an Alphalist?", "What is SLSP?", "What are books of accounts?",
  "What is an official receipt requirement?", "What is a tax refund claim?",
  "What is a tax credit certificate?", "What is a tax-free exchange?",
  "What is stock transaction tax?", "What is net capital gain?",
  "What is a delinquency in tax payment?", "What is a surcharge for late filing?",
  "What is the interest rate on deficiency tax?", "What is Run After Tax Evaders?",
  "What is a Letter Notice from BIR?", "What is an administrative protest?",
  "What is a reinvestigation request?", "What is a reconsideration request?",
  "Is a BIR audit likely to be resolved in my favor?", "What is tax exposure?",
  "What is a Notice for Informal Conference?", "What is a Formal Letter of Demand?",
  "What is deficiency VAT?", "What is a VAT-exempt transaction?",
  "What is a VAT zero-rated sale of services?", "What is the CTA's jurisdiction?",
  "What is an import duty on vehicles?", "What is an ad valorem duty?",
  "What is a customs broker's role?", "What is a warehousing entry?",
  "What is a tariff heading?", "What is the tariff rate for imported goods?",
];
for (const t of [...taxCore, ...taxMore]) add("explicit_tax", t, "ALLOW", "explicit, coherent Philippine tax subject");

// ── 2. Explicit non-tax controls (120) — must NOT_ALLOW ──────────────────────
const nonTax = [
  "What is photosynthesis?", "Explain mitosis and meiosis.", "What is DNA made of?",
  "What is the theory of evolution?", "What is a chromosome?", "Explain cell biology.",
  "What is quantum mechanics?", "What is a black hole?", "Explain Newton's laws.",
  "What is string theory?", "What is astrophysics?", "Explain chemistry basics.",
  "What is human anatomy?", "What is chemotherapy?", "Explain pharmacology.",
  "What is a clinical trial?", "What is a medical diagnosis process?",
  "Who is the president of the Philippines?", "What is a presidential election?",
  "Explain political parties.", "What is a senate bill hearing?",
  "How do I write JavaScript?", "What is TypeScript?", "How do I debug my code?",
  "What is a GitHub pull request?", "Explain software architecture.",
  "What is an API endpoint?", "How do I write a Python script?",
  "What is a SQL query?", "How to code a React component?",
  "Write me a love letter.", "Give me relationship advice.", "What are dating tips?",
  "How do I impress someone?", "What is the football score?",
  "Who won the championship game?", "What are the NBA standings?",
  "Give me a travel itinerary.", "What are the best tourist spots?",
  "Recommend a hotel.", "Give me a movie review.", "Recommend a TV show.",
  "What are the song lyrics?", "Tell me celebrity gossip.",
  "How do I cook adobo?", "Give me a recipe for pasta.", "What ingredients for sinigang?",
  "How do I bake bread?", "What is civil law?", "What is family law?",
  "What are the grounds for legal separation?", "What is annulment of marriage?",
  "What is adoption proceedings?", "What is criminal procedure?",
  "What is a murder charge?", "What are the rules of criminal procedure?",
  "What is drug trafficking?", "Give me investment advice.",
  "What are good stock picks?", "What is cryptocurrency?", "What is forex trading?",
  "Tell me a fun fact.", "Give me trivia.", "How do I train my dog?",
  "What is dog grooming?", "What is theology?", "What does the Bible say about love?",
  "What is worship?", "Explain spirituality.", "What is a prayer?",
  "How do I renew my passport?", "What is a visa application?",
  "When is school enrolment?", "How do I register for a marathon?",
  "How do I file an insurance claim?", "What is a personal bank loan rate?",
  "When are condominium association dues due?", "How do I dispute a utility bill?",
  "What do I do about a cancelled flight?", "How do I file a police complaint?",
  "What is the court filing deadline?", "Can I appeal my labor case?",
  "What is a barangay dispute?", "What is a custody case?",
  "How do I open a computer file?", "What is a file extension?",
  "How do I convert a PDF file?", "How do I compress a zip file?",
  "How do I rename a source file?", "Where is the file manager?",
  "How do I save the log file?", "What is a config file?",
  "How do I attach a file to email?", "How do I move a file to a folder?",
  "What is my payroll cutoff?", "Who do I contact in HR?",
  "What is a gym membership fee?", "When is the library book due?",
  "What is a rental car deposit?", "What is my rent payment schedule?",
  "What is a private lease agreement?", "What is a private loan contract?",
  "How do I train for a marathon?", "What is a conference schedule?",
  "What is ecology?", "What is zoology?", "What is botany?", "What is genetics?",
  "What is microbiology?", "What is biochemistry?", "What is geology?",
  "What is astronomy?", "What is a vaccine's efficacy?", "What is a drug dosage?",
  "What is a surgical procedure?", "What is cancer treatment?",
  "What is a political rally?", "What is a campaign?", "What is Angular?",
  "What is Vue.js?", "What is Node.js?", "What is programming?",
];
for (const t of nonTax) add("explicit_non_tax", t, "NOT_ALLOW", "no Philippine tax subject present");

// ── 3. Substring traps (60) — the P1-R17-IR1-002 family ──────────────────────
// A tax homograph attached to an explicitly non-tax object. These must NOT_ALLOW.
const traps = [
  "What is the taxable font in a CSS file?",           // exact IR17-197
  "Is the BOC a band of chords?",                       // exact IR17-202
  "How do I close a VAT color palette?",                // exact IR17-204
  "What is the taxable CSS property?", "How do I set a taxable typeface?",
  "Which taxable font family should I use in my stylesheet?",
  "Is there a taxable font weight in this stylesheet?",
  "What is the taxable variable name in my code?",
  "How do I rename the taxable variable in this software?",
  "Is the taxable class in this JavaScript module correct?",
  "What does the taxable flag do in this repository?",
  "Is BOC a band from the 1970s?", "What chords does the BOC band play?",
  "Is BOC a music group?", "What album did the BOC band release?",
  "Is BOC an acronym for a music genre?", "What does BOC stand for in audio engineering?",
  "Is the BOC guitar chord hard to play?", "Who is the BOC band's drummer?",
  "How do I open a VAT color palette in my design tool?",
  "What VAT color swatch should I paint the wall?",
  "Is the VAT paint finish glossy?", "How do I pick a VAT color for the graphics?",
  "What is the VAT variable in this software module?",
  "How do I define a VAT constant in my code?",
  "Is VAT a color in this palette?", "What VAT shade of blue is this?",
  "How do I import the VAT module in JavaScript?",
  "What is the customs font used in this poster?",
  "Is the tariff a music tariff for radio airplay?",
  "What is the duty roster for the night shift?",
  "Who is on guard duty tonight?", "What is my duty schedule at the hospital?",
  "Is capital a font style in typography?",
  "What is a capital letter in this typeface?",
  "How do I capitalize the first letter in my code?",
  "What is the return type of this function?",
  "How do I return a value in JavaScript?",
  "What is the return policy for this online store?",
  "How do I return this defective product?",
  "What is an invoice template design in Figma?",
  "What is the assessment rubric for my school exam?",
  "What is a self-assessment questionnaire for therapy?",
  "What is a risk assessment for a construction site?",
  "What is a performance assessment at work?",
  "Is PAN a cooking pan?", "How do I season a PAN?",
  "What is a PAN in networking terms?",
  "Is FAN a cooling fan for my computer?", "How loud is this FAN?",
  "What is a TIN can made of?", "Is TIN a metal element?",
  "What is a LOA in aviation terminology?",
  "What is the RATE of this song's tempo?",
  "What is an excise in surgical terms?",
  "What does the CTA button do on this website?",
  "What is a CTA in marketing copy?",
  "What is a DST time zone change?",
  "What is DST in daylight saving?",
  "What is the ITR file format for this image?",
];
for (const t of traps) add("substring_trap", t, "NOT_ALLOW", "tax homograph attached to an explicitly non-tax object");

// ── 4. Ambiguous controls (60) — genuinely unclear, must NOT_ALLOW (clarify) ──
const ambiguous = [
  "What is the deadline?", "When is it due?", "What is the filing deadline?",
  "When is the return due?", "Can I file next business day?",
  "Is the assessment deadline extended?", "What is the rate?",
  "How much do I owe?", "What is the penalty?", "Is there a surcharge?",
  "What is the threshold?", "What is the holding period?", "What is the tariff?",
  "Do I need to register?", "What is the interest?", "What is the requirement?",
  "Is this deductible?", "What is the exemption?", "Am I liable?",
  "What form do I use?", "When do I pay?", "How do I compute it?",
  "Is it exempt?", "What is the period?", "What are the rules?",
  "What is the process?", "Do I qualify?", "Is it required?",
  "What documents do I need?", "Who do I contact?", "What is the penalty rate?",
  "How long do I have?", "Can I get an extension?", "What happens if I am late?",
  "Is there a grace period?", "What is the procedure?", "What is the limit?",
  "What is the basis?", "How is it computed?", "What is the applicable rule?",
  "Is there a fee?", "What is the amount?", "When does it start?",
  "When does it end?", "Is it mandatory?", "What is the classification?",
  "What is the schedule?", "What is the standard?", "What is the treatment?",
  "How do I appeal?", "What is the remedy?", "Is there a refund?",
  "What is the coverage?", "What is the scope?", "Who is covered?",
  "What is the effective date?", "Is it retroactive?", "What is the condition?",
  "What is the definition?", "What is the ruling?",
];
for (const t of ambiguous) add("ambiguous", t, "NOT_ALLOW", "no coherent tax object; clarification is the correct outcome");

// ── 5. Filipino / Taglish controls (40) ──────────────────────────────────────
const filipinoTax = [
  "Magkano ang buwis ko?", "Ano ang buwis sa sahod?", "Paano magbayad ng buwis?",
  "Ano ang impuwesto sa negosyo?", "Kailan ang deadline ng pag-file ng ITR?",
  "Paano mag-file ng VAT return?", "Ano ang buwis sa lupa?",
  "May buwis ba ang benta ng bahay?", "Ano ang withholding tax sa suweldo?",
  "Kailangan ko bang mag-file ng income tax return?",
  "Ano ang parusa kung hindi ako nag-file ng buwis?",
  "Magkano ang customs duty sa imported na kotse?",
  "Ano ang buwis sa sasakyan na inangkat?", "May VAT ba ang renta ng bahay?",
  "Ano ang BIR Form para sa buwis ko?", "Paano ako makakakuha ng TIN?",
  "Ano ang Oplan Kandado ng BIR?", "Ano ang LOA mula sa BIR?",
  "Nakalimutan kong mag-file ng buwis, ano ang gagawin ko?",
  "Ano ang capital gains tax sa benta ng lupa?",
];
for (const t of filipinoTax) add("filipino_taglish", t, "ALLOW", "Filipino/Taglish query with explicit tax subject");
const filipinoNonTax = [
  "Magkano ang pamasahe sa jeep?", "Ano ang lutong ulam ngayon?",
  "Paano mag-alaga ng aso?", "Sino ang presidente ng Pilipinas?",
  "Ano ang panahon bukas?", "Paano maglaro ng basketball?",
  "Ano ang magandang pasyalan?", "Paano mag-aral ng mabuti?",
  "Magkano ang bigas sa palengke?", "Ano ang gamot sa sipon?",
  "Paano mag-code ng JavaScript?", "Ano ang kanta ni Regine?",
  "Kailan ang enrollment sa paaralan?", "Paano mag-apply ng passport?",
  "Ano ang barangay case?", "Paano mag-file ng police complaint?",
  "Magkano ang upa sa apartment ko?", "Ano ang font na ito sa poster?",
  "Anong kulay ang pipiliin ko sa pintura?", "Ano ang banda na tumugtog kagabi?",
];
for (const t of filipinoNonTax) add("filipino_taglish", t, "NOT_ALLOW", "Filipino/Taglish query with no tax subject");

// ── 6. Metamorphic pairs (40 pairs = 80 rows) ────────────────────────────────
// Each pair holds the tax term constant and varies ONLY the object, from a coherent
// tax object to an explicitly non-tax object. The expectation must flip.
const pairs = [
  ["Is this compensation taxable?", "Is this font taxable in CSS?"],
  ["Is this sale taxable?", "Is this typeface taxable in my stylesheet?"],
  ["Is the rental income taxable?", "Is the taxable variable set in my code?"],
  ["What is taxable income?", "What is the taxable color in this palette?"],
  ["Is the gain on shares taxable?", "Is the taxable class name valid in JavaScript?"],
  ["What is the VAT on this sale?", "What is the VAT shade in this color palette?"],
  ["How do I file a VAT return?", "How do I open a VAT palette in Figma?"],
  ["Is this transaction VAT-exempt?", "Is this VAT swatch too dark to paint?"],
  ["What is input VAT?", "What is the VAT variable in this software?"],
  ["What is the VAT invoice requirement?", "What is the VAT color of this wall paint?"],
  ["What are BOC customs duties?", "Is BOC a band of chords?"],
  ["What does the BOC assess on imports?", "What chords does BOC play in the song?"],
  ["What is a BOC post-clearance audit?", "Is BOC a music acronym?"],
  ["What is the BOC tariff classification?", "What is the BOC guitar tab?"],
  ["What is the customs duty on imports?", "What is my duty roster this week?"],
  ["What is the import duty rate?", "Who is on guard duty tonight?"],
  ["What is the tariff on imported goods?", "What is the radio airplay tariff?"],
  ["What is a capital asset for tax?", "Is capital a font style in typography?"],
  ["What is capital gains tax?", "What is a capital letter in typography?"],
  ["What is the income tax return deadline?", "What is the return policy of the store?"],
  ["How do I file my annual return?", "How do I return a defective product?"],
  ["What is a BIR assessment?", "What is a school assessment rubric?"],
  ["What is a deficiency assessment?", "What is a construction risk assessment?"],
  ["What is a VAT invoice?", "What is an invoice template design in Figma?"],
  ["What is a PAN from the BIR?", "How do I season a cooking PAN?"],
  ["What is a FAN in a tax assessment?", "How loud is this cooling FAN?"],
  ["How do I get a BIR TIN?", "What is a TIN can made of?"],
  ["What is a Letter of Authority?", "What is a LOA in aviation?"],
  ["What is the RATE program of the BIR?", "What is the RATE of this song's tempo?"],
  ["What is excise tax on alcohol?", "What is an excise in surgery?"],
  ["Can I appeal to the CTA?", "What does the CTA button do on this site?"],
  ["What is documentary stamp tax?", "What is DST daylight saving time?"],
  ["What is estate tax on inheritance?", "What is a real estate agent's commission?"],
  ["What is my taxable compensation?", "What is the taxable font weight in CSS?"],
  ["Is the lessor liable for VAT?", "Is the VAT paint finish glossy?"],
  ["What is withholding tax on rent?", "What is the withholding pattern in this code?"],
  ["What is a tax refund claim?", "What is a refund for my cancelled flight?"],
  ["What is a tax credit certificate?", "What is my credit card limit?"],
  ["What is the tax deadline today?", "What is the court filing deadline today?"],
  ["What is a BIR ruling?", "What is the referee's ruling in the game?"],
];
for (const [taxSide, nonTaxSide] of pairs) {
  add("metamorphic", taxSide, "ALLOW", "metamorphic pair: coherent tax object");
  add("metamorphic", nonTaxSide, "NOT_ALLOW", "metamorphic pair: same term, explicitly non-tax object");
}

// Consistency invariant: a probe text may legitimately appear in more than one coverage
// class (e.g. as an explicit control and as one side of a metamorphic pair), but the two
// occurrences must never disagree about the expectation. A contradictory oracle is
// unfalsifiable and would be a fixture defect of exactly the MM-15-weak kind.
const byText = new Map();
for (const p of rows) {
  const k = p.text.toLowerCase();
  if (!byText.has(k)) byText.set(k, []);
  byText.get(k).push(p);
}
const contradictions = [...byText.values()]
  .filter((v) => new Set(v.map((p) => p.expected)).size > 1)
  .map((v) => ({ text: v[0].text, expectations: v.map((p) => `${p.probeId}:${p.coverageClass}:${p.expected}`) }));
if (contradictions.length > 0) {
  console.error("ORACLE CONTRADICTION — refusing to freeze:", JSON.stringify(contradictions, null, 2));
  process.exit(1);
}
const sharedTexts = [...byText.values()].filter((v) => v.length > 1).length;

const oracle = {
  task: "PHASE-10A14-R18",
  frozen: true,
  oracleConsistency: {
    contradictions: 0,
    sharedTextsAcrossClasses: sharedTexts,
    rule: "A text may appear in multiple coverage classes only with an identical expectation. Contradictions abort the freeze."
  },
  authoringRule:
    "A probe's expectation must be defensible from the probe's own text. A probe containing an explicit, coherent tax object is expected ALLOW even where NOT_ALLOW would flatter the pass rate. This is the MM-15-weak lesson from R17.",
  expectationSemantics: {
    ALLOW: "boundary decision must be ALLOW",
    NOT_ALLOW: "boundary decision must be REJECT or CLARIFY; either satisfies the expectation"
  },
  counts: rows.reduce((a, r) => ((a[r.coverageClass] = (a[r.coverageClass] || 0) + 1), a), {}),
  total: rows.length,
  probes: rows
};
fs.writeFileSync("evaluation/results/phase-10a14-r18/DOMAIN_ORACLE.json", JSON.stringify(oracle, null, 2) + "\n");
console.log("total:", oracle.total, oracle.counts);
