// PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1
//
// Validates the pure runtime-wiring policy helper, design document, and
// fixture. NO live HTTP, NO OpenAI / Supabase / Google Drive / n8n /
// Firecrawl / Crawlee, NO env vars, NO server import, NO server start, NO
// port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION,
  WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS,
  WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES,
  WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES,
  WORKFLOW_RUNTIME_WIRING_BOUNDARIES,
  WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES,
  WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS,
  createWorkflowRuntimeWiringPolicyResult,
  getWorkflowRuntimeWiringPolicy,
  getWorkflowRuntimeFeatureFlags,
  getWorkflowRuntimeAllowedModes,
  getWorkflowRuntimeBlockedModes,
  getWorkflowRuntimeRequiredGates,
  getWorkflowRuntimeBoundaries,
  validateWorkflowRuntimeWiringRequest,
  validateWorkflowRuntimeWiringPolicy,
  normalizeRuntimeWiringModeId
} from "../workflow/workflow-runtime-wiring-policy.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.fixture.json";
const POLICY_PATH = "workflow/workflow-runtime-wiring-policy.js";
const DESIGN_DOC_PATH = "docs/phase-09/PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN.md";
const SELF_PATH = "tests/phase-09h-controlled-runtime-wiring-design-or-scaffold-1.test.mjs";

const ALLOWED_IMPORT_FILES = ["./workflow-mode-registry.js", "./workflow-output-governance-gate.js"];

const VALID_DECISIONS = [
  "PHASE 09H CONTROLLED RUNTIME WIRING DESIGN PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09H CONTROLLED RUNTIME WIRING DESIGN WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09H CONTROLLED RUNTIME WIRING DESIGN FAIL",
  "PHASE 09H CONTROLLED RUNTIME WIRING DESIGN BLOCKED"
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

function baseRequest(overrides = {}) {
  return {
    modeId: "tax_memo",
    featureFlagEnabled: false,
    runtimeWiringRequested: false,
    hasDedicatedSchema: true,
    governanceGatePassed: true,
    sourceCardsPresent: true,
    missingFactsPresent: true,
    assumptionsPresent: true,
    humanReviewNoticePresent: true,
    prohibitedClaimDetectionPassed: true,
    persistenceRequested: false,
    memoryRequested: false,
    thirdPartyEgressRequested: false,
    externalSearchRequested: false,
    productionEnablementRequested: false,
    userExplicitApprovalForRuntimeWiring: true,
    ...overrides
  };
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
await test("patch id matches PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1", "patch id");
});

// 5
await test("decision is valid; PASS if all required design/scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 6
await test("base commit is b1d20af", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("b1d20af"), "base commit b1d20af");
});

// 7
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.designScaffoldOnly === true, "designScaffoldOnly true");
  check(n.noRuntimeWiring === true, "noRuntimeWiring true");
  check(n.noDeployment === true, "noDeployment true");
});

// 8
await test("fixture says no runtime wiring", () => {
  check(fx.nonRuntimePatch.noRuntimeWiring === true, "no runtime wiring");
});

// 9
await test("fixture says no route changes", () => {
  check(fx.nonRuntimePatch.noRouteChanges === true, "no route changes");
});

// 10
await test("fixture says no ask-handler changes", () => {
  check(fx.nonRuntimePatch.noAskHandlerChanges === true, "no ask-handler changes");
});

// 11
await test("fixture says no pipeline changes", () => {
  check(fx.nonRuntimePatch.noPipelineChanges === true, "no pipeline changes");
});

// 12
await test("fixture says no server changes", () => {
  check(fx.nonRuntimePatch.noServerChanges === true, "no server changes");
});

// 13
await test("fixture says no memory activation", () => {
  check(fx.nonRuntimePatch.noMemoryActivation === true, "no memory activation");
  check(fx.privacySecurityBoundary.noMemoryActivation === true, "privacy boundary no memory activation");
});

// 14
await test("fixture says production unchanged", () => {
  check(fx.currentState.productionUnchanged === true, "production unchanged");
  check(fx.privacySecurityBoundary.noProductionChange === true, "no production change");
});

// 15
await test("fixture says no external search/n8n/Firecrawl/Crawlee", () => {
  const n = fx.nonRuntimePatch;
  check(n.noExternalSearch === true, "no external search");
  check(n.noN8n === true && n.noFirecrawl === true && n.noCrawlee === true, "no n8n/Firecrawl/Crawlee");
});

