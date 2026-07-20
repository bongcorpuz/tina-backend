// FILE: services/answer-support-validator.js
// PHASE-10A8-TRUST-CALIBRATION-AND-ANSWER-CORRECTNESS-REMEDIATION-1
//
// Controlled post-generation answer-support validator. PHASE-10A7 confirmed a
// systemic defect: VERIFIED_CONTROLLING was awarded from retrieval/source
// presence even when the final answer was empty, wrong, incomplete, or
// unsupported (Q2, Q8, Q9, Q27, Q29, Q31, Q37, Q41, Q49). This module produces
// a structured answer-support attestation that the trust contract requires
// before VERIFIED_CONTROLLING. It NEVER upgrades trust; it can only confirm or
// (fail-closed) withhold eligibility.
//
// Two stages:
//   1. deterministic structural gate  -- cheap, no I/O. Rejects empty / headers-
//      only / refusal / bare-source-listing / non-substantive answers.
//   2. controlled LLM evaluator       -- a CONSTRAINED classifier (fixed rubric,
//      structured JSON, temperature 0) that judges the given answer. It does NOT
//      generate an alternative answer (per governance: no unrestricted second
//      free-form answer as the sole validator).
//
// Any uncertainty, unavailability, or error fails CLOSED (verifiedEligible=false).

"use strict";

import OpenAI from "openai";

const MIN_SUBSTANTIVE_CHARS = 120;
const VALIDATOR_TIMEOUT_MS = 20000;

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const REFUSAL_RE =
  /designed to answer questions about Philippine taxation|could not identify an indexed authority|please ask a Philippine tax[- ]related question/i;
const BARE_SOURCE_LISTING_RE = /(^|\n)\s*indexed sources found\s*:/i;

/**
 * Reduces an answer to its substantive prose by removing markdown headings,
 * bold-only label lines, and horizontal rules, so "headers-only" answers
 * (e.g. "### Short Answer ### Interpretation ### Practical Meaning") reduce to
 * empty. Pure.
 * @param {string} answer
 * @returns {string}
 */
export function extractSubstance(answer) {
  if (typeof answer !== "string") return "";
  return answer
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^#{1,6}\s/.test(l))          // markdown headings
    .filter((l) => !/^\*\*[^*]+\*\*:?\s*$/.test(l)) // bold-only label lines
    .filter((l) => !/^[-*_]{3,}$/.test(l))          // horizontal rules
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic structural gate. Returns { pass, reason }. pass=false means the
 * answer is structurally ineligible for VERIFIED_CONTROLLING regardless of any
 * retrieval/source signal. Pure -- no I/O.
 * @param {unknown} answer
 * @returns {{pass: boolean, reason: string}}
 */
export function structuralSupportGate(answer) {
  if (typeof answer !== "string" || answer.trim().length === 0) {
    return { pass: false, reason: "empty_answer" };
  }
  if (BARE_SOURCE_LISTING_RE.test(answer)) {
    return { pass: false, reason: "bare_source_listing" };
  }
  if (REFUSAL_RE.test(answer)) {
    return { pass: false, reason: "refusal_or_no_authority_fallback" };
  }
  const substance = extractSubstance(answer);
  if (substance.length < MIN_SUBSTANTIVE_CHARS) {
    return { pass: false, reason: "non_substantive_or_headers_only" };
  }
  if (!/[.!?]/.test(substance)) {
    return { pass: false, reason: "no_complete_sentence" };
  }
  if (hasEmptyPrimarySection(answer)) {
    return { pass: false, reason: "empty_primary_answer_section" };
  }
  return { pass: true, reason: "structural_ok" };
}

// Detects a primary answer section (Short Answer / Direct Answer / Issue
// Presented / Conclusion) whose heading is immediately followed by another
// heading (or nothing), i.e. the conclusion body is empty. Catches answers that
// render section scaffolding with no actual conclusion (e.g. PHASE-10A7 Q37/Q31).
const PRIMARY_SECTION_RE = /short answer|direct answer|issue presented|conclusion|quick assessment/i;
export function hasEmptyPrimarySection(answer) {
  if (typeof answer !== "string") return false;
  const lines = answer.split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^#{1,6}\s+(.*)$/) || lines[i].match(/^\*\*(.+?)\*\*:?\s*$/);
    if (!h || !PRIMARY_SECTION_RE.test(h[1])) continue;
    // find the next non-empty line
    let j = i + 1;
    while (j < lines.length && lines[j].length === 0) j++;
    if (j >= lines.length) return true; // heading is last
    const isHeading = /^#{1,6}\s/.test(lines[j]) || /^\*\*.+\*\*:?\s*$/.test(lines[j]);
    if (isHeading) return true; // primary section body empty (heading -> heading)
  }
  return false;
}

const VALIDATOR_SYSTEM_PROMPT = `You are a SKEPTICAL senior Philippine tax reviewer acting as a red-team validator. Your job is to FIND ERRORS in a candidate ANSWER before it is allowed to display a "Verified Controlling Authority" badge. Assume the answer may be wrong until proven correct. You do NOT rewrite or re-answer.

First, silently identify the single most important operative claim (the specific tax rate, threshold, exemption, deadline, treatment, or rule). Then check it against CURRENT Philippine tax law (TRAIN / CREATE / CREATE MORE / EOPT / CMEPA era).

Flag ONLY these high-confidence error classes (do not flag anything else):
- REVERSED treatment (e.g. calling a VAT-exempt item VATable, or a VATable item exempt).
- INVENTED exemption / de-minimis / threshold rule that does not exist in Philippine tax law.
- REVERSED or wrong filing/compliance rule (e.g. "spouses must file separate returns" when they file a single joint return).
- OBSOLETE/removed threshold presented as if current (e.g. a repealed residential-lot VAT threshold).
- A cited authority that plainly does NOT support the stated proposition.
- Non-responsive / empty / refusing a valid tax question.

Do NOT flag based on uncertainty about whether a standard numeric rate is current. Treat well-known baseline Philippine values as correct (e.g. 12% VAT, ₱3M VAT threshold, 20% final tax on interest and royalties, 6% estate and donor's tax, ₱250,000 donor's annual exemption, April 15 individual ITR deadline). If the operative claim matches a standard baseline value, do NOT flag it. Only flag a numeric value when it is plainly reversed, fabricated, or a repealed threshold.

PHASE-10A10 -- you must ALSO judge EXACT RESPONSIVENESS and COMPLETE ISSUE COVERAGE, not just plausibility. Before deciding, silently:
1. Identify what a COMPLETE answer to THIS exact question must contain: the primary issue, every material EXCEPTION/qualification, and every material ALTERNATIVE (e.g. an alternative form, treatment, or regime). Examples of material coverage you must require when the question implies them:
   - an import-VAT question must address any applicable statutory exemption/special regime (e.g. an export-enterprise exemption), not just the general rate;
   - a "which form" question must address every mandatory alternative form/classification, not present one form as exclusive;
   - a "what is the penalty" question must state the actual penalty (fine and/or imprisonment) and the correct penal section, not merely describe the prohibited act.
2. Check whether the DISPLAYED SOURCE authorities are specifically RELEVANT to the exact proposition. Generic/foundational provisions (e.g. NIRC Sections 1-6 on title, definitions, jurisdiction, or the Commissioner's powers) do NOT support a specific rate, form, or penalty. A cited section that exists but is materially irrelevant does NOT count as support.

PHASE-10A12 -- you must ALSO verify TREATMENT DIRECTION (polarity), THRESHOLD DIMENSION, and GENERAL-vs-SPECIFIC rule, and that the answer does NOT contradict the controlling source. Compare the answer's operative tax TREATMENT against the controlling source's treatment:
- TREATMENT POLARITY: taxable vs exempt; zero-rated vs exempt; input-VAT vs output-VAT; refund vs credit; seller vs buyer obligation; withholding-agent vs payee; required vs not-required; allowed vs prohibited. If the answer reverses the source's polarity, set treatmentDirectionMatches=false and answerContradictsControllingSource=true.
- THRESHOLD DIMENSION: a per-unit / per-transaction exemption threshold is NOT the same as a taxpayer-level aggregate VAT-REGISTRATION threshold. Do not accept an answer that substitutes the ₱3,000,000 aggregate registration threshold for a specific per-unit/transaction exemption. Example of a REVERSAL you MUST reject: concluding that a residential unit rent at or below the ₱15,000 per-unit monthly exemption is "subject to VAT" because the lessor's total annual rental income exceeds ₱3,000,000. A residential unit at/below the per-unit monthly threshold is VAT-EXEMPT regardless of the lessor's aggregate. If dimensions do not match, set thresholdDimensionMatches=false.
- GENERAL vs SPECIFIC: a general rule must not override a more specific exemption/special treatment. If the answer improperly applied the general rule where a specific exemption controls, set sourcePropositionAligned=false.

Return ONLY JSON:
{
  "operativeClaim": "the single key claim",
  "questionIntent": "what the question actually asks for",
  "requiredIssueKeys": ["..."],
  "missingIssueKeys": ["..."],
  "identifiedError": "a SPECIFIC confident error, or empty string",
  "answerResponsive": true|false,
  "primaryIssueAnswered": true|false,
  "requiredIssueKeysCovered": true|false,
  "materialExceptionsCovered": true|false,
  "materialAlternativesCovered": true|false,
  "citationRelevant": true|false,
  "citationSupportsProposition": true|false,
  "substantive": true|false,
  "propositionSupported": true|false,
  "materiallyComplete": true|false,
  "treatmentDirectionMatches": true|false,
  "thresholdDimensionMatches": true|false,
  "sourcePropositionAligned": true|false,
  "contradictsSources": true|false,
  "unsupportedMaterialProposition": true|false,
  "answerContradictsControllingSource": true|false,
  "eligibleForVerifiedControlling": true|false,
  "reason": "one short sentence"
}

Rules:
- Set eligibleForVerifiedControlling=true ONLY when the answer is responsive, the primary issue is answered, all required issue keys / material exceptions / material alternatives are covered, and there is no confident error.
- IMPORTANT precision rule: only require exception/alternative coverage when the QUESTION actually implies one. A simple factual question with a single correct answer and no material exception (e.g. a standard filing deadline, a standard rate, a one-year period) is materiallyComplete when it states that value correctly -- set materialExceptionsCovered=true and materialAlternativesCovered=true in that case; do NOT invent required exceptions.
- Do NOT flag a correct baseline value merely because you are unsure it is current (12% VAT, ₱3M VAT threshold, 20% final tax on interest/royalties, 6% estate/donor's tax, ₱250,000 donor's exemption, April 15 ITR deadline, one-year estate-return deadline are correct baselines). For citationRelevant: a correct statement of such a well-known baseline rule is acceptable unless the displayed sources are only generic foundational provisions (NIRC Secs 1-6).
- Set eligibleForVerifiedControlling=false when the answer OMITS a material exception the question implies (e.g. an import-VAT question ignoring an export-enterprise exemption), presents one form/treatment as the "only" one when a mandatory alternative exists, is non-responsive (e.g. a penalty question that never states the penalty), or relies only on generic foundational provisions for a specific proposition.
- PHASE-10A12 fields: when the answer's treatment matches the correct/controlling treatment and there is no polarity/threshold/general-vs-specific problem, set treatmentDirectionMatches=true, thresholdDimensionMatches=true, sourcePropositionAligned=true, and answerContradictsControllingSource=false. When you detect a reversed treatment, a substituted threshold dimension, an improperly applied general rule, or a source contradiction, set the corresponding field to its UNSAFE value AND eligibleForVerifiedControlling=false.
Output JSON only.`;

// Deterministic: displayed sources are ONLY foundational/jurisdictional NIRC
// provisions (Title I, definitions, Commissioner powers, jurisdiction), which
// cannot support a specific rate/form/penalty proposition. Catches the Q35
// (NIRC Sec 2) and Q41 (NIRC Sec 2 & 3) citation-relevance clusters.
const FOUNDATIONAL_SECTION_RE = /\bsec(?:tion|\.)?\s*0*([1-6])\b(?!\d)/i;
const SPECIFIC_AUTHORITY_RE = /\bsec(?:tion|\.)?\s*0*([7-9]|[1-9]\d{1,3})\b|\bRR\b|\bRMC\b|\bRMO\b|\bG\.?R\.?\b|\bCTA\b|regulation|circular|ruling|revenue/i;
export function citesOnlyFoundationalProvisions(sources = []) {
  const labels = (Array.isArray(sources) ? sources : [])
    .map((s) => (s && (s.label || s.citation || s.title || s.displayLabel)) || "")
    .filter(Boolean);
  if (labels.length === 0) return false; // no displayed sources handled elsewhere
  let anyFoundational = false;
  for (const l of labels) {
    if (SPECIFIC_AUTHORITY_RE.test(l)) return false; // at least one specific authority present
    if (FOUNDATIONAL_SECTION_RE.test(l)) anyFoundational = true;
  }
  return anyFoundational; // all labels foundational and none specific
}

function sourceCitations(sources) {
  if (!Array.isArray(sources)) return "(none)";
  const items = sources
    .map((s) => (s && (s.label || s.citation || s.title || s.displayLabel)) || "")
    .filter(Boolean)
    .slice(0, 12);
  return items.length ? items.join("; ") : "(none)";
}

// PHASE-10A10-R1: single canonical source of the mandatory verified-eligibility
// schema. Positive fields must be OWN boolean `true`; negative-risk fields must
// be OWN boolean `false`. Used by the parser and the tests -- no duplicated
// field lists.
export const REQUIRED_POSITIVE_BOOLEANS = Object.freeze([
  "answerResponsive",
  "primaryIssueAnswered",
  "requiredIssueKeysCovered",
  "materialExceptionsCovered",
  "materialAlternativesCovered",
  "citationRelevant",
  "citationSupportsProposition",
  "substantive",
  "propositionSupported",
  "materiallyComplete",
  // PHASE-10A12 source-contradiction / treatment-direction alignment (mandatory).
  "treatmentDirectionMatches",
  "thresholdDimensionMatches",
  "sourcePropositionAligned",
  "eligibleForVerifiedControlling"
]);
export const REQUIRED_NEGATIVE_BOOLEANS = Object.freeze([
  "contradictsSources",
  "unsupportedMaterialProposition",
  // PHASE-10A12: the answer must NOT contradict the controlling source.
  "answerContradictsControllingSource"
]);

function readOwnBoolean(obj, field) {
  // PHASE-10A12-R2: reject ACCESSOR descriptors BEFORE any value access -- a
  // getter must never execute during safety validation. Inspects the own
  // property descriptor (guarding a proxy that throws in
  // getOwnPropertyDescriptor); only a plain own data property is read.
  let desc;
  try { desc = Object.getOwnPropertyDescriptor(obj, field); }
  catch { return { own: true, threw: true, accessor: true }; }
  if (!desc) return { own: false };
  if (typeof desc.get === "function" || typeof desc.set === "function") {
    return { own: true, accessor: true };
  }
  return { own: true, value: desc.value, isBoolean: typeof desc.value === "boolean" };
}

/**
 * Strictly validates a raw validator verdict against the canonical mandatory
 * schema. Pure. Every mandatory field must be an own, boolean-typed property
 * with the safe value. Anything else fails closed.
 * @param {unknown} v
 * @returns {{schemaValid:boolean, verifiedEligible:boolean, missingFields:string[], invalidTypeFields:string[], invalidValueFields:string[], inheritedFieldsRejected:string[], failureReasons:string[], gates:object}}
 */
