// PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1
//
// Validates the pure Audit Defense Matrix schema scaffold and its fixture. NO
// live HTTP, NO OpenAI / Supabase / Google Drive / n8n / Firecrawl / Crawlee, NO
// env vars, NO server import, NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION,
  AUDIT_DEFENSE_MATRIX_SCHEMA,
  AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS,
  AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS,
  AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS,
  AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES,
  AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS,
  AUDIT_DEFENSE_MATRIX_RISK_LEVELS,
  createEmptyAuditDefenseMatrixOutput,
  createEmptyAuditDefenseMatrixRow,
  getAuditDefenseMatrixSchema,
  getAuditDefenseMatrixRequiredInputs,
  getAuditDefenseMatrixRequiredOutputColumns,
  getAuditDefenseMatrixGovernanceRules,
  getAuditDefenseMatrixRiskLevels,
  getAuditDefenseMatrixSourceCardRequirement,
  validateAuditDefenseMatrixOutputShape,
  validateAuditDefenseMatrixRowShape,
  validateAuditDefenseMatrixSchema,
  normalizeAuditDefenseMatrixIssues,
  normalizeAuditDefenseRiskLevel
} from "../workflow/audit-defense-matrix-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09d-audit-defense-matrix-scaffold-1.fixture.json";
const SCHEMA_PATH = "workflow/audit-defense-matrix-schema.js";
const SELF_PATH = "tests/phase-09d-audit-defense-matrix-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09D AUDIT DEFENSE MATRIX SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09D AUDIT DEFENSE MATRIX SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09D AUDIT DEFENSE MATRIX SCAFFOLD FAIL",
  "PHASE 09D AUDIT DEFENSE MATRIX SCAFFOLD BLOCKED"
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

// 1
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2
await test("schema file exists", () => {
  check(existsSync(resolve(SCHEMA_PATH)), `${SCHEMA_PATH} must exist`);
});

// 3
await test("patch id matches PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is 263d51a", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("263d51a"), "base commit 263d51a");
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

// 11
await test("schema exports expected helpers", () => {
  check(typeof PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION === "string", "version export");
  check(typeof AUDIT_DEFENSE_MATRIX_SCHEMA === "object", "AUDIT_DEFENSE_MATRIX_SCHEMA export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS), "REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS), "REQUIRED_OUTPUT_COLUMNS export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES), "GOVERNANCE_RULES export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(Array.isArray(AUDIT_DEFENSE_MATRIX_RISK_LEVELS), "RISK_LEVELS export");
  check(typeof createEmptyAuditDefenseMatrixOutput === "function", "createEmptyAuditDefenseMatrixOutput export");
  check(typeof createEmptyAuditDefenseMatrixRow === "function", "createEmptyAuditDefenseMatrixRow export");
  check(typeof getAuditDefenseMatrixSchema === "function", "getAuditDefenseMatrixSchema export");
  check(typeof getAuditDefenseMatrixRequiredInputs === "function", "getAuditDefenseMatrixRequiredInputs export");
  check(typeof getAuditDefenseMatrixRequiredOutputColumns === "function", "getAuditDefenseMatrixRequiredOutputColumns export");
  check(typeof getAuditDefenseMatrixGovernanceRules === "function", "getAuditDefenseMatrixGovernanceRules export");
  check(typeof getAuditDefenseMatrixRiskLevels === "function", "getAuditDefenseMatrixRiskLevels export");
  check(typeof getAuditDefenseMatrixSourceCardRequirement === "function", "getAuditDefenseMatrixSourceCardRequirement export");
  check(typeof validateAuditDefenseMatrixOutputShape === "function", "validateAuditDefenseMatrixOutputShape export");
  check(typeof validateAuditDefenseMatrixRowShape === "function", "validateAuditDefenseMatrixRowShape export");
  check(typeof validateAuditDefenseMatrixSchema === "function", "validateAuditDefenseMatrixSchema export");
  check(typeof normalizeAuditDefenseMatrixIssues === "function", "normalizeAuditDefenseMatrixIssues export");
  check(typeof normalizeAuditDefenseRiskLevel === "function", "normalizeAuditDefenseRiskLevel export");
});

