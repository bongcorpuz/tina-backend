// FILE: tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs
// PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1
//
// Validates the pure, standalone 2026 BIR audit baseline integration
// scaffold and its fixture/report. NO server/ask-handler/pipeline/route
// import, NO OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR
// calls, NO web search, NO browser automation, NO server start, NO port
// binding, NO staging/production/localhost calls, NO env secret reads, NO
// HTTP requests of any kind, NO live authority retrieval/scraping/
// download/ingestion/embedding/database write of any kind.

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  PHASE_09S_2026_BIR_AUDIT_BASELINE_INTEGRATION_VERSION,
  BIR_2026_AUDIT_BASELINE_INTEGRATION_MODE_ID,
  SUPPORTED_2026_AUDIT_BASELINE_TOPICS,
  SUPPORTED_2026_AUDIT_BASELINE_AUTHORITY_REFERENCES,
  SUPPORTED_2026_AUDIT_BASELINE_SIGNAL_TYPES,
  SUPPORTED_2026_AUDIT_BASELINE_ROUTES,
  SUPPORTED_2026_AUDIT_BASELINE_RISK_LEVELS,
  createBir2026AuditBaselineIntegrationResult,
  normalizeBir2026AuditBaselineIntegrationInput,
  validateBir2026AuditBaselineIntegrationInput,
  validateBir2026AuditBaselineIntegrationResult
} from "../workflow/bir-2026-audit-baseline-integration.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.fixture.json";
const REPORT_PATH = "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1_REPORT.md";
const MODULE_PATH = "workflow/bir-2026-audit-baseline-integration.js";
const SELF_PATH = "tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09S 2026 BIR AUDIT BASELINE INTEGRATION SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09S 2026 BIR AUDIT BASELINE INTEGRATION SCAFFOLD FAIL",
  "PHASE 09S 2026 BIR AUDIT BASELINE INTEGRATION SCAFFOLD BLOCKED"
];

// Known-real reference-corpus fragments supplied only as a private do-not-
// leak list for this task; must never appear in fixtures/tests/reports.
const REAL_TAXPAYER_NAME_FRAGMENTS = Object.freeze(["TRUE FREIGHT GLOBAL LOGISTICS INC", "ALL ECARS INC", "SOCIAL HOMES INCORPORATED"]);
const REAL_OFFICER_NAME_FRAGMENTS = Object.freeze([
  "SUSAN F. SANTIAGO",
  "RENATO N. MOLINA",
  "PATRICIA ANN H. GUTIERREZ",
  "MARIA RUBIE AGANAN",
  "BRENNA ROSE VENERAYAN",
  "CECILLE ASILO",
  "MYRABEL DELA CRUZ",
  "AL-HELMEY F. ABDULRASHID",
  "ETHEL C. EVANGELISTA"
]);
const REAL_ELA_NUMBER_FRAGMENTS = Object.freeze(["eLA202400099140", "eLA202300040925", "eLA20240018917", "eLA202400055996"]);
const REAL_AUDIT_CASE_NUMBER_FRAGMENTS = Object.freeze(["AUDM16-00.8A-2025-016972", "AUDM29-048-2024-027259", "AUDM29-041-2026-150797"]);
const REAL_TIN_FRAGMENTS = Object.freeze(["008-826-456-000", "010-841-602-000", "005-055-069-00000"]);
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "15,000.00", "13,106,907.66", "13,545,329.75"]);

