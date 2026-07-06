// PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1
//
// Validates the pure tax-memo runtime orchestrator, renderer, and fixture.
// NO live HTTP, NO OpenAI / Supabase / Google Drive / n8n / Firecrawl /
// Crawlee, NO env vars, NO server/ask-handler/pipeline import, NO server
// start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION,
  TAX_MEMO_RUNTIME_MODE_ID,
  TAX_MEMO_RUNTIME_SCHEMA_KEY,
  TAX_MEMO_RUNTIME_REQUIRED_INPUTS,
  TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS,
  TAX_MEMO_RUNTIME_PROHIBITED_MODES,
  createTaxMemoRuntimeResult,
  normalizeTaxMemoRuntimeInput,
  validateTaxMemoRuntimeInput,
  validateTaxMemoRuntimeOptions,
  buildTaxMemoDraftFromRuntimeInput,
  runTaxMemoRuntimeGovernance,
  runTaxMemoRuntimeScaffold,
  validateTaxMemoRuntimeScaffold
} from "../workflow/tax-memo-runtime-orchestrator.js";
import {
  PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION,
  TAX_MEMO_RUNTIME_RENDER_SECTIONS,
  createTaxMemoRuntimeRenderResult,
  renderTaxMemoDraftToMarkdown,
  renderTaxMemoSourceCards,
  validateTaxMemoRuntimeRenderedOutput,
  validateTaxMemoRuntimeRenderer
} from "../workflow/tax-memo-runtime-renderer.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09r-tax-memo-runtime-wiring-scaffold-1.fixture.json";
const ORCHESTRATOR_PATH = "workflow/tax-memo-runtime-orchestrator.js";
const RENDERER_PATH = "workflow/tax-memo-runtime-renderer.js";
const SELF_PATH = "tests/phase-09r-tax-memo-runtime-wiring-scaffold-1.test.mjs";

const ORCHESTRATOR_ALLOWED_IMPORTS = ["./tax-memo-schema.js", "./workflow-output-governance-gate.js", "./workflow-runtime-wiring-policy.js"];
const RENDERER_ALLOWED_IMPORTS = ["./tax-memo-runtime-orchestrator.js", "./workflow-output-governance-gate.js"];

const VALID_DECISIONS = [
  "PHASE 09R TAX MEMO RUNTIME WIRING SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME WIRING SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09R TAX MEMO RUNTIME WIRING SCAFFOLD FAIL",
  "PHASE 09R TAX MEMO RUNTIME WIRING SCAFFOLD BLOCKED"
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

function safeRuntimeOptions(overrides = {}) {
  return {
    featureFlagEnabled: true,
    userExplicitApprovalForRuntimeWiring: true,
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
    ...overrides
  };
}

function safeInput(overrides = {}) {
  return {
    facts: "The taxpayer is a domestic corporation engaged in retail trade.",
    issues: ["Whether the transaction is subject to VAT."],
    taxpayerType: "domestic corporation",
    taxPeriod: "CY2025",
    intendedAudience: "internal tax team",
    sourceCards: [{ sourceCardId: "sc1", title: "RR 16-2005", archiveUrl: "https://drive.google.com/x" }],
    missingFacts: ["exact transaction date"],
    assumptions: ["assumed calendar-year taxpayer"],
    humanReviewNotice: "This draft requires review by a licensed tax professional before use.",
    ...overrides
  };
}

// 1
await test("fixture exists and parses as JSON", () => {
  check(existsSync(resolve(FIXTURE_PATH)), `${FIXTURE_PATH} must exist`);
  fx = JSON.parse(readFileSync(resolve(FIXTURE_PATH), "utf8"));
});

// 2
await test("orchestrator file exists", () => {
  check(existsSync(resolve(ORCHESTRATOR_PATH)), `${ORCHESTRATOR_PATH} must exist`);
});

// 3
await test("renderer file exists", () => {
  check(existsSync(resolve(RENDERER_PATH)), `${RENDERER_PATH} must exist`);
});

// 4
await test("patch id matches PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1", "patch id");
});

// 5
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 6
await test("base commit is 48d4f63", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("48d4f63"), "base commit 48d4f63");
});

