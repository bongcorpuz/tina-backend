// FILE: services/philippine-tax-boundary-patterns.js
"use strict";

/**
 * Philippine Tax Boundary Pattern Constants.
 *
 * Static pattern registry extracted from philippine-tax-domain-boundary.js.
 * This module contains no boundary decision logic.
 */

export const BYPASS_HOOKS = new Set(["/feedback", "/progress", "/debug", "/patch"]);

// ─── Philippine-tax ALLOW patterns ───────────────────────────────────────────
// Ordered from broadest → most specific.
// A single match is sufficient to ALLOW.
// DO NOT include bare "Philippines" — "who is the president of the Philippines?"
// must not match.

export const PH_TAX_ALLOW_PATTERNS = [
  // ── Core "tax" word (broadest, most important signal) ──────────────────
  // These catch "what is tax?", "withholding tax", "income tax", etc.
  /\btax\b/i,
  /\btaxes\b/i,
  /\btaxable\b/i,
  /\btaxation\b/i,
  /\btaxpayer\b/i,
  /\btaxed\b/i,
  /\btaxing\b/i,
  /\bpre-?tax\b/i,
  /\bafter-?tax\b/i,
  /\bpost-?tax\b/i,
  /\btax-?free\b/i,
  /\btax-?exempt\b/i,

  // ── VAT ────────────────────────────────────────────────────────────────
  /\bvat\b/i,
  /\bvalue[- ]added\b/i,
  /\bvatable\b/i,
  /\bzero[- ]rated\b/i,
  /\binput\s+tax\b/i,
  /\boutput\s+tax\b/i,

  // ── Withholding ────────────────────────────────────────────────────────
  /\bwithholding\b/i,
  /\bewt\b/i,
  /\bfwt\b/i,
  /\bcreditable\s+withholding\b/i,
  /\bexpanded\s+withholding\b/i,
  /\bfinal\s+withholding\b/i,

  // ── BIR / regulatory ──────────────────────────────────────────────────
  /\bBIR\b/i,
  /\bbureau\s+of\s+internal\s+revenue\b/i,
  /\bRMC\b/i,
  /\bRMO\b/i,
  /\bRAMO\b/i,
  /\bRevenue\s+Regulation/i,
  /\bRevenue\s+Memorandum/i,
  /\bBIR\s+[Rr]uling\b/i,
  /\bBIR\s+[Ii]ssuance\b/i,
  /\bBIR\s+[Ff]orm\b/i,

  // Match "RR No." or "RR 2-98" style revenue regulation citations
  /\bRR\s*(?:No\.?\s*)?\d/i,

  // ── NIRC and key statutes ──────────────────────────────────────────────
  /\bNIRC\b/i,
  /\bNational\s+Internal\s+Revenue\s+Code\b/i,
  /\bTRAIN\s+[Ll]aw\b/i,
  /\bCREATE\s+[Ll]aw\b/i,
  /\bEOPT\b/i,
  /\bEase\s+of\s+Paying\s+Taxes\b/i,
  /\bRA\s*8424\b/i,
  /\bRA\s*10963\b/i,
  /\bRA\s*11534\b/i,
  /\bRA\s*11976\b/i,
  /\bRA\s*10667\b/i,

  // ── Income tax types ───────────────────────────────────────────────────
  /\bRCIT\b/i,
  /\bMCIT\b/i,
  /\bITR\b/i,

  // ── Other PH tax types ────────────────────────────────────────────────
  /\bDST\b/i,
  /\bDocumentary\s+Stamp/i,
  /\bexcise\b/i,
  /\bpercentage\s+tax\b/i,
  /\bsin\s+tax\b/i,
  /\bdonor'?s?\s+tax\b/i,
  /\bestate\s+tax\b/i,
  /\bgross\s+estate\b/i,
  /\bnet\s+estate\b/i,
  /\bestate\s+deduction[s]?\b/i,
  /\bclaims\s+against\s+estate\b/i,
  /\bCGT\b/i,

  // ── Customs / BOC ─────────────────────────────────────────────────────
  /\bCMTA\b/i,
  /\btariff\b/i,
  /\bcustoms\s+duty\b/i,
  /\bcustoms\s+duties\b/i,
  /\bimport\s+duty\b/i,
  /\bimport\s+dut/i,
  /\bBOC\b/i,
  /\bbureau\s+of\s+customs\b/i,
  /\bpost[- ]?clearance\s+audit\b/i,
  /\bcustoms\s+assessment\b/i,

  // ── Local taxes ────────────────────────────────────────────────────────
  /\bRPT\b/i,
  /\breal\s+property\s+tax\b/i,
  /\blocal\s+business\s+tax\b/i,
  /\bLBT\b/i,
  /\bLGC\b/i,
  /\bLocal\s+Government\s+Code\b/i,
  /\bLGU\s+tax\b/i,
  /\bsitus\s+(of\s+)?(tax|taxation)/i,

  // ── Assessment / remedies ─────────────────────────────────────────────
  /\bLOA\b/i,
  /\bLetter\s+of\s+Authority\b/i,
  /\bPreliminary\s+Assessment\s+Notice\b/i,
  /\bFinal\s+Assessment\s+Notice\b/i,
  /\bFDDA\b/i,
  /\bFormal\s+Letter\s+of\s+Demand\b/i,
  /\bNotice\s+for\s+Informal\s+Conference\b/i,
  /\bdeficiency\b/i,
  /\bsurcharge\b/i,
  /\bcompromise\s+penalty\b/i,
  /\bcompromise\s+offer\b/i,
  /\btax\s+lien\b/i,
  /\bdelinquency\b/i,
  /\bCourt\s+of\s+Tax\s+Appeals\b/i,
  /\bCTA\b/i,
  /\bprescriptive\s+period\b/i,

  // ── Tax-specific concepts ─────────────────────────────────────────────
  /\bdeductible\b/i,
  /\bdeductibility\b/i,
  /\bnon[- ]?deductible\b/i,
  /\bdeduction[s]?\b/i,
  /\bsubstantiation\b/i,
  /\bOfficially\s+Registered\b/i,
  /\binvoic/i,
  /\bofficial\s+receipt\b/i,
  /\bbooks\s+of\s+account[s]?\b/i,
  /\bAlpha\s*[Ll]ist\b/i,
  /\bSLSP\b/i,
  /\beSales\b/i,

  // ── Incentives / special regimes ──────────────────────────────────────
  /\bPEZA\b/i,
  /\bBOI\b/i,
  /\bFIRB\b/i,
  /\bITH\b/i,
  /\bSCIT\b/i,
  /\bIncome\s+Tax\s+Holiday\b/i,
  /\bEnhanced\s+Deductions\b/i,
  /\bregistered\s+(business\s+)?enterprise\b/i,

  // ── Transfer pricing / international ──────────────────────────────────
  /\btransfer\s+pricing\b/i,
  /\bBEPS\b/i,
  /\bpermanent\s+establishment\b/i,
  /\btax\s+sparing\b/i,
  /\bdouble\s+tax/i,
  /\bDTA\b/i,
  /\btax\s+treaty\b/i,

  // ── Philippine-qualified phrases ──────────────────────────────────────
  // Only allow "Philippine(s)" when followed by a tax-related word
  /\bPhilippine\s+(tax|vat|bir|nirc|income|withholding|customs|tariff|duty|duties|law|code)/i,
  /\bPhilippines\s+(tax|vat|bir|nirc)/i,
  /\bFilipino\s+tax/i,

  // ── PHASE-10A8: core tax concepts that can appear without the word "tax" ──
  // PHASE-10A7 found valid tax questions falsely refused as DOMAIN_BOUNDARY
  // because they contained no standalone "tax" token: e.g. "holding-period
  // rule for an individual's capital gain on personal property" (Q23) and
  // "Oplan Kandado" (Q43). These patterns are tax-specific and do not admit
  // generic finance queries.
  /\bcapital\s+gains?\b/i,
  /\bholding\s+period\b/i,
  /\bordinary\s+asset[s]?\b/i,
  /\bcapital\s+asset[s]?\b/i,
  /\bOplan\s+Kandado\b/i,
  /\bKandado\b/i,
  /\bclosure\s+of\s+business\b/i,
  /\bzero[- ]rated\s+sale[s]?\b/i,
  /\binput\s+VAT\b/i,
  /\boutput\s+VAT\b/i,
  /\bfinal\s+withholding\s+tax\b/i,
  /\bexpanded\s+withholding\b/i,
  /\boptional\s+standard\s+deduction\b/i,
  /\bde\s+minimis\b/i,

  // ── PHASE-10A12-R2: residential-lease VAT-exemption concepts that appear
  // without a standalone "tax" token. The A12 review found Q8 paraphrases
  // falsely REJECTed as DOMAIN_BOUNDARY (e.g. "which controls: the per-unit
  // residential exemption or the lessor's total annual rental income?" and
  // "the lessor owns many residential units but each is rented below the
  // statutory monthly threshold"). Tax-specific; do not admit generic queries.
  /\blessor\b/i,
  /\blessee\b/i,
  /\brental\s+income\b/i,
  /\bresidential\s+(unit|lease|leasing|rent(al)?|dwelling)\b/i,
  /\bper[- ]unit\s+(exemption|threshold|rent)\b/i,
  /\bmonthly\s+(rent(al)?|threshold)\b/i,
  /\bstatutory\s+(monthly\s+)?threshold\b/i,
  /\bVAT[- ]exempt\w*\b/i,
  /\bexemption\s+threshold\b/i,

  // ── PHASE-10A12-R2: tax-controversy outcome terms (kept out of DOMAIN_BOUNDARY
  // so an outcome-prediction question receives a governed, non-verified answer
  // instead of a false refusal, e.g. "likelihood my audit will be resolved in my
  // favor"). Tax-specific.
  /\bBIR\s+audit\b/i,
  /\btax\s+audit\b/i,
  /\bdeficiency\s+assessment\b/i,
  /\badministrative\s+protest\b/i,
  /\brefund\s+claim\b/i,
  /\bprotest\b/i,
  /\bpenalt(y|ies)\b/i,
  /\baudit\b[^.\n]{0,40}(favor|win|succeed|prevail|resolved|outcome|assessment)/i,
];

