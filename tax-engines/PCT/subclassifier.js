// FILE: tax-engines/PCT/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "PCT_SEC116_GENERAL", "PCT_SEC117_TRANSPORT", "PCT_SEC118_FRANCHISE",
  "PCT_SEC119_UTILITIES", "PCT_SEC120_OVERSEAS", "PCT_SEC121_BANKS",
  "PCT_SEC122_FINANCE", "PCT_QUARTERLY_FILING", "OPT_ELECTION"
]);

const SYSTEM_PROMPT = `You are TINA's PCT Sub-Classifier for Philippine Percentage Tax.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific PCT sub-issue:
PCT_SEC116_GENERAL | PCT_SEC117_TRANSPORT | PCT_SEC118_FRANCHISE |
PCT_SEC119_UTILITIES | PCT_SEC120_OVERSEAS | PCT_SEC121_BANKS |
PCT_SEC122_FINANCE | PCT_QUARTERLY_FILING | OPT_ELECTION

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC sections directly on point — e.g. Sec. 116, 117, 118, 119, 120, 121, 122"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Revenue Regulations directly on point"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key percentage tax terms from the query"],
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
    subIssue:    raw.subIssue    || "PCT_SEC116_GENERAL",
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