let passed = 0;
let failed = 0;
let assertions = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
  }
}
function check(condition, message) {
  assertions += 1;
  assert(condition, message);
}
function isPlainObjectLocal(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function safeInput(scenarioOverrides = {}, overrides = {}) {
  return {
    userQuery: "Integrate 2026 BIR audit baseline for a synthetic scenario involving SAMPLE TAXPAYER INC.",
    scenarioFacts: {
      noticeType: "BIR_ELECTRONIC_LOA",
      taxablePeriod: "CY20XX",
      taxTypes: ["INCOME_TAX", "VAT"],
      ...scenarioOverrides
    },
    sourceCards: [],
    ...overrides
  };
}

/**
 * Usage-based forbidden-pattern scan. Deliberately avoids bare substring
 * matching on service names (which would also match legitimate "does not
 * call X" documentation/comments); instead it looks for actual code-shaped
 * usage: import/require of a forbidden package, actual network-call
 * syntax, process.env.<NAME> reads, header-assignment syntax, or import of
 * a runtime/server file. This is safe to run against this test's own
 * source as well as the module/fixture/report, since descriptive prose
 * never matches these patterns.
 *
 * @param {string} source
 * @returns {string[]} list of violation descriptions (empty if clean)
 */
function scanForbiddenUsage(source) {
  const violations = [];

  const forbiddenPackagePattern =
    /\b(?:import\s+.*from\s+|require\()\s*["'](openai|@supabase\/[^"']*|firecrawl|crawlee|@modelcontextprotocol\/[^"']*|n8n|tesseract\.js|node-tesseract)["']/i;
  if (forbiddenPackagePattern.test(source)) violations.push("import/require of a forbidden service package");

  const forbiddenRuntimeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*(?:server|ask-handler|pipeline)(?:\.js)?["']/i;
  if (forbiddenRuntimeImportPattern.test(source)) violations.push("import of server/ask-handler/pipeline");

  const routeImportPattern = /\bfrom\s+["'](?:\.\.?\/)*routes\/[^"']*["']/i;
  if (routeImportPattern.test(source)) violations.push("import of a route file");

  const networkCallPattern = /\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(|\bXMLHttpRequest\s*\(/;
  if (networkCallPattern.test(source)) violations.push("network call syntax (fetch/axios/http.request/https.request/XMLHttpRequest)");

  if (/process\.env\.\w/.test(source)) violations.push("process.env.<NAME> read");

  if (/["'`]authorization["'`]\s*:/i.test(source)) violations.push("Authorization header assignment syntax");

  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  if (indexSecretUsagePattern.test(source)) violations.push("shared-secret env var assignment syntax");

  if (/\bapp\.post\s*\(|\brouter\.post\s*\(/.test(source)) violations.push("app.post/router.post route registration syntax");

  const expressImportPattern = /\b(?:import\s+.*from\s+|require\()\s*["']express["']/i;
  if (expressImportPattern.test(source)) violations.push("import/require of express");

  const embeddingCallPattern = /\bembeddings?\.create\s*\(|\bcreateEmbedding\s*\(|vectorSearch\s*\(/i;
  if (embeddingCallPattern.test(source)) violations.push("embedding/vector-search call syntax");

  const ocrCallPattern = /\bocr\s*\(|\brecognize\s*\(\s*[^)]*image|Tesseract\.(recognize|create)\s*\(/i;
  if (ocrCallPattern.test(source)) violations.push("OCR call syntax");

  const scrapeDownloadCallPattern = /\bscrape\s*\(|\bcheerio\.load\s*\(|\bpuppeteer\.|\bplaywright\./i;
  if (scrapeDownloadCallPattern.test(source)) violations.push("scraping/browser-automation call syntax");

  const modelCallPattern = /\bopenai\.chat|\bmodel\s*\.\s*call\s*\(|\bcompletions\.create\s*\(/i;
  if (modelCallPattern.test(source)) violations.push("model call syntax");

  return violations;
}

let fx;
const isPass = () => fx.decision === VALID_DECISIONS[0];
const isFail = () => fx.decision === VALID_DECISIONS[1];
const isBlocked = () => fx.decision === VALID_DECISIONS[2];

// 1. Fixture exists and valid JSON.
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2. Fixture patch id matches.
await test("fixture patch id matches PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1", () => {
  check(fx.patch === "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1", "patch id");
});

// 3. Fixture decision is valid.
await test("fixture decision is valid", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 4. Base commit is 4d88ee6.
await test("base commit is 4d88ee6", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("4d88ee6"), "base commit references 4d88ee6");
});

// 5. nonRuntimePatch is true.
await test("nonRuntimePatch declares every safety field true", () => {
  const n = fx.nonRuntimePatch;
  check(isPlainObjectLocal(n), "nonRuntimePatch present");
  for (const key of Object.keys(n)) {
    check(n[key] === true, `nonRuntimePatch.${key} must be true`);
  }
});

// 6-8. Module exports, version constant, mode id.
await test("module exports expected constants/functions; version and mode id are correct", () => {
  check(typeof PHASE_09S_2026_BIR_AUDIT_BASELINE_INTEGRATION_VERSION === "string", "version export present");
  check(typeof BIR_2026_AUDIT_BASELINE_INTEGRATION_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_2026_AUDIT_BASELINE_TOPICS), "supported baseline topics export present");
  check(Array.isArray(SUPPORTED_2026_AUDIT_BASELINE_AUTHORITY_REFERENCES), "supported authority references export present");
  check(Array.isArray(SUPPORTED_2026_AUDIT_BASELINE_SIGNAL_TYPES), "supported signal types export present");
  check(Array.isArray(SUPPORTED_2026_AUDIT_BASELINE_ROUTES), "supported routes export present");
  check(Array.isArray(SUPPORTED_2026_AUDIT_BASELINE_RISK_LEVELS), "supported risk levels export present");
  check(typeof createBir2026AuditBaselineIntegrationResult === "function", "createBir2026AuditBaselineIntegrationResult export present");
  check(typeof normalizeBir2026AuditBaselineIntegrationInput === "function", "normalizeBir2026AuditBaselineIntegrationInput export present");
  check(typeof validateBir2026AuditBaselineIntegrationInput === "function", "validateBir2026AuditBaselineIntegrationInput export present");
  check(typeof validateBir2026AuditBaselineIntegrationResult === "function", "validateBir2026AuditBaselineIntegrationResult export present");
  check(PHASE_09S_2026_BIR_AUDIT_BASELINE_INTEGRATION_VERSION === "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1", "version matches patch id");
  check(BIR_2026_AUDIT_BASELINE_INTEGRATION_MODE_ID === "bir_2026_audit_baseline_integration", "mode id equals bir_2026_audit_baseline_integration");
});

// 9-13. Supported topics/authority references/signal types/routes/risk levels.
await test("supported baseline topics, authority references, signal types, routes, and risk levels include all required entries", () => {
  for (const topic of [
    "SINGLE_INSTANCE_AUDIT_FRAMEWORK",
    "ONE_ELA_PER_TAXABLE_YEAR",
    "ALL_TAX_TYPES_IN_ONE_ELA",
    "CONSOLIDATION_OF_PENDING_ELAS",
    "REPLACEMENT_ELA_FOR_CONSOLIDATION",
    "REPLACEMENT_ELA_FOR_CONTINUITY",
    "PRIOR_LOA_ELA_VALIDITY",
    "PROSPECTIVE_APPLICATION_OF_RMO_1_2026",
    "MULTIPLE_ELAS_SAME_TAXPAYER_YEAR",
    "VAT_NON_CONSOLIDATION_REQUEST",
    "VATAS_LTVAU_TRANSITION",
    "VAT_REFUND_TRANSITION",
    "MISSION_ORDER",
    "TAX_VERIFICATION_NOTICE",
    "TVN_LIMITED_SCOPE",
    "TVN_SCOPE_EXPANSION_RISK",
    "STANDARDIZED_CHECKLIST",
    "ADDITIONAL_DOCUMENT_REQUEST_LIMITS",
    "DOCUMENT_REQUEST_RELEVANCE_NECESSITY_SCOPE",
    "VOLUMINOUS_RECORDS",
    "ON_PREMISE_EXAMINATION",
    "CERTIFIED_COPY_SUBMISSION",
    "NOD_DOD_DOCUMENTATION",
    "PAN_CONSOLIDATION_SAFEGUARDS",
    "CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD",
    "FAN_CONSOLIDATION_SAFEGUARDS",
    "CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD",
    "FDDA_NO_CONSOLIDATION",
    "FINAL_EXECUTORY_FAN_NO_CONSOLIDATION",
    "PROPER_SERVICE",
    "WRITTEN_CONFORMITY_TO_CONSOLIDATION",
    "WAIVER_OF_PRESCRIPTION",
    "NO_REGRESSION_RULE",
    "PRIOR_NOTICES_CHECKLISTS_SUBPOENAS_UNDER_REPLACEMENT_ELA",
    "AUDIT_SAFEGUARDS",
    "UNKNOWN_2026_BASELINE_TOPIC"
  ]) {
    check(SUPPORTED_2026_AUDIT_BASELINE_TOPICS.includes(topic), `supported baseline topics include ${topic}`);
  }

  for (const ref of [
    "RMO_NO_1_2026",
    "RMO_NO_6_2026",
    "RMC_NO_14_2026",
    "RMC_NO_8_2026",
    "RMC_NO_5_2026",
    "RMC_NO_107_2025",
    "RR_NO_18_2013",
    "RR_NO_12_99_AS_AMENDED",
    "NIRC_SEC_203",
    "NIRC_SEC_222",
    "NIRC_SEC_228",
    "NIRC_SEC_232",
    "CTA_RULES",
    "LOA_ELA_JURISPRUDENCE",
    "ASSESSMENT_DUE_PROCESS_JURISPRUDENCE",
    "PRESCRIPTION_JURISPRUDENCE",
    "UNKNOWN_AUTHORITY_REFERENCE"
  ]) {
    check(SUPPORTED_2026_AUDIT_BASELINE_AUTHORITY_REFERENCES.includes(ref), `supported authority references include ${ref}`);
  }

  for (const signalType of [
    "authority_timing_signal",
    "replacement_ela_signal",
    "consolidation_signal",
    "vat_transition_signal",
    "document_request_signal",
    "notice_stage_signal",
    "deadline_signal",
    "service_signal",
    "prescription_signal",
    "scope_signal",
    "safeguard_signal",
    "human_review_signal",
    "unknown_signal"
  ]) {
    check(SUPPORTED_2026_AUDIT_BASELINE_SIGNAL_TYPES.includes(signalType), `supported signal types include ${signalType}`);
  }

  for (const route of [
    "AUTHORITY_SAFE_PROCEDURAL_FALLBACK",
    "BIR_NOTICE_TRIAGE",
    "PAN_FAN_FLD_PROTEST_WORKFLOW",
    "BIR_AUDIT_DEFENSE_MATRIX",
    "DOCUMENT_COMPLIANCE_TRANSMITTAL",
    "AUTHORITY_CORPUS_RESEARCH",
    "HUMAN_TAX_LEGAL_REVIEW",
    "PHASE_09_GATE_CLOSURE_REVIEW"
  ]) {
    check(SUPPORTED_2026_AUDIT_BASELINE_ROUTES.includes(route), `supported routes include ${route}`);
  }

  for (const level of ["low", "medium", "high", "critical", "unknown"]) {
    check(SUPPORTED_2026_AUDIT_BASELINE_RISK_LEVELS.includes(level), `supported risk levels include ${level}`);
  }
});

// 14. Missing input is rejected.
await test("missing input is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput(undefined).valid === false, "missing input rejected");
  check(validateBir2026AuditBaselineIntegrationInput(null).valid === false, "null input rejected");
  check(validateBir2026AuditBaselineIntegrationInput({}).valid === false, "empty input (no userQuery/targetTopics) rejected");
});

// 15. Unsupported target topic is rejected.
await test("unsupported target topic is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ targetTopics: ["NOT_A_TOPIC"] }).valid === false, "unsupported target topic rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ authorityReferences: ["NOT_A_REFERENCE"] }).valid === false, "unsupported authority reference rejected");
});

// 16. Unsafe runtime/legal/live options are rejected.
await test("unsafe runtime/legal/live options are rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { generateFilingReadyDocument: true } }).valid === false, "generateFilingReadyDocument true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { automaticSubmission: true } }).valid === false, "automaticSubmission true rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", options: { scaffoldOnly: false } }).valid === false, "scaffoldOnly false rejected");
});

// 17. Source card claiming final verification is rejected.
await test("source card claiming final verification is rejected", () => {
  check(
    validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
});

// 18. Source card claiming final legal conclusion is rejected.
await test("source card claiming final legal conclusion is rejected", () => {
  check(
    validateBir2026AuditBaselineIntegrationInput({ userQuery: "x", sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
});

// 19. Request to wire to /ask is rejected.
await test("request to wire to /ask is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "please wire this to /ask" }).valid === false, "wire to /ask request rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "please integrate this with /ask" }).valid === false, "integrate with /ask request rejected");
});

// 20. Request to search/scrape/download/ingest/OCR is rejected.
await test("request to search/scrape/download/ingest/OCR is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "please scrape the bir website" }).valid === false, "scrape request rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "download the RMO PDF" }).valid === false, "download request rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "search the web for the latest RMC" }).valid === false, "web search request rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "ingest this ruling into the corpus" }).valid === false, "ingest request rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "run OCR on this scanned notice" }).valid === false, "OCR request rejected");
});

// 21-25. Real reference-corpus data rejections.
await test("real taxpayer reference fragment is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
});
await test("real LOA/eLA number is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
});
await test("real audit case number is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
});
await test("real officer name is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
});
await test("exact real amount is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}` }).valid === false, "real assessment amount rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: `TIN ${REAL_TIN_FRAGMENTS[0]}` }).valid === false, "real TIN rejected");
});