// ─── PHASE-10A14-R16 (P1-R15-IR-003) — STRONG / WEAK / NON-TAX SIGNAL MODEL ───
//
// Independent probes found non-tax questions allowed as Philippine tax:
//   "For a private lease payment, does the weekend rule automatically extend my deadline?"
//   "Can a court filing deadline that falls on a holiday be moved to the next business day?"
// The first matched the keyword "vat" INSIDE the word "pri-vat-e", because isTaxRelated
// does a raw includes() with no word boundary. The second matched only the generic words
// "filing" and "deadline". A frozen 193-probe reproduction found 88 such false allows.
//
// The model below distinguishes three classes. tax-keywords.js is deliberately NOT
// modified: it is also consumed by tax-classifier.js, so changing its semantics would
// reach beyond the domain boundary and beyond the authorized findings. Instead the
// boundary stops treating a bare keyword hit as proof of tax domain.

/**
 * STRONG signals: an explicit Philippine-tax anchor. Word-boundary matched, so "private"
 * can never satisfy VAT. A strong signal alone is sufficient for ALLOW, and it overrides
 * an otherwise non-tax object ("withholding tax on the private lease payment").
 */
export const STRONG_TAX_SIGNAL_PATTERNS = [
  /\btax(?:es|able|ation|payer|payers)?\b/i,
  /\bBIR\b/i, /\bNIRC\b/i, /\bVAT\b/i, /\bDST\b/i, /\beFPS\b/i, /\beBIR\s?forms?\b/i,
  /\bCTA\b/i, /\bCourt of Tax Appeals\b/i,
  /\bwithholding\b/i, /\bexpanded withholding\b/i, /\bfinal withholding\b/i,
  /\bpercentage tax\b/i, /\bincome tax\b/i, /\bestate tax\b/i, /\bdonor'?s tax\b/i,
  /\bcapital gains tax\b/i, /\bdocumentary stamp\b/i, /\bexcise tax\b/i,
  /\bBIR\s*Form\b|\bForm\s*(?:1700|1701|1702|1601|1604|2550|2551|2307|2316|1801|1800)\w*\b/i,
  /\bLetter of Authority\b|\bLOA\b|\beLA\b/i,
  /\bFDDA\b|\bPAN\b|\bFAN\b|\bFLD\b/i,
  /\bassessment notice\b/i,
  // PHASE-10A14-R19: "RR\s*\d" required a digit immediately after RR, missing real
  // citation style "RR No. 2-98" where "No." intervenes. Broadened to match the already-
  // correct PH_TAX_ALLOW_PATTERNS form.
  /\bRMC\b|\bRMO\b|\bRR\s*(?:No\.?\s*)?\d|\bRevenue Regulations?\b|\bRevenue Memorandum\b/i,
  /\bBIR ruling\b/i, /\btax refund\b/i, /\btax credit\b/i, /\btax return\b/i,
  /\bITR\b/i, /\bTIN\b/i, /\bzero-?rated\b/i, /\binput tax\b/i, /\boutput tax\b/i,
  // PHASE-10A14-R16 correction. Deterministic gate cycle 1 exposed two false REFUSALS
  // introduced by an over-narrow strong list: named Philippine tax statutes and
  // tax-practice vocabulary are genuine anchors and were falling through to the weak
  // path. Caught by patch-06e-003 and phase-10a12-r2, not by my own frozen inventory,
  // which contained no named-statute or lessor probe.
  // PHASE-10A14-R17 (P1-R16-IR-003) — CUSTOMS AND CAPITAL-GAIN CATEGORIES.
  // The R16 strong list anchored on the literal token "tax" and on "capital gains tax"
  // (which requires "tax" to follow). Customs vocabulary and bare "capital gain" therefore
  // carried no strong anchor, fell through to the weak-signal path, and clarified. The
  // frozen 267-probe reproduction found 69 false refusals, of which 29 were customs and
  // 23 capital-gain. These are category-based, not exact-question, corrections.
  //
  // Customs / tariff — Philippine customs duty is a national internal revenue matter.
  /\bcustoms\b/i, /\bcustom duty\b|\bcustoms dut(?:y|ies)\b/i,
  /\bimport dut(?:y|ies)\b|\bexport dut(?:y|ies)\b/i,
  // "tariff" alone is ambiguous (a phone tariff is not tax), so it requires customs or
  // import context. The frozen inventory expects bare "What is the tariff?" to clarify.
  /\btariff\b[^.\n]{0,40}\b(?:rate|import(?:ed|ation)?|customs|classification|heading|schedule|goods|kotse|sasakyan)\b/i,
  /\b(?:import(?:ed|ation)?|customs|classification|heading|schedule|goods)\b[^.\n]{0,40}\btariff\b/i,
  /\bBOC\b/i, /\bBureau of Customs\b/i, /\bCMTA\b/i,
  /\bpost-?clearance audit\b/i, /\bdutiable value\b/i, /\bduty drawback\b/i,
  /\blanded cost\b/i, /\bcustoms broker\b/i, /\bad valorem dut(?:y|ies)\b/i,
  /\bwarehousing entry\b/i, /\bmisdeclaration\b/i, /\btariff heading\b|\btariff classification\b/i,
  /\bimport(?:ed|ation)?\b[^.\n]{0,40}\bdut(?:y|ies)\b/i,
  /\bdut(?:y|ies)\b[^.\n]{0,40}\bimport(?:ed|ation)?\b/i,
  // Capital gain — the bare term is a tax concept in Philippine practice.
  /\bcapital gains?\b/i, /\bcapital asset\b/i, /\bordinary asset\b/i,
  /\bcapital loss\b/i,
  // "holding period" alone is ambiguous, so it requires a capital/gain/asset context.
  // The frozen inventory expects bare "What is the holding period?" to clarify.
  /\bholding[- ]period\b[^.\n]{0,60}\b(?:capital|gain|asset|property|shares?|tax)\b/i,
  /\b(?:capital|gain|asset|property|shares?|tax)\b[^.\n]{0,60}\bholding[- ]period\b/i,
  // Filipino tax vocabulary. "buwis" is the ordinary Filipino word for tax and carried no
  // strong anchor, so Filipino tax questions fell through to fail-closed.
  /\bbuwis\b/i, /\bimpuwesto\b/i, /\bbayaran ng buwis\b/i,
  // BIR enforcement programmes. These are unambiguous Philippine tax-administration terms
  // with no non-tax meaning. "Oplan Kandado" is the second question in the phase-10a8 F14
  // assertion; the independent review named only the capital-gain probe, but F14 covers
  // both and must pass.
  /\bOplan Kandado\b/i, /\bRun After Tax Evaders\b|\bRATE program\b/i,
  /\bTax Compliance Verification Drive\b|\bTCVD\b/i,
  /\bLetter Notice\b/i, /\bMission Order\b/i, /\bSubpoena Duces Tecum\b/i,
  /\bdelinquenc(?:y|ies)\b[^.\n]{0,40}\b(?:tax|BIR)\b/i,
  /\btaxable gain\b/i, /\bnet capital gain\b/i, /\bstock transaction tax\b/i,
  /\bprincipal residence\b/i, /\btax-?free exchange\b/i,
  /\bRA\s*\d{4,5}\b/i, /\bRepublic Act\s*(?:No\.?\s*)?\d{4,5}\b/i,
  /\bTRAIN\s*Law\b/i, /\bCREATE\s*(?:Act|MORE)\b/i, /\bPEZA\b/i, /\bBOI\b/i,
  /\blessor\b|\blessee\b/i,
  /\bVAT-?exempt\b|\btax-?exempt\b|\bexempt(?:ion)?\s+threshold\b/i,
  /\bstatutory\s+(?:threshold|deadline|period|rate|due date)\b/i,
  /\bgross receipts\b/i, /\bfringe benefit\b/i, /\bde minimis\b/i,
  /\bCTA\s*Case\b/i, /\bSection\s*\d+\b(?=[^.\n]{0,40}\b(?:NIRC|tax|BIR)\b)/i,
  // PHASE-10A14-R19 (P1-R18-IR1-001, false-refusal half). Three coherent Philippine tax
  // phrases were carried only as WEAK signals and clarified instead of allowing:
  // "official receipt" (BIR invoicing document — no plausible non-tax homograph),
  // "annual information return" (coherent BIR phrase, no weak-signal hit at all), and
  // "refund claim prescription" (weak "refund claim" alone, missing the prescription
  // combination as an anchor).
  /\bofficial\s+receipt\b/i,
  /\bannual\s+information\s+return\b/i,
  /\bFIRB\b|\bLBT\b|\bRPT\b/i,
  /\bprescription\b[^.\n]{0,40}\b(?:claim|refund|assessment|tax)\b|\b(?:claim|refund|assessment|tax)\b[^.\n]{0,40}\bprescription\b/i,

  // PHASE-10A14-R19 (P1-R18-IR1-001, executor unseen campaign). Additional coherent
  // Philippine tax phrases and acronyms found carried only as weak signals or entirely
  // uncovered. Each is a specific BIR/tax-administration term with no plausible ordinary
  // non-tax reading, so no veto counterpart is needed.
  /\bstatute\s+of\s+limitations\b[^.\n]{0,40}\bassessment\b|\bassessment\b[^.\n]{0,40}\bstatute\s+of\s+limitations\b/i,
  /\bwarrant\s+of\s+distraint\s+and\s+levy\b/i,
  /\bsubstituted\s+filing\b/i,
  /\belectronic\s+filing\s+and\s+payment\s+system\b/i,
  /\bdeficiency\s+interest\b/i,
  /\btax\s+amnesty\b|\bamnesty\s+on\s+delinquent\s+accounts?\b/i,
  /\brelated\s+party\s+transaction\b/i,
  /\bnet\s+operating\s+loss\s+carry-?over\b/i,
  /\bdeferred\s+payment\s+sale\b[^.\n]{0,30}\breal\s+property\b/i,
  /\bvanishing\s+deduction\b/i,
  /\b(?:medical|funeral|judicial)\s+expenses?\s+deduction\b/i,
  /\bauthority\s+to\s+print\b/i,
  /\bcomputerized\s+accounting\s+system\b/i,
  /\belectronic\s+bookkeeping\b/i,
  /\bonline\s+registration\s+and\s+update\s+system\b|\bORUS\b/i,
  /\bimproperly\s+accumulated\s+(?:profits?|earnings?)\s+(?:surtax|tax)\b/i,
  /\bCGT\b/i, /\bDTA\b/i,
  /\breconsideration\b[^.\n]{0,30}\b(?:refund\s+claim|claim|assessment)\b/i,
  /\brefund\s+claim\b[^.\n]{0,30}\bdocumentary\b/i,
  /\bEWT\b|\bFWT\b/i,
  /\bRATE\s+case\b|\bRATE\s+program\b/i,
  /\bannual\s+registration\s+fee\b/i,
  /\bresibo\b[^.\n]{0,30}\b(?:business|negosyo|expense)\b|\b(?:business|negosyo|expense)\b[^.\n]{0,30}\bresibo\b/i,
  // PHASE-10A14-R18 (P1-R17-IR1-002, false-refusal half). The R18 483-probe campaign
  // exposed 26 false refusals the narrower R17 inventory never covered. Each term below is
  // unambiguous Philippine tax vocabulary that was carried only in the WEAK allow list, so
  // it clarified instead of allowing.
  //
  // Each is deliberately phrased so it cannot swallow a genuinely ambiguous frame. The
  // frozen oracle expects "Is this deductible?", "What is the exemption?", "Is there a
  // surcharge?", "What is the penalty?" and "What is the period?" to clarify, while
  // "What expenses are deductible?", "What is a surcharge for late filing?", "What is a
  // compromise penalty?" and "What is the prescriptive period for assessment?" must allow.
  // Anchoring on the qualifying object rather than the bare noun keeps both sides true.
  /\bMCIT\b|\bRCIT\b|\bminimum corporate income tax\b|\bregular corporate income tax\b/i,
  /\bgross estate\b|\bnet estate\b|\bestate deduction[s]?\b/i,
  /\bdeficiency assessment\b|\bdeficiency (?:tax|VAT|income tax)\b/i,
  /\bprescriptive period\b/i,
  /\bcompromise penalty\b|\bcompromise offer\b/i,
  /\boptional standard deduction\b|\bOSD\b/i,
  /\b(?:expense|expenses|cost|costs|representation|entertainment)\b[^.\n]{0,40}\bdeductib\w*\b/i,
  /\bdeductib\w*\b[^.\n]{0,40}\b(?:expense|expenses|income|gross income)\b/i,
  /\bdeduction[s]?\b[^.\n]{0,40}\b(?:against|from)\b[^.\n]{0,20}\b(?:gross\s+income|income)\b/i,
  /\bsubstantiation\b[^.\n]{0,30}\bdeduction[s]?\b|\bdeduction[s]?\b[^.\n]{0,30}\bsubstantiation\b/i,
  /\btransfer pricing\b|\bpermanent establishment\b|\btax treaty\b|\bBEPS\b/i,
  /\bregistered business enterprise\b|\bIncome Tax Holiday\b|\bITH\b|\bSCIT\b/i,
  /\bEOPT\b|\bEase of Paying Taxes\b/i,
  /\bAlpha\s?list\b|\bSLSP\b|\beSales\b|\beFPS\b/i,
  /\bbooks of accounts?\b/i,
  /\bofficial receipt\b[^.\n]{0,30}\brequirement\b|\brequirement\b[^.\n]{0,30}\bofficial receipt\b/i,
  /\bsurcharge\b[^.\n]{0,40}\b(?:late|filing|payment|deficiency|tax)\b/i,
  /\b(?:late|filing|payment|deficiency|tax)\b[^.\n]{0,40}\bsurcharge\b/i,
  /\badministrative protest\b|\bprotest letter\b|\bprotest\b[^.\n]{0,30}\bassessment\b/i,
  // Bare "reconsideration" is court vocabulary too. The R17 inventory expects "What is the
  // deadline to file a motion for reconsideration in a civil case?" to stay out of domain,
  // so these anchor on the BIR instrument ("request for reconsideration") rather than the
  // bare noun. Caught by the R17 customs/capital-gain suite, not by the R18 oracle.
  /\b(?:request|petition|protest)\s+for\s+(?:reinvestigation|reconsideration)\b/i,
  /\b(?:reinvestigation|reconsideration)\s+request\b/i,
  /\bNotice for Informal Conference\b|\binformal conference\b/i,
  /\bFormal Letter of Demand\b/i,
  /\bper[- ]unit\s+(?:residential\s+)?exemption\b|\bresidential\s+(?:unit|lease|leasing|rent(?:al)?|dwelling)\b/i,
];

