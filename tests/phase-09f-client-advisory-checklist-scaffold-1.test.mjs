// PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1
//
// Validates the pure Client Advisory and Compliance Checklist schema scaffolds
// and their shared fixture. NO live HTTP, NO OpenAI / Supabase / Google Drive /
// n8n / Firecrawl / Crawlee, NO env vars, NO server import, NO server start, NO
// port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION,
  CLIENT_ADVISORY_SCHEMA,
  CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS,
  CLIENT_ADVISORY_REQUIRED_INPUTS,
  CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS,
  CLIENT_ADVISORY_GOVERNANCE_RULES,
  CLIENT_ADVISORY_PROHIBITED_BEHAVIORS,
  CLIENT_ADVISORY_AUDIENCE_TYPES,
  createEmptyClientAdvisoryOutput,
  getClientAdvisorySchema,
  getClientAdvisoryRequiredInputs,
  getClientAdvisoryRequiredOutputSections,
  getClientAdvisoryGovernanceRules,
  getClientAdvisoryAudienceTypes,
  getClientAdvisorySourceCardRequirement,
  validateClientAdvisoryOutputShape,
  validateClientAdvisorySchema,
  normalizeClientAdvisoryIssues,
  normalizeClientAdvisoryAudienceType
} from "../workflow/client-advisory-schema.js";
import {
  PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION,
  COMPLIANCE_CHECKLIST_SCHEMA,
  COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS,
  COMPLIANCE_CHECKLIST_REQUIRED_INPUTS,
  COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS,
  COMPLIANCE_CHECKLIST_GOVERNANCE_RULES,
  COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS,
  COMPLIANCE_CHECKLIST_STATUS_VALUES,
  COMPLIANCE_CHECKLIST_PRIORITY_VALUES,
  createEmptyComplianceChecklistOutput,
  createEmptyComplianceChecklistTask,
  getComplianceChecklistSchema,
  getComplianceChecklistRequiredInputs,
  getComplianceChecklistRequiredOutputColumns,
  getComplianceChecklistGovernanceRules,
  getComplianceChecklistStatusValues,
  getComplianceChecklistPriorityValues,
  getComplianceChecklistSourceCardRequirement,
  validateComplianceChecklistOutputShape,
  validateComplianceChecklistTaskShape,
  validateComplianceChecklistSchema,
  normalizeComplianceChecklistTopics,
  normalizeComplianceChecklistStatus,
  normalizeComplianceChecklistPriority
} from "../workflow/compliance-checklist-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09f-client-advisory-checklist-scaffold-1.fixture.json";
const CLIENT_ADVISORY_SCHEMA_PATH = "workflow/client-advisory-schema.js";
const COMPLIANCE_CHECKLIST_SCHEMA_PATH = "workflow/compliance-checklist-schema.js";
const SELF_PATH = "tests/phase-09f-client-advisory-checklist-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09F CLIENT ADVISORY CHECKLIST SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09F CLIENT ADVISORY CHECKLIST SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09F CLIENT ADVISORY CHECKLIST SCAFFOLD FAIL",
  "PHASE 09F CLIENT ADVISORY CHECKLIST SCAFFOLD BLOCKED"
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

// ===== 1: Fixture / schema file existence =====

// 1
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2, 65
await test("both schema files exist", () => {
  check(existsSync(resolve(CLIENT_ADVISORY_SCHEMA_PATH)), `${CLIENT_ADVISORY_SCHEMA_PATH} must exist`);
  check(existsSync(resolve(COMPLIANCE_CHECKLIST_SCHEMA_PATH)), `${COMPLIANCE_CHECKLIST_SCHEMA_PATH} must exist`);
});

// 3
await test("patch id matches PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is 3a1f393", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("3a1f393"), "base commit 3a1f393");
});

// 6
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.pureSchemaScaffold === true, "pureSchemaScaffold true");
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

// ===== CLIENT ADVISORY =====

