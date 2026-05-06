// FILE: tax-classifier.js

import OpenAI from "openai";
import { isTaxRelated as keywordTaxCheck } from "./tax-keywords.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function detectDirectTaxTopic(question = "") {
  const q = lower(question);

  if (!q) {
    return {
      taxRelated: false,
      confidence: "low",
      topic: "empty_question",
      reason: "No question provided"
    };
  }

  if (
    /\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(q) ||
    q.includes("supreme court") ||
    q.includes("cta en banc") ||
    q.includes("cta division") ||
    q.includes("court of appeals") ||
    q.includes("court of tax appeals") ||
    q.includes("case doctrine")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "case_analysis",
      reason: "Question refers to tax jurisprudence or court doctrine"
    };
  }

  if (
    q.includes("section ") ||
    q.includes("sec. ") ||
    q.includes("sec ") ||
    q.includes("article ") ||
    q.includes("art. ") ||
    q.includes("art ")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "provision_citation",
      reason: "Question asks about a tax provision or legal citation"
    };
  }

  if (
    /\b(rr|rmc|rmo|ramo)\s+\d{1,3}-\d{2,4}\b/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order") ||
    q.includes("revenue audit memorandum order") ||
    q.includes("bir ruling")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "issuance",
      reason: "Question refers to a Philippine tax issuance or BIR ruling"
    };
  }

  if (
    /\bra\s+\d{4,6}\b/i.test(q) ||
    q.includes("create law") ||
    q.includes("train law") ||
    q.includes("eopt") ||
    q.includes("ease of paying taxes") ||
    q.includes("create more") ||
    q.includes("nirc") ||
    q.includes("tax code")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "named_law",
      reason: "Question refers to a Philippine tax statute or named tax law"
    };
  }

  if (q.includes("vat") || q.includes("value-added tax") || q.includes("value added tax")) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "vat",
      reason: "Question involves VAT"
    };
  }

  if (
    q.includes("withholding tax") ||
    q.includes("expanded withholding") ||
    q.includes("ewt") ||
    q.includes("cwt") ||
    q.includes("2307")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "withholding_tax",
      reason: "Question involves withholding tax"
    };
  }

  if (
    q.includes("income tax") ||
    q.includes("rcit") ||
    q.includes("mcit") ||
    q.includes("nolco") ||
    q.includes("deductible expense") ||
    q.includes("allowable deduction")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "income_tax",
      reason: "Question involves income tax rules"
    };
  }

  if (
    q.includes("transfer pricing") ||
    q.includes("related party transaction") ||
    q.includes("rpt") ||
    q.includes("benchmarking")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "transfer_pricing",
      reason: "Question involves transfer pricing or related-party tax implications"
    };
  }

  if (
    q.includes("tax treaty") ||
    q.includes("double tax agreement") ||
    q.includes("dta") ||
    q.includes("permanent establishment")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "tax_treaty",
      reason: "Question involves international tax or treaty issues"
    };
  }

  if (
    q.includes("assessment") ||
    q.includes("fan") ||
    q.includes("pan") ||
    q.includes("loa") ||
    q.includes("refund") ||
    q.includes("protest") ||
    q.includes("prescriptive period")
  ) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "tax_remedies",
      reason: "Question involves tax enforcement, remedies, or assessments"
    };
  }

  return null;
}

function safeJsonParse(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function classifyTaxQuestion(question) {
  const cleanQuestion = normalizeText(question);

  if (!cleanQuestion) {
    return {
      taxRelated: false,
      confidence: "low",
      topic: "empty_question",
      reason: "No question provided"
    };
  }

  const directTopic = detectDirectTaxTopic(cleanQuestion);
  if (directTopic) {
    return directTopic;
  }

  if (keywordTaxCheck(cleanQuestion)) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "keyword_matched",
      reason: "Matched Philippine tax keyword database"
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You classify whether a user question is related to Philippine taxation.

Return ONLY valid JSON.

A question is tax-related if it involves:
- BIR compliance
- Philippine tax rules
- VAT
- income tax
- withholding tax
- percentage tax
- documentary stamp tax
- local business tax
- transfer pricing
- related party transactions with tax implications
- tax treaty
- PEZA/BOI/FIRB incentives
- tax assessments
- tax audit
- tax refunds
- invoicing requirements
- filing deadlines
- BIR forms
- NIRC
- Revenue Regulations, RMCs, RMOs, RAMOs, BIR rulings
- Philippine court tax cases
- CREATE, TRAIN, EOPT, CREATE MORE
- tax accounting or tax disclosure matters

Non-tax examples:
- love advice
- sports
- general accounting with no tax angle
- programming
- weather
- politics with no tax issue

Use one of these topic values when possible:
"named_law"
"issuance"
"case_analysis"
"provision_citation"
"vat"
"withholding_tax"
"income_tax"
"percentage_tax"
"dst"
"local_tax"
"transfer_pricing"
"tax_treaty"
"tax_remedies"
"general_tax"
"non_tax"

JSON format:
{
  "taxRelated": true,
  "confidence": "high",
  "topic": "transfer_pricing",
  "reason": "Question involves intercompany pricing with Philippine tax implications"
}
          `.trim()
        },
        {
          role: "user",
          content: cleanQuestion
        }
      ]
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeJsonParse(raw);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Classifier returned invalid JSON");
    }

    return {
      taxRelated: Boolean(parsed.taxRelated),
      confidence:
        parsed.confidence === "high" ||
        parsed.confidence === "medium" ||
        parsed.confidence === "low"
          ? parsed.confidence
          : "medium",
      topic: parsed.topic || (parsed.taxRelated ? "general_tax" : "non_tax"),
      reason: parsed.reason || ""
    };
  } catch (error) {
    console.error("Tax classifier error:", error);

    return {
      taxRelated: keywordTaxCheck(cleanQuestion),
      confidence: keywordTaxCheck(cleanQuestion) ? "medium" : "low",
      topic: keywordTaxCheck(cleanQuestion) ? "general_tax" : "classification_error",
      reason: keywordTaxCheck(cleanQuestion)
        ? "Fallback keyword-based classification used after classifier error"
        : "Could not classify the question"
    };
  }
}

export default {
  classifyTaxQuestion
};
