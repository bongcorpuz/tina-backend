// FILE: tax-engines/LGT/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "LOCAL_BUSINESS_TAX", "REAL_PROPERTY_TAX", "RPT_EXEMPTION",
  "SPECIAL_LEVY", "LGU_FEES_CHARGES", "LGU_ORDINANCE_VALIDITY",
  "LGU_PROTEST", "RPT_ASSESSMENT", "RPT_IDLE_LAND"
]);

const SYSTEM_PROMPT = `You are TINA's LGT Sub-Classifier for Philippine Local Government Taxes.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific LGT sub-issue:
LOCAL_BUSINESS_TAX | REAL_PROPERTY_TAX | RPT_EXEMPTION | SPECIAL_LEVY |
LGU_FEES_CHARGES | LGU_ORDINANCE_VALIDITY | LGU_PROTEST | RPT_ASSESSMENT | RPT_IDLE_LAND

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["Local Government Code sections directly on point — e.g. Sec. 143, 151, 197-232, 246"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Applicable LGU ordinance"],
    "tier5": ["BLGF issuances directly on point"]
  },
  "keyTerms": ["key local tax terms from the query"],
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
    subIssue:    raw.subIssue    || "LOCAL_BUSINESS_TAX",
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