// 7
await test("non-runtime patch true", () => {
  const n = fx.nonRuntimePatch;
  check(n && n.controlledScaffoldOnly === true, "controlledScaffoldOnly true");
  check(n.noLiveActivation === true, "noLiveActivation true");
  check(n.noDeployment === true, "noDeployment true");
});

// 8
await test("fixture says no route changes", () => {
  check(fx.nonRuntimePatch.noRouteChanges === true, "no route changes");
});

// 9
await test("fixture says no ask-handler changes", () => {
  check(fx.nonRuntimePatch.noAskHandlerChanges === true, "no ask-handler changes");
});

// 10
await test("fixture says no pipeline changes", () => {
  check(fx.nonRuntimePatch.noPipelineChanges === true, "no pipeline changes");
});

// 11
await test("fixture says no server changes", () => {
  check(fx.nonRuntimePatch.noServerChanges === true, "no server changes");
});

// 12
await test("fixture says no memory activation", () => {
  check(fx.nonRuntimePatch.noMemoryActivation === true, "no memory activation");
  check(fx.privacySecurityBoundary.noMemoryActivation === true, "privacy boundary no memory activation");
});

// 13
await test("fixture says production unchanged", () => {
  check(fx.currentState.productionUnchanged === true, "production unchanged");
  check(fx.privacySecurityBoundary.noProductionChange === true, "no production change");
});

// 14
await test("fixture says no external search/n8n/Firecrawl/Crawlee", () => {
  const n = fx.nonRuntimePatch;
  check(n.noExternalSearch === true, "no external search");
  check(n.noN8n === true && n.noFirecrawl === true && n.noCrawlee === true, "no n8n/Firecrawl/Crawlee");
});

// 15
await test("fixture says no live activation", () => {
  check(fx.nonRuntimePatch.noLiveActivation === true, "no live activation");
});

// 16
await test("orchestrator exports expected helpers", () => {
  check(typeof PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION === "string", "version export");
  check(TAX_MEMO_RUNTIME_MODE_ID === "tax_memo", "mode id export");
  check(TAX_MEMO_RUNTIME_SCHEMA_KEY === "taxMemoOutput", "schema key export");
  check(Array.isArray(TAX_MEMO_RUNTIME_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS), "REQUIRED_RUNTIME_FLAGS export");
  check(Array.isArray(TAX_MEMO_RUNTIME_PROHIBITED_MODES), "PROHIBITED_MODES export");
  check(typeof createTaxMemoRuntimeResult === "function", "createTaxMemoRuntimeResult export");
  check(typeof normalizeTaxMemoRuntimeInput === "function", "normalizeTaxMemoRuntimeInput export");
  check(typeof validateTaxMemoRuntimeInput === "function", "validateTaxMemoRuntimeInput export");
  check(typeof validateTaxMemoRuntimeOptions === "function", "validateTaxMemoRuntimeOptions export");
  check(typeof buildTaxMemoDraftFromRuntimeInput === "function", "buildTaxMemoDraftFromRuntimeInput export");
  check(typeof runTaxMemoRuntimeGovernance === "function", "runTaxMemoRuntimeGovernance export");
  check(typeof runTaxMemoRuntimeScaffold === "function", "runTaxMemoRuntimeScaffold export");
  check(typeof validateTaxMemoRuntimeScaffold === "function", "validateTaxMemoRuntimeScaffold export");
});

// 17
await test("renderer exports expected helpers", () => {
  check(typeof PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION === "string", "version export");
  check(Array.isArray(TAX_MEMO_RUNTIME_RENDER_SECTIONS), "RENDER_SECTIONS export");
  check(typeof createTaxMemoRuntimeRenderResult === "function", "createTaxMemoRuntimeRenderResult export");
  check(typeof renderTaxMemoDraftToMarkdown === "function", "renderTaxMemoDraftToMarkdown export");
  check(typeof renderTaxMemoSourceCards === "function", "renderTaxMemoSourceCards export");
  check(typeof validateTaxMemoRuntimeRenderedOutput === "function", "validateTaxMemoRuntimeRenderedOutput export");
  check(typeof validateTaxMemoRuntimeRenderer === "function", "validateTaxMemoRuntimeRenderer export");
});

// 18
await test("PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION exists", () => {
  check(PHASE_09R_TAX_MEMO_RUNTIME_ORCHESTRATOR_VERSION.length > 0, "version non-empty");
});

