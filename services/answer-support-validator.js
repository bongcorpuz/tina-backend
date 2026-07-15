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

Return ONLY JSON:
{
  "operativeClaim": "the single key claim you checked",
  "identifiedError": "a SPECIFIC error you are confident about, or empty string if none",
  "responsive": true|false,
  "substantive": true|false,
  "propositionSupported": true|false,
  "materiallyComplete": true|false,
  "contradictsSources": true|false,
  "hasUnsupportedProposition": true|false,
  "reason": "one short sentence"
}

Calibration rules (important):
- Set propositionSupported=false ONLY when you can name a SPECIFIC, confident error in "identifiedError" (a reversed treatment, an invented exemption, a clearly wrong filing rule, an obsolete threshold, or a numeric rate that clearly conflicts with well-known standard Philippine rates).
- Do NOT flag merely because you are UNSURE whether a rate/threshold was recently updated. If the stated rate/threshold matches standard well-known Philippine tax values (e.g. 6% estate/donor's tax, 20% final tax on interest/royalties, April 15 ITR deadline, ₱3M VAT threshold, 12% VAT), treat it as supported.
- When "identifiedError" is empty, set propositionSupported=true and hasUnsupportedProposition=false.
Output JSON only.`;

function sourceCitations(sources) {
  if (!Array.isArray(sources)) return "(none)";
  const items = sources
    .map((s) => (s && (s.label || s.citation || s.title || s.displayLabel)) || "")
    .filter(Boolean)
    .slice(0, 12);
  return items.length ? items.join("; ") : "(none)";
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
  const structural = structuralSupportGate(answer);
  if (!structural.pass) {
    return {
      verifiedEligible: false,
      stage: "structural",
      gates: { structural: false },
      reason: structural.reason
    };
  }

  const oai = client || getClient();
  if (!oai) {
    return { verifiedEligible: false, stage: "unavailable", gates: { structural: true }, reason: "validator_unavailable_fail_closed" };
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
    const gates = {
      structural: true,
      responsive: v.responsive === true,
      substantive: v.substantive === true,
      propositionSupported: v.propositionSupported === true,
      materiallyComplete: v.materiallyComplete === true,
      noContradiction: v.contradictsSources === false,
      noUnsupportedProposition: v.hasUnsupportedProposition === false
    };
    const verifiedEligible = Object.values(gates).every(Boolean);
    return { verifiedEligible, stage: "llm", gates, reason: String(v.reason || "").slice(0, 200) };
  } catch (err) {
    return { verifiedEligible: false, stage: "error", gates: { structural: true }, reason: "validator_error_fail_closed" };
  }
}

export default { extractSubstance, structuralSupportGate, evaluateAnswerSupport };