await test("sanity: safe input is valid and finality-claim phrasing is rejected", () => {
  check(validateBir2026AuditBaselineIntegrationInput(safeInput()).valid === true, "safe input validates");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "this replacement ela is valid" }).valid === false, "finality claim rejected");
  check(validateBir2026AuditBaselineIntegrationInput({ userQuery: "this fan is invalid" }).valid === false, "invalidity claim rejected");
});

// 26. Replacement eLA continuity scenario creates valid result.
await test("replacement eLA continuity scenario creates valid result", () => {
  const result = createBir2026AuditBaselineIntegrationResult(
    safeInput({ noticeType: "BIR_REPLACEMENT_ELA", replacementEla: true, replacementReason: "continuity", sameTaxpayer: true, sameTaxablePeriod: true, sameScope: true })
  );
  check(validateBir2026AuditBaselineIntegrationResult(result).valid === true, "replacement eLA continuity result must validate");
});

// 27. Replacement eLA sets replacementElaSignal true.
await test("replacement eLA sets replacementElaSignal true", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ replacementEla: true, replacementReason: "continuity" }));
  check(result.replacementElaReview.replacementElaSignal === true, "replacementElaSignal true");
});

// 28. Replacement eLA sets rmc14/rmo1/rmo6 review needed.
await test("replacement eLA sets rmc14/rmo1/rmo6 review needed", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ replacementEla: true, replacementReason: "continuity" }));
  check(result.replacementElaReview.rmc14ReviewNeeded === true, "rmc14ReviewNeeded true");
  check(result.replacementElaReview.rmo1ReviewNeeded === true, "rmo1ReviewNeeded true");
  check(result.replacementElaReview.rmo6ReviewNeeded === true, "rmo6ReviewNeeded true");
});