// 19
await test("PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION exists", () => {
  check(PHASE_09R_TAX_MEMO_RUNTIME_RENDERER_VERSION.length > 0, "version non-empty");
});

// 20
await test("TAX_MEMO_RUNTIME_MODE_ID is tax_memo", () => {
  check(TAX_MEMO_RUNTIME_MODE_ID === "tax_memo", "mode id is tax_memo");
});

// 21
await test("TAX_MEMO_RUNTIME_SCHEMA_KEY is taxMemoOutput", () => {
  check(TAX_MEMO_RUNTIME_SCHEMA_KEY === "taxMemoOutput", "schema key is taxMemoOutput");
});

// 22
await test("required runtime inputs include all mandated inputs", () => {
  for (const input of ["facts", "issues", "taxpayerType", "taxPeriod", "intendedAudience", "sourceCards", "missingFacts", "assumptions", "humanReviewNotice"]) {
    check(TAX_MEMO_RUNTIME_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 23
await test("required runtime flags include all mandated flags", () => {
  for (const flag of ["featureFlagEnabled", "userExplicitApprovalForRuntimeWiring", "governanceGatePassed", "sourceCardsPresent", "missingFactsPresent", "assumptionsPresent", "humanReviewNoticePresent", "prohibitedClaimDetectionPassed"]) {
    check(TAX_MEMO_RUNTIME_REQUIRED_RUNTIME_FLAGS.includes(flag), `required runtime flags include ${flag}`);
  }
});

// 24
await test("prohibited modes include all mandated modes", () => {
  for (const modeId of ["bir_reply_protest_draft", "audit_defense_matrix", "client_advisory", "compliance_checklist", "requirements_request_letter"]) {
    check(TAX_MEMO_RUNTIME_PROHIBITED_MODES.includes(modeId), `prohibited modes include ${modeId}`);
  }
});

// 25 + 26
await test("createTaxMemoRuntimeResult returns fresh objects; mutation does not affect another", () => {
  const a = createTaxMemoRuntimeResult();
  const b = createTaxMemoRuntimeResult();
  a.errors.push("x");
  a.valid = false;
  a.checks.push("y");
  check(b.errors.length === 0, "second result errors unaffected");
  check(b.valid === true, "second result valid unaffected");
  check(b.checks.length === 0, "second result checks unaffected");
});

// 27
await test("normalizeTaxMemoRuntimeInput handles malformed input safely", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const normalized = normalizeTaxMemoRuntimeInput(bad);
    check(normalized.facts === "", `malformed input ${JSON.stringify(bad)} yields safe facts default`);
    check(Array.isArray(normalized.issues) && normalized.issues.length === 0, `malformed input ${JSON.stringify(bad)} yields empty issues`);
  }
});

// 28
await test("normalizeTaxMemoRuntimeInput trims strings and normalizes issues", () => {
  const normalized = normalizeTaxMemoRuntimeInput({
    facts: "  padded facts  ",
    issues: ["  issue one  ", "", "issue two"],
    taxpayerType: "  corp  ",
    humanReviewNotice: "  review  "
  });
  check(normalized.facts === "padded facts", "facts trimmed");
  check(JSON.stringify(normalized.issues) === JSON.stringify(["issue one", "issue two"]), "issues normalized and blanks removed");
  check(normalized.taxpayerType === "corp", "taxpayerType trimmed");
  check(normalized.humanReviewNotice === "review", "humanReviewNotice trimmed");
});

// 29
await test("normalizeTaxMemoRuntimeInput does not mutate input", () => {
  const input = { facts: "original", issues: ["a"], sourceCards: [{ sourceCardId: "sc1" }] };
  const frozenCopy = JSON.stringify(input);
  normalizeTaxMemoRuntimeInput(input);
  check(JSON.stringify(input) === frozenCopy, "input object unmutated after normalization");
});

// 30
await test("validateTaxMemoRuntimeInput passes for complete safe input", () => {
  const result = validateTaxMemoRuntimeInput(safeInput());
  check(result.valid === true, `safe input should validate: ${JSON.stringify(result.errors)}`);
});

// 31
await test("validateTaxMemoRuntimeInput fails when facts missing", () => {
  const result = validateTaxMemoRuntimeInput(safeInput({ facts: "" }));
  check(result.valid === false, "missing facts invalid");
});

// 32
await test("validateTaxMemoRuntimeInput fails when issues missing/empty", () => {
  check(validateTaxMemoRuntimeInput(safeInput({ issues: [] })).valid === false, "empty issues invalid");
  check(validateTaxMemoRuntimeInput(safeInput({ issues: undefined })).valid === false, "missing issues invalid");
});

// 33
await test("validateTaxMemoRuntimeInput fails when sourceCards missing/empty", () => {
  check(validateTaxMemoRuntimeInput(safeInput({ sourceCards: [] })).valid === false, "empty sourceCards invalid");
  check(validateTaxMemoRuntimeInput(safeInput({ sourceCards: undefined })).valid === false, "missing sourceCards invalid");
});

// 34
await test("validateTaxMemoRuntimeInput fails when humanReviewNotice missing", () => {
  const result = validateTaxMemoRuntimeInput(safeInput({ humanReviewNotice: "" }));
  check(result.valid === false, "missing humanReviewNotice invalid");
});

// 35
await test("validateTaxMemoRuntimeInput warns when missingFacts empty", () => {
  const result = validateTaxMemoRuntimeInput(safeInput({ missingFacts: [] }));
  check(result.valid === true, "still valid with empty missingFacts");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
});

// 36
await test("validateTaxMemoRuntimeInput warns when assumptions empty", () => {
  const result = validateTaxMemoRuntimeInput(safeInput({ assumptions: [] }));
  check(result.valid === true, "still valid with empty assumptions");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
});

// 37
await test("validateTaxMemoRuntimeOptions blocks default/missing options", () => {
  check(validateTaxMemoRuntimeOptions(undefined).valid === false, "undefined options blocked");
  check(validateTaxMemoRuntimeOptions({}).valid === false, "empty options blocked");
  check(validateTaxMemoRuntimeOptions(undefined).blocked === true, "undefined options report blocked true");
});

// 38
await test("validateTaxMemoRuntimeOptions passes only when all required explicit runtime flags are safe", () => {
  const result = validateTaxMemoRuntimeOptions(safeRuntimeOptions());
  check(result.valid === true, `safe options should validate: ${JSON.stringify(result.errors)}`);
  check(result.blocked === false, "safe options not blocked");
});

// 39
await test("validateTaxMemoRuntimeOptions fails if featureFlagEnabled false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ featureFlagEnabled: false })).valid === false, "featureFlagEnabled false invalid");
});

// 40
await test("validateTaxMemoRuntimeOptions fails if userExplicitApprovalForRuntimeWiring false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ userExplicitApprovalForRuntimeWiring: false })).valid === false, "no explicit approval invalid");
});