// 12
await test("PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION exists", () => {
  check(PHASE_09D_AUDIT_DEFENSE_MATRIX_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 13-22
await test("AUDIT_DEFENSE_MATRIX_SCHEMA identity fields are correct", () => {
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.mode === "audit_defense_matrix", "mode audit_defense_matrix");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.schemaKey === "auditDefenseMatrixOutput", "schemaKey auditDefenseMatrixOutput");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.runtimeWiring === false, "runtimeWiring false");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.finalFiling === false, "finalFiling false");
  check(AUDIT_DEFENSE_MATRIX_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 23
await test("required inputs include issues, auditorPosition, facts, taxPeriod, availableDocuments, intendedUse", () => {
  for (const input of ["issues", "auditorPosition", "facts", "taxPeriod", "availableDocuments", "intendedUse"]) {
    check(AUDIT_DEFENSE_MATRIX_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 24
await test("required output columns match the stable canonical list", () => {
  const expected = [
    "issue", "birAuditorPosition", "taxpayerPosition", "authority", "evidenceNeeded",
    "riskLevel", "recommendedAction", "assumptions", "missingFacts", "sourceCards", "humanReviewNotice"
  ];
  check(AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS.join(",") === expected.join(","), "canonical output columns match");
});

// 25
await test("required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "matrixRows", "summary", "overallRisks", "assumptions",
    "missingFacts", "documentsNeeded", "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) {
    check(AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
  }
});

// 26
await test("risk levels include low, moderate, high, critical, unknown", () => {
  for (const level of ["low", "moderate", "high", "critical", "unknown"]) {
    check(AUDIT_DEFENSE_MATRIX_RISK_LEVELS.includes(level), `risk levels include ${level}`);
  }
});

// 27-37
await test("governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion",
    "no_fabricated_citations", "source_cards_required", "missing_facts_required",
    "human_review_required", "evidence_gap_disclosure_required", "risk_level_required",
    "no_memory_activation", "no_third_party_egress"
  ];
  for (const rule of expected) {
    check(AUDIT_DEFENSE_MATRIX_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
  }
});

// 38-44
await test("prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "final_filing_claim", "live_web_search", "memory_write",
    "production_change", "guaranteed_audit_outcome_claim", "taxpayer_position_without_factual_basis"
  ];
  for (const behavior of expected) {
    check(AUDIT_DEFENSE_MATRIX_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
  }
});

// 45 + 46
await test("getAuditDefenseMatrixSchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getAuditDefenseMatrixSchema();
  check(schema.mode === "audit_defense_matrix", "schema mode audit_defense_matrix");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getAuditDefenseMatrixSchema();
  check(again.mode === "audit_defense_matrix", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 47 + 48
await test("createEmptyAuditDefenseMatrixOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyAuditDefenseMatrixOutput();
  const b = createEmptyAuditDefenseMatrixOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  a.matrixRows.push(createEmptyAuditDefenseMatrixRow());
  check(b.sourceCards.length === 0, "second instance sourceCards unaffected");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
  check(b.matrixRows.length === 0, "second instance matrixRows unaffected");
});

// 49
await test("createEmptyAuditDefenseMatrixOutput includes all required top-level fields", () => {
  const output = createEmptyAuditDefenseMatrixOutput();
  for (const field of AUDIT_DEFENSE_MATRIX_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 50
await test("createEmptyAuditDefenseMatrixOutput metadata defaults are correct", () => {
  const output = createEmptyAuditDefenseMatrixOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 51 + 52
await test("createEmptyAuditDefenseMatrixRow returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyAuditDefenseMatrixRow();
  const b = createEmptyAuditDefenseMatrixRow();
  a.authority.push({ authorityType: "RR" });
  a.riskLevel = "high";
  check(b.authority.length === 0, "second row authority unaffected");
  check(b.riskLevel === "unknown", "second row riskLevel unaffected");
});

// 53
await test("createEmptyAuditDefenseMatrixRow includes all required output columns", () => {
  const row = createEmptyAuditDefenseMatrixRow();
  for (const column of AUDIT_DEFENSE_MATRIX_REQUIRED_OUTPUT_COLUMNS) {
    check(Object.prototype.hasOwnProperty.call(row, column), `empty row has column ${column}`);
  }
});

// 54
await test("createEmptyAuditDefenseMatrixRow riskLevel defaults to unknown", () => {
  check(createEmptyAuditDefenseMatrixRow().riskLevel === "unknown", "riskLevel defaults to unknown");
});

// 55
await test("validateAuditDefenseMatrixOutputShape: valid true for empty scaffold, with warnings for empty arrays", () => {
  const output = createEmptyAuditDefenseMatrixOutput();
  const result = validateAuditDefenseMatrixOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /matrixRows/i.test(w)), "warns on empty matrixRows");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /overallRisks/i.test(w)), "warns on empty overallRisks");
});

// 56
await test("validateAuditDefenseMatrixRowShape: valid true for empty scaffold row, with warnings", () => {
  const row = createEmptyAuditDefenseMatrixRow();
  const result = validateAuditDefenseMatrixRowShape(row);
  check(result.valid === true, `empty row should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /authority/i.test(w)), "warns on empty authority");
  check(result.warnings.some((w) => /evidenceNeeded/i.test(w)), "warns on empty evidenceNeeded");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /riskLevel is unknown/i.test(w)), "warns on unknown risk level");
});

// 57
await test("validateAuditDefenseMatrixOutputShape: valid false for malformed input", () => {
  const result = validateAuditDefenseMatrixOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed output invalid");
  check(result.errors.length > 0, "errors recorded for malformed output");
});

// 58
await test("validateAuditDefenseMatrixRowShape: valid false for malformed input", () => {
  const result = validateAuditDefenseMatrixRowShape({ riskLevel: "not_a_real_level" });
  check(result.valid === false, "malformed row invalid");
  check(result.errors.length > 0, "errors recorded for malformed row");
});

// 59
await test("both validators do not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const outResult = validateAuditDefenseMatrixOutputShape(bad);
    const rowResult = validateAuditDefenseMatrixRowShape(bad);
    check(outResult.valid === false, `output validator: non-object input ${JSON.stringify(bad)} is invalid`);
    check(rowResult.valid === false, `row validator: non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 60
await test("validateAuditDefenseMatrixSchema returns valid true", () => {
  const result = validateAuditDefenseMatrixSchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 61
await test("validateAuditDefenseMatrixSchema returns required counts", () => {
  const result = validateAuditDefenseMatrixSchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputColumnCount === "number" && result.requiredOutputColumnCount > 0, "requiredOutputColumnCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
  check(typeof result.riskLevelCount === "number" && result.riskLevelCount === 5, "riskLevelCount 5");
});

// 62
await test("normalizeAuditDefenseMatrixIssues handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues("single issue")) === JSON.stringify(["single issue"]), "string becomes one-item array");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeAuditDefenseMatrixIssues({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 63
await test("normalizeAuditDefenseRiskLevel maps aliases to canonical values", () => {
  const cases = [
    ["low", "low"],
    ["medium", "moderate"],
    ["moderate", "moderate"],
    ["med", "moderate"],
    ["high", "high"],
    ["critical", "critical"],
    ["urgent", "critical"],
    ["unknown", "unknown"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally-not-a-level", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeAuditDefenseRiskLevel(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 64
await test("getAuditDefenseMatrixSourceCardRequirement returns required true", () => {
  check(getAuditDefenseMatrixSourceCardRequirement().required === true, "required true");
});

// 65
await test("getAuditDefenseMatrixSourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getAuditDefenseMatrixSourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 66
await test("getAuditDefenseMatrixSourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getAuditDefenseMatrixSourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 67
await test("getAuditDefenseMatrixSourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getAuditDefenseMatrixSourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
});

// 68
await test("fixture source-card boundary matches Phase 9/Phase 10 policy", () => {
  const b = fx.sourceCardBoundary;
  check(b.currentPhase9GdriveArchiveAcceptable === true, "current Phase 9 GDrive/archive acceptable");
  check(b.officialUrlRequiredInPhase9 === false, "officialUrl not required in Phase 9");
  check(b.canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceId not required in Phase 9");
  check(b.futurePhase10OfficialUrlPrimaryArchiveUrlSecondaryCanonicalSourceIdInternal === true, "future Phase 10 policy recorded");
  check(b.noPhase10ImplementationInThisPatch === true, "no Phase 10 implementation in this patch");
});

// 69
await test("fixture future patch plan includes PHASE-09E through PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1",
    "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1",
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan E-H present");
});

// 70
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "live audit defense matrix generation implemented",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented",
    "guaranteed audit outcome"
  ]), "required prohibited claims present");
});

// 71
await test("next task is PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1", "next task PHASE-09E");
});

// 72
await test("test file contains no live HTTP/API/network calls and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
  const importTargets = [...selfSrc.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "import targets discovered");
  for (const target of importTargets) {
    check(target.startsWith("node:") || target.startsWith("../workflow/"), `only node: builtins or the workflow schema may be imported (found: ${target})`);
  }
});

// 73
await test("static source scan: audit-defense-matrix-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