// ─── PHASE-10A14-R18 (P1-R17-IR1-002) — NON-TAX OBJECT VETO ───────────────────
//
// The independent 210-probe campaign found three material false allows:
//   "What is the taxable font in a CSS file?"   -> ALLOW / strong_tax_signal
//   "Is the BOC a band of chords?"              -> ALLOW / strong_tax_signal
//   "How do I close a VAT color palette?"       -> ALLOW / strong_tax_signal
//
// Cause: a strong signal ALLOWed unconditionally and was documented as never vetoed by a
// non-tax object. That rule is right for "withholding tax on the private lease payment",
// where the tax anchor is unambiguous. It is wrong for a tax HOMOGRAPH — "taxable", "VAT",
// "BOC", "PAN", "FAN", "TIN", "DST", "CTA" and friends all have ordinary non-tax meanings.
//
// The remedy is context-aware, not exact-question: an explicitly non-tax OBJECT vetoes the
// query unless a tax CO-SIGNAL confirms the tax reading. Both lists are category-based.
// No legitimate tax term is removed, and none is made to fail generally.

/**
 * Explicitly non-tax objects and domains of discourse. Presence of one of these means the
 * query is about a font, a colour, a piece of code, a band, a hospital shift and so on.
 */
export const NON_TAX_OBJECT_VETO_PATTERNS = [
  // typography / design
  /\bfont\b|\btypeface\b|\btypography\b|\bfont[- ]?(?:family|weight|style|size)\b/i,
  /\bCSS\b|\bstylesheet\b|\bstyle sheet\b/i,
  /\bcolou?r\b|\bpalette\b|\bswatch\b|\bshade of\b|\bpaint\b|\bpainting\b/i,
  /\bgraphics?\b|\bdesign tool\b|\bFigma\b|\bPhotoshop\b|\bIllustrator\b|\bposter\b|\blogo\b/i,
  // software / code
  /\bJavaScript\b|\bTypeScript\b|\bPython\b|\bJava\b|\bC\+\+\b|\bRuby\b|\bGolang\b/i,
  /\bsoftware\b|\bsource code\b|\bcodebase\b|\brepository\b|\bmodule\b|\blibrary function\b/i,
  /\b(?:in|of|from) (?:my|this|the) code\b|\bmy code\b|\bthis code\b/i,
  // PHASE-10A14-R19: bare "method" was too broad — "valuation method" and "transfer
  // pricing method" are ordinary tax phrasing, not a programming signal. "method" now
  // requires an actual coding-object qualifier.
  /\bvariable\b|\bconstant\b|\bclass name\b|\bfunction\b|\bparameter\b/i,
  /\b(?:class|instance|static|private|public)\s+method\b|\bmethod\s+(?:call|name|signature|override)\b/i,
  /\bnetworking\b|\bnetwork protocol\b|\bAPI\b|\bendpoint\b|\bdatabase query\b/i,
  /\bwebsite\b|\bweb page\b|\bbutton\b|\bUI\b|\bfront[- ]?end\b/i,
  // music / audio
  /\bband\b|\bchord[s]?\b|\bmusic\b|\bsong\b|\balbum\b|\bguitar\b|\bdrummer\b|\btempo\b/i,
  /\baudio\b|\bsound engineering\b|\bairplay\b|\bradio station\b|\bmusic genre\b/i,
  // ordinary-life objects that collide with tax acronyms
  /\bcooking pan\b|\bseason a\b|\bfrying pan\b/i,
  /\bcooling fan\b|\bhow loud\b|\bfan (?:speed|noise)\b/i,
  /\btin can\b|\bmetal element\b/i,
  /\bduty (?:roster|schedule|shift)\b|\bguard duty\b|\bnight shift\b|\bon duty (?:tonight|today)\b/i,
  /\breturn (?:policy|the defective|this defective)\b|\bonline store\b/i,
  /\bmarketing (?:copy|campaign)\b|\bcall to action\b/i,
  /\bdaylight saving\b|\btime zone\b/i,
  /\baviation\b|\bflight (?:plan|crew)\b/i,
  /\bsurgical\b|\bsurgery\b|\bin surgery\b/i,
  /\bschool (?:exam|rubric|test)\b|\bexam rubric\b|\bperformance (?:assessment|review) at work\b/i,
  /\bself[- ]assessment questionnaire\b|\btherapy\b|\bconstruction site\b/i,
  /\bcapital letter\b|\bcapitali[sz]e\b/i,
  /\breferee\b|\bthe game\b/i,
  /\bcredit card\b/i,
  /\breal estate agent\b/i,
  /\bimage\b|\bphoto\b|\bpicture\b/i,
];

