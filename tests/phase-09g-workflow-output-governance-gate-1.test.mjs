// PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1
//
// Validates the pure Workflow Output Governance Gate and its fixture. NO live
// HTTP, NO OpenAI / Supabase / Google Drive / n8n / Firecrawl / Crawlee, NO env
// vars, NO server import, NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION,
  WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS,
  WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES,
  WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS,
  WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS,
  WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE,
  createWorkflowGovernanceResult,
  validateWorkflowSchemaGovernance,
  validateAllWorkflowSchemaGovernance,
  validateWorkflowOutputGovernance,
  validateWorkflowSourceCards,
  validateWorkflowMetadataGovernance,
  detectProhibitedWorkflowClaims,
  normalizeGovernanceModeId,
  getWorkflowGovernanceRequirements,
  getWorkflowGovernanceSchemaCoverage,
  validateWorkflowGovernanceGate
} from "../workflow/workflow-output-governance-gate.js";
import { WORKFLOW_MODE_IDS } from "../workflow/workflow-mode-registry.js";
import { createEmptyTaxMemoOutput } from "../workflow/tax-memo-schema.js";
import { createEmptyAuditDefenseMatrixOutput } from "../workflow/audit-defense-matrix-schema.js";
import { createEmptyBirReplyDraftOutput } from "../workflow/bir-reply-draft-schema.js";
import { createEmptyClientAdvisoryOutput } from "../workflow/client-advisory-schema.js";
import { createEmptyComplianceChecklistOutput } from "../workflow/compliance-checklist-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09g-workflow-output-governance-gate-1.fixture.json";
const GATE_PATH = "workflow/workflow-output-governance-gate.js";
const SELF_PATH = "tests/phase-09g-workflow-output-governance-gate-1.test.mjs";

const ALLOWED_IMPORT_FILES = [
  "./workflow-mode-registry.js",
  "./tax-memo-schema.js",
  "./audit-defense-matrix-schema.js",
  "./bir-reply-draft-schema.js",
  "./client-advisory-schema.js",
  "./compliance-checklist-schema.js"
];

const VALID_DECISIONS = [
  "PHASE 09G WORKFLOW OUTPUT GOVERNANCE GATE PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09G WORKFLOW OUTPUT GOVERNANCE GATE WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09G WORKFLOW OUTPUT GOVERNANCE GATE FAIL",
  "PHASE 09G WORKFLOW OUTPUT GOVERNANCE GATE BLOCKED"
];

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

let fx;
const hasAll = (arr, needles) => {
  const hay = arr.map((s) => String(s).toLowerCase());
  return needles.every((n) => hay.some((h) => h.includes(n.toLowerCase())));
};

function makeSafeSourceCard() {
  return { sourceCardId: "sc1", title: "RR 16-2005", archiveUrl: "https://drive.google.com/x", relevance: "controlling" };
}

function fillCommonFields(output) {
  output.sourceCards.push(makeSafeSourceCard());
  output.missingFacts.push("exact transaction date not yet confirmed");
  output.assumptions.push("assumed calendar-year taxpayer");
  output.humanReviewNotice = "This draft requires review by a licensed tax professional before use.";
  return output;
}

// 1
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2
await test("governance gate file exists", () => {
  check(existsSync(resolve(GATE_PATH)), `${GATE_PATH} must exist`);
});

// 3
await test("patch id matches PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1", () => {
  check(fx.patch.id === "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required gate elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is 228fb5a", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("228fb5a"), "base commit 228fb5a");
});

// 6
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.pureGovernanceGate === true, "pureGovernanceGate true");
  check(n.noRuntimeWiring === true, "noRuntimeWiring true");
  check(n.noDeployment === true, "noDeployment true");
});

// 7
await test("fixture says no runtime wiring", () => {
  check(fx.nonRuntimePatch.noRuntimeWiring === true, "no runtime wiring");
});

// 8
await test("fixture says no memory activation", () => {
  check(fx.nonRuntimePatch.noMemoryActivation === true, "no memory activation");
  check(fx.privacySecurityBoundary.noMemoryActivation === true, "privacy boundary no memory activation");
});

// 9
await test("fixture says production unchanged", () => {
  check(fx.currentState.productionUnchanged === true, "production unchanged");
  check(fx.privacySecurityBoundary.noProductionChange === true, "no production change");
});

