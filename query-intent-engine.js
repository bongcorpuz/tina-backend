// FILE: query-intent-engine.js
"use strict";

/**
 * query-intent-engine.js
 * TINA Enterprise Query Intent Engine
 *
 * PURPOSE
 * - classify tax/legal/audit intent
 * - detect authority targets
 * - detect adaptive response mode
 * - detect litigation/evidence routing
 * - control retrieval orchestration
 * - control authority prioritization
 * - support adaptive planner contracts
 * - support conclusion gating
 *
 * COMPATIBLE WITH
 * - adaptive-mode-engine.js
 * - adaptive-response-planner.js
 * - retrieval-engine.js
 * - reranker-engine.js
 * - supersession-engine.js
 * - jurisprudence-engine.js
 * - ask-handler.js
 * - rag-answer-handler.js
 * - answer-renderer.js
 */

const ENGINE_VERSION = "3.0.0";

const ISSUE_TYPE = Object.freeze({
  VAT_REFUND: "VAT_REFUND",
  VAT_LIABILITY: "VAT_LIABILITY",
  VAT_SUBSTANTIATION:
    "VAT_SUBSTANTIATION",
  VAT_EXEMPTION:
    "VAT_EXEMPTION",
  ZERO_RATED_SALES:
    "ZERO_RATED_SALES",

  INCOME_TAX: "INCOME_TAX",
  RCIT: "RCIT",
  MCIT: "MCIT",
  NOLCO: "NOLCO",
  DEDUCTIBILITY:
    "DEDUCTIBILITY",

  WITHHOLDING_TAX:
    "WITHHOLDING_TAX",
  EWT: "EWT",
  CWT: "CWT",
  FWT: "FWT",

  ASSESSMENT: "ASSESSMENT",
  LOA: "LOA",
  PAN_FAN: "PAN_FAN",
  TAX_REMEDIES:
    "TAX_REMEDIES",
  PRESCRIPTION:
    "PRESCRIPTION",

  JURISDICTIONAL:
    "JURISDICTIONAL",
  PROCEDURAL:
    "PROCEDURAL",
  EVIDENTIARY:
    "EVIDENTIARY",

  NAMED_LAW:
    "NAMED_LAW",
  ISSUANCE:
    "ISSUANCE",
  CASE_LAW:
    "CASE_LAW",
  DOCTRINE:
    "DOCTRINE",
  CONFLICT_ANALYSIS:
    "CONFLICT_ANALYSIS",

  CONTRACT:
    "CONTRACT",
  TRANSACTION:
    "TRANSACTION",

  ECONOMIC_SUBSTANCE:
    "ECONOMIC_SUBSTANCE",

  PRINCIPAL_AGENT:
    "PRINCIPAL_AGENT",

  PASS_THROUGH:
    "PASS_THROUGH",

  REIMBURSEMENT:
    "REIMBURSEMENT",

  BUNDLED_TRANSACTION:
    "BUNDLED_TRANSACTION",

  AUDIT:
    "AUDIT",

  ACCOUNTING:
    "ACCOUNTING",

  PFRS:
    "PFRS",

  LOCAL_TAX:
    "LOCAL_TAX",

  DST:
    "DST",

  PERCENTAGE_TAX:
    "PERCENTAGE_TAX",

  EXCISE_TAX:
    "EXCISE_TAX",

  FINAL_TAX:
    "FINAL_TAX",

  CGT:
    "CGT",

  ESTATE_TAX:
    "ESTATE_TAX",

  DONOR_TAX:
    "DONOR_TAX",

  GENERAL_TAX:
    "GENERAL_TAX"
});

const RESPONSE_MODE =
  Object.freeze({
    QUICK: "QUICK",
    STANDARD: "STANDARD",
    TECHNICAL:
      "TECHNICAL",
    AUDIT: "AUDIT",
    LITIGATION:
      "LITIGATION",
    CONTRACT:
      "CONTRACT",
    TRANSACTION:
      "TRANSACTION",
    EVIDENCE_HEAVY:
      "EVIDENCE_HEAVY",
    REVIEWER:
      "REVIEWER"
  });

