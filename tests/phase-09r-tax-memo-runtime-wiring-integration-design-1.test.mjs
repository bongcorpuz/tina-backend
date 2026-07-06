// PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1
//
// Validates the pure tax-memo runtime integration policy, design document,
// and fixture. NO live HTTP, NO OpenAI / Supabase / Google Drive / n8n /
// Firecrawl / Crawlee, NO env vars, NO server/ask-handler/pipeline import,
// NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION,
  TAX_MEMO_INTEGRATION_TARGET_ROUTE,
  TAX_MEMO_INTEGRATION_ALLOWED_MODE,
  TAX_MEMO_INTEGRATION_BLOCKED_MODES,
  TAX_MEMO_INTEGRATION_FEATURE_FLAGS,
  TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS,
  TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS,
  TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES,
  TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES,
  TAX_MEMO_INTEGRATION_LATER_ALLOWED_FILES,
  TAX_MEMO_INTEGRATION_LATER_FORBIDDEN_FILES,
  TAX_MEMO_INTEGRATION_ROLLOUT_STAGES,
  TAX_MEMO_INTEGRATION_CURRENT_STAGE,
  createTaxMemoIntegrationPolicyResult,
  getTaxMemoRuntimeIntegrationPolicy,
  getTaxMemoIntegrationFeatureFlags,
  getTaxMemoIntegrationRequiredCallerFields,
  getTaxMemoIntegrationRequiredPipelineOutputFields,
  getTaxMemoIntegrationRequiredGovernanceGates,
  getTaxMemoIntegrationRolloutStages,
  validateTaxMemoIntegrationCandidate,
  validateTaxMemoIntegrationPolicy
} from "../workflow/tax-memo-runtime-integration-policy.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09r-tax-memo-runtime-wiring-integration-design-1.fixture.json";
const POLICY_PATH = "workflow/tax-memo-runtime-integration-policy.js";
const DESIGN_DOC_PATH = "docs/phase-09/PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN.md";
const SELF_PATH = "tests/phase-09r-tax-memo-runtime-wiring-integration-design-1.test.mjs";

const ALLOWED_IMPORT_FILES = [
  "./workflow-runtime-wiring-policy.js",
  "./tax-memo-runtime-orchestrator.js",
  "./tax-memo-runtime-renderer.js",
  "./workflow-output-governance-gate.js"
];

const VALID_DECISIONS = [
  "PHASE 09R TAX MEMO RUNTIME WIRING INTEGRATION DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME WIRING INTEGRATION DESIGN WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME WIRING INTEGRATION DESIGN FAIL",
  "PHASE 09R TAX MEMO RUNTIME WIRING INTEGRATION DESIGN BLOCKED"
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
let designDoc;
const hasAll = (arr, needles) => {
  const hay = arr.map((s) => String(s).toLowerCase());
  return needles.every((n) => hay.some((h) => h.includes(n.toLowerCase())));
};

function safeCandidate(overrides = {}) {
  const base = {
    modeId: "tax_memo",
    targetRoute: "/ask",
    featureFlags: { TINA_ENABLE_PROFESSIONAL_WORKFLOWS: false, TINA_ENABLE_WORKFLOW_TAX_MEMO: false },
    runtimeOptions: {},
    pipelineOutput: {
      facts: "The taxpayer is a domestic corporation.",
      issues: ["Whether the transaction is subject to VAT."],
      taxpayerType: "domestic corporation",
      taxPeriod: "CY2025",
      intendedAudience: "internal tax team",
      sourceCards: [{ sourceCardId: "sc1", title: "RR 16-2005" }],
      missingFacts: ["exact transaction date"],
      assumptions: ["assumed calendar-year taxpayer"],
      humanReviewNotice: "This draft requires review by a licensed tax professional before use."
    },
    governance: {
      phase09gPassed: true,
      phase09hPolicyPassed: true,
      orchestratorValidated: true,
      rendererValidated: true,
      prohibitedClaimDetectionPassed: true
    },
    changeScope: {
      askHandlerModified: false,
      pipelineModified: false,
      serverModified: false,
      routeAdded: false,
      frontendModified: false,
      envModified: false,
      dbModified: false,
      memoryEnabled: false,
      persistenceAdded: false,
      externalSearchAdded: false,
      thirdPartyEgressAdded: false,
      productionEnabled: false
    }
  };
  return { ...base, ...overrides };
}

// 1
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2
await test("policy file exists", () => {
  check(existsSync(resolve(POLICY_PATH)), `${POLICY_PATH} must exist`);
});

// 3
await test("design document exists", () => {
  check(existsSync(resolve(DESIGN_DOC_PATH)), `${DESIGN_DOC_PATH} must exist`);
  designDoc = readFileSync(resolve(DESIGN_DOC_PATH), "utf8");
});

// 4
await test("patch id matches PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1", () => {
  check(fx.patch.id === "PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1", "patch id");
});

// 5
await test("decision is valid; PASS if all required design elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 6
await test("base commit is 36db1a7", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("36db1a7"), "base commit 36db1a7");
});

