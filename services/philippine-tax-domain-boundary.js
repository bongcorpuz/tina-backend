// FILE: services/philippine-tax-domain-boundary.js
"use strict";

/**
 * Philippine Tax Domain Boundary
 *
 * Synchronous, pre-retrieval classifier that determines whether a query
 * falls within TINA's domain (Philippine taxation).
 *
 * Returns: { isPhilippineTax, decision, detectedDomain, reason }
 *   decision: "ALLOW" | "REJECT" | "CLARIFY"
 *
 * Design principles:
 *   - Synchronous only — no OpenAI, no DB access, no async
 *   - Conservative default: ALLOW (avoids false-positive rejections)
 *   - REJECT only when query is clearly non-tax
 *   - Hook-aware: /quiz and /review are strict; /audit requires audit-tax signals
 */

import { isTaxRelated } from "../tax-keywords.js";

// ─── Rejection Message ────────────────────────────────────────────────────────

export const BOUNDARY_REJECTION_MESSAGE =
  "TINA is designed to answer questions about Philippine taxation. " +
  "Please ask a Philippine tax-related question, such as VAT, income tax, " +
  "withholding tax, BIR compliance, local tax, customs duties, or tax remedies.";

// ─── Hooks that bypass the domain boundary entirely ──────────────────────────
// These are meta/utility routes that must not be blocked.

const BYPASS_HOOKS = new Set(["/feedback", "/progress", "/debug", "/patch"]);

// ─── Strong Philippine-tax-specific allow patterns ───────────────────────────
// Any match here → immediate ALLOW (before isTaxRelated).

const PH_TAX_ALLOW_PATTERNS = [
  // Philippine jurisdiction signals
  /\bphilippine[s]?\s+tax/i,
  /\bphilippin[e]?[s]?\b/i,
  /\bfilipino\b/i,
  /\bpilipino\b/i,

  // VAT
  /\bvat\b/i,
  /\bvalue[- ]added tax\b/i,
  /\bvatable\b/i,
  /\bzero[- ]rated\b/i,
  /\bvat[- ]exempt\b/i,
  /\binput\s+tax\b/i,
  /\boutput\s+tax\b/i,

  // Income tax
  /\bincome tax\b/i,
  /\bcorporate income tax\b/i,
  /\bpersonal income tax\b/i,
  /\bminimum corporate income tax\b/i,
  /\bmcit\b/i,
  /\bnet\s+taxable\s+income\b/i,
  /\bgross\s+taxable\b/i,

  // Withholding
  /\bwithholding tax\b/i,
  /\bexpanded withholding\b/i,
  /\bfinal withholding\b/i,
  /\bcreditable withholding\b/i,
  /\bewt\b/i,
  /\bfwt\b/i,

  // BIR / regulatory bodies
  /\bBIR\b/i,
  /\bbureau of internal revenue\b/i,
  /\bBIR\s+form\b/i,
  /\bRMC\b/i,
  /\bRMO\b/i,
  /\bRAMO\b/i,
  /\bRR\s*\d/i,
  /\bRevenue\s+Regulation/i,
  /\bRevenue\s+Memorandum/i,
  /\bBIR\s+ruling\b/i,
  /\bBIR\s+issuance\b/i,

  // NIRC / key statutes
  /\bNIRC\b/i,
  /\bNational Internal Revenue Code\b/i,
  /\bTRAIN\s+[Ll]aw\b/i,
  /\bCREATE\s+[Ll]aw\b/i,
  /\bEOPT\b/i,
  /\bEase of Paying Taxes\b/i,
  /\bRA\s*8424\b/i,
  /\bRA\s*10963\b/i,
  /\bRA\s*11534\b/i,
  /\bRA\s*11976\b/i,
  /\bRA\s*10667\b/i,

  // Customs / BOC
  /\bcustoms duty\b/i,
  /\bcustoms duties\b/i,
  /\bCMTA\b/i,
  /\btariff\b/i,
  /\bimport duty\b/i,
  /\bBOC\b/i,
  /\bBureau of Customs\b/i,
  /\bpost.?clearance audit\b/i,
  /\bcustoms\s+assessment\b/i,

  // Local taxes
  /\breal property tax\b/i,
  /\bRPT\b/i,
  /\blocal business tax\b/i,
  /\bLBT\b/i,
  /\bLGC\b/i,
  /\bLocal Government Code\b/i,
  /\bsitus\s+(of\s+)?tax/i,

  // Documentary stamp / excise
  /\bDST\b/i,
  /\bDocumentary Stamp/i,
  /\bexcise tax\b/i,
  /\bsin tax\b/i,

  // Assessment / remedies
  /\btax\s+assessment\b/i,
  /\bdeficiency tax\b/i,
  /\bLOA\b/i,
  /\bLetter of Authority\b/i,
  /\bPreliminary Assessment Notice\b/i,
  /\bFinal Assessment Notice\b/i,
  /\bFormal Letter of Demand\b/i,
  /\bNotice for Informal Conference\b/i,
  /\btax protest\b/i,
  /\btax refund\b/i,
  /\bclaim for refund\b/i,
  /\bCTA\b/i,
  /\bCourt of Tax Appeals\b/i,
  /\bprescription\s+(period|of\s+assessment)\b/i,
  /\btax\s+lien\b/i,
  /\bcompromise\s+penalty\b/i,
  /\bsurcharge\b/i,
  /\bpenalt(y|ies)\s+under\s+(the\s+)?NIRC/i,

  // Incentives / special regimes
  /\bPEZA\b/i,
  /\bBOI\b/i,
  /\bFIRB\b/i,
  /\btax\s+incentive[s]?\b/i,
  /\bIncome Tax Holiday\b/i,
  /\bITH\b/i,
  /\bSCIT\b/i,
  /\bEnhanced Deductions\b/i,
  /\bregistered\s+(business\s+)?enterprise\b/i,

  // Transfer pricing / international
  /\btransfer pricing\b/i,
  /\btax treaty\b/i,
  /\bdouble\s+tax/i,
  /\bDTA\b/i,
  /\bBEPS\b/i,
  /\bpermanent establishment\b/i,
  /\btax\s+sparing\b/i,

  // Common BIR compliance references
  /\bITR\b/i,
  /\bBIR\s*2307\b/i,
  /\bBIR\s*1601\b/i,
  /\bBIR\s*1702\b/i,
  /\bAlpha\s*[Ll]ist\b/i,
  /\bSLSP\b/i,
  /\beSales\b/i,
];

