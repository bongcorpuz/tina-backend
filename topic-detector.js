import { getLastTopicState } from "./memory-hooks.js";

/* =========================================================
   TINA TOPIC DETECTOR
   Purpose:
   - Detect tax topic
   - Detect follow-up questions
   - Resolve short/incomplete questions using prior topic state
========================================================= */

const FOLLOW_UP_TRIGGERS = [
  "how about",
  "what about",
  "also",
  "then",
  "so",
  "same",
  "this",
  "that",
  "it",
  "they",
  "therefore",
  "what if",
  "is it",
  "can it",
  "does it",
  "do we",
  "can we",
  "how will",
  "how does",
  "what happens",
  "is this",
  "is that"
];

const TAX_TOPIC_RULES = [
  {
    topic: "VAT",
    taxType: "VAT",
    keywords: [
      "vat",
      "input vat",
      "output vat",
      "zero-rated",
      "zero rated",
      "vat exempt",
      "vat exemption",
      "sale of goods",
      "sale of services",
      "invoice",
      "official receipt",
      "or",
      "sales invoice",
      "2307 vat",
      "rr 16-2005",
      "rr 4-2024",
      "rr 7-2024",
      "slsp",
      "2550q"
    ]
  },
  {
    topic: "Expanded Withholding Tax",
    taxType: "EWT",
    keywords: [
      "ewt",
      "expanded withholding",
      "withholding tax",
      "2307",
      "1601eq",
      "1604e",
      "qap",
      "sawt",
      "rr 2-98",
      "withheld",
      "withhold"
    ]
  },
  {
    topic: "Income Tax",
    taxType: "Income Tax",
    keywords: [
      "income tax",
      "rcit",
      "mcit",
      "nolco",
      "1702",
      "1702rt",
      "1702mx",
      "create law",
      "taxable income",
      "deductible expense",
      "deduction",
      "allowable deduction"
    ]
  },
  {
    topic: "Percentage Tax",
    taxType: "Percentage Tax",
    keywords: [
      "percentage tax",
      "2551q",
      "non-vat",
      "non vat",
      "3%",
      "three percent"
    ]
  },
  {
    topic: "BIR Registration",
    taxType: "Registration",
    keywords: [
      "cor",
      "2303",
      "orus",
      "bir registration",
      "business registration",
      "certificate of registration",
      "philippine business hub"
    ]
  },
  {
    topic: "Documentary Stamp Tax",
    taxType: "DST",
    keywords: [
      "dst",
      "documentary stamp",
      "loan agreement",
      "shares",
      "deed of sale",
      "lease contract"
    ]
  },
  {
    topic: "Local Business Tax",
    taxType: "Local Tax",
    keywords: [
      "business permit",
      "mayor's permit",
      "local business tax",
      "lgu",
      "bplo",
      "bpld",
      "gross receipts"
    ]
  }
];

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTaxReference(text = "") {
  return String(text)
    .replace(/revenue regulation no\.?/gi, "RR")
    .replace(/revenue regulations no\.?/gi, "RR")
    .replace(/revenue regulation/gi, "RR")
    .replace(/\brr[\s_-]*(\d{1,3})[\s_-]*(\d{2,4})\b/gi, (_, num, year) => {
      const cleanNum = String(Number(num));
      const cleanYear = year.length === 2 ? `20${year}` : year;
      return `RR ${cleanNum}-${cleanYear}`;
    })
    .replace(/\brmc[\s_-]*(\d{1,3})[\s_-]*(\d{2,4})\b/gi, (_, num, year) => {
      const cleanNum = String(Number(num));
      const cleanYear = year.length === 2 ? `20${year}` : year;
      return `RMC ${cleanNum}-${cleanYear}`;
    })
    .replace(/\brmo[\s_-]*(\d{1,3})[\s_-]*(\d{2,4})\b/gi, (_, num, year) => {
      const cleanNum = String(Number(num));
      const cleanYear = year.length === 2 ? `20${year}` : year;
      return `RMO ${cleanNum}-${cleanYear}`;
    });
}

function detectFollowUp(question = "") {
  const q = question.toLowerCase().trim();

  if (q.length <= 45) return true;

  return FOLLOW_UP_TRIGGERS.some((trigger) => q.includes(trigger));
}

function detectTopicByRules(question = "") {
  const q = question.toLowerCase();

  for (const rule of TAX_TOPIC_RULES) {
    const matchedKeyword = rule.keywords.find((keyword) =>
      q.includes(keyword.toLowerCase())
    );

    if (matchedKeyword) {
      return {
        topic: rule.topic,
        taxType: rule.taxType,
        matchedKeyword
      };
    }
  }

  return {
    topic: "General",
    taxType: "General",
    matchedKeyword: null
  };
}

function buildSubject(question, detected, previousState) {
  if (detected.topic !== "General") {
    return detected.matchedKeyword || detected.topic;
  }

  if (previousState?.current_subject) {
    return previousState.current_subject;
  }

  return question;
}

function resolveQuestion({
  originalQuestion,
  normalizedQuestion,
  isFollowUp,
  detected,
  previousState
}) {
  if (!isFollowUp || !previousState?.current_subject) {
    return normalizedQuestion;
  }

  const previousSubject = previousState.current_subject;
  const previousTopic = previousState.current_topic || detected.topic || "tax";

  return `In relation to ${previousTopic} on ${previousSubject}, ${originalQuestion}`;
}

/* =========================================================
   MAIN EXPORT
========================================================= */

export async function detectTopic({
  question,
  userId = null,
  sessionId = null
}) {
  const originalQuestion = cleanText(question);
  const normalizedQuestion = cleanText(normalizeTaxReference(originalQuestion));

  const previousState = await getLastTopicState(userId, sessionId);

  const detected = detectTopicByRules(normalizedQuestion);
  const isFollowUp = detectFollowUp(normalizedQuestion);

  const topic =
    detected.topic !== "General"
      ? detected.topic
      : previousState?.current_topic || "General";

  const taxType =
    detected.taxType !== "General"
      ? detected.taxType
      : previousState?.current_tax_type || "General";

  const subject = buildSubject(normalizedQuestion, detected, previousState);

  const resolvedQuestion = resolveQuestion({
    originalQuestion,
    normalizedQuestion,
    isFollowUp,
    detected: { topic, taxType },
    previousState
  });

  return {
    topic,
    subject,
    taxType,
    isFollowUp,
    originalQuestion,
    normalizedQuestion,
    resolvedQuestion,
    previousTopic: previousState?.current_topic || null,
    previousSubject: previousState?.current_subject || null
  };
}

export default detectTopic;
