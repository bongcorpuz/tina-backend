// FILE: tax-engines/EST/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "ESTATE_TAX_RATE", "GROSS_ESTATE", "ESTATE_DEDUCTIONS",
  "ESTATE_RETURNS_DEADLINE", "ESTATE_AMNESTY",
  "DONORS_TAX_RATE", "TAXABLE_GIFTS", "DONORS_EXEMPTIONS", "DONORS_RETURNS"
]);

const SYSTEM_PROMPT = `You are TINA's EST Sub-Classifier for Philippine Estate Tax and Donor's Tax.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific EST sub-issue:
ESTATE_TAX_RATE | GROSS_ESTATE | ESTATE_DEDUCTIONS | ESTATE_RETURNS_DEADLINE |
ESTATE_AMNESTY | DONORS_TAX_RATE | TAXABLE_GIFTS | DONORS_EXEMPTIONS | DONORS_RETURNS

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC sections directly on point — e.g. Sec. 84-97 (estate), Sec. 98-104 (donors), TRAIN Law"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Revenue Regulations directly on point — e.g. RR 12-2018, RR 6-2019"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key estate/donors tax terms from the query"],
  "complexityFlag": "simple|moderate|complex|multi_issue",
  "transactionCharacterizationRequired": false,
  "factPatternRequired": false
}`;

export function buildMessages(question = "") {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: String(question || "").trim() }
  ];
}

export function parseResponse(raw = {}) {
  return {
    subIssue:    raw.subIssue    || "ESTATE_TAX_RATE",
    queryIntent: raw.queryIntent || "advisory",
    targetAuthorities: {
      tier1: Array.isArray(raw.targetAuthorities?.tier1) ? raw.targetAuthorities.tier1 : [],
      tier2: Array.isArray(raw.targetAuthorities?.tier2) ? raw.targetAuthorities.tier2 : [],
      tier3: Array.isArray(raw.targetAuthorities?.tier3) ? raw.targetAuthorities.tier3 : [],
      tier4: Array.isArray(raw.targetAuthorities?.tier4) ? raw.targetAuthorities.tier4 : [],
      tier5: Array.isArray(raw.targetAuthorities?.tier5) ? raw.targetAuthorities.tier5 : []
    },
    keyTerms:    Array.isArray(raw.keyTerms) ? raw.keyTerms : [],
    complexityFlag: raw.complexityFlag || "moderate",
    transactionCharacterizationRequired: Boolean(raw.transactionCharacterizationRequired),
    factPatternRequired: Boolean(raw.factPatternRequired)
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