// 7
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.designOnly === true, "designOnly true");
  check(n.noLiveAskWiring === true, "noLiveAskWiring true");
  check(n.noDeployment === true, "noDeployment true");
});

// 8
await test("fixture says no ask-handler/pipeline/server/route changes", () => {
  const n = fx.nonRuntimePatch;
  check(n.noAskHandlerChanges === true, "no ask-handler changes");
  check(n.noPipelineChanges === true, "no pipeline changes");
  check(n.noServerChanges === true, "no server changes");
  check(n.noRouteChanges === true, "no route changes");
});

// 9
await test("fixture says no workflow generation activated and no feature flag enabled by default", () => {
  check(fx.nonRuntimePatch.noWorkflowGenerationActivated === true, "no workflow generation activated");
  check(fx.nonRuntimePatch.noFeatureFlagEnabledByDefault === true, "no feature flag enabled by default");
});

// 10
await test("fixture says no memory activation, production unchanged", () => {
  check(fx.nonRuntimePatch.noMemoryActivation === true, "no memory activation");
  check(fx.currentState.productionUnchanged === true, "production unchanged");
});

// 11
await test("fixture says no external search/n8n/Firecrawl/Crawlee", () => {
  const n = fx.nonRuntimePatch;
  check(n.noExternalSearch === true, "no external search");
  check(n.noN8n === true && n.noFirecrawl === true && n.noCrawlee === true, "no n8n/Firecrawl/Crawlee");
});

// 12
await test("policy exports expected helpers", () => {
  check(typeof PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION === "string", "version export");
  check(TAX_MEMO_INTEGRATION_TARGET_ROUTE === "/ask", "target route export");
  check(TAX_MEMO_INTEGRATION_ALLOWED_MODE === "tax_memo", "allowed mode export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_BLOCKED_MODES), "BLOCKED_MODES export");
  check(typeof TAX_MEMO_INTEGRATION_FEATURE_FLAGS === "object", "FEATURE_FLAGS export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS), "REQUIRED_CALLER_FIELDS export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS), "REQUIRED_PIPELINE_OUTPUT_FIELDS export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES), "REQUIRED_GOVERNANCE_GATES export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES), "FORBIDDEN_RUNTIME_CHANGES export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_LATER_ALLOWED_FILES), "LATER_ALLOWED_FILES export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_LATER_FORBIDDEN_FILES), "LATER_FORBIDDEN_FILES export");
  check(Array.isArray(TAX_MEMO_INTEGRATION_ROLLOUT_STAGES), "ROLLOUT_STAGES export");
  check(typeof TAX_MEMO_INTEGRATION_CURRENT_STAGE === "string", "CURRENT_STAGE export");
  check(typeof createTaxMemoIntegrationPolicyResult === "function", "createTaxMemoIntegrationPolicyResult export");
  check(typeof getTaxMemoRuntimeIntegrationPolicy === "function", "getTaxMemoRuntimeIntegrationPolicy export");
  check(typeof getTaxMemoIntegrationFeatureFlags === "function", "getTaxMemoIntegrationFeatureFlags export");
  check(typeof getTaxMemoIntegrationRequiredCallerFields === "function", "getTaxMemoIntegrationRequiredCallerFields export");
  check(typeof getTaxMemoIntegrationRequiredPipelineOutputFields === "function", "getTaxMemoIntegrationRequiredPipelineOutputFields export");
  check(typeof getTaxMemoIntegrationRequiredGovernanceGates === "function", "getTaxMemoIntegrationRequiredGovernanceGates export");
  check(typeof getTaxMemoIntegrationRolloutStages === "function", "getTaxMemoIntegrationRolloutStages export");
  check(typeof validateTaxMemoIntegrationCandidate === "function", "validateTaxMemoIntegrationCandidate export");
  check(typeof validateTaxMemoIntegrationPolicy === "function", "validateTaxMemoIntegrationPolicy export");
});