// 29. Replacement eLA with scope expansion flags risk.
await test("replacement eLA with scope expansion flags risk", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ replacementEla: true, replacementReason: "restructuring", sameScope: false }));
  check(result.replacementElaReview.scopeExpansionRisk === true, "scopeExpansionRisk true when sameScope is false");
});

// 30. Multiple eLAs same year triggers consolidation potential.
await test("multiple eLAs same year triggers consolidation potential", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ multipleAuthoritiesSameYear: true }));
  check(result.consolidationReview.consolidationPotential === true, "consolidationPotential true");
  check(result.baselineSummary.triggeredTopics.includes("MULTIPLE_ELAS_SAME_TAXPAYER_YEAR"), "MULTIPLE_ELAS_SAME_TAXPAYER_YEAR topic triggered");
});

// 31. Consolidated PAN sets fresh response period potential.
await test("consolidated PAN sets fresh response period potential", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ consolidatedPan: true }));
  check(result.consolidationReview.freshPanResponsePeriodPotential === true, "freshPanResponsePeriodPotential true");
  check(result.baselineSummary.triggeredTopics.includes("CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD"), "CONSOLIDATED_PAN_FRESH_RESPONSE_PERIOD topic triggered");
});

// 32. Consolidated FAN sets fresh protest period potential.
await test("consolidated FAN sets fresh protest period potential", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ consolidatedFan: true }));
  check(result.consolidationReview.freshFanProtestPeriodPotential === true, "freshFanProtestPeriodPotential true");
  check(result.baselineSummary.triggeredTopics.includes("CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD"), "CONSOLIDATED_FAN_FRESH_PROTEST_PERIOD topic triggered");
});

