// FILE: tax-engines/SPC/subclassifier.js
"use strict";

export const VERSION = "1.0.0";

export const SUB_ISSUES = Object.freeze([
  "PEZA_REGISTRATION", "ITH_INCENTIVE", "SCIT_RATE",
  "CREATE_ACT_INCENTIVES", "FREEPORT_ZONE", "FIRB_APPROVAL",
  "TRANSFER_PRICING", "TP_DOCUMENTATION", "RELATED_PARTY_TRANSACTIONS"
]);

const SYSTEM_PROMPT = `You are TINA's SPC Sub-Classifier for Philippine Special Regimes and Transfer Pricing.
Return ONLY valid JSON. No prose. No markdown.

Classify the question into the most specific SPC sub-issue:
PEZA_REGISTRATION | ITH_INCENTIVE | SCIT_RATE | CREATE_ACT_INCENTIVES |
FREEPORT_ZONE | FIRB_APPROVAL | TRANSFER_PRICING | TP_DOCUMENTATION | RELATED_PARTY_TRANSACTIONS

{
  "subIssue": "one of the values above",
  "queryIntent": "definition|compliance|dispute|planning|advisory|audit|refund|characterization|multi_issue",
  "targetAuthorities": {
    "tier1": ["CREATE Act, NIRC incentive provisions, PEZA law, RA 7227 (Bases Conversion)"],
    "tier2": ["applicable tax treaty transfer pricing articles"],
    "tier3": ["Supreme Court / CTA cases directly on point"],
    "tier4": ["RR 2-2013 (transfer pricing), FIRB issuances"],
    "tier5": ["RMC/BIR Rulings on PEZA / CREATE / TP directly on point"]
  },
  "keyTerms": ["key special regime / transfer pricing terms from the query"],
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
    subIssue:    raw.subIssue    || "CREATE_ACT_INCENTIVES",
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