export function validateVerdictSchema(v) {
  const missingFields = [];
  const invalidTypeFields = [];
  const invalidValueFields = [];
  const inheritedFieldsRejected = [];
  const gates = { structural: true };

  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return {
      schemaValid: false, verifiedEligible: false,
      missingFields: [...REQUIRED_POSITIVE_BOOLEANS, ...REQUIRED_NEGATIVE_BOOLEANS],
      invalidTypeFields: [], invalidValueFields: [], inheritedFieldsRejected: [],
      failureReasons: ["verdict_not_object"], gates
    };
  }

  const checkField = (field, wantValue) => {
    const r = readOwnBoolean(v, field);
    if (!r.own) { missingFields.push(field); gates[field] = false; return; }
    if (r.threw || !r.isBoolean) { invalidTypeFields.push(field); gates[field] = false; return; }
    if (r.value !== wantValue) { invalidValueFields.push(field); gates[field] = false; return; }
    gates[field] = true;
  };

  for (const f of REQUIRED_POSITIVE_BOOLEANS) checkField(f, true);
  for (const f of REQUIRED_NEGATIVE_BOOLEANS) checkField(f, false);

  // Note: inherited (prototype-chain) mandatory fields are treated as missing
  // by hasOwnProperty, so they are already rejected via missingFields; record
  // them explicitly for diagnostics when they exist only on the prototype.
  // PHASE-10A12-R2: guarded so a hostile proxy that throws in its descriptor/has
  // traps cannot propagate an exception past the validator (fails closed).
  for (const f of [...REQUIRED_POSITIVE_BOOLEANS, ...REQUIRED_NEGATIVE_BOOLEANS]) {
    try {
      if (!Object.prototype.hasOwnProperty.call(v, f) && f in v) inheritedFieldsRejected.push(f);
    } catch { /* hostile proxy trap -> ignore; already fails closed via missingFields/invalidTypeFields */ }
  }

  const schemaValid = missingFields.length === 0 && invalidTypeFields.length === 0;
  const verifiedEligible = schemaValid && invalidValueFields.length === 0;
  const failureReasons = [];
  if (missingFields.length) failureReasons.push("missing_fields:" + missingFields.join(","));
  if (invalidTypeFields.length) failureReasons.push("invalid_type_fields:" + invalidTypeFields.join(","));
  if (invalidValueFields.length) failureReasons.push("unsafe_value_fields:" + invalidValueFields.join(","));
  if (inheritedFieldsRejected.length) failureReasons.push("inherited_fields_rejected:" + inheritedFieldsRejected.join(","));

  return { schemaValid, verifiedEligible, missingFields, invalidTypeFields, invalidValueFields, inheritedFieldsRejected, failureReasons, gates };
}

// PHASE-10A12: deterministic treatment-contradiction guard. Catches known
// dangerous legal-treatment reversals / threshold substitutions that a fluent
// but wrong answer can slip past a weak LLM validator (the confirmed Q8-r2
// defect: a residential unit rent at/below the ₱15,000 per-unit monthly
// exemption declared "subject to VAT" by substituting the general ₱3M
// aggregate VAT-registration threshold for the specific per-unit exemption).
// Generalizable within the residential-lease VAT class; a firing here forces a
// safe downgrade even if the LLM validator approves. Pure -- no I/O.
const RESIDENTIAL_LEASE_RE = /\bresidential\b[^.\n]{0,40}\b(unit|lease|leasing|rent(al)?|dwelling)\b|\b(lease|leasing|rent(al)?)\b[^.\n]{0,40}\bresidential\b/i;
const TAXABLE_CONCLUSION_RE = /\b(subject to (the )?vat|vatable|is subject to (the )?value[- ]added tax|12%\s*vat (applies|shall|is)|liable (to|for) vat)\b/i;
const EXEMPT_CONCLUSION_RE = /\b(vat[- ]exempt|exempt from (the )?vat|not subject to (the )?vat|no vat)\b/i;
const AGGREGATE_3M_TRIGGER_RE = /(exceed|exceeds|above|over|more than|greater than)[^.\n]{0,40}(₱|php|p)?\s*3[,.]?0{3}[,.]?0{3}|(₱|php|p)?\s*3\s*million|total (annual )?(gross )?(rental )?(sales|receipts|income)[^.\n]{0,60}(₱|php|p)?\s*3/i;
const PERUNIT_15K_RE = /(₱|php|p)?\s*1[45][,.]?0{3}\b|15[,. ]?000|\bper[- ]unit\b|\b15\s*thousand\b/i;

/**
 * Detects a material Philippine-tax treatment contradiction in the answer that
 * must prevent VERIFIED_CONTROLLING. Pure. Currently covers the residential-lease
 * VAT per-unit-exemption vs aggregate-registration-threshold reversal.
 * @param {string} question
 * @param {string} answer
 * @returns {{contradiction:boolean, reason:string}}
 */
export function detectTreatmentContradiction(question, answer) {
  const q = typeof question === "string" ? question : "";
  const a = typeof answer === "string" ? answer : "";
  const ctx = q + "\n" + a;
  const residential = RESIDENTIAL_LEASE_RE.test(ctx);
  if (!residential) return { contradiction: false, reason: "" };
  const perUnit = PERUNIT_15K_RE.test(ctx);
  if (!perUnit) return { contradiction: false, reason: "" };
  // A per-unit residential lease at/below ₱15,000/month is categorically VAT-exempt.
  // If the answer's operative conclusion is TAXABLE, it is a reversal -- especially
  // when justified by the aggregate ₱3M registration threshold (threshold substitution).
  const concludesTaxable = TAXABLE_CONCLUSION_RE.test(a);
  const usesAggregateTrigger = AGGREGATE_3M_TRIGGER_RE.test(a);
  const concludesExempt = EXEMPT_CONCLUSION_RE.test(a);
  if (concludesTaxable && usesAggregateTrigger) {
    return { contradiction: true, reason: "residential_per_unit_exemption_reversed_via_aggregate_3M_threshold" };
  }
  // Affirmative taxable conclusion for a ≤₱15k residential unit without a clear
  // exemption statement is also a reversal.
  if (concludesTaxable && !concludesExempt && /(^|\n)\s*#*\s*(short answer|issue presented)[^\n]*\n[^\n]*\byes\b/i.test(a)) {
    return { contradiction: true, reason: "residential_per_unit_exemption_reversed_to_taxable" };
  }
  return { contradiction: false, reason: "" };
}

