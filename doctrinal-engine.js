// FILE: doctrinal-engine.js
"use strict";

/**
 * TINA Enterprise Doctrinal Engine
 * Version: 4.0.0
 *
 * Patch:
 * - Full ESM compatibility.
 * - Uses issueClassification before doctrinal comparison.
 * - Blocks unrelated doctrine conflicts.
 * - Requires same issue + same legal dimension + opposite holding before doctrinal conflict.
 * - Emits issueClassificationMatch and targetAuthorityMatch downstream.
 */

import {
  AUTHORITY_LEVEL,
  getAuthorityTypeForDoc,
  getAuthorityLevelForDoc,
  getControllingPrecedenceForDoc
} from "./authority-engine.js";

import {
  resolveCourtOverride,
  isGenuineConflict,
  analyzeConflictPair,
  sameIssueGate,
  oppositeHoldingGate
} from "./conflict-engine.js";

const ENGINE_VERSION = "4.0.0";

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalizeText(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeIssue(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    VAT: "VAT_LIABILITY",
    OUTPUT_VAT: "VAT_LIABILITY",
    INPUT_VAT: "VAT_REFUND",
    INPUT_VAT_REFUND: "VAT_REFUND",
    TAX_REFUND: "VAT_REFUND",
    REFUND: "VAT_REFUND",
    EWT: "WITHHOLDING",
    CWT: "WITHHOLDING",
    FWT: "WITHHOLDING",
    WITHHOLDING_TAX: "WITHHOLDING",
    RCIT: "INCOME_TAX",
    MCIT: "INCOME_TAX",
    NOLCO: "INCOME_TAX",
    PRINCIPAL_AGENT: "TRANSACTION",
    PRINCIPAL_VS_AGENT: "TRANSACTION",
    GROSS_NET: "TRANSACTION",
    PASS_THROUGH: "TRANSACTION",
    REIMBURSEMENT: "TRANSACTION",
    AGREEMENT: "CONTRACT",
    ECONOMIC_SUBSTANCE_ANALYSIS: "ECONOMIC_SUBSTANCE"
  };

  return aliases[raw] || raw || null;
}

function normalizeDimension(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    SUBSTANCE: "SUBSTANTIVE",
    PROCEDURE: "PROCEDURAL",
    PROOF: "EVIDENTIARY",
    EVIDENCE: "EVIDENTIARY",
    JURISDICTION: "JURISDICTIONAL",
    FACT: "FACTUAL",
    FACTS: "FACTUAL",
    CONTRACT: "CONTRACTUAL",
    TRANSACTION_CHARACTERIZATION: "TRANSACTION"
  };

  return aliases[raw] || raw || null;
}

function normalizeAuthority(value = "") {
  const raw = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  const aliases = {
    NIRC: "STATUTE",
    TAX_CODE: "STATUTE",
    LAW: "STATUTE",
    REVENUE_REGULATION: "RR",
    REVENUE_MEMORANDUM_CIRCULAR: "RMC",
    REVENUE_MEMORANDUM_ORDER: "RMO",
    REVENUE_AUDIT_MEMORANDUM_ORDER: "RAMO",
    SC: "SUPREME_COURT",
    CASE: "SUPREME_COURT",
    JURISPRUDENCE: "SUPREME_COURT",
    CTA: "CTA_DIVISION",
    BIR_RULINGS: "BIR_RULING"
  };

  return aliases[raw] || raw || null;
}

function authorityLevelOf(doc = {}) {
  return (
    Number(doc.authorityLevel || doc.authority_level || doc.metadata?.authorityLevel) ||
    getAuthorityLevelForDoc(doc) ||
    AUTHORITY_LEVEL[
      doc.authorityType || doc.authority_type || doc.metadata?.authorityType
    ] ||
    99
  );
}

function authorityTypeOf(doc = {}) {
  return (
    doc.authorityType ||
    doc.authority_type ||
    doc.metadata?.authorityType ||
    getAuthorityTypeForDoc(doc) ||
    "UNKNOWN"
  );
}

function controllingPrecedenceOf(doc = {}) {
  return (
    Number(
      doc.controllingPrecedence ||
        doc.controlling_precedence ||
        doc.metadata?.controllingPrecedence
    ) ||
    getControllingPrecedenceForDoc(doc) ||
    99
  );
}

function sourcePathOf(doc = {}) {
  return (
    doc.path ||
    doc.source_path ||
    doc.metadata?.path ||
    doc.source ||
    doc.originalSource ||
    doc.original_source ||
    null
  );
}

function sourceTitleOf(doc = {}) {
  return (
    doc.title ||
    doc.source_title ||
    doc.sourceTitle ||
    doc.metadata?.documentTitle ||
    doc.metadata?.originalFileName ||
    doc.originalSource ||
    doc.original_source ||
    doc.source ||
    sourcePathOf(doc) ||
    null
  );
}