// 41
await test("validateTaxMemoRuntimeOptions fails if governanceGatePassed false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ governanceGatePassed: false })).valid === false, "governanceGatePassed false invalid");
});

// 42
await test("validateTaxMemoRuntimeOptions fails if sourceCardsPresent false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ sourceCardsPresent: false })).valid === false, "sourceCardsPresent false invalid");
});

// 43
await test("validateTaxMemoRuntimeOptions fails if missingFactsPresent false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ missingFactsPresent: false })).valid === false, "missingFactsPresent false invalid");
});

// 44
await test("validateTaxMemoRuntimeOptions fails if assumptionsPresent false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ assumptionsPresent: false })).valid === false, "assumptionsPresent false invalid");
});

// 45
await test("validateTaxMemoRuntimeOptions fails if humanReviewNoticePresent false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ humanReviewNoticePresent: false })).valid === false, "humanReviewNoticePresent false invalid");
});

// 46
await test("validateTaxMemoRuntimeOptions fails if prohibitedClaimDetectionPassed false", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ prohibitedClaimDetectionPassed: false })).valid === false, "prohibitedClaimDetectionPassed false invalid");
});

// 47
await test("validateTaxMemoRuntimeOptions fails if persistenceRequested true", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ persistenceRequested: true })).valid === false, "persistenceRequested true invalid");
});

// 48
await test("validateTaxMemoRuntimeOptions fails if memoryRequested true", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ memoryRequested: true })).valid === false, "memoryRequested true invalid");
});

// 49
await test("validateTaxMemoRuntimeOptions fails if thirdPartyEgressRequested true", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ thirdPartyEgressRequested: true })).valid === false, "thirdPartyEgressRequested true invalid");
});

