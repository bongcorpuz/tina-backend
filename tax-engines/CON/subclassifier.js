// FILE: tax-engines/CON/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "TAX_EXEMPTION_GRANT", "STRICT_INTERPRETATION_EXEMPTION",
  "UNIFORMITY_AND_EQUITY", "DUE_PROCESS_ASSESSMENT",
  "EQUAL_PROTECTION", "DOUBLE_TAXATION",
  "NON_IMPAIRMENT_CLAUSE", "POWER_TO_TAX_GENERAL"
]);

const SYSTEM_PROMPT = `You are TINA's CON Sub-Classifier for Philippine Constitutional Tax Issues.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific CON sub-issue:
TAX_EXEMPTION_GRANT | STRICT_INTERPRETATION_EXEMPTION | UNIFORMITY_AND_EQUITY |
DUE_PROCESS_ASSESSMENT | EQUAL_PROTECTION | DOUBLE_TAXATION |
NON_IMPAIRMENT_CLAUSE | POWER_TO_TAX_GENERAL

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["1987 Philippine Constitution provisions directly on point — Art. VI Sec. 28, Art. III Sec. 1"],
    "tier2": [],
    "tier3": ["Supreme Court constitutional tax cases directly on point"],
    "tier4": [],
    "tier5": []
  },
  "keyTerms": ["key constitutional tax terms from the query"],
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
    subIssue:    raw.subIssue    || "POWER_TO_TAX_GENERAL",
    queryIntent: raw.queryIntent || "advisory",
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
