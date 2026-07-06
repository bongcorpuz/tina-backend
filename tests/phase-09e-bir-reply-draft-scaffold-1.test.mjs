// PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1
//
// Validates the pure BIR Reply / Protest Draft schema scaffold and its fixture.
// NO live HTTP, NO OpenAI / Supabase / Google Drive / n8n / Firecrawl / Crawlee,
// NO env vars, NO server import, NO server start, NO port binding.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION,
  BIR_REPLY_DRAFT_SCHEMA,
  BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS,
  BIR_REPLY_DRAFT_REQUIRED_INPUTS,
  BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS,
  BIR_REPLY_DRAFT_GOVERNANCE_RULES,
  BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS,
  BIR_REPLY_DRAFT_DOCUMENT_TYPES,
  BIR_REPLY_DRAFT_ASSESSMENT_STAGES,
  createEmptyBirReplyDraftOutput,
  getBirReplyDraftSchema,
  getBirReplyDraftRequiredInputs,
  getBirReplyDraftRequiredOutputSections,
  getBirReplyDraftGovernanceRules,
  getBirReplyDraftDocumentTypes,
  getBirReplyDraftAssessmentStages,
  getBirReplyDraftSourceCardRequirement,
  validateBirReplyDraftOutputShape,
  validateBirReplyDraftSchema,
  normalizeBirDocumentType,
  normalizeBirAssessmentStage,
  normalizeBirReplyIssues
} from "../workflow/bir-reply-draft-schema.js";

const FIXTURE_PATH = "evaluation/fixtures/phase-09e-bir-reply-draft-scaffold-1.fixture.json";
const SCHEMA_PATH = "workflow/bir-reply-draft-schema.js";
const SELF_PATH = "tests/phase-09e-bir-reply-draft-scaffold-1.test.mjs";