const LEGAL_DIMENSION =
  Object.freeze({
    SUBSTANTIVE:
      "substantive",
    PROCEDURAL:
      "procedural",
    EVIDENTIARY:
      "evidentiary",
    JURISDICTIONAL:
      "jurisdictional",
    TEMPORAL:
      "temporal",
    ADMINISTRATIVE:
      "administrative",
    FACTUAL:
      "factual",
    ACCOUNTING:
      "accounting",
    CONTRACTUAL:
      "contractual",
    ECONOMIC_SUBSTANCE:
      "economic_substance",
    AUDIT:
      "audit",
    GENERAL:
      "general"
  });

function normalizeText(
  value = ""
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value = "") {
  return normalizeText(
    value
  ).toLowerCase();
}

function unique(
  values = []
) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function normalizeYear(
  year = ""
) {
  const raw = String(
    year || ""
  ).trim();

  if (!raw) return "";

  if (/^\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{2}$/.test(raw)) {
    const yy = Number(raw);

    const currentYY =
      new Date().getFullYear() %
      100;

    return yy <= currentYY + 1
      ? `20${raw}`
      : `19${raw}`;
  }

  return raw;
}

function detectIssuanceReference(
  text = ""
) {
  const value =
    normalizeText(text);

  const patterns = [
    {
      type: "RR",

      regex:
        /\b(?:rr|revenue regulation[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },

    {
      type: "RMC",

      regex:
        /\b(?:rmc|revenue memorandum circular[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },

    {
      type: "RMO",

      regex:
        /\b(?:rmo|revenue memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    },

    {
      type: "RAMO",

      regex:
        /\b(?:ramo|revenue audit memorandum order[s]?)\s*(?:no\.?)?\s*0*(\d+)[-_/ ]+(\d{2,4})\b/i
    }
  ];

  for (const item of patterns) {
    const match =
      value.match(item.regex);

    if (match) {
      return {
        detected: true,

        type: item.type,

        number: String(
          Number(match[1])
        ),

        year:
          normalizeYear(
            match[2]
          ),

        reference:
          `${item.type} No. ${Number(
            match[1]
          )}-${normalizeYear(
            match[2]
          )}`
      };
    }
  }

  const rulingMatch =
    value.match(
      /\b(?:bir\s*)?ruling\s*(?:no\.?)?\s*([a-z0-9()/. -]+)\b/i
    );

  if (rulingMatch) {
    return {
      detected: true,

      type: "BIR_RULING",

      number:
        normalizeText(
          rulingMatch[1]
        ),

      year: null,

      reference:
        `BIR Ruling ${normalizeText(
          rulingMatch[1]
        )}`
    };
  }

  return {
    detected: false,
    type: null,
    number: null,
    year: null,
    reference: null
  };
}

function detectCaseReference(
  text = ""
) {
  const value =
    normalizeText(text);

  const gr = value.match(
    /\bg\.?\s*r\.?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );

  if (gr) {
    return {
      detected: true,

      court:
        "SUPREME_COURT",

      reference:
        `G.R. No. ${gr[1]}`
    };
  }

  const cta =
    value.match(
      /\bcta\s+case\s+no\.?\s*([a-z0-9.-]+)\b/i
    ) ||
    value.match(
      /\bcta\s+eb\s+no\.?\s*([a-z0-9.-]+)\b/i
    );

  if (cta) {
    return {
      detected: true,
      court: "CTA",
      reference: `CTA ${cta[1]}`
    };
  }

  const ca = value.match(
    /\bca-?g\.?\s*r\.?\s*(?:sp|cv|cr)?\s*no\.?\s*([a-z0-9.-]+)\b/i
  );

  if (ca) {
    return {
      detected: true,

      court:
        "COURT_OF_APPEALS",

      reference:
        `CA-G.R. ${ca[1]}`
    };
  }

  return {
    detected: false,
    court: null,
    reference: null
  };
}

function detectNamedLaw(
  text = ""
) {
  const value =
    lower(text);

  const laws = [];

  if (
    /\b(create law|create act|ra\s*11534)\b/i.test(
      value
    )
  ) {
    laws.push({
      code: "CREATE",

      title:
        "Corporate Recovery and Tax Incentives for Enterprises Act",

      raNumber: "11534"
    });
  }

  if (
    /\b(train law|train act|ra\s*10963)\b/i.test(
      value
    )
  ) {
    laws.push({
      code: "TRAIN",

      title:
        "Tax Reform for Acceleration and Inclusion Act",

      raNumber: "10963"
    });
  }

  if (
    /\b(eopt|ease of paying taxes|ra\s*11976)\b/i.test(
      value
    )
  ) {
    laws.push({
      code: "EOPT",

      title:
        "Ease of Paying Taxes Act",

      raNumber: "11976"
    });
  }

  if (
    /\b(create more|ra\s*12066)\b/i.test(
      value
    )
  ) {
    laws.push({
      code:
        "CREATE_MORE",

      title:
        "CREATE MORE Act",

      raNumber: "12066"
    });
  }

  const raMatch =
    value.match(
      /\b(?:ra|r\.a\.|republic act)\s*(?:no\.?)?\s*(\d{4,6})\b/i
    );

  if (
    raMatch &&
    !laws.some(
      (law) =>
        law.raNumber ===
        raMatch[1]
    )
  ) {
    laws.push({
      code:
        `RA_${raMatch[1]}`,

      title:
        `Republic Act No. ${raMatch[1]}`,

      raNumber:
        raMatch[1]
    });
  }

  return {
    detected:
      laws.length > 0,
    laws
  };
}

function detectIssueTypes(
  question = ""
) {
  const q = lower(question);

  const issues = [];

  const push = (
    condition,
    issue
  ) => {
    if (condition) {
      issues.push(issue);
    }
  };

  push(
    /\bvat refund\b|\bunutilized input vat\b|\bexcess input vat\b/i.test(
      q
    ),
    ISSUE_TYPE.VAT_REFUND
  );

  push(
    /\boutput vat\b|\bsubject to vat\b|\bvatable\b|\bdefine vat\b|\bwhat is vat\b/i.test(
      q
    ),
    ISSUE_TYPE.VAT_LIABILITY
  );

  push(
    /\bvat exempt\b|\bexempt from vat\b|\bsection\s*109\b/i.test(
      q
    ),
    ISSUE_TYPE.VAT_EXEMPTION
  );

  push(
    /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bdocumentary\b|\bevidence\b|\bproof\b|\bsupport\b/i.test(
      q
    ),
    ISSUE_TYPE.EVIDENTIARY
  );

  push(
    /\bincome tax\b|\brcit\b|\bmcit\b|\bnolco\b/i.test(
      q
    ),
    ISSUE_TYPE.INCOME_TAX
  );

  push(
    /\bwithholding\b|\bewt\b|\bcwt\b|\bfwt\b/i.test(
      q
    ),
    ISSUE_TYPE.WITHHOLDING_TAX
  );

  push(
    /\bassessment\b|\bdeficiency tax\b|\bloa\b|\bpan\b|\bfan\b|\bfld\b/i.test(
      q
    ),
    ISSUE_TYPE.ASSESSMENT
  );

  push(
    /\bloa\b|letter of authority/i.test(
      q
    ),
    ISSUE_TYPE.LOA
  );

  push(
    /\brefund\b|\bprotest\b|\bappeal\b|\bcta\b/i.test(
      q
    ),
    ISSUE_TYPE.TAX_REMEDIES
  );

  push(
    /\bdoctrine\b|\bsubstance over form\b|\beconomic substance\b/i.test(
      q
    ),
    ISSUE_TYPE.DOCTRINE
  );

  push(
    /\bconflict\b|\bprevails\b|\boverride\b|\bhierarchy\b/i.test(
      q
    ),
    ISSUE_TYPE.CONFLICT_ANALYSIS
  );

  push(
    /\bcontract\b|\bagreement\b|\blease agreement\b|\bconcession agreement\b|\bclause\b/i.test(
      q
    ),
    ISSUE_TYPE.CONTRACT
  );

  push(
    /\bprincipal vs agent\b|\bpass-through\b|\breimbursement\b|\bbundled\b|\bgross or net\b|\bcommission\b|\bconcession\b/i.test(
      q
    ),
    ISSUE_TYPE.TRANSACTION
  );

  push(
    /\beconomic substance\b|\bsubstance over form\b|\bsham\b|\bsimulation\b/i.test(
      q
    ),
    ISSUE_TYPE.ECONOMIC_SUBSTANCE
  );

  push(
    /\baudit\b|\bqualified opinion\b|\bmisstatement\b|\bworking paper\b/i.test(
      q
    ),
    ISSUE_TYPE.AUDIT
  );

  push(
    /\bpfrs\b|\bpas\b|\bfinancial statements\b|\bafs\b/i.test(
      q
    ),
    ISSUE_TYPE.PFRS
  );

  if (
    detectIssuanceReference(q)
      .detected
  ) {
    issues.push(
      ISSUE_TYPE.ISSUANCE
    );
  }

  if (
    detectCaseReference(
      question
    ).detected
  ) {
    issues.push(
      ISSUE_TYPE.CASE_LAW
    );
  }

  if (
    detectNamedLaw(question)
      .detected
  ) {
    issues.push(
      ISSUE_TYPE.NAMED_LAW
    );
  }

  return unique(
    issues.length
      ? issues
      : [
          ISSUE_TYPE.GENERAL_TAX
        ]
  );
}

function detectLegalDimensions(
  question = ""
) {
  const q = lower(question);

  const dimensions = [];

  const push = (
    condition,
    dimension
  ) => {
    if (condition) {
      dimensions.push(
        dimension
      );
    }
  };

  push(
    /\btaxable\b|\bliable\b|\bsubject to\b|\bdeductible\b|\bexempt\b/i.test(
      q
    ),
    LEGAL_DIMENSION.SUBSTANTIVE
  );

  push(
    /\bfiling\b|\bdeadline\b|\breturn\b|\bprotest\b|\bappeal\b/i.test(
      q
    ),
    LEGAL_DIMENSION.PROCEDURAL
  );

  push(
    /\binvoice\b|\breceipt\b|\bsubstantiation\b|\bevidence\b|\bproof\b/i.test(
      q
    ),
    LEGAL_DIMENSION.EVIDENTIARY
  );

  push(
    /\beffective\b|\bretroactive\b|\bprospective\b|\bsuperseded\b|\bamended\b|\brepealed\b/i.test(
      q
    ),
    LEGAL_DIMENSION.TEMPORAL
  );

  push(
    /\bcontract\b|\bagreement\b|\bclause\b|\blease\b/i.test(
      q
    ),
    LEGAL_DIMENSION.CONTRACTUAL
  );

  push(
    /\beconomic substance\b|\bsubstance over form\b/i.test(
      q
    ),
    LEGAL_DIMENSION.ECONOMIC_SUBSTANCE
  );

  push(
    /\baudit\b|\bmisstatement\b|\bworking paper\b/i.test(
      q
    ),
    LEGAL_DIMENSION.AUDIT
  );

  return unique(
    dimensions.length
      ? dimensions
      : [
          LEGAL_DIMENSION.GENERAL
        ]
  );
}

function detectAdaptiveMode(
  question = "",
  issueTypes = []
) {
  const q = lower(question);

  if (
    issueTypes.includes(
      ISSUE_TYPE.AUDIT
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.PFRS
    )
  ) {
    return RESPONSE_MODE.AUDIT;
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.CONTRACT
    )
  ) {
    return RESPONSE_MODE.CONTRACT;
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.TRANSACTION
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.PRINCIPAL_AGENT
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.PASS_THROUGH
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.REIMBURSEMENT
    )
  ) {
    return RESPONSE_MODE.TRANSACTION;
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.EVIDENTIARY
    )
  ) {
    return RESPONSE_MODE.EVIDENCE_HEAVY;
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.ASSESSMENT
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.TAX_REMEDIES
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.LOA
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.PAN_FAN
    )
  ) {
    return RESPONSE_MODE.LITIGATION;
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.CONFLICT_ANALYSIS
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.DOCTRINE
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.CASE_LAW
    )
  ) {
    return RESPONSE_MODE.TECHNICAL;
  }

  if (
    /\bbrief\b|\bquick\b|\bshort answer\b/i.test(
      q
    )
  ) {
    return RESPONSE_MODE.QUICK;
  }

  if (
    /\bcpale\b|\breviewer\b|\bquiz\b|\blayman\b|\btaglish\b/i.test(
      q
    )
  ) {
    return RESPONSE_MODE.REVIEWER;
  }

  return RESPONSE_MODE.STANDARD;
}

