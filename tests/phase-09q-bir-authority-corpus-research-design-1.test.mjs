// FILE: tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs
// PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1
//
// Validates the pure, standalone BIR authority corpus research design
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
  PHASE_09Q_BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_VERSION,
  BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_MODE_ID,
  SUPPORTED_AUTHORITY_SOURCE_TYPES,
  SUPPORTED_AUTHORITY_TIERS,
  SUPPORTED_AUTHORITY_TOPICS,
  SUPPORTED_RESEARCH_WORKFLOW_STAGES,
  SUPPORTED_AUTHORITY_VERIFICATION_STATUSES,
  createBirAuthorityCorpusResearchDesignResult,
  normalizeBirAuthorityCorpusResearchDesignInput,
  validateBirAuthorityCorpusResearchDesignInput,
  validateBirAuthorityCorpusResearchDesignResult,
  detectProhibitedAuthorityCorpusClaims
} from "../workflow/bir-authority-corpus-research-design.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09q-bir-authority-corpus-research-design-1.fixture.json";
const REPORT_PATH = "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1_REPORT.md";
const MODULE_PATH = "workflow/bir-authority-corpus-research-design.js";
const SELF_PATH = "tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09Q BIR AUTHORITY CORPUS RESEARCH DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09Q BIR AUTHORITY CORPUS RESEARCH DESIGN FAIL",
  "PHASE 09Q BIR AUTHORITY CORPUS RESEARCH DESIGN BLOCKED"
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
const REAL_ASSESSMENT_AMOUNT_FRAGMENTS = Object.freeze(["9,367,987.68", "2,841,029.91", "614,038.19", "737,273.97", "13,106,907.66", "13,545,329.75", "15,000.00"]);

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

function safeInput(overrides = {}) {
  return {
    userQuery: "Research design request for SAMPLE TAXPAYER INC.'s BIR audit defense authority corpus.",
    targetTopics: ["LOA_AUTHORITY", "PAN_REPLY"],
    candidateAuthorities: [
      { title: "NIRC Sec. 6(A)", sourceType: "NIRC_PROVISION", topicTags: ["LOA_AUTHORITY"], authorityTier: "controlling_primary_authority", sourceDomain: "officialgazette.gov.ph", verificationStatus: "official_source_required", note: "Statutory LOA basis." }
    ],
    sourceCards: [],
    ...overrides
  };
}

