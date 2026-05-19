// FILE: tax-engines/VAT/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "VAT_LIABILITY", "OUTPUT_TAX", "INPUT_TAX", "ZERO_RATING",
  "VAT_EXEMPTION", "VAT_REFUND", "WVAT", "VAT_REGISTRATION",
  "VAT_INVOICE_RECEIPT", "VAT_OVERPAYMENT"
]);

const SYSTEM_PROMPT = `You are TINA's VAT Sub-Classifier for Philippine Value-Added Tax.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific VAT sub-issue:
VAT_LIABILITY | OUTPUT_TAX | INPUT_TAX | ZERO_RATING | VAT_EXEMPTION |
VAT_REFUND | WVAT | VAT_REGISTRATION | VAT_INVOICE_RECEIPT | VAT_OVERPAYMENT

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["NIRC sections directly on point — e.g. Sec. 105, 106, 108, 109, 110, 112"],
    "tier2": [],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["Revenue Regulations — e.g. RR 16-2005, RR 13-2018"],
    "tier5": ["RMC/RMO/BIR Rulings directly on point"]
  },
  "keyTerms": ["key VAT terms from the query"],
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
    subIssue:    raw.subIssue    || "VAT_LIABILITY",
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
