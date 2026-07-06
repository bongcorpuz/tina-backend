// PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1
//
// Validates the pure workflow mode registry and its fixture. NO live HTTP, NO
// OpenAI / Supabase / Google Drive / n8n / Firecrawl / Crawlee, NO env vars, NO
// server import, NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09B_WORKFLOW_REGISTRY_VERSION,
  WORKFLOW_MODE_IDS,
  WORKFLOW_MODE_REGISTRY,
  getWorkflowMode,
  listWorkflowModes,
  isSupportedWorkflowMode,
  normalizeWorkflowModeId,
  getWorkflowModeOutputSchema,
  getWorkflowModeRequiredInputs,
  getWorkflowModeSourceCardRequirement,
  validateWorkflowModeRegistry
} from "../workflow/workflow-mode-registry.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09b-workflow-mode-registry-scaffold-1.fixture.json";
const REGISTRY_PATH = "workflow/workflow-mode-registry.js";
const SELF_PATH = "tests/phase-09b-workflow-mode-registry-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09B WORKFLOW MODE REGISTRY SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09B WORKFLOW MODE REGISTRY SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09B WORKFLOW MODE REGISTRY SCAFFOLD FAIL",
  "PHASE 09B WORKFLOW MODE REGISTRY SCAFFOLD BLOCKED"
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
await test("registry file exists", () => {
  check(existsSync(resolve(REGISTRY_PATH)), `${REGISTRY_PATH} must exist`);
});

// 3
await test("patch id matches PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is f2cf292", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("f2cf292"), "base commit f2cf292");
});

// 6
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.pureScaffold === true, "pureScaffold true");
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
await test("registry exports expected helpers", () => {
  check(typeof PHASE_09B_WORKFLOW_REGISTRY_VERSION === "string", "version export present");
  check(Array.isArray(WORKFLOW_MODE_IDS), "WORKFLOW_MODE_IDS export present");
  check(typeof WORKFLOW_MODE_REGISTRY === "object", "WORKFLOW_MODE_REGISTRY export present");
  check(typeof getWorkflowMode === "function", "getWorkflowMode export present");
  check(typeof listWorkflowModes === "function", "listWorkflowModes export present");
  check(typeof isSupportedWorkflowMode === "function", "isSupportedWorkflowMode export present");
  check(typeof normalizeWorkflowModeId === "function", "normalizeWorkflowModeId export present");
  check(typeof getWorkflowModeOutputSchema === "function", "getWorkflowModeOutputSchema export present");
  check(typeof getWorkflowModeRequiredInputs === "function", "getWorkflowModeRequiredInputs export present");
  check(typeof getWorkflowModeSourceCardRequirement === "function", "getWorkflowModeSourceCardRequirement export present");
  check(typeof validateWorkflowModeRegistry === "function", "validateWorkflowModeRegistry export present");
});

const CANONICAL_IDS = [
  "tax_memo",
  "bir_reply_protest_draft",
  "audit_defense_matrix",
  "client_advisory",
  "compliance_checklist",
  "requirements_request_letter"
];

// 12
await test("WORKFLOW_MODE_IDS includes exactly six canonical IDs", () => {
  check(WORKFLOW_MODE_IDS.length === 6, "exactly six IDs");
  for (const id of CANONICAL_IDS) check(WORKFLOW_MODE_IDS.includes(id), `includes ${id}`);
});

// 13
await test("WORKFLOW_MODE_REGISTRY includes exactly six modes", () => {
  check(Object.keys(WORKFLOW_MODE_REGISTRY).length === 6, "exactly six modes in registry");
});

// 14
await test("listWorkflowModes returns six modes in deterministic order", () => {
  const list = listWorkflowModes();
  check(list.length === 6, "six modes returned");
  check(list.map((m) => m.id).join(",") === WORKFLOW_MODE_IDS.join(","), "order matches WORKFLOW_MODE_IDS");
});

// 15 + 16
await test("getWorkflowMode returns defensive copies; mutation does not affect registry", () => {
  const mode = getWorkflowMode("tax_memo");
  check(mode && mode.id === "tax_memo", "returns tax_memo");
  mode.label = "MUTATED";
  mode.outputSections.push("INJECTED");
  const again = getWorkflowMode("tax_memo");
  check(again.label === "Tax Memo", "label unaffected by prior mutation");
  check(!again.outputSections.includes("INJECTED"), "outputSections unaffected by prior mutation");
});