// 16
await test("policy exports expected helpers", () => {
  check(typeof PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION === "string", "version export");
  check(typeof WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS === "object", "FEATURE_FLAGS export");
  check(Array.isArray(WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES), "ALLOWED_MODES export");
  check(Array.isArray(WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES), "BLOCKED_MODES export");
  check(Array.isArray(WORKFLOW_RUNTIME_WIRING_BOUNDARIES), "BOUNDARIES export");
  check(Array.isArray(WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES), "REQUIRED_GATES export");
  check(Array.isArray(WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS), "PROHIBITED_ACTIONS export");
  check(typeof createWorkflowRuntimeWiringPolicyResult === "function", "createWorkflowRuntimeWiringPolicyResult export");
  check(typeof getWorkflowRuntimeWiringPolicy === "function", "getWorkflowRuntimeWiringPolicy export");
  check(typeof getWorkflowRuntimeFeatureFlags === "function", "getWorkflowRuntimeFeatureFlags export");
  check(typeof getWorkflowRuntimeAllowedModes === "function", "getWorkflowRuntimeAllowedModes export");
  check(typeof getWorkflowRuntimeBlockedModes === "function", "getWorkflowRuntimeBlockedModes export");
  check(typeof getWorkflowRuntimeRequiredGates === "function", "getWorkflowRuntimeRequiredGates export");
  check(typeof getWorkflowRuntimeBoundaries === "function", "getWorkflowRuntimeBoundaries export");
  check(typeof validateWorkflowRuntimeWiringRequest === "function", "validateWorkflowRuntimeWiringRequest export");
  check(typeof validateWorkflowRuntimeWiringPolicy === "function", "validateWorkflowRuntimeWiringPolicy export");
  check(typeof normalizeRuntimeWiringModeId === "function", "normalizeRuntimeWiringModeId export");
});

// 17
await test("PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION exists", () => {
  check(PHASE_09H_WORKFLOW_RUNTIME_WIRING_POLICY_VERSION.length > 0, "version non-empty");
});

// 18-27
await test("primary feature flag has all required properties", () => {
  const primary = WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS.primary;
  check(primary.name === "TINA_ENABLE_PROFESSIONAL_WORKFLOWS", "primary flag name");
  check(primary.defaultState === "off", "defaultState off");
  check(primary.productionDefault === "off", "productionDefault off");
  check(primary.stagingDefault === "off", "stagingDefault off");
  check(primary.localDefault === "off", "localDefault off");
  check(primary.requiresGovernanceGate === true, "requiresGovernanceGate true");
  check(primary.requiresSourceCards === true, "requiresSourceCards true");
  check(primary.noMemoryActivation === true, "noMemoryActivation true");
  check(primary.noGeneratedWorkProductPersistence === true, "noGeneratedWorkProductPersistence true");
  check(primary.noThirdPartyEgress === true, "noThirdPartyEgress true");
});

// 28
await test("optional per-mode flags exist and all default off", () => {
  const optional = WORKFLOW_RUNTIME_WIRING_FEATURE_FLAGS.optionalPerModeFlags;
  check(Array.isArray(optional) && optional.length === 6, "six optional flags present");
  for (const flag of optional) check(flag.defaultState === "off", `${flag.name} defaults off`);
});

// 29
await test("allowed modes include tax_memo", () => {
  check(WORKFLOW_RUNTIME_WIRING_ALLOWED_MODES.includes("tax_memo"), "allowed modes include tax_memo");
});

// 30
await test("blocked modes include all mandated modes", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    check(WORKFLOW_RUNTIME_WIRING_BLOCKED_MODES.includes(modeId), `blocked modes include ${modeId}`);
  }
});

// 31
await test("requirements_request_letter is blocked because dedicated schema pending", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest({ modeId: "requirements_request_letter", hasDedicatedSchema: false }));
  check(result.valid === false, "requirements_request_letter request invalid");
  check(result.errors.some((e) => /blocked/i.test(e) && /requirements_request_letter/i.test(e)), "error explains blocked mode");
});

// 32-42
await test("boundaries include all mandated boundaries", () => {
  const expected = [
    "no_runtime_change_in_phase_09h", "no_ask_handler_change", "no_pipeline_change", "no_server_change",
    "no_route_added", "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion",
    "no_memory_activation", "no_third_party_egress", "governance_gate_required"
  ];
  for (const boundary of expected) check(WORKFLOW_RUNTIME_WIRING_BOUNDARIES.includes(boundary), `boundaries include ${boundary}`);
});