// 33. FDDA-stage scenario sets FDDA_NO_CONSOLIDATION topic.
await test("FDDA-stage scenario sets FDDA_NO_CONSOLIDATION topic", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ fddaStage: true }));
  check(result.consolidationReview.fddaStage === true, "consolidationReview.fddaStage true");
  check(result.baselineSummary.triggeredTopics.includes("FDDA_NO_CONSOLIDATION"), "FDDA_NO_CONSOLIDATION topic triggered");
});

// 34. Final/executory FAN scenario sets FINAL_EXECUTORY_FAN_NO_CONSOLIDATION topic.
await test("final/executory FAN scenario sets FINAL_EXECUTORY_FAN_NO_CONSOLIDATION topic", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ finalExecutoryFan: true }));
  check(result.consolidationReview.finalExecutoryFan === true, "consolidationReview.finalExecutoryFan true");
  check(result.baselineSummary.triggeredTopics.includes("FINAL_EXECUTORY_FAN_NO_CONSOLIDATION"), "FINAL_EXECUTORY_FAN_NO_CONSOLIDATION topic triggered");
});

// 35. VATAS/LTVAU scenario sets transition review.
await test("VATAS/LTVAU scenario sets transition review", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ vatAuditInvolved: true, vatasOrLtvauInvolved: true }));
  check(result.vatTransitionReview.vatasOrLtvauInvolved === true, "vatasOrLtvauInvolved true");
  check(result.baselineSummary.triggeredTopics.includes("VATAS_LTVAU_TRANSITION"), "VATAS_LTVAU_TRANSITION topic triggered");
});

// 36. VAT refund scenario sets refund transition potential.
await test("VAT refund scenario sets refund transition potential", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ vatAuditInvolved: true, vatRefundInvolved: true }));
  check(result.vatTransitionReview.vatRefundTransitionPotential === true, "vatRefundTransitionPotential true");
  check(result.baselineSummary.triggeredTopics.includes("VAT_REFUND_TRANSITION"), "VAT_REFUND_TRANSITION topic triggered");
});

// 37. TVN scenario sets limited-scope check.
await test("TVN scenario sets limited-scope check", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ tvnInvolved: true }));
  check(result.tvnReview.tvnLimitedScopeCheckNeeded === true, "tvnLimitedScopeCheckNeeded true");
  check(result.baselineSummary.triggeredTopics.includes("TVN_LIMITED_SCOPE"), "TVN_LIMITED_SCOPE topic triggered");
});

// 38. TVN scope expansion scenario flags risk.
await test("TVN scope expansion scenario flags risk", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ tvnInvolved: true, tvnScopeExpansion: true }));
  check(result.tvnReview.tvnScopeExpansionRisk === true, "tvnScopeExpansionRisk true");
  check(result.baselineSummary.triggeredTopics.includes("TVN_SCOPE_EXPANSION_RISK"), "TVN_SCOPE_EXPANSION_RISK topic triggered");
});

// 39. Checklist scenario sets standardized checklist check.
await test("checklist scenario sets standardized checklist check", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ checklistInvolved: true }));
  check(result.documentRequestReview.standardizedChecklistCheckNeeded === true, "standardizedChecklistCheckNeeded true");
  check(result.baselineSummary.triggeredTopics.includes("STANDARDIZED_CHECKLIST"), "STANDARDIZED_CHECKLIST topic triggered");
});

// 40. Additional request scenario sets relevance/necessity/scope checks.
await test("additional request scenario sets relevance/necessity/scope checks", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ additionalDocumentRequest: true }));
  check(result.documentRequestReview.relevanceCheckNeeded === true, "relevanceCheckNeeded true");
  check(result.documentRequestReview.necessityCheckNeeded === true, "necessityCheckNeeded true");
  check(result.documentRequestReview.auditScopeCheckNeeded === true, "auditScopeCheckNeeded true");
  check(result.documentRequestReview.additionalRequestLimitCheckNeeded === true, "additionalRequestLimitCheckNeeded true");
});