function doctrineTextOf(doc = {}) {
  return normalizeText(
    [
      doc.claim_text,
      doc.claimText,
      doc.doctrine,
      doc.rule,
      doc.text,
      doc.content,
      doc.excerpt,
      doc.preview,
      doc.source,
      doc.originalSource,
      doc.original_source,
      doc.path,
      doc.source_path,
      doc.metadata?.path,
      doc.metadata?.documentTitle,
      doc.metadata?.originalFileName,
      doc.metadata?.normalizedReference
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function doctrinalTopicOf(doc = {}) {
  return normalizeText(
    doc.topic ||
      doc.metadata?.topic ||
      doc.taxType ||
      doc.tax_type ||
      doc.metadata?.taxType ||
      doc.subtopic ||
      doc.metadata?.subtopic ||
      detectIssueSignals(doctrineTextOf(doc))[0] ||
      "GENERAL"
  ).toUpperCase();
}

function normalizeIssueClassification(issueClassification = null, docs = []) {
  const source = issueClassification || {};

  const fallbackIssues = unique(
    safeArray(docs)
      .flatMap((doc) => detectIssueSignals(doctrineTextOf(doc)))
      .map(normalizeIssue)
  );

  const primaryIssue =
    normalizeIssue(source.primaryIssue) ||
    normalizeIssue(source.primary_issue) ||
    normalizeIssue(source.issueType) ||
    normalizeIssue(source.issue_type) ||
    fallbackIssues[0] ||
    "GENERAL";

  const subIssues = unique([
    primaryIssue,
    ...safeArray(source.subIssues).map(normalizeIssue),
    ...safeArray(source.subIssue).map(normalizeIssue),
    ...safeArray(source.sub_issues).map(normalizeIssue),
    ...safeArray(source.sub_issue).map(normalizeIssue),
    ...fallbackIssues
  ]).filter(Boolean);

  const legalDimensions = unique([
    ...safeArray(source.legalDimensions).map(normalizeDimension),
    ...safeArray(source.legalDimension).map(normalizeDimension),
    ...safeArray(source.legal_dimensions).map(normalizeDimension),
    ...safeArray(source.legal_dimension).map(normalizeDimension),
    ...safeArray(docs).flatMap((doc) => classifyDoctrineDimension(doctrineTextOf(doc)).map(normalizeDimension))
  ]).filter(Boolean);

  const targetAuthorities = unique([
    ...safeArray(source.targetAuthorities).map(normalizeAuthority),
    ...safeArray(source.target_authorities).map(normalizeAuthority)
  ]).filter(Boolean);

  return {
    primaryIssue,
    subIssues,
    legalDimensions,
    retrievalStrategy:
      source.retrievalStrategy ||
      source.retrieval_strategy ||
      "DOCTRINAL_SAME_ISSUE_OPPOSITE_HOLDING",
    targetAuthorities,
    raw: source
  };
}

function detectIssueSignals(text = "") {
  const value = lower(text);
  const issues = [];

  const push = (condition, issue) => {
    if (condition) issues.push(issue);
  };

  push(/\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tax credit certificate|tcc|unutilized input vat|excess input vat|claim for refund)\b/i.test(value), "VAT_REFUND");
  push(/\b(vat liability|output vat|vatable|subject to vat|value-added tax|value added tax|sale of goods|sale of services|gross receipts|gross selling price|nature of vat)\b/i.test(value), "VAT_LIABILITY");
  push(/\b(withholding|ewt|cwt|fwt|expanded withholding|final withholding)\b/i.test(value), "WITHHOLDING");
  push(/\b(income tax|rcit|mcit|nolco|deductible|non-deductible|taxable income|gross income)\b/i.test(value), "INCOME_TAX");
  push(/\b(invoice|receipt|official receipt|substantiation|documentary|proof|evidence|burden of proof)\b/i.test(value), "EVIDENTIARY");
  push(/\b(jurisdiction|deadline|filing|prescription|appeal|protest|assessment|loa|pan|fan|remedy|120\+30)\b/i.test(value), "PROCEDURAL");
  push(/\b(contract|agreement|lease|concession|clause)\b/i.test(value), "CONTRACT");
  push(/\b(principal|agent|pass-through|pass through|reimbursement|reimbursable|bundled|gross vs net|gross or net)\b/i.test(value), "TRANSACTION");
  push(/\b(economic substance|substance over form|business purpose|sham|simulation|tax avoidance|tax evasion)\b/i.test(value), "ECONOMIC_SUBSTANCE");
  push(/\b(audit|afs|pfrs|pas|misstatement|working paper|financial statements)\b/i.test(value), "AUDIT");
  push(/\b(mutuality|association dues|condominium dues|membership dues|homeowners association)\b/i.test(value), "DOCTRINE");

  return unique(issues);
}

function targetAuthorityMatched(profile = {}, doc = {}) {
  if (!safeArray(profile.targetAuthorities).length) return false;
  return profile.targetAuthorities.includes(authorityTypeOf(doc));
}

function hasIssueOverlap(profile = {}, doc = {}) {
  const docIssues = detectIssueSignals(doctrineTextOf(doc)).map(normalizeIssue);
  if (!safeArray(profile.subIssues).length || !docIssues.length) return true;
  return profile.subIssues.some((issue) => docIssues.includes(normalizeIssue(issue)));
}

function hasDimensionOverlap(profile = {}, doc = {}) {
  const docDimensions = classifyDoctrineDimension(doctrineTextOf(doc)).map(normalizeDimension);
  if (!safeArray(profile.legalDimensions).length || !docDimensions.length) return true;
  if (profile.legalDimensions.includes("GENERAL") || docDimensions.includes("GENERAL")) return true;
  return profile.legalDimensions.some((dimension) => docDimensions.includes(normalizeDimension(dimension)));
}

function hasIssueMismatch(profile = {}, doc = {}) {
  const text = doctrineTextOf(doc);
  const value = lower(text);

  if (
    profile.primaryIssue === "VAT_LIABILITY" &&
    /\b(vat refund|input vat refund|120\+30|administrative claim|judicial claim|tcc|unutilized input vat)\b/i.test(value)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "VAT_REFUND" &&
    /\b(vat liability|output vat|vatable|subject to vat|sale of goods|sale of services|gross receipts|nature of vat)\b/i.test(value)
  ) {
    return true;
  }

  if (
    profile.primaryIssue === "WITHHOLDING" &&
    /\b(vat refund|input vat refund|vat liability|output vat|vatable)\b/i.test(value)
  ) {
    return true;
  }

  return false;
}

function buildIssueClassificationMatch(profile = {}, doc = {}) {
  const docIssues = detectIssueSignals(doctrineTextOf(doc)).map(normalizeIssue);
  const docDimensions = classifyDoctrineDimension(doctrineTextOf(doc)).map(normalizeDimension);

  const issueMismatch = hasIssueMismatch(profile, doc);
  const issueOverlap = hasIssueOverlap(profile, doc);
  const dimensionOverlap = hasDimensionOverlap(profile, doc);
  const targetAuthorityMatch = targetAuthorityMatched(profile, doc);

  const matched =
    !issueMismatch &&
    (targetAuthorityMatch || issueOverlap || dimensionOverlap || !docIssues.length);

  return {
    matched,
    compatible: matched,
    issueOverlap,
    dimensionOverlap,
    issueMismatch,
    targetAuthorityMatch,
    primaryIssue: profile.primaryIssue,
    subIssues: profile.subIssues,
    legalDimensions: profile.legalDimensions,
    retrievalStrategy: profile.retrievalStrategy,
    targetAuthorities: profile.targetAuthorities,
    docIssues,
    docDimensions,
    docAuthorityType: authorityTypeOf(doc)
  };
}

function hasNegativeSignal(text = "") {
  const value = ` ${lower(text)} `;

  return [
    " not ",
    " except ",
    " unless ",
    " exempt ",
    " exempted ",
    " exemption ",
    " disallowed ",
    " prohibited ",
    " void ",
    " invalid ",
    " shall not ",
    " may not ",
    " must not ",
    " cannot ",
    " non-deductible ",
    " non taxable ",
    " non-taxable ",
    " not subject ",
    " not liable ",
    " excluded ",
    " denied ",
    " barred "
  ].some((token) => value.includes(token));
}

function hasMandatorySignal(text = "") {
  return /\b(shall|must|required|mandatory|jurisdictional|condition precedent|prerequisite|indispensable)\b/i.test(lower(text));
}

function hasPermissiveSignal(text = "") {
  return /\b(may|optional|directory|discretionary|allowed|permitted|substantial compliance)\b/i.test(lower(text));
}

function hasSubstantiveSignal(text = "") {
  return /\b(subject to|liable|taxable|exempt|zero-rated|gross income|deductible|non-deductible|tax base|tax rate|output vat|input vat|income tax|withholding tax|final tax|capital gains tax|percentage tax)\b/i.test(lower(text));
}

function hasProceduralSignal(text = "") {
  return /\b(file|filing|deadline|period|prescriptive|administrative claim|judicial claim|appeal|protest|assessment|loa|fan|fld|pan|return|form|remedy)\b/i.test(lower(text));
}

function hasEvidentiarySignal(text = "") {
  return /\b(invoice|receipt|substantiation|documentary|support|proof|evidence|certificate|schedule|reconciliation|records|books|burden of proof)\b/i.test(lower(text));
}

function hasJurisdictionalSignal(text = "") {
  return /\b(jurisdiction|jurisdictional|court has no jurisdiction|cta|120\+30|30-day|condition precedent|exhaustion)\b/i.test(lower(text));
}

function hasTemporalSignal(text = "") {
  return /\b(effective|effectivity|retroactive|prospective|prior to|after|before|beginning|taxable year|calendar year|transition|transitory|superseded|amended|repealed)\b/i.test(lower(text));
}

function hasContractualSignal(text = "") {
  return /\b(contract|agreement|clause|lease|concession|termination|obligation|consideration|control|risk allocation|risk transfer)\b/i.test(lower(text));
}

function hasEconomicSubstanceSignal(text = "") {
  return /\b(economic substance|substance over form|sham|simulation|business purpose|commercial reality|tax avoidance|tax evasion)\b/i.test(lower(text));
}

function hasAuditSignal(text = "") {
  return /\b(audit|working paper|pfrs|pas|afs|misstatement|assertion|sufficient appropriate audit evidence|qualified opinion)\b/i.test(lower(text));
}

function classifyDoctrineDimension(text = "") {
  const dimensions = [];

  if (hasSubstantiveSignal(text)) dimensions.push("SUBSTANTIVE");
  if (hasProceduralSignal(text)) dimensions.push("PROCEDURAL");
  if (hasEvidentiarySignal(text)) dimensions.push("EVIDENTIARY");
  if (hasJurisdictionalSignal(text)) dimensions.push("JURISDICTIONAL");
  if (hasTemporalSignal(text)) dimensions.push("TEMPORAL");
  if (hasContractualSignal(text)) dimensions.push("CONTRACTUAL");
  if (hasEconomicSubstanceSignal(text)) dimensions.push("ECONOMIC_SUBSTANCE");
  if (hasAuditSignal(text)) dimensions.push("AUDIT");

  if (!dimensions.length) dimensions.push("GENERAL");

  return unique(dimensions);
}

function sameOrRelatedTopic(topicA = "", topicB = "") {
  const a = lower(topicA);
  const b = lower(topicB);

  if (!a || !b) return true;
  if (a === b) return true;
  if (a === "general" || b === "general") return true;

  return a.includes(b) || b.includes(a);
}

function looksContradictory(a = "", b = "") {
  const x = lower(a);
  const y = lower(b);

  if (!x || !y || x === y) return false;

  const xNeg = hasNegativeSignal(x);
  const yNeg = hasNegativeSignal(y);

  const negationOpposition = xNeg !== yNeg;

  const mandatoryOpposition =
    (hasMandatorySignal(x) && hasPermissiveSignal(y)) ||
    (hasMandatorySignal(y) && hasPermissiveSignal(x));

  const taxableOpposition =
    (/\b(subject to tax|taxable|liable|subject to vat|subject to income tax|deductible|allowed as deduction)\b/i.test(x) &&
      /\b(not subject|exempt|non-taxable|excluded|non-deductible|not deductible|disallowed)\b/i.test(y)) ||
    (/\b(subject to tax|taxable|liable|subject to vat|subject to income tax|deductible|allowed as deduction)\b/i.test(y) &&
      /\b(not subject|exempt|non-taxable|excluded|non-deductible|not deductible|disallowed)\b/i.test(x));

  return negationOpposition || mandatoryOpposition || taxableOpposition;
}

function determineConflictKind({ textA = "", textB = "", authorityA = "", authorityB = "", sameIssue = null, oppositeHolding = null }) {
  const dimensionsA = classifyDoctrineDimension(textA);
  const dimensionsB = classifyDoctrineDimension(textB);

  const sameDimension =
    dimensionsA.includes("GENERAL") ||
    dimensionsB.includes("GENERAL") ||
    dimensionsA.some((item) => dimensionsB.includes(item));

  const contradictory = looksContradictory(textA, textB);
  const sameIssuePassed = sameIssue?.passed === true;
  const oppositeHoldingPassed = oppositeHolding?.passed === true;

  if (!sameIssuePassed) {
    return {
      status: "DISTINGUISHABLE_AUTHORITIES",
      label: "Distinguishable authorities",
      distinction:
        sameIssue?.reason ||
        "The authorities do not resolve the same exact legal issue.",
      dimensionsA,
      dimensionsB
    };
  }

  if (!sameDimension) {
    return {
      status: "APPARENT_CONFLICT",
      label: "Apparent conflict only",
      distinction:
        "The authorities address different legal dimensions, such as substantive liability versus procedural, evidentiary, jurisdictional, temporal, contractual, economic-substance, audit, or administrative compliance.",
      dimensionsA,
      dimensionsB
    };
  }

  if (!contradictory || !oppositeHoldingPassed) {
    return {
      status: "NO_CONFLICT",
      label: "No doctrinal conflict exists",
      distinction:
        oppositeHolding?.reason ||
        "The retrieved authorities do not state opposite holdings on the same issue.",
      dimensionsA,
      dimensionsB
    };
  }

  const sameAuthorityClass = authorityA === authorityB;

  return {
    status: sameAuthorityClass ? "DIRECT_CONFLICT" : "PARTIAL_CONFLICT",
    label: sameAuthorityClass ? "Direct conflict exists" : "Partial conflict exists",
    distinction: sameAuthorityClass
      ? "The authorities pass same-issue and opposite-holding gates within the same authority class."
      : "The authorities pass same-issue and opposite-holding gates but are issued by different authority levels and must be reconciled through hierarchy.",
    dimensionsA,
    dimensionsB
  };
}

function explainWhyControls({
  controllingAuthority,
  weakerAuthority,
  override = null,
  conflictKind = null
}) {
  if (override?.overrideApplies) {
    return (
      override.reason ||
      `${controllingAuthority} controls because binding judicial doctrine prevails over inconsistent administrative interpretation.`
    );
  }

  const status = conflictKind?.status || "";

  if (status === "APPARENT_CONFLICT" || status === "DISTINGUISHABLE_AUTHORITIES") {
    return "No controlling override is required if the difference is only apparent or distinguishable; limit each rule to its own substantive, procedural, evidentiary, temporal, jurisdictional, contractual, economic-substance, audit, administrative, or factual context.";
  }

  return `${controllingAuthority} controls over ${weakerAuthority} based on Philippine legal hierarchy and controlling precedence. Lower-authority administrative issuances cannot amend, expand, or defeat a higher-authority rule.`;
}

function buildResolutionExplanation({
  conflictKind,
  controllingAuthority,
  weakerAuthority,
  controlling,
  weaker,
  override = null,
  sameIssue = null,
  oppositeHolding = null
}) {
  const controllingTitle =
    sourceTitleOf(controlling) || sourcePathOf(controlling) || "controlling source";

  const weakerTitle =
    sourceTitleOf(weaker) || sourcePathOf(weaker) || "weaker source";

  return [
    `${conflictKind.label}.`,
    `Same-issue gate: ${sameIssue?.passed ? "PASSED" : "FAILED"}. ${sameIssue?.reason || ""}`,
    `Opposite-holding gate: ${oppositeHolding?.passed ? "PASSED" : "FAILED"}. ${oppositeHolding?.reason || ""}`,
    `Nature of distinction: ${conflictKind.distinction}`,
    `Source A/B dimensions: ${conflictKind.dimensionsA.join(", ")} versus ${conflictKind.dimensionsB.join(", ")}.`,
    `Controlling authority: ${controllingAuthority} (${controllingTitle}).`,
    `Weaker or limited authority: ${weakerAuthority} (${weakerTitle}).`,
    `Why it controls: ${explainWhyControls({
      controllingAuthority,
      weakerAuthority,
      override,
      conflictKind
    })}`
  ].join(" ");
}

function enrichDocForIssue(doc = {}, profile = {}) {
  const match = buildIssueClassificationMatch(profile, doc);

  return {
    ...doc,
    issueClassificationMatch: match,
    targetAuthorityMatch: match.targetAuthorityMatch,
    issueMismatch: match.issueMismatch
  };
}

export function compareDoctrinalPair(a = {}, b = {}, options = {}) {
  const profile = normalizeIssueClassification(options.issueClassification, [a, b]);

  const enrichedA = enrichDocForIssue(a, profile);
  const enrichedB = enrichDocForIssue(b, profile);

  if (enrichedA.issueMismatch || enrichedB.issueMismatch) return null;

  if (!enrichedA.issueClassificationMatch?.matched || !enrichedB.issueClassificationMatch?.matched) {
    return null;
  }

  const topicA = doctrinalTopicOf(enrichedA);
  const topicB = doctrinalTopicOf(enrichedB);

  if (!sameOrRelatedTopic(topicA, topicB)) return null;

  const textA = doctrineTextOf(enrichedA);
  const textB = doctrineTextOf(enrichedB);

  if (!textA || !textB) return null;

  const authorityA = authorityTypeOf(enrichedA);
  const authorityB = authorityTypeOf(enrichedB);

  let externalConflict = null;
  let sameIssue = null;
  let oppositeHolding = null;

  try {
    externalConflict = analyzeConflictPair(enrichedA, enrichedB);
    sameIssue = externalConflict?.sameIssueGate || sameIssueGate(enrichedA, enrichedB);
    oppositeHolding = externalConflict?.oppositeHoldingGate || oppositeHoldingGate(enrichedA, enrichedB);
  } catch {
    sameIssue = sameIssueGate(enrichedA, enrichedB);
    oppositeHolding = oppositeHoldingGate(enrichedA, enrichedB);
  }

  const conflictKind = determineConflictKind({
    textA,
    textB,
    authorityA,
    authorityB,
    sameIssue,
    oppositeHolding
  });

  if (conflictKind.status === "NO_CONFLICT") return null;

  if (
    ["DIRECT_CONFLICT", "PARTIAL_CONFLICT"].includes(conflictKind.status) &&
    !isGenuineConflict(enrichedA, enrichedB) &&
    !externalConflict?.conflict
  ) {
    return null;
  }

  const override = conflictKind.status === "PARTIAL_CONFLICT" || externalConflict?.conflict
    ? resolveCourtOverride(enrichedA, enrichedB)
    : null;

  const controlling = override?.winningSource
    ? override.winningSource
    : controllingPrecedenceOf(enrichedA) <= controllingPrecedenceOf(enrichedB)
      ? enrichedA
      : enrichedB;

  const weaker = override?.overriddenSource
    ? override.overriddenSource
    : controlling === enrichedA
      ? enrichedB
      : enrichedA;

  const controllingAuthority =
    override?.winningAuthority || authorityTypeOf(controlling);

  const weakerAuthority =
    override?.overriddenAuthority || authorityTypeOf(weaker);

  const explanation = buildResolutionExplanation({
    conflictKind,
    controllingAuthority,
    weakerAuthority,
    controlling,
    weaker,
    override,
    sameIssue,
    oppositeHolding
  });

  const trueConflict = ["DIRECT_CONFLICT", "PARTIAL_CONFLICT"].includes(conflictKind.status);

  return {
    conflict: trueConflict,
    doctrinalConflict: conflictKind.status === "DIRECT_CONFLICT",
    hierarchyConflict:
      conflictKind.status === "PARTIAL_CONFLICT" ||
      Boolean(override?.overrideApplies),
    apparentConflict: conflictKind.status === "APPARENT_CONFLICT",
    distinguishable: conflictKind.status === "DISTINGUISHABLE_AUTHORITIES",

    conflictStatus: conflictKind.status,
    conflictType: conflictKind.status,
    conflictLabel: conflictKind.label,

    sameIssueGate: sameIssue,
    oppositeHoldingGate: oppositeHolding,

    overrideApplied: Boolean(override?.overrideApplies),
    conflictTopic: sameOrRelatedTopic(topicA, topicB) ? topicA || topicB : "GENERAL",

    sourceA: sourcePathOf(enrichedA),
    sourceB: sourcePathOf(enrichedB),
    sourceATitle: sourceTitleOf(enrichedA),
    sourceBTitle: sourceTitleOf(enrichedB),

    controllingAuthority,
    controllingSource: sourcePathOf(controlling),
    controllingTitle: sourceTitleOf(controlling),

    weakerAuthority,
    weakerSource: sourcePathOf(weaker),
    weakerTitle: sourceTitleOf(weaker),

    reason: explanation,

    exactIssue:
      sameIssue?.sameIssues?.join(", ") ||
      externalConflict?.exactIssue ||
      "Not established",

    exactLegalDimension:
      sameIssue?.sameDimensions?.join(", ") ||
      externalConflict?.exactLegalDimension ||
      unique(conflictKind.dimensionsA.concat(conflictKind.dimensionsB)).join(", "),

    distinctionType: unique(
      conflictKind.dimensionsA.concat(conflictKind.dimensionsB)
    ).join(", "),

    resolutionBasis: trueConflict
      ? override?.overrideApplies
        ? "Court override applied because controlling judicial doctrine prevails over inconsistent administrative interpretation."
        : `Prefer ${controllingAuthority} based on Philippine legal hierarchy and controlling precedence.`
      : conflictKind.status === "APPARENT_CONFLICT"
        ? "Authorities should be harmonized because the apparent inconsistency arises from different legal dimensions."
        : "Authorities are distinguishable because same-issue or opposite-holding gate did not establish direct conflict.",

    issueClassification: profile,
    issueClassificationMatchA: enrichedA.issueClassificationMatch,
    issueClassificationMatchB: enrichedB.issueClassificationMatch,
    targetAuthorityMatchA: enrichedA.targetAuthorityMatch,
    targetAuthorityMatchB: enrichedB.targetAuthorityMatch,

    sourceAClaim: normalizeText(textA).slice(0, 700),
    sourceBClaim: normalizeText(textB).slice(0, 700),

    chronologyNote:
      "If one authority is later in time, later issuance may matter only if it validly amends, supersedes, or interprets within the limits of its authority. A later lower-authority issuance cannot override a higher-authority statute or Supreme Court doctrine.",

    plannerCompatibility: {
      requiresConflictDisclosure: trueConflict || conflictKind.status === "APPARENT_CONFLICT",
      requiresHierarchyExplanation:
        conflictKind.status === "PARTIAL_CONFLICT" || Boolean(override?.overrideApplies),
      requiresDoctrinalAnalysis: trueConflict,
      requiresApparentConflictCaution: conflictKind.status === "APPARENT_CONFLICT"
    },

    rendererCompatibility: {
      doctrinalStatusBlockRequired: true,
      hierarchyBlockRequired:
        conflictKind.status === "PARTIAL_CONFLICT" || Boolean(override?.overrideApplies),
      limitationLanguageRecommended: conflictKind.status === "APPARENT_CONFLICT"
    },

    auditRecord: {
      decisionType: override?.overrideApplies
        ? "COURT_OVERRIDE"
        : conflictKind.status === "APPARENT_CONFLICT"
          ? "APPARENT_CONFLICT_HARMONIZATION"
          : conflictKind.status === "DISTINGUISHABLE_AUTHORITIES"
            ? "DISTINGUISHABLE_AUTHORITIES"
            : "HIERARCHY_RESOLUTION",
      conflictStatus: conflictKind.status,
      controllingAuthority,
      weakerAuthority,
      controllingSource: sourcePathOf(controlling),
      weakerSource: sourcePathOf(weaker),
      distinctionType: unique(conflictKind.dimensionsA.concat(conflictKind.dimensionsB)),
      issueClassification: profile,
      tinaDoctrinalEngineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString()
    }
  };
}

export function detectDoctrinalConflicts(docs = [], options = {}) {
  const profile = normalizeIssueClassification(options.issueClassification, docs);
  const enrichedDocs = safeArray(docs)
    .map((doc) => enrichDocForIssue(doc, profile))
    .filter((doc) => doc.issueClassificationMatch?.matched && !doc.issueClassificationMatch?.issueMismatch);

  const conflicts = [];

  for (let i = 0; i < enrichedDocs.length; i += 1) {
    for (let j = i + 1; j < enrichedDocs.length; j += 1) {
      const result = compareDoctrinalPair(enrichedDocs[i], enrichedDocs[j], {
        issueClassification: profile
      });

      if (result) conflicts.push(result);
    }
  }

  const seen = new Set();

  return conflicts.filter((item) => {
    const key = [
      item.conflictTopic,
      item.controllingSource,
      item.weakerSource,
      item.controllingAuthority,
      item.weakerAuthority,
      item.conflictStatus,
      item.exactIssue
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectHierarchyConflict(topDocs = [], options = {}) {
  const profile = normalizeIssueClassification(options.issueClassification, topDocs);
  const docs = safeArray(topDocs)
    .map((doc) => enrichDocForIssue(doc, profile))
    .filter((doc) => doc.issueClassificationMatch?.matched && !doc.issueClassificationMatch?.issueMismatch);

  if (docs.length < 2) {
    return {
      conflict: false,
      doctrinalConflict: false,
      hierarchyConflict: false,
      apparentConflict: false,
      conflictStatus: "NO_CONFLICT",
      conflictType: "NO_CONFLICT",
      conflictLabel: "No doctrinal conflict exists",
      controllingAuthority: null,
      controllingSource: null,
      reason: "Insufficient issue-matched authorities for doctrinal conflict review.",
      exactIssue: null,
      exactLegalDimension: null,
      distinctionType: null,
      conflictingDocs: [],
      overrideApplied: false,
      weakerAuthority: null,
      weakerSource: null,
      auditRecord: null,
      issueClassification: profile
    };
  }

  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const pair = compareDoctrinalPair(docs[i], docs[j], {
        issueClassification: profile
      });

      if (pair) {
        return {
          conflict: Boolean(pair.conflict),
          doctrinalConflict: Boolean(pair.doctrinalConflict),
          hierarchyConflict: Boolean(pair.hierarchyConflict),
          apparentConflict: Boolean(pair.apparentConflict),
          distinguishable: Boolean(pair.distinguishable),
          conflictStatus: pair.conflictStatus,
          conflictType: pair.conflictType,
          conflictLabel: pair.conflictLabel,
          controllingAuthority: pair.controllingAuthority,
          controllingSource: pair.controllingSource,
          reason: pair.reason,
          exactIssue: pair.exactIssue,
          exactLegalDimension: pair.exactLegalDimension,
          distinctionType: pair.distinctionType,
          sameIssueGate: pair.sameIssueGate,
          oppositeHoldingGate: pair.oppositeHoldingGate,
          conflictingDocs: [docs[i], docs[j]],
          sourceA: pair.sourceA,
          sourceB: pair.sourceB,
          overrideApplied: Boolean(pair.overrideApplied),
          weakerAuthority: pair.weakerAuthority,
          weakerSource: pair.weakerSource,
          chronologyNote: pair.chronologyNote,
          resolutionBasis: pair.resolutionBasis,
          plannerCompatibility: pair.plannerCompatibility,
          rendererCompatibility: pair.rendererCompatibility,
          auditRecord: pair.auditRecord || null,
          issueClassification: profile
        };
      }
    }
  }

  return {
    conflict: false,
    doctrinalConflict: false,
    hierarchyConflict: false,
    apparentConflict: false,
    conflictStatus: "NO_CONFLICT",
    conflictType: "NO_CONFLICT",
    conflictLabel: "No doctrinal conflict exists",
    controllingAuthority: null,
    controllingSource: null,
    reason:
      "No direct doctrinal conflict was detected after same-issue, same-dimension, opposite-holding, hierarchy, and issue-classification review.",
    exactIssue: null,
    exactLegalDimension: null,
    distinctionType: null,
    conflictingDocs: [],
    overrideApplied: false,
    weakerAuthority: null,
    weakerSource: null,
    auditRecord: null,
    issueClassification: profile
  };
}

export function summarizeDoctrinalStatus(conflicts = []) {
  if (!Array.isArray(conflicts) || conflicts.length === 0) {
    return {
      status: "NO_CONFLICT",
      label: "No doctrinal conflict exists",
      explanation:
        "No direct doctrinal conflict was detected from the compared issue-matched authorities. Differences in procedural, evidentiary, jurisdictional, factual, temporal, contractual, economic-substance, audit, or administrative requirements should be treated as distinctions unless the authorities directly contradict on the same legal issue."
    };
  }

  const direct = conflicts.find((item) => item.conflictStatus === "DIRECT_CONFLICT");
  if (direct) {
    return {
      status: "DIRECT_CONFLICT",
      label: "Direct conflict exists",
      explanation: direct.reason
    };
  }

  const partial = conflicts.find((item) => item.conflictStatus === "PARTIAL_CONFLICT");
  if (partial) {
    return {
      status: "PARTIAL_CONFLICT",
      label: "Partial conflict exists",
      explanation: partial.reason
    };
  }

  const apparent = conflicts.find((item) => item.conflictStatus === "APPARENT_CONFLICT");
  if (apparent) {
    return {
      status: "APPARENT_CONFLICT",
      label: "Apparent conflict only",
      explanation: apparent.reason
    };
  }

  const distinguishable = conflicts.find((item) => item.conflictStatus === "DISTINGUISHABLE_AUTHORITIES");
  if (distinguishable) {
    return {
      status: "DISTINGUISHABLE_AUTHORITIES",
      label: "Distinguishable authorities",
      explanation: distinguishable.reason
    };
  }

  return {
    status: "NO_CONFLICT",
    label: "No doctrinal conflict exists",
    explanation:
      "No direct doctrinal conflict was detected after hierarchy, same-issue, same-dimension, and opposite-holding review."
  };
}

export function reconcileDoctrine({
  rankedDocs = [],
  maxDocs = 5,
  issueClassification = null
} = {}) {
  const profile = normalizeIssueClassification(issueClassification, rankedDocs);

  const topDocs = safeArray(rankedDocs)
    .map((doc) => enrichDocForIssue(doc, profile))
    .filter((doc) => doc.issueClassificationMatch?.matched && !doc.issueClassificationMatch?.issueMismatch)
    .sort((a, b) => {
      const targetDiff = Number(b.targetAuthorityMatch === true) - Number(a.targetAuthorityMatch === true);
      if (targetDiff !== 0) return targetDiff;

      const precedenceDiff = controllingPrecedenceOf(a) - controllingPrecedenceOf(b);
      if (precedenceDiff !== 0) return precedenceDiff;

      return authorityLevelOf(a) - authorityLevelOf(b);
    })
    .slice(0, maxDocs);

  const hierarchyConflict = detectHierarchyConflict(topDocs, {
    issueClassification: profile
  });

  const doctrinalConflicts = detectDoctrinalConflicts(topDocs, {
    issueClassification: profile
  });

  const doctrinalStatus = summarizeDoctrinalStatus(doctrinalConflicts);

  return {
    engine: "TINA_DOCTRINAL_ENGINE",
    version: ENGINE_VERSION,
    issueClassification: profile,
    topDocs,
    hierarchyConflict,
    doctrinalConflicts,
    doctrinalStatus,
    hasConflict:
      hierarchyConflict.conflict ||
      doctrinalConflicts.some((item) =>
        ["DIRECT_CONFLICT", "PARTIAL_CONFLICT"].includes(item.conflictStatus)
      ),
    hasApparentConflict:
      hierarchyConflict.apparentConflict ||
      doctrinalConflicts.some((item) => item.conflictStatus === "APPARENT_CONFLICT"),
    explanation: doctrinalStatus.explanation,
    plannerCompatibility: {
      requiresConflictDisclosure:
        hierarchyConflict.conflict ||
        hierarchyConflict.apparentConflict ||
        doctrinalConflicts.length > 0,
      requiresHierarchyExplanation: Boolean(hierarchyConflict.hierarchyConflict),
      requiresDoctrinalAnalysis:
        doctrinalStatus.status !== "NO_CONFLICT",
      requiresApparentConflictCaution:
        doctrinalStatus.status === "APPARENT_CONFLICT"
    },
    rendererCompatibility: {
      doctrinalStatusBlockRequired: true,
      hierarchyBlockRequired: Boolean(hierarchyConflict.hierarchyConflict),
      limitationLanguageRecommended:
        doctrinalStatus.status === "APPARENT_CONFLICT"
    }
  };
}

export function doctrinalEngineHealthCheck() {
  return {
    ok: true,
    engine: "TINA_DOCTRINAL_ENGINE",
    version: ENGINE_VERSION,
    esmCompatible: true,
    commonJsBridgeCompatible: false,
    conflictEngineCompatible: true,
    authorityEngineCompatible: true,
    plannerCompatible: true,
    rendererCompatible: true,
    issueClassificationCompatible: true,
    targetAuthorityAware: true,
    sameIssueGateRequired: true,
    oppositeHoldingGateRequired: true,
    unrelatedDoctrineConflictBlocked: true
  };
}

export {
  ENGINE_VERSION,
  normalizeIssueClassification,
  buildIssueClassificationMatch,
  classifyDoctrineDimension
};

export default {
  compareDoctrinalPair,
  detectDoctrinalConflicts,
  detectHierarchyConflict,
  summarizeDoctrinalStatus,
  reconcileDoctrine,
  doctrinalEngineHealthCheck
};