function detectRiskFlags(
  question = "",
  issueTypes = []
) {
  const flags = [];

  const push = (
    code,
    message,
    severity = "MEDIUM"
  ) => {
    flags.push({
      code,
      message,
      severity
    });
  };

  if (
    issueTypes.includes(
      ISSUE_TYPE.CONFLICT_ANALYSIS
    )
  ) {
    push(
      "REQUIRES_CONFLICT_REASONING",
      "Answer must distinguish hierarchy conflict, doctrinal conflict, and apparent conflict.",
      "HIGH"
    );
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.CASE_LAW
    )
  ) {
    push(
      "ISSUE_MATCHED_JURISPRUDENCE_ONLY",
      "Only issue-relevant jurisprudence should be cited.",
      "HIGH"
    );
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.EVIDENTIARY
    )
  ) {
    push(
      "EVIDENCE_DEPENDENT_CONCLUSION",
      "Strong conclusions should be deferred if evidence is incomplete.",
      "HIGH"
    );
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.TRANSACTION
    )
  ) {
    push(
      "TRANSACTION_CHARACTERIZATION_REQUIRED",
      "Transaction characterization and economic substance analysis required.",
      "HIGH"
    );
  }

  return flags;
}

function buildRetrievalHints({
  issueTypes = [],
  dimensions = [],
  issuance = null,
  caseReference = null,
  namedLaw = null,
  adaptiveMode =
    RESPONSE_MODE.STANDARD
}) {
  const includeAuthorityTypes =
    [];

  const priorityTerms = [];

  const retrievalInstructions =
    [];

  if (namedLaw?.detected) {
    includeAuthorityTypes.push(
      "STATUTE",
      "RR",
      "RMC",
      "RMO"
    );

    for (const law of namedLaw.laws) {
      priorityTerms.push(
        law.title
      );

      if (law.raNumber) {
        priorityTerms.push(
          `RA ${law.raNumber}`
        );
      }
    }

    retrievalInstructions.push(
      "Retrieve exact statute before implementing issuances."
    );
  }

  if (issuance?.detected) {
    includeAuthorityTypes.push(
      issuance.type
    );

    priorityTerms.push(
      issuance.reference
    );

    retrievalInstructions.push(
      "Retrieve exact issuance before semantic fallback."
    );
  }

  if (
    caseReference?.detected
  ) {
    includeAuthorityTypes.push(
      "SUPREME_COURT",
      "CTA_EN_BANC",
      "CTA_DIVISION"
    );

    priorityTerms.push(
      caseReference.reference
    );

    retrievalInstructions.push(
      "Retrieve exact jurisprudence before semantic fallback."
    );
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.TRANSACTION
    )
  ) {
    retrievalInstructions.push(
      "Prioritize principal-agent, reimbursement, pass-through, concession, and bundled transaction authorities."
    );
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.EVIDENTIARY
    )
  ) {
    retrievalInstructions.push(
      "Prioritize documentary substantiation and evidentiary burden authorities."
    );
  }

  return {
    includeAuthorityTypes:
      unique(
        includeAuthorityTypes
      ),

    priorityTerms:
      unique(
        priorityTerms.filter(
          Boolean
        )
      ),

    retrievalInstructions:
      unique(
        retrievalInstructions
      ),

    adaptiveMode,

    dimensions
  };
}