// 50
await test("validateTaxMemoRuntimeOptions fails if externalSearchRequested true", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ externalSearchRequested: true })).valid === false, "externalSearchRequested true invalid");
});

// 51
await test("validateTaxMemoRuntimeOptions fails if productionEnablementRequested true", () => {
  check(validateTaxMemoRuntimeOptions(safeRuntimeOptions({ productionEnablementRequested: true })).valid === false, "productionEnablementRequested true invalid");
});

// 52
await test("buildTaxMemoDraftFromRuntimeInput returns tax_memo / taxMemoOutput", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  check(output.mode === "tax_memo", "output mode tax_memo");
  check(output.schemaKey === "taxMemoOutput", "output schemaKey taxMemoOutput");
});

// 53
await test("buildTaxMemoDraftFromRuntimeInput preserves provided facts/issues/sourceCards/missingFacts/assumptions/humanReviewNotice", () => {
  const input = safeInput();
  const output = buildTaxMemoDraftFromRuntimeInput(input);
  check(output.factsProvided.includes(input.facts), "facts preserved");
  check(JSON.stringify(output.issues) === JSON.stringify(input.issues), "issues preserved");
  check(output.sourceCards.length === input.sourceCards.length, "sourceCards preserved");
  check(JSON.stringify(output.missingFacts) === JSON.stringify(input.missingFacts), "missingFacts preserved");
  check(JSON.stringify(output.assumptions) === JSON.stringify(input.assumptions), "assumptions preserved");
  check(output.humanReviewNotice === input.humanReviewNotice, "humanReviewNotice preserved");
});

// 54
await test("buildTaxMemoDraftFromRuntimeInput does not fabricate authorities", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  check(Array.isArray(output.applicableAuthorities) && output.applicableAuthorities.length === 0, "no authorities fabricated when none provided");
  const withAuthorities = buildTaxMemoDraftFromRuntimeInput(safeInput({ applicableAuthorities: [{ authorityType: "RR", title: "RR 16-2005" }] }));
  check(withAuthorities.applicableAuthorities.length === 1, "only provided authorities included");
});

// 55
await test("buildTaxMemoDraftFromRuntimeInput metadata finalFiling false", () => {
  check(buildTaxMemoDraftFromRuntimeInput(safeInput()).metadata.finalFiling === false, "metadata.finalFiling false");
});

// 56
await test("buildTaxMemoDraftFromRuntimeInput metadata automaticSubmission false", () => {
  check(buildTaxMemoDraftFromRuntimeInput(safeInput()).metadata.automaticSubmission === false, "metadata.automaticSubmission false");
});

// 57
await test("runTaxMemoRuntimeGovernance passes for safe scaffold output", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  const result = runTaxMemoRuntimeGovernance(output);
  check(result.valid === true, `safe output should pass governance: ${JSON.stringify(result.errors)}`);
});

// 58
await test("runTaxMemoRuntimeGovernance fails for prohibited claim output", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput({ humanReviewNotice: "This draft is production ready." }));
  const result = runTaxMemoRuntimeGovernance(output);
  check(result.valid === false, "prohibited claim output fails governance");
});

// 59
await test("runTaxMemoRuntimeScaffold blocks default request", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo" });
  check(result.valid === false, "default request invalid");
  check(result.blocked === true, "default request blocked");
});

// 60
await test("runTaxMemoRuntimeScaffold blocks missing runtimeOptions", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", input: safeInput() });
  check(result.blocked === true, "missing runtimeOptions blocked");
});

// 61
await test("runTaxMemoRuntimeScaffold blocks unsupported mode", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "totally_unsupported_mode", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  check(result.valid === false, "unsupported mode blocked");
});

// 62
await test("runTaxMemoRuntimeScaffold blocks bir_reply_protest_draft", () => {
  check(runTaxMemoRuntimeScaffold({ modeId: "bir_reply_protest_draft", runtimeOptions: safeRuntimeOptions(), input: safeInput() }).valid === false, "bir_reply_protest_draft blocked");
});

// 63
await test("runTaxMemoRuntimeScaffold blocks audit_defense_matrix", () => {
  check(runTaxMemoRuntimeScaffold({ modeId: "audit_defense_matrix", runtimeOptions: safeRuntimeOptions(), input: safeInput() }).valid === false, "audit_defense_matrix blocked");
});