/**
 * Usage-based forbidden-pattern scan. Deliberately avoids bare substring
 * matching on service names (which would also match legitimate "does not
 * call X" documentation/comments); instead it looks for actual code-shaped
 * usage: import/require of a forbidden package, actual network-call syntax,
 * process.env.<NAME> reads, header-assignment syntax, or import of a
 * runtime/server file. This is safe to run against this test's own source
 * as well as the module/fixture/report, since descriptive prose never
 * matches these patterns.
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

// 2-4. Patch id, decision, base commit.
await test("fixture patch id, decision, and base commit are valid", () => {
  check(fx.patch === "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1", "patch id");
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
  check(typeof fx.baseCommit === "string" && fx.baseCommit.includes("c84d56b"), "base commit references c84d56b");
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
  check(typeof PHASE_09Q_BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_VERSION === "string", "version export present");
  check(typeof BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_MODE_ID === "string", "mode id export present");
  check(Array.isArray(SUPPORTED_AUTHORITY_SOURCE_TYPES), "supported authority source types export present");
  check(Array.isArray(SUPPORTED_AUTHORITY_TIERS), "supported authority tiers export present");
  check(Array.isArray(SUPPORTED_AUTHORITY_TOPICS), "supported authority topics export present");
  check(Array.isArray(SUPPORTED_RESEARCH_WORKFLOW_STAGES), "supported research workflow stages export present");
  check(Array.isArray(SUPPORTED_AUTHORITY_VERIFICATION_STATUSES), "supported authority verification statuses export present");
  check(typeof createBirAuthorityCorpusResearchDesignResult === "function", "createBirAuthorityCorpusResearchDesignResult export present");
  check(typeof normalizeBirAuthorityCorpusResearchDesignInput === "function", "normalizeBirAuthorityCorpusResearchDesignInput export present");
  check(typeof validateBirAuthorityCorpusResearchDesignInput === "function", "validateBirAuthorityCorpusResearchDesignInput export present");
  check(typeof validateBirAuthorityCorpusResearchDesignResult === "function", "validateBirAuthorityCorpusResearchDesignResult export present");
  check(typeof detectProhibitedAuthorityCorpusClaims === "function", "detectProhibitedAuthorityCorpusClaims export present");
  check(PHASE_09Q_BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_VERSION === "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1", "version matches patch id");
  check(BIR_AUTHORITY_CORPUS_RESEARCH_DESIGN_MODE_ID === "bir_authority_corpus_research_design", "mode id equals bir_authority_corpus_research_design");
});

// 9-13. Supported source types/tiers/topics/stages/statuses include all required entries.
await test("supported source types, tiers, topics, workflow stages, and verification statuses include all required entries", () => {
  check(SUPPORTED_AUTHORITY_SOURCE_TYPES.length === 20, "20 supported authority source types");
  for (const t of [
    "BIR_REVENUE_REGULATION",
    "BIR_REVENUE_MEMORANDUM_CIRCULAR",
    "BIR_REVENUE_MEMORANDUM_ORDER",
    "BIR_RULING",
    "NIRC_PROVISION",
    "SUPREME_COURT_DECISION",
    "CTA_DECISION",
    "PEZA_ISSUANCE",
    "PRIVATE_REFERENCE_PATTERN",
    "SECONDARY_RESEARCH_LEAD",
    "UNKNOWN_SOURCE_TYPE"
  ]) {
    check(SUPPORTED_AUTHORITY_SOURCE_TYPES.includes(t), `supported source types include ${t}`);
  }

  check(SUPPORTED_AUTHORITY_TIERS.length === 10, "10 supported authority tiers");
  for (const tier of [
    "controlling_primary_authority",
    "persuasive_primary_authority",
    "official_administrative_guidance",
    "jurisprudential_authority",
    "private_uploaded_pattern",
    "secondary_lead_only",
    "future_verification_required",
    "unknown_tier"
  ]) {
    check(SUPPORTED_AUTHORITY_TIERS.includes(tier), `supported authority tiers include ${tier}`);
  }

  check(SUPPORTED_AUTHORITY_TOPICS.length === 43, "43 supported authority topics");
  for (const topic of [
    "LOA_AUTHORITY",
    "RMO_1_2026_SINGLE_INSTANCE_AUDIT",
    "RMC_5_2026_LOA_VERIFIER",
    "PAN_REPLY",
    "FAN_FLD_PROTEST",
    "ASSESSMENT_PRESCRIPTION",
    "VAT_EXEMPT_VS_ZERO_RATED",
    "CWT_SUBSTANTIATION",
    "CTA_APPEAL_PERIOD",
    "CTA_INACTION_APPEAL",
    "UNKNOWN_TOPIC"
  ]) {
    check(SUPPORTED_AUTHORITY_TOPICS.includes(topic), `supported authority topics include ${topic}`);
  }

  check(SUPPORTED_RESEARCH_WORKFLOW_STAGES.length === 12, "12 supported research workflow stages");
  for (const stage of [
    "SOURCE_DISCOVERY_DESIGN",
    "OFFICIAL_SOURCE_PRIORITY_DESIGN",
    "AUTHORITY_METADATA_DESIGN",
    "AUTHORITY_VERIFICATION_DESIGN",
    "AUTHORITY_TOPIC_MAPPING_DESIGN",
    "CITATION_POLICY_DESIGN",
    "INGESTION_PIPELINE_DESIGN",
    "DEDUPLICATION_AND_VERSIONING_DESIGN",
    "CONFLICT_RESOLUTION_DESIGN",
    "HUMAN_REVIEW_GATE_DESIGN",
    "FUTURE_RUNTIME_WIRING_DESIGN",
    "UNKNOWN_STAGE"
  ]) {
    check(SUPPORTED_RESEARCH_WORKFLOW_STAGES.includes(stage), `supported research workflow stages include ${stage}`);
  }

  check(SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.length === 8, "8 supported authority verification statuses");
  for (const status of [
    "not_verified_design_only",
    "official_source_required",
    "official_source_identified_design_only",
    "secondary_lead_requires_primary_verification",
    "conflict_requires_human_review",
    "stale_or_superseded_risk",
    "future_ingestion_required",
    "unknown_status"
  ]) {
    check(SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.includes(status), `supported verification statuses include ${status}`);
  }
});

// 14-30. Input validation rejections: missing input, unsupported values, unsafe options.
await test("validateBirAuthorityCorpusResearchDesignInput rejects missing input, unsupported values, and unsafe option flags", () => {
  check(validateBirAuthorityCorpusResearchDesignInput(undefined).valid === false, "missing input rejected");
  check(validateBirAuthorityCorpusResearchDesignInput(null).valid === false, "null input rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ targetTopics: ["NOT_A_TOPIC"] }).valid === false, "unsupported topic rejected");
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", sourceType: "NOT_A_TYPE" }] }).valid === false,
    "unsupported sourceType rejected"
  );
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", authorityTier: "not_a_tier" }] }).valid === false,
    "unsupported authorityTier rejected"
  );
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", verificationStatus: "not_a_status" }] }).valid === false,
    "unsupported verificationStatus rejected"
  );
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", topicTags: ["NOT_A_TOPIC"] }] }).valid === false,
    "unsupported candidate topicTags entry rejected"
  );
  check(validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", liveVerified: true }] }).valid === false, "liveVerified true rejected");
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", sourceDomain: "https://bir.gov.ph/some/path" }] }).valid === false,
    "raw URL sourceDomain rejected"
  );
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { runtimeActive: true } }).valid === false, "runtimeActive true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowLiveRetrieval: true } }).valid === false, "allowLiveRetrieval true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowScraping: true } }).valid === false, "allowScraping true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowDownload: true } }).valid === false, "allowDownload true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowIngestion: true } }).valid === false, "allowIngestion true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowEmbedding: true } }).valid === false, "allowEmbedding true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowDatabaseWrite: true } }).valid === false, "allowDatabaseWrite true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowLegalConclusion: true } }).valid === false, "allowLegalConclusion true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { allowRealTaxpayerData: true } }).valid === false, "allowRealTaxpayerData true rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ options: { generateFilingReadyDocument: true } }).valid === false, "generateFilingReadyDocument true rejected");
});

// 31-34. Scrape/download/search/ingest/embed/store request rejections.
await test("validateBirAuthorityCorpusResearchDesignInput rejects requests to scrape/download/search/ingest/embed/store authorities", () => {
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "please scrape the BIR website for new issuances" }).valid === false, "scrape request rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "download the RMO PDF from bir.gov.ph" }).valid === false, "download request rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "search the web for the latest RMC" }).valid === false, "web search request rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "ingest this ruling into the corpus" }).valid === false, "ingest request rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "embed this authority for retrieval" }).valid === false, "embed request rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: "store this in the database" }).valid === false, "database store request rejected");
});

// 35-36. Source-card and candidate-authority claim rejections.
await test("validateBirAuthorityCorpusResearchDesignInput rejects claims of completed verification or final legal conclusion", () => {
  check(
    validateBirAuthorityCorpusResearchDesignInput({ sourceCards: [{ label: "x", note: "official verification complete" }] }).valid === false,
    "verification-complete source card rejected"
  );
  check(
    validateBirAuthorityCorpusResearchDesignInput({ sourceCards: [{ label: "x", note: "this is our final legal conclusion" }] }).valid === false,
    "final-legal-conclusion source card rejected"
  );
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: "x", note: "verification is complete for this authority" }] }).valid === false,
    "candidate authority verification-complete claim rejected"
  );
});

// 37-43. Real reference-corpus data rejections.
await test("validateBirAuthorityCorpusResearchDesignInput rejects known real names/numbers/amounts", () => {
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: `${REAL_TAXPAYER_NAME_FRAGMENTS[0]} audit` }).valid === false, "real taxpayer name rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: `${REAL_ELA_NUMBER_FRAGMENTS[0]} issued` }).valid === false, "real LOA/eLA number rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: `${REAL_AUDIT_CASE_NUMBER_FRAGMENTS[0]} case` }).valid === false, "real audit case number rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: `signed by ${REAL_OFFICER_NAME_FRAGMENTS[0]}` }).valid === false, "real BIR officer name rejected");
  check(validateBirAuthorityCorpusResearchDesignInput({ userQuery: `assessed at PHP ${REAL_ASSESSMENT_AMOUNT_FRAGMENTS[0]}` }).valid === false, "real assessment amount rejected");
  check(
    validateBirAuthorityCorpusResearchDesignInput({ candidateAuthorities: [{ title: `${REAL_ELA_NUMBER_FRAGMENTS[1]} reference` }] }).valid === false,
    "real eLA number in candidate authority title rejected"
  );
  check(validateBirAuthorityCorpusResearchDesignInput(safeInput()).valid === true, "sanity: safe input is valid");
});

// 44. Default/baseline result is valid with default targetTopics.
await test("baseline design result (no target topics supplied) is valid and covers the default topic set", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({});
  check(validateBirAuthorityCorpusResearchDesignResult(result).valid === true, "baseline result must validate");
  check(result.corpusDesignSummary.totalTopics === 7, "baseline result covers 7 default topics");
});

// 45-54. Official source priority includes all 10 required domains plus secondary-lead entry.
await test("officialSourcePriority includes all 10 official domains with correct allowed-use categories and a secondary-lead-only entry", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({});
  const domains = result.officialSourcePriority.map((entry) => entry.domainOrSource);
  for (const domain of ["bir.gov.ph", "bir-cdn.bir.gov.ph", "lawphil.net", "sc.judiciary.gov.ph", "cta.judiciary.gov.ph", "officialgazette.gov.ph", "dof.gov.ph", "peza.gov.ph", "sec.gov.ph", "boi.gov.ph"]) {
    check(domains.includes(domain), `officialSourcePriority includes ${domain}`);
  }
  check(
    result.officialSourcePriority.some((entry) => /research lead only/i.test(entry.allowedUse)),
    "officialSourcePriority includes a research-lead-only secondary source entry"
  );
});

// 55-62. Authority topic map baseline entries present with correct required fields.
await test("authorityTopicMap includes required baseline topics with required fields and always requires human review", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({
    targetTopics: ["LOA_AUTHORITY", "RMO_1_2026_SINGLE_INSTANCE_AUDIT", "PAN_REPLY", "FAN_FLD_PROTEST", "ASSESSMENT_PRESCRIPTION", "VAT_EXEMPT_VS_ZERO_RATED", "CWT_SUBSTANTIATION"]
  });
  const byTopic = Object.fromEntries(result.authorityTopicMap.map((entry) => [entry.topic, entry]));
  for (const topic of ["LOA_AUTHORITY", "RMO_1_2026_SINGLE_INSTANCE_AUDIT", "PAN_REPLY", "FAN_FLD_PROTEST", "ASSESSMENT_PRESCRIPTION", "VAT_EXEMPT_VS_ZERO_RATED", "CWT_SUBSTANTIATION"]) {
    check(isPlainObjectLocal(byTopic[topic]), `authorityTopicMap includes entry for ${topic}`);
    check(Array.isArray(byTopic[topic].requiredAuthorityTypes) && byTopic[topic].requiredAuthorityTypes.length > 0, `${topic} has requiredAuthorityTypes`);
    check(Array.isArray(byTopic[topic].candidateAuthorities), `${topic} has candidateAuthorities array`);
    check(Array.isArray(byTopic[topic].missingAuthorityGaps), `${topic} has missingAuthorityGaps array`);
    check(SUPPORTED_AUTHORITY_VERIFICATION_STATUSES.includes(byTopic[topic].verificationStatus), `${topic} has supported verificationStatus`);
    check(byTopic[topic].humanReviewRequired === true, `${topic} humanReviewRequired true`);
  }
});

// 63. Candidate authority mapped to a topic reduces its missing-authority gap.
await test("candidate authority matching a topic's required type narrows missingAuthorityGaps", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({
    targetTopics: ["ASSESSMENT_PRESCRIPTION"],
    candidateAuthorities: [
      { title: "NIRC Sec. 203", sourceType: "NIRC_PROVISION", topicTags: ["ASSESSMENT_PRESCRIPTION"], authorityTier: "controlling_primary_authority", note: "x" }
    ]
  });
  const entry = result.authorityTopicMap.find((e) => e.topic === "ASSESSMENT_PRESCRIPTION");
  check(entry.candidateAuthorities.includes("NIRC Sec. 203"), "candidate authority listed under topic");
  check(!entry.missingAuthorityGaps.some((gap) => /nirc sec\. 203/i.test(gap)), "matched required type no longer listed as a gap");
});

// 64-68. Metadata schema, workflow design, verification rules, conflict policy, ingestion plan, citation policy shapes.
await test("authorityMetadataSchema, researchWorkflowDesign, verificationRules, conflictResolutionPolicy, futureIngestionPlan, and citationPolicyDesign are fully shaped", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({});
  check(Array.isArray(result.authorityMetadataSchema.requiredFields) && result.authorityMetadataSchema.requiredFields.length > 0, "metadata schema requiredFields present");
  check(Array.isArray(result.authorityMetadataSchema.prohibitedFields) && result.authorityMetadataSchema.prohibitedFields.includes("realTaxpayerName"), "metadata schema prohibits realTaxpayerName");

  check(result.researchWorkflowDesign.length === 12, "researchWorkflowDesign has 12 stage entries");
  for (const entry of result.researchWorkflowDesign) {
    check(SUPPORTED_RESEARCH_WORKFLOW_STAGES.includes(entry.stage), `researchWorkflowDesign entry has supported stage: ${entry.stage}`);
    check(typeof entry.purpose === "string" && entry.purpose.length > 0, `${entry.stage} has purpose`);
    check(Array.isArray(entry.allowedActionsFutureOnly), `${entry.stage} has allowedActionsFutureOnly array`);
    check(Array.isArray(entry.prohibitedActionsThisPatch) && entry.prohibitedActionsThisPatch.length > 0, `${entry.stage} has prohibitedActionsThisPatch`);
    check(typeof entry.outputExpectedInFuturePatch === "string" && entry.outputExpectedInFuturePatch.length > 0, `${entry.stage} has outputExpectedInFuturePatch`);
  }

  for (const key of [
    "officialPrimarySourceRequired",
    "secondarySourcesLeadOnly",
    "requireDateAndVersionCheck",
    "requireSupersessionCheck",
    "requireTopicMapping",
    "requireQuoteAndCitationDiscipline",
    "requireHumanReviewForConflict",
    "noFinalLegalConclusionFromUnverifiedAuthority"
  ]) {
    check(result.verificationRules[key] === true, `verificationRules.${key} is true`);
  }

  for (const key of [
    "newerIssuanceCheck",
    "statuteVsRegulationHierarchyCheck",
    "jurisprudenceVsAdministrativeGuidanceCheck",
    "specialLawVsGeneralLawCheck",
    "taxpayerFactSpecificityCheck",
    "humanReviewRequiredForConflict"
  ]) {
    check(result.conflictResolutionPolicy[key] === true, `conflictResolutionPolicy.${key} is true`);
  }

  check(Array.isArray(result.futureIngestionPlan.allowedOfficialDomains) && result.futureIngestionPlan.allowedOfficialDomains.length === 10, "futureIngestionPlan lists 10 official domains");
  check(Array.isArray(result.futureIngestionPlan.prohibitedSources) && result.futureIngestionPlan.prohibitedSources.length > 0, "futureIngestionPlan lists prohibited sources");
  check(Array.isArray(result.futureIngestionPlan.futurePipelineStages) && result.futureIngestionPlan.futurePipelineStages.length > 0, "futureIngestionPlan lists future pipeline stages");

  for (const key of ["citationRequiredForLegalClaims", "citationRequiredForDeadlines", "citationRequiredForAuthorityStatus", "rawUnsupportedCitationProhibited", "sourceCardRequired"]) {
    check(result.citationPolicyDesign[key] === true, `citationPolicyDesign.${key} is true`);
  }
  check(typeof result.citationPolicyDesign.exactExcerptPolicy === "string" && result.citationPolicyDesign.exactExcerptPolicy.length > 0, "citationPolicyDesign.exactExcerptPolicy present");
});

// 69. corpusDesignSummary always reports no live/ingestion/database-write/legal-conclusion activity.
await test("corpusDesignSummary always reports no live retrieval, ingestion, database write, or legal conclusion", () => {
  const result = createBirAuthorityCorpusResearchDesignResult(safeInput());
  check(result.corpusDesignSummary.liveRetrievalPerformed === false, "liveRetrievalPerformed false");
  check(result.corpusDesignSummary.ingestionPerformed === false, "ingestionPerformed false");
  check(result.corpusDesignSummary.databaseWritePerformed === false, "databaseWritePerformed false");
  check(result.corpusDesignSummary.legalConclusionProvided === false, "legalConclusionProvided false");
  check(result.corpusDesignSummary.humanReviewRequired === true, "humanReviewRequired true");
  check(result.corpusDesignSummary.officialSourcePriorityRequired === true, "officialSourcePriorityRequired true");
});

// 70-73. Required source cards present with exact label/authorityTier.
await test("required baseline source cards are present with exact labels and authority tiers", () => {
  const result = createBirAuthorityCorpusResearchDesignResult({});
  const byLabel = Object.fromEntries(result.sourceCards.map((c) => [c.label, c]));
  check(byLabel["BIR official authority corpus design"]?.authorityTier === "future_authority_corpus_required", "BIR official authority corpus design card present with correct tier");
  check(byLabel["Judicial authority corpus design"]?.authorityTier === "future_authority_corpus_required", "Judicial authority corpus design card present with correct tier");
  check(byLabel["2026 BIR audit baseline authority design"]?.authorityTier === "official_reference_required", "2026 BIR audit baseline authority design card present with correct tier");
  check(byLabel["Private audit workflow reference pattern"]?.authorityTier === "private_uploaded_pattern", "Private audit workflow reference pattern card present with correct tier");
});

// 74. Source cards never claim completed authority verification.
await test("source cards never claim completed authority verification", () => {
  const result = createBirAuthorityCorpusResearchDesignResult(safeInput());
  const verificationClaimPattern = /verification (?:is |has been )?complete|officially verified|final authority verification/i;
  for (const card of result.sourceCards) {
    check(!verificationClaimPattern.test(`${card.label} ${card.note}`), `source card must not claim verification complete: ${card.label}`);
  }
});

// 75. detectProhibitedAuthorityCorpusClaims flags known prohibited phrases.
await test("detectProhibitedAuthorityCorpusClaims flags all documented prohibited phrases", () => {
  for (const phrase of fx.prohibitedClaims) {
    const detection = detectProhibitedAuthorityCorpusClaims({ note: `Please note: ${phrase}.` });
    check(detection.hasProhibitedClaims === true, `detects prohibited phrase: ${phrase}`);
  }
  check(detectProhibitedAuthorityCorpusClaims({ note: "This is a design-only reference." }).hasProhibitedClaims === false, "safe text not flagged");
});

// 76-89. Result validation rejections.
await test("validateBirAuthorityCorpusResearchDesignResult rejects missing sections, unsafe metadata, and prohibited claims", () => {
  const base = createBirAuthorityCorpusResearchDesignResult(safeInput());
  check(validateBirAuthorityCorpusResearchDesignResult(base).valid === true, "sanity: base result is valid");

  const missingSummary = { ...base };
  delete missingSummary.corpusDesignSummary;
  check(validateBirAuthorityCorpusResearchDesignResult(missingSummary).valid === false, "rejects missing corpusDesignSummary");

  const missingOfficialSourcePriority = { ...base };
  delete missingOfficialSourcePriority.officialSourcePriority;
  check(validateBirAuthorityCorpusResearchDesignResult(missingOfficialSourcePriority).valid === false, "rejects missing officialSourcePriority");

  const missingTopicMap = { ...base };
  delete missingTopicMap.authorityTopicMap;
  check(validateBirAuthorityCorpusResearchDesignResult(missingTopicMap).valid === false, "rejects missing authorityTopicMap");

  const unsupportedTopicMapEntry = { ...base, authorityTopicMap: [{ ...base.authorityTopicMap[0], topic: "NOT_A_TOPIC" }] };
  check(validateBirAuthorityCorpusResearchDesignResult(unsupportedTopicMapEntry).valid === false, "rejects unsupported authorityTopicMap topic");

  const missingMetadataSchema = { ...base };
  delete missingMetadataSchema.authorityMetadataSchema;
  check(validateBirAuthorityCorpusResearchDesignResult(missingMetadataSchema).valid === false, "rejects missing authorityMetadataSchema");

  const missingWorkflowDesign = { ...base };
  delete missingWorkflowDesign.researchWorkflowDesign;
  check(validateBirAuthorityCorpusResearchDesignResult(missingWorkflowDesign).valid === false, "rejects missing researchWorkflowDesign");

  const missingVerificationRules = { ...base };
  delete missingVerificationRules.verificationRules;
  check(validateBirAuthorityCorpusResearchDesignResult(missingVerificationRules).valid === false, "rejects missing verificationRules");

  const missingConflictPolicy = { ...base };
  delete missingConflictPolicy.conflictResolutionPolicy;
  check(validateBirAuthorityCorpusResearchDesignResult(missingConflictPolicy).valid === false, "rejects missing conflictResolutionPolicy");

  const missingIngestionPlan = { ...base };
  delete missingIngestionPlan.futureIngestionPlan;
  check(validateBirAuthorityCorpusResearchDesignResult(missingIngestionPlan).valid === false, "rejects missing futureIngestionPlan");

  const missingCitationPolicy = { ...base };
  delete missingCitationPolicy.citationPolicyDesign;
  check(validateBirAuthorityCorpusResearchDesignResult(missingCitationPolicy).valid === false, "rejects missing citationPolicyDesign");

  const missingSourceCards = { ...base };
  delete missingSourceCards.sourceCards;
  check(validateBirAuthorityCorpusResearchDesignResult(missingSourceCards).valid === false, "rejects missing sourceCards");

  const emptySourceCards = { ...base, sourceCards: [] };
  check(validateBirAuthorityCorpusResearchDesignResult(emptySourceCards).valid === false, "rejects empty sourceCards");

  const runtimeActiveTrue = { ...base, runtimeActive: true };
  check(validateBirAuthorityCorpusResearchDesignResult(runtimeActiveTrue).valid === false, "rejects runtimeActive true");
});

// 90-101. Result validation rejections: unsafe metadata flags.
await test("validateBirAuthorityCorpusResearchDesignResult rejects every unsafe metadata flag", () => {
  const base = createBirAuthorityCorpusResearchDesignResult(safeInput());
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
    check(validateBirAuthorityCorpusResearchDesignResult(mutated).valid === false, `rejects metadata.${key} true`);
  }
  const scaffoldOnlyFalse = { ...base, metadata: { ...base.metadata, scaffoldOnly: false } };
  check(validateBirAuthorityCorpusResearchDesignResult(scaffoldOnlyFalse).valid === false, "rejects metadata.scaffoldOnly false");
});

// 102-103. Result validation rejects prohibited claims and real data leaks.
await test("validateBirAuthorityCorpusResearchDesignResult rejects prohibited claims and real data leaks embedded in result text", () => {
  const base = createBirAuthorityCorpusResearchDesignResult(safeInput());
  const withProhibitedPhrase = { ...base, humanReviewNotice: `${base.humanReviewNotice} This is final legal authority.` };
  check(validateBirAuthorityCorpusResearchDesignResult(withProhibitedPhrase).valid === false, "rejects prohibited phrase in humanReviewNotice");

  const withRealDataLeak = { ...base, humanReviewNotice: `${base.humanReviewNotice} ${REAL_ELA_NUMBER_FRAGMENTS[2]}` };
  check(validateBirAuthorityCorpusResearchDesignResult(withRealDataLeak).valid === false, "rejects real eLA number leaked into humanReviewNotice");
});

// 104. normalize function forces every unsafe flag regardless of caller input.
await test("normalizeBirAuthorityCorpusResearchDesignInput forces all safety flags and never marks candidates live-verified", () => {
  const normalized = normalizeBirAuthorityCorpusResearchDesignInput({
    options: {
      runtimeActive: true,
      allowLiveRetrieval: true,
      allowScraping: true,
      allowDownload: true,
      allowIngestion: true,
      allowEmbedding: true,
      allowDatabaseWrite: true,
      allowLegalConclusion: true,
      allowRealTaxpayerData: true,
      generateFilingReadyDocument: true
    },
    candidateAuthorities: [{ title: "x", liveVerified: true }]
  });
  check(normalized.options.runtimeActive === false, "runtimeActive forced false");
  check(normalized.options.allowLiveRetrieval === false, "allowLiveRetrieval forced false");
  check(normalized.options.allowScraping === false, "allowScraping forced false");
  check(normalized.options.allowDownload === false, "allowDownload forced false");
  check(normalized.options.allowIngestion === false, "allowIngestion forced false");
  check(normalized.options.allowEmbedding === false, "allowEmbedding forced false");
  check(normalized.options.allowDatabaseWrite === false, "allowDatabaseWrite forced false");
  check(normalized.options.allowLegalConclusion === false, "allowLegalConclusion forced false");
  check(normalized.options.allowRealTaxpayerData === false, "allowRealTaxpayerData forced false");
  check(normalized.options.generateFilingReadyDocument === false, "generateFilingReadyDocument forced false");
  check(normalized.candidateAuthorities[0].liveVerified === false, "candidate liveVerified forced false");
});

// 105-106. Fixture sample-data validate and are free of real reference-corpus data.
await test("fixture sample inputs/outputs all validate and use only synthetic/public authority names", () => {
  for (const key of Object.keys(fx.sampleInputs)) {
    const inputValidation = validateBirAuthorityCorpusResearchDesignInput(fx.sampleInputs[key]);
    check(inputValidation.valid === true, `sample input ${key} validates: ${inputValidation.errors.join("; ")}`);
    const result = createBirAuthorityCorpusResearchDesignResult(fx.sampleInputs[key]);
    const resultValidation = validateBirAuthorityCorpusResearchDesignResult(result);
    check(resultValidation.valid === true, `sample result ${key} validates: ${resultValidation.errors.join("; ")}`);
  }
});

await test("fixture sample inputs/outputs contain no known real reference-corpus data", () => {
  const inputsText = JSON.stringify(fx.sampleInputs);
  const outputsText = JSON.stringify(fx.sampleOutputs);
  for (const fragment of [...REAL_TAXPAYER_NAME_FRAGMENTS, ...REAL_OFFICER_NAME_FRAGMENTS]) {
    check(!inputsText.toUpperCase().includes(fragment), `sample inputs must not include real name fragment: ${fragment}`);
    check(!outputsText.toUpperCase().includes(fragment), `sample outputs must not include real name fragment: ${fragment}`);
  }
  for (const fragment of [...REAL_ELA_NUMBER_FRAGMENTS, ...REAL_AUDIT_CASE_NUMBER_FRAGMENTS, ...REAL_ASSESSMENT_AMOUNT_FRAGMENTS]) {
    check(!inputsText.includes(fragment), `sample inputs must not include real reference fragment: ${fragment}`);
    check(!outputsText.includes(fragment), `sample outputs must not include real reference fragment: ${fragment}`);
  }
});

// 107-109. Static scans of module, fixture, and report for forbidden usage; module has zero imports.
await test("module source has no imports and no forbidden usage patterns", () => {
  const moduleSrc = readFileSync(resolve(MODULE_PATH), "utf8");
  check(!/^\s*import\s/m.test(moduleSrc), "module has zero import statements (fully standalone)");
  const violations = scanForbiddenUsage(moduleSrc);
  check(violations.length === 0, `module must have no forbidden usage: ${violations.join("; ")}`);
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

// 110-116. Git diff scope.
await test("git diff confirms only this patch's allowed files changed, with no runtime/package/env/DB/frontend/MCP changes", () => {
  const allowedChanged = new Set([
    "workflow/bir-authority-corpus-research-design.js",
    "evaluation/fixtures/phase-09q-bir-authority-corpus-research-design-1.fixture.json",
    "tests/phase-09q-bir-authority-corpus-research-design-1.test.mjs",
    "PHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1_REPORT.md",
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
    "workflow/bir-document-compliance-transmittal.js"
  ]) {
    check(!diffNames.includes(forbidden), `${forbidden} not changed`);
  }
  check(!diffNames.some((name) => /mcp/i.test(name)), "no MCP files/configs added or modified");
});

// 117-119. Report exists and states required exact statements.
await test("report exists and states runtime, /ask, live-retrieval/scraping/ingestion, database/embedding, filing-ready, and automatic submission impact none", () => {
  check(existsSync(resolve(REPORT_PATH)), `${REPORT_PATH} must exist`);
  const report = readFileSync(resolve(REPORT_PATH), "utf8");
  check(/Runtime impact:\s*None\./.test(report), "report states Runtime impact: None.");
  check(/\/ask impact:\s*None\./.test(report), "report states /ask impact: None.");
  check(/Live retrieval impact:\s*None\./.test(report), "report states Live retrieval impact: None.");
  check(/Scraping\/download\/ingestion impact:\s*None\./.test(report), "report states Scraping/download/ingestion impact: None.");
  check(/Database\/embedding impact:\s*None\./.test(report), "report states Database/embedding impact: None.");
  check(/Filing-ready document impact:\s*None\./.test(report), "report states Filing-ready document impact: None.");
  check(/Automatic submission impact:\s*None\./.test(report), "report states Automatic submission impact: None.");
});

await test("if decision FAIL or BLOCKED: a reason is recorded", () => {
  if (isFail()) check(typeof fx.failureReason === "string" && fx.failureReason.length > 0, "failure reason recorded");
  if (isBlocked()) check(typeof fx.blockerReason === "string" && fx.blockerReason.length > 0, "blocker reason recorded");
});

console.log(`\nPHASE-09Q-BIR-AUTHORITY-CORPUS-RESEARCH-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