function buildEngineRouting({
  issueTypes = [],
  dimensions = [],
  adaptiveMode =
    RESPONSE_MODE.STANDARD
}) {
  return {
    needsProvisionCitationEngine:
      adaptiveMode !==
      RESPONSE_MODE.QUICK,

    needsJurisprudenceEngine:
      issueTypes.includes(
        ISSUE_TYPE.CASE_LAW
      ) ||
      issueTypes.includes(
        ISSUE_TYPE.DOCTRINE
      ) ||
      issueTypes.includes(
        ISSUE_TYPE.CONFLICT_ANALYSIS
      ),

    needsSupersessionEngine:
      issueTypes.includes(
        ISSUE_TYPE.ISSUANCE
      ) ||
      dimensions.includes(
        LEGAL_DIMENSION.TEMPORAL
      ),

    needsTransactionCharacterization:
      issueTypes.includes(
        ISSUE_TYPE.TRANSACTION
      ),

    needsEconomicSubstance:
      issueTypes.includes(
        ISSUE_TYPE.ECONOMIC_SUBSTANCE
      ) ||
      issueTypes.includes(
        ISSUE_TYPE.TRANSACTION
      ),

    needsContractInterpretation:
      issueTypes.includes(
        ISSUE_TYPE.CONTRACT
      ),

    needsEvidenceEvaluation:
      issueTypes.includes(
        ISSUE_TYPE.EVIDENTIARY
      ),

    needsRiskScoring:
      adaptiveMode !==
      RESPONSE_MODE.QUICK,

    needsPositionStrength:
      adaptiveMode !==
      RESPONSE_MODE.QUICK,

    needsAdaptivePlanner:
      true,

    needsAnswerRenderer:
      true
  };
}