// 17
await test("isSupportedWorkflowMode returns true for canonical IDs", () => {
  for (const id of CANONICAL_IDS) check(isSupportedWorkflowMode(id) === true, `${id} supported`);
  check(isSupportedWorkflowMode("not_a_mode") === false, "unsupported id returns false");
});

// 18
await test("normalizeWorkflowModeId maps aliases correctly", () => {
  const cases = [
    ["tax memo", "tax_memo"],
    ["memo", "tax_memo"],
    ["tax_memo", "tax_memo"],
    ["BIR reply", "bir_reply_protest_draft"],
    ["protest", "bir_reply_protest_draft"],
    ["audit defense", "audit_defense_matrix"],
    ["defense matrix", "audit_defense_matrix"],
    ["client advisory", "client_advisory"],
    ["advisory", "client_advisory"],
    ["checklist", "compliance_checklist"],
    ["compliance checklist", "compliance_checklist"],
    ["requirements letter", "requirements_request_letter"],
    ["request letter", "requirements_request_letter"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeWorkflowModeId(input) === expected, `"${input}" -> ${expected}`);
  }
});

// 19
await test("unsupported alias returns null", () => {
  check(normalizeWorkflowModeId("totally unknown mode") === null, "unsupported returns null");
  check(normalizeWorkflowModeId(123) === null, "non-string returns null");
  check(normalizeWorkflowModeId(null) === null, "null returns null");
  check(normalizeWorkflowModeId("") === null, "empty string returns null");
});

const REQUIRED_FIELDS = [
  "id", "label", "shortLabel", "purpose", "phase", "status", "runtimeWiring",
  "featureFlagDefault", "outputType", "outputSections", "requiredInputs",
  "optionalInputs", "retrievalPolicy", "authorityPolicy", "sourceCardPolicy",
  "privacyPolicy", "prohibitedBehaviors", "humanReviewRequired",
  "missingFactsRequired", "assumptionsRequired", "sourceCardsRequired",
  "schemaKey", "nextScaffoldPatch"
];

// 20
await test("every mode has required fields", () => {
  for (const id of CANONICAL_IDS) {
    const mode = getWorkflowMode(id);
    for (const field of REQUIRED_FIELDS) {
      check(Object.prototype.hasOwnProperty.call(mode, field), `${id} has field ${field}`);
    }
  }
});

// 21
await test("every mode has runtimeWiring false", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).runtimeWiring === false, `${id} runtimeWiring false`);
});

// 22
await test("every mode has featureFlagDefault off", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).featureFlagDefault === "off", `${id} featureFlagDefault off`);
});

// 23
await test("every mode has humanReviewRequired true", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).humanReviewRequired === true, `${id} humanReviewRequired true`);
});

// 24
await test("every mode has missingFactsRequired true", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).missingFactsRequired === true, `${id} missingFactsRequired true`);
});

// 25
await test("every mode has assumptionsRequired true", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).assumptionsRequired === true, `${id} assumptionsRequired true`);
});

// 26
await test("every mode has sourceCardsRequired true", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).sourceCardsRequired === true, `${id} sourceCardsRequired true`);
});

// 27
await test("every mode prohibits live_web_search", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).prohibitedBehaviors.includes("live_web_search"), `${id} prohibits live_web_search`);
});

// 28
await test("every mode prohibits new_authority_ingestion", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).prohibitedBehaviors.includes("new_authority_ingestion"), `${id} prohibits new_authority_ingestion`);
});

// 29
await test("every mode prohibits memory_write", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).prohibitedBehaviors.includes("memory_write"), `${id} prohibits memory_write`);
});

// 30
await test("every mode prohibits production_change", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).prohibitedBehaviors.includes("production_change"), `${id} prohibits production_change`);
});

// 31
await test("every mode has retrievalPolicy existing_retrieval_only", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).retrievalPolicy.includes("existing_retrieval_only"), `${id} retrievalPolicy existing_retrieval_only`);
});

// 32
await test("every mode has authorityPolicy no_fabricated_citations", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).authorityPolicy.includes("no_fabricated_citations"), `${id} authorityPolicy no_fabricated_citations`);
});