/**
 * Tax CO-SIGNALS. These confirm the tax reading and therefore DEFEAT the veto above.
 *
 * Every entry is a phrase or an unambiguous anchor — never a bare homograph. A bare "VAT"
 * must not defeat the veto, or "How do I close a VAT color palette?" would allow itself.
 */
export const TAX_COSIGNAL_PATTERNS = [
  // unambiguous institutional anchors
  /\bBIR\b|\bBureau of Internal Revenue\b|\bNIRC\b|\bNational Internal Revenue Code\b/i,
  /\bBureau of Customs\b|\bCMTA\b|\bPEZA\b|\bBOI\b|\bFIRB\b/i,
  /\bCourt of Tax Appeals\b/i,
  // the word "tax" used as a tax word (not the "taxable font" homograph)
  /\btax\b|\btaxes\b|\btaxation\b|\btaxpayer\b|\btax-?free\b|\btax-?exempt\b/i,
  // taxable + a real tax object
  /\btaxable\s+(?:income|compensation|sale|sales|gain|year|base|amount|transaction|receipts?|estate)\b/i,
  /\b(?:income|compensation|sale|sales|gain|estate|receipts?|profit|dividend|interest income)\b[^.\n]{0,30}\btaxable\b/i,
  // VAT + a real VAT object
  /\bVAT\s+(?:return|invoice|registration|refund|rate|exempt\w*|zero-?rated|payable|due|threshold|declaration)\b/i,
  /\b(?:input|output|subject to|liable for|charge|charged|register(?:ed)? for|exempt from)\s+VAT\b/i,
  /\bVAT[- ]exempt\w*\b|\bzero-?rated\b/i,
  // customs + a real customs object
  /\bcustoms\s+(?:dut(?:y|ies)|declaration|classification|assessment|broker|clearance|valuation|entry)\b/i,
  /\b(?:import|export)\s+dut(?:y|ies)\b|\bdutiable value\b|\bduty drawback\b|\blanded cost\b/i,
  /\btariff\s+(?:classification|heading|rate|schedule)\b|\bimported goods\b|\bimportation\b/i,
  /\bpost-?clearance audit\b/i,
  // other unambiguous tax instruments
  // "withholding" is itself a homograph — a "withholding pattern" is a programming term —
  // so as a CO-SIGNAL it must carry a tax object. It remains a bare STRONG signal, which
  // still allows whenever no non-tax object is present.
  /\bwithholding\s+(?:tax|agent|return|certificate)\b|\b(?:expanded|final|creditable)\s+withholding\b/i,
  /\bwithholding\b[^.\n]{0,30}\b(?:compensation|salary|salaries|wage|rent|rental|income|payment to)\b/i,
  /\bincome tax\b|\bestate tax\b|\bdonor'?s tax\b|\bexcise tax\b/i,
  /\bpercentage tax\b|\bdocumentary stamp\b|\bcapital gains? tax\b|\bcapital gain\b/i,
  /\bLetter of Authority\b|\bassessment notice\b|\bdeficiency\b|\bBIR Form\b/i,
  // PHASE-10A14-R19 (P1-R18-IR1-002): bare RMC/RMO were wrongly listed here as if they
  // were unambiguous anchors. "RMC is a radio music channel" made this cosignal fire and
  // defeat a correct non-tax veto. A cosignal must be a coherent PHRASE, never a bare
  // 2-4 letter acronym — the acronym itself is exactly the ambiguity in question.
  /\bRevenue Regulations?\b|\bRevenue Memorandum\b|\bRMC\s+(?:guidance|circular|issuance)\b|\bRMO\s+(?:guidance|circular|issuance)\b/i,
  /\bbuwis\b|\bimpuwesto\b/i,
];

/**
 * WEAK generic compliance vocabulary. These occur constantly outside tax and are never
 * individually sufficient. Retained for reporting and for the clarify path.
 */
export const WEAK_GENERIC_SIGNAL_PATTERNS = [
  /\bfiling\b/i, /\bfile\b/i, /\bdeadline\b/i, /\bdue date\b/i, /\bdue\b/i,
  /\binterest\b/i, /\bpayment\b/i, /\breturn\b/i, /\bassessment\b/i, /\brefund\b/i,
  /\blease\b/i, /\binvoice\b/i, /\bcourt\b/i, /\bpenalty\b/i, /\bregistration\b/i
];

/**
 * Explicit NON-TAX objects and domains. Where only weak signals are present, these veto
 * the match and produce REJECT (or CLARIFY where a tax link stays genuinely plausible).
 * A STRONG signal is checked first and is never vetoed by these.
 */
export const NON_TAX_CONTEXT_PATTERNS = [
  /\bprivate (?:lease|loan|contract|agreement|arrangement)\b/i,
  /\b(?:my|the) (?:rent|rental|lease) (?:payment|installment|instalment|due)\b/i,
  /\brent installment\b|\brental car\b|\bgym membership\b|\blibrary book\b/i,
  /\bcourt (?:pleading|filing|deadline|appeal|case)\b/i,
  /\b(?:civil|criminal|labor|labour|custody|divorce|annulment|barangay) (?:case|court|dispute|appeal|complaint)\b/i,
  /\bpolice complaint\b/i,
  /\bpayroll (?:cutoff|cut-off|period)\b|\bHR\b/i,
  /\bpassport\b|\bvisa application\b|\bschool\b|\benrol(?:ment|lment)\b|\bconference\b|\bmarathon\b/i,
  /\binsurance claim\b/i,
  /\bpersonal (?:bank )?loan\b|\bbank loan\b/i,
  /\bcondo(?:minium)? (?:association )?dues\b/i,
  /\b(?:cancelled|canceled) flight\b/i,
  /\butility bill\b|\belectric bill\b|\bwater bill\b/i,
  /\bSEC\b(?![^.\n]{0,30}\btax\b)/i,
  /\bsupplier\b[^.\n]{0,20}\binvoice\b|\binvoice\b[^.\n]{0,20}\bsupplier\b/i,
  /\bsprint\b|\bsoftware\b|\brepository\b/i
];

// ─── PHASE-10A14-R15 (P1-R14-IR-002) — TAX-FILING ADJACENCY ───────────────────
//
// R14 rejected filing-adjacent questions as out-of-domain because they named no explicit
// tax keyword: "Does the authority establish that I must file today?", "The notice says,
// 'File today.' Does that apply to me?", "Huwag daw akong mag-fail mag-file ngayon."
// The R15 pre-fix live campaign reproduced 17 such rejections, not merely the 7 sampled.
//
// These patterns key on tax-filing CONTEXT AND OBJECT — a return, a filing deadline, a
// filing obligation, a BIR/accountant/authority statement about filing — never on the
// bare token "file". NON_TAX_FILE_OBJECT_PATTERNS below is checked FIRST and vetoes them,
// so "open the computer file" and "file a police complaint" stay out of the tax domain.

export const NON_TAX_FILE_OBJECT_PATTERNS = [
  /\b(?:computer|text|log|zip|pdf|word|excel|csv|image|photo|video|audio|config|source|backup)\s+file\b/i,
  /\bfile\s+(?:extension|format|name|path|size|type|manager|system|explorer)\b/i,
  /\b(?:open|save|rename|delete|convert|attach|upload|download|compress|copy|move|zip|unzip)\b[^.\n]{0,20}\bfile\b/i,
  /\bfile\b[^.\n]{0,40}\b(?:folder|directory|desktop|drive|server|email|attachment|cabinet)\b/i,
  /\bfil(?:e|ing)\s+(?:a|an|the|this|that|my|your)?\s*(?:photo|image|picture|video|scan|document|doc|pdf|spreadsheet|receipt image)\b/i,
  /\bfil(?:e|ing)\b[^.\n]{0,30}\b(?:police|criminal|complaint against|custody|divorce|annulment|labor case|estafa)\b/i,
  /\bfil(?:e|ing)\b[^.\n]{0,30}\b(?:court|pleading|motion|petition)\b(?![^.\n]{0,40}\b(?:tax|bir|cta|assessment)\b)/i,
  /\bfile\s+the\s+documents?\b[^.\n]{0,30}\b(?:alphabetically|cabinet|shelf|binder)\b/i,
];

/**
 * PHASE-10A14-R16: adjacency CO-SIGNAL. A tax-filing adjacency pattern alone is still too
 * permissive for a bare generic frame — "What is the filing deadline?", "When is the
 * return due?", "Can I file next business day?" and "Is the assessment deadline extended?"
 * are genuinely ambiguous and must clarify rather than silently enter the tax domain.
 *
 * Adjacency therefore requires one of these co-signals: a return period, a tax-practice
 * actor or instrument, a nonperformance-of-filing idiom, or a calendar-relative filing
 * context. Every accepted R15 closure carries at least one — verified probe by probe
 * across the seven named false-refusal probes and the ten-case adjacency family — so this
 * tightening cannot reintroduce the refusals R15 closed.
 */