// 43-50
await test("required gates include all mandated gates", () => {
  const expected = [
    "phase_09g_governance_gate_pass", "selected_mode_has_dedicated_schema", "source_cards_present",
    "missing_facts_present", "assumptions_present", "human_review_notice_present",
    "prohibited_claim_detection_pass", "user_explicit_approval_for_runtime_wiring"
  ];
  for (const gate of expected) check(WORKFLOW_RUNTIME_WIRING_REQUIRED_GATES.includes(gate), `required gates include ${gate}`);
});

// 51-60
await test("prohibited actions include all mandated actions", () => {
  const expected = [
    "enabling_feature_flag_by_default", "production_enablement", "modifying_ask_handler_in_phase_09h",
    "modifying_pipeline_in_phase_09h", "modifying_server_in_phase_09h", "adding_routes_in_phase_09h",
    "memory_activation", "external_search", "n8n_call", "firecrawl_call", "crawlee_call", "bypassing_governance_gate"
  ];
  for (const action of expected) check(WORKFLOW_RUNTIME_WIRING_PROHIBITED_ACTIONS.includes(action), `prohibited actions include ${action}`);
});

// 61 + 62
await test("getWorkflowRuntimeWiringPolicy returns defensive copy; mutation does not affect internals", () => {
  const policy = getWorkflowRuntimeWiringPolicy();
  policy.allowedModes.push("INJECTED");
  policy.boundaries.push("INJECTED");
  const again = getWorkflowRuntimeWiringPolicy();
  check(!again.allowedModes.includes("INJECTED"), "allowedModes unaffected by prior mutation");
  check(!again.boundaries.includes("INJECTED"), "boundaries unaffected by prior mutation");
});

// 63
await test("getWorkflowRuntimeFeatureFlags returns defensive copy", () => {
  const flags = getWorkflowRuntimeFeatureFlags();
  flags.primary.defaultState = "on";
  const again = getWorkflowRuntimeFeatureFlags();
  check(again.primary.defaultState === "off", "primary flag unaffected by prior mutation");
});

// 64
await test("getWorkflowRuntimeAllowedModes returns defensive copy", () => {
  const modes = getWorkflowRuntimeAllowedModes();
  modes.push("INJECTED");
  check(!getWorkflowRuntimeAllowedModes().includes("INJECTED"), "allowed modes unaffected by prior mutation");
});

// 65
await test("getWorkflowRuntimeBlockedModes returns defensive copy", () => {
  const modes = getWorkflowRuntimeBlockedModes();
  modes.push("INJECTED");
  check(!getWorkflowRuntimeBlockedModes().includes("INJECTED"), "blocked modes unaffected by prior mutation");
});

// 66
await test("getWorkflowRuntimeRequiredGates returns defensive copy", () => {
  const gates = getWorkflowRuntimeRequiredGates();
  gates.push("INJECTED");
  check(!getWorkflowRuntimeRequiredGates().includes("INJECTED"), "required gates unaffected by prior mutation");
});

// 67
await test("getWorkflowRuntimeBoundaries returns defensive copy", () => {
  const boundaries = getWorkflowRuntimeBoundaries();
  boundaries.push("INJECTED");
  check(!getWorkflowRuntimeBoundaries().includes("INJECTED"), "boundaries unaffected by prior mutation");
});

// 68 + 69
await test("createWorkflowRuntimeWiringPolicyResult returns fresh objects; mutation does not affect another", () => {
  const a = createWorkflowRuntimeWiringPolicyResult();
  const b = createWorkflowRuntimeWiringPolicyResult();
  a.errors.push("x");
  a.valid = false;
  a.checks.push("y");
  check(b.errors.length === 0, "second result errors unaffected");
  check(b.valid === true, "second result valid unaffected");
  check(b.checks.length === 0, "second result checks unaffected");
});

// 70
await test("normalizeRuntimeWiringModeId maps tax memo aliases to tax_memo", () => {
  check(normalizeRuntimeWiringModeId("tax_memo") === "tax_memo", "tax_memo canonical");
  check(normalizeRuntimeWiringModeId("tax memo") === "tax_memo", "tax memo alias");
  check(normalizeRuntimeWiringModeId("memo") === "tax_memo", "memo alias");
});

// 71
await test("normalizeRuntimeWiringModeId maps blocked mode aliases correctly", () => {
  check(normalizeRuntimeWiringModeId("BIR reply") === "bir_reply_protest_draft", "BIR reply alias");
  check(normalizeRuntimeWiringModeId("audit defense") === "audit_defense_matrix", "audit defense alias");
  check(normalizeRuntimeWiringModeId("checklist") === "compliance_checklist", "checklist alias");
  check(normalizeRuntimeWiringModeId("requirements letter") === "requirements_request_letter", "requirements letter alias");
});

