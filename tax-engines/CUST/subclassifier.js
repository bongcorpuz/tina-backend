// FILE: tax-engines/CUST/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "CUSTOMS_VALUATION", "TARIFF_CLASSIFICATION", "IMPORT_DUTIES",
  "CUSTOMS_PENALTIES", "BOC_PROTEST", "CUSTOMS_SURETY",
  "WTO_VALUATION", "CUSTOMS_REFUND", "ANTI_DUMPING"
]);

const SYSTEM_PROMPT = `You are TINA's CUS Sub-Classifier for Philippine Customs Duties and Tariff.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific CUS sub-issue:
CUSTOMS_VALUATION | TARIFF_CLASSIFICATION | IMPORT_DUTIES | CUSTOMS_PENALTIES |
BOC_PROTEST | CUSTOMS_SURETY | WTO_VALUATION | CUSTOMS_REFUND | ANTI_DUMPING

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["CMTA sections directly on point, WTO Customs Valuation Agreement"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["BOC Customs Administrative Orders / CAOs directly on point"],
    "tier5": ["BOC CMOs directly on point"]
  },
  "keyTerms": ["key customs terms from the query"],
  "complexityFlag": "simple|moderate|complex|multi_issue",
  "transactionCharacterizationRequired": true,
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
    subIssue:    raw.subIssue    || "IMPORT_DUTIES",
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
    transactionCharacterizationRequired: raw.transactionCharacterizationRequired !== false,
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