// 13
await test("PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION exists", () => {
  check(PHASE_09R_TAX_MEMO_RUNTIME_INTEGRATION_POLICY_VERSION.length > 0, "version non-empty");
});

// 14
await test("current stage is design_only_current_patch", () => {
  check(TAX_MEMO_INTEGRATION_CURRENT_STAGE === "design_only_current_patch", "current stage design_only_current_patch");
});

// 15
await test("blocked modes include all five other modes", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    check(TAX_MEMO_INTEGRATION_BLOCKED_MODES.includes(modeId), `blocked modes include ${modeId}`);
  }
});

// 16
await test("feature flags: both primary and mode flags exist and default off", () => {
  check(TAX_MEMO_INTEGRATION_FEATURE_FLAGS.primary.name === "TINA_ENABLE_PROFESSIONAL_WORKFLOWS", "primary flag name");
  check(TAX_MEMO_INTEGRATION_FEATURE_FLAGS.primary.defaultState === "off", "primary flag default off");
  check(TAX_MEMO_INTEGRATION_FEATURE_FLAGS.mode.name === "TINA_ENABLE_WORKFLOW_TAX_MEMO", "mode flag name");
  check(TAX_MEMO_INTEGRATION_FEATURE_FLAGS.mode.defaultState === "off", "mode flag default off");
});

// 17
await test("required caller fields include all mandated fields", () => {
  for (const field of ["modeId", "runtimeOptions", "userExplicitApprovalForRuntimeWiring", "featureFlagEnabled", "governanceGatePassed", "prohibitedClaimDetectionPassed"]) {
    check(TAX_MEMO_INTEGRATION_REQUIRED_CALLER_FIELDS.includes(field), `required caller fields include ${field}`);
  }
});

// 18
await test("required pipeline output fields include all mandated fields", () => {
  for (const field of ["facts", "issues", "taxpayerType", "taxPeriod", "intendedAudience", "sourceCards", "missingFacts", "assumptions", "humanReviewNotice"]) {
    check(TAX_MEMO_INTEGRATION_REQUIRED_PIPELINE_OUTPUT_FIELDS.includes(field), `required pipeline output fields include ${field}`);
  }
});

// 19
await test("required governance gates include all mandated gates", () => {
  for (const gate of [
    "phase_09h_runtime_policy_pass", "phase_09g_output_governance_gate_pass", "phase_09r_orchestrator_validation_pass",
    "phase_09r_renderer_validation_pass", "selected_mode_tax_memo_only", "source_cards_nonempty",
    "missing_facts_present", "assumptions_present", "human_review_notice_present", "no_prohibited_claims",
    "no_final_filing_claim", "no_automatic_submission", "no_persistence", "no_memory", "no_external_search",
    "no_third_party_egress", "no_production_enablement"
  ]) {
    check(TAX_MEMO_INTEGRATION_REQUIRED_GOVERNANCE_GATES.includes(gate), `required governance gates include ${gate}`);
  }
});

// 20
await test("forbidden runtime changes include all mandated changes", () => {
  for (const change of [
    "enabling_feature_flag_by_default", "adding_new_route", "modifying_server_in_this_patch",
    "modifying_ask_handler_in_this_patch", "modifying_pipeline_in_this_patch", "enabling_memory",
    "adding_persistence", "calling_external_search", "calling_n8n", "calling_firecrawl", "calling_crawlee",
    "implementing_phase_10", "implementing_phase_11", "production_enablement"
  ]) {
    check(TAX_MEMO_INTEGRATION_FORBIDDEN_RUNTIME_CHANGES.includes(change), `forbidden runtime changes include ${change}`);
  }
});