// 10
await test("fixture says no external search/n8n/Firecrawl/Crawlee", () => {
  const n = fx.nonRuntimePatch;
  check(n.noExternalSearch === true, "no external search");
  check(n.noN8n === true && n.noFirecrawl === true && n.noCrawlee === true, "no n8n/Firecrawl/Crawlee");
});

// 11
await test("governance gate exports expected helpers", () => {
  check(typeof PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION === "string", "version export");
  check(Array.isArray(WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS), "REQUIRED_FLAGS export");
  check(Array.isArray(WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES), "REQUIRED_POLICIES export");
  check(typeof WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS === "object", "PROHIBITED_CLAIMS export");
  check(Array.isArray(WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(typeof WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE === "object", "SCHEMA_COVERAGE export");
  check(typeof createWorkflowGovernanceResult === "function", "createWorkflowGovernanceResult export");
  check(typeof validateWorkflowSchemaGovernance === "function", "validateWorkflowSchemaGovernance export");
  check(typeof validateAllWorkflowSchemaGovernance === "function", "validateAllWorkflowSchemaGovernance export");
  check(typeof validateWorkflowOutputGovernance === "function", "validateWorkflowOutputGovernance export");
  check(typeof validateWorkflowSourceCards === "function", "validateWorkflowSourceCards export");
  check(typeof validateWorkflowMetadataGovernance === "function", "validateWorkflowMetadataGovernance export");
  check(typeof detectProhibitedWorkflowClaims === "function", "detectProhibitedWorkflowClaims export");
  check(typeof normalizeGovernanceModeId === "function", "normalizeGovernanceModeId export");
  check(typeof getWorkflowGovernanceRequirements === "function", "getWorkflowGovernanceRequirements export");
  check(typeof getWorkflowGovernanceSchemaCoverage === "function", "getWorkflowGovernanceSchemaCoverage export");
  check(typeof validateWorkflowGovernanceGate === "function", "validateWorkflowGovernanceGate export");
});

// 12
await test("PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION exists", () => {
  check(PHASE_09G_WORKFLOW_OUTPUT_GOVERNANCE_GATE_VERSION.length > 0, "version non-empty");
});

// 13
await test("required flags include all mandated flags", () => {
  const expected = [
    "runtimeWiringFalse", "featureFlagDefaultOff", "humanReviewRequired", "sourceCardsRequired",
    "missingFactsRequired", "assumptionsRequired", "finalFilingFalse", "automaticSubmissionFalse",
    "liveGenerationFalse", "persistentStorageFalse"
  ];
  for (const flag of expected) check(WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_FLAGS.includes(flag), `required flags include ${flag}`);
});

// 14
await test("required policies include all mandated policies", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "source_cards_required",
    "missing_facts_required", "assumptions_required", "human_review_required", "no_fabricated_citations",
    "no_memory_activation", "no_third_party_egress", "no_production_change"
  ];
  for (const policy of expected) check(WORKFLOW_OUTPUT_GOVERNANCE_REQUIRED_POLICIES.includes(policy), `required policies include ${policy}`);
});

// 15
await test("prohibited claims include all mandated claim ids", () => {
  const expected = [
    "final_filing_claim", "automatic_submission_claim", "production_ready_claim", "memory_enabled_claim",
    "external_search_implemented_claim", "n8n_implemented_claim", "firecrawl_implemented_claim",
    "crawlee_implemented_claim", "phase10_source_governance_implemented_claim",
    "phase11_retrieval_optimization_implemented_claim", "official_url_verification_without_official_url_claim",
    "currentness_fully_verified_claim", "guaranteed_tax_outcome_claim", "guaranteed_bir_outcome_claim",
    "guaranteed_audit_outcome_claim", "guaranteed_compliance_outcome_claim", "automatic_filing_implemented_claim"
  ];
  for (const claimId of expected) check(Object.prototype.hasOwnProperty.call(WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_CLAIMS, claimId), `prohibited claims include ${claimId}`);
});

// 16
await test("prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "unsupported_legal_conclusion", "final_filing_claim", "automatic_submission",
    "live_web_search", "new_authority_ingestion", "memory_write", "client_matter_persistence",
    "generated_work_product_persistence", "third_party_egress", "production_change"
  ];
  for (const behavior of expected) check(WORKFLOW_OUTPUT_GOVERNANCE_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
});