// 41. Voluminous records scenario sets on-premise/certified-copy potentials.
await test("voluminous records scenario sets on-premise/certified-copy potentials", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ voluminousRecords: true }));
  check(result.documentRequestReview.onPremiseExaminationPotential === true, "onPremiseExaminationPotential true");
  check(result.documentRequestReview.certifiedCopySubmissionPotential === true, "certifiedCopySubmissionPotential true");
});

// 42. Waiver scenario sets waiver check.
await test("waiver scenario sets waiver check", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ waiverOfPrescriptionPresent: true }));
  check(result.consolidationReview.waiverCheckNeeded === true, "waiverCheckNeeded true");
  check(result.baselineSummary.triggeredTopics.includes("WAIVER_OF_PRESCRIPTION"), "WAIVER_OF_PRESCRIPTION topic triggered");
});

// 43. Written conformity scenario sets written conformity check.
await test("written conformity scenario sets written conformity check", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ writtenConformityPresent: true }));
  check(result.consolidationReview.writtenConformityCheckNeeded === true, "writtenConformityCheckNeeded true");
  check(result.baselineSummary.triggeredTopics.includes("WRITTEN_CONFORMITY_TO_CONSOLIDATION"), "WRITTEN_CONFORMITY_TO_CONSOLIDATION topic triggered");
});

// 44. LOA received in 2026 scenario routes to fallback, triage, document compliance, authority research, human review.
await test("LOA received in 2026 scenario routes to fallback, triage, document compliance, authority research, human review", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput({ noticeType: "BIR_ELECTRONIC_LOA", postRmo1Authority: true }));
  check(result.integrationRoutes.authoritySafeFallback === true, "authoritySafeFallback true");
  check(result.integrationRoutes.noticeTriage === true, "noticeTriage true");
  check(result.integrationRoutes.documentComplianceTransmittal === true, "documentComplianceTransmittal true");
  check(result.integrationRoutes.authorityCorpusResearch === true, "authorityCorpusResearch true");
  check(result.integrationRoutes.humanReview === true, "humanReview true");
});

// 45-49. Source cards include required baseline references.
await test("source cards include RMO No. 1-2026", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(result.sourceCards.some((c) => /RMO No\. 1-2026/i.test(c.label)), "RMO No. 1-2026 source card present");
});
await test("source cards include RMO No. 6-2026", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(result.sourceCards.some((c) => /RMO No\. 6-2026/i.test(c.label)), "RMO No. 6-2026 source card present");
});
await test("source cards include RMC No. 14-2026", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(result.sourceCards.some((c) => /RMC No\. 14-2026/i.test(c.label)), "RMC No. 14-2026 source card present");
});
await test("source cards include RMC No. 5-2026", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(result.sourceCards.some((c) => /RMC No\. 5-2026/i.test(c.label)), "RMC No. 5-2026 source card present");
});
await test("source cards include RR No. 18-2013/NIRC Sec. 228", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(result.sourceCards.some((c) => /RR No\. 18-2013/i.test(c.label) && /NIRC Sec\. 228/i.test(c.label)), "RR No. 18-2013/NIRC Sec. 228 source card present");
});

