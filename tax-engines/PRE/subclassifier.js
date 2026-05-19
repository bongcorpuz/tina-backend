// FILE: tax-engines/PRE/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "PRESCRIPTION_3YR", "PRESCRIPTION_10YR", "LOA_VALIDITY",
  "PAN_DUE_PROCESS", "FAN_FLD", "FDDA",
  "WAIVER_PRESCRIPTION", "TAX_ASSESSMENT_VALIDITY", "ASSESSMENT_PROTEST"
]);

const SYSTEM_PROMPT = `You are TINA's PRE Sub-Classifier for Philippine Tax Assessment and Prescription.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific PRE sub-issue:
PRESCRIPTION_3YR | PRESCRIPTION_10YR | LOA_VALIDITY | PAN_DUE_PROCESS |
FAN_FLD | FDDA | WAIVER_PRESCRIPTION | TAX_ASSESSMENT_VALIDITY | ASSESSMENT_PROTEST

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC sections directly on point — e.g. Sec. 203, 222, 228"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point — e.g. CIR v. Metro Star, CIR v. Enron"],
    "tier4": ["Revenue Regulations directly on point — e.g. RR 18-2013"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key assessment/prescription terms from the query"],
  "complexityFlag": "simple|moderate|complex|multi_issue",
  "transactionCharacterizationRequired": false,
  "factPatternRequired": true
}`;

export function buildMessages(question = "") {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: String(question || "").trim() }
  ];
}

export function parseResponse(raw = {}) {
  return {
    subIssue:    raw.subIssue    || "TAX_ASSESSMENT_VALIDITY",
    queryIntent: raw.queryIntent || "dispute",
    targetAuthorities: {
      tier1: Array.isArray(raw.targetAuthorities?.tier1) ? raw.targetAuthorities.tier1 : [],
      tier2: Array.isArray(raw.targetAuthorities?.tier2) ? raw.targetAuthorities.tier2 : [],
      tier3: Array.isArray(raw.targetAuthorities?.tier3) ? raw.targetAuthorities.tier3 : [],
      tier4: Array.isArray(raw.targetAuthorities?.tier4) ? raw.targetAuthorities.tier4 : [],
      tier5: Array.isArray(raw.targetAuthorities?.tier5) ? raw.targetAuthorities.tier5 : []
    },
    keyTerms:    Array.isArray(raw.keyTerms) ? raw.keyTerms : [],
    complexityFlag: raw.complexityFlag || "complex",
    transactionCharacterizationRequired: Boolean(raw.transactionCharacterizationRequired),
    factPatternRequired: raw.factPatternRequired !== false
  };
}

export async function classifySubIssue(question = "", openai = null) {
  if (!openai || !question) {
    return { success: false, error: "Requires openai client and question.", result: null };
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: buildMessages(question),
      response_format: { type: "json_object" },
      temperature: 0
    });
    const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
    return { success: true, result: parseResponse(raw) };
  } catch (err) {
    return { success: false, error: err.message, result: null };
  }
}