// 21
await test("rollout stages match the stable seven-stage sequence", () => {
  const expected = [
    "design_only_current_patch",
    "local_unit_integration_with_no_route_change",
    "ask_handler_guarded_integration_feature_flag_off",
    "staging_flag_on_tax_memo_only",
    "staging_smoke_evidence",
    "closure_gate",
    "production_consideration_only_after_explicit_approval"
  ];
  check(TAX_MEMO_INTEGRATION_ROLLOUT_STAGES.join(",") === expected.join(","), "rollout stages stable sequence");
});

// 22 + 23
await test("getTaxMemoRuntimeIntegrationPolicy returns defensive copy; mutation does not affect internals", () => {
  const policy = getTaxMemoRuntimeIntegrationPolicy();
  policy.blockedModes.push("INJECTED");
  policy.rolloutStages.push("INJECTED");
  const again = getTaxMemoRuntimeIntegrationPolicy();
  check(!again.blockedModes.includes("INJECTED"), "blockedModes unaffected by prior mutation");
  check(!again.rolloutStages.includes("INJECTED"), "rolloutStages unaffected by prior mutation");
});

// 24
await test("getTaxMemoIntegrationFeatureFlags returns defensive copy", () => {
  const flags = getTaxMemoIntegrationFeatureFlags();
  flags.primary.defaultState = "on";
  check(getTaxMemoIntegrationFeatureFlags().primary.defaultState === "off", "primary flag unaffected by prior mutation");
});

// 25
await test("getTaxMemoIntegrationRequiredCallerFields returns defensive copy", () => {
  const fields = getTaxMemoIntegrationRequiredCallerFields();
  fields.push("INJECTED");
  check(!getTaxMemoIntegrationRequiredCallerFields().includes("INJECTED"), "required caller fields unaffected");
});

// 26
await test("getTaxMemoIntegrationRequiredPipelineOutputFields returns defensive copy", () => {
  const fields = getTaxMemoIntegrationRequiredPipelineOutputFields();
  fields.push("INJECTED");
  check(!getTaxMemoIntegrationRequiredPipelineOutputFields().includes("INJECTED"), "required pipeline output fields unaffected");
});

// 27
await test("getTaxMemoIntegrationRequiredGovernanceGates returns defensive copy", () => {
  const gates = getTaxMemoIntegrationRequiredGovernanceGates();
  gates.push("INJECTED");
  check(!getTaxMemoIntegrationRequiredGovernanceGates().includes("INJECTED"), "required governance gates unaffected");
});

// 28
await test("getTaxMemoIntegrationRolloutStages returns defensive copy", () => {
  const stages = getTaxMemoIntegrationRolloutStages();
  stages.push("INJECTED");
  check(!getTaxMemoIntegrationRolloutStages().includes("INJECTED"), "rollout stages unaffected");
});

// 29 + 30
await test("createTaxMemoIntegrationPolicyResult returns fresh objects; mutation does not affect another", () => {
  const a = createTaxMemoIntegrationPolicyResult();
  const b = createTaxMemoIntegrationPolicyResult();
  a.errors.push("x");
  a.valid = false;
  a.checks.push("y");
  check(b.errors.length === 0, "second result errors unaffected");
  check(b.valid === true, "second result valid unaffected");
  check(b.checks.length === 0, "second result checks unaffected");
});

// 31
await test("validateTaxMemoIntegrationCandidate passes (as design candidate) for a fully safe candidate", () => {
  const result = validateTaxMemoIntegrationCandidate(safeCandidate());
  check(result.valid === true, `safe candidate should validate: ${JSON.stringify(result.errors)}`);
});

