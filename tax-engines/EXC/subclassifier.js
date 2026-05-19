// FILE: tax-engines/EXC/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "EXCISE_TOBACCO", "EXCISE_ALCOHOL", "EXCISE_PETROLEUM",
  "EXCISE_MINERALS", "EXCISE_AUTOMOBILES", "EXCISE_SWEETENED_BEVERAGES",
  "EXCISE_COSMETIC", "EXCISE_HEATED_TOBACCO", "EXCISE_MARKING"
]);

const SYSTEM_PROMPT = `You are TINA's EXC Sub-Classifier for Philippine Excise Tax.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific EXC sub-issue:
EXCISE_TOBACCO | EXCISE_ALCOHOL | EXCISE_PETROLEUM | EXCISE_MINERALS |
EXCISE_AUTOMOBILES | EXCISE_SWEETENED_BEVERAGES | EXCISE_COSMETIC |
EXCISE_HEATED_TOBACCO | EXCISE_MARKING

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC Title VI sections directly on point — e.g. Sec. 129, 130, 141-150, 151"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Revenue Regulations directly on point — e.g. RR 3-2006, RR 17-2012"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key excise tax terms from the query"],
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
    subIssue:    raw.subIssue    || "EXCISE_TOBACCO",
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
