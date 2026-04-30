import OpenAI from "openai";
import { isTaxRelated as keywordTaxCheck } from "./tax-keywords.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function classifyTaxQuestion(question) {
  if (!question || question.trim().length === 0) {
    return {
      taxRelated: false,
      confidence: "low",
      topic: "empty_question",
      reason: "No question provided"
    };
  }

  // Fast local keyword check first
  if (keywordTaxCheck(question)) {
    return {
      taxRelated: true,
      confidence: "high",
      topic: "keyword_matched",
      reason: "Matched Philippine tax keyword database"
    };
  }

  // AI classifier for indirect tax questions
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
- Revenue Regulations, RMCs, RMOs, BIR rulings
- tax accounting or tax disclosure matters

Non-tax examples:
- love advice
- sports
- general accounting with no tax angle
- programming
- weather
- politics with no tax issue

JSON format:
{
  "taxRelated": true,
  "confidence": "high",
  "topic": "transfer_pricing",
  "reason": "Question involves intercompany pricing with Philippine tax implications"
}
          `
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    const raw = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    return {
      taxRelated: Boolean(parsed.taxRelated),
      confidence: parsed.confidence || "medium",
      topic: parsed.topic || "general_tax",
      reason: parsed.reason || ""
    };
  } catch (error) {
    console.error("Tax classifier error:", error);

    return {
      taxRelated: false,
      confidence: "low",
      topic: "classification_error",
      reason: "Could not classify the question"
    };
  }
}