// 17
await test("schema coverage records dedicated schemas for the five modes", () => {
  for (const modeId of ["tax_memo", "bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist"]) {
    check(WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE.dedicated.includes(modeId), `dedicated coverage includes ${modeId}`);
  }
});

// 18
await test("schema coverage records requirements_request_letter as registry-only/pending", () => {
  check(WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE.registryOnlyPending.includes("requirements_request_letter"), "registry-only pending includes requirements_request_letter");
});

// 19
await test("schema coverage does not claim requirements_request_letter dedicated schema exists", () => {
  check(!WORKFLOW_OUTPUT_GOVERNANCE_SCHEMA_COVERAGE.dedicated.includes("requirements_request_letter"), "dedicated does not include requirements_request_letter");
});

// 20 + 21
await test("getWorkflowGovernanceRequirements returns defensive copy; mutation does not affect internals", () => {
  const req = getWorkflowGovernanceRequirements();
  req.requiredFlags.push("INJECTED");
  req.schemaCoverage.dedicated.push("INJECTED_MODE");
  const again = getWorkflowGovernanceRequirements();
  check(!again.requiredFlags.includes("INJECTED"), "requiredFlags unaffected by prior mutation");
  check(!again.schemaCoverage.dedicated.includes("INJECTED_MODE"), "schemaCoverage unaffected by prior mutation");
});

// 22 + 23
await test("getWorkflowGovernanceSchemaCoverage returns defensive copy; mutation does not affect internals", () => {
  const coverage = getWorkflowGovernanceSchemaCoverage();
  coverage.dedicated.push("INJECTED");
  const again = getWorkflowGovernanceSchemaCoverage();
  check(!again.dedicated.includes("INJECTED"), "coverage unaffected by prior mutation");
});

// 24 + 25
await test("createWorkflowGovernanceResult returns fresh objects; mutation does not affect another", () => {
  const a = createWorkflowGovernanceResult();
  const b = createWorkflowGovernanceResult();
  a.errors.push("x");
  a.valid = false;
  a.prohibitedClaims.matches.push({ claimId: "x", path: "y", matchedText: "z" });
  check(b.errors.length === 0, "second result errors unaffected");
  check(b.valid === true, "second result valid unaffected");
  check(b.prohibitedClaims.matches.length === 0, "second result prohibitedClaims unaffected");
});

// 26
await test("normalizeGovernanceModeId maps canonical IDs and aliases correctly", () => {
  const cases = [
    ["tax_memo", "tax_memo"],
    ["tax memo", "tax_memo"],
    ["BIR reply", "bir_reply_protest_draft"],
    ["protest", "bir_reply_protest_draft"],
    ["audit defense", "audit_defense_matrix"],
    ["client advisory", "client_advisory"],
    ["checklist", "compliance_checklist"],
    ["requirements letter", "requirements_request_letter"]
  ];
  for (const [input, expected] of cases) check(normalizeGovernanceModeId(input) === expected, `${input} -> ${expected}`);
});

// 27
await test("normalizeGovernanceModeId returns null for unsupported values", () => {
  check(normalizeGovernanceModeId("totally unsupported") === null, "unsupported returns null");
  check(normalizeGovernanceModeId(null) === null, "null returns null");
  check(normalizeGovernanceModeId(42) === null, "number returns null");
});

// 28
await test("validateWorkflowMetadataGovernance passes for safe metadata", () => {
  const metadata = {
    finalFiling: false,
    automaticSubmission: false,
    runtimeWiring: false,
    featureFlagDefault: "off",
    retrievalPolicy: ["existing_retrieval_only"],
    authorityPolicy: ["no_fabricated_citations"],
    sourceCardPolicy: ["current_phase9_gdrive_archive_acceptable"],
    privacyPolicy: ["no_memory_activation", "no_third_party_egress"]
  };
  const result = validateWorkflowMetadataGovernance(metadata);
  check(result.valid === true, `safe metadata should validate: ${JSON.stringify(result.errors)}`);
});

// 29
await test("validateWorkflowMetadataGovernance fails if finalFiling true", () => {
  const result = validateWorkflowMetadataGovernance({ finalFiling: true, automaticSubmission: false, runtimeWiring: false, featureFlagDefault: "off" });
  check(result.valid === false, "finalFiling true invalid");
});