// 72
await test("normalizeRuntimeWiringModeId returns null for unsupported", () => {
  check(normalizeRuntimeWiringModeId("totally unsupported") === null, "unsupported returns null");
  check(normalizeRuntimeWiringModeId(null) === null, "null returns null");
});

// 73
await test("validateWorkflowRuntimeWiringPolicy returns valid true", () => {
  const result = validateWorkflowRuntimeWiringPolicy();
  check(result.valid === true, `policy should validate: ${JSON.stringify(result.errors)}`);
});

// 74
await test("validateWorkflowRuntimeWiringPolicy returns required counts", () => {
  const result = validateWorkflowRuntimeWiringPolicy();
  check(typeof result.featureFlagCount === "number" && result.featureFlagCount === 7, "featureFlagCount 7 (1 primary + 6 optional)");
  check(typeof result.allowedModeCount === "number" && result.allowedModeCount === 1, "allowedModeCount 1");
  check(typeof result.blockedModeCount === "number" && result.blockedModeCount === 5, "blockedModeCount 5");
  check(typeof result.requiredGateCount === "number" && result.requiredGateCount > 0, "requiredGateCount present");
  check(typeof result.prohibitedActionCount === "number" && result.prohibitedActionCount > 0, "prohibitedActionCount present");
});

// 75
await test("validateWorkflowRuntimeWiringRequest passes for a future approved tax_memo request with all gates satisfied", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest());
  check(result.valid === true, `approved tax_memo request should validate: ${JSON.stringify(result.errors)}`);
  check(result.mode === "tax_memo", "mode resolved to tax_memo");
});

// 76
await test("validateWorkflowRuntimeWiringRequest fails for tax_memo if explicit approval false", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest({ userExplicitApprovalForRuntimeWiring: false }));
  check(result.valid === false, "no explicit approval invalid");
});

// 77
await test("validateWorkflowRuntimeWiringRequest fails for bir_reply_protest_draft because blocked", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest({ modeId: "bir_reply_protest_draft" }));
  check(result.valid === false, "bir_reply_protest_draft invalid");
});

// 78
await test("validateWorkflowRuntimeWiringRequest fails for audit_defense_matrix because blocked", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest({ modeId: "audit_defense_matrix" }));
  check(result.valid === false, "audit_defense_matrix invalid");
});

// 79
await test("validateWorkflowRuntimeWiringRequest fails for requirements_request_letter because blocked/pending", () => {
  const result = validateWorkflowRuntimeWiringRequest(baseRequest({ modeId: "requirements_request_letter", hasDedicatedSchema: false }));
  check(result.valid === false, "requirements_request_letter invalid");
});

// 80
await test("validateWorkflowRuntimeWiringRequest fails if governanceGatePassed false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ governanceGatePassed: false })).valid === false, "governanceGatePassed false invalid");
});

// 81
await test("validateWorkflowRuntimeWiringRequest fails if sourceCardsPresent false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ sourceCardsPresent: false })).valid === false, "sourceCardsPresent false invalid");
});

// 82
await test("validateWorkflowRuntimeWiringRequest fails if missingFactsPresent false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ missingFactsPresent: false })).valid === false, "missingFactsPresent false invalid");
});

// 83
await test("validateWorkflowRuntimeWiringRequest fails if assumptionsPresent false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ assumptionsPresent: false })).valid === false, "assumptionsPresent false invalid");
});

// 84
await test("validateWorkflowRuntimeWiringRequest fails if humanReviewNoticePresent false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ humanReviewNoticePresent: false })).valid === false, "humanReviewNoticePresent false invalid");
});

// 85
await test("validateWorkflowRuntimeWiringRequest fails if prohibitedClaimDetectionPassed false", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ prohibitedClaimDetectionPassed: false })).valid === false, "prohibitedClaimDetectionPassed false invalid");
});

// 86
await test("validateWorkflowRuntimeWiringRequest fails if persistenceRequested true", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ persistenceRequested: true })).valid === false, "persistenceRequested true invalid");
});

// 87
await test("validateWorkflowRuntimeWiringRequest fails if memoryRequested true", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ memoryRequested: true })).valid === false, "memoryRequested true invalid");
});

