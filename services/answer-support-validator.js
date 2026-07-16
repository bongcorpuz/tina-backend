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
  evaluateAnswerSupport,
  REQUIRED_POSITIVE_BOOLEANS,
  REQUIRED_NEGATIVE_BOOLEANS
};