// 30
await test("validateWorkflowMetadataGovernance fails if automaticSubmission true", () => {
  const result = validateWorkflowMetadataGovernance({ finalFiling: false, automaticSubmission: true, runtimeWiring: false, featureFlagDefault: "off" });
  check(result.valid === false, "automaticSubmission true invalid");
});

// 31
await test("validateWorkflowMetadataGovernance fails if runtimeWiring true", () => {
  const result = validateWorkflowMetadataGovernance({ finalFiling: false, automaticSubmission: false, runtimeWiring: true, featureFlagDefault: "off" });
  check(result.valid === false, "runtimeWiring true invalid");
});

// 32
await test("validateWorkflowMetadataGovernance fails if featureFlagDefault not off", () => {
  const result = validateWorkflowMetadataGovernance({ finalFiling: false, automaticSubmission: false, runtimeWiring: false, featureFlagDefault: "on" });
  check(result.valid === false, "featureFlagDefault not off invalid");
});

// 33
await test("validateWorkflowMetadataGovernance warns when policy arrays are missing", () => {
  const result = validateWorkflowMetadataGovernance({ finalFiling: false, automaticSubmission: false, runtimeWiring: false, featureFlagDefault: "off" });
  check(result.valid === true, "minimal safe metadata still valid");
  check(result.warnings.some((w) => /retrievalPolicy/i.test(w)), "warns retrievalPolicy missing");
  check(result.warnings.some((w) => /authorityPolicy/i.test(w)), "warns authorityPolicy missing");
  check(result.warnings.some((w) => /sourceCardPolicy/i.test(w)), "warns sourceCardPolicy missing");
  check(result.warnings.some((w) => /privacyPolicy/i.test(w)), "warns privacyPolicy missing");
});

// 34
await test("validateWorkflowSourceCards passes with Phase 9 archive/GDrive-only source cards", () => {
  const result = validateWorkflowSourceCards([makeSafeSourceCard()]);
  check(result.valid === true, `Phase 9 archive-only cards should validate: ${JSON.stringify(result.errors)}`);
});

// 35
await test("validateWorkflowSourceCards does not require officialUrl by default", () => {
  const result = validateWorkflowSourceCards([{ title: "x", archiveUrl: "https://drive.google.com/x" }]);
  check(result.valid === true, "no officialUrl required by default");
});

// 36
await test("validateWorkflowSourceCards does not require canonicalSourceId by default", () => {
  const result = validateWorkflowSourceCards([{ title: "x", archiveUrl: "https://drive.google.com/x" }]);
  check(result.valid === true, "no canonicalSourceId required by default");
});

// 37
await test("validateWorkflowSourceCards fails when sourceCards missing/not array", () => {
  check(validateWorkflowSourceCards(null).valid === false, "null invalid");
  check(validateWorkflowSourceCards("not array").valid === false, "string invalid");
  check(validateWorkflowSourceCards(undefined).valid === false, "undefined invalid");
});

// 38
await test("validateWorkflowSourceCards fails when requireNonEmpty true and sourceCards empty", () => {
  const result = validateWorkflowSourceCards([], { requireNonEmpty: true });
  check(result.valid === false, "empty array with requireNonEmpty true invalid");
});

// 39
await test("validateWorkflowSourceCards fails if official URL verification claim appears without officialUrl", () => {
  const result = validateWorkflowSourceCards([{ title: "x", excerpt: "official url verification complete" }]);
  check(result.valid === false, "official URL verification claim without officialUrl invalid");
});

// 40
await test("validateWorkflowSourceCards fails if currentness fully verified claim appears without currentnessStatus", () => {
  const result = validateWorkflowSourceCards([{ title: "x", excerpt: "currentness fully verified" }]);
  check(result.valid === false, "currentness fully verified claim without currentnessStatus invalid");
});

// 41
await test("detectProhibitedWorkflowClaims detects final filing claim", () => {
  const result = detectProhibitedWorkflowClaims("This constitutes a final filing of the return.");
  check(result.hasProhibitedClaims === true, "detects final filing claim");
  check(result.matches.some((m) => m.claimId === "final_filing_claim"), "claimId is final_filing_claim");
});