// ─── Audit-mode tax signals ───────────────────────────────────────────────────
// /audit is a BIR-controversy-only mode.
// These patterns identify tax-audit context separate from isTaxRelated().

const AUDIT_TAX_SIGNALS = [
  /\bLOA\b/i,
  /\bLetter of Authority\b/i,
  /\bPAN\b/i,
  /\bFAN\b/i,
  /\bFLD\b/i,
  /\bNIC\b/i,
  /\bBIR\b/i,
  /\bdeficiency tax\b/i,
  /\btax\s+audit\b/i,
  /\bBIR\s+audit\b/i,
  /\btax\s+assessment\b/i,
  /\btax\s+protest\b/i,
  /\btax\s+exposure\b/i,
  /\baudit\s+defense\b/i,
  /\bCTA\b/i,
  /\bprotest\s+letter\b/i,
  /\brequest\s+for\s+reconsideration\b/i,
  /\brequest\s+for\s+reinvestigation\b/i,
  /\bcompromise\b/i,
  /\bdelinquency\b/i,
  /\bvat\s+audit\b/i,
  /\bincome\s+tax\s+audit\b/i,
  /\bcustoms\s+audit\b/i,
  /\bpost.?clearance\s+audit\b/i,
  /\bassessment\s+notice\b/i,
  /\bsurcharge\b/i,
  /\bpenalt(y|ies)\b/i,
  /\binterest\s+(on\s+)?deficiency\b/i,
  /\bBIR\s+examiner\b/i,
  /\bBIR\s+investigat/i,
];

// ─── Clear non-tax reject patterns ───────────────────────────────────────────
// Conservative list — only unambiguous non-Philippine-tax domains.
// Each entry has a regex pattern and a domain label for logging.