function buildConclusionControls(
  issueTypes = [],
  adaptiveMode =
    RESPONSE_MODE.STANDARD
) {
  const evidenceDependent =
    issueTypes.includes(
      ISSUE_TYPE.EVIDENTIARY
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.TRANSACTION
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.CONTRACT
    ) ||
    issueTypes.includes(
      ISSUE_TYPE.ECONOMIC_SUBSTANCE
    );

  return {
    allowStrongConclusion:
      !evidenceDependent,

    requireLimitation:
      evidenceDependent,

    conclusionRestriction:
      evidenceDependent
        ? "PRELIMINARY_CONCLUSION_ONLY"
        : "DIRECT_CONCLUSION_ALLOWED",

    requiredLanguage:
      evidenceDependent
        ? "Based on the available facts, the position is preliminary and subject to verification."
        : "A direct conclusion may be rendered if supported by law and evidence."
  };
}

function normalizeDetectedIntent(
  issueTypes = []
) {
  if (
    issueTypes.includes(
      ISSUE_TYPE.ISSUANCE
    )
  ) {
    return "EXACT_ISSUANCE_RETRIEVAL";
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.CASE_LAW
    )
  ) {
    return "JURISPRUDENCE_RETRIEVAL";
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.CONTRACT
    )
  ) {
    return "CONTRACT_INTERPRETATION";
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.TRANSACTION
    )
  ) {
    return "TRANSACTION_CHARACTERIZATION";
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.EVIDENTIARY
    )
  ) {
    return "EVIDENCE_EVALUATION";
  }

  if (
    issueTypes.includes(
      ISSUE_TYPE.AUDIT
    )
  ) {
    return "AUDIT_ANALYSIS";
  }

  return "GENERAL_TAX_QUERY";
}