// 42
await test("detectProhibitedWorkflowClaims detects automatic submission claim", () => {
  const result = detectProhibitedWorkflowClaims("This has been automatically filed with the BIR without your review.");
  check(result.hasProhibitedClaims === true, "detects automatic submission claim");
  check(result.matches.some((m) => m.claimId === "automatic_submission_claim"), "claimId is automatic_submission_claim");
});

// 43
await test("detectProhibitedWorkflowClaims detects production ready claim", () => {
  const result = detectProhibitedWorkflowClaims("This system is now production ready.");
  check(result.hasProhibitedClaims === true, "detects production ready claim");
  check(result.matches.some((m) => m.claimId === "production_ready_claim"), "claimId is production_ready_claim");
});

// 44
await test("detectProhibitedWorkflowClaims detects memory enabled claim", () => {
  const result = detectProhibitedWorkflowClaims("Memory is enabled for this session.");
  check(result.hasProhibitedClaims === true, "detects memory enabled claim");
  check(result.matches.some((m) => m.claimId === "memory_enabled_claim"), "claimId is memory_enabled_claim");
});

// 45
await test("detectProhibitedWorkflowClaims detects external search/n8n/Firecrawl/Crawlee implemented claims", () => {
  check(detectProhibitedWorkflowClaims("External search implemented for this query.").matches.some((m) => m.claimId === "external_search_implemented_claim"), "external search implemented detected");
  check(detectProhibitedWorkflowClaims("Processed via an n8n workflow executed automatically.").matches.some((m) => m.claimId === "n8n_implemented_claim"), "n8n implemented detected");
  check(detectProhibitedWorkflowClaims("Data gathered because Firecrawl implemented the crawl.").matches.some((m) => m.claimId === "firecrawl_implemented_claim"), "Firecrawl implemented detected");
  check(detectProhibitedWorkflowClaims("The crawl uses Crawlee implemented internally.").matches.some((m) => m.claimId === "crawlee_implemented_claim"), "Crawlee implemented detected");
});

// 46
await test("detectProhibitedWorkflowClaims detects Phase 10/Phase 11 implemented claims", () => {
  check(detectProhibitedWorkflowClaims("Phase 10 implemented this feature already.").matches.some((m) => m.claimId === "phase10_source_governance_implemented_claim"), "Phase 10 implemented detected");
  check(detectProhibitedWorkflowClaims("Phase 11 implemented retrieval speedups.").matches.some((m) => m.claimId === "phase11_retrieval_optimization_implemented_claim"), "Phase 11 implemented detected");
});

// 47
await test("detectProhibitedWorkflowClaims detects guaranteed tax/BIR/audit/compliance outcome claims", () => {
  check(detectProhibitedWorkflowClaims("This memo offers a guaranteed tax outcome.").matches.some((m) => m.claimId === "guaranteed_tax_outcome_claim"), "guaranteed tax outcome detected");
  check(detectProhibitedWorkflowClaims("We provide a guaranteed BIR outcome for your protest.").matches.some((m) => m.claimId === "guaranteed_bir_outcome_claim"), "guaranteed BIR outcome detected");
  check(detectProhibitedWorkflowClaims("This matrix ensures a guaranteed audit outcome.").matches.some((m) => m.claimId === "guaranteed_audit_outcome_claim"), "guaranteed audit outcome detected");
  check(detectProhibitedWorkflowClaims("This checklist provides a guaranteed compliance outcome.").matches.some((m) => m.claimId === "guaranteed_compliance_outcome_claim"), "guaranteed compliance outcome detected");
});

// 48
await test("detectProhibitedWorkflowClaims returns no match for safe draft-only language", () => {
  const result = detectProhibitedWorkflowClaims("This is a draft memorandum for your professional review. Please verify all facts before use.");
  check(result.hasProhibitedClaims === false, "no match for safe draft language");
  check(result.matches.length === 0, "matches empty for safe draft language");
});

// 49
await test("detectProhibitedWorkflowClaims caps matchedText to a safe short snippet", () => {
  const longText = `${"padding text ".repeat(20)}production ready${" more padding text".repeat(20)}`;
  const result = detectProhibitedWorkflowClaims(longText);
  check(result.hasProhibitedClaims === true, "long text still detected");
  const match = result.matches.find((m) => m.claimId === "production_ready_claim");
  check(!!match, "match found for long text");
  check(match.matchedText.length <= 120, `matchedText capped to 120 chars (found length ${match.matchedText.length})`);
});