const NON_TAX_REJECT_PATTERNS = [
  // Biology / life sciences
  { pattern: /\bDNA\s+sequenc/i,                             domain: "BIOLOGY" },
  { pattern: /\bcell\s+biology\b/i,                         domain: "BIOLOGY" },
  { pattern: /\bgenetic\s+(code|mutation|engineering)\b/i,  domain: "BIOLOGY" },
  { pattern: /\bphotosynthesis\b/i,                         domain: "BIOLOGY" },
  { pattern: /\bmitosis\b|\bmeiosis\b/i,                    domain: "BIOLOGY" },

  // Medicine / clinical health
  { pattern: /\bmedical\s+diagnosis\b/i,                    domain: "MEDICINE" },
  { pattern: /\bsurgical\s+procedure\b/i,                   domain: "MEDICINE" },
  { pattern: /\bhuman\s+anatomy\b/i,                        domain: "MEDICINE" },
  { pattern: /\bcancer\s+treatment\b/i,                     domain: "MEDICINE" },
  { pattern: /\bvaccine\s+efficacy\b/i,                     domain: "MEDICINE" },
  { pattern: /\bchemotherapy\b/i,                           domain: "MEDICINE" },
  { pattern: /\bmedical\s+prescription\b/i,                 domain: "MEDICINE" },
  { pattern: /\bdrug\s+dosage\b/i,                          domain: "MEDICINE" },
  { pattern: /\bclinical\s+trial[s]?\b/i,                   domain: "MEDICINE" },

  // Cooking / food
  { pattern: /\bhow\s+to\s+(cook|bake|fry|boil|steam)\b/i, domain: "COOKING" },
  { pattern: /\brecipe\s+for\b/i,                           domain: "COOKING" },
  { pattern: /\bingredients\s+(for|of)\b/i,                 domain: "COOKING" },
  { pattern: /\bcooking\s+(tips|instructions)\b/i,          domain: "COOKING" },

  // Personal / romantic relationships
  { pattern: /\brelationship\s+advice\b/i,                  domain: "PERSONAL" },
  { pattern: /\bhow\s+to\s+(attract|impress|seduce)\b/i,   domain: "PERSONAL" },
  { pattern: /\bdating\s+(tips|advice|app)\b/i,             domain: "PERSONAL" },
  { pattern: /\bhow\s+to\s+win\s+(back|over)\b/i,          domain: "PERSONAL" },
  { pattern: /\blove\s+(advice|letter)\b/i,                 domain: "PERSONAL" },

  // Sports (score/game queries, not sports-industry tax)
  { pattern: /\bfootball\s+score\b/i,                       domain: "SPORTS" },
  { pattern: /\bbasketball\s+(game\s+score|nba\s+score)\b/i, domain: "SPORTS" },
  { pattern: /\bsoccer\s+(score|match\s+result)\b/i,        domain: "SPORTS" },
  { pattern: /\bbaseball\s+(score|standings)\b/i,           domain: "SPORTS" },
  { pattern: /\bwho\s+won\s+the\s+(game|match|championship)\b/i, domain: "SPORTS" },

  // Travel / tourism (not airline/hotel tax)
  { pattern: /\btravel\s+(guide|itinerary|tips)\b/i,        domain: "TRAVEL" },
  { pattern: /\btourist\s+spots?\b/i,                       domain: "TRAVEL" },
  { pattern: /\bhotel\s+recommendation[s]?\b/i,             domain: "TRAVEL" },
  { pattern: /\bbest\s+place[s]?\s+to\s+visit\b/i,         domain: "TRAVEL" },
  { pattern: /\btravel\s+package[s]?\b/i,                   domain: "TRAVEL" },

  // Entertainment / media
  { pattern: /\bmovie\s+review\b/i,                         domain: "ENTERTAINMENT" },
  { pattern: /\bTV\s+show\s+recommendation\b/i,             domain: "ENTERTAINMENT" },
  { pattern: /\bcelebrit(y|ies)\s+gossip\b/i,               domain: "ENTERTAINMENT" },
  { pattern: /\bfilm\s+critique\b/i,                        domain: "ENTERTAINMENT" },
  { pattern: /\bsong\s+(lyrics|recommendation)\b/i,         domain: "ENTERTAINMENT" },

  // Pure software / programming (not "tax code" or "revenue code")
  { pattern: /\bwrite\s+(a\s+)?(python|javascript|java|c\+\+|ruby|golang|typescript)\s+(code|program|script|function)\b/i, domain: "PROGRAMMING" },
  { pattern: /\bhow\s+to\s+code\s+(a\s+)?(function|class|loop)\b/i,  domain: "PROGRAMMING" },
  { pattern: /\bdebug\s+(my\s+)?(code|program)\b/i,         domain: "PROGRAMMING" },
  { pattern: /\bsoftware\s+architecture\b/i,                domain: "PROGRAMMING" },
  { pattern: /\bcompile\s+(my\s+)?(code|program)\b/i,       domain: "PROGRAMMING" },

  // Civil / family law (unambiguously non-tax)
  { pattern: /\bnullity\s+of\s+marriage\b/i,                domain: "CIVIL_LAW" },
  { pattern: /\bannulment\s+(of\s+marriage|proceedings)\b/i, domain: "CIVIL_LAW" },
  { pattern: /\blegal\s+separation\s+grounds\b/i,           domain: "CIVIL_LAW" },
  { pattern: /\badoption\s+proceedings\b/i,                 domain: "CIVIL_LAW" },
  { pattern: /\bcustody\s+(of\s+)?(a\s+)?child\b/i,        domain: "CIVIL_LAW" },

  // Criminal law (unambiguously non-tax — tax crimes handled separately)
  { pattern: /\bmurder\s+(charge|case|trial)\b/i,           domain: "CRIMINAL_LAW" },
  { pattern: /\bkidnapping\s+(case|charge)\b/i,             domain: "CRIMINAL_LAW" },
  { pattern: /\bdrug\s+trafficking\b/i,                     domain: "CRIMINAL_LAW" },

  // Pure physical science
  { pattern: /\bquantum\s+mechanics\b/i,                    domain: "PHYSICS" },
  { pattern: /\bblack\s+hole[s]?\b/i,                       domain: "PHYSICS" },
  { pattern: /\bastrophysics\b/i,                           domain: "PHYSICS" },
  { pattern: /\bstring\s+theory\b/i,                        domain: "PHYSICS" },
  { pattern: /\bnuclear\s+physics\b/i,                      domain: "PHYSICS" },

  // Pet / animal care
  { pattern: /\bhow\s+to\s+(train|groom|feed)\s+(my\s+)?(dog|cat|pet|hamster)\b/i, domain: "PETS" },
  { pattern: /\bdog\s+(breed|grooming|training\s+tips)\b/i, domain: "PETS" },
  { pattern: /\bcat\s+(care|breed|food\s+recommendation)\b/i, domain: "PETS" },
];