function buildIntentSearchQueries(
  question = "",
  intentData = null,
  maxQueries = 8
) {
  const intent =
    intentData ||
    analyzeQueryIntent(
      question,
      {
        skipSearchBuild:
          true
      }
    );

  const queries = [
    intent.normalizedQuestion
  ];

  for (const term of intent
    .retrievalHints
    ?.priorityTerms || []) {
    queries.push(
      `${intent.normalizedQuestion} ${term}`
    );
  }

  if (
    intent.issuance
      ?.detected
  ) {
    queries.push(
      intent.issuance
        .reference
    );
  }

  if (
    intent.caseReference
      ?.detected
  ) {
    queries.push(
      intent.caseReference
        .reference
    );
  }

  return unique(
    queries
  ).slice(0, maxQueries);
}

function analyzeQueryIntent(
  question = "",
  options = {}
) {
  const cleanQuestion =
    normalizeText(question);

  const issueTypes =
    detectIssueTypes(
      cleanQuestion
    );

  const legalDimensions =
    detectLegalDimensions(
      cleanQuestion
    );

  const issuance =
    detectIssuanceReference(
      cleanQuestion
    );

  const caseReference =
    detectCaseReference(
      cleanQuestion
    );

  const namedLaw =
    detectNamedLaw(
      cleanQuestion
    );

  const adaptiveMode =
    detectAdaptiveMode(
      cleanQuestion,
      issueTypes
    );

  const detectedIntent =
    normalizeDetectedIntent(
      issueTypes
    );

  const riskFlags =
    detectRiskFlags(
      cleanQuestion,
      issueTypes
    );

  const retrievalHints =
    buildRetrievalHints({
      issueTypes,

      dimensions:
        legalDimensions,

      issuance,

      caseReference,

      namedLaw,

      adaptiveMode
    });

  const engineRouting =
    buildEngineRouting({
      issueTypes,

      dimensions:
        legalDimensions,

      adaptiveMode
    });

  const conclusionControls =
    buildConclusionControls(
      issueTypes,
      adaptiveMode
    );

  const confidence =
    Math.min(
      0.95,

      Math.max(
        0.55,

        0.55 +
          (issueTypes.length >
          1
            ? 0.1
            : 0) +
          (issuance.detected
            ? 0.15
            : 0) +
          (riskFlags.length
            ? 0.1
            : 0)
      )
    );

  const payload = {
    engine:
      "TINA_QUERY_INTENT_ENGINE",

    version:
      ENGINE_VERSION,

    originalQuestion:
      question,

    normalizedQuestion:
      cleanQuestion,

    detectedIntent,

    adaptiveMode,

    detectedMode:
      adaptiveMode,

    issueTypes,

    legalDimensions,

    issuance,

    caseReference,

    namedLaw,

    riskFlags,

    retrievalHints,

    engineRouting,

    conclusionControls,

    intentConfidence:
      Number(
        confidence.toFixed(
          2
        )
      ),

    retrievalStrategy:
      issuance.detected ||
      caseReference.detected
        ? "EXACT_AUTHORITY_FIRST_THEN_SEMANTIC"
        : "AUTHORITY_HIERARCHY_SEMANTIC",

    requiresAFStructure:
      true,

    orchestrationMetadata:
      {
        plannerCompatible:
          true,

        rendererCompatible:
          true,

        adaptivePipelineCompatible:
          true,

        suggestedExecutionOrder:
          [
            "query-intent-engine",
            "retrieval-engine",
            "reranker-engine",
            "supersession-engine",
            "jurisprudence-engine",
            "adaptive-response-planner",
            "answer-renderer"
          ]
      },

    tinaInstruction:
      "Apply TINA master prompt: use issue-specific authorities only, hierarchy analysis, evidence-aware reasoning, transaction characterization where required, and no citation dumping."
  };

  if (
    !options.skipSearchBuild
  ) {
    payload.searchTerms =
      buildIntentSearchQueries(
        cleanQuestion,
        payload,
        8
      );
  }

  return payload;
}

function isIssueMismatch(
  queryIntent = {},
  docIssueTypes = []
) {
  const queryIssues =
    queryIntent.issueTypes ||
    [];

  const docIssues =
    docIssueTypes || [];

  if (
    queryIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    ) &&
    docIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    ) &&
    !queryIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    )
  ) {
    return true;
  }

  if (
    queryIssues.includes(
      ISSUE_TYPE.VAT_REFUND
    ) &&
    docIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    ) &&
    !queryIssues.includes(
      ISSUE_TYPE.VAT_LIABILITY
    )
  ) {
    return true;
  }

  return false;
}

module.exports = {
  ENGINE_VERSION,

  ISSUE_TYPE,

  RESPONSE_MODE,

  LEGAL_DIMENSION,

  detectIssuanceReference,

  detectCaseReference,

  detectNamedLaw,

  detectIssueTypes,

  detectLegalDimensions,

  analyzeQueryIntent,

  buildIntentSearchQueries,

  isIssueMismatch
};