// 50. Source cards do not claim live verification.
await test("source cards do not claim live verification", () => {
  const result = createBir2026AuditBaselineIntegrationResult(safeInput());
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const card of result.sourceCards) {
    check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete: ${card.label}`);
  }
});

// 51-59. Result validator rejects missing sections.
await test("result validator rejects missing baselineSummary", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.baselineSummary;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing baselineSummary");
});
await test("result validator rejects missing baselineSignals", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.baselineSignals;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing baselineSignals");
  const emptySignals = { ...base, baselineSignals: [] };
  check(validateBir2026AuditBaselineIntegrationResult(emptySignals).valid === false, "rejects empty baselineSignals");
});
await test("result validator rejects missing replacementElaReview", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.replacementElaReview;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing replacementElaReview");
});
await test("result validator rejects missing consolidationReview", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.consolidationReview;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing consolidationReview");
});
await test("result validator rejects missing vatTransitionReview", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.vatTransitionReview;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing vatTransitionReview");
});
await test("result validator rejects missing documentRequestReview", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.documentRequestReview;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing documentRequestReview");
});
await test("result validator rejects missing tvnReview", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.tvnReview;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing tvnReview");
});
await test("result validator rejects missing proceduralSafeguards", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.proceduralSafeguards;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing proceduralSafeguards");
});
await test("result validator rejects missing integrationRoutes", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const mutated = { ...base };
  delete mutated.integrationRoutes;
  check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, "rejects missing integrationRoutes");
});

// 60. Result validator rejects unsafe metadata.
await test("result validator rejects unsafe metadata", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  check(validateBir2026AuditBaselineIntegrationResult(base).valid === true, "sanity: base result is valid");
  for (const key of [
    "legalConclusionProvided",
    "liveRetrievalPerformed",
    "externalSearchPerformed",
    "scrapingPerformed",
    "downloadPerformed",
    "ingestionPerformed",
    "embeddingPerformed",
    "databaseWritePerformed",
    "realTaxpayerDataUsed",
    "filingReadyDocumentGenerated",
    "automaticSubmission",
    "finalOutcomeGuaranteed"
  ]) {
    const mutated = { ...base, metadata: { ...base.metadata, [key]: true } };
    check(validateBir2026AuditBaselineIntegrationResult(mutated).valid === false, `rejects metadata.${key} true`);
  }
  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateBir2026AuditBaselineIntegrationResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");
  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateBir2026AuditBaselineIntegrationResult(emptySourceCards).valid === false, "rejects empty sourceCards");
});

// 61. Result validator rejects prohibited claims.
await test("result validator rejects prohibited claims and real data leaks", () => {
  const base = createBir2026AuditBaselineIntegrationResult(safeInput());
  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} This is final legal authority.` };
  check(validateBir2026AuditBaselineIntegrationResult(withProhibitedPhrase).valid === false, "rejects prohibited phrase in humanReviewNotice");
  const withRealDataLeak = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${REAL_ELA_NUMBER_FRAGMENTS[2]}` };
  check(validateBir2026AuditBaselineIntegrationResult(withRealDataLeak).valid === false, "rejects real eLA number leaked into humanReviewNotice");
});

// 62. Fixture sample inputs use only synthetic taxpayer names or public authority names.
await test("fixture sample inputs use only synthetic taxpayer names or public authority names", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  check(/SAMPLE TAXPAYER INC\.|DEMO LOGISTICS CORP\.|SYNTHETIC HOLDINGS INC\.|MODEL VAT TAXPAYER CORP\./.test(inputsText), "sample inputs use recognized synthetic identifiers");
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!inputsText.toUpperCase().includes(fragment), `sample inputs must not include real name fragment: ${fragment}`);
  }
});

// 63. Fixture sample outputs do not include real taxpayer fragments.
await test("fixture sample outputs do not include real taxpayer fragments", () => {
  const outputsText = JSON.stringify(fx.sampleOutputs);
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!outputsText.toUpperCase().includes(fragment), `sample outputs must not include real name fragment: ${fragment}`);
  }
  for (const fragment of [...REAL_ELA_NUMBER_FRAGMENTS, ...REAL_AUDIT_CASE_NUMBER_FRAGMENTS, ...REAL_TIN_FRAGMENTS, ...REAL_ASSESSMENT_AMOUNT_FRAGMENTS]) {
    check(!outputsText.includes(fragment), `sample outputs must not include real reference fragment: ${fragment}`);
  }
});

// 64. Static scan confirms no server/ask-handler/pipeline/route imports.
await test("static scan confirms no server/ask-handler/pipeline/route imports", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/^\s*import\s/m.test(moduleSrc), "module has zero import statements (fully standalone)");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must have no forbidden usage: ${violations.join("; ")}`);
});

// 65. Static scan confirms no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls.
await test("static scan confirms no OpenAI/Supabase/Google Drive/n8n/Firecrawl/Crawlee/MCP/OCR calls", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must have no forbidden service calls: ${violations.join("; ")}`);
});

// 66. Static scan confirms no external HTTP/fetch calls.
await test("static scan confirms no external HTTP/fetch calls", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/\bfetch\s*\(|\baxios\s*\(|\bhttp\.request\s*\(|\bhttps\.request\s*\(/.test(moduleSrc), "no network call syntax in module");
});

// 67. Static scan confirms no process.env dependency.
await test("static scan confirms no process.env dependency", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/process\.env\.\w/.test(moduleSrc), "no process.env.<NAME> read in module");
});

// 68. Static scan confirms no Authorization/INDEX_SECRET usage.
await test("static scan confirms no Authorization/INDEX_SECRET usage", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/["'`]authorization["'`]\s*:/i.test(moduleSrc), "no Authorization header assignment in module");
  const indexSecretToken = ["INDEX", "SECRET"].join("_");
  const indexSecretUsagePattern = new RegExp(`\\b${indexSecretToken}\\b\\s*[:=]`);
  check(!indexSecretUsagePattern.test(moduleSrc), "no shared-secret env var assignment in module");
});