// ─── Main classifier ──────────────────────────────────────────────────────────

/**
 * checkPhilippineTaxBoundary
 *
 * Synchronous, no-I/O domain classifier.
 *
 * @param {string} query  — the user query text (cleanQuestion preferred)
 * @param {string} hook   — the resolved hook code (e.g. "/ask", "/audit")
 * @returns {{ isPhilippineTax: boolean, decision: "ALLOW"|"REJECT"|"CLARIFY", detectedDomain: string, reason: string }}
 */
export function checkPhilippineTaxBoundary(query = "", hook = "/ask") {
  const q = String(query || "").trim();
  const h = String(hook || "/ask").toLowerCase();

  // ── 1. Bypass hooks — meta/utility routes must never be blocked ───────────
  if (BYPASS_HOOKS.has(h)) {
    return {
      isPhilippineTax: true,
      decision:        "ALLOW",
      detectedDomain:  "UTILITY",
      reason:          "bypass_hook",
    };
  }

  // ── 2. Empty query — let downstream handle validation ────────────────────
  if (!q) {
    return {
      isPhilippineTax: false,
      decision:        "ALLOW",
      detectedDomain:  "UNKNOWN",
      reason:          "empty_query",
    };
  }

  // ── 3. Strong Philippine-tax allow patterns ───────────────────────────────
  for (const pattern of PH_TAX_ALLOW_PATTERNS) {
    if (pattern.test(q)) {
      return {
        isPhilippineTax: true,
        decision:        "ALLOW",
        detectedDomain:  "PHILIPPINE_TAX",
        reason:          "ph_tax_pattern_match",
      };
    }
  }

  // ── 4. isTaxRelated keyword check (broader, covers edge cases) ────────────
  if (isTaxRelated(q)) {
    return {
      isPhilippineTax: true,
      decision:        "ALLOW",
      detectedDomain:  "TAX_KEYWORD",
      reason:          "tax_keyword_match",
    };
  }

  // ── 5. Hook-specific strict checks ───────────────────────────────────────
  // /quiz and /review are tax-practice-only modes — no non-tax questions.
  if (h === "/quiz" || h === "/review") {
    return {
      isPhilippineTax: false,
      decision:        "REJECT",
      detectedDomain:  "NON_TAX",
      reason:          "quiz_review_requires_tax_topic",
    };
  }

  // /audit is BIR-tax-controversy only — require at least one audit-tax signal.
  if (h === "/audit") {
    const hasAuditTaxSignal = AUDIT_TAX_SIGNALS.some(p => p.test(q));
    if (!hasAuditTaxSignal) {
      return {
        isPhilippineTax: false,
        decision:        "REJECT",
        detectedDomain:  "NON_TAX",
        reason:          "audit_mode_no_tax_signal",
      };
    }
  }

  // ── 6. Clear non-tax reject patterns ─────────────────────────────────────
  for (const { pattern, domain } of NON_TAX_REJECT_PATTERNS) {
    if (pattern.test(q)) {
      return {
        isPhilippineTax: false,
        decision:        "REJECT",
        detectedDomain:  domain,
        reason:          "non_tax_domain_pattern",
      };
    }
  }

  // ── 7. Conservative default: ALLOW ────────────────────────────────────────
  // Err on the side of allowing to avoid false-positive rejections.
  // TINA's downstream issue-classification engine handles further scoping.
  return {
    isPhilippineTax: true,
    decision:        "ALLOW",
    detectedDomain:  "UNCLASSIFIED",
    reason:          "default_allow",
  };
}