// 33
await test("every mode has sourceCardPolicy current_phase9_gdrive_archive_acceptable", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).sourceCardPolicy.includes("current_phase9_gdrive_archive_acceptable"), `${id} sourceCardPolicy current_phase9_gdrive_archive_acceptable`);
});

// 34
await test("every mode has sourceCardPolicy phase10_official_url_archive_url_canonical_source_id_future", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).sourceCardPolicy.includes("phase10_official_url_archive_url_canonical_source_id_future"), `${id} sourceCardPolicy phase10 future`);
});

// 35
await test("every mode has privacyPolicy no_persistent_client_matter_storage", () => {
  for (const id of CANONICAL_IDS) check(getWorkflowMode(id).privacyPolicy.includes("no_persistent_client_matter_storage"), `${id} privacyPolicy no_persistent_client_matter_storage`);
});

// 36
await test("every mode has schemaKey", () => {
  for (const id of CANONICAL_IDS) check(typeof getWorkflowMode(id).schemaKey === "string" && getWorkflowMode(id).schemaKey.length > 0, `${id} has schemaKey`);
});

// 37
await test("every mode has nextScaffoldPatch", () => {
  for (const id of CANONICAL_IDS) check(typeof getWorkflowMode(id).nextScaffoldPatch === "string" && getWorkflowMode(id).nextScaffoldPatch.length > 0, `${id} has nextScaffoldPatch`);
});

// 38-42
await test("getWorkflowModeOutputSchema returns required boolean invariants", () => {
  for (const id of CANONICAL_IDS) {
    const schema = getWorkflowModeOutputSchema(id);
    check(schema.sourceCardsRequired === true, `${id} schema sourceCardsRequired true`);
    check(schema.missingFactsRequired === true, `${id} schema missingFactsRequired true`);
    check(schema.assumptionsRequired === true, `${id} schema assumptionsRequired true`);
    check(schema.finalFiling === false, `${id} schema finalFiling false`);
    check(schema.automaticSubmission === false, `${id} schema automaticSubmission false`);
  }
});

// 43
await test("getWorkflowModeRequiredInputs returns non-empty array for each mode", () => {
  for (const id of CANONICAL_IDS) {
    const inputs = getWorkflowModeRequiredInputs(id);
    check(Array.isArray(inputs) && inputs.length > 0, `${id} required inputs non-empty`);
  }
});

// 44
await test("getWorkflowModeSourceCardRequirement returns required true", () => {
  for (const id of CANONICAL_IDS) {
    const req = getWorkflowModeSourceCardRequirement(id);
    check(req.required === true, `${id} source card requirement true`);
  }
});

// 45
await test("validateWorkflowModeRegistry returns valid true and modeCount 6", () => {
  const result = validateWorkflowModeRegistry();
  check(result.valid === true, `registry valid: errors=${JSON.stringify(result.errors)}`);
  check(result.modeCount === 6, "modeCount 6");
  check(Array.isArray(result.modeIds) && result.modeIds.length === 6, "modeIds length 6");
});

// 46
await test("fixture future patch plan includes PHASE-09C through PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1",
    "PHASE-09D-AUDIT-DEFENSE-MATRIX-SCAFFOLD-1",
    "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1",
    "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1",
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan C-H present");
});

// 47
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "runtime implemented",
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

// 48
await test("next task is PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09C-TAX-MEMO-SCHEMA-SCAFFOLD-1", "next task PHASE-09C");
});

// 49
await test("test file contains no live HTTP/API/network calls and reads no env vars", () => {
  const selfSrc = readFileSync(resolve(SELF_PATH), "utf8");
  check(!/[^"'`.\w]fetch\s*\(|https?\.(request|get)\s*\(/.test(selfSrc), "no HTTP");
  check(!/process\.env\.\w/.test(selfSrc), "no process.env.<NAME> reads");
  const importTargets = [...selfSrc.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "import targets discovered");
  for (const target of importTargets) {
    check(target.startsWith("node:") || target.startsWith("../workflow/"), `only node: builtins or the workflow registry may be imported (found: ${target})`);
  }
});

await test("registry source file has no forbidden dependencies", () => {
  const src = readFileSync(resolve(REGISTRY_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `registry must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09B-WORKFLOW-MODE-REGISTRY-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