// 32
await test("validateTaxMemoIntegrationCandidate blocks by default even when valid (design stage / flags off)", () => {
  const result = validateTaxMemoIntegrationCandidate(safeCandidate());
  check(result.blocked === true, "safe candidate still blocked for live execution");
  check(result.warnings.some((w) => /design_only_current_patch/i.test(w)), "warns rollout stage is design-only");
});

// 33
await test("validateTaxMemoIntegrationCandidate fails for unsupported modeId", () => {
  const result = validateTaxMemoIntegrationCandidate(safeCandidate({ modeId: "not_a_real_mode" }));
  check(result.valid === false, "unsupported mode invalid");
});

// 34
await test("validateTaxMemoIntegrationCandidate fails for each blocked mode", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    const result = validateTaxMemoIntegrationCandidate(safeCandidate({ modeId }));
    check(result.valid === false, `blocked mode ${modeId} invalid`);
  }
});

// 35
await test("validateTaxMemoIntegrationCandidate fails for wrong targetRoute", () => {
  const result = validateTaxMemoIntegrationCandidate(safeCandidate({ targetRoute: "/some-other-route" }));
  check(result.valid === false, "wrong targetRoute invalid");
});

// 36
await test("validateTaxMemoIntegrationCandidate fails when pipelineOutput missing required fields", () => {
  const candidate = safeCandidate();
  delete candidate.pipelineOutput.facts;
  const result = validateTaxMemoIntegrationCandidate(candidate);
  check(result.valid === false, "missing pipelineOutput.facts invalid");
});

// 37
await test("validateTaxMemoIntegrationCandidate fails when sourceCards missing/empty", () => {
  const candidate = safeCandidate();
  candidate.pipelineOutput.sourceCards = [];
  const result = validateTaxMemoIntegrationCandidate(candidate);
  check(result.valid === false, "empty sourceCards invalid");
});

// 38
await test("validateTaxMemoIntegrationCandidate fails when humanReviewNotice missing", () => {
  const candidate = safeCandidate();
  candidate.pipelineOutput.humanReviewNotice = "";
  const result = validateTaxMemoIntegrationCandidate(candidate);
  check(result.valid === false, "blank humanReviewNotice invalid");
});

// 39
await test("validateTaxMemoIntegrationCandidate fails when any governance field is not true", () => {
  for (const field of ["phase09gPassed", "phase09hPolicyPassed", "orchestratorValidated", "rendererValidated", "prohibitedClaimDetectionPassed"]) {
    const candidate = safeCandidate();
    candidate.governance[field] = false;
    const result = validateTaxMemoIntegrationCandidate(candidate);
    check(result.valid === false, `governance.${field} false invalid`);
  }
});

// 40
await test("validateTaxMemoIntegrationCandidate fails when any changeScope flag is true", () => {
  for (const field of [
    "askHandlerModified", "pipelineModified", "serverModified", "routeAdded", "frontendModified",
    "envModified", "dbModified", "memoryEnabled", "persistenceAdded", "externalSearchAdded",
    "thirdPartyEgressAdded", "productionEnabled"
  ]) {
    const candidate = safeCandidate();
    candidate.changeScope[field] = true;
    const result = validateTaxMemoIntegrationCandidate(candidate);
    check(result.valid === false, `changeScope.${field} true invalid`);
  }
});

// 41
await test("validateTaxMemoIntegrationCandidate does not throw on malformed input", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const result = validateTaxMemoIntegrationCandidate(bad);
    check(result.valid === false, `malformed input ${JSON.stringify(bad)} invalid`);
  }
});

// 42
await test("validateTaxMemoIntegrationPolicy returns valid true", () => {
  const result = validateTaxMemoIntegrationPolicy();
  check(result.valid === true, `policy self-check should validate: ${JSON.stringify(result.errors)}`);
});