export const TAX_ADJACENCY_COSIGNAL_PATTERNS = [
  /\b(?:annual|quarterly|monthly)\b/i,
  /\bITR\b|\bincome\b|\bgross receipts\b|\bcompensation\b/i,
  /\b(?:authority|notice|letter|assessment notice|ruling|regulation)\b/i,
  /\b(?:accountant|auditor|adviser|advisor|bookkeeper|cpa|bir)\b/i,
  /\b(?:fail(?:ure|ing|s|ed)?|forget|forgot|neglect|omit|miss)\s+(?:to\s+)?fil(?:e|ing)\b/i,
  /\b(?:unfiled|unsubmitted|outstanding|overdue|late)\b/i,
  /\b(?:today|tonight|tomorrow|midnight|right now|immediately|this week)\b/i,
  /\b(?:ngayon|ngayong araw|bukas|kaagad|agad)\b/i,
  /\b(?:mag-?file|i-?file|isumite|mag-?submit|nakakapag-?file|naka-?file|pag-?file)\b/i,
  /\b(?:penalt\w*|surcharge)\b/i
];

export const TAX_FILING_ADJACENT_PATTERNS = [
  // nonperformance-of-filing idioms (strong tax-compliance markers)
  /\b(?:fail(?:ure|ing|s|ed)?|forget(?:ting|s)?|forgot|neglect(?:ing|s|ed)?|omit(?:ting|s|ted)?|miss(?:ing|es|ed)?)\s+(?:to\s+)?fil(?:e|ing)\b/i,
  /\b(?:return|filing)\b[^.\n]{0,30}\b(?:unfiled|unsubmitted|outstanding|overdue|late)\b/i,
  // the return as an object of filing
  /\b(?:annual|quarterly|income tax|itr|my|the)\s+return\b[^.\n]{0,40}\b(?:file|filed|filing|submit|submitted|due|deadline|outstanding)\b/i,
  /\b(?:file|filed|filing|submit|submitted|lodge)\b[^.\n]{0,40}\b(?:annual|quarterly|income tax|itr|my|the)\s+return\b/i,
  // filing deadline / obligation
  /\bfiling\s+(?:deadline|due date|date|obligation|requirement|period)\b/i,
  /\bdeadline\b[^.\n]{0,40}\b(?:file|filing|submit|return)\b/i,
  /\b(?:file|filing|submit)\b[^.\n]{0,40}\bdeadline\b/i,
  // authority / notice / adviser statements about filing
  // PHASE-10A14-R17: the object must be a FILING act, not a bare "deadline". "Is a notice
  // required before the deadline?" has no filing object and must clarify. Verified not to
  // regress the accepted closures, each of which names a filing act: LQ2 ("notice … File
  // today"), LS2 ("authority … file today"), RA9 ("authority … filing deadline"), RA4
  // (BIR is a strong anchor regardless).
  /\b(?:authority|notice|letter of authority|assessment|regulation|ruling)\b[^.\n]{0,50}\b(?:file|filing|submit|return)\b/i,
  /\b(?:accountant|auditor|adviser|advisor|bookkeeper|cpa)\b[^.\n]{0,60}\b(?:file|filing|submit|return|deadline)\b/i,
  // filing directed at a calendar-relative time (the R14 probe family)
  /\b(?:file|filing|submit|lodge)\b[^.\n]{0,40}\b(?:today|tonight|tomorrow|midnight|right now|immediately)\b/i,
  /\b(?:today|tonight|tomorrow|midnight)\b[^.\n]{0,40}\b(?:file|filing|submit|lodge)\b/i,
  // filing-obligation questions ("do I need to file if I had no income?"). The non-tax
  // file-object veto still guards these, so "should I file a police complaint?" and
  // "do I need to file the documents alphabetically?" remain outside the tax domain.
  /\b(?:need|needs|needed|have|has|had|required|obliged|obligated|supposed)\s+to\s+file\b/i,
  /\b(?:do|does|did|should|must|can|am|are|is)\s+(?:i|we|you|he|she|they|my\s+\w+)\s+(?:still\s+|also\s+)?(?:need\s+to\s+|have\s+to\s+|required\s+to\s+)?file\b/i,
  /\bwho\s+(?:must|should|needs?\s+to|is\s+required\s+to)\s+file\b/i,
  // Filipino / Taglish filing
  /\b(?:mag-?file|i-?file|isumite|mag-?submit|nakakapag-?file|naka-?file|pag-?file)\b/i,
  /\b(?:mapalampas|kalimutan\w*|ipagpaliban)\b[^.\n]{0,30}\b(?:file|filing|return)\b/i,
];

// ─── Non-tax REJECT patterns ──────────────────────────────────────────────────
// Used to detect clearly non-Philippine-tax queries for explicit reject logging.
// With fail-closed default, these are supplementary — they improve the log
// reason and provide faster rejection before the default.