// 11
await test("Client Advisory schema exports expected helpers", () => {
  check(typeof PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION === "string", "version export");
  check(typeof CLIENT_ADVISORY_SCHEMA === "object", "CLIENT_ADVISORY_SCHEMA export");
  check(Array.isArray(CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS), "REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(CLIENT_ADVISORY_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS), "REQUIRED_OUTPUT_SECTIONS export");
  check(Array.isArray(CLIENT_ADVISORY_GOVERNANCE_RULES), "GOVERNANCE_RULES export");
  check(Array.isArray(CLIENT_ADVISORY_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(Array.isArray(CLIENT_ADVISORY_AUDIENCE_TYPES), "AUDIENCE_TYPES export");
  check(typeof createEmptyClientAdvisoryOutput === "function", "createEmptyClientAdvisoryOutput export");
  check(typeof getClientAdvisorySchema === "function", "getClientAdvisorySchema export");
  check(typeof getClientAdvisoryRequiredInputs === "function", "getClientAdvisoryRequiredInputs export");
  check(typeof getClientAdvisoryRequiredOutputSections === "function", "getClientAdvisoryRequiredOutputSections export");
  check(typeof getClientAdvisoryGovernanceRules === "function", "getClientAdvisoryGovernanceRules export");
  check(typeof getClientAdvisoryAudienceTypes === "function", "getClientAdvisoryAudienceTypes export");
  check(typeof getClientAdvisorySourceCardRequirement === "function", "getClientAdvisorySourceCardRequirement export");
  check(typeof validateClientAdvisoryOutputShape === "function", "validateClientAdvisoryOutputShape export");
  check(typeof validateClientAdvisorySchema === "function", "validateClientAdvisorySchema export");
  check(typeof normalizeClientAdvisoryIssues === "function", "normalizeClientAdvisoryIssues export");
  check(typeof normalizeClientAdvisoryAudienceType === "function", "normalizeClientAdvisoryAudienceType export");
});

// 12
await test("PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION exists", () => {
  check(PHASE_09F_CLIENT_ADVISORY_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 13-22
await test("CLIENT_ADVISORY_SCHEMA identity fields are correct", () => {
  check(CLIENT_ADVISORY_SCHEMA.mode === "client_advisory", "mode client_advisory");
  check(CLIENT_ADVISORY_SCHEMA.schemaKey === "clientAdvisoryOutput", "schemaKey clientAdvisoryOutput");
  check(CLIENT_ADVISORY_SCHEMA.runtimeWiring === false, "runtimeWiring false");
  check(CLIENT_ADVISORY_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
  check(CLIENT_ADVISORY_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
  check(CLIENT_ADVISORY_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
  check(CLIENT_ADVISORY_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
  check(CLIENT_ADVISORY_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
  check(CLIENT_ADVISORY_SCHEMA.finalFiling === false, "finalFiling false");
  check(CLIENT_ADVISORY_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 23
await test("Client Advisory required inputs include issue, facts, taxpayerType, intendedAudience, urgency", () => {
  for (const input of ["issue", "facts", "taxpayerType", "intendedAudience", "urgency"]) {
    check(CLIENT_ADVISORY_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 24
await test("Client Advisory required output sections match the stable canonical list", () => {
  const expected = [
    "plainLanguageAnswer", "businessImpact", "complianceAction", "deadlinesIfKnown", "risks",
    "documentsNeeded", "assumptions", "missingFacts", "sourceCards", "humanReviewNotice"
  ];
  check(CLIENT_ADVISORY_REQUIRED_OUTPUT_SECTIONS.join(",") === expected.join(","), "canonical output sections match");
});

// 25
await test("Client Advisory required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "plainLanguageAnswer", "businessImpact", "complianceAction", "deadlinesIfKnown",
    "risks", "documentsNeeded", "assumptions", "missingFacts", "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) {
    check(CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
  }
});

// 26
await test("Client Advisory audience types include all mandated types", () => {
  for (const t of ["client", "management", "board", "owner", "accountant", "legal", "operations", "unknown"]) {
    check(CLIENT_ADVISORY_AUDIENCE_TYPES.includes(t), `audience types include ${t}`);
  }
});

// 27-38
await test("Client Advisory governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_fabricated_citations",
    "source_cards_required", "missing_facts_required", "human_review_required", "plain_language_required",
    "business_impact_must_be_tied_to_facts", "deadlines_disclosed_only_if_known", "no_memory_activation",
    "no_third_party_egress"
  ];
  for (const rule of expected) {
    check(CLIENT_ADVISORY_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
  }
});

// 39-46
await test("Client Advisory prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "final_filing_claim", "live_web_search", "memory_write", "production_change",
    "guaranteed_tax_outcome_claim", "business_impact_without_factual_basis", "false_timeliness_assurance"
  ];
  for (const behavior of expected) {
    check(CLIENT_ADVISORY_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
  }
});

// 47 + 48
await test("getClientAdvisorySchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getClientAdvisorySchema();
  check(schema.mode === "client_advisory", "schema mode client_advisory");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getClientAdvisorySchema();
  check(again.mode === "client_advisory", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 49 + 50
await test("createEmptyClientAdvisoryOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyClientAdvisoryOutput();
  const b = createEmptyClientAdvisoryOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  a.metadata.audienceType = "client";
  check(b.sourceCards.length === 0, "second instance sourceCards unaffected");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
  check(b.metadata.audienceType === "unknown", "second instance audienceType unaffected");
});

// 51
await test("createEmptyClientAdvisoryOutput includes all required top-level fields", () => {
  const output = createEmptyClientAdvisoryOutput();
  for (const field of CLIENT_ADVISORY_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 52
await test("createEmptyClientAdvisoryOutput metadata defaults are correct", () => {
  const output = createEmptyClientAdvisoryOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 53
await test("createEmptyClientAdvisoryOutput metadata audienceType defaults to unknown", () => {
  check(createEmptyClientAdvisoryOutput().metadata.audienceType === "unknown", "audienceType defaults to unknown");
});

// 54
await test("validateClientAdvisoryOutputShape: valid true for empty scaffold, with warnings", () => {
  const output = createEmptyClientAdvisoryOutput();
  const result = validateClientAdvisoryOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /plainLanguageAnswer/i.test(w)), "warns on empty plainLanguageAnswer");
  check(result.warnings.some((w) => /businessImpact/i.test(w)), "warns on empty businessImpact");
  check(result.warnings.some((w) => /complianceAction/i.test(w)), "warns on empty complianceAction");
  check(result.warnings.some((w) => /risks/i.test(w)), "warns on empty risks");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /audienceType is unknown/i.test(w)), "warns on unknown audienceType");
});

// 55
await test("validateClientAdvisoryOutputShape: valid false for malformed input", () => {
  const result = validateClientAdvisoryOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed input invalid");
  check(result.errors.length > 0, "errors recorded for malformed input");
});

// 56
await test("validateClientAdvisoryOutputShape does not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const result = validateClientAdvisoryOutputShape(bad);
    check(result.valid === false, `non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 57
await test("validateClientAdvisorySchema returns valid true", () => {
  const result = validateClientAdvisorySchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 58
await test("validateClientAdvisorySchema returns required counts", () => {
  const result = validateClientAdvisorySchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputSectionCount === "number" && result.requiredOutputSectionCount > 0, "requiredOutputSectionCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
  check(typeof result.audienceTypeCount === "number" && result.audienceTypeCount > 0, "audienceTypeCount present");
});

// 59
await test("normalizeClientAdvisoryIssues handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeClientAdvisoryIssues(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeClientAdvisoryIssues("single issue")) === JSON.stringify(["single issue"]), "string becomes one-item array");
  check(JSON.stringify(normalizeClientAdvisoryIssues("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeClientAdvisoryIssues(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeClientAdvisoryIssues(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeClientAdvisoryIssues(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeClientAdvisoryIssues({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 60
await test("normalizeClientAdvisoryAudienceType maps aliases to canonical values", () => {
  const cases = [
    ["client", "client"],
    ["management", "management"],
    ["manager", "management"],
    ["board", "board"],
    ["BOD", "board"],
    ["directors", "board"],
    ["owner", "owner"],
    ["shareholder", "owner"],
    ["stockholder", "owner"],
    ["accountant", "accountant"],
    ["accounting", "accountant"],
    ["legal", "legal"],
    ["lawyer", "legal"],
    ["counsel", "legal"],
    ["operations", "operations"],
    ["ops", "operations"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally unsupported", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeClientAdvisoryAudienceType(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 61
await test("getClientAdvisorySourceCardRequirement returns required true", () => {
  check(getClientAdvisorySourceCardRequirement().required === true, "required true");
});

// 62
await test("getClientAdvisorySourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getClientAdvisorySourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 63
await test("getClientAdvisorySourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getClientAdvisorySourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 64
await test("getClientAdvisorySourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getClientAdvisorySourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
});

// ===== COMPLIANCE CHECKLIST =====

// 66
await test("Compliance Checklist schema exports expected helpers", () => {
  check(typeof PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION === "string", "version export");
  check(typeof COMPLIANCE_CHECKLIST_SCHEMA === "object", "COMPLIANCE_CHECKLIST_SCHEMA export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS), "REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS), "REQUIRED_OUTPUT_COLUMNS export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_GOVERNANCE_RULES), "GOVERNANCE_RULES export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_STATUS_VALUES), "STATUS_VALUES export");
  check(Array.isArray(COMPLIANCE_CHECKLIST_PRIORITY_VALUES), "PRIORITY_VALUES export");
  check(typeof createEmptyComplianceChecklistOutput === "function", "createEmptyComplianceChecklistOutput export");
  check(typeof createEmptyComplianceChecklistTask === "function", "createEmptyComplianceChecklistTask export");
  check(typeof getComplianceChecklistSchema === "function", "getComplianceChecklistSchema export");
  check(typeof getComplianceChecklistRequiredInputs === "function", "getComplianceChecklistRequiredInputs export");
  check(typeof getComplianceChecklistRequiredOutputColumns === "function", "getComplianceChecklistRequiredOutputColumns export");
  check(typeof getComplianceChecklistGovernanceRules === "function", "getComplianceChecklistGovernanceRules export");
  check(typeof getComplianceChecklistStatusValues === "function", "getComplianceChecklistStatusValues export");
  check(typeof getComplianceChecklistPriorityValues === "function", "getComplianceChecklistPriorityValues export");
  check(typeof getComplianceChecklistSourceCardRequirement === "function", "getComplianceChecklistSourceCardRequirement export");
  check(typeof validateComplianceChecklistOutputShape === "function", "validateComplianceChecklistOutputShape export");
  check(typeof validateComplianceChecklistTaskShape === "function", "validateComplianceChecklistTaskShape export");
  check(typeof validateComplianceChecklistSchema === "function", "validateComplianceChecklistSchema export");
  check(typeof normalizeComplianceChecklistTopics === "function", "normalizeComplianceChecklistTopics export");
  check(typeof normalizeComplianceChecklistStatus === "function", "normalizeComplianceChecklistStatus export");
  check(typeof normalizeComplianceChecklistPriority === "function", "normalizeComplianceChecklistPriority export");
});

// 67
await test("PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION exists", () => {
  check(PHASE_09F_COMPLIANCE_CHECKLIST_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 68-77
await test("COMPLIANCE_CHECKLIST_SCHEMA identity fields are correct", () => {
  check(COMPLIANCE_CHECKLIST_SCHEMA.mode === "compliance_checklist", "mode compliance_checklist");
  check(COMPLIANCE_CHECKLIST_SCHEMA.schemaKey === "complianceChecklistOutput", "schemaKey complianceChecklistOutput");
  check(COMPLIANCE_CHECKLIST_SCHEMA.runtimeWiring === false, "runtimeWiring false");
  check(COMPLIANCE_CHECKLIST_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
  check(COMPLIANCE_CHECKLIST_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
  check(COMPLIANCE_CHECKLIST_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
  check(COMPLIANCE_CHECKLIST_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
  check(COMPLIANCE_CHECKLIST_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
  check(COMPLIANCE_CHECKLIST_SCHEMA.finalFiling === false, "finalFiling false");
  check(COMPLIANCE_CHECKLIST_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 78
await test("Compliance Checklist required inputs include complianceTopic, taxpayerType, taxPeriodOrDate, facts, intendedUse", () => {
  for (const input of ["complianceTopic", "taxpayerType", "taxPeriodOrDate", "facts", "intendedUse"]) {
    check(COMPLIANCE_CHECKLIST_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 79
await test("Compliance Checklist required output columns match the stable canonical list", () => {
  const expected = [
    "task", "responsibleParty", "requiredDocument", "deadlineTiming", "authoritySource",
    "status", "priority", "notes", "assumptions", "missingFacts", "sourceCards", "humanReviewNotice"
  ];
  check(COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS.join(",") === expected.join(","), "canonical output columns match");
});

// 80
await test("Compliance Checklist required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "checklistItems", "summary", "assumptions", "missingFacts",
    "documentsNeeded", "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) {
    check(COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
  }
});

// 81
await test("Compliance Checklist status values include all mandated values", () => {
  for (const s of ["not_started", "in_progress", "pending_client", "pending_bir", "pending_sec", "pending_lgu", "completed", "blocked", "not_applicable", "unknown"]) {
    check(COMPLIANCE_CHECKLIST_STATUS_VALUES.includes(s), `status values include ${s}`);
  }
});

// 82
await test("Compliance Checklist priority values include low, normal, high, urgent, unknown", () => {
  for (const p of ["low", "normal", "high", "urgent", "unknown"]) {
    check(COMPLIANCE_CHECKLIST_PRIORITY_VALUES.includes(p), `priority values include ${p}`);
  }
});

// 83-93
await test("Compliance Checklist governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion", "no_fabricated_citations",
    "source_cards_required", "missing_facts_required", "human_review_required",
    "task_must_be_tied_to_authority_or_assumption", "deadline_disclosure_required_if_known",
    "no_memory_activation", "no_third_party_egress"
  ];
  for (const rule of expected) {
    check(COMPLIANCE_CHECKLIST_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
  }
});

// 94-101
await test("Compliance Checklist prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "final_filing_claim", "live_web_search", "memory_write", "production_change",
    "guaranteed_compliance_outcome_claim", "deadline_claim_without_date_basis", "automatic_filing_claim"
  ];
  for (const behavior of expected) {
    check(COMPLIANCE_CHECKLIST_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
  }
});

// 102 + 103
await test("getComplianceChecklistSchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getComplianceChecklistSchema();
  check(schema.mode === "compliance_checklist", "schema mode compliance_checklist");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getComplianceChecklistSchema();
  check(again.mode === "compliance_checklist", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 104 + 105
await test("createEmptyComplianceChecklistOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyComplianceChecklistOutput();
  const b = createEmptyComplianceChecklistOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  a.checklistItems.push(createEmptyComplianceChecklistTask());
  check(b.sourceCards.length === 0, "second instance sourceCards unaffected");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
  check(b.checklistItems.length === 0, "second instance checklistItems unaffected");
});

// 106
await test("createEmptyComplianceChecklistOutput includes all required top-level fields", () => {
  const output = createEmptyComplianceChecklistOutput();
  for (const field of COMPLIANCE_CHECKLIST_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 107
await test("createEmptyComplianceChecklistOutput metadata defaults are correct", () => {
  const output = createEmptyComplianceChecklistOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 108 + 109
await test("createEmptyComplianceChecklistTask returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyComplianceChecklistTask();
  const b = createEmptyComplianceChecklistTask();
  a.authoritySource.push({ authorityType: "RR" });
  a.status = "completed";
  a.priority = "high";
  check(b.authoritySource.length === 0, "second task authoritySource unaffected");
  check(b.status === "unknown", "second task status unaffected");
  check(b.priority === "unknown", "second task priority unaffected");
});

// 110
await test("createEmptyComplianceChecklistTask includes all required output columns", () => {
  const task = createEmptyComplianceChecklistTask();
  for (const column of COMPLIANCE_CHECKLIST_REQUIRED_OUTPUT_COLUMNS) {
    check(Object.prototype.hasOwnProperty.call(task, column), `empty task has column ${column}`);
  }
});

// 111
await test("createEmptyComplianceChecklistTask status defaults to unknown", () => {
  check(createEmptyComplianceChecklistTask().status === "unknown", "status defaults to unknown");
});

// 112
await test("createEmptyComplianceChecklistTask priority defaults to unknown", () => {
  check(createEmptyComplianceChecklistTask().priority === "unknown", "priority defaults to unknown");
});

// 113
await test("validateComplianceChecklistOutputShape: valid true for empty scaffold, with warnings", () => {
  const output = createEmptyComplianceChecklistOutput();
  const result = validateComplianceChecklistOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /checklistItems/i.test(w)), "warns on empty checklistItems");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /documentsNeeded/i.test(w)), "warns on empty documentsNeeded");
});

// 114
await test("validateComplianceChecklistTaskShape: valid true for empty scaffold task, with warnings", () => {
  const task = createEmptyComplianceChecklistTask();
  const result = validateComplianceChecklistTaskShape(task);
  check(result.valid === true, `empty task should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /^task is empty/i.test(w)), "warns on empty task");
  check(result.warnings.some((w) => /authoritySource/i.test(w)), "warns on empty authoritySource");
  check(result.warnings.some((w) => /requiredDocument/i.test(w)), "warns on empty requiredDocument");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /status is unknown/i.test(w)), "warns on unknown status");
  check(result.warnings.some((w) => /priority is unknown/i.test(w)), "warns on unknown priority");
});

// 115
await test("validateComplianceChecklistOutputShape: valid false for malformed input", () => {
  const result = validateComplianceChecklistOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed output invalid");
  check(result.errors.length > 0, "errors recorded for malformed output");
});

// 116
await test("validateComplianceChecklistTaskShape: valid false for malformed input", () => {
  const result = validateComplianceChecklistTaskShape({ status: "not_a_real_status" });
  check(result.valid === false, "malformed task invalid");
  check(result.errors.length > 0, "errors recorded for malformed task");
});

// 117
await test("both compliance checklist validators do not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const outResult = validateComplianceChecklistOutputShape(bad);
    const taskResult = validateComplianceChecklistTaskShape(bad);
    check(outResult.valid === false, `output validator: non-object input ${JSON.stringify(bad)} is invalid`);
    check(taskResult.valid === false, `task validator: non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 118
await test("validateComplianceChecklistSchema returns valid true", () => {
  const result = validateComplianceChecklistSchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 119
await test("validateComplianceChecklistSchema returns required counts", () => {
  const result = validateComplianceChecklistSchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputColumnCount === "number" && result.requiredOutputColumnCount > 0, "requiredOutputColumnCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
  check(typeof result.statusValueCount === "number" && result.statusValueCount === 10, "statusValueCount 10");
  check(typeof result.priorityValueCount === "number" && result.priorityValueCount === 5, "priorityValueCount 5");
});

// 120
await test("normalizeComplianceChecklistTopics handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeComplianceChecklistTopics(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeComplianceChecklistTopics("single topic")) === JSON.stringify(["single topic"]), "string becomes one-item array");
  check(JSON.stringify(normalizeComplianceChecklistTopics("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeComplianceChecklistTopics(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeComplianceChecklistTopics(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeComplianceChecklistTopics(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeComplianceChecklistTopics({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 121
await test("normalizeComplianceChecklistStatus maps aliases to canonical values", () => {
  const cases = [
    ["not started", "not_started"],
    ["open", "not_started"],
    ["in progress", "in_progress"],
    ["ongoing", "in_progress"],
    ["pending client", "pending_client"],
    ["pending BIR", "pending_bir"],
    ["pending SEC", "pending_sec"],
    ["pending LGU", "pending_lgu"],
    ["done", "completed"],
    ["completed", "completed"],
    ["blocked", "blocked"],
    ["N/A", "not_applicable"],
    ["not applicable", "not_applicable"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally unsupported", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeComplianceChecklistStatus(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 122
await test("normalizeComplianceChecklistPriority maps aliases to canonical values", () => {
  const cases = [
    ["low", "low"],
    ["normal", "normal"],
    ["medium", "normal"],
    ["med", "normal"],
    ["high", "high"],
    ["urgent", "urgent"],
    ["critical", "urgent"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally unsupported", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeComplianceChecklistPriority(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 123
await test("getComplianceChecklistSourceCardRequirement returns required true", () => {
  check(getComplianceChecklistSourceCardRequirement().required === true, "required true");
});

// 124
await test("getComplianceChecklistSourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getComplianceChecklistSourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 125
await test("getComplianceChecklistSourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getComplianceChecklistSourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 126
await test("getComplianceChecklistSourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getComplianceChecklistSourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
});

// ===== FIXTURE + STATIC SCAN =====

// 127
await test("fixture source-card boundary matches Phase 9/Phase 10 policy", () => {
  const b = fx.sourceCardBoundary;
  check(b.currentPhase9GdriveArchiveAcceptable === true, "current Phase 9 GDrive/archive acceptable");
  check(b.officialUrlRequiredInPhase9 === false, "officialUrl not required in Phase 9");
  check(b.canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceId not required in Phase 9");
  check(b.futurePhase10OfficialUrlPrimaryArchiveUrlSecondaryCanonicalSourceIdInternal === true, "future Phase 10 policy recorded");
  check(b.noPhase10ImplementationInThisPatch === true, "no Phase 10 implementation in this patch");
});

// 128
await test("fixture deadline boundary exists and prohibits false timeliness assurance", () => {
  const d = fx.deadlineBoundary;
  check(d && d.noFalseTimelinessAssurance === true, "deadline boundary prohibits false timeliness assurance");
  check(d.deadlineIncludedOnlyIfUserProvidesDateOrReliableBasis === true, "deadline requires user-provided or reliable basis");
  check(d.noAutomaticFilingOrSubmission === true, "no automatic filing/submission");
});

// 129
await test("fixture future patch plan includes PHASE-09G and PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan G-H present");
});

// 130
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "live client advisory generation implemented",
    "live compliance checklist generation implemented",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented",
    "guaranteed tax outcome",
    "guaranteed compliance outcome",
    "automatic filing implemented"
  ]), "required prohibited claims present");
});

// 131
await test("next task is PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1", "next task PHASE-09G");
});

// 132
await test("test file contains no live HTTP/API/network calls and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
  const importTargets = [...selfSrc.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "import targets discovered");
  for (const target of importTargets) {
    check(target.startsWith("node:") || target.startsWith("../workflow/"), `only node: builtins or workflow schemas may be imported (found: ${target})`);
  }
});

// 133
await test("static source scan: client-advisory-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(CLIENT_ADVISORY_SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 134
await test("static source scan: compliance-checklist-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(COMPLIANCE_CHECKLIST_SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