// 88
await test("validateWorkflowRuntimeWiringRequest fails if thirdPartyEgressRequested true", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ thirdPartyEgressRequested: true })).valid === false, "thirdPartyEgressRequested true invalid");
});

// 89
await test("validateWorkflowRuntimeWiringRequest fails if externalSearchRequested true", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ externalSearchRequested: true })).valid === false, "externalSearchRequested true invalid");
});

// 90
await test("validateWorkflowRuntimeWiringRequest fails if productionEnablementRequested true", () => {
  check(validateWorkflowRuntimeWiringRequest(baseRequest({ productionEnablementRequested: true })).valid === false, "productionEnablementRequested true invalid");
});

// 91
await test("design document states Phase 9H is design/scaffold only", () => {
  check(/design\/scaffold only/i.test(designDoc) || /design-only|scaffold-only/i.test(designDoc), "states design/scaffold only");
  check(/does not activate workflow generation|does not activate/i.test(designDoc), "states does not activate generation");
});

// 92
await test("design document states feature flag default OFF", () => {
  check(designDoc.includes("TINA_ENABLE_PROFESSIONAL_WORKFLOWS"), "mentions primary flag");
  check(/off everywhere|default.{0,10}off/i.test(designDoc), "states default off");
});

// 93
await test("design document recommends tax_memo as first runtime candidate", () => {
  check(/recommended:\s*`?tax_memo`?/i.test(designDoc) || /tax_memo.*first runtime/i.test(designDoc), "recommends tax_memo first");
});

// 94
await test("design document blocks BIR/protest and audit-defense as first runtime modes", () => {
  check(/bir_reply_protest_draft/i.test(designDoc), "mentions bir_reply_protest_draft blocked");
  check(/audit_defense_matrix/i.test(designDoc), "mentions audit_defense_matrix blocked");
});

// 95
await test("design document states no memory/persistence/egress", () => {
  check(/no memory activation/i.test(designDoc), "states no memory activation");
  check(/no.*persistence|persistence\. no/i.test(designDoc), "states no persistence");
  check(/no third-party egress/i.test(designDoc), "states no third-party egress");
});

// 96
await test("design document states no live web/search/intake/n8n/Firecrawl/Crawlee", () => {
  check(/no live web search/i.test(designDoc), "states no live web search");
  check(/n8n\/Firecrawl\/Crawlee|n8n.*Firecrawl.*Crawlee/i.test(designDoc), "mentions n8n/Firecrawl/Crawlee");
});

// 97
await test("design document states Phase 10/11 not implemented", () => {
  check(/phase 10.*not implemented|not implemented here/i.test(designDoc), "states Phase 10 not implemented");
  check(/phase 11/i.test(designDoc), "mentions Phase 11");
});

// 98
await test("design document states requirements_request_letter schema gap", () => {
  check(/requirements_request_letter/i.test(designDoc), "mentions requirements_request_letter");
  check(/registry-only|pending dedicated schema/i.test(designDoc), "states registry-only/pending dedicated schema");
});

// 99
await test("fixture future patch plan includes PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1"]), "future patch plan includes PHASE-09R");
});

// 100
await test("fixture optional alternative next task includes PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", () => {
  check(hasAll(fx.optionalAlternativeNextTaskList, ["PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1"]), "optional alternative includes PHASE-09I");
  check(fx.optionalAlternativeNextTask.recommendedAlternative === "PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", "optionalAlternativeNextTask object correct");
});

// 101
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaimsForReport, [
    "runtime wiring implemented",
    "feature flag enabled by default",
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

// 102
await test("next task is PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", "next task PHASE-09R");
});

// 103
await test("optional alternative next task is PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", () => {
  check(fx.optionalAlternativeNextTask.recommendedAlternative === "PHASE-09I-REQUIREMENTS-REQUEST-LETTER-SCHEMA-SCAFFOLD-1", "optional alternative PHASE-09I");
});

// 104
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

// 105
await test("static source scan: workflow-runtime-wiring-policy.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(POLICY_PATH), "utf8");
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 106
await test("static source scan: policy imports only allowed pure Phase 9 workflow helpers", () => {
  const src = readFileSync(resolve(POLICY_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "policy imports at least one allowed workflow helper");
  for (const target of importTargets) {
    check(ALLOWED_IMPORT_FILES.includes(target), `only allowed workflow helpers may be imported (found: ${target})`);
    check(!/server\.js|ask-handler\.js|pipeline\.js|routes\//i.test(target), `import target must not reference server/ask-handler/pipeline/routes (found: ${target})`);
  }
});

console.log(`\nPHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
