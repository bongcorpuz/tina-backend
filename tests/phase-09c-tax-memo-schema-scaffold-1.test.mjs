// PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1
//
// Validates the pure Tax Memo schema scaffold and its fixture. NO live HTTP, NO
// OpenAI / Supabase / Google Drive / n8n / Firecrawl / Crawlee, NO env vars, NO
// server import, NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09C_TAX_MEMO_SCHEMA_VERSION,
  TAX_MEMO_SCHEMA,
  TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS,
  TAX_MEMO_REQUIRED_INPUTS,
  TAX_MEMO_REQUIRED_OUTPUT_SECTIONS,
  TAX_MEMO_GOVERNANCE_RULES,
  TAX_MEMO_PROHIBITED_BEHAVIORS,
  createEmptyTaxMemoOutput,
  getTaxMemoSchema,
  getTaxMemoRequiredInputs,
  getTaxMemoRequiredOutputSections,
  getTaxMemoGovernanceRules,
  getTaxMemoSourceCardRequirement,
  validateTaxMemoOutputShape,
  validateTaxMemoSchema,
  normalizeTaxMemoIssueList
} from "../workflow/tax-memo-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09c-tax-memo-schema-scaffold-1.fixture.json";
const SCHEMA_PATH = "workflow/tax-memo-schema.js";
const SELF_PATH = "tests/phase-09c-tax-memo-schema-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09C TAX MEMO SCHEMA SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09C TAX MEMO SCHEMA SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09C TAX MEMO SCHEMA SCAFFOLD FAIL",
  "PHASE 09C TAX MEMO SCHEMA SCAFFOLD BLOCKED"
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
await test("patch id matches PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is c2738ad", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("c2738ad"), "base commit c2738ad");
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
  check(typeof PHASE_09C_TAX_MEMO_SCHEMA_VERSION === "string", "version export");
  check(typeof TAX_MEMO_SCHEMA === "object", "TAX_MEMO_SCHEMA export");
  check(Array.isArray(TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS), "TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(TAX_MEMO_REQUIRED_INPUTS), "TAX_MEMO_REQUIRED_INPUTS export");
  check(Array.isArray(TAX_MEMO_REQUIRED_OUTPUT_SECTIONS), "TAX_MEMO_REQUIRED_OUTPUT_SECTIONS export");
  check(Array.isArray(TAX_MEMO_GOVERNANCE_RULES), "TAX_MEMO_GOVERNANCE_RULES export");
  check(Array.isArray(TAX_MEMO_PROHIBITED_BEHAVIORS), "TAX_MEMO_PROHIBITED_BEHAVIORS export");
  check(typeof createEmptyTaxMemoOutput === "function", "createEmptyTaxMemoOutput export");
  check(typeof getTaxMemoSchema === "function", "getTaxMemoSchema export");
  check(typeof getTaxMemoRequiredInputs === "function", "getTaxMemoRequiredInputs export");
  check(typeof getTaxMemoRequiredOutputSections === "function", "getTaxMemoRequiredOutputSections export");
  check(typeof getTaxMemoGovernanceRules === "function", "getTaxMemoGovernanceRules export");
  check(typeof getTaxMemoSourceCardRequirement === "function", "getTaxMemoSourceCardRequirement export");
  check(typeof validateTaxMemoOutputShape === "function", "validateTaxMemoOutputShape export");
  check(typeof validateTaxMemoSchema === "function", "validateTaxMemoSchema export");
  check(typeof normalizeTaxMemoIssueList === "function", "normalizeTaxMemoIssueList export");
});