// 69. Static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation.
await test("static scan confirms no live retrieval/scraping/download/ingestion/embedding/database write implementation", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must implement no live retrieval/scraping/download/ingestion/embedding/db-write: ${violations.join("; ")}`);
});

// 70. Git diff scope confirms only allowed files changed.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/bir-2026-audit-baseline-integration.js",
    "evaluation/fixtures/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.fixture.json",
    "tests/phase-09s-2026-bir-audit-baseline-integration-scaffold-1.test.mjs",
    "PHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1_REPORT.md",
    "knowledge/CURRENT_STATE.md"
  ]);
  let diffNames = [];
  try {
    diffNames = execSync("git diff --name-only", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    diffNames = [];
  }
  for (const name of diffNames) {
    check(allowedChanged.has(name), `changed file is allowed by this patch's scope: ${name}`);
  }
  for (const forbidden of [
    "server.js",
    "ask-handler.js",
    "pipeline.js",
    "package.json",
    "package-lock.json",
    "workflow/workflow-mode-registry.js",
    "workflow/tax-memo-schema.js",
    "workflow/audit-defense-matrix-schema.js",
    "workflow/bir-reply-draft-schema.js",
    "workflow/client-advisory-schema.js",
    "workflow/compliance-checklist-schema.js",
    "workflow/requirements-request-letter-schema.js",
    "workflow/workflow-output-governance-gate.js",
    "workflow/workflow-runtime-wiring-policy.js",
    "workflow/tax-memo-runtime-orchestrator.js",
    "workflow/tax-memo-runtime-renderer.js",
    "workflow/tax-memo-runtime-integration-policy.js",
    "workflow/authority-safe-procedural-fallback.js",
    "workflow/bir-notice-loa-triage-intent.js",
    "workflow/pan-fan-fld-protest-workflow.js",
    "workflow/bir-audit-defense-matrix.js",
    "workflow/bir-document-compliance-transmittal.js",
    "workflow/bir-authority-corpus-research-design.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 71-76. Report exists and states required exact statements.
await test("report exists", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
});
await test("report states Runtime impact: None.", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Runtime impact:\s*None\./.test(report), "report states Runtime impact: None.");
});
await test("report states /ask impact: None.", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/\/ask impact:\s*None\./.test(report), "report states /ask impact: None.");
});
await test("report states Live retrieval impact: None.", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Live retrieval impact:\s*None\./.test(report), "report states Live retrieval impact: None.");
});
await test("report states Scraping/download/ingestion impact: None.", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Scraping\/download\/ingestion impact:\s*None\./.test(report), "report states Scraping/download/ingestion impact: None.");
});
await test("report states Database/embedding impact: None.", () => {
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Database\/embedding impact:\s*None\./.test(report), "report states Database/embedding impact: None.");
});

// Extra: normalizer forces all safety flags and auto-derives target topics.
await test("normalizeBir2026AuditBaselineIntegrationInput forces all safety flags and derives topics from scenario facts", () => {
  const normalized = normalizeBir2026AuditBaselineIntegrationInput({
    options: {
      runtimeActive: true,
      allowLegalConclusion: true,
      allowLiveRetrieval: true,
      allowRealTaxpayerData: true,
      generateFilingReadyDocument: true,
      automaticSubmission: true
    },
    scenarioFacts: { replacementEla: true, replacementReason: "continuity" }
  });
  check(normalized.options.runtimeActive === false, "runtimeActive forced false");
  check(normalized.options.allowLegalConclusion === false, "allowLegalConclusion forced false");
  check(normalized.options.allowLiveRetrieval === false, "allowLiveRetrieval forced false");
  check(normalized.options.allowRealTaxpayerData === false, "allowRealTaxpayerData forced false");
  check(normalized.options.generateFilingReadyDocument === false, "generateFilingReadyDocument forced false");
  check(normalized.options.automaticSubmission === false, "automaticSubmission forced false");
  check(normalized.targetTopics.includes("REPLACEMENT_ELA_FOR_CONTINUITY"), "targetTopics auto-derived from scenario facts");
});

// Extra: fixture sample inputs/outputs all validate via the module.
await test("fixture sample inputs/outputs all validate via the module", () => {
  for (const key of Object.keys(fx.sampleInputs)) {
    const inputValidation = validateBir2026AuditBaselineIntegrationInput(fx.sampleInputs[key]);
    check(inputValidation.valid === true, `sample input ${key} validates: ${inputValidation.errors.join("; ")}`);
    const result = createBir2026AuditBaselineIntegrationResult(fx.sampleInputs[key]);
    const resultValidation = validateBir2026AuditBaselineIntegrationResult(result);
    check(resultValidation.valid === true, `sample result ${key} validates: ${resultValidation.errors.join("; ")}`);
  }
});

await test("fixture and report content have no forbidden usage patterns", () => {
  const fixtureRaw = readFileSync(resolve(FIXTURE_PATH), "utf8");
  const fixtureViolations = scanForbiddenUsage(fixtureRaw);
  check(fixtureViolations.length === 0, `fixture must have no forbidden usage: ${fixtureViolations.join("; ")}`);

  if (existsSync(resolve(REPORT_PATH))) {
    const reportRaw = readFileSync(resolve(REPORT_PATH), "utf8");
    const reportViolations = scanForbiddenUsage(reportRaw);
    check(reportViolations.length === 0, `report must have no forbidden usage: ${reportViolations.join("; ")}`);
  }
});

await test("this test file itself has no forbidden usage patterns", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  const violations = scanForbiddenUsage(selfSrc);
  check(violations.length === 0, `test file must have no forbidden usage: ${violations.join("; ")}`);
});

await test("if decision FAIL or BLOCKED: a reason is recorded", () => {
  if (isFail()) check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  if (isBlocked()) check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
});

console.log(`\nPHASE-09S-2026-BIR-AUDIT-BASELINE-INTEGRATION-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