// PHASE-10A12: import-VAT / CREATE MORE material-exception guard. A question
// specifically about importing goods to MANUFACTURE EXPORT PRODUCTS implies the
// CREATE MORE export-oriented-enterprise VAT exemption. An answer that asserts a
// UNIVERSAL 12% import VAT (all/every/uniform/regardless) while OMITTING that
// exemption materially misstates the treatment for the exact question asked
// (the confirmed Q5 defect class). Generalizable to "a specific-exemption
// question answered with only the general taxable rule". Pure.
const IMPORT_EXPORT_MFG_RE = /import\w*[^.\n]{0,60}(export product|manufactur\w+ export|export[- ]oriented|export enterprise|goods used to (manufacture|make) export)|(export product|manufactur\w+ export|export enterprise)[^.\n]{0,60}import/i;
// Explicit DENIAL that the CREATE MORE export-enterprise VAT exemption exists.
const CREATE_MORE_DENIAL_RE = /(does not|doesn't|do not|no|not)\s+(create|provide|grant|have|establish|allow)\s+(an?\s+)?(exception|exemption)|\bnot (vat[- ])?exempt\b|applies?\s+(uniformly|to all|equally)|regardless of[^.\n]{0,40}(export|status|enterprise|activit)/i;
const UNIVERSAL_12_RE = /\b(uniform(ly)?|all (goods|imports|importers)|every importation|regardless|automatically|in all cases)\b/i;
const CREATE_MORE_EXEMPTION_RE = /\b(create more|export[- ]oriented enterprise|vat[- ]exempt|exemption|70%|directly attributable|zero[- ]rated|special regime|ipa)\b/i;

/**
 * Detects a material-exception omission that reverses/misstates the treatment
 * for an export-manufacturing import-VAT question. Pure.
 * @param {string} question
 * @param {string} answer
 * @returns {{contradiction:boolean, reason:string}}
 */
export function detectImportVatExemptionOmission(question, answer) {
  const q = typeof question === "string" ? question : "";
  const a = typeof answer === "string" ? answer : "";
  const ctx = q + "\n" + a;
  if (!IMPORT_EXPORT_MFG_RE.test(ctx)) return { contradiction: false, reason: "" };
  const asserts12 = /12\s*%|twelve percent|subject to (the )?vat/i.test(a);
  const universalDenial = UNIVERSAL_12_RE.test(a);
  const mentionsExemption = CREATE_MORE_EXEMPTION_RE.test(a);
  if (asserts12 && universalDenial && !mentionsExemption) {
    return { contradiction: true, reason: "import_vat_omits_create_more_export_exemption" };
  }
  // Explicit denial that the CREATE MORE export-enterprise exemption exists.
  if (CREATE_MORE_DENIAL_RE.test(a)) {
    return { contradiction: true, reason: "import_vat_denies_create_more_export_exemption" };
  }
  return { contradiction: false, reason: "" };
}

// PHASE-10A12-R3: Q5 source-sufficiency gate. The confirmed A12-R2 P1-1 defect:
// Q5-p1 received VERIFIED_CONTROLLING for an answer that concluded goods used to
// make export products "may qualify for zero-rating", citing ONLY generic VAT
// authority (NIRC Sec 107, RR No. 16-2005). Those authorities do not establish
// the CREATE MORE / RA No. 12066 export-enterprise exemption or zero-rating
// basis. The existing detectImportVatExemptionOmission guard only fires on a
// UNIVERSAL 12% assertion or an EXPLICIT denial; it does not catch an incentive
// treatment GRANTED (exemption/zero-rating) on generic authority alone. This
// gate closes that gap: an incentive-import answer may not verify unless a
// SPECIFIC incentive authority actually supports the incentive treatment.
//
// Generalizable within the import-VAT incentive class -- it keys on normalized
// dimensions (import context, incentive/export context, incentive treatment
// claim, authority specificity), not the literal strings "Q5", "CREATE MORE",
// "RA 12066", or "import VAT". A generic statute citation is never accepted as
// support for a specific incentive conclusion. Pure -- no I/O.
const IMPORT_CONTEXT_RE = /\bimport\w*|importation\b/i;
const INCENTIVE_CONTEXT_RE = /\bexport\b|export[- ]oriented|\brbe\b|registered (business )?enterprise|ecozone|\bpeza\b|freeport|\bincentiv\w+|create more\b/i;
// Specific Philippine incentive authorities that CAN support an export-enterprise
// import-VAT exemption / zero-rating conclusion. Generic VAT provisions (NIRC
// Sec 106-109, RR 16-2005) are deliberately excluded.
const SPECIFIC_INCENTIVE_AUTHORITY_RE =
  /\bR\.?\s*A\.?\s*(no\.?\s*)?(12066|11534|7916|11916)\b|republic act\s*(no\.?\s*)?(12066|11534|7916)|create\s*more|\bcreate act\b|\bpeza\b|section\s*0*(29[4-9]|3[0-1][0-9])\b|title\s*xiii|fiscal incentiv\w+|\bIPA\b|investment promotion agenc\w+|RR\s*(no\.?\s*)?(3-2025|21-2021|9-2021|5-2021|7-2022)|RMC\s*(no\.?\s*)?\d/i;
// Generic VAT authority (present but not incentive-specific).
const GENERIC_VAT_AUTHORITY_RE =
  /\bsec(?:tion|\.)?\s*0*10[6-9]\b|RR\s*(no\.?\s*)?16-2005|value[- ]added tax act/i;
const CLAIMS_EXEMPTION_RE = /\bvat[- ]?exempt\w*|exempt(ion)?\s+from\s+(the\s+)?vat|not\s+subject\s+to\s+(the\s+)?vat\b/i;
const CLAIMS_ZERORATING_RE = /\bzero[- ]?rat(e|ed|ing)\b/i;
const CLAIMS_QUALIFY_RE = /\bmay\s+qualify|can\s+qualify|qualif\w+\s+for\s+(the\s+)?(exemption|zero|special)|special\s+(regime|treatment)\b/i;
const GRANTS_DEFINITIVE_INCENTIVE_RE = /\b(is|are|shall be|will be)\s+(vat[- ]?exempt\w*|zero[- ]?rated|exempt)\b/i;
const INCENTIVE_CONDITION_RE = /\bregistered\b|export[- ]oriented|directly attributable|\b70\s*%|qualif\w+|\bIPA\b|accredit\w+|in-house|customs territory|export enterprise|conditions?\b/i;
const PERIOD_APPLICABILITY_RE = /\beffectiv\w+|took effect|transition\w*|as amended|beginning\s+\d|\b20\d{2}\b|prospective\w*|until\b/i;
// A QUESTION that posits a QUALIFYING / registered export enterprise in the
// incentive regime -- the correct answer must rest on the incentive authority,
// so a VERIFIED_CONTROLLING answer on generic VAT authority alone is unsound
// (the confirmed Q5-par10 defect: a "qualified registered export enterprise ...
// under CREATE MORE" import answered with a generic input-tax-credit treatment
// citing only NIRC Sec 107 / RR 16-2005). Distinguished from a NON-qualifying
// framing (e.g. "does not meet the CREATE MORE conditions"), where the general
// rule legitimately controls and generic authority is sufficient.
const POSITIVE_QUALIFYING_RE = /\bqualified\b|registered (export )?(business )?enterprise|export[- ]oriented enterprise|\brbe\b|ipa[- ]registered|registered project|registered export/i;
const NEGATIVE_QUALIFYING_RE = /\b(does not|doesn't|do not|not)\s+(meet|qualif|register)|non[- ]qualif|fails to|ordinary importer|purely domestic|not (a )?registered|unregistered|does not export/i;
const INCENTIVE_REGIME_Q_RE = /create more\b|\bincentiv\w+|vat[- ]exempt\w*|\bexemption\b|zero[- ]rat\w*|\bR\.?\s*A\.?\s*(no\.?\s*)?(12066|11534)\b/i;

/**
 * Q5-class import-VAT incentive source-sufficiency check. Determines whether an
 * incentive treatment (exemption / zero-rating) asserted for an import question
 * is actually supported by a SPECIFIC incentive authority, or is granted on
 * generic VAT authority alone. Pure.
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {Array}  [params.sources]
 * @returns {{applicable:boolean, sufficient:boolean, reason:string, diagnostics:object}}
 */
export function evaluateImportVatIncentiveSourceSufficiency({ question, answer, sources = [] } = {}) {
  const q = typeof question === "string" ? question : "";
  const a = typeof answer === "string" ? answer : "";
  const ctx = q + "\n" + a;
  const sourceLabels = (Array.isArray(sources) ? sources : [])
    .map((s) => (s && (s.label || s.citation || s.title || s.displayLabel)) || "")
    .filter(Boolean)
    .join(" ; ");
  const authorityText = sourceLabels + " ; " + a;

  const claimsExemption = CLAIMS_EXEMPTION_RE.test(a);
  const claimsZeroRating = CLAIMS_ZERORATING_RE.test(a);
  const claimsQualify = CLAIMS_QUALIFY_RE.test(a);
  const incentiveTreatmentClaimed = claimsExemption || claimsZeroRating || claimsQualify;

  const importContext = IMPORT_CONTEXT_RE.test(ctx);
  const incentiveContext = INCENTIVE_CONTEXT_RE.test(ctx);
  const applicable = importContext && (incentiveContext || incentiveTreatmentClaimed);

  // Authority SUFFICIENCY keys on the DISPLAYED SOURCE CARDS, not answer prose.
  // A prose name-drop of "CREATE MORE" with only generic VAT source cards is
  // citation laundering and must NOT count as specific-authority support -- the
  // VERIFIED_CONTROLLING badge rests on the displayed authorities.
  const specificIncentiveAuthorityInSources = SPECIFIC_INCENTIVE_AUTHORITY_RE.test(sourceLabels);
  const specificIncentiveAuthorityMentionedInAnswer = SPECIFIC_INCENTIVE_AUTHORITY_RE.test(a);
  const specificIncentiveAuthorityPresent = specificIncentiveAuthorityInSources;
  const genericVatAuthorityPresent = GENERIC_VAT_AUTHORITY_RE.test(authorityText);
  const genericAuthorityOnly = !specificIncentiveAuthorityPresent && genericVatAuthorityPresent;
  const qualifyingIncentiveQuestion =
    POSITIVE_QUALIFYING_RE.test(q) && INCENTIVE_REGIME_Q_RE.test(q) && !NEGATIVE_QUALIFYING_RE.test(q);
  const conditionMentioned = INCENTIVE_CONDITION_RE.test(a);
  const periodMentioned = PERIOD_APPLICABILITY_RE.test(a);
  const grantsDefinitiveIncentive = GRANTS_DEFINITIVE_INCENTIVE_RE.test(a);

  const exemptionBasisSupported = claimsExemption ? specificIncentiveAuthorityPresent : true;
  const zeroRatingBasisSupported = claimsZeroRating ? specificIncentiveAuthorityPresent : true;
  const incentiveConditionSupported = incentiveTreatmentClaimed
    ? (specificIncentiveAuthorityPresent && conditionMentioned)
    : true;
  const periodApplicabilitySupported = incentiveTreatmentClaimed
    ? (specificIncentiveAuthorityPresent && periodMentioned)
    : true;
  // Substituting "zero-rated" for "exempt" (or vice versa) is only supportable
  // when a specific incentive authority is present to establish the label.
  const treatmentLabelMatchesAuthority = (claimsExemption || claimsZeroRating)
    ? specificIncentiveAuthorityPresent
    : true;

  const diagnostics = {
    applicable,
    incentiveTreatmentClaimed,
    claimsExemption,
    claimsZeroRating,
    specificIncentiveAuthorityPresent,
    exemptionBasisSupported,
    zeroRatingBasisSupported,
    treatmentLabelMatchesAuthority,
    periodApplicabilitySupported,
    genericAuthorityOnly,
    incentiveConditionSupported,
    specificIncentiveAuthorityInSources,
    specificIncentiveAuthorityMentionedInAnswer,
    qualifyingIncentiveQuestion
  };

  if (!applicable) {
    return { applicable, sufficient: true, reason: "", diagnostics };
  }
  // A qualifying-incentive QUESTION answered with only generic VAT source cards
  // cannot be VERIFIED_CONTROLLING -- the incentive authority is missing from the
  // displayed authorities (covers answers that omit the incentive entirely and
  // give a generic treatment, and blocks prose citation laundering).
  if (qualifyingIncentiveQuestion && !specificIncentiveAuthorityInSources) {
    return {
      applicable,
      sufficient: false,
      reason: "qualified_incentive_question_answered_on_generic_authority",
      diagnostics
    };
  }
  if (!incentiveTreatmentClaimed) {
    return { applicable, sufficient: true, reason: "", diagnostics };
  }
  // Core fail-closed rule: an incentive treatment granted on generic authority
  // alone (no specific incentive authority anywhere) cannot verify.
  if (!specificIncentiveAuthorityPresent) {
    return {
      applicable,
      sufficient: false,
      reason: "incentive_treatment_claimed_without_specific_incentive_authority",
      diagnostics
    };
  }
  // Specific authority present but a DEFINITIVE incentive granted with no
  // qualifying taxpayer/transaction condition stated -> unsupported grant.
  if (grantsDefinitiveIncentive && !conditionMentioned) {
    return {
      applicable,
      sufficient: false,
      reason: "incentive_granted_without_qualifying_condition",
      diagnostics
    };
  }
  return { applicable, sufficient: true, reason: "", diagnostics };
}

// PHASE-10A12-R6: general PROPOSITION-SPECIFIC source-sufficiency control. The R5
// independent review confirmed a CLASS-LEVEL laundering defect (M-Q36 and M-Q25):
// a decisive legal proposition of one type received VERIFIED_CONTROLLING on source
// cards that are topically adjacent but do NOT control that proposition -- a
// penalty computation "supported" by general VAT-imposition sections (Sec 105-108),
// and an EWT conclusion "supported" by VAT registration/invoicing authority
// (Sec 109/236, RR 16-2005). This control classifies the answer's decisive
// proposition and requires the DISPLAYED SOURCE CARDS to carry authority of the
// MATCHING class, failing closed when the decisive proposition lacks a controlling
// authority of its own class. It keys on normalized topical signals (proposition
// class, authority class), NOT question IDs, exact strings, or answer-specific deny
// lists, so it covers a legal-risk class rather than a single question. Pure.
//
// --- proposition-class signals (question, reinforced by answer) ---
// Penalty/procedural COMPUTATION propositions (surcharge, interest-as-penalty,
// compromise penalty, late-filing/payment penalties, failure to file/pay). Bare
// "interest" (passive-income interest) and generic "filing deadline" are
// deliberately excluded to avoid over-firing on non-penalty questions.
const PENALTY_PROPOSITION_RE = /\bpenalt\w+|\bsurcharge\b|compromise penalt\w*|addition to (the )?tax|\blate (filing|payment|remittance)\b|failure to (file|pay|remit)\b|non[- ]?filing|delinquen\w+|deficiency (tax|assessment)|interest (penalty|on (the )?(deficiency|delinquent|unpaid|late))/i;
// Expanded/creditable withholding (EWT) propositions -- distinct from FINAL
// withholding tax on passive income (different authority: Sec 24(B)/27(D)).
const EWT_PROPOSITION_RE = /\b(ewt|expanded withholding|creditable withholding)\b/i;
const EWT_CONTEXT_RE = /\b(payment|fee|professional|law firm|accounting|service|rental|contractor|supplier|income payment|remit)\b/i;
const FINAL_WHT_RE = /\bfinal withholding\b/i;
// --- authority-class signals (SOURCE CARD labels only) ---
// Penalty authority: the penal/addition-to-tax provisions and the EOPT penalty
// reliefs. General VAT/income imposition sections are deliberately NOT here.
const PENALTY_AUTHORITY_RE = /\bsec(?:tion|\.)?\s*0*(248|249|250|253|254|255)\b|R\.?\s*A\.?\s*(no\.?\s*)?11976|\bEOPT\b|RR\s*(no\.?\s*)?6-2024|RMC\s*(no\.?\s*)?52-2023|compromise penalt\w*/i;
// Withholding authority: the creditable/expanded withholding regulations and the
// withholding-at-source provisions.
const WITHHOLDING_AUTHORITY_RE = /RR\s*(no\.?\s*)?(2-1998|2-98|11-2018|14-2002|17-2003|6-2001)|RMC\s*(no\.?\s*)?50-2018|\bsec(?:tion|\.)?\s*0*(57|58)\b|expanded withholding|creditable withholding/i;

// PHASE-10A13-R1: registration/procedural and transaction-specific VAT-exception
// classes. A13 found these classes laundered on non-controlling authority: Q38
// (business-registration + form) verified on withholding regs + foundational
// NIRC Sec 2/3; Q46 (gold-to-BSP VAT treatment) verified on general VAT-imposition
// sections. These signals are class-based -- no question IDs, exact prompts, or
// answer-string deny lists.
//
// Registration/procedural PROPOSITION: obligation to register, registration
// category, applicable registration form, or registration procedure (amend/update/
// close/transfer/cancel). Distinguished from a tax-RETURN-form question (which is
// not a registration act).
const REGISTRATION_PROPOSITION_RE = /\b(register|registration|registering)\b|BIR\s*Form\s*(no\.?\s*)?190\d\b|(amend\w*|cancel\w*|updat\w*|transfer\w*|clos\w+)\s+(the\s+)?(bir\s+)?registration|registration\s+(of|for)\s+(a\s+)?(new\s+)?(business|taxpayer|branch|entity)/i;
// Registration authority: the registration provisions and registration issuances.
// Foundational (Sec 1-6) and withholding authority are deliberately NOT here.
const REGISTRATION_AUTHORITY_RE = /\bsec(?:tion|\.)?\s*0*(236|237|238|258)\b|RR\s*(no\.?\s*)?(7-2012|11-2008|7-2024|4-2024|7-2011)|RMC\s*(no\.?\s*)?(57-2020|17-2024|37-2019|19-2018|136-2022)/i;
// Transaction-specific VAT-treatment EXCEPTION claim (an exception to the general
// 12% imposition): exempt, zero-rated, not subject to VAT, or outside VAT scope.
const VAT_EXCEPTION_CLAIM_RE = /\bvat[- ]?exempt\w*|zero[- ]?rat(e|ed|ing)|not\s+subject\s+to\s+(the\s+)?(value[- ]added tax|vat)\b|outside\s+the\s+scope\s+of\s+(the\s+)?vat|exempt\s+from\s+(the\s+)?(value[- ]added tax|vat)/i;
// General VAT-imposition authority (the general regime -- NOT an exception basis).
const GENERAL_VAT_IMPOSITION_RE = /\bsec(?:tion|\.)?\s*0*10[5-8]\b|RR\s*(no\.?\s*)?16-2005/i;
// VAT exemption / zero-rating / transaction-specific exception authority. Includes
// the exempt-transactions catalog (Sec 109), the zero-rating subsections
// (Sec 106(A)(2) / 108(B)), the incentive authorities, and specific exception laws.
const VAT_EXCEPTION_AUTHORITY_RE = /\bsec(?:tion|\.)?\s*0*109\b|\bsec(?:tion|\.)?\s*0*10[68]\s*\(?\s*[ab]\s*\)?\s*\(?\s*2|zero[- ]?rated\s+sale|R\.?\s*A\.?\s*(no\.?\s*)?(11256|9994|10963|11534|12066|10378|9593|11534)\b|create\s*more|\bpeza\b|ecozone|freeport|RR\s*(no\.?\s*)?(4-2007|13-2018|9-2021|3-2025|21-2021|5-2021)/i;

// PHASE-10A14-R1: filing-obligation, filing-deadline, and estate tax-base classes.
// The A14 independent review confirmed three compound-proposition laundering P1s:
// Q12 (a no-filing-required conclusion verified on income-tax RATE/residency
// provisions with no filing authority), Q34 (an ITR filing DEADLINE verified on
// rate/residency provisions with no deadline authority), and Q30 (an estate-tax
// computation that misstates the base -- "6% on the value of the estate exceeding
// P5,000,000", treating the P5M standard deduction as a threshold on estate value).
// Class-based; no question IDs, exact prompts, income amounts, dates, or deny lists.
//
// PHASE-10A14-R2: SEMANTIC proposition coverage. The R1 phrase-oriented detectors
// missed ordinary paraphrases, statement forms, short follow-ups, answer-introduced
// conclusions, and Taglish for the filing-obligation, filing-deadline, and estate
// tax-computation classes. The layer below recognizes CONCEPTS (action, object,
// obligation, temporal, computation) across common forms rather than one sentence
// pattern, disambiguates the OBJECT (a tax return vs a payment/protest/registration/
// assessment/prescription/document), and gates answer-introduced conclusions. No
// question IDs, exact prompts, amounts, dates, or reviewer phrases govern behavior.

// Bounded normalization: lowercase, expand ITR/AITR and a few contractions, and
// map a few bounded Taglish tax terms to their English concept so detection is not
// tied to formal American-English phrasing.
function normalizeTaxText(t) {
  return (typeof t === "string" ? t : "").toLowerCase()
    .replace(/\baitr\b|\bitr\b/g, " income tax return ")
    .replace(/\bdon't\b/g, "do not").replace(/\bdoesn't\b/g, "does not").replace(/\bdidn't\b/g, "did not")
    .replace(/\bi'm\b/g, "i am").replace(/\bwon't\b/g, "will not").replace(/\bcan't\b/g, "cannot")
    // bounded Taglish -> English concept
    .replace(/\bmag[- ]?file\b|\bmagfa[- ]?file\b|\bnag[- ]?file\b|\bi[- ]?file\b|\bmakapag[- ]?file\b/g, " file ")
    .replace(/\bi[- ]?submit\b|\bise[- ]?submit\b|\bisu[- ]?submit\b|\bmagsumite\b|\bmag[- ]?sumite\b/g, " submit ")
    .replace(/\bihahabol\b|\bihabol\b|\bmaihabol\b/g, " file late catch up ")
    .replace(/\bkailangan(?:\s+ko)?(?:\s+pa)?(?:\s+ba)?\b/g, " need required ")
    .replace(/\bhanggang ka[il]+an\b/g, " until when deadline ")
    .replace(/\blate na ba\b|\blate na\b|\bhuli na ba\b|\bhuli na\b/g, " already late ")
    .replace(/\bhuling araw\b/g, " last day ")
    // "pwede/puwede pa (bang) mag-file/isumite/ihabol" -> can still file
    .replace(/\bp[uw]+ede pa\b/g, " can still ")
    .replace(/\bmay oras pa\b/g, " time remaining still ")
    .replace(/\bka[il]+an(?:\s+ang)?\b/g, " when ")
    .replace(/\banong petsa\b/g, " what date ")
    .replace(/\btax[- ]?free\b/g, " tax-free ")
    .replace(/\s+/g, " ").trim();
}

// PHASE-10A14-R3: clause-scoped multi-proposition architecture. The R2 independent
// review confirmed five P1 defects rooted in COMBINED-TEXT global suppression and
// POOLED authority matching: (P1-1) a wrong object anywhere in the combined text
// suppressed a separate decisive return-filing proposition; (P1-2) common relative-
// period / Taglish deadline forms were unclassified; (P1-3) filing-deadline authority
// pooled every tax type, so estate authority satisfied an individual ITR deadline and
// vice-versa; (P1-4) a correct estate computation on unrelated authority passed the
// gate merely because no misstatement pattern fired; (P1-5) a standard-deduction-as-
// threshold misstatement in a new surface form was missed. The model below segments
// text into clauses, detects propositions PER CLAUSE (so one wrong object cannot erase
// another), classifies each filing proposition's tax/return/taxpayer object, matches
// authority by an explicit tax-type compatibility matrix, and evaluates estate
// computations by legal RELATIONSHIP plus positive component-authority sufficiency.
// No question IDs, exact prompts, amounts, dates, or reviewer phrases govern behavior.

// Split into bounded clause spans on sentence/semicolon/colon/bullet/newline
// boundaries and on contrastive/coordinating conjunctions that separate distinct
// actions or legal conclusions ("but", "however", "although", "while", "whereas",
// ", and ", ", or ").
function segmentClauses(text) {
  const n = normalizeTaxText(text);
  if (!n) return [];
  return n
    .split(/[.;:\n•\-]{1,}|\bbut\b|\bhowever\b|\balthough\b|\bwhile\b|\bwhereas\b|,\s+(?:and|or)\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

// --- concept families (applied to a single normalized clause) ---
const C_FILING_ACT = /\b(file|filing|filed|submit|submitting|submitted|furnish|lodge|send|sending|accomplish|declare)\b/;
// A tax RETURN object. Strong forms are unambiguous; the bare word "return" counts
// only when a filing act or tax context is present in the same clause and it is not a
// non-tax "return" (return of capital, rate of return, sales return, return a document).
const RETURN_OBJECT_STRONG = /\b(income tax return|annual (?:income tax )?return|quarterly (?:income tax )?return|estate tax return|donor'?s tax return|vat return|percentage tax return|corporate (?:income tax )?return)\b/;
const RETURN_OBJECT_BARE = /\b(tax return|the return|a return|annual return|the annual return|no return|separate return|substituted filing)\b/;
const GENERIC_RETURN_FALSE_POS = /\b(return of capital|rate of return|sales return|invest\w* return|return on|goods return\w*|return\w* goods|return the|return to (?:the )?(?:office|sender|customer)|product return|merchandise return)\b/;
const C_OBLIGATION = /\b(required|require|need|needs|needed|must|have to|has to|had to|should|necessary|obligat\w+|oblige\w*|exempt from filing|not required|no need|no (?:income tax )?return|substituted filing|do(?:es)? not (?:have|need) to|not (?:have|need) to)\b/;
// Non-return objects. Presence in a clause makes THAT clause a non-return proposition;
// it does not suppress a return proposition detected in another clause.
const OBJ_PROTEST = /\bprotest\b/;
const OBJ_DOCUMENT = /\b(document|documents|supporting|attachment|financial statement|books?(?: of accounts)?|official receipt|receipts?|invoice|invoices|memorandum|schedule)\b/;
const OBJ_REFUND = /\b(refund claim|claim for refund|refund|tax credit)\b/;
const OBJ_REGISTRATION = /\b(register|registration|business permit|permit application|dti|sec (?:registration|filing))\b/;
const OBJ_PAYMENT = /\b(pay(?:ment)?|remit(?:tance)?|settle the tax|pay the (?:tax|estate tax|vat))\b/;
const OBJ_ASSESSMENT = /\b(assessment period|prescriptive period|prescription|period (?:to|within which)[^.\n]{0,40}assess|assess the tax|right to assess)\b/;
const OBJ_APPEAL = /\b(appeal|petition for review|elevate to the (?:cta|court))\b/;
// Genuine deadline signals. Bare "due"/"late" are admitted ONLY when return-scoped in
// the clause (so "no tax is due" and penalty "late filing" are excluded). Relative-
// period and Taglish forms (normalized) are included.
const C_TEMPORAL_GENERAL = /\b(deadline|due date|last day|closing date|filed by|submit by|on or before|already late|overdue|still file|file today|can still (?:file|submit)|filing period (?:still )?open|filing closes|closing of filing|how many days|how much time|time remaining|until when|until april|until january|until february|until march|until may|until june|until july|until august|until september|until october|until november|until december|what date|by what date|final date|final filing date)\b/;
// Return-scoped "due"/"already late"/"overdue"/"late for" only. Bare "late filing"
// (a penalty-offense noun phrase) is deliberately NOT a deadline signal.
const C_TEMPORAL_RETURN_SCOPED = /\breturn\b[^.\n]{0,25}\b(due|overdue|already late|late for|too late)\b|\b(due|overdue|already late|late for|too late|am i late|are we late)\b[^.\n]{0,25}\breturn\b/;
// Answer-introduced conclusions (a definite filing/deadline conclusion in the answer).
const A_FILING_CONCLUSION = /\b(no (?:income tax )?return (?:is )?(?:required|needed|necessary)|not required to (?:file|submit|furnish|send|lodge)|exempt from filing|(?:do|does) not (?:have|need) to (?:file|submit)|substituted filing (?:applies|is available|is allowed)|(?:must|required to|need to) (?:file|submit) (?:a |an )?(?:income tax |annual |estate tax |donor'?s tax |vat |corporate )?return|no (?:separate )?(?:income tax )?return (?:is )?(?:required|needed))\b/;
const A_DEADLINE_CONCLUSION = /\b(?:filed?|due|submit(?:ted)?)\s+(?:on or )?before\b|\bdue (?:on|by)\b|\bdeadline is\b|\blast day (?:to|for|is)\b|\buntil (?:april|january|february|march|may|june|july|august|september|october|november|december|the \d)|\bon or before (?:april|january|february|march|may|june|july|august|september|october|november|december|the \d)|\bstill (?:file|be filed)\b|\balready late\b/;

// --- tax-type / return-type / taxpayer-type classification (deterministic) ---
// Resolve tax/return/taxpayer type from a single text span. Returns unknown when no
// marker is present so the caller can fall back to broader context.
function resolveTypeMarkers(t) {
  const estate = /\bestate tax\b|\bestate tax return\b|\bgross estate\b|\bnet estate\b|\bdecedent\b|\bestate of\b/.test(t);
  const donor = /\bdonor'?s tax\b|\bdonor'?s tax return\b|\bdonation\b|\bgift tax\b|\bdonor\b/.test(t);
  const vat = /\bvat return\b|\bvalue[- ]added tax\b|\bvat\b/.test(t);
  const percentage = /\bpercentage tax\b/.test(t);
  const corporate = /\bcorporat\w+\b|\bdomestic corporation\b|\bcompany'?s (?:income tax )?return\b/.test(t);
  const individualMarker = /\bindividual\b|\bemployee\b|\bself[- ]?employed\b|\bmixed[- ]?income\b|\bcompensation\b|\bpurely compensation\b|\bsole proprietor\b|\bincome tax return\b|\bannual return\b/.test(t);
  let taxType = "unknown", returnType = "unknown", taxpayerType = "unknown";
  if (estate) { taxType = "estate_tax"; returnType = "estate"; taxpayerType = "estate"; }
  else if (donor) { taxType = "donor_tax"; returnType = "donor"; taxpayerType = "donor"; }
  else if (percentage) { taxType = "percentage_tax"; returnType = "percentage"; taxpayerType = /\bcorporat/.test(t) ? "corporation" : "individual"; }
  else if (vat) { taxType = "vat"; returnType = "vat"; taxpayerType = "vat_taxpayer"; }
  else if (corporate) { taxType = "corporate_income_tax"; returnType = "corporate_income"; taxpayerType = "corporation"; }
  else if (individualMarker) {
    taxType = "individual_income_tax"; returnType = "individual_income";
    taxpayerType = /\bself[- ]?employed\b/.test(t) ? "self_employed"
      : /\bmixed[- ]?income\b/.test(t) ? "mixed_income"
      : /\bemployee\b|\bcompensation\b/.test(t) ? "employee" : "individual";
  }
  return { taxType, returnType, taxpayerType };
}

// Clause-FIRST classification: a clause's own tax-type markers take precedence, so a
// different tax type discussed elsewhere in the text cannot bleed into this clause's
// proposition. Context is consulted only when the clause itself is ambiguous.
function classifyReturnContext(clause, contextText) {
  let m = resolveTypeMarkers(clause);
  if (m.returnType === "unknown") {
    const ctx = resolveTypeMarkers(contextText || "");
    if (ctx.returnType !== "unknown") m = ctx;
  }
  const scope = clause + " \n " + (m.returnType !== "unknown" ? "" : (contextText || ""));
  const substituted = /\bsubstituted filing\b/.test(scope);
  const quarterly = /\bquarterly\b/.test(scope);
  let returnType = m.returnType;
  if (returnType === "individual_income" && substituted) returnType = "individual_substituted";
  else if (returnType === "individual_income" && quarterly) returnType = "individual_quarterly";
  else if (returnType === "corporate_income" && quarterly) returnType = "corporate_quarterly";
  return { taxType: m.taxType, returnType, taxpayerType: m.taxpayerType, substituted };
}

// --- authority classification (SOURCE CARD labels only), per tax type ---
const AUTH_IND_FILING = /\bsec(?:tion|\.)?\s*0*(51|51[- ]?a|56|74)\b|RR\s*(no\.?\s*)?(2-98|2-1998|11-2018|8-2018)/i;
const AUTH_SUBSTITUTED = /\bsec(?:tion|\.)?\s*0*51[- ]?a\b|RR\s*(no\.?\s*)?(2-98|2-1998|11-2018)|substituted filing/i;
const AUTH_CORP_FILING = /\bsec(?:tion|\.)?\s*0*(52|75|76|77)\b/i;
const AUTH_ESTATE_FILING = /\bsec(?:tion|\.)?\s*0*(90|91)\b/i;
const AUTH_DONOR_FILING = /\bsec(?:tion|\.)?\s*0*(99|103)\b/i;
const AUTH_VAT_FILING = /\bsec(?:tion|\.)?\s*0*114\b/i;
const AUTH_PCT_FILING = /\bsec(?:tion|\.)?\s*0*(116|128)\b/i;
// Estate computation authority: rate (Sec 84) and base/deduction (Sec 85/86).
const AUTH_ESTATE_RATE = /\bsec(?:tion|\.)?\s*0*84\b/i;
const AUTH_ESTATE_BASE_DEDUCTION = /\bsec(?:tion|\.)?\s*0*(85|86)\b/i;

function classifyAuthorities(sourceLabels) {
  const s = sourceLabels || "";
  return {
    indFiling: AUTH_IND_FILING.test(s),
    substituted: AUTH_SUBSTITUTED.test(s),
    corpFiling: AUTH_CORP_FILING.test(s),
    estateFiling: AUTH_ESTATE_FILING.test(s),
    donorFiling: AUTH_DONOR_FILING.test(s),
    vatFiling: AUTH_VAT_FILING.test(s),
    pctFiling: AUTH_PCT_FILING.test(s),
    estateRate: AUTH_ESTATE_RATE.test(s),
    estateBaseDeduction: AUTH_ESTATE_BASE_DEDUCTION.test(s)
  };
}

// Deterministic authority-compatibility matrix: a filing proposition's required
// authority must match its EXACT return/tax type. Filing authority of a different tax
// type is related but NOT controlling.
function filingAuthorityCompatible(returnType, auth) {
  switch (returnType) {
    case "individual_income":
    case "individual_quarterly": return auth.indFiling;
    case "individual_substituted": return auth.substituted;
    case "corporate_income":
    case "corporate_quarterly": return auth.corpFiling;
    case "estate": return auth.estateFiling;
    case "donor": return auth.donorFiling;
    case "vat": return auth.vatFiling;
    case "percentage": return auth.pctFiling;
    default: return false; // unknown/unresolved tax type -> insufficient
  }
}

// --- estate computation component + relationship model ---
// Amount-anchored base misstatements (Q30 family): rate applied to estate value
// exceeding an amount, excess-over an amount, first-amount tax-free, gross-less-amount.
const ESTATE_AMOUNT_MISSTATEMENT_RE = new RegExp([
  "(?:6 ?%|six percent|flat rate)[^.\\n]{0,90}\\b(?:value of the estate|estate value|gross estate|the estate)\\b[^.\\n]{0,40}\\b(?:exceed\\w*|over|above|in excess of)",
  "\\bon (?:the )?(?:value of the estate|estate value|gross estate)\\b[^.\\n]{0,40}\\b(?:exceed\\w*|over|above)",
  "\\b(?:excess over|on the excess|in excess of|amount[s]? exceeding|exceeding|over|above)\\b[^.\\n]{0,20}(?:peso|php|p|₱)?\\s*[\\d,]{4,}",
  "\\bfirst\\b[^.\\n]{0,30}\\btax-free\\b",
  "\\bfirst\\b[^.\\n]{0,25}(?:peso|php|p|₱)?\\s*[\\d,]{4,}[^.\\n]{0,25}\\b(?:tax-free|exempt|not taxed|no tax)\\b",
  "\\bgross estate\\b[^.\\n]{0,20}\\bless\\b[^.\\n]{0,20}(?:peso|php|p|₱)?\\s*[\\d,]{4,}"
].join("|"));
// Relational misstatements (P1-5 family): a deduction / first amount treated as a
// THRESHOLD / floor / exemption bracket / sole base reducer, without any fixed amount
// or one preferred phrase. The correct relation (net estate = gross LESS all allowable
// deductions) uses less/minus/after ALL deductions and is NOT matched here.
const ESTATE_DEDUCTION_AS_BOUNDARY_RE = /\b(?:above|over|in excess of|excess over|exceeding|beyond|past|begins? after|start\w* after|only the (?:balance|excess|amount)[^.\n]{0,30}(?:over|above|after|beyond))\b[^.\n]{0,40}\b(?:standard|basic|the|first|allowable)?\s*deduction\b/;
const ESTATE_DEDUCTION_AS_THRESHOLD_RE = /\b(?:standard|basic|the)?\s*deduction\b[^.\n]{0,30}\b(?:is|as|serves as|acts as|treated as|equals?|becomes)\b[^.\n]{0,20}\b(?:threshold|exemption|tax-free|floor|cutoff|estate[- ]?tax base|the base|taxable base)\b|\b(?:estate[- ]?tax )?threshold\b[^.\n]{0,25}\b(?:standard|basic)?\s*deduction\b|\bstandard deduction is the\b[^.\n]{0,20}\bthreshold\b/;
const ESTATE_FIRST_AMOUNT_OUTSIDE_RE = /\bfirst\b[^.\n]{0,40}\b(?:tax-free|exempt|outside the (?:tax )?base|not taxed|no tax|not part of the (?:tax )?base)\b/;
const ESTATE_GROSS_LESS_SINGLE_RE = /\bgross estate\b[^.\n]{0,25}\b(?:less|minus|reduced by)\b[^.\n]{0,20}\b(?:standard|basic) deduction\b[^.\n]{0,25}\b(?:equals?|is|=|becomes|gives|yields|as the)\b[^.\n]{0,20}\b(?:taxable|net) estate\b/;
const ESTATE_SUBTRACT_ONE_APPLY_RE = /\b(?:subtract|deduct|less|minus)\b[^.\n]{0,20}\b(?:standard|basic) deduction\b[^.\n]{0,40}\b(?:apply|applies|applied|multiply)\b[^.\n]{0,20}\b(?:rate|6 ?%|tax)\b/;

function analyzeEstateComputation(answerNorm, contextNorm) {
  const a = answerNorm || "";
  const ctx = (contextNorm || "") + " \n " + a;
  // Estate context requires a genuine estate-TAX marker (estate tax / gross estate /
  // net estate / decedent / value of the estate). Bare "estate" (e.g. "estate planning")
  // does NOT qualify, so a donor's-tax answer that legitimately has a 250k exemption
  // threshold and merely mentions "estate planning" is not misclassified as an estate
  // computation. A donor/gift context is explicitly excluded.
  const isEstate = /\bestate[- ]?tax\b|\bnet estate\b|\bgross estate\b|\bdecedent\b|\bestate of the\b|\bvalue of the estate\b/.test(ctx);
  const isDonor = /\bdonor'?s tax\b|\bgift tax\b|\bdonation\b|\bof gifts?\b|\btotal gifts?\b/.test(ctx);
  if (!isEstate || isDonor) return { isEstateComputation: false };
  const components = {
    rate: /\b6 ?%|\bsix percent\b|\bflat rate\b/.test(a),
    netEstate: /\bnet estate\b/.test(a),
    grossEstate: /\bgross estate\b/.test(a),
    deduction: /\bdeduction\b|\ballowable deduction/.test(a),
    standardDeduction: /\bstandard deduction\b/.test(a),
    threshold: /\bthreshold\b/.test(a)
  };
  const relationshipError =
    ESTATE_AMOUNT_MISSTATEMENT_RE.test(a) ||
    ESTATE_DEDUCTION_AS_BOUNDARY_RE.test(a) ||
    ESTATE_DEDUCTION_AS_THRESHOLD_RE.test(a) ||
    ESTATE_FIRST_AMOUNT_OUTSIDE_RE.test(a) ||
    ESTATE_GROSS_LESS_SINGLE_RE.test(a) ||
    ESTATE_SUBTRACT_ONE_APPLY_RE.test(a) ||
    // Estate tax is a flat 6% on the NET estate; it has no threshold/exemption bracket.
    // A "threshold" claim in an estate computation is inherently a base misstatement
    // (conflating the standard deduction/exemption with a taxable-base threshold).
    components.threshold === true;
  // A component cue OR a detected relationship error makes this a decisive estate
  // computation (so an "outside the tax base" misstatement is not lost for lack of a
  // 6%/deduction cue).
  const isComputation = components.rate || components.netEstate || components.grossEstate ||
    components.deduction || components.threshold || /\bexceed\w*|excess|tax-free|outside the (?:tax )?base\b/.test(a) ||
    relationshipError;
  return { isEstateComputation: isComputation, components, relationshipError };
}

/**
 * Clause-scoped multi-proposition ledger for filing/deadline/estate propositions.
 * Detects each proposition independently within mixed-object text and classifies its
 * tax/return object. Pure.
 * @returns {{propositions:Array, filingObligation:boolean, filingDeadline:boolean, estateComputation:boolean, estateBaseMisstatement:boolean, deadlineObject:(string|null), filingObject:(string|null), evidence:object}}
 */
export function detectFilingAndEstatePropositions(question, answer) {
  const qN = normalizeTaxText(question);
  const aN = normalizeTaxText(answer);
  const bothCtx = qN + " \n " + aN;
  const clauses = [
    ...segmentClauses(question).map((c) => ({ side: "question", clause: c })),
    ...segmentClauses(answer).map((c) => ({ side: "answer", clause: c }))
  ];

  const propositions = [];
  let pid = 0;
  for (const { side, clause } of clauses) {
    const notGeneric = !GENERIC_RETURN_FALSE_POS.test(clause);
    const hasStrongReturn = RETURN_OBJECT_STRONG.test(clause);
    const hasBareReturn = RETURN_OBJECT_BARE.test(clause) && notGeneric;
    const hasFilingAct = C_FILING_ACT.test(clause);
    // A return-scoped temporal ("the return was due", "late for the return") makes the
    // "return" a tax return in context (guarded against non-tax "return" senses).
    const returnScopedTemporal = C_TEMPORAL_RETURN_SCOPED.test(clause) && notGeneric && /\breturn\b/.test(clause);
    const returnObject = hasStrongReturn || (hasBareReturn && (hasFilingAct || /\btax\b/.test(clause))) || returnScopedTemporal;
    // dominant non-return object in THIS clause (only relevant when no return object here)
    const wrongObjectHere = (OBJ_PROTEST.test(clause) || OBJ_DOCUMENT.test(clause) || OBJ_REFUND.test(clause) ||
      OBJ_REGISTRATION.test(clause) || OBJ_APPEAL.test(clause)) && !returnObject;
    const assessmentHere = OBJ_ASSESSMENT.test(clause);
    const paymentHere = OBJ_PAYMENT.test(clause) && !returnObject && !hasFilingAct;

    // filing obligation: a return object + obligation/exemption concept, or an answer-
    // introduced filing conclusion, in THIS clause; the object must be a tax return.
    const obligationConcept = C_OBLIGATION.test(clause);
    const answerFilingConclusion = side === "answer" && A_FILING_CONCLUSION.test(clause);
    const filingObligationHere = !wrongObjectHere && !assessmentHere &&
      ((returnObject && obligationConcept) || answerFilingConclusion);

    // filing deadline: a temporal concept whose object is a tax-return filing.
    const temporalHere = C_TEMPORAL_GENERAL.test(clause) || C_TEMPORAL_RETURN_SCOPED.test(clause) ||
      (side === "answer" && A_DEADLINE_CONCLUSION.test(clause));
    const filingActOrReturnHere = hasFilingAct || returnObject;
    const filingDeadlineHere = temporalHere && filingActOrReturnHere &&
      !assessmentHere && !paymentHere && !wrongObjectHere;

    if (filingObligationHere || filingDeadlineHere) {
      const ctx = classifyReturnContext(clause, bothCtx);
      if (filingDeadlineHere) {
        propositions.push({
          propositionId: `p${pid++}`, sourceSide: side, sourceClause: clause,
          propositionClass: "filing_deadline", action: "file", objectType: "tax_return",
          taxType: ctx.taxType, returnType: ctx.returnType, taxpayerType: ctx.taxpayerType,
          substituted: ctx.substituted, decisive: true
        });
      }
      if (filingObligationHere) {
        propositions.push({
          propositionId: `p${pid++}`, sourceSide: side, sourceClause: clause,
          propositionClass: "filing_obligation", action: "file", objectType: "tax_return",
          taxType: ctx.taxType, returnType: ctx.returnType, taxpayerType: ctx.taxpayerType,
          substituted: ctx.substituted, decisive: true
        });
      }
    }
  }

  // PHASE-10A14-R5 (P2-R4-003): DEFINITIVE imperative tax-return filing instruction.
  // segmentClauses splits on hyphens (so "income-tax return" is torn apart), so scan
  // the full dehyphenated text. The instruction must be DIRECTIVE mood -- a BASE-form
  // filing verb (file/submit/lodge/furnish/accomplish and file), optionally led by a
  // modal (must/should/shall/please) or "to"/"and" -- directed at an INCOME-tax return
  // object (income tax return / ITR / annual return / BIR Form 1700-1701). This
  // deliberately EXCLUDES descriptive gerund/nominal uses ("penalty for late filing of
  // the return", "failure to file", "deadline for filing") via the base-form verb
  // requirement and a non-imperative-context guard, and excludes non-return objects
  // (protest, refund, invoices, registration, capital) via the required return object.
  const IMPERATIVE_TAX_RETURN_RE = /(?:^|[.;:]\s*|\b(?:must|should|shall|please|to|and)\s+)(?:file|submit|lodge|furnish|accomplish(?:\s+and\s+file)?)\s+(?:the\s+|a\s+|an\s+|your\s+)?(?:annual\s+)?(?:income\s+tax\s+return|itr|annual\s+return|(?:bir\s+)?form\s+170[01])\b/i;
  const NON_IMPERATIVE_FILING_CONTEXT = /\b(penalt\w+|surcharge|interest|late\s+filing|failure\s+to\s+file|deadline|when\s+to\s+file|for\s+filing|of\s+filing)\b/i;
  // Evaluate the answer and question separately (each begins clean, so a directive
  // instruction is sentence-initial), and require the SAME text to be free of a
  // non-imperative descriptive context.
  const imperativeHit = [aN, qN]
    .map((t) => String(t || "").replace(/-/g, " "))
    .some((t) => IMPERATIVE_TAX_RETURN_RE.test(t) && !NON_IMPERATIVE_FILING_CONTEXT.test(t));
  if (imperativeHit &&
      !propositions.some((p) => p.propositionClass === "filing_obligation")) {
    const ctx = classifyReturnContext("file annual income tax return " + String(aN || "").slice(0, 200), bothCtx);
    propositions.push({
      propositionId: `p${pid++}`, sourceSide: "answer", sourceClause: "imperative_tax_return_filing",
      propositionClass: "filing_obligation", action: "file", objectType: "tax_return",
      taxType: ctx.taxType || "individual_income_tax",
      returnType: ctx.returnType || "individual_income",
      taxpayerType: ctx.taxpayerType, substituted: ctx.substituted, decisive: true, imperative: true
    });
  }

  // estate computation (answer-level component model; estate context may come from Q)
  const est = analyzeEstateComputation(aN, bothCtx);
  if (est.isEstateComputation) {
    propositions.push({
      propositionId: `p${pid++}`, sourceSide: "answer", sourceClause: aN,
      propositionClass: "tax_computation_basis", objectType: "estate_tax_computation",
      taxType: "estate_tax", returnType: "estate", taxpayerType: "estate",
      computationComponents: est.components, relationshipError: est.relationshipError, decisive: true
    });
  }

  const filingObligation = propositions.some((p) => p.propositionClass === "filing_obligation");
  const filingDeadline = propositions.some((p) => p.propositionClass === "filing_deadline");
  const estateComputation = est.isEstateComputation === true;
  const estateBaseMisstatement = est.isEstateComputation === true && est.relationshipError === true;
  const firstDeadline = propositions.find((p) => p.propositionClass === "filing_deadline");

  return {
    propositions,
    filingObligation, filingDeadline, estateComputation, estateBaseMisstatement,
    deadlineObject: firstDeadline ? "return_filing" : null,
    filingObject: filingObligation ? "tax_return" : null,
    evidence: {
      clauseCount: clauses.length,
      filingObligationClauses: propositions.filter((p) => p.propositionClass === "filing_obligation").map((p) => p.sourceClause),
      filingDeadlineClauses: propositions.filter((p) => p.propositionClass === "filing_deadline").map((p) => p.sourceClause),
      estate: est.isEstateComputation ? { components: est.components, relationshipError: est.relationshipError } : null
    }
  };
}


/**
 * Proposition-specific source-sufficiency check. Determines the answer's decisive
 * proposition class (currently: penalty/procedural computation, expanded-withholding
 * (EWT)) and requires the cited SOURCE CARDS to carry authority of the matching
 * class. Fails closed on topic-adjacent-but-non-controlling authority. Pure.
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {Array}  [params.sources]
 * @returns {{applicable:boolean, sufficient:boolean, reason:string, propositionClass:(string|null), diagnostics:object}}
 */
export function evaluatePropositionSourceSufficiency({ question, answer, sources = [] } = {}) {
  const q = typeof question === "string" ? question : "";
  const a = typeof answer === "string" ? answer : "";
  const sourceLabels = (Array.isArray(sources) ? sources : [])
    .map((s) => (s && (s.label || s.citation || s.title || s.displayLabel)) || "")
    .filter(Boolean)
    .join(" ; ");

  // Classify the decisive proposition QUESTION-LED (what is actually being asked),
  // so an answer that merely mentions penalties in passing does not trip the
  // penalty gate. A penalty question is the decisive ask when the QUESTION raises a
  // penalty/procedural computation; reinforced by the answer asserting a penalty.
  const penaltyQuestion = PENALTY_PROPOSITION_RE.test(q);
  const penaltyAnswerClaim = PENALTY_PROPOSITION_RE.test(a) || /\d+\s*%|\bphp\s*[\d,]+|₱\s*[\d,]+/i.test(a);
  const penaltyProposition = penaltyQuestion && penaltyAnswerClaim;
  const ewtQuestion = EWT_PROPOSITION_RE.test(q) || (/\bwithhold/i.test(q) && !FINAL_WHT_RE.test(q) && EWT_CONTEXT_RE.test(q));
  const ewtAnswerClaim = EWT_PROPOSITION_RE.test(a) || (/\bwithhold/i.test(a) && !FINAL_WHT_RE.test(a));
  const ewtProposition = ewtQuestion && ewtAnswerClaim;

  // PHASE-10A13-R1: registration/procedural proposition (question-led). The QUESTION
  // asks about a registration act (register / registration form / registration
  // procedure); reinforced by the answer stating the obligation or a form.
  const registrationQuestion = REGISTRATION_PROPOSITION_RE.test(q);
  const registrationAnswerClaim = REGISTRATION_PROPOSITION_RE.test(a) || /\bBIR\s*Form\b|\bregister\w*|\brequired to register\b/i.test(a);
  const registrationProposition = registrationQuestion && registrationAnswerClaim;

  // PHASE-10A13-R1: transaction-specific VAT-exception proposition (answer-led). The
  // ANSWER asserts an exception to the general VAT imposition (exempt / zero-rated /
  // not subject to VAT / outside scope) as its decisive treatment.
  const vatExceptionClaim = VAT_EXCEPTION_CLAIM_RE.test(a);
  const vatExceptionProposition = vatExceptionClaim && /\bvat\b|value[- ]added tax|subject to (the )?vat|import|sale|lease|transaction|gold|export/i.test(q + " " + a);

  // PHASE-10A14-R3: clause-scoped multi-proposition ledger for filing/deadline/estate.
  const sem = detectFilingAndEstatePropositions(q, a);
  const auth = classifyAuthorities(sourceLabels);
  const filingDeadlineProposition = sem.filingDeadline;
  const filingObligationProposition = sem.filingObligation;
  const estateComputationProposition = sem.estateComputation;
  const estateBaseMisstatement = sem.estateBaseMisstatement;

  const hasPenaltyAuthority = PENALTY_AUTHORITY_RE.test(sourceLabels);
  const hasWithholdingAuthority = WITHHOLDING_AUTHORITY_RE.test(sourceLabels);
  const hasRegistrationAuthority = REGISTRATION_AUTHORITY_RE.test(sourceLabels);
  const hasVatExceptionAuthority = VAT_EXCEPTION_AUTHORITY_RE.test(sourceLabels);
  const hasGeneralVatImposition = GENERAL_VAT_IMPOSITION_RE.test(sourceLabels);

  const diagnostics = {
    penaltyProposition,
    ewtProposition,
    registrationProposition,
    vatExceptionProposition,
    filingObligationProposition,
    filingDeadlineProposition,
    estateComputationProposition,
    estateBaseMisstatement,
    deadlineObject: sem.deadlineObject,
    propositionLedger: sem.propositions,
    semanticEvidence: sem.evidence,
    authorityClasses: auth,
    hasPenaltyAuthority,
    hasWithholdingAuthority,
    hasRegistrationAuthority,
    hasVatExceptionAuthority,
    hasGeneralVatImposition,
    generalVatOnly: hasGeneralVatImposition && !hasVatExceptionAuthority,
    sourceCardCount: (Array.isArray(sources) ? sources : []).length
  };

  // Penalty/procedural computation asserted without penalty authority in the cards.
  if (penaltyProposition && !hasPenaltyAuthority) {
    return { applicable: true, sufficient: false, reason: "penalty_proposition_without_penalty_authority", propositionClass: "penalty_procedural", diagnostics };
  }
  // EWT conclusion asserted without withholding authority in the cards.
  if (ewtProposition && !hasWithholdingAuthority) {
    return { applicable: true, sufficient: false, reason: "ewt_proposition_without_withholding_authority", propositionClass: "withholding_ewt", diagnostics };
  }
  // PHASE-10A13-R1: registration/form/procedure proposition asserted without
  // registration authority (only foundational / withholding / general / topically
  // adjacent) cannot verify (the Q38 class).
  if (registrationProposition && !hasRegistrationAuthority) {
    return { applicable: true, sufficient: false, reason: "registration_proposition_without_registration_authority", propositionClass: "registration_procedural", diagnostics };
  }
  // PHASE-10A13-R1: a transaction-specific VAT exception (exempt / zero-rated / not
  // subject to VAT) asserted on general VAT-imposition authority alone, without a
  // specific exemption/zero-rating/exception authority, cannot verify (the Q46
  // class). Preserves valid reachability: an exception answer citing Sec 109 / the
  // zero-rating subsection / a specific exception or incentive law passes.
  if (vatExceptionProposition && !hasVatExceptionAuthority) {
    return { applicable: true, sufficient: false, reason: "vat_exception_proposition_without_exception_authority", propositionClass: "vat_exception", diagnostics };
  }

  // PHASE-10A14-R3: evaluate every decisive filing/deadline proposition in the ledger.
  // Each proposition's required authority is matched to its EXACT tax/return type via
  // the compatibility matrix (a filing authority of the wrong tax type is related but
  // not controlling). The first unsupported decisive proposition fails closed; a
  // strongly-supported proposition cannot launder a weaker unsupported one.
  const filingProps = sem.propositions.filter(
    (p) => p.propositionClass === "filing_obligation" || p.propositionClass === "filing_deadline"
  );
  // PHASE-10A14-R5 (P1-R4-001): narrow Section 51 temporal-sufficiency control,
  // evaluated BEFORE ordinary filing-authority compatibility so the stale-current
  // failure is reported with its precise temporal reason. A capital-gains /
  // transaction-specific individual return TIMING proposition (NIRC Sec. 51(C)(2)) is
  // governed for CURRENT periods by RA 12214 (CMEPA). If the answer asserts such
  // transaction-specific timing for a current period on the ordinary Sec 51/51(C)
  // authority alone -- without the later amending law (RA 12214) present -- the
  // current-law chain is incomplete and it must fail closed. The ordinary annual
  // filing obligation, ordinary April-15 deadline (51(C)(1)), and Section 51-A
  // substituted filing are UNCHANGED by RA 11976/RA 12214 (officially verified) and
  // are intentionally NOT affected by this gate.
  const CGT_TXN_TIMING_RE = /\b(capital gains|sale (?:or exchange )?of shares|shares of stock not traded|disposition of real property|real property under section 24|within thirty \(?30\)? days|30[- ]day return)\b/i;
  const HISTORICAL_PERIOD_RE = /\b(19|20)\d{2}\b/;
  const AUTH_RA12214_RE = /\b(?:R\.?A\.?)\s*(?:no\.?\s*)?12214\b|\bCMEPA\b|capital markets efficiency/i;
  const txnTimingAsserted = filingDeadlineProposition && CGT_TXN_TIMING_RE.test(q + " \n " + a);
  if (txnTimingAsserted) {
    const yearMatch = (q + " " + a).match(HISTORICAL_PERIOD_RE);
    const explicitHistorical = yearMatch && Number(yearMatch[0]) < 2025;
    const hasLaterLaw = AUTH_RA12214_RE.test(sourceLabels);
    if (!explicitHistorical && !hasLaterLaw) {
      return {
        applicable: true, sufficient: false,
        reason: "section_51_later_amendment_missing",
        propositionClass: "filing_deadline",
        diagnostics: { ...diagnostics, temporalChain: "LATER_AMENDMENT_REQUIRED", requiredLaterLaw: "RA 12214" }
      };
    }
  }

  for (const p of filingProps) {
    const compatible = filingAuthorityCompatible(p.returnType, auth);
    if (!compatible) {
      const reason = p.propositionClass === "filing_deadline"
        ? "filing_deadline_proposition_without_matching_return_authority"
        : "filing_obligation_proposition_without_matching_return_authority";
      return {
        applicable: true, sufficient: false, reason,
        propositionClass: p.propositionClass,
        diagnostics: { ...diagnostics, failedProposition: p }
      };
    }
  }

  // PHASE-10A14-R3: estate-tax computation. (1) A base misstatement -- detected by legal
  // RELATIONSHIP (deduction/first-amount treated as threshold/floor/sole base reducer)
  // as well as amount-anchored forms -- fails closed. (2) A CORRECT estate computation
  // still requires POSITIVE authority for each decisive component actually asserted
  // (rate -> Sec 84; base/deduction -> Sec 85/86); a correct sentence on unrelated or
  // foundational authority fails closed.
  const estateProp = sem.propositions.find((p) => p.propositionClass === "tax_computation_basis");
  if (estateProp) {
    if (estateProp.relationshipError) {
      return { applicable: true, sufficient: false, reason: "estate_tax_base_deduction_threshold_conflation", propositionClass: "tax_computation_basis", diagnostics: { ...diagnostics, failedProposition: estateProp } };
    }
    const c = estateProp.computationComponents || {};
    const needsRate = c.rate === true;
    const needsBaseOrDeduction = c.netEstate === true || c.grossEstate === true || c.deduction === true || c.standardDeduction === true;
    const rateOk = !needsRate || auth.estateRate;
    const baseOk = !needsBaseOrDeduction || auth.estateBaseDeduction;
    if (!rateOk || !baseOk) {
      return { applicable: true, sufficient: false, reason: "estate_computation_without_estate_authority", propositionClass: "tax_computation_basis", diagnostics: { ...diagnostics, failedProposition: estateProp } };
    }
  }

  const applicable = penaltyProposition || ewtProposition || registrationProposition || vatExceptionProposition
    || filingObligationProposition || filingDeadlineProposition || estateComputationProposition;
  const propositionClass = penaltyProposition ? "penalty_procedural"
    : ewtProposition ? "withholding_ewt"
    : registrationProposition ? "registration_procedural"
    : vatExceptionProposition ? "vat_exception"
    : filingDeadlineProposition ? "filing_deadline"
    : filingObligationProposition ? "filing_obligation"
    : estateComputationProposition ? "tax_computation_basis" : null;
  return { applicable, sufficient: true, reason: "", propositionClass, diagnostics };
}

// PHASE-10A12-R2: generic (non-LOA) outcome-prediction guard. A question that
// asks TINA to predict/guarantee the outcome of a protest, refund, audit, or
// litigation must never receive VERIFIED_CONTROLLING -- a controlling
// "verified" badge on a predicted outcome is unsafe regardless of how the LLM
// scores the prose. Pure; keys off the QUESTION intent, not fluency, and is not
// LOA-specific.
// PHASE-10A12-R3: closed two gaps found live (RES-2): (a) a guarantee/predict
// trigger followed by a BARE verb ("guarantee ... cancel my assessment") --
// cancell?\w+ required a trailing word char and missed "cancel"; widened to
// cancell?\w* and added bare grant/approve/waive/reverse/uphold forms; (b) a
// "the BIR will cancel ..." ordering (subject before "will").
const OUTCOME_PREDICTION_RE = /\b(will|won't|would|can|could)\s+(i|we|my|our|the taxpayer|the client|it|they)\b[^.?\n]{0,80}\b(win|won|succeed|success|prevail|lose|be cancell?ed|be approved|be granted|be waived|be reversed|be upheld)\b|\b(guarante\w*|assur\w*|promis\w*|predict\w*|likelihood|chances?|odds|probability)\b[^.?\n]{0,80}\b(win|succeed|success|prevail|approv\w*|grant\w*|cancell?\w*|waiv\w*|revers\w*|uph[eo]ld\w*|favor\w*|outcome|refund)\b|\b(the\s+)?bir\s+will\s+(cancel|approve|grant|waive|reverse|uphold)|\bwill\s+(the\s+)?bir\s+(cancel|approve|grant|waive|reverse)\b|\bprevail\s+(at|before|in)\s+(the\s+)?(court of tax appeals|cta|bir)\b/i;

/**
 * Detects a request to predict/guarantee a tax controversy outcome. Pure.
 * @param {string} question
 * @returns {boolean}
 */
export function detectOutcomePredictionRequest(question) {
  return typeof question === "string" && OUTCOME_PREDICTION_RE.test(question);
}

// PHASE-10A14-R9 (P1-E1-001): calendar-relative filing-deadline safeguard. An AFFIRMED
// today/tomorrow/last-day filing-deadline conclusion cannot be VERIFIED_CONTROLLING: the
// runtime cannot establish temporal sufficiency (PH-calendar request date + taxable period
// + return type + operative deadline + weekend/holiday adjustment) inside the answer-support
// contract, and the general April-15 rule does NOT prove an arbitrary request date is the
// last filing day. A plain, non-relative statutory deadline statement ("the deadline is
// April 15") is unaffected and remains reachable.
// PHASE-10A14-R11 (P1-R10-IR-002): clause-level calendar-relative filing-directive detection.
// Replaces the single monolithic regex with bounded clause analysis. An unsafe clause has
// (a) a FILING action, (b) a RELATIVE time reference, and (c) present application to the user
// (a directive/recommendation force, a sentence-initial imperative, or an affirmative present-day
// deadline assertion) — and is NOT purely conditional / hypothetical / historical.
// PHASE-10A14-R12 (P1-R11-IR-001): structured current-user filing-directive classification.
// An unsafe clause = a FILING action + a RELATIVE time + present application to the user
// (directive force / recommendation-advice / sentence-initial or post-comma imperative /
// Tagalog filing verb / penalty pressure / affirmative present-day assertion), and NOT a
// genuine counterfactual / hypothetical / historical / negated statement (scope-sensitive).
// PHASE-10A14-R13 (P1-R12-IR-001/002): bounded, polarity-aware clause-FRAME classifier.
// Each clause is decomposed into an inspectable frame (action / temporal / speech-act /
// polarity+negation-scope / pressure / conditional scope) and the unsafe decision is derived
// from the frame, not from one growing regex. Safe epistemic/legal NEGATION of the filing
// conclusion/deadline/recommendation suppresses; negation of DELAY/POSTPONEMENT does not.
// PHASE-10A14-R14: adds "unfiled" (the nonperformance form "leave the return unfiled"
// names no filing verb at all) and the Taglish gerunds, both of which left hasFiling
// false and so bypassed the present-user directive test entirely.
const CR_FILING_ACTION_RE = /\b(file|filing|files|filed|unfiled|submit|submitted|submitting|submission|lodge|lodged|lodging|send|sent|transmit|transmitted|transmitting|accomplish|accomplished|complete the filing|completing the filing|(?:return|filing|submission|it) (?:must|should|shall|has to|is to|needs to) be completed|mag-?file|i-?file|isumite|mag-?submit|pagsumite|pag-?file|paghahain)\b/i;
// PHASE-10A14-R14: adds the avoidance/caution modals ("be careful (not) to", "cannot
// afford to"), which carry present-user directive force but matched no R13 cue.
const CR_DIRECTIVE_FORCE_RE = /\b(please|kindly|should|shall|must|need to|needs to|have to|has to|go ahead and|make sure (?:to|you|not to)|be careful (?:to|not to)|cannot afford (?:to|not to)|can['’]t afford (?:to|not to)|ensure (?:you|that you|to))\b/i;
// Recommendation / advice / encouragement families (WS4), incl. nominalized/passive forms.
const CR_RECOMMEND_RE = /\b(i (?:would |strongly )?(?:recommend|suggest|advise|encourage|urge)|my (?:advice|recommendation|suggestion) is|(?:it (?:is|would be|may be) )?(?:advisable|preferable|best|wise|prudent|sensible|recommended)\b|the (?:best|prudent|appropriate|sensible|safest|recommended) course|best to (?:file|submit|lodge|complete|transmit)|you (?:may|might) wish to|you should consider|you ought to|you are (?:encouraged|urged|advised) to|you would (?:need|have) to|i (?:believe|think) you (?:need|should)|(?:filing|submission|lodging|completing the filing)[^.\n]{0,20}(?:is|are)[^.\n]{0,20}(?:advisable|recommended|the best course|preferable|best)|(?:is|are) (?:recommended|advisable) for filing|better (?:to )?file|better file)\b/i;
const CR_REL_TODAY_RE = /\b(today|tonight|right now|now|immediate|immediately|promptly|at once|without delay|right away|as soon as (?:possible|practicable)|asap|before midnight|before the office closes|before (?:the )?close of business|before the end of business hours|by close of business|within the day|within business hours|this morning|this afternoon|this (?:very )?day|by (?:the )?end of (?:the )?(?:day|today)|before (?:the )?(?:day|today) ends|before the end of (?:the )?day|do so now|complete it immediately|do not wait|cannot wait until tomorrow|ngayon|ngayong araw|agad|kaagad|bago maghatinggabi|bago matapos ang araw|bago magsara ang opisina|sa loob ng araw)\b/i;
const CR_REL_TOMORROW_RE = /\b(tomorrow|bukas)\b/i;
const CR_REL_YESTERDAY_RE = /\b(yesterday|kahapon)\b/i;
const CR_AFFIRM_ASSERTION_RE = /\b(today is (?:the )?last day|last day to file (?:is |will be )?(?:today|now)|(?:it is|it['’]s|you are) (?:the )?last day to file|due today|due tomorrow|due yesterday|was due (?:today|tomorrow|yesterday)|already late|(?:you are|you're) still on time|(?:you )?can still file today|filing (?:closes|ends|is due) today|last chance to file today|today is (?:the )?(?:filing )?deadline|today is april\s*15|ngayon ang (?:huling araw|deadline)|ngayong araw ang (?:huling araw|deadline)|due ngayon|huli ka na|may oras ka pa)\b/i;
const CR_PASSED_ASSERTION_RE = /\b(?:the )?(?:filing )?deadline (?:has|had) (?:already )?passed\b/i;
// Penalty/deadline pressure (positive + inverted + "unless ... file ... penalt").
const CR_PENALTY_PRESSURE_RE = /\bto avoid (?:penalt\w*|surcharg\w*|interest)|avoid penalt\w* by filing|so penalties will not|to prevent (?:penalt\w*|a surcharg\w*)|(?:or|otherwise) (?:penalt\w*|a surcharg\w*)|will (?:prevent|avoid) (?:penalt\w*|surcharg\w*)|para (?:iwas|maiwasan)\w* penalty|avoid surcharg\w*|unless you (?:file|submit|lodge)[^.\n]{0,30}(?:penalt|surcharg)|if you do not (?:file|submit)[^.\n]{0,30}(?:penalt|surcharg)/i;
const CR_TAGALOG_IMPERATIVE_RE = /\b(tapusin|kumpletuhin|ihain|ipasa)\b/i;
// Genuine counterfactual / hypothetical / historical / general-advisory scope (WS8). NOTE: bare
// "unless"/"if"/"would"/"may" do NOT suppress; only these scoped forms do.
const CR_COUNTERFACTUAL_RE = /\b(only if|had the|had already|would have been|were the|provided that|would (?:normally|typically|generally|usually)|a practitioner would|practitioners would|an adviser might|if an (?:official )?extension|if today (?:is|were) (?:the )?(?:independently )?confirmed|independently confirmed as the operative|made today the (?:legal |operative )|if .{0,40}\bmade\b.{0,25}(?:operative|legal) deadline|may apply when|when a return is (?:filed|due))\b/i;
const CR_IMPERATIVE_FILING_RE = /(^|[.\n;:,\-]\s*|please\s+|kindly\s+|go ahead and\s+)\s*(file|submit|lodge|send|transmit|complete the filing|accomplish|mag-?file|i-?file|isumite|mag-?submit)\b/i;
const CR_PASSIVE_OBLIGATION_RE = /\b(?:the )?(?:return|filing|submission|it) (?:must|should|shall|has to|is to|needs to) be (?:filed|submitted|lodged|completed|accomplished)\b/i;
// WS7 — negation scope. SAFE: negates the filing conclusion / deadline assertion / recommendation.
// PHASE-10A14-R14: extended with explicit error-of-conclusion frames and Taglish
// epistemic negation, both of which over-fired in the R14 pre-fix campaign.
const CR_SAFE_NEGATION_RE = /\b(do(?:es)? not (?:establish|show|prove|mean|indicate|require|obligate|confirm|conclude|say)|(?:does|do|did) n['’]t (?:establish|show|prove|require|confirm)|is not established|are not established|not established|not shown|no authority|no basis to (?:recommend|advise|conclude|require)|cannot (?:confirm|conclude|determine|establish|verify)|do not (?:assume|conclude|think|presume)|(?:it (?:is|would be) )?(?:incorrect|wrong|an error|inaccurate|unsafe) to (?:conclude|assume|say|state|advise|recommend)|the (?:available )?(?:facts|evidence|authority) do(?:es)? not|not required to file (?:today|now|by)|not obligated to file (?:today|now)|are not required to file (?:today|now)|you are not required to file (?:today|now)|hindi (?:natin |namin |mo |niya )?(?:ma-?)?(?:confirm|makumpirma|matiyak|masabi|masasabi)|walang basehan|hindi (?:pa )?napatutunayan|hindi (?:pa )?napatunayan|hindi (?:pa )?patunay|huwag (?:mo(?:ng)? |kang |nang )?(?:ipagpalagay|ipalagay|isipin|akalain|asahan)|walang sapat na batayan|hindi tiyak(?: na| kung)|hindi malinaw kung|hindi (?:ka |kang |kayo(?:ng)? )?obligado(?:ng)?|hindi (?:ka |kang )?kailangang mag-?file (?:ngayon|ngayong araw))\b/i;
// UNSAFE negation: negates DELAY / POSTPONEMENT (i.e. still pressures acting now).
const CR_DELAY_NEGATION_RE = /\b(do not (?:delay|wait|postpone|defer|hold off|risk)|don['’]t (?:delay|wait|postpone|defer)|do not wait until tomorrow|huwag (?:nang |na )?(?:ipagpaliban|maghintay|mag-?antay|magpaliban))\b/i;

// ── PHASE-10A14-R14 (P1-R13-IR-001) — WS4/WS5 performance polarity ─────────────
// R13 modelled only two negation targets: the filing CONCLUSION (safe) and DELAY
// (unsafe). It had no concept of NONPERFORMANCE of the action itself, so double
// negation ("do not fail to file today") collapsed to no signal instead of to an
// affirmative directive. These predicates supply the missing third category.
// Bounded, per WS5: recognizing a predicate is necessary but never sufficient — a
// present-user imperative, obligation, recommendation or pressure is still required,
// so informational uses ("failure to file may result in penalties") stay safe.
const CR_NONPERF_OMISSION_RE = /\b(fail(?:s|ed|ing)? to|failure to|neglect(?:s|ed|ing)? to|omit(?:s|ted|ting)?|omission to|forget(?:s|ting)? to|forgot to|miss(?:es|ed|ing)? (?:the )?(?:filing|deadline|submission)|miss(?:es|ed|ing)? (?:filing|submitting|lodging)|leav(?:e|es|ing) (?:the )?(?:return|filing|it) unfiled|refrain(?:s|ed|ing)? from|skip(?:s|ped|ping)?|non-?filing)\b/i;
const CR_NONPERF_DEFERRAL_RE = /\b(delay(?:s|ed|ing)?|postpon(?:e|es|ed|ing)|defer(?:s|red|ring)?|put(?:s|ting)? off|wait(?:s|ed|ing)? (?:to|until))\b/i;
// Outer negation / avoidance operators that can scope over a nonperformance predicate.
const CR_OUTER_NEGATION_RE = /\b(do(?:es)? not|do n['’]t|don['’]t|doesn['’]t|must not|mustn['’]t|should not|shouldn['’]t|cannot afford (?:to|not to)|can['’]t afford (?:to|not to)|never|avoid(?:s|ed|ing)?|make sure (?:not to|you do not|you don['’]t|you never)|be careful not to|huwag)\b/i;
// An imperative headed by an outer negation or a nonperformance predicate. R13's
// CR_IMPERATIVE_FILING_RE anchors the FILING VERB to clause start, so it can never fire
// under an outer negation ("Do not [fail to] file") — the shared root cause of the
// negated-nonperformance and direct-prohibition misses.
const CR_NEGATED_IMPERATIVE_RE = /^\s*(?:please\s+|kindly\s+)?(do not|don['’]t|never|avoid|make sure not to|be careful not to|huwag|wait|delay|postpone|defer|put off|skip|fail|neglect|omit|forget|miss|leave|refrain)\b/i;
// Deferral anchor: an open-ended "do not file until ... confirmed" is a present-user
// filing directive even though it names no calendar day.
// PHASE-10A14-R15: also accepts a pronoun subject ("until IT is confirmed"), which is the
// ordinary way the deferral is written once the deadline has been named in a prior clause.
const CR_REL_DEFERRAL_RE = /\buntil (?:the |that )?(?:deadline|due date|filing date|it|this|that)\b[^.\n]{0,30}\b(?:is|are|has been)\b[^.\n]{0,20}\b(?:confirmed|verified|established|determined|clear)\b/i;

// ── PHASE-10A14-R15 (P1-R14-IR-001) — ACTION TARGET ────────────────────────────
// R14 treated any clause mentioning the noun "filing" near a relative time as a filing
// directive, so "do not fail to VERIFY whether filing is due today" was scored unsafe.
// The governed action there is verification, not filing. A directive whose complement is
// an epistemic/preparatory verb does not direct the user to file.
const CR_NONFILING_TARGET_VERBS =
  "verify|verifying|confirm|confirming|check|checking|double-?check|ensure|ensuring|determine|determining|review|reviewing|validate|validating|obtain|obtaining|secure|securing|gather|gathering|ask|asking|consult|consulting|preserve|preserving|retain|retaining|keep|keeping|explain|explaining|clarify|clarifying|read|reading|compute|computing|calculate|calculating|prepare|preparing";
// A nonperformance predicate or directive cue whose COMPLEMENT is a non-filing verb.
const CR_NONFILING_TARGET_RE = new RegExp(
  String.raw`\b(?:fail(?:s|ed|ing)? to|neglect(?:s|ed|ing)? to|forget(?:s|ting)? to|forgot to|omit(?:s|ted|ting)?|miss(?:es|ed|ing)?|refrain(?:s|ed|ing)? from|remember to|be sure to|make sure (?:to|you|that you)|be careful (?:to|not to)|see to it that (?:you )?)\s+(?:you\s+)?(?:also\s+)?(?:${CR_NONFILING_TARGET_VERBS})\b`,
  "i"
);
// A bare imperative/obligation whose head verb is a non-filing action.
const CR_NONFILING_IMPERATIVE_RE = new RegExp(
  String.raw`^\s*(?:please\s+|kindly\s+)?(?:do not |don['’]t |never |avoid |you (?:must|should|need to|have to) (?:not )?)?\s*(?:${CR_NONFILING_TARGET_VERBS})\b`,
  "i"
);

// ── PHASE-10A14-R15 — ADDITIONAL NONPERFORMANCE SURFACES ──────────────────────
// Reported misses IR-U1..IR-U4: "left unfiled", "remain outstanding", "unsubmitted",
// and "let the day pass without filing".
const CR_NONPERF_STATE_RE =
  /\b(?:left|leaving|leave|remain(?:s|ing|ed)?|stay(?:s|ing|ed)?|still)\s+(?:the\s+)?(?:return\s+)?(?:unfiled|unsubmitted|outstanding|unlodged|pending|undone)\b|\b(?:unfiled|unsubmitted|outstanding|unlodged)\b(?=[^.\n]{0,40}\b(?:today|tonight|tomorrow|midnight|day)\b)/i;
const CR_NONPERF_DAYPASS_RE =
  /\b(?:let|allow(?:ing)?|hayaan(?:g)?)\s+(?:today|the day|tonight|midnight|this day|the deadline|ang araw)\b[^.\n]{0,40}\b(?:pass|end|go by|elapse|lumipas|lipas)\b|\b(?:pass|end|go by|elapse)\b[^.\n]{0,30}\bwithout\s+(?:filing|submitting|lodging|transmitting)\b|\blumipas ang araw\b[^.\n]{0,40}\bhindi\b[^.\n]{0,25}\b(?:nakakapag-?file|naka-?file|mag-?file)\b/i;
// Deferral by holding the return.
const CR_NONPERF_HOLD_RE = /\bhold(?:s|ing)?(?:\s+off)?\b[^.\n]{0,30}\b(?:return|filing|submission|it)\b|\bhold(?:\s+off)?\s+(?:the\s+)?(?:return|filing|submission)\b|\bhold\s+(?:the\s+)?return\b/i;

// ── PHASE-10A14-R15 — FILIPINO NONPERFORMANCE AND DIRECTIVE CUES ──────────────
const CR_FIL_NONPERF_RE = /\b(?:mapalampas|palampasin|makaligtaan|malimutan|kalimutan(?:g)?|nakalimutan|ipagpaliban|magpaliban|antalahin|hindi\s+(?:maka)?(?:pag-?)?file|hindi nakakapag-?file|hindi naisumite)\b/i;
const CR_FIL_DIRECTIVE_RE = /\b(?:siguraduhin(?:g|)|tiyakin(?:g|)|huwag|dapat|kailangan mong|mag-?file ka|isumite mo)\b/i;

// PHASE-10A14-R15 (P1-R14-IR-001) — INDEPENDENT CLAUSE SEGMENTATION.
// R14 split only on sentence punctuation, newlines and headings. It never split on
// coordinators, so "The authority does not establish today's deadline, but do not fail to
// file today" was ONE clause in which the safe-negation branch matched and suppressed the
// unsafe half. A safe clause could therefore shield an unsafe one. R14's MM10 invariant
// asserted this could not happen; it passed only because its fixture used a sentence
// boundary, which does split.
//
// Coordinators are split ONLY when followed by material that can itself carry a directive,
// so noun coordination ("the taxpayer and spouse") does not fragment into noise. Each
// resulting clause is evaluated independently; a fragment lacking a filing action, a
// relative time and directive force is inert and cannot make an answer unsafe.
const CR_CLAUSE_COORDINATOR_RE =
  /(?:[,;—–-]\s*)?\b(?:but|however|nevertheless|nonetheless|although|though|even if|even though|yet|and then|then|and|or|ngunit|pero|subalit|gayunpaman|samantala)\b\s+/gi;

function splitCalendarClauses(answer = "") {
  const sentences = String(answer)
    .split(/(?<=[.!?;])\s+|\n+|(?=#{1,6}\s)/)
    .map((c) => c.trim())
    .filter(Boolean);
  // A sentence fragment may retain a leading coordinator once the sentence splitter has
  // already cut on ';' — e.g. "; however, do not file today" becomes "however, do not
  // file today", where the clause-initial imperative test can no longer fire.
  const stripLeadingCoordinator = (s) =>
    s.replace(/^\s*(?:but|however|nevertheless|nonetheless|although|though|yet|and then|then|and|or|ngunit|pero|subalit|gayunpaman|samantala)\b[,:\s]+/i, "").trim();

  const out = [];
  for (const sentence of sentences) {
    const normalized = stripLeadingCoordinator(sentence);
    const parts = normalized.split(CR_CLAUSE_COORDINATOR_RE).map((p) => stripLeadingCoordinator(p)).filter(Boolean);
    if (parts.length > 1) {
      // Evaluate ONLY the independent clauses. Keeping the unsplit sentence as well would
      // let a filing verb in one clause combine with a relative time in another
      // ("File by the applicable statutory deadline, but do not fail to verify whether
      // filing is due today") and produce a false positive from two individually safe
      // clauses. Any directive that genuinely spans a coordinator survives in the clause
      // that actually carries it.
      for (const p of parts) if (p.length >= 6) out.push(p);
    } else {
      out.push(normalized);
    }
  }
  return out.filter(Boolean);
}

/** Polarity-aware clause-frame classifier for calendar-relative filing directives. Pure, deterministic. */
function analyzeCalendarClause(clause = "") {
  const lc = clause.toLowerCase();
  const hasFiling = CR_FILING_ACTION_RE.test(lc);
  const relToday = CR_REL_TODAY_RE.test(lc), relTom = CR_REL_TOMORROW_RE.test(lc), relYest = CR_REL_YESTERDAY_RE.test(lc);
  const hasRelative = relToday || relTom || relYest;
  const affirm = CR_AFFIRM_ASSERTION_RE.test(lc) || CR_PASSED_ASSERTION_RE.test(lc);
  const directiveForce = CR_DIRECTIVE_FORCE_RE.test(lc);
  const recommend = CR_RECOMMEND_RE.test(lc);
  const passiveObligation = CR_PASSIVE_OBLIGATION_RE.test(lc);
  const imperative = CR_IMPERATIVE_FILING_RE.test(clause.trim());
  const filipinoFiling = /\b(mag-?file|i-?file|isumite|mag-?submit)\b/i.test(lc) || (CR_TAGALOG_IMPERATIVE_RE.test(lc) && hasFiling);
  const penaltyPressure = CR_PENALTY_PRESSURE_RE.test(lc);
  const counterfactual = CR_COUNTERFACTUAL_RE.test(lc);
  const yearHistorical = /\b(19|20)\d{2}\b/.test(lc) && !/\b(today|now|tomorrow|yesterday|ngayon|bukas|tonight|midnight)\b/i.test(lc);
  // WS7 polarity: which proposition does a negation govern?
  const safeNegation = CR_SAFE_NEGATION_RE.test(lc);
  const delayNegation = CR_DELAY_NEGATION_RE.test(lc);

  // ── PHASE-10A14-R14 (WS6) — negation-scope evaluation order ─────────────────
  // 1. quotation / attribution scope. If the filing action and its relative time occur
  //    ONLY inside quoted spans, the directive belongs to the quoted source, not to
  //    TINA. Quoting and rejecting an unsafe phrase must not become TINA's directive
  //    (metamorphic invariant 5). Only double/smart quotes are stripped, so apostrophes
  //    in contractions ("don't") are never treated as quotation.
  const dequoted = clause.replace(/[“"][^”"]*[”"]/g, " ");
  const quotedScope = dequoted !== clause &&
    !(CR_FILING_ACTION_RE.test(dequoted) &&
      (CR_REL_TODAY_RE.test(dequoted) || CR_REL_TOMORROW_RE.test(dequoted) || CR_REL_YESTERDAY_RE.test(dequoted)));

  // PHASE-10A14-R15 — UNQUOTED ATTRIBUTION SCOPE.
  // "According to your accountant, the return is due today" REPORTS a third party's
  // assertion; it is not TINA asserting a deadline. This suppresses an attributed
  // ASSERTION only. An attributed IMPERATIVE ("As the notice says, file today") is TINA
  // adopting the directive as its own and remains unsafe.
  const attributionScope = /\b(?:according to|as (?:the |your )?(?:notice|letter|client|adviser|accountant|auditor|bir)\b[^.\n]{0,20}\b(?:says|said|states|stated)|in the view of|per your (?:accountant|adviser|auditor)|your (?:accountant|adviser|auditor) (?:says|said|told))\b/i.test(lc);

  // 3. action + nonperformance predicate; 4. outer negation.
  // PHASE-10A14-R15: state-based ("left unfiled", "remain outstanding"), day-pass
  // ("let today pass without filing"), hold-deferral and Filipino surfaces added.
  const nonperfState = CR_NONPERF_STATE_RE.test(lc);
  const nonperfDayPass = CR_NONPERF_DAYPASS_RE.test(lc);
  const nonperfHold = CR_NONPERF_HOLD_RE.test(lc);
  const nonperfFilipino = CR_FIL_NONPERF_RE.test(lc);
  const nonperfOmission = CR_NONPERF_OMISSION_RE.test(lc) || nonperfState || nonperfDayPass || nonperfFilipino;
  const nonperfDeferral = CR_NONPERF_DEFERRAL_RE.test(lc) || nonperfHold;
  const nonperformancePredicate = nonperfOmission || nonperfDeferral;
  const nonperformanceType = nonperfOmission ? "OMISSION" : nonperfDeferral ? "DEFERRAL" : "NONE";
  const outerNegation = CR_OUTER_NEGATION_RE.test(lc) || /\bhindi\b|\bhuwag\b|\bcannot let\b|\bcan't let\b/i.test(lc);
  const negatedImperative = CR_NEGATED_IMPERATIVE_RE.test(clause.trim()) ||
    /^\s*(?:see to it that|siguraduhin|tiyakin|huwag|hold\b)/i.test(clause.trim());
  const relDeferral = CR_REL_DEFERRAL_RE.test(lc);
  // A day-pass or hold construction is ITSELF a calendar-relative anchor: "let the day
  // pass without filing" and "hold the return until tomorrow" are about the present day
  // even when no explicit "today" token appears (IR-U9).
  const temporalAnchor = hasRelative || relDeferral || nonperfDayPass || nonperfHold;

  // 3b. ACTION TARGET (P1-R14-IR-001). A directive whose complement is an epistemic or
  // preparatory verb does not direct the user to FILE, even when the clause mentions
  // filing. Filing must be independently directed for the clause to be a filing directive.
  const nonFilingTarget = CR_NONFILING_TARGET_RE.test(lc) || CR_NONFILING_IMPERATIVE_RE.test(clause.trim());
  const filingIndependentlyDirected =
    CR_IMPERATIVE_FILING_RE.test(clause.trim()) ||
    CR_PASSIVE_OBLIGATION_RE.test(lc) ||
    /\b(?:fail(?:s|ed|ing)? to|neglect(?:s|ed|ing)? to|forget(?:s|ting)? to|forgot to|refrain(?:s|ed|ing)? from|wait(?:s|ed|ing)? to)\s+(?:file|submit|lodge|transmit|complete the filing)\b/i.test(lc) ||
    /\b(?:must|should|shall|need to|needs to|have to|has to|cannot afford to|advise you to|advise you not to)\s+(?:not\s+)?(?:file|submit|lodge|transmit)\b/i.test(lc) ||
    nonperfState || nonperfDayPass || nonperfHold || nonperfFilipino;
  const actionTarget = nonFilingTarget && !filingIndependentlyDirected ? "NON_FILING_VERIFICATION" : "FILE_RETURN";

  // Quotation, safe epistemic negation and a non-filing action target are resolved BEFORE
  // polarity, so none of a quoted directive, "do not assume today is the deadline", or
  // "do not fail to verify whether filing is due today" can be reclassified as a filing
  // directive merely because it contains "do not" or the noun "filing".
  const scopeSuppressed = quotedScope || safeNegation || actionTarget === "NON_FILING_VERIFICATION";
  // Negated nonperformance == an affirmative filing directive.
  const nonperfDirective = !scopeSuppressed && nonperformancePredicate &&
    (outerNegation || negatedImperative || directiveForce || recommend);
  // Direct prohibition / deferral of filing is itself a present-user legal directive.
  const prohibitionDirective = !scopeSuppressed && !nonperformancePredicate &&
    outerNegation && hasFiling && (negatedImperative || directiveForce || recommend || imperative);

  // 5. effective action polarity.
  const effectiveActionPolarity =
    quotedScope ? "QUOTE_ACTION"
    : safeNegation ? (/\b(assume|conclude|presume|think)\b/i.test(lc) ? "NEGATE_DEADLINE_ASSERTION"
        : /\b(recommend|advis|suggest)\b/i.test(lc) ? "NEGATE_RECOMMENDATION"
        : "NEGATE_ACTION_REQUIREMENT")
    : yearHistorical || counterfactual ? "DESCRIBE_ACTION"
    : nonperformancePredicate && outerNegation ? "AVOID_NONPERFORMANCE"
    : nonperformancePredicate ? "PROHIBIT_ACTION"
    : outerNegation && hasFiling ? "PROHIBIT_ACTION"
    : hasFiling ? "PERFORM_ACTION"
    : "UNRESOLVED";

  let negationScope = quotedScope ? "QUOTED"
    : safeNegation ? "NEGATES_FILING_CONCLUSION"
    : nonperformancePredicate && outerNegation ? "NEGATES_NONPERFORMANCE"
    : outerNegation ? "NEGATES_ACTION"
    : delayNegation ? "NEGATES_DELAY" : "NONE";

  // 7-8. relative-time / current-user application.
  // PHASE-10A14-R15: hasFiling is satisfied either by an explicit filing token or by a
  // state/day-pass/hold/Filipino nonperformance surface that necessarily concerns filing
  // ("the return must not remain outstanding", "let today pass without filing").
  const filingConcerned = hasFiling || nonperfState || nonperfDayPass || nonperfHold || nonperfFilipino;
  const presentUserDirective = filingConcerned && temporalAnchor &&
    actionTarget === "FILE_RETURN" &&
    (directiveForce || recommend || passiveObligation || imperative || filipinoFiling ||
     penaltyPressure || nonperfDirective || prohibitionDirective ||
     CR_FIL_DIRECTIVE_RE.test(lc) || /\byes\b/i.test(lc));

  // 9. final unsafe determination.
  // An attributed ASSERTION is reported, not asserted by TINA. An attributed directive
  // is still TINA's directive and is unaffected here.
  const attributedAssertionOnly = attributionScope && affirm && !presentUserDirective;
  let unsafe = (affirm || presentUserDirective) && !(counterfactual || yearHistorical);
  if (attributedAssertionOnly) unsafe = false;
  if (quotedScope) unsafe = false;
  // A non-filing action target is never an unsupported filing directive.
  else if (actionTarget === "NON_FILING_VERIFICATION") unsafe = false;
  // Safe negation of the filing conclusion / deadline assertion / recommendation wins.
  else if (safeNegation && !delayNegation) unsafe = false;
  // Negated delay/postponement re-pressures acting now: keep/mark unsafe when filing+relative present.
  if (!quotedScope && delayNegation && hasFiling && hasRelative) { unsafe = true; negationScope = "NEGATES_DELAY"; }
  const relRef = relTom ? "TOMORROW" : relYest ? "YESTERDAY" : relToday ? "TODAY" : null;
  const speechAct = quotedScope ? "QUOTATION" : safeNegation ? "NEGATION" : affirm ? "ASSERTION"
    : recommend ? "RECOMMENDATION" : passiveObligation ? "OBLIGATION"
    : directiveForce ? "OBLIGATION" : penaltyPressure ? "PRESSURED_PERMISSION"
    : imperative || filipinoFiling || negatedImperative ? "IMPERATIVE"
    : counterfactual ? "COUNTERFACTUAL" : yearHistorical ? "HISTORICAL" : "NEUTRAL_INFORMATION";
  const actionFamily = !hasFiling ? "NON_FILING_ACTION"
    : /\bsubmit|submission|isumite|mag-?submit\b/i.test(lc) ? "SUBMIT_RETURN"
    : /\blodge/i.test(lc) ? "LODGE_RETURN" : /\btransmit\b/i.test(lc) ? "TRANSMIT_RETURN"
    : /\bcomplete the filing\b/i.test(lc) ? "COMPLETE_FILING" : "FILE_RETURN";
  return { clause, hasFiling, hasRelative, relRef, actionFamily, speechAct, negationScope,
    directiveForce, recommend, passiveObligation, imperative, penaltyPressure, affirm,
    counterfactual, historical: yearHistorical, safeNegation, delayNegation,
    directiveType: speechAct, unsafe,
    // PHASE-10A14-R14 (WS4) performance-polarity frame.
    nonperformancePredicate: nonperformancePredicate ? nonperformanceType : null,
    nonperformanceType, outerNegation, effectiveActionPolarity, quotedScope,
    relDeferral, nonperfDirective, prohibitionDirective,
    baseActionPolarity: "POSITIVE",
    currentUserApplication: presentUserDirective,
    unsafeCurrentDirective: unsafe };
}

/**
 * Detects an affirmed/directed calendar-relative filing-deadline conclusion via clause analysis.
 * @returns {{applicable:boolean, sufficient:boolean, reason:string, diagnostics?:object}}
 */
export function evaluateCalendarRelativeDeadline({ question = "", answer = "" } = {}) {
  const a = String(answer || "");
  const clauses = splitCalendarClauses(a).map(analyzeCalendarClause);
  const unsafeClause = clauses.find((c) => c.unsafe);
  // affirmative "yes ..." to a relative-deadline question (answer echoes no relative word itself)
  const q = String(question || "");
  const relativeDeadlineQuestion = /\b(today|tonight|tomorrow|yesterday|this day|right now|as of today|already late|still on time|time (?:remaining|left)|last day|due today|due tomorrow)\b/i.test(q) && /\b(fil(?:e|ing)|return|deadline|due)\b/i.test(q);
  const answerAffirmsYes = /(^|\n)\s*(#+\s*[^\n]*\n+)?\s*yes\b/i.test(a);
  const applicable = Boolean(unsafeClause) || (relativeDeadlineQuestion && answerAffirmsYes);
  if (!applicable) return { applicable: false, sufficient: true, reason: "" };
  return {
    applicable: true, sufficient: false,
    reason: "false_or_unresolved_calendar_relative_deadline",
    diagnostics: {
      unsafeClause: unsafeClause ? unsafeClause.clause.slice(0, 160) : null,
      relRef: unsafeClause ? unsafeClause.relRef : null,
      relativeDeadlineQuestion, answerAffirmsYes
    }
  };
}

// PHASE-10A14-R11 (WS6): derive the contextual temporal reference from the USER QUESTION so the
// replacement does not always say "today". Falls back to the detected clause reference.
const QCTX = [
  [/\byesterday\b|\bkahapon\b/i, "YESTERDAY"],
  [/\btomorrow\b|\bbukas\b/i, "TOMORROW"],
  [/\balready late\b|\bhuli (?:na|ka)\b|\bmissed the deadline\b/i, "ALREADY_LATE"],
  [/\bstill (?:on time|have time)\b|\btime (?:left|remaining)\b|\bmay oras\b/i, "STILL_ON_TIME"],
  [/\btoday\b|\bngayon\b|\btonight\b|\bright now\b/i, "TODAY"]
];
export function deriveCalendarContext(question = "", fallbackRef = null) {
  const q = String(question || "");
  for (const [re, label] of QCTX) if (re.test(q)) return label;
  if (fallbackRef === "TOMORROW") return "TOMORROW";
  if (fallbackRef === "YESTERDAY") return "YESTERDAY";
  if (fallbackRef === "TODAY") return "TODAY";
  return "UNSPECIFIED_RELATIVE_DIRECTIVE";
}

// PHASE-10A14-R10/R11 (P1-R9-IR-001 / P1-R10-IR-003 / WS6/WS7): dedicated deterministic
// replacement answer. Contextualized by the temporal reference (today/tomorrow/yesterday/
// already-late/still-on-time). States the general April-15 rule ONLY when a compatible Sec 51
// deadline authority is present; otherwise omits it and requests the missing filing facts.
const FILING_DEADLINE_AUTHORITY_RE = /\bsection\s*0*5(?:1(?:\s*-?\s*a)?|2)\b|\b51-?a\b|\bnirc\s*sec\.?\s*0*51\b/i;
const CR_CONTEXT_LEAD = {
  TODAY: "TINA cannot confirm that today is the operative filing deadline for your return based on the information provided.",
  TOMORROW: "TINA cannot confirm that tomorrow is the operative filing deadline for your return based on the information provided.",
  YESTERDAY: "TINA cannot confirm that your return was due yesterday based on the information provided.",
  ALREADY_LATE: "TINA cannot determine whether your filing is already late without the taxable year, return type and operative deadline.",
  STILL_ON_TIME: "TINA cannot confirm whether you are still on time to file without the taxable year, return type and operative deadline.",
  UNSPECIFIED_RELATIVE_DIRECTIVE: "TINA cannot confirm the operative filing deadline for your return, and cannot advise filing at a specific relative time, based on the information provided."
};
export function buildCalendarRelativeSafeAnswer(sources = [], question = "", fallbackRef = null) {
  const labels = (Array.isArray(sources) ? sources : [])
    .map((s) => (s && (s.displayLabel || s.label || s.citation || s.title || s.normalizedReference)) || "")
    .join(" | ");
  const hasDeadlineAuthority = FILING_DEADLINE_AUTHORITY_RE.test(labels);
  const ctx = deriveCalendarContext(question, fallbackRef);
  const lead = CR_CONTEXT_LEAD[ctx] || CR_CONTEXT_LEAD.UNSPECIFIED_RELATIVE_DIRECTIVE;
  const out = ["### Short Answer", lead, ""];
  if (hasDeadlineAuthority) {
    out.push("### What the general rule says",
      "The general deadline for an individual annual income-tax return is on or before April 15 following the taxable year (NIRC Sec. 51(C)), subject to any applicable BIR extension and any weekend or holiday adjustment.", "");
  }
  out.push("### What TINA needs to confirm your deadline",
    "Please confirm your taxable year, the return type, and any relevant BIR extension or special deadline notice so the operative deadline can be determined.");
  return out.join("\n");
}

// PHASE-10A14-R9 (P1-E1-002): filing-conclusion rationale alignment. A filing conclusion
// (required/not-required/exempt/substituted) must be decided by a filing rule (NIRC Sec.
// 51 / 51-A / 52 / 56 / a controlling amendment), NOT by a rate or income-threshold rule
// (Sec. 24 / "tax-exempt threshold" / "no tax due"). The presence of a Section 51 SOURCE
// CARD is insufficient where the answer's DECISIVE rationale (Short Answer + Controlling
// Authorities clause) remains Section 24 threshold reasoning.
const FILING_CONCLUSION_RE = /\b(not required to file|required to file|no need to file|exempt from filing|need not file|must file|obligated to file|not obligated to file|substituted filing (?:applies|is allowed)|qualified for substituted filing|no return (?:is )?required|do(?:es)? not (?:have to|need to) file)\b/i;
const THRESHOLD_RATIONALE_RE = /\bsection\s*0*24\b|\btax[- ]exempt\b|\bexempt from income tax\b|\bwithin the [^.\n]{0,30}threshold\b|\bbelow the [^.\n]{0,30}threshold\b|[₱P]\s*250,?000|\b250,?000\b|\b0%\s*(?:income\s*)?tax\s*rate\b|\bno (?:income )?tax (?:is )?due\b/i;
const FILING_RULE_RE = /\bsection\s*0*5(?:1(?:\s*-?\s*a)?|2|6)\b|\b51-?a\b|substituted filing under section|under section\s*0*51\b/i;

/** Decisive-rationale text = the answer up to (excluding) the Interpretation section. */
function extractDecisiveRationaleText(answer = "") {
  const a = String(answer || "");
  const cut = a.search(/#+\s*(interpretation|practical meaning|background|discussion)\b/i);
  return cut > 0 ? a.slice(0, cut) : a.slice(0, 700);
}

/**
 * Detects a filing conclusion whose DECISIVE rationale is a rate/threshold rule rather than
 * a filing rule. Pure. Fails closed regardless of a Section 51 source card being present.
 * @returns {{applicable:boolean, sufficient:boolean, reason:string, diagnostics?:object}}
 */
export function evaluateFilingRationaleAlignment({ question = "", answer = "" } = {}) {
  const a = String(answer || "");
  if (!FILING_CONCLUSION_RE.test(a)) return { applicable: false, sufficient: true, reason: "" };
  const decisive = extractDecisiveRationaleText(a);
  const thresholdDecisive = THRESHOLD_RATIONALE_RE.test(decisive);
  const filingRuleDecisive = FILING_RULE_RE.test(decisive);
  if (thresholdDecisive && !filingRuleDecisive) {
    return {
      applicable: true, sufficient: false,
      reason: "filing_conclusion_supported_only_by_rate_or_threshold_authority",
      diagnostics: { thresholdDecisive, filingRuleDecisive, decisive: decisive.replace(/\s+/g, " ").slice(0, 240) }
    };
  }
  return { applicable: true, sufficient: true, reason: "", diagnostics: { thresholdDecisive, filingRuleDecisive } };
}

/**
 * Evaluates whether an answer is eligible for VERIFIED_CONTROLLING. Never throws;
 * any error/unavailability yields verifiedEligible=false (fail closed).
 *
 * @param {object} params
 * @param {string} params.question
 * @param {string} params.answer
 * @param {Array}  [params.sources]
 * @param {string} [params.model]
 * @param {object} [params.client] - injectable OpenAI-like client for tests
 * @returns {Promise<{verifiedEligible:boolean, stage:string, gates:object, reason:string}>}
 */
export async function evaluateAnswerSupport({ question, answer, sources = [], model, client } = {}) {
  // PHASE-10A12: deterministic treatment-contradiction guard runs FIRST and
  // overrides any LLM approval -- a known legal-treatment reversal can never
  // reach VERIFIED_CONTROLLING.
  const contradiction = detectTreatmentContradiction(question, answer);
  if (contradiction.contradiction) {
    return { verifiedEligible: false, schemaValid: false, stage: "treatment-contradiction", gates: { structural: true, treatmentDirectionMatches: false }, reason: contradiction.reason };
  }
  const exemptionOmission = detectImportVatExemptionOmission(question, answer);
  if (exemptionOmission.contradiction) {
    return { verifiedEligible: false, schemaValid: false, stage: "material-exception-omission", gates: { structural: true, materialExceptionsCovered: false }, reason: exemptionOmission.reason };
  }
  // PHASE-10A14-R9/R10 (P1-E1-001 / P1-R9-IR-001): an affirmed calendar-relative filing-
  // deadline conclusion cannot verify (temporal sufficiency not establishable). Evaluated
  // EARLY — before proposition-source-sufficiency — so ANY affirmed today/last-day/due-today
  // conclusion resolves to the calendar-relative-deadline stage (R10: the "due today"
  // variants previously returned proposition-source-sufficiency first and were never routed
  // to the public-answer replacement). Deterministic; non-overridable by the model validator.
  const calendarRelative = evaluateCalendarRelativeDeadline({ question, answer });
  if (calendarRelative.applicable && !calendarRelative.sufficient) {
    return { verifiedEligible: false, schemaValid: false, stage: "calendar-relative-deadline",
      gates: { structural: true, calendarRelativeResolved: false }, reason: calendarRelative.reason,
      calendarRelative: calendarRelative.diagnostics };
  }
  // PHASE-10A12-R3: Q5 source-sufficiency gate. An incentive treatment
  // (exemption / zero-rating) granted on generic VAT authority alone, without a
  // specific incentive authority (RA 12066 / CREATE MORE / equivalent), fails
  // closed regardless of LLM approval (the confirmed A12-R2 P1-1 defect).
  const incentiveSufficiency = evaluateImportVatIncentiveSourceSufficiency({ question, answer, sources });
  if (incentiveSufficiency.applicable && !incentiveSufficiency.sufficient) {
    return {
      verifiedEligible: false,
      schemaValid: false,
      stage: "incentive-source-sufficiency",
      gates: {
        structural: true,
        specificIncentiveAuthorityPresent: incentiveSufficiency.diagnostics.specificIncentiveAuthorityPresent,
        exemptionBasisSupported: incentiveSufficiency.diagnostics.exemptionBasisSupported,
        zeroRatingBasisSupported: incentiveSufficiency.diagnostics.zeroRatingBasisSupported,
        incentiveConditionSupported: incentiveSufficiency.diagnostics.incentiveConditionSupported,
        genericAuthorityOnly: incentiveSufficiency.diagnostics.genericAuthorityOnly
      },
      incentiveSufficiency: incentiveSufficiency.diagnostics,
      reason: incentiveSufficiency.reason
    };
  }
  // PHASE-10A12-R6: general proposition-specific source-sufficiency control. A
  // penalty/procedural computation or an EWT conclusion may not verify on
  // topic-adjacent-but-non-controlling authority (the confirmed R5 M-Q36 / M-Q25
  // class-level laundering defect). Fails closed regardless of LLM approval.
  const propositionSufficiency = evaluatePropositionSourceSufficiency({ question, answer, sources });
  if (propositionSufficiency.applicable && !propositionSufficiency.sufficient) {
    return {
      verifiedEligible: false,
      schemaValid: false,
      stage: "proposition-source-sufficiency",
      gates: {
        structural: true,
        penaltyProposition: propositionSufficiency.diagnostics.penaltyProposition,
        ewtProposition: propositionSufficiency.diagnostics.ewtProposition,
        hasPenaltyAuthority: propositionSufficiency.diagnostics.hasPenaltyAuthority,
        hasWithholdingAuthority: propositionSufficiency.diagnostics.hasWithholdingAuthority
      },
      propositionClass: propositionSufficiency.propositionClass,
      propositionSufficiency: propositionSufficiency.diagnostics,
      reason: propositionSufficiency.reason
    };
  }
  // PHASE-10A14-R9 (P1-E1-002): filing conclusion whose decisive rationale is a rate/
  // threshold rule (Sec 24) rather than a filing rule fails closed even if a Section 51
  // source card is present. Deterministic; non-overridable.
  const filingRationale = evaluateFilingRationaleAlignment({ question, answer });
  if (filingRationale.applicable && !filingRationale.sufficient) {
    return { verifiedEligible: false, schemaValid: false, stage: "filing-rationale-alignment",
      gates: { structural: true, filingAuthorityRationaleAligned: false }, reason: filingRationale.reason,
      filingRationale: filingRationale.diagnostics };
  }
  if (detectOutcomePredictionRequest(question)) {
    return { verifiedEligible: false, schemaValid: false, stage: "outcome-prediction", gates: { structural: true }, reason: "outcome_prediction_request_cannot_be_verified" };
  }
  const structural = structuralSupportGate(answer);
  if (!structural.pass) {
    return {
      verifiedEligible: false,
      schemaValid: false,
      stage: "structural",
      gates: { structural: false },
      reason: structural.reason
    };
  }

  // PHASE-10A10: deterministic citation-relevance pre-gate. If every displayed
  // authority is only a foundational/jurisdictional NIRC provision (Secs 1-6),
  // it cannot support a specific rate/form/penalty proposition -> fail closed.
  if (citesOnlyFoundationalProvisions(sources)) {
    return {
      verifiedEligible: false,
      schemaValid: false,
      stage: "citation-relevance",
      gates: { structural: true, citationRelevant: false },
      reason: "displayed_sources_only_foundational_provisions"
    };
  }

  const oai = client || getClient();
  if (!oai) {
    return { verifiedEligible: false, schemaValid: false, stage: "unavailable", gates: { structural: true }, reason: "validator_unavailable_fail_closed" };
  }

  const usedModel = model || process.env.ANSWER_SUPPORT_VALIDATOR_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const call = oai.chat.completions.create({
      model: usedModel,
      temperature: 0,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VALIDATOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: `QUESTION:\n${question || ""}\n\nSOURCE CITATIONS:\n${sourceCitations(sources)}\n\nANSWER:\n${answer || ""}`
        }
      ]
    });
    const resp = await Promise.race([
      call,
      new Promise((_, rej) => setTimeout(() => rej(new Error("validator_timeout")), VALIDATOR_TIMEOUT_MS))
    ]);
    const raw = resp?.choices?.[0]?.message?.content || "{}";
    const v = JSON.parse(raw);
    // PHASE-10A10-R1: strict fail-closed schema validation. Every mandatory
    // safety field must be an OWN, boolean-typed property with the correct
    // (safe) value. An absent, undefined, null, wrong-type, or inherited field
    // fails closed -- no default-true, no inference from other fields, no
    // legacy compatibility path. eligibleForVerifiedControlling===true is
    // necessary but not sufficient.
    const schema = validateVerdictSchema(v);
    return {
      verifiedEligible: schema.verifiedEligible,
      stage: "llm",
      schemaValid: schema.schemaValid,
      missingFields: schema.missingFields,
      invalidTypeFields: schema.invalidTypeFields,
      invalidValueFields: schema.invalidValueFields,
      inheritedFieldsRejected: schema.inheritedFieldsRejected,
      failureReasons: schema.failureReasons,
      gates: schema.gates,
      reason: schema.verifiedEligible ? String(v.reason || "").slice(0, 200) : (schema.failureReasons[0] || "schema_fail_closed")
    };
  } catch (err) {
    return { verifiedEligible: false, schemaValid: false, stage: "error", gates: { structural: true }, reason: "validator_error_fail_closed" };
  }
}

export default {
  extractSubstance,
  structuralSupportGate,
  citesOnlyFoundationalProvisions,
  validateVerdictSchema,
  evaluateImportVatIncentiveSourceSufficiency,
  evaluatePropositionSourceSufficiency,
  evaluateAnswerSupport,
  REQUIRED_POSITIVE_BOOLEANS,
  REQUIRED_NEGATIVE_BOOLEANS
};