const VALID_DECISIONS = [
  "PHASE 09E BIR REPLY DRAFT SCAFFOLD PASS WITH STRICT RECOMMENDATIONS",
  "PHASE 09E BIR REPLY DRAFT SCAFFOLD WARNING WITH STRICT RECOMMENDATIONS",
  "PHASE 09E BIR REPLY DRAFT SCAFFOLD FAIL",
  "PHASE 09E BIR REPLY DRAFT SCAFFOLD BLOCKED"
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
await test("patch id matches PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1", () => {
  check(fx.patch.id === "PHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1", "patch id");
});

// 4
await test("decision is valid; PASS if all required scaffold elements exist", () => {
  check(VALID_DECISIONS.includes(fx.decision), `invalid decision: ${fx.decision}`);
});

// 5
await test("base commit is 7ec444c", () => {
  check(typeof fx.baseCommit === "string" && fx.baseCommit.startsWith("7ec444c"), "base commit 7ec444c");
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
  check(typeof PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION === "string", "version export");
  check(typeof BIR_REPLY_DRAFT_SCHEMA === "object", "BIR_REPLY_DRAFT_SCHEMA export");
  check(Array.isArray(BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS), "REQUIRED_TOP_LEVEL_FIELDS export");
  check(Array.isArray(BIR_REPLY_DRAFT_REQUIRED_INPUTS), "REQUIRED_INPUTS export");
  check(Array.isArray(BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS), "REQUIRED_OUTPUT_SECTIONS export");
  check(Array.isArray(BIR_REPLY_DRAFT_GOVERNANCE_RULES), "GOVERNANCE_RULES export");
  check(Array.isArray(BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS), "PROHIBITED_BEHAVIORS export");
  check(Array.isArray(BIR_REPLY_DRAFT_DOCUMENT_TYPES), "DOCUMENT_TYPES export");
  check(Array.isArray(BIR_REPLY_DRAFT_ASSESSMENT_STAGES), "ASSESSMENT_STAGES export");
  check(typeof createEmptyBirReplyDraftOutput === "function", "createEmptyBirReplyDraftOutput export");
  check(typeof getBirReplyDraftSchema === "function", "getBirReplyDraftSchema export");
  check(typeof getBirReplyDraftRequiredInputs === "function", "getBirReplyDraftRequiredInputs export");
  check(typeof getBirReplyDraftRequiredOutputSections === "function", "getBirReplyDraftRequiredOutputSections export");
  check(typeof getBirReplyDraftGovernanceRules === "function", "getBirReplyDraftGovernanceRules export");
  check(typeof getBirReplyDraftDocumentTypes === "function", "getBirReplyDraftDocumentTypes export");
  check(typeof getBirReplyDraftAssessmentStages === "function", "getBirReplyDraftAssessmentStages export");
  check(typeof getBirReplyDraftSourceCardRequirement === "function", "getBirReplyDraftSourceCardRequirement export");
  check(typeof validateBirReplyDraftOutputShape === "function", "validateBirReplyDraftOutputShape export");
  check(typeof validateBirReplyDraftSchema === "function", "validateBirReplyDraftSchema export");
  check(typeof normalizeBirDocumentType === "function", "normalizeBirDocumentType export");
  check(typeof normalizeBirAssessmentStage === "function", "normalizeBirAssessmentStage export");
  check(typeof normalizeBirReplyIssues === "function", "normalizeBirReplyIssues export");
});

// 12
await test("PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION exists", () => {
  check(PHASE_09E_BIR_REPLY_DRAFT_SCHEMA_VERSION.length > 0, "version non-empty");
});

// 13-22
await test("BIR_REPLY_DRAFT_SCHEMA identity fields are correct", () => {
  check(BIR_REPLY_DRAFT_SCHEMA.mode === "bir_reply_protest_draft", "mode bir_reply_protest_draft");
  check(BIR_REPLY_DRAFT_SCHEMA.schemaKey === "birReplyDraftOutput", "schemaKey birReplyDraftOutput");
  check(BIR_REPLY_DRAFT_SCHEMA.runtimeWiring === false, "runtimeWiring false");
  check(BIR_REPLY_DRAFT_SCHEMA.featureFlagDefault === "off", "featureFlagDefault off");
  check(BIR_REPLY_DRAFT_SCHEMA.humanReviewRequired === true, "humanReviewRequired true");
  check(BIR_REPLY_DRAFT_SCHEMA.sourceCardsRequired === true, "sourceCardsRequired true");
  check(BIR_REPLY_DRAFT_SCHEMA.missingFactsRequired === true, "missingFactsRequired true");
  check(BIR_REPLY_DRAFT_SCHEMA.assumptionsRequired === true, "assumptionsRequired true");
  check(BIR_REPLY_DRAFT_SCHEMA.finalFiling === false, "finalFiling false");
  check(BIR_REPLY_DRAFT_SCHEMA.automaticSubmission === false, "automaticSubmission false");
});

// 23
await test("required inputs include birDocumentType, assessmentStage, facts, issue, taxPeriod, amountInvolved, availableDocuments", () => {
  for (const input of ["birDocumentType", "assessmentStage", "facts", "issue", "taxPeriod", "amountInvolved", "availableDocuments"]) {
    check(BIR_REPLY_DRAFT_REQUIRED_INPUTS.includes(input), `required inputs include ${input}`);
  }
});

// 24
await test("required output sections match the stable canonical list", () => {
  const expected = [
    "background", "assessmentIssue", "taxpayerPosition", "legalBasis", "factualDocumentaryBasis",
    "requestedAction", "attachmentsEvidenceChecklist", "caveats", "assumptions", "missingFacts",
    "sourceCards", "humanReviewNotice"
  ];
  check(BIR_REPLY_DRAFT_REQUIRED_OUTPUT_SECTIONS.join(",") === expected.join(","), "canonical output sections match");
});

// 25
await test("required top-level fields include all mandated fields", () => {
  const expected = [
    "mode", "schemaKey", "background", "assessmentIssue", "taxpayerPosition", "legalBasis",
    "factualDocumentaryBasis", "requestedAction", "attachmentsEvidenceChecklist", "caveats",
    "assumptions", "missingFacts", "sourceCards", "humanReviewNotice", "metadata"
  ];
  for (const field of expected) {
    check(BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS.includes(field), `top-level fields include ${field}`);
  }
});

// 26
await test("document types include loa, pan, fan, fdda, nod, subpoena, unknown", () => {
  for (const t of ["loa", "pan", "fan", "fdda", "nod", "subpoena", "unknown"]) {
    check(BIR_REPLY_DRAFT_DOCUMENT_TYPES.includes(t), `document types include ${t}`);
  }
});

// 27
await test("assessment stages include audit, loa, pan_reply, fan_protest, fdda_appeal, subpoena_response, unknown", () => {
  for (const s of ["audit", "loa", "pan_reply", "fan_protest", "fdda_appeal", "subpoena_response", "unknown"]) {
    check(BIR_REPLY_DRAFT_ASSESSMENT_STAGES.includes(s), `assessment stages include ${s}`);
  }
});

// 28-39
await test("governance rules include all mandated rules", () => {
  const expected = [
    "existing_retrieval_only", "no_live_web_search", "no_new_authority_ingestion",
    "no_fabricated_citations", "source_cards_required", "missing_facts_required",
    "human_review_required", "bir_document_type_must_be_labeled", "assessment_stage_must_be_labeled",
    "draft_only_not_final_filing", "no_memory_activation", "no_third_party_egress"
  ];
  for (const rule of expected) {
    check(BIR_REPLY_DRAFT_GOVERNANCE_RULES.includes(rule), `governance rules include ${rule}`);
  }
});

// 40-47
await test("prohibited behaviors include all mandated behaviors", () => {
  const expected = [
    "fabricated_authority", "final_filing_claim", "live_web_search", "memory_write",
    "production_change", "guaranteed_bir_outcome_claim", "deadline_claim_without_date_basis",
    "false_timeliness_assurance"
  ];
  for (const behavior of expected) {
    check(BIR_REPLY_DRAFT_PROHIBITED_BEHAVIORS.includes(behavior), `prohibited behaviors include ${behavior}`);
  }
});

// 48 + 49
await test("getBirReplyDraftSchema returns defensive copy; mutation does not affect internal schema", () => {
  const schema = getBirReplyDraftSchema();
  check(schema.mode === "bir_reply_protest_draft", "schema mode bir_reply_protest_draft");
  schema.mode = "MUTATED";
  schema.requiredInputs.push("INJECTED");
  const again = getBirReplyDraftSchema();
  check(again.mode === "bir_reply_protest_draft", "mode unaffected by prior mutation");
  check(!again.requiredInputs.includes("INJECTED"), "requiredInputs unaffected by prior mutation");
});

// 50 + 51
await test("createEmptyBirReplyDraftOutput returns fresh objects; mutating one does not affect another", () => {
  const a = createEmptyBirReplyDraftOutput();
  const b = createEmptyBirReplyDraftOutput();
  a.sourceCards.push({ sourceCardId: "x" });
  a.metadata.finalFiling = true;
  a.metadata.birDocumentType = "fan";
  check(b.sourceCards.length === 0, "second instance sourceCards unaffected");
  check(b.metadata.finalFiling === false, "second instance metadata unaffected");
  check(b.metadata.birDocumentType === "unknown", "second instance birDocumentType unaffected");
});

// 52
await test("createEmptyBirReplyDraftOutput includes all required top-level fields", () => {
  const output = createEmptyBirReplyDraftOutput();
  for (const field of BIR_REPLY_DRAFT_REQUIRED_TOP_LEVEL_FIELDS) {
    check(Object.prototype.hasOwnProperty.call(output, field), `empty output has field ${field}`);
  }
});

// 53
await test("createEmptyBirReplyDraftOutput metadata defaults are correct", () => {
  const output = createEmptyBirReplyDraftOutput();
  check(output.metadata.finalFiling === false, "metadata.finalFiling false");
  check(output.metadata.automaticSubmission === false, "metadata.automaticSubmission false");
  check(output.metadata.runtimeWiring === false, "metadata.runtimeWiring false");
  check(output.metadata.featureFlagDefault === "off", "metadata.featureFlagDefault off");
});

// 54
await test("createEmptyBirReplyDraftOutput metadata birDocumentType defaults to unknown", () => {
  check(createEmptyBirReplyDraftOutput().metadata.birDocumentType === "unknown", "birDocumentType defaults to unknown");
});

// 55
await test("createEmptyBirReplyDraftOutput metadata assessmentStage defaults to unknown", () => {
  check(createEmptyBirReplyDraftOutput().metadata.assessmentStage === "unknown", "assessmentStage defaults to unknown");
});

// 56
await test("validateBirReplyDraftOutputShape: valid true for empty scaffold, with warnings", () => {
  const output = createEmptyBirReplyDraftOutput();
  const result = validateBirReplyDraftOutputShape(output);
  check(result.valid === true, `empty scaffold should be shape-valid: ${JSON.stringify(result.errors)}`);
  check(result.warnings.some((w) => /assessmentIssue/i.test(w)), "warns on empty assessmentIssue");
  check(result.warnings.some((w) => /taxpayerPosition/i.test(w)), "warns on empty taxpayerPosition");
  check(result.warnings.some((w) => /legalBasis/i.test(w)), "warns on empty legalBasis");
  check(result.warnings.some((w) => /factualDocumentaryBasis/i.test(w)), "warns on empty factualDocumentaryBasis");
  check(result.warnings.some((w) => /attachmentsEvidenceChecklist/i.test(w)), "warns on empty attachmentsEvidenceChecklist");
  check(result.warnings.some((w) => /sourceCards/i.test(w)), "warns on empty sourceCards");
  check(result.warnings.some((w) => /missingFacts/i.test(w)), "warns on empty missingFacts");
  check(result.warnings.some((w) => /assumptions/i.test(w)), "warns on empty assumptions");
  check(result.warnings.some((w) => /birDocumentType is unknown/i.test(w)), "warns on unknown birDocumentType");
  check(result.warnings.some((w) => /assessmentStage is unknown/i.test(w)), "warns on unknown assessmentStage");
});

// 57
await test("validateBirReplyDraftOutputShape: valid false for malformed input", () => {
  const result = validateBirReplyDraftOutputShape({ mode: "wrong_mode" });
  check(result.valid === false, "malformed input invalid");
  check(result.errors.length > 0, "errors recorded for malformed input");
});

// 58
await test("validateBirReplyDraftOutputShape does not throw on null/undefined/string/array", () => {
  for (const bad of [null, undefined, "a string", [1, 2, 3], 42, true]) {
    const result = validateBirReplyDraftOutputShape(bad);
    check(result.valid === false, `non-object input ${JSON.stringify(bad)} is invalid`);
  }
});

// 59
await test("validateBirReplyDraftSchema returns valid true", () => {
  const result = validateBirReplyDraftSchema();
  check(result.valid === true, `schema should validate: ${JSON.stringify(result.errors)}`);
});

// 60
await test("validateBirReplyDraftSchema returns required counts", () => {
  const result = validateBirReplyDraftSchema();
  check(typeof result.requiredFieldCount === "number" && result.requiredFieldCount > 0, "requiredFieldCount present");
  check(typeof result.requiredInputCount === "number" && result.requiredInputCount > 0, "requiredInputCount present");
  check(typeof result.requiredOutputSectionCount === "number" && result.requiredOutputSectionCount > 0, "requiredOutputSectionCount present");
  check(typeof result.governanceRuleCount === "number" && result.governanceRuleCount > 0, "governanceRuleCount present");
  check(typeof result.prohibitedBehaviorCount === "number" && result.prohibitedBehaviorCount > 0, "prohibitedBehaviorCount present");
  check(typeof result.documentTypeCount === "number" && result.documentTypeCount > 0, "documentTypeCount present");
  check(typeof result.assessmentStageCount === "number" && result.assessmentStageCount > 0, "assessmentStageCount present");
});

// 61
await test("normalizeBirReplyIssues handles arrays, strings, blanks, null, unsupported input", () => {
  check(JSON.stringify(normalizeBirReplyIssues(["a", " b ", "", "  ", "c"])) === JSON.stringify(["a", "b", "c"]), "array trims and filters blanks");
  check(JSON.stringify(normalizeBirReplyIssues("single issue")) === JSON.stringify(["single issue"]), "string becomes one-item array");
  check(JSON.stringify(normalizeBirReplyIssues("   ")) === JSON.stringify([]), "blank string becomes empty array");
  check(JSON.stringify(normalizeBirReplyIssues(null)) === JSON.stringify([]), "null becomes empty array");
  check(JSON.stringify(normalizeBirReplyIssues(undefined)) === JSON.stringify([]), "undefined becomes empty array");
  check(JSON.stringify(normalizeBirReplyIssues(42)) === JSON.stringify([]), "number becomes empty array");
  check(JSON.stringify(normalizeBirReplyIssues({ a: 1 })) === JSON.stringify([]), "object becomes empty array");
});

// 62
await test("normalizeBirDocumentType maps aliases to canonical values", () => {
  const cases = [
    ["LOA", "loa"],
    ["letter of authority", "loa"],
    ["PAN", "pan"],
    ["preliminary assessment notice", "pan"],
    ["FAN", "fan"],
    ["formal assessment notice", "fan"],
    ["FLD", "fan"],
    ["formal letter of demand", "fan"],
    ["FAN/FLD", "fan"],
    ["formal assessment notice/formal letter of demand", "fan"],
    ["FDDA", "fdda"],
    ["final decision on disputed assessment", "fdda"],
    ["NOD", "nod"],
    ["notice of denial", "nod"],
    ["subpoena", "subpoena"],
    ["notice", "notice"],
    ["assessment notice", "assessment_notice"],
    ["letter notice", "letter_notice"],
    ["request for documents", "request_for_documents"],
    ["document request", "request_for_documents"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally unsupported", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeBirDocumentType(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 63
await test("normalizeBirAssessmentStage maps aliases to canonical values", () => {
  const cases = [
    ["audit", "audit"],
    ["LOA", "loa"],
    ["letter of authority", "loa"],
    ["PAN reply", "pan_reply"],
    ["reply to PAN", "pan_reply"],
    ["FAN protest", "fan_protest"],
    ["protest", "fan_protest"],
    ["protest to FAN", "fan_protest"],
    ["reinvestigation", "reinvestigation"],
    ["reconsideration", "reconsideration"],
    ["FDDA appeal", "fdda_appeal"],
    ["appeal from FDDA", "fdda_appeal"],
    ["NOD response", "nod_response"],
    ["notice of denial response", "nod_response"],
    ["subpoena response", "subpoena_response"],
    ["document submission", "document_submission"],
    ["administrative response", "administrative_response"],
    ["court", "court_litigation"],
    ["litigation", "court_litigation"],
    ["CTA", "court_litigation"],
    ["", "unknown"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["totally unsupported", "unknown"],
    [42, "unknown"]
  ];
  for (const [input, expected] of cases) {
    check(normalizeBirAssessmentStage(input) === expected, `${JSON.stringify(input)} -> ${expected}`);
  }
});

// 64
await test("getBirReplyDraftSourceCardRequirement returns required true", () => {
  check(getBirReplyDraftSourceCardRequirement().required === true, "required true");
});

// 65
await test("getBirReplyDraftSourceCardRequirement currentPhase9Policy gdrive_archive_acceptable", () => {
  check(getBirReplyDraftSourceCardRequirement().currentPhase9Policy === "gdrive_archive_acceptable", "currentPhase9Policy correct");
});

// 66
await test("getBirReplyDraftSourceCardRequirement officialUrlRequiredInPhase9 false", () => {
  check(getBirReplyDraftSourceCardRequirement().officialUrlRequiredInPhase9 === false, "officialUrlRequiredInPhase9 false");
});

// 67
await test("getBirReplyDraftSourceCardRequirement canonicalSourceIdRequiredInPhase9 false", () => {
  check(getBirReplyDraftSourceCardRequirement().canonicalSourceIdRequiredInPhase9 === false, "canonicalSourceIdRequiredInPhase9 false");
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
await test("fixture deadline boundary exists and prohibits false timeliness assurance", () => {
  const d = fx.deadlineBoundary;
  check(d && d.noFalseTimelinessAssurance === true, "deadline boundary prohibits false timeliness assurance");
  check(d.deadlineIncludedOnlyIfUserProvidesDateOrReliableBasis === true, "deadline requires user-provided or reliable basis");
  check(d.noAutomaticFilingOrSubmission === true, "no automatic filing/submission");
});

// 70
await test("fixture future patch plan includes PHASE-09F through PHASE-09H", () => {
  check(hasAll(fx.futurePatchPlan, [
    "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1",
    "PHASE-09G-WORKFLOW-OUTPUT-GOVERNANCE-GATE-1",
    "PHASE-09H-CONTROLLED-RUNTIME-WIRING-DESIGN-OR-SCAFFOLD-1"
  ]), "future patch plan F-H present");
});

// 71
await test("fixture prohibited claims include required non-claims", () => {
  check(hasAll(fx.prohibitedClaims, [
    "live BIR reply generation implemented",
    "live protest generation implemented",
    "production ready",
    "memory enabled",
    "external search implemented",
    "n8n implemented",
    "Firecrawl implemented",
    "Crawlee implemented",
    "Phase 10 source governance implemented",
    "Phase 11 retrieval optimization implemented",
    "guaranteed BIR outcome",
    "automatic filing implemented"
  ]), "required prohibited claims present");
});

// 72
await test("next task is PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1", () => {
  check(fx.nextTask.recommendedNext === "PHASE-09F-CLIENT-ADVISORY-CHECKLIST-SCAFFOLD-1", "next task PHASE-09F");
});

// 73
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

// 74
await test("static source scan: bir-reply-draft-schema.js has no forbidden dependencies", () => {
  const src = readFileSync(resolve(SCHEMA_PATH), "utf8");
  const importTargets = [...src.matchAll(/^\s*import[^\n]*from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  check(importTargets.length === 0, `schema must have zero imports (found: ${JSON.stringify(importTargets)})`);
  check(!/process\.env\.\w/.test(src), "no process.env.<NAME> reads");
  check(!/Date\.now\s*\(/.test(src), "no Date.now dependency");
  check(!/Math\.random\s*\(/.test(src), "no randomness");
  check(!/readFileSync|writeFileSync|readFile\(|writeFile\(/.test(src), "no filesystem access");
  check(!/fetch\s*\(|https?\.(request|get)\s*\(/.test(src), "no network calls");
});

console.log(`\nPHASE-09E-BIR-REPLY-DRAFT-SCAFFOLD-1 tests: ${passed} passed, ${failed} failed, ${assertions} assertions`);
if (failed > 0) process.exit(1);
