// FILE: topic-detector.js

import { getLastTopicState } from "./memory-hooks.js";

/* =========================================================
   TINA TOPIC DETECTOR
   Purpose:
   - Detect tax topic
   - Detect follow-up questions
   - Resolve short/incomplete questions using prior topic state
   - Improve routing for named laws, issuances, and case questions
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

const NAMED_LAW_RULES = [
  {
    topic: "CREATE Law",
    taxType: "Income Tax",
    keywords: [
      "create law",
      "create act",
      "ra 11534",
      "republic act no 11534",
      "corporate recovery and tax incentives for enterprises"
    ]
  },
  {
    topic: "TRAIN Law",
    taxType: "Tax Reform",
    keywords: [
      "train law",
      "train act",
      "ra 10963",
      "republic act no 10963",
      "tax reform for acceleration and inclusion"
    ]
  },
  {
    topic: "Tax Code / NIRC",
    taxType: "Tax Code",
    keywords: [
      "nirc",
      "tax code",
      "national internal revenue code",
      "ra 8424",
      "republic act no 8424"
    ]
  },
  {
    topic: "EOPT",
    taxType: "Tax Administration",
    keywords: [
      "eopt",
      "ease of paying taxes",
      "ease of paying taxes act",
      "ra 11976",
      "republic act no 11976"
    ]
  },
  {
    topic: "CREATE MORE",
    taxType: "Tax Incentives",
    keywords: [
      "create more",
      "create more act",
      "ra 12066",
      "republic act no 12066"
    ]
  }
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
      "sales invoice",
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
      "taxable income",
      "deductible expense",
      "deduction",
      "allowable deduction",
      "section 34"
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
  },
  {
    topic: "Tax Remedies",
    taxType: "Tax Remedies",
    keywords: [
      "assessment",
      "fan",
      "final assessment notice",
      "protest",
      "refund",
      "claim for refund",
      "prescriptive period",
      "prescription",
      "loa",
      "letter of authority"
    ]
  },
  {
    topic: "Court Case / Jurisprudence",
    taxType: "Jurisprudence",
    keywords: [
      "g.r. no",
      "g.r no",
      "cta case",
      "cta en banc",
      "cta division",
      "court of appeals",
      "supreme court",
      "v. cir",
      "vs. cir",
      "case doctrine",
      "court position"
    ]
  }
];

function cleanText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTaxReference(text = "") {
  return String(text || "")
    .replace(/revenue regulation no\.?/gi, "RR")
    .replace(/revenue regulations no\.?/gi, "RR")
    .replace(/revenue regulation/gi, "RR")
    .replace(/revenue memorandum circular no\.?/gi, "RMC")
    .replace(/revenue memorandum circulars? no\.?/gi, "RMC")
    .replace(/revenue memorandum circular/gi, "RMC")
    .replace(/revenue memorandum order no\.?/gi, "RMO")
    .replace(/revenue memorandum orders? no\.?/gi, "RMO")
    .replace(/revenue memorandum order/gi, "RMO")
    .replace(/revenue audit memorandum order no\.?/gi, "RAMO")
    .replace(/revenue audit memorandum orders? no\.?/gi, "RAMO")
    .replace(/revenue audit memorandum order/gi, "RAMO")
    .replace(/\brepublic act no\.?/gi, "RA")
    .replace(/\br\.?\s*a\.?\s*no\.?/gi, "RA")
    .replace(/\bnational internal revenue code\b/gi, "NIRC")
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
    })
    .replace(/\bramo[\s_-]*(\d{1,3})[\s_-]*(\d{2,4})\b/gi, (_, num, year) => {
      const cleanNum = String(Number(num));
      const cleanYear = year.length === 2 ? `20${year}` : year;
      return `RAMO ${cleanNum}-${cleanYear}`;
    })
    .replace(/\bra[\s_-]*(\d{4,6})\b/gi, (_, num) => {
      const cleanNum = String(Number(num));
      return `RA ${cleanNum}`;
    });
}

function isVeryShortFollowUp(question = "") {
  const q = question.toLowerCase().trim();
  return q.length > 0 && q.length <= 24;
}

function detectFollowUp(question = "") {
  const q = question.toLowerCase().trim();

  if (!q) {
    return false;
  }

  const standaloneNewTopicSignals = [
    /\bra\s+\d{4,6}\b/i,
    /\brr\s+\d{1,3}-\d{2,4}\b/i,
    /\brmc\s+\d{1,3}-\d{2,4}\b/i,
    /\brmo\s+\d{1,3}-\d{2,4}\b/i,
    /\bramo\s+\d{1,3}-\d{2,4}\b/i,
    /\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i,
    /\bcta\s+(?:case|eb)\s+no\.?\s*[a-z0-9.-]+\b/i,
    /\bcreate law\b/i,
    /\btrain law\b/i,
    /\beopt\b/i,
    /\bcreate more\b/i
  ];

  if (standaloneNewTopicSignals.some((pattern) => pattern.test(q))) {
    return false;
  }

  if (isVeryShortFollowUp(q)) {
    return true;
  }

  return FOLLOW_UP_TRIGGERS.some((trigger) => q.includes(trigger));
}

function detectNamedLaw(question = "") {
  const q = question.toLowerCase();

  for (const rule of NAMED_LAW_RULES) {
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

  return null;
}

function detectTopicByRules(question = "") {
  const q = question.toLowerCase();

  const namedLaw = detectNamedLaw(q);
  if (namedLaw) {
    return namedLaw;
  }

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

function detectQuestionNature(question = "") {
  const q = question.toLowerCase();

  if (
    /\b(rr|rmc|rmo|ramo)\s+\d{1,3}-\d{2,4}\b/i.test(q) ||
    q.includes("revenue regulation") ||
    q.includes("revenue memorandum circular") ||
    q.includes("revenue memorandum order") ||
    q.includes("revenue audit memorandum order")
  ) {
    return "issuance";
  }

  if (
    /\bra\s+\d{4,6}\b/i.test(q) ||
    q.includes("create law") ||
    q.includes("train law") ||
    q.includes("eopt") ||
    q.includes("create more")
  ) {
    return "named_law";
  }

  if (
    /\bg\.?\s*r\.?\s*no\.?\s*[a-z0-9.-]+\b/i.test(q) ||
    q.includes("supreme court") ||
    q.includes("cta") ||
    q.includes("court of appeals") ||
    q.includes("case doctrine")
  ) {
    return "case";
  }

  if (
    q.includes("section ") ||
    q.includes("sec. ") ||
    q.includes("sec ") ||
    q.includes("article ") ||
    q.includes("art. ")
  ) {
    return "provision";
  }

  return "general";
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
  previousState,
  questionNature
}) {
  if (!isFollowUp || !previousState?.current_subject) {
    return normalizedQuestion;
  }

  if (["named_law", "issuance", "case", "provision"].includes(questionNature)) {
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

  const previousState =
    userId
      ? await getLastTopicState(
          userId,
          sessionId || null
        )
      : null;

  const detected = detectTopicByRules(normalizedQuestion);
  const isFollowUp = detectFollowUp(normalizedQuestion);
  const questionNature = detectQuestionNature(normalizedQuestion);

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
    previousState,
    questionNature
  });

  return {
    topic,
    subject,
    taxType,
    isFollowUp,
    questionNature,
    originalQuestion,
    normalizedQuestion,
    resolvedQuestion,
    previousTopic: previousState?.current_topic || null,
    previousSubject: previousState?.current_subject || null
  };
}

export default detectTopic;