// 64
await test("runTaxMemoRuntimeScaffold blocks client_advisory", () => {
  check(runTaxMemoRuntimeScaffold({ modeId: "client_advisory", runtimeOptions: safeRuntimeOptions(), input: safeInput() }).valid === false, "client_advisory blocked");
});

// 65
await test("runTaxMemoRuntimeScaffold blocks compliance_checklist", () => {
  check(runTaxMemoRuntimeScaffold({ modeId: "compliance_checklist", runtimeOptions: safeRuntimeOptions(), input: safeInput() }).valid === false, "compliance_checklist blocked");
});

// 66
await test("runTaxMemoRuntimeScaffold blocks requirements_request_letter", () => {
  check(runTaxMemoRuntimeScaffold({ modeId: "requirements_request_letter", runtimeOptions: safeRuntimeOptions(), input: safeInput() }).valid === false, "requirements_request_letter blocked");
});

// 67
await test("runTaxMemoRuntimeScaffold blocks tax_memo with featureFlagEnabled false", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions({ featureFlagEnabled: false }), input: safeInput() });
  check(result.valid === false, "featureFlagEnabled false blocked");
});

// 68
await test("runTaxMemoRuntimeScaffold blocks tax_memo with explicit approval false", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions({ userExplicitApprovalForRuntimeWiring: false }), input: safeInput() });
  check(result.valid === false, "explicit approval false blocked");
});

// 69
await test("runTaxMemoRuntimeScaffold blocks tax_memo with sourceCards missing", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput({ sourceCards: [] }) });
  check(result.valid === false, "missing sourceCards blocked");
});

// 70
await test("runTaxMemoRuntimeScaffold passes for safe explicitly approved tax_memo scaffold request", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  check(result.valid === true, `safe request should pass: ${JSON.stringify(result.errors)}`);
  check(result.blocked === false, "safe request not blocked");
});

// 71
await test("passing scaffold result includes output", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  check(result.output !== null && typeof result.output === "object", "output present");
});

// 72
await test("passing scaffold result includes governance", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  check(result.governance !== null && typeof result.governance === "object", "governance present");
});

// 73
await test("passing scaffold result has no persistence/memory/egress markers", () => {
  const result = runTaxMemoRuntimeScaffold({ modeId: "tax_memo", runtimeOptions: safeRuntimeOptions(), input: safeInput() });
  const serialized = JSON.stringify(result).toLowerCase();
  check(!/"persisted":\s*true|"memorywritten":\s*true|"egresssent":\s*true/i.test(serialized), "no persistence/memory/egress markers present");
});

// 74
await test("validateTaxMemoRuntimeScaffold returns valid true", () => {
  const result = validateTaxMemoRuntimeScaffold();
  check(result.valid === true, `scaffold self-check should validate: ${JSON.stringify(result.errors)}`);
});

// 75
await test("renderer sections match stable order", () => {
  const expected = [
    "title", "statusNotice", "factsProvided", "issues", "applicableAuthorities", "analysis",
    "conclusion", "risksLimitations", "assumptions", "missingFacts", "documentsNeeded", "sourceCards", "humanReviewNotice"
  ];
  check(TAX_MEMO_RUNTIME_RENDER_SECTIONS.join(",") === expected.join(","), "render sections stable order");
});

// 76
await test("createTaxMemoRuntimeRenderResult returns fresh objects", () => {
  const a = createTaxMemoRuntimeRenderResult();
  const b = createTaxMemoRuntimeRenderResult();
  a.errors.push("x");
  a.markdown = "changed";
  a.sections.push("y");
  check(b.errors.length === 0, "second result errors unaffected");
  check(b.markdown === "", "second result markdown unaffected");
  check(b.sections.length === 0, "second result sections unaffected");
});

// 77
await test("renderTaxMemoSourceCards handles malformed input safely", () => {
  for (const bad of [null, undefined, "a string", 42, [null, "x", {}]]) {
    check(typeof renderTaxMemoSourceCards(bad) === "string", `malformed input ${JSON.stringify(bad)} renders a string safely`);
  }
});

