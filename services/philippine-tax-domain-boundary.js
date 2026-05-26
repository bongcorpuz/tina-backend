// FILE: services/philippine-tax-domain-boundary.js
"use strict";

/**
 * Philippine Tax Domain Boundary
 * Version: 2.0.0 — FAIL-CLOSED
 *
 * Synchronous, pre-retrieval classifier. Determines whether a query is within
 * TINA's domain (Philippine taxation) BEFORE any retrieval, pipeline, or
 * OpenAI call.
 *
 * Exported API:
 *   detectPhilippineTaxBoundary(query, routeMode, context?)
 *   → { isPhilippineTax, decision, detectedDomain, reason, confidence }
 *   decision: "ALLOW" | "REJECT" | "CLARIFY"
 *
 * DESIGN: FAIL-CLOSED
 *   Default is REJECT.
 *   ALLOW is granted only when a Philippine-tax indicator is present.
 *   Ambiguous queries return CLARIFY (treated as REJECT at enforcement points).
 *
 *   Previous version (v1) used conservative-default ALLOW — that allowed
 *   "what is biology?" to reach retrieval and OpenAI. This version fixes that.
 */

import { isTaxRelated } from "../tax-keywords.js";

// ─── Rejection / Clarification Messages ──────────────────────────────────────

export const BOUNDARY_REJECTION_MESSAGE =
  "TINA is designed to answer questions about Philippine taxation. " +
  "Please ask a Philippine tax-related question, such as VAT, income tax, " +
  "withholding tax, BIR compliance, local tax, customs duties, or tax remedies.";

export const BOUNDARY_CLARIFY_MESSAGE =
  "TINA is designed to answer questions about Philippine taxation. " +
  "Could you clarify how your question relates to Philippine tax? " +
  "For example: VAT, income tax, withholding tax, BIR compliance, " +
  "local tax, customs duties, or tax remedies.";

// ─── Hooks that bypass the boundary entirely ─────────────────────────────────
// Meta/utility routes that must never be blocked.

const BYPASS_HOOKS = new Set(["/feedback", "/progress", "/debug", "/patch"]);

// ─── Philippine-tax ALLOW patterns ───────────────────────────────────────────
// Ordered from broadest → most specific.
// A single match is sufficient to ALLOW.
// DO NOT include bare "Philippines" — "who is the president of the Philippines?"
// must not match.

const PH_TAX_ALLOW_PATTERNS = [
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
];

// ─── Non-tax REJECT patterns ──────────────────────────────────────────────────
// Used to detect clearly non-Philippine-tax queries for explicit reject logging.
// With fail-closed default, these are supplementary — they improve the log
// reason and provide faster rejection before the default.

const NON_TAX_REJECT_PATTERNS = [
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
];

// ─── Audit-mode tax signals ───────────────────────────────────────────────────
// For /audit mode: require at least one of these to be present.
// /audit is a BIR-tax-controversy-only mode.

const AUDIT_TAX_SIGNALS = [
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

const CLARIFY_PATTERNS = [
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

// ─── Main classifier ──────────────────────────────────────────────────────────

/**
 * detectPhilippineTaxBoundary
 *
 * Synchronous, no-I/O domain classifier. FAIL-CLOSED by design:
 * queries without a Philippine-tax indicator are REJECTED by default.
 *
 * @param {string} query       — user query text (cleanQuestion preferred)
 * @param {string} routeMode   — resolved hook/route (e.g. "/ask", "/audit")
 * @param {object} [context]   — optional extra context (reserved for future use)
 * @returns {{
 *   isPhilippineTax: boolean,
 *   decision: "ALLOW"|"REJECT"|"CLARIFY",
 *   detectedDomain: string,
 *   reason: string,
 *   confidence: number
 * }}
 */
export function detectPhilippineTaxBoundary(query = "", routeMode = "/ask", context = {}) {
  const q = String(query || "").trim();
  const h = String(routeMode || "/ask").toLowerCase();

  // ── 1. Bypass hooks — meta/utility routes never blocked ──────────────────
  if (BYPASS_HOOKS.has(h)) {
    return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "UTILITY", reason: "bypass_hook", confidence: 1.0 };
  }

  // ── 2. Empty query — let downstream handle validation ────────────────────
  if (!q) {
    return { isPhilippineTax: false, decision: "ALLOW", detectedDomain: "UNKNOWN", reason: "empty_query", confidence: 0.0 };
  }

  // ── 3. Philippine-tax allowlist (ALLOW path) ─────────────────────────────
  // Check allow patterns first — any match → ALLOW immediately.
  for (const pattern of PH_TAX_ALLOW_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "PHILIPPINE_TAX", reason: "ph_tax_pattern_match", confidence: 0.98 };
    }
  }

  // ── 4. isTaxRelated keyword check (broader catch-all) ────────────────────
  if (isTaxRelated(q)) {
    return { isPhilippineTax: true, decision: "ALLOW", detectedDomain: "TAX_KEYWORD", reason: "tax_keyword_match", confidence: 0.85 };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Below this line: no Philippine-tax signal was detected.
  // All paths lead to REJECT or CLARIFY — NEVER ALLOW.
  // ───────────────────────────────────────────────────────────────────────────

  // ── 5. Hook-specific strict rejection ────────────────────────────────────

  // /quiz and /review are Philippine-tax-practice-only modes.
  if (h === "/quiz" || h === "/review") {
    return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "quiz_review_requires_tax_topic", confidence: 0.95 };
  }

  // /audit is BIR-tax-controversy only.
  if (h === "/audit") {
    const hasAuditTaxSignal = AUDIT_TAX_SIGNALS.some(p => p.test(q));
    if (!hasAuditTaxSignal) {
      return { isPhilippineTax: false, decision: "REJECT", detectedDomain: "NON_TAX", reason: "audit_mode_no_tax_signal", confidence: 0.92 };
    }
  }

  // ── 6. Clearly non-tax domain patterns ───────────────────────────────────
  // Explicit domain detection — REJECT with reason "clearly_non_tax_domain".
  for (const { pattern, domain } of NON_TAX_REJECT_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: false, decision: "REJECT", detectedDomain: domain, reason: "clearly_non_tax_domain", confidence: 0.95 };
    }
  }

  // ── 7. Ambiguous but possibly tax-adjacent queries ────────────────────────
  // These lack a confirmed PH-tax signal but are common enough in tax practice
  // that CLARIFY (invite rephrasing) is preferable to a hard REJECT.
  // Examples: gross receipts, professional fees, penalties, leases, registration.
  for (const { pattern, domain } of CLARIFY_PATTERNS) {
    if (pattern.test(q)) {
      return { isPhilippineTax: false, decision: "CLARIFY", detectedDomain: domain, reason: "tax_adjacent_needs_context", confidence: 0.55 };
    }
  }

  // ── 8. FAIL-CLOSED DEFAULT ────────────────────────────────────────────────
  // No Philippine-tax signal, no known non-tax domain, no tax-adjacent hint.
  // REJECT — not CLARIFY. Gibberish and truly unrelated queries must not be
  // invited to rephrase; they are simply outside TINA's domain.
  return {
    isPhilippineTax: false,
    decision:        "REJECT",
    detectedDomain:  "UNCLASSIFIED",
    reason:          "fail_closed_no_tax_signal",
    confidence:      0.60,
  };
}

// ─── Backward-compat alias (v1 callers) ──────────────────────────────────────
// Remove once all callers use detectPhilippineTaxBoundary.
export const checkPhilippineTaxBoundary = detectPhilippineTaxBoundary;