// 43
await test("validateTaxMemoIntegrationPolicy returns required counts", () => {
  const result = validateTaxMemoIntegrationPolicy();
  check(result.featureFlagCount === 2, "featureFlagCount 2");
  check(result.blockedModeCount === 5, "blockedModeCount 5");
  check(typeof result.requiredCallerFieldCount === "number" && result.requiredCallerFieldCount > 0, "requiredCallerFieldCount present");
  check(typeof result.requiredPipelineOutputFieldCount === "number" && result.requiredPipelineOutputFieldCount > 0, "requiredPipelineOutputFieldCount present");
  check(typeof result.requiredGovernanceGateCount === "number" && result.requiredGovernanceGateCount > 0, "requiredGovernanceGateCount present");
  check(typeof result.forbiddenRuntimeChangeCount === "number" && result.forbiddenRuntimeChangeCount > 0, "forbiddenRuntimeChangeCount present");
  check(result.rolloutStageCount === 7, "rolloutStageCount 7");
});

// 44
await test("design document states design-only, no live /ask wiring", () => {
  check(/design-only|DESIGN-ONLY/.test(designDoc), "states design-only");
  const normalized = designDoc.replace(/\s+/g, " ");
  check(/does not\s+wire tax_memo into `?\/ask`?/i.test(normalized), "states does not wire into /ask");
});

// 45
await test("design document states both feature flags default off", () => {
  check(designDoc.includes("TINA_ENABLE_PROFESSIONAL_WORKFLOWS"), "mentions primary flag");
  check(designDoc.includes("TINA_ENABLE_WORKFLOW_TAX_MEMO"), "mentions mode flag");
  check(/default OFF everywhere/i.test(designDoc), "states default off everywhere");
});

// 46
await test("design document lists blocked modes as future-only", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    check(designDoc.includes(modeId), `mentions ${modeId}`);
  }
  check(/future-only/i.test(designDoc), "states future-only");
});

// 47
await test("design document lists the seven rollout stages", () => {
  for (const stage of [
    "design_only_current_patch",
    "local_unit_integration_with_no_route_change",
    "ask_handler_guarded_integration_feature_flag_off",
    "staging_flag_on_tax_memo_only",
    "staging_smoke_evidence",
    "closure_gate",
    "production_consideration_only_after_explicit_approval"
  ]) {
    check(designDoc.includes(stage), `mentions rollout stage ${stage}`);
  }
});

// 48
await test("design document states no memory/persistence/egress and no Phase 10/11", () => {
  check(/no memory activation/i.test(designDoc), "states no memory activation");
  check(/no third-party egress/i.test(designDoc), "states no third-party egress");
  check(/phase 10.*not implemented|not implemented here/i.test(designDoc), "states Phase 10 not implemented");
  check(/phase 11/i.test(designDoc), "mentions Phase 11");
});

// 49
await test("fixture rollout stages and current stage match", () => {
  check(hasAll(fx.rolloutStages, ["design_only_current_patch", "closure_gate", "production_consideration_only_after_explicit_approval"]), "fixture rollout stages present");
  check(fx.currentStage === "design_only_current_patch", "fixture current stage design_only_current_patch");
});

// 50
await test("fixture runtime boundary says design-only, no ask wiring", () => {
  check(fx.runtimeBoundary.designOnlyThisPatch === true, "runtime boundary design-only");
  check(fx.runtimeBoundary.noAskWiring === true, "runtime boundary no ask wiring");
});

// 51
await test("fixture future patch plan includes PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1 and PHASE-09-GATE-CLOSURE-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1", "PHASE-09-GATE-CLOSURE-1"]), "future patch plan present");
});

// 52
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaimsForReport, [
    "live tax memo generation implemented",
    "/ask runtime wiring implemented",
    "production ready",
    "feature flag enabled by default",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented"
  ]), "required prohibited claims present");
});

// 53
await test("next task is PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1", "next task correct");
});

// 54
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

// 55
await test("static source scan: tax-memo-runtime-integration-policy.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(POLICY_PATH), "utf8");
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 56
await test("static source scan: policy imports only allowed pure workflow files", () => {
  const src = readFileSync(resolve(POLICY_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "policy imports at least one allowed workflow helper");
  for (const target of importTargets) {
    check(ALLOWED_IMPORT_FILES.includes(target), `only allowed workflow helpers may be imported (found: ${target})`);
    check(!/server\.js|ask-handler\.js|pipeline\.js|routes\//i.test(target), `import target must not reference server/ask-handler/pipeline/routes (found: ${target})`);
  }
});

console.log(`\nPHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