// 78
await test("renderTaxMemoSourceCards does not claim official URL verification without officialUrl/support", () => {
  const rendered = renderTaxMemoSourceCards([{ sourceCardId: "sc1", title: "RR 16-2005" }]);
  check(!/official url/i.test(rendered), "no official URL claim when officialUrl absent");
  const withUnverified = renderTaxMemoSourceCards([{ sourceCardId: "sc2", title: "Has URL", officialUrl: "https://example.gov.ph/x" }]);
  check(/verification status unconfirmed/i.test(withUnverified), "unconfirmed verification status labeled when currentnessStatus not verified");
});

// 79
await test("renderTaxMemoDraftToMarkdown renders safe output", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  const markdown = renderTaxMemoDraftToMarkdown(output);
  check(typeof markdown === "string" && markdown.length > 0, "markdown rendered");
});

let sampleMarkdown;
await test("Rendered markdown includes draft-only / human-review status notice", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  sampleMarkdown = renderTaxMemoDraftToMarkdown(output);
  check(sampleMarkdown.includes("This is a draft work-product scaffold for human review and is not a final filing or automatic submission."), "draft-only status notice present");
});

// 81
await test("Rendered markdown includes Facts Provided section", () => {
  check(sampleMarkdown.includes("Facts Provided"), "Facts Provided section present");
});

// 82
await test("Rendered markdown includes Issues section", () => {
  check(sampleMarkdown.includes("Issues"), "Issues section present");
});

// 83
await test("Rendered markdown includes Applicable Authorities section", () => {
  check(sampleMarkdown.includes("Applicable Authorities"), "Applicable Authorities section present");
});

// 84
await test("Rendered markdown includes Analysis section", () => {
  check(sampleMarkdown.includes("Analysis"), "Analysis section present");
});

// 85
await test("Rendered markdown includes Conclusion section", () => {
  check(sampleMarkdown.includes("Conclusion"), "Conclusion section present");
});

// 86
await test("Rendered markdown includes Risks and Limitations section", () => {
  check(sampleMarkdown.includes("Risks and Limitations"), "Risks and Limitations section present");
});

// 87
await test("Rendered markdown includes Assumptions section", () => {
  check(sampleMarkdown.includes("Assumptions"), "Assumptions section present");
});

// 88
await test("Rendered markdown includes Missing Facts section", () => {
  check(sampleMarkdown.includes("Missing Facts"), "Missing Facts section present");
});

// 89
await test("Rendered markdown includes Documents Needed section", () => {
  check(sampleMarkdown.includes("Documents Needed"), "Documents Needed section present");
});

// 90
await test("Rendered markdown includes Source Cards section", () => {
  check(sampleMarkdown.includes("Source Cards"), "Source Cards section present");
});

// 91
await test("Rendered markdown includes Human Review Notice section", () => {
  check(sampleMarkdown.includes("Human Review Notice"), "Human Review Notice section present");
});

// 92
await test("Rendered markdown does not include prohibited final filing claim", () => {
  check(!/this constitutes a final filing|final filing has been submitted|officially filed with the bir/i.test(sampleMarkdown), "no final filing claim");
});

// 93
await test("Rendered markdown does not include automatic submission claim", () => {
  check(!/automatically submitted to the bir|has been automatically filed|auto-submitted on your behalf/i.test(sampleMarkdown), "no automatic submission claim");
});

// 94
await test("Rendered markdown does not include production ready claim", () => {
  check(!/production ready|ready for production|production-ready/i.test(sampleMarkdown), "no production ready claim");
});

// 95
await test("Rendered markdown does not include guaranteed outcome claim", () => {
  check(!/guaranteed tax outcome|guaranteed favorable tax ruling|guaranteed to win this tax case/i.test(sampleMarkdown), "no guaranteed outcome claim");
});

// 96
await test("validateTaxMemoRuntimeRenderedOutput passes for safe rendered markdown", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  const markdown = renderTaxMemoDraftToMarkdown(output);
  const result = validateTaxMemoRuntimeRenderedOutput(markdown, output);
  check(result.valid === true, `safe markdown should validate: ${JSON.stringify(result.errors)}`);
});

// 97
await test("validateTaxMemoRuntimeRenderedOutput fails if draft-only notice missing", () => {
  const result = validateTaxMemoRuntimeRenderedOutput("## Source Cards\n_None_\n## Missing Facts\n_None_\n## Assumptions\n_None_", {});
  check(result.valid === false, "missing draft-only notice invalid");
});