export const NON_TAX_REJECT_PATTERNS = [
  // ── Biology / life sciences ───────────────────────────────────────────────
  // Safe: "tax on biology lab" → "tax" hits allowlist first → never reaches here.
  { pattern: /\bbiology\b/i,                                  domain: "BIOLOGY" },
  { pattern: /\bbiological\b/i,                               domain: "BIOLOGY" },
  { pattern: /\bbiochemistry\b/i,                             domain: "BIOLOGY" },
  { pattern: /\bmicrobiology\b/i,                             domain: "BIOLOGY" },
  { pattern: /\bDNA\b/i,                                      domain: "BIOLOGY" },
  { pattern: /\bcell\s+biology\b/i,                          domain: "BIOLOGY" },
  { pattern: /\bphotosynthesis\b/i,                          domain: "BIOLOGY" },
  { pattern: /\bmitosis\b|\bmeiosis\b/i,                     domain: "BIOLOGY" },
  { pattern: /\bgenetics\b|\bgenome\b/i,                     domain: "BIOLOGY" },
  { pattern: /\becology\b/i,                                  domain: "BIOLOGY" },
  { pattern: /\bzoology\b|\bbotany\b/i,                      domain: "BIOLOGY" },
  { pattern: /\bevolution\b/i,                               domain: "BIOLOGY" },
  { pattern: /\borganism\b|\bspecies\b/i,                    domain: "BIOLOGY" },
  { pattern: /\bchromosome[s]?\b/i,                          domain: "BIOLOGY" },

  // ── Natural science (general) ─────────────────────────────────────────────
  // Catches "what is science?", "explain physics", "what is chemistry?", etc.
  // Safe: "tax science" / "science of taxation" → "tax"/"taxation" hits allowlist first.
  { pattern: /\bscience\b/i,                                  domain: "SCIENCE" },
  { pattern: /\bphysics\b/i,                                  domain: "SCIENCE" },
  { pattern: /\bchemistry\b/i,                                domain: "SCIENCE" },
  { pattern: /\bgeology\b/i,                                  domain: "SCIENCE" },
  { pattern: /\bastronomy\b/i,                                domain: "SCIENCE" },
  { pattern: /\bphotosynthesis\b/i,                          domain: "SCIENCE" },
  { pattern: /\bquantum\s+mechanics\b/i,                     domain: "SCIENCE" },
  { pattern: /\bblack\s+hole[s]?\b/i,                        domain: "SCIENCE" },
  { pattern: /\bastrophysics\b/i,                            domain: "SCIENCE" },
  { pattern: /\bstring\s+theory\b/i,                         domain: "SCIENCE" },
  { pattern: /\bNewton'?s?\s+law[s]?\b/i,                    domain: "SCIENCE" },

  // ── Medicine / clinical health ────────────────────────────────────────────
  // Safe: "medicine tax", "tax on medicine" → "tax" hits allowlist first.
  { pattern: /\bmedicine\b/i,                                 domain: "MEDICINE" },
  { pattern: /\banatomy\b/i,                                  domain: "MEDICINE" },
  { pattern: /\bpharmacology\b/i,                             domain: "MEDICINE" },
  { pattern: /\bmedical\s+diagnosis\b/i,                     domain: "MEDICINE" },
  { pattern: /\bsurgical\s+procedure\b/i,                    domain: "MEDICINE" },
  { pattern: /\bhuman\s+anatomy\b/i,                         domain: "MEDICINE" },
  { pattern: /\bcancer\s+treatment\b/i,                      domain: "MEDICINE" },
  { pattern: /\bvaccine\s+efficacy\b/i,                      domain: "MEDICINE" },
  { pattern: /\bchemotherapy\b/i,                            domain: "MEDICINE" },
  { pattern: /\bmedical\s+prescription\b/i,                  domain: "MEDICINE" },
  { pattern: /\bdrug\s+dosage\b/i,                           domain: "MEDICINE" },
  { pattern: /\bclinical\s+trial[s]?\b/i,                    domain: "MEDICINE" },

  // ── Politics / government (non-tax) ──────────────────────────────────────
  // Safe: "political question doctrine in tax" → "tax" hits allowlist first.
  { pattern: /\bpolitics\b/i,                                 domain: "POLITICS" },
  { pattern: /\bpolitician[s]?\b/i,                           domain: "POLITICS" },
  { pattern: /\bwho\s+is\s+the\s+president\b/i,             domain: "POLITICS" },
  { pattern: /\bpresident\s+of\s+the\s+Philippines?\b/i,    domain: "POLITICS" },
  { pattern: /\bpresidential\s+election\b/i,                 domain: "POLITICS" },
  { pattern: /\bsenate\s+(bill|hearing|seat)\b/i,            domain: "POLITICS" },
  { pattern: /\bcongress(man|woman|person)?\s+(election|seat)\b/i, domain: "POLITICS" },
  { pattern: /\bpolitical\s+(party|rally|campaign)\b/i,      domain: "POLITICS" },
  { pattern: /\bvot(e|ing)\s+(for|in)\s+the\s+election\b/i, domain: "POLITICS" },

  // ── Coding / software development ─────────────────────────────────────────
  // Safe: "React to BIR assessment" → "BIR" hits allowlist first.
  // Safe: "JavaScript for eFPS" → "BIR"/"filing" in isTaxRelated context.
  { pattern: /\bJavaScript\b/i,                               domain: "PROGRAMMING" },
  { pattern: /\bTypeScript\b/i,                               domain: "PROGRAMMING" },
  { pattern: /\bReact\b/i,                                    domain: "PROGRAMMING" },
  { pattern: /\bAngular\b/i,                                  domain: "PROGRAMMING" },
  { pattern: /\bVue\.?js\b/i,                                 domain: "PROGRAMMING" },
  { pattern: /\bNode\.js\b/i,                                 domain: "PROGRAMMING" },
  { pattern: /\bcoding\b/i,                                   domain: "PROGRAMMING" },
  { pattern: /\bprogramming\b/i,                              domain: "PROGRAMMING" },
  { pattern: /\bwrite\s+(a\s+)?(python|javascript|java|c\+\+|ruby|golang|typescript|react|angular|vue|swift)\s+(code|program|script|function|class|component)\b/i, domain: "PROGRAMMING" },
  { pattern: /\bhow\s+to\s+code\b/i,                        domain: "PROGRAMMING" },
  { pattern: /\bdebug\s+(my\s+)?(code|program|script)\b/i,  domain: "PROGRAMMING" },
  { pattern: /\bsoftware\s+(architecture|engineering|development)\b/i, domain: "PROGRAMMING" },
  { pattern: /\bSQL\s+(query|database)\b/i,                  domain: "PROGRAMMING" },
  { pattern: /\bGitHub\s+(repo|pull\s+request)\b/i,          domain: "PROGRAMMING" },
  { pattern: /\bAPI\s+(endpoint|integration)\b/i,            domain: "PROGRAMMING" },

  // ── Romantic / personal relationships ─────────────────────────────────────
  { pattern: /\blove\s+letter\b/i,                           domain: "PERSONAL" },
  { pattern: /\bwrite\s+(me\s+)?a\s+love\b/i,               domain: "PERSONAL" },
  { pattern: /\brelationship\s+advice\b/i,                   domain: "PERSONAL" },
  { pattern: /\bromantic\s+(advice|letter|message|poem)\b/i, domain: "PERSONAL" },
  { pattern: /\bhow\s+to\s+(attract|impress|seduce)\b/i,    domain: "PERSONAL" },
  { pattern: /\bdating\s+(tips|advice|app)\b/i,              domain: "PERSONAL" },
  { pattern: /\bhow\s+to\s+win\s+(back|over)\b/i,           domain: "PERSONAL" },

  // ── Sports (score/game queries) ───────────────────────────────────────────
  { pattern: /\bfootball\s+score\b/i,                        domain: "SPORTS" },
  { pattern: /\bnba\s+(score|game|standings)\b/i,            domain: "SPORTS" },
  { pattern: /\bbasketball\s+(game\s+score|standings)\b/i,   domain: "SPORTS" },
  { pattern: /\bsoccer\s+(score|match\s+result)\b/i,         domain: "SPORTS" },
  { pattern: /\bwho\s+won\s+the\s+(game|match|championship)\b/i, domain: "SPORTS" },

  // ── Travel / tourism ──────────────────────────────────────────────────────
  { pattern: /\btravel\s+(guide|itinerary|tips)\b/i,         domain: "TRAVEL" },
  { pattern: /\btourist\s+spots?\b/i,                        domain: "TRAVEL" },
  { pattern: /\bhotel\s+recommendation[s]?\b/i,              domain: "TRAVEL" },
  { pattern: /\bbest\s+place[s]?\s+to\s+visit\b/i,          domain: "TRAVEL" },

  // ── Entertainment / media ─────────────────────────────────────────────────
  { pattern: /\bmovie\s+review\b/i,                          domain: "ENTERTAINMENT" },
  { pattern: /\bTV\s+show\s+recommendation\b/i,              domain: "ENTERTAINMENT" },
  { pattern: /\bcelebrit(y|ies)\s+gossip\b/i,                domain: "ENTERTAINMENT" },
  { pattern: /\bsong\s+lyrics\b/i,                           domain: "ENTERTAINMENT" },

  // ── Cooking / food ────────────────────────────────────────────────────────
  { pattern: /\bhow\s+to\s+(cook|bake|fry|boil|steam)\b/i,  domain: "COOKING" },
  { pattern: /\brecipe\s+for\b/i,                            domain: "COOKING" },
  { pattern: /\bingredients\s+(for|of)\b/i,                  domain: "COOKING" },

  // ── Civil / family law (non-tax) ──────────────────────────────────────────
  // Safe: "civil law aspect of tax" → "tax" hits allowlist first.
  { pattern: /\bcivil\s+law\b/i,                             domain: "CIVIL_LAW" },
  { pattern: /\bfamily\s+law\b/i,                            domain: "CIVIL_LAW" },
  { pattern: /\bnullity\s+of\s+marriage\b/i,                 domain: "CIVIL_LAW" },
  { pattern: /\bannulment\s+(of\s+marriage|proceedings)\b/i, domain: "CIVIL_LAW" },
  { pattern: /\blegal\s+separation\s+grounds\b/i,            domain: "CIVIL_LAW" },
  { pattern: /\badoption\s+proceedings\b/i,                  domain: "CIVIL_LAW" },

  // ── Criminal law (non-tax) ────────────────────────────────────────────────
  // Safe: "criminal liability for tax evasion" → "tax" hits allowlist first.
  { pattern: /\bcriminal\s+law\b/i,                          domain: "CRIMINAL_LAW" },
  { pattern: /\bcriminal\s+procedure\b/i,                    domain: "CRIMINAL_LAW" },
  { pattern: /\bcriminal\s+(court|litigation|prosecution)\b/i, domain: "CRIMINAL_LAW" },
  { pattern: /\bcriminal\s+trial\b/i,                        domain: "CRIMINAL_LAW" },
  { pattern: /\bcriminal\s+case\s+(procedure|rules|process)\b/i, domain: "CRIMINAL_LAW" },
  { pattern: /\brules\s+of\s+criminal\s+procedure\b/i,       domain: "CRIMINAL_LAW" },
  { pattern: /\bmurder\s+(charge|case|trial)\b/i,            domain: "CRIMINAL_LAW" },
  { pattern: /\bkidnapping\s+(case|charge)\b/i,              domain: "CRIMINAL_LAW" },
  { pattern: /\bdrug\s+trafficking\b/i,                      domain: "CRIMINAL_LAW" },

  // ── Investment / finance (non-tax) ───────────────────────────────────────
  // Safe: "investment tax credit" → "tax" hits allowlist first.
  { pattern: /\binvestment\s+advice\b/i,                     domain: "INVESTMENT" },
  { pattern: /\bstock\s+(market|portfolio|trading|picks?)\b/i, domain: "INVESTMENT" },
  { pattern: /\bcryptocurrency\b/i,                          domain: "INVESTMENT" },
  { pattern: /\bcrypto\s+(trading|investment|wallet)\b/i,    domain: "INVESTMENT" },
  { pattern: /\bforex\s+(trading|market)\b/i,                domain: "INVESTMENT" },

  // ── Trivia / general knowledge ────────────────────────────────────────────
  { pattern: /\btrivia\b/i,                                   domain: "TRIVIA" },
  { pattern: /\bfun\s+fact[s]?\b/i,                          domain: "TRIVIA" },
  { pattern: /\bguess\s+the\s+(answer|word|number)\b/i,       domain: "TRIVIA" },

  // ── Pet / animal care ─────────────────────────────────────────────────────
  { pattern: /\bhow\s+to\s+(train|groom|feed)\s+(my\s+)?(dog|cat|pet)\b/i, domain: "PETS" },
  { pattern: /\bdog\s+(breed|grooming|training\s+tips)\b/i,  domain: "PETS" },

  // ── Religion / spirituality / theology ───────────────────────────────────
  // Safe: "tax exemption for religious orgs" → "tax" hits allowlist first.
  // Safe: "church BIR registration" → "BIR" hits allowlist first.
  // Safe: "prayer for relief in tax protest" → "tax" hits allowlist first.
  { pattern: /\breligion\b/i,                                domain: "RELIGION" },
  { pattern: /\breligious\b/i,                               domain: "RELIGION" },
  { pattern: /\btheology\b/i,                                domain: "RELIGION" },
  { pattern: /\btheological\b/i,                             domain: "RELIGION" },
  { pattern: /\bworship\b/i,                                 domain: "RELIGION" },
  { pattern: /\bprayer\b/i,                                  domain: "RELIGION" },
  { pattern: /\bBible\b/i,                                   domain: "RELIGION" },
  { pattern: /\bQuran\b|\bKoran\b/i,                         domain: "RELIGION" },
  { pattern: /\bscripture[s]?\b/i,                           domain: "RELIGION" },
  { pattern: /\bchurch\b/i,                                  domain: "RELIGION" },
  { pattern: /\bspiritual(ity)?\b/i,                         domain: "RELIGION" },
  { pattern: /\bdivine\s+(will|law|grace|command)\b/i,       domain: "RELIGION" },
];

// ─── Audit-mode tax signals ───────────────────────────────────────────────────
// For /audit mode: require at least one of these to be present.
// /audit is a BIR-tax-controversy-only mode.

export const AUDIT_TAX_SIGNALS = [
  /\bLOA\b/i,
  /\bLetter\s+of\s+Authority\b/i,
  /\bPAN\b/i,
  /\bFAN\b/i,
  /\bFDDA\b/i,
  /\bFLD\b/i,
  /\bNIC\b/i,
  /\bBIR\b/i,
  /\bdeficiency\b/i,
  /\btax\b/i,
  /\bvat\b/i,
  /\bwithholding\b/i,
  /\baudit\s+defense\b/i,
  /\btax\s+assessment\b/i,
  /\btax\s+protest\b/i,
  /\btax\s+exposure\b/i,
  /\bprotest\s+letter\b/i,
  /\breconsideration\b/i,
  /\breinvestigation\b/i,
  /\bcompromise\b/i,
  /\bdelinquency\b/i,
  /\bBIR\s+examiner\b/i,
  /\bCTA\b/i,
  /\bpost[- ]?clearance\b/i,
];

// ─── Tax-adjacent CLARIFY patterns ───────────────────────────────────────────
// Queries that are ambiguous but plausibly tax-related in Philippine context.
// No confirmed PH-tax signal, but NOT a clearly non-tax domain either.
// Returns CLARIFY to invite the user to add context.
//
// Checked AFTER NON_TAX_REJECT_PATTERNS — explicit REJECT beats ambiguous CLARIFY.
// Checked BEFORE the fail-closed default — ambiguous tax-adjacent beats REJECT.
//
// Safe: "gross receipts tax" → "tax" hits PH_TAX_ALLOW_PATTERNS first → ALLOW.
// Safe: "penalty for late BIR filing" → "BIR" hits allowlist first → ALLOW.

export const CLARIFY_PATTERNS = [
  { pattern: /\b(?:non[-\s]?resident|resident)\s+citizens?\b/i, domain: "TAXPAYER_STATUS" },
  { pattern: /\b(?:non[-\s]?resident|resident)\s+aliens?\b/i,   domain: "TAXPAYER_STATUS" },
  { pattern: /\bgross\s+receipts?\b/i,             domain: "TAX_ADJACENT" },
  { pattern: /\bprofessional\s+fees?\b/i,          domain: "TAX_ADJACENT" },
  { pattern: /\baudit\s+risk\b/i,                  domain: "TAX_ADJACENT" },
  { pattern: /\blease[s]?\b/i,                     domain: "TAX_ADJACENT" },
  { pattern: /\bregistration\b/i,                  domain: "TAX_ADJACENT" },
  { pattern: /\bpenalt(y|ies)\b/i,                 domain: "TAX_ADJACENT" },
  { pattern: /\bwithholding\s+certificate\b/i,     domain: "TAX_ADJACENT" },
  { pattern: /\bcreditable\b/i,                    domain: "TAX_ADJACENT" },
  { pattern: /\bsubstantiation\b/i,                domain: "TAX_ADJACENT" },
  { pattern: /\bbooks\s+of\s+accounts?\b/i,        domain: "TAX_ADJACENT" },
  { pattern: /\bofficial\s+receipt\b/i,            domain: "TAX_ADJACENT" },
];

// ─── PHASE-10A14-R19 (P1-R18-IR1-001/002) — DOMINANT NON-TAX ROLE VETO ────────
//
// The R18 independent-review unseen campaign found 67 material false allows and 12
// metamorphic false-allow failures over a frozen 567-probe oracle, all with reason
// strong_tax_signal. R18's non-tax-object veto is defeated by any TAX_COSIGNAL match
// anywhere in the sentence — correct for a genuine ambiguity ("Is software subject to
// VAT?") but wrong when a cosignal PHRASE matches as a bare substring inside a sentence
// whose real subject is a variable, a device, a hobby or a body of knowledge unrelated to
// tax ("VAT return as function return value" — "VAT return" matches the cosignal, but the
// sentence is about a programming return value, not a tax return).
//
// This tier runs BEFORE the cosignal-defeatable veto and before the strong-signal check,
// and is NEVER defeated by any cosignal, because every pattern here names an object ROLE
// that is orthogonal to whichever tax-shaped token happens to be nearby: the sentence is
// simply not about tax, no matter which cosignal phrase it happens to contain.
//
// Organized by reusable rule family (never by exact sentence), per the frozen
// CONTEXT_QUALIFIED_DECISION_SPEC.md. A known tax acronym or polysemous tax phrase is not
// automatically tax when surrounding words establish a different object, field, role or
// meaning — the guiding principle for every family below.

export const DOMINANT_NON_TAX_ROLE_VETO_PATTERNS = [
  // ── Software / code / UI role markers ────────────────────────────────────
  // The sentence's true subject is a variable, function, form field, console output,
  // design/colour/hue token, icon, CSS class, plugin, software flag, app log or code
  // snippet — not a tax concept, regardless of which tax-shaped word is nearby.
  /\bvariable\s+name\b|\bas\s+a\s+variable\b|\bvariable\s+in\s+(?:this\s+)?(?:software|code)\b/i,
  /\bfunction\s+return\s+value\b|\breturn\s+value\s+(?:of|from)\s+a?\s*function\b|\bfrom\s+a\s+function\b/i,
  /\bform\s+(?:input|field)\s+label\b|\binto\s+(?:this\s+|a\s+)?(?:web\s+)?form\s+(?:field|input)\b|\binto\s+a\s+text\s+box\b|\btext\s+box\b/i,
  /\bconsole\s+output\s+label\b|\bto\s+the\s+console\b|\bfrom\s+the\s+console\b/i,
  /\bdesign\s+token\b|\bcolou?r\s+token\b|\bhue\s+token\b|\bicon\s+(?:design|only)\b|\bdesign\s+system\b/i,
  /\btaxable\s+CSS\s+class\b|\bCSS\s+class\b|\bstylesheet\b/i,
  /\bplugin\s+code\b|\bmy\s+plugin\b|\bin\s+music\s+software\b/i,
  /\brandom\s+software\s+flag\b|\bsoftware\s+flag\b|\bapp\s+log[s]?\b/i,
  /\bcode\s+snippet\b|\bmy\s+software\s+project\b|\bsoftware\s+project\b/i,

  // ── Random / unknown code labels ─────────────────────────────────────────
  // A tax acronym is explicitly relabeled as a random or unknown project, product,
  // training or course code, SKU, or field abbreviation.
  /\brandom\s+SKU\b|\bas\s+a\s+(?:random\s+)?SKU\b/i,
  /\bcourse\s+code\b|\bcourse\s+ID\b|\brobotics\s+course\b/i,
  /\bproject\s+code\b|\bunknown\s+project\s+code\b/i,
  /\btraining\s+code\b|\brandom\s+training\s+code\b/i,
  /\bproduct\s+code\b|\brandom\s+product\s+code\b/i,
  /\bfield\s+abbreviation\b|\bmy\s+spreadsheet\b|\bspreadsheet\s+field\b/i,
  /\bunknown\s+acronym\b|\bin\s+my\s+app\s+logs\b/i,

  // ── Physical devices / animals ────────────────────────────────────────────
  /\bcooling\s+(?:fan|speed|device)\b|\bfan\s+cooling\b|\bhow\s+loud\s+is\s+this\s+(?:cooling\s+)?fan\b/i,
  /\bcooking\s+(?:utensil|tool|pan)\b|\bpan\s+is\s+a\s+cooking\b|\bbaking\s+pan\b|\bcookware\s+set\b/i,
  /\bon-?screen\s+display\b|\bmonitor\s+display\b|\bOSD\b[^.\n]{0,20}\bmonitor\b|\bmonitor\b[^.\n]{0,20}\bOSD\b/i,
  /\bmetal\s+can\b|\btin\s+can\b|\btin\s+is\s+a\s+metal\b/i,
  /\bbird\s+typo\b|\bis\s+a\s+bird\b/i,

  // ── Audio / music ─────────────────────────────────────────────────────────
  /\bband\s+of\s+chords\b|\bmusic\s+channel\b|\bradio\s+music\b|\bin\s+audio\b|\bBOC\s+in\s+audio\b/i,
  /\bamplifier\b|\bspeaker\b|\bstereo\s+equipment\b|\baudio\s+equipment\b/i,
  /\bcall-?to-?action\s+button\b|\bCTA\s+button\b/i,

  // ── Culture / tradition ────────────────────────────────────────────────────
  /\b(?:cultural|social|local|traditional|family|wedding|dinner|holiday|regional|indigenous|tribal)\s+customs?\b/i,
  /\bcustoms?\b[^.\n]{0,30}\b(?:tradition[s]?|etiquette|culture\s+class|wedding|dinner|holiday|festival|apply\s+at)\b/i,
  /\bwhat\s+are\s+cultural\s+customs\b/i,

  // ── Medicine ───────────────────────────────────────────────────────────────
  /\bmedical\s+prescription\b|\bprescription\s+(?:period|for)\s+antibiotics\b|\bantibiotics\b/i,
  /\bvitamin\s+deficienc\w*\b/i,
  /\bprescriptive\s+period\b[^.\n]{0,20}\bmedicine\b|\bin\s+medicine\b/i,

  // ── Real estate / marketing / landscaping ─────────────────────────────────
  /\breal-?estate\s+(?:marketing|ads|copy)\b|\bmarketing\s+(?:phrase|copy)\b|\blandscaping\b/i,
  /\breceipt\s+layout\b|\blayout\s+design\b/i,

  // ── Hobbies / games ────────────────────────────────────────────────────────
  /\bboard\s+game\b|\bgame\s+guild\b|\bgame\s+quest\b|\bprice\s+transfers?\s+in\s+a\s+board\s+game\b/i,

  // ── School / class ─────────────────────────────────────────────────────────
  /\bschool\s+raffle\b|\bexam\s+grade\b|\bgrammar\s+class\b|\bnegotiation\s+class\b/i,
  /\balphabetical\s+list\b|\bmake\s+an?\s+alpha(?:beti\w*)?\s*list\s+of\b|\balphalist\s+of\s+students\b/i,

  // ── Architecture / building ────────────────────────────────────────────────
  /\bin\s+architecture\b|\barchitectural\s+establishment\b|\bbuilding\s+directions?\b/i,

  // ── Office / generic mislabeling ──────────────────────────────────────────
  /\bnovel\s+list\b|\blist\s+of\s+novels\b|\bclub\s+acronym\b|\bdelivery\s+surcharge\b/i,
  /\binformal\s+conference\s+agenda\b(?!\s*[^.\n]{0,30}\b(?:BIR|notice|tax)\b)|\bplan\s+an?\s+(?:informal\s+)?conference\s+agenda\b/i,
  /\bgrammar\s+class\b/i,
  /\binsurance\s+deductible\b/i,

  // ── Explicit negation ──────────────────────────────────────────────────────
  /\bwithout\s+tax\b|\bnot\s+tax-?related\b|\bnon-?tax\b|\bno\s+tax\s+(?:involved|context)\b/i,
  // Generic "not a recognized/used term" negation family: an acronym explicitly disclaimed
  // as meaningless/unrecognized/unused is describing itself as NOT a tax term, regardless
  // of which real tax acronym it happens to spell.
  /\bis(?:n'?t)?\s+not\s+a\s+(?:recognized\s+|used\s+)?term\b|\bisn'?t\s+a\s+term\b/i,
  /\bnot\s+a\s+term\s+(?:used|relevant)\b|\bnobody\b[^.\n]{0,20}\brecogni[sz]es\b/i,
  /\bdoesn'?t\s+mean\s+anything\b|\bmeaningless\s+in\s+my\b|\bnot\s+a\s+word\s+I'?ve\s+heard\b/i,
  /\bnot\s+relevant\s+to\s+my\s+hobby\b|\bisn'?t\s+used\s+(?:anywhere\s+)?in\s+my\b|\bhas\s+no\s+meaning\b/i,

  // ── PHASE-10A14-R19 (P1-R18-IR1-001, development-oracle iteration) ────────
  // Additional rule families surfaced by the R19 development campaign, still organized
  // by reusable object/role rather than exact sentences.

  // Hobbies / games (broadened)
  /\bracing\s+game\b|\bgaming\s+clan\b|\bclan'?s?\s+tag\b|\bonline\s+game\b|\bvideo\s+game\s+level\b/i,
  /\bclassroom\s+(?:negotiation\s+)?exercise\b/i,

  // Cooking / kitchen (broadened beyond "cooking utensil/pan")
  /\bfrying\s+eggs?\b|\bfor\s+frying\b/i,

  // Devices / electronics (broadened)
  /\bin\s+my\s+laptop\b|\bmy\s+laptop\s+is\b|\bgaming\s+monitor\b|\bOSD\s+overlay\b|\bon\s+my\s+TV\b/i,
  /\btin\s+whistle\b|\bmusical\s+instrument\b/i,

  // Time-zone / daylight-saving homograph for DST (Documentary Stamp Tax)
  /\bDST\b[^.\n]{0,30}\b(?:clock|daylight|time\s+zone|weekend\s+ends?)\b|\bchange\s+your\s+clock\b/i,

  // Internal / organizational codename mislabeling
  /\binternal\s+code(?:name)?\s+for\b|\bunreleased\s+app\b|\bfeature\s+toggle\b/i,
  /\bname\s+of\s+my\s+(?:chess\s+club|pet\s+\w+)\b|\bmy\s+pet\s+\w+\b|\bcomic\s+book\b|\blicense\s+plate\b/i,
  /\bstamped\s+on\s+(?:this|the)\s+(?:random\s+)?product\s+box\b|\brandom\s+serial\s+number\b/i,
  /\bdata\s+dictionary\b/i,
  /\bsounds?\s+just\s+like\s+the\s+word\b/i,

  // Real estate / landmarks (broadened)
  /\bproperty\s+brochure\b|\blandmark\b|\bmonument\b|\btrain\s+station\b/i,

  // Medicine (broadened)
  /\bmedical\s+malpractice\b|\bprescription\s+refill\b/i,

  // School / hobby groups (broadened)
  /\bbake\s+sale\b|\bpirate\s+adventures\b|\bhobby\s+group\b/i,

  // Generic club/organization report mislabeling
  /\bclub'?s?\s+(?:annual\s+)?(?:information\s+)?return\s+to\s+members\b|\bsummarizes\s+attendance\b/i,

  // Software/code — reinforced dominant coverage for the exact homograph families that
  // must survive an adjacent tax-word cosignal (e.g. "discussing BIR forms, but now:
  // what is the taxable font in this CSS file?").
  /\btaxable\s+font\b[^.\n]{0,30}\bCSS\b|\bCSS\s+file\b/i,
  /\bclose\s+a\s+VAT\s+colou?r\s+palette\b|\bVAT\s+colou?r\s+palette\b/i,

  // Filipino / Taglish non-tax object markers
  /\beroplano\b|\bkodigo\b|\bproduktong?\b/i,
  // General "X ba yan ay Y lang sa/sa Z" ("is X just Y in Z") mislabeling construction,
  // reusable across any acronym or tax word substituted for X.
  /\bba\s+yan\s+ay\b[^.\n]{0,40}\blang\b/i,
  /\buri\s+ng\s+laro\b|\bibon\b|\bbentilador\b|\bkawali\b|\bistasyon\s+ng\s+radyo\b|\btradisyon\b|\bkuko\b/i,

  // PHASE-10A14-R19 (executor unseen campaign iteration). An acronym IMMEDIATELY followed
  // by a lowercase-starting parenthetical gloss is almost always a colloquial or joke
  // expansion — genuine tax citations spell the parenthetical in title case
  // ("RCIT (Regular Corporate Income Tax)"), never lowercase ("CGT (community garden
  // team)"). This single structural pattern generalizes across any acronym.
  // Allow an optional lowercase letter before the acronym core (eLA, eFPS, eBIRForms).
  /\b[a-z]?[A-Z]{2,6}\s*\([a-z][a-z\s'-]{2,60}\)/,

  // Generic acronym-mislabeling / disclaimer phrasings, reusable across any acronym.
  // "is the <label> ... for/of/on <object>" — intervening words (my classmates use,
  // my sister uses) are common, so the label and the preposition are not required to be
  // adjacent.
  /\bstands\s+for\s+nothing\b|\bdoesn'?t\s+ring\s+a\s+bell\b|\bdoesn'?t\s+come\s+up\s+in\b/i,
  /\bisn'?t\s+(?:an?\s+)?(?:acronym|recogni[sz]ed)\b[^.\n]{0,40}\b(?:use[sd]?|recogni[sz]es|team|club|group|circle)\b/i,
  /\bis\s+(?:just\s+)?the\s+(?:mascot\s+name|mascot\s+nickname|nickname|abbreviation|shorthand|brand\s+name|codename|config\s+flag|setting\s+menu|name\s+tag|callsign|name\s+of\s+(?:the|my))\b/i,
  /\bmy\s+\w+\s+use[sd]?\s+for\b|\bmy\s+\w+\s+uses\s+for\b/i,
  /\bmeans\s+nothing\s+to\b|\bis\s+not\s+a\s+word\s+in\b|\bmispronunciation\s+of\b|\bnonsense\s+word\b/i,

  // A few more specific physical/hobby objects surfaced by the unseen campaign.
  /\bthermostat\b|\btin\s+roof\b|\broofing\s+sheets?\b|\bconfig\s+flag\b|\bsetting\s+menu\b/i,
  /\bclocks?\s+change\s+tonight\b|\byard\s+sale\b|\btrading\s+card\s+game\b/i,
  /\bfood\s+truck\b|\bparking\s+spot\b|\blemonade\s+stand\b|\bschool\s+fair\b|\bsplit\s+the\s+pizza\b/i,
  /\bdashboard\b|\btire\s+pressure\b|\bgoldfish\b|\bclassroom\s+aquarium\b|\bpodcast\b/i,
  /\bconference\s+room\s+booking\b|\badventure\s+game\b|\bmural\b|\bphoto\s+spot\b/i,
  /\bweb\s+design\s+buttons?\b/i,
  /\bfantasy\s+football\b|\besports\s+team\b|\bknitting\s+circle\b|\bfishing\s+club\b/i,

  // PHASE-10A14-R19 (executor unseen campaign, metamorphic non-tax sides).
  /\bin\s+the\s+fall\b|\blanding\s+page\b|\bscholarship\s+application\b|\bdozen\s+cupcakes\b/i,
  /\bmetal\s+alloy\b|\bplaylist\b|\btraditional\s+wedding\b|\bknob\s+setting\b[^.\n]{0,20}\bmixer\b/i,
  /\blawn\s+sign\b|\bpop-?up\s+shop\b|\bfun\s+run\b|\bstatue\b[^.\n]{0,20}\bport\s+entrance\b/i,
  /\breading\s+club\b|\bshipping\s+label\b|\bclub\s+logs\b|\bunreleased\s+mobile\s+app\b/i,
  /\bmonitor\s+brightness\b|\bon\s+the\s+board\b[^.\n]{0,10}$|\bteacher\s+post\b/i,
  /\btrivia\s+question\b|\binput\s+field\b|\bvalidates\b[^.\n]{0,30}\btext\b/i,
  /\bfiction\s+novels?\b|\bbestseller\s+list\b/i,
];