// 12
await test("PHASE_09C_TAX_MEMO_SCHEMA_VERSION exists", () => {
  check(PHASE_09C_TAX_MEMO_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 13
await test("TAX_MEMO_SCHEMA mode is tax_memo", () => {
  check(TAX_MEMO_SCHEMA.mode === "tax_memo", "mode tax_memo");
});

// 14
await test("TAX_MEMO_SCHEMA schemaKey is taxMemoOutput", () => {
  check(TAX_MEMO_SCHEMA.schemaKey === "taxMemoOutput", "schemaKey taxMemoOutput");
});

// 15
await test("TAX_MEMO_SCHEMA runtimeWiring false", () => {
  check(TAX_MEMO_SCHEMA.runtimeWiring === false, "runtimeWiring false");
});

// 16
await test("TAX_MEMO_SCHEMA featureFlagDefault off", () => {
  check(TAX_MEMO_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
});

// 17
await test("TAX_MEMO_SCHEMA humanReviewRequired true", () => {
  check(TAX_MEMO_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
});

// 18
await test("TAX_MEMO_SCHEMA sourceCardsRequired true", () => {
  check(TAX_MEMO_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
});

// 19
await test("TAX_MEMO_SCHEMA missingFactsRequired true", () => {
  check(TAX_MEMO_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
});

// 20
await test("TAX_MEMO_SCHEMA assumptionsRequired true", () => {
  check(TAX_MEMO_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
});

// 21
await test("TAX_MEMO_SCHEMA finalFiling false", () => {
  check(TAX_MEMO_SCHEMA.finalFiling === false, "finalFiling false");
});

// 22
await test("TAX_MEMO_SCHEMA automaticSubmission false", () => {
  check(TAX_MEMO_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 23
await test("required inputs include facts, issue, taxpayerType, taxPeriod, intendedAudience", () => {
  for (const input of ["facts", "issue", "taxpayerType", "taxPeriod", "intendedAudience"]) {
    check(TAX_MEMO_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 24
await test("required output sections match the stable canonical list", () => {
  const expected = [
    "factsProvided", "issues", "applicableAuthorities", "analysis", "conclusion",
    "risksLimitations", "assumptions", "missingFacts", "documentsNeeded", "sourceCards", "humanReviewNotice"
  ];
  check(TAX_MEMO_REQUIRED_OUTPUT_SECTIONS.join(",") === expected.join(","), "canonical output sections match");
});

// 25
await test("required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "factsProvided", "issues", "applicableAuthorities", "analysis",
    "conclusion", "risksLimitations", "assumptions", "missingFacts", "documentsNeeded",
    "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) {
    check(TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
  }
});

// 26-34
await test("governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion",
    "no_fabricated_citations", "source_cards_required", "missing_facts_required",
    "human_review_required", "no_memory_activation", "no_third_party_egress"
  ];
  for (const rule of expected) {
    check(TAX_MEMO_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
  }
});

// 35-39
await test("prohibited behaviors include all mandated behaviors", () => {
  const expected = ["fabricated_authority", "final_filing_claim", "live_web_search", "memory_write", "production_change"];
  for (const behavior of expected) {
    check(TAX_MEMO_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
  }
});

// 40 + 41
await test("getTaxMemoSchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getTaxMemoSchema();
  check(schema.mode === "tax_memo", "schema mode tax_memo");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getTaxMemoSchema();
  check(again.mode === "tax_memo", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 42 + 43
await test("createEmptyTaxMemoOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyTaxMemoOutput();
  const b = createEmptyTaxMemoOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  check(b.sourceCards.length === 0, "second instance unaffected by first's mutation");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
});

// 44
await test("createEmptyTaxMemoOutput includes all required top-level fields", () => {
  const output = createEmptyTaxMemoOutput();
  for (const field of TAX_MEMO_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 45
await test("createEmptyTaxMemoOutput metadata defaults are correct", () => {
  const output = createEmptyTaxMemoOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 46
await test("validateTaxMemoOutputShape: valid true for empty scaffold, with warnings for empty arrays", () => {
  const output = createEmptyTaxMemoOutput();
  const result = validateTaxMemoOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /applicableAuthorities/i.test(w)), "warns on empty applicableAuthorities");
});

// 47
await test("validateTaxMemoOutputShape: valid false for malformed input", () => {
  const result = validateTaxMemoOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed input invalid");
  check(result.errors.length > 0, "errors recorded for malformed input");
});

// 48
await test("validateTaxMemoOutputShape does not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const result = validateTaxMemoOutputShape(bad);
    check(result.valid === false, `non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 49
await test("validateTaxMemoSchema returns valid true", () => {
  const result = validateTaxMemoSchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 50
await test("validateTaxMemoSchema returns required counts", () => {
  const result = validateTaxMemoSchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputSectionCount === "number" && result.requiredOutputSectionCount > 0, "requiredOutputSectionCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
});

// 51
await test("normalizeTaxMemoIssueList handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeTaxMemoIssueList(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeTaxMemoIssueList("single issue")) === JSON.stringify(["single issue"]), "string becomes one-item array");
  check(JSON.stringify(normalizeTaxMemoIssueList("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeTaxMemoIssueList(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeTaxMemoIssueList(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeTaxMemoIssueList(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeTaxMemoIssueList({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 52
await test("getTaxMemoSourceCardRequirement returns required true", () => {
  check(getTaxMemoSourceCardRequirement().required === true, "required true");
});

// 53
await test("getTaxMemoSourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getTaxMemoSourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 54
await test("getTaxMemoSourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getTaxMemoSourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 55
await test("getTaxMemoSourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getTaxMemoSourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
});

// 56
await test("fixture source-card boundary matches Phase 9/Phase 10 policy", () => {
  const b = fx.sourceCardBoundary;
  check(b.currentPhase9GdriveArchiveAcceptable === true, "current Phase 9 GDrive/archive acceptable");
  check(b.officialUrlRequiredInPhase9 === false, "officialUrl not required in Phase 9");
  check(b.canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceId not required in Phase 9");
  check(b.futurePhase10OfficialUrlPrimaryArchiveUrlSecondaryCanonicalSourceIdInternal === true, "future Phase 10 policy recorded");
  check(b.noPhase10ImplementationInThisPatch === true, "no Phase 10 implementation in this patch");
});

// 57
await test("fixture future patch plan includes PHASE-09D through PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1",
    "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1",
    "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1",
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan D-H present");
});

// 58
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "live tax memo generation implemented",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented"
  ]), "required prohibited claims present");
});

// 59
await test("next task is PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1", "next task PHASE-09D");
});

// 60
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

// 61
await test("static source scan: tax-memo-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