// 50
await test("validateWorkflowOutputGovernance passes for safe tax_memo scaffold output", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `tax_memo output should validate: ${JSON.stringify(result.errors)}`);
});

// 51
await test("validateWorkflowOutputGovernance passes for safe bir_reply_protest_draft scaffold output", () => {
  const output = fillCommonFields(createEmptyBirReplyDraftOutput());
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `bir_reply_protest_draft output should validate: ${JSON.stringify(result.errors)}`);
});

// 52
await test("validateWorkflowOutputGovernance passes for safe audit_defense_matrix scaffold output", () => {
  const output = fillCommonFields(createEmptyAuditDefenseMatrixOutput());
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `audit_defense_matrix output should validate: ${JSON.stringify(result.errors)}`);
});

// 53
await test("validateWorkflowOutputGovernance passes for safe client_advisory scaffold output", () => {
  const output = fillCommonFields(createEmptyClientAdvisoryOutput());
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `client_advisory output should validate: ${JSON.stringify(result.errors)}`);
});

// 54
await test("validateWorkflowOutputGovernance passes for safe compliance_checklist scaffold output", () => {
  const output = fillCommonFields(createEmptyComplianceChecklistOutput());
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `compliance_checklist output should validate: ${JSON.stringify(result.errors)}`);
});

// 55
await test("validateWorkflowOutputGovernance returns warning for requirements_request_letter (dedicated schema pending)", () => {
  const output = {
    mode: "requirements_request_letter",
    schemaKey: "requirementsRequestLetterOutput",
    opening: "Dear Client,",
    requestedDocuments: [{ document: "2023 audited financial statements" }],
    professionalCaveat: "This is a draft request only.",
    closing: "Thank you.",
    assumptions: ["assumed engagement scope covers calendar year 2023"],
    missingFacts: ["client TIN"],
    sourceCards: [makeSafeSourceCard()],
    humanReviewNotice: "Review before sending to the client.",
    metadata: { finalFiling: false, automaticSubmission: false, runtimeWiring: false, featureFlagDefault: "off" }
  };
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === true, `requirements_request_letter output should validate: ${JSON.stringify(result.errors)}`);
  check(result.warnings.includes("dedicated_schema_pending"), "warns dedicated_schema_pending");
});

// 56
await test("validateWorkflowOutputGovernance fails for unsupported mode", () => {
  const result = validateWorkflowOutputGovernance({
    mode: "not_a_real_mode",
    schemaKey: "x",
    sourceCards: [],
    missingFacts: [],
    assumptions: [],
    humanReviewNotice: "",
    metadata: {}
  });
  check(result.valid === false, "unsupported mode invalid");
  check(result.errors.some((e) => /unsupported mode/i.test(e)), "error mentions unsupported mode");
});

// 57
await test("validateWorkflowOutputGovernance fails for schemaKey mismatch", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  output.schemaKey = "wrongSchemaKey";
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "schemaKey mismatch invalid");
  check(result.errors.some((e) => /schemaKey mismatch/i.test(e)), "error mentions schemaKey mismatch");
});

// 58
await test("validateWorkflowOutputGovernance fails when sourceCards missing", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  delete output.sourceCards;
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "missing sourceCards invalid");
});

// 59
await test("validateWorkflowOutputGovernance fails when missingFacts missing", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  delete output.missingFacts;
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "missing missingFacts invalid");
});

// 60
await test("validateWorkflowOutputGovernance fails when assumptions missing", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  delete output.assumptions;
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "missing assumptions invalid");
});

// 61
await test("validateWorkflowOutputGovernance fails when humanReviewNotice missing", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  delete output.humanReviewNotice;
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "missing humanReviewNotice invalid");
});

// 62
await test("validateWorkflowOutputGovernance fails when metadata finalFiling true", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  output.metadata.finalFiling = true;
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "metadata.finalFiling true invalid");
});

// 63
await test("validateWorkflowOutputGovernance fails when prohibited claims appear", () => {
  const output = fillCommonFields(createEmptyTaxMemoOutput());
  output.humanReviewNotice = "This draft is production ready.";
  const result = validateWorkflowOutputGovernance(output);
  check(result.valid === false, "prohibited claim in output invalid");
  check(result.prohibitedClaims.hasProhibitedClaims === true, "prohibitedClaims flagged");
});