// 98
await test("validateTaxMemoRuntimeRenderedOutput fails if source-card section missing", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  const markdown = renderTaxMemoDraftToMarkdown(output).replace("## Source Cards", "## Removed Section");
  const result = validateTaxMemoRuntimeRenderedOutput(markdown, output);
  check(result.valid === false, "missing source-card section invalid");
});

// 99
await test("validateTaxMemoRuntimeRenderedOutput fails if prohibited claim appears", () => {
  const output = buildTaxMemoDraftFromRuntimeInput(safeInput());
  const markdown = `${renderTaxMemoDraftToMarkdown(output)}\n\nThis draft is production ready.`;
  const result = validateTaxMemoRuntimeRenderedOutput(markdown, output);
  check(result.valid === false, "prohibited claim in markdown invalid");
});

// 100
await test("validateTaxMemoRuntimeRenderer returns valid true", () => {
  const result = validateTaxMemoRuntimeRenderer();
  check(result.valid === true, `renderer self-check should validate: ${JSON.stringify(result.errors)}`);
});

// 101
await test("fixture runtime scaffold boundary says tax_memo only", () => {
  check(fx.runtimeScaffoldBoundary.taxMemoOnly === true, "runtime scaffold boundary tax_memo only");
});

// 102
await test("fixture runtime scaffold boundary says default execution blocked", () => {
  check(fx.runtimeScaffoldBoundary.defaultExecutionBlocked === true, "runtime scaffold boundary default execution blocked");
});

// 103
await test("fixture renderer boundary says no new legal analysis", () => {
  check(fx.rendererBoundary.noNewLegalAnalysis === true, "renderer boundary no new legal analysis");
});

// 104
await test("fixture governance gate boundary requires Phase 9G governance gate", () => {
  check(fx.governanceGateBoundary.phase9GGovernanceGateRequired === true, "governance gate boundary requires Phase 9G gate");
});

// 105
await test("fixture future patch plan includes PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1"]), "future patch plan includes integration design");
});

// 106
await test("fixture future patch plan includes PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09R-TAX-MEMO-RUNTIME-STAGING-SMOKE-1"]), "future patch plan includes staging smoke");
});

// 107
await test("fixture future patch plan includes PHASE-09-GATE-CLOSURE-1", () => {
  check(hasAll(fx.futurePatchPlan, ["PHASE-09-GATE-CLOSURE-1"]), "future patch plan includes gate closure");
});

// 108
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
    "Phase 11 retrieval optimization implemented",
    "final filing implemented"
  ]), "required prohibited claims present");
});

// 109
await test("next task is PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09R-TAX-MEMO-RUNTIME-WIRING-INTEGRATION-DESIGN-1", "next task correct");
});

// 110
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

// 111
await test("static source scan: tax-memo-runtime-orchestrator.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(ORCHESTRATOR_PATH), "utf8");
  check(!/server\.js|pipeline\.js|ask-handler\.js|routes\//i.test(src.match(/^\s*import[^\n]*$/gm)?.join("\n") || ""), "no server/pipeline/ask-handler/route imports");
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 112
await test("static source scan: tax-memo-runtime-renderer.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(RENDERER_PATH), "utf8");
  check(!/server\.js|pipeline\.js|ask-handler\.js|routes\//i.test(src.match(/^\s*import[^\n]*$/gm)?.join("\n") || ""), "no server/pipeline/ask-handler/route imports");
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

// 113
await test("static source scan: orchestrator imports only allowed pure workflow files", () => {
  const src = readFileSync(resolve(ORCHESTRATOR_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "orchestrator imports at least one allowed workflow helper");
  for (const target of importTargets) {
    check(ORCHESTRATOR_ALLOWED_IMPORTS.includes(target), `only allowed workflow helpers may be imported (found: ${target})`);
  }
});

// 114
await test("static source scan: renderer imports only allowed pure workflow files", () => {
  const src = readFileSync(resolve(RENDERER_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length > 0, "renderer imports at least one allowed workflow helper");
  for (const target of importTargets) {
    check(RENDERER_ALLOWED_IMPORTS.includes(target), `only allowed workflow helpers may be imported (found: ${target})`);
  }
});

console.log(`\nPHASE-09R-TAX-MEMO-RUNTIME-WIRING-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