// 64-68
await test("validateWorkflowSchemaGovernance passes for all five dedicated schema modes", () => {
  for (const modeId of ["tax_memo", "bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist"]) {
    const result = validateWorkflowSchemaGovernance(modeId);
    check(result.valid === true, `${modeId} schema governance should validate: ${JSON.stringify(result.errors)}`);
  }
});

// 69
await test("validateWorkflowSchemaGovernance returns valid true with warning dedicated_schema_pending for requirements_request_letter", () => {
  const result = validateWorkflowSchemaGovernance("requirements_request_letter");
  check(result.valid === true, `requirements_request_letter should validate: ${JSON.stringify(result.errors)}`);
  check(result.warnings.includes("dedicated_schema_pending"), "warns dedicated_schema_pending");
});

// 70
await test("validateAllWorkflowSchemaGovernance returns valid true", () => {
  const result = validateAllWorkflowSchemaGovernance();
  check(result.valid === true, `all schema governance should validate: ${JSON.stringify(result.errors)}`);
});

// 71
await test("validateAllWorkflowSchemaGovernance includes all six modes", () => {
  const result = validateAllWorkflowSchemaGovernance();
  check(result.modeResults.length === 6, "six mode results");
  const modes = result.modeResults.map((r) => r.mode);
  for (const modeId of WORKFLOW_MODE_IDS) check(modes.includes(modeId), `mode results include ${modeId}`);
});

// 72
await test("validateWorkflowGovernanceGate returns valid true", () => {
  const result = validateWorkflowGovernanceGate();
  check(result.valid === true, `gate self-check should validate: ${JSON.stringify(result.errors)}`);
});

// 73
await test("fixture source-card boundary matches Phase 9/Phase 10 policy", () => {
  const b = fx.sourceCardBoundary;
  check(b.currentPhase9GdriveArchiveAcceptable === true, "current Phase 9 GDrive/archive acceptable");
  check(b.officialUrlRequiredInPhase9 === false, "officialUrl not required in Phase 9");
  check(b.canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceId not required in Phase 9");
  check(b.futurePhase10OfficialUrlPrimaryArchiveUrlSecondaryCanonicalSourceIdInternal === true, "future Phase 10 policy recorded");
  check(b.noPhase10ImplementationInThisPatch === true, "no Phase 10 implementation in this patch");
});

// 74
await test("fixture future patch plan includes PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"]), "future patch plan includes PHASE-09H");
});

// 75
await test("fixture optional recommendation may include PHASE-09I but next task remains PHASE-09H", () => {
  check(Array.isArray(fx.optionalLaterRecommendation), "optionalLaterRecommendation present");
  check(hasAll(fx.optionalLaterRecommendation, ["PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1"]), "optional recommendation includes PHASE-09I");
  check(fx.nextTask.recommendedNext === "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1", "next task remains PHASE-09H");
});

// 76
await test("fixture prohibited claims for report include required non-claims", () => {
  check(hasAll(fx.prohibitedClaimsForReport, [
    "live professional workflow generation implemented",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented",
    "guaranteed tax outcome",
    "guaranteed BIR outcome",
    "guaranteed audit outcome",
    "guaranteed compliance outcome",
    "automatic filing implemented"
  ]), "required prohibited claims for report present");
});

// 77
await test("next task is PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1", "next task PHASE-09H");
});

// 78
await test("test file contains no live HTTP/API/network calls and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
  const importTargets = [...selfSrc.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "import targets discovered");
  for (const target of importTargets) {
    check(target.startsWith("node:") || target.startsWith("../workflow/"), `only node: builtins or workflow helpers may be imported (found: ${target})`);
  }
});

// 79
await test("static source scan: workflow-output-governance-gate.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(GATE_PATH), "utf8");
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 80
await test("static source scan: governance gate imports only allowed pure Phase 9 schema/registry helpers", () => {
  const src = readFileSync(resolve(GATE_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "governance gate imports at least the allowed schema/registry helpers");
  for (const target of importTargets) {
    check(ALLOWED_IMPORT_FILES.includes(target), `only allowed workflow helpers may be imported (found: ${target})`);
    check(!/server\.js|ask-handler\.js|pipeline\.js|routes\//i.test(target), `import target must not reference server/ask-handler/pipeline/routes (found: ${target})`);
  }
});

console.log(`\nPHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
